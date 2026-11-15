export type Child = string | number | Node | null | undefined | false | Child[];
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> | null = null,
  ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  const add = (c: Child) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
