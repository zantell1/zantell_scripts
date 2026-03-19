// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Drop on the Source Text of a layer named "Language - N".
// Pulls the Nth item from a CSV source layer, detects its locale,
// and applies the exact font from the matching language comp layer.
//
// Setup:
//   1. Add the "Duo AutoFont" Dropdown Menu Control effect to this
//      layer (use PlainlySuite > Auto Font, or apply DuoAutoFont.ffx).
//      Items: App | Marketing | Marketing-Feather
//
//   2. Three precomps, each with layers named by locale code:
//        :: LANGUAGE COMP_APP
//        :: LANGUAGE COMP_MARKETING
//        :: LANGUAGE COMP_FEATHER
//
//   3. A CSV source layer (e.g. EDIT_CourseOrder_bold) containing
//      a comma-separated list: English, مرحبا, नमस्ते, こんにちは
// ============================================================

var duo_detect_locale = function (txt) {
    var s = String(txt);
    if (/\p{Script=Arabic}/u.test(s))     return "AR";
    if (/\p{Script=Bengali}/u.test(s))    return "BN";
    if (/\p{Script=Greek}/u.test(s))      return "EL";
    if (/\p{Script=Devanagari}/u.test(s)) return "HI";
    if (/\p{Script=Tamil}/u.test(s))      return "TA";
    if (/\p{Script=Telugu}/u.test(s))     return "TE";
    if (/\p{Script=Thai}/u.test(s))       return "TH";
    if (/\p{Script=Hangul}/u.test(s))     return "KO";
    if (/[\p{sc=Hira}\p{sc=Kana}]/u.test(s)) return "JA";
    if (/\p{Script=Cyrillic}/u.test(s))   return /[іїє]/i.test(s) ? "UK" : "RU";
    if (/[\u4E00-\u9FA5]/u.test(s))       return "ZH-CN";
    if (/\p{Script=Han}/u.test(s))        return "ZH-TW";
    if (/[ảạắằẳẵặấầẩẫậẻẽẹếềểễệỉịỏọốồổỗộớờởỡợủụứừửữựỳỷỹỵơư]/i.test(s)) return "VI";
    if (/[ğışçöü]/i.test(s))  return "TR";
    if (/[őű]/i.test(s))      return "HU";
    if (/[ěščřžýáíéóúů]/i.test(s)) return "CS";
    if (/[ąćęłńóśźż]/i.test(s))    return "PL";
    if (/[șț]/u.test(s))      return "RO";
    if (/\p{Script=Latin}/u.test(s)) {
        if (/[ßäöü]/i.test(s))               return "DE";
        if (/[ñ¿]/i.test(s))                  return "ES";
        if (/[çàâéèêëîïôûù]/i.test(s))        return "FR";
        if (/[åäö]/i.test(s))                  return "SV";
        return "EN";
    }
    return "EN";
};

var context = "App";
try {
    var contextItems = ["App", "Marketing", "Marketing-Feather"];
    context = contextItems[effect("Duo AutoFont")(1) - 1] || "App";
} catch(e) {}

var compNames = {
    "App":               ":: LANGUAGE COMP_APP",
    "Marketing":         ":: LANGUAGE COMP_MARKETING",
    "Marketing-Feather": ":: LANGUAGE COMP_FEATHER"
};

var _csvDoc    = thisComp.layer("EDIT_CourseOrder_bold").text.sourceText;
var csvText    = _csvDoc.text || String(_csvDoc);
var langArray  = csvText.split(",");
var layerNum   = parseInt(thisLayer.name.split(" - ")[1], 10);

var resultText = (layerNum > 0 && layerNum - 1 < langArray.length)
    ? langArray[layerNum - 1].trim()
    : "error";

var locale = duo_detect_locale(resultText);

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

try {
    var finalFont = targetLayer
        ? targetLayer.text.sourceText.style.font
        : text.sourceText.style.font;
    if (finalFont && finalFont !== text.sourceText.style.font) {
        text.sourceText.style.setFont(finalFont).setText(resultText);
    } else {
        text.sourceText.style.setText(resultText);
    }
} catch(e) {
    text.sourceText.style.setText(resultText);
}
