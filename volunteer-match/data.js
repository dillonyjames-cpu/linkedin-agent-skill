// Sample data for the demo. These shifts are illustrative, not real Kiwanis Club of Campbell events.
window.SEED = {
  skills: ['Cooking', 'Driving', 'Tutoring', 'Lifting', 'Event setup', 'Spanish', 'First aid', 'Photography', 'Data entry', 'Working with kids'],
  causes: ['Youth', 'Hunger', 'Seniors', 'Environment', 'Fundraising'],
  shifts: [
    { id: 's1', title: 'Pancake Breakfast cooks', cause: 'Fundraising', date: '2026-11-07', start: '07:00', end: '11:00', location: 'Community hall kitchen', skills: ['Cooking'], slots: 6, signups: ['v2', 'v3'], description: 'Flip pancakes and serve at the club fundraiser breakfast.' },
    { id: 's2', title: 'Pancake Breakfast setup and cleanup', cause: 'Fundraising', date: '2026-11-07', start: '06:00', end: '08:00', location: 'Community hall', skills: ['Event setup', 'Lifting'], slots: 4, signups: [], description: 'Set out tables and chairs before doors open.' },
    { id: 's3', title: 'After-school reading buddies', cause: 'Youth', date: '2026-11-10', start: '15:00', end: '16:30', location: 'Elementary school library', skills: ['Tutoring', 'Working with kids'], slots: 5, signups: ['v4'], description: 'Read one-on-one with K-3 students. Background check required.' },
    { id: 's4', title: 'Food pantry sorting', cause: 'Hunger', date: '2026-11-12', start: '18:00', end: '20:00', location: 'Partner food pantry', skills: [], slots: 8, signups: ['v2'], description: 'Sort and box donated food. No experience needed.' },
    { id: 's5', title: 'Senior grocery delivery', cause: 'Seniors', date: '2026-11-14', start: '09:00', end: '12:00', location: 'Starts at the senior center', skills: ['Driving'], slots: 4, signups: [], description: 'Deliver grocery orders to homebound seniors. Valid license and insurance required.' },
    { id: 's6', title: 'Creek cleanup', cause: 'Environment', date: '2026-11-14', start: '09:00', end: '12:00', location: 'Creek trail trailhead', skills: ['Lifting'], slots: 15, signups: ['v3', 'v4'], description: 'Pick up litter along the creek trail. Gloves and bags provided.' },
    { id: 's7', title: 'Homework help (bilingual)', cause: 'Youth', date: '2026-11-17', start: '16:00', end: '18:00', location: 'Youth center', skills: ['Tutoring', 'Spanish'], slots: 3, signups: [], description: 'Help middle schoolers with homework; Spanish speakers especially needed.' },
    { id: 's8', title: 'Thanksgiving meal prep', cause: 'Hunger', date: '2026-11-25', start: '13:00', end: '17:00', location: 'Church fellowship hall', skills: ['Cooking'], slots: 10, signups: ['v2'], description: 'Prepare holiday meals for families in need.' },
    { id: 's9', title: 'Holiday toy drive event photos', cause: 'Youth', date: '2026-12-05', start: '10:00', end: '13:00', location: 'Downtown plaza', skills: ['Photography'], slots: 1, signups: [], description: 'Photograph the toy drive for the club newsletter.' },
    { id: 's10', title: 'Holiday toy drive sorting', cause: 'Youth', date: '2026-12-05', start: '13:00', end: '16:00', location: 'Downtown plaza', skills: ['Lifting', 'Working with kids'], slots: 8, signups: [], description: 'Sort toys by age group and hand them out to families.' },
    { id: 's11', title: 'Senior center game night', cause: 'Seniors', date: '2026-12-09', start: '18:30', end: '20:30', location: 'Senior center', skills: [], slots: 5, signups: ['v3'], description: 'Host bingo and board games with residents.' },
    { id: 's12', title: 'Donor list cleanup', cause: 'Fundraising', date: '2026-12-12', start: '10:00', end: '12:00', location: 'Remote', skills: ['Data entry'], slots: 2, signups: [], description: 'Update the donor spreadsheet from paper forms.' }
  ],
  volunteers: [
    { id: 'v2', name: 'Sample: Maria Lopez', email: 'maria@example.com', skills: ['Cooking', 'Spanish'], interests: ['Hunger'], availability: ['sat-am', 'thu-eve', 'wed-pm'] },
    { id: 'v3', name: 'Sample: Dev Patel', email: 'dev@example.com', skills: ['Lifting', 'Event setup'], interests: ['Environment', 'Seniors'], availability: ['sat-am', 'wed-eve'] },
    { id: 'v4', name: 'Sample: Grace Kim', email: 'grace@example.com', skills: ['Tutoring', 'Working with kids'], interests: ['Youth'], availability: ['tue-pm', 'sat-am'] }
  ]
};
