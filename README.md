# Melina.js 🦊

**Bun-native web framework — server-rendered JSX + lightweight client runtime**

[![npm version](https://img.shields.io/npm/v/melina)](https://www.npmjs.com/package/melina)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)

Melina.js is a web framework built for Bun. Pages are **server-rendered JSX** — write components that run on the server, render to HTML, and arrive at the browser instantly. Client interactivity is added via **mount scripts** — small `.client.tsx` files that hydrate specific parts of the page with a zero-dependency ~2KB VDOM runtime.

No React on the client. No hydration mismatch. No bundle bloat.

```
  Server (Bun)                 Browser
┌──────────────┐          ┌──────────────┐
│  page.tsx    │──HTML──▶ │  Static DOM  │
│  layout.tsx  │          │              │
│  api/route.ts│          │  .client.tsx │
│  middleware  │          │  mount()     │
│  SSG cache   │          │  VDOM render │
└──────────────┘          └──────────────┘
```

## Features

- **File-based routing** — Next.js App Router convention (`app/page.tsx` → `/`)
- **Nested layouts** — `layout.tsx` at any level, composed automatically
- **Mount scripts** — `page.client.tsx` adds interactivity without shipping React
- **API routes** — `app/api/*/route.ts` with `GET`, `POST`, etc.
- **Dynamic routes** — `app/post/[id]/page.tsx` → `/post/:id`
- **SSG** — `export const ssg = true` to pre-render at startup, serve from memory
- **`<Head>` component** — Declarative `<title>`, `<meta>` per page during SSR
- **Error boundaries** — `error.tsx` catches render errors with layout chrome
- **Middleware** — `middleware.ts` at any route level, runs root→leaf
- **Scoped CSS** — `page.css` or `style.css` scoped to route segments
- **Tailwind CSS v4** — Built-in PostCSS + `@tailwindcss/postcss` support
- **Streaming** — Return `AsyncGenerator` from API routes for SSE
- **In-memory builds** — No `dist/` folder — assets built and served from RAM
- **Import maps** — Browser-native module resolution for client dependencies
- **Pluggable reconcilers** — Keyed, sequential, or replace strategies for VDOM diffing
- **Observability** — All operations instrumented with [measure-fn](https://github.com/7flash/measure-fn)

## Quick Start

```bash
# Create a new project
npx melina init my-app
cd my-app
bun install
bun run server.ts
```

Or from scratch:

```ts
// server.ts
import { start } from 'melina';

await start({
  appDir: './app',
  port: 3000,
  defaultTitle: 'My App',
});
```

## Project Structure

```
my-app/
├── app/
│   ├── layout.tsx              # Root layout (wraps all pages)
│   ├── layout.client.tsx       # Persistent client JS (survives navigation)
│   ├── globals.css             # Global styles (Tailwind or plain CSS)
│   ├── page.tsx                # Home page (/)
│   ├── page.client.tsx         # Home page mount script
│   ├── page.css                # Scoped CSS for home page
│   ├── middleware.ts           # Root middleware (runs on every request)
│   ├── error.tsx               # Error boundary
│   ├── about/
│   │   └── page.tsx            # /about
│   ├── post/[id]/
│   │   └── page.tsx            # /post/:id (dynamic route)
│   └── api/
│       └── messages/
│           └── route.ts        # API: /api/messages
├── server.ts
└── package.json
```

## Architecture

### Server Pages

Pages export a default function that returns JSX. These run **only on the server** — you can access databases, read files, call APIs directly:

```tsx
// app/page.tsx
export default function HomePage() {
  const posts = db.query('SELECT * FROM posts LIMIT 10');

  return (
    <main>
      <h1>Latest Posts</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  );
}
```

### Mount Scripts (Client Interactivity)

A `page.client.tsx` file adds interactivity to server-rendered HTML. Export a default `mount()` function — it receives the DOM after SSR:

```tsx
// app/counter/page.client.tsx
import { render } from 'melina/client';

function Counter({ count, onIncrement }: { count: number; onIncrement: () => void }) {
  return (
    <div>
      <span>{count}</span>
      <button onClick={onIncrement}>+1</button>
    </div>
  );
}

export default function mount() {
  const root = document.getElementById('counter-root');
  if (!root) return;

  let count = 0;
  const update = () => {
    render(<Counter count={count} onIncrement={() => { count++; update(); }} />, root);
  };
  update();
}
```

**Key design decisions:**
- **No hooks** — Logic is explicit, not hidden behind magic closures
- **No framework lock-in** — `render(vnode, container)` is the entire API
- **Works with XState** — Mount scripts are the perfect place for state machines

### Layouts

Layouts wrap pages and compose automatically from root to leaf:

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>My App</title>
      </head>
      <body>
        <nav><a href="/">Home</a></nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

`layout.client.tsx` is a **persistent** mount script — it survives page navigations, ideal for global UI like nav highlights or notification systems.

### `<Head>` Component

Declarative per-page head management during SSR:

```tsx
import { Head } from 'melina/web';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About Us — My App</title>
        <meta name="description" content="Learn about our team" />
        <link rel="canonical" href="https://example.com/about" />
      </Head>
      <main><h1>About Us</h1></main>
    </>
  );
}
```

### API Routes

Export HTTP method handlers:

```ts
// app/api/messages/route.ts
export async function GET(req: Request) {
  const messages = await db.getMessages();
  return Response.json(messages);
}

export async function POST(req: Request) {
  const body = await req.json();
  await db.createMessage(body);
  return Response.json({ ok: true });
}
```

**Streaming** — Return an `AsyncGenerator` for Server-Sent Events:

```ts
export async function* GET(req: Request) {
  for (let i = 0; i < 10; i++) {
    yield `data: ${JSON.stringify({ count: i })}\n\n`;
    await new Promise(r => setTimeout(r, 1000));
  }
}
```

### SSG (Static Site Generation)

Opt in per page — pre-render at startup, serve from memory:

```tsx
// Pre-render once, serve forever
export const ssg = true;

// Or with TTL (re-render after expiry)
export const ssg = { revalidate: 60 }; // seconds

export default function PricingPage() {
  return <main><h1>Pricing</h1></main>;
}
```

### Middleware

`middleware.ts` files run before the page renders, root→leaf:

```ts
// app/middleware.ts
export default async function middleware(req: Request) {
  const token = req.headers.get('authorization');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Return nothing to continue to the page
}
```

### Error Boundaries

`error.tsx` catches render errors and displays them with full layout chrome:

```tsx
// app/error.tsx
export default function ErrorPage({ error }: { error: { message: string } }) {
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
    </div>
  );
}
```

### Dynamic Routes

```
app/post/[id]/page.tsx      → /post/:id
app/user/[userId]/page.tsx  → /user/:userId
```

```tsx
export default function PostPage({ params }: { params: { id: string } }) {
  return <h1>Post #{params.id}</h1>;
}
```

### Scoped CSS

Add `page.css` or `style.css` alongside any page — it's automatically injected only for that route:

```css
/* app/dashboard/page.css */
.metric-card {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-radius: 12px;
  padding: 24px;
}
```

## Styling

Built-in Tailwind CSS v4 + PostCSS. Add `globals.css` in the app directory:

```css
@import "tailwindcss";

@theme {
  --color-primary: #0a0a0f;
  --color-accent: #6366f1;
}
```

Melina auto-discovers `globals.css`, `global.css`, or `app.css`.

## API Reference

### `start(options)`

High-level entry point:

```ts
import { start } from 'melina';

await start({
  appDir: './app',
  port: 3000,
  defaultTitle: 'My App',
});
```

### `serve(handler, options)` + `createAppRouter(options)`

Lower-level API for custom setups:

```ts
import { serve, createAppRouter } from 'melina';

const handler = createAppRouter({
  appDir: './app',
  defaultTitle: 'My App',
  globalCss: './app/globals.css',
});

serve(handler, { port: 3000 });
```

### Client: `render(vnode, container)`

The entire client API:

```ts
import { render, createElement } from 'melina/client';

render(<MyComponent />, document.getElementById('root'));
```

### CLI

```bash
npx melina init <project-name>   # Create new project from template
npx melina start                 # Start dev server
```

## Showcase

Run the built-in showcase to see every feature in action:

```bash
git clone https://github.com/7flash/melina.js.git
cd melina.js
bun install
bun run examples/showcase/server.ts
# → http://localhost:3000
```

The showcase includes:
- SSR demo with live timestamps
- Counter with VDOM rendering
- XState state machine integration
- Reconciler strategy comparison and benchmarks
- SSG benchmark (SSR vs Cached SSR vs SSG response times)
- Error boundaries, middleware, scoped CSS, `<Head>` component
- Streaming API with animated progress
- Server throughput stress test

---

## For Contributors

### Design Philosophy

Melina is intentionally small. We don't add features unless they solve a real problem that the existing primitives can't handle. Two features we've explicitly decided against:

#### Why no Cached SSR

The comparison table on the SSG page shows three strategies: SSR, Cached SSR, and SSG. **Cached SSR does not exist as a framework feature** — and we don't plan to add it.

SSG already handles the "render once, serve many" case. The difference between Cached SSR (cache the HTML string after first request) and SSG (cache at startup) is trivial in practice:

| | Cached SSR | SSG |
|---|---|---|
| When cached | First request | Startup |
| Storage | JS string (GC'd) | ArrayBuffer (zero-copy) |
| First visitor penalty | Full render | None |
| Invalidation | TTL | TTL or restart |

SSG is strictly better: the first visitor gets an instant response, the HTML is stored as an ArrayBuffer (no per-response string allocation), and invalidation can be automatic via `ssg = { revalidate: N }` or programmatic via `clearSSGCache()`.

Adding Cached SSR would mean two caching systems that do nearly the same thing. SSG covers the use case. If you need dynamic data on every request, use SSR. If you want caching, use SSG. There's no meaningful middle ground.

#### Why no built-in hot reload

We run the server with `bun run server.ts`. When you change a file, you restart. This takes **~10ms** with Bun's startup speed.

A file watcher would add:
- `fs.watch` complexity (platform-specific bugs, especially on Windows)
- Module cache invalidation logic (which Bun doesn't fully support yet)
- A WebSocket server for browser refresh
- Edge cases around partial rebuilds, circular imports, and CSS hot replacement

The tradeoff isn't worth it. Bun starts fast enough that `Ctrl+C → ↑ → Enter` is near-instant. Tools like [bgrun](https://github.com/7flash/bgrun) can watch and auto-restart for you externally — keeping that concern out of the framework.

We'd rather have a small, correct codebase than a large one with a fragile file watcher.

### Project Structure

```
src/
├── server/
│   ├── app-router.ts      # Route matching, SSR pipeline, error boundaries
│   ├── build.ts            # Asset build pipeline (JS, CSS, static files)
│   ├── serve.ts            # HTTP server with measure-fn observability
│   ├── router.ts           # File-based route discovery
│   ├── ssg.ts              # Static site generation (pre-render + memory serve)
│   ├── ssr.ts              # renderToString (VNode → HTML)
│   ├── head.ts             # <Head> component (side-channel collection)
│   ├── imports.ts          # Import map generation
│   └── types.ts            # Shared types
├── client/
│   ├── render.ts           # VDOM renderer + Fiber reconciler (~2KB)
│   ├── reconcilers/        # Pluggable diffing strategies
│   │   ├── keyed.ts        # O(n log n) key-based with LIS
│   │   ├── sequential.ts   # O(n) index-based
│   │   └── replace.ts      # Full replace (baseline)
│   ├── jsx-runtime.ts      # JSX transform for client bundles
│   ├── jsx-dom.ts          # JSX-to-real-DOM for mount scripts
│   └── types.ts            # VNode, Component, Props types
└── web.ts                  # Main entry point
```

### Observability

Every operation is instrumented with [measure-fn](https://github.com/7flash/measure-fn):

```
[a] ✓ Discover routes 8.10ms → 17 routes
[b] ... GET http://localhost:3000/
[b-a] ... Middleware: app
[b-a] ✓ Middleware: app 0.12ms
[b-b] ... Import page
[b-b] ✓ Import page 0.04ms
[b-c] ... SSR renderToString
[b-c] ✓ SSR renderToString 0.31ms
[build:d] ... Style: globals.css
[build:d] ✓ Style: globals.css 0.10ms
[b] ✓ GET http://localhost:3000/ 2.14ms
```

### Running Tests

```bash
bun test
```

## License

MIT © [7flash](https://github.com/7flash)