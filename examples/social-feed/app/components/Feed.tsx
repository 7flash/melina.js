/**
 * Feed Component — Infinite scrolling post list
 * 
 * This is a client island that handles:
 * - Infinite scroll via IntersectionObserver
 * - Like/unlike interactions
 * - Navigation to post detail (via Link)
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Post {
    id: number;
    author: { name: string; handle: string };
    content: string;
    timeAgo: string;
    hasImage: boolean;
    imageUrl: string | null;
    likes: number;
    comments: number;
    shares: number;
}

interface FeedProps {
    initialPosts: Post[];
}

export default function Feed({ initialPosts }: FeedProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Simulate loading more posts
    const loadMore = () => {
        if (loading || !hasMore) return;

        setLoading(true);

        // Simulate API delay
        setTimeout(() => {
            const newPosts = generateMorePosts(posts.length, 5);
            setPosts(prev => [...prev, ...newPosts]);
            setLoading(false);

            // Stop after 50 posts
            if (posts.length >= 45) {
                setHasMore(false);
            }
        }, 800);
    };

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!loadMoreRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    });

    const toggleLike = (postId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setLikedPosts(prev => {
            const next = new Set(prev);
            if (next.has(postId)) {
                next.delete(postId);
            } else {
                next.add(postId);
            }
            return next;
        });

        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const isLiked = likedPosts.has(postId);
                return { ...p, likes: p.likes + (isLiked ? -1 : 1) };
            }
            return p;
        }));
    };

    const navigateToPost = (postId: number) => {
        // Use global navigate function
        if (typeof window !== 'undefined' && (window as any).melinaNavigate) {
            (window as any).melinaNavigate(`/post/${postId}`);
        }
    };

    return (
        <div>
            {posts.map(post => (
                <article
                    key={post.id}
                    className="post-card"
                    style={{
                        marginBottom: '16px',
                        viewTransitionName: `post-${post.id}` as any
                    }}
                    onClick={() => navigateToPost(post.id)}
                >
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
                        <button
                            className={`post-action ${likedPosts.has(post.id) ? 'liked' : ''}`}
                            onClick={(e) => toggleLike(post.id, e)}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
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
            ))}

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="loading-indicator">
                {loading && <div className="loading-spinner" />}
                {!hasMore && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        You've reached the end! 🎉
                    </p>
                )}
            </div>
        </div>
    );
}

// Helper to generate more posts (client-side)
function generateMorePosts(offset: number, count: number): Post[] {
    const authors = [
        { name: 'Sarah Chen', handle: '@sarahc' },
        { name: 'Alex Rivera', handle: '@alexr' },
        { name: 'Jordan Kim', handle: '@jordank' },
        { name: 'Taylor Wong', handle: '@taylorw' },
        { name: 'Morgan Lee', handle: '@morganl' },
    ];

    const contents = [
        "Another day, another deploy. Love how fast iteration cycles are with islands.",
        "Just realized I haven't thought about hydration mismatches in weeks. This is the way.",
        "The mental model of 'HTML first, JS second' is so refreshing.",
        "Debugging is so much easier when most of your app is just HTML.",
        "Server components + islands = best of both worlds",
    ];

    return Array.from({ length: count }, (_, i) => {
        const id = offset + i + 1;
        return {
            id,
            author: authors[id % authors.length],
            content: `${contents[id % contents.length]} #post${id}`,
            timeAgo: `${Math.floor(id / 2)}h ago`,
            hasImage: id % 4 === 0,
            imageUrl: id % 4 === 0 ? `https://picsum.photos/seed/${id}/800/450` : null,
            likes: Math.floor(Math.random() * 200) + 10,
            comments: Math.floor(Math.random() * 30) + 1,
            shares: Math.floor(Math.random() * 15),
        };
    });
}
