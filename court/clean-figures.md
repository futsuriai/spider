# Cleaning Court Card Figures (`court/figures-clean/`)

## Method

Inspection of the 12 SVG files in `court/figures/` (from Byron Knoll's Vector Playing Cards deck) showed that although the court figure artwork itself is stored as multi-path colour layers (`#g2987`, `#g3823`, `#g3767`, `#g3755`, `#g3039`), the large upper-left suit symbol inside the portrait frame is **not** baked into those colour-layer paths. Instead, in every file it is a standalone top-level `<g>` element containing a single suit `<path>`:

- **Clubs** (`club_jack.svg`, `club_king.svg`, `club_queen.svg`): `<g id="layer1-1-4"><path id="cl-9" .../></g>`
- **Diamonds** (`diamond_jack.svg`, `diamond_king.svg`, `diamond_queen.svg`): `<g id="layer1-2-6"><path id="dl-6" .../></g>`
- **Hearts** (`heart_jack.svg`, `heart_king.svg`, `heart_queen.svg`): `<g id="layer1-9-6"><path id="hl-8" .../></g>`
- **Spades** (`spade_jack.svg`, `spade_king.svg`, `spade_queen.svg`): `<g id="layer1-7"><path id="sl" .../></g>`

For each of the 12 SVG files, we removed only that single `<g>` element (leaving the figure colour layers, decorative suit motifs on the clothing, inner frame `#Layer_x0020_1-8`, card background `#Layer_x0020_1`, and all other elements byte-for-byte intact) and wrote the result to `court/figures-clean/<name>.svg`.

## Verification & Status

- All 12 cleaned SVG files in `court/figures-clean/` were rendered in headless Chromium via Playwright (`<img>` embedding each SVG) and visually verified.
- **Files that could not be cleaned:** None (all 12/12 files were cleanly processed).
