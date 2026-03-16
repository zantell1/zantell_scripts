// ============================================================
// LocaleFont
// Requires: JavaScript expression engine (File > Project Settings)
//
// Drop on the Source Text property of any text layer.
// Detects the script of the layer's own text, pulls the correct
// font family from the appropriate language precomp, and keeps
// the layer's current font weight.
//
// Setup:
//   1. Add Effect > Expression Controls > Dropdown Menu Control
//      to this layer. Name it "Duo AutoFont".
//      Set items to:  App | Marketing | Marketing-Feather
//
//   2. Three precomps, each with layers named by locale code
//      (AR, EN, JA, KO, HI, etc.):
//        :: LANGUAGE COMP_APP
//        :: LANGUAGE COMP_MARKETING
//        :: LANGUAGE COMP_FEATHER
//      If a locale layer is missing from FEATHER, falls back to
//      MARKETING. If missing from MARKETING, falls back to APP.
// ============================================================

footage("Duolingo_locale_engine.jsx").sourceData;

// ---- Context dropdown → comp name ----
var contextItems = ["App", "Marketing", "Marketing-Feather"];
var contextIdx   = effect("Duo AutoFont")(1);
var context      = contextItems[contextIdx - 1] || "App";

var compNames = {
    "App":               ":: LANGUAGE COMP_APP",
    "Marketing":         ":: LANGUAGE COMP_MARKETING",
    "Marketing-Feather": ":: LANGUAGE COMP_FEATHER"
};

// ---- Read this layer's own text ----
var txt    = text.sourceText;
var locale = duo_detect_locale(txt);

// ---- Look up font from the right precomp, with fallback chain ----
// Marketing-Feather → FEATHER → MARKETING → APP
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

// ---- Build final font: family from precomp, weight from this layer ----
var compFont   = targetLayer
    ? targetLayer.text.sourceText.style.font
    : text.sourceText.style.font;
var compParts  = compFont.split("-");
var fontFamily = compParts.slice(0, compParts.length - 1).join("-") || compFont;

var myParts    = text.sourceText.style.font.split("-");
var fontWeight = myParts[myParts.length - 1];

// ---- Apply ----
text.sourceText.style
    .setFont(fontFamily + "-" + fontWeight)
    .setText(txt);
