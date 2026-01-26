/**
 * Programmatic Melina Server
 * 
 * This demonstrates starting Melina from your own script,
 * giving you full control over the server lifecycle
 * and the ability to add custom middleware.
 */
import { start, serve, createAppRouter } from '../../src/web';

// Option 1: Simple start (recommended for most cases)
// await start({ port: 3000 });

// Option 2: Custom middleware with createAppRouter
const app = createAppRouter({
    appDir: './app',
    defaultTitle: 'Programmatic API Demo',
});

serve(async (req, measure) => {
    const url = new URL(req.url);

    // Custom health check endpoint
    if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Custom logging
    console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

    // Delegate to Melina app router
    return app(req, measure);

}, { port: 3000 });

console.log('🚀 Custom Melina server started!');
console.log('📡 Health check: http://localhost:3000/health');
