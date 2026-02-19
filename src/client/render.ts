/**
 * melina/client — Client-Side Renderer
 * 
 * Real VDOM diffing with three reconciliation strategies:
 * 
 * 1. KEYED DIFF — O(n) via key→fiber map. Handles insertions, deletions,
 *    and reorders without touching nodes that didn't move. Uses the Longest
 *    Increasing Subsequence (LIS) algorithm to minimize DOM moves.
 *    
 * 2. SEQUENTIAL DIFF — For non-keyed children. Patches nodes in-place by
 *    index, appending/removing only the tail difference.
 *    
 * 3. PROPERTY PATCH — Updates attributes on existing DOM elements without
 *    recreating them. Only touches changed props, reducing layout thrash.
 * 
 * Why these strategies?
 * ─────────────────────
 * - Keyed diff is the gold standard for list rendering (React, Preact, Inferno
 *   all use it). We use LIS to find the longest stable subsequence, then only 
 *   move nodes that fall outside it. This is O(n log n) for the LIS + O(n) 
 *   for the diff = O(n log n) total, matching Inferno's approach.
 * 
 * - Sequential diff is faster than keyed for static/non-reorderable children
 *   (e.g. a form with fixed fields). No map allocation, no LIS computation.
 *   Pure O(n) linear scan.
 * 
 * - Property patching avoids element recreation entirely. If a <div> stays a
 *   <div> but its className changes, we just update the attribute. This is 
 *   the single biggest win over innerHTML replacement — event listeners and
 *   input focus are preserved.
 * 
 * Zero dependencies. ~2KB gzipped.
 */

import { Fragment, type VNode, type Child, type Component, type Props } from './types';

// ─── Fiber: Internal representation of a mounted VNode ─────────────────────────

export interface Fiber {
    node: Node | null;              // The real DOM node (or null for fragments/components)
    vnode: VNode | Child;           // The VNode that produced this fiber
    parent: Fiber | null;
    children: Fiber[];
    listeners: Map<string, EventListener>;  // Track event listeners for cleanup
    key: string | number | null;
}

// ─── Public API ────────────────────────────────────────────────────────────────

const rootFibers = new WeakMap<HTMLElement, Fiber>();

/**
 * Render a VNode tree into a container.
 * First call: mounts the tree.
 * Subsequent calls: diffs against the previous tree and patches the DOM.
 */
export function render(vnode: VNode | null, container: HTMLElement): Fiber {
    let rootFiber = rootFibers.get(container);

    if (!rootFiber) {
        while (container.firstChild) container.removeChild(container.firstChild);
        rootFiber = createFiber(null, null);
        rootFiber.node = container;
        rootFibers.set(container, rootFiber);
    }

    const newChildren = vnode ? [vnode] : [];
    diffChildren(rootFiber, container, rootFiber.children, newChildren);

    return rootFiber;
}

// ─── Fiber Factory ─────────────────────────────────────────────────────────────

function createFiber(vnode: VNode | Child, parent: Fiber | null): Fiber {
    return {
        node: null,
        vnode,
        parent,
        children: [],
        listeners: new Map(),
        key: (vnode && typeof vnode === 'object' && 'key' in vnode) ? vnode.key : null,
    };
}

// ─── Collect DOM Nodes ─────────────────────────────────────────────────────────
// Fragments and components don't have their own DOM node.
// This collects the actual DOM nodes from a fiber tree.

function collectNodes(fiber: Fiber): Node[] {
    if (fiber.node && !(fiber.vnode && typeof fiber.vnode === 'object' && 'type' in fiber.vnode && fiber.vnode.type === Fragment)) {
        // Regular element or text — return its DOM node
        if (fiber.node instanceof HTMLElement || fiber.node instanceof Text) {
            return [fiber.node];
        }
    }
    // Fragment or component without own node — collect from children
    const nodes: Node[] = [];
    for (const child of fiber.children) {
        nodes.push(...collectNodes(child));
    }
    return nodes;
}

// ─── Core Diff Algorithm ───────────────────────────────────────────────────────

function diffChildren(
    parentFiber: Fiber,
    parentNode: Node,
    oldFibers: Fiber[],
    newVNodes: (VNode | Child)[],
): void {
    const flatNew = flattenChildren(newVNodes);

    const hasKeys = flatNew.some(v => v && typeof v === 'object' && 'key' in v && v.key != null)
        || oldFibers.some(f => f.key != null);

    if (hasKeys) {
        keyedDiff(parentFiber, parentNode, oldFibers, flatNew);
    } else {
        sequentialDiff(parentFiber, parentNode, oldFibers, flatNew);
    }
}

// ─── Strategy 1: Sequential Diff ───────────────────────────────────────────────

function sequentialDiff(
    parentFiber: Fiber,
    parentNode: Node,
    oldFibers: Fiber[],
    newVNodes: (VNode | Child)[],
): void {
    const newFibers: Fiber[] = [];

    // Snapshot old fibers — don't mutate during iteration
    const oldSnapshot = [...oldFibers];
    const maxLen = Math.max(oldSnapshot.length, newVNodes.length);

    for (let i = 0; i < maxLen; i++) {
        const oldFib = oldSnapshot[i];
        const newVNode = i < newVNodes.length ? newVNodes[i] : undefined;

        if (newVNode === undefined || newVNode === null || newVNode === false || newVNode === true) {
            // Remove old node
            if (oldFib) removeFiber(oldFib, parentNode);
            continue;
        }

        if (!oldFib) {
            // Append new node
            const fiber = mountVNode(newVNode, parentFiber, parentNode);
            if (fiber) newFibers.push(fiber);
            continue;
        }

        // Patch existing
        const patched = patchFiber(oldFib, newVNode, parentFiber, parentNode);
        if (patched) newFibers.push(patched);
    }

    parentFiber.children = newFibers;
}

// ─── Strategy 2: Keyed Diff ────────────────────────────────────────────────────

function keyedDiff(
    parentFiber: Fiber,
    parentNode: Node,
    oldFibers: Fiber[],
    newVNodes: (VNode | Child)[],
): void {
    // Build key → fiber map
    const oldKeyMap = new Map<string | number, Fiber>();
    const oldIndexMap = new Map<Fiber, number>();
    for (let i = 0; i < oldFibers.length; i++) {
        const f = oldFibers[i];
        if (f.key != null) oldKeyMap.set(f.key, f);
        oldIndexMap.set(f, i);
    }

    const newFibers: Fiber[] = [];
    const usedOldFibers = new Set<Fiber>();
    const sources: number[] = [];

    // First pass: match by key, patch reusable fibers
    for (let i = 0; i < newVNodes.length; i++) {
        const v = newVNodes[i];
        const key = (v && typeof v === 'object' && 'key' in v) ? v.key : null;

        let oldFib: Fiber | undefined;
        if (key != null) oldFib = oldKeyMap.get(key);

        if (oldFib && !usedOldFibers.has(oldFib)) {
            usedOldFibers.add(oldFib);
            const patched = patchFiber(oldFib, v!, parentFiber, parentNode);
            newFibers.push(patched!);
            sources.push(oldIndexMap.get(oldFib)!);
        } else {
            // Mount new — but don't append to DOM yet, we'll position in second pass
            const fiber = mountVNode(v!, parentFiber);
            if (fiber) {
                newFibers.push(fiber);
                sources.push(-1);
            }
        }
    }

    // Remove old fibers not reused
    for (const oldFib of oldFibers) {
        if (!usedOldFibers.has(oldFib)) {
            removeFiber(oldFib, parentNode);
        }
    }

    // Compute LIS to minimize moves
    const oldIndicesOnly = sources.filter(s => s !== -1);
    const lisIndices = longestIncreasingSubsequence(oldIndicesOnly);
    const lisValues = new Set(lisIndices.map(i => oldIndicesOnly[i]));

    // Second pass: position all nodes correctly (right to left)
    let anchor: Node | null = null;
    for (let i = newFibers.length - 1; i >= 0; i--) {
        const fiber = newFibers[i];
        const nodes = collectNodes(fiber);
        if (nodes.length === 0) continue;

        const needsMove = sources[i] === -1 || !lisValues.has(sources[i]);

        if (needsMove) {
            for (const node of nodes) {
                if (anchor) {
                    parentNode.insertBefore(node, anchor);
                } else {
                    parentNode.appendChild(node);
                }
            }
        }
        anchor = nodes[0];
    }

    parentFiber.children = newFibers;
}

/**
 * Longest Increasing Subsequence — O(n log n)
 * 
 * Returns indices of elements forming the LIS. Nodes at these positions
 * are already in correct relative order and don't need DOM moves.
 * 
 * Algorithm: Patience sorting + backtracking.
 */
function longestIncreasingSubsequence(arr: number[]): number[] {
    if (arr.length === 0) return [];

    const n = arr.length;
    const tails: number[] = [];
    const indices: number[] = [];
    const predecessors: number[] = new Array(n).fill(-1);

    for (let i = 0; i < n; i++) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (tails[mid] < arr[i]) lo = mid + 1;
            else hi = mid;
        }

        tails[lo] = arr[i];
        indices[lo] = i;
        if (lo > 0) predecessors[i] = indices[lo - 1];
    }

    const result: number[] = [];
    let k = indices[tails.length - 1];
    for (let i = tails.length - 1; i >= 0; i--) {
        result[i] = k;
        k = predecessors[k];
    }

    return result;
}

// ─── Strategy 3: Property Patching ─────────────────────────────────────────────

function patchProps(
    el: HTMLElement,
    oldProps: Props,
    newProps: Props,
    fiber: Fiber,
): void {
    // Remove old props not in new
    for (const key of Object.keys(oldProps)) {
        if (key === 'children' || key === 'key') continue;
        if (key in newProps) continue;

        if (key.startsWith('on') && typeof oldProps[key] === 'function') {
            const event = key.slice(2).toLowerCase();
            const oldListener = fiber.listeners.get(event);
            if (oldListener) {
                el.removeEventListener(event, oldListener);
                fiber.listeners.delete(event);
            }
        } else if (key === 'className' || key === 'class') {
            el.className = '';
        } else if (key === 'style') {
            el.removeAttribute('style');
        } else {
            el.removeAttribute(key);
        }
    }

    // Set new/changed props
    for (const [key, value] of Object.entries(newProps)) {
        if (key === 'children' || key === 'key') continue;
        if (oldProps[key] === value) continue;

        if (key === 'className' || key === 'class') {
            el.className = value || '';
        } else if (key === 'style' && typeof value === 'object') {
            el.removeAttribute('style');
            Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            const event = key.slice(2).toLowerCase();
            const oldListener = fiber.listeners.get(event);
            if (oldListener) el.removeEventListener(event, oldListener);
            el.addEventListener(event, value);
            fiber.listeners.set(event, value);
        } else if (key === 'ref' && typeof value === 'object' && 'current' in value) {
            value.current = el;
        } else if (key === 'dangerouslySetInnerHTML') {
            el.innerHTML = value.__html;
        } else if (typeof value === 'boolean') {
            if (value) el.setAttribute(key, '');
            else el.removeAttribute(key);
        } else if (value != null) {
            el.setAttribute(key, String(value));
        } else {
            el.removeAttribute(key);
        }
    }
}

// ─── Patch: Diff one fiber against a new VNode ─────────────────────────────────

function patchFiber(
    oldFiber: Fiber,
    newVNode: VNode | Child,
    parentFiber: Fiber,
    parentNode: Node,
): Fiber | null {
    if (newVNode === null || newVNode === undefined || newVNode === false || newVNode === true) {
        removeFiber(oldFiber, parentNode);
        return null;
    }

    // Text node
    if (typeof newVNode === 'string' || typeof newVNode === 'number') {
        if (oldFiber.node instanceof Text) {
            const text = String(newVNode);
            if (oldFiber.node.textContent !== text) {
                oldFiber.node.textContent = text;
            }
            oldFiber.vnode = newVNode;
            return oldFiber;
        }
        // Type changed — replace
        const anchor = getNextSibling(oldFiber, parentNode);
        removeFiber(oldFiber, parentNode);
        const newFiber = mountVNode(newVNode, parentFiber);
        if (newFiber?.node) {
            if (anchor) parentNode.insertBefore(newFiber.node, anchor);
            else parentNode.appendChild(newFiber.node);
        }
        return newFiber;
    }

    const oldVNode = oldFiber.vnode;
    if (!oldVNode || typeof oldVNode !== 'object' || !('type' in oldVNode)) {
        // Old was text/null, new is VNode — replace
        const anchor = getNextSibling(oldFiber, parentNode);
        removeFiber(oldFiber, parentNode);
        const newFiber = mountVNode(newVNode, parentFiber);
        if (newFiber) {
            const nodes = collectNodes(newFiber);
            for (const node of nodes) {
                if (anchor) parentNode.insertBefore(node, anchor);
                else parentNode.appendChild(node);
            }
        }
        return newFiber;
    }

    // Same type? Patch in-place!
    if (oldVNode.type === newVNode.type) {
        // Fragment
        if (newVNode.type === Fragment) {
            const fragChildren = normalizeChildren(newVNode.props.children);
            diffChildren(oldFiber, parentNode, oldFiber.children, fragChildren);
            oldFiber.vnode = newVNode;
            return oldFiber;
        }

        // Component — re-execute and diff result
        if (typeof newVNode.type === 'function') {
            const result = (newVNode.type as Component)(newVNode.props);
            const resultArr = result ? [result] : [];
            const componentParent = oldFiber.node || parentNode;
            diffChildren(oldFiber, componentParent, oldFiber.children, resultArr);
            oldFiber.vnode = newVNode;
            // Update component fiber's node reference to its first child's node
            if (oldFiber.children.length > 0 && oldFiber.children[0].node) {
                oldFiber.node = oldFiber.children[0].node;
            }
            return oldFiber;
        }

        // Same HTML element — patch props + diff children
        const el = oldFiber.node as HTMLElement;
        if (el && el instanceof HTMLElement) {
            patchProps(el, oldVNode.props, newVNode.props, oldFiber);
            const newChildVNodes = normalizeChildren(newVNode.props.children);
            diffChildren(oldFiber, el, oldFiber.children, newChildVNodes);
            oldFiber.vnode = newVNode;
            return oldFiber;
        }
    }

    // Different type — replace
    const anchor = getNextSibling(oldFiber, parentNode);
    removeFiber(oldFiber, parentNode);
    const newFiber = mountVNode(newVNode, parentFiber);
    if (newFiber) {
        const nodes = collectNodes(newFiber);
        for (const node of nodes) {
            if (anchor) parentNode.insertBefore(node, anchor);
            else parentNode.appendChild(node);
        }
    }
    return newFiber;
}

// ─── Mount: Create a fiber + DOM node from a VNode ─────────────────────────────
// `parentNode` is optional — if provided, the created node is appended there.

function mountVNode(
    vnode: VNode | Child,
    parentFiber: Fiber,
    parentNode?: Node,
): Fiber | null {
    if (vnode === null || vnode === undefined || vnode === false || vnode === true) {
        return null;
    }

    // Text
    if (typeof vnode === 'string' || typeof vnode === 'number') {
        const fiber = createFiber(vnode, parentFiber);
        fiber.node = document.createTextNode(String(vnode));
        if (parentNode) parentNode.appendChild(fiber.node);
        return fiber;
    }

    const { type, props } = vnode;

    // Fragment — no own DOM node, mount children directly
    if (type === Fragment) {
        const fiber = createFiber(vnode, parentFiber);
        const children = normalizeChildren(props.children);
        for (const child of children) {
            const childFiber = mountVNode(child, fiber, parentNode);
            if (childFiber) fiber.children.push(childFiber);
        }
        return fiber;
    }

    // Component — execute and mount result
    if (typeof type === 'function') {
        const fiber = createFiber(vnode, parentFiber);
        const result = (type as Component)(props);
        if (result) {
            const childFiber = mountVNode(result, fiber, parentNode);
            if (childFiber) {
                fiber.children.push(childFiber);
                fiber.node = childFiber.node;
            }
        }
        return fiber;
    }

    // HTML Element
    const el = document.createElement(type as string);
    const fiber = createFiber(vnode, parentFiber);
    fiber.node = el;

    applyProps(el, props, fiber);

    // Mount children into the element
    const children = normalizeChildren(props.children);
    for (const child of children) {
        const childFiber = mountVNode(child, fiber, el);
        if (childFiber) fiber.children.push(childFiber);
    }

    // Append to parent DOM node
    if (parentNode) parentNode.appendChild(el);

    return fiber;
}

// ─── Remove: Clean up a fiber and remove its DOM nodes ─────────────────────────
// Unlike unmountFiber, this does NOT modify parent.children — the caller manages that.

function removeFiber(fiber: Fiber, parentNode: Node): void {
    // Collect all DOM nodes this fiber owns
    const nodes = collectNodes(fiber);
    for (const node of nodes) {
        if (node.parentNode) node.parentNode.removeChild(node);
    }

    // Clean up listeners recursively
    cleanupFiber(fiber);
}

function cleanupFiber(fiber: Fiber): void {
    if (fiber.node instanceof HTMLElement) {
        for (const [event, listener] of fiber.listeners) {
            fiber.node.removeEventListener(event, listener);
        }
    }
    fiber.listeners.clear();
    for (const child of fiber.children) {
        cleanupFiber(child);
    }
    fiber.children = [];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function applyProps(el: HTMLElement, props: Props, fiber: Fiber): void {
    for (const [key, value] of Object.entries(props)) {
        if (key === 'children' || key === 'key') continue;

        if (key === 'className' || key === 'class') {
            el.className = value || '';
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, value);
            fiber.listeners.set(event, value);
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
}

function normalizeChildren(children: Child | Child[] | undefined): (VNode | Child)[] {
    if (children === undefined || children === null) return [];
    if (!Array.isArray(children)) return [children];
    return children.flat(Infinity) as (VNode | Child)[];
}

function flattenChildren(children: (VNode | Child)[]): (VNode | Child)[] {
    const result: (VNode | Child)[] = [];
    for (const child of children) {
        if (Array.isArray(child)) {
            result.push(...flattenChildren(child as (VNode | Child)[]));
        } else if (child !== null && child !== undefined && child !== false && child !== true) {
            result.push(child);
        }
    }
    return result;
}

/**
 * Get the next sibling DOM node after a fiber's nodes, for insertion positioning.
 */
function getNextSibling(fiber: Fiber, parentNode: Node): Node | null {
    const nodes = collectNodes(fiber);
    if (nodes.length === 0) return null;
    return nodes[nodes.length - 1].nextSibling;
}

// ─── Navigation ────────────────────────────────────────────────────────────────

export async function navigate(href: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const response = await fetch(href, { headers: { 'X-Melina-Nav': '1' } });
        const html = await response.text();
        const newDoc = new DOMParser().parseFromString(html, 'text/html');

        window.history.pushState({}, '', href);
        document.title = newDoc.title;

        const fragment = document.createDocumentFragment();
        while (newDoc.body.firstChild) fragment.appendChild(newDoc.body.firstChild);

        const update = () => {
            document.body.replaceChildren(fragment);
            window.scrollTo(0, 0);
        };

        if (document.startViewTransition) {
            // @ts-ignore
            await document.startViewTransition(update).finished;
        } else {
            update();
        }
    } catch (e) {
        window.location.href = href;
    }
}

export interface LinkProps extends Props { href: string; }
export function Link({ href, children, ...rest }: LinkProps): VNode {
    return createElement('a', {
        href,
        onClick: (e: MouseEvent) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            navigate(href);
        },
        ...rest
    }, ...(Array.isArray(children) ? children : [children]));
}

// ─── createElement ─────────────────────────────────────────────────────────────

export function createElement(
    type: string | Component<any> | typeof Fragment,
    props: Props | null,
    ...children: Child[]
): VNode {
    const normalizedProps: Props = { ...(props || {}) };
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

// JSX automatic transform
export function jsx(type: any, props: any, key?: any): VNode {
    return { type, props: props || {}, key: key ?? (props?.key ?? null) };
}
export const jsxs = jsx;
export const jsxDEV = jsx;

// ─── Auto-init for link interception ───────────────────────────────────────────

if (typeof window !== 'undefined') {
    document.addEventListener('click', (e) => {
        const link = (e.target as Element).closest('a[href]') as HTMLAnchorElement;
        if (!link || link.target || !link.href.startsWith(window.location.origin)) return;
        if (link.hasAttribute('data-no-intercept') || link.hasAttribute('download')) return;
        e.preventDefault();
        navigate(link.pathname);
    });

    window.addEventListener('popstate', () => {
        navigate(window.location.pathname);
    });
}
