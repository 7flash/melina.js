/**
 * Post Detail Page — SSR page for individual post
 */

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
        "Just deployed my first Melina.js app and the server-side rendering is 🔥. Zero JS on initial load, instant interactivity!",
        "The future of web frameworks is server-first with client mount scripts. Been experimenting with View Transitions and it's mind-blowing.",
        "Hot take: SPAs were a mistake. Give me streaming HTML with progressive enhancement any day.",
        "Finally figured out View Transitions API. The UX improvement is insane — feels like a native app.",
        "Building a real-time dashboard with SSR. Each page renders instantly. Performance is incredible.",
        "TIL you can have smooth page transitions without a SPA framework. View Transitions API is genius.",
        "Spent the weekend rewriting our app from Next.js to Melina. 85% less client JS. Users are happy.",
        "Unpopular opinion: Most apps don't need client-side routing. MPA with View Transitions > SPA.",
        "The best part about server-first rendering? Your pages work without JavaScript. Progressive enhancement FTW.",
        "Just discovered you can add interactivity with mount scripts instead of hydrating the whole page. So clean! 🤯",
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
        <div className="max-w-2xl mx-auto pt-6 pb-32 px-4">
            <a href="/" className="inline-flex items-center gap-2 text-muted hover:text-white mb-6 transition-colors font-medium">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Feed
            </a>

            <article className="bg-secondary border border-border rounded-xl p-6 mb-8 shadow-lg" style={{ viewTransitionName: `post-${post.id}` }}>
                <header className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-semibold text-xl shrink-0">
                        {post.author.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-white text-lg">{post.author.name}</div>
                        <div className="text-sm text-muted">{post.author.handle} · {post.timeAgo}</div>
                    </div>
                </header>

                <p className="text-gray-200 text-lg leading-relaxed mb-6">{post.content}</p>

                {post.hasImage && post.imageUrl && (
                    <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="w-full rounded-lg mb-6 bg-tertiary aspect-video object-cover"
                        loading="lazy"
                    />
                )}

                <div className="flex gap-8 pt-4 border-t border-border">
                    <button className="flex items-center gap-2 text-muted hover:text-accent transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {post.likes}
                    </button>
                    <button className="flex items-center gap-2 text-muted hover:text-accent transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {post.comments}
                    </button>
                    <button className="flex items-center gap-2 text-muted hover:text-accent transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                        </svg>
                        {post.shares}
                    </button>
                </div>
            </article>

            {/* Comments Section */}
            <section className="mt-8">
                <h3 className="text-xl font-bold text-white mb-6">Comments</h3>
                <div className="flex flex-col gap-4">
                    {comments.map(comment => (
                        <div
                            key={comment.id}
                            className="bg-secondary border border-border rounded-lg p-5"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                    {comment.author[0]}
                                </div>
                                <div>
                                    <div className="font-semibold text-white text-sm">{comment.author}</div>
                                    <div className="text-xs text-muted">{comment.timeAgo}</div>
                                </div>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed ml-11">{comment.text}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
