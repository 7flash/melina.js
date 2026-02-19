/**
 * Products Page — Server Component
 *
 * Renders the product grid as HTML. Each product card has data attributes
 * for the client script to read. Add-to-cart interactivity lives in page.client.tsx.
 */

interface Product {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
    rating: number;
    reviews: number;
    badge?: string;
}

function getProducts(): Product[] {
    return [
        { id: 1, name: 'Wireless Noise-Cancelling Headphones', price: 299.99, image: 'https://picsum.photos/seed/headphones/400/400', category: 'Audio', rating: 4.8, reviews: 1247, badge: 'Best Seller' },
        { id: 2, name: 'Mechanical Keyboard RGB', price: 159.99, image: 'https://picsum.photos/seed/keyboard/400/400', category: 'Peripherals', rating: 4.6, reviews: 832 },
        { id: 3, name: 'Ultra-Wide Curved Monitor 34"', price: 549.99, image: 'https://picsum.photos/seed/monitor/400/400', category: 'Displays', rating: 4.9, reviews: 456, badge: 'New' },
        { id: 4, name: 'Ergonomic Mouse Pro', price: 79.99, image: 'https://picsum.photos/seed/mouse/400/400', category: 'Peripherals', rating: 4.5, reviews: 2103 },
        { id: 5, name: 'USB-C Docking Station', price: 189.99, image: 'https://picsum.photos/seed/dockstation/400/400', category: 'Accessories', rating: 4.7, reviews: 621 },
        { id: 6, name: 'Webcam 4K HDR', price: 129.99, image: 'https://picsum.photos/seed/webcam4k/400/400', category: 'Peripherals', rating: 4.4, reviews: 389, badge: 'Sale' },
        { id: 7, name: 'Standing Desk Mat', price: 49.99, image: 'https://picsum.photos/seed/deskmat/400/400', category: 'Accessories', rating: 4.3, reviews: 1562 },
        { id: 8, name: 'Portable SSD 2TB', price: 199.99, image: 'https://picsum.photos/seed/ssd2tb/400/400', category: 'Storage', rating: 4.8, reviews: 974 },
    ];
}

function stars(rating: number): string {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '⯨' : '') + '☆'.repeat(empty);
}

const badgeColors: Record<string, string> = {
    'Best Seller': 'bg-amber-500',
    'New': 'bg-emerald-500',
    'Sale': 'bg-rose-500',
};

function ProductCard({ product }: { product: Product }) {
    return (
        <article
            className="group bg-secondary border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-border-light hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/5"
            data-product-id={product.id}
            data-product-name={product.name}
            data-product-price={product.price}
            data-product-image={product.image}
        >
            <div className="relative aspect-square overflow-hidden bg-tertiary">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                {product.badge && (
                    <span className={`absolute top-3 left-3 ${badgeColors[product.badge] || 'bg-accent'} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg`}>
                        {product.badge}
                    </span>
                )}
            </div>
            <div className="p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">{product.category}</p>
                <h3 className="text-white font-semibold text-base mb-2 line-clamp-2 min-h-[3rem]">{product.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-amber-400 text-sm">{stars(product.rating)}</span>
                    <span className="text-muted text-xs">({product.reviews.toLocaleString()})</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-white">${product.price.toFixed(2)}</span>
                    <button
                        className="add-to-cart-btn bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-accent/20 hover:shadow-accent/40"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </article>
    );
}

export default function ProductsPage() {
    const products = getProducts();

    return (
        <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Products</h1>
                <p className="text-muted">Premium gear for your setup</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="product-grid">
                {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}
