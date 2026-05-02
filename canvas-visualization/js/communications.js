/* ═══════════════════════════════════════════
   communications.js — Email, Messages, Slack
═══════════════════════════════════════════ */

function renderCommunications(data) {
  _renderEmail(data.email || {});
  _renderMessages(data.messaging || {}, data.slack?.users || []);
  _renderSlack(data.slack || {});
}

// ══ EMAIL ═══════════════════════════════════
let _emailAll = [];
let _emailFolder = 'ALL';
let _emailSearch = '';

function _renderEmail(emailData) {
  _emailAll = (emailData.emails || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const el = document.getElementById('comm-email');

  el.innerHTML = `
    <div class="email-filter-bar">
      <button class="folder-btn active" data-folder="ALL" onclick="setEmailFolder('ALL')">All (${_emailAll.length})</button>
      <button class="folder-btn" data-folder="inbox" onclick="setEmailFolder('inbox')">Inbox (${_emailAll.filter(e=>e.folder==='inbox').length})</button>
      <button class="folder-btn" data-folder="sent" onclick="setEmailFolder('sent')">Sent (${_emailAll.filter(e=>e.folder==='sent').length})</button>
      <input id="email-search-inp" class="ex-search" type="text" placeholder="Search subject, sender, or content…" style="max-width:300px"/>
      <span class="ex-count" id="email-count"></span>
    </div>
    <div id="email-list" class="email-list"></div>`;

  document.getElementById('email-search-inp').addEventListener('input', e => {
    _emailSearch = e.target.value.toLowerCase();
    _drawEmails();
  });
  _drawEmails();
}

function setEmailFolder(folder) {
  _emailFolder = folder;
  document.querySelectorAll('.folder-btn').forEach(b => b.classList.toggle('active', b.dataset.folder === folder));
  _drawEmails();
}

function _drawEmails() {
  const filtered = _emailAll.filter(e => {
    const matchFolder = _emailFolder === 'ALL' || e.folder === _emailFolder;
    const s = _emailSearch;
    const matchSearch = !s
      || (e.subject || '').toLowerCase().includes(s)
      || (e.sender || '').toLowerCase().includes(s)
      || (e.content || '').toLowerCase().includes(s)
      || (e.recipients || []).some(r => r.toLowerCase().includes(s));
    return matchFolder && matchSearch;
  });

  const countEl = document.getElementById('email-count');
  if (countEl) countEl.textContent = `${filtered.length} email${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    document.getElementById('email-list').innerHTML = '<div class="empty-state">No emails match.</div>';
    return;
  }

  let html = '';
  filtered.forEach(e => {
    const isInbox = e.folder === 'inbox';
    const from = isInbox ? (e.sender || '—') : 'To: ' + (e.recipients || []).slice(0, 2).join(', ');
    const eid  = escHtml(e.email_id || e.id || Math.random());

    // Parse attachments — can be JSON string, array, or object
    let atts = [];
    try {
      if (typeof e.attachments === 'string') {
        const parsed = JSON.parse(e.attachments);
        atts = Array.isArray(parsed) ? parsed : (parsed.files || []);
      } else if (Array.isArray(e.attachments)) {
        atts = e.attachments;
      } else if (e.attachments?.files) {
        atts = e.attachments.files;
      }
    } catch {}

    html += `<div class="email-row">
      <div class="email-summary" onclick="toggleEmail('eb-${eid}')">
        <span class="badge badge-${isInbox?'inbox':'sent'}">${e.folder}</span>
        <div>
          <div class="email-subject ${!e.is_read && isInbox?'unread':''}">${escHtml(e.subject||'(no subject)')}</div>
          <div class="email-from">${escHtml(from)}</div>
        </div>
        <div class="email-date">${fmtTs(e.timestamp)}</div>
        <div style="text-align:right">
          ${!e.is_read && isInbox ? '<span class="badge badge-unread">unread</span>' : ''}
          ${atts.length ? `<div style="font-size:10px;color:var(--text3);margin-top:3px">📎 ${atts.length}</div>` : ''}
        </div>
      </div>
      <div class="email-body-wrap" id="eb-${eid}">
        <div class="email-meta-line">
          <strong>From:</strong> ${escHtml(e.sender)}<br>
          <strong>To:</strong> ${escHtml((e.recipients||[]).join(', '))}<br>
          ${e.cc&&e.cc.length?`<strong>CC:</strong> ${escHtml(e.cc.join(', '))}<br>`:''}
          <strong>Date:</strong> ${fmtTsTime(e.timestamp)}
        </div>
        <div class="email-content">${escHtml(e.content||'')}</div>
        ${atts.length ? `<div class="attachment-list">${atts.map(a => {
          const fname = a.filename || a.name || String(a);
          const txt = a.text_content;
          return `<div>
            <div class="attachment-chip">📎 ${escHtml(fname)}${a.size ? ` (${Math.round(a.size/1024)}KB)` : ''}</div>
            ${txt ? `<div class="email-attach-content">${escHtml(txt)}</div>` : ''}
          </div>`;
        }).join('')}</div>` : ''}
      </div>
    </div>`;
  });

  document.getElementById('email-list').innerHTML = html;
}

function toggleEmail(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ══ MESSAGES ════════════════════════════════
function _renderMessages(msgData, slackUsers) {
  const convos = msgData.conversations || [];
  const el = document.getElementById('comm-messages');

  // Build user map from Slack users (persona_001 = Sarah Chen)
  const userMap = {};
  slackUsers.forEach(u => { userMap[u.id] = u.real_name || u.display_name; });
  userMap['system'] = 'System';
  userMap['persona_001'] = 'Prof. Sarah Chen';
  userMap['persona_002'] = 'Alex Martinez';
  userMap['persona_003'] = 'Jordan Kim';
  userMap['persona_004'] = 'Casey Williams';
  userMap['persona_005'] = 'Emma Rodriguez';
  userMap['persona_006'] = 'Riley Johnson';
  userMap['persona_007'] = 'Sam Chen';
  userMap['persona_008'] = 'Morgan Patel';
  userMap['persona_009'] = 'Dakota Martinez';
  userMap['persona_010'] = 'Marcus Johnson';
  userMap['persona_011'] = 'Taylor Brown';
  userMap['npc_001']     = 'Riley Johnson (system)';

  if (convos.length === 0) {
    el.innerHTML = '<div class="empty-state">No message conversations.</div>';
    return;
  }

  let html = '<div class="convo-list">';
  convos.forEach((c, idx) => {
    const msgs = c.messages || [];
    const last = msgs[msgs.length - 1];
    const lastSender = last ? (userMap[last.sender_id] || last.sender_id) : '';
    const preview = last ? last.content.slice(0, 70) + (last.content.length > 70 ? '…' : '') : '';
    const msgCount = msgs.length;

    html += `<div class="convo-card">
      <div class="convo-header" onclick="toggleConvo('convo-${idx}')">
        <div>
          <div class="convo-name">${escHtml(c.title || 'Conversation')}</div>
          <div class="convo-preview">${escHtml(preview)}</div>
        </div>
        <div class="convo-count">${msgCount} message${msgCount !== 1 ? 's' : ''}</div>
      </div>
      <div class="convo-messages" id="convo-${idx}">
        <div class="msg-list">`;

    msgs.forEach(m => {
      const senderId = m.sender_id || '';
      const senderName = userMap[senderId] || senderId;
      const isInstructor = senderId === 'persona_001';
      const isSystem = senderId === 'system';
      const bubbleCls = isSystem ? 'from-system' : isInstructor ? 'from-user' : 'from-other';
      const ts = m.timestamp ? fmtTsTime(m.timestamp) : '';

      html += `<div class="msg-bubble ${bubbleCls}">
        <div class="msg-sender ${isInstructor?'instructor':''}">${escHtml(senderName)}</div>
        ${escHtml(m.content)}
        ${m.attachment_name ? `<div style="margin-top:4px;font-size:11px;color:var(--text3)">📎 ${escHtml(m.attachment_name)}</div>` : ''}
        <div class="msg-time">${ts}</div>
      </div>`;
    });

    html += `</div></div></div>`;
  });

  html += '</div>';
  el.innerHTML = html;
}

function toggleConvo(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ══ SLACK ════════════════════════════════════
// Module-level cache so pagination never touches onclick JSON
let _slackActiveChannel = null;
let _slackPage = 1;
const SLACK_PAGE_SIZE = 50;
let _slackCache = {};   // { channelId: { msgs, uMap, name, purpose } }

function _renderSlack(slackData) {
  const channels = slackData.channels || [];
  const messages = slackData.messages || [];
  const users    = slackData.users    || [];
  const el = document.getElementById('comm-slack');

  if (channels.length === 0 && messages.length === 0) {
    el.innerHTML = '<div class="empty-state">No Slack data available.</div>';
    return;
  }

  // Build user display name map
  const uMap = {};
  users.forEach(u => { uMap[u.id] = u.real_name || u.display_name || u.name; });

  // Group + sort messages by channel
  const byChannel = {};
  messages.forEach(m => {
    const ch = m.channel || 'unknown';
    if (!byChannel[ch]) byChannel[ch] = [];
    byChannel[ch].push(m);
  });
  Object.values(byChannel).forEach(arr => arr.sort((a, b) => parseFloat(a.ts||0) - parseFloat(b.ts||0)));

  // Derive channel names from messages
  const channelNames = {};
  const channelPurposes = {};
  messages.forEach(m => {
    if (m.channel) {
      if (m.channel_name) channelNames[m.channel] = m.channel_name;
      if (m.channel_purpose) channelPurposes[m.channel] = m.channel_purpose;
    }
  });

  const channelList = channels.length > 0 ? channels : Object.keys(byChannel).map(id => ({ id, name: id }));

  // Pre-populate cache
  channelList.forEach(ch => {
    const name    = channelNames[ch.id] || ch.name || ch.id;
    const purpose = channelPurposes[ch.id] || ch.purpose || '';
    _slackCache[ch.id] = { msgs: byChannel[ch.id] || [], uMap, name, purpose };
  });

  el.innerHTML = `<div class="slack-layout">
    <div class="slack-channels">
      <div class="slack-ch-title">Channels</div>
      <div id="slack-ch-list"></div>
    </div>
    <div class="slack-messages" id="slack-msgs-panel">
      <div class="empty-state" style="padding:40px">Select a channel</div>
    </div>
  </div>`;

  const chListEl = document.getElementById('slack-ch-list');
  let chHtml = '';
  channelList.forEach(ch => {
    const name  = channelNames[ch.id] || ch.name || ch.id;
    const count = (byChannel[ch.id] || []).length;
    chHtml += `<div class="slack-ch-item" id="sl-ch-${escHtml(ch.id)}"
      onclick="loadSlackChannel('${escHtml(ch.id)}')">
      <span class="slack-ch-hash">#</span>
      <span>${escHtml(name)}</span>
      ${count ? `<span class="slack-ch-count">${count}</span>` : ''}
    </div>`;
  });
  chListEl.innerHTML = chHtml;

  // Auto-load first channel
  if (channelList.length > 0) loadSlackChannel(channelList[0].id);
}

function loadSlackChannel(channelId) {
  _slackActiveChannel = channelId;
  _slackPage = 1;
  document.querySelectorAll('.slack-ch-item').forEach(el => el.classList.remove('active'));
  const chEl = document.getElementById('sl-ch-' + channelId);
  if (chEl) chEl.classList.add('active');
  _drawSlackMessages();
}

function _drawSlackMessages() {
  const channelId = _slackActiveChannel;
  const cached = _slackCache[channelId];
  if (!cached) return;
  const { msgs, uMap, name, purpose } = cached;
  const panel = document.getElementById('slack-msgs-panel');
  const page = paginate(msgs, _slackPage, SLACK_PAGE_SIZE);

  let html = `<div class="slack-msg-header">
    <div>
      <h4># ${escHtml(name)}</h4>
      ${purpose ? `<p>${escHtml(purpose)}</p>` : ''}
    </div>
    <div style="margin-left:auto;font-size:11px;color:var(--text3)">${msgs.length} messages</div>
  </div>
  <div class="slack-msg-list">`;

  if (page.length === 0) {
    html += '<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">No messages</div>';
  } else {
    page.forEach(m => {
      const uid = m.user || '';
      const uName = uMap[uid] || uid || 'Unknown';
      const initials = uName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
      const isPersona = uid.startsWith('persona_');
      const ts = m.ts ? fmtTsTime(parseFloat(m.ts)) : '';
      html += `<div class="slack-msg-item">
        <div class="slack-avatar" style="${isPersona?'background:rgba(129,140,248,0.2);color:var(--indigo)':''}">${escHtml(initials)}</div>
        <div class="slack-msg-body">
          <span class="slack-msg-name ${isPersona?'slack-msg-persona':''}">${escHtml(uName)}</span>
          <span class="slack-msg-ts">${ts}</span>
          <div class="slack-msg-text">${escHtml(m.text||'')}</div>
          ${m.reactions && m.reactions.length ? `<div style="margin-top:4px;font-size:11px;color:var(--text3)">${m.reactions.map(r=>`${r.name} (${r.count||1})`).join(' · ')}</div>` : ''}
        </div>
      </div>`;
    });
  }
  html += '</div>';

  const totalPages = Math.ceil(msgs.length / SLACK_PAGE_SIZE);
  if (totalPages > 1) {
    html += `<div class="slack-pag">
      <button class="page-btn" ${_slackPage===1?'disabled':''} onclick="_slackPage=${_slackPage-1};_drawSlackMessages()">‹</button>
      <span style="font-size:12px;color:var(--text2);padding:4px 8px">${_slackPage} / ${totalPages}</span>
      <button class="page-btn" ${_slackPage===totalPages?'disabled':''} onclick="_slackPage=${_slackPage+1};_drawSlackMessages()">›</button>
    </div>`;
  }

  panel.innerHTML = html;
}
