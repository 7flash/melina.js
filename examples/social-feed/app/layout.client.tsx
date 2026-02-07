/**
 * Layout Client Script — Messenger Widget
 * 
 * Persists across page navigations (mounted once by runtime).
 * Handles: toggle, contacts, chat, SSE messages, send messages.
 * 
 * JSX creates real DOM elements.
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
    let isOpen = false;
    let activeContactId: number | null = null;
    let activeContactName = '';
    let activeContactAvatar = '';
    let activeContactStatus = '';
    const messages = new Map<number, Message[]>();
    let totalUnread = 6; // Initial from SSR

    // DOM refs
    const panel = document.getElementById('messenger-panel');
    const toggle = document.getElementById('messenger-toggle');
    const closeBtn = document.getElementById('messenger-close-btn');
    const expandBtn = document.getElementById('messenger-expand-btn');
    const contactList = document.getElementById('messenger-list');
    const chatView = document.getElementById('messenger-chat');
    const messagesEl = document.getElementById('messenger-messages');
    const inputEl = document.getElementById('messenger-input') as HTMLInputElement;
    const sendBtn = document.getElementById('messenger-send-btn');
    const badge = document.getElementById('messenger-badge');

    if (!panel || !toggle) {
        console.warn('[Messenger] Elements not found');
        return () => { };
    }

    // ─── Toggle Panel ───
    function togglePanel() {
        isOpen = !isOpen;
        panel!.style.display = isOpen ? '' : 'none';
    }

    function closePanel() {
        isOpen = false;
        panel!.style.display = 'none';
    }

    toggle.addEventListener('click', togglePanel);
    closeBtn?.addEventListener('click', closePanel);

    // ─── Expand to Full Page ───
    function expandMessenger() {
        if ((window as any).melinaNavigate) {
            (window as any).melinaNavigate('/messenger');
        }
    }

    expandBtn?.addEventListener('click', expandMessenger);

    // ─── Contact Click ───
    function handleContactClick(e: Event) {
        const item = (e.target as Element).closest('.messenger-item') as HTMLElement;
        if (!item) return;

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

        showChat();
    }

    contactList?.addEventListener('click', handleContactClick);

    // ─── Show Chat View ───
    function showChat() {
        if (!contactList || !chatView || !messagesEl) return;

        contactList.style.display = 'none';
        chatView.style.display = '';

        // Update header to show contact info
        const header = panel!.querySelector('.messenger-header')!;
        header.innerHTML = '';

        const backBtn = <button class="messenger-back-btn" title="Back">←</button> as HTMLElement;
        backBtn.addEventListener('click', showContacts);

        const statusColor = activeContactStatus === 'online' ? '#10b981' : 'var(--text-muted)';
        const statusText = activeContactStatus === 'online' ? 'Active now' : activeContactStatus;

        const avatarBg = activeContactStatus === 'online'
            ? 'linear-gradient(135deg, #10b981, #06b6d4)'
            : activeContactStatus === 'away'
                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                : 'linear-gradient(135deg, #6b7280, #9ca3af)';

        const headerContent = (
            <>
                <div class="messenger-item-avatar small" style={{ background: avatarBg }}>
                    {activeContactAvatar}
                </div>
                <div style={{ flex: '1' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{activeContactName}</div>
                    <div style={{ fontSize: '0.75rem', color: statusColor }}>{statusText}</div>
                </div>
            </>
        );

        header.appendChild(backBtn);
        if (headerContent instanceof DocumentFragment) {
            header.appendChild(headerContent);
        }

        const newCloseBtn = <button class="messenger-close-btn">✕</button> as HTMLElement;
        newCloseBtn.addEventListener('click', closePanel);
        header.appendChild(newCloseBtn);

        // Render messages
        renderMessages();
    }

    // ─── Show Contacts List ───
    function showContacts() {
        if (!contactList || !chatView) return;

        activeContactId = null;
        chatView.style.display = 'none';
        contactList.style.display = '';

        // Restore header
        const header = panel!.querySelector('.messenger-header')!;
        header.innerHTML = '';

        const title = <span style={{ fontWeight: '600' }}>Messages</span>;
        const expand = <button class="messenger-expand-btn" title="Expand">⬈</button> as HTMLElement;
        expand.addEventListener('click', expandMessenger);
        const close = <button class="messenger-close-btn">✕</button> as HTMLElement;
        close.addEventListener('click', closePanel);

        header.appendChild(title as Node);
        header.appendChild(expand);
        header.appendChild(close);
    }

    // ─── Render Messages ───
    function renderMessages() {
        if (!messagesEl || activeContactId === null) return;

        const contactMessages = messages.get(activeContactId) || [];

        if (contactMessages.length === 0) {
            messagesEl.innerHTML = '<div class="messenger-empty">No messages yet. Say hi! 👋</div>';
        } else {
            messagesEl.innerHTML = '';
            for (const msg of contactMessages) {
                const msgEl = (
                    <div class={`messenger-message ${msg.incoming ? 'incoming' : 'outgoing'}`}>
                        {msg.text}
                    </div>
                );
                messagesEl.appendChild(msgEl as Node);
            }
        }

        // Scroll to bottom
        messagesEl.scrollTop = messagesEl.scrollHeight;
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

        // Update contact's last message in the list
        const contactItem = contactList?.querySelector(`[data-contact-id="${activeContactId}"]`);
        if (contactItem) {
            const preview = contactItem.querySelector('.messenger-item-preview');
            if (preview) preview.textContent = text;
            const time = contactItem.querySelector('.messenger-item-time');
            if (time) time.textContent = 'now';
        }

        renderMessages();
    }

    sendBtn?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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

                // Update contact in DOM
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
                            nameEl.appendChild(<span class="unread-dot" /> as Node);
                        }
                        totalUnread++;
                        updateBadge();
                    }
                }

                // Re-render if viewing this chat
                if (activeContactId === data.contactId) {
                    renderMessages();
                }
            } catch (e) {
                console.error('[Messenger] Failed to parse SSE message:', e);
            }
        };

        eventSource.onerror = () => {
            console.warn('[Messenger] SSE connection error, will reconnect');
        };
    } catch (e) {
        console.warn('[Messenger] SSE not available:', e);
    }

    // ─── Badge Update ───
    function updateBadge() {
        if (!badge) return;
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : String(totalUnread);
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    console.log('[Messenger] Mounted — persistent across navigations');

    // ─── Cleanup (only runs on page unload) ───
    return () => {
        toggle.removeEventListener('click', togglePanel);
        closeBtn?.removeEventListener('click', closePanel);
        expandBtn?.removeEventListener('click', expandMessenger);
        contactList?.removeEventListener('click', handleContactClick);
        eventSource?.close();
        console.log('[Messenger] Unmounted');
    };
}
