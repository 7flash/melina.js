# Melina.js Developer Guide

> ⚠️ **Note:** This guide describes the legacy islands architecture. Melina.js now uses a **server/client mount script pattern** — see the [README](./README.md) for the current architecture. The routing, layouts, and general concepts below still apply.

**A lightweight web framework for Bun**

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Quick Start](#quick-start)
4. [Server Components](#server-components)
5. [Client Components (Islands)](#client-components-islands)
6. [The Router](#the-router)
7. [Layouts](#layouts)
8. [State Persistence](#state-persistence)
9. [Cross-Island Communication](#cross-island-communication)
10. [Best Practices & Gotchas](#best-practices--gotchas)
11. [API Reference](#api-reference)

---

## Introduction

Melina.js is a Next.js-compatible framework with a simpler architecture, built specifically for Bun. It uses the **Islands Architecture** where:

- **Server Components**: Rendered on the server, sent as HTML
- **Client Components (Islands)**: Interactive React components that hydrate on the client

### Key Features

- ✅ File-based routing (Next.js App Router style)
- ✅ Nested layouts with automatic composition
- ✅ Islands architecture for optimal performance
- ✅ SPA-like navigation with partial page swaps
- ✅ CSS animations that don't reset on navigation
- ✅ Streaming HTML responses

---

## Core Concepts

### The Two Graphs

Melina.js separates your app into two distinct "graphs":

1. **Server Graph** - Layouts and pages that render on the server
2. **Client Graph** - Interactive components (islands) that run in the browser

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVER (Bun)                            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │  layout.tsx │ → │  page.tsx   │ → │   HTML      │ ──────┼──→
│  └─────────────┘   └─────────────┘   └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                                                      │
                                                      ↓
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER                                 │
│  ┌────────────────────────────────────────────────────────┐│
│  │  Static HTML + Islands (hydrated React components)     ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             ││
│  │  │ Counter  │  │ SearchBar│  │ JobTracker│             ││
│  │  │ (island) │  │ (island) │  │ (island)  │             ││
│  │  └──────────┘  └──────────┘  └──────────┘             ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Partial Page Swaps

When you navigate between pages, Melina.js doesn't replace the entire `<body>`. Instead:

1. Fetches the new page HTML
2. Finds `#melina-page-content` in both current and new page
3. Only replaces that container's innerHTML
4. **Header/footer remain untouched** (preserving state and animations!)

---

## Quick Start

### Installation

```bash
bun add melina
```

### Create Your App Structure

```
my-app/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page (/)
│   ├── about/
│   │   └── page.tsx    # About page (/about)
│   ├── components/
│   │   ├── Counter.tsx     # 'use client' component
│   │   └── SearchBar.tsx   # 'use client' component
│   └── globals.css     # Global styles
└── package.json
```

### Start the Dev Server

```bash
bunx melina start
```

---

## Server Components

Server Components are the default. They render on the server and send HTML to the client.

```tsx
// app/page.tsx - Server Component (default)
export default function HomePage() {
    const data = await fetchFromDatabase(); // Can use async!
    
    return (
        <div>
            <h1>Welcome</h1>
            <p>Data: {data}</p>
        </div>
    );
}
```

### What Server Components CAN do:
- ✅ Async/await directly in the component
- ✅ Access databases, file systems, environment variables
- ✅ Import other Server Components
- ✅ Import Client Components (they'll become islands)

### What Server Components CANNOT do:
- ❌ Use `useState`, `useEffect`, or other hooks
- ❌ Use browser APIs (`window`, `localStorage`)
- ❌ Handle click events

---

## Client Components (Islands)

Add `'use client'` at the top of your file to make it interactive:

```tsx
// app/components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter({ initialCount = 0 }) {
    const [count, setCount] = useState(initialCount);
    
    return (
        <button onClick={() => setCount(c => c + 1)}>
            Count: {count}
        </button>
    );
}
```

### Using Islands in Server Components

Just import and use them:

```tsx
// app/page.tsx - Server Component
import { Counter } from './components/Counter';

export default function HomePage() {
    return (
        <div>
            <h1>My Page</h1>
            <Counter initialCount={10} />  {/* Island! */}
        </div>
    );
}
```

The framework automatically:
1. Renders the component on the server (for SEO/initial paint)
2. Adds `data-melina-island` markers
3. Hydrates on the client with React

---

## The Router

### File-Based Routes

```
app/page.tsx           → /
app/about/page.tsx     → /about
app/blog/[id]/page.tsx → /blog/:id (dynamic)
```

### The `<Link>` Component

Use `<Link>` for SPA-style navigation:

```tsx
import { Link } from 'melina/Link';

export default function Nav() {
    return (
        <nav>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
        </nav>
    );
}
```

### Navigation Lifecycle

When a user clicks a link:

1. **Fetch**: Router fetches the new page HTML
2. **Parse**: Parses it into a DOM tree
3. **Swap**: Only replaces `#melina-page-content`
4. **Hydrate**: Finds new islands and hydrates them

**Elements outside `#melina-page-content` persist automatically!**

### ⚡ What Happens to Islands During Navigation

Each island is its own **independent React root**. Here's what happens:

| Island Location | On Navigation | State |
|-----------------|---------------|-------|
| In Layout (header/footer) | **Persists** - DOM untouched | ✅ Preserved |
| In Page | **Destroyed** - innerHTML replaced | ❌ Lost |
| Same island on new page | New React root created | Fresh state |

**Example:**
```
Navigate from /home to /about:

┌─ Layout ────────────────────────────────────────┐
│ <SearchBar />  ← React Root #1 (STAYS)         │
│                  state preserved! ✅            │
├─────────────────────────────────────────────────┤
│ <main id="melina-page-content">                 │
│   /home: <Counter />  ← Root #2 (DESTROYED) ❌ │
│   /about: <ContactForm /> ← Root #3 (NEW) 🆕   │
│ </main>                                         │
├─────────────────────────────────────────────────┤
│ <JobTracker />  ← React Root #4 (STAYS)        │
│                   state preserved! ✅           │
└─────────────────────────────────────────────────┘
```

**Key insight:** Even if both pages use `<Counter />`, they are **different React roots**. State doesn't transfer.

---

## Layouts

### Root Layout

Every app needs a root `layout.tsx`:

```tsx
// app/layout.tsx
import { SearchBar } from './components/SearchBar';
import { JobTracker } from './components/JobTracker';

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <header>
                    <nav>...</nav>
                    <SearchBar />  {/* Persists across navigation! */}
                </header>
                
                {/* Only this part swaps on navigation */}
                <main id="melina-page-content">
                    {children}
                </main>
                
                <footer>...</footer>
                <JobTracker />  {/* Persists too! */}
            </body>
        </html>
    );
}
```

### Nested Layouts

```
app/
├── layout.tsx          # Root layout
└── dashboard/
    ├── layout.tsx      # Dashboard layout (nested)
    └── page.tsx        # Dashboard page
```

---

## State Persistence

### Why Islands Persist

Islands in the layout (outside `#melina-page-content`) are never destroyed during navigation:

```tsx
// This SearchBar's React state survives navigation!
<header>
    <SearchBar />
</header>

<main id="melina-page-content">
    {children}  {/* Only this changes */}
</main>
```

### ⚠️ The Props Desynchronization Trade-off

**This is important!** When navigating:

1. Server renders new page with new props
2. Router keeps old layout (to preserve state)
3. **Old islands keep their OLD props!**

**Example:**
```tsx
// layout.tsx
<Header activeTab={pathname} />  // ❌ Props won't update!
```

If you're on `/home` and navigate to `/about`:
- Server sends `activeTab="about"`
- Router throws that away, keeps old Header
- Header still shows `activeTab="home"` 😱

### Solution: Use URL State

Persistent islands should read from URL, not props:

```tsx
// ✅ CORRECT - Read from URL
'use client';

export function Header() {
    const [activeTab, setActiveTab] = useState('/');
    
    useEffect(() => {
        // Read current path
        setActiveTab(window.location.pathname);
        
        // Update on navigation
        const handleNav = () => setActiveTab(window.location.pathname);
        window.addEventListener('melina:navigated', handleNav);
        return () => window.removeEventListener('melina:navigated', handleNav);
    }, []);
    
    return (
        <nav>
            <Link href="/" className={activeTab === '/' ? 'active' : ''}>Home</Link>
            <Link href="/about" className={activeTab === '/about' ? 'active' : ''}>About</Link>
        </nav>
    );
}
```

---

## Cross-Island Communication

Islands are independent React roots. They can't share state directly.

### Option 1: localStorage + Events

```tsx
// Island A: Emit event
function submitJob(name) {
    const job = { id: Date.now(), name };
    localStorage.setItem('lastJob', JSON.stringify(job));
    window.dispatchEvent(new CustomEvent('job:created', { detail: job }));
}

// Island B: Listen for events
useEffect(() => {
    const handler = (e) => setJobs(prev => [...prev, e.detail]);
    window.addEventListener('job:created', handler);
    return () => window.removeEventListener('job:created', handler);
}, []);
```

### Option 2: Event Bus

```tsx
// eventBus.ts
export const eventBus = {
    emit(event: string, data: any) {
        window.dispatchEvent(new CustomEvent(`app:${event}`, { detail: data }));
    },
    
    on(event: string, callback: (data: any) => void) {
        const handler = (e: CustomEvent) => callback(e.detail);
        window.addEventListener(`app:${event}`, handler);
        return () => window.removeEventListener(`app:${event}`, handler);
    }
};
```

### Option 3: URL State

For state that should survive refresh:

```tsx
// Read from URL
const searchParams = new URLSearchParams(window.location.search);
const filter = searchParams.get('filter');

// Update URL
function setFilter(value) {
    const url = new URL(window.location.href);
    url.searchParams.set('filter', value);
    window.history.replaceState({}, '', url);
}
```

---

## Best Practices & Gotchas

### ✅ Do's

1. **Keep layouts lean** - Only put truly persistent elements there
2. **Use URL state for persistent islands** - Don't rely on server props
3. **Use `#melina-page-content`** - The router needs this container
4. **Listen for `melina:navigated`** - Keep persistent islands synced

### ❌ Don'ts

1. **Don't pass dynamic props to persistent islands** - They won't update
2. **Don't use global CSS transitions on body** - They'll restart on swap
3. **Don't forget `display: contents`** - If island wrapper breaks layout

### Common Patterns

```tsx
// ✅ Good: Persistent island reads URL
function NavTabs() {
    const [path, setPath] = useState('/');
    useEffect(() => {
        setPath(window.location.pathname);
        window.addEventListener('melina:navigated', () => {
            setPath(window.location.pathname);
        });
    }, []);
    return <nav>...</nav>;
}

// ✅ Good: Cross-page data via localStorage
function JobTracker() {
    const [jobs, setJobs] = useState(() => {
        return JSON.parse(localStorage.getItem('jobs') || '[]');
    });
    // ...
}

// ❌ Bad: Relying on props in persistent island
function Header({ activeTab }) {  // Won't update on navigation!
    return <nav className={activeTab}>...</nav>;
}
```

---

## API Reference

### CLI Commands

```bash
melina init <project-name>  # Create new project
melina start                # Start dev server
```

### Components

```tsx
import { Link } from 'melina/Link';

<Link href="/path">Text</Link>
```

### Events

```js
// Fired after SPA navigation completes
window.addEventListener('melina:navigated', () => {
    console.log('Navigation complete!');
});
```

### Server Functions

```tsx
import { serve, createAppRouter } from 'melina';

serve(createAppRouter({
    appDir: './app',
    defaultTitle: 'My App',
}), { port: 3000 });
```

---

## Troubleshooting

### "My island doesn't update on navigation"

You're probably relying on server props. See [Props Desynchronization](#️-the-props-desynchronization-trade-off).

### "CSS animations restart on navigation"

Make sure your animated elements are **outside** `#melina-page-content`.

### "Islands don't communicate"

Islands are separate React roots. Use localStorage/events. See [Cross-Island Communication](#cross-island-communication).

---

## Version History

- **v0.2.0** - Partial page swap architecture, persistent islands
- **v0.1.0** - Initial release with file-based routing

---

Built with ❤️ using Bun
