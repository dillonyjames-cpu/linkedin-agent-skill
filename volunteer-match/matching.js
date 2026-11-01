// Matching logic for Kiwanis Volunteer Match.
// Pure functions, no DOM: loaded by the browser as a plain script and by Node for tests.
(function (root) {
  'use strict';

  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function partOfDay(hhmm) {
    const h = parseInt(hhmm.split(':')[0], 10);
    if (h < 12) return 'am';
    if (h < 17) return 'pm';
    return 'eve';
  }

  // Availability slot key for a shift, e.g. "sat-am".
  function slotKey(shift) {
    const d = new Date(shift.date + 'T12:00:00');
    return DAYS[d.getDay()] + '-' + partOfDay(shift.start);
  }

  function minutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function shiftHours(shift) {
    return (minutes(shift.end) - minutes(shift.start)) / 60;
  }

  function overlaps(a, b) {
    return a.date === b.date && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
  }

  function openSlots(shift) {
    return shift.slots - shift.signups.length;
  }

  // Score one shift for one volunteer. Returns null when the shift is not a candidate.
  function scoreShift(volunteer, shift, allShifts) {
    if (shift.signups.includes(volunteer.id)) return null;
    if (openSlots(shift) <= 0) return null;
    const mine = allShifts.filter((s) => s.signups.includes(volunteer.id));
    const clash = mine.find((s) => overlaps(s, shift));
    if (clash) return null;

    let score = 0;
    const reasons = [];
    const available = volunteer.availability.includes(slotKey(shift));
    if (available) {
      score += 50;
      reasons.push('Fits your availability');
    }

    const skillHits = shift.skills.filter((s) => volunteer.skills.includes(s));
    if (skillHits.length) {
      score += Math.min(30, skillHits.length * 15);
      reasons.push('Uses your skills: ' + skillHits.join(', '));
    } else if (shift.skills.length === 0) {
      score += 10;
      reasons.push('No experience needed');
    }

    if (volunteer.interests.includes(shift.cause)) {
      score += 15;
      reasons.push('Matches your interest in ' + shift.cause);
    }

    if (openSlots(shift) / shift.slots >= 0.5) {
      score += 5;
      reasons.push('Needs volunteers: ' + openSlots(shift) + ' of ' + shift.slots + ' spots open');
    }

    return { shift, score, available, reasons };
  }

  // Ranked matches. Shifts outside the volunteer's availability are kept but listed after the rest.
  function rankShifts(volunteer, shifts) {
    return shifts
      .map((s) => scoreShift(volunteer, s, shifts))
      .filter(Boolean)
      .sort((a, b) => (b.available - a.available) || (b.score - a.score) || a.shift.date.localeCompare(b.shift.date));
  }

  // Sign a volunteer up. Returns {ok, error}.
  function signUp(volunteer, shift, allShifts) {
    if (shift.signups.includes(volunteer.id)) return { ok: false, error: 'You are already signed up for this shift.' };
    if (openSlots(shift) <= 0) return { ok: false, error: 'This shift is full.' };
    const clash = allShifts.find((s) => s !== shift && s.signups.includes(volunteer.id) && overlaps(s, shift));
    if (clash) return { ok: false, error: 'Overlaps with "' + clash.title + '" on the same day.' };
    shift.signups.push(volunteer.id);
    return { ok: true };
  }

  function cancel(volunteer, shift) {
    shift.signups = shift.signups.filter((id) => id !== volunteer.id);
  }

  // Hours and badges for the rewards panel.
  function rewards(volunteer, shifts) {
    const mine = shifts.filter((s) => s.signups.includes(volunteer.id));
    const hours = mine.reduce((t, s) => t + shiftHours(s), 0);
    const causes = new Set(mine.map((s) => s.cause));
    const badges = [];
    if (mine.length >= 1) badges.push({ name: 'First Shift', detail: 'Signed up for your first shift' });
    if (hours >= 10) badges.push({ name: 'Ten Hour Club', detail: '10+ hours committed' });
    if (causes.size >= 3) badges.push({ name: 'Community Explorer', detail: 'Helping with 3+ causes' });
    if (causes.has('Youth') && mine.filter((s) => s.cause === 'Youth').length >= 2) {
      badges.push({ name: 'Kids First', detail: '2+ youth service shifts' });
    }
    return { shifts: mine.length, hours, badges };
  }

  const api = { DAYS, slotKey, shiftHours, overlaps, openSlots, scoreShift, rankShifts, signUp, cancel, rewards };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Matching = api;
})(typeof window !== 'undefined' ? window : globalThis);
