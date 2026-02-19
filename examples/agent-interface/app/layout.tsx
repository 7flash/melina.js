export default function RootLayout({ children }: { children: any }) {
    return (
        <html lang="en" className="dark">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Agent Interface</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
            </head>
            <body className="bg-background text-foreground antialiased overflow-hidden">
                <div className="flex h-screen w-screen overflow-hidden">
                    {/* Persistent Navigation Rail */}
                    <nav className="w-16 bg-[#0c0c10] border-r border-border flex flex-col items-center py-4 gap-2 shrink-0">
                        {/* Logo */}
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-sm mb-4 shadow-lg shadow-accent/20">
                            M
                        </div>

                        {/* Nav Links */}
                        <a href="/" data-link data-nav="dashboard" className="nav-link w-10 h-10 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all group relative" title="Dashboard">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
                            </svg>
                            <span className="absolute left-14 bg-[#1c1c24] text-white text-xs px-2 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">Dashboard</span>
                        </a>

                        <a href="/settings" data-link data-nav="settings" className="nav-link w-10 h-10 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-white/5 transition-all group relative" title="Settings">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span className="absolute left-14 bg-[#1c1c24] text-white text-xs px-2 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">Settings</span>
                        </a>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* User Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all">
                            GW
                        </div>
                    </nav>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {children}
                    </main>
                </div>
                <div id="global-widget" className="fixed bottom-6 right-6 z-50 pointer-events-none" />
            </body>
        </html>
    );
}
