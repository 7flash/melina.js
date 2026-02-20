/**
 * HTTP Server
 * 
 * Handles server creation, request dispatch, error handling,
 * and graceful shutdown for Melina.js applications.
 */

import { unlink } from 'fs/promises';
import { measure } from 'measure-fn';
import type { MeasureFn } from 'measure-fn';
import { builtAssets, getContentType } from "./build";
import type { Handler } from "./types";

const isDev = process.env.NODE_ENV !== "production";

// ─── Global Error Handlers ──────────────────────────────────────────────────────
// Prevent the Bun process from dying on unhandled errors.
// ALWAYS log full stack traces — errors must be visible in both dev and production.

process.on('unhandledRejection', (reason: any) => {
    console.error('[Melina] Unhandled Promise Rejection (server kept alive):');
    console.error(reason instanceof Error ? reason.stack ?? reason.message : reason);
});

process.on('uncaughtException', (error: Error) => {
    console.error('[Melina] Uncaught Exception (server kept alive):');
    console.error(error.stack ?? error.message);
});

// Global cleanup function for unix socket
let cleanupUnixSocket: (() => Promise<void>) | null = null;

function generateRequestId(): string {
    return Math.random().toString(36).substring(2, 10);
}

/**
 * Create and start a Melina HTTP server.
 * 
 * Automatically determines port or unix socket from BUN_PORT env var or CLI arg.
 * Handles cleanup and graceful shutdown automatically.
 */
export async function serve(handler: Handler, options?: { port?: number; unix?: string }) {
    // Automatic detection logic
    let port: number | undefined;
    let unix: string | undefined;

    if (options?.port !== undefined) {
        port = options.port;
    } else if (options?.unix !== undefined) {
        unix = options.unix;
    } else {
        const bunPort = process.env.BUN_PORT;
        const cliArg = process.argv[2];
        const isFlag = cliArg?.startsWith('-');

        if (bunPort) {
            const parsedPort = parseInt(bunPort, 10);
            if (!isNaN(parsedPort)) {
                port = parsedPort;
            } else {
                unix = bunPort;
            }
        } else if (cliArg && !isFlag) {
            const parsedPort = parseInt(cliArg, 10);
            if (!isNaN(parsedPort)) {
                port = parsedPort;
            } else {
                unix = cliArg;
            }
        }
    }

    if (!port && !unix) {
        port = 3000;
    }

    if (port !== undefined && unix) {
        throw new Error("Cannot specify both port and unix socket");
    }

    // Handle unix socket cleanup BEFORE starting server
    if (unix) {
        if (!unix.startsWith('\0')) {
            await unlink(unix).catch(() => { });
        }
        cleanupUnixSocket = async () => {
            if (unix && !unix.startsWith('\0')) {
                await unlink(unix).catch(() => { });
            }
        };
    }

    const args: any = {
        idleTimeout: 0,
        development: isDev,
        async fetch(req: Request) {
            let requestId = req.headers.get("X-Request-ID");
            if (!requestId) {
                requestId = generateRequestId();
                req.headers.set("X-Request-ID", requestId);
            }

            try {
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

                // Handle request with user handler — measure wraps the call
                const response = await measure(
                    { label: `${req.method} ${req.url}`, requestId },
                    async (m: MeasureFn) => {
                        return await handler(req, m);
                    }
                );

                // Async iterator (streaming)
                if (typeof response === 'object' && response != null && (response as any)[Symbol.asyncIterator]) {
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
                    const headers = new Headers(response.headers);
                    headers.set("X-Request-ID", requestId);
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

                // Null guard — measure() may return null on error
                if (response === null || response === undefined) {
                    return new Response("Internal Server Error", {
                        status: 500,
                        headers: { "Content-Type": "text/plain" },
                    });
                }

                return new Response(JSON.stringify(response), {
                    headers: { "Content-Type": "application/json" },
                });
            } catch (error: any) {
                console.error("[Server Error]", error);
                const errorDetails = error?.message ?? String(error);
                const stackTrace = error?.stack ?? 'No stack trace available';
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
            }
        },
        error(error: Error) {
            console.error("[Bun Server Error]", error);
            return new Response("Internal Server Error", {
                status: 500,
                headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
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
        if (!unix && err.code === 'EADDRINUSE') {
            args.port = findAvailablePort(3001);
            server = Bun.serve(args);
        } else {
            throw err;
        }
    }

    if (unix) {
        console.log(`🦊 Melina server running on unix socket ${unix}`);
    } else {
        console.log(`🦊 Melina server running at http://localhost:${server.port}`);
    }

    // Graceful shutdown
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

// ─── Port Discovery ─────────────────────────────────────────────────────────────

export function findAvailablePort(startPort: number = 3001): number {
    for (let port = startPort; port < startPort + 100; port++) {
        try {
            const listener = Bun.listen({
                port,
                hostname: 'localhost',
                socket: {
                    close() { },
                    data() { },
                },
            });
            listener.stop();
            return port;
        } catch (e: any) {
            if (!e.message.includes('EADDRINUSE') && !e.message.includes('Address already in use')) {
                throw e;
            }
        }
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + 99}`);
}
