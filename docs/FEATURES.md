# Markdown Viewer — Features

This document records current user-visible behavior. A feature marked supported is implemented in the current client; it does not imply that the original local file can be modified.

The viewer's primary route is `/`. The project also retains the Blazor starter-template demonstration pages at `/counter` and `/weather`; those pages are not MDViewer features.

## Folder and document explorer

- **Choose a folder:** Uses the browser's File System Access directory picker where available. A directory-input fallback is used in browsers that do not expose that picker.
- **Nested file discovery:** Looks for `.md` and `.markdown` files in the selected folder hierarchy.
- **Sorted list:** Displays filename and folder-relative path, sorted by relative path without regard to case.
- **Explorer filter:** Filters by filename or path.
- **Empty and error states:** Shows an empty-folder message, limit errors, picker busy/denied messages, and a specific restricted-folder dialog with reasons and suggested alternatives.
- **Local privacy:** Selected document text and image content are processed in the browser and are not uploaded to the ASP.NET Core host.

## Fast document navigation

When the explorer has focus:

| Key | Action |
|---|---|
| Up / Down | Open previous / next document. |
| Page Up / Page Down | Move approximately one visible explorer page. |
| Home / End | Open the first / last document. |
| Enter | Open the current selection. |

Movement stops at list boundaries and does not wrap. Normal scrolling remains available when the reading pane is focused. The filter field keeps normal typing keys. Per-document reader scroll position is remembered while switching during the current page session.

## Markdown reading

- Continuous rendered document with headings, paragraphs, lists, tables, code fences, quotes, and common advanced Markdown extensions supplied by Markdig.
- Raw HTML is disabled; parsed output is sanitized before rendering.
- Responsive explorer/reader layout for desktop and smaller screens.
- Zoom controls in the toolbar and keyboard.
- Print stylesheet hides the explorer and application toolbar for a reader-focused printout.

## Source and Preview modes

- **Preview** displays sanitized rendered Markdown.
- **Source** edits the current document's Markdown in a browser text area.
- Source changes are held in page memory. Switching documents preserves edits for the current page session.
- Task checkbox interaction updates the Markdown source representation.
- **Important:** selecting a new folder or reloading discards unsaved source changes. There is no write-back permission flow.

## Search within current document

- Opens with the toolbar control or Ctrl+F / Cmd+F.
- Performs case-insensitive text matching in the current rendered document.
- Highlights matches and displays active match / total match count.
- Enter, F3, Shift+F3, and previous/next controls move between matches.
- Escape closes search and removes temporary highlights.

## Task lists and relative assets

- Rendered Markdown task-list checkboxes are interactive; changes are reflected in Source mode.
- Relative links to selected Markdown files navigate within the viewer, including heading fragments.
- Relative image references resolve only to supported images included in the user's selection.
- Missing selected assets and relative paths that escape the selected folder are not opened as arbitrary local files.
- Supported image extensions: PNG, JPEG, GIF, WebP, AVIF, BMP.
- External absolute links are not treated as local folder paths.

## Export and print

- Download the currently selected Markdown source as a `.md` or `.markdown` copy.
- The download reflects in-memory source edits, including task-list changes.
- Ctrl+S triggers the current Markdown copy download rather than attempting to write the original file.
- Print button or Ctrl+P opens browser printing with app navigation hidden.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+F / Cmd+F | Open in-document search. |
| Enter | Next search match while the search box is focused. |
| F3 / Shift+F3 | Next / previous search match. |
| Escape | Close the search box. |
| Ctrl+S / Cmd+S | Download a Markdown copy. |
| Ctrl++ / Ctrl+= / Cmd equivalent | Increase reading zoom. |
| Ctrl+- / Cmd equivalent | Decrease reading zoom. |
| Ctrl+0 / Cmd+0 | Reset reading zoom to 100%. |
| Ctrl+P / Cmd+P | Print the reader. |

Zoom is limited to 70%-180%, in 10% steps.

## Current selection limits

- 2,000 Markdown documents.
- 500 supported local images.
- 5 MiB maximum per Markdown or image file.
- 25 MiB maximum aggregate Markdown content.
- 25 MiB maximum aggregate supported image content.
- 2,500 Markdown/image files combined during supported-file directory traversal.

## Not implemented

- Mermaid diagrams.
- Math notation rendering.
- Tabs, bookmarks, and persistent reading positions.
- Presentation or slideshow mode.
- Saving source changes directly to the original local file.
- Searching arbitrary folders or the whole drive.

## Browser-specific limitations

Folder and local-file access depends on browser capabilities and user permission. Folder access is not retained after reload by this app. The directory-input fallback may differ from the native directory picker in its ability to select folders and preserve relative paths. Use a regular user-owned folder and a secure browser context when the browser blocks a protected location.
