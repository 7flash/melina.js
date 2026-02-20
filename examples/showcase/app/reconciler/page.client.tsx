import { render, setReconciler, getReconciler } from 'melina/client';

// ─── Data Generation ────────────────────────────────────────────────────────────

const COLORS = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fb923c'];
const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa'];

type Item = { id: number; label: string; color: string };
let nextId = 0;

function createItem(): Item {
    const id = nextId++;
    return { id, label: NAMES[id % NAMES.length] + '-' + id, color: COLORS[id % COLORS.length] };
}

function createItems(count: number): Item[] {
    return Array.from({ length: count }, createItem);
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─── Benchmark Engine ───────────────────────────────────────────────────────────

type BenchResult = { strategy: string; time: number; color: string };
type ScenarioResult = { name: string; icon: string; description: string; results: BenchResult[] };

const STRATEGY_COLORS: Record<string, string> = {
    sequential: '#818cf8',
    keyed: '#f472b6',
    auto: '#34d399',
};

const BENCH_SIZE = 500;
const BENCH_RUNS = 3; // average over N runs

function runBenchmark(
    scenario: string,
    root: HTMLElement,
): ScenarioResult {
    const strategies = ['sequential', 'keyed', 'auto'] as const;
    const results: BenchResult[] = [];

    for (const strategy of strategies) {
        setReconciler(strategy);
        const times: number[] = [];

        for (let run = 0; run < BENCH_RUNS; run++) {
            nextId = 0;
            const items = createItems(BENCH_SIZE);

            // Mount initial list
            render(<ItemList items={items} />, root);

            // Apply the mutation
            let mutated: Item[];
            switch (scenario) {
                case 'shuffle':
                    mutated = shuffle(items);
                    break;
                case 'reverse':
                    mutated = [...items].reverse();
                    break;
                case 'prepend':
                    mutated = [...createItems(50), ...items];
                    break;
                case 'remove-middle': {
                    const mid = Math.floor(items.length / 2);
                    mutated = [...items.slice(0, mid - 25), ...items.slice(mid + 25)];
                    break;
                }
                case 'append':
                    mutated = [...items, ...createItems(50)];
                    break;
                case 'text-update':
                    mutated = items.map(item => ({ ...item, label: item.label + '!' }));
                    break;
                default:
                    mutated = items;
            }

            // Measure the re-render
            const start = performance.now();
            render(<ItemList items={mutated} />, root);
            times.push(performance.now() - start);
        }

        // Clean up
        render(null, root);

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        results.push({ strategy, time: avg, color: STRATEGY_COLORS[strategy] });
    }

    const scenarios: Record<string, { name: string; icon: string; description: string }> = {
        shuffle: { name: 'Shuffle All', icon: '🔀', description: 'Randomly reorder all items. Keyed wins — LIS minimizes DOM moves.' },
        reverse: { name: 'Reverse', icon: '↕️', description: 'Reverse the entire list. Keyed preserves nodes; sequential recreates all.' },
        prepend: { name: 'Prepend 50', icon: '⬆️', description: 'Insert 50 items at the start. Sequential shifts everything; keyed moves nothing.' },
        'remove-middle': { name: 'Remove Middle', icon: '✂️', description: 'Remove 50 items from the center. Keyed detects deletions precisely.' },
        append: { name: 'Append 50', icon: '➕', description: 'Add 50 items at the end. Both strategies are fast — no reorders needed.' },
        'text-update': { name: 'Text Update', icon: '📝', description: 'Update text in every item (no structural change). Sequential wins — pure index patching.' },
    };

    const meta = scenarios[scenario] || { name: scenario, icon: '🔬', description: '' };
    return { ...meta, results };
}

// ─── Components ─────────────────────────────────────────────────────────────────

function ItemList({ items }: { items: Item[] }) {
    return (
        <div className="item-list">
            {items.map(item => (
                <div key={item.id} className="list-item">
                    <span className="list-item-key" style={{ color: item.color }}>#{item.id}</span>
                    <span className="list-item-label">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

function BenchmarkResults({ scenarios }: { scenarios: ScenarioResult[] }) {
    if (scenarios.length === 0) {
        return <span style={{ color: 'var(--color-muted)' }}>Click a scenario to benchmark, or "Run All" for a full comparison.</span>;
    }

    const maxTime = Math.max(...scenarios.flatMap(s => s.results.map(r => r.time)), 1);

    return (
        <div>
            {scenarios.map((scenario, si) => (
                <div key={si} style={{ marginBottom: si < scenarios.length - 1 ? '20px' : '0' }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '0.85rem' }}>
                        {scenario.icon} {scenario.name}
                        <span style={{ fontWeight: '400', color: 'var(--color-muted)', marginLeft: '8px', fontSize: '0.75rem' }}>
                            {scenario.description}
                        </span>
                    </div>
                    {scenario.results.map((r, ri) => {
                        const barWidth = Math.max(2, (r.time / maxTime) * 100);
                        const isBest = r.time === Math.min(...scenario.results.map(x => x.time));
                        return (
                            <div key={ri} style={{ marginBottom: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                                    <span style={{ color: r.color, fontWeight: isBest ? '700' : '400' }}>
                                        {isBest ? '🏆 ' : ''}{r.strategy}
                                    </span>
                                    <span style={{
                                        color: r.time < 5 ? 'var(--color-success)' : r.time < 20 ? 'var(--color-warning)' : 'var(--color-danger)',
                                        fontWeight: isBest ? '700' : '400',
                                    }}>
                                        {r.time.toFixed(2)}ms
                                    </span>
                                </div>
                                <div className="perf-bar">
                                    <div className="perf-bar-fill" style={{
                                        width: `${barWidth}%`,
                                        background: r.color,
                                        opacity: isBest ? 1 : 0.5,
                                    }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function PlaygroundStats({ strategy, itemCount, lastOp, renderTime }: { strategy: string; itemCount: number; lastOp: string; renderTime: number }) {
    return (
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
            <div>
                <span className="stat-label">Strategy: </span>
                <span className="stat-value" style={{ color: STRATEGY_COLORS[strategy] || 'var(--color-accent)' }}>{strategy}</span>
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

// ─── Mount ──────────────────────────────────────────────────────────────────────

export default function mount() {
    const benchRoot = document.getElementById('benchmark-results');
    const playgroundList = document.getElementById('playground-list');
    const playgroundStats = document.getElementById('playground-stats');
    if (!benchRoot || !playgroundList || !playgroundStats) return;

    // Hidden root for running benchmarks without visual interference
    const benchWorkspace = document.createElement('div');
    benchWorkspace.style.display = 'none';
    document.body.appendChild(benchWorkspace);

    let benchResults: ScenarioResult[] = [];

    // ── Benchmark Arena ──────────────────────────────────────────────────────
    document.getElementById('benchmark-controls')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-scenario]');
        if (!btn) return;
        const scenario = (btn as HTMLElement).dataset.scenario!;

        if (scenario === 'run-all') {
            benchResults = [];
            const allScenarios = ['shuffle', 'reverse', 'prepend', 'remove-middle', 'append', 'text-update'];

            // Show loading state
            render(<span style={{ color: 'var(--color-muted)' }}>Running benchmarks...</span>, benchRoot);

            // Run each scenario sequentially with small delay for UI updates
            let i = 0;
            function runNext() {
                if (i >= allScenarios.length) {
                    // Restore original strategy
                    setReconciler(currentStrategy as any);
                    render(<BenchmarkResults scenarios={benchResults} />, benchRoot!);
                    return;
                }
                const result = runBenchmark(allScenarios[i], benchWorkspace);
                benchResults.push(result);
                render(<BenchmarkResults scenarios={benchResults} />, benchRoot!);
                i++;
                setTimeout(runNext, 10);
            }
            runNext();
        } else {
            const result = runBenchmark(scenario, benchWorkspace);
            // Replace existing result for same scenario or add new
            const idx = benchResults.findIndex(r => r.name === result.name);
            if (idx >= 0) benchResults[idx] = result;
            else benchResults.push(result);

            // Restore strategy after bench
            setReconciler(currentStrategy as any);
            render(<BenchmarkResults scenarios={benchResults} />, benchRoot!);
        }
    });

    // ── Live Playground ──────────────────────────────────────────────────────
    nextId = 0;
    let items: Item[] = createItems(12);
    let currentStrategy = 'auto';
    let lastOp = 'init';
    let lastRenderTime = 0;

    function renderPlayground() {
        const start = performance.now();
        render(<ItemList items={items} />, playgroundList!);
        lastRenderTime = performance.now() - start;
        render(<PlaygroundStats strategy={currentStrategy} itemCount={items.length} lastOp={lastOp} renderTime={lastRenderTime} />, playgroundStats!);
    }

    renderPlayground();

    // Strategy selection
    document.getElementById('strategy-selector')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-strategy]');
        if (!btn) return;
        currentStrategy = (btn as HTMLElement).dataset.strategy!;
        setReconciler(currentStrategy as any);
        lastOp = `strategy → ${currentStrategy}`;
        document.querySelectorAll('#strategy-selector .strategy-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPlayground();
    });

    // Playground controls
    document.getElementById('playground-controls')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-action]');
        if (!btn) return;
        const action = (btn as HTMLElement).dataset.action!;

        switch (action) {
            case 'shuffle': items = shuffle(items); lastOp = 'shuffle'; break;
            case 'reverse': items = items.reverse(); lastOp = 'reverse'; break;
            case 'add': items = [...items, createItem()]; lastOp = 'add'; break;
            case 'remove': items = items.slice(0, -1); lastOp = 'remove last'; break;
            case 'prepend': items = [createItem(), ...items]; lastOp = 'prepend'; break;
            case 'reset': nextId = 0; items = createItems(12); lastOp = 'reset'; break;
        }
        renderPlayground();
    });

    return () => {
        render(null, benchRoot);
        render(null, playgroundList);
        render(null, playgroundStats);
        benchWorkspace.remove();
    };
}
