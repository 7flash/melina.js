import { render, setReconciler, getReconciler } from 'melina/client';

const COLORS = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb923c'];
const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa'];

type Item = { id: number; label: string; color: string };
let nextId = 0;

function createItem(): Item {
    const id = nextId++;
    return {
        id,
        label: NAMES[id % NAMES.length] + '-' + id,
        color: COLORS[id % COLORS.length],
    };
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function ItemList({ items, renderTime }: { items: Item[]; renderTime: number }) {
    return (
        <div className="item-list">
            {items.map(item => (
                <div key={item.id} className="list-item">
                    <span className="list-item-key" style={{ color: item.color }}>#{item.id}</span>
                    <span className="list-item-label">{item.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>{item.color}</span>
                </div>
            ))}
            {items.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                    No items. Click "+ Add" to add some.
                </div>
            )}
        </div>
    );
}

function Stats({ strategy, itemCount, lastOp, renderTime }: { strategy: string; itemCount: number; lastOp: string; renderTime: number }) {
    return (
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.8rem' }}>
            <div>
                <span className="stat-label">Strategy: </span>
                <span className="stat-value" style={{ color: 'var(--color-accent)' }}>{strategy}</span>
            </div>
            <div>
                <span className="stat-label">Items: </span>
                <span className="stat-value">{itemCount}</span>
            </div>
            <div>
                <span className="stat-label">Last: </span>
                <span className="stat-value">{lastOp}</span>
            </div>
            <div>
                <span className="stat-label">Render: </span>
                <span className="stat-value" style={{ color: renderTime < 5 ? 'var(--color-success)' : renderTime < 20 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                    {renderTime.toFixed(2)}ms
                </span>
            </div>
        </div>
    );
}

export default function mount() {
    const listRoot = document.getElementById('reconciler-list');
    const statsRoot = document.getElementById('reconciler-stats');
    if (!listRoot || !statsRoot) return;

    // State
    let items: Item[] = Array.from({ length: 8 }, createItem);
    let currentStrategy = 'auto';
    let lastOp = 'init';
    let lastRenderTime = 0;

    function renderAll() {
        const start = performance.now();
        render(<ItemList items={items} renderTime={lastRenderTime} />, listRoot);
        lastRenderTime = performance.now() - start;
        render(<Stats strategy={currentStrategy} itemCount={items.length} lastOp={lastOp} renderTime={lastRenderTime} />, statsRoot);
    }

    renderAll();

    // Strategy selection
    document.getElementById('strategy-selector')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-strategy]');
        if (!btn) return;
        const strategy = (btn as HTMLElement).dataset.strategy!;
        currentStrategy = strategy;
        setReconciler(strategy as any);
        lastOp = `strategy → ${strategy}`;

        // Update active button
        document.querySelectorAll('.strategy-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
    });

    // Controls
    document.getElementById('reconciler-controls')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-action]');
        if (!btn) return;
        const action = (btn as HTMLElement).dataset.action!;

        switch (action) {
            case 'shuffle': items = shuffle(items); lastOp = 'shuffle'; break;
            case 'reverse': items = items.reverse(); lastOp = 'reverse'; break;
            case 'add': items = [...items, createItem()]; lastOp = 'add'; break;
            case 'remove': items = items.slice(0, -1); lastOp = 'remove last'; break;
            case 'reset': nextId = 0; items = Array.from({ length: 8 }, createItem); lastOp = 'reset'; break;
        }
        renderAll();
    });

    return () => {
        render(null, listRoot);
        render(null, statsRoot);
    };
}
