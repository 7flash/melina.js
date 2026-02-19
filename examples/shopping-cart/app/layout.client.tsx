/**
 * Layout Client Script — Cart Drawer Manager
 *
 * Persists across navigations. Manages the cart state and renders
 * the cart drawer content using component functions.
 *
 * Each "component" is a plain function that returns a real DOM element
 * via JSX-dom. State is managed in a simple store object.
 *
 * Architecture:
 *   store (plain object) → render() → components return DOM → replaceChildren()
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartItem {
    id: number;
    name: string;
    price: number;
    image: string;
    quantity: number;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const store = {
    items: [] as CartItem[],
    open: false,

    add(product: { id: number; name: string; price: number; image: string }) {
        const existing = this.items.find(i => i.id === product.id);
        if (existing) {
            existing.quantity++;
        } else {
            this.items.push({ ...product, quantity: 1 });
        }
        render();
    },

    remove(productId: number) {
        this.items = this.items.filter(i => i.id !== productId);
        render();
    },

    updateQuantity(productId: number, delta: number) {
        const item = this.items.find(i => i.id === productId);
        if (!item) return;
        item.quantity = Math.max(0, item.quantity + delta);
        if (item.quantity === 0) {
            this.remove(productId);
            return;
        }
        render();
    },

    get total(): number {
        return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    },

    get count(): number {
        return this.items.reduce((sum, i) => sum + i.quantity, 0);
    },
};

// ─── Components ──────────────────────────────────────────────────────────────

function QuantityStepper({ item }: { item: CartItem }) {
    return (
        <div className="flex items-center gap-1">
            <button
                className="w-7 h-7 rounded-md bg-tertiary hover:bg-hover text-muted hover:text-white flex items-center justify-center text-sm transition-colors"
                onClick={() => store.updateQuantity(item.id, -1)}
            >
                −
            </button>
            <span className="w-8 text-center text-sm font-medium text-white">{item.quantity}</span>
            <button
                className="w-7 h-7 rounded-md bg-tertiary hover:bg-hover text-muted hover:text-white flex items-center justify-center text-sm transition-colors"
                onClick={() => store.updateQuantity(item.id, 1)}
            >
                +
            </button>
        </div>
    );
}

function RemoveButton({ item }: { item: CartItem }) {
    return (
        <button
            className="text-muted hover:text-rose-400 transition-colors p-1"
            onClick={() => store.remove(item.id)}
            title="Remove"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
        </button>
    );
}

function CartItemRow({ item }: { item: CartItem }) {
    return (
        <div className="flex gap-4 p-4 border-b border-border last:border-b-0 group hover:bg-primary/30 transition-colors">
            <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 rounded-xl object-cover bg-tertiary shrink-0"
            />
            <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-medium truncate mb-1">{item.name}</h4>
                <p className="text-accent font-semibold text-sm">${item.price.toFixed(2)}</p>
                <div className="flex items-center justify-between mt-2">
                    <QuantityStepper item={item} />
                    <div className="flex items-center gap-3">
                        <span className="text-muted text-xs">${(item.price * item.quantity).toFixed(2)}</span>
                        <RemoveButton item={item} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function CartHeader() {
    return (
        <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Cart</span>
                {store.count > 0 && (
                    <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-0.5 rounded-full">
                        {store.count}
                    </span>
                )}
            </h2>
            <button
                className="p-2 rounded-lg hover:bg-hover text-muted hover:text-white transition-colors"
                onClick={() => { store.open = false; render(); updateDrawerVisibility(); }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

function CartEmpty() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="text-5xl mb-4 opacity-30">🛒</div>
            <p className="text-muted text-sm mb-1">Your cart is empty</p>
            <p className="text-muted/60 text-xs">Add some products to get started</p>
        </div>
    );
}

function CartFooter() {
    return (
        <div className="border-t border-border p-5 space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted">Subtotal</span>
                    <span className="text-white">${store.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted">Shipping</span>
                    <span className="text-success text-sm font-medium">Free</span>
                </div>
                <div className="h-px bg-border my-2"></div>
                <div className="flex justify-between">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-white font-bold text-lg">${store.total.toFixed(2)}</span>
                </div>
            </div>
            <button className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98]">
                Checkout
            </button>
        </div>
    );
}

function CartContent() {
    return (
        <div className="flex flex-col h-full">
            <CartHeader />
            {store.items.length === 0 ? (
                <CartEmpty />
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto">
                        {store.items.map(item => <CartItemRow key={item.id} item={item} />)}
                    </div>
                    <CartFooter />
                </>
            )}
        </div>
    );
}

// ─── Render ──────────────────────────────────────────────────────────────────

import { render as mountVNode } from 'melina/client';

function render() {
    const container = document.getElementById('cart-content');
    if (!container) return;

    // Mount VNode tree to container (clears existing content)
    mountVNode(CartContent(), container as HTMLElement);

    // Update badge in header
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const count = store.count;
        badge.textContent = String(count);
        badge.classList.toggle('hidden', count === 0);
    }
}

function updateDrawerVisibility() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay) return;

    if (store.open) {
        drawer.classList.remove('hidden');
        drawer.classList.remove('cart-slide-out');
        drawer.classList.add('cart-slide-in');
        overlay.classList.remove('hidden');
    } else {
        drawer.classList.remove('cart-slide-in');
        drawer.classList.add('cart-slide-out');
        overlay.classList.add('hidden');
        drawer.addEventListener('animationend', () => {
            if (!store.open) drawer.classList.add('hidden');
        }, { once: true });
    }
}

// ─── Mount ───────────────────────────────────────────────────────────────────

export default function mount() {
    const toggle = document.getElementById('cart-toggle');
    const overlay = document.getElementById('cart-overlay');

    // Toggle cart drawer
    const handleToggle = () => {
        store.open = !store.open;
        render();
        updateDrawerVisibility();
    };

    const handleOverlay = () => {
        store.open = false;
        render();
        updateDrawerVisibility();
    };

    toggle?.addEventListener('click', handleToggle);
    overlay?.addEventListener('click', handleOverlay);

    // Listen for add-to-cart events from page scripts
    const handleAdd = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        store.add(detail);
    };
    window.addEventListener('cart:add', handleAdd);

    // Keyboard: Escape closes cart
    const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && store.open) {
            store.open = false;
            render();
            updateDrawerVisibility();
        }
    };
    document.addEventListener('keydown', handleKey);

    // Initial render
    render();

    // Layout scripts persist — return cleanup just in case
    return () => {
        toggle?.removeEventListener('click', handleToggle);
        overlay?.removeEventListener('click', handleOverlay);
        window.removeEventListener('cart:add', handleAdd);
        document.removeEventListener('keydown', handleKey);
    };
}
