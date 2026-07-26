// Backend: a Google Apps Script Web App, backed by a Google Sheet. See README for how to change this URL.
const API_URL = 'https://script.google.com/macros/s/AKfycbx6FJhgpm2q8EO6HRcoPNCPq9afzsw08CJ1qvCxZfwefE5sp5DryOrFKhVWXAEYpeNNSg/exec';

const state = {
  active: [],
  log: [],
  isManager: sessionStorage.getItem('managerPin') !== null,
  managerName: sessionStorage.getItem('managerName') || ''
};

const el = (id) => document.getElementById(id);

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// GET = list tasks. POST uses text/plain content-type on purpose: it keeps the request
// a CORS "simple request" so the browser doesn't send a preflight OPTIONS, which Apps
// Script web apps can't answer. The Apps Script side parses the body as JSON regardless.
async function apiGet() {
  const res = await fetch(API_URL);
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(data.error);
  return data;
}

async function apiPost(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(data.error);
  return data;
}

async function refresh() {
  const data = await apiGet();
  state.active = data.active;
  state.log = data.log;
  renderActive();
  renderLog();
  el('activeCount').textContent = `(${state.active.length})`;
  el('logCount').textContent = `(${state.log.length})`;
}

function renderManagerUI() {
  el('managerStatus').textContent = state.isManager ? `Manager mode (${state.managerName || 'signed in'})` : 'Team member view';
  el('managerBtn').textContent = state.isManager ? 'Sign out' : 'Manager sign-in';
  document.querySelectorAll('.manager-only').forEach((n) => { n.hidden = !state.isManager; });
  renderActive();
}

function renderActive() {
  const list = el('activeList');
  list.innerHTML = '';
  el('activeEmpty').hidden = state.active.length > 0;
  state.active.forEach((t) => {
    const card = document.createElement('div');
    card.className = `task-card priority-${t.priority || 'Low'}`;
    const statusBadge = t.status === 'allocated'
      ? `<span class="badge badge-allocated">Allocated</span> <span class="badge badge-${t.priority}">${t.priority}</span>`
      : `<span class="badge badge-requested">Requested</span>`;

    card.innerHTML = `
      <div class="task-top">
        <div>
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            Requested by <strong>${escapeHtml(t.requestedBy)}</strong> · ${fmtDate(t.dateRequested)}
            ${t.location ? ` · 📍 ${escapeHtml(t.location)}` : ''}
          </div>
          ${t.status === 'allocated' ? `<div class="task-meta">Assigned to <strong>${escapeHtml(t.assignedTo)}</strong> by ${escapeHtml(t.allocatedBy)} · ${fmtDate(t.dateAllocated)}</div>` : ''}
        </div>
        <div>${statusBadge}</div>
      </div>
      ${t.description ? `<div class="task-desc">${escapeHtml(t.description)}</div>` : ''}
      <div class="task-actions">
        ${state.isManager && t.status === 'requested' ? `<button class="btn btn-primary btn-small" data-action="show-allocate" data-id="${t.id}">Allocate task</button>` : ''}
        ${state.isManager && t.status === 'allocated' ? `<button class="btn btn-ghost btn-small" data-action="show-allocate" data-id="${t.id}">Reallocate</button>` : ''}
        <button class="btn btn-ghost btn-small" data-action="show-complete" data-id="${t.id}">Mark complete</button>
        ${state.isManager ? `<button class="btn btn-danger btn-small" data-action="delete" data-id="${t.id}">Delete</button>` : ''}
      </div>
      <div class="allocate-slot"></div>
    `;
    list.appendChild(card);
  });
}

function renderLog(filter = '') {
  const body = el('logTableBody');
  body.innerHTML = '';
  const f = filter.trim().toLowerCase();
  const rows = state.log.filter((t) => !f || [t.title, t.location, t.requestedBy, t.assignedTo, t.completedBy]
    .filter(Boolean).some((s) => s.toLowerCase().includes(f)));
  el('logEmpty').hidden = rows.length > 0;
  rows.forEach((t) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.location || '—')}</td>
      <td>${t.priority ? `<span class="badge badge-${t.priority}">${t.priority}</span>` : '—'}</td>
      <td>${escapeHtml(t.requestedBy)}</td>
      <td>${escapeHtml(t.assignedTo || '—')}</td>
      <td>${escapeHtml(t.completedBy)}</td>
      <td>${fmtDate(t.dateRequested)}</td>
      <td>${fmtDate(t.dateCompleted)}</td>
    `;
    body.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- modal helpers ----
function openModal(title, bodyHtml) {
  el('modalTitle').textContent = title;
  el('modalBody').innerHTML = bodyHtml;
  el('modalBackdrop').hidden = false;
}
function closeModal() {
  el('modalBackdrop').hidden = true;
}
el('modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });

// ---- request form ----
el('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = el('requestMsg');
  msg.textContent = '';
  msg.className = 'msg';
  try {
    await apiPost({
      action: 'create',
      title: el('reqTitle').value,
      description: el('reqDescription').value,
      location: el('reqLocation').value,
      requestedBy: el('reqName').value
    });
    el('reqTitle').value = '';
    el('reqDescription').value = '';
    el('reqLocation').value = '';
    msg.textContent = 'Request submitted.';
    msg.className = 'msg success';
    await refresh();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'msg error';
  }
});

// ---- tabs ----
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    el('tab-active').hidden = tab !== 'active';
    el('tab-log').hidden = tab !== 'log';
  });
});

// ---- manager sign-in ----
el('managerBtn').addEventListener('click', () => {
  if (state.isManager) {
    sessionStorage.removeItem('managerPin');
    sessionStorage.removeItem('managerName');
    state.isManager = false;
    state.managerName = '';
    renderManagerUI();
    return;
  }
  openModal('Manager sign-in', `
    <label>Your name<br><input id="mgrName" type="text" style="width:100%"></label><br><br>
    <label>Manager PIN<br><input id="mgrPin" type="password" style="width:100%"></label>
    <p id="mgrErr" class="msg error"></p>
    <div class="form-actions"><button class="btn btn-primary" id="mgrSubmit">Sign in</button></div>
  `);
  el('mgrSubmit').addEventListener('click', async () => {
    const pin = el('mgrPin').value;
    const name = el('mgrName').value.trim();
    try {
      const result = await apiPost({ action: 'verifyPin', pin });
      if (!result.ok) throw new Error(result.error || 'Incorrect PIN.');
      sessionStorage.setItem('managerPin', pin);
      sessionStorage.setItem('managerName', name);
      state.isManager = true;
      state.managerName = name;
      closeModal();
      renderManagerUI();
    } catch (err) {
      el('mgrErr').textContent = err.message;
    }
  });
});

// ---- delegated actions on active list ----
el('activeList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const task = state.active.find((t) => t.id === id);

  if (action === 'show-allocate') {
    openModal('Allocate task', `
      <p><strong>${escapeHtml(task.title)}</strong></p>
      <label>Assign to<br><input id="allocPerson" type="text" style="width:100%" value="${escapeHtml(task.assignedTo || '')}"></label><br><br>
      <label>Priority<br>
        <select id="allocPriority" style="width:100%">
          ${['Low', 'Medium', 'High', 'Urgent'].map((p) => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </label>
      <p id="allocErr" class="msg error"></p>
      <div class="form-actions"><button class="btn btn-primary" id="allocSubmit">Save</button></div>
    `);
    el('allocSubmit').addEventListener('click', async () => {
      try {
        await apiPost({
          action: 'allocate',
          id,
          assignedTo: el('allocPerson').value,
          priority: el('allocPriority').value,
          allocatedBy: state.managerName,
          pin: sessionStorage.getItem('managerPin')
        });
        closeModal();
        await refresh();
      } catch (err) {
        el('allocErr').textContent = err.message;
      }
    });
  }

  if (action === 'show-complete') {
    openModal('Mark task complete', `
      <p><strong>${escapeHtml(task.title)}</strong></p>
      <label>Your name<br><input id="compName" type="text" style="width:100%"></label>
      <p id="compErr" class="msg error"></p>
      <div class="form-actions"><button class="btn btn-primary" id="compSubmit">Mark complete</button></div>
    `);
    el('compSubmit').addEventListener('click', async () => {
      try {
        await apiPost({ action: 'complete', id, completedBy: el('compName').value });
        closeModal();
        await refresh();
      } catch (err) {
        el('compErr').textContent = err.message;
      }
    });
  }

  if (action === 'delete') {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    apiPost({ action: 'delete', id, pin: sessionStorage.getItem('managerPin') })
      .then(refresh)
      .catch((err) => alert(err.message));
  }
});

// ---- log search / export / clear ----
el('logSearch').addEventListener('input', (e) => renderLog(e.target.value));

el('exportCsvBtn').addEventListener('click', () => {
  const headers = ['Title', 'Location', 'Priority', 'Requested By', 'Assigned To', 'Completed By', 'Date Requested', 'Date Completed'];
  const rows = state.log.map((t) => [t.title, t.location, t.priority, t.requestedBy, t.assignedTo, t.completedBy, t.dateRequested, t.dateCompleted]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bamboo-maintenance-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
});

el('clearLogBtn').addEventListener('click', async () => {
  if (!confirm('Clear the entire completed log? Export a CSV first if you want to keep a copy.')) return;
  try {
    await apiPost({ action: 'clearLog', pin: sessionStorage.getItem('managerPin') });
    await refresh();
  } catch (err) {
    alert(err.message);
  }
});

// ---- init ----
renderManagerUI();
refresh();
setInterval(refresh, 15000); // light polling so everyone's view stays fresh
