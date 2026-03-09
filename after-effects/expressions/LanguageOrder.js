// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Setup:
//   1. Add Effect > Expression Controls > Dropdown Menu Control
//      to this layer. Name it "Font Context".
//      Set items to:  App | Marketing | Feather
//
//   2. In :: LANGUAGE COMP, name layers as {LOCALE}-{Context}:
//      AR-App, AR-Marketing, EN-App, EN-Feather, JA-App, etc.
//      The font set on each layer only needs to use any weight —
//      this expression will swap in the weight from the current layer.
//
//   3. Plainly_CourseOrder contains a comma-separated list:
//      English, مرحبا, नमस्ते, こんにちは
//
// Font weight is inherited from whatever this text layer is set to.
// Font family comes from :: LANGUAGE COMP based on locale + context.
// ============================================================

footage("Duolingo_locale_engine.jsx").sourceData;

// ---- Context dropdown ----
var contextItems = ["App", "Marketing", "Feather"];
var contextIdx   = effect("Font Context")(1);
var context      = contextItems[contextIdx - 1] || "App";

// ---- CSV → resolved text ----
var srcDoc     = thisComp.layer("Plainly_CourseOrder").text.sourceText;
var csvText    = srcDoc.text || String(srcDoc);
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);
var arrayIndex = layerNum - 1;

var resultText = (arrayIndex >= 0 && arrayIndex < langArray.length)
    ? langArray[arrayIndex].trim()
    : "error";

// ---- Locale detection → font family from :: LANGUAGE COMP ----
var locale   = duo_detect_locale(resultText);
var langComp = comp(":: LANGUAGE COMP");

var targetLayer = null;
try { targetLayer = langComp.layer(locale + "-" + context); } catch(e) {}
if (!targetLayer) {
    try { targetLayer = langComp.layer(locale + "-App"); } catch(e) {}
}

// Extract font FAMILY from the language comp layer (everything before the last hyphen).
// e.g. "NotoSansArabic-Bold" → "NotoSansArabic"
var compFont    = targetLayer
    ? targetLayer.text.sourceText.style.font
    : srcDoc.style.font;
var compParts   = compFont.split("-");
var fontFamily  = compParts.slice(0, compParts.length - 1).join("-") || compFont;

// Extract font WEIGHT from this layer's own current font (everything after the last hyphen).
// e.g. "DuolingoSans-Regular" → "Regular"
var myFont      = text.sourceText.style.font;
var myParts     = myFont.split("-");
var fontWeight  = myParts[myParts.length - 1];

// Recombine: family from the language comp, weight from this layer.
var finalFont   = fontFamily + "-" + fontWeight;

// ---- Apply ----
text.sourceText.style
    .setFont(finalFont)
    .setText(resultText);
