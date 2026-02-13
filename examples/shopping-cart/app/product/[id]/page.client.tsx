/**
 * Product Detail Page — Client Interactivity
 *
 * Same pattern as the products grid page: listens for add-to-cart clicks
 * and dispatches events to the layout's cart manager.
 */

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

export default function mount() {
    const toastContainer = document.getElementById('toast-container');

    function handleClick(e: Event) {
        const btn = (e.target as HTMLElement).closest('.add-to-cart-btn') as HTMLElement;
        if (!btn) return;

        const card = btn.closest('[data-product-name]') as HTMLElement;
        if (!card) return;

        const product = {
            id: parseInt(card.dataset.productId!),
            name: card.dataset.productName!,
            price: parseFloat(card.dataset.productPrice!),
            image: card.dataset.productImage!,
        };

        window.dispatchEvent(new CustomEvent('cart:add', { detail: product }));

        // Button feedback
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

        if (toastContainer) {
            toastContainer.appendChild(Toast({ message: `${product.name} added to cart`, onDone: () => { } }));
        }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
}
