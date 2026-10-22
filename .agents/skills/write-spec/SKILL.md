---
name: write-spec
description: >-
  Write or revise photogallery use cases and rules in docs/spec.
  Use when editing docs/spec, adding a UC or a rule, or recording a behavior change in the spec.
---

# Write spec

Behavior lives under `docs/spec`. Terms live in `GLOSSARY.md`.

How to write lives only in [references/writing.md](references/writing.md). Follow that file. Do not restate those rules in `docs/spec/README.md` or elsewhere. Do not add a second copy of a UC in the skill or in the README.

## When a behavior changes

Update the UC or the rule in the same PR. List the UC IDs and the rule IDs in the PR body. A new term goes in `GLOSSARY.md` in that PR. Do not put an external article URL in the repo.

## IDs already folded in

The empty gallery, the login label next to the heading, and loading the next page of tiles are alternates of UC-01. Video in the viewer and closing with 「閉じる」 or Escape are paths of UC-02. Do not open a new UC that only repeats one of those branches. Naming, year, capture time, and extensions are rules under `domain/media.md`. Sort order, list caps, list API shape, and delivery are rules under `app/gallery.md`.
