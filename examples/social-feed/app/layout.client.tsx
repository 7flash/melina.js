/**
 * Layout Client Script — Messenger Widget
 * 
 * Manages the floating messenger widget state using XState.
 * Renders DOM using JSX elements (real DOM via jsx-dom, not React).
 * Styled with Tailwind CSS utility classes.
 */

import { setup, assign, createActor } from 'xstate';

// ─── Types ───

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
    lastMessage: string;
    lastMessageTime: string;
    unread: number;
}

interface MsgContext {
    contacts: Contact[];
    activeContactId: number | null;
    messages: Map<number, Message[]>;
    totalUnread: number;
}

type MsgEvent =
    | { type: 'TOGGLE' }
    | { type: 'CLOSE' }
    | { type: 'EXPAND' }
    | { type: 'SELECT_CONTACT'; contactId: number }
    | { type: 'BACK' }
    | { type: 'SEND_MESSAGE'; text: string }
    | { type: 'RECEIVE_MESSAGE'; message: Message }
    | { type: 'INIT_CONTACTS'; contacts: Contact[] };

// ─── State Machine ───

const machine = setup({
    types: {
        context: {} as MsgContext,
        events: {} as MsgEvent,
    },
    actions: {
        selectContact: assign({
            activeContactId: ({ event }) =>
                event.type === 'SELECT_CONTACT' ? event.contactId : null,
        }),
        clearContact: assign({ activeContactId: null }),
        markRead: assign(({ context }) => {
            const { activeContactId, contacts, totalUnread } = context;
            if (!activeContactId) return {};
            let dropped = 0;
            const newContacts = contacts.map(c => {
                if (c.id === activeContactId) {
                    dropped = c.unread;
                    return { ...c, unread: 0 };
                }
                return c;
            });
            return { contacts: newContacts, totalUnread: Math.max(0, totalUnread - dropped) };
        }),
        addOutgoing: assign(({ context, event }) => {
            if (event.type !== 'SEND_MESSAGE') return {};
            const { activeContactId, messages, contacts } = context;
            if (!activeContactId) return {};
            const msg: Message = {
                id: Date.now(),
                contactId: activeContactId,
                text: event.text,
                incoming: false,
                timestamp: new Date(),
            };
            const m = new Map(messages);
            m.set(activeContactId, [...(m.get(activeContactId) || []), msg]);
            const newContacts = contacts.map(c =>
                c.id === activeContactId ? { ...c, lastMessage: event.text, lastMessageTime: 'now' } : c
            );
            return { messages: m, contacts: newContacts };
        }),
        addIncoming: assign(({ context, event }) => {
            if (event.type !== 'RECEIVE_MESSAGE') return {};
            const { message } = event;
            const { messages, contacts, activeContactId } = context;
            const m = new Map(messages);
            m.set(message.contactId, [...(m.get(message.contactId) || []), message]);
            let delta = 0;
            const newContacts = contacts.map(c => {
                if (c.id === message.contactId) {
                    const isActive = activeContactId === message.contactId;
                    if (!isActive) delta = 1;
                    return {
                        ...c,
                        lastMessage: message.text,
                        lastMessageTime: 'now',
                        unread: isActive ? c.unread : c.unread + 1,
                    };
                }
                return c;
            });
            return { messages: m, contacts: newContacts, totalUnread: context.totalUnread + delta };
        }),
        initContacts: assign(({ event }) => {
            if (event.type !== 'INIT_CONTACTS') return {};
            return {
                contacts: event.contacts,
                totalUnread: event.contacts.reduce((s, c) => s + c.unread, 0),
            };
        }),
        navigateExpand: () => {
            if ((window as any).melinaNavigate) {
                (window as any).melinaNavigate('/messenger');
            } else {
                window.location.href = '/messenger';
            }
        },
    },
}).createMachine({
    id: 'messenger',
    initial: 'idle',
    context: {
        contacts: [],
        activeContactId: null,
        messages: new Map(),
        totalUnread: 0,
    },
    states: {
        idle: {
            on: {
                TOGGLE: 'list',
                RECEIVE_MESSAGE: { actions: 'addIncoming' },
                INIT_CONTACTS: { actions: 'initContacts' },
            },
        },
        list: {
            entry: 'clearContact',
            on: {
                TOGGLE: 'idle',
                CLOSE: 'idle',
                EXPAND: { actions: 'navigateExpand' },
                SELECT_CONTACT: { target: 'chat', actions: ['selectContact', 'markRead'] },
                RECEIVE_MESSAGE: { actions: 'addIncoming' },
            },
        },
        chat: {
            on: {
                BACK: 'list',
                CLOSE: 'idle',
                TOGGLE: 'idle',
                SEND_MESSAGE: { actions: 'addOutgoing' },
                RECEIVE_MESSAGE: { actions: 'addIncoming' },
            },
        },
    },
});

// ─── SVG Icon Components ───

function ExpandIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}

function BackIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5m7 7-7-7 7-7" />
        </svg>
    );
}

function SendIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
    );
}

// ─── Mount ───

export default function mount(): () => void {
    const $ = (id: string) => document.getElementById(id);

    // Scrape initial contacts from SSR-rendered DOM
    const initialContacts: Contact[] = [];
    document.querySelectorAll('#messenger-list .messenger-item').forEach(el => {
        const item = el as HTMLElement;
        initialContacts.push({
            id: parseInt(item.dataset.contactId || '0'),
            name: item.dataset.contactName || '',
            avatar: item.dataset.contactAvatar || '',
            status: item.dataset.contactStatus || 'offline',
            lastMessage: item.querySelector('.messenger-item-preview')?.textContent || '',
            lastMessageTime: item.querySelector('.messenger-item-time')?.textContent || '',
            unread: item.classList.contains('unread') ? 1 : 0,
        });
    });

    // Create & start actor
    const actor = createActor(machine);
    actor.start();
    actor.send({ type: 'INIT_CONTACTS', contacts: initialContacts });

    // Subscribe to state changes → re-render
    actor.subscribe(snapshot => {
        renderRoot(snapshot.value as string, snapshot.context);
    });

    // ─── Render dispatcher ───

    function renderRoot(state: string, ctx: MsgContext) {
        const panel = $('messenger-panel');
        const badge = $('messenger-badge');
        if (!panel) return;

        // Panel visibility
        panel.style.display = state === 'idle' ? 'none' : 'flex';

        // Badge
        if (badge) {
            badge.style.display = ctx.totalUnread > 0 ? 'flex' : 'none';
            badge.textContent = ctx.totalUnread > 99 ? '99+' : String(ctx.totalUnread);
        }

        // Content
        if (state === 'list') renderList(panel, ctx);
        else if (state === 'chat') renderChat(panel, ctx);
    }

    // ─── List View ───

    function renderList(panel: HTMLElement, ctx: MsgContext) {
        const header = (
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1a1a2e]">
                <span class="font-semibold text-white text-sm tracking-wide">Messages</span>
                <div class="flex gap-1">
                    <button
                        class="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Expand"
                        onClick={() => actor.send({ type: 'EXPAND' })}
                    >
                        <ExpandIcon />
                    </button>
                    <button
                        class="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        onClick={() => actor.send({ type: 'CLOSE' })}
                    >
                        <CloseIcon />
                    </button>
                </div>
            </div>
        );

        const list = <div class="flex-1 overflow-y-auto" />;

        for (const c of ctx.contacts) {
            const dotColor = c.status === 'online' ? 'bg-emerald-400' : c.status === 'away' ? 'bg-amber-400' : 'bg-gray-500';
            const avatarGrad = c.status === 'online'
                ? 'from-emerald-500 to-cyan-500'
                : c.status === 'away' ? 'from-amber-500 to-rose-500' : 'from-gray-500 to-gray-600';

            const row = (
                <div
                    class={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 border-b border-white/5 transition-all duration-150 ${c.unread > 0 ? 'bg-indigo-500/10' : ''}`}
                    onClick={() => actor.send({ type: 'SELECT_CONTACT', contactId: c.id })}
                >
                    <div class="relative shrink-0">
                        <div class={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br ${avatarGrad}`}>
                            {c.avatar}
                        </div>
                        <span class={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#16162a] ${dotColor}`} />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline mb-0.5">
                            <span class={`text-sm ${c.unread > 0 ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                                {c.name}
                            </span>
                            <span class="text-[11px] text-gray-500 ml-2 shrink-0">{c.lastMessageTime}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <p class="text-xs text-gray-400 truncate">{c.lastMessage}</p>
                            {c.unread > 0 ? (
                                <span class="shrink-0 min-w-[18px] h-[18px] rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                    {String(c.unread)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            );

            (list as HTMLElement).appendChild(row as Node);
        }

        panel.replaceChildren(header as Node, list as Node);
    }

    // ─── Chat View ───

    function renderChat(panel: HTMLElement, ctx: MsgContext) {
        const contact = ctx.contacts.find(c => c.id === ctx.activeContactId);
        if (!contact) return;

        const isOnline = contact.status === 'online';
        const grad = isOnline ? 'from-emerald-500 to-cyan-500' : 'from-gray-500 to-gray-600';

        const header = (
            <div class="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-[#1a1a2e]">
                <button
                    class="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    onClick={() => actor.send({ type: 'BACK' })}
                >
                    <BackIcon />
                </button>
                <div class={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold bg-gradient-to-br ${grad} shrink-0`}>
                    {contact.avatar}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-white text-sm leading-tight truncate">{contact.name}</div>
                    <div class={`text-[11px] ${isOnline ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {isOnline ? '● Active now' : '○ Offline'}
                    </div>
                </div>
                <button
                    class="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    onClick={() => actor.send({ type: 'CLOSE' })}
                >
                    <CloseIcon />
                </button>
            </div>
        );

        const msgArea = <div class="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2" />;
        const msgs = ctx.messages.get(contact.id) || [];

        if (msgs.length === 0) {
            const emptyEl = (
                <div class="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                    <div class={`w-14 h-14 rounded-full flex items-center justify-center text-lg text-white font-bold bg-gradient-to-br ${grad} opacity-60`}>
                        {contact.avatar}
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-medium text-gray-400">{contact.name}</p>
                        <p class="text-xs text-gray-500 mt-1">No messages yet. Say hi! 👋</p>
                    </div>
                </div>
            );
            (msgArea as HTMLElement).appendChild(emptyEl as Node);
        } else {
            for (const msg of msgs) {
                const bubble = (
                    <div class={`max-w-[80%] px-3.5 py-2 text-sm leading-relaxed ${msg.incoming
                        ? 'bg-white/10 text-gray-200 self-start rounded-2xl rounded-bl-md'
                        : 'bg-indigo-600 text-white self-end rounded-2xl rounded-br-md'
                        }`}>
                        {msg.text}
                    </div>
                );
                (msgArea as HTMLElement).appendChild(bubble as Node);
            }
            requestAnimationFrame(() => {
                (msgArea as HTMLElement).scrollTop = (msgArea as HTMLElement).scrollHeight;
            });
        }

        // Input
        const inputEl = (
            <input
                type="text"
                class="flex-1 bg-white/5 border border-white/10 text-white text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-gray-500"
                placeholder="Type a message..."
            />
        ) as unknown as HTMLInputElement;

        const sendHandler = () => {
            const text = inputEl.value.trim();
            if (!text) return;
            actor.send({ type: 'SEND_MESSAGE', text });
            inputEl.value = '';
            inputEl.focus();
        };

        inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendHandler();
            }
        });

        const inputBar = (
            <div class="px-3 py-2.5 border-t border-white/10 bg-[#1a1a2e] flex gap-2 items-center">
                {inputEl}
                <button
                    class="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors shrink-0"
                    onClick={sendHandler}
                >
                    <SendIcon />
                </button>
            </div>
        );

        panel.replaceChildren(header as Node, msgArea as Node, inputBar as Node);

        // Focus input after render
        requestAnimationFrame(() => inputEl.focus());
    }

    // ─── Toggle Button ───

    const toggleBtn = $('messenger-toggle');
    const handleToggle = () => actor.send({ type: 'TOGGLE' });
    toggleBtn?.addEventListener('click', handleToggle);

    // ─── SSE ───

    let sse: EventSource | null = null;
    try {
        sse = new EventSource('/api/messages');
        sse.onmessage = (ev) => {
            try {
                const d = JSON.parse(ev.data);
                actor.send({
                    type: 'RECEIVE_MESSAGE',
                    message: {
                        id: d.id,
                        contactId: d.contactId,
                        text: d.text,
                        incoming: true,
                        timestamp: new Date(d.timestamp),
                    },
                });
            } catch { }
        };
    } catch { }

    // ─── Cleanup ───

    return () => {
        toggleBtn?.removeEventListener('click', handleToggle);
        actor.stop();
        sse?.close();
    };
}
