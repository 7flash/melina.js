/**
 * Messenger Page — Client Mount Script
 * 
 * Full-page messaging experience with:
 * - Contact selection with active state
 * - Real-time messaging via SSE
 * - Message sending with optimistic UI
 * - Typing indicators & auto-replies
 * - Search/filter contacts
 * - Smooth transition animations
 * 
 * JSX creates real DOM elements (not React virtual DOM).
 */

interface Message {
    id: number;
    contactId: number;
    text: string;
    incoming: boolean;
    timestamp: Date;
}

interface Contact {
    id: number;
    name: string;
    avatar: string;
    status: string;
}

// Auto-reply messages for the demo
const autoReplies = [
    "That's interesting! Tell me more 🤔",
    "Absolutely! I was just thinking the same thing.",
    "Haha, love it! 😄",
    "Makes sense. Let me check on that.",
    "Great point! I'll look into it.",
    "Can't wait to see how it turns out!",
    "Working on it right now 💪",
    "Perfect, thanks for letting me know!",
    "That's awesome! 🎉",
    "Sounds good to me!",
    "I'll get back to you on that shortly.",
    "Nice! The progress is looking great.",
];

export default function mount(): () => void {
    // ─── State ───
    let activeContactId: number | null = null;
    let activeContact: Contact | null = null;
    const messages = new Map<number, Message[]>();
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;

    // ─── DOM Refs ───
    const sidebar = document.getElementById('messenger-fp-sidebar');
    const contactsEl = document.getElementById('messenger-fp-contacts');
    const searchInput = document.getElementById('messenger-fp-search') as HTMLInputElement;
    const chatArea = document.getElementById('messenger-fp-chat');
    const emptyState = document.getElementById('messenger-fp-empty');
    const chatHeader = document.getElementById('messenger-fp-chat-header');
    const chatAvatar = document.getElementById('messenger-fp-chat-avatar');
    const chatName = document.getElementById('messenger-fp-chat-name');
    const chatStatus = document.getElementById('messenger-fp-chat-status');
    const messagesArea = document.getElementById('messenger-fp-messages');
    const inputArea = document.getElementById('messenger-fp-input-area');
    const inputEl = document.getElementById('messenger-fp-input') as HTMLInputElement;
    const sendBtn = document.getElementById('messenger-fp-send-btn');

    if (!contactsEl || !chatArea) {
        return () => { };
    }

    // ─── Hide the floating messenger widget on this page ───
    const messengerWidget = document.getElementById('messenger');
    if (messengerWidget) {
        messengerWidget.style.display = 'none';
    }

    // ─── Contact Click Handler ───
    function handleContactClick(e: Event) {
        const item = (e.target as Element).closest('.messenger-item') as HTMLElement;
        if (!item) return;

        const id = parseInt(item.dataset.contactId || '0');
        const name = item.dataset.contactName || '';
        const avatar = item.dataset.contactAvatar || '';
        const status = item.dataset.contactStatus || '';

        // Update active state in sidebar
        contactsEl!.querySelectorAll('.messenger-item').forEach(el => {
            el.classList.remove('active');
        });
        item.classList.add('active');

        // Clear unread
        const unreadDot = item.querySelector('.unread-dot');
        if (unreadDot) {
            unreadDot.remove();
            item.classList.remove('unread');
        }
        const unreadBadge = item.querySelector('.messenger-unread-badge');
        if (unreadBadge) unreadBadge.remove();

        activeContactId = id;
        activeContact = { id, name, avatar, status };

        showChat();
    }

    contactsEl.addEventListener('click', handleContactClick);

    // ─── Show Chat View ───
    function showChat() {
        if (!activeContact || !chatHeader || !messagesArea || !inputArea || !emptyState) return;

        // Animate transition
        emptyState.style.display = 'none';
        chatHeader.style.display = '';
        messagesArea.style.display = '';
        inputArea.style.display = '';

        // Animate in
        chatHeader.animate([
            { opacity: 0, transform: 'translateY(-10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 200, easing: 'ease-out', fill: 'forwards' });

        messagesArea.animate([
            { opacity: 0 },
            { opacity: 1 }
        ], { duration: 250, easing: 'ease-out', fill: 'forwards' });

        inputArea.animate([
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 200, easing: 'ease-out', fill: 'forwards' });

        // Update header
        const avatarBg = activeContact.status === 'online'
            ? 'linear-gradient(135deg, #10b981, #06b6d4)'
            : activeContact.status === 'away'
                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                : 'linear-gradient(135deg, #6b7280, #9ca3af)';

        if (chatAvatar) {
            chatAvatar.style.background = avatarBg;
            chatAvatar.textContent = activeContact.avatar;
        }
        if (chatName) {
            chatName.textContent = activeContact.name;
        }
        if (chatStatus) {
            const color = activeContact.status === 'online' ? '#10b981' : 'var(--text-muted)';
            const text = activeContact.status === 'online' ? '● Active now' : activeContact.status === 'away' ? '● Away' : '○ Offline';
            chatStatus.style.color = color;
            chatStatus.textContent = text;
        }

        renderMessages();
        inputEl?.focus();
    }

    // ─── Render Messages ───
    function renderMessages() {
        if (!messagesArea || activeContactId === null) return;

        const contactMessages = messages.get(activeContactId) || [];
        messagesArea.innerHTML = '';

        if (contactMessages.length === 0) {
            const emptyMsg = (
                <div class="messenger-chat-empty">
                    <div class="messenger-chat-empty-avatar" style={{
                        background: activeContact?.status === 'online'
                            ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                            : 'linear-gradient(135deg, #6b7280, #9ca3af)'
                    }}>
                        {activeContact?.avatar || ''}
                    </div>
                    <h4 style={{ margin: '12px 0 4px', fontWeight: '600' }}>{activeContact?.name || ''}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0' }}>
                        No messages yet. Say hi! 👋
                    </p>
                </div>
            );
            messagesArea.appendChild(emptyMsg as Node);
        } else {
            let lastDate = '';
            for (const msg of contactMessages) {
                const dateStr = msg.timestamp.toLocaleDateString();
                if (dateStr !== lastDate) {
                    lastDate = dateStr;
                    const dateSep = (
                        <div class="messenger-date-separator">
                            <span>{dateStr === new Date().toLocaleDateString() ? 'Today' : dateStr}</span>
                        </div>
                    );
                    messagesArea.appendChild(dateSep as Node);
                }

                const timeStr = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const msgEl = (
                    <div class={`messenger-message ${msg.incoming ? 'incoming' : 'outgoing'}`}>
                        <div class="messenger-message-text">{msg.text}</div>
                        <div class="messenger-message-time">{timeStr}</div>
                    </div>
                );

                // Animate new messages
                const node = msgEl as HTMLElement;
                messagesArea.appendChild(node);
                node.animate([
                    { opacity: 0, transform: msg.incoming ? 'translateX(-12px)' : 'translateX(12px)' },
                    { opacity: 1, transform: 'translateX(0)' }
                ], { duration: 200, easing: 'ease-out' });
            }
        }

        // Scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    // ─── Send Message ───
    function sendMessage() {
        if (!inputEl || !activeContactId) return;
        const text = inputEl.value.trim();
        if (!text) return;

        const msg: Message = {
            id: Date.now(),
            contactId: activeContactId,
            text,
            incoming: false,
            timestamp: new Date(),
        };

        const existing = messages.get(activeContactId) || [];
        messages.set(activeContactId, [...existing, msg]);
        inputEl.value = '';

        // Update contact's last message in sidebar
        updateContactPreview(activeContactId, text, 'now');

        renderMessages();

        // Auto-reply after a random delay
        scheduleAutoReply(activeContactId);
    }

    // ─── Auto Reply ───
    function scheduleAutoReply(contactId: number) {
        // Show typing indicator
        showTypingIndicator();

        const delay = 1200 + Math.random() * 2000;
        setTimeout(() => {
            hideTypingIndicator();

            const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
            const msg: Message = {
                id: Date.now(),
                contactId,
                text: reply,
                incoming: true,
                timestamp: new Date(),
            };

            const existing = messages.get(contactId) || [];
            messages.set(contactId, [...existing, msg]);

            updateContactPreview(contactId, reply, 'now');

            if (activeContactId === contactId) {
                renderMessages();
            }
        }, delay);
    }

    // ─── Typing Indicator ───
    function showTypingIndicator() {
        if (!messagesArea) return;
        // Remove existing typing indicator
        hideTypingIndicator();

        const typingEl = (
            <div class="messenger-typing" id="messenger-typing-indicator">
                <div class="messenger-typing-dots">
                    <span />
                    <span />
                    <span />
                </div>
                <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {activeContact?.name || 'Someone'} is typing...
                </span>
            </div>
        );
        messagesArea.appendChild(typingEl as Node);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function hideTypingIndicator() {
        const existing = document.getElementById('messenger-typing-indicator');
        if (existing) existing.remove();
    }

    // ─── Update Contact Preview ───
    function updateContactPreview(contactId: number, text: string, time: string) {
        const contactItem = contactsEl?.querySelector(`[data-contact-id="${contactId}"]`);
        if (contactItem) {
            const preview = contactItem.querySelector('.messenger-item-preview');
            if (preview) preview.textContent = text;
            const timeEl = contactItem.querySelector('.messenger-item-time');
            if (timeEl) timeEl.textContent = time;
        }
    }

    // ─── Send Button & Enter Key ───
    sendBtn?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ─── Search / Filter Contacts ───
    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        const items = contactsEl!.querySelectorAll('.messenger-item');
        items.forEach((item: Element) => {
            const name = (item as HTMLElement).dataset.contactName?.toLowerCase() || '';
            const el = item as HTMLElement;
            if (!query || name.includes(query)) {
                el.style.display = '';
                el.animate([
                    { opacity: 0.5 },
                    { opacity: 1 }
                ], { duration: 150 });
            } else {
                el.style.display = 'none';
            }
        });
    });

    // ─── SSE Messages ───
    let eventSource: EventSource | null = null;
    try {
        eventSource = new EventSource('/api/messages');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                const newMessage: Message = {
                    id: data.id,
                    contactId: data.contactId,
                    text: data.text,
                    incoming: true,
                    timestamp: new Date(data.timestamp),
                };

                const existing = messages.get(data.contactId) || [];
                messages.set(data.contactId, [...existing, newMessage]);

                // Update contact in sidebar
                updateContactPreview(data.contactId, data.text, 'now');

                // Add unread indicator if not active chat
                if (activeContactId !== data.contactId) {
                    const contactItem = contactsEl?.querySelector(`[data-contact-id="${data.contactId}"]`);
                    if (contactItem) {
                        contactItem.classList.add('unread');
                        const nameEl = contactItem.querySelector('.messenger-item-name');
                        if (nameEl && !nameEl.querySelector('.unread-dot')) {
                            nameEl.appendChild(<span class="unread-dot" /> as Node);
                        }
                    }
                }

                // Re-render if viewing this chat
                if (activeContactId === data.contactId) {
                    renderMessages();
                }
            } catch (e) {
                // Silently handle parse errors
            }
        };

        eventSource.onerror = () => {
            // SSE will auto-reconnect
        };
    } catch (e) {
        // SSE not available
    }

    // ─── Keyboard shortcut: Escape to deselect ───
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && activeContactId !== null) {
            deselectContact();
        }
    }

    function deselectContact() {
        activeContactId = null;
        activeContact = null;

        contactsEl?.querySelectorAll('.messenger-item').forEach(el => {
            el.classList.remove('active');
        });

        if (emptyState) emptyState.style.display = '';
        if (chatHeader) chatHeader.style.display = 'none';
        if (messagesArea) messagesArea.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';
    }

    document.addEventListener('keydown', handleKeydown);

    // ─── Cleanup ───
    return () => {
        contactsEl?.removeEventListener('click', handleContactClick);
        document.removeEventListener('keydown', handleKeydown);
        eventSource?.close();

        // Show messenger widget again when leaving this page
        if (messengerWidget) {
            messengerWidget.style.display = '';
        }

        if (typingTimeout) clearTimeout(typingTimeout);
    };
}
