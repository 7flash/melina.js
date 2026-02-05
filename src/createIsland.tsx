import { createElement, renderToString, type VNode, type Component, type Child } from './client';

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
 * import { createIsland } from 'melina';
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
    ComponentImpl: Component<P>,
    name: string
): Component<P> {
    // Return a wrapper component
    const IslandWrapper: Component<P> = (props) => {
        if (isServer) {
            // SERVER: Render the island marker
            // We also try to render the component for SEO/initial content
            let innerHtml = '';
            try {
                // Attempt to render for progressive enhancement
                // Using melina/client's renderToString
                innerHtml = renderToString(
                    createElement(ComponentImpl, props)
                );
            } catch (e) {
                // Component uses hooks - can't SSR, just show placeholder
                innerHtml = `<div class="melina-island-placeholder">Loading ${name}...</div>`;
            }

            // Return the island marker with serialized props
            const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');

            return createElement('div', {
                'data-melina-island': name,
                'data-props': propsJson,
                dangerouslySetInnerHTML: { __html: innerHtml }
            });
        } else {
            // CLIENT: Render the actual component
            return createElement(ComponentImpl, props);
        }
    };

    return IslandWrapper;
}

/**
 * Island component - Alternative syntax for rendering islands
 * 
 * Usage:
 * ```tsx
 * // In a Server Component
 * import { Island } from 'melina';
 * import { Counter } from './components/Counter';
 * 
 * export default function Page() {
 *   return <Island component={Counter} name="Counter" initialCount={5} />;
 * }
 * ```
 */
export function Island<P extends object>({
    component: ComponentImpl,
    name,
    ...props
}: {
    component: Component<P>;
    name: string;
} & P): VNode {
    const WrappedComponent = createIsland(ComponentImpl, name);
    return createElement(WrappedComponent, props as P);
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
    children: Child;
    fallback?: Child;
}): VNode | null {
    if (isServer) {
        return fallback as VNode | null;
    }
    return children as VNode | null;
}
