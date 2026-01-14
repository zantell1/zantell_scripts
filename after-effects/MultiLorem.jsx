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

  // Text length dropdown
  var lengthGroup = panel.add("group");
  lengthGroup.orientation = "row";
  lengthGroup.alignment = "left";
  lengthGroup.add("statictext", undefined, "Text Length:");
  var lengthDropdown = lengthGroup.add("dropdownlist", undefined, ["Single Word", "Short Sentence", "Long Sentence"]);
  lengthDropdown.selection = 0; // Default to "Single Word"

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

  // Default source text fallback (populated from selected layer)
  var defaultSourceText = "";
  var defaultSourceFont = "";

  // Sample text data
  var sampleTexts = {
    "single": {
      "EN": "Hello",
      "AR": "\u0645\u0631\u062D\u0628\u0627",
      "BN": "\u09B9\u09CD\u09AF\u09BE\u09B2\u09CB",
      "CS": "Ahoj",
      "DE": "Hallo",
      "EL": "\u0393\u03B5\u03B9\u03B1",
      "ES": "Hola",
      "FR": "Bonjour",
      "HI": "\u0928\u092E\u0938\u094D\u0924\u0947",
      "HU": "Szia",
      "ID": "Halo",
      "IT": "Ciao",
      "JA": "\u3053\u3093\u306B\u3061\u306F",
      "KO": "\uC548\uB155\uD558\uC138\uC694",
      "NL": "Hoi",
      "PL": "Cze\u015B\u0107",
      "PT": "Ol\u00e1",
      "RO": "Salut",
      "RU": "\u041f\u0440\u0438\u0432\u0435\u0442",
      "SV": "Hej",
      "TA": "\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD",
      "TE": "\u0C39\u0C32\u0C4B",
      "TH": "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35",
      "TL": "Kumusta",
      "TR": "Merhaba",
      "UK": "\u041f\u0440\u0438\u0432\u0456\u0442",
      "VI": "Xin ch\u00e0o",
      "ZH-CN": "\u4F60\u597D",
      "ZH-TW": "\u4F60\u597D"
    },
    "short": {
      "EN": "The quick brown fox",
      "AR": "\u0627\u0644\u062B\u0639\u0644\u0628 \u0627\u0644\u0628\u0646\u064A \u0627\u0644\u0633\u0631\u064A\u0639",
      "BN": "\u09A6\u09CD\u09B0\u09C1\u09A4 \u09AC\u09BE\u09A6\u09BE\u09AE\u09C0 \u09B6\u09BF\u09DF\u09BE\u09B2",
      "CS": "Rychl\u00e1 hn\u011bd\u00e1 li\u0161ka",
      "DE": "Der schnelle braune Fuchs",
      "EL": "\u0397 \u03b3\u03c1\u03ae\u03b3\u03bf\u03c1\u03b7 \u03ba\u03b1\u03c6\u03ad \u03b1\u03bb\u03b5\u03c0\u03bf\u03cd",
      "ES": "El zorro marr\u00f3n r\u00e1pido",
      "FR": "Le renard brun rapide",
      "HI": "\u0924\u0947\u091C\u093c \u092D\u0942\u0930\u0940 \u0932\u094B\u092E\u0921\u093C\u0940",
      "HU": "A gyors barna r\u00f3ka",
      "ID": "Rubah cokelat cepat",
      "IT": "La volpe marrone veloce",
      "JA": "\u7d20\u65e9\u3044\u8336\u8272\u306e\u72d0",
      "KO": "\ube60\ub978 \uac08\uc0c9 \uc5b4\ub978",
      "NL": "De snelle bruine vos",
      "PL": "Szybki br\u0105zowy lis",
      "PT": "A raposa marrom r\u00e1pida",
      "RO": "Vulpea maro rapid\u0103",
      "RU": "\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u043a\u043e\u0440\u0438\u0447\u043d\u0435\u0432\u0430\u044f \u043b\u0438\u0441\u0430",
      "SV": "Den snabba bruna r\u00e4ven",
      "TA": "\u0bb5\u0bc7\u0b95\u0bae\u0bbe\u0ba9 \u0baa\u0bb4\u0bc1\u0baa\u0bcd\u0baa\u0bc1 \u0ba8\u0bb0\u0bbf",
      "TE": "\u0C2E\u0C40\u0C15\u0C41 \u0C38\u0C4D\u0C35\u0C3E\u0C17\u0C24\u0C02",
      "TH": "\u0e2a\u0e38\u0e19\u0e31\u0e02\u0e08\u0e34\u0e49\u0e07\u0e08\u0e2d\u0e01\u0e2a\u0e35\u0e19\u0e49\u0e33\u0e15\u0e32\u0e25\u0e17\u0e35\u0e48\u0e23\u0e27\u0e14\u0e40\u0e23\u0e47\u0e27",
      "TL": "Ang mabilis na kayumangging soro",
      "TR": "H\u0131zl\u0131 kahverengi tilki",
      "UK": "\u0428\u0432\u0438\u0434\u043a\u0430 \u0440\u0443\u0434\u0430 \u043b\u0438\u0441\u0438\u0446\u044f",
      "VI": "Con c\u00e1o n\u00e2u nhanh",
      "ZH-CN": "\u654f\u6377\u7684\u68d5\u8272\u72d0\u72f8",
      "ZH-TW": "\u654f\u6377\u7684\u68d5\u8272\u72d0\u72f8"
    },
    "long": {
      "EN": "The quick brown fox jumps over the lazy dog. This longer line checks wrapping and layout behavior across frames.",
      "AR": "\u0627\u0644\u062b\u0639\u0644\u0628 \u0627\u0644\u0628\u0646\u064a \u0627\u0644\u0633\u0631\u064a\u0639 \u064a\u0642\u0641\u0632 \u0641\u0648\u0642 \u0627\u0644\u0643\u0644\u0628 \u0627\u0644\u0643\u0633\u0648\u0644. \u0647\u0630\u0627 \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u0623\u0637\u0648\u0644 \u064a\u062e\u062a\u0628\u0631 \u0627\u0644\u062a\u0641\u0627\u0641 \u0627\u0644\u0646\u0635 \u0648\u0633\u0644\u0648\u0643 \u0627\u0644\u062a\u062e\u0637\u064a\u0637 \u0639\u0628\u0631 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a.",
      "BN": "\u09a6\u09cd\u09b0\u09c1\u09a4 \u09ac\u09be\u09a6\u09be\u09ae\u09c0 \u09b6\u09bf\u09df\u09be\u09b2 \u0985\u09b2\u09b8 \u0995\u09c1\u0995\u09c1\u09b0\u09c7\u09b0 \u0989\u09aa\u09b0 \u09a6\u09bf\u09df\u09c7 \u09b2\u09be\u09ab \u09a6\u09c7\u09df\u0964 \u098f\u0987 \u09a6\u09bf\u09b0\u09cd\u0998 \u09b2\u09be\u0987\u09a8\u099f\u09bf \u099f\u09c7\u0995\u09cd\u09b8\u099f \u09ae\u09cb\u09dc\u09be\u09a8\u09cb \u098f\u09ac\u0982 \u09ac\u09bf\u09a8\u09cd\u09af\u09be\u09b8 \u09aa\u09b0\u09c0\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c7\u0964",
      "CS": "Rychl\u00e1 hn\u011bd\u00e1 li\u0161ka p\u0159esko\u010d\u00ed l\u00edn\u00e9ho psa. Tento del\u0161\u00ed \u0159\u00e1dek testuje zalomen\u00ed textu a rozvr\u017een\u00ed.",
      "DE": "Der schnelle braune Fuchs springt \u00fcber den faulen Hund. Diese l\u00e4ngere Zeile pr\u00fcft Umbruch und Layoutverhalten.",
      "EL": "\u0397 \u03b3\u03c1\u03ae\u03b3\u03bf\u03c1\u03b7 \u03ba\u03b1\u03c6\u03ad \u03b1\u03bb\u03b5\u03c0\u03bf\u03cd \u03c0\u03b7\u03b4\u03ac \u03c0\u03ac\u03bd\u03c9 \u03b1\u03c0\u03cc \u03c4\u03bf\u03bd \u03c4\u03b5\u03bc\u03c0\u03ad\u03bb\u03b7 \u03c3\u03ba\u03cd\u03bb\u03bf. \u0391\u03c5\u03c4\u03ae \u03b7 \u03bc\u03b5\u03b3\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03b7 \u03c0\u03c1\u03cc\u03c4\u03b1\u03c3\u03b7 \u03b5\u03bb\u03ad\u03b3\u03c7\u03b5\u03b9 \u03b1\u03bd\u03b1\u03b4\u03b9\u03c0\u03bb\u03ce\u03c3\u03b5\u03b9\u03c2 \u03ba\u03b1\u03b9 \u03b4\u03b9\u03ac\u03c4\u03b1\u03be\u03b7.",
      "ES": "El zorro marr\u00f3n r\u00e1pido salta sobre el perro perezoso. Esta l\u00ednea m\u00e1s larga prueba el ajuste de texto y el dise\u00f1o.",
      "FR": "Le renard brun rapide saute par-dessus le chien paresseux. Cette ligne plus longue teste le retour \u00e0 la ligne et la mise en page.",
      "HI": "\u0924\u0947\u091c\u093c \u092d\u0942\u0930\u0940 \u0932\u094b\u092e\u0921\u093c\u0940 \u0906\u0932\u0938\u0940 \u0915\u0941\u0924\u094d\u0924\u0947 \u0915\u0947 \u0909\u092a\u0930 \u0915\u0942\u0926\u0924\u0940 \u0939\u0948\u0964 \u092f\u0939 \u0932\u0902\u092c\u0940 \u092a\u0902\u0915\u094d\u0924\u093f \u091f\u0947\u0915\u094d\u0938\u094d\u091f \u0930\u0948\u092a \u0914\u0930 \u0932\u0947\u0906\u0909\u091f \u0915\u0940 \u091c\u093e\u0902\u091a \u0915\u0930\u0924\u0940 \u0939\u0948\u0964",
      "HU": "A gyors barna r\u00f3ka \u00e1tugrik a lusta kuty\u00e1n. Ez a hosszabb sor a t\u00f6rdel\u00e9st \u00e9s az elrendez\u00e9st teszteli.",
      "ID": "Rubah cokelat cepat melompati anjing malas. Baris yang lebih panjang ini menguji pembungkusan dan tata letak.",
      "IT": "La volpe marrone veloce salta sopra il cane pigro. Questa riga pi\u00f9 lunga testa il ritorno a capo e il layout.",
      "JA": "\u7d20\u65e9\u3044\u8336\u8272\u306e\u72d0\u304c\u6020\u3051\u8005\u306e\u72ac\u3092\u98db\u3073\u8d8a\u3048\u307e\u3059\u3002\u3053\u306e\u9577\u3044\u884c\u306f\u6298\u308a\u8fd4\u3057\u3068\u30ec\u30a4\u30a2\u30a6\u30c8\u3092\u78ba\u8a8d\u3057\u307e\u3059\u3002",
      "KO": "\ube60\ub978 \uac08\uc0c9 \uc5b4\ub978\uac00 \uac70\uc720\ub85c\uc6b4 \uac1c\ub97c \ub6f0\uc5b4\ub118\uc2b5\ub2c8\ub2e4. \uc774 \uae34 \ubb38\uc7a5\uc740 \uc904\ubc14\uafc8\uacfc \ub808\uc774\uc544\uc6c3\uc744 \ud655\uc778\ud569\ub2c8\ub2e4.",
      "NL": "De snelle bruine vos springt over de luie hond. Deze langere regel test afbreking en opmaak.",
      "PL": "Szybki br\u0105zowy lis przeskakuje nad leniwym psem. Ten d\u0142u\u017cszy wiersz testuje \u0142amanie tekstu i uk\u0142ad.",
      "PT": "A raposa marrom r\u00e1pida pula sobre o c\u00e3o pregui\u00e7oso. Esta linha mais longa testa a quebra e o layout.",
      "RO": "Vulpea maro rapid\u0103 sare peste c\u00e2inele lene\u015f. Aceast\u0103 linie mai lung\u0103 testeaz\u0103 \u00eencadrarea textului \u0219i layoutul.",
      "RU": "\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u043a\u043e\u0440\u0438\u0447\u043d\u0435\u0432\u0430\u044f \u043b\u0438\u0441\u0430 \u043f\u0435\u0440\u0435\u043f\u0440\u044b\u0433\u0438\u0432\u0430\u0435\u0442 \u0447\u0435\u0440\u0435\u0437 \u043b\u0435\u043d\u0438\u0432\u0443\u044e \u0441\u043e\u0431\u0430\u043a\u0443. \u042d\u0442\u0430 \u0434\u043b\u0438\u043d\u043d\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442 \u043f\u0435\u0440\u0435\u043d\u043e\u0441 \u0438 \u043c\u0430\u043a\u0435\u0442.",
      "SV": "Den snabba bruna r\u00e4ven hoppar \u00f6ver den lata hunden. Denna l\u00e4ngre rad testar radbrytning och layout.",
      "TA": "\u0bb5\u0bc7\u0b95\u0bae\u0bbe\u0ba9 \u0baa\u0bb4\u0bc1\u0baa\u0bcd\u0baa\u0bc1 \u0ba8\u0bb0\u0bbf \u0b9a\u0bcb\u0bae\u0bcd\u0baa\u0bc7\u0bb1\u0bbf \u0ba8\u0bbe\u0baf\u0bc8\u0b95\u0bcd \u0ba4\u0bbe\u0ba3\u0bcd\u0b9f\u0bc1\u0b95\u0bbf\u0bb1\u0ba4\u0bc1\u0baa\u0bcd \u0baa\u0bcb\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0ba4\u0bc1. \u0b87\u0ba8\u0bcd\u0ba4 \u0ba8\u0bc0\u0bb3\u0bae\u0bbe\u0ba9 \u0bb5\u0bb0\u0bbf \u0bae\u0bc1\u0b9f\u0bcd\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0bc1 \u0b92\u0bb0\u0bcd\u0bb5\u0bb0\u0bcd\u0b95\u0bb3\u0bc8 \u0b9a\u0bca\u0ba4\u0bbf\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0ba4\u0bc1.",
      "TE": "\u0C35\u0C47\u0C17\u0C2E\u0C48\u0C28 \u0C17\u0C4B\u0C27\u0C41\u0C2E \u0C28\u0C15\u0C4D\u0C15 \u0C38\u0C4B\u0C2E\u0C30\u0C3F \u0C15\u0C41\u0C15\u0C4D\u0C15\u0C2A\u0C48 \u0C26\u0C42\u0C15\u0C41\u0C24\u0C41\u0C02\u0C26\u0C3F. \u0C08 \u0C2A\u0C4A\u0C21\u0C35\u0C48\u0C28 \u0C2A\u0C02\u0C15\u0C4D\u0C24\u0C3F \u0C30\u0C3E\u0C2A\u0C4D \u0C2E\u0C30\u0C3F\u0C2F\u0C41 \u0C32\u0C47\u0C05\u0C4C\u0C1F\u0C4D\u200C\u0C28\u0C41 \u0C2A\u0C30\u0C40\u0C15\u0C4D\u0C37\u0C3F\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F.",
      "TH": "\u0e2a\u0e38\u0e19\u0e31\u0e02\u0e08\u0e34\u0e49\u0e07\u0e08\u0e2d\u0e01\u0e2a\u0e35\u0e19\u0e49\u0e33\u0e15\u0e32\u0e25\u0e17\u0e35\u0e48\u0e23\u0e27\u0e14\u0e40\u0e23\u0e47\u0e27\u0e01\u0e23\u0e30\u0e42\u0e14\u0e14\u0e02\u0e49\u0e32\u0e21\u0e2a\u0e38\u0e19\u0e31\u0e02\u0e08\u0e34\u0e49\u0e07\u0e08\u0e2d\u0e01\u0e02\u0e35\u0e49\u0e40\u0e01\u0e35\u0e22\u0e08 \u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14\u0e17\u0e35\u0e48\u0e22\u0e32\u0e27\u0e01\u0e27\u0e48\u0e32\u0e19\u0e35\u0e49\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e15\u0e31\u0e14\u0e04\u0e33\u0e41\u0e25\u0e30\u0e40\u0e25\u0e22\u0e4c\u0e40\u0e2d\u0e32\u0e17\u0e4c",
      "TL": "Ang mabilis na kayumangging soro ay tumatalon sa tamad na aso. Sinusubukan ng mas mahabang linyang ito ang wrap at layout.",
      "TR": "H\u0131zl\u0131 kahverengi tilki tembel k\u00f6pe\u011fin \u00fczerinden atlar. Bu daha uzun sat\u0131r kayd\u0131rma ve yerle\u015fimi test eder.",
      "UK": "\u0428\u0432\u0438\u0434\u043a\u0430 \u0440\u0443\u0434\u0430 \u043b\u0438\u0441\u0438\u0446\u044f \u0441\u0442\u0440\u0438\u0431\u0430\u0454 \u0447\u0435\u0440\u0435\u0437 \u043b\u0435\u043d\u0438\u0432\u043e\u0433\u043e \u043f\u0441\u0430. \u0426\u0435\u0439 \u0434\u043e\u0432\u0448\u0438\u0439 \u0440\u044f\u0434\u043e\u043a \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u044f\u0454 \u043f\u0435\u0440\u0435\u043d\u0435\u0441\u0435\u043d\u043d\u044f \u0439 \u043c\u0430\u043a\u0435\u0442.",
      "VI": "Con c\u00e1o n\u00e2u nhanh nh\u1ea3y qua con ch\u00f3 l\u01b0\u1eddi. D\u00f2ng d\u00e0i h\u01a1n n\u00e0y ki\u1ec3m tra xu\u1ed1ng d\u00f2ng v\u00e0 b\u1ed1 c\u1ee5c.",
      "ZH-CN": "\u654f\u6377\u7684\u68d5\u8272\u72d0\u72f8\u8df3\u8fc7\u90a3\u53ea\u61d2\u72d7\u3002\u8fd9\u884c\u66f4\u957f\uff0c\u7528\u6765\u6d4b\u8bd5\u6362\u884c\u548c\u5e03\u5c40\u8868\u73b0\u3002",
      "ZH-TW": "\u654f\u6377\u7684\u68d5\u8272\u72d0\u72f8\u8df3\u904e\u90a3\u96bb\u61f6\u72d7\u3002\u9019\u884c\u8f03\u9577\uff0c\u7528\u4f86\u6e2c\u8a66\u63db\u884c\u8207\u7248\u9762\u8868\u73fe\u3002"
    }
  };

  // Get sample text for language
  function getSampleText(langCode, lengthType) {
    var lengthKey = lengthType === 0 ? "single" : (lengthType === 1 ? "short" : "long");
    var texts = sampleTexts[lengthKey];
    
    // Return language-specific text if available, otherwise fallback
    if (texts && texts[langCode]) {
      return texts[langCode];
    }
    // Fallback to the original source text, then English, then a generic sample
    if (defaultSourceText) {
      return defaultSourceText;
    }
    return (texts && texts["EN"]) ? texts["EN"] : "Sample text";
  }

  // Utility: strip expressions from a property (deep)
  function clearExprRecursive(prop) {
    if (!prop) return;
    if (prop.canSetExpression && prop.expression && prop.expression !== "") {
      try {
        prop.expression = "";
      } catch (_) {}
    }
    if (prop.numProperties) {
      for (var i = 1; i <= prop.numProperties; i++) {
        clearExprRecursive(prop.property(i));
      }
    }
  }

  function clearExpressions(layer) {
    if (!layer) return;
    clearExprRecursive(layer);
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
            sourceFont: ""
          };
          try {
            var baseDoc = selTextProp.value;
            if (baseDoc && baseDoc.text !== undefined) {
              layerInfo.sourceText = baseDoc.text;
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

      // For fallback text, use first layer
      defaultSourceText = srcLayerData[0].sourceText;
      defaultSourceFont = srcLayerData[0].sourceFont;

      statusText.text = "Processing " + srcLayers.length + " layer(s)...";

      // Get text length selection
      var lengthType = lengthDropdown.selection.index;
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

        // Get sample text
        var text = getSampleText(langCode, lengthType);

        // Duplicate ALL source layers for this language
        for (var layerIdx = 0; layerIdx < srcLayers.length; layerIdx++) {
          var srcLayer = srcLayers[layerIdx];
          var srcData = srcLayerData[layerIdx];

          // Duplicate source layer to output comp; clear parent and expressions to avoid copy errors
          var temp = null;
          var lyr = null;
          try {
            temp = srcLayer.duplicate();   // duplicate in source comp
            temp.parent = null;            // clear parenting
            clearExpressions(temp);        // strip expressions before move

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

          // Remove keyframes and set opacity to 100
          try {
            var opacityProp = lyr.property("Transform").property("Opacity");
            if (opacityProp) {
              if (opacityProp.isTimeVarying) {
                while (opacityProp.numKeys > 0) {
                  opacityProp.removeKey(1);
                }
              }
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
