# PRIME Data-Visualization Color Guide

**Scope:** charts, graphs, maps, dashboards, and print reports for PRIME Philippines
commercial real-estate communications.

**Governing principle:** every color used in data visualization must trace its lineage
to one of two immutable anchors — **PRIME Blue `#003366`** or **PRIME Gold `#C9AB4C`**.
No outside colors may be introduced as data series.

> Note: the data-viz guide writes Gold as `#C9AB4C`; the primary brand guide writes
> `#C9A84C`. They are effectively the same gold. Prefer `#C9AB4C` when matching existing
> data-viz work, `#C9A84C` for general brand surfaces.

## Brand anchors

| Name | Hex | Role | Used for |
|---|---|---|---|
| Midnight (PRIME Blue) | `#003366` | primary, immutable | Cormorant heading color, all chart primary series, map base fills, KPI values |
| Gold (PRIME Gold) | `#C9AB4C` | accent, immutable | Premium benchmark lines, PRIME portfolio highlights, KPI delta indicators, accents |

## Supporting neutrals

| Name | Hex | Used for |
|---|---|---|
| Ivory / White | `#FFFFFF` | Page backgrounds, light fills |
| Deep Onyx | `#111111` | Body text, headings (near-black) |
| Stone | `#888780` | Captions, muted labels |
| Pale Rule | `#E4E0D8` | Dividers, grid lines (print) |

## Categorical palette (10-series)

The canonical categorical palette. Series alternate Blue-family → Gold-family so adjacent
series always contrast in temperature. **Assign from the top, never skip positions**
(2-series = S1–S2, 4-series = S1–S4, etc.).

| Slot | Name | Hex | Lineage | Default role |
|---|---|---|---|---|
| S1 | Midnight | `#003366` | blue anchor | Luzon / primary |
| S2 | Gold | `#C9AB4C` | gold anchor | Visayas / secondary |
| S3 | Ocean | `#1A5A8A` | blue mid | Third |
| S4 | Brass | `#A8862E` | gold deep | Fourth |
| S5 | Steel | `#3D7DA8` | blue light | Mindanao / fifth |
| S6 | Bronze | `#7A5C10` | gold dark | Sixth |
| S7 | Powder | `#6A94B0` | blue soft | Seventh |
| S8 | Amber | `#D4B85A` | gold light | Eighth |
| S9 | Navy | `#001F3F` | blue darkest | Ninth |
| S10 | Champagne | `#E8D494` | gold palest | **Background fills ONLY — never bars, lines, or text** |

## Tonal scales

Each anchor extends into a 7-stop sequential scale, labeled by lightness token:
`05` (deepest) → `15 → 30 → 50 → 70 → 90 → 100` (lightest). Move deep-to-light as data
values decrease; stops 90–100 are darkest/most saturated, 05–15 are lightest tints.
Exact per-stop hexes aren't enumerated in the source — interpolate from the anchor.

- **Blue family** (anchor `#003366`): single-metric charts, heat maps, geographic fills,
  ranked data, Luzon sub-regional breakdowns.
- **Gold family** (anchor `#C9AB4C`): benchmark lines, PRIME portfolio highlights,
  secondary sequential data, Visayas sub-regional breakdowns.

Scale usage rules:
- Single-metric bar/column charts: use the 90 or 100 stop for bars; 30–60 for background
  fills or hover states.
- Heat maps / choropleth: map the data range across all 7 stops, darkest = highest value;
  always include a scale legend.
- Sub-regional breakdowns: Luzon → Blue scale, Visayas → Gold scale, Mindanao →
  Steel-Blue mid scale.
- Never mix Blue-scale stops with Gold-scale stops as categorical colors in one chart —
  use the 10-series categorical palette instead.

## Semantic status colors

Reserved **exclusively** for KPI delta indicators, vacancy trend arrows, and market-
condition flags. **Never** used as categorical data series.

| Token | Hex | Use |
|---|---|---|
| growth | `#1A6640` | Positive YoY/QoQ, upward arrows, above-benchmark |
| decline | `#AA2E20` | Negative YoY/QoQ, downward arrows, below-benchmark |
| watch | `#96680A` | Approaching threshold, flat performance, caution zones |
| neutral | `#4A5E6A` | No data / N/A, zero-change, structural reference lines |

**Hard rule:** never use PRIME Gold as a warning/caution color — its brand association
reads as positive.

## Island-group assignments (fixed)

Permanent regional colors — never swap between regions across charts in the same document.

| Region | Hex | Name | Rationale |
|---|---|---|---|
| Luzon | `#003366` | Midnight | NCR + primary hubs. Dominant market, dominant color. |
| Visayas | `#C9AB4C` | Gold | Cebu, Iloilo, Bacolod. Rising premium market. |
| Mindanao | `#3D7DA8` | Steel | Davao, CDO, Zamboanga. Frontier growth; blue-family = PRIME coverage. |

Sub-regional district breakdowns use the matching tonal scale (Luzon→Blue, Visayas→Gold,
Mindanao→Steel-Blue mid).

## Accessibility (WCAG AA; text 4.5:1, non-text 3:1; tested on white/ivory)

Blue family on white: Midnight `#003366` 12.1:1 (AAA) · Blue mid 5.9:1 (AA) ·
Blue light 4.6:1 (AA) · Blue soft 3.4:1 (AA non-text only) · Navy `#001F3F` 16.2:1 (AAA).

Gold family on white: Gold `#C9AB4C` 4.2:1 (AA non-text, borderline for text) ·
Brass `#A8862E` 4.8:1 (AA) · Bronze `#7A5C10` 7.3:1 (AAA) · Amber `#D4B85A` 3.6:1
(non-text) · Champagne `#E8D494` insufficient (**background fill only**).

For body text on light backgrounds, prefer Midnight/Navy/Bronze/Brass; avoid gold tints
for small text.

## Medium rules

**Print:**
- Background forced to `#FFFFFF`.
- Bar fills limited to `#003366` and `#C9AB4C`; extended categorical colors must use their
  90–100 stops only (no light tints).
- Every line series carries a distinct dash pattern in addition to color (grayscale-legible).
- Grid lines `#E4E0D8` at 100% opacity (no transparency).

**Screen:**
- Chart canvas sits on Warm White `#FFFCFB`, or reversed out on PRIME Blue `#003366` when
  the chart lives inside a Blue band. Never on Gray or Deep Ink, which are text colors.
- Full palette available.
- Background fills / hover / area fills use tint stops 30–60; area-fill opacity 0.13–0.15.
- Section separators: gold accent rule `#C9AB4C`, 0.75px.
- Grid lines `rgba(128,128,128,0.10)`.

**Never use colored grid lines** — they compete with the data.

## Legends

- Always build custom HTML/SVG legends — never use Chart.js / Recharts / library defaults.
- Swatch: square, 10px, border-radius 2px.
- Include the data value or percentage alongside the label for categorical charts.

## Line dash patterns (print legibility convention)

S1 Luzon solid · S2 Visayas dashed · S3 Ocean solid · S4 Brass dashed · S5 Mindanao
dotted · S6 Bronze dash-dot · S7 Powder dotted · S8 Amber dash-dot · S9 Navy solid ·
S10 Champagne n/a (fill only).

## AI quick reference

- 2 series by region: Luzon `#003366`, Visayas `#C9AB4C`. If Mindanao is the only
  non-Luzon region, use `#3D7DA8`.
- 3 regions: Luzon `#003366`, Visayas `#C9AB4C`, Mindanao `#3D7DA8`.
- n generic series: use S1…Sn from the categorical palette in order.
- Single metric over time: Midnight `#003366` line; benchmark = Gold `#C9AB4C` dashed overlay.
- Positive vs negative delta: positive `#1A6640`, negative `#AA2E20`. Never gold for negative.
- Heatmap: pick one family (Blue primary / Gold secondary); map range across all 7 stops,
  darkest = highest.
- Print: limit fills to `#003366` and `#C9AB4C`; add dash patterns to every line; grid lines
  `#E4E0D8` solid.

## Do not

- Do not use PRIME Gold as a warning/caution indicator.
- Do not introduce colors outside the Blue or Gold lineage for data series.
- Do not use Champagne `#E8D494` as a bar, line, or text color (background fills only).
- Do not swap island-group assignments between charts in the same document.
- Do not mix Blue-scale and Gold-scale stops as categorical colors in one chart.
- Do not use colored grid lines.
- Do not rely on default library legends.
