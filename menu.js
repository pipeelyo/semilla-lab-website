// Mobile menu: the design's <nav> is hidden below 1280px, so mirror its links into a toggle panel.
// Elements carry data-cms so the editor skips them and never saves them into the page.
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');
  const nav = header?.querySelector('nav');
  const actions = nav?.parentElement?.lastElementChild;
  if (!nav || !actions) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.cms = '';
  btn.className = 'xl:hidden flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-low text-primary hover:bg-surface-container transition-all';
  btn.setAttribute('aria-controls', 'menu-movil');
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  btn.append(icon);

  const panel = document.createElement('nav');
  panel.id = 'menu-movil';
  panel.dataset.cms = '';
  panel.setAttribute('aria-label', 'Menú principal');
  panel.className = 'xl:hidden flex flex-col gap-space-xs px-margin-mobile py-space-md bg-surface-container-lowest border-t border-surface-container shadow-md max-h-[calc(100vh-5rem)] overflow-y-auto';
  nav.querySelectorAll('a').forEach((a) => {
    const link = a.cloneNode(true);
    link.className = `px-space-md py-space-sm rounded-lg font-label-lg text-label-lg ${a.hasAttribute('aria-current') ? 'text-primary font-bold bg-surface-container' : 'text-on-surface hover:bg-surface-container'}`;
    panel.append(link);
  });

  const set = (open) => {
    panel.classList.toggle('hidden', !open); // class, not [hidden]: Tailwind's `flex` would override the attribute
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    icon.textContent = open ? 'close' : 'menu';
  };
  set(false);
  btn.addEventListener('click', () => set(panel.classList.contains('hidden')));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.classList.contains('hidden')) { set(false); btn.focus(); } });

  actions.append(btn);
  header.append(panel);
});
