(() => {
  if (window.self !== window.top || new URLSearchParams(location.search).get('modal') === '1') return;
  const ROLE_KEY = 'jobline-demo-persona';
  const TECH_KEY = 'jobline-demo-technician';
  const technicians = ['Dana Kim', 'Marcus Reyes', 'Sana Patel'];
  const baseCustomerAssignments = {
    'Alvarez Family':'Marcus Reyes',
    'Meadowbrook HOA':'Dana Kim',
    'Okafor & Sons Bakery':'Sana Patel',
    'Tobias Lindqvist':'Marcus Reyes',
    'Dana Whitfield':'Dana Kim',
    'Priya Natarajan':'Sana Patel'
  };
  let role = localStorage.getItem(ROLE_KEY) || '';
  let technician = localStorage.getItem(TECH_KEY) || 'Dana Kim';

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function showSignIn() {
    let overlay = document.getElementById('personaSignIn');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'personaSignIn';
      overlay.className = 'persona-signin';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'personaTitle');
      overlay.innerHTML = `<div class="persona-card"><div class="persona-brand"><div class="persona-logo">J</div><div><h1 id="personaTitle">Welcome to Jobline</h1><p style="margin:2px 0 0;color:#616161">Choose a role to start the demo</p></div></div><div class="persona-options"><button class="persona-option" type="button" data-persona="manager"><strong>Manager / Dispatcher</strong><span>Manage all jobs, assignments, technicians, dispatch, and customer history.</span></button><button class="persona-option" type="button" data-persona="technician"><strong>Technician</strong><span>View assigned work, update progress, add notes, and review relevant job information.</span></button></div><div class="persona-tech-select" id="personaTechSelect" hidden><label for="personaTechnician">Demo technician</label><select id="personaTechnician">${technicians.map(name => `<option${name === technician ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></div><div class="persona-actions"><span class="persona-hint">Demo-only role selection; no password required.</span><button class="persona-continue" id="personaContinue" type="button" disabled>Continue</button></div></div>`;
      document.body.appendChild(overlay);
      let selected = '';
      overlay.querySelectorAll('[data-persona]').forEach(button => button.addEventListener('click', () => {
        selected = button.dataset.persona;
        overlay.querySelectorAll('[data-persona]').forEach(item => item.classList.toggle('selected', item === button));
        document.getElementById('personaTechSelect').hidden = selected !== 'technician';
        document.getElementById('personaContinue').disabled = false;
      }));
      document.getElementById('personaContinue').addEventListener('click', () => {
        if (!selected) return;
        localStorage.setItem(ROLE_KEY, selected);
        if (selected === 'technician') localStorage.setItem(TECH_KEY, document.getElementById('personaTechnician').value);
        location.reload();
      });
    }
    overlay.hidden = false;
  }

  function addSwitcher() {
    const isTech = role === 'technician';
    const wrapper = document.createElement('div');
    wrapper.className = 'persona-switcher';
    wrapper.setAttribute('aria-label', 'Current demo role');
    wrapper.innerHTML = `<div class="persona-switcher-badge">${isTech ? escapeHtml(technician.split(' ').map(x => x[0]).join('')) : 'MD'}</div><div class="persona-switcher-copy"><strong>${isTech ? escapeHtml(technician) : 'Manager / Dispatcher'}</strong><span>${isTech ? 'Technician' : 'Full access'}</span></div><button type="button">Switch role</button>`;
    const switchButton = wrapper.querySelector('button');
    switchButton.title = `${isTech ? technician + ' · Technician' : 'Manager / Dispatcher'} — Switch role`;
    switchButton.addEventListener('click', () => {
      localStorage.removeItem(ROLE_KEY);
      showSignIn();
    });
    const rail = document.querySelector('nav.rail');
    const railBottom = rail?.lastElementChild;
    if (railBottom) {
      wrapper.classList.add('persona-switcher-rail');
      const existingAvatar = railBottom.querySelector('.avatar:last-child');
      if (existingAvatar) existingAvatar.replaceWith(wrapper);
      else railBottom.appendChild(wrapper);
    } else document.body.appendChild(wrapper);
  }

  function addNotificationCenter() {
    let all = [];
    try { all = JSON.parse(localStorage.getItem('jobline-notifications') || '[]'); } catch {}
    const visible = all.filter(item => role === 'technician' ? item.role === 'technician' && item.recipient === technician : item.role === 'manager' || item.role === 'customer');
    const unread = visible.filter(item => !item.read).length;
    const bell = document.createElement('button');
    bell.type = 'button';
    bell.className = 'notification-bell';
    bell.setAttribute('aria-label', `${unread} unread notifications`);
    bell.innerHTML = `<span aria-hidden="true">♢</span>${unread ? `<b>${unread}</b>` : ''}`;
    const panel = document.createElement('aside');
    panel.className = 'notification-panel';
    panel.hidden = true;
    panel.innerHTML = `<header><div><h2>Notifications</h2><p>${role === 'technician' ? escapeHtml(technician) : 'Manager / Dispatcher'}</p></div><button type="button" aria-label="Close notifications">×</button></header><div class="notification-list">${visible.length ? visible.map(item => `<a href="job-detail-drawer.html?customer=${encodeURIComponent(item.customer)}&job=${encodeURIComponent(item.jobKey)}" data-notification-id="${escapeHtml(item.id)}" class="notification-item${item.read ? '' : ' unread'}"><span class="notification-dot"></span><span><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.customer)}</em><span>${escapeHtml(item.message)}</span><small>${new Date(item.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · ${escapeHtml((item.channels || ['In-product']).join(', '))}${item.simulated ? ' · Preview only' : ''}</small></span></a>`).join('') : '<p class="notification-empty">No notifications yet.</p>'}</div>${unread ? '<button class="notification-read-all" type="button">Mark all as read</button>' : ''}`;
    document.body.append(bell,panel);
    const close = () => { panel.hidden = true; bell.setAttribute('aria-expanded','false'); };
    bell.addEventListener('click', () => { panel.hidden = !panel.hidden; bell.setAttribute('aria-expanded', String(!panel.hidden)); });
    panel.querySelector('header button').addEventListener('click', close);
    panel.querySelectorAll('[data-notification-id]').forEach(link => link.addEventListener('click', () => {
      const item = all.find(entry => entry.id === link.dataset.notificationId);
      if (item) item.read = true;
      localStorage.setItem('jobline-notifications', JSON.stringify(all));
    }));
    panel.querySelector('.notification-read-all')?.addEventListener('click', () => {
      const ids = new Set(visible.map(item => item.id));
      all.forEach(item => { if (ids.has(item.id)) item.read = true; });
      localStorage.setItem('jobline-notifications', JSON.stringify(all));
      location.reload();
    });
  }

  function hideByText(selector, text) {
    document.querySelectorAll(selector).forEach(el => {
      if (el.textContent.trim().includes(text)) el.classList.add('persona-hidden');
    });
  }

  function restrictPage(title, message) {
    const panel = document.createElement('section');
    panel.className = 'persona-restricted';
    panel.innerHTML = `<div class="persona-restricted-card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="index.html">Go to My Jobs</a></div>`;
    document.body.appendChild(panel);
  }

  function technicianNameFromRow(row) {
    const techCell = row.querySelector('[data-tech-cell]');
    if (techCell) return techCell.textContent.trim();
    const cells = row.children;
    return cells[7]?.textContent?.trim() || cells[5]?.textContent?.trim() || '';
  }

  function filterTechnicianRows() {
    const rows = document.querySelectorAll('.jq-row');
    let activity = [];
    try { activity = JSON.parse(localStorage.getItem('jobline-job-activity') || '[]'); } catch {}
    let repairedAuthors = false;
    const technicianFirstName = technician.split(/\s+/)[0];
    activity = activity.map(item => {
      const looksManagerAddressed = technicianFirstName && new RegExp(`^${technicianFirstName}\\s*[-,:]`, 'i').test(String(item.text || '').trim());
      if (item.author === technician && looksManagerAddressed) {
        repairedAuthors = true;
        return { ...item, author:'Manager / Dispatcher' };
      }
      return item;
    });
    if (repairedAuthors) localStorage.setItem('jobline-job-activity', JSON.stringify(activity));
    rows.forEach(row => {
      const assigned = technicianNameFromRow(row).includes(technician);
      row.classList.toggle('technician-job-hidden', !assigned);
      if (!assigned) return;
      const description = row.querySelector('[data-field="description"]');
      const latestNote = activity.find(item => item.text && (item.jobKey === row.dataset.jobKey || (row.dataset.jobKey === row.dataset.customer && item.customer === row.dataset.customer)));
      if (description && latestNote) {
        let preview = description.querySelector('.technician-note-preview');
        if (!preview) {
          preview = document.createElement('span');
          preview.className = 'technician-note-preview';
          description.appendChild(preview);
        }
        const author = latestNote.author || 'Team';
        const nextText = `${author}: ${latestNote.text}`;
        if (preview.textContent !== nextText) preview.textContent = nextText;
        preview.title = nextText;
      }
    });
    const heading = document.querySelector('main h1');
    if (heading && /Job Queue/i.test(heading.textContent)) heading.textContent = 'My Jobs';
    const subtitle = heading?.nextElementSibling;
    const visible = [...rows].filter(row => !row.classList.contains('technician-job-hidden')).length;
    if (subtitle) subtitle.textContent = `${visible} assigned ${visible === 1 ? 'job' : 'jobs'} for ${technician}`;
  }

  function applyTechnicianQueue() {
    hideByText('button,a', 'Bulk Assign');
    hideByText('button,a', 'New Job');
    document.querySelectorAll('[data-filter="Unassigned"], [data-filter="Scheduled"]').forEach(el => {
      if (el.dataset.filter === 'Unassigned') el.classList.add('persona-hidden');
    });
    filterTechnicianRows();
    const main = document.querySelector('main');
    if (main && !document.getElementById('technicianScopeNote')) {
      const note = document.createElement('p');
      note.id = 'technicianScopeNote';
      note.className = 'technician-only-note';
      note.textContent = 'Technician view: update the Stage field to start work, report a blocker, or complete a job. Open a job to review details and add notes.';
      const filters = main.querySelector('[data-filter]')?.parentElement;
      if (filters) filters.after(note);
    }
    document.addEventListener('click', event => {
      const field = event.target.closest('[data-field]');
      if (!field) return;
      if (field.dataset.field !== 'stage') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      setTimeout(() => field.querySelectorAll('option').forEach(option => {
        if (['New','Scheduled','Unassigned'].includes(option.value || option.textContent)) option.remove();
      }), 0);
    }, true);
    document.querySelectorAll('[data-field]:not([data-field="stage"])').forEach(el => el.classList.add('persona-forbidden-edit'));
    new MutationObserver(filterTechnicianRows).observe(document.querySelector('.jq-table-wrap') || document.body, {childList:true,subtree:true});
  }

  function applyTechnicianDrawer() {
    const assigned = document.getElementById('drawerTechName')?.textContent.trim();
    if (assigned && assigned !== technician) {
      restrictPage('Job not assigned to you', `This job is assigned to ${assigned}. Technician access is limited to relevant assignments.`);
      return;
    }
    document.getElementById('drawerReassignButton')?.classList.add('persona-hidden');
    document.getElementById('drawerEditButton')?.classList.add('persona-hidden');
    hideByText('button,a', 'Bulk Assign');
    hideByText('button,a', 'New Job');
    const activity = document.getElementById('drawerActivity');
    if (activity) {
      const note = document.createElement('p');
      note.className = 'technician-only-note';
      note.textContent = 'You can review this assignment and add job notes. Update progress from My Jobs.';
      activity.before(note);
    }
  }

  function filterTechnicianBoard() {
    const board = document.getElementById('dispatchBoard');
    if (!board) return;
    board.querySelectorAll('.col').forEach(column => {
      const status = column.dataset.status;
      if (status === 'Unassigned') {
        column.classList.add('persona-hidden');
        return;
      }
      column.querySelectorAll('.card').forEach(card => {
        card.classList.toggle('technician-job-hidden', card.dataset.technician !== technician);
        if (card.dataset.technician === technician && !card.querySelector('.persona-stage-control')) {
          const control = document.createElement('select');
          control.className = 'persona-stage-control';
          control.setAttribute('aria-label', `Update ${card.dataset.customer} stage`);
          ['Scheduled','In Progress','Blocked','Done'].forEach(stage => {
            const option = document.createElement('option');
            option.value = stage;
            option.textContent = stage;
            option.selected = stage === status;
            control.appendChild(option);
          });
          control.addEventListener('click', event => event.stopPropagation());
          control.addEventListener('change', event => {
            event.stopPropagation();
            let updates = {};
            try { updates = JSON.parse(localStorage.getItem('jobline-job-updates') || '{}'); } catch {}
            updates[card.dataset.jobKey] = { ...(updates[card.dataset.jobKey] || {}), stage:control.value };
            localStorage.setItem('jobline-job-updates', JSON.stringify(updates));
            let activity = [];
            try { activity = JSON.parse(localStorage.getItem('jobline-job-activity') || '[]'); } catch {}
            activity.unshift({ id:`activity-${Date.now()}`, jobKey:card.dataset.jobKey, customer:card.dataset.customer, text:`Stage changed to ${control.value}.`, author:technician, createdAt:new Date().toISOString() });
            localStorage.setItem('jobline-job-activity', JSON.stringify(activity));
            location.reload();
          });
          card.appendChild(control);
        }
      });
      const visibleCount = [...column.querySelectorAll('.card')].filter(card => !card.classList.contains('technician-job-hidden')).length;
      const count = column.querySelector('.count');
      if (count && count.textContent !== String(visibleCount)) count.textContent = visibleCount;
    });
  }

  function applyTechnicianDispatch() {
    const heading = document.querySelector('main h1');
    if (heading) heading.textContent = 'My Dispatch Board';
    const subtitle = heading?.nextElementSibling;
    if (subtitle) subtitle.textContent = `Drag an assigned job to update its stage for ${technician}`;
    hideByText('button,a', 'New Job');
    const onShift = [...document.querySelectorAll('span')].find(el => el.textContent.trim() === 'On shift');
    if (onShift?.parentElement) onShift.parentElement.classList.add('persona-hidden');
    const board = document.getElementById('dispatchBoard');
    if (board) {
      filterTechnicianBoard();
      new MutationObserver(filterTechnicianBoard).observe(board, {childList:true,subtree:true});
    }
    const main = document.querySelector('main');
    if (main && board) {
      const note = document.createElement('p');
      note.className = 'technician-only-note';
      note.textContent = 'Only your assigned customers are shown. Moving a card updates the shared job stage for managers and customer history.';
      board.before(note);
    }
  }

  function applyTechnicianRole() {
    document.querySelectorAll('a[title="Customers"]').forEach(el => el.classList.add('persona-hidden'));
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page === 'index.html') applyTechnicianQueue();
    else if (page === 'job-detail-drawer.html') applyTechnicianDrawer();
    else if (page === 'dispatch-board.html') applyTechnicianDispatch();
    else if (page === 'customers-list.html') restrictPage('Manager access required', 'Technicians open customer information only from one of their assigned jobs.');
    else if (page === 'customer-detail.html') {
      const customer = new URLSearchParams(location.search).get('customer') || '';
      const created = JSON.parse(localStorage.getItem('jobline-created-jobs') || '[]');
      const relevant = baseCustomerAssignments[customer] === technician || created.some(job => job.customer === customer && job.technician === technician);
      if (!relevant) restrictPage('Customer access limited', 'Open customer information from one of your assigned jobs.');
      document.getElementById('customerNewJob')?.classList.add('persona-hidden');
    } else if (page === 'new-job-form.html') restrictPage('Manager access required', 'Only managers and dispatchers can create jobs.');
  }

  if (!role) { showSignIn(); return; }
  addSwitcher();
  addNotificationCenter();
  document.documentElement.dataset.persona = role;
  if (role === 'technician') setTimeout(applyTechnicianRole, 0);
  window.addEventListener('storage', event => {
    if (['jobline-job-updates','jobline-created-jobs','jobline-job-activity','jobline-notifications'].includes(event.key)) {
      window.setTimeout(() => location.reload(), 120);
    }
  });
})();
