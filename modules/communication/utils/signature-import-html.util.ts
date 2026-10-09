/**
 * Clean Outlook / browser-inspected HTML for use as an email signature.
 * Strips UI chrome while strictly preserving tables, links, images, and inline styles.
 */

const FORBIDDEN_TAGS =
  /<\/?(?:script|iframe|object|embed|form|input|button|link|meta|base|svg|math|style|noscript)[^>]*>/gi;

const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const JS_URL =
  /\s(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi;

/** Outlook / Fluent UI chrome — remove these nodes entirely. */
const OUTLOOK_CHROME_CLASS_RE =
  /\b(fui-Button|fui-Button__icon|fui-Icon-font|qF8_5|wD8TJ)\b/i;

/** Wrapper classes that should be unwrapped (keep children + their styles). */
const OUTLOOK_WRAPPER_CLASS_RE =
  /\b(R1UVb|x_elementToProof|x_x_ng-scope|Am|aiL|IP|Al|editable)\b/i;

const ALLOWED_ATTRS = new Set([
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style',
  'target',
  'rel',
  'cellspacing',
  'cellpadding',
  'border',
  'colspan',
  'rowspan',
  'align',
  'valign',
  'bgcolor',
  'color',
  'face',
  'size',
  'dir',
  'hspace',
  'vspace',
]);

const FONT_SIZE_ATTR_TO_PX: Record<string, string> = {
  '1': '10px',
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
  '6': '32px',
  '7': '48px',
};

function isFileServerPath(pathname: string): boolean {
  return /\/(download|view)\//i.test(pathname);
}

/**
 * Dead Outlook/mail-signatures.com template icons (confirmed 404).
 * Map to reliable Google favicon PNGs so CRM + mail clients can render them.
 */
const DEAD_MAIL_SIGNATURES_ICON_RE =
  /mail-signatures\.com\/signature-generator\/img\/templates\/all-inclusive\/(fb|ln|tt|yt|it)\.png/i;

const MAIL_SIGNATURES_ICON_DOMAIN: Record<string, string> = {
  fb: 'facebook.com',
  ln: 'linkedin.com',
  tt: 'twitter.com',
  yt: 'youtube.com',
  it: 'instagram.com',
};

function faviconPngForDomain(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

/**
 * Targeted URL rewrite only:
 * - dead mail-signatures.com social icons → working favicon PNGs
 * - file-server /download/ → /view/ (+ fix path "+" → %20)
 * - Dropbox share links → dl=1
 * Leaves all other https URLs untouched (no blanket path re-encoding).
 */
export function rewriteSignatureResourceUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return trimmed;

  const dead = DEAD_MAIL_SIGNATURES_ICON_RE.exec(trimmed);
  if (dead) {
    const key = dead[1].toLowerCase();
    const domain = MAIL_SIGNATURES_ICON_DOMAIN[key];
    if (domain) return faviconPngForDomain(domain);
  }

  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();

    if (
      (host === 'www.dropbox.com' || host === 'dropbox.com') &&
      /\/s\//i.test(u.pathname)
    ) {
      u.searchParams.set('dl', '1');
      u.protocol = 'https:';
      return u.toString();
    }

    if (isFileServerPath(u.pathname)) {
      u.protocol = 'https:';
      const path = u.pathname.replace(/\/download\//gi, '/view/');
      u.pathname = path
        .split('/')
        .map((segment) => {
          if (!segment) return segment;
          try {
            return encodeURIComponent(
              decodeURIComponent(segment.replace(/\+/g, '%20')),
            );
          } catch {
            return encodeURIComponent(segment.replace(/\+/g, ' '));
          }
        })
        .join('/');
      return u.toString();
    }

    return trimmed;
  } catch {
    if (/\/download\//i.test(trimmed)) {
      return trimmed
        .replace(/^http:/i, 'https:')
        .replace(/\/download\//gi, '/view/')
        .replace(/\+/g, '%20');
    }
    return trimmed;
  }
}

/** Rewrite every <img src> via rewriteSignatureResourceUrl (string-safe, no CSSOM). */
export function rewriteSignatureImageSrcsInHtml(html: string): string {
  if (!html) return html;
  return html.replace(
    /(<img\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi,
    (fullMatch, prefix: string, quote: string, src: string) => {
      void fullMatch;
      return `${prefix}${quote}${rewriteSignatureResourceUrl(src)}${quote}`;
    },
  );
}

/**
 * Rehost used to save every Google favicon as `favicons.png`, so all social
 * icons pointed at one file. Recover distinct icons from the img alt text.
 */
const COLLAPSED_FAVICON_FILE_RE = /\/favicons\.png(?:\?|#|$)/i;

const SOCIAL_ALT_TO_DOMAIN: Record<string, string> = {
  facebook: 'facebook.com',
  linkedin: 'linkedin.com',
  twitter: 'twitter.com',
  x: 'twitter.com',
  youtube: 'youtube.com',
  instagram: 'instagram.com',
};

function attrValue(attrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  const m = re.exec(attrs);
  return m ? m[2] : null;
}

function replaceAttr(attrs: string, name: string, value: string): string {
  const re = new RegExp(`(\\b${name}\\s*=\\s*)(["'])([\\s\\S]*?)\\2`, 'i');
  if (re.test(attrs)) {
    return attrs.replace(re, `$1$2${value}$2`);
  }
  return ` ${name}="${value}"${attrs}`;
}

export function repairCollapsedSocialIconSrcsInHtml(html: string): string {
  if (!html) return html;
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs: string) => {
    const src = (attrValue(attrs, 'src') || '').trim();
    if (!src || !COLLAPSED_FAVICON_FILE_RE.test(src)) return full;
    const alt = (attrValue(attrs, 'alt') || '').trim().toLowerCase();
    const domain = SOCIAL_ALT_TO_DOMAIN[alt];
    if (!domain) return full;
    const nextSrc = faviconPngForDomain(domain);
    return `<img${replaceAttr(attrs, 'src', nextSrc)}>`;
  });
}

/**
 * Prepare HTML email bodies for CRM display:
 * - rewrite known-dead signature icon hosts
 * - repair collapsed social favicon.png collisions
 * - drop Outlook data-imagetype chrome
 * - set referrerpolicy=no-referrer so hotlink-protected banners (e.g. PMS CDNs) can load
 */
export function prepareEmailBodyHtml(html: string): string {
  if (!html) return html;
  let out = rewriteSignatureImageSrcsInHtml(html);
  out = repairCollapsedSocialIconSrcsInHtml(out);
  out = out.replace(/\s*data-imagetype\s*=\s*(["'])[^"']*\1/gi, '');
  out = out.replace(/<img\b([^>]*?)>/gi, (fullMatch, attrs: string) => {
    void fullMatch;
    let next = attrs;
    if (!/\breferrerpolicy\s*=/i.test(next)) {
      next = ` referrerpolicy="no-referrer"${next}`;
    }
    return `<img${next}>`;
  });
  return out;
}

/**
 * Merge a CSS declaration into the raw style attribute without going through CSSOM
 * (CSSOM serialization drops `!important` and can rewrite values).
 */
function mergeInlineStyle(el: Element, declaration: string) {
  const prev = (el.getAttribute('style') || '').trim();
  const prop = declaration.split(':')[0]?.trim().toLowerCase();
  if (!prop) return;
  const filtered = prev
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !p.toLowerCase().startsWith(`${prop}:`));
  filtered.push(declaration.trim());
  el.setAttribute('style', filtered.join('; '));
}

/**
 * Merge parent layout styles into child without overriding child declarations.
 * Child wins on conflicting properties.
 */
function mergeStyleStrings(childStyle: string, parentStyle: string): string {
  const childProps = new Map<string, string>();
  childStyle
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const idx = p.indexOf(':');
      if (idx < 0) return;
      childProps.set(p.slice(0, idx).trim().toLowerCase(), p);
    });
  const out: string[] = [];
  parentStyle
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const idx = p.indexOf(':');
      if (idx < 0) return;
      const key = p.slice(0, idx).trim().toLowerCase();
      if (!childProps.has(key)) out.push(p);
    });
  childProps.forEach((v) => out.push(v));
  return out.join('; ');
}

function stripDisallowedAttributes(el: Element) {
  const toRemove: string[] = [];
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('data-') || name.startsWith('aria-')) {
      toRemove.push(attr.name);
      continue;
    }
    if (
      name === 'class' ||
      name === 'id' ||
      name === 'role' ||
      name === 'tabindex'
    ) {
      toRemove.push(attr.name);
      continue;
    }
    if (!ALLOWED_ATTRS.has(name)) {
      toRemove.push(attr.name);
    }
  }
  toRemove.forEach((n) => el.removeAttribute(n));
}

function ensureSafeLinkAttrs(el: Element) {
  if (el.tagName !== 'A') return;
  const styleBefore = el.getAttribute('style');
  const href = el.getAttribute('href');
  if (href && /^https?:\/\//i.test(href)) {
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  }
  if (styleBefore != null) el.setAttribute('style', styleBefore);
}

function isChromeOnlyNode(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (
    tag === 'button' ||
    tag === 'script' ||
    tag === 'style' ||
    tag === 'svg'
  ) {
    return true;
  }
  const title = (el.getAttribute('title') || '').toLowerCase();
  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
  if (
    title.includes('show original size') ||
    aria.includes('show original size')
  ) {
    return true;
  }
  const cls = el.getAttribute('class') || '';
  if (OUTLOOK_CHROME_CLASS_RE.test(cls)) return true;
  if (
    tag === 'div' &&
    el.querySelector(':scope > button.fui-Button, :scope > button')
  ) {
    if (!el.querySelector('table, img, a')) return true;
  }
  return false;
}

function unwrapElement(el: Element) {
  const parent = el.parentNode;
  if (!parent) {
    el.remove();
    return;
  }
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

function unwrapOutlookWrappers(host: HTMLElement) {
  const candidates = Array.from(host.querySelectorAll('div, span')).reverse();
  for (const el of candidates) {
    const cls = el.getAttribute('class') || '';
    if (!OUTLOOK_WRAPPER_CLASS_RE.test(cls)) continue;
    const style = el.getAttribute('style');
    const children = Array.from(el.childNodes).filter(
      (n) => !(n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()),
    );
    if (
      style &&
      children.length === 1 &&
      children[0].nodeType === Node.ELEMENT_NODE
    ) {
      const child = children[0] as Element;
      const childStyle = child.getAttribute('style') || '';
      const merged = mergeStyleStrings(childStyle, style);
      if (merged) child.setAttribute('style', merged);
    }
    unwrapElement(el);
  }
}

/**
 * Sanitize + optionally strip Outlook inspect / Fluent UI junk.
 * Never rewrites img width/height/style. Never strips link/table inline styles.
 */
export function cleanImportedSignatureHtml(
  html: string,
  options?: { autoClean?: boolean },
): string {
  if (!html || typeof html !== 'string') return '';
  const autoClean = options?.autoClean !== false;

  const cleaned = html
    .replace(FORBIDDEN_TAGS, '')
    .replace(EVENT_HANDLER_ATTR, '')
    .replace(JS_URL, '')
    .replace(/\sdata-cursor-element-id\s*=\s*(["'])(.*?)\1/gi, '')
    .trim();

  if (typeof document === 'undefined') {
    return cleaned;
  }

  const host = document.createElement('div');
  host.innerHTML = cleaned;

  // Capture raw style attrs before any attribute churn.
  const styleSnapshots = new Map<Element, string>();
  host.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style');
    if (s != null) styleSnapshots.set(el, s);
  });

  if (autoClean) {
    const chrome: Element[] = [];
    host.querySelectorAll('*').forEach((el) => {
      if (isChromeOnlyNode(el)) chrome.push(el);
    });
    chrome.forEach((el) => el.remove());
    unwrapOutlookWrappers(host);
  }

  host.querySelectorAll('*').forEach((el) => {
    if (autoClean) {
      el.removeAttribute('class');
      el.removeAttribute('id');
    }
    const styleBefore = styleSnapshots.get(el) ?? el.getAttribute('style');
    stripDisallowedAttributes(el);
    ensureSafeLinkAttrs(el);
    if (styleBefore != null) el.setAttribute('style', styleBefore);
  });

  if (autoClean) {
    const tables = host.querySelectorAll('table');
    let best: HTMLTableElement | null = null;
    let bestScore = -1;
    tables.forEach((table) => {
      const text = (table.textContent || '').trim().length;
      const imgs = table.querySelectorAll('img').length;
      const score = text + imgs * 50;
      if (score > bestScore) {
        bestScore = score;
        best = table;
      }
    });
    if (best && bestScore > 20) {
      return best.outerHTML;
    }
  }

  return host.innerHTML.trim();
}

/**
 * Email-safe normalize: convert legacy <font>/align, rewrite known image URL
 * patterns only. Does NOT add or override img dimensions / styles.
 */
export function normalizeSignatureHtmlForEmail(html: string): string {
  if (!html || typeof document === 'undefined') return html || '';

  const repaired = repairCollapsedSocialIconSrcsInHtml(html);

  const host = document.createElement('div');
  host.innerHTML = repaired
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');

  host.querySelectorAll('font').forEach((font) => {
    const span = document.createElement('span');
    const parts: string[] = [];
    const size = font.getAttribute('size');
    const color = font.getAttribute('color');
    const face = font.getAttribute('face');
    const existing = font.getAttribute('style') || '';
    if (existing.trim()) parts.push(existing.trim());
    if (size && FONT_SIZE_ATTR_TO_PX[size]) {
      parts.push(`font-size:${FONT_SIZE_ATTR_TO_PX[size]}`);
    }
    if (color) parts.push(`color:${color}`);
    if (face) parts.push(`font-family:${face}`);
    if (parts.length) span.setAttribute('style', parts.join('; '));
    while (font.firstChild) span.appendChild(font.firstChild);
    font.replaceWith(span);
  });

  // align → text-align via raw style string (keeps !important intact).
  host.querySelectorAll('[align]').forEach((el) => {
    const align = el.getAttribute('align');
    if (!align) return;
    mergeInlineStyle(el, `text-align: ${align}`);
    el.removeAttribute('align');
  });

  host.querySelectorAll('img').forEach((img) => {
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    const style = img.getAttribute('style');
    const alt = img.getAttribute('alt');
    const src = (img.getAttribute('src') || '').trim();

    if (!src || /^data:/i.test(src) || !/^https?:\/\//i.test(src)) {
      img.remove();
      return;
    }

    img.setAttribute('src', rewriteSignatureResourceUrl(src));

    // Re-assert original sizing — never invent defaults.
    if (width != null) img.setAttribute('width', width);
    else img.removeAttribute('width');
    if (height != null) img.setAttribute('height', height);
    else img.removeAttribute('height');
    if (style != null) img.setAttribute('style', style);
    else img.removeAttribute('style');
    if (alt != null && alt !== '') img.setAttribute('alt', alt);
    else if (!img.getAttribute('alt'))
      img.setAttribute('alt', 'Signature Image');
  });

  host.querySelectorAll('a').forEach((a) => ensureSafeLinkAttrs(a));

  return host.innerHTML;
}
