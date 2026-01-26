import React from 'react';
import { Link } from '../../../src/Link';
import { SearchBar } from './components/SearchBar';
import { LayoutJobTracker } from './components/Jobs';

/**
 * Root Layout - Server Component
 * 
 * Client components (SearchBar, JobTracker) are imported directly.
 * The `island()` wrapper makes them render as island markers on the server.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Melina App</title>
                <style>{`
                    /* View Transitions API styles */
                    @view-transition {
                        navigation: auto;
                    }
                    
                    /* Default crossfade for page content */
                    ::view-transition-old(page-content),
                    ::view-transition-new(page-content) {
                        animation-duration: 200ms;
                        animation-timing-function: ease-in-out;
                    }
                    
                    /* Jobs widget morphs into expanded view */
                    ::view-transition-old(jobs-widget),
                    ::view-transition-new(jobs-widget) {
                        animation-duration: 300ms;
                        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    
                    /* Jobs title morphs */
                    ::view-transition-old(jobs-title),
                    ::view-transition-new(jobs-title) {
                        animation-duration: 300ms;
                        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    
                    /* Reduce motion for accessibility */
                    @media (prefers-reduced-motion: reduce) {
                        ::view-transition-group(*),
                        ::view-transition-old(*),
                        ::view-transition-new(*) {
                            animation: none !important;
                        }
                    }
                `}</style>
            </head>
            <body>
                <header style={{
                    borderBottom: '1px solid #e0e0e0',
                    padding: '1rem 2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🦊 Melina</span>
                        <nav style={{ display: 'flex', gap: '1rem' }}>
                            <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
                            <Link href="/about" style={{ color: 'white', textDecoration: 'none' }}>About</Link>
                            <Link href="/settings" style={{ color: 'white', textDecoration: 'none' }}>Settings</Link>
                        </nav>
                    </div>

                    {/* Just import and use - no manual markers! */}
                    <SearchBar />
                </header>

                <main id="melina-page-content" style={{ padding: '2rem' }}>
                    {children}
                </main>

                {/* 
                  LayoutJobTracker - floats, persists across navigation.
                  Automatically hides on /jobs to let page-level JobTracker take over.
                */}
                <LayoutJobTracker />

                <footer style={{
                    borderTop: '1px solid #e0e0e0',
                    padding: '1rem 2rem',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px'
                }}>
                    © 2026 Melina.js - Islands are independent React apps
                </footer>
            </body>
        </html>
    );
}
