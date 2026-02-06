/**
 * Messenger Component — Persistent island with SSE messages
 * 
 * This island PERSISTS across page navigations thanks to:
 * - Hangar architecture keeping it alive during body.innerHTML swaps
 * - Stable instance ID (data-instance="Messenger")
 * 
 * Features:
 * - Real-time messages from server via SSE
 * - Inline chat view (opens within panel)
 * - State persistence across navigations
 * - Full-page mode when rendered at /messenger
 */
'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';

// Type declaration for Melina's global navigation function
declare global {
    interface Window {
        melinaNavigate?: (href: string) => Promise<void>;
    }
}

// Types
interface Contact {
    id: number;
    name: string;
    avatar: string;
    status: 'online' | 'away' | 'offline';
    lastMessage: string;
    lastMessageTime: string;
    unread: number;
}

interface Message {
    id: number;
    contactId: number;
    text: string;
    incoming: boolean;
    timestamp: Date;
}

interface MessengerProps {
    // No props needed - component detects route automatically
    /** Internal Melina prop for unique island instance identification */
    _melinaInstance?: string;
}

// Initial contacts
const initialContacts: Contact[] = [
    { id: 1, name: 'Emma Watson', avatar: 'EW', status: 'online', lastMessage: 'Hey! Did you see the new update?', lastMessageTime: 'now', unread: 2 },
    { id: 2, name: 'Liam Chen', avatar: 'LC', status: 'online', lastMessage: 'The demo is looking great 👍', lastMessageTime: '2m', unread: 0 },
    { id: 3, name: 'Sophia Kim', avatar: 'SK', status: 'away', lastMessage: 'Can we hop on a call later?', lastMessageTime: '15m', unread: 1 },
    { id: 4, name: 'Noah Williams', avatar: 'NW', status: 'online', lastMessage: 'Shipped the fix!', lastMessageTime: '32m', unread: 0 },
    { id: 5, name: 'Olivia Brown', avatar: 'OB', status: 'offline', lastMessage: 'Thanks for your help!', lastMessageTime: '1h', unread: 0 },
    { id: 6, name: 'Mason Davis', avatar: 'MD', status: 'online', lastMessage: 'Check out this PR', lastMessageTime: '2h', unread: 3 },
    { id: 7, name: 'Ava Martinez', avatar: 'AM', status: 'online', lastMessage: 'The islands pattern rocks!', lastMessageTime: '3h', unread: 0 },
    { id: 8, name: 'Ethan Garcia', avatar: 'EG', status: 'away', lastMessage: 'Meeting at 3?', lastMessageTime: '5h', unread: 0 },
];

// Route tracking for detecting full-page mode
let currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
const pathListeners = new Set<() => void>();

function subscribePath(cb: () => void) {
    pathListeners.add(cb);
    return () => pathListeners.delete(cb);
}

function getPath() {
    return currentPath;
}

// Listen for Melina navigation events  
if (typeof window !== 'undefined') {
    window.addEventListener('melina:navigation-start', (e: any) => {
        currentPath = e.detail?.to || window.location.pathname;
        pathListeners.forEach(cb => cb());
    });
    window.addEventListener('popstate', () => {
        currentPath = window.location.pathname;
        pathListeners.forEach(cb => cb());
    });
}

export default function Messenger({ }: MessengerProps) {
    // Detect if we're on /messenger route - determines full-page vs widget mode
    const path = useSyncExternalStore(subscribePath, getPath, () => '/');
    const isFullPage = path === '/messenger';

    const [isOpen, setIsOpen] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [activeChat, setActiveChat] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Map<number, Message[]>>(new Map());
    const [inputValue, setInputValue] = useState('');
    const [totalUnread, setTotalUnread] = useState(6);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Auto-open when in full-page mode
    useEffect(() => {
        if (isFullPage) {
            setIsOpen(true);
        }
    }, [isFullPage]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [messages, activeChat]);

    // Subscribe to SSE messages from server
    useEffect(() => {
        // Only connect once, and keep connection alive across navigations
        if (eventSourceRef.current) return;

        const eventSource = new EventSource('/api/messages');
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Add message to state
                const newMessage: Message = {
                    id: data.id,
                    contactId: data.contactId,
                    text: data.text,
                    incoming: true,
                    timestamp: new Date(data.timestamp),
                };

                setMessages(prev => {
                    const next = new Map(prev);
                    const existing = next.get(data.contactId) || [];
                    next.set(data.contactId, [...existing, newMessage]);
                    return next;
                });

                // Update contact's last message
                setContacts(prev => prev.map(c => {
                    if (c.id === data.contactId) {
                        const isActiveChat = activeChat?.id === data.contactId;
                        return {
                            ...c,
                            lastMessage: data.text,
                            lastMessageTime: 'now',
                            unread: isActiveChat ? 0 : c.unread + 1,
                        };
                    }
                    return c;
                }));

                // Update total unread
                setTotalUnread(prev => {
                    const isActiveChat = activeChat?.id === data.contactId;
                    return isActiveChat ? prev : prev + 1;
                });

            } catch (e) {
                console.error('[Messenger] Failed to parse SSE message:', e);
            }
        };

        eventSource.onerror = (e) => {
            console.warn('[Messenger] SSE connection error, will reconnect:', e);
        };

        return () => {
            // Don't close on unmount - keep connection alive for persistence
        };
    }, [activeChat]);

    const openChat = (contact: Contact) => {
        setActiveChat(contact);

        // Mark as read
        setContacts(prev => prev.map(c => {
            if (c.id === contact.id && c.unread > 0) {
                setTotalUnread(u => Math.max(0, u - c.unread));
                return { ...c, unread: 0 };
            }
            return c;
        }));
    };

    const closeChat = () => {
        setActiveChat(null);
        setInputValue('');
    };

    const sendMessage = () => {
        if (!inputValue.trim() || !activeChat) return;

        const newMessage: Message = {
            id: Date.now(),
            contactId: activeChat.id,
            text: inputValue,
            incoming: false,
            timestamp: new Date(),
        };

        setMessages(prev => {
            const next = new Map(prev);
            const existing = next.get(activeChat.id) || [];
            next.set(activeChat.id, [...existing, newMessage]);
            return next;
        });

        setContacts(prev => prev.map(c => {
            if (c.id === activeChat.id) {
                return { ...c, lastMessage: inputValue, lastMessageTime: 'now' };
            }
            return c;
        }));

        setInputValue('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleExpand = () => {
        if (window.melinaNavigate) {
            window.melinaNavigate('/messenger');
        } else {
            window.location.href = '/messenger';
        }
    };

    const handleCollapse = () => {
        if (window.melinaNavigate) {
            window.melinaNavigate('/');
        } else {
            window.location.href = '/';
        }
    };

    // Full-page mode renders the messenger as the main content
    if (isFullPage) {
        return (
            <div className="messenger-fullpage" style={{ viewTransitionName: 'messenger' }}>
                <div className="messenger-fullpage-header">
                    <a href="/" className="back-link">← Back to Feed</a>
                    <h1>Messages</h1>
                </div>
                <div className="messenger-fullpage-layout">
                    {/* Contacts Sidebar */}
                    <div className="messenger-fullpage-sidebar">
                        {contacts.map(contact => (
                            <div
                                key={contact.id}
                                className={`messenger-item ${contact.unread > 0 ? 'unread' : ''} ${activeChat?.id === contact.id ? 'active' : ''}`}
                                onClick={() => openChat(contact)}
                            >
                                <div
                                    className="messenger-item-avatar"
                                    style={{
                                        background: contact.status === 'online'
                                            ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                                            : contact.status === 'away'
                                                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                                : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                                    }}
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

                    {/* Chat Area */}
                    <div className="messenger-fullpage-chat">
                        {activeChat ? (
                            <>
                                <div className="messenger-fullpage-chat-header">
                                    <div
                                        className="messenger-item-avatar"
                                        style={{
                                            background: activeChat.status === 'online'
                                                ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                                                : activeChat.status === 'away'
                                                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                                    : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                                        }}
                                    >
                                        {activeChat.avatar}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{activeChat.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: activeChat.status === 'online' ? 'var(--success)' : 'var(--text-muted)' }}>
                                            {activeChat.status === 'online' ? 'Active now' : activeChat.status}
                                        </div>
                                    </div>
                                </div>
                                <div className="messenger-fullpage-messages">
                                    {(messages.get(activeChat.id) || []).length === 0 && (
                                        <div className="messenger-empty">No messages yet. Say hi! 👋</div>
                                    )}
                                    {(messages.get(activeChat.id) || []).map(msg => (
                                        <div key={msg.id} className={`messenger-message ${msg.incoming ? 'incoming' : 'outgoing'}`}>
                                            {msg.text}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="messenger-fullpage-input">
                                    <input
                                        type="text"
                                        className="messenger-input"
                                        placeholder="Type a message..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                    <button className="messenger-send-btn" onClick={sendMessage}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="messenger-fullpage-empty">
                                <div className="messenger-fullpage-empty-icon">💬</div>
                                <h3>Select a conversation</h3>
                                <p>Choose a contact from the left to start chatting</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="messenger" style={{ viewTransitionName: 'messenger' }}>
            {/* Messenger Panel */}
            {isOpen && (
                <div className="messenger-panel">
                    {/* Header */}
                    <div className="messenger-header">
                        {activeChat ? (
                            <>
                                <button onClick={closeChat} className="messenger-back-btn" title="Back">
                                    ←
                                </button>
                                <div
                                    className="messenger-item-avatar small"
                                    style={{
                                        background: activeChat.status === 'online'
                                            ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                                            : activeChat.status === 'away'
                                                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                                : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                                    }}
                                >
                                    {activeChat.avatar}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{activeChat.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: activeChat.status === 'online' ? 'var(--success)' : 'var(--text-muted)' }}>
                                        {activeChat.status === 'online' ? 'Active now' : activeChat.status}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <span style={{ fontWeight: 600 }}>Messages</span>
                                <button onClick={handleExpand} className="messenger-expand-btn" title="Expand">⬈</button>
                            </>
                        )}
                        <button onClick={() => setIsOpen(false)} className="messenger-close-btn">✕</button>
                    </div>

                    {/* Content */}
                    {activeChat ? (
                        <div className="messenger-chat-view">
                            <div className="messenger-messages">
                                {(messages.get(activeChat.id) || []).length === 0 && (
                                    <div className="messenger-empty">No messages yet. Say hi! 👋</div>
                                )}
                                {(messages.get(activeChat.id) || []).map(msg => (
                                    <div key={msg.id} className={`messenger-message ${msg.incoming ? 'incoming' : 'outgoing'}`}>
                                        {msg.text}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="messenger-input-area">
                                <input
                                    type="text"
                                    className="messenger-input"
                                    placeholder="Type a message..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <button className="messenger-send-btn" onClick={sendMessage}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="messenger-list">
                            {contacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className={`messenger-item ${contact.unread > 0 ? 'unread' : ''}`}
                                    onClick={() => openChat(contact)}
                                >
                                    <div
                                        className="messenger-item-avatar"
                                        style={{
                                            background: contact.status === 'online'
                                                ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                                                : contact.status === 'away'
                                                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                                    : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                                        }}
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
                    )}
                </div>
            )}

            {/* Toggle Button */}
            <button className="messenger-toggle" onClick={() => setIsOpen(prev => !prev)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {totalUnread > 0 && (
                    <span className="messenger-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
                )}
            </button>
        </div>
    );
}
