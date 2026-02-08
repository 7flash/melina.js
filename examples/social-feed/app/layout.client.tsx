/**
 * Layout Client Script — Messenger Widget
 * 
 * Persists across page navigations (mounted once by runtime).
 * Handles: toggle, contacts, chat, SSE messages, send messages.
 * 
 * Uses event delegation to handle DOM updates during navigation.
 */

interface Message {
    id: number;
    contactId: number;
    text: string;
    incoming: boolean;
    timestamp: Date;
}

export default function mount(): () => void {
    // State
    let activeContactId: number | null = null;
    let activeContactName = '';
    let activeContactAvatar = '';
    let activeContactStatus = '';
    const messages = new Map<number, Message[]>();
    let totalUnread = 6; // Initial from SSR

    // ─── Helpers ───
    const getEl = (id: string) => document.getElementById(id);

    // ─── Event Delegation Handler ───
    function handleClick(e: MouseEvent) {
        const target = e.target as HTMLElement;

        // Toggle Button
        if (target.closest('#messenger-toggle')) {
            const panel = getEl('messenger-panel');
            if (panel) {
                const isHidden = panel.style.display === 'none';
                panel.style.display = isHidden ? '' : 'none';
            }
            return;
        }

        // Close Button
        if (target.closest('.messenger-close-btn')) {
            const panel = getEl('messenger-panel');
            if (panel) panel.style.display = 'none';
            return;
        }

        // Expand Button
        if (target.closest('#messenger-expand-btn') || target.closest('.messenger-expand-btn')) {
            if ((window as any).melinaNavigate) {
                (window as any).melinaNavigate('/messenger');
            } else {
                window.location.href = '/messenger';
            }
            return;
        }

        // Back Button (in chat view)
        if (target.closest('.messenger-back-btn')) {
            showContacts();
            return;
        }

        // Contact Item
        const contactItem = target.closest('.messenger-item');
        if (contactItem) {
            handleContactClick(contactItem as HTMLElement);
            return;
        }

        // Send Button
        if (target.closest('#messenger-send-btn')) {
            sendMessage();
            return;
        }
    }

    // ─── Document-level Listeners ───
    document.addEventListener('click', handleClick);

    // Enter key support for input
    function handleKeypress(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const input = getEl('messenger-input');
            if (input && document.activeElement === input) {
                e.preventDefault();
                sendMessage();
            }
        }
    }
    document.addEventListener('keypress', handleKeypress);


    // ─── Logic ───

    function handleContactClick(item: HTMLElement) {
        activeContactId = parseInt(item.dataset.contactId || '0');
        activeContactName = item.dataset.contactName || '';
        activeContactAvatar = item.dataset.contactAvatar || '';
        activeContactStatus = item.dataset.contactStatus || '';

        // Clear unread for this contact
        const unreadDot = item.querySelector('.unread-dot');
        if (unreadDot) {
            unreadDot.remove();
            item.classList.remove('unread');
        }

        // Update badge if needed (simplified logic, should ideally recalculate)
        // For now, we rely on SSE to keep badge accurate or decrement locally?
        // Let's perform a simple check
        const badge = getEl('messenger-badge');
        if (badge && totalUnread > 0) {
            // We can't easily know how many unread *this* contact had without parsing the badge inside the item
            // But visual feedback is already handled by removing the dot.
            // We'll leave the global counter sync for SSE or future refinement.
        }

        showChat();
    }

    function showChat() {
        const contactList = getEl('messenger-list');
        const chatView = getEl('messenger-chat');
        const messagesEl = getEl('messenger-messages');
        const panel = getEl('messenger-panel');

        if (!contactList || !chatView || !messagesEl || !panel) return;

        contactList.style.display = 'none';
        chatView.style.display = '';

        // Update header
        const header = panel.querySelector('.messenger-header');
        if (header) {
            header.innerHTML = '';

            // Re-create header with back button
            const statusColor = activeContactStatus === 'online' ? '#10b981' : 'var(--text-muted)';
            const statusText = activeContactStatus === 'online' ? 'Active now' : activeContactStatus;

            const avatarBg = activeContactStatus === 'online'
                ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                : activeContactStatus === 'away'
                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(135deg, #6b7280, #9ca3af)';

            // Use string interpolation for standard HTML structure to avoid JSX fragment issues in raw DOM manipulation
            // Also ensures the SVG/Buttons are standard
            header.innerHTML = `
                <button class="messenger-back-btn" title="Back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5m7 7-7-7 7-7" />
                    </svg>
                </button>
                <div class="messenger-item-avatar small" style="background: ${avatarBg}">
                    ${activeContactAvatar}
                </div>
                <div style="flex: 1">
                    <div style="font-weight: 600; font-size: 0.95rem">${activeContactName}</div>
                    <div style="font-size: 0.75rem; color: ${statusColor}">${statusText}</div>
                </div>
                <button class="messenger-close-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            `;
        }

        renderMessages();
    }

    function showContacts() {
        const contactList = getEl('messenger-list');
        const chatView = getEl('messenger-chat');
        const panel = getEl('messenger-panel');

        if (!contactList || !chatView || !panel) return;

        activeContactId = null;
        chatView.style.display = 'none';
        contactList.style.display = '';

        const header = panel.querySelector('.messenger-header');
        if (header) {
            header.innerHTML = `
                <span style="font-weight: 600">Messages</span>
                <button id="messenger-expand-btn" class="messenger-expand-btn" title="Expand">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
                    </svg>
                </button>
                <button class="messenger-close-btn">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            `;
        }
    }

    function renderMessages() {
        const messagesEl = getEl('messenger-messages');
        if (!messagesEl || activeContactId === null) return;

        const contactMessages = messages.get(activeContactId) || [];

        if (contactMessages.length === 0) {
            messagesEl.innerHTML = '<div class="messenger-empty">No messages yet. Say hi! 👋</div>';
        } else {
            messagesEl.innerHTML = '';
            for (const msg of contactMessages) {
                const msgEl = document.createElement('div');
                msgEl.className = `messenger-message ${msg.incoming ? 'incoming' : 'outgoing'}`;
                msgEl.textContent = msg.text;
                messagesEl.appendChild(msgEl);
            }
        }

        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function sendMessage() {
        const inputEl = getEl('messenger-input') as HTMLInputElement;
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

        // Update contact preview
        const contactList = getEl('messenger-list');
        const contactItem = contactList?.querySelector(`[data-contact-id="${activeContactId}"]`);
        if (contactItem) {
            const preview = contactItem.querySelector('.messenger-item-preview');
            if (preview) preview.textContent = text;
            const time = contactItem.querySelector('.messenger-item-time');
            if (time) time.textContent = 'now';
        }

        renderMessages();
    }

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

                // Update contact in DOM
                const contactList = getEl('messenger-list');
                const contactItem = contactList?.querySelector(`[data-contact-id="${data.contactId}"]`);
                if (contactItem) {
                    const preview = contactItem.querySelector('.messenger-item-preview');
                    if (preview) preview.textContent = data.text;
                    const time = contactItem.querySelector('.messenger-item-time');
                    if (time) time.textContent = 'now';

                    // Add unread if not active chat
                    if (activeContactId !== data.contactId) {
                        contactItem.classList.add('unread');
                        const nameEl = contactItem.querySelector('.messenger-item-name');
                        if (nameEl && !nameEl.querySelector('.unread-dot')) {
                            // Correct creation of span manually
                            const dot = document.createElement('span');
                            dot.className = 'unread-dot';
                            nameEl.appendChild(dot);
                        }
                        totalUnread++;
                        updateBadge();
                    }
                }

                if (activeContactId === data.contactId) {
                    renderMessages();
                }
            } catch (e) {
                // Silently handle
            }
        };
    } catch (e) {
        // SSE not available
    }

    function updateBadge() {
        const badge = getEl('messenger-badge');
        if (!badge) return;
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : String(totalUnread);
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    console.log('[Messenger] Mounted — persistent & delegated');

    return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keypress', handleKeypress);
        eventSource?.close();
        console.log('[Messenger] Unmounted');
    };
}
