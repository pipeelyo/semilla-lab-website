import { randomUUID } from 'node:crypto';
import { del, list, put } from '@vercel/blob';
import { authorized, deny, seal, unseal } from './_lib.js';

const noStore = { 'cache-control': 'no-store' };
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const arr = (v) => (Array.isArray(v) ? v.slice(0, 12).map((x) => str(x, 120)).filter(Boolean) : []);
const ID_RE = /^leads\/[\w-]+\.json$/;

// Public: the diagnostic form sends a request here.
export async function POST(req) {
  if (Number(req.headers.get('content-length') || 0) > 20000) return new Response('Solicitud demasiado grande', { status: 413 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== 'object') return new Response('Datos inválidos', { status: 400 });
  if (b.website) return Response.json({ ok: true }); // honeypot: bots fill the hidden field

  const lead = {
    name: str(b.name), role: str(b.role), company: str(b.company),
    email: str(b.email), phone: str(b.phone, 40),
    size: str(b.size, 80), sector: str(b.sector, 120), city: str(b.city, 120),
    pains: arr(b.pains), tools: arr(b.tools),
    consent: b.consent === true,
    createdAt: new Date().toISOString(),
  };
  const digits = lead.phone.replace(/\D/g, '');
  if (!lead.name || !lead.role || !lead.company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)
    || digits.length < 7 || digits.length > 15 || !lead.consent) {
    return new Response('Revisa los datos del formulario', { status: 400 });
  }
  await put(`leads/${Date.now()}-${randomUUID()}.json`, seal(lead), { access: 'public', contentType: 'text/plain' });
  return Response.json({ ok: true }, { headers: noStore });
}

// Admin: read every request, newest first.
export async function GET(req) {
  if (!authorized(req)) return deny();
  // shortcut: one list page (1000 requests); paginate with `cursor` if it ever grows past that.
  const { blobs } = await list({ prefix: 'leads/', limit: 1000 });
  const leads = await Promise.all(blobs.map(async (b) => {
    try {
      return { id: b.pathname, ...unseal(await (await fetch(b.url, { cache: 'no-store' })).text()) };
    } catch {
      return { id: b.pathname, error: 'No se pudo leer esta solicitud' };
    }
  }));
  leads.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return Response.json(leads, { headers: noStore });
}

// Admin: delete a request once it has been handled.
export async function DELETE(req) {
  if (!authorized(req)) return deny();
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return new Response('Identificador inválido', { status: 400 });
  await del(id);
  return Response.json({ ok: true }, { headers: noStore });
}
