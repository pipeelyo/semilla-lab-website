import { SLUGS, SLUG_RE, escapeHtml, isValidNewSlug, mergeBody, pageTemplate, readTemplate, savedBody, titleOf } from './_lib.js';

const html = (body, status = 200, cache = 'public, s-maxage=10, stale-while-revalidate=60') =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

export async function GET(req) {
  const slug = new URL(req.url).searchParams.get('slug') || '';
  const notFound = async () => html(await readTemplate('404.html'), 404, 'public, s-maxage=10');

  if (SLUGS.includes(slug)) {
    const template = await pageTemplate(slug);
    const body = await savedBody(slug);
    return html(body ? mergeBody(template, body) : template);
  }
  if (!SLUG_RE.test(slug) || !isValidNewSlug(slug)) return notFound();

  // Page created from the admin panel: index shell + saved body, titled after its first heading.
  const body = await savedBody(slug);
  if (!body) return notFound();
  const title = titleOf(body) || slug;
  return html(mergeBody(await pageTemplate('index'), body).replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)} | Semilla Lab</title>`));
}
