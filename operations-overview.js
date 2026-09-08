(() => {
  if (window.self !== window.top) return;
  const role = localStorage.getItem('jobline-demo-persona') || 'manager';
  const page = location.pathname.split('/').pop() || 'index.html';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const metricIcon = name => {
    const paths = {
      urgent:'M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM9.25 6a.75.75 0 0 1 1.5 0v4.25a.75.75 0 0 1-1.5 0V6Zm.75 7.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
      blocked:'M7.8 2.5h4.4l3.3 3.3v4.4l-3.3 3.3H7.8l-3.3-3.3V5.8l3.3-3.3Zm1.45 3v4.25h1.5V5.5h-1.5Zm.75 6.75a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
      person:'M10 3a3.25 3.25 0 1 1 0 6.5A3.25 3.25 0 0 1 10 3Zm0 8c3.87 0 7 1.9 7 4.25 0 .41-.34.75-.75.75H3.75a.75.75 0 0 1-.75-.75C3 12.9 6.13 11 10 11Z',
      warning:'M8.7 3.18a1.5 1.5 0 0 1 2.6 0l6.06 10.57A1.5 1.5 0 0 1 16.06 16H3.94a1.5 1.5 0 0 1-1.3-2.25L8.7 3.18Zm.55 3.07v4.5h1.5v-4.5h-1.5ZM10 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'
    };
    return `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="${paths[name]}"/></svg>`;
  };

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
      (filters.closest('.queue-command-row') || filters).before(overview);
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
    const actionLinks = actions.map(job => `<a class="ops-action" href="job-detail-drawer.html?customer=${encodeURIComponent(job.customer)}${job.jobKey !== job.customer ? `&job=${encodeURIComponent(job.jobKey)}` : ''}"><b>${escapeHtml(job.customer)}</b><span>${escapeHtml(job.label)}</span></a>`);
    overview.innerHTML = `<div class="ops-metrics"><article class="ops-metric danger"><div class="ops-metric-top"><span class="ops-metric-label">Urgent jobs</span><span class="ops-metric-icon">${metricIcon('urgent')}</span></div><div class="ops-metric-value">${urgent.length}</div><div class="ops-metric-detail">High priority and still active</div></article><article class="ops-metric warning"><div class="ops-metric-top"><span class="ops-metric-label">Blocked</span><span class="ops-metric-icon">${metricIcon('blocked')}</span></div><div class="ops-metric-value">${blocked.length}</div><div class="ops-metric-detail">Waiting on a dependency</div></article><article class="ops-metric brand"><div class="ops-metric-top"><span class="ops-metric-label">Unassigned</span><span class="ops-metric-icon">${metricIcon('person')}</span></div><div class="ops-metric-value">${unassigned.length}</div><div class="ops-metric-detail">Active jobs without an owner</div></article><article class="ops-metric warning"><div class="ops-metric-top"><span class="ops-metric-label">Promised-date risk</span><span class="ops-metric-icon">${metricIcon('warning')}</span></div><div class="ops-metric-value">${atRisk.length}</div><div class="ops-metric-detail">Blocked or open four-plus days</div></article></div>${actions.length ? `<div class="ops-attention"><div class="ops-attention-summary"><span class="ops-attention-title">Needs attention</span>${actionLinks[0]}${actions.length > 1 ? `<button class="ops-attention-toggle" type="button" aria-expanded="false">View all (${actions.length})</button>` : ''}</div>${actions.length > 1 ? `<div class="ops-attention-list" hidden>${actionLinks.join('')}</div>` : ''}</div>` : ''}`;
    overview.querySelector('.ops-attention-toggle')?.addEventListener('click', event => {
      const list = overview.querySelector('.ops-attention-list');
      const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
      event.currentTarget.setAttribute('aria-expanded', String(!expanded));
      event.currentTarget.textContent = expanded ? `View all (${actions.length})` : 'Show less';
      list.hidden = expanded;
    });
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
