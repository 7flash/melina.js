import { Link } from '../../../src/Link';
import { JobSubmit } from './components/Jobs';
import { Counter } from './components/Counter';

/**
 * Home Page - Server Component
 * 
 * Client components (JobSubmit, Counter) are imported directly.
 * The island() wrapper makes them render as island markers on the server.
 */
export default function HomePage({ params }: { params: Record<string, string> }) {
    const serverRenderedTime = new Date().toISOString();

    return (
        <div>
            <h1>Welcome to Melina.js 🦊</h1>
            <p>A Next.js-compatible framework with a simpler architecture.</p>

            <div style={{
                background: '#f0f0f0',
                padding: '1rem',
                borderRadius: '8px',
                marginTop: '1rem'
            }}>
                <h3>Server Component Demo</h3>
                <p>This page was rendered at: <code>{serverRenderedTime}</code></p>
            </div>

            {/* Just import and use - no manual markers! */}
            <div style={{ marginTop: '2rem' }}>
                <h3>Submit Jobs (try it, then navigate to Settings!)</h3>
                <JobSubmit />
            </div>

            {/* Counter island with props */}
            <Counter initialCount={10} />

            <nav style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <Link href="/about">About</Link>
                <Link href="/settings">Settings</Link>
                <Link href="/posts/1">Post 1</Link>
            </nav>

            <div style={{ marginTop: '2rem' }}>
                <h3>Architecture Features:</h3>
                <ul>
                    <li>✅ <strong>Islands</strong> - Each is its own React root</li>
                    <li>✅ <strong>Cross-Island Communication</strong> - Via localStorage/events</li>
                    <li>✅ <strong>Persistent Layout Islands</strong> - JobTracker stays while navigating</li>
                    <li>✅ <strong>Direct Import</strong> - Just use {'<Counter />'} and it works!</li>
                </ul>
            </div>
        </div>
    );
}
