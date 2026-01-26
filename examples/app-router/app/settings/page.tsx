import { Link } from '../../../../src/Link';

/**
 * Settings Page - Server Component
 * 
 * The JobTracker island in the layout will persist while viewing this page!
 * Jobs submitted on the home page will still be visible here.
 */
export default function SettingsPage() {
    return (
        <div>
            <h1>⚙️ Settings</h1>
            <p>This is a different page, but notice the <strong>Job Tracker</strong> in the bottom right corner!</p>

            <div style={{
                background: '#f0f0f0',
                padding: '1.5rem',
                borderRadius: '8px',
                marginTop: '1rem'
            }}>
                <h3>How Islands Work</h3>
                <p>Each island is its own React root:</p>
                <ul>
                    <li><strong>SearchBar</strong> - in the header</li>
                    <li><strong>JobTracker</strong> - floating in bottom right (layout)</li>
                    <li><strong>JobSubmit</strong> - on the home page</li>
                    <li><strong>Counter</strong> - on the home page</li>
                </ul>

                <p style={{ marginTop: '1rem' }}>
                    They communicate via <code>localStorage</code> and custom events.
                    <br />
                    No shared React state needed!
                </p>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h3>Test the Architecture:</h3>
                <ol>
                    <li>Go to <Link href="/">Home</Link> and submit some jobs</li>
                    <li>Come back here - see the JobTracker still shows them!</li>
                    <li>Jobs update in real-time across pages</li>
                </ol>
            </div>

            <nav style={{ marginTop: '2rem' }}>
                <Link href="/">← Back to Home</Link>
            </nav>
        </div>
    );
}
