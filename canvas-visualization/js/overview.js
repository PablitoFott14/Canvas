/* ═══════════════════════════════════════════
   overview.js — Sarah Chen profile,
   3 course cards, key stats
═══════════════════════════════════════════ */

function renderOverview(data) {
  const el = document.getElementById('overview-content');

  const contacts  = data.contacts?.contacts  || [];
  const sarah     = contacts.find(c => c.email === 'sarah.chen@riverside.edu') || {};
  const emails    = data.email?.emails        || [];
  const convos    = data.messaging?.conversations || [];
  const reminders = data.reminder?.reminders  || [];
  const calEvents = data.calendar?.events     || [];
  const records   = data.airtable?.records    || [];
  const slackMsgs = data.slack?.messages      || [];
  const slackChs  = data.slack?.channels      || [];
  const slackUsers= data.slack?.users         || [];

  const unreadEmails = emails.filter(e => !e.is_read && e.folder === 'inbox').length;
  const studentCount = contacts.filter(c => c.job === 'Student').length;
  const facultyCount = contacts.filter(c => (c.job || '').toLowerCase().includes('professor')).length;

  // Courses from Slack channels
  const COURSES = [
    { code: 'CSCI-201', title: 'Introduction to Programming',   cls: 'csci', channelId: 'C001' },
    { code: 'PSYC-101', title: 'Introduction to Psychology',    cls: 'psyc', channelId: 'C002' },
    { code: 'ENGL-102', title: 'Composition and Critical Thinking', cls: 'engl', channelId: 'C003' },
  ];

  const chMap = Object.fromEntries(slackChs.map(c => [c.id, c]));

  let html = '';

  // Profile card
  html += `<div class="profile-card">
    <div class="profile-avatar">SC</div>
    <div>
      <div class="profile-name">Prof. Sarah Chen</div>
      <div class="profile-title">${escHtml(sarah.job || 'Professor of Computer Science and Interdisciplinary Studies')}</div>
      <div class="profile-meta">
        <div class="profile-meta-item"><span class="icon">🏫</span>Riverside Community College · Spring 2026</div>
        <div class="profile-meta-item"><span class="icon">✉</span>sarah.chen@riverside.edu · schen@rcc.edu</div>
        <div class="profile-meta-item"><span class="icon">🕐</span>Office Hours: Tue 1–2:30 PM, Thu 10–11 AM</div>
      </div>
    </div>
  </div>`;

  // KPIs
  const kpis = [
    { label: 'Courses',        value: 3,              sub: 'Spring 2026',          color: 'var(--indigo)' },
    { label: 'Contacts',       value: contacts.length,sub: `${studentCount} students`,color: 'var(--emerald)' },
    { label: 'Airtable Records',value: records.length, sub: '7 tables',             color: 'var(--violet)' },
    { label: 'Emails',         value: emails.length,  sub: `${unreadEmails} unread inbox`, color: 'var(--amber)' },
    { label: 'Conversations',  value: convos.length,  sub: 'direct messages',       color: 'var(--sky)' },
    { label: 'Reminders',      value: reminders.length,sub: 'active',               color: 'var(--rose)' },
    { label: 'Calendar Events',value: calEvents.length,sub: 'scheduled',            color: 'var(--teal)' },
    { label: 'Slack Messages', value: slackMsgs.length,sub: `${slackChs.length} channels`, color: 'var(--pink)' },
  ];

  html += '<div class="kpi-row">';
  kpis.forEach(k => {
    html += `<div class="kpi-tile">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value" style="color:${k.color}">${k.value.toLocaleString()}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`;
  });
  html += '</div>';

  // Course cards
  html += '<div class="section-label">Courses — Spring 2026</div>';
  html += '<div class="course-cards">';
  COURSES.forEach(c => {
    const ch = chMap[c.channelId] || {};
    const courseRecords = records.filter(r => {
      const fields = r.fields || {};
      return Object.values(fields).some(v => typeof v === 'string' && v.includes(c.code));
    });
    html += `<div class="course-card ${c.cls}">
      <div class="course-code">${c.code}</div>
      <div class="course-title">${c.title}</div>
      <div class="course-meta">
        ${ch.num_members ? `${ch.num_members} students enrolled` : ''}
        ${courseRecords.length ? ` · ${courseRecords.length} records` : ''}
        ${ch.purpose ? `<br><span style="color:var(--text3)">${escHtml(ch.purpose)}</span>` : ''}
      </div>
    </div>`;
  });
  html += '</div>';

  // Recent reminders (first 3)
  const upcomingRem = [...reminders]
    .sort((a, b) => a.due_datetime - b.due_datetime)
    .slice(0, 4);

  if (upcomingRem.length > 0) {
    html += '<div class="grid-2" style="margin-top:20px;gap:16px">';
    html += '<div>';
    html += '<div class="section-label" style="margin-bottom:10px">Upcoming Reminders</div>';
    upcomingRem.forEach(r => {
      html += `<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--amber);flex-shrink:0">⏰</span>
        <div>
          <div style="font-size:13px;font-weight:500">${escHtml(r.title)}</div>
          <div style="font-size:11px;color:var(--sky);font-family:var(--mono);margin-top:2px">Due ${fmtTs(r.due_datetime)}</div>
          ${r.repetition_unit ? `<div style="font-size:10px;color:var(--violet);margin-top:2px">Repeats every ${r.repetition_value} ${r.repetition_unit}</div>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';

    // Recent unread emails
    const unread = emails.filter(e => !e.is_read && e.folder === 'inbox').slice(0, 4);
    html += '<div>';
    html += '<div class="section-label" style="margin-bottom:10px">Unread Emails</div>';
    if (unread.length === 0) {
      html += '<div style="font-size:13px;color:var(--text3);padding:9px 0">No unread emails</div>';
    } else {
      unread.forEach(e => {
        html += `<div style="padding:9px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:13px;font-weight:600">${escHtml(e.subject || '(no subject)')}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${escHtml(e.sender)} · ${fmtTs(e.timestamp)}</div>
        </div>`;
      });
    }
    html += '</div>';
    html += '</div>'; // grid-2
  }

  el.innerHTML = html;
}
