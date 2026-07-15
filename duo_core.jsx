/* Shas Tracker v2 — shared state/logic hook + i18n + API layer (used by both mobile & web shells) */

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- API layer (mirrors v1 mock/live shape) ---------- */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby18pjM3M-Rwa_P9HgULS_cNBKgkElkS1rUdYEhmvV_7ArmfmIPRGn7kXnzQHnccYok/exec";
const USE_MOCK = SCRIPT_URL.startsWith("PASTE_");
/* The live Sheet may still carry legacy Ashkenazi spellings (Berachos, Avos,
   Taharos…) in its seder/masechta columns. Normalize them to the Sephardi
   display names at the door; perek_id is left untouched — it's the stable
   write key the Sheet is looked up by.
   Each perek is also hydrated with its mishnayos sub-tasks: the fixed
   mishna_count (from MISHNA_COUNTS, keyed by display name) and each person's
   learned-mishnayos list, stored by the API as "1,3,4" (arrays in the mock). */
const parseMishnayos = v => (Array.isArray(v) ? v : String(v == null ? "" : v).split(/[\s,;]+/))
  .map(Number).filter(n => Number.isInteger(n) && n > 0);
function normalizeData(json) {
  const MC = window.MAS_CANON || {}, SC = window.SEDER_CANON || {};
  const counts = window.MISHNA_COUNTS || {};
  const cur = json.current || {};
  const nx = json.next || {};
  const canonList = arr => (Array.isArray(arr) ? arr.map(m => MC[m] || m) : []);
  return { ...json,
    perakim: (json.perakim || []).map(p => {
      const masechta = MC[p.masechta] || p.masechta;
      return { ...p, seder: SC[p.seder] || p.seder, masechta,
        mishna_count: (counts[masechta] || [])[p.perek_num - 1] || 0,
        eman_mishnayos: parseMishnayos(p.eman_mishnayos),
        yehuda_mishnayos: parseMishnayos(p.yehuda_mishnayos) };
    }),
    current: { eman: MC[cur.eman] || cur.eman || null, yehuda: MC[cur.yehuda] || cur.yehuda || null },
    next: { eman: canonList(nx.eman), yehuda: canonList(nx.yehuda) },
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

/* ---------- mishnayos (sub-task) helpers ---------- */
const allMishnayos = p => Array.from({ length: p.mishna_count }, (_, i) => i + 1);
/* A done perek means every mishna is learned, even if the list column is blank
   (seeded rows). Invariant kept on write: done ⇔ list is complete. */
const learnedMishnayos = (p, who) => (p[who + "_done"] ? allMishnayos(p) : p[who + "_mishnayos"] || []);

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
    mishnaProgress: (k, n) => k + "/" + n + " mishnayos",
    markPerek: "Mark whole perek", unmarkPerek: "Unmark whole perek",
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
    collapseAll: "Collapse all", expandAll: "Expand all",
    nextUp: "Next up", addNext: "Add to next up", removeNext: "Remove",
    noNext: "Nothing queued yet.", noNextHint: "Add a masechta from Search to line it up.",
    nextAdded: m => "Added to next up: " + m, nextRemoved: "Removed from next up",
    siyumTitle: "Siyum calculator", siyumSub: who => "Project " + who + "'s finish by mishnayos",
    siyumModeDate: "When's the siyum?", siyumModePace: "What pace do I need?",
    siyumPaceLabel: "Mishnayos per week", siyumDateLabel: "Finish by",
    siyumRemaining: n => n.toLocaleString() + " mishnayos left",
    siyumRemainingEst: n => "≈ " + n.toLocaleString() + " mishnayos left",
    siyumLoading: "Counting mishnayos from Sefaria…",
    siyumEstNote: "Estimate — using the Shas average of ~8 mishnayos/perek (couldn't reach Sefaria for exact counts).",
    siyumDone: "Siyum complete — every mishnah learned! 🎉",
    siyumResultDate: "Projected siyum",
    siyumResultWeeks: (w, mo) => "≈ " + w + " week" + (w === 1 ? "" : "s") + (mo ? " (" + mo + ")" : ""),
    siyumResultPace: n => n.toLocaleString() + " / week",
    siyumResultPaceSub: (perDay) => "about " + perDay + " a day",
    siyumMonths: n => n + " month" + (n === 1 ? "" : "s"),
    siyumNeedPace: "Enter a weekly pace above.", siyumNeedDate: "Pick a target date above.",
    siyumPastDate: "Pick a date in the future.",
    setDate: "Set completion date", applyDate: "Mark done on this date",
    dateSaving: "Saving dates…", dateSet: (m, d) => m + " marked done · " + d,
    completedOn: d => "done " + d,
    read: "Read", perekWord: "Perek", mishnahWord: "Mishnah",
    readerLoading: "Loading from Sefaria…", readerErr: "Couldn't load the text — check the connection",
    readerRetry: "Try again", openSefaria: "Open on Sefaria",
    modeBoth: "Both", modeHe: "עברית", modeEn: "English",
    markLearned: "Mark learned", learned: "Learned ✓",
    theme: "Theme",
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
    setCurrent: "סמן כנלמד כעת", unpinCurrent: "בטל סימון",
    noCurrent: "טרם נבחר דבר.", noCurrentHint: "סמן מסכת ב'חיפוש' כדי לעקוב אחריה כאן.",
    switchToEdit: who => "עבור אל " + who + " כדי לעדכן",
    nowLearningSet: m => "לומד כעת: " + m, nowLearningCleared: "הוסר הסימון",
    collapseAll: "כווץ הכל", expandAll: "הרחב הכל",
    nextUp: "הבא בתור", addNext: "הוסף להבא בתור", removeNext: "הסר",
    noNext: "אין דבר בתור.", noNextHint: "הוסף מסכת מ'חיפוש' כדי להעמיד אותה בתור.",
    nextAdded: m => "נוסף לתור: " + m, nextRemoved: "הוסר מהתור",
    siyumTitle: "מחשבון סיום", siyumSub: who => "חישוב סיום " + who + " לפי משניות",
    siyumModeDate: "מתי הסיום?", siyumModePace: "איזה קצב צריך?",
    siyumPaceLabel: "משניות לשבוע", siyumDateLabel: "לסיים עד",
    siyumRemaining: n => n.toLocaleString() + " משניות נותרו",
    siyumRemainingEst: n => "≈ " + n.toLocaleString() + " משניות נותרו",
    siyumLoading: "סופר משניות מספריא…",
    siyumEstNote: "הערכה — לפי ממוצע של כ-8 משניות לפרק (לא ניתן להתחבר לספריא לספירה מדויקת).",
    siyumDone: "הסיום הושלם — כל משנה נלמדה! 🎉",
    siyumResultDate: "סיום צפוי",
    siyumResultWeeks: (w, mo) => "≈ " + w + " שבועות" + (mo ? " (" + mo + ")" : ""),
    siyumResultPace: n => n.toLocaleString() + " לשבוע",
    siyumResultPaceSub: (perDay) => "בערך " + perDay + " ליום",
    siyumMonths: n => n + " חודשים",
    siyumNeedPace: "הזן קצב שבועי למעלה.", siyumNeedDate: "בחר תאריך יעד למעלה.",
    siyumPastDate: "בחר תאריך עתידי.",
    setDate: "קבע תאריך סיום", applyDate: "סמן כנלמד בתאריך זה",
    dateSaving: "שומר תאריכים…", dateSet: (m, d) => m + " סומנה כנלמדה · " + d,
    completedOn: d => "נלמד " + d,
    read: "לימוד", perekWord: "פרק", mishnahWord: "משנה",
    readerLoading: "טוען מספריא…", readerErr: "הטעינה נכשלה — בדוק את החיבור",
    readerRetry: "נסה שוב", openSefaria: "פתח בספריא",
    modeBoth: "שניהם", modeHe: "עברית", modeEn: "English",
    markLearned: "סמן כנלמד", learned: "נלמד ✓",
    theme: "עיצוב",
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
  const [skin, setSkin] = useState(() => localStorage.getItem("shas2-skin") || "duo");
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
  const [sheetId, setSheetId] = useState(null); // perek whose mishnayos sheet is open
  const toastTimer = useRef(null);
  const pendingRef = useRef(null); // { kind: "toggle", p, mishna } | { kind: "setCurrent", masechta } | …

  const toggleSeder = useCallback(s => setCollapsedSed(prev => {
    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n;
  }), []);
  const toggleMasechta = useCallback(k => setCollapsedMas(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  }), []);
  // Collapse/expand every Seder at once (Path view header control).
  const collapseAllSed = useCallback(() => setCollapsedSed(new Set(window.SEDER_ORDER)), []);
  const expandAllSed = useCallback(() => setCollapsedSed(new Set()), []);

  const setPersistPerson = p => { setPerson(p); localStorage.setItem("shas2-person", p); };
  const setPersistView = v => { setView(v); localStorage.setItem("shas2-view", v); };
  const switchLang = l => { setLang(l); localStorage.setItem("shas2-lang", l); };
  const switchSkin = k => { setSkin(k); localStorage.setItem("shas2-skin", k); };

  const showToast = useCallback(msg => {
    setToast(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => { apiGet().then(setData).catch(() => showToast(STR[localStorage.getItem("shas2-lang") || "en"].loadErr)); }, [showToast]);

  const groups = useMemo(() => (data ? computeGroups(data) : []), [data]);
  const total = useMemo(() => (data ? data.perakim.length : 0), [data]);
  const emanTot = useMemo(() => (data ? data.perakim.filter(p => p.eman_done).length : 0), [data]);
  const yehudaTot = useMemo(() => (data ? data.perakim.filter(p => p.yehuda_done).length : 0), [data]);

  const patchPerek = useCallback((perek_id, patch) => {
    setData(prev => ({ ...prev, perakim: prev.perakim.map(p => p.perek_id === perek_id ? { ...p, ...patch } : p) }));
  }, []);

  /* One save path for both granularities. mishna == null toggles the whole
     perek (cascading to every mishna); a mishna number toggles that one
     sub-task, auto-completing the perek when it was the last one and
     reopening the perek when one is removed — full two-way sync. */
  const performToggle = useCallback((p, mishna, password) => {
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
            pendingRef.current = { kind: "toggle", p, mishna };
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

  const attemptToggle = useCallback((p, mishna) => {
    const key = getWriteKey();
    if (key) { performToggle(p, mishna, key); return; }
    pendingRef.current = { kind: "toggle", p, mishna };
    setAuthError("");
    setAuthOpen(true);
  }, [performToggle]);

  // whole-perek toggle (cascades to all mishnayos) — used by the sheet's
  // footer button and the reader's "Mark learned"
  const togglePerek = useCallback(p => attemptToggle(p, null), [attemptToggle]);
  // one mishna sub-task
  const toggleMishna = useCallback((p, n) => attemptToggle(p, n), [attemptToggle]);

  /* Tapping a perek opens its mishnayos sheet; perakim with no known mishna
     count keep the old direct whole-perek toggle. */
  const onToggle = useCallback((p) => {
    if (p.mishna_count > 0) setSheetId(p.perek_id);
    else attemptToggle(p, null);
  }, [attemptToggle]);
  const closeSheet = useCallback(() => setSheetId(null), []);
  const sheetPerek = useMemo(
    () => (data && sheetId ? data.perakim.find(p => p.perek_id === sheetId) || null : null),
    [data, sheetId]);

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

  // ---------- "Next up" — a short ordered queue of masechtot per person ----------
  const performSetNext = useCallback((nextList, addedName, password) => {
    const who = person;
    const prevNext = data.next ? data.next[who] : [];
    setData(prev => ({ ...prev, next: { ...prev.next, [who]: nextList } }));
    apiPost({ action: "setNext", person: who, next: nextList, password })
      .then(res => {
        if (!res || !res.ok) {
          setData(prev => ({ ...prev, next: { ...prev.next, [who]: prevNext } }));
          if (res && res.error === "bad password") {
            localStorage.removeItem(WRITE_KEY_STORAGE);
            pendingRef.current = { kind: "setNext", nextList, addedName };
            setAuthError(S.authWrong);
            setAuthOpen(true);
          } else {
            showToast(S.saveErr);
          }
          return;
        }
        localStorage.setItem(WRITE_KEY_STORAGE, password);
        showToast(addedName ? S.nextAdded(masName(addedName, lang)) : S.nextRemoved);
      })
      .catch(() => {
        setData(prev => ({ ...prev, next: { ...prev.next, [who]: prevNext } }));
        showToast(S.saveErr);
      });
  }, [person, data, S, lang, showToast]);

  // add (appended, deduped) or remove one masechta from the active person's queue
  const requestNextToggle = useCallback((masechta) => {
    const who = person;
    const cur = (data.next && data.next[who]) || [];
    const has = cur.includes(masechta);
    const nextList = has ? cur.filter(m => m !== masechta) : [...cur, masechta];
    const addedName = has ? null : masechta;
    const key = getWriteKey();
    if (key) { performSetNext(nextList, addedName, key); return; }
    pendingRef.current = { kind: "setNext", nextList, addedName };
    setAuthError("");
    setAuthOpen(true);
  }, [person, data, performSetNext]);

  // ---------- completion dates: mark a whole masechta done on a chosen date ----------
  // Reuses the existing per-perek toggle write (which already stores a date), so
  // no backend change is needed. Sends one write per perek in the masechta.
  const performMasechtaDate = useCallback((masechta, date, password) => {
    const who = person;
    const targets = data.perakim.filter(p => p.masechta === masechta);
    if (!targets.length) return;
    const prev = new Map(targets.map(p => [p.perek_id, { done: p[who + "_done"], date: p[who + "_date"] }]));
    const applyLocal = (pid, done, dt) => setData(d => ({ ...d,
      perakim: d.perakim.map(p => p.perek_id === pid ? { ...p, [who + "_done"]: done, [who + "_date"]: dt } : p) }));
    // optimistic: all done on this date
    targets.forEach(p => applyLocal(p.perek_id, true, date));
    showToast(S.dateSaving);

    (async () => {
      let badPw = false, failed = false;
      for (const p of targets) {
        try {
          const res = await apiPost({ perek_id: p.perek_id, person: who, done: true, date, password });
          if (res && res.ok) continue;
          if (res && res.error === "bad password") { badPw = true; break; }
          failed = true;
        } catch (e) { failed = true; }
      }
      if (badPw) {
        targets.forEach(p => { const pr = prev.get(p.perek_id); applyLocal(p.perek_id, pr.done, pr.date); });
        localStorage.removeItem(WRITE_KEY_STORAGE);
        pendingRef.current = { kind: "masechtaDate", masechta, date };
        setAuthError(S.authWrong); setAuthOpen(true);
        return;
      }
      localStorage.setItem(WRITE_KEY_STORAGE, password);
      showToast(failed ? S.saveErr : S.dateSet(masName(masechta, lang), date));
    })();
  }, [person, data, S, lang, showToast]);

  const requestMasechtaDate = useCallback((masechta, date) => {
    if (!masechta || !date) return;
    const key = getWriteKey();
    if (key) { performMasechtaDate(masechta, date, key); return; }
    pendingRef.current = { kind: "masechtaDate", masechta, date };
    setAuthError("");
    setAuthOpen(true);
  }, [performMasechtaDate]);

  const submitWriteKey = useCallback((password) => {
    const action = pendingRef.current;
    setAuthOpen(false);
    if (!action) return;
    if (action.kind === "toggle") performToggle(action.p, action.mishna, password);
    else if (action.kind === "setCurrent") performSetCurrent(action.masechta, password);
    else if (action.kind === "setNext") performSetNext(action.nextList, action.addedName, password);
    else if (action.kind === "masechtaDate") performMasechtaDate(action.masechta, action.date, password);
  }, [performToggle, performSetCurrent, performSetNext, performMasechtaDate]);

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

  // EmanOS is a stats+search-only skin — any other persisted view falls back to stats
  const effView = skin === "eman" && view !== "stats" && view !== "search" ? "stats" : view;

  return {
    tw, setTweak, lang, S, rtl, switchLang, skin, switchSkin,
    data, view: effView, setPersistView, person, setPersistPerson,
    range, setRange, search, setSearch, status, setStatus, sederFilter, setSederFilter,
    cele, setCele, toast,
    collapsedSed, collapsedMas, toggleSeder, toggleMasechta, collapseAllSed, expandAllSed,
    groups, total, emanTot, yehudaTot, personTotal,
    onToggle, chestTap, acc, PCOL,
    sheetPerek, closeSheet, togglePerek, toggleMishna,
    authOpen, authError, submitWriteKey, closeAuthGate, requestSetCurrent, requestNextToggle, requestMasechtaDate,
    readerPerek, openReader, closeReader, readerNav,
  };
}

Object.assign(window, { computeGroups, sederName, masName, pct, STR, PCOL, useShasApp, learnedMishnayos });
