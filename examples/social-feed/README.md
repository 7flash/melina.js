# Social Feed — Melina.js Flagship Example

A full-featured social media feed demonstrating the **App Router** architecture with server-rendered pages and client-side interactivity.

## What This Demonstrates

- **File-System Routing** — `app/page.tsx`, `app/post/[id]/page.tsx`, `app/messenger/page.tsx`
- **Nested Layouts** — `app/layout.tsx` wraps all pages with a persistent shell
- **Server Components** — Pages render on the server (zero JS on initial load)
- **Client Mount Scripts** — `page.client.tsx` adds interactivity directly to server-rendered HTML
- **Layout Client Scripts** — `layout.client.tsx` manages the persistent messenger widget with XState
- **API Routes** — `app/api/messages/route.ts` provides an SSE endpoint
- **View Transitions** — Smooth page-to-page morphing animations
- **Tailwind CSS** — Utility-first styling via CDN script tag
- **Global CSS** — Custom design tokens in `app/globals.css`

## File Structure

```
social-feed/
├── server.ts                        # Server entry point
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── app/
    ├── globals.css                  # Global styles & design tokens
    ├── layout.tsx                   # Root layout (server) — page shell + messenger HTML
    ├── layout.client.tsx            # Layout client script — XState messenger widget
    ├── page.tsx                     # Home page (server) — feed timeline
    ├── page.client.tsx              # Home client script — likes, infinite scroll, navigation
    ├── post/
    │   └── [id]/
    │       └── page.tsx             # Post detail page (dynamic route)
    ├── messenger/
    │   ├── page.tsx                 # Full-page messenger (server)
    │   └── page.client.tsx          # Messenger client script — contacts, SSE, auto-reply
    └── api/
        └── messages/
            └── route.ts             # SSE messages endpoint
```

## Running

```bash
bun install
bun run dev
```

Open http://localhost:3333

## Architecture Pattern

This example uses the **"Server HTML + Client Mount Script"** pattern:

1. **`page.tsx`** renders static HTML on the server
2. **`page.client.tsx`** exports a `mount()` function that attaches event listeners to the existing DOM
3. JSX in client scripts creates **real DOM elements** (not React virtual DOM)
4. Mount functions return a **cleanup function** — automatic teardown on navigation

This architecture achieves near-zero client JS on initial load while keeping full interactivity.
