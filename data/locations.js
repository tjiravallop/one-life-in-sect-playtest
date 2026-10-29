(() => {
  'use strict';
  // World definitions are authored here. Player access/ownership belongs to saves.
  window.OneLifeLocationCatalog = ({ hasOfficialRight }) => {
  const LOCATION_DEFS = {
    market: { name: 'เมืองตลาดชายแดน', safety: 75, activities: ['rest', 'work', 'social', 'travel', 'free'], cost: 0, rest: { health: 10, qi: 5, healthMultiplier: 1, qiMultiplier: 1 } },
    auction: { name: 'หอประมูลหินปราณ', safety: 80, activities: ['rest', 'social', 'travel', 'free'], cost: 0, rest: { health: 10, qi: 5, healthMultiplier: 1, qiMultiplier: 1 } },
    warfront: { name: 'แนวหน้าสงครามสำนัก', safety: 30, activities: ['rest', 'work', 'travel', 'free'], cost: 0, rest: { health: 8, qi: 3, healthMultiplier: 1, qiMultiplier: 1 } },
    npc: { name: 'หมู่บ้านของผู้เดินทาง', safety: 70, activities: ['rest', 'work', 'social', 'travel', 'free'], cost: 0, rest: { health: 12, qi: 5, healthMultiplier: 1, qiMultiplier: 1 } },
    roadside: { name: 'ที่พักชั่วคราว', kind: 'temporary', safety: 25, activities: ['rest', 'work', 'free', 'travel'], cost: 0, rest: { health: 10, qi: 8, healthMultiplier: 1, qiMultiplier: 1 } },
    retainer: { name: 'ที่พักของผู้ดูแล', kind: 'personal', safety: 70, activities: ['rest', 'work', 'family', 'social'], cost: 0, rest: { health: 16, qi: 6, healthMultiplier: 1, qiMultiplier: 1 } },
    rented: { name: 'บ้านเช่า', kind: 'housing', safety: 78, activities: ['rest', 'work', 'family', 'craft', 'social'], cost: 3, rest: { health: 13, qi: 5, healthMultiplier: 1, qiMultiplier: 1 } },
    owned: { name: 'บ้านของตนเอง', kind: 'housing', safety: 88, activities: ['rest', 'work', 'family', 'craft', 'study', 'social'], cost: 1, rest: { health: 17, qi: 8, healthMultiplier: 1.05, qiMultiplier: 1.05 } },
    estate: { name: 'เรือนตระกูล', kind: 'family', safety: 94, activities: ['rest', 'work', 'family', 'craft', 'study', 'social', 'sect'], cost: 4, rest: { health: 20, qi: 11, healthMultiplier: 1.1, qiMultiplier: 1.1 }, requires: s => s.family?.buildings?.includes('home_hall') || s.household?.housing === 'estate' },
    sect: { name: 'ค่ายกลพักฟื้นของสำนัก', kind: 'sect', safety: 92, activities: ['rest', 'work', 'train', 'study', 'craft', 'sect'], cost: 0, rest: { health: 18, qi: 12, healthMultiplier: 1.05, qiMultiplier: 1.1, formation: true }, requires: s => s.flags?.metSect && s.month >= 84 },
    sect_archive: { name: 'หอคัมภีร์ชั้นต้น', kind: 'sect', safety: 86, activities: ['study', 'sect'], cost: 0, rest: { health: 8, qi: 8, healthMultiplier: 1, qiMultiplier: 1 }, requires: s => hasOfficialRight(s, 'หอคัมภีร์ชั้นต้น') },
    city_records: { name: 'ที่ทำการทะเบียนคดี', kind: 'official', safety: 72, activities: ['study', 'sect'], cost: 0, rest: { health: 6, qi: 5, healthMultiplier: 1, qiMultiplier: 1 }, requires: s => hasOfficialRight(s, 'ทะเบียนคดีและเขตสอบสวน') },
    inn: { name: 'โรงเตี๊ยมระหว่างทาง', kind: 'temporary', safety: 58, activities: ['rest', 'work', 'social', 'travel', 'free'], cost: 5, rest: { health: 12, qi: 3, healthMultiplier: 1, qiMultiplier: 1 }, requires: s => s.hero?.money >= 5 },
    hidden_cave: { name: 'ถ้ำหลบภัย', kind: 'wilderness', safety: 42, activities: ['rest', 'explore', 'train'], cost: 0, rest: { health: 9, qi: 15, healthMultiplier: .9, qiMultiplier: 1.15 }, requires: s => s.flags?.foundMap || s.flags?.escapePrepared }
  };
  const AREA_DEFS = {
    starting_village: { name: 'หมู่บ้านเชิงเขา', description: 'จุดพักเริ่มต้นและชุมชนที่เกื้อหนุนวัยเยาว์', activities: ['rest', 'work', 'train', 'study', 'explore', 'social', 'family', 'quest', 'craft', 'travel', 'free'], defaultPointId: 'roadside' },
    border_market: { name: 'เมืองตลาดชายแดน', description: 'เมืองการค้า ร้านตำรา และโรงเตี๊ยมของคนเดินทาง', activities: ['rest', 'work', 'train', 'study', 'explore', 'social', 'family', 'quest', 'craft', 'travel', 'free', 'sect'], defaultPointId: 'market' },
    cloud_sect: { name: 'เขตสำนักเมฆาคราม', description: 'เขตสำนักและศูนย์รวมผู้ฝึกตน สิทธิ์ภายในขึ้นกับสถานะศิษย์', activities: ['rest', 'work', 'train', 'study', 'explore', 'social', 'family', 'quest', 'craft', 'sect', 'travel', 'free'], defaultPointId: 'sect_gate' },
    forest_caves: { name: 'เขตป่าและถ้ำ', description: 'พื้นที่ป่า เส้นทางลับ และถ้ำที่ใช้หลบภัย', activities: ['rest', 'train', 'study', 'explore', 'travel', 'free'], defaultPointId: 'forest_camp' },
    jade_auction: { name: 'หอประมูลหินปราณ', description: 'หอประมูลและจุดพักของผู้เดินทาง', activities: ['rest', 'train', 'study', 'social', 'travel', 'free'], defaultPointId: 'auction' },
    sect_warfront: { name: 'แนวหน้าสงครามสำนัก', description: 'เขตสงครามและค่ายพักระหว่างทาง', activities: ['rest', 'work', 'train', 'travel', 'free'], defaultPointId: 'warfront' },
    traveler_village: { name: 'หมู่บ้านของผู้เดินทาง', description: 'หมู่บ้านที่พักของผู้พเนจรและผู้ส่งข่าว', activities: ['rest', 'work', 'train', 'study', 'explore', 'social', 'family', 'quest', 'craft', 'travel', 'free'], defaultPointId: 'npc' },
    distant_land: { name: 'ชุมชนในดินแดนใหม่', description: 'จุดตั้งหลักของผู้จากบ้านและผู้เดินทางข้ามแคว้น', activities: ['rest', 'work', 'train', 'study', 'explore', 'social', 'family', 'quest', 'craft', 'travel', 'free'], defaultPointId: 'distant_land_camp' }
  };
  const LEGACY_LOCATION_MAP = {
    roadside: 'starting_village', retainer: 'starting_village', rented: 'starting_village', owned: 'starting_village', estate: 'starting_village',
    market: 'border_market', inn: 'border_market', city_records: 'border_market', sect: 'cloud_sect', sect_archive: 'cloud_sect', hidden_cave: 'forest_caves',
    auction: 'jade_auction', warfront: 'sect_warfront', npc: 'traveler_village'
  };
  const POINT_DEFS = Object.fromEntries(Object.entries(LOCATION_DEFS).map(([id, def]) => [id, { id, areaId: LEGACY_LOCATION_MAP[id], ...def }]));
  Object.assign(POINT_DEFS, {
    market_materials: { id: 'market_materials', areaId: 'border_market', name: 'ตลาดวัตถุดิบ', services: ['border_materials'], activities: [] },
    market_books: { id: 'market_books', areaId: 'border_market', name: 'ร้านตำราริมทาง', services: ['border_books'], activities: ['study'] },
    market_jobs: { id: 'market_jobs', areaId: 'border_market', name: 'จุดรับงานในเมือง', activities: ['work', 'quest'] },
    village_practice: { id: 'village_practice', areaId: 'starting_village', name: 'ลานฝึกหมู่บ้าน', activities: ['train', 'study'] },
    sect_gate: { id: 'sect_gate', areaId: 'cloud_sect', name: 'ประตูสำนัก', activities: ['rest', 'social', 'quest', 'travel'] },
    sect_courtyard: { id: 'sect_courtyard', areaId: 'cloud_sect', name: 'ลานฝึกสำนัก', activities: ['train'], requires: s => !!s.flags?.metSect },
    forest_camp: { id: 'forest_camp', areaId: 'forest_caves', name: 'ค่ายพักชายป่า', safety: 35, activities: ['rest', 'train', 'explore', 'travel'], rest: { health: 8, qi: 6, healthMultiplier: 1, qiMultiplier: 1 } },
    distant_land_camp: { id: 'distant_land_camp', areaId: 'distant_land', name: 'เรือนพักชุมชนใหม่', safety: 65, activities: ['rest', 'work', 'train', 'study', 'social', 'travel'], rest: { health: 12, qi: 6, healthMultiplier: 1, qiMultiplier: 1 } }
  });
  const JOB_AREA_RULES = {
    farmer: ['starting_village', 'traveler_village', 'distant_land'], hunter: ['starting_village', 'traveler_village', 'forest_caves', 'distant_land'],
    merchant: ['border_market', 'jade_auction', 'traveler_village', 'distant_land'], guard: ['border_market', 'cloud_sect', 'sect_warfront', 'distant_land'],
    sect_clerk: ['cloud_sect'], underworld_runner: ['border_market', 'jade_auction']
  };
  const NPC_REGION_AREA_MAP = { 'north-city': 'starting_village', 'border-town': 'border_market', 'cloud-sect': 'cloud_sect', 'western-border': 'forest_caves', 'new-land': 'distant_land' };
  return { LOCATION_DEFS, AREA_DEFS, POINT_DEFS, LEGACY_LOCATION_MAP, JOB_AREA_RULES, NPC_REGION_AREA_MAP };
  };
})();
