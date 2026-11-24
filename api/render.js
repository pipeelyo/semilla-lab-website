import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SLUGS, mergeBody } from './_lib.js';

export async function GET(req) {
  const slug = new URL(req.url).searchParams.get('slug');
  if (!SLUGS.includes(slug)) return new Response('No encontrado', { status: 404 });

  let html = await readFile(path.join(process.cwd(), 'pages', `${slug}.html`), 'utf8');
  const base = process.env.BLOB_BASE_URL;
  if (base) {
    try {
      const r = await fetch(`${base}/pages/${slug}.html`, { cache: 'no-store' });
      if (r.ok) html = mergeBody(html, await r.text());
    } catch {} // Blob unreachable: serve the original page instead of an error.
  }
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=10, stale-while-revalidate=60',
    },
  });
}
