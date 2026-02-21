/**
 * SSG Benchmark API — compares SSG vs SSR response times
 */
import { getPrerendered } from 'melina/server';

export async function GET(req: Request) {
    const iterations = 100;
    const results: { method: string; avgMs: number; medianMs: number; p99Ms: number; description: string }[] = [];

    // ── Benchmark 1: SSG (memory-served) ────────────────────────────────
    {
        const times: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            const html = getPrerendered('/features/ssg');
            if (html) {
                const response = new Response(html, {
                    headers: { 'Content-Type': 'text/html' },
                });
                await response.text();
            }
            times.push(performance.now() - start);
        }
        times.sort((a, b) => a - b);
        results.push({
            method: 'SSG (memory)',
            avgMs: +(times.reduce((a, b) => a + b) / times.length).toFixed(4),
            medianMs: +times[Math.floor(times.length / 2)].toFixed(4),
            p99Ms: +times[Math.floor(times.length * 0.99)].toFixed(4),
            description: 'Pre-rendered HTML served from memory buffer',
        });
    }

    // ── Benchmark 2: Simulated SSR (re-render each time) ─────────────────
    {
        const { createElement } = await import('melina/client/render');
        const { renderToString } = await import('melina/server/ssr');
        const mod = await import('../../features/ssg/page');

        const times: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            const PageComponent = mod.default;
            const tree = createElement(PageComponent, {});
            const html = renderToString(tree);
            const response = new Response(`<!DOCTYPE html>${html}`, {
                headers: { 'Content-Type': 'text/html' },
            });
            await response.text();
            times.push(performance.now() - start);
        }
        times.sort((a, b) => a - b);
        results.push({
            method: 'SSR (fresh)',
            avgMs: +(times.reduce((a, b) => a + b) / times.length).toFixed(4),
            medianMs: +times[Math.floor(times.length / 2)].toFixed(4),
            p99Ms: +times[Math.floor(times.length * 0.99)].toFixed(4),
            description: 'Component re-rendered to HTML on every request',
        });
    }

    // ── Benchmark 3: Cached SSR (store rendered HTML in variable) ────────
    {
        const { createElement } = await import('melina/client/render');
        const { renderToString } = await import('melina/server/ssr');

        let cache: string | null = null;
        const times: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            if (!cache) {
                const mod = await import('../../features/ssg/page');
                const tree = createElement(mod.default, {});
                cache = `<!DOCTYPE html>${renderToString(tree)}`;
            }
            const response = new Response(cache, {
                headers: { 'Content-Type': 'text/html' },
            });
            await response.text();
            times.push(performance.now() - start);
        }
        times.sort((a, b) => a - b);
        results.push({
            method: 'Cached SSR',
            avgMs: +(times.reduce((a, b) => a + b) / times.length).toFixed(4),
            medianMs: +times[Math.floor(times.length / 2)].toFixed(4),
            p99Ms: +times[Math.floor(times.length * 0.99)].toFixed(4),
            description: 'First render cached as string, re-served from variable',
        });
    }

    // ── Summary ─────────────────────────────────────────────────────────
    const ssgTime = results[0].avgMs;
    const ssrTime = results[1].avgMs;
    const cachedTime = results[2].avgMs;

    return Response.json({
        iterations,
        results,
        summary: {
            ssgVsSsr: `SSG is ${(ssrTime / ssgTime).toFixed(1)}x faster than SSR`,
            ssgVsCached: `SSG is ${(cachedTime / ssgTime).toFixed(1)}x faster than Cached SSR`,
            note: 'SSG stores the full HTML as an ArrayBuffer in builtAssets at startup. Cached SSR stores the HTML as a JS string. SSG avoids per-request string allocation.',
        },
    });
}
