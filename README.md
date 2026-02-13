# Melina.js 🦊

**A zero-config web framework for Bun. Server-rendered HTML with surgical client interactivity.**

[![npm version](https://img.shields.io/npm/v/melina)](https://www.npmjs.com/package/melina)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)

```
Traditional:  Source → Webpack → Babel → PostCSS → Disk → Serve
Melina.js:    Source → Bun.build() → Memory → Serve
```

Melina eliminates the entire frontend toolchain. No bundler config, no `dist/` folder, no build step. Pages render on the server as plain HTML. Interactivity is added surgically through **client mount scripts** — plain functions that attach event listeners to server-rendered DOM and clean up on navigation.

By default, JSX in client scripts creates **real DOM elements** — no virtual DOM, no hydration, no framework shipped to the browser. But if your client script imports React, Melina detects it and builds with React instead. **You choose per file.**

---

## Table of Contents

- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Core Concepts](#-core-concepts)
  - [Server Components](#server-components)
  - [Client Mount Scripts](#client-mount-scripts)
  - [Client JSX — Vanilla or React](#client-jsx--vanilla-or-react)
  - [Layouts & Partial Swaps](#layouts--partial-swaps)
- [Server Configuration](#-server-configuration)
  - [Programmatic API](#programmatic-api)
  - [Port Behaviour](#port-behaviour)
- [Architecture](#-architecture)
  - [Build System](#in-memory-build-system)
  - [Routing & Navigation](#routing--navigation)
  - [Mount Lifecycle](#mount-lifecycle)
  - [State Persistence](#state-persistence)
  - [Cross-Component Communication](#cross-component-communication)
- [Examples](#-examples)
- [Contributing](#-contributing)

---

## 🚀 Quick Start

```bash
bun add melina
```

Create a minimal app:

```
my-app/
├── app/
│   ├── layout.tsx          # Root layout (server)
│   ├── page.tsx            # Home page (server)
│   └── page.client.tsx     # Home interactivity (client)
└── server.ts               # Entry point
```

**`app/layout.tsx`** — Server component, renders the shell:
```tsx
export default function Layout({ children }: { children: any }) {
  return (
    <html>
      <body>
        <nav>My App</nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

**`app/page.tsx`** — Server component, renders HTML:
```tsx
export default function Home() {
  return (
    <div>
      <h1>Hello Melina! 🦊</h1>
      <button id="greet-btn">Click me</button>
      <p id="output"></p>
    </div>
  );
}
```

**`app/page.client.tsx`** — Client mount script, adds interactivity:
```tsx
export default function mount() {
  const btn = document.getElementById('greet-btn');
  const output = document.getElementById('output');

  const handler = () => { output!.textContent = 'Hello from the client! 🎉'; };
  btn?.addEventListener('click', handler);

  // Return cleanup — called automatically on navigation
  return () => btn?.removeEventListener('click', handler);
}
```

**`server.ts`**:
```ts
import { start } from 'melina';

await start();
```

```bash
bun run server.ts
# 🦊 Melina server running at http://localhost:3000
```

---

## 📁 Project Structure

```
my-app/
├── app/
│   ├── layout.tsx            # Root layout (server-rendered shell)
│   ├── layout.client.tsx     # Layout client script (mounts once, persists across navigation)
│   ├── page.tsx              # Home page (server-rendered HTML)
│   ├── page.client.tsx       # Home client script (re-mounts each navigation)
│   ├── about/
│   │   └── page.tsx          # /about
│   ├── blog/
│   │   └── [slug]/
│   │       └── page.tsx      # /blog/:slug (dynamic route)
│   ├── api/
│   │   └── hello/
│   │       └── route.ts      # API endpoint (GET, POST, etc.)
│   └── globals.css           # Global styles (Tailwind CSS v4 supported)
├── server.ts                 # Entry point
└── package.json
```

### Route Conventions

| File | Route | Type |
|------|-------|------|
| `app/page.tsx` | `/` | Page |
| `app/about/page.tsx` | `/about` | Page |
| `app/blog/[slug]/page.tsx` | `/blog/:slug` | Dynamic page |
| `app/api/hello/route.ts` | `/api/hello` | API endpoint |
| `app/layout.tsx` | — | Layout (wraps children) |
| `app/dashboard/layout.tsx` | — | Nested layout |

---

## 🧩 Core Concepts

### Server Components

Pages and layouts are **server components**. They run on the server inside Bun, produce HTML, and send zero JavaScript to the browser by default.

```tsx
// app/page.tsx — runs on the server
export default async function Page() {
  const posts = await db.query('SELECT * FROM posts');
  return (
    <div>
      <h1>Posts</h1>
      {posts.map(post => <article key={post.id}>{post.title}</article>)}
    </div>
  );
}
```

Server components can:
- ✅ Use `async/await` directly
- ✅ Access databases, file system, environment variables
- ✅ Return JSX (rendered to HTML via React SSR) or raw HTML strings

Server components **cannot**:
- ❌ Use browser APIs (`window`, `document`, `localStorage`)
- ❌ Attach event listeners or handle user interaction

---

### Client Mount Scripts

This is the core pattern. Instead of sending a framework to the browser, you write a **mount function** that attaches interactivity to the server-rendered DOM:

```tsx
// app/page.client.tsx
export default function mount(): (() => void) | void {
  const btn = document.getElementById('like-btn');

  const handler = () => {
    btn!.textContent = '❤️ Liked!';
  };
  btn?.addEventListener('click', handler);

  // Return cleanup — called on navigation away
  return () => btn?.removeEventListener('click', handler);
}
```

There are two kinds of client scripts:

| Script | Lifecycle | Use Case |
|---|---|---|
| `page.client.tsx` | Unmounts → re-mounts on each navigation | Page-specific interactions (likes, forms, infinite scroll) |
| `layout.client.tsx` | Mounts once, **persists** across all navigations | Persistent widgets (messenger, notifications, audio player) |

On navigation, the runtime:
1. Calls the current page's cleanup function
2. Swaps the page content
3. Imports and runs the new page's mount function
4. Layout scripts are **never** re-mounted — their DOM and state survive

---

### Client JSX — Vanilla or React

Melina auto-detects what your client script needs based on its imports:

**Vanilla mode** (default — no React import detected):  
JSX compiles to real `document.createElement` calls via `jsx-dom`. No framework ships to the browser.

```tsx
// app/page.client.tsx — no React import → vanilla mode
export default function mount() {
  const toast = (
    <div className="toast">
      <span>Post saved!</span>
      <button onClick={() => toast.remove()}>✕</button>
    </div>
  );
  document.body.appendChild(toast); // Real DOM node, works directly
  return () => toast.remove();
}
```

**React mode** (detected when you `import` from `react` or `react-dom`):  
React is externalized and loaded via import maps. Full React API available.

```tsx
// app/layout.client.tsx — imports React → React mode
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Clicked {count}x</button>;
}

export default function mount() {
  const root = createRoot(document.getElementById('react-root')!);
  root.render(<App />);
  return () => root.unmount();
}
```

The detection happens per-file, so you can mix vanilla and React client scripts in the same app.

---

### Layouts & Partial Swaps

The framework auto-wraps `{children}` in a `<div id="melina-page-content" style="display:contents">`. On client-side navigation, **only this container's innerHTML is replaced** — everything outside it (header, footer, persistent widgets) stays untouched.

```tsx
// app/layout.tsx
export default function Layout({ children }: { children: any }) {
  return (
    <html>
      <body>
        {/* PERSISTENT ZONE — survives navigation */}
        <header><nav>My App</nav></header>

        {/* SWAP ZONE — replaced on navigation */}
        {children}

        {/* PERSISTENT ZONE */}
        <footer>© 2026</footer>
        <div id="messenger">{/* managed by layout.client.tsx */}</div>
      </body>
    </html>
  );
}
```

```
Navigate from / to /about:
┌─ Layout ──────────────────────────────────────────┐
│ <header>  nav links       ← PERSISTS             │
├───────────────────────────────────────────────────┤
│ <div id="melina-page-content">                    │
│   / page content          ← DESTROYED            │
│   /about page content     ← NEW                  │
│ </div>                                            │
├───────────────────────────────────────────────────┤
│ <footer>  © 2026          ← PERSISTS             │
│ <div id="messenger">      ← PERSISTS (state kept)│
└───────────────────────────────────────────────────┘
```

Because layout DOM is never replaced, anything managed by `layout.client.tsx` — XState machines, WebSocket connections, timers, animation state — survives navigation intact.

---

## 🔧 Server Configuration

### Programmatic API

```ts
import { start } from 'melina';

await start({
  appDir: './app',         // Default: ./app
  port: 4000,              // Optional — see Port Behaviour below
  defaultTitle: 'My App',  // HTML <title>
  globalCss: 'app/globals.css',
});
```

For full control over the request pipeline:

```ts
import { serve, createAppRouter } from 'melina';

const router = createAppRouter({ appDir: './app' });

serve(async (req, measure) => {
  // Custom middleware: auth, health checks, rate limiting
  if (new URL(req.url).pathname === '/health') {
    return new Response('OK');
  }
  return router(req, measure);
}, { port: 3000 });
```

### Port Behaviour

Melina resolves ports with this priority:

| Priority | Source | Explicit? | On Busy Port |
|----------|--------|-----------|--------------|
| 1 | `options.port` passed to `start()` or `serve()` | ✅ Yes | **Throws** `EADDRINUSE` |
| 2 | `BUN_PORT` environment variable | ✅ Yes | **Throws** `EADDRINUSE` |
| 3 | Default (`3000`) | ❌ No | **Auto-finds** next available port |

**Explicit ports fail loudly.** If you specify a port and it's already in use, Melina throws an error and the process exits. This prevents silently running on an unexpected port in production.

**Default ports fallback gracefully.** If no port is specified, Melina tries `3000`, and if busy, finds the next available port with a warning:
```
⚠️  Port 3000 unavailable, using port 3001 instead
🦊 Melina server running at http://localhost:3001
```

Unix domain sockets are also supported for reverse-proxy deployments:
```ts
await start({ unix: '/tmp/myapp.sock' });
```

---

## 🏗️ Architecture

### In-Memory Build System

No `dist/` folder. Client scripts are compiled with `Bun.build()` and served directly from memory.

The build system reads each client script's source and decides the mode:

```
┌─ page.client.tsx ─────────────────────────────────┐
│ Does it import from 'react' or 'react-dom'?       │
│                                                   │
│  NO  → Vanilla mode                               │
│       JSX runtime → jsx-dom.ts (real DOM elements) │
│       Zero framework shipped to browser            │
│                                                   │
│  YES → React mode                                 │
│       react/react-dom marked as external           │
│       Import maps injected into <head>             │
│       Full React API available                     │
└───────────────────────────────────────────────────┘
```

This detection is per-file, so vanilla and React client scripts coexist in the same app without configuration.

CSS is processed with PostCSS + Tailwind CSS v4 (Rust engine). No `tailwind.config.js` needed:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #667eea;
}
```

---

### Routing & Navigation

File-based route discovery follows Next.js App Router conventions:

```
app/
├── page.tsx              → /
├── about/page.tsx        → /about
├── blog/[slug]/page.tsx  → /blog/:slug (dynamic)
├── api/hello/route.ts    → /api/hello (API)
└── layout.tsx            → wraps all pages
```

**Client-side navigation** intercepts `<a>` clicks, fetches the new page HTML, and performs a **partial swap**:

1. Fetch new page via `fetch(href, { headers: { 'X-Melina-Nav': '1' } })`
2. Parse the response into a DOM tree
3. Replace only `#melina-page-content` innerHTML — layout DOM is untouched
4. Update `<title>` and `__MELINA_META__`
5. Run new page's mount function
6. Dispatch `melina:navigated` event

Back/forward navigation (`popstate`) follows the same flow.

---

### Mount Lifecycle

```
Initial page load:
  1. Server renders full HTML (layout + page)
  2. Browser loads runtime.ts
  3. Inline <script> tags run layout.client.tsx mount() and page.client.tsx mount()

Navigation to new page:
  1. Current page's cleanup function is called
  2. #melina-page-content innerHTML is replaced
  3. __MELINA_META__ is updated with new page's client script path
  4. New page's mount() function is imported and executed
  5. Layout mount scripts are NOT re-run — state persists
```

---

### State Persistence

Because layout DOM is never replaced, anything managed by `layout.client.tsx` survives navigation:

- XState machines (messenger widget, notification center)
- WebSocket/SSE connections
- Timers and intervals
- Animation state
- Any DOM outside `#melina-page-content`

For page-level state that needs to survive navigation, use:
- **`localStorage`** — persist on change, restore on mount
- **URL state** — `searchParams` survive navigation and refresh
- **Move to layout** — if the component should truly persist, manage it from `layout.client.tsx`

**`melina:navigated` event** — persistent components can listen for navigation to update themselves:

```ts
// Inside layout.client.tsx
window.addEventListener('melina:navigated', () => {
  // Update active nav link, breadcrumbs, etc.
  highlightActiveLink(window.location.pathname);
});
```

---

### Cross-Component Communication

Since there's no shared framework state on the client, use browser-native patterns:

**Custom Events:**
```ts
// Component A
window.dispatchEvent(new CustomEvent('job:created', { detail: { id: 1 } }));

// Component B
window.addEventListener('job:created', (e) => {
  console.log('New job:', e.detail);
});
```

**localStorage + Storage Events:**
```ts
localStorage.setItem('user', JSON.stringify(user));
window.dispatchEvent(new Event('storage'));
```

---

## 📂 Examples

| Example | Description | Client Pattern |
|---------|-------------|----------------|
| [**shopping-cart**](./examples/shopping-cart/) | Product grid, cart drawer, toast notifications | Vanilla JSX-dom components, custom events |
| [**social-feed**](./examples/social-feed/) | Full social app with feed, messenger, SSE | Vanilla JSX-dom, XState, Tailwind |
| [**programmatic-api**](./examples/programmatic-api/) | Custom server with middleware | `createAppRouter()`, custom routes |
| [**htmx-jsx**](./examples/htmx-jsx/) | HTMX + JSX server rendering | `hx-get`, fragments, zero client JS |
| [**mcp**](./examples/mcp/) | MCP protocol server & test client | Tools, prompts, JSON-RPC |
| [**view-morph**](./examples/view-morph/) | View Transitions + persistent state | React islands, CSS morphing |
| [**stream-vanilla**](./examples/stream-vanilla/) | Streaming HTML (vanilla JS) | `yield` streaming, zero framework |
| [**stream-react-tailwind**](./examples/stream-react-tailwind/) | Streaming HTML with React + Tailwind | `yield` streaming, import maps |
| [**wrapped-react**](./examples/wrapped-react/) | SPA wrapper (React) | `spa()` helper, full client-side React |
| [**wrapped-vanilla**](./examples/wrapped-vanilla/) | SPA wrapper (vanilla JS) | `frontendApp()`, `SERVER_DATA` |

```bash
cd examples/<name>
bun install
bun run dev
```

---

## 🤝 Contributing

### Prerequisites

- [Bun](https://bun.sh) v1.2+

### Setup

```bash
git clone https://github.com/mements/melina.js.git
cd melina.js
bun install

# Run the flagship example
cd examples/social-feed
bun install && bun run dev
```

### Source Structure

```
src/
├── web.ts           # Server, router, build system, serve(), start()
├── runtime.ts       # Client runtime (navigation, mount lifecycle, link interception)
├── jsx-dom.ts       # Client JSX runtime — JSX → real DOM elements
├── router.ts        # File-based route discovery & matching
├── Link.tsx         # <Link> navigation component
├── island.ts        # Legacy island() helper (used by view-morph example)
├── mcp.ts           # MCP protocol support
├── loader.ts        # Module loader utilities
└── preprocess.ts    # Source preprocessing
```

---

## License

MIT © [Mements](https://github.com/mements)