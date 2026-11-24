import { del, list, put } from '@vercel/blob';
import { PAGE_NAMES, SLUGS, authorized, blankBody, bodyOf, deny, isValidNewSlug, pageTemplate, savedBody, titleOf } from './_lib.js';

const HTML = { access: 'public', contentType: 'text/html; charset=utf-8' };
const noStore = { 'cache-control': 'no-store' };

// Custom pages are the saved bodies under pages/ whose slug is not a built-in page.
async function customPages() {
  const { blobs } = await list({ prefix: 'pages/' });
  return blobs
    .map((b) => ({ slug: b.pathname.slice('pages/'.length, -'.html'.length), url: b.url }))
    .filter((p) => isValidNewSlug(p.slug));
}

export async function GET(req) {
  if (!authorized(req)) return deny();
  const custom = await Promise.all((await customPages()).map(async ({ slug }) => ({
    slug,
    title: titleOf((await savedBody(slug)) || '') || slug,
    builtin: false,
  })));
  const builtin = SLUGS.map((slug) => ({ slug, title: PAGE_NAMES[slug], builtin: true }));
  return Response.json([...builtin, ...custom.sort((a, b) => a.title.localeCompare(b.title, 'es'))], { headers: noStore });
}

export async function POST(req) {
  if (!authorized(req)) return deny();
  const { title, slug, base } = await req.json().catch(() => ({}));
  const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 100) : '';
  if (!cleanTitle) return new Response('Escribe un título', { status: 400 });
  if (!isValidNewSlug(slug)) return new Response('Dirección inválida o reservada: usa solo minúsculas, números y guiones', { status: 400 });
  const custom = await customPages();
  if (custom.some((p) => p.slug === slug)) return new Response('Ya existe una página con esa dirección', { status: 409 });

  let body;
  if (!base || base === 'blank') body = await blankBody(cleanTitle);
  else if (SLUGS.includes(base)) body = (await savedBody(base)) ?? bodyOf(await pageTemplate(base));
  else if (custom.some((p) => p.slug === base)) body = await savedBody(base);
  if (!body) return new Response('La página base no existe', { status: 400 });

  await put(`pages/${slug}.html`, body, { ...HTML, cacheControlMaxAge: 60 });
  return Response.json({ ok: true, slug }, { headers: noStore });
}

export async function DELETE(req) {
  if (!authorized(req)) return deny();
  const slug = new URL(req.url).searchParams.get('slug');
  if (!isValidNewSlug(slug)) return new Response('Solo se pueden eliminar páginas creadas en el panel', { status: 400 });
  const body = await savedBody(slug);
  if (body === null) return new Response('No encontrada', { status: 404 });
  // Keep a copy so a deleted page can be recovered from historial/.
  await put(`historial/${slug}/${Date.now()}-eliminada.html`, body, HTML);
  await del(`pages/${slug}.html`);
  return Response.json({ ok: true }, { headers: noStore });
}
