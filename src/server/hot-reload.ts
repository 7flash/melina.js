/**
 * Hot Reload — Dev-only file watcher for client scripts.
 *
 * Watches client script dependency trees using Bun's native FSWatcher.
 * When a file changes, invalidates the build cache and notifies browsers
 * via Server-Sent Events to trigger a page reload.
 *
 * Architecture:
 * - `startHotReload()` initializes the watcher and SSE endpoint
 * - `addClientScript()` registers a client script and its dep tree for watching
 * - `getHotReloadScript()` returns the client-side reconnecting SSE listener
 * - `handleHotReloadSSE()` handles the `/__melina_hmr` SSE connection
 */

import path from 'path';
import { watch, type FSWatcher } from 'fs';
import { existsSync, readFileSync, statSync } from 'fs';

const isDev = process.env.NODE_ENV !== 'production';

// ── State ────────────────────────────────────────────
let _watcher: FSWatcher | null = null;
const _sseClients = new Set<ReadableStreamDefaultController>();
const _watchedDirs = new Set<string>();
const _fileToScripts = new Map<string, Set<string>>();  // file → client scripts that depend on it
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Public API ───────────────────────────────────────

/**
 * Initialize hot reload watcher. Call once at server startup.
 * No-op in production.
 */
export function startHotReload(): void {
    if (!isDev || _watcher) return;
    console.log('[tradjs HMR] Hot reload enabled');
}

/**
 * Register a client script and watch its dependency tree.
 * Called whenever a client script is built.
 */
export function addClientScript(clientPath: string, deps: string[] = []): void {
    if (!isDev) return;

    const allFiles = [clientPath, ...deps];
    for (const filePath of allFiles) {
        const absPath = path.resolve(filePath);
        // Track which client scripts depend on this file
        if (!_fileToScripts.has(absPath)) {
            _fileToScripts.set(absPath, new Set());
        }
        _fileToScripts.get(absPath)!.add(clientPath);

        // Watch the directory containing this file
        const dir = path.dirname(absPath);
        if (!_watchedDirs.has(dir)) {
            _watchedDirs.add(dir);
            try {
                const watcher = watch(dir, { recursive: false }, (_event, filename) => {
                    if (!filename) return;
                    const changedPath = path.join(dir, filename);
                    // Only trigger for watched files
                    if (_fileToScripts.has(changedPath)) {
                        _onFileChanged(changedPath);
                    }
                });
                // Keep reference to prevent GC
                if (!_watcher) _watcher = watcher;
            } catch (e) {
                // Directory might not exist or be inaccessible
            }
        }
    }
}

/**
 * Get the dependency file paths from a built client script.
 * Uses Bun.Transpiler to extract imports and resolve them.
 */
export function getClientDeps(clientPath: string): string[] {
    const deps: string[] = [];
    const visited = new Set<string>();

    function walk(filePath: string) {
        const abs = path.resolve(filePath);
        if (visited.has(abs)) return;
        visited.add(abs);

        if (!existsSync(abs)) return;

        try {
            const content = readFileSync(abs, 'utf-8');
            const ext = path.extname(abs);
            const loader = ext === '.tsx' ? 'tsx' : ext === '.jsx' ? 'jsx' : ext === '.ts' ? 'ts' : 'js';
            const transpiler = new Bun.Transpiler({ loader });
            const imports = transpiler.scanImports(content);

            for (const imp of imports) {
                const specifier = imp.path;
                // Only follow relative imports (local files)
                if (!specifier.startsWith('.') && !specifier.startsWith('/')) continue;

                const baseDir = path.dirname(abs);
                const candidates = [
                    specifier,
                    specifier + '.ts',
                    specifier + '.tsx',
                    specifier + '.js',
                    specifier + '.jsx',
                    specifier + '/index.ts',
                    specifier + '/index.tsx',
                ];

                for (const candidate of candidates) {
                    const resolved = path.resolve(baseDir, candidate);
                    if (existsSync(resolved) && statSync(resolved).isFile()) {
                        deps.push(resolved);
                        walk(resolved);
                        break;
                    }
                }
            }
        } catch {
            // Transpile/scan failure — skip
        }
    }

    walk(clientPath);
    return deps;
}

/**
 * Returns the client-side HMR script that connects to the SSE endpoint.
 * Injected into HTML responses in dev mode only.
 */
export function getHotReloadScript(): string {
    if (!isDev) return '';

    return `<script>
(function() {
    var es;
    function connect() {
        es = new EventSource('/__melina_hmr');
        es.onmessage = function(e) {
            if (e.data === 'reload') {
                console.log('[tradjs HMR] Reloading...');
                window.location.reload();
            }
        };
        es.onerror = function() {
            es.close();
            setTimeout(connect, 2000);
        };
    }
    connect();
})();
</script>`;
}

/**
 * Handle the /__melina_hmr SSE endpoint.
 * Returns a streaming Response that sends 'reload' events.
 */
export function handleHotReloadSSE(): Response {
    const stream = new ReadableStream({
        start(controller) {
            _sseClients.add(controller);
            // Send initial connection event
            controller.enqueue(new TextEncoder().encode('data: connected\n\n'));
        },
        cancel() {
            // Client disconnected — will be cleaned up
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

// ── Internal ─────────────────────────────────────────

function _onFileChanged(filePath: string) {
    // Debounce: many editors write multiple times on save
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
        const scripts = _fileToScripts.get(filePath);
        const scriptNames = scripts ? [...scripts].map(s => path.basename(s)).join(', ') : path.basename(filePath);
        console.log(`[tradjs HMR] Change detected: ${path.basename(filePath)} → rebuilding ${scriptNames}`);

        // Notify all connected browsers
        const message = new TextEncoder().encode('data: reload\n\n');
        for (const client of _sseClients) {
            try {
                client.enqueue(message);
            } catch {
                _sseClients.delete(client);
            }
        }
    }, 150);
}
