/**
 * melina/client — Lightweight Client-Side Renderer
 * 
 * A zero-dependency VDOM runtime for client-side interactivity.
 * Optimized for Islands Architecture and State-Driven UI (e.g. XState).
 * 
 * Features:
 * - VNode: Lightweight virtual DOM node
 * - Render: Fast, simple replacement/mounting
 * - Link: Client-side navigation with View Transitions
 * - Zero Hooks: Use external state management (XState, Signals, etc.)
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

// =============================================================================
// HTML ATTRIBUTES (Simplified for brevity but covers most use cases)
// =============================================================================

type EventHandler<E = Event> = (event: E) => void;

interface HTMLAttributes {
    // Standard Attributes
    id?: string;
    className?: string;
    class?: string;
    style?: string | Record<string, string | number>;
    title?: string;
    lang?: string;
    dir?: string;
    tabIndex?: number;
    role?: string;
    hidden?: boolean;
    disabled?: boolean;
    draggable?: boolean;
    spellCheck?: boolean;
    contentEditable?: boolean | "true" | "false" | "inherit";

    // Accessibility
    'aria-label'?: string;
    'aria-hidden'?: boolean | "true" | "false";
    // ... (Add more ARIA as needed or use string index)

    // Event Handlers
    onClick?: EventHandler<MouseEvent>;
    onContextMenu?: EventHandler<MouseEvent>;
    onDoubleClick?: EventHandler<MouseEvent>;
    onDrag?: EventHandler<DragEvent>;
    onDragEnd?: EventHandler<DragEvent>;
    onDragEnter?: EventHandler<DragEvent>;
    onDragExit?: EventHandler<DragEvent>;
    onDragLeave?: EventHandler<DragEvent>;
    onDragOver?: EventHandler<DragEvent>;
    onDragStart?: EventHandler<DragEvent>;
    onDrop?: EventHandler<DragEvent>;
    onMouseDown?: EventHandler<MouseEvent>;
    onMouseEnter?: EventHandler<MouseEvent>;
    onMouseLeave?: EventHandler<MouseEvent>;
    onMouseMove?: EventHandler<MouseEvent>;
    onMouseOut?: EventHandler<MouseEvent>;
    onMouseOver?: EventHandler<MouseEvent>;
    onMouseUp?: EventHandler<MouseEvent>;

    onChange?: EventHandler<Event>;
    onInput?: EventHandler<Event>;
    onSubmit?: EventHandler<Event>;
    onInvalid?: EventHandler<Event>;
    onReset?: EventHandler<Event>;

    onKeyDown?: EventHandler<KeyboardEvent>;
    onKeyPress?: EventHandler<KeyboardEvent>;
    onKeyUp?: EventHandler<KeyboardEvent>;

    onFocus?: EventHandler<FocusEvent>;
    onBlur?: EventHandler<FocusEvent>;

    onScroll?: EventHandler<Event>;
    onWheel?: EventHandler<WheelEvent>;

    // Catch-all strict type safety is relaxed here for library simplicity
    [key: string]: any;
}

// Additional specific attributes for common elements
interface AnchorHTMLAttributes extends HTMLAttributes {
    href?: string;
    target?: string;
    download?: any;
    rel?: string;
}

interface InputHTMLAttributes extends HTMLAttributes {
    accept?: string;
    alt?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    capture?: boolean | string;
    checked?: boolean;
    crossOrigin?: string;
    disabled?: boolean;
    form?: string;
    formAction?: string;
    formEncType?: string;
    formMethod?: string;
    formNoValidate?: boolean;
    formTarget?: string;
    height?: number | string;
    list?: string;
    max?: number | string;
    maxLength?: number;
    min?: number | string;
    minLength?: number;
    multiple?: boolean;
    name?: string;
    pattern?: string;
    placeholder?: string;
    readOnly?: boolean;
    required?: boolean;
    size?: number;
    src?: string;
    step?: number | string;
    type?: string;
    value?: string | number | readonly string[];
    width?: number | string;
}

// JSX namespace for TypeScript
export namespace JSX {
    export type Element = VNode;
    export type ElementType = string | Component<any> | typeof Fragment;

    export interface ElementAttributesProperty { props: {}; }
    export interface ElementChildrenAttribute { children: {}; }

    export interface IntrinsicElements {
        // Standard elements
        a: AnchorHTMLAttributes;
        div: HTMLAttributes;
        span: HTMLAttributes;
        p: HTMLAttributes;
        h1: HTMLAttributes;
        h2: HTMLAttributes;
        h3: HTMLAttributes;
        h4: HTMLAttributes;
        h5: HTMLAttributes;
        h6: HTMLAttributes;
        button: HTMLAttributes;
        input: InputHTMLAttributes;
        label: HTMLAttributes;
        form: HTMLAttributes;
        img: HTMLAttributes & { src?: string; alt?: string; width?: string | number; height?: string | number };
        ul: HTMLAttributes;
        ol: HTMLAttributes;
        li: HTMLAttributes;
        table: HTMLAttributes;
        tr: HTMLAttributes;
        td: HTMLAttributes;
        th: HTMLAttributes;
        tbody: HTMLAttributes;
        thead: HTMLAttributes;
        textarea: HTMLAttributes & { value?: string; name?: string; placeholder?: string; rows?: number };
        select: HTMLAttributes & { value?: string | number | string[]; multiple?: boolean };
        option: HTMLAttributes & { value?: string | number; selected?: boolean };

        // Allow others
        [elem: string]: HTMLAttributes;
    }
}

// Internal fiber (Simplified)
interface Fiber {
    node: HTMLElement | Text | null;
    vnode: VNode | null;
    parent: Fiber | null;
    children: Fiber[];
}

// =============================================================================
// VNODE CREATION (JSX Runtime)
// =============================================================================

export const Fragment = Symbol('Fragment');

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

// Automatic JSX transform exports
export function jsx(type: any, props: any, key?: any): VNode {
    return { type, props: props || {}, key: key ?? (props?.key ?? null) };
}
export const jsxs = jsx;
export const jsxDEV = jsx;

// =============================================================================
// RENDERER & RECONCILER
// =============================================================================

/**
 * Render a VNode tree to a DOM node (Replaces content)
 */
export function render(vnode: VNode | null, container: HTMLElement): Fiber {
    const rootFiber: Fiber = {
        node: container,
        vnode: null,
        parent: null,
        children: [],
    };

    if (vnode) {
        reconcile(rootFiber, vnode);
    }

    return rootFiber;
}

function reconcile(parentFiber: Fiber, vnode: VNode | null): void {
    const container = parentFiber.node as HTMLElement;
    if (!container) return;

    // Simple replacement strategy: clear and append
    // (Optimization: In a real implementation, diffing against existing children would happen here)
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

function createNode(vnode: VNode | Child, parentFiber: Fiber): Node | null {
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
        const componentFiber: Fiber = {
            node: null,
            vnode,
            parent: parentFiber,
            children: [],
        };
        parentFiber.children.push(componentFiber);

        // Execute component (Pure function)
        const result = (type as Component)(props);

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

        if (key === 'className' || key === 'class') {
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

    const elFiber: Fiber = {
        node: el,
        vnode,
        parent: parentFiber,
        children: [],
    };
    parentFiber.children.push(elFiber);

    renderChildren(props.children, elFiber, el);
    return el;
}

function renderChildren(children: Child | Child[] | undefined, parentFiber: Fiber, container: Node): void {
    if (children === undefined || children === null) return;
    const childArray = Array.isArray(children) ? children : [children];
    for (const child of childArray) {
        if (Array.isArray(child)) {
            renderChildren(child, parentFiber, container);
        } else {
            const node = createNode(child, parentFiber);
            if (node) container.appendChild(node);
        }
    }
}

// =============================================================================
// SERVER-SIDE RENDERING
// =============================================================================

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderToString(vnode: VNode | Child): string {
    if (vnode === null || vnode === undefined || vnode === true || vnode === false) return '';
    if (typeof vnode === 'string') return escapeHtml(vnode);
    if (typeof vnode === 'number') return String(vnode);
    if (Array.isArray(vnode)) return vnode.map(child => renderToString(child)).join('');

    const { type, props } = vnode as VNode;

    if (type === Fragment) return renderChildrenToString(props.children);

    if (typeof type === 'function') {
        const result = (type as Component)(props);
        return renderToString(result);
    }

    const tagName = type as string;
    let html = `<${tagName}`;

    for (const [key, value] of Object.entries(props)) {
        if (key === 'children' || key === 'key' || key === 'ref' || key.startsWith('on')) continue;
        if (value === undefined || value === null || value === false) continue;

        if (key === 'className' || key === 'class') {
            html += ` class="${escapeHtml(String(value))}"`;
            continue;
        }

        if (key === 'style' && typeof value === 'object') {
            const styleStr = Object.entries(value)
                .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
                .join(';');
            html += ` style="${escapeHtml(styleStr)}"`;
            continue;
        }

        if (key === 'dangerouslySetInnerHTML') continue;

        if (value === true) {
            html += ` ${key}`;
        } else {
            html += ` ${key}="${escapeHtml(String(value))}"`;
        }
    }

    html += '>';

    // Void elements
    if (['meta', 'link', 'img', 'br', 'input', 'hr', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'].includes(tagName)) return html;

    if (props.dangerouslySetInnerHTML) {
        html += props.dangerouslySetInnerHTML.__html;
    } else {
        html += renderChildrenToString(props.children);
    }

    html += `</${tagName}>`;
    return html;
}

function renderChildrenToString(children: Child | Child[] | undefined): string {
    if (children === undefined || children === null) return '';
    if (Array.isArray(children)) return children.map(c => renderToString(c)).join('');
    return renderToString(children);
}

// =============================================================================
// NAVIGATION & INIT
// =============================================================================

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

// Auto-init for link interception
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

export { createElement as h };
export default { createElement, Fragment };
