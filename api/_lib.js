import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const PAGE_NAMES = {
  index: 'Inicio',
  servicios: 'Servicios',
  'metodologia-cultivar': 'Metodología Cultivar',
  'casos-de-exito': 'Casos de Éxito',
  'diagnostico-gratis': 'Diagnóstico Gratis',
};
export const SLUGS = Object.keys(PAGE_NAMES);
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = ['api', 'pages', 'admin', '404', 'editor', 'logo', 'historial', 'imagenes'];
export const isValidNewSlug = (s) => typeof s === 'string' && s.length <= 60 && SLUG_RE.test(s) && !SLUGS.includes(s) && !RESERVED.includes(s);

// --- Session ---------------------------------------------------------------
// Cookie value: "<expiry ms>.<HMAC>". Keyed with the editor password, so changing
// the password in Vercel logs every session out.
const COOKIE = 'cms_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const sign = (exp) => createHmac('sha256', `cms-session:${process.env.EDITOR_PASSWORD}`).update(String(exp)).digest('base64url');
const sameBytes = (a, b) => {
  const x = createHash('sha256').update(a).digest();
  const y = createHash('sha256').update(b).digest();
  return timingSafeEqual(x, y);
};

export const passwordMatches = (given) =>
  !!process.env.EDITOR_PASSWORD && typeof given === 'string' && sameBytes(given, process.env.EDITOR_PASSWORD);

export function sessionCookie() {
  const exp = Date.now() + SESSION_MS;
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MS / 1000}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function authorized(req) {
  if (!process.env.EDITOR_PASSWORD) return false;
  const raw = (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  const [exp, sig] = (raw?.slice(COOKIE.length + 1) || '').split('.');
  return !!exp && !!sig && Number(exp) > Date.now() && sameBytes(sig, sign(exp));
}
export const deny = () => new Response('Inicia sesión para continuar', { status: 401 });

// --- Page HTML -------------------------------------------------------------
const BODY_RE = /(<body[^>]*>)([\s\S]*)<\/body>/i;
export const mergeBody = (template, body) => template.replace(BODY_RE, (_, open) => `${open}${body}</body>`);
export const bodyOf = (html) => html.match(BODY_RE)?.[2] ?? '';
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const readTemplate = (name) => readFile(path.join(process.cwd(), name), 'utf8');
export const pageTemplate = (slug) => readTemplate(`pages/${SLUGS.includes(slug) ? slug : 'index'}.html`);

// Latest saved body of a page, or null if it was never saved.
export async function savedBody(slug) {
  const base = process.env.BLOB_BASE_URL;
  if (!base) return null;
  try {
    const r = await fetch(`${base}/pages/${slug}.html`, { cache: 'no-store' });
    return r.ok ? await r.text() : null;
  } catch {
    return null; // Blob unreachable: callers fall back to the original page.
  }
}

// Body for a brand-new page: the site's header and footer around one starter section.
export async function blankBody(title) {
  const body = bodyOf(await pageTemplate('index'))
    .replace(/<a aria-current="page" class="[^"]*" data-path="inicio" href="\/">Inicio<\/a>/,
      '<a class="px-space-sm py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all" data-path="inicio" href="/">Inicio</a>');
  const starter = `<main class="w-full pt-20 bg-surface min-h-screen"><div class="flex flex-col w-full"><section class="w-full bg-surface py-space-xl lg:py-24"><div class="max-w-7xl mx-auto px-margin-mobile lg:px-margin flex flex-col gap-space-md"><p class="font-label-md text-label-md text-secondary tracking-widest uppercase">Nueva página</p><h1 class="font-display-hero text-display-hero text-primary tracking-tight">${escapeHtml(title)}</h1><p class="font-body-xl text-body-xl text-on-surface-variant max-w-2xl">Escribe aquí la introducción. Pasa el mouse sobre esta sección y usa «＋ Nueva sección» para agregar bloques con los diseños del sitio.</p></div></section></div></main>`;
  return body.replace(/<main[\s\S]*<\/main>/, () => starter);
}

export const titleOf = (body) =>
  (body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d)).replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
