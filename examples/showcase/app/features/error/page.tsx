/**
 * Error Boundary info page — explains the feature, links to crash demo
 */
export default function ErrorDemoPage() {
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Error Boundaries</h1>
                <p className="page-description">
                    Graceful error handling with <code>error.tsx</code> — catch page render failures without crashing the whole app.
                </p>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">🧪 Try it: Crash a page</h3>
                <p className="demo-card-description">
                    Click the link below to visit a page that throws during SSR.
                    The <code>error.tsx</code> boundary will catch it and render a user-friendly error page instead.
                </p>
                <a
                    href="/features/error-crash"
                    style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        marginTop: '12px',
                    }}
                >
                    💥 Visit Crashing Page
                </a>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">📁 File Structure</h3>
                <div className="code-block">
                    {`app/features/error-crash/
├── page.tsx        ← Always throws an error
└── error.tsx       ← Error boundary (renders on crash)

# How discovery works:
# When page.tsx throws, Melina walks UP the directory tree
# looking for the nearest error.tsx file.
# 
# It checks:  features/error-crash/error.tsx  ← found! use this
# Would also: features/error.tsx              ← check here next
# And then:   app/error.tsx                   ← root fallback`}
                </div>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">⚙️ How it works</h3>
                <div className="code-block">
                    {`// error.tsx — receives error details as props
export default function ErrorBoundary({ error, pathname }) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{error}</p>
      <a href={pathname}>Try again</a>
    </div>
  );
}

// The error boundary is wrapped in the page's layouts,
// so your sidebar/header stays intact even on errors.
// CSS is also injected correctly.`}
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">🔑 Key behaviors</h3>
                <ul style={{ color: 'var(--color-text-secondary)', lineHeight: '2', paddingLeft: '20px' }}>
                    <li><strong>Layout preservation</strong> — error boundary is wrapped in parent layouts (sidebar stays)</li>
                    <li><strong>Walk-up discovery</strong> — nearest <code>error.tsx</code> up the directory tree wins</li>
                    <li><strong>Props</strong> — receives <code>error</code> (message string) and <code>pathname</code></li>
                    <li><strong>Fallback</strong> — if <code>error.tsx</code> itself crashes, a generic 500 page is shown</li>
                    <li><strong>Dev mode</strong> — shows full stack trace in the error message</li>
                </ul>
            </div>
        </div>
    );
}
