import { authorized, clearCookie, passwordMatches, sessionCookie } from './_lib.js';

const json = (data, init = {}) => Response.json(data, { ...init, headers: { 'cache-control': 'no-store', ...init.headers } });

export function GET(req) {
  return json({ loggedIn: authorized(req) });
}

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 1000)); // slows down password guessing
    return json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie() } });
}

export function DELETE() {
  return json({ ok: true }, { headers: { 'set-cookie': clearCookie() } });
}
