import React from 'react';
import { Link } from '../../../../../src/Link';

const categories = {
    'tutorials': {
        title: 'Tutorials',
        description: 'Step-by-step guides to help you learn Melina.js',
        posts: [
            { slug: 'getting-started-with-melina', title: 'Getting Started with Melina.js', excerpt: 'Learn the basics', date: '2026-01-20' },
            { slug: 'building-real-time-apps', title: 'Building Real-Time Apps', excerpt: 'WebSocket integration', date: '2026-01-26' }
        ]
    },
    'advanced': {
        title: 'Advanced',
        description: 'Deep dives into advanced concepts and patterns',
        posts: [
            { slug: 'app-router-deep-dive', title: 'App Router Deep Dive', excerpt: 'Understanding routing internals', date: '2026-01-22' }
        ]
    },
    'performance': {
        title: 'Performance',
        description: 'Optimize your applications for speed',
        posts: [
            { slug: 'streaming-ssr-explained', title: 'Streaming SSR Explained', excerpt: 'Performance boost with streaming', date: '2026-01-24' }
        ]
    }
};

export default function CategoryPage({ params }) {
    const { name } = params;
    const category = categories[name];

    if (!category) {
        return (
            <div className="container">
                <h1>Category Not Found</h1>
                <p>The category "{name}" doesn't exist.</p>
                <Link href="/">← Back to Home</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <nav className="breadcrumb">
                <Link href="/">Home</Link>
                <span>/</span>
                <span>Category</span>
                <span>/</span>
                <span>{category.title}</span>
            </nav>

            <header className="category-header">
                <h1>{category.title}</h1>
                <p>{category.description}</p>
                <p className="post-count">{category.posts.length} post{category.posts.length !== 1 ? 's' : ''}</p>
            </header>

            <div className="category-posts">
                {category.posts.map(post => (
                    <article key={post.slug} className="post-card">
                        <h2>
                            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                        </h2>
                        <p className="excerpt">{post.excerpt}</p>
                        <div className="post-footer">
                            <span className="date">{post.date}</span>
                            <Link href={`/blog/${post.slug}`} className="read-more">Read more →</Link>
                        </div>
                    </article>
                ))}
            </div>

            <aside className="category-sidebar">
                <h3>Other Categories</h3>
                <ul className="category-list">
                    {Object.entries(categories)
                        .filter(([key]) => key !== name)
                        .map(([key, cat]) => (
                            <li key={key}>
                                <Link href={`/blog/category/${key}`}>
                                    {cat.title} ({cat.posts.length})
                                </Link>
                            </li>
                        ))}
                </ul>
            </aside>

            <div className="category-actions">
                <Link href="/" className="btn">← Back to All Posts</Link>
            </div>
        </div>
    );
}
