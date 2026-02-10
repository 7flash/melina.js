/**
 * Melina.js Client Runtime
 * 
 * Architecture:
 * - Server renders full HTML (React SSR or string templates)
 * - Framework auto-wraps {children} in #melina-page-content (display:contents)
 * - On navigation, only #melina-page-content innerHTML is replaced — layout DOM stays untouched
 * - Layout client scripts mount once and persist across navigations
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
// PAGE LIFECYCLE
// ============================================================================

async function mountPage(partialSwap = false) {
    // Unmount previous page's client script
    if (currentUnmount) {
        try { currentUnmount(); } catch (e) { /* ignore */ }
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
    // On partial swap: layout DOM is untouched, skip — state persists.
    // On first load or full swap: mount fresh.
    if (meta.layoutClients) {
        if (partialSwap && layoutsInitialized) {
            // Layout DOM never changed — XState, listeners, everything persists
        } else {
            // First load — mount layout scripts
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
                    }
                } catch (e) {
                    // Layout client build may have failed (missing deps etc)
                }
            }

            layoutsInitialized = true;
        }
    }

    // Load and execute page client script
    if (meta.client) {
        try {
            // Cache-bust the import so mount() runs fresh each time
            const url = meta.client + (meta.client.includes('?') ? '&' : '?') + '_t=' + Date.now();
            const module = await import(/* @vite-ignore */ url);
            const mount = module.default || module.mount;

            if (typeof mount === 'function') {
                const unmount = mount();
                if (typeof unmount === 'function') {
                    currentUnmount = unmount;
                }
            }
        } catch (e) {
            // Page client build may have failed
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

        let didPartialSwap = false;

        const updateDOM = () => {
            document.title = newDoc.title;

            // Partial swap: only replace #melina-page-content, leaving layout intact
            const currentSlot = document.getElementById('melina-page-content');
            const newSlot = newDoc.getElementById('melina-page-content');

            if (currentSlot && newSlot) {
                currentSlot.innerHTML = newSlot.innerHTML;
                didPartialSwap = true;
            } else {
                // Fallback: full body swap (no layout or different layout structure)
                document.body.innerHTML = newDoc.body.innerHTML;
            }

            // Update __MELINA_META__ for the new page
            const oldMeta = document.getElementById('__MELINA_META__');
            const newMeta = newDoc.getElementById('__MELINA_META__');
            if (oldMeta && newMeta) {
                oldMeta.textContent = newMeta.textContent;
            } else if (newMeta) {
                document.body.appendChild(newMeta.cloneNode(true));
            }

            window.scrollTo(0, 0);
        };

        if (document.startViewTransition) {
            const transition = document.startViewTransition(() => updateDOM());
            transition.finished.then(() => {
                mountPage(didPartialSwap);
                window.dispatchEvent(new CustomEvent('melina:navigated'));
            });
        } else {
            updateDOM();
            mountPage(didPartialSwap);
            window.dispatchEvent(new CustomEvent('melina:navigated'));
        }

    } catch (error) {
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

                let didPartialSwap = false;

                const updateDOM = () => {
                    document.title = newDoc.title;

                    const currentSlot = document.getElementById('melina-page-content');
                    const newSlot = newDoc.getElementById('melina-page-content');

                    if (currentSlot && newSlot) {
                        currentSlot.innerHTML = newSlot.innerHTML;
                        didPartialSwap = true;
                    } else {
                        document.body.innerHTML = newDoc.body.innerHTML;
                    }

                    const oldMeta = document.getElementById('__MELINA_META__');
                    const newMeta = newDoc.getElementById('__MELINA_META__');
                    if (oldMeta && newMeta) {
                        oldMeta.textContent = newMeta.textContent;
                    } else if (newMeta) {
                        document.body.appendChild(newMeta.cloneNode(true));
                    }
                };

                if (document.startViewTransition) {
                    document.startViewTransition(() => updateDOM()).finished.then(() => {
                        mountPage(didPartialSwap);
                        window.dispatchEvent(new CustomEvent('melina:navigated'));
                    });
                } else {
                    updateDOM();
                    mountPage(didPartialSwap);
                    window.dispatchEvent(new CustomEvent('melina:navigated'));
                }
            })
            .catch(err => {
                window.location.reload();
            });
    });
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

async function bootstrap() {
    initializeLinkInterception();
    await mountPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

export { navigate, mountPage };
