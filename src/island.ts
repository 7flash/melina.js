/**
 * Island Helper - Automatic SSR detection and island marker rendering
 * 
 * This is used internally by client components to automatically render
 * as island markers when used in Server Components.
 * 
 * Usage in a client component:
 * ```tsx
 * 'use client';
 * import { island } from '@ments/web';
 * 
 * function SearchBarImpl() {
 *   const [query, setQuery] = useState('');
 *   return <input value={query} onChange={e => setQuery(e.target.value)} />;
 * }
 * 
 * // Export the island-wrapped version
 * export const SearchBar = island(SearchBarImpl, 'SearchBar');
 * ```
 * 
 * Or simpler - just export normally and the framework detects 'use client':
 * ```tsx
 * 'use client';
 * 
 * export function SearchBar() {
 *   const [query, setQuery] = useState('');
 *   return <input value={query} onChange={e => setQuery(e.target.value)} />;
 * }
 * ```
 */

import React from 'react';

const isServer = typeof window === 'undefined';

/**
 * Wrap a component to auto-detect SSR and render island marker
 */
export function island<P extends object>(
    Component: React.ComponentType<P>,
    name: string
): React.FC<P> {
    const IslandComponent: React.FC<P> = (props) => {
        if (isServer) {
            // SERVER: Render EMPTY placeholder - the Hangar portal will fill it
            // We do NOT SSR the component because:
            // 1. It may have view-transition-name which would conflict with portal content
            // 2. The component may use client-only APIs (window.location, etc.)
            // 3. The portal will render immediately on hydration anyway
            const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');

            return React.createElement('div', {
                'data-melina-island': name,
                'data-props': propsJson,
                style: { display: 'contents' } // No layout impact
            });
            // No children - portal will fill this
        }

        // CLIENT: Render actual component
        return React.createElement(Component, props);
    };

    IslandComponent.displayName = `Island(${name})`;
    return IslandComponent;
}

// Re-export for convenience
export { island as createIsland };
