import { createHash, timingSafeEqual } from 'node:crypto';

export const SLUGS = ['index', 'servicios', 'metodologia-cultivar', 'casos-de-exito', 'diagnostico-gratis'];

const hash = (s) => createHash('sha256').update(s || '').digest();

// The client sends the password URI-encoded so any character fits in an HTTP header.
export function authorized(req) {
  const expected = process.env.EDITOR_PASSWORD;
  if (!expected) return false;
  let given = '';
  try { given = decodeURIComponent(req.headers.get('x-editor-password') || ''); } catch {}
  return timingSafeEqual(hash(given), hash(expected));
}

export const deny = () => new Response('No autorizado', { status: 401 });

// Swaps the template's <body> contents for the saved version.
export function mergeBody(template, body) {
  return template.replace(/(<body[^>]*>)[\s\S]*<\/body>/i, (_, open) => `${open}${body}</body>`);
}
