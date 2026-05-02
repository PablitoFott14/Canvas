/* ═══════════════════════════════════════════
   contacts.js — Contact directory grouped
   by role: faculty, staff, students
═══════════════════════════════════════════ */

let _allContacts = [];

function renderContacts(data) {
  _allContacts = (data.contacts?.contacts || []).sort((a, b) => {
    const na = (a.first_name + ' ' + a.last_name).toLowerCase();
    const nb = (b.first_name + ' ' + b.last_name).toLowerCase();
    return na.localeCompare(nb);
  });

  document.getElementById('contacts-search').addEventListener('input', e => {
    _drawContacts(e.target.value.toLowerCase(), document.getElementById('contacts-role').value);
  });
  document.getElementById('contacts-role').addEventListener('change', e => {
    _drawContacts(document.getElementById('contacts-search').value.toLowerCase(), e.target.value);
  });

  _drawContacts('', '');
}

function _roleOf(c) {
  const job = (c.job || '').toLowerCase();
  const desc = (c.description || '').toLowerCase();
  if (job === 'student' || desc.includes('student in student')) return 'student';
  if (job.includes('professor') || job.includes('instructor')) return 'faculty';
  if (desc.includes('in staff') || job.includes('coordinator') || job.includes('specialist') || job.includes('director')) return 'staff';
  return 'other';
}

function _drawContacts(search, roleFilter) {
  const filtered = _allContacts.filter(c => {
    const role = _roleOf(c);
    if (roleFilter && role !== roleFilter) return false;
    if (!search) return true;
    const full = ((c.first_name || '') + ' ' + (c.last_name || '')).toLowerCase();
    return full.includes(search)
      || (c.job || '').toLowerCase().includes(search)
      || (c.email || '').toLowerCase().includes(search)
      || (c.description || '').toLowerCase().includes(search);
  });

  const countEl = document.getElementById('contacts-count');
  if (countEl) countEl.textContent = `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    document.getElementById('contacts-list').innerHTML = '<div class="empty-state">No contacts match.</div>';
    return;
  }

  // Group by role
  const groups = { faculty: [], staff: [], student: [], other: [] };
  filtered.forEach(c => groups[_roleOf(c)].push(c));

  const groupOrder = [
    { key: 'faculty', label: 'Faculty', badge: 'badge-faculty' },
    { key: 'staff',   label: 'Staff',   badge: 'badge-staff' },
    { key: 'student', label: 'Students', badge: 'badge-student' },
    { key: 'other',   label: 'Other',   badge: 'badge-info' },
  ];

  let html = '';
  groupOrder.forEach(g => {
    const members = groups[g.key];
    if (members.length === 0) return;
    html += `<div style="margin-bottom:20px">
      <div class="section-label" style="margin-bottom:10px">${g.label} (${members.length})</div>
      <div class="contacts-grid">`;
    members.forEach(c => {
      const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
      const initials = [c.first_name, c.last_name].filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const safe = JSON.stringify(c).replace(/'/g, '&#39;');
      html += `<div class="contact-card" onclick='openContactModal(${safe})'>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="width:32px;height:32px;border-radius:6px;background:var(--surface3);
            display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text2);flex-shrink:0">
            ${escHtml(initials)}
          </div>
          <div>
            <div class="contact-name">${escHtml(fullName)}</div>
            <span class="badge ${g.badge}" style="font-size:9px">${g.label.replace('s','')}</span>
          </div>
        </div>
        <div class="contact-job">${escHtml(c.job || '—')}</div>
        <div class="contact-email">${escHtml(c.email || '—')}</div>
      </div>`;
    });
    html += '</div></div>';
  });

  document.getElementById('contacts-list').innerHTML = html;
}

function openContactModal(c) {
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
  const body = `<div class="mf-grid">
    <div class="mf-item"><label>Name</label><span class="val">${escHtml(fullName)}</span></div>
    <div class="mf-item"><label>Role</label><span class="val">${escHtml(c.job || '—')}</span></div>
    <div class="mf-item mf-full"><label>Email</label><span class="val" style="font-family:var(--mono)">${escHtml(c.email || '—')}</span></div>
    ${c.description ? `<div class="mf-item mf-full"><label>Description</label><span class="val">${escHtml(c.description)}</span></div>` : ''}
  </div>`;
  openModal(_roleOf(c), fullName, body);
}
