const moves = {w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};

// Only deliberate held movement schedules another action. The simulation has no timer.
export function bindKeyboardMovement(step, ready) {
  const pressed = new Set();
  let active = null, timer;
  const stop = () => { active = null; clearTimeout(timer); };
  const editable = target => target?.closest?.('input,textarea,select,[contenteditable="true"],[role="tablist"]');
  function repeat() {
    if (!active || !ready() || document.hidden || editable(document.activeElement)) { stop(); return; }
    step({type:'move',dx:moves[active][0],dy:moves[active][1]});
    if (active) timer = setTimeout(repeat,150);
  }
  window.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if (!moves[key]) return;
    if (editable(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    if (event.repeat || pressed.has(key)) return;
    pressed.add(key);
    stop();
    if (!ready()) return;
    active=key;
    step({type:'move',dx:moves[key][0],dy:moves[key][1]});
    if (active) timer=setTimeout(repeat,300);
  });
  window.addEventListener('keyup',event=>{
    const key=event.key.toLowerCase();pressed.delete(key);if(active===key)stop();
  });
  window.addEventListener('blur',()=>{stop();pressed.clear();});
  document.addEventListener('visibilitychange',()=>{stop();pressed.clear();});
  window.addEventListener('pointerdown',stop);
  return stop;
}
