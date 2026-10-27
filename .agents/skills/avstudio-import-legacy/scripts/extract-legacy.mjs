#!/usr/bin/env node
/**
 * AVstudio legacy build → extractor.
 *
 * Reads a legacy production build (`data.js` + `uploads/`) and stages a
 * current-version project:
 *
 *   - mechanical parts are CONVERTED directly (assets, functions with the
 *     `avgatorStudio` → `avstudio` bridge rename, global.variables,
 *     datasources, connectors, avstudio.config, theme CSS);
 *   - PAGES are NOT generated — every legacy page is written as a digest
 *     into `_legacy/pages/<Name>.legacy.json` (orientation-collapsed, with a
 *     `layoutHint` derived from `page.isStatic`) for the agent to migrate
 *     page-by-page following the skill references;
 *   - `migration-report.json` lists everything converted/flagged plus the
 *     per-page worklist.
 *
 * Usage:
 *   node extract-legacy.mjs --src <oldBuildDir> [--out <dir>]
 *        [--orientation portrait|landscape] [--name "Project name"] [--force]
 *
 * Self-contained: Node >= 18, no dependencies. See SKILL.md for the
 * page-by-page workflow and references/*.md for the mapping tables.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

const parseArgs = (argv) => {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--src') args.src = argv[++i];
        else if (a === '--out') args.out = argv[++i];
        else if (a === '--orientation') args.orientation = argv[++i];
        else if (a === '--name') args.name = argv[++i];
        else if (a === '--sprites-dir') args.spritesDir = argv[++i];
        else if (a === '--force') args.force = true;
        else if (a === '--help' || a === '-h') args.help = true;
        else args._.push(a);
    }
    return args;
};

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.src) {
    console.log(`Usage: node extract-legacy.mjs --src <oldBuildDir> [options]

Options:
  --src <dir>            Legacy build folder containing data.js (required)
  --out <dir>            Output project root (default: <src>-converted)
  --orientation <p|l>    portrait | landscape — which legacy orientation set
                         to keep (default: project defaultOrientation)
  --name <name>          Override project name
  --sprites-dir <dir>    Folder with <pack>.svg sprite files (default: auto-
                         discover the installed AVstudio extension's bundles)
  --force                Overwrite the output directory if it exists`);
    process.exit(args.help ? 0 : 1);
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Strapi relation wrappers → plain arrays. */
const unwrap = (v) => (Array.isArray(v) ? v : (isObj(v) && Array.isArray(v.data) ? v.data : []));

const sanitizeName = (name) =>
    String(name ?? 'Unnamed')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/^[.\s]+|[.\s]+$/g, '') || 'Unnamed';

const uniqueNamer = () => {
    const used = new Set();
    return (name) => {
        const base = sanitizeName(name);
        let candidate = base;
        let n = 2;
        while (used.has(candidate.toLowerCase())) candidate = `${base} ${n++}`;
        used.add(candidate.toLowerCase());
        return candidate;
    };
};

const nonEmpty = (v) => v !== undefined && v !== null && v !== '';

/** Only keep keys whose value is defined (undefined keys are dropped). */
const clean = (obj) => {
    const out = {};
    for (const [k, v] of Object.entries(obj ?? {})) if (v !== undefined) out[k] = v;
    return out;
};

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const report = {
    generatedAt: new Date().toISOString(),
    source: null,
    orientation: null,
    summary: { renamed: 0, substituted: 0, dropped: 0, todo: 0, error: 0, info: 0 },
    entries: [],
    /** The agent's page-by-page migration checklist. */
    pageWorklist: [],
};

const add = (level, context, message, details) => {
    report.summary[level] = (report.summary[level] ?? 0) + 1;
    report.entries.push(clean({ level, context, message, details }));
};

const once = new Set();
const addOnce = (level, context, message, details) => {
    const key = `${level}|${context}|${message}`;
    if (once.has(key)) return;
    once.add(key);
    add(level, context, message, details);
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const LOG_LEVELS = new Set(['silent', 'error', 'warn', 'info', 'debug']);

const CONNECTOR_EXT_BY_TYPE = {
    websocket: '.websocket',
    web: '.web',
    mqtt: '.mqtt',
    amx: '.amx',
    crestron: '.crestron',
};

const CRESTYPE_BY_VARTYPE = { boolean: 'boolean', number: 'number', string: 'string' };

const FONT_EXTS = new Set(['.ttf', '.otf', '.woff', '.woff2']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);

/* ------------------------------------------------------------------ */
/* Legacy load                                                         */
/* ------------------------------------------------------------------ */

const loadLegacy = (srcDir) => {
    const dataJsPath = path.join(srcDir, 'data.js');
    if (!fs.existsSync(dataJsPath)) {
        console.error(`ERROR: ${dataJsPath} not found — --src must point at the legacy build folder.`);
        process.exit(1);
    }
    const src = fs.readFileSync(dataJsPath, 'utf8');
    const marker = src.indexOf('window.staticdata');
    if (marker === -1) {
        console.error('ERROR: data.js does not contain window.staticdata.');
        process.exit(1);
    }
    const start = src.indexOf('{', marker);
    const end = src.lastIndexOf('}');
    let project;
    try {
        project = JSON.parse(src.slice(start, end + 1));
    } catch (e) {
        console.error(`ERROR: failed to parse window.staticdata: ${e.message}`);
        process.exit(1);
    }
    return { project, a: project.attributes ?? {} };
};

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

/** "audio_bg.bb67d76c2d26a34b9ff6.jpg" → "audio_bg.jpg"; keeps clean names intact. */
const cleanMediaName = (name) => {
    const m = String(name).match(/^(.*)\.[0-9a-f]{10,}\.([^.]+)$/i);
    return m ? `${m[1]}.${m[2]}` : String(name);
};

const buildMediaMap = (a, srcDir, files) => {
    const map = new Map(); // String(imgId) → { imgPath, kind, family? }
    const usedNames = uniqueNamer();
    for (const item of unwrap(a.media)) {
        const attrs = item.attributes ?? {};
        const id = String(item.id ?? '');
        if (!id) continue;
        const ext = String(attrs.ext ?? path.extname(attrs.url ?? '') ?? '').toLowerCase();
        const base = cleanMediaName(attrs.name ?? path.basename(attrs.url ?? 'media'));
        const isFont = FONT_EXTS.has(ext) || String(attrs.mime ?? '').startsWith('font');
        const kind = isFont ? 'font'
            : AUDIO_EXTS.has(ext) ? 'audio'
            : VIDEO_EXTS.has(ext) ? 'video'
            : 'image';
        const safeName = usedNames(base);
        const destRel = kind === 'font'
            ? `theme/darkhuddle/${safeName}`
            : `assets/${kind === 'image' ? 'images' : `${kind}s`}/${safeName}`;

        const candidates = [];
        if (attrs.url) {
            candidates.push(path.join(srcDir, String(attrs.url).replace(/^\//, '')));
            candidates.push(path.join(srcDir, 'uploads', path.basename(attrs.url)));
        }
        candidates.push(path.join(srcDir, 'uploads', base));
        const found = candidates.find((p) => fs.existsSync(p));

        if (found) files.set(destRel, { copyFrom: found });
        else if (nonEmpty(attrs.svgContent)) files.set(destRel, String(attrs.svgContent));
        else add('error', `media[${id}]`, `Media file not found in the build: ${attrs.name}`, { url: attrs.url });

        const entry = { imgPath: destRel, kind };
        if (isFont) entry.family = safeName.replace(/\.[^.]+$/, '');
        map.set(id, entry);
    }
    return map;
};

/* ------------------------------------------------------------------ */
/* Variables                                                           */
/* ------------------------------------------------------------------ */

const coerceByType = (type, v, ctx) => {
    if (type === 'number') {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        const n = Number(v);
        if (Number.isFinite(n) && String(v).trim() !== '') return n;
        if (nonEmpty(v)) add('info', ctx, `Value "${v}" is not numeric — coerced to 0`);
        return 0;
    }
    if (type === 'boolean') {
        if (typeof v === 'boolean') return v;
        if (v === 'true' || v === 1 || v === '1') return true;
        if (v === 'false' || v === 0 || v === '0' || !nonEmpty(v)) return false;
        add('info', ctx, `Value "${v}" coerced to true for boolean`);
        return true;
    }
    return nonEmpty(v) ? String(v) : '';
};

const makeVariableConverter = ({ crestronConnectorPath, mqttConnectorPath, functionMap }) =>
    (v, ctx) => {
        const type = ['string', 'number', 'boolean'].includes(v.type) ? v.type : 'string';
        const out = {
            type,
            defaultValue: coerceByType(type, v.defaultValue, ctx),
            currentValue: coerceByType(type, v.currentValue ?? v.defaultValue, ctx),
        };
        if (nonEmpty(v.joinValueSetter_signal_fb)) {
            out.externalBinding = {
                connectorName: crestronConnectorPath,
                kind: 'crestron',
                signalName: String(v.joinValueSetter_signal_fb),
                signalType: CRESTYPE_BY_VARTYPE[type],
            };
        } else if (isObj(v.mqttValueSetter) && nonEmpty(v.mqttValueSetter.topic)) {
            out.externalBinding = {
                connectorName: mqttConnectorPath,
                kind: 'mqtt',
                topic: String(v.mqttValueSetter.topic),
            };
        } else if (isObj(v.amxValueSetter)) {
            add('todo', ctx, 'Legacy amxValueSetter has no externalBinding equivalent (no AMX binding kind) — dropped');
        }
        if (nonEmpty(v.datasetID) || nonEmpty(v.dynamicValue)) {
            add('info', ctx, 'Legacy datasource binding / dynamicValue preview dropped — variables are static now; bind consumers via tokens');
        }
        const actions = Array.isArray(v.actions) ? v.actions.length : 0;
        if (actions) {
            add('info', ctx, `${actions} legacy variable action(s) stripped — re-add on the converted variable per references/03-actions.md`);
        }
        if (nonEmpty(v.formatValueFunctionUid)) {
            const fn = functionMap.get(String(v.formatValueFunctionUid));
            if (fn) out.formatValueFunctionUid = fn;
            else if (String(v.formatValueFunctionUid).startsWith('formatter-')) out.formatValueFunctionUid = v.formatValueFunctionUid;
            else add('info', ctx, `formatValueFunctionUid "${v.formatValueFunctionUid}" not resolvable — dropped`);
        }
        return clean(out);
    };

/* ------------------------------------------------------------------ */
/* Extension resources (sprites / theme snapshot)                      */
/* ------------------------------------------------------------------ */

const findExtensionDir = () => {
    const candidates = [];
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    // Dev checkout: <repo>/extension/src/templates/<skill>/scripts → <repo>/extension
    candidates.push(path.resolve(scriptDir, '..', '..', '..', '..'));
    const home = os.homedir();
    for (const root of ['.vscode', '.vscode-insiders', '.cursor', '.windsurf']) {
        candidates.push(path.join(home, root, 'extensions'));
    }
    for (const root of candidates) {
        if (!fs.existsSync(root)) continue;
        if (path.basename(root) === 'extension' && fs.existsSync(path.join(root, 'resources'))) return root;
        let entries = [];
        try {
            entries = fs.readdirSync(root, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const e of entries) {
            if (!e.isDirectory() || !e.name.toLowerCase().includes('avstudio')) continue;
            const extDir = path.join(root, e.name);
            if (fs.existsSync(path.join(extDir, 'resources'))) return extDir;
        }
    }
    return null;
};

/** Icon packs referenced by the agent during page migration (informational). */
const neededIconPacks = new Map();

const activateIconPacks = (files, icons) => {
    if (!icons.size) return;
    let spritesDir = null;
    if (args.spritesDir) {
        spritesDir = path.resolve(args.spritesDir);
        if (!fs.existsSync(spritesDir)) {
            add('todo', 'icons', `--sprites-dir "${args.spritesDir}" does not exist`);
            spritesDir = null;
        }
    } else {
        const extDir = findExtensionDir();
        spritesDir = extDir ? path.join(extDir, 'resources', 'sprites') : null;
    }
    for (const [pack, names] of icons) {
        const dst = `assets/icons/${pack}.svg`;
        if (files.has(dst)) continue;
        const src = spritesDir ? path.join(spritesDir, `${pack}.svg`) : null;
        if (src && fs.existsSync(src)) {
            files.set(dst, { copyFrom: src });
            add('info', 'icons', `Sprite pack "${pack}" activated → assets/icons/${pack}.svg (${[...names].slice(0, 5).join(', ')}${names.size > 5 ? ', …' : ''})`);
        } else {
            add('todo', 'icons', `Sprite pack "${pack}" could not be activated automatically — copy ${pack}.svg from the AVstudio extension's resources/sprites/ into assets/icons/ (or pass --sprites-dir)`);
        }
    }
};

/** Copy the built-in theme snapshot resource from the extension install. */
const copyThemeSnapshot = (files) => {
    const themePath = 'theme/darkhuddle/darkhuddle.theme';
    if (files.has(themePath)) return;
    const extDir = findExtensionDir();
    const src = extDir ? path.join(extDir, 'resources', 'themes', 'darkhuddle.theme') : null;
    if (src && fs.existsSync(src)) {
        files.set(themePath, { copyFrom: src });
        add('info', 'theme', 'Built-in theme snapshot copied from the extension → theme/darkhuddle/darkhuddle.theme');
    } else {
        add('info', 'theme', `Theme snapshot not found in the extension resources — open the project in VS Code and accept the health-check offer to restore ${themePath}`);
    }
};

/* ------------------------------------------------------------------ */
/* Page digest (orientation-collapsed legacy payload)                  */
/* ------------------------------------------------------------------ */

/**
 * Collapse the legacy portrait/landscape duality: keep the chosen
 * orientation's values; flag containers/pages whose other half differs.
 */
const collapseContainer = (c, orientation) => {
    const primary = orientation === 'landscape' ? c.landscape : c.portrait;
    const fallback = orientation === 'landscape' ? c.portrait : c.landscape;
    const anomalies = [];
    if (c.isStatic === true && !isObj(primary)) anomalies.push('static container without layout options');
    return {
        name: c.name,
        cssClass: c.cssClass,
        isStatic: c.isStatic === true,
        elements: Array.isArray(c.elements) ? c.elements : [],
        options: isObj(primary) ? primary : (isObj(fallback) ? fallback : {}),
        orientationDiffs: isObj(primary) && isObj(fallback)
            ? [...new Set([...Object.keys(primary), ...Object.keys(fallback)])]
                .filter((k) => JSON.stringify(primary[k]) !== JSON.stringify(fallback[k]))
            : [],
        anomalies,
    };
};

const buildPageDigest = (page, orientation) => {
    const p = page.attributes ?? {};
    const isStaticPage = p.isStatic === true;
    const anomalies = [];
    const containers = (p.containers ?? []).map((c) => {
        const collapsed = collapseContainer(c, orientation);
        if (collapsed.isStatic && !isStaticPage) {
            anomalies.push(`container "${c.name}" is static on a non-static page — decide its placement manually`);
        }
        if (collapsed.orientationDiffs.length) {
            anomalies.push(`container "${c.name}" differs across orientations: ${collapsed.orientationDiffs.join(', ')}`);
        }
        return collapsed;
    });
    const flow = orientation === 'landscape' ? p.landscapeFlow : p.portraitFlow;
    if (p.useOrientationFlow === true && p.landscapeFlow !== p.portraitFlow) {
        anomalies.push(`page flows differ: portrait=${p.portraitFlow} landscape=${p.landscapeFlow}`);
    }

    return clean({
        legacyName: p.name,
        uid: p.uid,
        isSubpage: p.isSubpage === true,
        layoutHint: isStaticPage ? 'fixed' : 'responsive',
        isStaticPage,
        orientation: isStaticPage ? undefined : orientation,
        flow,
        cssClass: p.cssClass,
        background: p.background,
        width: p.width,
        height: p.height,
        parameters: Array.isArray(p.parameters) ? p.parameters : [],
        actions: Array.isArray(p.actions) ? p.actions : [],
        pageFlips: p.pageFlips,
        dynamicDataUsed: p.dynamicDataUsed,
        containers,
        anomalies: anomalies.length ? anomalies : undefined,
    });
};

/* ------------------------------------------------------------------ */
/* Validator (mechanical files only — pages are the agent's job)       */
/* ------------------------------------------------------------------ */

const validate = (files) => {
    const idx = { connectorPaths: new Set(), functionPaths: new Set(), dsPaths: new Set(), assetPaths: new Set() };
    const varNames = new Set();

    for (const [rel, content] of files) {
        if (rel === 'global.variables' && isObj(content)) {
            for (const [name, v] of Object.entries(content)) {
                varNames.add(name);
                if (!/^[a-zA-Z0-9_]+$/.test(name)) add('error', 'global.variables', `Invalid variable name "${name}"`);
                if (isObj(v)) {
                    if (v.type === 'number' && typeof v.defaultValue !== 'number') add('error', `global.variables → ${name}`, 'number variable defaultValue is not a number');
                    if (v.type === 'boolean' && typeof v.defaultValue !== 'boolean') add('error', `global.variables → ${name}`, 'boolean variable defaultValue is not a boolean');
                }
            }
        }
        if (rel.endsWith('.datasource')) idx.dsPaths.add(rel);
        else if (rel.startsWith('connectors/')) idx.connectorPaths.add(rel);
        else if (rel.startsWith('functions/') && rel.endsWith('.js')) idx.functionPaths.add(rel);
        else if (rel.startsWith('assets/') || rel.startsWith('theme/')) idx.assetPaths.add(rel);
    }

    const cfg = files.get('avstudio.config');
    if (cfg) {
        if (!LOG_LEVELS.has(cfg.loglevel)) add('error', 'avstudio.config', `Invalid loglevel "${cfg.loglevel}"`);
        const archiveType = String(cfg.archiveType ?? '')
            .replace(/^\./, '')
            .toLowerCase();
        if (!['zip', 'ch5z'].includes(archiveType)) add('error', 'avstudio.config', `Invalid archiveType "${cfg.archiveType}"`);
        if (cfg.startPage) add('info', 'avstudio.config', `startPage points at "${cfg.startPage}" — create that page during the page migration`);
        if (!files.has(cfg.theme ?? '')) {
            add('info', 'avstudio.config', `Theme file "${cfg.theme}" is not staged by the extractor — see the report's theme entry`);
        }
        for (const [, v] of Object.entries(files.get('global.variables') ?? {})) {
            if (isObj(v) && nonEmpty(v.externalBinding?.connectorName) && !idx.connectorPaths.has(v.externalBinding.connectorName)) {
                add('error', 'global.variables', `externalBinding.connectorName "${v.externalBinding.connectorName}" does not exist`);
            }
        }
    }

    for (const [rel, ds] of files) {
        if (!rel.endsWith('.datasource') || !isObj(ds)) continue;
        if (nonEmpty(ds.wsConnectorUid) && !idx.connectorPaths.has(ds.wsConnectorUid)) add('error', rel, 'wsConnectorUid does not exist');
        if (nonEmpty(ds.webConnectorUid) && !idx.connectorPaths.has(ds.webConnectorUid)) add('error', rel, 'webConnectorUid does not exist');
        if (nonEmpty(ds.mqttConnectorUid) && !idx.connectorPaths.has(ds.mqttConnectorUid)) add('error', rel, 'mqttConnectorUid does not exist');
        if (nonEmpty(ds.formatterFunction)) {
            const expected = path.join('datasources', String(ds.formatterFunction).replace(/^\.\//, ''));
            if (!files.has(expected)) add('error', rel, `formatterFunction "${ds.formatterFunction}" file not found`);
        }
        if (nonEmpty(ds.localJson)) {
            const expected = path.join('datasources', String(ds.localJson).replace(/^\.\//, ''));
            if (!files.has(expected)) add('error', rel, `localJson "${ds.localJson}" file not found`);
        }
    }
};

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const run = () => {
    const srcDir = path.resolve(args.src);
    const { project, a } = loadLegacy(srcDir);
    report.source = srcDir;

    const orientation = args.orientation === 'landscape' || args.orientation === 'portrait'
        ? args.orientation
        : (a.defaultOrientation === 'landscape' ? 'landscape' : 'portrait');
    report.orientation = orientation;

    const outDir = path.resolve(args.out ?? `${srcDir}-converted`);
    if (fs.existsSync(outDir) && Object.keys(fs.readdirSync(outDir)).length > 0 && !args.force) {
        console.error(`ERROR: output directory is not empty: ${outDir} (use --force to overwrite)`);
        process.exit(1);
    }

    /** relPath → string | {copyFrom} | object(JSON) */
    const files = new Map();
    const dirs = new Set([
        'pages', 'connectors', 'datasources', 'functions',
        'assets', 'assets/images', 'assets/audio', 'assets/video', 'assets/icons',
        'theme', 'theme/darkhuddle',
        '_legacy', '_legacy/pages',
    ]);

    // ---- media
    const mediaMap = buildMediaMap(a, srcDir, files);

    // ---- names
    const varNamer = uniqueNamer();
    const fnNamer = uniqueNamer();
    const dsNamer = uniqueNamer();
    const pageNamer = uniqueNamer();

    // ---- planned page paths (used by action/page references)
    const legacyPages = unwrap(a.pages);
    const pagePlannedPath = new Map(); // uid/name → 'pages/<Name>.page'
    for (const p of legacyPages) {
        const name = sanitizeName(p.attributes?.name ?? `Page ${p.id}`);
        const file = pageNamer(name);
        const rel = `pages/${file}.page`;
        pagePlannedPath.set(String(p.attributes?.uid ?? p.id), rel);
        if (!pagePlannedPath.has(name)) pagePlannedPath.set(name, rel);
    }

    // ---- connectors
    const connectorMap = new Map();
    const writeConnector = (conn, fallbackName) => {
        if (!isObj(conn) || !nonEmpty(conn.type)) return null;
        const type = conn.type;
        const ext = CONNECTOR_EXT_BY_TYPE[type];
        if (!ext) {
            add('info', 'connectors', `Legacy connector type "${type}" is not supported — skipped`, { name: conn.name });
            return null;
        }
        const rel = `connectors/${sanitizeName(conn.name ?? fallbackName)}${ext}`;
        const out = clean({
            type,
            name: nonEmpty(conn.name) ? conn.name : undefined,
            host: nonEmpty(conn.host) ? conn.host : '',
            port: nonEmpty(conn.port) ? conn.port : undefined,
            isSecure: typeof conn.isSecure === 'boolean' ? conn.isSecure : undefined,
            reconnectTimeout: nonEmpty(conn.reconnectTimeout) ? conn.reconnectTimeout : undefined,
            keepaliveTimeout: nonEmpty(conn.keepaliveTimeout) ? conn.keepaliveTimeout : undefined,
            path: type === 'websocket' || type === 'mqtt' ? (nonEmpty(conn.path) ? conn.path : undefined) : undefined,
            username: type === 'mqtt' || type === 'amx' ? conn.username : undefined,
            password: type === 'mqtt' || type === 'amx' ? conn.password : undefined,
            key: type === 'amx' ? conn.key : undefined,
            room: type === 'amx' ? conn.room : undefined,
            headers: type === 'web' && Array.isArray(conn.headers) && conn.headers.length ? conn.headers : undefined,
        });
        if (type === 'crestron') {
            out.globalJoins = clean({
                analogPageFlip_signal_a_fb: a.globalJoins?.analogPageFlip_signal_a_fb,
                serialPageFlip_signal_s_fb: a.globalJoins?.serialPageFlip_signal_s_fb,
                notification_signal_s_fb: a.globalJoins?.notification_signal_s_fb,
                refreshDataSources_signal_d_fb: a.globalJoins?.refreshDataSources_signal_d_fb,
                refreshSingleDataSource_signal_s_fb: a.globalJoins?.refreshSingleDataSource_signal_s_fb,
                connected_signal_d_fb: a.globalJoins?.connected_signal_d_fb,
            });
        }
        if (nonEmpty(conn.host2) || nonEmpty(conn.hostSwitchTimeout)) {
            addOnce('info', 'connectors', 'Legacy connector host2/hostSwitchTimeout dropped (no host failover in the new model)');
        }
        files.set(rel, out);
        if (nonEmpty(conn.uid)) connectorMap.set(String(conn.uid), rel);
        return rel;
    };
    for (const conn of a.webConnectors ?? []) writeConnector(conn, 'Web');
    for (const conn of a.websocketConnectors ?? []) writeConnector(conn, 'Websocket');
    for (const conn of a.mqttConnectors ?? []) writeConnector(conn, 'Mqtt');
    for (const conn of a.amxConnectors ?? []) writeConnector(conn, 'Amx');

    if (isObj(a.webXpanel) && Object.keys(a.webXpanel).length) {
        const rel = `connectors/${sanitizeName('WebXpanel')}.crestron`;
        files.set(rel, clean({
            type: 'crestron',
            name: 'WebXpanel',
            host: nonEmpty(a.webXpanel.host) ? a.webXpanel.host : '',
            ipId: a.webXpanel.ipId,
            roomId: a.webXpanel.roomId,
            authToken: a.webXpanel.authToken,
            globalJoins: clean({ ...a.globalJoins }),
        }));
        add('renamed', 'connectors', 'Legacy webXpanel options → connectors/WebXpanel.crestron');
    } else if (Object.values(a.globalJoins ?? {}).some(nonEmpty)) {
        files.set('connectors/Crestron.crestron', {
            type: 'crestron', name: 'Crestron', host: '', globalJoins: clean({ ...a.globalJoins }),
        });
        add('info', 'connectors', 'Project globalJoins → connectors/Crestron.crestron (host is empty — fill it in)');
    }

    const crestronConnectorPath = [...connectorMap.values()].find((p) => p.endsWith('.crestron')) ?? '';
    const mqttConnectorPath = [...connectorMap.values()].find((p) => p.endsWith('.mqtt')) ?? '';

    // ---- modificators → functions (with the bridge rename)
    const functionMap = new Map();
    // Legacy bridge methods with no window.avstudio equivalent.
    const LEGACY_BRIDGE_ONLY = new Set(['setStoreValue', 'getStoreValue', 'audioControl']);
    for (const m of unwrap(a.modificators)) {
        const attrs = m.attributes ?? {};
        const name = fnNamer(attrs.name ?? `function-${m.id}`);
        const rel = `functions/${name}.js`;
        let source = String(attrs.function ?? '');

        // The legacy runtime exposed its JS bridge as window.avgatorStudio;
        // the new runtime installs window.avstudio (same method names for
        // variables/signals/datasources/navigation — no alias is installed).
        const apiCalls = (source.match(/avgatorStudio\b/g) ?? []).length;
        const legacyOnlyMethods = new Set();
        for (const call of source.matchAll(/(?:window\?\.)?\b(?:avgatorStudio|avstudio)\b\??\.([A-Za-z_$][\w$]*)/g)) {
            if (LEGACY_BRIDGE_ONLY.has(call[1])) legacyOnlyMethods.add(call[1]);
        }
        if (apiCalls) source = source.replace(/\bavgatorStudio\b/g, 'avstudio');
        files.set(rel, source);

        if (apiCalls) {
            add('renamed', `function "${name}"`, `Legacy bridge window.avgatorStudio → window.avstudio (${apiCalls} reference${apiCalls > 1 ? 's' : ''} rewritten)`);
        }
        if (legacyOnlyMethods.size) {
            add('todo', `function "${name}"`, `Uses legacy-only bridge methods with no window.avstudio equivalent: ${[...legacyOnlyMethods].join(', ')} — rework (the legacy "states" store and audioControl are gone)`);
        }

        if (nonEmpty(attrs.uid)) functionMap.set(String(attrs.uid), rel);
    }

    // ---- datasources
    const dsByUid = new Map();
    for (const d of unwrap(a.datasources)) {
        const attrs = d.attributes ?? {};
        const name = dsNamer(attrs.name ?? `datasource-${d.id}`);
        dsByUid.set(String(attrs.uid ?? d.id), { path: `datasources/${name}.datasource`, name, attrs });
    }
    for (const [, ds] of dsByUid) {
        const prod = isObj(ds.attrs.production) ? ds.attrs.production : {};
        const base = ds.name;
        const ctx = `datasources/${base}`;
        const storage = prod.storageType ?? 'local';
        const out = {
            localJson: '',
            urlPostfix: '',
            formatterFunction: '',
            isImagePreloadSource: prod.isImagePreloadSource === true,
            wsConnectorUid: null,
            wsMessagePath: null,
            webConnectorUid: null,
            mqttConnectorUid: null,
            mqttTopic: null,
            pollingInterval: null,
        };

        if (nonEmpty(prod.sourceObject)) {
            try {
                files.set(`datasources/${base}.json`, JSON.parse(prod.sourceObject));
            } catch {
                add('error', ctx, 'Legacy sourceObject is not valid JSON — written raw');
                files.set(`datasources/${base}.json`, prod.sourceObject);
            }
            out.localJson = `./${base}.json`;
        }

        if (storage === 'remote' || storage === 'mixed') {
            if (nonEmpty(prod.wsConnectorUid) && connectorMap.has(String(prod.wsConnectorUid))) {
                out.remoteFetchType = 'websocket';
                out.wsConnectorUid = connectorMap.get(String(prod.wsConnectorUid));
            } else if (nonEmpty(prod.mqttConnectorUid) && connectorMap.has(String(prod.mqttConnectorUid))) {
                out.remoteFetchType = 'mqtt';
                out.mqttConnectorUid = connectorMap.get(String(prod.mqttConnectorUid));
                out.mqttTopic = nonEmpty(prod.mqttTopic) ? prod.mqttTopic : null;
            } else {
                out.remoteFetchType = 'web';
                const webUid = nonEmpty(prod.webConnectorUid) ? String(prod.webConnectorUid) : '';
                let webPath = webUid && connectorMap.has(webUid) ? connectorMap.get(webUid) : null;
                if (!webPath) {
                    webPath = [...connectorMap.values()].find((p) => p.endsWith('.web')) ?? null;
                    if (!webPath) {
                        webPath = 'connectors/Datasource Base Connector.web';
                        files.set(webPath, {
                            type: 'web',
                            name: 'Datasource Base Connector',
                            host: isObj(a.datasetOptions) && nonEmpty(a.datasetOptions.hostname) ? a.datasetOptions.hostname : '',
                            headers: [],
                        });
                        add('info', ctx, 'No legacy web connector found — created connectors/Datasource Base Connector.web');
                    }
                    if (webUid) add('info', ctx, `Legacy webConnectorUid "${webUid}" not found — using ${webPath}`);
                }
                out.webConnectorUid = webPath;
                out.urlPostfix = String(prod.sourceLink ?? '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, n) => `$${n}$`);
                out.pollingInterval = nonEmpty(prod.autoUpdateInterval) ? prod.autoUpdateInterval : null;
            }
            if (storage === 'mixed' && !out.localJson) {
                add('info', ctx, 'Legacy storageType "mixed" without sourceObject — no local fallback');
            }
        } else if (storage === 'none') {
            add('info', ctx, 'Legacy storageType "none" — datasource kept empty');
        }

        if (isObj(a.datasetOptions) && nonEmpty(a.datasetOptions.hostname)) {
            const webPath = out.webConnectorUid;
            if (webPath && files.has(webPath) && !nonEmpty(prod.useBaseUrl)) {
                addOnce('info', ctx, 'Project datasetOptions.hostname exists but legacy useBaseUrl was off — not applied');
            } else if (webPath && files.has(webPath)) {
                const conn = files.get(webPath);
                if (!nonEmpty(conn.host)) conn.host = a.datasetOptions.hostname;
                if (nonEmpty(a.datasetOptions.headerKey) && Array.isArray(conn.headers)
                    && !conn.headers.some((hdr) => hdr.key === a.datasetOptions.headerKey)) {
                    conn.headers.push({ key: a.datasetOptions.headerKey, value: a.datasetOptions.headerValue ?? '' });
                }
            }
        }
        if (nonEmpty(prod.headerKey)) {
            const webPath = out.webConnectorUid;
            const conn = webPath ? files.get(webPath) : null;
            if (isObj(conn)) {
                conn.headers = Array.isArray(conn.headers) ? conn.headers : [];
                if (!conn.headers.some((hdr) => hdr.key === prod.headerKey)) {
                    conn.headers.push({ key: prod.headerKey, value: prod.headerValue ?? '' });
                    add('renamed', ctx, `Per-datasource header "${prod.headerKey}" → headers of ${webPath}`);
                } else {
                    addOnce('info', ctx, `Header "${prod.headerKey}" already present on ${webPath}`);
                }
            } else {
                add('todo', ctx, `Legacy per-datasource header "${prod.headerKey}" could not be placed (no web connector) — add it to the connector headers manually`);
            }
        }

        if (nonEmpty(prod.modificatorId)) {
            const fn = functionMap.get(String(prod.modificatorId));
            if (fn) {
                const fnBase = path.basename(fn);
                files.set(`datasources/${fnBase}`, files.get(fn));
                out.formatterFunction = `./${fnBase}`;
            } else {
                add('error', ctx, `Legacy datasource modificator "${prod.modificatorId}" not found — formatterFunction left empty`);
            }
        }

        files.set(ds.path, clean(out));
    }

    // ---- global.variables
    const convertVariableBase = makeVariableConverter({ crestronConnectorPath, mqttConnectorPath, functionMap });
    const globals = {};
    for (const v of Array.isArray(a.variables) ? a.variables : []) {
        if (!isObj(v) || !nonEmpty(v.name)) continue;
        const name = /^[a-zA-Z0-9_]+$/.test(String(v.name)) ? String(v.name) : varNamer(v.name);
        if (name !== String(v.name)) {
            add('error', `variable "${v.name}"`, `Variable name sanitized to "${name}" — update $…$ references during the page migration`);
        }
        globals[name] = convertVariableBase(v, `variable "${v.name}"`);
    }
    files.set('global.variables', globals);

    // ---- avstudio.config
    const projectName = args.name ?? sanitizeName(a.name ?? 'Imported project');
    const archiveName = String(a.archiveName ?? projectName)
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const envDebug = (a.env ?? []).some((e) => isObj(e?.debugOptions) && e.debugOptions.showConsoleOnLoad === true);
    const config = {
        name: projectName,
        archiveName,
        archiveType: a.archiveFormat === 'ch5z' ? 'ch5z' : 'zip',
        splashScreen: '',
        theme: 'theme/darkhuddle/darkhuddle.theme',
        loglevel: envDebug ? 'debug' : 'info',
        startPage: null,
    };
    if (nonEmpty(a.startPage)) {
        const planned = pagePlannedPath.get(String(a.startPage)) ?? null;
        config.startPage = planned;
        if (!planned) add('error', 'avstudio.config', `Legacy startPage "${a.startPage}" does not match any page`);
    }
    if (isObj(a.splashScreen) && nonEmpty(a.splashScreen.logoImgId)) {
        const media = mediaMap.get(String(a.splashScreen.logoImgId));
        if (media) config.splashScreen = media.imgPath;
    }
    files.set('avstudio.config', config);

    // ---- global.slots (skeleton; slot pages are built by the agent)
    const slots = {
        top: { pageKey: null, visibleByDefault: true, visibleOnPages: [], hiddenOnPages: [] },
        left: { pageKey: null, visibleByDefault: true, visibleOnPages: [], hiddenOnPages: [] },
        right: { pageKey: null, visibleByDefault: true, visibleOnPages: [], hiddenOnPages: [] },
        bottom: { pageKey: null, visibleByDefault: true, visibleOnPages: [], hiddenOnPages: [] },
    };
    const gcNamer = uniqueNamer();
    const globalContainersDigest = [];
    for (const gc of a.globalContainers ?? []) {
        if (!isObj(gc)) continue;
        const position = (orientation === 'landscape'
            ? (gc.landscapePosition ?? gc.portraitPosition)
            : (gc.portraitPosition ?? gc.landscapePosition)) ?? null;
        const collapsed = collapseContainer(gc, orientation);
        const plannedPage = position ? `pages/global/${gcNamer(gc.name ?? position)}.page` : null;
        globalContainersDigest.push(clean({
            name: gc.name,
            position,
            plannedPage,
            visibleByDefault: gc.visibleByDefault !== false,
            visibleOnPages: (gc.visibleOnPages ?? []).map((u) => pagePlannedPath.get(String(u)) ?? String(u)),
            hiddenOnPages: (gc.hiddenOnPages ?? []).map((u) => pagePlannedPath.get(String(u)) ?? String(u)),
            container: collapsed,
            anomalies: collapsed.anomalies.length ? collapsed.anomalies : undefined,
        }));
        if (!position || !['top', 'left', 'right', 'bottom'].includes(position)) {
            add('error', `globalContainer "${gc.name}"`, `No valid slot position (${gc.portraitPosition}/${gc.landscapePosition}) — build it as a regular page or place it manually`);
            continue;
        }
        if (slots[position].pageKey) {
            add('info', `globalContainer "${gc.name}"`, `Multiple containers on the "${position}" slot — merge them into ${slots[position].pageKey} during the migration`);
        } else {
            slots[position] = {
                pageKey: plannedPage,
                visibleByDefault: gc.visibleByDefault !== false,
                visibleOnPages: (gc.visibleOnPages ?? []).map((u) => pagePlannedPath.get(String(u)) ?? String(u)),
                hiddenOnPages: (gc.hiddenOnPages ?? []).map((u) => pagePlannedPath.get(String(u)) ?? String(u)),
            };
        }
    }
    files.set('global.slots', slots);

    // ---- global CSS (legacy theme css + project customCss)
    const themeCss = a.theme?.data?.attributes?.css ?? '';
    const customCss = a.customCss ?? '';
    const migratedCss = `${String(themeCss).trim()}\n\n${String(customCss).trim()}`;

    // Font-family aliases: legacy CSS may reference a short family name
    // ("Audiowide") while migrated theme fonts provide the file-base family
    // ("Audiowide-Regular"). Emit alias @font-face rules for prefix matches.
    const families = [...mediaMap.values()].filter((m) => m.kind === 'font').map((m) => m.family);
    const cssFamilyNames = new Set();
    for (const m of migratedCss.matchAll(/font-family\s*:\s*"?([^";}]+)"?/gi)) {
        for (const part of m[1].split(',')) cssFamilyNames.add(part.trim().replace(/^['"]|['"]$/g, ''));
    }
    const aliases = [];
    for (const name of cssFamilyNames) {
        if (!name || families.includes(name)) continue;
        const match = families.find((f) => f.startsWith(`${name}-`) || f.startsWith(`${name} `) || name.startsWith(`${f}-`));
        const mediaEntry = [...mediaMap.values()].find((m) => m.kind === 'font' && m.family === match);
        if (match && mediaEntry) {
            const file = path.basename(mediaEntry.imgPath);
            aliases.push(`/* Alias for the migrated font "${file}" (legacy family name "${name}") */\n@font-face {\n    font-family: "${name}";\n    src: url("./${file}");\n}`);
            add('renamed', 'theme fonts', `Font family alias added: "${name}" → "${file}"`);
        }
    }

    files.set('theme/darkhuddle/globalStyles.css', [
        '/* === Theme styles ===',
        '   CSS in this file applies to the whole project only while this theme is',
        '   active in Project Settings.',
        `   Migrated from the legacy build (${path.basename(srcDir)}) on ${report.generatedAt}. */`,
        '',
        ...aliases,
        '',
        migratedCss,
        '',
    ].filter((s, i, arr) => !(s === '' && arr[i - 1] === '')).join('\n'));

    // ---- icon sprites referenced by legacy elements (pre-activate the packs)
    const scanIcons = (containers) => {
        for (const c of containers ?? []) {
            for (const el of c.elements ?? []) {
                for (const src of [el, ...(el.modes ?? []).map((m) => m.modeProps ?? {})]) {
                    if (nonEmpty(src?.iconName) && !/[%${]/.test(String(src.iconName))) {
                        const lower = String(src.iconName).toLowerCase();
                        const pack = ['fa6', 'hi2', 'io5', 'ai', 'bi', 'bs', 'cg', 'ci', 'di', 'fa', 'fc', 'fi', 'gi', 'go', 'gr', 'hi', 'im', 'io', 'lia', 'lu', 'md', 'pi', 'ri', 'rx', 'si', 'sl', 'tb', 'tfi', 'ti', 'vsc', 'wi']
                            .sort((x, y) => y.length - x.length).find((code) => lower.startsWith(code));
                        if (pack) {
                            if (!neededIconPacks.has(pack)) neededIconPacks.set(pack, new Set());
                            neededIconPacks.get(pack).add(String(src.iconName));
                        }
                    }
                }
            }
        }
    };
    for (const p of legacyPages) scanIcons(p.attributes?.containers);
    for (const gc of a.globalContainers ?? []) scanIcons([gc]);
    activateIconPacks(files, neededIconPacks);
    copyThemeSnapshot(files);

    // ---- page digests (the agent's per-page worklist)
    for (const p of legacyPages) {
        const name = sanitizeName(p.attributes?.name ?? `Page ${p.id}`);
        const digest = buildPageDigest(p, orientation);
        files.set(`_legacy/pages/${name}.legacy.json`, digest);
        report.pageWorklist.push(clean({
            digest: `_legacy/pages/${name}.legacy.json`,
            target: pagePlannedPath.get(String(p.attributes?.uid ?? p.id)),
            layoutHint: digest.layoutHint,
            isSubpage: digest.isSubpage,
            containers: digest.containers.length,
            elements: digest.containers.reduce((n, c) => n + c.elements.length, 0),
            anomalies: digest.anomalies,
        }));
    }
    files.set('_legacy/staticdata.json', project); // full raw snapshot (minified)
    files.set('_legacy/media-map.json', Object.fromEntries(
        [...mediaMap.entries()].map(([id, m]) => [id, clean(m)]),
    ));
    files.set('_legacy/global-containers.json', globalContainersDigest);
    if (!globalContainersDigest.length) {
        add('info', 'global.slots', 'No legacy global containers — the generated skeleton is final');
    }

    // ---- write everything
    const projectFolder = 'AVstudio UI';
    const projectDir = path.join(outDir, projectFolder);
    fs.rmSync(outDir, { recursive: true, force: true });
    for (const d of dirs) fs.mkdirSync(path.join(projectDir, d), { recursive: true });
    for (const [rel, content] of files) {
        const abs = path.join(projectDir, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        if (isObj(content) && content.copyFrom) fs.copyFileSync(content.copyFrom, abs);
        else if (typeof content === 'string') fs.writeFileSync(abs, content, 'utf8');
        else fs.writeFileSync(abs, `${JSON.stringify(content, null, 4)}\n`, 'utf8');
    }

    // ---- project .gitignore: workspace root, same rules as the scaffold + staging folder
    // Keep in sync with getGitignoreTemplate() in extension/src/templates/project-structure.ts
    fs.writeFileSync(path.join(outDir, '.gitignore'), [
        '# MCP config (local paths, user-specific)',
        '.mcp.json',
        '.vscode/mcp.json',
        '.cursor/mcp.json',
        '',
        '# opencode (per-user settings)',
        'opencode.json',
        '.opencode/',
        '',
        '# Env files (per-deployment values, may contain credentials)',
        `${projectFolder}/env/*.env`,
        `!${projectFolder}/env/*.example.env`,
        '',
        '# Build output',
        `${projectFolder}/build/`,
        '',
        '# OS files',
        '.DS_Store',
        'Thumbs.db',
        '',
        '# IDE',
        '.idea/',
        '*.swp',
        '*.swo',
        '*~',
        '',
        '# Node (custom functions)',
        'node_modules/',
        '',
        '# Legacy staging (delete after the page migration)',
        `${projectFolder}/_legacy/`,
        '',
    ].join('\n'), 'utf8');

    // ---- validate the mechanical part
    validate(files);

    // ---- report
    report.summary.total = report.entries.length;
    fs.writeFileSync(
        path.join(outDir, 'migration-report.json'),
        `${JSON.stringify(report, null, 2)}\n`,
        'utf8',
    );

    const s = report.summary;
    console.log(`Staged ${legacyPages.length} pages for migration → ${outDir}`);
    console.log(`Mechanical part: renamed=${s.renamed} todo=${s.todo} error=${s.error} info=${s.info}`);
    console.log(`Next: migrate pages one-by-one following _legacy/*.legacy.json (see SKILL.md)`);
    if (s.error > 0) process.exitCode = 2;
};

run();
