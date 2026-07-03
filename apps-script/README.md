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
`yehuda_done`, `yehuda_date`, `eman_mishnayos`, `yehuda_mishnayos`. The script looks
columns up **by header name**, so you can reorder them, but don't rename them.

> **Migrating an existing Sheet (adding mishnayos sub-tasks):** no re-seeding needed —
> just add two columns anywhere in the `Shas` tab with the exact headers
> `eman_mishnayos` and `yehuda_mishnayos` (leave every row blank), paste the updated
> [`Code.gs`](Code.gs), and re-deploy (**Deploy → Manage deployments → edit → New
> version**). Each cell holds that person's learned mishna numbers for an in-progress
> perek, e.g. `1,3,4`. A perek with `..._done = TRUE` counts as all mishnayos learned,
> so the list stays blank for completed perakim. The columns are optional — without
> them everything still works, mishna-level progress just isn't saved.

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

## 4. Set the write password

**Reading the board stays public — no login, matching the PRD.** Marking a perek
(`doPost`) requires a password, checked entirely server-side:

1. In the Apps Script editor: **Project Settings** (gear icon, left sidebar).
2. Under **Script Properties → Add script property**:
   - Property: `WRITE_PASSWORD`
   - Value: your password
3. **Save**.

The password lives only in this Script Property — never in `Code.gs`, never in git, and
never in the public frontend source. You can change it any time here with no redeploy
and no site update needed. If it's unset, every write is rejected with
`"server not configured: set the WRITE_PASSWORD script property"`.

The first time anyone taps a perek on the site, a password prompt appears; once entered
correctly it's remembered in that browser (`localStorage`) so they aren't asked again on
that device. A wrong password shows an error and re-prompts; nothing is saved until it's
correct.

## 5. Wire the frontend

In [`../duo_core.jsx`](../duo_core.jsx) replace:

```js
const SCRIPT_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with your `/exec` URL, commit, and push to `main`. The app flips from the bundled mock
dataset to live read/write automatically (`USE_MOCK` is false once the URL no longer
starts with `PASTE_`).

## Contract (what the frontend expects)

**`GET`** → `{ perakim: [ { perek_id, seder, masechta, perek_num, eman_done, eman_date, yehuda_done, yehuda_date, eman_mishnayos, yehuda_mishnayos } ] }`
(`*_mishnayos` are comma-separated learned mishna numbers, `""` when none or when the perek is done)

**`POST`** body `{ perek_id, person: "eman"|"yehuda", done: boolean, date: "YYYY-MM-DD"|null, mishnayos: "1,3,4"|"", password: string }` → `{ ok: true }`,
or `{ ok: false, error: "bad password" }` (also returned for a missing/empty `password` field) if it doesn't match the
`WRITE_PASSWORD` script property.

The frontend posts `Content-Type: text/plain` on purpose so the browser sends no CORS
preflight — Apps Script web apps don't answer preflight `OPTIONS`. Writes are serialized
with a script lock; concurrent edits are last-write-wins (accepted at two users).

## Quick test

- Open the `/exec` URL in a browser → should return the JSON board.
- In the Apps Script editor, run `doGet` once to trigger the authorization prompt.
