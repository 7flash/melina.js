export default function mount() {
    // ─── Active nav highlighting ────────────────────────────
    function updateActiveNav() {
        const path = window.location.pathname;
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = (link as HTMLAnchorElement).getAttribute('data-nav-href') || '';
            const isActive = href === '/' ? path === '/' : path.startsWith(href);
            link.classList.toggle('active', isActive);
        });
    }

    updateActiveNav();

    // ─── SPA navigation state ───────────────────────────────
    let navigating = false;
    let pageCleanup: (() => void) | null = null;

    async function navigateTo(href: string) {
        if (navigating) return;     // prevent concurrent navigations
        navigating = true;

        try {
            // 1. Cleanup old page scripts
            if (pageCleanup) {
                try { pageCleanup(); } catch { }
                pageCleanup = null;
            }
            const cleanups = (window as any).__melinaCleanups__ as Array<{ type: string; cleanup: () => void }> | undefined;
            if (cleanups) {
                for (let i = cleanups.length - 1; i >= 0; i--) {
                    if (cleanups[i].type === 'page') {
                        try { cleanups[i].cleanup(); } catch { }
                        cleanups.splice(i, 1);
                    }
                }
            }

            // 2. Fetch new page
            const res = await fetch(href);
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 3. Swap content area only
            const newContent = doc.getElementById('melina-page-content');
            const current = document.getElementById('melina-page-content');
            if (newContent && current) {
                current.innerHTML = newContent.innerHTML;
            }

            // 4. Update URL and active nav
            if (href !== window.location.pathname) {
                history.pushState(null, '', href);
            }
            updateActiveNav();

            // 5. Extract params from response
            const scriptTags = doc.querySelectorAll('script');
            for (const script of scriptTags) {
                const text = script.textContent || '';
                const paramsMatch = text.match(/window\.__MELINA_PARAMS__\s*=\s*(\{[^}]*\})/);
                if (paramsMatch) {
                    try { (window as any).__MELINA_PARAMS__ = JSON.parse(paramsMatch[1]); } catch { }
                }
            }

            // 6. Find and mount new page client script
            const moduleScripts = doc.querySelectorAll('script[type="module"]');
            for (const script of moduleScripts) {
                const text = script.textContent || '';
                const match = text.match(/import\('(\/page\.client[^']+)'\)/);
                if (match) {
                    try {
                        // Cache-bust to ensure fresh mount execution
                        const mod = await import(match[1] + '?t=' + Date.now());
                        if (typeof mod.default === 'function') {
                            const cleanup = mod.default({ params: (window as any).__MELINA_PARAMS__ || {} });
                            if (typeof cleanup === 'function') {
                                pageCleanup = cleanup;
                            }
                        }
                    } catch (e) {
                        console.error('[Melina] Failed to mount page script:', e);
                    }
                    break;
                }
            }
        } finally {
            navigating = false;
        }
    }

    // ─── Click handler (SPA navigation) ─────────────────────
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('[data-link]') as HTMLAnchorElement | null;
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http')) return;

        e.preventDefault();
        if (href === window.location.pathname || navigating) return;

        navigateTo(href);
    });

    // ─── Back/forward navigation ────────────────────────────
    window.addEventListener('popstate', () => {
        navigateTo(window.location.pathname);
    });

    return () => {
        if (pageCleanup) {
            try { pageCleanup(); } catch { }
        }
    };
}
