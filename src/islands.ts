import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * Check if a module is a Client Component (has 'use client' directive)
 */
export function isClientComponent(filePath: string): boolean {
    if (!existsSync(filePath)) return false;

    try {
        const content = readFileSync(filePath, 'utf-8');
        // Check first few lines for 'use client' directive
        const firstLines = content.split('\n').slice(0, 5).join('\n');
        return firstLines.includes("'use client'") || firstLines.includes('"use client"');
    } catch {
        return false;
    }
}

/**
 * Island metadata for client-side hydration
 */
export interface IslandMeta {
    /** Component name (export name) */
    name: string;
    /** Path to the built client chunk */
    chunkPath: string;
    /** Props to pass to the component */
    props: Record<string, any>;
}

/**
 * Registry of islands discovered during SSR
 * Maps island ID to metadata
 */
export const islandRegistry: Map<string, IslandMeta> = new Map();

let islandCounter = 0;

/**
 * Generate a unique island ID
 */
export function generateIslandId(): string {
    return `melina-island-${++islandCounter}`;
}

/**
 * Reset island registry (call at start of each request)
 */
export function resetIslandRegistry(): void {
    islandRegistry.clear();
    islandCounter = 0;
}

/**
 * Create an island marker element for SSR output
 * 
 * @param componentName - Name of the component
 * @param chunkPath - Path to the client JS bundle
 * @param props - Props to serialize
 * @param children - SSR'd HTML of the component (for progressive enhancement)
 */
export function createIslandMarker(
    componentName: string,
    chunkPath: string,
    props: Record<string, any>,
    children: string = ''
): string {
    const id = generateIslandId();
    const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');

    islandRegistry.set(id, {
        name: componentName,
        chunkPath,
        props
    });

    return `<div data-melina-island="${componentName}" data-chunk="${chunkPath}" data-props="${propsJson}" data-island-id="${id}">${children}</div>`;
}

/**
 * Generate the client manifest script tag
 * This provides the client runtime with information about all islands on the page
 */
export function generateManifestScript(): string {
    const manifest: Record<string, IslandMeta> = {};

    for (const [id, meta] of islandRegistry) {
        manifest[id] = meta;
    }

    return `<script>window.__MELINA_MANIFEST__ = ${JSON.stringify(manifest)};</script>`;
}
