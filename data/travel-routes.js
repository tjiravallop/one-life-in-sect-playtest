(() => {
  'use strict';
  window.OneLifeTravelCatalog = () => {
  const TRAVEL_DESTINATIONS = {
    new_land: { name: 'ชุมชนในดินแดนใหม่', kind: 'home', minMonth: 0, story: () => true },
    roadside: { name: 'หมู่บ้านเชิงเขา', kind: 'home', minMonth: 0, story: () => true },
    sect: { name: 'เขตสำนักเมฆาคราม', kind: 'sect', minMonth: 0, story: () => true },
    market: { name: 'เมืองตลาดชายแดน', kind: 'trade', minMonth: 0, story: s => s.mode === 'free' || s.month >= 24 },
    auction: { name: 'หอประมูลหินปราณ', kind: 'auction', minMonth: 60, story: s => s.mode === 'free' || (s.month >= 60 && (s.flags.foundMap || s.flags.metSect)) },
    warfront: { name: 'แนวหน้าสงครามสำนัก', kind: 'war', minMonth: 108, story: s => s.mode === 'free' || (s.month >= 108 && s.flags.metSect) },
    npc: { name: 'หมู่บ้านของผู้เดินทาง', kind: 'npc', minMonth: 12, story: s => s.mode === 'free' || (s.month >= 12 && (s.flags.retainerAlive || (s.relations?.companion || 0) >= 3)) },
    hidden_cave: { name: 'ถ้ำลับนอกเส้นทาง', kind: 'secret', minMonth: 24, story: s => s.mode === 'free' || (s.month >= 24 && (s.flags.foundMap || s.flags.escapePrepared)) }
  };
  const TRAVEL_ROUTES = {
    market: { id: 'roadside-market', destination: 'market', months: 2, cost: 4, danger: 18, health: 2, lifespan: 1, resources: { herb: 1 } },
    auction: { id: 'market-auction', destination: 'auction', months: 3, cost: 8, danger: 24, health: 3, lifespan: 1, resources: { herb: 1, spiritStone: 1 } },
    warfront: { id: 'auction-warfront', destination: 'warfront', months: 4, cost: 10, danger: 35, health: 5, lifespan: 2, resources: { herb: 2, iron: 1 } },
    npc: { id: 'roadside-npc', destination: 'npc', months: 1, cost: 2, danger: 12, health: 1, lifespan: 0, resources: { herb: 1 } },
    hidden_cave: { id: 'roadside-hidden-cave', destination: 'hidden_cave', months: 3, cost: 3, danger: 28, health: 4, lifespan: 1, resources: { herb: 2 } }
  };
  const TRAVEL_VEHICLES = {
    foot: { name: 'เดินเท้า', timeMultiplier: 1, costMultiplier: 1, dangerMultiplier: 1, healthMultiplier: 1, requires: () => true },
    caravan: { name: 'คาราวาน', timeMultiplier: .7, costMultiplier: 1.8, dangerMultiplier: .65, healthMultiplier: .65, requires: s => s.hero?.money >= 10 || s.flags?.retainerAlive || s.flags?.merchantContact },
    horse: { name: 'ม้าเร็ว', timeMultiplier: .55, costMultiplier: 2.5, dangerMultiplier: .8, healthMultiplier: .45, requires: s => (s.hero?.attributes?.body || 0) >= 14 || s.flags?.horseOwned },
    cloudstep: { name: 'ย่างก้าวเมฆา', timeMultiplier: .35, costMultiplier: 3, dangerMultiplier: .35, healthMultiplier: .2, requires: s => s.flags?.stepLearned || s.flags?.cloudstepLearned }
  };
  const DESTINATION_AREA_MAP = { market: 'border_market', auction: 'jade_auction', warfront: 'sect_warfront', npc: 'traveler_village', hidden_cave: 'forest_caves', roadside: 'starting_village', sect: 'cloud_sect', new_land: 'distant_land' };
  const AREA_ROUTE_DEFS = [
    { id: 'travelers_to_new_land', fromAreaId: 'traveler_village', toAreaId: 'distant_land', reversible: true, months: 4, cost: 8, danger: 24, health: 4, lifespan: 1, resources: { herb: 2 } },
    { id: 'village_to_market', fromAreaId: 'starting_village', toAreaId: 'border_market', legacyRoute: 'market', reversible: true },
    { id: 'market_to_auction', fromAreaId: 'border_market', toAreaId: 'jade_auction', legacyRoute: 'auction', reversible: true },
    { id: 'auction_to_warfront', fromAreaId: 'jade_auction', toAreaId: 'sect_warfront', legacyRoute: 'warfront', reversible: true },
    { id: 'village_to_travelers', fromAreaId: 'starting_village', toAreaId: 'traveler_village', legacyRoute: 'npc', reversible: true },
    { id: 'village_to_forest', fromAreaId: 'starting_village', toAreaId: 'forest_caves', legacyRoute: 'hidden_cave', reversible: true },
    { id: 'market_to_sect', fromAreaId: 'border_market', toAreaId: 'cloud_sect', reversible: true, months: 2, cost: 4, danger: 18, health: 2, lifespan: 1, resources: { herb: 1 } },
    { id: 'sect_to_forest', fromAreaId: 'cloud_sect', toAreaId: 'forest_caves', reversible: true, months: 2, cost: 3, danger: 24, health: 3, lifespan: 1, resources: { herb: 1 } }
  ].map(route => ({ ...(TRAVEL_ROUTES[route.legacyRoute] || {}), ...route, eventIds: ['travel_bandits', 'travel_storm', 'travel_wayfarer', 'travel_secret'] }));
  const REFUGE_TRAVEL_RULE = { id: 'refuge_convoy', months: 1, cost: 0, health: 1, lifespan: 0, resources: {}, eventIds: [], safety: 88, defaultAreaId: 'starting_village', alternateAreaId: 'border_market' };
  return { TRAVEL_DESTINATIONS, TRAVEL_ROUTES, TRAVEL_VEHICLES, DESTINATION_AREA_MAP, AREA_ROUTE_DEFS, REFUGE_TRAVEL_RULE };
  };
})();
