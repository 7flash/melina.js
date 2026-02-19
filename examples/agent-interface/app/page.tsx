import { agents } from '../lib/agents-data';
import { AppShell, AgentSidebar, AgentDetail } from './components';

export default function Page() {
    const selectedAgent = agents[0];
    return (
        <AppShell>
            <div id="sidebar-root" className="h-full">
                <AgentSidebar agents={agents} selectedId={selectedAgent.id} />
            </div>
            <div id="detail-root" className="flex-1 h-full overflow-hidden">
                <AgentDetail agent={selectedAgent} />
            </div>
        </AppShell>
    );
}
