/* ARK Studios swipe rows: drag a row left to reveal one action button (iOS style).
   swipeDecision is pure and tested; attachSwipe wires it to rows marked data-swipe:
   <div class="swipe" data-swipe><div class="swipe-act"><button data-act=…></button></div><div class="swipe-front">…</div></div> */
(function(){
"use strict";

const LOCK_PX = 8, FLICK = 0.5; // px before the axis locks; px/ms that counts as a flick

function swipeDecision({dx, dy, vx, width, open, end, cancel}){
  const base = open ? -width : 0;
  const rest = {offset: base, state: open ? 'open' : 'closed'};
  if(cancel) return {axis: null, ...rest}; // a cancelled gesture goes back to where it started
  if(Math.max(Math.abs(dx), Math.abs(dy)) < LOCK_PX) return {axis: null, ...rest};
  if(Math.abs(dx) <= Math.abs(dy)) return {axis: 'y', ...rest};
  const offset = Math.min(0, Math.max(-width, base + dx));
  if(!end) return {axis: 'x', offset, state: 'moving'};
  const opens = vx < -FLICK || (-offset > width / 2 && vx <= FLICK);
  return {axis: 'x', offset: opens ? -width : 0, state: opens ? 'open' : 'closed'};
}

// What a press does while a row may be open: a press elsewhere only closes it (and its click is swallowed),
// a tap on the open row's front closes it, a press on its action button runs normally.
function pressPlan({hasOpen, sameRow, onAction}){
  const none = {closeNow: false, closeOnTap: false, swallowClick: false, drag: !onAction};
  if(!hasOpen) return none;
  if(!sameRow) return {closeNow: true, closeOnTap: false, swallowClick: true, drag: false};
  return onAction ? {...none, drag: false} : {...none, closeOnTap: true};
}

function attachSwipe(root, onAction){
  let openRow = null, drag = null, swallowUntil = 0, swallowClick = false;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const front = row => row.querySelector('.swipe-front');
  const widthOf = row => (row.querySelector('.swipe-act') || {}).offsetWidth || 76;
  const place = (row, offset, animate) => {
    const f = front(row); if(!f) return;
    f.style.transition = animate && !reduced() ? 'transform .2s ease' : 'none';
    f.style.transform = offset ? `translateX(${offset}px)` : '';
  };
  const close = () => { if(openRow && openRow.isConnected) place(openRow, 0, true); openRow = null; };

  root.addEventListener('pointerdown', e => {
    const row = e.target.closest('[data-swipe]');
    swallowClick = false;
    const plan = pressPlan({hasOpen: !!(openRow && openRow.isConnected), sameRow: row === openRow, onAction: !!e.target.closest('.swipe-act')});
    if(openRow && !openRow.isConnected) openRow = null;
    if(plan.closeNow){ close(); swallowClick = plan.swallowClick; }
    if(!plan.drag || !row || e.button > 0) return;
    drag = {row, closeOnTap: plan.closeOnTap, x: e.clientX, y: e.clientY, open: row === openRow, width: widthOf(row), axis: null, id: e.pointerId, samples: [{x: e.clientX, t: e.timeStamp}]};
  });

  root.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    const dec = swipeDecision({dx: e.clientX - drag.x, dy: e.clientY - drag.y, vx: 0, width: drag.width, open: drag.open, end: false});
    if(dec.axis === 'y'){ drag = null; return; }
    if(dec.axis !== 'x') return;
    if(drag.axis !== 'x'){ drag.axis = 'x'; try{ drag.row.setPointerCapture(e.pointerId); }catch(err){} }
    drag.samples.push({x: e.clientX, t: e.timeStamp});
    drag.samples = drag.samples.filter(s => e.timeStamp - s.t <= 80);
    place(drag.row, dec.offset, false);
  });

  const finish = e => {
    if(!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if(e.type === 'pointercancel'){ if(d.axis === 'x') place(d.row, d.open ? -d.width : 0, true); return; }
    if(d.axis !== 'x'){
      if(d.closeOnTap){ close(); swallowUntil = performance.now() + 350; }
      return;
    }
    const first = d.samples[0], dt = Math.max(1, e.timeStamp - first.t);
    const dec = swipeDecision({dx: e.clientX - d.x, dy: e.clientY - d.y, vx: (e.clientX - first.x) / dt, width: d.width, open: d.open, end: true});
    place(d.row, dec.offset, true);
    openRow = dec.state === 'open' ? d.row : (openRow === d.row ? null : openRow);
    swallowUntil = performance.now() + 350; // a click right after a drag must not open the row (browsers often send none)
  };
  root.addEventListener('pointerup', finish);
  root.addEventListener('pointercancel', finish);

  root.addEventListener('click', e => {
    if(swallowClick || performance.now() < swallowUntil){ swallowClick = false; swallowUntil = 0; e.stopPropagation(); e.preventDefault(); return; }
    if(e.target.closest(".swipe-act [data-act]")){ if(typeof onAction === "function") onAction(); close(); }
  }, true);
}

const api = {swipeDecision, pressPlan, attachSwipe};
if(typeof module !== 'undefined' && module.exports) module.exports = api; else window.ArkSwipe = api;
})();
