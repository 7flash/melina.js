import { render } from 'melina/client';
import type { ReconcilerName } from 'melina/client';

// ─── Types ──────────────────────────────────────────────────────────────────────

type StrategyResult = { strategy: string; avgMs: number };
type BenchResult = {
    description: string;
    winner: string;
    strategies: StrategyResult[];
};

// ─── Data Helpers ───────────────────────────────────────────────────────────────

let nextId = 0;

// ─── Components ─────────────────────────────────────────────────────────────────

/**
 * SIMPLE item — used for sequential benchmark where items are cheap to patch.
 */
function SimpleItem({ id, label }: { id: number; label: string }) {
    return (
        <div className="list-item" data-id={id}>
            <span className="list-item-key">#{id}</span>
            <span className="list-item-label">{label}</span>
        </div>
    );
}

/**
 * COMPLEX item — used for keyed benchmark. Has 12 child elements with various
 * attributes and text. This makes patching all children VERY expensive compared
 * to just moving the DOM node (insertBefore).
 *
 * When reordered:
 * - Keyed: matches by key → props identical → 0 patches needed → just moves nodes
 * - Sequential: position mismatch → patches ALL 12 children's text + attributes
 */
function ComplexItem({ id, label, val }: { id: number; label: string; val: number }) {
    const even = id % 2 === 0;
    return (
        <div className="list-item" data-id={id} data-val={val} data-even={even ? 'yes' : 'no'}>
            <span className="list-item-key">#{id}</span>
            <span className="list-item-label">{label}</span>
            <span className="list-item-value">{val}</span>
            <span data-tag="a">{even ? '●' : '○'}</span>
            <span data-tag="b">{label.length}</span>
            <span data-tag="c">{val * 3}</span>
            <span data-tag="d">{id % 7}</span>
            <span data-tag="e">{even ? 'even' : 'odd'}</span>
            <span data-tag="f">{Math.floor(val / 10)}</span>
            <span data-tag="g">{'★'.repeat((id % 5) + 1)}</span>
            <span data-tag="h">{id.toString(16)}</span>
            <span data-tag="i">{`${id}-${val}`}</span>
        </div>
    );
}

/**
 * View-A: renders 3000 items as <div> elements.
 * Used for the Replace benchmark — paired with View-B which uses <span>.
 */
function ViewAItem({ id, label }: { id: number; label: string }) {
    return (
        <div className="list-item" data-id={id}>
            <b className="list-item-key">#{id}</b>
            <i className="list-item-label">{label}</i>
            <em data-x="1">{id * 2}</em>
        </div>
    );
}

/**
 * View-B: renders items as <span> elements with completely different child types.
 * The type mismatch (<div>→<span>) at every position forces all strategies to
 * do remove+create. Replace wins because it skips per-element type comparison.
 */
function ViewBItem({ id, label }: { id: number; label: string }) {
    return (
        <span className="list-item" data-id={id}>
            <strong className="list-item-key">{id}.</strong>
            <code className="list-item-label">{label.toUpperCase()}</code>
            <small data-x="2">v{id}</small>
        </span>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '10px' }}>
                {result.description}
            </div>
            <div style={{ fontSize: '0.8rem', marginBottom: '10px', fontWeight: 600 }}>
                <span style={{ color: 'var(--color-success)' }}>🏆 {result.winner}</span>
                {' '}wins by <span style={{ color: 'var(--color-success)' }}>{speedup}×</span>
            </div>
            {sorted.map((s, i) => {
                const isWinner = i === 0;
                const barWidth = Math.max(4, (s.avgMs / slowest) * 100);
                const barColor = isWinner
                    ? 'var(--color-success)'
                    : i === sorted.length - 1 ? 'var(--color-danger)' : 'var(--color-accent)';
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
                            <div className="perf-bar-fill" style={{
                                width: `${barWidth}%`,
                                background: barColor,
                            }}></div>
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
    const c = renderTime < 2 ? 'var(--color-success)' : renderTime < 10 ? 'var(--color-warning)' : 'var(--color-danger)';
    return (
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
            <div><span style={{ color: 'var(--color-muted)' }}>Strategy:</span> <strong>{strategy}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Items:</span> <strong>{itemCount}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Last op:</span> <strong>{lastOp}</strong></div>
            <div><span style={{ color: 'var(--color-muted)' }}>Render:</span> <strong style={{ color: c }}>{renderTime.toFixed(2)}ms</strong></div>
        </div>
    );
}

// ─── Benchmark Engine ───────────────────────────────────────────────────────────

const STRATEGIES: ReconcilerName[] = ['replace', 'sequential', 'keyed'];
const N = 3000;    // list size
const RUNS = 15;   // runs per strategy (outliers trimmed)

function trimmedMean(times: number[]): number {
    const sorted = [...times].sort((a, b) => a - b);
    // Trim 20% from each end for robust mean
    const trim = Math.floor(sorted.length * 0.2);
    const trimmed = sorted.slice(trim, sorted.length - trim);
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

/**
 * ════════════════════════════════════════════════════════════════
 * REPLACE BENCHMARK — Full View Swap (Different Element Types)
 * ════════════════════════════════════════════════════════════════
 *
 * Old: 3000 × <div> with <b>, <i>, <em> children
 * New: 3000 × <span> with <strong>, <code>, <small> children
 *
 * Every child position has a TYPE MISMATCH (div→span, b→strong, etc.)
 * ALL strategies must remove+create at each position.
 *
 * Replace wins because:
 *   - It does: loop(remove all) → loop(mount all). Two simple loops.
 *   - Sequential does: for each i { compare type → mismatch → remove + mount }
 *     paying string comparison + branch overhead per element.
 *   - Keyed does: Build Map(3000) + for each i { Map.get → miss } → remove all + mount all
 *     paying full Map allocation + lookup overhead.
 */
function benchReplace(workspace: HTMLElement): BenchResult {
    const results: StrategyResult[] = [];

    const itemsA = Array.from({ length: N }, (_, i) => ({ id: i, label: `Item ${i}` }));
    const itemsB = Array.from({ length: N }, (_, i) => ({ id: N + i, label: `Alt ${i}` }));

    for (const strategy of STRATEGIES) {
        const times: number[] = [];
        for (let run = 0; run < RUNS; run++) {
            // Mount View A
            render(
                <div>{itemsA.map(it => <ViewAItem key={it.id} id={it.id} label={it.label} />)}</div>,
                workspace, { reconciler: strategy },
            );

            // Measure: swap to View B (different element types everywhere)
            const start = performance.now();
            render(
                <div>{itemsB.map(it => <ViewBItem key={it.id} id={it.id} label={it.label} />)}</div>,
                workspace, { reconciler: strategy },
            );
            times.push(performance.now() - start);
        }
        workspace.innerHTML = '';
        results.push({ strategy, avgMs: trimmedMean(times) });
    }

    const winner = results.reduce((a, b) => a.avgMs < b.avgMs ? a : b).strategy;
    return { description: `${N} items, div→span swap (all types change), ${RUNS} runs`, winner, strategies: results };
}

/**
 * ════════════════════════════════════════════════════════════════
 * SEQUENTIAL BENCHMARK — Pure Append
 * ════════════════════════════════════════════════════════════════
 *
 * Old: 3000 items
 * New: 3000 items (unchanged) + 500 new items
 *
 * Sequential wins because:
 *   - Walks index 0..2999: same old/new at each position → patchFiber
 *     sees identical VNode → does NOTHING (no DOM writes)
 *   - Walks index 3000..3499: no old fiber → mountVNode (append)
 *   - Total: 0 DOM writes on existing + 500 creates
 *
 *   - Keyed: builds Map(3000) + matches all 3000 by key (3000 Map.get hits) +
 *     appends 500. Same DOM ops but pays Map/Set/LIS overhead.
 *   - Replace: removes ALL 3000 + mounts ALL 3500. Absurd waste.
 */
function benchSequential(workspace: HTMLElement): BenchResult {
    const results: StrategyResult[] = [];

    const baseItems = Array.from({ length: N }, (_, i) => ({ id: i, label: `Item ${i}` }));
    const appendedItems = [
        ...baseItems,
        ...Array.from({ length: 500 }, (_, i) => ({ id: N + i, label: `New ${i}` })),
    ];

    for (const strategy of STRATEGIES) {
        const times: number[] = [];
        for (let run = 0; run < RUNS; run++) {
            // Mount base list
            render(
                <div>{baseItems.map(it => <SimpleItem key={it.id} id={it.id} label={it.label} />)}</div>,
                workspace, { reconciler: strategy },
            );

            // Measure: append 500 items
            const start = performance.now();
            render(
                <div>{appendedItems.map(it => <SimpleItem key={it.id} id={it.id} label={it.label} />)}</div>,
                workspace, { reconciler: strategy },
            );
            times.push(performance.now() - start);
        }
        workspace.innerHTML = '';
        results.push({ strategy, avgMs: trimmedMean(times) });
    }

    const winner = results.reduce((a, b) => a.avgMs < b.avgMs ? a : b).strategy;
    return { description: `${N}→${N + 500} items appended, ${RUNS} runs`, winner, strategies: results };
}

/**
 * ════════════════════════════════════════════════════════════════
 * KEYED BENCHMARK — Reverse Complex Items
 * ════════════════════════════════════════════════════════════════
 *
 * Old: 3000 complex items (12 children each) in order [0, 1, 2, ..., 2999]
 * New: same 3000 items reversed [2999, 2998, ..., 0]
 *
 * Keyed wins because:
 *   - Matches ALL 3000 items by key → patchFiber sees identical props at
 *     each matched pair → ZERO DOM writes needed
 *   - Computes LIS (length ~1 for a reversal) → moves ~2999 nodes
 *   - Total: 2999 insertBefore (DOM tree rearrangement, no creation)
 *
 *   - Sequential: at each position i, old item ≠ new item (different data).
 *     Same <div> tag → patches ALL 12 children + 3 data-attributes per item.
 *     Total: 3000 × (12 text updates + 3 attr updates) = ~45,000 DOM writes
 *
 *   - Replace: removes ALL 3000 nodes (each with 12 children) + creates ALL
 *     3000 new nodes. Total: ~36,000 removes + ~36,000 creates = WAY slower.
 */
function benchKeyed(workspace: HTMLElement): BenchResult {
    const results: StrategyResult[] = [];

    const items = Array.from({ length: N }, (_, i) => ({
        id: i, label: `Item ${i}`, val: i * 7,
    }));
    const reversed = [...items].reverse();

    for (const strategy of STRATEGIES) {
        const times: number[] = [];
        for (let run = 0; run < RUNS; run++) {
            // Mount in order
            render(
                <div>{items.map(it => <ComplexItem key={it.id} id={it.id} label={it.label} val={it.val} />)}</div>,
                workspace, { reconciler: strategy },
            );

            // Measure: reverse
            const start = performance.now();
            render(
                <div>{reversed.map(it => <ComplexItem key={it.id} id={it.id} label={it.label} val={it.val} />)}</div>,
                workspace, { reconciler: strategy },
            );
            times.push(performance.now() - start);
        }
        workspace.innerHTML = '';
        results.push({ strategy, avgMs: trimmedMean(times) });
    }

    const winner = results.reduce((a, b) => a.avgMs < b.avgMs ? a : b).strategy;
    return { description: `${N} complex items (12 children each) reversed, ${RUNS} runs`, winner, strategies: results };
}

const BENCHMARKS: Record<string, (ws: HTMLElement) => BenchResult> = {
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
            const name = (btn as HTMLElement).dataset.bench!;
            const fn = BENCHMARKS[name];
            const el = document.getElementById(`result-${name}`);
            if (!fn || !el) return;

            btn.classList.add('disabled');
            render(<span style={{ color: 'var(--color-accent)' }}>⏳ Benchmarking {N} items × {RUNS} runs...</span>, el);

            setTimeout(() => {
                const result = fn(workspace!);
                render(<ResultCard result={result} />, el);
                btn.classList.remove('disabled');
            }, 32);
        });
    });

    // ── Live Playground ─────────────────────────────────────────────────────

    type PlayItem = { id: number; label: string };
    nextId = 0;
    let items: PlayItem[] = Array.from({ length: 12 }, () => {
        const id = ++nextId;
        return { id, label: `Item ${id}` };
    });
    let currentStrategy: ReconcilerName = 'auto';
    let lastOp = 'init';
    let lastTime = 0;

    function renderPlayground() {
        const t0 = performance.now();
        render(
            <div className="item-list">
                {items.map(it => (
                    <div className="list-item" key={it.id}>
                        <span className="list-item-key">#{it.id}</span>
                        <span className="list-item-label">{it.label}</span>
                    </div>
                ))}
            </div>,
            playgroundList!,
            { reconciler: currentStrategy },
        );
        lastTime = performance.now() - t0;
        render(
            <PlaygroundStats strategy={currentStrategy} itemCount={items.length} lastOp={lastOp} renderTime={lastTime} />,
            playgroundStats!,
        );
    }
    renderPlayground();

    document.getElementById('strategy-selector')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-strategy]');
        if (!btn) return;
        currentStrategy = (btn as HTMLElement).dataset.strategy! as ReconcilerName;
        document.querySelectorAll('#strategy-selector .strategy-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        lastOp = `switch → ${currentStrategy}`;
        renderPlayground();
    });

    function shuffle<T>(arr: T[]): T[] {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const ACTIONS: Record<string, () => void> = {
        'add': () => { const id = ++nextId; items = [...items, { id, label: `Item ${id}` }]; lastOp = 'add'; },
        'remove-last': () => { items = items.slice(0, -1); lastOp = 'remove last'; },
        'shuffle': () => { items = shuffle(items); lastOp = 'shuffle'; },
        'reverse': () => { items = [...items].reverse(); lastOp = 'reverse'; },
        'prepend': () => { const id = ++nextId; items = [{ id, label: `Item ${id}` }, ...items]; lastOp = 'prepend'; },
        'clear': () => { items = []; lastOp = 'clear'; },
        'reset': () => { nextId = 0; items = Array.from({ length: 12 }, () => { const id = ++nextId; return { id, label: `Item ${id}` }; }); lastOp = 'reset'; },
    };

    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const a = (btn as HTMLElement).dataset.action!;
            ACTIONS[a]?.();
            renderPlayground();
        });
    });

    return () => {
        playgroundList!.innerHTML = '';
        playgroundStats!.innerHTML = '';
    };
}
