import { render, setReconciler } from 'melina/client';

type Item = { id: number; value: string; hue: number };

let nextId = 0;
function generateItems(count: number): Item[] {
    return Array.from({ length: count }, () => {
        const id = nextId++;
        return {
            id,
            value: `Item-${id.toString(36).toUpperCase()}`,
            hue: (id * 47) % 360,
        };
    });
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function ItemList({ items }: { items: Item[] }) {
    return (
        <div className="item-list">
            {items.map(item => (
                <div key={item.id} className="list-item">
                    <span className="list-item-key" style={{ color: `hsl(${item.hue}, 70%, 65%)` }}>
                        #{item.id}
                    </span>
                    <span className="list-item-label">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

function PerfDisplay({ results }: { results: { label: string; time: number; count: number; strategy: string }[] }) {
    if (results.length === 0) {
        return <span style={{ color: 'var(--color-muted)' }}>Click a button to start</span>;
    }

    return (
        <div>
            {results.map((r, i) => (
                <div key={i}>
                    <div className="stat-row">
                        <span className="stat-label">{r.label} ({r.count} items, {r.strategy})</span>
                        <span className="stat-value" style={{
                            color: r.time < 10 ? 'var(--color-success)' : r.time < 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}>
                            {r.time.toFixed(2)}ms
                        </span>
                    </div>
                    <div className="perf-bar">
                        <div className="perf-bar-fill" style={{ width: `${Math.min(100, (r.time / 100) * 100)}%` }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function mount() {
    const listRoot = document.getElementById('stress-list');
    const perfRoot = document.getElementById('stress-perf');
    if (!listRoot || !perfRoot) return;

    let items: Item[] = [];
    let perfResults: { label: string; time: number; count: number; strategy: string }[] = [];
    let currentStrategy = 'auto';

    function renderList(label: string) {
        const start = performance.now();
        render(<ItemList items={items} />, listRoot);
        const elapsed = performance.now() - start;

        perfResults = [{ label, time: elapsed, count: items.length, strategy: currentStrategy }, ...perfResults.slice(0, 9)];
        render(<PerfDisplay results={perfResults} />, perfRoot);
    }

    // Strategy selection
    document.getElementById('stress-strategy')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-strategy]');
        if (!btn) return;
        const strategy = (btn as HTMLElement).dataset.strategy!;
        currentStrategy = strategy;
        setReconciler(strategy as any);
        document.querySelectorAll('#stress-strategy .strategy-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });

    // Controls
    document.getElementById('stress-controls')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-action]');
        if (!btn) return;
        const action = (btn as HTMLElement).dataset.action!;

        switch (action) {
            case 'shuffle':
                items = shuffle(items);
                renderList('Shuffle');
                break;
            case 'clear':
                nextId = 0;
                items = [];
                renderList('Clear');
                break;
            default: {
                const count = parseInt(action);
                if (!isNaN(count)) {
                    nextId = 0;
                    items = generateItems(count);
                    renderList(`Generate ${count}`);
                }
            }
        }
    });

    return () => {
        render(null, listRoot);
        render(null, perfRoot);
    };
}
