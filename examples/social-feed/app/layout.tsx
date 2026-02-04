/**
 * Root Layout - SSR Server Component
 * 
 * This is a server-rendered component that wraps all pages.
 * Client components like Messenger are automatically island-wrapped.
 */
import React from 'react';
import Messenger from './components/Messenger';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="stylesheet" href="/styles/globals.css" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                <div className="app-layout">
                    <div /> {/* Left spacer */}
                    <main className="main-content">
                        {children}
                    </main>
                    <div /> {/* Right spacer */}
                </div>

                {/* Messenger Island - Persists across navigations */}
                <Messenger _melinaInstance="GlobalMessenger" />
            </body>
        </html>
    );
}
