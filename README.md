# Melina.js 🦊

**A lightweight, islands-architecture web framework for Bun**

[![npm version](https://img.shields.io/npm/v/@ments/web)](https://www.npmjs.com/package/@ments/web)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)

Melina.js is a Next.js-compatible framework with a radically simpler architecture. Built specifically for Bun, it eliminates the need for external bundlers by leveraging Bun's native build APIs.

## ✨ Features

- 🏝️ **Islands Architecture** — Only hydrate what needs to be interactive
- 📁 **File-based Routing** — Next.js App Router style (`app/page.tsx` → `/`)
- ⚡ **In-Memory Builds** — No `dist/` folder, assets built and served from RAM
- 🔄 **Partial Page Swaps** — SPA-like navigation without the SPA complexity
- 🎨 **Tailwind CSS v4** — Built-in support for CSS-first configuration
- 🌐 **Import Maps** — Browser-native module resolution, no vendor bundles

## 🚀 Quick Start

```bash
# Install
bun add @ments/web

# Create app structure
mkdir -p app/components

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

## 🏝️ Creating Islands (Client Components)

```tsx
// app/components/Counter.tsx
'use client';

import { useState } from 'react';
import { island } from '@ments/web/island';

function CounterImpl({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}

export const Counter = island(CounterImpl, 'Counter');
```

Use in pages:

```tsx
// app/page.tsx
import { Counter } from './components/Counter';

export default function Home() {
  return (
    <div>
      <h1>My App</h1>
      <Counter initialCount={10} />
    </div>
  );
}
```

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
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page (/)
│   ├── about/
│   │   └── page.tsx     # /about
│   ├── api/
│   │   └── hello/
│   │       └── route.ts # API route
│   ├── components/
│   │   └── Counter.tsx  # 'use client' component
│   └── globals.css      # Global styles
└── package.json
```

## 🤔 Why Melina?

| Traditional SPA | Melina.js |
|-----------------|-----------|
| Bundle everything | Islands hydrate selectively |
| Full page refresh or client routing | Partial page swaps |
| Complex Webpack/Vite config | Zero config, Bun-native |
| 100KB+ vendor chunks | Browser-native import maps |

## License

MIT © [Mements](https://github.com/mements)