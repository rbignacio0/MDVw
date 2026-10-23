# Markdown Viewer — Architecture

## 1. System overview

MDViewer is a .NET 10 Blazor Web App using **Interactive WebAssembly**. An ASP.NET Core host serves the application shell and compiled client assets. The interactive application, Markdown parsing, selected-folder traversal, document state, and rendering run in the user's browser.

```text
┌──────────────────────────── Browser ─────────────────────────────┐
│                                                                   │
│  Home.razor (Blazor WebAssembly)                                  │
│  ├─ explorer and in-memory document state                         │
│  ├─ Markdig parsing → HtmlSanitizer → rendered preview            │
│  └─ JS interop calls                                              │
│       └─ md-viewer.js                                              │
│          ├─ File System Access API / directory input              │
│          ├─ local File reads and image object URLs                │
│          ├─ keyboard events, search highlights, print/download    │
│          └─ relative link and image resolution                    │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │ App shell and static assets only
                                ▼
┌────────────────── ASP.NET Core host (MdViewer) ───────────────────┐
│ Razor components, static asset mapping, WebAssembly boot files    │
│ No document API, document database, or upload endpoint            │
└───────────────────────────────────────────────────────────────────┘
```

## 2. Projects and principal files

| Path | Responsibility |
|---|---|
| `MdViewer/MdViewer.csproj` | ASP.NET Core Web SDK host project; references the client project and WebAssembly server integration. |
| `MdViewer/Program.cs` | Configures Razor components, WebAssembly render mode, static assets, error handling, and antiforgery middleware. |
| `MdViewer/Components/App.razor` | HTML shell, stylesheets, Blazor boot script, and custom `md-viewer.js` loading. |
| `MdViewer.Client/MdViewer.Client.csproj` | .NET 10 Blazor WebAssembly client and Markdig/HtmlSanitizer dependencies. |
| `MdViewer.Client/Program.cs` | Starts the WebAssembly client. |
| `MdViewer.Client/Pages/Home.razor` | Main single-page UI, in-memory model, Markdown parsing, source editing, search coordination, keyboard callbacks, and document switching. |
| `MdViewer.Client/Pages/Counter.razor` and `MdViewer.Client/Pages/Weather.razor` | Unmodified Blazor template demonstration routes (`/counter`, `/weather`); not part of the Markdown viewer flow. |
| `MdViewer.Client/wwwroot/md-viewer.js` | Browser APIs unavailable directly in C#: selected-file access, local image URLs, DOM search, keyboard shortcuts, relative navigation, export, and print. |
| `MdViewer.Client/wwwroot/viewer.css` | Explorer/reader presentation, responsive layout, reading styles, overlays, and print stylesheet. |
| `README.md` | Run instructions, browser access constraints, keyboard usage, limits, and user-facing feature guide. |

## 3. Runtime architecture

### Host

The host configures `AddRazorComponents().AddInteractiveWebAssemblyComponents()`, maps static assets, and serves the client application using `AddInteractiveWebAssemblyRenderMode()`. It is a static application host, not a document-processing service.

### Client

`Home.razor` owns the active folder label, document list, current document, source edits, reader scroll offsets, image URL map, search state, and zoom level. State is held in component memory; page reload loses it.

Markdig with advanced extensions parses the source with raw HTML disabled. Parsed output is passed through HtmlSanitizer before it is cast to `MarkupString`. Task-list inputs are selectively permitted so the client can attach task interaction behavior.

### JavaScript interop

`md-viewer.js` bridges Blazor to browser APIs and DOM capabilities:

- Directory selection uses `window.showDirectoryPicker` when available, otherwise a directory-selection input.
- Files are read as browser `File` objects. The client sends their text and selected image object URLs to the Blazor component through `DotNetObjectReference.invokeMethodAsync`.
- Keyboard events in the explorer invoke `HandleExplorerKey`; global document shortcuts invoke the corresponding Blazor methods.
- Reader DOM operations handle match highlighting, local image `src` mapping, task-checkbox events, fragment scrolling, download URLs, and print.

Interop methods and the `DotNetObjectReference` are defined on the `Home` component. The reference is disposed with the component.

## 4. Data flow

### Folder load

```text
User gesture
  → browser picker requests read access
  → JavaScript traverses selected directory
  → enforce file/count/size limits
  → read Markdown text and create image object URLs
  → invoke Home.ReceiveFiles(folder, markdown, images)
  → sort document paths, select first document, render preview
```

The directory-input fallback supplies only files and relative paths selected by the user. It does not grant an ongoing directory handle. The browser permission is not persisted by this application.

### Preview render

```text
Original or edited Markdown source
  → Markdig pipeline (raw HTML disabled, advanced extensions)
  → HtmlSanitizer
  → MarkupString in the reader
  → JS configureDocument:
      map selected local image URLs
      enable supported task checkboxes
      prepare relative-link navigation
```

External links are left as links; relative links are intercepted and resolved against the current selected file. A target outside the selected folder or a missing target is blocked and reported.

### Source edit and export

Source edits are stored by relative document path in `_editedSources`. Leaving Source saves the current buffer to this map. Task-list changes also update the Markdown source. Export is a browser download (`Blob` URL), not a write to the original file.

### Search

JavaScript walks text nodes inside the current rendered article and wraps matches in `<mark>` elements. Changing the query clears previous wrappers and recalculates match position; navigating matches changes the active highlight and scrolls it into view.

## 5. State and lifecycle

- Folder, document text, edits, image object URLs, filter, zoom, and scroll offsets exist only in the current page session.
- Scroll offsets are keyed by the document's selected-folder-relative path.
- Selecting a different folder clears edits and scroll offsets and replaces the image URL set.
- Image object URLs are revoked when a new selection is loaded. Export URLs are replaced when source changes and are revoked before replacement.
- No server API receives file content; no account, database, background worker, or synchronization service is present.

## 6. Security and privacy boundaries

1. Browser folder access is user-gesture initiated and permission-mediated; the app has no unrestricted filesystem API.
2. Only selected Markdown and supported raster image files are read.
3. Raw Markdown HTML is disabled and generated HTML is sanitized before rendering.
4. Relative paths are normalized; paths that escape the selected root are rejected.
5. Local images are resolved against the selected asset map; arbitrary local file paths are not loaded.
6. Downloaded Markdown is an explicit user action. Original files are not modified.
7. Client-side limits reduce accidental excessive memory/processing use; browser resource constraints may still vary.

## 7. Deployment and compatibility

- Local development: run `dotnet run --project .\MdViewer\MdViewer.csproj` from the repository root and open the printed localhost URL.
- Production hosting requires a secure context (HTTPS) for browser directory-picker APIs.
- Directory picker support differs by browser. Directory input is a compatibility fallback and may have different folder-selection semantics.
- The client targets `net10.0`; the ASP.NET Core host and WebAssembly runtime are .NET 10.

## 8. Architectural limitations

- Source edits are not written back to the original file. Download is the save mechanism.
- The directory input fallback may not preserve the same permission or handle semantics as the File System Access API.
- Relative local images must be part of the user's selection and match a supported raster extension.
- State is not persisted across reloads or browser sessions.
- Advanced rendering for diagrams and math, tab management, bookmarks, and presentation mode are not implemented.
