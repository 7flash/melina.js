import { render, navigate } from 'melina/client';
import { createMachine, createActor } from 'xstate';
import { Icons } from './components';

const widgetMachine = createMachine({
    id: 'widget',
    initial: 'closed',
    states: {
        closed: { on: { TOGGLE: 'open' } },
        open: { on: { TOGGLE: 'closed' } }
    }
});

function Widget({ state, send }: { state: any, send: any }) {
    const isOpen = state.matches('open');
    return (
        <div className="pointer-events-auto flex flex-col items-end gap-4 shadow-none">
            {isOpen && (
                <div className="bg-[#1c1c21] border border-gray-700/50 rounded-2xl shadow-2xl w-80 h-96 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 ring-1 ring-white/10">
                    <header className="bg-[#24242c] p-4 border-b border-gray-700/50 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-medium text-sm text-gray-200">Live Support</span>
                        </div>
                        <button onClick={() => send({ type: 'TOGGLE' })} className="text-gray-400 hover:text-white transition-colors">
                            <Icons.Check className="w-4 h-4 rotate-45" />
                        </button>
                    </header>
                    <div className="flex-1 p-4 text-sm text-gray-400 overflow-y-auto space-y-4 bg-[#141419]">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">AI</div>
                            <div className="bg-[#2a2a35] p-3 rounded-2xl rounded-tl-sm text-gray-300 shadow-sm border border-white/5">
                                Hello! How can I assist you with your agents today?
                            </div>
                        </div>
                    </div>
                    <div className="p-3 border-t border-gray-700/50 bg-[#24242c]">
                        <input type="text" placeholder="Type a message..." className="w-full bg-[#141419] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600" />
                    </div>
                </div>
            )}
            <button
                onClick={() => send({ type: 'TOGGLE' })}
                className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all active:scale-95 border border-white/10 backdrop-blur-sm ${isOpen ? 'bg-gray-700 rotate-90' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
                {isOpen ? <Icons.Check className="w-6 h-6 rotate-45" /> : <span className="text-2xl font-bold mb-1">?</span>}
            </button>
        </div>
    );
}

/** Highlight the active nav link based on current path */
function updateActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach((el) => {
        const link = el as HTMLAnchorElement;
        const href = link.getAttribute('href') || '';
        const isActive = (href === '/' && path === '/') || (href !== '/' && path.startsWith(href));

        if (isActive) {
            link.classList.add('bg-white/10', 'text-white');
            link.classList.remove('text-muted');
        } else {
            link.classList.remove('bg-white/10', 'text-white');
            link.classList.add('text-muted');
        }
    });
}

export default function mount() {
    // Widget
    const root = document.getElementById('global-widget');
    if (root) {
        const actor = createActor(widgetMachine);
        actor.subscribe((snapshot: any) => {
            render(<Widget state={snapshot} send={actor.send} />, root);
        });
        actor.start();
    }

    // Global SPA navigation via data-link
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a[data-link]') as HTMLAnchorElement;
        if (link) {
            if ((e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).shiftKey || (e as MouseEvent).button !== 0) return;
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href) {
                navigate(href).then(() => updateActiveNav());
            }
        }
    });

    // Highlight active nav on load
    updateActiveNav();

    // Update on popstate (back/forward)
    window.addEventListener('popstate', () => {
        setTimeout(updateActiveNav, 50);
    });
}
