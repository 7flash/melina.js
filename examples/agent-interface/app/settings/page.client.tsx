import { navigate } from 'melina/client';

export default function mount() {
    // Handle toggle switches
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const toggle = target.closest('[data-toggle]') as HTMLElement;
        if (toggle) {
            const dot = toggle.querySelector('div') as HTMLElement;
            const isEnabled = toggle.classList.contains('bg-accent');

            if (isEnabled) {
                toggle.classList.replace('bg-accent', 'bg-border');
                toggle.classList.remove('shadow-sm', 'shadow-accent/30');
                dot.classList.replace('left-6', 'left-1');
            } else {
                toggle.classList.replace('bg-border', 'bg-accent');
                toggle.classList.add('shadow-sm', 'shadow-accent/30');
                dot.classList.replace('left-1', 'left-6');
            }
        }
    });

    // Handle SPA navigation links
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a[data-link]') as HTMLAnchorElement;
        if (link) {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href) navigate(href);
        }
    });
}
