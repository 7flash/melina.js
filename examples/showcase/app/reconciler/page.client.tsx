import { render, setReconciler, getReconciler } from 'melina/client';
import type { ReconcilerName } from 'melina/client';

// ─── Types ──────────────────────────────────────────────────────────────────────

type Item = { id: number; label: string; color: string };

type StrategyResult = {
    strategy: string;
    avgMs: number;
};

type ScenarioResult = {
    name: string;
    strategies: StrategyResult[];
    winner: string;
};

// ─── Data Helpers ───────────────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];
let nextId = 0;

function makeItem(): Item {
    const id = ++nextId;
    return { id, label: `Item ${id}`, color: COLORS[id % COLORS.length] };
}

function createItems(n: number): Item[] {
    return Array.from({ length: n }, makeItem);
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

function ItemList({ items }: { items: Item[] }) {
    return (
        <div className="item-list">
            {items.map(item => (
                <div key={item.id} style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '4px 8px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    fontSize: '0.8rem',
                }}>
                    <span style={{ color: item.color, minWidth: '40px', fontFamily: 'var(--font-mono)' }}>#{item.id}</span>
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

function PlaygroundStats({ strategy, itemCount, lastOp, renderTime }: {
    strategy: string;
    itemCount: number;
    lastOp: string;
    renderTime: number;
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

function BenchmarkResults({ scenarios }: { scenarios: ScenarioResult[] }) {
    if (scenarios.length === 0) {
        return <span style={{ color: 'var(--color-muted)' }}>Click a scenario or "Run All" to start.</span>;
    }

    return (
        <div>
            {scenarios.map((scenario, si) => {
                const maxTime = Math.max(...scenario.strategies.map(s => s.avgMs), 0.1);

                return (
                    <div key={si} style={{
                        marginBottom: '16px',
                        paddingBottom: '16px',
                        borderBottom: si < scenarios.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>{scenario.name}</div>
                        {scenario.strategies.map((s, i) => {
                            const isWinner = s.strategy === scenario.winner;
                            const barWidth = Math.max(2, (s.avgMs / maxTime) * 100);
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.75rem' }}>
                                    <span style={{ minWidth: '80px', fontFamily: 'var(--font-mono)', color: isWinner ? 'var(--color-success)' : 'var(--color-text)' }}>
                                        {isWinner ? '🏆 ' : '   '}{s.strategy}
                                    </span>
                                    <div className="perf-bar" style={{ flex: 1 }}>
                                        <div className="perf-bar-fill" style={{
                                            width: `${barWidth}%`,
                                            background: isWinner ? 'var(--color-success)' : 'var(--color-accent)',
                                        }}></div>
                                    </div>
                                    <span style={{ minWidth: '60px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                        {s.avgMs.toFixed(2)}ms
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Benchmark Engine ───────────────────────────────────────────────────────────

const STRATEGIES: ReconcilerName[] = ['replace', 'sequential', 'keyed', 'auto'];
const LIST_SIZE = 500;
const RUNS = 5;

type Mutation = (items: Item[]) => Item[];

const SCENARIOS: Record<string, { label: string; mutation: Mutation }> = {
    shuffle: { label: '🔀 Shuffle All', mutation: items => shuffle(items) },
    reverse: { label: '🔃 Reverse', mutation: items => [...items].reverse() },
    prepend: { label: '⬆ Prepend 50', mutation: items => [...createItems(50), ...items] },
    remove: { label: '✂ Remove Half', mutation: items => items.filter((_, i) => i % 2 === 0) },
    append: { label: '⬇ Append 50', mutation: items => [...items, ...createItems(50)] },
    'update-text': { label: '📝 Text Update', mutation: items => items.map(it => ({ ...it, label: `${it.label}!` })) },
};

function runBenchmark(scenarioKey: string, workspace: HTMLElement): ScenarioResult {
    const scenario = SCENARIOS[scenarioKey];
    const results: StrategyResult[] = [];

    for (const strategy of STRATEGIES) {
        const times: number[] = [];
        for (let run = 0; run < RUNS; run++) {
            // Fresh initial render for each run — use per-render override
            nextId = 0;
            const baseItems = createItems(LIST_SIZE);
            render(<ItemList items={baseItems} />, workspace, { reconciler: strategy });

            // Apply mutation and measure re-render with same strategy
            const mutated = scenario.mutation(baseItems);
            const start = performance.now();
            render(<ItemList items={mutated} />, workspace, { reconciler: strategy });
            times.push(performance.now() - start);
        }

        // Cleanup workspace
        render(null as any, workspace, { reconciler: 'replace' });

        const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
        results.push({ strategy, avgMs });
    }

    // Find winner (lowest avg)
    const winner = results.reduce((best, cur) => cur.avgMs < best.avgMs ? cur : best).strategy;

    return { name: scenario.label, strategies: results, winner };
}

// ─── Mount ──────────────────────────────────────────────────────────────────────

export default function mount() {
    const benchResults = document.getElementById('bench-results');
    const benchWorkspace = document.getElementById('bench-workspace');
    const playgroundList = document.getElementById('playground-list');
    const playgroundStats = document.getElementById('playground-stats');

    if (!benchResults || !benchWorkspace || !playgroundList || !playgroundStats) return;

    let allResults: ScenarioResult[] = [];

    // ── Benchmark Arena ─────────────────────────────────────────────────────
    document.querySelectorAll('[data-bench]').forEach(btn => {
        btn.addEventListener('click', () => {
            const scenario = (btn as HTMLElement).dataset.bench!;

            if (scenario === 'all') {
                allResults = [];
                render(<span style={{ color: 'var(--color-accent)' }}>⏳ Running all scenarios...</span>, benchResults!);

                const keys = Object.keys(SCENARIOS);
                let i = 0;

                function runNext() {
                    if (i >= keys.length) {
                        render(<BenchmarkResults scenarios={allResults} />, benchResults!);
                        return;
                    }
                    const result = runBenchmark(keys[i], benchWorkspace!);
                    allResults.push(result);
                    render(<BenchmarkResults scenarios={allResults} />, benchResults!);
                    i++;
                    setTimeout(runNext, 16); // Let the UI breathe
                }
                runNext();
            } else {
                const result = runBenchmark(scenario, benchWorkspace!);
                // Replace existing result for same scenario or add
                const idx = allResults.findIndex(r => r.name === result.name);
                if (idx >= 0) allResults[idx] = result;
                else allResults.push(result);

                render(<BenchmarkResults scenarios={allResults} />, benchResults!);
            }
        });
    });

    // ── Live Playground ─────────────────────────────────────────────────────
    nextId = 0;
    let items: Item[] = createItems(12);
    let currentStrategy: ReconcilerName = 'auto';
    let lastOp = 'init';
    let lastRenderTime = 0;

    function renderPlayground() {
        const start = performance.now();
        render(<ItemList items={items} />, playgroundList!, { reconciler: currentStrategy });
        lastRenderTime = performance.now() - start;
        render(<PlaygroundStats strategy={currentStrategy} itemCount={items.length} lastOp={lastOp} renderTime={lastRenderTime} />, playgroundStats!);
    }

    renderPlayground();

    // Strategy selection
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
        'add': () => { items = [...items, makeItem()]; lastOp = 'add'; },
        'remove-last': () => { items = items.slice(0, -1); lastOp = 'remove last'; },
        'shuffle': () => { items = shuffle(items); lastOp = 'shuffle'; },
        'reverse': () => { items = [...items].reverse(); lastOp = 'reverse'; },
        'prepend': () => { items = [makeItem(), ...items]; lastOp = 'prepend'; },
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
        render(null as any, playgroundList!, { reconciler: 'replace' });
        render(null as any, playgroundStats!, { reconciler: 'replace' });
        render(null as any, benchResults!, { reconciler: 'replace' });
    };
}
