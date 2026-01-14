(function(thisObj) {
  "use strict";

  // Store script path at load time for reliable reload
  var SCRIPT_FILE = new File($.fileName);

  // Create dockable panel (reuse existing panel on reload to avoid duplicate windows)
  var existingPanel = null;
  try {
    if ($.global._MultiLoremPanelOverride && $.global._MultiLoremPanelOverride instanceof Panel && $.global._MultiLoremPanelOverride.parent !== null) {
      existingPanel = $.global._MultiLoremPanelOverride;
    }
  } catch (_) {
    existingPanel = null;
  }
  var panel = existingPanel ? existingPanel : ((thisObj instanceof Panel) ? thisObj : new Window("palette", "MultiLorem - Language Tester", undefined, {resizeable: true}));

  // Clear existing children when reloading in a docked panel
  if (panel.children && panel.children.length > 0) {
    while (panel.children.length > 0) {
      panel.remove(panel.children[0]);
    }
  }

  // Panel UI
  panel.orientation = "column";
  panel.alignChildren = "fill";
  panel.spacing = 10;
  panel.margins = [15, 15, 15, 15];

  // Process button
  var processButton = panel.add("button", undefined, "Create Language Comp");
  processButton.preferredSize.height = 30;

  // Reload button (developer helper)
  var reloadButton = panel.add("button", undefined, "Reload Script");

  // Font helper buttons
  var psGroup = panel.add("group");
  psGroup.orientation = "row";
  psGroup.alignChildren = "fill";
  var revealFontBtn = psGroup.add("button", undefined, "Reveal Selected Font");
  var listKohinoorBtn = psGroup.add("button", undefined, "Search Target Fonts");

  // Status text
  var statusText = panel.add("statictext", undefined, "Ready");
  statusText.graphics.font = ScriptUI.newFont(statusText.graphics.font.name, ScriptUI.FontStyle.REGULAR, 10);

  // Language font mapping using exact PostScript names from working expression code.
  // If font is empty, we keep the source layer's font.
  var LANGUAGES = [
    { code: "EN", font: "" },
    { code: "AR", font: "KohinoorArabicRND-Bold" },
    { code: "BN", font: "KohinoorBanglaRND-Bold" },
    { code: "CS", font: "" },
    { code: "DE", font: "" },
    { code: "EL", font: "KohinoorGreekRND-Bold" },
    { code: "ES", font: "" },
    { code: "FR", font: "" },
    { code: "HI", font: "KohinoorDevanagari-Bold" },
    { code: "HU", font: "" },
    { code: "ID", font: "" },
    { code: "IT", font: "" },
    { code: "JA", font: "GenSenRounded-JP-Bold" },
    { code: "KO", font: "NanumSquareRoundOTFEB" },
    { code: "NL", font: "" },
    { code: "PL", font: "" },
    { code: "PT", font: "" },
    { code: "RO", font: "" },
    { code: "RU", font: "KohinoorCyrillicRND-Bold" },
    { code: "SV", font: "" },
    { code: "TA", font: "KohinoorTamilRounded-Bold" },
    { code: "TE", font: "KohinoorTeluguRND-Bold" },
    { code: "TH", font: "KohinoorThaiRND-Bold" },
    { code: "TL", font: "" },
    { code: "TR", font: "" },
    { code: "UK", font: "KohinoorCyrillicRND-Bold" },
    { code: "VI", font: "DINNextforDuolingo-Bold" },
    { code: "ZH-CN", font: "FZLANTY_CUK--GBK1-0" },
    { code: "ZH-TW", font: "FZLANTY_CUK--GBK1-0" }
  ];

  // Language info
  var langInfoGroup = panel.add("group");
  langInfoGroup.orientation = "row";
  langInfoGroup.alignment = "left";
  langInfoGroup.add("statictext", undefined, "Languages:");
  langInfoGroup.add("statictext", undefined, LANGUAGES.length.toString());

  // Reload handler (re-evaluates the file). If running as a floating window, close and reopen.
  reloadButton.onClick = function() {
    try {
      statusText.text = "Reloading...";
      if (panel instanceof Window) {
        panel.close();
        $.global._MultiLoremPanelOverride = null;
      } else {
        // For docked panels, reuse the existing panel instance to avoid multiple windows
        $.global._MultiLoremPanelOverride = panel;
      }
      $.evalFile(SCRIPT_FILE);
      return;
    } catch (e) {
      alert("Reload failed: " + e.toString());
      statusText.text = "Reload failed";
    }
  };

  function revealSelectedFont() {
    try {
      var comp = app.project && app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        alert("No active composition");
        return;
      }
      if (comp.selectedLayers.length === 0) {
        alert("Select a text layer first");
        return;
      }
      var lyr = comp.selectedLayers[0];
      var st = lyr.property("Source Text");
      if (!st) {
        alert("Selected layer is not a text layer");
        return;
      }
      var v = st.value;
      var msg = [];
      msg.push("font: " + (v.font || "N/A"));
      msg.push("fontFamily: " + (v.fontFamily || "N/A"));
      msg.push("fontStyle: " + (v.fontStyle || "N/A"));
      alert(msg.join("\n"));
    } catch (e) {
      alert("Error revealing font: " + e.toString());
    }
  }

  function listKohinoor() {
    try {
      var fonts = app.fonts;
      var hits = [];
      var patterns = [
        "kohinoor",
        "nanum",
        "gensen",
        "lanting",
        "fzlan",
        "fzlanty",
        "dinnext",
        "duolingo",
        "arabic",
        "bangla",
        "devanagari",
        "cyrillic",
        "greek",
        "tamil",
        "telugu",
        "thai"
      ];
      for (var i = 0; i < fonts.length; i++) {
        var f = fonts[i];
        if (f && f.postScriptName) {
          var ps = f.postScriptName.toLowerCase();
          var fam = (f.family || "").toLowerCase();
          var sty = (f.style || "").toLowerCase();
          for (var p = 0; p < patterns.length; p++) {
            var pat = patterns[p];
            if (ps.indexOf(pat) !== -1 || fam.indexOf(pat) !== -1 || sty.indexOf(pat) !== -1) {
              hits.push(f.postScriptName + "  |  " + (f.family || "") + "  |  " + (f.style || ""));
              break;
            }
          }
        }
      }
      if (hits.length === 0) {
        alert("No target fonts found (Kohinoor/Nanum/GenSen/FZ/DINNext/etc).");
      } else {
        alert(hits.join("\n"));
      }
    } catch (e) {
      alert("Error listing target fonts: " + e.toString());
    }
  }

  revealFontBtn.onClick = revealSelectedFont;
  listKohinoorBtn.onClick = listKohinoor;

  // Word banks for each language (~25 words each, common words for lorem-style placeholder)
  var loremWords = {
    "EN": ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "tempor", "incididunt", "labore", "magna", "aliqua", "enim", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip", "commodo"],
    "AR": ["\u0643\u0644\u0645\u0629", "\u0646\u0635", "\u0639\u0631\u0628\u064A", "\u0645\u062B\u0627\u0644", "\u062A\u062C\u0631\u0628\u0629", "\u0644\u063A\u0629", "\u0643\u062A\u0627\u0628\u0629", "\u0642\u0631\u0627\u0621\u0629", "\u062A\u0639\u0644\u0645", "\u062F\u0631\u0633", "\u0628\u064A\u062A", "\u0645\u062F\u0631\u0633\u0629", "\u0643\u062A\u0627\u0628", "\u0642\u0644\u0645", "\u0648\u0631\u0642\u0629", "\u0633\u0624\u0627\u0644", "\u062C\u0648\u0627\u0628", "\u0635\u062D\u064A\u062D", "\u062E\u0637\u0623", "\u062C\u0645\u064A\u0644", "\u0633\u0631\u064A\u0639", "\u0628\u0637\u064A\u0621", "\u0643\u0628\u064A\u0631", "\u0635\u063A\u064A\u0631", "\u062C\u062F\u064A\u062F"],
    "BN": ["\u09B6\u09AC\u09CD\u09A6", "\u09AC\u09BE\u0995\u09CD\u09AF", "\u09AD\u09BE\u09B7\u09BE", "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE", "\u09AC\u0987", "\u0995\u09B2\u09AE", "\u0995\u09BE\u0997\u099C", "\u09AA\u09CD\u09B0\u09B6\u09CD\u09A8", "\u0989\u09A4\u09CD\u09A4\u09B0", "\u09B8\u09A0\u09BF\u0995", "\u09AD\u09C1\u09B2", "\u09B8\u09C1\u09A8\u09CD\u09A6\u09B0", "\u09A6\u09CD\u09B0\u09C1\u09A4", "\u09A7\u09C0\u09B0", "\u09AC\u09A1\u09BC", "\u099B\u09CB\u099F", "\u09A8\u09A4\u09C1\u09A8", "\u09AA\u09C1\u09B0\u09BE\u09A8\u09CB", "\u0986\u099C", "\u0995\u09BE\u09B2", "\u09B8\u0995\u09BE\u09B2", "\u09B8\u09A8\u09CD\u09A7\u09CD\u09AF\u09BE", "\u09B0\u09BE\u09A4", "\u09A6\u09BF\u09A8", "\u09B8\u09AA\u09CD\u09A4\u09BE\u09B9"],
    "CS": ["slovo", "jazyk", "text", "kniha", "pero", "list", "otazka", "odpoved", "spravne", "spatne", "krasny", "rychly", "pomaly", "velky", "maly", "novy", "stary", "dnes", "vcera", "zitra", "rano", "vecer", "noc", "den", "tyden"],
    "DE": ["Wort", "Sprache", "Text", "Buch", "Stift", "Blatt", "Frage", "Antwort", "richtig", "falsch", "schoen", "schnell", "langsam", "gross", "klein", "neu", "alt", "heute", "gestern", "morgen", "Morgen", "Abend", "Nacht", "Tag", "Woche"],
    "EL": ["\u03BB\u03AD\u03BE\u03B7", "\u03B3\u03BB\u03CE\u03C3\u03C3\u03B1", "\u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF", "\u03B2\u03B9\u03B2\u03BB\u03AF\u03BF", "\u03C3\u03C4\u03C5\u03BB\u03CC", "\u03C6\u03CD\u03BB\u03BB\u03BF", "\u03B5\u03C1\u03CE\u03C4\u03B7\u03C3\u03B7", "\u03B1\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B7", "\u03C3\u03C9\u03C3\u03C4\u03CC", "\u03BB\u03AC\u03B8\u03BF\u03C2", "\u03CC\u03BC\u03BF\u03C1\u03C6\u03BF", "\u03B3\u03C1\u03AE\u03B3\u03BF\u03C1\u03BF", "\u03B1\u03C1\u03B3\u03CC", "\u03BC\u03B5\u03B3\u03AC\u03BB\u03BF", "\u03BC\u03B9\u03BA\u03C1\u03CC", "\u03BD\u03AD\u03BF", "\u03C0\u03B1\u03BB\u03B9\u03CC", "\u03C3\u03AE\u03BC\u03B5\u03C1\u03B1", "\u03C7\u03B8\u03B5\u03C2", "\u03B1\u03CD\u03C1\u03B9\u03BF", "\u03C0\u03C1\u03C9\u03AF", "\u03B2\u03C1\u03AC\u03B4\u03C5", "\u03BD\u03CD\u03C7\u03C4\u03B1", "\u03BC\u03AD\u03C1\u03B1", "\u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1"],
    "ES": ["palabra", "idioma", "texto", "libro", "pluma", "hoja", "pregunta", "respuesta", "correcto", "incorrecto", "hermoso", "rapido", "lento", "grande", "pequeno", "nuevo", "viejo", "hoy", "ayer", "manana", "dia", "noche", "semana", "mes", "tiempo"],
    "FR": ["mot", "langue", "texte", "livre", "stylo", "feuille", "question", "reponse", "correct", "faux", "beau", "rapide", "lent", "grand", "petit", "nouveau", "vieux", "aujourd", "hier", "demain", "matin", "soir", "nuit", "jour", "semaine"],
    "HI": ["\u0936\u092C\u094D\u0926", "\u092D\u093E\u0937\u093E", "\u092A\u093E\u0920", "\u0915\u093F\u0924\u093E\u092C", "\u0915\u0932\u092E", "\u0915\u093E\u0917\u091C", "\u0938\u0935\u093E\u0932", "\u091C\u0935\u093E\u092C", "\u0938\u0939\u0940", "\u0917\u0932\u0924", "\u0938\u0941\u0902\u0926\u0930", "\u0924\u0947\u091C", "\u0927\u0940\u0930\u0947", "\u092C\u0921\u093C\u093E", "\u091B\u094B\u091F\u093E", "\u0928\u092F\u093E", "\u092A\u0941\u0930\u093E\u0928\u093E", "\u0906\u091C", "\u0915\u0932", "\u0938\u0941\u092C\u0939", "\u0936\u093E\u092E", "\u0930\u093E\u0924", "\u0926\u093F\u0928", "\u0939\u092B\u094D\u0924\u093E", "\u092E\u0939\u0940\u0928\u093E"],
    "HU": ["szo", "nyelv", "szoveg", "konyv", "toll", "lap", "kerdes", "valasz", "helyes", "helytelen", "szep", "gyors", "lassu", "nagy", "kicsi", "uj", "regi", "ma", "tegnap", "holnap", "reggel", "este", "ejszaka", "nap", "het"],
    "ID": ["kata", "bahasa", "teks", "buku", "pena", "kertas", "pertanyaan", "jawaban", "benar", "salah", "indah", "cepat", "lambat", "besar", "kecil", "baru", "lama", "hari", "kemarin", "besok", "pagi", "malam", "siang", "minggu", "bulan"],
    "IT": ["parola", "lingua", "testo", "libro", "penna", "foglio", "domanda", "risposta", "corretto", "sbagliato", "bello", "veloce", "lento", "grande", "piccolo", "nuovo", "vecchio", "oggi", "ieri", "domani", "mattina", "sera", "notte", "giorno", "settimana"],
    "JA": ["\u8A00\u8449", "\u8A9E\u5B66", "\u6587\u7AE0", "\u672C", "\u30DA\u30F3", "\u7D19", "\u8CEA\u554F", "\u7B54\u3048", "\u6B63\u3057\u3044", "\u9593\u9055\u3044", "\u7F8E\u3057\u3044", "\u901F\u3044", "\u9045\u3044", "\u5927\u304D\u3044", "\u5C0F\u3055\u3044", "\u65B0\u3057\u3044", "\u53E4\u3044", "\u4ECA\u65E5", "\u6628\u65E5", "\u660E\u65E5", "\u671D", "\u5915\u65B9", "\u591C", "\u65E5", "\u9031"],
    "KO": ["\uB2E8\uC5B4", "\uC5B8\uC5B4", "\uBB38\uC7A5", "\uCC45", "\uD39C", "\uC885\uC774", "\uC9C8\uBB38", "\uB2F5\uBCC0", "\uB9DE\uC544\uC694", "\uD2C0\uB824\uC694", "\uC544\uB984\uB2E4\uC6B4", "\uBE60\uB978", "\uB290\uB9B0", "\uD070", "\uC791\uC740", "\uC0C8\uB85C\uC6B4", "\uC624\uB798\uB41C", "\uC624\uB298", "\uC5B4\uC81C", "\uB0B4\uC77C", "\uC544\uCE68", "\uC800\uB141", "\uBC24", "\uB0A0", "\uC8FC"],
    "NL": ["woord", "taal", "tekst", "boek", "pen", "blad", "vraag", "antwoord", "juist", "fout", "mooi", "snel", "langzaam", "groot", "klein", "nieuw", "oud", "vandaag", "gisteren", "morgen", "ochtend", "avond", "nacht", "dag", "week"],
    "PL": ["slowo", "jezyk", "tekst", "ksiazka", "dlugopis", "kartka", "pytanie", "odpowiedz", "poprawnie", "zle", "piekny", "szybki", "wolny", "duzy", "maly", "nowy", "stary", "dzisiaj", "wczoraj", "jutro", "rano", "wieczor", "noc", "dzien", "tydzien"],
    "PT": ["palavra", "idioma", "texto", "livro", "caneta", "folha", "pergunta", "resposta", "certo", "errado", "bonito", "rapido", "lento", "grande", "pequeno", "novo", "velho", "hoje", "ontem", "amanha", "manha", "noite", "dia", "semana", "mes"],
    "RO": ["cuvant", "limba", "text", "carte", "stilou", "foaie", "intrebare", "raspuns", "corect", "gresit", "frumos", "rapid", "lent", "mare", "mic", "nou", "vechi", "azi", "ieri", "maine", "dimineata", "seara", "noapte", "zi", "saptamana"],
    "RU": ["\u0441\u043B\u043E\u0432\u043E", "\u044F\u0437\u044B\u043A", "\u0442\u0435\u043A\u0441\u0442", "\u043A\u043D\u0438\u0433\u0430", "\u0440\u0443\u0447\u043A\u0430", "\u043B\u0438\u0441\u0442", "\u0432\u043E\u043F\u0440\u043E\u0441", "\u043E\u0442\u0432\u0435\u0442", "\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E", "\u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E", "\u043A\u0440\u0430\u0441\u0438\u0432\u044B\u0439", "\u0431\u044B\u0441\u0442\u0440\u044B\u0439", "\u043C\u0435\u0434\u043B\u0435\u043D\u043D\u044B\u0439", "\u0431\u043E\u043B\u044C\u0448\u043E\u0439", "\u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0439", "\u043D\u043E\u0432\u044B\u0439", "\u0441\u0442\u0430\u0440\u044B\u0439", "\u0441\u0435\u0433\u043E\u0434\u043D\u044F", "\u0432\u0447\u0435\u0440\u0430", "\u0437\u0430\u0432\u0442\u0440\u0430", "\u0443\u0442\u0440\u043E", "\u0432\u0435\u0447\u0435\u0440", "\u043D\u043E\u0447\u044C", "\u0434\u0435\u043D\u044C", "\u043D\u0435\u0434\u0435\u043B\u044F"],
    "SV": ["ord", "sprak", "text", "bok", "penna", "blad", "fraga", "svar", "ratt", "fel", "vacker", "snabb", "langsam", "stor", "liten", "ny", "gammal", "idag", "igar", "imorgon", "morgon", "kvall", "natt", "dag", "vecka"],
    "TA": ["\u0B9A\u0BCA\u0BB2\u0BCD", "\u0BAE\u0BCA\u0BB4\u0BBF", "\u0B89\u0BB0\u0BC8", "\u0BA8\u0BC2\u0BB2\u0BCD", "\u0BAA\u0BC7\u0BA9\u0BBE", "\u0BA4\u0BBE\u0BB3\u0BCD", "\u0B95\u0BC7\u0BB3\u0BCD\u0BB5\u0BBF", "\u0BAA\u0BA4\u0BBF\u0BB2\u0BCD", "\u0B9A\u0BB0\u0BBF", "\u0BA4\u0BB5\u0BB1\u0BC1", "\u0B85\u0BB4\u0B95\u0BC1", "\u0BB5\u0BC7\u0B95\u0BAE\u0BCD", "\u0BAE\u0BC6\u0BA4\u0BC1\u0BB5\u0BBE\u0B95", "\u0BAA\u0BC6\u0BB0\u0BBF\u0BAF", "\u0B9A\u0BBF\u0BB1\u0BBF\u0BAF", "\u0BAA\u0BC1\u0BA4\u0BBF\u0BAF", "\u0BAA\u0BB4\u0BC8\u0BAF", "\u0B87\u0BA9\u0BCD\u0BB1\u0BC1", "\u0BA8\u0BC7\u0BB1\u0BCD\u0BB1\u0BC1", "\u0BA8\u0BBE\u0BB3\u0BC8", "\u0B95\u0BBE\u0BB2\u0BC8", "\u0BAE\u0BBE\u0BB2\u0BC8", "\u0B87\u0BB0\u0BB5\u0BC1", "\u0BA8\u0BBE\u0BB3\u0BCD", "\u0BB5\u0BBE\u0BB0\u0BAE\u0BCD"],
    "TE": ["\u0C2A\u0C26\u0C02", "\u0C2D\u0C3E\u0C37", "\u0C35\u0C3E\u0C15\u0C4D\u0C2F\u0C02", "\u0C2A\u0C41\u0C38\u0C4D\u0C24\u0C15\u0C02", "\u0C15\u0C32\u0C02", "\u0C15\u0C3E\u0C17\u0C3F\u0C24\u0C02", "\u0C2A\u0C4D\u0C30\u0C36\u0C4D\u0C28", "\u0C38\u0C2E\u0C3E\u0C27\u0C3E\u0C28\u0C02", "\u0C38\u0C30\u0C3F\u0C05\u0C2F\u0C3F\u0C28", "\u0C24\u0C2A\u0C4D\u0C2A\u0C41", "\u0C05\u0C02\u0C26\u0C2E\u0C48\u0C28", "\u0C35\u0C47\u0C17\u0C02\u0C17\u0C3E", "\u0C28\u0C46\u0C2E\u0C4D\u0C2E\u0C26\u0C3F\u0C17\u0C3E", "\u0C2A\u0C46\u0C26\u0C4D\u0C26", "\u0C1A\u0C3F\u0C28\u0C4D\u0C28", "\u0C15\u0C4A\u0C24\u0C4D\u0C24", "\u0C2A\u0C3E\u0C24", "\u0C08\u0C30\u0C4B\u0C1C\u0C41", "\u0C28\u0C3F\u0C28\u0C4D\u0C28", "\u0C30\u0C47\u0C2A\u0C41", "\u0C09\u0C26\u0C2F\u0C02", "\u0C38\u0C3E\u0C2F\u0C02\u0C24\u0C4D\u0C30\u0C02", "\u0C30\u0C3E\u0C24\u0C4D\u0C30\u0C3F", "\u0C30\u0C4B\u0C1C\u0C41", "\u0C35\u0C3E\u0C30\u0C02"],
    "TH": ["\u0E04\u0E33", "\u0E20\u0E32\u0E29\u0E32", "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21", "\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D", "\u0E1B\u0E32\u0E01\u0E01\u0E32", "\u0E01\u0E23\u0E30\u0E14\u0E32\u0E29", "\u0E04\u0E33\u0E16\u0E32\u0E21", "\u0E04\u0E33\u0E15\u0E2D\u0E1A", "\u0E16\u0E39\u0E01", "\u0E1C\u0E34\u0E14", "\u0E2A\u0E27\u0E22", "\u0E40\u0E23\u0E47\u0E27", "\u0E0A\u0E49\u0E32", "\u0E43\u0E2B\u0E0D\u0E48", "\u0E40\u0E25\u0E47\u0E01", "\u0E43\u0E2B\u0E21\u0E48", "\u0E40\u0E01\u0E48\u0E32", "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49", "\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E27\u0E32\u0E19", "\u0E1E\u0E23\u0E38\u0E48\u0E07\u0E19\u0E35\u0E49", "\u0E40\u0E0A\u0E49\u0E32", "\u0E40\u0E22\u0E47\u0E19", "\u0E01\u0E25\u0E32\u0E07\u0E04\u0E37\u0E19", "\u0E27\u0E31\u0E19", "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C"],
    "TL": ["salita", "wika", "teksto", "libro", "pluma", "papel", "tanong", "sagot", "tama", "mali", "maganda", "mabilis", "mabagal", "malaki", "maliit", "bago", "luma", "ngayon", "kahapon", "bukas", "umaga", "gabi", "araw", "linggo", "buwan"],
    "TR": ["kelime", "dil", "metin", "kitap", "kalem", "yaprak", "soru", "cevap", "dogru", "yanlis", "guzel", "hizli", "yavas", "buyuk", "kucuk", "yeni", "eski", "bugun", "dun", "yarin", "sabah", "aksam", "gece", "gun", "hafta"],
    "UK": ["\u0441\u043B\u043E\u0432\u043E", "\u043C\u043E\u0432\u0430", "\u0442\u0435\u043A\u0441\u0442", "\u043A\u043D\u0438\u0433\u0430", "\u0440\u0443\u0447\u043A\u0430", "\u0430\u0440\u043A\u0443\u0448", "\u043F\u0438\u0442\u0430\u043D\u043D\u044F", "\u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u044C", "\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E", "\u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E", "\u0433\u0430\u0440\u043D\u0438\u0439", "\u0448\u0432\u0438\u0434\u043A\u0438\u0439", "\u043F\u043E\u0432\u0456\u043B\u044C\u043D\u0438\u0439", "\u0432\u0435\u043B\u0438\u043A\u0438\u0439", "\u043C\u0430\u043B\u0438\u0439", "\u043D\u043E\u0432\u0438\u0439", "\u0441\u0442\u0430\u0440\u0438\u0439", "\u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456", "\u0432\u0447\u043E\u0440\u0430", "\u0437\u0430\u0432\u0442\u0440\u0430", "\u0440\u0430\u043D\u043E\u043A", "\u0432\u0435\u0447\u0456\u0440", "\u043D\u0456\u0447", "\u0434\u0435\u043D\u044C", "\u0442\u0438\u0436\u0434\u0435\u043D\u044C"],
    "VI": ["tu", "ngon", "van", "sach", "but", "giay", "cau", "tra", "dung", "sai", "dep", "nhanh", "cham", "lon", "nho", "moi", "cu", "hom", "qua", "mai", "sang", "toi", "dem", "ngay", "tuan"],
    "ZH-CN": ["\u6587\u5B57", "\u8BED\u8A00", "\u6587\u7AE0", "\u4E66\u7C4D", "\u94A2\u7B14", "\u7EB8\u5F20", "\u95EE\u9898", "\u7B54\u6848", "\u6B63\u786E", "\u9519\u8BEF", "\u7F8E\u4E3D", "\u5FEB\u901F", "\u7F13\u6162", "\u5927\u7684", "\u5C0F\u7684", "\u65B0\u7684", "\u65E7\u7684", "\u4ECA\u5929", "\u6628\u5929", "\u660E\u5929", "\u65E9\u4E0A", "\u665A\u4E0A", "\u591C\u665A", "\u5929", "\u5468"],
    "ZH-TW": ["\u6587\u5B57", "\u8A9E\u8A00", "\u6587\u7AE0", "\u66F8\u7C4D", "\u92FC\u7B46", "\u7D19\u5F35", "\u554F\u984C", "\u7B54\u6848", "\u6B63\u78BA", "\u932F\u8AA4", "\u7F8E\u9E97", "\u5FEB\u901F", "\u7DE9\u6162", "\u5927\u7684", "\u5C0F\u7684", "\u65B0\u7684", "\u820A\u7684", "\u4ECA\u5929", "\u6628\u5929", "\u660E\u5929", "\u65E9\u4E0A", "\u665A\u4E0A", "\u591C\u665A", "\u5929", "\u9031"]
  };

  // Get lorem text for a language with specified word count
  function getLoremText(langCode, wordCount) {
    var words = loremWords[langCode] || loremWords["EN"];
    var result = [];
    for (var i = 0; i < wordCount; i++) {
      result.push(words[i % words.length]); // cycle if we need more words than available
    }
    return result.join(" ");
  }

  // Count words in a string (split by whitespace)
  function countWords(text) {
    if (!text || text.length === 0) return 1;
    var trimmed = text.replace(/^\s+|\s+$/g, ""); // trim
    if (trimmed.length === 0) return 1;
    var parts = trimmed.split(/\s+/);
    return parts.length;
  }

  // Utility: bake expression values at a specific time, then clear expressions
  function bakeExpressionRecursive(prop, evalTime) {
    if (!prop) return;
    
    // If this property has an expression, bake it
    if (prop.canSetExpression && prop.expression && prop.expression !== "") {
      try {
        // Get the evaluated value at the specified time
        var bakedValue = prop.valueAtTime(evalTime, false);
        // Clear the expression first
        prop.expression = "";
        // Set the static value (only if property can be set)
        if (prop.canSetValue !== false) {
          prop.setValue(bakedValue);
        }
      } catch (_) {
        // If baking fails, just try to clear the expression
        try { prop.expression = ""; } catch (_2) {}
      }
    }
    
    // Recurse into child properties
    if (prop.numProperties) {
      for (var i = 1; i <= prop.numProperties; i++) {
        bakeExpressionRecursive(prop.property(i), evalTime);
      }
    }
  }

  // Bake all expressions on a layer to their values at evalTime
  function bakeAndFreezeExpressions(layer, evalTime) {
    if (!layer) return;
    bakeExpressionRecursive(layer, evalTime);
  }

  // Remove all keyframes from a property recursively
  function removeKeyframesRecursive(prop) {
    if (!prop) return;
    
    // Remove keyframes if this property is time-varying
    if (prop.isTimeVarying && prop.numKeys > 0) {
      try {
        // Get current value before removing keys
        var currentVal = prop.value;
        // Remove all keyframes (remove from end to avoid index shifting)
        while (prop.numKeys > 0) {
          prop.removeKey(1);
        }
        // Set the static value
        if (prop.canSetValue !== false) {
          prop.setValue(currentVal);
        }
      } catch (_) {}
    }
    
    // Recurse into child properties
    if (prop.numProperties) {
      for (var i = 1; i <= prop.numProperties; i++) {
        removeKeyframesRecursive(prop.property(i));
      }
    }
  }

  // Remove ALL keyframes from a layer
  function removeAllKeyframes(layer) {
    if (!layer) return;
    removeKeyframesRecursive(layer);
  }

  // Calculate world position using temporary expression (most accurate method)
  function getWorldTransform(layer, time) {
    var result = {
      position: null,
      scale: null,
      rotation: null
    };
    
    if (!layer.parent) {
      // No parent chain - just return current values
      try {
        result.position = layer.transform.position.valueAtTime(time, false);
        result.scale = layer.transform.scale.valueAtTime(time, false);
        result.rotation = layer.transform.rotation ? layer.transform.rotation.valueAtTime(time, false) : 0;
      } catch (_) {}
      return result;
    }
    
    // Use temporary expressions to compute world values
    var posProp = layer.transform.position;
    var scaleProp = layer.transform.scale;
    var rotProp = layer.transform.rotation;
    
    var origPosExpr = "";
    var origScaleExpr = "";
    var origRotExpr = "";
    
    try {
      // Save original expressions
      origPosExpr = posProp.expression || "";
      origScaleExpr = scaleProp.expression || "";
      if (rotProp) origRotExpr = rotProp.expression || "";
      
      // Set expressions to compute world values
      posProp.expression = "toWorld(transform.anchorPoint)";
      result.position = posProp.valueAtTime(time, false);
      
      // For scale: multiply up the parent chain
      scaleProp.expression = "s = transform.scale; p = thisLayer; while(p.hasParent) { p = p.parent; s = [s[0]*p.transform.scale[0]/100, s[1]*p.transform.scale[1]/100]; } s";
      result.scale = scaleProp.valueAtTime(time, false);
      
      // For rotation: sum up the parent chain
      if (rotProp) {
        rotProp.expression = "r = transform.rotation; p = thisLayer; while(p.hasParent) { p = p.parent; r += p.transform.rotation; } r";
        result.rotation = rotProp.valueAtTime(time, false);
      }
    } catch (e) {
      // If expressions fail, fall back to local values
      try {
        result.position = posProp.valueAtTime(time, false);
        result.scale = scaleProp.valueAtTime(time, false);
        result.rotation = rotProp ? rotProp.valueAtTime(time, false) : 0;
      } catch (_) {}
    } finally {
      // Restore original expressions
      try { posProp.expression = origPosExpr; } catch (_) {}
      try { scaleProp.expression = origScaleExpr; } catch (_) {}
      try { if (rotProp) rotProp.expression = origRotExpr; } catch (_) {}
    }
    
    return result;
  }

  // Apply world transform values and clear parent
  function flattenToWorld(layer, time) {
    var world = getWorldTransform(layer, time);
    
    // Clear parent first
    layer.parent = null;
    
    // Apply world values
    try {
      if (world.position) {
        var posProp = layer.transform.position;
        posProp.expression = ""; // Clear any expression
        posProp.setValue(world.position);
      }
    } catch (_) {}
    
    try {
      if (world.scale) {
        var scaleProp = layer.transform.scale;
        scaleProp.expression = "";
        scaleProp.setValue(world.scale);
      }
    } catch (_) {}
    
    try {
      if (world.rotation !== null) {
        var rotProp = layer.transform.rotation;
        if (rotProp) {
          rotProp.expression = "";
          rotProp.setValue(world.rotation);
        }
      }
    } catch (_) {}
  }


  // Main processing function
  processButton.onClick = function() {
    try {
      // Validate project state
      if (!app.project) {
        statusText.text = "Error: No project open";
        return;
      }

      var comp = app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        statusText.text = "Error: No active composition";
        return;
      }

      if (comp.selectedLayers.length === 0) {
        statusText.text = "Error: No layer selected";
        return;
      }

      // Collect all selected text layers
      var srcLayers = [];
      var srcLayerData = []; // store original text/font per layer
      for (var s = 0; s < comp.selectedLayers.length; s++) {
        var sel = comp.selectedLayers[s];
        var selTextProp = sel ? sel.property("Source Text") : null;
        if (sel && selTextProp !== null) {
          var layerInfo = {
            layer: sel,
            name: sel.name,
            sourceText: "",
            sourceFont: "",
            wordCount: 1
          };
          try {
            var baseDoc = selTextProp.value;
            if (baseDoc && baseDoc.text !== undefined) {
              layerInfo.sourceText = baseDoc.text;
              layerInfo.wordCount = countWords(baseDoc.text);
            }
            if (baseDoc && baseDoc.font !== undefined) {
              layerInfo.sourceFont = baseDoc.font;
            }
          } catch (baseErr) {
            // ignore
          }
          srcLayers.push(sel);
          srcLayerData.push(layerInfo);
        }
      }

      if (srcLayers.length === 0) {
        statusText.text = "Error: No text layers selected";
        return;
      }

      statusText.text = "Processing " + srcLayers.length + " layer(s)...";

      var fps = comp.frameRate;
      var numLanguages = LANGUAGES.length;
      var numSourceLayers = srcLayers.length;

      // Create output composition
      var outComp = app.project.items.addComp(
        comp.name + "_LANG",
        comp.width,
        comp.height,
        comp.pixelAspect,
        numLanguages / fps,
        fps
      );

      // Copy comp settings
      outComp.bgColor = comp.bgColor;
      outComp.displayStartTime = comp.displayStartTime;

      app.beginUndoGroup("Create Language Comp");

      var missingFonts = [];

      // Process each language
      for (var i = 0; i < LANGUAGES.length; i++) {
        var langEntry = LANGUAGES[i];
        var langCode = langEntry.code;

        // Duplicate ALL source layers for this language
        for (var layerIdx = 0; layerIdx < srcLayers.length; layerIdx++) {
          var srcLayer = srcLayers[layerIdx];
          var srcData = srcLayerData[layerIdx];

          // Get lorem text matching the source layer's word count
          var text = getLoremText(langCode, srcData.wordCount);

          // Duplicate source layer to output comp; flatten world transform, bake expressions
          var temp = null;
          var lyr = null;
          try {
            temp = srcLayer.duplicate();   // duplicate in source comp
            flattenToWorld(temp, 0);       // compute world transform, clear parent, apply world values
            bakeAndFreezeExpressions(temp, 0);  // bake remaining expressions at frame 0, then clear them

            var beforeCount = outComp.numLayers;
            var moved = temp.copyToComp(outComp); // returns layer or null depending on AE version
            var afterCount = outComp.numLayers;

            // Resolve the copied layer reference
            if (moved) {
              lyr = moved;
            } else if (afterCount > beforeCount) {
              // copyToComp inserts at top (index 1)
              lyr = outComp.layer(1);
            }

            // Clean up temp copy in source comp
            if (temp && temp.remove) {
              try { temp.remove(); } catch (_) {}
            }
          } catch (dupErr) {
            if (temp && temp.remove) {
              try { temp.remove(); } catch (_) {}
            }
            missingFonts.push(langCode + " - " + srcData.name + " (duplication failed)");
            continue;
          }

          if (!lyr) {
            missingFonts.push(langCode + " - " + srcData.name + " (duplication failed)");
            continue;
          }

          // Remove ALL keyframes from the layer and set opacity to 100
          removeAllKeyframes(lyr);
          try {
            var opacityProp = lyr.property("Transform").property("Opacity");
            if (opacityProp) {
              opacityProp.setValue(100);
            }
          } catch (opErr) {
            // ignore opacity cleanup failures
          }

          // Name layers: langCode + original name for clarity when multiple layers
          if (numSourceLayers > 1) {
            lyr.name = langCode + " - " + srcData.name;
          } else {
            lyr.name = langCode;
          }
          
          // Set timing: one frame per language (all layers for same language share timing)
          var frameTime = i / fps;
          lyr.startTime = frameTime;
          lyr.outPoint = frameTime + (1 / fps);
          
          // Ensure layer is not parented
          lyr.parent = null;

          // Update text properties
          var textProp = lyr.property("Source Text");
          if (textProp && textProp.canSetExpression) {
            // Remove expression if present
            try {
              textProp.expression = "";
            } catch (e) {
              // Expression might not be removable, continue
            }
          }

          var textDoc = textProp.value;
          if (textDoc) {
            // Simple approach: set font first, then text, then direction
            var targetFont = langEntry.font || "";
            
            // Set font FIRST (before text) if we have a target font
            if (targetFont) {
              try {
                // For stubborn fonts: set ASCII placeholder, apply font, then set real text
                textDoc.text = "X";
                textDoc.font = targetFont;
                textProp.setValue(textDoc);
                
                // Now get fresh doc and set the real text
                textDoc = textProp.value;
                textDoc.text = text;
              } catch (fontErr) {
                missingFonts.push(langCode + " - " + srcData.name + " (" + targetFont + ")");
                textDoc.text = text;
              }
            } else {
              // No target font, just set text
              textDoc.text = text;
            }
            
            // Set direction and justification for Arabic
            try {
              if (langCode === "AR") {
                textDoc.direction = ParagraphDirection.RIGHT_TO_LEFT;
                textDoc.justification = ParagraphJustification.RIGHT_JUSTIFY;
              }
            } catch (dirErr) {
              // Skip if not supported
            }
            
            // Apply changes
            textProp.setValue(textDoc);
            
            // Verify font was applied (if we had a target)
            if (targetFont) {
              var appliedFont = textProp.value.font || "";
              if (appliedFont !== targetFont) {
                missingFonts.push(langCode + " - " + srcData.name + " (wanted: " + targetFont + ", got: " + appliedFont + ")");
              }
            }
          }
        } // end layer loop
      } // end language loop

      app.endUndoGroup();
      
      // Open the new comp
      outComp.openInViewer();
      var totalLayers = numLanguages * numSourceLayers;
      if (missingFonts.length > 0) {
        statusText.text = "Complete with font issues: " + missingFonts.join(", ");
        alert("Some fonts could not be applied:\n" + missingFonts.join("\n"));
      } else {
        statusText.text = "Complete: " + numLanguages + " langs × " + numSourceLayers + " layers = " + totalLayers + " total";
      }

    } catch (e) {
      statusText.text = "Error: " + e.toString();
      alert("Error: " + e.toString() + "\nLine: " + e.line);
    }
  };

  // Show panel
  if (panel instanceof Window) {
    panel.show();
  } else {
    panel.layout.layout(true);
  }

})(this);
