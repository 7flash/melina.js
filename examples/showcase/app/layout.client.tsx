export default function mount() {
    // Highlight active nav link based on current URL
    function updateActiveNav() {
        const path = window.location.pathname;
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = (link as HTMLAnchorElement).getAttribute('data-nav-href') || '';
            const isActive = href === '/'
                ? path === '/'
                : path.startsWith(href);
            link.classList.toggle('active', isActive);
        });
    }

    updateActiveNav();

    // SPA navigation via data-link
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('[data-link]') as HTMLAnchorElement | null;
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http')) return;

        e.preventDefault();
        if (href !== window.location.pathname) {
            // Use View Transition API if available
            if (document.startViewTransition) {
                document.startViewTransition(async () => {
                    const res = await fetch(href);
                    const html = await res.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const newContent = doc.getElementById('melina-page-content');
                    const current = document.getElementById('melina-page-content');
                    if (newContent && current) {
                        current.innerHTML = newContent.innerHTML;
                    }
                    history.pushState(null, '', href);
                    updateActiveNav();
                });
            } else {
                window.location.href = href;
            }
        }
    });

    // Handle back/forward
    window.addEventListener('popstate', () => {
        window.location.reload();
    });

    return () => { };
}
