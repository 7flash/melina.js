# Melina.js Tasks & Ideas

## 🔴 Priority: Fix
- [x] ~~**Client script build fails with server-only deps**~~ — ✅ DONE. When `page.client.tsx` transitively imports server-only modules (e.g. `sqlite-zod-orm` → `bun:sqlite`), the Bun browser-target build failed. Three layered fixes: (1) `melina-server-stub` plugin stubs server-only packages with Proxy-based exports, (2) `buildClientScript` checks for `null` return from `measure-fn` instead of relying on `try/catch` (measure-fn swallows errors and returns null), (3) `app-router.ts` guards against null/failed builds so pages still render without client interactivity.

## 🟡 Priority: Improve
- [x] ~~**Auto-detect server-only deps**~~ — ✅ DONE. `detectServerOnlyPackages()` scans `node_modules` for packages using `bun:*` imports and auto-stubs them. Also reads `melina.serverOnly` from app's `package.json` for explicit additions. Cached after first call. Falls back to known packages (`sqlite-zod-orm`, `telegram`, etc.) if detection fails.
- [x] ~~**Publish v2.4.0**~~ — ✅ DONE. Published `melina@2.4.0` to npm with: tsconfig fix (rootDir→src, clean dist paths), build error reporting, auto-detect server-only deps. All exports paths updated from `dist/src/` to `dist/`.
- [x] ~~**tsconfig dist overlap**~~ — ✅ DONE. Changed `rootDir` from `./` to `./src`, added `include: ["src/**/*"]` and `exclude: ["dist", "node_modules"]`. Removed stale `dist/src/` directory. Declarations now emit to `dist/client/` and `dist/server/` without nesting collision. All 19 lint warnings resolved.

## 🟢 Priority: Features
- [x] ~~**Build error reporting**~~ — ✅ DONE. After `Bun.build()`, now iterates `result.logs` and surfaces errors/warnings to the console with `[Melina Build Error/Warning]` prefix including file:line:column position. If `result.success === false`, throws with concatenated error messages instead of silently failing.
- [x] ~~**Hot reload client scripts**~~ — ✅ DONE. `hot-reload.ts` watches client script dependency trees using `fs.watch()`. On change, notifies browsers via `/__melina_hmr` SSE endpoint with 150ms debounce. Client-side reconnecting EventSource auto-reloads on `data: reload`. Dep tree walked using `Bun.Transpiler.scanImports()`. Dir watchers are per-directory with dedup. Dev-only, no-op in production.

## 📝 Architecture Notes
- **Package**: `melina` on npm (current published: v2.4.0)
- **Key files**: `src/server/build.ts` (asset pipeline), `src/server/app-router.ts` (routing + script injection)
- **Client build**: `_buildClientScriptImpl` uses Bun's `build()` API with plugins for JSX transform + server stubbing
- **measure-fn integration**: Build uses `createMeasure('build')` — returns `null` on error, does NOT re-throw
- **Linked from**: WARMAPS (`file:../melina.js`), Geeksy (npm registry)
