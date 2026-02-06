/**
 * Feed Page — Server-rendered timeline
 * 
 * This renders the initial HTML for the feed.
 * Client interactivity (likes, infinite scroll) is in page.client.tsx
 */
import React from 'react';

// Generate mock posts (server-side data)
function generatePosts(count: number, offset: number = 0) {
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
        "Just deployed my first Melina.js app — zero-JS initial load, instant interactivity! 🔥",
        "The future of web is server-first with surgical client scripts. No more hydration mismatch hell.",
        "Hot take: SPAs were a mistake. Give me streaming HTML with progressive enhancement any day.",
        "Finally figured out View Transitions API. The UX improvement is insane — feels like a native app.",
        "Building a real-time dashboard. Each page mounts its own interactivity. Performance is incredible.",
        "Server-rendered HTML + vanilla DOM manipulation = the way it was always meant to be.",
        "Spent the weekend rewriting our app. 95% less client JS. Users are happy.",
        "Unpopular opinion: Most apps don't need client-side routing. MPA with View Transitions > SPA.",
        "JSX on the client that creates real DOM elements? No virtual DOM overhead? Sign me up.",
        "Mount function returns cleanup. Navigate away? Automatic teardown. Beautiful lifecycle. 🤯",
    ];

    return Array.from({ length: count }, (_, i) => {
        const id = offset + i + 1;
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
    });
}

function PostCard({ post }: { post: any }) {
    return (
        <article className="post-card" data-post-id={post.id} style={{ marginBottom: '16px' }}>
            <header className="post-header">
                <div className="post-avatar">
                    {post.author.name.split(' ').map((n: string) => n[0]).join('')}
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
                <button className="post-action like-btn" data-post-id={post.id} data-likes={post.likes}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="like-count">{post.likes}</span>
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
    );
}

export default function HomePage() {
    const posts = generatePosts(10);

    return (
        <div className="feed-container">
            <header className="feed-header">
                <h1>Your Feed</h1>
            </header>

            <div id="feed-posts">
                {posts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>

            {/* Client script hooks into this for infinite scroll */}
            <div id="feed-load-more" className="loading-indicator" />
        </div>
    );
}
