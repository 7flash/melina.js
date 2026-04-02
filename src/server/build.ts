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
import { createMeasure } from 'measure-fn';

const isDev = process.env.NODE_ENV !== "production";
const { measure: buildMeasure } = createMeasure('build');

// ─── In-Memory Caches ──────────────────────────────────────────────────────────

export const buildCache: Record<string, { outputPath: string; content: ArrayBuffer }> = {};
export const builtAssets: Record<string, { content: ArrayBuffer; contentType: string }> = {};

// Dev-mode mtime cache — only rebuild when source files actually change.
// Without this, every navigation triggers full PostCSS+Tailwind + Bun builds,
// which crashes the server after a few rapid navigations on Windows.
//
// IMPORTANT: For bundled scripts (client scripts), we track the MAX mtime
// across the entire dependency tree, not just the entry file. This ensures
// editing any imported module triggers a rebuild.
const devMtimeCache = new Map<string, { mtime: number; outputPath: string }>();

function normalizeBuildKey(filePath: string): string {
    return path.resolve(process.cwd(), filePath);
}

/**
 * Recursively scan all local imports from an entry file and return
 * the maximum mtime across the entire dependency tree.
 * Uses Bun.Transpiler to extract imports, then resolves relative paths.
 * Non-local imports (node_modules, bare specifiers) are skipped.
 */
function getTreeMtime(entryPath: string): number {
    const visited = new Set<string>();
    let maxMtime = 0;

    function walk(filePath: string) {
        const resolved = path.resolve(filePath);
        if (visited.has(resolved)) return;
        visited.add(resolved);

        try {
            const stat = Bun.file(resolved);
            const mtime = stat.lastModified || 0;
            if (mtime > maxMtime) maxMtime = mtime;

            // Only scan source files for imports
            const ext = path.extname(resolved);
            if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;

            const source = readFileSync(resolved, 'utf-8');
            const transpiler = new Bun.Transpiler({ loader: getLoaderForExt(ext) });
            const imports = transpiler.scanImports(source);

            for (const imp of imports) {
                const importPath = imp.path;
                // Only follow local relative imports
                if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;

                const baseDir = path.dirname(resolved);
                const candidates = [
                    path.resolve(baseDir, importPath),
                    path.resolve(baseDir, importPath + '.ts'),
                    path.resolve(baseDir, importPath + '.tsx'),
                    path.resolve(baseDir, importPath + '.js'),
                    path.resolve(baseDir, importPath + '.jsx'),
                    path.resolve(baseDir, importPath, 'index.ts'),
                    path.resolve(baseDir, importPath, 'index.tsx'),
                    path.resolve(baseDir, importPath, 'index.js'),
                    path.resolve(baseDir, importPath, 'index.jsx'),
                ];

                for (const candidate of candidates) {
                    if (existsSync(candidate)) {
                        walk(candidate);
                        break;
                    }
                }
            }
        } catch {
            // Ignore unreadable/missing files
        }
    }

    walk(entryPath);
    return maxMtime;
}

function getLoaderForExt(ext: string): 'ts' | 'tsx' | 'js' | 'jsx' {
    switch (ext) {
        case '.tsx': return 'tsx';
        case '.jsx': return 'jsx';
        case '.js': return 'js';
        default: return 'ts';
    }
}

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

// ─── Server-Only Package Detection ──────────────────────────────────────────────

// Known server-only packages (fallback baseline)
const KNOWN_SERVER_PACKAGES = ['sqlite-zod-orm', 'telegram', 'better-sqlite3', 'sqlite3'];

// Cached result — detection runs once per process
let _detectedServerPackages: string[] | null = null;

/**
 * Auto-detect server-only packages by scanning node_modules for packages
 * that use `bun:*` imports. Also reads `melina.serverOnly` from the app's
 * package.json for explicit additions.
 *
 * Detection strategy:
 * 1. Read app's package.json for `melina.serverOnly` array (explicit config)
 * 2. Scan each dependency's entry point for `bun:*` require/import patterns
 * 3. Merge with known server packages and deduplicate
 */
function detectServerOnlyPackages(): string[] {
    if (_detectedServerPackages) return _detectedServerPackages;

    const detected = new Set<string>(KNOWN_SERVER_PACKAGES);

    try {
        // 1. Check app's package.json for melina.serverOnly config
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            const configList = pkg?.melina?.serverOnly;
            if (Array.isArray(configList)) {
                for (const name of configList) {
                    if (typeof name === 'string') detected.add(name);
                }
            }

            // 2. Scan dependencies for bun:* imports
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
            const nodeModules = path.resolve(process.cwd(), 'node_modules');

            for (const depName of Object.keys(deps)) {
                if (depName.startsWith('@types/')) continue;

                try {
                    const depPkgPath = path.join(nodeModules, depName, 'package.json');
                    if (!existsSync(depPkgPath)) continue;

                    const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf-8'));
                    const entry = depPkg.main || depPkg.module || depPkg.exports?.['.']?.import || depPkg.exports?.['.']?.default || 'index.js';
                    const entryPath = path.join(nodeModules, depName, typeof entry === 'string' ? entry : 'index.js');

                    if (existsSync(entryPath)) {
                        const content = readFileSync(entryPath, 'utf-8');
                        if (/\bbun:[a-z]+\b/.test(content)) {
                            detected.add(depName);
                        }
                    }
                } catch {
                    // Skip packages that can't be scanned
                }
            }
        }
    } catch (e) {
        console.warn('[Melina] Failed to auto-detect server packages, using defaults:', e);
    }

    _detectedServerPackages = [...detected];
    if (isDev) {
        console.log(`[Melina] Server-only packages (stubbed for browser): ${_detectedServerPackages.join(', ')}`);
    }
    return _detectedServerPackages;
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
    const cacheKey = normalizeBuildKey(clientPath);
    const existing = buildInFlight.get(cacheKey);
    if (existing) return existing;

    // Note: measure-fn returns null on error (does NOT re-throw even with onError)
    // so we must check for null result instead of relying on try/catch
    const promise = buildMeasure(`Client: ${path.basename(clientPath)}`, () => _buildClientScriptImpl(cacheKey)) as Promise<string | null>;
    buildInFlight.set(cacheKey, promise as Promise<string>);
    try {
        const result = await promise;
        if (result === null) {
            // Build failed — try cache fallback
            const cached = buildCache[cacheKey];
            if (cached) {
                console.error(`[Melina] Build failed for ${clientPath}, using cached version`);
                return cached.outputPath;
            }
            throw new Error(`Client script build failed: ${clientPath}`);
        }
        return result;
    } finally {
        buildInFlight.delete(cacheKey);
    }
}

async function _buildClientScriptImpl(clientPath: string): Promise<string> {
    // Production: use permanent cache
    if (!isDev && buildCache[clientPath]) {
        return buildCache[clientPath].outputPath;
    }

    // Dev: use tree mtime cache — skip rebuild if NO file in the dependency tree has changed
    if (isDev) {
        try {
            const treeMtime = getTreeMtime(clientPath);
            const cached = devMtimeCache.get(clientPath);
            if (cached && cached.mtime === treeMtime) {
                return cached.outputPath;
            }
        } catch { /* stat failed, rebuild */ }
    }

    const source = readFileSync(clientPath, 'utf-8');
    const usesReact = /\bfrom\s+['"]react(?:-dom)?(?:\/[^'"]*)?['"]/.test(source)
        || /\brequire\s*\(\s*['"]react/.test(source);

    const jsxDomPath = path.resolve(__dirname, '../client/jsx-dom.ts');
    const clientIndexPath = path.resolve(__dirname, '../client/index.ts');
    const jsxDevRuntimePath = path.resolve(__dirname, '../client/jsx-dev-runtime.ts');
    const jsxRuntimePath = path.resolve(__dirname, '../client/jsx-runtime.ts');

    const plugins: any[] = [];
    // Externalize Node.js/Bun built-in modules (these don't get imported in the browser)
    const external: string[] = [
        'bun', 'bun:sqlite', 'bun:ffi', 'bun:test', 'bun:jsc',
        'node:fs', 'node:path', 'node:crypto', 'node:os', 'node:child_process',
        'node:net', 'node:http', 'node:https', 'node:stream', 'node:url',
        'node:util', 'node:events', 'node:buffer', 'node:assert',
        'fs', 'path', 'crypto', 'os', 'child_process', 'net', 'http', 'https',
    ];

    // Server-only packages that should be stubbed (not externalized) so
    // the browser bundle doesn't contain bare specifier imports.
    // The stub uses a Proxy so any named import (e.g. { Database, z }) works.
    //
    // Auto-detected: scan node_modules for packages using bun:* imports.
    // Also reads melina.serverOnly from package.json for app-specific additions.
    const serverOnlyPackages = detectServerOnlyPackages();

    plugins.push({
        name: 'melina-server-stub',
        setup(build: any) {
            const filter = new RegExp(`^(${serverOnlyPackages.join('|')})(/.*)?$`);
            build.onResolve({ filter }, (args: any) => {
                return { path: args.path, namespace: 'server-stub' };
            });
            build.onLoad({ filter: /.*/, namespace: 'server-stub' }, () => {
                return {
                    contents: `
const handler = { get: (_, p) => (p === Symbol.toPrimitive ? () => '' : typeof p === 'string' ? new Proxy(() => {}, handler) : undefined) };
const stub = new Proxy(() => {}, handler);
export default stub;
export const Database = stub;
export const z = stub;
export const TelegramClient = stub;
export const StringSession = stub;
// Catch-all: re-export stub for any destructured import
export { stub as Api, stub as sessions };
`,
                    loader: 'js',
                };
            });
        }
    });

    if (usesReact) {
        external.push('react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom/client');
        clientScriptsUsingReact.add(clientPath);
    } else {
        plugins.push({
            name: 'melina-jsx-dom',
            setup(build: any) {
                // react/* JSX → jsx-dom.ts (real DOM elements)
                build.onResolve({ filter: /^react\/jsx-runtime$|^react\/jsx-dev-runtime$|^react$/ }, () => {
                    return { path: jsxDomPath };
                });
                // melina/client/jsx-*-runtime → VDOM runtime (VNodes for render())
                build.onResolve({ filter: /^melina\/client\/jsx-dev-runtime$/ }, () => {
                    return { path: jsxDevRuntimePath };
                });
                build.onResolve({ filter: /^melina\/client\/jsx-runtime$/ }, () => {
                    return { path: jsxRuntimePath };
                });
                // melina/client → actual client barrel
                build.onResolve({ filter: /^melina\/client$/ }, () => {
                    return { path: clientIndexPath };
                });
            }
        });
    }

    // CSS Modules plugin — intercepts .module.css imports
    plugins.push({
        name: 'melina-css-modules',
        setup(build: any) {
            // Resolve .module.css imports to a virtual namespace
            build.onResolve({ filter: /\.module\.css$/ }, (args: any) => {
                const resolved = args.importer
                    ? path.resolve(path.dirname(args.importer), args.path)
                    : path.resolve(args.path);
                return { path: resolved, namespace: 'css-module' };
            });

            // Load: build the CSS module and return JS that injects styles + exports classMap
            build.onLoad({ filter: /.*/, namespace: 'css-module' }, async (args: any) => {
                const moduleResult = await buildCSSModule(args.path);
                const mapEntries = Object.entries(moduleResult.classMap)
                    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
                    .join(',\n');

                // Emit JS that:
                // 1. Injects a <style> tag with the scoped CSS (idempotent via data attribute)
                // 2. Exports the class name mapping
                const escapedCss = moduleResult.css
                    .replace(/\\/g, '\\\\')
                    .replace(/`/g, '\\`')
                    .replace(/\$/g, '\\$');

                return {
                    contents: `
// CSS Module: ${path.basename(args.path)}
const id = ${JSON.stringify('cssmod-' + path.basename(args.path, '.module.css'))};
if (typeof document !== 'undefined' && !document.querySelector(\`style[data-cssmod="\${id}"]\`)) {
    const style = document.createElement('style');
    style.setAttribute('data-cssmod', id);
    style.textContent = \`${escapedCss}\`;
    document.head.appendChild(style);
}
export default {
${mapEntries}
};
`,
                    loader: 'js',
                };
            });
        }
    });


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

    // Update tree mtime cache for dev mode
    if (isDev) {
        try {
            const treeMtime = getTreeMtime(clientPath);
            devMtimeCache.set(clientPath, { mtime: treeMtime, outputPath });
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

    const absolutePath = normalizeBuildKey(filePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`Script not found: ${filePath}`);
    }

    if (!isDev && buildCache[absolutePath]) {
        return buildCache[absolutePath].outputPath;
    }

    const existing = buildInFlight.get(absolutePath);
    if (existing) return existing;

    const promise = buildMeasure(`Script: ${path.basename(filePath)}`, () => _buildScriptImpl(absolutePath, absolutePath, allExternal), (e: any) => { throw e; }) as Promise<string>;
    buildInFlight.set(absolutePath, promise);
    try {
        return await promise;
    } finally {
        buildInFlight.delete(absolutePath);
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

    // Surface build logs (errors, warnings) to the developer console
    if (result.logs && result.logs.length > 0) {
        for (const log of result.logs) {
            const level = log.level || 'info';
            const msg = log.message || String(log);
            const position = log.position ? ` at ${log.position.file}:${log.position.line}:${log.position.column}` : '';
            if (level === 'error') {
                console.error(`[Melina Build Error] ${msg}${position}`);
            } else if (level === 'warning') {
                console.warn(`[Melina Build Warning] ${msg}${position}`);
            } else if (isDev) {
                console.log(`[Melina Build] ${msg}${position}`);
            }
        }
    }

    // Check if build succeeded (Bun returns success: false on build errors)
    if (result.success === false) {
        const errorMessages = (result.logs || [])
            .filter((l: any) => l.level === 'error')
            .map((l: any) => l.message || String(l))
            .join('\n');
        throw new Error(`Build failed for ${filePath}:\n${errorMessages || 'Unknown build error'}`);
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

    const absolutePath = normalizeBuildKey(filePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`Style not found: ${filePath}`);
    }

    if (!isDev && buildCache[absolutePath]) {
        return buildCache[absolutePath].outputPath;
    }

    const existing = buildInFlight.get(absolutePath);
    if (existing) return existing;

    const promise = buildMeasure(`Style: ${path.basename(filePath)}`, () => _buildStyleImpl(absolutePath, absolutePath), (e: any) => { throw e; }) as Promise<string>;
    buildInFlight.set(absolutePath, promise);
    try {
        return await promise;
    } catch (err) {
        const cached = buildCache[absolutePath];
        if (cached) {
            console.error(`[Melina] Style build failed for ${filePath}, using cached version:`, (err as Error).message);
            return cached.outputPath;
        }
        throw err;
    } finally {
        buildInFlight.delete(absolutePath);
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
        builtAssets[sourceMapPath] = { content: new TextEncoder().encode(sourceMapContent).buffer as ArrayBuffer, contentType: 'application/json' };
        finalCss += `\n/*# sourceMappingURL=${path.basename(sourceMapPath)} */`;
    }

    const content = new TextEncoder().encode(finalCss).buffer as ArrayBuffer;
    buildCache[filePath] = { outputPath, content };
    builtAssets[outputPath] = { content, contentType };

    // Update mtime cache for dev mode
    if (isDev) {
        try {
            const stat = Bun.file(absolutePath);
            const mtime = (await stat.stat?.())?.mtimeMs ?? stat.lastModified;
            devMtimeCache.set(absolutePath, { mtime, outputPath });
        } catch { /* ok */ }
    }

    return outputPath;
}

// ─── Scoped CSS Builder ────────────────────────────────────────────────────────

/**
 * Build route-scoped CSS (page.css / style.css).
 * Uses the route pattern in the cache key to avoid collisions.
 */
export async function buildScopedStyle(filePath: string, routePattern: string): Promise<string> {
    const cacheKey = `scoped:${filePath}:${routePattern}`;
    if (!isDev && buildCache[cacheKey]) {
        return buildCache[cacheKey].outputPath;
    }

    const existing = buildInFlight.get(cacheKey);
    if (existing) return existing;

    const promise = buildMeasure(`Scoped CSS: ${routePattern}`, () => _buildScopedStyleImpl(filePath, routePattern, cacheKey), (e: any) => { throw e; }) as Promise<string>;
    buildInFlight.set(cacheKey, promise);
    try {
        return await promise;
    } finally {
        buildInFlight.delete(cacheKey);
    }
}

async function _buildScopedStyleImpl(filePath: string, routePattern: string, cacheKey: string): Promise<string> {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!existsSync(absolutePath)) throw new Error(`Scoped CSS not found: ${filePath}`);

    // Dev mtime cache
    if (isDev) {
        try {
            const stat = Bun.file(absolutePath);
            const mtime = (await stat.stat?.())?.mtimeMs ?? stat.lastModified;
            const cached = devMtimeCache.get(cacheKey);
            if (cached && cached.mtime === mtime) return cached.outputPath;
        } catch { /* rebuild */ }
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const baseName = path.basename(absolutePath, ext);
    const scopeSlug = routePattern
        .replace(/^\//, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'root';

    const cssContent = await Bun.file(absolutePath).text();
    const result = await serializedBuild(() =>
        postcss([autoprefixer, tailwind]).process(cssContent, {
            from: absolutePath,
            to: 'style.css',
            map: false,
        })
    );

    const finalCss = result.css || '';
    const hash = new Bun.CryptoHasher("sha256").update(finalCss).digest('hex').slice(0, 8);
    const outputPath = `/${baseName}-${scopeSlug}-${hash}.css`;
    const content = new TextEncoder().encode(finalCss).buffer as ArrayBuffer;
    buildCache[cacheKey] = { outputPath, content };
    builtAssets[outputPath] = { content, contentType: 'text/css' };

    if (isDev) {
        try {
            const stat = Bun.file(absolutePath);
            const mtime = (await stat.stat?.())?.mtimeMs ?? stat.lastModified;
            devMtimeCache.set(cacheKey, { mtime, outputPath });
        } catch { /* ok */ }
    }

    return outputPath;
}

// ─── CSS Modules Builder ───────────────────────────────────────────────────────

export interface CSSModuleResult {
    css: string;
    classMap: Record<string, string>;
    cssUrl: string;
}

const cssModuleCache = new Map<string, CSSModuleResult>();

/**
 * Build a .module.css file:
 * 1. Processes CSS through PostCSS/Tailwind
 * 2. Hashes class selectors (`.foo` → `.foo_ab12cd34`)
 * 3. Returns processed CSS + class name mapping + built asset URL
 */
export async function buildCSSModule(filePath: string): Promise<CSSModuleResult> {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`CSS module not found: ${filePath}`);
    }

    // Dev mtime cache
    if (isDev) {
        try {
            const stat = Bun.file(absolutePath);
            const mtime = (await stat.stat?.())?.mtimeMs ?? stat.lastModified;
            const cached = cssModuleCache.get(absolutePath);
            if (cached) {
                const devCached = devMtimeCache.get(`cssmod:${absolutePath}`);
                if (devCached && devCached.mtime === mtime) return cached;
            }
        } catch { /* rebuild */ }
    } else {
        const cached = cssModuleCache.get(absolutePath);
        if (cached) return cached;
    }

    const rawCss = await Bun.file(absolutePath).text();
    const processed = await serializedBuild(() =>
        postcss([autoprefixer, tailwind]).process(rawCss, {
            from: absolutePath,
            to: 'style.css',
            map: false,
        })
    );

    let css = processed.css || '';

    // Extract class selectors from the processed CSS.
    // This is intentionally simple: match `.className` patterns and ignore pseudo-classes.
    const classRegex = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
    const classNames = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = classRegex.exec(css)) !== null) {
        const name = match[1];
        if (name === 'css') continue; // avoid accidental matches like .css in comments/urls
        classNames.add(name);
    }

    const fileHash = new Bun.CryptoHasher('sha256').update(absolutePath).digest('hex').slice(0, 8);
    const classMap: Record<string, string> = {};
    for (const original of classNames) {
        classMap[original] = `${original}_${fileHash}`;
    }

    // Replace selectors in CSS with hashed versions
    for (const [original, scoped] of Object.entries(classMap)) {
        const selectorRegex = new RegExp(`\\.${original}(?![A-Za-z0-9_-])`, 'g');
        css = css.replace(selectorRegex, `.${scoped}`);
    }

    const cssHash = new Bun.CryptoHasher('sha256').update(css).digest('hex').slice(0, 8);
    const baseName = path.basename(absolutePath, '.module.css');
    const cssUrl = `/${baseName}-module-${cssHash}.css`;
    const content = new TextEncoder().encode(css).buffer as ArrayBuffer;
    builtAssets[cssUrl] = { content, contentType: 'text/css' };

    const result: CSSModuleResult = { css, classMap, cssUrl };
    cssModuleCache.set(absolutePath, result);

    // Update dev mtime cache
    if (isDev) {
        try {
            const stat = Bun.file(absolutePath);
            const mtime = (await stat.stat?.())?.mtimeMs ?? stat.lastModified;
            devMtimeCache.set(`cssmod:${absolutePath}`, { mtime, outputPath: cssUrl });
        } catch { /* ok */ }
    }

    return result;
}

// ─── Static Asset Builder ──────────────────────────────────────────────────────

/**
 * Build a static asset (image, font, etc) by storing it in memory with a hashed URL.
 */
export async function buildAsset(file?: BunFile): Promise<string> {
    if (!file) return '';

    const filePath = (file as any).name || '';
    if (!filePath) {
        throw new Error('BunFile object must have a name property');
    }
    if (!existsSync(filePath)) {
        throw new Error(`Asset not found: ${filePath}`);
    }

    if (!isDev && buildCache[filePath]) {
        return buildCache[filePath].outputPath;
    }

    const existing = buildInFlight.get(filePath);
    if (existing) return existing;

    const promise = buildMeasure(`Asset: ${path.basename(filePath)}`, () => _buildAssetImpl(file, filePath), (e: any) => { throw e; }) as Promise<string>;
    buildInFlight.set(filePath, promise);
    try {
        return await promise;
    } finally {
        buildInFlight.delete(filePath);
    }
}

async function _buildAssetImpl(file: BunFile, filePath: string): Promise<string> {
    const bytes = await file.arrayBuffer();
    const hash = new Bun.CryptoHasher('sha256').update(bytes).digest('hex').slice(0, 8);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const outputPath = `/${baseName}-${hash}${ext}`;
    const contentType = file.type || getContentType(ext);

    const content = bytes;
    buildCache[filePath] = { outputPath, content };
    builtAssets[outputPath] = { content, contentType };

    return outputPath;
}

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
