# Media

Terms are in [GLOSSARY.md](../../../GLOSSARY.md).

## R-MEDIA-01 Name shape

- When capture date-time is known, the name of the image or video on disk is `YYYY-MM-DDTHH-mm-ss.extension`. Hours, minutes, and seconds are separated by `-`. The extension is lowercase. For example, on-disk `IMG_0001.JPG` becomes `2024-08-02T12-00-00.jpg`.
- When capture date-time cannot be determined, the name of the image or video on disk is `u-`, then a 12-character lowercase hex derived from the bytes, then a lowercase extension. The same bytes always yield the same 12 characters.
- Within one run, items that share a capture date-time get distinct numbers even when their extensions differ. The first has no suffix. The next takes the first free number from `-2` and inserts it just before the extension. Example: `2024-08-02T12-00-00-2.jpg`. The same rule applies to `u-` names. Example: `u-abc123def456-2.png`. When that name already exists in the run, insert the first free number from `-2` just before the extension. Next example: `2024-08-02T12-00-00-3.jpg`.
- The thumbnail name is `t/`, then the body name without its extension, then `.webp`. The long edge is 320.
- In another run, numbering ignores names already in storage. Uploading under an existing name replaces the stored bytes.
- Names are decided in the order the folder is read.

## R-MEDIA-02 How the year is decided

- An item belongs to a year when its body name starts with `YYYY-MM-DDTHH-mm-ss`, that datetime is valid, and the name ends with an image or video extension. A `-digits` just before the extension still counts as the same datetime. Examples: `2024-08-02T12-00-00.jpg` and `2024-08-02T12-00-00-2.jpg` are both year 2024.
- The year heading uses the year number without a leading zero. Example: for `0007-01-01T00-00-00.jpg`, the year heading is 「7」.
- An item whose body name starts with `u-` and twelve hex digits belongs to 「年不明」. Capture date-time is empty. Example: `u-abc123def456.png`.
- Items that match neither shape do not appear in the list. Examples: `u-abc.png` and the invalid date `2023-02-29T00-00-00.jpg`.
- The year is read from each media item's body name.
- Order among years, and headings for years with no media, are in [R-GAL-01](../app/gallery.md#r-gal-01-sort-order).

## R-MEDIA-03 How capture date-time is decided

- When capture date-time is known, that calendar datetime is used in the name ([R-MEDIA-01](#r-media-01-name-shape)).
- For JPEG, PNG, and WebP, when a capture date-time field parses as a calendar datetime, the first 64 chunks are scanned. The capture date-time chunk is read up to 256 KiB. The written values become capture date-time. The format is `year:month:day hour:minute:second`.
- For AVIF, HEIC, and HEIF, when capture date-time at an offset from the start parses as a calendar datetime, the first 64 chunks are scanned. Location chunks are read up to 1 MiB and capture date-time up to 256 KiB. Nested chunks are limited to 64. The written values become capture date-time. The format matches JPEG.
- For MP4, MOV, and M4V, when a capture date-time field or creation date-time is found, the first 64 chunks are scanned. Chunks that hold capture date-time or creation date-time are limited to 32 nested chunks, and to 64 when walking further. Each chunk is read up to 1 MiB.
- For video, when the capture date-time field has the form `year-month-dayThour:minute:second±offset` and parses, the offset is dropped and year through second become capture date-time.
- For video, when the capture date-time field is missing or unreadable, the Android mark is present, and creation date-time is found, creation date-time in UTC calendar form becomes capture date-time.
- For video, when the capture date-time field is missing or unreadable, the Android mark is absent, and creation date-time is found, creation date-time is shifted to Japan Standard Time (UTC+9) and becomes capture date-time.
- Cases with no datetime from the bytes include GIF, WebM, read failure, a limit exceeded, JPEG without a capture date-time field, AVIF-family files without offset-based capture date-time, video with neither capture date-time nor creation date-time, and values that are not a valid calendar datetime.
- When none of the above apply and modification date-time is more than 7 days before run time, modification date-time becomes capture date-time in the machine's local calendar. Fractions of a second are dropped.
- When modification date-time is not older than 7 days, or is not a valid calendar datetime, capture date-time is not set. The name uses the `u-` form from [R-MEDIA-01](#r-media-01-name-shape).

## R-MEDIA-04 Image and video extensions

- Upload targets are only files directly under the folder.
- The last extension must be jpg, jpeg, png, gif, webp, avif, heic, heif, mp4, mov, webm, or m4v. Uppercase and lowercase both count.
- Example: `archive.tar.gz` is excluded because the last extension is gz.
- Names that start with `.` are excluded.
- Symbolic links are excluded even when the link target is an image or video.
- HEIC and HEIF delivery in the UI is in [R-GAL-06](../app/gallery.md#r-gal-06-serve-heic-and-heif).
