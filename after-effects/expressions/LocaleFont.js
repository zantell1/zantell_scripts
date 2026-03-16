// ============================================================
// LocaleFont
// Requires: JavaScript expression engine (File > Project Settings)
//
// Drop on the Source Text property of any text layer.
// Detects the script of the layer's own text, pulls the correct
// font family from :: LANGUAGE COMP, and keeps the layer's
// current font weight.
//
// Setup:
//   1. Add three Checkbox Controls to this layer:
//        AutoFont: App              (always present, implied default)
//        AutoFont: Marketing        (check to use Marketing fonts)
//        AutoFont: Marketing-Feather (check to use Feather for Latin)
//      Use PlainlySuite > Auto Font to add these automatically.
//
//   2. Three precomps, each with layers named by locale code
//      (AR, EN, JA, KO, HI, etc.):
//        :: LANGUAGE COMP_APP
//        :: LANGUAGE COMP_MARKETING
//        :: LANGUAGE COMP_FEATHER
// ============================================================

footage("Duolingo_locale_engine.jsx").sourceData;

// Context: Marketing-Feather > Marketing > App (last checked wins)
var context = "App";
try { if (effect("AutoFont: Marketing")(1))         context = "Marketing";         } catch(e) {}
try { if (effect("AutoFont: Marketing-Feather")(1)) context = "Marketing-Feather"; } catch(e) {}

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

var compFont   = targetLayer
    ? targetLayer.text.sourceText.style.font
    : text.sourceText.style.font;
var compParts  = compFont.split("-");
var fontFamily = compParts.slice(0, compParts.length - 1).join("-") || compFont;

var myParts    = text.sourceText.style.font.split("-");
var fontWeight = myParts[myParts.length - 1];

text.sourceText.style
    .setFont(fontFamily + "-" + fontWeight)
    .setText(txt);
