/**
 * JSX Runtime for melina/client
 * 
 * This file is the entry point for Bun/TypeScript's automatic JSX transform.
 * When tsconfig has `"jsx": "react-jsx"` and `"jsxImportSource": "melina/client"`,
 * Bun will auto-import from `melina/client/jsx-runtime`.
 */
export { jsx, jsxs, jsxDEV, Fragment, createElement } from './index';
export type { JSX } from './index';
