// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Place on the Source Text property of layers named "Language - N".
// Plainly_CourseOrder must contain a comma-separated list, e.g.:
//   English, مرحبا, नमस्ते, こんにちは
//
// Each layer independently detects its own locale and pulls the
// correct font from :: LANGUAGE COMP — no per-word style needed
// on the CSV layer.
// ============================================================

// Load locale detection engine
footage("Duolingo_locale_engine.jsx").sourceData;

// Read CSV from Plainly_CourseOrder
var srcDoc  = thisComp.layer("Plainly_CourseOrder").text.sourceText;
var csvText = srcDoc.text || String(srcDoc);

// Parse CSV and resolve this layer's item from its name ("Language - N")
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);
var arrayIndex = layerNum - 1;

var resultText = (arrayIndex >= 0 && arrayIndex < langArray.length)
    ? langArray[arrayIndex].trim()
    : "error";

// Detect the script/locale of this specific word and look up its font
var locale     = duo_detect_locale(resultText);
var langComp   = comp(":: LANGUAGE COMP");
var targetFont = langComp.layer(locale).text.sourceText.style.font;

// Apply — font is per-word from locale detection, all other styling
// (size, color, tracking, etc.) comes from this layer's own properties.
text.sourceText.style
    .setFont(targetFont)
    .setText(resultText);
