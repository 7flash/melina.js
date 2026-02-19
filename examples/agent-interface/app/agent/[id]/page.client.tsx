import { render, navigate } from 'melina/client';
import { agents } from '../../../lib/agents-data';
import { AgentDetail } from '../../components';

export default function mount({ params }: { params: { id: string } }) {
    const detailRoot = document.getElementById('detail-root');
    if (!detailRoot) return;

    // Handle breadcrumb SPA navigation
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

    // Handle tab switching within the agent detail
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabBtn = target.closest('[data-tab]') as HTMLElement;
        if (tabBtn) {
            const agent = agents.find(a => a.id === params.id) || agents[0];
            render(<AgentDetail agent={agent} />, detailRoot);
        }
    });
}
