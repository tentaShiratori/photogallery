# UC-02 Enlarge gallery media

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-02
- Name: Enlarge gallery media
- Primary actor: User
- Preconditions: At least one thumbnail is shown in the gallery.
- Related: R-GAL-04 is serve content. R-GAL-06 is serve HEIC and HEIF.
- Postconditions (success):
  - The enlarged view shows the body. The body name is shown. 「閉じる」 is shown.
  - When the chosen media is a video, autoplay is set and playback controls are set.
  - After the user chooses 「閉じる」, the enlarged view is gone. The tiles remain.
- Postconditions (failure): None

### Flow

1. The user selects a thumbnail.
2. The browser shows the body in the enlarged view.
   - 2a. The chosen media is a video.
     1. The browser sets autoplay.
     2. The browser sets playback controls.
3. The browser shows the body name.
4. The browser shows 「閉じる」.
   - 4a. The user chooses 「閉じる」.
     1. The browser hides the enlarged view.
