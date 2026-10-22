# Specification

Behavior is defined here. Terms are in [GLOSSARY.md](../../GLOSSARY.md).

## Index

### Use cases

| ID    | Name                     | File                                                                   |
| ----- | ------------------------ | ---------------------------------------------------------------------- |
| UC-01 | View gallery             | [UC-01-view-gallery.md](UC-01-view-gallery.md)                         |
| UC-02 | Enlarge gallery media    | [UC-02-enlarge-gallery-media.md](UC-02-enlarge-gallery-media.md)       |
| UC-03 | Enter production gallery | [UC-03-enter-production-gallery.md](UC-03-enter-production-gallery.md) |
| UC-04 | Upload a folder          | [UC-04-upload-folder.md](UC-04-upload-folder.md)                       |

### Domain rules

| File                               | Contents                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [domain/media.md](domain/media.md) | Name shape, how the year is decided, how capture date-time is decided, image and video extensions (`R-MEDIA-01` onward) |

### App rules

| File                             | Contents                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| [app/gallery.md](app/gallery.md) | Sort order, list limit, list API shape, delivery, keep out of search results (`R-GAL-01` onward) |
| [app/access.md](app/access.md)   | Production access (`R-ACCESS-01`)                                                                |
