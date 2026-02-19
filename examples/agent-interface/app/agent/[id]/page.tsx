import { agents } from '../../../lib/agents-data';
import { AgentDetail, Icons } from '../../components';

export default function AgentPage({ params }: { params: { id: string } }) {
    const agent = agents.find(a => a.id === params.id) || agents[0];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Breadcrumb */}
            <div className="px-6 py-3 border-b border-border flex items-center gap-2 text-sm bg-secondary/50">
                <a href="/" data-link className="text-muted hover:text-white transition-colors flex items-center gap-1.5" id="breadcrumb-home">
                    <Icons.Database className="w-3.5 h-3.5" />
                    Dashboard
                </a>
                <span className="text-muted/50">/</span>
                <span className="text-white font-medium">{agent.name}</span>
            </div>
            {/* Agent Detail */}
            <div id="detail-root" className="flex-1 h-full overflow-hidden">
                <AgentDetail agent={agent} />
            </div>
        </div>
    );
}
