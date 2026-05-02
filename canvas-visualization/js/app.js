/* ═══════════════════════════════════════════
   Canvas Visualizer · app.js
   Data loading, routing, utilities, modal
═══════════════════════════════════════════ */

const BASE = '../openclaw-canvas-universe-hzf3qcwv/openclaw-canvas-universe-hzf3qcwv/services/';

const SERVICES = ['airtable', 'calendar', 'contacts', 'email', 'messaging', 'reminder', 'slack'];

const DATA = {};
let activeTab = 'overview';
const rendered = new Set();

// ── LOAD ─────────────────────────────────────
async function loadAll() {
  setStatus('loading', 'Loading…');
  const statusEl = document.getElementById('load-status');
  let loaded = 0;

  try {
    await Promise.all(SERVICES.map(s =>
      fetch(BASE + s + '/data.json')
        .then(r => { if (!r.ok) throw new Error(s); return r.json(); })
        .then(d => {
          DATA[s] = d;
          loaded++;
          if (statusEl) statusEl.textContent = `Loading… (${loaded}/${SERVICES.length})`;
        })
    ));
    document.getElementById('loading-overlay').style.display = 'none';
    setStatus('live', 'Loaded');
    renderActiveTab();
  } catch (e) {
    setStatus('loading', 'Error: ' + e.message);
    if (statusEl) statusEl.textContent = 'Failed to load: ' + e.message;
  }
}

function setStatus(state, text) {
  const dot  = document.getElementById('status-dot');
  const span = document.getElementById('status-text');
  dot.className = 'pulse-dot' + (state === 'loading' ? ' loading' : '');
  span.textContent = text;
}

// ── TAB ROUTING ──────────────────────────────
function renderActiveTab() {
  const tab = activeTab;
  if (rendered.has(tab)) return;
  rendered.add(tab);
  switch (tab) {
    case 'overview':        renderOverview(DATA); break;
    case 'gradebook':       renderGradebook(DATA); break;
    case 'communications':  renderCommunications(DATA); break;
    case 'contacts':        renderContacts(DATA); break;
    case 'calendar':        renderCalendar(DATA); break;
    case 'reminders':       renderReminders(DATA); break;
  }
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + btn.dataset.tab).classList.add('active');
    activeTab = btn.dataset.tab;
    renderActiveTab();
  });
});

document.querySelectorAll('.sub-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('section');
    parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    parent.querySelectorAll('.sub-page').forEach(p => p.classList.remove('active'));
    const target = parent.querySelector('#' + btn.dataset.subtab);
    if (target) target.classList.add('active');
  });
});

// ── MODAL ────────────────────────────────────
function openModal(badge, title, bodyHTML) {
  document.getElementById('modal-badge').textContent = badge;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}
function handleModalClick(e) {
  if (e.target.id === 'modal-overlay') closeModal();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── UTILITIES ────────────────────────────────
function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtTs(ts) {
  if (!ts) return '—';
  const n = typeof ts === 'string' ? parseFloat(ts) : ts;
  if (!isFinite(n)) return escHtml(String(ts));
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTsTime(ts) {
  if (!ts) return '—';
  const n = typeof ts === 'string' ? parseFloat(ts) : ts;
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDateStr(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d)) return escHtml(String(s));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return escHtml(String(s)); }
}

function paginate(items, page, size) {
  return items.slice((page - 1) * size, page * size);
}

function renderPagination(containerId, total, page, size, onPageFn) {
  const totalPages = Math.ceil(total / size);
  const el = document.getElementById(containerId);
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${page===1?'disabled':''} onclick="(${onPageFn})(${page-1})">‹</button>`;
  const range = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) range.push(i);
    else if (range[range.length-1] !== '…') range.push('…');
  }
  range.forEach(r => {
    if (r === '…') html += `<span class="page-btn" style="cursor:default">…</span>`;
    else html += `<button class="page-btn ${r===page?'active':''}" onclick="(${onPageFn})(${r})">${r}</button>`;
  });
  html += `<button class="page-btn" ${page===totalPages?'disabled':''} onclick="(${onPageFn})(${page+1})">›</button>`;
  el.innerHTML = html;
}

// ── BOOT ─────────────────────────────────────
loadAll();
