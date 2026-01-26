import React from 'react';
import { Link } from '../../../src/Link';

// Mock data - in real app this would come from a database
const posts = [
    { id: 1, slug: 'getting-started-with-melina', title: 'Getting Started with Melina.js', excerpt: 'Learn how to build blazing fast web apps with Melina.js', author: 'Jane Doe', category: 'tutorials', date: '2026-01-20' },
    { id: 2, slug: 'app-router-deep-dive', title: 'App Router Deep Dive', excerpt: 'Understanding file-based routing and SSR in Melina', author: 'John Smith', category: 'advanced', date: '2026-01-22' },
    { id: 3, slug: 'streaming-ssr-explained', title: 'Streaming SSR Explained', excerpt: 'How streaming server-side rendering improves performance', author: 'Jane Doe', category: 'performance', date: '2026-01-24' },
    { id: 4, slug: 'building-real-time-apps', title: 'Building Real-Time Apps', excerpt: 'Integrate WebSockets and real-time features', author: 'Alex Johnson', category: 'tutorials', date: '2026-01-25' },
];

export default function HomePage() {
    return (
        <div className="container">
            <header className="header">
                <h1>🦊 Melina Blog</h1>
                <p className="tagline">Exploring modern web development with Melina.js</p>
                <nav className="main-nav">
                    <Link href="/">Home</Link>
                    <Link href="/blog/getting-started-with-melina">Featured Post</Link>
                    <Link href="/blog/category/tutorials">Tutorials</Link>
                    <Link href="/blog/author/1">Authors</Link>
                </nav>
            </header>

            <main>
                <section className="hero">
                    <h2>Latest Posts</h2>
                    <p>Discover articles about Melina.js, SSR, and modern web development</p>
                </section>

                <div className="posts-grid">
                    {posts.map(post => (
                        <article key={post.id} className="post-card">
                            <div className="post-meta">
                                <span className="category">{post.category}</span>
                                <span className="date">{post.date}</span>
                            </div>
                            <h3>
                                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                            </h3>
                            <p className="excerpt">{post.excerpt}</p>
                            <div className="post-footer">
                                <Link href={`/blog/author/${post.id}`} className="author">By {post.author}</Link>
                                <Link href={`/blog/${post.slug}`} className="read-more">Read more →</Link>
                            </div>
                        </article>
                    ))}
                </div>

                <aside className="sidebar">
                    <div className="widget">
                        <h3>Categories</h3>
                        <ul className="category-list">
                            <li><Link href="/blog/category/tutorials">Tutorials</Link> (2)</li>
                            <li><Link href="/blog/category/advanced">Advanced</Link> (1)</li>
                            <li><Link href="/blog/category/performance">Performance</Link> (1)</li>
                        </ul>
                    </div>
                </aside>
            </main>

            <footer className="footer">
                <p>Powered by Melina.js • Built with ❤️ and ⚡</p>
            </footer>
        </div>
    );
}
