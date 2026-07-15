/* Generates data/shas-seed.csv — the 525-row source-of-truth seed for the Google Sheet.
 *
 * Columns match what the Apps Script doGet returns and the frontend expects:
 *   seder, masechta, perek_num, perek_id, eman_done, eman_date, yehuda_done, yehuda_date,
 *   eman_mishnayos, yehuda_mishnayos
 *
 * The mishnayos columns hold each person's learned mishna numbers ("1,3,4") for
 * perakim in progress; they're seeded blank — a done perek already implies every
 * mishna is learned, so completed masechtos need no list.
 *
 * The Seder → [masechta, perek count] map is identical to shas.js (525 perakim total),
 * so perek_id values line up exactly with what the frontend writes back via doPost.
 *
 * Run:  node scripts/generate-seed-csv.mjs
 */
import { writeFileSync } from "node:fs";

// seder → [masechta, perek count]   (525 perakim total)
const SEDARIM = [
  ["Zeraim", [["Berachot", 9], ["Peah", 8], ["Demai", 7], ["Kilayim", 9], ["Sheviit", 10],
    ["Terumot", 11], ["Maasrot", 5], ["Maaser Sheni", 5], ["Challah", 4], ["Orlah", 3], ["Bikkurim", 4]]],
  ["Moed", [["Shabbat", 24], ["Eruvin", 10], ["Pesachim", 10], ["Shekalim", 8], ["Yoma", 8],
    ["Sukkah", 5], ["Beitzah", 5], ["Rosh Hashanah", 4], ["Taanit", 4], ["Megillah", 4],
    ["Moed Katan", 3], ["Chagigah", 3]]],
  ["Nashim", [["Yevamot", 16], ["Ketubot", 13], ["Nedarim", 11], ["Nazir", 9], ["Sotah", 9],
    ["Gittin", 9], ["Kiddushin", 4]]],
  ["Nezikin", [["Bava Kamma", 10], ["Bava Metzia", 10], ["Bava Batra", 10], ["Sanhedrin", 11],
    ["Makkot", 3], ["Shevuot", 8], ["Eduyot", 8], ["Avodah Zarah", 5], ["Avot", 6], ["Horayot", 3]]],
  ["Kodashim", [["Zevachim", 14], ["Menachot", 13], ["Chullin", 12], ["Bechorot", 9], ["Arachin", 9],
    ["Temurah", 7], ["Keritot", 6], ["Meilah", 6], ["Tamid", 7], ["Middot", 5], ["Kinnim", 3]]],
  ["Taharot", [["Keilim", 30], ["Ohalot", 18], ["Negaim", 14], ["Parah", 12], ["Taharot", 10],
    ["Mikvaot", 10], ["Niddah", 10], ["Machshirin", 6], ["Zavim", 5], ["Tevul Yom", 4],
    ["Yadayim", 4], ["Uktzin", 3]]],
];

// Eman's already-completed masechtot (seeded done). Dates left blank — real completion
// dates are unknown; marking from the dashboard going forward will date new completions,
// and these can be backfilled in the Sheet at any time.
const EMAN_DONE_MASECHTOT = new Set(["Pesachim", "Sukkah", "Avot", "Sanhedrin", "Makkot"]);
// Yehuda has no seeded progress yet.
const YEHUDA_DONE_MASECHTOT = new Set();

const header = ["seder", "masechta", "perek_num", "perek_id", "eman_done", "eman_date", "yehuda_done", "yehuda_date", "eman_mishnayos", "yehuda_mishnayos"];
const rows = [header.join(",")];
let total = 0, emanDone = 0, yehudaDone = 0;

for (const [seder, masechtot] of SEDARIM) {
  for (const [masechta, count] of masechtot) {
    for (let n = 1; n <= count; n++) {
      const eman = EMAN_DONE_MASECHTOT.has(masechta);
      const yehuda = YEHUDA_DONE_MASECHTOT.has(masechta);
      if (eman) emanDone++;
      if (yehuda) yehudaDone++;
      total++;
      rows.push([
        seder, masechta, n, `${seder}.${masechta}.${n}`,
        eman ? "TRUE" : "FALSE", "",
        yehuda ? "TRUE" : "FALSE", "",
        "", "",
      ].join(","));
    }
  }
}

if (total !== 525) throw new Error(`Expected 525 perakim, got ${total}`);
writeFileSync(new URL("../data/shas-seed.csv", import.meta.url), rows.join("\n") + "\n");
console.log(`Wrote data/shas-seed.csv — ${total} perakim (Eman ${emanDone} done, Yehuda ${yehudaDone} done).`);
