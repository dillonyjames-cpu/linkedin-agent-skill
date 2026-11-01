// End-to-end check of the main flow in headless Chromium.
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));

  // 1. New volunteer fills in a profile.
  await page.fill('input[name=name]', 'Test Volunteer');
  await page.fill('input[name=email]', 'test@example.com');
  await page.check('#skill-boxes input[value="Lifting"]');
  await page.check('#cause-boxes input[value="Environment"]');
  // Submitting without availability shows an error.
  await page.click('#profile-form button[type=submit]');
  assert.match(await page.textContent('#profile-error'), /at least one time/);
  await page.check('input[value="sat-am"]');
  await page.click('#profile-form button[type=submit]');

  // 2. Matches appear, best first: creek cleanup (Sat am, Lifting, Environment).
  await page.waitForSelector('#match-list .item');
  const first = await page.textContent('#match-list .item h3');
  assert.strictEqual(first, 'Creek cleanup', 'top match was ' + first);
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/matches.png' : 'matches.png', fullPage: true });

  // 3. Sign up; schedule and rewards update; shift leaves the match list.
  await page.click('#match-list .item[data-shift="s6"] button[data-action=signup]');
  assert.strictEqual(await page.textContent('#stat-shifts'), '1');
  assert.strictEqual(await page.textContent('#stat-hours'), '3');
  assert.ok(await page.isVisible('#my-shifts .item[data-shift="s6"]'));
  assert.strictEqual(await page.$('#match-list .item[data-shift="s6"]'), null);
  assert.match(await page.textContent('#badge-list'), /First Shift/);
  // Overlapping Sat-morning senior delivery is no longer offered.
  assert.strictEqual(await page.$('#match-list .item[data-shift="s5"]'), null);

  // 4. Persists across reload.
  await page.reload();
  assert.strictEqual(await page.textContent('#stat-shifts'), '1');

  // 5. Coordinator sees the roster and gets suggestions.
  await page.click('#tab-coordinator');
  assert.match(await page.textContent('#shift-table .item[data-shift="s6"]'), /Test Volunteer/);
  await page.click('#shift-table .item[data-shift="s2"] button[data-action=suggest]');
  assert.match(await page.textContent('#suggest-s2'), /Test Volunteer|Dev Patel/);
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/coordinator.png' : 'coordinator.png', fullPage: true });

  // 6. Coordinator posts a shift; the volunteer sees it.
  await page.fill('#shift-form input[name=title]', 'Park planting');
  await page.selectOption('#shift-cause', 'Environment');
  await page.fill('#shift-form input[name=date]', '2026-12-19');
  await page.fill('#shift-form input[name=location]', 'City park');
  await page.click('#shift-form button[type=submit]');
  await page.click('#tab-volunteer');
  assert.match(await page.textContent('#match-list'), /Park planting/);

  // No horizontal scroll at phone width.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.strictEqual(overflow, false, 'page scrolls horizontally');
  assert.deepStrictEqual(errors, []);
  await browser.close();
  console.log('e2e: all checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
