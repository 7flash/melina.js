export default function StressTestPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Stress Test</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Render and reconcile large lists to benchmark the VDOM diffing performance.
                    Compare strategies and watch render times.
                </p>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">🔥 Controls</h3>
                <div id="stress-strategy" style={{ marginBottom: '12px' }}>
                    <div className="strategy-selector">
                        <button className="strategy-btn active" data-strategy="auto">Auto</button>
                        <button className="strategy-btn" data-strategy="keyed">Keyed</button>
                        <button className="strategy-btn" data-strategy="sequential">Sequential</button>
                    </div>
                </div>
                <div id="stress-controls" className="btn-group">
                    <button className="btn" data-action="100">100 items</button>
                    <button className="btn btn-accent" data-action="500">500 items</button>
                    <button className="btn" data-action="1000">1,000 items</button>
                    <button className="btn" data-action="2000">2,000 items</button>
                    <button className="btn" data-action="shuffle">🔀 Shuffle All</button>
                    <button className="btn" data-action="clear">🗑️ Clear</button>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📊 Performance</h3>
                <div id="stress-perf" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Click a button to start</span>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📋 Rendered List</h3>
                <div id="stress-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>No items rendered yet.</span>
                </div>
            </div>
        </div>
    );
}
