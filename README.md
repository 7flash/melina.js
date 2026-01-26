# Melina.js 🦊

**A high-performance, islands-architecture web framework for Bun**

[![npm version](https://img.shields.io/npm/v/melina)](https://www.npmjs.com/package/melina)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Melina.js is a Next.js-compatible framework with a radically simpler architecture. Built specifically for Bun, it eliminates the need for external bundlers by leveraging Bun's native build APIs.

## ✨ Features

- 🏝️ **Islands Architecture** — Only hydrate what needs to be interactive
- 📁 **File-based Routing** — Next.js App Router style (`app/page.tsx` → `/`)
- ⚡ **In-Memory Builds** — No `dist/` folder, assets built and served from RAM
- 🔄 **High-Fidelity Navigation** — SPA-like experience with state preservation
- 🎬 **View Transitions** — Smooth morphing animations between pages
- 🎨 **Tailwind CSS v4** — Built-in support for CSS-first configuration
- 🌐 **Import Maps** — Browser-native module resolution, no vendor bundles

## 🚀 Quick Start

### 1. Initialize a New Project

The fastest way to get started is using the CLI:

```bash
# Create a new project
bunx melina init my-app
cd my-app
bun install

# Start the development server
bunx melina start
```

### 2. Manual Setup

If you prefer to set it up manually in an existing Bun project:

```bash
bun add melina react react-dom
```

Create your entry point structure:

```bash
mkdir -p app/components
```

**`app/layout.tsx`** (Required)
```tsx
export default function Layout({ children }) {
  return (
    <html>
      <body>
        <main id="melina-page-content">{children}</main>
      </body>
    </html>
  );
}
```

**`app/page.tsx`**
```tsx
export default function Home() {
  return <h1>Hello Melina! 🦊</h1>;
}
```

## 📦 Core Exports

Melina exposes its core APIs through clean entry points:

```tsx
// Navigation
import { Link } from 'melina/Link';

// Programmatic server start
import { start, createApp, serve, createAppRouter } from 'melina';

// Manual island wrapper (optional - auto-wrapping is enabled by default)
import { island } from 'melina/island';
```

## 🧩 Examples

The repository includes several high-quality examples to demonstrate core capabilities.

### 🎵 View Morph Demo (`examples/view-morph`)

A specialized demo showcasing the **Hangar Architecture** and **View Transitions**.

- **Feature**: Smoothly morphs a music player from a mini-widget (on home) to a full-screen immersive player (on specialized routes).
- **Tech**: Uses **Persistent Portals**. The `MusicPlayer` island is defined on multiple pages, but the runtime intelligent detects identical identity, preventing unmounting. It surgicaly "moves" the living React instance to the new DOM position, preserving state (audio playback, progress) while the View Transition API handles the visual morph.

To run it:
```bash
cd examples/view-morph
bun install
bun run dev
```

### 🏝️ App Router Demo (`examples/app-router`)

A comprehensive showcase of the file-based routing system, including:
- Nested Layouts
- API Routes
- Dynamic Segments
- Server Actions pattern (via traditional API routes)

## 🏝️ Creating Islands (Client Components)

Islands are interactive components that hydrate on the client while the rest of your page stays as static HTML.

**With auto-wrapping (recommended)** — Just add `'use client'` and export normally:

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

Melina automatically transforms this to an island during SSR — no manual wrapping needed!

**Manual wrapping** (for advanced control):

```tsx
import { island } from 'melina/island';

function CounterImpl({ initialCount = 0 }) { /* ... */ }
export const Counter = island(CounterImpl, 'Counter');

## 🔄 State Preservation

Melina offers multiple tiers of state persistence:

1.  **Layout Persistence**: Islands placed in `layout.tsx` (outside `#melina-page-content`) are never unmounted.
2.  **Identity Re-targeting**: Islands with the same name/props on different pages are "transported" to the new position without remounting.

## 🎬 View Transitions

Enable smooth morphing animations between pages using the native View Transitions API. Melina automatically suspends rendering until the new DOM is ready, ensuring a glitch-free transition.

```css
/* Shared transition identity */
.album-cover {
  view-transition-name: album-cover;
}
```

## 📖 Documentation

- **[Developer Guide](./GUIDE.md)** — Core concepts, best practices, API reference
- **[Architecture Deep Dive](./docs/ARCHITECTURE.md)** — Technical internals and design philosophy

## 🔧 CLI

```bash
melina init <name>  # Create new project
melina start        # Start dev server (default port: 3000)
```

## 🖥️ Programmatic API

Start Melina from your own script instead of using the CLI:

```ts
// server.ts
import { start } from 'melina';

// Basic usage
await start();

// With options
await start({
  appDir: './app',
  port: 8080,
  defaultTitle: 'My App',
});
```

**Custom middleware example:**

```ts
import { serve, createAppRouter } from 'melina';

const app = createAppRouter({ appDir: './app' });

serve(async (req, measure) => {
  // Add logging, auth, rate limiting, etc.
  console.log('Request:', req.url);
  
  if (req.url.includes('/admin') && !isAuthenticated(req)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return app(req, measure);
}, { port: 3000 });
```

Run with: `bun run server.ts`

## 🤔 Why Melina?

| Traditional SPA | Melina.js |
|-----------------|-----------|
| Bundle everything | Islands hydrate selectively |
| Full page refresh or client routing | Partial page swaps with state preservation |
| Complex Webpack/Vite config | Zero config, Bun-native |
| 100KB+ vendor chunks | Browser-native import maps |
| Custom animation libraries | Native View Transitions API |
| **State Loss on Nav** | **Hangar Architecture (State Persistence)** |

## 🏗️ The Hangar Architecture

Melina.js uses a unique "Hangar" architecture for high-fidelity state persistence:

- **Single React Root** — One persistent React root manages all islands
- **Portal-Based Rendering** — Islands are "docked" into DOM placeholders
- **Surgical DOM Updates** — Only swapped content is replaced

Learn more in the [Architecture Deep Dive](./docs/ARCHITECTURE.md).

## License

MIT © [Mements](https://github.com/mements)