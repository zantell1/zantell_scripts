// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Place on the Source Text property of layers named "Language - N".
// Plainly_CourseOrder must contain a comma-separated list, e.g.:
//   English, Arabic, Hindi, Japanese
// ============================================================

var srcLayer = thisComp.layer("Plainly_CourseOrder");
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

// Build the style chain incrementally so each optional property is
// only applied if the source actually has a defined value for it.
var s = text.sourceText.style;

s = s.setFont(srcStyle.font);
s = s.setFontSize(srcStyle.fontSize);

if (srcStyle.applyFill     !== undefined) s = s.setApplyFill(srcStyle.applyFill);
if (srcStyle.fillColor     !== undefined) s = s.setFillColor(srcStyle.fillColor);
if (srcStyle.applyStroke   !== undefined) s = s.setApplyStroke(srcStyle.applyStroke);
if (srcStyle.strokeColor   !== undefined) s = s.setStrokeColor(srcStyle.strokeColor);
if (srcStyle.strokeWidth   !== undefined) s = s.setStrokeWidth(srcStyle.strokeWidth);
if (srcStyle.tracking      !== undefined) s = s.setTracking(srcStyle.tracking);
if (srcStyle.leading       !== undefined) s = s.setLeading(srcStyle.leading);
if (srcStyle.baselineShift !== undefined) s = s.setBaselineShift(srcStyle.baselineShift);
if (srcStyle.fauxBold      !== undefined) s = s.setFauxBold(srcStyle.fauxBold);
if (srcStyle.fauxItalic    !== undefined) s = s.setFauxItalic(srcStyle.fauxItalic);
if (srcStyle.allCaps       !== undefined) s = s.setAllCaps(srcStyle.allCaps);
if (srcStyle.smallCaps     !== undefined) s = s.setSmallCaps(srcStyle.smallCaps);

s.setText(resultText);
