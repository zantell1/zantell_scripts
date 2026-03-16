// ============================================================
// LocaleFont
// Requires: JavaScript expression engine (File > Project Settings)
//
// Drop on the Source Text property of any text layer.
// Detects the script of the layer's own text, pulls the correct
// font FAMILY from the appropriate language precomp, and keeps
// the layer's current font WEIGHT.
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
//      Set each locale layer to any weight of the correct font —
//      only the family name is used; weight comes from this layer.
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

// Read this layer's weight BEFORE any mutation to avoid a self-poisoning loop
// (where a previous frame's substituted font gets used as the weight source).
var myFont     = text.sourceText.style.font;
var myParts    = myFont.split("-");
var fontWeight = myParts[myParts.length - 1];

var compFont   = targetLayer
    ? targetLayer.text.sourceText.style.font
    : myFont;
var compParts  = compFont.split("-");
var fontFamily = compParts.slice(0, compParts.length - 1).join("-") || compFont;

text.sourceText.style
    .setFont(fontFamily + "-" + fontWeight)
    .setText(txt);
