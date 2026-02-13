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
 */
function hasUseClientDirective(content: string): boolean {
    const firstLines = content.split('\n').slice(0, 5).join('\n');
    return firstLines.includes("'use client'") || firstLines.includes('"use client"');
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
 * Transform client component source to auto-wrap with island()
 * 
 * Input:
 * ```
 * 'use client';
 * export function Counter() { ... }
 * ```
 * 
 * Output (for SSR):
 * ```
 * 'use client';
 * function Counter__impl() { ... }
 * export const Counter = __melina_island(Counter__impl, 'Counter');
 * ```
 */
function transformClientComponent(content: string, filePath: string): string {
    const components = extractExportedComponents(content);
    if (components.length === 0) return content;

    let transformed = content;

    // Add island helper at the top (after 'use client')
    const islandHelper = `
// Auto-injected by Melina.js
const __melina_isServer = typeof window === 'undefined';
const __melina_island = (Component, name) => {
    if (__melina_isServer) {
        const React = require('react');
        return (props) => React.createElement('div', {
            'data-melina-island': name,
            'data-props': JSON.stringify(props).replace(/"/g, '&quot;'),
        }, React.createElement('div', { style: { opacity: 0.7 } }, 'Loading ' + name + '...'));
    }
    return Component;
};
`;

    // Insert after 'use client' directive
    transformed = transformed.replace(
        /(['"]use client['"];?\s*\n)/,
        `$1${islandHelper}\n`
    );

    // Transform each export
    for (const name of components) {
        // export function Name() -> function Name__impl()
        transformed = transformed.replace(
            new RegExp(`export\\s+function\\s+${name}\\s*\\(`),
            `function ${name}__impl(`
        );

        // Add wrapped export at the end
        transformed += `\nexport const ${name} = __melina_island(${name}__impl, '${name}');\n`;

        // Handle export const Name = ...
        // This is trickier - we need to rename the const and re-export
        const constPattern = new RegExp(`export\\s+const\\s+${name}\\s*=`);
        if (constPattern.test(content)) {
            transformed = transformed.replace(
                constPattern,
                `const ${name}__impl =`
            );
        }
    }

    // Handle default export
    if (content.includes('export default')) {
        const defaultMatch = content.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/);
        if (defaultMatch) {
            const name = defaultMatch[1];
            transformed = transformed.replace(
                /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/,
                `function ${name}__impl`
            );
            transformed += `\nexport default __melina_island(${name}__impl, '${name}');\n`;
        }
    }

    return transformed;
}

/**
 * Melina.js Bun Plugin for Server-Side Rendering
 * 
 * Transforms 'use client' components during SSR build.
 */
export function melinaPlugin(): BunPlugin {
    return {
        name: 'melina-client-components',

        setup(build) {
            // Transform .tsx and .jsx files with 'use client'
            build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
                const content = readFileSync(args.path, 'utf-8');

                // Only transform client components
                if (!hasUseClientDirective(content)) {
                    return undefined; // Let Bun handle normally
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
