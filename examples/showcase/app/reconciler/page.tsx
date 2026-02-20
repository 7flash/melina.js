export default function ReconcilerPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Reconciler Strategies</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Melina ships four reconciler strategies — each trades speed, correctness, and DOM
                    preservation differently. Switch strategies in real-time and run benchmarks
                    to see the difference.
                </p>
            </div>

            {/* ── Strategy cards ──────────────────────────────────────── */}
            <div className="strategy-overview" style={{ marginBottom: '20px' }}>
                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>🔄 Replace</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Nuke &amp; rebuild — drops all children, mounts from scratch. Zero diffing overhead.
                    </div>
                    <div>
                        <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', borderColor: 'rgba(34,197,94,0.25)' }}>O(1) diff</span>
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.25)', marginLeft: '4px' }}>Loses DOM state</span>
                    </div>
                </div>

                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>📋 Sequential</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Index-based patching — compares children by position. Fast for stable lists.
                    </div>
                    <div>
                        <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', borderColor: 'rgba(34,197,94,0.25)' }}>O(n) linear</span>
                        <span className="badge" style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)', borderColor: 'rgba(234,179,8,0.25)', marginLeft: '4px' }}>No reorder</span>
                    </div>
                </div>

                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>🔑 Keyed</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Key-to-fiber map + LIS — moves nodes instead of re-creating them.
                    </div>
                    <div>
                        <span className="badge" style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)', borderColor: 'rgba(234,179,8,0.25)' }}>O(n log n)</span>
                        <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', borderColor: 'rgba(34,197,94,0.25)', marginLeft: '4px' }}>Preserves state</span>
                    </div>
                </div>

                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>🤖 Auto</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Inspects children for keys — keyed when keys exist, sequential otherwise.
                    </div>
                    <div>
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)', borderColor: 'rgba(99,102,241,0.25)' }}>Adaptive</span>
                    </div>
                </div>
            </div>

            {/* ── Benchmark Arena ─────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">🏁 Benchmark Arena</h3>
                <p className="demo-card-description">
                    Run real DOM operations through each strategy. Each scenario is executed 5 times
                    and averaged. Measures actual <code className="code-inline">render()</code> time
                    (diff + patch).
                </p>

                <div className="btn-group" style={{ marginBottom: '16px' }}>
                    <button className="btn btn-accent" data-bench="all" id="bench-run-all">▶ Run All</button>
                    <button className="btn" data-bench="shuffle">🔀 Shuffle</button>
                    <button className="btn" data-bench="reverse">🔃 Reverse</button>
                    <button className="btn" data-bench="prepend">⬆ Prepend</button>
                    <button className="btn" data-bench="remove">✂ Remove Half</button>
                    <button className="btn" data-bench="append">⬇ Append</button>
                    <button className="btn" data-bench="update-text">📝 Update Text</button>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '12px' }}>
                    List size: <strong>500 items</strong> · Runs per scenario: <strong>5</strong>
                </div>

                <div id="bench-results" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click a scenario or "Run All" to start.</span>
                </div>

                {/* Hidden workspace for benchmark DOM operations */}
                <div id="bench-workspace" style={{ position: 'absolute', left: '-9999px', top: 0 }}></div>
            </div>

            {/* ── Live Playground ─────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">🔬 Live Playground</h3>
                <p className="demo-card-description">
                    Switch strategies and manipulate the list in real-time.
                    Watch for focus loss, animation resets, or glitches when switching strategies.
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

            {/* ── How It Works ────────────────────────────────────────── */}
            <div className="demo-card">
                <h3 className="demo-card-title">📝 How It Works</h3>
                <div className="code-block">{`// Per-render reconciler override
import { render } from 'melina/client';

// Override for a single render call:
render(<MyList items={data} />, el, {
    reconciler: 'keyed'     // 'replace' | 'sequential' | 'keyed' | 'auto'
});

// Or set the global default:
import { setReconciler } from 'melina/client';
setReconciler('keyed');     // all future render() calls use keyed
render(<MyList items={data} />, el);  // uses keyed`}</div>
            </div>
        </div>
    );
}
