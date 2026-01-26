/**
 * Feed Page — Main timeline with infinite scrolling posts
 */
import React from 'react';
import Feed from './components/Feed';

// Generate mock posts (in real app, this would come from DB)
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

export default function HomePage() {
    const initialPosts = generatePosts(10);

    return (
        <div className="feed-container">
            <header className="feed-header">
                <h1>Your Feed</h1>
            </header>

            <Feed initialPosts={initialPosts} />
        </div>
    );
}
