# Melina.js 🦊

**A lightweight web framework for Bun with zero-config builds**

[![npm version](https://img.shields.io/npm/v/melina)](https://www.npmjs.com/package/melina)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1)](https://bun.sh)

Melina.js is a Bun-native web framework with Next.js-style file routing. Server pages render HTML with JSX, client interactivity is added via **mount scripts** — vanilla JSX that compiles to lightweight VNodes with a micro-runtime for efficient updates.

## ✨ Features

- 📁 **File-based routing** — Next.js App Router style (`app/page.tsx` → `/`)
- ⚡ **In-memory builds** — No `dist/` folder, assets built and served from RAM
-  **Mount scripts** — `page.client.tsx` adds interactivity to server-rendered HTML
- 🎨 **Tailwind CSS v4** — Built-in PostCSS + Tailwind support
- 🌐 **Import maps** — Browser-native module resolution, no vendor bundles
- 🔄 **Nested layouts** — Automatic layout composition with `layout.tsx`
- ⚡ **API routes** — `app/api/*/route.ts` for backend endpoints

## 🚀 Quick Start

```bash
# Create a new project
npx melina init my-app
cd my-app
bun install

# Start dev server
bun run server.ts
```

Or from scratch with the programmatic API:

```ts
// server.ts
import { start } from 'melina';

await start({
  appDir: './app',
  port: 3000,
  defaultTitle: 'My App',
});
```

## 📦 Project Structure

```
my-app/
├── app/
│   ├── layout.tsx           # Root layout (server-rendered shell)
│   ├── layout.client.tsx    # Layout mount script (persistent client JS)
│   ├── page.tsx             # Home page (/)
│   ├── page.client.tsx      # Home page mount script
│   ├── globals.css          # Global styles (Tailwind CSS)
│   ├── about/
│   │   └── page.tsx         # /about
│   ├── post/[id]/
│   │   └── page.tsx         # /post/:id (dynamic route)
│   └── api/
│       └── messages/
│           └── route.ts     # API endpoint
├── server.ts                # Entry point
└── package.json
```

## 🏗 Architecture

### Server Pages (`page.tsx`)

Pages are server-rendered JSX components. They can use async/await, access databases, read files — anything that runs on the server.

```tsx
// app/page.tsx

export default function HomePage() {
  const posts = getPostsFromDB(); // Server-side data fetching

  return (
    <div>
      <h1>Welcome</h1>
      {posts.map(post => (
        <article key={post.id} className="post-card" data-post-id={post.id}>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
        </article>
      ))}
      <div id="load-more" />
    </div>
  );
}
```

### Layouts (`layout.tsx`)

Root layout wraps all pages. Must include `{children}` for the page content.

```tsx
// app/layout.tsx

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>My App</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

Nested layouts work automatically — just add `layout.tsx` in any subdirectory.

### Client Mount Scripts (`page.client.tsx`)

Mount scripts add interactivity to server-rendered HTML. They export a default `mount()` function that Melina auto-invokes when the page loads. JSX in mount scripts compiles to **VNodes** which can be mounted using `render`.

```tsx
// app/page.client.tsx
import { render } from 'melina/client';

export default function mount(): () => void {
  const feedPosts = document.getElementById('feed-posts');
  if (!feedPosts) return () => {};

  // Add click handlers to server-rendered elements
  function handleClick(e: Event) {
    const card = (e.target as Element).closest('.post-card') as HTMLElement;
    if (!card) return;
    window.location.href = `/post/${card.dataset.postId}`;
  }

  feedPosts.addEventListener('click', handleClick);

  // JSX creates VNodes — mount them using render()
  const loadMore = document.getElementById('load-more');
  if (loadMore) {
    // Renders the button into the load-more container
    render(<button className="load-btn">Load More</button>, loadMore);
  }

  // Return cleanup function (called on navigation away)
  return () => {
    feedPosts.removeEventListener('click', handleClick);
  };
}
```

**Key concepts:**
- `page.client.tsx` — Runs per-page. Mounts when page loads, cleans up on navigation.
- `layout.client.tsx` — Runs once. Persists across page navigations (great for floating widgets, global UI).
- JSX compiles to VNodes via `melina/client`.
- The `mount()` return value is a cleanup function for event listeners, timers, etc.

### API Routes (`route.ts`)

Export HTTP method handlers from `app/api/*/route.ts`:

```ts
// app/api/messages/route.ts

export async function GET(req: Request) {
  const messages = await db.getMessages();
  return Response.json(messages);
}

export async function POST(req: Request, { params }) {
  const body = await req.json();
  await db.createMessage(body);
  return Response.json({ ok: true });
}
```

### Dynamic Routes

Use `[param]` directory names for dynamic segments:

```
app/post/[id]/page.tsx  →  /post/:id
app/user/[userId]/page.tsx  →  /user/:userId
```

Access params in the page component:

```tsx
export default function PostPage({ params }: { params: { id: string } }) {
  return <h1>Post #{params.id}</h1>;
}
```

## 🎨 Styling

Melina has built-in Tailwind CSS v4 + PostCSS support. Just add a `globals.css`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #0a0a0f;
  --color-accent: #6366f1;
}
```

Melina auto-discovers `globals.css`, `global.css`, or `app.css` in the app directory.

## 🔧 API Reference

### `start(options)`

Start a Melina server with file-based routing:

```ts
import { start } from 'melina';

await start({
  appDir: './app',     // Path to app directory (default: './app')
  port: 3000,          // Port number (default: 3000, or BUN_PORT env)
  defaultTitle: 'My App',
});
```

### `serve(handler, options)` + `createAppRouter(options)`

Lower-level API for custom setups:

```ts
import { serve, createAppRouter } from 'melina';

const router = createAppRouter({
  appDir: './app',
  defaultTitle: 'My App',
  globalCss: './app/globals.css',
});

serve(router, { port: 3000 });
```

### CLI

```bash
npx melina init <project-name>  # Create new project from template
npx melina start                # Start dev server in current directory
```

## 📋 Examples

| Example | Description |
|---------|-------------|
| [`shopping-cart`](./examples/shopping-cart) | E-commerce with cart state managed via XState in mount scripts |
| [`social-feed`](./examples/social-feed) | Social feed with messenger widget, infinite scroll, SSE messaging |

## License

MIT © [Melina.js](https://github.com/nicholasgriffintn/melina.js)