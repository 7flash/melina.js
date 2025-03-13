# Melina.js 🦊

**A lightweight web framework for Bun with zero-config builds**

[![npm version](https://img.shields.io/npm/v/melina)](https://www.npmjs.com/package/melina)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)

Melina.js is a Bun-native web framework with Next.js-style file routing and a dual-mode client architecture. Server pages render HTML with JSX. Client interactivity is added via **mount scripts** — either with vanilla JSX-to-DOM (zero-framework) or React (auto-detected from imports).

## ✨ Features

- 📁 **File-based Routing** — Next.js App Router style (`app/page.tsx` → `/`)
- ⚡ **In-Memory Builds** — No `dist/` folder, assets built and served from RAM
- 🎭 **Dual-Mode Client JSX** — Vanilla JSX-to-DOM (default) or React (auto-detected)
- 🔄 **View Transitions** — SPA-like navigation with the View Transitions API
- 🎨 **Tailwind CSS v4** — Built-in support for CSS-first configuration
- 🌐 **Import Maps** — Browser-native module resolution, no vendor bundles

## 🚀 Quick Start

```bash
# Install
bun add melina

# Create app structure
mkdir -p app

# Create a page
cat > app/page.tsx << 'EOF'
export default function Home() {
  return <h1>Hello Melina! 🦊</h1>;
}
EOF

# Create layout
cat > app/layout.tsx << 'EOF'
export default function Layout({ children }) {
  return (
    <html>
      <body>
        <main id="melina-page-content">{children}</main>
      </body>
    </html>
  );
}
EOF

# Start dev server
bunx melina start
```

Open http://localhost:3000 🎉

## 🎭 Client Interactivity

Add a `page.client.tsx` or `layout.client.tsx` file alongside the server component to add interactivity:

```tsx
// app/page.client.tsx — runs in the browser
import { useState } from 'melina/client';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}

// Mount into the server-rendered page
const el = document.getElementById('counter-root');
if (el) render(<Counter />, el);
```

### How the dual-mode works

Melina auto-detects which mode to use **per file** based on imports:

| Import | Mode | What happens |
|--------|------|--------------|
| `melina/client` | **Vanilla** | JSX compiles to real DOM elements. No framework, no VDOM. |
| `react` | **React** | React + ReactDOM loaded via import maps. Full React ecosystem. |

## 📖 Documentation

- **[Developer Guide](./GUIDE.md)** — Core concepts, best practices, API reference
- **[Architecture Deep Dive](./docs/ARCHITECTURE.md)** — Technical internals

## 🔧 CLI

```bash
melina init <name>  # Create new project
melina start        # Start dev server
```

## 📦 Project Structure

```
my-app/
├── app/
│   ├── layout.tsx         # Root layout (server)
│   ├── layout.client.tsx  # Layout mount script (client)
│   ├── page.tsx           # Home page (/)
│   ├── page.client.tsx    # Home page mount script
│   ├── about/
│   │   └── page.tsx       # /about
│   ├── api/
│   │   └── hello/
│   │       └── route.ts   # API route
│   └── globals.css        # Global styles
└── package.json
```

## 📋 Examples

| Example | Description |
|---------|-------------|
| [`shopping-cart`](./examples/shopping-cart) | E-commerce cart with server/client mount scripts |
| [`social-feed`](./examples/social-feed) | Social feed with SSE messaging and View Transitions |

## 🤔 Why Melina?

| Traditional SPA | Melina.js |
|-----------------|-----------|
| Bundle everything | Server-render pages, add JS only where needed |
| Full page refresh or client routing | View Transitions for smooth navigation |
| Complex Webpack/Vite config | Zero config, Bun-native builds |
| 100KB+ vendor chunks | Browser-native import maps |
| React required everywhere | React optional — vanilla JSX-to-DOM by default |

## License

MIT © [Melina.js](https://github.com/nicholasgriffintn/melina.js)