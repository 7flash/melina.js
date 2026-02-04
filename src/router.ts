import { readdirSync, statSync, existsSync } from 'fs';
import path from 'path';

export interface Route {
    /** File path to the page component */
    filePath: string;
    /** URL pattern (e.g., "/posts/:id") */
    pattern: string;
    /** URL pathname (e.g., "/posts/123") */
    pathname: string;
    /** Parameter names in order (e.g., ["id"]) */
    paramNames: string[];
    /** Regex for matching URLs */
    regex: RegExp;
    /** Layout file paths from root to page (for nested layouts) */
    layouts: string[];
    /** Route type: 'page' or 'api' */
    type: 'page' | 'api';
}

export interface RouteMatch {
    /** The matched route */
    route: Route;
    /** Extracted parameters from URL */
    params: Record<string, string>;
}

/**
 * Convert file path to URL pattern
 * Examples:
 *   app/page.tsx -> /
 *   app/about/page.tsx -> /about
 *   app/posts/[id]/page.tsx -> /posts/:id
 *   app/blog/[year]/[month]/page.tsx -> /blog/:year/:month
 */
function filePathToPattern(filePath: string, appDir: string): { pattern: string; paramNames: string[] } {
    // Remove appDir prefix and get relative path
    let relativePath = path.relative(appDir, filePath);
    // WINDOWS FIX: Normalize all backslashes to forward slashes FIRST
    relativePath = relativePath.split(path.sep).join('/');
    // Remove page.tsx/page.ts or route.ts suffix (now using forward slash only)
    relativePath = relativePath.replace(/(^|\/)(page|route)\.(tsx?|jsx?)$/, '');

    // Handle root page
    if (!relativePath || relativePath === '.') {
        return { pattern: '/', paramNames: [] };
    }

    // Convert [param] to :param and collect param names
    const paramNames: string[] = [];
    const pattern = '/' + relativePath
        .split('/')
        .map(segment => {
            // Handle dynamic segments like [id] or [slug]
            const match = segment.match(/^\[([^\]]+)\]$/);
            if (match) {
                paramNames.push(match[1]);
                return `:${match[1]}`;
            }
            // Handle route groups like (group) - ignore them in URL
            if (segment.match(/^\([^)]+\)$/)) {
                return null;
            }
            return segment;
        })
        .filter(Boolean)
        .join('/');

    return { pattern: pattern || '/', paramNames };
}

/**
 * Convert URL pattern to RegExp for matching
 * /posts/:id -> /^\/posts\/([^\/]+)$/
 */
function patternToRegex(pattern: string): RegExp {
    const regexStr = pattern
        .replace(/\//g, '\\/')
        .replace(/:([^\/]+)/g, '([^\\/]+)');
    return new RegExp(`^${regexStr}$`);
}

/**
 * Find all layout.tsx files from appDir to the page's directory
 */
function findLayouts(pageFilePath: string, appDir: string): string[] {
    const layouts: string[] = [];
    let currentDir = path.dirname(pageFilePath);

    // Walk up from page directory to appDir, collecting layouts
    while (currentDir.startsWith(appDir) || currentDir === appDir) {
        const layoutPath = path.join(currentDir, 'layout.tsx');
        if (existsSync(layoutPath)) {
            layouts.unshift(layoutPath); // Add to front (root layouts first)
        }

        if (currentDir === appDir) break;
        currentDir = path.dirname(currentDir);
    }

    return layouts;
}

/**
 * Recursively discover all page.tsx/page.ts and route.ts files in app directory
 */
export function discoverRoutes(appDir: string): Route[] {
    const routes: Route[] = [];

    function scanDir(dir: string) {
        try {
            const entries = readdirSync(dir);

            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                const stats = statSync(fullPath);

                if (stats.isDirectory()) {
                    scanDir(fullPath);
                } else if (entry.match(/^page\.(tsx?|jsx?)$/)) {
                    const { pattern, paramNames } = filePathToPattern(fullPath, appDir);
                    const regex = patternToRegex(pattern);
                    const layouts = findLayouts(fullPath, appDir);

                    routes.push({
                        filePath: fullPath,
                        pattern,
                        pathname: pattern,
                        paramNames,
                        regex,
                        layouts,
                        type: 'page',
                    });
                } else if (entry.match(/^route\.(tsx?|js)$/)) {
                    // API route
                    const { pattern, paramNames } = filePathToPattern(fullPath, appDir);
                    const regex = patternToRegex(pattern);

                    routes.push({
                        filePath: fullPath,
                        pattern,
                        pathname: pattern,
                        paramNames,
                        regex,
                        layouts: [],
                        type: 'api',
                    });
                }
            }
        } catch (error: any) {
            // Directory doesn't exist or can't be read
            console.warn(`Could not scan directory ${dir}:`, error.message);
        }
    }

    scanDir(appDir);

    // Sort routes by specificity (more specific routes first)
    // Static routes before dynamic routes
    routes.sort((a, b) => {
        const aStatic = !a.pattern.includes(':');
        const bStatic = !b.pattern.includes(':');

        if (aStatic && !bStatic) return -1;
        if (!aStatic && bStatic) return 1;

        // If both static or both dynamic, sort by depth (deeper first)
        const aDepth = a.pattern.split('/').length;
        const bDepth = b.pattern.split('/').length;
        return bDepth - aDepth;
    });

    return routes;
}

/**
 * Match a pathname against discovered routes
 * Returns the first matching route with extracted parameters
 */
export function matchRoute(pathname: string, routes: Route[]): RouteMatch | null {
    for (const route of routes) {
        const match = pathname.match(route.regex);
        if (match) {
            const params: Record<string, string> = {};
            route.paramNames.forEach((name, index) => {
                params[name] = match[index + 1];
            });

            return { route, params };
        }
    }

    return null;
}
