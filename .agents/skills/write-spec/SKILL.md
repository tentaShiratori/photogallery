---
name: write-spec
description: >-
  Use when editing docs/spec, adding or revising a photogallery use case (UC)
  or rule, listing UC or rule IDs in a PR, seeing Japanese outside 「」 or a
  source file name in a spec draft, writing Postconditions or alternate flows,
  deciding whether a change is a new UC or a path of an existing one, or
  tempted to copy writing rules into docs/spec/README.md.
---

# Write spec

Behavior lives under `docs/spec`. Terms live in `GLOSSARY.md`. Write `docs/` in English. Keep product UI and console strings inside 「」 exactly as shown in the product.

**Open [references/writing.md](references/writing.md) before writing any spec line.** That file is the shape. This page is not a substitute. Do not write a UC or a rule from memory of this page.

## When a behavior changes

In the same PR: update the UC or the rule, list those IDs in the PR body, and add a new term to `GLOSSARY.md` if you named one. Do not put an external article URL in the repo.

## Which file

Look at the live files under `docs/spec`, not a remembered ID list.

| If                                                                                      | Then                                                                                                                    |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Same primary actor and same goal as an existing UC                                      | Edit that UC. Put the change in the flow as an alternate (`Na`) or exception (`Ne`).                                    |
| A standing promise with no user or script goal (name, year, order, API shape, delivery) | Edit or add a rule under `domain/` or `app/`. The UC names the rule by ID. Do not paste the rule's bullets into the UC. |
| A new goal the actor reaches in one go                                                  | Add `UC-NN-<english-kebab-name>.md` and a README row.                                                                   |

Do not restate writing.md in `docs/spec/README.md`, in a UC, or in this skill. README stays an index.

## Common mistakes

| Excuse or draft                                                 | Do this                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| "README needs the writing guide; contractors cannot see skills" | The skill lives in the repo. GitHub can open writing.md. README stays an index.    |
| "do-not-restate is for agents, not humans"                      | Humans and agents read the same README. writing.md stays the one copy.             |
| "QA only reads the UC; paste the rule into postconditions"      | `Related` names the rule ID. Do not copy the rule's bullets.                       |
| Empty `Open` / `Trigger` on every UC                            | Add those fields only when they have text.                                         |
| Draft with a source path and onClick                            | Match a neighboring English UC. Subject is the actor, the browser, or the script.  |
| Japanese outside 「」 in a new docs/spec line                     | Rewrite in English. Keep only product strings inside 「」.                         |
| New UC whose actor and goal match an existing file              | Edit that file.                                                                    |
| New goal, but the control appears on an existing screen         | Edit that screen's UC so the control is in its success state.                      |

## Red flags

- Writing a spec line without having opened writing.md
- Pasting writing.md into README
- Empty Open or Trigger on every UC
- Rule bullets copied into a UC
- Source path or onClick as a flow subject
- Japanese outside 「」 under `docs/`
- New UC whose actor and goal match an existing file
- New control on an existing screen without editing that screen's UC

How to write: [references/writing.md](references/writing.md).
