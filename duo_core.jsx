/* Shas Tracker v2 — shared state/logic hook + i18n + API layer (used by both mobile & web shells) */

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- API layer (mirrors v1 mock/live shape) ---------- */
const SCRIPT_URL = https://script.google.com/macros/s/AKfycbyIVGJU9q8O2-rcRCt0XmAuj-SdU-nAhmgB8CgycdxhkCd12mvRR8XASgE5sEo3iqvV/exec;
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
  },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "nodeNumbers": true,
  "celebrations": true
}/*EDITMODE-END*/;

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
  const toastTimer = useRef(null);

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
    setData(prev => ({ perakim: prev.perakim.map(p => p.perek_id === perek_id
      ? { ...p, [who + "_done"]: done, [who + "_date"]: done ? todayISO() : null } : p) }));
  }, []);

  const onToggle = useCallback((p) => {
    const who = person;
    const next = !p[who + "_done"];
    setDone(p.perek_id, who, next);
    apiPost({ perek_id: p.perek_id, person: who, done: next, date: next ? todayISO() : null })
      .then(res => { if (!res || !res.ok) throw new Error("nok"); })
      .catch(() => { setDone(p.perek_id, who, !next); showToast(S.saveErr); });

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
  }, [person, data, tw.celebrations, S, lang, setDone, showToast]);

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
  };
}

Object.assign(window, { computeGroups, sederName, masName, pct, STR, PCOL, useShasApp });
