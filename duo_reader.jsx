/* Shas Tracker v2 — live Mishnah reader, powered by the Sefaria v3 texts API.
   Free, keyless, CORS-open: one GET per perek returns every mishnah in it,
   Hebrew source + English translation. Responses are cached in localStorage
   so a perek is fetched from Sefaria once per device. */

const SEFARIA_API = "https://www.sefaria.org/api/v3/texts/";

function sefariaTitle(masechta) {
  return (window.MAS_SEFARIA && window.MAS_SEFARIA[masechta]) || "Mishnah " + masechta;
}
function sefariaTref(masechta, perekNum) {
  return sefariaTitle(masechta).replace(/ /g, "_") + "." + perekNum;
}

/* ---- fetch + cache ---- */
const SEF_MEM = new Map();
const sefCacheKey = tref => "shas2-sef:" + tref;

function parseSefariaResponse(json) {
  const versions = json && json.versions;
  if (!Array.isArray(versions) || versions.length === 0) throw new Error("no text");
  const flat = t => (Array.isArray(t) ? t.flat(Infinity) : [t]).map(s => String(s || "").trim());
  const heV = versions.find(v => v.language === "he");
  const enV = versions.find(v => v.language === "en");
  const he = heV ? flat(heV.text) : [];
  const en = enV ? flat(enV.text) : [];
  if (!he.length && !en.length) throw new Error("empty text");
  return { he, en, heTitle: heV ? heV.versionTitle : "", enTitle: enV ? enV.versionTitle : "" };
}

async function fetchPerekText(masechta, perekNum) {
  const tref = sefariaTref(masechta, perekNum);
  if (SEF_MEM.has(tref)) return SEF_MEM.get(tref);
  try {
    const raw = localStorage.getItem(sefCacheKey(tref));
    if (raw) { const c = JSON.parse(raw); SEF_MEM.set(tref, c); return c; }
  } catch (e) { /* corrupt cache entry — refetch */ }
  const url = SEFARIA_API + encodeURIComponent(tref) +
    "?version=source&version=translation&return_format=text_only";
  const r = await fetch(url);
  if (!r.ok) throw new Error("Sefaria GET failed: " + r.status);
  const content = parseSefariaResponse(await r.json());
  SEF_MEM.set(tref, content);
  try { localStorage.setItem(sefCacheKey(tref), JSON.stringify(content)); }
  catch (e) { /* storage full — memory cache still holds it */ }
  return content;
}

/* ---- Hebrew numerals for mishnah/perek numbers (1–99 is plenty) ---- */
function toHebNum(n) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  if (n === 15) return "טו";
  if (n === 16) return "טז";
  return tens[Math.floor(n / 10)] + ones[n % 10];
}

/* ================================ READER MODAL ================================ */
function ReaderModal({ S, lang, rtl, reader, person, onClose, onNav, onToggle }) {
  const [state, setState] = React.useState({ status: "loading", content: null });
  const [mode, setMode] = React.useState(() => localStorage.getItem("shas2-readmode") || "both");
  const [tick, retry] = React.useReducer(x => x + 1, 0);
  const bodyRef = React.useRef(null);

  const p = reader && reader.p;
  const tref = p ? sefariaTref(p.masechta, p.perek_num) : null;

  React.useEffect(() => {
    if (!p) return;
    let alive = true;
    setState({ status: "loading", content: null });
    fetchPerekText(p.masechta, p.perek_num)
      .then(content => { if (alive) setState({ status: "ok", content }); })
      .catch(() => { if (alive) setState({ status: "err", content: null }); });
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    return () => { alive = false; };
  }, [tref, tick]);

  React.useEffect(() => {
    if (!p) return;
    const onKey = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") onNav(rtl ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, rtl, onClose, onNav]);

  if (!p) return null;

  const masName = window.masName;
  const col = window.sederColor(window.SEDER_ORDER.indexOf(p.seder));
  const done = p[person + "_done"];
  const setPersistMode = m => { setMode(m); localStorage.setItem("shas2-readmode", m); };

  const c = state.content;
  const count = c ? Math.max(c.he.length, c.en.length) : 0;
  const title = masName(p.masechta, lang) + " · " +
    (lang === "he" ? "פרק " + toHebNum(p.perek_num) : S.perekWord + " " + p.perek_num);

  return (
    <div className="rdr-overlay" onClick={onClose}>
      <div className="rdr-card" style={{ "--rc": col.c, "--rd": col.d }} onClick={e => e.stopPropagation()}>
        <div className="rdr-head">
          <button className="rdr-nav" disabled={!reader.hasPrev} onClick={() => onNav(-1)} aria-label="previous perek">
            <span style={{ transform: rtl ? "none" : "rotate(180deg)", display: "inline-flex" }}>
              <window.DIcon d={window.DP.chev} w={20} s={2.6} /></span>
          </button>
          <div className="rdr-title">
            <span className="em">{window.MAS_EMOJI[p.masechta] || "📖"}</span>
            <span className="tt">{title}</span>
          </div>
          <button className="rdr-nav" disabled={!reader.hasNext} onClick={() => onNav(1)} aria-label="next perek">
            <span style={{ transform: rtl ? "rotate(180deg)" : "none", display: "inline-flex" }}>
              <window.DIcon d={window.DP.chev} w={20} s={2.6} /></span>
          </button>
          <button className="rdr-close" onClick={onClose} aria-label="close">✕</button>
        </div>

        <div className="rdr-modes">
          {[["he", S.modeHe], ["both", S.modeBoth], ["en", S.modeEn]].map(([k, l]) => (
            <button key={k} className={mode === k ? "on" : ""} onClick={() => setPersistMode(k)}>{l}</button>
          ))}
        </div>

        <div className="rdr-body" ref={bodyRef}>
          {state.status === "loading" && <div className="rdr-hint">{S.readerLoading}</div>}
          {state.status === "err" && (
            <div className="rdr-hint">
              {S.readerErr}
              <button className="rdr-retry" onClick={retry}>{S.readerRetry}</button>
            </div>
          )}
          {state.status === "ok" && Array.from({ length: count }, (_, i) => (
            <div className="rdr-mishnah" key={i}>
              <span className="badge">{lang === "he" ? toHebNum(i + 1) : i + 1}</span>
              <div className="texts">
                {mode !== "en" && c.he[i] && <p className="he" dir="rtl" lang="he">{c.he[i]}</p>}
                {mode !== "he" && c.en[i] && <p className="en" dir="ltr" lang="en">{c.en[i]}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="rdr-foot">
          <button className={"rdr-mark" + (done ? " done" : "")} onClick={() => onToggle(p)}>
            <window.DIcon d={done ? window.DP.check : window.DP.star} w={16} s={2.6} fill={done} />
            {done ? S.learned : S.markLearned}
          </button>
          <a className="rdr-sefaria" href={"https://www.sefaria.org/" + tref + "?lang=bi"}
            target="_blank" rel="noopener noreferrer">{S.openSefaria} ↗</a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ReaderModal, fetchPerekText, sefariaTref, toHebNum });
