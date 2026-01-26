import React from 'react';
import { Link } from '../../../../src/Link';

// Mock post database
const posts = {
    'getting-started-with-melina': {
        title: 'Getting Started with Melina.js',
        content: `
      Melina.js is a lightweight, streaming-first web framework for Bun that makes building fast web applications a breeze.
      
      ## Why Melina?
      
      - **Zero Configuration**: Just create an app directory and start building
      - **File-Based Routing**: Your file structure becomes your URL structure
      - **Server-Side Rendering**: Fast initial page loads with automatic hydration
      - **Streaming by Default**: Start rendering before all data is ready
      - **TypeScript Native**: Built with TypeScript, works seamlessly with .tsx files
      
      ## Quick Start
      
      \`\`\`bash
      melina init my-app
      cd my-app
      melina start
      \`\`\`
      
      That's it! Your app is running with file-based routing, SSR, and hot reload.
    `,
        author: 'Jane Doe',
        authorId: 1,
        date: '2026-01-20',
        category: 'tutorials',
        readTime: '5 min read'
    },
    'app-router-deep-dive': {
        title: 'App Router Deep Dive',
        content: `
      The App Router in Melina.js brings Next.js-style routing to Bun with some unique advantages.
      
      ## How It Works
      
      Routes are discovered automatically from your \`app/\` directory:
      - \`app/page.tsx\` → \`/\`
      - \`app/blog/page.tsx\` → \`/blog\`
      - \`app/blog/[slug]/page.tsx\` → \`/blog/:slug\`
      
      ## Dynamic Routes
      
      Use square brackets for dynamic segments. The parameter is available in your component via \`params\`:
      
      \`\`\`tsx
      export default function Post({ params }) {
        const { slug } = params;
        return <h1>Post: {slug}</h1>;
      }
      \`\`\`
    `,
        author: 'John Smith',
        authorId: 2,
        date: '2026-01-22',
        category: 'advanced',
        readTime: '8 min read'
    },
    'streaming-ssr-explained': {
        title: 'Streaming SSR Explained',
        content: `
      Streaming Server-Side Rendering is one of Melina's killer features for performance.
      
      ## Traditional SSR Problems
      
      Traditional SSR waits for ALL data before sending ANY HTML. This means:
      - Slow Time to First Byte (TTFB)
      - Users see nothing while server processes
      - Poor user experience on slow connections
      
      ## Streaming SSR Solution
      
      Melina streams HTML as it's generated:
      1. Send HTML shell immediately
      2. Stream content as data arrives
      3. Browser renders progressively
      4. Much faster perceived performance
    `,
        author: 'Jane Doe',
        authorId: 1,
        date: '2026-01-24',
        category: 'performance',
        readTime: '6 min read'
    },
    'building-real-time-apps': {
        title: 'Building Real-Time Apps',
        content: `
      Real-time features are essential for modern web applications.
      
      ## WebSocket Integration
      
      Melina works great with WebSockets for real-time features:
      - Chat applications
      - Live notifications
      - Collaborative editing
      - Real-time dashboards
      
      ## Implementation Pattern
      
      \`\`\`typescript
      // Server-side WebSocket handler
      serve((req) => {
        if (req.headers.get('upgrade') === 'websocket') {
          return handleWebSocket(req);
        }
        return createAppRouter()(req);
      });
      \`\`\`
    `,
        author: 'Alex Johnson',
        authorId: 3,
        date: '2026-01-26',
        category: 'tutorials',
        readTime: '10 min read'
    }
};

export default function BlogPost({ params }) {
    const { slug } = params;
    const post = posts[slug];

    if (!post) {
        return (
            <div className="container">
                <h1>Post Not Found</h1>
                <Link href="/">← Back to Home</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <nav className="breadcrumb">
                <Link href="/">Home</Link>
                <span>/</span>
                <Link href="/blog">Blog</Link>
                <span>/</span>
                <span>{post.title}</span>
            </nav>

            <article className="post-full">
                <header>
                    <div className="post-meta">
                        <Link href={`/blog/category/${post.category}`} className="category">
                            {post.category}
                        </Link>
                        <span className="date">{post.date}</span>
                        <span className="read-time">{post.readTime}</span>
                    </div>
                    <h1>{post.title}</h1>
                    <div className="author-info">
                        <Link href={`/blog/author/${post.authorId}`}>
                            By {post.author}
                        </Link>
                    </div>
                </header>

                <div className="post-content">
                    {post.content.split('\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                    ))}
                </div>

                <footer className="post-nav">
                    <Link href="/" className="btn">← Back to All Posts</Link>
                    <Link href={`/blog/category/${post.category}`} className="btn">
                        More in {post.category}
                    </Link>
                </footer>
            </article>

            <aside className="related">
                <h3>Related Posts</h3>
                <ul>
                    <li><Link href="/blog/getting-started-with-melina">Getting Started with Melina.js</Link></li>
                    <li><Link href="/blog/app-router-deep-dive">App Router Deep Dive</Link></li>
                </ul>
            </aside>
        </div>
    );
}
