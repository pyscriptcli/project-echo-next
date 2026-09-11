---
name: prime-philippines-brand
description: >-
  Applies the PRIME Philippines brand system — the "Palette of Sovereign Intelligence"
  colors, the "Words That Command the Room" typography (Cormorant Garamond, Bebas Neue,
  Montserrat), the logo/icon assets, and the data-visualization color guide — to any
  artifact that should look and feel like PRIME Philippines. Use this skill whenever the
  user asks for anything branded as PRIME or PRIME Philippines, or mentions PRIME brand
  colors, fonts, logos, slides, decks, reports, documents, charts, dashboards, infographics,
  web pages, social posts, or templates that should follow PRIME's look. Use it even when
  the user only says "make it on-brand," "use our branding," "match our style," or names a
  PRIME color (PRIME Blue, PRIME Gold) or typeface, even if they don't say "brand guidelines."
license: Internal brand asset — PRIME Philippines / PRIME GOC Designs.
---

# PRIME Philippines Brand System

PRIME Philippines is an exclusive commercial real-estate advisory. The voice is
**authoritative, sovereign, premium, and earned — never ostentatious.** Tagline:
**"We Advise. You Advance."** Every branded artifact should feel like advice you'd
trust with an institution's built environment.

This skill encodes the full system so any deck, report, chart, web page, or document
comes out unmistakably PRIME. **Read the relevant reference file before producing
anything substantial** — the rules below are the quick version; the references carry
the exact specs and edge cases.

## How to use this skill

1. Identify the artifact type and pick the right reference:
   - **Colors / general styling** → `references/color-system.md`
   - **Type, headings, hierarchy** → `references/typography.md`
   - **Charts, graphs, maps, dashboards, KPIs** → `references/data-viz-color-guide.md`
2. For web/HTML/React output, link or inline `assets/brand.css` (CSS variables + base
   classes + font imports). For machine consumption use `assets/brand-tokens.json`.
3. Place the logo/icon using `assets/logos/README.md` and `assets/icons/README.md`.
4. Sanity-check against the **Do-not list** below before finishing.

## Colors — "Palette of Sovereign Intelligence"

> PRIME Gold crowns every premium moment. Blue is the foundation of authority.
> Yellow energizes. Gray grounds the type. Every surface is Blue or Warm White.

| Token | Name | Hex | Role |
|---|---|---|---|
| `--prime-blue` | PRIME Blue | `#003366` | **Foundation / authority.** Primary color, and one of only two permitted backgrounds. |
| `--prime-warm-white` | PRIME Warm White | `#FFFCFB` | The other permitted background. Light surfaces, cards, breathing space. Replaces pure white. |
| `--prime-gold` | PRIME Gold | `#C9A84C` | **Apex accent / distinction.** Accents, rule lines, signature moments **only**. |
| `--prime-yellow` | PRIME Yellow (Amber) | `#FFBF00` | Energy / motion. The arrow mark, infographics, data accents. |
| `--prime-gray` | PRIME Gray (Black Pearl) | `#181D1E` | **Ink only** — body text, hairlines, footnotes on light surfaces. Never a background. |
| `--prime-deep-ink` | PRIME Deep Ink | `#0C0C0E` | **Ink only** — deepest text weight where Gray reads too soft. Never a background. |

### The two background rule

**Every background is either PRIME Blue `#003366` or PRIME Warm White `#FFFCFB`.** That
covers page and slide backgrounds, section bands, cards, panels, table headers, sidebars,
footers, hero blocks, and full-bleed images with a color wash over them. Dark-theme
surfaces in Gray or Deep Ink are off-brand now, so where a deck or page wants weight and
contrast, use a PRIME Blue field with Warm White text on it. Gray and Deep Ink survive in
the palette as text colors, and the reason they're still here is the no-pure-black rule:
body copy on a Warm White page should be Blue or Gray, never `#000000`.

The one exception is data visualization in print, which the data-viz guide forces to
`#FFFFFF`.

**The other color rule that matters:** PRIME Gold is an **accent, never a field.**
Never fill a large background or body area with gold. Blue is the dominant authority color.

## Typography — "Words That Command the Room"

Three typefaces, each with a fixed role. **No substitutions** beyond these (and their
documented fallbacks). All three are on Google Fonts (see `assets/fonts.md`).

| Role | Typeface | Weight / style | Size | Tracking | Notes |
|---|---|---|---|---|---|
| **Display Hero** | Cormorant Garamond | Light 300, Reg/Italic | 96–120px, LH 1.0 | −0.02em | Headlines only |
| **Section Heading** | Cormorant Garamond | 300 Italic | 48–72px, LH 1.1 | −0.01em | e.g. *"We Advise. You Advance."* |
| **Impact / Data** | Bebas Neue | Regular | 36–64px, LH 1.0 | +0.08em | Big numbers, e.g. `$4.2 BILLION ADVISED` |
| **Labels / UI Caps** | Montserrat | Medium 500, ALL CAPS | 9–13px, LH 2.0 | +0.35em | UPPERCASE only — never lowercase |
| **Body Copy** | Montserrat | Regular | — | — | Paragraphs, CMS, docs/slides |

Fallback stacks: Cormorant Garamond → Georgia, serif · Bebas Neue → Impact, sans-serif ·
Montserrat → Arial, Helvetica, sans-serif.

## Logo & icon (quick guide)

The official PRIME artwork is bundled as transparent PNGs in `assets/logos/` and
`assets/icons/`. Pick by background; full tables in those READMEs.

| Background | Full logo | Icon | Premium icon |
|---|---|---|---|
| Warm White `#FFFCFB` | `logos/blue_prime_logo.png` | `icons/blue_icon_1.png` | `icons/blue_gold_icon_1.png` |
| PRIME Blue `#003366` | `logos/white_prime_logo.png` | `icons/white_icon_1.png` | `icons/white_gold_icon.png` |
| PRIME Blue, sophisticated | `logos/white_prime_logo.png` | — | `icons/silver_gold_icon_1.png` |

Always use these official files. **Never substitute a redrawn, traced, or AI-generated
mark;** if a needed file isn't present, reference it by name and leave a gap rather than
inventing one.

## Shape & form — "Edges Stay Sharp"

PRIME's geometry is **square and deliberate**. Sharp, right-angle corners read as
precise, architectural, and sovereign — rounded corners read soft and consumer-friendly,
which is off-brand. **Every edge is sharp: `border-radius: 0` is the default for all
cards, panels, buttons, images, inputs, tables, badges, and containers.** Use the
`--prime-radius` token (set to `0`) wherever a radius would otherwise go, so the rule
holds everywhere.

The only permitted curves are the brand's own artwork — the logo, the arrow mark, and
icons — which carry their intended shapes. Don't add rounding to anything else, and don't
soften photo or chart corners.

## Data visualization (quick guide)

Every data color must trace to **PRIME Blue (#003366)** or **PRIME Gold (#C9A84C/#C9AB4C)**
— no outside colors as data series. Fixed regional assignments: **Luzon = Midnight
#003366**, **Visayas = Gold #C9AB4C**, **Mindanao = Steel #3D7DA8**. Status colors
(growth/decline/watch/neutral) are reserved for KPI deltas, never used as categorical
series — and **never use Gold as a warning color** (it reads positive). Build custom
legends, never library defaults. Full categorical palette, tonal scales, accessibility
ratings, and print rules are in `references/data-viz-color-guide.md` — read it before
building any chart, map, or dashboard.

## Do-not list (check before finishing)

- Do **not** put anything other than PRIME Blue `#003366` or Warm White `#FFFCFB` behind
  content. No Gray `#181D1E` backgrounds, no Deep Ink `#0C0C0E` backgrounds, no dark
  themes. Those two are ink colors now. *(Exception: data-viz print backgrounds are
  forced to `#FFFFFF`.)*
- Do **not** use PRIME Gold as a background fill or dominant field color.
- Do **not** round corners — keep `border-radius: 0` on cards, buttons, images,
  inputs, and containers (use `var(--prime-radius)`). Curves belong only to the logo,
  arrow mark, and icons.
- Do **not** use pure black `#000000` for text — use PRIME Blue, PRIME Gray, or Deep Ink.
- Do **not** use pure white `#FFFFFF` for brand/marketing surfaces — use Warm White
  (`#FFFCFB`). *(Exception: data-viz print backgrounds are forced to `#FFFFFF`.)*
- Do **not** substitute typefaces outside the documented three.
- Do **not** set Labels / UI Caps in lowercase.
- Do **not** use PRIME Gold as a warning/caution indicator in charts.
- Do **not** introduce non-Blue/non-Gold colors as data series, or use Champagne
  `#E8D494` for bars, lines, or text (background fill only).

## Note on source conflicts

The two source files disagree on a couple of values; this skill's canonical choices:
- **PRIME Gold = `#C9A84C`** (primary brand guide). The data-viz guide uses `#C9AB4C`;
  treat them as equivalent and prefer `#C9AB4C` only when matching existing data-viz work.
- **Warm White = `#FFFCFB`** for brand surfaces; data-viz **print** backgrounds use
  `#FFFFFF` by the data-viz guide's own rule.
