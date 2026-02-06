/**
 * Root Layout - Server Component
 * 
 * Pure server-rendered shell that wraps all pages.
 * No client components imported here — interactivity comes from page.client.tsx files
 */
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <title>Social Feed</title>
            </head>
            <body>
                <div className="app-layout">
                    <div /> {/* Left spacer */}
                    <main className="main-content">
                        {children}
                    </main>
                    <div /> {/* Right spacer */}
                </div>
            </body>
        </html>
    );
}
