// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Place on the Source Text property of layers named "Language - N".
// Plainly_CourseOrder must contain a comma-separated list, e.g.:
//   English, Arabic, Hindi, Japanese
//
// Picks the Nth item and inherits ALL text styling from
// Plainly_CourseOrder via the Style API.
// ============================================================

var srcLayer = thisComp.layer("Plainly_CourseOrder");

// When accessed from another layer's expression, text.sourceText
// auto-evaluates to a TextDocument — no .value unwrap needed.
var srcDoc   = srcLayer.text.sourceText;
var csvText  = srcDoc.text || String(srcDoc);
var srcStyle = srcDoc.style;

// Parse CSV and resolve this layer's item from its name ("Language - N")
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);
var arrayIndex = layerNum - 1;

var resultText = (arrayIndex >= 0 && arrayIndex < langArray.length)
    ? langArray[arrayIndex].trim()
    : "error";

// Apply text + all styling from Plainly_CourseOrder using the Style API.
// setText() must come last in the chain.
text.sourceText.style
    .setFont(srcStyle.font)
    .setFontSize(srcStyle.fontSize)
    .setFillColor(srcStyle.fillColor)
    .setApplyFill(srcStyle.applyFill)
    .setApplyStroke(srcStyle.applyStroke)
    .setStrokeColor(srcStyle.strokeColor)
    .setStrokeWidth(srcStyle.strokeWidth)
    .setTracking(srcStyle.tracking)
    .setLeading(srcStyle.leading)
    .setBaselineShift(srcStyle.baselineShift)
    .setFauxBold(srcStyle.fauxBold)
    .setFauxItalic(srcStyle.fauxItalic)
    .setAllCaps(srcStyle.allCaps)
    .setSmallCaps(srcStyle.smallCaps)
    .setText(resultText);
