# Melina.js Architecture Overview

> For the complete technical deep dive, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## The Big Picture

Melina.js is a **runtime-native** web framework that eliminates traditional frontend toolchains:

```
Traditional:  Source → Webpack → Babel → PostCSS → Disk → Serve
Melina.js:    Source → Bun.build() → Memory → Serve
```

## Core Architecture

### 1. Islands Architecture

Only interactive components hydrate in the browser:

```
┌─────────────────────────────────────────────────────────┐
│  Static HTML                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Counter  │  │ SearchBar│  │ JobTracker│  ← Islands  │
│  │ (React)  │  │ (React)  │  │ (React)   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### 2. The Two Zones

```tsx
<body>
  {/* ZONE 1: Persistent (never unmounts) */}
  <header><SearchBar /></header>
  
  {/* ZONE 2: Swappable (replaced on navigation) */}
  <main id="melina-page-content">
    {children}
  </main>
  
  {/* ZONE 1: Persistent */}
  <footer><JobTracker /></footer>
</body>
```

### 3. The Hangar Architecture

A single, persistent React root manages all islands:

- **Single Root** — One React root at `document.documentElement`
- **Portal-Based Rendering** — Islands are "docked" into placeholders
- **Surgical Updates** — Only swapped content triggers new hydration
- **Storage Nodes** — Browser-native state (focus, audio, iframes) preserved

### 4. In-Memory Build System

```typescript
// No dist/ folder - assets live in RAM
const result = await Bun.build({
  entrypoints: [file],
  outdir: undefined,  // ← Memory only
  target: 'browser',
});
```

### 5. Browser-Native Dependencies

Import Maps instead of vendor bundles:

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.1.1",
    "react-dom/client": "https://esm.sh/react-dom@19.1.1/client"
  }
}
</script>
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Server Graph** | Layouts/pages render on Bun, output HTML |
| **Client Graph** | Islands hydrate in browser with React |
| **Partial Swaps** | Only `#melina-page-content` changes |
| **View Transitions** | Native CSS morphing between pages |
| **Event Bus** | Cross-island communication pattern |

## File Structure

```
app/
├── layout.tsx          → Root layout (persistent)
├── page.tsx            → / route
├── about/page.tsx      → /about route
├── blog/[slug]/page.tsx → /blog/:slug (dynamic)
├── api/hello/route.ts  → API endpoint
└── components/
    └── Counter.tsx     → 'use client' island
```

## Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| ⚡ Sub-100ms builds | 🔒 Requires Bun runtime |
| 📦 Minimal JavaScript | 🌐 CDN dependency (esm.sh) |
| 🎯 Zero configuration | 🧠 Islands mental model |

---

**[Read the full Architecture Deep Dive →](./docs/ARCHITECTURE.md)**
