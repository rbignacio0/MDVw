# Markdown Viewer

A browser-based Markdown library built with C# and Blazor WebAssembly. The app reads files locally in the browser; document contents are not sent to the ASP.NET Core host.

## Run locally

From the repository root:

```powershell
dotnet run --project .\MdViewer\MdViewer.csproj
```

Open the local URL printed by `dotnet run`.

## Publish with Docker and Nginx

Install the .NET 10 SDK and Docker Desktop, then run this PowerShell script from the repository root:

```powershell
.\publish.ps1 -Port 8050
```

The script publishes the app locally, builds its runtime image, and starts Nginx as a reverse proxy. Open `http://localhost:8050`. To redeploy, run the script again with the same port.

## Choose a folder

Select **Choose a folder** and grant read access in the browser's folder picker. The viewer searches the selected folder and its subfolders for `.md` and `.markdown` files.

Browsers that do not support the File System Access API use a directory-upload input when available; if a browser cannot select directories, choose the Markdown files directly. Folder selection requires a secure browser context (for local development, `localhost` is considered secure). The viewer does not browse the drive without the user's selection, and folder access is not persisted after reload.

If the browser or operating system blocks a selected location, the viewer explains the restriction. System, application, and other protected folders may be inaccessible; choose a regular folder you own, such as Documents or Downloads, or check browser and OS privacy permissions.

To keep reading in the browser responsive, a selection is limited to 2,000 Markdown files, 500 supported images, 5 MB per file, 25 MB total Markdown, 25 MB total images, and 2,500 combined Markdown/image files during folder traversal. The app reports when a limit is exceeded.

## Keyboard

Focus the document explorer to navigate:

- **Up / Down** opens the previous or next document.
- **Page Up / Page Down** moves by about one visible list page.
- **Home / End** opens the first or last document.
- Navigation stops at the first and last entries; it does not wrap.
- **Enter** opens the selected document.

The filter field keeps normal text-editing keys. Focus the reading pane to use normal browser scrolling. Scroll positions are remembered while switching documents for the current app session.

## Reading and editing

- Switch between **Preview** and **Source** to edit the current Markdown in the browser. Edits stay in memory for this browser session; selecting another folder or reloading discards them. **Download Markdown** (or **Ctrl+S**) saves an edited copy because browser folder access is read-only.
- Search the current preview with **Ctrl+F**, then use **Enter**, **F3**, or the arrow buttons to move between highlighted matches. **Esc** closes search.
- Click task-list checkboxes in Preview to update the Markdown source.
- Relative links to Markdown files in the selected folder open in the reader. Relative raster images are displayed from the selected folder. Missing assets and links outside the selected folder are identified instead of being opened as arbitrary local paths. Supported local images: PNG, JPEG, GIF, WebP, AVIF, and BMP.
- Change reading size with the toolbar or **Ctrl++**, **Ctrl+-**, and **Ctrl+0**.
- Use **Print** or **Ctrl+P** for a print-friendly page; navigation controls are omitted from print.

Mermaid, math, tabs/bookmarks, and presentation mode are not included in this version.

## Markdown rendering

Markdown is parsed with Markdig, with raw HTML disabled, then sanitized before rendering. Local image URLs are created in the browser from files the user explicitly selected; document and image contents are not uploaded.

## Project documentation

- [Program specification](./docs/PROGRAM-SPECIFICATION.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Features and limitations](./docs/FEATURES.md)
