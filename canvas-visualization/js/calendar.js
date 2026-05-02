/* ═══════════════════════════════════════════
   calendar.js — Events list, paginated,
   filterable by search term
═══════════════════════════════════════════ */

let _calAll = [];
let _calPage = 1;
const CAL_PAGE_SIZE = 50;
let _calSearch = '';

function renderCalendar(data) {
  _calAll = (data.calendar?.events || [])
    .sort((a, b) => (a.start_datetime || 0) - (b.start_datetime || 0));

  document.getElementById('cal-search').addEventListener('input', e => {
    _calSearch = e.target.value.toLowerCase();
    _calPage = 1;
    _drawCalendar();
  });

  _drawCalendar();
}

function _drawCalendar() {
  const filtered = _calAll.filter(e => {
    if (!_calSearch) return true;
    return (e.title || '').toLowerCase().includes(_calSearch)
      || (e.description || '').toLowerCase().includes(_calSearch)
      || (e.location || '').toLowerCase().includes(_calSearch)
      || (e.attendees || []).some(a => a.toLowerCase().includes(_calSearch));
  });

  const countEl = document.getElementById('cal-count');
  if (countEl) countEl.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;

  const page = paginate(filtered, _calPage, CAL_PAGE_SIZE);
  const container = document.getElementById('cal-list');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No events match.</div>';
    document.getElementById('cal-pag').innerHTML = '';
    return;
  }

  let html = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
  page.forEach((e, i) => {
    const attendeeCount = (e.attendees || []).length;
    const dateStr = fmtTs(e.start_datetime);
    const timeStr = e.start_datetime ? new Date(e.start_datetime * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
    const dur = e.end_datetime && e.start_datetime ? Math.round((e.end_datetime - e.start_datetime) / 60) : null;

    html += `<div class="cal-row" onclick='showCalModal(${JSON.stringify(e).replace(/'/g,"&#39;")})'>
      <div class="cal-title">${escHtml(e.title || '—')}</div>
      ${e.description ? `<div class="cal-desc">${escHtml(e.description.slice(0, 100))}${e.description.length > 100 ? '…' : ''}</div>` : ''}
      <div class="cal-meta">
        <span class="cal-meta-item">📅 ${dateStr}</span>
        ${timeStr ? `<span class="cal-meta-item">🕐 ${timeStr}${dur ? ` (${dur}min)` : ''}</span>` : ''}
        ${e.location ? `<span class="cal-meta-item">📍 ${escHtml(e.location)}</span>` : ''}
        ${attendeeCount ? `<span class="cal-meta-item">👥 ${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>`;
  });
  html += '</div>';

  container.innerHTML = html;
  renderPagination('cal-pag', filtered.length, _calPage, CAL_PAGE_SIZE,
    `function(p){ _calPage=p; _drawCalendar(); }`);
}

function showCalModal(e) {
  const attendees = (e.attendees || []);
  const dur = e.end_datetime && e.start_datetime ? Math.round((e.end_datetime - e.start_datetime) / 60) : null;

  const body = `<div class="mf-grid">
    <div class="mf-item"><label>Start</label><span class="val">${fmtTsTime(e.start_datetime)}</span></div>
    <div class="mf-item"><label>End</label><span class="val">${e.end_datetime ? fmtTsTime(e.end_datetime) : '—'}${dur ? ` (${dur} min)` : ''}</span></div>
    ${e.location ? `<div class="mf-item mf-full"><label>Location</label><span class="val">${escHtml(e.location)}</span></div>` : ''}
    ${e.description ? `<div class="mf-item mf-full"><label>Description</label><span class="val">${escHtml(e.description)}</span></div>` : ''}
    ${attendees.length ? `<div class="mf-item mf-full"><label>Attendees (${attendees.length})</label>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
        ${attendees.map(a => `<span style="background:var(--surface3);border:1px solid var(--border2);border-radius:4px;padding:2px 7px;font-size:11px;font-family:var(--mono)">${escHtml(a)}</span>`).join('')}
      </div></div>` : ''}
    <div class="mf-item"><label>Event ID</label><span class="val" style="font-family:var(--mono);font-size:11px">${escHtml(e.event_id || '—')}</span></div>
  </div>`;
  openModal('Event', e.title || '—', body);
}
