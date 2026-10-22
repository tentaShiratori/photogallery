# How to write

The live files under `docs/spec` stay in Japanese and keep the field labels already used there. Match a neighboring UC or rule file when you edit. The English names below are this skill's terms for that shape.

| Term                     | Live label       |
| ------------------------ | ---------------- |
| ID                       | ID               |
| Name                     | 名前             |
| Primary actor            | 主アクター       |
| Preconditions            | 事前条件         |
| Related                  | 関連             |
| Postconditions (success) | 事後条件（成功） |
| Postconditions (failure) | 事後条件（失敗） |
| Flow                     | フロー           |
| Trigger                  | きっかけ         |
| Open                     | 未決             |

## Use cases

One UC is one goal the user or the script reaches in one go. End the name with a verb. The primary actor is exactly one of User, Admin, or Script. A UC about the screen uses User. Upload uses Script. Live files write those as ユーザー, 管理者, or スクリプト.

Do not put a decision or a promise that is not that goal into a UC. Write it as a rule and refer to it by ID from the UC. If a rule ID already states the promise, the UC line is `関連` plus that ID. Do not paste the rule's bullets into the UC flow or postconditions.

Required fields are ID, Name, Primary actor, Preconditions, Postconditions (success), Postconditions (failure), and Flow. The ID is `UC-NN` and matches the heading. Do not leave gaps in the numbering. Put one UC per file under `docs/spec`. Name the file `UC-NN-<name>.md`. A precondition is already true when the UC starts. Use `なし` when there is none. If there is no failure path, Postconditions (failure) is `なし`. If a new control appears on a screen an existing UC already opens, edit that UC so the control is in its success state. The new UC may then list it as a precondition.

Number the flow from 1. One subject and one action per line. The subject is the primary actor, the browser, or the script. Do not make a screen part the subject. Write only the change in the flow. A fact that holds without a new action (for example that a kind of image often does not paint) stays in the rule, not as a flow step. Do not end a path with a line that only restates the previous step. Put the end state in Postconditions.

Put an alternate directly under its step as `- 3a.`, then `- 3b.`. Put an exception as `- 3e.`, then `- 3f.`. Indent the steps of that path one level further. Nested under an alternate, write `- 1a-a.` or `- 1a-e.`. Do not send the reader to another step number. If more changes belong to that path, write them inside it.

Postconditions holds only the change that remains at the end of that path. Write something that disappears mid-flow in the flow, not in Postconditions. Do not add a failure postcondition that is only the success of a recovery already written inside that exception.

Leave out layout and position that a person can see on the screen. Leave out a statement that the opposite of another condition already gives. Leave out the browser's or the video element's initial behavior. Leave out implementation, file names, and reasons.

Keep the current UI and console string in quotation marks, exactly as it appears in the product. Use the words from `GLOSSARY.md`.

Add Trigger, Related, or Open only when the field has text.

```markdown
## UC-NN 名前は動詞で終わる

- ID: UC-NN
- 名前: 名前は動詞で終わる
- 主アクター: ユーザー
- 事前条件: なし
- 関連: R-GAL-01 は並び順。
- 事後条件（成功）:
  - 終わりの状態が出ている。
- 事後条件（失敗）: なし

### フロー

1. ユーザーが操作する。
   - 1a. 別の成功の道。
     1. ブラウザはその変化を出す。
   - 1e. 目標に届かない。
     1. ブラウザは失敗の変化を出す。
2. ブラウザは成功の変化を出す。
```

Nested under an alternate:

```markdown
1. スクリプトが本番の操作をする。
   - 1a. ローカルである。
     1. スクリプトはローカルの操作をする。
     - 1a-e. 失敗する。
       1. スクリプトは失敗の文言を出す。
   - 1e. 失敗する。
     1. スクリプトは失敗の文言を出す。
```

## Rules

There are two kinds of rules.

- Model rules: hold without a screen or an API. Put them in `docs/spec/domain`.
- App rules: screen or API behavior. Put them in `docs/spec/app`.

One file per entity or aggregate. Several rules may share a file. A rule that spans aggregates goes in the file of the main subject. Other subjects link to it.

Each rule has an ID and a short name. The body is bullets with examples. A rule has no flow.

```markdown
## R-GAL-NN 短い名前

- 約束。例は `2024-08-02T12-00-00.jpg` である。
```
