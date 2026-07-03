/* Shas Tracker v2 — WEB shell: full-width 3-column desktop layout (sidebar / path / stats rail) */

function WebApp() {
  const A = window.useShasApp();
  const { tw, setTweak, lang, S, rtl, switchLang, data, view, setPersistView, person, setPersistPerson,
    range, setRange, search, setSearch, status, setStatus, sederFilter, setSederFilter,
    cele, setCele, toast, collapsedSed, collapsedMas, toggleSeder, toggleMasechta,
    groups, total, emanTot, yehudaTot, personTotal, onToggle, chestTap, acc, PCOL,
    authOpen, authError, submitWriteKey, closeAuthGate, requestSetCurrent,
    readerPerek, openReader, closeReader, readerNav } = A;
  const pct = window.pct;

  const shellStyle = { "--acc": acc.c, "--acc-d": acc.d };

  if (!data) return (
    <div className="duoweb" style={shellStyle} dir={rtl ? "rtl" : "ltr"}>
      <div className="loading">{S.loading}</div>
    </div>
  );

  const viewTitle = view === "path" ? S.navPath : view === "stats" ? S.navStats : view === "search" ? S.navSearch : S.navNow;
  const NAVS = [["path", S.navPath, window.DP.flag], ["stats", S.navStats, window.DP.chart], ["search", S.navSearch, window.DP.search], ["now", S.navNow, window.DP.pin]];

  return (
    <div className="duoweb" style={shellStyle} dir={rtl ? "rtl" : "ltr"}>
      <aside className="websidebar">
        <div className="brand">
          <div className="mark"><window.DIcon d={window.DP.book} w={24} s={2.2} /></div>
          <div><div className="bt">{S.title}</div><div className="bs">{S.subtitle(total)}</div></div>
        </div>

        <nav className="webnav">
          {NAVS.map(([k, label, ic]) => (
            <button key={k} className={"webnavbtn" + (view === k ? " on" : "")} onClick={() => setPersistView(k)}>
              <span className="ic"><window.DIcon d={ic} w={24} s={2.3} /></span><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="webpersons">
          {[["eman", S.abba, emanTot, "A", "abba"], ["yehuda", S.yehuda, yehudaTot, "Y", "yeh"]].map(([k, label, tot, ini, cls]) => (
            <button key={k} className={"webpbtn " + cls + (person === k ? " on" : "")} onClick={() => setPersistPerson(k)}>
              <span className="av" style={{ background: PCOL[k].c }}>{lang === "he" ? (k === "eman" ? "א" : "י") : ini}</span>
              <span className="meta"><b>{label}</b><i>{tot} · {pct(tot, total)}%</i></span>
            </button>
          ))}
        </div>
      </aside>

      <main className="webcenter">
        <div className="webcenterhead">
          <h1>{viewTitle}</h1>
          {/* compact person + language controls — the sidebar/rail are hidden on mobile */}
          <div className="mobilectl">
            {[["eman", "A", "א"], ["yehuda", "Y", "י"]].map(([k, en, he]) => (
              <button key={k} className={"mpbtn" + (person === k ? " on" : "")}
                style={{ background: PCOL[k].c, "--pc": PCOL[k].c }}
                onClick={() => setPersistPerson(k)} aria-label={k === "eman" ? S.abba : S.yehuda}>
                {lang === "he" ? he : en}
              </button>
            ))}
            <span className="flagtoggle">
              <button className={lang === "en" ? "on" : ""} onClick={() => switchLang("en")}>EN</button>
              <button className={lang === "he" ? "on" : ""} onClick={() => switchLang("he")}>עב</button>
            </span>
          </div>
        </div>
        <div className="webscroll">
          {view === "path" && <window.PathView S={S} lang={lang} groups={groups} person={person} onToggle={onToggle} onRead={openReader} chestTap={chestTap} nums={tw.nodeNumbers}
            collapsedSed={collapsedSed} collapsedMas={collapsedMas} toggleSeder={toggleSeder} toggleMasechta={toggleMasechta} />}
          {view === "stats" && <window.StatsView S={S} lang={lang} data={data} range={range} setRange={setRange} groups={groups} total={total} />}
          {view === "search" && <window.SearchView S={S} lang={lang} groups={groups} person={person} onToggle={onToggle} onRead={openReader}
            search={search} setSearch={setSearch} status={status} setStatus={setStatus} sederFilter={sederFilter} setSederFilter={setSederFilter}
            data={data} onSetCurrent={requestSetCurrent} />}
          {view === "now" && <window.NowLearningView S={S} lang={lang} groups={groups} data={data} person={person} onToggle={onToggle} onSetCurrent={requestSetCurrent} onRead={openReader} />}
        </div>
      </main>

      <aside className="webrail">
        <div className="railcard">
          <div className="rh">{S.title}</div>
          <div className="railcrown">
            <span className="ic"><window.DIcon d={window.DP.crown} w={24} fill /></span>
            <div><div className="v">{personTotal}</div><div className="l">{lang === "he" ? (person === "eman" ? S.abba : S.yehuda) : (person === "eman" ? S.abba : S.yehuda)} · {pct(personTotal, total)}%</div></div>
          </div>
        </div>

        <div className="railcard">
          <div className="rh">{S.together}</div>
          <div className="railprog">
            <div className="railprogrow">
              <div className="t">{S.abba}<b>{emanTot}/{total}</b></div>
              <div className="track"><i style={{ width: pct(emanTot, total) + "%", background: "var(--abba)" }} /></div>
            </div>
            <div className="railprogrow">
              <div className="t">{S.yehuda}<b>{yehudaTot}/{total}</b></div>
              <div className="track"><i style={{ width: pct(yehudaTot, total) + "%", background: "var(--yeh)" }} /></div>
            </div>
          </div>
        </div>

        <div className="railcard">
          <div className="rh">Language</div>
          <div className="raillang">
            <button className={lang === "en" ? "on" : ""} onClick={() => switchLang("en")}>English</button>
            <button className={lang === "he" ? "on" : ""} onClick={() => switchLang("he")}>עברית</button>
          </div>
        </div>
      </aside>

      <nav className="webmobilenav">
        {NAVS.map(([k, label, ic]) => (
          <button key={k} className={"wmnbtn" + (view === k ? " on" : "")} onClick={() => setPersistView(k)}>
            <span className="ic"><window.DIcon d={ic} w={22} s={2.3} /></span>
            <span className="lb">{label}</span>
          </button>
        ))}
      </nav>

      <window.ReaderModal S={S} lang={lang} rtl={rtl} reader={readerPerek} person={person}
        onClose={closeReader} onNav={readerNav} onToggle={onToggle} />
      <window.Celebration cele={cele} onClose={() => setCele(null)} />
      <window.AuthGate open={authOpen} error={authError} onSubmit={submitWriteKey} onCancel={closeAuthGate} S={S} />
      <div className={"toast" + (toast ? " show" : "")}>{toast}</div>

      <window.TweaksPanel>
        <window.TweakSection label="Display" />
        <window.TweakToggle label="Perek numbers" value={tw.nodeNumbers} onChange={v => setTweak("nodeNumbers", v)} />
        <window.TweakToggle label="Celebrations" value={tw.celebrations} onChange={v => setTweak("celebrations", v)} />
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<WebApp />);
