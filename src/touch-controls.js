// A pointer gesture commits once, on release inside its original button.
// There are no repeat timers. Canceled, dragged, or secondary touches are inert.
export function bindTouchControls(root, dispatch) {
  let active = null;
  function clear() {
    if (active) delete active.button.dataset.pressed;
    active = null;
  }
  root.addEventListener('pointerdown', event => {
    const button = event.target.closest('button[data-control]');
    if (!button || button.disabled || active || !event.isPrimary || event.button !== 0) return;
    active = { button, id: event.pointerId, x: event.clientX, y: event.clientY };
    button.dataset.pressed = 'true';
    button.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', event => {
    if (active?.id === event.pointerId && Math.hypot(event.clientX - active.x, event.clientY - active.y) > 18) clear();
  });
  root.addEventListener('pointerup', event => {
    if (active?.id !== event.pointerId) return;
    const { button } = active, rect = button.getBoundingClientRect();
    clear();
    if (!button.disabled && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) dispatch(button.dataset.control);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) root.addEventListener(type, event => { if (active?.id === event.pointerId) clear(); });
  root.addEventListener('click', event => {
    const button = event.target.closest('button[data-control]');
    if (!button) return;
    // Ignore compatibility clicks after pointerup, but support keyboard and
    // assistive-technology activation (which has no pointer type or click count).
    event.preventDefault();
    if (!button.disabled && event.detail === 0 && !event.pointerType) dispatch(button.dataset.control);
  });
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
}
