"""
PRIME Philippines brand palette helper.

Use in chart/document generation (matplotlib, python-pptx, python-docx, etc.) to stay
on-brand. Colors and rules trace to the PRIME brand system; data-viz rules follow
references/data-viz-color-guide.md.

    from brand_palette import PRIME, categorical, region_color, status, hex_to_rgb

Everything is plain hex strings unless noted. No external dependencies.
"""

# Core brand palette
PRIME = {
    "blue":       "#003366",  # foundation / authority (dominant) + the only dark surface
    "warm_white": "#FFFCFB",  # light surface; replaces pure white
    "gold":       "#C9A84C",  # apex accent ONLY — never a field/background
    "yellow":     "#FFBF00",  # amber — energy/motion, arrow mark, data accent
    "gray":       "#181D1E",  # INK ONLY — body text, hairlines. Not a background.
    "deep_ink":   "#0C0C0E",  # INK ONLY — deepest text weight. Not a background.
}

# Only these two may sit behind content. Gray and Deep Ink are text colors; where a
# dark theme is wanted, use a PRIME Blue field with Warm White type.
BACKGROUNDS = {
    "light": "#FFFCFB",  # Warm White
    "dark":  "#003366",  # PRIME Blue
}


def background(kind="light"):
    """Return an approved background color. Anything else is off-brand."""
    k = kind.strip().lower()
    if k not in BACKGROUNDS:
        raise ValueError(
            "Backgrounds are PRIME Blue or Warm White only; got %r." % kind
        )
    return BACKGROUNDS[k]

# Data-viz canonical categorical palette (assign S1..Sn in order, never skip).
# S10 Champagne is background-fill only.
CATEGORICAL = [
    "#003366",  # S1 Midnight  (Luzon / primary)
    "#C9AB4C",  # S2 Gold      (Visayas / secondary)
    "#1A5A8A",  # S3 Ocean
    "#A8862E",  # S4 Brass
    "#3D7DA8",  # S5 Steel     (Mindanao)
    "#7A5C10",  # S6 Bronze
    "#6A94B0",  # S7 Powder
    "#D4B85A",  # S8 Amber
    "#001F3F",  # S9 Navy
    "#E8D494",  # S10 Champagne (BACKGROUND FILL ONLY)
]

REGIONS = {"luzon": "#003366", "visayas": "#C9AB4C", "mindanao": "#3D7DA8"}

STATUS = {            # KPI deltas / flags only — never categorical series
    "growth":  "#1A6640",
    "decline": "#AA2E20",
    "watch":   "#96680A",
    "neutral": "#4A5E6A",
}

NEUTRALS = {
    "ivory": "#FFFFFF",      # data-viz page bg / print bg (forced)
    "onyx":  "#111111",      # body text / headings (near-black)
    "stone": "#888780",      # captions / muted labels
    "pale_rule": "#E4E0D8",  # dividers / print grid lines
}

FONTS = {  # families; see assets/fonts.md for fallbacks
    "display": "Cormorant Garamond",  # Display Hero + Section Heading
    "impact":  "Bebas Neue",          # Impact / Data
    "ui":      "Montserrat",          # Labels + Body
}


def categorical(n):
    """Return the first n categorical colors (S1..Sn), excluding S10 (fill-only)
    unless explicitly needed. Raises if n > 9 for series use."""
    if n > 9:
        raise ValueError("Max 9 series; S10 Champagne is background-fill only.")
    return CATEGORICAL[:n]


def region_color(region):
    """Fixed island-group color. Keep assignments consistent across a document."""
    return REGIONS[region.strip().lower()]


def status(kind):
    """KPI delta / flag color. Never use gold for negative — it reads positive."""
    return STATUS[kind.strip().lower()]


def hex_to_rgb(h):
    """'#RRGGBB' -> (r, g, b) ints 0-255. Handy for python-pptx RGBColor."""
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def apply_matplotlib():
    """Set matplotlib rcParams to PRIME defaults (call before plotting)."""
    import matplotlib as mpl
    from cycler import cycler
    mpl.rcParams.update({
        "axes.prop_cycle": cycler(color=CATEGORICAL[:9]),
        "figure.facecolor": NEUTRALS["ivory"],
        "axes.facecolor":   NEUTRALS["ivory"],
        "axes.edgecolor":   NEUTRALS["stone"],
        "axes.titlecolor":  PRIME["blue"],
        "text.color":       NEUTRALS["onyx"],
        "axes.labelcolor":  NEUTRALS["stone"],
        "xtick.color":      NEUTRALS["stone"],
        "ytick.color":      NEUTRALS["stone"],
        "grid.color":       "#CCCCCC",
        "grid.alpha":       0.10,        # never colored/heavy grid lines
        "font.family":      ["Montserrat", "Arial", "Helvetica", "sans-serif"],
        "font.size":        10,
    })


if __name__ == "__main__":
    print("PRIME core:", PRIME)
    print("backgrounds:", BACKGROUNDS)
    print("3 regions:", [region_color(r) for r in ("luzon", "visayas", "mindanao")])
    print("4 series:", categorical(4))
    print("blue rgb:", hex_to_rgb(PRIME["blue"]))
