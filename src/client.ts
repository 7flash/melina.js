/**
 * melina/client — Lightweight Client-Side Renderer
 * 
 * A purpose-built alternative to React focused on the reverse portals
 * architecture. Components are rendered off-DOM in a "hangar" and
 * portaled into island placeholders during navigation.
 * 
 * Key concepts:
 * - VNode: Lightweight virtual DOM node
 * - Hangar: Off-DOM container that survives body replacement
 * - Island: Component instance that persists across navigations
 * - Link: Navigation component that triggers body swap + island remount
 * 
 * Usage:
 * ```tsx
 * // tsconfig.json or bunfig.toml
 * // jsxImportSource: "melina/client"
 * 
 * 'use client';
 * import { useState } from 'melina/client';
 * 
 * export function Counter({ initial = 0 }) {
 *     const [count, setCount] = useState(initial);
 *     return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
 * }
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type VNode = {
    type: string | Component<any> | typeof Fragment;
    props: Props;
    key: string | number | null;
};

export type Props = Record<string, any> & { children?: Child | Child[] };
export type Child = VNode | string | number | boolean | null | undefined;
export type Component<P = Props> = (props: P) => VNode | null;

// Internal fiber for tracking component state
interface Fiber {
    node: HTMLElement | Text | null;
    vnode: VNode | null;
    hooks: HookState[];
    hookIndex: number;
    parent: Fiber | null;
    children: Fiber[];
    cleanup: (() => void)[];
}

// Hook state types
type HookState =
    | { type: 'state'; value: any; setter: (v: any) => void }
    | { type: 'effect'; deps: any[] | undefined; cleanup: (() => void) | undefined }
    | { type: 'ref'; current: any }
    | { type: 'memo'; value: any; deps: any[] }
    | { type: 'callback'; fn: Function; deps: any[] };

// =============================================================================
// GLOBAL STATE
// =============================================================================

let currentFiber: Fiber | null = null;
let pendingEffects: (() => void)[] = [];

// Island registry - persists across navigations
const islandRegistry = new Map<string, {
    name: string;
    Component: Component<any>;
    props: Props;
    fiber: Fiber;
    storageNode: HTMLElement;
}>();

// Component cache for lazy loading
const componentCache = new Map<string, Component<any>>();

// =============================================================================
// VNODE CREATION (JSX Runtime)
// =============================================================================

export const Fragment = Symbol('Fragment');

/**
 * createElement / jsx - Creates a VNode
 * This is what Bun's JSX transform calls
 */
export function createElement(
    type: string | Component<any> | typeof Fragment,
    props: Props | null,
    ...children: Child[]
): VNode {
    const normalizedProps: Props = { ...(props || {}) };

    // Flatten children
    if (children.length === 1) {
        normalizedProps.children = children[0];
    } else if (children.length > 1) {
        normalizedProps.children = children;
    }

    return {
        type,
        props: normalizedProps,
        key: normalizedProps.key ?? null,
    };
}

// JSX runtime exports (for automatic JSX transform)
export const jsx = createElement;
export const jsxs = createElement;
export const jsxDEV = createElement;

// =============================================================================
// HOOKS
// =============================================================================

function getHook<T extends HookState>(initializer: () => T): T {
    if (!currentFiber) {
        throw new Error('Hooks can only be called inside a component');
    }

    const fiber = currentFiber;
    const idx = fiber.hookIndex++;

    if (fiber.hooks[idx] === undefined) {
        fiber.hooks[idx] = initializer();
    }

    return fiber.hooks[idx] as T;
}

/**
 * useState - Reactive state
 */
export function useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
    const hook = getHook(() => {
        const value = typeof initial === 'function' ? (initial as () => T)() : initial;
        return { type: 'state' as const, value, setter: null as any };
    });

    // Create setter that triggers re-render
    if (!hook.setter) {
        hook.setter = (newValue: T | ((prev: T) => T)) => {
            const next = typeof newValue === 'function'
                ? (newValue as (prev: T) => T)(hook.value)
                : newValue;

            if (next !== hook.value) {
                hook.value = next;
                scheduleUpdate(currentFiber!);
            }
        };
    }

    return [hook.value, hook.setter];
}

/**
 * useEffect - Side effects
 */
export function useEffect(effect: () => void | (() => void), deps?: any[]): void {
    const hook = getHook(() => ({ type: 'effect' as const, deps: undefined as any[] | undefined, cleanup: undefined as (() => void) | undefined }));

    const changed = !hook.deps || !deps || deps.some((d, i) => d !== hook.deps![i]);

    if (changed) {
        pendingEffects.push(() => {
            if (hook.cleanup) hook.cleanup();
            const result = effect();
            hook.cleanup = typeof result === 'function' ? result : undefined;
        });
        hook.deps = deps;
    }
}

/**
 * useRef - Mutable ref
 */
export function useRef<T>(initial: T): { current: T } {
    return getHook(() => ({ type: 'ref' as const, current: initial }));
}

/**
 * useMemo - Memoized value
 */
export function useMemo<T>(factory: () => T, deps: any[]): T {
    const hook = getHook(() => ({ type: 'memo' as const, value: factory(), deps }));

    const changed = !hook.deps || deps.some((d, i) => d !== hook.deps[i]);
    if (changed) {
        hook.value = factory();
        hook.deps = deps;
    }

    return hook.value;
}

/**
 * useCallback - Memoized callback
 */
export function useCallback<T extends Function>(fn: T, deps: any[]): T {
    return useMemo(() => fn, deps);
}

// =============================================================================
// RECONCILER
// =============================================================================

function scheduleUpdate(fiber: Fiber) {
    // Find root fiber
    let root = fiber;
    while (root.parent) root = root.parent;

    // Schedule microtask re-render
    queueMicrotask(() => {
        if (fiber.vnode) {
            reconcile(fiber, fiber.vnode);
            runEffects();
        }
    });
}

function runEffects() {
    const effects = pendingEffects;
    pendingEffects = [];
    effects.forEach(fn => fn());
}

/**
 * Render a VNode tree to a DOM node
 */
export function render(vnode: VNode | null, container: HTMLElement): Fiber {
    // Create root fiber
    const rootFiber: Fiber = {
        node: container,
        vnode: null,
        hooks: [],
        hookIndex: 0,
        parent: null,
        children: [],
        cleanup: [],
    };

    if (vnode) {
        reconcile(rootFiber, vnode);
    }

    runEffects();
    return rootFiber;
}

/**
 * Reconcile a fiber with a new VNode
 */
function reconcile(parentFiber: Fiber, vnode: VNode | null): void {
    const container = parentFiber.node as HTMLElement;
    if (!container) return;

    // Clear existing children (simple reconciliation for now)
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    parentFiber.children = [];

    if (vnode) {
        const childNode = createNode(vnode, parentFiber);
        if (childNode) {
            container.appendChild(childNode);
        }
    }

    parentFiber.vnode = vnode;
}

/**
 * Create DOM node from VNode
 */
function createNode(vnode: VNode | Child, parentFiber: Fiber): Node | null {
    // Primitives
    if (vnode === null || vnode === undefined || vnode === false || vnode === true) {
        return null;
    }

    if (typeof vnode === 'string' || typeof vnode === 'number') {
        return document.createTextNode(String(vnode));
    }

    const { type, props } = vnode;

    // Fragment
    if (type === Fragment) {
        const fragment = document.createDocumentFragment();
        renderChildren(props.children, parentFiber, fragment);
        return fragment;
    }

    // Component
    if (typeof type === 'function') {
        // Create fiber for component
        const componentFiber: Fiber = {
            node: null,
            vnode,
            hooks: [],
            hookIndex: 0,
            parent: parentFiber,
            children: [],
            cleanup: [],
        };
        parentFiber.children.push(componentFiber);

        // Render component
        const prevFiber = currentFiber;
        currentFiber = componentFiber;
        componentFiber.hookIndex = 0;

        const result = (type as Component)(props);

        currentFiber = prevFiber;

        if (result) {
            const node = createNode(result, componentFiber);
            componentFiber.node = node as HTMLElement;
            return node;
        }
        return null;
    }

    // HTML Element
    const el = document.createElement(type as string);

    // Apply props
    for (const [key, value] of Object.entries(props)) {
        if (key === 'children' || key === 'key') continue;

        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, value);
        } else if (key === 'ref' && typeof value === 'object' && 'current' in value) {
            value.current = el;
        } else if (key === 'dangerouslySetInnerHTML') {
            el.innerHTML = value.__html;
        } else if (typeof value === 'boolean') {
            if (value) el.setAttribute(key, '');
        } else if (value != null) {
            el.setAttribute(key, String(value));
        }
    }

    // Fiber for this element
    const elFiber: Fiber = {
        node: el,
        vnode,
        hooks: [],
        hookIndex: 0,
        parent: parentFiber,
        children: [],
        cleanup: [],
    };
    parentFiber.children.push(elFiber);

    // Render children
    renderChildren(props.children, elFiber, el);

    return el;
}

function renderChildren(children: Child | Child[] | undefined, parentFiber: Fiber, container: HTMLElement | DocumentFragment): void {
    if (children === undefined || children === null) return;

    const childArray = Array.isArray(children) ? children : [children];

    for (const child of childArray) {
        if (Array.isArray(child)) {
            // Nested array
            renderChildren(child, parentFiber, container);
        } else {
            const node = createNode(child, parentFiber);
            if (node) container.appendChild(node);
        }
    }
}

// =============================================================================
// ISLAND SYSTEM (HANGAR ARCHITECTURE)
// =============================================================================

let hangarRoot: HTMLElement | null = null;
let holdingPen: HTMLElement | null = null;

/**
 * Initialize the Hangar - off-DOM container for islands
 */
function initHangar(): void {
    if (hangarRoot) return;

    // Create hangar OUTSIDE body (survives body.innerHTML replacement)
    hangarRoot = document.createElement('div');
    hangarRoot.id = 'melina-hangar';
    hangarRoot.style.display = 'contents';
    document.documentElement.appendChild(hangarRoot);

    // Holding pen for islands during navigation
    holdingPen = document.createElement('div');
    holdingPen.id = 'melina-holding-pen';
    holdingPen.style.display = 'none';
    hangarRoot.appendChild(holdingPen);

    console.log('[Melina Client] Hangar initialized');
}

/**
 * Get island metadata from page
 */
function getIslandMeta(): Record<string, string> {
    const metaEl = document.getElementById('__MELINA_META__');
    if (!metaEl) return {};
    try {
        return JSON.parse(metaEl.textContent || '{}');
    } catch {
        return {};
    }
}

/**
 * Load component module
 */
async function loadComponent(name: string): Promise<Component<any> | null> {
    if (componentCache.has(name)) return componentCache.get(name)!;

    const meta = getIslandMeta();
    const url = meta[name];
    if (!url) return null;

    try {
        const module = await import(/* @vite-ignore */ url);
        const Component = module[name] || module.default;
        componentCache.set(name, Component);
        return Component;
    } catch (e) {
        console.error('[Melina Client] Failed to load component:', name, e);
        return null;
    }
}

/**
 * Hydrate all islands in the current DOM
 */
export async function hydrateIslands(): Promise<void> {
    initHangar();

    const placeholders = document.querySelectorAll('[data-melina-island]');
    const seenIds = new Set<string>();

    for (let i = 0; i < placeholders.length; i++) {
        const el = placeholders[i] as HTMLElement;
        const name = el.getAttribute('data-melina-island');
        if (!name) continue;

        const propsStr = (el.getAttribute('data-props') || '{}').replace(/&quot;/g, '"');
        const props = JSON.parse(propsStr);
        const instanceId = el.getAttribute('data-instance') || `${name}-${i}`;

        seenIds.add(instanceId);

        const existing = islandRegistry.get(instanceId);

        if (existing) {
            // Move existing storage node to new placeholder
            existing.props = props;
            el.appendChild(existing.storageNode);
            console.log('[Melina Client] Moved island:', instanceId);
        } else {
            // Load component and create new island
            const Component = await loadComponent(name);
            if (Component) {
                // Create storage node (the "lifeboat")
                const storageNode = document.createElement('div');
                storageNode.style.display = 'contents';
                storageNode.setAttribute('data-storage', instanceId);
                el.appendChild(storageNode);

                // Render component into storage node
                const vnode = createElement(Component, props);
                const fiber = render(vnode, storageNode);

                islandRegistry.set(instanceId, {
                    name,
                    Component,
                    props,
                    fiber,
                    storageNode,
                });

                console.log('[Melina Client] Created island:', instanceId);
            }
        }
    }

    // Garbage collect islands no longer in DOM
    for (const [id, island] of islandRegistry.entries()) {
        if (!seenIds.has(id)) {
            // Move to holding pen (could be needed on back-nav)
            if (holdingPen) {
                holdingPen.appendChild(island.storageNode);
            }
            // Could optionally delete after timeout
            console.log('[Melina Client] Parked island:', id);
        }
    }
}

/**
 * Sync islands after body swap (synchronous for View Transitions)
 */
export function syncIslands(): void {
    const placeholders = document.querySelectorAll('[data-melina-island]');

    for (let i = 0; i < placeholders.length; i++) {
        const el = placeholders[i] as HTMLElement;
        const name = el.getAttribute('data-melina-island');
        if (!name) continue;

        const instanceId = el.getAttribute('data-instance') || `${name}-${i}`;
        const existing = islandRegistry.get(instanceId);

        if (existing) {
            // Update props and move storage node
            const propsStr = (el.getAttribute('data-props') || '{}').replace(/&quot;/g, '"');
            existing.props = JSON.parse(propsStr);
            el.appendChild(existing.storageNode);
        }
    }
}

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Navigate to a new URL with View Transitions support
 */
export async function navigate(href: string): Promise<void> {
    const fromPath = window.location.pathname;
    const toPath = new URL(href, window.location.origin).pathname;

    if (fromPath === toPath) return;

    console.log('[Melina Client] Navigate:', fromPath, '->', toPath);

    // Fetch new page
    let newDoc: Document;
    try {
        const response = await fetch(href, { headers: { 'X-Melina-Nav': '1' } });
        const html = await response.text();
        newDoc = new DOMParser().parseFromString(html, 'text/html');
    } catch (error) {
        console.error('[Melina Client] Fetch failed, falling back to hard nav');
        window.location.href = href;
        return;
    }

    // Update URL
    window.history.pushState({}, '', href);

    // DOM update function
    const performUpdate = () => {
        // Dispatch navigation event (for island state updates)
        window.dispatchEvent(new CustomEvent('melina:navigation-start', {
            detail: { from: fromPath, to: toPath }
        }));

        document.title = newDoc.title;
        document.body.innerHTML = newDoc.body.innerHTML;

        // Sync existing islands immediately
        syncIslands();
        window.scrollTo(0, 0);
    };

    // Use View Transitions if available
    if (document.startViewTransition) {
        const transition = document.startViewTransition(performUpdate);
        await transition.finished;
    } else {
        performUpdate();
    }

    // Hydrate new islands
    await hydrateIslands();

    console.log('[Melina Client] Navigation complete');
}

// Expose globally
if (typeof window !== 'undefined') {
    (window as any).melinaNavigate = navigate;
}

// =============================================================================
// LINK COMPONENT
// =============================================================================

export interface LinkProps extends Props {
    href: string;
    children?: Child | Child[];
    className?: string;
    style?: Record<string, string | number>;
}

/**
 * Link component - handles client-side navigation
 */
export function Link(props: LinkProps): VNode {
    const { href, children, ...rest } = props;

    const handleClick = (e: MouseEvent) => {
        // Allow modifier keys for new tab, etc
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

        e.preventDefault();
        navigate(href);
    };

    // Normalize children to array for createElement spread
    const childArray = Array.isArray(children) ? children : (children !== undefined ? [children] : []);
    return createElement('a', { href, onClick: handleClick, ...rest }, ...childArray);
}

// =============================================================================
// SSR SUPPORT
// =============================================================================

const isServer = typeof window === 'undefined';

/**
 * Island wrapper for SSR
 * On server: renders placeholder div
 * On client: renders actual component
 */
export function island<P extends Props>(
    Component: Component<P>,
    name: string
): Component<P> {
    return function IslandWrapper(props: P): VNode {
        if (isServer) {
            // Server: render placeholder
            const propsJson = JSON.stringify(props).replace(/"/g, '&quot;');
            return createElement('div', {
                'data-melina-island': name,
                'data-props': propsJson,
                style: { display: 'contents' },
            });
        }

        // Client: render component
        return createElement(Component, props);
    };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the Melina client runtime
 */
export async function init(): Promise<void> {
    if (isServer) return;

    initHangar();

    // Intercept link clicks
    document.addEventListener('click', (e: MouseEvent) => {
        if (e.defaultPrevented) return;

        const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
        if (!link) return;

        const href = link.getAttribute('href');
        if (
            e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 ||
            link.hasAttribute('download') || link.hasAttribute('target') ||
            link.hasAttribute('data-no-intercept') ||
            !href || !href.startsWith('/')
        ) return;

        if (window.location.pathname === href) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        navigate(href);
    });

    // Handle back/forward
    window.addEventListener('popstate', async () => {
        const href = window.location.pathname;

        const performUpdate = async () => {
            const response = await fetch(href, { headers: { 'X-Melina-Nav': '1' } });
            const html = await response.text();
            const newDoc = new DOMParser().parseFromString(html, 'text/html');

            document.title = newDoc.title;
            document.body.innerHTML = newDoc.body.innerHTML;
            syncIslands();
        };

        if (document.startViewTransition) {
            await document.startViewTransition(performUpdate).finished;
        } else {
            await performUpdate();
        }

        await hydrateIslands();
    });

    // Initial hydration
    await hydrateIslands();

    console.log('[Melina Client] Runtime initialized');
}

// Auto-init when DOM ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    createElement as h,
    islandRegistry,
    componentCache,
};

// Default export for JSX pragma
export default {
    createElement,
    Fragment,
};
