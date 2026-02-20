export default function ReconcilerPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Reconciler Strategies</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Melina ships three reconciler strategies plus an <code className="code-inline">auto</code> mode
                    that picks the best one per-diff. Each benchmark below is designed so a specific
                    strategy wins — and <code className="code-inline">auto</code> stays close to the winner.
                </p>
            </div>

            {/* ── Replace ─────────────────────────────────────────── */}
            <div className="demo-card" id="case-replace">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>🔄 Replace — Full Type Swap</h3>
                    <button className="btn btn-accent btn-sm" data-bench="replace">▶ Run</button>
                </div>
                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.6' }}>{`Every element changes TYPE — old <div>/<span> → new <section>/<code>

                       Pos 0        Pos 1      ...   Pos N
 OLD:                 <div>        <div>             <div>
   children:          <span> #1    <span> #2          <span> #N
                       ↓  X         ↓  X               ↓  X
 NEW:                 <section>    <section>          <section>
   children:          <code> 1.    <code> 2.          <code> N.

Type mismatch everywhere → ALL strategies do remove+create
Replace: two tight loops (remove all → mount all)        ← fewest ops
Others:  per-element type check + branch + positioning overhead`}</div>
                <div id="result-replace" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run</span>
                </div>
            </div>

            {/* ── Sequential ──────────────────────────────────────── */}
            <div className="demo-card" id="case-sequential">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>📋 Sequential — Append (no keys)</h3>
                    <button className="btn btn-accent btn-sm" data-bench="sequential">▶ Run</button>
                </div>
                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.6' }}>{`Append items to a list that has NO keys (chat, logs, feed)

 index:  0      1     ...  1999     2000    ...  2399
 OLD:   Item 0  Item 1     Item 1999
 NEW:   Item 0  Item 1     Item 1999  New 0       New 399
         │       │           │         │            │
         skip    skip        skip      mount        mount
         (0 work per item)             (only new items created)

Sequential: walks index-by-index, skips identical items, appends new
Keyed:      without keys → same as sequential but pays key-scan overhead
Replace:    destroys everything + rebuilds                ← total waste`}</div>
                <div id="result-sequential" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run</span>
                </div>
            </div>

            {/* ── Keyed ───────────────────────────────────────────── */}
            <div className="demo-card" id="case-keyed">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>🔑 Keyed — Prepend to List</h3>
                    <button className="btn btn-accent btn-sm" data-bench="keyed">▶ Run</button>
                </div>
                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.6' }}>{`Prepend 500 new items to a 2000-item keyed list

 OLD:  [A₁, A₂, A₃, ........., A₂₀₀₀]
 NEW:  [B₁, B₂, ... B₅₀₀, A₁, A₂, A₃, ........., A₂₀₀₀]
                           ↑ same items, shifted right

Keyed:      match A₁-A₂₀₀₀ by key → identical props → 0 patches
            mount B₁-B₅₀₀ at front → 500 creates + ~500 insertBefore
            LIS says A-items still in order → 0 moves needed

Sequential: position 0 was A₁, now B₁ → patches ALL props
            position 1 was A₂, now B₂ → patches ALL props
            ... EVERY position gets different content → patches ALL 2000 items
            then mounts 500 new at end → 14,000+ DOM writes total

Replace:    destroys all 2000 + creates all 2500         ← catastrophic`}</div>
                <div id="result-keyed" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run</span>
                </div>
            </div>

            {/* ── Auto ────────────────────────────────────────────── */}
            <div className="demo-card" id="case-auto">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="demo-card-title" style={{ margin: 0 }}>🤖 Auto — Never Wins, Never Loses</h3>
                    <button className="btn btn-accent btn-sm" data-bench="auto">▶ Run</button>
                </div>
                <div className="code-block" style={{ margin: '12px 0', fontSize: '0.72rem', lineHeight: '1.6' }}>{`Mixed workload: prepend 200 + update labels + append 200

Auto inspects each diff for key props:
  keys found?  → use keyed  (optimal for prepend/reorder)
  no keys?     → use sequential  (optimal for append/update)

Expected: auto tracks the winner closely in every scenario.
It's the safe default — never the wrong choice.`}</div>
                <div id="result-auto" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click ▶ Run</span>
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

            {/* Hidden workspace */}
            <div id="bench-workspace" style={{ position: 'absolute', left: '-9999px', top: 0 }}></div>

            {/* ── API ──────────────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">📝 API</h3>
                <div className="code-block">{`// Per-render override:
render(<List />, el, { reconciler: 'keyed' });

// Global default:
setReconciler('sequential');

// Auto (default) — inspects children for keys each diff:
setReconciler('auto');  // keys → keyed, no keys → sequential`}</div>
            </div>
        </div>
    );
}
