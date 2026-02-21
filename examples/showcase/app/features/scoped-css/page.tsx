export default function ScopedCssDemoPage() {
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title scoped-title">Scoped CSS</h1>
                <p className="page-description">
                    Per-page stylesheets that can't leak into other pages — powered by <code>[data-page]</code> auto-prefixing.
                </p>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">🎨 These styles are scoped to THIS page only</h3>
                <p className="demo-card-description">
                    The colored boxes below are styled by <code>page.css</code> in this directory.
                    Navigate to any other page — those styles won't apply there.
                </p>
                <div className="scoped-demo-grid">
                    <div className="scoped-box box-indigo">Indigo</div>
                    <div className="scoped-box box-emerald">Emerald</div>
                    <div className="scoped-box box-amber">Amber</div>
                    <div className="scoped-box box-rose">Rose</div>
                </div>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">📁 File Structure</h3>
                <div className="code-block">
                    {`app/features/scoped-css/
├── page.tsx        ← This page (uses .scoped-box classes)
└── page.css        ← Scoped styles (auto-prefixed at build time)

# What happens at build time:
# 
# INPUT (page.css):
#   .scoped-box { border-radius: 12px; }
# 
# OUTPUT (after buildScopedStyle):
#   [data-page="/features/scoped-css"] .scoped-box { border-radius: 12px; }
#
# The [data-page] prefix ensures these styles
# ONLY match elements inside this specific page.`}
                </div>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">⚙️ How it works</h3>
                <div className="code-block">
                    {`1. Route discovery finds page.css next to page.tsx
2. buildScopedStyle() processes the CSS:
   - Prefixes all selectors with [data-page="/route"]
   - Handles @media, @keyframes, :root, html/body
   - Runs PostCSS (autoprefixer + tailwind)
   - Caches the output (hash-based filename)
3. At runtime:
   - <link> tag injected into <head>
   - data-page attribute set on #melina-page-content
   - Styles only match elements inside this page`}
                </div>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">🔍 Inspect the output</h3>
                <p className="demo-card-description">
                    Open DevTools and check:
                </p>
                <ul style={{ color: 'var(--color-text-secondary)', lineHeight: '2', paddingLeft: '20px' }}>
                    <li><strong>{'<head>'}</strong> — look for a <code>{'<link>'}</code> tag with <code>page-features-scoped-css-*.css</code></li>
                    <li><strong>#melina-page-content</strong> — has <code>data-page="/features/scoped-css"</code> attribute</li>
                    <li><strong>CSS rules</strong> — every selector starts with <code>[data-page="/features/scoped-css"]</code></li>
                </ul>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">vs. CSS Modules &amp; other approaches</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--color-muted)' }}>Approach</th>
                            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--color-muted)' }}>Scoping</th>
                            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--color-muted)' }}>Developer experience</th>
                        </tr>
                    </thead>
                    <tbody style={{ color: 'var(--color-text-secondary)' }}>
                        <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '8px' }}>Global CSS</td>
                            <td style={{ padding: '8px' }}>❌ Leaks everywhere</td>
                            <td style={{ padding: '8px' }}>Simple but dangerous</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '8px' }}>CSS Modules</td>
                            <td style={{ padding: '8px' }}>✅ Hash-based</td>
                            <td style={{ padding: '8px' }}>Must import + use styles.xxx</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '8px' }}>Tailwind</td>
                            <td style={{ padding: '8px' }}>✅ Utility classes</td>
                            <td style={{ padding: '8px' }}>Verbose JSX</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px', fontWeight: '600' }}>Melina page.css</td>
                            <td style={{ padding: '8px' }}>✅ Auto-prefixed</td>
                            <td style={{ padding: '8px', color: '#10b981' }}>Write normal CSS, just works</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
