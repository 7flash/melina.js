/**
 * Asset Build Pipeline
 * 
 * Handles building JavaScript, TypeScript, CSS, and static assets
 * with caching, deduplication, and content-type detection.
 */

import { build as bunBuild, type BuildConfig, type BunFile } from "bun";
import path from "path";
import { existsSync, readFileSync } from "fs";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const isDev = process.env.NODE_ENV !== "production";

// ─── In-Memory Caches ──────────────────────────────────────────────────────────

export const buildCache: Record<string, { outputPath: string; content: ArrayBuffer }> = {};
export const builtAssets: Record<string, { content: ArrayBuffer; contentType: string }> = {};

// Dev-mode mtime cache — only rebuild when source files actually change.
// Without this, every navigation triggers full PostCSS+Tailwind + Bun builds,
// which crashes the server after a few rapid navigations on Windows.
const devMtimeCache = new Map<string, { mtime: number; outputPath: string }>();

// Build deduplication — prevent concurrent builds of the same file
const buildInFlight = new Map<string, Promise<string>>();

// Global build serializer — prevents concurrent Bun builds + PostCSS from
// overwhelming the process on rapid navigation (Windows is especially fragile).
let buildQueue: Promise<any> = Promise.resolve();

async function serializedBuild<T>(fn: () => Promise<T>): Promise<T> {
    const prev = buildQueue;
    let resolve: () => void;
    buildQueue = new Promise<void>(r => resolve = r);
    await prev;
    try {
        return await fn();
    } finally {
        resolve!();
    }
}

// Track which client scripts need React import maps
export const clientScriptsUsingReact = new Set<string>();

// ─── Content Type Detection ─────────────────────────────────────────────────────

export function getContentType(ext: string): string {
    switch (ext.toLowerCase()) {
        // Images
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.svg':
            return 'image/svg+xml';
        case '.ico':
            return 'image/x-icon';

        // Fonts
        case '.ttf':
            return 'font/ttf';
        case '.otf':
            return 'font/otf';
        case '.woff':
            return 'font/woff';
        case '.woff2':
            return 'font/woff2';
        case '.eot':
            return 'application/vnd.ms-fontobject';

        // Styles & Scripts
        case '.css':
            return 'text/css';
        case '.js':
            return 'text/javascript';

        // Data & Documents
        case '.json':
            return 'application/json';
        case '.pdf':
            return 'application/pdf';

        // Audio/Video
        case '.mp3':
            return 'audio/mpeg';
        case '.mp4':
            return 'video/mp4';
        case '.webm':
            return 'video/webm';

        default:
            return 'application/octet-stream';
    }
}

// ─── Client Script Builder ──────────────────────────────────────────────────────

/**
 * Build a client mount script (.client.tsx) with the jsx-dom plugin.
 * JSX in client scripts creates real DOM elements, not virtual DOM.
 *
 * If the client script imports from 'react' or 'react-dom', it is built
 * in React mode instead (externalized, resolved via import maps).
 */
export async function buildClientScript(clientPath: string): Promise<string> {
    const existing = buildInFlight.get(clientPath);
    if (existing) return existing;

    const promise = _buildClientScriptImpl(clientPath);
    buildInFlight.set(clientPath, promise);
    try {
        return await promise;
    } finally {
        buildInFlight.delete(clientPath);
    }
}

async function _buildClientScriptImpl(clientPath: string): Promise<string> {
    // Production: use permanent cache
    if (!isDev && buildCache[clientPath]) {
        return buildCache[clientPath].outputPath;
    }

    // Dev: use mtime cache — skip rebuild if source hasn't changed
    if (isDev) {
        try {
            const mtime = Bun.file(clientPath).lastModified;
            const cached = devMtimeCache.get(clientPath);
            if (cached && cached.mtime === mtime) {
                return cached.outputPath;
            }
        } catch { /* stat failed, rebuild */ }
    }

    const source = readFileSync(clientPath, 'utf-8');
    const usesReact = /\bfrom\s+['"]react(?:-dom)?(?:\/[^'"]*)?['"]/.test(source)
        || /\brequire\s*\(\s*['"]react/.test(source);

    const jsxDomPath = path.resolve(__dirname, '../client/jsx-dom.ts');

    const plugins: any[] = [];
    const external: string[] = [];

    if (usesReact) {
        external.push('react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client');
        clientScriptsUsingReact.add(clientPath);
    } else {
        plugins.push({
            name: 'melina-jsx-dom',
            setup(build: any) {
                build.onResolve({ filter: /^react\/jsx-runtime$|^react\/jsx-dev-runtime$|^react$/ }, () => {
                    return { path: jsxDomPath };
                });
            }
        });
    }

    const result = await serializedBuild(() => bunBuild({
        entrypoints: [clientPath],
        outdir: undefined,
        target: 'browser',
        minify: !isDev,
        sourcemap: isDev ? 'linked' : 'none',
        external,
        plugins,
        define: {
            'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
        },
        naming: {
            entry: '[name]-[hash].[ext]',
            chunk: '[name]-[hash].[ext]',
            asset: '[name]-[hash].[ext]',
        },
    }));

    const mainOutput = result.outputs.find(o => o.kind === 'entry-point');
    if (!mainOutput) {
        throw new Error(`Client script build failed: ${clientPath}`);
    }

    for (const output of result.outputs) {
        const content = await output.arrayBuffer();
        const outputPath = `/${path.basename(output.path)}`;
        const contentType = output.type || getContentType(path.extname(output.path));
        builtAssets[outputPath] = { content, contentType };
    }

    const outputPath = `/${path.basename(mainOutput.path)}`;
    buildCache[clientPath] = { outputPath, content: await mainOutput.arrayBuffer() };

    // Update mtime cache for dev mode
    if (isDev) {
        try {
            const mtime = Bun.file(clientPath).lastModified;
            devMtimeCache.set(clientPath, { mtime, outputPath });
        } catch { /* ok */ }
    }

    return outputPath;
}

// ─── Script Builder ─────────────────────────────────────────────────────────────

/**
 * Build JavaScript/TypeScript files using Bun's bundler.
 * @param filePath Path to the script file
 * @returns URL path to the built asset
 */
export async function buildScript(filePath: string, allExternal = false): Promise<string> {
    if (!filePath) {
        throw new Error('File path is required');
    }

    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`Script not found: ${filePath}`);
    }

    if (!isDev && buildCache[filePath]) {
        return buildCache[filePath].outputPath;
    }

    const existing = buildInFlight.get(filePath);
    if (existing) return existing;

    const promise = _buildScriptImpl(absolutePath, filePath, allExternal);
    buildInFlight.set(filePath, promise);
    try {
        return await promise;
    } finally {
        buildInFlight.delete(filePath);
    }
}

async function _buildScriptImpl(absolutePath: string, filePath: string, allExternal: boolean): Promise<string> {

    let packageJson: any;
    try {
        packageJson = (await import(path.resolve(process.cwd(), 'package.json'), { assert: { type: 'json' } })).default;
    } catch (e) {
        throw new Error("package.json not found");
    }

    const dependencies = { ...(packageJson.dependencies || {}) };
    let external = Object.keys(dependencies);
    if (allExternal) external = ["*"];

    const buildConfig: BuildConfig = {
        entrypoints: [absolutePath],
        outdir: undefined,
        minify: !isDev,
        target: "browser",
        sourcemap: isDev ? "linked" : "none",
        external,
        define: {
            "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
        },
        naming: {
            entry: "[name]-[hash].[ext]",
            chunk: "[name]-[hash].[ext]",
            asset: "[name]-[hash].[ext]",
        },
    };

    let result;
    try {
        result = await serializedBuild(() => bunBuild(buildConfig));
    } catch (error) {
        console.error(`bunBuild failed, trying fallback: ${error}`);
        try {
            await Bun.$`bun build ${absolutePath} --external ${external.join(',')} --outdir /tmp --target browser --sourcemap=${isDev ? "linked" : "none"}`;
        } catch (fallbackError) {
            throw new Error(`Build failed for ${filePath}: ${fallbackError}`);
        }
        throw new Error(`Build failed for ${filePath}: ${error}`);
    }

    const mainOutput = result.outputs.find(o => o.kind === 'entry-point');
    if (!mainOutput) {
        throw new Error(`No entry-point output found for ${filePath}`);
    }

    for (const output of result.outputs) {
        const content = await output.arrayBuffer();
        const outputPath = `/${path.basename(output.path)}`;
        const contentType = output.type || getContentType(path.extname(output.path));
        builtAssets[outputPath] = { content, contentType };
    }

    const outputPath = `/${path.basename(mainOutput.path)}`;
    buildCache[filePath] = { outputPath, content: await mainOutput.arrayBuffer() };

    return outputPath;
}

// ─── Style Builder ──────────────────────────────────────────────────────────────

/**
 * Build CSS files with PostCSS processing.
 * @param filePath Path to the CSS file
 * @returns URL path to the built asset
 */
export async function buildStyle(filePath: string): Promise<string> {
    if (!filePath) {
        throw new Error('File path is required');
    }

    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`Style not found: ${filePath}`);
    }

    if (!isDev && buildCache[filePath]) {
        return buildCache[filePath].outputPath;
    }

    const existing = buildInFlight.get(filePath);
    if (existing) return existing;

    const promise = _buildStyleImpl(absolutePath, filePath);
    buildInFlight.set(filePath, promise);
    try {
        return await promise;
    } finally {
        buildInFlight.delete(filePath);
    }
}

async function _buildStyleImpl(absolutePath: string, filePath: string): Promise<string> {

    // Dev: use mtime cache — skip rebuild if source hasn't changed
    if (isDev) {
        try {
            const stat = Bun.file(absolutePath);
            const mtime = (await stat.stat?.())?.mtimeMs ?? stat.lastModified;
            const cached = devMtimeCache.get(absolutePath);
            if (cached && cached.mtime === mtime) {
                return cached.outputPath;
            }
        } catch { /* stat failed, rebuild */ }
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const baseName = path.basename(absolutePath, ext);

    const cssContent = await Bun.file(absolutePath).text();
    const result = await serializedBuild(() =>
        postcss([autoprefixer, tailwind]).process(cssContent, {
            from: absolutePath,
            to: 'style.css',
            map: isDev ? { inline: false } : false,
        })
    );

    if (!result.css) {
        throw new Error(`PostCSS processing returned empty CSS for ${absolutePath}`);
    }

    let finalCss = result.css;
    const hash = new Bun.CryptoHasher("sha256").update(finalCss).digest('hex').slice(0, 8);
    const outputPath = `/${baseName}-${hash}.css`;
    const contentType = 'text/css';

    if (isDev && result.map) {
        const sourceMapPath = `${outputPath}.map`;
        const sourceMapContent = result.map.toString();
        builtAssets[sourceMapPath] = { content: new TextEncoder().encode(sourceMapContent), contentType: 'application/json' };
        finalCss += `\n/*# sourceMappingURL=${path.basename(sourceMapPath)} */`;
    }

    const content = new TextEncoder().encode(finalCss);
    buildCache[filePath] = { outputPath, content };
    builtAssets[outputPath] = { content, contentType };

    // Update mtime cache for dev mode
    if (isDev) {
        try {
            const mtime = Bun.file(absolutePath).lastModified;
            devMtimeCache.set(absolutePath, { mtime, outputPath });
        } catch { /* ok */ }
    }

    return outputPath;
}

// ─── Static Asset Builder ───────────────────────────────────────────────────────

/**
 * Build static assets (images, fonts, etc.) from BunFile.
 * @param file BunFile object
 * @returns URL path to the built asset
 */
export async function buildAsset(file?: BunFile): Promise<string> {
    if (!file) {
        return '';
    }

    const filePath = file.name || '';
    if (!filePath) {
        throw new Error('BunFile object must have a name property');
    }

    const fileExists = await file.exists();
    if (!fileExists) {
        throw new Error(`Asset not found: ${filePath}`);
    }

    if (!isDev && buildCache[filePath]) {
        return buildCache[filePath].outputPath;
    }

    const existing = buildInFlight.get(filePath);
    if (existing) return existing;

    const promise = _buildAssetImpl(file, filePath);
    buildInFlight.set(filePath, promise);
    try {
        return await promise;
    } finally {
        buildInFlight.delete(filePath);
    }
}

async function _buildAssetImpl(file: BunFile, filePath: string): Promise<string> {

    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);

    const content = await file.arrayBuffer();
    const hash = new Bun.CryptoHasher("sha256").update(new Uint8Array(content)).digest('hex').slice(0, 8);
    const outputPath = `/${baseName}-${hash}${ext}`;
    const contentType = getContentType(ext);

    buildCache[filePath] = { outputPath, content };
    builtAssets[outputPath] = { content, contentType };
    return outputPath;
}

// ─── Legacy Asset Function ──────────────────────────────────────────────────────

/** @deprecated Use buildScript(), buildStyle(), or buildAsset() instead. */
export async function asset(fileOrPath: BunFile | string): Promise<string> {
    console.warn('asset() is deprecated. Use buildScript(), buildStyle(), or buildAsset() instead.');

    if (typeof fileOrPath === 'string') {
        const ext = path.extname(fileOrPath).toLowerCase();
        if (ext === '.css') {
            return buildStyle(fileOrPath);
        } else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
            return buildScript(fileOrPath);
        } else {
            const file = Bun.file(fileOrPath);
            return buildAsset(file);
        }
    } else {
        return buildAsset(fileOrPath);
    }
}

// ─── Cache Management ───────────────────────────────────────────────────────────

export function clearCaches() {
    Object.keys(buildCache).forEach(key => delete buildCache[key]);
    Object.keys(builtAssets).forEach(key => delete builtAssets[key]);
}
