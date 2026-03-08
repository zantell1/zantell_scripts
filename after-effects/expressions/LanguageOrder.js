// ============================================================
// LanguageOrder
// Place this expression on the Source Text property of any
// layer named "Language - N" (e.g. "Language - 1", "Language - 2").
//
// Plainly_CourseOrder layer must contain a comma-separated list
// of language names, e.g.:  English, Arabic, Hindi, Japanese
//
// The expression picks the Nth item and inherits ALL text
// styling (font, size, color, tracking, etc.) from that layer.
// ============================================================

var _src = thisComp.layer("Plainly_CourseOrder").text.sourceText;

// ---- Extract TextDocument + CSV string (cross-engine safe) ----
// Legacy engine: _src is a string or TextDocument.
// JS engine:     _src is a TextProperty; .value gives the TextDocument.
var csvText = "";
var srcDoc  = null;

if (typeof _src === "string") {
    csvText = _src;
} else if (_src && _src.text !== undefined) {
    // Legacy engine — _src IS the TextDocument.
    srcDoc  = _src;
    csvText = _src.text;
} else if (_src && _src.value !== undefined) {
    // JS engine — unwrap TextProperty → TextDocument.
    srcDoc  = _src.value;
    csvText = (srcDoc && srcDoc.text !== undefined) ? srcDoc.text : String(srcDoc);
} else {
    csvText = String(_src);
}

// ---- Parse CSV and resolve this layer's item ----
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);
var arrayIndex = layerNum - 1;

var resultText = (arrayIndex >= 0 && arrayIndex < langArray.length)
    ? langArray[arrayIndex].trim()
    : "error";

// ---- Return result ----
// If we have a TextDocument, write the new text into it and return it —
// AE will use all the styling from Plainly_CourseOrder automatically.
// Modifying srcDoc is safe: .value returns a copy, not a live reference.
if (srcDoc !== null) {
    srcDoc.text = resultText;
    srcDoc;
} else {
    // Fallback: return plain string (layer's own styling is kept by AE).
    resultText;
}
