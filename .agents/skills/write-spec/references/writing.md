# How to write

The live files under `docs/spec` stay in Japanese and keep the field labels already used there. Match a neighboring UC or rule file when you edit. The English names below are this skill's terms for that shape.

## Use cases

One UC is one goal the user or the script reaches in one go. End the name with a verb. The primary actor is exactly one of User, Admin, or Script. A UC about the screen uses User. Upload uses Script.

Do not put a decision or a promise that is not that goal into a UC. Write it as a rule and refer to it by ID from the UC.

Required fields are ID, Name, Primary actor, Preconditions, Postconditions (success), Postconditions (failure), and Flow. The ID is `UC-NN` and matches the heading. Do not leave gaps in the numbering. Put one UC per file under `docs/spec`. Name the file `UC-NN-<name>.md`. A precondition is already true when the UC starts. Use `none` when there is none. If there is no failure path, Postconditions (failure) is `none`.

Number the flow from 1. One subject and one action per line. The subject is the primary actor, the browser, or the script. Do not make a screen part the subject. Write only the change in the flow. Do not end a path with a line that only restates the previous step. Put the end state in Postconditions.

Put an alternate directly under its step as `- 3a.`, then `- 3b.`. Put an exception as `- 3e.`, then `- 3f.`. Indent the steps of that path one level further. Do not send the reader to another step number. If more changes belong to that path, write them inside it.

Postconditions holds only the change that remains at the end of that path. Write something that disappears mid-flow in the flow, not in Postconditions.

Leave out layout and position that a person can see on the screen. Leave out a statement that the opposite of another condition already gives. Leave out the browser's or the video element's initial behavior. Leave out implementation, file names, and reasons.

Keep the current UI and console string in quotation marks, exactly as it appears in the product. Use the words from `GLOSSARY.md`.

Add Trigger, Related, or Open only when the field has text.

```markdown
## UC-01 View the gallery

- ID: UC-01
- Name: View the gallery
- Primary actor: User
- Preconditions: none
- Related: Year is R-MEDIA-02. Order is R-GAL-01.
- Postconditions (success):
- Postconditions (failure):

### Flow

1. The user opens the gallery.
   - 1a. Another successful path.
     1. The browser makes that change.
   - 1e. The goal is not reached.
     1. The browser makes the failure change.
2. The browser makes the success change.
```

## Rules

There are two kinds of rules.

- Model rules: hold without a screen or an API. Put them in `docs/spec/domain`.
- App rules: screen or API behavior. Put them in `docs/spec/app`.

One file per entity or aggregate. Several rules may share a file. A rule that spans aggregates goes in the file of the main subject. Other subjects link to it.

Each rule has an ID and a short name. The body is bullets with examples. A rule has no flow.
