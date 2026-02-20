export default function ReconcilerPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Reconciler Strategies</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Melina's VDOM renderer supports <strong>pluggable reconciliation strategies</strong>.
                    Each strategy is optimized for different workloads. Run the benchmarks below to see
                    where each one shines — and where it falls behind.
                </p>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📐 Strategy Overview</h3>
                <div className="strategy-overview">
                    <div className="strategy-info-card" style={{ borderLeft: '3px solid #818cf8' }}>
                        <div style={{ fontWeight: '600', color: '#818cf8', marginBottom: '4px' }}>Sequential</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                            O(n) linear patch by index position. No key lookups, no LIS.
                        </div>
                        <div style={{ fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--color-success)' }}>✅ Fastest for in-place updates</span><br />
                            <span style={{ color: 'var(--color-success)' }}>✅ Smallest overhead per diff</span><br />
                            <span style={{ color: 'var(--color-danger)' }}>❌ Cannot detect reorders</span><br />
                            <span style={{ color: 'var(--color-danger)' }}>❌ Recreates nodes when items shift</span>
                        </div>
                    </div>
                    <div className="strategy-info-card" style={{ borderLeft: '3px solid #f472b6' }}>
                        <div style={{ fontWeight: '600', color: '#f472b6', marginBottom: '4px' }}>Keyed</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                            O(n log n) via key→fiber map + Longest Increasing Subsequence.
                        </div>
                        <div style={{ fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--color-success)' }}>✅ Optimal for reorders/insert/delete</span><br />
                            <span style={{ color: 'var(--color-success)' }}>✅ Preserves DOM nodes across moves</span><br />
                            <span style={{ color: 'var(--color-danger)' }}>❌ Higher overhead (Map + Set + LIS)</span><br />
                            <span style={{ color: 'var(--color-danger)' }}>❌ Requires unique keys on children</span>
                        </div>
                    </div>
                    <div className="strategy-info-card" style={{ borderLeft: '3px solid #34d399' }}>
                        <div style={{ fontWeight: '600', color: '#34d399', marginBottom: '4px' }}>Auto</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                            Inspects children for <code className="code-inline">key</code> props and selects the best strategy.
                        </div>
                        <div style={{ fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--color-success)' }}>✅ Zero config — right choice for most apps</span><br />
                            <span style={{ color: 'var(--color-success)' }}>✅ Uses keyed when keys present</span><br />
                            <span style={{ color: 'var(--color-success)' }}>✅ Falls back to sequential otherwise</span><br />
                            <span style={{ color: 'var(--color-muted)' }}>⚡ Default strategy</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">🏁 Benchmark Arena</h3>
                <p className="demo-card-description">
                    Each scenario runs with <strong>500 items</strong> across all three strategies.
                    Results show DOM operations and render time. Lower is better.
                </p>
                <div id="benchmark-controls" className="btn-group" style={{ marginBottom: '16px' }}>
                    <button className="btn" data-scenario="shuffle">🔀 Shuffle All</button>
                    <button className="btn" data-scenario="reverse">↕️ Reverse</button>
                    <button className="btn" data-scenario="prepend">⬆️ Prepend 50</button>
                    <button className="btn" data-scenario="remove-middle">✂️ Remove Middle</button>
                    <button className="btn" data-scenario="append">➕ Append 50</button>
                    <button className="btn" data-scenario="text-update">📝 Text Update</button>
                    <button className="btn btn-accent" data-scenario="run-all">▶ Run All</button>
                </div>
                <div id="benchmark-results" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click a scenario to benchmark, or "Run All" for a full comparison.</span>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">🔬 Live Playground</h3>
                <p className="demo-card-description">
                    Switch strategies in real-time and manipulate the list to feel the difference.
                </p>
                <div id="strategy-selector" style={{ marginBottom: '12px' }}>
                    <div className="strategy-selector">
                        <button className="strategy-btn active" data-strategy="auto">Auto</button>
                        <button className="strategy-btn" data-strategy="keyed">Keyed</button>
                        <button className="strategy-btn" data-strategy="sequential">Sequential</button>
                    </div>
                </div>
                <div id="playground-controls" className="btn-group" style={{ marginBottom: '12px' }}>
                    <button className="btn" data-action="shuffle">🔀 Shuffle</button>
                    <button className="btn" data-action="reverse">↕️ Reverse</button>
                    <button className="btn" data-action="add">➕ Add</button>
                    <button className="btn" data-action="remove">➖ Remove Last</button>
                    <button className="btn" data-action="prepend">⬆️ Prepend</button>
                    <button className="btn" data-action="reset">🔄 Reset</button>
                </div>
                <div id="playground-stats" className="result-box" style={{ marginBottom: '12px' }}>
                    <span style={{ color: 'var(--color-muted)' }}>Loading...</span>
                </div>
                <div id="playground-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <span style={{ color: 'var(--color-muted)' }}>Loading...</span>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📝 Usage</h3>
                <div className="code-block">{`import { setReconciler, render } from 'melina/client';

// Switch strategy at runtime
setReconciler('keyed');       // O(n log n) — reorderable lists
setReconciler('sequential');  // O(n)       — forms, static layouts
setReconciler('auto');        // Default    — inspects children for keys

// Or plug in a custom reconciler function
setReconciler((parentFiber, parentNode, oldFibers, newVNodes, ctx) => {
    // your custom diffing logic
});`}</div>
            </div>
        </div>
    );
}
