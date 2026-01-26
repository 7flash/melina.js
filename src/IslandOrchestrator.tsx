'use client';

/**
 * IslandOrchestrator - Single React Root + Portals Architecture
 * 
 * This component manages ALL islands in the application from a single React root.
 * Each island is rendered as a React Portal into its placeholder in the DOM.
 * 
 * Benefits:
 * - Single React instance (no duplicate bundles)
 * - Shared state context across all islands
 * - Islands persist across navigation (portals just re-target)
 * - View Transitions work naturally (same React tree)
 */

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal, flushSync } from 'react-dom';

// Types
interface IslandConfig {
    name: string;
    props: Record<string, any>;
    target: HTMLElement;
    instanceId: string;
}

interface LoadedIsland extends IslandConfig {
    Component: React.ComponentType<any>;
}

// Global component cache - shared across all orchestrator instances
const componentCache: Record<string, React.ComponentType<any>> = {};

// Get island meta from the page
function getIslandMeta(): Record<string, string> {
    const metaEl = document.getElementById('__MELINA_META__');
    if (!metaEl) return {};
    try {
        return JSON.parse(metaEl.textContent || '{}');
    } catch {
        return {};
    }
}

// Collect all island placeholders from the DOM
function collectIslandPlaceholders(): IslandConfig[] {
    const elements = document.querySelectorAll('[data-island]');
    const islands: IslandConfig[] = [];

    elements.forEach((el, index) => {
        const name = el.getAttribute('data-island');
        if (!name) return;

        const propsStr = (el.getAttribute('data-props') || '{}').replace(/&quot;/g, '"');
        let props = {};
        try {
            props = JSON.parse(propsStr);
        } catch (e) {
            console.warn(`[Melina] Invalid props for island ${name}:`, e);
        }

        // Generate stable instance ID
        const instanceId = el.getAttribute('data-instance') || `${name}-${index}`;

        islands.push({
            name,
            props,
            target: el as HTMLElement,
            instanceId
        });
    });

    return islands;
}

// Load a component module dynamically
async function loadComponent(name: string): Promise<React.ComponentType<any> | null> {
    // Check cache first
    if (componentCache[name]) {
        return componentCache[name];
    }

    const meta = getIslandMeta();
    const bundlePath = meta[name];

    if (!bundlePath) {
        console.warn(`[Melina] No bundle found for island: ${name}`);
        return null;
    }

    try {
        const module = await import(/* @vite-ignore */ bundlePath);
        // Try named export first, then default
        const Component = module[name] || module.default;

        if (Component) {
            componentCache[name] = Component;
            console.log(`[Melina] Loaded component: ${name}`);
            return Component;
        } else {
            console.warn(`[Melina] No export found for component: ${name}`);
            return null;
        }
    } catch (e) {
        console.error(`[Melina] Failed to load component ${name}:`, e);
        return null;
    }
}

// Island wrapper - renders the component in a portal
function IslandPortal({ island }: { island: LoadedIsland }) {
    const { Component, props, target, name, instanceId } = island;

    // Mark as hydrated
    useEffect(() => {
        target.setAttribute('data-hydrated', 'true');
        return () => {
            target.removeAttribute('data-hydrated');
        };
    }, [target]);

    return createPortal(
        <Component {...props} />,
        target
    );
}

// Navigation state store (external store pattern for React 18)
let currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
const pathListeners = new Set<() => void>();

function subscribePath(callback: () => void) {
    pathListeners.add(callback);
    return () => pathListeners.delete(callback);
}

function getPath() {
    return currentPath;
}

function setPath(newPath: string) {
    currentPath = newPath;
    pathListeners.forEach(cb => cb());
}

// Listen for navigation events
if (typeof window !== 'undefined') {
    window.addEventListener('melina:navigation-start', (e: any) => {
        const to = e.detail?.to || window.location.pathname;
        setPath(to);
    });

    window.addEventListener('popstate', () => {
        setPath(window.location.pathname);
    });
}

/**
 * IslandOrchestrator Component
 * 
 * Manages all islands from a single React root using portals.
 */
export function IslandOrchestrator() {
    const [islands, setIslands] = useState<LoadedIsland[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Track current path for re-rendering on navigation
    const path = useSyncExternalStore(subscribePath, getPath, () => '/');

    // Scan and load islands
    const scanAndLoadIslands = useCallback(async () => {
        const placeholders = collectIslandPlaceholders();

        // Load all components in parallel
        const loaded: LoadedIsland[] = [];

        await Promise.all(
            placeholders.map(async (config) => {
                const Component = await loadComponent(config.name);
                if (Component) {
                    loaded.push({ ...config, Component });
                }
            })
        );

        // Use flushSync during navigation to ensure view transition captures correct state
        if (document.startViewTransition) {
            flushSync(() => setIslands(loaded));
        } else {
            setIslands(loaded);
        }

        setIsLoading(false);
        console.log(`[Melina] Orchestrator: ${loaded.length} islands active`);
    }, []);

    // Initial scan
    useEffect(() => {
        scanAndLoadIslands();
    }, [scanAndLoadIslands]);

    // Re-scan on navigation
    useEffect(() => {
        const handleNavigated = () => {
            // Small delay to let DOM update complete
            requestAnimationFrame(() => {
                scanAndLoadIslands();
            });
        };

        window.addEventListener('melina:navigated', handleNavigated);
        return () => window.removeEventListener('melina:navigated', handleNavigated);
    }, [scanAndLoadIslands]);

    // Also re-scan when path changes (for layout islands that conditionally render)
    useEffect(() => {
        scanAndLoadIslands();
    }, [path, scanAndLoadIslands]);

    // Render all islands as portals
    return (
        <>
            {islands.map((island) => (
                <IslandPortal
                    key={island.instanceId}
                    island={island}
                />
            ))}
        </>
    );
}

/**
 * Initialize the Island Orchestrator
 * Call this from the runtime script to bootstrap the single React root
 */
export async function initializeOrchestrator() {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');

    // Create container if it doesn't exist
    let container = document.getElementById('melina-islands');
    if (!container) {
        container = document.createElement('div');
        container.id = 'melina-islands';
        container.style.display = 'contents'; // Won't affect layout
        document.body.insertBefore(container, document.body.firstChild);
    }

    // Create single React root
    const root = createRoot(container);
    root.render(React.createElement(IslandOrchestrator));

    console.log('[Melina] Island Orchestrator initialized (Single Root + Portals)');

    return root;
}

export default IslandOrchestrator;
