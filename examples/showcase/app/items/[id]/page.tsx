const items: Record<string, { title: string; description: string; color: string }> = {
    alpha: {
        title: 'Alpha Component',
        description: 'The first dynamic route item. This page was rendered on the server using the [id] parameter from the URL.',
        color: '#818cf8',
    },
    bravo: {
        title: 'Bravo Component',
        description: 'Another dynamic route — same template, different data. The server reads params.id and renders accordingly.',
        color: '#f472b6',
    },
    charlie: {
        title: 'Charlie Component',
        description: 'Dynamic routes support any string as the ID segment. File-based routing maps [id] to :id in the URL pattern.',
        color: '#34d399',
    },
};

export default function DynamicPage({ params }: { params: { id: string } }) {
    const id = params?.id || 'unknown';
    const item = items[id];

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Dynamic Routes</h1>
                    <span className="badge badge-server">Server SSR</span>
                </div>
                <p className="page-description">
                    This page uses file-based <code className="code-inline">[id]</code> parameter routing.
                    The URL segment is available as <code className="code-inline">params.id</code> in the component.
                </p>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">🔗 Current Route</h3>
                <div className="result-box">
                    <div className="stat-row">
                        <span className="stat-label">URL Pattern</span>
                        <span className="stat-value">/items/:id</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">params.id</span>
                        <span className="stat-value" style={{ color: item?.color || 'var(--color-danger)' }}>{id}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">File Path</span>
                        <span className="stat-value" style={{ fontSize: '0.75rem' }}>app/items/[id]/page.tsx</span>
                    </div>
                </div>
            </div>

            {item ? (
                <div className="demo-card">
                    <h3 className="demo-card-title" style={{ color: item.color }}>
                        <span style={{ color: item.color }}>●</span> {item.title}
                    </h3>
                    <p className="demo-card-description">{item.description}</p>
                </div>
            ) : (
                <div className="demo-card">
                    <h3 className="demo-card-title" style={{ color: 'var(--color-danger)' }}>
                        ⚠️ Unknown ID: "{id}"
                    </h3>
                    <p className="demo-card-description">
                        Try navigating to one of the known items below.
                    </p>
                </div>
            )}

            <div className="demo-card">
                <h3 className="demo-card-title">📍 Navigate Between Items</h3>
                <div className="btn-group">
                    {Object.entries(items).map(([key, val]) => (
                        <a key={key} href={`/items/${key}`} data-link className="btn" style={{ borderColor: val.color, color: key === id ? 'white' : val.color, background: key === id ? val.color : 'transparent' }}>
                            {key}
                        </a>
                    ))}
                    <a href="/items/unknown" data-link className="btn">unknown (404 test)</a>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📝 How It Works</h3>
                <div className="code-block">{`// File structure:
// app/items/[id]/page.tsx  →  matches /items/:id

export default function DynamicPage({ params }) {
    const id = params.id;  // "alpha", "bravo", etc.
    const item = items[id];
    return <div>{item.title}: {item.description}</div>;
}`}</div>
            </div>
        </div>
    );
}
