# Melina.js Tasks & Ideas

## 🔴 Priority: Fix
- [x] ~~**Client script build fails with server-only deps**~~ — ✅ DONE. When `page.client.tsx` transitively imports server-only modules (e.g. `sqlite-zod-orm` → `bun:sqlite`), the Bun browser-target build failed. Three layered fixes: (1) `melina-server-stub` plugin stubs server-only packages with Proxy-based exports, (2) `buildClientScript` checks for `null` return from `measure-fn` instead of relying on `try/catch` (measure-fn swallows errors and returns null), (3) `app-router.ts` guards against null/failed builds so pages still render without client interactivity.

## 🟡 Priority: Improve
- [x] ~~**Auto-detect server-only deps**~~ — ✅ DONE. `detectServerOnlyPackages()` scans `node_modules` for packages using `bun:*` imports and auto-stubs them. Also reads `melina.serverOnly` from app's `package.json` for explicit additions. Cached after first call. Falls back to known packages (`sqlite-zod-orm`, `telegram`, etc.) if detection fails.
- [ ] **Publish v2.4.0** — The server-stub fix and null-guard are only in local source. Need to publish to npm so downstream apps (WARMAPS, Geeksy) can use the registry version instead of `file:` links.
- [x] ~~**tsconfig dist overlap**~~ — ✅ DONE. Changed `rootDir` from `./` to `./src`, added `include: ["src/**/*"]` and `exclude: ["dist", "node_modules"]`. Removed stale `dist/src/` directory. Declarations now emit to `dist/client/` and `dist/server/` without nesting collision. All 19 lint warnings resolved.

## 🟢 Priority: Features
- [x] ~~**Build error reporting**~~ — ✅ DONE. After `Bun.build()`, now iterates `result.logs` and surfaces errors/warnings to the console with `[Melina Build Error/Warning]` prefix including file:line:column position. If `result.success === false`, throws with concatenated error messages instead of silently failing.
- [ ] **Hot reload client scripts** — In dev mode, watch client script dependencies and auto-rebuild + hot-reload when they change.

## 📝 Architecture Notes
- **Package**: `melina` on npm (current published: v2.3.7)
- **Key files**: `src/server/build.ts` (asset pipeline), `src/server/app-router.ts` (routing + script injection)
- **Client build**: `_buildClientScriptImpl` uses Bun's `build()` API with plugins for JSX transform + server stubbing
- **measure-fn integration**: Build uses `createMeasure('build')` — returns `null` on error, does NOT re-throw
- **Linked from**: WARMAPS (`file:../melina.js`), Geeksy (npm registry)
