/* Shas Tracker v2 — icons, section colors, the winding PATH view + celebration */

function DIcon({ d, w = 24, s = 2, fill = false }) {
  return (
    <svg width={w} height={w} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block" }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}
const DP = {
  star:   "M12 3.2l2.5 5.3 5.8.8-4.2 4.1 1 5.8-5.1-2.8-5.1 2.8 1-5.8L3.7 9.3l5.8-.8z",
  book:   "M12 6c-1.6-1-4.2-1.6-6.5-1.6V17c2.3 0 4.9.6 6.5 1.6 1.6-1 4.2-1.6 6.5-1.6V4.4C16.2 4.4 13.6 5 12 6zM12 6v11",
  crown:  "M4 8.5l3.6 3.2L12 5l4.4 6.7L20 8.5 18.5 18h-13z",
  check:  "M20 6 9 17l-5-5",
  trophy: "M7 4h10v3.5a5 5 0 0 1-10 0zM7 5.5H4.2v1a3 3 0 0 0 3 3M17 5.5h2.8v1a3 3 0 0 1-3 3M9.5 13.5h5l-.8 4h-3.4zM8 20.5h8",
  chest:  "M4.5 9.5h15v9h-15zM4.5 9.5 6 6h12l1.5 3.5M4.5 13.5h15M11 12.2h2v3h-2z",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM21 21l-4.3-4.3",
  flag:   "M6 3v18M6 4h11l-2 4.5 2 4.5H6",
  chart:  "M5 20V11M12 20V4M19 20v-7",
  lock:   "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  chev:   "M9 18l6-6-6-6",
};

/* emoji — one per Seder, one per Masechta (keyed by the English name in shas.js) */
const SEDER_EMOJI = {
  Zeraim: "🌱", Moed: "📅", Nashim: "💍", Nezikin: "⚖️", Kodashim: "🕊️", Taharos: "💧",
};
const MAS_EMOJI = {
  Berachos: "🙏", Peah: "🌾", Demai: "🌽", Kilayim: "🚫", Sheviis: "🌗", Terumos: "🎁",
  Maasros: "🔟", "Maaser Sheni": "🍽️", Challah: "🍞", Orlah: "🌳", Bikkurim: "🧺",
  Shabbos: "🕯️", Eruvin: "🧵", Pesachim: "🫓", Shekalim: "🪙", Yoma: "🐐", Sukkah: "🌿",
  Beitzah: "🥚", "Rosh Hashanah": "📯", Taanis: "🌧️", Megillah: "📜", "Moed Katan": "🎪", Chagigah: "🎊",
  Yevamos: "👰", Kesubos: "📃", Nedarim: "🤐", Nazir: "🍇", Sotah: "❓", Gittin: "📄", Kiddushin: "💍",
  "Bava Kamma": "🐂", "Bava Metzia": "🔍", "Bava Basra": "🏠", Sanhedrin: "👨‍⚖️", Makkos: "🎯",
  Shevuos: "🤝", Eduyos: "📋", "Avodah Zarah": "🚫", Avos: "📖", Horayos: "🧑‍⚖️",
  Zevachim: "🔥", Menachos: "🌾", Chullin: "🍖", Bechoros: "🐄", Arachin: "💰", Temurah: "🔄",
  Kerisos: "✂️", Meilah: "🚫", Tamid: "⏰", Middos: "📐", Kinnim: "🐦",
  Keilim: "🏺", Ohalos: "⛺", Negaim: "🩹", Parah: "🐄", Taharos: "💧", Mikvaos: "🛁",
  Niddah: "🌙", Machshirin: "💦", Zavim: "💧", "Tevul Yom": "☀️", Yadayim: "✋", Uktzin: "🌿",
};

/* section (Seder) colors — indexed by SEDER_ORDER position */
const SEDER_COLORS = [
  { c: "#58cc02", d: "#58a700", t: "#e4ffcc", on: "#ffffff" }, // Zeraim — green
  { c: "#1cb0f6", d: "#1899d6", t: "#dcf3ff", on: "#ffffff" }, // Moed — blue
  { c: "#ffc800", d: "#e0a800", t: "#fff3c4", on: "#7a5600" }, // Nashim — gold
  { c: "#ff5252", d: "#e23b3b", t: "#ffe0e0", on: "#ffffff" }, // Nezikin — red
  { c: "#ce82ff", d: "#b45cf0", t: "#f3e6ff", on: "#ffffff" }, // Kodashim — purple
  { c: "#00cd9c", d: "#00b083", t: "#d1fff3", on: "#054d3c" }, // Taharos — teal
];
const sederColor = i => SEDER_COLORS[i % SEDER_COLORS.length];
const CONFETTI_COLORS = ["#58cc02", "#1cb0f6", "#ffc800", "#ff5252", "#ce82ff", "#00cd9c"];

/* winding offsets (px) within a masechta's node column */
const AMP = [0, -46, -66, -46, 0, 46, 66, 46];

/* ------------------------------ a single perek node ------------------------------ */
function TrailNode({ p, col, done, current, offset, onToggle, nums }) {
  const state = done ? "done" : current ? "current" : "future";
  const style = { "--nc": col.c, "--nd": col.d, "--non": col.on };
  return (
    <div className="noderow" style={{ transform: `translateX(${offset}px)` }}>
      <button className={"node " + state} style={style} onClick={() => onToggle(p)}
        aria-label={p.masechta + " perek " + p.perek_num}>
        {current && <span className="pulse" />}
        <span className="cap">
          {done
            ? <span className="star"><DIcon d={DP.star} w={26} fill /></span>
            : current
              ? <DIcon d={DP.book} w={26} s={2.2} />
              : <span className="num">{nums ? p.perek_num : "·"}</span>}
        </span>
        {current && <span className="startbubble">{p._startLabel}</span>}
      </button>
    </div>
  );
}

/* ------------------------------ masechta-end chest ------------------------------ */
function Chest({ ready, col, onClick }) {
  return (
    <div className="noderow">
      <button className={"chest " + (ready ? "ready" : "locked")} onClick={onClick}>
        <span className="box">
          <DIcon d={ready ? DP.chest : DP.lock} w={30} s={2} />
        </span>
      </button>
    </div>
  );
}

/* ------------------------------ celebration modal ------------------------------ */
function Confetti() {
  const pieces = React.useMemo(() => Array.from({ length: 34 }, (_, i) => ({
    left: Math.random() * 100,
    bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.5,
    dur: 1.4 + Math.random() * 1.2,
    rot: Math.random() * 360,
  })), []);
  return (
    <div className="confetti">
      {pieces.map((p, i) => (
        <i key={i} style={{
          left: p.left + "%", background: p.bg,
          animationDelay: p.delay + "s", animationDuration: p.dur + "s",
          transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  );
}

function Celebration({ cele, onClose }) {
  if (!cele) return null;
  const big = cele.level !== "perek";
  const medalBg = cele.level === "perek" ? cele.col.c : "#ffc800";
  const medalDk = cele.level === "perek" ? cele.col.d : "#e0a800";
  const btnBg = cele.level === "perek" ? cele.col.c : "#ffc800";
  const btnDk = cele.level === "perek" ? cele.col.d : "#e0a800";
  const yellCol = cele.level === "perek" ? cele.col.d : "#c98a00";
  const icon = cele.level === "perek" ? DP.star : DP.trophy;
  return (
    <div className="cele-overlay" onClick={onClose}>
      <div className="cele-card" onClick={e => e.stopPropagation()}
        style={{ "--cc": btnBg, "--cd2": btnDk }}>
        <Confetti />
        <div className="medal" style={{ background: medalBg, "--md": medalDk, color: cele.level === "perek" ? cele.col.on : "#6b4c00" }}>
          <DIcon d={icon} w={big ? 52 : 46} fill />
        </div>
        <div className="yell" style={{ color: yellCol }}>{cele.yell}</div>
        <div className="sub">{cele.sub}</div>
        {cele.meta && <div className="meta">{cele.meta}</div>}
        {cele.xp && <div className="xp"><DIcon d={DP.crown} w={16} fill />{cele.xp}</div>}
        <button className="cele-btn" onClick={onClose}>{cele.cta}</button>
      </div>
    </div>
  );
}

/* ================================ PATH VIEW ================================ */
function PathView({ S, lang, groups, person, onToggle, chestTap, nums, collapsedSed, collapsedMas, toggleSeder, toggleMasechta }) {
  const sederName = window.sederName, masName = window.masName, pct = window.pct;

  // first not-done perek for this person, in Shas order → the "current" node
  let currentId = null;
  for (const g of groups) {
    for (const m of g.masechtos) {
      for (const p of m.perakim) {
        if (!p[person + "_done"]) { currentId = p.perek_id; break; }
      }
      if (currentId) break;
    }
    if (currentId) break;
  }
  const allDone = currentId === null;

  return (
    <div className="pathwrap">
      {groups.map((g, si) => {
        const col = sederColor(si);
        const sederDoneCount = person === "eman" ? g.eman : g.yehuda;
        const sederPct = pct(sederDoneCount, g.total);
        const secCollapsed = collapsedSed.has(g.seder);
        return (
          <React.Fragment key={g.seder}>
            <button className={"section-div" + (secCollapsed ? " collapsed" : "")} onClick={() => toggleSeder(g.seder)}>
              <span className="ln" style={{ background: col.t }} />
              <span className="mid">
                <span className="k" style={{ color: col.d }}>{S.seder} {si + 1} · {sederPct}%</span>
                <span className="s">{SEDER_EMOJI[g.seder] || ""} {sederName(g.seder, lang)}
                  <span className="chev" style={{ color: col.d }}><DIcon d={DP.chev} w={16} s={2.6} /></span>
                </span>
              </span>
              <span className="ln" style={{ background: col.t }} />
            </button>

            {!secCollapsed && g.masechtos.map(m => {
              const mdone = m.perakim.filter(p => p[person + "_done"]).length;
              const mfull = mdone === m.perakim.length;
              const masKey = g.seder + "::" + m.masechta;
              const masCollapsed = collapsedMas.has(masKey);
              return (
                <React.Fragment key={m.masechta}>
                  <button className={"unit" + (masCollapsed ? " collapsed" : "")}
                    style={{ background: col.c, color: col.on, "--ud": col.d }}
                    onClick={() => toggleMasechta(masKey)}>
                    <span className="info">
                      <span className="k">{S.masechta}</span>
                      <span className="m">{MAS_EMOJI[m.masechta] || ""} {masName(m.masechta, lang)}</span>
                    </span>
                    <span className={"crown" + (mfull ? " full" : "")}>
                      <DIcon d={DP.crown} w={16} fill />{mdone}/{m.perakim.length}
                    </span>
                    <span className="chev"><DIcon d={DP.chev} w={16} s={2.6} /></span>
                  </button>
                  {!masCollapsed && (
                    <div className="trail">
                      {m.perakim.map((p, i) => {
                        p._startLabel = S.start;
                        return (
                          <TrailNode key={p.perek_id} p={p} col={col} nums={nums}
                            done={p[person + "_done"]} current={p.perek_id === currentId}
                            offset={AMP[i % AMP.length]} onToggle={onToggle} />
                        );
                      })}
                      <Chest ready={mfull} col={col}
                        onClick={() => chestTap(m, col, mfull, sederName(g.seder, lang))} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}

      {allDone && (
        <div className="trophy-end">
          <div className="big"><DIcon d={DP.trophy} w={54} fill /></div>
          <div className="tt">{S.shasDone}</div>
          <div className="ts">{S.shasDoneSub(person === "eman" ? S.abba : S.yehuda)}</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { DIcon, DP, SEDER_COLORS, sederColor, SEDER_EMOJI, MAS_EMOJI, CONFETTI_COLORS, PathView, Celebration });
