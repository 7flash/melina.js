export default function MiddlewareDemoPage() {
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">API Middleware</h1>
                <p className="page-description">
                    Run code before every request — authentication, logging, rate limiting, or blocking.
                </p>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">🧪 Try it: Get blocked</h3>
                <p className="demo-card-description">
                    This page has a <code>middleware.ts</code> file in its directory. The middleware
                    checks for <code>?blocked</code> in the URL — if present, it short-circuits with a 403 response.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <a
                        href="/features/middleware?blocked"
                        style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: 'white',
                            borderRadius: '8px',
                            fontWeight: '600',
                            textDecoration: 'none',
                        }}
                    >
                        🛡️ Visit with ?blocked
                    </a>
                    <a
                        href="/features/middleware"
                        style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'var(--color-text)',
                            borderRadius: '8px',
                            fontWeight: '500',
                            textDecoration: 'none',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        Visit normally ✓
                    </a>
                </div>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">📁 File Structure</h3>
                <div className="code-block">
                    {`app/features/middleware/
├── middleware.ts    ← Runs before page.tsx on every request
└── page.tsx        ← This page (only renders if middleware allows)

# Middleware chain (root → page):
# If you have middleware at multiple levels, they run outermost first:
#   app/middleware.ts           ← runs 1st (global)
#   app/features/middleware.ts  ← runs 2nd (section)
#   app/features/middleware/middleware.ts  ← runs 3rd (page)`}
                </div>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">⚙️ How middleware works</h3>
                <div className="code-block">
                    {`// middleware.ts
export default async function middleware(req: Request) {
  const url = new URL(req.url);
  
  // Option 1: Block the request (return a Response)
  if (url.searchParams.has('blocked')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Option 2: Let it through (return void / nothing)
  console.log(\`[\${req.method}] \${url.pathname}\`);
  // no return = continue to next middleware or page
}`}
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">🔑 Use cases</h3>
                <ul style={{ color: 'var(--color-text-secondary)', lineHeight: '2', paddingLeft: '20px' }}>
                    <li><strong>Authentication</strong> — check session/token, redirect to login if missing</li>
                    <li><strong>Rate limiting</strong> — count requests per IP, return 429 if exceeded</li>
                    <li><strong>Logging</strong> — log every request with timing information</li>
                    <li><strong>CORS headers</strong> — add Access-Control headers to API responses</li>
                    <li><strong>A/B testing</strong> — set cookies to route users to different page variants</li>
                    <li><strong>Geolocation</strong> — redirect based on request IP/country</li>
                </ul>
            </div>
        </div>
    );
}
