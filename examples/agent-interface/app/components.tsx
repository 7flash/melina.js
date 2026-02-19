import type { Agent } from '../lib/agents-data';

// Icons
export const Icons = {
    Terminal: ({ className = '' }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
    ),
    Activity: ({ className = '' }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    ),
    Database: ({ className = '' }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    ),
    Shield: ({ className = '' }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    Edit: ({ className = '' }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    Check: ({ className = '' }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    ExternalLink: ({ className = '' }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    ),
};

// Utils
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

// Components
export function AgentStatusBadge({ status }: { status: Agent['status'] }) {
    const colors = {
        running: 'text-green-400 bg-green-400/10 border-green-400/20',
        idle: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
        error: 'text-red-400 bg-red-400/10 border-red-400/20',
        paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    };

    return (
        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full border flex items-center gap-1.5 w-fit', colors[status])}>
            <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', status === 'running' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-current')} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export function AgentSidebar({ agents, selectedId }: { agents: Agent[]; selectedId: string }) {
    return (
        <aside className="w-[300px] border-r border-border bg-secondary flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-white/90 flex items-center gap-2">
                    <Icons.Database className="w-5 h-5 text-accent" />
                    Agents
                    <span className="bg-white/10 text-white/60 text-xs px-1.5 py-0.5 rounded ml-auto">{agents.length}</span>
                </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {agents.map((agent) => {
                    const isSelected = agent.id === selectedId;
                    return (
                        <button
                            key={agent.id}
                            className={cn(
                                'w-full text-left px-3 py-3 rounded-lg transition-all flex items-start gap-3 group border border-transparent',
                                isSelected ? 'bg-accent/10 border-accent/20 shadow-sm' : 'hover:bg-hover active:scale-[0.98]'
                            )}
                            data-agent-id={agent.id} // Used for event delegation
                        >
                            <div className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner',
                                isSelected ? 'bg-accent text-white' : 'bg-tertiary text-muted group-hover:bg-tertiary/80'
                            )}>
                                {agent.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className={cn('font-medium truncate', isSelected ? 'text-white' : 'text-gray-300')}>{agent.name}</span>
                                    {agent.status === 'error' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                                </div>
                                <div className="text-xs text-muted truncate">{agent.description}</div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}

export function AgentDetail({ agent }: { agent: Agent }) {
    return (
        <div className="flex-1 flex flex-col h-full bg-surface overflow-hidden fade-in relative">
            <header className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {agent.avatar}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-3">
                            {agent.name}
                            <AgentStatusBadge status={agent.status} />
                        </h1>
                        <div className="text-sm text-muted flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1.5">
                                <Icons.Activity className="w-4 h-4" />
                                Active {agent.lastActive}
                            </span>
                            <a href={agent.telegramGroup} target="_blank" className="flex items-center gap-1.5 hover:text-accent transition-colors">
                                <Icons.ExternalLink className="w-4 h-4" />
                                Telegram Channel
                            </a>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-md bg-secondary border border-border text-sm font-medium hover:bg-hover transition-colors text-white">
                        Edit Config
                    </button>
                    <button className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20">
                        Run Task
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-6">
                {/* Left Column: Messages & Logs */}
                <div className="col-span-2 space-y-6">
                    {/* Chat Interface */}
                    <section className="bg-secondary rounded-xl border border-border overflow-hidden flex flex-col h-[400px]">
                        <div className="px-4 py-3 border-b border-border bg-tertiary/50">
                            <h3 className="font-semibold text-white/90 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Interaction
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
                            {agent.messages.map(msg => (
                                <div key={msg.id} className={cn('flex gap-3 max-w-[90%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0', msg.role === 'user' ? 'bg-blue-600' : 'bg-accent')}>
                                        {msg.role === 'user' ? 'U' : agent.avatar}
                                    </div>
                                    <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md',
                                        msg.role === 'user' ? 'bg-blue-600/20 text-blue-100 rounded-tr-sm' : 'bg-secondary border border-border text-gray-200 rounded-tl-sm')}>
                                        {msg.content}
                                        <div className="text-[10px] opacity-50 mt-1 text-right">{msg.timestamp}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-border bg-secondary">
                            <input type="text" placeholder="Message agent..." className="w-full bg-tertiary border border-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors" />
                        </div>
                    </section>

                    {/* Logs Terminal */}
                    <section className="bg-[#0D1117] rounded-xl border border-border overflow-hidden font-mono text-xs">
                        <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-white/5">
                            <span className="text-gray-400 flex items-center gap-2"><Icons.Terminal className="w-3.5 h-3.5" /> System Logs</span>
                            <span className="text-gray-600">tail -f</span>
                        </div>
                        <div className="p-4 space-y-1.5 h-[200px] overflow-y-auto text-gray-300">
                            {agent.logs.map(log => (
                                <div key={log.id} className="flex gap-3 hover:bg-white/5 px-1 -mx-1 rounded">
                                    <span className="text-gray-600 w-16 shrink-0">{log.timestamp}</span>
                                    <span className={cn('w-12 font-bold shrink-0 uppercase tracking-wider text-[10px] py-0.5 text-center rounded',
                                        log.level === 'info' ? 'bg-blue-500/10 text-blue-400' :
                                            log.level === 'warn' ? 'bg-yellow-500/10 text-yellow-400' :
                                                log.level === 'error' ? 'bg-red-500/10 text-red-400' : 'text-gray-400'
                                    )}>{log.level}</span>
                                    <span className="truncate">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Memory, Jobs, Code */}
                <div className="space-y-6">
                    {/* Active Jobs */}
                    <section className="bg-secondary rounded-xl border border-border p-4">
                        <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center justify-between">
                            Active Jobs
                            <span className="bg-accent/20 text-accent px-1.5 rounded text-xs">{agent.jobs.length}</span>
                        </h3>
                        <div className="space-y-3">
                            {agent.jobs.map(job => (
                                <div key={job.id} className="bg-tertiary rounded-lg p-3 border border-border/50 group hover:border-border transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-medium text-gray-200">{job.name}</span>
                                        <span className={cn('w-2 h-2 rounded-full', job.status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-gray-500')} />
                                    </div>
                                    {job.progress !== undefined && (
                                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-accent transition-all duration-500" style={{ width: `${job.progress}%` }} />
                                        </div>
                                    )}
                                    <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                                        <span>{job.status}</span>
                                        <span>{job.startedAt}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Memory Store */}
                    <section className="bg-secondary rounded-xl border border-border p-4">
                        <h3 className="text-sm font-semibold text-white/90 mb-3">Memory Store</h3>
                        <div className="space-y-2">
                            {agent.memory.slice(0, 5).map(mem => (
                                <div key={mem.id} className="flex items-center justify-between p-2 rounded bg-tertiary/50 border border-transparent hover:border-border/50 transition-colors">
                                    <span className="text-xs text-blue-300 font-mono">{mem.key}</span>
                                    <span className="text-xs text-gray-400 truncate max-w-[100px]">{mem.value}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Source Preview */}
                    <section className="bg-[#0D1117] rounded-xl border border-border overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/50 bg-white/5 text-xs text-gray-400 font-mono truncate">
                            source/{agent.name.toLowerCase()}.ts
                        </div>
                        <div className="p-3 overflow-x-auto">
                            <pre className="text-[10px] text-gray-400 font-mono leading-relaxed">
                                {agent.sourceCode.split('\n').slice(0, 15).join('\n')}
                                {'\n...'}
                            </pre>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export function AppShell({ children }: { children: any }) {
    return (
        <div id="app" className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
            {children}
        </div>
    );
}
