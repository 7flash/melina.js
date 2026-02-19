import { render } from 'melina/client';
import { createMachine, createActor, assign } from 'xstate';
import { agents } from '../lib/agents-data';
import { AgentSidebar, AgentDetail } from './components';

export default function mount() {
    const sidebarRoot = document.getElementById('sidebar-root');
    const detailRoot = document.getElementById('detail-root');

    if (!sidebarRoot || !detailRoot) return;

    // Get initial ID from URL or default
    const initialId = new URLSearchParams(window.location.search).get('agent') || agents[0].id;

    // Create machine with initial context
    const machine = createMachine({
        id: 'agentInterface',
        initial: 'idle',
        context: {
            selectedId: initialId,
        },
        states: {
            idle: {
                on: {
                    SELECT: {
                        actions: assign({
                            selectedId: ({ event }: any) => event.id
                        })
                    }
                }
            }
        }
    });

    const actor = createActor(machine);

    // Subscribe to state changes and re-render islands
    actor.subscribe((snapshot: any) => {
        const { selectedId } = snapshot.context;

        // Sync URL
        const url = new URL(window.location.href);
        if (url.searchParams.get('agent') !== selectedId) {
            url.searchParams.set('agent', selectedId);
            window.history.pushState({}, '', url);
        }

        const selectedAgent = agents.find(a => a.id === selectedId) || agents[0];

        render(<AgentSidebar agents={agents} selectedId={selectedId} />, sidebarRoot);
        render(<AgentDetail agent={selectedAgent} />, detailRoot);
    });

    actor.start();

    // Handle back/forward navigation
    window.addEventListener('popstate', () => {
        const id = new URLSearchParams(window.location.search).get('agent');
        if (id && id !== actor.getSnapshot().context.selectedId) {
            actor.send({ type: 'SELECT', id });
        }
    });

    // Event Delegation for sidebar selection
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('[data-agent-id]');

        if (btn) {
            e.preventDefault();
            const id = (btn as HTMLElement).dataset.agentId;
            if (id) {
                actor.send({ type: 'SELECT', id });
            }
        }
    });

    return () => actor.stop();
}
