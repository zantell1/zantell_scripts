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
//   1. Add Effect > Expression Controls > Dropdown Menu Control
//      to this layer. Name it "Font Context".
//      Set items to:  App | Marketing | Feather
//
//   2. In :: LANGUAGE COMP, name layers as {LOCALE}-{Context}:
//      AR-App, AR-Marketing, EN-App, EN-Feather, JA-App, etc.
// ============================================================

footage("Duolingo_locale_engine.jsx").sourceData;

// ---- Context dropdown ----
var contextItems = ["App", "Marketing", "Feather"];
var contextIdx   = effect("Font Context")(1);
var context      = contextItems[contextIdx - 1] || "App";

// ---- Read this layer's own text ----
var txt = text.sourceText;

// ---- Locale detection → font family from :: LANGUAGE COMP ----
var locale   = duo_detect_locale(txt);
var langComp = comp(":: LANGUAGE COMP");

var targetLayer = null;
try { targetLayer = langComp.layer(locale + "-" + context); } catch(e) {}
if (!targetLayer) {
    try { targetLayer = langComp.layer(locale + "-App"); } catch(e) {}
}

var compFont   = targetLayer
    ? targetLayer.text.sourceText.style.font
    : text.sourceText.style.font;
var compParts  = compFont.split("-");
var fontFamily = compParts.slice(0, compParts.length - 1).join("-") || compFont;

// ---- Weight from this layer's own current font ----
var myParts    = text.sourceText.style.font.split("-");
var fontWeight = myParts[myParts.length - 1];

// ---- Apply font, preserve text content ----
text.sourceText.style
    .setFont(fontFamily + "-" + fontWeight)
    .setText(txt);
