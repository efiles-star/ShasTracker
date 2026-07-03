# Backend — Google Sheet + Apps Script

The Sheet is the source of truth; the Apps Script web app is the free API layer the
frontend reads and writes (`doGet` / `doPost`). This clones the Shabbat website's pattern.

## 1. Create the Sheet

1. New Google Sheet in Eman's Drive → name it e.g. **Shas Tracker**.
2. Rename the first tab to **`Shas`** (the script's `SHEET_NAME`; change the constant if you use another name).
3. **File → Import → Upload** [`../data/shas-seed.csv`](../data/shas-seed.csv) →
   **Import location: "Replace current sheet"**, **Separator: comma** → Import.
   You now have a header row + **525 perek rows**, with Eman's completed masechtos
   (Pesachim, Sukkah, Avos, Sanhedrin, Makkos) already marked `TRUE`.

The columns are: `seder`, `masechta`, `perek_num`, `perek_id`, `eman_done`, `eman_date`,
`yehuda_done`, `yehuda_date`. The script looks columns up **by header name**, so you can
reorder them, but don't rename them.

> **Dates:** seeded completions are left blank (real dates unknown). New marks made from
> the dashboard auto-fill today's date; you can also backfill real dates in the Sheet.

## 2. Add the script

1. In the Sheet: **Extensions → Apps Script**.
2. Replace the default `Code.gs` contents with [`Code.gs`](Code.gs). Save.

## 3. Deploy as a web app

1. **Deploy → New deployment** → gear icon → **Web app**.
2. **Execute as:** Me. **Who has access:** **Anyone**.
3. **Deploy**, authorize when prompted, and copy the **Web app URL** (ends in `/exec`).

> Re-deploying: after editing the script, use **Deploy → Manage deployments → edit →
> Version: New version** so the live `/exec` URL picks up your changes.

## 4. Wire the frontend

In [`../duo_core.jsx`](../duo_core.jsx) replace:

```js
const SCRIPT_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with your `/exec` URL, commit, and push to `main`. The app flips from the bundled mock
dataset to live read/write automatically (`USE_MOCK` is false once the URL no longer
starts with `PASTE_`).

## Contract (what the frontend expects)

**`GET`** → `{ perakim: [ { perek_id, seder, masechta, perek_num, eman_done, eman_date, yehuda_done, yehuda_date } ] }`

**`POST`** body `{ perek_id, person: "eman"|"yehuda", done: boolean, date: "YYYY-MM-DD"|null }` → `{ ok: true }`

The frontend posts `Content-Type: text/plain` on purpose so the browser sends no CORS
preflight — Apps Script web apps don't answer preflight `OPTIONS`. Writes are serialized
with a script lock; concurrent edits are last-write-wins (accepted at two users).

## Quick test

- Open the `/exec` URL in a browser → should return the JSON board.
- In the Apps Script editor, run `doGet` once to trigger the authorization prompt.
