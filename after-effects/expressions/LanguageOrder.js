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

var srcLayer = thisComp.layer("Plainly_CourseOrder");

// ---- 1. Extract raw TextProperty / TextDocument (cross-engine safe) ----
// Legacy expression engine: srcRaw IS a string or TextDocument.
// JS expression engine:      srcRaw is a TextProperty; .value gives TextDocument.
var srcRaw = srcLayer.text.sourceText;
var srcDoc = null;
var csvText = "";

if (typeof srcRaw === "string") {
    csvText = srcRaw;
    // No TextDocument available — styling copy will be skipped gracefully.
} else if (srcRaw && srcRaw.text !== undefined) {
    // Legacy engine returns TextDocument directly.
    srcDoc  = srcRaw;
    csvText = srcRaw.text;
} else if (srcRaw && srcRaw.value !== undefined) {
    // JS engine: unwrap TextProperty → TextDocument.
    srcDoc  = srcRaw.value;
    csvText = (srcDoc && srcDoc.text !== undefined) ? srcDoc.text : String(srcDoc);
} else {
    csvText = String(srcRaw);
}

// ---- 2. Parse CSV and resolve this layer's item ----
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);
var arrayIndex = layerNum - 1;

var resultText = (arrayIndex >= 0 && arrayIndex < langArray.length)
    ? langArray[arrayIndex].trim()
    : "error";

// ---- 3. Build styled TextDocument ----
// Start from this layer's own pre-expression document so any local
// keyframes / overrides are preserved as a base.
var doc = text.sourceText;

// Apply the resolved text content.
doc.text = resultText;

// Copy all available styling from Plainly_CourseOrder.
// Each property is wrapped in try/catch so a missing property on
// older AE versions never kills the whole expression.
if (srcDoc !== null) {
    try { doc.font          = srcDoc.font;          } catch(e) {}
    try { doc.fontSize      = srcDoc.fontSize;      } catch(e) {}
    try { doc.fillColor     = srcDoc.fillColor;     } catch(e) {}
    try { doc.strokeColor   = srcDoc.strokeColor;   } catch(e) {}
    try { doc.strokeWidth   = srcDoc.strokeWidth;   } catch(e) {}
    try { doc.tracking      = srcDoc.tracking;      } catch(e) {}
    try { doc.leading       = srcDoc.leading;       } catch(e) {}
    try { doc.baselineShift = srcDoc.baselineShift; } catch(e) {}
    try { doc.justification = srcDoc.justification; } catch(e) {}
    try { doc.fauxBold      = srcDoc.fauxBold;      } catch(e) {}
    try { doc.fauxItalic    = srcDoc.fauxItalic;    } catch(e) {}
    try { doc.allCaps       = srcDoc.allCaps;       } catch(e) {}
    try { doc.smallCaps     = srcDoc.smallCaps;     } catch(e) {}
}

doc;
