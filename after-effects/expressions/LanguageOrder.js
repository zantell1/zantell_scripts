// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Drop on the Source Text of a layer named "Language - N".
// Pulls the Nth item from a CSV source layer, detects its locale,
// and applies the correct font from the language comp.
//
// Setup:
//   1. Add the "Duo AutoFont" Dropdown Menu Control effect to this
//      layer (use PlainlySuite > Auto Font, or apply DuoAutoFont.ffx).
//      Items: App | Marketing | Marketing-Feather
//
//   2. Three precomps, each with layers named by locale code
//      (AR, EN, JA, KO, HI, etc.):
//        :: LANGUAGE COMP_APP
//        :: LANGUAGE COMP_MARKETING
//        :: LANGUAGE COMP_FEATHER
//
//      Set each locale layer to the exact font + weight you want.
//      The expression uses the full PostScript name directly.
//
//   3. A CSV source layer (e.g. EDIT_CourseOrder_bold) containing
//      a comma-separated list: English, مرحبا, नमस्ते, こんにちは
// ============================================================

footage("Duolingo_locale_engine.jsx").sourceData;

// ---- Context dropdown ----
var contextItems = ["App", "Marketing", "Marketing-Feather"];
var contextIdx   = effect("Duo AutoFont")(1);
var context      = contextItems[contextIdx - 1] || "App";

var compNames = {
    "App":               ":: LANGUAGE COMP_APP",
    "Marketing":         ":: LANGUAGE COMP_MARKETING",
    "Marketing-Feather": ":: LANGUAGE COMP_FEATHER"
};

// ---- CSV → resolved text ----
var _csvDoc    = thisComp.layer("EDIT_CourseOrder_bold").text.sourceText;
var csvText    = _csvDoc.text || String(_csvDoc);
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);

var resultText = (layerNum > 0 && layerNum - 1 < langArray.length)
    ? langArray[layerNum - 1].trim()
    : "error";

// ---- Locale detection → font from language comp ----
var locale = duo_detect_locale(resultText);

var targetLayer = null;
var _find_layer = function (compName, layerName) {
    try { return comp(compName).layer(layerName); } catch(e) { return null; }
};

targetLayer = _find_layer(compNames[context], locale);

if (!targetLayer && context === "Marketing-Feather") {
    targetLayer = _find_layer(compNames["Marketing"], locale);
}
if (!targetLayer) {
    targetLayer = _find_layer(compNames["App"], locale);
}

// Use the exact font name from the language comp — no weight recombination.
var finalFont = targetLayer
    ? targetLayer.text.sourceText.style.font
    : text.sourceText.style.font;

// ---- Apply ----
text.sourceText.style
    .setFont(finalFont)
    .setText(resultText);
