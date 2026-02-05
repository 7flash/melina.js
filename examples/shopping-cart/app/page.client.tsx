/**
 * Products Page — Client Interactivity
 *
 * Handles "Add to Cart" button clicks. Reads product data from the DOM
 * and dispatches a custom event so the layout's cart manager can pick it up.
 *
 * Uses JSX-dom (JSX → real DOM elements, not React).
 */

// ─── Toast Component ─────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
    const el = (
        <div className="toast-enter bg-surface border border-border-light rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 text-sm">
            <span className="text-success text-lg">✓</span>
            <span className="text-white">{message}</span>
        </div>
    ) as HTMLElement;

    setTimeout(() => {
        el.classList.remove('toast-enter');
        el.classList.add('toast-exit');
        el.addEventListener('animationend', () => {
            el.remove();
            onDone();
        }, { once: true });
    }, 2000);

    return el;
}

// ─── "Add to Cart" Button Animation ─────────────────────────────────────────

function animateButton(btn: HTMLElement) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Added';
    btn.classList.add('bg-success');
    btn.classList.remove('bg-accent', 'hover:bg-accent-hover');
    btn.setAttribute('disabled', '');

    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('bg-success');
        btn.classList.add('bg-accent', 'hover:bg-accent-hover');
        btn.removeAttribute('disabled');
    }, 1200);
}

// ─── Mount ───────────────────────────────────────────────────────────────────

export default function mount() {
    const grid = document.getElementById('product-grid');
    const toastContainer = document.getElementById('toast-container');
    if (!grid) return;

    function handleClick(e: Event) {
        const btn = (e.target as HTMLElement).closest('.add-to-cart-btn') as HTMLElement;
        if (!btn) return;

        // Find the product card container (article with full data attributes, not the button)
        const card = btn.closest('[data-product-name]') as HTMLElement;
        if (!card) return;

        const product = {
            id: parseInt(card.dataset.productId!),
            name: card.dataset.productName!,
            price: parseFloat(card.dataset.productPrice!),
            image: card.dataset.productImage!,
        };

        // Dispatch to layout's cart manager
        window.dispatchEvent(new CustomEvent('cart:add', { detail: product }));

        // Button feedback
        animateButton(btn);

        // Toast
        if (toastContainer) {
            const toast = Toast({
                message: `${product.name} added to cart`,
                onDone: () => { },
            });
            toastContainer.appendChild(toast);
        }
    }

    grid.addEventListener('click', handleClick);

    // Cleanup on navigation
    return () => {
        grid.removeEventListener('click', handleClick);
    };
}
