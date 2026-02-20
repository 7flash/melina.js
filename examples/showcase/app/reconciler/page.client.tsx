import { render } from 'melina/client';
import type { ReconcilerName } from 'melina/client';

// ─── Types ──────────────────────────────────────────────────────────────────────

type Item = { id: number; label: string; value: number };
type StrategyResult = { strategy: string; avgMs: number };
type BenchResult = {
    description: string;
    winner: string;
    strategies: StrategyResult[];
};

// ─── Data Helpers ───────────────────────────────────────────────────────────────

let nextId = 0;

function createItems(n: number): Item[] {
    return Array.from({ length: n }, () => {
        const id = ++nextId;
        return { id, label: `Item ${id}`, value: id * 7 };
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

// ─── Components ─────────────────────────────────────────────────────────────────

/**
 * "View A" — renders items as <div> with nested spans.
 * Used as the OLD view in the Replace benchmark.
 */
function ViewA({ items }: { items: Item[] }) {
    return (
        <div>
            {items.map(item => (
                <div key={item.id} className="list-item">
                    <span className="list-item-key">#{item.id}</span>
                    <span className="list-item-label">{item.label}</span>
                    <span className="list-item-value">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * "View B" — completely different element structure.
 * Uses <section> > <article> > <p> + <em> instead of <div> > <span>.
 * This forces type mismatches at every level, making diffing wasteful.
 */
function ViewB({ items }: { items: Item[] }) {
    return (
        <section>
            {items.map(item => (
                <article key={`b-${item.id}`} className="list-item">
                    <p className="list-item-key">{item.id}.</p>
                    <em className="list-item-label">{item.label.toUpperCase()}</em>
                    <strong className="list-item-value">val={item.value}</strong>
                </article>
            ))}
        </section>
    );
}

/**
 * Keyed item list — complex items with multiple children to make
 * DOM node creation expensive relative to moving.
 */
function KeyedList({ items }: { items: Item[] }) {
    return (
        <div>
            {items.map(item => (
                <div key={item.id} className="list-item" data-id={item.id}>
                    <span className="list-item-key">#{item.id}</span>
                    <span className="list-item-label">{item.label}</span>
                    <span className="list-item-value">{item.value}</span>
                    <span style={{ opacity: 0.3, fontSize: '0.6rem' }}>{item.id % 2 === 0 ? 'even' : 'odd'}</span>
                </div>
            ))}
        </div>
    );
}

// ── Result display ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: BenchResult }) {
    const sorted = [...result.strategies].sort((a, b) => a.avgMs - b.avgMs);
    const fastest = sorted[0].avgMs;
    const slowest = sorted[sorted.length - 1].avgMs;
    const speedup = slowest > 0 ? (slowest / fastest).toFixed(1) : '?';

    return (
        <div>
            <div style={{
                fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '10px',
            }}>
                {result.description} — <strong style={{ color: 'var(--color-success)' }}>🏆 {result.winner}</strong> wins ({speedup}× faster)
            </div>
            {sorted.map((s, i) => {
                const isWinner = i === 0;
                const barWidth = Math.max(4, (s.avgMs / slowest) * 100);
                const barColor = isWinner ? 'var(--color-success)' : i === sorted.length - 1 ? 'var(--color-danger)' : 'var(--color-accent)';
                return (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginBottom: '6px', fontSize: '0.78rem',
                    }}>
                        <span style={{
                            minWidth: '100px', fontFamily: 'var(--font-mono)',
                            color: isWinner ? 'var(--color-success)' : 'inherit',
                            fontWeight: isWinner ? 700 : 400,
                        }}>
                            {isWinner ? '🏆 ' : '   '}{s.strategy}
                        </span>
                        <div className="perf-bar" style={{ flex: 1 }}>
                            <div className="perf-bar-fill" style={{ width: `${barWidth}%`, background: barColor }}></div>
                        </div>
                        <span style={{
                            minWidth: '75px', textAlign: 'right', fontFamily: 'var(--font-mono)',
                            color: isWinner ? 'var(--color-success)' : i === sorted.length - 1 ? 'var(--color-danger)' : 'inherit',
                            fontWeight: isWinner ? 700 : 400,
                        }}>
                            {s.avgMs.toFixed(2)}ms
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function PlaygroundStats({ strategy, itemCount, lastOp, renderTime }: {
    strategy: string; itemCount: number; lastOp: string; renderTime: number;
}) {
    const timeColor = renderTime < 2 ? 'var(--color-success)' : renderTime < 10 ? 'var(--color-warning)' : 'var(--color-danger)';
    return (
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
            <div><span style={{ color: 'var(--color-muted)' }}>Strategy:</span> <strong>{strategy}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Items:</span> <strong>{itemCount}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Last op:</span> <strong>{lastOp}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Render:</span> <strong style={{ color: timeColor }}>{renderTime.toFixed(2)}ms</strong></div>
        </div>
    );
}

// ─── Benchmark Engine ───────────────────────────────────────────────────────────

const STRATEGIES: ReconcilerName[] = ['replace', 'sequential', 'keyed'];

/**
 * Large list sizes amplify the algorithmic differences.
 * With 3000 items and 15 runs, the winner is consistent and clear.
 */
const LIST_SIZE = 3000;
const APPEND_SIZE = 500;
const RUNS = 15;

type BenchmarkFn = (workspace: HTMLElement) => BenchResult;

/**
 * REPLACE BENCHMARK
 * Swaps between ViewA and ViewB — completely different element types.
 * Replace wins because it skips per-element diff entirely.
 * Sequential wastes time trying to patch div→article (type mismatch → remove+create per element).
 * Keyed wastes time building a Map that finds no matches.
 */
function benchReplace(workspace: HTMLElement): BenchResult {
    const results: StrategyResult[] = [];

    for (const strategy of STRATEGIES) {
        const times: number[] = [];

        for (let run = 0; run < RUNS; run++) {
            nextId = 0;
            const items = createItems(LIST_SIZE);

            // Mount initial view (ViewA)
            render(<ViewA items={items} />, workspace, { reconciler: strategy });

            // Generate completely different items for ViewB
            nextId = 0;
            const itemsB = createItems(LIST_SIZE);

            // Measure: swap to ViewB (different element types everywhere)
            const start = performance.now();
            render(<ViewB items={itemsB} />, workspace, { reconciler: strategy });
            times.push(performance.now() - start);
        }
        workspace.innerHTML = '';

        const avgMs = times.sort((a, b) => a - b).slice(2, -2) // trim outliers
            .reduce((a, b) => a + b, 0) / (times.length - 4 || 1);
        results.push({ strategy, avgMs });
    }

    const winner = results.reduce((best, cur) => cur.avgMs < best.avgMs ? cur : best).strategy;
    return { description: `${LIST_SIZE} items, full view swap (different element types), ${RUNS} runs`, winner, strategies: results };
}

/**
 * SEQUENTIAL BENCHMARK
 * Appends items to a large existing list — items at existing positions stay identical.
 * Sequential wins because index-by-index patching skips unchanged elements in O(1) each,
 * then just appends new nodes. No Map/Set/LIS overhead.
 * Keyed builds a key map for ALL existing items just to match them.
 * Replace destroys everything and rebuilds.
 */
function benchSequential(workspace: HTMLElement): BenchResult {
    const results: StrategyResult[] = [];

    for (const strategy of STRATEGIES) {
        const times: number[] = [];

        for (let run = 0; run < RUNS; run++) {
            nextId = 0;
            const items = createItems(LIST_SIZE);

            // Mount the initial list
            render(<ViewA items={items} />, workspace, { reconciler: strategy });

            // Create the appended list (same items + new ones)
            const appended = [...items, ...createItems(APPEND_SIZE)];

            // Measure: render with appended items
            const start = performance.now();
            render(<ViewA items={appended} />, workspace, { reconciler: strategy });
            times.push(performance.now() - start);
        }
        workspace.innerHTML = '';

        const avgMs = times.sort((a, b) => a - b).slice(2, -2)
            .reduce((a, b) => a + b, 0) / (times.length - 4 || 1);
        results.push({ strategy, avgMs });
    }

    const winner = results.reduce((best, cur) => cur.avgMs < best.avgMs ? cur : best).strategy;
    return { description: `${LIST_SIZE}→${LIST_SIZE + APPEND_SIZE} items appended, ${RUNS} runs`, winner, strategies: results };
}

/**
 * KEYED BENCHMARK
 * Reverses a large list of complex items.
 * Keyed wins because it MOVES existing DOM nodes (via LIS → only 2 nodes need moves in a reversal).
 * Sequential patches every position — each item at index i now has different content,
 * so it updates every prop on every child (expensive for complex items).
 * Replace destroys all nodes and creates new ones from scratch.
 */
function benchKeyed(workspace: HTMLElement): BenchResult {
    const results: StrategyResult[] = [];

    for (const strategy of STRATEGIES) {
        const times: number[] = [];

        for (let run = 0; run < RUNS; run++) {
            nextId = 0;
            const items = createItems(LIST_SIZE);

            // Mount initial list (keyed)
            render(<KeyedList items={items} />, workspace, { reconciler: strategy });

            // Reverse the list (same items, different order)
            const reversed = [...items].reverse();

            // Measure: render reversed list
            const start = performance.now();
            render(<KeyedList items={reversed} />, workspace, { reconciler: strategy });
            times.push(performance.now() - start);
        }
        workspace.innerHTML = '';

        const avgMs = times.sort((a, b) => a - b).slice(2, -2)
            .reduce((a, b) => a + b, 0) / (times.length - 4 || 1);
        results.push({ strategy, avgMs });
    }

    const winner = results.reduce((best, cur) => cur.avgMs < best.avgMs ? cur : best).strategy;
    return { description: `${LIST_SIZE} items reversed (keyed), ${RUNS} runs`, winner, strategies: results };
}

const BENCHMARKS: Record<string, BenchmarkFn> = {
    replace: benchReplace,
    sequential: benchSequential,
    keyed: benchKeyed,
};

// ─── Mount ──────────────────────────────────────────────────────────────────────

export default function mount() {
    const workspace = document.getElementById('bench-workspace');
    const playgroundList = document.getElementById('playground-list');
    const playgroundStats = document.getElementById('playground-stats');

    if (!workspace || !playgroundList || !playgroundStats) {
        console.error('[Reconciler] Missing DOM containers');
        return;
    }

    // ── Per-Card Benchmark Buttons ──────────────────────────────────────────

    document.querySelectorAll('[data-bench]').forEach(btn => {
        btn.addEventListener('click', () => {
            const benchName = (btn as HTMLElement).dataset.bench!;
            const benchFn = BENCHMARKS[benchName];
            const resultEl = document.getElementById(`result-${benchName}`);
            if (!benchFn || !resultEl) return;

            // Disable button during run
            btn.classList.add('disabled');
            render(<span style={{ color: 'var(--color-accent)' }}>⏳ Benchmarking {LIST_SIZE} items × {RUNS} runs...</span>, resultEl);

            // Defer to let UI update
            setTimeout(() => {
                const result = benchFn(workspace!);
                render(<ResultCard result={result} />, resultEl);
                btn.classList.remove('disabled');
            }, 32);
        });
    });

    // ── Live Playground ─────────────────────────────────────────────────────
    nextId = 0;
    let items: Item[] = createItems(12);
    let currentStrategy: ReconcilerName = 'auto';
    let lastOp = 'init';
    let lastRenderTime = 0;

    function ItemList({ items: listItems }: { items: Item[] }) {
        return (
            <div className="item-list">
                {listItems.map(item => (
                    <div className="list-item" key={item.id}>
                        <span className="list-item-key">#{item.id}</span>
                        <span className="list-item-label">{item.label}</span>
                    </div>
                ))}
            </div>
        );
    }

    function renderPlayground() {
        const start = performance.now();
        render(<ItemList items={items} />, playgroundList!, { reconciler: currentStrategy });
        lastRenderTime = performance.now() - start;
        render(
            <PlaygroundStats strategy={currentStrategy} itemCount={items.length} lastOp={lastOp} renderTime={lastRenderTime} />,
            playgroundStats!
        );
    }

    renderPlayground();

    // Strategy selector
    document.getElementById('strategy-selector')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-strategy]');
        if (!btn) return;
        currentStrategy = (btn as HTMLElement).dataset.strategy! as ReconcilerName;
        document.querySelectorAll('#strategy-selector .strategy-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        lastOp = `switch → ${currentStrategy}`;
        renderPlayground();
    });

    // Playground actions
    const ACTIONS: Record<string, () => void> = {
        'add': () => { items = [...items, { id: ++nextId, label: `Item ${nextId}`, value: nextId * 7 }]; lastOp = 'add'; },
        'remove-last': () => { items = items.slice(0, -1); lastOp = 'remove last'; },
        'shuffle': () => { items = shuffle(items); lastOp = 'shuffle'; },
        'reverse': () => { items = [...items].reverse(); lastOp = 'reverse'; },
        'prepend': () => { items = [{ id: ++nextId, label: `Item ${nextId}`, value: nextId * 7 }, ...items]; lastOp = 'prepend'; },
        'clear': () => { items = []; lastOp = 'clear'; },
        'reset': () => { nextId = 0; items = createItems(12); lastOp = 'reset'; },
    };

    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = (btn as HTMLElement).dataset.action!;
            const fn = ACTIONS[action];
            if (fn) { fn(); renderPlayground(); }
        });
    });

    return () => {
        playgroundList!.innerHTML = '';
        playgroundStats!.innerHTML = '';
    };
}
