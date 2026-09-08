(() => {
  const main = document.querySelector('main');
  if (main) {
    if (!main.id) main.id = 'mainContent';
    main.tabIndex = -1;
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = `#${main.id}`;
    skip.textContent = 'Skip to main content';
    document.body.prepend(skip);
  }

  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav').forEach(nav => {
    if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Primary navigation');
  });
  document.querySelectorAll('nav a').forEach(link => {
    const target = (link.getAttribute('href') || '').split('?')[0];
    const name = link.getAttribute('title') || link.textContent.trim();
    if (!link.getAttribute('aria-label') && name) link.setAttribute('aria-label', name);
    if (target === page || (page === 'index.html' && target === 'job-queue.html')) link.setAttribute('aria-current', 'page');
  });

  const live = document.createElement('div');
  live.className = 'sr-only';
  live.id = 'joblineA11yStatus';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  window.joblineAnnounce = message => {
    live.textContent = '';
    window.setTimeout(() => { live.textContent = message; }, 20);
  };

  let activeDialog = null;
  let returnFocus = null;
  const focusable = dialog => [...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
  const visible = el => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getAttribute('aria-hidden') !== 'true' && (el.offsetWidth > 0 || el.offsetHeight > 0);
  };
  const syncDialog = () => {
    const next = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].reverse().find(visible) || null;
    if (next === activeDialog) return;
    if (activeDialog && !next && returnFocus?.isConnected) returnFocus.focus();
    activeDialog = next;
    if (next) {
      returnFocus = document.activeElement;
      window.setTimeout(() => (next.querySelector('[autofocus]') || focusable(next)[0] || next).focus(), 30);
    }
  };
  new MutationObserver(syncDialog).observe(document.body, {attributes:true,subtree:true,attributeFilter:['class','hidden','aria-hidden','style']});
  document.addEventListener('keydown', event => {
    if (!activeDialog || event.key !== 'Tab') return;
    const items = focusable(activeDialog);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  syncDialog();
})();
