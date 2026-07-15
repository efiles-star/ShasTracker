# Mishnah Shas Tracker — PRD
**Date:** 2026-06-29
**Scope bucket:** Personal
**Source:** Grill / brainstorm session

---

## TL;DR
A public, editable, hosted dashboard that maps all of Shas at perek granularity (525 perakim) and tracks two independent journeys — Eman and Yehuda — toward finishing the entire Mishnah. A Google Sheet is the source of truth; an Apps Script web app reads and writes it (`doGet` / `doPost`); a hosted React frontend is the tappable visual map. Architecture reuses the existing Shabbat website's editable-Sheet pattern — a clone of a proven build, not an invention.

---

## Problem
Eman is learning Mishnah masechta-by-masechta (non-sequentially) toward finishing all of Shas, but has no single place to see position across 525 perakim, mark progress in the moment, and watch the map fill in. He also wants Yehuda's parallel, independent progress visible on the same surface.

---

## Success criteria
- Opening the hosted URL shows, in one screen: all of Shas grouped by Seder, perakim done vs. total, and % complete — for both people.
- Tapping a perek marks it done **with a date**, and it persists to the Sheet.
- At 90 days: progress is marked entirely from the dashboard (the spreadsheet is never opened directly), and the analytics view reflects real weekly pace.

---

## Scope (v1)
- ~525-row wide-format Sheet (one row per perek) as source of truth.
- Each perek tracked **per person** with done/not-done **+ completion date**.
- Hosted React dashboard with two views: **Map** and **Analytics**.
- Tap-to-mark with write-back via Apps Script `doPost`.
- Four map filters (Person, Seder, Status, Search).
- Public web app, no login.

---

## Non-goals (deliberately out)
- Per-mishnah granularity (future drill-down only).
- Any login / auth / private data.
- "What's next" scheduling (learning is non-sequential — a scheduler would be wrong).
- Zapier and the Zapier MCP (wrong tools for a browser reading/writing a Sheet).
- Sharing beyond the two people / whole-shiur multi-user.
- Colors, fonts, visual styling — **owned by Eman's existing design system, out of scope for this PRD.**

---

## Constraints
- Apps Script writes are **last-write-wins** — acceptable at two users, not a true multi-user DB.
- Public + editable + no login = anyone with the URL can mark perakim. **Accepted.**
- Must **reuse the Shabbat website's `doGet`/`doPost` pattern** rather than build fresh.

---

# ⭐ ARCHITECTURE (special callout)

## Data flow
```
Google Sheet  ──doGet (JSON)──▶  Apps Script Web App  ──fetch──▶  React Frontend (hosted)
    ▲                                                                      │
    └──────────────────  doPost (mark perek + date)  ◀────── tap ─────────┘
```

- **Google Sheet** = source of truth. Owned forever, in Eman's Drive.
- **Apps Script Web App** = the free, private-capable API layer. Deployed as "anyone can access."
  - `doGet` → returns the full 525-perek dataset as JSON on page load.
  - `doPost` → writes a single cell (person × perek) with status + today's date.
- **React Frontend** = hosted on Vercel or GitHub Pages. Bookmarkable on phone. The only surface Eman touches daily.

## Data model — the Sheet (wide format)
One row per perek, **525 rows**. Columns:

| Column | Example | Notes |
|---|---|---|
| `seder` | Moed | One of 6 |
| `masechta` | Sukkah | One of 63 |
| `perek_num` | 3 | Chapter number within masechta |
| `perek_id` | Moed.Sukkah.3 | Stable unique key for writes |
| `eman_done` | TRUE / FALSE | |
| `eman_date` | 2026-06-29 | Date Eman marked it |
| `yehuda_done` | TRUE / FALSE | |
| `yehuda_date` | 2026-06-14 | Date Yehuda marked it |

- **No login, no user table.** Two fixed people = two fixed column pairs.
- `perek_id` is the write key — `doPost` targets `(perek_id, person)`.
- Perek counts are **undisputed** at chapter level (6 Sedarim / 63 masechtot / 525 perakim), so the dataset is objectively correct with no counting-method choice to make.

## State / sync behavior
- On load: single `doGet`, hydrate the whole board.
- On tap: optimistic UI (tile fills immediately), then `doPost`; on failure, revert the tile and surface a small error toast.
- No real-time multi-user sync needed — at two learners, collisions are effectively nil (last-write-wins accepted).

---

# ⭐ SCREENS & UX (special callout)

The app is **two views inside one hosted page**, switched by a top-level toggle. No deep navigation, no routing complexity.

## View 1 — MAP (the daily driver)

**Purpose:** see all of Shas at once and tap to mark progress.

**Structure (top to bottom):**
1. **Header bar**
   - Overall completion ("X of 525 perakim").
   - **Per-Seder progress indicators** — six small completion meters, one per Seder, each showing that Seder's % done.
   - View toggle: **Map | Analytics**.
2. **Filter bar** (see filters section).
3. **The mosaic** — the hero element.
   - **6 Seder sections**, each a labeled block: Zeraim, Moed, Nashim, Nezikin, Kodashim, Taharot.
   - Within each Seder, **masechtot as labeled sub-clusters**.
   - Within each masechta, **one small tile per perek**.
   - **525 tiles total**, all part of one continuous picture.
   - Empty tile = not learned. Filled tile = learned.

**Two-person rendering on a single map:**
- **Primary design — diagonal split tile:** each perek tile is split on the diagonal — one corner = Eman, the other = Yehuda. Both done → fully filled. One done → half-filled toward that person's corner.
- **Fallback if 525 split-tiles read as too busy — Person toggle:** Eman / Yehuda / Both-overlay. (Decision deferred to first render — see parking lot.)

**Density handling (the key UX safeguard):**
- **Collapsible Seder blocks.** Tap a Seder to expand its masechtot to full, tappable size; other Sedarim collapse to a compact summary.
- This keeps the overview clean and makes individual perek tap targets large enough on a phone. The app never tries to render all 525 tiles full-size and tappable at once on mobile.

**Interaction:**
- Tap a perek tile → marks done for the **active person** (set by the Person filter/toggle) with today's date → tile fills (optimistic) → `doPost` persists.
- Tap again → toggles back to not-done (clears the date for that person).
- Tapping reads as "this person learned this perek today."

## View 2 — ANALYTICS

**Purpose:** see pace and momentum over time. Pure rollups of the date + person data — nearly free to build.

**Structure:**
- **Completions over time** — line chart, one line per person, X = date, Y = cumulative perakim done.
- **Per-Seder breakdown** — bars showing done vs. remaining per Seder, per person.
- **Weekly pace** — perakim completed in the last 7 days, per person.
- **Headline stats** — "X of 525 done," "Y remaining," est. pace.

**Note:** date-range scoping lives **here**, not on the Map. The Map stays uncluttered; time-based analysis stays in Analytics.

---

# ⭐ FILTERS (special callout)

All filters live on the **Map** view filter bar. Kept deliberately minimal.

| Filter | Options | Purpose |
|---|---|---|
| **Person** | Eman / Yehuda / Both | Core view switch; also sets the **active person** that taps apply to |
| **Seder** | All / single Seder | Zoom into the Seder currently being pushed |
| **Status** | All / Done / Remaining | "Show me only what's left" — the motivating view |
| **Search masechta** | text input | Jump straight to a masechta (e.g. Sukkah) without hunting |

**Explicitly excluded from v1 filters:** date range (belongs in Analytics), per-mishnah filtering (out of scope), tags/labels (none exist).

---

## Plan — smallest version first
1. **Build the data.** Generate the 525-row Sheet (seder / masechta / perek_num / perek_id + the four person columns). **Seed** with Eman's completed masechtot: Pesachim, Sukkah, Avot, Sanhedrin, Makkot.
2. **Stand up the Apps Script web app** — clone the Shabbat pattern: `doGet` → JSON, `doPost` → mark `(perek_id, person)` + date.
3. **Build the read-only Map first.** Verify all 525 perakim render correctly, grouped right, from live data — before adding any writes.
4. **Add tap-to-mark** (`doPost`) with optimistic UI + failure revert. Confirm persistence.
5. **Add the Analytics view** (rollups).
6. **Add filters** (Person, Seder, Status, Search) + collapsible Seder blocks.
7. **Host** (Vercel / GitHub Pages), bookmark on phone.

Steps 1–3 are the proof. If the Map renders Shas correctly from live data, the rest is additive.

---

## Open questions / parking lot
| Question | What would resolve it | Owner |
|---|---|---|
| Exact `doGet`/`doPost` shape to clone | Eman shares the Shabbat site Apps Script | Eman |
| Diagonal-split tiles vs. Person-toggle for v1 | Judge at first render with real density | Eman + Claude |
| Map layout proportions (Seder columns vs. tiled blocks) | First render | Eman + Claude |
| Collapsed-Seder default state (all collapsed? current-Seder expanded?) | First usage on phone | Eman |

---

## Future ideas (v2+)
- Per-mishnah drill-down inside a perek (tap a perek → see its mishnayot).
- Conversational write-back via Zapier MCP ("Claude, mark Makkot done") — its correct use.
- Streaks, weekly pace goals, daily learning reminder (Telegram, matching existing tooling).
- Open to the shiur (requires revisiting the last-write-wins limit and the public-write exposure).

---

## Potential blind spot
The risk is not the build — it's that **the 525-row dataset is tedious to get exactly right, and that's where this stalls.** Correct masechta + perek labels across all 63 tractates is the unglamorous 80%. If even one masechta is short a perek or mislabeled, the mosaic looks broken and trust in the tool collapses. The React Map is the fun 20% that invites jumping ahead. If this project dies, it dies in the spreadsheet, not the frontend — so the data must be generated carefully and **verified against a known source before any frontend work begins.**
