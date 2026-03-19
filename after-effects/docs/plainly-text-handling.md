# Plainly Text Handling

How we handle multilingual text and font switching across 28 languages in After Effects projects rendered via Plainly.

## Overview

Every text layer that receives dynamic content needs to detect the language of the incoming text and swap to the correct font. This is handled entirely by inline AE expressions — no external JSX files, no effect presets. The expressions use Unicode script detection to identify the locale and look up the correct font from a language precomp.

## Architecture

### Language Comps

Five precomps act as font lookup tables. Each contains 28 text layers named by locale code (AR, BN, CS, DE, EL, EN, ES, FR, HI, HU, ID, IT, JA, KO, NL, PL, PT, RO, RU, SV, TA, TE, TH, TL, TR, UK, VI, ZH-CN, ZH-TW). Each layer's font is set to the correct typeface for that language and weight.

| Comp Name | Weight / Context |
|---|---|
| `:: LANGUAGE COMP_APP` | Bold (DuolingoSans-Bold, NotoSans-Bold, etc.) |
| `:: LANGUAGE COMP_regular` | Regular (DuolingoSans-Regular, NotoSans-Regular, etc.) |
| `:: LANGUAGE COMP_medium` | Medium (DuolingoSans-Medium, NotoSans-Medium, etc.) |
| `:: LANGUAGE COMP_MARKETING` | Marketing bold (DuolingoSans-Bold, Kohinoor variants) |
| `:: LANGUAGE COMP_FEATHER` | Feather bold (Feather-Bold, Kohinoor variants) |

### Locale Detection

The `detect()` function is inlined in every expression. It checks Unicode script properties in priority order:

1. **Unique scripts** — Arabic, Bengali, Greek, Devanagari, Tamil, Telugu, Thai, Hangul, Japanese kana
2. **Cyrillic** — disambiguates Ukrainian (і/ї/є) from Russian
3. **Chinese** — CJK Unified range for Simplified, remaining Han for Traditional
4. **Latin with unique diacritics** — Vietnamese, Turkish, Hungarian, Czech, Polish, Romanian
5. **General Latin** — German, Spanish, French, Swedish, fallback to English

### Expression Variants

All expressions share the same `detect()` function and the same `LANG_COMP` variable at the top for easy comp selection:

```
const LANG_COMP = ":: LANGUAGE COMP_APP";
```

Change this single line to switch weight/context.

---

## Pattern 1: Direct Text Layers (LocaleFont)

**Use for:** Any text layer whose Source Text is set directly (typed in AE or driven by a Plainly parameter).

**Expression:** `LocaleFont.js`

**How it works:**

1. Reads `text.sourceText` from the layer itself
2. Runs `detect()` to get locale code (e.g. "AR")
3. Looks up `comp(LANG_COMP).layer("AR").text.sourceText.style.font` to get the font name
4. Applies via `text.sourceText.style.setFont(targetFont).setText(txt)`

**Plainly API usage:**

```json
{
  "parameters": {
    "editHeadlineBold": "مرحبًا"
  }
}
```

Plainly injects the text into the layer's Source Text. The expression detects Arabic, swaps to NotoSansArabic-Bold, done.

---

## Pattern 2: CSV-Driven Layers (LanguageOrder)

**Use for:** Layers named "Language - 1", "Language - 2", etc. that pull their text from a comma-separated list.

**Expression:** `LanguageOrder.js`

**How it works:**

1. Reads CSV from `thisComp.layer("Plainly_CourseOrder").text.sourceText`
2. Splits on commas into an array
3. Extracts the layer number from `thisLayer.name` using regex (`/(\d+)\s*$/`)
4. Grabs the Nth item (1-indexed)
5. Detects locale and swaps font, same as LocaleFont

**Plainly API usage:**

```json
{
  "parameters": {
    "plainlyCourseOrder": "English, العربية, हिन्दी, 日本語, 한국어"
  }
}
```

One parameter drives all the language list layers. Layer "Language - 1" gets "English" (EN → DuolingoSans), "Language - 2" gets "العربية" (AR → NotoSansArabic), etc.

---

## Pattern 3: Precomp Text via Essential Graphics (ESG)

**Use for:** Text layers inside precomps where a driver layer in the parent comp controls the text content. Common pattern: `EDIT_GetStarted` in the parent comp drives the button text inside a `CTA Button_v2` precomp.

**The problem:** Essential Graphics property links only pass the text string — font styling does not travel through EGP links. And EGP links override expressions on the target property, so you can't add font-swap logic on the EGP-linked property itself.

**Solution:** Remove the EGP link. On the text layer inside the precomp, use a direct `comp()` reference to pull text from the driver layer and handle the font swap in one expression:

```javascript
const LANG_COMP = ":: LANGUAGE COMP_APP";

// ... detect() function ...

const src = comp("Parent Comp Name").layer("EDIT_GetStarted").text.sourceText;
const txt = src.text ? src.text : String(src);
const locale = detect(txt);
const targetFont = comp(LANG_COMP).layer(locale).text.sourceText.style.font;
text.sourceText.style.setFont(targetFont).setText(txt);
```

**Key points:**
- No EGP link on the precomp layer in the parent comp — delete it
- The inner text layer reads directly from the driver layer via `comp("Parent Comp Name").layer("EDIT_GetStarted")`
- Font swap happens on the actual text layer where `text.sourceText.style` is available
- `setFont()` does not work on precomp layers (they aren't text layers), only on text layers inside the precomp

---

## Font Upload Requirements

When packaging the project for Plainly, the Fonts folder must include:

1. **All fonts referenced by the language comps** — every weight of every typeface across all 5 comps (NotoSans, NotoSansArabic, DuolingoSans, Feather, Kohinoor variants, etc.)
2. **All fallback fonts AE assigns** — when AE can't render characters in the layer's default font, it assigns system fallback fonts (e.g. Myriad Pro for Latin punctuation, Damascus for Arabic). These get baked into the layer data and Plainly requires them to be present, even though the expression overrides them at render time.
3. **Any explicitly used fonts** — fonts set directly on layers (e.g. Damascus on `EDIT_LeftColumn_bold`)

Run the Plainly collect to gather all referenced fonts. Verify font files with `fc-query` — check that internal PostScript names match filenames (we've had cases of misnamed files, e.g. a NotoSansArabic-Bold.otf that was actually Myriad Pro internally).

### Current font inventory (51 files)

Duolingo proprietary: DuolingoSans (Regular/Medium/Bold), DINNextforDuolingo (Regular/Medium/Bold), Feather-Bold

Noto Sans family: NotoSans, NotoSansArabic, NotoSansBengali, NotoSansDevanagari, NotoSansJP, NotoSansKR, NotoSansSC, NotoSansTC, NotoSansTamil, NotoSansTelugu, NotoSansThai (each in Regular/Medium/Bold)

Kohinoor family: KohinoorArabicRND-Bold, KohinoorBanglaRND-Bold, KohinoorCyrillicRND-Bold, KohinoorDevanagariRND-Bold, KohinoorGreekRND-Bold, KohinoorTamilRounded-Bold, KohinoorTeluguRND-Bold, KohinoorThaiRND-Bold

Other: FZLANTY_CUK--GBK1-0, GenSenRounded-JP-Bold, NanumSquareRoundOTFEB
