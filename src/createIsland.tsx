import React from 'react';

// Check if we're on the server
const isServer = typeof window === 'undefined';

// Global manifest of island chunks (populated by server)
declare global {
    interface Window {
        __MELINA_MANIFEST__?: Record<string, string>;
    }
}

/**
 * createIsland - Wrap a Client Component for automatic island hydration
 * 
 * This is the bridge between Server and Client components in MelinaJS.
 * 
 * Usage:
 * ```tsx
 * // components/Counter.tsx
 * 'use client';
 * import { createIsland } from '@ments/web';
 * 
 * function CounterImpl({ initialCount = 0 }) {
 *   const [count, setCount] = useState(initialCount);
 *   return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
 * }
 * 
 * // Export the island-wrapped version
 * export const Counter = createIsland(CounterImpl, 'Counter');
 * ```
 * 
 * On the Server:
 * - Renders: <div data-melina-island="Counter" data-props='{"initialCount":0}'>...</div>
 * 
 * On the Client:
 * - Hydrates the component with full interactivity
 */
export function createIsland<P extends object>(
    Component: React.ComponentType<P>,
    name: string
): React.FC<P> {
    // Return a wrapper component
    const IslandWrapper: React.FC<P> = (props) => {
        if (isServer) {
            // SERVER: Render the island marker
            // We also try to render the component for SEO/initial content
            let innerHtml = '';
            try {
                // Attempt to render for progressive enhancement
                // This might fail if the component uses hooks
                const ReactDOMServer = require('react-dom/server');
                innerHtml = ReactDOMServer.renderToString(
                    React.createElement(Component, props)
                );
            } catch (e) {
                // Component uses hooks - can't SSR, just show placeholder
                innerHtml = `<div class="melina-island-placeholder">Loading ${name}...</div>`;
            }

            // Return the island marker with serialized props
            const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');

            return React.createElement('div', {
                'data-melina-island': name,
                'data-props': propsJson,
                dangerouslySetInnerHTML: { __html: innerHtml }
            });
        } else {
            // CLIENT: Render the actual component
            return React.createElement(Component, props);
        }
    };

    IslandWrapper.displayName = `Island(${name})`;
    return IslandWrapper;
}

/**
 * Island component - Alternative syntax for rendering islands
 * 
 * Usage:
 * ```tsx
 * // In a Server Component
 * import { Island } from '@ments/web';
 * import { Counter } from './components/Counter';
 * 
 * export default function Page() {
 *   return <Island component={Counter} name="Counter" initialCount={5} />;
 * }
 * ```
 */
export function Island<P extends object>({
    component: Component,
    name,
    ...props
}: {
    component: React.ComponentType<P>;
    name: string;
} & P): React.ReactElement {
    const WrappedComponent = createIsland(Component, name);
    return React.createElement(WrappedComponent, props as P);
}

/**
 * ClientOnly - Render children only on the client
 * 
 * Useful for components that absolutely cannot be SSR'd
 */
export function ClientOnly({
    children,
    fallback = null
}: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}): React.ReactElement | null {
    if (isServer) {
        return fallback as React.ReactElement | null;
    }
    return children as React.ReactElement;
}
