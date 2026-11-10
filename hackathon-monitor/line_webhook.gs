/**
 * Japan hackathon monitor: message collector.
 *
 * Paste this into Extensions > Apps Script on the Google Sheet that will hold
 * the feed, then deploy it as a web app (see README.md). It receives:
 *   1. LINE webhook events from the bot you add to the hackathon LINE group.
 *   2. iMessage batches posted by imessage_sync.py on your Mac.
 * and appends one row per message to the "messages" tab.
 *
 * Script properties (Project Settings > Script properties):
 *   LINE_CHANNEL_ACCESS_TOKEN  long-lived channel access token (Messaging API tab)
 *   LINE_BOT_USER_ID           "Your user ID" on the Basic settings tab (starts with U)
 *   MAC_SHARED_SECRET          any long random string; same value goes in config.json on the Mac
 *   ALLOWED_GROUP_IDS          optional, comma-separated LINE group IDs to keep (others ignored)
 *
 * Limitation: Apps Script cannot read request headers, so the LINE
 * X-Line-Signature cannot be verified here. The script checks the bot ID and
 * the group allowlist instead. Treat the sheet as a log of what was posted,
 * not as proof of who posted it.
 */

var SHEET_NAME = 'messages';
var HEADER = ['timestamp_utc', 'source', 'chat', 'sender', 'text', 'message_id'];

function doGet() {
  return ContentService.createTextOutput('hackathon monitor collector is running');
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ok_();
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body && body.source === 'imessage') {
      handleImessage_(body);
    } else if (body && Array.isArray(body.events)) {
      handleLine_(body);
    }
  } finally {
    lock.releaseLock();
  }
  return ok_();
}

// ---------------------------------------------------------------- iMessage

function handleImessage_(body) {
  var secret = prop_('MAC_SHARED_SECRET');
  if (!secret || body.secret !== secret) return;
  var rows = [];
  (body.messages || []).forEach(function (m) {
    rows.push([m.timestamp, 'iMessage', m.chat, m.sender, m.text, 'imsg:' + m.guid]);
  });
  append_(rows);
}

// -------------------------------------------------------------------- LINE

function handleLine_(body) {
  var botId = prop_('LINE_BOT_USER_ID');
  if (botId && body.destination !== botId) return;

  var allowed = (prop_('ALLOWED_GROUP_IDS') || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(String);

  var rows = [];
  body.events.forEach(function (ev) {
    var src = ev.source || {};
    if (src.type !== 'group') return;
    var gid = src.groupId;

    if (ev.type === 'join') {
      // Logged even when not allowlisted, so you can find the group ID.
      rows.push([iso_(ev.timestamp), 'LINE', groupName_(gid), '(bot)',
        'Bot joined. Group ID: ' + gid, 'line-join:' + ev.webhookEventId]);
      return;
    }
    if (allowed.length && allowed.indexOf(gid) === -1) return;
    if (ev.type !== 'message' || !ev.message) return;

    var m = ev.message;
    var text = m.type === 'text' ? m.text : '[' + m.type + ']';
    if (m.type === 'file' && m.fileName) text = '[file] ' + m.fileName;
    rows.push([iso_(ev.timestamp), 'LINE', groupName_(gid),
      memberName_(gid, src.userId), text, 'line:' + m.id]);
  });
  append_(rows);
}

function lineGet_(path) {
  var token = prop_('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) return null;
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/' + path, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}

function groupName_(gid) {
  return cached_('g:' + gid, function () {
    var s = lineGet_('group/' + gid + '/summary');
    return s && s.groupName ? s.groupName : null;
  }) || gid;
}

function memberName_(gid, uid) {
  if (!uid) return '(unknown)';
  return cached_('u:' + gid + ':' + uid, function () {
    var p = lineGet_('group/' + gid + '/member/' + uid);
    return p && p.displayName ? p.displayName : null;
  }) || uid;
}

// ----------------------------------------------------------------- helpers

function append_(rows) {
  if (!rows.length) return;
  var cache = CacheService.getScriptCache();
  var fresh = rows.filter(function (r) {
    var key = 'seen:' + r[5];
    if (cache.get(key)) return false;
    cache.put(key, '1', 21600);
    return true;
  }).map(function (r) {
    return r.map(safeCell_);
  });
  if (!fresh.length) return;
  var sheet = sheet_();
  sheet.getRange(sheet.getLastRow() + 1, 1, fresh.length, HEADER.length).setValues(fresh);
}

// Stop message text from being run as a spreadsheet formula.
function safeCell_(v) {
  var s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 45000);
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADER);
  return sh;
}

function cached_(key, fn) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(key);
  if (hit) return hit;
  var val = fn();
  if (val) cache.put(key, val, 21600);
  return val;
}

function prop_(k) {
  return PropertiesService.getScriptProperties().getProperty(k);
}

function iso_(ms) {
  return new Date(ms).toISOString();
}

function ok_() {
  return ContentService.createTextOutput('ok');
}

/** Run once from the editor to create the tab and authorize the script. */
function setup() {
  sheet_();
  UrlFetchApp.fetch('https://api.line.me/v2/bot/info', { muteHttpExceptions: true });
}
