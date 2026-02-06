/**
 * Feed Page — Client Interactivity
 * 
 * This is NOT a React component. It's a mount function that adds
 * interactivity to the server-rendered HTML.
 * 
 * JSX here creates real DOM elements (not virtual DOM).
 */

// Post data for generating more
const authors = [
    { name: 'Sarah Chen', handle: '@sarahc' },
    { name: 'Alex Rivera', handle: '@alexr' },
    { name: 'Jordan Kim', handle: '@jordank' },
    { name: 'Taylor Wong', handle: '@taylorw' },
    { name: 'Morgan Lee', handle: '@morganl' },
];

const contents = [
    "Another day, another deploy. Love how fast iteration cycles are.",
    "Just realized I haven't thought about hydration mismatches in weeks.",
    "The mental model of 'HTML first, JS second' is so refreshing.",
    "Debugging is so much easier when most of your app is just HTML.",
    "Server components + client scripts = best of both worlds.",
];

function generatePost(id: number) {
    const author = authors[id % authors.length];
    const content = contents[id % contents.length];
    return {
        id,
        author,
        content: `${content} #post${id}`,
        timeAgo: `${Math.floor(id / 2)}h ago`,
        hasImage: id % 4 === 0,
        imageUrl: id % 4 === 0 ? `https://picsum.photos/seed/${id}/800/450` : null,
        likes: Math.floor(Math.random() * 200) + 10,
        comments: Math.floor(Math.random() * 30) + 1,
        shares: Math.floor(Math.random() * 15),
    };
}

/** Create a post card DOM element using JSX */
function createPostCard(post: ReturnType<typeof generatePost>) {
    const initials = post.author.name.split(' ').map(n => n[0]).join('');

    return (
        <article class="post-card" data-post-id={String(post.id)} style={{ marginBottom: '16px' }}>
            <header class="post-header">
                <div class="post-avatar">{initials}</div>
                <div class="post-meta">
                    <div class="post-author">{post.author.name}</div>
                    <div class="post-time">{post.author.handle} · {post.timeAgo}</div>
                </div>
            </header>

            <p class="post-content">{post.content}</p>

            {post.hasImage && post.imageUrl ? (
                <img src={post.imageUrl} alt="Post image" class="post-image" loading="lazy" />
            ) : null}

            <div class="post-actions">
                <button class="post-action like-btn" data-post-id={String(post.id)} data-likes={String(post.likes)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span class="like-count">{post.likes}</span>
                </button>
                <button class="post-action">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {post.comments}
                </button>
                <button class="post-action">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                    </svg>
                    {post.shares}
                </button>
            </div>
        </article>
    );
}

export default function mount(): () => void {
    const likedPosts = new Set<number>();
    let loading = false;
    let hasMore = true;
    let postCount = 10; // Server rendered 10 initially

    const feedPosts = document.getElementById('feed-posts');
    const loadMoreEl = document.getElementById('feed-load-more');

    if (!feedPosts || !loadMoreEl) {
        return () => { };
    }

    // ─── Like Button Handler ───
    function handleLikeClick(e: Event) {
        const btn = (e.target as Element).closest('.like-btn') as HTMLElement;
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const postId = parseInt(btn.dataset.postId || '0');
        const baseLikes = parseInt(btn.dataset.likes || '0');
        const countEl = btn.querySelector('.like-count');
        const svgEl = btn.querySelector('svg');

        if (likedPosts.has(postId)) {
            likedPosts.delete(postId);
            btn.classList.remove('liked');
            if (countEl) countEl.textContent = String(baseLikes);
            if (svgEl) svgEl.setAttribute('fill', 'none');
        } else {
            likedPosts.add(postId);
            btn.classList.add('liked');
            if (countEl) countEl.textContent = String(baseLikes + 1);
            if (svgEl) svgEl.setAttribute('fill', 'currentColor');

            // Micro-animation: pulse
            btn.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.2)' },
                { transform: 'scale(1)' },
            ], { duration: 300, easing: 'ease-out' });
        }
    }

    feedPosts.addEventListener('click', handleLikeClick);

    // ─── Post Click → Navigate ───
    function handlePostClick(e: Event) {
        const article = (e.target as Element).closest('.post-card') as HTMLElement;
        if (!article) return;

        // Don't navigate if clicking action buttons
        if ((e.target as Element).closest('.post-actions')) return;

        const postId = article.dataset.postId;
        if (postId && (window as any).melinaNavigate) {
            (window as any).melinaNavigate(`/post/${postId}`);
        }
    }

    feedPosts.addEventListener('click', handlePostClick);

    // ─── Infinite Scroll ───
    function loadMore() {
        if (loading || !hasMore) return;
        loading = true;

        // Show spinner
        loadMoreEl!.innerHTML = '';
        const spinner = <div class="loading-spinner" />;
        loadMoreEl!.appendChild(spinner);

        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                postCount++;
                const post = generatePost(postCount);
                const card = createPostCard(post);
                feedPosts!.appendChild(card);
            }

            loading = false;
            loadMoreEl!.innerHTML = '';

            if (postCount >= 50) {
                hasMore = false;
                const endMsg = (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        You've reached the end! 🎉
                    </p>
                );
                loadMoreEl!.appendChild(endMsg);
                observer.disconnect();
            }
        }, 600);
    }

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && hasMore && !loading) {
                loadMore();
            }
        },
        { threshold: 0.1 }
    );

    observer.observe(loadMoreEl);

    console.log('[Feed] Mounted — likes, navigation, infinite scroll active');

    // ─── Cleanup ───
    return () => {
        feedPosts.removeEventListener('click', handleLikeClick);
        feedPosts.removeEventListener('click', handlePostClick);
        observer.disconnect();
        console.log('[Feed] Unmounted');
    };
}
