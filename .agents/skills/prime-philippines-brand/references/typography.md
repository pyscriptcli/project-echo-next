# PRIME Typography — "Words That Command the Room"

**Philosophy:** Cormorant Garamond carries centuries of authoritative print heritage.
Bebas Neue commands with mechanical precision. Montserrat governs the functional.
Together they speak with a single, unmistakable voice.

**Governance:** Three typefaces govern the PRIME system — each with a precise role, each
with an irrevocable rationale. **No substitutions permitted except the documented
fallbacks.**

## The three typefaces

| Typeface | Rationale | Roles |
|---|---|---|
| **Cormorant Garamond** | Centuries of authoritative print heritage | Display Hero, Section Heading |
| **Bebas Neue** | Commands with mechanical precision | Impact / Data |
| **Montserrat** | Governs the functional | Labels / UI Caps, Body Copy |

## Complete hierarchy

### Display Hero
- Typeface: **Cormorant Garamond**, Light 300, Regular or Italic
- Size: 96–120px · Line-height: 1.0 · Tracking: −0.02em
- Usage: **Headlines only**
- Example: *Advisory Excellence*

### Section Heading
- Typeface: **Cormorant Garamond**, 300, Italic
- Size: 48–72px · Line-height: 1.1 · Tracking: −0.01em
- Example: *"We Advise. You Advance."*

### Impact / Data
- Typeface: **Bebas Neue**, Regular
- Size: 36–64px · Line-height: 1.0 · Tracking: +0.08em
- Usage: Data + impact moments (big numbers, stats)
- Example: `$4.2 BILLION ADVISED`

### Labels / UI Caps
- Typeface: **Montserrat**, Medium 500, ALL CAPS
- Size: 9–13px · Line-height: 2.0 · Tracking: +0.35em
- Usage: **UPPERCASE only** — never set in lowercase
- Example: `EXCLUSIVE COMMERCIAL ADVISORY · PHILIPPINE MARKET INTELLIGENCE`

### Body Copy
- Typeface: **Montserrat**, Regular
- Usage: Google Docs, Google Slides, CMS, paragraph text
- Example: "PRIME Philippines provides research, leasing intelligence, and strategic
  advisory to institutions who require more than a transaction — they require a trusted
  partner in shaping their built environment."

## Fallback stacks

When the brand fonts are unavailable, fall back in this order — and only this order:

- Cormorant Garamond → `Georgia, 'Times New Roman', serif`
- Bebas Neue → `'Arial Narrow', Impact, sans-serif`
- Montserrat → `Arial, Helvetica, sans-serif`

CSS variables (also in `assets/brand.css`):
```css
--font-display: 'Cormorant Garamond', Georgia, serif;   /* Display Hero + Section Heading */
--font-impact:  'Bebas Neue', 'Arial Narrow', sans-serif; /* Impact / Data */
--font-ui:      'Montserrat', Arial, Helvetica, sans-serif; /* Labels + Body */
```

## Data-visualization type (from the data-viz guide)

For charts specifically, the data-viz guide specifies functional type that differs from
the marketing hierarchy above — use these inside charts:
- **Axis labels & ticks:** Arial/Helvetica, 10px, color `#888780`.
- **Chart titles (screen):** Montserrat/Helvetica, Bold, 13px, color `#003366`.
- **Chart titles (print reports):** Cormorant Garamond (editorial hierarchy).
- **Captions:** Arial, 8.5px, italic, color `#999999`.

## Do not

- Do not substitute typefaces outside the documented three (and their fallbacks).
- Use Cormorant Garamond for Display Hero and Section Headings **only**.
- Reserve Bebas Neue for Impact / Data moments.
- Montserrat governs Labels (UPPERCASE only) and Body Copy.
- Display Hero is for headlines only.
- Do not set Labels / UI Caps in lowercase.
