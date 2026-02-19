/**
 * Messenger Page — Server Component
 * 
 * Full-page messaging experience. Server-renders the layout
 * with contacts sidebar and chat area. Client interactivity
 * (selecting contacts, sending messages, SSE) is in page.client.tsx.
 */

// Shared contacts data (same as layout.tsx)
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

function statusColor(status: string) {
    if (status === 'online') return '#10b981';
    if (status === 'away') return '#f59e0b';
    return '#6b7280';
}

export default function MessengerPage() {
    return (
        <div className="messenger-fullpage" style={{ viewTransitionName: 'messenger-page' }}>
            {/* Header */}
            <div className="messenger-fullpage-header">
                <a href="/" className="back-link" id="messenger-back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Feed
                </a>
                <h1>Messages</h1>
            </div>

            {/* Main Layout: Sidebar + Chat */}
            <div className="messenger-fullpage-layout">
                {/* Contacts Sidebar */}
                <div className="messenger-fullpage-sidebar" id="messenger-fp-sidebar">
                    {/* Search */}
                    <div className="messenger-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            id="messenger-fp-search"
                            className="messenger-search-input"
                            placeholder="Search conversations..."
                        />
                    </div>

                    {/* Contact Items */}
                    <div id="messenger-fp-contacts">
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
                                    <span
                                        className="messenger-status-indicator"
                                        style={{ background: statusColor(contact.status) }}
                                    />
                                </div>
                                <div className="messenger-item-content">
                                    <div className="messenger-item-name">
                                        {contact.name}
                                        {contact.unread > 0 && <span className="unread-dot" />}
                                    </div>
                                    <div className="messenger-item-preview">{contact.lastMessage}</div>
                                </div>
                                <div className="messenger-item-meta">
                                    <div className="messenger-item-time">{contact.lastMessageTime}</div>
                                    {contact.unread > 0 && (
                                        <span className="messenger-unread-badge">{contact.unread}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="messenger-fullpage-chat" id="messenger-fp-chat">
                    {/* Empty state (shown by default) */}
                    <div className="messenger-fullpage-empty" id="messenger-fp-empty">
                        <div className="messenger-fullpage-empty-icon">💬</div>
                        <h3>Select a conversation</h3>
                        <p>Choose from your contacts on the left to start messaging.</p>
                    </div>

                    {/* Chat header (hidden by default) */}
                    <div className="messenger-fullpage-chat-header" id="messenger-fp-chat-header" style={{ display: 'none' }}>
                        <div className="messenger-item-avatar small" id="messenger-fp-chat-avatar" />
                        <div id="messenger-fp-chat-info" style={{ flex: 1 }}>
                            <div id="messenger-fp-chat-name" style={{ fontWeight: 600, fontSize: '1rem' }} />
                            <div id="messenger-fp-chat-status" style={{ fontSize: '0.8rem' }} />
                        </div>
                        <button className="messenger-action-btn" id="messenger-fp-call-btn" title="Voice call">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        </button>
                        <button className="messenger-action-btn" id="messenger-fp-video-btn" title="Video call">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                        </button>
                        <button className="messenger-action-btn" id="messenger-fp-info-btn" title="Info">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4M12 8h.01" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages area (hidden by default) */}
                    <div className="messenger-fullpage-messages" id="messenger-fp-messages" style={{ display: 'none' }}>
                        {/* Messages will be rendered by client script */}
                    </div>

                    {/* Input area (hidden by default) */}
                    <div className="messenger-fullpage-input" id="messenger-fp-input-area" style={{ display: 'none' }}>
                        <button className="messenger-action-btn" id="messenger-fp-attach-btn" title="Attach file">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                        </button>
                        <input
                            type="text"
                            id="messenger-fp-input"
                            className="messenger-input"
                            placeholder="Type a message..."
                        />
                        <button className="messenger-action-btn" id="messenger-fp-emoji-btn" title="Emoji">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                            </svg>
                        </button>
                        <button className="messenger-send-btn" id="messenger-fp-send-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
