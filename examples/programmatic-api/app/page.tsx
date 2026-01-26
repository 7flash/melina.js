import Counter from './components/Counter';

export default function HomePage() {
    return (
        <div>
            <h2>Welcome!</h2>

            <p>
                This page demonstrates two key Melina features:
            </p>

            <ul>
                <li><strong>Programmatic API</strong> — Server started via <code>bun run server.ts</code></li>
                <li><strong>Auto-wrapping</strong> — Counter uses clean <code>'use client'</code> syntax, no manual imports!</li>
            </ul>

            <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: '#fff7ed',
                borderRadius: '8px',
                border: '1px solid #fed7aa'
            }}>
                <h3 style={{ margin: 0, marginBottom: '1rem' }}>Interactive Counter Island</h3>
                <Counter initialCount={0} />
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h3>Custom Middleware Demo</h3>
                <p>
                    Try visiting <a href="/health">/health</a> — this endpoint is handled by
                    custom middleware before Melina's router.
                </p>
            </div>
        </div>
    );
}
