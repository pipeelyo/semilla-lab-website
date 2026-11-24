import { put } from '@vercel/blob';
import { authorized, deny } from './_lib.js';

export async function POST(req) {
  if (!authorized(req)) return deny();
  const type = req.headers.get('content-type') || '';
  if (!type.startsWith('image/')) return new Response('Solo imágenes', { status: 400 });
  const name = (new URL(req.url).searchParams.get('name') || 'imagen').replace(/[^\w.-]/g, '_').slice(-80);
  const blob = await put(`imagenes/${name}`, Buffer.from(await req.arrayBuffer()), {
    access: 'public',
    contentType: type,
    addRandomSuffix: true,
  });
  return Response.json({ url: blob.url });
}
