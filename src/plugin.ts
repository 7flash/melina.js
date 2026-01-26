/**
 * Melina.js Bun Plugin
 * 
 * Automatically transforms 'use client' components to island wrappers.
 * Developers just write normal React components with 'use client' directive,
 * and the plugin handles the rest during SSR.
 * 
 * Usage in bunfig.toml or bun build:
 * ```
 * import { melinaPlugin } from '@ments/web/plugin';
 * 
 * Bun.build({
 *   plugins: [melinaPlugin()]
 * });
 * ```
 */

import { type BunPlugin } from 'bun';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Track which files are client components
const clientComponentCache = new Map<string, Set<string>>();

/**
 * Check if a file has 'use client' directive
 * Uses regex to match directive at start of line, avoiding false positives from comments
 */
function hasUseClientDirective(content: string): boolean {
    return /^['"]use client['"];?\s*$/m.test(content);
}

/**
 * Extract exported component names from a file
 */
function extractExportedComponents(content: string): string[] {
    const exports: string[] = [];

    // Match: export function ComponentName
    const funcMatches = content.matchAll(/export\s+function\s+([A-Z][a-zA-Z0-9]*)/g);
    for (const match of funcMatches) {
        exports.push(match[1]);
    }

    // Match: export const ComponentName = 
    const constMatches = content.matchAll(/export\s+const\s+([A-Z][a-zA-Z0-9]*)\s*=/g);
    for (const match of constMatches) {
        exports.push(match[1]);
    }

    // Match: export default function ComponentName
    const defaultFuncMatches = content.matchAll(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/g);
    for (const match of defaultFuncMatches) {
        exports.push(match[1]);
    }

    // Match: export { Name1, Name2 }
    const namedExportMatches = content.matchAll(/export\s+\{\s*([^}]+)\s*\}/g);
    for (const match of namedExportMatches) {
        const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
        for (const name of names) {
            if (/^[A-Z]/.test(name)) {
                exports.push(name);
            }
        }
    }

    return [...new Set(exports)];
}

/**
 * Helper script injected into client components
 */
const ISLAND_HELPER = `
// Auto-injected by Melina.js
const __melina_isServer = typeof window === 'undefined';
const __melina_island = (Component, name) => {
    if (__melina_isServer) {
        const React = require('react');
        return (props) => React.createElement('div', {
            'data-melina-island': name,
            'data-props': JSON.stringify(props).replace(/"/g, '&quot;'),
            style: { display: 'contents' }
        });
    }
    return Component;
};
`;

/**
 * Transform client component source to auto-wrap with island()
 */
function transformClientComponent(content: string, filePath: string): string {
    const components = extractExportedComponents(content);
    if (components.length === 0) return content;

    let transformed = content;

    // Insert helper after 'use client' directive
    transformed = transformed.replace(
        /(['"]use client['"];?\s*\n)/,
        `$1${ISLAND_HELPER}\n`
    );

    // Track if we handled default export
    let defaultExportName: string | null = null;

    // Check for named default export: export default function Name() {}
    const defaultMatch = content.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/);
    if (defaultMatch) {
        defaultExportName = defaultMatch[1];
        transformed = transformed.replace(
            /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/,
            `function $1__impl`
        );
        // We append the export default at the end
    }

    // Transform identifiers
    for (const name of components) {
        if (name === defaultExportName) continue;

        // export function Name() -> function Name__impl()
        transformed = transformed.replace(
            new RegExp(`export\\s+function\\s+${name}\\s*\\(`),
            `function ${name}__impl(`
        );

        // export const Name = -> const Name__impl =
        const constPattern = new RegExp(`export\\s+const\\s+${name}\\s*=`);
        if (constPattern.test(content)) {
            transformed = transformed.replace(
                constPattern,
                `const ${name}__impl =`
            );
        }
    }

    // Append wrapped exports
    for (const name of components) {
        if (name === defaultExportName) continue;
        transformed += `\nexport const ${name} = __melina_island(${name}__impl, '${name}');\n`;
    }

    // Append wrapped default export
    if (defaultExportName) {
        transformed += `\nexport default __melina_island(${defaultExportName}__impl, '${defaultExportName}');\n`;
    }

    return transformed;
}

/**
 * Attempt to resolve a file path with extensions
 */
function resolveFile(basePath: string): string | null {
    if (existsSync(basePath)) return basePath;
    const extensions = ['.tsx', '.jsx', '.ts', '.js'];
    for (const ext of extensions) {
        if (existsSync(basePath + ext)) return basePath + ext;
    }
    return null;
}

/**
 * Melina.js Bun Plugin for Server-Side Rendering
 * 
 * Transforms 'use client' components during SSR build.
 * Implements "Isolated Dual-Build":
 * 1. Bundles/Transforms Client Components
 * 2. Externalizes everything else (Shared State, Server Logic) to preserve Singletons
 */
export function melinaPlugin(): BunPlugin {
    return {
        name: 'melina-client-components',

        setup(build) {
            // -----------------------------------------------------------------------
            // 1. RESOLVE: Separate Client Components (Bundle) from Server/Shared (External)
            // -----------------------------------------------------------------------
            build.onResolve({ filter: /^\.{1,2}\// }, async (args) => {
                const fullPath = path.resolve(path.dirname(args.importer), args.path);

                // Try to resolve the actual file to check contents
                const resolvedPath = resolveFile(fullPath);

                if (resolvedPath && /\.(tsx|jsx)$/.test(resolvedPath)) {
                    // Check if it's a client component
                    try {
                        const content = await Bun.file(resolvedPath).text();
                        if (hasUseClientDirective(content)) {
                            // IT IS A CLIENT COMPONENT:
                            // Return the resolved path to bundle it inline
                            console.log(`[Melina Plugin] Bundling client component: ${resolvedPath}`);
                            return { path: resolvedPath };
                        }
                    } catch (e) {
                        // ignore error, treat as external
                    }
                }

                // IT IS SHARED/SERVER LOGIC:
                // Mark as external so the SSR artifact imports it by absolute path at runtime.
                // This preserves module identity (Singletons) across the app.
                return { external: true, path: resolvedPath || fullPath };
            });

            // -----------------------------------------------------------------------
            // 2. LOAD: Transform Client Components
            // -----------------------------------------------------------------------
            build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
                const content = readFileSync(args.path, 'utf-8');

                // Only transform client components
                if (!hasUseClientDirective(content)) {
                    return undefined;
                }

                // Cache the exports for this file
                const exports = extractExportedComponents(content);
                clientComponentCache.set(args.path, new Set(exports));

                // Transform for SSR
                const transformed = transformClientComponent(content, args.path);

                return {
                    contents: transformed,
                    loader: args.path.endsWith('.tsx') ? 'tsx' : 'jsx',
                };
            });
        },
    };
}

/**
 * Melina.js Runtime Plugin for dynamic imports
 * 
 * Use this when you need to dynamically import client components
 * and have them auto-wrapped.
 */
export function melinaRuntimePlugin(): BunPlugin {
    return {
        name: 'melina-runtime',

        setup(build) {
            // Intercept imports of client components at runtime
            build.onResolve({ filter: /^@client\// }, (args) => {
                // Resolve @client/ComponentName to the actual file
                const componentPath = args.path.replace('@client/', '');
                return {
                    path: path.resolve(process.cwd(), 'app/components', componentPath + '.tsx'),
                    namespace: 'melina-client',
                };
            });

            build.onLoad({ filter: /.*/, namespace: 'melina-client' }, async (args) => {
                const content = readFileSync(args.path, 'utf-8');
                const transformed = transformClientComponent(content, args.path);

                return {
                    contents: transformed,
                    loader: 'tsx',
                };
            });
        },
    };
}

/**
 * Get registered client components
 */
export function getClientComponents(): Map<string, Set<string>> {
    return clientComponentCache;
}

/**
 * Check if a file is a registered client component
 */
export function isClientComponent(filePath: string): boolean {
    return clientComponentCache.has(filePath);
}

export default melinaPlugin;
