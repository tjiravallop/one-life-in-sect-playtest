const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({window: {}});
for (const file of ['workbook-catalogs', 'items', 'techniques', 'locations', 'travel-routes', 'exploration-areas', 'shops', 'story-events', 'event-pools/travel']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'data', file + '.js'), 'utf8'), context, {filename: file + '.js', timeout: 5000});
}
const w = context.window;
const catalogs = {
  ...w.OneLifeLocationCatalog({hasOfficialRight: () => false}),
  ...w.OneLifeTravelCatalog(), ...w.OneLifeExplorationCatalog(), ...w.OneLifeShopCatalog()
};
const items = w.OneLifeItemCatalog({addTreasure: () => {}});
const techniques = w.OneLifeTechniqueCatalog.createTechniqueData(w.OneLifeTechniqueCatalog.createManualCatalog()).TECHNIQUES;
const stories = w.OneLifeStoryEventCatalog(new Proxy({}, {get: () => () => {}}));
const travelEvents = w.OneLifeEventPoolParts.travel(new Proxy({}, {get: () => () => {}})).TRAVEL_EVENTS;
const errors = [];
const requireRef = (registry, id, source) => { if (!Object.hasOwn(registry, id)) errors.push(`${source}: unknown reference ${id}`); };
const allIds = new Set();
const {AREA_DEFS, POINT_DEFS, LOCATION_DEFS, LEGACY_LOCATION_MAP, DESTINATION_AREA_MAP, TRAVEL_DESTINATIONS, TRAVEL_ROUTES, AREA_ROUTE_DEFS, EXPLORATION_AREA_DEFS, EXPLORATION_AREA_LINKS, SHOP_DEFS} = catalogs;
for (const [name, registry] of Object.entries({AREA_DEFS, POINT_DEFS, SHOP_DEFS, EXPLORATION_AREA_DEFS})) {
  for (const id of Object.keys(registry)) {
    if (allIds.has(id)) errors.push(`${name}: duplicate ID ${id}`);
    allIds.add(id);
  }
}
for (const [id, point] of Object.entries(POINT_DEFS)) {
  requireRef(AREA_DEFS, point.areaId, id);
  for (const shopId of point.services || []) requireRef(SHOP_DEFS, shopId, id);
}
for (const [id, area] of Object.entries(AREA_DEFS)) requireRef(POINT_DEFS, area.defaultPointId, id);
for (const id of Object.keys(LOCATION_DEFS)) requireRef(AREA_DEFS, LEGACY_LOCATION_MAP[id], `legacy location ${id}`);
for (const id of Object.keys(TRAVEL_DESTINATIONS)) requireRef(AREA_DEFS, DESTINATION_AREA_MAP[id], `legacy destination ${id}`);
for (const route of AREA_ROUTE_DEFS) {
  if (allIds.has(route.id)) errors.push(`duplicate route ID ${route.id}`);
  allIds.add(route.id);
  requireRef(AREA_DEFS, route.fromAreaId, route.id); requireRef(AREA_DEFS, route.toAreaId, route.id);
  for (const key of ['months', 'cost', 'danger', 'health', 'lifespan']) if (!Number.isFinite(route[key]) || route[key] < 0 || (key === 'months' && route[key] < 1)) errors.push(`${route.id}: invalid ${key}`);
  for (const [key, amount] of Object.entries(route.resources || {})) {
    requireRef(items.MATERIAL_NAMES, key, route.id);
    if (!Number.isFinite(amount) || amount < 0) errors.push(`${route.id}: invalid resource quantity ${key}`);
  }
  for (const id of route.eventIds || []) if (!travelEvents.some(event => event.id === id)) errors.push(`${route.id}: unknown travel event ${id}`);
}
for (const id of Object.keys(TRAVEL_ROUTES)) if (!AREA_ROUTE_DEFS.some(route => route.legacyRoute === id)) errors.push(`legacy route ${id} lost`);
for (const id of Object.keys(EXPLORATION_AREA_DEFS)) {
  if (!EXPLORATION_AREA_LINKS[id]?.length) errors.push(`exploration ${id} has no area`);
  for (const areaId of EXPLORATION_AREA_LINKS[id] || []) requireRef(AREA_DEFS, areaId, id);
}
for (const [id, shop] of Object.entries(SHOP_DEFS)) {
  requireRef(AREA_DEFS, shop.areaId, id); requireRef(POINT_DEFS, shop.pointId, id);
  if (POINT_DEFS[shop.pointId]?.areaId !== shop.areaId) errors.push(`${id}: wrong point area`);
  for (const material of shop.materials || []) requireRef(items.MATERIAL_NAMES, material, id);
  for (const offer of shop.offers || []) {
    if (!techniques.some(t => t.id === offer.techniqueId)) errors.push(`${id}: unknown technique ${offer.techniqueId}`);
    if (!(offer.price > 0) || !Number.isFinite(offer.price)) errors.push(`${id}: invalid price`);
    if (!['common', 'uncommon'].includes(offer.grade) || offer.manualRealm > 1) errors.push(`${id}: general bookshop contains an advanced manual`);
    if (allIds.has(offer.id)) errors.push(`${id}: duplicate offer ID ${offer.id}`);
    allIds.add(offer.id);
  }
}
for (const [role, person] of Object.entries(stories.STORY_NPC_PLACEMENTS)) {
  requireRef(AREA_DEFS, person.areaId, role); requireRef(POINT_DEFS, person.pointId, role);
  if (POINT_DEFS[person.pointId]?.areaId !== person.areaId) errors.push(`${role}: NPC point mismatch`);
}
for (const [job, areas] of Object.entries(catalogs.JOB_AREA_RULES)) for (const areaId of areas) requireRef(AREA_DEFS, areaId, job);
for (const [region, areaId] of Object.entries(catalogs.NPC_REGION_AREA_MAP)) requireRef(AREA_DEFS, areaId, region);
for (const match of fs.readFileSync(path.join(root, 'data/event-pools/shared.js'), 'utf8').matchAll(/region:\s*'([^']+)'/g)) requireRef(catalogs.NPC_REGION_AREA_MAP, match[1], 'world event region');
for (const key of ['defaultAreaId', 'alternateAreaId']) requireRef(AREA_DEFS, catalogs.REFUGE_TRAVEL_RULE[key], `refuge ${key}`);
if (catalogs.REFUGE_TRAVEL_RULE.months < 1 || allIds.has(catalogs.REFUGE_TRAVEL_RULE.id)) errors.push('invalid refuge route');
const storyAudit = Object.entries({...stories.EVENTS, ...stories.ALTERNATE_ROUTE_EVENTS, ...stories.STORY_CHARACTER_EVENTS}).map(([id, event]) => ({id, title: event.title, month: event.month, locationPolicy: event.locationPolicy}));
for (const event of storyAudit) {
  if (!event.locationPolicy || !['portable', 'local', 'story-move', 'deadline'].includes(event.locationPolicy.kind)) errors.push(`${event.id}: missing story policy`);
  if (event.locationPolicy?.areaId) requireRef(AREA_DEFS, event.locationPolicy.areaId, event.id);
}
fs.mkdirSync(path.join(root, 'outputs'), {recursive: true});
fs.writeFileSync(path.join(root, 'outputs/story-location-audit.json'), JSON.stringify(storyAudit, null, 2));
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS world references: ${Object.keys(AREA_DEFS).length} areas, ${Object.keys(POINT_DEFS).length} points, ${AREA_ROUTE_DEFS.length} routes, ${Object.keys(EXPLORATION_AREA_DEFS).length} exploration areas, ${Object.keys(SHOP_DEFS).length} shops, ${storyAudit.length} story policies; all legacy destinations retained`);
