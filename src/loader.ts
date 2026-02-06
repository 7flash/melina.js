/**
 * Melina.js Component Loader
 * 
 * Handles loading React components for SSR.
 * No special transformation needed - components are rendered as-is on server,
 * then hydrated on client as a single root.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Cache directory for processed modules
const CACHE_DIR = path.join(process.cwd(), '.melina', 'cache');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Check if a file has 'use client' directive (now optional/semantic)
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
 * Strip 'use client' directive from content (it's a no-op now, just remove it)
 */
export function stripUseClientDirective(content: string): string {
    return content.replace(/['"]use client['"];?\s*\n?/, '');
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
 * Load a module, stripping 'use client' if present
 */
export async function loadWithTransform(filePath: string): Promise<any> {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    const content = readFileSync(absolutePath, 'utf-8');

    // If has 'use client', strip it before importing
    if (hasUseClientDirective(content)) {
        const cacheKey = getCacheKey(absolutePath, content);
        const cachedPath = path.join(CACHE_DIR, `${cacheKey}.tsx`);

        if (!existsSync(cachedPath)) {
            const stripped = stripUseClientDirective(content);
            writeFileSync(cachedPath, stripped);
        }

        return import(cachedPath);
    }

    // Import normally
    return import(absolutePath);
}

/**
 * Scan a directory for components
 */
export function scanComponents(dir: string): Map<string, string[]> {
    const components = new Map<string, string[]>();

    if (!existsSync(dir)) {
        return components;
    }

    const { readdirSync } = require('fs');
    const fileList = readdirSync(dir);

    for (const file of fileList) {
        if (!file.endsWith('.tsx') && !file.endsWith('.jsx')) continue;

        const filePath = path.join(dir, file);
        const content = readFileSync(filePath, 'utf-8');
        const exports = extractExportedComponents(content);

        if (exports.length > 0) {
            components.set(filePath, exports);
        }
    }

    return components;
}

export default {
    hasUseClientDirective,
    extractExportedComponents,
    stripUseClientDirective,
    loadWithTransform,
    scanComponents,
};
