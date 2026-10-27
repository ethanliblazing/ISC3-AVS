# 10 — Editor commands & Live Preview

The AV Studio extension contributes global commands to VS Code. They are usable by the
command palette (`Cmd/Ctrl+Shift+P`), right-click menus, F5 debug, and the status bar.

> **The agent does NOT execute editor commands.** Do not attempt to run them from the
> terminal (`code --command ...` is unreliable). Instead, give the user precise manual
> instructions — templates below.

## §1 — User-facing instruction templates

### Start Live Preview manually (canonical answer)

> **How to run Live Preview:**
>
> 1. **Hotkey:** Press `F5` — it launches the *Start AVS Live Preview* configuration from
>    `.vscode/launch.json`.
> 2. **Command Palette:** Press `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux),
>    type **Open Live Preview (Browser)** and press Enter.
> 3. **Run & Debug panel:** Open *Run and Debug* (`Cmd+Shift+D` / `Ctrl+Shift+D`), select
>    **Start AVS Live Preview** from the dropdown, then press the green **Play (▶)** button.

The preview opens Chrome with a dedicated profile and shows the Local/Network URLs in an
info message. Both F5 configurations terminate the preview when the debug session stops;
palette/Debug-panel runs keep the preview until the window closes.

### Change the Live Preview (dev) log level

> **How to change the console log verbosity of Live Preview** (a workspace-level
> setting for development/debugging — stored in VS Code, **not** in the project):
>
> 1. **Status bar:** click the **Log level** button (bottom status bar, visible while an
>    AV Studio project is open) and pick a level.
> 2. **Command Palette:** `Cmd+Shift+P` / `Ctrl+Shift+P` → **Set Live Preview log level**.
>
> Levels (ascending verbosity): `silent` (no action/connector output) < `error` < `warn` <
> `info` (also confirms sent actions) < `debug` (max, also device/broker write
> confirmations). Full semantics: `references/00-project-structure.md`.
>
> Note: `avstudio.config` `"loglevel"` is a **different** setting — the production/build
> verbosity of the exported project. It does not affect the Live Preview console.

### Build the project

> **How to create a production project build:**
>
> 1. **Status bar:** click the **Build project** button in the bottom status bar while an
>    AV Studio project is open.
> 2. **Command Palette:** press `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux),
>    type **Build project**, and press Enter.
>
> The command writes the selected `.zip` or `.ch5z` archive directly into
> `AVstudio UI/build/`, **replacing any previous build**. The archive name comes
> from `avstudio.config` → `archiveName` (for example,
> `AVstudio UI/build/my-avstudio-project.zip`). Each archive includes an
> `avstudio-meta.md` file in its root with build metadata (extension version,
> project name, platform, Node version, build date, and author).
> A `.ch5z` archive is the Crestron two-level package for touchscreen deployment. For a
> `.zip`, extract the archive and open its HTML directly with `file://`; a `.ch5z` must be
> unpacked through its inner `.ch5` archive first.

### Other UI editors

- **Variables:** Command Palette → **Open Variables** (vscode editor for
  `global.variables`).
- **Page parameters:** open the target `.page` file, then Command Palette → **Open page
  parameters**.
- **Icon library:** Command Palette → **Open Icon Library Explorer** to enable/disable
  icon packs (activating/deactivating packs is done there — packs live as files in
  `assets/icons/`, there is no config setting to sync).
- **Theme:** double-click a `theme/*.theme` file — the visual Theme Editor opens
  (sections, color pickers, per-section reset; saves straight to the file).

### Creating entities (user-side)

- Pages / datasources / datasource data / functions / variables / connectors —
  right-click a folder in the Explorer, or Command Palette → the matching
  **🅰🆅 Create new ...** command (titles in the table below).
- Themes: Command Palette → **Add theme** (or right-click the `theme/` folder) —
  see `references/09-functions-and-assets.md` for the `.theme` file format.
- New project: Command Palette → **Create new AVstudio project** (modal flow with
  prompts).
- Regenerate this skill: Command Palette → **Generate AVStudio skill**.

> **Where files land (unified rule):** for file-based entities (pages, themes,
> datasources, functions, connectors), right-clicking a folder **inside** the entity
> root (`pages/`, `theme/`, `datasources/`, `functions/`, `connectors/`) creates the
> new file in that exact folder — any nesting depth. Right-clicking the entity root
> itself, or invoking the command from the Command Palette / Quick Actions (no folder
> context), creates the file at the entity root.

### Generic instruction pattern

For ANY other command in the table below, tell the user:

> Press `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux), type
> **«Palette title»**, and press Enter.

Optionally add a right-click hint when the command needs a specific context (see the
"Context needed" column).

## Full command reference (source of truth: `extension/package.json` contributes.commands + `extension.ts`)

| Command (id) | Palette title | Purpose | Context needed |
| :--- | :--- | :--- | :--- |
| `avstudio-editor.createProject` | Create new AVstudio project | Scaffold a full project (AVstudio UI folder + start page + skill + root `README.md`) | Empty (or confirmed non-empty) workspace folder — modal flow with prompts |
| `avstudio-editor.generateAgentSkill` | Generate AVStudio skill | (Re)write `avstudio-guide` skill into `.agents/skills/` at the workspace root (overwrites) | Open workspace |
| `avstudio-editor.generateProjectReadme` | Generate project README | (Re)write the starter `README.md` at the workspace root from `avstudio.config` `name`; asks before replacing an existing README | Open workspace with an AVstudio project |
| `avstudio-editor.createContainer` | Add container | Add a container to the active page | Page must be open/saved |
| `avstudio-editor.createTheme` | Add theme | Create `theme/<name>/<name>.theme` seeded with the full default theme (including its page transition keys in the `page` section), plus its companion `globalStyles.css` (QuickPick; currently only `darkhuddle`); asks before overwriting, and sets it as the active theme in `avstudio.config` `"theme"` (full project-root path, so nested folders store e.g. `theme/sub/darkhuddle/darkhuddle.theme`) | AV Studio project open (or right-click the `theme/` folder or a nested folder inside it) |
| `avstudio-editor.createPage` | Add page | Create a new `.page` file in the explored folder inside `pages/` (or `pages/` root without context) | Explored folder or active page; accepts a uri |
| `avstudio-editor.createDatasource` | Add datasource | Create `datasources/<name>.datasource` in the explored folder inside `datasources/` (or `datasources/` root without context) | Explored folder; accepts a uri |
| `avstudio-editor.createDatasourceLocalDataFile` | Add local data JSON | Add `localJson` data file for a datasource | Datasource folder selected; accepts a uri |
| `avstudio-editor.createFunction` | Add function | Create `functions/<name>.js` from the function template in the explored folder inside `functions/` (or `functions/` root without context); the file ends with the commented `window.avstudio` API hint block (same examples as the snippet submenu below) | Explored folder; accepts a uri |
| `avstudio-editor.insertSnippet.navigate` | 🅰🆅 navigate - by URL path | Insert a `window?.avstudio?.navigate("…")` snippet at the cursor | Active JS editor (right-click → 🅰🆅 API snippets submenu); no sign-in required |
| `avstudio-editor.insertSnippet.navigateToPage` | 🅰🆅 navigateToPage - by page name | Insert a `window?.avstudio?.navigateToPage("…")` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.publishAnalog` | 🅰🆅 publishAnalog - analog signal | Insert a `window?.avstudio?.publishAnalog({ signalName, value })` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.publishDigital` | 🅰🆅 publishDigital - digital signal | Insert a `window?.avstudio?.publishDigital({ signalName, value })` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.publishSerial` | 🅰🆅 publishSerial - serial signal | Insert a `window?.avstudio?.publishSerial({ signalName, value })` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.getInstantDigitalFb` | 🅰🆅 getInstantDigitalFb - digital feedback | Insert a `const … = window?.avstudio?.getInstantDigitalFb({ signalName, defaultValue })` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.getInstantAnalogFb` | 🅰🆅 getInstantAnalogFb - analog feedback | Insert a `const … = window?.avstudio?.getInstantAnalogFb({ signalName, defaultValue })` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.getInstantSerialFb` | 🅰🆅 getInstantSerialFb - serial feedback | Insert a `const … = window?.avstudio?.getInstantSerialFb({ signalName, defaultValue })` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.getDatasource` | 🅰🆅 getDatasource - datasource data | Insert a `const … = window?.avstudio?.getDatasource({ path })` snippet at the cursor (empty `path` → all datasources) | Same |
| `avstudio-editor.insertSnippet.getVariableByName` | 🅰🆅 getVariableByName - read variable | Insert a `const … = window?.avstudio?.getVariableByName({ name })` snippet at the cursor | Same |
| `avstudio-editor.insertSnippet.setVariableByName` | 🅰🆅 setVariableByName - write variable | Insert a `window?.avstudio?.setVariableByName({ name, value })` snippet at the cursor | Same |

The `avstudio-editor.insertSnippet.*` commands above are the editor/context
**🅰🆅 AVstudio API Functions** submenu (visible when `editorLangId == javascript`). The
snippet bodies and the function-file hint block are generated from one source
(`extension/src/templates/snippets.ts`), so they cannot drift apart.
| `avstudio-editor.addVariable` | Add variable | Add a variable to `global.variables` | Accepts a uri; validates the name |
| `avstudio-editor.createConnector.websocket` | Create new WebSocket connector | Create `connectors/<name>.websocket` in the explored folder inside `connectors/` (or `connectors/` root without context) | Explored folder; accepts a uri |
| `avstudio-editor.createConnector` | Create new connector | QuickPick over the connector types above, then runs the matching `createConnector.<type>` command | Explored folder; accepts a uri |
| `avstudio-editor.createConnector.web` | Create new Web connector | Create `connectors/<name>.web` in the explored folder inside `connectors/` (or `connectors/` root without context) | Same |
| `avstudio-editor.createConnector.mqtt` | Create new MQTT connector | Create `connectors/<name>.mqtt` in the explored folder inside `connectors/` (or `connectors/` root without context) | Same |
| `avstudio-editor.createConnector.crestron` | Create new Crestron connector | Create `connectors/<name>.crestron` in the explored folder inside `connectors/` (or `connectors/` root without context) | Same |
| `avstudio-editor.createConnector.amx` | Create new AMX connector | Create `connectors/<name>.amx` in the explored folder inside `connectors/` (or `connectors/` root without context) | Same |
| `avstudio-editor.createConnector.knx` | Create new KNX connector | Create `connectors/<name>.knx` in the explored folder inside `connectors/` (or `connectors/` root without context) | Same |
| `avstudio-editor.createConnector.doorbird` | Create new DoorBird connector | Create `connectors/<name>.doorbird` in the explored folder inside `connectors/` (or `connectors/` root without context) | Same |
| `avstudio-editor.openPageParameters` | Open page parameters | Open the visual editor for the active page's `parameters` | Active `.page` tab |
| `avstudio-editor.openProjectTheme` | Open project theme | Open the project's active style theme (the `.theme` file referenced by `avstudio.config` → `"theme"`) in the visual theme editor | AV Studio project open |
| `avstudio-editor.setProjectTheme` | Set as project theme | Make the selected `.theme` file the active project theme in `avstudio.config` `"theme"` | `.theme` file selected in the explorer |
| `avstudio-editor.pickProjectTheme` | Pick project theme | Pick a `.theme` file from the project and make it the active project theme | AV Studio project open |
| `avstudio-editor.openVariables` | Open variables | Open the visual variables editor for `global.variables` | — |
| `avstudio-editor.openGlobalSlots` | Open Global Slots | Open the visual editor for `global.slots` (top/left/right/bottom shared regions) | — |
| `avstudio-editor.openIconExplorer` | Open Icon Library Explorer | Browse icon libraries; enable/disable packs (copies/deletes `assets/icons/<pack>.svg`) | — |
| `avstudio-editor.openProfile` | AVstudio Profile | Open the "AVstudio Profile" editor tab (sign in / license status); calling it again reveals the existing tab. Also reachable via the status bar profile item and the "Open Profile" quick action in the sidebar | — |
| `avstudio-editor.openLive` | Open Live Preview (Browser) | Start the live preview server + Chrome | Live editor must be installed/activated |
| `avstudio-editor.setStartPage` | Set as start page | Make the selected `.page` the project start page | `.page` file selected in the explorer |
| `avstudio-editor.pickStartPage` | Pick start page | Pick a `.page` file from the project and make it the project start page | AV Studio project open |
| `avstudio-editor.selectEditorSize` | Select editor window size | Pick preset/custom canvas size for the editor | AV Studio editor tab open |
| `avstudio-editor.rotateEditorDevice` | Rotate editor device | Rotate the emulated device orientation | AV Studio editor tab open |
| `avstudio-editor.selectLogLevel` | Set Live Preview log level | Pick the **dev** log level (`silent`/`error`/`warn`/`info`/`debug`, default `debug`) for the Live Preview console; workspace-level, stored in VS Code (never in `avstudio.config`) — also reachable via the status bar "Log level" button shown when an AV Studio project is open | AV Studio project open |
| `avstudio-editor.selectEnv` | Select active env file | Pick the active `env/*.env` file for the editor and Live Preview (one file → auto-selected, several → pick between files — no "none" state once any file exists); the status bar "env" button is ALWAYS visible while a project is open — with no env files it runs `avstudio-editor.createEnvFile` instead; the production build picks its own env file at build time | AV Studio project open |
| `avstudio-editor.createEnvFile` | Create env file | Ask for a name (default `development.env`, `.env` appended when omitted) and create a comment-template `env/<name>.env` file, silently creating the `env/` folder when it does not exist; opens the file in a text editor — also offered by the "Create env file" button in the dynamic picker's Env informer and in the explorer context menu of the project root (`AVstudio UI`) and the `env` folder | AV Studio project open |
| `avstudio-editor.quickActions` | *(status bar "Quick Actions")* | Show the quick actions menu (shortcuts to common editor operations) | Active AV Studio editor tab |
| `avstudio-editor.buildProject` | Build project | Build a self-contained production project and write the archive directly into `AVstudio UI/build/` (any previous build is cleared first), using the selected `.zip` or `.ch5z` format and the name from `avstudio.config` → `archiveName`, including inline active icon sprites, the AV Studio favicon, and an `avstudio-meta.md` build metadata file | AV Studio project open |
| `avstudio-editor.runHealthCheck` | Run Project Health Check | Re-scan the AV Studio project (structure, broken references, entity layout) and refresh its entries in the Problems panel (source `AVStudio`) | AV Studio project open |
| `avstudio-editor.generateProjectFile` | Generate project file | Generate one missing required file/folder from the standard project template; also offered as a Quick Fix on the matching Problems entry (accepts `{ fsPath, name }` args) | Usually invoked via Quick Fix |
| `avstudio-editor.generateMissingProjectFiles` | Generate missing project files | Generate **all** missing required files/folders at once from the standard project template (`getProjectStructureTemplate`); never overwrites existing files | AV Studio project open |
| `avstudio-editor.setupMcpServer` | Setup AVstudio MCP server | Show a modal with instructions to configure the MCP connection via AI agent | AV Studio extension activated |
| `avstudio-editor.mcpStatus` | AVstudio MCP | Status bar indicator target: click the MCP item (green = running, orange = problem, gray = not configured) to open the state-specific menu (Setup / Copy prompt / Restart / Show log / Open settings) | AV Studio project open (item hidden otherwise) |
| `avstudio-editor.restartMcpServer` | Restart AVstudio MCP server | Stop and restart the MCP server for the current project | AV Studio project open |
| `avstudio-editor.showMcpLog` | Show AVstudio MCP log | Reveal the *AVStudio MCP* output channel (start/stop/port/error lines) | — |
| `avstudio-editor.useVisualEditorAsDefault` | Use visual editor as default for .page files | Write `workbench.editorAssociations` and `workbench.diffEditorAssociations` so `.page` files (including git diffs) open in the AVStudio visual editor instead of the standard JSON text editor; also offered once via a notification when an editor association overrides it | AV Studio extension activated |

Notes:

- Command ids are the authoritative way to invoke; palette titles change freely.
- Creation commands (`createPage`, `createDatasource`, `createFunction`, `addVariable`,
  `createTheme`, `createConnector.*`) accept an explorer-selected uri. A uri pointing
  at a folder inside the entity root subtree (`pages/`, `theme/`, `datasources/`,
  `functions/`, `connectors/`) — at any nesting depth — creates the file in that
  folder; a file uri uses its parent folder. Without a uri (Command Palette, Quick
  Actions) the file is created at the entity root.
- For file-based entities the agent is usually better off writing the JSON/JS files
  directly with its own file tools (following references 00–09) — reserve the commands
  for UI-side actions and for the user's manual use.
- The extension continuously reports project diagnostics (source `AVStudio`) in the
  Problems panel: missing structure entries, broken references (connector paths,
  function uids, page flips, asset paths, datasource local files), invalid entity
  JSON, and entity files in the wrong folder. If the user reports problems in the
  editor, fix the underlying reference or file — never reference an entity the
  diagnostics flag as missing.
- The extension exposes an MCP server (`avstudio`) with tools: `get_project_snapshot`
  (slice data), `get_diagnostics` (same diagnostics as the Problems panel),
  `get_page_parameters` (parameters of a `.page`), `get_open_editors`,
  `list_icon_packs` / `activate_icon_packs` / `deactivate_icon_pack`,
  `open_icon_explorer`, and `run_command` (allowlisted `avstudio-editor.*` +
  `vscode.open`, including `avstudio-editor.buildProject`). Prefer file tools for editing and these MCP tools for
  project/editor context and UI actions. Note: `avstudio-editor.createFunction` via
  `run_command` opens an interactive name prompt in the editor (the agent cannot
  prefill the name) and requires sign-in — agents create function files directly with
  file tools; the `insertSnippet.*` commands insert into the user's active editor
  (a UI helper, not automation).

## Live Preview deep-dive

- `avstudio-editor.openLive`:
  1. Starts the local live server on a **free port** (`http://127.0.0.1:<port>`)
     serving the project; a Network URL is also reported when a LAN IP is available.
  2. Shows an info message + output channel *AVStudio Live Preview* with the URLs.
  3. Launches Chrome (chrome-launcher) with an isolated profile and device emulation
     presets (`selectEditorSize`/`rotateEditorDevice` affect it).
- **F5 / Run and Debug**: the extension registers a debug configuration provider
  (`avstudio-live` type). The auto-managed `.vscode/launch.json` contains:
  - `Start AVS Live Preview` → runs `openLive`
  The agent never starts these itself — instruct the user (§1).

## Guidance: create files vs. instruct

| Situation | Best action |
| :--- | :--- |
| User asks "open the preview / run live" | Paste the canonical **Start Live Preview manually** block from §1 (F5 / palette / Run & Debug) |
| User asks to open variables / page parameters / icon explorer | Tell the palette title from §1 "Other UI editors" |
| User asks to create a page/connector/datasource/function | Agent creates the file directly (schema in references 00–09); commands are a user-facing alternative |
| User asks "regenerate the skill" | Tell the palette title **Generate AVStudio skill** (or mention it's auto-created on new projects) |
| User asks to add/update the project README | Tell the palette title **Generate project README** (created automatically on new projects; replacing asks for confirmation) |
| Modal flows (createProject requires name prompts) | Do NOT simulate — instruct the user to run the palette command |
