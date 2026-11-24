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
    #cms-hint{position:fixed;z-index:9998;pointer-events:none;background:#14532d;color:#fff;font:13px/1.3 system-ui,sans-serif;padding:6px 10px;border-radius:8px;box-shadow:0 4px 12px #0003;max-width:280px;display:none}
    #cms-bar .cms-legend{display:flex;gap:6px;font-size:12px;color:#57534e}
    #cms-bar .cms-legend b{color:#fff;border-radius:4px;padding:0 5px}
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
    <span class="cms-legend">Pasa el mouse sobre un bloque: <b style="background:#15803d">⠿ Mover</b><b style="background:#15803d">＋ Duplicar</b><b style="background:#b91c1c">✕</b> · <b style="background:#c2410c">Sección</b></span>
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
  const hint = Object.assign(document.createElement('div'), { id: 'cms-hint' });
  hint.dataset.cms = '';
  document.body.append(hint);

  // Repeated blocks = siblings sharing tag + first two classes (table rows, cards, FAQ, list items).
  const INLINE = /^(SPAN|A|STRONG|B|I|EM|BR|IMG|SVG|BUTTON|INPUT|LABEL|SELECT|TEXTAREA|H\d)$/;
  const sig = (el) => `${el.tagName}|${String(el.className).split(/\s+/).filter((c) => c && !c.startsWith('cms-')).slice(0, 2).join(' ')}`;
  const kidsOf = (el) => [...el.children].filter((c) => !c.matches('script,style,[data-cms]'));
  const sectionsList = document.querySelector('main section')?.parentElement;
  const lists = sectionsList ? [[sectionsList, kidsOf(sectionsList)]] : [];
  for (const el of document.querySelectorAll('main *')) {
    if (el === sectionsList || el.closest('svg,[data-cms]')) continue;
    const kids = kidsOf(el);
    if (kids.length < 2) continue;
    const groups = {};
    kids.forEach((k) => (groups[sig(k)] ||= []).push(k));
    const items = Object.values(groups).sort((a, b) => b.length - a.length)[0];
    // Nearly-uniform groups only; layout columns (col-span-*) are cells of a row, not blocks to move.
    const uniform = items.length === kids.length || (kids.length >= 4 && items.length >= kids.length - 1);
    if (items.length >= 2 && uniform && !INLINE.test(items[0].tagName) && !/\bcol-span-/.test(items[0].className)) lists.push([el, items]);
  }

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
      tools.innerHTML = `<button class="cms-move" data-cms-list="${i}" title="Arrastrar para cambiar el orden">⠿ Mover${isSec ? ' sección' : ''}</button><button class="cms-dup" title="Agregar una copia debajo para editarla">＋ Duplicar</button><button class="cms-del" title="Eliminar">✕</button>`;
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
  };
  lists.forEach(([list, items], n) => setupList(list, items, n === 0 && list === sectionsList));

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
    else { saveBtn.disabled = false; status(`Error al guardar (${r.status})`); }
  };
})();
