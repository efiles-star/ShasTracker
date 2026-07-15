# Backend — Google Sheet + Apps Script

The Sheet is the source of truth; the Apps Script web app is the free API layer the
frontend reads and writes (`doGet` / `doPost`). This clones the Shabbat website's pattern.

## 1. Create the Sheet

1. New Google Sheet in Eman's Drive → name it e.g. **Shas Tracker**.
2. Rename the first tab to **`Shas`** (the script's `SHEET_NAME`; change the constant if you use another name).
3. **File → Import → Upload** [`../data/shas-seed.csv`](../data/shas-seed.csv) →
   **Import location: "Replace current sheet"**, **Separator: comma** → Import.
   You now have a header row + **525 perek rows**, with Eman's completed masechtot
   (Pesachim, Sukkah, Avot, Sanhedrin, Makkot) already marked `TRUE`.

The columns are: `seder`, `masechta`, `perek_num`, `perek_id`, `eman_done`, `eman_date`,
`yehuda_done`, `yehuda_date`. The script looks columns up **by header name**, so you can
reorder them, but don't rename them.

> **Dates:** seeded completions are left blank (real dates unknown). New marks made from
> the dashboard auto-fill today's date; you can also backfill real dates in the Sheet.

> **Naming:** the seed CSV now uses modern Sephardi transliteration (Avot, Shabbat,
> Berachot). If your live Sheet was seeded from the older Ashkenazi-spelled CSV
> (Avos, Shabbos, Berachos), **leave it alone** — the frontend normalizes those
> spellings at read time and keeps writing by the original `perek_id`, so everything
> works without touching the Sheet. Only a *fresh* Sheet should import this CSV;
> re-importing over a live one would wipe recorded progress.

## 2. Add the script

1. In the Sheet: **Extensions → Apps Script**.
2. Replace the default `Code.gs` contents with [`Code.gs`](Code.gs). Save.

## 3. Deploy as a web app

1. **Deploy → New deployment** → gear icon → **Web app**.
2. **Execute as:** Me. **Who has access:** **Anyone**.
3. **Deploy**, authorize when prompted, and copy the **Web app URL** (ends in `/exec`).

> Re-deploying: after editing the script, use **Deploy → Manage deployments → edit →
> Version: New version** so the live `/exec` URL picks up your changes. **You can
> automate this entire step** — see [Automating updates with clasp](#automating-updates-with-clasp)
> below so a `git push` deploys `Code.gs` for you.

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

## Automating updates with clasp

`Code.gs` in this repo is the source of truth, but the copy that actually runs
lives inside the Sheet's Apps Script project. Instead of hand-copying the file
into the editor and clicking through **Manage deployments** after every change,
use [**clasp**](https://github.com/google/clasp) — Google's official Apps Script
CLI — to push (and deploy) it. Two ways to run it: locally on demand, or
automatically from GitHub Actions on every push.

The repo is already wired for both:

| File | Role |
|------|------|
| `apps-script/appsscript.json` | The project **manifest** clasp requires. Sets V8 runtime and the web-app config (execute as **me**, access **anyone**). Adjust `timeZone` to yours. |
| `.clasp.json.example` | Template pointing clasp at your project. Copy to `.clasp.json` (git-ignored) and fill in your **Script ID**. |
| `.claspignore` | Limits pushes to `appsscript.json` + `Code.gs` — this README never goes to the live project. |
| `package.json` | Pins clasp and adds `npm run push` / `pull` / `deploy` shortcuts. |
| `.github/workflows/apps-script-deploy.yml` | CI that pushes + deploys on every push to `main` touching `apps-script/`. |

### One-time prerequisites

1. **Enable the Apps Script API** for your Google account (once):
   <https://script.google.com/home/usersettings> → turn **Google Apps Script API** on.
2. Grab your **Script ID**: Apps Script editor → **Project Settings** → copy **Script ID**.

### Option A — push from your machine

```bash
npm install                      # installs clasp locally (see package.json)
npx clasp login                  # opens a browser; authorizes clasp (writes ~/.clasprc.json)
cp .clasp.json.example .clasp.json   # then paste your Script ID into it
npx clasp push                   # uploads apps-script/Code.gs to the project
```

To also refresh the live `/exec` URL in one step, update your web-app deployment
by id (find it with `npx clasp deployments`):

```bash
npx clasp deploy --deploymentId <DEPLOYMENT_ID> --description "manual"
```

> First time only: if the project already has a manifest/timezone you want to
> keep, run `npx clasp pull` once to reconcile `appsscript.json` before your
> first push.

### Option B — deploy automatically on every push (GitHub Actions)

The `Deploy Apps Script` workflow runs `clasp push` (and optionally a deploy)
whenever you push a change under `apps-script/` to `main`. Add these repo
**secrets** (Settings → Secrets and variables → Actions):

| Secret | Required | Value |
|--------|----------|-------|
| `CLASP_CREDENTIALS` | ✅ | The full contents of your local `~/.clasprc.json` after `clasp login`. |
| `SCRIPT_ID` | ✅ | Your Apps Script **Script ID**. |
| `DEPLOYMENT_ID` | optional | The web-app deployment to roll to a new version so the live `/exec` URL updates. From `clasp deployments`. If omitted, CI pushes the code only and you bump the version once in the editor. |

After that, editing `Code.gs` and pushing to `main` updates the backend
automatically — no editor, no manual redeploy. You can also trigger it by hand
from the **Actions** tab (**Run workflow**).

> **Security note:** `CLASP_CREDENTIALS` is a live OAuth token for your Google
> account — keep it only in GitHub Secrets, never in the repo. `.clasp.json` and
> `.clasprc.json` are already git-ignored.

### The MCP alternative

Prefer not to manage clasp tokens? A Google Workspace / Apps Script **MCP
server** can let an AI assistant push `Code.gs` for you over the Apps Script API
instead. It solves the same problem (no manual copy-paste) via a different
transport; clasp is the officially supported, CI-friendly path and is what this
repo is set up for.

## Contract (what the frontend expects)

**`GET`** → `{ perakim: [ { perek_id, seder, masechta, perek_num, eman_done, eman_date, yehuda_done, yehuda_date } ] }`

**`POST`** body `{ perek_id, person: "eman"|"yehuda", done: boolean, date: "YYYY-MM-DD"|null, password: string }` → `{ ok: true }`,
or `{ ok: false, error: "bad password" }` (also returned for a missing/empty `password` field) if it doesn't match the
`WRITE_PASSWORD` script property.

The frontend posts `Content-Type: text/plain` on purpose so the browser sends no CORS
preflight — Apps Script web apps don't answer preflight `OPTIONS`. Writes are serialized
with a script lock; concurrent edits are last-write-wins (accepted at two users).

## Quick test

- Open the `/exec` URL in a browser → should return the JSON board.
- In the Apps Script editor, run `doGet` once to trigger the authorization prompt.
