# Melina.js 🦊

**A server-first web framework for Bun**

[![npm version](https://img.shields.io/npm/v/melina)](https://www.npmjs.com/package/melina)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Melina.js renders pages on the server, sends HTML to the browser, and lets you add interactivity exactly where you need it. No bundler config, no build step — just Bun.

## Quick Start

### 1. Create your project

```bash
mkdir my-app && cd my-app
bun init -y
bun add melina react react-dom
```

### 2. Create `server.ts`

```ts
import { start } from 'melina';

await start({
  port: 3000,
  defaultTitle: 'My App',
});
```

### 3. Create `app/page.tsx`

```tsx
export default function Home() {
  return (
    <div>
      <h1>Hello Melina! 🦊</h1>
      <p>This page was rendered on the server.</p>
    </div>
  );
}
```

### 4. Run it

```bash
bun run server.ts
```

Open http://localhost:3000 — your page is served as static HTML with zero client JavaScript.

## Adding Interactivity

Create `app/page.client.tsx` next to your page to add client-side behavior:

```tsx
export default function mount(): () => void {
  const h1 = document.querySelector('h1');
  h1?.addEventListener('click', () => {
    h1.textContent = 'Clicked! 🎉';
  });

  // Return cleanup function (called on navigation)
  return () => {};
}
```

The framework automatically discovers `page.client.tsx` files and bundles them for the browser. Your mount function runs after the server-rendered HTML is in the DOM.

## What You Get

- **File-based routing** — `app/page.tsx` → `/`, `app/about/page.tsx` → `/about`, `app/post/[id]/page.tsx` → `/post/:id`
- **Layouts** — `app/layout.tsx` wraps all pages, persists across navigation
- **Client mount scripts** — `page.client.tsx` for vanilla interactivity, no framework required
- **API routes** — `app/api/hello/route.ts` with GET/POST handlers
- **View Transitions** — Smooth morphing animations between pages
- **Tailwind CSS v4** — Built-in, CSS-first configuration
- **In-memory builds** — No `dist/` folder, assets built and served from RAM
- **Import Maps** — Browser-native module resolution, no vendor bundles
- **Streaming HTML** — `yield` chunks for large pages

## Programmatic API

### Simple — `start()`

```ts
import { start } from 'melina';

await start({
  appDir: './app',
  port: 3000,
  defaultTitle: 'My App',
});
```

### Custom middleware — `serve()` + `createAppRouter()`

```ts
import { serve, createAppRouter } from 'melina';

const app = createAppRouter({ appDir: './app' });

serve(async (req, measure) => {
  if (req.url.endsWith('/health')) {
    return new Response('OK');
  }
  return app(req, measure);
}, { port: 3000 });
```

### SPA mode — `spa()`

```ts
import { serve, spa } from 'melina';

serve(async (req) => {
  return await spa({
    entrypoint: './App.client.tsx',
    title: 'My SPA',
  });
});
```

## Examples

| Example | Description |
|---------|-------------|
| **[social-feed](./examples/social-feed/)** | 🏆 Flagship — App Router, layouts, client scripts, SSE, XState |
| **[programmatic-api](./examples/programmatic-api/)** | Custom server with middleware via `createAppRouter()` |
| **[htmx-jsx](./examples/htmx-jsx/)** | HTMX + JSX server rendering, zero client framework |
| **[mcp](./examples/mcp/)** | MCP protocol server & test client |
| **[view-morph](./examples/view-morph/)** | View Transitions + persistent state across pages |
| **[stream-vanilla](./examples/stream-vanilla/)** | Streaming HTML with `yield`, no framework |
| **[stream-react-tailwind](./examples/stream-react-tailwind/)** | Streaming HTML with React + Tailwind |
| **[wrapped-react](./examples/wrapped-react/)** | SPA wrapper with `spa()` helper |
| **[wrapped-vanilla](./examples/wrapped-vanilla/)** | SPA wrapper with `frontendApp()` helper |

## Learn More

- **[Developer Guide](./GUIDE.md)** — Routing, layouts, client scripts, API routes, styling, state persistence
- **[Architecture Deep Dive](./docs/ARCHITECTURE.md)** — Technical internals, build system, navigation lifecycle
- **[Changelog](./CHANGELOG.md)** — Release history

## License

MIT © [Mements](https://github.com/mements)