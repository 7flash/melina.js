import { render } from 'melina/client';
import type { ReconcilerName } from 'melina/client';

// ─── Types ──────────────────────────────────────────────────────────────────────

type Item = { id: number; label: string; color: string };
type StrategyResult = { strategy: string; avgMs: number };
type UseCaseResult = {
    name: string;
    description: string;
    winner: string;
    strategies: StrategyResult[];
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
                <div className="list-item" key={item.id}>
                    <span className="list-item-key">#{item.id}</span>
                    <span className="list-item-label">{item.label}</span>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }}></span>
                </div>
            ))}
        </div>
    );
}

/** A completely different view — simulates tab swap / page navigation */
function AltView({ items }: { items: Item[] }) {
    return (
        <div className="item-list">
            {items.map(item => (
                <div className="list-item" key={`alt-${item.id}`}>
                    <span className="list-item-key" style={{ color: 'var(--color-warning)' }}>★{item.id}</span>
                    <span className="list-item-label">{item.label.toUpperCase()}</span>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, flexShrink: 0 }}></span>
                </div>
            ))}
        </div>
    );
}

function ResultCard({ result }: { result: UseCaseResult }) {
    const maxTime = Math.max(...result.strategies.map(s => s.avgMs), 0.1);
    return (
        <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '10px' }}>
                {result.description}
            </div>
            {result.strategies.map((s, i) => {
                const isWinner = s.strategy === result.winner;
                const barWidth = Math.max(3, (s.avgMs / maxTime) * 100);
                const barColor = isWinner ? 'var(--color-success)' : 'var(--color-accent)';
                return (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginBottom: '6px', fontSize: '0.78rem',
                    }}>
                        <span style={{
                            minWidth: '90px', fontFamily: 'var(--font-mono)',
                            color: isWinner ? 'var(--color-success)' : 'var(--color-foreground)',
                            fontWeight: isWinner ? 700 : 400,
                        }}>
                            {isWinner ? '🏆 ' : '   '}{s.strategy}
                        </span>
                        <div className="perf-bar" style={{ flex: 1 }}>
                            <div className="perf-bar-fill" style={{ width: `${barWidth}%`, background: barColor }}></div>
                        </div>
                        <span style={{
                            minWidth: '65px', textAlign: 'right', fontFamily: 'var(--font-mono)',
                            color: isWinner ? 'var(--color-success)' : 'inherit',
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

const STRATEGIES: ReconcilerName[] = ['replace', 'sequential', 'keyed', 'auto'];
const LIST_SIZE = 500;
const RUNS = 5;

/**
 * Each use case defines:
 * - setup(): create the initial state and render it
 * - mutation(): transform the state in a way that favors one strategy
 */
type UseCase = {
    name: string;
    description: string;
    expectedWinner: string;
    setup: () => Item[];
    /** Returns [newItems, newView] — newView lets us swap to a completely different component */
    mutate: (items: Item[]) => { items: Item[]; swapView?: boolean };
};

const USE_CASES: UseCase[] = [
    {
        name: 'replace',
        description: 'Swaps 500 items to a completely different view (tab switch). Replace wins because there\'s nothing to diff — nuke and rebuild is O(1).',
        expectedWinner: 'replace',
        setup: () => { nextId = 0; return createItems(LIST_SIZE); },
        mutate: () => {
            nextId = 0;
            return { items: createItems(LIST_SIZE), swapView: true };
        },
    },
    {
        name: 'sequential',
        description: 'Appends 100 items then updates all labels. Sequential wins because items stay in their positions — index-based patching skips key lookups.',
        expectedWinner: 'sequential',
        setup: () => { nextId = 0; return createItems(LIST_SIZE); },
        mutate: (items) => {
            const appended = [...items, ...createItems(100)];
            return { items: appended.map(it => ({ ...it, label: `${it.label} ✓` })) };
        },
    },
    {
        name: 'keyed',
        description: 'Shuffles all 500 items randomly. Keyed wins because it moves existing DOM nodes via key→fiber map instead of recreating them.',
        expectedWinner: 'keyed',
        setup: () => { nextId = 0; return createItems(LIST_SIZE); },
        mutate: (items) => ({ items: shuffle(items) }),
    },
    {
        name: 'auto',
        description: 'Mixed workload: shuffles + appends + text updates. Auto adapts per-diff — it picks keyed when keys exist, sequential otherwise.',
        expectedWinner: 'auto',
        setup: () => { nextId = 0; return createItems(LIST_SIZE); },
        mutate: (items) => {
            // Mixed: shuffle first half, append new items, update labels on last quarter
            const half = Math.floor(items.length / 2);
            const quarter = Math.floor(items.length / 4);
            const shuffled = shuffle(items.slice(0, half));
            const stable = items.slice(half);
            const combined = [...shuffled, ...stable, ...createItems(50)];
            return {
                items: combined.map((it, i) =>
                    i >= combined.length - quarter ? { ...it, label: `${it.label} ★` } : it
                ),
            };
        },
    },
];

function runUseCase(useCase: UseCase, workspace: HTMLElement): UseCaseResult {
    const results: StrategyResult[] = [];

    for (const strategy of STRATEGIES) {
        const times: number[] = [];
        for (let run = 0; run < RUNS; run++) {
            const baseItems = useCase.setup();

            // Initial render
            render(<ItemList items={baseItems} />, workspace, { reconciler: strategy });

            // Apply mutation and measure
            const mutation = useCase.mutate(baseItems);
            const start = performance.now();
            if (mutation.swapView) {
                render(<AltView items={mutation.items} />, workspace, { reconciler: strategy });
            } else {
                render(<ItemList items={mutation.items} />, workspace, { reconciler: strategy });
            }
            times.push(performance.now() - start);
        }

        // Cleanup
        workspace.innerHTML = '';

        const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
        results.push({ strategy, avgMs });
    }

    const winner = results.reduce((best, cur) => cur.avgMs < best.avgMs ? cur : best).strategy;
    return {
        name: useCase.name,
        description: useCase.description,
        winner,
        strategies: results,
    };
}

// ─── Mount ──────────────────────────────────────────────────────────────────────

export default function mount() {
    const workspace = document.getElementById('bench-workspace');
    const playgroundList = document.getElementById('playground-list');
    const playgroundStats = document.getElementById('playground-stats');
    const runAllBtn = document.getElementById('run-all-btn');
    const runAllStatus = document.getElementById('run-all-status');

    if (!workspace || !playgroundList || !playgroundStats || !runAllBtn) {
        console.error('[Reconciler] Missing DOM containers');
        return;
    }

    // ── Benchmark Use Cases ─────────────────────────────────────────────────

    function runSingleCase(useCase: UseCase) {
        const resultEl = document.getElementById(`result-${useCase.name}`);
        if (!resultEl) return;

        render(<span style={{ color: 'var(--color-accent)' }}>⏳ Running...</span>, resultEl);

        // Defer to let UI update
        setTimeout(() => {
            const result = runUseCase(useCase, workspace!);
            render(<ResultCard result={result} />, resultEl);
        }, 16);
    }

    // Run All button
    let running = false;
    runAllBtn.addEventListener('click', () => {
        if (running) return;
        running = true;
        runAllBtn.classList.add('disabled');
        if (runAllStatus) runAllStatus.textContent = '⏳ Running 4 use cases...';

        let i = 0;
        function runNext() {
            if (i >= USE_CASES.length) {
                running = false;
                runAllBtn!.classList.remove('disabled');
                if (runAllStatus) runAllStatus.textContent = '✅ All done';
                return;
            }

            const uc = USE_CASES[i];
            const resultEl = document.getElementById(`result-${uc.name}`);
            if (resultEl) {
                render(<span style={{ color: 'var(--color-accent)' }}>⏳ Running {uc.name}...</span>, resultEl);
            }
            if (runAllStatus) runAllStatus.textContent = `⏳ ${i + 1}/${USE_CASES.length}: ${uc.name}...`;

            setTimeout(() => {
                const result = runUseCase(uc, workspace!);
                if (resultEl) render(<ResultCard result={result} />, resultEl);
                i++;
                setTimeout(runNext, 16);
            }, 16);
        }
        runNext();
    });

    // Individual card click-to-run
    USE_CASES.forEach(uc => {
        const card = document.getElementById(`case-${uc.name}`);
        card?.querySelector('.demo-card-title')?.addEventListener('click', () => {
            if (!running) runSingleCase(uc);
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
        playgroundList.innerHTML = '';
        playgroundStats.innerHTML = '';
    };
}
