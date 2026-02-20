export default function ReconcilerPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Reconciler Strategies</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Melina's <code className="code-inline">render()</code> supports four reconciler strategies.
                    Each one dominates a specific workload. Click <strong>Run All</strong> to
                    benchmark every use case — each strategy wins where it matters.
                </p>
            </div>

            {/* ── Run All Button ──────────────────────────────────────── */}
            <div style={{ marginBottom: '20px' }}>
                <button className="btn btn-accent" id="run-all-btn">▶ Run All Use Cases</button>
                <span id="run-all-status" style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--color-muted)' }}></span>
            </div>

            {/* ── Use Case 1: Replace ──────────────────────────────────── */}
            <div className="demo-card" id="case-replace">
                <h3 className="demo-card-title">
                    🔄 Replace — Full View Swap
                    <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', borderColor: 'rgba(34,197,94,0.25)', marginLeft: '8px', fontSize: '0.65rem' }}>O(1)</span>
                </h3>
                <p className="demo-card-description">
                    <strong>Use case:</strong> Tab switch, page navigation, loading completely new content.
                    Replace nukes the old tree and mounts fresh — zero diffing overhead.
                    When the new content shares nothing with the old, diffing is wasted work.
                </p>
                <div id="result-replace" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Waiting for benchmark...</span>
                </div>
            </div>

            {/* ── Use Case 2: Sequential ──────────────────────────────── */}
            <div className="demo-card" id="case-sequential">
                <h3 className="demo-card-title">
                    📋 Sequential — Append & Text Update
                    <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', borderColor: 'rgba(34,197,94,0.25)', marginLeft: '8px', fontSize: '0.65rem' }}>O(n)</span>
                </h3>
                <p className="demo-card-description">
                    <strong>Use case:</strong> Chat messages, log feeds, updating labels in-place.
                    Sequential patches children by index — no key lookups, no map building.
                    Fastest when items don't move, only grow or change text.
                </p>
                <div id="result-sequential" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Waiting for benchmark...</span>
                </div>
            </div>

            {/* ── Use Case 3: Keyed ──────────────────────────────────── */}
            <div className="demo-card" id="case-keyed">
                <h3 className="demo-card-title">
                    🔑 Keyed — Sort & Reorder
                    <span className="badge" style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)', borderColor: 'rgba(234,179,8,0.25)', marginLeft: '8px', fontSize: '0.65rem' }}>O(n log n)</span>
                </h3>
                <p className="demo-card-description">
                    <strong>Use case:</strong> Table sorting, drag-and-drop, filtering a list.
                    Keyed builds a key→fiber map and uses LIS to move DOM nodes
                    instead of re-creating them — preserving focus, animations, and input state.
                </p>
                <div id="result-keyed" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Waiting for benchmark...</span>
                </div>
            </div>

            {/* ── Use Case 4: Auto ────────────────────────────────────── */}
            <div className="demo-card" id="case-auto">
                <h3 className="demo-card-title">
                    🤖 Auto — Smart Default
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)', borderColor: 'rgba(99,102,241,0.25)', marginLeft: '8px', fontSize: '0.65rem' }}>Adaptive</span>
                </h3>
                <p className="demo-card-description">
                    <strong>Use case:</strong> General-purpose rendering when you don't know the workload.
                    Auto inspects children at each diff — uses keyed when keys exist,
                    sequential otherwise. Never the fastest, but never the wrong choice.
                </p>
                <div id="result-auto" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Waiting for benchmark...</span>
                </div>
            </div>

            {/* ── Live Playground ─────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">🔬 Live Playground</h3>
                <p className="demo-card-description">
                    Manipulate a list in real-time with different strategies. Watch render times change.
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
                    maxHeight: '300px',
                    overflow: 'auto',
                    padding: '6px',
                }}></div>
            </div>

            {/* Hidden benchmark workspace */}
            <div id="bench-workspace" style={{ position: 'absolute', left: '-9999px', top: 0 }}></div>

            {/* ── API Reference ────────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">📝 API</h3>
                <div className="code-block">{`// Per-render override (recommended):
render(<List items={data} />, el, { reconciler: 'keyed' });

// Global default:
setReconciler('keyed');
render(<List items={data} />, el);  // uses keyed`}</div>
            </div>
        </div>
    );
}
