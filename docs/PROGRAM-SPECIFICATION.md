# Markdown Viewer — Program Specification

## 1. Purpose

MDViewer is a browser-based Markdown reader for quickly browsing and reading a user-selected local folder. Its primary interaction is a document explorer beside a readable document pane, with keyboard navigation between files. It also provides in-session Markdown editing, search, and export without uploading selected content to the web host.

## 2. Product goals

1. Make it quick to select a folder and move through its Markdown documents.
2. Keep local document contents and selected images in the browser.
3. Render common Markdown safely and legibly on desktop and mobile layouts.
4. Support source edits, task-list updates, and a downloadable edited copy without claiming write access to the original file.
5. Explain browser permission and selected-folder limitations clearly.

## 3. Users and assumptions

### Primary user

A person reading and lightly editing Markdown documents stored in a local folder.

### Assumptions

- The app is served from a secure browser context. `localhost` is considered secure for local development; deployed sites should use HTTPS.
- The user explicitly selects a folder or files through browser file-selection UI.
- The browser exposes either the File System Access directory picker or a directory-input fallback. Supported behavior varies by browser.
- Access is read-only. Editing changes are temporary until exported as a downloaded Markdown copy.
- The selected folder and its files remain under the user's control; the app does not index the drive independently.

## 4. Scope

### Included

- Select a local folder and discover Markdown files in nested folders.
- Display document names and relative paths in a filterable explorer.
- Open and navigate documents using mouse, keyboard, and same-folder Markdown links.
- Render and search Markdown, interact with task lists, and load selected local raster images.
- Edit Markdown in source mode, preview changes, and download an edited copy.
- Change reading zoom and print a reader-focused document.
- Present actionable errors for denied or restricted folder access.

### Excluded from the current version

- Saving edits directly back to local files.
- Accessing files outside the user's selection, drive-wide search, cloud sync, accounts, or server-side document storage.
- Advanced optional features: Mermaid, math rendering, tabs, bookmarks, presentation mode, and persistent reading history.

## 5. Functional requirements

| ID | Requirement |
|---|---|
| FR-01 | The user can invoke a browser-mediated folder picker. If that API is unavailable, the app uses a directory-selection input when supported. |
| FR-02 | The app discovers `.md` and `.markdown` files in the selected folder and its subfolders, then sorts by relative path without regard to case. |
| FR-03 | The explorer shows each file's name and relative folder and can filter entries by name or path. |
| FR-04 | With the explorer focused, Up/Down opens the adjacent document; Page Up/Down moves by approximately one visible page; Home/End selects the first/last entry; Enter opens the current selection. Navigation does not wrap at the ends. |
| FR-05 | The reader renders Markdown in a continuous document and preserves each document's reader scroll position while switching during the current page session. |
| FR-06 | Preview and Source modes display rendered Markdown and an editable source buffer, respectively. Changes remain in browser memory and can be exported as a Markdown download. |
| FR-07 | Search finds case-insensitive text in the current preview, highlights matches, reports the current match position, and supports next/previous navigation. |
| FR-08 | Supported Markdown task-list checkboxes can be toggled in Preview and the corresponding source list item is updated. |
| FR-09 | Relative links can open Markdown files included in the selection and navigate to heading fragments. Relative paths that resolve outside the selected folder are blocked. |
| FR-10 | Relative links to supported images included in the selection display local image content. Missing selected images are identified in the preview. |
| FR-11 | The toolbar and keyboard shortcuts provide reader zoom, a Markdown-copy download, and print. Print omits application navigation. |
| FR-12 | Unsupported, denied, restricted, empty, over-limit, or unreadable selections produce user-visible feedback appropriate to the failure. |

### Routes

- `/` — Markdown viewer (primary product page).
- `/counter` and `/weather` — generated Blazor template demonstration pages that remain in the current project; they are not part of the MDViewer product scope.

## 6. Non-functional requirements

- **Privacy:** Markdown text and image bytes are read and processed in the browser. The ASP.NET Core host serves the app but does not receive document contents.
- **Safety:** Raw HTML in Markdown is disabled and generated HTML is sanitized before insertion into the DOM. Local asset resolution is limited to files explicitly selected by the user.
- **Responsiveness:** The explorer/reader adapts to narrow screens. File and content limits bound the browser's work and memory use.
- **Accessibility:** Use semantic buttons, labels, keyboard-operable navigation, visible focus styles, and accessible labels for reader controls.
- **Error clarity:** Do not silently pretend a denied folder or missing relative asset was opened successfully.
- **Compatibility:** Browser folder-picker capabilities vary; the UI and documentation must not imply unrestricted or persistent access.

## 7. Selection limits

Current client-side bounds are:

- 2,000 Markdown documents maximum.
- 500 supported local images maximum.
- 5 MiB per Markdown file or supported image.
- 25 MiB aggregate Markdown content.
- 25 MiB aggregate supported image content.
- A combined traversal guard of 2,500 supported Markdown/image files.

These are implementation safeguards, not a guarantee that every browser can process a selection at the limit.

## 8. User flows

### Open and read

1. User chooses a folder.
2. Browser requests folder access or presents its directory-selection fallback.
3. The client scans supported files, applies limits, reads Markdown, and makes object URLs for supported images.
4. The explorer displays sorted files; the first document opens in Preview.
5. User switches documents with arrows, page keys, list selection, or an in-folder Markdown link.

### Edit and export

1. User opens a document in Source.
2. Source changes are kept in the client component's in-memory document state.
3. User returns to Preview to inspect the rendered result.
4. User downloads the current source as a Markdown file. The original local file is not overwritten.

### Find in a document

1. User invokes the search control or Ctrl+F / Cmd+F.
2. User types a query; matches are highlighted in Preview.
3. Enter or F3 advances, Shift+F3 goes backward, and Escape closes the search bar.

## 9. Acceptance criteria

- A supported selected folder loads a sorted list of nested Markdown documents without sending their contents to the host.
- Selecting a document renders its Markdown; switching away and back restores its in-session scroll position.
- Explorer keys change the selected document according to FR-04 and preserve ordinary text entry in the filename filter.
- Source edits render in Preview and appear in the downloaded Markdown copy.
- Search highlights and counts matches in the current rendered document.
- Toggling a rendered task checkbox updates the source task marker.
- Relative Markdown links resolve only within the selected document set; selected relative images render from browser object URLs.
- Protected/denied folder errors explain the reason and suggest a user-actionable alternative.
- Desktop and narrow-screen layouts remain operable; print output hides explorer and toolbar.
- The solution builds cleanly and the browser interaction checks cover the above flows.

## 10. Out-of-scope roadmap

Potential future work includes Mermaid/math support, tabs/bookmarks, persistent session state, richer presentation mode, and optional browser-supported write-back. These require separate product and permission decisions.
