// Settings page client script
// Navigation handled by layout.client.tsx globally.

export default function mount() {
    // Handle toggle switches
    const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const toggle = target.closest('[data-toggle]') as HTMLElement;
        if (!toggle) return;

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
    };

    document.addEventListener('click', handler as EventListener);

    // Return cleanup so navigate() can remove this listener
    return () => {
        document.removeEventListener('click', handler as EventListener);
    };
}
