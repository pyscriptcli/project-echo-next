# PRIME Fonts

All three PRIME typefaces are free on Google Fonts.

## Web (HTML / React)
Already included at the top of `assets/brand.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Bebas+Neue&family=Montserrat:wght@400;500&display=swap');
```
Or as a `<link>` in `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Bebas+Neue&family=Montserrat:wght@400;500&display=swap" rel="stylesheet">
```

## Documents / slides (docx, pptx, Google Docs/Slides)
Install the fonts locally (or in the rendering environment) for best fidelity:
- Cormorant Garamond — https://fonts.google.com/specimen/Cormorant+Garamond
- Bebas Neue — https://fonts.google.com/specimen/Bebas+Neue
- Montserrat — https://fonts.google.com/specimen/Montserrat

In a Linux build environment:
```bash
pip install --break-system-packages fonttools 2>/dev/null
mkdir -p ~/.fonts
# download the .ttf files for the three families into ~/.fonts, then:
fc-cache -f ~/.fonts
```

## Fallbacks (only if brand fonts are unavailable)
- Cormorant Garamond → Georgia, "Times New Roman", serif
- Bebas Neue → "Arial Narrow", Impact, sans-serif
- Montserrat → Arial, Helvetica, sans-serif
