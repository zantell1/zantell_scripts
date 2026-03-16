// ============================================================
// LocaleFont
// Requires: JavaScript expression engine (File > Project Settings)
//
// Drop on the Source Text property of any text layer.
// Detects the script of the layer's own text, pulls the correct
// font from the appropriate language precomp, and applies it.
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
//      Set each locale layer to the exact font + weight you want
//      (e.g. NotoSansArabic-Regular on AR). The expression uses
//      the full PostScript name directly — no weight recombination.
// ============================================================

footage("Duolingo_locale_engine.jsx").sourceData;

var contextItems = ["App", "Marketing", "Marketing-Feather"];
var contextIdx   = effect("Duo AutoFont")(1);
var context      = contextItems[contextIdx - 1] || "App";

var compNames = {
    "App":               ":: LANGUAGE COMP_APP",
    "Marketing":         ":: LANGUAGE COMP_MARKETING",
    "Marketing-Feather": ":: LANGUAGE COMP_FEATHER"
};

var txt    = text.sourceText;
var locale = duo_detect_locale(txt);

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
// If AE can't find a recombined name (e.g. variable fonts), it silently
// falls back to a system font (Damascus, etc.).  Using the full name as-is
// avoids this entirely.
var finalFont = targetLayer
    ? targetLayer.text.sourceText.style.font
    : text.sourceText.style.font;

text.sourceText.style
    .setFont(finalFont)
    .setText(txt);
