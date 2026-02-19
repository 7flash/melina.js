import { render, Link, navigate } from 'melina/client';

export default function mount() {
    // Use event delegation for all data-link anchors (Link-like navigation)
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a[data-link]') as HTMLAnchorElement;

        if (link) {
            // Allow special clicks to pass through
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

            e.preventDefault();
            const href = link.getAttribute('href');
            if (href) navigate(href);
        }
    });
}
