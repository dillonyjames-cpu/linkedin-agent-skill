(function () {
  'use strict';
  const M = window.Matching;
  const SEED = window.SEED;
  const KEY = 'kvm-state-v1';
  const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  const PARTS = { am: 'Morning', pm: 'Afternoon', eve: 'Evening' };

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- state ----------
  function fresh() {
    return { shifts: JSON.parse(JSON.stringify(SEED.shifts)), volunteers: JSON.parse(JSON.stringify(SEED.volunteers)), currentId: null };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable: start fresh */ }
    return fresh();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  const current = () => state.volunteers.find((v) => v.id === state.currentId) || null;
  const volunteerName = (id) => (state.volunteers.find((v) => v.id === id) || { name: 'Unknown' }).name;

  // ---------- helpers ----------
  function fmtDate(shift) {
    const d = new Date(shift.date + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + fmtTime(shift.start) + '–' + fmtTime(shift.end);
  }
  function fmtTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return ((h + 11) % 12 + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm');
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function chipBoxes(container, name, values, checked) {
    container.innerHTML = values.map((v) =>
      '<label><input type="checkbox" name="' + name + '" value="' + esc(v) + '"' + (checked.includes(v) ? ' checked' : '') + '> ' + esc(v) + '</label>'
    ).join('');
  }
  function checkedValues(form, name) {
    return [...form.querySelectorAll('input[name="' + name + '"]:checked')].map((i) => i.value);
  }
  function download(filename, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // ---------- tabs ----------
  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      $('#view-volunteer').hidden = btn.dataset.view !== 'volunteer';
      $('#view-coordinator').hidden = btn.dataset.view !== 'coordinator';
      render();
    });
  });

  // ---------- volunteer view ----------
  function renderWho() {
    const sel = $('#who-select');
    sel.innerHTML = '<option value="">New volunteer…</option>' +
      state.volunteers.map((v) => '<option value="' + v.id + '"' + (v.id === state.currentId ? ' selected' : '') + '>' + esc(v.name) + '</option>').join('');
  }
  $('#who-select').addEventListener('change', (e) => {
    state.currentId = e.target.value || null;
    editing = false;
    save();
    render();
  });

  let editing = false;
  function renderProfileForm() {
    const v = current() || { name: '', email: '', skills: [], interests: [], availability: [] };
    const form = $('#profile-form');
    form.name.value = v.name;
    form.email.value = v.email;
    chipBoxes($('#skill-boxes'), 'skills', SEED.skills, v.skills);
    chipBoxes($('#cause-boxes'), 'interests', SEED.causes, v.interests);
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let html = '<tr><th></th>' + days.map((d) => '<th scope="col">' + DAY_LABELS[d] + '</th>').join('') + '</tr>';
    for (const p of Object.keys(PARTS)) {
      html += '<tr><th scope="row">' + PARTS[p] + '</th>' + days.map((d) => {
        const k = d + '-' + p;
        return '<td><input type="checkbox" name="availability" value="' + k + '" aria-label="' + DAY_LABELS[d] + ' ' + PARTS[p] + '"' + (v.availability.includes(k) ? ' checked' : '') + '></td>';
      }).join('') + '</tr>';
    }
    $('#avail-grid').innerHTML = html;
    $('#profile-error').textContent = '';
  }

  $('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      skills: checkedValues(form, 'skills'),
      interests: checkedValues(form, 'interests'),
      availability: checkedValues(form, 'availability')
    };
    if (!data.availability.length) {
      $('#profile-error').textContent = 'Pick at least one time you are free so we can match you.';
      return;
    }
    const v = current();
    if (v) Object.assign(v, data);
    else {
      const nv = Object.assign({ id: 'v' + Date.now().toString(36) }, data);
      state.volunteers.push(nv);
      state.currentId = nv.id;
    }
    editing = false;
    save();
    render();
    toast('Profile saved. Here are your matches.');
  });

  $('#edit-profile').addEventListener('click', () => { editing = true; render(); });

  function shiftCard(shift, extra) {
    const open = M.openSlots(shift);
    return '<div class="item' + (extra.off ? ' off' : '') + '" data-shift="' + shift.id + '">' +
      '<div class="row-between"><h3>' + esc(shift.title) + '</h3>' + (extra.right || '') + '</div>' +
      '<div class="meta">' + esc(fmtDate(shift)) + ' · ' + esc(shift.location) + '</div>' +
      '<div><span class="pill">' + esc(shift.cause) + '</span> ' +
        (shift.skills.length ? shift.skills.map((s) => '<span class="pill">' + esc(s) + '</span>').join(' ') : '<span class="pill">No experience needed</span>') +
        ' <span class="pill' + (open <= 1 ? ' warn' : '') + '">' + open + ' of ' + shift.slots + ' spots left</span></div>' +
      (shift.description ? '<div class="meta">' + esc(shift.description) + '</div>' : '') +
      (extra.body || '') +
      '</div>';
  }

  function renderVolunteer() {
    renderWho();
    const v = current();
    const showForm = !v || editing;
    $('#profile-form').hidden = !showForm;
    $('#volunteer-dash').hidden = showForm;
    if (showForm) { renderProfileForm(); return; }

    const ranked = M.rankShifts(v, state.shifts);
    const fits = ranked.filter((r) => r.available);
    const others = ranked.filter((r) => !r.available);
    $('#match-summary').textContent = fits.length
      ? fits.length + ' open shift' + (fits.length === 1 ? '' : 's') + ' fit your schedule, best match first.'
      : 'Nothing open fits your availability right now. Here are other shifts you could pick up.';
    const card = (r) => shiftCard(r.shift, {
      off: !r.available,
      right: r.available ? '<span class="score" title="Match score">' + r.score + '% match</span>' : '<span class="pill warn">Outside your availability</span>',
      body: '<ul class="reasons">' + r.reasons.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
        '<div><button type="button" class="primary" data-action="signup" data-id="' + r.shift.id + '">Sign up</button></div>'
    });
    $('#match-list').innerHTML = (fits.map(card).join('') +
      (others.length ? '<h3 class="muted">Other open shifts</h3>' + others.map(card).join('') : '')) ||
      '<p class="muted">You are signed up for every open shift. Thank you!</p>';

    const mine = state.shifts.filter((s) => s.signups.includes(v.id)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    $('#my-shifts').innerHTML = mine.length ? mine.map((s) => shiftCard(s, {
      body: '<div class="actions"><button type="button" data-action="ics" data-id="' + s.id + '">Add to calendar</button>' +
        '<button type="button" class="ghost" data-action="cancel" data-id="' + s.id + '">Cancel</button></div>'
    })).join('') : '<p class="muted">No shifts yet. Pick one from your matches.</p>';

    const r = M.rewards(v, state.shifts);
    $('#reward-stats').innerHTML =
      '<div class="stat"><b id="stat-shifts">' + r.shifts + '</b><span>shifts</span></div>' +
      '<div class="stat"><b id="stat-hours">' + r.hours.toFixed(1).replace(/\.0$/, '') + '</b><span>hours committed</span></div>';
    $('#badge-list').innerHTML = r.badges.length
      ? r.badges.map((b) => '<li><b>' + esc(b.name) + '</b> · ' + esc(b.detail) + '</li>').join('')
      : '<li>Sign up for a shift to earn your first badge.</li>';
  }

  function icsFor(shift) {
    const dt = (t) => shift.date.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kiwanis Volunteer Match//EN', 'BEGIN:VEVENT',
      'UID:' + shift.id + '@volunteer-match', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART:' + dt(shift.start), 'DTEND:' + dt(shift.end),
      'SUMMARY:Volunteer: ' + shift.title, 'LOCATION:' + shift.location, 'DESCRIPTION:' + (shift.description || ''),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  $('#view-volunteer').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const v = current();
    const shift = state.shifts.find((s) => s.id === btn.dataset.id);
    if (!v || !shift) return;
    if (btn.dataset.action === 'signup') {
      const res = M.signUp(v, shift, state.shifts);
      if (!res.ok) { toast(res.error); return; }
      save(); render();
      toast('You are signed up for ' + shift.title + '. Thank you!');
    } else if (btn.dataset.action === 'cancel') {
      M.cancel(v, shift);
      save(); render();
      toast('Cancelled. Your spot is open for someone else.');
    } else if (btn.dataset.action === 'ics') {
      download(shift.id + '.ics', icsFor(shift), 'text/calendar');
    }
  });

  // ---------- coordinator view ----------
  function renderCoordinator() {
    const totalSlots = state.shifts.reduce((t, s) => t + s.slots, 0);
    const filled = state.shifts.reduce((t, s) => t + s.signups.length, 0);
    const needy = state.shifts.filter((s) => s.signups.length / s.slots < 0.5);
    $('#coord-stats').innerHTML =
      '<div class="stat"><b>' + state.shifts.length + '</b><span>shifts posted</span></div>' +
      '<div class="stat"><b>' + Math.round((filled / Math.max(1, totalSlots)) * 100) + '%</b><span>spots filled (' + filled + '/' + totalSlots + ')</span></div>' +
      '<div class="stat"><b>' + state.volunteers.length + '</b><span>volunteers</span></div>' +
      '<div class="stat"><b>' + needy.length + '</b><span>shifts under half full</span></div>';

    const sorted = state.shifts.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    $('#shift-table').innerHTML = sorted.map((s) => {
      const pct = Math.round((s.signups.length / s.slots) * 100);
      const low = pct < 50;
      const roster = s.signups.length ? s.signups.map((id) => esc(volunteerName(id))).join(', ') : 'Nobody yet';
      return shiftCard(s, {
        right: low ? '<span class="pill warn">Needs help</span>' : '',
        body: '<div class="bar' + (low ? ' low' : '') + '" aria-label="' + pct + '% filled"><div style="width:' + pct + '%"></div></div>' +
          '<div class="meta">Roster: ' + roster + '</div>' +
          (M.openSlots(s) > 0 ? '<div><button type="button" data-action="suggest" data-id="' + s.id + '">Suggest volunteers</button></div><div class="suggest" id="suggest-' + s.id + '" hidden></div>' : '')
      });
    }).join('');

    chipBoxes($('#shift-skill-boxes'), 'skills', SEED.skills, []);
    $('#shift-cause').innerHTML = SEED.causes.map((c) => '<option>' + esc(c) + '</option>').join('');
  }

  $('#shift-table').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="suggest"]');
    if (!btn) return;
    const shift = state.shifts.find((s) => s.id === btn.dataset.id);
    const box = $('#suggest-' + shift.id);
    const picks = state.volunteers
      .map((v) => M.scoreShift(v, shift, state.shifts) && Object.assign({ v }, M.scoreShift(v, shift, state.shifts)))
      .filter((r) => r && r.available)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    box.hidden = false;
    box.innerHTML = picks.length
      ? '<b>Good fits who are free then:</b><ul class="reasons">' + picks.map((p) => {
          const subject = encodeURIComponent('Can you help with ' + shift.title + '?');
          const body = encodeURIComponent('Hi ' + p.v.name.replace(/^Sample: /, '') + ',\n\nWe think you would be great for "' + shift.title + '" on ' + fmtDate(shift) + ' at ' + shift.location + '. Could you join us?\n\nThanks!');
          return '<li>' + esc(p.v.name) + ' (' + p.score + '% match: ' + esc(p.reasons.join('; ')) + ') · <a href="mailto:' + esc(p.v.email) + '?subject=' + subject + '&body=' + body + '">Invite by email</a></li>';
        }).join('') + '</ul>'
      : 'No registered volunteers are free at this time. Try sharing the shift with the club.';
  });

  $('#shift-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.end.value <= f.start.value) { $('#shift-error').textContent = 'End time must be after start time.'; return; }
    $('#shift-error').textContent = '';
    state.shifts.push({
      id: 's' + Date.now().toString(36), title: f.title.value.trim(), cause: f.cause.value, date: f.date.value,
      start: f.start.value, end: f.end.value, location: f.location.value.trim(), description: f.description.value.trim(),
      skills: checkedValues(f, 'skills'), slots: parseInt(f.slots.value, 10), signups: []
    });
    save();
    f.reset();
    render();
    toast('Shift posted. It now shows up in volunteer matches.');
  });

  $('#export-csv').addEventListener('click', () => {
    const q = (x) => '"' + String(x).replace(/"/g, '""') + '"';
    const rows = [['Shift', 'Date', 'Start', 'End', 'Location', 'Volunteer', 'Email']];
    for (const s of state.shifts) {
      for (const id of s.signups) {
        const v = state.volunteers.find((x) => x.id === id) || {};
        rows.push([s.title, s.date, s.start, s.end, s.location, v.name || '', v.email || '']);
      }
    }
    download('volunteer-roster.csv', rows.map((r) => r.map(q).join(',')).join('\n'), 'text/csv');
  });

  $('#reset-demo').addEventListener('click', () => {
    if (!confirm('Reset all demo data in this browser?')) return;
    state = fresh();
    save();
    render();
    toast('Demo data reset.');
  });

  function render() {
    if (!$('#view-volunteer').hidden) renderVolunteer();
    if (!$('#view-coordinator').hidden) renderCoordinator();
  }
  render();
})();
