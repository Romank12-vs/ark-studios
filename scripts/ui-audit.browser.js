// Paste into the browser console (or run via the preview tools) on any ARK Studios screen, then call
// uiAudit(). It lists text smaller than 13px, tap targets smaller than 44x44px, and whether the page
// scrolls sideways. Not loaded by the app.
window.uiAudit = function uiAudit(){
  const visible = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]');
  };
  const name = el => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}"`;
  const smallText = [], smallTargets = [];
  document.querySelectorAll('body *').forEach(el => {
    if(!visible(el)) return;
    const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if(ownText && parseFloat(getComputedStyle(el).fontSize) < 13) smallText.push(name(el));
  });
  document.querySelectorAll('button, a[href], [data-act], input:not([type=hidden]), select, summary').forEach(el => {
    if(!visible(el) || el.closest('p') && el.tagName === 'A') return;
    if(el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) el = el.closest('label');
    const r = el.getBoundingClientRect();
    if(r.height < 43.5 || r.width < 43.5) smallTargets.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  return {smallText: [...new Set(smallText)], smallTargets: [...new Set(smallTargets)], overflowX: document.documentElement.scrollWidth > innerWidth};
};
