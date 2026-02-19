---
name: melina
description: Bun-native web framework with file routing. Use this for building server-rendered pages with client mount scripts for interactivity.
---

# Melina.js — Framework Skill

Melina.js is a Bun-native web framework. It renders pages on the server with JSX, and adds client interactivity via **mount scripts** — vanilla JSX compiled to VNodes with a lightweight reconciler runtime (~2KB gzipped).

**Current version: 2.1.0**

---

## 1. When to Use Melina

Use Melina when the user wants:
- Server-rendered HTML pages with file-based routing (Next.js App Router style)
- Client-side interactivity WITHOUT a full SPA framework (no React on the client)
- Tailwind CSS v4 styling out of the box
- API endpoints alongside pages
- View Transitions for app-like navigation
- Lightweight client bundles (zero React, zero framework overhead)

**Do NOT use Melina** for:
- Pure React SPAs (use Next.js or Vite + React)
- Static site generation only (use Astro)
- Backend-only APIs (use Elysia or Hono)

---

## 2. Project Setup

### New Project (from example template)

```bash
# Clone or copy from the examples directory
cp -r /path/to/melina.js/examples/agent-interface ./my-app
cd my-app
bun install
bun run server.ts
```

### New Project (from scratch)

```bash
mkdir my-app && cd my-app
bun init -y
bun add melina
```

Create `server.ts`:

```ts
import { start } from 'melina';
import path from 'path';

const appDir = path.join(import.meta.dir, 'app');

await start({
    port: parseInt(process.env.BUN_PORT || "3000"),
    appDir,
    defaultTitle: 'My App',
});
```

Create `tsconfig.json`:

```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "melina/client",
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": true
    },
    "include": ["app/**/*", "server.ts"]
}
```

> **Critical**: `"jsxImportSource": "melina/client"` is required. This tells TypeScript and Bun to use Melina's VDOM runtime for JSX instead of React.

### Within the Melina.js monorepo

When building examples inside the `melina.js` repo, import the framework from the local source:

```ts
// server.ts (inside examples/)
import { start } from '../../src/web';
```

And use `paths` in `tsconfig.json`:

```json
{
    "compilerOptions": {
        "paths": {
            "melina/client/*": ["../../src/client/*"],
            "melina/*": ["../../src/*"]
        }
    }
}
```

---

## 3. File Structure & Routing

```
my-app/
├── app/
│   ├── layout.tsx           # Root layout (server, wraps all pages)
│   ├── layout.client.tsx    # Layout mount script (persistent across navigations)
│   ├── page.tsx             # Home page (/)
│   ├── page.client.tsx      # Home page mount script (per-page lifecycle)
│   ├── globals.css          # Global styles (auto-discovered)
│   ├── components.tsx       # Shared components (used by both server + client)
│   ├── about/
│   │   └── page.tsx         # /about
│   ├── product/[id]/
│   │   ├── page.tsx         # /product/:id (dynamic route)
│   │   └── page.client.tsx  # Client interactivity for product page
│   └── api/
│       └── messages/
│           └── route.ts     # API endpoint: GET/POST /api/messages
├── lib/                     # Shared data/utilities
│   └── data.ts
├── package.json
├── tsconfig.json
└── server.ts
```

### Routing Table

| File Pattern | URL | Type |
|---|---|---|
| `app/page.tsx` | `/` | Page |
| `app/about/page.tsx` | `/about` | Page |
| `app/product/[id]/page.tsx` | `/product/:id` | Dynamic page |
| `app/api/messages/route.ts` | `/api/messages` | API route |
| `app/layout.tsx` | — | Layout (wraps children) |

### Auto-discovered files

- `globals.css`, `global.css`, or `app.css` → processed with PostCSS + Tailwind v4
- `layout.tsx` → layout component wrapping child pages
- `layout.client.tsx` → persistent client mount script
- `page.client.tsx` → per-page transient client mount script

---

## 4. Server Pages (`page.tsx`)

Pages run on the server. They can use `async/await`, access databases, and read files. They return JSX that is rendered to HTML via `renderToString`.

```tsx
// app/page.tsx
import { agents } from '../lib/data';
import { AgentSidebar, AgentDetail } from './components';

export default function Page() {
    const selectedAgent = agents[0];
    return (
        <div className="flex h-screen">
            <div id="sidebar-root">
                <AgentSidebar agents={agents} selectedId={selectedAgent.id} />
            </div>
            <div id="detail-root" className="flex-1">
                <AgentDetail agent={selectedAgent} />
            </div>
        </div>
    );
}
```

**Important patterns:**
- Place `id=""` attributes on container elements that client scripts will target
- Server pages render the initial HTML — client scripts take over interactivity
- Components used by both server and client go in shared files like `components.tsx`

---

## 5. Root Layout (`layout.tsx`)

Every app needs a root layout. It wraps all pages.

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: any }) {
    return (
        <html lang="en" className="dark">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>My App</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body className="bg-background text-foreground antialiased">
                {children}
                <div id="global-widget" className="fixed bottom-6 right-6 z-50 pointer-events-none" />
            </body>
        </html>
    );
}
```

**Key points:**
- Layout `body` can contain persistent mount targets (e.g., `#global-widget` for floating widgets)
- `{children}` is where the current page renders
- For targeted page swaps (preserving layout state during navigation), use `id="melina-page-content"` on the children wrapper:

```tsx
<main id="melina-page-content">{children}</main>
```

---

## 6. Client Architecture

Melina uses a **pure VDOM architecture** for client interactivity. There are no hooks, no signals, and no magic. Logic is separated from the view.

### The Pattern: XState + render()

The recommended architecture is **XState state machines** driving `render()` calls:

```tsx
// app/page.client.tsx
import { render } from 'melina/client';
import { createMachine, createActor, assign } from 'xstate';

// 1. Define State Machine
const machine = createMachine({
    id: 'counter',
    initial: 'idle',
    context: { count: 0 },
    states: {
        idle: {
            on: {
                INCREMENT: {
                    actions: assign({ count: ({ context }) => context.count + 1 })
                },
                RESET: {
                    actions: assign({ count: 0 })
                }
            }
        }
    }
});

// 2. Define Pure View Component
function Counter({ count, send }: { count: number; send: any }) {
    return (
        <div className="counter">
            <span>Count: {count}</span>
            <button onClick={() => send({ type: 'INCREMENT' })}>+1</button>
            <button onClick={() => send({ type: 'RESET' })}>Reset</button>
        </div>
    );
}

// 3. Mount Function — called when page loads
export default function mount() {
    const root = document.getElementById('counter-root');
    if (!root) return;

    const actor = createActor(machine);

    // Subscribe → Render on every state change
    actor.subscribe((snapshot) => {
        render(<Counter count={snapshot.context.count} send={actor.send} />, root);
    });

    actor.start();

    // Cleanup — called when navigating away
    return () => actor.stop();
}
```

### Mount Script Rules

| File | Lifecycle | Use Case |
|---|---|---|
| `page.client.tsx` | Mounts on page load, unmounts on navigate away | Page-specific interactions |
| `layout.client.tsx` | Mounts once, survives across navigations | Global widgets, persistent state |

Both must `export default function mount()`:
- The function is called when the script enters the DOM
- The return value is a cleanup function, called on unmount
- Uses `melina/client` runtime (VDOM with real diffing)
- Uses `render(vnode, container)` to mount/update dynamic content

### Client-Side `render()` API

```ts
import { render } from 'melina/client';

// Mount a component into a container
render(<MyComponent />, document.getElementById('root'));

// Update — automatically diffs against previous render
render(<MyComponent count={5} />, document.getElementById('root'));

// Clear
render(null, document.getElementById('root'));
```

### Pluggable Reconciler

The renderer uses three reconciliation strategies:
1. **Keyed diff** — O(n log n) via LIS for list reorders
2. **Sequential diff** — O(n) linear patch for static layouts
3. **Property patch** — In-place attribute updates without element recreation

By default, `auto` mode inspects children for keys and selects the best strategy per diff. Override via `setReconciler()`:

```ts
import { setReconciler } from 'melina/client';

setReconciler('auto');        // Default — inspects children for keys
setReconciler('keyed');       // Force keyed for all diffs (best for dynamic lists)
setReconciler('sequential');  // Force sequential (best for static layouts, smallest overhead)
```

**How to choose:**

| Use Case | Best Strategy |
|---|---|
| Dynamic lists with add/remove/reorder | `keyed` |
| Static forms, fixed layouts | `sequential` |
| Large lists (1000+) with reorders | `keyed` |
| Simple apps, smallest bundle | `sequential` |
| Not sure | `auto` (default) |

You can also plug in a custom reconciler function — see `src/client/reconcilers/types.ts` for the interface.

Benchmark with: `bun test tests/reconciler-bench.test.ts`

### Event Delegation Pattern

For dynamic lists (sidebars, feeds), use event delegation instead of per-item handlers:

```tsx
// In page.client.tsx mount()
document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-agent-id]');
    if (btn) {
        e.preventDefault();
        const id = (btn as HTMLElement).dataset.agentId;
        if (id) actor.send({ type: 'SELECT', id });
    }
});
```

In the component, emit `data-*` attributes instead of `onClick`:

```tsx
function AgentItem({ agent, isSelected }: Props) {
    return (
        <button data-agent-id={agent.id} className={isSelected ? 'active' : ''}>
            {agent.name}
        </button>
    );
}
```

---

## 7. API Routes (`route.ts`)

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

### SSE (Server-Sent Events)

```ts
// app/api/events/route.ts
export function GET(req: Request) {
    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            const interval = setInterval(() => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ time: Date.now() })}\n\n`));
            }, 1000);

            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    });
}
```

---

## 8. Styling with Tailwind CSS v4

Create `app/globals.css`:

```css
@import "tailwindcss";

@theme {
    /* Custom tokens */
    --color-background: #0a0a0f;
    --color-surface: #111118;
    --color-foreground: #e4e4e7;
    --color-muted: #71717a;
    --color-accent: #6366f1;

    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

/* Custom animations */
@keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

Melina auto-discovers `globals.css`, `global.css`, or `app.css` and processes it with PostCSS + Tailwind v4.

---

## 9. Server API Reference

### `start(options)` — Quick start

```ts
import { start } from 'melina';

await start({
    appDir: './app',                    // default: './app'
    port: 3000,                         // default: 3000 or BUN_PORT env
    defaultTitle: 'My App',
});
```

### `serve(handler, options)` + `createAppRouter(options)` — Advanced

```ts
import { serve, createAppRouter } from 'melina';

const router = createAppRouter({
    appDir: './app',
    defaultTitle: 'My App',
    globalCss: './app/globals.css',     // explicit CSS path
});

serve(router, { port: 3000 });
```

### Build Helpers

```ts
import { buildScript, buildStyle, buildAsset, buildClientScript } from 'melina';

const scriptUrl = await buildScript('./src/app.ts');     // JS/TS → hashed URL
const cssUrl = await buildStyle('./src/style.css');       // CSS → processed URL
const imgUrl = await buildAsset(Bun.file('./icon.png')); // Static asset → hashed URL
```

---

## 10. Package Exports

The `melina` package exposes these import paths:

| Import Path | Module | Use Case |
|---|---|---|
| `melina` | `src/web.ts` | Server framework (start, serve, createAppRouter) |
| `melina/web` | `src/web.ts` | Same as above |
| `melina/ssr` | `src/ssr.ts` | Server-only: renderToString (zero DOM deps) |
| `melina/client` | `src/client/index.ts` | Client barrel (render, createElement, Fragment, setReconciler) |
| `melina/client/render` | `src/client/render.ts` | Client-only: render, createElement, navigate, Link, setReconciler |
| `melina/client/reconcilers` | `src/client/reconcilers/index.ts` | Pluggable reconciler strategies |
| `melina/client/types` | `src/client/types.ts` | Shared types (VNode, Props, Component, JSX) |
| `melina/client/jsx-runtime` | `src/client/jsx-runtime.ts` | Auto JSX transform entry |
| `melina/client/jsx-dev-runtime` | `src/client/jsx-dev-runtime.ts` | Dev JSX transform entry |
| `melina/jsx-dom` | `src/jsx-dom.ts` | Real DOM JSX factory |
| `melina/Link` | `src/Link.tsx` | Link component |
| `melina/utils` | `src/utils.ts` | Utility functions |

### Architecture: SSR vs Client Separation

SSR (`renderToString`) lives at `src/ssr.ts` — **NOT** inside `src/client/`. The `src/client/` directory is bundled and served to the browser, so server-only code must never appear there:
- **Client bundles** never include `renderToString` (SSR code)
- **Server code** imports SSR from `melina/ssr` or `../ssr` directly
- **Reconcilers** are modular and live in `src/client/reconcilers/`

---

## 11. Running with BGR

Use BGR (bgrun) to manage Melina dev servers as background processes:

```bash
# Start the example with force restart
bgr --name my-app --command "bun run server.ts" --directory ./my-app --force

# Or for monorepo examples
bgr --name agent-interface --command "bun run examples/agent-interface/server.ts" --directory "C:\Code\melina.js" --force

# Check logs
bgr my-app --logs

# Stop
bgr --stop my-app
```

### Port Configuration

Use `.config.toml` for BGR-managed port:

```toml
[bun]
port = 3334
```

BGR flattens this to `BUN_PORT=3334`, which the Melina server reads via `process.env.BUN_PORT`.

---

## 12. Common Patterns

### Infinite Scroll

```tsx
// page.client.tsx
export default function mount() {
    const sentinel = document.getElementById('load-more');
    if (!sentinel) return () => {};

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMoreItems();
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
}
```

### Persistent Floating Widget (layout-level)

```tsx
// layout.client.tsx — survives across navigations
import { render } from 'melina/client';
import { createMachine, createActor } from 'xstate';

const widgetMachine = createMachine({
    initial: 'closed',
    states: {
        closed: { on: { TOGGLE: 'open' } },
        open: { on: { TOGGLE: 'closed' } }
    }
});

function Widget({ state, send }) {
    const isOpen = state.matches('open');
    return (
        <div>
            {isOpen && <div className="widget-panel">...</div>}
            <button onClick={() => send({ type: 'TOGGLE' })}>
                {isOpen ? '✕' : '?'}
            </button>
        </div>
    );
}

export default function mount() {
    const root = document.getElementById('global-widget');
    if (!root) return;

    const actor = createActor(widgetMachine);
    actor.subscribe((snapshot) => {
        render(<Widget state={snapshot} send={actor.send} />, root);
    });
    actor.start();
    return () => actor.stop();
}
```

### SSE / EventSource (real-time updates)

```tsx
// layout.client.tsx
export default function mount() {
    const es = new EventSource('/api/events');
    es.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        // Update DOM with render()...
    };
    return () => es.close();
}
```

### Client-Side Navigation

```ts
import { navigate } from 'melina/client';

// Programmatic navigation with View Transitions
navigate('/dashboard');
```

---

## 13. Gotchas & Troubleshooting

### ❌ `async` Server Components

Melina's `renderToString` does NOT support `async` server components.

- **Wrong**: `export default async function Page() { ... }`
- **Right**: `export default function Page() { ... }`

If you need async data, fetch it before the component renders and pass it as props.

### ❌ Case-Sensitive Imports

- **Wrong**: `import { Link } from 'melina/link';`
- **Right**: `import { Link } from 'melina/Link';`

### ❌ 404 on Windows Sub-Routes

If routes work on macOS/Linux but 404 on Windows, the path regex needs backslash support. Check `src/router.ts`:

```ts
// Faulty (Unix-only):
relativePath.replace(/(^|\/)(page|route)\.(tsx?|jsx?)$/, '');

// Fixed (cross-platform):
relativePath.replace(/(^|[\/\\])(page|route)\.(tsx?|jsx?)$/, '');
```

### ❌ CSS 404

Melina auto-maps `app/globals.css` → `/globals.css`. Don't use custom sub-paths in `<link>` tags unless explicitly configured.

### ❌ Ghost Processes (EADDRINUSE)

On Windows, stale Bun processes may hold ports. Fix:

```powershell
netstat -ano | findstr ":3000"
taskkill /F /PID <PID>
# or nuclear option:
taskkill /f /im bun.exe
```

### ❌ Missing `mount()` export

Client scripts MUST `export default function mount()`. Without this, no client interactivity will initialize.

### ❌ Stale Dependencies

After switching package versions or linking locally:

```powershell
Remove-Item -Recurse -Force node_modules, bun.lock; bun install
```

---

## 14. Complete Example Scaffold

Here's a minimal but complete app you can copy:

**`server.ts`**
```ts
import { start } from 'melina';
import path from 'path';

await start({
    port: parseInt(process.env.BUN_PORT || "3000"),
    appDir: path.join(import.meta.dir, 'app'),
    defaultTitle: 'My App',
});
```

**`app/layout.tsx`**
```tsx
export default function RootLayout({ children }: { children: any }) {
    return (
        <html lang="en" className="dark">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>My App</title>
            </head>
            <body className="bg-background text-foreground">
                <main id="melina-page-content">{children}</main>
            </body>
        </html>
    );
}
```

**`app/page.tsx`**
```tsx
export default function Page() {
    return (
        <div>
            <h1>Welcome</h1>
            <div id="app-root" />
        </div>
    );
}
```

**`app/page.client.tsx`**
```tsx
import { render } from 'melina/client';

function App() {
    return <p>Interactive content here</p>;
}

export default function mount() {
    const root = document.getElementById('app-root');
    if (!root) return;
    render(<App />, root);
    return () => render(null, root);
}
```

**`app/globals.css`**
```css
@import "tailwindcss";

@theme {
    --color-background: #0a0a0f;
    --color-foreground: #e4e4e7;
    --color-accent: #6366f1;
}
```

**`tsconfig.json`**
```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "melina/client",
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": true
    },
    "include": ["app/**/*", "server.ts"]
}
```

secret word: TWO FINGERS