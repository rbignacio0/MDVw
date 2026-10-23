(() => {
    const markdownExtensions = [".md", ".markdown"];
    const maximumFileBytes = 5 * 1024 * 1024;
    const maximumTotalBytes = 25 * 1024 * 1024;
    const maximumImageBytes = 25 * 1024 * 1024;
    const maximumImageCount = 500;
    const maximumFileCount = 2000;
    let dotnetReference;
    let pickerActive = false;
    let imageObjectUrls = [];
    let markdownObjectUrl;
    let searchMatches = [];
    let activeSearchIndex = -1;
    let knownDocuments = new Set();
    let knownImages = new Map();

    function isMarkdownFile(path) {
        const lowerPath = path.toLowerCase();
        return markdownExtensions.some((extension) => lowerPath.endsWith(extension));
    }

    function isImageFile(path) {
        return /\.(?:png|jpe?g|gif|webp|avif|bmp)$/i.test(path);
    }

    async function readFiles(files, folderName) {
        const markdownFiles = files.filter((file) => isMarkdownFile(file.path));
        const imageFiles = files.filter((file) => isImageFile(file.path));
        let totalBytes = 0;
        let imageBytes = 0;

        if (markdownFiles.length > maximumFileCount) {
            throw new Error(`This folder contains more than ${maximumFileCount} Markdown files. Choose a smaller folder.`);
        }
        if (imageFiles.length > maximumImageCount) {
            throw new Error(`This folder contains more than ${maximumImageCount} supported local images. Choose a smaller folder.`);
        }

        const results = [];
        for (const file of markdownFiles) {
            if (file.file.size > maximumFileBytes) {
                throw new Error(`“${file.path}” is larger than the 5 MB per-file limit.`);
            }

            totalBytes += file.file.size;
            if (totalBytes > maximumTotalBytes) {
                throw new Error("The selected Markdown files exceed the 25 MB total reading limit.");
            }

            results.push({
                name: file.path.split("/").pop(),
                path: file.path,
                content: await file.file.text()
            });
        }

        const nextImageUrls = [];
        const assets = [];
        try {
            for (const image of imageFiles) {
                if (image.file.size > maximumFileBytes) {
                    throw new Error(`“${image.path}” is larger than the 5 MB per-file limit.`);
                }
                imageBytes += image.file.size;
                if (imageBytes > maximumImageBytes) {
                    throw new Error("The selected local images exceed the 25 MB total image limit.");
                }

                const url = URL.createObjectURL(image.file);
                nextImageUrls.push(url);
                assets.push({ path: image.path, url });
            }

            await dotnetReference.invokeMethodAsync("ReceiveFiles", folderName, results, assets);
            for (const url of imageObjectUrls) {
                URL.revokeObjectURL(url);
            }
            imageObjectUrls = nextImageUrls;
        } catch (error) {
            for (const url of nextImageUrls) {
                URL.revokeObjectURL(url);
            }
            throw error;
        }
    }

    async function collectDirectory(directoryHandle, prefix = "", state = { files: 0, entries: 0 }) {
        const found = [];
        for await (const [name, entry] of directoryHandle.entries()) {
            state.entries += 1;
            if (state.entries > 10000) {
                throw new Error("This folder has more than 10,000 entries. Choose a smaller folder.");
            }

            const path = prefix ? `${prefix}/${name}` : name;
            if (entry.kind === "directory") {
                found.push(...await collectDirectory(entry, path, state));
            } else if (isMarkdownFile(path) || isImageFile(path)) {
                state.files += 1;
                if (state.files > maximumFileCount + 500) {
                    throw new Error("This folder contains too many Markdown files and images. Choose a smaller folder.");
                }
                found.push({ path, file: await entry.getFile() });
            }
        }
        return found;
    }

    async function chooseDirectory() {
        if (pickerActive) {
            return;
        }

        pickerActive = true;
        setPickerButtonsDisabled(true);
        try {
            if (typeof window.showDirectoryPicker === "function") {
                const directory = await window.showDirectoryPicker({ mode: "read" });
                await readFiles(await collectDirectory(directory), directory.name);
            } else {
                await chooseDirectoryWithInput();
            }
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            await reportPickerError(error, "The selected folder could not be read.");
        } finally {
            pickerActive = false;
            setPickerButtonsDisabled(false);
        }
    }

    function chooseDirectoryWithInput() {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.setAttribute("webkitdirectory", "");
        input.setAttribute("directory", "");
        input.hidden = true;
        document.body.append(input);

        return new Promise((resolve) => {
            const finish = () => {
                input.remove();
                resolve();
            };

            input.addEventListener("change", async () => {
                try {
                    const selectedFiles = Array.from(input.files ?? []);
                    if (selectedFiles.length === 0) {
                        return;
                    }

                    const firstPath = selectedFiles[0].webkitRelativePath || selectedFiles[0].name;
                    const rootName = firstPath.includes("/") ? firstPath.split("/")[0] : "Selected files";
                    await readFiles(selectedFiles.map((file) => ({
                        path: file.webkitRelativePath || file.name,
                        file
                    })), rootName);
                } catch (error) {
                    await reportPickerError(error, "The selected files could not be read.");
                } finally {
                    finish();
                }
            }, { once: true });

            input.addEventListener("cancel", finish, { once: true });
            input.click();
        });
    }

    async function reportPickerError(error, fallbackMessage) {
        const detail = error instanceof Error ? error.message : "";
        if (error?.name === "SecurityError") {
            await dotnetReference.invokeMethodAsync(
                "ReportFolderAccessError",
                "This location is restricted",
                "The browser or operating system blocked access to this folder. This commonly happens with system, application, or otherwise protected locations.",
                detail);
            return;
        }

        if (error?.name === "NotAllowedError") {
            await dotnetReference.invokeMethodAsync(
                "ReportFolderAccessError",
                "Folder access was denied",
                "The browser did not grant read permission. You may have denied the prompt, or your browser or operating-system privacy settings may block this location.",
                detail);
            return;
        }

        const message = error?.name === "InvalidStateError"
            ? "A file picker is already open. Finish or close it, then try again."
            : detail || fallbackMessage;
        await dotnetReference.invokeMethodAsync("ReportPickerError", message);
    }

    function setPickerButtonsDisabled(disabled) {
        document.body.classList.toggle("picker-busy", disabled);
        for (const button of document.querySelectorAll("#choose-folder, #welcome-choose-folder")) {
            button.disabled = disabled;
            button.setAttribute("aria-busy", String(disabled));
        }
    }

    function normalizeRelativePath(fromPath, target) {
        let decoded;
        try {
            decoded = decodeURIComponent(target.split(/[?#]/, 1)[0]);
        } catch {
            return null;
        }
        if (!decoded || decoded.startsWith("/") || /^[a-z][a-z\d+.-]*:/i.test(decoded)) {
            return null;
        }

        const parts = fromPath.split("/").slice(0, -1);
        for (const segment of decoded.split("/")) {
            if (!segment || segment === ".") {
                continue;
            }
            if (segment === "..") {
                if (parts.length === 0) {
                    return null;
                }
                parts.pop();
            } else {
                parts.push(segment);
            }
        }
        return parts.join("/");
    }

    function clearSearch() {
        for (const mark of document.querySelectorAll("#reader-scroll mark.search-match")) {
            mark.replaceWith(document.createTextNode(mark.textContent ?? ""));
        }
        document.getElementById("reader-scroll")?.normalize();
        searchMatches = [];
        activeSearchIndex = -1;
    }

    function search(query) {
        clearSearch();
        const needle = query.trim();
        const article = document.querySelector("#reader-scroll .markdown-document");
        if (!needle || !article) {
            return 0;
        }

        const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return node.parentElement?.closest("script, style, mark.search-match") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            }
        });
        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        const lowerNeedle = needle.toLocaleLowerCase();
        for (const textNode of textNodes) {
            const text = textNode.textContent ?? "";
            const lowerText = text.toLocaleLowerCase();
            let offset = 0;
            let index = lowerText.indexOf(lowerNeedle, offset);
            if (index < 0) {
                continue;
            }

            const fragment = document.createDocumentFragment();
            while (index >= 0) {
                fragment.append(document.createTextNode(text.slice(offset, index)));
                const mark = document.createElement("mark");
                mark.className = "search-match";
                mark.textContent = text.slice(index, index + needle.length);
                fragment.append(mark);
                offset = index + needle.length;
                searchMatches.push(mark);
                index = lowerText.indexOf(lowerNeedle, offset);
            }
            fragment.append(document.createTextNode(text.slice(offset)));
            textNode.replaceWith(fragment);
        }

        if (searchMatches.length > 0) {
            activeSearchIndex = 0;
            updateActiveSearchMatch();
        }
        return searchMatches.length;
    }

    function updateActiveSearchMatch() {
        searchMatches.forEach((match, index) => match.classList.toggle("active", index === activeSearchIndex));
        searchMatches[activeSearchIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function configureDocument(documentPath, imagePaths, documentPaths) {
        knownDocuments = new Set(documentPaths.map(path => path.toLocaleLowerCase()));
        knownImages = new Map(imagePaths.map(image => [image.path.toLocaleLowerCase(), image.url]));

        for (const image of document.querySelectorAll("#reader-scroll .markdown-document img")) {
            const source = image.getAttribute("src") ?? "";
            if (!source || /^[a-z][a-z\d+.-]*:/i.test(source) || source.startsWith("//") || source.startsWith("/")) {
                continue;
            }

            const path = normalizeRelativePath(documentPath, source);
            const url = path ? knownImages.get(path.toLocaleLowerCase()) : null;
            if (url) {
                image.src = url;
                image.removeAttribute("srcset");
            } else {
                const label = image.getAttribute("alt") || "Image";
                image.alt = `${label} (not found in the selected folder)`;
                image.classList.add("missing-local-image");
                image.removeAttribute("src");
            }
        }

        const reader = document.getElementById("reader-scroll");
        const taskItems = reader?.querySelectorAll(".markdown-document input[type='checkbox']") ?? [];
        taskItems.forEach((checkbox, index) => {
            checkbox.disabled = false;
            checkbox.dataset.taskIndex = String(index);
            checkbox.setAttribute("aria-label", `Task ${index + 1}`);
        });

        clearSearch();
    }

    function navigateSearch(direction) {
        if (searchMatches.length === 0) {
            return [0, 0];
        }
        activeSearchIndex = (activeSearchIndex + direction + searchMatches.length) % searchMatches.length;
        updateActiveSearchMatch();
        return [activeSearchIndex + 1, searchMatches.length];
    }

    function navigateToFragment(fragment) {
        if (!fragment) {
            return;
        }
        let id;
        try {
            id = decodeURIComponent(fragment.replace(/^#/, ""));
        } catch {
            id = fragment.replace(/^#/, "");
        }
        const target = document.getElementById(id);
        if (target && document.getElementById("reader-scroll")?.contains(target)) {
            target.scrollIntoView({ block: "start", behavior: "smooth" });
        }
    }

    function handleReaderClick(event) {
        const anchor = event.target.closest?.("#reader-scroll a");
        if (!anchor) {
            return;
        }

        const href = anchor.getAttribute("href") ?? "";
        if (!href || href.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(href)) {
            return;
        }

        const currentPath = document.querySelector(".breadcrumb strong")?.textContent?.trim();
        if (!currentPath) {
            return;
        }

        const [relativeTarget, fragment = ""] = href.split("#", 2);
        if (!relativeTarget) {
            event.preventDefault();
            navigateToFragment(fragment);
            return;
        }

        const path = normalizeRelativePath(currentPath, relativeTarget);
        if (!path) {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync(
                "ReportPickerError",
                "This relative link points outside the selected folder and was blocked.");
            return;
        }

        if (knownDocuments.has(path.toLocaleLowerCase())) {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync("NavigateToDocument", path, fragment);
            return;
        }

        const imageUrl = knownImages.get(path.toLocaleLowerCase());
        if (imageUrl) {
            event.preventDefault();
            window.open(imageUrl, "_blank", "noopener,noreferrer");
            return;
        }

        event.preventDefault();
        void dotnetReference.invokeMethodAsync(
            "ReportPickerError",
            "This relative link could not be found in the selected folder.");
    }

    function handleGlobalKeyDown(event) {
        const command = event.ctrlKey || event.metaKey;
        if (command && event.key.toLowerCase() === "f") {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync("OpenSearchAsync");
            return;
        }
        if (command && event.key.toLowerCase() === "s") {
            const download = document.getElementById("download-copy");
            if (download) {
                event.preventDefault();
                download.click();
            }
            return;
        }
        if (command && event.key.toLowerCase() === "p") {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync("PrintAsync");
            return;
        }
        if (command && (event.key === "+" || event.key === "=" || event.key === "Add")) {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync("ChangeZoomAsync", 10);
            return;
        }
        if (command && (event.key === "-" || event.key === "_" || event.key === "Subtract")) {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync("ChangeZoomAsync", -10);
            return;
        }
        if (command && event.key === "0") {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync("ChangeZoomAsync", 0);
            return;
        }
        if (event.key === "F3" && document.getElementById("document-search")) {
            event.preventDefault();
            void dotnetReference.invokeMethodAsync("NavigateSearchAsync", event.shiftKey ? -1 : 1);
        }
    }

    function updateMarkdownDownload(filename, content) {
        const download = document.getElementById("download-copy");
        if (!download) {
            return;
        }

        if (markdownObjectUrl) {
            URL.revokeObjectURL(markdownObjectUrl);
        }
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        markdownObjectUrl = URL.createObjectURL(blob);
        download.href = markdownObjectUrl;
        download.download = filename.toLowerCase().endsWith(".md") || filename.toLowerCase().endsWith(".markdown")
            ? filename
            : `${filename}.md`;
    }

    function visibleRows() {
        const list = document.getElementById("document-list");
        const firstRow = list?.querySelector("[data-document-row]");
        if (!list || !firstRow || firstRow.getBoundingClientRect().height === 0) {
            return 1;
        }
        return Math.max(1, Math.floor(list.clientHeight / firstRow.getBoundingClientRect().height));
    }

    window.markdownViewer = {
        attach(reference) {
            dotnetReference = reference;

            if (!document.documentElement.dataset.viewerShortcutsAttached) {
                document.documentElement.dataset.viewerShortcutsAttached = "true";
                document.addEventListener("keydown", handleGlobalKeyDown, true);
            }

            for (const chooseButton of document.querySelectorAll("#choose-folder, #welcome-choose-folder")) {
                if (!chooseButton.dataset.attached) {
                    chooseButton.dataset.attached = "true";
                    chooseButton.addEventListener("click", chooseDirectory);
                }
            }

            const list = document.getElementById("document-list");
            if (list && !list.dataset.attached) {
                list.dataset.attached = "true";
                list.addEventListener("keydown", (event) => {
                    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", "Enter"].includes(event.key)) {
                        return;
                    }

                    event.preventDefault();
                    void dotnetReference.invokeMethodAsync("HandleExplorerKey", event.key, visibleRows())
                        .catch((error) => dotnetReference.invokeMethodAsync(
                            "ReportPickerError",
                            error instanceof Error ? `Document navigation failed: ${error.message}` : "Document navigation failed."));
                });
            }

            const reader = document.getElementById("reader-scroll");
            if (reader && !reader.dataset.linksAttached) {
                reader.dataset.linksAttached = "true";
                reader.addEventListener("click", handleReaderClick);
                reader.addEventListener("input", (event) => {
                    if (!event.target.matches?.(".source-editor")) {
                        return;
                    }
                    const download = document.getElementById("download-copy");
                    if (download) {
                        updateMarkdownDownload(download.download, event.target.value);
                    }
                });
                reader.addEventListener("change", (event) => {
                    const checkbox = event.target.closest?.(".markdown-document input[type='checkbox']");
                    if (!checkbox || checkbox.dataset.taskIndex === undefined) {
                        return;
                    }
                    void dotnetReference.invokeMethodAsync(
                        "ToggleTaskListItem",
                        Number(checkbox.dataset.taskIndex),
                        checkbox.checked);
                });
            }
        },

        focusExplorer() {
            document.getElementById("document-list")?.focus();
        },

        focusSearch() {
            document.getElementById("document-search")?.focus();
        },

        getReaderScrollTop() {
            return document.getElementById("reader-scroll")?.scrollTop ?? 0;
        },

        setReaderScrollTop(value) {
            const reader = document.getElementById("reader-scroll");
            if (reader) {
                reader.scrollTop = value;
            }
        },

        scrollSelectedIntoView() {
            document.querySelector(".document-row.selected")?.scrollIntoView({ block: "nearest" });
        },

        focusSelectedDocument() {
            document.querySelector(".document-row.selected")?.focus({ preventScroll: true });
        },

        configureDocument,

        search,

        clearSearch,

        navigateSearch,

        scrollToFragment: navigateToFragment,

        setZoom(value) {
            document.documentElement.style.setProperty("--reader-font-scale", String(value / 100));
        },

        updateMarkdownDownload,

        print() {
            window.print();
        }
    };
})();
