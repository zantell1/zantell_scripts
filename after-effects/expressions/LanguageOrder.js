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

// JS engine: text.sourceText is a TextProperty.
// .value.text gives the plain string; .style gives the style object.
var csvText  = srcLayer.text.sourceText.value.text;
var srcStyle = srcLayer.text.sourceText.style;

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
