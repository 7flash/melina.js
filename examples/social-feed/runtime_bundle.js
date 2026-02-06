// ../../src/client.ts
var currentFiber = null;
var pendingEffects = [];
var islandRegistry = new Map;
var componentCache = new Map;
var Fragment = Symbol("Fragment");
function createElement(type, props, ...children) {
  const normalizedProps = { ...props || {} };
  if (children.length === 1) {
    normalizedProps.children = children[0];
  } else if (children.length > 1) {
    normalizedProps.children = children;
  }
  return {
    type,
    props: normalizedProps,
    key: normalizedProps.key ?? null
  };
}
function jsx(type, props, key) {
  return {
    type,
    props: props || {},
    key: key ?? (props?.key ?? null)
  };
}
function jsxs(type, props, key) {
  return {
    type,
    props: props || {},
    key: key ?? (props?.key ?? null)
  };
}
function jsxDEV(type, props, key, _isStaticChildren, _source, _self) {
  return {
    type,
    props: props || {},
    key: key ?? (props?.key ?? null)
  };
}
function getHook(initializer) {
  if (!currentFiber) {
    throw new Error("Hooks can only be called inside a component");
  }
  const fiber = currentFiber;
  const idx = fiber.hookIndex++;
  if (fiber.hooks[idx] === undefined) {
    fiber.hooks[idx] = initializer();
  }
  return fiber.hooks[idx];
}
function useState(initial) {
  const fiber = currentFiber;
  const hook = getHook(() => {
    const value = typeof initial === "function" ? initial() : initial;
    return { type: "state", value, setter: null };
  });
  if (!hook.setter) {
    hook.setter = (newValue) => {
      const next = typeof newValue === "function" ? newValue(hook.value) : newValue;
      if (next !== hook.value) {
        hook.value = next;
        scheduleUpdate(fiber);
      }
    };
  }
  return [hook.value, hook.setter];
}
function useEffect(effect, deps) {
  const hook = getHook(() => ({ type: "effect", deps: undefined, cleanup: undefined }));
  const changed = !hook.deps || !deps || deps.some((d, i) => d !== hook.deps[i]);
  if (changed) {
    pendingEffects.push(() => {
      if (hook.cleanup)
        hook.cleanup();
      const result = effect();
      hook.cleanup = typeof result === "function" ? result : undefined;
    });
    hook.deps = deps;
  }
}
function useRef(initial) {
  return getHook(() => ({ type: "ref", current: initial }));
}
function useMemo(factory, deps) {
  const hook = getHook(() => ({ type: "memo", value: factory(), deps }));
  const changed = !hook.deps || deps.some((d, i) => d !== hook.deps[i]);
  if (changed) {
    hook.value = factory();
    hook.deps = deps;
  }
  return hook.value;
}
function useCallback(fn, deps) {
  return useMemo(() => fn, deps);
}
function scheduleUpdate(fiber) {
  queueMicrotask(() => {
    if (fiber.vnode && typeof fiber.vnode.type === "function") {
      const prevFiber = currentFiber;
      currentFiber = fiber;
      fiber.hookIndex = 0;
      const result = fiber.vnode.type(fiber.vnode.props);
      currentFiber = prevFiber;
      if (fiber.node && fiber.node.parentNode) {
        const container = fiber.node.parentNode;
        const newFiber = {
          node: null,
          vnode: result,
          hooks: [],
          hookIndex: 0,
          parent: fiber.parent,
          children: [],
          cleanup: []
        };
        const newNode = createNode(result, newFiber);
        if (newNode) {
          container.replaceChild(newNode, fiber.node);
          fiber.node = newNode;
        }
      }
      runEffects();
    }
  });
}
function runEffects() {
  const effects = pendingEffects;
  pendingEffects = [];
  effects.forEach((fn) => fn());
}
function render(vnode, container) {
  const rootFiber = {
    node: container,
    vnode: null,
    hooks: [],
    hookIndex: 0,
    parent: null,
    children: [],
    cleanup: []
  };
  if (vnode) {
    reconcile(rootFiber, vnode);
  }
  runEffects();
  return rootFiber;
}
function reconcile(parentFiber, vnode) {
  const container = parentFiber.node;
  if (!container)
    return;
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
function createNode(vnode, parentFiber) {
  if (vnode === null || vnode === undefined || vnode === false || vnode === true) {
    return null;
  }
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
  }
  const { type, props } = vnode;
  if (type === Fragment) {
    const fragment = document.createDocumentFragment();
    renderChildren(props.children, parentFiber, fragment);
    return fragment;
  }
  if (typeof type === "function") {
    const componentFiber = {
      node: null,
      vnode,
      hooks: [],
      hookIndex: 0,
      parent: parentFiber,
      children: [],
      cleanup: []
    };
    parentFiber.children.push(componentFiber);
    const prevFiber = currentFiber;
    currentFiber = componentFiber;
    componentFiber.hookIndex = 0;
    const result = type(props);
    currentFiber = prevFiber;
    if (result) {
      const node = createNode(result, componentFiber);
      componentFiber.node = node;
      return node;
    }
    return null;
  }
  const el = document.createElement(type);
  for (const [key, value] of Object.entries(props)) {
    if (key === "children" || key === "key")
      continue;
    if (key === "className") {
      el.className = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
    } else if (key === "ref" && typeof value === "object" && "current" in value) {
      value.current = el;
    } else if (key === "dangerouslySetInnerHTML") {
      el.innerHTML = value.__html;
    } else if (typeof value === "boolean") {
      if (value)
        el.setAttribute(key, "");
    } else if (value != null) {
      el.setAttribute(key, String(value));
    }
  }
  const elFiber = {
    node: el,
    vnode,
    hooks: [],
    hookIndex: 0,
    parent: parentFiber,
    children: [],
    cleanup: []
  };
  parentFiber.children.push(elFiber);
  renderChildren(props.children, elFiber, el);
  return el;
}
function renderChildren(children, parentFiber, container) {
  if (children === undefined || children === null)
    return;
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (Array.isArray(child)) {
      renderChildren(child, parentFiber, container);
    } else {
      const node = createNode(child, parentFiber);
      if (node)
        container.appendChild(node);
    }
  }
}
var VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var PROP_TO_ATTR = {
  className: "class",
  htmlFor: "for",
  tabIndex: "tabindex",
  readOnly: "readonly",
  maxLength: "maxlength",
  cellPadding: "cellpadding",
  cellSpacing: "cellspacing",
  colSpan: "colspan",
  rowSpan: "rowspan",
  srcSet: "srcset",
  useMap: "usemap",
  frameBorder: "frameborder",
  contentEditable: "contenteditable",
  crossOrigin: "crossorigin",
  dateTime: "datetime",
  encType: "enctype",
  formAction: "formaction",
  formEncType: "formenctype",
  formMethod: "formmethod",
  formNoValidate: "formnovalidate",
  formTarget: "formtarget",
  hrefLang: "hreflang",
  inputMode: "inputmode",
  noValidate: "novalidate",
  playsInline: "playsinline",
  autoComplete: "autocomplete",
  autoFocus: "autofocus",
  autoPlay: "autoplay"
};
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderToString(vnode) {
  if (vnode === null || vnode === undefined || vnode === true || vnode === false) {
    return "";
  }
  if (typeof vnode === "string") {
    return escapeHtml(vnode);
  }
  if (typeof vnode === "number") {
    return String(vnode);
  }
  if (Array.isArray(vnode)) {
    return vnode.map((child) => renderToString(child)).join("");
  }
  const { type, props } = vnode;
  if (type === Fragment) {
    return renderChildrenToString(props.children);
  }
  if (typeof type === "function") {
    const fiber = {
      node: null,
      vnode,
      hooks: [],
      hookIndex: 0,
      parent: null,
      children: [],
      cleanup: []
    };
    const prevFiber = currentFiber;
    currentFiber = fiber;
    fiber.hookIndex = 0;
    try {
      const result = type(props);
      currentFiber = prevFiber;
      return renderToString(result);
    } catch (e) {
      currentFiber = prevFiber;
      throw e;
    }
  }
  const tagName = type;
  let html = `<${tagName}`;
  for (const [key, value] of Object.entries(props)) {
    if (key === "children" || key === "key" || key === "ref")
      continue;
    if (value === undefined || value === null || value === false)
      continue;
    if (key === "dangerouslySetInnerHTML")
      continue;
    if (key === "style" && typeof value === "object") {
      const styleStr = Object.entries(value).map(([k, v]) => {
        const prop = k.replace(/([A-Z])/g, "-$1").toLowerCase();
        return `${prop}:${v}`;
      }).join(";");
      html += ` style="${escapeHtml(styleStr)}"`;
      continue;
    }
    if (key.startsWith("on") && typeof value === "function")
      continue;
    const attrName = PROP_TO_ATTR[key] || key.toLowerCase();
    if (value === true) {
      html += ` ${attrName}`;
    } else {
      html += ` ${attrName}="${escapeHtml(String(value))}"`;
    }
  }
  html += ">";
  if (VOID_ELEMENTS.has(tagName)) {
    return html;
  }
  if (props.dangerouslySetInnerHTML) {
    html += props.dangerouslySetInnerHTML.__html;
  } else {
    html += renderChildrenToString(props.children);
  }
  html += `</${tagName}>`;
  return html;
}
function renderChildrenToString(children) {
  if (children === undefined || children === null)
    return "";
  if (Array.isArray(children)) {
    return children.map((child) => renderToString(child)).join("");
  }
  return renderToString(children);
}
var hangarRoot = null;
var holdingPen = null;
function initHangar() {
  if (hangarRoot)
    return;
  hangarRoot = document.createElement("div");
  hangarRoot.id = "melina-hangar";
  hangarRoot.style.display = "contents";
  document.documentElement.appendChild(hangarRoot);
  holdingPen = document.createElement("div");
  holdingPen.id = "melina-holding-pen";
  holdingPen.style.display = "none";
  hangarRoot.appendChild(holdingPen);
  console.log("[Melina Client] Hangar initialized");
}
function getIslandMeta() {
  const metaEl = document.getElementById("__MELINA_META__");
  if (!metaEl)
    return {};
  try {
    return JSON.parse(metaEl.textContent || "{}");
  } catch {
    return {};
  }
}
async function loadComponent(name) {
  if (componentCache.has(name))
    return componentCache.get(name);
  const meta = getIslandMeta();
  const url = meta[name];
  if (!url)
    return null;
  try {
    const module = await import(url);
    const Component = module[name] || module.default;
    componentCache.set(name, Component);
    return Component;
  } catch (e) {
    console.error("[Melina Client] Failed to load component:", name, e);
    return null;
  }
}
async function hydrateIslands() {
  initHangar();
  const placeholders = document.querySelectorAll("[data-melina-island]");
  const seenIds = new Set;
  for (let i = 0;i < placeholders.length; i++) {
    const el = placeholders[i];
    const name = el.getAttribute("data-melina-island");
    if (!name)
      continue;
    const propsStr = (el.getAttribute("data-props") || "{}").replace(/&quot;/g, '"');
    const props = JSON.parse(propsStr);
    const instanceId = el.getAttribute("data-instance") || `${name}-${i}`;
    seenIds.add(instanceId);
    const existing = islandRegistry.get(instanceId);
    if (existing) {
      existing.props = props;
      el.appendChild(existing.storageNode);
      console.log("[Melina Client] Moved island:", instanceId);
    } else {
      const Component = await loadComponent(name);
      if (Component) {
        const storageNode = document.createElement("div");
        storageNode.style.display = "contents";
        storageNode.setAttribute("data-storage", instanceId);
        el.appendChild(storageNode);
        const vnode = createElement(Component, props);
        render(vnode, storageNode);
        islandRegistry.set(instanceId, {
          name,
          Component,
          props,
          fiber: null,
          storageNode
        });
        console.log("[Melina Client] Hydrated island:", instanceId);
      }
    }
  }
  for (const [id, island] of islandRegistry.entries()) {
    if (!seenIds.has(id)) {
      if (holdingPen) {
        holdingPen.appendChild(island.storageNode);
      }
      console.log("[Melina Client] Parked island:", id);
    }
  }
}
function syncIslands() {
  const placeholders = document.querySelectorAll("[data-melina-island]");
  for (let i = 0;i < placeholders.length; i++) {
    const el = placeholders[i];
    const name = el.getAttribute("data-melina-island");
    if (!name)
      continue;
    const instanceId = el.getAttribute("data-instance") || `${name}-${i}`;
    const existing = islandRegistry.get(instanceId);
    if (existing) {
      const propsStr = (el.getAttribute("data-props") || "{}").replace(/&quot;/g, '"');
      existing.props = JSON.parse(propsStr);
      el.appendChild(existing.storageNode);
    }
  }
}
async function navigate(href) {
  const fromPath = window.location.pathname;
  const toPath = new URL(href, window.location.origin).pathname;
  if (fromPath === toPath)
    return;
  console.log("[Melina Client] Navigate:", fromPath, "->", toPath);
  let newDoc;
  try {
    const response = await fetch(href, { headers: { "X-Melina-Nav": "1" } });
    const html = await response.text();
    newDoc = new DOMParser().parseFromString(html, "text/html");
  } catch (error) {
    console.error("[Melina Client] Fetch failed, falling back to hard nav");
    window.location.href = href;
    return;
  }
  window.history.pushState({}, "", href);
  const performUpdate = () => {
    window.dispatchEvent(new CustomEvent("melina:navigation-start", {
      detail: { from: fromPath, to: toPath }
    }));
    document.title = newDoc.title;
    const fragment = document.createDocumentFragment();
    while (newDoc.body.firstChild) {
      fragment.appendChild(newDoc.body.firstChild);
    }
    const placeholders = fragment.querySelectorAll("[data-melina-island]");
    for (let i = 0;i < placeholders.length; i++) {
      const el = placeholders[i];
      const name = el.getAttribute("data-melina-island");
      if (!name)
        continue;
      const instanceId = el.getAttribute("data-instance") || `${name}-${i}`;
      const existing = islandRegistry.get(instanceId);
      if (existing) {
        const propsStr = (el.getAttribute("data-props") || "{}").replace(/&quot;/g, '"');
        existing.props = JSON.parse(propsStr);
        el.appendChild(existing.storageNode);
      }
    }
    document.body.replaceChildren(fragment);
    window.scrollTo(0, 0);
  };
  if (document.startViewTransition) {
    const transition = document.startViewTransition(performUpdate);
    await transition.finished;
  } else {
    performUpdate();
  }
  await hydrateIslands();
  console.log("[Melina Client] Navigation complete");
}
if (typeof window !== "undefined") {
  window.melinaNavigate = navigate;
}
function Link(props) {
  const { href, children, ...rest } = props;
  const handleClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
      return;
    e.preventDefault();
    navigate(href);
  };
  const childArray = Array.isArray(children) ? children : children !== undefined ? [children] : [];
  return createElement("a", { href, onClick: handleClick, ...rest }, ...childArray);
}
var isServer = typeof window === "undefined";
function island(Component, name) {
  return function IslandWrapper(props) {
    if (isServer) {
      const propsJson = JSON.stringify(props).replace(/"/g, "&quot;");
      return createElement("div", {
        "data-melina-island": name,
        "data-props": propsJson,
        style: { display: "contents" }
      });
    }
    return createElement(Component, props);
  };
}
async function init() {
  if (isServer)
    return;
  initHangar();
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented)
      return;
    const link = e.target.closest("a[href]");
    if (!link)
      return;
    const href = link.getAttribute("href");
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || link.hasAttribute("download") || link.hasAttribute("target") || link.hasAttribute("data-no-intercept") || !href || !href.startsWith("/"))
      return;
    if (window.location.pathname === href) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    navigate(href);
  });
  window.addEventListener("popstate", async () => {
    const href = window.location.pathname;
    const performUpdate = async () => {
      const response = await fetch(href, { headers: { "X-Melina-Nav": "1" } });
      const html = await response.text();
      const newDoc = new DOMParser().parseFromString(html, "text/html");
      document.title = newDoc.title;
      const fragment = document.createDocumentFragment();
      while (newDoc.body.firstChild) {
        fragment.appendChild(newDoc.body.firstChild);
      }
      const placeholders = fragment.querySelectorAll("[data-melina-island]");
      for (let i = 0;i < placeholders.length; i++) {
        const el = placeholders[i];
        const name = el.getAttribute("data-melina-island");
        if (!name)
          continue;
        const instanceId = el.getAttribute("data-instance") || `${name}-${i}`;
        const existing = islandRegistry.get(instanceId);
        if (existing) {
          const propsStr = (el.getAttribute("data-props") || "{}").replace(/&quot;/g, '"');
          existing.props = JSON.parse(propsStr);
          el.appendChild(existing.storageNode);
        }
      }
      document.body.replaceChildren(fragment);
    };
    if (document.startViewTransition) {
      await document.startViewTransition(performUpdate).finished;
    } else {
      await performUpdate();
    }
    await hydrateIslands();
  });
  await hydrateIslands();
  console.log("[Melina Client] Runtime initialized");
}
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
var client_default = {
  createElement,
  Fragment
};
export {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  syncIslands,
  renderToString,
  render,
  navigate,
  jsxs,
  jsxDEV,
  jsx,
  islandRegistry,
  island,
  init,
  hydrateIslands,
  createElement as h,
  client_default as default,
  createElement,
  componentCache,
  Link,
  Fragment
};

//# debugId=CE70931A8DF84BF764756E2164756E21
//# sourceMappingURL=melina-runtime-78qe7f50.js.map
