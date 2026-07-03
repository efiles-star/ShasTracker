/* =========================================================================
   Mishnah Shas Tracker — development dataset
   Mirrors the live Apps Script GET response shape exactly:
     { perakim: [ { perek_id, seder, masechta, perek_num,
                    eman_done, eman_date, yehuda_done, yehuda_date } ] }
   The full Shas is generated here so the mosaic renders complete while
   SCRIPT_URL is still a placeholder. Swap for the live GET in production —
   the frontend never hardcodes counts, it renders whatever it receives.
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

  const perakim = [];
  SEDARIM.forEach(([seder, mas]) => {
    mas.forEach(([masechta, cnt]) => {
      for (let n = 1; n <= cnt; n++) {
        perakim.push({
          perek_id: seder + "." + masechta + "." + n,
          seder, masechta, perek_num: n,
          eman_done: false, eman_date: null,
          yehuda_done: false, yehuda_date: null,
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

  window.SHAS_MOCK = { perakim };
  window.SEDER_ORDER = SEDER_ORDER;

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
