# UC-02 Enlarge gallery media

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-02
- Name: Enlarge gallery media
- Primary actor: User
- Preconditions: At least one thumbnail is shown in the gallery.
- Related: R-GAL-04 is body delivery. R-GAL-06 is HEIC and HEIF.
- Postconditions (success):
  - The enlarged view shows the body. The body's name is shown. 「閉じる」 is shown.
  - When the chosen media is a video, autoplay and user controls are specified.
  - After the user chooses 「閉じる」, the enlarged view is not shown. Tiles remain.
- Postconditions (failure): None

### Flow

1. The user selects a thumbnail.
2. The browser shows the body in the enlarged view.
   - 2a. The chosen media is a video.
     1. The browser specifies autoplay.
     2. The browser specifies user controls.
3. The browser shows the body's name.
4. The browser shows 「閉じる」.
   - 4a. The user chooses 「閉じる」.
     1. The browser hides the enlarged view.
