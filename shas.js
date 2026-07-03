/* =========================================================================
   Mishnah Shas Tracker — development dataset
   Mirrors the live Apps Script GET response shape exactly:
     { perakim: [ { perek_id, seder, masechta, perek_num,
                    eman_done, eman_date, yehuda_done, yehuda_date } ] }
   The full Shas is generated here so the mosaic renders complete while
   SCRIPT_URL is still a placeholder. Swap for the live GET in production —
   the frontend never hardcodes counts, it renders whatever it receives.

   Names use modern Sephardi transliteration (Avot, Shabbat, Berachot). The
   live Google Sheet may still carry the original Ashkenazi spellings in its
   perek_ids and name columns — MAS_CANON / SEDER_CANON below translate those
   at read time, so no Sheet migration is ever required.
   ========================================================================= */
(function () {
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

  window.SHAS_MOCK = { perakim, current: { eman: null, yehuda: null } };
  window.SEDER_ORDER = SEDER_ORDER;

  // Legacy Ashkenazi spellings (as seeded in the live Sheet) → Sephardi display
  // names. Applied to incoming data only — perek_id stays untouched as the
  // stable write key, so the existing Sheet keeps working unmodified.
  window.SEDER_CANON = { Taharos: "Taharot" };
  window.MAS_CANON = {
    Berachos: "Berachot", Sheviis: "Sheviit", Terumos: "Terumot", Maasros: "Maasrot",
    Shabbos: "Shabbat", Taanis: "Taanit",
    Yevamos: "Yevamot", Kesubos: "Ketubot",
    "Bava Basra": "Bava Batra", Makkos: "Makkot", Shevuos: "Shevuot", Eduyos: "Eduyot",
    Avos: "Avot", Horayos: "Horayot",
    Menachos: "Menachot", Bechoros: "Bechorot", Kerisos: "Keritot", Middos: "Middot",
    Ohalos: "Ohalot", Taharos: "Taharot", Mikvaos: "Mikvaot",
  };

  // Sefaria index titles (for the live reader) — keyed by our display name.
  // Sefaria's canonical spellings differ from ours in a few places
  // (Berakhot, Kelim, Oholot…), and Avot lives there as "Pirkei Avot".
  window.MAS_SEFARIA = {
    Berachot: "Mishnah Berakhot", Peah: "Mishnah Peah", Demai: "Mishnah Demai",
    Kilayim: "Mishnah Kilayim", Sheviit: "Mishnah Sheviit", Terumot: "Mishnah Terumot",
    Maasrot: "Mishnah Maasrot", "Maaser Sheni": "Mishnah Maaser Sheni", Challah: "Mishnah Challah",
    Orlah: "Mishnah Orlah", Bikkurim: "Mishnah Bikkurim",
    Shabbat: "Mishnah Shabbat", Eruvin: "Mishnah Eruvin", Pesachim: "Mishnah Pesachim",
    Shekalim: "Mishnah Shekalim", Yoma: "Mishnah Yoma", Sukkah: "Mishnah Sukkah",
    Beitzah: "Mishnah Beitzah", "Rosh Hashanah": "Mishnah Rosh Hashanah", Taanit: "Mishnah Taanit",
    Megillah: "Mishnah Megillah", "Moed Katan": "Mishnah Moed Katan", Chagigah: "Mishnah Chagigah",
    Yevamot: "Mishnah Yevamot", Ketubot: "Mishnah Ketubot", Nedarim: "Mishnah Nedarim",
    Nazir: "Mishnah Nazir", Sotah: "Mishnah Sotah", Gittin: "Mishnah Gittin", Kiddushin: "Mishnah Kiddushin",
    "Bava Kamma": "Mishnah Bava Kamma", "Bava Metzia": "Mishnah Bava Metzia", "Bava Batra": "Mishnah Bava Batra",
    Sanhedrin: "Mishnah Sanhedrin", Makkot: "Mishnah Makkot", Shevuot: "Mishnah Shevuot",
    Eduyot: "Mishnah Eduyot", "Avodah Zarah": "Mishnah Avodah Zarah", Avot: "Pirkei Avot", Horayot: "Mishnah Horayot",
    Zevachim: "Mishnah Zevachim", Menachot: "Mishnah Menachot", Chullin: "Mishnah Chullin",
    Bechorot: "Mishnah Bekhorot", Arachin: "Mishnah Arakhin", Temurah: "Mishnah Temurah",
    Keritot: "Mishnah Keritot", Meilah: "Mishnah Meilah", Tamid: "Mishnah Tamid",
    Middot: "Mishnah Middot", Kinnim: "Mishnah Kinnim",
    Keilim: "Mishnah Kelim", Ohalot: "Mishnah Oholot", Negaim: "Mishnah Negaim",
    Parah: "Mishnah Parah", Taharot: "Mishnah Tahorot", Mikvaot: "Mishnah Mikvaot",
    Niddah: "Mishnah Niddah", Machshirin: "Mishnah Makhshirin", Zavim: "Mishnah Zavim",
    "Tevul Yom": "Mishnah Tevul Yom", Yadayim: "Mishnah Yadayim", Uktzin: "Mishnah Oktzin",
  };

  // Hebrew names (for the Hebrew toggle)
  window.SEDER_HE = {
    Zeraim: "זרעים", Moed: "מועד", Nashim: "נשים", Nezikin: "נזיקין", Kodashim: "קדשים", Taharot: "טהרות",
  };
  window.MAS_HE = {
    Berachot: "ברכות", Peah: "פאה", Demai: "דמאי", Kilayim: "כלאים", Sheviit: "שביעית", Terumot: "תרומות",
    Maasrot: "מעשרות", "Maaser Sheni": "מעשר שני", Challah: "חלה", Orlah: "ערלה", Bikkurim: "ביכורים",
    Shabbat: "שבת", Eruvin: "עירובין", Pesachim: "פסחים", Shekalim: "שקלים", Yoma: "יומא", Sukkah: "סוכה",
    Beitzah: "ביצה", "Rosh Hashanah": "ראש השנה", Taanit: "תענית", Megillah: "מגילה", "Moed Katan": "מועד קטן", Chagigah: "חגיגה",
    Yevamot: "יבמות", Ketubot: "כתובות", Nedarim: "נדרים", Nazir: "נזיר", Sotah: "סוטה", Gittin: "גיטין", Kiddushin: "קידושין",
    "Bava Kamma": "בבא קמא", "Bava Metzia": "בבא מציעא", "Bava Batra": "בבא בתרא", Sanhedrin: "סנהדרין", Makkot: "מכות",
    Shevuot: "שבועות", Eduyot: "עדויות", "Avodah Zarah": "עבודה זרה", Avot: "אבות", Horayot: "הוריות",
    Zevachim: "זבחים", Menachot: "מנחות", Chullin: "חולין", Bechorot: "בכורות", Arachin: "ערכין", Temurah: "תמורה",
    Keritot: "כריתות", Meilah: "מעילה", Tamid: "תמיד", Middot: "מידות", Kinnim: "קינים",
    Keilim: "כלים", Ohalot: "אהלות", Negaim: "נגעים", Parah: "פרה", Taharot: "טהרות", Mikvaot: "מקואות",
    Niddah: "נדה", Machshirin: "מכשירין", Zavim: "זבים", "Tevul Yom": "טבול יום", Yadayim: "ידים", Uktzin: "עוקצין",
  };
})();
