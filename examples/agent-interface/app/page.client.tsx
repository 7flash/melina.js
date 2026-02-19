import { render } from 'melina/client';
import { createMachine, createActor, assign } from 'xstate';
import { agents } from '../lib/agents-data';
import { AgentSidebar, AgentDetail } from './components';

// Define machine outside mount to avoid recreation
const machine = createMachine({
    id: 'agentInterface',
    initial: 'idle',
    context: {
        selectedId: agents[0].id,
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

export default function mount() {
    const sidebarRoot = document.getElementById('sidebar-root');
    const detailRoot = document.getElementById('detail-root');

    if (!sidebarRoot || !detailRoot) return;

    const actor = createActor(machine);

    // Subscribe to state changes and re-render islands
    actor.subscribe((snapshot: any) => {
        const { selectedId } = snapshot.context;
        const selectedAgent = agents.find(a => a.id === selectedId) || agents[0];

        render(<AgentSidebar agents={agents} selectedId={selectedId} />, sidebarRoot);
        render(<AgentDetail agent={selectedAgent} />, detailRoot);
    });

    actor.start();

    // Event Delegation for sidebar selection
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('[data-agent-id]');

        if (btn) {
            e.preventDefault(); // Prevent navigation if button is anchor (though it's button here)
            const id = (btn as HTMLElement).dataset.agentId;
            if (id) {
                actor.send({ type: 'SELECT', id });
            }
        }
    });

    return () => actor.stop();
}
