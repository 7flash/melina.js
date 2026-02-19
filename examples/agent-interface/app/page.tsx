import { agents } from '../lib/agents-data';
import type { Agent, Job } from '../lib/agents-data';
import { AgentStatusBadge, Icons, cn } from './components';

export default function AgentDashboard() {
    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <header className="px-8 py-6 border-b border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Agent Dashboard</h1>
                        <p className="text-muted mt-1">Monitor and manage your autonomous agents</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {agents.filter(a => a.status === 'running').length} Active
                        </div>
                        <div className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {agents.filter(a => a.status === 'error').length} Error
                        </div>
                    </div>
                </div>
            </header>

            {/* Agent Grid */}
            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map(agent => (
                        <a
                            key={agent.id}
                            href={`/agent/${agent.id}`}
                            data-link
                            className="group block bg-secondary border border-border rounded-xl p-5 hover:border-accent/30 hover:bg-hover transition-all hover:shadow-lg hover:shadow-accent/5 active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm border border-accent/20 shrink-0 group-hover:bg-accent/20 transition-colors">
                                    {agent.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-white truncate">{agent.name}</span>
                                        <AgentStatusBadge status={agent.status} />
                                    </div>
                                    <p className="text-xs text-muted line-clamp-2">{agent.description}</p>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center justify-between text-xs border-t border-border pt-3 mt-1">
                                <span className="text-muted flex items-center gap-1.5">
                                    <Icons.Activity className="w-3.5 h-3.5" />
                                    {agent.lastActive}
                                </span>
                                <span className="text-muted flex items-center gap-1.5">
                                    <Icons.Terminal className="w-3.5 h-3.5" />
                                    {agent.jobs.length} job{agent.jobs.length !== 1 && 's'}
                                </span>
                                <span className="text-muted flex items-center gap-1.5">
                                    <Icons.Database className="w-3.5 h-3.5" />
                                    {agent.memory.length} keys
                                </span>
                            </div>

                            {/* Active Jobs Preview */}
                            {agent.jobs.filter(j => j.status === 'running').length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {agent.jobs.filter(j => j.status === 'running').slice(0, 2).map(job => (
                                        <div key={job.id} className="bg-background/50 rounded-lg px-3 py-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-300 truncate">{job.name}</span>
                                                <span className="text-xs text-accent font-medium">{job.progress}%</span>
                                            </div>
                                            <div className="w-full bg-border rounded-full h-1">
                                                <div
                                                    className="bg-accent rounded-full h-1 transition-all"
                                                    style={{ width: `${job.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
