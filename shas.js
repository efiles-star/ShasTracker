/* =========================================================================
   Mishnah Shas Tracker — development dataset
   Mirrors the live Apps Script GET response shape exactly:
     { perakim: [ { perek_id, seder, masechta, perek_num,
                    eman_done, eman_date, yehuda_done, yehuda_date,
                    eman_mishnayos, yehuda_mishnayos } ] }
   The full Shas is generated here so the mosaic renders complete while
   SCRIPT_URL is still a placeholder. Swap for the live GET in production —
   the frontend never hardcodes counts, it renders whatever it receives.
   (Exception: mishnayos-per-perek counts live here in MISHNAYOS — they are
   fixed structure, like the Hebrew names, not progress data.)
   ========================================================================= */
(function () {
  // seder → [masechta, perek count]   (525 perakim total)
  const SEDARIM = [
    ["Zeraim", [["Berachos", 9], ["Peah", 8], ["Demai", 7], ["Kilayim", 9], ["Sheviis", 10],
      ["Terumos", 11], ["Maasros", 5], ["Maaser Sheni", 5], ["Challah", 4], ["Orlah", 3], ["Bikkurim", 4]]],
    ["Moed", [["Shabbos", 24], ["Eruvin", 10], ["Pesachim", 10], ["Shekalim", 8], ["Yoma", 8],
      ["Sukkah", 5], ["Beitzah", 5], ["Rosh Hashanah", 4], ["Taanis", 4], ["Megillah", 4],
      ["Moed Katan", 3], ["Chagigah", 3]]],
    ["Nashim", [["Yevamos", 16], ["Kesubos", 13], ["Nedarim", 11], ["Nazir", 9], ["Sotah", 9],
      ["Gittin", 9], ["Kiddushin", 4]]],
    ["Nezikin", [["Bava Kamma", 10], ["Bava Metzia", 10], ["Bava Basra", 10], ["Sanhedrin", 11],
      ["Makkos", 3], ["Shevuos", 8], ["Eduyos", 8], ["Avodah Zarah", 5], ["Avos", 6], ["Horayos", 3]]],
    ["Kodashim", [["Zevachim", 14], ["Menachos", 13], ["Chullin", 12], ["Bechoros", 9], ["Arachin", 9],
      ["Temurah", 7], ["Kerisos", 6], ["Meilah", 6], ["Tamid", 7], ["Middos", 5], ["Kinnim", 3]]],
    ["Taharos", [["Keilim", 30], ["Ohalos", 18], ["Negaim", 14], ["Parah", 12], ["Taharos", 10],
      ["Mikvaos", 10], ["Niddah", 10], ["Machshirin", 6], ["Zavim", 5], ["Tevul Yom", 4],
      ["Yadayim", 4], ["Uktzin", 3]]],
  ];

  const SEDER_ORDER = SEDARIM.map(s => s[0]);

  // masechta → mishnayos per perek (standard printed / Vilna division, as on
  // Sefaria — 4,192 mishnayos total). Index = perek_num - 1.
  const MISHNAYOS = {
    Berachos: [5, 8, 6, 7, 5, 8, 5, 8, 5],
    Peah: [6, 8, 8, 11, 8, 11, 8, 9],
    Demai: [4, 5, 6, 7, 11, 12, 8],
    Kilayim: [9, 11, 7, 9, 8, 9, 8, 6, 10],
    Sheviis: [8, 10, 10, 10, 9, 6, 7, 11, 9, 9],
    Terumos: [10, 6, 9, 13, 9, 6, 7, 12, 7, 12, 10],
    Maasros: [8, 8, 10, 6, 8],
    "Maaser Sheni": [7, 10, 13, 12, 15],
    Challah: [9, 8, 10, 11],
    Orlah: [9, 17, 9],
    Bikkurim: [11, 11, 12, 5],
    Shabbos: [11, 7, 6, 2, 4, 10, 4, 7, 7, 6, 6, 6, 7, 4, 3, 8, 8, 3, 6, 5, 3, 6, 5, 5],
    Eruvin: [10, 6, 9, 11, 9, 10, 11, 11, 4, 15],
    Pesachim: [7, 8, 8, 9, 10, 6, 13, 8, 11, 9],
    Shekalim: [7, 5, 4, 9, 6, 6, 7, 8],
    Yoma: [8, 7, 11, 6, 7, 8, 5, 9],
    Sukkah: [11, 9, 15, 10, 8],
    Beitzah: [10, 10, 8, 7, 7],
    "Rosh Hashanah": [9, 9, 8, 9],
    Taanis: [7, 10, 9, 8],
    Megillah: [11, 6, 6, 10],
    "Moed Katan": [10, 5, 9],
    Chagigah: [8, 7, 8],
    Yevamos: [4, 10, 10, 13, 6, 6, 6, 6, 6, 9, 7, 6, 13, 9, 10, 7],
    Kesubos: [10, 10, 9, 12, 9, 7, 10, 8, 9, 6, 6, 4, 11],
    Nedarim: [4, 5, 11, 8, 6, 10, 9, 7, 10, 8, 12],
    Nazir: [7, 10, 7, 7, 7, 11, 4, 2, 5],
    Sotah: [9, 6, 8, 5, 5, 4, 8, 7, 15],
    Gittin: [6, 7, 8, 9, 9, 7, 9, 10, 10],
    Kiddushin: [10, 10, 13, 14],
    "Bava Kamma": [4, 6, 11, 9, 7, 6, 7, 7, 12, 10],
    "Bava Metzia": [8, 11, 12, 12, 11, 8, 11, 9, 13, 6],
    "Bava Basra": [6, 14, 8, 9, 11, 8, 4, 8, 10, 8],
    Sanhedrin: [6, 5, 8, 5, 5, 6, 11, 7, 6, 6, 6],
    Makkos: [10, 8, 16],
    Shevuos: [7, 5, 11, 13, 5, 7, 8, 6],
    Eduyos: [14, 10, 12, 12, 7, 3, 9, 7],
    "Avodah Zarah": [9, 7, 10, 12, 12],
    Avos: [18, 16, 18, 22, 23, 11],
    Horayos: [5, 7, 8],
    Zevachim: [4, 5, 6, 6, 8, 7, 6, 12, 7, 8, 8, 6, 8, 10],
    Menachos: [4, 5, 7, 5, 9, 7, 6, 7, 9, 9, 9, 5, 11],
    Chullin: [7, 10, 7, 7, 5, 7, 6, 6, 8, 4, 2, 5],
    Bechoros: [7, 9, 4, 10, 6, 12, 7, 10, 8],
    Arachin: [4, 6, 5, 4, 6, 5, 5, 7, 8],
    Temurah: [6, 3, 5, 4, 6, 5, 6],
    Kerisos: [7, 6, 10, 3, 8, 9],
    Meilah: [4, 9, 8, 6, 5, 6],
    Tamid: [4, 5, 9, 3, 6, 3, 4],
    Middos: [9, 6, 8, 7, 4],
    Kinnim: [4, 5, 6],
    Keilim: [9, 8, 8, 4, 11, 4, 6, 11, 8, 8, 9, 8, 8, 8, 6, 8, 17, 9, 10, 7, 3, 10, 5, 17, 9, 9, 12, 10, 8, 4],
    Ohalos: [8, 7, 7, 3, 7, 7, 6, 6, 16, 7, 9, 8, 6, 7, 10, 5, 5, 10],
    Negaim: [6, 5, 8, 11, 5, 8, 5, 10, 3, 10, 12, 7, 12, 13],
    Parah: [4, 5, 11, 4, 9, 5, 12, 11, 9, 6, 9, 11],
    Taharos: [9, 8, 8, 13, 9, 10, 9, 9, 9, 8],
    Mikvaos: [8, 10, 4, 5, 6, 11, 7, 5, 7, 8],
    Niddah: [7, 7, 7, 7, 9, 14, 5, 4, 11, 8],
    Machshirin: [6, 11, 8, 10, 11, 8],
    Zavim: [6, 4, 3, 7, 12],
    "Tevul Yom": [5, 8, 6, 7],
    Yadayim: [5, 4, 5, 8],
    Uktzin: [6, 10, 12],
  };

  const perakim = [];
  SEDARIM.forEach(([seder, mas]) => {
    mas.forEach(([masechta, cnt]) => {
      for (let n = 1; n <= cnt; n++) {
        perakim.push({
          perek_id: seder + "." + masechta + "." + n,
          seder, masechta, perek_num: n,
          eman_done: false, eman_date: null,
          yehuda_done: false, yehuda_date: null,
          eman_mishnayos: [], yehuda_mishnayos: [],
        });
      }
    });
  });

  // deterministic RNG so the demo is stable across reloads
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const fmt = d => d.toISOString().slice(0, 10);
  const TODAY = new Date("2026-06-29T12:00:00");

  // Mark a believable, mostly front-to-back progression with organic gaps,
  // then date the completions in learning order so charts read naturally.
  function assign(person, frontier, pHead, pTail, startISO, seed) {
    const rnd = mulberry32(seed);
    const idxs = [];
    perakim.forEach((p, i) => {
      const prob = i < frontier ? pHead : pTail;
      if (rnd() < prob) idxs.push(i);
    });
    const start = new Date(startISO + "T12:00:00");
    const span = TODAY - start;
    const K = idxs.length;
    idxs.forEach((i, k) => {
      const t = K <= 1 ? 1 : k / (K - 1);
      const d = new Date(start.getTime() + t * span);
      perakim[i][person + "_done"] = true;
      perakim[i][person + "_date"] = fmt(d);
    });
    return K;
  }

  assign("eman", 300, 0.84, 0.05, "2026-02-15", 0x1a2b3c);
  assign("yehuda", 210, 0.80, 0.04, "2026-03-08", 0x9f8e7d);

  // Perakim currently "in progress": the first few not-yet-done perakim get a
  // partial set of learned mishnayos so the sub-task UI has demo data.
  function assignPartials(person, howMany, seed) {
    const rnd = mulberry32(seed);
    let left = howMany;
    for (const p of perakim) {
      if (left === 0) break;
      if (p[person + "_done"]) continue;
      const cnt = (MISHNAYOS[p.masechta] || [])[p.perek_num - 1] || 0;
      if (cnt < 2) continue;
      const k = 1 + Math.floor(rnd() * (cnt - 1)); // 1 .. cnt-1, never the full perek
      p[person + "_mishnayos"] = Array.from({ length: k }, (_, i) => i + 1);
      left--;
    }
  }
  assignPartials("eman", 3, 0x51f0aa);
  assignPartials("yehuda", 3, 0x77c3e1);

  window.SHAS_MOCK = { perakim };
  window.SEDER_ORDER = SEDER_ORDER;
  window.MISHNA_COUNTS = MISHNAYOS;

  // Hebrew names (for the Hebrew toggle)
  window.SEDER_HE = {
    Zeraim: "זרעים", Moed: "מועד", Nashim: "נשים", Nezikin: "נזיקין", Kodashim: "קדשים", Taharos: "טהרות",
  };
  window.MAS_HE = {
    Berachos: "ברכות", Peah: "פאה", Demai: "דמאי", Kilayim: "כלאים", Sheviis: "שביעית", Terumos: "תרומות",
    Maasros: "מעשרות", "Maaser Sheni": "מעשר שני", Challah: "חלה", Orlah: "ערלה", Bikkurim: "ביכורים",
    Shabbos: "שבת", Eruvin: "עירובין", Pesachim: "פסחים", Shekalim: "שקלים", Yoma: "יומא", Sukkah: "סוכה",
    Beitzah: "ביצה", "Rosh Hashanah": "ראש השנה", Taanis: "תענית", Megillah: "מגילה", "Moed Katan": "מועד קטן", Chagigah: "חגיגה",
    Yevamos: "יבמות", Kesubos: "כתובות", Nedarim: "נדרים", Nazir: "נזיר", Sotah: "סוטה", Gittin: "גיטין", Kiddushin: "קידושין",
    "Bava Kamma": "בבא קמא", "Bava Metzia": "בבא מציעא", "Bava Basra": "בבא בתרא", Sanhedrin: "סנהדרין", Makkos: "מכות",
    Shevuos: "שבועות", Eduyos: "עדויות", "Avodah Zarah": "עבודה זרה", Avos: "אבות", Horayos: "הוריות",
    Zevachim: "זבחים", Menachos: "מנחות", Chullin: "חולין", Bechoros: "בכורות", Arachin: "ערכין", Temurah: "תמורה",
    Kerisos: "כריתות", Meilah: "מעילה", Tamid: "תמיד", Middos: "מידות", Kinnim: "קינים",
    Keilim: "כלים", Ohalos: "אהלות", Negaim: "נגעים", Parah: "פרה", Taharos: "טהרות", Mikvaos: "מקואות",
    Niddah: "נדה", Machshirin: "מכשירין", Zavim: "זבים", "Tevul Yom": "טבול יום", Yadayim: "ידים", Uktzin: "עוקצין",
  };
})();
