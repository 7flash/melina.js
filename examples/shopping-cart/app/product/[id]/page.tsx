/**
 * Product Detail Page — Server Component
 *
 * Dynamic route: /product/:id
 * Renders a full product page with descriptions and specs.
 */
import React from 'react';

const products: Record<number, any> = {
    1: { id: 1, name: 'Wireless Noise-Cancelling Headphones', price: 299.99, image: 'https://picsum.photos/seed/headphones/800/800', category: 'Audio', rating: 4.8, reviews: 1247, description: 'Premium over-ear headphones with adaptive noise cancellation, 30-hour battery life, and Hi-Res Audio support. Multipoint connection lets you switch between devices seamlessly.' },
    2: { id: 2, name: 'Mechanical Keyboard RGB', price: 159.99, image: 'https://picsum.photos/seed/keyboard/800/800', category: 'Peripherals', rating: 4.6, reviews: 832, description: 'Hot-swappable mechanical keyboard with per-key RGB lighting, PBT keycaps, and a solid aluminum frame. Supports QMK/VIA firmware for full customization.' },
    3: { id: 3, name: 'Ultra-Wide Curved Monitor 34"', price: 549.99, image: 'https://picsum.photos/seed/monitor/800/800', category: 'Displays', rating: 4.9, reviews: 456, description: '34-inch UWQHD curved IPS panel with 165Hz refresh rate, 1ms response time, and USB-C PD 90W. HDR400 certified with 98% DCI-P3 color gamut.' },
    4: { id: 4, name: 'Ergonomic Mouse Pro', price: 79.99, image: 'https://picsum.photos/seed/mouse/800/800', category: 'Peripherals', rating: 4.5, reviews: 2103, description: 'Sculpted ergonomic design reduces wrist strain during long sessions. 25,600 DPI optical sensor, 8-button programmable layout, and 70-hour battery.' },
    5: { id: 5, name: 'USB-C Docking Station', price: 189.99, image: 'https://picsum.photos/seed/dockstation/800/800', category: 'Accessories', rating: 4.7, reviews: 621, description: 'Single-cable connection for dual 4K displays, gigabit ethernet, and 100W pass-through charging. 12 ports total including SD/microSD card readers.' },
    6: { id: 6, name: 'Webcam 4K HDR', price: 129.99, image: 'https://picsum.photos/seed/webcam4k/800/800', category: 'Peripherals', rating: 4.4, reviews: 389, description: '4K HDR webcam with AI-powered auto-framing, dual noise-reducing microphones, and adjustable field of view. Works with all major video conferencing apps.' },
    7: { id: 7, name: 'Standing Desk Mat', price: 49.99, image: 'https://picsum.photos/seed/deskmat/800/800', category: 'Accessories', rating: 4.3, reviews: 1562, description: 'Anti-fatigue mat with beveled edges and textured surface. Dense foam core provides all-day comfort at your standing desk.' },
    8: { id: 8, name: 'Portable SSD 2TB', price: 199.99, image: 'https://picsum.photos/seed/ssd2tb/800/800', category: 'Storage', rating: 4.8, reviews: 974, description: 'Blazing-fast 2TB portable SSD with read speeds up to 2,000 MB/s. IP65 water and dust resistant, pocket-sized aluminum shell.' },
};

function stars(rating: number): string {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '⯨' : '') + '☆'.repeat(empty);
}

export default function ProductPage({ params }: { params: { id: string } }) {
    const product = products[parseInt(params.id)];

    if (!product) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-20 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Product not found</h1>
                <a href="/" className="text-accent hover:underline">← Back to products</a>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            <a href="/" className="text-muted hover:text-white text-sm flex items-center gap-1 mb-8 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Back to products
            </a>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="rounded-2xl overflow-hidden bg-secondary border border-border">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full aspect-square object-cover"
                    />
                </div>

                <div
                    className="flex flex-col justify-center"
                    data-product-id={product.id}
                    data-product-name={product.name}
                    data-product-price={product.price}
                    data-product-image={product.image}
                >
                    <p className="text-xs text-muted uppercase tracking-wider mb-2">{product.category}</p>
                    <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>

                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-amber-400 text-base">{stars(product.rating)}</span>
                        <span className="text-muted text-sm">{product.rating} · {product.reviews.toLocaleString()} reviews</span>
                    </div>

                    <p className="text-gray-400 leading-relaxed mb-8">{product.description}</p>

                    <div className="flex items-center gap-6">
                        <span className="text-3xl font-bold text-white">${product.price.toFixed(2)}</span>
                        <button
                            className="add-to-cart-btn bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-accent/20 hover:shadow-accent/40 text-base"
                        >
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
