# Issue 45 year-gallery prototypes (throwaway)

Visual-only mocks for the year list and year screen. Not wired to the Worker.

## Locked

- **Desktop:** variant A (film strip). Year on the left, up to four equal thumbs in a row.

## Mobile adaptations of A

Phone stage is ~390px wide. Same rules as desktop A (up to 4 thumbs, 年不明 last, no N 件, cap note on year screen).

- **M1 横並び圧縮.** Same side-by-side structure as A, with a narrower year column and shorter thumbs.
- **M2 年の下に帯.** Year on top, film strip of up to four thumbs below.
- **M3 年の下に 2×2.** Year on top, 2×2 grid so each thumb is larger.

## Run

```bash
npx --yes serve -l 4173 scratch/issue-45-year-gallery
```

Open `http://127.0.0.1:4173/`. Use the top bar to switch surface, mobile variant, and screen.

## Screenshots

See `shots/`.
