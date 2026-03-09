// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Setup:
//   1. Add Effect > Expression Controls > Dropdown Menu Control
//      to this layer. Name it "Font Context".
//      Set items to:  App | Marketing | Feather
//
//   2. In :: LANGUAGE COMP, name layers as:
//      {LOCALE}-App        e.g. AR-App, JA-App, EN-App
//      {LOCALE}-Marketing  e.g. AR-Marketing, EN-Marketing
//      {LOCALE}-Feather    e.g. EN-Feather
//      (Feather is Latin-only; non-Latin automatically falls back to App)
//
//   3. Plainly_CourseOrder layer contains a comma-separated list:
//      English, مرحبا, नमस्ते, こんにちは
// ============================================================

footage("Duolingo_locale_engine.jsx").sourceData;

// ---- Read context from Dropdown Menu Control on this layer ----
var contextItems = ["App", "Marketing", "Feather"];
var contextIdx   = effect("Font Context")(1); // 1-based index
var context      = contextItems[contextIdx - 1] || "App";

// ---- Read CSV and resolve this layer's text ----
var srcDoc     = thisComp.layer("Plainly_CourseOrder").text.sourceText;
var csvText    = srcDoc.text || String(srcDoc);
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);
var arrayIndex = layerNum - 1;

var resultText = (arrayIndex >= 0 && arrayIndex < langArray.length)
    ? langArray[arrayIndex].trim()
    : "error";

// ---- Detect locale and look up font ----
var locale    = duo_detect_locale(resultText);
var langComp  = comp(":: LANGUAGE COMP");

// Try the requested context first; if the layer doesn't exist
// (e.g. Feather has no Arabic variant), fall back to App.
var targetLayer = null;
try { targetLayer = langComp.layer(locale + "-" + context); } catch(e) {}
if (!targetLayer) {
    try { targetLayer = langComp.layer(locale + "-App"); } catch(e) {}
}

var targetFont = targetLayer
    ? targetLayer.text.sourceText.style.font
    : srcDoc.style.font; // last resort: whatever the CSV layer uses

// ---- Apply ----
text.sourceText.style
    .setFont(targetFont)
    .setText(resultText);
