/**
 * Melina.js Bun Preload
 * 
 * Register the Melina plugin before any imports.
 * This transforms 'use client' components on-the-fly.
 * 
 * Usage in bunfig.toml:
 * ```
 * preload = ["@ments/web/preload"]
 * ```
 * 
 * Or via CLI:
 * ```
 * bun --preload @ments/web/preload your-script.ts
 * ```
 */

import { plugin } from 'bun';
import { readFileSync } from 'fs';

/**
 * Island helper injected into client components
 */
const ISLAND_HELPER = `
const __MELINA_IS_SERVER__ = typeof window === 'undefined';
function __melina_wrap__(Component, name) {
    if (__MELINA_IS_SERVER__) {
        const React = require('react');
        return function(props) {
            return React.createElement('div', {
                'data-melina-island': name,
                'data-props': JSON.stringify(props || {}).replace(/"/g, '&quot;'),
            });
        };
    }
    return Component;
}
`;

/**
 * Check for 'use client' directive
 */
function hasUseClient(content: string): boolean {
    const first5 = content.split('\n').slice(0, 5).join('\n');
    return first5.includes("'use client'") || first5.includes('"use client"');
}

/**
 * Extract export names
 */
function extractExports(content: string): string[] {
    const exports: string[] = [];
    for (const m of content.matchAll(/export\s+(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/g)) {
        exports.push(m[1]);
    }
    for (const m of content.matchAll(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/g)) {
        exports.push(m[1]);
    }
    return [...new Set(exports)];
}

/**
 * Transform client component source
 */
function transform(content: string): string {
    const exports = extractExports(content);
    if (exports.length === 0) return content;

    let out = content;

    // Inject helper after 'use client'
    out = out.replace(/(['"]use client['"];?\s*\n)/, `$1${ISLAND_HELPER}\n`);

    // Rename exports
    for (const name of exports) {
        out = out.replace(new RegExp(`export\\s+function\\s+${name}\\b`), `function ${name}__impl`);
        out = out.replace(new RegExp(`export\\s+const\\s+${name}\\s*=`), `const ${name}__impl =`);
    }

    // Add wrapped exports
    for (const name of exports) {
        out += `\nexport const ${name} = __melina_wrap__(${name}__impl, '${name}');`;
    }

    // Handle default
    const defaultMatch = content.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/);
    if (defaultMatch) {
        out = out.replace(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/, `function ${defaultMatch[1]}__impl`);
        out += `\nexport default ${defaultMatch[1]};`;
    }

    return out;
}

// Register the Melina plugin
plugin({
    name: 'melina-client-transform',

    setup(build) {
        // Only transform .tsx/.jsx files in app/components
        build.onLoad({ filter: /app\/components\/.*\.(tsx|jsx)$/ }, async (args) => {
            try {
                const content = readFileSync(args.path, 'utf-8');

                if (!hasUseClient(content)) {
                    return undefined; // Let Bun handle normally
                }

                const transformed = transform(content);
                console.log(`🏝️ [Melina] Auto-wrapped: ${args.path.split('/').pop()}`);

                return {
                    contents: transformed,
                    loader: args.path.endsWith('.tsx') ? 'tsx' : 'jsx',
                };
            } catch (e) {
                console.error(`[Melina] Failed to transform ${args.path}:`, e);
                return undefined;
            }
        });
    },
});

console.log('🦊 [Melina] Client component plugin registered');
