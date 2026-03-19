// ============================================================
// LocaleFont
// Requires: JavaScript expression engine (File > Project Settings)
//
// Self-contained expression for any text layer.
// Detects the script/locale of the layer's text, looks up the
// matching locale layer in the chosen language precomp, and
// applies its font — no external JSX or effect dependency.
//
// Change the comp name below to match the desired weight/context:
//   :: LANGUAGE COMP_APP        (bold)
//   :: LANGUAGE COMP_regular
//   :: LANGUAGE COMP_medium
//   :: LANGUAGE COMP_MARKETING  (bold)
//   :: LANGUAGE COMP_FEATHER    (bold)
// ============================================================

const LANG_COMP = ":: LANGUAGE COMP_APP";

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
    // Vietnamese — only unique chars (ơ/ư base + tonal hooks/dots)
    // Excludes common Latin accents (á é í ó ú) shared with ES/FR/PT/IT
    case /[ảạắằẳẵặấầẩẫậẻẽẹếềểễệỉịỏọốồổỗộớờởỡợủụứừửữựỳỷỹỵơư]/i.test(s):
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

const txt = text.sourceText;
const locale = detect(txt);
const targetFont = comp(LANG_COMP).layer(locale).text.sourceText.style.font;
text.sourceText.style.setFont(targetFont).setText(txt);
