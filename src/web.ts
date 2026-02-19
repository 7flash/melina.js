/**
 * Melina.js — Web Framework Entry Point
 * 
 * This module re-exports everything from the server sub-modules.
 * The actual implementation lives in src/server/.
 * 
 * @module melina/web
 */

console.log('🦊 [Melina] Ready');

// Re-export all server functionality
export {
  // Types
  type Handler,
  type HandlerResponse,
  type ImportConfig,
  type ImportMap,
  type FrontendAppOptions,
  type RenderPageOptions,
  type AppRouterOptions,

  // Import maps
  imports,

  // Build pipeline
  buildScript,
  buildStyle,
  buildAsset,
  buildClientScript,
  asset,
  clearCaches,
  getContentType,

  // HTTP server
  serve,
  findAvailablePort,

  // App router & page rendering
  createAppRouter,
  renderPage,
  frontendApp,
  spa,
  start,
} from "./server";
