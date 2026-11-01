# Kiwanis Volunteer Match

Hackathon demo for the Kiwanis Club of Campbell challenge (Volunteer Coordination):
help organizations recruit volunteers, match them to the right roles and schedules,
and make volunteering simple and rewarding.

## What it does

**Volunteers**
- Fill in a one-screen profile: skills, causes they care about, and a weekly availability grid.
- Get open shifts ranked by match score. Each match lists its reasons (fits your availability, uses your skills, matches your cause, needs volunteers).
- Sign up in one click. Full shifts and shifts that overlap one you already have are blocked.
- See their schedule, download any shift to their calendar (.ics), and cancel.
- Earn rewards: hours committed and badges (First Shift, Ten Hour Club, Community Explorer, Kids First).

**Coordinators**
- Dashboard: shifts posted, fill rate, volunteers, shifts under half full.
- Fill bar and roster for every shift, with "Needs help" flags.
- "Suggest volunteers": the top 3 registered volunteers who are free and fit a shift, each with a prefilled email invite.
- Post new shifts, which show up in volunteer matches right away.
- Export the full roster as CSV.

## Data and backend

No backend and no external services. It's a static site: `index.html`, `styles.css`,
`data.js` (made-up sample shifts and volunteers), `matching.js` (scoring logic) and `app.js` (UI).
State is saved in the browser's `localStorage`, so each visitor sees their own copy and
"Reset demo data" restores the sample set. A real deployment would need a shared
database and sign-in so coordinators and volunteers see the same shifts.

## Run and test

Open `index.html` in a browser, or serve the folder: `python3 -m http.server`.

```
node --test tests/matching.test.js   # matching logic
node tests/e2e.js                    # full flow in headless Chromium (needs playwright)
```

The `tests/` folder isn't part of the deployed site.
