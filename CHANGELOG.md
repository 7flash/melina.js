# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-10

### Added
- **Social Feed flagship example** — Full app with feed, messenger widget, SSE, XState state management
- **`examples/README.md`** — Index of all examples with architecture spectrum
- **Port fallback on Windows** — `Bun.serve()` now handles `EACCES`, `errno 10013`, and message-based error detection when falling back to the next available port
- **Build deduplication** — Concurrent requests no longer cause deadlocks from parallel `Bun.build()` calls

### Changed
- Examples consolidated from 13 to 9 — removed `app-router`, `blog-app`, `react-ssr`, `client-demo` (functionality covered by remaining examples)
- Replaced `console.log`/`console.error` with `measure()` across all examples
- Updated `README.md`, `CONTRIBUTING.md` to reference current examples

### Fixed
- Unclosed code block in root `README.md` that swallowed two sections
- Syntax error in `wrapped-react/index.ts` (missing `({` in `spa()` call)

## [1.0.0] - 2026-01-31

### Added
- **Hangar Architecture** — Single persistent React root with portal-based rendering
- **High-Fidelity State Persistence** — Islands in layouts survive navigation without state loss
- **View Transitions API** — Native CSS morphing between pages with `view-transition-name`
- **Storage Nodes** — Browser-native state (focus, audio playback, iframes) preserved across navigation
- **`melina:navigation-start` event** — Fired before navigation for View Transition coordination
- **Improved documentation** — Comprehensive developer guide and architecture deep dive

### Changed
- Navigation now uses "Fetch-Before-Transition" orchestration pattern
- Islands are managed by unified IslandManager instead of individual roots
- Props desynchronization is now documented as intentional trade-off

### Fixed
- View Transitions now correctly capture snapshots before DOM changes
- Duplicate `view-transition-name` errors during navigation
- Ghost artifacts ("Black Hole" effect) eliminated
- Unix socket cleanup on server restart

## [0.2.0] - 2026-01-15

### Added
- **Partial Page Swaps** — SPA-like navigation without client-side routing
- **Persistent Islands** — Islands in layout survive navigation
- **`melina:navigated` event** — Fired after navigation completes
- Nested layouts support
- Dynamic route segments (`[slug]`)

### Changed
- Client components now require `island()` wrapper
- Navigation uses `#melina-page-content` container

## [0.1.0] - 2026-01-01

### Added
- Initial release
- File-based routing (Next.js App Router style)
- Islands architecture with selective hydration
- In-memory build system using `Bun.build()`
- Import Maps for browser-native module resolution
- Tailwind CSS v4 integration
- `<Link>` component for navigation
- API routes (`route.ts`)
- CLI commands (`melina init`, `melina start`)
