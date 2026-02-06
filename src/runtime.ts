/**
 * Melina.js Client-Side Runtime
 * 
 * Simplified architecture:
 * 1. One React root per island (no portals needed)
 * 2. Client-side navigation with View Transitions
 * 3. Link interception
 * 
 * This is the ONLY client-side script needed - no per-island boilerplate.
 */

// ============================================================================
// TYPES
// ============================================================================

interface IslandRoot {
    name: string;
    element: HTMLElement;
    root: any; // ReactDOM root
    Component: React.ComponentType<any>;
    props: Record<string, any>;
}

// Global registry of active island roots
const islandRoots = new Map<HTMLElement, IslandRoot>();

// Component cache - shared across all islands
const componentCache: Record<string, React.ComponentType<any>> = {};

// ============================================================================
// ISLAND META
// ============================================================================

function getIslandMeta(): Record<string, string> {
    const metaEl = document.getElementById('__MELINA_META__');
    if (!metaEl) return {};
    try {
        return JSON.parse(metaEl.textContent || '{}');
    } catch {
        return {};
    }
}

// ============================================================================
// COMPONENT LOADING
// ============================================================================

async function loadComponent(name: string): Promise<React.ComponentType<any> | null> {
    // Check cache first
    if (componentCache[name]) {
        return componentCache[name];
    }

    const meta = getIslandMeta();
    const bundlePath = meta[name];

    if (!bundlePath) {
        console.warn(`[Melina] No bundle found for island: ${name}`);
        return null;
    }

    try {
        const module = await import(/* @vite-ignore */ bundlePath);
        // Try named export first, then default
        const Component = module[name] || module.default;

        if (Component) {
            componentCache[name] = Component;
            console.log(`[Melina] Loaded component: ${name}`);
            return Component;
        } else {
            console.warn(`[Melina] No export found for component: ${name}`);
            return null;
        }
    } catch (e) {
        console.error(`[Melina] Failed to load component ${name}:`, e);
        return null;
    }
}

// ============================================================================
// ISLAND HYDRATION
// ============================================================================

async function hydrateIslands() {
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');

    // Find all island placeholders
    const placeholders = document.querySelectorAll('[data-melina-island]');

    // Filter to only top-level islands (not nested inside already-hydrated islands)
    const topLevelIslands: HTMLElement[] = [];

    placeholders.forEach((el) => {
        const htmlEl = el as HTMLElement;

        // Skip if already hydrated
        if (htmlEl.hasAttribute('data-hydrated')) return;

        // Skip if nested inside another island placeholder
        let parent = htmlEl.parentElement;
        let isNested = false;
        while (parent) {
            if (parent.hasAttribute('data-melina-island')) {
                isNested = true;
                break;
            }
            parent = parent.parentElement;
        }

        if (!isNested) {
            topLevelIslands.push(htmlEl);
        }
    });

    // Hydrate each top-level island
    for (const element of topLevelIslands) {
        const name = element.getAttribute('data-melina-island');
        if (!name) continue;

        // Parse props
        const propsStr = (element.getAttribute('data-props') || '{}').replace(/&quot;/g, '"');
        let props: Record<string, any> = {};
        try {
            props = JSON.parse(propsStr);
        } catch (e) {
            console.warn(`[Melina] Invalid props for island ${name}:`, e);
        }

        // Load component
        const Component = await loadComponent(name);
        if (!Component) continue;

        // Create React root and render (we SSR placeholders only, not component content)
        const root = ReactDOM.createRoot(element);
        root.render(React.createElement(Component, props));

        // Mark as hydrated
        element.setAttribute('data-hydrated', 'true');

        // Store in registry for updates
        islandRoots.set(element, {
            name,
            element,
            root,
            Component,
            props
        });
    }

    console.log(`[Melina] Hydrated ${topLevelIslands.length} islands`);
}

// ============================================================================
// NAVIGATION
// ============================================================================

async function navigate(href: string) {
    const fromPath = window.location.pathname;
    const toPath = new URL(href, window.location.origin).pathname;

    // Skip if same page
    if (fromPath === toPath) return;

    // Dispatch navigation start event (for islands to react synchronously)
    window.dispatchEvent(new CustomEvent('melina:navigation-start', {
        detail: { from: fromPath, to: toPath }
    }));

    // Update URL immediately
    window.history.pushState({}, '', href);

    try {
        // Fetch new page HTML
        const response = await fetch(href, {
            headers: { 'X-Melina-Nav': '1' }
        });
        const htmlText = await response.text();

        // Parse new document
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(htmlText, 'text/html');

        // DOM update function
        const updateDOM = () => {
            // Update title
            document.title = newDoc.title;

            // Update page content
            const currentContent = document.getElementById('melina-page-content');
            const newContent = newDoc.getElementById('melina-page-content');

            if (currentContent && newContent) {
                currentContent.innerHTML = newContent.innerHTML;
                console.log(`[Melina] Navigation ${fromPath} → ${toPath}`);
            } else {
                // Fallback: full body swap
                document.body.innerHTML = newDoc.body.innerHTML;
                console.log('[Melina] Full body swap (fallback)');
            }

            // Update island meta
            const newMeta = newDoc.getElementById('__MELINA_META__');
            const currentMeta = document.getElementById('__MELINA_META__');
            if (newMeta && currentMeta) {
                currentMeta.textContent = newMeta.textContent;
            }

            // Scroll to top
            window.scrollTo(0, 0);
        };

        // Execute update with View Transition if available
        if (document.startViewTransition) {
            const transition = document.startViewTransition(() => {
                updateDOM();
            });

            // After transition, hydrate any new islands
            transition.finished.then(() => {
                hydrateIslands();
                window.dispatchEvent(new CustomEvent('melina:navigated'));
            });
        } else {
            updateDOM();
            hydrateIslands();
            window.dispatchEvent(new CustomEvent('melina:navigated'));
        }

    } catch (error) {
        console.error('[Melina] Navigation failed:', error);
        window.location.href = href;
    }
}

// Expose navigate globally
(window as any).melinaNavigate = navigate;

// ============================================================================
// LINK INTERCEPTION
// ============================================================================

function initializeLinkInterception() {
    document.addEventListener('click', (e) => {
        const link = (e.target as Element).closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');

        // Skip: external links, downloads, modified clicks, non-local hrefs
        if (
            e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 ||
            link.hasAttribute('download') ||
            link.hasAttribute('target') ||
            link.hasAttribute('data-no-intercept') ||
            !href || !href.startsWith('/')
        ) {
            return;
        }

        e.preventDefault();
        navigate(href);
    });

    // Handle back/forward buttons
    window.addEventListener('popstate', () => {
        const href = window.location.pathname + window.location.search;

        fetch(href, { headers: { 'X-Melina-Nav': '1' } })
            .then(res => res.text())
            .then(htmlText => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(htmlText, 'text/html');

                const updateDOM = () => {
                    window.dispatchEvent(new CustomEvent('melina:navigation-start', {
                        detail: { to: href }
                    }));

                    document.title = newDoc.title;

                    const currentContent = document.getElementById('melina-page-content');
                    const newContent = newDoc.getElementById('melina-page-content');

                    if (currentContent && newContent) {
                        currentContent.innerHTML = newContent.innerHTML;
                    }
                };

                if (document.startViewTransition) {
                    document.startViewTransition(() => updateDOM()).finished.then(() => {
                        hydrateIslands();
                        window.dispatchEvent(new CustomEvent('melina:navigated'));
                    });
                } else {
                    updateDOM();
                    hydrateIslands();
                    window.dispatchEvent(new CustomEvent('melina:navigated'));
                }
            })
            .catch(err => {
                console.error('[Melina] Popstate navigation failed:', err);
                window.location.reload();
            });
    });

    console.log('[Melina] Link interception active');
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

async function bootstrap() {
    // Initialize link interception
    initializeLinkInterception();

    // Hydrate all islands on initial page load
    await hydrateIslands();

    console.log('[Melina] Runtime ready');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

export { navigate, hydrateIslands };
