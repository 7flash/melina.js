/**
 * Server module barrel export.
 * 
 * Re-exports everything from the server sub-modules so that
 * `src/web.ts` remains a thin compatibility shim.
 */

// Types
export type {
    Handler,
    HandlerResponse,
    ImportConfig,
    ImportMap,
    FrontendAppOptions,
    RenderPageOptions,
    AppRouterOptions,
} from "./types";

// Import maps
export { imports } from "./imports";

// Build pipeline
export {
    buildScript,
    buildStyle,
    buildAsset,
    buildClientScript,
    asset,
    clearCaches,
    getContentType,
    builtAssets,
    buildCache,
} from "./build";

// HTTP server
export { serve, findAvailablePort } from "./serve";

// App router & page rendering
export {
    createAppRouter,
    renderPage,
    frontendApp,
    spa,
    start,
} from "./app-router";

// Router (file-based route discovery)
export { discoverRoutes, matchRoute } from "./router";

// SSR
export { renderToString } from "./ssr";
