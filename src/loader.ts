/**
 * Melina.js Client Component Loader
 * 
 * Transforms 'use client' components on-the-fly during SSR.
 * Uses Bun's transpiler to inject island wrappers automatically.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Cache directory for transformed modules
const CACHE_DIR = path.join(process.cwd(), '.melina', 'cache');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Check if a file has 'use client' directive
 */
export function hasUseClientDirective(content: string): boolean {
    const firstLines = content.split('\n').slice(0, 5).join('\n');
    return firstLines.includes("'use client'") || firstLines.includes('"use client"');
}

/**
 * Extract exported component names from a file
 */
export function extractExportedComponents(content: string): string[] {
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

    return [...new Set(exports)];
}

/**
 * The island helper code that gets injected
 */
const ISLAND_HELPER = `
// Auto-injected by Melina.js
const __melina_isServer = typeof window === 'undefined';
function __melina_island(Component, name) {
    if (__melina_isServer) {
        const React = require('react');
        return function IslandWrapper(props) {
            return React.createElement('div', {
                'data-melina-island': name,
                'data-props': JSON.stringify(props || {}).replace(/"/g, '&quot;'),
            }, React.createElement('div', { 
                className: 'island-loading',
                style: { opacity: 0.7, padding: '0.5rem' } 
            }, 'Loading ' + name + '...'));
        };
    }
    return Component;
}
`;

/**
 * Transform a client component for SSR
 */
export function transformClientComponent(content: string, filePath: string): string {
    if (!hasUseClientDirective(content)) {
        return content;
    }

    const components = extractExportedComponents(content);
    if (components.length === 0) {
        return content;
    }

    let transformed = content;

    // Insert island helper after 'use client' directive
    transformed = transformed.replace(
        /(['"]use client['"];?\s*\n)/,
        `$1${ISLAND_HELPER}\n`
    );

    // Transform each exported function
    for (const name of components) {
        // export function Name() -> function Name__impl()
        transformed = transformed.replace(
            new RegExp(`export\\s+function\\s+${name}\\s*\\(`),
            `function ${name}__impl(`
        );

        // export const Name = -> const Name__impl = 
        transformed = transformed.replace(
            new RegExp(`export\\s+const\\s+${name}\\s*=`),
            `const ${name}__impl =`
        );
    }

    // Add wrapped exports at the end
    for (const name of components) {
        transformed += `\nexport const ${name} = __melina_island(${name}__impl, '${name}');`;
    }

    // Handle default export
    const defaultMatch = content.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/);
    if (defaultMatch) {
        const name = defaultMatch[1];
        transformed = transformed.replace(
            /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/,
            `function ${name}__impl`
        );
        // Don't duplicate if already added above
        if (!components.includes(name)) {
            transformed += `\nexport const ${name} = __melina_island(${name}__impl, '${name}');`;
        }
        transformed += `\nexport default ${name};`;
    } else if (content.includes('export default')) {
        // export default SomeComponent - add wrapper
        const simpleDefaultMatch = content.match(/export\s+default\s+([A-Z][a-zA-Z0-9]*)\s*;?$/m);
        if (simpleDefaultMatch) {
            const name = simpleDefaultMatch[1];
            transformed = transformed.replace(
                /export\s+default\s+([A-Z][a-zA-Z0-9]*)\s*;?$/m,
                `export default __melina_island(${name}__impl, '${name}');`
            );
        }
    }

    return transformed;
}

/**
 * Get cache key for a file
 */
function getCacheKey(filePath: string, content: string): string {
    return createHash('sha256')
        .update(filePath)
        .update(content)
        .digest('hex')
        .slice(0, 16);
}

/**
 * Load a module with client component transformation
 * 
 * This is the main entry point for loading components during SSR.
 * It will transform 'use client' components automatically.
 */
export async function loadWithTransform(filePath: string): Promise<any> {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    const content = readFileSync(absolutePath, 'utf-8');

    // If not a client component, import normally
    if (!hasUseClientDirective(content)) {
        return import(absolutePath);
    }

    // Transform and cache
    const cacheKey = getCacheKey(absolutePath, content);
    const cachedPath = path.join(CACHE_DIR, `${cacheKey}.tsx`);

    if (!existsSync(cachedPath)) {
        const transformed = transformClientComponent(content, absolutePath);
        writeFileSync(cachedPath, transformed);
    }

    return import(cachedPath);
}

/**
 * Scan a directory for client components and return their names
 */
export function scanClientComponents(dir: string): Map<string, string[]> {
    const components = new Map<string, string[]>();

    if (!existsSync(dir)) {
        return components;
    }

    const files = Bun.file(dir).exists;
    // Use readdirSync for simplicity
    const { readdirSync } = require('fs');
    const fileList = readdirSync(dir);

    for (const file of fileList) {
        if (!file.endsWith('.tsx') && !file.endsWith('.jsx')) continue;

        const filePath = path.join(dir, file);
        const content = readFileSync(filePath, 'utf-8');

        if (hasUseClientDirective(content)) {
            const exports = extractExportedComponents(content);
            components.set(filePath, exports);
        }
    }

    return components;
}

export default {
    hasUseClientDirective,
    extractExportedComponents,
    transformClientComponent,
    loadWithTransform,
    scanClientComponents,
};
