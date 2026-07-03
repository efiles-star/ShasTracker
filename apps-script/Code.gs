/* =========================================================================
   Shas Tracker — Apps Script Web App (the free API layer over the Sheet)
   Mirrors the Shabbat site's doGet / doPost pattern.

     doGet  → returns the whole board as JSON:
              { perakim: [ { perek_id, seder, masechta, perek_num,
                             eman_done, eman_date, yehuda_done, yehuda_date } ],
                current: { eman: string|null, yehuda: string|null } }
     doPost → requires a password (reading stays public, writing doesn't);
              dispatches by body.action:
              action "toggle" (default) — mark one (perek_id, person) cell:
                body { perek_id, person: "eman"|"yehuda", done: bool,
                       date: "YYYY-MM-DD"|null, password: string }
              action "setCurrent" — pin/clear the masechta a person is
              currently learning:
                body { action: "setCurrent", person: "eman"|"yehuda",
                       masechta: string|"", password: string }
              → { ok: true } or { ok: false, error: "bad password" }

   Deploy: Extensions → Apps Script → paste this → Deploy → New deployment →
   type "Web app" → Execute as "Me", Who has access "Anyone" → copy the /exec
   URL into duo_core.jsx (SCRIPT_URL). See apps-script/README.md for the full
   walkthrough.
   ========================================================================= */

var SHEET_NAME = "Shas";           // rename if your tab is called something else
var TZ = Session.getScriptTimeZone();

/* Reading (doGet) stays public. Writing (doPost) requires this password.
   Set it in the Apps Script project: Project Settings (gear icon) → Script
   Properties → Add script property → key "WRITE_PASSWORD". Keeping it there
   (not in this file) means the real value never lands in git, and you can
   rotate it any time without editing or redeploying the script. */
function getWritePassword_() {
  return PropertiesService.getScriptProperties().getProperty("WRITE_PASSWORD") || "";
}

/* "Currently learning" — one masechta pinned per person, independent of perek
   progress (learning is non-sequential). Stored the same way as the password:
   Script Properties, not the Sheet, so no schema change and instant reads. */
function getCurrentMasechtos_() {
  var props = PropertiesService.getScriptProperties();
  return {
    eman: props.getProperty("CURRENT_EMAN") || null,
    yehuda: props.getProperty("CURRENT_YEHUDA") || null,
  };
}

/* ---- column lookup by header name (order-independent) ---- */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  if (!sh) throw new Error("No sheet found");
  return sh;
}
function headerIndex_(sh) {
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var idx = {};
  headers.forEach(function (h, i) { idx[String(h).trim()] = i; });
  ["seder", "masechta", "perek_num", "perek_id", "eman_done", "eman_date", "yehuda_done", "yehuda_date"]
    .forEach(function (col) { if (!(col in idx)) throw new Error("Missing column: " + col); });
  return idx;
}
function fmtDate_(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === "[object Date]") return Utilities.formatDate(v, TZ, "yyyy-MM-dd");
  return String(v).slice(0, 10);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---- GET: hydrate the whole board ---- */
function doGet() {
  var sh = getSheet_();
  var idx = headerIndex_(sh);
  var last = sh.getLastRow();
  var perakim = [];
  if (last > 1) {
    var values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
    values.forEach(function (r) {
      if (!r[idx.perek_id]) return;
      perakim.push({
        perek_id: String(r[idx.perek_id]),
        seder: String(r[idx.seder]),
        masechta: String(r[idx.masechta]),
        perek_num: Number(r[idx.perek_num]),
        eman_done: r[idx.eman_done] === true || String(r[idx.eman_done]).toUpperCase() === "TRUE",
        eman_date: fmtDate_(r[idx.eman_date]),
        yehuda_done: r[idx.yehuda_done] === true || String(r[idx.yehuda_done]).toUpperCase() === "TRUE",
        yehuda_date: fmtDate_(r[idx.yehuda_date]),
      });
    });
  }
  return json_({ perakim: perakim, current: getCurrentMasechtos_() });
}

/* ---- POST: requires the write password, then dispatches by action ---- */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad request" });
  }

  var expected = getWritePassword_();
  if (!expected) return json_({ ok: false, error: "server not configured: set the WRITE_PASSWORD script property" });
  if (String(body.password) !== expected) return json_({ ok: false, error: "bad password" });

  if (body.action === "setCurrent") return handleSetCurrent_(body);
  return handleToggle_(body);
}

/* action "setCurrent": pin (or clear, if masechta is empty) the masechta a
   person is currently learning. No sheet lock needed — a single property set. */
function handleSetCurrent_(body) {
  var person = body.person;
  if (person !== "eman" && person !== "yehuda") return json_({ ok: false, error: "bad person" });

  var props = PropertiesService.getScriptProperties();
  var key = person === "eman" ? "CURRENT_EMAN" : "CURRENT_YEHUDA";
  var masechta = body.masechta ? String(body.masechta) : "";
  if (masechta) props.setProperty(key, masechta); else props.deleteProperty(key);

  return json_({ ok: true, current: getCurrentMasechtos_() });
}

/* default action: mark one (perek_id, person) cell with status + date */
function handleToggle_(body) {
  var person = body.person;
  if (person !== "eman" && person !== "yehuda") return json_({ ok: false, error: "bad person" });
  if (!body.perek_id) return json_({ ok: false, error: "missing perek_id" });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // serialize writes — last-write-wins is accepted, but never corrupt a row
  } catch (err) {
    return json_({ ok: false, error: "busy" });
  }
  try {
    var sh = getSheet_();
    var idx = headerIndex_(sh);
    var last = sh.getLastRow();
    if (last < 2) return json_({ ok: false, error: "empty sheet" });

    // locate the row for this perek_id
    var ids = sh.getRange(2, idx.perek_id + 1, last - 1, 1).getValues();
    var row = -1;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(body.perek_id)) { row = i + 2; break; }
    }
    if (row === -1) return json_({ ok: false, error: "unknown perek_id" });

    var done = !!body.done;
    var date = done ? (body.date || Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd")) : "";
    var doneCol = (person === "eman" ? idx.eman_done : idx.yehuda_done) + 1;
    var dateCol = (person === "eman" ? idx.eman_date : idx.yehuda_date) + 1;
    sh.getRange(row, doneCol).setValue(done);
    sh.getRange(row, dateCol).setValue(date);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
