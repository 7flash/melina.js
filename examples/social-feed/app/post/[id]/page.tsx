/**
 * Post Detail Page — SSR page for individual post
 */
import React from 'react';

// Mock data (same generator as home page)
function getPost(id: number) {
    const authors = [
        { name: 'Sarah Chen', handle: '@sarahc' },
        { name: 'Alex Rivera', handle: '@alexr' },
        { name: 'Jordan Kim', handle: '@jordank' },
        { name: 'Taylor Wong', handle: '@taylorw' },
        { name: 'Morgan Lee', handle: '@morganl' },
        { name: 'Casey Park', handle: '@caseyp' },
        { name: 'Riley Zhang', handle: '@rileyz' },
        { name: 'Jamie Patel', handle: '@jamiep' },
    ];

    const contents = [
        "Just deployed my first Melina.js app and the islands architecture is 🔥. Zero JS on initial load, instant hydration!",
        "The future of web frameworks is server-first with surgical hydration. Been experimenting with reverse portals and it's mind-blowing.",
        "Hot take: SPAs were a mistake. Give me streaming HTML with progressive enhancement any day.",
        "Finally figured out View Transitions API. The UX improvement is insane — feels like a native app.",
        "Building a real-time dashboard with islands. Each widget hydrates independently. Performance is incredible.",
        "TIL you can have stateful components that survive full page navigations. The hangar architecture is genius.",
        "Spent the weekend rewriting our app from Next.js to Melina. 85% less client JS. Users are happy.",
        "Unpopular opinion: Most apps don't need client-side routing. MPA with View Transitions > SPA.",
        "The best part about islands architecture? You can use whatever you want for each island. React, Svelte, vanilla JS...",
        "Just discovered you can physically move DOM nodes between placeholders during navigation. State persists! 🤯",
    ];

    const author = authors[id % authors.length];
    const content = contents[id % contents.length];
    const hasImage = id % 3 === 0;
    const timeAgo = id < 5 ? `${id * 10}m ago` : id < 20 ? `${Math.floor(id / 2)}h ago` : `${Math.floor(id / 10)}d ago`;

    return {
        id,
        author,
        content: `${content} #post${id}`,
        timeAgo,
        hasImage,
        imageUrl: hasImage ? `https://picsum.photos/seed/${id}/800/450` : null,
        likes: Math.floor(Math.random() * 500) + 10,
        comments: Math.floor(Math.random() * 50) + 1,
        shares: Math.floor(Math.random() * 20),
    };
}

// Generate mock comments
function getComments(postId: number) {
    const commenters = [
        'DevNinja', 'CodeWizard', 'ByteMaster', 'PixelPusher',
        'StackOverflower', 'GitGuru', 'BugHunter', 'ScriptKiddie'
    ];

    const commentTexts = [
        "This is exactly what I've been looking for!",
        "Amazing work! Can you share more details?",
        "Been using this approach for months. Highly recommend.",
        "The performance gains are real. +1",
        "How does this compare to other frameworks?",
        "Mind = blown 🤯",
        "Bookmarking this for later.",
        "This changed how I think about web development.",
    ];

    return Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        author: commenters[(postId + i) % commenters.length],
        text: commentTexts[(postId + i) % commentTexts.length],
        timeAgo: `${(i + 1) * 15}m ago`,
    }));
}

export default function PostPage({ params }: { params: { id: string } }) {
    const postId = parseInt(params.id);
    const post = getPost(postId);
    const comments = getComments(postId);

    return (
        <div className="post-detail">
            <a href="/" className="back-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Feed
            </a>

            <article className="post-card" style={{ viewTransitionName: `post-${post.id}` }}>
                <header className="post-header">
                    <div className="post-avatar">
                        {post.author.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="post-meta">
                        <div className="post-author">{post.author.name}</div>
                        <div className="post-time">{post.author.handle} · {post.timeAgo}</div>
                    </div>
                </header>

                <p className="post-content">{post.content}</p>

                {post.hasImage && post.imageUrl && (
                    <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="post-image"
                        loading="lazy"
                    />
                )}

                <div className="post-actions">
                    <button className="post-action">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {post.likes}
                    </button>
                    <button className="post-action">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {post.comments}
                    </button>
                    <button className="post-action">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                        </svg>
                        {post.shares}
                    </button>
                </div>
            </article>

            {/* Comments Section */}
            <section style={{ marginTop: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Comments</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {comments.map(comment => (
                        <div
                            key={comment.id}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'white',
                                }}>
                                    {comment.author[0]}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{comment.author}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comment.timeAgo}</div>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{comment.text}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
