/**
 * Root Layout - Server Component
 * 
 * Renders the page shell. The messenger widget HTML is included here
 * so it's server-rendered. Interactivity comes from layout.client.tsx.
 */
import React from 'react';

// Initial contacts data (shared with layout.client.tsx)
const contacts = [
    { id: 1, name: 'Emma Watson', avatar: 'EW', status: 'online', lastMessage: 'Hey! Did you see the new update?', lastMessageTime: 'now', unread: 2 },
    { id: 2, name: 'Liam Chen', avatar: 'LC', status: 'online', lastMessage: 'The demo is looking great 👍', lastMessageTime: '2m', unread: 0 },
    { id: 3, name: 'Sophia Kim', avatar: 'SK', status: 'away', lastMessage: 'Can we hop on a call later?', lastMessageTime: '15m', unread: 1 },
    { id: 4, name: 'Noah Williams', avatar: 'NW', status: 'online', lastMessage: 'Shipped the fix!', lastMessageTime: '32m', unread: 0 },
    { id: 5, name: 'Olivia Brown', avatar: 'OB', status: 'offline', lastMessage: 'Thanks for your help!', lastMessageTime: '1h', unread: 0 },
    { id: 6, name: 'Mason Davis', avatar: 'MD', status: 'online', lastMessage: 'Check out this PR', lastMessageTime: '2h', unread: 3 },
    { id: 7, name: 'Ava Martinez', avatar: 'AM', status: 'online', lastMessage: 'The new runtime rocks!', lastMessageTime: '3h', unread: 0 },
    { id: 8, name: 'Ethan Garcia', avatar: 'EG', status: 'away', lastMessage: 'Meeting at 3?', lastMessageTime: '5h', unread: 0 },
];

function avatarBg(status: string) {
    if (status === 'online') return 'linear-gradient(135deg, #10b981, #06b6d4)';
    if (status === 'away') return 'linear-gradient(135deg, #f59e0b, #ef4444)';
    return 'linear-gradient(135deg, #6b7280, #9ca3af)';
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const totalUnread = contacts.reduce((sum, c) => sum + c.unread, 0);

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <title>Social Feed</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <script dangerouslySetInnerHTML={{
                    __html: `
                        tailwind.config = {
                            theme: {
                                extend: {
                                    colors: {
                                        primary: '#0a0a0f',
                                        secondary: '#12121a',
                                        tertiary: '#1a1a25',
                                        hover: '#22222f',
                                        border: '#2a2a35',
                                        'border-light': '#3a3a45',
                                        accent: '#6366f1',
                                        'accent-hover': '#818cf8',
                                        success: '#10b981',
                                        warning: '#f59e0b',
                                        danger: '#ef4444',
                                        muted: '#606070',
                                    }
                                }
                            }
                        }
                    `
                }} />
            </head>
            <body>
                <div className="app-layout">
                    <div /> {/* Left spacer */}
                    <main className="main-content">
                        {children}
                    </main>
                    <div /> {/* Right spacer */}
                </div>

                {/* Messenger Widget — server-rendered shell, XState client manages content */}
                <div id="messenger" data-melina-persist="messenger" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" style={{ viewTransitionName: 'messenger' }}>
                    {/* Panel — empty flex container, client script fills via replaceChildren */}
                    <div id="messenger-panel" className="w-[380px] h-[520px] rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 bg-[#16162a] flex-col hidden" style={{ display: 'none' }}>
                        {/* SSR initial contact list for scraping by client script */}
                        <div id="messenger-list" className="messenger-list" style={{ display: 'none' }}>
                            {contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className={`messenger-item ${contact.unread > 0 ? 'unread' : ''}`}
                                    data-contact-id={contact.id}
                                    data-contact-name={contact.name}
                                    data-contact-avatar={contact.avatar}
                                    data-contact-status={contact.status}
                                >
                                    <div className="messenger-item-preview" style={{ display: 'none' }}>{contact.lastMessage}</div>
                                    <div className="messenger-item-time" style={{ display: 'none' }}>{contact.lastMessageTime}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Toggle Button */}
                    <button id="messenger-toggle" className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200 hover:scale-105 active:scale-95 relative group">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-110 transition-transform">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {totalUnread > 0 && (
                            <span id="messenger-badge" className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center px-1 shadow-lg">{totalUnread}</span>
                        )}
                    </button>
                </div>
            </body>
        </html>
    );
}
