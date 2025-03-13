/**
 * melina/client — Lightweight Client-Side Renderer
 * 
 * A zero-dependency alternative to React for client-side interactivity.
 * JSX compiles directly to real DOM elements — no virtual DOM diffing,
 * no hydration ceremony.
 * 
 * Key concepts:
 * - VNode: Lightweight virtual DOM node
 * - Hooks: React-compatible useState, useEffect, useRef, useMemo, useCallback
 * - Link: Navigation component with View Transitions support
 * - renderToString: SSR support for server components
 * 
 * Usage:
 * ```tsx
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

// =============================================================================
// JSX TYPE DEFINITIONS (for TypeScript JSX support)
// =============================================================================

type EventHandler<E = Event> = (event: E) => void;

interface HTMLAttributes {
    // Standard HTML attributes
    id?: string;
    className?: string;
    class?: string;
    style?: string | Record<string, string | number>;
    title?: string;
    tabIndex?: number;
    role?: string;
    hidden?: boolean;
    dir?: 'ltr' | 'rtl' | 'auto';
    lang?: string;
    draggable?: boolean | 'true' | 'false';
    contentEditable?: boolean | 'true' | 'false' | 'inherit';
    spellCheck?: boolean | 'true' | 'false';

    // ARIA attributes
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
    'aria-expanded'?: boolean | 'true' | 'false';
    'aria-selected'?: boolean | 'true' | 'false';
    'aria-checked'?: boolean | 'true' | 'false' | 'mixed';
    'aria-disabled'?: boolean | 'true' | 'false';
    'aria-live'?: 'off' | 'assertive' | 'polite';
    'aria-busy'?: boolean | 'true' | 'false';
    'aria-current'?: boolean | 'true' | 'false' | 'page' | 'step' | 'location' | 'date' | 'time';

    // Data attributes
    [key: `data-${string}`]: string | number | boolean | undefined;

    // Event handlers
    onClick?: EventHandler<MouseEvent>;
    onDoubleClick?: EventHandler<MouseEvent>;
    onMouseDown?: EventHandler<MouseEvent>;
    onMouseUp?: EventHandler<MouseEvent>;
    onMouseEnter?: EventHandler<MouseEvent>;
    onMouseLeave?: EventHandler<MouseEvent>;
    onMouseMove?: EventHandler<MouseEvent>;
    onMouseOver?: EventHandler<MouseEvent>;
    onMouseOut?: EventHandler<MouseEvent>;
    onContextMenu?: EventHandler<MouseEvent>;

    onKeyDown?: EventHandler<KeyboardEvent>;
    onKeyUp?: EventHandler<KeyboardEvent>;
    onKeyPress?: EventHandler<KeyboardEvent>;

    onFocus?: EventHandler<FocusEvent>;
    onBlur?: EventHandler<FocusEvent>;

    onChange?: EventHandler<Event>;
    onInput?: EventHandler<Event>;
    onSubmit?: EventHandler<Event>;
    onReset?: EventHandler<Event>;

    onScroll?: EventHandler<Event>;
    onWheel?: EventHandler<WheelEvent>;

    onDrag?: EventHandler<DragEvent>;
    onDragEnd?: EventHandler<DragEvent>;
    onDragEnter?: EventHandler<DragEvent>;
    onDragLeave?: EventHandler<DragEvent>;
    onDragOver?: EventHandler<DragEvent>;
    onDragStart?: EventHandler<DragEvent>;
    onDrop?: EventHandler<DragEvent>;

    onLoad?: EventHandler<Event>;
    onError?: EventHandler<Event>;

    onTouchStart?: EventHandler<TouchEvent>;
    onTouchMove?: EventHandler<TouchEvent>;
    onTouchEnd?: EventHandler<TouchEvent>;
    onTouchCancel?: EventHandler<TouchEvent>;

    onPointerDown?: EventHandler<PointerEvent>;
    onPointerUp?: EventHandler<PointerEvent>;
    onPointerMove?: EventHandler<PointerEvent>;
    onPointerEnter?: EventHandler<PointerEvent>;
    onPointerLeave?: EventHandler<PointerEvent>;
    onPointerCancel?: EventHandler<PointerEvent>;

    onAnimationStart?: EventHandler<AnimationEvent>;
    onAnimationEnd?: EventHandler<AnimationEvent>;
    onAnimationIteration?: EventHandler<AnimationEvent>;

    onTransitionEnd?: EventHandler<TransitionEvent>;

    // Ref
    ref?: { current: HTMLElement | null };

    // Key
    key?: string | number;

    // Children
    children?: Child | Child[];

    // dangerouslySetInnerHTML
    dangerouslySetInnerHTML?: { __html: string };
}

interface AnchorHTMLAttributes extends HTMLAttributes {
    href?: string;
    target?: '_self' | '_blank' | '_parent' | '_top';
    rel?: string;
    download?: boolean | string;
    hrefLang?: string;
    type?: string;
}

interface ButtonHTMLAttributes extends HTMLAttributes {
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    form?: string;
    formAction?: string;
    formEncType?: string;
    formMethod?: string;
    formNoValidate?: boolean;
    formTarget?: string;
    name?: string;
    value?: string | number;
}

interface FormHTMLAttributes extends HTMLAttributes {
    action?: string;
    encType?: string;
    method?: 'get' | 'post' | 'dialog';
    name?: string;
    noValidate?: boolean;
    target?: string;
    autoComplete?: string;
}

interface InputHTMLAttributes extends HTMLAttributes {
    accept?: string;
    alt?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    capture?: boolean | 'user' | 'environment';
    checked?: boolean;
    defaultChecked?: boolean;
    defaultValue?: string | number;
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
    type?: 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week';
    value?: string | number;
    width?: number | string;
}

interface TextareaHTMLAttributes extends HTMLAttributes {
    autoComplete?: string;
    autoFocus?: boolean;
    cols?: number;
    defaultValue?: string;
    disabled?: boolean;
    form?: string;
    maxLength?: number;
    minLength?: number;
    name?: string;
    placeholder?: string;
    readOnly?: boolean;
    required?: boolean;
    rows?: number;
    value?: string;
    wrap?: 'hard' | 'soft' | 'off';
}

interface SelectHTMLAttributes extends HTMLAttributes {
    autoComplete?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    form?: string;
    multiple?: boolean;
    name?: string;
    required?: boolean;
    size?: number;
    value?: string | number | string[];
    defaultValue?: string | number | string[];
}

interface OptionHTMLAttributes extends HTMLAttributes {
    disabled?: boolean;
    label?: string;
    selected?: boolean;
    value?: string | number;
}

interface ImgHTMLAttributes extends HTMLAttributes {
    alt?: string;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    decoding?: 'async' | 'auto' | 'sync';
    height?: number | string;
    loading?: 'eager' | 'lazy';
    referrerPolicy?: string;
    sizes?: string;
    src?: string;
    srcSet?: string;
    useMap?: string;
    width?: number | string;
}

interface LabelHTMLAttributes extends HTMLAttributes {
    htmlFor?: string;
    form?: string;
}

interface TableHTMLAttributes extends HTMLAttributes {
    cellPadding?: number | string;
    cellSpacing?: number | string;
    summary?: string;
}

interface TdHTMLAttributes extends HTMLAttributes {
    colSpan?: number;
    headers?: string;
    rowSpan?: number;
    scope?: 'col' | 'colgroup' | 'row' | 'rowgroup';
}

interface ThHTMLAttributes extends HTMLAttributes {
    colSpan?: number;
    headers?: string;
    rowSpan?: number;
    scope?: 'col' | 'colgroup' | 'row' | 'rowgroup';
    abbr?: string;
}

interface IframeHTMLAttributes extends HTMLAttributes {
    allow?: string;
    allowFullScreen?: boolean;
    height?: number | string;
    loading?: 'eager' | 'lazy';
    name?: string;
    referrerPolicy?: string;
    sandbox?: string;
    src?: string;
    srcDoc?: string;
    width?: number | string;
}

interface VideoHTMLAttributes extends HTMLAttributes {
    autoPlay?: boolean;
    controls?: boolean;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    height?: number | string;
    loop?: boolean;
    muted?: boolean;
    playsInline?: boolean;
    poster?: string;
    preload?: 'auto' | 'metadata' | 'none';
    src?: string;
    width?: number | string;
}

interface AudioHTMLAttributes extends HTMLAttributes {
    autoPlay?: boolean;
    controls?: boolean;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    loop?: boolean;
    muted?: boolean;
    preload?: 'auto' | 'metadata' | 'none';
    src?: string;
}

interface CanvasHTMLAttributes extends HTMLAttributes {
    height?: number | string;
    width?: number | string;
}

interface MetaHTMLAttributes extends HTMLAttributes {
    charSet?: string;
    content?: string;
    httpEquiv?: string;
    name?: string;
}

interface LinkHTMLAttributes extends HTMLAttributes {
    as?: string;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    href?: string;
    hrefLang?: string;
    integrity?: string;
    media?: string;
    referrerPolicy?: string;
    rel?: string;
    sizes?: string;
    type?: string;
}

interface ScriptHTMLAttributes extends HTMLAttributes {
    async?: boolean;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    defer?: boolean;
    integrity?: string;
    noModule?: boolean;
    referrerPolicy?: string;
    src?: string;
    type?: string;
}

interface StyleHTMLAttributes extends HTMLAttributes {
    media?: string;
    scoped?: boolean;
    type?: string;
}

interface SVGAttributes extends HTMLAttributes {
    viewBox?: string;
    xmlns?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    d?: string;
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    x?: number | string;
    y?: number | string;
    x1?: number | string;
    x2?: number | string;
    y1?: number | string;
    y2?: number | string;
    width?: number | string;
    height?: number | string;
    transform?: string;
    opacity?: number | string;
    clipPath?: string;
    points?: string;
    rx?: number | string;
    ry?: number | string;
}

// JSX namespace for TypeScript
export namespace JSX {
    export type Element = VNode;
    export type ElementType = string | Component<any> | typeof Fragment;

    export interface ElementAttributesProperty { props: {}; }
    export interface ElementChildrenAttribute { children: {}; }

    export interface IntrinsicElements {
        // Document metadata
        html: HTMLAttributes;
        head: HTMLAttributes;
        title: HTMLAttributes;
        base: HTMLAttributes;
        link: LinkHTMLAttributes;
        meta: MetaHTMLAttributes;
        style: StyleHTMLAttributes;

        // Sectioning root
        body: HTMLAttributes;

        // Content sectioning
        address: HTMLAttributes;
        article: HTMLAttributes;
        aside: HTMLAttributes;
        footer: HTMLAttributes;
        header: HTMLAttributes;
        h1: HTMLAttributes;
        h2: HTMLAttributes;
        h3: HTMLAttributes;
        h4: HTMLAttributes;
        h5: HTMLAttributes;
        h6: HTMLAttributes;
        hgroup: HTMLAttributes;
        main: HTMLAttributes;
        nav: HTMLAttributes;
        section: HTMLAttributes;
        search: HTMLAttributes;

        // Text content
        blockquote: HTMLAttributes;
        dd: HTMLAttributes;
        div: HTMLAttributes;
        dl: HTMLAttributes;
        dt: HTMLAttributes;
        figcaption: HTMLAttributes;
        figure: HTMLAttributes;
        hr: HTMLAttributes;
        li: HTMLAttributes;
        menu: HTMLAttributes;
        ol: HTMLAttributes;
        p: HTMLAttributes;
        pre: HTMLAttributes;
        ul: HTMLAttributes;

        // Inline text semantics
        a: AnchorHTMLAttributes;
        abbr: HTMLAttributes;
        b: HTMLAttributes;
        bdi: HTMLAttributes;
        bdo: HTMLAttributes;
        br: HTMLAttributes;
        cite: HTMLAttributes;
        code: HTMLAttributes;
        data: HTMLAttributes;
        dfn: HTMLAttributes;
        em: HTMLAttributes;
        i: HTMLAttributes;
        kbd: HTMLAttributes;
        mark: HTMLAttributes;
        q: HTMLAttributes;
        rp: HTMLAttributes;
        rt: HTMLAttributes;
        ruby: HTMLAttributes;
        s: HTMLAttributes;
        samp: HTMLAttributes;
        small: HTMLAttributes;
        span: HTMLAttributes;
        strong: HTMLAttributes;
        sub: HTMLAttributes;
        sup: HTMLAttributes;
        time: HTMLAttributes;
        u: HTMLAttributes;
        var: HTMLAttributes;
        wbr: HTMLAttributes;

        // Image and multimedia
        area: HTMLAttributes;
        audio: AudioHTMLAttributes;
        img: ImgHTMLAttributes;
        map: HTMLAttributes;
        track: HTMLAttributes;
        video: VideoHTMLAttributes;

        // Embedded content
        embed: HTMLAttributes;
        iframe: IframeHTMLAttributes;
        object: HTMLAttributes;
        param: HTMLAttributes;
        picture: HTMLAttributes;
        portal: HTMLAttributes;
        source: HTMLAttributes;

        // SVG and MathML
        svg: SVGAttributes;
        math: HTMLAttributes;
        path: SVGAttributes;
        circle: SVGAttributes;
        rect: SVGAttributes;
        line: SVGAttributes;
        polyline: SVGAttributes;
        polygon: SVGAttributes;
        ellipse: SVGAttributes;
        g: SVGAttributes;
        defs: SVGAttributes;
        use: SVGAttributes;
        text: SVGAttributes;
        tspan: SVGAttributes;
        clipPath: SVGAttributes;
        mask: SVGAttributes;
        linearGradient: SVGAttributes;
        radialGradient: SVGAttributes;
        stop: SVGAttributes;

        // Scripting
        canvas: CanvasHTMLAttributes;
        noscript: HTMLAttributes;
        script: ScriptHTMLAttributes;

        // Demarcating edits
        del: HTMLAttributes;
        ins: HTMLAttributes;

        // Table content
        caption: HTMLAttributes;
        col: HTMLAttributes;
        colgroup: HTMLAttributes;
        table: TableHTMLAttributes;
        tbody: HTMLAttributes;
        td: TdHTMLAttributes;
        tfoot: HTMLAttributes;
        th: ThHTMLAttributes;
        thead: HTMLAttributes;
        tr: HTMLAttributes;

        // Forms
        button: ButtonHTMLAttributes;
        datalist: HTMLAttributes;
        fieldset: HTMLAttributes;
        form: FormHTMLAttributes;
        input: InputHTMLAttributes;
        label: LabelHTMLAttributes;
        legend: HTMLAttributes;
        meter: HTMLAttributes;
        optgroup: HTMLAttributes;
        option: OptionHTMLAttributes;
        output: HTMLAttributes;
        progress: HTMLAttributes;
        select: SelectHTMLAttributes;
        textarea: TextareaHTMLAttributes;

        // Interactive elements
        details: HTMLAttributes;
        dialog: HTMLAttributes;
        summary: HTMLAttributes;

        // Web Components
        slot: HTMLAttributes;
        template: HTMLAttributes;
    }
}

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
// These have different signatures than createElement!
// jsx/jsxs: (type, props, key?) - children are in props.children
// jsxDEV: (type, props, key, isStaticChildren, source, self) - 6 args

export function jsx(
    type: string | Component<any> | typeof Fragment,
    props: Props | null,
    key?: string | number | null
): VNode {
    return {
        type,
        props: props || {},
        key: key ?? (props?.key ?? null),
    };
}

export function jsxs(
    type: string | Component<any> | typeof Fragment,
    props: Props | null,
    key?: string | number | null
): VNode {
    return {
        type,
        props: props || {},
        key: key ?? (props?.key ?? null),
    };
}

export function jsxDEV(
    type: string | Component<any> | typeof Fragment,
    props: Props | null,
    key?: string | number | null,
    _isStaticChildren?: boolean,
    _source?: any,
    _self?: any
): VNode {
    return {
        type,
        props: props || {},
        key: key ?? (props?.key ?? null),
    };
}


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
    // Capture the fiber at hook creation time (during render)
    const fiber = currentFiber!;

    const hook = getHook(() => {
        const value = typeof initial === 'function' ? (initial as () => T)() : initial;
        return { type: 'state' as const, value, setter: null as any };
    });

    // Create setter that triggers re-render using captured fiber
    if (!hook.setter) {
        hook.setter = (newValue: T | ((prev: T) => T)) => {
            const next = typeof newValue === 'function'
                ? (newValue as (prev: T) => T)(hook.value)
                : newValue;

            if (next !== hook.value) {
                hook.value = next;
                // Use captured fiber, not currentFiber (which is null outside render)
                scheduleUpdate(fiber);
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
    // Schedule microtask re-render
    queueMicrotask(() => {
        if (fiber.vnode && typeof fiber.vnode.type === 'function') {
            // This is a component fiber - re-render it properly
            const prevFiber = currentFiber;
            currentFiber = fiber;
            fiber.hookIndex = 0;  // Reset hook index for re-render

            // Re-run the component function (hooks will reuse stored state)
            const result = (fiber.vnode.type as any)(fiber.vnode.props);

            currentFiber = prevFiber;

            // Update the DOM with new result
            if (fiber.node && fiber.node.parentNode) {
                const container = fiber.node.parentNode as HTMLElement;

                // Create new DOM from result
                const newFiber: Fiber = {
                    node: null,
                    vnode: result,
                    hooks: [],
                    hookIndex: 0,
                    parent: fiber.parent,
                    children: [],
                    cleanup: [],
                };

                const newNode = createNode(result, newFiber);
                if (newNode) {
                    container.replaceChild(newNode, fiber.node);
                    fiber.node = newNode as HTMLElement;
                }
            }

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
// SERVER-SIDE RENDERING
// =============================================================================

// Void elements that don't have closing tags
const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Map of React-style prop names to HTML attribute names
const PROP_TO_ATTR: Record<string, string> = {
    className: 'class',
    htmlFor: 'for',
    tabIndex: 'tabindex',
    readOnly: 'readonly',
    maxLength: 'maxlength',
    cellPadding: 'cellpadding',
    cellSpacing: 'cellspacing',
    colSpan: 'colspan',
    rowSpan: 'rowspan',
    srcSet: 'srcset',
    useMap: 'usemap',
    frameBorder: 'frameborder',
    contentEditable: 'contenteditable',
    crossOrigin: 'crossorigin',
    dateTime: 'datetime',
    encType: 'enctype',
    formAction: 'formaction',
    formEncType: 'formenctype',
    formMethod: 'formmethod',
    formNoValidate: 'formnovalidate',
    formTarget: 'formtarget',
    hrefLang: 'hreflang',
    inputMode: 'inputmode',
    noValidate: 'novalidate',
    playsInline: 'playsinline',
    autoComplete: 'autocomplete',
    autoFocus: 'autofocus',
    autoPlay: 'autoplay',
};

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Convert a VNode tree to an HTML string (Server-Side Rendering)
 * This is melina/client's equivalent to react-dom/server.renderToString()
 */
export function renderToString(vnode: VNode | Child): string {
    // Handle null, undefined, booleans
    if (vnode === null || vnode === undefined || vnode === true || vnode === false) {
        return '';
    }

    // Handle primitives (strings, numbers)
    if (typeof vnode === 'string') {
        return escapeHtml(vnode);
    }
    if (typeof vnode === 'number') {
        return String(vnode);
    }

    // Handle arrays
    if (Array.isArray(vnode)) {
        return vnode.map(child => renderToString(child)).join('');
    }

    const { type, props } = vnode as VNode;

    // Handle Fragment
    if (type === Fragment) {
        return renderChildrenToString(props.children);
    }

    // Handle function components
    if (typeof type === 'function') {
        // For SSR, we just call the component function
        // Hooks will work because we set up currentFiber context
        const fiber: Fiber = {
            node: null,
            vnode: vnode as VNode,
            hooks: [],
            hookIndex: 0,
            parent: null,
            children: [],
            cleanup: [],
        };

        const prevFiber = currentFiber;
        currentFiber = fiber;
        fiber.hookIndex = 0;

        try {
            const result = (type as Component)(props);
            currentFiber = prevFiber;
            return renderToString(result);
        } catch (e) {
            currentFiber = prevFiber;
            throw e;
        }
    }

    // Handle HTML elements
    const tagName = type as string;
    let html = `<${tagName}`;

    // Render attributes
    for (const [key, value] of Object.entries(props)) {
        if (key === 'children' || key === 'key' || key === 'ref') continue;
        if (value === undefined || value === null || value === false) continue;

        // Handle dangerouslySetInnerHTML
        if (key === 'dangerouslySetInnerHTML') continue;

        // Handle style object
        if (key === 'style' && typeof value === 'object') {
            const styleStr = Object.entries(value)
                .map(([k, v]) => {
                    // Convert camelCase to kebab-case
                    const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase();
                    return `${prop}:${v}`;
                })
                .join(';');
            html += ` style="${escapeHtml(styleStr)}"`;
            continue;
        }

        // Skip event handlers on server
        if (key.startsWith('on') && typeof value === 'function') continue;

        // Convert prop name to attribute name
        const attrName = PROP_TO_ATTR[key] || key.toLowerCase();

        // Boolean attributes
        if (value === true) {
            html += ` ${attrName}`;
        } else {
            html += ` ${attrName}="${escapeHtml(String(value))}"`;
        }
    }

    html += '>';

    // Void elements don't have children or closing tags
    if (VOID_ELEMENTS.has(tagName)) {
        return html;
    }

    // Handle dangerouslySetInnerHTML
    if (props.dangerouslySetInnerHTML) {
        html += props.dangerouslySetInnerHTML.__html;
    } else {
        // Render children
        html += renderChildrenToString(props.children);
    }

    html += `</${tagName}>`;
    return html;
}

/**
 * Render children to string
 */
function renderChildrenToString(children: Child | Child[] | undefined): string {
    if (children === undefined || children === null) return '';

    if (Array.isArray(children)) {
        return children.map(child => renderToString(child)).join('');
    }

    return renderToString(children);
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

    // Fetch new page
    let newDoc: Document;
    try {
        const response = await fetch(href, { headers: { 'X-Melina-Nav': '1' } });
        const html = await response.text();
        newDoc = new DOMParser().parseFromString(html, 'text/html');
    } catch (error) {
        window.location.href = href;
        return;
    }

    // Update URL
    window.history.pushState({}, '', href);

    // DOM update function - optimized with DocumentFragment for minimal reflow
    const performUpdate = () => {
        window.dispatchEvent(new CustomEvent('melina:navigation-start', {
            detail: { from: fromPath, to: toPath }
        }));

        document.title = newDoc.title;

        // Build new body off-screen using DocumentFragment
        const fragment = document.createDocumentFragment();
        while (newDoc.body.firstChild) {
            fragment.appendChild(newDoc.body.firstChild);
        }

        // Single reflow: swap prepared fragment
        document.body.replaceChildren(fragment);
        window.scrollTo(0, 0);
    };

    // Use View Transitions if available
    if (document.startViewTransition) {
        const transition = document.startViewTransition(performUpdate);
        await transition.finished;
    } else {
        performUpdate();
    }
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
 * Link component - handles client-side navigation with View Transitions
 */
export function Link(props: LinkProps): VNode {
    const { href, children, ...rest } = props;

    const handleClick = (e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
    };

    const childArray = Array.isArray(children) ? children : (children !== undefined ? [children] : []);
    return createElement('a', { href, onClick: handleClick, ...rest }, ...childArray);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

const isServer = typeof window === 'undefined';

/**
 * Initialize the Melina client runtime
 */
export async function init(): Promise<void> {
    if (isServer) return;

    // Intercept link clicks for SPA navigation
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

            const fragment = document.createDocumentFragment();
            while (newDoc.body.firstChild) {
                fragment.appendChild(newDoc.body.firstChild);
            }

            document.body.replaceChildren(fragment);
        };

        if (document.startViewTransition) {
            await document.startViewTransition(performUpdate).finished;
        } else {
            await performUpdate();
        }
    });
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
};

// Default export for JSX pragma
export default {
    createElement,
    Fragment,
};
