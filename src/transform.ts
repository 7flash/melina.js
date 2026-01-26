/**
 * Melina.js Import Transformer
 * 
 * Transforms 'use client' modules on import during SSR.
 * Uses Bun's Transpiler API for fast transformation.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Cache for transformed modules
const transformCache = new Map<string, any>();
const CACHE_DIR = path.join(process.cwd(), '.melina', 'cache');

// Ensure cache dir exists
try {
    if (!existsSync(CACHE_DIR)) {
        mkdirSync(CACHE_DIR, { recursive: true });
    }
} catch (e) {
    // Ignore
}

/**
 * Island wrapper helper code
 */
const ISLAND_HELPER = `
const __MELINA_SSR__ = typeof window === 'undefined';
function __island__(Impl, name) {
    if (__MELINA_SSR__) {
        const R = require('react');
        return (p) => R.createElement('div', {
            'data-melina-island': name,
            'data-props': JSON.stringify(p||{}).replace(/"/g,'&quot;')
        });
    }
    return Impl;
}
`;

/**
 * Check for 'use client' directive
 */
export function isClientComponent(content: string): boolean {
    const lines = content.split('\n').slice(0, 5).join('\n');
    return lines.includes("'use client'") || lines.includes('"use client"');
}

/**
 * Extract component exports
 */
export function extractExports(content: string): string[] {
    const exports: string[] = [];

    for (const m of content.matchAll(/export\s+function\s+([A-Z]\w*)/g)) exports.push(m[1]);
    for (const m of content.matchAll(/export\s+const\s+([A-Z]\w*)\s*=/g)) exports.push(m[1]);
    for (const m of content.matchAll(/export\s+default\s+function\s+([A-Z]\w*)/g)) exports.push(m[1]);

    return [...new Set(exports)];
}

/**
 * Transform client component source
 */
export function transformSource(content: string): string {
    const exports = extractExports(content);
    if (exports.length === 0) return content;

    let out = content;

    // Insert helper
    out = out.replace(/(['"]use client['"];?\s*\n)/, `$1${ISLAND_HELPER}\n`);

    // Rename exports
    for (const name of exports) {
        out = out.replace(new RegExp(`export\\s+function\\s+${name}\\b`), `function ${name}$impl`);
        out = out.replace(new RegExp(`export\\s+const\\s+${name}\\s*=`), `const ${name}$impl =`);
    }

    // Add wrapped exports
    for (const name of exports) {
        out += `\nexport const ${name} = __island__(${name}$impl, '${name}');`;
    }

    // Handle default
    const defaultMatch = content.match(/export\s+default\s+function\s+([A-Z]\w*)/);
    if (defaultMatch) {
        const name = defaultMatch[1];
        out = out.replace(/export\s+default\s+function\s+([A-Z]\w*)/, `function ${name}$impl`);
        out += `\nexport default ${name};`;
    } else if (content.match(/export\s+default\s+([A-Z]\w*)\s*;?$/m)) {
        const m = content.match(/export\s+default\s+([A-Z]\w*)\s*;?$/m);
        if (m) {
            out = out.replace(/export\s+default\s+([A-Z]\w*)\s*;?$/m, `export default __island__(${m[1]}$impl, '${m[1]}');`);
        }
    }

    return out;
}

/**
 * Get cache file path
 */
function getCachePath(filePath: string, content: string): string {
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
    const basename = path.basename(filePath, path.extname(filePath));
    return path.join(CACHE_DIR, `${basename}.${hash}.mjs`);
}

/**
 * Import a client component with transformation
 */
export async function importClientComponent(filePath: string): Promise<any> {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

    // Check memory cache
    if (transformCache.has(absolutePath)) {
        return transformCache.get(absolutePath);
    }

    const content = readFileSync(absolutePath, 'utf-8');

    // If not client component, import normally
    if (!isClientComponent(content)) {
        const mod = await import(absolutePath);
        transformCache.set(absolutePath, mod);
        return mod;
    }

    // Check disk cache
    const cachePath = getCachePath(absolutePath, content);

    if (!existsSync(cachePath)) {
        // Transform and write to cache
        const transformed = transformSource(content);

        // Use Bun's transpiler to convert TSX to JS
        const transpiler = new Bun.Transpiler({
            loader: 'tsx',
            target: 'bun',
        });
        const js = transpiler.transformSync(transformed);

        writeFileSync(cachePath, js);
        console.log(`🏝️ [Melina] Transformed: ${path.basename(filePath)}`);
    }

    // Import from cache
    const mod = await import(cachePath);
    transformCache.set(absolutePath, mod);
    return mod;
}

/**
 * Clear transform cache
 */
export function clearCache(): void {
    transformCache.clear();
}

export default {
    isClientComponent,
    extractExports,
    transformSource,
    importClientComponent,
    clearCache,
};
