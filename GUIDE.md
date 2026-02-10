# Melina.js Developer Guide

**A comprehensive guide to building applications with Melina.js**

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Quick Start](#quick-start)
4. [Server Components](#server-components)
5. [Client Mount Scripts](#client-mount-scripts)
6. [Client Components (Islands)](#client-components-islands)
7. [Routing](#routing)
8. [Layouts](#layouts)
9. [State Persistence](#state-persistence)
10. [View Transitions](#view-transitions)
11. [API Routes](#api-routes)
12. [Styling](#styling)
13. [Best Practices & Gotchas](#best-practices--gotchas)
14. [API Reference](#api-reference)
15. [Troubleshooting](#troubleshooting)

---

## Introduction

Melina.js is a server-first web framework built for Bun. Pages render on the server as HTML, and you add interactivity through **client mount scripts** or **React islands** — whichever fits your use case.

### Key Features

- ✅ File-based routing (Next.js App Router style)
- ✅ Nested layouts with automatic composition
- ✅ Client mount scripts — vanilla interactivity on server-rendered HTML
- ✅ React islands — selective hydration for complex components
- ✅ SPA-like navigation with partial page swaps
- ✅ Native View Transitions API support
- ✅ Streaming HTML responses
- ✅ In-memory builds — no `dist/` folder

---

## Core Concepts

### The Two Graphs

Melina.js separates your app into two execution contexts:

1. **Server** — Layouts and pages render on Bun, producing HTML
2. **Client** — Interactivity added via mount scripts or React islands

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
│  │  Server HTML + Client Interactivity                    ││
│  │                                                        ││
│  │  Option A: page.client.tsx  (vanilla mount scripts)    ││
│  │  Option B: 'use client'     (React islands)            ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### The Two Zones

Your layout creates two distinct zones:

1. **Persistent Zone** — Elements outside `#melina-page-content` (header, footer, sidebars)
2. **Swappable Zone** — The `#melina-page-content` container

```tsx
<body>
  <header>...</header>        {/* PERSISTENT: Never unmounts */}
  
  <main id="melina-page-content">
    {children}                {/* SWAPPABLE: Replaced on navigation */}
  </main>
  
  <footer>...</footer>        {/* PERSISTENT: Never unmounts */}
</body>
```

### Partial Page Swaps

When you navigate between pages, Melina.js doesn't replace the entire page. Instead:

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
export default async function HomePage() {
  const data = await fetchFromDatabase(); // Can use async!
  
  return (
    <div>
      <h1>Welcome</h1>
      <p>Data: {data}</p>
    </div>
  );
}
```

### What Server Components CAN Do

- ✅ Async/await directly in the component
- ✅ Access databases, file systems, environment variables
- ✅ Import other Server Components
- ✅ Import Client Components (they'll become islands)

### What Server Components CANNOT Do

- ❌ Use `useState`, `useEffect`, or other hooks
- ❌ Use browser APIs (`window`, `localStorage`)
- ❌ Handle click events or other interactive behaviors

---

## Client Mount Scripts

The simplest way to add interactivity. Create a `page.client.tsx` file alongside any `page.tsx` — it runs in the browser after the server HTML is rendered.

### Basic Mount Script

```tsx
// app/page.client.tsx
export default function mount(): () => void {
  // Attach event listeners to server-rendered HTML
  const btn = document.querySelector('#my-button');
  btn?.addEventListener('click', () => {
    btn.textContent = 'Clicked!';
  });

  // Return cleanup function (called on navigation)
  return () => {
    btn?.removeEventListener('click', () => {});
  };
}
```

### Layout-Level Mount Scripts

Create `layout.client.tsx` for interactivity that persists across page navigations:

```tsx
// app/layout.client.tsx — runs once, persists across navigation
export default function mount(): () => void {
  // E.g., a messenger widget, notification system, etc.
  const toggle = document.querySelector('#widget-toggle');
  toggle?.addEventListener('click', () => {
    document.querySelector('#widget')?.classList.toggle('open');
  });

  return () => {};
}
```

### JSX in Client Scripts

Client mount scripts can use JSX to create real DOM elements (not React virtual DOM):

```tsx
// app/page.client.tsx
export default function mount(): () => void {
  const container = document.querySelector('#dynamic-content');
  
  // JSX creates actual HTMLElements here
  const el = (
    <div className="card">
      <h2>Dynamic Content</h2>
      <button onClick={() => alert('clicked')}>Click me</button>
    </div>
  );
  
  container?.appendChild(el as Node);

  return () => {
    (el as Node).remove();
  };
}
```

### When to Use Mount Scripts vs Islands

| Use **mount scripts** when... | Use **islands** when... |
|-----|-----|
| Adding event listeners to server HTML | You need React hooks (`useState`, `useEffect`) |
| DOM manipulation, animations | Complex component trees with state |
| Light interactivity (toggles, modals) | Re-usable interactive components |
| Maximum performance, zero framework overhead | Existing React component library |

---

## Client Components (Islands)

For complex interactive components, you can use React islands. Add `'use client'` to make a component interactive:

### Auto-Wrapping (Default)

Just export your component normally — Melina transforms it during SSR:

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

That's it! No extra imports or wrappers required. The framework:

1. Detects `'use client'` directive
2. Automatically transforms exports to island wrappers during SSR
3. Renders the actual component on the client

### Manual Wrapping (Advanced)

For more control, you can manually wrap with `island()`:

```tsx
'use client';

import { useState } from 'react';
import { island } from 'melina/island';

function CounterImpl({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}

// Explicit island wrapper
export const Counter = island(CounterImpl, 'Counter');
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

1. Renders an island placeholder on the server (for SEO/initial paint)
2. Adds `data-melina-island` markers with serialized props
3. Hydrates on the client with React

---

## Routing

### File-Based Routes

```
app/page.tsx           → /
app/about/page.tsx     → /about
app/blog/[slug]/page.tsx → /blog/:slug (dynamic)
app/docs/[...path]/page.tsx → /docs/* (catch-all)
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
      <Link href="/blog/my-post">Blog Post</Link>
    </nav>
  );
}
```

### Route Precedence

| Priority | Type | Example | Description |
|----------|------|---------|-------------|
| 1 | Static | `/blog/my-post` | Exact match |
| 2 | Dynamic | `/blog/[slug]` | Single segment |
| 3 | Catch-all | `/blog/[...slug]` | Multiple segments |

### Navigation Lifecycle

When a user clicks a link:

1. **Fetch**: Router fetches the new page HTML
2. **Parse**: Parses it into a DOM tree
3. **Transition**: Triggers View Transition (if supported)
4. **Swap**: Only replaces `#melina-page-content`
5. **Hydrate**: Finds and hydrates new islands
6. **Event**: Dispatches `melina:navigated`

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
        
        {/* CRITICAL: Only this part swaps on navigation */}
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

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard">
      <Sidebar />
      <div id="melina-page-content">
        {children}
      </div>
    </div>
  );
}
```

---

## State Persistence

### Why Islands Persist

Islands in the layout (outside `#melina-page-content`) are never destroyed during navigation:

```tsx
<header>
  <SearchBar />  {/* React state survives navigation */}
</header>

<main id="melina-page-content">
  {children}  {/* Only this changes */}
</main>
```

### ⚠️ The Props Desynchronization Trade-off

**Important!** When navigating:

1. Server renders new page with new props
2. Router keeps existing layout (to preserve state)
3. **Persistent islands keep their OLD props!**

**Example:**

```tsx
// layout.tsx
<Header activeTab={pathname} />  // ❌ Props won't update!
```

If you're on `/home` and navigate to `/about`:
- Server sends `activeTab="about"`
- Router discards that, keeps old Header
- Header still shows `activeTab="home"` 😱

### ✅ Solution: Read from URL

Persistent islands should read from URL, not props:

```tsx
// ✅ CORRECT - Read from URL
'use client';

import { useState, useEffect } from 'react';
import { island } from 'melina/island';

function HeaderImpl() {
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
      <Link href="/" className={activeTab === '/' ? 'active' : ''}>
        Home
      </Link>
      <Link href="/about" className={activeTab === '/about' ? 'active' : ''}>
        About
      </Link>
    </nav>
  );
}

export const Header = island(HeaderImpl, 'Header');
```

### Persisting State for Page Islands

Page islands (inside `#melina-page-content`) lose state on navigation. Options:

**Option 1: Move to Layout**
```tsx
// If the island should persist, put it in the layout
<JobTracker />  // In layout = always persists
```

**Option 2: Use localStorage**
```tsx
function CounterImpl({ initialCount = 0 }) {
  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem('counter');
    return saved ? parseInt(saved) : initialCount;
  });

  useEffect(() => {
    localStorage.setItem('counter', String(count));
  }, [count]);

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Option 3: Use URL State**
```tsx
function FilterPanel() {
  const [filter, setFilter] = useState(() => {
    return new URLSearchParams(window.location.search).get('filter') || 'all';
  });

  const updateFilter = (newFilter) => {
    const url = new URL(window.location.href);
    url.searchParams.set('filter', newFilter);
    window.history.replaceState({}, '', url);
    setFilter(newFilter);
  };

  return (
    <select value={filter} onChange={e => updateFilter(e.target.value)}>
      <option value="all">All</option>
      <option value="active">Active</option>
    </select>
  );
}
```

---

## View Transitions

Melina.js leverages the browser-native [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for smooth, morphing animations between pages.

### Basic Setup

```css
/* app/globals.css */

/* Give elements a shared identity */
.album-cover {
  view-transition-name: album-cover;
}

/* Customize the transition */
::view-transition-old(album-cover),
::view-transition-new(album-cover) {
  animation-duration: 0.3s;
  animation-timing-function: ease-in-out;
}
```

### Dynamic Transition Names

Use inline styles for dynamic transition names:

```tsx
// List view
<div 
  className="album-thumbnail"
  style={{ viewTransitionName: `album-${album.id}` }}
>
  <img src={album.cover} />
</div>

// Detail view  
<div 
  className="album-hero"
  style={{ viewTransitionName: `album-${params.id}` }}
>
  <img src={album.cover} />
</div>
```

### Single-Instance Morphing

Layout-level islands can transform between states:

```tsx
// MusicPlayer that morphs between mini and expanded
function MusicPlayerImpl() {
  const [path, setPath] = useState('/');
  
  useEffect(() => {
    setPath(window.location.pathname);
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('melina:navigated', handler);
    return () => window.removeEventListener('melina:navigated', handler);
  }, []);

  const isExpanded = path.startsWith('/album/');

  return (
    <div 
      className={isExpanded ? 'player-expanded' : 'player-mini'}
      style={{ viewTransitionName: 'music-player' }}
    >
      {isExpanded ? <ExpandedView /> : <MiniView />}
    </div>
  );
}
```

```css
::view-transition-old(music-player),
::view-transition-new(music-player) {
  animation-duration: 0.4s;
}
```

---

## Cross-Island Communication

Islands are independent React roots. They can't share state directly via React context.

### Option 1: Custom Events

```tsx
// Island A: Emit event
function submitJob(name) {
  const job = { id: Date.now(), name };
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
// lib/eventBus.ts
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

// Usage
eventBus.emit('user:login', { id: 1, name: 'Alice' });
eventBus.on('user:login', (user) => console.log('Logged in:', user));
```

### Option 3: localStorage + Storage Events

```tsx
// Island A: Write
localStorage.setItem('user', JSON.stringify(user));
window.dispatchEvent(new Event('storage'));

// Island B: Listen
const [user, setUser] = useState(() => 
  JSON.parse(localStorage.getItem('user') || 'null')
);

useEffect(() => {
  const handler = () => {
    setUser(JSON.parse(localStorage.getItem('user') || 'null'));
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}, []);
```

---

## API Routes

### Basic API Route

```tsx
// app/api/hello/route.ts
export async function GET(req: Request) {
  return Response.json({
    message: 'Hello from API!',
    serverTime: new Date().toISOString()
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  // Process data...
  return Response.json({ success: true });
}
```

### Full Server Capabilities

```tsx
// app/api/data/route.ts
import { readFileSync } from 'fs';
import { db } from '../../../lib/database';

export async function GET() {
  // Read from file system
  const config = readFileSync('./config.json', 'utf-8');
  
  // Query database
  const users = await db.query('SELECT * FROM users');
  
  return Response.json({ config: JSON.parse(config), users });
}
```

### Dynamic API Routes

```tsx
// app/api/users/[id]/route.ts
export async function GET(req: Request, { params }) {
  const user = await db.findUser(params.id);
  
  if (!user) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  
  return Response.json(user);
}
```

---

## Styling

### Global CSS

```tsx
// app/layout.tsx
import './globals.css';

export default function Layout({ children }) {
  return (
    <html>
      <head>
        {/* CSS is automatically injected */}
      </head>
      <body>...</body>
    </html>
  );
}
```

### Tailwind CSS v4

Melina.js has built-in Tailwind v4 support with CSS-first configuration:

```css
/* app/globals.css */
@import "tailwindcss";

/* Custom theme via CSS */
@theme {
  --color-primary: #667eea;
  --color-accent: #764ba2;
}
```

No `tailwind.config.js` needed!

---

## Best Practices & Gotchas

### ✅ Do's

1. **Keep layouts lean** — Only put truly persistent elements there
2. **Use URL state for persistent islands** — Don't rely on server props
3. **Use `#melina-page-content`** — The router needs this container
4. **Listen for `melina:navigated`** — Keep persistent islands synced
5. **Use `island()` wrapper** — Required for client components

### ❌ Don'ts

1. **Don't pass dynamic props to persistent islands** — They won't update
2. **Don't use global CSS transitions on body** — They'll restart on swap
3. **Don't use React context across islands** — They're separate roots
4. **Don't forget cleanup** — Remove event listeners in useEffect cleanup

### Common Patterns

```tsx
// ✅ Good: Persistent island reads URL
function NavTabsImpl() {
  const [path, setPath] = useState('/');
  
  useEffect(() => {
    setPath(window.location.pathname);
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('melina:navigated', handler);
    return () => window.removeEventListener('melina:navigated', handler);
  }, []);
  
  return <nav>...</nav>;
}

export const NavTabs = island(NavTabsImpl, 'NavTabs');

// ✅ Good: Cross-page data via localStorage
function JobTrackerImpl() {
  const [jobs, setJobs] = useState(() => {
    return JSON.parse(localStorage.getItem('jobs') || '[]');
  });
  // ...
}

export const JobTracker = island(JobTrackerImpl, 'JobTracker');

// ❌ Bad: Relying on props in persistent island
function HeaderImpl({ activeTab }) {  // Won't update on navigation!
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

### Core Imports

```tsx
// Programmatic API
import { start, createApp, serve, createAppRouter } from 'melina';

// Navigation component
import { Link } from 'melina/Link';

// Manual island wrapper (optional - auto-wrapping is default)
import { island } from 'melina/island';
```

### Programmatic API

#### `start(options?)` — Quickstart Function

The easiest way to run Melina from your own script:

```tsx
import { start } from 'melina';

// Basic usage
await start();

// With options
await start({
  appDir: './app',           // Default: './app'
  port: 8080,                // Default: 3000
  defaultTitle: 'My App',    // Default: 'Melina App'
  globalCss: './app/styles.css',
});
```

#### `createAppRouter(options)` — Router Factory

Creates a request handler with file-based routing:

```tsx
import { serve, createAppRouter } from 'melina';

const router = createAppRouter({
  appDir: './app',
  defaultTitle: 'My App',
  globalCss: './app/globals.css',
});

// Use with custom middleware
serve(async (req, measure) => {
  // Custom logic before routing
  if (req.url.endsWith('/health')) {
    return new Response('OK');
  }
  
  return router(req, measure);
}, { port: 3000 });
```

#### `createApp(options)` — Alias for `createAppRouter`

```tsx
import { createApp } from 'melina';
const app = createApp({ appDir: './app' });
```

#### `serve(handler, options)` — Low-Level Server

```tsx
import { serve } from 'melina';

serve(async (req, measure) => {
  // Your custom handler
  return new Response('Hello');
}, { 
  port: 3000,
  // Or unix socket for production
  unix: '/tmp/melina.sock'
});
```

### The `island()` Function

Manual island wrapper (usually not needed with auto-wrapping):

```tsx
import { island } from 'melina/island';

// Basic usage
export const Counter = island(CounterImpl, 'Counter');
```

### The `<Link>` Component

```tsx
import { Link } from 'melina/Link';

<Link href="/path">Text</Link>
<Link href="/path" className="nav-link">Styled Link</Link>
```

### Navigation Events

```javascript
// Fired when navigation starts
window.addEventListener('melina:navigation-start', (e) => {
  console.log('From:', e.detail.from, 'To:', e.detail.to);
});

// Fired after SPA navigation completes
window.addEventListener('melina:navigated', () => {
  console.log('Navigation complete!');
});
```

---

## Troubleshooting

### "My island doesn't update on navigation"

You're probably relying on server props. See [Props Desynchronization](#️-the-props-desynchronization-trade-off).

**Solution:** Read from URL + listen for `melina:navigated`

### "CSS animations restart on navigation"

Make sure your animated elements are **outside** `#melina-page-content`.

### "Islands don't communicate"

Islands are separate React roots. Use localStorage/events. See [Cross-Island Communication](#cross-island-communication).

### "View Transitions aren't working"

1. Ensure browser supports View Transitions API (Chrome 111+)
2. Check that `view-transition-name` values match between pages
3. Ensure no duplicate `view-transition-name` on the same page

### "EADDRINUSE error on restart"

The Unix socket wasn't cleaned up. Melina handles this automatically, but if it persists:

```bash
rm /tmp/melina.sock
```

### "Missing 'app' directory"

Make sure you have an `app/` directory with at least a `page.tsx` or `layout.tsx`:

```bash
mkdir -p app
echo 'export default () => <h1>Hello!</h1>;' > app/page.tsx
```

---

## Version History

- **v1.2.0** — Examples cleanup, client mount scripts documentation, Windows port fallback
- **v1.0.0** — View Transitions, state persistence, navigation events
- **v0.2.0** — Partial page swap architecture, persistent layouts
- **v0.1.0** — Initial release with file-based routing

---

Built with ❤️ using [Bun](https://bun.sh) 🧅
