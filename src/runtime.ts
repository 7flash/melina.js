/**
 * Melina.js Client Runtime
 * 
 * Architecture:
 * - Server renders full HTML (React SSR or Melina's renderToString)
 * - Each page can have a client.tsx that exports a mount function
 * - mount() runs when page loads, returns an unmount function
 * - unmount() runs when navigating away
 * - JSX in client.tsx creates real DOM elements (not React)
 * 
 * Navigation:
 * - On link click, fetch new full page from server
 * - Inside view transition (screen frozen):
 *   1. Detach persistent elements (data-melina-persist)
 *   2. Replace body with fresh server HTML
 *   3. Transplant live DOM back using moveBefore
 * - Layout client scripts persist — their DOM is physically preserved
 * - Page client scripts unmount → mount on each navigation
 */

// Current page's unmount function
let currentUnmount: (() => void) | null = null;

// Layout client scripts (persist across navigations)
const layoutUnmounts: (() => void)[] = [];
const loadedLayoutClients = new Set<string>();

// Whether layouts have been mounted at least once
let layoutsInitialized = false;

// ============================================================================
// PERSISTENT ELEMENT TRANSPLANT
// ============================================================================

/**
 * Collect all elements marked for persistence.
 * These are live DOM nodes whose event listeners and state survive navigation.
 */
function collectPersistentElements(): Map<string, Element> {
    const elements = new Map<string, Element>();
    document.querySelectorAll('[data-melina-persist]').forEach(el => {
        const key = el.getAttribute('data-melina-persist')!;
        elements.set(key, el);
    });
    return elements;
}

/**
 * After full body swap, transplant live DOM nodes back into position,
 * replacing server-rendered placeholders with the preserved elements.
 * Uses moveBefore when available (preserves iframe/animation state),
 * falls back to replaceWith.
 */
function transplantPersistentElements(elements: Map<string, Element>): void {
    elements.forEach((liveEl, key) => {
        const placeholder = document.querySelector(`[data-melina-persist="${key}"]`);
        if (placeholder && placeholder.parentNode) {
            if (typeof (placeholder.parentNode as any).moveBefore === 'function') {
                // moveBefore preserves all element state
                (placeholder.parentNode as any).moveBefore(liveEl, placeholder);
                placeholder.remove();
            } else {
                // Fallback: replaceWith (preserves most state)
                placeholder.replaceWith(liveEl);
            }
        }
    });
}

// ============================================================================
// PAGE LIFECYCLE
// ============================================================================

async function mountPage(layoutPersisted = false) {
    // Unmount previous page's client script
    if (currentUnmount) {
        try { currentUnmount(); } catch (e) { console.error('[Melina] Unmount error:', e); }
        currentUnmount = null;
    }

    // Get page metadata
    const metaEl = document.getElementById('__MELINA_META__');
    if (!metaEl) return;

    let meta: { client?: string; layoutClients?: string[] } = {};
    try {
        meta = JSON.parse(metaEl.textContent || '{}');
    } catch {
        return;
    }

    // Load layout client scripts
    // If layout was persisted via moveBefore, skip — DOM and listeners are still alive.
    // Otherwise (first load or no persistent elements), mount fresh.
    if (meta.layoutClients) {
        if (layoutPersisted && layoutsInitialized) {
            // Layout DOM transplanted — XState, listeners, state all persist
        } else {
            // First load or full body swap without persistence — mount layout scripts
            if (layoutUnmounts.length > 0) {
                for (const unmount of layoutUnmounts) {
                    try { unmount(); } catch (e) { /* DOM already gone, safe to ignore */ }
                }
                layoutUnmounts.length = 0;
            }
            loadedLayoutClients.clear();

            for (const scriptPath of meta.layoutClients) {
                if (loadedLayoutClients.has(scriptPath)) continue;
                loadedLayoutClients.add(scriptPath);

                try {
                    const module = await import(/* @vite-ignore */ scriptPath);
                    const mount = module.default || module.mount;

                    if (typeof mount === 'function') {
                        const unmount = mount();
                        if (typeof unmount === 'function') {
                            layoutUnmounts.push(unmount);
                        }
                        console.log('[Melina] Layout client mounted');
                    }
                } catch (e) {
                    console.error('[Melina] Layout client mount failed:', e);
                }
            }

            layoutsInitialized = true;
        }
    }

    // Load and execute page client script
    if (meta.client) {
        try {
            const module = await import(/* @vite-ignore */ meta.client);
            const mount = module.default || module.mount;

            if (typeof mount === 'function') {
                const unmount = mount();
                if (typeof unmount === 'function') {
                    currentUnmount = unmount;
                }
                console.log('[Melina] Page mounted');
            }
        } catch (e) {
            console.error('[Melina] Client mount failed:', e);
        }
    }
}

// ============================================================================
// NAVIGATION
// ============================================================================

async function navigate(href: string) {
    const fromPath = window.location.pathname;
    const toPath = new URL(href, window.location.origin).pathname;

    if (fromPath === toPath) return;

    window.history.pushState({}, '', href);

    try {
        const response = await fetch(href, {
            headers: { 'X-Melina-Nav': '1' }
        });
        const htmlText = await response.text();
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(htmlText, 'text/html');

        // Collect persistent elements BEFORE DOM swap
        const persisted = collectPersistentElements();

        const updateDOM = () => {
            document.title = newDoc.title;

            // Full body replacement — fresh server HTML
            document.body.innerHTML = newDoc.body.innerHTML;

            // Transplant live DOM back into position
            // Inside view transition, screen is frozen — user sees nothing
            if (persisted.size > 0) {
                transplantPersistentElements(persisted);
            }

            window.scrollTo(0, 0);
        };

        if (document.startViewTransition) {
            const transition = document.startViewTransition(() => updateDOM());
            transition.finished.then(() => {
                mountPage(persisted.size > 0);
                window.dispatchEvent(new CustomEvent('melina:navigated'));
            });
        } else {
            updateDOM();
            mountPage(persisted.size > 0);
            window.dispatchEvent(new CustomEvent('melina:navigated'));
        }

    } catch (error) {
        console.error('[Melina] Navigation failed:', error);
        window.location.href = href;
    }
}

(window as any).melinaNavigate = navigate;

// ============================================================================
// LINK INTERCEPTION
// ============================================================================

function initializeLinkInterception() {
    document.addEventListener('click', (e) => {
        const link = (e.target as Element).closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');

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

    window.addEventListener('popstate', () => {
        const href = window.location.pathname + window.location.search;

        fetch(href, { headers: { 'X-Melina-Nav': '1' } })
            .then(res => res.text())
            .then(htmlText => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(htmlText, 'text/html');

                const persisted = collectPersistentElements();

                const updateDOM = () => {
                    document.title = newDoc.title;
                    document.body.innerHTML = newDoc.body.innerHTML;

                    if (persisted.size > 0) {
                        transplantPersistentElements(persisted);
                    }
                };

                if (document.startViewTransition) {
                    document.startViewTransition(() => updateDOM()).finished.then(() => {
                        mountPage(persisted.size > 0);
                        window.dispatchEvent(new CustomEvent('melina:navigated'));
                    });
                } else {
                    updateDOM();
                    mountPage(persisted.size > 0);
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
    initializeLinkInterception();
    await mountPage();
    console.log('[Melina] Runtime ready');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

export { navigate, mountPage };
