/**
 * Melina.js Client Runtime
 * 
 * Architecture:
 * - Server renders full HTML (React SSR or Melina's renderToString)
 * - Each page can have a client.tsx that exports a mount function
 * - mount() runs when page loads, returns an unmount function
 * - unmount() runs when navigating away
 * - JSX in client.tsx creates real DOM elements (not React)
 */

// Current page's unmount function
let currentUnmount: (() => void) | null = null;

// Layout client scripts (persist across navigations)
const layoutUnmounts: (() => void)[] = [];
const loadedLayoutClients = new Set<string>();

// ============================================================================
// PAGE LIFECYCLE
// ============================================================================

async function mountPage() {
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
    // After client-side navigation the body DOM is swapped, destroying all
    // event listeners bound by previous layout mount. We must always
    // unmount and re-mount layout clients to reattach them to fresh DOM.
    if (meta.layoutClients) {
        // Unmount previous layout clients (their DOM/listeners are gone)
        if (layoutUnmounts.length > 0) {
            for (const unmount of layoutUnmounts) {
                try { unmount(); } catch (e) { /* DOM already gone, safe to ignore */ }
            }
            layoutUnmounts.length = 0;
            loadedLayoutClients.clear();
        }

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

        const updateDOM = () => {
            document.title = newDoc.title;

            const currentContent = document.getElementById('melina-page-content');
            const newContent = newDoc.getElementById('melina-page-content');

            if (currentContent && newContent) {
                currentContent.innerHTML = newContent.innerHTML;
            } else {
                document.body.innerHTML = newDoc.body.innerHTML;
            }

            // Update page meta
            const newMeta = newDoc.getElementById('__MELINA_META__');
            const currentMeta = document.getElementById('__MELINA_META__');
            if (newMeta && currentMeta) {
                currentMeta.textContent = newMeta.textContent;
            } else if (newMeta) {
                document.head.appendChild(newMeta.cloneNode(true));
            }

            window.scrollTo(0, 0);
        };

        if (document.startViewTransition) {
            const transition = document.startViewTransition(() => updateDOM());
            transition.finished.then(() => {
                mountPage();
                window.dispatchEvent(new CustomEvent('melina:navigated'));
            });
        } else {
            updateDOM();
            mountPage();
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

                const updateDOM = () => {
                    document.title = newDoc.title;
                    const currentContent = document.getElementById('melina-page-content');
                    const newContent = newDoc.getElementById('melina-page-content');
                    if (currentContent && newContent) {
                        currentContent.innerHTML = newContent.innerHTML;
                    }

                    const newMeta = newDoc.getElementById('__MELINA_META__');
                    const currentMeta = document.getElementById('__MELINA_META__');
                    if (newMeta && currentMeta) {
                        currentMeta.textContent = newMeta.textContent;
                    }
                };

                if (document.startViewTransition) {
                    document.startViewTransition(() => updateDOM()).finished.then(() => {
                        mountPage();
                        window.dispatchEvent(new CustomEvent('melina:navigated'));
                    });
                } else {
                    updateDOM();
                    mountPage();
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
