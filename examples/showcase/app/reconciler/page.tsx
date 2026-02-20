export default function ReconcilerPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Reconciler Strategies</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Melina's <code className="code-inline">render()</code> supports three reconciler strategies,
                    each optimized for a different DOM mutation pattern. Run each benchmark
                    to see which strategy dominates — winners are consistent, not random.
                </p>
            </div>

            {/* ── Use Case 1: Replace ──────────────────────────────── */}
            <div className="demo-card" id="case-replace">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>🔄 Replace — Full View Swap</h3>
                    <button className="btn btn-accent btn-sm" data-bench="replace">▶ Run</button>
                </div>

                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.5' }}>{`Scenario: Switch between two completely different views (tab change)

OLD VIEW                   NEW VIEW
┌──────────────┐           ┌──────────────┐
│ <div>        │           │ <section>    │
│   <span>A    │    ───►   │   <article>X │
│   <span>B    │           │   <article>Y │
│   <span>C    │           │   <article>Z │
└──────────────┘           └──────────────┘

Replace:    Remove all → Mount all                ← FASTEST
Sequential: Try patch div→section (fail) → remove+create each
Keyed:      Build map → find 0 matches → remove all + create all + map overhead`}</div>

                <div id="result-replace" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run to benchmark</span>
                </div>
            </div>

            {/* ── Use Case 2: Sequential ──────────────────────────── */}
            <div className="demo-card" id="case-sequential">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>📋 Sequential — Append to List</h3>
                    <button className="btn btn-accent btn-sm" data-bench="sequential">▶ Run</button>
                </div>

                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.5' }}>{`Scenario: Append new messages to a chat / log feed

BEFORE                     AFTER
┌──────────────┐           ┌──────────────┐
│ Item 1       │           │ Item 1       │  ← same position, no work
│ Item 2       │    ───►   │ Item 2       │  ← same position, no work
│ Item 3       │           │ Item 3       │  ← same position, no work
│              │           │ Item 4 (new) │  ← just append
└──────────────┘           └──────────────┘

Sequential: Walk index-by-index, skip unchanged, append new   ← FASTEST
Keyed:      Build key→fiber Map + Set + LIS for ALL items (unnecessary overhead)
Replace:    Destroy everything + rebuild from scratch`}</div>

                <div id="result-sequential" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run to benchmark</span>
                </div>
            </div>

            {/* ── Use Case 3: Keyed ──────────────────────────────── */}
            <div className="demo-card" id="case-keyed">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>🔑 Keyed — Reorder / Sort</h3>
                    <button className="btn btn-accent btn-sm" data-bench="keyed">▶ Run</button>
                </div>

                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.5' }}>{`Scenario: Reverse a sorted list (table sort, drag-drop)

BEFORE                     AFTER
┌──────────────┐           ┌──────────────┐
│ key=1 Item A │           │ key=3 Item C │  ← node MOVED, not recreated
│ key=2 Item B │    ───►   │ key=2 Item B │  ← stays in place (LIS)
│ key=3 Item C │           │ key=1 Item A │  ← node MOVED, not recreated
└──────────────┘           └──────────────┘

Keyed:      Match by key → move 2 nodes, keep 1 (LIS)        ← FASTEST
Sequential: Position 0 has different content → patches all props on every node
Replace:    Destroy ALL nodes + create ALL nodes from scratch`}</div>

                <div id="result-keyed" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run to benchmark</span>
                </div>
            </div>

            {/* ── Live Playground ─────────────────────────────────── */}
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

            {/* ── API Reference ────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">📝 API</h3>
                <div className="code-block">{`// Per-render override (recommended):
render(<List items={data} />, el, { reconciler: 'keyed' });

// Global default:
setReconciler('sequential');`}</div>
            </div>
        </div>
    );
}
