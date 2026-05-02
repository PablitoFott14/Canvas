/* Calendar month view with clickable event detail modals. */

let _calAll = [];
let _calSearch = '';
let _calMonth = null;
let _calSelectedKey = '';

function renderCalendar(data) {
  _calAll = (data.calendar?.events || [])
    .map((event, idx) => ({ ...event, _calIdx: idx }))
    .sort((a, b) => (a.start_datetime || 0) - (b.start_datetime || 0));

  const firstEvent = _calAll.find(e => e.start_datetime);
  _calMonth = firstEvent ? _calStartOfMonth(_calDateFromTs(firstEvent.start_datetime)) : _calStartOfMonth(new Date());
  _calSelectedKey = firstEvent ? _calDateKey(_calDateFromTs(firstEvent.start_datetime)) : _calDateKey(new Date());

  document.getElementById('cal-search').addEventListener('input', e => {
    _calSearch = e.target.value.toLowerCase();
    _calMonth = null;
    _calSelectedKey = '';
    _drawCalendar();
  });

  _drawCalendar();
}

function _drawCalendar() {
  const filtered = _calFiltered();
  const countEl = document.getElementById('cal-count');
  if (countEl) countEl.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;

  const container = document.getElementById('cal-list');
  const pagEl = document.getElementById('cal-pag');
  if (pagEl) pagEl.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No events match.</div>';
    return;
  }

  if (!_calMonth) {
    _calMonth = _calStartOfMonth(_calDateFromTs(filtered[0].start_datetime));
  }

  const grouped = _groupCalendarItems(filtered, 'start_datetime');
  const visibleKeys = _monthKeys(_calMonth);
  const visibleItemKeys = visibleKeys.filter(key => grouped[key]?.length);

  if (!_calSelectedKey || !visibleKeys.includes(_calSelectedKey)) {
    _calSelectedKey = visibleItemKeys[0] || _calDateKey(_calMonth);
  }

  const monthLabel = _calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedItems = grouped[_calSelectedKey] || [];

  let html = `<div class="month-shell">
    <div class="month-toolbar">
      <button class="page-btn" onclick="_calShiftMonth(-1)">‹</button>
      <div>
        <div class="month-title">📅 ${monthLabel}</div>
        <div class="month-subtitle">${filtered.length} scheduled item${filtered.length !== 1 ? 's' : ''}</div>
      </div>
      <button class="page-btn" onclick="_calShiftMonth(1)">›</button>
    </div>
    <div class="month-weekdays">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<div>${day}</div>`).join('')}
    </div>
    <div class="month-grid">`;

  _monthDays(_calMonth).forEach(day => {
    const key = _calDateKey(day);
    const items = grouped[key] || [];
    const sameMonth = day.getMonth() === _calMonth.getMonth();
    const isSelected = key === _calSelectedKey;
    html += `<button type="button" class="month-cell ${sameMonth ? '' : 'is-muted'} ${items.length ? 'has-items' : ''} ${isSelected ? 'is-selected' : ''}" onclick="_calSelectDay('${key}')">
      <span class="month-day">${day.getDate()}</span>
      <span class="month-items">
        ${items.slice(0, 3).map(item => _calEventChip(item)).join('')}
        ${items.length > 3 ? `<span class="month-more">+${items.length - 3} more</span>` : ''}
      </span>
    </button>`;
  });

  html += `</div>
    <div class="day-agenda">
      <div class="day-agenda-head">
        <div>
          <div class="section-label">Selected Day</div>
          <h4>${_formatDateKey(_calSelectedKey)}</h4>
        </div>
        <span class="ex-count">${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}</span>
      </div>
      ${selectedItems.length ? selectedItems.map(item => _calAgendaItem(item)).join('') : '<div class="empty-state compact">No events on this day.</div>'}
    </div>
  </div>`;

  container.innerHTML = html;
}

function _calFiltered() {
  return _calAll.filter(e => {
    if (!_calSearch) return true;
    return (e.title || '').toLowerCase().includes(_calSearch)
      || (e.description || '').toLowerCase().includes(_calSearch)
      || (e.location || '').toLowerCase().includes(_calSearch)
      || (e.attendees || []).some(a => String(a).toLowerCase().includes(_calSearch));
  });
}

function _calShiftMonth(delta) {
  _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth() + delta, 1);
  _calSelectedKey = '';
  _drawCalendar();
}

function _calSelectDay(key) {
  _calSelectedKey = key;
  _drawCalendar();
}

function _calEventChip(e) {
  const time = _calTime(e.start_datetime);
  return `<span class="month-item ${_courseClass(e.title)}" onclick="event.stopPropagation(); showCalModalByIdx(${e._calIdx})">
    <span>${_eventEmoji(e.title)}</span>${time ? `<span class="month-time">${time}</span>` : ''}${escHtml(e.title || 'Event')}
  </span>`;
}

function _calAgendaItem(e) {
  const attendeeCount = (e.attendees || []).length;
  const dur = e.end_datetime && e.start_datetime ? Math.round((e.end_datetime - e.start_datetime) / 60) : null;
  return `<button type="button" class="agenda-item" onclick="showCalModalByIdx(${e._calIdx})">
    <span class="agenda-icon">${_eventEmoji(e.title)}</span>
    <span class="agenda-main">
      <span class="agenda-title">${escHtml(e.title || 'Event')}</span>
      ${e.description ? `<span class="agenda-desc">${escHtml(e.description.slice(0, 120))}${e.description.length > 120 ? '…' : ''}</span>` : ''}
      <span class="cal-meta">
        ${e.start_datetime ? `<span class="cal-meta-item">🕐 ${_calTime(e.start_datetime)}${dur ? ` (${dur}min)` : ''}</span>` : ''}
        ${e.location ? `<span class="cal-meta-item">📍 ${escHtml(e.location)}</span>` : ''}
        ${attendeeCount ? `<span class="cal-meta-item">👥 ${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}</span>` : ''}
      </span>
    </span>
  </button>`;
}

function showCalModalByIdx(idx) {
  const event = _calAll.find(e => e._calIdx === idx);
  if (event) showCalModal(event);
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
  openModal('Event', `${_eventEmoji(e.title)} ${e.title || 'Event'}`, body);
}

function _groupCalendarItems(items, tsField) {
  return items.reduce((acc, item) => {
    const key = _calDateKey(_calDateFromTs(item[tsField]));
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function _monthDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function _monthKeys(month) {
  return _monthDays(month).map(_calDateKey);
}

function _calDateFromTs(ts) {
  const n = typeof ts === 'string' ? parseFloat(ts) : ts;
  return new Date((n > 1e12 ? n : n * 1000) || Date.now());
}

function _calStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function _calDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function _formatDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function _calTime(ts) {
  if (!ts) return '';
  return _calDateFromTs(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function _courseClass(title = '') {
  const t = title.toLowerCase();
  if (t.includes('csci') || t.includes('lab') || t.includes('programming')) return 'csci';
  if (t.includes('psyc') || t.includes('psych')) return 'psyc';
  if (t.includes('engl') || t.includes('essay') || t.includes('writing')) return 'engl';
  return 'info';
}

function _eventEmoji(title = '') {
  const t = title.toLowerCase();
  if (t.includes('exam') || t.includes('midterm')) return '🧠';
  if (t.includes('due') || t.includes('deadline') || t.includes('submission')) return '📝';
  if (t.includes('office')) return '🕘';
  if (t.includes('session') || t.includes('class') || t.includes('lecture')) return '📚';
  return '📌';
}
