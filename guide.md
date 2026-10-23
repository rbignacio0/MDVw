# MDVw User Guide

MDViewer is a browser-based reader for Markdown files on your computer. Choose a folder, then browse and read its Markdown documents in the browser.

## Start MDViewer

From the project folder, run:

```powershell
dotnet run --project .\MdViewer\MdViewer.csproj
```

Open the local address printed in the terminal.

## Choose a folder

1. Select **Choose a folder**.
2. Pick a folder and grant the browser read access.
3. MDViewer searches that folder and its subfolders for `.md` and `.markdown` files.
4. Select a document in the explorer to read it.

Use the explorer filter to find documents by filename or folder path. If a location is blocked, try a regular folder you own, such as Documents or Downloads.

## Navigate documents

Focus the document explorer to use these keys:

| Key | Action |
|---|---|
| Up / Down | Open the previous or next document |
| Page Up / Page Down | Move through the list by about one visible page |
| Home / End | Open the first or last document |
| Enter | Open the selected document |

Navigation stops at the beginning and end of the list; it does not wrap around. Focus the reading pane to scroll the document normally.

## Read, edit, and search

- Use **Preview** to read the formatted document.
- Use **Source** to edit the Markdown in the browser.
- Click task-list checkboxes in Preview to update the Markdown source.
- Press **Ctrl+F** (or **Cmd+F** on Mac) to search the current document. Press **Enter**, **F3**, or the match navigation buttons to move between results. Press **Esc** to close search.
- Use the zoom controls, or **Ctrl++**, **Ctrl+-**, and **Ctrl+0**, to adjust or reset the reading size.
- Select **Print** or press **Ctrl+P** for a print-friendly view.

## Download an edited copy

MDViewer does not write changes back to the original file. Edits remain in the browser session and are lost if you reload the page or choose another folder. To keep your work, select **Download Markdown** or press **Ctrl+S** to download a copy.

## Links and images

Relative links to Markdown files in the selected folder open in MDViewer. Supported relative images in that folder can appear in the preview. Missing files and links outside the selected folder are not opened as arbitrary local files.

Supported local image formats are PNG, JPEG, GIF, WebP, AVIF, and BMP.

## Privacy and selection limits

Folder access requires your permission. Document and supported image contents are processed in your browser and are not uploaded to the app's web host. Folder access does not persist after reloading the page.

To keep the viewer responsive, a selection is limited to:

- 2,000 Markdown documents
- 500 supported images
- 5 MiB per Markdown or image file
- 25 MiB total Markdown content
- 25 MiB total supported image content
- 2,500 Markdown and image files combined during folder traversal

## Not included

Mermaid diagrams, math rendering, tabs, bookmarks, and presentation mode are not included in this version.