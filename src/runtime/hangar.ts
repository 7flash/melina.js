/**
 * Melina.js "Hangar" Runtime
 * 
 * Single Hidden Root + Portal Registry Architecture
 * 
 * This runtime manages client-side islands using a persistent React root
 * that survives body.innerHTML replacements during navigation.
 * 
 * Key concepts:
 * - Hangar: The container appended to `<html>` (outside body), never destroyed
 * - Island Registry: Map of instanceId -> { Component, props, targetNode, storageNode }
 * - Storage Node: Persistent div that physically moves between placeholders
 * - Physical Reparenting: DOM nodes are moved, not recreated, preserving all state
 */

declare global {
    interface Window {
        __MELINA_META__?: Record<string, string>;
        melinaNavigate: (href: string) => Promise<void>;
    }
}

// ========== TYPES ==========
interface IslandEntry {
    name: string;
    Component: React.ComponentType<any>;
    props: Record<string, any>;
    targetNode: Element;
    storageNode: HTMLDivElement;
}

// ========== STATE ==========
const componentCache: Record<string, React.ComponentType<any>> = {};
const islandRegistry = new Map<string, IslandEntry>();
const registryListeners = new Set<() => void>();

function notifyRegistry() {
    registryListeners.forEach(fn => fn());
}

// ========== UTILITIES ==========
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
    if (componentCache[name]) return componentCache[name];

    const meta = getIslandMeta();
    if (!meta[name]) return null;

    try {
        const module = await import(/* @vite-ignore */ meta[name]);
        componentCache[name] = module[name] || module.default;
        return componentCache[name];
    } catch (e) {
        console.error('[Melina] Failed to load', name, e);
        return null;
    }
}

// ========== PRE-LOAD MODULES ==========
// Load all island components upfront to prevent pop-in
async function preloadModules(): Promise<void> {
    const meta = getIslandMeta();
    const names = Object.keys(meta);

    await Promise.all(names.map(name => loadComponent(name)));
    console.log('[Melina] Pre-loaded', names.length, 'island modules');
}

// ========== HYDRATE ISLANDS ==========
// Scans DOM for placeholders, registers/updates them in registry
async function hydrateIslands(): Promise<void> {
    const placeholders = document.querySelectorAll('[data-melina-island]');
    const seenIds = new Set<string>();

    for (let i = 0; i < placeholders.length; i++) {
        const el = placeholders[i] as Element;
        const name = el.getAttribute('data-melina-island');
        if (!name) continue;

        const propsStr = (el.getAttribute('data-props') || '{}').replace(/&quot;/g, '"');
        const props = JSON.parse(propsStr);
        const instanceId = el.getAttribute('data-instance') || el.getAttribute('data-island-key') || `${name}-${i}`;

        seenIds.add(instanceId);

        const existing = islandRegistry.get(instanceId);

        if (existing) {
            // Island exists - update targetNode and MOVE storageNode physically
            existing.targetNode = el;
            existing.props = props;

            // Physical Reparenting: Move the storage node to new placeholder
            el.appendChild(existing.storageNode);
            console.log('[Melina] Moved island:', instanceId);
        } else {
            // New island - load component and register
            const Component = await loadComponent(name);
            if (Component) {
                // Create persistent storage node (the "lifeboat")
                const storageNode = document.createElement('div');
                storageNode.style.display = 'contents';
                storageNode.setAttribute('data-storage', instanceId);
                el.appendChild(storageNode);

                islandRegistry.set(instanceId, {
                    name,
                    Component,
                    props,
                    targetNode: el,
                    storageNode
                });
                console.log('[Melina] Registered island:', instanceId);
            }
        }
    }

    // Garbage collection: Remove islands that no longer have placeholders
    for (const [id, item] of islandRegistry.entries()) {
        if (!seenIds.has(id)) {
            // Move to holding pen or just delete
            const holdingPen = document.getElementById('melina-holding-pen');
            if (holdingPen) {
                holdingPen.appendChild(item.storageNode);
            }
            islandRegistry.delete(id);
            console.log('[Melina] Collected island:', id);
        }
    }

    notifyRegistry();
}

// ========== SYNC ISLANDS (synchronous) ==========
// Re-scans DOM for placeholders, updates targets for existing islands
// This is SYNC so it can run inside View Transition callback
function syncIslands(): void {
    console.log('[Melina] syncIslands called, registry size:', islandRegistry.size);
    const placeholders = document.querySelectorAll('[data-melina-island]');
    console.log('[Melina] Found placeholders:', placeholders.length);

    for (let i = 0; i < placeholders.length; i++) {
        const el = placeholders[i] as Element;
        const name = el.getAttribute('data-melina-island');
        if (!name) continue;

        const propsStr = (el.getAttribute('data-props') || '{}').replace(/&quot;/g, '"');
        const props = JSON.parse(propsStr);
        const instanceId = el.getAttribute('data-instance') || el.getAttribute('data-island-key') || `${name}-${i}`;

        console.log('[Melina] Looking for island:', instanceId, 'in registry');

        const existing = islandRegistry.get(instanceId);

        if (existing) {
            // CRITICAL: Update targetNode to NEW DOM element and move storageNode
            console.log('[Melina] Found island in registry, moving storageNode');
            existing.targetNode = el;
            existing.props = props;
            el.appendChild(existing.storageNode);
            console.log('[Melina] Moved island:', instanceId, 'storageNode children:', existing.storageNode.childNodes.length);
        } else {
            console.log('[Melina] Island NOT found in registry:', instanceId);
            console.log('[Melina] Registry keys:', Array.from(islandRegistry.keys()));
        }
        // New islands are ignored here - they need async component loading
        // which happens after transition via hydrateIslands()
    }

    notifyRegistry(); // Triggers React re-render immediately
    console.log('[Melina] syncIslands complete');
}

// ========== ISLAND MANAGER COMPONENT ==========
async function initializeHangar(): Promise<void> {
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');
    const { createPortal } = await import('react-dom');

    // Pre-load all island modules first
    await preloadModules();

    // Create hangar root OUTSIDE body (survives body.innerHTML replacement)
    let hangar = document.getElementById('melina-hangar');
    if (!hangar) {
        hangar = document.createElement('div');
        hangar.id = 'melina-hangar';
        hangar.style.display = 'contents';
        document.documentElement.appendChild(hangar);
    }

    // Holding pen for garbage collected islands (temporary storage)
    let holdingPen = document.getElementById('melina-holding-pen');
    if (!holdingPen) {
        holdingPen = document.createElement('div');
        holdingPen.id = 'melina-holding-pen';
        holdingPen.style.display = 'none';
        hangar.appendChild(holdingPen);
    }

    // Root container for React
    let rootContainer = document.getElementById('melina-hangar-root');
    if (!rootContainer) {
        rootContainer = document.createElement('div');
        rootContainer.id = 'melina-hangar-root';
        rootContainer.style.display = 'contents';
        hangar.appendChild(rootContainer);
    }

    // Island Manager Component
    function IslandManager(): React.ReactNode {
        const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

        // Subscribe to registry changes
        React.useEffect(() => {
            registryListeners.add(forceUpdate);
            return () => { registryListeners.delete(forceUpdate); };
        }, []);

        // Render all registered islands as portals INTO their storageNodes
        const portals: React.ReactNode[] = [];
        islandRegistry.forEach((island, instanceId) => {
            if (island.storageNode && island.storageNode.isConnected) {
                portals.push(
                    createPortal(
                        React.createElement(island.Component, {
                            ...island.props,
                            key: instanceId
                        }),
                        island.storageNode,
                        instanceId
                    )
                );
            }
        });

        return React.createElement(React.Fragment, null, portals);
    }

    // Create single React root
    const root = ReactDOM.createRoot(rootContainer);
    root.render(React.createElement(IslandManager));

    // Initial hydration
    await hydrateIslands();

    console.log('[Melina] Hangar initialized with', islandRegistry.size, 'islands');
}

// ========== NAVIGATION ==========
async function navigate(href: string): Promise<void> {
    const fromPath = window.location.pathname;
    const toPath = new URL(href, window.location.origin).pathname;
    if (fromPath === toPath) return;

    console.log('[Melina] Navigate start:', fromPath, '->', toPath);

    // Step 1: FETCH new page content FIRST (before any transitions)
    let newDoc: Document;
    try {
        const response = await fetch(href, { headers: { 'X-Melina-Nav': '1' } });
        const htmlText = await response.text();
        const parser = new DOMParser();
        newDoc = parser.parseFromString(htmlText, 'text/html');
        console.log('[Melina] Fetched new page, body length:', newDoc.body.innerHTML.length);
    } catch (error) {
        console.error('[Melina] Fetch failed:', error);
        window.location.href = href;
        return;
    }

    // Step 2: Update URL (but DON'T dispatch navigation event yet!)
    // The event must fire INSIDE the View Transition callback so the
    // "old" snapshot captures the current state before the update
    window.history.pushState({}, '', href);

    // Step 3: SYNC update function - dispatches event INSIDE for proper animation
    const performUpdate = () => {
        // CRITICAL: Dispatch navigation-start INSIDE the View Transition callback
        // This way:
        // 1. "Old" snapshot was already taken (mini player)
        // 2. Event fires → MusicPlayer flushSync updates to expanded view
        // 3. DOM swap happens
        // 4. "New" snapshot is taken (expanded player)
        // 5. Browser animates between old and new!
        window.dispatchEvent(new CustomEvent('melina:navigation-start', {
            detail: { from: fromPath, to: toPath }
        }));

        document.title = newDoc.title;
        document.body.innerHTML = newDoc.body.innerHTML;
        console.log('[Melina] Full body swap');
        syncIslands();
        window.scrollTo(0, 0);
    };

    try {
        // Start View Transition with SYNC callback
        if (document.startViewTransition) {
            console.log('[Melina] Starting View Transition');
            const transition = document.startViewTransition(performUpdate);
            await transition.finished;
            console.log('[Melina] View Transition finished');
        } else {
            performUpdate();
        }

        // After transition, hydrate any NEW islands
        await hydrateIslands();
        console.log('[Melina] Navigation complete:', fromPath, '->', toPath);

    } catch (error) {
        console.error('[Melina] Navigation failed:', error);
        window.location.href = href;
    }
}

// Expose navigate globally
window.melinaNavigate = navigate;

// ========== LINK INTERCEPTION ==========
document.addEventListener('click', (e: MouseEvent) => {
    // Skip if already handled by another handler (e.g., Link component)
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

    if (window.location.pathname === href) {
        e.preventDefault();
        return;
    }

    e.preventDefault();
    navigate(href);
});

// ========== POPSTATE ==========
window.addEventListener('popstate', async () => {
    const href = window.location.pathname;

    // Core update logic - runs INSIDE View Transition callback
    const performUpdate = async () => {
        const response = await fetch(href, { headers: { 'X-Melina-Nav': '1' } });
        const html = await response.text();
        const newDoc = new DOMParser().parseFromString(html, 'text/html');

        document.title = newDoc.title;

        // FULL BODY REPLACEMENT
        document.body.innerHTML = newDoc.body.innerHTML;

        // SYNC: Find island placeholders, move portals
        syncIslands();
    };

    try {
        // Start View Transition - captures old state, then animates to new
        if (document.startViewTransition) {
            await document.startViewTransition(performUpdate).finished;
            await hydrateIslands();
        } else {
            await performUpdate();
            await hydrateIslands();
        }
    } catch (e) {
        console.error('[Melina] Popstate failed:', e);
        window.location.reload();
    }
});

// ========== INIT ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHangar);
} else {
    initializeHangar();
}

console.log('[Melina] Hangar Runtime loaded');

// Export for testing
export { hydrateIslands, syncIslands, navigate, islandRegistry };
