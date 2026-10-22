# How to write

## Use cases

One UC is one goal the user or the script reaches in one go. End the name with a verb. The primary actor is exactly one of ユーザー, アドミン, or スクリプト. A UC about the screen uses ユーザー. Upload uses スクリプト.

Do not put a decision or a promise that is not that goal into a UC. Write it as a rule and refer to it by ID from the UC.

Required fields are ID, 名前, 主アクター, 事前条件, 事後条件（成功）, 事後条件（失敗）, and フロー. The ID is `UC-番号` and matches the heading. Do not leave gaps in the numbering. Put one UC per file under `docs/spec`. Name the file `UC-番号-名前.md`. A precondition is already true when the UC starts. Use 「なし」 when there is none. If there is no failure path, 事後条件（失敗） is 「なし」.

Number the flow from 1. One subject and one action per line. The subject is the primary actor, ブラウザ, or スクリプト. Do not make a screen part the subject. Write only the change in the flow. Do not end a path with a line that only restates the previous step. Put the end state in 事後条件.

Put an alternate directly under its step as `- 3a.`, then `- 3b.`. Put an exception as `- 3e.`, then `- 3f.`. Indent the steps of that path one level further. Do not send the reader to another step number. If more changes belong to that path, write them inside it.

事後条件 holds only the change that remains at the end of that path. Write something that disappears mid-flow in the flow, not in 事後条件.

Leave out layout and position that a person can see on the screen. Leave out a statement that the opposite of another condition already gives. Leave out the browser's or the video element's initial behavior. Leave out implementation, file names, and reasons.

Keep the current UI and console string in 「」. Use the words from `GLOSSARY.md`.

Add トリガー, 関連, or 未決 only when the field has text.

```markdown
## UC-01 ギャラリーを見る

- ID: UC-01
- 名前: ギャラリーを見る
- 主アクター: ユーザー
- 事前条件: なし
- 関連: 年は R-MEDIA-02。順番は R-GAL-01。
- 事後条件（成功）:
- 事後条件（失敗）:

### フロー

1. ユーザーがギャラリーを開く。
   - 1a. 別の成功する道。
     1. ブラウザはその変化を行う。
   - 1e. 目的が達しない道。
     1. ブラウザは失敗の変化を行う。
2. ブラウザは成功の変化を行う。
```

## Rules

There are two kinds of rules.

- Model rules: hold without a screen or an API. Put them in `docs/spec/domain`.
- App rules: screen or API behavior. Put them in `docs/spec/app`.

One file per entity or aggregate. Several rules may share a file. A rule that spans aggregates goes in the file of the main subject. Other subjects link to it.

Each rule has an ID and a short name. The body is bullets with examples. A rule has no flow.
