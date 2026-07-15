/* =========================================================================
   Shas Tracker — Apps Script Web App (the free API layer over the Sheet)
   Mirrors the Shabbat site's doGet / doPost pattern.

     doGet  → returns the whole board as JSON:
              { perakim: [ { perek_id, seder, masechta, perek_num,
                             eman_done, eman_date, yehuda_done, yehuda_date,
                             eman_mishnayos, yehuda_mishnayos } ],
                current: { eman: string|null, yehuda: string|null },
                next:    { eman: string[], yehuda: string[] } }
     doPost → requires a password (reading stays public, writing doesn't);
              dispatches by body.action:
              action "toggle" (default) — mark one (perek_id, person) cell,
              optionally with the person's learned-mishnayos list:
                body { perek_id, person: "eman"|"yehuda", done: bool,
                       date: "YYYY-MM-DD"|null, mishnayos: "1,3,4"|"",
                       password: string }
              action "setCurrent" — pin/clear the masechta a person is
              currently learning:
                body { action: "setCurrent", person: "eman"|"yehuda",
                       masechta: string|"", password: string }
              action "setNext" — replace a person's ordered "next up" queue:
                body { action: "setNext", person: "eman"|"yehuda",
                       next: string[], password: string }
              → { ok: true } or { ok: false, error: "bad password" }

   Mishnayos sub-tasks: the optional columns eman_mishnayos / yehuda_mishnayos
   hold a comma-separated list of learned mishna numbers for perakim that are
   in progress. A done perek means ALL its mishnayos are learned, so the list
   is stored blank once done = TRUE. Sheets without these two columns keep
   working — mishna-level progress just isn't persisted until you add them.

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

/* "Next up" — a short ordered queue of masechtot per person, stored as a JSON
   array string in Script Properties (NEXT_EMAN / NEXT_YEHUDA). Same rationale
   as current: no Sheet schema change, instant reads. */
function getNextMasechtos_() {
  var props = PropertiesService.getScriptProperties();
  function parse(v) { try { var a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  return {
    eman: parse(props.getProperty("NEXT_EMAN")),
    yehuda: parse(props.getProperty("NEXT_YEHUDA")),
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
  // eman_mishnayos / yehuda_mishnayos are optional — older sheets work without them
  return idx;
}
function mishnayosStr_(v) {
  if (v === "" || v === null || v === undefined) return "";
  return String(v);
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
        eman_mishnayos: "eman_mishnayos" in idx ? mishnayosStr_(r[idx.eman_mishnayos]) : "",
        yehuda_mishnayos: "yehuda_mishnayos" in idx ? mishnayosStr_(r[idx.yehuda_mishnayos]) : "",
      });
    });
  }
  return json_({ perakim: perakim, current: getCurrentMasechtos_(), next: getNextMasechtos_() });
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
  if (body.action === "setNext") return handleSetNext_(body);
  return handleToggle_(body);
}

/* action "setNext": replace a person's ordered "next up" queue with body.next
   (an array of masechta names). No sheet lock — a single property set. */
function handleSetNext_(body) {
  var person = body.person;
  if (person !== "eman" && person !== "yehuda") return json_({ ok: false, error: "bad person" });

  var list = Array.isArray(body.next) ? body.next.filter(function (m) { return m; }).map(String) : [];
  var props = PropertiesService.getScriptProperties();
  var key = person === "eman" ? "NEXT_EMAN" : "NEXT_YEHUDA";
  if (list.length) props.setProperty(key, JSON.stringify(list)); else props.deleteProperty(key);

  return json_({ ok: true, next: getNextMasechtos_() });
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

    // learned-mishnayos list for in-progress perakim (skipped for old sheets
    // without the column). Forced to plain text so "1,2" is never read as a
    // decimal number in comma-locale spreadsheets.
    var mishnaKey = person + "_mishnayos";
    if (body.mishnayos !== undefined && (mishnaKey in idx)) {
      var mRange = sh.getRange(row, idx[mishnaKey] + 1);
      mRange.setNumberFormat("@");
      mRange.setValue(String(body.mishnayos == null ? "" : body.mishnayos));
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
