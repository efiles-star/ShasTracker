/* Shas Tracker v2 — shared state/logic hook + i18n + API layer (used by both mobile & web shells) */

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- API layer (mirrors v1 mock/live shape) ---------- */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby18pjM3M-Rwa_P9HgULS_cNBKgkElkS1rUdYEhmvV_7ArmfmIPRGn7kXnzQHnccYok/exec";
const USE_MOCK = SCRIPT_URL.startsWith("PASTE_");
/* The live Sheet may still carry legacy Ashkenazi spellings (Berachos, Avos,
   Taharos…) in its seder/masechta columns. Normalize them to the Sephardi
   display names at the door; perek_id is left untouched — it's the stable
   write key the Sheet is looked up by. */
function normalizeData(json) {
  const MC = window.MAS_CANON || {}, SC = window.SEDER_CANON || {};
  const cur = json.current || {};
  return { ...json,
    perakim: (json.perakim || []).map(p => ({
      ...p, seder: SC[p.seder] || p.seder, masechta: MC[p.masechta] || p.masechta })),
    current: { eman: MC[cur.eman] || cur.eman || null, yehuda: MC[cur.yehuda] || cur.yehuda || null },
  };
}
async function apiGet() {
  if (USE_MOCK) return normalizeData(window.SHAS_MOCK);
  const r = await fetch(SCRIPT_URL); if (!r.ok) throw new Error("GET failed"); return normalizeData(await r.json());
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
  ORD.forEach(s => map.set(s, { seder: s, masechtot: [], byMas: new Map(), total: 0, eman: 0, yehuda: 0, last: "" }));
  data.perakim.forEach(p => {
    const g = map.get(p.seder); if (!g) return;
    if (!g.byMas.has(p.masechta)) { const m = { masechta: p.masechta, perakim: [] }; g.byMas.set(p.masechta, m); g.masechtot.push(m); }
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

/* ---------- person accents ---------- */
const PCOL = { eman: { c: "#58cc02", d: "#58a700" }, yehuda: { c: "#1cb0f6", d: "#1899d6" } };

/* ---------- strings ---------- */
const STR = {
  en: {
    title: "Shas Tracker", subtitle: n => "Mishnah · " + n + " perakim",
    abba: "Abba", yehuda: "Yehuda", aInit: "A", yInit: "Y",
    seder: "Seder", masechta: "Masechta", start: "Start", perakimWord: "perakim",
    navPath: "Path", navStats: "Stats", navSearch: "Search", navNow: "Now Learning",
    yasher: "Yasher koach!", mazel: "Mazel tov!", incredible: "Incredible!",
    perekComplete: "Perek learned", complete: "complete!", fullMasechta: "A whole masechta finished",
    fullSeder: "An entire Seder finished", keepGoing: "Keep going", onward: "Onward!",
    xpPerek: "+1 perek", xpN: n => "+" + n + " perakim",
    unmarked: "Unmarked",
    shasDone: "All of Shas!", shasDoneSub: who => who + " has learned every perek. Chazak!",
    searchPh: "Search a masechta…", stAll: "All", stLeft: "Left", stDone: "Done", allShas: "All Shas",
    allDoneHint: "Nothing left here — all done! 🎉", noneDone: "Nothing marked done yet.", noHits: "No masechtot match.",
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
    setCurrent: "Pin as currently learning", unpinCurrent: "Unpin",
    noCurrent: "Nothing pinned yet.", noCurrentHint: "Pin a masechta from Search to track it here.",
    switchToEdit: who => "Switch to " + who + " to update",
    nowLearningSet: m => "Now learning: " + m, nowLearningCleared: "Unpinned",
    read: "Read", perekWord: "Perek", mishnahWord: "Mishnah",
    readerLoading: "Loading from Sefaria…", readerErr: "Couldn't load the text — check the connection",
    readerRetry: "Try again", openSefaria: "Open on Sefaria",
    modeBoth: "Both", modeHe: "עברית", modeEn: "English",
    markLearned: "Mark learned", learned: "Learned ✓",
  },
  he: {
    title: "מעקב ש״ס", subtitle: n => "משנה · " + n + " פרקים",
    abba: "אבא", yehuda: "יהודה", aInit: "א", yInit: "י",
    seder: "סדר", masechta: "מסכת", start: "התחל", perakimWord: "פרקים",
    navPath: "מסלול", navStats: "נתונים", navSearch: "חיפוש", navNow: "לומדים כעת",
    yasher: "יישר כח!", mazel: "מזל טוב!", incredible: "מדהים!",
    perekComplete: "פרק נלמד", complete: "הושלמה!", fullMasechta: "מסכת שלמה הסתיימה",
    fullSeder: "סדר שלם הסתיים", keepGoing: "ממשיכים", onward: "קדימה!",
    xpPerek: "+1 פרק", xpN: n => "+" + n + " פרקים",
    unmarked: "בוטל הסימון",
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
    setCurrent: "סמן כנלמד כעת", unpinCurrent: "בטל סימון",
    noCurrent: "טרם נבחר דבר.", noCurrentHint: "סמן מסכת ב'חיפוש' כדי לעקוב אחריה כאן.",
    switchToEdit: who => "עבור אל " + who + " כדי לעדכן",
    nowLearningSet: m => "לומד כעת: " + m, nowLearningCleared: "הוסר הסימון",
    read: "לימוד", perekWord: "פרק", mishnahWord: "משנה",
    readerLoading: "טוען מספריא…", readerErr: "הטעינה נכשלה — בדוק את החיבור",
    readerRetry: "נסה שוב", openSefaria: "פתח בספריא",
    modeBoth: "שניהם", modeHe: "עברית", modeEn: "English",
    markLearned: "סמן כנלמד", learned: "נלמד ✓",
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
  const [readerId, setReaderId] = useState(null);
  const toastTimer = useRef(null);
  const pendingRef = useRef(null); // { kind: "toggle", p } | { kind: "setCurrent", masechta }

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

  useEffect(() => { apiGet().then(setData).catch(() => showToast(STR[localStorage.getItem("shas2-lang") || "en"].loadErr)); }, [showToast]);

  const groups = useMemo(() => (data ? computeGroups(data) : []), [data]);
  const total = useMemo(() => (data ? data.perakim.length : 0), [data]);
  const emanTot = useMemo(() => (data ? data.perakim.filter(p => p.eman_done).length : 0), [data]);
  const yehudaTot = useMemo(() => (data ? data.perakim.filter(p => p.yehuda_done).length : 0), [data]);

  const setDone = useCallback((perek_id, who, done) => {
    setData(prev => ({ ...prev, perakim: prev.perakim.map(p => p.perek_id === perek_id
      ? { ...p, [who + "_done"]: done, [who + "_date"]: done ? todayISO() : null } : p) }));
  }, []);

  const performToggle = useCallback((p, password) => {
    const who = person;
    const next = !p[who + "_done"];
    setDone(p.perek_id, who, next);
    apiPost({ perek_id: p.perek_id, person: who, done: next, date: next ? todayISO() : null, password })
      .then(res => {
        if (!res || !res.ok) {
          setDone(p.perek_id, who, !next);
          if (res && res.error === "bad password") {
            localStorage.removeItem(WRITE_KEY_STORAGE);
            pendingRef.current = { kind: "toggle", p };
            setAuthError(S.authWrong);
            setAuthOpen(true);
          } else {
            showToast(S.saveErr);
          }
          return;
        }
        localStorage.setItem(WRITE_KEY_STORAGE, password);

        if (!next) { showToast(S.unmarked); return; }
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
      .catch(() => { setDone(p.perek_id, who, !next); showToast(S.saveErr); });
  }, [person, data, tw.celebrations, S, lang, setDone, showToast]);

  const onToggle = useCallback((p) => {
    const key = getWriteKey();
    if (key) { performToggle(p, key); return; }
    pendingRef.current = { kind: "toggle", p };
    setAuthError("");
    setAuthOpen(true);
  }, [performToggle]);

  const performSetCurrent = useCallback((masechta, password) => {
    const who = person;
    const prevCurrent = data.current ? data.current[who] : null;
    setData(prev => ({ ...prev, current: { ...prev.current, [who]: masechta || null } }));
    apiPost({ action: "setCurrent", person: who, masechta: masechta || "", password })
      .then(res => {
        if (!res || !res.ok) {
          setData(prev => ({ ...prev, current: { ...prev.current, [who]: prevCurrent } }));
          if (res && res.error === "bad password") {
            localStorage.removeItem(WRITE_KEY_STORAGE);
            pendingRef.current = { kind: "setCurrent", masechta };
            setAuthError(S.authWrong);
            setAuthOpen(true);
          } else {
            showToast(S.saveErr);
          }
          return;
        }
        localStorage.setItem(WRITE_KEY_STORAGE, password);
        showToast(masechta ? S.nowLearningSet(masName(masechta, lang)) : S.nowLearningCleared);
      })
      .catch(() => {
        setData(prev => ({ ...prev, current: { ...prev.current, [who]: prevCurrent } }));
        showToast(S.saveErr);
      });
  }, [person, data, S, lang, showToast]);

  const requestSetCurrent = useCallback((masechta) => {
    const key = getWriteKey();
    if (key) { performSetCurrent(masechta, key); return; }
    pendingRef.current = { kind: "setCurrent", masechta };
    setAuthError("");
    setAuthOpen(true);
  }, [performSetCurrent]);

  const submitWriteKey = useCallback((password) => {
    const action = pendingRef.current;
    setAuthOpen(false);
    if (!action) return;
    if (action.kind === "toggle") performToggle(action.p, password);
    else if (action.kind === "setCurrent") performSetCurrent(action.masechta, password);
  }, [performToggle, performSetCurrent]);

  const closeAuthGate = useCallback(() => {
    setAuthOpen(false);
    pendingRef.current = null;
  }, []);

  const chestTap = useCallback((m, col, ready) => {
    if (ready) setCele({ level: "masechta", col, yell: S.mazel, sub: masName(m.masechta, lang) + " " + S.complete,
      meta: S.fullMasechta, xp: S.xpN(m.perakim.length), cta: S.onward });
    else showToast(masName(m.masechta, lang) + " · " + m.perakim.filter(p => p[person + "_done"]).length + "/" + m.perakim.length);
  }, [S, lang, person, showToast]);

  /* ---------- Sefaria reader (live Mishnah text) ---------- */
  const openReader = useCallback(p => setReaderId(p.perek_id), []);
  const closeReader = useCallback(() => setReaderId(null), []);
  // the flat perakim list is already in Shas order, so prev/next walks the whole Shas
  const readerPerek = useMemo(() => {
    if (!data || !readerId) return null;
    const i = data.perakim.findIndex(p => p.perek_id === readerId);
    if (i === -1) return null;
    return { p: data.perakim[i], hasPrev: i > 0, hasNext: i < data.perakim.length - 1 };
  }, [data, readerId]);
  const readerNav = useCallback(dir => {
    setReaderId(id => {
      const i = data.perakim.findIndex(p => p.perek_id === id);
      const j = i + dir;
      return j >= 0 && j < data.perakim.length ? data.perakim[j].perek_id : id;
    });
  }, [data]);

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
    authOpen, authError, submitWriteKey, closeAuthGate, requestSetCurrent,
    readerPerek, openReader, closeReader, readerNav,
  };
}

Object.assign(window, { computeGroups, sederName, masName, pct, STR, PCOL, useShasApp });
