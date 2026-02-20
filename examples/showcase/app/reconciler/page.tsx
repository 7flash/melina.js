export default function ReconcilerPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Reconciler Playground</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    Melina's VDOM renderer supports three diffing strategies. Switch between them and
                    observe how each handles list mutations differently.
                </p>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">⚙️ Strategy Selector</h3>
                <p className="demo-card-description">
                    <strong>Keyed</strong>: O(n log n) via LIS — best for reorders.
                    <strong> Sequential</strong>: O(n) linear — best for static layouts.
                    <strong> Auto</strong>: inspects children for keys and selects the best strategy.
                </p>
                <div id="strategy-selector" style={{ marginBottom: '16px' }}>
                    <div className="strategy-selector">
                        <button className="strategy-btn active" data-strategy="auto">Auto</button>
                        <button className="strategy-btn" data-strategy="keyed">Keyed</button>
                        <button className="strategy-btn" data-strategy="sequential">Sequential</button>
                    </div>
                </div>
                <div id="reconciler-controls" className="btn-group" style={{ marginBottom: '16px' }}>
                    <button className="btn" data-action="shuffle">🔀 Shuffle</button>
                    <button className="btn" data-action="reverse">↕️ Reverse</button>
                    <button className="btn" data-action="add">➕ Add</button>
                    <button className="btn" data-action="remove">➖ Remove</button>
                    <button className="btn" data-action="reset">🔄 Reset</button>
                </div>
                <div id="reconciler-stats" className="result-box" style={{ marginBottom: '16px' }}>
                    <span style={{ color: 'var(--color-muted)' }}>Loading...</span>
                </div>
                <div id="reconciler-list">
                    <span style={{ color: 'var(--color-muted)' }}>Loading...</span>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📝 How It Works</h3>
                <div className="code-block">{`import { setReconciler, render } from 'melina/client';

// Switch strategy at runtime
setReconciler('keyed');       // O(n log n) via LIS
setReconciler('sequential');  // O(n) linear patch
setReconciler('auto');        // Inspects children for keys

// Render a keyed list — reconciler handles the diff
render(
    <ul>
        {items.map(item => <li key={item.id}>{item.label}</li>)}
    </ul>,
    container
);`}</div>
            </div>
        </div>
    );
}
