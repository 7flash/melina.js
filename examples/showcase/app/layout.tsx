const navItems = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/ssr', icon: '🖥️', label: 'SSR Demo', section: 'Features' },
    { href: '/counter', icon: '🔢', label: 'Counter' },
    { href: '/xstate', icon: '🚦', label: 'XState' },
    { href: '/reconciler', icon: '⚙️', label: 'Reconciler Strategies' },
    { href: '/items/alpha', icon: '🔗', label: 'Dynamic Routes' },
    { href: '/streaming', icon: '📡', label: 'Streaming', section: 'Advanced' },
    { href: '/stress', icon: '🔥', label: 'Server Throughput' },
    { href: '/features/head', icon: '🧠', label: '<Head> Component', section: 'New Features' },
    { href: '/features/error', icon: '💥', label: 'Error Boundaries' },
    { href: '/features/middleware', icon: '🛡️', label: 'Middleware' },
    { href: '/features/scoped-css', icon: '🎨', label: 'Scoped CSS' },
    { href: '/features/ssg', icon: '⚡', label: 'SSG' },
];

export default function RootLayout({ children }: { children: any }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Melina.js Showcase</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
            </head>
            <body>
                <div className="app-shell">
                    {/* Sidebar */}
                    <aside className="sidebar">
                        <div className="sidebar-header">
                            <div className="sidebar-logo">
                                🦊 <span>Melina.js</span>
                            </div>
                            <div className="sidebar-subtitle">Feature Showcase</div>
                        </div>
                        <nav className="sidebar-nav">
                            {navItems.map((item, i) => (
                                <>
                                    {item.section && <div className="nav-section">{item.section}</div>}
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        className="nav-link"
                                        data-nav-href={item.href}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        {item.label}
                                    </a>
                                </>
                            ))}
                        </nav>

                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                            <div>v2.3.1 · Bun {typeof Bun !== 'undefined' ? Bun.version : '?'}</div>
                            <div style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', opacity: 0.6 }} id="ssr-timestamp">
                                SSR: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="main-content" id="melina-page-content">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
