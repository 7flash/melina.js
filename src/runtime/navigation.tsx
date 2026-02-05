/**
 * Melina.js Navigation Runtime
 * 
 * A React-based isomorphic navigation system implementing:
 * - HTML-to-VDOM parsing via html-react-parser
 * - useTransition for smooth navigation
 * - Layout preservation via Outlet pattern
 * - Prefetching with Intersection Observer
 * - Popstate handling for back/forward
 * - Scroll restoration
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useTransition,
    useCallback,
    useMemo,
    useRef,
    type ReactNode,
    type ReactElement,
} from 'react';
import ReactDOM from 'react-dom/client';
import parse, { domToReact, type HTMLReactParserOptions, type DOMNode, Element } from 'html-react-parser';

// =============================================================================
// TYPES
// =============================================================================

interface NavigationState {
    pathname: string;
    content: ReactNode;
    layouts: Map<string, ReactNode>;
}

interface NavigationContextValue {
    pathname: string;
    isPending: boolean;
    navigate: (href: string, options?: NavigateOptions) => Promise<void>;
    prefetch: (href: string) => void;
}

interface NavigateOptions {
    replace?: boolean;
    scroll?: boolean;
}

interface IslandEntry {
    name: string;
    Component: React.ComponentType<any>;
    props: Record<string, any>;
    element: HTMLElement;
}

// =============================================================================
// CACHES
// =============================================================================

// Prefetch cache for HTML fragments
const prefetchCache = new Map<string, string>();

// Component cache for loaded island modules
const componentCache = new Map<string, React.ComponentType<any>>();

// Island registry - tracks mounted islands
const islandRegistry = new Map<string, IslandEntry>();

// Scroll positions for restoration
const scrollPositions = new Map<string, number>();

// =============================================================================
// CONTEXT
// =============================================================================

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation(): NavigationContextValue {
    const ctx = useContext(NavigationContext);
    if (!ctx) {
        throw new Error('useNavigation must be used within NavigationProvider');
    }
    return ctx;
}

export function usePathname(): string {
    return useNavigation().pathname;
}

// =============================================================================
// ISLAND LOADING
// =============================================================================

function getIslandMeta(): Record<string, string> {
    const metaEl = document.getElementById('__MELINA_META__');
    if (!metaEl) return {};
    try {
        return JSON.parse(metaEl.textContent || '{}');
    } catch {
        return {};
    }
}

async function loadComponent(name: string): Promise<React.ComponentType<any> | null> {
    if (componentCache.has(name)) {
        return componentCache.get(name)!;
    }

    const meta = getIslandMeta();
    const url = meta[name];
    if (!url) {
        console.warn(`[Melina] No module URL for island: ${name}`);
        return null;
    }

    try {
        const module = await import(/* @vite-ignore */ url);
        const Component = module[name] || module.default;
        componentCache.set(name, Component);
        return Component;
    } catch (e) {
        console.error('[Melina] Failed to load component:', name, e);
        return null;
    }
}

// =============================================================================
// HTML-TO-VDOM PARSER
// =============================================================================

/**
 * Parse HTML string into React elements
 * Handles island hydration by replacing island placeholders with live React components
 */
async function parseHtmlToReact(html: string): Promise<ReactNode> {
    // Pre-load all island components mentioned in the HTML
    const islandMatches = html.matchAll(/data-melina-island="([^"]+)"/g);
    const islandNames = new Set<string>();
    for (const match of islandMatches) {
        islandNames.add(match[1]);
    }

    // Load all components in parallel
    await Promise.all(
        Array.from(islandNames).map(name => loadComponent(name))
    );

    // Parser options with island replacement
    const options: HTMLReactParserOptions = {
        replace: (domNode: DOMNode) => {
            if (domNode instanceof Element && domNode.attribs) {
                const islandName = domNode.attribs['data-melina-island'];

                if (islandName) {
                    const Component = componentCache.get(islandName);
                    if (!Component) {
                        // Component not loaded, render placeholder
                        return domToReact([domNode], options) as ReactElement;
                    }

                    // Parse props from data attribute
                    const propsStr = (domNode.attribs['data-props'] || '{}')
                        .replace(/&quot;/g, '"');
                    const props = JSON.parse(propsStr);
                    const instanceId = domNode.attribs['data-instance'] || islandName;

                    // Return hydrated React component wrapped in island container
                    return React.createElement(
                        'div',
                        {
                            'data-melina-island': islandName,
                            'data-instance': instanceId,
                            style: { display: 'contents' },
                            key: instanceId,
                        },
                        React.createElement(Component, { ...props, key: instanceId })
                    );
                }
            }
            return undefined; // Let parser handle normally
        },
    };

    return parse(html, options);
}

// =============================================================================
// NAVIGATION PROVIDER
// =============================================================================

interface NavigationProviderProps {
    children?: ReactNode;
    initialContent?: ReactNode;
}

export function NavigationProvider({
    children,
    initialContent
}: NavigationProviderProps): ReactElement {
    const [pathname, setPathname] = useState(() =>
        typeof window !== 'undefined' ? window.location.pathname : '/'
    );
    const [content, setContent] = useState<ReactNode>(initialContent || children);
    const [isPending, startTransition] = useTransition();

    // Prefetch function
    const prefetch = useCallback((href: string) => {
        if (prefetchCache.has(href)) return;

        // Low-priority fetch
        fetch(href, {
            headers: { 'X-Melina-Nav': '1' },
            priority: 'low' as RequestPriority,
        })
            .then(res => res.text())
            .then(html => {
                prefetchCache.set(href, html);
                console.log('[Melina] Prefetched:', href);
            })
            .catch(() => {
                // Ignore prefetch errors
            });
    }, []);

    // Navigate function
    const navigate = useCallback(async (href: string, options: NavigateOptions = {}) => {
        const { replace = false, scroll = true } = options;

        // Same page - no navigation needed
        if (href === pathname) return;

        console.log('[Melina] Navigate:', pathname, '->', href);

        // Save current scroll position
        scrollPositions.set(pathname, window.scrollY);

        // Update URL
        if (replace) {
            window.history.replaceState({}, '', href);
        } else {
            window.history.pushState({}, '', href);
        }

        // Dispatch navigation event
        window.dispatchEvent(new CustomEvent('melina:navigation-start', {
            detail: { from: pathname, to: href }
        }));

        // Check prefetch cache first
        let html = prefetchCache.get(href);

        if (!html) {
            // Fetch new page
            try {
                const response = await fetch(href, {
                    headers: { 'X-Melina-Nav': '1' }
                });
                html = await response.text();
            } catch (error) {
                console.error('[Melina] Navigation failed, falling back to hard nav');
                window.location.href = href;
                return;
            }
        }

        // Parse the response to extract body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Update title
        if (doc.title) {
            document.title = doc.title;
        }

        // Update meta script if present
        const newMeta = doc.getElementById('__MELINA_META__');
        const oldMeta = document.getElementById('__MELINA_META__');
        if (newMeta && oldMeta) {
            oldMeta.textContent = newMeta.textContent;
        }

        // Get body content
        const bodyContent = doc.body.innerHTML;

        // Parse HTML to React elements and update state within transition
        startTransition(async () => {
            try {
                const reactContent = await parseHtmlToReact(bodyContent);
                setPathname(href);
                setContent(reactContent);

                // Handle scroll
                if (scroll) {
                    // Check for hash
                    const hashIndex = href.indexOf('#');
                    if (hashIndex !== -1) {
                        const hash = href.slice(hashIndex + 1);
                        const element = document.getElementById(hash);
                        if (element) {
                            element.scrollIntoView();
                            return;
                        }
                    }
                    window.scrollTo(0, 0);
                }

                console.log('[Melina] Navigation complete');
            } catch (error) {
                console.error('[Melina] Failed to parse page:', error);
                window.location.href = href;
            }
        });
    }, [pathname, startTransition]);

    // Handle popstate (back/forward)
    useEffect(() => {
        const handlePopstate = async () => {
            const href = window.location.pathname;

            // Restore scroll position if available
            const savedScroll = scrollPositions.get(href);

            await navigate(href, { replace: true, scroll: false });

            if (savedScroll !== undefined) {
                window.scrollTo(0, savedScroll);
            }
        };

        window.addEventListener('popstate', handlePopstate);
        return () => window.removeEventListener('popstate', handlePopstate);
    }, [navigate]);

    const contextValue = useMemo(() => ({
        pathname,
        isPending,
        navigate,
        prefetch,
    }), [pathname, isPending, navigate, prefetch]);

    return React.createElement(
        NavigationContext.Provider,
        { value: contextValue },
        content
    );
}

// =============================================================================
// LINK COMPONENT
// =============================================================================

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    children?: ReactNode;
    prefetch?: boolean;
    replace?: boolean;
    scroll?: boolean;
}

export function Link({
    href,
    children,
    prefetch: shouldPrefetch = true,
    replace = false,
    scroll = true,
    onClick,
    ...rest
}: LinkProps): ReactElement {
    const { navigate, prefetch } = useNavigation();
    const prefetchedRef = useRef(false);

    // Prefetch on mount/viewport (if enabled)
    useEffect(() => {
        if (!shouldPrefetch || prefetchedRef.current) return;

        // Use Intersection Observer for viewport-based prefetching
        const link = document.querySelector(`a[href="${href}"]`);
        if (!link) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    prefetch(href);
                    prefetchedRef.current = true;
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        observer.observe(link);
        return () => observer.disconnect();
    }, [href, shouldPrefetch, prefetch]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        // Call custom onClick if provided
        onClick?.(e);

        // Skip if already handled
        if (e.defaultPrevented) return;

        // Skip for modifier keys (open in new tab, etc.)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

        // Skip for external URLs
        if (!href.startsWith('/') && !href.startsWith(window.location.origin)) return;

        e.preventDefault();
        navigate(href, { replace, scroll });
    }, [href, navigate, replace, scroll, onClick]);

    return React.createElement(
        'a',
        { href, onClick: handleClick, ...rest },
        children
    );
}

// =============================================================================
// OUTLET COMPONENT
// =============================================================================

const OutletContext = createContext<ReactNode>(null);

export function OutletProvider({
    children,
    content
}: {
    children: ReactNode;
    content: ReactNode;
}): ReactElement {
    return React.createElement(
        OutletContext.Provider,
        { value: content },
        children
    );
}

export function Outlet(): ReactElement | null {
    const content = useContext(OutletContext);
    return content as ReactElement | null;
}

// =============================================================================
// LOADING INDICATOR HOOK
// =============================================================================

export function useNavigationLoading(): boolean {
    const { isPending } = useNavigation();
    return isPending;
}

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

let root: ReactDOM.Root | null = null;

export async function initializeNavigation(): Promise<void> {
    if (typeof window === 'undefined') return;

    console.log('[Melina] Initializing React navigation runtime');

    // Find the root element
    const rootEl = document.getElementById('melina-root') || document.body;

    // Parse initial body content
    const initialContent = await parseHtmlToReact(rootEl.innerHTML);

    // Create React root and render
    root = ReactDOM.createRoot(rootEl);
    root.render(
        React.createElement(NavigationProvider, { initialContent })
    );

    // Intercept all link clicks globally (fallback for non-Link elements)
    document.addEventListener('click', (e: MouseEvent) => {
        if (e.defaultPrevented) return;

        const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
        if (!link) return;

        const href = link.getAttribute('href');
        if (
            e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 ||
            link.hasAttribute('download') || link.hasAttribute('target') ||
            link.hasAttribute('data-no-intercept') ||
            !href || !href.startsWith('/')
        ) return;

        // Let React handle it if we have a navigation context
        if (root) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('melina:navigate', { detail: { href } }));
        }
    });

    console.log('[Melina] React navigation runtime initialized');
}

// Auto-init
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        initializeNavigation();
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    NavigationContext,
    prefetchCache,
    componentCache,
    islandRegistry,
    parseHtmlToReact,
};
