/**
 * melina/client — Public API
 * 
 * This barrel re-exports from separated modules:
 * 
 *   types.ts  — VNode, Props, Child, Component, Fragment, JSX namespace
 *   render.ts — Client-side VDOM renderer with diffing (browser-only)
 *   ssr.ts    — Server-side renderToString (server-only, no DOM)
 * 
 * Server code (src/web.ts) imports { createElement, renderToString } from here.
 * Client code (page.client.tsx) imports { render } from here.
 * 
 * Bun.build tree-shakes unused exports, so client bundles will never include
 * renderToString, and server bundles will never include the DOM reconciler.
 */

// Types + Fragment symbol
export { Fragment } from './types';
export type { VNode, Props, Child, Component, JSX } from './types';

// VNode creation (shared by both client and server)
export { createElement, jsx, jsxs, jsxDEV } from './render';
export { createElement as h } from './render';

// Client-side renderer
export { render, navigate, Link } from './render';
export type { Fiber, LinkProps } from './render';

// Server-side renderer
export { renderToString } from './ssr';

export default {};
