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
            </head>
            <body>
                <div className="app-layout">
                    <div /> {/* Left spacer */}
                    <main className="main-content">
                        {children}
                    </main>
                    <div /> {/* Right spacer */}
                </div>

                {/* Messenger Widget — server-rendered, interactivity from layout.client.tsx */}
                <div id="messenger" className="messenger" style={{ viewTransitionName: 'messenger' }}>
                    {/* Panel (hidden by default, client script toggles) */}
                    <div id="messenger-panel" className="messenger-panel" style={{ display: 'none' }}>
                        <div className="messenger-header">
                            <span style={{ fontWeight: 600 }}>Messages</span>
                            <button id="messenger-expand-btn" className="messenger-expand-btn" title="Expand">⬈</button>
                            <button id="messenger-close-btn" className="messenger-close-btn">✕</button>
                        </div>

                        {/* Contact List */}
                        <div id="messenger-list" className="messenger-list">
                            {contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className={`messenger-item ${contact.unread > 0 ? 'unread' : ''}`}
                                    data-contact-id={contact.id}
                                    data-contact-name={contact.name}
                                    data-contact-avatar={contact.avatar}
                                    data-contact-status={contact.status}
                                >
                                    <div
                                        className="messenger-item-avatar"
                                        style={{ background: avatarBg(contact.status) }}
                                    >
                                        {contact.avatar}
                                    </div>
                                    <div className="messenger-item-content">
                                        <div className="messenger-item-name">
                                            {contact.name}
                                            {contact.unread > 0 && <span className="unread-dot" />}
                                        </div>
                                        <div className="messenger-item-preview">{contact.lastMessage}</div>
                                    </div>
                                    <div className="messenger-item-time">{contact.lastMessageTime}</div>
                                </div>
                            ))}
                        </div>

                        {/* Chat View (hidden, shown when contact selected) */}
                        <div id="messenger-chat" className="messenger-chat-view" style={{ display: 'none' }}>
                            <div id="messenger-messages" className="messenger-messages">
                                <div className="messenger-empty">No messages yet. Say hi! 👋</div>
                            </div>
                            <div className="messenger-input-area">
                                <input
                                    type="text"
                                    id="messenger-input"
                                    className="messenger-input"
                                    placeholder="Type a message..."
                                />
                                <button id="messenger-send-btn" className="messenger-send-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Toggle Button */}
                    <button id="messenger-toggle" className="messenger-toggle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {totalUnread > 0 && (
                            <span id="messenger-badge" className="messenger-badge">{totalUnread}</span>
                        )}
                    </button>
                </div>
            </body>
        </html>
    );
}
