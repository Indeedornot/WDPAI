/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal fake DOM/browser globals so the bootstrap can be resolved under Node
// (construction only — no animation frame / layout). Used by bootstrap.smoke.ts.

function makeCtx(): any
{
  return new Proxy({}, {
    get: (_t, p) =>
    {
      if (p === 'measureText')
      {
        return () => ({ width: 0 });
      }
      if (p === 'canvas')
      {
        return makeNode();
      }
      return (..._args: unknown[]) => undefined;
    },
    set: () => true,
  });
}

function makeNode(): any
{
  const data: Record<string, unknown> = {
    innerHTML: '', textContent: '', value: '', checked: false, id: '', className: '',
    type: '', name: '', title: '', disabled: false, tabIndex: 0, width: 800, height: 600,
  };
  const style = new Proxy({}, { get: () => () => undefined, set: () => true });
  const classList = { add: () => 
  {}, remove: () => 
  {}, toggle: () => 
  {}, contains: () => false };

  return new Proxy(data, {
    get(target, prop)
    {
      switch (prop)
      {
        case 'style': return style;
        case 'classList': return classList;
        case 'getContext': return () => makeCtx();
        case 'getBoundingClientRect': return () => ({ width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600 });
        case 'querySelector': return () => makeNode();
        case 'querySelectorAll': return () => [];
        case 'closest': return () => null;
        default:
          if (prop in target)
          {
            return target[prop as string];
          }
          return (..._args: unknown[]) => makeNode();
      }
    },
    set(target, prop, value)
    {
      target[prop as string] = value;
      return true;
    },
  });
}

export function installFakeDom(): void
{
  const storageData = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => storageData.get(k) ?? null,
    setItem: (k: string, v: string) => 
    {
      storageData.set(k, String(v)); 
    },
    removeItem: (k: string) => 
    {
      storageData.delete(k); 
    },
    clear: () => storageData.clear(),
  };

  const documentNode = makeNode();
  documentNode.documentElement = makeNode();
  documentNode.createElement = () => makeNode();
  documentNode.querySelector = () => makeNode();
  documentNode.querySelectorAll = () => [];
  documentNode.body = makeNode();
  documentNode.activeElement = null;

  const win: any = {
    addEventListener: () => 
    {},
    removeEventListener: () => 
    {},
    setInterval: () => 0,
    clearInterval: () => 
    {},
    setTimeout: () => 0,
    clearTimeout: () => 
    {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => 
    {},
    devicePixelRatio: 1,
    localStorage,
    location: { href: 'http://localhost/' },
  };

  const g = globalThis as any;
  g.window = win;
  g.document = documentNode;
  g.localStorage = localStorage;
  g.requestAnimationFrame = win.requestAnimationFrame;
  g.cancelAnimationFrame = win.cancelAnimationFrame;
  g.setInterval = win.setInterval;
  g.clearInterval = win.clearInterval;
  g.devicePixelRatio = 1;
}
