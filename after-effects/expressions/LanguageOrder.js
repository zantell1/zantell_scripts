// ============================================================
// LanguageOrder
// Requires: JavaScript expression engine (File > Project Settings)
//
// Self-contained expression for layers named "Language - N" or
// "LangArabic - N". Pulls the Nth item from a CSV source layer,
// detects its locale, and applies the matching font — no external
// JSX dependency.
//
// Setup:
//   1. Add the "Duo AutoFont" Dropdown Menu Control effect to this
//      layer (use PlainlySuite > Auto Font, or apply DuoAutoFont.ffx).
//      Items: App Bold | App Regular | App Medium | Marketing | Feather
//
//   2. Five precomps, each with layers named by locale code
//      (AR, EN, JA, KO, HI, etc.):
//        :: LANGUAGE COMP_APP        (bold)
//        :: LANGUAGE COMP_regular
//        :: LANGUAGE COMP_medium
//        :: LANGUAGE COMP_MARKETING  (bold)
//        :: LANGUAGE COMP_FEATHER    (bold)
//
//   3. A CSV source layer named "Plainly_CourseOrder" containing
//      a comma-separated list: English, مرحبا, नमस्ते, こんにちは
// ============================================================

const detect = (txt) => {
  const s = String(txt);
  switch (true) {
    case /\p{Script=Arabic}/u.test(s): return "AR";
    case /\p{Script=Bengali}/u.test(s): return "BN";
    case /\p{Script=Greek}/u.test(s): return "EL";
    case /\p{Script=Devanagari}/u.test(s): return "HI";
    case /\p{Script=Tamil}/u.test(s): return "TA";
    case /\p{Script=Telugu}/u.test(s): return "TE";
    case /\p{Script=Thai}/u.test(s): return "TH";
    case /\p{Script=Hangul}/u.test(s): return "KO";
    case /[\p{sc=Hira}\p{sc=Kana}]/u.test(s): return "JA";
    case /\p{Script=Cyrillic}/u.test(s):
      return /[іїє]/i.test(s) ? "UK" : "RU";
    case /[\u4E00-\u9FA5]/u.test(s): return "ZH-CN";
    case /\p{Script=Han}/u.test(s): return "ZH-TW";
    case /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(s):
      return "VI";
    case /[ğışçöü]/i.test(s): return "TR";
    case /[őű]/i.test(s): return "HU";
    case /[ěščřžýáíéóúů]/i.test(s): return "CS";
    case /[ąćęłńóśźż]/i.test(s): return "PL";
    case /[șț]/u.test(s): return "RO";
    case /\p{Script=Latin}/u.test(s):
      if (/[ßäöü]/i.test(s)) return "DE";
      if (/[ñ¿]/i.test(s)) return "ES";
      if (/[çàâéèêëîïôûù]/i.test(s)) return "FR";
      if (/[åäö]/i.test(s)) return "SV";
      return "EN";
    default: return "EN";
  }
};

const COMP_NAMES = {
  "App Bold":    ":: LANGUAGE COMP_APP",
  "App Regular": ":: LANGUAGE COMP_regular",
  "App Medium":  ":: LANGUAGE COMP_medium",
  "Marketing":   ":: LANGUAGE COMP_MARKETING",
  "Feather":     ":: LANGUAGE COMP_FEATHER"
};
const ITEMS = ["App Bold", "App Regular", "App Medium", "Marketing", "Feather"];

const contextIdx = effect("Duo AutoFont")(1);
const context = ITEMS[contextIdx - 1] || "App Bold";

const src = thisComp.layer("Plainly_CourseOrder").text.sourceText;
const csvText = src.text ? src.text : String(src);
const items = csvText.split(",");

const match = thisLayer.name.match(/(\d+)\s*$/);
const layerNum = match ? parseInt(match[1], 10) : 0;

const txt = (layerNum >= 1 && layerNum <= items.length)
  ? items[layerNum - 1].replace(/^\s+|\s+$/g, "")
  : "";

const locale = detect(txt);

const findLayer = (compName, name) => {
  try { return comp(compName).layer(name); } catch(e) { return null; }
};

let target = findLayer(COMP_NAMES[context], locale);
if (!target && context === "Feather") {
  target = findLayer(COMP_NAMES["Marketing"], locale);
}
if (!target) {
  target = findLayer(COMP_NAMES["App Bold"], locale);
}

const targetFont = target
  ? target.text.sourceText.style.font
  : text.sourceText.style.font;
text.sourceText.style.setFont(targetFont).setText(txt);
