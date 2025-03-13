# Melina.js Architecture Deep Dive

> ⚠️ **Note:** This document describes the legacy islands architecture. The islands system, Hangar runtime, and `island()` wrappers have been removed. Melina.js now uses a **server/client mount script pattern** with dual-mode JSX (vanilla or React). See the [README](../README.md) for current architecture. The build system, import maps, and routing sections below remain accurate.

**A Technical Guide to the Melina.js Web Framework**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [The Two Graphs Model](#2-the-two-graphs-model)
3. [Islands Architecture](#3-islands-architecture)
4. [Server Infrastructure](#4-server-infrastructure)
5. [The In-Memory Build System](#5-the-in-memory-build-system)
6. [Import Maps & Dependency Resolution](#6-import-maps--dependency-resolution)
7. [Routing & Navigation](#7-routing--navigation)
   - [7.1 Island Lifecycle During Navigation](#71-island-lifecycle-during-navigation)
8. [State Persistence & Hydration](#8-state-persistence--hydration)
9. [Advanced Patterns](#9-advanced-patterns)
10. [Security Considerations](#10-security-considerations)
11. [Performance Characteristics](#11-performance-characteristics)


---

## 1. Introduction

Melina.js represents a fundamental shift in web framework architecture, moving away from complex multi-layered toolchains toward a **runtime-native** approach. Rather than relying on separate bundlers, transpilers, and build systems, Melina interfaces directly with Bun's high-performance internals.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Traditional Approach                         │
│  Source → Webpack → Babel → PostCSS → AST → Bundle → Disk      │
│                     (multiple processes, complex config)        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Melina.js Approach                           │
│  Source → Bun.build() → Memory → Serve                         │
│           (single process, zero config, 10-100x faster)        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Zero external bundler** — Uses `Bun.build()` at runtime
- **In-memory asset serving** — No `dist/` folder, assets live in RAM
- **Browser-native modules** — Import Maps instead of vendor bundles
- **Islands Architecture** — Selective hydration for optimal TTI

---

## 2. The Two Graphs Model

Melina.js separates your application into two distinct execution contexts:

### Server Graph (Bun Runtime)

- Layouts and pages render on the server
- Has access to: databases, file system, environment variables, async operations
- Generates HTML that is sent to the browser
- **Cannot** use React hooks or browser APIs

### Client Graph (Browser)

- Interactive "islands" that hydrate in the browser
- Each island is an independent React root
- Can use `useState`, `useEffect`, browser APIs
- Marked with `'use client'` directive

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Bun)                                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │  layout.tsx │ → │  page.tsx   │ → │   HTML      │ ─────────┼──→
│  │  (Server)   │   │  (Server)   │   │             │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│         ↑                 ↑                                     │
│         │   imports       │   imports                           │
│         ↓                 ↓                                     │
│  ┌─────────────────────────────────────────────────────────────┤
│  │  Client Components (rendered as island markers on server)   │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
                                                         │
                                                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER                                     │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Static HTML + Hydrated Islands                            ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 ││
│  │  │ Counter  │  │ SearchBar│  │ JobTracker│                 ││
│  │  │ (React)  │  │ (React)  │  │ (React)   │                 ││
│  │  │   root   │  │   root   │  │   root    │                 ││
│  │  └──────────┘  └──────────┘  └──────────┘                 ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Islands Architecture

### Traditional SPA vs Islands

![Islands Architecture Diagram](./islands-hydration.png)

**Traditional "Monolithic Hydration" (Left):**
- The entire page is a React application
- Browser must download and execute JavaScript for everything
- All components hydrate, even static content
- Slow Time to Interactive (TTI)

**Islands Architecture (Right):**
- Most of the page is static HTML
- Only interactive components ("islands") load JavaScript
- Each island hydrates independently
- Fast TTI, minimal JavaScript

### How Islands Work in Melina

1. **Server Render**: Page renders normally, including client components
2. **Marker Injection**: Client components render as `<div data-melina-island="Name">`
3. **Manifest Creation**: Server builds a map of island names → script paths
4. **Hydration Runtime**: Browser script finds markers and hydrates each island

```tsx
// Server output for <Counter initialCount={10} />
<div data-melina-island="Counter" 
     data-props='{"initialCount":10}'>
  <!-- Loading placeholder or SSR content -->
</div>

// In <head>
<script>
  window.__MELINA_MANIFEST__ = {
    "Counter": "/Counter-a1b2c3.js"
  };
</script>
```

### The `island()` Helper

```tsx
// app/components/Counter.tsx
'use client';

import { island } from 'melina/island';

function CounterImpl({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// SSR: Returns <div data-melina-island="Counter" ...>
// Browser: Returns the actual CounterImpl component
export const Counter = island(CounterImpl, 'Counter');
```

The `island()` wrapper detects the execution environment:
- **Server**: Returns a placeholder `<div>` with island markers
- **Browser**: Returns the original component (for hydration)

---

## 4. Server Infrastructure

### Unix Domain Socket Optimization

Melina defaults to Unix Domain Sockets for production deployments:

```
┌────────────────────────────────────────────────────────────────┐
│  TCP Loopback (localhost:3000)                                 │
│  ┌──────┐    ┌────────────┐    ┌──────────┐    ┌──────┐       │
│  │ App  │ →  │ TCP Stack  │ →  │  Routing │ →  │ Nginx│       │
│  │      │    │ Checksum   │    │  Tables  │    │      │       │
│  └──────┘    │ Encapsulate│    └──────────┘    └──────┘       │
│              └────────────┘                                    │
│                    ↓ Full network stack overhead               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Unix Domain Socket (/tmp/melina.sock)                         │
│  ┌──────┐                               ┌──────┐              │
│  │ App  │ ─────── Kernel Buffer ──────→ │ Nginx│              │
│  └──────┘        (direct copy)          └──────┘              │
│           ↓ Bypasses entire TCP/IP stack                       │
└────────────────────────────────────────────────────────────────┘
```

### Socket Lifecycle Management

```typescript
// Cleanup before start and on termination
const cleanupUnixSocket = async () => {
  if (existsSync(socketPath)) {
    await unlink(socketPath);
  }
};

process.on('SIGINT', cleanupUnixSocket);
process.on('SIGTERM', cleanupUnixSocket);
```

This prevents `EADDRINUSE` errors on restart — a common issue with Unix sockets.

### Request Context & Observability

Every request gets a unique ID for distributed tracing:

```typescript
const requestId = req.headers.get('X-Request-ID') 
  ?? generateRequestId();

// Threaded through execution context
return measure(async () => {
  // ... handler logic
}, 'requestHandler', { requestId });
```

---

## 5. The In-Memory Build System

### Traditional vs Melina Build Flow

```
Traditional:
  Source → Webpack → disk/bundle.js → read → serve
  
Melina:
  Source → Bun.build() → memory → serve (O(1) lookup)
```

### Asset Compilation Pipeline

```typescript
async function buildScript(entryPoint: string): Promise<string> {
  // 1. Check cache (production only)
  if (!isDev && buildCache[entryPoint]) {
    return buildCache[entryPoint];
  }

  // 2. Build in memory (no outdir!)
  const result = await bunBuild({
    entrypoints: [entryPoint],
    outdir: undefined,  // ← Key: keeps output in memory
    target: 'browser',
    sourcemap: isDev ? 'linked' : 'none',
    minify: !isDev,
  });

  // 3. Store in memory with content hash
  const hash = createHash(content).slice(0, 8);
  const virtualPath = `/script-${hash}.js`;
  builtAssets[virtualPath] = { content, contentType: 'text/javascript' };
  
  // 4. Cache for subsequent requests
  buildCache[entryPoint] = virtualPath;
  return virtualPath;
}
```

### CSS Pipeline with Tailwind v4

```typescript
const result = await postcss([
  autoprefixer,        // Vendor prefixes for browser compat
  tailwind,            // Tailwind CSS v4 (Rust engine)
]).process(cssContent, { from: cssPath });
```

Tailwind v4 uses **CSS-first configuration**:

```css
/* app/globals.css - No tailwind.config.js needed! */
@import "tailwindcss";

/* Custom theme via CSS */
@theme {
  --color-primary: #667eea;
}
```

---

## 6. Import Maps & Dependency Resolution

### Browser-Native Module Resolution

Instead of bundling `node_modules` into a vendor chunk, Melina generates browser-native Import Maps:

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.1.1",
    "react-dom/client": "https://esm.sh/react-dom@19.1.1/client?external=react"
  }
}
</script>
```

### The `?external=` Pattern

This is critical for singleton dependencies:

```
Without external:
  react-dom bundles its own copy of react
  → Your app has TWO React instances
  → Hooks break, context fails
  
With ?external=react:
  react-dom leaves "import React from 'react'" intact
  → Browser resolves via Import Map
  → Single React instance ✓
```

### Lockfile Parsing

Melina reads `bun.lock` to ensure exact versions:

```typescript
// Reads the new Bun v1.2+ text-based lockfile
const lockfile = await import('./bun.lock', { 
  assert: { type: 'json' } 
});

// Constructs URLs with exact versions
const url = `https://esm.sh/react-dom@${version}?deps=react@${reactVersion}`;
```

---

## 7. Routing & Navigation

### File-Based Route Discovery

```
app/
├── page.tsx              → /
├── about/page.tsx        → /about
├── blog/[slug]/page.tsx  → /blog/:slug (dynamic)
├── api/hello/route.ts    → /api/hello (API)
└── layout.tsx            → wraps all pages
```

### Nested Layouts

Layouts wrap pages from outermost to innermost:

```typescript
// Build component tree
let tree = createElement(PageComponent, { params });

for (let i = layouts.length - 1; i >= 0; i--) {
  const Layout = (await import(layouts[i])).default;
  tree = createElement(Layout, { children: tree });
}
```

### Partial Page Swaps

The magic of SPA-like navigation without the SPA:

```javascript
// Client-side navigation intercept
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a[href]');
  if (!link || link.target === '_blank') return;
  
  e.preventDefault();
  
  // 1. Fetch new page
  const res = await fetch(link.href, {
    headers: { 'X-Melina-Nav': '1' }
  });
  const html = await res.text();
  
  // 2. Parse into DOM
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // 3. Swap the ENTIRE page content container (not individual islands!)
  //    This destroys all React roots inside #melina-page-content
  const newContent = doc.querySelector('#melina-page-content');
  const current = document.querySelector('#melina-page-content');
  current.innerHTML = newContent.innerHTML;  // Old islands are now orphaned
  
  // 4. Find and hydrate NEW islands in the swapped content
  //    Each island gets a fresh createRoot() call
  hydrateNewIslands(current);  // Creates new React roots
  
  // 5. Notify listeners (layout islands can react to navigation)
  window.dispatchEvent(new CustomEvent('melina:navigated'));
});

// Note: Layout islands (outside #melina-page-content) are NEVER touched!
// Their DOM persists, their React root persists, their state persists.
```

**What persists across navigation:**
- Header/footer (outside `#melina-page-content`)
- Island state in layout components
- CSS animations

---

## 7.1 Island Lifecycle During Navigation

Understanding what happens to islands during navigation is **critical** for building correct applications.

### The Two Zones

Your layout divides the page into two zones:

```tsx
// app/layout.tsx
export default function Layout({ children }) {
  return (
    <html>
      <body>
        {/* ZONE 1: Persistent (never unmounts) */}
        <header>
          <SearchBar />     {/* ← React root persists */}
        </header>
        
        {/* ZONE 2: Swappable (unmounts on navigation) */}
        <main id="melina-page-content">
          {children}        {/* ← Content replaced */}
        </main>
        
        {/* ZONE 1: Persistent */}
        <JobTracker />      {/* ← React root persists */}
      </body>
    </html>
  );
}
```

### Visual: Navigation from `/home` to `/about`

```
BEFORE NAVIGATION (on /home)
┌──────────────────────────────────────────────────────────────────┐
│ <header>                                                         │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │ SearchBar Island (React Root #1)         state: "hello"    ││
│   │ [input value="hello"]                                       ││
│   └─────────────────────────────────────────────────────────────┘│
│ </header>                                                        │
│                                                                  │
│ <main id="melina-page-content">                                  │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │ Counter Island (React Root #2)            state: count=5   ││
│   │ [button: Count: 5]                                          ││
│   └─────────────────────────────────────────────────────────────┘│
│   ┌─────────────────────────────────────────────────────────────┐│
│   │ HomeWidget Island (React Root #3)         state: expanded  ││
│   └─────────────────────────────────────────────────────────────┘│
│ </main>                                                          │
│                                                                  │
│ <footer>                                                         │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │ JobTracker Island (React Root #4)         state: 3 jobs    ││
│   └─────────────────────────────────────────────────────────────┘│
│ </footer>                                                        │
└──────────────────────────────────────────────────────────────────┘

                              │
                    Click <Link href="/about">
                              │
                              ▼

AFTER NAVIGATION (on /about)
┌──────────────────────────────────────────────────────────────────┐
│ <header>                                                         │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │ SearchBar Island (React Root #1)  ✅ SAME ROOT, SAME STATE ││
│   │ [input value="hello"]             ← Still "hello"!          ││
│   └─────────────────────────────────────────────────────────────┘│
│ </header>                                                        │
│                                                                  │
│ <main id="melina-page-content">      ← innerHTML replaced       │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │ AboutForm Island (React Root #5)  🆕 NEW ROOT, FRESH STATE ││
│   │ [form fields empty]                                         ││
│   └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│   ❌ Counter (Root #2) - UNMOUNTED, state lost                  │
│   ❌ HomeWidget (Root #3) - UNMOUNTED, state lost               │
│ </main>                                                          │
│                                                                  │
│ <footer>                                                         │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │ JobTracker Island (React Root #4)  ✅ SAME ROOT, SAME STATE││
│   │ [3 jobs still here]                                         ││
│   └─────────────────────────────────────────────────────────────┘│
│ </footer>                                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Lifecycle Rules

| Island Location | On Navigation | React Root | State |
|-----------------|---------------|------------|-------|
| **In Layout** (outside `#melina-page-content`) | Persists | Same | Preserved ✅ |
| **In Page** (inside `#melina-page-content`) | Destroyed | Unmounted | Lost ❌ |
| **Same island in new page** | Re-created | New root | Fresh state |

### Example: Same Island on Different Pages

```tsx
// Both pages use Counter, but they're DIFFERENT React roots!

// app/page.tsx (home)
export default function Home() {
  return <Counter initialCount={10} />;  // Root #A
}

// app/about/page.tsx
export default function About() {
  return <Counter initialCount={20} />;  // Root #B (NEW!)
}
```

**What happens when navigating from `/` to `/about`:**

1. Router fetches `/about` HTML
2. Router replaces `#melina-page-content` innerHTML
3. Old Counter (Root #A) DOM is removed → **React doesn't know, but root is orphaned**
4. Hydration finds new `data-melina-island="Counter"`
5. Creates **new** `createRoot()` for Counter → Root #B
6. Root #B initializes with `initialCount={20}`, fresh state

### Why Doesn't React Preserve State?

In a traditional SPA, React would reconcile the component tree:

```tsx
// SPA: React sees Counter in both trees, preserves state
<App>
  <Counter />  →  <Counter />  // Same component, state preserved
</App>
```

In Islands Architecture, we're doing **DOM surgery**:

```javascript
// Melina: Raw innerHTML replacement, React isn't involved
current.innerHTML = newContent.innerHTML;

// Old React root is orphaned (still thinks it owns those DOM nodes)
// New hydration creates entirely new React root
hydrateIslands(); // createRoot() on new DOM
```

This is the **fundamental trade-off** of Islands Architecture:
- ✅ Faster initial load (less JavaScript)
- ✅ Better TTI (independent hydration)
- ❌ No automatic state preservation between pages

### Why Can't We Cache and Restore Islands?

You might think: "Why not save the island DOM elements before navigation and restore them later?"

We tried this! Here's why it doesn't work:

```javascript
// Attempt: Save island before navigation
const cachedCounter = document.querySelector('[data-melina-island="Counter"]');
cachedCounter.remove();  // Detach from DOM

// ... navigate, replace innerHTML ...

// Attempt: Restore cached island
container.appendChild(cachedCounter);  // Reinsert

// PROBLEM: React root is "orphaned"
// - The React root still exists in memory
// - But React has no way to know the DOM was reattached
// - The root's fiber tree references the OLD DOM position
// - React won't respond to events or re-render properly
```

**The fundamental issue**: React roots are tightly coupled to their DOM position. When you:
1. Call `createRoot(element)` → React attaches internal state to that element
2. Remove the element from DOM → React root becomes "orphaned"
3. Reinsert the element → React doesn't automatically reconnect

The only way to "restore" would be to call `root.render()` again, which resets all state.

**This is why we chose simplicity:**
- Layout islands persist (never touched)
- Page islands get fresh state (predictable behavior)
- Use localStorage/URL for cross-page persistence (explicit, reliable)

### Preserving State Across Navigation

If you need state to survive navigation for page-level islands:

**Option 1: Move to Layout (if appropriate)**
```tsx
// Now persists across all page navigations
// app/layout.tsx
<JobTracker />  // In layout = persistent
```

**Option 2: Persist to localStorage**
```tsx
// app/components/Counter.tsx
function CounterImpl({ initialCount = 0 }) {
  const [count, setCount] = useState(() => {
    // Restore from localStorage on mount
    const saved = localStorage.getItem('counter');
    return saved ? parseInt(saved) : initialCount;
  });

  useEffect(() => {
    // Save to localStorage on change
    localStorage.setItem('counter', String(count));
  }, [count]);

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Option 3: URL State**
```tsx
// State in URL survives navigation AND page refresh
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

  return <select value={filter} onChange={e => updateFilter(e.target.value)}>
    <option value="all">All</option>
    <option value="active">Active</option>
  </select>;
}
```

### Summary Table

| Scenario | What Happens | State |
|----------|--------------|-------|
| Layout island, same page | Nothing | Preserved |
| Layout island, navigate | Nothing | **Preserved** ✅ |
| Page island, same page | Nothing | Preserved |
| Page island, navigate away | DOM removed, root orphaned | **Lost** ❌ |
| Page island, navigate back | New DOM, new root, fresh hydration | **Fresh** |
| Same island in both pages | Old unmounts, new mounts | **Fresh** (different roots) |

---


## 8. State Persistence & Hydration

### The Props Desynchronization Problem

⚠️ **Critical concept for persistent islands:**

When navigating pages:
1. Server renders new page with new props
2. Router keeps existing layout (to preserve state)
3. **Layout islands keep their OLD props!**

```tsx
// ❌ BROKEN: Props won't update on navigation
function Header({ activePage }) {  // ← Stale!
  return <nav className={activePage}>...</nav>;
}

// ✅ CORRECT: Read from URL
function Header() {
  const [activePage, setActivePage] = useState('/');
  
  useEffect(() => {
    setActivePage(window.location.pathname);
    
    const handler = () => setActivePage(window.location.pathname);
    window.addEventListener('melina:navigated', handler);
    return () => window.removeEventListener('melina:navigated', handler);
  }, []);
  
  return <nav className={activePage}>...</nav>;
}
```

### Cross-Island Communication

Islands are independent React roots — they can't share state via React context.

**Pattern 1: Event Bus**
```typescript
// Emit from Island A
window.dispatchEvent(new CustomEvent('job:created', { 
  detail: { id: 1, name: 'Build' } 
}));

// Listen in Island B
useEffect(() => {
  const handler = (e) => setJobs(prev => [...prev, e.detail]);
  window.addEventListener('job:created', handler);
  return () => window.removeEventListener('job:created', handler);
}, []);
```

**Pattern 2: localStorage + Sync**
```typescript
// Write (Island A)
localStorage.setItem('user', JSON.stringify(user));
window.dispatchEvent(new Event('storage'));

// Read (Island B)
const [user, setUser] = useState(() => 
  JSON.parse(localStorage.getItem('user') || 'null')
);
```

---

## 9. Advanced Patterns

### Streaming SSR

For large pages, stream HTML as it's generated:

```typescript
export async function* renderStreaming(tree) {
  yield '<!DOCTYPE html><html><head>...</head><body>';
  
  for await (const chunk of ReactDOMServer.renderToReadableStream(tree)) {
    yield chunk;
  }
  
  yield '</body></html>';
}
```

### API Routes

```typescript
// app/api/users/route.ts
export async function GET(req: Request) {
  const users = await db.query('SELECT * FROM users');
  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  // ... create user
  return new Response(JSON.stringify({ success: true }));
}
```

### Teleported Islands

Islands can render into portals outside the main page flow:

```tsx
function JobTracker() {
  // Fixed position, lives in layout, persists across navigation
  return createPortal(
    <div style={{ position: 'fixed', bottom: 20, right: 20 }}>
      {/* Job list UI */}
    </div>,
    document.body
  );
}
```

---

## 10. Security Considerations

### XSS Prevention in Data Serialization

The framework injects server state into HTML:

```javascript
window.__MELINA_DATA__ = ${JSON.stringify(serverData)};
```

**Risk**: If `serverData` contains `</script>`, it could break out.

**Mitigation**: Use a safe serializer:
```typescript
import serialize from 'serialize-javascript';
const safeData = serialize(serverData, { isJSON: true });
```

### Dependency Lockfile Security

By strictly parsing `bun.lock` and using exact versions in Import Maps, Melina prevents:
- Dependency drift between dev and production
- Supply chain attacks via floating versions
- "Works on my machine" issues

---

## 11. Performance Characteristics

### Benchmarks

| Metric | Traditional SPA | Melina.js |
|--------|-----------------|-----------|
| Cold Start | 2-5s (bundle) | <100ms |
| Asset Build | Disk I/O | Memory (O(1)) |
| TTI | 3-5s | <1s (islands) |
| Navigation | Full reload / Client route | Partial swap |

### Memory Considerations

- **Pro**: In-memory assets = zero disk I/O latency
- **Con**: Large apps may consume heap memory
- **Mitigation**: LRU cache or Redis offload for enterprise scale

### Why It's Fast

1. **Bun.build()** is orders of magnitude faster than Webpack (Zig-based)
2. **In-memory serving** eliminates disk reads
3. **Import Maps** offload vendor code to CDN
4. **Islands** minimize hydration JavaScript
5. **Partial swaps** avoid full page re-renders

---

## Conclusion

Melina.js demonstrates that with a sufficiently capable runtime (Bun) and modern browser standards (Import Maps, ES Modules), the complexity of frontend toolchains can be dramatically reduced.

**The trade-offs:**
- 🔒 **Platform lock-in**: Requires Bun, won't run on Node.js
- 📦 **CDN dependency**: Import Maps rely on esm.sh
- 🧠 **Mental model**: Islands require understanding the two-graphs model

**The benefits:**
- ⚡ **Performance**: Sub-100ms builds, minimal JavaScript
- 🎯 **Simplicity**: Zero config, file-based conventions
- 🔮 **Future-proof**: Aligned with browser standards

---

*Built with [Bun](https://bun.sh) 🧅*
