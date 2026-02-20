export default function mount() {
    function updateActiveNav() {
        const path = window.location.pathname;
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = (link as HTMLAnchorElement).getAttribute('data-nav-href') || '';
            const isActive = href === '/' ? path === '/' : path.startsWith(href);
            link.classList.toggle('active', isActive);
        });
    }

    updateActiveNav();

    // Track page-level cleanups
    let pageCleanup: (() => void) | null = null;

    async function navigateTo(href: string) {
        // 1. Run page cleanup from previous mount
        if (pageCleanup) {
            try { pageCleanup(); } catch { }
            pageCleanup = null;
        }

        // Also clean framework-level page cleanups
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

        // 3. Swap only the content area
        const newContent = doc.getElementById('melina-page-content');
        const current = document.getElementById('melina-page-content');
        if (newContent && current) {
            current.innerHTML = newContent.innerHTML;
        }

        // 4. Update URL & nav
        history.pushState(null, '', href);
        updateActiveNav();

        // 5. Extract and run page client scripts from the response
        //    Look for page.client script imports in the HTML
        const scriptTags = doc.querySelectorAll('script[type="module"]');
        for (const script of scriptTags) {
            const text = script.textContent || '';
            // Match page.client imports like: import('/page.client-abc123.js')
            const match = text.match(/import\('(\/page\.client[^']+)'\)/);
            if (match) {
                try {
                    const mod = await import(match[1]);
                    if (typeof mod.default === 'function') {
                        const cleanup = mod.default({ params: (window as any).__MELINA_PARAMS__ || {} });
                        if (typeof cleanup === 'function') {
                            pageCleanup = cleanup;
                        }
                    }
                } catch (e) {
                    console.error('[Melina] Failed to mount page script:', e);
                }
            }
        }

        // 6. Update params from the response
        for (const script of scriptTags) {
            const text = script.textContent || '';
            const paramsMatch = text.match(/window\.__MELINA_PARAMS__\s*=\s*({[^}]*})/);
            if (paramsMatch) {
                try {
                    (window as any).__MELINA_PARAMS__ = JSON.parse(paramsMatch[1]);
                } catch { }
            }
        }
    }

    // SPA navigation via data-link
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('[data-link]') as HTMLAnchorElement | null;
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http')) return;

        e.preventDefault();
        if (href === window.location.pathname) return;

        const content = document.getElementById('melina-page-content');
        if (!content) return;

        // Simple crossfade on the content area only (sidebar stays)
        content.style.opacity = '0';
        content.style.transition = 'opacity 150ms ease-out';

        setTimeout(async () => {
            await navigateTo(href);
            // Fade in
            requestAnimationFrame(() => {
                content.style.opacity = '1';
                content.style.transition = 'opacity 200ms ease-in';
            });
        }, 150);
    });

    // Handle back/forward — re-navigate properly
    window.addEventListener('popstate', () => {
        navigateTo(window.location.pathname);
    });

    return () => {
        if (pageCleanup) {
            try { pageCleanup(); } catch { }
        }
    };
}
