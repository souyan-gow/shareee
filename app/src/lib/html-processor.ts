const ROBOTS_CONTENT = 'noindex, nofollow';

export function injectNoindex(html: string): string {
  const doctypeMatch = html.match(/^\s*<!doctype[^>]*>/i);
  const doctype = doctypeMatch?.[0] ?? '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let head = doc.head;
  if (!head) {
    head = doc.createElement('head');
    const root = doc.documentElement;
    if (root.firstChild) {
      root.insertBefore(head, root.firstChild);
    } else {
      root.appendChild(head);
    }
  }

  const existing = head.querySelector('meta[name="robots" i]');
  if (existing) {
    existing.setAttribute('content', ROBOTS_CONTENT);
  } else {
    const meta = doc.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', ROBOTS_CONTENT);
    head.insertBefore(meta, head.firstChild);
  }

  const serialized = doc.documentElement.outerHTML;
  return doctype ? `${doctype}\n${serialized}` : serialized;
}
