/* ═══════════════════════════════════════════
   gradebook.js — Airtable records view
   grouped by table, filterable, expandable
═══════════════════════════════════════════ */

let gbAllRecords = [];
let gbPage = 1;
const GB_PAGE_SIZE = 30;
let gbFilter = { table: '', search: '' };

const TABLE_LABELS = {
  tblCSCI201Gradebook:   'CSCI-201 Gradebook',
  tblPSYC101Gradebook:   'PSYC-101 Gradebook',
  tblENGL102Gradebook:   'ENGL-102 Gradebook',
  tblAssignmentSchedule: 'Assignment Schedule',
  tblCoursePolicies:     'Course Policies',
  tblStudentRecords:     'Student Records',
  tblOperations:         'Operations & Incidents',
};

function renderGradebook(data) {
  gbAllRecords = (data.airtable?.records || []);
  const tables = data.airtable?.tables || [];

  // Populate table filter dropdown
  const sel = document.getElementById('gb-table');
  const seen = new Set();
  gbAllRecords.forEach(r => {
    if (!seen.has(r.table_id)) {
      seen.add(r.table_id);
      const label = TABLE_LABELS[r.table_id] || r.table_id;
      sel.innerHTML += `<option value="${escHtml(r.table_id)}">${escHtml(label)}</option>`;
    }
  });

  document.getElementById('gb-table').addEventListener('change', e => {
    gbFilter.table = e.target.value;
    gbPage = 1;
    drawGradebook();
  });
  document.getElementById('gb-search').addEventListener('input', e => {
    gbFilter.search = e.target.value.toLowerCase();
    gbPage = 1;
    drawGradebook();
  });

  drawGradebook();
}

function drawGradebook() {
  const filtered = gbAllRecords.filter(r => {
    const matchTable = !gbFilter.table || r.table_id === gbFilter.table;
    if (!matchTable) return false;
    if (!gbFilter.search) return true;
    const s = gbFilter.search;
    const fields = r.fields || {};
    return Object.values(fields).some(v => v != null && String(v).toLowerCase().includes(s)) ||
      (r.id || '').toLowerCase().includes(s);
  });

  const countEl = document.getElementById('gb-count');
  if (countEl) countEl.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

  const page = paginate(filtered, gbPage, GB_PAGE_SIZE);
  const container = document.getElementById('gb-list');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No records match your filter.</div>';
    document.getElementById('gb-pag').innerHTML = '';
    return;
  }

  let html = '';
  page.forEach(r => {
    const fields = r.fields || {};
    const tableLabel = TABLE_LABELS[r.table_id] || r.table_id;

    // Derive record summary from populated fields
    const studentName = fields['Student Name'] || fields['Student'] || '';
    const course     = fields['Course'] || fields['Course Code'] || '';
    const assignment = fields['Assignment'] || fields['Assignment Name'] || fields['Item'] || fields['Document Title'] || '';
    const status     = fields['Status'] || fields['Grade Status'] || fields['Submission Status'] || '';
    const score      = fields['Score'] || fields['Points Earned'] || '';
    const issueFlag  = fields['Issue Flag'] || '';
    const notes      = fields['Notes'] || fields['Summary'] || '';

    // Determine flag class
    let flagCls = 'flag-info';
    if (issueFlag) flagCls = 'flag-issue';
    else if (status && /missing|wrong|interrupted|late/i.test(String(status))) flagCls = 'flag-late';
    else if (status && /submitted|on time|success/i.test(String(status))) flagCls = 'flag-ok';
    else if (r.table_id === 'tblCoursePolicies' || r.table_id === 'tblOperations') flagCls = 'flag-policy';

    // Build status badge
    let statusBadge = '';
    if (issueFlag) statusBadge = `<span class="badge badge-issue">${escHtml(issueFlag)}</span>`;
    else if (status) {
      const s = String(status).toLowerCase();
      const cls = /missing|zero|wrong/i.test(s) ? 'badge-missing' :
                  /late/i.test(s) ? 'badge-late' :
                  /submitted|on time|success|enrolled/i.test(s) ? 'badge-submitted' :
                  /policy|document/i.test(s) ? 'badge-policy' : 'badge-info';
      statusBadge = `<span class="badge ${cls}">${escHtml(status)}</span>`;
    }

    // Course badge
    const courseBadge = course
      ? `<span class="badge ${/CSCI/i.test(course)?'badge-csci':/PSYC/i.test(course)?'badge-psyc':/ENGL/i.test(course)?'badge-engl':'badge-info'}">${escHtml(course)}</span>`
      : '';

    // Build the summary line
    const titleLine = [studentName, assignment].filter(Boolean).join(' · ') || r.id;
    const subLine   = notes ? notes.slice(0, 100) + (notes.length > 100 ? '…' : '') : '';

    // Build fields display (only populated fields, excluding empty strings)
    const fieldEntries = Object.entries(fields)
      .filter(([k, v]) => v != null && v !== '' && !Array.isArray(v) || (Array.isArray(v) && v.length > 0));

    // Determine which fields should span full width (long text)
    const longFields = new Set(['Notes', 'Summary', 'Policy Summary', 'Instructor Notes', 'Late Policy', 'Description', 'Content', 'Text Content']);

    let fieldsHtml = '<div class="gb-fields-grid">';
    fieldEntries.forEach(([k, v]) => {
      const isLong = longFields.has(k) || String(v).length > 80;
      const isArray = Array.isArray(v);
      const valStr = isArray ? v.join(', ') : String(v);
      const cls = isLong ? 'gb-field full' : 'gb-field';
      const valCls = /\d{4}-\d{2}-\d{2}/.test(valStr) ? 'gb-field-val mono' : 'gb-field-val';
      fieldsHtml += `<div class="${cls}">
        <div class="gb-field-key">${escHtml(k)}</div>
        <div class="${valCls}">${escHtml(valStr)}</div>
      </div>`;
    });
    fieldsHtml += '</div>';

    const safeId = escHtml(r.id);
    html += `<div class="gb-record ${flagCls}">
      <div class="gb-header" onclick="toggleGbRecord('gbf-${safeId}')">
        <div class="gb-header-left">
          <div class="gb-record-id">${escHtml(r.id)}</div>
          <div class="gb-record-title">${escHtml(titleLine)}</div>
          ${subLine ? `<div class="gb-record-sub">${escHtml(subLine)}</div>` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
            ${courseBadge}${statusBadge}
            ${score !== '' && score !== undefined ? `<span class="badge badge-info">Score: ${escHtml(String(score))}</span>` : ''}
          </div>
        </div>
        <div class="gb-record-right">
          <span class="gb-table-tag">${escHtml(tableLabel)}</span>
          <div class="gb-timestamps">
            ${r.created_time ? `Created ${escHtml(r.created_time)}` : ''}<br>
            ${r.modified_time ? `Modified ${escHtml(r.modified_time)}` : ''}
          </div>
        </div>
      </div>
      <div class="gb-fields" id="gbf-${safeId}">
        ${fieldsHtml}
      </div>
    </div>`;
  });

  container.innerHTML = html;
  renderPagination('gb-pag', filtered.length, gbPage, GB_PAGE_SIZE,
    `function(p){ gbPage=p; drawGradebook(); }`);
}

function toggleGbRecord(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}
