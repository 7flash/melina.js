---
name: melina
description: Bun-native web framework with file routing. Use this for building server-rendered pages with client mount scripts for interactivity.
---

# Melina.js — Framework Skill

Melina.js is a Bun-native web framework. It renders pages on the server with JSX, and adds client interactivity via **mount scripts** — vanilla JSX that compiles to VNodes with a lightweight runtime.

## When to Use

Use Melina when the user wants to build a web application with:
- Server-rendered HTML pages
- File-based routing (Next.js App Router style)
- Client-side interactivity without a full SPA framework
- Tailwind CSS styling
- API endpoints

## Project Setup

### New Project

```bash
npx melina init my-app
cd my-app
bun install
bun run server.ts
```

### Existing Project

```bash
bun add melina
```

Create `server.ts`:

```ts
import { start } from 'melina';

await start({
  appDir: './app',
  port: 3000,
  defaultTitle: 'My App',
});
```

## File Structure

```
app/
├── layout.tsx           # Root layout (server, wraps all pages)
├── layout.client.tsx    # Layout mount script (persistent, survives navigation)
├── page.tsx             # Home page (/)
├── page.client.tsx      # Home page mount script (per-page)
├── globals.css          # Global styles (auto-discovered)
├── about/
│   └── page.tsx         # /about
├── post/[id]/
│   ├── page.tsx         # /post/:id (dynamic route)
│   └── page.client.tsx  # Client interactivity for post page
└── api/
    └── messages/
        └── route.ts     # API endpoint: GET/POST /api/messages
```

## Routing Rules

| File Pattern | URL | Type |
|---|---|---|
| `app/page.tsx` | `/` | Page |
| `app/about/page.tsx` | `/about` | Page |
| `app/post/[id]/page.tsx` | `/post/:id` | Dynamic page |
| `app/api/messages/route.ts` | `/api/messages` | API route |
| `app/layout.tsx` | — | Layout (wraps children) |

## Key Patterns

### Server Page (`page.tsx`)

Pages render on the server. They can use async/await and access server resources.

```tsx
export default function HomePage() {
  return (
    <div>
      <h1>Hello</h1>
      <div id="interactive-root" />
    </div>
  );
}
```

### Root Layout (`layout.tsx`)

Every app needs a root layout. It receives `{children}` for the current page.

```tsx
export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

### Client Mount Script (`page.client.tsx`)

Mount scripts add interactivity to server-rendered HTML. They export a default `mount()` function. Melina auto-invokes it when the page loads.

**JSX in mount scripts compiles to VNodes** which are rendered using `render`.

```tsx
// app/page.client.tsx
import { render } from 'melina/client';

export default function mount(): () => void {
  const root = document.getElementById('interactive-root');
  if (!root) return () => {};

  // Add event listeners to server-rendered elements
  function handleClick(e: Event) {
    console.log('Clicked!', e.target);
  }
  root.addEventListener('click', handleClick);

  // JSX creates VNodes — render them to the DOM
  const widget = (
    <div className="widget">
      <button onClick={() => alert('Hello!')}>Click me</button>
    </div>
  );
  render(widget, root);

  // Return cleanup function (called on page navigation)
  return () => {
    root.removeEventListener('click', handleClick);
  };
}
```

**Rules:**
- `page.client.tsx` — Per-page. Mounts on load, cleans up on navigation away.
- `layout.client.tsx` — Persistent. Runs once, survives across page navigations.
- The return value of `mount()` is a cleanup function.
- Uses `melina/client` runtime (VDOM).
- Use `render(vnode, container)` to mount dynamic content.

### API Route (`route.ts`)

Export named HTTP method handlers:

```ts
// app/api/messages/route.ts
export async function GET(req: Request) {
  return Response.json([{ id: 1, text: 'Hello' }]);
}

export async function POST(req: Request, { params }) {
  const body = await req.json();
  return Response.json({ ok: true });
}
```

### Styling with Tailwind CSS

Create `app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #0a0a0f;
  --color-accent: #6366f1;
}
```

Melina auto-discovers `globals.css`, `global.css`, or `app.css` in the app directory and processes it with PostCSS + Tailwind.

## Server API

### `start(options)` — Quick start

```ts
import { start } from 'melina';

await start({
  appDir: './app',        // default: './app'
  port: 3000,             // default: 3000 or BUN_PORT env
  defaultTitle: 'My App',
});
```

### `serve(handler, options)` + `createAppRouter(options)` — Advanced

```ts
import { serve, createAppRouter } from 'melina';

const router = createAppRouter({
  appDir: './app',
  defaultTitle: 'My App',
  globalCss: './app/globals.css',  // explicit CSS path
});

serve(router, { port: 3000 });
```

### Build helpers (for custom handlers)

```ts
import { buildScript, buildStyle, buildAsset, buildClientScript } from 'melina';

const scriptUrl = await buildScript('./src/app.ts');   // JS/TS → hashed URL
const cssUrl = await buildStyle('./src/style.css');     // CSS → processed URL
const imgUrl = await buildAsset(Bun.file('./icon.png')); // Static asset → hashed URL
```

## Common Patterns

### Infinite Scroll

```tsx
// page.client.tsx
export default function mount() {
  const sentinel = document.getElementById('load-more');
  if (!sentinel) return () => {};

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMorePosts();
  }, { threshold: 0.1 });

  observer.observe(sentinel);

  return () => observer.disconnect();
}
```

### Floating Widget (layout-level)

```tsx
// layout.client.tsx — persists across navigation
export default function mount() {
  const toggle = document.getElementById('widget-toggle');
  const panel = document.getElementById('widget-panel');
  if (!toggle || !panel) return () => {};

  function handleToggle() {
    panel!.classList.toggle('hidden');
  }

  toggle.addEventListener('click', handleToggle);
  return () => toggle.removeEventListener('click', handleToggle);
}
```

### SSE / EventSource

```tsx
// layout.client.tsx
export default function mount() {
  const es = new EventSource('/api/messages');
  es.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    // Update DOM...
  };
  return () => es.close();
}
```

## Testing with bgr

Use bgr to manage the dev server:

```bash
bgr --name my-app --command "bun run server.ts" --directory ./my-app --force
bgr my-app --logs
bgr --stop my-app
```

## Important Notes

1. Pages use `melina` VDOM for **server rendering**.
2. Client mount scripts use `melina/client` VDOM + `render`.
3. The framework auto-discovers routes at startup from the `app/` directory.
4. CSS is processed with PostCSS + autoprefixer + Tailwind CSS v4.
5. All built assets are served from memory — no `dist/` or `build/` directory.
6. The `melina` package is published on npm: `bun add melina`.
