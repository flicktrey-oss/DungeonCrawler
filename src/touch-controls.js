// Validate a pointer gesture, then commit from its native click. Dispatching on
// pointerup could open a modal underneath the compatibility click and immediately
// activate its Return button. Native click commits once after release instead.
export function bindTouchControls(root, dispatch) {
  let active=null,pending=null;
  function clearActive(){if(active)delete active.button.dataset.pressed;active=null;}
  function cancel(){clearActive();pending=null;}
  root.addEventListener('pointerdown',event=>{
    if(!event.isPrimary){cancel();return;}
    const button=event.target.closest('button[data-control]');
    if(!button||button.disabled||active||!event.isPrimary||event.button!==0)return;
    pending=null;active={button,id:event.pointerId,x:event.clientX,y:event.clientY};button.dataset.pressed='true';button.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove',event=>{if(active?.id===event.pointerId&&Math.hypot(event.clientX-active.x,event.clientY-active.y)>18)cancel();});
  root.addEventListener('pointerup',event=>{
    if(active?.id!==event.pointerId)return;
    const{button}=active,rect=button.getBoundingClientRect();clearActive();
    if(!button.disabled&&event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom)pending=button;
  });
  root.addEventListener('pointercancel',cancel);
  root.addEventListener('lostpointercapture',event=>{if(active?.id===event.pointerId)cancel();});
  root.addEventListener('click',event=>{
    const button=event.target.closest('button[data-control]');if(!button)return;
    event.preventDefault();
    const allowed=pending===button||event.detail===0&&!event.pointerType;
    pending=null;if(!button.disabled&&allowed)dispatch(button.dataset.control);
  });
  window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);
}
