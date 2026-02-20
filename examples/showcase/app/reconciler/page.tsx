export default function ReconcilerPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Reconciler Strategies</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Melina ships three reconciler strategies. Each dominates a specific
                    DOM mutation pattern — run the benchmarks to see consistent winners.
                </p>
            </div>

            {/* ── Replace ─────────────────────────────────────────── */}
            <div className="demo-card" id="case-replace">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>🔄 Replace — Full View Swap</h3>
                    <button className="btn btn-accent btn-sm" data-bench="replace">▶ Run</button>
                </div>
                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.6' }}>{`Scenario: Every element changes TYPE (tab switch, route change)

OLD                          NEW
┌──────────────────┐         ┌──────────────────┐
│ <div>            │         │ <span>           │  ← type mismatch
│   <b> #1         │  ────►  │   <strong> 1.    │  ← type mismatch
│   <i> Item 1     │         │   <code> ITEM 1  │  ← type mismatch
│   <em> 2         │         │   <small> v1     │  ← type mismatch
├──────────────────┤         ├──────────────────┤
│ <div>            │         │ <span>           │
│   <b> #2 ...     │         │   <strong> 2. ...│
└──── × 3000 ──────┘         └──── × 3000 ──────┘

Replace    → remove all, mount all  (two simple loops, no comparisons)
Sequential → for EACH: compare type → mismatch → remove + mount  (N comparisons)
Keyed      → build Map(3000) → 0 matches → remove all + mount all  (map overhead)`}</div>
                <div id="result-replace" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run to benchmark</span>
                </div>
            </div>

            {/* ── Sequential ──────────────────────────────────────── */}
            <div className="demo-card" id="case-sequential">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>📋 Sequential — Append to List</h3>
                    <button className="btn btn-accent btn-sm" data-bench="sequential">▶ Run</button>
                </div>
                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.6' }}>{`Scenario: Append new items to an existing list (chat, logs, feed)

BEFORE (3000 items)         AFTER (3500 items)
┌──────────────────┐        ┌──────────────────┐
│ #1  Item 1       │        │ #1  Item 1       │  ← identical, skip
│ #2  Item 2       │        │ #2  Item 2       │  ← identical, skip
│ ...              │ ────►  │ ...              │
│ #3000 Item 3000  │        │ #3000 Item 3000  │  ← identical, skip
│                  │        │ #3001 New 0  ★   │  ← mount new
│                  │        │ ...        + 500 │
└──────────────────┘        └──────────────────┘

Sequential → index-by-index: skip 3000 unchanged, mount 500 new (minimal work)
Keyed      → build Map(3000), match all by key, mount 500 new   (map overhead)
Replace    → destroy ALL 3000 + create ALL 3500               (total waste)`}</div>
                <div id="result-sequential" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run to benchmark</span>
                </div>
            </div>

            {/* ── Keyed ───────────────────────────────────────────── */}
            <div className="demo-card" id="case-keyed">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>🔑 Keyed — Reorder Complex Items</h3>
                    <button className="btn btn-accent btn-sm" data-bench="keyed">▶ Run</button>
                </div>
                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.6' }}>{`Scenario: Reverse a list of complex items (table sort, drag-drop)
Each item has 12 child elements with text + attributes

BEFORE                         AFTER (reversed)
┌───────────────────────┐      ┌───────────────────────┐
│ key=0    #0  Item 0   │      │ key=2999 #2999  ...   │
│   12 child spans      │      │   12 child spans      │
│ key=1    #1  Item 1   │ ──►  │ key=2998 #2998  ...   │
│   12 child spans      │      │   12 child spans      │
│ ...                   │      │ ...                   │
│ key=2999 #2999 ...    │      │ key=0    #0  Item 0   │
└─── × 3000 ────────────┘      └─── × 3000 ────────────┘

Keyed      → match all by key → 0 prop changes → move ~2999 nodes
Sequential → each position has DIFFERENT content → patch ALL 12 children × 3000
Replace    → destroy ALL 3000×12 + create ALL 3000×12  (36,000 DOM ops)`}</div>
                <div id="result-keyed" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run to benchmark</span>
                </div>
            </div>

            {/* ── Live Playground ──────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">🔬 Live Playground</h3>
                <p className="demo-card-description">
                    Manipulate a list with different strategies and see render times.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Strategy:</span>
                    <div className="strategy-selector" id="strategy-selector">
                        <button className="strategy-btn active" data-strategy="auto">Auto</button>
                        <button className="strategy-btn" data-strategy="keyed">Keyed</button>
                        <button className="strategy-btn" data-strategy="sequential">Sequential</button>
                        <button className="strategy-btn" data-strategy="replace">Replace</button>
                    </div>
                </div>

                <div className="btn-group" style={{ marginBottom: '16px' }}>
                    <button className="btn" data-action="add">+ Add</button>
                    <button className="btn" data-action="remove-last">− Remove</button>
                    <button className="btn" data-action="shuffle">🔀 Shuffle</button>
                    <button className="btn" data-action="reverse">🔃 Reverse</button>
                    <button className="btn" data-action="prepend">⬆ Prepend</button>
                    <button className="btn" data-action="clear">🗑 Clear</button>
                    <button className="btn" data-action="reset">↺ Reset</button>
                </div>

                <div id="playground-stats" style={{ marginBottom: '12px' }}></div>
                <div id="playground-list" className="result-box" style={{
                    maxHeight: '300px', overflow: 'auto', padding: '6px',
                }}></div>
            </div>

            {/* Hidden benchmark workspace */}
            <div id="bench-workspace" style={{ position: 'absolute', left: '-9999px', top: 0 }}></div>

            {/* ── API Reference ─────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">📝 API</h3>
                <div className="code-block">{`// Per-render override:
render(<List items={data} />, el, { reconciler: 'keyed' });

// Global default:
setReconciler('sequential');`}</div>
            </div>
        </div>
    );
}
