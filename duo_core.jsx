/* Shas Tracker v2 — shared state/logic hook + i18n + API layer (used by both mobile & web shells) */

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- API layer (mirrors v1 mock/live shape) ---------- */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby18pjM3M-Rwa_P9HgULS_cNBKgkElkS1rUdYEhmvV_7ArmfmIPRGn7kXnzQHnccYok/exec";
const USE_MOCK = SCRIPT_URL.startsWith("PASTE_");
async function apiGet() {
  if (USE_MOCK) return window.SHAS_MOCK;
  const r = await fetch(SCRIPT_URL); if (!r.ok) throw new Error("GET failed"); return r.json();
}
async function apiPost(body) {
  if (USE_MOCK) { await new Promise(res => setTimeout(res, 240)); return { ok: true }; }
  const r = await fetch(SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("POST failed"); return r.json();
}

/* ---------- grouping + name helpers (shared to window) ---------- */
function computeGroups(data) {
  const ORD = window.SEDER_ORDER;
  const map = new Map();
  ORD.forEach(s => map.set(s, { seder: s, masechtos: [], byMas: new Map(), total: 0, eman: 0, yehuda: 0, last: "" }));
  data.perakim.forEach(p => {
    const g = map.get(p.seder); if (!g) return;
    if (!g.byMas.has(p.masechta)) { const m = { masechta: p.masechta, perakim: [] }; g.byMas.set(p.masechta, m); g.masechtos.push(m); }
    g.byMas.get(p.masechta).perakim.push(p);
    g.total++;
    if (p.eman_done) g.eman++;
    if (p.yehuda_done) g.yehuda++;
  });
  return ORD.map(s => map.get(s));
}
const sederName = (s, lang) => (lang === "he" ? (window.SEDER_HE[s] || s) : s);
const masName = (m, lang) => (lang === "he" ? (window.MAS_HE[m] || m) : m);
const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);

/* ---------- mishnayos (sub-task) helpers ---------- */
/* The API stores each person's learned mishnayos per perek as "1,3,4"; the mock
   dataset ships arrays. Counts come from MISHNA_COUNTS (fixed structure). */
const parseMishnayos = v => (Array.isArray(v) ? v : String(v == null ? "" : v).split(/[\s,;]+/))
  .map(Number).filter(n => Number.isInteger(n) && n > 0);
function hydratePerakim(raw) {
  const MC = window.MISHNA_COUNTS || {};
  return { perakim: raw.perakim.map(p => ({
    ...p,
    mishna_count: (MC[p.masechta] || [])[p.perek_num - 1] || 0,
    eman_mishnayos: parseMishnayos(p.eman_mishnayos),
    yehuda_mishnayos: parseMishnayos(p.yehuda_mishnayos),
  })) };
}
const allMishnayos = p => Array.from({ length: p.mishna_count }, (_, i) => i + 1);
/* A done perek means every mishna is learned, even if the list column is blank
   (seeded rows). Invariant kept on write: done ⇔ list is complete. */
const learnedMishnayos = (p, who) => (p[who + "_done"] ? allMishnayos(p) : p[who + "_mishnayos"]);

/* ---------- person accents ---------- */
const PCOL = { eman: { c: "#58cc02", d: "#58a700" }, yehuda: { c: "#1cb0f6", d: "#1899d6" } };

/* ---------- strings ---------- */
const STR = {
  en: {
    title: "Shas Tracker", subtitle: n => "Mishnah · " + n + " perakim",
    abba: "Abba", yehuda: "Yehuda", aInit: "A", yInit: "Y",
    seder: "Seder", masechta: "Masechta", start: "Start", perakimWord: "perakim",
    navPath: "Path", navStats: "Stats", navSearch: "Search",
    yasher: "Yasher koach!", mazel: "Mazel tov!", incredible: "Incredible!",
    perekComplete: "Perek learned", complete: "complete!", fullMasechta: "A whole masechta finished",
    fullSeder: "An entire Seder finished", keepGoing: "Keep going", onward: "Onward!",
    xpPerek: "+1 perek", xpN: n => "+" + n + " perakim",
    unmarked: "Unmarked",
    perekWord: "Perek", mishnayosWord: "mishnayos",
    mishnaProgress: (k, n) => k + "/" + n + " mishnayos",
    markPerek: "Mark whole perek", unmarkPerek: "Unmark whole perek",
    shasDone: "All of Shas!", shasDoneSub: who => who + " has learned every perek. Chazak!",
    searchPh: "Search a masechta…", stAll: "All", stLeft: "Left", stDone: "Done", allShas: "All Shas",
    allDoneHint: "Nothing left here — all done! 🎉", noneDone: "Nothing marked done yet.", noHits: "No masechtos match.",
    statsTitle: "Progress", statsSub: "Abba & Yehuda across all of Shas",
    d30: "30 days", d90: "90 days", dAll: "All time",
    together: "Together", remaining: "Remaining",
    statSub: (p, pace) => p + "% · " + pace + "/wk pace",
    acrossBoth: "learned across both", leftFinish: "left to finish Shas",
    overTime: "Over time", cumSub: r => "Cumulative perakim" + (r !== "all" ? " · last " + r + " days" : ""),
    perSeder: "By Seder", perSederSub: "Done vs. total in each Seder",
    weekly: "This week", weeklySub: "Perakim in the last 7 days",
    loading: "Loading Shas…", saveErr: "Couldn't save — try again", loadErr: "Couldn't load — check the connection",
    authTitle: "Enter password to save", authSub: "Viewing is open to everyone — marking progress needs the password.",
    authPlaceholder: "Password", authSubmit: "Unlock", authCancel: "Cancel", authWrong: "Wrong password — try again",
  },
  he: {
    title: "מעקב ש״ס", subtitle: n => "משנה · " + n + " פרקים",
    abba: "אבא", yehuda: "יהודה", aInit: "א", yInit: "י",
    seder: "סדר", masechta: "מסכת", start: "התחל", perakimWord: "פרקים",
    navPath: "מסלול", navStats: "נתונים", navSearch: "חיפוש",
    yasher: "יישר כח!", mazel: "מזל טוב!", incredible: "מדהים!",
    perekComplete: "פרק נלמד", complete: "הושלמה!", fullMasechta: "מסכת שלמה הסתיימה",
    fullSeder: "סדר שלם הסתיים", keepGoing: "ממשיכים", onward: "קדימה!",
    xpPerek: "+1 פרק", xpN: n => "+" + n + " פרקים",
    unmarked: "בוטל הסימון",
    perekWord: "פרק", mishnayosWord: "משניות",
    mishnaProgress: (k, n) => k + "/" + n + " משניות",
    markPerek: "סמן את כל הפרק", unmarkPerek: "בטל את סימון הפרק",
    shasDone: "כל הש״ס!", shasDoneSub: who => who + " למד כל פרק. חזק!",
    searchPh: "חיפוש מסכת…", stAll: "הכל", stLeft: "נותר", stDone: "הושלם", allShas: "כל הש״ס",
    allDoneHint: "אין מה ללמוד כאן — הכל הושלם! 🎉", noneDone: "עדיין לא סומן דבר.", noHits: "לא נמצאו מסכתות.",
    statsTitle: "התקדמות", statsSub: "אבא ויהודה בכל הש״ס",
    d30: "30 יום", d90: "90 יום", dAll: "הכל",
    together: "יחד", remaining: "נותר",
    statSub: (p, pace) => p + "% · " + pace + " לשבוע",
    acrossBoth: "נלמדו ע״י שניהם", leftFinish: "לסיום הש״ס",
    overTime: "לאורך זמן", cumSub: r => "פרקים מצטבר" + (r !== "all" ? " · " + r + " ימים אחרונים" : ""),
    perSeder: "לפי סדר", perSederSub: "הושלם מול סה״כ בכל סדר",
    weekly: "השבוע", weeklySub: "פרקים ב-7 הימים האחרונים",
    loading: "טוען ש״ס…", saveErr: "השמירה נכשלה — נסה שוב", loadErr: "הטעינה נכשלה — בדוק את החיבור",
    authTitle: "הזן סיסמה כדי לשמור", authSub: "הצפייה פתוחה לכולם — סימון התקדמות דורש סיסמה.",
    authPlaceholder: "סיסמה", authSubmit: "פתח", authCancel: "ביטול", authWrong: "סיסמה שגויה — נסה שוב",
  },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "nodeNumbers": true,
  "celebrations": true
}/*EDITMODE-END*/;

/* ---------- write-gate (read stays public; writes need a password the backend checks) ---------- */
const WRITE_KEY_STORAGE = "shas2-writekey";
const getWriteKey = () => localStorage.getItem(WRITE_KEY_STORAGE) || "";

/* ---------- shared app-state hook ---------- */
function useShasApp() {
  const useTw = window.useTweaks;
  const [tw, setTweak] = useTw(TWEAK_DEFAULTS);
  const [lang, setLang] = useState(() => localStorage.getItem("shas2-lang") || "en");
  const S = STR[lang];
  const rtl = lang === "he";

  const [data, setData] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem("shas2-view") || "path");
  const [person, setPerson] = useState(() => localStorage.getItem("shas2-person") || "eman");
  const [range, setRange] = useState(90);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sederFilter, setSederFilter] = useState("all");
  const [cele, setCele] = useState(null);
  const [toast, setToast] = useState("");
  const [collapsedSed, setCollapsedSed] = useState(() => new Set());
  const [collapsedMas, setCollapsedMas] = useState(() => new Set());
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sheetId, setSheetId] = useState(null);
  const toastTimer = useRef(null);
  const pendingToggleRef = useRef(null);

  const toggleSeder = useCallback(s => setCollapsedSed(prev => {
    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n;
  }), []);
  const toggleMasechta = useCallback(k => setCollapsedMas(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  }), []);

  const setPersistPerson = p => { setPerson(p); localStorage.setItem("shas2-person", p); };
  const setPersistView = v => { setView(v); localStorage.setItem("shas2-view", v); };
  const switchLang = l => { setLang(l); localStorage.setItem("shas2-lang", l); };

  const showToast = useCallback(msg => {
    setToast(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => { apiGet().then(d => setData(hydratePerakim(d))).catch(() => showToast(STR[localStorage.getItem("shas2-lang") || "en"].loadErr)); }, [showToast]);

  const groups = useMemo(() => (data ? computeGroups(data) : []), [data]);
  const total = useMemo(() => (data ? data.perakim.length : 0), [data]);
  const emanTot = useMemo(() => (data ? data.perakim.filter(p => p.eman_done).length : 0), [data]);
  const yehudaTot = useMemo(() => (data ? data.perakim.filter(p => p.yehuda_done).length : 0), [data]);

  const patchPerek = useCallback((perek_id, patch) => {
    setData(prev => ({ perakim: prev.perakim.map(p => p.perek_id === perek_id ? { ...p, ...patch } : p) }));
  }, []);

  /* One save path for both granularities. mishna == null toggles the whole
     perek (cascading to every mishna); a mishna number toggles that one
     sub-task, auto-completing the perek when it was the last one and
     reopening the perek when one is removed — full two-way sync. */
  const performSave = useCallback((p, mishna, password) => {
    const who = person;
    const prevDone = p[who + "_done"];
    const prev = { [who + "_done"]: prevDone, [who + "_date"]: p[who + "_date"], [who + "_mishnayos"]: p[who + "_mishnayos"] };

    let nextList, nextDone;
    if (mishna == null) {
      nextDone = !prevDone;
      nextList = nextDone ? allMishnayos(p) : [];
    } else {
      const s = new Set(learnedMishnayos(p, who));
      s.has(mishna) ? s.delete(mishna) : s.add(mishna);
      nextList = allMishnayos(p).filter(n => s.has(n));
      nextDone = p.mishna_count > 0 && nextList.length === p.mishna_count;
    }
    const date = nextDone ? todayISO() : null;

    patchPerek(p.perek_id, { [who + "_done"]: nextDone, [who + "_date"]: date, [who + "_mishnayos"]: nextDone ? [] : nextList });
    apiPost({ perek_id: p.perek_id, person: who, done: nextDone, date, mishnayos: nextDone ? "" : nextList.join(","), password })
      .then(res => {
        if (!res || !res.ok) {
          patchPerek(p.perek_id, prev);
          if (res && res.error === "bad password") {
            localStorage.removeItem(WRITE_KEY_STORAGE);
            pendingToggleRef.current = { p, mishna };
            setAuthError(S.authWrong);
            setAuthOpen(true);
          } else {
            showToast(S.saveErr);
          }
          return;
        }
        localStorage.setItem(WRITE_KEY_STORAGE, password);

        if (!nextDone) {
          if (mishna == null) { showToast(S.unmarked); return; }
          showToast(masName(p.masechta, lang) + " " + p.perek_num + " · " + S.mishnaProgress(nextList.length, p.mishna_count));
          return;
        }
        if (!tw.celebrations) return;

        const isDoneX = x => (x.perek_id === p.perek_id ? true : x[who + "_done"]);
        const masSibs = data.perakim.filter(x => x.seder === p.seder && x.masechta === p.masechta);
        const masFull = masSibs.every(isDoneX);
        const sedSibs = data.perakim.filter(x => x.seder === p.seder);
        const sedFull = sedSibs.every(isDoneX);
        const col = window.sederColor(window.SEDER_ORDER.indexOf(p.seder));

        if (sedFull) {
          setCele({ level: "seder", col, yell: S.incredible, sub: sederName(p.seder, lang) + " " + S.complete,
            meta: S.fullSeder, xp: S.xpN(sedSibs.length), cta: S.onward });
        } else if (masFull) {
          setCele({ level: "masechta", col, yell: S.mazel, sub: masName(p.masechta, lang) + " " + S.complete,
            meta: S.fullMasechta, xp: S.xpN(masSibs.length), cta: S.onward });
        } else {
          setCele({ level: "perek", col, yell: S.yasher, sub: S.perekComplete,
            meta: masName(p.masechta, lang) + " · " + S.masechta + " " + p.perek_num, xp: S.xpPerek, cta: S.keepGoing });
        }
      })
      .catch(() => { patchPerek(p.perek_id, prev); showToast(S.saveErr); });
  }, [person, data, tw.celebrations, S, lang, patchPerek, showToast]);

  const attemptSave = useCallback((p, mishna) => {
    const key = getWriteKey();
    if (key) { performSave(p, mishna, key); return; }
    pendingToggleRef.current = { p, mishna };
    setAuthError("");
    setAuthOpen(true);
  }, [performSave]);

  const togglePerek = useCallback(p => attemptSave(p, null), [attemptSave]);
  const toggleMishna = useCallback((p, n) => attemptSave(p, n), [attemptSave]);

  /* Tapping a perek opens its mishnayos sheet; perakim with no known mishna
     count keep the old direct toggle. */
  const onToggle = useCallback(p => {
    if (p.mishna_count > 0) setSheetId(p.perek_id);
    else attemptSave(p, null);
  }, [attemptSave]);
  const closeSheet = useCallback(() => setSheetId(null), []);
  const sheetPerek = useMemo(
    () => (data && sheetId ? data.perakim.find(p => p.perek_id === sheetId) || null : null),
    [data, sheetId]);

  const submitWriteKey = useCallback((password) => {
    const pending = pendingToggleRef.current;
    setAuthOpen(false);
    if (!pending) return;
    performSave(pending.p, pending.mishna, password);
  }, [performSave]);

  const closeAuthGate = useCallback(() => {
    setAuthOpen(false);
    pendingToggleRef.current = null;
  }, []);

  const chestTap = useCallback((m, col, ready) => {
    if (ready) setCele({ level: "masechta", col, yell: S.mazel, sub: masName(m.masechta, lang) + " " + S.complete,
      meta: S.fullMasechta, xp: S.xpN(m.perakim.length), cta: S.onward });
    else showToast(masName(m.masechta, lang) + " · " + m.perakim.filter(p => p[person + "_done"]).length + "/" + m.perakim.length);
  }, [S, lang, person, showToast]);

  const acc = PCOL[person];
  const personTotal = person === "eman" ? emanTot : yehudaTot;

  return {
    tw, setTweak, lang, S, rtl, switchLang,
    data, view, setPersistView, person, setPersistPerson,
    range, setRange, search, setSearch, status, setStatus, sederFilter, setSederFilter,
    cele, setCele, toast,
    collapsedSed, collapsedMas, toggleSeder, toggleMasechta,
    groups, total, emanTot, yehudaTot, personTotal,
    onToggle, chestTap, acc, PCOL,
    sheetPerek, closeSheet, togglePerek, toggleMishna,
    authOpen, authError, submitWriteKey, closeAuthGate,
  };
}

Object.assign(window, { computeGroups, sederName, masName, pct, STR, PCOL, useShasApp, learnedMishnayos });
