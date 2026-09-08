(() => {
  // Keep the complete AI workflow available without competing with the
  // operational overview during the primary demo. Add ?show-ai=1 to preview it.
  const queueAiVisible = new URLSearchParams(window.location.search).get('show-ai') === '1';
  const table = document.querySelector('.jq-table-wrap');
  if (!table) return;
  const role = localStorage.getItem('jobline-demo-persona') || 'manager';
  const technician = localStorage.getItem('jobline-demo-technician') || 'Dana Kim';
  const techOptions = ['Dana Kim','Marcus Reyes','Sana Patel'];
  const recommendations = {
    'Rosalind Kerr':'Dana Kim', 'Marcus Webb':'Marcus Reyes', 'Chen Residence':'Marcus Reyes'
  };
  const recommendationReasons = {
    'Rosalind Kerr':'Dana Kim ranks highest for thermostat and electrical-control experience, a nearby route, open capacity, and four previous visits to this customer.',
    'Chen Residence':'Marcus Reyes ranks highest because the request involves a leaking water heater, his strongest specialty, with the required installation experience and an available afternoon window.',
    'Marcus Webb':'Marcus Reyes ranks highest for plumbing and irrigation-adjacent experience; the recommendation balances skill fit against his heavier workload and travel time.'
  };
  const technicianProfiles = {
    'Dana Kim': {initials:'DK',role:'Senior HVAC technician',skills:'HVAC diagnostics, thermostats, electrical controls',availability:'Available Sep 3, 12–4 PM',distance:'3.2 mi · about 11 min',workload:'3 of 6 daily slots',history:'4 prior visits · 4.9 customer rating',constraint:'EPA Universal certified'},
    'Marcus Reyes': {initials:'MR',role:'Plumbing & installation specialist',skills:'Water heaters, plumbing, HVAC installation',availability:'Available Sep 3, 4–8 PM',distance:'8.7 mi · about 24 min',workload:'5 of 6 daily slots',history:'1 prior visit · 4.8 customer rating',constraint:'Best fit for water-heater work'},
    'Sana Patel': {initials:'SP',role:'Preventive maintenance technician',skills:'Commercial HVAC, tune-ups, recurring service',availability:'Available Sep 3, 8 AM–12 PM',distance:'5.4 mi · about 17 min',workload:'2 of 5 daily slots',history:'No prior visit · 4.9 overall rating',constraint:'Shift ends at 3 PM'}
  };
  const blockedCases = {
    'Alvarez Family': {
      category:'Part required', confidence:'High confidence · 92%', evidence:'Technician notes indicate the failed capacitor was replaced, but the system should be monitored before closure.',
      dependency:'Confirm stable cooling after a 24-hour monitoring period', owner:'Dana Kim', supplier:'NorthStar HVAC Supply · capacitor CAP-45/5-440V', inventory:'2 units available at Fairview warehouse', eta:'Sep 3, 10:00 AM',
      risk:'Promised window at risk in 7 hours', riskLevel:'High', proposedDate:'2026-09-03', proposedTime:'12-4 PM',
      customerMessage:'Hi Elena, we completed the capacitor replacement and are monitoring the system to confirm stable cooling. Dana is scheduled to verify performance on Sep 3 between 12–4 PM. We will update you if anything changes.',
      technicianMessage:'Follow-up approved for Alvarez Family. Verify temperature split, capacitor readings, and stable cooling. Add readings before closing the job.'
    },
    'Chen Residence': {
      category:'Safety check and part required', confidence:'Medium confidence · 78%', evidence:'The job reports a garage water-heater leak; technician diagnosis and water shutoff confirmation are still missing.',
      dependency:'Confirm water is shut off and diagnose the leaking component', owner:'Marcus Reyes', supplier:'Lakeview Plumbing Supply · universal T&P valve held for diagnosis', inventory:'1 compatible valve reserved pending model confirmation', eta:'Sep 3, 1:30 PM',
      risk:'Possible property-damage risk; same-day contact recommended', riskLevel:'Critical', proposedDate:'2026-09-03', proposedTime:'4-8 PM',
      customerMessage:'Hi, we are prioritizing your water-heater leak. Please confirm whether the water supply is shut off and send the model number if available. Marcus can arrive Sep 3 between 4–8 PM to diagnose and complete the repair if the reserved part is compatible.',
      technicianMessage:'Urgent Chen Residence visit proposed. Confirm shutoff, photograph model/serial number, diagnose leak source, and verify reserved T&P valve compatibility before installation.'
    }
  };
  let activeProposal = null;
  const auditKey = 'jobline-ai-audit';

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
  }
  function writeAudit(entry) {
    const audit = readJson(auditKey, []);
    audit.unshift(entry);
    localStorage.setItem(auditKey, JSON.stringify(audit.slice(0, 100)));
  }
  function changedFields(before, after) {
    const labels = {technician:'Technician',stage:'Stage',promisedDate:'Promised date',promisedTime:'Time window',completionSummary:'Completion summary',customerUpdateDraft:'Customer update'};
    return Object.keys(labels).filter(key => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null)).map(key => ({field:labels[key],before:before?.[key] ?? 'Not set',after:after?.[key] ?? 'Not set'}));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
  function rowValue(row, field) { return row.querySelector(`[data-field="${field}"]`)?.textContent.trim() || ''; }
  function completionSummaryFor(row) {
    const key = row.dataset.jobKey || row.dataset.customer;
    let activity = [];
    try { activity = JSON.parse(localStorage.getItem('jobline-job-activity') || '[]'); } catch {}
    const notes = activity.filter(item => item.text && (item.jobKey === key || (key === row.dataset.customer && item.customer === row.dataset.customer)));
    const usefulTechnicianNote = notes.find(item => item.author === technician && !/thank you|closing|customer update draft|job completed/i.test(item.text));
    const managerNote = notes.find(item => /manager/i.test(item.author || ''));
    const description = rowValue(row, 'description').replace(/(?:System|Dana Kim|Manager \/ Dispatcher):[\s\S]*$/i, '').trim();
    const parts = [`Completed work for ${row.dataset.customer}: ${description || 'service request completed'}.`];
    if (usefulTechnicianNote) parts.push(`Technician update: ${usefulTechnicianNote.text}`);
    if (managerNote) parts.push(`Manager follow-up: ${managerNote.text}`);
    return parts.join(' ');
  }
  function rankedCandidates(row, recommendedName) {
    const scoreSets = {
      'Rosalind Kerr':{'Dana Kim':94,'Sana Patel':82,'Marcus Reyes':68},
      'Chen Residence':{'Marcus Reyes':92,'Dana Kim':81,'Sana Patel':65},
      'Marcus Webb':{'Marcus Reyes':89,'Sana Patel':78,'Dana Kim':66}
    };
    const scores = scoreSets[row.dataset.customer] || {'Dana Kim':88,'Sana Patel':81,'Marcus Reyes':74};
    return techOptions.map(name => ({name,score:scores[name] || 70,...technicianProfiles[name]})).sort((a,b) => b.score - a.score || (a.name === recommendedName ? -1 : 1));
  }
  function blockedCaseFor(row, assigned) {
    return blockedCases[row.dataset.customer] || {
      category:'Operational dependency', confidence:'Needs confirmation · 64%', evidence:'The job is blocked, but the most recent activity does not identify a confirmed resolution.',
      dependency:'Confirm the blocker and required resource', owner:assigned || 'Manager / Dispatcher', supplier:'No supplier selected', inventory:'Availability not confirmed', eta:'ETA requires confirmation',
      risk:'Promised date may be missed', riskLevel:'Medium', proposedDate:'2026-09-04', proposedTime:'12-4 PM',
      customerMessage:`Hi, your ${row.dataset.customer} service is temporarily paused while we confirm the next required step. We will provide a revised appointment after the dispatcher reviews the issue.`,
      technicianMessage:'Review the blocker, confirm the missing requirement, and update the job before work resumes.'
    };
  }
  function recommendationFor(row) {
    const customer = row.dataset.customer;
    const stage = row.dataset.stage || rowValue(row, 'stage');
    const assigned = rowValue(row, 'technician').replace(/^[A-Z]{2}\s*/, '').trim();
    if (role === 'technician') {
      if (stage === 'Scheduled') return {label:'Start job',kind:'stage',stage:'In Progress',reason:'The job is scheduled and assigned to you. Starting it updates the shared progress view.'};
      if (stage === 'In Progress') return {label:'Complete + summary',kind:'complete',stage:'Done',reason:'The job is already in progress. AI can prepare the completion entry and customer-history update.'};
      if (stage === 'Blocked') return {label:'Resume job',kind:'stage',stage:'In Progress',reason:'Resume after confirming that the blocker has been resolved.'};
      return {label:'Review summary',kind:'summary',stage,reason:'AI combines the completed job details and activity notes into one concise draft. Review or edit it before adding it to the job record.'};
    }
    if (stage === 'Blocked') {
      const resolution = blockedCaseFor(row, assigned);
      return {label:'Resolve blocker',kind:'blocked',stage:'Scheduled',technician:resolution.owner,reason:'The resolution agent classified the blocker, checked operational dependencies, assessed promised-date risk, and prepared a reviewable recovery plan.'};
    }
    if (!assigned || assigned.includes('Unassigned') || ['New','Unassigned'].includes(stage)) {
      const suggestedTech = recommendations[customer] || techOptions[Math.abs(customer.length) % techOptions.length];
      return {label:'Assign & schedule',kind:'assign',stage:'Scheduled',technician:suggestedTech,reason:recommendationReasons[customer] || `${suggestedTech} ranks highest after comparing skill fit, availability, route distance, workload, and customer history.`};
    }
    if (stage === 'Scheduled') return {label:'Confirm readiness',kind:'stage',stage:'In Progress',reason:'The technician and schedule are confirmed. Review before marking work as started.'};
    if (stage === 'In Progress') return {label:'Draft update',kind:'note',stage,reason:'AI can prepare a concise progress update from the current job context.'};
    return {label:'Create summary',kind:'summary',stage,reason:'Prepare a concise record of the completed work for customer history.'};
  }

  const head = table.querySelector('.jq-head');
  if (head && queueAiVisible) {
    head.classList.add('ai-enabled');
    const label = document.createElement('span');
    label.className = 'ai-head';
    label.textContent = 'AI suggested action';
    head.appendChild(label);
  }
  const proposalNotice = document.createElement('div');
  proposalNotice.className = 'ai-table-notice';
  proposalNotice.setAttribute('role','note');
  proposalNotice.innerHTML = '<strong>AI suggestions</strong><span>Simulated proposals only. Review and approve before any job data changes.</span>';
  if (queueAiVisible) {
    table.before(proposalNotice);
    table.querySelectorAll('.jq-row').forEach(row => {
      row.classList.add('ai-enabled');
      const proposal = recommendationFor(row);
      const cell = document.createElement('div');
      cell.className = 'ai-suggest-cell';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-suggest-btn';
      button.textContent = proposal.label;
      button.setAttribute('aria-label', `${proposal.label} for ${row.dataset.customer}`);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openReview(row, recommendationFor(row));
      });
      cell.appendChild(button);
      row.appendChild(cell);
    });
  }
  if (role === 'technician') {
    let sharedActivity = [];
    try { sharedActivity = JSON.parse(localStorage.getItem('jobline-job-activity') || '[]'); } catch {}
    table.querySelectorAll('.jq-row').forEach(row => {
      const latest = sharedActivity.find(item => item.text && (item.jobKey === row.dataset.jobKey || (row.dataset.jobKey === row.dataset.customer && item.customer === row.dataset.customer)));
      const description = row.querySelector('[data-field="description"]');
      if (!latest || !description || description.querySelector('.technician-note-preview')) return;
      const preview = document.createElement('span');
      preview.className = 'technician-note-preview';
      preview.textContent = `${latest.author || 'Team'}: ${latest.text}`;
      preview.title = preview.textContent;
      description.appendChild(preview);
    });
  }
  document.addEventListener('change', event => {
    const row = event.target.closest('.jq-row');
    if (!row) return;
    window.setTimeout(() => {
      const proposal = recommendationFor(row);
      const button = row.querySelector('.ai-suggest-btn');
      if (button) {
        button.textContent = proposal.label;
        button.setAttribute('aria-label', `${proposal.label} for ${row.dataset.customer}`);
      }
    }, 0);
  });

  const scrim = document.createElement('div');
  scrim.className = 'ai-review-scrim';
  scrim.id = 'aiReviewScrim';
  scrim.setAttribute('role', 'dialog');
  scrim.setAttribute('aria-modal', 'true');
  scrim.setAttribute('aria-labelledby', 'aiReviewTitle');
  scrim.innerHTML = `<section class="ai-review"><header class="ai-review-head"><div><h2 id="aiReviewTitle">Review AI proposal</h2><p id="aiReviewCustomer"></p></div><button class="ai-review-close" type="button" aria-label="Close AI proposal"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4.09 4.09a.75.75 0 0 1 1.06 0L10 8.94l4.85-4.85a.75.75 0 1 1 1.06 1.06L11.06 10l4.85 4.85a.75.75 0 1 1-1.06 1.06L10 11.06l-4.85 4.85a.75.75 0 1 1-1.06-1.06L8.94 10 4.09 5.15a.75.75 0 0 1 0-1.06Z"/></svg></button></header><div class="ai-review-body"><div class="ai-explanation"><strong>Why this is suggested</strong><span id="aiReviewReason"></span></div><ul class="ai-change-list" id="aiChangeList"></ul><div id="aiEditableFields"></div></div><footer class="ai-review-foot"><span class="ai-disclaimer">AI prepares a proposal. Nothing changes until you approve it.</span><div class="ai-review-actions"><button class="ai-secondary" type="button">Cancel</button><button class="ai-primary" id="aiApprove" type="button">Approve changes</button></div></footer></section>`;
  document.body.appendChild(scrim);
  const confirmation = document.createElement('div');
  confirmation.className = 'ai-confirmation';
  confirmation.setAttribute('role', 'region');
  confirmation.setAttribute('aria-live', 'polite');
  confirmation.setAttribute('aria-label', 'AI action confirmation');
  document.body.appendChild(confirmation);
  const auditScrim = document.createElement('div');
  auditScrim.className = 'ai-review-scrim ai-audit-scrim';
  auditScrim.setAttribute('role','dialog');
  auditScrim.setAttribute('aria-modal','true');
  auditScrim.setAttribute('aria-labelledby','aiAuditTitle');
  auditScrim.innerHTML = `<section class="ai-review ai-review-wide ai-audit-panel"><header class="ai-review-head"><div><h2 id="aiAuditTitle">AI activity</h2><p>Approved proposals and corrections for this prototype</p></div><button class="ai-review-close ai-audit-close" type="button" aria-label="Close AI activity"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4.09 4.09a.75.75 0 0 1 1.06 0L10 8.94l4.85-4.85a.75.75 0 1 1 1.06 1.06L11.06 10l4.85 4.85a.75.75 0 1 1-1.06 1.06L10 11.06l-4.85 4.85a.75.75 0 1 1-1.06-1.06L8.94 10 4.09 5.15a.75.75 0 0 1 0-1.06Z"/></svg></button></header><div class="ai-review-body ai-audit-list"></div></section>`;
  document.body.appendChild(auditScrim);
  function renderAudit() {
    const entries = readJson(auditKey, []);
    auditScrim.querySelector('.ai-audit-list').innerHTML = entries.length ? entries.map((entry,index) => {
      const canUndo = entry.kind !== 'create' && entry.decision === 'Approved' && !entries.slice(0,index).some(newer => newer.jobKey === entry.jobKey && newer.decision === 'Approved');
      return `<article class="ai-audit-entry"><div class="ai-audit-entry-head"><div><strong>${escapeHtml(entry.action)}</strong><span>${escapeHtml(entry.customer)}</span></div><div class="ai-audit-entry-actions"><span class="ai-audit-decision${entry.decision === 'Undone' ? ' undone' : ''}">${escapeHtml(entry.decision || 'Approved')}</span>${canUndo ? `<button type="button" data-audit-undo="${escapeHtml(entry.id)}">Undo approved action</button>` : ''}</div></div><dl><div><dt>Approved by</dt><dd>${escapeHtml(entry.approvedBy)}</dd></div><div><dt>When</dt><dd>${escapeHtml(new Date(entry.approvedAt).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}))}</dd></div><div><dt>Source</dt><dd>${escapeHtml(entry.source || 'Simulated AI proposal')}</dd></div></dl>${entry.humanOverride ? `<p class="ai-audit-override"><strong>Human override</strong><span>${escapeHtml(entry.humanOverride.field)}: AI suggested ${escapeHtml(entry.humanOverride.suggested)}; ${escapeHtml(entry.approvedBy)} approved ${escapeHtml(entry.humanOverride.approved)}.</span></p>` : ''}${entry.editedContent ? '<p class="ai-audit-override"><strong>Human edit</strong><span>The AI draft was edited before approval.</span></p>' : ''}${entry.changes?.length ? `<div class="ai-audit-changes">${entry.changes.map(change => `<p><strong>${escapeHtml(change.field)}</strong><span>${escapeHtml(change.before)} → ${escapeHtml(change.after)}</span></p>`).join('')}</div>` : '<p class="ai-audit-no-change">Reviewed content was added to job activity; operational fields were unchanged.</p>'}</article>`;
    }).join('') : '<div class="ai-audit-empty"><strong>No approved AI actions yet</strong><span>Approved proposals will appear here with the approver, time, and changes.</span></div>';
    auditScrim.querySelectorAll('[data-audit-undo]').forEach(button => button.addEventListener('click',() => undoAudit(button.dataset.auditUndo)));
  }
  function openAudit() { renderAudit(); auditScrim.classList.add('open'); auditScrim.querySelector('.ai-audit-close').focus(); }
  function closeAudit() { auditScrim.classList.remove('open'); }
  auditScrim.querySelector('.ai-audit-close').addEventListener('click',closeAudit);
  auditScrim.addEventListener('click',event => { if (event.target === auditScrim) closeAudit(); });
  if (role === 'manager' && queueAiVisible) {
    const toolbar = document.querySelector('.toolbar-left');
    if (toolbar) {
      const auditButton = document.createElement('button');
      auditButton.className = 'ghost-btn ai-audit-button';
      auditButton.type = 'button';
      auditButton.innerHTML = `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 1 0 8 8 .75.75 0 0 0-1.5 0 6.5 6.5 0 1 1-1.9-4.6l-1.55 1.55H17V3l-1.34 1.34A7.96 7.96 0 0 0 10 2Zm-.75 4v4.31l3.22 2.14.83-1.25-2.55-1.7V6h-1.5Z"/></svg><span>AI activity</span>`;
      auditButton.addEventListener('click',openAudit);
      toolbar.appendChild(auditButton);
    }
  }
  function showConfirmation(payload) {
    if (!payload) return;
    confirmation.innerHTML = `<div><strong>${escapeHtml(payload.title || 'AI action approved')}</strong><span>${escapeHtml(payload.message)}</span></div><div class="ai-confirmation-actions"><button type="button" data-ai-view-audit>View audit</button>${payload.undoAllowed ? '<button type="button" data-ai-undo>Undo</button>' : ''}<button type="button" aria-label="Dismiss confirmation" data-ai-dismiss>Dismiss</button></div>`;
    confirmation.classList.add('show');
    confirmation.querySelector('[data-ai-view-audit]')?.addEventListener('click',() => { confirmation.classList.remove('show'); openAudit(); });
    confirmation.querySelector('[data-ai-dismiss]')?.addEventListener('click',() => confirmation.classList.remove('show'));
    confirmation.querySelector('[data-ai-undo]')?.addEventListener('click',() => undoAudit(payload.auditId));
  }
  function undoAudit(auditId) {
    const audit = readJson(auditKey, []);
    const entry = audit.find(item => item.id === auditId);
    if (!entry || entry.decision === 'Undone') return;
    const updates = readJson('jobline-job-updates', {});
    if (entry.before == null) delete updates[entry.jobKey]; else updates[entry.jobKey] = entry.before;
    localStorage.setItem('jobline-job-updates',JSON.stringify(updates));
    const activity = readJson('jobline-job-activity', []).filter(item => item.aiAuditId !== auditId);
    localStorage.setItem('jobline-job-activity',JSON.stringify(activity));
    const notifications = readJson('jobline-notifications', []).filter(item => item.aiAuditId !== auditId);
    localStorage.setItem('jobline-notifications',JSON.stringify(notifications));
    entry.decision = 'Undone'; entry.undoneAt = new Date().toISOString(); entry.undoneBy = role === 'technician' ? technician : 'Manager / Dispatcher';
    localStorage.setItem(auditKey,JSON.stringify(audit));
    sessionStorage.setItem('jobline-ai-confirmation',JSON.stringify({title:'AI action undone',message:`${entry.action} was reversed. Shared views are being restored.`,undoAllowed:false,auditId}));
    location.reload();
  }
  const pendingConfirmation = sessionStorage.getItem('jobline-ai-confirmation');
  if (pendingConfirmation) {
    sessionStorage.removeItem('jobline-ai-confirmation');
    window.setTimeout(() => showConfirmation(JSON.parse(pendingConfirmation)), 150);
  }
  if (new URLSearchParams(location.search).get('open-ai-audit') === '1' && role === 'manager') window.setTimeout(openAudit,100);
  const closeReview = () => scrim.classList.remove('open');
  scrim.querySelector('.ai-review-close').addEventListener('click', closeReview);
  scrim.querySelector('.ai-secondary').addEventListener('click', closeReview);
  scrim.addEventListener('click', event => { if (event.target === scrim) closeReview(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeReview(); });

  function openReview(row, proposal) {
    activeProposal = {row, proposal};
    const customer = row.dataset.customer;
    document.getElementById('aiReviewCustomer').textContent = customer;
    document.getElementById('aiReviewReason').textContent = proposal.reason;
    const fields = document.getElementById('aiEditableFields');
    const changes = document.getElementById('aiChangeList');
    const currentStage = row.dataset.stage || rowValue(row, 'stage');
    let changeRows = [];
    let fieldHtml = '';
    if (proposal.kind === 'assign') {
      const candidates = rankedCandidates(row, proposal.technician);
      const jobContext = `${rowValue(row, 'description')} · ${row.dataset.customer} · ${rowValue(row, 'stage') || currentStage}`;
      changeRows = [['Technician', proposal.technician],['Stage',proposal.stage],['Schedule','Sep 3, 2026 · 12–4 PM']];
      fieldHtml = `<section class="ai-match-context"><strong>Job context considered</strong><span>${escapeHtml(jobContext)}</span><small>Recommendation uses simulated operational data for this prototype.</small></section><fieldset class="ai-candidates"><legend>Ranked technician matches</legend>${candidates.map((candidate,index) => `<label class="ai-candidate${candidate.name === proposal.technician ? ' selected' : ''}"><input type="radio" name="aiCandidate" value="${escapeHtml(candidate.name)}"${candidate.name === proposal.technician ? ' checked' : ''}><span class="ai-candidate-avatar">${candidate.initials}</span><span class="ai-candidate-main"><span class="ai-candidate-title"><strong>${escapeHtml(candidate.name)}</strong><em>${index === 0 ? 'Recommended' : 'Alternative'}</em></span><span>${escapeHtml(candidate.role)}</span><span class="ai-candidate-skills">${escapeHtml(candidate.skills)}</span><span class="ai-candidate-facts"><b>${candidate.score}% match</b> · ${escapeHtml(candidate.availability)} · ${escapeHtml(candidate.distance)}</span><span class="ai-candidate-facts">Workload: ${escapeHtml(candidate.workload)} · ${escapeHtml(candidate.history)}</span><small>${escapeHtml(candidate.constraint)}</small></span></label>`).join('')}</fieldset><label class="ai-label" for="aiTech">Manager selection</label><select class="ai-field" id="aiTech">${candidates.map(candidate => `<option${candidate.name === proposal.technician ? ' selected' : ''}>${candidate.name}</option>`).join('')}</select><div class="ai-schedule-grid"><div><label class="ai-label" for="aiDate">Schedule date</label><input class="ai-field" id="aiDate" type="date" value="2026-09-03"></div><div><label class="ai-label" for="aiTime">Time window</label><select class="ai-field" id="aiTime"><option>8 AM-12 PM</option><option selected>12-4 PM</option><option>4-8 PM</option></select></div></div>`;
    } else if (proposal.kind === 'blocked') {
      const resolution = blockedCaseFor(row, proposal.technician);
      activeProposal.resolution = resolution;
      changeRows = [['Detected blocker',resolution.category],['Risk',resolution.risk],['Owner',resolution.owner],['Proposed stage','Blocked → Scheduled after approval']];
      fieldHtml = `<section class="agent-case"><div class="agent-case-head"><span>Agent assessment</span><strong class="agent-risk agent-risk-${escapeHtml(resolution.riskLevel.toLowerCase())}">${escapeHtml(resolution.riskLevel)} risk</strong></div><dl><div><dt>Classification</dt><dd>${escapeHtml(resolution.category)} · ${escapeHtml(resolution.confidence)}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(resolution.evidence)}</dd></div><div><dt>Dependency</dt><dd>${escapeHtml(resolution.dependency)}</dd></div><div><dt>Parts / supplier</dt><dd>${escapeHtml(resolution.supplier)}</dd></div><div><dt>Inventory</dt><dd>${escapeHtml(resolution.inventory)}</dd></div><div><dt>Expected availability</dt><dd>${escapeHtml(resolution.eta)}</dd></div></dl></section><fieldset class="agent-actions"><legend>Approved actions to execute</legend><label><input type="checkbox" id="agentReserve" checked> Reserve or confirm the required part</label><label><input type="checkbox" id="agentSchedule" checked> Move job to Scheduled and create the follow-up visit</label><label><input type="checkbox" id="agentNotifyTech" checked> Notify ${escapeHtml(resolution.owner)} in Jobline</label><label><input type="checkbox" id="agentNotifyCustomer" checked> Prepare customer notification</label></fieldset><div class="ai-schedule-grid"><div><label class="ai-label" for="aiDate">Follow-up date</label><input class="ai-field" id="aiDate" type="date" value="${escapeHtml(resolution.proposedDate)}"></div><div><label class="ai-label" for="aiTime">Time window</label><select class="ai-field" id="aiTime"><option${resolution.proposedTime === '8 AM-12 PM' ? ' selected' : ''}>8 AM-12 PM</option><option${resolution.proposedTime === '12-4 PM' ? ' selected' : ''}>12-4 PM</option><option${resolution.proposedTime === '4-8 PM' ? ' selected' : ''}>4-8 PM</option></select></div></div><label class="ai-label" for="agentTechMessage">Technician instruction</label><textarea class="ai-field ai-textarea" id="agentTechMessage">${escapeHtml(resolution.technicianMessage)}</textarea><label class="ai-label" for="agentCustomerMessage">Customer update — editable preview</label><textarea class="ai-field ai-textarea agent-message" id="agentCustomerMessage">${escapeHtml(resolution.customerMessage)}</textarea><fieldset class="agent-channels"><legend>Customer delivery channels</legend><label><input type="checkbox" value="In-product" checked> In-product</label><label><input type="checkbox" value="Email" checked> Email preview</label><label><input type="checkbox" value="SMS" checked> SMS preview</label><small>Email and SMS are simulated in this prototype and are not actually sent.</small></fieldset>`;
    } else if (proposal.kind === 'stage') {
      changeRows = [['Stage',`${currentStage} → ${proposal.stage}`]];
      fieldHtml = `<label class="ai-label" for="aiStage">New stage</label><select class="ai-field" id="aiStage">${['Scheduled','In Progress','Blocked','Done'].map(stage => `<option${stage === proposal.stage ? ' selected' : ''}>${stage}</option>`).join('')}</select>`;
    } else if (proposal.kind === 'complete') {
      const completion = `Completed the scheduled service for ${customer}. Work was reviewed, the issue was resolved, and the service area was left ready for the customer.`;
      const customerUpdate = `Hi, your Jobline service is complete. The technician finished the requested work and added the service details to your account. Please contact us if you have any questions.`;
      changeRows = [['Stage',`${currentStage} → Done`],['Activity','Add completion summary'],['Customer history','Record completed job'],['Customer update','Save editable draft — not sent']];
      fieldHtml = `<label class="ai-label" for="aiCompletionSummary">Editable completion summary</label><textarea class="ai-field ai-textarea" id="aiCompletionSummary">${escapeHtml(completion)}</textarea><label class="ai-label" for="aiCustomerUpdate">Editable customer update</label><textarea class="ai-field ai-textarea" id="aiCustomerUpdate">${escapeHtml(customerUpdate)}</textarea>`;
      activeProposal.generatedText = {completion,customerUpdate};
    } else {
      const defaultNote = proposal.kind === 'summary' ? completionSummaryFor(row) : `Update for ${customer}: the job is ${currentStage.toLowerCase()} and the next step has been reviewed.`;
      changeRows = [['Job activity','Add reviewed completion summary']];
      fieldHtml = `<label class="ai-label" for="aiNote">Completion summary — review and edit</label><textarea class="ai-field ai-textarea" id="aiNote">${escapeHtml(defaultNote)}</textarea>`;
      activeProposal.generatedText = {note:defaultNote};
    }
    changes.innerHTML = changeRows.map(([label,value]) => `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`).join('');
    fields.innerHTML = fieldHtml;
    const isAssignment = proposal.kind === 'assign';
    const isAgentResolution = proposal.kind === 'blocked';
    scrim.querySelector('.ai-review').classList.toggle('ai-review-wide', isAssignment || isAgentResolution);
    if (isAssignment) {
      const techSelect = document.getElementById('aiTech');
      fields.querySelectorAll('input[name="aiCandidate"]').forEach(input => input.addEventListener('change', () => {
        techSelect.value = input.value;
        fields.querySelectorAll('.ai-candidate').forEach(card => card.classList.toggle('selected', card.contains(input)));
      }));
      techSelect.addEventListener('change', () => {
        const radio = [...fields.querySelectorAll('input[name="aiCandidate"]')].find(input => input.value === techSelect.value);
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
      });
    }
    document.getElementById('aiApprove').textContent = proposal.kind === 'complete' ? 'Approve and complete' : (proposal.kind === 'blocked' ? 'Approve resolution plan' : (proposal.kind === 'summary' && role === 'technician' ? 'Add summary' : 'Approve changes'));
    scrim.classList.add('open');
    scrim.querySelector('.ai-review-close').focus();
  }

  document.getElementById('aiApprove').addEventListener('click', () => {
    if (!activeProposal) return;
    const {row, proposal} = activeProposal;
    const key = row.dataset.jobKey || row.dataset.customer;
    let updates = {};
    try { updates = JSON.parse(localStorage.getItem('jobline-job-updates') || '{}'); } catch {}
    const before = updates[key] ? JSON.parse(JSON.stringify(updates[key])) : null;
    const next = {...(updates[key] || {})};
    if (proposal.kind === 'assign') {
      next.technician = document.getElementById('aiTech').value;
      next.stage = 'Scheduled';
      next.promisedDate = document.getElementById('aiDate').value;
      next.promisedTime = document.getElementById('aiTime').value;
      next.promisedShort = new Date(`${next.promisedDate}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    } else if (proposal.kind === 'blocked') {
      const resolution = activeProposal.resolution;
      const scheduleApproved = document.getElementById('agentSchedule').checked;
      next.technician = resolution.owner;
      next.stage = scheduleApproved ? 'Scheduled' : 'Blocked';
      next.promisedDate = document.getElementById('aiDate').value;
      next.promisedTime = document.getElementById('aiTime').value;
      next.promisedShort = new Date(`${next.promisedDate}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      next.blockerResolution = {category:resolution.category,dependency:resolution.dependency,partConfirmed:document.getElementById('agentReserve').checked,approvedAt:new Date().toISOString()};
    } else if (proposal.kind === 'stage') next.stage = document.getElementById('aiStage').value;
    else if (proposal.kind === 'complete') {
      next.stage = 'Done';
      next.completedAt = new Date().toISOString();
      next.completionSummary = document.getElementById('aiCompletionSummary').value.trim();
      next.customerUpdateDraft = document.getElementById('aiCustomerUpdate').value.trim();
    }
    updates[key] = next;
    localStorage.setItem('jobline-job-updates', JSON.stringify(updates));
    let activity = [];
    try { activity = JSON.parse(localStorage.getItem('jobline-job-activity') || '[]'); } catch {}
    const author = role === 'technician' ? technician : 'Manager / Dispatcher';
    const auditId = `ai-audit-${Date.now()}`;
    if (proposal.kind === 'complete') {
      activity.unshift({id:`activity-customer-${Date.now()}`,jobKey:key,customer:row.dataset.customer,text:`Customer update draft saved — not sent: ${next.customerUpdateDraft}`,author,createdAt:new Date().toISOString(),aiAuditId:auditId});
      activity.unshift({id:`activity-complete-${Date.now()}`,jobKey:key,customer:row.dataset.customer,text:`Job completed. ${next.completionSummary}`,author,createdAt:new Date().toISOString(),aiAuditId:auditId});
    } else if (proposal.kind === 'blocked') {
      const resolution = activeProposal.resolution;
      const techMessage = document.getElementById('agentTechMessage').value.trim();
      const customerMessage = document.getElementById('agentCustomerMessage').value.trim();
      const channels = [...document.querySelectorAll('.agent-channels input:checked')].map(input => input.value);
      activity.unshift({id:`activity-agent-${Date.now()}`,jobKey:key,customer:row.dataset.customer,text:`Blocker resolution approved: ${resolution.dependency}. Follow-up ${next.promisedShort}, ${next.promisedTime}.`,author:'Manager / Dispatcher',createdAt:new Date().toISOString(),aiAuditId:auditId});
      let notifications = [];
      try { notifications = JSON.parse(localStorage.getItem('jobline-notifications') || '[]'); } catch {}
      if (document.getElementById('agentNotifyTech').checked) notifications.unshift({id:`notification-tech-${Date.now()}`,recipient:resolution.owner,role:'technician',jobKey:key,customer:row.dataset.customer,title:'Blocked job ready for follow-up',message:techMessage,channels:['In-product'],createdAt:new Date().toISOString(),read:false,aiAuditId:auditId});
      notifications.unshift({id:`notification-manager-${Date.now()}`,recipient:'Manager / Dispatcher',role:'manager',jobKey:key,customer:row.dataset.customer,title:'Resolution plan approved',message:`${resolution.category}. ${resolution.dependency}. Job is now ${next.stage}.`,channels:['In-product'],createdAt:new Date().toISOString(),read:false,aiAuditId:auditId});
      if (document.getElementById('agentNotifyCustomer').checked) notifications.unshift({id:`notification-customer-${Date.now()}`,recipient:row.dataset.customer,role:'customer',jobKey:key,customer:row.dataset.customer,title:'Customer update prepared',message:customerMessage,channels,createdAt:new Date().toISOString(),read:false,simulated:true,aiAuditId:auditId});
      localStorage.setItem('jobline-notifications', JSON.stringify(notifications));
    } else {
      const note = document.getElementById('aiNote')?.value || (proposal.kind === 'assign' ? `AI-assisted assignment approved for ${next.technician}.` : `AI suggestion approved: ${proposal.label}.`);
      activity.unshift({id:`activity-${Date.now()}`,jobKey:key,customer:row.dataset.customer,text:note,author,createdAt:new Date().toISOString(),aiAuditId:auditId});
    }
    localStorage.setItem('jobline-job-activity', JSON.stringify(activity));
    const approvedAt = new Date().toISOString();
    const approvedTech = proposal.kind === 'assign' ? document.getElementById('aiTech').value : null;
    const humanOverride = proposal.kind === 'assign' && approvedTech !== proposal.technician ? {field:'Technician',suggested:proposal.technician,approved:approvedTech} : null;
    const editedContent = proposal.kind === 'complete' ? (document.getElementById('aiCompletionSummary').value.trim() !== activeProposal.generatedText?.completion || document.getElementById('aiCustomerUpdate').value.trim() !== activeProposal.generatedText?.customerUpdate) : (proposal.kind === 'summary' || proposal.kind === 'note') ? document.getElementById('aiNote')?.value.trim() !== activeProposal.generatedText?.note : false;
    writeAudit({id:auditId,jobKey:key,customer:row.dataset.customer,kind:proposal.kind,action:proposal.label,decision:'Approved',approvedBy:author,approvedAt,source:'Simulated AI proposal — human reviewed',before,after:next,changes:changedFields(before,next),humanOverride,editedContent});
    const message = proposal.kind === 'blocked' ? 'Resolution plan, activity, and preview notifications were updated.' : 'Approved changes are now synchronized across shared job views.';
    sessionStorage.setItem('jobline-ai-confirmation',JSON.stringify({title:`${proposal.label} approved`,message,auditId,undoAllowed:true}));
    closeReview();
    location.reload();
  });
})();
