export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ color: '#f97316' }}>🦊 Programmatic API Demo</h1>
                    <p style={{ color: '#666' }}>This server was started with <code>bun run server.ts</code></p>
                </header>

                <main id="melina-page-content">
                    {children}
                </main>

                <footer style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '1rem', color: '#999' }}>
                    Powered by Melina.js
                </footer>
            </body>
        </html>
    );
}
