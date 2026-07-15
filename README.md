# Shas Tracker

A public, editable, hosted dashboard that maps **all of Shas at perek granularity
(525 perakim)** and tracks two independent journeys — **Abba (Eman)** and **Yehuda** —
toward finishing the entire Mishnah.

Built as a "Duolingo-style" learning trail: 6 Sedarim → 63 masechtot → 525 perek
nodes you tap to mark done. A Google Sheet is the source of truth; an Apps Script
web app reads and writes it (`doGet` / `doPost`); this hosted React frontend is the
tappable visual map.

See [`docs/Mishnah-Shas-Tracker-PRD.md`](docs/Mishnah-Shas-Tracker-PRD.md) for the full spec.

## What's here

| File | Purpose |
|------|---------|
| `index.html` | Entry point — the v2 **Web** shell (3-column desktop layout). |
| `Shas Tracker v2 Web.html` | Original design-named copy of the entry (identical to `index.html`). |
| `duo.css` | All styling — the Duolingo-style trail, cards, charts, celebrations. |
| `eman.css` | The **EmanOS** theme — a minimal cream/ink/steel-blue skin (Stats + Search only), incl. dark mode. Switched from the Theme card in the right rail. |
| `shas.js` | Full 525-perek dataset + Hebrew names. Mirrors the live Apps Script GET shape; used until `SCRIPT_URL` is wired. |
| `duo_core.jsx` | Shared state hook, i18n (English / עברית), and the `doGet`/`doPost` API layer. |
| `duo_path.jsx` | Icons, Seder colors, the winding **Path** view, and celebration modal. |
| `duo_reader.jsx` | Live Mishnah **reader** — fetches perek text (Hebrew + English) from the Sefaria API. |
| `duo_stats.jsx` | **Stats** view (cumulative line chart, per-Seder bars, weekly pace) + **Search** view. |
| `duo_app_web.jsx` | The web shell that wires the three views together. |
| `tweaks-panel.jsx` | Design-tool scaffold; dormant in production. |

Three views, switched from the left nav:

- **Path** — the daily driver. Tap a perek to open its **mishnayos sheet**: every
  mishna in the perek is a tappable sub-task, plus a "Mark whole perek" button
  (optimistic UI, writes back via `doPost`). Marking the whole perek marks all its
  mishnayos; marking the last remaining mishna auto-completes the perek; unmarking
  the perek clears its mishnayos, and unmarking one mishna reopens a completed perek
  — the two levels always stay in sync. In-progress perakim show a partial-progress
  ring on the node. Perek, whole-masechta and whole-Seder completions celebrate.
- **Stats** — pace and momentum: headline KPIs, cumulative-over-time chart per person,
  per-Seder breakdown, last-7-days pace. Date-range scoping (30 / 90 / all) lives here.
- **Search** — jump to a masechta, filter by Seder and by status (All / Left / Done),
  and mark perakim from a compact tile grid.

Every perek can also be **read live in the app**: the small book button beside each
Path node (and on each Search card) opens a reader that pulls the perek's mishnayot —
Hebrew source and English translation — straight from the free
[Sefaria v3 texts API](https://developers.sefaria.org/reference/get-v3-texts).
No API key and no backend: the browser fetches Sefaria directly, caches each perek in
`localStorage`, and the reader pages through all of Shas with prev/next arrows. A
"Mark learned" button inside the reader ties reading back into tracking.

Everything is per person, and the active person (Abba / Yehuda) is picked in the left
sidebar — taps apply to that person.

## Data model

The dataset is verified against the standard Mishnah counts: **6 Sedarim, 63 masechtot,
525 perakim, 4,192 mishnayot** (Zeraim 75 · Moed 88 · Nashim 71 · Nezikin 74 ·
Kodashim 91 · Taharot 126 perakim). Each perek carries a stable `perek_id` (e.g.
`Moed.Sukkah.3`) plus done/date and a learned-mishnayos list for each person — the
same wide-format shape as the Google Sheet. Mishnayos-per-perek counts follow the
standard printed (Vilna) division as published on Sefaria and are bundled in `shas.js`
(`MISHNAYOS`, exposed as `MISHNA_COUNTS`); the reader and Siyum calculator use them as
the primary shape source (falling back to Sefaria's shape API for anything missing).
A perek marked done implies all of its mishnayos, so the stored list only matters
for perakim in progress.

Names are displayed in modern Sephardi transliteration (Avot, Shabbat, Berachot). The
live Google Sheet may still carry the original Ashkenazi spellings (Avos, Shabbos,
Berachos) in its `seder`/`masechta` columns and inside `perek_id`s — the frontend
normalizes those to the Sephardi names at read time (`MAS_CANON` / `SEDER_CANON` in
`shas.js`) and keeps writing back by the original `perek_id`, so **no Sheet migration
is needed**. `shas.js` also maps each masechta to its Sefaria index title
(`MAS_SEFARIA`) for the reader.

## Running locally

The page loads React + Babel from a CDN and fetches the `.jsx` files at runtime, so it
must be served over HTTP (not opened as a `file://` URL):

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

## Going live (GitHub Pages)

A workflow at `.github/workflows/pages.yml` publishes the repo root on every push to
`main`. **One-time setup:** repo **Settings → Pages → Build and deployment → Source →
"GitHub Actions"**. After that, each push to `main` deploys automatically.

## Wiring the live Google Sheet

Out of the box the app runs on the bundled mock dataset (`shas.js`) so the map renders
complete immediately. To connect the real Sheet, open `duo_core.jsx` and replace:

```js
const SCRIPT_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with your deployed Apps Script web-app URL. The frontend never hardcodes counts — it
renders whatever `doGet` returns and writes single `(perek_id, person)` cells via `doPost`.
