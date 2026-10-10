# Contracts: selecting a computer save folder

## Goal

Contracts > Create new > workspace name + Select path > native computer folder picker > Create workspace. The selected folder contains real `.docx` files and the workspace index.

## Diagnosis

The reported screenshot is from Brave. Its message corresponds to `getContractsFolderPickerStatus()` returning `unsupported`: the page cannot see `window.showDirectoryPicker`. A local reproduction of the capability function returned `unsupported` without that API and `available` with it. This establishes the application branch; the user's exact Brave version and setting have not been inspected live.

Brave's tracker documents the same missing API and a File System Access API flag. The earlier changes removed browser storage but left the required picker disabled with generic advice. They did not resolve the browser capability prerequisite.

Sources: [Brave issue 29411](https://github.com/brave/brave-browser/issues/29411), [directory picker requirements](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker), [directory input behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory).

## Layers

1. **Native folder selection.** Invoke the picker directly from Select path, requesting read/write access. Create the workspace only after the folder selection succeeds and its index has been written. No browser file-storage fallback.
2. **Browser recovery.** Keep Select path available for retry. For a missing API, show Brave's `brave://flags/#file-system-access-api` setup steps and desktop Chrome/Edge as an alternative. Keep distinct help for insecure and embedded pages. Enabling Brave's flag is a browser-wide user setting; the website cannot enable it itself.
3. **Storage recovery.** Preserve the name and dialog when selection is canceled. Keep migration of older browser records. Reconnect a remembered folder when permission expires; expose folder errors without navigating as if creation succeeded.
4. **Optional architecture escalation.** If direct folder saving must work in browsers that do not expose this API, without changing browser configuration, add a desktop app or authenticated local companion as a separately scoped change. A directory-upload input only supplies files for reading; it cannot grant persistent write access to the chosen path.

## Verification and remaining proof

- Component regression checks cover unsupported API recovery, an enabled retry action, creation after selection, and cancellation without losing the name.
- TypeScript, focused ESLint, and diff whitespace checks are required before publishing.
- The final device check must run in Brave after folder access is enabled: choose a temporary computer folder, create a named workspace, add a document, inspect `Mosaic Contracts/contracts.json` and `Mosaic Contracts/documents/` in the file manager, reload, and reopen the workspace. Also deny folder permission once and confirm reconnect behavior.
- The connected browser tools do not expose the user's Brave session. Automated component checks do not establish that the native picker opened on that device.
