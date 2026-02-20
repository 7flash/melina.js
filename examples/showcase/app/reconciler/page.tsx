export default function ReconcilerPage() {
    return (
        <div>
            <h1 className="page-title">Reconciler Strategies</h1>
            <p className="page-subtitle">
                Melina ships four reconciler strategies. Each makes different trade-offs between
                speed, correctness, and DOM preservation. Switch strategies in real-time and run
                benchmarks to see the difference.
            </p>

            {/* ── Strategy cards ──────────────────────────────────────── */}
            <div className="strategy-overview" style={{ marginBottom: '24px' }}>
                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>🔄 Replace</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Nuke & rebuild — removes all children, mounts from scratch. Zero diffing overhead.
                        Best when DOM state doesn't matter.
                    </div>
                    <div style={{ fontSize: '0.7rem' }}>
                        <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}>O(1) diff</span>
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)', marginLeft: '4px' }}>Loses DOM state</span>
                    </div>
                </div>

                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>📋 Sequential</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Index-based patching — compares children by position. Fast for stable lists
                        where items don't move.
                    </div>
                    <div style={{ fontSize: '0.7rem' }}>
                        <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}>O(n) linear</span>
                        <span className="badge" style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)', marginLeft: '4px' }}>No reorder</span>
                    </div>
                </div>

                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>🔑 Keyed</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Key-to-fiber map + LIS — moves nodes instead of re-creating them.
                        Preserves DOM state across reorders.
                    </div>
                    <div style={{ fontSize: '0.7rem' }}>
                        <span className="badge" style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--color-warning)' }}>O(n log n)</span>
                        <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', marginLeft: '4px' }}>Preserves state</span>
                    </div>
                </div>

                <div className="strategy-info-card">
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>🤖 Auto</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        Inspects children for keys at each diff — picks keyed when keys exist,
                        sequential otherwise. Smart default.
                    </div>
                    <div style={{ fontSize: '0.7rem' }}>
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)' }}>Adaptive</span>
                    </div>
                </div>
            </div>

            {/* ── Benchmark Arena ─────────────────────────────────────── */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h2 className="section-title">🏁 Benchmark Arena</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '16px' }}>
                    Run real DOM operations through each strategy. Each scenario is executed 5 times and averaged.
                    The benchmark measures actual render time (the time <code>render()</code> takes to diff + patch the DOM).
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <button className="btn btn-accent" data-bench="all" id="bench-run-all">▶ Run All Scenarios</button>
                    <button className="btn" data-bench="shuffle">🔀 Shuffle</button>
                    <button className="btn" data-bench="reverse">🔃 Reverse</button>
                    <button className="btn" data-bench="prepend">⬆ Prepend 50</button>
                    <button className="btn" data-bench="remove">✂ Remove Half</button>
                    <button className="btn" data-bench="append">⬇ Append 50</button>
                    <button className="btn" data-bench="update-text">📝 Text Update</button>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '12px' }}>
                    List size: <strong>500 items</strong> · Runs per scenario: <strong>5</strong>
                </div>

                <div id="bench-results">
                    <span style={{ color: 'var(--color-muted)' }}>Click a scenario or "Run All" to start.</span>
                </div>

                {/* Hidden workspace for benchmark DOM operations */}
                <div id="bench-workspace" style={{ position: 'absolute', left: '-9999px', top: 0 }}></div>
            </div>

            {/* ── Live Playground ─────────────────────────────────────── */}
            <div className="card">
                <h2 className="section-title">🔬 Live Playground</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '12px' }}>
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

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <button className="btn" data-action="add">+ Add</button>
                    <button className="btn" data-action="remove-last">− Remove Last</button>
                    <button className="btn" data-action="shuffle">🔀 Shuffle</button>
                    <button className="btn" data-action="reverse">🔃 Reverse</button>
                    <button className="btn" data-action="prepend">⬆ Prepend</button>
                    <button className="btn" data-action="clear">🗑 Clear</button>
                    <button className="btn" data-action="reset">↺ Reset</button>
                </div>

                <div id="playground-stats" style={{ marginBottom: '12px' }}></div>

                <div id="playground-list" style={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    padding: '6px',
                }}></div>
            </div>
        </div>
    );
}
