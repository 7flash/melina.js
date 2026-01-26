import React from 'react';
import { Link } from '../../../../../src/Link';

const authors = {
    '1': {
        name: 'Jane Doe',
        bio: 'Full-stack developer passionate about modern web frameworks and performance optimization.',
        avatar: '👩‍💻',
        twitter: '@janedoe',
        posts: ['getting-started-with-melina', 'streaming-ssr-explained']
    },
    '2': {
        name: 'John Smith',
        bio: 'Software architect specializing in scalable web applications and developer tools.',
        avatar: '👨‍💻',
        twitter: '@johnsmith',
        posts: ['app-router-deep-dive']
    },
    '3': {
        name: 'Alex Johnson',
        bio: 'Real-time systems expert and WebSocket enthusiast.',
        avatar: '🧑‍💻',
        twitter: '@alexj',
        posts: ['building-real-time-apps']
    }
};

const postTitles = {
    'getting-started-with-melina': 'Getting Started with Melina.js',
    'app-router-deep-dive': 'App Router Deep Dive',
    'streaming-ssr-explained': 'Streaming SSR Explained',
    'building-real-time-apps': 'Building Real-Time Apps'
};

export default function AuthorPage({ params }) {
    const { id } = params;
    const author = authors[id];

    if (!author) {
        return (
            <div className="container">
                <h1>Author Not Found</h1>
                <Link href="/">← Back to Home</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <nav className="breadcrumb">
                <Link href="/">Home</Link>
                <span>/</span>
                <span>Author</span>
                <span>/</span>
                <span>{author.name}</span>
            </nav>

            <div className="author-profile">
                <div className="author-header">
                    <div className="avatar">{author.avatar}</div>
                    <div>
                        <h1>{author.name}</h1>
                        <p className="author-bio">{author.bio}</p>
                        <p className="author-social">Twitter: {author.twitter}</p>
                    </div>
                </div>

                <section className="author-posts">
                    <h2>Posts by {author.name.split(' ')[0]} ({author.posts.length})</h2>
                    <div className="posts-list">
                        {author.posts.map(slug => (
                            <div key={slug} className="post-item">
                                <Link href={`/blog/${slug}`}>
                                    <h3>{postTitles[slug]}</h3>
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="author-actions">
                    <Link href="/" className="btn">← Back to All Posts</Link>
                </div>
            </div>
        </div>
    );
}
