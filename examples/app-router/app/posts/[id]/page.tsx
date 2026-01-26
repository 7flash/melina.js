import React from 'react';
import { Link } from '../../../../../src/Link';

export default function PostPage({ params }) {
    const { id } = params;

    return (
        <div className="container">
            <h1>Post: {id}</h1>
            <p>This is a dynamic route! The ID from the URL is: <strong>{id}</strong></p>

            <div className="info">
                <h2>How it works:</h2>
                <p>
                    The file <code>app/posts/[id]/page.tsx</code> matches any URL like <code>/posts/123</code> or <code>/posts/hello-world</code>
                </p>
                <p>
                    The parameter is extracted and passed to the component as <code>params.id</code>
                </p>
            </div>

            <nav>
                <Link href="/">← Back to Home</Link>
                <Link href="/about">About</Link>
            </nav>
        </div>
    );
}
