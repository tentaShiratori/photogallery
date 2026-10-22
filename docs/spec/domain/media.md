# Media

Terms are in [GLOSSARY.md](../../../GLOSSARY.md).

## R-MEDIA-01 Name shape

- When capture date-time is known, the on-disk image or video name is `YYYY-MM-DDTHH-mm-ss.extension`. Hour, minute, and second are separated by `-`. The extension is lowercase. For example, on-disk `IMG_0001.JPG` becomes `2024-08-02T12-00-00.jpg`.
- When capture date-time cannot be determined, the on-disk image or video name is `u-` followed by a 12-character lowercase hex derived from the bytes, then a lowercase extension. The same bytes yield the same 12 characters.
- Within one run, items with the same capture date-time get distinct suffix numbers even when extensions differ. The first has no suffix. The next appends the first free number from `-2` immediately before the extension. Example: `2024-08-02T12-00-00-2.jpg`. The same applies to `u-` names; example: `u-abc123def456-2.png`. When the same name already exists in the run, append the first free number from `-2` before the extension. Next example: `2024-08-02T12-00-00-3.jpg`.
- The thumbnail name is `t/` plus the body name without extension, plus `.webp`. The long edge is 320.
- In a different run, numbering does not consider names already in storage. Uploading the same name replaces the stored bytes.
- Names are decided in folder read order.

## R-MEDIA-02 How the year is decided

- An item whose body name starts with `YYYY-MM-DDTHH-mm-ss`, that datetime is valid, and the suffix is an image or video extension belongs to that year. A `-digits` immediately before the extension keeps the same datetime. Examples: `2024-08-02T12-00-00.jpg` and `2024-08-02T12-00-00-2.jpg` are both year 2024.
- The year heading uses the numeric year without a leading zero. Example: for `0007-01-01T00-00-00.jpg` the year heading is 「7」.
- An item whose body name starts with `u-` and 12 hex digits belongs to 「年不明」; capture date-time is empty. Example: `u-abc123def456.png`.
- Items matching neither shape do not appear in the list. Examples: `u-abc.png` and invalid date `2023-02-29T00-00-00.jpg`.
- The year is read from each media item's body name.
- Order among years and headings for years without media are in [R-GAL-01](../app/gallery.md#r-gal-01-sort-order).

## R-MEDIA-03 How capture date-time is decided

- When capture date-time is known, that calendar datetime is used in the name ([R-MEDIA-01](#r-media-01-name-shape)).
- For JPEG, PNG, and WebP, when a capture date-time field parses as a calendar datetime, the first 64 boxes are scanned. The capture date-time box is read up to 256 KiB. The written values become capture date-time. Format is `year:month:day hour:minute:second`.
- For AVIF, HEIC, and HEIF, when capture date-time at an offset from the start parses as a calendar datetime, the first 64 boxes are scanned. Location boxes up to 1 MiB and capture date-time up to 256 KiB are read. Nested boxes are limited to 64. Written values become capture date-time. Format matches JPEG.
- For MP4, MOV, and M4V, when a capture date-time field or creation date-time is found, the first 64 boxes are scanned. Boxes containing capture date-time or creation date-time are limited to 32 nested boxes and 64 when traversing further. Each box is read up to 1 MiB.
- For video, when the capture date-time field has form `year-month-dayThour:minute:second±offset` and parses, the offset is dropped and year through second become capture date-time.
- For video, when the capture date-time field is missing or unreadable, the Android mark is present, and creation date-time is found, creation date-time in UTC calendar form becomes capture date-time.
- For video, when the capture date-time field is missing or unreadable, the Android mark is absent, and creation date-time is found, creation date-time is shifted to Japan calendar (UTC plus 9 hours) for capture date-time.
- Cases with no datetime from bytes include GIF, WebM, read failure, limit exceeded, JPEG without capture date-time field, AVIF family without offset-based capture date-time, video without capture date-time and without creation date-time, and values that do not form a valid calendar datetime.
- When none of the above apply and modification date-time is more than 7 days before run time, modification date-time becomes capture date-time in the machine's local calendar. Subseconds are dropped.
- When modification date-time is not older than 7 days or is not a valid calendar datetime, capture date-time is not set. The name uses the `u-` form from [R-MEDIA-01](#r-media-01-name-shape).

## R-MEDIA-04 Image and video extensions

- Upload targets are only files directly under the folder.
- The last extension must be jpg, jpeg, png, gif, webp, avif, heic, heif, mp4, mov, webm, or m4v. Upper or lower case counts.
- Example: `archive.tar.gz` is excluded because the last extension is gz.
- Names starting with `.` are excluded.
- Symbolic links are excluded even when the target is an image or video.
- HEIC and HEIF delivery in the UI is in [R-GAL-06](../app/gallery.md#r-gal-06-serve-heic-and-heif).
