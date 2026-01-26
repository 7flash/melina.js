# Melina.js Architecture

## Current Implementation Status

### ✅ Implemented Features

1. **File-System Router**
   - `page.tsx` → Page components
   - `layout.tsx` → Nested layouts
   - `[param]` → Dynamic segments
   - `route.ts` → API routes

2. **Server Runtime**
   - SSR with `renderToString`
   - Layout wrapping (nested layouts)
   - CSS bundling
   - Import maps for ESM

3. **Client Runtime (Link.tsx)**
   - View Transitions API
   - History API integration
   - Script re-execution
   - Island hydration scanner

4. **API Routes**
   - `GET`, `POST`, etc. handlers
   - JSON response handling
   - Full Node.js capabilities

### 🚧 In Progress

1. **Islands Architecture**
   - `'use client'` directive detection
   - `<div data-melina-island>` marker rendering
   - Client manifest generation

### ❌ Not Yet Implemented

1. **Dual Compilation (Rspack)**
   - Server compilation with module replacement
   - Client compilation for islands
   - Manifest bridge

2. **Server Actions**
   - `'use server'` directive
   - Form interception
   - Mutation + revalidation loop

3. **Middleware**
   - `middleware.ts` support
   - Request/response modification

4. **Image Optimization**
   - Sharp integration
   - `/_melina/image` endpoint

## Architecture Decisions

### State Preservation Trade-off
With HTML-swap navigation, React state resets on navigation. Developers must use:
- **URL State**: `?sidebar=open`
- **External Stores**: localStorage, signals
- **View Transitions**: Browser handles visual persistence

### Why HTML over RSC Wire Protocol
- Simpler architecture
- Standard HTTP caching
- No custom parser needed
- Works with any CDN
