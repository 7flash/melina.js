/**
 * Root Layout — Server Component
 *
 * Renders the page shell with header and cart icon.
 * The cart drawer is managed entirely by layout.client.tsx.
 */
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <title>Shop</title>
            </head>
            <body>
                <header className="sticky top-0 z-40 bg-primary/80 backdrop-blur-lg border-b border-border">
                    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                        <a href="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <span className="text-2xl">🛍️</span>
                            <span>Shop</span>
                        </a>
                        <nav className="flex items-center gap-6">
                            <a href="/" className="text-muted hover:text-white transition-colors text-sm font-medium">Products</a>
                            <button id="cart-toggle" className="relative p-2 rounded-lg hover:bg-hover transition-colors group">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-white transition-colors">
                                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                </svg>
                                <span id="cart-badge" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg hidden">0</span>
                            </button>
                        </nav>
                    </div>
                </header>

                <main>
                    {children}
                </main>

                {/* Cart Drawer — empty shell, client script renders content */}
                <div id="cart-overlay" className="fixed inset-0 bg-black/60 z-50 hidden" />
                <div id="cart-drawer" className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-secondary border-l border-border z-50 flex flex-col hidden">
                    <div id="cart-content" />
                </div>

                {/* Toast container */}
                <div id="toast-container" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2" />
            </body>
        </html>
    );
}
