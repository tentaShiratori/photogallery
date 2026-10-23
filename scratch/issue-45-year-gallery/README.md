# Issue 45 year-gallery prototypes (throwaway)

Visual-only mocks for the year list and year screen. Not wired to the Worker.

## Locked

- **Mobile:** M3. Year above a 2×2 of up to four thumbs.
- **Desktop year list previews:** 2×2 (not the old 1×4 film strip). Desktop year screen stays the A-style tile grid.

## Desktop 2×2 variants (open)

- **D1 縦1列・年上.** One column of year cards. Year above 2×2. Same structure as Mobile M3, larger.
- **D2 年左・2×2右.** One column. Year on the left, 2×2 on the right (old A reading order).
- **D3 年カード2列.** Two year cards per row. Each card is year above 2×2.

Fixture data includes full years, 2022 with two thumbs (partial 2×2), and 年不明 last with three thumbs.

## Run

```bash
npx --yes serve -l 4173 scratch/issue-45-year-gallery
```

Open `http://127.0.0.1:4173/`.

## Screenshots

See `shots/`.
