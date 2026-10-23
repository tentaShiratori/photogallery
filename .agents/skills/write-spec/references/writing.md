# How to write

The live files under `docs/spec` stay in English and keep the field labels already used there. Match a neighboring UC or rule file when you edit. Write every new or revised line in English. Keep screen and console strings inside 「」 exactly as they appear in the product (those strings may be Japanese).

| Term                     | Live label               |
| ------------------------ | ------------------------ |
| ID                       | ID                       |
| Name                     | Name                     |
| Primary actor            | Primary actor            |
| Preconditions            | Preconditions            |
| Related                  | Related                  |
| Postconditions (success) | Postconditions (success) |
| Postconditions (failure) | Postconditions (failure) |
| Flow                     | Flow                     |
| Trigger                  | Trigger                  |
| Open                     | Open                     |

## Use cases

One UC is one goal the user or the script reaches in one go. End the name with a verb. The primary actor is exactly one of User, Admin, or Script. A UC about the screen uses User. Upload uses Script.

Do not put a decision or a promise that is not that goal into a UC. Write it as a rule and refer to it by ID from the UC. If a rule ID already states the promise, the UC line is `Related` plus that ID. Do not paste the rule's bullets into the UC flow or postconditions.

Required fields are ID, Name, Primary actor, Preconditions, Postconditions (success), Postconditions (failure), and Flow. The ID is `UC-NN` and matches the heading. Do not leave gaps in the numbering. Put one UC per file under `docs/spec`. Name the file `UC-NN-<english-kebab-name>.md`. A precondition is already true when the UC starts. Use `None` when there is none. If there is no failure path, Postconditions (failure) is `None`. If a new control appears on a screen an existing UC already opens, edit that UC so the control is in its success state. The new UC may then list it as a precondition.

Number the flow from 1. One subject and one action per line. The subject is the primary actor, the browser, or the script. Do not make a screen part the subject. Write only the change in the flow. A fact that holds without a new action (for example that a kind of image often does not paint) stays in the rule, not as a flow step. Do not end a path with a line that only restates the previous step. Put the end state in Postconditions.

Put an alternate directly under its step as `- 3a.`, then `- 3b.`. Put an exception as `- 3e.`, then `- 3f.`. Indent the steps of that path one level further. Nested under an alternate, write `- 1a-a.` or `- 1a-e.`. Do not send the reader to another step number. If more changes belong to that path, write them inside it.

Postconditions holds only the change that remains at the end of that path. Write something that disappears mid-flow in the flow, not in Postconditions. Do not add a failure postcondition that is only the success of a recovery already written inside that exception.

Leave out layout and position that a person can see on the screen. Leave out a statement that the opposite of another condition already gives. Leave out the browser's or the video element's initial behavior. Leave out implementation, file names, and reasons.

Keep the current UI and console string in 「」, exactly as it appears in the product. Use the English headwords from `GLOSSARY.md`.

Add Trigger, Related, or Open only when the field has text.

```markdown
## UC-NN Name ends with a verb

- ID: UC-NN
- Name: Name ends with a verb
- Primary actor: User
- Preconditions: None
- Related: R-GAL-01 is sort order.
- Postconditions (success):
  - The end state is visible.
- Postconditions (failure): None

### Flow

1. The user acts.
   - 1a. Another success path.
     1. The browser shows that change.
   - 1e. The goal is not reached.
     1. The browser shows the failure change.
2. The browser shows the success change.
```

Nested under an alternate:

```markdown
1. The script runs the production operation.
   - 1a. It is local.
     1. The script runs the local operation.
     - 1a-e. It fails.
       1. The script prints the failure message.
   - 1e. It fails.
     1. The script prints the failure message.
```

## Rules

There are two kinds of rules.

- Model rules: hold without a screen or an API. Put them in `docs/spec/domain`.
- App rules: screen or API behavior. Put them in `docs/spec/app`.

One file per entity or aggregate. Several rules may share a file. A rule that spans aggregates goes in the file of the main subject. Other subjects link to it.

Each rule has an ID and a short name. The body is bullets with examples. A rule has no flow.

```markdown
## R-GAL-NN Short name

- The promise. An example is `2024-08-02T12-00-00.jpg`.
```
