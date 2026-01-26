/**
 * Messenger Layout - No floating widget
 * 
 * This layout is used for the /messenger page and omits the floating widget
 * since the full-page messenger is the main content.
 */
import React from 'react';

export default function MessengerLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="stylesheet" href="/styles/globals.css" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                {/* No floating messenger widget here - full page is the messenger */}
                {children}
            </body>
        </html>
    );
}
