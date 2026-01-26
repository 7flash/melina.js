# Programmatic API Example

This example demonstrates how to use Melina's programmatic API instead of the CLI.

## Features Demonstrated

1. **Starting Melina from a script** - Use `import { start } from 'melina'` instead of `bunx melina start`
2. **Auto-wrapping** - Client components use `'use client'` directive without manual `island()` wrapper
3. **Custom middleware** - Add your own request handling before Melina routes

## Running

```bash
bun install
bun run server.ts
```

Open http://localhost:3000

## Files

- `server.ts` - Programmatic server startup
- `app/page.tsx` - Home page with counter island
- `app/components/Counter.tsx` - Auto-wrapped client component
