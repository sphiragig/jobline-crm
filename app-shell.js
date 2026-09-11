(() => {
  if (window.self !== window.top || new URLSearchParams(location.search).get('modal') === '1') return;

  const rail = document.querySelector('nav.rail');
  let search = document.querySelector('.top-search');
  if (!rail) return;

  const primaryNavigation = [...rail.children].find(child =>
    child.querySelector?.(':scope > a.rail-btn')
  );
  primaryNavigation?.classList.add('jobline-shell-nav-items');

  document.body.classList.add('jobline-shell');

  const header = document.createElement('header');
  header.className = 'jobline-shell-header';
  header.setAttribute('aria-label', 'Jobline application header');
  header.innerHTML = `
    <a class="jobline-shell-brand" href="index.html" aria-label="Jobline home">
      <span class="jobline-shell-mark" aria-hidden="true">J</span>
      <span>Jobline CRM</span>
    </a>
    <div class="jobline-shell-center"></div>
    <div class="jobline-shell-right"></div>`;
  document.body.prepend(header);

  if (!search) {
    search = document.createElement('div');
    search.className = 'top-search';
    search.innerHTML = `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M17 17 13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><input class="search-input" type="search" placeholder="Search jobs, customers..." aria-label="Search jobs and customers">`;
  }
  header.querySelector('.jobline-shell-center').appendChild(search);
  const searchInput = search.querySelector('input');
  const page = location.pathname.split('/').pop() || 'index.html';
  const initialSearch = new URLSearchParams(location.search).get('search');
  if (page === 'index.html' && initialSearch && searchInput) {
    searchInput.value = initialSearch;
    searchInput.dispatchEvent(new Event('input', { bubbles:true }));
  }
  if (page === 'customers-list.html' && searchInput) {
    searchInput.placeholder = 'Search customers...';
    searchInput.setAttribute('aria-label', 'Search customers');
    searchInput.addEventListener('input', event => {
      const term = event.target.value.trim().toLowerCase();
      document.querySelectorAll('.cust-card').forEach(card => {
        card.style.display = !term || card.textContent.toLowerCase().includes(term) ? 'block' : 'none';
      });
    });
  } else if (page !== 'index.html' && searchInput) {
    searchInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || !searchInput.value.trim()) return;
      location.href = `index.html?search=${encodeURIComponent(searchInput.value.trim())}`;
    });
  }

  const right = header.querySelector('.jobline-shell-right');
  const notification = document.querySelector('.notification-bell');
  if (notification) right.appendChild(notification);

  const switcher = document.querySelector('.persona-switcher');
  if (switcher) {
    const role = localStorage.getItem('jobline-demo-persona') || 'manager';
    const technician = localStorage.getItem('jobline-demo-technician') || 'Dana Kim';
    const isTechnician = role === 'technician';
    const name = isTechnician ? technician : 'Manager / Dispatcher';
    const meta = isTechnician ? 'Technician' : 'Full access';
    const initials = isTechnician
      ? technician.split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase()
      : 'MD';
    const button = switcher.querySelector('button');
    if (button) {
      button.innerHTML = `<span class="shell-profile-avatar" aria-hidden="true">${initials}</span><span class="shell-profile-copy"><strong>${name}</strong><span>${meta}</span></span><svg class="shell-profile-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5.22 7.97a.75.75 0 0 1 1.06 0L10 11.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.03a.75.75 0 0 1 0-1.06Z"/></svg>`;
      button.setAttribute('aria-label', `${name}. Switch role`);
      button.title = `${name} — Switch role`;
    }
    right.appendChild(switcher);
  }
})();
