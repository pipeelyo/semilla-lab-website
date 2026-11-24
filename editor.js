// Edit mode: open any page with ?editar
(async () => {
  if (!new URLSearchParams(location.search).has('editar')) return;

  const PAGES = { index: 'Inicio', servicios: 'Servicios', 'metodologia-cultivar': 'Metodología Cultivar', 'casos-de-exito': 'Casos de Éxito', 'diagnostico-gratis': 'Diagnóstico Gratis' };
  const slug = location.pathname.replace(/^\/(pages\/)?|\.html$/g, '') || 'index';
  if (!PAGES[slug]) return;

  let pass = sessionStorage.getItem('cms-pass');
  const api = (url, body, type) =>
    fetch(url, { method: 'POST', headers: { 'x-editor-password': encodeURIComponent(pass || ''), 'content-type': type }, body });

  for (;;) {
    pass = pass || prompt('Contraseña de editor');
    if (!pass) return;
    const r = await api('/api/save', '{}', 'application/json');
    if (r.ok) break;
    alert('Contraseña incorrecta');
    pass = null;
  }
  sessionStorage.setItem('cms-pass', pass);

  // --- UI ---------------------------------------------------------------
  const css = document.createElement('style');
  css.dataset.cms = '';
  css.textContent = `
    [data-cms-edit]:hover{outline:2px dashed #f59e0b;outline-offset:2px}
    [data-cms-edit]:focus{outline:2px solid #f59e0b;outline-offset:2px}
    main img, footer img, header img{cursor:pointer}
    main img:hover{outline:3px dashed #16a34a}
    .cms-rel{position:relative}
    .cms-handle{position:absolute;top:6px;left:6px;z-index:40;cursor:grab;background:#14532d;color:#fff;border-radius:6px;padding:0 7px;font:16px/24px sans-serif;box-shadow:0 1px 4px #0004;user-select:none}
    .cms-ghost{opacity:.35}
    #cms-bar{position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;gap:8px;align-items:center;background:#fff;border:1px solid #d6d3d1;border-radius:12px;padding:8px 12px;box-shadow:0 6px 24px #0003;font:14px system-ui,sans-serif;color:#1c1917}
    #cms-bar button,#cms-bar select{font:inherit;border-radius:8px;padding:6px 12px;border:1px solid #d6d3d1;background:#fff;cursor:pointer}
    #cms-bar .cms-save{background:#14532d;color:#fff;border-color:#14532d}
    #cms-bar .cms-save:disabled{opacity:.5;cursor:default}`;
  document.head.append(css);

  const bar = document.createElement('div');
  bar.id = 'cms-bar';
  bar.dataset.cms = '';
  bar.innerHTML = `
    <strong>Editor</strong>
    <select aria-label="Página">${Object.entries(PAGES).map(([s, n]) => `<option value="${s}"${s === slug ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <span class="cms-status" aria-live="polite">Sin cambios</span>
    <button class="cms-save" disabled>Guardar</button>
    <button class="cms-exit">Salir</button>`;
  document.body.append(bar);
  const statusEl = bar.querySelector('.cms-status');
  const saveBtn = bar.querySelector('.cms-save');
  const status = (t) => (statusEl.textContent = t);

  let dirty = false;
  const markDirty = () => { dirty = true; saveBtn.disabled = false; status('Cambios sin guardar'); };
  addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

  bar.querySelector('select').onchange = (e) => (location.href = `/${e.target.value === 'index' ? '' : e.target.value}?editar`);
  bar.querySelector('.cms-exit').onclick = () => (location.href = location.pathname);

  // --- Texts ------------------------------------------------------------
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('script,style,svg,[data-cms],.material-symbols-outlined')) continue;
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      el.contentEditable = 'true';
      el.dataset.cmsEdit = '';
    }
  }
  // Icons are font ligatures: editing their text would break them.
  document.querySelectorAll('.material-symbols-outlined').forEach((i) => (i.contentEditable = 'false'));
  document.body.addEventListener('input', (e) => { if (!e.target.closest('[data-cms]')) markDirty(); });

  // Links, buttons and forms must not navigate or submit while editing.
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cms]')) return;
    if (e.target.closest('a,button')) e.preventDefault();
    if (e.target.tagName === 'IMG') pickImage(e.target);
  }, true);
  document.addEventListener('submit', (e) => e.preventDefault(), true);

  // --- Images -----------------------------------------------------------
  function pickImage(img) {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 4e6) return alert('La imagen pesa más de 4 MB. Redúcela e intenta de nuevo.');
      status('Subiendo imagen…');
      const r = await api(`/api/upload?name=${encodeURIComponent(file.name)}`, file, file.type);
      if (!r.ok) return status(`Error al subir la imagen (${r.status})`);
      img.src = (await r.json()).url;
      img.removeAttribute('srcset');
      markDirty();
    };
    input.click();
  }

  // --- Reorder ----------------------------------------------------------
  const { default: Sortable } = await import('https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/+esm');
  const lists = [document.querySelector('main'), ...document.querySelectorAll('main .grid')];
  lists.forEach((list, i) => {
    const items = [...list.children].filter((c) => !c.matches('script,style'));
    if (items.length < 2) return;
    for (const item of items) {
      if (getComputedStyle(item).position === 'static') item.classList.add('cms-rel');
      const h = document.createElement('span');
      h.className = 'cms-handle';
      h.dataset.cms = '';
      h.dataset.cmsList = i; // one handle per level, so dragging a card never drags its section
      h.title = i === 0 ? 'Arrastrar sección' : 'Arrastrar bloque';
      h.textContent = '⠿';
      h.contentEditable = 'false';
      item.prepend(h);
    }
    Sortable.create(list, { handle: `.cms-handle[data-cms-list="${i}"]`, animation: 150, ghostClass: 'cms-ghost', onEnd: markDirty });
  });

  // --- Save -------------------------------------------------------------
  saveBtn.onclick = async () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('[data-cms]').forEach((n) => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('[data-cms-edit]').forEach((n) => n.removeAttribute('data-cms-edit'));
    clone.querySelectorAll('.cms-rel').forEach((n) => n.classList.remove('cms-rel'));
    clone.querySelectorAll('.faq-content').forEach((n) => (n.style.maxHeight = ''));
    clone.querySelectorAll('.faq-icon').forEach((n) => (n.style.transform = ''));
    clone.querySelectorAll('[class=""],[style=""]').forEach((n) => { if (!n.className) n.removeAttribute('class'); if (!n.getAttribute('style')) n.removeAttribute('style'); });

    saveBtn.disabled = true;
    status('Guardando…');
    const r = await api('/api/save', JSON.stringify({ slug, html: clone.innerHTML }), 'application/json');
    if (r.ok) { dirty = false; status('Guardado ✓ (visible en ~1 min)'); }
    else { saveBtn.disabled = false; status(`Error al guardar (${r.status})`); }
  };
})();
