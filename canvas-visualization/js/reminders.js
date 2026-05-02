/* ═══════════════════════════════════════════
   reminders.js — Task/reminder list,
   paginated, filterable
═══════════════════════════════════════════ */

let _remAll = [];
let _remPage = 1;
const REM_PAGE_SIZE = 40;
let _remSearch = '';
let _remRepeat = '';

function renderReminders(data) {
  _remAll = (data.reminder?.reminders || [])
    .sort((a, b) => (a.due_datetime || 0) - (b.due_datetime || 0));

  document.getElementById('rem-search').addEventListener('input', e => {
    _remSearch = e.target.value.toLowerCase();
    _remPage = 1;
    _drawReminders();
  });
  document.getElementById('rem-repeat').addEventListener('change', e => {
    _remRepeat = e.target.value;
    _remPage = 1;
    _drawReminders();
  });

  _drawReminders();
}

function _drawReminders() {
  const filtered = _remAll.filter(r => {
    const matchRepeat = !_remRepeat
      || (_remRepeat === 'repeating' && r.repetition_unit)
      || (_remRepeat === 'once' && !r.repetition_unit);
    if (!matchRepeat) return false;
    if (!_remSearch) return true;
    return (r.title || '').toLowerCase().includes(_remSearch)
      || (r.description || '').toLowerCase().includes(_remSearch);
  });

  const countEl = document.getElementById('rem-count');
  if (countEl) countEl.textContent = `${filtered.length} reminder${filtered.length !== 1 ? 's' : ''}`;

  const page = paginate(filtered, _remPage, REM_PAGE_SIZE);
  const container = document.getElementById('rem-list');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No reminders match.</div>';
    document.getElementById('rem-pag').innerHTML = '';
    return;
  }

  let html = '';
  page.forEach(r => {
    const icon = r.repetition_unit ? '🔁' : '⏰';
    html += `<div class="rem-row">
      <div class="rem-icon">${icon}</div>
      <div style="flex:1">
        <div class="rem-title">${escHtml(r.title)}</div>
        <div class="rem-due">Due ${fmtTs(r.due_datetime)}</div>
        ${r.description ? `<div class="rem-desc">${escHtml(r.description)}</div>` : ''}
        ${r.repetition_unit ? `<div class="rem-repeat">Repeats every ${r.repetition_value} ${r.repetition_unit}</div>` : ''}
      </div>
    </div>`;
  });

  container.innerHTML = html;
  renderPagination('rem-pag', filtered.length, _remPage, REM_PAGE_SIZE,
    `function(p){ _remPage=p; _drawReminders(); }`);
}
