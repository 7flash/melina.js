/**
 * JSX Runtime for melina/client
 * 
 * Entry point for Bun/TypeScript's automatic JSX transform.
 * When tsconfig has `"jsx": "react-jsx"` and `"jsxImportSource": "melina/client"`,
 * Bun auto-imports from `melina/client/jsx-runtime`.
 */
export { jsx, jsxs, jsxDEV, createElement } from './render';
export { Fragment } from './types';
export type { JSX } from './types';
