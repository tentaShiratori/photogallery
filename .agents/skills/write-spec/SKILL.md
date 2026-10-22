---
name: write-spec
description: >-
  Write or revise photogallery use cases in docs/spec.
  Use when editing docs/spec, adding a UC, or recording a behavior change in the spec.
---

# Write spec

Behavior lives in the domain file under `docs/spec`. Terms live in `GLOSSARY.md`. The shape lives in the 書き方 section of `docs/spec/README.md`. Follow that section. Do not add a second copy of a UC in the skill or in the README.

## When a behavior changes

Update the UC in the same PR. List the UC IDs in the PR body. A new term goes in `GLOSSARY.md` in that PR. Do not put an external article URL in the repo.

## Actors and subjects

The primary actor is one of ユーザー, アドミン, or スクリプト. A UC about the screen uses ユーザー. Upload uses スクリプト. One UC has one goal and one actor. The name ends in a verb.

On a screen, the system subject is ブラウザ. In upload, the system subject is スクリプト. Do not make a screen part the subject.

## What to leave out

In the flow, write only the change where it happens. Do not end a path with a line that only restates the previous step. The end state belongs in 事後条件.

Leave out layout and position that a person can see on the screen. Leave out a statement that the opposite of another condition already gives. Leave out the browser's or the video element's initial behavior. Leave out implementation, file names, and reasons.

Keep the current UI string in 「」. Use glossary words.

## Flow

Number the main steps from 1. One subject and one action per line. Put an alternate directly under its step as `- 3a.`, then `- 3b.`. Put an exception as `- 3e.`, then `- 3f.`. Indent the steps of that path one level further. Do not send the reader to another step number. If more changes belong to that path, write them inside it.

A precondition is already true when the UC starts. A check that chooses a path goes in the flow. If there is no failure path, 事後条件（失敗） is 「なし」. Add トリガー, 関連, or 未決 only when it has text.

## IDs already folded in

The empty gallery is an alternate of UC-GAL-01. Video in the viewer is an alternate of UC-VIEW-01. The email next to the heading is an alternate of UC-LOGIN-01. Image and video delivery share UC-MEDIA-01. Do not open a new UC that only repeats one of those branches.
