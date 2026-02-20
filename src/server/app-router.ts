/**
 * App Router — Next.js-style file-based routing
 * 
 * Discovers routes from the app directory, renders pages with SSR,
 * builds client mount scripts, and handles API routes.
 */

import path from "path";
import { existsSync } from "fs";
import { dedent } from "ts-dedent";
import { measure } from 'measure-fn';
import { discoverRoutes, matchRoute } from "./router";
import { createElement } from "../client/render";
import { renderToString } from "./ssr";
import { imports } from "./imports";
import { buildScript, buildStyle, buildAsset, buildClientScript, clientScriptsUsingReact } from "./build";
import { serve } from "./serve";
import type { Handler, FrontendAppOptions, RenderPageOptions, AppRouterOptions } from "./types";

const isDev = process.env.NODE_ENV !== "production";

// ─── SPA / Legacy Frontend ──────────────────────────────────────────────────────

export async function spa(options: FrontendAppOptions): Promise<string> {
    return frontendApp(options);
}

/** @deprecated Use the createAppRouter() pattern instead. */
export async function frontendApp(options: FrontendAppOptions): Promise<string> {
    const {
        entrypoint,
        stylePath,
        title = "Frontend App",
        viewport = "width=device-width, initial-scale=1",
        rebuild = true,
        serverData = {},
        additionalAssets = [],
        meta = [],
        head = '',
        headerScripts = []
    } = options;

    let stylesVirtualPath = '';
    if (stylePath) {
        try {
            stylesVirtualPath = await buildStyle(stylePath);
        } catch (error) {
            console.warn(`Style not found: ${stylePath}`);
        }
    }

    const assetPaths: string[] = [];
    for (const asset of additionalAssets) {
        const file = Bun.file(asset.path);
        const virtualPath = await buildAsset(file);
        if (virtualPath) {
            assetPaths.push(virtualPath);
        }
    }

    const scriptPath = entrypoint.startsWith('/') ? entrypoint : path.join(process.cwd(), entrypoint);

    const subpathImports = ['react-dom/client', 'react/jsx-dev-runtime', 'wouter/use-browser-location'];

    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = (await import(packagePath, { assert: { type: 'json' } })).default;

    const importMaps = `
   <script type="importmap">
    ${JSON.stringify(await imports(subpathImports, packageJson))}
    </script>
  `;

    let scriptVirtualPath = '';
    if (rebuild) {
        scriptVirtualPath = await measure(`Build script: ${scriptPath}`, () => buildScript(scriptPath)) ?? '';
    } else {
        scriptVirtualPath = await measure(`Build script: ${scriptPath}`, () => buildScript(scriptPath)) ?? '';
    }

    if (!scriptVirtualPath) throw `failed to build script`;

    const metaTags = meta.map(m => `<meta name="${m.name}" content="${m.content}">`).join('\n');

    const additionalHead = additionalAssets.map(asset => {
        if (asset.type === 'icon') {
            return `<link rel="icon" type="image/png" href="${assetPaths[0] || ''}">`;
        }
        return '';
    }).join('\n');

    const headerScriptsHtml = headerScripts.map(script =>
        `<script>${script}</script>`
    ).join('\n');

    return dedent`
    <!DOCTYPE html>
    <html>
      <head>
        ${importMaps}
        <meta charset="utf-8">
        <meta name="viewport" content="${viewport}">
        ${metaTags}
        <title>${title}</title>
        ${additionalHead}
        ${headerScriptsHtml}
        ${head}
        ${stylesVirtualPath ? `<link rel="stylesheet" href="${stylesVirtualPath}" >` : ''}
      </head>
      <body>
        <div id="root"></div>
        <script>
          window.SERVER_DATA = ${JSON.stringify(serverData)};
        </script>
        <script src="${scriptVirtualPath}" type="module"></script>
      </body>
    </html>
  `;
}

// ─── Page Renderer ──────────────────────────────────────────────────────────────

/**
 * Render a page component to HTML with SSR.
 * Used by app router to render route components.
 */
export async function renderPage(options: RenderPageOptions): Promise<string> {
    const {
        component: Component,
        clientComponent,
        stylePath,
        title = "Melina App",
        params = {},
        props = {},
        viewport = "width=device-width, initial-scale=1",
        meta = [],
    } = options;

    let stylesVirtualPath = '';
    if (stylePath) {
        try {
            stylesVirtualPath = await buildStyle(stylePath);
        } catch (error) {
            console.warn(`Style not found: ${stylePath}`);
        }
    }

    const subpathImports = ['react-dom/client', 'react/jsx-dev-runtime'];
    let importMaps = '';
    try {
        const packagePath = path.resolve(process.cwd(), 'package.json');
        const packageJson = (await import(packagePath, { assert: { type: 'json' } })).default;
        importMaps = `
      <script type="importmap">
        ${JSON.stringify(await imports(subpathImports, packageJson))}
      </script>
    `;
    } catch (e) {
        console.warn('Could not generate import map:', e);
    }

    let serverHtml = '';
    try {
        serverHtml = renderToString(
            createElement(Component, { ...props, params })
        );
    } catch (error) {
        console.warn('SSR failed, will use client-side rendering only:', error);
    }

    let scriptVirtualPath = '';
    if (clientComponent) {
        try {
            scriptVirtualPath = await buildScript(clientComponent);
        } catch (error) {
            console.warn(`Client component build failed: ${clientComponent}`, error);
        }
    }

    const metaTags = meta.map(m => `<meta name="${m.name}" content="${m.content}">`).join('\n');

    return dedent`
    <!DOCTYPE html>
    <html>
      <head>
        ${importMaps}
        <meta charset="utf-8">
        <meta name="viewport" content="${viewport}">
        ${metaTags}
        <title>${title}</title>
        ${stylesVirtualPath ? `<link rel="stylesheet" href="${stylesVirtualPath}" >` : ''}
      </head>
      <body>
        <div id="root">${serverHtml}</div>
        <script>
          window.__MELINA_DATA__ = ${JSON.stringify({ params, props })};
        </script>
        ${scriptVirtualPath ? `<script src="${scriptVirtualPath}" type="module"></script>` : ''}
      </body>
    </html>
  `;
}

// ─── App Router ─────────────────────────────────────────────────────────────────

/**
 * Create a request handler with file-based routing.
 * Automatically discovers routes from app directory.
 *
 * @example
 * ```ts
 * import { serve, createAppRouter } from 'melina/web';
 * 
 * serve(createAppRouter({
 *   appDir: './app',
 *   globalCss: './app/globals.css',
 * }));
 * ```
 */
export function createAppRouter(options: AppRouterOptions = {}): Handler {
    const {
        appDir = path.join(process.cwd(), 'app'),
        defaultTitle = 'Melina App',
    } = options;

    const routes = discoverRoutes(appDir);
    console.log(`📁 Discovered ${routes.length} routes:`);
    routes.forEach(route => {
        const typeIcon = route.type === 'api' ? '⚡' : '📄';
        const layoutInfo = route.layouts.length > 0 ? ` (${route.layouts.length} layouts)` : '';
        console.log(`   ${typeIcon} ${route.pattern} -> ${path.relative(process.cwd(), route.filePath)}${layoutInfo}`);
    });

    let globalCss = options.globalCss;
    if (!globalCss) {
        const possiblePaths = [
            path.join(appDir, 'globals.css'),
            path.join(appDir, 'global.css'),
            path.join(appDir, 'app.css'),
        ];
        for (const cssPath of possiblePaths) {
            if (existsSync(cssPath)) {
                globalCss = cssPath;
                console.log(`📄 Found global CSS: ${path.relative(process.cwd(), cssPath)}`);
                break;
            }
        }
    }

    return async (req: Request, measure: any) => {
        const url = new URL(req.url);
        const pathname = url.pathname;

        const match = matchRoute(pathname, routes);

        if (!match) {
            return new Response('404 - Not Found', {
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        try {
            // Handle API routes
            if (match.route.type === 'api') {
                const apiModule = await import(match.route.filePath);
                const method = req.method.toUpperCase();
                const handler = apiModule[method] || apiModule.default;

                if (!handler) {
                    return new Response('Method Not Allowed', { status: 405 });
                }

                const response = await handler(req, { params: match.params });
                return response instanceof Response
                    ? response
                    : new Response(JSON.stringify(response), {
                        headers: { 'Content-Type': 'application/json' }
                    });
            }

            // Handle Page routes
            const pageModule = await import(match.route.filePath);
            const PageComponent = pageModule.default || pageModule.Page;

            if (!PageComponent) {
                throw new Error(`No default export found in ${match.route.filePath}`);
            }

            let tree = createElement(PageComponent, { params: match.params });

            for (let i = match.route.layouts.length - 1; i >= 0; i--) {
                const layoutPath = match.route.layouts[i];
                const layoutModule = await import(layoutPath);
                const LayoutComponent = layoutModule.default;

                if (LayoutComponent) {
                    tree = createElement(LayoutComponent, { children: tree });
                }
            }

            const html = renderToString(tree);

            let stylesVirtualPath = '';
            if (globalCss) {
                try {
                    stylesVirtualPath = await buildStyle(globalCss);
                } catch (e) {
                    console.warn('Failed to build global CSS:', e);
                }
            }

            const clientScriptUrls: { url: string; type: 'layout' | 'page' }[] = [];

            for (const layoutPath of match.route.layouts) {
                const layoutClientPath = layoutPath.replace(/\.tsx?$/, '.client.tsx');
                if (existsSync(layoutClientPath)) {
                    const scriptPath = await buildClientScript(layoutClientPath);
                    clientScriptUrls.push({ url: scriptPath, type: 'layout' });
                }
            }

            const pageClientPath = match.route.filePath.replace(/\.tsx?$/, '.client.tsx');
            if (existsSync(pageClientPath)) {
                const scriptPath = await buildClientScript(pageClientPath);
                clientScriptUrls.push({ url: scriptPath, type: 'page' });
            }

            const clientScriptTags: string[] = [];
            if (clientScriptUrls.length > 0) {
                const paramsJson = JSON.stringify(match.params);
                const bootstrapLines = clientScriptUrls.map(({ url, type }) => {
                    return `  import('${url}').then(m => { if (typeof m.default === 'function') { const cleanup = m.default({ params: window.__MELINA_PARAMS__ }); if (typeof cleanup === 'function') { window.__melinaCleanups__ = window.__melinaCleanups__ || []; window.__melinaCleanups__.push({ type: '${type}', cleanup }); } } }).catch(e => console.error('[Melina] Failed to mount ${type} script:', e));`;
                });
                clientScriptTags.push(
                    `<script>window.__MELINA_PARAMS__ = ${paramsJson};</script>`,
                    `<script type="module">\n${bootstrapLines.join('\n')}\n</script>`
                );
            }

            const allClientPaths = [
                ...match.route.layouts.map(l => l.replace(/\.tsx?$/, '.client.tsx')).filter(existsSync),
                ...(existsSync(pageClientPath) ? [pageClientPath] : []),
            ];
            const needsReactImportMap = allClientPaths.some(p => clientScriptsUsingReact.has(p));

            let importMapTag = '';
            if (needsReactImportMap) {
                try {
                    const importMapJson = JSON.stringify(await imports(['react-dom/client', 'react/jsx-dev-runtime']));
                    importMapTag = `<script type="importmap">${importMapJson}</script>`;
                } catch (e) {
                    console.warn('Failed to generate React import maps:', e);
                }
            }

            let fullHtml = `<!DOCTYPE html>${html}`;

            if (stylesVirtualPath) {
                fullHtml = fullHtml.replace('</head>', `<link rel="stylesheet" href="${stylesVirtualPath}"></head>`);
            }

            if (importMapTag) {
                fullHtml = fullHtml.replace('</head>', `${importMapTag}</head>`);
            }

            if (clientScriptTags.length > 0) {
                fullHtml = fullHtml.replace('</body>', `${clientScriptTags.join('\n')}</body>`);
            }

            return new Response(fullHtml, {
                headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': isDev ? 'no-cache' : 'public, max-age=3600',
                },
            });
        } catch (error: any) {
            console.error('Error rendering page:', error);
            const errorMessage = error?.message || String(error);
            const errorStack = error?.stack || 'No stack trace available';
            return new Response(`
        <!DOCTYPE html>
        <html>
          <body>
            <h1>500 - Internal Server Error</h1>
            <pre>${isDev ? errorStack : 'An error occurred'}</pre>
            <p>Error: ${errorMessage}</p>
          </body>
        </html>
      `, {
                status: 500,
                headers: { 'Content-Type': 'text/html' },
            });
        }
    };
}

// ─── Quick Start ────────────────────────────────────────────────────────────────

/**
 * Start a Melina server with file-based routing in one call.
 * Combines createAppRouter() + serve() for convenience.
 *
 * @example
 * ```ts
 * import { start } from 'melina';
 * await start({ appDir: './app', port: 3000 });
 * ```
 */
export async function start(options: AppRouterOptions & { port?: number; unix?: string } = {}) {
    const { port, unix, ...routerOptions } = options;
    const router = createAppRouter(routerOptions);
    return serve(router, { port, unix });
}
