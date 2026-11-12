(() => {
  const root = document.querySelector('[data-topic-browser]');
  if (!root) return;
  const button = root.querySelector('.topic-toggle');
  const panel = root.querySelector('.topic-panel');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  let closeTimer;
  let explicitlyOpened = false;
  let pointerInside = false;
  function insideRegion(event) {
    const triggerBox = button.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    // Treat the trigger, the visual gap and the entire popover as one region.
    return event.clientX >= Math.min(triggerBox.left, panelBox.left)
      && event.clientX <= Math.max(triggerBox.right, panelBox.right)
      && event.clientY >= triggerBox.top
      && event.clientY <= Math.max(triggerBox.bottom, panelBox.bottom);
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!pointerInside && !root.contains(document.activeElement)) setOpen(false);
    }, 300);
  }
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
  root.addEventListener('pointerenter', () => {
    if (hover.matches) { pointerInside = true; setOpen(true); }
  });
  panel.addEventListener('pointerenter', () => {
    pointerInside = true;
    clearTimeout(closeTimer);
  });
  root.addEventListener('pointerleave', event => {
    if (!hover.matches) return;
    pointerInside = insideRegion(event);
    if (!pointerInside) scheduleClose();
  });
  document.addEventListener('pointermove', event => {
    if (!hover.matches || button.getAttribute('aria-expanded') !== 'true') return;
    const wasInside = pointerInside;
    pointerInside = insideRegion(event);
    if (pointerInside) clearTimeout(closeTimer);
    else if (wasInside) scheduleClose();
  });
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget) && !pointerInside) setOpen(false);
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { setOpen(false); button.focus(); }
    if (event.key === 'ArrowDown' && event.target === button) {
      event.preventDefault(); setOpen(true); panel.querySelector('.topic-option')?.focus();
    }
  });
  document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) setOpen(false); });
})();
