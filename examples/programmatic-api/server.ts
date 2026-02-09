/**
 * Programmatic Melina Server
 * 
 * This demonstrates starting Melina from your own script,
 * giving you full control over the server lifecycle
 * and the ability to add custom middleware.
 */
import { start, serve, createAppRouter } from '../../src/web';
import { measure } from '@ments/utils';

// Option 1: Simple start (recommended for most cases)
// await start({ port: 3000 });

// Option 2: Custom middleware with createAppRouter
const app = createAppRouter({
    appDir: './app',
    defaultTitle: 'Programmatic API Demo',
});

serve(async (req, m) => {
    const url = new URL(req.url);

    // Custom health check endpoint
    if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', uptime: process.uptime() }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Delegate to Melina app router
    return app(req, m);

}, { port: 3000 });

measure(() => '🚀 Custom Melina server started!', 'Server');
measure(() => '📡 Health check: http://localhost:3000/health', 'Health');
