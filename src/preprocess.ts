#!/usr/bin/env bun
/**
 * Melina.js Preprocessor
 * 
 * Preprocesses 'use client' components to add island wrappers.
 * Run this before starting the server, or use it as a preload script.
 * 
 * Usage:
 *   bun run preprocess.ts
 *   # or as preload:
 *   bun --preload ./preprocess.ts start
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const APP_DIR = path.join(process.cwd(), 'app');
const CACHE_DIR = path.join(process.cwd(), '.melina', 'transformed');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Check if file has 'use client' directive
 */
function hasUseClient(content: string): boolean {
    const first5Lines = content.split('\n').slice(0, 5).join('\n');
    return first5Lines.includes("'use client'") || first5Lines.includes('"use client"');
}

/**
 * Extract exported component names
 */
function extractExports(content: string): string[] {
    const exports: string[] = [];

    // export function Name
    for (const match of content.matchAll(/export\s+function\s+([A-Z][a-zA-Z0-9]*)/g)) {
        exports.push(match[1]);
    }

    // export const Name =
    for (const match of content.matchAll(/export\s+const\s+([A-Z][a-zA-Z0-9]*)\s*=/g)) {
        exports.push(match[1]);
    }

    // export default function Name
    for (const match of content.matchAll(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/g)) {
        exports.push(match[1]);
    }

    return [...new Set(exports)];
}

/**
 * Island helper code
 */
const ISLAND_HELPER = `
// [Melina.js] Auto-injected island wrapper
const __MELINA_IS_SERVER__ = typeof window === 'undefined';
function __melina_wrap__(Component, name) {
    if (__MELINA_IS_SERVER__) {
        const React = require('react');
        return function(props) {
            return React.createElement('div', {
                'data-melina-island': name,
                'data-props': JSON.stringify(props || {}).replace(/"/g, '&quot;'),
            }, React.createElement('div', { 
                style: { opacity: 0.7, padding: '0.5rem' } 
            }, 'Loading ' + name + '...'));
        };
    }
    return Component;
}
`;

/**
 * Transform a client component
 */
function transform(content: string, filePath: string): string {
    const exports = extractExports(content);
    if (exports.length === 0) return content;

    let transformed = content;

    // Insert helper after 'use client'
    transformed = transformed.replace(
        /(['"]use client['"];?\s*\n)/,
        `$1${ISLAND_HELPER}\n`
    );

    // Rename exports: export function X -> function X__impl
    for (const name of exports) {
        transformed = transformed.replace(
            new RegExp(`export\\s+function\\s+${name}\\b`),
            `function ${name}__impl`
        );
        transformed = transformed.replace(
            new RegExp(`export\\s+const\\s+${name}\\s*=`),
            `const ${name}__impl =`
        );
    }

    // Add wrapped exports at end
    for (const name of exports) {
        transformed += `\nexport const ${name} = __melina_wrap__(${name}__impl, '${name}');`;
    }

    // Handle default export
    const defaultMatch = content.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/);
    if (defaultMatch) {
        const name = defaultMatch[1];
        transformed = transformed.replace(
            /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/,
            `function ${name}__impl`
        );
        transformed += `\nexport default ${name};`;
    }

    return transformed;
}

/**
 * Get hash for cache key
 */
function getHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

/**
 * Process a single file
 */
function processFile(filePath: string): { transformed: boolean; outputPath: string | null } {
    const content = readFileSync(filePath, 'utf-8');

    if (!hasUseClient(content)) {
        return { transformed: false, outputPath: null };
    }

    const hash = getHash(content);
    const relativePath = path.relative(APP_DIR, filePath);
    const outputPath = path.join(CACHE_DIR, relativePath.replace(/\.(tsx?|jsx?)$/, `.${hash}.$1`));

    // Check if already cached
    if (existsSync(outputPath)) {
        return { transformed: true, outputPath };
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    // Transform and write
    const transformed = transform(content, filePath);
    writeFileSync(outputPath, transformed);

    console.log(`📦 Transformed: ${relativePath}`);

    return { transformed: true, outputPath };
}

/**
 * Recursively process directory
 */
function processDirectory(dir: string): void {
    if (!existsSync(dir)) return;

    const entries = readdirSync(dir);

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (/\.(tsx?|jsx?)$/.test(entry)) {
            processFile(fullPath);
        }
    }
}

/**
 * Main preprocessor
 */
export function preprocess(): void {
    console.log('🦊 Melina.js Preprocessor');
    console.log('Scanning for client components...\n');

    processDirectory(APP_DIR);

    console.log('\n✅ Preprocessing complete');
}

// Run if called directly
if (import.meta.main) {
    preprocess();
}

export default preprocess;
