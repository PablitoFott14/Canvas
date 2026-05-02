/* Reminder month view with clickable reminder detail modals. */

let _remAll = [];
let _remSearch = '';
let _remRepeat = '';
let _remMonth = null;
let _remSelectedKey = '';

function renderReminders(data) {
  _remAll = (data.reminder?.reminders || [])
    .map((reminder, idx) => ({ ...reminder, _remIdx: idx }))
    .sort((a, b) => (a.due_datetime || 0) - (b.due_datetime || 0));

  const firstReminder = _remAll.find(r => r.due_datetime);
  _remMonth = firstReminder ? _remStartOfMonth(_remDateFromTs(firstReminder.due_datetime)) : _remStartOfMonth(new Date());
  _remSelectedKey = firstReminder ? _remDateKey(_remDateFromTs(firstReminder.due_datetime)) : _remDateKey(new Date());

  document.getElementById('rem-search').addEventListener('input', e => {
    _remSearch = e.target.value.toLowerCase();
    _remMonth = null;
    _remSelectedKey = '';
    _drawReminders();
  });
  document.getElementById('rem-repeat').addEventListener('change', e => {
    _remRepeat = e.target.value;
    _remMonth = null;
    _remSelectedKey = '';
    _drawReminders();
  });

  _drawReminders();
}

function _drawReminders() {
  const filtered = _remFiltered();
  const countEl = document.getElementById('rem-count');
  if (countEl) countEl.textContent = `${filtered.length} reminder${filtered.length !== 1 ? 's' : ''}`;

  const container = document.getElementById('rem-list');
  const pagEl = document.getElementById('rem-pag');
  if (pagEl) pagEl.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No reminders match.</div>';
    return;
  }

  if (!_remMonth) {
    _remMonth = _remStartOfMonth(_remDateFromTs(filtered[0].due_datetime));
  }

  const grouped = _groupReminderItems(filtered);
  const visibleKeys = _remMonthKeys(_remMonth);
  const visibleItemKeys = visibleKeys.filter(key => grouped[key]?.length);

  if (!_remSelectedKey || !visibleKeys.includes(_remSelectedKey)) {
    _remSelectedKey = visibleItemKeys[0] || _remDateKey(_remMonth);
  }

  const monthLabel = _remMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedItems = grouped[_remSelectedKey] || [];
  const repeatCount = filtered.filter(r => r.repetition_unit).length;

  let html = `<div class="month-shell reminder-calendar">
    <div class="month-toolbar">
      <button class="page-btn" onclick="_remShiftMonth(-1)">‹</button>
      <div>
        <div class="month-title">⏰ ${monthLabel}</div>
        <div class="month-subtitle">${filtered.length} reminders · ${repeatCount} repeating</div>
      </div>
      <button class="page-btn" onclick="_remShiftMonth(1)">›</button>
    </div>
    <div class="month-weekdays">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<div>${day}</div>`).join('')}
    </div>
    <div class="month-grid">`;

  _remMonthDays(_remMonth).forEach(day => {
    const key = _remDateKey(day);
    const items = grouped[key] || [];
    const sameMonth = day.getMonth() === _remMonth.getMonth();
    const isSelected = key === _remSelectedKey;
    html += `<button type="button" class="month-cell ${sameMonth ? '' : 'is-muted'} ${items.length ? 'has-items' : ''} ${isSelected ? 'is-selected' : ''}" onclick="_remSelectDay('${key}')">
      <span class="month-day">${day.getDate()}</span>
      <span class="month-items">
        ${items.slice(0, 3).map(item => _reminderChip(item)).join('')}
        ${items.length > 3 ? `<span class="month-more">+${items.length - 3} more</span>` : ''}
      </span>
    </button>`;
  });

  html += `</div>
    <div class="day-agenda">
      <div class="day-agenda-head">
        <div>
          <div class="section-label">Selected Day</div>
          <h4>${_remFormatDateKey(_remSelectedKey)}</h4>
        </div>
        <span class="ex-count">${selectedItems.length} reminder${selectedItems.length !== 1 ? 's' : ''}</span>
      </div>
      ${selectedItems.length ? selectedItems.map(item => _remAgendaItem(item)).join('') : '<div class="empty-state compact">No reminders on this day.</div>'}
    </div>
  </div>`;

  container.innerHTML = html;
}

function _remFiltered() {
  return _remAll.filter(r => {
    const matchRepeat = !_remRepeat
      || (_remRepeat === 'repeating' && r.repetition_unit)
      || (_remRepeat === 'once' && !r.repetition_unit);
    if (!matchRepeat) return false;
    if (!_remSearch) return true;
    return (r.title || '').toLowerCase().includes(_remSearch)
      || (r.description || '').toLowerCase().includes(_remSearch);
  });
}

function _remShiftMonth(delta) {
  _remMonth = new Date(_remMonth.getFullYear(), _remMonth.getMonth() + delta, 1);
  _remSelectedKey = '';
  _drawReminders();
}

function _remSelectDay(key) {
  _remSelectedKey = key;
  _drawReminders();
}

function _reminderChip(r) {
  return `<span class="month-item ${r.repetition_unit ? 'repeat' : 'reminder'}" onclick="event.stopPropagation(); showReminderModalByIdx(${r._remIdx})">
    <span>${r.repetition_unit ? '🔁' : '⏰'}</span><span class="month-time">${_remTime(r.due_datetime)}</span>${escHtml(r.title || 'Reminder')}
  </span>`;
}

function _remAgendaItem(r) {
  return `<button type="button" class="agenda-item" onclick="showReminderModalByIdx(${r._remIdx})">
    <span class="agenda-icon">${r.repetition_unit ? '🔁' : '⏰'}</span>
    <span class="agenda-main">
      <span class="agenda-title">${escHtml(r.title || 'Reminder')}</span>
      ${r.description ? `<span class="agenda-desc">${escHtml(r.description)}</span>` : ''}
      <span class="cal-meta">
        <span class="cal-meta-item">🕐 Due ${_remTime(r.due_datetime)}</span>
        ${r.repetition_unit ? `<span class="cal-meta-item">🔁 Every ${r.repetition_value || 1} ${escHtml(r.repetition_unit)}</span>` : '<span class="cal-meta-item">📌 One-time</span>'}
      </span>
    </span>
  </button>`;
}

function showReminderModalByIdx(idx) {
  const reminder = _remAll.find(r => r._remIdx === idx);
  if (reminder) showReminderModal(reminder);
}

function showReminderModal(r) {
  const repeat = r.repetition_unit
    ? `Every ${r.repetition_value || 1} ${escHtml(r.repetition_unit)}`
    : 'One-time';

  const body = `<div class="mf-grid">
    <div class="mf-item"><label>Due</label><span class="val">${fmtTsTime(r.due_datetime)}</span></div>
    <div class="mf-item"><label>Repeat</label><span class="val">${repeat}</span></div>
    ${r.time_notified ? `<div class="mf-item"><label>Notified</label><span class="val">${fmtTsTime(r.time_notified)}</span></div>` : ''}
    ${r.description ? `<div class="mf-item mf-full"><label>Description</label><span class="val">${escHtml(r.description)}</span></div>` : ''}
    <div class="mf-item mf-full"><label>Reminder ID</label><span class="val" style="font-family:var(--mono);font-size:11px">${escHtml(r.reminder_id || '—')}</span></div>
  </div>`;
  openModal(r.repetition_unit ? 'Repeating Reminder' : 'Reminder', `${r.repetition_unit ? '🔁' : '⏰'} ${r.title || 'Reminder'}`, body);
}

function _groupReminderItems(items) {
  return items.reduce((acc, item) => {
    const key = _remDateKey(_remDateFromTs(item.due_datetime));
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function _remMonthDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function _remMonthKeys(month) {
  return _remMonthDays(month).map(_remDateKey);
}

function _remDateFromTs(ts) {
  const n = typeof ts === 'string' ? parseFloat(ts) : ts;
  return new Date((n > 1e12 ? n : n * 1000) || Date.now());
}

function _remStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function _remDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function _remFormatDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function _remTime(ts) {
  if (!ts) return '';
  return _remDateFromTs(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
