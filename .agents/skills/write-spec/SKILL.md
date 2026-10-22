---
name: write-spec
description: >-
  Write or revise photogallery use cases in docs/spec.
  Use when editing docs/spec, adding a UC, or recording a behavior change in the spec.
---

# Write spec

Behavior lives under `docs/spec`. Terms live in `GLOSSARY.md`. The shape lives in the 書き方 section of `docs/spec/README.md`. Follow that section. Do not add a second copy of a UC in the skill or in the README.

## When a behavior changes

Update the UC or the rule in the same PR. List the UC IDs and the rule IDs in the PR body. A new term goes in `GLOSSARY.md` in that PR. Do not put an external article URL in the repo.

## Actors and subjects

The primary actor is one of ユーザー, アドミン, or スクリプト. A UC about the screen uses ユーザー. Upload uses スクリプト. One UC has one goal and one actor. The name ends in a verb.

On a screen, the system subject is ブラウザ. In upload, the system subject is スクリプト. Do not make a screen part the subject.

## UC unit

One UC is one goal the user or the script reaches in one go. A decision or a promise that is not that goal is a rule. Write the rule under `docs/spec/domain` or `docs/spec/app`, and refer to it by ID from the UC.

Put one UC in one file under `docs/spec`. Name the file `UC-番号-名前.md`. IDs run from `UC-01` with no gaps.

## Rules

Model rules hold without a screen or an API. Put them in `docs/spec/domain`. App rules are screen or API behavior. Put them in `docs/spec/app`. One file per entity or aggregate. Several rules may share a file. A rule that spans aggregates goes in the file of the main subject. Other subjects link to it.

Each rule has an ID and a short name. The body is bullets with examples. A rule has no flow.

## What to leave out

In the flow, write only the change where it happens. Do not end a path with a line that only restates the previous step. The end state belongs in 事後条件.

Leave out layout and position that a person can see on the screen. Leave out a statement that the opposite of another condition already gives. Leave out the browser's or the video element's initial behavior. Leave out implementation, file names, and reasons.

Keep the current UI string in 「」. Use glossary words.

## Flow

Number the main steps from 1. One subject and one action per line. Put an alternate directly under its step as `- 3a.`, then `- 3b.`. Put an exception as `- 3e.`, then `- 3f.`. Indent the steps of that path one level further. Do not send the reader to another step number. If more changes belong to that path, write them inside it.

A precondition is already true when the UC starts. A check that chooses a path goes in the flow. If there is no failure path, 事後条件（失敗） is 「なし」. Add トリガー, 関連, or 未決 only when it has text.

## IDs already folded in

The empty gallery, the login label next to the heading, and loading the next page of tiles are alternates of UC-01. Video in the viewer and closing with 「閉じる」 or Escape are paths of UC-02. Do not open a new UC that only repeats one of those branches. Naming, year, capture time, and extensions are rules under `domain/media.md`. Sort order, list caps, list API shape, and delivery are rules under `app/gallery.md`.
