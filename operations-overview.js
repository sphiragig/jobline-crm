(() => {
  if (window.self !== window.top) return;
  const role = localStorage.getItem('jobline-demo-persona') || 'manager';
  const page = location.pathname.split('/').pop() || 'index.html';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

  function queueOverview() {
    if (role === 'technician') return;
    const filters = document.querySelector('.filters');
    const table = document.querySelector('.jq-table-wrap');
    if (!filters || !table) return;
    let overview = document.getElementById('operationsOverview');
    if (!overview) {
      overview = document.createElement('section');
      overview.id = 'operationsOverview';
      overview.className = 'ops-overview';
      overview.setAttribute('aria-label','Operational overview');
      filters.before(overview);
    }
    const rows = [...table.querySelectorAll('.jq-row')];
    const rowInfo = rows.map(row => {
      const cells = [...row.children].filter(element => !element.classList.contains('bulk-check'));
      const customer = row.dataset.customer || cells[2]?.textContent.trim() || '';
      const stage = row.dataset.stage || row.querySelector('[data-field="stage"]')?.textContent.trim() || '';
      const technician = row.querySelector('[data-tech-cell]')?.textContent.trim() || '';
      const days = Number((row.querySelector('[data-field="days"]')?.textContent || cells[9]?.textContent || '0').replace(/\D/g,'')) || 0;
      const marker = row.querySelector('[data-priority-marker]');
      const markerColor = marker ? getComputedStyle(marker).backgroundColor : '';
      const high = markerColor.includes('196, 49, 75') || /urgent/i.test(row.textContent);
      return {row,customer,stage,technician,days,high,jobKey:row.dataset.jobKey || customer};
    });
    const blocked = rowInfo.filter(job => job.stage === 'Blocked');
    const unassigned = rowInfo.filter(job => job.technician.includes('Unassigned') && !['Done'].includes(job.stage));
    const urgent = rowInfo.filter(job => job.high && job.stage !== 'Done');
    const atRisk = rowInfo.filter(job => job.stage !== 'Done' && (job.stage === 'Blocked' || job.days >= 4));
    const actions = [...blocked.map(job => ({...job,label:'Resolve blocker'})), ...rowInfo.filter(job => job.stage === 'New').map(job => ({...job,label:'Assign & schedule'}))].slice(0,4);
    overview.innerHTML = `<div class="ops-metrics"><article class="ops-metric danger"><div class="ops-metric-top"><span class="ops-metric-label">Urgent jobs</span><span class="ops-metric-icon">!</span></div><div class="ops-metric-value">${urgent.length}</div><div class="ops-metric-detail">High priority and still active</div></article><article class="ops-metric warning"><div class="ops-metric-top"><span class="ops-metric-label">Blocked</span><span class="ops-metric-icon">◆</span></div><div class="ops-metric-value">${blocked.length}</div><div class="ops-metric-detail">Waiting on a dependency</div></article><article class="ops-metric brand"><div class="ops-metric-top"><span class="ops-metric-label">Unassigned</span><span class="ops-metric-icon">○</span></div><div class="ops-metric-value">${unassigned.length}</div><div class="ops-metric-detail">Active jobs without an owner</div></article><article class="ops-metric warning"><div class="ops-metric-top"><span class="ops-metric-label">Promised-date risk</span><span class="ops-metric-icon">△</span></div><div class="ops-metric-value">${atRisk.length}</div><div class="ops-metric-detail">Blocked or open four-plus days</div></article></div>${actions.length ? `<div class="ops-attention"><span class="ops-attention-title">Needs attention</span><div class="ops-attention-list">${actions.map(job => `<a class="ops-action" href="job-detail-drawer.html?customer=${encodeURIComponent(job.customer)}${job.jobKey !== job.customer ? `&job=${encodeURIComponent(job.jobKey)}` : ''}"><b>${escapeHtml(job.customer)}</b><span>${escapeHtml(job.label)}</span></a>`).join('')}</div></div>` : ''}`;
    blocked.forEach(job => {
      const description = job.row.querySelector('[data-field="description"]');
      if (!description || description.querySelector('.ops-blocker-note')) return;
      const note = document.createElement('span');
      note.className = 'ops-blocker-note';
      note.textContent = job.customer === 'Chen Residence' ? 'Blocked: awaiting safety check and part confirmation' : 'Blocked: review the latest dependency';
      description.appendChild(note);
    });
  }

  function dispatchContext() {
    if (role === 'technician') return;
    const board = document.getElementById('dispatchBoard');
    if (!board) return;
    let context = document.getElementById('dispatchOperationsContext');
    if (!context) {
      context = document.createElement('section');
      context.id = 'dispatchOperationsContext';
      context.className = 'ops-dispatch-context';
      context.setAttribute('aria-label','Technician availability and workload');
      board.before(context);
    }
    const profiles = [
      {name:'Dana Kim',initials:'DK',capacity:6,status:'Available',next:'Next opening 12:30 PM'},
      {name:'Marcus Reyes',initials:'MR',capacity:6,status:'Limited capacity',next:'Next opening 4:00 PM'},
      {name:'Sana Patel',initials:'SP',capacity:5,status:'Available',next:'Next opening 2:30 PM'}
    ];
    const cards = [...board.querySelectorAll('.card')];
    context.innerHTML = profiles.map(profile => {
      const assigned = cards.filter(card => card.dataset.technician === profile.name && card.closest('.col')?.dataset.status !== 'Done').length;
      const percent = Math.min(100,Math.round(assigned/profile.capacity*100));
      return `<article class="ops-tech-card"><span class="ops-tech-avatar">${profile.initials}</span><div><div class="ops-tech-head"><strong>${escapeHtml(profile.name)}</strong><span class="ops-availability${profile.status.includes('Limited') ? ' limited' : ''}">${escapeHtml(profile.status)}</span></div><div class="ops-tech-meta">${assigned} active jobs · ${escapeHtml(profile.next)}</div><div class="ops-load" aria-label="${assigned} of ${profile.capacity} slots assigned"><span style="width:${percent}%"></span></div></div></article>`;
    }).join('') + '<a class="ops-context-link" href="index.html">Open Job Queue →</a>';
    board.querySelectorAll('.card').forEach(card => {
      if (card.closest('.col')?.dataset.status !== 'Blocked' || card.querySelector('.ops-card-alert')) return;
      const alert = document.createElement('p');
      alert.className = 'ops-card-alert';
      alert.textContent = card.dataset.customer === 'Chen Residence' ? 'Awaiting safety check and part confirmation' : 'Dependency requires review';
      card.querySelector('.card-bottom')?.before(alert);
    });
  }

  if (page === 'index.html') {
    queueOverview();
    document.addEventListener('change', event => { if (event.target.closest('.jq-row')) setTimeout(queueOverview,0); });
  } else if (page === 'dispatch-board.html') dispatchContext();
})();
