(() => {
  const root = document.querySelector('[data-topic-browser]');
  if (!root) return;
  const button = root.querySelector('.topic-toggle');
  const panel = root.querySelector('.topic-panel');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  let closeTimer;
  let explicitlyOpened = false;
  function setOpen(open) {
    clearTimeout(closeTimer);
    if (!open) explicitlyOpened = false;
    root.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
  }
  button.addEventListener('click', () => {
    const open = !explicitlyOpened;
    explicitlyOpened = open;
    setOpen(open);
  });
  root.addEventListener('pointerenter', () => { if (hover.matches) setOpen(true); });
  root.addEventListener('pointerleave', () => {
    if (hover.matches) closeTimer = setTimeout(() => {
      if (!panel.contains(document.activeElement)) setOpen(false);
    }, 140);
  });
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget)) setOpen(false);
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { setOpen(false); button.focus(); }
    if (event.key === 'ArrowDown' && event.target === button) {
      event.preventDefault(); setOpen(true); panel.querySelector('.topic-option')?.focus();
    }
  });
  document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) setOpen(false); });
})();
