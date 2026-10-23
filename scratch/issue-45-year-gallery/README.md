# Issue 45 year-gallery prototypes (throwaway)

Visual-only mocks for the year list and year screen. Not wired to the Worker.
Production code, specs, and tests stay untouched until an owner picks a direction.

## Run

```bash
npx --yes serve -l 4173 scratch/issue-45-year-gallery
```

Open `http://127.0.0.1:4173/`. Use the top bar to switch 案 A / B / C and 年の一覧 / 年の画面.

## Variants

- **A フィルム帯.** Year on the left, up to four equal thumbs in a row. Whole row opens the year screen.
- **B 年ブロック.** Year heading above four larger previews, close to today's tile size. More vertical space.
- **C 密な索引.** Dense rows with small thumbs so more years fit on screen.

Fixture data includes 2025, 2024, 2022 (only two thumbs), and 年不明 last. The year screen for 2024 shows `（上限で打ち切っています）` and no `N 件` label.

## Screenshots

See `shots/`.
