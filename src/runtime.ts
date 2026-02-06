/**
 * Melina.js Client-Side Runtime
 * 
 * Single root hydration:
 * 1. Server renders full page as React
 * 2. Client hydrates the page content once
 * 3. Client-side navigation with View Transitions
 * 
 * This is the ONLY client-side script needed.
 */

// ============================================================================
// PAGE HYDRATION
// ============================================================================

async function hydratePage() {
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');

    // Get page metadata
    const metaEl = document.getElementById('__MELINA_META__');
    if (!metaEl) {
        console.warn('[Melina] No page metadata found');
        return;
    }

    let meta: { page?: string; props?: Record<string, any>; bundles?: Record<string, string> } = {};
    try {
        meta = JSON.parse(metaEl.textContent || '{}');
    } catch {
        console.warn('[Melina] Invalid page metadata');
        return;
    }

    if (!meta.page || !meta.bundles?.[meta.page]) {
        console.warn('[Melina] No page component specified');
        return;
    }

    // Load the page component bundle
    const bundlePath = meta.bundles[meta.page];
    let PageComponent: React.ComponentType<any>;

    try {
        const module = await import(/* @vite-ignore */ bundlePath);
        PageComponent = module[meta.page] || module.default;
        if (!PageComponent) {
            console.error(`[Melina] No export found for page: ${meta.page}`);
            return;
        }
    } catch (e) {
        console.error(`[Melina] Failed to load page component:`, e);
        return;
    }

    // Find the page content element
    const pageContent = document.getElementById('melina-page-content');
    if (!pageContent) {
        console.warn('[Melina] No page content element found');
        return;
    }

    // Hydrate the page
    const props = meta.props || {};
    ReactDOM.hydrateRoot(pageContent, React.createElement(PageComponent, props));

    console.log(`[Melina] Page hydrated: ${meta.page}`);
}

// ============================================================================
// NAVIGATION
// ============================================================================

async function navigate(href: string) {
    const fromPath = window.location.pathname;
    const toPath = new URL(href, window.location.origin).pathname;

    if (fromPath === toPath) return;

    window.dispatchEvent(new CustomEvent('melina:navigation-start', {
        detail: { from: fromPath, to: toPath }
    }));

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

            // Update page content
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
            }

            window.scrollTo(0, 0);
        };

        if (document.startViewTransition) {
            const transition = document.startViewTransition(() => updateDOM());
            transition.finished.then(() => {
                hydratePage();
                window.dispatchEvent(new CustomEvent('melina:navigated'));
            });
        } else {
            updateDOM();
            hydratePage();
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
                        hydratePage();
                        window.dispatchEvent(new CustomEvent('melina:navigated'));
                    });
                } else {
                    updateDOM();
                    hydratePage();
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
    await hydratePage();
    console.log('[Melina] Runtime ready');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

export { navigate, hydratePage };
