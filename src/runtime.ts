/**
 * Melina.js Client-Side Runtime
 * 
 * Single bundle that handles:
 * 1. Island Orchestrator initialization (single React root + portals)
 * 2. Client-side navigation with View Transitions
 * 3. Link interception
 * 
 * This is the ONLY client-side script needed - no per-island boilerplate.
 */

// ============================================================================
// NAVIGATION
// ============================================================================

async function navigate(href: string) {
    const fromPath = window.location.pathname;
    const toPath = new URL(href, window.location.origin).pathname;

    // Skip if same page
    if (fromPath === toPath) return;

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

        // DOM update function - runs inside View Transition callback
        const updateDOM = () => {
            // Dispatch navigation-start INSIDE transition callback
            // This lets islands update synchronously for view transition snapshot
            window.dispatchEvent(new CustomEvent('melina:navigation-start', {
                detail: { from: fromPath, to: toPath }
            }));

            // Update title
            document.title = newDoc.title;

            // PARTIAL SWAP: Only replace #melina-page-content
            // Islands container (#melina-islands) is OUTSIDE, so React root persists
            const currentContent = document.getElementById('melina-page-content');
            const newContent = newDoc.getElementById('melina-page-content');

            if (currentContent && newContent) {
                currentContent.innerHTML = newContent.innerHTML;
                console.log(`[Melina] Navigation ${fromPath} → ${toPath}`);
            } else {
                // Fallback: full body swap (but try to preserve islands container)
                const islandsContainer = document.getElementById('melina-islands');
                document.body.innerHTML = newDoc.body.innerHTML;
                if (islandsContainer) {
                    document.body.insertBefore(islandsContainer, document.body.firstChild);
                }
                console.log('[Melina] Full body swap (fallback)');
            }

            // Update island meta if present in new page
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

            // After transition completes, notify islands to re-scan
            transition.finished.then(() => {
                window.dispatchEvent(new CustomEvent('melina:navigated'));
            });
        } else {
            updateDOM();
            window.dispatchEvent(new CustomEvent('melina:navigated'));
        }

    } catch (error) {
        console.error('[Melina] Navigation failed:', error);
        // Fallback to full page load
        window.location.href = href;
    }
}

// Expose navigate globally for programmatic use
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
        // On popstate, we need to fetch and render the page for the current URL
        const href = window.location.pathname + window.location.search;

        // Don't use navigate() since history is already updated
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
                        window.dispatchEvent(new CustomEvent('melina:navigated'));
                    });
                } else {
                    updateDOM();
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
// ISLAND ORCHESTRATOR INITIALIZATION
// ============================================================================

async function initializeOrchestrator() {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');

    // Create container if it doesn't exist
    let container = document.getElementById('melina-islands');
    if (!container) {
        container = document.createElement('div');
        container.id = 'melina-islands';
        container.style.display = 'contents'; // Won't affect layout
        document.body.insertBefore(container, document.body.firstChild);
    }

    // Import and instantiate the orchestrator
    const { IslandOrchestrator } = await import('./IslandOrchestrator');

    // Create single React root
    const root = createRoot(container);
    root.render(React.createElement(IslandOrchestrator));

    console.log('[Melina] Island Orchestrator initialized');

    return root;
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

async function bootstrap() {
    // Initialize link interception first (synchronous)
    initializeLinkInterception();

    // Then initialize the Island Orchestrator (async)
    await initializeOrchestrator();

    console.log('[Melina] Runtime ready (Single Root + Portals architecture)');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

export { navigate, initializeOrchestrator };
