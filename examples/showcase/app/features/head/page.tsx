import { Head } from 'melina/web';

export default function HeadDemoPage() {
    return (
        <div className="page">
            <Head>
                <title>Head Demo — Custom Page Title | Melina.js</title>
                <meta name="description" content="This page demonstrates the Head component for declarative head tag management." />
                <meta name="theme-color" content="#6366f1" />
                <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>🧠</text></svg>" />
            </Head>

            <div className="page-header">
                <h1 className="page-title">{'<Head>'} Component</h1>
                <p className="page-description">
                    Declarative head tag management — set title, meta, and link tags from anywhere in your component tree.
                </p>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">🧠 What does this page demonstrate?</h3>
                <p className="demo-card-description">
                    Open your browser's <strong>developer tools</strong> and check the <code>{'<head>'}</code> section. You'll see:
                </p>
                <ul style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
                    <li><strong>Custom title</strong> — "Head Demo — Custom Page Title | Melina.js" (check the browser tab)</li>
                    <li><strong>Meta description</strong> — SEO-friendly page description for search engines</li>
                    <li><strong>Theme color</strong> — <code>#6366f1</code> (indigo, visible in mobile browsers)</li>
                    <li><strong>Custom favicon</strong> — 🧠 emoji as the page icon</li>
                </ul>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">💡 Why use {'<Head>'}?</h3>
                <div className="code-block">
                    {`// ❌ Without <Head> — every page has the same title
// layout.tsx sets <title>Melina.js Showcase</title>
// and you can't change it from a page

// ✅ With <Head> — each page controls its own head tags
import { Head } from 'melina/web';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About Us | My App</title>
        <meta name="description" content="Learn about us" />
        <meta property="og:title" content="About Us" />
      </Head>
      <main><h1>About Us</h1></main>
    </>
  );
}`}
                </div>
            </div>

            <div className="demo-card" style={{ marginBottom: '24px' }}>
                <h3 className="demo-card-title">⚙️ How it works (SSR side-channel)</h3>
                <p className="demo-card-description">
                    The <code>{'<Head>'}</code> component uses a <strong>side-channel pattern</strong> during Server-Side Rendering:
                </p>
                <div className="code-block">
                    {`1. resetHead()        — Clear any previous head elements
2. renderToString()   — SSR runs, calls page components
3. <Head> detected    — Its children are collected (not rendered to body)
4. getHeadElements()  — Collected elements are retrieved
5. HTML injection     — Elements are placed into the <head> tag

Result: <Head><title>X</title></Head> 
  → appears in <head>, NOT in <body>`}
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📊 Benefits over hardcoded {'<head>'}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--color-muted)' }}>Feature</th>
                            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--color-muted)' }}>Layout hardcoded</th>
                            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--color-muted)' }}>{'<Head>'} component</th>
                        </tr>
                    </thead>
                    <tbody style={{ color: 'var(--color-text-secondary)' }}>
                        <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '8px' }}>Per-page title</td>
                            <td style={{ padding: '8px' }}>❌ Same for all pages</td>
                            <td style={{ padding: '8px' }}>✅ Each page sets its own</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '8px' }}>SEO meta tags</td>
                            <td style={{ padding: '8px' }}>❌ Generic or missing</td>
                            <td style={{ padding: '8px' }}>✅ Per-page description, OG tags</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                            <td style={{ padding: '8px' }}>Dynamic content</td>
                            <td style={{ padding: '8px' }}>❌ Can't use page data</td>
                            <td style={{ padding: '8px' }}>✅ Data-driven titles from DB</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '8px' }}>Placement</td>
                            <td style={{ padding: '8px' }}>Only in layout</td>
                            <td style={{ padding: '8px' }}>Anywhere in component tree</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
