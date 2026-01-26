import { Link } from '../../../../src/Link';

/**
 * About Page - Server Component
 */
export default function AboutPage({ params }: { params: Record<string, string> }) {
    return (
        <div>
            <h1>About Melina.js</h1>
            <p>A lightweight, streaming-first web framework for Bun.</p>

            <h2>Architecture</h2>
            <ul>
                <li><strong>Server Graph:</strong> layout.tsx and page.tsx are Server Components</li>
                <li><strong>Client Graph:</strong> Files with 'use client' become islands</li>
                <li><strong>HTML Protocol:</strong> No complex wire format, just HTML</li>
            </ul>

            <nav style={{ marginTop: '2rem' }}>
                <Link href="/">← Back to Home</Link>
            </nav>
        </div>
    );
}
