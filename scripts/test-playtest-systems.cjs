// Run with NODE_PATH pointing to the bundled Node packages, then node this file.
// Loads the root game in Edge. Test-only hooks are injected into the HTTP response.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const hooks = ['advanceHousehold', 'updateLineageState', 'transferLineageMoney', 'resolveDeathContinuation', 'livingHeir', 'calculateTravel', 'startTravel', 'advanceTravel', 'extendTravel', 'travelBudget', 'ensureLocationState', 'addAvailableQuests', 'acceptQuest', 'advanceQuests', 'applyEffects', 'updateFactionReputation', 'migrateState', 'validateSaveData', 'importSave', 'relocateToArea', 'ensureAreaState', 'shopAccess', 'buyShopManual', 'selectServicePoint', 'availableTravelDestinations', 'activityAvailability', 'getAvailableLocations', 'getAvailableExplorationAreas', 'prepareTravelCamp', 'returnFromTravel', 'closeTravelRoute', 'equipTechnique', 'buyMaterial', 'sellMaterial', 'tradeGradedMaterial', 'sellItem'];
hooks.push('prepareStoryLocation', 'learningTeacher', 'canTakeJob', 'canMeetWorldCharacter', 'syncCharacterLocations', 'destroyLocation', 'evacuateClosedLocation', 'setOfficialAffiliation', 'getEventPool', 'openTravelRoute', 'nextTravelInstallment', 'worldRegion', 'worldEventIntervention');
const runtime = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace('  window.__game__ = {', `  window.__systemTest = { ${hooks.join(', ')} };\n  window.__game__ = {`);
const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const content = file === path.join(root, 'app.js') ? runtime : fs.readFileSync(file);
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }); res.end(content);
  } catch { res.writeHead(404).end(); }
});
let browser;
const results = [];
async function test(name, fn, {rule = 'one-life', story = false} = {}) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.addInitScript(() => { Math.random = () => .99; });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(({rule, story}) => {
      document.querySelector('#gmail-email').value = 'regression@gmail.com';
      document.querySelector('#gmail-login-form').requestSubmit();
      document.querySelector(story ? '#mode-story-btn' : '#mode-free-btn').click();
      if (!story) document.querySelector(`[data-rule="${rule}"]`).click();
      document.querySelector('#begin-btn').click();
      window.check = (ok, message) => { if (!ok) throw new Error(message); };
      const s = window.__game__.getState(); s.paused = true; s.autoMode = false;
    }, {rule, story});
    if (story) await page.waitForTimeout(300);
    const detail = await fn(page);
    assert.deepEqual(errors, [], 'browser runtime errors');
    results.push({name, passed: true, detail}); console.log('PASS', name);
  } catch (error) {
    results.push({name, passed: false, error: error.message, browserErrors: errors}); console.error('FAIL', name, error.message);
  } finally { await context.close(); }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});

  await test('save import escapes family text and rejects unsafe structures', async page => {
    await page.evaluate(() => {
      const g = window.__game__, t = window.__systemTest, s = g.getState();
      const payload = '<img src=x onerror="window.__probe=42">'; window.__probe = 0;
      s.hero.ageMonths = 240;
      s.family.children = [{id: 'child', name: payload, ageMonths: 60, health: 100, goal: payload, status: payload, path: null, alive: true}];
      t.importSave(new File([JSON.stringify(s)], 'save.json', {type: 'application/json'}));
    });
    await page.waitForTimeout(100);
    return page.evaluate(() => {
      const t = window.__systemTest, g = window.__game__;
      check(window.__probe === 0, 'imported code ran');
      check(!document.querySelector('#family-status img'), 'name became HTML');
      check(document.querySelector('#family-status').textContent.includes('<img'), 'literal name not preserved');
      const saved = JSON.parse(JSON.stringify(g.getState()));
      t.migrateState(saved);
      const malicious = JSON.parse(JSON.stringify(saved)); malicious.hero.health = '<img src=x>';
      let rejected = false; try { t.migrateState(malicious); } catch { rejected = true; }
      check(rejected, 'non-numeric health accepted');
      rejected = false; try { t.migrateState(JSON.parse('{"hero":{},"month":0,"__proto__":{}}')); } catch { rejected = true; }
      check(rejected, 'prototype key accepted');
      return {literalText: true, malformedRejected: true};
    });
  });

  await test('lineage balances and transfers conserve money', page => page.evaluate(() => {
    const s = window.__game__.getState(), t = window.__systemTest;
    s.hero.ageMonths = 240; s.hero.money = 130; s.lineageState.treasury = 100; s.household.debt = 38;
    s.activity = 'work'; t.updateLineageState(s);
    check(s.hero.money === 130 && s.lineageState.treasury === 100 && s.household.debt === 38, 'monthly update overwrote accounts');
    check(t.transferLineageMoney(s, 30), 'deposit failed');
    check(s.hero.money === 100 && s.lineageState.treasury === 130, 'deposit not conserved');
    check(t.transferLineageMoney(s, -20), 'withdraw failed');
    check(s.hero.money === 120 && s.lineageState.treasury === 110, 'withdraw not conserved');
    check(!t.transferLineageMoney(s, -999), 'overdraft allowed');
    s.activity = 'train'; s.lineageState.prestige = 120; t.updateLineageState(s);
    check(!s.ending, 'generation zero finished dynasty');
  }), {rule: 'dynasty'});

  await test('dynasty without a living heir terminates', page => page.evaluate(() => {
    const s = window.__game__.getState(), t = window.__systemTest;
    s.family.children = [];
    check(t.resolveDeathContinuation(s, {}).kind === 'terminal', 'invented an heir');
    s.family.children = [{id: 'dead', health: 0, alive: false}];
    check(t.resolveDeathContinuation(s, {}).kind === 'terminal', 'dead heir selected');
  }), {rule: 'dynasty'});

  await test('existing heir retains identity, age, and surviving parent', page => page.evaluate(() => {
    const g = window.__game__, s = g.getState();
    s.hero.name = 'บิดา'; s.hero.money = 50; s.lineageState.treasury = 100;
    s.locationState.closedAreaIds = ['jade_auction']; s.locationState.closedShopIds = ['border_books'];
    s.family.spouse = {name: 'เหมย', health: 85, alive: true, affection: 80};
    s.family.children = [{id: 'heir', name: 'เสี่ยวหลิน', ageMonths: 240, health: 90, alive: true, stats: {body: 16}, milestones: []}, {id: 'sibling', name: 'น้อง', ageMonths: 180, health: 90, alive: true}];
    s.family.heirId = 'heir'; s.lifeSummary = g.createLifeSummary(s, 'death', {cause: 'test'}); s.continuation = {kind: 'heir-baby'};
    check(g.continueLife(), 'continuation failed');
    check(s.hero.name === 'เสี่ยวหลิน' && s.hero.ageMonths === 240, 'wrong heir identity or age');
    check(s.family.parents.some(p => p.name === 'เหมย' && p.alive), 'surviving parent missing');
    check(!s.family.children.some(c => c.id === 'heir'), 'hero is own child');
    check(s.family.relatives.some(c => c.id === 'sibling'), 'sibling missing');
    check(s.lineageState.treasury === 150 && s.hero.money === 0, 'inheritance duplicated or lost money');
    check(s.locationState.closedAreaIds.includes('jade_auction') && s.locationState.closedShopIds.includes('border_books'), 'world closures lost across inheritance');
    check(s.lifeHistory.length === 1 && !g.continueLife(), 'continuation not idempotent');
  }), {rule: 'dynasty'});

  await test('reload resumes saved rebirth exactly once', async page => {
    await page.evaluate(() => {
      const g = window.__game__, s = g.getState();
      s.lifeSummary = g.createLifeSummary(s, 'death', {cause: 'test'}); s.continuation = {kind: 'rebirth-baby'}; s.paused = true; g.saveGame();
    });
    await page.reload();
    await page.evaluate(() => window.__game__.continueGame());
    return page.evaluate(() => {
      const g = window.__game__, s = g.getState();
      if (s.hero.ageMonths !== 0 || s.lifeHistory.length !== 1 || s.continuation) throw new Error('rebirth not recovered');
      g.continueGame();
      if (g.getState().lifeHistory.length !== 1) throw new Error('rebirth repeated');
    });
  }, {rule: 'rebirth'});

  await test('travel charges exactly the quoted total and stays at market', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.hero.health = 100; s.materials.herb = 1;
    const quote = t.calculateTravel(s, 'market', {vehicle: 'foot'}), life = s.hero.lifespanMonths;
    check(quote.ok && t.startTravel(s, 'market', {vehicle: 'foot'}), 'trip rejected');
    for (let i = 0; i < quote.months; i++) { s.month++; t.advanceTravel(s); }
    check(!s.travel.active && s.locations.current === 'market', 'arrival location wrong');
    check(s.hero.money === 100 - quote.cost + 3, 'money differs from quote plus arrival reward');
    check(s.hero.health === 100 - quote.health && s.hero.lifespanMonths === life - quote.lifespan, 'health/life differ from quote');
    check(s.materials.herb === 1, 'supplies differ from quote plus arrival reward');
    s.month++; t.ensureLocationState(s); check(s.locations.current === 'market', 'market location reset');
    return quote;
  }));

  await test('travel rounding, delay, and old trip migration', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 10; s.materials.spiritStone = 10;
    t.relocateToArea(s, 'border_market');
    check(t.startTravel(s, 'auction', {vehicle: 'foot'}), 'auction trip rejected');
    const quote = s.travel.active.cost, money = s.hero.money;
    t.advanceTravel(s); t.extendTravel(s, 2);
    while (s.travel.active) t.advanceTravel(s);
    check(s.hero.money === money - quote, 'rounding/delay overcharged');
    const old = {cost: 8, health: 3, lifespan: 2, resources: {herb: 1}, totalMonths: 3, monthsLeft: 2};
    const remaining = t.travelBudget(old);
    check(remaining.cost === 5 && remaining.health === 0 && remaining.resources.herb === 0, 'old charges not credited');
    check(t.travelBudget(old).cost === 5, 'old migration ran twice');
  }));

  await test('quest mode scope, auto preference, and deadline completion', async page => {
    await page.evaluate(() => { const select = document.querySelector('#auto-quest-rule-select'); select.value = 'pause'; select.dispatchEvent(new Event('change')); });
    return page.evaluate(() => {
      const g = window.__game__, t = window.__systemTest, s = g.getState();
      check(s.autoQuestRule === 'pause', 'UI preference not stored');
      s.hero.ageMonths = 240; s.month = 100; t.addAvailableQuests(s);
      check(!s.quests.active.length, 'pause auto accepted');
      check(!s.quests.available.some(id => ['survive_the_road', 'trace_serpent_shadow', 'prepare_cloud_sect'].includes(id)), 'story quest in free life');
      check(!t.acceptQuest(s, 'survive_the_road'), 'manual scope bypass');
      s.quests.active = [{id: 'herbal_supplier', acceptedMonth: 0, deadlineMonth: 101}];
      s.materialLife.farmMonths = 2; s.household.job = 'farmer'; s.hero.attributes.body = 20;
      s.hero.money = 100; s.hero.health = s.hero.maxHealth; g.setActivity(s, 'work'); g.processMonth();
      check(s.materialLife.farmMonths === 3, 'last month activity not processed');
      check(s.quests.completed.includes('herbal_supplier') && !s.quests.failed.includes('herbal_supplier'), 'deadline completion lost');
      const copy = t.migrateState(JSON.parse(JSON.stringify(s))); check(copy.autoQuestRule === 'pause', 'preference lost on reload');
    });
  });

  await test('uncompleted quest fails once at the deadline', page => page.evaluate(() => {
    const s = window.__game__.getState(), t = window.__systemTest;
    s.hero.ageMonths = 240; s.month = 24; s.autoQuestRule = 'pause';
    s.quests.active = [{id: 'herbal_supplier', acceptedMonth: 0, deadlineMonth: 24}];
    s.materialLife.farmMonths = 0; t.advanceQuests(s); const reputation = s.hero.reputation; t.advanceQuests(s);
    check(s.quests.failed.filter(id => id === 'herbal_supplier').length === 1 && s.hero.reputation === reputation, 'failure repeated');
  }));

  await test('auto craft stop pauses; auto learning pays normal cost', page => page.evaluate(() => {
    const g = window.__game__, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 0; s.materials.spiritStone = 0; s.family.parents = [{alive: false}];
    g.setActivity(s, 'craft'); s.crafting.auto = {enabled: true, mode: 'stop', recipeId: 'spirit_pill'};
    const intellect = s.hero.attributes.intellect; g.processMonth();
    check(!s.crafting.auto.enabled && s.paused && !s.autoMode && s.activity === 'rest', 'stop did not stop');
    check(s.hero.attributes.intellect === intellect, 'stop gave craft gain');
    s.pendingEvent = null; s.crafting.auto = {enabled: true, mode: 'learn', recipeId: 'spirit_pill'};
    g.setActivity(s, 'craft'); const knowledge = s.crafting.knowledge.alchemy, money = s.hero.money; g.processMonth();
    check(s.crafting.knowledge.alchemy === knowledge + 1 && s.hero.money === money - 2, 'auto learn differs from manual cost');
    s.pendingEvent = null; s.hero.money = 0; g.setActivity(s, 'craft'); const before = s.crafting.knowledge.alchemy; g.processMonth();
    check(s.crafting.knowledge.alchemy === before, 'free knowledge with no money');
  }));

  await test('faction reward survives recomputation and save migration', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    t.updateFactionReputation(s); const before = s.factions.sect;
    t.applyEffects(s, [{type: 'faction', key: 'sect', value: 4}]); t.updateFactionReputation(s); t.updateFactionReputation(s);
    check(s.factions.sect === before + 4, 'reward overwritten or multiplied');
    const old = JSON.parse(JSON.stringify(s)); delete old.factionRewards; const total = old.factions.sect;
    t.updateFactionReputation(old); t.updateFactionReputation(old); check(old.factions.sect === total, 'legacy total not preserved');
    s.relations.master += 10; t.updateFactionReputation(s); check(s.factions.sect > before + 4 && s.factionRewards.sect === 4, 'derived score frozen');
  }));

  for (const area of ['moonwell', 'serpent_tunnel']) {
    await test(`secret discovery only on success: ${area}`, page => page.evaluate(area => {
      const g = window.__game__, s = g.getState();
      s.hero.ageMonths = 240; s.month = 80; s.hero.money = 100; s.hero.health = 1000; s.hero.maxHealth = 1000;
      window.__systemTest.relocateToArea(s, 'forest_caves');
      s.flags.foundMap = true; s.paths.insight = 10; s.flags.knowsTraitor = false;
      s.flags.moonwellFound = false; s.flags.serpentTunnelFound = false;
      g.setActivity(s, 'explore'); s.exploration.selectedArea = area; s.testExplorationRoll = 99; g.processMonth();
      check(s.exploration.lastOutcome.outcome === 'lost', 'lost case not reached');
      check(!s.flags.moonwellFound && !s.flags.serpentTunnelFound && !s.flags.knowsTraitor, 'lost awarded clue');
      s.pendingEvent = null; s.testExplorationRoll = 0; g.processMonth();
      check(s.exploration.lastOutcome.outcome === 'enemy', 'enemy case not reached');
      check(!s.flags.moonwellFound && !s.flags.serpentTunnelFound && !s.flags.knowsTraitor, 'enemy awarded clue');
      s.pendingEvent = null; s.testExplorationRoll = 45; g.processMonth();
      check(s.exploration.lastOutcome.outcome === 'resource', 'resource case not reached');
      check(area === 'moonwell' ? s.flags.moonwellFound : s.flags.serpentTunnelFound && s.flags.knowsTraitor, 'successful discovery missing');
    }, area));
  }

  await test('small debt amortizes; arrears never improve negative reputation', page => page.evaluate(() => {
    const s = window.__game__.getState(), t = window.__systemTest;
    s.hero.ageMonths = 240; s.hero.money = 1000; s.household.debt = 5; s.household.interestRate = .08;
    for (let i = 0; i < 10; i++) t.advanceHousehold(s);
    check(s.household.debt === 0, 'small debt never repaid');
    for (const reputation of [25, 0, -25, -100]) {
      s.hero.money = 0; s.hero.reputation = reputation; s.household.debt = 20; s.household.arrears = 1;
      t.advanceHousehold(s); check(s.hero.reputation === Math.max(-100, reputation - 1), 'bad reputation floor');
    }
    s.hero.money = 20; s.household.debt = 12; s.household.arrears = 2; s.flags.debtCollectionDue = true;
    const month = s.month; window.__game__.render(); document.querySelector('#household-repay-btn').click();
    check(s.household.debt === 0 && s.hero.money === 8 && s.month === month, 'payoff button changed wrong balance or time');
    check(!s.flags.debtCollectionDue && s.household.arrears === 0, 'payoff left collection state');
    s.hero.money = 3; s.household.debt = 12; window.__game__.render(); document.querySelector('#household-repay-btn').click();
    check(s.hero.money === 0 && s.household.debt === 9, 'partial repayment failed');
  }));

  await test('story quest rewards complete at the deadline and persist', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.pendingEvent = null; s.hero.ageMonths = 240; s.month = 99; s.hero.money = 100; s.flags.alliesRecruited = true;
    s.autoQuestRule = 'pause'; s.quests.active = [{id: 'prepare_cloud_sect', acceptedMonth: 40, deadlineMonth: 100}];
    t.updateFactionReputation(s); const before = s.factionRewards.sect;
    g.setActivity(s, 'rest'); g.processMonth();
    check(s.quests.completed.includes('prepare_cloud_sect'), 'story quest failed at deadline');
    check(s.factionRewards.sect === before + 4, 'story faction reward lost');
    const migrated = t.migrateState(JSON.parse(JSON.stringify(s)));
    check(migrated.factionRewards.sect === before + 4, 'reward lost after save');
  }), {story: true});

  await test('actual dynasty death without heirs shows a terminal ending', async page => {
    await page.evaluate(() => {
      const g = window.__game__, s = g.getState();
      s.hero.ageMonths = s.hero.lifespanMonths - 1; s.hero.money = 100; s.family.children = [];
      g.setActivity(s, 'rest'); g.processMonth();
      check(s.ending && s.continuation.kind === 'terminal', 'death did not terminate');
    });
    await page.waitForTimeout(220);
    return page.evaluate(() => { check(window.__game__.getState().lifeHistory.length === 0, 'phantom heir created'); });
  }, {rule: 'dynasty'});

  await test('legacy pending dynasty with no heir recovers to summary', async page => {
    await page.evaluate(() => {
      const g = window.__game__, s = g.getState();
      s.lifeSummary = g.createLifeSummary(s, 'death', {cause: 'test'}); s.family.children = [];
      s.continuation = {kind: 'heir-baby'}; g.saveGame();
    });
    await page.reload();
    return page.evaluate(() => {
      window.__game__.continueGame(); const s = window.__game__.getState();
      if (!s.ending || s.continuation.kind !== 'terminal' || document.querySelector('#summary-screen').hidden) throw new Error('legacy no-heir transition stuck');
    });
  }, {rule: 'dynasty'});

  await test('travel pause updates ETA and resume respects remaining budget', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 5;
    t.startTravel(s, 'market', {vehicle: 'foot'}); g.processMonth();
    check(s.travel.active.monthsLeft === 1, 'first month not traveled');
    g.setActivity(s, 'rest'); g.processMonth(); g.processMonth();
    check(s.travel.active.etaMonth === s.month + 1, 'paused ETA stale');
    g.setActivity(s, 'travel'); g.processMonth();
    check(!s.travel.active && s.locations.current === 'market', 'resume failed');
  }));

  for (const story of [false, true]) {
    await test(`extended ${story ? 'story' : 'free'} life and old-version save roundtrip`, page => page.evaluate(() => {
      const g = window.__game__, t = window.__systemTest, s = g.getState();
      for (let steps = 0; steps < 1800 && s.month < 240 && !s.ending; steps++) {
        if (s.pendingEvent) {
          const buttons = [...document.querySelectorAll('#event-choices button:not([disabled])')];
          const choice = buttons.find(button => /พัก|ถอย|ไม่เข้าไป|ปฏิเสธ|หลบ/.test(button.textContent)) || buttons[0];
          check(!!choice, `event has no choice: ${s.pendingEvent} at month ${s.month}`); choice.click();
        } else { g.setActivity(s, 'rest'); g.processMonth(); }
      }
      g.render();
      const current = t.migrateState(JSON.parse(JSON.stringify(s)));
      check(current.month === s.month, 'current-version roundtrip changed time');
      const old = JSON.parse(JSON.stringify(s)); old.version = 9; delete old.factionRewards;
      const migrated = t.migrateState(old);
      check(migrated.version === 10 && migrated.month === s.month, 'version 9 migration failed');
      return {month: s.month, ending: s.ending?.type || null};
    }), {story});
  }

  await test('location: origin routes and activity changes never teleport', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 10;
    check(!t.calculateTravel(s, 'auction').ok, 'auction reachable without market leg');
    check(t.calculateTravel(s, 'market').route.fromAreaId === 'starting_village', 'wrong origin');
    t.relocateToArea(s, 'border_market'); s.locations.owned.push('owned', 'sect');
    for (const activity of ['train', 'rest', 'work', 'social', 'travel']) {
      g.setActivity(s, activity); check(s.locationState.currentAreaId === 'border_market', `${activity} teleported`);
    }
    check(!t.getAvailableLocations(s, 'rest').some(p => ['owned', 'sect'].includes(p.id)), 'remote property available');
    check(!t.selectServicePoint(s, 'sect_archive'), 'remote point entered');
    check(t.selectServicePoint(s, 'market_books') && s.locationState.currentAreaId === 'border_market', 'local point not selectable');
    g.render(); check(document.querySelector('#location-name').textContent.includes('เมืองตลาด'), 'scene location disagrees');
  }));

  await test('location: market persists across months and reload; preview stays put', async page => {
    await page.evaluate(() => {
      const g = window.__game__, t = window.__systemTest, s = g.getState();
      s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 10;
      t.startTravel(s, 'market'); g.processMonth(); g.processMonth();
      check(s.locationState.currentAreaId === 'border_market' && !s.travel.active, 'did not arrive');
      for (let i = 0; i < 3; i++) { s.pendingEvent = null; g.processMonth(); }
      check(s.locationState.currentAreaId === 'border_market' && !s.travel.active, 'left market automatically');
      g.setActivity(s, 'travel'); s.pendingEvent = null; g.processMonth();
      check(!s.travel.active && s.locationState.currentAreaId === 'border_market', 'route preview started a trip');
      s.paused = true; g.saveGame();
    });
    await page.reload();
    return page.evaluate(() => {
      const g = window.__game__; g.continueGame();
      if (g.getState().locationState.currentAreaId !== 'border_market') throw new Error('reload moved area');
    });
  });

  await test('location: stranded travel denies shops and has camp recovery', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 2;
    t.startTravel(s, 'market'); s.hero.money = 0; s.materials.herb = 0;
    t.advanceTravel(s);
    check(s.travel.active?.status === 'stranded' && s.locationState.currentAreaId === 'starting_village', 'stranding lost trip or arrived');
    check(!t.shopAccess(s, 'border_books').ok && !t.activityAvailability(s, 'craft').ok, 'city service in transit');
    const before = s.travel.active.monthsLeft; t.prepareTravelCamp(s); g.processMonth();
    check(s.travel.active.monthsLeft === before && s.materials.herb >= 1 && s.hero.money > 0, 'camp recovery made no progress');
    g.setActivity(s, 'travel'); s.pendingEvent = null;
    for (let i = 0; i < 8 && s.travel.active; i++) { s.pendingEvent = null; if (s.travel.active.status === 'stranded') t.prepareTravelCamp(s); else g.setActivity(s, 'travel'); g.processMonth(); }
    check(!s.travel.active && s.locationState.currentAreaId === 'border_market', 'recovery could not finish');
  }));

  await test('location: migration preserves active budget and ignores arrival history', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, source = g.getState();
    const old = JSON.parse(JSON.stringify(source)); delete old.locationState;
    old.locations.current = 'roadside'; old.travel.lastArrival = {destination: 'market', month: 9, kind: 'trade'};
    old.hero.money = 45; old.hero.ageMonths = 240; old.travel.active = {routeId: 'roadside-market', destination: 'market', monthsLeft: 1, totalMonths: 2, cost: 4, health: 2, lifespan: 1, resources: {herb: 1}, etaMonth: 3};
    const migrated = t.migrateState(old); const budget = JSON.stringify(migrated.travel.active.paid);
    check(migrated.locationState.currentAreaId === 'starting_village', 'lastArrival inferred current market');
    check(migrated.travel.active.toAreaId === 'border_market' && migrated.travel.active.monthsLeft === 1 && migrated.hero.money === 45, 'migration altered pending trip or money');
    const repeated = t.migrateState(JSON.parse(JSON.stringify(migrated)));
    check(JSON.stringify(repeated.travel.active.paid) === budget && repeated.hero.ageMonths === 240, 'migration changed twice');
    check(!Object.hasOwn(JSON.parse(JSON.stringify(repeated.locations)), 'current'), 'second persisted point remains');
    check(Object.keys(localStorage).some(key => key.includes('before_location_v1')), 'pre-migration backup missing');
    const ambiguous = JSON.parse(JSON.stringify(source)); delete ambiguous.locationState; ambiguous.locations.current = 'unknown-old-place';
    ambiguous.hero.money = 37; ambiguous.relations.friend = 17; ambiguous.materials.herb = 7;
    const fallback = t.migrateState(ambiguous);
    check(fallback.locationState.currentAreaId === 'starting_village' && !!fallback.locationState.migrationNotice, 'ambiguous position not reported');
    check(fallback.hero.money === 37 && fallback.relations.friend === 17 && fallback.materials.herb === 7, 'fallback altered progress');
  }));

  await test('location: manual shop buys once then normal learning/equip/train works', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; t.relocateToArea(s, 'border_market'); g.render();
    check(t.buyShopManual(s, 'border_books', 'book_cloud_origin'), 'manual purchase failed');
    check(s.hero.money === 82 && s.treasures.filter(i => i.techniqueId === 'manual_cloud_origin').length === 1, 'wrong price or item');
    check(!t.buyShopManual(s, 'border_books', 'book_cloud_origin') && s.hero.money === 82, 'repeat purchase charged');
    s.learningState.focus = 'cultivation'; s.learningState.techniqueFocus = 'manual:manual_cloud_origin';
    for (let i = 0; i < 36 && !s.learnedManualTechniques.includes('manual_cloud_origin'); i++) { s.pendingEvent = null; g.setActivity(s, 'study'); g.processMonth(); }
    check(s.learnedManualTechniques.includes('manual_cloud_origin'), 'could not learn purchased manual');
    check(t.equipTechnique(s, 'manual_cloud_origin') && s.hero.cultivationAccess, 'could not equip/open cultivation');
    s.pendingEvent = null; const before = s.hero.cultivation; g.setActivity(s, 'train'); g.processMonth();
    check(s.hero.cultivation > before || s.hero.stage > 1, 'training did not progress');
    g.render();
  }));

  await test('location: local material trade has no immediate roundtrip profit', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 1000; t.relocateToArea(s, 'border_market');
    const money = s.hero.money;
    for (let i = 0; i < 10; i++) { check(t.buyMaterial(s, 'herb'), 'buy herb failed'); check(t.sellMaterial(s, 'herb'), 'sell herb failed'); check(t.tradeGradedMaterial(s, 'iron', 'uncommon', true), 'buy grade failed'); check(t.tradeGradedMaterial(s, 'iron', 'uncommon', false), 'sell grade failed'); }
    check(s.hero.money <= money, 'immediate material arbitrage');
    t.relocateToArea(s, 'starting_village'); check(!t.buyMaterial(s, 'herb'), 'remote trade allowed');
    t.relocateToArea(s, 'border_market'); s.locationState.closedShopIds.push('border_materials'); check(!t.buyMaterial(s, 'herb'), 'closed shop traded');
    g.render(); check(document.querySelector('#selling-list').parentElement.id === 'world-material-store', 'material shop still in crafting panel');
  }));

  await test('location: destroyed and closed areas retain an evacuation exit', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    t.relocateToArea(s, 'border_market'); s.locationState.closedAreaIds.push('border_market');
    check(!t.shopAccess(s, 'border_books').ok, 'closed area opened shop');
    check(t.evacuateClosedLocation(s), 'no evacuation for child');
    check(s.travel.active.emergency && t.activityAvailability(s, 'travel').ok, 'evacuation age gate blocks child');
    g.processMonth(); check(!s.travel.active && s.locationState.currentAreaId === 'starting_village', 'evacuation did not reach refuge');
    check(t.activityAvailability(s, 'rest').ok, 'no activity at refuge');
    s.locationState.closedAreaIds = []; t.relocateToArea(s, 'border_market');
    check(t.selectServicePoint(s, 'market_materials') && t.destroyLocation(s, 'market_materials'), 'new service point cannot be destroyed');
    check(s.locationState.currentAreaId === 'border_market' && s.locationState.currentPointId !== 'market_materials', 'destroyed shop trapped or teleported character');
    check(!t.shopAccess(s, 'border_materials').ok && t.shopAccess(s, 'border_books').ok, 'destruction closed wrong services');
  }));

  await test('location: NPC and teachers require local living presence', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.pendingEvent = null; s.hero.ageMonths = 240; s.month = 100; s.flags.metSect = true; s.relations.master = 50;
    t.relocateToArea(s, 'border_market'); check(t.learningTeacher(s).id === 'self', 'remote master taught');
    check(!t.setOfficialAffiliation(s, 'sect'), 'remote sect affiliation');
    t.relocateToArea(s, 'cloud_sect', '', 'sect'); check(t.learningTeacher(s).npcId === 'wen-zhong', 'local master not available');
    s.flags.masterDead = true; check(t.learningTeacher(s).npcId !== 'wen-zhong', 'dead master taught');
    const actors = t.syncCharacterLocations(s); const actor = actors.find(c => c.id !== 'lin-an');
    actor.areaId = 'cloud_sect'; actor.alive = true; check(t.canMeetWorldCharacter(s, actor), 'local actor not meetable');
    actor.alive = false; check(!t.canMeetWorldCharacter(s, actor), 'dead actor meetable');
    actor.alive = true; actor.health = -1; check(!t.canMeetWorldCharacter(s, actor), 'actor without health meetable'); actor.health = 100;
    actor.alive = true; actor.areaId = 'border_market'; check(!t.canMeetWorldCharacter(s, actor), 'remote actor meetable');
    g.render();
    check(document.querySelector('#world-location-panel').textContent.includes('ศิษย์นอก'), 'sect rank not presented in Thai');
  }), {story: true});

  await test('location: offline progress respects pause and pending events', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 10; t.startTravel(s, 'market');
    s.paused = true; s.lastSavedAt = Date.now() - 11 * 60000; const before = s.month;
    check(g.applyOfflineProgress() === null && s.month === before && s.travel.active.monthsLeft === 2, 'paused offline traveled');
    s.paused = false; s.lastSavedAt = Date.now() - 11 * 60000;
    const summary = g.applyOfflineProgress();
    check(summary && !s.travel.active && s.locationState.currentAreaId === 'border_market', 'offline journey disagrees with live');
    const area = s.locationState.currentAreaId; s.pendingEvent = 'annual-test'; s.lastSavedAt = Date.now() - 11 * 60000;
    check(g.applyOfflineProgress() === null && s.locationState.currentAreaId === area && s.pendingEvent === 'annual-test', 'pending decision lost offline');
  }));

  for (const [route, arrivalChoice] of [['sect', 0], ['mortal-peace', 3], ['nameless-martial', 4], ['new-land', 5], ['underworld', 6]]) {
    await test(`location: complete Lin An route ${route}`, async page => {
      const detail = await page.evaluate(({route, arrivalChoice}) => {
        const g = window.__game__, s = g.getState();
        let choseRoute = false;
        for (let step = 0; step < 2200 && !s.ending && s.month <= 240; step++) {
          if (s.pendingEvent) {
            const buttons = [...document.querySelectorAll('#event-choices button')];
            let choice;
            if (s.pendingEvent === 'arrival') { choice = buttons[arrivalChoice]; choseRoute = true; }
            else choice = buttons.filter(b => !b.disabled).find(b => /พัก|ถอย|หลบ|ไม่เข้าไป|ปฏิเสธ|ปลอดภัย/.test(b.textContent)) || buttons.find(b => !b.disabled);
            check(choice && !choice.disabled, `no valid choice at ${s.pendingEvent}`); choice.click();
          } else { g.setActivity(s, 'rest'); g.processMonth(); }
        }
        check(choseRoute && s.storyRoute.id === route, `wrong route ${s.storyRoute.id}`);
        check(s.ending && s.month >= 216, `route did not finish at ${s.month}`);
        check(s.eventHistory.includes('arrival'), 'arrival scene missing');
        return {route, month: s.month, ending: s.ending.type, area: s.locationState.currentAreaId, scriptedScenes: Object.keys(s.storyLocationContexts || {}).length};
      }, {route, arrivalChoice});
      await page.waitForTimeout(220); return detail;
    }, {story: true});
  }

  for (const profile of ['worker', 'explorer']) {
    await test(`location: free ${profile} starts at birth and cultivates without sect`, page => page.evaluate(profile => {
      const g = window.__game__, t = window.__systemTest, s = g.getState();
      const initialAge = s.hero.ageMonths; let purchased = false, trained = false;
      for (let steps = 0; steps < 2300 && s.hero.ageMonths < 300 && !s.ending && !trained; steps++) {
        if (s.pendingEvent) {
          const choices = [...document.querySelectorAll('#event-choices button:not([disabled])')];
          const choice = choices.find(b => /พัก|ถอย|หลบ|ไม่เข้าไป|ปฏิเสธ|ปลอดภัย/.test(b.textContent)) || choices[0];
          check(choice, 'free event stuck'); choice.click(); continue;
        }
        const age = s.hero.ageMonths;
        if (s.hero.health < s.hero.maxHealth * .65) g.setActivity(s, 'rest');
        else if (s.travel.active) g.setActivity(s, 'travel');
        else if (age < 60) g.setActivity(s, 'rest');
        else if (age < 144) g.setActivity(s, profile === 'explorer' && s.month % 3 === 0 ? 'explore' : 'work');
        else if (s.locationState.currentAreaId !== 'border_market') {
          if (s.hero.money < 60) g.setActivity(s, 'work');
          else if ((s.materials.herb || 0) < 1) g.setActivity(s, 'explore');
          else check(t.startTravel(s, 'market'), 'natural player cannot start market journey');
        } else if (!purchased) { purchased = t.buyShopManual(s, 'border_books', 'book_cloud_origin'); if (!purchased) g.setActivity(s, 'work'); }
        else if (!s.learnedManualTechniques.includes('manual_cloud_origin')) { s.learningState.focus = 'cultivation'; s.learningState.techniqueFocus = 'manual:manual_cloud_origin'; g.setActivity(s, 'study'); }
        else if (!s.hero.cultivationAccess) t.equipTechnique(s, 'manual_cloud_origin');
        else { const before = s.hero.cultivation; g.setActivity(s, 'train'); g.processMonth(); trained = s.hero.cultivation > before || s.hero.stage > 1; continue; }
        g.processMonth();
      }
      check(initialAge === 0 && purchased && trained && !s.flags.metSect, 'free player failed cultivation path');
      return {profile, ageMonths: s.hero.ageMonths, money: s.hero.money, area: s.locationState.currentAreaId, stage: s.hero.stage};
    }, profile));
  }

  await test('location: closing canonical and legacy routes supports return and reopen', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.materials.herb = 10;
    t.startTravel(s, 'market'); t.advanceTravel(s);
    check(t.closeTravelRoute(s, 'village_to_market'), 'canonical route closure failed');
    check(s.travel.active.status === 'stranded' && !t.advanceTravel(s), 'closed trip still progressed');
    check(t.returnFromTravel(s), 'closed road has no retreat'); t.advanceTravel(s);
    check(!s.travel.active && s.locationState.currentAreaId === 'starting_village', 'retreat did not return');
    check(t.openTravelRoute(s, 'roadside-market'), 'legacy route reopen failed');
    check(t.calculateTravel(s, 'market').ok, 'reopened route still blocked');
  }));

  await test('location: travel preview shows denied quote, possessions and exact installments', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 0; s.materials.herb = 0; g.setActivity(s, 'travel'); g.render();
    const text = document.querySelector('#travel-meta').textContent;
    check(text.includes('หมู่บ้านเชิงเขา → เมืองตลาดชายแดน') && text.includes('เงินที่มี 0/4') && text.includes('เดือน 1:') && text.includes('เดือน 2:') && text.includes('ยังออกเดินทางไม่ได้'), 'incomplete denied quote');
    check(document.querySelector('#start-travel-btn').disabled, 'unfunded trip enabled');
    s.hero.money = 100; s.materials.herb = 10; t.relocateToArea(s, 'border_market');
    const quote = t.calculateTravel(s, 'auction'), remaining = {cost: quote.cost, health: quote.health, lifespan: quote.lifespan, resources: {...quote.resources}};
    let total = 0;
    for (let month = quote.months; month > 0; month--) { const next = t.nextTravelInstallment(remaining, month); total += next.cost; remaining.cost -= next.cost; }
    check(total === quote.cost && remaining.cost === 0, 'quote installment sum differs');
  }));

  await test('location: all traded materials and basic manuals have no immediate arbitrage', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 10000; t.relocateToArea(s, 'border_market');
    const start = s.hero.money;
    for (const material of ['herb', 'iron', 'spiritStone', 'beast', 'spiritSpring']) {
      for (let count = 0; count < 3; count++) {
        check(t.buyMaterial(s, material), `cannot buy ${material}`); g.render();
        const before = s.hero.money, label = document.querySelector(`[data-sell-material="${material}"]`).textContent;
        check(t.sellMaterial(s, material), `cannot sell ${material}`);
        check(label.includes(`+${s.hero.money - before} ตำลึง`), `wrong sell label for ${material}`);
        check(t.tradeGradedMaterial(s, material, 'uncommon', true) && t.tradeGradedMaterial(s, material, 'uncommon', false), `graded trade ${material} failed`);
      }
    }
    for (const offer of ['book_cloud_origin', 'book_bamboo_sword']) {
      for (let count = 0; count < 3; count++) {
        const before = s.hero.money, power = s.hero.power;
        check(t.buyShopManual(s, 'border_books', offer), 'manual cannot be repurchased after sale');
        const item = s.treasures.find(item => item.shopOfferId === offer); check(item && !Object.keys(item.bonus || {}).length, 'held manual has combat bonus');
        check(t.sellItem(s, item.inventoryUid), 'manual cannot sell'); check(s.hero.money <= before, 'manual roundtrip created money');
      }
    }
    check(s.hero.money < start, 'trading unexpectedly profitable');
  }));

  await test('location: pending story choice survives reload without duplicate effects', async page => {
    const before = await page.evaluate(() => { const g = window.__game__, s = g.getState(); g.saveGame(); return {event: s.pendingEvent, money: s.hero.money, health: s.hero.health, age: s.hero.ageMonths, area: s.locationState.currentAreaId}; });
    await page.reload();
    return page.evaluate(before => {
      const g = window.__game__; g.continueGame(); const s = g.getState();
      if (s.pendingEvent !== before.event || s.hero.money !== before.money || s.hero.health !== before.health || s.hero.ageMonths !== before.age || s.locationState.currentAreaId !== before.area) throw new Error('pending save lost state');
      if (!document.querySelector('#event-choices button:not([disabled])')) throw new Error('pending choice not restored');
      g.selectChoice(0);
      if (s.eventHistory.filter(id => id === before.event).length !== 1 || s.choiceHistory.filter(choice => choice.id === before.event).length !== 1) throw new Error('choice duplicated');
    }, before);
  }, {story: true});

  await test('location: Auto cannot perform sect work from the market', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.hero.ageMonths = 240; s.hero.money = 100; s.flags.metSect = true; s.officialCareer.affiliation = 'sect';
    t.relocateToArea(s, 'border_market'); s.autoMode = true; s.autoSchedule = Array(12).fill('sect'); s.autoDoctrine = 'survive';
    for (let i = 0; i < 3; i++) { s.pendingEvent = null; g.processMonth(); check(s.locationState.currentAreaId === 'border_market' && s.activity !== 'sect', 'Auto used remote sect'); }
  }));

  await test('location: risky free profile remains a valid life or death outcome', page => page.evaluate(() => {
    const g = window.__game__, s = g.getState();
    for (let step = 0; step < 1800 && !s.ending && s.hero.ageMonths < 240; step++) {
      if (s.pendingEvent) { const choices = [...document.querySelectorAll('#event-choices button:not([disabled])')]; const choice = choices.find(b => /ฝืน|สู้|เข้าไป|เสี่ยง/.test(b.textContent)) || choices[0]; check(choice, 'risky profile event stuck'); choice.click(); }
      else { g.setActivity(s, s.hero.ageMonths < 60 ? 'rest' : s.month % 3 === 0 ? 'explore' : 'train'); g.processMonth(); }
    }
    check(!!s.ending || s.hero.ageMonths >= 240, 'risky life stopped without outcome');
    check(!!s.locationState.currentAreaId, 'risky outcome lost location');
    return {ageMonths: s.hero.ageMonths, ending: s.ending?.type || null, cause: s.ending?.extra?.cause || null};
  }));

  await test('location: in-transit characters cannot intervene as local residents', page => page.evaluate(() => {
    const g = window.__game__, t = window.__systemTest, s = g.getState();
    s.pendingEvent = null; s.hero.ageMonths = 240; s.month = 24; s.hero.money = 100; s.materials.herb = 10;
    check(t.startTravel(s, 'market'), 'test could not start a real journey');
    check(t.worldRegion(s) === 'in-transit', 'journey still counted as origin region');
    check(t.worldEventIntervention(s, {region: 'north-city', intervention: {}}) === null, 'local intervention during journey');
    const actor = t.syncCharacterLocations(s).find(actor => actor.id === 'lin-an');
    check(actor.areaId === null && actor.pointId === null && actor.travel.fromAreaId === 'starting_village', 'player NPC copy still in origin');
    g.render();
  }), {story: true});

  for (const width of [320, 390]) {
    await test(`location: mobile ${width}px location and shops`, async page => {
      await page.setViewportSize({width, height: 740});
      await page.evaluate(() => {
        const g = window.__game__, s = g.getState(); s.hero.ageMonths = 144; s.hero.money = 5;
        window.__systemTest.relocateToArea(s, 'border_market'); g.render();
        document.querySelector('[data-mobile-view="activities"]').click();
      });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#world-location-panel').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      fs.mkdirSync(path.join(root, 'outputs'), {recursive: true});
      await page.screenshot({path: path.join(root, `outputs/location-mobile-${width}-position.png`), animations: 'disabled'});
      await page.locator('#world-services-details > summary').click();
      await page.locator('#world-manual-store').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await page.screenshot({path: path.join(root, `outputs/location-mobile-${width}-shop.png`), animations: 'disabled'});
      return page.evaluate(() => {
        const panel = document.querySelector('#world-location-panel'), shop = document.querySelector('#world-manual-store');
        check(!panel.hidden && panel.getBoundingClientRect().width > 0, 'location hidden');
        check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'horizontal overflow');
        check(shop.textContent.includes('เงินไม่พอ') && shop.querySelector('button:disabled'), 'unaffordable reason missing');
        return {width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth};
      });
    });
  }

  fs.mkdirSync(path.join(root, 'outputs'), {recursive: true});
  fs.writeFileSync(path.join(root, process.argv[2] ? 'outputs/playtest-system-filtered-regressions.json' : 'outputs/playtest-system-regressions.json'), JSON.stringify(results, null, 2));
  const failures = results.filter(test => !test.passed);
  console.log(`${results.length - failures.length}/${results.length} passed`);
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); server.close();
});
