import { build as bunBuild, type BuildConfig, type BunFile, plugin } from "bun";
import path from "path";
import { randomUUID } from "crypto";
import { existsSync, readdirSync, readFileSync } from "fs";

import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import fs from 'fs';
import { unlink } from 'fs/promises';

import { measure } from "@ments/utils";
import { dedent } from "ts-dedent";
import { discoverRoutes, matchRoute, type Route, type RouteMatch } from "./router";

// ============================================================================
// MELINA.JS - Server-rendered HTML + Client mount/unmount architecture
// ============================================================================

function resolveFile(basePath: string): string | null {
  if (existsSync(basePath)) return basePath;
  const extensions = ['.tsx', '.jsx', '.ts', '.js'];
  for (const ext of extensions) {
    if (existsSync(basePath + ext)) return basePath + ext;
  }
  return null;
}

console.log('🦊 [Melina] Ready');


type HandlerResponse = Response | AsyncGenerator<string, void, unknown> | string | object;

type Handler = (req: Request, measure: (fn: () => any, name: string, options?: any) => any) => HandlerResponse | Promise<HandlerResponse>;

interface ImportConfig {
  name: string;
  version?: string;
  deps?: string[];
  external?: boolean | string[];
  markAllExternal?: boolean;
  baseName?: string;
  subpath?: string;
}

type ImportMap = { imports: Record<string, string> };

// Generate unique request ID (still used for top-level context)
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * Import a module for SSR.
 * Simply imports the module - no transformation needed anymore.
 */
async function importSSR(filePath: string) {
  // Add timestamp query to bypass ESM cache in dev
  const timestamp = isDev ? `?t=${Date.now()}` : '';
  return import(`${filePath}${timestamp}`);
}

// Global cleanup function for unix socket
let cleanupUnixSocket: (() => Promise<void>) | null = null;

export async function imports(
  subpaths: string[] = [],
  pkgJson: any = null,
  lockFile: any = null,
): Promise<ImportMap> {
  let packageJson: any = pkgJson;
  if (!packageJson) {
    try {
      const packagePath = path.resolve(process.cwd(), 'package.json');
      console.log('packagePath', packagePath);
      packageJson = (await import(packagePath, { assert: { type: 'json' } })).default;
    } catch (e) {
      console.error("Failed to load package.json:", e);
      return { imports: {} };
    }
  }

  let bunLock: any = lockFile;
  if (!bunLock) {
    try {
      bunLock = (await import(path.resolve(process.cwd(), 'bun.lock'), { assert: { type: 'json' } })).default;
    } catch (e) {
      console.warn("No bun.lock file found, proceeding without it.");
    }
  }

  const importMap: ImportMap = { imports: {} };
  const versionMap: Record<string, string> = {};
  const dependencies = {
    ...(packageJson.dependencies || {}),
  };

  const getCleanVersion = (version: string): string => version.replace(/^[~^]/, '');

  const imports: Record<string, ImportConfig> = {};

  // Process top-level dependencies
  Object.entries(dependencies).forEach(([name, versionSpec]) => {
    if (typeof versionSpec !== 'string') return;

    // Skip local file dependencies - they can't be resolved by esm.sh
    if (versionSpec.startsWith('file:') || versionSpec.startsWith('link:')) {
      return;
    }

    const cleanVersion = getCleanVersion(versionSpec);
    let peerDeps: string[] = [];

    if (bunLock && bunLock.packages && bunLock.packages[name]) {
      const lockEntry = bunLock.packages[name];
      const metadata = lockEntry[2];

      if (metadata && metadata.peerDependencies) {
        Object.keys(metadata.peerDependencies).forEach(peerName => {
          if (!(metadata.peerDependenciesMeta?.[peerName]?.optional)) {
            if (dependencies[peerName]) {
              peerDeps.push(peerName);
            }
          }
        });
      }
    }

    const nameWithSuffix = `${name}`;
    imports[nameWithSuffix] = {
      name,
      version: cleanVersion,
      ...(peerDeps.length > 0 ? { deps: peerDeps } : {}),
    };
  });

  subpaths.forEach(subpath => {
    const [baseName, ...subpathParts] = subpath.split('/'); // e.g., 'react-dom' and ['client']
    const versionSpec = dependencies[baseName];
    if (!versionSpec) {
      console.warn(`No version found for base package "${baseName}" of subpath "${subpath}". Skipping.`);
      return;
    }

    const cleanVersion = getCleanVersion(versionSpec);
    let peerDeps: string[] = [];

    if (bunLock && bunLock.packages && bunLock.packages[baseName]) {
      const lockEntry = bunLock.packages[baseName];
      const metadata = lockEntry[2];

      if (metadata && metadata.peerDependencies) {
        Object.keys(metadata.peerDependencies).forEach(peerName => {
          if (!(metadata.peerDependenciesMeta?.[peerName]?.optional)) {
            if (dependencies[peerName]) {
              peerDeps.push(peerName);
            }
          }
        });
      }
    }

    imports[subpath] = {
      name: subpath,
      version: cleanVersion,
      ...(peerDeps.length > 0 ? { deps: peerDeps } : {}),
      baseName,
      subpath: subpathParts.join('/'),
    };
  });

  await measure(async (measure) => {
    // First pass: Collect all versions specified for base packages
    Object.entries(imports).forEach(([_, imp]) => {
      const baseName = imp.baseName || (imp.name.startsWith("@") ? imp.name.split("/").slice(0, 2).join("/") : imp.name.split("/")[0]);
      if (!versionMap[baseName] || imp.version) {
        versionMap[baseName] = imp.version ?? "latest";
      }
    });

    // Second pass: Build the import map URLs
    Object.entries(imports).forEach(([key, imp]) => {
      let url: string;
      const baseName = imp.baseName || (imp.name.startsWith("@") ? imp.name.split("/").slice(0, 2).join("/") : imp.name.split("/")[0]);
      const version = versionMap[baseName] || 'latest';

      const useStarPrefix = imp.markAllExternal === true;
      const starPrefix = useStarPrefix ? '*' : '';

      if (imp.subpath) {
        // For subpaths, construct URL as baseName@version/subpath
        url = `https://esm.sh/${starPrefix}${baseName}@${version}/${imp.subpath}`;
      } else {
        // For top-level packages
        url = `https://esm.sh/${starPrefix}${imp.name}@${version}`;
      }

      let queryParts: string[] = [];

      if (imp.external && !useStarPrefix) {
        let externals: string[] = [];
        if (Array.isArray(imp.external)) {
          externals = imp.external;
        } else if (imp.external === true) {
          externals = Object.keys(imports)
            .filter(otherKey => otherKey !== key)
            .map(otherKey => imports[otherKey].name.split('/')[0])
            .filter((value, index, self) => self.indexOf(value) === index);
        }
        if (externals.length > 0) {
          queryParts.push(`external=${externals.join(',')}`);
        }
      }

      if (imp.deps?.length) {
        const depsList = imp.deps
          .map((depName) => {
            const depBaseName = depName.startsWith("@") ? depName.split("/").slice(0, 2).join("/") : depName.split("/")[0];
            const depVersion = versionMap[depBaseName] || 'latest';
            return `${depName}@${depVersion}`;
          })
          .join(",");
        queryParts.push(`deps=${depsList}`);
      }

      if (isDev) queryParts.push("dev");

      const query = queryParts.length ? `?${queryParts.join('&')}` : '';

      measure(
        () => {
          importMap.imports[key] = url + query;
          if (!key.endsWith('/')) {
            let subQuery = query ? query.replace(/^\?/, '&') : '';
            importMap.imports[key + '/'] = url + subQuery + '/';
          }
        },
        `Import for ${key} is ${url + query}`,
        { level: 1 }
      );
    });
  }, "Generate Import Map");

  return importMap;
}

const buildCache: Record<string, { outputPath: string; content: ArrayBuffer }> = {};
const builtAssets: Record<string, { content: ArrayBuffer; contentType: string }> = {};

// Cached runtime bundle path
let cachedRuntimePath: string | null = null;

// In-flight build deduplication — prevents concurrent Bun.build() calls
// from exhausting resources and deadlocking the server
let runtimeBuildInFlight: Promise<string> | null = null;
const clientBuildInFlight: Map<string, Promise<string>> = new Map();

/**
 * Build the Melina client runtime from TypeScript source
 * This bundles src/runtime.ts and serves it from memory
 * 
 * The runtime handles:
 * - Page mount/unmount lifecycle
 * - Client-side navigation with View Transitions
 * - Link interception
 */
async function buildRuntime(): Promise<string> {
  // Return cached path if available
  if (cachedRuntimePath && !isDev) {
    return cachedRuntimePath;
  }

  // If a build is already in flight, return the same promise
  if (runtimeBuildInFlight) {
    return runtimeBuildInFlight;
  }

  runtimeBuildInFlight = _buildRuntimeImpl();
  try {
    return await runtimeBuildInFlight;
  } finally {
    runtimeBuildInFlight = null;
  }
}

async function _buildRuntimeImpl(): Promise<string> {

  const runtimePath = path.resolve(__dirname, './runtime.ts');

  if (!existsSync(runtimePath)) {
    throw new Error(`Melina runtime not found at: ${runtimePath}`);
  }

  const buildConfig: BuildConfig = {
    entrypoints: [runtimePath],
    outdir: undefined,
    minify: !isDev,
    target: "browser",
    sourcemap: isDev ? "linked" : "none",
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
    },
    naming: {
      entry: "melina-runtime-[hash].[ext]",
      chunk: "[name]-[hash].[ext]",
      asset: "[name]-[hash].[ext]",
    },
  };

  const result = await bunBuild(buildConfig);

  const mainOutput = result.outputs.find(o => o.kind === 'entry-point');
  if (!mainOutput) {
    throw new Error('Failed to build Melina runtime');
  }

  for (const output of result.outputs) {
    const content = await output.arrayBuffer();
    const outputPath = `/${path.basename(output.path)}`;
    const contentType = output.type || getContentType(path.extname(output.path));
    builtAssets[outputPath] = { content, contentType };
  }

  cachedRuntimePath = `/${path.basename(mainOutput.path)}`;
  console.log(`🦊 [Melina] Runtime bundled: ${cachedRuntimePath}`);

  return cachedRuntimePath;
}

// Cache for built client scripts
const clientScriptCache: Record<string, string> = {};

/**
 * Build a page's client.tsx file
 * Uses JSX-DOM runtime so JSX creates real DOM elements
 */
async function buildClientScript(clientPath: string): Promise<string> {
  if (!isDev && clientScriptCache[clientPath]) {
    return clientScriptCache[clientPath];
  }

  // If a build for this path is already in flight, return the same promise
  const inflight = clientBuildInFlight.get(clientPath);
  if (inflight) {
    return inflight;
  }

  const buildPromise = _buildClientScriptImpl(clientPath);
  clientBuildInFlight.set(clientPath, buildPromise);
  try {
    return await buildPromise;
  } finally {
    clientBuildInFlight.delete(clientPath);
  }
}

async function _buildClientScriptImpl(clientPath: string): Promise<string> {

  const jsxDomPath = path.resolve(__dirname, './jsx-dom.ts');

  const buildConfig: BuildConfig = {
    entrypoints: [clientPath],
    outdir: undefined,
    minify: !isDev,
    target: "browser",
    sourcemap: isDev ? "linked" : "none",
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
    },
    naming: {
      entry: "[name]-[hash].[ext]",
      chunk: "[name]-[hash].[ext]",
      asset: "[name]-[hash].[ext]",
    },
    plugins: [{
      name: 'melina-jsx-dom',
      setup(build: any) {
        // Redirect JSX runtime imports to our jsx-dom runtime
        build.onResolve({ filter: /^react\/jsx-runtime$|^react\/jsx-dev-runtime$|^react$/ }, () => {
          return { path: jsxDomPath };
        });
      }
    }],
  };

  const result = await bunBuild(buildConfig);

  const mainOutput = result.outputs.find(o => o.kind === 'entry-point');
  if (!mainOutput) {
    throw new Error(`Failed to build client script: ${clientPath}`);
  }

  for (const output of result.outputs) {
    const content = await output.arrayBuffer();
    const outputPath = `/${path.basename(output.path)}`;
    const contentType = output.type || getContentType(path.extname(output.path));
    builtAssets[outputPath] = { content, contentType };
  }

  const outputPath = `/${path.basename(mainOutput.path)}`;
  clientScriptCache[clientPath] = outputPath;
  console.log(`📦 [Melina] Client script built: ${path.basename(clientPath)} -> ${outputPath}`);

  return outputPath;
}

/**
 * ## getContentType
 * Returns the appropriate MIME type for a given file extension.
 * This has been expanded to include common font types and other static assets.
 */
function getContentType(ext: string): string {
  switch (ext.toLowerCase()) {
    // Images
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';

    // Fonts
    case '.ttf':
      return 'font/ttf';
    case '.otf':
      return 'font/otf';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.eot':
      return 'application/vnd.ms-fontobject';

    // Styles & Scripts
    case '.css':
      return 'text/css';
    case '.js':
      return 'text/javascript';

    // Data & Documents
    case '.json':
      return 'application/json';
    case '.pdf':
      return 'application/pdf';

    // Audio/Video
    case '.mp3':
      return 'audio/mpeg';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';

    // Default catch-all
    default:
      return 'application/octet-stream';
  }
}

/**
 * Build JavaScript/TypeScript files using Bun's bundler
 * @param filePath Path to the script file
 * @returns URL path to the built asset
 */
export async function buildScript(filePath: string, allExternal = false): Promise<string> {
  if (!filePath) {
    throw new Error('File path is required');
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Script not found: ${filePath}`);
  }

  // Return cached result in production if available
  if (!isDev && buildCache[filePath]) {
    return buildCache[filePath].outputPath;
  }

  let packageJson: any;
  try {
    packageJson = (await import(path.resolve(process.cwd(), 'package.json'), { assert: { type: 'json' } })).default;
  } catch (e) {
    throw new Error("package.json not found");
  }

  const dependencies = { ...(packageJson.dependencies || {}) };
  // Exclude melina from externals - bundle it inline for React-free client
  let external = Object.keys(dependencies).filter(dep => !dep.startsWith('melina'));
  if (allExternal) external = ["*"];

  const buildConfig: BuildConfig = {
    entrypoints: [absolutePath],
    outdir: undefined, // Build to memory
    minify: !isDev,
    target: "browser",
    sourcemap: isDev ? "linked" : "none",
    external,
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
    },
    naming: {
      entry: "[name]-[hash].[ext]",
      chunk: "[name]-[hash].[ext]",
      asset: "[name]-[hash].[ext]",
    },
  };

  let result;
  try {
    result = await bunBuild(buildConfig);
  } catch (error) {
    // Fallback to Bun.$`bun build` for better error output
    console.error(`bunBuild failed, trying fallback: ${error}`);
    try {
      await Bun.$`bun build ${absolutePath} --external ${external.join(',')} --outdir /tmp --target browser --sourcemap=${isDev ? "linked" : "none"}`;
    } catch (fallbackError) {
      throw new Error(`Build failed for ${filePath}: ${fallbackError}`);
    }
    throw new Error(`Build failed for ${filePath}: ${error}`);
  }

  const mainOutput = result.outputs.find(o => o.kind === 'entry-point');
  if (!mainOutput) {
    throw new Error(`No entry-point output found for ${filePath}`);
  }

  // Process all build outputs (e.g., JS file and its sourcemap)
  for (const output of result.outputs) {
    const content = await output.arrayBuffer();
    const outputPath = `/${path.basename(output.path)}`;
    const contentType = output.type || getContentType(path.extname(output.path));
    builtAssets[outputPath] = { content, contentType };
  }

  const outputPath = `/${path.basename(mainOutput.path)}`;
  buildCache[filePath] = { outputPath, content: await mainOutput.arrayBuffer() };

  return outputPath;
}

/**
 * Build CSS files with PostCSS processing
 * @param filePath Path to the CSS file
 * @returns URL path to the built asset
 */
export async function buildStyle(filePath: string): Promise<string> {
  if (!filePath) {
    throw new Error('File path is required');
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Style not found: ${filePath}`);
  }

  // Return cached result in production if available
  if (!isDev && buildCache[filePath]) {
    return buildCache[filePath].outputPath;
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const baseName = path.basename(absolutePath, ext);

  const cssContent = await Bun.file(absolutePath).text();
  const result = await postcss([autoprefixer, tailwind]).process(cssContent, {
    from: absolutePath,
    to: 'style.css', // Dummy 'to' path for source map generation
    map: isDev ? { inline: false } : false,
  });

  if (!result.css) {
    throw new Error(`PostCSS processing returned empty CSS for ${absolutePath}`);
  }

  let finalCss = result.css;
  const hash = new Bun.CryptoHasher("sha256").update(finalCss).digest('hex').slice(0, 8);
  const outputPath = `/${baseName}-${hash}.css`;
  const contentType = 'text/css';

  // Handle and serve source map in development
  if (isDev && result.map) {
    const sourceMapPath = `${outputPath}.map`;
    const sourceMapContent = result.map.toString();
    builtAssets[sourceMapPath] = { content: new TextEncoder().encode(sourceMapContent), contentType: 'application/json' };
    finalCss += `\n/*# sourceMappingURL=${path.basename(sourceMapPath)} */`;
  }

  const content = new TextEncoder().encode(finalCss);
  buildCache[filePath] = { outputPath, content };
  builtAssets[outputPath] = { content, contentType };
  return outputPath;
}

/**
 * Build static assets (images, fonts, etc.) from BunFile
 * @param file BunFile object
 * @returns URL path to the built asset
 */
export async function buildAsset(file?: BunFile): Promise<string> {
  if (!file) {
    return '';
  }

  // Get the file path from the BunFile object
  const filePath = file.name || '';
  if (!filePath) {
    throw new Error('BunFile object must have a name property');
  }

  // Check if file exists by trying to get its size
  const fileExists = await file.exists();
  if (!fileExists) {
    throw new Error(`Asset not found: ${filePath}`);
  }

  // Return cached result in production if available
  if (!isDev && buildCache[filePath]) {
    return buildCache[filePath].outputPath;
  }

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);

  const content = await file.arrayBuffer();
  const hash = new Bun.CryptoHasher("sha256").update(new Uint8Array(content)).digest('hex').slice(0, 8);
  const outputPath = `/${baseName}-${hash}${ext}`;
  const contentType = getContentType(ext);

  buildCache[filePath] = { outputPath, content };
  builtAssets[outputPath] = { content, contentType };
  return outputPath;
}

// Legacy function for backwards compatibility
export async function asset(fileOrPath: BunFile | string): Promise<string> {
  console.warn('asset() is deprecated. Use buildScript(), buildStyle(), or buildAsset() instead.');

  if (typeof fileOrPath === 'string') {
    const ext = path.extname(fileOrPath).toLowerCase();
    if (ext === '.css') {
      return buildStyle(fileOrPath);
    } else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
      return buildScript(fileOrPath);
    } else {
      // For other files, create a BunFile and use buildAsset
      const file = Bun.file(fileOrPath);
      return buildAsset(file);
    }
  } else {
    // It's a BunFile
    return buildAsset(fileOrPath);
  }
}

/**
 * Automatically determines port or unix socket from BUN_PORT env var or CLI arg
 * Handles cleanup and graceful shutdown automatically
 */
export async function serve(handler: Handler, options?: { port?: number; unix?: string }) {
  const isDev = process.env.NODE_ENV !== "production";

  // Automatic detection logic - users don't need to do this anymore
  let port: number | undefined;
  let unix: string | undefined;

  if (options?.port !== undefined) {
    port = options.port;
  } else if (options?.unix !== undefined) {
    unix = options.unix;
  } else {
    // Auto-detect from BUN_PORT env var OR CLI argument
    const bunPort = process.env.BUN_PORT;
    const cliArg = process.argv[2];

    if (bunPort) {
      const parsedPort = parseInt(bunPort, 10);
      if (!isNaN(parsedPort)) {
        port = parsedPort;
      } else {
        unix = bunPort;
      }
    } else if (cliArg) {
      const parsedPort = parseInt(cliArg, 10);
      if (!isNaN(parsedPort)) {
        port = parsedPort;
      } else {
        unix = cliArg;
      }
    }
  }

  // Default to unix socket if neither specified
  if (!port && !unix) {
    unix = '/tmp/trader.sock';
  }

  if (port !== undefined && unix) {
    throw new Error("Cannot specify both port and unix socket");
  }

  // Handle unix socket cleanup BEFORE starting server
  if (unix) {
    if (!unix.startsWith('\0')) {
      await unlink(unix).catch(() => { });
    }
    // Store cleanup function for shutdown
    cleanupUnixSocket = async () => {
      if (unix && !unix.startsWith('\0')) {
        await unlink(unix).catch(() => { });
      }
    };
  }

  const args = {
    idleTimeout: 0,
    development: isDev,
    async fetch(req) {
      let requestId = req.headers.get("X-Request-ID");
      if (!requestId) {
        requestId = generateRequestId();
        req.headers.set("X-Request-ID", requestId);
      }

      return await measure(
        async (measure) => {
          const url = new URL(req.url);
          const pathname = url.pathname;

          // Check for built assets in memory first
          if (builtAssets[pathname]) {
            const { content, contentType } = builtAssets[pathname];
            return new Response(content, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": isDev ? "no-cache" : "public, max-age=31536000, immutable",
              },
            });
          }

          // Handle request with user handler
          const response = await handler(req, measure);

          if (typeof response === 'object' && response != null && response[Symbol.asyncIterator]) {
            const stream = new ReadableStream({
              async start(controller) {
                try {
                  for await (const chunk of response as AsyncGenerator<string>) {
                    controller.enqueue(new TextEncoder().encode(chunk));
                  }
                } catch (error) {
                  console.error('Stream error:', error);
                } finally {
                  controller.close();
                }
              },
            });
            return new Response(stream, {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "X-Request-ID": requestId
              },
            });
          }

          if (response instanceof Response) {
            // Create a new headers object to ensure we can modify it
            const headers = new Headers(response.headers);
            headers.set("X-Request-ID", requestId);

            // Clone the response with the updated headers
            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: headers
            });
          }

          if (typeof response === 'string') {
            return new Response(response, {
              headers: { "Content-Type": "text/html; charset=utf-8", "X-Request-ID": requestId },
            });
          }

          return new Response(JSON.stringify(response), {
            headers: { "Content-Type": "application/json" },
          });
        },
        `${req.method} ${req.url}`,
        { requestId, idChain: [requestId] }
      );
    },
    error(error: Error) {
      console.error("[Server Error]", error);
      const errorDetails = error.message;
      const stackTrace = error.stack ?? 'No stack trace available';
      const detailedLogs = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);

      const body = isDev
        ? `<!DOCTYPE html>
            <html>
              <head>
                <title>Server Error</title>
                <style>
                  body { font-family: monospace; padding: 20px; background: #fff1f1; color: #333; }
                  pre { background: #fdfdfd; padding: 15px; border-radius: 4px; border: 1px solid #ddd; overflow-x: auto; }
                  h1 { color: #d92626; }
                </style>
              </head>
              <body>
                <h1>Server Error</h1>
                <h3>Error:</h3>
                <pre>${errorDetails}</pre>
                <h3>Stack Trace:</h3>
                <pre>${stackTrace}</pre>
                <h3>Full Error Object:</h3>
                <pre>${detailedLogs}</pre>
              </body>
            </html>`
        : "Internal Server Error";

      return new Response(body, {
        status: 500,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-store"
        },
      });
    },
  };

  if (unix) {
    args.unix = unix;
  } else {
    args.port = port;
  }

  let server;
  try {
    server = Bun.serve(args);
  } catch (err: any) {
    const isPortUnavailable = !unix && (
      err.code === 'EADDRINUSE' ||
      err.code === 'EACCES' ||
      err.errno === 10013 ||
      err.message?.includes('EADDRINUSE') ||
      err.message?.includes('EACCES') ||
      err.message?.includes('Address already in use') ||
      err.message?.includes('Failed to listen')
    );
    if (isPortUnavailable) {
      const requestedPort = (args as any).port || 3000;
      const newPort = findAvailablePort(requestedPort + 1);
      console.warn(`⚠️  Port ${requestedPort} unavailable, using port ${newPort} instead`);
      (args as any).port = newPort;
      server = Bun.serve(args);
    } else {
      throw err;
    }
  }

  // AUTOMATIC STARTUP LOG
  if (unix) {
    console.log(`🦊 Melina server running on unix socket ${unix}`);
  } else {
    console.log(`🦊 Melina server running at http://localhost:${server.port}`);
  }

  // AUTOMATIC SHUTDOWN HANDLING
  const shutdown = async (signal: string) => {
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    if (cleanupUnixSocket) {
      await cleanupUnixSocket();
    }
    server.stop?.();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown('SIGINT'));
  process.on("SIGTERM", () => shutdown('SIGTERM'));

  return server;
}

export function findAvailablePort(startPort: number = 3001): number {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      // Use Bun.serve to test — this is what we actually use, so it's the right probe.
      // Bun.listen uses raw TCP which triggers EACCES on many Windows ports.
      const testServer = Bun.serve({
        port,
        fetch() { return new Response(''); },
      });
      testServer.stop(true);
      return port;
    } catch (e: any) {
      if (
        e.code !== 'EADDRINUSE' &&
        e.code !== 'EACCES' &&
        e.errno !== 10013 &&
        !e.message?.includes('EADDRINUSE') &&
        !e.message?.includes('EACCES') &&
        !e.message?.includes('Failed to listen') &&
        !e.message?.includes('Address already in use')
      ) {
        throw e;
      }
      // Port not available, try next
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + 99}`);
}

// Clear caches for testing
export function clearCaches() {
  Object.keys(buildCache).forEach(key => delete buildCache[key]);
  Object.keys(builtAssets).forEach(key => delete builtAssets[key]);
}

interface FrontendAppOptions {
  entrypoint: string;
  stylePath?: string;
  title?: string;
  viewport?: string;
  rebuild?: boolean;
  serverData?: any;
  additionalAssets?: Array<{ path: string; type: string }>;
  meta?: Array<{ name: string; content: string }>;
  head?: string;
  headerScripts?: string[];
}

export async function spa(options: FrontendAppOptions): Promise<string> {
  return frontendApp(options);
}

// @deprecated
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


  // Build CSS
  let stylesVirtualPath = '';
  if (stylePath) {
    try {
      stylesVirtualPath = await buildStyle(stylePath);
    } catch (error) {
      console.warn(`Style not found: ${stylePath}`);
    }
  }

  // Build additional assets
  const assetPaths: string[] = [];
  for (const asset of additionalAssets) {
    const file = Bun.file(asset.path);
    const virtualPath = await buildAsset(file);
    if (virtualPath) {
      assetPaths.push(virtualPath);
    }
  }

  // Build React script
  const scriptPath = entrypoint.startsWith('/') ? entrypoint : path.join(process.cwd(), entrypoint);

  const subpathImports = ['react-dom/client', 'react/jsx-dev-runtime', 'wouter/use-browser-location'];

  const packagePath = path.resolve(process.cwd(), 'package.json');
  const packageJson = (await import(packagePath, { assert: { type: 'json' } })).default;

  const importMaps = `
   <script type="importmap">
    ${JSON.stringify(await imports(subpathImports, packageJson))}
    </script>
  `;

  // Handle different build modes
  let scriptVirtualPath = '';
  if (rebuild) {
    scriptVirtualPath = await measure(() => buildScript(scriptPath), `build script from ${scriptPath}`);
  } else {
    scriptVirtualPath = await measure(() => buildScript(scriptPath), `build script from ${scriptPath}`);
  }

  if (!scriptVirtualPath) throw `failed to build script`;

  // Generate meta tags
  const metaTags = meta.map(m => `<meta name="${m.name}" content="${m.content}">`).join('\n');

  // Generate additional head content
  const additionalHead = additionalAssets.map(asset => {
    if (asset.type === 'icon') {
      return `<link rel="icon" type="image/png" href="${assetPaths[0] || ''}">`;
    }
    return '';
  }).join('\n');

  // Generate header scripts
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

// ============================================================================
// App Router - Next.js-style file-based routing
// ============================================================================

interface RenderPageOptions {
  /** The page component to render (server-side) */
  component: any;
  /** Path to client-side component for hydration */
  clientComponent?: string;
  /** Path to CSS file */
  stylePath?: string;
  /** Page title */
  title?: string;
  /** Route parameters from URL */
  params?: Record<string, any>;
  /** Additional props to pass to component */
  props?: Record<string, any>;
  /** Viewport meta tag */
  viewport?: string;
  /** Additional meta tags */
  meta?: Array<{ name: string; content: string }>;
}

/**
 * Render a page component to HTML with SSR
 * Used by app router to render route components
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

  // Build CSS if provided
  let stylesVirtualPath = '';
  if (stylePath) {
    try {
      stylesVirtualPath = await buildStyle(stylePath);
    } catch (error) {
      console.warn(`Style not found: ${stylePath}`);
    }
  }

  // Generate import map for React and dependencies
  const subpathImports = ['react-dom/client', 'react/jsx-dev-runtime'];
  let importMaps = '';
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = (await import(packagePath, { assert: { type: 'json' } })).default;
    importMaps = `
      \u003cscript type="importmap"\u003e
        ${JSON.stringify(await imports(subpathImports, packageJson))}
      \u003c/script\u003e
    `;
  } catch (e) {
    console.warn('Could not generate import map:', e);
  }

  //Server-side render the component
  let serverHtml = '';
  try {
    // Import React for SSR
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    serverHtml = ReactDOMServer.renderToString(
      React.createElement(Component, { ...props, params })
    );
  } catch (error) {
    console.warn('SSR failed, will use client-side rendering only:', error);
  }

  // Build client component if provided
  let scriptVirtualPath = '';
  if (clientComponent) {
    try {
      scriptVirtualPath = await buildScript(clientComponent);
    } catch (error) {
      console.warn(`Client component build failed: ${clientComponent}`, error);
    }
  }

  // Generate meta tags
  const metaTags = meta.map(m => `<meta name="${m.name}" content="${m.content}">`).join('\n');

  return dedent`
    \u003c!DOCTYPE html\u003e
    \u003chtml\u003e
      \u003chead\u003e
        ${importMaps}
        \u003cmeta charset="utf-8"\u003e
        \u003cmeta name="viewport" content="${viewport}"\u003e
        ${metaTags}
        \u003ctitle\u003e${title}\u003c/title\u003e
        ${stylesVirtualPath ? `\u003clink rel="stylesheet" href="${stylesVirtualPath}" \u003e` : ''}
      \u003c/head\u003e
      \u003cbody\u003e
        \u003cdiv id="root"\u003e${serverHtml}\u003c/div\u003e
        \u003cscript\u003e
          window.__MELINA_DATA__ = ${JSON.stringify({ params, props })};
        \u003c/script\u003e
        ${scriptVirtualPath ? `\u003cscript src="${scriptVirtualPath}" type="module"\u003e\u003c/script\u003e` : ''}
      \u003c/body\u003e
    \u003c/html\u003e
  `;
}

interface AppRouterOptions {
  /** Path to app directory (default: ./app) */
  appDir?: string;
  /** Default title for pages */
  defaultTitle?: string;
  /** Path to global CSS file */
  globalCss?: string;
}

/**
 * Create a request handler with file-based routing
 * Automatically discovers routes from app directory
 * 
 * @example
 * ```ts
 * import { serve, createAppRouter } from 'melinajs/web';
 * 
 * serve(createAppRouter({
 *   appDir: './app',
 *   globalCss: './app/globals.css',
 * }));
 * ```
 */
export function createAppRouter(options: AppRouterOptions = {}): Handler {
  let {
    appDir = path.join(process.cwd(), 'app'),
    defaultTitle = 'Melina App',
  } = options;

  // Ensure appDir is absolute for dynamic imports to work
  if (!path.isAbsolute(appDir)) {
    appDir = path.resolve(process.cwd(), appDir);
  }

  // Discover routes at startup
  const routes = discoverRoutes(appDir);
  console.log(`📁 Discovered ${routes.length} routes:`);
  routes.forEach(route => {
    const typeIcon = route.type === 'api' ? '⚡' : '📄';
    const layoutInfo = route.layouts.length > 0 ? ` (${route.layouts.length} layouts)` : '';
    console.log(`   ${typeIcon} ${route.pattern} -> ${path.relative(process.cwd(), route.filePath)}${layoutInfo}`);
  });

  // Look for global CSS file
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

    // Match route
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
      const pageModule = await importSSR(match.route.filePath);
      const PageComponent = pageModule.default || pageModule.Page;

      if (!PageComponent) {
        throw new Error(`No default export found in ${match.route.filePath}`);
      }

      // Use React for SSR
      const React = await import('react');
      const ReactDOMServer = await import('react-dom/server');

      // Build the component tree with nested layouts
      let tree: any = React.createElement(PageComponent, { params: match.params });

      // Wrap with layouts (innermost to outermost)
      for (let i = match.route.layouts.length - 1; i >= 0; i--) {
        const layoutPath = match.route.layouts[i];
        const layoutModule = await importSSR(layoutPath);
        const LayoutComponent = layoutModule.default;

        if (LayoutComponent) {
          tree = React.createElement(LayoutComponent, null, tree);
        }
      }

      // Render to HTML
      const html = ReactDOMServer.renderToString(tree);

      // Build CSS
      let stylesVirtualPath = '';
      if (globalCss) {
        try {
          stylesVirtualPath = await buildStyle(globalCss);
        } catch (e) {
          console.warn('Failed to build global CSS:', e);
        }
      }

      // Build page's client.tsx if it exists
      // Look for: page.client.tsx alongside page.tsx
      const pageDir = path.dirname(match.route.filePath);
      const clientCandidates = [
        path.join(pageDir, 'page.client.tsx'),
        path.join(pageDir, 'page.client.ts'),
        path.join(pageDir, 'client.tsx'),
        path.join(pageDir, 'client.ts'),
      ];

      let clientBundlePath = '';
      for (const candidate of clientCandidates) {
        if (existsSync(candidate)) {
          try {
            clientBundlePath = await buildClientScript(candidate);
          } catch (e) {
            console.warn(`Failed to build client script ${candidate}:`, e);
          }
          break;
        }
      }

      // Build layout.client.tsx if it exists (persists across navigations)
      // Check each layout directory for a layout.client.tsx
      const layoutClientPaths: string[] = [];
      for (const layoutPath of match.route.layouts) {
        const layoutDir = path.dirname(layoutPath);
        const layoutClientCandidates = [
          path.join(layoutDir, 'layout.client.tsx'),
          path.join(layoutDir, 'layout.client.ts'),
        ];
        for (const candidate of layoutClientCandidates) {
          if (existsSync(candidate)) {
            try {
              const bundlePath = await buildClientScript(candidate);
              layoutClientPaths.push(bundlePath);
            } catch (e) {
              console.warn(`Failed to build layout client script ${candidate}:`, e);
            }
            break;
          }
        }
      }

      // Build the runtime (always included for navigation)
      const runtimePath = await buildRuntime();

      // Page meta for the runtime
      const pageMeta: any = {};
      if (clientBundlePath) {
        pageMeta.client = clientBundlePath;
      }
      if (layoutClientPaths.length > 0) {
        pageMeta.layoutClients = layoutClientPaths;
      }

      let fullHtml = `<!DOCTYPE html>${html}`;

      // Inject CSS into <head> to prevent FOUC
      if (stylesVirtualPath) {
        fullHtml = fullHtml.replace('</head>', `<link rel="stylesheet" href="${stylesVirtualPath}"></head>`);
      }

      // Inject scripts before </body>
      const scripts = `
        <script id="__MELINA_META__" type="application/json">${JSON.stringify(pageMeta)}</script>
        <script src="${runtimePath}" type="module"></script>
      `;

      fullHtml = fullHtml.replace('</body>', `${scripts}</body>`);

      return new Response(fullHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': isDev ? 'no-cache' : 'public, max-age=3600',
        },
      });
    } catch (error: any) {
      console.error('Error rendering page:', error);
      return new Response(`
        <!DOCTYPE html>
        <html>
          <body>
            <h1>500 - Internal Server Error</h1>
            <pre>${isDev ? error.stack : 'An error occurred'}</pre>
          </body>
        </html>
      `, {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      });
    }
  };
}

// ============================================================================
// PROGRAMMATIC API
// Allows starting Melina from your own script instead of using CLI
// ============================================================================

export interface StartOptions {
  /** Path to app directory (default: ./app) */
  appDir?: string;
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Unix socket path (alternative to port) */
  unix?: string;
  /** Default page title */
  defaultTitle?: string;
  /** Path to global CSS file */
  globalCss?: string;
}

/**
 * Start the Melina development server programmatically
 * 
 * This is the recommended way to use Melina in your own scripts,
 * giving you full control over the server lifecycle.
 * 
 * @example
 * ```ts
 * // server.ts
 * import { start } from 'melina';
 * 
 * // Basic usage
 * await start();
 * 
 * // With options
 * await start({
 *   appDir: './my-app',
 *   port: 8080,
 *   defaultTitle: 'My Awesome App',
 * });
 * ```
 * 
 * @example Custom middleware
 * ```ts
 * import { serve, createAppRouter } from 'melina';
 * 
 * const appRouter = createAppRouter({ appDir: './app' });
 * 
 * serve(async (req, measure) => {
 *   // Custom middleware logic
 *   console.log('Request:', req.url);
 *   
 *   // Add auth check, rate limiting, etc.
 *   if (req.url.includes('/admin') && !isAuthenticated(req)) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 *   
 *   // Delegate to app router
 *   return appRouter(req, measure);
 * }, { port: 3000 });
 * ```
 */
export async function start(options: StartOptions = {}): Promise<ReturnType<typeof Bun.serve>> {
  let {
    appDir = path.join(process.cwd(), 'app'),
    port = parseInt(process.env.PORT || '3000', 10),
    unix,
    defaultTitle = 'Melina App',
    globalCss,
  } = options;

  // Ensure appDir is absolute
  if (!path.isAbsolute(appDir)) {
    appDir = path.resolve(process.cwd(), appDir);
  }

  // Validate app directory exists
  if (!existsSync(appDir)) {
    console.error(`❌ Error: No "app" directory found at: ${appDir}`);
    console.log(`\nCreate an app directory with pages:`);
    console.log(`  ${appDir}/page.tsx          -> /`);
    console.log(`  ${appDir}/about/page.tsx    -> /about`);
    console.log(`  ${appDir}/blog/[id]/page.tsx -> /blog/:id`);
    throw new Error(`App directory not found: ${appDir}`);
  }

  console.log('🦊 Starting Melina server...');

  const router = createAppRouter({
    appDir,
    defaultTitle,
    globalCss,
  });

  return serve(router, {
    port: unix ? undefined : port,
    unix,
  });
}

/**
 * Create a Melina app instance for programmatic use
 * Returns the router handler that can be used with custom server logic
 * 
 * @example
 * ```ts
 * import { createApp, serve } from 'melina';
 * 
 * const app = createApp({ appDir: './app' });
 * 
 * // Use with custom server
 * Bun.serve({
 *   port: 3000,
 *   fetch: async (req) => {
 *     // Custom logic before Melina handles the request
 *     if (req.url.endsWith('/health')) {
 *       return new Response('OK');
 *     }
 *     return app(req, () => {});
 *   }
 * });
 * ```
 */
export function createApp(options: AppRouterOptions = {}): Handler {
  return createAppRouter(options);
}
