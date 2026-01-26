/**
 * Client Component Registry
 * 
 * This registry stores information about client components (islands).
 * When a Server Component tries to render a Client Component, 
 * we render an island marker instead of the actual component.
 */

import React from 'react';

// Registry of client component files
const clientComponents = new Map<string, Set<string>>();

/**
 * Register a file as containing client components
 */
export function registerClientComponent(filePath: string, exportNames: string[]) {
    clientComponents.set(filePath, new Set(exportNames));
}

/**
 * Check if a file is a client component
 */
export function isClientComponent(filePath: string): boolean {
    return clientComponents.has(filePath);
}

/**
 * Create an island wrapper for a client component
 * This renders the island marker on the server
 */
export function createIslandWrapper<P extends object>(
    componentName: string,
    _OriginalComponent?: React.ComponentType<P>
): React.FC<P> {
    const IslandMarker: React.FC<P> = (props) => {
        const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');

        // Return the island marker element
        return React.createElement('div', {
            'data-melina-island': componentName,
            'data-props': propsJson,
            children: React.createElement('div', {
                style: {
                    padding: '1rem',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    opacity: 0.7
                }
            }, `Loading ${componentName}...`)
        });
    };

    IslandMarker.displayName = `Island(${componentName})`;
    return IslandMarker;
}

/**
 * Transform a client component module for server-side use
 * Replaces all exports with island wrappers
 */
export function wrapClientModule(
    originalModule: any,
    componentNames: string[]
): any {
    const wrappedModule: any = {};

    for (const name of componentNames) {
        if (originalModule[name]) {
            wrappedModule[name] = createIslandWrapper(name, originalModule[name]);
        }
    }

    // Handle default export
    if (originalModule.default) {
        const defaultName = componentNames[0] || 'Default';
        wrappedModule.default = createIslandWrapper(defaultName, originalModule.default);
    }

    return wrappedModule;
}
