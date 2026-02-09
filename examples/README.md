# Melina.js Examples

Each example demonstrates a specific capability of the framework.

| Example | Description | Key Concepts |
|---------|-------------|-------------|
| [**social-feed**](./social-feed/) | Full social media app with feed, messenger, SSE | App Router, layouts, client scripts, view transitions, XState |
| [**programmatic-api**](./programmatic-api/) | Custom server with middleware | `createAppRouter()`, custom routes, health checks |
| [**htmx-jsx**](./htmx-jsx/) | HTMX + JSX server rendering | `hx-get`, fragments, no client JS framework |
| [**mcp**](./mcp/) | MCP protocol server & test client | Tools, prompts, resources, JSON-RPC |
| [**view-morph**](./view-morph/) | View Transitions + persistent islands | Hangar architecture, state preservation |
| [**stream-vanilla**](./stream-vanilla/) | Streaming HTML (vanilla JS) | `yield` streaming, no framework |
| [**stream-react-tailwind**](./stream-react-tailwind/) | Streaming HTML with React + Tailwind | `yield` streaming, import maps, `measure()` |
| [**wrapped-react**](./wrapped-react/) | SPA wrapper (React) | `spa()` helper, client-only rendering |
| [**wrapped-vanilla**](./wrapped-vanilla/) | SPA wrapper (vanilla JS) | `frontendApp()` helper, `SERVER_DATA` |

## Running an Example

```bash
cd examples/<name>
bun install          # if package.json exists
bun run dev          # or: bun run server.ts
```

## Architecture Spectrum

The examples are ordered from **most server-centric** to **most client-centric**:

1. **stream-vanilla** — Pure streaming HTML, zero client JS
2. **htmx-jsx** — Server-rendered JSX with HTMX for interactivity
3. **social-feed** — Server-rendered pages with client mount scripts
4. **view-morph** — Server + persistent client islands via Hangar
5. **stream-react-tailwind** — Server streaming with client hydration
6. **wrapped-react** / **wrapped-vanilla** — Full SPA with server data injection
