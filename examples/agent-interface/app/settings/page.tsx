import { Icons } from '../components';

const settings = [
    { id: 'notifications', label: 'Notifications', desc: 'Configure alert channels and notification preferences', icon: 'activity', enabled: true },
    { id: 'auto-rollback', label: 'Auto Rollback', desc: 'Automatically rollback failed deployments', icon: 'shield', enabled: true },
    { id: 'debug-logs', label: 'Debug Logs', desc: 'Enable verbose logging for all agents', icon: 'terminal', enabled: false },
    { id: 'scheduled-scans', label: 'Scheduled Scans', desc: 'Run security scans on a recurring schedule', icon: 'shield', enabled: true },
    { id: 'auto-scaling', label: 'Auto Scaling', desc: 'Dynamically scale agent resources based on load', icon: 'activity', enabled: false },
];

export default function SettingsPage() {
    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <header className="px-8 py-6 border-b border-border">
                <div className="flex items-center gap-3 mb-1">
                    <a href="/" data-link className="text-muted hover:text-white transition-colors" id="settings-back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7-7-7 7 7 7" /></svg>
                    </a>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                </div>
                <p className="text-muted mt-1 ml-8">Configure your agent orchestration platform</p>
            </header>

            <div className="p-8 max-w-2xl">
                {/* Settings List */}
                <div className="space-y-3" id="settings-list">
                    {settings.map(setting => (
                        <div
                            key={setting.id}
                            className="bg-secondary border border-border rounded-xl p-5 flex items-center justify-between group hover:border-accent/20 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                                    {setting.icon === 'activity' && <Icons.Activity className="w-5 h-5" />}
                                    {setting.icon === 'shield' && <Icons.Shield className="w-5 h-5" />}
                                    {setting.icon === 'terminal' && <Icons.Terminal className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">{setting.label}</h3>
                                    <p className="text-xs text-muted mt-0.5">{setting.desc}</p>
                                </div>
                            </div>
                            <button
                                data-toggle={setting.id}
                                className={`w-12 h-7 rounded-full relative transition-all ${setting.enabled
                                    ? 'bg-accent shadow-sm shadow-accent/30'
                                    : 'bg-border'
                                    }`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${setting.enabled ? 'left-6' : 'left-1'
                                    }`} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Danger Zone */}
                <div className="mt-10 border border-red-500/20 rounded-xl p-6 bg-red-500/5">
                    <h3 className="font-semibold text-red-400 mb-2">Danger Zone</h3>
                    <p className="text-sm text-muted mb-4">These actions are irreversible. Proceed with caution.</p>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
                            Reset All Agents
                        </button>
                        <button className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
                            Clear All Memory
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
