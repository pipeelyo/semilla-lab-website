// Edit mode: open any page with ?editar
(async () => {
  if (!new URLSearchParams(location.search).has('editar')) return;

  // Original pages: the section library is built from their designs.
  const BUILTIN = { index: 'Inicio', servicios: 'Servicios', 'metodologia-cultivar': 'Metodología Cultivar', 'casos-de-exito': 'Casos de Éxito', 'diagnostico-gratis': 'Diagnóstico Gratis', nosotros: 'Nosotros', recursos: 'Recursos' };
  const slug = location.pathname.replace(/^\/|\/$/g, '') || 'index';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;

  // The session lives in an HttpOnly cookie set by /admin; without it, go log in first.
  const { loggedIn } = await (await fetch('/api/login', { cache: 'no-store' })).json();
  if (!loggedIn) return location.replace(`/admin?next=${encodeURIComponent(location.pathname + location.search)}`);
  const PAGES = Object.fromEntries((await (await fetch('/api/pages', { cache: 'no-store' })).json()).map((p) => [p.slug, p.title]));
  const api = (url, body, type) => fetch(url, { method: 'POST', headers: { 'content-type': type }, body });
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // --- UI ---------------------------------------------------------------
  const css = document.createElement('style');
  css.dataset.cms = '';
  css.textContent = `
    [data-cms-edit]:hover{outline:2px dashed #f59e0b;outline-offset:2px}
    [data-cms-edit]:focus{outline:2px solid #f59e0b;outline-offset:2px}
    main img, footer img, header img{cursor:pointer}
    main img:hover{outline:3px dashed #16a34a}
    .cms-rel{position:relative}
    .cms-tools{position:absolute;top:6px;right:6px;z-index:40;display:none;gap:4px;user-select:none}
    .cms-hot>.cms-tools{display:flex}
    .cms-hot{outline:2px solid #16a34a;outline-offset:3px}
    .cms-tools button{all:unset;cursor:pointer;background:#15803d;color:#fff;border-radius:6px;padding:0 8px;font:600 12px/24px system-ui,sans-serif;box-shadow:0 1px 4px #0004;white-space:nowrap}
    .cms-tools .cms-move{cursor:grab}
    .cms-tools .cms-del{background:#b91c1c}
    .cms-sec>.cms-tools button{background:#c2410c}
    .cms-sec>.cms-tools .cms-del{background:#b91c1c}
    .cms-sec.cms-hot{outline-color:#c2410c}
    .cms-zone{outline:3px dashed #16a34a !important;outline-offset:8px;background-color:#16a34a0d !important;border-radius:12px}
    .cms-zone>.cms-item{box-shadow:inset 0 0 0 2px #86efac}
    .cms-zone>.cms-sec{box-shadow:inset 0 0 0 3px #fdba74}
    .cms-ghost{opacity:1 !important;background:#dcfce7 !important;box-shadow:inset 0 0 0 3px #16a34a !important}
    .cms-ghost>*{visibility:hidden}
    #cms-rt{position:fixed;z-index:9999;display:none;gap:2px;background:#1c1917;border-radius:8px;padding:4px;box-shadow:0 6px 18px #0004}
    #cms-rt button{all:unset;cursor:pointer;color:#fff;font:13px/26px system-ui,sans-serif;padding:0 8px;border-radius:5px}
    #cms-rt button:hover{background:#44403c}
    #cms-lib{position:fixed;inset:0;z-index:10000;background:#0c0a0999;display:flex;align-items:center;justify-content:center;padding:24px}
    .cms-lib-box{background:#fff;border-radius:16px;width:min(1100px,100%);max-height:100%;display:flex;flex-direction:column;font:14px system-ui,sans-serif;color:#1c1917;box-shadow:0 20px 60px #0006}
    .cms-lib-head{display:flex;gap:12px;align-items:baseline;padding:16px 20px;border-bottom:1px solid #e7e5e4}
    .cms-lib-head span{color:#78716c;flex:1}
    .cms-lib-head button{all:unset;cursor:pointer;padding:4px 10px;border-radius:8px;border:1px solid #d6d3d1}
    .cms-lib-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:20px;overflow:auto}
    .cms-lib-card{all:unset;cursor:pointer;display:flex;flex-direction:column;gap:4px;border:1px solid #e7e5e4;border-radius:12px;padding:8px}
    .cms-lib-card:hover,.cms-lib-card:focus-visible{border-color:#16a34a;box-shadow:0 0 0 3px #bbf7d0}
    .cms-lib-card small{color:#78716c}
    .cms-lib-thumb{height:180px;overflow:hidden;border-radius:8px;background:#f5f5f4;pointer-events:none}
    .cms-lib-scale{width:1280px;transform:scale(.25);transform-origin:0 0}
    #cms-link{position:fixed;z-index:9999;display:none;gap:8px;align-items:center;max-width:380px;background:#1c1917;color:#fff;font:13px/1.35 system-ui,sans-serif;padding:8px 10px;border-radius:10px;box-shadow:0 8px 24px #0005}
    #cms-link b{color:#bbf7d0;font-weight:600}
    #cms-link .cms-warn b{color:#fdba74}
    #cms-link button{all:unset;cursor:pointer;background:#15803d;color:#fff;border-radius:6px;padding:3px 9px;white-space:nowrap}
    #cms-link .cms-cancel{background:#44403c}
    .cms-link-form{display:flex;flex-direction:column;gap:8px;width:340px}
    .cms-link-form label{display:flex;flex-direction:column;gap:4px}
    .cms-link-form .cms-row{flex-direction:row;display:flex;gap:6px;align-items:center}
    .cms-link-form select,.cms-link-form input:not([type=checkbox]){font:inherit;color:#1c1917;background:#fff;border-radius:6px;border:0;padding:5px 6px}
    .cms-link-form [hidden]{display:none}
    .cms-err{color:#fca5a5}
    #cms-hint{position:fixed;z-index:9998;pointer-events:none;background:#14532d;color:#fff;font:13px/1.3 system-ui,sans-serif;padding:6px 10px;border-radius:8px;box-shadow:0 4px 12px #0003;max-width:280px;display:none}
    #cms-bar .cms-legend{display:flex;gap:6px;font-size:12px;color:#57534e}
    #cms-bar .cms-legend b{color:#fff;border-radius:4px;padding:0 5px}
    #cms-bar{position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;gap:8px;align-items:center;background:#fff;border:1px solid #d6d3d1;border-radius:12px;padding:8px 12px;box-shadow:0 6px 24px #0003;font:14px system-ui,sans-serif;color:#1c1917}
    #cms-bar button,#cms-bar select{font:inherit;border-radius:8px;padding:6px 12px;border:1px solid #d6d3d1;background:#fff;cursor:pointer}
    #cms-bar a.cms-panel{color:#15803d;font-weight:600;text-decoration:none;padding:6px 4px}
    #cms-bar .cms-save{background:#14532d;color:#fff;border-color:#14532d}
    #cms-bar .cms-save:disabled{opacity:.5;cursor:default}`;
  document.head.append(css);

  const bar = document.createElement('div');
  bar.id = 'cms-bar';
  bar.dataset.cms = '';
  bar.innerHTML = `
    <strong>Editor</strong>
    <select aria-label="Página">${Object.entries(PAGES).map(([s, n]) => `<option value="${s}"${s === slug ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
    <span class="cms-legend">Pasa el mouse sobre un bloque: <b style="background:#15803d">⠿ Mover</b><b style="background:#15803d">＋ Duplicar</b><b style="background:#b91c1c">✕</b> · <b style="background:#c2410c">Sección</b></span>
    <span class="cms-status" aria-live="polite">Sin cambios</span>
    <button class="cms-save" disabled>Guardar</button>
    <a class="cms-panel" href="/admin">Panel</a>
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

  // Changes stay on screen: log in again in another tab, then press Guardar again.
  function sessionExpired() {
    statusEl.innerHTML = 'Tu sesión expiró. <a href="/admin" target="_blank" rel="noopener" style="color:#15803d;font-weight:600">Inicia sesión aquí</a> y vuelve a presionar Guardar.';
  }

  // --- Texts ------------------------------------------------------------
  const makeEditable = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('script,style,svg,[data-cms],.material-symbols-outlined')) continue;
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        el.contentEditable = 'true';
        el.dataset.cmsEdit = '';
      }
    }
    // Icons are font ligatures: editing their text would break them.
    root.querySelectorAll('.material-symbols-outlined').forEach((i) => (i.contentEditable = 'false'));
  };
  makeEditable(document.body);
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
      if (r.status === 401) return sessionExpired();
      if (!r.ok) return status(`Error al subir la imagen (${r.status})`);
      img.src = (await r.json()).url;
      img.removeAttribute('srcset');
      markDirty();
    };
    input.click();
  }

  // --- Reorder ----------------------------------------------------------
  const { default: Sortable } = await import('https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/+esm');
  const hint = Object.assign(document.createElement('div'), { id: 'cms-hint' });
  hint.dataset.cms = '';
  document.body.append(hint);

  // Repeated blocks = siblings sharing tag + first two classes (table rows, cards, FAQ, list items).
  const INLINE = /^(SPAN|A|STRONG|B|I|EM|BR|IMG|SVG|BUTTON|INPUT|LABEL|SELECT|TEXTAREA|H\d)$/;
  const sig = (el) => `${el.tagName}|${String(el.className).split(/\s+/).filter((c) => c && !c.startsWith('cms-')).slice(0, 2).join(' ')}`;
  const kidsOf = (el) => [...el.children].filter((c) => !c.matches('script,style,[data-cms]'));
  const sectionsList = document.querySelector('main section')?.parentElement;
  const findLists = (root) => [...root.querySelectorAll('*')].flatMap((el) => {
    if (el === sectionsList || el.closest('svg,[data-cms]')) return [];
    const kids = kidsOf(el);
    if (kids.length < 2) return [];
    const groups = {};
    kids.forEach((k) => (groups[sig(k)] ||= []).push(k));
    const items = Object.values(groups).sort((a, b) => b.length - a.length)[0];
    // Nearly-uniform groups only; layout columns (col-span-*) are cells of a row, not blocks to move.
    const uniform = items.length === kids.length || (kids.length >= 4 && items.length >= kids.length - 1);
    return items.length >= 2 && uniform && !INLINE.test(items[0].tagName) && !/\bcol-span-/.test(items[0].className) ? [[el, items]] : [];
  });

  // Only the innermost block under the mouse shows its buttons.
  let hot = null;
  document.addEventListener('mouseover', (e) => {
    const item = e.target.closest?.('.cms-item,.cms-sec');
    if (item === hot) return;
    hot?.classList.remove('cms-hot');
    (hot = item)?.classList.add('cms-hot');
  });

  let listCount = 0;
  const setupList = (list, items, isSec) => {
    const i = listCount++;
    const what = isSec ? 'secciones de la página' : 'bloques de este grupo';
    let dragging = false;
    const showZone = () => {
      list.classList.add('cms-zone');
      const r = list.getBoundingClientRect();
      hint.textContent = `Puedes mover este bloque dentro de la zona punteada (${what}). Arrastra y suelta donde aparezca el espacio verde.`;
      Object.assign(hint.style, { display: 'block', left: `${Math.max(8, r.left)}px`, top: `${Math.max(72, r.top - 52)}px` });
    };
    const hideZone = () => { if (!dragging) { list.classList.remove('cms-zone'); hint.style.display = 'none'; } };

    const addTools = (item) => {
      item.querySelectorAll(':scope > .cms-tools').forEach((t) => t.remove());
      if (getComputedStyle(item).position === 'static') item.classList.add('cms-rel');
      item.classList.add(isSec ? 'cms-sec' : 'cms-item');
      const tools = document.createElement('div');
      tools.className = 'cms-tools';
      tools.dataset.cms = '';
      tools.contentEditable = 'false';
      tools.innerHTML = `<button class="cms-move" data-cms-list="${i}" title="Arrastrar para cambiar el orden">⠿ Mover${isSec ? ' sección' : ''}</button>${isSec ? '<button class="cms-new" title="Insertar debajo una sección con otro diseño">＋ Nueva sección</button>' : ''}<button class="cms-dup" title="Agregar una copia debajo para editarla">＋ Duplicar</button><button class="cms-del" title="Eliminar">✕</button>`;
      const move = tools.querySelector('.cms-move');
      move.addEventListener('mouseenter', showZone);
      move.addEventListener('mouseleave', hideZone);
      tools.querySelector('.cms-dup').onclick = () => {
        const copy = item.cloneNode(true);
        copy.classList.remove('cms-hot');
        copy.querySelectorAll('.cms-hot').forEach((n) => n.classList.remove('cms-hot'));
        copy.querySelectorAll('.cms-tools').forEach((t) => t.remove());
        item.after(copy);
        addTools(copy);
        // Groups nested inside the copy are new elements: give them their own drag + buttons.
        new Set([...copy.querySelectorAll('.cms-item')].map((n) => n.parentElement))
          .forEach((l) => setupList(l, kidsOf(l).filter((k) => k.matches('.cms-item')), false));
        markDirty();
      };
      if (isSec) tools.querySelector('.cms-new').onclick = () => openLibrary(item);
      tools.querySelector('.cms-del').onclick = () => {
        if (kidsOf(list).filter((k) => k.matches('.cms-item,.cms-sec')).length < 2) return alert('Debe quedar al menos un bloque en este grupo.');
        if (!confirm('¿Eliminar este bloque? Podrás recuperarlo si sales sin guardar.')) return;
        item.remove();
        hideZone();
        markDirty();
      };
      item.prepend(tools);
    };
    items.forEach(addTools);

    Sortable.create(list, {
      handle: `.cms-move[data-cms-list="${i}"]`,
      draggable: isSec ? '.cms-sec' : '.cms-item',
      animation: 150,
      ghostClass: 'cms-ghost',
      onStart: () => { dragging = true; list.classList.add('cms-zone'); hint.style.display = 'none'; },
      onEnd: (e) => { dragging = false; hideZone(); if (e.oldIndex !== e.newIndex) markDirty(); },
    });
    return addTools;
  };
  const addSectionTools = sectionsList && setupList(sectionsList, kidsOf(sectionsList), true);
  findLists(document.querySelector('main')).forEach(([list, items]) => setupList(list, items, false));

  // --- Section library: every section design from the original pages -----
  let library;
  const loadLibrary = () => (library ||= Promise.all(Object.entries(BUILTIN).map(async ([s, name]) => {
    const doc = new DOMParser().parseFromString(await (await fetch(`/pages/${s}.html`)).text(), 'text/html');
    const scripts = [...doc.body.querySelectorAll('script:not([src])')].map((x) => x.textContent);
    return [...doc.querySelectorAll('main section')].map((sec) => ({
      sec, name, scripts,
      title: sec.querySelector('h1,h2,h3')?.textContent.trim().replace(/\s+/g, ' ') || 'Sección',
    }));
  })).then((a) => a.flat()));

  async function openLibrary(after) {
    const modal = document.createElement('div');
    modal.id = 'cms-lib';
    modal.dataset.cms = '';
    modal.innerHTML = `<div class="cms-lib-box"><div class="cms-lib-head"><strong>Elige el diseño de la nueva sección</strong><span>Se insertará debajo de la sección actual y luego editas su contenido.</span><button class="cms-lib-x">Cerrar ✕</button></div><div class="cms-lib-grid">Cargando diseños…</div></div>`;
    document.body.append(modal);
    const close = () => { modal.remove(); removeEventListener('keydown', onKey); };
    const onKey = (e) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    modal.querySelector('.cms-lib-x').onclick = close;
    modal.onclick = (e) => e.target === modal && close();

    const grid = modal.querySelector('.cms-lib-grid');
    let items;
    try { items = await loadLibrary(); } catch { library = null; grid.textContent = 'No se pudieron cargar los diseños. Intenta de nuevo.'; return; }
    grid.textContent = '';
    for (const it of items) {
      const card = document.createElement('button');
      card.className = 'cms-lib-card';
      card.innerHTML = '<div class="cms-lib-thumb"><div class="cms-lib-scale"></div></div><b></b><small></small>';
      card.querySelector('b').textContent = it.title;
      card.querySelector('small').textContent = `Diseño de: ${it.name}`;
      card.querySelector('.cms-lib-scale').append(document.importNode(it.sec, true));
      card.onclick = () => { close(); insertSection(it, after); };
      grid.append(card);
    }
  }

  function insertSection(it, after) {
    const sec = document.importNode(it.sec, true);
    after.after(sec);
    // Bring the source page's behaviour (FAQ, filters, wizard) along. Inserted as markup so it
    // does not run now, only when the saved page loads.
    const existing = [...document.body.querySelectorAll('script:not([src])')].map((x) => x.textContent);
    const anchor = document.querySelector('script[src="/editor.js"]');
    for (const code of it.scripts) {
      if (existing.includes(code) || /<\/script/i.test(code)) continue;
      anchor ? anchor.insertAdjacentHTML('beforebegin', `<script>${code}</script>`) : document.body.insertAdjacentHTML('beforeend', `<script>${code}</script>`);
    }
    makeEditable(sec);
    addSectionTools(sec);
    findLists(sec).forEach(([list, items]) => setupList(list, items, false));
    markDirty();
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- Rich text --------------------------------------------------------
  const rt = document.createElement('div');
  rt.id = 'cms-rt';
  rt.dataset.cms = '';
  rt.innerHTML = [['bold', '<b>B</b>', 'Negrita'], ['italic', '<i>I</i>', 'Cursiva'], ['underline', '<u>U</u>', 'Subrayado'], ['link', '🔗 Enlace', 'Enlace'], ['insertUnorderedList', '• Lista', 'Lista'], ['removeFormat', '⌫ Formato', 'Quitar formato']]
    .map(([c, l, t]) => `<button data-cmd="${c}" title="${t}">${l}</button>`).join('');
  document.body.append(rt);
  rt.addEventListener('mousedown', (e) => e.preventDefault()); // keep the text selection
  rt.addEventListener('click', (e) => {
    const cmd = e.target.closest('button')?.dataset.cmd;
    if (!cmd) return;
    if (cmd === 'link') {
      const url = prompt('Dirección del enlace (déjalo vacío para quitarlo):', 'https://');
      if (url === null) return;
      if (url && url !== 'https://') document.execCommand('createLink', false, url);
      else document.execCommand('unlink');
    } else {
      document.execCommand(cmd);
      if (cmd === 'removeFormat') document.execCommand('unlink');
    }
    // Tailwind resets list bullets and link styles; restore them on new elements.
    const node = getSelection().anchorNode?.parentElement;
    node?.closest('[contenteditable="true"]')?.querySelectorAll('ul:not([class]),a:not([class])').forEach((n) => n.classList.add(...(n.tagName === 'UL' ? ['list-disc', 'pl-5'] : ['underline'])));
    markDirty();
  });
  document.addEventListener('selectionchange', () => {
    const s = getSelection();
    const el = s.rangeCount && !s.isCollapsed && s.anchorNode?.parentElement?.closest('[contenteditable="true"]');
    if (!el || el.closest('[data-cms]')) return (rt.style.display = 'none');
    const r = s.getRangeAt(0).getBoundingClientRect();
    Object.assign(rt.style, { display: 'flex', left: `${Math.max(8, r.left)}px`, top: `${Math.max(8, r.top - 44)}px` });
  });
  // Paste as plain text so styles from Word or Google Docs don't leak in.
  document.addEventListener('paste', (e) => {
    if (!e.target.closest?.('[contenteditable="true"]') || e.target.closest('[data-cms]')) return;
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });

  // --- Link inspector: where each button/link goes, and change it ---------
  const WA_DEFAULT = 'https://wa.me/573196664089';
  const pagePath = (s) => (s === 'index' ? '/' : `/${s}`);
  const headingOf = (sec) => sec.querySelector('h1,h2,h3')?.textContent.trim().replace(/\s+/g, ' ') || 'Sección';
  const linkLabel = (href) => {
    if (!href || href === '#') return null;
    const page = Object.keys(PAGES).find((s) => pagePath(s) === href.replace(/\/$/, '') || (s === 'index' && href === '/'));
    if (page) return `Página «${PAGES[page]}»`;
    if (/wa\.me|whatsapp/i.test(href)) return `WhatsApp (${href.replace(/\D/g, '').replace(/^57/, '+57 ')})`;
    if (href.startsWith('#')) { const t = document.getElementById(href.slice(1)); return `Sección de esta página: «${t ? headingOf(t) : href}»`; }
    if (href.startsWith('mailto:')) return `Correo a ${href.slice(7)}`;
    if (href.startsWith('tel:')) return `Llamada a ${href.slice(4)}`;
    try { return `Sitio externo: ${new URL(href, location.href).host}`; } catch { return href; }
  };
  const buttonLabel = (b) =>
    b.matches('.faq-toggle') ? 'abre o cierra la respuesta de esta pregunta'
      : b.dataset.filter ? `filtra los casos por «${b.textContent.trim()}»`
      : /goToStep|validateStep|nextStep|prevStep/.test(b.getAttribute('onclick') || '') ? 'avanza o retrocede en los pasos del diagnóstico'
      : /selectSymptom/.test(b.getAttribute('onclick') || '') ? 'muestra la recomendación para ese síntoma'
      : b.type === 'submit' || b.closest('form') ? 'envía el formulario'
      : 'acción interactiva de esta sección';

  const chip = document.createElement('div');
  chip.id = 'cms-link';
  chip.dataset.cms = '';
  document.body.append(chip);
  let chipFor = null, editing = false, hideT;

  const place = () => {
    const r = chipFor.getBoundingClientRect();
    Object.assign(chip.style, { display: 'flex', left: `${Math.max(8, Math.min(r.left, innerWidth - 380))}px`, top: `${Math.min(r.bottom + 6, innerHeight - chip.offsetHeight - 70)}px` });
  };
  function showInfo(el) {
    clearTimeout(hideT);
    if (editing || (chipFor === el && chip.style.display === 'flex')) return;
    chipFor = el;
    if (el.tagName === 'BUTTON') {
      chip.innerHTML = '<span>⚙ Botón interactivo: <b></b>. No lleva a otra página.</span>';
      chip.querySelector('b').textContent = buttonLabel(el);
    } else {
      const label = linkLabel(el.getAttribute('href'));
      chip.innerHTML = `<span class="${label ? '' : 'cms-warn'}">🔗 Lleva a: <b></b></span><button class="cms-link-edit">Cambiar destino</button>`;
      chip.querySelector('b').textContent = (label || '⚠ Sin destino, no hace nada al hacer clic') + (el.target === '_blank' ? ' · pestaña nueva' : '');
      chip.querySelector('.cms-link-edit').onclick = () => editLink(el);
    }
    place();
  }
  const hideSoon = () => { clearTimeout(hideT); hideT = setTimeout(() => { if (!editing) chip.style.display = 'none'; }, 500); };

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest?.('#cms-link')) return clearTimeout(hideT);
    const el = !e.target.closest?.('[data-cms]') && e.target.closest?.('a[href],button');
    el ? showInfo(el) : hideSoon();
  });
  document.addEventListener('focusin', (e) => {
    const el = !e.target.closest('[data-cms]') && e.target.closest('a[href],button');
    if (el) showInfo(el);
  });
  addEventListener('scroll', () => { if (!editing) chip.style.display = 'none'; }, { passive: true });

  function editLink(a) {
    editing = true;
    const href = a.getAttribute('href') || '#';
    const sections = [...document.querySelectorAll('main section')];
    const kind = href === '#' ? '#' : Object.keys(PAGES).some((s) => pagePath(s) === href) ? href
      : /wa\.me|whatsapp/i.test(href) ? 'wa' : href.startsWith('#') ? 'sec' : 'url';
    chip.innerHTML = `
      <div class="cms-link-form">
        <label>¿A dónde debe llevar este botón?
          <select class="cms-kind">
            <optgroup label="Páginas del sitio">${Object.entries(PAGES).map(([s, n]) => `<option value="${pagePath(s)}">${esc(n)}</option>`).join('')}</optgroup>
            <option value="wa">WhatsApp</option>
            <option value="sec">Una sección de esta página</option>
            <option value="url">Otra dirección (sitio externo, correo, teléfono)</option>
            <option value="#">Sin destino</option>
          </select></label>
        <select class="cms-sec-pick">${sections.map((s, i) => `<option value="${i}"></option>`).join('')}</select>
        <input class="cms-url" placeholder="https://… · mailto:correo@… · tel:+57…">
        <label class="cms-row"><input type="checkbox" class="cms-blank"> Abrir en una pestaña nueva</label>
        <span class="cms-err" role="alert"></span>
        <div class="cms-row"><button class="cms-apply">Aplicar</button><button class="cms-cancel">Cancelar</button></div>
      </div>`;
    const $ = (q) => chip.querySelector(q);
    $('.cms-sec-pick').querySelectorAll('option').forEach((o, i) => (o.textContent = headingOf(sections[i])));
    $('.cms-kind').value = kind;
    $('.cms-url').value = kind === 'wa' ? href : kind === 'url' ? href : '';
    if (kind === 'sec') { const i = sections.findIndex((s) => `#${s.id}` === href); if (i >= 0) $('.cms-sec-pick').value = i; }
    $('.cms-blank').checked = a.target === '_blank';
    const sync = () => {
      const k = $('.cms-kind').value;
      $('.cms-sec-pick').hidden = k !== 'sec';
      $('.cms-url').hidden = !(k === 'wa' || k === 'url');
      if (k === 'wa' && !/wa\.me/.test($('.cms-url').value)) $('.cms-url').value = WA_DEFAULT;
      if (k === 'url' && /wa\.me/.test($('.cms-url').value)) $('.cms-url').value = '';
      $('.cms-err').textContent = '';
      place();
    };
    $('.cms-kind').onchange = sync;
    sync();
    const done = () => { editing = false; chipFor = null; showInfo(a); };
    $('.cms-cancel').onclick = done;
    $('.cms-apply').onclick = () => {
      const k = $('.cms-kind').value;
      let next = k;
      if (k === 'wa' || k === 'url') {
        next = $('.cms-url').value.trim();
        // Only real destinations: blocks javascript: and other schemes that would run code.
        if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[\d\s-]+)$/i.test(next)) return ($('.cms-err').textContent = 'Escribe una dirección que empiece por https://, mailto: o tel:');
      }
      if (k === 'sec') {
        const sec = sections[$('.cms-sec-pick').value];
        if (!sec.id) {
          const base = headingOf(sec).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seccion';
          let id = base, n = 2;
          while (document.getElementById(id)) id = `${base}-${n++}`;
          sec.id = id;
        }
        next = `#${sec.id}`;
      }
      a.setAttribute('href', next);
      if ($('.cms-blank').checked) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); a.removeAttribute('rel'); }
      markDirty();
      done();
    };
  }

  // --- Save -------------------------------------------------------------
  saveBtn.onclick = async () => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('[data-cms]').forEach((n) => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('[data-cms-edit]').forEach((n) => n.removeAttribute('data-cms-edit'));
    clone.querySelectorAll('[class*="cms-"]').forEach((n) => n.classList.remove('cms-rel', 'cms-zone', 'cms-ghost', 'cms-item', 'cms-sec', 'cms-hot'));
    clone.querySelectorAll('.faq-content').forEach((n) => (n.style.maxHeight = ''));
    clone.querySelectorAll('.faq-icon').forEach((n) => (n.style.transform = ''));
    clone.querySelectorAll('[class=""],[style=""]').forEach((n) => { if (!n.className) n.removeAttribute('class'); if (!n.getAttribute('style')) n.removeAttribute('style'); });

    saveBtn.disabled = true;
    status('Guardando…');
    const r = await api('/api/save', JSON.stringify({ slug, html: clone.innerHTML }), 'application/json');
    if (r.ok) { dirty = false; status('Guardado ✓ (visible en ~1 min)'); }
    else if (r.status === 401) { saveBtn.disabled = false; sessionExpired(); }
    else { saveBtn.disabled = false; status(`Error al guardar (${r.status})`); }
  };
})();
