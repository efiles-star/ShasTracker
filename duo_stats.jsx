/* Shas Tracker v2 — SEARCH view + STATS view */

const D_TODAY = new Date();
const D_HE_DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const dAgoISO = n => { const d = new Date(D_TODAY); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const dpct = (n, t) => (t ? Math.round((n / t) * 100) : 0);

/* inline "set completion date" control for a masechta (backdate a whole masechta) */
function DateSetControl({ S, onApply }) {
  const [open, setOpen] = React.useState(false);
  const [d, setD] = React.useState("");
  const todayISO = new Date(); todayISO.setHours(0, 0, 0, 0);
  const maxISO = todayISO.toISOString().slice(0, 10);
  if (!open) {
    return (
      <button className="datebtn" title={S.setDate} onClick={() => setOpen(true)}>
        <window.DIcon d={window.DP.cal} w={16} s={2.2} />
      </button>
    );
  }
  return (
    <span className="datectl">
      <input type="date" max={maxISO} value={d} onChange={e => setD(e.target.value)} />
      <button className="dateapply" disabled={!d} title={S.applyDate}
        onClick={() => { if (d) { onApply(d); setOpen(false); setD(""); } }}>
        <window.DIcon d={window.DP.check} w={15} s={2.6} />
      </button>
      <button className="datecancel" onClick={() => { setOpen(false); setD(""); }}>✕</button>
    </span>
  );
}

/* ================================ SEARCH ================================ */
function SearchView({ S, lang, groups, person, onToggle, onRead, search, setSearch, status, setStatus, sederFilter, setSederFilter, data, onSetCurrent, onNextToggle, onMasechtaDate }) {
  const sederName = window.sederName, masName = window.masName;
  const q = search.trim().toLowerCase();
  const SEDER_ORDER = window.SEDER_ORDER;
  const currentMasechta = data.current ? data.current[person] : null;
  const nextList = (data.next && data.next[person]) || [];

  const cards = [];
  groups.forEach((g, si) => {
    if (sederFilter !== "all" && sederFilter !== g.seder) return;
    const col = window.sederColor(si);
    g.masechtot.forEach(m => {
      const hit = !q || m.masechta.toLowerCase().includes(q) || (window.MAS_HE[m.masechta] || "").includes(search.trim());
      if (!hit) return;
      const peraks = status === "all" ? m.perakim
        : m.perakim.filter(p => (status === "done" ? p[person + "_done"] : !p[person + "_done"]));
      if (peraks.length === 0) return;
      const done = m.perakim.filter(p => p[person + "_done"]).length;
      // completion date shown when the whole masechta is done: the latest dated perek
      const dates = m.perakim.filter(p => p[person + "_done"] && p[person + "_date"]).map(p => p[person + "_date"]);
      const doneDate = (done === m.perakim.length && dates.length) ? dates.sort().slice(-1)[0] : null;
      cards.push({ seder: g.seder, col, masechta: m.masechta, total: m.perakim.length, done, doneDate, peraks });
    });
  });

  return (
    <div className="searchview">
      <div className="searchbox">
        <window.DIcon d={window.DP.search} w={20} s={2.4} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={S.searchPh} />
      </div>
      <div className="statseg">
        {[["all", S.stAll], ["remaining", S.stLeft], ["done", S.stDone]].map(([k, l]) => (
          <button key={k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{l}</button>
        ))}
      </div>
      <div className="chips">
        <span className={"chip" + (sederFilter === "all" ? " on" : "")} onClick={() => setSederFilter("all")}>{S.allShas}</span>
        {SEDER_ORDER.map(s => (
          <span key={s} className={"chip" + (sederFilter === s ? " on" : "")} onClick={() => setSederFilter(s)}>{sederName(s, lang)}</span>
        ))}
      </div>

      {cards.length === 0
        ? <div className="searchhint">{status === "remaining" ? S.allDoneHint : status === "done" ? S.noneDone : S.noHits}</div>
        : cards.map(c => {
          const isPinned = currentMasechta === c.masechta;
          const isNext = nextList.includes(c.masechta);
          return (
          <div className="mcard" key={c.seder + c.masechta}>
            <div className="mh">
              <span className="dot" style={{ background: c.col.c }} />
              <span className="nm">{masName(c.masechta, lang)}</span>
              <button className={"pinbtn" + (isPinned ? " on" : "")}
                title={isPinned ? S.unpinCurrent : S.setCurrent}
                onClick={() => onSetCurrent(isPinned ? null : c.masechta)}>
                <window.DIcon d={window.DP.pin} w={16} s={2.2} fill={isPinned} />
              </button>
              <button className={"nextbtn" + (isNext ? " on" : "")}
                title={isNext ? S.removeNext : S.addNext}
                onClick={() => onNextToggle(c.masechta)}>
                <window.DIcon d={isNext ? window.DP.check : window.DP.nextUp} w={16} s={2.4} />
              </button>
              <DateSetControl S={S} onApply={d => onMasechtaDate(c.masechta, d)} />
              <button className="mread" style={{ color: c.col.d }} title={S.read}
                onClick={() => onRead(c.peraks[0])}>
                <window.DIcon d={window.DP.book} w={17} s={2.4} />
              </button>
              <span className="ct">{c.done}/{c.total}</span>
            </div>
            {c.doneDate && <div className="mdone">{S.completedOn(c.doneDate)}</div>}
            <div className="mtiles">
              {c.peraks.map(p => {
                const done = p[person + "_done"];
                return (
                  <button key={p.perek_id} className={"mtile" + (done ? " done" : "")}
                    style={done ? { background: c.col.c, color: c.col.on, boxShadow: "0 3px 0 " + c.col.d } : null}
                    onClick={() => onToggle(p)}>{p.perek_num}</button>
                );
              })}
            </div>
          </div>
          );
        })}
    </div>
  );
}

/* ================================ STATS ================================ */
function cumulative(perakim, who) {
  const byDate = {};
  perakim.forEach(p => { if (p[who + "_done"] && p[who + "_date"]) byDate[p[who + "_date"]] = (byDate[p[who + "_date"]] || 0) + 1; });
  const pts = []; let c = 0;
  Object.keys(byDate).sort().forEach(d => { c += byDate[d]; pts.push({ d, c }); });
  return pts;
}
function countSince(perakim, who, fromISO) {
  return perakim.filter(p => p[who + "_done"] && p[who + "_date"] >= fromISO).length;
}

function LineChart({ perakim, fromISO, lang }) {
  const W = 420, H = 190, padL = 30, padR = 12, padT = 12, padB = 22;
  const today = D_TODAY.toISOString().slice(0, 10);
  const loc = lang === "he" ? "he" : "en";
  const e = cumulative(perakim, "eman"), y = cumulative(perakim, "yehuda");
  const minISO = fromISO || (e[0] ? (e[0].d < (y[0] ? y[0].d : "9") ? e[0].d : (y[0] ? y[0].d : e[0].d)) : today);
  const t0 = new Date(minISO + "T12:00:00").getTime();
  const t1 = new Date(today + "T12:00:00").getTime();
  const span = Math.max(1, t1 - t0);
  const base = w => fromISO ? perakim.filter(x => x[w + "_done"] && x[w + "_date"] < fromISO).length : 0;
  const maxY = Math.max(10, ...e.map(p => p.c), ...y.map(p => p.c));
  const sx = iso => padL + ((new Date(iso + "T12:00:00").getTime() - t0) / span) * (W - padL - padR);
  const sy = v => padT + (1 - v / maxY) * (H - padT - padB);

  function build(pts, w) {
    const inWin = pts.filter(pt => pt.d >= minISO);
    const seq = [{ x: sx(minISO), y: sy(fromISO ? base(w) : (inWin[0] ? inWin[0].c : 0)) }];
    inWin.forEach(pt => seq.push({ x: sx(pt.d), y: sy(pt.c) }));
    const lastC = inWin.length ? inWin[inWin.length - 1].c : base(w);
    seq.push({ x: sx(today), y: sy(lastC) });
    return seq;
  }
  const seqE = build(e, "eman"), seqY = build(y, "yehuda");
  const path = seq => seq.map((s, i) => (i ? "L" : "M") + s.x.toFixed(1) + " " + s.y.toFixed(1)).join(" ");
  const area = seq => path(seq) + ` L${sx(today).toFixed(1)} ${sy(0).toFixed(1)} L${sx(minISO).toFixed(1)} ${sy(0).toFixed(1)} Z`;

  const ticks = []; const cur = new Date(t0); cur.setDate(1);
  while (cur.getTime() <= t1) { const iso = cur.toISOString().slice(0, 10); if (cur.getTime() >= t0) ticks.push(iso); cur.setMonth(cur.getMonth() + 1); }
  const yticks = [0, Math.round(maxY / 2), maxY];

  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" dir="ltr">
      {yticks.map(v => (
        <g key={v}>
          <line className="grid" x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} />
          <text className="axislbl" x={padL - 5} y={sy(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {ticks.map(iso => (
        <text key={iso} className="axislbl" x={sx(iso)} y={H - 6} textAnchor="middle">
          {new Date(iso + "T12:00:00").toLocaleDateString(loc, { month: "short" })}</text>
      ))}
      <path className="area" d={area(seqE)} fill="var(--abba)" />
      <path className="area" d={area(seqY)} fill="var(--yeh)" />
      <path className="ln" d={path(seqY)} stroke="var(--yeh)" />
      <path className="ln" d={path(seqE)} stroke="var(--abba)" />
      <circle cx={seqE.at(-1).x} cy={seqE.at(-1).y} r="4.5" fill="var(--abba)" />
      <circle cx={seqY.at(-1).x} cy={seqY.at(-1).y} r="4.5" fill="var(--yeh)" />
    </svg>
  );
}

/* ---- Siyum calculator: project a finish date / required pace, in mishnayot ---- */
const MISHNAYOT_TOTAL = 4192, PERAKIM_TOTAL = 525;
const AVG_MISHNAYOT_PER_PEREK = MISHNAYOT_TOTAL / PERAKIM_TOTAL; // ~7.985

// remaining mishnayot for a person = sum over not-done perakim of that perek's
// mishnah count (from Sefaria shapes); any perek without an exact count falls
// back to the Shas average, and flags the whole total as an estimate.
function remainingMishnayot(perakim, person, shapes) {
  let rem = 0, exact = true;
  for (const p of perakim) {
    if (p[person + "_done"]) continue;
    const ch = shapes && shapes[p.masechta];
    const n = ch && ch[p.perek_num - 1];
    if (typeof n === "number" && n > 0) rem += n;
    else { rem += AVG_MISHNAYOT_PER_PEREK; exact = false; }
  }
  return { rem: Math.round(rem), exact };
}

function SiyumCalc({ S, lang, data, person }) {
  const [mode, setMode] = React.useState("date");     // "date" = when's the siyum, "pace" = required pace
  const [perWeek, setPerWeek] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [shapes, setShapes] = React.useState(null);
  const [status, setStatus] = React.useState("loading"); // loading | exact | est
  const loc = lang === "he" ? "he" : "en";

  // fetch mishnayot-per-perek shapes from Sefaria once (cached), for every masechta present
  React.useEffect(() => {
    let alive = true;
    const names = Array.from(new Set(data.perakim.map(p => p.masechta)));
    window.fetchAllShapes(names)
      .then(map => { if (alive) { setShapes(map); setStatus("exact"); } })
      .catch(() => { if (alive) { setShapes(null); setStatus("est"); } });
    return () => { alive = false; };
  }, [data]);

  const { rem, exact } = remainingMishnayot(data.perakim, person, shapes);
  const isEstimate = status === "est" || !exact;
  const who = person === "eman" ? S.abba : S.yehuda;

  // date math (no time zone surprises: work in whole days from local midnight)
  const MS_DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmtDate = d => d.toLocaleDateString(loc, { year: "numeric", month: "short", day: "numeric" });

  let result = null;
  if (rem <= 0) {
    result = { kind: "done" };
  } else if (mode === "date") {
    const w = Math.floor(Number(perWeek));
    if (w > 0) {
      const weeks = Math.ceil(rem / w);
      const d = new Date(today.getTime() + weeks * 7 * MS_DAY);
      const months = Math.round(weeks / 4.345);
      result = { kind: "date", date: fmtDate(d), weeks, months };
    } else {
      result = { kind: "needPace" };
    }
  } else {
    if (target) {
      const td = new Date(target + "T00:00:00"); td.setHours(0, 0, 0, 0);
      const days = Math.round((td.getTime() - today.getTime()) / MS_DAY);
      if (days <= 0) result = { kind: "past" };
      else {
        const weeks = Math.max(1, days / 7);
        const pw = Math.ceil(rem / weeks);
        const perDay = Math.max(1, Math.ceil(rem / days));
        result = { kind: "pace", perWeek: pw, perDay };
      }
    } else {
      result = { kind: "needDate" };
    }
  }

  const todayISO = today.toISOString().slice(0, 10);

  return (
    <div className="scard siyum">
      <div className="ch"><span className="t">{S.siyumTitle}</span></div>
      <div className="cs">{S.siyumSub(who)}</div>

      <div className="siyum-rem">
        {status === "loading"
          ? <span className="loadingdots">{S.siyumLoading}</span>
          : (isEstimate ? S.siyumRemainingEst(rem) : S.siyumRemaining(rem))}
      </div>

      <div className="siyum-modes">
        {[["date", S.siyumModeDate], ["pace", S.siyumModePace]].map(([k, l]) => (
          <button key={k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>

      {mode === "date" ? (
        <label className="siyum-field">
          <span className="fl">{S.siyumPaceLabel}</span>
          <input type="number" min="1" inputMode="numeric" value={perWeek}
            onChange={e => setPerWeek(e.target.value)} placeholder="—" />
        </label>
      ) : (
        <label className="siyum-field">
          <span className="fl">{S.siyumDateLabel}</span>
          <input type="date" min={todayISO} value={target} onChange={e => setTarget(e.target.value)} />
        </label>
      )}

      <div className="siyum-out">
        {result.kind === "done" && <div className="big">{S.siyumDone}</div>}
        {result.kind === "needPace" && <div className="hint">{S.siyumNeedPace}</div>}
        {result.kind === "needDate" && <div className="hint">{S.siyumNeedDate}</div>}
        {result.kind === "past" && <div className="hint">{S.siyumPastDate}</div>}
        {result.kind === "date" && (
          <>
            <div className="l">{S.siyumResultDate}</div>
            <div className="v">{result.date}</div>
            <div className="s">{S.siyumResultWeeks(result.weeks, result.months ? S.siyumMonths(result.months) : "")}</div>
          </>
        )}
        {result.kind === "pace" && (
          <>
            <div className="l">{S.siyumResultPace(result.perWeek)}</div>
            <div className="s">{S.siyumResultPaceSub(result.perDay)}</div>
          </>
        )}
      </div>

      {isEstimate && status !== "loading" && <div className="siyum-note">{S.siyumEstNote}</div>}
    </div>
  );
}

function StatsView({ S, lang, data, range, setRange, groups, total, person }) {
  const sederName = window.sederName;
  const perakim = data.perakim;
  const fromISO = range === "all" ? null : dAgoISO(range === 30 ? 30 : 90);

  const emanTot = perakim.filter(p => p.eman_done).length;
  const yehudaTot = perakim.filter(p => p.yehuda_done).length;
  const remaining = total * 2 - emanTot - yehudaTot;
  const pace = { eman: (countSince(perakim, "eman", dAgoISO(28)) / 4).toFixed(1), yehuda: (countSince(perakim, "yehuda", dAgoISO(28)) / 4).toFixed(1) };
  const week = { eman: countSince(perakim, "eman", dAgoISO(7)), yehuda: countSince(perakim, "yehuda", dAgoISO(7)) };

  const days = [];
  for (let i = 6; i >= 0; i--) { const iso = dAgoISO(i); const d = new Date(iso + "T12:00:00"); days.push({ iso, lbl: lang === "he" ? D_HE_DOW[d.getDay()] : d.toLocaleDateString("en", { weekday: "narrow" }) }); }
  const perDay = who => days.map(d => perakim.filter(p => p[who + "_done"] && p[who + "_date"] === d.iso).length);
  const dEman = perDay("eman"), dYehuda = perDay("yehuda");
  const maxDay = Math.max(1, ...dEman, ...dYehuda);

  return (
    <div className="stats">
      <h2>{S.statsTitle}</h2>
      <p className="subhead">{S.statsSub}</p>
      <div className="srange">
        {[[30, S.d30], [90, S.d90], ["all", S.dAll]].map(([k, l]) => (
          <button key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{l}</button>
        ))}
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l"><span className="sw" style={{ width: 10, height: 10, borderRadius: 3, background: "var(--abba)" }} />{S.abba}</div><div className="v">{emanTot}<small> /{total}</small></div><div className="s">{S.statSub(dpct(emanTot, total), pace.eman)}</div></div>
        <div className="kpi"><div className="l"><span className="sw" style={{ width: 10, height: 10, borderRadius: 3, background: "var(--yeh)" }} />{S.yehuda}</div><div className="v">{yehudaTot}<small> /{total}</small></div><div className="s">{S.statSub(dpct(yehudaTot, total), pace.yehuda)}</div></div>
        <div className="kpi"><div className="l">{S.together}</div><div className="v">{emanTot + yehudaTot}<small> /{total * 2}</small></div><div className="s">{S.acrossBoth}</div></div>
        <div className="kpi"><div className="l">{S.remaining}</div><div className="v">{remaining}</div><div className="s">{S.leftFinish}</div></div>
      </div>

      <div className="scard">
        <div className="ch"><span className="t">{S.overTime}</span>
          <span className="leg"><span><span className="sw" style={{ background: "var(--abba)" }} />{S.abba}</span><span><span className="sw" style={{ background: "var(--yeh)" }} />{S.yehuda}</span></span></div>
        <div className="cs">{S.cumSub(range)}</div>
        <LineChart perakim={perakim} fromISO={fromISO} lang={lang} />
      </div>

      <div className="scard">
        <div className="ch"><span className="t">{S.perSeder}</span></div>
        <div className="cs">{S.perSederSub}</div>
        <div className="sbreak">
          {groups.map(g => (
            <div className="sbrow" key={g.seder}>
              <div className="sbn">{sederName(g.seder, lang)}<span className="tot">{g.total} {S.perakimWord}</span></div>
              <div className="pr"><span className="ini">{S.aInit}</span><span className="track"><i style={{ width: dpct(g.eman, g.total) + "%", background: "var(--abba)" }} /></span><span className="n">{g.eman}/{g.total}</span></div>
              <div className="pr"><span className="ini">{S.yInit}</span><span className="track"><i style={{ width: dpct(g.yehuda, g.total) + "%", background: "var(--yeh)" }} /></span><span className="n">{g.yehuda}/{g.total}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="scard">
        <div className="ch"><span className="t">{S.weekly}</span></div>
        <div className="cs">{S.weeklySub}</div>
        <div className="pace">
          {[["eman", S.abba, week.eman, dEman, "var(--abba)"], ["yehuda", S.yehuda, week.yehuda, dYehuda, "var(--yeh)"]].map(([k, l, n, arr, c]) => (
            <div className="pacecol" key={k}>
              <div className="ph"><span className="sw" style={{ background: c }} />{l}<b>{n}</b></div>
              <div className="pacebars">
                {arr.map((v, i) => (
                  <div className="pb" key={i}>
                    <div className="b" style={{ height: (v / maxDay * 54) + "px", background: v ? c : "var(--bar-empty, #ececec)" }} />
                    <div className="d">{days[i].lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SiyumCalc S={S} lang={lang} data={data} person={person} />
    </div>
  );
}

/* ============================ NOW LEARNING ============================ */
function NowLearningView({ S, lang, groups, data, person, onToggle, onSetCurrent, onNextToggle, onRead }) {
  const masName = window.masName, sederName = window.sederName, PCOL = window.PCOL;
  const DIcon = window.DIcon, DP = window.DP;

  const findMasechta = name => {
    for (const g of groups) {
      const m = g.masechtot.find(x => x.masechta === name);
      if (m) return { g, m };
    }
    return null;
  };
  const masCol = name => {
    const f = findMasechta(name);
    return f ? window.sederColor(window.SEDER_ORDER.indexOf(f.g.seder)) : null;
  };

  const people = [
    { key: "eman", label: S.abba, initial: lang === "he" ? "א" : "A" },
    { key: "yehuda", label: S.yehuda, initial: lang === "he" ? "י" : "Y" },
  ];

  return (
    <div className="nowview">
      {people.map(pp => {
        const isActive = pp.key === person;
        const name = data.current ? data.current[pp.key] : null;
        const found = name ? findMasechta(name) : null;
        const col = found ? window.sederColor(window.SEDER_ORDER.indexOf(found.g.seder)) : null;
        const doneCount = found ? found.m.perakim.filter(p => p[pp.key + "_done"]).length : 0;
        const Tile = isActive ? "button" : "div";
        const nextList = (data.next && data.next[pp.key]) || [];

        return (
          <div className="nowcard" key={pp.key}>
            <div className="nowhead">
              <span className="av" style={{ background: PCOL[pp.key].c }}>{pp.initial}</span>
              <span className="nm">{pp.label}</span>
              {isActive && found && (
                <button className="nowclear" onClick={() => onSetCurrent(null)}>{S.unpinCurrent}</button>
              )}
            </div>

            {!found ? (
              <div className="nowempty">{S.noCurrent} {isActive && S.noCurrentHint}</div>
            ) : (
              <>
                <div className="unit" style={{ background: col.c, color: col.on }}>
                  <span className="info">
                    <span className="k">{window.SEDER_EMOJI[found.g.seder] || ""} {sederName(found.g.seder, lang)}</span>
                    <span className="m">{window.MAS_EMOJI[found.m.masechta] || ""} {masName(found.m.masechta, lang)}</span>
                  </span>
                  <span className={"crown" + (doneCount === found.m.perakim.length ? " full" : "")}>
                    <DIcon d={DP.crown} w={16} fill />{doneCount}/{found.m.perakim.length}
                  </span>
                  <button className="nowread" title={S.read} onClick={() => onRead(found.m.perakim[0])}>
                    <DIcon d={DP.book} w={16} s={2.4} />
                  </button>
                </div>
                <div className="mtiles">
                  {found.m.perakim.map(p => {
                    const done = p[pp.key + "_done"];
                    return (
                      <Tile key={p.perek_id} className={"mtile" + (done ? " done" : "")}
                        style={done ? { background: col.c, color: col.on, boxShadow: "0 3px 0 " + col.d } : null}
                        onClick={isActive ? () => onToggle(p) : undefined}>{p.perek_num}</Tile>
                    );
                  })}
                </div>
              </>
            )}

            <div className="nextsec">
              <div className="nexthead">{S.nextUp}</div>
              {nextList.length === 0 ? (
                <div className="nextempty">{S.noNext} {isActive && S.noNextHint}</div>
              ) : (
                <ol className="nextlist">
                  {nextList.map((nm, i) => {
                    const nc = masCol(nm);
                    const f = findMasechta(nm);
                    const nd = f ? f.m.perakim.filter(p => p[pp.key + "_done"]).length : 0;
                    const nt = f ? f.m.perakim.length : 0;
                    return (
                      <li className="nextrow" key={nm}>
                        <span className="nnum" style={{ background: nc ? nc.c : "var(--ink-3)", color: nc ? nc.on : "#fff" }}>{i + 1}</span>
                        <span className="nnm">{window.MAS_EMOJI[nm] || ""} {masName(nm, lang)}</span>
                        <span className="nct">{nd}/{nt}</span>
                        {f && <button className="nread" title={S.read} onClick={() => onRead(f.m.perakim[0])}>
                          <DIcon d={DP.book} w={15} s={2.4} />
                        </button>}
                        {isActive && <button className="nremove" title={S.removeNext} onClick={() => onNextToggle(nm)}>✕</button>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {!isActive && <div className="nowhint">{S.switchToEdit(pp.label)}</div>}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { SearchView, StatsView, NowLearningView, SiyumCalc, remainingMishnayot });
