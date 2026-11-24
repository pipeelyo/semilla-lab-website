import { put } from '@vercel/blob';
import { SLUGS, authorized, deny } from './_lib.js';

export async function POST(req) {
  if (!authorized(req)) return deny();
  const { slug, html } = await req.json().catch(() => ({}));
  if (html === undefined) return Response.json({ ok: true }); // password check only
  if (!SLUGS.includes(slug) || typeof html !== 'string' || !html.trim()) {
    return new Response('Datos inválidos', { status: 400 });
  }
  const opts = { access: 'public', contentType: 'text/html; charset=utf-8' };
  // Backup of every save, so a bad edit can be recovered.
  await put(`historial/${slug}/${Date.now()}.html`, html, opts);
  await put(`pages/${slug}.html`, html, { ...opts, allowOverwrite: true, cacheControlMaxAge: 60 });
  return Response.json({ ok: true });
}
