(() => {
  'use strict';

  const SAVE_KEY_BASE = 'one-life-sect-save-v1';
  const META_KEY_BASE = 'one-life-sect-meta-v1';
  const AUTH_KEY = 'one-life-sect-auth-v1';
  let SAVE_KEY = SAVE_KEY_BASE;
  let CORRUPTED_SAVE_BACKUP_KEY = `${SAVE_KEY}_corrupted_backup`;
  let META_KEY = META_KEY_BASE;
  // data/items.js is loaded before this engine entry.
  const {
    RECIPES, MATERIAL_NAMES, MATERIAL_GRADE_IDS, MATERIAL_SHOP_PRICES,
    ITEM_GRADES, ITEM_CATEGORY_DEFS, WEAPON_TYPE_LABELS, ITEM_SLOT_DEFS,
    ITEM_LIBRARY, ITEM_LIBRARY_BY_ID,
    MATERIAL_LIBRARY, MATERIAL_LIBRARY_BY_ID
  } = window.OneLifeItemCatalog({ addTreasure });
  const { STORY_CHARACTER_EVENTS, EVENTS, ALTERNATE_ROUTE_EVENTS } = window.OneLifeStoryEventCatalog({
    adaptiveDialogue,
    addHerb,
    addLog,
    addMaterial,
    addTreasure,
    endGame,
    ensureCraftingState,
    ensureHousehold,
    ensureInventory,
    ensureLifespanState,
    finishBattle,
    finishEscape,
    resolveAmbush,
    siegeBattleOmen,
    updateFactionReputation
  });
  const VERSION = 10;
  const MAX_MONTHS = 216;
  const $ = (id) => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function getRarityWeight(event, s = {}) {
    const rarity = EVENT_RARITIES[event.rarity === 'rare' ? 'extraordinary' : event.rarity];
    let weight = rarity?.weight || 1;
    if (s.hero?.talent === 'lucky' && event.rarity && event.rarity !== 'normal') weight *= 1.8;
    if ((s.hero?.attributes?.luck || 0) >= 15 && event.rarity && event.rarity !== 'normal') weight *= 1.12;
    if (s.hero?.talent === 'keen' && s.activity === 'explore' && event.rarity && event.rarity !== 'normal') weight *= 1.35;
    if ((s.factions?.jianghu || 0) >= 25 && event.rarity === 'legendary') weight *= 1.5;
    const pressure = s.worldPressure || {};
    if ((pressure.bloodDebt || 0) >= 60 && event.rarity === 'extraordinary') weight *= 1.18;
    if ((pressure.sectWar || 0) >= 60 && event.rarity === 'epic') weight *= 1.22;
    if ((pressure.skyCalamity || 0) >= 60 && event.rarity === 'legendary') weight *= .82;
    if ((s.hero?.health || 0) < (s.hero?.maxHealth || 100) * .35 && event.rarity === 'legendary') weight *= .55;
    if (event.freeLife) {
      const contextWeight = typeof event.freeWeight === 'function' ? event.freeWeight(s) : (event.freeWeight || 1);
      weight *= Math.max(.1, Number(contextWeight) || 1);
    }
    return weight;
  }

  function pickWeighted(events, s = {}) {
    const weighted = events.map(event => ({ event, weight: getRarityWeight(event, s) }));
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of weighted) { roll -= item.weight; if (roll <= 0) return item.event; }
    return weighted[weighted.length - 1]?.event;
  }

  function pickChoiceEvent(events, s) {
    const shares = { uncommon: 60, extraordinary: 27, epic: 10, legendary: 3 };
    const groups = { uncommon: [], extraordinary: [], epic: [], legendary: [] };
    events.forEach(event => {
      const rarity = event.rarity === 'rare' ? 'extraordinary' : event.rarity;
      groups[Object.hasOwn(groups, rarity) ? rarity : 'uncommon'].push(event);
    });
    const available = Object.keys(shares).filter(rarity => groups[rarity].length);
    const weights = available.map(rarity => ({ rarity, weight: shares[rarity] * getRarityWeight({ rarity }, s) / EVENT_RARITIES[rarity].weight }));
    let roll = Math.random() * weights.reduce((sum, item) => sum + item.weight, 0);
    const selected = weights.find(item => { roll -= item.weight; return roll < 0; }) || weights[weights.length - 1];
    return selected ? pickWeighted(groups[selected.rarity], s) : null;
  }

  const TALENTS = {
    jade: { name: 'ชีพจรหยก', desc: 'ฝึกตนเร็วขึ้น 25%', training: 25 },
    keen: { name: 'ดวงตาเฉียบคม', desc: 'สำรวจพบสิ่งลับง่ายขึ้น', agility: 2 },
    steady: { name: 'ใจมั่นคง', desc: 'สุขภาพสูง และพักฟื้นดีขึ้น', body: 3, defense: 2 },
    iron: { name: 'กระดูกเหล็ก', desc: 'ร่างกายและการป้องกันสูง', body: 5, defense: 4 },
    swift: { name: 'ก้าววายุ', desc: 'ว่องไวสูง หนีและสำรวจเก่ง', agility: 6 },
    lucky: { name: 'วาสนาพบพาน', desc: 'พบเหตุการณ์หายากและของวิเศษง่ายขึ้น', attack: 1, agility: 1 }
  };

  const ROOTS = {
    none: { name: 'ไร้ราก', desc: 'ฝึกยากที่สุด แต่บทจบมีเกียรติสูง', training: 62, gradeBonus: 32, rarityMult: 3.6, stats: { attack: 1, defense: 2, body: 3, agility: 2 } },
    human: { name: 'มนุษย์', desc: 'ธรรมดาแต่มั่นคง', training: 100, gradeBonus: 16, rarityMult: 1.35, stats: { attack: 2, defense: 2, body: 2, agility: 2 } },
    earth: { name: 'ปฐพี', desc: 'ฐานร่างแข็งแกร่ง', training: 118, gradeBonus: 8, rarityMult: 1.15, stats: { attack: 3, defense: 4, body: 4, agility: 2 } },
    heaven: { name: 'สวรรค์', desc: 'ปราณไหลเวียนรวดเร็ว', training: 142, gradeBonus: 0, rarityMult: 0.9, stats: { attack: 5, defense: 3, body: 3, agility: 4 } },
    immortal: { name: 'เซียน', desc: 'พรสวรรค์ที่หนึ่งยุคพบหนึ่งคน', training: 172, gradeBonus: -8, rarityMult: 0.72, stats: { attack: 7, defense: 5, body: 5, agility: 6 } },
    legend: { name: 'ตำนาน', desc: 'รากวิญญาณซึ่งอยู่เหนือสามัญ', training: 210, gradeBonus: -18, rarityMult: 0.52, stats: { attack: 10, defense: 8, body: 7, agility: 9 } }
  };

  const REALMS = [
    'หลอมกาย',
    'รวบรวมวิญญาณ',
    'ควบแน่นวิญญาณ',
    'สร้างรากฐาน',
    'ก่อตั้งแก่นทอง',
    'ก่อกำเนิดวิญญาณ',
    'แปรวิญญาณ',
    'หลอมสุญญตา',
    'ผสานเต๋า',
    'ข้ามเคราะห์เซียน'
  ];

  // โบนัสอายุขัยเพิ่มเป็นสองเท่าในแต่ละขั้นใหญ่หลังหลอมกาย
  function majorRealmLifespanBonus(realm) { return 20 * (2 ** (realm - 2)); }
  function randomLifespanYears() { return 70 + Math.floor(Math.random() * 21); }

  const ACTIVITY = {
    train: { name: 'ฝึกตน', location: 'สำนักเมฆาคราม', className: 'training' },
    work: { name: 'ทำงาน', location: 'หมู่บ้านเชิงเขา', className: 'working' },
    explore: { name: 'สำรวจ', location: 'ป่าหลังเขา', className: 'exploring' },
    rest: { name: 'พักฟื้น', location: 'เรือนศิษย์', className: 'resting' },
    study: { name: 'เรียนรู้', location: 'หอคัมภีร์', className: 'studying' },
    social: { name: 'เข้าสังคม', location: 'ตลาดและโรงน้ำชา', className: 'socializing' },
    craft: { name: 'สร้างของ', location: 'โรงช่างเชิงเขา', className: 'crafting' },
    family: { name: 'ดูแลครอบครัว', location: 'เรือนตระกูล', className: 'family' },
    quest: { name: 'รับภารกิจ', location: 'กระดานประกาศ', className: 'questing' },
    sect: { name: 'สำนัก/ราชการ', location: 'ศาลาสำนัก', className: 'official' },
    travel: { name: 'เดินทาง', location: 'เส้นทางระหว่างเมือง', className: 'traveling' },
    free: { name: 'ใช้ชีวิตอิสระ', location: 'โลกกว้าง', className: 'free-living' }
  };

  // การเดินทางใช้ route registry เดียวเป็นแหล่งความจริงของปลายทาง เวลา
  // ค่าใช้จ่าย และความเสี่ยง ไม่สร้างแผนที่หรือกฎเวลาแยกจาก Core System
  const TRAVEL_DESTINATIONS = {
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
  let TRAVEL_EVENTS;
  let TRAINING_EVENTS;
  const LOCATION_DEFS = {
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
  const EXPLORATION_AREA_DEFS = {
    village_trails: { name: 'ทางป่าชายหมู่บ้าน', tier: 'safe', safety: 88, risk: 4, minMonth: 0, requires: () => true, yield: { herb: 2, money: 2 }, log: 'เก็บสมุนไพรตามทางป่าที่ชาวบ้านคุ้นเคยและฟังข่าวจากคนเดินทาง' },
    sect_border: { name: 'ชายแดนสำนักเมฆาคราม', tier: 'safe', safety: 78, risk: 7, minMonth: 24, requires: s => s.flags?.metSect || s.hero?.reputation >= 5, yield: { herb: 2, spiritStone: 1, reputation: 1 }, log: 'สำรวจแนวชายแดนสำนัก แลกข่าวกับผู้คุมทางและจดจำจุดพักปลอดภัย' },
    blackpine: { name: 'ป่าสนดำ', tier: 'danger', safety: 48, risk: 18, minMonth: 24, requires: s => (s.paths?.insight || 0) >= 3 || s.flags?.foundMap || s.hero?.power >= 100, yield: { herb: 3, iron: 1, money: 5 }, log: 'ฝ่าแนวป่าสนดำที่มีสัตว์ร้ายและร่องรอยคนหาย เพื่อค้นหาทรัพยากรที่เมืองไม่มี' },
    ash_canyon: { name: 'หุบเขาเถ้าถ่าน', tier: 'danger', safety: 32, risk: 28, minMonth: 60, requires: s => s.hero?.power >= 220 || s.flags?.spiritWeapon || s.flags?.metSect && s.hero?.reputation >= 8, yield: { iron: 3, spiritStone: 2, money: 8, reputation: 2 }, log: 'สำรวจหุบเขาเถ้าถ่าน เก็บแร่และร่องรอยการเคลื่อนกำลังของศัตรู' },
    moonwell: { name: 'บ่อน้ำจันทร์ซ่อนเร้น', tier: 'secret', safety: 54, risk: 22, minMonth: 36, requires: s => (s.flags?.foundMap && (s.paths?.insight || 0) >= 6) || s.hero?.talent === 'keen' && ((s.hero?.attributes?.luck || 0) >= 15 || (s.hero?.attributes?.intellect || 0) >= 18), yield: { herb: 4, spiritStone: 3, qi: 12, reputation: 3 }, secret: 'moonwell', log: 'ตามแผนที่และความรู้ไปถึงบ่อน้ำจันทร์ที่ไม่ปรากฏในเส้นทางปกติ' },
    serpent_tunnel: { name: 'อุโมงค์งูดำ', tier: 'secret', safety: 24, risk: 36, minMonth: 72, requires: s => (s.flags?.foundMap || s.flags?.escapePrepared) && (s.flags?.knowsTraitor || s.paths?.insight >= 8 || s.hero?.reputation >= 15), yield: { iron: 2, spiritStone: 4, money: 14, reputation: 4 }, secret: 'serpent_tunnel', log: 'เปิดทางลับใต้ภูเขาเพื่อค้นหาหลักฐาน เสบียง และข่าวจากเครือข่ายเงา ระวังพิษเมื่อพบศัตรู'  }
  };

  const QUEST_DEFS = [
    { id: 'survive_the_road', title: 'รอดชีวิตบนเส้นทางเถ้าถ่าน', text: 'รักษาร่องรอยของตระกูลและหาทางยืนให้ได้ก่อนโลกจะลืมชื่อหลิน', startMonth: 12, duration: 60, complete: s => s.flags.retainerAlive || s.flags.loneWanderer, reward: [{ type: 'stat', path: 'hero.money', value: 10 }, { type: 'path', key: 'insight', value: 2 }] },
    { id: 'trace_serpent_shadow', title: 'ตามรอยเงางูดำ', text: 'รวบรวมแผนที่ เบาะแส หรือหลักฐานที่เชื่อมโยงศัตรูของตระกูล', startMonth: 60, duration: 60, complete: s => s.flags.foundMap || s.flags.knowsTraitor || s.flags.houseEnemyKnown, reward: [{ type: 'stat', path: 'hero.powerBonus', value: 40 }, { type: 'stat', path: 'hero.reputation', value: 5 }] },
    { id: 'prepare_cloud_sect', title: 'เตรียมสำนักก่อนหิมะละลาย', text: 'ช่วยสำนักเตรียมรับศึกด้วยพันธมิตร หลักฐาน หรือเส้นทางถอย', startMonth: 84, duration: 60, complete: s => s.flags.alliesRecruited || s.flags.warnedMaster || s.flags.escapePrepared, reward: [{ type: 'stat', path: 'hero.powerBonus', value: 60 }, { type: 'faction', key: 'sect', value: 4 }] },
    { id: 'hunt_spirit_beast', title: 'ล่าของ: เขี้ยวอสูรหมอก', text: 'นำเขี้ยวอสูรกลับมาให้ช่างตีอาวุธ ก่อนร่องรอยจะจางหาย', startMonth: 36, duration: 48, requirements: { all: [{ powerMin: 180 }, { item: { id: 'spiritStone', min: 1 } }, { knowledge: { key: 'foundMap' } }] }, complete: s => s.flags.spiritWeapon || (s.materials?.spiritStone || 0) >= 3, reward: [{ type: 'material', key: 'spiritStone', value: 3 }, { type: 'stat', path: 'hero.powerBonus', value: 35 }] }
  ];
  QUEST_DEFS.push(
    { id: 'herbal_supplier', title: 'ส่งสมุนไพรให้หมอประจำเมือง', minAgeMonths: 144, text: 'ทำงานเป็นชาวนาหรือดูแลสวนสมุนไพรสะสมประสบการณ์ 3 เดือน แล้วรับสมุนไพรชั้นดีและสมุนไพรทั่วไป', startMonth: 24, duration: 72, complete: s => (s.materialLife?.farmMonths || 0) >= 3, reward: [{ type: 'gradedMaterial', key: 'herb', grade: 'uncommon', value: 2 }, { type: 'material', key: 'herb', value: 3 }] },
    { id: 'local_hunter', title: 'ช่วยหาเสบียงให้คนเดินทาง', minAgeMonths: 144, text: 'ทำงานล่าสัตว์ครบ 3 เดือนเพื่อช่วยจัดหาเสบียง', startMonth: 24, duration: 72, complete: s => (s.materialLife?.huntMonths || 0) >= 3, reward: [{ type: 'gradedMaterial', key: 'beast', grade: 'uncommon', value: 1 }, { type: 'material', key: 'beast', value: 2 }] }
  );
  let QUEST_EVENTS;
  QUEST_DEFS.find(def => def.id === 'trace_serpent_shadow').oath = 'uncover_truth';
  QUEST_DEFS.find(def => def.id === 'prepare_cloud_sect').oath = 'uphold_sect';
  const RELATIONSHIP_DEFS = {
    parents: { name: 'ครอบครัวเดิม', category: 'พ่อแม่', trait: 'สายเลือดและความทรงจำ', affinity: 'spirit' },
    siblings: { name: 'พี่น้อง', category: 'พี่น้อง', trait: 'ใกล้ชิดแต่มีบาดแผลร่วมกัน', affinity: 'body' },
    relatives: { name: 'ญาติ', category: 'ญาติ', trait: 'รู้จักกันผ่านชื่อและหน้าที่', affinity: 'charm' },
    friend: { name: 'เฉินหยู', category: 'สหาย', trait: 'อ่อนโยนและเห็นใจคน', affinity: 'charm' },
    companion: { name: 'สหายร่วมทาง', category: 'เพื่อนร่วมทาง', trait: 'พิสูจน์ใจกันระหว่างทาง', affinity: 'freedom' },
    master: { name: 'เหวินจง', category: 'อาจารย์', trait: 'สุขุมและยึดหลัก', affinity: 'spirit' },
    senior: { name: 'เซี่ยหลัน', category: 'ศิษย์พี่', trait: 'ตรงไปตรงมาและทะเยอทะยาน', affinity: 'body' },
    subordinate: { name: 'ผู้ติดตาม', category: 'ลูกน้อง', trait: 'รอคำสั่งและการดูแล', affinity: 'duty' },
    supervisor: { name: 'ผู้บังคับบัญชา', category: 'ผู้บังคับบัญชา', trait: 'วัดใจด้วยผลงานและความซื่อสัตย์', affinity: 'duty' },
    enemy: { name: 'ศัตรู', category: 'ศัตรู', trait: 'จดจำหนี้แค้นไม่ลืม', affinity: 'insight' },
    acquaintance: { name: 'คนรู้จัก', category: 'คนรู้จัก', trait: 'พบกันเป็นครั้งคราว', affinity: 'luck' },
    mysteriousSwordsman: { name: 'ชายแก่ขี่กระบี่ผู้ลึกลับ', category: 'ผู้ชี้ทางลับ', trait: 'หยั่งรู้ยากและไม่ยึดติดกฎเกณฑ์', affinity: 'insight' },
    bellMatron: { name: 'หญิงชราแห่งเรือนระฆัง', category: 'เจ้าของหนี้บุญคุณ', trait: 'เงียบงันและจดจำทุกสิ่ง', affinity: 'luck' }
  };
  const SOCIAL_TARGETS = {
    city: { name: 'เมือง', group: 'คนในเมือง', relation: 'acquaintance', cost: 0, reputation: 1 },
    sect: { name: 'สำนัก', group: 'อาจารย์และศิษย์ร่วมสำนัก', relation: 'senior', cost: 0, reputation: 2 },
    home: { name: 'บ้าน', group: 'พ่อแม่ พี่น้อง และญาติ', relation: 'relatives', cost: 0, reputation: 0 },
    market: { name: 'ตลาด', group: 'พ่อค้าและคนรู้จักใหม่', relation: 'friend', cost: 1, reputation: 2 },
    teahouse: { name: 'โรงน้ำชา', group: 'สหาย ข่าวลือ และพันธมิตร', relation: 'companion', cost: 2, reputation: 3 }
  };
  function ensureSocialState(s) {
    s.socialState = s.socialState || {};
    const state = s.socialState;
    state.newContacts = Number(state.newContacts || 0);
    state.rumors = Number(state.rumors || 0);
    state.conflicts = Number(state.conflicts || 0);
    state.reconciliations = Number(state.reconciliations || 0);
    state.alliances = Number(state.alliances || 0);
    state.lastTarget = state.lastTarget || null;
    state.target = ['auto', ...Object.keys(SOCIAL_TARGETS)].includes(state.target) ? state.target : 'auto';
    return state;
  }
  function ensureAutoSocialRule(s) {
    s.autoSocialRule = s.autoSocialRule || { enabled: true, mode: 'maintain', minMoney: 0, avoidConflict: true };
    s.autoSocialRule.enabled = s.autoSocialRule.enabled !== false;
    s.autoSocialRule.mode = ['maintain', 'avoid_conflict', 'build_alliance'].includes(s.autoSocialRule.mode) ? s.autoSocialRule.mode : (s.autoSocialRule.avoidConflict ? 'avoid_conflict' : 'maintain');
    s.autoSocialRule.minMoney = Math.max(0, Number(s.autoSocialRule.minMoney) || 0);
    s.autoSocialRule.avoidConflict = s.autoSocialRule.avoidConflict !== false;
    return s.autoSocialRule;
  }
  function socialTargetAvailable(s, key) {
    if (key === 'city') return true;
    if (key === 'home') return !!s.family?.spouse || ['retainer', 'rented', 'owned', 'estate'].some(id => s.locations?.owned?.includes(id));
    if (key === 'sect') return !!s.flags?.metSect && !s.locations?.destroyed?.includes('sect');
    if (key === 'market') return (s.hero?.reputation || 0) >= 8;
    if (key === 'teahouse') return (s.hero?.reputation || 0) >= 25;
    return false;
  }
  function setSocialTarget(s, key = 'auto') {
    ensureSocialState(s);
    if (key !== 'auto' && !socialTargetAvailable(s, key)) return false;
    s.socialState.target = key;
    return true;
  }
  function socialRoute(s) {
    const social = ensureSocialState(s);
    const selected = social.target;
    if (selected && selected !== 'auto' && socialTargetAvailable(s, selected)) {
      const logs = { city: 'เดินในเมือง ทำความรู้จักผู้คนและฟังความเป็นไปของชุมชน', sect: 'เข้าสำนัก พบอาจารย์และศิษย์เพื่อแลกเปลี่ยนข่าวสาร', home: 'กลับเรือนเพื่อฟังเรื่องของครอบครัวและญาติ', market: 'เดินตลาด พูดคุยกับพ่อค้าและคนรู้จักใหม่', teahouse: 'นั่งโรงน้ำชา ฟังข่าวลือและพบสหายจากหลายเมือง' };
      return { ...SOCIAL_TARGETS[selected], key: selected, log: logs[selected] };
    }
    const location = s.locations?.current || s.locations?.selected;
    if (location === 'estate' || location === 'owned' || location === 'retainer' || s.family?.spouse) return { ...SOCIAL_TARGETS.home, key: 'home', log: 'กลับเรือนเพื่อฟังเรื่องของครอบครัวและญาติ' };
    if ((s.hero?.reputation || 0) >= 25) return { ...SOCIAL_TARGETS.teahouse, key: 'teahouse', log: 'นั่งโรงน้ำชา ฟังข่าวลือและพบสหายจากหลายเมือง' };
    if (s.flags?.metSect && (s.factions?.sect || 0) >= 0 && (s.hero?.reputation || 0) >= 10) return { ...SOCIAL_TARGETS.sect, key: 'sect', log: 'เข้าสำนัก พบอาจารย์และศิษย์เพื่อแลกเปลี่ยนข่าวสาร' };
    if ((s.hero?.reputation || 0) >= 8) return { ...SOCIAL_TARGETS.market, key: 'market', log: 'เดินตลาด พูดคุยกับพ่อค้าและคนรู้จักใหม่' };
    return { ...SOCIAL_TARGETS.city, key: 'city', log: 'เดินในเมือง ทำความรู้จักผู้คนและฟังความเป็นไปของชุมชน' };
  }
  function ensureGradedMaterials(s) {
    s.gradedMaterials = s.gradedMaterials && typeof s.gradedMaterials === 'object' ? s.gradedMaterials : {};
    for (const key of Object.keys(MATERIAL_NAMES)) {
      if (!Number.isFinite(Number(s.materials[key]))) s.materials[key] = 0;
      s.gradedMaterials[key] = s.gradedMaterials[key] && typeof s.gradedMaterials[key] === 'object' ? s.gradedMaterials[key] : {};
      for (const grade of MATERIAL_GRADE_IDS.slice(1)) s.gradedMaterials[key][grade] = Math.max(0, Math.floor(Number(s.gradedMaterials[key][grade]) || 0));
    }
    return s.gradedMaterials;
  }
  function addGradedMaterial(s, material, grade, amount = 1) {
    ensureInventory(s);
    if (!MATERIAL_NAMES[material] || !MATERIAL_GRADE_IDS.includes(grade)) return false;
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (grade === 'common') s.materials[material] += n;
    else s.gradedMaterials[material][grade] += n;
    return true;
  }
  function grantLifeMaterialMilestone(s, material, months, source) {
    const grade = months % 144 === 0 ? 'legendary' : months % 72 === 0 ? 'epic' : months % 24 === 0 ? 'rare' : null;
    if (grade) { addGradedMaterial(s, material, grade); addLog(`${source}ได้${MATERIAL_NAMES[material]}ระดับ${ITEM_GRADES[grade].name}จากความพยายามต่อเนื่อง`, true); }
  }
  function gatherSpecialMaterials(s, areaId) {
    const tables = {
      village_trails: { chance: .12, material: 'herb', grade: 'uncommon' },
      sect_border: { chance: .30, material: 'herb', grade: 'uncommon' },
      blackpine: { chance: .50, material: 'herb', grade: 'uncommon', beast: .35 },
      ash_canyon: { chance: .30, material: 'herb', grade: 'rare', beast: .30 },
      moonwell: { chance: .50, material: 'herb', grade: 'rare', spring: .65 },
      serpent_tunnel: { chance: .25, material: 'herb', grade: 'rare', beast: .50 }
    };
    const table = tables[areaId]; if (!table) return;
    const found = [];
    if (Math.random() < table.chance) { addGradedMaterial(s, table.material, table.grade); found.push(`${MATERIAL_NAMES[table.material]} ${ITEM_GRADES[table.grade].name}`); }
    if ((areaId === 'blackpine' || areaId === 'ash_canyon' || areaId === 'serpent_tunnel') && Math.random() < .35) { addGradedMaterial(s, 'iron', 'uncommon'); found.push('แร่เหล็ก ชั้นดี'); }
    if (areaId === 'moonwell' || areaId === 'serpent_tunnel') { const roll = Math.random(); const grade = roll < .005 ? 'legendary' : roll < .035 ? 'epic' : null; if (grade) { addGradedMaterial(s, 'herb', grade); found.push(`สมุนไพร ${ITEM_GRADES[grade].name}`); } }
    if (table.beast && Math.random() < table.beast) { addGradedMaterial(s, 'beast', 'common'); found.push('วัตถุดิบสัตว์'); }
    if (table.spring && Math.random() < table.spring) { addGradedMaterial(s, 'spiritSpring', 'common'); found.push('น้ำพุวิญญาณ'); }
    if (areaId === 'moonwell') { s.materialLife = s.materialLife || {}; s.materialLife.springVisits = (s.materialLife.springVisits || 0) + 1; if (s.materialLife.springVisits % 4 === 0) { addGradedMaterial(s, 'spiritSpring', 'uncommon'); found.push('น้ำพุวิญญาณ ชั้นดี'); } }
    if (found.length) addLog(`พบวัตถุดิบเพิ่มเติม: ${found.join(' · ')}`);
  }
  let CRAFT_EVENTS;
  const JOB_DEFS = [
    { id: 'odd_jobs', name: 'แรงงานรับจ้าง', income: 3, requirement: 'เริ่มต้นได้', minMonth: 0, workload: 1 },
    { id: 'farmer', name: 'ชาวนาเชิงเขา', income: 4, requirement: 'พละกำลัง 12', minMonth: 0, workload: 2 },
    { id: 'hunter', name: 'นายพรานท้องถิ่น', income: 5, requirement: 'พละกำลัง 14 หรือว่องไว 14 · เสี่ยงบาดเจ็บจากงาน', minMonth: 0, workload: 2 },
    { id: 'physician', name: 'หมอยาสมุนไพร', income: 8, requirement: 'ปัญญา 14 และความรู้ปรุงยา 1+', minMonth: 0, workload: 1 },
    { id: 'merchant', name: 'เสมียนการค้า', income: 7, requirement: 'ปัญญา 14 · เรื่องราวเปิดทางหลังเดือน 24', minMonth: 24, workload: 1 },
    { id: 'guard', name: 'ผู้คุ้มกันคาราวาน', income: 10, requirement: 'พละกำลัง 16 หรือว่องไว 14 · พลัง 120', minMonth: 36, workload: 3 },
    { id: 'artisan', name: 'ช่างตีเหล็ก', income: 10, requirement: 'พละกำลัง 18 และมีแร่เหล็ก', minMonth: 0, workload: 2 },
    { id: 'sect_clerk', name: 'เสมียนสำนัก', income: 9, requirement: 'เข้าสำนักและปัญญา 16', minMonth: 84, workload: 1, storyOnly: true },
    { id: 'underworld_runner', name: 'คนส่งข่าวใต้ดิน', income: 12, requirement: 'มีสายสัมพันธ์โลกมืดและเสน่ห์ 18', minMonth: 60, workload: 3, illegal: true, freeOnly: false }
  ];
  const HOUSE_TYPES = {
    shelter: { name: 'ชายคาชั่วคราว', cost: 0, upkeep: 0, housing: 'ไม่มีค่าเช่า แต่สุขภาพและชื่อเสียงไม่มั่นคง' },
    rented: { name: 'บ้านเช่า', cost: 6, upkeep: 2, housing: 'มีที่อยู่ถาวร ต้องจ่ายค่าเช่ารายเดือน' },
    owned: { name: 'บ้านของตนเอง', cost: 45, upkeep: 1, housing: 'ซื้อขาด มีค่าซ่อมบำรุงเล็กน้อย' },
    estate: { name: 'เรือนตระกูล', cost: 120, upkeep: 4, housing: 'เหมาะกับตระกูลและทายาท' }
  };
  const SECT_RANKS = [
    { id: 'outer', name: 'ศิษย์นอก', merit: 0, realm: 1, stage: 1 },
    { id: 'inner', name: 'ศิษย์ใน', merit: 30, realm: 2, stage: 1 },
    { id: 'core', name: 'ศิษย์เอก', merit: 70, realm: 2, stage: 6 },
    { id: 'heir', name: 'ศิษย์สืบทอด', merit: 100, realm: 3, stage: 1 },
    { id: 'elder', name: 'อาจารย์ / ผู้อาวุโส', merit: 120, realm: 3, stage: 6 }
  ];
  const OFFICIAL_ASSIGNMENTS = {
    normal: { name: 'งานปกติ', affiliation: 'any', merit: 3, money: 2, reputation: 1, risk: 0, rights: ['เข้าพื้นที่ทำงาน'] },
    secret: { name: 'งานลับ', affiliation: 'sect', merit: 6, reputation: 2, power: 10, risk: 1, rights: ['หอเอกสารลับ'], requires: s => s.flags?.metSect && hasOfficialRight(s, 'หอเอกสารลับ') && ((s.relations?.master || 0) >= 5 || (s.relations?.senior || 0) >= 5 || (s.paths?.insight || 0) >= 4) },
    city_defense: { name: 'ป้องกันเมือง', affiliation: 'city', merit: 5, money: 3, reputation: 3, power: 8, risk: 1, rights: ['ประตูเมืองและคลังเสบียง'] },
    investigation: { name: 'งานสอบสวน', affiliation: 'any', merit: 4, reputation: 4, risk: 1, rights: ['ทะเบียนคดีและเขตสอบสวน'], requires: s => hasOfficialRight(s, 'ทะเบียนคดีและเขตสอบสวน') || (s.hero?.attributes?.intellect || 0) >= 14 || (s.hero?.reputation || 0) >= 5 },
    risky: { name: 'งานเสี่ยง', affiliation: 'any', merit: 9, reputation: -2, power: 20, risk: 3, rights: ['เขตอันตราย'], requires: s => (s.hero?.power || 0) >= 150 || (s.hero?.powerBonus || 0) >= 40 }
  };
  const OFFICIAL_RANKS = [
    { id: 'civilian', name: 'ผู้ช่วยเมือง', merit: 0, rights: ['กระดานงานเมือง'] },
    { id: 'clerk', name: 'เสมียนเมือง', merit: 20, rights: ['ทะเบียนเมือง'] },
    { id: 'inspector', name: 'ผู้ตรวจการ', merit: 55, rights: ['เขตสอบสวน', 'สิทธิ์เบิกเสบียง'] },
    { id: 'magistrate', name: 'ผู้คุมกฎเมือง', merit: 100, rights: ['ศาลาเมือง', 'สิทธิ์คุ้มกันผู้คน'] }
  ];
  const OFFICIAL_EXAM_OPTIONS = {
    power: { name: 'สอบพลัง', desc: 'ใช้พลังรวมและขั้นบำเพ็ญพิสูจน์ความสามารถ' },
    case: { name: 'สอบคดี', desc: 'ใช้ปัญญา ชื่อเสียง และหยั่งรู้คลี่คลายคดี' },
    loyalty: { name: 'สอบความภักดี', desc: 'ใช้ความสัมพันธ์ หน้าที่ และกรรมยืนยันความไว้วางใจ' }
  };
  const FAMILY_BUILDINGS = [
    { id: 'home_hall', name: 'เรือนใหญ่', cost: 35, effect: 'ความมั่นคงของครอบครัว +5' },
    { id: 'training_yard', name: 'ลานฝึกตระกูล', cost: 45, effect: 'ลูกหลานฝึกกายได้ดีขึ้น' },
    { id: 'library', name: 'หอคัมภีร์', cost: 55, effect: 'ปัญญาและวิชาที่สืบทอด +5' },
    { id: 'herb_garden', name: 'สวนสมุนไพร', cost: 40, effect: 'สมุนไพร +1 ทุกเดือน และคัดสมุนไพรชั้นดี' },
    { id: 'workshop', name: 'โรงช่างตระกูล', cost: 42, effect: 'แร่เหล็ก +1 ทุกเดือน และคัดแร่เหล็กชั้นดี' },
    { id: 'apothecary_room', name: 'ห้องปรุงยาตระกูล', cost: 42, effect: 'ฟื้นฟูสุขภาพคนในเรือน และคัดสมุนไพรชั้นดี' },
    { id: 'ancestral_shrine', name: 'ศาลบรรพชน', cost: 70, effect: 'ชื่อเสียงตระกูลและกรรมดี +1' }
  ];
  const CHILD_PATHS = {
    study: { name: 'เรียนหนังสือ', stat: 'intellect' },
    train: { name: 'ฝึกกายและวิชา', stat: 'body' },
    social: { name: 'เข้าสังคมและการค้า', stat: 'charm' },
    wander: { name: 'ออกเดินทางเรียนรู้โลก', stat: 'luck' }
  };
  const FAMILY_ROLES = {
    spouse: { name: 'คู่ครอง', baseCost: 2, bond: 2 },
    child: { name: 'ลูก', baseCost: 3, bond: 1 },
    parent: { name: 'พ่อแม่', baseCost: 2, bond: 1 },
    relative: { name: 'ญาติ', baseCost: 1, bond: 1 }
  };
  // ระบบเฉพาะของเกมเรา: ชีวิตหนึ่งไม่ได้จบลงพร้อมตัวละคร แต่ทิ้งแรงสะเทือน
  // ไว้ให้โลกและชีวิตถัดไป ไม่ใช่การยกโครง life-sim อื่นมาใช้ตรง ๆ
  const OATH_DEFS = {
    protect_weak: { name: 'ไม่ทอดทิ้งผู้ไร้ทางสู้', desc: 'เมื่อมีคนอ่อนแอกว่าขอความช่วยเหลือ จะต้องยื่นมือ แม้เสียโอกาสของตน', pressure: 'bloodDebt' },
    uncover_truth: { name: 'ตามหาความจริง', desc: 'จะไม่ขายหรือฝังหลักฐานที่เกี่ยวกับคืนบ้านแตก', pressure: 'bloodDebt' },
    preserve_freedom: { name: 'ไม่ยอมเป็นเครื่องมือ', desc: 'จะไม่ยอมให้สำนักหรือพรรคใดกำหนดชะตาทั้งหมดแทนตน', pressure: 'sectWar' },
    uphold_sect: { name: 'คุ้มครองผู้มีพระคุณ', desc: 'เมื่อสำนักเมฆาครามถูกคุกคาม จะไม่หนีโดยไม่เตือนผู้คน', pressure: 'sectWar' }
  };
  const PRESSURE_DEFS = {
    bloodDebt: { name: 'หนี้เลือด', max: 100, hint: 'ศัตรูและความจริงที่ยังไม่ได้สะสาง' },
    sectWar: { name: 'ไฟสงครามสำนัก', max: 100, hint: 'ความขัดแย้งระหว่างผู้มีอำนาจ' },
    clanDecay: { name: 'รอยร้าวตระกูล', max: 100, hint: 'มรดกที่ไม่มีใครสืบต่อ' },
    skyCalamity: { name: 'เคราะห์ฟ้า', max: 100, hint: 'แรงต้านจากการฝืนชะตา' }
  };
  const DEATH_SIGNATURES = {
    sacrifice: 'ผู้สละตน', oath_break: 'ผู้ผิดคำสัตย์', revenge: 'ผู้ตายพร้อมหนี้แค้น',
    truth: 'ผู้ตายพร้อมความจริง', clan_legacy: 'ผู้ฝากรากฐาน', forgotten: 'ผู้ถูกลืม', ordinary: 'ผู้ดับสูญกลางทาง'
  };
  function ensureOathState(s) {
    s.oaths = s.oaths || { active: [], broken: [], kept: [], scars: [] };
    for (const key of ['active', 'broken', 'kept', 'scars']) s.oaths[key] = Array.isArray(s.oaths[key]) ? s.oaths[key] : [];
    s.oaths.active = s.oaths.active.filter(id => OATH_DEFS[id]);
    return s.oaths;
  }
  function ensureWorldPressure(s) {
    s.worldPressure = s.worldPressure || {};
    Object.keys(PRESSURE_DEFS).forEach(key => { s.worldPressure[key] = clamp(Number(s.worldPressure[key]) || 0, 0, 100); });
    s.pressureMilestones = s.pressureMilestones || {};
    s.worldScars = Array.isArray(s.worldScars) ? s.worldScars : [];
    return s.worldPressure;
  }
  function chooseOath(s, id) {
    const oaths = ensureOathState(s);
    if (!OATH_DEFS[id] || oaths.active.includes(id) || oaths.active.length >= 3 || oaths.broken.includes(id)) return false;
    oaths.active.push(id); s.hero.karma = (s.hero.karma || 0) + 1; addLog(`ให้คำสัตย์: ${OATH_DEFS[id].name}`, true); return true;
  }
  function breakOath(s, id, reason = 'การตัดสินใจของเจ้า') {
    const oaths = ensureOathState(s), index = oaths.active.indexOf(id);
    if (index < 0) return false;
    oaths.active.splice(index, 1); if (!oaths.broken.includes(id)) oaths.broken.push(id); if (!oaths.scars.includes(id)) oaths.scars.push(id);
    s.hero.karma = (s.hero.karma || 0) - 3; ensureWorldPressure(s); const pressure = OATH_DEFS[id].pressure; s.worldPressure[pressure] = clamp(s.worldPressure[pressure] + 8, 0, 100);
    addLog(`คำสัตย์ “${OATH_DEFS[id].name}” แตกสลาย: ${reason}`, true); return true;
  }
  function addWorldScar(s, id, text, effects = {}) {
    ensureWorldPressure(s); if (s.worldScars.some(scar => scar.id === id)) return false;
    s.worldScars.push({ id, text, month: s.month, lifeIndex: s.lifeIndex || 0 });
    Object.entries(effects).forEach(([key, value]) => { if (key in s.worldPressure) s.worldPressure[key] = clamp(s.worldPressure[key] + value, 0, 100); else if (key.startsWith('flag.')) s.flags[key.slice(5)] = value; });
    addLog(`โลกจดจำรอยแผล: ${text}`, true); return true;
  }
  function updateWorldPressure(s) {
    ensureWorldPressure(s); ensureOathState(s); ensureWorldState(s); ensureStoryRoute(s);
    const p = s.worldPressure;
    if (s.flags.houseEnemyKnown && !s.flags.traitorExposed) p.bloodDebt += 1;
    if (s.flags.betrayedSect || s.flags.traitorExposed) p.sectWar += 1;
    if (s.ruleSet === 'dynasty' && !s.family?.buildings?.length) p.clanDecay += 1;
    if ((s.hero.karma || 0) < -5 || s.hero.realm >= 5) p.skyCalamity += 1;
    Object.keys(PRESSURE_DEFS).forEach(key => {
      p[key] = clamp(p[key], 0, 100);
      [30, 60, 90].forEach(level => {
        const mark = `${key}-${level}`;
        if (p[key] >= level && !s.pressureMilestones[mark]) { s.pressureMilestones[mark] = true; addWorldScar(s, mark, `${PRESSURE_DEFS[key].name}แตะระดับ ${level}`, { [key]: 0 }); }
      });
    });
  }
  function calculateDeathSignature(s, type, extra = {}) {
    ensureOathState(s); ensureWorldPressure(s);
    if (extra.sacrificed || s.flags.civiliansSaved && (type === 'guardian' || type === 'guardian_pyrrhic')) return 'sacrifice';
    if (s.oaths.broken.length && (s.hero.karma || 0) < 0) return 'oath_break';
    if (s.flags.traitorExposed && (s.paths.insight || 0) >= 5) return 'truth';
    if ((s.paths.freedom || 0) >= 6 && (s.factions?.serpent || 0) < -3) return 'revenge';
    if ((s.lineageState?.stage || 0) >= 2 || s.family?.buildings?.length) return 'clan_legacy';
    if (!(s.choices && Object.keys(s.choices).length) && s.month < 24) return 'forgotten';
    return 'ordinary';
  }
  function applyLegacyEcho(s, summary) {
    ensureWorldPressure(s); ensureOathState(s); ensureWorldState(s); ensureStoryRoute(s); ensureOpportunityCost(s);
    s.characterMonth = Number.isFinite(s.characterMonth) ? s.characterMonth : (Number.isFinite(s.month) ? s.month : 0);
    s.worldMonth = s.world.worldMonth;
    s.legacyEchoes = Array.isArray(s.legacyEchoes) ? s.legacyEchoes : [];
    if (summary?.deathSignature) s.legacyEchoes.push({ signature: summary.deathSignature, sourceLife: summary.month, text: DEATH_SIGNATURES[summary.deathSignature] || summary.deathSignature });
    s.legacyEchoes = s.legacyEchoes.slice(-8);
    (summary?.worldScars || []).forEach(scar => { if (!s.worldScars.some(item => item.id === scar.id)) s.worldScars.push({ ...scar, inherited: true }); });
    Object.keys(PRESSURE_DEFS).forEach(key => { s.worldPressure[key] = Math.max(s.worldPressure[key] || 0, summary?.worldPressure?.[key] || 0); });
  }
  function ensureFamilyState(s) {
    s.family = s.family || { spouse: null, children: [], parents: [], relatives: [], buildings: [], construction: null, lastChildMonth: -99 };
    s.family.children = Array.isArray(s.family.children) ? s.family.children : [];
    s.family.parents = Array.isArray(s.family.parents) ? s.family.parents : [];
    s.family.relatives = Array.isArray(s.family.relatives) ? s.family.relatives : [];
    s.family.buildings = Array.isArray(s.family.buildings) ? s.family.buildings : [];
    s.family.lastChildMonth = Number.isFinite(s.family.lastChildMonth) ? s.family.lastChildMonth : -99;
    s.family.treasury = Number.isFinite(s.family.treasury) ? s.family.treasury : 0;
    s.family.bond = Number.isFinite(s.family.bond) ? s.family.bond : 0;
    s.family.health = Number.isFinite(s.family.health) ? s.family.health : 100;
    s.family.debt = Number.isFinite(s.family.debt) ? s.family.debt : 0;
    s.family.conflict = Number.isFinite(s.family.conflict) ? s.family.conflict : 0;
    s.family.losses = Array.isArray(s.family.losses) ? s.family.losses : [];
    s.family.chronicle = Array.isArray(s.family.chronicle) ? s.family.chronicle : [];
    s.family.legacyScore = Number.isFinite(s.family.legacyScore) ? s.family.legacyScore : 0;
    s.family.heirId = s.family.heirId || null;
    s.family.autoRule = AUTO_FAMILY_RULES[s.family.autoRule] ? s.family.autoRule : (AUTO_FAMILY_RULES[s.autoFamilyRule] ? s.autoFamilyRule : 'save');
    s.autoFamilyRule = s.family.autoRule;
    if (s.family.spouse) { s.family.spouse.goal ||= 'สร้างบ้านที่ปลอดภัยให้ครอบครัว'; s.family.spouse.status ||= 'ประคองชีวิตคู่'; s.family.spouse.memories = Array.isArray(s.family.spouse.memories) ? s.family.spouse.memories : []; }
    s.family.children.forEach(child => {
      child.stats = child.stats || { body: 10, intellect: 10, charm: 10, luck: 10 };
      child.milestones = Array.isArray(child.milestones) ? child.milestones : [];
      child.health = Number.isFinite(child.health) ? child.health : 100;
      child.education = Number.isFinite(child.education) ? child.education : 0;
      child.bond = Number.isFinite(child.bond) ? child.bond : 50;
      child.goal = child.goal || (child.path ? `เติบโตในสาย${CHILD_PATHS[child.path]?.name || child.path}` : 'ค้นหาความถนัดของตนเอง');
      child.status = child.status || 'กำลังเติบโต';
      child.memories = Array.isArray(child.memories) ? child.memories : [];
      child.alive = child.alive !== false;
    });
    if (s.mode === 'free' && (!s.family.parents || s.family.parents.length === 0)) {
      s.family.parents = [
        { id: 'parent-father', name: 'บิดา', role: 'parent', health: 100, bond: 75, alive: true },
        { id: 'parent-mother', name: 'มารดา', role: 'parent', health: 100, bond: 85, alive: true }
      ];
      s.family.bond = Math.max(s.family.bond || 0, 60);
    }
    return s.family;
  }

  function familyAllowed(s) { return s?.mode === 'free' || s?.ruleSet === LIFE_RULES.dynasty.id; }
  function familyMemberCount(family) { return (family.spouse ? 1 : 0) + family.children.filter(child => child.alive !== false).length + family.parents.filter(p => p.alive !== false).length + family.relatives.filter(r => r.alive !== false).length; }
  function addFamilyMember(s, role, member = {}) {
    const family = ensureFamilyState(s);
    if (!familyAllowed(s) || !['parent', 'relative'].includes(role) || !FAMILY_ROLES[role]) return false;
    const list = role === 'parent' ? family.parents : family.relatives;
    const entry = { id: member.id || `family-${role}-${s.month}-${list.length + 1}`, name: member.name || FAMILY_ROLES[role].name, health: clamp(Number(member.health ?? 100), 0, 100), bond: clamp(Number(member.bond ?? 50), 0, 100), alive: member.alive !== false };
    list.push(entry); family.bond = clamp(family.bond + FAMILY_ROLES[role].bond, 0, 100); addFamilyChronicle(s, `รับ${entry.name}เข้ามาเป็น${FAMILY_ROLES[role].name}ในความดูแล`, 1); return true;
  }
  function addFamilyChronicle(s, text, impact = 0) {
    const family = ensureFamilyState(s);
    family.chronicle.unshift({ month: s.month, text });
    family.chronicle = family.chronicle.slice(0, 40);
    family.legacyScore = Math.max(0, family.legacyScore + impact);
  }
  function marry(s, spouse = { name: 'คู่ครองจากทางเดินชีวิต', affection: 50, trait: 'มั่นคง' }) {
    const family = ensureFamilyState(s);
    if (!familyAllowed(s) || family.spouse || s.hero.ageMonths < 15 * 12) return false;
    family.spouse = { ...spouse, affection: Number(spouse.affection || 50), marriedMonth: s.month, goal: spouse.goal || 'สร้างบ้านที่ปลอดภัยให้ครอบครัว', status: 'เริ่มต้นชีวิตคู่', memories: [] };
    family.bond = clamp(family.bond + 12, 0, 100); addFamilyChronicle(s, `เริ่มต้นชีวิตคู่กับ${family.spouse.name}`, 3);
    s.hero.reputation += 2; addLog(`แต่งงานกับ${family.spouse.name} ความสัมพันธ์กลายเป็นครอบครัว`, true); return true;
  }
  function haveChild(s, name = `บุตรคนที่ ${(ensureFamilyState(s).children.length || 0) + 1}`) {
    const family = ensureFamilyState(s);
    if (!familyAllowed(s) || !family.spouse || s.hero.ageMonths < 15 * 12 || s.month - family.lastChildMonth < 24) return false;
    family.children.push({ id: `child-${s.month}-${family.children.length + 1}`, name, ageMonths: 0, path: null, goal: 'ค้นหาความถนัดของตนเอง', status: 'ทารก', stats: { body: 10, intellect: 10, charm: 10, luck: 10 }, milestones: [], memories: [], health: 100, education: 0, bond: 50, alive: true });
    family.lastChildMonth = s.month; family.bond = clamp(family.bond + 8, 0, 100); addFamilyChronicle(s, `${name} ลืมตาดูโลก`, 5); addLog(`${name} ลืมตาดูโลก ครอบครัวมีสมาชิกใหม่`, true); return true;
  }
  function chooseChildPath(s, childId, path) {
    const family = ensureFamilyState(s), child = family.children.find(item => item.id === childId);
    if (!familyAllowed(s) || !child || child.alive === false || !CHILD_PATHS[path] || child.ageMonths < 6 * 12 || child.ageMonths >= 18 * 12) return false;
    child.path = path; child.education = Math.max(child.education, 10); family.bond = clamp(family.bond + 4, 0, 100); addFamilyChronicle(s, `กำหนดเส้นทางการศึกษาของ${child.name}: ${CHILD_PATHS[path].name}`, 2); addLog(`กำหนดเส้นทางของ${child.name}: ${CHILD_PATHS[path].name}`); return true;
  }
  function startFamilyBuilding(s, buildingId) {
    const family = ensureFamilyState(s), building = FAMILY_BUILDINGS.find(item => item.id === buildingId);
    if (!familyAllowed(s) || !building || family.buildings.includes(buildingId) || family.construction || s.hero.money < building.cost) return false;
    s.hero.money -= building.cost; family.construction = { id: buildingId, monthsLeft: 6 }; addLog(`เริ่มก่อสร้าง${building.name} ใช้เวลา 6 เดือน`, true); return true;
  }
  function advanceFamily(s) {
    const family = ensureFamilyState(s);
    if (!familyAllowed(s)) return;
    const isChild = (s.hero?.ageMonths || 0) < 15 * 12;
    if (isChild) {
      const livingCaregivers = (family.parents.filter(p => p.alive !== false).length) + (family.relatives.filter(r => r.alive !== false).length);
      if (livingCaregivers > 0) {
        if (s.hero.health < s.hero.maxHealth) {
          s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 1);
        }
        family.bond = clamp(family.bond + 0.1, 0, 100);
      } else {
        if (family.health < 40 && s.hero.health > 20) {
          s.hero.health = Math.max(15, s.hero.health - 1);
        }
      }
      [...family.parents, ...family.relatives].forEach(member => {
        if (member.alive !== false) {
          if (family.health < 30) member.health = Math.max(0, member.health - 1);
          if (s.month > 0 && s.month % 12 === 0 && Math.random() < 0.08) {
            member.health = Math.max(0, member.health - 2);
          }
          if (member.health <= 0) {
            member.alive = false;
            family.losses.push({ id: member.id, month: s.month, cause: 'ชราภาพหรืออาการป่วยเรื้อรัง' });
            addFamilyChronicle(s, `${member.name} จากไปด้วยความชราหรือโรคภัย`, -2);
            addLog(`${member.name} จากไปอย่างสงบ ทิ้งคำสอนไว้ให้คนข้างหลัง`, true);
            s.relations.parents = Math.max(0, (s.relations.parents || 18) - 8);
          }
        }
      });
      family.children.forEach(child => {
        child.ageMonths++;
        if (child.ageMonths < 6 * 12) child.status = 'วัยเยาว์';
        else if (child.ageMonths < 12 * 12) child.status = child.path ? `ฝึกพื้นฐานสาย${CHILD_PATHS[child.path]?.name || child.path}` : 'กำลังค้นหาความถนัด';
        else if (child.ageMonths < 18 * 12) child.status = child.path ? `เตรียมตัวเป็น${CHILD_PATHS[child.path]?.name || child.path}` : 'เริ่มเลือกเส้นทาง';
        else child.status = 'พร้อมสืบทอดหรือออกเดินทาง';
      });
      if (family.construction) {
        family.construction.monthsLeft--;
        if (family.construction.monthsLeft <= 0) {
          family.buildings.push(family.construction.id);
          addLog(`การก่อสร้าง${FAMILY_BUILDINGS.find(item => item.id === family.construction.id)?.name || 'อาคาร'}ของตระกูลเสร็จสมบูรณ์`, true);
          family.construction = null;
        }
      }
      if (family.buildings.includes('herb_garden')) {
        ensureInventory(s).herb++;
        if (s.month % 6 === 0) { addGradedMaterial(s, 'herb', 'uncommon'); }
      }
      if (family.buildings.includes('workshop')) {
        ensureInventory(s).iron++;
        if (s.month % 6 === 0) { addGradedMaterial(s, 'iron', 'uncommon'); }
      }
      if (family.buildings.includes('apothecary_room')) {
        family.health = clamp(family.health + 1, 0, 100);
        if (s.hero.health < s.hero.maxHealth && Math.random() < 0.5) s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 3);
        if (s.month % 6 === 0) { addGradedMaterial(s, 'herb', 'uncommon'); }
      }
      if (family.buildings.includes('ancestral_shrine')) s.hero.karma += 1;
      return;
    }
    const members = familyMemberCount(family);
    const careCost = members ? 1 + Math.max(0, Math.ceil((members - 1) / 2)) : 0;
    const household = ensureHousehold(s);
    if (careCost > 0) {
      if (s.hero.money >= careCost) {
        s.hero.money -= careCost;
        family.treasury += careCost;
      } else {
        const deficit = careCost - Math.max(0, s.hero.money);
        s.hero.money = 0;
        household.debt += deficit;
        household.debtReasons = household.debtReasons || {};
        household.debtReasons.family = (household.debtReasons.family || 0) + deficit;
        family.debt = household.debt;
        family.conflict = clamp(family.conflict + 2, 0, 100);
        family.health = clamp(family.health - 1, 0, 100);
        addLog(`เงินไม่พอจ่ายค่าอาหารและดูแลคนในเรือน ขาด ${deficit} ตำลึง หนี้ครัวเรือนเพิ่มขึ้น`, true);
      }
    }
    if (s.activity === 'family') {
      const rule = ensureAutoFamilyRule(s);
      if (rule === 'save' && s.hero.money > 0) { s.hero.money -= 1; family.treasury += 1; }
      if (rule === 'health') {
        if (s.hero.money >= 2) { s.hero.money -= 2; family.health = clamp(family.health + 8, 0, 100); }
        else {
          household.debt += 2;
          household.debtReasons = household.debtReasons || {};
          household.debtReasons.family = (household.debtReasons.family || 0) + 2;
          family.debt = household.debt;
          family.health = clamp(family.health - 1, 0, 100);
        }
      }
      if (rule === 'education') {
        const student = family.children.find(child => child.alive !== false && child.ageMonths >= 6 * 12 && child.ageMonths < 18 * 12);
        if (student) {
          if (s.hero.money >= 3) {
            s.hero.money -= 3;
          } else {
            household.debt += 3;
            household.debtReasons = household.debtReasons || {};
            household.debtReasons.family = (household.debtReasons.family || 0) + 3;
            family.debt = household.debt;
          }
          student.path = student.path || 'study'; student.education = Math.min(100, student.education + 8); family.legacyScore += 1;
        }
      }
      if (rule === 'pay_debt' && household.debt > 0) {
        const payment = Math.min(household.debt, Math.max(0, s.hero.money), 5);
        household.debt -= payment;
        family.debt = household.debt;
        s.hero.money -= payment;
        family.treasury += payment;
      }
    }
    if (family.spouse) { family.spouse.affection = clamp(Number(family.spouse.affection || 0) + (s.activity === 'family' ? 3 : -1), 0, 100); family.spouse.status = family.spouse.affection >= 70 ? 'เป็นหลักของเรือน' : family.spouse.affection >= 35 ? 'ประคองชีวิตคู่' : 'เริ่มห่างเหิน'; if (s.activity === 'family') family.spouse.memories = [...(family.spouse.memories || []), `เดือน-${s.month}`].slice(-8); }
    family.children.forEach(child => {
      child.ageMonths++;
      if (child.ageMonths < 6 * 12) child.status = 'วัยเยาว์'; else if (child.ageMonths < 12 * 12) child.status = child.path ? `ฝึกพื้นฐานสาย${CHILD_PATHS[child.path]?.name || child.path}` : 'กำลังค้นหาความถนัด'; else if (child.ageMonths < 18 * 12) child.status = child.path ? `เตรียมตัวเป็น${CHILD_PATHS[child.path]?.name || child.path}` : 'เริ่มเลือกเส้นทาง'; else child.status = 'พร้อมสืบทอดหรือออกเดินทาง';
      if (child.alive !== false && child.path && child.ageMonths % 12 === 0) { child.stats[CHILD_PATHS[child.path].stat] = Math.min(126, child.stats[CHILD_PATHS[child.path].stat] + 1); child.education = Math.min(100, child.education + 5); }
      if (child.alive !== false && family.health < 25 && child.ageMonths % 12 === 0) child.health = Math.max(0, child.health - 2);
      if (child.health <= 0 && child.alive !== false) { child.alive = false; family.losses.push({ id: child.id, month: s.month, cause: 'การดูแลไม่เพียงพอ' }); addFamilyChronicle(s, `${child.name} จากไปก่อนวัย`, -3); }
      [6, 12, 18].forEach(age => {
        if (child.ageMonths === age * 12 && !child.milestones.includes(age)) { child.milestones.push(age); addLog(`${child.name} อายุ ${age} ปี ถึงช่วงตัดสินใจของชีวิต`, true); }
      });
    });
    [...family.parents, ...family.relatives].forEach(member => {
      if (member.alive !== false && family.health < 30) member.health = Math.max(0, member.health - 1);
      if (member.health <= 0 && member.alive !== false) { member.alive = false; family.losses.push({ id: member.id, month: s.month, cause: 'การดูแลผู้ใหญ่ไม่เพียงพอ' }); addFamilyChronicle(s, `${member.name} จากไป`, -2); }
    });
    if (family.construction) {
      family.construction.monthsLeft--;
      if (family.construction.monthsLeft <= 0) { family.buildings.push(family.construction.id); addLog(`ก่อสร้าง${FAMILY_BUILDINGS.find(item => item.id === family.construction.id)?.name || 'อาคาร'}เสร็จสมบูรณ์`, true); family.construction = null; }
    }
    if (family.buildings.includes('herb_garden')) {
      ensureInventory(s).herb++;
      s.materialLife = s.materialLife || {};
      if (s.activity !== 'work' || ensureHousehold(s).job !== 'farmer') s.materialLife.farmMonths = (s.materialLife.farmMonths || 0) + 1;
      if (s.month % 6 === 0) { addGradedMaterial(s, 'herb', 'uncommon'); addLog('สวนให้สมุนไพรชั้นดีจากการดูแลต่อเนื่อง'); }
      s.materialLife.gardenMonths = (s.materialLife.gardenMonths || 0) + 1; grantLifeMaterialMilestone(s, 'herb', s.materialLife.gardenMonths, 'สวนสมุนไพร');
    }
    if (family.buildings.includes('workshop')) {
      ensureInventory(s).iron++;
      s.materialLife = s.materialLife || {};
      s.materialLife.artisanMonths = (s.materialLife.artisanMonths || 0) + 1;
      if (s.month % 6 === 0) { addGradedMaterial(s, 'iron', 'uncommon'); addLog('โรงช่างตระกูลผลิตแร่เหล็กชั้นดี'); }
      grantLifeMaterialMilestone(s, 'iron', s.materialLife.artisanMonths, 'โรงช่างตระกูล');
    }
    if (family.buildings.includes('apothecary_room')) {
      s.materialLife = s.materialLife || {};
      s.materialLife.healerMonths = (s.materialLife.healerMonths || 0) + 1;
      family.health = clamp(family.health + 1, 0, 100);
      if (s.hero.health < s.hero.maxHealth && Math.random() < 0.5) {
        s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 3);
      }
      if (s.month % 6 === 0) { addGradedMaterial(s, 'herb', 'uncommon'); addLog('ห้องปรุงยาตระกูลสกัดสมุนไพรชั้นดี'); }
      grantLifeMaterialMilestone(s, 'herb', s.materialLife.healerMonths, 'ห้องปรุงยาตระกูล');
    }
    if (family.buildings.includes('ancestral_shrine')) s.hero.karma += 1;
    if (s.activity === 'family') { family.bond = clamp(family.bond + 2, 0, 100); family.conflict = clamp(family.conflict - 2, 0, 100); family.health = clamp(family.health + 1, 0, 100); }
    family.legacyScore = Math.max(0, family.legacyScore + (family.bond >= 60 ? 1 : 0) + family.buildings.length);
    family.heirId = family.children.find(child => child.alive !== false && child.ageMonths >= 18 * 12)?.id || family.heirId;
    if (household.debt > 0 && s.activity === 'family' && family.treasury > 0) { const payment = Math.min(household.debt, family.treasury, 2); household.debt -= payment; family.debt = household.debt; family.treasury -= payment; }
  }
  function ensureSectCareer(s) {
    s.sectCareer = s.sectCareer || { rank: 'outer', merit: 0, lastExamMonth: 0, examCount: 0 };
    s.sectCareer.merit = Math.max(0, Number(s.sectCareer.merit) || 0);
    s.sectCareer.examCount = Math.max(0, Number(s.sectCareer.examCount) || 0);
    return s.sectCareer;
  }
  function ensureOfficialCareer(s) {
    const sect = ensureSectCareer(s);
    s.officialCareer = s.officialCareer || { affiliation: null, assignment: 'normal', merit: 0, cityMerit: 0, rank: 'civilian', examCount: 0, lastExamMonth: 0, lastActionMonth: -1, risk: 0, rights: [], resources: 0 };
    const c = s.officialCareer;
    c.affiliation = ['sect', 'city', 'border'].includes(c.affiliation) ? c.affiliation : (s.flags?.metSect ? 'sect' : null);
    c.assignment = OFFICIAL_ASSIGNMENTS[c.assignment] ? c.assignment : 'normal';
    c.merit = Math.max(0, Number(c.merit) || 0);
    c.cityMerit = Math.max(0, Number(c.cityMerit) || 0);
    c.examCount = Math.max(0, Number(c.examCount) || 0);
    c.lastExamMonth = Number(c.lastExamMonth) || 0;
    c.lastActionMonth = Number.isFinite(c.lastActionMonth) ? c.lastActionMonth : -1;
    c.risk = Math.max(0, Number(c.risk) || 0);
    c.rights = Array.isArray(c.rights) ? c.rights : [];
    // Keep the existing sect career API authoritative for old saves and callers.
    if (c.affiliation === 'sect') c.merit = Math.max(c.merit, sect.merit);
    else if (c.affiliation == null && s.flags?.metSect) c.affiliation = 'sect';
    return c;
  }
  function officialRank(c) {
    return OFFICIAL_RANKS.find(rank => rank.id === c.rank) || OFFICIAL_RANKS[0];
  }
  function officialRights(s) {
    const c = ensureOfficialCareer(s), rights = new Set(c.rights || []);
    if (c.affiliation === 'sect') {
      const index = Math.max(0, SECT_RANKS.findIndex(rank => rank.id === (s.sectCareer?.rank || 'outer')));
      rights.add('เข้าพื้นที่ทำงาน');
      if (index >= 1 && ((s.sectCareer?.merit || c.merit) >= 30 || (s.relations?.master || 0) + (s.relations?.senior || 0) >= 10)) rights.add('หอคัมภีร์ชั้นต้น');
      if (index >= 2 && ((s.sectCareer?.merit || c.merit) >= 70 || (s.relations?.master || 0) + (s.relations?.senior || 0) >= 20)) rights.add('หอเอกสารลับ');
      if (index >= 3 && (s.relations?.supervisor || 0) >= 10) rights.add('คลังเสบียง');
    } else {
      officialRank(c).rights.forEach(right => rights.add(right));
      if (c.affiliation === 'city' && ((c.cityMerit || 0) >= 20 || (s.relations?.supervisor || 0) >= 5)) rights.add('ทะเบียนคดีและเขตสอบสวน');
      if (c.affiliation === 'city' && (c.cityMerit || 0) >= 55) rights.add('ประตูเมืองและคลังเสบียง');
    }
    return rights;
  }
  function hasOfficialRight(s, right) { return officialRights(s).has(right); }
  function officialExamTarget(s) {
    const c = ensureOfficialCareer(s);
    if (c.affiliation === 'sect') {
      const current = Math.max(0, SECT_RANKS.findIndex(rank => rank.id === (s.sectCareer?.rank || 'outer')));
      return SECT_RANKS[current + 1] || null;
    }
    return OFFICIAL_RANKS.find(rank => rank.merit > c.cityMerit) || null;
  }
  function officialExamOptions(s) {
    return Object.entries(OFFICIAL_EXAM_OPTIONS).map(([id, option]) => ({ id, ...option, target: officialExamTarget(s)?.name || 'ไม่มีตำแหน่งถัดไป' }));
  }
  function resolveOfficialExam(s, choice = 'power') {
    const c = ensureOfficialCareer(s), target = officialExamTarget(s);
    if (!target || !OFFICIAL_EXAM_OPTIONS[choice] || (c.affiliation === 'sect' && s.mode === 'story' && (!s.flags?.metSect || s.month < 84))) return false;
    const combat = syncCombat(s) || {}, a = s.hero.attributes || {}, merit = c.affiliation === 'sect' ? s.sectCareer.merit : c.cityMerit;
    const scores = {
      power: combat.totalPower || 0,
      case: (a.intellect || 0) * 2 + (s.hero.reputation || 0) + (s.paths?.insight || 0) * 2,
      loyalty: (s.relations?.master || 0) + (s.relations?.senior || 0) + (s.relations?.supervisor || 0) + (s.paths?.duty || 0) * 2 + (s.hero.karma || 0)
    };
    const threshold = c.affiliation === 'sect'
      ? { power: target.merit * 40, case: target.merit / 2 + 20, loyalty: target.merit / 2 }[choice]
      : { power: target.merit * 20, case: target.merit, loyalty: target.merit / 2 }[choice];
    const realmReady = c.affiliation !== 'sect' || (s.hero.realm > target.realm || (s.hero.realm === target.realm && (s.hero.stage || 0) >= target.stage));
    const passed = merit >= target.merit && realmReady && scores[choice] >= threshold;
    c.lastExamMonth = s.month; c.examCount++; c.lastExamChoice = choice;
    if (c.affiliation === 'sect') s.sectCareer.examCount++;
    if (passed) {
      if (c.affiliation === 'sect') { s.sectCareer.rank = target.id; s.relations.master += 5; }
      else c.rank = target.id;
      (target.rights || []).forEach(right => { if (!c.rights.includes(right)) c.rights.push(right); });
      addLog(`สอบ${OFFICIAL_EXAM_OPTIONS[choice].name}ผ่าน: ได้รับตำแหน่ง${target.name}`, true);
    } else addLog(`สอบ${OFFICIAL_EXAM_OPTIONS[choice].name}${target.name}ไม่ผ่าน ${!realmReady ? `ต้องมีขั้น${REALMS[target.realm - 1]} ขั้น ${target.stage} ขึ้นไป` : 'ต้องเพิ่มผลงานหรือความพร้อม'}`);
    return passed;
  }
  function resolveOfficialDiscipline(s, choice = 'defend') {
    const c = ensureOfficialCareer(s);
    if (!c.pendingDiscipline) return false;
    const loyalty = (s.relations?.master || 0) + (s.relations?.senior || 0) + (s.relations?.supervisor || 0) + (s.paths?.duty || 0) * 2;
    const protectedCase = choice === 'cover' && (s.paths?.insight || 0) >= 6;
    const defended = choice === 'defend' && loyalty >= 20;
    const sectIndex = Math.max(0, SECT_RANKS.findIndex(rank => rank.id === (s.sectCareer?.rank || 'outer')));
    c.pendingDiscipline = false; c.lastDisciplineChoice = choice; c.rights = [];
    if (protectedCase || defended) {
      if (c.affiliation === 'sect' && sectIndex > 0) s.sectCareer.rank = SECT_RANKS[sectIndex - 1].id;
      else if (c.affiliation !== 'sect') c.rank = OFFICIAL_RANKS[Math.max(0, OFFICIAL_RANKS.findIndex(rank => rank.id === c.rank) - 1)].id;
      s.hero.reputation -= choice === 'cover' ? 3 : 4;
      addLog('การสอบสวนจบลงด้วยการลดขั้นและคุมประพฤติ ชื่อเสียงลดลง', true);
    } else {
      const expelled = c.affiliation;
      c.affiliation = null; c.assignment = 'normal'; c.expelledFrom = expelled; s.flags.officialExpelled = true; s.hero.reputation -= 8;
      addLog(`ถูกไล่ออกจาก${expelled === 'sect' ? 'สำนัก' : 'ราชการ'}จากคดีทรยศ`, true);
    }
    return true;
  }
  function availableOfficialAssignments(s) {
    const c = ensureOfficialCareer(s);
    return Object.entries(OFFICIAL_ASSIGNMENTS).filter(([id, def]) =>
      (!def.requires || def.requires(s)) && (def.affiliation === 'any' || def.affiliation === c.affiliation || (def.affiliation === 'city' && c.affiliation === 'border'))
    ).map(([id, def]) => ({ id, ...def }));
  }
  function setOfficialAffiliation(s, affiliation) {
    if (!['sect', 'city', 'border'].includes(affiliation)) return false;
    if (affiliation === 'sect' && (s.mode === 'story' ? (!s.flags?.metSect || s.month < 84) : s.month < 12)) return false;
    const c = ensureOfficialCareer(s); c.affiliation = affiliation; c.assignment = 'normal';
    addLog(`เลือกเส้นทาง${affiliation === 'sect' ? 'สำนัก' : affiliation === 'border' ? 'รักษาชายแดน' : 'ราชการเมือง'}`, true);
    return true;
  }
  function setOfficialAssignment(s, assignment) {
    if (!OFFICIAL_ASSIGNMENTS[assignment] || !availableOfficialAssignments(s).some(item => item.id === assignment)) return false;
    ensureOfficialCareer(s).assignment = assignment;
    return true;
  }
  function advanceOfficialCareer(s) {
    const c = ensureOfficialCareer(s);
    if (s.activity !== 'sect' || c.lastActionMonth === s.month) return null;
    if (c.pendingDiscipline) { resolveOfficialDiscipline(s, c.disciplineChoice || 'defend'); return null; }
    if (!c.affiliation) c.affiliation = s.flags?.metSect ? 'sect' : 'city';
    const selected = availableOfficialAssignments(s).find(item => item.id === c.assignment) || availableOfficialAssignments(s)[0] || { id: 'normal', ...OFFICIAL_ASSIGNMENTS.normal };
    c.assignment = selected.id;
    c.lastActionMonth = s.month;
    const meritKey = c.affiliation === 'sect' ? 'merit' : 'cityMerit';
    c[meritKey] += selected.merit;
    c.resources += selected.money || 0;
    s.hero.money += selected.money || 0;
    s.hero.reputation += selected.reputation || 0;
    s.hero.powerBonus += selected.power || 0;
    s.paths.duty += 1;
    s.relations.supervisor = (s.relations.supervisor || 0) + (selected.risk ? 1 : 2);
    if (c.affiliation === 'sect') s.relations.master += selected.id === 'secret' ? 2 : 1;
    if (selected.id === 'investigation') s.hero.attributes.intellect = Math.min(126, s.hero.attributes.intellect + 1);
    selected.rights.forEach(right => { if (!c.rights.includes(right)) c.rights.push(right); });
    c.risk += selected.risk || 0;
    if (c.risk >= 6) {
      c.risk = 0; c.pendingDiscipline = true; s.flags.officialBetrayal = true; s.hero.reputation -= 6; ensureWorldPressure(s).sectWar += 5;
      if (c.affiliation === 'sect') s.flags.betrayedSect = true;
      addLog(`งาน${selected.name}พลิกเป็นความเสี่ยงจากการทรยศ ถูกตั้งสอบสวนอย่างเป็นทางการ`, true);
    }
    if (c.affiliation === 'sect') { const sect = ensureSectCareer(s); sect.merit = Math.max(sect.merit, c.merit); }
    const label = c.affiliation === 'sect' ? 'สำนัก' : c.affiliation === 'border' ? 'ชายแดน' : 'เมือง';
    addLog(`ทำ${selected.name}สาย${label} ได้แต้มผลงาน +${selected.merit}${selected.rights.length ? ` และสิทธิ์ ${selected.rights.join(', ')}` : ''}`);
    return selected;
  }
  function advanceSectCareer(s) {
    if (s.activity === 'sect') advanceOfficialCareer(s);
    const official = ensureOfficialCareer(s);
    if (official.affiliation !== 'sect' || (s.mode === 'story' && (!s.flags.metSect || s.month < 84))) {
      if (official.affiliation !== 'sect' && s.activity === 'sect' && s.month - official.lastExamMonth >= 24) {
        const nextOfficial = OFFICIAL_RANKS.find(rank => rank.merit > official.cityMerit);
        if (nextOfficial) {
          resolveOfficialExam(s, official.examChoice || 'power');
        }
      }
      return;
    }
    const career = ensureSectCareer(s);
    if (s.activity === 'work') career.merit += 2;
    if (s.activity === 'train') career.merit += 1;
    if (s.activity === 'explore' && s.flags.foundMap) career.merit += 1;
    if (s.month - career.lastExamMonth < 36) return;
    const currentIndex = Math.max(0, SECT_RANKS.findIndex(rank => rank.id === career.rank));
    const next = SECT_RANKS[currentIndex + 1];
    if (!next) return;
    resolveOfficialExam(s, ensureOfficialCareer(s).examChoice || 'power');
  }
  function ensureHousehold(s) {
    s.household = s.household || { job: 'odd_jobs', housing: 'shelter', debt: 0, debtPrincipal: 0, interestRate: .08, interestAccrued: 0, arrears: 0, collectionStage: 0, creditor: null, seizedAssets: [], bankruptcy: false, loanCount: 0, monthlyCost: 0, careerXp: 0, careerLevel: 1, workFatigue: 0, workRisk: 0, ownedProperties: [], debtReasons: {} };
    s.household.job = JOB_DEFS.some(job => job.id === s.household.job) ? s.household.job : 'odd_jobs';
    s.household.housing = HOUSE_TYPES[s.household.housing] ? s.household.housing : 'shelter';
    s.household.debt = Math.max(0, Number(s.household.debt) || 0);
    s.household.debtPrincipal = Math.max(0, Number(s.household.debtPrincipal) || s.household.debt);
    s.household.interestRate = clamp(Number(s.household.interestRate) || .08, .02, .2);
    s.household.interestAccrued = Math.max(0, Number(s.household.interestAccrued) || 0);
    s.household.arrears = Math.max(0, Number(s.household.arrears) || 0);
    s.household.collectionStage = clamp(Number(s.household.collectionStage) || 0, 0, 3);
    s.household.creditor = s.household.creditor || (s.household.debt > 0 ? 'นายทุนตลาดชายแดน' : null);
    s.household.seizedAssets = Array.isArray(s.household.seizedAssets) ? s.household.seizedAssets : [];
    s.household.ownedProperties = Array.isArray(s.household.ownedProperties) ? s.household.ownedProperties : [];
    s.household.debtReasons = (typeof s.household.debtReasons === 'object' && s.household.debtReasons !== null) ? s.household.debtReasons : {};
    s.household.bankruptcy = !!s.household.bankruptcy;
    s.household.loanCount = Math.max(0, Number(s.household.loanCount) || 0);
    s.household.careerXp = Math.max(0, Number(s.household.careerXp) || 0);
    s.household.careerLevel = clamp(Number(s.household.careerLevel) || 1, 1, 4);
    s.household.workFatigue = Math.max(0, Number(s.household.workFatigue) || 0);
    s.household.workRisk = Math.max(0, Number(s.household.workRisk) || 0);
    return s.household;
  }
  function canTakeJob(s, job) {
    const effectiveCombat = syncCombat(s), a = effectiveCombat.attributes, combat = effectiveCombat;
    if ((s.hero?.ageMonths || 0) < 144) return false;
    if (s.mode === 'story' && s.month < (job.minMonth || 0)) return false;
    if (job.storyOnly && s.mode !== 'story' && s.mode !== 'free') return false;
    if (job.id === 'odd_jobs') return true;
    if (job.id === 'farmer') return a.body >= 12;
    if (job.id === 'hunter') return a.body >= 14 || Number(a.agility || combat.agility || 0) >= 14;
    if (job.id === 'physician') return a.intellect >= 14 && (s.crafting?.knowledge?.alchemy || 0) >= 1;
    if (job.id === 'merchant') return a.intellect >= 14;
    if (job.id === 'guard') return (a.body >= 16 || combat.agility >= 14) && (s.hero.power || 0) >= 120;
    if (job.id === 'artisan') return a.body >= 18 && (s.materials?.iron || 0) > 0;
    if (job.id === 'sect_clerk') return s.flags.metSect && a.intellect >= 16;
    if (job.id === 'underworld_runner') return (s.flags.workedUnderworld || s.flags.underworldContact) && a.charm >= 18;
    return false;
  }
  function setJob(s, jobId) {
    const job = JOB_DEFS.find(item => item.id === jobId);
    if (!job || !canTakeJob(s, job)) return false;
    const household = ensureHousehold(s);
    if (household.job !== job.id) {
      const prevJob = JOB_DEFS.find(item => item.id === household.job);
      household.job = job.id;
      household.careerXp = Math.floor(household.careerXp * 0.5);
      if (household.careerLevel > 1 && household.careerXp < workCareerThreshold(household.careerLevel)) {
        household.careerLevel = Math.max(1, household.careerLevel - 1);
      }
      addLog(`เปลี่ยนอาชีพเป็น${job.name}${prevJob ? ` (ย้ายจาก${prevJob.name} ถ่ายทอดทักษะ 50%)` : ''}`, true);
    }
    return true;
  }
  function buyOrRentHouse(s, houseId) {
    const house = HOUSE_TYPES[houseId]; if (!house) return false;
    const household = ensureHousehold(s);
    household.ownedProperties = household.ownedProperties || [];
    const isOwned = household.ownedProperties.includes(houseId);

    if (houseId === 'shelter') {
      household.housing = 'shelter';
      const locationId = 'roadside';
      unlockLocation(s, locationId);
      ensureLocationState(s).current = locationId;
      ensureLocationState(s).selected = locationId;
      addLog('ย้ายไปพักใต้ชายคาชั่วคราว ไม่มีค่าเช่ารายเดือน แต่ความปลอดภัยต่ำ');
      return true;
    }

    if (houseId === 'rented') {
      if (household.housing === 'rented') return true;
      if (s.hero.money < house.cost) {
        addLog(`เงินไม่พอจ่ายค่ามัดจำแรกเข้าบ้านเช่า (ต้องการ ${house.cost} ตำลึง)`);
        return false;
      }
      s.hero.money -= house.cost;
      household.housing = 'rented';
      const locationId = 'rented';
      unlockLocation(s, locationId);
      ensureLocationState(s).current = locationId;
      ensureLocationState(s).selected = locationId;
      addLog(`ทำสัญญาเช่า${house.name}สำเร็จ จ่ายมัดจำ ${house.cost} ตำลึง (ค่าเช่าเดือนละ ${house.upkeep} ตำลึง)`, true);
      return true;
    }

    if (isOwned) {
      household.housing = houseId;
      const locationId = houseId;
      unlockLocation(s, locationId);
      ensureLocationState(s).current = locationId;
      ensureLocationState(s).selected = locationId;
      addLog(`ย้ายกลับเข้าสู่${house.name}ของตนเอง (เป็นเจ้าของอยู่แล้ว ไม่เสียค่าซื้อซ้ำ)`);
      return true;
    }

    if (s.hero.money < house.cost) {
      addLog(`เงินไม่พอซื้อ${house.name} (ต้องการ ${house.cost} ตำลึง ปัจจุบันมี ${s.hero.money} ตำลึง)`);
      return false;
    }
    s.hero.money -= house.cost;
    household.ownedProperties.push(houseId);
    household.housing = houseId;
    const locationId = houseId;
    unlockLocation(s, locationId);
    ensureLocationState(s).current = locationId;
    ensureLocationState(s).selected = locationId;
    addLog(`ซื้อขาด${house.name}สำเร็จ จ่าย ${house.cost} ตำลึง ได้รับกรรมสิทธิ์ถาวร (ค่าบำรุงเดือนละ ${house.upkeep} ตำลึง)`, true);
    return true;
  }
  function takeHouseholdLoan(s, amount = 30) {
    const household = ensureHousehold(s);
    if (amount <= 0 || household.loanCount >= 3) {
      addLog('กู้เงินไม่สำเร็จ: เกินวงเงินกู้สูงสุด 3 ครั้ง');
      return false;
    }
    const totalRepay = Math.ceil(amount * 1.25);
    s.hero.money += amount;
    household.debt += totalRepay;
    household.debtPrincipal += amount;
    household.loanCount++;
    household.creditor = household.creditor || 'นายทุนตลาดชายแดน';
    household.debtReasons = household.debtReasons || {};
    household.debtReasons.loan = (household.debtReasons.loan || 0) + totalRepay;
    household.bankruptcy = false;
    addLog(`กู้เงินครัวเรือน ${amount} ตำลึงจาก${household.creditor} (ดอกเบี้ย 25% รวมต้องชำระ ${totalRepay} ตำลึง)`, true);
    return true;
  }
  function workCareerThreshold(level) { return [0, 12, 30, 60][clamp(level - 1, 0, 3)]; }
  function advanceWorkCareer(s, job) {
    const household = ensureHousehold(s);
    household.careerXp += 1 + (job.workload <= 1 ? 1 : 0);
    const nextLevel = household.careerLevel < 4 && household.careerXp >= workCareerThreshold(household.careerLevel + 1)
      ? household.careerLevel + 1 : household.careerLevel;
    if (nextLevel > household.careerLevel) {
      household.careerLevel = nextLevel;
      addLog(`${job.name}ก้าวสู่ระดับอาชีพ ${nextLevel} · ค่าจ้างพื้นฐานเพิ่มขึ้น`, true);
    }
    return household.careerLevel;
  }
  function advanceHousehold(s) {
    const household = ensureHousehold(s);
    if (s.hero.ageMonths < 15 * 12 || s.month % 1 !== 0) return;
    const house = HOUSE_TYPES[household.housing] || HOUSE_TYPES.shelter;
    const refugeeSurcharge = Math.floor((s.world?.modifiers?.refugeePressure || 0) / 20);
    const repairDiscount = household.repairMonths > 0 && house.upkeep > 0 ? 1 : 0;
    household.monthlyCost = Math.max(0, house.upkeep - repairDiscount) + refugeeSurcharge;
    if (repairDiscount) household.repairMonths--;

    if (household.monthlyCost > 0) {
      if (s.hero.money >= household.monthlyCost) {
        s.hero.money -= household.monthlyCost;
      } else {
        const deficit = household.monthlyCost - Math.max(0, s.hero.money);
        s.hero.money = 0;
        household.debt += deficit;
        household.debtReasons = household.debtReasons || {};
        household.debtReasons.rent = (household.debtReasons.rent || 0) + deficit;
        s.hero.health = Math.max(1, s.hero.health - 1);
        addLog(`เงินไม่พอจ่ายค่าที่พัก (${house.name}) ค้างจ่ายเพิ่มหนี้ ${deficit} ตำลึง`, true);
      }
    }

    if (household.debt > 0) {
      const interest = Math.max(1, Math.ceil(household.debt * household.interestRate));
      household.debt += interest;
      household.interestAccrued += interest;
      household.debtReasons = household.debtReasons || {};
      household.debtReasons.interest = (household.debtReasons.interest || 0) + interest;

      const payment = Math.min(Math.max(0, s.hero.money), Math.ceil(household.debt * 0.15));
      if (payment > 0) {
        s.hero.money -= payment;
        household.debt = Math.max(0, household.debt - payment);
        household.arrears = Math.max(0, household.arrears - 1);
        addLog(`ชำระหนี้ครัวเรือนตามงวด ${payment} ตำลึง (คงเหลือหนี้ ${household.debt} ตำลึง)`);
      } else {
        household.arrears += 1;
        household.collectionStage = Math.min(3, household.collectionStage + 1);
        s.hero.reputation = Math.max(0, s.hero.reputation - (household.arrears >= 2 ? 1 : 0));
        s.flags.debtCollectionDue = household.arrears >= 2;
        addLog(`${household.creditor || 'เจ้าหนี้'}ส่งคนมาติดตามทวงถาม หนี้เพิ่มดอกเบี้ย ${interest} ตำลึง (ค้างชำระ ${household.arrears} เดือน)`, true);
      }
      if (household.arrears >= 4 && household.debt >= 40) enforceDebt(s);
      if (household.debt <= 0) {
        household.arrears = 0;
        household.collectionStage = 0;
        household.creditor = null;
        household.debtReasons = {};
        s.flags.debtCollectionDue = false;
      }
    }
  }
  function enforceDebt(s) {
    const household = ensureHousehold(s);
    ensureItemLoadout(s);
    const index = (s.treasures || []).findIndex(item => !Object.values(s.itemLoadout || {}).includes(item.inventoryUid));
    if (index >= 0) {
      const seized = s.treasures.splice(index, 1)[0];
      household.seizedAssets.push(typeof seized === 'object' ? (seized.name || seized.id) : seized);
      household.debt = Math.max(0, Math.ceil(household.debt * .75)); household.arrears = 0; household.collectionStage = 0; s.flags.debtCollectionDue = false;
      addLog(`${household.creditor || 'เจ้าหนี้'}ยึด${typeof seized === 'object' ? seized.name : seized} เพื่อลดยอดหนี้`, true);
      return 'seized';
    }
    household.bankruptcy = true; household.debt = Math.ceil(household.debt * .4); household.arrears = 0; household.collectionStage = 0; household.housing = 'shelter'; s.hero.money = 0; s.hero.reputation -= 10; s.flags.debtCollectionDue = false;
    addLog('เจ้าหนี้ประกาศให้เจ้าล้มละลาย ทรัพย์สินถูกผ่อนผันบางส่วนแต่ต้องเริ่มชีวิตใหม่จากที่พักชั่วคราว', true);
    return 'bankruptcy';
  }
  function economyPriceMultiplier(s, key = 'general') {
    ensureWorldState(s);
    const m = s.world.modifiers || {};
    if (key === 'herb') return clamp(Number(m.herbPrice || 1), .5, 3);
    if (key === 'iron') return clamp(1 + Number(m.guardPresence || 0) * .05 + Number(m.travelRisk || 0) * .02, .5, 3);
    if (key === 'spiritStone') return clamp(1 + Number(m.guardPresence || 0) * .03 + Number(m.travelRisk || 0) * .01, .5, 3);
    return clamp(1 + Number(m.refugeePressure || 0) * .01, .75, 2.5);
  }
  function ensureInventory(s) {
    s.materials = s.materials || { herb: 0, iron: 0, spiritStone: 0 };
    s.consumables = Array.isArray(s.consumables) ? s.consumables : [];
    ensureTreasureIdentities(s);
    // ยาจากเหตุการณ์เก่าเคยอยู่ในของวิเศษและเผลอให้ผลติดตัว ย้ายมาใช้จริงทีละชิ้น
    const storyConsumables = {
      'ยาหอมลมหายใจแรก': { heal: 12 }, 'เม็ดยาเกล็ดหิมะ': { heal: 20 },
      'เม็ดยาสมุนไพรต้นสุดท้าย': { heal: 36 }, 'เถ้าระฆังไร้เสียง': { karmaBonus: 3, luckBonus: 2 }
    };
    if (Array.isArray(s.treasures)) {
      for (let i = s.treasures.length - 1; i >= 0; i--) {
        const item = s.treasures[i], spec = item && typeof item === 'object' && storyConsumables[item.name];
        if (!spec || !(item.consumable || item.singleUse)) continue;
        s.treasures.splice(i, 1);
        s.consumables.push({ ...item, ...spec, category: 'consumable', subtype: 'pill', bonus: {} });
      }
    }
    s.nextConsumableUid = Math.max(0, Number(s.nextConsumableUid) || 0);
    const usedUids = new Set();
    for (const item of s.consumables) {
      if (!item || typeof item !== 'object') continue;
      const existing = typeof item.inventoryUid === 'string' ? item.inventoryUid : '';
      if (existing && !usedUids.has(existing)) { usedUids.add(existing); continue; }
      let uid; do { uid = `consumable-${++s.nextConsumableUid}`; } while (usedUids.has(uid) || s.consumables.some(other => other !== item && other?.inventoryUid === uid));
      item.inventoryUid = uid; usedUids.add(uid);
    }
    s.materialStacks = Array.isArray(s.materialStacks) ? s.materialStacks : [];
    ensureGradedMaterials(s);
    s.lastCraftMonth = Number.isFinite(s.lastCraftMonth) ? s.lastCraftMonth : -1;
    ensureCraftingState(s);
    return s.materials;
  }
  function ensureCraftingState(s) {
    s.crafting = s.crafting && typeof s.crafting === 'object' ? s.crafting : {};
    s.crafting.knowledge = s.crafting.knowledge && typeof s.crafting.knowledge === 'object' ? s.crafting.knowledge : {};
    s.crafting.practice = s.crafting.practice && typeof s.crafting.practice === 'object' ? s.crafting.practice : {};
    s.crafting.tab = ['all', 'alchemy', 'smithing', 'utility'].includes(s.crafting.tab) ? s.crafting.tab : 'all';
    ['alchemy', 'smithing', 'tools', 'support'].forEach(key => { s.crafting.knowledge[key] = Number.isFinite(Number(s.crafting.knowledge[key])) ? Math.max(0, Number(s.crafting.knowledge[key])) : 1; });
    s.crafting.equipment = Array.isArray(s.crafting.equipment) ? s.crafting.equipment : [];
    s.crafting.target = s.crafting.target && typeof s.crafting.target === 'object' ? s.crafting.target : null;
    s.crafting.auto = s.crafting.auto && typeof s.crafting.auto === 'object' ? s.crafting.auto : { enabled: false, mode: 'stop', recipeId: null };
    s.crafting.auto.enabled = !!s.crafting.auto.enabled;
    s.crafting.auto.mode = ['stop', 'fallback', 'learn'].includes(s.crafting.auto.mode) ? s.crafting.auto.mode : (s.crafting.auto.enabled ? 'fallback' : 'stop');
    s.crafting.auto.recipeId = RECIPES.some(recipe => recipe.id === s.crafting.auto.recipeId) ? s.crafting.auto.recipeId : null;
    return s.crafting;
  }
  function craftLocation(s) {
    ensureLocationState(s);
    return s.locations?.current || 'roadside';
  }
  function hasCraftTeacher(s, teacher) {
    if (!teacher) return true;
    ensureRelationshipState(s);
    return Number(s.relations?.[teacher] || 0) >= (teacher === 'master' ? 8 : 6) || !!s.flags?.[`${teacher}BondGiven`];
  }
  function craftRequirements(s, recipe) {
    ensureCraftingState(s);
    if (!recipe) return { ok: false, reasons: ['ไม่พบสูตร'] };
    const reasons = [];
    if (s.lastCraftMonth === s.month) reasons.push('ใช้สิทธิ์สร้างหรือศึกษาของเดือนนี้แล้ว');
    if ((s.crafting.knowledge[recipe.knowledge] || 0) < (recipe.knowledgeMin || 0)) reasons.push(`ต้องมีความรู้${recipe.kind}`);
    if (recipe.teacher && !hasCraftTeacher(s, recipe.teacher) && (s.crafting.knowledge[recipe.knowledge] || 0) < (recipe.knowledgeMin || 1) + 1) reasons.push('ต้องมีผู้สอน หรือศึกษาความรู้ให้สูงกว่าเกณฑ์ 1 ระดับ');
    if (recipe.equipment && !s.crafting.equipment.includes(recipe.equipment)) reasons.push(`ต้องมี${({ forge: 'เตาตีเหล็ก', workbench: 'โต๊ะช่าง', alchemy_stove: 'เตาปรุงยา' })[recipe.equipment] || recipe.equipment}`);
    if (recipe.locations && !recipe.locations.includes(craftLocation(s))) reasons.push('สถานที่ไม่เหมาะกับสูตรนี้');
    const availability = activityAvailability(s, 'craft');
    if (!availability.ok) reasons.push(availability.reason);
    const costs = effectiveCraftCost(s, recipe);
    Object.entries(costs).forEach(([key, amount]) => { const have = key === 'money' ? Number(s.hero?.money || 0) : Number(s.materials?.[key] || 0); if (have < amount) reasons.push(`ขาด${key === 'money' ? 'ตำลึง' : MATERIAL_NAMES[key] || key} ${amount - have}`); });
    (recipe.gradedCost || []).forEach(req => { const have = Number(s.gradedMaterials?.[req.material]?.[req.grade] || 0); if (have < req.amount) reasons.push(`ขาด${MATERIAL_NAMES[req.material]} ${ITEM_GRADES[req.grade].name} ${req.amount - have}`); });
    return { ok: reasons.length === 0, reasons };
  }
  function canCraftMaterials(s, recipe) {
    ensureInventoryShallow(s);
    const cost = effectiveCraftCost(s, recipe);
    return Object.entries(cost).every(([key, value]) => key === 'money' ? Number(s.hero?.money || 0) >= value : Number(s.materials[key] || 0) >= value) && (recipe.gradedCost || []).every(req => (s.gradedMaterials?.[req.material]?.[req.grade] || 0) >= req.amount);
  }
  function effectiveCraftCost(s, recipe) {
    const cost = { ...(recipe?.cost || {}) };
    const herbPressure = Number(s.world?.modifiers?.herbPrice || 1);
    if ((cost.herb || 0) > 0 && herbPressure > 1) cost.money = (cost.money || 0) + Math.ceil(cost.herb * (herbPressure - 1));
    if ((cost.iron || 0) > 0) cost.money = (cost.money || 0) + Math.max(0, Math.ceil(cost.iron * (economyPriceMultiplier(s, 'iron') - 1)));
    if ((cost.spiritStone || 0) > 0) cost.money = (cost.money || 0) + Math.max(0, Math.ceil(cost.spiritStone * (economyPriceMultiplier(s, 'spiritStone') - 1)));
    return cost;
  }
  function ensureInventoryShallow(s) {
    s.materials = s.materials || { herb: 0, iron: 0, spiritStone: 0 };
    s.consumables = Array.isArray(s.consumables) ? s.consumables : [];
  }
  function canCraft(s, recipe) {
    ensureInventory(s);
    return !!craftRequirements(s, recipe).ok;
  }
  function craftingProfile(s, recipe) {
    ensureCraftingState(s); ensureAttributes(s);
    const knowledge = Number(s.crafting.knowledge[recipe?.knowledge] || 0);
    const teacher = recipe?.teacher && hasCraftTeacher(s, recipe.teacher) ? 8 : 0;
    const equipment = recipe?.equipment && s.crafting.equipment.includes(recipe.equipment) ? 8 : 0;
    const attributes = syncCombat(s).attributes;
    const stat = recipe?.kind === 'ปรุงยา' ? attributes.spirit : recipe?.kind === 'ตีเหล็ก' ? attributes.body : attributes.intellect;
    const item = craftingItemBonus(s);
    return { item, chance: clamp(Number(recipe?.chance || 0) + knowledge * 5 + teacher + equipment + Math.floor(stat / 10) + item.craftChance, 5, 100), quality: clamp(1 + Math.floor(knowledge / 2) + (equipment ? 1 : 0) + item.qualityBonus, 1, 4) };
  }
  function craftingItemBonus(s) {
    const totals = { craftChance: 0, qualityBonus: 0, explore: 0 };
    activeTreasures(s).forEach(item => { const bonus = itemBonus(item); Object.keys(totals).forEach(key => { totals[key] += Number(bonus[key] || 0); }); });
    return totals;
  }
  function craftedStats(recipe, quality) {
    const scale = 1 + (quality - 1) * .25;
    if (recipe.quality === 'healing') return { heal: Math.round(18 * scale) };
    if (recipe.quality === 'defense') return { defense: Math.round(3 * scale) };
    if (recipe.quality === 'training') return { training: Math.round(5 * scale) };
    if (recipe.quality === 'utility') return { explore: Math.round(5 * scale), craftChance: Math.round(3 * scale) };
    return { restHealth: Math.round(4 * scale), restQi: Math.round(4 * scale) };
  }
  function executeCraft(s, recipeId) {
    ensureInventory(s);
    ensureCraftingState(s);
    const recipe = RECIPES.find(item => item.id === recipeId);
    if (!recipe) return false;
    const req = craftRequirements(s, recipe);
    if (!req.ok) {
      addLog(`ไม่สามารถสร้าง${recipe.name}ได้: ${req.reasons.join(' · ')} จึงฝึกฝนพื้นฐานช่างทั่วไปแทน`, true);
      s.hero.attributes.intellect = Math.min(126, (s.hero.attributes.intellect || 10) + 1);
      s.hero.discipline = Math.min(100, (s.hero.discipline || 0) + 1);
      return false;
    }
    const profile = craftingProfile(s, recipe);
    const success = Math.random() * 100 < profile.chance;
    Object.entries(effectiveCraftCost(s, recipe)).forEach(([key, value]) => {
      const spent = success || key === 'money' ? value : Math.ceil(value / 2);
      if (key === 'money') s.hero.money -= spent; else s.materials[key] -= spent;
    });
    (recipe.gradedCost || []).forEach(reqItem => {
      s.gradedMaterials[reqItem.material][reqItem.grade] -= success ? reqItem.amount : Math.ceil(reqItem.amount / 2);
    });
    s.lastCraftMonth = s.month;
    if (!success) {
      addLog(`สร้าง${recipe.name}ล้มเหลว เสียวัตถุดิบครึ่งหนึ่งปัดขึ้นและค่าใช้จ่าย (${profile.chance}% โอกาสสำเร็จ)`, true);
      return false;
    }
    s.crafting.practice[recipe.knowledge] = (s.crafting.practice[recipe.knowledge] || 0) + 1;
    if (s.crafting.practice[recipe.knowledge] % 3 === 0 && s.crafting.knowledge[recipe.knowledge] < 5) {
      s.crafting.knowledge[recipe.knowledge]++;
      addLog(`ฝึกจนความรู้${recipe.kind}เพิ่มเป็นระดับ ${s.crafting.knowledge[recipe.knowledge]}`, true);
    }
    const quality = recipe.kind === 'ปรุงยา' ? Math.min(profile.quality, Math.max(1, MATERIAL_GRADE_IDS.indexOf(recipe.grade || 'common') + 1)) : profile.quality;
    const item = { name: recipe.name, recipeId: recipe.id, quality, grade: recipe.grade || 'common', gradeExplicit: false, stats: craftedStats(recipe, quality) };
    recipe.craft(s, item);
    const madeConsumable = s.consumables?.[s.consumables.length - 1];
    if (madeConsumable?.recipeId === recipe.id && madeConsumable.trainingBonus) madeConsumable.trainingBonus += (quality - 1) * 2;
    const created = [...(s.treasures || [])].reverse().find(candidate => candidate.name === item.name) || [...(s.consumables || [])].reverse().find(candidate => candidate.recipeId === recipe.id);
    if (created && !created.recipeId) created.recipeId = recipe.id;
    addLog(`สร้าง${recipe.name}สำเร็จ คุณภาพระดับ ${quality} (${profile.chance}% โอกาสสำเร็จ)`, true);
    return true;
  }

  function executeStudyCraft(s, knowledge) {
    ensureInventory(s);
    ensureCraftingState(s);
    const labels = { alchemy: 'ปรุงยา', smithing: 'ตีเหล็ก', tools: 'เครื่องมือ', support: 'ของสนับสนุน' };
    const name = labels[knowledge] || knowledge;
    const reasons = [];
    if (!['alchemy', 'smithing', 'tools', 'support'].includes(knowledge)) reasons.push('หมวดความรู้ไม่ถูกต้อง');
    if (!activityAvailability(s, 'craft').ok) reasons.push(activityAvailability(s, 'craft').reason);
    if (s.hero.money < 2) reasons.push('ขาดตำลึง (ต้องใช้ 2 ตำลึง)');
    if ((s.crafting.knowledge[knowledge] || 0) >= 5) reasons.push('ความรู้ระดับสูงสุดแล้ว (5/5)');
    if (reasons.length > 0) {
      addLog(`ไม่สามารถศึกษาความรู้${name}ได้: ${reasons.join(' · ')} จึงฝึกฝนพื้นฐานช่างทั่วไปแทน`, true);
      s.hero.attributes.intellect = Math.min(126, (s.hero.attributes.intellect || 10) + 1);
      s.hero.discipline = Math.min(100, (s.hero.discipline || 0) + 1);
      return false;
    }
    s.hero.money -= 2;
    s.lastCraftMonth = s.month;
    s.crafting.knowledge[knowledge] = (s.crafting.knowledge[knowledge] || 0) + 1;
    addLog(`ศึกษาความรู้${name}ด้วยตนเอง ใช้ 2 ตำลึง เพิ่มเป็นระดับ ${s.crafting.knowledge[knowledge]}`, true);
    return true;
  }

  function planCraft(s, recipeId) {
    ensureCraftingState(s);
    const recipe = RECIPES.find(item => item.id === recipeId);
    if (!recipe) return false;
    if (s.crafting.target?.type === 'recipe' && s.crafting.target?.recipeId === recipeId) {
      s.crafting.target = null;
      addLog(`ยกเลิกเป้าหมายการสร้าง “${recipe.name}”`);
      return true;
    }
    if (s.activity !== 'craft') {
      if (!setActivity(s, 'craft')) return false;
      s.crafting.target = { type: 'recipe', recipeId };
      addLog(`สลับกิจกรรมหลักประจำเดือนเป็น “งานช่าง” และตั้งเป้าหมายสร้าง “${recipe.name}” (รอดำเนินการเมื่อเดินเวลา)`);
    } else {
      s.crafting.target = { type: 'recipe', recipeId };
      addLog(`ตั้งเป้าหมายสร้าง “${recipe.name}” ประจำเดือนนี้ (รอดำเนินการเมื่อเดินเวลา)`);
    }
    return true;
  }

  function planStudyCraft(s, knowledge) {
    ensureCraftingState(s);
    const labels = { alchemy: 'ปรุงยา', smithing: 'ตีเหล็ก', tools: 'เครื่องมือ', support: 'ของสนับสนุน' };
    const name = labels[knowledge] || knowledge;
    if (s.crafting.target?.type === 'study' && s.crafting.target?.knowledge === knowledge) {
      s.crafting.target = null;
      addLog(`ยกเลิกเป้าหมายการศึกษา “${name}”`);
      return true;
    }
    if (s.activity !== 'craft') {
      if (!setActivity(s, 'craft')) return false;
      s.crafting.target = { type: 'study', knowledge };
      addLog(`สลับกิจกรรมหลักประจำเดือนเป็น “งานช่าง” และตั้งเป้าหมายศึกษา “${name}” (รอดำเนินการเมื่อเดินเวลา)`);
    } else {
      s.crafting.target = { type: 'study', knowledge };
      addLog(`ตั้งเป้าหมายศึกษา “${name}” ประจำเดือนนี้ (รอดำเนินการเมื่อเดินเวลา)`);
    }
    return true;
  }

  function craftItem(s, recipeId) {
    return planCraft(s, recipeId);
  }

  function setCraftAutoRule(s, enabledOrMode, recipeId = null, mode = null) {
    ensureCraftingState(s);
    const stringMode = typeof enabledOrMode === 'string' ? enabledOrMode : null;
    s.crafting.auto.enabled = stringMode ? true : !!enabledOrMode;
    s.crafting.auto.mode = ['stop', 'fallback', 'learn'].includes(stringMode || mode) ? (stringMode || mode) : (s.crafting.auto.enabled ? 'fallback' : 'stop');
    s.crafting.auto.recipeId = RECIPES.some(recipe => recipe.id === recipeId) ? recipeId : null;
    return s.crafting.auto;
  }

  function acquireCraftingEquipment(s, equipmentId) {
    ensureInventory(s); const prices = { forge: 12, workbench: 8, alchemy_stove: 10 }; const location = craftLocation(s);
    if (!prices[equipmentId] || !['owned', 'estate', 'sect'].includes(location) || s.hero.money < prices[equipmentId]) return false;
    if (!s.crafting.equipment.includes(equipmentId)) { s.hero.money -= prices[equipmentId]; s.crafting.equipment.push(equipmentId); addLog(`จัดหาอุปกรณ์ ${equipmentId} สำหรับโรงช่าง`); }
    return true;
  }

  function studyCraft(s, knowledge) {
    return planStudyCraft(s, knowledge);
  }
  function splitMaterials(s, material, amount, parts = 1) {
    ensureInventory(s); const total = Math.max(0, Math.floor(Number(amount) || 0)); const count = Math.max(1, Math.floor(Number(parts) || 1));
    if (!s.materials[material] || total <= 0 || total > s.materials[material] || total % count !== 0) return false;
    s.materials[material] -= total; s.materialStacks = Array.isArray(s.materialStacks) ? s.materialStacks : [];
    for (let i = 0; i < count; i++) s.materialStacks.push({ material, amount: total / count });
    return true;
  }
  function mergeMaterialStack(s, index) {
    ensureInventory(s);
    const i = Number(index), stack = s.materialStacks[i];
    if (!Number.isInteger(i) || i < 0 || !stack || !MATERIAL_NAMES[stack.material] || !Number.isInteger(stack.amount) || stack.amount <= 0) return false;
    const grade = stack.grade || 'common';
    if (!MATERIAL_GRADE_IDS.includes(grade)) return false;
    if (!addGradedMaterial(s, stack.material, grade, stack.amount)) return false;
    s.materialStacks.splice(i, 1);
    addLog(`รวม${MATERIAL_NAMES[stack.material]}${ITEM_GRADES[grade].name} ${stack.amount} ชิ้นกลับเข้าคลัง`); return true;
  }
  function disassembleItem(s, itemId) {
    ensureInventory(s); ensureItemLoadout(s); let item; let remove;
    let treasureIndex = s.treasures.findIndex(candidate => candidate.inventoryUid === itemId);
    if (treasureIndex < 0) treasureIndex = s.treasures.findIndex(candidate => candidate.id === itemId || candidate.recipeId === itemId);
    if (treasureIndex >= 0) { item = s.treasures[treasureIndex]; remove = () => { s.treasures.splice(treasureIndex, 1); Object.keys(s.itemLoadout).forEach(slot => { if (s.itemLoadout[slot] === item.inventoryUid) s.itemLoadout[slot] = null; }); }; }
    else { let consumableIndex = s.consumables.findIndex(candidate => candidate.inventoryUid === itemId); if (consumableIndex < 0) consumableIndex = s.consumables.findIndex(candidate => candidate.id === itemId || candidate.recipeId === itemId); if (consumableIndex < 0) return false; item = s.consumables[consumableIndex]; remove = () => s.consumables.splice(consumableIndex, 1); }
    const recipe = RECIPES.find(candidate => candidate.id === item.recipeId || candidate.id === itemId); if (!recipe) return false;
    remove(); Object.entries(recipe.cost || {}).forEach(([key, value]) => { if (key !== 'money') s.materials[key] = (s.materials[key] || 0) + Math.max(1, Math.floor(value * .5)); }); addLog(`แยกชิ้นส่วน${item.name || recipe.name}คืนเป็นวัตถุดิบบางส่วน`); return true;
  }
  function consumeItem(s, itemId) {
    ensureInventory(s); const index = s.consumables.findIndex(item => item.inventoryUid === itemId || item.id === itemId);
    if (index < 0) return false;
    const item = s.consumables[index];
    if (item.cures === 'poison' && !(s.conditions?.poison?.monthsLeft > 0)) { addLog('ไม่มีอาการพิษให้รักษา จึงเก็บยาไว้'); return false; }
    if (item.fatigueRelief && ensureHousehold(s).workFatigue <= 0) { addLog('ยังไม่เหนื่อยจากงาน จึงเก็บยาทาไว้'); return false; }
    if (item.homeRepair && (ensureHousehold(s).repairMonths > 0 || !(HOUSE_TYPES[ensureHousehold(s).housing]?.upkeep > 0))) { addLog('ต้องมีบ้านที่มีค่าดูแล และชุดซ่อมเดิมต้องหมดฤทธิ์ก่อน'); return false; }
    if (item.poisonCoating && s.poisonCoating?.usesLeft > 0) { addLog('อาวุธเคลือบยาไว้แล้ว ใช้ซ้อนกันไม่ได้'); return false; }
    if (item.trainingBonus && (!s.hero.cultivationAccess || (s.pillEffect?.usesLeft || 0) > 0)) { addLog(!s.hero.cultivationAccess ? 'ต้องมีวิชาบำเพ็ญก่อนใช้โอสถปราณ' : 'ยังมีโอสถปราณออกฤทธิ์อยู่ ใช้ซ้อนกันไม่ได้'); return false; }
    const isHealing = (item.heal || 0) > 0;
    const hasOtherUtility = item.cures || item.fatigueRelief || item.homeRepair || item.poisonCoating || item.trainingBonus || item.karmaBonus || item.luckBonus;
    if (isHealing && !hasOtherUtility && s.hero.health >= s.hero.maxHealth) {
      addLog(`สุขภาพเต็มเปี่ยมอยู่แล้ว (${Math.round(s.hero.health)}/${s.hero.maxHealth}) จึงเก็บ${item.name}ไว้ ไม่เสียโอสถโดยเปล่าประโยชน์`);
      return false;
    }
    s.consumables.splice(index, 1);
    if (item.karmaBonus || item.luckBonus) { ensureAttributes(s); s.hero.karma += Number(item.karmaBonus || 0); s.hero.attributes.luck += Number(item.luckBonus || 0); addLog(`ใช้${item.name}: กรรม +${item.karmaBonus || 0} · โชค +${item.luckBonus || 0}`, true); return true; }
    if (item.cures === 'poison') { s.conditions.poison = null; addLog(`ใช้${item.name} ขจัดพิษจากการสำรวจ`); return true; }
    if (item.fatigueRelief) { const household = ensureHousehold(s); household.workFatigue = Math.max(0, household.workFatigue - item.fatigueRelief); addLog(`ใช้${item.name} ลดความเหนื่อยจากงาน ${item.fatigueRelief} หน่วย`); return true; }
    if (item.homeRepair) { ensureHousehold(s).repairMonths = item.homeRepair; addLog(`ใช้${item.name} ลดค่าดูแลบ้าน 1 ตำลึงต่อเดือน ${item.homeRepair} เดือน`); return true; }
    if (item.poisonCoating) { s.poisonCoating = { usesLeft: 1 }; addLog('เคลือบยาสลบไว้ป้องกันตัวจากศัตรูในการสำรวจครั้งถัดไป'); return true; }
    if (item.trainingBonus) { s.pillEffect = { bonus: item.trainingBonus, usesLeft: item.trainingUses || 3, name: item.name }; addLog(`ใช้${item.name} ฝึกปราณเพิ่ม ${item.trainingBonus}% อีก ${item.trainingUses || 3} ครั้ง`); return true; }
    s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + (item.heal || 0));
    addLog(`ใช้${item.name} ฟื้นสุขภาพ ${item.heal || 0} จุด`);
    return true;
  }
  function canSellItems(s) {
    const current = s.locations?.current;
    return current === 'sect' || current === 'market' || (s.travel?.lastArrival?.kind === 'trade' && s.travel.lastArrival.month === s.month && !s.travel.active);
  }
  function buyMaterial(s, material) {
    if (!canSellItems(s) || !MATERIAL_SHOP_PRICES[material]) return false;
    ensureInventory(s);
    const price = Math.max(1, Math.ceil(MATERIAL_SHOP_PRICES[material] * economyPriceMultiplier(s, material)));
    if (s.hero.money < price) { addLog('เงินไม่พอซื้อวัตถุดิบ'); return false; }
    s.hero.money -= price; s.materials[material]++;
    addLog(`ซื้อ${MATERIAL_NAMES[material]}สามัญ 1 ชิ้น ราคา ${price} ตำลึง`); return true;
  }
  function sellMaterial(s, material, amount = 1) {
    if (!canSellItems(s)) return false;
    ensureInventory(s); const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if (!s.materials[material] || s.materials[material] < quantity) return false;
    const price = Math.max(1, Math.round(Number(MATERIAL_LIBRARY_BY_ID[material]?.value || 1) * economyPriceMultiplier(s, material)));
    s.materials[material] -= quantity; s.hero.money += price * quantity;
    addLog(`ขาย${MATERIAL_NAMES[material] || material} ${quantity} ชิ้น ได้ ${price * quantity} ตำลึง`); return true;
  }
  function gradedMaterialPrice(s, material, grade, buying) {
    if (!MATERIAL_SHOP_PRICES[material] || !ITEM_GRADES[grade]) return 0;
    const cost = MATERIAL_SHOP_PRICES[material] * ITEM_GRADES[grade].priceMultiplier * economyPriceMultiplier(s, material);
    return Math.max(1, buying ? Math.ceil(cost) : Math.floor(cost * .4));
  }
  function tradeGradedMaterial(s, material, grade, buying) {
    if (!canSellItems(s) || !MATERIAL_SHOP_PRICES[material] || !MATERIAL_GRADE_IDS.slice(1).includes(grade)) return false;
    // ตลาดขายเฉพาะชั้นดี; ของหายากกว่ายังต้องสร้างความสัมพันธ์หรือใช้ชีวิตเพื่อหา
    if (buying && grade !== 'uncommon') return false;
    ensureInventory(s);
    const price = gradedMaterialPrice(s, material, grade, buying);
    if (buying) { if (s.hero.money < price) return false; s.hero.money -= price; s.gradedMaterials[material][grade]++; }
    else { if (s.gradedMaterials[material][grade] < 1) return false; s.gradedMaterials[material][grade]--; s.hero.money += price; }
    addLog(`${buying ? 'ซื้อ' : 'ขาย'}${MATERIAL_NAMES[material]} ${ITEM_GRADES[grade].name} 1 ชิ้น ${price} ตำลึง`); return true;
  }
  function itemSalePrice(s, item) {
    const normalized = typeof item === 'object' ? normalizeItemGrade(item) : { value: 4 };
    return Math.max(1, Math.round(Number(normalized.value || 4) * .5 * economyPriceMultiplier(s)));
  }
  function sellItem(s, itemId) {
    if (!canSellItems(s)) return false;
    ensureInventory(s); ensureItemLoadout(s); const key = String(itemId);
    let treasureIndex = s.treasures.findIndex(item => item.inventoryUid === key);
    if (treasureIndex < 0) treasureIndex = s.treasures.findIndex(item => String(item.id || item.name) === key);
    if (treasureIndex >= 0) {
      const item = s.treasures.splice(treasureIndex, 1)[0]; const value = itemSalePrice(s, item);
      s.hero.money += value; Object.keys(s.itemLoadout || {}).forEach(slot => { if (s.itemLoadout[slot] === item.inventoryUid) s.itemLoadout[slot] = null; });
      addLog(`ขาย${typeof item === 'object' ? item.name : item} ได้ ${value} ตำลึง`); return true;
    }
    const consumableIndex = s.consumables.findIndex(item => String(item.inventoryUid) === key || String(item.id) === key);
    if (consumableIndex >= 0) {
      const item = s.consumables.splice(consumableIndex, 1)[0]; const value = itemSalePrice(s, item);
      s.hero.money += value; addLog(`ขาย${item.name} ได้ ${value} ตำลึง`); return true;
    }
    return sellMaterial(s, key, 1);
  }
  function ensureRelationshipState(s) {
    s.relationshipState = s.relationshipState || {};
    s.relations = s.relations || {};
    Object.keys(RELATIONSHIP_DEFS).forEach(id => {
      const def = RELATIONSHIP_DEFS[id];
      s.relations[id] = Number.isFinite(s.relations[id]) ? s.relations[id] : 0;
      s.relationshipState[id] = s.relationshipState[id] || { category: def.category, trait: def.trait, goal: `รักษาความสัมพันธ์กับ${def.name}`, status: 'ห่างเหิน', trust: 0, romance: 0, memories: [], lastTouched: s.month || 0 };
      s.relationshipState[id].category ||= def.category;
      s.relationshipState[id].trait ||= def.trait;
      s.relationshipState[id].goal ||= `รักษาความสัมพันธ์กับ${def.name}`;
      s.relationshipState[id].status ||= 'ห่างเหิน';
      s.relationshipState[id].trust = Number(s.relationshipState[id].trust || 0);
      s.relationshipState[id].memories = Array.isArray(s.relationshipState[id].memories) ? s.relationshipState[id].memories : [];
      s.relationshipState[id].romance = Number(s.relationshipState[id].romance || 0);
      s.relationshipState[id].lastTouched = Number.isFinite(s.relationshipState[id].lastTouched) ? s.relationshipState[id].lastTouched : (s.month || 0);
    });
    return s.relationshipState;
  }
  function relationshipCompatibility(s, id) {
    ensureAttributes(s); const def = RELATIONSHIP_DEFS[id];
    const paths = s.paths || {}, a = s.hero.attributes;
    const affinity = def?.affinity || 'charm';
    const attributeByAffinity = { duty: 'spirit', insight: 'intellect', freedom: 'charm', luck: 'luck' };
    const pathBonus = { spirit: paths.insight, body: paths.duty, charm: paths.compassion, freedom: paths.freedom, duty: paths.duty, insight: paths.insight, luck: paths.freedom }[affinity] || 0;
    const value = (a[attributeByAffinity[affinity] || affinity] || a.charm) + pathBonus * 2 + (id === 'parents' ? 8 : 0);
    return Math.max(0, Math.min(100, Math.round(value / 2)));
  }
  function advanceRelationships(s) {
    const memory = ensureRelationshipState(s);
    if (s.month % 12 !== 0) return;
    Object.keys(RELATIONSHIP_DEFS).forEach(id => {
      const last = memory[id].lastTouched || 0;
      if (s.month - last >= 12 && (s.relations[id] || 0) > 0) s.relations[id] = Math.max(0, s.relations[id] - 1);
      const score = Number(s.relations[id] || 0);
      const status = score >= 35 ? 'ไว้วางใจ' : score >= 12 ? 'ผูกพัน' : score > -10 ? 'รู้จักกัน' : score > -30 ? 'ระหองระแหง' : 'เป็นศัตรู';
      memory[id].status = status;
      memory[id].trust = clamp(Math.round(score * .8 + (s.month - last < 12 ? 8 : 0)), -100, 100);
      if (score >= 35 && memory[id].goal === `รักษาความสัมพันธ์กับ${RELATIONSHIP_DEFS[id].name}`) memory[id].goal = id === 'master' ? 'ถ่ายทอดคำสอนก่อนศึกใหญ่' : id === 'friend' || id === 'companion' ? 'รักษาสัญญาและช่วยเหลือกัน' : 'สร้างความผูกพันที่ยั่งยืน';
      if (score <= -20 && memory[id].goal !== 'ป้องกันไม่ให้ความขัดแย้งลุกลาม') memory[id].goal = 'ป้องกันไม่ให้ความขัดแย้งลุกลาม';
    });
  }
  function recordRelationshipChanges(s, before) {
    const memory = ensureRelationshipState(s);
    Object.keys(RELATIONSHIP_DEFS).forEach(id => {
      if ((s.relations[id] || 0) !== (before[id] || 0)) { memory[id].lastTouched = s.month; memory[id].memories.unshift({ month: s.month, delta: (s.relations[id] || 0) - (before[id] || 0) }); memory[id].memories = memory[id].memories.slice(0, 8); }
    });
  }
  function ensureQuestState(s) {
    s.quests = s.quests || { active: [], completed: [], failed: [], canceled: [], trackedId: null };
    s.quests.active = Array.isArray(s.quests.active) ? s.quests.active : [];
    s.quests.completed = Array.isArray(s.quests.completed) ? s.quests.completed : [];
    s.quests.failed = Array.isArray(s.quests.failed) ? s.quests.failed : [];
    s.quests.canceled = Array.isArray(s.quests.canceled) ? s.quests.canceled : [];
    s.quests.available = Array.isArray(s.quests.available) ? s.quests.available : [];
    s.quests.paused = Array.isArray(s.quests.paused) ? s.quests.paused : [];
    s.quests.history = Array.isArray(s.quests.history) ? s.quests.history : [];
    return s.quests;
  }
  function ensureAutoSchedule(s) {
    const defaultAct = (s.mode === 'free' && (s.hero?.ageMonths || 0) < 24) ? 'rest' : 'train';
    s.autoSchedule = Array.isArray(s.autoSchedule) && s.autoSchedule.length === 12 ? s.autoSchedule : Array(12).fill(defaultAct);
    s.autoSchedule = s.autoSchedule.map(activity => ACTIVITY[activity] && !(s.mode === 'story' && activity === 'free') ? activity : defaultAct);
    return s.autoSchedule;
  }
  const AUTO_FAMILY_RULES = {
    save: { name: 'ประหยัดเงิน' },
    health: { name: 'รักษาสุขภาพ' },
    education: { name: 'เน้นการศึกษา' },
    pay_debt: { name: 'ชำระหนี้' }
  };
  function ensureAutoFamilyRule(s) {
    s.autoFamilyRule = AUTO_FAMILY_RULES[s.autoFamilyRule] ? s.autoFamilyRule : 'save';
    return s.autoFamilyRule;
  }
  function setAutoFamilyRule(s, id) {
    if (!AUTO_FAMILY_RULES[id]) return false;
    s.autoFamilyRule = id; ensureFamilyState(s).autoRule = id; return true;
  }
  function ensureAutoFreeRule(s) {
    s.autoFreeRule = s.autoFreeRule && typeof s.autoFreeRule === 'object' ? s.autoFreeRule : { enabled: false, policy: 'safe' };
    s.autoFreeRule.enabled = s.autoFreeRule.enabled === true;
    s.autoFreeRule.policy = ['safe', 'balanced', 'risk'].includes(s.autoFreeRule.policy) ? s.autoFreeRule.policy : 'safe';
    return s.autoFreeRule;
  }
  function setAutoFreeRule(s, enabled, policy = 'safe') {
    const rule = ensureAutoFreeRule(s);
    rule.enabled = !!enabled;
    rule.policy = ['safe', 'balanced', 'risk'].includes(policy) ? policy : 'safe';
    return rule;
  }

  function freeLifeLocationWeight(s, preferred = []) {
    const current = s.locations?.current || 'roadside';
    if (preferred.includes(current)) return 1.8;
    if (current === 'roadside' || current === 'inn') return 1.15;
    return .82;
  }
  const AUTO_DOCTRINES = {
    survive: { name: 'ประคองลมหายใจ', schedule: ['rest', 'work', 'rest', 'study', 'work', 'rest', 'travel', 'rest', 'social', 'work', 'rest', 'free'] },
    seek_truth: { name: 'ตามรอยความจริง', schedule: ['explore', 'study', 'quest', 'work', 'study', 'rest', 'travel', 'explore', 'social', 'quest', 'study', 'rest'] },
    build_legacy: { name: 'วางรากฐาน', schedule: ['work', 'family', 'sect', 'craft', 'work', 'study', 'explore', 'family', 'quest', 'train', 'work', 'social'] },
    cultivate: { name: 'มุ่งฝึกตน', schedule: ['train', 'train', 'rest', 'study', 'train', 'explore', 'train', 'rest', 'craft', 'sect', 'work', 'train'] },
    route: { name: 'ตามเส้นทางชีวิต', schedule: ['rest', 'work', 'train', 'study', 'explore', 'rest', 'social', 'work', 'craft', 'travel', 'family', 'rest'] }
  };
  function setAutoDoctrine(s, id) {
    if (!AUTO_DOCTRINES[id]) return false;
    s.autoDoctrine = id;
    s.autoSchedule = id === 'route' ? [...routeAutoDoctrine(s).schedule] : [...AUTO_DOCTRINES[id].schedule];
    s.autoActivity = s.autoSchedule[s.month % 12]; return true;
  }
  function addAvailableQuests(s) {
    const quests = ensureQuestState(s);
    QUEST_DEFS.filter(def => s.month >= def.startMonth && (s.hero?.ageMonths || 0) >= (def.minAgeMonths || 0) && !quests.active.some(q => q.id === def.id) && !quests.available.includes(def.id) && !quests.completed.includes(def.id) && !quests.failed.includes(def.id) && !quests.canceled.includes(def.id))
      .slice(0, 3).forEach(def => quests.available.push(def.id));
    if (s.autoQuestRule !== 'pause') quests.available.slice(0, Math.max(0, 3 - quests.active.length)).forEach(id => acceptQuest(s, id));
  }
  function cancelQuest(s, id) {
    const quests = ensureQuestState(s), index = quests.active.findIndex(q => q.id === id);
    if (index < 0) return false;
    quests.active.splice(index, 1); quests.canceled.push(id);
    if (quests.trackedId === id) quests.trackedId = quests.active[0]?.id || null;
    addLog(`ยกเลิกเควส: ${QUEST_DEFS.find(def => def.id === id)?.title || id}`);
    return true;
  }
  function questDefinition(id) { return QUEST_DEFS.find(def => def.id === id) || null; }
  function questRequirements(s, def) {
    const req = def?.requirements?.all || [];
    return req.every(item => item.powerMin == null || (s.hero?.power || 0) >= item.powerMin)
      && req.every(item => !item.item || Number(s.materials?.[item.item.id] || 0) >= (item.item.min || 1))
      && req.every(item => !item.knowledge || !!s.flags?.[item.knowledge.key])
      && req.every(item => !item.locationIs || item.locationIs.includes(s.locations?.current));
  }
  function questRequirementReasons(s, def) {
    const req = def?.requirements?.all || [], reasons = [];
    req.forEach(item => {
      if (item.powerMin != null && (s.hero?.power || 0) < item.powerMin) reasons.push(`พลังอย่างน้อย ${item.powerMin}`);
      if (item.item && Number(s.materials?.[item.item.id] || 0) < (item.item.min || 1)) reasons.push(`ไอเทม ${item.item.id}`);
      if (item.knowledge && !s.flags?.[item.knowledge.key]) reasons.push(`ต้องมีเบาะแส ${item.knowledge.key}`);
      if (item.locationIs && !item.locationIs.includes(s.locations?.current)) reasons.push('สถานที่ไม่ตรงเงื่อนไข');
    });
    return reasons;
  }
  function acceptQuest(s, id) {
    const q = ensureQuestState(s), def = questDefinition(id);
    if (!def || q.active.length >= 3 || q.active.some(item => item.id === id) || !questRequirements(s, def)) return false;
    q.available = q.available.filter(item => item !== id); q.paused = q.paused.filter(item => item !== id);
    q.active.push({ id, acceptedMonth: s.month, deadlineMonth: s.month + def.duration, progress: 0, objectives: [{ id: 'main', text: def.text, complete: false }] });
    if (!q.trackedId) q.trackedId = id; addLog(`รับภารกิจ: ${def.title}`, true); return true;
  }
  function trackQuest(s, id) { const q = ensureQuestState(s); if (!q.active.some(item => item.id === id)) return false; q.trackedId = id; return true; }
  function pauseQuest(s, id) { const q = ensureQuestState(s); if (!q.active.some(item => item.id === id) || q.paused.includes(id)) return false; q.paused.push(id); return true; }
  function resumeQuest(s, id) { const q = ensureQuestState(s); if (!q.active.some(item => item.id === id) || !q.paused.includes(id)) return false; q.paused = q.paused.filter(item => item !== id); if (!q.trackedId) q.trackedId = id; return true; }
  function setAutoLearningRule(s, rule) {
    if (!LEARNING_AUTO_RULES[rule]) return false;
    ensureLearningState(s).autoRule = rule;
    return true;
  }
  function advanceQuests(s) {
    const quests = ensureQuestState(s);
    addAvailableQuests(s);
    for (const quest of [...quests.active]) {
      const def = QUEST_DEFS.find(item => item.id === quest.id);
      if (!def) continue;
      quest.progress = def.complete(s) ? 100 : Math.min(99, Math.round((s.month - quest.acceptedMonth) / Math.max(1, def.duration) * 100));
      if (s.month >= quest.deadlineMonth) {
        quests.active = quests.active.filter(item => item.id !== quest.id);
        quests.failed.push(quest.id); quests.history.push({ id: quest.id, status: 'failed', month: s.month });
        if (def.failure) applyEffects(s, def.failure);
        else { s.hero.reputation = Math.max(-100, (s.hero.reputation || 0) - 4); s.worldPressure.clanDecay = (s.worldPressure.clanDecay || 0) + 5; }
        if (def.oath && ensureOathState(s).active.includes(def.oath)) breakOath(s, def.oath, `ภารกิจ “${def.title}” ล้มเหลว`);
        if (quests.trackedId === quest.id) quests.trackedId = quests.active[0]?.id || null;
        addLog(`เควสหมดเวลา: ${def.title}`);
      } else if (def.complete(s)) {
        applyEffects(s, def.reward || []);
        quests.active = quests.active.filter(item => item.id !== quest.id);
        quests.completed.push(quest.id); quests.history.push({ id: quest.id, status: 'completed', month: s.month });
        if (quests.trackedId === quest.id) quests.trackedId = quests.active[0]?.id || null;
        addLog(`เควสสำเร็จ: ${def.title}`, true);
    }
  }
  }

  const EVENT_RARITIES = {
    normal: { id: 'normal', name: 'ธรรมดา', count: 30, perActivity: true, power: 0, weight: 1, color: '#a8aa9b' },
    uncommon: { id: 'uncommon', name: 'เหนือธรรมดา', count: 15, power: 2, weight: .55, color: '#53b86c' },
    extraordinary: { id: 'extraordinary', name: 'พิเศษ', count: 10, power: 4, weight: .25, color: '#4aa9e8' },
    epic: { id: 'epic', name: 'มหากาพย์', count: 5, power: 7, weight: .08, color: '#a96be0' },
    legendary: { id: 'legendary', name: 'ตำนาน', count: 3, power: 12, weight: .02, color: '#f08a32' }
  };
  const EVENT_RARITY_ORDER = Object.keys(EVENT_RARITIES);
  const AGE_PHASES = [
    { id: 'infant', max: 2, name: 'วัยทารก', tone: 'เสียงร้อง การดูแล และความทรงจำแรกเริ่ม', themes: ['เสียงหัวเราะครั้งแรก', 'มือที่คุ้นเคย', 'ไข้คืนฝนตก', 'เงาตะเกียงบนเพดาน'] },
    { id: 'young-child', max: 5, name: 'วัยเด็กเล็ก', tone: 'การเรียนรู้โลก ความผูกพัน และการปกป้อง', themes: ['ของเล่นไม้ชิ้นแรก', 'ฝนหน้าชายคา', 'เสียงเรียกจากประตู', 'ทางเดินที่ผู้ใหญ่ห้ามเข้า'] },
    { id: 'child', max: 12, name: 'วัยเด็ก', tone: 'การฝึกฝน มิตรภาพ และการเลือกเส้นทาง', themes: ['คู่แข่งในลานฝึก', 'คำสัญญาใต้ต้นสน', 'ครูผู้ไม่เปิดเผยชื่อ', 'แผนที่เส้นทางลับ'] },
    { id: 'youth', max: 18, name: 'วัยหนุ่มสาว', tone: 'ชื่อเสียง ความรัก และการพิสูจน์ตน', themes: ['จดหมายจากคนรักเก่า', 'ศึกประลองหน้าฝูงชน', 'คำเชิญจากสำนักใหญ่', 'รอยยิ้มของคนทรยศ'] },
    { id: 'builder', max: 30, name: 'วัยสร้างตัว', tone: 'อำนาจ หนี้บุญคุณ และการสร้างหลัก', themes: ['หนี้บุญคุณที่ถึงกำหนด', 'กิจการที่โตเร็วเกินไป', 'พันธมิตรขอแบ่งอำนาจ', 'ศัตรูยื่นข้อเสนอ'] },
    { id: 'middle', max: 50, name: 'วัยกลางคน', tone: 'มรดก ศัตรูเก่า และราคาของความสำเร็จ', themes: ['ศัตรูจากอดีตกลับมา', 'ลูกศิษย์ขอคำตัดสิน', 'ตำแหน่งที่ไม่มีใครอยากรับ', 'มรดกที่มีเลือดปน'] },
    { id: 'elder', max: Infinity, name: 'วัยชรา', tone: 'การส่งต่อ ความทรงจำ และบทสรุปของชีวิต', themes: ['ทายาทขอคำชี้แนะ', 'โรคภัยกับยาวิเศษ', 'ความทรงจำของผู้ตาย', 'คืนสุดท้ายใต้แสงจันทร์'] }
  ];

  function agePhase(ageYear) { return AGE_PHASES.find(phase => ageYear <= phase.max) || AGE_PHASES[AGE_PHASES.length - 1]; }
  function rarityLabel(rarity) { return EVENT_RARITIES[rarity === 'rare' ? 'extraordinary' : rarity]?.name || EVENT_RARITIES.normal.name; }
  function annualLifePhase(s) {
    ensureLifespanState(s);
    const ageMonths = Math.max(0, Number(s.hero?.ageMonths || 0));
    if (ageMonths < 24) return AGE_PHASES.find(phase => phase.id === 'infant');
    if (ageMonths < 60) return AGE_PHASES.find(phase => phase.id === 'young-child');
    if (ageMonths < 144) return AGE_PHASES.find(phase => phase.id === 'child');
    const lifespanMonths = Math.max(ageMonths + 1, Number(s.hero?.lifespanMonths || (Number(s.hero?.lifespan || 74) * 12)));
    const ratio = ageMonths / lifespanMonths;
    if (ratio < .35) return AGE_PHASES.find(phase => phase.id === 'youth');
    if (ratio < .6) return AGE_PHASES.find(phase => phase.id === 'builder');
    if (ratio < .8) return AGE_PHASES.find(phase => phase.id === 'middle');
    return AGE_PHASES.find(phase => phase.id === 'elder');
  }

  function annualActivityContext(s, activity) {
    const age = Math.max(0, Math.floor((s.hero?.ageMonths || 0) / 12));
    const phase = annualLifePhase(s);
    const infant = phase.id === 'infant';
    const young = phase.id === 'young-child';
    const noQiMethod = !s.hero?.cultivationAccess;
    const fragile = (s.hero?.health || 0) < (s.hero?.maxHealth || 100) * .4;
    const poor = (s.hero?.money || 0) < 3;
    const base = ACTIVITY_EVENT_FRAMES[activity] || { name: activity, good: 'ประสบการณ์', bad: 'ปัญหา' };
    const names = {
      train: infant ? 'ระหว่างเล่นและฝึกการเคลื่อนไหว' : young ? 'ระหว่างเล่นเลียนแบบท่วงท่า' : base.name,
      work: infant ? 'ขณะผู้ใหญ่จัดหาอาหารให้เจ้า' : young ? 'ระหว่างช่วยงานเล็ก ๆ ในเรือน' : base.name,
      explore: infant ? 'ระหว่างถูกอุ้มออกไปนอกเรือน' : young ? 'ระหว่างเดินตามผู้ใหญ่ไปสำรวจ' : base.name,
      rest: infant ? 'ระหว่างหลับในอ้อมแขน' : young ? 'ระหว่างพักใต้ชายคา' : base.name,
      study: infant ? 'ระหว่างฟังผู้ใหญ่เล่านิทาน' : young ? 'ระหว่างหัดจำตัวอักษร' : base.name,
      social: infant ? 'เมื่อมีคนมาเยี่ยมที่เรือน' : young ? 'ระหว่างทำความรู้จักผู้คนในหมู่บ้าน' : base.name,
      craft: infant ? 'ขณะผู้ใหญ่ทำของเล่นให้เจ้า' : young ? 'ระหว่างหัดใช้มือทำของง่าย ๆ' : base.name,
      family: infant ? 'ระหว่างคนในครอบครัวดูแลเจ้า' : young ? 'ระหว่างช่วยงานในเรือน' : base.name,
      quest: infant ? 'ขณะผู้ใหญ่พูดถึงภารกิจ' : young ? 'ระหว่างติดตามผู้ใหญ่ไปส่งข่าว' : base.name,
      sect: infant ? 'ขณะชื่อของสำนักถูกเอ่ยถึง' : young ? 'ระหว่างฟังเรื่องของสำนัก' : base.name,
      travel: infant ? 'ระหว่างถูกพาเดินทาง' : young ? 'ระหว่างเดินทางกับผู้คุ้มกัน' : base.name,
      free: infant ? 'ระหว่างวันธรรมดาในเรือน' : young ? 'ระหว่างเล่นตามใจตนเอง' : base.name
    }[activity] || base.name;
    const stateHints = [
      infant ? 'เจ้าจดจำโลกผ่านเสียง กลิ่น และอ้อมแขนของผู้ดูแล' : null,
      noQiMethod && activity === 'train' && age >= 3 ? 'เจ้ายังไม่มีวิชาหลอมกายหรือวิชาบำเพ็ญ จึงทำได้เพียงฝึกร่างกายและวินัย' : null,
      s.hero?.rootKnown ? null : (activity === 'study' || activity === 'train' ? 'รากวิญญาณของเจ้ายังเป็นความลับที่ไม่มีใครยืนยัน' : null),
      fragile ? 'ร่างกายที่อ่อนล้าทำให้เรื่องเล็กน้อยกลายเป็นภาระ' : null,
      poor && (activity === 'work' || activity === 'travel' || activity === 'craft') ? 'ถุงเงินของเจ้าเบาจนทุกการตัดสินใจต้องคิดให้รอบคอบ' : null,
      s.flags?.metSect ? 'ธงของสำนักเมฆาครามทำให้ผู้คนมองเจ้าแตกต่างจากเดิม' : null
    ].filter(Boolean);
    return { name: names, good: base.good, bad: base.bad, hint: stateHints[0] || '', stateHints };
  }

  // Normal annual events use five activity-specific scenes and six age signatures.
  // The combination produces thirty authored-feeling variants per activity without
  // copying the same paragraph across every age and status permutation.
  const ANNUAL_NORMAL_SCENES = {
    train: ['ลมหายใจของเจ้าขาดช่วงตรงจังหวะที่สาม', 'หยดเหงื่อตกลงบนพื้นลานฝึก', 'เสียงไม้กระทบกันดังจากเรือนข้าง ๆ', 'เจ้าลองทำตามท่าที่จำมาจากคนอื่น', 'เมื่อฟ้ามืด เจ้าจึงสังเกตว่าตนยังยืนอยู่ที่เดิม'],
    work: ['นายจ้างวางงานชิ้นหนึ่งลงตรงหน้า', 'คนในตลาดเรียกหาแรงงานเพิ่มก่อนตะวันตกดิน', 'ถุงเงินใบเล็กถูกวางไว้ข้างถ้วยชา', 'ลูกค้าคนหนึ่งเปลี่ยนคำพูดหลังเห็นผลงานของเจ้า', 'งานวันนี้ไม่ยาก แต่ใช้เวลานานกว่าที่คิด'],
    explore: ['รอยเท้าจาง ๆ หายเข้าไปใต้รากสน', 'กลิ่นดินชื้นพาเจ้าออกนอกทางเดิม', 'นกตัวหนึ่งบินขึ้นจากพุ่มไม้โดยไม่มีเสียงร้อง', 'บนก้อนหินมีรอยขีดที่ดูเหมือนสัญลักษณ์', 'เจ้าพบทางแยกที่แผนที่ไม่มีบันทึกไว้'],
    rest: ['ฝนตกกระทบชายคาอยู่เกือบทั้งคืน', 'กลิ่นสมุนไพรอ่อน ๆ ลอยอยู่ข้างหมอน', 'แสงเช้าค่อย ๆ เคลื่อนผ่านผ้าม่าน', 'เจ้าตื่นขึ้นก่อนเสียงระฆัง แต่ยังไม่อยากลุก', 'ห้องพักเงียบจนได้ยินเสียงลมหายใจของตนเอง'],
    study: ['หน้าตำราเล่มหนึ่งถูกเปิดค้างไว้', 'คนข้าง ๆ อ่านประโยคเดิมซ้ำสามครั้ง', 'หมึกบนกระดาษซึมเป็นวงคล้ายแผนที่', 'คำถามง่าย ๆ กลับไม่มีใครตอบได้', 'เจ้าจำเสียงของผู้สอนได้มากกว่าถ้อยคำในบทเรียน'],
    social: ['คนแปลกหน้าขยับที่นั่งให้เจ้า', 'ข่าวลือหนึ่งลอยผ่านโต๊ะน้ำชา', 'สหายเก่ามองเจ้าก่อนจะยิ้มบาง ๆ', 'เด็กคนหนึ่งวิ่งชนชายเสื้อของเจ้าแล้วรีบขอโทษ', 'บทสนทนาหยุดลงเมื่อมีคนเอ่ยชื่อที่คุ้นเคย'],
    craft: ['เศษไม้และเส้นลวดกองอยู่บนโต๊ะช่าง', 'กลิ่นเหล็กร้อนคลุ้งไปทั่วโรงงาน', 'วัตถุดิบชิ้นหนึ่งมีตำหนิเล็กกว่าที่คาด', 'มือของเจ้าทำงานซ้ำจนเกิดจังหวะของตัวเอง', 'ผลงานชิ้นหนึ่งยังไม่สมบูรณ์ แต่ก็พอใช้งานได้'],
    family: ['มื้ออาหารวันนี้มีที่นั่งเพิ่มขึ้นหนึ่งที่', 'คนในเรือนถกเถียงกันเรื่องค่าใช้จ่าย', 'เสื้อผ้าของใครบางคนถูกนำมาซ่อมตรงหน้าเจ้า', 'เสียงหัวเราะดังขึ้นจากลานด้านหลัง', 'เรื่องเล็กเรื่องหนึ่งทำให้ทั้งเรือนเงียบลง'],
    quest: ['ใบประกาศใบใหม่ถูกติดทับบนกระดาน', 'ผู้ส่งข่าวฝากคำถามไว้ก่อนจากไป', 'ร่องรอยของภารกิจยังไม่ชัดพอจะเรียกว่าความจริง', 'คนแปลกหน้ามองตราประจำตัวของเจ้าอยู่นาน', 'เส้นทางของงานหนึ่งตัดกับชีวิตประจำวันของเจ้า'],
    sect: ['ระฆังสำนักดังขึ้นก่อนเวลา', 'ศิษย์เวรนำบัญชีงานมาวางบนโต๊ะ', 'ข่าวจากเมืองชายแดนมาถึงศาลาในช่วงบ่าย', 'อาจารย์คนหนึ่งเดินผ่านโดยไม่หยุดทัก', 'ธงบนยอดหอคัมภีร์เปลี่ยนทิศตามลม'],
    travel: ['ขบวนของเจ้าออกจากประตูเมืองก่อนฟ้าสาง', 'คนร่วมทางชี้ให้ดูยอดเขาที่อยู่ไกลออกไป', 'ถนนช่วงหนึ่งเงียบกว่าที่ควรจะเป็น', 'เจ้าหยุดพักตรงหลักหินเก่าข้างทาง', 'เมืองถัดไปยังอยู่อีกไกล แต่เสบียงยังพอเหลือ'],
    free: ['วันทั้งวันไม่มีใครเรียกหาเจ้า', 'เจ้าปล่อยให้เท้าพาไปตามถนนที่คุ้นเคย', 'มีโอกาสเล็ก ๆ ผ่านเข้ามาโดยไม่เคาะประตู', 'เจ้ามองผู้คนใช้ชีวิตแล้วนึกถึงเส้นทางของตนเอง', 'ช่วงบ่ายผ่านไปโดยไม่มีเรื่องใดเร่งรัด']
  };
  const ANNUAL_NORMAL_PHASE_SCENES = {
    infant: ['แสงอ่อนตกลงบนผ้าห่มของเจ้า', 'เสียงคนคุ้นเคยดังอยู่ไม่ไกล', 'กลิ่นสะอาดจากผ้าที่เพิ่งเปลี่ยนลอยอยู่รอบตัว', 'มือของผู้ดูแลแตะหน้าผากเจ้าเบา ๆ', 'เสียงลมผ่านหน้าต่างกล่อมให้วันค่อย ๆ ผ่านไป'],
    'young-child': ['ผู้ใหญ่คนหนึ่งวางของชิ้นเล็กไว้ตรงหน้าเจ้า', 'เสียงฝีเท้าคุ้นเคยดังผ่านทางเดิน', 'แสงแดดพาดผ่านพื้นเรือนจนเกิดเงารูปประหลาด', 'เจ้าหยุดดูสิ่งหนึ่งนานกว่าปกติ', 'คนข้างกายเรียกชื่อเจ้าแล้วชี้ให้ดูสิ่งที่เกิดขึ้น'],
    child: ['เจ้าหยุดอยู่กับเรื่องหนึ่งนานกว่าที่ตั้งใจ', 'คนรอบตัวพูดถึงเรื่องนั้นด้วยน้ำเสียงต่างกัน', 'สิ่งเล็กน้อยตรงหน้าทำให้เจ้าต้องลองคิดเอง', 'เจ้าลองทำตามวิธีที่เคยเห็นมา', 'วันนั้นผ่านไปพร้อมคำถามที่ยังไม่มีคำตอบ']
  };
  const ANNUAL_NORMAL_THEMES = {
    rest: ['เสียงฝนข้างชายคา', 'กลิ่นสมุนไพรอ่อน ๆ', 'แสงแดดบนผ้าห่ม', 'ความเงียบของห้องพัก', 'ลมหายใจที่ค่อย ๆ สม่ำเสมอ'],
    train: ['จังหวะลมหายใจ', 'ท่าพื้นฐานที่ต้องทำซ้ำ', 'รอยช้ำเล็กน้อยจากการฝึก', 'คำแนะนำของผู้รู้', 'ความสม่ำเสมอของร่างกาย'],
    work: ['งานที่รับผิดชอบ', 'ค่าตอบแทนของวันนี้', 'เวลาพักระหว่างงาน', 'คำชมจากผู้ว่าจ้าง', 'ค่าใช้จ่ายที่รออยู่'],
    explore: ['ทางเดินที่ไม่คุ้นเคย', 'ร่องรอยของผู้คนที่ผ่านมา', 'กลิ่นดินหลังฝน', 'สิ่งของที่ถูกทิ้งไว้', 'ภูมิประเทศที่ค่อย ๆ เปลี่ยนไป'],
    study: ['ตัวอักษรหนึ่งบรรทัด', 'คำถามที่ยังตอบไม่ได้', 'เสียงอ่านของผู้สอน', 'ความรู้จากหนังสือเก่า', 'ข้อสังเกตเล็ก ๆ ในบทเรียน'],
    social: ['คำทักทายจากคนรู้จัก', 'บทสนทนาระหว่างมื้อชา', 'ข่าวคราวจากคนไกล', 'รอยยิ้มที่ตีความได้หลายแบบ', 'ความเงียบระหว่างคนสองคน'],
    craft: ['วัตถุดิบบนโต๊ะทำงาน', 'รอยตำหนิของชิ้นงาน', 'จังหวะของค้อนและเครื่องมือ', 'วิธีแก้ปัญหาเฉพาะหน้า', 'ผลงานที่ยังไม่สมบูรณ์'],
    family: ['มื้ออาหารในเรือน', 'เรื่องค่าใช้จ่ายของครอบครัว', 'งานที่ต้องแบ่งกันทำ', 'ข่าวจากญาติคนหนึ่ง', 'ความเงียบหลังการสนทนา'],
    quest: ['ข้อความที่ฝากมากับผู้ส่งข่าว', 'เงื่อนไขของงานหนึ่ง', 'เส้นตายที่ใกล้เข้ามา', 'ร่องรอยที่ยังตรวจสอบไม่ได้', 'ทางเลือกที่ต้องรอข้อมูลเพิ่ม'],
    sect: ['ระฆังประจำวันของสำนัก', 'งานที่ศิษย์เวรได้รับมอบหมาย', 'บทเรียนในศาลา', 'ข่าวจากพื้นที่ชายแดน', 'กฎระเบียบที่ต้องทำความเข้าใจ'],
    travel: ['เสบียงระหว่างทาง', 'หลักไมล์ข้างถนน', 'เมืองถัดไปบนเส้นทาง', 'สภาพอากาศระหว่างเดินทาง', 'คนร่วมทางที่เพิ่งรู้จัก'],
    free: ['ทางเลือกเล็ก ๆ ของวันนี้', 'ผู้คนที่เดินผ่านไป', 'สถานที่คุ้นเคยในยามต่างกัน', 'เวลาว่างที่ไม่มีใครกำหนด', 'ความคิดที่เกิดขึ้นระหว่างทาง']
  };
  const ANNUAL_NORMAL_THEME_EXPANSIONS = {
    rest: ['ความเย็นของพื้นห้อง', 'เสียงไม้ลั่นยามค่ำ', 'ผ้าปูที่ตากแดด', 'ชาร้อนข้างเตียง', 'ช่วงบ่ายที่ไม่มีนัดหมาย', 'เปลวไฟในเตาอุ่น', 'อากาศหลังฝนหยุด', 'ความง่วงระหว่างวัน', 'หน้าต่างที่เปิดรับลม', 'เวลาที่ได้อยู่ตามลำพัง'],
    train: ['การวางเท้าให้มั่นคง', 'ลมหายใจที่ยังไม่เข้าจังหวะ', 'คำเตือนเรื่องท่าทาง', 'พื้นลานที่เปียกฝน', 'เสียงฝีเท้าของศิษย์ร่วมลาน', 'การยืดกล้ามเนื้อก่อนเริ่ม', 'ความผิดพลาดที่ต้องแก้ซ้ำ', 'รอยฝุ่นบนชายเสื้อ', 'จังหวะที่ทำได้ดีขึ้น', 'การหยุดพักก่อนฝืนเกินไป'],
    work: ['งานที่ค้างจากเมื่อวาน', 'คำต่อรองเรื่องค่าแรง', 'อุปกรณ์ที่ต้องซ่อม', 'ลูกค้าที่กลับมาอีกครั้ง', 'เวลาที่หายไปกับงานจุกจิก', 'อาหารมื้อกลางวันของคนทำงาน', 'หัวหน้าที่จับตาดูอยู่', 'งานด่วนก่อนประตูเมืองปิด', 'เหรียญที่นับได้ในตอนเย็น', 'คำบอกเล่าจากเพื่อนร่วมงาน'],
    explore: ['หมอกบางบนทางเขา', 'สะพานไม้เก่า', 'รอยล้อบนดินนิ่ม', 'เสียงน้ำจากหุบเขา', 'ต้นไม้ที่ไม่เคยเห็นมาก่อน', 'กลิ่นควันจากที่ไกล', 'ก้อนหินที่มีสีผิดจากบริเวณรอบข้าง', 'รั้วเก่าริมทาง', 'รอยมีดบนเปลือกไม้', 'แสงสุดท้ายก่อนกลับถึงเมือง'],
    study: ['ถ้อยคำที่อ่านได้หลายความหมาย', 'รอยแก้ไขบนหน้ากระดาษ', 'คำศัพท์จากเมืองอื่น', 'แบบฝึกหัดที่ต้องทบทวน', 'เรื่องเล่าที่ไม่มีในตำรา', 'โต๊ะเรียนที่อยู่ริมหน้าต่าง', 'ความเงียบของห้องหนังสือ', 'บทสนทนาหลังเลิกเรียน', 'ชื่อผู้เขียนบนปกเก่า', 'ข้อผิดพลาดที่เพิ่งสังเกตเห็น'],
    social: ['ที่นั่งว่างข้างโต๊ะ', 'คำถามที่ยังไม่ได้ตอบ', 'ข่าวจากตลาดเช้า', 'การพยักหน้าทักทาย', 'ชื่อของคนที่ไม่คุ้นเคย', 'น้ำชาถ้วยที่สอง', 'เรื่องตลกที่เล่าซ้ำ', 'จดหมายจากสหายไกลบ้าน', 'คนที่ฟังมากกว่าพูด', 'คำลาใต้แสงโคม'],
    craft: ['ไม้ที่มีลายไม่เหมือนกัน', 'รอยต่อที่ยังไม่สนิท', 'น้ำมันบนปลายนิ้ว', 'แบบร่างที่ถูกขยำทิ้ง', 'เสียงตะไบขัดผิวโลหะ', 'เชือกที่ต้องผูกใหม่', 'การเลือกวัตถุดิบชิ้นสุดท้าย', 'ฝุ่นผงบนพื้นโรงงาน', 'ชิ้นส่วนที่หาแทนไม่ได้', 'งานที่เริ่มเห็นรูปทรง'],
    family: ['จานข้าวที่ถูกเลื่อนให้ใครบางคน', 'ผ้าที่ตากไว้หลังเรือน', 'บัญชีรายจ่ายของเดือนนี้', 'เสียงเรียกจากห้องข้าง ๆ', 'ของฝากจากญาติ', 'การแบ่งหน้าที่ในยามค่ำ', 'ที่ว่างข้างเตาไฟ', 'คำถามของคนในบ้าน', 'รอยยิ้มระหว่างมื้ออาหาร', 'เรื่องเก่าที่ถูกหยิบมาพูดอีกครั้ง'],
    quest: ['ตราประทับที่ยังอ่านไม่ออก', 'ชื่อสถานที่ในจดหมาย', 'ของกลางที่ต้องรักษาไว้', 'คำให้การของพยาน', 'ระยะทางที่คำนวณใหม่', 'ผู้ติดต่อที่ยังไม่ตอบกลับ', 'ร่องรอยบนพื้นดิน', 'ของรางวัลที่ยังไม่แน่นอน', 'เงื่อนไขที่เพิ่มขึ้นมา', 'เวลานัดหมายที่ต้องจำ'],
    sect: ['รายชื่อศิษย์ประจำวัน', 'งานเวรหน้าประตู', 'กฎข้อหนึ่งที่ผู้มาใหม่มักลืม', 'กลิ่นธูปในศาลา', 'คัมภีร์ที่ถูกส่งคืนช้า', 'ลานหินหลังฝนตก', 'เสียงเรียกจากหอระฆัง', 'อาหารในโรงครัวสำนัก', 'ตราศิษย์บนโต๊ะลงทะเบียน', 'คำสั่งสั้น ๆ จากศิษย์พี่'],
    travel: ['ฝุ่นบนชายเสื้อ', 'น้ำในกระบอกที่เหลือน้อยลง', 'เสียงม้าจากขบวนอื่น', 'ร้านน้ำชาริมทาง', 'แผนที่ที่ต้องพับใหม่', 'ด่านตรวจยามเย็น', 'กลิ่นอาหารจากเมืองถัดไป', 'ฝนที่ตั้งเค้ามาแต่ไกล', 'หลักหินบอกระยะทาง', 'แสงไฟจากบ้านหลังแรก'],
    free: ['เสียงตลาดยามเช้า', 'เงาของต้นไม้บนถนน', 'ร้านเล็กที่เพิ่งเปิด', 'เรื่องที่ได้ยินโดยบังเอิญ', 'เวลาว่างก่อนพลบค่ำ', 'ผู้คนที่ต่างมีธุระของตน', 'กลิ่นอาหารจากตรอกข้างบ้าน', 'จดหมายที่ยังไม่ได้เปิด', 'ทางแยกที่คุ้นเคย', 'ความคิดที่ยังไม่มีชื่อ']
  };
  Object.keys(ANNUAL_NORMAL_THEME_EXPANSIONS).forEach(activity => {
    ANNUAL_NORMAL_THEMES[activity].push(...ANNUAL_NORMAL_THEME_EXPANSIONS[activity]);
  });
  const ANNUAL_NORMAL_EARLY_THEMES = {
    infant: {
      rest: ['เสียงกล่อมเบา ๆ', 'ผ้าห่มอุ่น', 'แสงตะเกียงบนเพดาน', 'มือของผู้ดูแล', 'ช่วงหลับที่ยาวขึ้น'],
      train: ['การขยับมือและเท้า', 'การพลิกตัวครั้งแรก', 'เสียงหัวเราะระหว่างเล่น', 'ของเล่นที่เอื้อมถึง', 'แรงกอดของผู้ดูแล'],
      work: ['การเตรียมอาหาร', 'ผ้าที่เพิ่งเปลี่ยน', 'เสียงผู้ใหญ่จัดของ', 'เปลที่ถูกโยกเบา ๆ', 'คนในเรือนผลัดกันดูแล'],
      explore: ['แสงนอกหน้าต่าง', 'เสียงผู้คนหน้าบ้าน', 'ลมที่พัดเข้ามา', 'กลิ่นดินหลังฝน', 'ภาพของถนนจากอ้อมแขน'],
      study: ['เสียงเล่านิทาน', 'ภาพสีบนผ้า', 'จังหวะเพลงกล่อม', 'ชื่อที่ผู้ใหญ่เรียกซ้ำ', 'มือที่ชี้สิ่งต่าง ๆ ให้ดู'],
      social: ['เสียงคนมาเยี่ยม', 'รอยยิ้มของคนคุ้นหน้า', 'อ้อมแขนที่เปลี่ยนไป', 'เสียงหัวเราะข้างเปล', 'มือที่แตะปลายนิ้ว'],
      craft: ['ของเล่นผ้าชิ้นเล็ก', 'เสียงไม้กระทบกัน', 'กลิ่นไม้ใหม่', 'ของแขวนเหนือเปล', 'มือผู้ใหญ่ที่กำลังเย็บของ'],
      family: ['เสียงคนในเรือน', 'มื้ออาหารของผู้ใหญ่', 'ผ้าห่มจากคนในครอบครัว', 'เสียงเรียกชื่อเจ้า', 'การผลัดกันอุ้ม'],
      quest: ['คำพูดของผู้ใหญ่', 'ตราประทับบนจดหมาย', 'ของที่ถูกนำมาฝาก', 'เสียงเตรียมตัวออกเดินทาง', 'เรื่องที่ยังไกลเกินเข้าใจ'],
      sect: ['ชื่อสำนักในบทสนทนา', 'เสียงระฆังจากที่ไกล', 'ผ้าปักตราสัญลักษณ์', 'เรื่องเล่าของผู้ใหญ่', 'จดหมายที่วางบนโต๊ะ'],
      travel: ['อ้อมแขนระหว่างเดินทาง', 'เสียงล้อเกวียน', 'ผ้าคลุมกันลม', 'ทิวทัศน์จากหน้าต่าง', 'จุดพักระหว่างทาง'],
      free: ['แสงบนพื้นเรือน', 'เสียงฝนยามบ่าย', 'เงาคนที่เดินผ่าน', 'ของชิ้นเล็กใกล้มือ', 'ช่วงเวลาที่ไม่มีใครเร่งรัด']
    },
    'young-child': {
      rest: ['ฝนหน้าชายคา', 'กลิ่นยาต้มอ่อน ๆ', 'ผ้าห่มผืนโปรด', 'เสียงลมกลางคืน', 'แสงเช้าบนพื้นเรือน'],
      train: ['ท่าทางที่เลียนแบบผู้ใหญ่', 'การวิ่งจนหอบ', 'การทรงตัวบนพื้นไม้', 'ของเล่นที่ใช้ฝึกมือ', 'คำชมหลังลองอีกครั้ง'],
      work: ['งานเล็ก ๆ ในเรือน', 'การช่วยหยิบของ', 'ตะกร้าที่ต้องถือให้มั่น', 'คำขอบคุณจากผู้ใหญ่', 'เวลาพักหลังช่วยงาน'],
      explore: ['ทางเดินรอบบ้าน', 'ต้นไม้หลังเรือน', 'ของแปลกริมทาง', 'เสียงจากตลาด', 'รอยเท้าที่พบระหว่างเดิน'],
      study: ['ตัวอักษรบนกระดาน', 'นิทานก่อนนอน', 'คำถามที่อยากรู้', 'เสียงอ่านทีละคำ', 'ภาพในตำราเล่มแรก'],
      social: ['เพื่อนบ้านที่ทักทาย', 'เด็กคนหนึ่งชวนเล่น', 'ของว่างที่แบ่งกัน', 'คำถามจากคนแปลกหน้า', 'การกล่าวคำลา'],
      craft: ['ของเล่นไม้', 'เชือกที่ผูกไม่แน่น', 'ดินเหนียวก้อนหนึ่ง', 'เครื่องมือที่ผู้ใหญ่เฝ้าดู', 'ชิ้นงานที่ทำสำเร็จเอง'],
      family: ['งานบ้านที่แบ่งกัน', 'มื้ออาหารพร้อมหน้า', 'ญาติที่มาเยี่ยม', 'เรื่องเล่าของคนในบ้าน', 'คำเตือนก่อนออกไปเล่น'],
      quest: ['ข่าวสารจากผู้ใหญ่', 'ของที่ต้องนำไปส่ง', 'เส้นทางไปบ้านข้าง ๆ', 'คำถามระหว่างเดินทาง', 'งานเล็กที่ได้รับมอบหมาย'],
      sect: ['เรื่องเล่าจากสำนัก', 'ตราบนเสื้อของผู้ใหญ่', 'เสียงระฆังไกล ๆ', 'กฎที่เด็กต้องจำ', 'ชื่อคนที่เคยช่วยหมู่บ้าน'],
      travel: ['ถนนหน้าหมู่บ้าน', 'เกวียนของผู้คุ้มกัน', 'จุดพักริมทาง', 'ของกินระหว่างเดินทาง', 'เมืองที่เห็นจากระยะไกล'],
      free: ['เกมที่คิดขึ้นเอง', 'มุมหนึ่งหลังเรือน', 'เพื่อนร่วมเล่น', 'ของชิ้นหนึ่งที่อยากลอง', 'ช่วงบ่ายที่ไม่มีตาราง']
    }
  };
  const EARLY_THEME_EXPANSIONS = {
    infant: ['เสียงผ้าห่มขยับ', 'กลิ่นอาหารจากครัว', 'แสงแดดบนปลายนิ้ว', 'เสียงหัวเราะข้างเปล', 'อ้อมแขนที่คุ้นเคย', 'ลมเย็นจากหน้าต่าง', 'ผ้าเช็ดหน้าผืนเล็ก', 'จังหวะก้าวเท้าของผู้ดูแล', 'เงาต้นไม้บนผนัง', 'เสียงฝนยามค่ำ'],
    'young-child': ['ก้อนหินที่เก็บได้ระหว่างทาง', 'เสียงเรียกจากคนในบ้าน', 'ของว่างที่แบ่งให้กัน', 'รอยเปื้อนบนชายเสื้อ', 'เงาแดดบนพื้นไม้', 'คำเตือนก่อนออกไปเล่น', 'เสียงระฆังจากหมู่บ้าน', 'ของเล่นที่ยังทำไม่เสร็จ', 'เรื่องเล่าหลังมื้ออาหาร', 'ทางเดินรอบเรือน']
  };
  Object.entries(EARLY_THEME_EXPANSIONS).forEach(([phaseId, themes]) => {
    Object.keys(ANNUAL_NORMAL_EARLY_THEMES[phaseId]).forEach(activity => {
      ANNUAL_NORMAL_EARLY_THEMES[phaseId][activity].push(...themes);
    });
  });
  function annualNormalTheme(s, activity, phase, index, ageYear) {
    const early = ANNUAL_NORMAL_EARLY_THEMES[phase.id];
    const pool = early?.[activity] || ANNUAL_NORMAL_THEMES[activity] || ANNUAL_NORMAL_THEMES.free;
    return pool[(index + ageYear + activity.length) % pool.length];
  }
  const ANNUAL_NORMAL_SIGNATURES = {
    infant: ['เจ้ารับรู้โลกผ่านเสียง กลิ่น และอ้อมแขนของผู้ดูแล', 'เรื่องราวจบลงก่อนที่เจ้าจะมีคำเรียกให้มัน', 'ผู้ใหญ่จดจำวันนี้แทนเจ้า เพราะความทรงจำของเจ้ายังเริ่มต้นไม่เต็มที่', 'สิ่งสำคัญที่สุดของวันคือการมีใครสักคนอยู่ใกล้ ๆ', 'โลกยังใหญ่เกินกว่าจะเข้าใจ แต่ก็อ่อนโยนพอให้เจ้าหลับลง', 'ไม่มีชะตาใดเรียกหาเด็กทารก มีเพียงวันคืนที่ค่อย ๆ ผ่านไป'],
    'young-child': ['เจ้าค่อย ๆ รู้จักโลกจากสิ่งที่ได้ยิน ได้เห็น และได้ลองทำ', 'ผู้ใหญ่ช่วยตั้งชื่อให้เหตุการณ์ ก่อนเจ้าจะจำมันได้ด้วยตัวเอง', 'เรื่องเล็กน้อยนี้กลายเป็นส่วนหนึ่งของบ้านโดยไม่มีใครตั้งใจ', 'เจ้าถามคำถามหนึ่งแล้วหันไปสนใจสิ่งอื่นก่อนจะได้คำตอบ', 'วันนี้ยังไม่มีวีรกรรม มีเพียงความกล้าที่จะลองอีกครั้ง', 'โลกค่อย ๆ เปิดประตูให้เด็กคนหนึ่งมองออกไป'],
    child: ['เจ้าจดจำรายละเอียดนั้นไว้ แม้ยังไม่รู้ว่ามันจะสำคัญหรือไม่', 'วันธรรมดาเช่นนี้เองที่ค่อย ๆ สร้างนิสัยของคนคนหนึ่ง', 'ไม่มีใครยกย่องการตัดสินใจนี้ แต่เจ้ารู้ว่าตนได้เรียนรู้อะไรบางอย่าง', 'เรื่องราวผ่านไปโดยทิ้งเพียงคำถามเล็ก ๆ ไว้ในใจ', 'เจ้ากลับไปใช้ชีวิตต่อ พร้อมความทรงจำที่ยังไม่มีชื่อ', 'โลกยังคงเดินหน้า และเจ้าก็เดินไปพร้อมกับมัน'],
    youth: ['ความทรงจำนี้อาจถูกกลบด้วยเรื่องใหญ่ในภายหลัง แต่วันนี้มันยังเป็นของเจ้า', 'ไม่มีคำตอบสุดท้ายในช่วงวัยที่ทุกอย่างยังเปลี่ยนแปลงได้', 'เจ้าปล่อยให้เหตุการณ์ผ่านไปโดยไม่ยอมให้มันกำหนดตัวตนทั้งหมด', 'เรื่องหนึ่งจบลงอย่างเงียบ ๆ ก่อนเรื่องถัดไปจะเริ่มต้น', 'เจ้ามองย้อนกลับไปเพียงครู่เดียว แล้วเลือกเดินต่อ', 'บางครั้งการไม่ทำอะไรเลยก็เป็นการเลือกแบบหนึ่ง'],
    builder: ['สิ่งที่เกิดขึ้นวันนี้จะถูกชั่งด้วยเวลา เงิน และความรับผิดชอบในวันข้างหน้า', 'ไม่มีเรื่องใดเล็กเกินไปเมื่อชีวิตเริ่มมีคนอื่นผูกอยู่ด้วย', 'เจ้าจดจำต้นทุนของวันนี้ไว้ แม้ยังไม่มีใครเรียกมันว่าบทเรียน', 'เหตุการณ์จบลงโดยไม่เปลี่ยนแผนชีวิต แต่ทำให้เจ้าระวังขึ้นเล็กน้อย', 'เจ้ากลับไปหาสิ่งที่ต้องทำ เพราะชีวิตยังมีค่าใช้จ่ายรออยู่', 'โลกไม่ได้หยุดเพื่อความลังเลของเจ้า และนั่นก็เป็นเรื่องปกติ'],
    middle: ['เจ้ามองเหตุการณ์นี้ผ่านประสบการณ์ที่สะสมมานานกว่าคนรอบข้าง', 'เรื่องเล็กเช่นนี้ทำให้เจ้าคิดถึงราคาของสิ่งที่เคยเลือก', 'ไม่มีคำสัญญาใหม่เกิดขึ้น มีเพียงความเข้าใจเก่าที่ชัดขึ้น', 'เจ้าปล่อยให้คนรุ่นหลังเรียนรู้จากเรื่องนี้ด้วยตนเอง', 'วันหนึ่งที่เงียบสงบก็มีค่า เมื่อชีวิตผ่านศึกมามากพอ', 'สิ่งที่ผ่านไปแล้วไม่ย้อนกลับ แต่ยังทิ้งรอยไว้ในวิธีมองโลกของเจ้า'],
    elder: ['เจ้ามองมันด้วยสายตาของคนที่เห็นฤดูกาลเปลี่ยนมาหลายครั้ง', 'เรื่องนี้ไม่อาจเปลี่ยนชีวิตทั้งชีวิต แต่ก็ไม่จำเป็นต้องเปลี่ยน', 'เจ้าจดจำวันนี้ไว้เพื่อเล่าให้คนรุ่นหลังฟัง หากพวกเขายังอยากฟัง', 'ความเงียบหลังเหตุการณ์มีน้ำหนักพอ ๆ กับคำพูดมากมาย', 'เจ้าปล่อยให้ความทรงจำวางตัวลงอย่างสงบ ไม่ต้องเร่งสรุปความหมาย', 'วันธรรมดาวันหนึ่งผ่านไป และชีวิตยังคงเป็นของเจ้า']
  };
  // Short, complete scenes keep the monthly journal grounded in the character's age.
  const LIFE_JOURNAL_SCENES = {
  "infant": [
    "เจ้าสะดุ้งเมื่อได้ยินเสียงดัง ก่อนสงบลงเมื่อผู้ดูแลเข้ามาใกล้",
    "ผู้ดูแลร้องเพลงกล่อมผิดทำนอง เจ้าส่งเสียงตอบจนอีกฝ่ายหัวเราะ",
    "เจ้าจ้องแสงที่เคลื่อนอยู่บนผ้า แล้วพยายามเอื้อมมือไปแตะ",
    "เมื่อได้ยินเสียงคุ้นเคย เจ้าหันตามแม้มองไม่เห็นผู้พูด",
    "เจ้ากำปลายนิ้วผู้ดูแลแน่นจนอีกฝ่ายต้องค่อย ๆ แกะออก",
    "กลิ่นอาหารทำให้เจ้าหยุดร้องและหันไปตามเสียงช้อน",
    "ผู้ดูแลลองส่งของเล่นชิ้นเล็กให้ เจ้าจับมันไว้ได้ชั่วครู่ก่อนปล่อย",
    "เสียงลมทำให้เจ้าหยุดฟังอยู่พักหนึ่ง ก่อนหลับไปในอ้อมแขน",
    "เจ้าพยายามพลิกตัวเข้าหาเสียงเรียก ผู้ดูแลเฝ้ามองอยู่ใกล้ ๆ",
    "ผ้าที่เพิ่งเปลี่ยนทำให้เจ้าดิ้น ก่อนจะสงบลงเมื่อมีคนปลอบ",
    "ผู้ดูแลสังเกตว่าเจ้ามองตามการเคลื่อนไหวได้ไกลขึ้น",
    "เจ้าหัวเราะเมื่อผู้ดูแลทำเสียงแปลก ๆ แล้วรอให้อีกฝ่ายทำซ้ำ",
    "เจ้าจับชายผ้าไว้แน่นขณะถูกอุ้มผ่านผู้คน",
    "คนคุ้นเคยพูดชื่อเจ้าเบา ๆ และเจ้าส่งเสียงตอบราวกับกำลังสนทนา",
    "เมื่อรู้สึกหิว เจ้าร้องจนผู้ดูแลหยุดงานที่กำลังทำ",
    "เจ้าหลับระหว่างฟังเสียงผู้คนพูดคุยกันอย่างแผ่วเบา",
    "ผู้ดูแลแตะหน้าผากเจ้าเพื่อตรวจดูไข้ แล้วคอยเฝ้าอาการ",
    "เจ้ามองเงาของมือที่ขยับไปมาและพยายามเลียนแบบ",
    "เสียงหัวเราะของคนใกล้ตัวทำให้เจ้าหัวเราะตามโดยไม่รู้สาเหตุ",
    "ผู้ดูแลห่อผ้าให้กระชับขึ้นเมื่ออากาศเย็นลง",
    "เจ้างอแงเพราะง่วง แต่ยังพยายามลืมตามองคนรอบข้าง",
    "เจ้าทำของเล่นหล่นแล้วมองหามันจนผู้ดูแลเก็บให้",
    "เสียงระฆังจากที่ไกลทำให้เจ้าเงียบฟังอยู่ครู่หนึ่ง",
    "ผู้ดูแลสังเกตว่ามือของเจ้าเริ่มจับผ้าได้มั่นขึ้น",
    "เจ้าส่งเสียงอ้อแอ้เป็นจังหวะ ผู้ดูแลจึงตอบกลับด้วยเสียงเดียวกัน",
    "เจ้าร้องเมื่อถูกส่งให้อีกคนอุ้ม ก่อนค่อย ๆ สงบเมื่อได้ยินเสียงปลอบ",
    "ผู้ดูแลให้เจ้าลองจับช้อน แต่เจ้าสนใจเสียงที่เกิดเมื่อมันกระทบถ้วย",
    "เจ้าเผลอหลับขณะกำลังจ้องใบหน้าของคนคุ้นเคย",
    "ผู้ดูแลเล่านิทานสั้น ๆ แม้เจ้าจะยังไม่เข้าใจถ้อยคำ",
    "เจ้าขยับขาตามจังหวะเสียงที่ได้ยิน ทำให้คนใกล้ตัวต้องยิ้ม"
  ],
  "young-child": [
    "เจ้าถามคำถามเดิมหลายครั้งจนผู้ใหญ่ลองอธิบายด้วยวิธีใหม่",
    "เจ้าลองนับนิ้วแล้วหลงลำดับ ก่อนเริ่มนับใหม่ช้า ๆ",
    "คนคุ้นเคยสอนเจ้าผูกปม เชือกยังหลวมแต่เจ้าภูมิใจที่ทำเอง",
    "เจ้าพยายามเล่าเรื่องที่เพิ่งเห็น แต่ข้ามตอนสำคัญจนผู้ฟังต้องถาม",
    "ผู้ใหญ่ชวนเจ้าแยกใบไม้ตามรูปทรง เจ้าตั้งชื่อให้แต่ละใบเอง",
    "เจ้าทำของชิ้นเล็กตกและช่วยผู้ใหญ่ค้นหาจนพบ",
    "เจ้าฝึกออกเสียงคำใหม่ผิดหลายครั้ง แล้วหัวเราะเมื่อพูดได้",
    "เจ้าพยายามแบ่งอาหารให้เท่ากัน แต่ต้องขอให้ผู้ใหญ่ช่วยนับ",
    "ผู้ดูแลเล่านิทานแล้วถามตอนจบ เจ้าคิดเรื่องต่อด้วยตัวเอง",
    "เจ้าเห็นแมลงตัวเล็กและหยุดดูจนผู้ดูแลต้องเรียก",
    "เจ้าฝึกจับพู่กัน เส้นแรกคดเคี้ยวแต่เส้นต่อมาเริ่มตรงขึ้น",
    "เด็กอีกคนขอยืมของเล่น เจ้าลังเลก่อนยื่นให้ลองจับ",
    "เจ้าลองเดินตามรอยเท้าผู้ใหญ่ แต่ก้าวของเจ้าสั้นกว่ามาก",
    "ผู้ดูแลสอนให้เจ้าบอกเมื่อรู้สึกไม่สบาย แทนการเก็บไว้เงียบ ๆ",
    "เจ้าจำทำนองเพลงได้เพียงครึ่งเดียวและแต่งส่วนที่เหลือขึ้นเอง",
    "เจ้าช่วยพับผ้า แม้รอยพับจะไม่เสมอกัน",
    "เจ้าถามว่าทำไมเงาของตนจึงเปลี่ยนขนาดเมื่อขยับตัว",
    "เด็กอีกคนไม่ยอมเล่นตามกติกาของเจ้า ทั้งสองจึงตกลงกติกาใหม่",
    "เจ้าพบหินรูปร่างแปลกและเก็บไว้ให้ผู้ดูแลช่วยดู",
    "เจ้าพยายามรอคิว แต่เผลอขยับเข้าไปก่อนจนถูกเตือน",
    "ผู้ใหญ่สอนคำทักทาย เจ้าใช้มันกับคนคุ้นเคยอย่างตั้งใจ",
    "เจ้าทำเชือกพันกันและยอมให้ผู้ดูแลช่วยแก้ปม",
    "เจ้าจำเรื่องเล่าได้ผิดตอน คนฟังจึงช่วยต่อเรื่องให้ครบ",
    "เจ้าลองยืนขาเดียวและเสียหลัก ก่อนหัวเราะแล้วลองใหม่",
    "ผู้ดูแลให้เจ้าช่วยถือของเบา ๆ และเดินช้าลงเพื่อรอเจ้า",
    "เจ้าถามถึงชื่อสิ่งที่ไม่เคยเห็น ผู้ใหญ่ตอบเท่าที่รู้",
    "เจ้ากับเด็กอีกคนแลกกันเล่าว่าวันนี้พบอะไรน่าสนใจ",
    "เจ้าฝึกขอโทษหลังเผลอชนคนอื่น และอีกฝ่ายยอมรับคำขอโทษ",
    "เจ้าพยายามจำสีของสิ่งของหลายชิ้น แต่สลับชื่อสองสี",
    "ผู้ดูแลชวนเจ้าฟังเสียงรอบตัวแล้วบอกว่าแต่ละเสียงมาจากไหน"
  ],
  "child": [
    "เจ้าลองแก้ปัญหาด้วยตัวเอง ก่อนพบว่าเพื่อนมองเห็นอีกวิธีหนึ่ง",
    "เด็กคนหนึ่งขอให้เจ้ารักษาความลับ แต่เรื่องนั้นอาจทำให้คนอื่นเดือดร้อน",
    "เจ้าพยายามจำคำสอนที่ยาวเกินไป จึงแบ่งมันเป็นท่อนสั้น ๆ",
    "เจ้าช่วยเพื่อนค้นหาของที่หายและพบว่าต่างคนต่างจำตำแหน่งผิด",
    "ระหว่างฝึกความแม่นยำ เจ้าพบว่าการรีบร้อนทำให้พลาดบ่อยขึ้น",
    "คนรู้จักเล่าเรื่องเมืองไกล เจ้าวาดภาพสถานที่นั้นจากคำบอกเล่า",
    "เจ้ากับเพื่อนถกเถียงเรื่องกติกา ก่อนตกลงผลัดกันเลือก",
    "ผู้ใหญ่ขอให้เจ้าส่งข่าว เจ้าทวนข้อความก่อนรับคำ",
    "เจ้าสังเกตว่าคนที่ดูเงียบรู้คำตอบมากกว่าที่ใครคิด",
    "เจ้าทำงานชิ้นเล็กผิดพลาดและหาวิธีแก้ก่อนยอมรับความจริง",
    "เพื่อนชวนแข่งความจำ เจ้าจำชื่อได้มากกว่าแต่จำลำดับผิด",
    "เจ้าถามถึงเหตุผลของข้อห้ามและได้รับคำตอบที่ไม่เคยได้ยินมาก่อน",
    "เจ้าฝึกเคลื่อนไหวตามที่เห็น แต่ต้องปรับท่าให้เหมาะกับตัวเอง",
    "คนคุ้นเคยให้เจ้าเลือกของเพียงชิ้นเดียว เจ้าคิดอยู่นานก่อนตัดสินใจ",
    "เจ้าสังเกตเห็นคนหนึ่งถูกกันออกจากวงสนทนาและชวนเขาเข้ามา",
    "เพื่อนเล่าเรื่องน่ากลัว เจ้าพบภายหลังว่าบางส่วนถูกแต่งเติม",
    "เจ้าเรียนรู้การประมาณระยะหลังพยายามก้าวข้ามสิ่งกีดขวาง",
    "ผู้ใหญ่ขอความช่วยเหลือเล็กน้อย เจ้าถามวิธีทำก่อนลงมือ",
    "เจ้าเก็บคำพูดของคนอื่นมาคิดและพบว่าตนเข้าใจผิดไปส่วนหนึ่ง",
    "เด็กสองคนโต้เถียงกัน เจ้าช่วยให้แต่ละคนได้เล่าเรื่องของตน",
    "เจ้าเห็นรอยที่ไม่คุ้นเคยและถามผู้มีประสบการณ์ว่ามันเกิดจากอะไร",
    "เจ้าฝึกความอดทนด้วยการทำงานละเอียดที่ผิดพลาดง่าย",
    "เพื่อนบอกข่าวที่ฟังดูเหลือเชื่อ เจ้าจึงรอฟังจากอีกแหล่ง",
    "เจ้าลองสอนสิ่งที่เพิ่งเรียนรู้และพบว่าตนยังอธิบายไม่ชัด",
    "มีคนชมความพยายามของเจ้า แม้ผลลัพธ์ยังไม่สมบูรณ์",
    "เจ้าต้องเลือกว่าจะทำงานที่รับปากไว้ให้เสร็จก่อนเล่นหรือไม่",
    "ผู้ใหญ่ยอมรับว่าตนก็ไม่รู้คำตอบ ทำให้เจ้าประหลาดใจ",
    "เจ้าสังเกตว่าการพักสั้น ๆ ช่วยให้กลับไปทำสิ่งยากได้ดีขึ้น",
    "เพื่อนแบ่งของที่มีอยู่ให้ เจ้าเก็บความมีน้ำใจนั้นไว้ในใจ",
    "เจ้าจดจำเรื่องหนึ่งผิดและแก้ความเข้าใจเมื่อได้ฟังอีกครั้ง"
  ],
  "youth": [
    "สหายถามถึงอนาคต เจ้าตอบได้เพียงบางส่วนแต่เริ่มรู้สิ่งที่ต้องการ",
    "คนรุ่นเดียวกันเสนอให้เปรียบเทียบฝีมือ ทั้งสองได้เห็นจุดอ่อนของตน",
    "ข่าวจากคนรู้จักทำให้เจ้าทบทวนแผนที่เคยคิดไว้",
    "มีคนตีความคำพูดของเจ้าผิด เจ้าจึงอธิบายความตั้งใจอีกครั้ง",
    "เจ้าฟังผู้มีประสบการณ์สองคนให้คำแนะนำที่ขัดแย้งกัน",
    "สหายขอให้เจ้าช่วยตัดสินใจ แต่สุดท้ายเขาต้องเลือกด้วยตนเอง",
    "เจ้าพบว่าความสำเร็จเล็กน้อยทำให้คนรอบตัวคาดหวังมากขึ้น",
    "การฝึกครั้งหนึ่งไม่เป็นไปตามหวัง เจ้าจึงเปลี่ยนวิธีเตรียมตัว",
    "คนแปลกหน้ารู้จักเจ้าจากข่าวลือ เจ้าฟังอย่างสงสัยว่าเรื่องแพร่ไปอย่างไร",
    "เจ้ากับเพื่อนเห็นต่างกันแต่ยังนัดพบกันอีกในวันหน้า",
    "คำชมจากผู้รู้ทำให้เจ้าดีใจ แต่เขายังชี้ข้อบกพร่องที่ต้องแก้",
    "เจ้ารับปากช่วยงานและพบว่าการจัดเวลาไม่ง่ายอย่างที่คิด",
    "ข่าวความขัดแย้งจากที่ไกลทำให้ผู้คนถกเถียงกันด้วยข้อมูลไม่เท่ากัน",
    "เจ้าพบคนที่มีเป้าหมายคล้ายกันแต่เลือกเดินคนละทาง",
    "สหายเก่าส่งข่าวมา เจ้าคิดว่าจะตอบเรื่องใดก่อน",
    "เจ้าลองทำสิ่งที่เคยกลัวและพบว่าความยากต่างจากที่จินตนาการ",
    "คนรู้จักถามความเห็นเรื่องชื่อเสียง เจ้าคิดถึงราคาที่ต้องจ่ายเพื่อมัน",
    "เจ้ารู้สึกไม่พอใจคำวิจารณ์ ก่อนกลับมาพิจารณาส่วนที่เป็นจริง",
    "เจ้าช่วยคนหนึ่งทำเรื่องเล็กน้อยและได้ฟังเรื่องชีวิตของเขา",
    "การพบกันโดยบังเอิญทำให้เจ้ารู้ข่าวของคนที่ไม่ได้เจอมานาน",
    "เจ้าเห็นคู่แข่งช่วยผู้อื่นและต้องปรับความคิดที่เคยมีต่อเขา",
    "ผู้มีประสบการณ์เตือนให้เจ้ารู้จักขอความช่วยเหลือเมื่อจำเป็น",
    "เจ้าลองวางแผนระยะยาว แต่ยังมีหลายเรื่องที่คาดเดาไม่ได้",
    "บทสนทนาเรื่องความรักทำให้แต่ละคนเผยความหวังต่างกัน",
    "เจ้าจำคำสัญญาเก่าได้และสงสัยว่าอีกฝ่ายยังจำได้หรือไม่",
    "คนอายุน้อยกว่าถามเรื่องฝึกฝน เจ้าพบว่าการสอนยากกว่าการทำ",
    "เจ้ายอมรับว่าตนไม่รู้เรื่องหนึ่งและขอให้คนอื่นอธิบาย",
    "ข่าวโอกาสใหม่มาถึงพร้อมเงื่อนไขที่ยังไม่ชัดเจน",
    "เจ้าทบทวนการตัดสินใจที่ผ่านมาโดยไม่อาจรู้ผลของทางที่ไม่ได้เลือก",
    "สหายสังเกตว่าเจ้าเหนื่อยและชวนให้หยุดพักก่อนตัดสินใจ"
  ],
  "builder": [
    "เจ้าตรวจข้อตกลงเก่าและพบรายละเอียดที่ควรทำให้ชัดเจนขึ้น",
    "คนรู้จักขอคำแนะนำเรื่องงาน เจ้าฟังเงื่อนไขของเขาก่อนตอบ",
    "ราคาสินค้าที่ได้ยินเปลี่ยนไป ผู้คนอธิบายสาเหตุต่างกัน",
    "เจ้าพบว่าความรับผิดชอบใหม่ใช้เวลามากกว่าที่คิด",
    "ผู้ร่วมงานเตือนถึงปัญหาเล็ก ๆ ที่อาจสะสมเป็นเรื่องใหญ่",
    "ข่าวจากสหายเก่าทำให้เจ้าฝากคำตอบผ่านผู้เดินทาง",
    "เจ้าต้องจัดลำดับเรื่องเร่งด่วนสองเรื่องที่มาถึงพร้อมกัน",
    "คนอ่อนประสบการณ์ขอเรียนรู้ เจ้าชี้ข้อควรระวังให้ก่อน",
    "เจ้าฟังข้อเสนอที่ดูดี แต่ยังมีคำถามเรื่องต้นทุน",
    "ผู้คนถกเถียงกันเรื่องอำนาจในท้องถิ่นโดยไม่มีหลักฐานตรงกัน",
    "เจ้าจำคำสัญญาหนึ่งได้และตรวจดูว่ายังทำตามได้หรือไม่",
    "คนรู้จักยอมรับความผิดพลาด ทำให้การแก้ปัญหาเริ่มต้นได้",
    "เจ้าพบว่าคนสองฝ่ายเข้าใจข้อตกลงเดียวกันไม่เหมือนกัน",
    "ผู้มีประสบการณ์เตือนว่าการเติบโตเร็วอาจมาพร้อมภาระ",
    "เจ้าฟังข่าวจากหลายทางก่อนเชื่อเรื่องที่กระทบคนรู้จัก",
    "การทบทวนงานที่ผ่านมาเผยขั้นตอนที่ไม่จำเป็น",
    "คนรุ่นใหม่เสนอวิธีต่างจากที่เจ้าคุ้นเคย เจ้าฟังเหตุผลของเขา",
    "เจ้าช่วยไกล่เกลี่ยความเข้าใจผิดเล็กน้อยระหว่างคนรู้จัก",
    "มีผู้ขอแรงเจ้าในเวลาที่เจ้ามีเรื่องต้องทำอยู่แล้ว",
    "คำขอบคุณจากคนหนึ่งทำให้เจ้าจำเรื่องที่เกือบลืมไปแล้ว",
    "เจ้าคิดถึงความเสี่ยงที่ไม่ปรากฏในข้อเสนอแรก",
    "คนรู้จักเล่าความสำเร็จและต้นทุนที่คนอื่นมองไม่เห็น",
    "เจ้าทบทวนวิธีใช้เวลาเมื่อพบว่างานสำคัญถูกเลื่อนหลายครั้ง",
    "บทสนทนาเรื่องหนี้บุญคุณทำให้แต่ละคนเข้าใจหน้าที่ต่างกัน",
    "เจ้าตรวจข่าวลือก่อนส่งต่อเพื่อไม่ให้คนอื่นเข้าใจผิด",
    "คนร่วมทางคนหนึ่งแบ่งประสบการณ์ที่ช่วยให้เจ้ามองปัญหาใหม่",
    "เจ้าปฏิเสธคำขอที่เกินกำลังและอธิบายเหตุผลอย่างตรงไปตรงมา",
    "เจ้าได้พบคนที่เคยช่วยเหลือกันและแลกข่าวคราว",
    "การตัดสินใจของคนอื่นส่งผลต่อแผนของเจ้าโดยไม่คาดคิด",
    "เจ้าหยุดทบทวนเป้าหมายที่ตั้งไว้ก่อนจะรับภาระเพิ่ม"
  ],
  "middle": [
    "คนรุ่นหลังถามถึงเหตุการณ์เก่า เจ้าเล่าเท่าที่ตนได้เห็นจริง",
    "ข่าวของคนจากอดีตทำให้เจ้าคิดถึงครั้งแรกที่พบกัน",
    "เจ้าฟังวิธีแก้ปัญหาของคนอายุน้อยและเห็นข้อดีที่ตนมองข้าม",
    "งานที่เคยง่ายใช้เวลานานขึ้น เจ้าจึงปรับจังหวะของตน",
    "คนรู้จักเล่าว่าคำแนะนำเก่าของเจ้าช่วยเขาในเวลาที่ไม่คาดคิด",
    "เจ้าพบว่าความทรงจำของสองคนต่อเหตุการณ์เดียวกันต่างกัน",
    "ผู้มีประสบการณ์ใกล้เคียงกันแลกเปลี่ยนข่าวของสหายเก่า",
    "เจ้าพิจารณาว่าสิ่งใดควรสอนและสิ่งใดควรให้ผู้อื่นลองเอง",
    "เรื่องพิพาทเล็กน้อยเผยความไม่พอใจที่สะสมมานาน",
    "เจ้าจำคนหนึ่งจากชื่อไม่ได้จนเขาเล่าถึงครั้งที่เคยพบกัน",
    "ข่าวจากหลายแห่งมาถึงพร้อมกัน แต่เจ้ารอรายละเอียดก่อนสรุป",
    "คนรุ่นหลังตั้งคำถามต่อธรรมเนียมที่เจ้าคุ้นเคยมานาน",
    "เจ้าทบทวนคำสัญญาเก่าและนึกถึงคนที่เกี่ยวข้อง",
    "สหายเล่าเรื่องความผิดพลาดโดยไม่ซ่อนส่วนของตน",
    "เจ้าพบว่าการฟังเงียบ ๆ ช่วยให้อีกฝ่ายเล่าได้ครบกว่าเดิม",
    "คนรู้จักขอให้เจ้าตัดสินแทน เจ้าชวนเขาคิดถึงผลที่แต่ละทางมี",
    "เจ้าสังเกตว่าทักษะบางอย่างยังแม่นยำเพราะฝึกสม่ำเสมอ",
    "ความเห็นจากคนที่เคยขัดแย้งทำให้เจ้าต้องทบทวนข้อสรุปเก่า",
    "เจ้าจำคำสอนของผู้ล่วงลับได้ในเวลาที่เหมาะสม",
    "คนใกล้ตัวเตือนให้เจ้าพักเมื่อเห็นว่าเหนื่อยเกินไป",
    "เจ้าฟังข่าวของผู้ที่เดินคนละทางและยินดีที่เขาอยู่ได้ดี",
    "ข้อเสนอหนึ่งดูคล้ายเรื่องเก่า แต่รายละเอียดสำคัญต่างออกไป",
    "เจ้าพบว่าความเงียบระหว่างสหายไม่จำเป็นต้องเติมด้วยคำพูด",
    "คนอายุน้อยขอฟังเรื่องความพ่ายแพ้มากกว่าชัยชนะของเจ้า",
    "เจ้าตระหนักว่าชื่อที่เคยคุ้นเคยไม่เป็นที่รู้จักในหมู่คนรุ่นใหม่",
    "เรื่องเล็กน้อยทำให้เจ้านึกถึงผู้ที่เคยช่วยเหลือในอดีต",
    "เจ้าพบคนที่เห็นผลจากการตัดสินใจเก่าในมุมต่างออกไป",
    "สหายถามว่าเจ้าจะเลือกเหมือนเดิมหรือไม่หากย้อนเวลาได้",
    "เจ้าสังเกตว่าบางปัญหาต้องใช้ความอดทนมากกว่ากำลัง",
    "ข่าวดีของคนรู้จักทำให้เจ้าอยากส่งคำยินดีไปถึงเขา"
  ],
  "elder": [
    "เด็กคนหนึ่งขอให้เจ้าเล่าเรื่องเก่าและถามถึงรายละเอียดที่เจ้าคาดไม่ถึง",
    "เจ้าพบของชิ้นหนึ่งที่ทำให้นึกถึงคนเคยมอบให้",
    "อากาศเปลี่ยนทำให้เจ้าขยับช้าลงและปรับเวลาพัก",
    "คนรุ่นหลังถกเถียงเรื่องในอดีต เจ้ารอฟังจนจบก่อนเล่าสิ่งที่รู้",
    "สหายเก่าส่งข่าวมา เจ้าตอบกลับด้วยความทรงจำสั้น ๆ",
    "ผู้ฝึกคนหนึ่งขอคำแนะนำ เจ้าแบ่งปันพื้นฐานแล้วให้เขาหาวิธีของตน",
    "เจ้าจำชื่อคนในเรื่องเล่าไม่ได้ทันที ก่อนนึกออกภายหลัง",
    "คนรู้จักเล่าความสำเร็จของลูกหลานด้วยน้ำเสียงภาคภูมิใจ",
    "เจ้าฟังเพลงเก่าที่มีบางท่อนต่างจากที่ตนเคยจำ",
    "ผู้คนถามถึงยุคก่อน เจ้าบอกว่าคนในเวลานั้นก็ไม่ได้เห็นตรงกันทั้งหมด",
    "เจ้าส่งต่อวิธีดูแลของชิ้นเล็กให้คนที่สนใจ",
    "การเคลื่อนไหวที่เคยคล่องต้องอาศัยเวลาและความระมัดระวังมากขึ้น",
    "คนหนุ่มสาวหัวเราะกับเรื่องที่เจ้าคิดว่าธรรมดา",
    "ข่าวของสหายห่างไกลทำให้เจ้าหยุดนึกถึงวันเวลาร่วมกัน",
    "เจ้าสอนให้คนหนึ่งสังเกตรายละเอียดก่อนรีบลงมือ",
    "คำถามของเด็กทำให้เจ้ามองเรื่องคุ้นเคยในมุมใหม่",
    "เจ้าพบว่าความทรงจำบางอย่างชัดเจนกว่าสิ่งที่เกิดเมื่อไม่นาน",
    "คนรู้จักขอความเห็น เจ้าตอบโดยยอมรับว่าสถานการณ์เปลี่ยนไปแล้ว",
    "เจ้าได้ยินชื่อสถานที่เก่าและนึกถึงผู้คนที่เคยอยู่ที่นั่น",
    "ผู้ฝึกเล่าให้ฟังถึงความก้าวหน้าหลังนำคำแนะนำไปทดลอง",
    "เจ้าพักฟังเสียงรอบตัวโดยไม่เร่งให้วันผ่านไป",
    "สหายเล่าเรื่องเดิมอีกครั้ง แต่เพิ่มรายละเอียดที่เจ้าไม่เคยรู้",
    "คนรุ่นหลังเสนอวิธีใหม่ เจ้าขอให้เขาอธิบายขั้นตอน",
    "เจ้าทบทวนเรื่องที่ยังอยากบอกคนสำคัญเมื่อมีโอกาส",
    "ผู้มาเยือนถามถึงชื่อคนในอดีต เจ้าช่วยนึกเท่าที่จำได้",
    "เจ้าพบว่าการขอแรงผู้อื่นช่วยให้งานบางอย่างปลอดภัยขึ้น",
    "คนอายุน้อยถามถึงความกลัว เจ้าตอบว่าความกล้าไม่ได้ทำให้มันหายไป",
    "เจ้าฟังข่าวจากที่ไกลและสงสัยว่าสถานที่นั้นเปลี่ยนไปเพียงใด",
    "ความทรงจำของสหายช่วยเติมช่องว่างในเรื่องที่เจ้าเล่า",
    "เจ้าชื่นชมความพยายามของคนรุ่นหลัง แม้ผลยังไม่สมบูรณ์"
  ]
};

  const LIFE_JOURNAL_CONTEXT = [
    { id: 'train', activities: ['train'], text: 'ระหว่างฝึก เจ้าลองปรับจังหวะการเคลื่อนไหวให้มั่นคงขึ้นทีละน้อย' },
    { id: 'work', activities: ['work'], text: 'ระหว่างทำงาน เจ้าแบ่งหน้าที่ออกเป็นขั้นตอนและค่อย ๆ ตรวจความเรียบร้อย' },
    { id: 'explore', activities: ['explore'], text: 'ระหว่างสำรวจ เจ้าสังเกตเส้นทางขากลับก่อนเดินต่อ' },
    { id: 'study', activities: ['study'], text: 'ระหว่างเรียนรู้ เจ้าทบทวนเรื่องที่ยังไม่เข้าใจและจดคำถามไว้' },
    { id: 'craft', activities: ['craft'], text: 'ระหว่างทำชิ้นงาน เจ้าทดลองปรับวิธีจับเครื่องมือให้ถนัดขึ้น' },
    { id: 'travel', activities: ['travel'], text: 'ระหว่างเดินทาง เจ้าตรวจสิ่งของติดตัวและประเมินระยะทางที่เหลือ' },
    { id: 'rest-road', activities: ['rest'], locations: ['roadside'], text: 'ที่พักชั่วคราวเปิดรับลม เจ้าจัดสิ่งของไว้ใกล้ตัวก่อนพัก' },
    { id: 'rest-cave', activities: ['rest'], locations: ['hidden_cave'], text: 'ในถ้ำหลบภัย เสียงน้ำหยดดังเป็นระยะขณะที่เจ้าพักรักษาแรง' },
    { id: 'rest-inn', activities: ['rest'], locations: ['inn'], text: 'เสียงผู้เดินทางจากโรงเตี๊ยมค่อย ๆ เบาลงเมื่อเจ้าหยุดพัก' },
    { id: 'rest-sect', activities: ['rest'], locations: ['sect'], text: 'ระหว่างพักในเขตสำนัก เจ้าได้ยินเสียงระฆังแจ้งเวลาอยู่ไกล ๆ' },
    { id: 'study-archive', activities: ['study'], locations: ['sect_archive'], text: 'ในหอคัมภีร์ เจ้าตรวจชื่อผู้เขียนก่อนเปิดอ่านบันทึกเก่า' }
  ];

  function selectLifeJournalScene(s, phase) {
    const scenes = LIFE_JOURNAL_SCENES[phase.id] || LIFE_JOURNAL_SCENES.child;
    s.lifeJournalSeen = s.lifeJournalSeen && typeof s.lifeJournalSeen === 'object' ? s.lifeJournalSeen : {};
    const seen = Array.isArray(s.lifeJournalSeen[phase.id]) ? s.lifeJournalSeen[phase.id] : [];
    const generic = scenes.map((text, index) => ({ id: `general-${index}`, text }));
    const location = s.activity === 'rest' ? restLocationKey(s) : s.activity === 'study' ? learningLocationKey(s) : s.locations?.current;
    const contextual = phase.id === 'infant' || phase.id === 'young-child' ? [] : LIFE_JOURNAL_CONTEXT.filter(scene =>
      scene.activities.includes(s.activity) && (!scene.locations || scene.locations.includes(location))
    );
    let available = [...contextual, ...generic].filter(scene => !seen.includes(scene.id));
    if (!available.length) {
      // The authored pool is finite. Start a new cycle only after every currently
      // eligible scene has appeared; avoid repeating the last scene at the boundary.
      const last = seen[seen.length - 1];
      seen.length = 0;
      available = [...contextual, ...generic].filter(scene => scene.id !== last);
    }
    const unusedContext = available.filter(scene => contextual.includes(scene));
    const pool = unusedContext.length && Math.random() < .45 ? unusedContext : available.filter(scene => !contextual.includes(scene));
    const choices = pool.length ? pool : available;
    const selected = choices[Math.floor(Math.random() * choices.length)];
    seen.push(selected.id);
    s.lifeJournalSeen[phase.id] = seen;
    return selected.text;
  }

  function annualNormalNarrative(s, activity, theme, ageYear, index) {
    const phase = annualLifePhase(s), context = annualActivityContext(s, activity);
    const phaseScenes = ANNUAL_NORMAL_PHASE_SCENES[phase.id];
    const scenes = phaseScenes || ANNUAL_NORMAL_SCENES[activity] || ANNUAL_NORMAL_SCENES.free;
    const signatures = ANNUAL_NORMAL_SIGNATURES[phase.id] || ANNUAL_NORMAL_SIGNATURES.child;
    const scene = scenes[(index + ageYear) % scenes.length].replace(/\.$/, '');
    const signature = signatures[(index * 2 + ageYear + activity.length) % signatures.length];
    const hint = context.hint && context.hint !== signature ? context.hint : '';
    const templates = [
      `${context.name} ${scene} “${theme}” เป็นเพียงรายละเอียดเล็ก ๆ ที่ผ่านเข้ามา${hint ? ` ${hint}` : ''} ${signature}`,
      `วันหนึ่งระหว่าง${context.name} ${scene} แล้ววันนั้นก็ผ่านไปพร้อมกับ “${theme}”${hint ? ` ${hint}` : ''} ${signature}`,
      `ในช่วงที่${context.name} ${scene} สิ่งที่ติดอยู่ในวันนั้นมีเพียง “${theme}”${hint ? ` ${hint}` : ''} ${signature}`,
      `${scene} ระหว่าง${context.name} ท่ามกลางรายละเอียดนั้นมี “${theme}” อยู่ด้วย${hint ? ` ${hint}` : ''} ${signature}`,
      `ไม่มีเหตุการณ์ใดเร่งรัดวันนั้น ขณะที่${context.name} ${scene} และ “${theme}” ก็ผ่านเข้ามาอย่างเงียบงัน${hint ? ` ${hint}` : ''} ${signature}`,
      `วันธรรมดาค่อย ๆ เคลื่อนผ่านไป ระหว่าง${context.name} ${scene} ก่อนจะเหลือเพียง “${theme}” เป็นร่องรอยเล็ก ๆ${hint ? ` ${hint}` : ''} ${signature}`,
      `เมื่อ${context.name} ${scene} เจ้าพบว่า “${theme}” ไม่จำเป็นต้องกลายเป็นเรื่องใหญ่${hint ? ` ${hint}` : ''} ${signature}`,
      `ช่วงเวลานั้นเริ่มต้นอย่างเรียบง่าย: ${context.name} ${scene} แล้ว “${theme}” ก็เข้ามาเป็นส่วนหนึ่งของวัน${hint ? ` ${hint}` : ''} ${signature}`,
      `แสงและเสียงรอบตัวเปลี่ยนไปช้า ๆ ระหว่าง${context.name} ${scene} โดยมี “${theme}” อยู่ในรายละเอียดนั้น${hint ? ` ${hint}` : ''} ${signature}`,
      `ไม่มีใครหยุดวันไว้เพื่อเรื่องนี้ ระหว่าง${context.name} ${scene} “${theme}” จึงเป็นเพียงสิ่งหนึ่งที่เกิดขึ้น${hint ? ` ${hint}` : ''} ${signature}`,
      `วันนั้นไม่มีคำทำนายหรือสัญญาณพิเศษ มีเพียงช่วงเวลาหนึ่ง: ${context.name} ${scene} และ “${theme}” ที่ผ่านเข้ามา${hint ? ` ${hint}` : ''} ${signature}`,
      `จากช่วงเวลานั้น ${context.name} ${scene} รายละเอียดที่พอจะจดจำได้คือ “${theme}”${hint ? ` ${hint}` : ''} ${signature}`,
      `ยามที่ผู้คนยังดำเนินชีวิตตามปกติ ระหว่าง${context.name} ${scene} “${theme}” ก็ปรากฏขึ้นโดยไม่มีใครตั้งใจ${hint ? ` ${hint}` : ''} ${signature}`,
      `วันนั้นเริ่มต้นเหมือนวันอื่น ๆ ระหว่าง${context.name} ${scene} ก่อน “${theme}” จะผ่านไปพร้อมกับเวลา${hint ? ` ${hint}` : ''} ${signature}`,
      `ในห้วงเวลาสั้น ๆ ของวัน ระหว่าง${context.name} ${scene} “${theme}” ทำให้ช่วงเวลานั้นมีรูปร่างขึ้นมาเล็กน้อย${hint ? ` ${hint}` : ''} ${signature}`,
      `เมื่อกิจวัตรดำเนินต่อไป ระหว่าง${context.name} ${scene} เจ้าก็พบ “${theme}” อยู่ท่ามกลางความธรรมดา${hint ? ` ${hint}` : ''} ${signature}`,
      `วันนั้นไม่ได้นำคำตอบใดมาให้ ระหว่าง${context.name} ${scene} มีเพียง “${theme}” ที่ผ่านเข้ามาแล้วเลือนหาย${hint ? ` ${hint}` : ''} ${signature}`,
      `ก่อนที่วันจะจบลง ระหว่าง${context.name} ${scene} “${theme}” กลายเป็นรายละเอียดหนึ่งของชีวิต${hint ? ` ${hint}` : ''} ${signature}`,
      `ผู้คนรอบข้างยังทำสิ่งเดิมของตน ระหว่าง${context.name} ${scene} และ “${theme}” ก็ไม่ได้เปลี่ยนความเป็นไปของวันนั้น${hint ? ` ${hint}` : ''} ${signature}`,
      `ในวันที่ไม่มีใครคาดหวังสิ่งพิเศษ ระหว่าง${context.name} ${scene} เจ้าพบ “${theme}” อย่างเรียบง่าย${hint ? ` ${hint}` : ''} ${signature}`,
      `ความเปลี่ยนแปลงเล็กน้อยเกิดขึ้นระหว่าง${context.name} ${scene} โดยมี “${theme}” เป็นเพียงส่วนหนึ่งของเรื่องราว${hint ? ` ${hint}` : ''} ${signature}`,
      `วันนั้นไหลไปตามจังหวะเดิม ระหว่าง${context.name} ${scene} “${theme}” จึงไม่มีความหมายเกินกว่าที่เจ้าจะมอบให้${hint ? ` ${hint}` : ''} ${signature}`,
      `ระหว่าง${context.name} ${scene} เจ้าผ่าน “${theme}” ไปโดยไม่ต้องตัดสินใจครั้งใหญ่${hint ? ` ${hint}` : ''} ${signature}`,
      `แม้ไม่มีสิ่งใดโดดเด่นเป็นพิเศษ ระหว่าง${context.name} ${scene} “${theme}” ก็ยังเป็นส่วนหนึ่งของวันนั้น${hint ? ` ${hint}` : ''} ${signature}`,
      `วันหนึ่งผ่านไปอย่างสงบ ระหว่าง${context.name} ${scene} และ “${theme}” ก็ถูกทิ้งไว้ในความทรงจำเพียงเล็กน้อย${hint ? ` ${hint}` : ''} ${signature}`,
      `เมื่อมองจากระยะไกล ระหว่าง${context.name} ${scene} “${theme}” ดูเป็นเพียงเรื่องธรรมดาเรื่องหนึ่ง${hint ? ` ${hint}` : ''} ${signature}`,
      `ในเวลาที่ไม่มีใครกำลังเฝ้ามอง ระหว่าง${context.name} ${scene} “${theme}” ก็เกิดขึ้นโดยไม่ส่งเสียงดัง${hint ? ` ${hint}` : ''} ${signature}`,
      `วันนั้นไม่มีผู้ชนะหรือผู้แพ้ ระหว่าง${context.name} ${scene} มีเพียง “${theme}” ที่ผ่านเข้ามาตามธรรมดา${hint ? ` ${hint}` : ''} ${signature}`,
      `ทุกอย่างเริ่มจากช่วงเวลาธรรมดา ระหว่าง${context.name} ${scene} ก่อน “${theme}” จะกลายเป็นภาพหนึ่งของวัน${hint ? ` ${hint}` : ''} ${signature}`,
      `เมื่อวันค่อย ๆ เคลื่อนเข้าสู่ความเงียบ ระหว่าง${context.name} ${scene} “${theme}” ก็เหลืออยู่เป็นรายละเอียดสุดท้าย${hint ? ` ${hint}` : ''} ${signature}`
    ];
    const during = /^(ระหว่าง|ขณะ|เมื่อ|ใน)/.test(context.name) ? context.name : `ระหว่าง${context.name}`;
    const renderedTemplates = templates.map(template => template
      .replaceAll(`“${theme}”`, theme)
      .replaceAll(context.name, during)
      .replaceAll(`ระหว่าง${during}`, during)
      .replaceAll(`ในช่วงที่${during}`, during)
      .replaceAll(`เมื่อ${during}`, during)
      .replaceAll(`ช่วงที่${during}`, during));
    return renderedTemplates[index % renderedTemplates.length];
  }

  const ANNUAL_RARE_SCENES = {
    train: ['ระหว่างฝึกตน เจ้าพบว่าลมหายใจของตนสอดคล้องกับจังหวะของคนแปลกหน้าที่อยู่อีกฟากลาน', 'รอยอักขระบนพื้นลานฝึกสว่างขึ้นทุกครั้งที่เจ้าก้าวผ่าน', 'เสียงกระบี่จากหอฝึกหยุดลงพร้อมกัน ราวกับมีบางสิ่งกำลังรอผู้กล้าเข้าไปค้นหา', 'ลมปราณสายหนึ่งไหลผ่านร่างเจ้าโดยไม่มีผู้ใดเป็นคนชักนำ'],
    work: ['นายจ้างยื่นงานที่จ่ายสูงกว่าปกติ แต่ไม่ยอมบอกว่าผู้ว่าจ้างตัวจริงคือใคร', 'ตราประทับบนบัญชีงานเปลี่ยนสีต่อหน้าต่อตาเจ้า', 'คนจากเมืองหลวงมาขอให้เจ้ารับผิดแทนผู้มีอำนาจ', 'หีบค่าจ้างถูกวางลงตรงหน้า พร้อมคำขอที่อาจเปลี่ยนชื่อของเจ้าไปตลอดชีวิต'],
    explore: ['ในทางแยกที่ไม่ปรากฏบนแผนที่ เจ้าพบรอยเลือดใหม่ใต้ต้นสน', 'หมอกเปิดทางให้เห็นหอคอยเก่าซึ่งไม่มีอยู่ในบันทึกของเมือง', 'เสียงเรียกจากหุบเขาตอบกลับเสียงของเจ้า แม้ไม่มีใครอยู่ตรงนั้น', 'แสงสีทองพุ่งขึ้นจากพื้นดินราวกับสมบัติกำลังเรียกหาผู้พบเห็น'],
    rest: ['ยามค่ำ มีเสียงเคาะประตูสามครั้ง แต่เมื่อเปิดออกกลับไม่พบผู้ใด', 'เปลวไฟในตะเกียงเปลี่ยนเป็นสีฟ้าและส่องให้เห็นรอยเท้าบนพื้นห้อง', 'ผู้รักษาไข้บอกว่าอาการของเจ้าคล้ายคนที่ถูกบางสิ่งจากภายนอกแตะต้อง', 'ในห้วงหลับ เจ้าฝันถึงสถานที่ที่ไม่เคยไปและตื่นขึ้นพร้อมกลิ่นธูปแปลกถิ่น'],
    study: ['หน้าตำราเล่มเก่าปรากฏตัวอักษรเพิ่มขึ้นหลังเจ้าหยดน้ำลงบนหมึก', 'อาจารย์ปิดประตูห้องเรียนและเอ่ยชื่อวิชาที่ไม่เคยสอนแก่ศิษย์ทั่วไป', 'คำตอบในตำราขัดแย้งกับบันทึกของสำนัก และทั้งสองฝ่ายต่างมีหลักฐานของตน', 'เศษคัมภีร์ชิ้นหนึ่งเผยชื่อผู้เขียนซึ่งควรถูกลบออกจากประวัติศาสตร์'],
    social: ['คนแปลกหน้าที่โต๊ะข้างกันเรียกชื่อเจ้าถูก ทั้งที่ไม่เคยพบกันมาก่อน', 'บทสนทนาในโรงน้ำชาหยุดลงเมื่อเจ้าวางมือบนตราประจำตัว', 'สหายคนหนึ่งนำของฝากมาให้ พร้อมข่าวที่ไม่ควรแพร่ออกจากเมือง', 'ผู้มีอำนาจเชิญเจ้าเข้าร่วมวงสนทนาโดยไม่มีใครอธิบายเหตุผล'],
    craft: ['โลหะบนแท่นตีเหล็กหลอมตัวเองเป็นรูปที่ไม่อยู่ในแบบร่าง', 'วัตถุดิบที่เจ้าคิดว่าไร้ค่าเผยเส้นปราณเมื่อถูกบดรวมกัน', 'ลูกค้าลึกลับนำชิ้นส่วนต้องห้ามมาแลกกับสูตรที่ไม่มีช่างคนใดกล้าทำ', 'เครื่องมือช่างส่งเสียงตอบรับราวกับจำมือของผู้สร้างคนเก่าได้'],
    family: ['ญาติที่หายไปนานกลับมายืนหน้าประตูพร้อมตราของตระกูลอื่น', 'บัญชีตระกูลเผยหนี้ก้อนหนึ่งที่ไม่มีใครในเรือนยอมรับว่าเป็นผู้ก่อ', 'เด็กในเรือนพูดถึงความฝันเดียวกันเกี่ยวกับบ้านที่ไม่มีอยู่บนแผนที่', 'หีบมรดกถูกเปิดขึ้นเองและเผยจดหมายที่เปลี่ยนความเข้าใจของทั้งครอบครัว'],
    quest: ['ผู้ส่งข่าวนำภารกิจที่ไม่มีชื่อผู้ว่าจ้างมาให้ และกำชับว่าห้ามถามที่มา', 'หลักฐานชิ้นใหม่ทำให้เป้าหมายของภารกิจกลายเป็นผู้ที่เจ้ารู้จัก', 'ภารกิจสองเรื่องที่ดูไม่เกี่ยวกันกลับชี้ไปยังสถานที่เดียวกัน', 'ตราภารกิจบนกระดาษเปลี่ยนเป็นสีแดงก่อนถึงเส้นตาย'],
    sect: ['ระฆังต้องห้ามดังขึ้นจากหอคัมภีร์ทั้งที่ไม่มีผู้ใดอยู่ข้างใน', 'อาจารย์เรียกเจ้าไปพบเป็นการส่วนตัวและวางคัมภีร์ปิดผนึกลงตรงหน้า', 'ชื่อของเจ้าโผล่ในทะเบียนภารกิจลับซึ่งเขียนด้วยลายมือของคนตาย', 'ค่ายกลป้องกันสำนักเปิดช่องว่างเพียงชั่วครู่และเผยบางสิ่งนอกกำแพง'],
    travel: ['ขบวนเดินทางพบหลักเขตที่ไม่มีอยู่ในแผนที่ และคนร่วมทางบางคนจำมันได้', 'พายุหยุดลงตรงหน้าเจ้าเผยถนนสายเก่าที่มุ่งสู่ดินแดนต้องห้าม', 'คนแปลกหน้าบนรถม้าทิ้งหีบไว้ก่อนหายไปจากขบวน', 'ด่านหน้าขอให้เจ้าเลือกว่าจะส่งข่าวสงครามหรือเก็บมันไว้กับตนเอง'],
    free: ['ชาวบ้านนำของจากแม่น้ำมาขอให้เจ้าช่วยดู เพราะมันมีตราของสำนักที่ล่มสลาย', 'ข่าวจากเมืองไกลมาถึงช้ากว่าความจริง และการตัดสินใจของเจ้าจะเปลี่ยนคนที่ได้รับผล', 'คนผู้หนึ่งเสนอเส้นทางใหม่ให้เจ้าแลกกับการละทิ้งชื่อเดิม', 'ในคืนเดียวกัน ผู้คนต่างฝันถึงแสงเพลิงจากทิศเดียวกัน']
  };

  const ANNUAL_RARE_CHOICE_TEXT = {
    train: ['ฝืนทำตามจังหวะนั้นจนจบ', 'หยุดดูและจดจำวิธีการไว้', 'ถอยออกจากลานก่อนสิ่งผิดปกติจะลุกลาม'],
    work: ['รับงานไว้และถามราคาทีหลัง', 'ขอตรวจสอบผู้ว่าจ้างก่อนลงมือ', 'ปฏิเสธงานแล้วปล่อยให้เรื่องผ่านไป'],
    explore: ['ตามร่องรอยเข้าไปในทางแยก', 'ทำเครื่องหมายไว้แล้วสำรวจจากระยะปลอดภัย', 'หันกลับก่อนฟ้าจะมืด'],
    rest: ['เปิดประตูหรือออกไปตรวจดู', 'เรียกผู้ดูแลและรอฟังความเห็น', 'ดับตะเกียงแล้วไม่ข้องเกี่ยว'],
    study: ['เปิดตำราและอ่านต่อจนจบ', 'นำเรื่องนี้ไปถามผู้รู้', 'ปิดตำราแล้วเก็บเรื่องนี้ไว้ก่อน'],
    social: ['เข้าไปถามความจริงต่อหน้า', 'นั่งฟังต่อโดยไม่เปิดเผยตัว', 'ขอตัวออกจากวงสนทนา'],
    craft: ['ลงมือทำตามเบาะแสทันที', 'เก็บวัตถุดิบไว้ให้ผู้เชี่ยวชาญตรวจ', 'คืนของและไม่รับงานนี้'],
    family: ['เปิดหีบหรือถามเรื่องที่ค้างคา', 'เรียกคนในเรือนมาหารือพร้อมกัน', 'ปิดเรื่องไว้เพื่อไม่ให้บ้านวุ่นวาย'],
    quest: ['รับภารกิจและเดินตามเบาะแส', 'ขอเวลาแลกข้อมูลให้ชัดเจน', 'ถอนตัวจากงานที่ไม่เปิดเผยที่มา'],
    sect: ['รับคำสั่งและก้าวเข้าไปในเขตหวงห้าม', 'รายงานเรื่องนี้ต่อผู้มีอำนาจอีกคน', 'ทำเป็นไม่เห็นแล้วกลับไปทำหน้าที่เดิม'],
    travel: ['เปลี่ยนเส้นทางไปตรวจสอบ', 'หยุดพักและถามคนร่วมทาง', 'เดินทางต่อโดยไม่แตะต้องเรื่องนี้'],
    free: ['เข้าไปช่วยเหลือและรับรู้เรื่องทั้งหมด', 'รับฟังไว้ก่อนโดยไม่ผูกมัดตนเอง', 'ปล่อยให้ผู้คนจัดการเรื่องของตน']
  };

  function annualRareNarrative(s, activity, rarity, theme, phase, index, ageYear) {
    if (rarity === 'legendary' && s?.hero?.ageMonths === 0) {
      return `${legendaryBirthOmen(s)} ผู้เฒ่าที่เห็นเหตุการณ์ต่างเก็บเรื่องนี้ไว้ในใจ ราวกับรู้ว่าชะตาของเด็กคนหนึ่งเพิ่งเปิดม่านขึ้น บางคนเรียกมันว่าพรจากสวรรค์ บางคนเรียกมันว่าโอกาสที่ไม่อาจพบได้แม้ชั่วชีวิต และบางคนเชื่อว่า สิ่งใดก็ตามที่ติดตัวเจ้ามา ย่อมเป็นของพวกมันได้`;
    }
    const rarityIndex = ['uncommon', 'extraordinary', 'epic', 'legendary'].indexOf(rarity);
    const earlyScenes = {
      infant: [
        'ยามค่ำ หยกที่วางข้างเปลอุ่นขึ้นเอง ผู้ดูแลลังเลว่าจะเก็บมันหรือเรียกหมอมาตรวจ',
        'คนแปลกหน้าขอดูมือของเจ้าและเสนอเงินให้ครอบครัวแลกกับการพาตัวไปพบอาจารย์',
        'หลังฝนตก ผู้ดูแลพบห่อผ้าไม่รู้ที่มาใกล้ที่พัก ภายในมีสมุนไพรและจดหมายไร้ชื่อ',
        'ระหว่างเดินทาง ขบวนพบคนเจ็บขวางถนน ผู้ดูแลต้องตัดสินใจว่าจะหยุดช่วยหรือพาเจ้ากลับ',
        'หมอประจำหมู่บ้านสังเกตอาการผิดปกติและเสนอวิธีรักษาสองทางที่มีต้นทุนต่างกัน',
        'เสียงดังปลุกเจ้ากลางดึก ผู้ดูแลเห็นแสงประหลาดอยู่ไกลออกไป',
        'พ่อค้าเร่จำเครื่องรางบนตัวเจ้าได้ เขาขอแลกมันกับยาและเสบียงสำหรับคนในบ้าน',
        'เพื่อนบ้านเตือนว่ามีโจรผ่านเข้ามา ผู้ดูแลต้องเลือกว่าจะซ่อนตัวหรือขอความช่วยเหลือ'
      ],
      'young-child': [
        'เจ้าพบห่อผ้าที่มีตราประหลาดและจดหมายเปียกจนอ่านได้เพียงบางคำ',
        'เด็กอีกคนชวนเจ้าไปดูแสงที่ไม่คุ้นตา แต่ผู้ใหญ่เตือนให้ระวังเส้นทางข้างหน้า',
        'คนขายยาเสนอจะตรวจรากวิญญาณให้เจ้า ผู้ดูแลสงสัยว่าเขาต้องการสิ่งใดเป็นค่าตอบแทน',
        'ระหว่างเล่น เจ้าพบสัตว์บาดเจ็บใกล้ชายป่า เสียงฝีเท้าของผู้ไล่ล่าดังตามมาไม่ไกล',
        'ผู้เดินทางมอบเมล็ดพืชแปลกตาให้เจ้า พร้อมเตือนว่าอย่าเพาะใกล้บ่อน้ำ',
        'เด็กคนหนึ่งพลัดหลงหลังตามขบวนพ่อค้า ผู้ใหญ่กำลังรวบรวมคนออกค้นหา',
        'ของเล่นไม้ที่เจ้าพบส่งเสียงเมื่อแตะถูกห่อผ้าเก่า ผู้ดูแลจำไม่ได้ว่าใครเป็นคนทำมัน',
        'นักเดินทางสังเกตเห็นท่าที่เจ้าฝึกเล่น และขอพูดคุยกับผู้ดูแล'
      ]
    };
    const scenes = earlyScenes[phase.id] || ANNUAL_RARE_SCENES[activity] || ANNUAL_RARE_SCENES.free;
    const scene = scenes[(index + ageYear * 3 + Math.max(0, rarityIndex)) % scenes.length];
    const intensity = {
      uncommon: 'เรื่องนี้อาจเป็นเพียงความผิดปกติเล็กน้อย หากเจ้าตัดสินใจผิดก็ยังพอแก้ไขได้',
      extraordinary: 'เบื้องหลังเรื่องนี้มีบางอย่างเกินกว่าความบังเอิญ และการตัดสินใจของเจ้าจะทิ้งร่องรอยไว้',
      epic: 'ผู้คนหลายฝ่ายกำลังจับตาเหตุการณ์นี้ การเลือกครั้งเดียวอาจเปลี่ยนเส้นทางในช่วงเวลาต่อไป',
      legendary: 'นี่คือโอกาสที่คนทั่วไปอาจไม่พบแม้ตลอดชีวิต หากก้าวพลาด สิ่งที่เสียไปอาจไม่มีวันได้คืน'
    }[rarity];
    const hint = annualActivityContext(s, activity).hint;
    const cultivationGuard = activity === 'train' && !s.hero?.cultivationAccess
      ? 'การฝึกของเจ้ายังเป็นเพียงการเล่น การเคลื่อนไหว และการสร้างวินัย ยังไม่ใช่การเดินลมปราณ'
      : '';
    return `${scene} ${phase.id === 'infant' ? 'ผู้ดูแลต้องตัดสินใจแทนเจ้า' : ''}`.trim();
  }

  function legendaryBirthOmen(s) {
    const gender = s?.hero?.gender;
    if (gender === 'male') return 'เงามังกรขนาดมหึมาทอดผ่านเหนือหลังคา เกล็ดของมันสะท้อนแสงจันทร์เป็นริ้วสีดำทอง ก่อนเงยหน้าคำรามโดยไร้เสียง แล้วสลายขึ้นสู่ชั้นเมฆ';
    if (gender === 'female') return 'แสงสีชาดไหลลงมาจากฟากฟ้า รวมตัวเป็นเงาหงส์เพลิงเหนือเรือน เปลวไฟของมันไม่เผาผลาญสิ่งใด มีเพียงเสียงระฆังจากภูเขาไกลโพ้นดังขึ้นสามครั้ง ก่อนเงานั้นจะกลายเป็นเถ้าประกายและลอยหายไปในความมืด';
    return 'ลางประหลาดปรากฏขึ้นเหนือเรือน เงาศักดิ์สิทธิ์เปลี่ยนรูปร่างไปมาอยู่ท่ามกลางหมู่เมฆ บางครู่คล้ายมังกร บางครู่คล้ายหงส์ และบางครู่กลายเป็นสิ่งมีชีวิตที่ไม่เคยมีชื่ออยู่ในตำราใดของโลกมนุษย์';
  }

  // Each legendary scene keeps its title, situation and choices together. This
  // avoids combining a mundane activity title with an unrelated rare story.
  const LEGENDARY_LIFE_SCENES = {
    infant: [
      ['สัญญาจากผู้มาเยือน', 'ผู้เดินทางผู้มีชื่อเสียงขอรับเจ้าซึ่งยังเป็นทารกไปดูแล โดยเสนอความช่วยเหลือแก่ครอบครัว แต่ไม่ยอมบอกจุดหมาย ผู้ดูแลต้องตัดสินใจ', 'ให้ผู้ดูแลต่อรองและขอรู้จุดหมาย', 'ให้ผู้ดูแลขอเวลาตรวจสอบตัวตน', 'ให้ผู้ดูแลปฏิเสธและพาเจ้ากลับ'],
      ['ผู้หนีภัยพร้อมตราผนึก', 'ผู้บาดเจ็บนำตราผนึกของสำนักใหญ่เข้ามาขอความช่วยเหลือในเรือนที่เจ้าพัก คนติดตามกำลังค้นหาตรานั้น', 'ให้ผู้ดูแลช่วยผู้บาดเจ็บหลบหนี', 'ให้ผู้ดูแลขอความช่วยเหลือจากเพื่อนบ้าน', 'ให้ผู้ดูแลพาเจ้าออกห่าง'],
      ['ลางเหนือเรือน', 'แสงประหลาดปรากฏเหนือเรือนที่เจ้าพัก ผู้รู้สองคนขอตรวจเจ้าซึ่งยังเป็นทารก แต่ผู้ดูแลไม่รู้เจตนาของทั้งคู่', 'ให้ผู้ดูแลเชิญผู้รู้คนหนึ่งเข้าตรวจ', 'ให้ผู้ดูแลสอบถามประวัติผู้รู้ก่อน', 'ให้ผู้ดูแลปฏิเสธการตรวจ']
    ],
    'young-child': [
      ['เด็กที่หายไปจากขบวน', 'เด็กคนหนึ่งวิ่งมาขอความช่วยเหลือจากเจ้ากับผู้ดูแล ขบวนที่ตามหาอ้างว่าเด็กเป็นทายาทที่หายตัว แต่เด็กกลับกลัวคนเหล่านั้น', 'ขอให้ผู้ดูแลช่วยเด็กหลบผู้ติดตาม', 'ขอให้ผู้ดูแลสอบถามทั้งสองฝ่าย', 'กลับไปอยู่ในที่ปลอดภัยกับผู้ดูแล'],
      ['คำขอจากผู้รักษา', 'ผู้รักษาคนหนึ่งขอให้เจ้าพาไปยังแหล่งน้ำที่เด็กหลายคนล้มป่วย ผู้ดูแลเตือนว่าบริเวณนั้นอาจไม่ปลอดภัย', 'พาผู้รักษาไปพร้อมผู้ดูแล', 'อธิบายทางให้ผู้รักษาแทนการไปเอง', 'อยู่กับผู้ดูแลและไม่เข้าใกล้พื้นที่'],
      ['ห่อของที่มีผู้แย่งชิง', 'เจ้าพบห่อของที่สองฝ่ายตามหา ผู้ดูแลสังเกตว่าการส่งให้ฝ่ายใดโดยไม่สอบถามอาจทำให้ผู้บริสุทธิ์เดือดร้อน', 'ให้ผู้ดูแลนำห่อไปคืนต่อหน้าทั้งสองฝ่าย', 'ให้ผู้ดูแลตรวจหาหลักฐานเจ้าของ', 'ทิ้งห่อไว้และถอยออกมา']
    ],
    child: [
      ['หลักฐานก่อนศึก', 'เจ้าพบคำสั่งปลอมที่อาจทำให้คนสองกลุ่มปะทะกัน ผู้ที่ส่งคำสั่งเริ่มตามหาหลักฐานชิ้นนี้', 'นำหลักฐานไปเตือนทั้งสองฝ่าย', 'ขอให้ผู้ใหญ่ที่ไว้ใจช่วยตรวจหลักฐาน', 'ซ่อนตัวและไม่เข้าไปเกี่ยวข้อง'],
      ['ผู้รอดชีวิตจากการล่า', 'ผู้รอดชีวิตจากการไล่ล่าขอให้เจ้าส่งข่าวถึงครอบครัว ผู้ไล่ล่ากำลังเฝ้าเส้นทางหลัก', 'ฝ่าทางอ้อมไปส่งข่าวด้วยตนเอง', 'ขอความช่วยเหลือจากคนในชุมชน', 'หลีกเลี่ยงเส้นทางและรักษาตัว'],
      ['คำเตือนที่ถูกปิดผนึก', 'เจ้าพบคำเตือนเรื่องภัยที่อาจกระทบทั้งหมู่บ้าน แต่ตราที่ปิดผนึกเป็นของผู้มีอำนาจซึ่งอาจไม่พอใจหากเปิดเผย', 'นำคำเตือนไปแจ้งชาวบ้าน', 'ให้ผู้รู้ตรวจตราและข้อความก่อน', 'วางเรื่องนี้ไว้และกลับบ้าน']
    ],
    youth: [
      ['ข้อเสนอจากสองฝ่าย', 'ทั้งสองฝ่ายที่กำลังขัดแย้งขอให้เจ้าเป็นพยานในข้อพิพาท คำให้การอาจปกป้องผู้บริสุทธิ์แต่ก็ทำให้เจ้ามีศัตรู', 'ให้การต่อหน้าทั้งสองฝ่าย', 'รวบรวมหลักฐานก่อนตอบรับ', 'ปฏิเสธการเป็นพยาน'],
      ['ขบวนในคืนปิดทาง', 'ขบวนผู้ลี้ภัยติดอยู่ระหว่างกลุ่มติดอาวุธและเส้นทางอันตราย พวกเขาขอให้เจ้าช่วยหาทางออก', 'เข้าไปช่วยเปิดทางให้ขบวน', 'ขอคนในพื้นที่ช่วยหาทางปลอดภัย', 'ถอยออกจากพื้นที่'],
      ['คำสอนที่มีเจ้าของตามหา', 'ผู้บาดเจ็บฝากบันทึกวิชาไว้กับเจ้าและขอให้ส่งคืนแก่ศิษย์ ขณะเดียวกันมีคนติดตามมาขอเอกสารฉบับเดียวกัน', 'ออกตามหาศิษย์เพื่อส่งคืนบันทึก', 'ตรวจสอบตัวตนของผู้มาขอก่อน', 'ไม่รับบันทึกไว้']
    ],
    builder: [
      ['สัญญาแบ่งอำนาจ', 'สองกลุ่มเสนอให้เจ้ารับรองข้อตกลงที่อาจยุติความขัดแย้ง แต่เงื่อนไขบางข้อส่งผลต่อชาวบ้านซึ่งไม่มีตัวแทนร่วมเจรจา', 'ขอแก้ข้อตกลงต่อหน้าทั้งสองฝ่าย', 'ตรวจเงื่อนไขและรับฟังชาวบ้านก่อน', 'ปฏิเสธการรับรอง'],
      ['เสบียงที่หายไป', 'บัญชีเสบียงชี้ว่าของที่ควรถึงผู้เดือดร้อนถูกเบี่ยงทาง ผู้รับผิดชอบมีอำนาจและกำลังค้นหาคนรู้เรื่อง', 'เปิดเผยบัญชีต่อผู้เกี่ยวข้อง', 'เก็บสำเนาและตรวจสอบกับผู้ส่ง', 'ไม่เข้าไปเกี่ยวข้อง'],
      ['คนกลางที่ถูกตามล่า', 'คนกลางในการเจรจาขอที่พักชั่วคราว คนที่ไล่ตามกล่าวหาว่าเขาทรยศ แต่ยังไม่มีผู้ใดแสดงหลักฐาน', 'ช่วยคนกลางหลบออกจากพื้นที่', 'ขอหลักฐานจากทั้งสองฝ่าย', 'ปฏิเสธและรักษาระยะห่าง']
    ],
    middle: [
      ['หนี้บุญคุณในยามศึก', 'ผู้เคยช่วยเจ้าขอให้เป็นพยานเพื่อหยุดการสู้รบ แต่หลักฐานที่นำมาอาจทำให้คนใกล้ชิดอีกฝ่ายเดือดร้อน', 'นำหลักฐานออกเจรจาต่อหน้าทุกฝ่าย', 'ตรวจหลักฐานและหาทางคุ้มครองพยาน', 'ไม่รับปากเข้าร่วม'],
      ['บันทึกผู้สูญหาย', 'ทะเบียนที่พบเผยชื่อผู้สูญหายจากหลายชุมชน ผู้ถือทะเบียนเดิมถูกข่มขู่ไม่ให้พูด', 'นำทะเบียนไปเปิดเผยและขอให้ช่วยค้นหา', 'ตรวจชื่อและรักษาความปลอดภัยของพยาน', 'ส่งคืนทะเบียนและไม่เกี่ยวข้อง'],
      ['คำตัดสินของคนรุ่นก่อน', 'เอกสารเก่าอาจล้างข้อกล่าวหาที่ทำให้คนกลุ่มหนึ่งต้องพลัดถิ่น แต่ผู้เกี่ยวข้องในอดีตยังมีอิทธิพล', 'เปิดเอกสารต่อหน้าผู้ได้รับผลกระทบ', 'ตรวจที่มาของเอกสารก่อน', 'เก็บเอกสารไว้และไม่ตัดสิน']
    ],
    elder: [
      ['พยานคนสุดท้าย', 'ผู้รอดชีวิตจากเหตุการณ์เก่าขอให้เจ้าช่วยรักษาคำให้การไว้ ก่อนที่หลักฐานและผู้รู้เรื่องจะสูญหาย', 'นำคำให้การไปมอบแก่ผู้เกี่ยวข้อง', 'ตรวจบันทึกร่วมกับพยานก่อน', 'ปฏิเสธและปล่อยให้พยานตัดสินใจเอง'],
      ['คำขอจากคนรุ่นใหม่', 'คนรุ่นใหม่ขอให้เจ้าเป็นคนกลางระหว่างสองชุมชนที่เกือบปะทะกันเพราะข้อพิพาทเรื่องทางน้ำ', 'เดินทางไปไกล่เกลี่ยด้วยตนเอง', 'ขอข้อมูลจากทั้งสองชุมชนก่อน', 'ปฏิเสธบทบาทคนกลาง'],
      ['บันทึกที่อาจเปลี่ยนคดี', 'บันทึกเก่าที่เพิ่งพบมีข้อมูลซึ่งอาจช่วยผู้ถูกกล่าวหา ผู้มีอำนาจบางคนไม่ต้องการให้มีการตรวจสอบอีก', 'ส่งบันทึกให้ผู้ตรวจคดี', 'ตรวจที่มาและทำสำเนาก่อนตัดสินใจ', 'เก็บบันทึกไว้']
    ]
  };

  // Outcomes are authored for each legendary situation; helping another patient
  // does not heal the player and an accusation alone does not cause an injury.
  const LEGENDARY_OUTCOMES = {
    infant: [
      [[], []],
      [[{type:'stat',path:'hero.reputation',value:3}], []],
      [[], []]
    ],
    'young-child': [
      [[{type:'stat',path:'hero.reputation',value:3}], []],
      [[{type:'stat',path:'hero.reputation',value:3}], []],
      [[{type:'stat',path:'hero.reputation',value:2}], []]
    ],
    child: [
      [[{type:'stat',path:'hero.reputation',value:4}], []],
      [[{type:'stat',path:'hero.reputation',value:4}, {type:'stat',path:'hero.health',value:-2}], []],
      [[{type:'stat',path:'hero.reputation',value:4}], []]
    ],
    youth: [
      [[{type:'stat',path:'hero.reputation',value:4}], [{type:'stat',path:'hero.attributes.intellect',value:1}]],
      [[{type:'stat',path:'hero.reputation',value:5}, {type:'stat',path:'hero.health',value:-3}], []],
      [[{type:'stat',path:'hero.reputation',value:3}], []]
    ],
    builder: [
      [[{type:'stat',path:'hero.reputation',value:4}], []],
      [[{type:'stat',path:'hero.reputation',value:4}], [{type:'stat',path:'hero.attributes.intellect',value:1}]],
      [[{type:'stat',path:'hero.reputation',value:4}, {type:'stat',path:'hero.health',value:-2}], []]
    ],
    middle: [
      [[{type:'stat',path:'hero.reputation',value:4}], []],
      [[{type:'stat',path:'hero.reputation',value:4}], [{type:'stat',path:'hero.attributes.intellect',value:1}]],
      [[{type:'stat',path:'hero.reputation',value:3}], [{type:'stat',path:'hero.attributes.intellect',value:1}]]
    ],
    elder: [
      [[{type:'stat',path:'hero.reputation',value:3}], []],
      [[{type:'stat',path:'hero.reputation',value:4}, {type:'stat',path:'hero.health',value:-1}], []],
      [[{type:'stat',path:'hero.reputation',value:3}], [{type:'stat',path:'hero.attributes.intellect',value:1}]]
    ]
  };

  function annualRareChoices(s, activity, rarity, power, seed, frame, index, ageYear, scene) {
    const phase = annualLifePhase(s);
    const choiceVariants = [
      ['เข้าไปเผชิญเหตุการณ์', 'ตรวจสอบให้แน่ใจก่อนตัดสินใจ', 'ถอยออกมาและปล่อยเรื่องนี้ไว้'],
      ['ลงมือจัดการด้วยตนเอง', 'ขอความเห็นและหาข้อมูลเพิ่มเติม', 'หลีกเลี่ยงความเสี่ยงครั้งนี้'],
      ['คว้าโอกาสและลงมือทันที', 'ค่อย ๆ สืบหาความจริง', 'ออกห่างจากเหตุการณ์'],
      ['ยอมเสี่ยงเพื่อค้นหาคำตอบ', 'สังเกตสถานการณ์จากที่ปลอดภัย', 'ปล่อยให้ผู้อื่นจัดการ']
    ];
    const texts = scene ? scene.slice(2, 5) : phase.id === 'infant' ? ['ให้ผู้ดูแลเข้าไปเผชิญเหตุการณ์', 'ให้ผู้ดูแลตรวจสอบอย่างระมัดระวัง', 'ให้ผู้ดูแลพาเจ้าออกห่าง'] : phase.id === 'young-child' ? ['เข้าไปเผชิญเหตุการณ์พร้อมผู้ดูแล', 'ขอให้ผู้ใหญ่ช่วยตรวจสอบก่อน', 'ถอยออกมาและปล่อยเรื่องนี้ไว้'] : choiceVariants[(index + ageYear) % choiceVariants.length];
    // A caregiver acts for very young children; use circumstance (luck), not
    // the baby's own training or conversational skill, for the outcome.
    const checkStat = phase.id === 'infant' || phase.id === 'young-child' ? 'luck' : scene ? (/เจรจา|ไกล่เกลี่ย|ต่อรอง|เป็นพยาน/.test(scene[1]) ? 'charm' : 'intellect') : activity === 'train' ? 'spirit' : activity === 'work' ? 'charm' : activity === 'explore' ? 'intellect' : 'body';
    const young = phase.id === 'infant' || phase.id === 'young-child';
    const child = phase.id === 'child';
    const severe = Math.min(rarity === 'legendary' ? power * 2 : power, young ? 6 : child ? 10 : 24);
    const difficulty = 10 + power;
    const dangerousScenes = { infant: [1], 'young-child': [0, 1], child: [0, 1], youth: [1, 2], builder: [2], middle: [], elder: [] };
    const dangerous = scene ? (dangerousScenes[phase.id] || []).includes(index) : false;
    const failure = dangerous ? [{ type: 'stat', path: 'hero.health', value: -severe }] : [];
    const authored = scene ? LEGENDARY_OUTCOMES[phase.id]?.[index] : null;
    const positive = authored?.[0] || [];
    const cautious = authored?.[1] || [];
    const successNote = gradedOutcomeNote(positive) || 'ไม่มีผลต่อค่าที่แสดง';
    const cautiousNote = gradedOutcomeNote(cautious) || 'ไม่มีผลต่อค่าที่แสดง';
    return [
      { text: texts[0], note: `หากสำเร็จ ${successNote} · หากพลาด${dangerous ? `เสียสุขภาพ ${severe}` : 'ยังทำไม่สำเร็จ'}`, check: { stat: checkStat, difficulty }, failureEffects: failure, effects: [{ type: 'path', key: 'duty', value: Math.ceil(power / 2) }, ...positive] },
      { text: texts[1], note: `ไม่ต้องทดสอบ · ${cautiousNote}`, effects: [{ type: 'path', key: 'insight', value: Math.max(1, Math.ceil(power / 3)) }, ...cautious] },
      { text: texts[2], note: 'ไม่ได้เข้าไปเกี่ยวข้อง', effects: [{ type: 'path', key: 'freedom', value: 1 }] }
    ];
  }

  // Story and Free Mode share this rule vocabulary. A story character can
  // override the free preset, but both still resolve death through one hook.
  const LIFE_RULES = {
    oneLife: { id: 'one-life', name: 'หนึ่งชีวิต', onDeath: 'terminal', rebirth: 'none' }, rebirth: { id: 'rebirth', name: 'เกิดใหม่', onDeath: 'rebirth-baby', rebirth: 'new-body' },
    freeTerminal: { id: 'free-terminal', name: 'ตายแล้วจบ', onDeath: 'terminal', rebirth: 'none' },
    unlimitedSimulation: { id: 'unlimited-simulation', name: 'จำลองอนาคตไม่จำกัด', onDeath: 'simulation', rebirth: 'none' },
    revengeRebirth: { id: 'revenge-rebirth', name: 'เกิดใหม่ล้างแค้น', onDeath: 'rebirth-baby', rebirth: 'new-body' },
    dynasty: { id: 'dynasty', name: 'สืบทอดตระกูล', onDeath: 'heir-baby', rebirth: 'heir' },
    unluckyIsekai: { id: 'unlucky-isekai', name: 'ต่างโลกผู้ถูกดูแคลน', onDeath: 'rebirth-baby', rebirth: 'new-body' }
  };

  const STORY_CHARACTERS = {
    'lin-an': { id: 'lin-an', name: 'หลินอัน', gender: 'male', title: 'ทายาทคนสุดท้าย', ruleSet: LIFE_RULES.oneLife.id, intro: null, startAgeMonths: 60 },
    'dream-walker': { id: 'dream-walker', name: 'เซี่ยจื่อเหยา', title: 'ผู้จำลองอนาคต', ruleSet: LIFE_RULES.unlimitedSimulation.id, intro: 'story_dream_intro', startAgeMonths: 216, unlockAfter: 'lin-an' },
    'revenant': { id: 'revenant', name: 'เย่หลิง', title: 'ผู้เกิดใหม่ล้างแค้น', ruleSet: LIFE_RULES.revengeRebirth.id, intro: 'story_revenge_intro', startAgeMonths: 60, unlockAfter: 'dream-walker' },
    'dynasty-heir': { id: 'dynasty-heir', name: 'หลัวจิ้ง', title: 'ผู้สืบทอดตระกูล', ruleSet: LIFE_RULES.dynasty.id, intro: 'story_dynasty_intro', startAgeMonths: 0, unlockAfter: 'revenant' },
    'isekai-underdog': { id: 'isekai-underdog', name: 'อาเรน', title: 'ผู้ถูกดูแคลนจากต่างโลก', ruleSet: LIFE_RULES.unluckyIsekai.id, intro: 'story_isekai_intro', startAgeMonths: 0, unlockAfter: 'dynasty-heir' }
  };

  // Story routes are a contract rather than a loose collection of flags.
  // Free Mode uses the same shape, but keeps an inferred identity instead of locking a route.
  const STORY_ROUTE_IDS = ['sect', 'mortal-peace', 'nameless-martial', 'new-land', 'underworld', 'free'];
  const ROUTE_SKILL_DEFS = {
    householdSkill: { name: 'ความชำนาญครัวเรือน', hint: 'งาน เงิน บ้าน และการดูแลผู้คน' },
    martialReputation: { name: 'ชื่อเสียงนักยุทธ์', hint: 'กาย วิชาต่อสู้ และการยืนหยัด' },
    travelKnowledge: { name: 'ความรู้เส้นทาง', hint: 'การเดินทาง เสบียง และเมืองใหม่' },
    sectMerit: { name: 'ผลงานสำนัก', hint: 'วิชา ปราณ ความสัมพันธ์ และการเตรียมศึก' }
  };
  function ensureStoryRoute(s) {
    s.storyRoute = s.storyRoute || { id: s.mode === 'free' ? 'free' : null, startedMonth: null, progress: 0, failure: null, skills: { householdSkill: 0, martialReputation: 0, travelKnowledge: 0, sectMerit: 0 }, identity: null, tutorial: { seen: [], hints: [] } };
    const route = s.storyRoute;
    route.id = STORY_ROUTE_IDS.includes(route.id) ? route.id : (s.mode === 'free' ? 'free' : null);
    route.startedMonth = Number.isFinite(route.startedMonth) ? route.startedMonth : null;
    route.progress = Math.max(0, Number(route.progress) || 0);
    route.failure = route.failure || null;
    route.milestones = route.milestones && typeof route.milestones === 'object' ? route.milestones : {};
    route.tutorial = route.tutorial && typeof route.tutorial === 'object' ? route.tutorial : { seen: [], hints: [] };
    route.tutorial.seen = Array.isArray(route.tutorial.seen) ? route.tutorial.seen : [];
    route.tutorial.hints = Array.isArray(route.tutorial.hints) ? route.tutorial.hints : [];
    route.skills = route.skills || {};
    Object.keys(ROUTE_SKILL_DEFS).forEach(key => { route.skills[key] = Math.max(0, Number(route.skills[key]) || 0); });
    return route;
  }
  function setStoryRoute(s, id, reason = null) {
    const route = ensureStoryRoute(s);
    if (!STORY_ROUTE_IDS.includes(id)) return false;
    route.id = id; route.startedMonth = Number.isFinite(route.startedMonth) ? route.startedMonth : s.month; route.failure = reason || route.failure; route.progress = Math.max(route.progress, 1);
    return true;
  }
  function addRouteSkill(s, key, value = 1) {
    const route = ensureStoryRoute(s);
    if (!Object.prototype.hasOwnProperty.call(route.skills, key)) return false;
    route.skills[key] = Math.max(0, route.skills[key] + Number(value || 0));
    route.progress += Math.max(0, Number(value || 0));
    return true;
  }
  function inferFreeLifeIdentity(s) {
    const route = ensureStoryRoute(s);
    if (route.id !== 'free') return route.identity || route.id;
    const job = s.household?.job;
    if (job === 'farmer') return 'ชาวนา / ผู้ปลูกสมุนไพร';
    if (job === 'artisan') return 'ช่าง / ผู้สร้างของ';
    if (job === 'physician') return 'หมอยา / ผู้ปรุงโอสถ';
    if (job === 'merchant') return 'พ่อค้า / วาณิช';
    if (job === 'hunter') return 'นายพราน / ผู้แกะรอย';
    if (job === 'guard') return 'ผู้คุ้มกันคาราวาน';
    if ((s.hero?.realm || 0) >= 1 || (s.hero?.power || 0) >= 150) return 'ผู้ฝึกตน / นักยุทธ์';
    if ((s.crafting?.knowledge?.alchemy || 0) >= 2) return 'หมอยา / ผู้ปรุงโอสถ';
    if ((s.crafting?.knowledge?.smithing || 0) >= 2) return 'ช่างฝีมือ';
    const entries = Object.entries(route.skills).sort((a, b) => b[1] - a[1]);
    const top = entries[0]?.[0] || 'householdSkill';
    route.identity = top === 'householdSkill' ? 'ชาวเมืองผู้ขยันขันแข็ง' : top === 'martialReputation' ? 'นักยุทธ์พเนจร' : top === 'travelKnowledge' ? 'ผู้เดินทาง' : 'ผู้แสวงหาเส้นทาง';
    return route.identity;
  }
  const ROUTE_TUTORIALS = {
    sect: { id: 'sect-basics', title: 'พื้นฐานสำนัก', hint: 'ตรวจรากวิญญาณ เรียนวิชา แยกปราณออกจากความก้าวหน้า และเตรียมทะลวงขั้นใหญ่' },
    'mortal-peace': { id: 'mortal-basics', title: 'พื้นฐานครัวเรือน', hint: 'งาน เงิน บ้าน และสุขภาพเป็นทรัพยากรหลักของชีวิตสงบ' },
    'nameless-martial': { id: 'martial-basics', title: 'พื้นฐานนักยุทธ์', hint: 'ฝึกกาย วิชาต่อสู้ ชื่อเสียง และการพักฟื้นทดแทนปราณ' },
    'underworld': { id: 'underworld-basics', title: 'พื้นฐานตลาดมืด', hint: 'เงิน สุขภาพ ชื่อเสียง และความไว้ใจมีผลต่อชีวิตในเครือข่ายใต้ดิน' },
    'new-land': { id: 'travel-basics', title: 'พื้นฐานการเดินทาง', hint: 'เสบียง พาหนะ ข่าวสาร และคนรู้จักทำให้ไปถึงเมืองใหม่ได้' }
  };
  function markRouteTutorial(s, routeId) {
    const route = ensureStoryRoute(s), tutorial = ROUTE_TUTORIALS[routeId];
    if (!tutorial) return null;
    if (!route.tutorial.seen.includes(tutorial.id)) route.tutorial.seen.push(tutorial.id);
    if (!route.tutorial.hints.includes(tutorial.hint)) route.tutorial.hints.push(tutorial.hint);
    return tutorial;
  }
  const ROUTE_AUTO_DOCTRINES = {
    sect: { schedule: ['train', 'study', 'rest', 'train', 'sect', 'work', 'train', 'rest', 'study', 'train', 'craft', 'rest'], floor: 40 },
    'mortal-peace': { schedule: ['work', 'rest', 'work', 'family', 'work', 'study', 'rest', 'work', 'social', 'work', 'craft', 'rest'], floor: 55 },
    'nameless-martial': { schedule: ['train', 'rest', 'train', 'work', 'train', 'explore', 'rest', 'train', 'social', 'train', 'work', 'rest'], floor: 45 },
    'new-land': { schedule: ['work', 'travel', 'rest', 'explore', 'work', 'travel', 'rest', 'social', 'travel', 'work', 'explore', 'rest'], floor: 50 },
    underworld: { schedule: ['work', 'social', 'rest', 'work', 'explore', 'rest', 'work', 'social', 'travel', 'rest'], floor: 50 },
    free: { schedule: ['rest', 'work', 'train', 'study', 'explore', 'rest', 'social', 'work', 'craft', 'travel', 'family', 'rest'], floor: 45 }
  };
  function routeAutoDoctrine(s) {
    const route = ensureStoryRoute(s), id = route.id || 'free';
    const doctrine = ROUTE_AUTO_DOCTRINES[id] || ROUTE_AUTO_DOCTRINES.free;
    return { id, ...doctrine, schedule: doctrine.schedule.filter(activity => ACTIVITY[activity] || activity === 'travel' || activity === 'family' || activity === 'sect') };
  }
  function lifeDirection(s) {
    const route = ensureStoryRoute(s), skills = route.skills, hints = [];
    if (route.id === 'mortal-peace') hints.push((skills.householdSkill >= 8 && s.hero.money >= 25) ? 'ชายคาของเจ้ากำลังมั่นคง' : 'ชายคาของเจ้ายังไม่มั่นคง');
    else if (route.id === 'nameless-martial') hints.push(skills.martialReputation >= 8 ? 'ชื่อเสียงบนเส้นทางยุทธ์กำลังเพิ่มขึ้น' : 'ฝีมือยังไม่มีคนจดจำ');
    else if (route.id === 'new-land') hints.push((skills.travelKnowledge >= 8 && (s.materials?.herb || 0) >= 2) ? 'เสบียงและเส้นทางเริ่มพร้อม' : 'เสบียงยังไม่พอสำหรับการเดินทางไกล');
    else if (route.id === 'sect') hints.push(s.hero.cultivationAccess ? 'รากฐานปราณกำลังเปิดทางสู่การทะลวง' : 'ยังขาดวิชาที่เปิดทางบำเพ็ญ');
    else hints.push(inferFreeLifeIdentity(s));
    if (route.tutorial?.hints?.length) hints.push(`บทเรียน: ${route.tutorial.hints[route.tutorial.hints.length - 1]}`);
    if (route.id === 'free' && Array.isArray(s.metaState?.tutorials)) hints.push(...s.metaState.tutorials.slice(-2).map(item => `บทเรียนที่ปลดล็อก: ${item}`));
    if ((s.hero.health / Math.max(1, s.hero.maxHealth)) < .4) hints.push('สุขภาพเป็นความเสี่ยงหลัก');
    if ((s.hero.money || 0) < 5) hints.push('เงินสำรองใกล้หมด');
    return { route: route.id || 'free', identity: route.identity, hints, missing: route.id === 'new-land' && (s.materials?.herb || 0) < 2 ? ['เสบียง'] : [] };
  }

  // A shared calendar is the bridge between Lin An, other Story characters, and Free Mode.
  // worldMonth 0 is Lin An's age five opening scene; the Free player starts at age zero.
  let WORLD_EVENTS;
  const LIN_AN_ROUTE_BIAS = { sect: .35, 'mortal-peace': .20, 'nameless-martial': .15, 'new-land': .15, underworld: .10, earlyDeath: .05 };
  function ensureWorldState(s) {
    s.world = s.world || {};
    s.world.worldMonth = Number.isFinite(s.world.worldMonth) ? s.world.worldMonth : (Number.isFinite(s.worldMonth) ? s.worldMonth : 0);
    s.worldMonth = s.world.worldMonth;
    s.world.seed = Number.isFinite(s.world.seed) ? s.world.seed : 73129;
    s.world.worldSeed = Number.isFinite(s.world.worldSeed) ? s.world.worldSeed : s.world.seed;
    s.world.npcLifeSeed = Number.isFinite(s.world.npcLifeSeed) ? s.world.npcLifeSeed : s.world.seed + 17;
    s.world.news = Array.isArray(s.world.news) ? s.world.news : [];
    s.world.events = s.world.events || {};
    s.world.knownEvents = Array.isArray(s.world.knownEvents) ? s.world.knownEvents : [];
    s.world.region = s.world.region || 'border-town';
    s.world.modifiers = s.world.modifiers || { refugeePressure: 0, herbPrice: 1, guardPresence: 0, travelRisk: 0 };
    s.world.modifiers.refugeePressure = Math.max(0, Number(s.world.modifiers.refugeePressure) || 0);
    s.world.modifiers.herbPrice = Math.max(1, Number(s.world.modifiers.herbPrice) || 1);
    s.world.modifiers.guardPresence = Math.max(0, Number(s.world.modifiers.guardPresence) || 0);
    s.world.modifiers.travelRisk = Math.max(0, Number(s.world.modifiers.travelRisk) || 0);
    s.worldCharacters = s.worldCharacters || {};
    s.worldCharacters.linAn = ensureLinAnWorldCharacter(s.worldCharacters.linAn, s.world.seed);
    s.worldCharacters.story = s.worldCharacters.story || {};
    Object.values(STORY_CHARACTERS).forEach(def => {
      if (def.id === 'lin-an') return;
      const existing = s.worldCharacters.story[def.id] || {};
      s.worldCharacters.story[def.id] = {
        id: def.id, name: def.name, alive: existing.alive !== false,
        ageMonths: Number.isFinite(existing.ageMonths) ? existing.ageMonths : def.startAgeMonths,
        region: existing.region || 'border-town', activity: existing.activity || 'idle',
        route: existing.route || null, ending: existing.ending || null,
        knownWorldEvents: Array.isArray(existing.knownWorldEvents) ? existing.knownWorldEvents : [],
        lastSimulatedMonth: Number.isFinite(existing.lastSimulatedMonth) ? existing.lastSimulatedMonth : -1,
        seed: Number.isFinite(existing.seed) ? existing.seed : s.world.seed + def.id.length * 97
      };
    });
    return s.world;
  }
  function ensureLinAnWorldCharacter(existing, seed = 73129) {
    const c = existing || {};
    c.id = 'lin-an'; c.name = 'หลินอัน'; c.alive = c.alive !== false; c.ageMonths = Number.isFinite(c.ageMonths) ? c.ageMonths : 60; c.route = c.route || null; c.routeBias = c.routeBias || { ...LIN_AN_ROUTE_BIAS }; c.region = c.region || 'north-city'; c.activity = c.activity || 'survive'; c.health = Number.isFinite(c.health) ? c.health : 86; c.maxHealth = Number.isFinite(c.maxHealth) ? c.maxHealth : 100; c.money = Number.isFinite(c.money) ? c.money : 3; c.reputation = Number.isFinite(c.reputation) ? c.reputation : 0; c.cultivation = Number.isFinite(c.cultivation) ? c.cultivation : 0; c.qi = Number.isFinite(c.qi) ? c.qi : 0; c.power = Number.isFinite(c.power) ? c.power : 0; c.routeProgress = Number.isFinite(c.routeProgress) ? c.routeProgress : 0; c.relationships = c.relationships || { master: 0, friend: 0, companion: 0 }; c.choices = c.choices || {}; c.knownWorldEvents = Array.isArray(c.knownWorldEvents) ? c.knownWorldEvents : []; c.interventions = Array.isArray(c.interventions) ? c.interventions : []; c.ending = c.ending || null; c.seed = Number.isFinite(c.seed) ? c.seed : seed + 17; c.lastSimulatedMonth = Number.isFinite(c.lastSimulatedMonth) ? c.lastSimulatedMonth : -1; return c;
  }
  function deterministicRoll(seed, month, salt = 0) {
    const value = Math.sin((Number(seed) + 1) * 12.9898 + (Number(month) + 1) * 78.233 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
  }
  function worldRegion(s) {
    const current = s.locations?.current || s.locations?.selected || 'roadside';
    if (['sect', 'sect_border', 'warfront'].includes(current)) return 'cloud-sect';
    if (['inn', 'roadside', 'rented', 'owned', 'retainer'].includes(current)) return 'border-town';
    if (current === 'hidden_cave') return 'western-border';
    return current;
  }
  function worldEventStatus(event, worldMonth) {
    if (worldMonth < event.worldMonth) return 'upcoming';
    if (worldMonth < event.worldMonth + event.duration) return 'active';
    return 'aftermath';
  }
  function applyWorldEventOutcome(s, event, outcome) {
    const world = ensureWorldState(s), impact = event.outcomes?.[outcome];
    if (!impact) return null;
    const modifiers = world.modifiers;
    Object.entries(impact.modifiers || {}).forEach(([key, value]) => {
      const current = Number(modifiers[key] || 0);
      if (key === 'herbPrice') modifiers[key] = Math.max(1, Math.min(3, Math.round((current + Number(value)) * 100) / 100));
      else modifiers[key] = Math.max(0, current + Number(value));
    });
    world.news.unshift(impact.news || event.news);
    world.news = world.news.slice(0, 12);
    return impact;
  }
  function resolveWorldEvent(s, event, outcome = null) {
    const world = ensureWorldState(s); world.events[event.id] = { id: event.id, status: outcome === 'missed' ? 'missed' : 'resolved', outcome, resolvedAt: world.worldMonth };
    if (!world.knownEvents.includes(event.id)) world.knownEvents.push(event.id);
    applyWorldEventOutcome(s, event, outcome);
    if (event.id === 'cloud_sect_invasion') {
      world.events[event.id].outcome = outcome || 'unobserved';
      if (outcome === 'help_sect') { world.news.unshift('ผู้เดินทางกลุ่มหนึ่งช่วยผู้รอดชีวิตจากสำนักเมฆาคราม'); world.modifiers.guardPresence = Math.max(0, world.modifiers.guardPresence - 1); world.modifiers.travelRisk = Math.max(0, world.modifiers.travelRisk - 3); }
      else if (outcome === 'help_serpent') { world.news.unshift('งูดำยึดเสบียงจากสำนักเมฆาครามได้บางส่วน'); world.modifiers.guardPresence += 2; world.modifiers.travelRisk += 8; }
      else if (outcome === 'help_refugees') { world.news.unshift('ผู้ลี้ภัยจากภูเขาเมฆาครามเริ่มไหลเข้าสู่เมืองชายแดน'); world.modifiers.refugeePressure += 8; world.modifiers.herbPrice = Math.min(2.5, world.modifiers.herbPrice + .25); }
      else { world.news.unshift('สำนักเมฆาครามเสียหายหนัก ผลของศึกยังไม่ชัดเจน'); world.modifiers.refugeePressure += 4; world.modifiers.guardPresence += 1; world.modifiers.travelRisk += 4; }
      world.news = world.news.slice(0, 12);
    }
    return world.events[event.id];
  }
  function applyWorldInterventionToLinAn(s, outcome) {
    const c = worldCharactersLinAn(s);
    if (outcome === 'help_sect') { c.power += 40; c.reputation += 8; c.interventions.push('player_help_sect'); }
    else if (outcome === 'help_refugees') { c.health = Math.min(c.maxHealth, c.health + 10); c.reputation += 3; c.interventions.push('player_help_refugees'); }
    else if (outcome === 'help_serpent') { c.health = Math.max(1, c.health - 12); c.reputation -= 15; c.route = 'underworld'; c.interventions.push('player_help_serpent'); }
    return c;
  }
  function updateWorldEvents(s) {
    const world = ensureWorldState(s);
    WORLD_EVENTS.forEach(event => {
      const status = worldEventStatus(event, world.worldMonth);
      const record = world.events[event.id];
      if (!record && status === 'aftermath') resolveWorldEvent(s, event, 'missed');
      else if (!record && status === 'active' && event.autoOutcome) resolveWorldEvent(s, event, event.autoOutcome);
      else if (!record && status === 'active' && !world.news.some(item => item.includes(event.title))) world.news.unshift(event.news);
    });
    world.news = world.news.slice(0, 12);
    world.region = worldRegion(s);
    return world;
  }
  function chooseLinAnWorldRoute(c, world) {
    if (c.route) return c.route;
    const bias = { ...LIN_AN_ROUTE_BIAS, ...(c.routeBias || {}) };
    if (c.health < 35 && c.money < 5) bias['mortal-peace'] += .15;
    if (c.power >= 120) bias.sect += .15;
    if ((c.relationships?.master || 0) >= 8) bias.sect += .12;
    if ((c.relationships?.companion || 0) >= 8) bias['new-land'] += .10;
    if (c.reputation < -8) bias.underworld += .12;
    const candidates = ['sect', 'mortal-peace', 'nameless-martial', 'new-land', 'underworld'];
    const total = candidates.reduce((sum, id) => sum + Math.max(0, Number(bias[id]) || 0), 0);
    let roll = deterministicRoll(c.seed, world.worldMonth, 4) * total;
    c.route = candidates.find(id => { roll -= Math.max(0, Number(bias[id]) || 0); return roll < 0; }) || 'mortal-peace';
    return c.route;
  }
  function worldCharactersLinAn(s) {
    ensureWorldState(s);
    return s.worldCharacters.linAn;
  }
  function simulateLinAnWorld(s) {
    const world = ensureWorldState(s), c = worldCharactersLinAn(s);
    if (s.mode === 'story' && s.characterId === 'lin-an') return c;
    if (!c.alive || c.ending || c.lastSimulatedMonth >= world.worldMonth) return c;
    while (c.lastSimulatedMonth < world.worldMonth) {
      const month = c.lastSimulatedMonth + 1; c.lastSimulatedMonth = month; if (month > 0) c.ageMonths += 1;
      if (month === 0) { c.region = 'north-city'; c.knownWorldEvents.push('lin_house_falls'); }
      if (month === 84) chooseLinAnWorldRoute(c, world);
      if (month >= 84 && !c.route) chooseLinAnWorldRoute(c, world);
      if (c.route === 'sect') { c.region = 'cloud-sect'; c.cultivation += month < MAX_MONTHS ? 2 : 0; c.qi = Math.max(0, c.qi + (month % 2 ? 1 : -1)); c.power += month < MAX_MONTHS ? 3 : 0; c.relationships.master += month % 6 === 0 ? 1 : 0; c.activity = 'train'; }
      else if (c.route === 'mortal-peace') { c.region = 'border-town'; c.money += month % 3 === 0 ? 5 : 2; c.health = Math.min(c.maxHealth, c.health + (month % 4 === 0 ? 2 : -1)); c.relationships.companion += month % 5 === 0 ? 1 : 0; c.reputation += month % 6 === 0 ? 1 : 0; c.activity = 'work'; }
      else if (c.route === 'nameless-martial') { c.region = 'western-border'; c.power += 5; c.health = Math.max(1, Math.min(c.maxHealth, c.health + (month % 3 === 0 ? 1 : -2))); c.reputation += month % 5 === 0 ? 2 : 0; c.activity = 'train'; }
      else if (c.route === 'new-land') { c.region = month < 120 ? 'western-border' : 'new-land'; c.money = Math.max(0, c.money - 1 + (month % 4 === 0 ? 4 : 0)); c.health = Math.max(1, c.health - 1); c.relationships.companion += month % 4 === 0 ? 1 : 0; c.reputation += month % 7 === 0 ? 1 : 0; c.activity = 'travel'; }
      else if (c.route === 'underworld') { c.region = 'western-border'; c.money += 7; c.reputation -= 2; c.activity = 'work'; }
      if (c.health <= 0 || (c.ageMonths >= 90 * 12 && month > MAX_MONTHS)) { c.alive = false; c.ending = 'death'; }
      if (month >= MAX_MONTHS && !c.ending) {
        const invasion = WORLD_EVENTS.find(event => event.id === 'cloud_sect_invasion');
        if (month > MAX_MONTHS && !s.world.events[invasion.id]) resolveWorldEvent(s, invasion, 'unobserved');
        if (s.world.events[invasion.id]) c.ending = resolveLinAnEnding(c, s.world);
      }
    }
    return c;
  }
  function resolveLinAnEnding(c, world) {
    if (!c.alive || c.health <= 0) return 'death';
    const invasion = world?.events?.cloud_sect_invasion?.outcome;
    if (c.route === 'sect') {
      if (invasion === 'help_serpent' || c.reputation < -10) return 'sect_fall';
      return c.power >= 180 ? 'guardian' : 'sect_fall';
    }
    if (c.route === 'mortal-peace') return c.money >= 80 && c.health > 25 ? 'quiet_roof' : 'war_shadow_survivor';
    if (c.route === 'nameless-martial') return c.power >= 220 && c.health > 20 ? 'nameless_martial' : 'war_shadow_survivor';
    if (c.route === 'new-land') return c.region === 'new-land' && c.money > 0 ? 'new_land_wanderer' : 'war_shadow_survivor';
    return 'outlaw';
  }
  function simulateWorldCharacters(s) {
    const world = ensureWorldState(s);
    Object.values(worldCharactersStory(s)).forEach(c => {
      if (!c.alive || c.ending || c.id === s.characterId) return;
      while (c.lastSimulatedMonth < world.worldMonth) {
        const month = c.lastSimulatedMonth + 1; c.lastSimulatedMonth = month; if (month > 0) c.ageMonths += 1;
        const roll = deterministicRoll(c.seed, month, 19);
        c.activity = roll < .34 ? 'work' : roll < .67 ? 'travel' : 'train';
        if (c.activity === 'travel') c.region = roll < .5 ? 'western-border' : 'border-town';
        if (month === MAX_MONTHS) { c.knownWorldEvents.push('cloud_sect_invasion'); if (c.region === 'cloud-sect') { c.health = Math.max(1, c.health - 8); c.activity = 'survive'; } }
        if (month >= MAX_MONTHS && c.activity === 'train') c.route = c.route || 'sect';
        if (month > 240 && deterministicRoll(c.seed, month, 29) < .01) { c.alive = false; c.ending = 'death'; }
      }
    });
    return worldCharactersStory(s);
  }
  function worldCharactersStory(s) { ensureWorldState(s); return s.worldCharacters.story || {}; }

  const OPPORTUNITY_COSTS = {
    rest: 'ฟื้นสุขภาพ แต่เสียเวลาในการสร้างเงิน/ความรู้', train: 'เพิ่มการฝึก แต่เสียรายได้และโอกาสพบผู้คน',
    learn: 'เพิ่มความรู้ แต่ใช้เวลาและทรัพยากร', work: 'เพิ่มเงิน/ชื่อเสียง แต่แลกสุขภาพและเวลาพัก',
    explore: 'เปิดพื้นที่และโอกาสใหม่ แต่เสี่ยงบาดเจ็บ/เสียเงิน', social: 'เพิ่มความสัมพันธ์ แต่ลดเวลาฝึกหรือทำงาน',
    family: 'เพิ่มความมั่นคงตระกูล แต่ไม่ก้าวหน้าในสายอื่น', craft: 'แปลงวัตถุดิบเป็นของ แต่เสียเวลาและเงิน', free: 'รักษาความยืดหยุ่น แต่ผลลัพธ์ไม่เฉพาะทาง'
  };
  function ensureOpportunityCost(s) {
    s.opportunityCost = s.opportunityCost || { byActivity: {}, last: null };
    s.opportunityCost.byActivity = s.opportunityCost.byActivity || {};
    return s.opportunityCost;
  }
  function recordOpportunityCost(s, activity) {
    const oc = ensureOpportunityCost(s);
    oc.byActivity[activity] = (oc.byActivity[activity] || 0) + 1;
    oc.last = { activity, month: s.month, note: OPPORTUNITY_COSTS[activity] || '' };
    return oc.last;
  }
  function worldEventIntervention(s, event) {
    if (!event?.intervention || worldRegion(s) !== event.region) return null;
    const world = ensureWorldState(s), record = world.events[event.id];
    if (record?.status === 'resolved') return null;
    // World crises continue independently while a young child stays with a
    // caregiver; they cannot personally undertake adult intervention roles.
    if ((Number(s.hero?.ageMonths) || 0) < 144) {
      const observe = event.interventionChoices?.find(choice => choice.outcome.startsWith('ignore_'));
      return {
        id: `world_${event.id}`, month: s.month, tag: 'เหตุการณ์ของโลก', title: event.title,
        text: `${event.news} ผู้ดูแลพาเจ้าอยู่ในที่ปลอดภัย ขณะที่ผู้ใหญ่รับมือกับเหตุการณ์`,
        choices: [{ text: 'อยู่กับผู้ดูแลและรอฟังข่าว', note: 'ปล่อยให้เหตุการณ์ดำเนินไปโดยไม่เข้าแทรกแซง', effect: state => {
          resolveWorldEvent(state, event, observe?.outcome || 'observed');
          addLog(`${event.title}: ผู้ดูแลพาเจ้าอยู่ห่างจากเหตุการณ์`);
        } }]
      };
    }
    const customChoices = event.interventionChoices;
    if (customChoices?.length) return {
      id: `world_${event.id}`, month: s.month, tag: 'เหตุการณ์ของโลก', title: event.title,
      text: `${event.news} เจ้าอยู่ในภูมิภาคนี้พอดี และยังมีเวลาตัดสินใจว่าจะเข้าไปยุ่งหรือไม่`,
      choices: customChoices.map(choice => ({
        text: choice.text, note: choice.note, pathPreview: choice.paths || {},
        effect: state => {
          const hero = state.hero || (state.hero = {}), paths = state.paths || (state.paths = {}), relations = state.relations || (state.relations = {});
          Object.entries(choice.hero || {}).forEach(([key, value]) => { hero[key] = Number(hero[key] || 0) + Number(value); });
          Object.entries(choice.paths || {}).forEach(([key, value]) => { paths[key] = Number(paths[key] || 0) + Number(value); });
          Object.entries(choice.relations || {}).forEach(([key, value]) => { relations[key] = Number(relations[key] || 0) + Number(value); });
          resolveWorldEvent(state, event, choice.outcome);
          addLog(`${event.title}: ${choice.text}`, true);
        }
      }))
    };
    return {
      id: `world_${event.id}`, month: s.month, tag: 'เหตุการณ์ของโลก', title: event.title,
      text: `${event.news} เจ้าอยู่ในภูมิภาคนี้พอดี และยังมีเวลาตัดสินใจว่าจะเข้าไปยุ่งหรือไม่`,
      choices: [
        { text: 'ช่วยฝ่ายสำนักและผู้รอดชีวิต', note: 'เพิ่มโอกาสให้ผู้คนรอด แต่เสียสุขภาพและเวลา', effect: state => { state.hero.health -= 8; state.hero.reputation += 8; state.paths.compassion += 2; applyWorldInterventionToLinAn(state, 'help_sect'); resolveWorldEvent(state, event, 'help_sect'); addLog('เจ้าเข้าไปช่วยฝ่ายสำนักในฐานะคนนอก ไม่ได้เปลี่ยนให้ตนเป็นศิษย์', true); } },
        { text: 'ช่วยผู้ลี้ภัยและเปิดเส้นทางหนี', note: 'ไม่ชนะสงคราม แต่ช่วยให้ผลกระทบต่อเมืองเบาลง', effect: state => { state.hero.money -= 6; state.hero.health -= 4; state.relations.acquaintance += 4; state.paths.compassion += 3; applyWorldInterventionToLinAn(state, 'help_refugees'); resolveWorldEvent(state, event, 'help_refugees'); addLog('เจ้าเลือกช่วยคนที่กำลังหนีออกจากภูเขา', true); } },
        { text: 'ฉวยโอกาสเข้าข้างงูดำ', note: 'ได้ผลตอบแทน แต่ชื่อเสียงและกรรมจะเปลี่ยนไป', effect: state => { state.hero.money += 16; state.hero.reputation -= 10; state.paths.freedom += 2; state.flags.workedUnderworld = true; applyWorldInterventionToLinAn(state, 'help_serpent'); resolveWorldEvent(state, event, 'help_serpent'); addLog('เจ้าใช้ความวุ่นวายของสงครามแลกผลประโยชน์ให้ตนเอง', true); } },
        { text: 'ไม่ยุ่งและรอฟังผล', note: 'โลกจะเดินต่อโดยไม่มีการแทรกแซงจากเจ้า', effect: state => { resolveWorldEvent(state, event, 'observed'); addLog('เจ้าเห็นเงาไฟจากระยะไกล แล้วปล่อยให้สงครามตัดสินตัวเอง'); } }
      ]
    };
  }
  const UNLUCKY_ORIGINS = [
    { id: 'abandoned', name: 'เด็กถูกทิ้ง', effect: 'ไม่มีครอบครัวคุ้มครอง', money: 0, health: -12 },
    { id: 'debt', name: 'ทายาทหนี้สิน', effect: 'เริ่มต้นพร้อมหนี้ของตระกูล', money: -8, health: 0 },
    { id: 'crippled', name: 'ร่างกายพิการ', effect: 'สุขภาพและพลังเริ่มต้นต่ำ', money: 3, health: -25 },
    { id: 'hunted', name: 'เด็กที่ถูกตามล่า', effect: 'มีศัตรูตามรอยตั้งแต่เกิด', money: 1, health: -8 }
  ];

  function rollUnluckyOrigin(s) {
    const origin = pick(UNLUCKY_ORIGINS);
    s.flags.unluckyOrigin = origin.id;
    s.flags.unluckyOriginName = origin.name;
    s.hero.money = Math.max(0, s.hero.money + origin.money);
    s.hero.maxHealth = Math.max(40, s.hero.maxHealth + origin.health);
    s.hero.health = Math.max(1, Math.min(s.hero.maxHealth, s.hero.health + origin.health));
    return origin;
  }

  function deriveUnlockedCharacters(meta = {}) {
    const order = ['lin-an', 'dream-walker', 'revenant', 'dynasty-heir', 'isekai-underdog'];
    const endingsCount = Array.isArray(meta.endings) ? new Set(meta.endings).size : 0;
    return order.slice(0, Math.min(order.length, 1 + endingsCount));
  }

  const ANNUAL_EVENT_SEEDS = [
    { name: 'เสียงกระซิบจากผู้เดินทาง', path: 'insight', gain: 2 },
    { name: 'คู่แข่งที่ไม่ยอมแพ้', path: 'duty', gain: 2 },
    { name: 'ของตกหล่นริมทาง', path: 'freedom', gain: 1 },
    { name: 'คนแปลกหน้าขอความช่วยเหลือ', path: 'compassion', gain: 2 },
    { name: 'รอยแผลจากสัตว์ป่า', path: 'freedom', gain: 1 },
    { name: 'คำเตือนของผู้เฒ่า', path: 'insight', gain: 3 },
    { name: 'ข่าวลือจากตลาดมืด', path: 'freedom', gain: 2 },
    { name: 'จดหมายจากคนที่หายไป', path: 'compassion', gain: 2 }
  ];
  const ACTIVITY_EVENT_FRAMES = {
    train: { name: 'ระหว่างการฝึก', stat: 'hero.cultivation', path: 'insight', good: 'ความก้าวหน้า', bad: 'ชีพจรบาดเจ็บ' },
    work: { name: 'ระหว่างรับงาน', stat: 'hero.money', path: 'duty', good: 'ผลตอบแทน', bad: 'หนี้และค่าเสียหาย' },
    explore: { name: 'ระหว่างสำรวจ', stat: 'hero.reputation', path: 'freedom', good: 'ชื่อเสียง', bad: 'บาดแผลและข่าวลือ' },
    rest: { name: 'ระหว่างพักฟื้น', stat: 'hero.health', path: 'compassion', good: 'การฟื้นตัว', bad: 'ฝันร้ายและโรคแทรกซ้อน' },
    study: { name: 'ระหว่างเรียนรู้', stat: 'hero.attributes.intellect', path: 'insight', good: 'ความเข้าใจ', bad: 'ความสับสนและข้อมูลผิด' },
    social: { name: 'ระหว่างเข้าสังคม', stat: 'hero.attributes.charm', path: 'compassion', good: 'สายสัมพันธ์', bad: 'ข่าวลือและศัตรูใหม่' },
    craft: { name: 'ระหว่างสร้างของ', stat: 'hero.money', path: 'duty', good: 'ผลงานและทรัพย์สิน', bad: 'วัตถุดิบเสียหาย' },
    family: { name: 'ระหว่างดูแลครอบครัว', stat: 'hero.karma', path: 'compassion', good: 'รากฐานที่มั่นคง', bad: 'ความขัดแย้งในเรือน' },
    quest: { name: 'ระหว่างรับภารกิจ', stat: 'hero.reputation', path: 'duty', good: 'ความคืบหน้า', bad: 'ภารกิจล้มเหลว' },
    sect: { name: 'ระหว่างรับใช้สำนัก', stat: 'hero.reputation', path: 'duty', good: 'ผลงานและตำแหน่ง', bad: 'การเมืองในสำนัก' },
    travel: { name: 'ระหว่างเดินทาง', stat: 'hero.attributes.luck', path: 'freedom', good: 'โอกาสใหม่', bad: 'อันตรายระหว่างทาง' },
    free: { name: 'ระหว่างใช้ชีวิตอิสระ', stat: 'hero.attributes.luck', path: 'freedom', good: 'ประสบการณ์ชีวิต', bad: 'เวลาที่สูญเปล่า' }
  };
  let OFFICIAL_EVENTS;
  const LEARNING_TYPES = {
    lore: { name: 'ความรู้โลกและประวัติศาสตร์', stat: 'intellect', path: 'insight', gain: 2, unlock: null },
    cultivation: { name: 'คัมภีร์บำเพ็ญเพียร', stat: 'spirit', path: 'insight', gain: 2, unlock: 'basicCultivation' },
    martial: { name: 'วิชาต่อสู้และกระบวนท่า', stat: 'intellect', path: 'insight', gain: 2, unlock: 'swordLearned' },
    survival: { name: 'การเอาตัวรอดและเส้นทาง', stat: 'spirit', path: 'freedom', gain: 2, unlock: 'stepLearned' }
  };
  const LEARNING_AUTO_RULES = {
    balanced: { name: 'เรียนสมดุล', type: 'lore' },
    cultivation: { name: 'เน้นคัมภีร์บำเพ็ญ', type: 'cultivation' },
    martial: { name: 'เน้นวิชาต่อสู้', type: 'martial' },
    survival: { name: 'เน้นเอาตัวรอด', type: 'survival' }
  };

  function learningItemBonus(s) {
    return activeTreasures(s).reduce((total, item) => total + Number(itemBonus(item).learningRate || 0), 0);
  }

  function hasLearningItem(s, type = null) {
    return (s.treasures || []).some(item => {
      const bonus = item?.bonus || {};
      return Number(bonus.learningRate || 0) > 0 && (!type || !bonus.learningType || bonus.learningType === type);
    });
  }

  function learningTeacher(s, location = learningLocationKey(s)) {
    const isLinAnStory = s.mode === 'story' && s.characterId === 'lin-an';
    if (s.relations?.master >= 10 && !s.flags?.masterCrippled) return { id: 'master', name: isLinAnStory ? 'อาจารย์เหวินจง' : 'อาจารย์ผู้ชี้แนะ', multiplier: 1.25 };
    if (s.flags?.metSect && s.month >= 84 && location === 'sect') return { id: 'sect', name: 'ผู้อาวุโสสำนัก', multiplier: 1.2 };
    if (s.relations?.senior >= 8) return { id: 'senior', name: isLinAnStory ? 'ศิษย์พี่เซี่ยหลัน' : 'รุ่นพี่ร่วมวิชาชีพ', multiplier: 1.1 };
    return { id: 'self', name: 'ค้นคว้าด้วยตนเอง', multiplier: 1 };
  }

  function canUseLearningActivity(s) {
    if (s.mode !== 'story' || availableTechniqueManuals(s).length) return true;
    const location = learningLocationKey(s);
    return s.month >= 24 && (location === 'owned' || location === 'estate' || location === 'sect' || learningTeacher(s, location).id !== 'self');
  }

  function learningTypeAvailable(s, type) {
    if (!LEARNING_TYPES[type]) return false;
    if (type === 'cultivation') return !!(availableTechniqueManuals(s).some(item => item.learningType === 'cultivation') || s.flags?.basicCultivation || s.flags?.cultivationLearned || s.relations?.master >= 10 || s.flags?.metSect);
    if (type === 'martial') return !!(availableTechniqueManuals(s).length || s.flags?.swordLearned || s.flags?.bodyLearned || s.relations?.senior >= 8 || s.flags?.metSect);
    if (type === 'survival') return !!(availableTechniqueManuals(s).some(item => item.learningType === 'survival') || s.flags?.escapePrepared || s.flags?.foundMap || s.flags?.retainerAlive || s.mode === 'free');
    return true;
  }

  function chooseLearningType(s) {
    const learning = ensureLearningState(s);
    const requested = learning.autoRule === 'balanced' ? learning.focus : learning.autoRule;
    if (requested && learningTypeAvailable(s, requested)) return requested;
    return Object.keys(LEARNING_TYPES).find(type => learningTypeAvailable(s, type)) || 'lore';
  }

  function chooseLearningTechnique(s, type) {
    const learningFocus = ensureLearningState(s).techniqueFocus;
    if (learningFocus?.startsWith('manual:')) return null;
    const selectedTechnique = TECHNIQUES.find(technique => technique.id === learningFocus && technique.unlock(s));
    if (selectedTechnique) return selectedTechnique;
    const kindByType = { cultivation: 'cultivation', martial: 'combat', survival: 'movement' };
    return TECHNIQUES.find(technique => technique.id !== 'survival' && technique.unlock(s) && (!kindByType[type] || techniqueTrainingRule(technique).kind === kindByType[type])) || null;
  }

  function applyLearningProgress(s, type, route, teacher) {
    const learning = ensureLearningState(s); const def = LEARNING_TYPES[type];
    const itemMultiplier = 1 + learningItemBonus(s) / 100;
    const amount = Math.max(1, Math.round(def.gain * route.knowledgeGain * teacher.multiplier * itemMultiplier));
    learning.knowledge[type] = Math.min(100, Number(learning.knowledge[type] || 0) + amount);
    learning.lastType = type; learning.lastTeacher = teacher.id;
    const threshold = learning.knowledge[type] >= 3;
    if (threshold && def.unlock && teacher.id !== 'self' && !learning.techniqueFocus?.startsWith('manual:')) s.flags[def.unlock] = true;
    return amount;
  }

  let LEARNING_EVENTS;
  let FAMILY_EVENTS;
  let FREE_LIFE_EVENTS;
  function buildFreeLifeEventPool(s) {
    if (s.mode !== 'free' || s.activity !== 'free') return [];
    return FREE_LIFE_EVENTS.filter(event => !s.eventHistory.includes(event.id) && evaluateCondition(s, event.conditions));
  }

  // Each scene has a permanent ID shared across all years and activities.
  // Once resolved it is excluded for the rest of this life, even after reload.
  const UNIQUE_GRADED_SCENES = {
    uncommon: {
      infant: [
        ['herbal-cloth', 'ผ้าห่อยา', 'ผู้ดูแลได้รับผ้าห่อยาที่มีสมุนไพรอยู่ภายใน ผู้ให้บอกเพียงว่าเด็กอาจได้ใช้มันในฤดูหนาว', 'health'],
        ['lost-wage', 'เงินที่ตกหล่น', 'คนส่งเสบียงทำถุงเงินตกใกล้ผู้ดูแล และกำลังเดินจากไปโดยไม่รู้ตัว', 'reputation'],
        ['gentle-healer', 'หมอผู้เดินทาง', 'หมอเร่สังเกตเห็นผื่นเล็กน้อยบนตัวเจ้า และเสนอคำแนะนำแลกค่าเดินทาง', 'health'],
        ['warm-wrap', 'ผ้าห่มอีกผืน', 'คนรู้จักเสนอผ้าห่มหนาให้ผู้ดูแล แต่ขอความช่วยเหลือเล็กน้อยเป็นการตอบแทน', 'money']
      ],
      'young-child': [
        ['found-purse', 'ถุงเงินริมทาง', 'เจ้าพบถุงเงินใบเล็ก ผู้ดูแลเห็นรอยเย็บที่อาจช่วยตามหาเจ้าของ', 'reputation'],
        ['broken-toy', 'ของเล่นที่ซ่อมได้', 'เด็กอีกคนทำของเล่นหักและขอให้เจ้าช่วย ผู้ดูแลมีวัสดุเหลืออยู่เล็กน้อย', 'intellect'],
        ['herb-label', 'ป้ายชื่อสมุนไพร', 'ผู้เก็บยาขอให้เจ้ากับผู้ดูแลช่วยแยกสมุนไพรที่ติดป้ายสลับกัน', 'intellect'],
        ['hungry-traveler', 'อาหารสำหรับคนเดินทาง', 'คนเดินทางหิวโหยขออาหาร ผู้ดูแลชวนเจ้าเลือกว่าแบ่งให้เพียงใด', 'reputation']
      ],
      child: [
        ['missing-token', 'ป้ายที่หายไป', 'เด็กคนหนึ่งทำป้ายส่งของหาย หากหาไม่พบผู้รับอาจไม่เชื่อว่าเขาได้รับมอบหมาย', 'intellect'],
        ['leaking-bundle', 'ห่อของเปียกฝน', 'คนขายยาขอให้เจ้าช่วยแยกของที่เปียกฝนก่อนสมุนไพรเสียหาย และเสนอสมุนไพรแห้งเป็นค่าตอบแทน', 'money'],
        ['wrong-message', 'ข่าวส่งผิดคน', 'เจ้าพบว่าข้อความที่ส่งต่อกันอาจผิดเพียงคำเดียว แต่ความหมายเปลี่ยนไปมาก', 'reputation'],
        ['minor-contest', 'การแข่งขันเล็ก ๆ', 'คนวัยเดียวกันชวนแข่งความแม่นยำโดยใช้รางวัลที่แต่ละคนหามาเอง', 'bodyFoundation']
      ],
      adult: [
        ['split-payment', 'ค่าจ้างที่แบ่งไม่ลงตัว', 'คนรับงานสองคนโต้เถียงเรื่องส่วนแบ่ง และขอให้เจ้าช่วยตรวจข้อตกลง', 'money'],
        ['herb-exchange', 'สมุนไพรสลับห่อ', 'ผู้ขายพบว่าสมุนไพรสองห่อถูกติดชื่อสลับกัน และต้องการคนช่วยตรวจโดยเร็ว', 'intellect'],
        ['road-witness', 'พยานบนเส้นทาง', 'ผู้เดินทางขอให้เจ้ายืนยันสิ่งที่เห็นก่อนเขาถูกกล่าวหาว่าผิดสัญญา', 'reputation'],
        ['tired-carrier', 'ภาระของคนส่งของ', 'คนส่งของบาดเจ็บเล็กน้อยและเสนอค่าตอบแทนให้ช่วยส่งงานส่วนที่เหลือ', 'money']
      ]
    },
    extraordinary: {
      infant: [
        ['sealed-remedy', 'ยาที่มีตราปิดผนึก', 'หมอพบยาห่อหนึ่งที่อาจช่วยอาการของเจ้า แต่ตราบนห่อเป็นของผู้รักษาที่ไม่มีใครรู้จัก', 'health'],
        ['borrowed-name', 'ชื่อในทะเบียนเก่า', 'ผู้ดูแลพบชื่อเด็กตรงกับชื่อเจ้าในทะเบียนเดินทางเก่า ทั้งที่วันที่ในบันทึกไม่ตรงกัน', 'intellect'],
        ['pursued-messenger', 'ผู้ส่งสารบาดเจ็บ', 'ผู้ส่งสารบาดเจ็บขอซ่อนเอกสารไว้กับผู้ดูแล เสียงผู้ไล่ตามดังใกล้เข้ามา', 'reputation'],
        ['medicine-debt', 'หนี้ค่ายา', 'หมอเสนอรักษาเจ้าโดยไม่รับเงินทันที แต่ผู้ดูแลต้องรับปากทำงานชดใช้ภายหลัง', 'health']
      ],
      'young-child': [
        ['coded-rhyme', 'บทกลอนที่ซ่อนทาง', 'เจ้าจำบทกลอนจากคนเดินทางได้ ผู้ดูแลพบว่าคำบางคำตรงกับชื่อจุดหมายในแผนที่', 'intellect'],
        ['silent-compass', 'เข็มทิศไม่ชี้เหนือ', 'เข็มทิศที่เจ้าพบไม่ชี้ทิศเหนือ ผู้ดูแลสังเกตว่ามันหมุนเมื่อเข้าใกล้ห่อผ้าเก่า', 'intellect'],
        ['fugitive-child', 'เด็กที่ถูกตามหา', 'เด็กคนหนึ่งขอให้เจ้ากับผู้ดูแลช่วยซ่อนตัว แต่คนที่ตามหาอ้างว่าเป็นผู้คุ้มครองเขา', 'reputation'],
        ['unusual-seed', 'เมล็ดในกล่องหยก', 'พ่อค้าให้เมล็ดประหลาดแก่เจ้า ผู้ดูแลรู้ว่ามันอาจมีราคาหรือเป็นยาที่ต้องใช้ให้ถูกวิธี', 'money']
      ],
      child: [
        ['false-map', 'แผนที่สองฉบับ', 'ผู้เดินทางสองคนมีแผนที่ทางเดียวกันแต่จุดอันตรายต่างกัน ทั้งคู่ขอให้เจ้าช่วยตรวจ', 'intellect'],
        ['hidden-ledger', 'บัญชีใต้แผ่นไม้', 'เจ้าพบบัญชีที่ระบุชื่อผู้ส่งเสบียงซึ่งถูกกล่าวหาว่าโกง แต่ตัวเลขในนั้นไม่ตรงกับคำกล่าวหา', 'reputation'],
        ['wounded-courier', 'ข่าวจากคนส่งสาร', 'คนส่งสารบาดเจ็บฝากข่าวเตือนภัยไว้กับเจ้า แต่ไม่รู้ว่าผู้ใดในกลุ่มผู้รับไว้ใจได้', 'reputation'],
        ['strange-exercise', 'ท่าฝึกจากภาพเก่า', 'ภาพท่าฝึกที่เจ้าพบมีคำเตือนให้เริ่มช้า ๆ ผู้มีประสบการณ์เสนอช่วยตรวจท่าก่อนลอง', 'bodyFoundation']
      ],
      adult: [
        ['counterfeit-seal', 'ตราประทับปลอม', 'เอกสารว่าจ้างมีตราที่คล้ายของทางการ แต่รอยหมึกเผยว่ามีบางส่วนถูกแก้ไข', 'intellect'],
        ['medicine-caravan', 'ขบวนยาที่หายไป', 'ผู้ส่งยาเสนอรางวัลให้ช่วยตามขบวนที่ขาดการติดต่อ โดยมีร่องรอยชี้ไปสองทาง', 'money'],
        ['disputed-testimony', 'คำให้การที่ขัดกัน', 'พยานสองคนเล่าเหตุเดียวกันไม่ตรงกัน และทั้งคู่ต่างถูกกดดันให้เปลี่ยนคำพูด', 'reputation'],
        ['buried-technique', 'วิชาที่เขียนทับ', 'บันทึกการฝึกเก่ามีลายมือใหม่เขียนทับคำเตือนเดิม บางส่วนยังพออ่านได้', 'bodyFoundation']
      ]
    },
    epic: {
      infant: [
        ['evacuation-choice', 'เส้นทางอพยพ', 'ข่าวการปะทะมาถึงก่อนผู้ลี้ภัย ผู้ดูแลต้องเลือกระหว่างขบวนใหญ่กับทางอ้อมที่ยังไม่สำรวจ', 'health'],
        ['dangerous-scroll', 'คัมภีร์ในห่อเสบียง', 'คัมภีร์ลับถูกซ่อนไว้ในห่อเสบียงของเจ้าโดยไม่มีใครรู้ ผู้ตามหามอบรางวัลแก่ผู้ส่งคืน', 'money'],
        ['healer-conflict', 'หมอสองฝ่าย', 'หมอสองคนเสนอวิธีรักษาต่างกัน คนหนึ่งเตือนว่าอีกวิธีอาจซ่อนผลเสียระยะยาว', 'health'],
        ['contested-protection', 'คำมั่นคุ้มครอง', 'สองกลุ่มเสนอพาผู้ดูแลและเจ้าไปยังที่ปลอดภัย แต่ทั้งสองฝ่ายไม่ไว้ใจกัน', 'reputation']
      ],
      'young-child': [
        ['witnessed-ambush', 'พยานการซุ่มโจมตี', 'เจ้าเห็นตราของผู้โจมตีก่อนผู้ดูแลพาหลบ ผู้รอดชีวิตขอให้บอกสิ่งที่เห็นแก่คนสองฝ่าย', 'reputation'],
        ['hidden-supplies', 'เสบียงที่ถูกซ่อน', 'เจ้าพบเครื่องหมายบนห่อเสบียงที่หายไป ผู้ดูแลรู้ว่าการเปิดเผยตำแหน่งอาจกระทบผู้ลี้ภัย', 'money'],
        ['rare-fever', 'ไข้ประหลาด', 'เด็กหลายคนมีไข้พร้อมกัน หมอขอให้ผู้ดูแลช่วยตรวจที่มาของน้ำและสมุนไพร', 'health'],
        ['rival-messengers', 'ผู้ส่งสารสองฝ่าย', 'ผู้ส่งสารสองฝ่ายต่างขอให้ผู้ดูแลนำข่าวไปส่ง และต่างอ้างว่าอีกฝ่ายกำลังโกหก', 'intellect']
      ],
      child: [
        ['broken-truce', 'สัญญาสงบศึกที่ฉีกขาด', 'เจ้าพบสำเนาข้อตกลงที่มีข้อความต่างจากฉบับประกาศ ขณะคนสองกลุ่มกำลังเตรียมต่อสู้', 'reputation'],
        ['poisoned-well', 'เบาะแสยาพิษ', 'ผู้รักษาพบว่าคนป่วยหลายคนมีอาการคล้ายกัน เจ้าถือข้อมูลที่อาจช่วยหาที่มาของพิษ', 'health'],
        ['stolen-register', 'ทะเบียนผู้สูญหาย', 'ทะเบียนที่เจ้าพบมีรายชื่อผู้สูญหายและสัญลักษณ์ที่อาจนำไปถึงผู้กักตัวพวกเขา', 'intellect'],
        ['merchant-hostage', 'ตัวประกันในขบวน', 'เจ้ารู้ว่าขบวนสินค้ามีคนถูกบังคับให้เดินทางไปด้วย ขณะที่ผู้คุมเสนอเงินให้ปิดปาก', 'reputation']
      ],
      adult: [
        ['war-supply', 'เสบียงก่อนศึก', 'บัญชีเสบียงเผยว่าของที่ควรส่งให้ผู้ลี้ภัยกำลังถูกเปลี่ยนเส้นทางไปยังกองกำลังติดอาวุธ', 'reputation'],
        ['plague-source', 'ต้นตอโรคระบาด', 'ผู้รักษาพบหลักฐานเชื่อมผู้ป่วยหลายกลุ่มกับแหล่งยาเดียวกัน แต่ผู้ขายมีผู้มีอำนาจคุ้มครอง', 'health'],
        ['secret-alliance', 'สัญญาลับสองฝ่าย', 'เจ้าได้รับสำเนาสัญญาที่อาจหยุดการต่อสู้ได้ แต่การเปิดเผยผู้ลงนามจะทำให้พยานตกอยู่ในอันตราย', 'intellect'],
        ['rival-convoy', 'ขบวนที่ถูกล้อม', 'ขบวนสองฝ่ายติดอยู่ในเส้นทางเดียวกัน ฝ่ายหนึ่งมีเสบียง อีกฝ่ายมีผู้บาดเจ็บและกำลังขอความช่วยเหลือ', 'money']
      ]
    }
  };

  const EXTRA_GRADED_SCENES = {
  "uncommon": {
    "infant": [
      [
        "cloth",
        "ผ้าห่อที่ชำรุด",
        "ผู้ดูแลพบว่าผ้าห่อเด็กขาด คนเดินทางเสนอผืนใหม่แลกกับการช่วยซ่อมของ",
        "health"
      ],
      [
        "porridge",
        "ข้าวต้มสำหรับเด็ก",
        "ผู้ขายอาหารเสนอข้าวต้มให้ผู้ดูแล แต่ขอให้ช่วยส่งข่าวตอบแทน",
        "health"
      ],
      [
        "rain",
        "หลบฝนระหว่างทาง",
        "ฝนตกหนัก ผู้ดูแลพบคนชราที่ต้องการช่วยยกสัมภาระก่อนหาที่หลบ",
        "reputation"
      ],
      [
        "bowl",
        "ถ้วยยาของหมอ",
        "หมอทำถ้วยยาหายและขอให้ผู้ดูแลช่วยหา ก่อนเตรียมยาสำหรับเด็ก",
        "health"
      ],
      [
        "basket",
        "ตะกร้าที่ถูกสลับ",
        "ผู้ดูแลพบว่าตะกร้าเสบียงถูกสลับกับของคนอื่น เจ้าของกำลังรออยู่ใกล้ ๆ",
        "reputation"
      ],
      [
        "coin",
        "เหรียญใต้ห่อผ้า",
        "ผู้ดูแลพบเหรียญที่ไม่ใช่ของตน คนส่งของบอกว่าอาจมีผู้ทำตกไว้",
        "money"
      ],
      [
        "song",
        "เพลงกล่อมจากคนเดินทาง",
        "คนเดินทางแลกเปลี่ยนเพลงกล่อมเด็กกับคำแนะนำเรื่องดูแลอาการไอ",
        "health"
      ],
      [
        "package",
        "ห่อผ้าที่ฝากไว้",
        "คนรู้จักฝากห่อผ้าไว้กับผู้ดูแล ก่อนมีคนอีกผู้หนึ่งมาขอรับแทน",
        "intellect"
      ]
    ],
    "young-child": [
      [
        "drawing",
        "ภาพที่ส่งผิด",
        "เจ้าวาดรูปบนกระดาษที่มีข้อความสำคัญ ผู้ดูแลเสนอให้ช่วยคัดข้อความคืน",
        "intellect"
      ],
      [
        "kite",
        "ว่าวติดเชือก",
        "ว่าวของเด็กคนหนึ่งติดอยู่กับเชือกของผู้เดินทาง ผู้ดูแลช่วยไกล่เกลี่ย",
        "reputation"
      ],
      [
        "seeds",
        "เมล็ดที่ปะปน",
        "ผู้ปลูกผักขอให้เจ้าและผู้ดูแลแยกเมล็ดสองชนิดที่ปนกัน",
        "intellect"
      ],
      [
        "bundle",
        "ห่อของส่งผิด",
        "เจ้าเห็นห่อของที่ส่งผิดคน ผู้ดูแลชวนให้ช่วยตามหาเจ้าของ",
        "reputation"
      ],
      [
        "cup",
        "ถ้วยที่บิ่น",
        "เจ้าทำถ้วยของคนรู้จักบิ่น ผู้ดูแลถามว่าจะบอกความจริงและช่วยหาของทดแทนหรือไม่",
        "reputation"
      ],
      [
        "shoe",
        "รองเท้าหลงคู่",
        "เด็กคนหนึ่งสวมรองเท้าสลับกับเจ้า ผู้ใหญ่ทั้งสองช่วยกันหาคู่ที่ถูกต้อง",
        "health"
      ],
      [
        "song",
        "เพลงที่จำผิด",
        "ผู้เล่านิทานขอให้เจ้าช่วยจำท่อนเพลงที่ขาดหาย แลกกับบทเรียนเรื่องตัวอักษร",
        "intellect"
      ],
      [
        "basket",
        "ตะกร้าของคนขาย",
        "คนขายของขอให้เจ้าเก็บของที่หล่น ผู้ดูแลช่วยดูให้ปลอดภัย",
        "money"
      ]
    ],
    "child": [
      [
        "errand",
        "ของส่งสองชิ้น",
        "คนส่งของขอให้เจ้าช่วยแยกห่อที่มีชื่อผู้รับคล้ายกันก่อนส่งผิด",
        "money"
      ],
      [
        "torn-page",
        "หน้ากระดาษฉีก",
        "เพื่อนทำหน้าบันทึกฉีกและขอให้เจ้าช่วยเรียงข้อความให้ครบ",
        "intellect"
      ],
      [
        "stray-dog",
        "สุนัขหลงทาง",
        "สุนัขตัวหนึ่งเดินตามเจ้า คนใกล้เคียงกำลังถามหาสัตว์เลี้ยงที่หายไป",
        "reputation"
      ],
      [
        "practice",
        "ท่าที่ยังไม่มั่นคง",
        "ผู้ฝึกคนหนึ่งเสนอช่วยดูท่าพื้นฐานของเจ้าแลกกับการช่วยเก็บอุปกรณ์",
        "bodyFoundation"
      ],
      [
        "missing-change",
        "เงินทอนเกิน",
        "คนขายให้เงินทอนเกินและยังไม่รู้ตัว เจ้ามีโอกาสทักก่อนจากกัน",
        "reputation"
      ],
      [
        "herb",
        "สมุนไพรคู่คล้าย",
        "ผู้เก็บยาขอให้เจ้าช่วยแยกใบไม้สองชนิดที่มีสีคล้ายกัน",
        "intellect"
      ],
      [
        "parcel",
        "ห่อของเพื่อน",
        "เพื่อนขอให้เจ้าช่วยถือห่อของหนัก แต่เจ้ายังมีธุระของตัวเอง",
        "health"
      ],
      [
        "argument",
        "คำสัญญาในกลุ่มเด็ก",
        "เด็กสองคนจำข้อตกลงเรื่องเล่นไม่เหมือนกันและขอให้เจ้าเป็นพยาน",
        "reputation"
      ]
    ],
    "adult": [
      [
        "measure",
        "ตาชั่งคลาดเคลื่อน",
        "ผู้ขายพบว่าตาชั่งคลาดเคลื่อนและขอให้เจ้าช่วยตรวจสินค้าที่ขายไปแล้ว",
        "reputation"
      ],
      [
        "cart",
        "ล้อรถเข็น",
        "รถเข็นของคนส่งของติดขัด เจ้าของเสนอค่าจ้างให้ช่วยซ่อม",
        "money"
      ],
      [
        "receipt",
        "ใบรับของหาย",
        "ลูกจ้างทำใบรับของหาย ผู้ว่าจ้างยอมรอหากมีพยานยืนยัน",
        "reputation"
      ],
      [
        "recipe",
        "สูตรที่ลืมขั้นตอน",
        "ช่างขอให้เจ้าช่วยตรวจบันทึกขั้นตอนที่เขาเขียนสลับกัน",
        "intellect"
      ],
      [
        "strap",
        "สายสัมภาระขาด",
        "คนเดินทางขอให้ช่วยใช้เชือกของเขาผูกสัมภาระที่หลุดระหว่างทาง",
        "health"
      ],
      [
        "delivery",
        "ส่งของแทน",
        "ผู้รับงานมีธุระฉุกเฉินและเสนอค่าตอบแทนให้เจ้าส่งห่อเล็กแทน",
        "money"
      ],
      [
        "herbs",
        "ยาที่เก็บผิด",
        "ผู้รักษาขอให้ช่วยตรวจห่อยาที่ติดชื่อไม่ตรงก่อนจ่ายให้คนไข้",
        "intellect"
      ],
      [
        "witness",
        "ข้อตกลงปากเปล่า",
        "คนสองคนจำข้อตกลงไม่ตรงกันและขอให้เจ้าฟังทั้งสองฝ่าย",
        "reputation"
      ]
    ]
  },
  "extraordinary": {
    "infant": [
      [
        "mark",
        "รอยหมึกบนห่อผ้า",
        "ผู้ดูแลพบรอยหมึกแปลกบนห่อผ้า หมอเร่รู้จักสัญลักษณ์แต่ไม่ยอมบอกที่มาโดยไม่มีค่าตอบแทน",
        "intellect"
      ],
      [
        "bell",
        "กระดิ่งที่มีตรา",
        "กระดิ่งที่ติดมากับห่อของมีตราของกลุ่มพ่อค้า คนแปลกหน้าขอซื้อมันคืน",
        "money"
      ],
      [
        "medicine",
        "รายการยาสองฉบับ",
        "หมอมอบรายการยาให้ผู้ดูแล แต่รายการอีกฉบับระบุสมุนไพรต่างออกไป",
        "health"
      ],
      [
        "escort",
        "คนคุ้มกันที่ไม่รู้จัก",
        "คนแปลกหน้าเสนอคุ้มกันผู้ดูแลและเด็ก โดยอ้างว่าได้รับคำสั่งจากคนรู้จักเก่า",
        "reputation"
      ],
      [
        "water",
        "น้ำที่มีกลิ่นแปลก",
        "ผู้ดูแลพบว่าน้ำสำหรับต้มยามีกลิ่นผิดปกติ ขณะที่ผู้ขายยืนยันว่าปลอดภัย",
        "health"
      ],
      [
        "letter",
        "จดหมายใต้ตะเข็บ",
        "ผู้ดูแลพบจดหมายในตะเข็บผ้าห่อเด็ก มีชื่อคนที่กำลังถูกตามหา",
        "intellect"
      ],
      [
        "traveler",
        "ผู้โดยสารป่วย",
        "คนเดินทางป่วยขอความช่วยเหลือ หมอเตือนให้ผู้ดูแลระวังการติดเชื้อ",
        "health"
      ],
      [
        "payment",
        "ค่าจ้างจากคนไร้ชื่อ",
        "ผู้ดูแลได้รับค่าจ้างให้ส่งห่อของพร้อมเด็ก แต่ไม่มีชื่อผู้รับชัดเจน",
        "money"
      ]
    ],
    "young-child": [
      [
        "stone",
        "หินที่เปลี่ยนสี",
        "เจ้าพบหินที่เปลี่ยนสีเมื่อถูกน้ำ ผู้รู้สองคนเสนอคำอธิบายต่างกัน",
        "intellect"
      ],
      [
        "ribbon",
        "ริบบิ้นของเด็กหลง",
        "เด็กหลงทางถือริบบิ้นที่ตรงกับประกาศตามหา แต่มีคนอื่นอ้างว่าเป็นญาติ",
        "reputation"
      ],
      [
        "scroll",
        "ม้วนกระดาษกันน้ำ",
        "เจ้าพบม้วนกระดาษที่ซ่อนในห่อกันน้ำ ผู้ดูแลเห็นตราของผู้ส่งสาร",
        "intellect"
      ],
      [
        "bell",
        "เสียงจากกระดิ่ง",
        "กระดิ่งที่เจ้าพบส่งเสียงเมื่อเข้าใกล้ห่อโลหะ ผู้ดูแลสงสัยว่ามันใช้ตามหาของ",
        "money"
      ],
      [
        "medicine",
        "ยาของคนเดินทาง",
        "คนเดินทางมอบยาให้เจ้า ผู้ดูแลพบฉลากที่ถูกขูดชื่อผู้ปรุงออก",
        "health"
      ],
      [
        "carving",
        "รูปสลักสองหน้า",
        "เจ้าพบรูปสลักเล็กที่มีสัญลักษณ์ต่างกันสองด้าน พ่อค้าสองคนต่างอยากได้",
        "money"
      ],
      [
        "warning",
        "คำเตือนในเพลง",
        "เจ้าจำเพลงของคนแปลกหน้าได้ ผู้ดูแลสังเกตว่าท่อนหนึ่งอาจบอกเวลาเกิดภัย",
        "intellect"
      ],
      [
        "animal",
        "สัตว์บาดเจ็บ",
        "เจ้าพบสัตว์บาดเจ็บพร้อมปลอกคอมีตรา คนตามหาสองกลุ่มอ้างว่าเป็นเจ้าของ",
        "reputation"
      ]
    ],
    "child": [
      [
        "sealed-box",
        "กล่องที่ล็อกสองชั้น",
        "เจ้าพบกล่องส่งของที่ถูกเปิดทิ้งไว้ ข้างในมีรายชื่อและตราสองฝ่าย",
        "intellect"
      ],
      [
        "claim",
        "คำกล่าวหาของลูกศิษย์",
        "เด็กฝึกคนหนึ่งถูกกล่าวหาว่าขโมยของ แต่เจ้าพบพยานที่เห็นต่างออกไป",
        "reputation"
      ],
      [
        "trail",
        "รอยเท้าสองชุด",
        "ผู้ตามหาคนหายขอให้เจ้าช่วยสังเกตรอยเท้าที่แยกไปคนละทาง",
        "intellect"
      ],
      [
        "herb",
        "สมุนไพรที่ถูกแทนที่",
        "ผู้รักษาพบสมุนไพรถูกเปลี่ยนในห่อ เจ้าจำคนส่งของคนสุดท้ายได้",
        "health"
      ],
      [
        "song",
        "กลอนส่งข่าว",
        "กลอนที่เด็กท่องเล่นตรงกับข้อความในประกาศเตือนภัย ผู้ใหญ่ขอให้เจ้าช่วยทวน",
        "intellect"
      ],
      [
        "merchant",
        "พ่อค้ากับเหรียญปลอม",
        "พ่อค้าพบเหรียญปลอมในถุงของลูกค้าและขอให้เจ้าช่วยบอกว่าเห็นใครจับถุงนั้น",
        "reputation"
      ],
      [
        "practice",
        "ตำราฝึกมีคำเตือน",
        "ผู้ฝึกยื่นบันทึกท่าให้เจ้า แต่หน้าคำเตือนหายไป ผู้รู้เสนอช่วยหาข้อมูล",
        "bodyFoundation"
      ],
      [
        "courier",
        "ข่าวที่ต้องส่งก่อนค่ำ",
        "ผู้ส่งสารบาดเจ็บฝากข่าวให้เจ้า แต่ผู้รับมีชื่อคล้ายกันสองคน",
        "reputation"
      ]
    ],
    "adult": [
      [
        "contract",
        "สัญญาที่มีตราซ้อน",
        "สัญญาจ้างมีตราใหม่ทับตราเก่า ผู้ว่าจ้างเร่งให้ลงชื่อก่อนตรวจ",
        "intellect"
      ],
      [
        "shipment",
        "สินค้าขาดหาย",
        "บัญชีสินค้าระบุห่อสมุนไพรเกินมาหนึ่งห่อ คนส่งและผู้รับกล่าวโทษกันว่าใครเป็นเจ้าของ",
        "money"
      ],
      [
        "witness",
        "พยานที่เปลี่ยนคำ",
        "พยานเปลี่ยนคำให้การหลังได้รับจดหมาย เจ้าพบว่าลายมือในจดหมายไม่ใช่ผู้ส่งที่อ้าง",
        "reputation"
      ],
      [
        "healer",
        "ตำรับยาที่ขัดแย้ง",
        "ผู้รักษาสองคนใช้ตำรับต่างกันกับอาการเดียวกัน และขอให้เจ้าช่วยหาแหล่งบันทึก",
        "health"
      ],
      [
        "training",
        "บันทึกท่าที่หาย",
        "บันทึกฝึกที่ได้มาขาดหน้าสำคัญ ผู้รู้เสนอแลกความรู้กับการช่วยงาน",
        "bodyFoundation"
      ],
      [
        "route",
        "หลักเขตที่ถูกย้าย",
        "ผู้เดินทางพบหลักเขตอยู่ผิดตำแหน่ง และสงสัยว่ามีคนตั้งใจเปลี่ยนเส้นทาง",
        "intellect"
      ],
      [
        "cargo",
        "ห่อสินค้าปลอม",
        "พ่อค้าขอให้เจ้าช่วยตรวจสินค้าที่มีตราคล้ายของแท้แต่รายละเอียดไม่ตรง",
        "money"
      ],
      [
        "promise",
        "คำมั่นที่มีพยาน",
        "คนรู้จักถูกกล่าวหาว่าผิดคำมั่น เจ้าจำรายละเอียดที่คนกล่าวหาไม่ได้พูดถึง",
        "reputation"
      ]
    ]
  },
  "epic": {
    "infant": [
      [
        "refugees",
        "ขบวนผู้ลี้ภัยที่แยกทาง",
        "ผู้ดูแลพบว่าขบวนผู้ลี้ภัยแยกเป็นสองสาย หลังมีข่าวว่าทางหนึ่งถูกปิด",
        "health"
      ],
      [
        "healer",
        "ยาชุดสุดท้าย",
        "หมอมีสมุนไพรเหลือเพียงชุดเดียวสำหรับเด็กป่วยหลายคน และขอให้ผู้ดูแลช่วยหาเพิ่ม",
        "health"
      ],
      [
        "writ",
        "เอกสารจับผิดคน",
        "คนถือเอกสารตามจับผู้ลี้ภัย แต่ชื่อในเอกสารคล้ายชื่อผู้ดูแลเพียงบางส่วน",
        "reputation"
      ],
      [
        "carrier",
        "คนส่งสารขอความช่วยเหลือ",
        "คนส่งสารบาดเจ็บมอบบัญชีเสบียงให้ผู้ดูแล ก่อนกลุ่มติดอาวุธมาถามหา",
        "intellect"
      ],
      [
        "storm",
        "พายุและเสบียง",
        "พายุทำให้เสบียงของผู้เดินทางเสียหาย ผู้ดูแลต้องตัดสินใจว่าจะร่วมแบ่งของกับกลุ่มอื่นหรือไม่",
        "money"
      ],
      [
        "rescue",
        "ผู้บาดเจ็บกับทางหนี",
        "ผู้ดูแลพบผู้บาดเจ็บขวางเส้นทางหนี ขณะที่ข่าวการปะทะใกล้เข้ามา",
        "reputation"
      ],
      [
        "remedy",
        "ยาที่ถูกแย่ง",
        "ผู้รักษาขอให้ผู้ดูแลช่วยนำยาให้เด็กป่วย แต่มีคนเสนอเงินสูงเพื่อซื้อยานั้น",
        "health"
      ],
      [
        "border",
        "ด่านที่ปิดกะทันหัน",
        "ด่านตรวจปิดกะทันหัน ผู้ดูแลได้รับข้อเสนอให้ใช้ทางอ้อมจากคนที่ไม่รู้จัก",
        "intellect"
      ]
    ],
    "young-child": [
      [
        "warning",
        "คำเตือนก่อนการปะทะ",
        "เจ้าได้ยินคนสองฝ่ายนัดหมายโจมตี ผู้ดูแลต้องตัดสินใจว่าจะเตือนใครก่อน",
        "reputation"
      ],
      [
        "supplies",
        "เสบียงขาดบัญชี",
        "เจ้าพบเครื่องหมายบนห่อที่ตรงกับเสบียงสูญหาย ผู้ดูแลรู้ว่าเจ้าของห่ออาจถูกกล่าวหา",
        "money"
      ],
      [
        "healer",
        "ตำรายาที่หาย",
        "ผู้รักษาขอให้ผู้ดูแลตามตำรายาที่หายไปก่อนคนไข้หลายคนอาการหนัก",
        "health"
      ],
      [
        "missing",
        "เด็กที่แยกจากขบวน",
        "เด็กอีกคนพลัดจากกลุ่มผู้ลี้ภัย ผู้ดูแลพบเบาะแสว่าอาจมีคนถูกพาไปผิดทาง",
        "reputation"
      ],
      [
        "message",
        "ข่าวที่ถูกเปลี่ยน",
        "เจ้าจำข้อความของผู้ส่งสารได้ต่างจากที่คนรับประกาศ ผู้ดูแลต้องเลือกว่าเชื่อฝ่ายใด",
        "intellect"
      ],
      [
        "medicine",
        "ยาที่มีผู้แย่งชิง",
        "หมอมอบยาสำหรับคนป่วยให้ผู้ดูแล แต่ผู้ติดอาวุธเสนอเงินเพื่อเอายาไป",
        "health"
      ],
      [
        "bridge",
        "ทางข้ามที่ชำรุด",
        "กลุ่มเดินทางพบว่าทางข้ามเสียหาย ผู้ดูแลต้องเลือกว่าจะช่วยตรวจทางหรือรอกลุ่มอื่น",
        "health"
      ],
      [
        "ledger",
        "บัญชีคนหาย",
        "เจ้าพบบัญชีรายชื่อที่ซ่อนในห่อผ้า ผู้ดูแลสังเกตว่ามีชื่อคนที่กำลังถูกตามหา",
        "intellect"
      ]
    ],
    "child": [
      [
        "witness",
        "พยานที่ถูกคุกคาม",
        "เจ้าพบพยานที่รู้เรื่องขบวนคนหาย แต่ผู้มีอำนาจกำลังหาตัวเขา",
        "reputation"
      ],
      [
        "supplies",
        "เสบียงที่ถูกยักย้าย",
        "เจ้าจำเครื่องหมายบนเสบียงได้ตรงกับของที่ควรส่งให้คนป่วย แต่ห่อนั้นอยู่กับคนติดอาวุธ",
        "money"
      ],
      [
        "fever",
        "ไข้ในกลุ่มเดินทาง",
        "คนในกลุ่มเดินทางล้มป่วยหลายคน ผู้รักษาขอให้เจ้าช่วยตรวจอาหารที่แต่ละคนกิน",
        "health"
      ],
      [
        "treaty",
        "ข้อตกลงก่อนศึก",
        "เจ้าพบสำเนาข้อตกลงซึ่งอาจหยุดการต่อสู้ แต่มีผู้กล่าวว่าเอกสารนั้นถูกปลอม",
        "intellect"
      ],
      [
        "prisoner",
        "ผู้ถูกจับผิดตัว",
        "ผู้ถูกจับบอกว่าตนไม่ใช่คนที่ถูกตามหา เจ้าจำรายละเอียดที่อาจพิสูจน์คำพูดได้",
        "reputation"
      ],
      [
        "poison",
        "ห่อยาที่ถูกเปลี่ยน",
        "ผู้รักษาพบว่ายาสำหรับคนเจ็บถูกเปลี่ยน เจ้ารู้ว่าผู้ใดถือห่อนั้นเป็นคนสุดท้าย",
        "health"
      ],
      [
        "route",
        "เส้นทางอพยพลวง",
        "แผนที่อพยพสองฉบับชี้ทางต่างกัน เจ้ารู้จักคนส่งฉบับหนึ่งแต่ไม่รู้ว่าเขาไว้ใจได้หรือไม่",
        "intellect"
      ],
      [
        "ransom",
        "ข้อเสนอแลกตัว",
        "กลุ่มติดอาวุธเสนอแลกตัวผู้ถูกจับกับห่อของสำคัญ เจ้าต้องช่วยผู้ใหญ่ตรวจว่าข้อเสนอน่าเชื่อหรือไม่",
        "reputation"
      ]
    ],
    "adult": [
      [
        "witness",
        "พยานก่อนตัดสินคดี",
        "พยานสำคัญยอมพูดหากได้รับการคุ้มครอง แต่ผู้ถูกกล่าวหามีอำนาจสั่งจับเขา",
        "reputation"
      ],
      [
        "medicine",
        "เส้นทางยาที่ถูกตัด",
        "ขบวนยาสำหรับคนป่วยถูกสกัด ผู้คุมทางเสนอปล่อยผ่านแลกกับชื่อผู้ส่ง",
        "health"
      ],
      [
        "contract",
        "สัญญาคุ้มกันลับ",
        "สัญญาคุ้มกันสินค้าซ่อนเงื่อนไขให้ส่งตัวพยานแก่ผู้ว่าจ้าง",
        "intellect"
      ],
      [
        "shortage",
        "บัญชีข้าวที่หายไป",
        "บัญชีเผยว่าเสบียงที่จัดให้ผู้ลี้ภัยถูกเบิกไปแล้ว แต่ไม่มีใครได้รับของ",
        "money"
      ],
      [
        "truce",
        "สารก่อนการเจรจา",
        "ผู้ส่งสารถือหลักฐานที่อาจช่วยหยุดการปะทะ แต่มีคนเสนอรางวัลให้ยึดมัน",
        "reputation"
      ],
      [
        "remedy",
        "สูตรรักษาที่ถูกปิดบัง",
        "ผู้รักษาพบว่าสูตรยาที่แจกจ่ายขาดส่วนสำคัญ ขณะที่ผู้จัดหายาปฏิเสธให้ตรวจ",
        "health"
      ],
      [
        "captives",
        "รายชื่อผู้ถูกจับ",
        "เจ้าพบบัญชีผู้ถูกจับซึ่งมีชื่อคนที่ทางการประกาศว่าเสียชีวิตไปแล้ว",
        "intellect"
      ],
      [
        "caravan",
        "ขบวนหลอกล่อ",
        "ผู้คุ้มกันขอให้เจ้าช่วยแยกขบวนจริงจากขบวนลวงก่อนกลุ่มโจรลงมือ",
        "money"
      ]
    ]
  }
};

  // Entries follow the authored scene order above. Each event is restricted to
  // activities in which its situation can plausibly occur.
  const GRADED_SCENE_ACTIVITIES = {
    uncommon: {
      infant: ['rest','travel','rest','rest','rest','rest','travel','rest','travel','travel','rest','travel'],
      'young-child': ['explore','craft','study','social','study','social','work','social','social','explore','study','work'],
      child: ['quest','work','social','train','study','explore','work','explore','train','work','study','social'],
      adult: ['work','craft','travel','work','work','work','work','study','travel','work','craft','social']
    },
    extraordinary: {
      infant: ['rest','travel','travel','rest','rest','rest','rest','travel','rest','travel','rest','travel'],
      'young-child': ['study','explore','social','explore','explore','social','rest','explore','study','social','rest','explore'],
      child: ['explore','quest','quest','train','explore','social','explore','study','study','social','train','quest'],
      adult: ['work','quest','social','train','work','work','quest','study','train','travel','work','social']
    },
    epic: {
      infant: ['travel','travel','rest','travel','travel','rest','travel','travel','travel','travel','rest','travel'],
      'young-child': ['travel','explore','rest','travel','travel','explore','rest','travel','travel','rest','travel','explore'],
      child: ['quest','study','quest','travel','quest','explore','rest','quest','quest','study','travel','quest'],
      adult: ['quest','study','quest','travel','quest','travel','quest','work','quest','study','quest','travel']
    }
  };

  // These discoveries state the reward in the scene itself; they are only
  // eligible while exploring and never grant a technique already mastered.
  let EXPLORATION_DISCOVERIES;
  const DISCOVERY_ACTIONS = {
    'uncommon/herb': ['ค่อย ๆ เก็บสมุนไพรบนไหล่ทาง', 'ดูจุดวางเท้าก่อนเข้าใกล้', 'ปล่อยสมุนไพรไว้ริมทาง'],
    'extraordinary/herb': ['เอื้อมเก็บสมุนไพรใต้ร่มหิน', 'ตรวจพื้นดินรอบร่มหินก่อน', 'ออกห่างจากพื้นดินที่ไม่มั่นคง'],
    'epic/herb': ['ฝ่าหมอกเข้าไปเก็บสมุนไพร', 'จำทางกลับก่อนเข้าใกล้หมอก', 'ไม่เสี่ยงหลงทางเพื่อสมุนไพร'],
    'uncommon/weapon': ['เก็บกระบี่ที่ถูกทิ้งไว้', 'ตรวจร่องรอยการต่อสู้จากรอบนอก', 'วางกระบี่ไว้ที่เดิม'],
    'extraordinary/weapon': ['เข้าไปนำห่อกระบี่ออกมา', 'ตรวจบริเวณรอบห่อก่อน', 'ไม่เข้าใกล้ห่อในพื้นที่เสี่ยง'],
    'epic/weapon': ['ฝ่าซากค่ายไปนำกระบี่ออกมา', 'ตรวจซากที่อาจพังจากระยะไกล', 'ทิ้งกระบี่ไว้ในซากค่าย'],
    'uncommon/manual': ['นำห่อกันฝนและคัมภีร์กระบี่ติดตัว', 'ตรวจหน้าที่ขาดจากภายนอกห่อ', 'ปล่อยบันทึกชำรุดไว้'],
    'extraordinary/manual': ['ยกหินเพื่อนำคัมภีร์กระบี่ออกมา', 'ตรวจรอยสัตว์ก่อนเข้าไป', 'ออกจากพื้นที่ที่มีรอยสัตว์'],
    'epic/manual': ['ฝ่าสิ่งกีดขวางเพื่อนำคัมภีร์กระบี่ออกมา', 'ตรวจสิ่งกีดขวางที่เสี่ยงพัง', 'ไม่ฝ่าซากเก่าเข้าไป'],
    'uncommon/manual_fist': ['นำห่อคัมภีร์หมัดออกจากสัมภาระเก่า', 'ดูสภาพผ้ากันฝนก่อนเปิดห่อ', 'ทิ้งสัมภาระเก่าไว้'],
    'extraordinary/manual_fist': ['เก็บคัมภีร์หมัดข้างแผ่นไม้', 'ตรวจรอยฝึกบนแผ่นไม้ก่อน', 'ไม่แตะคัมภีร์ข้างแผ่นไม้'],
    'epic/manual_fist': ['เข้าไปนำสมุดหมัดจากซากเก่า', 'ตรวจโครงซากที่อาจพัง', 'ออกจากซากโดยไม่เอาสมุด'],
    'uncommon/manual_blade': ['เก็บสมุดดาบจากห่อของที่ถูกทิ้ง', 'ตรวจห่อของผู้เดินทางก่อน', 'ปล่อยห่อไว้ข้างทาง'],
    'extraordinary/manual_blade': ['นำตำราดาบออกจากใต้รากไม้', 'ตรวจความลาดชันก่อนลงไป', 'ไม่ลงไปยังรากไม้'],
    'epic/manual_blade': ['นำม้วนดาบออกจากหลังแผ่นหิน', 'ตรวจว่าแผ่นหินมั่นคงหรือไม่', 'ถอยห่างจากแผ่นหิน'],
    'uncommon/manual_defense': ['นำบทคุ้มกายออกจากห่อเปียกฝน', 'ตรวจว่าห่อกระดาษเสียหายเพียงใด', 'ปล่อยห่อเปียกไว้'],
    'extraordinary/manual_defense': ['เปิดหีบเก่าเพื่อนำบันทึกรับแรง', 'สังเกตหีบและรอยทางรอบข้าง', 'ไม่เปิดหีบเก่า'],
    'epic/manual_defense': ['ฝ่าเศษหินเข้าไปนำตำราป้องกัน', 'ดูจังหวะเศษหินหล่นก่อนเข้าใกล้', 'ไม่เข้าไปในซากปรัก'],
    'uncommon/manual_movement': ['เก็บคัมภีร์ย่างก้าวพร้อมภาพรอยเท้า', 'สังเกตลำดับรอยเท้าบนผืนผ้า', 'วางผืนผ้าไว้ที่พบ'],
    'extraordinary/manual_movement': ['เก็บม้วนก้าวข้ามธารใกล้กระแสน้ำ', 'ดูกระแสน้ำก่อนเข้าใกล้', 'ถอยจากทางน้ำไหลเชี่ยว'],
    'epic/manual_movement': ['เข้าไปนำตำราจากที่ซ่อนกลางหมอก', 'จำทางกลับจากขอบหมอก', 'ไม่เสี่ยงเข้าไปในหมอก'],
    'uncommon/manual_cultivation': ['นำสมุดลมหายใจออกจากห่อผ้า', 'ตรวจสัมภาระรอบห่อก่อน', 'ปล่อยห่อผ้าไว้'],
    'extraordinary/manual_cultivation': ['เข้าไปนำม้วนโคจรปราณออกมา', 'ตรวจพื้นดินที่ไม่มั่นคงก่อน', 'ถอยจากบริเวณพื้นดินร่วน'],
    'epic/manual_cultivation': ['ฝ่าซากหอไปนำคัมภีร์ปราณ', 'สังเกตส่วนหอที่อาจพัง', 'ออกจากซากหอโดยไม่เอาคัมภีร์']
  };

  // Manual type determines the learned technique and its loadout slot.
  const { MANUAL_DISCOVERY_TYPES, EXTRA_MANUAL_SCENES, ADDITIONAL_MANUAL_TECHNIQUES, EXTRA_MANUAL_ACTIONS, ADDITIONAL_MANUAL_TYPES } = window.OneLifeTechniqueCatalog.createManualCatalog();
  function discoveryManualName(techniqueId) {
    const extra = ADDITIONAL_MANUAL_TECHNIQUES.find(t => t.id === techniqueId);
    if (extra) return `คัมภีร์${ADDITIONAL_MANUAL_TYPES[extra.type].label} · ${extra.name}`;
    const swords = { discovery_sword_uncommon: 'คัมภีร์กระบี่ทางไผ่', discovery_sword_rare: 'คัมภีร์กระบี่เงาหิน', discovery_sword_epic: 'คัมภีร์กระบี่ลวงหมอก' };
    if (swords[techniqueId]) return swords[techniqueId];
    const match = /^discovery_(fist|blade|defense|movement|cultivation)_(uncommon|rare|epic)$/.exec(techniqueId || '');
    if (!match) return null;
    const def = MANUAL_DISCOVERY_TYPES[match[1]];
    const index = ['uncommon', 'rare', 'epic'].indexOf(match[2]);
    const prefix = { fist: 'หมัด', blade: 'ดาบ', defense: 'คุ้มกาย', movement: 'ย่างก้าว', cultivation: 'บำเพ็ญ' }[match[1]];
    return `คัมภีร์${prefix} · ${def.names[index]}`;
  }

  // Actions are keyed by the authored situation, not by its reward category.
  // Keep keys stable: generated event IDs are also used by existing saves.
  const GRADED_SCENE_ACTIONS = {
    'uncommon/infant/herbal-cloth': ['เก็บสมุนไพรไว้สำหรับฤดูหนาว', 'ขอให้หมอตรวจสมุนไพรก่อนเก็บ', 'คืนห่อยาให้ผู้มอบ'],
    'uncommon/infant/lost-wage': ['รีบนำถุงเงินไปคืนคนส่งเสบียง', 'เรียกพยานก่อนส่งถุงเงินคืน', 'วางถุงเงินไว้ให้เจ้าของตามหา'],
    'uncommon/infant/gentle-healer': ['รับคำแนะนำและจ่ายค่าเดินทางให้หมอ', 'สอบถามวิธีดูแลผื่นก่อนตัดสินใจ', 'ปฏิเสธคำแนะนำของหมอ'],
    'uncommon/infant/warm-wrap': ['รับผ้าห่มและช่วยงานตอบแทน', 'ถามรายละเอียดงานก่อนรับผ้าห่ม', 'ขอบคุณและไม่รับผ้าห่ม'],
    'uncommon/infant/cloth': ['ช่วยซ่อมของแลกผ้าห่อผืนใหม่', 'ตรวจผ้าและถามรายละเอียดงานก่อน', 'ซ่อมผ้าเดิมและไม่รับข้อเสนอ'],
    'uncommon/infant/porridge': ['รับข้าวต้มและช่วยส่งข่าว', 'ถามจุดหมายของข่าวก่อนรับปาก', 'ไม่รับข้าวต้มหรือภาระส่งข่าว'],
    'uncommon/infant/rain': ['ช่วยคนชรายกสัมภาระไปยังที่หลบฝน', 'หาคนช่วยยกสัมภาระก่อน', 'พาเด็กไปหลบฝนก่อน'],
    'uncommon/infant/bowl': ['ช่วยหมอตามหาถ้วยยาที่หาย', 'ถามว่าหมอใช้ภาชนะอื่นแทนได้ไหม', 'ปล่อยให้หมอตามหาด้วยตนเอง'],
    'uncommon/infant/basket': ['นำตะกร้าไปแลกคืนกับเจ้าของ', 'ตรวจของในตะกร้าร่วมกับเจ้าของก่อน', 'วางตะกร้าไว้และแจ้งให้เจ้าของทราบ'],
    'uncommon/infant/coin': ['ตามหาคนที่ทำเหรียญตกเพื่อนำไปคืน', 'ถามคนส่งของว่าพบใครผ่านมาบ้าง', 'ฝากเหรียญไว้กับคนส่งของ'],
    'uncommon/infant/song': ['สอนเพลงกล่อมและขอคำแนะนำเรื่องไอ', 'ฟังคำแนะนำก่อนเลือกเพลงแลกเปลี่ยน', 'ขอบคุณและดูแลเด็กด้วยวิธีเดิม'],
    'uncommon/infant/package': ['มอบห่อผ้าให้ผู้มารับแทน', 'ตรวจว่าเจ้าของฝากให้ผู้ใดมารับ', 'เก็บห่อไว้รอเจ้าของมารับเอง'],
    'uncommon/young-child/found-purse': ['นำถุงเงินไปตามหาเจ้าของ', 'ชวนผู้ดูแลตรวจรอยเย็บก่อน', 'ฝากถุงเงินไว้กับผู้ดูแล'],
    'uncommon/young-child/broken-toy': ['ช่วยเพื่อนซ่อมของเล่นด้วยวัสดุที่มี', 'ให้ผู้ดูแลตรวจว่าซ่อมอย่างไรได้บ้าง', 'บอกเพื่อนว่ายังช่วยซ่อมไม่ได้'],
    'uncommon/young-child/herb-label': ['ช่วยแยกสมุนไพรและติดป้ายใหม่', 'ขอให้ผู้เก็บยาสอนแยกก่อน', 'ปล่อยให้ผู้เก็บยาจัดการเอง'],
    'uncommon/young-child/hungry-traveler': ['ขอผู้ดูแลแบ่งอาหารให้คนเดินทาง', 'ถามว่าคนเดินทางต้องการสิ่งใดก่อน', 'เก็บอาหารไว้สำหรับครอบครัว'],
    'uncommon/young-child/drawing': ['ช่วยผู้ดูแลคัดข้อความที่ถูกวาดทับ', 'ขอให้ผู้ดูแลอ่านต้นฉบับให้ฟังก่อน', 'หยุดวาดและให้ผู้ดูแลแก้ไขเอง'],
    'uncommon/young-child/kite': ['ช่วยคลายเชือกและคืนว่าวให้เพื่อน', 'ให้ผู้ดูแลพูดคุยกับเจ้าของเชือกก่อน', 'รอให้ผู้ใหญ่จัดการเชือก'],
    'uncommon/young-child/seeds': ['ช่วยคัดเมล็ดผักทั้งสองชนิด', 'ขอให้ผู้ปลูกผักสอนดูลักษณะเมล็ด', 'ปล่อยให้ผู้ปลูกผักคัดเอง'],
    'uncommon/young-child/bundle': ['ช่วยผู้ดูแลนำห่อไปคืนเจ้าของ', 'ตรวจชื่อบนห่อกับผู้ดูแลก่อน', 'ให้ผู้ดูแลติดต่อเจ้าของเอง'],
    'uncommon/young-child/cup': ['บอกความจริงและช่วยหาถ้วยทดแทน', 'ถามผู้ดูแลว่าซ่อมถ้วยได้ไหม', 'ให้ผู้ดูแลอธิบายแทน'],
    'uncommon/young-child/shoe': ['ช่วยเพื่อนหารองเท้าคู่ที่ถูกต้อง', 'เทียบขนาดรองเท้ากับผู้ใหญ่ก่อน', 'รอให้ผู้ใหญ่แลกรองเท้าคืน'],
    'uncommon/young-child/song': ['ท่องท่อนเพลงที่จำได้ให้ผู้เล่านิทาน', 'ขอฟังเพลงอีกครั้งก่อนลองจำ', 'ฟังนิทานโดยไม่ร่วมท่อง'],
    'uncommon/young-child/basket': ['ช่วยคนขายเก็บของที่หล่น', 'ให้ผู้ดูแลตรวจว่าของชิ้นใดแตกง่าย', 'ยืนรอผู้ดูแลในที่ปลอดภัย'],
    'uncommon/child/missing-token': ['ช่วยตามหาป้ายส่งของให้เด็กคนนั้น', 'ย้อนถามเส้นทางที่เขาเดินมาก่อน', 'ให้เด็กกลับไปตามหาป้ายเอง'],
    'uncommon/child/leaking-bundle': ['ช่วยคนขายแยกสมุนไพรที่เปียก', 'ถามวิธีเก็บสมุนไพรแต่ละชนิดก่อน', 'ปล่อยให้คนขายจัดการสินค้า'],
    'uncommon/child/wrong-message': ['รีบแจ้งผู้รับว่าข้อความอาจผิด', 'ตรวจข้อความต้นฉบับก่อนส่งข่าว', 'ไม่เข้าไปยุ่งกับข่าวที่ส่งต่อ'],
    'uncommon/child/minor-contest': ['ร่วมแข่งความแม่นยำกับเพื่อน', 'ดูกติกาและฝึกก่อนลงแข่ง', 'ปฏิเสธการแข่งขัน'],
    'uncommon/child/errand': ['ช่วยแยกห่อตามชื่อผู้รับ', 'ตรวจชื่อและปลายทางกับคนส่งของ', 'ให้คนส่งของแยกห่อเอง'],
    'uncommon/child/torn-page': ['ช่วยเพื่อนเรียงหน้าบันทึกที่ฉีก', 'อ่านลำดับข้อความก่อนลงมือ', 'ให้เพื่อนเก็บหน้ากระดาษไว้ซ่อมเอง'],
    'uncommon/child/stray-dog': ['พาสุนัขไปหาเจ้าของที่กำลังตามหา', 'ถามลักษณะสัตว์จากคนใกล้เคียงก่อน', 'ปล่อยสุนัขไว้ในบริเวณที่พบ'],
    'uncommon/child/practice': ['ช่วยเก็บอุปกรณ์แลกการตรวจท่า', 'ถามว่าผู้ฝึกจะสอนท่าใดก่อน', 'ปฏิเสธและฝึกตามลำพัง'],
    'uncommon/child/missing-change': ['ทักคนขายและคืนเงินทอนส่วนเกิน', 'นับเงินทอนอีกครั้งก่อนทัก', 'เดินจากร้านไป'],
    'uncommon/child/herb': ['ช่วยแยกใบไม้ให้ผู้เก็บยา', 'ขอให้ผู้เก็บยาชี้ความต่างก่อน', 'ไม่แตะสมุนไพรที่ไม่รู้จัก'],
    'uncommon/child/parcel': ['ช่วยเพื่อนถือห่อของไปส่ง', 'ถามระยะทางก่อนรับปาก', 'ปฏิเสธเพราะต้องไปทำธุระ'],
    'uncommon/child/argument': ['เล่าข้อตกลงที่จำได้ให้เด็กทั้งสองฟัง', 'ฟังคำบอกเล่าของทั้งคู่ก่อน', 'ไม่รับบทพยาน'],
    'uncommon/adult/split-payment': ['ตรวจข้อตกลงและช่วยแบ่งค่าจ้าง', 'ฟังเงื่อนไขจากคนรับงานทั้งสอง', 'ไม่รับหน้าที่แบ่งค่าจ้าง'],
    'uncommon/adult/herb-exchange': ['ช่วยตรวจและติดชื่อห่อสมุนไพรใหม่', 'เทียบห่อกับบันทึกของผู้ขายก่อน', 'ให้ผู้ขายตรวจห่อเอง'],
    'uncommon/adult/road-witness': ['ยืนยันสิ่งที่เห็นต่อผู้เกี่ยวข้อง', 'ถามรายละเอียดข้อกล่าวหาก่อนให้การ', 'ปฏิเสธการเป็นพยาน'],
    'uncommon/adult/tired-carrier': ['รับค่าตอบแทนและช่วยส่งของ', 'ถามปลายทางและสภาพห่อก่อน', 'ปฏิเสธงานส่งของ'],
    'uncommon/adult/measure': ['ช่วยตรวจสินค้าที่ขายด้วยตาชั่งผิด', 'ทดสอบตาชั่งกับน้ำหนักมาตรฐานก่อน', 'ให้ผู้ขายตรวจสินค้าเอง'],
    'uncommon/adult/cart': ['รับจ้างช่วยซ่อมล้อรถเข็น', 'ตรวจความเสียหายและตกลงค่าจ้างก่อน', 'ปฏิเสธงานซ่อม'],
    'uncommon/adult/receipt': ['ยืนยันการรับของให้ลูกจ้าง', 'ตรวจรายละเอียดกับผู้ว่าจ้างก่อน', 'ไม่รับรองสิ่งที่ยังไม่แน่ใจ'],
    'uncommon/adult/recipe': ['ช่วยเรียงขั้นตอนสูตรในบันทึก', 'ถามช่างถึงขั้นตอนที่จำได้ก่อน', 'คืนบันทึกให้ช่างตรวจเอง'],
    'uncommon/adult/strap': ['ช่วยผูกสัมภาระด้วยเชือกของคนเดินทาง', 'ตรวจว่าห่อใดต้องผูกให้แน่นก่อน', 'เดินทางต่อโดยไม่รับช่วย'],
    'uncommon/adult/delivery': ['รับค่าตอบแทนและส่งห่อแทน', 'ตรวจผู้รับและปลายทางก่อนรับงาน', 'ปฏิเสธงานส่งของ'],
    'uncommon/adult/herbs': ['ช่วยตรวจชื่อห่อยาก่อนส่งให้คนไข้', 'เทียบฉลากกับรายการยาก่อน', 'ปล่อยให้ผู้รักษาตรวจเอง'],
    'uncommon/adult/witness': ['ช่วยไกล่เกลี่ยข้อตกลงของทั้งสอง', 'ฟังคำบอกเล่าของแต่ละฝ่ายก่อน', 'ไม่เข้าไปตัดสินข้อพิพาท'],
    'epic/infant/evacuation-choice': ['ร่วมขบวนใหญ่เพื่อหนีการปะทะ', 'สอบถามผู้เดินทางเรื่องทางอ้อมก่อน', 'หาที่กำบังและรอข่าวเพิ่มเติม'],
    'epic/infant/dangerous-scroll': ['ส่งคัมภีร์คืนให้ผู้ตามหา', 'ตรวจว่าใครเป็นเจ้าของคัมภีร์ก่อน', 'ซ่อนห่อเสบียงและไม่เปิดเผยคัมภีร์'],
    'epic/infant/healer-conflict': ['เลือกให้หมอคนแรกเริ่มรักษา', 'ขอให้หมอทั้งสองอธิบายความเสี่ยง', 'ชะลอการรักษาจนกว่าจะได้ข้อมูลเพิ่ม'],
    'epic/infant/contested-protection': ['ขอเดินทางไปกับกลุ่มคุ้มครองฝ่ายแรก', 'สอบถามที่หมายและเหตุที่ทั้งสองขัดแย้ง', 'ไม่ร่วมเดินทางกับฝ่ายใด'],
    'epic/infant/refugees': ['ร่วมขบวนที่ยังเปิดทางผ่านได้', 'ถามข่าวจากคนที่เดินทางกลับมาก่อน', 'พักรอจนรู้ว่าทางใดปลอดภัย'],
    'epic/infant/healer': ['ช่วยหมอตามหาสมุนไพรเพิ่ม', 'ถามหมอว่าจะหาและแยกสมุนไพรอย่างไร', 'อยู่ดูแลเด็กและให้คนอื่นออกค้นหา'],
    'epic/infant/writ': ['แสดงตัวและอธิบายว่าชื่อไม่ตรง', 'ขอตรวจชื่อในเอกสารต่อหน้าพยาน', 'พาเด็กออกห่างจากผู้ถือเอกสาร'],
    'epic/infant/carrier': ['รับบัญชีและช่วยคนส่งสารหลบซ่อน', 'ตรวจบัญชีและถามว่าผู้ใดตามหา', 'ไม่รับบัญชีและพาเด็กออกห่าง'],
    'epic/infant/storm': ['ร่วมแบ่งเสบียงกับกลุ่มผู้เดินทาง', 'ตรวจเสบียงที่เหลือและตกลงส่วนแบ่งก่อน', 'เก็บเสบียงไว้สำหรับเด็ก'],
    'epic/infant/rescue': ['ช่วยพาผู้บาดเจ็บหนีไปด้วย', 'เรียกคนในขบวนมาช่วยขนย้าย', 'พาเด็กหนีออกจากพื้นที่ก่อน'],
    'epic/infant/remedy': ['นำยาไปส่งให้เด็กป่วยตามคำขอ', 'ขอให้ผู้รักษายืนยันผู้รับและเส้นทาง', 'คืนยาให้ผู้รักษาจัดการเอง'],
    'epic/infant/border': ['พาเด็กเดินทางตามผู้เสนอทางอ้อม', 'สอบถามเส้นทางจากผู้เดินทางคนอื่น', 'รอข่าวการเปิดด่าน'],
    'epic/young-child/witnessed-ambush': ['ให้ผู้ดูแลพาไปบอกตราที่เห็นแก่ผู้รอดชีวิต', 'เล่ารายละเอียดให้ผู้ดูแลฟังก่อน', 'อยู่กับผู้ดูแลโดยไม่ให้การ'],
    'epic/young-child/hidden-supplies': ['ให้ผู้ดูแลแจ้งเครื่องหมายแก่ผู้ตามหาเสบียง', 'ขอให้ผู้ดูแลตรวจว่าใครจะได้รับผลกระทบ', 'ไม่บอกตำแหน่งของห่อ'],
    'epic/young-child/rare-fever': ['ให้ผู้ดูแลช่วยหมอตรวจแหล่งน้ำ', 'ถามหมอว่าน้ำและสมุนไพรใดควรตรวจ', 'อยู่ห่างจากพื้นที่ที่มีคนป่วย'],
    'epic/young-child/rival-messengers': ['ให้ผู้ดูแลรับข่าวจากผู้ส่งสารฝ่ายแรกไปส่ง', 'ให้ผู้ดูแลสอบถามที่มาและผู้รับทั้งสองฝ่าย', 'ไม่รับข่าวจากฝ่ายใด'],
    'epic/young-child/warning': ['ให้ผู้ดูแลรีบเตือนคนที่อาจถูกโจมตี', 'เล่าข้อความที่ได้ยินให้ผู้ดูแลทวนก่อน', 'อยู่ในที่ปลอดภัยกับผู้ดูแล'],
    'epic/young-child/supplies': ['ให้ผู้ดูแลแจ้งเครื่องหมายแก่ผู้ตามหาเสบียง', 'ตรวจเครื่องหมายกับผู้ดูแลอีกครั้ง', 'ไม่เข้าไปเกี่ยวข้องกับห่อเสบียง'],
    'epic/young-child/healer': ['ให้ผู้ดูแลช่วยตามหาตำรายา', 'ถามผู้รักษาว่าพบตำราครั้งสุดท้ายที่ใด', 'อยู่กับผู้ดูแลและไม่ออกค้นหา'],
    'epic/young-child/missing': ['ให้ผู้ดูแลช่วยตามหาเด็กที่พลัดขบวน', 'บอกเบาะแสที่พบแก่ผู้ดูแลก่อน', 'รออยู่ในที่ปลอดภัย'],
    'epic/young-child/message': ['ให้ผู้ดูแลพาไปบอกข้อความที่จำได้', 'ทวนข้อความกับผู้ดูแลก่อนให้การ', 'ไม่เข้าไปเกี่ยวข้องกับข่าว'],
    'epic/young-child/medicine': ['ให้ผู้ดูแลนำยาไปส่งคนป่วย', 'ขอความช่วยเหลือจากหมอก่อนผ่านผู้ติดอาวุธ', 'คืนยาให้หมอและอยู่ห่างจากการเผชิญหน้า'],
    'epic/young-child/bridge': ['ให้ผู้ดูแลช่วยตรวจทางข้าม', 'ถามผู้เดินทางถึงสภาพทางก่อน', 'รอกลุ่มอื่นตรวจทางก่อน'],
    'epic/young-child/ledger': ['ให้ผู้ดูแลนำบัญชีไปแจ้งผู้ตามหาคนหาย', 'ตรวจรายชื่อกับผู้ดูแลก่อน', 'เก็บบัญชีไว้และไม่เปิดเผย'],
    'epic/child/broken-truce': ['นำสำเนาข้อตกลงไปเตือนทั้งสองฝ่าย', 'ขอให้ผู้ใหญ่ช่วยตรวจว่าฉบับใดถูกต้อง', 'เก็บสำเนาไว้และหลบจากพื้นที่'],
    'epic/child/poisoned-well': ['นำข้อมูลไปบอกผู้รักษาที่กำลังหาต้นตอพิษ', 'ทวนรายละเอียดที่รู้กับผู้รักษาก่อน', 'อยู่ห่างจากบริเวณที่มีคนป่วย'],
    'epic/child/stolen-register': ['นำทะเบียนไปแจ้งผู้ที่ตามหาคนสูญหาย', 'ตรวจชื่อและสัญลักษณ์กับผู้ใหญ่ก่อน', 'เก็บทะเบียนไว้โดยไม่เปิดเผย'],
    'epic/child/merchant-hostage': ['แจ้งผู้ที่ช่วยตัวประกันได้ว่ามีคนถูกบังคับ', 'รับเงินจากผู้คุมและตกลงปิดปาก', 'หลีกเลี่ยงผู้คุมและไม่รับเงิน'],
    'epic/child/witness': ['ช่วยพาพยานไปพบคนที่คุ้มครองได้', 'ถามพยานว่ามีผู้ใดไว้ใจได้ก่อน', 'หลบจากพื้นที่โดยไม่เข้าไปเกี่ยวข้อง'],
    'epic/child/supplies': ['แจ้งผู้รักษาเรื่องเสบียงที่อยู่กับคนติดอาวุธ', 'ตรวจเครื่องหมายและขอให้ผู้ใหญ่ช่วย', 'ถอยออกห่างจากคนติดอาวุธ'],
    'epic/child/fever': ['ช่วยผู้รักษาตรวจอาหารของคนป่วย', 'ถามว่าคนป่วยแต่ละคนกินสิ่งใดก่อน', 'อยู่ห่างจากกลุ่มคนป่วย'],
    'epic/child/treaty': ['นำสำเนาข้อตกลงไปให้ฝ่ายที่กำลังสู้', 'ให้ผู้รู้ตรวจว่าเอกสารถูกปลอมหรือไม่', 'เก็บสำเนาไว้และไม่เข้าใกล้ศึก'],
    'epic/child/prisoner': ['นำรายละเอียดที่จำได้ไปช่วยผู้ถูกจับ', 'เล่าเบาะแสให้ผู้ใหญ่ตรวจสอบก่อน', 'ไม่เข้าไปเกี่ยวข้องกับการจับกุม'],
    'epic/child/poison': ['บอกผู้รักษาว่าใครถือห่อยาเป็นคนสุดท้าย', 'ทวนสิ่งที่เห็นกับผู้รักษาก่อน', 'ถอยออกมาและไม่กล่าวหาใคร'],
    'epic/child/route': ['นำแผนที่ฉบับที่รู้จักไปเตือนขบวนอพยพ', 'ให้ผู้ใหญ่ตรวจเส้นทางทั้งสองก่อน', 'ไม่ชี้ทางที่ตนยังไม่แน่ใจ'],
    'epic/child/ransom': ['ช่วยผู้ใหญ่เจรจาข้อเสนอแลกตัว', 'ขอให้ผู้ใหญ่ตรวจห่อและตัวผู้ถูกจับก่อน', 'ไม่เข้าใกล้กลุ่มติดอาวุธ'],
    'epic/adult/war-supply': ['เปิดบัญชีให้ผู้ดูแลเสบียงผู้ลี้ภัยตรวจ', 'ทำสำเนาและตรวจเส้นทางเสบียงก่อน', 'ไม่เปิดเผยบัญชี'],
    'epic/adult/plague-source': ['นำหลักฐานต้นตอโรคให้ผู้รักษาและชุมชน', 'ตรวจแหล่งยาและหาพยานเพิ่มเติม', 'หลีกเลี่ยงการเผชิญหน้าผู้ขาย'],
    'epic/adult/secret-alliance': ['เสนอสำเนาสัญญาต่อผู้เจรจาทั้งสองฝ่าย', 'หาทางคุ้มครองพยานก่อนเปิดเผย', 'เก็บสัญญาไว้โดยไม่เปิดเผย'],
    'epic/adult/rival-convoy': ['ช่วยจัดเส้นทางให้ขบวนผู้บาดเจ็บผ่าน', 'เจรจากับทั้งสองขบวนก่อนเคลื่อนคน', 'หลีกเลี่ยงขบวนที่ถูกล้อม'],
    'epic/adult/witness': ['พาพยานไปยังผู้ที่คุ้มครองเขาได้', 'ตรวจทางหนีและความน่าเชื่อถือของผู้คุ้มครอง', 'ไม่รับภาระคุ้มครองพยาน'],
    'epic/adult/medicine': ['พาขบวนยาหาทางผ่านโดยไม่เปิดชื่อผู้ส่ง', 'เจรจากับผู้คุมทางและตรวจทางเลือกก่อน', 'ไม่เข้าร่วมขบวนยา'],
    'epic/adult/contract': ['ปฏิเสธเงื่อนไขส่งตัวพยานและแจ้งผู้เกี่ยวข้อง', 'ตรวจสัญญาและหาหลักฐานก่อนตัดสินใจ', 'ไม่ลงนามในสัญญา'],
    'epic/adult/shortage': ['นำบัญชีไปแจ้งผู้จัดเสบียงผู้ลี้ภัย', 'ตรวจผู้เบิกและรายการส่งของก่อน', 'ไม่เข้าไปเกี่ยวข้องกับบัญชี'],
    'epic/adult/truce': ['ช่วยผู้ส่งสารนำหลักฐานไปยังที่เจรจา', 'รับรางวัลแล้วช่วยยึดหลักฐานจากผู้ส่งสาร', 'ไม่รับทั้งหลักฐานและรางวัล'],
    'epic/adult/remedy': ['นำข้อสงสัยเรื่องสูตรยาไปแจ้งผู้รักษาคนอื่น', 'ตรวจสูตรต้นฉบับก่อนกล่าวหาผู้จัดหา', 'หยุดยุ่งกับสูตรยา'],
    'epic/adult/captives': ['นำรายชื่อไปแจ้งครอบครัวและผู้ช่วยเหลือ', 'ตรวจความถูกต้องของบัญชีก่อนเปิดเผย', 'เก็บรายชื่อไว้'],
    'epic/adult/caravan': ['ช่วยคุ้มกันแยกขบวนจริงจากขบวนลวง', 'ตรวจเส้นทางและหลักฐานของแต่ละขบวนก่อน', 'ไม่ร่วมเสี่ยงกับขบวน'],
    'extraordinary/infant/sealed-remedy': ['ให้หมอใช้ยาที่พบรักษาเด็ก', 'ขอให้หมอตรวจตราและตัวยาก่อน', 'ไม่ใช้ยาที่ไม่รู้ที่มา'],
    'extraordinary/infant/borrowed-name': ['ตามหาที่มาของชื่อในทะเบียน', 'ตรวจวันที่และชื่อกับผู้จัดทำทะเบียน', 'เก็บสำเนาทะเบียนไว้โดยไม่ตามหา'],
    'extraordinary/infant/pursued-messenger': ['ซ่อนเอกสารและช่วยผู้ส่งสาร', 'ถามผู้ส่งสารว่าเอกสารเป็นของใคร', 'ไม่รับเอกสารและพาเด็กออกห่าง'],
    'extraordinary/infant/medicine-debt': ['ขอให้หมอเริ่มตรวจอาการก่อนตกลงหนี้', 'สอบถามขอบเขตงานและหนี้ก่อน', 'ปฏิเสธการรักษาตามข้อเสนอ'],
    'extraordinary/infant/mark': ['ขอให้หมอเร่บอกที่มาของสัญลักษณ์', 'สอบถามค่าตอบแทนและความรู้ของหมอก่อน', 'เก็บห่อผ้าไว้โดยไม่ถามต่อ'],
    'extraordinary/infant/bell': ['ขายกระดิ่งคืนให้คนแปลกหน้า', 'ตรวจตรากลุ่มพ่อค้าก่อนตัดสินใจ', 'เก็บกระดิ่งไว้กับเด็ก'],
    'extraordinary/infant/medicine': ['นำรายการยาทั้งสองไปให้หมอตรวจ', 'เปรียบเทียบชื่อสมุนไพรในรายการก่อน', 'พักการใช้ยาจนกว่าจะมั่นใจ'],
    'extraordinary/infant/escort': ['รับข้อเสนอให้คนแปลกหน้าคุ้มกัน', 'ถามชื่อคนรู้จักและตรวจคำสั่งก่อน', 'ปฏิเสธผู้คุ้มกันที่ไม่รู้จัก'],
    'extraordinary/infant/water': ['หาน้ำใหม่สำหรับต้มยา', 'ให้หมอตรวจกลิ่นน้ำก่อนใช้', 'ไม่ใช้น้ำจนกว่าจะทราบที่มา'],
    'extraordinary/infant/letter': ['นำจดหมายไปสอบถามผู้รู้จักชื่อในนั้น', 'อ่านจดหมายและตรวจชื่ออย่างระมัดระวัง', 'เก็บจดหมายไว้ไม่บอกใคร'],
    'extraordinary/infant/traveler': ['ขอหมอช่วยดูแลคนเดินทางที่ป่วย', 'ถามหมอถึงวิธีป้องกันการติดเชื้อ', 'พาเด็กอยู่ห่างจากคนป่วย'],
    'extraordinary/infant/payment': ['รับงานส่งห่อและตามหาผู้รับ', 'ถามชื่อผู้รับและปลายทางก่อนรับงาน', 'ปฏิเสธงานที่ไม่รู้ผู้รับ'],
    'extraordinary/young-child/coded-rhyme': ['ท่องกลอนให้ผู้ดูแลเทียบกับแผนที่', 'ขอผู้ดูแลอ่านชื่อจุดหมายอีกครั้ง', 'เก็บกลอนไว้โดยไม่ตามทาง'],
    'extraordinary/young-child/silent-compass': ['ให้ผู้ดูแลลองนำเข็มทิศเข้าใกล้ห่อผ้า', 'สังเกตทิศทางที่เข็มหมุนก่อน', 'เก็บเข็มทิศไว้โดยไม่ทดลอง'],
    'extraordinary/young-child/fugitive-child': ['ให้ผู้ดูแลช่วยเด็กหาที่ซ่อน', 'ให้ผู้ดูแลถามเด็กและผู้ตามหาก่อน', 'ไม่พาเด็กไปกับฝ่ายใด'],
    'extraordinary/young-child/unusual-seed': ['ให้ผู้ดูแลนำเมล็ดไปถามผู้รู้เรื่องยา', 'ตรวจกล่องและฟังคำเตือนของพ่อค้าก่อน', 'เก็บเมล็ดไว้โดยไม่ใช้'],
    'extraordinary/young-child/stone': ['ให้ผู้ดูแลขอผู้รู้ช่วยทดลองกับหิน', 'ฟังคำอธิบายของผู้รู้ทั้งสองก่อน', 'เก็บหินไว้โดยไม่ทดลอง'],
    'extraordinary/young-child/ribbon': ['ให้ผู้ดูแลพาเด็กไปหาผู้ลงประกาศ', 'ให้ผู้ดูแลตรวจหลักฐานของผู้ที่อ้างเป็นญาติ', 'อยู่กับเด็กและรอผู้ดูแลตัดสินใจ'],
    'extraordinary/young-child/scroll': ['ให้ผู้ดูแลนำม้วนกระดาษไปคืนผู้ส่งสาร', 'ตรวจตราบนห่อกับผู้ดูแลก่อน', 'เก็บม้วนกระดาษไว้โดยไม่เปิด'],
    'extraordinary/young-child/bell': ['ให้ผู้ดูแลใช้กระดิ่งตามหาที่มาห่อโลหะ', 'ทดลองระยะที่กระดิ่งเริ่มส่งเสียงกับผู้ดูแล', 'เก็บกระดิ่งไว้โดยไม่ตามเสียง'],
    'extraordinary/young-child/medicine': ['ให้ผู้ดูแลนำยาไปขอหมอตรวจ', 'สอบถามคนเดินทางว่าผู้ใดปรุงยา', 'ไม่ใช้ยาที่ไม่มีชื่อผู้ปรุง'],
    'extraordinary/young-child/carving': ['ให้ผู้ดูแลถามพ่อค้าถึงเจ้าของรูปสลัก', 'ตรวจสัญลักษณ์ทั้งสองด้านกับผู้ดูแล', 'ไม่มอบรูปสลักให้ฝ่ายใด'],
    'extraordinary/young-child/warning': ['ท่องเพลงให้ผู้ดูแลนำไปเตือนคนอื่น', 'ทวนท่อนที่จำได้กับผู้ดูแลก่อน', 'ไม่ส่งต่อเพลงที่ยังไม่เข้าใจ'],
    'extraordinary/young-child/animal': ['ให้ผู้ดูแลช่วยดูแลสัตว์บาดเจ็บ', 'ให้ผู้ดูแลตรวจตราปลอกคอกับคนทั้งสองกลุ่ม', 'ไม่ส่งสัตว์ให้ผู้ที่ยังพิสูจน์ไม่ได้'],
    'extraordinary/child/false-map': ['ช่วยผู้เดินทางตรวจเส้นทางในแผนที่', 'เทียบจุดอันตรายกับผู้ที่เคยเดินทางก่อน', 'ไม่เลือกแผนที่แทนทั้งสองคน'],
    'extraordinary/child/hidden-ledger': ['นำบัญชีไปให้ผู้ถูกกล่าวหาตรวจ', 'ตรวจตัวเลขและชื่อผู้ส่งเสบียงก่อน', 'เก็บบัญชีไว้โดยไม่กล่าวหาใคร'],
    'extraordinary/child/wounded-courier': ['นำข่าวเตือนไปส่งผู้รับที่ไว้ใจ', 'ถามคนส่งสารถึงหลักฐานยืนยันผู้รับ', 'ไม่รับฝากข่าวที่ไม่รู้ผู้รับ'],
    'extraordinary/child/strange-exercise': ['ให้ผู้มีประสบการณ์ตรวจท่าก่อนฝึก', 'อ่านคำเตือนในภาพให้ครบก่อน', 'ไม่ลองท่าที่ไม่เข้าใจ'],
    'extraordinary/child/sealed-box': ['นำรายชื่อไปให้ผู้เกี่ยวข้องตรวจ', 'ตรวจตราทั้งสองฝ่ายและที่มาของกล่อง', 'ปิดกล่องไว้และไม่เผยรายชื่อ'],
    'extraordinary/child/claim': ['พาพยานไปบอกสิ่งที่เห็น', 'ถามรายละเอียดจากพยานและเด็กฝึกก่อน', 'ไม่ตัดสินว่าใครขโมยของ'],
    'extraordinary/child/trail': ['ช่วยตามรอยเท้าชุดที่ชัดกว่า', 'ตรวจทิศทางรอยเท้าทั้งสองกับผู้ตามหา', 'ไม่ออกตามรอยด้วยตนเอง'],
    'extraordinary/child/herb': ['บอกผู้รักษาว่าใครส่งห่อเป็นคนสุดท้าย', 'ทวนสิ่งที่เห็นก่อนบอกผู้รักษา', 'ไม่กล่าวหาใครโดยยังไม่แน่ใจ'],
    'extraordinary/child/song': ['ท่องกลอนให้ผู้ใหญ่ใช้ตรวจข่าวเตือนภัย', 'ทวนคำที่จำได้ก่อนเล่า', 'ไม่ท่องส่วนที่จำไม่แน่'],
    'extraordinary/child/merchant': ['บอกพ่อค้าว่าเห็นใครจับถุงเหรียญ', 'ทวนลำดับคนที่จับถุงก่อนให้การ', 'ไม่กล่าวหาผู้ใด'],
    'extraordinary/child/practice': ['ขอให้ผู้รู้ช่วยหาหน้าคำเตือน', 'ถามผู้ฝึกถึงที่มาของบันทึกก่อน', 'ไม่ฝึกท่าจนกว่าจะได้คำเตือน'],
    'extraordinary/child/courier': ['ตรวจชื่อผู้รับแล้วนำข่าวไปส่ง', 'ถามคนส่งสารถึงลักษณะของผู้รับก่อน', 'ไม่รับส่งข่าวเมื่อยังแยกผู้รับไม่ได้'],
    'extraordinary/adult/counterfeit-seal': ['นำเอกสารไปตรวจตรากับผู้เกี่ยวข้อง', 'เปรียบเทียบรอยหมึกและตราก่อน', 'ไม่รับงานจากเอกสารฉบับนี้'],
    'extraordinary/adult/medicine-caravan': ['ตามรอยขบวนยาไปตามเส้นทางหนึ่ง', 'ตรวจร่องรอยทั้งสองทางก่อนออกเดินทาง', 'ปฏิเสธงานตามหาขบวน'],
    'extraordinary/adult/disputed-testimony': ['ช่วยพยานให้การโดยไม่ถูกกดดัน', 'ฟังคำให้การทั้งสองและหาหลักฐานก่อน', 'ไม่รับหน้าที่ตรวจคำให้การ'],
    'extraordinary/adult/buried-technique': ['ตรวจคำเตือนเดิมที่ถูกเขียนทับ', 'ขอผู้รู้ช่วยอ่านลายมือทั้งสองชั้น', 'ไม่ฝึกจากบันทึกที่ยังอ่านไม่ครบ'],
    'extraordinary/adult/contract': ['ขอตรวจตราเดิมก่อนลงนาม', 'ถามผู้ว่าจ้างว่าเหตุใดจึงมีตราซ้อน', 'ปฏิเสธการลงนาม'],
    'extraordinary/adult/shipment': ['ช่วยตรวจห่อสินค้าเทียบกับบัญชี', 'เก็บห่อสมุนไพรไว้เองระหว่างที่ทั้งสองโต้เถียง', 'ไม่ตัดสินข้อกล่าวหา'],
    'extraordinary/adult/witness': ['นำลายมือในจดหมายไปให้ผู้เกี่ยวข้องตรวจ', 'เทียบจดหมายกับลายมือผู้ส่งที่อ้างก่อน', 'ไม่เปิดเผยจดหมาย'],
    'extraordinary/adult/healer': ['ช่วยหาแหล่งบันทึกตำรับยาทั้งสอง', 'ถามผู้รักษาเรื่องอาการและวิธีปรุงก่อน', 'ให้ผู้รักษาตรวจตำรับกันเอง'],
    'extraordinary/adult/training': ['ช่วยงานผู้รู้แล้วฝึกตามความรู้ที่แลกมา', 'ช่วยงานและขอฝึกเข้มกับผู้รู้', 'ไม่รับข้อแลกเปลี่ยน'],
    'extraordinary/adult/route': ['ตรวจตำแหน่งหลักเขตกับเส้นทางเดิม', 'ถามผู้เดินทางว่าพบหลักเขตเมื่อใด', 'ไม่ย้ายหลักเขตโดยยังไม่แน่ใจ'],
    'extraordinary/adult/cargo': ['ตรวจตราและรายละเอียดห่อสินค้ากับพ่อค้า', 'เปรียบเทียบห่อกับสินค้าที่รับรองแล้ว', 'ไม่รับรองว่าสินค้าเป็นของแท้'],
    'extraordinary/adult/promise': ['เล่ารายละเอียดคำมั่นให้ผู้เกี่ยวข้องฟัง', 'ทวนสิ่งที่จำได้ก่อนให้การ', 'ไม่รับหน้าที่เป็นพยาน']
  };

  // Authored consequences only where the action and its cost or reward are clear.
  // Empty arrays mean the player gains no material reward for that choice.
  const GRADED_SCENE_OUTCOMES = {
    'uncommon/adult/split-payment': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/adult/herb-exchange': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/adult/measure': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/adult/receipt': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/adult/strap': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/adult/witness': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/adult/counterfeit-seal': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/adult/buried-technique': [[{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'extraordinary/adult/contract': [[], [], []],
    'extraordinary/adult/witness': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/adult/training': [[], [], []],
    'extraordinary/adult/route': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/adult/promise': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/adult/war-supply': [[{ type: 'stat', path: 'hero.reputation', value: 4 }], [], []],
    'epic/adult/secret-alliance': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/adult/rival-convoy': [[{ type: 'stat', path: 'hero.reputation', value: 4 }, { type: 'stat', path: 'hero.health', value: -2 }], [], []],
    'epic/adult/witness': [[{ type: 'stat', path: 'hero.reputation', value: 4 }, { type: 'stat', path: 'hero.health', value: -2 }], [], []],
    'epic/adult/medicine': [[{ type: 'stat', path: 'hero.reputation', value: 5 }, { type: 'stat', path: 'hero.health', value: -3 }], [], []],
    'epic/adult/contract': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/adult/truce': [[{ type: 'stat', path: 'hero.reputation', value: 4 }], [{ type: 'stat', path: 'hero.money', value: 10 }, { type: 'stat', path: 'hero.reputation', value: -5 }], []],
    'epic/adult/remedy': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'epic/adult/captives': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/adult/caravan': [[{ type: 'stat', path: 'hero.reputation', value: 4 }, { type: 'stat', path: 'hero.health', value: -4 }], [], []],
    'uncommon/child/errand': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/child/torn-page': [[{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'uncommon/child/argument': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'extraordinary/child/false-map': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/child/wounded-courier': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/child/sealed-box': [[], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/child/claim': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/child/trail': [[{ type: 'stat', path: 'hero.reputation', value: 2 }, { type: 'stat', path: 'hero.health', value: -1 }], [], []],
    'extraordinary/child/herb': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'extraordinary/child/song': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/child/merchant': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'extraordinary/child/practice': [[], [], []],
    'extraordinary/child/courier': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/child/broken-truce': [[{ type: 'stat', path: 'hero.reputation', value: 4 }], [], []],
    'epic/child/poisoned-well': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/child/stolen-register': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/child/merchant-hostage': [[{ type: 'stat', path: 'hero.reputation', value: 4 }], [{ type: 'stat', path: 'hero.money', value: 6 }, { type: 'stat', path: 'hero.reputation', value: -4 }], []],
    'epic/child/witness': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/child/supplies': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/child/fever': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/child/treaty': [[{ type: 'stat', path: 'hero.reputation', value: 4 }], [], []],
    'epic/child/prisoner': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/child/poison': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/child/route': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/child/ransom': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'uncommon/young-child/found-purse': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/young-child/broken-toy': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/young-child/herb-label': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/young-child/hungry-traveler': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/young-child/drawing': [[{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'uncommon/young-child/kite': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/young-child/seeds': [[{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'uncommon/young-child/bundle': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/young-child/cup': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/young-child/shoe': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/young-child/song': [[{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'uncommon/young-child/basket': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'extraordinary/young-child/coded-rhyme': [[{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'extraordinary/young-child/silent-compass': [[], [], [{ type: 'treasure', name: 'เข็มทิศแปลก', bonus: {}, grade: 'uncommon' }]],
    'extraordinary/young-child/fugitive-child': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'extraordinary/young-child/unusual-seed': [[], [], [{ type: 'treasure', name: 'เมล็ดปริศนา', bonus: {}, grade: 'uncommon' }]],
    'extraordinary/young-child/stone': [[], [], [{ type: 'treasure', name: 'หินเปลี่ยนสี', bonus: {}, grade: 'uncommon' }]],
    'extraordinary/young-child/ribbon': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/young-child/scroll': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'extraordinary/young-child/bell': [[], [], [{ type: 'treasure', name: 'กระดิ่งค้นหาโลหะ', bonus: {}, grade: 'uncommon' }]],
    'extraordinary/young-child/medicine': [[], [], []],
    'extraordinary/young-child/carving': [[], [], [{ type: 'treasure', name: 'รูปสลักสองสัญลักษณ์', bonus: {}, grade: 'uncommon' }]],
    'extraordinary/young-child/warning': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/young-child/animal': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/young-child/witnessed-ambush': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/young-child/hidden-supplies': [[], [], []],
    'epic/young-child/rare-fever': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/young-child/rival-messengers': [[], [], []],
    'epic/young-child/warning': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/young-child/supplies': [[], [], []],
    'epic/young-child/healer': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/young-child/missing': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/young-child/message': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/young-child/medicine': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/young-child/bridge': [[], [], []],
    'epic/young-child/ledger': [[], [], []],
    'uncommon/infant/gentle-healer': [[{ type: 'stat', path: 'hero.health', value: 2 }], [], []],
    'uncommon/infant/warm-wrap': [[{type:'treasure', name:'ผ้าห่มหนา', bonus:{}, grade:'common'}], [], []],
    'uncommon/infant/cloth': [[{type:'treasure', name:'ผ้าห่อเด็ก', bonus:{}, grade:'common'}], [], []],
    'uncommon/infant/porridge': [[], [], []],
    'uncommon/infant/rain': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/infant/bowl': [[], [], []],
    'uncommon/infant/basket': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/infant/coin': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [], []],
    'uncommon/infant/song': [[], [], []],
    'uncommon/infant/package': [[], [], []],
    'extraordinary/infant/sealed-remedy': [[{ type: 'stat', path: 'hero.health', value: 3 }], [], []],
    'extraordinary/infant/borrowed-name': [[], [], []],
    'extraordinary/infant/pursued-messenger': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/infant/medicine-debt': [[], [], []],
    'extraordinary/infant/mark': [[], [], []],
    'extraordinary/infant/medicine': [[], [], []],
    'extraordinary/infant/escort': [[], [], []],
    'extraordinary/infant/water': [[], [], []],
    'extraordinary/infant/letter': [[], [], []],
    'extraordinary/infant/traveler': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'extraordinary/infant/payment': [[{ type: 'stat', path: 'hero.money', value: 4 }], [], []],
    'epic/infant/evacuation-choice': [[], [], []],
    'epic/infant/dangerous-scroll': [[{ type: 'stat', path: 'hero.money', value: 6 }], [], []],
    'epic/infant/healer-conflict': [[], [], []],
    'epic/infant/contested-protection': [[], [], []],
    'epic/infant/refugees': [[], [], []],
    'epic/infant/healer': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/infant/writ': [[], [], []],
    'epic/infant/carrier': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/infant/storm': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'epic/infant/rescue': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/infant/remedy': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [], []],
    'epic/infant/border': [[], [], []],
    'uncommon/infant/herbal-cloth': [[{ type: 'material', key: 'herb', value: 1 }], [{ type: 'material', key: 'herb', value: 1 }], []],
    'uncommon/infant/lost-wage': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.reputation', value: 1 }], []],
    'extraordinary/infant/bell': [[{ type: 'stat', path: 'hero.money', value: 3 }], [], [{ type: 'treasure', name: 'กระดิ่งตราพ่อค้า', bonus: {}, grade: 'uncommon' }]],
    'uncommon/child/missing-token': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/child/leaking-bundle': [[{ type: 'material', key: 'herb', value: 1 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/child/wrong-message': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/child/minor-contest': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.bodyFoundation', value: 1 }], []],
    'uncommon/child/practice': [[{ type: 'stat', path: 'hero.bodyFoundation', value: 2 }], [], [{ type: 'stat', path: 'hero.bodyFoundation', value: 1 }]],
    'uncommon/child/missing-change': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], [{ type: 'stat', path: 'hero.money', value: 1 }, { type: 'stat', path: 'hero.reputation', value: -2 }]],
    'uncommon/child/herb': [[{ type: 'stat', path: 'hero.reputation', value: 1 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/child/stray-dog': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/child/parcel': [[{ type: 'stat', path: 'hero.reputation', value: 1 }, { type: 'stat', path: 'hero.health', value: -1 }], [], []],
    'extraordinary/child/strange-exercise': [[{ type: 'stat', path: 'hero.bodyFoundation', value: 3 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/child/hidden-ledger': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'uncommon/adult/tired-carrier': [[{ type: 'stat', path: 'hero.money', value: 4 }, { type: 'stat', path: 'hero.health', value: -1 }], [], []],
    'uncommon/adult/cart': [[{ type: 'stat', path: 'hero.money', value: 4 }, { type: 'stat', path: 'hero.health', value: -1 }], [], []],
    'uncommon/adult/delivery': [[{ type: 'stat', path: 'hero.money', value: 4 }, { type: 'stat', path: 'hero.health', value: -1 }], [], []],
    'uncommon/adult/road-witness': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [], []],
    'uncommon/adult/recipe': [[{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'uncommon/adult/herbs': [[{ type: 'stat', path: 'hero.reputation', value: 2 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/adult/medicine-caravan': [[{ type: 'stat', path: 'hero.money', value: 8 }, { type: 'stat', path: 'hero.health', value: -3 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/adult/disputed-testimony': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'extraordinary/adult/healer': [[{ type: 'stat', path: 'hero.reputation', value: 2 }, { type: 'stat', path: 'hero.attributes.intellect', value: 1 }], [], []],
    'extraordinary/adult/shipment': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [{ type: 'material', key: 'herb', value: 2 }, { type: 'stat', path: 'hero.reputation', value: -4 }], []],
    'extraordinary/adult/cargo': [[{ type: 'stat', path: 'hero.reputation', value: 3 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'epic/adult/plague-source': [[{ type: 'stat', path: 'hero.reputation', value: 5 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []],
    'epic/adult/shortage': [[{ type: 'stat', path: 'hero.reputation', value: 5 }], [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }], []]
  };
  function gradedOutcomeNote(effects) {
    const labels = { 'hero.money': 'เงิน', 'hero.health': 'สุขภาพ', 'hero.reputation': 'ชื่อเสียง', 'hero.attributes.intellect': 'ปัญญา', 'hero.bodyFoundation': 'รากฐานกาย', 'hero.cultivation': 'ความก้าวหน้าฝึกตน' };
    return effects.map(effect => effect.type === 'material' ? `${MATERIAL_NAMES[effect.key] || effect.key} ${effect.value > 0 ? '+' : ''}${effect.value}` : effect.type === 'treasure' ? `ได้รับ ${effect.name}` : effect.type === 'stat' ? `${labels[effect.path] || effect.path} ${effect.value > 0 ? '+' : ''}${effect.value}` : '').filter(Boolean).join(' · ');
  }

  function buildUniqueGradedEvents(s, phase) {
    const phaseKey = phase.id === 'infant' || phase.id === 'young-child' || phase.id === 'child' ? phase.id : 'adult';
    const healthLoss = power => Math.min(power * 2, phaseKey === 'infant' || phaseKey === 'young-child' ? 6 : phaseKey === 'child' ? 10 : 24);
    const activity = ACTIVITY_EVENT_FRAMES[s.activity] ? s.activity : 'free';
    const frame = ACTIVITY_EVENT_FRAMES[activity];
    const statPaths = { health: 'hero.health', money: 'hero.money', reputation: 'hero.reputation', intellect: 'hero.attributes.intellect', bodyFoundation: 'hero.bodyFoundation' };
    const groups = ['uncommon', 'extraordinary', 'epic'].flatMap(rarity => {
      const grade = EVENT_RARITIES[rarity];
      return UNIQUE_GRADED_SCENES[rarity][phaseKey].map(([key, title, text, reward], index) => {
        const sceneActivity = GRADED_SCENE_ACTIVITIES[rarity][phaseKey][index];
        const child = phaseKey === 'infant' || phaseKey === 'young-child';
        const options = {
          health: [
            ['ขอให้ผู้รักษาช่วยตรวจและดูแล', 'ตรวจอาการและเตรียมสิ่งจำเป็นก่อน', 'ไม่เข้าไปรับการดูแลครั้งนี้'],
            ['ช่วยจัดหาสิ่งที่ผู้ป่วยต้องใช้', 'ถามผู้รู้ถึงวิธีรับมือก่อน', 'ถอยออกมาและรักษาตัว']
          ],
          money: [
            ['ลงมือช่วยจัดการเรื่องที่ค้างอยู่', 'ตรวจข้อตกลงหรือสิ่งของก่อน', 'ปฏิเสธการเข้าไปเกี่ยวข้อง'],
            ['ช่วยหาทางออกให้ผู้ที่ขอความช่วยเหลือ', 'สอบถามต้นทุนและเงื่อนไขให้ชัด', 'ปล่อยให้เจ้าของเรื่องจัดการเอง']
          ],
          reputation: [
            ['ยื่นมือช่วยผู้ที่กำลังเดือดร้อน', 'รับฟังคำบอกเล่าจากทุกฝ่าย', 'ไม่เข้าไปตัดสินเรื่องของผู้อื่น'],
            ['ช่วยคลี่คลายความเข้าใจผิด', 'หาคนที่รู้เรื่องมาช่วยยืนยันก่อน', 'ถอยออกมาจากข้อขัดแย้ง']
          ],
          intellect: [
            ['ตรวจสอบเบาะแสและลองหาคำตอบ', 'จดจำรายละเอียดไว้ให้ผู้รู้ตรวจ', 'วางเรื่องนี้ไว้ก่อน'],
            ['เปรียบเทียบสิ่งที่พบกับข้อมูลที่มี', 'ถามผู้มีประสบการณ์ก่อนลงมือ', 'ไม่ติดตามเบาะแสต่อ']
          ],
          bodyFoundation: [
            ['ลองทำด้วยตนเองอย่างระมัดระวัง', 'ขอคำแนะนำก่อนลอง', 'หยุดไว้และไม่ฝืนร่างกาย'],
            ['ฝึกตามคำแนะนำที่ได้รับ', 'สังเกตท่าทางก่อนลงมือ', 'พักและกลับมาฝึกภายหลัง']
          ]
        };
        const baseTexts = (options[reward] || options.intellect)[index % 2];
        const authored = GRADED_SCENE_ACTIONS[`${rarity}/${phaseKey}/${key}`];
        const texts = authored ? (phaseKey === 'infant' ? authored.map(text => `ให้ผู้ดูแล${text}`) : authored) : child ? baseTexts.map((text, i) => i === 2 ? 'อยู่กับผู้ดูแลและไม่เข้าไปเกี่ยวข้อง' : `ให้ผู้ดูแล${text}`) : baseTexts;
        const power = grade.power;
        // Minor disputes or lost belongings must not cause unexplained injury.
        // Physical harm is reserved for scenes that explicitly mention danger.
        const dangerous = phaseKey === 'infant'
          ? (rarity === 'extraordinary' && key === 'pursued-messenger') || (rarity === 'epic' && ['evacuation-choice', 'carrier', 'storm', 'rescue'].includes(key))
          : phaseKey === 'young-child' ? rarity === 'epic' && ['medicine', 'bridge'].includes(key)
          : phaseKey === 'child' ? rarity === 'epic' && ['broken-truce', 'merchant-hostage', 'witness', 'treaty', 'ransom'].includes(key)
          : rarity === 'epic' && ['rival-convoy', 'witness', 'medicine', 'caravan'].includes(key);
        const failure = dangerous ? [{ type: 'stat', path: 'hero.health', value: -healthLoss(power) }] : [];
        const checkStat = child ? 'luck' : sceneActivity === 'social' ? 'charm' : ['study','craft'].includes(sceneActivity) ? 'intellect' : ['train','work'].includes(sceneActivity) ? 'body' : 'luck';
        const amount = Math.max(1, Math.ceil(power / 2));
        const paid = reward === 'money' && /ขาย|รับจ้าง|รับค่าตอบแทน/.test(texts[0]);
        const selfHealing = reward === 'health' && /อาการของเจ้า|รักษาเจ้า|เด็กป่วย|เด็กอาจได้ใช้|ถ้วยยาหาย|ผื่น.*ตัวเจ้า/.test(text);
        const outcomePath = selfHealing ? 'hero.health' : paid ? 'hero.money' : reward === 'reputation' || reward === 'health' ? 'hero.reputation' : reward === 'bodyFoundation' ? 'hero.bodyFoundation' : 'hero.attributes.intellect';
        const outcomeLabel = { 'hero.health': 'สุขภาพ', 'hero.money': 'เงิน', 'hero.reputation': 'ชื่อเสียง', 'hero.bodyFoundation': 'พื้นฐานกาย', 'hero.attributes.intellect': 'ปัญญา' }[outcomePath];
        const cost = /จ่ายค่าเดินทาง/.test(texts[0]) ? 1 : 0;
        const payment = cost ? [{ type: 'stat', path: 'hero.money', value: -cost }] : [];
        const success = [...payment, { type: 'stat', path: outcomePath, value: amount }, { type: 'path', key: reward === 'reputation' || reward === 'health' ? 'compassion' : 'insight', value: amount }];
        const cautious = [{ type: 'path', key: 'insight', value: 1 }, ...(selfHealing ? [{ type: 'stat', path: 'hero.health', value: 1 }] : reward === 'reputation' ? [{ type: 'stat', path: 'hero.reputation', value: 1 }] : [])];
        let authoredOutcomes = GRADED_SCENE_OUTCOMES[`${rarity}/${phaseKey}/${key}`];
        // Learning a training record only yields cultivation when the character has opened that path.
        if (rarity === 'extraordinary' && phaseKey === 'adult' && key === 'training') {
          authoredOutcomes = [[s.hero.cultivationAccess ? { type: 'stat', path: 'hero.cultivation', value: 10 } : { type: 'stat', path: 'hero.bodyFoundation', value: 3 }, { type: 'stat', path: 'hero.health', value: -2 }], [s.hero.cultivationAccess ? { type: 'stat', path: 'hero.cultivation', value: 20 } : { type: 'stat', path: 'hero.bodyFoundation', value: 5 }, { type: 'stat', path: 'hero.health', value: -6 }], []];
        }
        const keepsake = phaseKey === 'young-child' && ['silent-compass', 'unusual-seed', 'stone', 'bell', 'carving'].includes(key)
          && rarity === 'extraordinary' ? authoredOutcomes?.[2]?.find(effect => effect.type === 'treasure') : null;
        const pathFor = action => {
          if (/ปิดปาก|ยึดหลักฐาน|เก็บห่อสมุนไพรไว้เอง|เดินจากร้าน/.test(action)) return 'freedom';
          if (/ตรวจ|ถาม|สอบ|สังเกต|ทวน|ฟัง|อ่าน/.test(action)) return 'insight';
          if (/รับจ้าง|รับค่าตอบแทน|ส่งข่าว|ส่งห่อ/.test(action)) return 'duty';
          if (/ช่วย|คืน|รักษา|เตือน|ปกป้อง|ไกล่เกลี่ย|ดูแล/.test(action)) return 'compassion';
          return 'freedom';
        };
        const hiddenPath = index => ({ type: 'path', key: pathFor(texts[index]), value: 1 });
        const chosenSuccess = authoredOutcomes ? [...payment, ...authoredOutcomes[0], ...(keepsake ? [keepsake] : []), hiddenPath(0)] : success;
        const chosenCautious = authoredOutcomes ? [...authoredOutcomes[1], ...(keepsake ? [keepsake] : []), hiddenPath(1)] : cautious;
        const chosenThird = authoredOutcomes ? [...authoredOutcomes[2], hiddenPath(2)] : [];
        const successDescription = authoredOutcomes ? (gradedOutcomeNote(chosenSuccess) || 'ไม่มีการเปลี่ยนแปลงค่าที่แสดงหรือไอเทม') : `${outcomeLabel} +${amount}`;
        const secondDescription = authoredOutcomes ? (gradedOutcomeNote(chosenCautious) || 'ไม่มีการเปลี่ยนแปลงค่าที่แสดงหรือไอเทม') : (selfHealing ? 'ฟื้นสุขภาพเล็กน้อย' : reward === 'reputation' ? 'ชื่อเสียงเพิ่มเล็กน้อย' : 'รวบรวมข้อมูลก่อน');
        const thirdDescription = authoredOutcomes ? (gradedOutcomeNote(chosenThird) || 'ไม่มีการเปลี่ยนแปลงค่าที่แสดงหรือไอเทม') : 'หลีกเลี่ยงความเสี่ยงและโอกาส';
        return {
          id: `graded-${rarity}-${phaseKey}-${key}`, rarity, activity: sceneActivity, activities: sceneActivity === 'social' ? ['social', 'free'] : [sceneActivity], title, text,
          tag: `${phase.name} · ${grade.name}`, uniqueGraded: true,
          choices: [
            { text: texts[0], note: `สำเร็จ: ${successDescription} · พลาด${dangerous ? `เสียสุขภาพ ${healthLoss(power)}` : 'ไม่สำเร็จ'}${cost ? ` · ใช้ ${cost} ตำลึงทั้งสองกรณี` : ''}`, ...(cost ? { requires: state => state.hero.money >= cost, locked: `ต้องมี ${cost} ตำลึง` } : {}), check: { stat: checkStat, difficulty: 10 + power }, effects: chosenSuccess, failureEffects: [...payment, ...failure, ...(keepsake ? [keepsake] : [])] },
            { text: texts[1], note: `ไม่ต้องทดสอบ · ${secondDescription}`, ...(rarity === 'extraordinary' && phaseKey === 'adult' && key === 'training' ? { requires: state => state.hero.health > 6, locked: 'ต้องมีสุขภาพมากกว่า 6 เพื่อฝึกเข้ม' } : {}), effects: chosenCautious },
            { text: texts[2], note: thirdDescription, effects: authoredOutcomes ? chosenThird : [{ type: 'path', key: 'freedom', value: 1 }] }
          ]
        };
      });
    });
    if (phaseKey === 'child' || phaseKey === 'adult') {
      EXPLORATION_DISCOVERIES.forEach(([rarity, kind, title, text]) => {
        const power = EVENT_RARITIES[rarity].power;
        const itemGrade = { uncommon: 'uncommon', extraordinary: 'rare', epic: 'epic' }[rarity];
        const manualType = kind.startsWith('manual_') ? kind.slice(7) : null;
        const manualDef = manualType ? MANUAL_DISCOVERY_TYPES[manualType] : null;
        const techniqueId = kind === 'manual' ? `discovery_sword_${itemGrade}` : manualDef ? `discovery_${manualType}_${itemGrade}` : undefined;
        const name = kind === 'weapon' ? ({ uncommon: 'กระบี่ทางสน', rare: 'กระบี่เมฆเคลื่อน', epic: 'กระบี่ดาราซ่อนคม' }[itemGrade]) : discoveryManualName(techniqueId);
        const workbookManualType = kind === 'manual' ? 'jian' : manualType;
        const reward = kind === 'herb' ? { type: 'gradedMaterial', key: 'herb', grade: itemGrade, value: 1 }
          : workbookManualType ? { type: 'workbookTechniqueManual', grade: itemGrade, manualType: workbookManualType }
            : { type: 'treasure', name, bonus: kind === 'weapon' ? { attack: ({ uncommon: 5, rare: 6, epic: 7 }[itemGrade]), agility: 1 } : {}, grade: itemGrade, category: kind === 'weapon' ? 'weapon' : 'technique_manual', subtype: kind === 'weapon' ? 'jian' : manualDef?.manualSubtype || 'attack_jian', techniqueId };
        const discoveryActions = DISCOVERY_ACTIONS[`${rarity}/${kind}`];
        const discoveryDanger = /พลาด|ไม่มั่นคง|หลงทาง|ไม่ปลอดภัย|พัง|สัตว์|ลาดชัน|เศษหิน|ไหลเชี่ยว|หมอก/.test(text);
        groups.push({ id: `graded-discovery-${rarity}-${kind}`, rarity, activity: 'explore', title, text, tag: `${phase.name} · ${EVENT_RARITIES[rarity].name}`, uniqueGraded: true,
          ...(workbookManualType ? { unlock: s => availableWorkbookTechniqueManuals(s, itemGrade, workbookManualType).length > 0 } : {}),
          choices: [
            { text: discoveryActions[0], note: discoveryDanger ? 'สำเร็จได้รับของ · พลาดเสียสุขภาพ' : 'สำเร็จได้รับของ · พลาดยังไม่ได้ของ', check: { stat: 'intellect', difficulty: 10 + power }, effects: [reward], failureEffects: discoveryDanger ? [{ type: 'stat', path: 'hero.health', value: -healthLoss(power) }] : [] },
            { text: discoveryActions[1], note: 'ยังไม่ได้รับของ', effects: [{ type: 'path', key: 'insight', value: power }] },
            { text: discoveryActions[2], note: 'ไม่ได้รับของ', effects: [{ type: 'path', key: 'freedom', value: 1 }] }
          ]
        });
      });
      ADDITIONAL_MANUAL_TECHNIQUES.forEach(technique => {
        const def = ADDITIONAL_MANUAL_TYPES[technique.type];
        const rarity = { uncommon: 'uncommon', rare: 'extraordinary', epic: 'epic' }[technique.grade];
        const power = EVENT_RARITIES[rarity].power;
        const name = discoveryManualName(technique.id);
        const manualActions = EXTRA_MANUAL_ACTIONS[technique.id];
        const manualDanger = /หลังคาชำรุด|เอนอยู่|ปีน|พื้นบางส่วนยุบ|พื้นหินที่ชำรุด|หินร่วง|แตกร้าว|ทางลาดที่ฝนกัดเซาะ|เปียกฝน|กระเบื้องแตก|ลมพัดแรง/.test(technique.text);
        groups.push({ id: `graded-manual-${technique.id}`, rarity, activity: 'explore', title: technique.title, text: technique.text, tag: `${phase.name} · ${EVENT_RARITIES[rarity].name}`, uniqueGraded: true,
          choices: [
            { text: manualActions[0], note: manualDanger ? 'สำเร็จได้รับคัมภีร์ · พลาดเสียสุขภาพ' : 'สำเร็จได้รับคัมภีร์ · พลาดยังไม่ได้คัมภีร์', check: { stat: 'intellect', difficulty: 10 + power }, effects: [{ type: 'treasure', name, bonus: {}, grade: technique.grade, category: 'technique_manual', subtype: def.manualSubtype, techniqueId: technique.id }], failureEffects: manualDanger ? [{ type: 'stat', path: 'hero.health', value: -healthLoss(power) }] : [] },
            { text: manualActions[1], note: 'ยังไม่ได้รับคัมภีร์', effects: [{ type: 'path', key: 'insight', value: power }] },
            { text: manualActions[2], note: 'ไม่ได้รับคัมภีร์', effects: [{ type: 'path', key: 'freedom', value: 1 }] }
          ]
        });
      });
    }
    return groups;
  }

  const LIBRARY_DISCOVERY_SCENES = {
    normal: {
      weapons: ['อาวุธของคนเดินทาง', 'ระหว่างสำรวจ เจ้าพบอาวุธธรรมดาวางอยู่ข้างสัมภาระเก่าซึ่งไม่เห็นเจ้าของ'],
      armor: ['เครื่องป้องกันที่ถูกทิ้ง', 'เจ้าสังเกตเห็นเครื่องป้องกันที่ยังใช้ได้ในกองสัมภาระระหว่างสำรวจ'],
      jewelry: ['เครื่องประดับที่หล่นหาย', 'ระหว่างสำรวจ เจ้าพบเครื่องประดับสามัญตกอยู่ในห่อผ้าเก่า'],
      cursed: ['ของเก่าที่ชวนระแวง', 'เจ้าพบวัตถุเก่าที่มีร่องรอยผิดธรรมชาติ พลังของมันอาจมาพร้อมผลเสีย'],
      mounts: ['สัตว์พาหนะพลัดหลง', 'ระหว่างเดินทาง เจ้าพบสัตว์พาหนะไร้ผู้ดูแล มันยอมให้เข้าใกล้แต่ยังตกใจง่าย']
    },
    uncommon: {
      weapons: ['อาวุธในห่อหนัง', 'ระหว่างสำรวจ เจ้าพบห่อหนังซ่อนอาวุธชั้นดีไว้ใต้เศษสัมภาระ'],
      armor: ['เกราะใต้ผ้ากันฝน', 'ผ้ากันฝนผืนเก่าปกคลุมเครื่องป้องกันชั้นดีที่เจ้าพบระหว่างสำรวจ'],
      jewelry: ['เครื่องประดับในกล่องไม้', 'เจ้าพบกล่องไม้บรรจุเครื่องประดับชั้นดี แต่กลอนมีร่องรอยถูกงัด'],
      cursed: ['ตราอาถรรพ์บนวัตถุ', 'เจ้าพบวัตถุชั้นดีที่มีตราอาถรรพ์ติดอยู่ การนำติดตัวอาจมีผลเสีย'],
      mounts: ['พาหนะที่หลุดจากขบวน', 'สัตว์พาหนะชั้นดีพลัดจากขบวน เจ้าสามารถลองเข้าหาอย่างระมัดระวัง']
    },
    extraordinary: {
      weapons: ['อาวุธจากซากขบวน', 'ระหว่างสำรวจซากสัมภาระ เจ้าพบอาวุธหายากซึ่งยังคงสภาพดี'],
      armor: ['เครื่องป้องกันจากที่ซ่อน', 'เจ้าพบเครื่องป้องกันหายากในที่ซ่อนเก่า พื้นบริเวณนั้นไม่มั่นคง'],
      jewelry: ['หีบเครื่องประดับเก่า', 'หีบที่ซ่อนตามเส้นทางบรรจุเครื่องประดับหายาก และมีร่องรอยสัตว์อยู่ใกล้ ๆ'],
      cursed: ['วัตถุต้องห้ามในหีบ', 'เจ้าพบวัตถุอาถรรพ์หายากในหีบปิดผนึก มันอาจให้พลังพร้อมภาระคำสาป'],
      mounts: ['พาหนะสายพันธุ์หายาก', 'เจ้าพบพาหนะสายพันธุ์หายากที่พลัดหลงอยู่ระหว่างทาง การเข้าใกล้อาจทำให้มันตื่นกลัว']
    },
    epic: {
      weapons: ['อาวุธแห่งค่ายที่สาบสูญ', 'ซากค่ายที่เคยเป็นสมรภูมิใหญ่ซ่อนอาวุธซึ่งมีตราของผู้บัญชาการ ทางเข้าที่เสียหายอาจพังลงได้ทุกเมื่อ'],
      armor: ['เกราะในหีบผนึก', 'หีบผนึกในซากป้อมเก็บเกราะฝีมือช่างผู้มีชื่อเสียง ร่องรอยโดยรอบบ่งบอกว่ามีกลไกป้องกัน'],
      jewelry: ['หีบหลังม่านหมอก', 'ในที่ซ่อนซึ่งถูกหมอกปิดล้อม เจ้าพบเครื่องประดับมีตราตระกูลเก่า หากเข้าไปอาจหาทางกลับลำบาก'],
      cursed: ['ห่อผนึกต้องห้าม', 'ห่อผนึกจากห้องลับซ่อนวัตถุอาถรรพ์ซึ่งผู้คนเคยแย่งชิง พลังของมันอาจแลกด้วยผลเสีย'],
      mounts: ['พาหนะฝ่าเขตอันตราย', 'สัตว์พาหนะหายากติดอยู่ใกล้เส้นทางที่กำลังพังทลาย หากช่วยมันออกมาอาจยอมร่วมทาง']
    },
    legendary: {
      weapons: ['อาวุธจากหอผนึกสวรรค์', 'ภายในหอผนึกเก่ามีอาวุธตำนานซ่อนอยู่ กลไกผนึกยังทำงานและทางเดินไม่มั่นคง'],
      armor: ['เกราะตำนานใต้แท่นผนึก', 'แท่นผนึกที่แตกร้าวเผยให้เห็นเครื่องป้องกันตำนาน แต่แรงปราณรอบแท่นยังแปรปรวน'],
      jewelry: ['เครื่องประดับตำนานในสุสาน', 'สุสานโบราณเก็บเครื่องประดับตำนานไว้หลังกลไกที่ยังไม่คลาย'],
      cursed: ['วัตถุต้องห้ามระดับตำนาน', 'วัตถุต้องห้ามระดับตำนานถูกผนึกไว้หลายชั้น การแตะต้องอาจปลุกคำสาปรุนแรง'],
      mounts: ['พาหนะสายเลือดบรรพกาล', 'พาหนะสายเลือดบรรพกาลบาดเจ็บอยู่ในเขตอันตรายและยังไม่ยอมให้ผู้ใดเข้าใกล้']
    }
  };

  const LIBRARY_DISCOVERY_ACTIONS = {
    'normal/weapons': ['เก็บอาวุธจากสัมภาระที่ถูกทิ้ง', 'ปล่อยอาวุธไว้กับสัมภาระ'],
    'normal/armor': ['นำเครื่องป้องกันที่ยังใช้ได้ออกจากกองของ', 'ไม่รื้อกองสัมภาระ'],
    'normal/jewelry': ['เปิดห่อผ้าและเก็บเครื่องประดับ', 'วางห่อผ้าเก่าไว้'],
    'normal/cursed': ['นำวัตถุเก่าที่น่าสงสัยติดตัว', 'ไม่แตะวัตถุผิดธรรมชาติ'],
    'normal/mounts': ['ค่อย ๆ เข้าใกล้สัตว์พาหนะพลัดหลง', 'ปล่อยสัตว์ที่ตกใจง่ายไว้'],
    'uncommon/weapons': ['หยิบห่อหนังออกจากใต้สัมภาระ', 'ไม่รื้อห่อหนัง'],
    'uncommon/armor': ['เปิดผ้ากันฝนเพื่อนำเกราะติดตัว', 'ปล่อยเกราะใต้ผ้ากันฝนไว้'],
    'uncommon/jewelry': ['เปิดกล่องไม้ที่มีรอยงัดและเก็บเครื่องประดับ', 'ไม่เปิดกล่องที่มีรอยงัด'],
    'uncommon/cursed': ['เก็บวัตถุที่มีตราอาถรรพ์', 'ทิ้งวัตถุพร้อมตราไว้'],
    'uncommon/mounts': ['ค่อย ๆ เข้าหาพาหนะที่หลุดจากขบวน', 'ปล่อยให้มันหาทางกลับขบวน'],
    'extraordinary/weapons': ['ค้นสัมภาระขบวนเพื่อนำอาวุธออกมา', 'ไม่รื้อซากสัมภาระ'],
    'extraordinary/armor': ['เข้าไปนำเครื่องป้องกันจากที่ซ่อน', 'ถอยจากพื้นดินไม่มั่นคง'],
    'extraordinary/jewelry': ['เข้าใกล้หีบแล้วนำเครื่องประดับออกมา', 'ถอยห่างจากรอยสัตว์ใกล้หีบ'],
    'extraordinary/cursed': ['เปิดหีบผนึกเพื่อนำวัตถุต้องห้าม', 'ไม่เปิดผนึกวัตถุต้องห้าม'],
    'extraordinary/mounts': ['พยายามปลอบและเข้าหาพาหนะหายาก', 'ไม่รบกวนสัตว์ที่อาจตื่นกลัว'],
    'epic/weapons': ['ฝ่าทางเข้าค่ายที่เสียหายไปเอาอาวุธ', 'ไม่ผ่านทางเข้าที่อาจพัง'],
    'epic/armor': ['พยายามเปิดหีบผนึกและหลบกลไกป้องกัน', 'ไม่เข้าใกล้หีบที่อาจมีกลไก'],
    'epic/jewelry': ['ฝ่าหมอกไปนำเครื่องประดับตราตระกูล', 'ไม่เสี่ยงหลงทางเข้าไปในหมอก'],
    'epic/cursed': ['เปิดห่อผนึกที่ผู้คนเคยแย่งชิง', 'ทิ้งห่ออาถรรพ์ไว้ในห้องลับ'],
    'epic/mounts': ['เข้าไปช่วยพาหนะออกจากเส้นทางที่พัง', 'ไม่เข้าไปบนเส้นทางที่กำลังพัง'],
    'legendary/weapons': ['ฝ่ากลไกผนึกเพื่อนำอาวุธตำนานออกมา', 'สำรวจกลไกก่อนเข้าใกล้อาวุธ'],
    'legendary/armor': ['คลายผนึกและนำเครื่องป้องกันตำนานออกมา', 'ถอยจากแท่นผนึกที่แปรปรวน'],
    'legendary/jewelry': ['เปิดกลไกสุสานเพื่อนำเครื่องประดับออกมา', 'หลีกเลี่ยงกลไกที่ยังทำงาน'],
    'legendary/cursed': ['เปิดผนึกวัตถุต้องห้ามตำนาน', 'ปล่อยวัตถุต้องห้ามไว้ในผนึก'],
    'legendary/mounts': ['ช่วยพาหนะบรรพกาลออกจากเขตอันตราย', 'ไม่เข้าใกล้พาหนะที่ยังตื่นกลัว']
  };

  function buildLibraryDiscoveryEvents() {
    return Object.entries(LIBRARY_DISCOVERY_SCENES).flatMap(([rarity, categories]) =>
      Object.entries(categories).map(([category, [title, text]]) => {
        const grade = { normal: 'common', uncommon: 'uncommon', extraordinary: 'rare', epic: 'epic', legendary: 'legendary' }[rarity];
        const power = { normal: 1, uncommon: 2, extraordinary: 4, epic: 7 }[rarity];
        const cursed = category === 'cursed';
        const actions = LIBRARY_DISCOVERY_ACTIONS[`${rarity}/${category}`];
        const dangerous = category === 'mounts' || (rarity === 'extraordinary' && ['armor', 'jewelry'].includes(category)) || (['epic', 'legendary'].includes(rarity) && ['weapons', 'armor', 'jewelry'].includes(category));
        return {
          id: `library-discovery-${rarity}-${category}`, rarity, activity: category === 'mounts' ? 'travel' : 'explore',
          minAge: 12, title, text, tag: `ค้นพบ · ${ITEM_GRADES[grade].name}`, libraryDiscovery: true,
          unlock: s => availableLibraryLoot(s, grade, category).length > 0,
          choices: [
            { text: actions[0],
              note: `สำเร็จจะสุ่มรับ${cursed ? 'ของอาถรรพ์' : 'ไอเทม'}เกรด${ITEM_GRADES[grade].name} 1 ชิ้น${cursed ? ' · ของอาถรรพ์อาจมีผลเสีย' : ''} · ${dangerous ? 'ล้มเหลวเสียสุขภาพ' : 'ล้มเหลวยังไม่ได้ของ'}`,
              check: { stat: category === 'mounts' ? 'charm' : 'intellect', difficulty: 10 + power },
              effects: [{ type: 'libraryLoot', grade, category }, { type: 'path', key: 'freedom', value: 1 }], failureEffects: dangerous ? [{ type: 'stat', path: 'hero.health', value: -power * 2 }] : [] },
            { text: actions[1], note: 'หลีกเลี่ยงความเสี่ยง', effects: [{ type: 'path', key: 'freedom', value: 1 }] }
          ]
        };
      })
    );
  }

  function availableLibraryLoot(s, grade, category) {
    const owned = new Set((s.treasures || []).map(item => typeof item === 'string' ? item : item.id || item.name));
    const names = new Set((s.treasures || []).map(item => typeof item === 'string' ? item : item.name));
    const realm = s.hero?.cultivationAccess || s.flags?.basicCultivation ? Math.max(1, Number(s.hero?.realm) || 1) : 0;
    return (ITEM_LIBRARY[grade]?.[category] || []).filter(item => !owned.has(item.id) && !names.has(item.name)
      && (!['weapon', 'armor', 'talisman'].includes(item.category) || item.equipmentRealm <= Math.max(1, realm + 1)));
  }

  function grantLibraryLoot(s, grade, category) {
    const pool = availableLibraryLoot(s, grade, category);
    if (!pool.length) return null;
    const item = pool[Math.floor(Math.random() * pool.length)];
    s.treasures = Array.isArray(s.treasures) ? s.treasures : [];
    addTreasure(s, item.name, { ...item.bonus }, { ...item, bonus: { ...item.bonus }, travel: item.travel ? { ...item.travel } : undefined });
    return item;
  }

  function workbookTechniqueManualCategory(type) {
    return type === 'fist' ? { category: 'attack', subtype: 'fist' }
      : ['blade', 'jian'].includes(type) ? { category: 'attack', subtype: 'jian' }
        : type === 'defense' ? { category: 'defense' }
          : type === 'movement' ? { category: 'movement' }
            : type === 'cultivation' ? { category: 'cultivation' } : null;
  }
  function availableWorkbookTechniqueManuals(s, grade, type) {
    const target = workbookTechniqueManualCategory(type);
    if (!target) return [];
    const currentRealm = s.hero?.cultivationAccess || s.flags?.basicCultivation ? Math.max(1, Number(s.hero?.realm) || 1) : 0;
    const owned = new Set((s.treasures || []).map(item => typeof item === 'object' ? item.techniqueId : null).filter(Boolean));
    const rows = TECHNIQUE_LIBRARY[grade]?.[target.category] || [];
    return rows.filter(item => !owned.has(item.id) && (!target.subtype || item.techniqueSubtype === target.subtype) && item.manualRealm <= Math.max(1, currentRealm + 1));
  }
  function grantWorkbookTechniqueManual(s, grade, type) {
    const pool = availableWorkbookTechniqueManuals(s, grade, type);
    if (!pool.length) return null;
    const technique = pool[Math.floor(Math.random() * pool.length)];
    const labels = { fist: 'หมัด', blade: 'กระบี่', jian: 'กระบี่', defense: 'ป้องกัน', movement: 'ย่างก้าว', cultivation: 'บำเพ็ญ' };
    const name = `คัมภีร์${labels[type] || 'วิชา'} · ${technique.name}`;
    addTreasure(s, name, {}, { id: `manual_${technique.id}`, grade, category: 'technique_manual', subtype: technique.manualSubtype, learningType: technique.learningType, techniqueId: technique.id, manualRealm: technique.manualRealm, manualStage: technique.manualStage, workbookSourceId: technique.id });
    return technique;
  }

  function buildAnnualEventPool(s) {
    const ageYear = Math.max(0, Math.floor((s.hero?.ageMonths || 0) / 12));
    const phase = annualLifePhase(s);
    const activities = Object.keys(ACTIVITY);
    return EVENT_RARITY_ORDER.flatMap((rarityId, rarityIndex) => {
      const rarity = EVENT_RARITIES[rarityId];
      if (['uncommon', 'extraordinary', 'epic'].includes(rarityId)) return [];
      const slots = rarity.perActivity
        ? activities.flatMap(activity => Array.from({ length: rarity.count }, (_, index) => ({ activity, index })))
        : Array.from({ length: rarity.count }, (_, index) => ({ activity: activities[(index + rarityIndex + ageYear) % activities.length], index }));
      return slots.map(({ activity, index }) => {
        const seed = ANNUAL_EVENT_SEEDS[(index + rarityIndex + ageYear + activities.indexOf(activity)) % ANNUAL_EVENT_SEEDS.length];
        const frame = ACTIVITY_EVENT_FRAMES[activity];
        const context = annualActivityContext(s, activity);
        const theme = annualNormalTheme(s, activity, phase, index + rarityIndex, ageYear);
        const power = rarity.power;
        const id = `annual-${ageYear}-${rarity.id}-${activity}-${index + 1}`;
        const dialogueOnly = rarity.id === 'normal';
        const legendaryScene = rarity.id === 'legendary' ? LEGENDARY_LIFE_SCENES[phase.id][index % LEGENDARY_LIFE_SCENES[phase.id].length] : null;
        const proseTemplates = dialogueOnly ? [
          `${context.name} เจ้าพบ “${theme}” ${context.hint} รายละเอียดเล็กน้อยของโลกยังคงเคลื่อนไหว โดยไม่มีชะตาใดบังคับให้ต้องเลือก`,
          `ในช่วงหนึ่งของชีวิต ${context.name} เจ้าสังเกตเห็น “${theme}”${context.hint ? ` ${context.hint}` : ''} แล้วปล่อยให้วันเวลาผ่านไปอย่างเงียบงัน`,
          `เสียงรอบตัวพาเจ้าผ่าน “${theme}” ใน${context.name} เหตุการณ์เล็กน้อยนี้ไม่ได้เปลี่ยนชะตา แต่ยังคงเป็นส่วนหนึ่งของความทรงจำ`,
          `“${theme}” ผ่านเข้ามาใน${context.name} แล้วจางหายไปพร้อมกับแสงของวัน ไม่มีสิ่งใดถูกพรากไป และไม่มีสิ่งใดถูกมอบให้`,
          `วันนั้นไม่มีผู้ชนะหรือผู้แพ้ มีเพียง “${theme}” และช่วงเวลาธรรมดาที่ค่อย ๆ เคลื่อนผ่านชีวิตของเจ้า`,
          `เจ้าจดจำ “${theme}” ได้เพียงเลือนราง เมื่อเวลาผ่านไปมันอาจไม่สำคัญนัก แต่ครั้งหนึ่งมันก็เคยเป็นวันนี้ของเจ้า`,
          `ใน${context.name} โลกไม่ได้หยุดรอเจ้า “${theme}” จึงเป็นเพียงภาพหนึ่งที่ผ่านสายตา ก่อนทุกอย่างจะกลับคืนสู่ความเงียบ`,
          `“${theme}” เกิดขึ้นโดยไม่มีเสียงระฆังเตือน ไม่มีคำทำนาย และไม่มีเหตุผลให้ต้องรีบตัดสินใจ ชีวิตยังคงดำเนินต่อไปตามปกติ`,
          `เจ้าผ่านช่วงเวลาของ “${theme}” ไปอย่างเรียบง่าย บางเรื่องไม่จำเป็นต้องกลายเป็นตำนานจึงจะมีที่อยู่ในความทรงจำ`,
          `สายลมพัดผ่าน${context.name} พา “${theme}” เข้ามาแล้วพาออกไป เหลือเพียงวันธรรมดาวันหนึ่งที่ยังคงเป็นของเจ้า`
        ] : [
          `${context.name} เจ้าพบ “${theme}” ท่ามกลาง${phase.tone} ${context.hint} ผลลัพธ์จะขึ้นกับการตัดสินใจและความพร้อมของเจ้า`,
          `ระหว่าง${context.name} เจ้าพบ “${theme}” เหตุการณ์นี้สะท้อน${phase.tone}${context.hint ? ` ${context.hint}` : ''} และเปิดโอกาสให้เจ้ากำหนดทิศทางเอง`,
          `วันเวลาของเจ้าในช่วง${phase.name}ถูกขีดด้วย “${theme}” ${context.hint} สิ่งที่เจ้ามีและสิ่งที่เจ้ากล้าทำจะเป็นตัวชี้ว่าความทรงจำนี้จบลงเช่นไร`
        ];
        const prose = dialogueOnly
          ? annualNormalNarrative(s, activity, theme, ageYear, index + rarityIndex)
          : annualRareNarrative(s, activity, rarity.id, theme, phase, index, ageYear);
        return {
          id, generated: true, ageYear, rarity: rarity.id, activity,
          legendarySceneKey: legendaryScene ? `${phase.id}/${index % LEGENDARY_LIFE_SCENES[phase.id].length}` : null,
          tag: `ปีอายุ ${ageYear} · ${rarity.name}`,
          dialogueOnly,
          title: dialogueOnly ? `${phase.name}: ${theme}` : `${phase.name}: ${legendaryScene?.[0] || 'เหตุไม่คาดฝัน'}`,
          text: legendaryScene ? legendaryScene[1] : prose,
          choices: dialogueOnly ? [{ text: 'อ่านต่อ', note: 'บทสนทนาและบรรยากาศ ไม่มีผลต่อค่าสถานะ' }] : annualRareChoices(s, activity, rarity.id, power, seed, frame, index, ageYear, legendaryScene),
          /* choices: dialogueOnly ? [{ text: 'อ่านต่อ', note: 'บทสนทนาและบรรยากาศ ไม่มีผลต่อค่าสถานะ' }] : [
            {
              text: 'รับโอกาสและเดินเข้าไปเผชิญหน้า',
              note: `ผลดีระดับ ${rarity.name}`,
              check: dialogueOnly ? null : { stat: activity === 'train' ? 'spirit' : activity === 'work' ? 'charm' : activity === 'explore' ? 'intellect' : 'body', difficulty: 20 + power * 4 },
              failureEffects: dialogueOnly ? [] : [{ type: 'stat', path: 'hero.health', value: -power }, { type: 'stat', path: 'hero.karma', value: -1 }],
              effects: [
                { type: 'path', key: seed.path, value: seed.gain * power },
                { type: 'stat', path: frame.stat, value: power * (seed.gain + 1) },
                { type: 'stat', path: 'hero.reputation', value: power }
              ]
            },
            {
              text: 'ถอยเพื่อรักษาชีวิตและฉวยประโยชน์เท่าที่ทำได้',
              note: `ความเสี่ยงร้ายระดับ ${rarity.name}`,
              effects: [
                { type: 'stat', path: 'hero.health', value: -power * 2 },
                { type: 'stat', path: 'hero.money', value: frame.stat === 'hero.money' ? -power * 2 : power * (seed.gain - 3) },
                { type: 'path', key: frame.path, value: power }
              ]
            }
          ] */
        };
      });
    });
  }

  let MIDDLE_GAME_EVENTS;
  let DEBT_EVENTS;

  // World events may still mention Lin An as an independent character.
  function eventScopeAllowed(s, event, id = event?.id) {
    if (!event) return false;
    if (id && (Object.hasOwn(EVENTS, id) || Object.hasOwn(ALTERNATE_ROUTE_EVENTS, id)) && (s.mode !== 'story' || s.characterId !== 'lin-an')) return false;
    if (event.storyCharacter && (s.mode !== 'story' || s.characterId !== event.storyCharacter)) return false;
    if (event.minAge != null && (Number(s.hero?.ageMonths) || 0) < event.minAge * 12) return false;
    if (event.maxAge != null && Math.floor((Number(s.hero?.ageMonths) || 0) / 12) > event.maxAge) return false;
    if (event.id === 'retainer_lesson' && !s.flags?.retainerAlive) return false;
    if (['master_bond', 'senior_bond', 'spar', 'middle_master_companion_arc', 'middle_rival_sect', 'middle_sect_politics'].includes(event.id) && !s.flags?.metSect) return false;
    if (event.characterId && (s.mode !== 'story' || s.characterId !== event.characterId)) return false;
    return true;
  }

  function getEventPool(s) {
    const characterEvents = s.mode === 'story' ? Object.values(STORY_CHARACTER_EVENTS).filter(event => event.characterId === s.characterId) : [];
    const annualEvents = [...buildAnnualEventPool(s), ...buildUniqueGradedEvents(s, annualLifePhase(s)), ...buildLibraryDiscoveryEvents()];
    const infantLegendaryEvents = INFANT_LEGENDARY_EVENTS.filter(event => (!event.unlock || event.unlock(s)) && (event.minMonth || 0) <= s.month && (event.maxMonth ?? Infinity) >= s.month && !s.eventHistory.includes(event.id));
    const infantEpicEvents = INFANT_EPIC_EVENTS.filter(event => (!event.unlock || event.unlock(s)) && (event.minMonth || 0) <= s.month && (event.maxMonth ?? Infinity) >= s.month && !s.eventHistory.includes(event.id));
    const learningEvents = s.activity === 'study' ? LEARNING_EVENTS : [];
    const trainingEvents = s.activity === 'train' ? TRAINING_EVENTS : [];
    const restEvents = s.activity === 'rest' ? REST_EVENTS : [];
    const explorationEvents = s.activity === 'explore' ? EXPLORATION_EVENTS : [];
    const craftEvents = s.activity === 'craft' ? CRAFT_EVENTS : [];
    const socialEvents = s.activity === 'social' ? SOCIAL_EVENTS : [];
    const familyEvents = s.activity === 'family' ? FAMILY_EVENTS : [];
    const travelEvents = s.activity === 'travel' ? TRAVEL_EVENTS : [];
    const freeLifeEvents = buildFreeLifeEventPool(s);
    const questEvents = s.activity === 'quest' ? QUEST_EVENTS : [];
    return [...RANDOM_EVENTS, ...MIDDLE_GAME_EVENTS, ...DEBT_EVENTS, ...restEvents, ...learningEvents, ...explorationEvents, ...craftEvents, ...socialEvents, ...OFFICIAL_EVENTS, ...familyEvents, ...travelEvents, ...freeLifeEvents, ...questEvents, ...characterEvents, ...annualEvents, ...infantLegendaryEvents, ...infantEpicEvents, ...trainingEvents].filter(event =>
      eventScopeAllowed(s, event) &&
      // Adult-oriented legacy events can otherwise ask a baby to flee, trade,
      // listen to rumours or care for a spouse. Young children use the authored
      // age-specific pools and the dedicated infant events instead.
      !(s.mode === 'free' && (s.hero?.ageMonths || 0) < 60 && !event.generated && !event.uniqueGraded && !INFANT_LEGENDARY_EVENTS.includes(event) && !INFANT_EPIC_EVENTS.includes(event)) &&
      (event.activities ? event.activities.includes(s.activity) : event.activity === s.activity || event.activity === 'any') &&
      event.month == null &&
      (!event.generated || event.ageYear === Math.floor((s.hero?.ageMonths || 0) / 12)) &&
      (event.minMonth || 0) <= s.month &&
      (event.maxMonth ?? Infinity) >= s.month &&
      (event.minAge == null || Math.floor((s.hero?.ageMonths || 0) / 12) >= event.minAge) &&
      (event.maxAge == null || Math.floor((s.hero?.ageMonths || 0) / 12) <= event.maxAge) &&
      !s.eventHistory.includes(event.id) &&
      (!event.legendarySceneKey || !(s.legendarySceneHistory || []).includes(event.legendarySceneKey)) &&
      (!(event.uniqueGraded || event.libraryDiscovery) || !(s.gradedEventHistory || []).includes(event.id)) &&
      (!event.unlock || event.unlock(s)) &&
      (!event.requires || event.requires(s)) &&
      evaluateCondition(s, event.conditions)
    );
  }

  function ensureTravelState(s) {
    s.travel = s.travel || {};
    s.travel.destination = TRAVEL_DESTINATIONS[s.travel.destination] ? s.travel.destination : null;
    s.travel.vehicle = TRAVEL_VEHICLES[s.travel.vehicle] ? s.travel.vehicle : 'foot';
    s.travel.active = s.travel.active && typeof s.travel.active === 'object' ? s.travel.active : null;
    s.travel.closedRoutes = Array.isArray(s.travel.closedRoutes) ? s.travel.closedRoutes : [];
    s.travel.lastFailure = s.travel.lastFailure || null;
    s.travel.lastArrival = s.travel.lastArrival || null;
    return s.travel;
  }

  function ensureLifespanState(s) {
    const h = s.hero || (s.hero = {});
    const legacyMonths = Math.max(1, Math.round(Number(h.lifespan || 1) * 12));
    if (!Number.isFinite(h.lifespanMonths)) h.lifespanMonths = legacyMonths;
    else h.lifespanMonths = Math.min(h.lifespanMonths, legacyMonths);
    h.lifespanMonths = Math.max(Number(h.ageMonths || 0), h.lifespanMonths);
    h.lifespan = h.lifespanMonths / 12;
    return h.lifespanMonths;
  }

  function ensureAutoTravelRule(s) {
    s.autoTravelRule = ['safe', 'fast', 'opportunist'].includes(s.autoTravelRule) ? s.autoTravelRule : 'safe';
    return s.autoTravelRule;
  }

  function setAutoTravelRule(s, rule) {
    if (!['safe', 'fast', 'opportunist'].includes(rule)) return false;
    s.autoTravelRule = rule;
    return true;
  }

  function availableTravelDestinations(s) {
    return Object.entries(TRAVEL_DESTINATIONS).filter(([id, destination]) =>
      s.mode === 'free' || (s.month >= destination.minMonth && destination.story(s))
    ).map(([id, destination]) => ({ id, ...destination }));
  }

  function travelRouteFor(s, destination) {
    const route = TRAVEL_ROUTES[destination];
    if (!route || !TRAVEL_DESTINATIONS[destination]) return null;
    return route;
  }

  function calculateTravel(s, destination, options = {}) {
    ensureTravelState(s);
    ensureLifespanState(s); ensureInventory(s);
    const route = travelRouteFor(s, destination), vehicleId = options.vehicle || s.travel.vehicle || 'foot';
    const vehicle = TRAVEL_VEHICLES[vehicleId];
    if (!route || !vehicle) return { ok: false, reason: 'unknown-route' };
    if (!availableTravelDestinations(s).some(item => item.id === destination)) return { ok: false, reason: 'destination-locked', route, vehicle: vehicleId };
    if (s.travel.closedRoutes.includes(route.id) || s.flags?.[`routeClosed:${route.id}`]) return { ok: false, reason: 'route-closed', route, vehicle: vehicleId };
    if (vehicle.requires && !vehicle.requires(s)) return { ok: false, reason: 'vehicle-locked', route, vehicle: vehicleId };
    const mount = getEquippedMount(s);
    const mountTravel = mount?.travel || {};
    const mountTimeMultiplier = Number(mountTravel.timeMultiplier || 1);
    const mountCostMultiplier = Number(mountTravel.costMultiplier || 1);
    const mountDangerMultiplier = Number(mountTravel.dangerMultiplier || 1);
    const mountHealthMultiplier = Number(mountTravel.healthMultiplier || 1);
    const mountResourceMultiplier = Number(mountTravel.resourceMultiplier || 1);
    const months = Math.max(1, Math.ceil(route.months * vehicle.timeMultiplier * mountTimeMultiplier * (s.flags?.secretRouteKnown ? .85 : 1)));
    const arrivalMonth = s.month + months;
    const remainingLife = Math.max(0, ensureLifespanState(s) - Number(s.hero?.ageMonths || 0));
    const deadlineValue = options.deadlineMonth ?? s.travel.deadlineMonth;
    const deadline = deadlineValue == null ? Infinity : Number(deadlineValue);
    const cost = Math.ceil(route.cost * vehicle.costMultiplier * mountCostMultiplier);
    const health = Math.max(0, Math.ceil(route.health * vehicle.healthMultiplier * mountHealthMultiplier));
    const lifespan = Math.max(0, Math.ceil(route.lifespan * vehicle.healthMultiplier * mountHealthMultiplier));
    const resources = Object.fromEntries(Object.entries(route.resources || {}).map(([key, value]) => [key, Math.max(0, Math.ceil(value * vehicle.timeMultiplier * mountResourceMultiplier))]));
    const hasSupplies = Object.entries(resources).every(([key, value]) => Number(s.materials?.[key] || 0) >= value);
    const reason = s.hero?.money < cost ? 'insufficient-funds' : !hasSupplies ? 'insufficient-supplies' : arrivalMonth > s.month + remainingLife ? 'insufficient-time' : (Number.isFinite(deadline) && arrivalMonth > deadline ? 'missed-deadline' : null);
    const worldRisk = Number(s.world?.modifiers?.travelRisk || 0) + Number(s.world?.modifiers?.guardPresence || 0) * 2;
    return { ok: !reason, reason, route, vehicle: vehicleId, mount: mount?.id || null, destination, months, arrivalMonth, deadlineMonth: Number.isFinite(deadline) ? deadline : null, cost, health, lifespan, resources, safety: clamp(Math.round(100 - route.danger * vehicle.dangerMultiplier * mountDangerMultiplier - worldRisk), 0, 100) };
  }

  function closeTravelRoute(s, routeId, reason = 'เส้นทางถูกปิด') {
    const route = Object.values(TRAVEL_ROUTES).find(item => item.id === routeId) || travelRouteFor(s, routeId);
    if (!route || !ensureTravelState(s).closedRoutes.includes(route.id)) {
      if (!route) return false;
      ensureTravelState(s).closedRoutes.push(route.id);
      if (s.travel.active?.routeId === route.id) {
        s.travel.lastFailure = 'route-closed';
        s.travel.active.status = 'route-closed';
        s.travel.active = null;
      }
      addLog(`${route.id} ถูกปิด: ${reason}`, true);
      return true;
    }
    return false;
  }

  function openTravelRoute(s, routeId) {
    const travel = ensureTravelState(s), index = travel.closedRoutes.indexOf(routeId);
    if (index < 0) return false;
    travel.closedRoutes.splice(index, 1);
    return true;
  }

  function startTravel(s, destination, options = {}) {
    ensureTravelState(s);
    if (s.ending || s.pendingEvent || s.travel.active) return false;
    const estimate = calculateTravel(s, destination, options);
    if (!estimate.ok) { s.travel.lastFailure = estimate.reason; return false; }
    s.travel.destination = destination; s.travel.vehicle = estimate.vehicle; s.travel.deadlineMonth = options.deadlineMonth ?? null;
    s.travel.active = { routeId: estimate.route.id, destination, vehicle: estimate.vehicle, monthsLeft: estimate.months, totalMonths: estimate.months, cost: estimate.cost, health: estimate.health, lifespan: estimate.lifespan, resources: estimate.resources, startedMonth: s.month, etaMonth: estimate.arrivalMonth };
    s.travel.lastFailure = null; setActivity(s, 'travel');
    addLog(`ออกเดินทางไป${TRAVEL_DESTINATIONS[destination].name} ใช้เวลา ${estimate.months} เดือน`, true);
    return true;
  }

  function extendTravel(s, months = 1, reason = 'เหตุการณ์ระหว่างทาง') {
    const active = ensureTravelState(s).active;
    if (!active) return false;
    const extra = Math.max(1, Math.ceil(Number(months) || 1));
    active.monthsLeft += extra; active.totalMonths += extra; active.etaMonth += extra;
    active.interruptions = (active.interruptions || 0) + extra;
    addLog(`การเดินทางล่าช้า ${extra} เดือน: ${reason}`, true);
    return true;
  }

  function selectTravelVehicle(s, destination, preferred) {
    const order = [preferred, 'caravan', 'horse', 'foot'].filter((id, index, list) => id && list.indexOf(id) === index);
    return order.find(id => calculateTravel(s, destination, { vehicle: id }).ok) || null;
  }

  function travelArrivalHook(s, destination) {
    const travel = ensureTravelState(s), kind = TRAVEL_DESTINATIONS[destination]?.kind;
    travel.lastArrival = { destination, kind, month: s.month };
    if (kind === 'trade') { s.hero.money += 3; s.flags.tradeRouteKnown = true; addLog('ตลาดชายแดนเปิดโอกาสทางการค้าให้เจ้า ได้เงิน 3 ตำลึง', true); }
    else if (kind === 'auction') { s.flags.auctionVisited = true; s.paths.insight += 2; addLog('หอประมูลเผยข่าวลือและของหายากจากหลายแคว้น', true); }
    else if (kind === 'war') { s.flags.warfrontVisited = true; s.paths.duty += 2; addLog('แนวหน้าสงครามทำให้เจ้าเห็นราคาของคำสัตย์และอำนาจ', true); }
    else if (kind === 'npc') { s.relations.acquaintance = (s.relations.acquaintance || 0) + 2; s.flags.travelerContact = true; addLog('ผู้เดินทางในหมู่บ้านมอบข่าวสารและช่องทางติดต่อใหม่', true); }
    else if (kind === 'secret') { s.flags.secretRouteKnown = true; s.paths.insight += 2; addLog('ถ้ำลับกลายเป็นจุดพักและเส้นทางสำรองของเจ้า', true); }
    return travel.lastArrival;
  }

  function advanceTravel(s) {
    const travel = ensureTravelState(s), active = travel.active;
    if (!active) return false;
    ensureInventory(s);
    const installment = Math.ceil(active.cost / Math.max(1, active.totalMonths));
    const hasSupplies = Object.entries(active.resources || {}).every(([key, value]) => Number(s.materials?.[key] || 0) >= value);
    if (s.hero.money < installment || !hasSupplies) {
      s.travel.lastFailure = !hasSupplies ? 'insufficient-supplies' : 'insufficient-funds';
      s.travel.active = null; addLog('การเดินทางหยุดลงเพราะเสบียงหรือค่าใช้จ่ายไม่พอ', true); return false;
    }
    s.hero.money -= installment;
    Object.entries(active.resources || {}).forEach(([key, value]) => { s.materials[key] -= value; });
    s.hero.health -= active.health; ensureLifespanState(s); s.hero.lifespanMonths = Math.max(s.hero.ageMonths, s.hero.lifespanMonths - active.lifespan); s.hero.lifespan = s.hero.lifespanMonths / 12; s.paths.freedom += 1;
    active.monthsLeft--;
    if (active.monthsLeft <= 0) {
      s.travel.destination = active.destination; s.locations.current = active.destination === 'hidden_cave' ? 'hidden_cave' : (s.locations.current || 'roadside');
      travel.active = null; s.hero.reputation += 1; s.materials.herb += 1;
      travelArrivalHook(s, active.destination);
      addLog(`ถึง${TRAVEL_DESTINATIONS[active.destination].name} แล้ว`, true);
    } else addLog(`เดินทางต่อไปยัง${TRAVEL_DESTINATIONS[active.destination].name} เหลือ ${active.monthsLeft} เดือน`);
    return true;
  }

  // Core state is split into three layers. The flat fields remain as a
  // compatibility surface for the current Lin An UI and are synchronized at
  // save/load boundaries while the new systems use these explicit layers.
  function createMetaState() {
    return { achievements: [], unlockedCharacters: ['lin-an'], endings: [], grades: {}, discoveredFates: [], tutorials: [], unlockedItems: [], unlockedTechniques: [], unlockedEvents: [], blessings: [], lifeRecords: [], simulations: 0, simulationRewards: { cultivation: 0, money: 0, insight: 0 }, clearedRunIds: [] };
  }
  function ensureMetaState(s) {
    s.metaState = s.metaState || createMetaState();
    ['unlockedItems', 'unlockedTechniques', 'unlockedEvents', 'blessings', 'lifeRecords'].forEach(key => { s.metaState[key] = Array.isArray(s.metaState[key]) ? s.metaState[key] : []; });
    return s.metaState;
  }

  function createRunId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function ensureStateLayers(s) {
    if (!s) return s;
    ensureTravelState(s); ensureAutoTravelRule(s);
    s.bodyState = s.bodyState || {};
    s.bodyState.hero = s.hero;
    s.bodyState.month = s.month;
    s.bodyState.activity = s.activity;
    s.worldState = s.worldState || {};
    s.worldState.relations = s.relations = s.relations || { master: 0, senior: 0, friend: 0 };
    s.worldState.factions = s.factions = s.factions || { sect: 0, serpent: 0, jianghu: 0 };
    s.worldState.paths = s.paths = s.paths || { compassion: 0, duty: 0, freedom: 0, insight: 0 };
    s.worldState.flags = s.flags = s.flags || {};
    s.worldState.treasures = s.treasures = s.treasures || [];
    normalizeDiscoveryManuals(s);
    s.treasures.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const original = item.id && ITEM_LIBRARY_BY_ID[item.id];
      if (original && (original.category === 'weapon' || original.category === 'armor' || (original.category === 'talisman' && ['ring', 'necklace'].includes(original.subtype)))) Object.assign(item, original, { bonus: { ...original.bonus } });
      normalizeItemGrade(item);
    });
    ensureItemLoadout(s);
    s.eventHistory = Array.isArray(s.eventHistory) ? s.eventHistory : [];
    if (s.mode === 'free' && s.eventHistory.length > 200) {
      const permanent = s.eventHistory.filter(id => !String(id).startsWith('annual-'));
      const annual = s.eventHistory.filter(id => String(id).startsWith('annual-')).slice(-200);
      s.eventHistory = [...permanent, ...annual].slice(-240);
    }
    s.worldState.eventHistory = s.eventHistory;
    s.worldState.log = s.log = s.log || [];
    s.lineageState = s.lineageState || s.worldState.lineage || { generation: 0, treasury: 0, prestige: 0, stage: 0, heirCount: 0 };
    s.worldState.lineage = s.lineageState;
    s.worldState.lifeHistory = s.lifeHistory = s.lifeHistory || [];
    s.worldState.pressure = s.worldPressure = s.worldPressure || {};
    s.worldState.scars = s.worldScars = Array.isArray(s.worldScars) ? s.worldScars : [];
    s.worldState.oaths = s.oaths = s.oaths || { active: [], broken: [], kept: [], scars: [] };
    ensureWorldPressure(s); ensureOathState(s); ensureWorldState(s); ensureStoryRoute(s); ensureOpportunityCost(s);
    s.worldState.pendingEvent = s.pendingEvent ?? null;
    s.characterMonth = Number.isFinite(s.characterMonth) ? s.characterMonth : (Number.isFinite(s.month) ? s.month : 0);
    s.worldMonth = s.world.worldMonth;
    s.runId = typeof s.runId === 'string' && s.runId ? s.runId : createRunId();
    s.metaState = s.metaState || createMetaState();
    ensureMetaState(s);
    return s;
  }

  function syncStateLayers(s) {
    if (!s) return s;
    ensureStateLayers(s);
    s.bodyState.hero = s.hero;
    s.bodyState.month = s.month;
    s.bodyState.activity = s.activity;
    s.worldState.pendingEvent = s.pendingEvent;
    return s;
  }

  function readStatePath(s, path) {
    return String(path || '').split('.').reduce((value, key) => value == null ? undefined : value[key], s);
  }

  function evaluateCondition(s, condition) {
    if (!condition) return true;
    if (typeof condition === 'function') return condition(s);
    if (Array.isArray(condition.all)) return condition.all.every(item => evaluateCondition(s, item));
    if (Array.isArray(condition.any)) return condition.any.some(item => evaluateCondition(s, item));
    if (condition.not) return !evaluateCondition(s, condition.not);
    if (condition.monthMin != null && s.month < condition.monthMin) return false;
    if (condition.monthMax != null && s.month > condition.monthMax) return false;
    if (condition.activityIs && s.activity !== condition.activityIs) return false;
    if (condition.flag) {
      const expected = condition.flag.value ?? true;
      if (readStatePath(s, `flags.${condition.flag.key}`) !== expected) return false;
    }
    if (condition.pathMin && (readStatePath(s, `paths.${condition.pathMin.key}`) || 0) < condition.pathMin.value) return false;
    if (condition.statMin && (readStatePath(s, condition.statMin.path) || 0) < condition.statMin.value) return false;
    if (condition.relationMin && (readStatePath(s, `relations.${condition.relationMin.key}`) || 0) < condition.relationMin.value) return false;
    if (condition.factionMin && (readStatePath(s, `factions.${condition.factionMin.key}`) || 0) < condition.factionMin.value) return false;
    return true;
  }

  function applyEffects(s, effects = []) {
    effects.forEach(effect => {
      if (!effect) return;
      const value = typeof effect.value === 'function' ? effect.value(s) : effect.value;
      if (effect.type === 'flag') s.flags[effect.key] = value ?? true;
      else if (effect.type === 'path') s.paths[effect.key] = (s.paths[effect.key] || 0) + Number(value || 0);
      else if (effect.type === 'relation') s.relations[effect.key] = (s.relations[effect.key] || 0) + Number(value || 0);
      else if (effect.type === 'gradedMaterial') { addGradedMaterial(s, effect.key, effect.grade, Number(value || 0)); }
      else if (effect.type === 'libraryLoot') { grantLibraryLoot(s, effect.grade, effect.category); }
      else if (effect.type === 'workbookTechniqueManual') { grantWorkbookTechniqueManual(s, effect.grade, effect.manualType); }
      else if (effect.type === 'treasure') { addTreasure(s, effect.name, effect.bonus, { grade: effect.grade, category: effect.category, subtype: effect.subtype, techniqueId: effect.techniqueId }); }
      else if (effect.type === 'craftKnowledge') { ensureCraftingState(s); s.crafting.knowledge[effect.key] = Math.max(0, (s.crafting.knowledge[effect.key] || 0) + Number(value || 0)); }
      else if (effect.type === 'money') s.hero.money = Math.max(0, Number(s.hero.money || 0) + Number(value || 0));
      else if (effect.type === 'faction') s.factions[effect.key] = (s.factions[effect.key] || 0) + Number(value || 0);
      else if (effect.type === 'material') { ensureInventory(s); s.materials[effect.key] = Math.max(0, (s.materials[effect.key] || 0) + Number(value || 0)); }
      else if (effect.type === 'stat') {
        if (effect.path === 'hero.cultivation' && !s.hero.cultivationAccess) {
          s.hero.bodyFoundation = Math.min(100, (s.hero.bodyFoundation || 0) + Math.max(0, Number(value || 0)));
          return;
        }
        const target = readStatePath(s, effect.path);
        const next = Number(target || 0) + Number(value || 0);
        const parts = effect.path.split('.'); const key = parts.pop(); const parent = readStatePath(s, parts.join('.'));
        if (parent) parent[key] = effect.path === 'hero.qi' ? Math.max(0, Math.min(ensureQiState(s).qiMax, next)) : next;
      } else if (effect.type === 'set') {
        const parts = effect.path.split('.'); const key = parts.pop(); const parent = readStatePath(s, parts.join('.'));
        if (parent) parent[key] = value;
      }
    });
    syncStateLayers(s);
  }

  function updateLineageState(s) {
    if (s.ruleSet !== LIFE_RULES.dynasty.id) return;
    const lineage = s.lineageState;
    const family = ensureFamilyState(s);
    if (s.activity === 'work') lineage.treasury += 7;
    if (s.activity === 'train') lineage.prestige += 2;
    if (s.flags.dynastyCommerce) lineage.prestige += 1;
    if (s.flags.dynastyMartial) lineage.prestige += 1;
    lineage.heirCount = family.children.filter(child => child.alive !== false).length;
    lineage.prestige = Math.max(lineage.prestige, Math.floor(family.legacyScore / 4));
    lineage.prestige = Math.max(0, lineage.prestige - Math.floor(family.conflict / 25));
    lineage.stage = clamp(Math.floor(lineage.prestige / 40), 0, 3);
    s.hero.money = lineage.treasury;
    if (lineage.stage >= 3 && !s.flags.lineageComplete) {
      s.flags.lineageComplete = true;
      endGame('guardian', { characterStory: { seal: '興', title: 'ตระกูลผงาดเหนือยุทธภพ', quote: '“ชีวิตหนึ่งเป็นเพียงหนึ่งบท แต่ตระกูลที่ดีเขียนเรื่องต่อด้วยมือของคนรุ่นหลัง”', story: `หลังผ่านมือทายาทรุ่นที่ ${lineage.generation} ตระกูลมีทั้งทรัพย์สิน ชื่อเสียง และกำลังพอจะยืนด้วยตนเอง ธงของตระกูลหลัวจิ้งถูกยกขึ้นเหนือเมืองในฐานะอำนาจใหม่ของยุทธภพ` } });
    }
  }

  function isChoiceAvailable(choice, s) {
    return (!choice.requires || choice.requires(s)) && evaluateCondition(s, choice.conditions);
  }

  const ATTRIBUTE_LABELS = { body: 'พละกำลัง', intellect: 'ปัญญา', spirit: 'จิตใจ', charm: 'เสน่ห์', luck: 'โชค' };
  function rollFate(s, check) {
    ensureAttributes(s);
    const stat = check?.stat || 'luck';
    const base = Number(syncCombat(s).attributes[stat] || 0);
    const karmaBonus = Math.max(-8, Math.min(8, Math.floor((syncCombat(s).karma || 0) / 10)));
    const die = 1 + Math.floor(Math.random() * 20);
    const difficulty = Number(check?.difficulty || 20);
    const total = base + karmaBonus + die;
    return { stat, base, die, karmaBonus, total, difficulty, success: total >= difficulty };
  }
  function checkLabel(check) {
    return check ? `${ATTRIBUTE_LABELS[check.stat] || check.stat} ${check.difficulty} · ให้ชะตาตัดสินได้` : '';
  }

  const { TECHNIQUES, TECHNIQUE_DESCRIPTIONS, TECHNIQUE_CATEGORY_DEFS, COMMON_ATTACK_TECHNIQUE_NAMES, COMMON_DEFENSE_TECHNIQUE_NAMES, COMMON_MOVEMENT_TECHNIQUE_NAMES, COMMON_CULTIVATION_TECHNIQUE_NAMES, COMMON_ATTACK_TECHNIQUES, COMMON_DEFENSE_TECHNIQUES, COMMON_MOVEMENT_TECHNIQUES, COMMON_CULTIVATION_TECHNIQUES, TECHNIQUE_LIBRARY, TECHNIQUE_LIBRARY_BY_ID, COMMON_SUPPORT_TECHNIQUE_NAMES, COMMON_SUPPORT_TECHNIQUES } = window.OneLifeTechniqueCatalog.createTechniqueData({ MANUAL_DISCOVERY_TYPES, ADDITIONAL_MANUAL_TECHNIQUES, ADDITIONAL_MANUAL_TYPES });
  const WORKBOOK_EQUIPMENT_ROWS = Object.values(ITEM_LIBRARY).flatMap(group => ['weapons', 'armor', 'jewelry'].flatMap(key => group[key] || []));
  const WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE = new Map();
  const WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE_SUBTYPE = new Map();
  WORKBOOK_EQUIPMENT_ROWS.forEach(item => {
    const groupKey = `${item.category}|${item.grade}`;
    const subtypeKey = `${groupKey}|${item.subtype}`;
    if (!WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE.has(groupKey)) WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE.set(groupKey, []);
    if (!WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE_SUBTYPE.has(subtypeKey)) WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE_SUBTYPE.set(subtypeKey, []);
    WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE.get(groupKey).push(item);
    WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE_SUBTYPE.get(subtypeKey).push(item);
  });
  function inferItemCategory(item = {}) {
    if (ITEM_CATEGORY_DEFS[item.category]) return item.category;
    if (item.consumable || item.heal != null) return 'consumable';
    if (item.techniqueManual || item.manual || item.techniqueType) return 'technique_manual';
    const name = String(item.name || '');
    if (/คัมภีร์|ตำรา|วิชา/.test(name)) return 'technique_manual';
    if (/ดาบ|กระบี่|มีด|หอก|พลอง|กระบอง|ธนู|แส้|พัด|กรงเล็บ|ค้อน|เข็ม/.test(name)) return 'weapon';
    if (/เกราะ|เสื้อเกราะ|โล่|หมวก|รองเท้า|ผ้าคลุม/.test(name)) return 'armor';
    if (/ม้า|หมาป่า|หมูป่า|กวาง|วัว/.test(name)) return 'mount';
    if (/ของอาถรรพ์|จิตอาถา|อาถรรพ์|คำสาป|โลหิตต้องห้าม|วิญญาณสิง/.test(name)) return 'cursed';
    return 'talisman';
  }
  function inferItemSubtype(item = {}, category = inferItemCategory(item)) {
    if (item.subtype) return item.subtype;
    const name = String(item.name || '');
    const rules = category === 'weapon'
      ? [['jian', /กระบี่/], ['sword', /ดาบ/], ['dagger', /มีด/], ['spear', /หอก/], ['staff', /พลอง|กระบอง/], ['bow', /ธนู/], ['whip', /แส้/], ['fan', /พัด/], ['claw', /กรงเล็บ/], ['hammer', /ค้อน/], ['needle', /เข็ม/]]
      : category === 'armor'
        ? [['shield', /โล่/], ['boots', /รองเท้า/], ['cloak', /ผ้าคลุม/], ['head', /หมวก/], ['body', /เกราะ|เสื้อ/]]
        : category === 'consumable' ? [['pill', /ยา|โอสถ|เม็ด/], ['food', /ขนม|อาหาร/], ['poison', /พิษ/], ['tool', /เครื่องมือ|ชุดสนับสนุน/]]
          : category === 'technique_manual' ? [['attack_jian', /กระบี่/], ['attack_sword', /ดาบ/], ['cultivation', /บำเพ็ญ|ปราณ/], ['defense', /ป้องกัน|คุ้มกาย/], ['movement', /ตัวเบา|ก้าว/]]
            : category === 'mount' ? [['horse', /ม้า/], ['wolf', /หมาป่า/], ['boar', /หมูป่า/], ['deer', /กวาง/], ['ox', /วัว/]] : [];
    return rules.find(([, pattern]) => pattern.test(name))?.[0] || Object.keys(ITEM_CATEGORY_DEFS[category]?.subtypes || {})[0] || 'relic';
  }
  function inferItemGrade(bonus = {}) {
    const total = Object.values(bonus).reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0);
    return total >= 35 ? 'legendary' : total >= 24 ? 'epic' : total >= 14 ? 'rare' : total >= 6 ? 'uncommon' : 'common';
  }
  // Named weapons from story, crafting and discoveries remain distinct from
  // the generated library and retain stable IDs across save migration.
  const SPECIAL_WEAPON_DETAILS = {
    'กระบี่ทางสน': { grade: 'uncommon', bonus: { attack: 5, agility: 1 }, description: 'กระบี่ที่พบตามทางสน ใบดาบเบาช่วยให้ก้าวเปลี่ยนมุมได้คล่อง' },
    'กระบี่เมฆเคลื่อน': { grade: 'rare', bonus: { attack: 6, agility: 1 }, description: 'คมกระบี่ที่ซ่อนในห่อผ้าเคลื่อนตามมืออย่างนุ่มนวล ราวเมฆที่เปลี่ยนรูปเมื่อเจอลม' },
    'กระบี่ดาราซ่อนคม': { grade: 'epic', bonus: { attack: 7, agility: 1 }, description: 'กระบี่จากซากค่ายมีลายดาวเล็ก ๆ เรียงตามสันคม น้ำหนักที่ซ่อนไว้ใกล้ด้ามทำให้ผู้ใช้เปลี่ยนแนวกระบี่ได้โดยไม่เสียสมดุล' },
    'กระบี่ดาวตก': { grade: 'rare', bonus: { attack: 7, agility: 1 }, description: 'กระบี่ที่หลอมจากของวิเศษ คมส่องประกายดั่งดาวตกและตอบรับการเคลื่อนไหวรวดเร็ว' },
    'กระบี่ธารเมฆาประสาน': { grade: 'rare', bonus: { attack: 6, agility: 2 }, description: 'กระบี่ที่ได้จากการฝึกร่วมกับศิษย์พี่ น้ำหนักสมดุลช่วยให้เคลื่อนคมและเปลี่ยนเท้าได้ต่อเนื่อง' },
    'กระบี่หักกินโลหิต': { grade: 'epic', bonus: { attack: 7, agility: 1, body: -1 }, description: 'กระบี่หักที่ยอมรับพันธสัญญาด้วยโลหิต คมรุนแรงและว่องไว แต่ไอสังหารกัดกร่อนกำลังกายของผู้ครอบครอง' },
    'ค้อนคำสัตย์แห่งเตาหลอม': { grade: 'epic', bonus: { attack: 8, defense: 2, body: 2 }, description: 'ค้อนที่หลอมขึ้นตามคำสัตย์ของผู้สร้าง หัวค้อนหนักและด้ามมั่นคง ช่วยส่งแรงพร้อมประคองการตั้งรับ' },
    'กระบี่เดินทาง': { bonus: { attack: 5, agility: 1 }, description: 'กระบี่ที่ช่างตีให้เหมาะกับผู้เดินทาง น้ำหนักเบาและจับถนัดระหว่างก้าวเท้า' }
  };
  const LEGACY_DISCOVERY_WEAPON_NAMES = {
    'กระบี่สำรวจ ชั้นดี': 'กระบี่ทางสน',
    'กระบี่สำรวจ หายาก': 'กระบี่เมฆเคลื่อน',
    'กระบี่สำรวจ มหัศจรรย์': 'กระบี่ดาราซ่อนคม',
    'กระบี่สำรวจ มหากาพย์': 'กระบี่ดาราซ่อนคม'
  };

  // ของเฉพาะเหตุการณ์: กำหนดขั้นตามเรื่องราว ไม่ผูกกับสีเกรด
  const STORY_EQUIPMENT_REQUIREMENTS = {
    'กระบี่ทางสน': 0, 'กระบี่เมฆเคลื่อน': 1, 'กระบี่ดาราซ่อนคม': 2,
    'กระบี่ดาวตก': 1, 'กระบี่ธารเมฆาประสาน': 1, 'กระบี่หักกินโลหิต': 2,
    'ค้อนคำสัตย์แห่งเตาหลอม': 2, 'กระบี่เดินทาง': 0,
    'เสื้อหนังนายพราน': 0, 'เกราะพยัคฆ์ดำ': 1,
    'จี้หยกคุ้มชีพอาจารย์เหวิน': 1, 'ตราคำสอนเหวินจง': 0,
    'แผ่นหยกฟังเสียงกระบี่': 2, 'เส้นไหมกระบี่เมฆา': 2,
    'ระฆังคืนหนี้': 1, 'กล่องเรือนนิรันดร์': 2, 'หยกอุ่นคุ้มชีพ': 0,
    'ยันต์คุ้มครองผู้ไร้เดียงสา': 0, 'เถ้าระฆังไร้เสียง': 1,
    'หยดแสงจากไข้หิมะ': 1, 'น้ำค้างเงาจันทร์': 1,
    'กระดิ่งฝนใส': 0, 'ขนกระเรียนขาว': 0, 'ลูกข่างเหล็กจากดาว': 0,
    'หน้ากากไม้หลบสายตา': 0, 'ขลุ่ยนำทางป่าไผ่': 0, 'เข็มกลัดผู้เดินทาง': 0,
    'ธงเมฆาที่เย็บคืน': 1
  };
  // ค่าสมบัติเนื้อเรื่องที่พกติดตัว ปรับแยกตามบทบาทและเกรดเพื่อลดการซ้อนพลัง
  const STORY_RELIC_BONUSES = {
    'แผ่นหยกฟังเสียงกระบี่': { attack: 5, agility: 2, training: 3 },
    'ยันต์คุ้มครองผู้ไร้เดียงสา': { defense: 3, body: 2, luck: 2 },
    'เส้นไหมกระบี่เมฆา': { attack: 5, defense: 3, agility: 2 },
    'ระฆังคืนหนี้': { luck: 4, spirit: 3, defense: 2 },
    'กล่องเรือนนิรันดร์': { luck: 3, intellect: 3, defense: 2 },
    'เถ้าระฆังไร้เสียง': { karma: 3, luck: 2, defense: 2 },
    'หยกอุ่นคุ้มชีพ': { defense: 3, body: 2, luck: 1 },
    'เศษหยกเขียวจากห้องตรวจ': { intellect: 3, spirit: 2 },
    'ขนกระเรียนขาว': { spirit: 3, luck: 3, restHealth: 3 },
    'กระดิ่งฝนใส': { luck: 3, spirit: 2, defense: 2 },
    'ลูกข่างเหล็กจากดาว': { body: 3, luck: 2, defense: 2 },
    'หยดแสงจากไข้หิมะ': { spirit: 3, luck: 2, defense: 2 },
    'น้ำค้างเงาจันทร์': { spirit: 3, restHealth: 3, luck: 2 },
    'ประกายจันทร์ติดนิ้ว': { intellect: 3, spirit: 3, luck: 2 },
    'เหรียญโคมไร้เงา': { luck: 3, defense: 2 },
    'เศษบัญชีหมึกแดง': { intellect: 3, luck: 2 },
    'หน้ากากไม้หลบสายตา': { agility: 3, luck: 2, defense: 2 },
    'ขลุ่ยนำทางป่าไผ่': { agility: 3, luck: 2, intellect: 2 },
    'เข็มกลัดผู้เดินทาง': { defense: 3, luck: 2 },
    'ห่อผนึกของคนพเนจร': { agility: 3, intellect: 2 },
    'ตราผนึกคำเชิญเมฆา': { intellect: 3, spirit: 2 },
    'เหรียญผู้ผ่านลานประลอง': { attack: 3, agility: 2 },
    'แผนที่ครึ่งใบจากคนเก่า': { intellect: 3, luck: 2 },
    'เศษแผนที่ไร้นาม': { luck: 3, agility: 2 },
    'ใบรับรองหนี้เก่าของตระกูล': { intellect: 3, reputation: 2 },
    'เครื่องมือเหล็กประจำเรือน': { body: 3, defense: 2 },
    'ตราคาราวานตะวันตก': { agility: 3, luck: 2 },
    'ตราประทับจากศัตรูเก่า': { attack: 4, intellect: 2 },
    'ตราหมึกบันทึกตระกูล': { charm: 3, reputation: 3 },
    'ธงเมฆาที่เย็บคืน': { defense: 4, spirit: 2 },
    'พู่กันพงศาวดารปลายชีวิต': { spirit: 3, charm: 2 },
    'ถ้วยชาของผู้ล่วงลับ': { spirit: 4, intellect: 2, defense: 2 },
    'รอยตื่นรู้แห่งเมฆา': { training: 4 }
  };
  const STORY_RELIC_CATEGORIES = {
    'แผ่นหยกฟังเสียงกระบี่': 'jade', 'เส้นไหมกระบี่เมฆา': 'relic',
    'เข็มกลัดผู้เดินทาง': 'keepsake', 'จี้หยกคุ้มชีพอาจารย์เหวิน': 'necklace'
  };
  const SPECIAL_ARMOR_STATS = {
    'เสื้อหนังนายพราน': { grade: 'common', bonus: { defense: 5, body: 1 } },
    'เกราะพยัคฆ์ดำ': { grade: 'rare', bonus: { defense: 5, body: 3 } }
  };
  const SPECIAL_ARMOR_DESCRIPTIONS = {
    'เสื้อหนังนายพราน': 'เสื้อหนังที่ตัดจากวัสดุสำหรับผู้เดินทาง ตะเข็บแน่นช่วยคุ้มกายโดยไม่รั้งการเคลื่อนไหว',
    'เกราะพยัคฆ์ดำ': 'เกราะจากหีบที่พยัคฆ์เฝ้าไว้ เนื้อเกราะเข้มและเสริมช่วงลำตัว ช่วยรับแรงพร้อมประคองร่างกาย'
  };

  function normalizeItemGrade(item = {}) {
    if (typeof item === 'string') item = { name: item, bonus: {} };
    else if (!item || typeof item !== 'object') item = {};
    if (item.craftingMaterial) { item.category = 'material'; item.subtype = 'relic'; }
    else if (item.consumable) { item.category = 'consumable'; item.subtype = 'pill'; }
    if (SPECIAL_ARMOR_DESCRIPTIONS[item.name]) {
      item.description = SPECIAL_ARMOR_DESCRIPTIONS[item.name]; item.category = 'armor'; item.subtype = 'body';
      const spec = SPECIAL_ARMOR_STATS[item.name], realm = STORY_EQUIPMENT_REQUIREMENTS[item.name] || 0;
      item.grade = spec.grade; item.gradeExplicit = true;
      item.bonus = { ...spec.bonus };
    }
    if (LEGACY_DISCOVERY_WEAPON_NAMES[item.name]) item.name = LEGACY_DISCOVERY_WEAPON_NAMES[item.name];
    const relicSubtype = STORY_RELIC_CATEGORIES[item.name];
    if (relicSubtype) { item.category = 'talisman'; item.subtype = relicSubtype; }
    if (STORY_RELIC_BONUSES[item.name]) item.bonus = { ...STORY_RELIC_BONUSES[item.name] };
    const special = SPECIAL_WEAPON_DETAILS[item.name];
    if (special) {
      const tier = STORY_EQUIPMENT_REQUIREMENTS[item.name] || 0;
      item.bonus = { ...special.bonus }; item.description = special.description;
      item.category = 'weapon'; item.subtype = item.name.startsWith('ค้อน') ? 'hammer' : 'jian';
      if (special.grade) { item.grade = special.grade; item.gradeExplicit = true; }
    }
    const explicitGrade = ITEM_GRADES[item.grade] ? item.grade : null;
    item.grade = explicitGrade || inferItemGrade(item.bonus || item.stats || {});
    item.gradeExplicit = item.gradeExplicit ?? !!explicitGrade;
    item.gradeData = ITEM_GRADES[item.grade];
    item.category = inferItemCategory(item);
    item.subtype = inferItemSubtype(item, item.category);
    const libraryItem = item.id && ITEM_LIBRARY_BY_ID[item.id];
    if (libraryItem && ['weapon', 'armor', 'talisman'].includes(libraryItem.category)) { item.equipmentRealm = libraryItem.equipmentRealm; item.equipmentStage = libraryItem.equipmentStage; item.bonus = { ...libraryItem.bonus }; }
    else if (Object.prototype.hasOwnProperty.call(STORY_EQUIPMENT_REQUIREMENTS, item.name)) { item.equipmentRealm = STORY_EQUIPMENT_REQUIREMENTS[item.name]; item.equipmentStage = item.equipmentRealm ? 1 : 0; }
    else if (['weapon', 'armor', 'talisman'].includes(item.category)) { item.equipmentRealm = Number.isInteger(item.equipmentRealm) ? clamp(item.equipmentRealm, 0, REALMS.length) : 0; item.equipmentStage = item.equipmentRealm ? clamp(Number(item.equipmentStage) || 1, 1, 9) : 0; }
    if (libraryItem?.category === 'cursed') item.bonus = { ...libraryItem.bonus };
    if (['weapon', 'armor', 'talisman'].includes(item.category) && !libraryItem?.workbookStats) {
      const statKeys = ['attack', 'defense', 'agility', 'body'];
      const originalBonus = item.bonus || {};
      const groupKey = `${item.category}|${item.grade}`;
      const candidates = WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE.get(groupKey) || [];
      const exactSubtype = WORKBOOK_EQUIPMENT_BY_CATEGORY_GRADE_SUBTYPE.get(`${groupKey}|${item.subtype}`) || [];
      const pool = exactSubtype.length ? exactSubtype : candidates;
      if (pool.length) {
        const nearest = pool.map(row => ({ row, score: statKeys.reduce((sum, key) => sum + Math.abs((Number(originalBonus[key]) || 0) - (Number(row.bonus[key]) || 0)), 0) }))
          .sort((a, b) => a.score - b.score || a.row.equipmentRealm - b.row.equipmentRealm || a.row.equipmentStage - b.row.equipmentStage || a.row.id.localeCompare(b.row.id))[0].row;
        const preservedModifiers = Object.fromEntries(Object.entries(originalBonus).filter(([key, value]) => !statKeys.includes(key) || Number(value) < 0));
        item.bonus = { ...nearest.bonus, ...preservedModifiers };
        item.equipmentRealm = nearest.equipmentRealm;
        item.equipmentStage = nearest.equipmentStage;
        item.gradeExplicit = false;
        item.workbookBalanced = true;
        item.workbookSourceId = nearest.id;
      }
    }
    item.categoryData = ITEM_CATEGORY_DEFS[item.category];
    item.subtypeName = item.categoryData?.subtypes?.[item.subtype] || item.subtype;
    item.id = item.id || item.name;
    item.value = Number.isFinite(item.value) ? item.value : Math.round(4 * item.gradeData.priceMultiplier);
    return item;
  }
  function itemPowerMultiplier(item = {}) {
    const grade = ITEM_GRADES[item.grade] ? item.grade : inferItemGrade(item.bonus || item.stats || {});
    const explicit = item.gradeExplicit === true;
    return explicit && !item.workbookStats && !item.workbookBalanced ? (ITEM_GRADES[grade]?.powerMultiplier || 1) : 1;
  }
  function itemBonus(item = {}) {
    const raw = item && typeof item === 'object' ? (item.bonus || {}) : {};
    const multiplier = itemPowerMultiplier(item);
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Number.isFinite(Number(value)) ? Math.round(Number(value) * multiplier * 100) / 100 : value]));
  }
  function techniqueCategory(t) { const slot = TECHNIQUE_SLOTS[t.id] || 'support'; return slot === 'combat' ? 'attack' : slot; }
  function techniqueSubtype(t) {
    if (t.techniqueSubtype) return t.techniqueSubtype;
    if (t.id === 'sword' || t.id === 'starSword' || t.id === 'seniorFlow') return 'jian';
    if (t.id.startsWith('discovery_sword_')) return 'jian';
    if (t.id === 'clanBlade') return 'dagger';
    if (t.id === 'forbidden') return 'sword';
    if (t.id === 'step') return 'step';
    if (t.id === 'cloudShield' || t.id === 'masterPendant') return 'shield';
    if (t.id === 'tigerBody' || t.id === 'ironBody') return 'body';
    if (t.id === 'breath' || t.id === 'swiftBreath' || t.id === 'voidBreath') return 'breath';
    return t.id === 'survival' ? 'survival' : 'insight';
  }
  const TRAINING_GOALS = {
    safe: { name: 'ฝึกปลอดภัย', progress: .78, mastery: 1.05, risk: .55, body: 1 },
    progress: { name: 'เร่งความก้าวหน้า', progress: 1.18, mastery: .85, risk: 1.2, body: 1 },
    mastery: { name: 'เน้นความชำนาญวิชา', progress: .82, mastery: 1.45, risk: .85, body: 1 },
    breakthrough: { name: 'เตรียมทะลวงขั้น', progress: .68, mastery: 1.05, risk: .75, body: 1 },
    body: { name: 'ฝึกกายควบคู่', progress: .7, mastery: .9, risk: .65, body: 1.35 }
  };
  const TRAINING_LOCATION_MULTIPLIERS = { roadside: .72, retainer: .82, rented: .9, owned: 1, estate: 1.08, sect: 1.25, inn: .88, hidden_cave: 1.12 };
  const { TECHNIQUE_MASTERY_LEVELS, TECHNIQUE_TRAINING_RULES, TECHNIQUE_SLOT_LABELS, TECHNIQUE_SLOTS } = window.OneLifeTechniqueCatalog.createTechniqueRules();
  // ปรับวิชาจากคัมภีร์อิสระตามชั้น โดยเก็บสัดส่วนเอกลักษณ์ของแต่ละวิชาไว้
  // วิชาบำเพ็ญใช้สเกลที่อ่อนกว่า เพราะโบนัสฝึกมีผลร่วมกับตัวคูณอื่น
  function balanceDiscoveryManualTechnique(technique) {
    if (technique.workbookBalanceId || !technique.id.startsWith('discovery_') || technique.grade === 'legendary') return;
    const realm = manualRealmForTechnique(technique);
    const cultivation = techniqueSlot(technique) === 'cultivation';
    const multiplier = cultivation ? ([1, 1.25, 1.5][realm] ?? 1) : ([1, 2, 3][realm] ?? 1);
    const labels = { attack: 'โจมตี', defense: 'ป้องกัน', body: 'กายา', agility: 'ว่องไว', training: 'ความเร็วฝึก' };
    technique.bonus = Object.fromEntries(Object.entries(technique.bonus || {}).map(([key, value]) => [key, Number.isFinite(value) ? Math.round(value * multiplier) + (cultivation && key === 'training' ? realm * 2 : 0) : value]));
    if (cultivation && technique.grade === 'epic') {
      const extra = [{ defense: 2 }, { body: 3 }, { agility: 4 }][realm];
      if (extra) Object.entries(extra).forEach(([key, value]) => { technique.bonus[key] = (technique.bonus[key] || 0) + value; });
    }
    technique.effect = Object.entries(technique.bonus).map(([key, value]) => `${labels[key] || key} ${value >= 0 ? '+' : ''}${value}${key === 'training' ? '%' : ''}`).join(' · ');
  }
  TECHNIQUES.forEach(technique => {
    if (technique.manualSlot) TECHNIQUE_SLOTS[technique.id] = technique.manualSlot;
    technique.grade = technique.grade || inferItemGrade(technique.bonus);
    technique.category = techniqueCategory(technique);
    technique.subtype = techniqueSubtype(technique);
    if (!technique.workbookStats && technique.category !== 'support') {
      const workbookCategory = technique.category;
      const workbookSubtype = workbookCategory === 'attack' && technique.subtype === 'sword' ? 'jian' : technique.subtype;
      const candidates = Object.values(TECHNIQUE_LIBRARY_BY_ID).filter(item => item.category === workbookCategory);
      const exactSubtype = candidates.filter(item => item.techniqueSubtype === workbookSubtype);
      const pool = exactSubtype.length ? exactSubtype : candidates;
      if (pool.length) {
        const keys = ['attack', 'defense', 'agility', 'body', 'training'];
        const reference = pool.map(item => ({ item, score: keys.reduce((sum, key) => sum + Math.abs((Number(technique.bonus?.[key]) || 0) - (Number(item.bonus?.[key]) || 0)), 0) }))
          .sort((a, b) => a.score - b.score || a.item.id.localeCompare(b.item.id))[0].item;
        const preservedModifiers = Object.fromEntries(Object.entries(technique.bonus || {}).filter(([key, value]) => !keys.includes(key) || Number(value) < 0));
        technique.bonus = { ...reference.bonus, ...preservedModifiers };
        technique.grade = reference.grade;
        technique.workbookBalanceId = reference.id;
        technique.workbookRequiredRealm = reference.manualRealm;
        if (workbookCategory === 'cultivation') {
          technique.maxRealm = reference.maxRealm;
          technique.maxStage = reference.maxStage;
        }
      }
    }
    balanceDiscoveryManualTechnique(technique);
    technique.gradeData = ITEM_GRADES[technique.grade];
    technique.categoryData = TECHNIQUE_CATEGORY_DEFS[technique.category];
    technique.subtypeName = technique.categoryData?.subtypes?.[technique.subtype] || technique.subtype;
    technique.manualCategory = 'technique_manual';
    const labels = { attack: 'โจมตี', defense: 'ป้องกัน', body: 'กายา', agility: 'ว่องไว', training: 'ความเร็วฝึก', explore: 'สำรวจ' };
    technique.effect = Object.entries(technique.bonus || {}).map(([key, value]) => `${labels[key] || key} ${Number(value) >= 0 ? '+' : ''}${value}${key === 'training' ? '%' : ''}`).join(' · ');
  });
  function techniqueSlot(t) { return TECHNIQUE_SLOTS[t.id] || 'support'; }
  function ensureTechniqueLoadout(s) {
    s.techniqueLoadout = s.techniqueLoadout || { cultivation: null, combat: null, movement: null, defense: null, support: null };
    return s.techniqueLoadout;
  }
  // Infants and young children (through age 5) may only equip jewelry.
  function equipmentRequirement(s, item) {
    const normalized = normalizeItemGrade(typeof item === 'object' ? item : { name: item, bonus: {} });
    if (!['weapon', 'armor', 'talisman'].includes(normalized.category)) return null;
    const realm = Number(normalized.equipmentRealm) || 0, stage = Number(normalized.equipmentStage) || 0;
    const currentRealm = s.hero?.cultivationAccess || s.flags?.basicCultivation ? Math.max(1, Number(s.hero?.realm) || 1) : 0;
    const currentStage = Number(s.hero?.stage) || (currentRealm ? 1 : 0);
    return { realm, stage, name: realm ? `${REALMS[realm - 1]} ขั้น ${stage}` : 'ฝึกพื้นฐานร่างกาย', eligible: currentRealm > realm || (currentRealm === realm && currentStage >= stage) };
  }
  function itemAllowedByAge(s, item) {
    const age = Number(s?.hero?.ageMonths);
    if (!Number.isFinite(age) || age > 60) return true;
    const normalized = normalizeItemGrade(typeof item === 'object' ? item : { name: item, bonus: {} });
    return normalized.category === 'talisman';
  }

  function ensureTreasureIdentities(s) {
    s.treasures = Array.isArray(s.treasures) ? s.treasures : [];
    s.nextTreasureUid = Math.max(0, Number(s.nextTreasureUid) || 0);
    const reserved = new Set(s.treasures.filter(item => item && typeof item === 'object' && typeof item.inventoryUid === 'string' && item.inventoryUid).map(item => item.inventoryUid));
    const used = new Set();
    s.treasures.forEach((item, index) => {
      if (!item || typeof item !== 'object') item = s.treasures[index] = { name: String(item || ''), bonus: {} };
      if (typeof item.inventoryUid === 'string' && item.inventoryUid && !used.has(item.inventoryUid)) { used.add(item.inventoryUid); return; }
      let uid; do { uid = `treasure-${++s.nextTreasureUid}`; } while (reserved.has(uid) || used.has(uid));
      item.inventoryUid = uid; used.add(uid);
    });
  }
  function ensureItemLoadout(s) {
    ensureTreasureIdentities(s);
    s.itemLoadout = s.itemLoadout || { weapon: null, armor: null, boots: null, ring1: null, ring2: null, necklace: null, mount: null };
    Object.keys(ITEM_SLOT_DEFS).forEach(slot => { if (!(slot in s.itemLoadout)) s.itemLoadout[slot] = null; });
    // เซฟเดิมอ้างชนิดหรือชื่อไอเท็ม แปลงเป็นรหัสของชิ้นที่สวมโดยไม่ทิ้งช่องที่หาไม่พบ
    const assigned = new Set();
    Object.keys(ITEM_SLOT_DEFS).forEach(slot => {
      const key = s.itemLoadout[slot]; if (!key) return;
      const exact = s.treasures.find(item => item.inventoryUid === String(key));
      const legacy = !exact && s.treasures.find(item => !assigned.has(item.inventoryUid) && String(item.id || item.name) === String(key));
      const item = exact || legacy;
      if (item) { s.itemLoadout[slot] = item.inventoryUid; assigned.add(item.inventoryUid); }
    });
    // Old saves stored boots in the armor slot. Keep them equipped in the new slot.
    const previousArmor = s.itemLoadout.armor ? findTreasure(s, s.itemLoadout.armor) : null;
    if (previousArmor) {
      const known = typeof previousArmor === 'object' && previousArmor.id ? ITEM_LIBRARY_BY_ID[previousArmor.id] : null;
      const normalized = normalizeItemGrade(known || (typeof previousArmor === 'object' ? previousArmor : { name: previousArmor, bonus: {} }));
      if (normalized.category === 'armor' && normalized.subtype === 'boots') {
        if (!s.itemLoadout.boots) s.itemLoadout.boots = s.itemLoadout.armor;
        s.itemLoadout.armor = null;
      }
    }
    if (Number.isFinite(Number(s.hero?.ageMonths)) && Number(s.hero.ageMonths) <= 60) {
      ['weapon', 'armor', 'boots', 'mount'].forEach(slot => { s.itemLoadout[slot] = null; });
    }
    s.itemLoadoutMode = !!s.itemLoadoutMode;
    return s.itemLoadout;
  }
  function itemSlot(item) {
    const normalized = typeof item === 'object' ? item : { name: item };
    if (normalized.category === 'weapon') return 'weapon';
    if (normalized.category === 'armor') return normalized.subtype === 'boots' ? 'boots' : 'armor';
    if (normalized.category === 'mount') return 'mount';
    if (normalized.category === 'talisman' && normalized.subtype === 'ring') return null;
    if (normalized.category === 'talisman' && normalized.subtype === 'necklace') return 'necklace';
    return null;
  }
  function findTreasure(s, itemId) {
    ensureTreasureIdentities(s);
    const key = String(itemId);
    return s.treasures.find(item => item.inventoryUid === key) || s.treasures.find(item => String(item.id || item.name) === key);
  }
  function getEquippedMount(s) {
    const loadout = ensureItemLoadout(s);
    return loadout.mount ? findTreasure(s, loadout.mount) : null;
  }
  function beginItemLoadout(s) {
    const loadout = ensureItemLoadout(s);
    if (s.itemLoadoutMode) return;
    (s.treasures || []).forEach(item => {
      const normalized = normalizeItemGrade(typeof item === 'object' ? item : { name: item, bonus: {} });
      if (!itemAllowedByAge(s, normalized) || equipmentRequirement(s, normalized)?.eligible === false) return;
      const slot = normalized.subtype === 'ring' ? (!loadout.ring1 ? 'ring1' : !loadout.ring2 ? 'ring2' : null) : itemSlot(normalized);
      if (slot && !loadout[slot]) loadout[slot] = normalized.inventoryUid;
    });
    s.itemLoadoutMode = true;
  }
  function beginTechniqueLoadout(s) {
    if (s.loadoutMode) return;
    const loadout = ensureTechniqueLoadout(s), unlocked = unlockedTechniques(s);
    Object.keys(TECHNIQUE_SLOT_LABELS).forEach(slot => {
      loadout[slot] = unlocked.find(t => techniqueSlot(t) === slot)?.id || null;
    });
    s.loadoutMode = true;
  }
  function equipItem(s, itemId, slot = null) {
    ensureItemLoadout(s); const item = findTreasure(s, itemId);
    if (!item) return false;
    const normalized = typeof item === 'object' ? normalizeItemGrade(item) : normalizeItemGrade({ id: item, name: item, bonus: {} });
    const alreadyEquipped = Object.values(s.itemLoadout).some(id => String(id) === String(normalized.inventoryUid));
    if (!alreadyEquipped && (!itemAllowedByAge(s, normalized) || equipmentRequirement(s, normalized)?.eligible === false)) return false;
    const inferredSlot = itemSlot(normalized);
    const targetSlot = slot || inferredSlot;
    if (!targetSlot || !ITEM_SLOT_DEFS[targetSlot]) return false;
    const target = ITEM_SLOT_DEFS[targetSlot];
    if (target.category && normalized.category !== target.category) return false;
    if (target.subtype && normalized.subtype !== target.subtype) return false;
    if (targetSlot === 'ring1' || targetSlot === 'ring2') {
      if (normalized.category !== 'talisman' || normalized.subtype !== 'ring') return false;
    } else if (inferredSlot && inferredSlot !== targetSlot) return false;
    const itemKey = normalized.inventoryUid;
    Object.keys(s.itemLoadout).forEach(key => { if (s.itemLoadout[key] === itemKey && key !== targetSlot) s.itemLoadout[key] = null; });
    s.itemLoadout[targetSlot] = s.itemLoadout[targetSlot] === itemKey ? null : itemKey;
    s.itemLoadoutMode = true;
    return true;
  }
  function equippedTreasures(s) {
    ensureItemLoadout(s);
    const ids = new Set(Object.values(s.itemLoadout).filter(Boolean).map(String));
    return (s.treasures || []).filter(item => ids.has(String(item.inventoryUid)));
  }
  function activeTreasures(s) {
    const equipped = s.itemLoadoutMode ? new Set(equippedTreasures(s)) : null;
    const eligible = (s.treasures || []).filter(item => {
      if (item?.techniqueId || item?.consumable || item?.craftingMaterial || isUnopenedStoryContainer(item)) return false;
      const normalized = normalizeItemGrade(typeof item === 'object' ? item : { name: item, bonus: {} });
      if (equipmentRequirement(s, normalized)?.eligible === false) return false;
      const canEquip = !!itemSlot(normalized) || (normalized.category === 'talisman' && normalized.subtype === 'ring');
      if (canEquip && !itemAllowedByAge(s, normalized)) return false;
      return !canEquip || !equipped || equipped.has(item);
    });
    // Copies made from the same recipe remain separate inventory items, but
    // only the strongest eligible copy contributes passive bonuses.
    const best = new Map();
    eligible.forEach(item => {
      if (!item?.recipeId) return;
      const score = Object.values(itemBonus(item)).reduce((sum, value) => sum + (Number(value) || 0), 0);
      if (!best.has(item.recipeId) || score > best.get(item.recipeId).score) best.set(item.recipeId, { item, score });
    });
    return eligible.filter(item => !item?.recipeId || best.get(item.recipeId)?.item === item);
  }
  // ตราบนขวดหรือเอกสารบางชนิดเป็นรายละเอียดของวัตถุ ไม่ใช่กล่องที่ยังไม่ได้เปิด
  function isUnopenedStoryContainer(item) {
    return !!item?.sealed && ['กล่องเรือนนิรันดร์', 'ห่อผนึกของคนพเนจร'].includes(item.name);
  }
  function effectiveTechniques(s) {
    const unlocked = unlockedTechniques(s);
    if (!s.loadoutMode) return unlocked;
    const loadout = ensureTechniqueLoadout(s);
    return unlocked.filter(t => Object.values(loadout).includes(t.id));
  }
  function equippedCultivationTechnique(s) {
    if (!s?.loadoutMode) return null;
    const id = ensureTechniqueLoadout(s).cultivation;
    return TECHNIQUES.find(t => t.id === id && techniqueSlot(t) === 'cultivation' && t.unlock(s)) || null;
  }

  // เพดานของวิชาที่กำหนดไว้ ไม่ลดขั้นเดิมหากผู้เล่นติดตั้งวิชาที่ต่ำกว่า
  function cultivationTechniqueCeiling(technique) {
    if (!technique || techniqueSlot(technique) !== 'cultivation') return null;
    if (Number.isInteger(technique.maxRealm)) return { realm: technique.maxRealm, stage: technique.maxStage || 9 };
    if (technique.id.startsWith('discovery_')) return { realm: Math.min(REALMS.length, manualRealmForTechnique(technique) + 1), stage: 9 };
    if (technique.id === 'manual_cloud_origin' || technique.id === 'breath') return { realm: 1, stage: 9 };
    if (technique.id === 'swiftBreath') return { realm: 2, stage: 9 };
    if (technique.id === 'voidBreath') return { realm: 3, stage: 9 };
    return null;
  }
  function cultivationCeilingName(technique) {
    const cap = cultivationTechniqueCeiling(technique);
    return cap ? `${REALMS[cap.realm - 1]} ขั้น ${cap.stage}` : null;
  }
  function cultivationAtCeiling(s) {
    const cap = cultivationTechniqueCeiling(equippedCultivationTechnique(s));
    if (!cap || !s.hero?.cultivationAccess) return false;
    const realm = Number(s.hero.realm) || 0, stage = Number(s.hero.stage) || 0;
    return realm > cap.realm || (realm === cap.realm && stage >= cap.stage);
  }

  function equipTechnique(s, id) {
    const technique = TECHNIQUES.find(t => t.id === id);
    if (!technique || !technique.unlock(s)) return false;
    const unlocked = unlockedTechniques(s);
    const loadout = ensureTechniqueLoadout(s);
    const enteringLoadout = !s.loadoutMode;
    if (enteringLoadout) {
      s.loadoutMode = true;
      Object.keys(TECHNIQUE_SLOT_LABELS).forEach(slot => {
        const first = unlocked.find(t => techniqueSlot(t) === slot);
        loadout[slot] = first?.id || null;
      });
    }
    const slot = technique ? techniqueSlot(technique) : 'support';
    loadout[slot] = enteringLoadout ? id : loadout[slot] === id ? null : id;
    if (slot === 'cultivation' && loadout[slot] === id && !s.hero?.cultivationAccess) openCultivation(s, `ติดตั้งวิชา${technique.name}`, false);
    return true;
  }

  // “สัญชาตญาณเอาตัวรอด” เป็นพื้นฐานติดตัว ไม่ใช่วิชาที่ผู้เล่นเลือกโฟกัสได้
  // ดังนั้นช่วงที่ยังไม่มีวิชาอื่น ระบบจะตกกลับไปเป็นการฝึกร่างกายทั่วไปแทน
  function availableTrainingTechniques(s) {
    return TECHNIQUES.filter(t => t.id !== 'survival' && techniqueIsTrainable(s, t));
  }

  function selectedTrainingTechniques(s) {
    const available = availableTrainingTechniques(s);
    const allowed = new Set(available.map(t => t.id));
    const selected = Array.isArray(s.trainingSelection) ? s.trainingSelection : [];
    return selected.filter(id => allowed.has(id)).slice(0, 2);
  }

  function chooseTrainingSet(s) {
    const available = availableTrainingTechniques(s);
    if (!available.length) return [];
    const selected = selectedTrainingTechniques(s);
    if (selected.length) return selected.map(id => available.find(t => t.id === id));
    // ไม่เลือกเอง = สุ่มเพียงหนึ่งวิชา เพื่อให้การเลือกสองวิชาเป็นการตัดสินใจที่มีความหมาย
    return [available[Math.floor(Math.random() * available.length)]];
  }

  function trainingGainFor(s, techniques, combat) {
    const base = 7 + (s.relations.master >= 20 ? 2 : 0);
    const focusMultiplier = techniques.reduce((sum, t) => sum + 1 + ((t.bonus.training || 0) / 100), 0);
    return Math.max(3, Math.round(base * focusMultiplier * (combat.training || 100) / 100));
  }

  function ensureTrainingState(s) {
    s.trainingGoal = TRAINING_GOALS[s.trainingGoal] ? s.trainingGoal : 'progress';
    s.trainingMastery = s.trainingMastery && typeof s.trainingMastery === 'object' ? s.trainingMastery : {};
    s.trainingFocus = Array.isArray(s.trainingFocus) ? s.trainingFocus : [];
    s.trainingSwitchCooldown = Math.max(0, Number(s.trainingSwitchCooldown) || 0);
    s.trainingConsistencyMonths = clamp(Math.floor(Number(s.trainingConsistencyMonths) || 0), 0, 5);
    s.trainingFoundation = Math.max(0, Number(s.trainingFoundation) || 0);
    s.breakthroughState = s.breakthroughState && typeof s.breakthroughState === 'object' ? s.breakthroughState : { ready: false, nextPromptMonth: 0, lastAttempt: null };
    s.breakthroughState.ready = !!s.breakthroughState.ready;
    s.breakthroughState.nextPromptMonth = Number(s.breakthroughState.nextPromptMonth) || 0;
    s.autoTrainingRule = ['stop', 'auto-item', 'auto-foundation'].includes(s.autoTrainingRule) ? s.autoTrainingRule : 'stop';
    return s;
  }

  const { DISCOVERY_MANUAL_IDS, MANUAL_STUDY_TARGETS } = window.OneLifeTechniqueCatalog.createManualProgressionData();
  // Legendary manuals are authored separately; this only prepares the learning system.
  // ชั้นคัมภีร์แยกจากเกรดสี คัมภีร์บทแรกยังเปิดทางบำเพ็ญได้ก่อนหลอมกาย
  function manualRealmForTechnique(technique) {
    if (Number.isInteger(technique?.manualRealm)) return clamp(technique.manualRealm, 0, REALMS.length);
    if (technique?.id?.startsWith('discovery_third_')) return 2;
    if (technique?.id?.startsWith('discovery_alt_')) return 1;
    return 0;
  }
  function manualRealmName(realm) { return realm === 0 ? 'ฝึกพื้นฐานร่างกาย' : (REALMS[realm - 1] || 'ไม่ทราบขั้น'); }
  function manualStudyTarget(manual) { return (MANUAL_STUDY_TARGETS[manual.grade] || 12) + Math.min(2, Math.max(0, Number(manual.manualRealm) || 0)) * 4; }
  function manualLearningRequirement(s, manual) {
    const required = Number.isInteger(manual?.manualRealm) ? clamp(manual.manualRealm, 0, REALMS.length) : manualRealmForTechnique(TECHNIQUES.find(t => t.id === manual?.techniqueId));
    const current = s.hero?.cultivationAccess || s.flags?.basicCultivation ? Math.max(1, Number(s.hero?.realm) || 1) : 0;
    const requiredStage = Number.isInteger(manual?.manualStage) ? clamp(manual.manualStage, 0, 9) : 0;
    const currentStage = current ? clamp(Number(s.hero?.stage) || 1, 1, 9) : 0;
    return { required, requiredStage, name: manualRealmName(required), eligible: current > required || (current === required && currentStage >= requiredStage) };
  }
  function normalizeDiscoveryManuals(s) {
    s.learnedManualTechniques = Array.isArray(s.learnedManualTechniques) ? s.learnedManualTechniques : [];
    (s.treasures || []).forEach(item => {
      if (!item || typeof item !== 'object') return;
      const techniqueId = item.techniqueId || DISCOVERY_MANUAL_IDS[item.name];
      if (!techniqueId || !TECHNIQUES.some(t => t.id === techniqueId)) return;
      item.techniqueId = techniqueId;
      const newName = discoveryManualName(techniqueId);
      if (newName) item.name = newName;
      const technique = TECHNIQUES.find(t => t.id === techniqueId);
      const typeKey = techniqueId.startsWith('discovery_') ? techniqueId.split('_')[1] : null;
      const def = MANUAL_DISCOVERY_TYPES[typeKey];
      item.category = 'technique_manual'; item.subtype = technique.manualSubtype || def?.manualSubtype || (technique.manualSlot === 'cultivation' ? 'cultivation' : 'attack_jian');
      item.learningType = technique.learningType || def?.learningType || 'martial';
      item.manualRealm = manualRealmForTechnique(technique);
      item.manualStage = Number.isInteger(technique.manualStage) ? technique.manualStage : 0;
      item.bonus = {};
    });
  }
  function availableTechniqueManuals(s) {
    normalizeDiscoveryManuals(s);
    return (s.treasures || []).filter(item => item?.techniqueId && !s.learnedManualTechniques.includes(item.techniqueId));
  }
  // แต้มเรียน 1 จุดเทียบกับหนึ่งเดือนฐานที่ฝึก 100% และอ่านด้วยตนเอง
  function manualStudySpeed(s, route) {
    const combat = syncCombat(s);
    const root = ROOT_TRAINING_MULTIPLIER[s.hero?.root] ?? ROOT_TRAINING_MULTIPLIER.human;
    const location = Math.max(.1, Number(route?.knowledgeGain) || 1);
    const teacher = Math.max(.1, Number(route?.teacher?.multiplier) || 1);
    const learningItems = Math.max(.1, 1 + learningItemBonus(s) / 100);
    return Math.max(.1, combat.training / 100 * root * location * teacher * learningItems);
  }
  function manualStudyMonthsLeft(s, manual, route) {
    const learning = ensureLearningState(s);
    const remaining = Math.max(0, manualStudyTarget(manual) - (Number(learning.manualProgress[manual.techniqueId]) || 0));
    return Math.ceil((remaining - 1e-9) / manualStudySpeed(s, route));
  }
  function formatManualProgress(value) { return String(Number((Number(value) || 0).toFixed(2))); }
  function studySelectedManual(s, route) {
    const learning = ensureLearningState(s);
    if (!learning.techniqueFocus?.startsWith('manual:')) return null;
    const id = learning.techniqueFocus.slice(7);
    const manual = availableTechniqueManuals(s).find(item => item.techniqueId === id);
    const technique = TECHNIQUES.find(item => item.id === id);
    if (!manual || !technique) { learning.techniqueFocus = null; return null; }
    const requirement = manualLearningRequirement(s, manual);
    if (!requirement.eligible) { learning.techniqueFocus = null; addLog(`ยังเรียน “${manual.name}” ไม่ได้ ต้องมีขั้น ${requirement.name} จึงกลับไปศึกษาความรู้ทั่วไป`, true); return null; }
    const target = manualStudyTarget(manual);
    const gain = manualStudySpeed(s, route);
    learning.manualProgress[id] = Math.min(target, Math.round(((Number(learning.manualProgress[id]) || 0) + gain) * 1000000) / 1000000);
    const complete = learning.manualProgress[id] >= target;
    if (complete) {
      // Preserve the active set before unlocking; the new technique is not equipped automatically.
      if (!s.loadoutMode) beginTechniqueLoadout(s);
      s.learnedManualTechniques.push(id);
      learning.techniqueFocus = null;
      addLog(`เรียนคัมภีร์สำเร็จ: “${technique.name}” อยู่ในรายการวิชาที่เรียนรู้แล้ว เลือกติดตั้งเพื่อใช้งาน`, true);
    }
    return { technique, progress: learning.manualProgress[id], target, gain, complete };
  }

  function ensureLearningState(s) {
    s.learningState = s.learningState && typeof s.learningState === 'object' ? s.learningState : {};
    s.learningState.months = Math.max(0, Number(s.learningState.months) || 0);
    s.learningState.lastLocation = typeof s.learningState.lastLocation === 'string' ? s.learningState.lastLocation : null;
    s.learningState.lastTechnique = typeof s.learningState.lastTechnique === 'string' ? s.learningState.lastTechnique : null;
    s.learningState.lastType = typeof s.learningState.lastType === 'string' ? s.learningState.lastType : null;
    s.learningState.lastTeacher = typeof s.learningState.lastTeacher === 'string' ? s.learningState.lastTeacher : null;
    s.learningState.techniqueFocus = typeof s.learningState.techniqueFocus === 'string' ? s.learningState.techniqueFocus : null;
    s.learningState.focus = LEARNING_TYPES[s.learningState.focus] ? s.learningState.focus : 'lore';
    s.learningState.autoRule = LEARNING_AUTO_RULES[s.learningState.autoRule] ? s.learningState.autoRule : 'balanced';
    s.learningState.knowledge = s.learningState.knowledge && typeof s.learningState.knowledge === 'object' ? s.learningState.knowledge : {};
    Object.keys(LEARNING_TYPES).forEach(type => { s.learningState.knowledge[type] = Math.max(0, Math.min(100, Number(s.learningState.knowledge[type]) || 0)); });
    s.learningState.manualProgress = s.learningState.manualProgress && typeof s.learningState.manualProgress === 'object' ? s.learningState.manualProgress : {};
    s.learningState.techniqueKnowledge = s.learningState.techniqueKnowledge && typeof s.learningState.techniqueKnowledge === 'object' ? s.learningState.techniqueKnowledge : {};
    Object.keys(s.learningState.techniqueKnowledge).forEach(id => { s.learningState.techniqueKnowledge[id] = Math.max(0, Math.min(100, Number(s.learningState.techniqueKnowledge[id]) || 0)); });
    return s.learningState;
  }

  function learningLocationKey(s) {
    ensureLocationState(s); ensureLearningState(s);
    const available = getAvailableLocations(s, 'study');
    if (available.some(location => location.id === s.locations.current)) return s.locations.current;
    return available[0]?.id || (s.flags?.metSect && s.month >= 84 ? 'sect' : null);
  }

  function learningRoute(s) {
    const location = learningLocationKey(s);
    const teacher = learningTeacher(s, location);
    if (location === 'sect') return { name: 'ศึกษาคัมภีร์สำนัก', knowledgeGain: 3, insight: 2, teacher, log: 'อ่านคัมภีร์สำนักและถกวิชากับผู้รู้ ทำให้เห็นจุดเชื่อมระหว่างความรู้กับการฝึกจริง' };
    if (location === 'estate') return { name: 'ศึกษาหอคัมภีร์ตระกูล', knowledgeGain: 2, insight: 1, teacher, log: 'ค้นคว้าหอคัมภีร์ตระกูล รวบรวมความรู้ที่คนรุ่นก่อนทิ้งไว้' };
    if (location === 'owned') return { name: 'ศึกษาตำราที่บ้าน', knowledgeGain: 2, insight: 1, teacher, log: 'ทบทวนตำราที่บ้านและจัดระเบียบความเข้าใจให้เป็นระบบ' };
    return { name: 'อ่านตำราและฟังคำสอน', knowledgeGain: 1, insight: 1, teacher, log: 'อ่านตำรา สอบถามผู้รู้ และจัดระเบียบความเข้าใจจากสิ่งที่พบเจอ' };
  }

  function rootLevel(s) { return Math.max(0, ['none', 'human', 'earth', 'heaven', 'immortal', 'legend'].indexOf(s.hero?.root || 'human')); }
  function trainingLocationKey(s) {
    ensureLocationState(s);
    const available = getAvailableLocations(s, 'train');
    if (s.locations?.selected && available.some(item => item.id === s.locations.selected)) return s.locations.selected;
    if (s.locations?.current && available.some(item => item.id === s.locations.current)) return s.locations.current;
    return available[0]?.id || 'roadside';
  }
  function techniqueTrainingRule(technique) {
    if (TECHNIQUE_TRAINING_RULES[technique?.id]) return TECHNIQUE_TRAINING_RULES[technique.id];
    const slot = techniqueSlot(technique);
    const kind = slot === 'combat' ? 'combat' : slot === 'cultivation' ? 'cultivation'
      : slot === 'movement' ? 'movement' : slot === 'defense' && technique?.subtype === 'body' ? 'body'
        : slot === 'defense' ? 'defense' : 'general';
    return { kind, minRootLevel: 0 };
  }
  function techniqueIsTrainable(s, technique) {
    if (!technique || !technique.unlock(s)) return false;
    const rule = techniqueTrainingRule(technique);
    if (rootLevel(s) < (rule.minRootLevel || 0)) return false;
    if (rule.requiresSect && !s.flags?.metSect) return false;
    if (rule.requiresTeacher && !(s.flags?.cultivationLearned || s.flags?.masterBondGiven || (s.relations?.master || 0) >= 20)) return false;
    return true;
  }
  function trainingResourceCost(s, techniques = []) {
    const cost = {};
    techniques.forEach(technique => Object.entries(techniqueTrainingRule(technique).cost || {}).forEach(([key, value]) => { cost[key] = (cost[key] || 0) + value; }));
    return cost;
  }
  function canPayTrainingCost(s, cost) { ensureInventory(s); return Object.entries(cost).every(([key, value]) => key === 'money' ? Number(s.hero.money || 0) >= value : Number(s.materials[key] || 0) >= value); }
  function payTrainingCost(s, cost) { ensureInventory(s); Object.entries(cost).forEach(([key, value]) => { if (key === 'money') s.hero.money = Math.max(0, Number(s.hero.money || 0) - value); else s.materials[key] = Math.max(0, Number(s.materials[key] || 0) - value); }); }
  function trainingItemBonus(s) {
    const totals = { cultivationRate: 0, masteryRate: 0, breakthroughBonus: 0, riskReduction: 0, healthCost: 0, gradeRate: 1 };
    activeTreasures(s).forEach(item => {
      const normalized = normalizeItemGrade(item);
      const bonus = itemBonus(normalized);
      Object.keys(totals).filter(key => key !== 'gradeRate').forEach(key => { totals[key] += Number(bonus[key] || 0); });
      if (bonus.training || bonus.cultivationRate || bonus.masteryRate) {
        totals.gradeRate *= ({ common: 1, uncommon: 1.03, rare: 1.06, epic: 1.1, legendary: 1.15 }[normalized.grade] || 1);
      }
    });
    return totals;
  }
  function techniqueMasteryLevel(s, id) {
    const value = Number(ensureTrainingState(s).trainingMastery[id] || 0);
    return [...TECHNIQUE_MASTERY_LEVELS].reverse().find(level => value >= level.min) || TECHNIQUE_MASTERY_LEVELS[0];
  }
  function techniqueMasteryBonus(s, id) {
    const level = techniqueMasteryLevel(s, id);
    const index = TECHNIQUE_MASTERY_LEVELS.findIndex(item => item.min === level.min);
    return [1, 1.03, 1.07, 1.12, 1.18][Math.max(0, index)] || 1;
  }
  // พื้นฐานกายมีเพดาน 100 เพื่อไม่ให้โบนัสจากเซฟเก่าหรืออีเวนต์เกินสมดุล
  function bodyFoundationBenefits(s) {
    const value = clamp(Number(s.hero?.bodyFoundation) || 0, 0, 100);
    return {
      value,
      breakthroughBonus: Math.floor(value / 10),
      injuryChanceMultiplier: 1 - value / 200,
      healthCostMultiplier: 1 - value * .003,
      earlyTrainingMultiplier: (s.hero?.realm || 0) === 1 ? 1 + value * .002 : 1
    };
  }

  function disciplineBenefits(s) {
    const value = clamp(Number(s.hero?.discipline) || 0, 0, 100);
    const months = clamp(Math.floor(Number(s.trainingConsistencyMonths) || 0), 0, 5);
    return { value, months, breakthroughBonus: Math.floor(value / 10), trainingMultiplier: 1 + months * value / 5000 };
  }

  function trainingProfile(s, techniques = []) {
    ensureTrainingState(s);
    techniques = techniques.filter(Boolean);
    const goal = TRAINING_GOALS[s.trainingGoal];
    const item = trainingItemBonus(s);
    const resourceCost = trainingResourceCost(s, techniques);
    const location = trainingLocationKey(s);
    const locationMultiplier = TRAINING_LOCATION_MULTIPLIERS[location] || 1;
    const rootMultiplier = ROOT_TRAINING_MULTIPLIER[s.hero.root] ?? ROOT_TRAINING_MULTIPLIER.human;
    const methodMultiplier = (techniques.length ? techniques.reduce((sum, technique) => sum + 1 + Number(technique.bonus?.training || 0) / 100, 0) / techniques.length : .7) * item.gradeRate;
    const compatibility = techniques.length ? techniques.reduce((sum, technique) => sum + (techniqueIsTrainable(s, technique) ? 1 : .35), 0) / techniques.length : 1;
    const masteryMultiplier = techniques.length ? techniques.reduce((sum, technique) => sum + techniqueMasteryBonus(s, technique.id), 0) / techniques.length : 1;
    const bodyFoundation = bodyFoundationBenefits(s);
    const healthCost = Math.max(1, Math.round(((goal.risk > 1 ? 3 : 1) + item.healthCost) * bodyFoundation.healthCostMultiplier));
    return { goal, item, resourceCost, location, locationMultiplier, rootMultiplier, methodMultiplier, masteryMultiplier, compatibility, healthCost, bodyFoundation };
  }

  const CULTIVATION_GRADE_BREAKTHROUGH_BONUS = { common: 0, uncommon: 6, rare: 10, epic: 18, legendary: 30 };
  function cultivationGradeBreakthroughBonus(s) {
    const technique = equippedCultivationTechnique(s);
    return technique ? (CULTIVATION_GRADE_BREAKTHROUGH_BONUS[technique.grade] ?? 0) : 0;
  }

  // At a bottleneck use the player's selection, or the most recently trained
  // techniques; computing a chance must never roll a new training focus.
  function breakthroughTrainingSet(s) {
    const available = availableTrainingTechniques(s);
    const selected = selectedTrainingTechniques(s);
    const ids = selected.length ? selected : (Array.isArray(s.trainingFocus) ? s.trainingFocus : []);
    const techniques = ids.map(id => available.find(t => t.id === id)).filter(Boolean);
    return techniques.length ? techniques : available.slice(0, 1);
  }

  function breakthroughChance(s, mode = 'force', extraFoundation = 0) {
    ensureTrainingState(s); const techniques = breakthroughTrainingSet(s); const p = trainingProfile(s, techniques);
    const base = 18 + rootLevel(s) * 7 + Math.round((s.trainingFoundation + extraFoundation) * .45);
    const site = p.location === 'sect' ? 12 : p.location === 'hidden_cave' ? 5 : 0;
    const mastery = techniques.reduce((sum, t) => sum + (techniqueMasteryLevel(s, t.id).min / 10), 0);
    const item = p.item.breakthroughBonus;
    const modeBonus = mode === 'item' ? 18 : mode === 'foundation' ? 10 : 0;
    return clamp(Math.round((base + site + mastery + item + modeBonus) * (mode === 'force' ? .72 : 1)) + cultivationGradeBreakthroughBonus(s) + bodyFoundationBenefits(s).breakthroughBonus + disciplineBenefits(s).breakthroughBonus, 5, 95);
  }

  function breakthroughItem(s) { return activeTreasures(s).find(item => Number(itemBonus(item).breakthroughBonus || 0) > 0); }
  function breakthroughFailureOutcome(s, mode, chance) {
    const h = s.hero;
    const healthRatio = h.maxHealth ? h.health / h.maxHealth : 1;
    const qiRatio = h.qiMax ? h.qi / h.qiMax : 1;
    const dangerousStage = (h.realm || 1) >= 3 || (h.stage || 1) >= 7;
    const protectedByItem = activeTreasures(s).reduce((sum, item) => sum + Number(itemBonus(item).breakthroughProtection || 0), 0) > 0;
    const fatal = mode === 'force' && !protectedByItem && dangerousStage && chance <= 10 && healthRatio <= .3 && qiRatio <= .25;
    if (fatal) return { severity: 'fatal', healthLoss: h.health, qiLoss: Math.max(12, Math.round((h.qiMax || 20) * .3)), scar: true };
    const severe = mode === 'force' && (chance < 25 || dangerousStage);
    return { severity: severe ? 'severe' : 'injury', healthLoss: severe ? 18 + Math.max(0, (h.realm || 1) - 1) * 4 : mode === 'force' ? 12 : 5, qiLoss: severe ? 18 : 12, scar: severe && chance < 18 };
  }
  function attemptBreakthrough(s, mode) {
    ensureTrainingState(s); const h = s.hero; if (!h.cultivationAccess || !equippedCultivationTechnique(s) || !s.breakthroughState.ready || cultivationAtCeiling(s)) return false;
    const item = mode === 'item' ? breakthroughItem(s) : null;
    if (mode === 'item' && !item) return false;
    const chance = breakthroughChance(s, mode);
    if (item) s.treasures = s.treasures.filter(candidate => candidate !== item);
    const success = Math.random() * 100 < chance;
    s.breakthroughState.lastAttempt = { mode, chance, success, month: s.month };
    if (success) { h.cultivation = Math.max(0, h.cultivation - 100); s.breakthroughState = { ready: false, nextPromptMonth: 0, lastAttempt: s.breakthroughState.lastAttempt }; s.trainingFoundation = 0; advanceCultivationStage(s, 1, true); addLog(`ทะลวงขั้นสำเร็จด้วยโอกาส ${chance}%`, true); return true; }
    const outcome = breakthroughFailureOutcome(s, mode, chance);
    h.health = outcome.severity === 'fatal' ? 0 : Math.max(1, h.health - outcome.healthLoss);
    h.qi = Math.max(0, (h.qi || 0) - outcome.qiLoss);
    s.trainingFoundation = Math.max(0, s.trainingFoundation - (outcome.severity === 'severe' ? 5 : 2));
    s.breakthroughState.nextPromptMonth = s.month + (outcome.severity === 'severe' ? 3 : 2);
    if (outcome.scar) { s.flags = s.flags || {}; s.flags.breakthroughScar = true; }
    const labels = { injury: 'บาดเจ็บจากปราณตีกลับ', severe: 'บาดเจ็บหนัก ชีพจรแตกร้าว', fatal: 'ปราณแตกดับ ร่างกายไม่อาจรับด่านนี้ได้' };
    addLog(`ทะลวงขั้นล้มเหลว (${labels[outcome.severity]}) โอกาสครั้งนั้น ${chance}%`, true);
    if (outcome.severity === 'fatal' && !s.ending) endGame('death', { cause: 'ฝืนทะลวงด่านใหญ่ทั้งที่สุขภาพและปราณไม่พร้อม จนปราณแตกดับ' });
    return false;
  }

  function breakthroughEvent(s) {
    ensureTrainingState(s); const item = breakthroughItem(s); const force = breakthroughChance(s, 'force'); const itemChance = breakthroughChance(s, 'item'); const foundation = breakthroughChance(s, 'force', 8);
    return { id: `breakthrough-${s.month}-${s.hero.realm}-${s.hero.stage}`, tag: 'ด่านทะลวงขั้น', title: `ประตูด่าน ${realmName(s.hero)}`, art: 'breakthrough',
      text: `ความก้าวหน้าของเจ้าถึงขีดจำกัดแล้ว ปราณหมุนวนอยู่หน้าประตูด่าน หากเลือกผิด ชีพจรอาจบาดเจ็บ แต่หากวางรากฐานต่อ โอกาสสำเร็จจะสูงขึ้น วิชาบำเพ็ญที่ติดตั้ง: ${equippedCultivationTechnique(s)?.name || 'ไม่มี'} · โบนัสจากเกรด +${cultivationGradeBreakthroughBonus(s)} จุดเปอร์เซ็นต์ · พื้นฐานกาย +${bodyFoundationBenefits(s).breakthroughBonus} · วินัย +${disciplineBenefits(s).breakthroughBonus} จุดเปอร์เซ็นต์ (โอกาสรวมสูงสุด 95%)${s.hero.stage === 9 && s.hero.realm < REALMS.length ? ` · หากทะลวงขั้นใหญ่สำเร็จ อายุขัย +${majorRealmLifespanBonus(s.hero.realm + 1).toLocaleString()} ปี` : ''}`,
      choices: [
        { text: `ฝืนทะลวงทันที · โอกาสสำเร็จ ${force}%`, note: force < 20 ? 'อันตรายสูงมาก: หากพลาดอาจเสียชีวิต' : force < 45 ? 'อันตรายสูง: หากพลาดอาจบาดเจ็บหนัก' : 'เสี่ยงบาดเจ็บหากล้มเหลว', effect: state => attemptBreakthrough(state, 'force') },
        { text: item ? `ใช้ ${item.name} ช่วยทะลวง · โอกาสสำเร็จ ${itemChance}%` : 'ใช้ของช่วยทะลวง', note: item ? (itemChance < 20 ? 'อันตรายสูงมากแม้มีของช่วย: หากพลาดอาจเสียชีวิต' : itemChance < 45 ? 'ยังมีความเสี่ยงบาดเจ็บหนัก' : 'ใช้ของวิเศษหนึ่งชิ้น') : 'ต้องมีของวิเศษที่ช่วยทะลวงขั้น', locked: 'ยังไม่มีของวิเศษที่เหมาะสม', requires: () => !!item, effect: state => attemptBreakthrough(state, 'item') },
        { text: `ฝึกพื้นฐานต่อ · โอกาสฝืนหลังฝึก ${foundation}%`, note: foundation === force ? 'รากฐาน +8 · โอกาสถึงเพดาน 95% แล้ว' : `รากฐาน +8 · โอกาสฝืนเพิ่ม ${foundation - force} จุดเปอร์เซ็นต์ หากปัจจัยอื่นคงเดิม`, effect: state => { ensureTrainingState(state); const before = breakthroughChance(state, 'force'); state.trainingFoundation += 8; state.breakthroughState.nextPromptMonth = state.month + 2; const after = breakthroughChance(state, 'force'); addLog(`ฝึกพื้นฐาน +8 · โอกาสฝืนทะลวง ${before}% → ${after}%${after === 95 ? ' (ถึงเพดาน)' : ''}`, true); } }
      ] };
  }

  function hasTreasure(s, name) {
    return (s.treasures || []).some(item => (typeof item === 'string' ? item : item.name) === name);
  }

  function restLocationKey(s) {
    ensureLocationState(s);
    if (s.locations.forced) return s.locations.forced;
    if (s.locations.selected && getAvailableLocations(s).some(location => location.id === s.locations.selected)) return s.locations.selected;
    if (s.flags?.metSect && s.month >= 84) return 'sect';
    const housing = s.household?.housing;
    if (housing === 'estate' || (s.family?.buildings || []).includes('home_hall')) return 'estate';
    if (housing === 'owned') return 'owned';
    if (housing === 'rented') return 'rented';
    if (s.locations.current && getAvailableLocations(s).some(location => location.id === s.locations.current)) return s.locations.current;
    if (s.flags?.retainerAlive) return 'retainer';
    return 'roadside';
  }
  function workLocationKey(s) {
    const locations = ensureLocationState(s);
    const available = getAvailableLocations(s, 'work');
    if (locations.work && available.some(location => location.id === locations.work)) return locations.work;
    if (available.some(location => location.id === locations.current)) return locations.current;
    return available[0]?.id || 'roadside';
  }

  function restItemBonus(s) {
    const items = activeTreasures(s).filter(item => typeof item === 'object' && item.bonus);
    if (!items.length) return { name: null, health: 0, qi: 0 };
    const ranked = items.map(item => ({
      item,
      health: Math.max(0, Number(itemBonus(item).restHealth || 0)),
      qi: Math.max(0, Number(itemBonus(item).restQi || 0))
    })).filter(entry => entry.health || entry.qi).sort((a, b) => (b.health + b.qi) - (a.health + a.qi));
    const best = ranked[0];
    const penalties = items.reduce((sum, item) => { const bonus = itemBonus(item); sum.health += Math.min(0, Number(bonus.restHealth || 0)); sum.qi += Math.min(0, Number(bonus.restQi || 0)); return sum; }, { health: 0, qi: 0 });
    return { name: best?.item.name || null, health: (best?.health || 0) + penalties.health, qi: (best?.qi || 0) + penalties.qi };
  }

  function restRoute(s) {
    const key = restLocationKey(s);
    const location = LOCATION_DEFS[key] || LOCATION_DEFS.roadside;
    const rest = location.rest || LOCATION_DEFS.roadside.rest;
    const formationLevel = key === 'sect' ? clamp(Number(s.flags?.sectFormationLevel) || 1, 1, 5) : 0;
    const formationMultiplier = key === 'sect' ? 1 + formationLevel * .08 : 1;
    const item = restItemBonus(s);
    return {
      key,
      location: location.name,
      safety: location.safety,
      heal: Math.max(0, Math.round((rest.health + item.health) * rest.healthMultiplier * formationMultiplier)),
      qi: Math.max(0, Math.round((rest.qi + item.qi) * rest.qiMultiplier * formationMultiplier)),
      itemName: item.name,
      log: item.name ? `พักที่${location.name}โดยอาศัย${item.name}` : `พักที่${location.name}`
    };
  }

  function ensureLocationState(s) {
    s.locations = s.locations || { current: 'roadside', owned: ['roadside'], selected: null, work: null, forced: null, destroyed: [], longRest: null };
    s.locations.owned = Array.isArray(s.locations.owned) ? s.locations.owned : ['roadside'];
    s.locations.destroyed = Array.isArray(s.locations.destroyed) ? s.locations.destroyed : [];
    s.locations.current = LOCATION_DEFS[s.locations.current] ? s.locations.current : 'roadside';
    s.locations.selected = LOCATION_DEFS[s.locations.selected] ? s.locations.selected : null;
    s.locations.work = LOCATION_DEFS[s.locations.work] ? s.locations.work : null;
    s.locations.forced = LOCATION_DEFS[s.locations.forced] ? s.locations.forced : null;
    s.locations.longRest = s.locations.longRest && Number.isFinite(s.locations.longRest.monthsLeft) ? s.locations.longRest : null;
    if (!s.locations.owned.includes('roadside')) s.locations.owned.unshift('roadside');
    const housingMap = { rented: 'rented', owned: 'owned', estate: 'estate' };
    const householdLocation = housingMap[s.household?.housing];
    if (householdLocation && !s.locations.owned.includes(householdLocation)) s.locations.owned.push(householdLocation);
    if (s.flags?.retainerAlive && !s.locations.owned.includes('retainer')) s.locations.owned.push('retainer');
    if (s.family?.buildings?.includes('home_hall') && !s.locations.owned.includes('estate')) s.locations.owned.push('estate');
    if (s.flags?.metSect && !s.locations.owned.includes('sect')) s.locations.owned.push('sect');
    if (hasOfficialRight(s, 'หอคัมภีร์ชั้นต้น') && !s.locations.owned.includes('sect_archive')) s.locations.owned.push('sect_archive');
    if (hasOfficialRight(s, 'ทะเบียนคดีและเขตสอบสวน') && !s.locations.owned.includes('city_records')) s.locations.owned.push('city_records');
    if ((s.flags?.foundMap || s.flags?.escapePrepared) && !s.locations.owned.includes('hidden_cave')) s.locations.owned.push('hidden_cave');
    return s.locations;
  }

  function getAvailableLocations(s, activity = 'rest') {
    const locations = ensureLocationState(s);
    return Object.entries(LOCATION_DEFS).filter(([id, def]) => {
      if (locations.destroyed.includes(id) || !def.activities.includes(activity)) return false;
      if (id !== 'roadside' && !locations.owned.includes(id)) return false;
      if (id !== 'inn') return !def.requires || def.requires(s);
      return true;
    }).map(([id, def]) => ({ id, ...def }));
  }

  function selectLocation(s, id) {
    const available = getAvailableLocations(s, 'rest');
    if (!available.some(location => location.id === id)) return false;
    ensureLocationState(s).selected = id;
    addLog(`เลือกสถานที่พัก: ${LOCATION_DEFS[id].name}`);
    return true;
  }
  function selectWorkLocation(s, id) {
    const available = getAvailableLocations(s, 'work');
    if (!available.some(location => location.id === id)) return false;
    const locations = ensureLocationState(s);
    locations.work = id;
    locations.current = id;
    addLog(`เลือกสถานที่ทำงาน: ${LOCATION_DEFS[id].name}`);
    return true;
  }

  function setCurrentLocation(s, id) {
    const available = getAvailableLocations(s);
    if (!available.some(location => location.id === id)) return false;
    ensureLocationState(s).current = id;
    return true;
  }

  function unlockLocation(s, id) {
    if (!LOCATION_DEFS[id]) return false;
    const locations = ensureLocationState(s);
    if (!locations.owned.includes(id)) locations.owned.push(id);
    return true;
  }

  function acquireLocation(s, id) {
    const def = LOCATION_DEFS[id];
    if (!def || id === 'roadside' || ensureLocationState(s).owned.includes(id)) return false;
    if (def.requires && !def.requires(s)) return false;
    const cost = Math.max(0, Number(def.cost || 0));
    if ((s.hero?.money || 0) < cost) return false;
    s.hero.money -= cost;
    unlockLocation(s, id);
    selectLocation(s, id);
    addLog(`${def.name}เปิดใช้งานแล้ว${cost ? ` จ่าย ${cost} ตำลึง` : ''}`, true);
    return true;
  }

  function destroyLocation(s, id, reason = 'เหตุการณ์ของโลก') {
    if (!LOCATION_DEFS[id]) return false;
    const locations = ensureLocationState(s);
    if (locations.destroyed.includes(id)) return false;
    if (!locations.destroyed.includes(id)) locations.destroyed.push(id);
    locations.owned = locations.owned.filter(locationId => locationId !== id);
    if (locations.selected === id) locations.selected = null;
    addLog(`${LOCATION_DEFS[id].name}ใช้การไม่ได้: ${reason}`, true);
    return true;
  }

  function ensureAutoRestRule(s) {
    s.autoRestRule = s.autoRestRule || { enabled: true, threshold: 35 };
    s.autoRestRule.enabled = !!s.autoRestRule.enabled;
    s.autoRestRule.threshold = clamp(Number(s.autoRestRule.threshold) || 50, 10, 90);
    return s.autoRestRule;
  }
  function ensureAutoWorkRule(s) {
    s.autoWorkRule = s.autoWorkRule || { enabled: true, fatigueThreshold: 6, riskThreshold: 2 };
    s.autoWorkRule.enabled = s.autoWorkRule.enabled !== false;
    s.autoWorkRule.fatigueThreshold = clamp(Number(s.autoWorkRule.fatigueThreshold) || 6, 2, 12);
    s.autoWorkRule.riskThreshold = clamp(Number(s.autoWorkRule.riskThreshold) || 2, 1, 6);
    return s.autoWorkRule;
  }
  function setAutoWorkRule(s, enabled, fatigueThreshold = 6, riskThreshold = 2) {
    const rule = ensureAutoWorkRule(s);
    rule.enabled = !!enabled;
    rule.fatigueThreshold = clamp(Number(fatigueThreshold) || 6, 2, 12);
    rule.riskThreshold = clamp(Number(riskThreshold) || 2, 1, 6);
    return rule;
  }

  function setAutoRestRule(s, enabled, threshold = 50) {
    const rule = ensureAutoRestRule(s);
    rule.enabled = !!enabled;
    rule.threshold = clamp(Number(threshold) || 50, 10, 90);
    return rule;
  }

  function ensureAutoMedicineRule(s) {
    s.autoMedicineRule = s.autoMedicineRule || { enabled: false, healThreshold: 35, autoAntidote: true, autoFatigue: true };
    s.autoMedicineRule.enabled = !!s.autoMedicineRule.enabled;
    s.autoMedicineRule.healThreshold = clamp(Number(s.autoMedicineRule.healThreshold) || 35, 20, 60);
    s.autoMedicineRule.autoAntidote = s.autoMedicineRule.autoAntidote !== false;
    s.autoMedicineRule.autoFatigue = s.autoMedicineRule.autoFatigue !== false;
    return s.autoMedicineRule;
  }

  function setAutoMedicineRule(s, enabled, healThreshold = 35) {
    const rule = ensureAutoMedicineRule(s);
    rule.enabled = !!enabled;
    rule.healThreshold = clamp(Number(healThreshold) || 35, 20, 60);
    return rule;
  }

  function applyAutoMedicine(s) {
    const rule = ensureAutoMedicineRule(s);
    if (!rule.enabled || !Array.isArray(s.consumables) || !s.consumables.length) return false;

    // 1. ตรวจสอบและรักษาพิษ
    if (rule.autoAntidote && s.conditions?.poison?.monthsLeft > 0) {
      const antidote = s.consumables.find(item => item.cures === 'poison');
      if (antidote) {
        addLog('Auto ใช้ยาแก้พิษฉุกเฉินเพื่อระงับพิษที่คุกคามชีวิต', true);
        consumeItem(s, antidote.inventoryUid || antidote.id);
        return true;
      }
    }

    // 2. ตรวจสอบและฟื้นฟูสุขภาพเมื่อต่ำกว่าเกณฑ์
    const healthPct = s.hero.maxHealth ? (s.hero.health / s.hero.maxHealth) * 100 : 100;
    if (healthPct <= rule.healThreshold && s.hero.health < s.hero.maxHealth) {
      const healItem = s.consumables.find(item => (item.heal || 0) > 0 && !item.trainingBonus && !item.cures && !item.homeRepair);
      if (healItem) {
        addLog(`Auto ใช้${healItem.name}ฉุกเฉิน (สุขภาพลดเหลือ ${Math.round(s.hero.health)}/${s.hero.maxHealth})`, true);
        consumeItem(s, healItem.inventoryUid || healItem.id);
        return true;
      }
    }

    // 3. ตรวจสอบและคลายความเหนื่อยล้าจากงาน
    if (rule.autoFatigue && ensureHousehold(s).workFatigue >= 6) {
      const fatigueItem = s.consumables.find(item => (item.fatigueRelief || 0) > 0);
      if (fatigueItem) {
        addLog(`Auto ใช้${fatigueItem.name}เพื่อคลายความเหนื่อยล้าสะสม`, true);
        consumeItem(s, fatigueItem.inventoryUid || fatigueItem.id);
        return true;
      }
    }
    return false;
  }

  function getActivityDisplayName(s, activity) {
    const ageMonths = Number(s?.hero?.ageMonths || 0);
    if (ageMonths < 24) {
      if (activity === 'rest') return { name: 'กินอิ่มนอนหลับ', desc: 'หลับพักผ่อนให้ร่างกายทารกเติบโต ฟื้นฟูสุขภาพ' };
      if (activity === 'family') return { name: 'รับการดูแลจากครอบครัว', desc: 'ความรักความอบอุ่นจากผู้ปกครอง เสริมรากฐานจิตใจ' };
    } else if (ageMonths < 60) {
      if (activity === 'train') return { name: 'วิ่งเล่นออกกำลัง', desc: 'พัฒนากล้ามเนื้อและทักษะการเคลื่อนไหวตามวัย' };
      if (activity === 'social') return { name: 'เล่นกับเพื่อนเด็ก', desc: 'สร้างเพื่อนและเรียนรู้ผู้คนรอบตัว' };
      if (activity === 'family') return { name: 'อยู่กับครอบครัว', desc: 'ผูกพันและช่วยงานเล็ก ๆ ในเรือน' };
      if (activity === 'rest') return { name: 'พักผ่อนวัยเยาว์', desc: 'ฟื้นฟูกำลังและรักษาสุขภาพ' };
    } else if (ageMonths < 144) {
      if (activity === 'work') return { name: 'ช่วยงานหยิบจับ', desc: 'ช่วยงานเบา ๆ ในหมู่บ้าน ได้เงินเล็กน้อยและฝึกวินัย' };
      if (activity === 'explore') return { name: 'สำรวจละแวกบ้าน', desc: 'เดินเล่นลานหมู่บ้าน เก็บสมุนไพรอย่างปลอดภัย' };
      if (activity === 'study') return { name: 'คัดอักษร/อ่านตำรา', desc: 'เรียนรู้ตัวอักษรและตำราพื้นฐาน' };
      if (activity === 'craft') return { name: 'หัดงานฝีมือ', desc: 'ฝึกทักษะช่างและประดิษฐ์ของเล่นของใช้' };
      if (activity === 'train') return { name: 'ฝึกพื้นฐานยุทธ์', desc: 'ยืดเส้นสายและปูพื้นฐานกายา' };
      if (activity === 'family') return { name: 'ช่วยงานครอบครัว', desc: 'แบ่งเบาภาระและสืบสานความผูกพัน' };
      if (activity === 'social') return { name: 'ผูกมิตรวัยเยาว์', desc: 'ทำความรู้จักเพื่อนและชาวบ้าน' };
      if (activity === 'rest') return { name: 'พักผ่อน', desc: 'ฟื้นฟูสุขภาพและดูแลร่างกาย' };
    }
    const def = ACTIVITY[activity] || { name: activity, desc: '' };
    return { name: def.name, desc: def.desc || '' };
  }

  function activityAvailability(s, activity) {
    const age = Math.floor((s.hero?.ageMonths || 0) / 12);
    if (!ACTIVITY[activity]) return { ok: false, reason: 'ไม่มีกิจกรรมนี้' };
    if (activity === 'free' && s.mode === 'story') return { ok: false, reason: 'โหมดเนื้อเรื่องยังไม่เปิดเส้นทางอิสระ' };
    const ageGates = s.mode === 'story'
      ? { work: 5, explore: 5, study: 7, social: 5, craft: 5, quest: 5, travel: 5, family: 15 }
      : { rest: 0, family: 0, train: 5, social: 2, study: 5, explore: 5, work: 5, craft: 5, travel: 12, quest: 12, sect: 12, free: 12 };
    if (ageGates[activity] !== undefined && age < ageGates[activity]) return { ok: false, reason: `ต้องอายุ ${ageGates[activity]} ปีขึ้นไป (ปัจจุบัน ${age} ปี)` };
    if (activity === 'study' && !canUseLearningActivity(s)) return { ok: false, reason: 'ยังไม่มีสถานที่หรือผู้สอนที่เปิดทางให้เรียนรู้' };
    if (activity === 'sect') {
      const open = s.mode === 'story' ? !!s.flags?.metSect && s.month >= 84 : age >= 12;
      if (!open) return { ok: false, reason: s.mode === 'story' ? 'ต้องเข้าสำนักและผ่านเดือนที่ 84' : 'ต้องอายุ 12 ปีขึ้นไปและมีชื่อเสียง' };
    }
    return { ok: true, reason: '' };
  }

  function setActivity(s, activity) {
    if (!ACTIVITY[activity]) return false;
    if (!activityAvailability(s, activity).ok) return false;
    ensureLocationState(s);
    s.activity = activity;
    if (activity !== 'craft' && s.crafting) {
      s.crafting.target = null;
    }
    const available = getAvailableLocations(s, activity);
    if (available.length && !available.some(location => location.id === s.locations.current)) s.locations.current = available[0].id;
    if (activity === 'work') {
      const workLocations = getAvailableLocations(s, 'work');
      if (workLocations.length && !workLocations.some(location => location.id === s.locations.work)) s.locations.work = s.locations.current;
    }
    return true;
  }

  function ensureExplorationState(s) {
    s.exploration = s.exploration || { selectedArea: 'village_trails', discoveredAreas: [], visited: {}, lastOutcome: null, news: [] };
    s.exploration.selectedArea = EXPLORATION_AREA_DEFS[s.exploration.selectedArea] ? s.exploration.selectedArea : 'village_trails';
    s.exploration.discoveredAreas = Array.isArray(s.exploration.discoveredAreas) ? s.exploration.discoveredAreas : [];
    s.exploration.visited = s.exploration.visited && typeof s.exploration.visited === 'object' ? s.exploration.visited : {};
    s.exploration.news = Array.isArray(s.exploration.news) ? s.exploration.news : [];
    return s.exploration;
  }

  function getAvailableExplorationAreas(s) {
    ensureExplorationState(s);
    return Object.entries(EXPLORATION_AREA_DEFS).filter(([id, area]) =>
      s.month >= area.minMonth && (!area.requires || area.requires(s))
    ).map(([id, area]) => ({ id, ...area }));
  }

  function selectExplorationArea(s, id) {
    if (!getAvailableExplorationAreas(s).some(area => area.id === id)) return false;
    ensureExplorationState(s).selectedArea = id;
    addLog(`เลือกเส้นทางสำรวจ: ${EXPLORATION_AREA_DEFS[id].name}`);
    return true;
  }

  function explorationRoute(s) {
    const exploration = ensureExplorationState(s);
    const available = getAvailableExplorationAreas(s);
    const area = available.find(item => item.id === exploration.selectedArea) || available[0] || EXPLORATION_AREA_DEFS.village_trails;
    const a = syncCombat(s).attributes;
    const knowledge = (s.paths?.insight || 0) + Math.floor((a.intellect || 0) / 8);
    const mapBonus = s.flags?.foundMap ? 18 : 0;
    const powerBonus = Math.min(20, Math.floor((s.hero?.power || 0) / 80));
    const reputationBonus = Math.max(0, Math.floor((s.hero?.reputation || 0) / 10));
    return {
      ...area,
      areaId: area.id,
      risk: clamp(area.risk - Math.floor(knowledge / 3) - (s.hero?.talent === 'swift' ? 5 : 0) - mapBonus / 3, 0, 60),
      findChance: clamp(35 + knowledge * 2 + powerBonus + reputationBonus + craftingItemBonus(s).explore + (s.hero?.talent === 'keen' ? 18 : 0), 20, 96),
      knowledge, mapBonus, powerBonus, reputationBonus
    };
  }

  function ensureAutoExploreRule(s) {
    s.autoExploreRule = s.autoExploreRule || { policy: 'balanced', retreatAt: 35 };
    s.autoExploreRule.policy = ['safe', 'balanced', 'secret'].includes(s.autoExploreRule.policy) ? s.autoExploreRule.policy : 'balanced';
    s.autoExploreRule.retreatAt = clamp(Number(s.autoExploreRule.retreatAt) || 35, 15, 75);
    return s.autoExploreRule;
  }

  function setAutoExploreRule(s, policy = 'balanced', retreatAt = 35) {
    const rule = ensureAutoExploreRule(s);
    rule.policy = ['safe', 'balanced', 'secret'].includes(policy) ? policy : 'balanced';
    rule.retreatAt = clamp(Number(retreatAt) || 35, 15, 75);
    return rule;
  }

  function applyAutoExploreRule(s) {
    const rule = ensureAutoExploreRule(s);
    const healthRatio = s.hero?.maxHealth ? s.hero.health / s.hero.maxHealth * 100 : 100;
    const areas = getAvailableExplorationAreas(s);
    const safe = areas.filter(area => area.tier === 'safe');
    const candidates = rule.policy === 'safe' || healthRatio <= rule.retreatAt ? safe : rule.policy === 'secret' ? areas.filter(area => area.tier === 'secret').concat(safe) : areas.filter(area => area.tier !== 'danger').concat(areas.filter(area => area.tier === 'danger'));
    const selected = ensureExplorationState(s).selectedArea;
    const chosen = rule.policy === 'secret' && healthRatio > rule.retreatAt ? candidates[0] : candidates.find(area => area.id === selected) || candidates[0] || areas[0];
    if (chosen) ensureExplorationState(s).selectedArea = chosen.id;
    return chosen;
  }

  function startLongRest(s, months = 3, locationId = null) {
    if (s.mode !== 'free' || s.ending || s.pendingEvent) return false;
    ensureLocationState(s);
    if (locationId && !selectLocation(s, locationId)) return false;
    const route = restRoute(s);
    s.locations.longRest = { monthsLeft: clamp(Number(months) || 3, 2, 12), total: clamp(Number(months) || 3, 2, 12), location: route.key };
    setActivity(s, 'rest');
    s.autoMode = false;
    addLog(`เริ่มพักยาว ${s.locations.longRest.total} เดือนที่${route.location}`, true);
    return true;
  }

  function cancelLongRest(s) {
    ensureLocationState(s);
    if (!s.locations.longRest) return false;
    s.locations.longRest = null;
    addLog('ยกเลิกการพักยาว กลับมาเลือกกิจกรรมรายเดือนได้');
    return true;
  }

  function forceRestLocation(s, id, reason = 'กฎของเรื่อง') {
    if (!LOCATION_DEFS[id] || !getAvailableLocations(s, 'rest').some(location => location.id === id)) return false;
    if (ensureLocationState(s).forced === id) return true;
    ensureLocationState(s).forced = id;
    addLog(`เรื่องราวบังคับให้พักที่${LOCATION_DEFS[id].name}${reason ? ` (${reason})` : ''}`, true);
    return true;
  }

  function clearForcedRest(s) { ensureLocationState(s).forced = null; return true; }

  function enforceStoryLocationRules(s) {
    ensureLocationState(s);
    if (s.mode !== 'story') return;
    if (s.month < 24) forceRestLocation(s, s.flags?.retainerAlive ? 'retainer' : 'roadside', 'ช่วงต้นเรื่อง');
    else if (s.locations.forced) clearForcedRest(s);
    if (s.flags?.betrayedSect && s.month >= 122) destroyLocation(s, 'sect', 'สำนักแตกจากเหตุการณ์ในเนื้อเรื่อง');
  }

  function activityRoute(s, activity) {
    if (activity === 'work') {
      if ((Number(s.hero?.ageMonths) || 0) < 144) return { name: 'ช่วยงานเบาตามวัย', money: 1, reputation: 0, health: 0, workload: 0, log: 'ช่วยผู้ใหญ่หยิบจับงานเบา ๆ ตามวัย' };
      const household = ensureHousehold(s), job = JOB_DEFS.find(item => item.id === household.job) || JOB_DEFS[0];
      const location = workLocationKey(s);
      if (job.id === 'underworld_runner' || s.flags.workedUnderworld || s.flags.underworldContact) return { name: 'งานเครือข่ายใต้ดิน', money: 12, reputation: -1, health: 5, workload: 3, illegal: true, log: 'รับงานจากเครือข่ายใต้ดิน ได้เงินก้อนแต่ชื่อเสียงในสำนักสั่นคลอน' };
      if (location === 'sect' || s.flags.metSect && (s.relations.senior >= 8 || job.id === 'sect_clerk')) return { name: 'งานสำนัก', money: 9, reputation: 3, health: 3, workload: 1, log: 'รับงานสำนักตามความรู้และความสัมพันธ์ที่มี ได้ทั้งเงินและความไว้วางใจ' };
      if (job.id === 'guard' || s.flags.retainerAlive && location === 'retainer') return { name: 'งานคาราวาน', money: 10, reputation: 1, health: 3, workload: 3, log: 'ช่วยคุ้มกันคาราวานตามเส้นทาง ได้เงินพอประทังชีวิตและชื่อเสียงจากความกล้า' };
      if (job.id === 'artisan' || location === 'owned' || location === 'rented') return { name: 'งานช่างและคลังสินค้า', money: 8, reputation: 2, health: 4, workload: 2, log: 'ลงมือทำงานช่างและจัดการคลัง ได้ค่าจ้างจากฝีมือและความสม่ำเสมอ' };
      if (job.id === 'physician') return { name: 'งานตรวจรักษาและปรุงยา', money: 9, reputation: 3, health: 3, workload: 1, log: 'เปิดเทียบยา ตรวจรักษาชาวบ้านและปรุงสมุนไพร ได้ทั้งค่ารักษาและความนับถือ' };
      if (job.id === 'merchant') return { name: 'งานค้าขายและทำบัญชี', money: 9, reputation: 2, health: 3, workload: 1, log: 'จัดทำบัญชีสินค้าและเจรจาการค้า ได้เงินตามไหวพริบและกำไรของตลาด' };
      if (job.id === 'hunter') return { name: 'งานล่าสัตว์และแกะรอย', money: 7, reputation: 2, health: 4, workload: 2, log: 'ออกล่าสัตว์ป่า รวบรวมชิ้นส่วนและหนังสัตว์ ได้เงินจากการขายผลผลิต' };
      if (job.id === 'farmer') return { name: 'งานชาวบ้าน', money: 7, reputation: 2, health: 4, workload: 2, log: 'รับจ้างดูแลไร่นาและเสบียง ได้เงินจากแรงกายและความไว้ใจของผู้คน' };
      return { name: 'แรงงานทั่วไป', money: 3, reputation: 2, health: 3, workload: 1, log: 'รับจ้างใช้แรงกาย ได้เงินเล็กน้อยและชื่อเสียงจากความขยัน' };
    }
    if (activity === 'explore') {
      const route = explorationRoute(s);
      const legacyName = s.flags.foundMap && route.areaId === 'village_trails' ? 'ตามแผนที่ทางลับ' : hasTreasure(s, 'กระบี่ดาวตก') && route.areaId === 'village_trails' ? 'สำรวจเขตอันตราย' : s.flags.escapePrepared && route.areaId === 'village_trails' ? 'ตรวจเส้นทางถอย' : route.name;
      return { ...route, name: legacyName, money: route.yield.money || 0, qi: route.yield.qi || 0, power: route.tier === 'danger' ? 2 : route.tier === 'secret' ? 4 : 0, health: Math.max(2, Math.round(route.risk / 3)), reputation: route.yield.reputation || 0, log: route.log };
    }
    if (activity === 'rest') {
      const route = restRoute(s);
      return { ...route, name: route.itemName ? `${route.location} · ${route.itemName}` : route.location };
    }
    if (activity === 'study') return learningRoute(s);
    if (activity === 'social') { const route = socialRoute(s); return { ...route, name: `${route.name} · ${route.group}`, log: route.log }; }
    if (activity === 'craft') return { name: 'ลงมือสร้างของ', log: 'คัดวัตถุดิบและลงมือสร้างของที่อาจช่วยให้ชีวิตในเดือนต่อไปง่ายขึ้น' };
    if (activity === 'family') return { name: 'ดูแลเรือนตระกูล', log: 'ใช้เวลากับคนในครอบครัวและวางรากฐานที่คนรุ่นต่อไปจะรับช่วง' };
    if (activity === 'quest') return { name: 'รับภารกิจจากกระดานประกาศ', log: 'ตรวจดูคำขอของผู้คนและเลือกงานที่สอดคล้องกับเส้นทางชีวิต' };
    if (activity === 'sect') return (s.flags?.metSect || s.officialCareer?.affiliation === 'sect') ? { name: 'รับใช้สำนักและทางการ', log: 'ใช้ผลงาน ความรู้ และสายสัมพันธ์แลกกับสิทธิ์ในสำนักหรือเมือง' } : { name: 'งานราชการเมือง', log: 'รับคำร้อง ตรวจเสบียง และช่วยงานเมืองเพื่อสร้างชื่อโดยไม่ต้องมีสังกัด' };
    if (activity === 'travel') return { name: 'เดินทางข้ามเมือง', log: 'ออกจากพื้นที่คุ้นเคยเพื่อพบผู้คน สถานที่ และโอกาสที่ไม่เคยเห็น' };
    if (activity === 'free') return { name: 'ปล่อยชีวิตไปตามลม', log: 'ใช้ชีวิตโดยไม่ผูกกับเป้าหมายเดียว เปิดโอกาสให้ชะตาเลือกเส้นทาง' };
    return { name: 'กิจกรรมทั่วไป' };
  }

  function applyWorkActivity(s) {
    const h = s.hero;
    if ((h?.ageMonths || 0) < 144) {
      h.money = (h.money || 0) + 1;
      h.discipline = Math.min(100, (h.discipline || 0) + 1);
      h.attributes.body = Math.min(126, (h.attributes.body || 10) + 1);
      s.paths.duty = (s.paths.duty || 0) + 1;
      addLog('ช่วยงานหยิบจับเบา ๆ และช่วยผู้ใหญ่ในเรือน ได้รับ 1 ตำลึง ฝึกวินัยและความอดทน');
      return;
    }
    const household = ensureHousehold(s);
    const job = JOB_DEFS.find(item => item.id === household.job) || JOB_DEFS[0];
    if (!canTakeJob(s, job)) {
      household.job = 'odd_jobs';
      addLog(`${job.name}ยังไม่ตรงเงื่อนไข จึงกลับไปรับแรงงานทั่วไป`);
    }
    const activeJob = JOB_DEFS.find(item => item.id === household.job) || JOB_DEFS[0];
    const route = activityRoute(s, 'work');
    const jobIncome = activeJob.income + Math.max(0, household.careerLevel - 1);
    h.money += route.money + jobIncome;
    h.reputation += route.reputation;
    const workload = route.workload || activeJob.workload || 1;
    household.workFatigue += workload;
    household.workRisk += route.illegal ? 1 : 0;
    h.health -= route.health + (household.workFatigue >= 8 ? 2 : 0);
    h.attributes.intellect = Math.min(126, h.attributes.intellect + (route.name === 'งานสำนัก' ? 1 : 0));
    h.attributes.charm = Math.min(126, h.attributes.charm + (route.name === 'งานเครือข่ายใต้ดิน' ? 1 : 0));
    s.paths.duty += 1;
    advanceWorkCareer(s, activeJob);
    s.materialLife = s.materialLife || {};
    if (activeJob.id === 'farmer') {
      ensureInventory(s).herb += 1; s.materialLife.farmMonths = (s.materialLife.farmMonths || 0) + 1;
      if (s.materialLife.farmMonths % 4 === 0) { addGradedMaterial(s, 'herb', 'uncommon'); addLog('คัดสมุนไพรชั้นดีได้จากงานเกษตร'); }
      if (s.materialLife.farmMonths % 12 === 0) {
        ensureWorldState(s);
        s.world.news.unshift('ผลผลิตสมุนไพรและเสบียงจากไร่ท้องถิ่นช่วยบรรเทาความขาดแคลนในเมือง');
        s.world.modifiers.refugeePressure = Math.max(0, s.world.modifiers.refugeePressure - 1);
        s.world.modifiers.herbPrice = Math.max(1, Math.round((s.world.modifiers.herbPrice - 0.05) * 100) / 100);
        addLog('ผลผลิตจากการทำไร่ช่วยพยุงเสบียงของเมือง ผู้คนกล่าวขานถึงความขยันของเจ้า', true);
      }
      grantLifeMaterialMilestone(s, 'herb', s.materialLife.farmMonths, 'ผู้ปลูก');
    } else if (activeJob.id === 'hunter') {
      ensureInventory(s).beast += 1; s.materialLife.huntMonths = (s.materialLife.huntMonths || 0) + 1;
      if (s.materialLife.huntMonths % 4 === 0) { addGradedMaterial(s, 'beast', 'uncommon'); addLog('นายพรานคัดวัตถุดิบสัตว์ชั้นดีได้'); }
      if (s.materialLife.huntMonths % 12 === 0) {
        ensureWorldState(s);
        s.world.news.unshift('นายพรานช่วยขับไล่ฝูงสัตว์ร้ายรอบนอก ทำให้เส้นทางสัญจรปลอดภัยขึ้น');
        s.world.modifiers.travelRisk = Math.max(0, s.world.modifiers.travelRisk - 2);
        addLog('การล่าสัตว์ดุร้ายช่วยเปิดทางสัญจรที่ปลอดภัยให้ชาวบ้านและคาราวาน', true);
      }
      grantLifeMaterialMilestone(s, 'beast', s.materialLife.huntMonths, 'นายพราน');
    } else if (activeJob.id === 'artisan') {
      s.materialLife.artisanMonths = (s.materialLife.artisanMonths || 0) + 1;
      if (s.materialLife.artisanMonths % 4 === 0) { addGradedMaterial(s, 'iron', 'uncommon'); addLog('ช่างได้รับแร่เหล็กชั้นดีจากงาน'); }
      if (s.materialLife.artisanMonths % 12 === 0) {
        ensureWorldState(s);
        s.world.news.unshift('เครื่องมือและอาวุธจากช่างท้องถิ่นช่วยเสริมความเข้มแข็งให้หน่วยคุ้มกันเมือง');
        s.world.modifiers.guardPresence += 1;
        s.world.modifiers.travelRisk = Math.max(0, s.world.modifiers.travelRisk - 1);
        addLog('ผลงานเชิงช่างของเจ้าได้รับการยอมรับ ช่วยเสริมการป้องกันเมืองอย่างเห็นได้ชัด', true);
      }
      grantLifeMaterialMilestone(s, 'iron', s.materialLife.artisanMonths, 'ช่าง');
    } else if (activeJob.id === 'merchant') {
      s.materialLife.tradeMonths = (s.materialLife.tradeMonths || 0) + 1;
      if (s.materialLife.tradeMonths % 6 === 0) { addGradedMaterial(s, 'spiritStone', 'uncommon'); addLog('คู่ค้าแบ่งหินปราณชั้นดีเป็นค่าตอบแทน'); }
      if (s.materialLife.tradeMonths % 12 === 0) {
        ensureWorldState(s);
        s.world.news.unshift('กองคาราวานการค้านำเข้าสินค้าจำเป็น ช่วยให้ตลาดชายแดนคึกคัก');
        s.world.modifiers.travelRisk = Math.max(0, s.world.modifiers.travelRisk - 1);
        addGradedMaterial(s, 'spiritSpring', 'uncommon');
        addLog('คู่ค้ามอบน้ำพุวิญญาณชั้นดีจากการค้าสม่ำเสมอ และชื่อเสียงทางการค้าของเจ้ากระจายไปทั่ว', true);
      }
      grantLifeMaterialMilestone(s, 'herb', s.materialLife.tradeMonths, 'คู่ค้า');
    } else if (activeJob.id === 'physician') {
      ensureInventory(s).herb += 1;
      s.materialLife.healerMonths = (s.materialLife.healerMonths || 0) + 1;
      if (s.materialLife.healerMonths % 4 === 0) { addGradedMaterial(s, 'herb', 'uncommon'); addLog('หมอยาคัดเลือกสมุนไพรชั้นดีจากการปรุงยารักษาคน'); }
      if (s.hero.poisoned && Math.random() < 0.4) {
        s.hero.poisoned = false;
        addLog('ความรู้การแพทย์ช่วยขับพิษออกจากร่างตนเองได้สำเร็จ', true);
      }
      if (s.materialLife.healerMonths % 12 === 0) {
        ensureWorldState(s);
        s.world.news.unshift('หมอยาท้องถิ่นแจกจ่ายเทียบยาสมุนไพร ช่วยชีวิตผู้ลี้ภัยและชาวบ้านจากโรคระบาด');
        s.world.modifiers.refugeePressure = Math.max(0, s.world.modifiers.refugeePressure - 2);
        h.reputation += 3;
        addLog('การรักษาผู้คนยากไร้ทำให้ชื่อเสียงของหมอยาขจรขจายไปไกล', true);
      }
      grantLifeMaterialMilestone(s, 'herb', s.materialLife.healerMonths, 'หมอยา');
    }
    if (household.workFatigue >= 8) addLog('ทำงานหนักต่อเนื่องจนร่างกายทรุด สุขภาพเสียหายเพิ่ม', true);
    if (household.workRisk >= 3) {
      s.flags.workWanted = true;
      h.reputation -= 4;
      addLog('งานผิดกฎหมายสะสมจนทางการเริ่มตามรอย ชื่อเสียงลดลง', true);
    }
    addLog(`${route.log} (${route.name}) ได้ค่าจ้างจาก${activeJob.name}เพิ่ม ${jobIncome} ตำลึง`);
    return { route, job: activeJob, jobIncome, fatigue: household.workFatigue, risk: household.workRisk };
  }

  // สเกลพลังตามขั้นบำเพ็ญตามที่กำหนด:
  // หลอมกาย 1-9: +10 ต่อขั้น (10..90)
  // รวบรวม 1-9: 90 + 100 ต่อขั้น (190..990)
  // ควบแน่น 1-9: 990 + 300 ต่อขั้น (1,290..3,690)
  // รากฐาน 1-9: 3,690 + 1,000 ต่อขั้น (4,690..12,690)
  // แก่นทอง+: 12,690 + 2,500 ต่อขั้น
  function calculateRealmPower(realm, stage) {
    const r = Math.max(0, realm || 0), s = Math.max(1, stage || 1);
    if (r === 0) return 0;
    if (r === 1) return s * 10;
    if (r === 2) return 90 + s * 100;
    if (r === 3) return 990 + s * 300;
    if (r === 4) return 3690 + s * 1000;
    return 12690 + (r - 5) * 22500 + s * 2500;
  }

  // รากวิญญาณส่งผลต่อความเร็วบำเพ็ญ ไม่คูณพลังรวม
  const ROOT_TRAINING_MULTIPLIER = {
    none: .62,
    human: 1.00,
    earth: 1.75,
    heaven: 2.50,
    immortal: 3.25,
    legend: 4.00
  };

  const defaultState = (name, talent, root, gender = 'unspecified') => {
    const r = ROOTS[root] || ROOTS.human, t = TALENTS[talent] || TALENTS.jade;
    const normalizedGender = ['male', 'female', 'unspecified'].includes(gender) ? gender : 'unspecified';
    const initialLifespan = randomLifespanYears();
    const initial = ({
       version: VERSION,
       runId: createRunId(),
      mode: 'story',
      characterId: 'lin-an',
      ruleSet: LIFE_RULES.oneLife.id,
      hero: {
        name: name || 'หลินอัน',
        gender: normalizedGender,
        talent,
        root,
        rootKnown: false,
        rootDiscovery: null,
        ageMonths: 5 * 12,
        lifespan: initialLifespan,
        lifespanMonths: initialLifespan * 12,
        health: talent === 'steady' ? 120 : 100,
        maxHealth: talent === 'steady' ? 120 : 100,
        qi: 0,
        qiMax: 0,
        cultivation: 0,
        realm: 0,
        stage: 0,
        cultivationAccess: false,
        power: 0,
        powerBonus: 0,
        bodyFoundation: 0,
        martialSkill: 0,
        discipline: 0,
        attributes: {
          body: r.stats.body + (t.body || 0),
          intellect: 10,
          spirit: 10,
          charm: 10,
          luck: 10
        },
        karma: 0,
        money: 3,
        reputation: 0,
        combat: {
          attack: r.stats.attack + (t.attack || 0),
          defense: r.stats.defense + (t.defense || 0),
          body: r.stats.body + (t.body || 0),
          agility: r.stats.agility + (t.agility || 0),
          training: r.training + (t.training || 0)
        }
      },
      month: 0,
      characterMonth: 0,
      worldMonth: 0,
      world: { worldMonth: 0, seed: 73129, worldSeed: 73129, npcLifeSeed: 73146, region: 'border-town', news: [], events: {}, knownEvents: [] },
      worldCharacters: { linAn: ensureLinAnWorldCharacter(null, 73129) },
      storyRoute: { id: 'free', startedMonth: null, progress: 0, failure: null, skills: { householdSkill: 0, martialReputation: 0, travelKnowledge: 0, sectMerit: 0 }, identity: null },
      activity: 'train',
      trainingSelection: [],
      trainingGoal: 'progress',
      trainingMastery: {},
       learningState: { months: 0, lastLocation: null, lastTechnique: null, lastType: null, lastTeacher: null, techniqueFocus: null, focus: 'lore', autoRule: 'balanced', knowledge: { lore: 0, cultivation: 0, martial: 0, survival: 0 } },
      trainingFocus: [],
      trainingSwitchCooldown: 0,
      trainingConsistencyMonths: 0,
      trainingFoundation: 0,
      breakthroughState: { ready: false, nextPromptMonth: 0, lastAttempt: null },
      loadoutMode: true,
      techniqueLoadout: { cultivation: null, combat: null, movement: null, defense: null, support: 'survival' },
      itemLoadoutMode: true,
      itemLoadout: { weapon: null, armor: null, boots: null, ring1: null, ring2: null, necklace: null, mount: null },
      autoMode: false,
      autoActivity: 'train',
      autoSchedule: Array(12).fill('train'),
      autoDoctrine: 'survive',
      autoFamilyRule: 'save',
      autoRestRule: { enabled: true, threshold: 35 },
      autoExploreRule: { policy: 'balanced', retreatAt: 35 },
      autoWorkRule: { enabled: true, fatigueThreshold: 6, riskThreshold: 2 },
      autoFreeRule: { enabled: false, policy: 'safe' },
      autoMedicineRule: { enabled: false, healThreshold: 35, autoAntidote: true, autoFatigue: true },
      paused: false,
      speed: 1,
      relations: { parents: 18, siblings: 0, relatives: 4, friend: 0, companion: 0, master: 0, senior: 0, subordinate: 0, supervisor: 0, enemy: 0, acquaintance: 0, mysteriousSwordsman: 0, bellMatron: 0 },
      relationshipState: {
        parents: { category: 'พ่อแม่', trait: 'สายเลือดและความทรงจำ', romance: 0, lastTouched: 0 },
        siblings: { category: 'พี่น้อง', trait: 'ใกล้ชิดแต่มีบาดแผลร่วมกัน', romance: 0, lastTouched: 0 },
        relatives: { category: 'ญาติ', trait: 'รู้จักกันผ่านชื่อและหน้าที่', romance: 0, lastTouched: 0 },
        friend: { category: 'สหาย', trait: 'อ่อนโยนและเห็นใจคน', romance: 0, lastTouched: 0 },
        companion: { category: 'เพื่อนร่วมทาง', trait: 'พิสูจน์ใจกันระหว่างทาง', romance: 0, lastTouched: 0 },
        master: { category: 'อาจารย์', trait: 'สุขุมและยึดหลัก', romance: 0, lastTouched: 0 },
        senior: { category: 'ศิษย์พี่', trait: 'ตรงไปตรงมาและทะเยอทะยาน', romance: 0, lastTouched: 0 },
        subordinate: { category: 'ลูกน้อง', trait: 'รอคำสั่งและการดูแล', romance: 0, lastTouched: 0 },
        enemy: { category: 'ศัตรู', trait: 'จดจำหนี้แค้นไม่ลืม', romance: 0, lastTouched: 0 },
        acquaintance: { category: 'คนรู้จัก', trait: 'พบกันเป็นครั้งคราว', romance: 0, lastTouched: 0 },
        mysteriousSwordsman: { category: 'ผู้ชี้ทางลับ', trait: 'หยั่งรู้ยากและไม่ยึดติดกฎเกณฑ์', romance: 0, lastTouched: 0 },
        bellMatron: { category: 'เจ้าของหนี้บุญคุณ', trait: 'เงียบงันและจดจำทุกสิ่ง', romance: 0, lastTouched: 0 }
      },
      factions: { sect: 0, serpent: 0, jianghu: 0 },
      paths: { compassion: 0, duty: 0, freedom: 0, insight: 0 },
      choices: {},
      choiceHistory: [],
      quests: { active: [], completed: [], failed: [], canceled: [], trackedId: null },
      flags: {
        metSect: false,
        basicCultivation: false,
        cultivationCapped: false,
        loyalRetainer: false,
        loneWanderer: false,
        underworldContact: false,
        retainerAlive: false,
        retainerMissing: false,
        houseEnemyKnown: false,
        familyToken: false,
        helpedFriend: false,
        savedHerbs: false,
        foundMap: false,
        knowsTraitor: false,
        warnedMaster: false,
        masterHealed: false,
        masterCrippled: false,
        masterBondGiven: false,
        seniorBondGiven: false,
        friendBondGiven: false,
        swordLearned: false,
        stepLearned: false,
        shieldLearned: false,
        bodyLearned: false,
        cultivationLearned: false,
        workedUnderworld: false,
        darkPastFromChildhood: false,
        choseLoyalty: false,
        escapePrepared: false,
        survivedAmbush: false,
        misdirectionSuccessful: false,
        shelterBuilt: false,
        alliesRecruited: false,
        traitorExposed: false,
        civiliansSaved: false,
        forbiddenPower: false,
        betrayedSect: false,
        spiritWeapon: false,
        spiritFruit: false,
        enlightenment: false
      },
      treasures: [],
      materials: { herb: 0, iron: 0, spiritStone: 0, beast: 0, spiritSpring: 0 },
      gradedMaterials: {}, materialLife: {}, conditions: {}, pillEffect: null, poisonCoating: null,
      consumables: [], nextConsumableUid: 0,
      lastCraftMonth: -1,
      crafting: { knowledge: { alchemy: 1, smithing: 0, tools: 0, support: 0 }, equipment: [], auto: { enabled: false, recipeId: null } },
      materialStacks: [],
      household: { job: 'odd_jobs', housing: 'shelter', debt: 0, loanCount: 0, monthlyCost: 0 },
      locations: { current: 'roadside', owned: ['roadside'], selected: null, forced: null, destroyed: [], longRest: null },
      exploration: { selectedArea: 'village_trails', discoveredAreas: [], visited: {}, lastOutcome: null, news: [] },
      household: { job: 'odd_jobs', housing: 'shelter', debt: 0, debtPrincipal: 0, interestRate: .08, interestAccrued: 0, arrears: 0, collectionStage: 0, creditor: null, seizedAssets: [], bankruptcy: false, loanCount: 0, monthlyCost: 0, careerXp: 0, careerLevel: 1, workFatigue: 0, workRisk: 0 },
      locations: { current: 'roadside', owned: ['roadside'], selected: null, work: null, forced: null, destroyed: [], longRest: null },
      exploration: { selectedArea: 'village_trails', discoveredAreas: [], visited: {}, lastOutcome: null, news: [] },
      travel: { destination: null, vehicle: 'foot', active: null, closedRoutes: [], lastFailure: null, lastArrival: null, deadlineMonth: null },
      autoTravelRule: 'safe',
      sectCareer: { rank: 'outer', merit: 0, lastExamMonth: 0, examCount: 0 },
      officialCareer: { affiliation: null, assignment: 'normal', merit: 0, cityMerit: 0, rank: 'civilian', examCount: 0, lastExamMonth: 0, lastActionMonth: -1, risk: 0, rights: [], resources: 0 },
      family: { spouse: null, children: [], parents: [], relatives: [], buildings: [], construction: null, lastChildMonth: -99, treasury: 0, bond: 0, health: 100, debt: 0, conflict: 0, losses: [], chronicle: [], legacyScore: 0, heirId: null },
      oaths: { active: [], broken: [], kept: [], scars: [] },
      worldPressure: { bloodDebt: 0, sectWar: 0, clanDecay: 0, skyCalamity: 0 },
      worldScars: [],
      pressureMilestones: {},
      legacyEchoes: [],
      eventHistory: [],
      log: [],
      pendingEvent: null,
      ending: null,
      lastSavedAt: Date.now(),
      lastRandomMonth: -99,
      monthsProcessed: 0,
      lineageState: { generation: 0, treasury: 0, prestige: 0, stage: 0, heirCount: 0 },
      lifeHistory: [],
      metaState: createMetaState()
    });
    return ensureStateLayers(initial);
  };

  const PATH_IMPACTS = {
    fallenHouse: [{ compassion: 3, duty: 1 }, { freedom: 3 }, { insight: 3 }],
    firstRoad: [{ compassion: 2, duty: 1 }, { freedom: 3, insight: 1 }, { insight: 2 }],
    winterChild: [{ compassion: 3 }, { freedom: 2 }, { duty: 2, insight: 1 }],
    caravanBeacon: [{ duty: 1, insight: 1 }, { freedom: 2 }, { compassion: 3 }],
    oldDebt: [{ duty: 2, insight: 2 }, { freedom: 3 }, { compassion: 2 }],
    arrival: [{ duty: 2, insight: 1 }, { compassion: 2, duty: 1 }, { freedom: 2, insight: 1 }],
    wounded: [{ compassion: 3 }, { insight: 3 }, { freedom: 2 }],
    manual: [{ duty: 2 }, { freedom: 2, insight: 1 }, { duty: 3, compassion: 1 }],
    sectSparring: [{ duty: 3 }, { compassion: 3 }, { freedom: 2, insight: 2 }],
    trader: [{ insight: 3, freedom: 1 }, { insight: 3 }, { duty: 1 }],
    council: [{ duty: 3, insight: 2 }, { duty: 2, insight: 2 }, { freedom: 3 }],
    vow: [{ duty: 4, compassion: 1 }, { freedom: 2, compassion: 1 }, { freedom: 4 }],
    ambush: [{ duty: 2 }, { freedom: 2, insight: 1 }, { freedom: 3 }],
    refugees: [{ compassion: 4, duty: 1 }, { duty: 3 }, { freedom: 3 }],
    pilgrimage: [{ compassion: 3 }, { duty: 2, insight: 2 }, { freedom: 2, insight: 3 }],
    betrayal: [{ duty: 3, insight: 2 }, { insight: 4 }, { freedom: 4 }, { freedom: 3, insight: 1 }],
    lanternVow: [{ compassion: 3, duty: 1 }, { freedom: 3 }, { duty: 4 }],
    lastwinter: [{ compassion: 4 }, { duty: 4 }, { freedom: 3, insight: 1 }],
    siege: [{ duty: 4 }, { compassion: 2, freedom: 2 }, { freedom: 4 }, { freedom: 4 }],
    master_bond: [{ duty: 3, insight: 2 }, { duty: 2, compassion: 1 }],
    senior_bond: [{ duty: 2, freedom: 1 }, { compassion: 2 }],
    friend_bond: [{ compassion: 3 }, { freedom: 2 }],
    herbs: [{ freedom: 1 }, { compassion: 2, duty: 1 }],
    spar: [{ duty: 1 }, { compassion: 1, insight: 1 }],
    market: [{ freedom: 1 }, { duty: 1 }],
    cave: [{ insight: 2 }, { insight: 1, freedom: 1 }],
    enlightenment: [{ insight: 2 }, { duty: 1 }],
    deviation: [{ freedom: 2 }, { insight: 1 }],
    elder_lesson: [{ duty: 1, insight: 1 }, { freedom: 1 }],
    crooked_job: [{ freedom: 2 }, { duty: 2 }],
    mine_collapse: [{ compassion: 2, duty: 1 }, { freedom: 1 }],
    forge: [{ freedom: 1 }, { compassion: 1 }],
    caravan: [{ duty: 1 }, { freedom: 1 }],
    spirit_fruit: [{ freedom: 2 }, { insight: 2 }],
    ancient_blade: [{ freedom: 2 }, { insight: 1 }],
    beast_den: [{ freedom: 2 }, { insight: 1 }],
    street_instinct: [{ freedom: 2 }, { insight: 1 }],
    retainer_lesson: [{ duty: 2 }, { freedom: 1 }]
  };

  // Additional free-life choices with clear intentions. Entries are applied
  // once, independently of any other stat or outcome on that choice.
  const FREE_CHOICE_PATH_IMPACTS = {
    travel_storm: [{ duty: 1, compassion: 1 }],
    craft_spoiled_materials: [{ insight: 1 }, { freedom: 1 }],
    craft_special_customer: [{ duty: 1 }],
    learning_item_rubbing: [null, { insight: 1 }],
    family_health_crisis: [{ compassion: 2 }, { compassion: 1, duty: 1 }],
    family_education_choice: [{ insight: 1, compassion: 1 }, { duty: 1 }],
    family_conflict: [{ compassion: 2 }],
    family_child_growth: [{ freedom: 1, duty: 1 }, { compassion: 1 }],
    family_debt_inheritance: [{ duty: 2 }, { freedom: 1 }],
    debt_collection_notice: [{ duty: 1 }, { insight: 1 }, { freedom: 1 }],
    social_new_contact: [null, { freedom: 1 }],
    social_alliance: [{ duty: 1, compassion: 1 }],
    social_family_visit: [null, { compassion: 1 }],
    social_friend_gathering: [{ compassion: 1 }],
    social_sect_mentor: [{ duty: 2 }],
    social_subordinate_rival: [{ compassion: 1, insight: 1 }, { duty: 1 }],
    explore_waystone_news: [null, { insight: 1 }],
    explore_lost_scout: [{ compassion: 2 }],
    explore_hidden_archive: [null, { duty: 1 }],
    explore_serpent_cache: [{ duty: 1, insight: 1 }],
    rest_ambush: [null, { insight: 1 }],
    rest_healer: [null, { insight: 1 }, { freedom: 1 }],
    middle_natural_disaster: [{ compassion: 2, duty: 1 }],
    work_investigation: [{ duty: 1 }, { freedom: 1 }]
  };

  function eventAlwaysPathImpact(s, id, index) {
    const base = PATH_IMPACTS[id]?.[index] || {};
    const extra = s.mode === 'free' ? (FREE_CHOICE_PATH_IMPACTS[id]?.[index] || {}) : {};
    const result = { ...base };
    Object.entries(extra).forEach(([key, value]) => { result[key] = (result[key] || 0) + value; });
    return result;
  }
  function pathEffectsForPreview(effects) {
    const result = {};
    (effects || []).forEach(effect => {
      if (effect?.type === 'path' && typeof effect.value === 'number') result[effect.key] = (result[effect.key] || 0) + effect.value;
    });
    return result;
  }
  function mergePathImpacts(...impacts) {
    const result = {};
    impacts.forEach(impact => Object.entries(impact || {}).forEach(([key, value]) => { result[key] = (result[key] || 0) + value; }));
    return Object.fromEntries(Object.entries(result).filter(([, value]) => value));
  }
  function choicePathNotes(s, id, choice, index) {
    const always = eventAlwaysPathImpact(s, id, index);
    const success = mergePathImpacts(pathEffectsForPreview(choice.effects), choice.pathPreview);
    const failure = pathEffectsForPreview(choice.failureEffects);
    if (!choice.check) {
      const impact = mergePathImpacts(always, success);
      return Object.keys(impact).length ? [`แนวทาง: ${formatImpact(impact)}`] : [];
    }
    const notes = [];
    if (Object.keys(always).length) notes.push(`แนวทางจากการเลือก: ${formatImpact(always)}`);
    if (Object.keys(success).length) notes.push(`หากสำเร็จ: ${formatImpact(success)}`);
    if (Object.keys(failure).length) notes.push(`หากไม่สำเร็จ: ${formatImpact(failure)}`);
    return notes;
  }

  // บทสนทนาจะสะท้อนแนวทางและรากวิญญาณที่สั่งสมมา โดยไม่เปิดเผยค่าหรือสูตรลับ
  const PATH_DIALOGUE = {
    compassion: 'แม้เรื่องของสำนักจะหนักหนา สายตาของเจ้ายังอดหันไปมองผู้คนที่อาจถูกทิ้งไว้ข้างหลังไม่ได้',
    duty: 'คำตอบของเจ้าถูกชั่งด้วยหน้าที่ต่อผู้คนและสำนัก มากกว่าความปลอดภัยของตนเอง',
    freedom: 'ลึกลงไป เจ้ายังเว้นทางถอยไว้เสมอ เพราะรู้ว่าชะตาของตนไม่ควรถูกผูกไว้กับผู้ใดทั้งหมด',
    insight: 'เจ้าไม่รีบเชื่อคำพูดใด สิ่งที่สำคัญกว่าความรู้สึกคือความจริงที่ซ่อนอยู่เบื้องหลังมัน'
  };
  const ROOT_DIALOGUE = {
    human: 'รากมนุษย์ธรรมดาไม่ได้มอบคำตอบให้เจ้า ทุกก้าวจึงต้องแลกมาด้วยการตัดสินใจของตัวเอง',
    earth: 'ปราณปฐพีในกายทำให้เจ้ายืนหยัดกับแรงกดดันได้มั่นคงกว่าที่คนอื่นคาด',
    heaven: 'ปราณสวรรค์ไหลผ่านชีพจรอย่างรวดเร็ว จนผู้คนเริ่มคาดหวังว่าเจ้าจะทำสิ่งที่เกินสามัญ',
    immortal: 'รากเซียนทำให้คำพูดและการกระทำของเจ้าถูกจับตามอง ราวกับทุกการเลือกอาจเปลี่ยนชะตาคนรอบข้าง',
    legend: 'รากตำนานทำให้แม้ผู้แข็งแกร่งยังมองเจ้าเป็นตัวแปรที่ไม่ควรปล่อยผ่าน'
  };
  function adaptiveDialogue(s, base) {
    const paths = s.paths || {};
    const key = Object.keys(PATH_DIALOGUE).sort((a, b) => (paths[b] || 0) - (paths[a] || 0))[0] || 'duty';
    const root = s.hero?.root || 'human';
    const rootHint = s.hero?.rootKnown ? (ROOT_DIALOGUE[root] || ROOT_DIALOGUE.human) : 'บางอย่างในตัวเจ้าดูเหมือนกำลังหลับใหล แม้ยังไม่มีใครบอกได้ว่ามันคืออะไร';
    return `${base} ${PATH_DIALOGUE[key]} ${rootHint}`;
  }

  let state = null;
  let mobileView = 'summary';
  let activeInfoPanelTab = 'overview';
  let mobileUnlockState = null;
  let knownMobileActivities = new Set();
  let newlyUnlockedMobileActivities = new Set();
  let tickTimer = null;
  let selectedTalent = 'jade';
  let selectedRoot = 'human';
  let selectedMode = 'story';
  let selectedRule = LIFE_RULES.oneLife.id;
  let selectedCharacter = 'lin-an';
  let accountSession = { kind: 'unbound', email: null };
  let toastTimer = null;

  // คลังข้อมูล 18 ฉากจบ สำหรับ Destiny Codex
  const CODEX_DEFINITIONS = [
    { id: 'guardian_legend', mark: '神', title: 'ตำนานผู้พิทักษ์เมฆาคราม', rarity: '1 ใน 1,850 คน', desc: 'อาจารย์หายดี สำนักเตรียมพร้อม หลินอันบรรลุขั้นสูง ขับไล่งูดำเด็ดขาด', hint: 'รักษาอาจารย์ เปิดโปงคนทรยศโดยตรง และฝึกตนจนทะลวงขั้นสูง' },
    { id: 'guardian', mark: '義', title: 'ผู้พิทักษ์เมฆาคราม', rarity: '1 ใน 480 คน', desc: 'ยืนหยัดเคียงข้างอาจารย์และศิษย์ร่วมสำนัก เปลี่ยนคืนสำนักแตกเป็นชัยชนะ', hint: 'ร่วมต้านศัตรูกับสำนักโดยมีการเตรียมพร้อมและพลังรบเพียงพอ' },
    { id: 'guardian_pyrrhic', mark: '孤', title: 'ผู้แบกรับเถ้าถ่านเมฆาคราม', rarity: '1 ใน 760 คน', desc: 'หลินอันแข็งแกร่งจนแบกสำนักคนเดียวได้ แต่อาจารย์เหวินสิ้นชีพเพราะแผลเรื้อรัง', hint: 'ไม่รักษาอาจารย์ แต่ฝึกตนจนพลังสูงมากมาชดเชยพลังสำนักที่ขาดหาย' },
    { id: 'sect_fall', mark: '破', title: 'บทเพลงสิ้นสำนัก', rarity: '1 ใน 85 คน', desc: 'สำนักเมฆาครามแตกพ่ายในทะเลเพลิง หลินอันและอาจารย์สู้จนตัวตาย', hint: 'เลือกสู้เคียงข้างสำนักในวันที่พลังของสำนักและตนเองยังไม่พร้อม' },
    { id: 'wanderer_exodus', mark: '生', title: 'ผู้นำทางใต้เงาจันทร์', rarity: '1 ใน 310 คน', desc: 'พาศิษย์และผู้ลี้ภัยที่รับไว้หนีผ่านอุโมงค์ลับ ไปสร้างชุมชนใหม่ในแดนใต้', hint: 'เตรียมเส้นทางหรือเสบียง มีว่องไว กายา และเลือกพาผู้คนหนี' },
    { id: 'wanderer_lone', mark: '風', title: 'ผู้รอดชีวิตแห่งทางไกล', rarity: '1 ใน 38 คน', desc: 'เลือกหลบหนีออกจากเขาเพียงลำพัง ละทิ้งอดีตเพื่อเริ่มต้นชีวิตใหม่', hint: 'มีว่องไวหรือเส้นทางพร้อม และมีกายาพอสำหรับหนีคนเดียว' },
    { id: 'traitor_kingpin', mark: '叛', title: 'ขุนพลงูดำแห่งคืนเพลิง', rarity: '1 ใน 4,200 คน', desc: 'เปิดประตูให้กองโจรงูดำ ได้รับการแต่งตั้งเป็นขุนพลคุมแดนเหนือ', hint: 'สร้างสัมพันธ์กับโลกมืดตั้งแต่เนิ่นๆ สร้างชื่อเสียงงูดำ และแปรพักตร์' },
    { id: 'outlaw', mark: '惡', title: 'จอมยุทธ์ชื่อฉาว', rarity: '1 ใน 190 คน', desc: 'หลบหนีรอดชีวิต แต่ชื่อเสียงยุทธภพติดลบจนผู้คนปฏิเสธและไร้ที่ยืน', hint: 'เอาตัวรอดจากการหลบหนี แล้วมีชื่อเสียงยุทธภพต่ำกว่า -15' },
    { id: 'death_battle', mark: '戰', title: 'เถ้ากระดูกหน้ากำแพง', rarity: '1 ใน 30 คน', desc: 'ฐานบำเพ็ญยังอยู่เพียงขั้นหลอมกาย ถูกกองทัพงูดำสังหารตั้งแต่แนวหน้า', hint: 'เลือกเข้าสู้ในศึกตัดสินทั้งที่ยังไม่ทะลวงพ้นขั้นหลอมกาย' },
    { id: 'death_escape', mark: '寒', title: 'ลูกศรกลางหิมะ', rarity: '1 ใน 25 คน', desc: 'ว่องไวและกายาไม่พอ ถูกเกาทัณฑ์พิษงูดำยิงสังหารระหว่างหลบหนี', hint: 'พาผู้คนโดยไม่มีว่องไว ≥ 6 หรือกายาพอ หรือหนีคนเดียวโดยไม่มีว่องไว/เส้นทางและกายาพอ' },
    { id: 'death_deviation', mark: '劫', title: 'ชีพจรแตกดับ', rarity: '1 ใน 20 คน', desc: 'ฝืนทะลวงด่านโดยประมาท ลมปราณย้อนเข้าทำลายหัวใจและชีพจร', hint: 'เลือกฝืนทะลวงด่านในเหตุการณ์ปราณย้อนโดยสุขภาพและพลังไม่ถึง' },
    { id: 'death_poison', mark: '毒', title: 'พิษชาดกลืนวิญญาณ', rarity: '1 ใน 18 คน', desc: 'กินผลวิเศษที่มีพิษร้ายแรงโดยไม่ตรวจสอบ พิษแทรกซึมเข้าสู่หัวใจ', hint: 'กินผลชาดพันปีโดยไม่มีพรสวรรค์ตาเฉียบคมหรือสุขภาพไม่พอ' },
    { id: 'death_early', mark: '塵', title: 'เถ้าถ่านที่ไร้ชื่อ', rarity: '1 ใน 4 คน (พบได้ทั่วไป)', desc: 'เด็กน้อยหมดลมหายใจข้างทางในวัยเยาว์ ก่อนที่จะได้รู้จักคำว่าสำนัก', hint: 'ปล่อยให้สุขภาพหมดตั้งแต่ช่วงอายุ 5 - 11 ขวบ (เกรดธุลีดิน)' },
    { id: 'death', mark: '終', title: 'ดอกเหมยกลางหิมะ', rarity: '1 ใน 15 คน', desc: 'ร่างกายทรุดโทรมจากการตรากตรำต่อเนื่องโดยไม่ยอมพักฟื้น', hint: 'ปล่อยให้สุขภาพหมดระหว่างการใช้ชีวิตในสำนัก' },
    { id: 'quiet_roof', mark: '家', title: 'ชีวิตสงบใต้ชายคา', rarity: 'เส้นทางนอกยุทธภพ', desc: 'หลินอันไม่เข้าสำนัก สร้างงาน บ้าน และความสัมพันธ์ที่ดูแลได้จริง', hint: 'ปฏิเสธสำนัก แล้วรักษาสุขภาพ เงิน และที่พักจนถึง M216' },
    { id: 'nameless_martial', mark: '武', title: 'นักยุทธ์ไร้นาม', rarity: 'เส้นทางนอกยุทธภพ', desc: 'ฝึกกายและวิชาต่อสู้จนมีชื่อในหมู่ผู้คน โดยไม่เปิดทางสู่การบำเพ็ญ', hint: 'ปฏิเสธสำนัก ฝึกกาย/ยุทธ์ และรอดถึง M216' },
    { id: 'war_shadow_survivor', mark: '影', title: 'ผู้รอดชีวิตจากเงาสงคราม', rarity: 'เส้นทางพยานสงคราม', desc: 'มองเห็นผลของสงครามโดยไม่ถูกบังคับให้เป็นศิษย์หรือทหาร', hint: 'ใช้เส้นทางนอกสำนักที่ได้รับผลจากข่าวสงคราม แล้วรอดชีวิต' },
    { id: 'new_land_wanderer', mark: '界', title: 'ผู้เดินทางสู่ดินแดนใหม่', rarity: 'เส้นทางอิสระ', desc: 'ทิ้งอดีตไว้เบื้องหลังและเริ่มต้นใหม่ด้วยเสบียง เส้นทาง และชื่อที่สร้างเอง', hint: 'เลือกออกเดินทาง รักษาทรัพยากร และถึง M216' }
  ];
  const ENDING_STATUS = {
    guardian_legend: 'reachable', guardian: 'reachable', guardian_pyrrhic: 'reachable', sect_fall: 'reachable',
    wanderer_exodus: 'reachable', wanderer_lone: 'reachable', traitor_kingpin: 'reachable', outlaw: 'reachable',
    death_battle: 'reachable', death_escape: 'reachable', death_deviation: 'reachable', death_poison: 'reachable', death_early: 'reachable', death: 'reachable',
    quiet_roof: 'reachable', nameless_martial: 'reachable', new_land_wanderer: 'reachable', war_shadow_survivor: 'reachable'
  };
  CODEX_DEFINITIONS.forEach(definition => { definition.status = ENDING_STATUS[definition.id] || 'planned'; definition.tested = false; });
  function endingAvailability(id, meta = null) { const base = ENDING_STATUS[id] || 'planned'; const source = meta || (typeof state !== 'undefined' && state?.metaState) || { endings: [] }; const tested = Array.isArray(source.endings) && source.endings.includes(id); return { id, status: tested ? 'tested' : base, playable: base === 'reachable', tested }; }

  const ACHIEVEMENT_NAMES = {
    guardian_legend: '破天守云 · ตำนานเหนือเมฆา', guardian: '守山护义 · ผู้พิทักษ์รักษาสำนัก',
    guardian_pyrrhic: '孤灯负山 · แบกภูผาใต้โคมเดียวดาย', sect_fall: '焚门余烬 · เถ้าถ่านหลังประตูเพลิง',
    wanderer_exodus: '月下南渡 · ข้ามใต้จันทร์พาผู้คน', wanderer_lone: '一苇独行 · เดียวดายดุจใบไผ่',
    traitor_kingpin: '引狼入关 · เปิดประตูเรียกหมาป่า', outlaw: '恶名孤途 · ทางไกลใต้ชื่อฉาว',
    death_battle: '血染关山 · เลือดชโลมด่านภูผา', death_escape: '雪落无声 · หิมะกลบเสียงลมหายใจ',
    death_deviation: '逆脉焚心 · ชีพจรถูกเผาด้วยปราณย้อน', death_poison: '赤果噬魂 · ผลชาดกลืนวิญญาณ',
    death_early: '孤灯未明 · โคมเดียวยังไม่ทันสว่าง', death: '梅落长寒 · เหมยร่วงในเหมันต์ยาว',
    quiet_roof: '安居有灯 · ชายคาที่มีแสงไฟ', nameless_martial: '无名入世 · นักยุทธ์ไร้นาม',
    war_shadow_survivor: '余烬见证 · ผู้เห็นเงาสงคราม', new_land_wanderer: '远界新生 · เริ่มชีวิตในแดนใหม่'
  };

  function addHerb(s, name, qty = 1) {
    ensureInventory(s);
    s.materials.herb = (s.materials.herb || 0) + qty;
  }
  function addMaterial(s, name, qty = 1) {
    ensureInventory(s);
    s.materials.iron = (s.materials.iron || 0) + qty;
  }

  function scopedEpicEvent(def) {
    return {
      id: def.id, activity: 'any', rarity: 'epic', minMonth: 0, maxMonth: Infinity,
      unlock: s => !s.flags?.[def.flag] && (s.hero?.ageMonths || 0) >= def.minAge * 12 && (s.hero?.ageMonths || 0) <= def.maxAge * 12 && (!def.when || def.when(s)),
      tag: `มหากาพย์ · ${def.phase}`,
      art: def.art || 'epic-life', title: def.title, text: def.text,
      choices: def.choices.map(choice => ({ ...choice, effect: s => { s.flags[def.flag] = true; choice.effect(s); } }))
    };
  }
  let SOCIAL_EVENTS;
  let INFANT_LEGENDARY_EVENTS;
  let INFANT_EPIC_EVENTS;
  let SCOPED_EPIC_EVENTS;
  let RANDOM_EVENTS;
  function unlockedTechniques(s) { return TECHNIQUES.filter(t => t.unlock(s)); }

  function weaponTechniqueCompatibility(s) {
    const weapons = activeTreasures(s).filter(item => {
      const normalized = normalizeItemGrade(typeof item === 'object' ? item : { name: item, bonus: {} });
      return normalized.category === 'weapon';
    });
    // Older saves can apply all owned items; do not guess which of several is equipped.
    if (weapons.length !== 1) return null;
    const weapon = normalizeItemGrade(typeof weapons[0] === 'object' ? weapons[0] : { name: weapons[0], bonus: {} });
    const technique = effectiveTechniques(s).find(t =>
      techniqueSlot(t) === 'combat' && t.id !== 'forbidden' && t.subtype === weapon.subtype
    );
    if (!technique) return null;
    return { weapon: weapon.name, technique: technique.name, subtype: weapon.subtype, multiplier: 1.1 };
  }

  // ความชำนาญขยายเฉพาะโบนัสโจมตีของวิชาต่อสู้ที่ติดตั้ง ไม่คูณอาวุธหรือพลังฐาน
  function martialSkillBonus(s) {
    return Math.floor(clamp(Number(s.hero?.martialSkill) || 0, 0, 100) / 10) * .02;
  }
  function techniqueBonuses(s) {
    const equippedCombat = s.loadoutMode ? ensureTechniqueLoadout(s).combat : null;
    return effectiveTechniques(s).reduce((sum, t) => {
      Object.entries(t.bonus || {}).forEach(([key, value]) => {
        const bonus = key === 'attack' && value > 0 && t.id === equippedCombat && techniqueSlot(t) === 'combat'
          ? value * (1 + martialSkillBonus(s)) : value;
        sum[key] = (sum[key] || 0) + bonus;
      });
      return sum;
    }, { attack: 0, defense: 0, body: 0, agility: 0, training: 0 });
  }
  // A child's body can use only part of an artifact's physical power. Stored
  // item bonuses stay intact and gradually become available through age 12.
  function equipmentMaturityFactor(s) {
    const ageMonths = Math.max(0, Number(s.hero?.ageMonths) || 0);
    return Math.min(1, .15 + .85 * Math.min(ageMonths / 144, 1));
  }
  function effectiveTreasureBonus(s, item) {
    const bonus = itemBonus(item);
    const factor = equipmentMaturityFactor(s);
    ['attack', 'defense', 'body', 'agility'].forEach(key => {
      if (Number.isFinite(bonus[key])) bonus[key] = Math.round(bonus[key] * factor * 100) / 100;
    });
    return bonus;
  }
  function treasureBonuses(s) {
    return activeTreasures(s).reduce((sum, item) => { const bonus = effectiveTreasureBonus(s, item); Object.entries(bonus).forEach(([key, value]) => sum[key] = (sum[key] || 0) + value); return sum; }, { attack: 0, defense: 0, body: 0, agility: 0, training: 0 });
  }
  let EXPLORATION_EVENTS;
  let REST_EVENTS;
  function addTreasure(s, name, bonus, meta = {}) {
    if (meta.recipeId || !(s.treasures || []).some(item => (typeof item === 'string' ? item : item.name) === name)) {
      const item = normalizeItemGrade({ name, bonus: bonus || {}, ...meta });
      s.treasures.push(item);
      ensureTreasureIdentities(s);
    }
  }
  function ensureAttributes(s) {
    const h = s.hero;
    h.attributes = h.attributes || {};
    h.attributes.body = Number.isFinite(h.attributes.body) ? h.attributes.body : (h.combat?.body || 1);
    h.attributes.intellect = Number.isFinite(h.attributes.intellect) ? h.attributes.intellect : 10;
    h.attributes.spirit = Number.isFinite(h.attributes.spirit) ? h.attributes.spirit : 10;
    h.attributes.charm = Number.isFinite(h.attributes.charm) ? h.attributes.charm : 10;
    h.attributes.luck = Number.isFinite(h.attributes.luck) ? h.attributes.luck : 10;
    h.karma = Number.isFinite(h.karma) ? h.karma : 0;
    return h.attributes;
  }
  function ensureRootState(s) {
    s.hero.rootKnown = !!s.hero.rootKnown;
    s.hero.rootDiscovery = s.hero.rootDiscovery || null;
    return s.hero.rootKnown;
  }
  function revealRoot(s, source = 'การตรวจรากวิญญาณ') {
    ensureRootState(s);
    if (s.hero.rootKnown) return false;
    s.hero.rootKnown = true; s.hero.rootDiscovery = source;
    addLog(`รากวิญญาณถูกเปิดเผย: ${ROOTS[s.hero.root]?.name || 'ไร้ราก'} (${source})`, true);
    return true;
  }
  function ensurePreCultivationState(s) {
    const h = s.hero;
    const hasAccessMarker = Object.prototype.hasOwnProperty.call(h, 'cultivationAccess');
    h.cultivationAccess = hasAccessMarker ? !!(h.cultivationAccess || s.flags?.basicCultivation) : !!(h.realm > 0 || s.flags?.basicCultivation);
    h.bodyFoundation = Math.max(0, Number(h.bodyFoundation) || 0);
    h.martialSkill = Math.max(0, Number(h.martialSkill) || 0);
    h.discipline = Math.max(0, Number(h.discipline) || 0);
    if (h.cultivationAccess && h.realm < 1) { h.realm = 1; h.stage = 1; }
    if (!h.cultivationAccess) { h.realm = 0; h.stage = 0; h.cultivation = 0; h.qi = 0; h.qiMax = 0; }
    else ensureQiState(s);
    return h;
  }
  function qiCapacity(hero) {
    if (!hero?.cultivationAccess) return 0;
    return 80 + Math.max(0, (hero.realm || 1) - 1) * 40 + Math.max(0, (hero.stage || 1) - 1) * 8;
  }
  function ensureQiState(s) {
    const h = s.hero;
    h.qiMax = qiCapacity(h);
    h.qi = Number.isFinite(h.qi) ? Math.max(0, Math.min(h.qiMax, h.qi)) : h.qiMax;
    return h;
  }
  function restoreQi(s, amount) {
    const h = ensureQiState(s);
    if (!h.cultivationAccess) return 0;
    const before = h.qi;
    h.qi = Math.min(h.qiMax, h.qi + Math.max(0, Number(amount) || 0));
    return h.qi - before;
  }
  function openCultivation(s, source = 'ได้รับวิชาหลอมกาย', grantBasicTechnique = true) {
    const h = ensurePreCultivationState(s);
    if (h.cultivationAccess) return false;
    h.cultivationAccess = true; h.realm = 1; h.stage = 1; h.cultivation = 0; h.qiMax = qiCapacity(h); h.qi = h.qiMax; if (grantBasicTechnique) s.flags.basicCultivation = true; s.flags.cultivationCapped = false;
    addLog(`${source} เส้นทางบำเพ็ญเปิดขึ้น — หลอมกาย ขั้น 1`, true);
    return true;
  }
  function updateFactionReputation(s) {
    s.factions = s.factions || { sect: 0, serpent: 0, jianghu: 0 };
    s.factions.sect = Math.round(((s.relations.master || 0) + (s.relations.senior || 0)) * .55 + (s.paths.duty || 0) * 2 + (s.flags.warnedMaster ? 10 : 0) - (s.flags.betrayedSect ? 80 : 0));
    s.factions.serpent = (s.flags.betrayedSect ? 55 : 0) + (s.flags.workedUnderworld ? 12 : 0) + (s.flags.forbiddenPower ? 8 : 0) - (s.flags.traitorExposed ? 35 : 0) - (s.flags.warnedMaster ? 8 : 0);
    s.factions.jianghu = s.hero.reputation || 0;
    return s.factions;
  }
  function ensureCombat(s) {
    if (s.hero.combat) return;
    const base = Math.max(1, Math.floor((s.hero.power || 10) / 10));
    s.hero.root = s.hero.root || 'human';
    s.hero.combat = { attack: base, defense: base, body: base, agility: base, training: ROOTS[s.hero.root].training + (TALENTS[s.hero.talent]?.training || 0) };
  }
  function cultivationRank(hero) { return !hero?.cultivationAccess && !(hero?.realm > 0) ? 0 : (Math.max(1, hero.realm || 1) - 1) * 9 + Math.max(1, hero.stage || 1); }
  function realmName(hero) { return !hero?.cultivationAccess && !(hero?.realm > 0) ? 'ยังไม่เปิดทางบำเพ็ญ' : `${REALMS[Math.min(REALMS.length - 1, Math.max(0, (hero.realm || 1) - 1))]} ขั้น ${Math.max(1, hero.stage || 1)}`; }
  function advanceCultivationStage(s, amount = 1, forced = false) {
    if (!s.hero?.cultivationAccess || !equippedCultivationTechnique(s) || cultivationAtCeiling(s)) return false;
    const h = s.hero; h.stage = Math.max(1, h.stage || 1);
    for (let i = 0; i < amount; i++) {
      if (cultivationAtCeiling(s)) break;
      if (h.stage < 9) h.stage++;
      else if (h.realm < REALMS.length) {
        ensureLifespanState(s);
        h.realm++; h.stage = 1;
        const bonusYears = majorRealmLifespanBonus(h.realm);
        h.lifespanMonths += bonusYears * 12;
        h.lifespan = h.lifespanMonths / 12;
        addLog(`ทะลวงขั้นใหญ่สำเร็จ อายุขัยเพิ่ม ${bonusYears.toLocaleString()} ปี`, true);
      }
      else { h.stage = 9; h.cultivation = Math.min(99, h.cultivation); }
    }
    h.combat.attack += 2; h.combat.defense += 2; h.combat.body += 2; h.combat.agility += 2; h.maxHealth += 4; h.health = Math.min(h.maxHealth, h.health + (forced ? 10 : 16));
    addLog(`ทะลวงสู่ ${realmName(h)} สำเร็จ! พลังจากฐานบำเพ็ญเพิ่มขึ้นอย่างชัดเจน`, true);
  }
  function resolveCultivationProgress(s) {
    const h = ensurePreCultivationState(s);
    if (!h.cultivationAccess) { h.cultivation = 0; return; }
    if (!equippedCultivationTechnique(s)) return;
    while (h.cultivation >= 100) {
      if (cultivationAtCeiling(s)) break;
      if (h.stage < 9) {
        h.cultivation -= 100;
        advanceCultivationStage(s);
        continue;
      }
      if (h.realm >= REALMS.length) {
        h.cultivation = 99;
        addLog('เจ้ามาถึงขีดสูงสุดของโลกนี้แล้ว ความก้าวหน้าไม่อาจเกินขั้นสุดท้าย', true);
        break;
      }
      h.cultivation = 100;
      ensureTrainingState(s).breakthroughState.ready = true;
      break;
    }
  }

  // ซิงค์พลังและสถิติตามเกณฑ์ใหม่
  function syncCombat(s) {
    ensureCombat(s); ensureAttributes(s); ensureRootState(s); ensurePreCultivationState(s); const b = techniqueBonuses(s), tb = treasureBonuses(s), c = s.hero.combat;
    if (s.hero.cultivationAccess) s.hero.stage = Math.max(1, s.hero.stage || 1);
    const baseAttack = Math.max(1, c.attack + b.attack + tb.attack);
    const compatibility = weaponTechniqueCompatibility(s);
    const attack = Math.max(1, Math.round(baseAttack * (compatibility?.multiplier || 1)));
    const defense = Math.max(1, c.defense + b.defense + tb.defense);
    const body = Math.max(1, c.body + b.body + tb.body);
    const agility = Math.max(1, c.agility + b.agility + tb.agility);
    const realmPower = calculateRealmPower(s.hero.realm, s.hero.stage);
    const attributes = { ...s.hero.attributes };
    ['intellect', 'spirit', 'charm', 'luck'].forEach(key => { attributes[key] += Number(b[key] || 0) + Number(tb[key] || 0); });
    const mentalPower = Math.round((attributes.intellect + attributes.spirit + attributes.charm + attributes.luck) * .8);
    const statsPower = Math.round(attack * 8 + defense * 6 + body * 5 + agility * 5 + mentalPower);
    const rawPower = realmPower + statsPower + Math.max(0, Number(s.hero.powerBonus) || 0);
    s.hero.power = Math.round(rawPower);
    return {
      attack, defense, body, agility, compatibility,
      attributes, karma: (s.hero.karma || 0) + Number(tb.karma || 0) + Number(b.karma || 0),
      // เซฟเก่าเก็บค่าฝึกเริ่มต้นที่รวมรากไว้แล้ว หักส่วนรากออกก่อนใช้ตัวคูณฝึก
      training: Math.max(25, c.training - ((ROOTS[s.hero.root]?.training ?? 100) - 100) + b.training + tb.training),
      realmPower, statsPower, equipmentMaturity: equipmentMaturityFactor(s), totalPower: s.hero.power
    };
  }

  function resolveAmbush(s, mode) {
    const combat = syncCombat(s);
    const flee = s.flags.stepLearned || s.flags.foundMap || s.flags.friendKeepsake || s.hero.talent === 'keen' || combat.agility >= 12;
    if ((mode === 'fight' && combat.totalPower >= 1000) || (mode === 'flee' && flee)) {
      s.flags.survivedAmbush = true; s.hero.reputation += 8; s.hero.powerBonus += 50; s.hero.health -= 6;
      addLog(mode === 'fight' ? 'เจ้าฝ่าวงล้อมและจับนักฆ่าได้หนึ่งคน' : 'เจ้าลวงศัตรูเข้าทางตันก่อนหายไปในหมอก', true);
    } else {
      s.flags.survivedAmbush = true; s.hero.health -= 32; s.hero.reputation -= 3;
      addLog('เจ้ารอดมาได้อย่างหวุดหวิด แต่บาดแผลฉกรรจ์', true);
    }
  }

  // คำนวณความพร้อมรับศึกและขวัญกำลังใจของสำนัก (สำหรับแสดงผลและคำนวณการรบ)
  function calculateSectStatus(s) {
    let defenseScore = 110; // ฐาน
    if (s.flags.masterHealed) defenseScore += 45;
    else if (s.flags.masterCrippled) defenseScore -= 40;
    if (s.flags.alliesRecruited) defenseScore += 25;
    if (s.flags.warnedMaster) defenseScore += 20;
    if (s.flags.traitorExposed) defenseScore += 30;
    if (s.flags.shelterBuilt || s.flags.civiliansSaved) defenseScore += 15;
    if (s.flags.helpedFriend) defenseScore += 20;

    let morale = 'มั่นคง';
    let badgeClass = 'positive';
    if (s.flags.masterCrippled && !s.flags.alliesRecruited) { morale = 'ระส่ำระสาย'; badgeClass = 'negative'; }
    else if (s.flags.traitorExposed && s.flags.masterHealed) { morale = 'ฮึกเหิม'; badgeClass = 'positive'; }
    else if (s.flags.masterCrippled) { morale = 'หวั่นไหว'; badgeClass = 'negative'; }

    let readiness = 'ปานกลาง';
    const pct = clamp(Math.round((defenseScore / 220) * 100), 10, 100);
    if (pct >= 80) readiness = 'พร้อมรบยอดเยี่ยม';
    else if (pct >= 55) readiness = 'พร้อมรับศึก';
    else if (pct >= 35) readiness = 'แนวรับเปราะบาง';
    else readiness = 'วิกฤตใกล้แตก';

    return { defenseScore, morale, badgeClass, readiness, pct };
  }

  // ระบบ Dynamic Battle Balance หักลบพลังสำนัก vs กองทัพงูดำ
  // รากมนุษย์ต้องเตรียมการครบและชนะศึกแบบเฉียดฉิว ส่วนรากที่สูงกว่ายอมให้พลาดได้มากขึ้น
  function battlePreparation(s) {
    const critical = [
      s.flags.masterHealed,
      s.flags.traitorExposed,
      s.flags.warnedMaster,
      s.flags.survivedAmbush
    ];
    let score = 0;
    if (s.flags.masterHealed) score += 2;
    if (s.flags.traitorExposed) score += 2;
    else if (s.flags.misdirectionSuccessful) score += 1;
    if (s.flags.warnedMaster) score += 1;
    if (s.flags.survivedAmbush) score += 1;
    if (s.flags.helpedFriend) score += 1;
    if (s.flags.alliesRecruited) score += 1;
    if (s.flags.shelterBuilt || s.flags.civiliansSaved) score += 1;
    if (s.flags.choseLoyalty) score += 1;
    return {
      score,
      criticalComplete: critical.every(Boolean),
      // M122 เลือกหน่วยอาสาได้ และ M140 ยังช่วยอพยพพลเรือนต่อ จึงทำคะแนนเต็ม 10 ได้จริง
      requiredScore: { human: 10, earth: 8, heaven: 7, immortal: 6, legend: 5 }[s.hero.root] || 10
    };
  }

  // ฐานถูกขยับให้สงครามปลายทางยังอันตรายจริง พลังตัวละครจึงมีความหมาย
  // โดยเฉพาะรากมนุษย์ที่ต้องเล่นถูกแทบทุกทางเลือกจึงจะชนะได้
  function siegeBattleStrength(s) {
    const combat = syncCombat(s);

    // 1. กำลังรบกองทัพงูดำ
    let serpentArmy = 70000;
    if (s.flags.traitorExposed) serpentArmy -= 1500; // ตัดสายสืบ
    else if (s.flags.misdirectionSuccessful) serpentArmy -= 1500; // ข่าวลวงสำเร็จ
    if (s.flags.survivedAmbush) serpentArmy -= 750; // ตัดกำลังลอบสังหาร

    // 2. กำลังรบสำนักเมฆาคราม
    let sectDefense = 62900;
    if (s.flags.masterHealed) {
      sectDefense += 1000; // อาจารย์ฟื้นตัวเต็มที่ นำทัพสมบูรณ์
    } else if (s.flags.masterCrippled) {
      sectDefense -= 2500; // อาจารย์บาดเจ็บเรื้อรัง พลังรบสำนักลดลง แต่ยังเปิดโอกาสให้รูทนี้ชนะได้
    }

    if (s.flags.alliesRecruited) sectDefense += 800; // เสริมกำแพง/อาสา
    if (s.flags.warnedMaster) sectDefense += 600; // เตรียมพร้อมรับมือ
    if (s.flags.shelterBuilt || s.flags.civiliansSaved) sectDefense += 400; // เสบียงและแนวหลัง
    if (s.flags.helpedFriend) sectDefense += 400; // เฉินหยูช่วยตีตลบหลัง
    if (s.flags.choseLoyalty) sectDefense += 300; // ขวัญกำลังใจศิษย์

    // 3. กำลังรบเฉพาะตัวของหลินอัน
    const linAnPower = combat.totalPower +
      (s.flags.spiritWeapon && activeTreasures(s).some(item => ['กระบี่ดาวตก', 'กระบี่หักกินโลหิต'].includes(typeof item === 'object' ? item.name : item)) ? 300 : 0) +
      (s.flags.forbiddenPower ? 800 : 0) +
      (s.flags.masterBondGiven ? 250 : 0) +
      (s.flags.seniorBondGiven ? 350 : 0) +
      s.paths.duty * 10 + s.paths.insight * 8;

    const totalDefense = sectDefense + linAnPower;
    const netAdvantage = totalDefense - serpentArmy;
    return { totalDefense, netAdvantage, linAnPower };
  }

  function siegeBattleOmen(s) {
    const { netAdvantage } = siegeBattleStrength(s);
    if (netAdvantage < -3000) return 'กองทัพงูดำเหนือกว่ามาก หากยืนหยัดตอนนี้ สำนักมีแนวโน้มแตกพ่ายและเจ้าอาจสิ้นชีพ';
    if (netAdvantage < 0) return 'กำลังฝ่ายเรายังเป็นรอง แม้ห่างกันไม่มาก หากเข้าต้านตอนนี้ สำนักมีแนวโน้มแตกพ่ายและเจ้าอาจสิ้นชีพ';
    if (netAdvantage < 3000) return 'กำลังฝ่ายเราพอรับมือได้อย่างฉิวเฉียด มีแนวโน้มรักษาสำนักไว้ได้ แต่ศึกจะหนักหน่วง';
    return 'กำลังฝ่ายเรามีเปรียบ มีแนวโน้มรักษาสำนักไว้ได้ แต่ชัยชนะอาจยังแลกด้วยความสูญเสีย';
  }

  function finishBattle(s) {
    const { totalDefense, netAdvantage, linAnPower } = siegeBattleStrength(s);
    const battleScore = totalDefense;
    const preparation = battlePreparation(s);

    // การเตรียมการกำหนดระดับชัยชนะ ไม่ใช่เงื่อนไขแพ้ศึกโดยอัตโนมัติ
    const root = s.hero.root || 'human';
    const canReachPerfect = preparation.score >= preparation.requiredScore &&
      (root !== 'human' || preparation.criticalComplete);

    // ประเมินผลลัพธ์
    if (netAdvantage < 0) {
      // พลังรวมไม่พอ พ่ายแพ้
      s.hero.health = 0;
      if (s.flags.masterCrippled) {
        endGame('sect_fall', {
          battleScore,
          debt: Number(s.household?.debt || 0),
          masterCrippled: true,
          cause: 'สำนักขาดเสาหลักค้ำจุน เพราะอาจารย์เหวินบาดเจ็บเรื้อรัง และกำลังรวมยังไม่พอรับศึก'
        });
      } else {
        endGame('sect_fall', {
          battleScore,
          debt: Number(s.household?.debt || 0),
          cause: 'กองทัพงูดำมีกำลังเหนือกว่าการเตรียมตัวของสำนักและหลินอัน ค่ายกลแตกพ่าย'
        });
      }
      return;
    }

    // ชนะศึก
    if (s.flags.masterCrippled) {
      // อาจารย์บาดเจ็บเรื้อรัง แต่หลินอันแข็งแกร่งจนแบกสำนักคนเดียวได้! แต่อาจารย์สิ้นชีพ
      endGame('guardian_pyrrhic', {
        battleScore,
        debt: Number(s.household?.debt || 0),
        netAdvantage,
        heroPower: linAnPower
      });
    } else if (canReachPerfect && netAdvantage >= 0 && s.flags.masterHealed && s.flags.traitorExposed && s.hero.realm >= 3) {
      // ชัยชนะสมบูรณ์แบบระดับตำนาน
      endGame('guardian_legend', {
        battleScore,
        debt: Number(s.household?.debt || 0),
        netAdvantage,
        perfect: true
      });
    } else {
      // ชัยชนะทั่วไป
      endGame('guardian', {
        battleScore,
        debt: Number(s.household?.debt || 0),
        netAdvantage
      });
    }
  }

  // ระบบหลบหนี ต้องมีค่าว่องไวและกายา หรือเส้นทางพร้อมตามโหมดที่เลือก
  function finishEscape(s, withPeople) {
    const combat = syncCombat(s);
    const agilityOk = combat.agility >= 6;
    const bodyOk = combat.body >= 4 || s.hero.power >= 300;
    const routeOk = s.flags.foundMap || s.flags.stepLearned || s.flags.escapePrepared || s.hero.talent === 'swift';
    // เมตตาที่สั่งสมทำให้ผู้คนช่วยกันพาขบวนผ่านทางลับได้ แต่ยังต้องมีเส้นทางและร่างกายพร้อม
    const compassionAid = withPeople && (s.paths?.compassion || 0) >= 6;

    const canEscapeWithPeople = (agilityOk || compassionAid) && routeOk && bodyOk;
    const canEscapeAlone = (agilityOk || routeOk) && bodyOk;
    if (!(withPeople ? canEscapeWithPeople : canEscapeAlone)) {
      s.hero.health = 0;
      endGame('death_escape', { cause: 'ค่าว่องไวและกายาไม่เพียงพอ ถูกทหารงูดำตามทันระหว่างหลบหนีกลางพายุหิมะ' });
      return;
    }

    if (s.hero.reputation < -15) {
      endGame('outlaw', { withPeople, rejected: withPeople });
    } else if (withPeople) {
      s.hero.reputation += 12;
      s.relations.friend += 10;
      endGame('wanderer_exodus', { withPeople: true });
    } else {
      endGame('wanderer_lone', { withPeople: false });
    }
  }

  function addLog(text, highlight = false) {
    if (!state) return;
    state.log.unshift({ month: state.month, worldMonth: state.world?.worldMonth ?? state.worldMonth ?? state.month, ageMonths: state.hero?.ageMonths ?? null, text, highlight, at: Date.now() });
    state.log = state.log.slice(0, 80);
  }

  function trainingHealthWarning() {
    return { id: 'training-health-warning', title: 'ร่างกายส่งสัญญาณเตือน', text: 'สุขภาพเหลือไม่เกิน 20 จุด เจ้ารู้สึกว่าร่างกายรับการฝึกต่อไปได้ยาก หากฝืนอาจบาดเจ็บสาหัสหรือเสียชีวิต ควรพักฟื้นก่อนหรือจะฝึกต่อ?', choices: [
      { text: 'พักฟื้นก่อน', note: 'เปลี่ยนกิจกรรมเป็นพักผ่อนและหยุด Auto', effect: s => { s.autoMode = false; s.activity = 'rest'; s.trainingRiskAcknowledgedMonth = -1; addLog('เจ้าหยุดฝึกเพื่อพักฟื้น และปิด Auto ไว้จนกว่าจะเปิดใหม่', true); } },
      { text: 'ฝืนฝึกต่อ', note: 'ฝึกต่อด้วยตนเอง มีความเสี่ยงเสียชีวิต · จะเตือนอีกหลังผ่านไปหนึ่งเดือน', effect: s => { s.autoMode = false; s.activity = 'train'; s.trainingRiskAcknowledgedMonth = s.month; addLog('เจ้ารับรู้ความเสี่ยงและเลือกฝึกต่อ ปิด Auto เพื่อให้ตัดสินใจเอง', true); } }
    ] };
  }
  function needsTrainingHealthWarning(s) {
    if (!activityAvailability(s, 'train').ok) return false;
    const nextScheduled = s.autoMode ? (s.autoDoctrine === 'route' ? routeAutoDoctrine(s).schedule : ensureAutoSchedule(s))[s.month % 12] : null;
    return (s.activity === 'train' || nextScheduled === 'train') && s.hero.health > 0 && s.hero.health <= 20 && s.trainingRiskAcknowledgedMonth !== s.month;
  }
  function processMonth(offline = false) {
    if (!state || state.ending || state.pendingEvent) return false;
    if (state.autoMode && state.activity === 'train' && cultivationAtCeiling(state)) { state.autoMode = false; addLog('หยุดฝึกอัตโนมัติ: วิชาบำเพ็ญถึงเพดานแล้ว ต้องเปลี่ยนวิชา', true); saveGame(); render(); return false; }
    if (needsTrainingHealthWarning(state)) { triggerEvent('training-health-warning', trainingHealthWarning()); return false; }
    state.month++;
    state.characterMonth = state.month;
    state.hero.ageMonths++;
    state.monthsProcessed++;
    ensureWorldState(state); ensureStoryRoute(state);
    state.world.worldMonth++;
    state.worldMonth = state.world.worldMonth;
    simulateLinAnWorld(state);
    simulateWorldCharacters(state);
    ensureLocationState(state); ensureAutoRestRule(state); ensureAutoSocialRule(state); ensureSocialState(state); enforceStoryLocationRules(state);
    const longRestTick = !!state.locations.longRest;
    if (state.autoMode) {
      ensureAutoMedicineRule(state);
      applyAutoMedicine(state);
      const schedule = state.autoDoctrine === 'route' ? routeAutoDoctrine(state).schedule : ensureAutoSchedule(state);
      const workRule = ensureAutoWorkRule(state);
      const healthRatio = state.hero.maxHealth ? state.hero.health / state.hero.maxHealth : 1;
      const routeFloor = state.autoDoctrine === 'route' ? routeAutoDoctrine(state).floor : 0;
      const autoRest = (state.autoRestRule.enabled && healthRatio <= state.autoRestRule.threshold / 100) || (routeFloor > 0 && healthRatio <= routeFloor / 100);
      let scheduledActivity = schedule[(state.month - 1) % 12] || (ACTIVITY[state.autoActivity] ? state.autoActivity : 'train');
      const household = ensureHousehold(state);
      const overworked = scheduledActivity === 'work' && workRule.enabled && (household.workFatigue >= workRule.fatigueThreshold || household.workRisk >= workRule.riskThreshold);
      const selectedJob = JOB_DEFS.find(job => job.id === household.job) || JOB_DEFS[0];
      const workUnavailable = scheduledActivity === 'work' && (!canTakeJob(state, selectedJob) || !getAvailableLocations(state, 'work').length);
      const avail = activityAvailability(state, scheduledActivity);
      const socialRule = ensureAutoSocialRule(state);
      const socialPoor = scheduledActivity === 'social' && socialRule.enabled && state.hero.money < socialRule.minMoney;
      const socialConflict = scheduledActivity === 'social' && socialRule.enabled && socialRule.mode === 'avoid_conflict' && ensureSocialState(state).conflicts > 0;

      if (!avail.ok) {
        addLog(`ระบบอัตโนมัติ: กิจกรรม"${getActivityDisplayName(state, scheduledActivity).name}"ยังไม่พร้อมทำ (${avail.reason}) จึงเปลี่ยนเป็นพักผ่อน`, true);
        scheduledActivity = 'rest';
      } else if (autoRest) {
        addLog(`ระบบอัตโนมัติ: สุขภาพเหลือ ${Math.round(state.hero.health)}/${state.hero.maxHealth} (ต่ำกว่าเกณฑ์ ${state.autoRestRule.threshold}%) จึงเปลี่ยนเป็นพักผ่อนเพื่อฟื้นฟู`, true);
        scheduledActivity = 'rest';
      } else if (overworked) {
        addLog(`ระบบอัตโนมัติ: ความเหนื่อยล้า (${household.workFatigue}/${workRule.fatigueThreshold}) หรือความเสี่ยงงานสูง จึงหยุดพักผ่อน`, true);
        scheduledActivity = 'rest';
      } else if (workUnavailable) {
        addLog(`ระบบอัตโนมัติ: ข้ามงาน${selectedJob.name} (${!canTakeJob(state, selectedJob) ? 'เงื่อนไขไม่ผ่าน' : 'ไม่มีสถานที่'}) จึงเปลี่ยนเป็นพักผ่อน`, true);
        scheduledActivity = 'rest';
      } else if (socialPoor) {
        addLog(`ระบบอัตโนมัติ: เงินทองไม่พอตามเกณฑ์เข้าสังคม (${state.hero.money}/${socialRule.minMoney} ตำลึง) จึงเปลี่ยนเป็นพักผ่อน`, true);
        scheduledActivity = 'rest';
      } else if (socialConflict) {
        addLog('ระบบอัตโนมัติ: หลีกเลี่ยงความขัดแย้งในสังคม จึงเปลี่ยนเป็นพักผ่อน', true);
        scheduledActivity = 'rest';
      } else if (scheduledActivity === 'social' && socialRule.enabled && socialRule.mode === 'build_alliance' && socialTargetAvailable(state, 'teahouse')) {
        setSocialTarget(state, 'teahouse');
      }

      setActivity(state, scheduledActivity);
      state.autoActivity = state.activity;
      if (state.activity === 'explore') applyAutoExploreRule(state);
    }
    if (!activityAvailability(state, state.activity).ok) {
      const avail = activityAvailability(state, state.activity);
      addLog(`ไม่สามารถทำ"${getActivityDisplayName(state, state.activity).name}"ได้ (${avail.reason}) จึงเปลี่ยนเป็นพักผ่อน`, true);
      setActivity(state, 'rest');
    }
    if (longRestTick) setActivity(state, 'rest');
    recordOpportunityCost(state, state.activity);
    advanceHousehold(state);
    advanceSectCareer(state);
    advanceFamily(state);
    advanceRelationships(state);
    advanceQuests(state);
    updateWorldPressure(state);
    updateWorldEvents(state);
    if (state.mode === 'free') {
      const routeSkill = state.activity === 'work' || state.activity === 'family' ? 'householdSkill' : state.activity === 'travel' ? 'travelKnowledge' : state.activity === 'train' ? (state.hero.cultivationAccess ? 'sectMerit' : 'martialReputation') : state.activity === 'sect' || state.activity === 'study' ? 'sectMerit' : null;
      if (routeSkill) addRouteSkill(state, routeSkill, 1);
      inferFreeLifeIdentity(state);
    }
    const h = state.hero;
    ensurePreCultivationState(state);
    const combat = syncCombat(state);
    if (state.activity !== 'train') state.trainingConsistencyMonths = 0;
    const roll = Math.random();
    let travelHandled = false;
    if (state.activity === 'travel') {
      ensureTravelState(state); ensureAutoTravelRule(state);
      if (!state.travel.active) {
        const destinations = availableTravelDestinations(state);
        const preferred = state.travel.destination && destinations.some(item => item.id === state.travel.destination)
          ? state.travel.destination : (destinations.find(item => item.id === (state.mode === 'free' ? 'market' : 'npc'))?.id || destinations[0]?.id);
        const vehicle = state.autoMode
          ? ({ safe: 'caravan', fast: 'cloudstep', opportunist: state.flags?.horseOwned ? 'horse' : 'foot' }[state.autoTravelRule] || 'foot')
          : state.travel.vehicle;
        if (preferred) {
          const fallback = state.autoMode ? selectTravelVehicle(state, preferred, vehicle) : vehicle;
          if (fallback) startTravel(state, preferred, { vehicle: fallback, deadlineMonth: state.travel.deadlineMonth });
          else state.travel.lastFailure = calculateTravel(state, preferred, { vehicle }).reason;
        }
      }
      travelHandled = advanceTravel(state);
    }
    if (state.activity === 'train') {
      if (h.ageMonths < 60) {
        h.bodyFoundation = Math.min(100, (h.bodyFoundation || 0) + 2);
        combat.body = Math.min(100, (combat.body || 0) + 1);
        combat.agility = Math.min(100, (combat.agility || 0) + 1);
        h.discipline = Math.min(100, (h.discipline || 0) + 1);
        h.attributes.body = Math.min(126, (h.attributes.body || 10) + 1);
        addLog('วิ่งเล่นและออกกำลังตามวัย ร่างกายกระปรี้กระเปร่า ว่องไวและพื้นฐานกายพัฒนา');
      } else if (cultivationAtCeiling(state)) {
        const technique = equippedCultivationTechnique(state);
        state.trainingConsistencyMonths = 0; state.autoMode = false;
        addLog(`ถึงเพดานของวิชา${technique.name} (${cultivationCeilingName(technique)}) ต้องติดตั้งวิชาบำเพ็ญที่มีเพดานสูงกว่าก่อนฝึกต่อ`, true);
      } else {
      let techniques = state.breakthroughState?.ready ? breakthroughTrainingSet(state) : chooseTrainingSet(state);
      const hasMethod = h.cultivationAccess && !!equippedCultivationTechnique(state);
      const resourceCost = trainingResourceCost(state, techniques);
      if (techniques.length && !canPayTrainingCost(state, resourceCost)) {
        addLog(`ยังขาดวัตถุดิบสำหรับ${techniques.map(t => `“${t.name}”`).join(' และ ')} จึงเปลี่ยนเป็นฝึกพื้นฐานแทน`);
        techniques = [];
      } else if (techniques.length) payTrainingCost(state, resourceCost);
      const gain = techniques.length ? trainingGainFor(state, techniques, combat) : Math.max(3, Math.round(6 * combat.training / 100));
      let effectiveGain = gain;
      ensureTrainingState(state);
      const profile = trainingProfile(state, techniques);
      const currentFocus = techniques.map(technique => technique.id).sort();
      const focusChanged = JSON.stringify(currentFocus) !== JSON.stringify(state.trainingFocus);
      if (focusChanged) { state.trainingSwitchCooldown = 1; state.trainingFocus = currentFocus; state.trainingConsistencyMonths = 0; }
      if (!techniques.length || !hasMethod) state.trainingConsistencyMonths = 0;
      const majorBreakthroughReady = hasMethod && h.cultivation >= 100 && h.stage >= 9 && h.realm < REALMS.length;
      if (hasMethod && majorBreakthroughReady) {
        h.cultivation = 100;
        state.breakthroughState.ready = true;
        state.trainingFoundation += state.trainingGoal === 'breakthrough' ? 2 : 1;
        addLog(`ความก้าวหน้าถึงจุดตัน ฝึกพื้นฐานต่อเพื่อเตรียมทะลวงขั้น (+${state.trainingFoundation})`);
      } else if (hasMethod) {
        ensureQiState(state);
        const qiCost = 4;
        const qiEfficiency = h.qi >= qiCost ? 1 : .45;
        h.qi = Math.max(0, h.qi - qiCost);
        const switchingPenalty = state.trainingSwitchCooldown ? .55 : 1;
        if (techniques.length) state.trainingConsistencyMonths = Math.min(5, state.trainingConsistencyMonths + 1);
        const discipline = disciplineBenefits(state);
        effectiveGain = Math.max(1, Math.round(gain * qiEfficiency * profile.goal.progress * profile.locationMultiplier * profile.rootMultiplier * profile.bodyFoundation.earlyTrainingMultiplier * discipline.trainingMultiplier * profile.methodMultiplier * profile.masteryMultiplier * profile.compatibility * (1 + profile.item.cultivationRate / 100) * switchingPenalty));
        if (state.pillEffect?.usesLeft > 0) { effectiveGain = Math.max(1, Math.round(effectiveGain * (1 + state.pillEffect.bonus / 100))); state.pillEffect.usesLeft--; if (!state.pillEffect.usesLeft) { addLog('ฤทธิ์โอสถปราณหมดลง'); state.pillEffect = null; } }
        h.cultivation += effectiveGain;
        state.trainingSwitchCooldown = Math.max(0, state.trainingSwitchCooldown - 1);
        techniques.forEach(technique => { state.trainingMastery[technique.id] = Math.min(120, Number(state.trainingMastery[technique.id] || 0) + Math.max(1, Math.round(profile.goal.mastery * (1 + profile.item.masteryRate / 100)))); });
        if (techniques.some(technique => techniqueSlot(technique) === 'combat')) h.martialSkill = Math.min(100, h.martialSkill + (state.trainingGoal === 'mastery' ? 2 : 1));
      }
      else {
        h.bodyFoundation = Math.min(100, h.bodyFoundation + Math.round((techniques.length ? 2 : 3) * profile.goal.body * profile.locationMultiplier));
        h.martialSkill = Math.min(100, h.martialSkill + (techniques.length ? 2 : 1));
        h.discipline = Math.min(100, h.discipline + 1);
        h.attributes.body = Math.min(126, h.attributes.body + 1);
        h.attributes.spirit = Math.min(126, h.attributes.spirit + 1);
      }
      if (hasMethod) h.discipline = Math.min(100, (h.discipline || 0) + 1);
      if (hasMethod && state.trainingGoal === 'body') h.bodyFoundation = Math.min(100, h.bodyFoundation + 1);
      h.health -= roll < clamp(.22 * profile.goal.risk * profile.bodyFoundation.injuryChanceMultiplier - profile.item.riskReduction / 100, 0, 1) ? profile.healthCost + 1 : profile.healthCost;
      if (!hasMethod && h.cultivationAccess) addLog('ต้องติดตั้งวิชาบำเพ็ญก่อนจึงจะเพิ่มความก้าวหน้าหรือเลื่อนขั้นได้');
      if (!hasMethod) {
        const manual = availableTechniqueManuals(state).find(item => item.subtype === 'cultivation');
        if (manual && state.lastCultivationManualReminder !== manual.techniqueId) {
          state.lastCultivationManualReminder = manual.techniqueId;
          const message = `การฝึกครั้งนี้ยังไม่เพิ่มความก้าวหน้าปราณ เจ้าจำได้ว่ามี “${manual.name}” อยู่ ลองเลือกกิจกรรมเรียนรู้เพื่อศึกษาคัมภีร์ แล้วติดตั้งวิชาบำเพ็ญที่เรียนสำเร็จ`;
          addLog(message, true); toast(message);
        }
      }
      if (techniques.length) {
        addLog(hasMethod ? `ฝึก${techniques.map(t => `“${t.name}”`).join(' และ ')} ใช้ปราณ 4 ความก้าวหน้าเพิ่ม ${effectiveGain}` : `ฝึก${techniques.map(t => `“${t.name}”`).join(' และ ')} พื้นฐานยุทธ์เพิ่มขึ้น แต่ยังไม่อาจโคจรปราณ`);
      } else {
        addLog(hasMethod ? `ยังไม่มีวิชาให้ฝึก จึงฝึกร่างกายทั่วไป ใช้ปราณ 4 ความก้าวหน้าเพิ่ม ${effectiveGain}` : 'ยังไม่มีวิชาหลอมกาย จึงฝึกร่างกายทั่วไป พื้นฐานกายเพิ่มขึ้น');
      }
      }
    } else if (state.activity === 'work') {
      applyWorkActivity(state);
    } else if (state.activity === 'explore') {
      if (h.ageMonths < 144) {
        h.attributes.intellect = Math.min(126, (h.attributes.intellect || 10) + 1);
        h.attributes.luck = Math.min(126, (h.attributes.luck || 10) + 1);
        h.bodyFoundation = Math.min(100, (h.bodyFoundation || 0) + 1);
        ensureInventory(state);
        state.materials.herb = Math.max(0, (state.materials.herb || 0) + 1);
        addLog('สำรวจลานหมู่บ้านและละแวกใกล้เคียง เก็บสมุนไพรพื้นบ้านและเรียนรู้สภาพแวดล้อมอย่างปลอดภัย');
      } else {
      const route = activityRoute(state, 'explore'); ensureInventory(state); ensureExplorationState(state);
      h.health -= route.health; h.money += route.money; if (h.cultivationAccess) restoreQi(state, route.qi || 0); else { h.bodyFoundation = Math.min(100, h.bodyFoundation + 1); h.discipline = Math.min(100, h.discipline + 1); }
      h.powerBonus += route.power || 0; h.reputation += route.reputation || 0; h.attributes.intellect = Math.min(126, h.attributes.intellect + 1); h.attributes.luck = Math.min(126, h.attributes.luck + (route.tier === 'secret' ? 1 : 0));
      Object.entries(route.yield || {}).forEach(([key, value]) => key === 'money' || key === 'reputation' || key === 'qi' ? null : state.materials[key] = Math.max(0, (state.materials[key] || 0) + value));
      const area = EXPLORATION_AREA_DEFS[route.areaId]; const exposure = Number.isFinite(state.testExplorationRoll) ? state.testExplorationRoll : Math.random() * 100;
      const enemyChance = route.tier === 'danger' ? route.risk + 12 : route.tier === 'secret' ? route.risk + 8 : Math.max(2, route.risk - 5);
      let outcome = 'resource';
      if (exposure < enemyChance) {
        outcome = 'enemy';
        const protectedByCoating = (state.poisonCoating?.usesLeft || 0) > 0;
        const damage = Math.max(0, (route.tier === 'danger' ? 12 : 7) - (protectedByCoating ? 6 : 0));
        h.health -= damage; state.flags.explorationEnemySeen = true; state.relations.enemy += 1;
        if (protectedByCoating) { state.poisonCoating = null; addLog('ยาสลบช่วยเปิดทางถอย ลดการบาดเจ็บ 6 จุดและหมดฤทธิ์', true); }
        if (route.areaId === 'serpent_tunnel' && !protectedByCoating) { state.conditions = state.conditions || {}; state.conditions.poison = { monthsLeft: 3, damage: 3, appliedMonth: state.month }; addLog('ถูกพิษในอุโมงค์งูดำ เสียสุขภาพ 3 จุดต่อเดือนอีก 3 เดือน ใช้ยาแก้พิษเพื่อรักษา', true); }
        addLog(`พบศัตรูใน${area.name} ต้องถอยพร้อมบาดแผล ${damage} จุด`, true);
      }
      else if (exposure > route.findChance) { outcome = 'lost'; h.money = Math.max(0, h.money - 2); h.health -= 2; state.paths.freedom += 1; addLog(`หลงทางใน${area.name} เสียเวลาและเสบียงก่อนหาทางกลับ`); }
      else { if (!state.exploration.discoveredAreas.includes(route.areaId)) state.exploration.discoveredAreas.push(route.areaId); state.exploration.visited[route.areaId] = (state.exploration.visited[route.areaId] || 0) + 1; addLog(`${route.log} (${route.tier === 'secret' ? 'พื้นที่ลับ' : route.tier === 'danger' ? 'พื้นที่อันตราย' : 'พื้นที่ปลอดภัย'})`, route.tier === 'secret'); }
      if (outcome === 'resource') gatherSpecialMaterials(state, route.areaId);
      if (route.secret === 'moonwell') { state.flags.moonwellFound = true; state.exploration.news.push('บ่อน้ำจันทร์มีเส้นทางต่อไปใต้ภูเขา'); }
      if (route.secret === 'serpent_tunnel') { state.flags.serpentTunnelFound = true; state.flags.knowsTraitor = true; state.exploration.news.push('อุโมงค์งูดำเชื่อมกับคลังเสบียงของศัตรู'); }
      state.exploration.lastOutcome = { month: state.month, area: route.areaId, outcome };
      }
    } else if (state.activity === 'study') {
      const route = activityRoute(state, 'study'); const learning = ensureLearningState(state); const type = chooseLearningType(state); const typeDef = LEARNING_TYPES[type]; const focus = chooseLearningTechnique(state, type); const learned = applyLearningProgress(state, type, route, route.teacher);
      h.attributes.intellect = Math.min(126, h.attributes.intellect + (typeDef.stat === 'intellect' ? 2 : 1)); h.attributes.spirit = Math.min(126, h.attributes.spirit + (typeDef.stat === 'spirit' ? 2 : 1)); h.discipline = Math.min(100, h.discipline + 2); state.paths[ typeDef.path ] += route.insight;
      learning.months += 1; learning.lastLocation = learningLocationKey(state);
      const manualStudy = studySelectedManual(state, route);
      if (focus) {
        const techniqueGain = Math.max(1, Math.round(route.knowledgeGain * route.teacher.multiplier));
        learning.techniqueKnowledge[focus.id] = Math.min(100, Number(learning.techniqueKnowledge[focus.id] || 0) + techniqueGain);
        learning.lastTechnique = focus.id;
      }
      if (manualStudy && !manualStudy.complete) addLog(`อ่านคัมภีร์ “${manualStudy.technique.name}” ความเข้าใจ ${formatManualProgress(manualStudy.progress)}/${manualStudy.target}`);
      addLog(`${route.log} เรียน${typeDef.name} +${learned}${route.teacher.id !== 'self' ? ` จาก${route.teacher.name}` : ''}${focus ? ` ความรู้วิชา “${focus.name}” เพิ่มขึ้น ${Math.max(1, Math.round(route.knowledgeGain * route.teacher.multiplier))}` : ''} ปัญญาและจิตใจเพิ่มขึ้น`);
    } else if (state.activity === 'social') {
      if (h.ageMonths < 60) {
        h.attributes.charm = Math.min(126, (h.attributes.charm || 10) + 1);
        state.relations.friend = clamp((state.relations.friend || 0) + 2, -100, 100);
        state.relations.acquaintance = clamp((state.relations.acquaintance || 0) + 1, -100, 100);
        state.paths.compassion += 1;
        addLog('วิ่งเล่นกับเด็ก ๆ ในละแวกบ้าน ผูกมิตรภาพวัยเยาว์และเรียนรู้การอยู่ร่วมกับผู้อื่น');
      } else {
      const route = activityRoute(state, 'social'); const social = ensureSocialState(state); ensureRelationshipState(state); const compatibility = relationshipCompatibility(state, route.relation); const relationGain = 1 + Math.floor(compatibility / 50); h.money = Math.max(0, h.money - route.cost); h.attributes.charm = Math.min(126, h.attributes.charm + 1 + (compatibility >= 60 ? 1 : 0)); h.reputation += route.reputation; state.relations[route.relation] = clamp((state.relations[route.relation] || 0) + relationGain, -100, 100); state.relations.acquaintance = clamp((state.relations.acquaintance || 0) + 1, -100, 100); state.paths.compassion += 1; social.lastTarget = route.key; h.health -= route.cost ? 1 : 0; addLog(`${route.log} ความสัมพันธ์กับ${route.group}เพิ่มขึ้น ${relationGain} (เข้ากันได้ ${compatibility}%)`);
      state.materialLife = state.materialLife || {};
      if (Math.max(state.relations.friend || 0, state.relations.companion || 0, state.relations.acquaintance || 0) >= 15 && state.month - (state.materialLife.lastGiftMonth ?? -99) >= 12) {
        addGradedMaterial(state, 'herb', 'uncommon'); state.materialLife.lastGiftMonth = state.month;
        addLog('ผู้คนที่ไว้วางใจมอบสมุนไพรชั้นดีเป็นน้ำใจ');
      }
      }
    } else if (state.activity === 'craft') {
      const route = activityRoute(state, 'craft'); ensureInventory(state); ensureCraftingState(state);
      if (state.lastCraftMonth === state.month) {
        h.attributes.intellect = Math.min(126, h.attributes.intellect + 1);
        h.discipline = Math.min(100, h.discipline + 1);
        addLog(`${route.log} สำเร็จการสร้างหรือศึกษาของเดือนนี้แล้ว เพิ่มปัญญาและวินัย`);
      } else {
        const target = state.crafting.target;
        state.crafting.target = null;
        if (target?.type === 'recipe') {
          executeCraft(state, target.recipeId);
        } else if (target?.type === 'study') {
          executeStudyCraft(state, target.knowledge);
        } else if (state.crafting.auto && state.crafting.auto.enabled) {
          const selected = state.crafting.auto.recipeId ? RECIPES.find(item => item.id === state.crafting.auto.recipeId) : null;
          const auto = state.crafting.auto.mode || 'fallback';
          const selectedReady = selected && canCraft(state, selected);
          const recipe = selectedReady ? selected : auto === 'fallback' ? RECIPES.find(item => canCraft(state, item)) : null;
          if (auto === 'learn' && (!selectedReady || !recipe)) {
            if (selected?.knowledge) state.crafting.knowledge[selected.knowledge] = Math.min(5, (state.crafting.knowledge[selected.knowledge] || 0) + 1);
            h.attributes.intellect = Math.min(126, h.attributes.intellect + 1);
            h.discipline = Math.min(100, h.discipline + 1);
            addLog(`${route.log} ฝึกความรู้${selected?.kind || 'ช่าง'}แทนการสร้างของ`);
          } else if (recipe) {
            executeCraft(state, recipe.id);
          } else {
            h.attributes.intellect = Math.min(126, h.attributes.intellect + 1);
            h.discipline = Math.min(100, h.discipline + 1);
            addLog(`${route.log} วัตถุดิบสำหรับระบบอัตโนมัติไม่เพียงพอ จึงฝึกฝนพื้นฐานช่างทั่วไป`);
          }
        } else {
          h.attributes.intellect = Math.min(126, h.attributes.intellect + 1);
          h.discipline = Math.min(100, h.discipline + 1);
          addLog(`${route.log} ยังไม่ได้ตั้งเป้าหมายสูตร จึงฝึกฝนพื้นฐานช่างทั่วไป (เพิ่มปัญญาและวินัย)`);
        }
      }
    } else if (state.activity === 'family') {
      if (h.ageMonths < 24) {
        const heal = 8;
        h.health = Math.min(h.maxHealth, h.health + heal);
        h.attributes.spirit = Math.min(126, (h.attributes.spirit || 10) + 1);
        state.relations.parents = clamp((state.relations.parents || 0) + 2, -100, 100);
        state.paths.compassion += 1;
        addLog('ได้รับการโอบอุ้มและดูแลอย่างอบอุ่นจากครอบครัว ร่างกายแข็งแรงและจิตใจสงบสุข');
      } else if (h.ageMonths < 60) {
        const heal = 5;
        h.health = Math.min(h.maxHealth, h.health + heal);
        h.attributes.charm = Math.min(126, (h.attributes.charm || 10) + 1);
        state.relations.parents = clamp((state.relations.parents || 0) + 1, -100, 100);
        state.relations.relatives = clamp((state.relations.relatives || 0) + 1, -100, 100);
        state.paths.compassion += 1;
        addLog('อยู่พร้อมหน้ากับคนในเรือน ช่วยเหลืองานเล็ก ๆ น้อย ๆ และผูกพันกับครอบครัว');
      } else {
      const route = activityRoute(state, 'family'); ensureFamilyState(state); ensureRelationshipState(state); state.lineageState = state.lineageState || { generation: 0, treasury: 0, prestige: 0, stage: 0, heirCount: 0 }; if (state.family.spouse) state.family.spouse.affection = clamp(state.family.spouse.affection + 3, 0, 100); if (state.family.children.length) state.family.children.forEach(child => { child.milestones = Array.isArray(child.milestones) ? child.milestones : []; child.milestones.push(`เดือน-${state.month}`); }); state.relations.parents += 1; state.relations.relatives += 1; state.lineageState.prestige += state.family.children.length ? 2 : 1; state.paths.compassion += 2; addLog(`${route.log} ความผูกพันและรากฐานตระกูลเพิ่มขึ้น`);
      }
    } else if (state.activity === 'quest') {
      const route = activityRoute(state, 'quest'); addAvailableQuests(state); const quests = ensureQuestState(state); const tracked = quests.active.find(item => item.id === quests.trackedId) || quests.active[0]; if (tracked) { tracked.progress = Math.min(99, (tracked.progress || 0) + 8); state.paths.duty += 1; h.reputation += 2; addLog(`${route.log} เดินหน้าภารกิจ “${QUEST_DEFS.find(item => item.id === tracked.id)?.title || tracked.id}”`); } else { h.attributes.intellect = Math.min(126, h.attributes.intellect + 1); h.reputation += 1; addLog(`${route.log} แต่ยังไม่มีภารกิจที่เหมาะสม จึงรวบรวมข่าวสารแทน`); }
    } else if (state.activity === 'sect') {
      const route = activityRoute(state, 'sect'); if (state.flags.metSect) { const career = ensureSectCareer(state); career.merit += 3; h.reputation += 2; state.paths.duty += 1; addLog(`${route.log} แต้มผลงานสำนักเพิ่ม 3 และชื่อเสียงเพิ่มขึ้น`); } else { h.attributes.intellect = Math.min(126, h.attributes.intellect + 1); h.attributes.charm = Math.min(126, h.attributes.charm + 1); state.paths.duty += 1; addLog(`${route.log} ยังไม่มีสังกัด จึงสร้างชื่อกับผู้คนในเมืองก่อน`); }
    } else if (state.activity === 'travel') {
      const route = activityRoute(state, 'travel');
      if (travelHandled) {
        // การเดินทางถูกประมวลผลแล้วใน advanceTravel ห้ามหักซ้ำ
      } else {
        addLog(`${route.log} พักรอจัดเตรียมสัมภาระหรือรอเส้นทางเปิด`);
      }
    } else if (state.activity === 'free') {
      const route = activityRoute(state, 'free'); const profile = { wealthy: h.money >= 25, healthy: h.health >= h.maxHealth * .75, social: h.attributes.charm >= 14, curious: h.attributes.intellect >= 14 || h.talent === 'keen', mobile: state.locations?.current === 'inn' || state.locations?.current === 'roadside' };
      h.attributes.luck = Math.min(126, h.attributes.luck + (profile.curious ? 1 : 0));
      if (profile.wealthy && profile.social) { h.reputation += 2; state.relations.acquaintance += 2; state.paths.compassion += 1; addLog(`${route.log} ใช้ฐานะและมนุษยสัมพันธ์เปิดทางให้พบผู้คนสำคัญ`); }
      else if (!profile.healthy) { h.health = Math.min(h.maxHealth, h.health + (state.locations?.current === 'owned' ? 8 : 4)); addLog(`${route.log} เลือกหยุดพักตามกำลังที่เหลือ`); }
      else if (profile.curious && profile.mobile) { ensureInventory(state); state.materials.herb += 1; state.paths.insight += 1; addLog(`${route.log} เดินทางสำรวจและเก็บข่าวสารกับวัตถุดิบเล็กน้อย`); }
      else { h.money += profile.wealthy ? 2 : 4; state.relations.acquaintance += 1; state.paths.freedom += 1; addLog(`${route.log} พบโอกาสเล็ก ๆ ที่เหมาะกับทรัพยากรของตน`); }
    } else {
      if (h.ageMonths < 24) {
        const heal = 12;
        h.health = Math.min(h.maxHealth, h.health + heal);
        h.bodyFoundation = Math.min(100, (h.bodyFoundation || 0) + 1);
        h.attributes.spirit = Math.min(126, (h.attributes.spirit || 10) + 1);
        addLog('กินอิ่มนอนหลับ ร่างกายทารกเติบโตอย่างมั่นคง ฟื้นสุขภาพและสั่งสมรากฐานชีวิต');
      } else {
      const route = activityRoute(state, 'rest'); const heal = route.heal + (h.talent === 'steady' ? 6 : 0); h.health = Math.min(h.maxHealth, h.health + heal); if (h.cultivationAccess) restoreQi(state, route.qi || 0); else h.discipline = Math.min(100, h.discipline + 1); h.attributes.spirit = Math.min(126, h.attributes.spirit + 1); addLog(`${route.log} ฟื้นสุขภาพ ${heal} จุด${h.cultivationAccess ? ` และปราณ ${route.qi || 0}` : ''}`);
      }
    }
    if (state.activity === 'rest') {
      const household = ensureHousehold(state);
      household.workFatigue = Math.max(0, household.workFatigue - 2);
      household.workRisk = Math.max(0, household.workRisk - 1);
    }
    updateLineageState(state);
    if (state.ending) return false;
    resolveCultivationProgress(state);
    if (state.autoMode && state.activity === 'train' && cultivationAtCeiling(state)) { state.autoMode = false; addLog('หยุดฝึกอัตโนมัติ: วิชาบำเพ็ญถึงเพดานแล้ว ต้องเปลี่ยนวิชา', true); }
    h.health = clamp(h.health, 0, h.maxHealth);

    ensureLifespanState(state);
    if (h.ageMonths >= h.lifespanMonths) {
      endGame('death', { cause: `อายุขัยสิ้นสุดลงหลังผ่านการ${ACTIVITY[state.activity].name}และการเดินทาง` });
      return false;
    }

    const poison = state.conditions?.poison;
    if (poison?.monthsLeft > 0 && poison.appliedMonth < state.month) {
      h.health = Math.max(0, h.health - (Number(poison.damage) || 3)); poison.monthsLeft--;
      addLog(`พิษกำเริบ สุขภาพลด ${Number(poison.damage) || 3} จุด · เหลือ ${poison.monthsLeft} เดือน`, true);
      if (!poison.monthsLeft) { state.conditions.poison = null; addLog('พิษจางลงแล้ว'); }
    }
    // ตรวจสอบความตายจากสุขภาพหมด
    if (h.health <= 0) {
      if (h.ageMonths < 24) {
        endGame('death_early', { cause: 'ความเปราะบางของร่างกายในวัยทารก ไม่อาจต้านทานความเจ็บไข้ ดับลมหายใจตั้งแต่ยังไม่ทันเติบใหญ่' });
      } else if (h.ageMonths < 84) {
        const earlyText = state.mode === 'story' && state.characterId === 'lin-an'
          ? 'ความหนาวเหน็บและความหิวโหยในวัยเด็ก พรากชีวิตไปก่อนจะได้รู้จักยุทธภพและเสียงระฆังสำนัก'
          : 'ความเจ็บป่วยและภยันตรายในวัยเด็ก ดับลมหายใจผู้เยาว์ก่อนจะได้ออกท่องยุทธภพ';
        endGame('death_early', { cause: earlyText });
      } else if (h.ageMonths < 180) {
        endGame('death_early', { cause: 'บาดแผลและการตรากตรำเกินกำลังของวัยเยาว์ พรากชีวิตไปก่อนจะเติบโตเป็นยอดคน' });
      } else {
        endGame('death', { cause: `ร่างกายทรุดโทรมจากการ${ACTIVITY[state.activity]?.name || 'ตรากตรำ'}ต่อเนื่องโดยไม่พักฟื้น จนสิ้นลมหายใจ` });
      }
      return false;
    }

    if (needsTrainingHealthWarning(state)) { triggerEvent('training-health-warning', trainingHealthWarning()); return false; }

    // Ambient memories stay location-neutral; the existing activity and location
    // UI supplies the current setting without inventing a home, companion or sect.
    const journalPhase = annualLifePhase(state);
    addLog(`${journalPhase.name} — ${selectLifeJournalScene(state, journalPhase)}`);

    const scriptedEvents = state.mode !== 'story' ? [] : state.characterId === 'lin-an'
      ? Object.entries(state.flags?.linAnRoute ? ALTERNATE_ROUTE_EVENTS : EVENTS)
      : Object.entries(STORY_CHARACTER_EVENTS).filter(([, event]) => event.characterId === state.characterId);
    const scripted = scriptedEvents.sort((a, b) => a[1].month - b[1].month).find(([id, e]) => e.month <= state.month && !state.eventHistory.includes(id) && (!e.route || e.route === state.flags?.linAnRoute) && (!e.requires || e.requires(state)));
    if (scripted) { triggerEvent(scripted[0], scripted[1]); return false; }

    if (!(state.mode === 'story' && state.characterId === 'lin-an')) {
      const activeWorldEvent = WORLD_EVENTS.find(event => event.intervention && worldEventStatus(event, state.world.worldMonth) === 'active' && worldRegion(state) === event.region && !state.world.events[event.id]);
      if (activeWorldEvent) {
        const intervention = worldEventIntervention(state, activeWorldEvent);
        if (intervention) {
          if (state.locations?.longRest) {
            state.locations.longRest = null;
            addLog('วิกฤตการณ์ครั้งใหญ่ของยุทธภพเกิดขึ้น ทำให้การพักยาวต้องยุติลงทันที', true);
          }
          state.lastRandomMonth = state.month;
          triggerEvent(intervention.id, intervention);
          return false;
        }
      }
    }

    const restRisk = state.activity === 'rest' && Math.random() > restRoute(state).safety / 100 && !state.locations.longRest;
    if (restRisk) {
      const riskEvent = getEventPool(state).find(event => event.risk);
      if (riskEvent) { state.lastRandomMonth = state.month; triggerEvent(riskEvent.id, riskEvent); return false; }
    }
    if (longRestTick) {
      state.locations.longRest.monthsLeft--;
      if (state.locations.longRest.monthsLeft <= 0) { state.locations.longRest = null; addLog('พักยาวครบกำหนด กลับมาเลือกกิจกรรมได้แล้ว', true); }
      updateWorldCopy(); saveGame(); render(); return true;
    }

    ensureTrainingState(state);
    if (state.breakthroughState.ready && equippedCultivationTechnique(state) && !cultivationAtCeiling(state) && state.month >= state.breakthroughState.nextPromptMonth && state.activity === 'train') {
      if (state.autoMode && state.autoTrainingRule === 'auto-foundation') { state.trainingFoundation += 8; state.breakthroughState.nextPromptMonth = state.month + 2; addLog('Auto ฝึกพื้นฐานต่อแทนการทะลวงขั้น ความมั่นคงเพิ่มขึ้น'); updateWorldCopy(); saveGame(); render(); return true; }
      if (state.autoMode && state.autoTrainingRule === 'auto-item' && breakthroughItem(state)) { attemptBreakthrough(state, 'item'); updateWorldCopy(); saveGame(); render(); return true; }
      const event = breakthroughEvent(state); state.lastRandomMonth = state.month; triggerEvent(event.id, event); return false;
    }

    const randomReady = state.month - (state.lastRandomMonth ?? -99) >= 2;
    const candidates = randomReady ? getEventPool(state).filter(e => !(e.generated && e.rarity === 'normal' && e.dialogueOnly)) : [];
    const bondReady = candidates.filter(e => e.id.endsWith('_bond'));
    const freeLifeReady = state.activity === 'free' && candidates.some(e => e.freeLife);
    if (candidates.length && (bondReady.length > 0 || freeLifeReady || Math.random() < .30)) {
      const freeLifeCandidates = freeLifeReady ? candidates.filter(e => e.freeLife) : [];
      const e = pickChoiceEvent(bondReady.length ? bondReady : (freeLifeCandidates.length ? freeLifeCandidates : candidates), state); state.lastRandomMonth = state.month;
      if (state.autoMode && state.activity === 'free' && ensureAutoFreeRule(state).enabled) {
        const isCritical = e.milestone || e.story || e.importance === 'major' || e.rarity === 'legendary' || e.rarity === 'epic';
        if (!isCritical) {
          const rule = ensureAutoFreeRule(state);
          const healthyEnough = state.hero.maxHealth ? state.hero.health / state.hero.maxHealth >= .55 : true;
          const choiceIndex = rule.policy === 'risk' ? Math.max(0, e.choices.length - 1) : rule.policy === 'balanced' && healthyEnough ? Math.min(1, e.choices.length - 1) : 0;
          const availableIndex = isChoiceAvailable(e.choices[choiceIndex], state) ? choiceIndex : e.choices.findIndex(choice => isChoiceAvailable(choice, state));
          if (availableIndex >= 0) {
            chooseEvent(e.id, e, e.choices[availableIndex], availableIndex);
            updateWorldCopy(); saveGame(); render();
            return !state.ending;
          }
        }
      }
      triggerEvent(e.id, e); return false;
    }
    updateWorldCopy(); saveGame(); render(); return true;
  }

  function visibleChoiceNote(note) {
    return String(note || '')
      .replace(/ต้องมีความหยั่งรู้\s*\d+\s*หรือศิษย์พี่ไว้วางใจ/g, 'ต้องมีประสบการณ์สืบข่าวหรือศิษย์พี่ไว้วางใจ')
      .replace(/ความหยั่งรู้หรือความสัมพันธ์มีผล/g, 'ประสบการณ์สืบข่าวหรือความสัมพันธ์มีผล')
      .replace(/หรือแนวทางอิสระอย่างน้อย\s*\d+/g, 'หรือมีประสบการณ์เอาตัวรอด')
      .replace(/แนวทาง(?:จากการเลือก)?:\s*(?:(?:เมตตา|ภักดี|อิสระ|หยั่งรู้)\s*[+-]\d+\s*[,·]?\s*)+/g, '')
      .replace(/(?:เพิ่ม|ได้|สูงสุด|สูง|ความ|แนวทาง)(?:ความ)?(?:เมตตา|ภักดี|อิสระ|หยั่งรู้)(?:\s*[+-]\d+|เล็กน้อย|อย่างน้อย\s*\d+)?/g, '')
      .replace(/(?:เมตตา|ภักดี|อิสระ|หยั่งรู้)\s*[+-]\d+/g, '')
      .replace(/(?:เมตตา|ภักดี|อิสระ|หยั่งรู้)(?:สูงสุด|สูง)/g, '')
      .replace(/^\s*(?:และ|แต่)\s*/, '')
      .replace(/(?:^|\s*[·,]\s*)\s*(?=\s*[·,]|$)/g, '').trim();
  }

  // Show the player's current values alongside the requirements already
  // presented by an event; these are context, not a new availability check.
  function choiceDecisionContext(s, choice, eventId) {
    const combat = syncCombat(s), h = s.hero || {}, values = [];
    const note = `${choice.text || ''} ${choice.note || ''} ${choice.locked || ''} ${typeof choice.dynamicNote === 'function' ? choice.dynamicNote(s) : ''}`;
    const requirementSource = typeof choice.requires === 'function' ? String(choice.requires) : '';
    const source = [choice.requires, choice.effect].filter(fn => typeof fn === 'function').map(fn => String(fn)).join(' ');
    const add = (label, value) => { if (value != null && !values.some(v => v.startsWith(`${label} `))) values.push(`${label} ${value}`); };
    const mentions = (words, pattern) => words.test(note) || pattern.test(source);
    if (mentions(/พลัง(?:รวม)?/, /\b(?:s|state)\.hero\??\.power\s*(?:[<>]=?|===?)/)) add('พลัง', Math.round(h.power || 0).toLocaleString());
    if (mentions(/สุขภาพ|บาดเจ็บ/, /\b(?:s|state)\.hero\??\.health\s*(?:[<>]=?|===?)/)) add('สุขภาพ', `${Math.round(h.health || 0)}/${h.maxHealth}`);
    if (mentions(/ปราณ/, /\b(?:s|state)\.hero\??\.qi\s*(?:[<>]=?|===?)/)) add('ปราณ', Math.round(h.qi || 0));
    if (mentions(/ตำลึง|เงิน/, /\b(?:s|state)\.hero\??\.money\s*(?:[<>]=?|===?)/)) add('เงิน', `${Math.round(h.money || 0)} ตำลึง`);
    if (mentions(/ว่องไว/, /\bcombat\.agility\s*(?:[<>]=?|===?)/)) add('ว่องไว', combat.agility);
    if (mentions(/กายา/, /\bcombat\.body\s*(?:[<>]=?|===?)/)) add('กายา', combat.body);
    if (mentions(/ชื่อเสียง/, /\b(?:s|state)\.hero\??\.reputation\s*(?:[<>]=?|===?)/)) add('ชื่อเสียง', h.reputation || 0);
    const pathLabels = { compassion: 'เมตตา', duty: 'ภักดี', freedom: 'อิสระ', insight: 'หยั่งรู้' };
    for (const [key, label] of Object.entries(pathLabels)) if (note.includes(label) || new RegExp(`\\.paths\\??\\.${key}\\b`).test(requirementSource)) add(label, s.paths?.[key] || 0);
    for (const [key, def] of Object.entries(RELATIONSHIP_DEFS)) if (new RegExp(`\\.relations\\??\\.${key}\\b`).test(requirementSource)) add(`ความสัมพันธ์${def.name || key}`, s.relations?.[key] || 0);
    for (const [key, label] of Object.entries({ sect: 'สำนัก', serpent: 'งูดำ', jianghu: 'ยุทธภพ' })) if (new RegExp(`\\.factions\\??\\.${key}\\b`).test(requirementSource) || note.includes(`ชื่อเสียง${label}`)) add(`ชื่อเสียง${label}`, s.factions?.[key] || 0);
    for (const [key, label] of Object.entries(ATTRIBUTE_LABELS)) if (new RegExp(`\\.attributes\\??\\.${key}\\b`).test(requirementSource)) add(label, combat.attributes?.[key] || 0);
    for (const [key, label] of Object.entries({ foundMap: 'แผนที่', escapePrepared: 'เสบียงหรือทางหนี', stepLearned: 'วิชาย่างก้าว', metSect: 'รู้จักสำนัก', warnedMaster: 'เตือนอาจารย์แล้ว', knowsTraitor: 'เบาะแสคนทรยศ', betrayedSect: 'เข้าร่วมงูดำ' })) if (new RegExp(`\\.flags\\??\\.${key}\\b`).test(requirementSource)) add(label, s.flags?.[key] ? 'มี' : 'ไม่มี');
    for (const [key, label] of Object.entries(MATERIAL_NAMES)) if (note.includes(label) || source.includes(`materials.${key}`) || source.includes(`materials?.${key}`)) add(label, s.materials?.[key] || 0);
    if (choice.check) {
      const stat = choice.check.stat || 'luck', base = Number(combat.attributes?.[stat] || 0);
      const karma = Math.max(-8, Math.min(8, Math.floor((combat.karma || 0) / 10)));
      add(ATTRIBUTE_LABELS[stat] || stat, `${base} · กรรม ${karma >= 0 ? '+' : ''}${karma} · ทอย 1–20`);
    }
    const visit = condition => {
      if (!condition || typeof condition !== 'object') return;
      for (const key of ['all', 'any']) (condition[key] || []).forEach(visit);
      if (condition.not) visit(condition.not);
      const named = { 'hero.power': 'พลัง', 'hero.health': 'สุขภาพ', 'hero.qi': 'ปราณ', 'hero.money': 'เงิน', 'hero.reputation': 'ชื่อเสียง' };
      if (condition.statMin) {
        const path = condition.statMin.path, relation = path.startsWith('relations.') ? path.slice(10) : null, attribute = path.startsWith('hero.attributes.') ? path.slice(16) : null;
        add(named[path] || (relation ? `ความสัมพันธ์${RELATIONSHIP_DEFS[relation]?.name || relation}` : attribute ? ATTRIBUTE_LABELS[attribute] || attribute : path), `${Number(readStatePath(s, path) || 0)} / ต้องมี ${condition.statMin.value}`);
      }
      if (condition.relationMin) add(`ความสัมพันธ์${RELATIONSHIP_DEFS[condition.relationMin.key]?.name || condition.relationMin.key}`, `${s.relations?.[condition.relationMin.key] || 0} / ต้องมี ${condition.relationMin.value}`);
      if (condition.factionMin) add(`ชื่อเสียงฝ่าย ${condition.factionMin.key}`, `${s.factions?.[condition.factionMin.key] || 0} / ต้องมี ${condition.factionMin.value}`);
      if (condition.pathMin) add(pathLabels[condition.pathMin.key] || condition.pathMin.key, `${s.paths?.[condition.pathMin.key] || 0} / ต้องมี ${condition.pathMin.value}`);
      if (condition.flag) add('เงื่อนไขเนื้อเรื่อง', evaluateCondition(s, { flag: condition.flag }) ? 'ผ่าน' : 'ยังไม่ผ่าน');
    };
    visit(choice.conditions);
    if (String(eventId).startsWith('breakthrough-')) { add('สุขภาพ', `${Math.round(h.health || 0)}/${h.maxHealth}`); add('ปราณ', Math.round(h.qi || 0)); }
    if (eventId === 'ambush' && /ถอย/.test(choice.text || '')) {
      add('แผนที่', s.flags?.foundMap ? 'มี' : 'ไม่มี');
      add('วิชาย่างก้าว', s.flags?.stepLearned ? 'มี' : 'ไม่มี');
      add('ของแทนใจสหาย', s.flags?.friendKeepsake ? 'มี' : 'ไม่มี');
      add('ดวงตาเฉียบคม', h.talent === 'keen' ? 'มี' : 'ไม่มี');
    }
    if (eventId === 'siege') {
      if (/หนี|อุโมงค์/.test(choice.text || '')) {
        add('เส้นทาง', s.flags?.foundMap || s.flags?.stepLearned || s.flags?.escapePrepared || h.talent === 'swift' ? 'พร้อม' : 'ยังไม่พร้อม');
        if (/ผู้คน/.test(choice.text || '')) add('แผนที่หรือเสบียง', s.flags?.foundMap || s.flags?.escapePrepared ? 'มี' : 'ไม่มี');
        add('เมตตา', s.paths?.compassion || 0);
      }
    }
    if (choice.requires || choice.conditions) add('เงื่อนไขตัวเลือก', isChoiceAvailable(choice, s) ? 'ผ่าน' : 'ยังไม่ผ่าน');
    return values.length ? `ค่าปัจจุบัน: ${values.join(' · ')}` : '';
  }

  function triggerEvent(id, event) {
    if (String(id).startsWith('breakthrough-') && cultivationAtCeiling(state)) {
      state.pendingEvent = null; state.paused = false;
      const modal = $('event-modal'); if (modal) modal.hidden = true;
      addLog(`วิชาบำเพ็ญที่ติดตั้งถึงเพดานแล้ว ต้องเปลี่ยนวิชาก่อนทะลวง`, true);
      saveGame(); render(); return false;
    }
    if (event && !eventScopeAllowed(state, event, id)) {
      state.pendingEvent = null; state.paused = false;
      const modal = $('event-modal'); if (modal) modal.hidden = true;
      saveGame(); render(); toast('ข้ามเหตุการณ์ที่ไม่ตรงกับตัวละครหรือสถานการณ์ปัจจุบัน');
      return false;
    }
    if (!event || !Array.isArray(event.choices)) {
      state.pendingEvent = null;
      state.paused = false;
      saveGame();
      toast('เหตุการณ์ในบันทึกไม่รองรับ ระบบข้ามเหตุการณ์นี้แล้ว');
      return false;
    }
    state.pendingEvent = id; state.paused = true; render();
    const eventRarity = event.rarity ? EVENT_RARITIES[event.rarity === 'rare' ? 'extraordinary' : event.rarity] : null;
    const eventTag = $('event-tag');
    if (eventTag) {
      eventTag.textContent = event.rarity ? `${rarityLabel(event.rarity)} · ${event.tag || 'เหตุการณ์ระหว่างทาง'}` : (event.tag || 'เหตุการณ์ระหว่างทาง');
      if (eventTag.style) {
        eventTag.style.color = eventRarity?.color || '';
        eventTag.style.backgroundColor = eventRarity ? 'rgba(20,20,15,.86)' : '';
        eventTag.style.border = eventRarity ? `1px solid ${eventRarity.color}` : '';
      }
    }
    const eventKicker = $('event-kicker'), eventTitle = $('event-title'), eventText = $('event-text'), eventArt = $('event-art');
    if (eventKicker) eventKicker.textContent = `เดือนที่ ${Math.max(1, state.month)} · ${currentLocation()}`;
    if (eventTitle) { eventTitle.textContent = event.title; if (eventTitle.style) eventTitle.style.color = eventRarity?.color || ''; }
    if (eventText) eventText.textContent = typeof event.dynamicText === 'function' ? event.dynamicText(state) : typeof event.text === 'function' ? event.text(state) : event.text;
    if (eventArt) eventArt.className = `event-art art-${event.art || id}`;
    const wrap = $('event-choices'); wrap.innerHTML = '';
    if (typeof document.createElement !== 'function') { saveGame(); return true; }
    event.choices.forEach((choice, i) => {
      const available = isChoiceAvailable(choice, state);
      const btn = document.createElement('button'); btn.className = 'choice-btn'; btn.disabled = !available; if (btn.setAttribute) btn.setAttribute('aria-label', `${i + 1}. ${choice.text || 'ตัวเลือกเหตุการณ์'}`);
      const description = String((typeof choice.dynamicNote === 'function' ? choice.dynamicNote(state) : choice.note) || '').trim();
      const note = [description, !available ? String(choice.locked || 'ยังทำไม่ได้') : '', choice.check ? `ทดสอบ: ${checkLabel(choice.check)}` : '', choiceDecisionContext(state, choice, id)].filter(Boolean).join(' · ');
      const text = typeof choice.dynamicText === 'function' ? choice.dynamicText(state) : choice.text;
      btn.innerHTML = `<span class="choice-index">${i + 1}</span><span>${text}</span>${note ? `<small>${note}</small>` : ''}`;
      btn.onclick = () => chooseEvent(id, event, choice, i, text);
      wrap.appendChild(btn);
    });
    const eventModal = $('event-modal'); if (eventModal) eventModal.hidden = false; const firstChoice = wrap.querySelector ? wrap.querySelector('button:not([disabled])') : null; if (firstChoice?.focus) firstChoice.focus(); saveGame();
    return true;
  }

  function eventOutcomeSnapshot(s) {
    const groups = {
      hero: ['health', 'money', 'reputation', 'karma', 'cultivation', 'bodyFoundation', 'qi', 'powerBonus'],
      'hero.attributes': ['body', 'intellect', 'spirit', 'charm', 'luck'],
      paths: ['compassion', 'duty', 'freedom', 'insight'],
      relations: Object.keys(s.relations || {}),
      materials: Object.keys(s.materials || {}),
      factions: Object.keys(s.factions || {}),
      ...Object.fromEntries(Object.entries(s.gradedMaterials || {}).map(([key, grades]) => [`gradedMaterials.${key}`, Object.keys(grades)]))
    };
    const snapshot = {};
    Object.entries(groups).forEach(([group, keys]) => keys.forEach(key => {
      const path = `${group}.${key}`;
      const value = readStatePath(s, path);
      if (typeof value === 'number' && Number.isFinite(value)) snapshot[path] = value;
    }));
    return snapshot;
  }

  function formatEventOutcome(before, after) {
    const labels = {
      'hero.health': 'สุขภาพ', 'hero.money': 'เงิน', 'hero.reputation': 'ชื่อเสียง',
      'hero.karma': 'กรรม', 'hero.cultivation': 'ฝึกตน', 'hero.bodyFoundation': 'รากฐานกาย',
      'hero.qi': 'ปราณ', 'hero.powerBonus': 'พลังเสริม',
      'hero.attributes.body': 'พละกำลัง', 'hero.attributes.intellect': 'ปัญญา',
      'hero.attributes.spirit': 'จิตใจ', 'hero.attributes.charm': 'เสน่ห์', 'hero.attributes.luck': 'โชค',
      'paths.compassion': 'เมตตา', 'paths.duty': 'ภักดี', 'paths.freedom': 'อิสระ', 'paths.insight': 'หยั่งรู้'
    };
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(path => {
      const delta = (after[path] || 0) - (before[path] || 0);
      if (path.startsWith('paths.') || Math.abs(delta) < 0.000001) return [];
      const key = path.split('.').pop();
      const label = labels[path] || (path.startsWith('gradedMaterials.') ? `${MATERIAL_NAMES[path.split('.')[1]] || path.split('.')[1]} ${ITEM_GRADES[key]?.name || key}` : path.startsWith('relations.') ? `ความสัมพันธ์ ${key}` : path.startsWith('materials.') ? `วัตถุดิบ ${key}` : `ฝ่าย ${key}`);
      const amount = Number(delta.toFixed(2));
      return [`${label} ${amount > 0 ? '+' : ''}${amount}`];
    }).join(' · ');
  }

  function chooseEvent(id, event, choice, index, textOverride) {
    if (!eventScopeAllowed(state, event, id) || !choice || !isChoiceAvailable(choice, state)) return false;
    const outcomeBefore = eventOutcomeSnapshot(state);
    const treasuresBefore = new Set((state.treasures || []).map(item => typeof item === 'string' ? item : item.name));
    const relationBefore = { ...(state.relations || {}) };
    const impact = eventAlwaysPathImpact(state, id, index);
    const impactEffects = Object.entries(impact).map(([key, value]) => ({ type: 'path', key, value }));
    const fate = choice.check ? rollFate(state, choice.check) : null;
    const resultEffects = fate ? (fate.success ? (choice.effects || []) : (choice.failureEffects || [])) : (choice.effects || []);
    applyEffects(state, [...impactEffects, ...resultEffects]);
    const textUsed = textOverride || (typeof choice.dynamicText === 'function' ? choice.dynamicText(state) : choice.text);
    state.choices[id] = { index, text: textUsed, title: event.title, impact: formatImpact(impact), month: state.month, check: fate || null };
    state.choiceHistory = Array.isArray(state.choiceHistory) ? state.choiceHistory : [];
    state.choiceHistory.push({ id, index, text: textUsed, title: event.title, impact: formatImpact(impact), month: state.month, check: fate || null });
    if (fate) addLog(`${fate.success ? 'ชะตาเปิดทาง' : 'ชะตาขัดขวาง'}: ${ATTRIBUTE_LABELS[fate.stat] || fate.stat} ${fate.total}/${fate.difficulty} (ลูกเต๋า ${fate.die})`, !fate.success);
    if (id === 'betrayal') {
      state.flags.wenTruthKnown = true;
      if (state.flags.familyToken) state.flags.familyTokenVerified = true;
      addLog(state.flags.familyToken
        ? 'ป้ายหยกยืนยันคำสั่งของชายหน้ากากและบัญชีลับของหลัว เหวินจงเป็นผู้ส่งยาช่วยผู้รอดชีวิต หลัวตัดบันทึกเพื่อใส่ร้ายท่าน'
        : 'บัญชีเวรยามและใบส่งยาฉบับต้นพิสูจน์ว่าเหวินจงช่วยผู้รอดชีวิต หลัวตัดบันทึกเพื่อใส่ร้ายท่าน และชายหน้ากากเป็นผู้สั่งเผาตระกูล', true);
    }
    if (choice.effect && (!fate || fate.success)) choice.effect(state);
    recordRelationshipChanges(state, relationBefore);
    if (id === 'arrival' && index < 3) { state.flags.metSect = true; state.flags.sectDeclined = false; setStoryRoute(state, 'sect'); addRouteSkill(state, 'sectMerit', 1); markRouteTutorial(state, 'sect'); openCultivation(state, 'สำนักเมฆาครามมอบเคล็ดรวบรวมปราณพื้นฐาน'); addLog('หลินอันจึงเปิดทางจากผู้ฝึกกายเข้าสู่เส้นทางผู้บำเพ็ญ', true); }
    if (id === 'arrival' && index >= 3) { state.flags.metSect = false; state.flags.sectDeclined = true; state.hero.cultivationAccess = false; state.activity = "work"; state.hero.cultivation = 0; state.hero.qi = 0; const routeId = index === 3 ? 'mortal-peace' : index === 4 ? 'nameless-martial' : index === 5 ? 'new-land' : 'underworld'; setStoryRoute(state, routeId); addRouteSkill(state, routeId === 'mortal-peace' ? 'householdSkill' : routeId === 'nameless-martial' ? 'martialReputation' : 'travelKnowledge', 1); markRouteTutorial(state, routeId); addLog('หลินอันยังไม่เปิดทางปราณ เพราะไม่ได้รับวิชาบำเพ็ญจากสำนัก', true); }
    if (!state.ending && !state.continuation) resolveCultivationProgress(state);
    updateFactionReputation(state);
    syncCombat(state);
    state.hero.health = clamp(state.hero.health, 0, state.hero.maxHealth);
    if (state.hero.health <= 0 && !state.ending && !state.continuation) {
      if ((state.hero?.ageMonths || 0) < 84) endGame('death_early', { cause: `บาดแผลจากเหตุการณ์ “${event.title}” รุนแรงเกินกว่าเด็กจะทนได้` });
      else endGame('death', { cause: `บาดแผลจากเหตุการณ์ “${event.title}” รุนแรงเกินกว่าจะรอด` });
    }
    const addedTreasures = (state.treasures || []).map(item => typeof item === 'string' ? item : item.name).filter(name => !treasuresBefore.has(name));
    const outcome = [formatEventOutcome(outcomeBefore, eventOutcomeSnapshot(state)), ...addedTreasures.map(name => `ได้รับ ${name}`)].filter(Boolean).join(' · ');
    state.choices[id].outcome = outcome;
    state.choiceHistory[state.choiceHistory.length - 1].outcome = outcome;
    addLog(`${event.title} — ${textUsed}: ${outcome || 'ไม่มีการเปลี่ยนแปลงค่าสถานะที่แสดง'}`, true);
    if (event.uniqueGraded || event.libraryDiscovery) {
      state.gradedEventHistory = Array.isArray(state.gradedEventHistory) ? state.gradedEventHistory : [];
      if (!state.gradedEventHistory.includes(id)) state.gradedEventHistory.push(id);
    }
    state.eventHistory.push(id);
    if (event.legendarySceneKey) {
      state.legendarySceneHistory = Array.isArray(state.legendarySceneHistory) ? state.legendarySceneHistory : [];
      if (!state.legendarySceneHistory.includes(event.legendarySceneKey)) state.legendarySceneHistory.push(event.legendarySceneKey);
    }
    state.pendingEvent = null;
    $('event-modal').hidden = true;
    if (!state.ending) { state.paused = false; saveGame(); render(); toast(outcome ? `ผลการเลือก: ${outcome}` : 'ไม่มีการเปลี่ยนแปลงค่าสถานะที่แสดง'); }
    return true;
  }

  function advanceAgePhase(s) {
    if (!s || s.pendingEvent || s.ending) return;
    const h = s.hero;
    let targetMonths;
    if (h.ageMonths < 24) targetMonths = 24 - h.ageMonths;
    else if (h.ageMonths < 60) targetMonths = 60 - h.ageMonths;
    else if (h.ageMonths < 144) targetMonths = 144 - h.ageMonths;
    else if (h.ageMonths < 180) targetMonths = 180 - h.ageMonths;
    else targetMonths = 12;

    targetMonths = Math.min(targetMonths, 120);
    if (targetMonths <= 0) targetMonths = 12;

    let monthsSimulated = 0;
    s.paused = true;

    for (let i = 0; i < targetMonths; i++) {
      if (h.health <= (h.maxHealth * 0.35) || s.ending || s.pendingEvent) {
        break;
      }
      const continueLoop = processMonth(false);
      monthsSimulated++;

      if (!continueLoop || s.pendingEvent || s.ending || h.health <= (h.maxHealth * 0.35)) {
        break;
      }
    }

    if (monthsSimulated > 0) {
      if (!s.ending) {
        if (s.pendingEvent) {
          toast(`หยุดเดินเวลาหลังผ่านไป ${monthsSimulated} เดือน เนื่องจากมีเหตุการณ์สำคัญ`);
        } else if (h.health <= (h.maxHealth * 0.35)) {
          toast(`หยุดเดินเวลาหลังผ่านไป ${monthsSimulated} เดือน เนื่องจากสุขภาพลดต่ำ (${Math.round(h.health)}/${h.maxHealth})`);
        } else {
          toast(`เติบโตผ่านไป ${monthsSimulated} เดือนอย่างราบรื่น`);
        }
      }
    }
    saveGame();
    render();
  }

  function formatImpact(impact) {
    const names = { compassion: 'เมตตา', duty: 'ภักดี', freedom: 'อิสระ', insight: 'หยั่งรู้' };
    return Object.entries(impact).map(([key, value]) => `${names[key] || key} ${value >= 0 ? '+' : ''}${value}`).join(', ');
  }

  function createLifeSummary(s, type, extra = {}) {
    ensureWorldPressure(s); ensureOathState(s); ensureFamilyState(s);
    return {
      characterId: s.characterId || 'lin-an',
      ruleSet: s.ruleSet || LIFE_RULES.oneLife.id,
      month: s.month,
      ageMonths: s.hero.ageMonths,
      endingType: type,
      cause: extra.cause || '',
      choices: Object.keys(s.choices || {}).length,
      cultivation: s.hero.cultivation,
      power: s.hero.power,
      lineage: s.lineageState ? { ...s.lineageState } : null,
      family: familyAllowed(s) ? JSON.parse(JSON.stringify(s.family)) : null,
      paths: { ...(s.paths || {}) },
      eventHistory: [...(s.eventHistory || [])],
      choiceHistory: [...(s.choiceHistory || [])],
      deathSignature: calculateDeathSignature(s, type, extra),
      oaths: { active: [...s.oaths.active], broken: [...s.oaths.broken], kept: [...s.oaths.kept] },
      worldPressure: { ...s.worldPressure },
      worldScars: [...s.worldScars],
      worldImpact: { worldMonth: s.world?.worldMonth || s.month, news: [...(s.world?.news || [])].slice(0, 8), modifiers: { ...(s.world?.modifiers || {}) }, events: Object.values(s.world?.events || {}).map(event => ({ id: event.id, outcome: event.outcome, status: event.status })) },
      legacyEchoes: [...(s.legacyEchoes || [])]
    };
  }

  function recordMetaUnlocks(s, summary) {
    const meta = getMeta();
    const itemIds = (s.treasures || []).map(item => String(typeof item === 'object' ? (item.id || item.name) : item));
    const techniqueIds = Object.values(s.techniqueLoadout || {}).filter(Boolean).map(String);
    const eventIds = [...(s.eventHistory || []), ...(s.world?.knownEvents || [])].map(String);
    meta.unlockedItems = [...new Set([...(meta.unlockedItems || []), ...itemIds])];
    meta.unlockedTechniques = [...new Set([...(meta.unlockedTechniques || []), ...techniqueIds])];
    meta.unlockedEvents = [...new Set([...(meta.unlockedEvents || []), ...eventIds])];
    const blessing = `blessing:${summary.endingType}`;
    meta.blessings = [...new Set([...(meta.blessings || []), blessing])];
    meta.lifeRecords = [...(meta.lifeRecords || []), { endingType: summary.endingType, month: summary.month, cause: summary.cause, worldImpact: summary.worldImpact, deathSignature: summary.deathSignature }].slice(-20);
    if (!isGuestSession()) localStorage.setItem(META_KEY, JSON.stringify(meta));
    if (state) state.metaState = { ...(state.metaState || createMetaState()), ...meta };
    return meta;
  }

  function resolveDeathContinuation(s, summary) {
    const rule = Object.values(LIFE_RULES).find(item => item.id === (s.ruleSet || LIFE_RULES.oneLife.id)) || LIFE_RULES.oneLife;
    // กฎหนึ่งชีวิตในโหมดอิสระเป็น terminal ตายแล้วจบจริง ไม่ถูกบังคับวนลูปทารก
    if (rule.onDeath === 'terminal' || s.mode === 'story' && s.characterId === 'lin-an') return { kind: 'terminal', rule: rule.id };
    return { kind: rule.onDeath, rebirth: rule.rebirth, rule: rule.id, sourceLife: summary };
  }

  function simulateFuture(s) {
    const combat = syncCombat(s);
    const paths = s.paths || {};
    const relations = s.relations || {};
    const scores = {
      'ผู้พิทักษ์สำนัก': (combat.totalPower || 0) / 80 + (relations.master || 0) + (paths.duty || 0) * 8,
      'จอมยุทธ์พเนจร': (combat.agility || 0) * 10 + (paths.freedom || 0) * 9 + (s.hero.money || 0) / 2,
      'ผู้ค้นความจริง': (paths.insight || 0) * 12 + (relations.friend || 0) / 2 + (s.hero.cultivation || 0) / 18
    };
    const role = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    const horizonMonths = clamp(Math.round(24 + Math.max(...Object.values(scores)) * 2), 24, 144);
    const success = Math.round(clamp(42 + Math.max(...Object.values(scores)) / 3, 35, 96));
    const rewards = {
      cultivation: Math.round(horizonMonths * (role === 'ผู้ค้นความจริง' ? 1.4 : .8)),
      money: Math.round(horizonMonths / (role === 'จอมยุทธ์พเนจร' ? 2 : 4)),
      insight: role === 'ผู้ค้นความจริง' ? 3 : 1
    };
    return { role, horizonMonths, success, outcome: success >= 70 ? 'อนาคตเปิดทาง' : 'อนาคตเต็มไปด้วยเคราะห์', rewards };
  }

  function continueLife() {
    if (!state || !state.continuation || state.continuation.kind === 'terminal') return false;
    const previous = state.lifeSummary;
    const preservedWorldMonth = state.world?.worldMonth || state.worldMonth || 0;
    const inheritedWorld = {
      worldPressure: { ...(state.worldPressure || {}) },
      worldScars: [...(state.worldScars || [])],
      legacyEchoes: [...(state.legacyEchoes || [])],
      lineageState: { ...(state.lineageState || {}) },
      family: state.ruleSet === 'dynasty' ? JSON.parse(JSON.stringify(state.family || {})) : null
    };
    const next = defaultState(state.hero.name, state.hero.talent, state.hero.root, state.hero.gender);
    const preserved = {
      mode: state.mode, characterId: state.characterId, ruleSet: state.ruleSet,
      world: state.world, worldCharacters: state.worldCharacters, worldState: state.worldState,
      worldMonth: preservedWorldMonth,
      worldPressure: inheritedWorld.worldPressure, worldScars: inheritedWorld.worldScars,
      legacyEchoes: inheritedWorld.legacyEchoes, lineageState: inheritedWorld.lineageState,
      family: inheritedWorld.family, lifeHistory: state.lifeHistory, metaState: state.metaState,
      lifeIndex: (state.lifeIndex || 0) + 1
    };
    Object.keys(next).forEach(key => { state[key] = next[key]; });
    Object.assign(state, preserved);
    state.world.worldMonth = preservedWorldMonth;
    state.worldMonth = preservedWorldMonth;
    state.characterMonth = 0;
    state.month = 0;
    state.worldState = preserved.worldState || state.worldState;
    state.hero = next.hero;
    state.learnedManualTechniques = [];
    state.lifeJournalSeen = {};
    state.gradedEventHistory = [];
    state.legendarySceneHistory = [];
    state.hero.name = state.ruleSet === 'dynasty' ? `${previous.characterId === 'lin-an' ? 'หลินอัน' : state.hero.name} รุ่นถัดไป` : 'ผู้เกิดใหม่';
    state.hero.ageMonths = 0;
    state.hero.health = state.hero.maxHealth;
    state.monthsProcessed = 0;
    state.lifeHistory = state.lifeHistory || [];
    state.lifeHistory.push(previous);
    state.lifeHistory = state.lifeHistory.slice(-15);
    state.worldPressure = inheritedWorld.worldPressure;
    state.worldScars = inheritedWorld.worldScars;
    state.legacyEchoes = inheritedWorld.legacyEchoes;
    state.lineageState = inheritedWorld.lineageState;
    applyLegacyEcho(state, previous);
    state.oaths = { active: [], broken: [...(previous.oaths?.broken || [])], kept: [...(previous.oaths?.kept || [])], scars: [...(previous.oaths?.broken || [])] };

    // Zero leakage: cleanse character-specific debuffs, poisons, buffs, loadouts, personal quests
    state.conditions = {};
    state.pillEffect = null;
    state.poisonCoating = null;
    state.consumables = [];
    state.treasures = [];
    state.itemLoadout = { weapon: null, armor: null, boots: null, ring1: null, ring2: null, necklace: null, mount: null };
    state.techniqueLoadout = { cultivation: null, combat: null, movement: null, defense: null, support: 'survival' };
    state.quests = { active: [], completed: [], failed: [], canceled: [], trackedId: null };
    state.household = { job: 'odd_jobs', housing: state.ruleSet === 'dynasty' && inheritedWorld.family?.buildings?.length ? 'estate' : 'shelter', debt: 0, debtPrincipal: 0, interestRate: .08, interestAccrued: 0, arrears: 0, collectionStage: 0, creditor: null, seizedAssets: [], bankruptcy: false, loanCount: 0, monthlyCost: 0, careerXp: 0, careerLevel: 1, workFatigue: 0, workRisk: 0 };

    if (state.ruleSet === 'dynasty' && inheritedWorld.family) {
      state.family = inheritedWorld.family;
      state.family.spouse = null;
      state.family.parents = [
        { id: `parent-prev-${previous.characterId || 'hero'}`, name: previous.characterId === 'lin-an' ? 'บรรพชนหลินอัน' : 'บรรพชนรุ่นก่อน', role: 'parent', health: 0, bond: 100, alive: false }
      ];
      if (inheritedWorld.family?.spouse) {
        state.family.parents.unshift({ id: 'parent-spouse', name: inheritedWorld.family.spouse.name || 'มารดา', role: 'parent', health: 85, bond: 90, alive: true });
      }
    } else {
      state.family = {
        spouse: null, children: [],
        parents: [
          { id: `parent-father-${state.lifeIndex || 1}`, name: 'บิดา', role: 'parent', health: 100, bond: 75, alive: true },
          { id: `parent-mother-${state.lifeIndex || 1}`, name: 'มารดา', role: 'parent', health: 100, bond: 85, alive: true }
        ],
        relatives: [], buildings: [], construction: null, lastChildMonth: -99, treasury: 0, bond: 65, health: 100, debt: 0, conflict: 0, losses: [], chronicle: [{ month: 0, text: 'ทารกกำเนิดใหม่ใต้ร่มเงาครอบครัวใหม่' }], legacyScore: 0, heirId: null
      };
    }
    state.activity = 'rest';
    state.pendingEvent = null;
    state.ending = null;
    state.paused = false;
    state.lastRandomMonth = state.month - 2;
    if (state.ruleSet === 'dynasty') {
      const lineage = state.lineageState;
      lineage.generation += 1; lineage.heirCount += 1;
      state.flags.familyGeneration = lineage.generation;
      state.hero.money = lineage.treasury;
      addLog(`ทายาทรุ่นที่ ${lineage.generation} ลืมตาดูโลก ตระกูลมีทรัพย์กลาง ${lineage.treasury} ตำลึง และชื่อเสียงระดับ ${lineage.stage}`, true);
    } else if (state.ruleSet === 'unlucky-isekai') {
      const origin = rollUnluckyOrigin(state);
      addLog(`ชะตาพลิกผัน: ${origin.name} — ${origin.effect}`, true);
    } else {
      addLog('ลมหายใจใหม่เริ่มต้นในร่างทารกของชีวิตถัดไป', true);
    }
    state.continuation = null;
    syncStateLayers(state); saveGame(); render(); startTimer();
    toast('ชีวิตใหม่เริ่มต้นแล้ว — โลกเดิมยังคงจดจำสิ่งที่เจ้าทำไว้');
    return true;
  }

  function endGame(type, extra = {}) {
    if (!state || state.ending) return;
    state.lifeSummary = createLifeSummary(state, type, extra);
    recordMetaUnlocks(state, state.lifeSummary);
    state.continuation = type.startsWith('death') ? resolveDeathContinuation(state, state.lifeSummary) : { kind: 'terminal', rule: state.ruleSet };
    if (state.continuation.kind === 'simulation') {
      const simulationResult = simulateFuture(state);
      recordSimulationReward(simulationResult);
      state.lifeSummary.simulationResult = simulationResult;
      const summaryExtra = { ...extra, simulationResult };
      state.ending = { type, extra: summaryExtra, month: state.month, continuation: 'simulation' }; state.paused = true; saveGame();
      setTimeout(() => showSummary(type, summaryExtra), 180);
      return;
    }
    if (state.continuation.kind !== 'terminal') {
      state.paused = true; saveGame();
      setTimeout(continueLife, 180);
      return;
    }
    state.ending = { type, extra, month: state.month, continuation: state.continuation.kind }; state.paused = true; saveGame();
    setTimeout(() => showSummary(type, extra), 180);
  }

  // คำนวณความน่าจะเป็น / ความหายาก (Sequence Specificity & Probability: 1 ใน X)
  function calculateEndingRarity(type, s, extra = {}) {
    const root = s.hero.root || 'human';
    const rootMult = ROOTS[root]?.rarityMult || 1.0;
    let baseOneIn = 50;
    let category = 'ชะตาผันผวน';

    switch (type) {
      case 'death_early':
        return { oneIn: 4, pct: '25.0%', category: 'พบได้ทั่วไป (เกรดธุลีดิน)', difficultyScore: 5 };
      case 'death_deviation':
      case 'death_poison':
      case 'death_escape':
      case 'death_battle':
      case 'death':
        baseOneIn = Math.round(20 * rootMult);
        category = 'ดับสูญกลางทาง';
        break;
      case 'sect_fall':
        baseOneIn = Math.round(85 * rootMult);
        category = 'สำนักล่มสลาย';
        break;
      case 'outlaw':
        baseOneIn = Math.round(190 * rootMult);
        category = 'จอมยุทธ์ชื่อฉาว';
        break;
      case 'wanderer_lone':
        baseOneIn = Math.round(38 * rootMult);
        category = 'ผู้รอดชีวิตเดียวดาย';
        break;
      case 'wanderer_exodus':
      case 'wanderer':
        baseOneIn = Math.round(310 * rootMult);
        category = 'ผู้นำพาผู้ลี้ภัย';
        break;
      case 'guardian':
        baseOneIn = Math.round(480 * rootMult);
        category = 'ผู้พิทักษ์สำนัก';
        break;
      case 'guardian_pyrrhic':
        baseOneIn = Math.round(760 * rootMult);
        category = 'ชัยชนะเคล้าน้ำตา';
        break;
      case 'guardian_legend':
        baseOneIn = Math.round(1850 * rootMult);
        category = 'มหาตำนานยุทธภพ';
        break;
      case 'traitor_kingpin':
      case 'traitor':
        baseOneIn = Math.round(4200 * rootMult);
        category = 'ชะตาผกผันสายมาร (มหายาก)';
        break;
    }

    const choicesCount = Object.keys(s.choices || {}).length;
    if (choicesCount >= 10) baseOneIn = Math.round(baseOneIn * 1.15);
    if (s.flags.forbiddenPower) baseOneIn = Math.round(baseOneIn * 1.2);
    if (s.flags.spiritWeapon) baseOneIn = Math.round(baseOneIn * 1.1);

    const pct = (100 / Math.max(1, baseOneIn)).toFixed(baseOneIn > 1000 ? 3 : 2) + '%';
    return {
      oneIn: baseOneIn,
      pct,
      category,
      difficultyScore: Math.round(Math.log10(baseOneIn) * 32)
    };
  }

  // เกณฑ์ Achievement แยกตามความยากของแต่ละบทจบ ไม่ใช้เส้นเดียวกันทุก Ending
  const ENDING_GRADE_RULES = {
    guardian_legend: [0, 68, 92, 118], guardian: [0, 58, 80, 106], guardian_pyrrhic: [0, 54, 76, 100],
    wanderer_exodus: [0, 48, 70, 94], wanderer_lone: [0, 42, 64, 88], traitor_kingpin: [0, 62, 84, 108],
    outlaw: [0, 40, 62, 84], sect_fall: [0, 38, 58, 78], death_battle: [0, 30, 50, 72],
    death_escape: [0, 28, 46, 68], death_deviation: [0, 24, 42, 64], death_poison: [0, 24, 42, 64],
    death_early: [0, 12, 24, 42], death: [0, 20, 38, 60]
  };
  const GRADE_DEFINITIONS = [
    { name: 'ผ่านพอดี', mark: '平', cssClass: 'achievement-black', rank: 0 },
    { name: 'ผู้ฝ่าฟัน', mark: '銅', cssClass: 'achievement-copper', rank: 1 },
    { name: 'ยอดยุทธ์', mark: '銀', cssClass: 'achievement-silver', rank: 2 },
    { name: 'ตำนาน', mark: '金', cssClass: 'achievement-gold', rank: 3 }
  ];
  const ENDING_SCORE_BONUS = {
    guardian_legend: 20, guardian: 16, guardian_pyrrhic: 14, wanderer_exodus: 13, wanderer_lone: 10,
    traitor_kingpin: 14, outlaw: 7, sect_fall: 5, death_battle: 2, death_escape: 1,
    death_deviation: 0, death_poison: 0, death_early: 0, death: 0
  };

  function calculateEndingScore(type, extra = {}, rarity = calculateEndingRarity(type, state, extra)) {
    const combat = syncCombat(state);
    // รากที่ฝึกยากกว่าจะได้รับแต้ม Achievement ชดเชยความเสียเปรียบในการเล่น
    const rootScoreBonus = { none: 12, human: 9, earth: 6, heaven: 4, immortal: 2, legend: 0 }[state.hero.root] || 0;
    const choices = Object.keys(state.choices || {}).filter(id => id !== 'training-health-warning').length;
    const path = Math.max(...Object.values(state.paths || { compassion: 0, duty: 0, freedom: 0, insight: 0 }));
    const survival = type.startsWith('death') || type === 'sect_fall' ? 0 : 18;
    const rarityScore = Math.min(22, Math.round(Math.log10(Math.max(1, rarity.oneIn)) * 6));
    const journeyScore = Math.min(15, Math.round(choices * .6));
    const cultivationScore = Math.min(18, Math.round(cultivationRank(state.hero) * .65));
    const combatScore = Math.min(22, Math.round(combat.totalPower / 350));
    const relationshipScore = Math.min(14, Math.round((
      (state.relations.master || 0) + (state.relations.senior || 0) + (state.relations.friend || 0)
    ) / 12));
    const pathScore = Math.min(12, Math.round(path * .8));
    const battleScore = Math.max(-8, Math.min(20, Math.round((extra.netAdvantage || 0) / 500)));
    const debtPenalty = Math.min(20, Math.floor(Math.max(0, Number(extra.debt || 0)) / 5));
    return Math.max(0, Math.min(150, Math.round(
      survival + (ENDING_SCORE_BONUS[type] || 0) + rootScoreBonus + rarityScore + journeyScore + cultivationScore +
      combatScore + relationshipScore + pathScore + battleScore - debtPenalty
    )));
  }

  function endingGrade(type, extra = {}) {
    const rarity = calculateEndingRarity(type, state, extra);
    const score = calculateEndingScore(type, extra, rarity);
    const thresholds = ENDING_GRADE_RULES[type] || [0, 35, 60, 90];
    let rank = 0;
    thresholds.forEach((min, index) => { if (score >= min) rank = index; });
    return { ...GRADE_DEFINITIONS[rank], min: thresholds[rank], score, rarity, thresholds };
  }

  function recordAchievement(type, grade) {
    const meta = getMeta();
    meta.endings = [...new Set([...(meta.endings || []), type])];
    const achievementId = `${state?.characterId || 'lin-an'}:${type}`;
    meta.achievements = [...new Set([...(meta.achievements || []), achievementId])];
    meta.unlockedCharacters = deriveUnlockedCharacters(meta);
    meta.tutorials = Array.isArray(meta.tutorials) ? meta.tutorials : [];
    const routeTutorial = ROUTE_TUTORIALS[ensureStoryRoute(state).id];
    if (routeTutorial && !meta.tutorials.includes(routeTutorial.title)) meta.tutorials.push(routeTutorial.title);
    const old = meta.grades[type];
    if (!old || grade.rank > old.rank || (grade.rank === old.rank && grade.score > old.score)) {
      meta.grades[type] = { rank: grade.rank, score: grade.score, name: grade.name, mark: grade.mark };
    }
    if (!isGuestSession()) localStorage.setItem(META_KEY, JSON.stringify(meta));
    if (state) state.metaState = { ...(state.metaState || createMetaState()), endings: meta.endings, grades: meta.grades, unlockedCharacters: meta.unlockedCharacters, achievements: meta.achievements, tutorials: meta.tutorials };
    return meta;
  }

  function recordSimulationReward(result) {
    const meta = getMeta();
    const runId = state?.runId;
    meta.clearedRunIds = Array.isArray(meta.clearedRunIds) ? meta.clearedRunIds : [];
    if (runId && meta.clearedRunIds.includes(runId)) return meta;
    meta.simulations = (meta.simulations || 0) + 1;
    meta.simulationRewards = meta.simulationRewards || { cultivation: 0, money: 0, insight: 0 };
    Object.entries(result?.rewards || {}).forEach(([key, value]) => { meta.simulationRewards[key] = (meta.simulationRewards[key] || 0) + Number(value || 0); });
    if (runId) meta.clearedRunIds.push(runId);
    if (!isGuestSession()) localStorage.setItem(META_KEY, JSON.stringify(meta));
    if (state) state.metaState = { ...(state.metaState || createMetaState()), simulations: meta.simulations, simulationRewards: meta.simulationRewards };
    return meta;
  }

  function rootEndingNarrative(type) {
    const root = state.hero.root || 'human', survived = !type.startsWith('death') && type !== 'sect_fall';
    const lines = {
      none: survived ? 'แม้ชาติกำเนิดไร้รากวิญญาณ หลินอันกลับฝืนกฎสวรรค์ด้วยหยาดเหงื่อทุกหยด ผู้คนจึงกล่าวว่าชัยชนะครั้งนี้มิได้มาจากพรสวรรค์ แต่มาจากใจที่ไม่ยอมคุกเข่า' : 'ร่างไร้รากวิญญาณไม่อาจทนกระแสปราณและความโหดร้ายของยุทธภพได้ ชะตาของหลินอันจึงดับลงก่อนความตั้งใจ',
      human: survived ? 'รากวิญญาณมนุษย์ของหลินอันมิได้โดดเด่น ทว่าความสม่ำเสมอทำให้ทุกย่างก้าวหนักแน่นกว่าคำทำนายของเหล่าผู้อาวุโส' : 'รากวิญญาณมนุษย์พาเขามาได้ไกลด้วยความพยายาม แต่ในวาระสุดท้าย รากฐานธรรมดาไม่อาจชดเชยเส้นทางที่เลือกผิด',
      earth: survived ? 'รากวิญญาณปฐพีทำให้ลมปราณของหลินอันมั่นคงดุจขุนเขา ต่อให้คลื่นศึกถาโถม เขายังยืนหยัดรับมันไว้ได้' : 'แม้รากปฐพีจะแข็งแกร่งดุจศิลา แต่ศิลาก็แตกร้าวได้เมื่อแบกรับเกินกำลัง',
      heaven: survived ? 'เมื่อรากวิญญาณสวรรค์เผยประกาย ทุกลมหายใจของหลินอันประสานกับฟ้าดิน ผู้คนรู้ว่าการเติบโตอันรวดเร็วนั้นมิใช่เรื่องบังเอิญ' : 'สวรรค์มอบรากวิญญาณอันเลิศล้ำให้หลินอัน แต่ไม่ได้รับรองว่าเขาจะเลือกเส้นทางถูกต้อง',
      immortal: survived ? 'รากวิญญาณเซียนทำให้ปราณรอบกายก้มศีรษะต่อหลินอัน ชื่อของเขาจึงถูกเล่าราวกับผู้มาเยือนจากแดนเหนือโลก' : 'แม้ผู้ถือรากเซียนก็ยังเป็นมนุษย์ เลือดของหลินอันยังอุ่น และชะตาผิดพลาดยังพรากชีวิตได้',
      legend: survived ? 'รากวิญญาณตำนานของหลินอันสั่นสะเทือนเส้นชีพจรฟ้าดิน การปรากฏตัวของเขาถูกจดเป็นเหตุการณ์ซึ่งหนึ่งหมื่นปีอาจเกิดเพียงครั้ง' : 'รากวิญญาณระดับตำนานมิอาจช่วยผู้ที่เดินเข้าสู่คมกระบี่แห่งชะตาด้วยตนเอง การจากไปของหลินอันจึงกลายเป็นตำนานเตือนใจ'
    };
    return lines[root] || lines.human;
  }

  function isNarrativeContinuationChoice(text) {
    return /^(อ่านต่อ|อ่าน|ดูต่อ|ไปต่อ|ดำเนินต่อ|ฟังต่อ|รับฟังต่อ|ปล่อยให้เรื่องดำเนินต่อ)/i.test(String(text || '').trim());
  }

  function renderEndingTimeline() {
    const source = Array.isArray(state.choiceHistory) ? state.choiceHistory : Object.entries(state.choices || {}).map(([id, c]) => ({ id, ...c }));
    const items = source.filter(item => item.id !== 'training-health-warning' && !isNarrativeContinuationChoice(item.text)).sort((a, b) => (a.month || 0) - (b.month || 0));
    $('ending-timeline').innerHTML = items.length ? items.map((item, index) => {
      const event = EVENTS[item.id] || RANDOM_EVENTS.find(e => e.id === item.id) || {};
      const age = formatAge((state.characterId === 'lin-an' ? 5 * 12 : 0) + (item.month || 0));
      return `<article class="timeline-card"><span>${String(index + 1).padStart(2, '0')}</span><div><small>อายุ ${age} · เดือนที่ ${item.month || 0}</small><strong>${item.title || event.title || 'เหตุการณ์ระหว่างทาง'}</strong><p>${item.text || 'การตัดสินใจที่เปลี่ยนชะตา'}${item.impact ? ` <em>(${item.impact})</em>` : ''}</p></div></article>`;
    }).join('') : '<p class="empty">ชีวิตนี้จบลงก่อนมีการตัดสินใจใดถูกบันทึก</p>';
  }

  function showSummary(type, extra = {}) {
    stopTimer(); showScreen('summary-screen');
    const endings = {
      guardian_legend: {
        seal: '神', title: 'ตำนานผู้พิทักษ์เมฆาคราม',
        quote: '“เมื่อฟ้าดินสั่นคลอน มีเพียงผู้ที่พร้อมทั้งจิต ปัญญา และพลัง จึงสลักชื่อไว้เหนือกาลเวลา”',
        story: `รุ่งอรุณหลังมหาศึก ธงเมฆาครามโบกสะบัดอย่างสง่างามเหนือกำแพงที่ไร้รอยแตก ${state.flags.masterHealed ? 'อาจารย์เหวินผู้ฟื้นตัวเต็มร้อยยืนเคียงข้างประมุขสำนัก ' : ''}${state.flags.traitorExposed ? 'กลศึกงูดำถูกหักล้างอย่างสิ้นเชิงเพราะคนทรยศถูกเปิดโปงล่วงหน้า ' : ''}กองทัพงูดำแตกพ่ายย่อยยับ ประมุขมอบป้ายทองสืบทอดสำนักแก่ ${state.hero.name} นับแต่นี้ชื่อของเจ้ามิใช่เพียงผู้รอดชีวิตจากตระกูลหลิน แต่คือยอดคนที่ยุทธภพต้องจารึก`
      },
      guardian: {
        seal: '義', title: 'ผู้พิทักษ์เมฆาคราม',
        quote: '“บางคนฝึกตนเพื่อหนีชะตา บางคนยืนหยัดจนชะตาต้องเปลี่ยนทาง”',
        story: `รุ่งอรุณหลังศึก ธงเมฆาครามยังคงโบกเหนือประตูที่ไหม้เกรียม ${extra.netAdvantage != null && extra.netAdvantage < 4500 ? 'ชัยชนะครั้งนี้เกิดขึ้นท่ามกลางความเสียหายหนัก สำนักยังต้องใช้เวลาฟื้นฟูอีกยาวนาน ' : ''}${state.flags.traitorExposed ? 'การเปิดโปงหลัวก่อนศึกทำให้คลังเสบียงและเส้นทางเฝ้ายามยังอยู่ครบ ' : state.flags.misdirectionSuccessful ? 'ข่าวลวงของเจ้าทำให้กำลังหลักงูดำหลงเข้าหุบเขา แม้ความจริงเรื่องหลัวยังไม่ถูกเปิดเผย ' : ''}${state.flags.shelterBuilt || state.flags.civiliansSaved ? 'ผู้ลี้ภัยที่เจ้าเคยช่วยกลายเป็นส่วนหนึ่งของชุมชนที่ช่วยพยุงสำนักหลังศึก ' : ''}${state.flags.alliesRecruited ? 'หน่วยอาสาที่เจ้าฝึกช่วยยื้อแนวกำแพงไว้จนรุ่งเช้า ' : ''}${state.flags.helpedFriend ? 'เฉินหยูพาศิษย์กลุ่มสุดท้ายกลับมาสมทบตามคำสัญญา ' : ''}${state.flags.warnedMaster ? 'เพราะคำเตือนของเจ้า สำนักจึงรักษาคลังเสบียงและลดความสูญเสียได้ ' : ''}อาจารย์เหวินมอบป้ายศิษย์สายในให้เจ้า นับแต่นี้ชื่อของ ${state.hero.name} ถูกจารึกไว้ในฐานะผู้เปลี่ยนคืนสำนักแตกให้กลายเป็นรุ่งอรุณใหม่`
      },
      guardian_pyrrhic: {
        seal: '孤', title: 'ผู้แบกรับเถ้าถ่านเมฆาคราม',
        quote: '“ชัยชนะที่ต้องแลกด้วยชีวิตของคนที่เรารัก... แท้จริงแล้วคือชัยชนะหรือตราบาปกันแน่”',
        story: `งูดำถูกขับไล่พ้นยอดเขา แต่เบื้องหลังควันไฟคือร่างไร้วิญญาณของอาจารย์เหวิน เพราะพิษร้ายเก่าที่เรื้อรังและไม่ได้รับการเยียวยา ท่านจึงฝืนเผาผลาญลมปราณเฮือกสุดท้ายเพื่อเปิดช่องให้ ${state.hero.name} ปลิดชีพแม่ทัพศัตรู แม้สำนักจะรอดพ้น แต่เสาหลักที่อบอุ่นที่สุดดับสูญไปแล้ว เหลือเพียงหลินอันที่ต้องยืนตากลมหนาว แบกรับภาระฟื้นฟูสำนักไว้เพียงลำพัง`
      },
      sect_fall: {
        seal: '破', title: 'บทเพลงสิ้นสำนัก',
        quote: '“คมกระบี่อาจหัก ธงสำนักอาจไหม้ แต่เลือดที่หลั่งลงดินจะไม่สูญเปล่า”',
        story: `เปลวเพลิงงูดำกลืนกินยอดเขาเมฆาครามจนสิ้น ${extra.cause ? `สาเหตุที่แนวรับพลิกพ่ายคือ${extra.cause} ` : ''}ค่ายกลแตกกระจาย ศิษย์สำนักล้มตายทีละคน หลินอันและอาจารย์ยืนหยัดสู้เคียงบ่าเคียงไหล่จนถึงลมหายใจสุดท้าย ก่อนที่ร่างทั้งสองจะล้มลงใต้เถ้าถ่านที่ไหม้เกรียม... สำนักเมฆาครามกลายเป็นเพียงชื่อในตำนานที่เล่าขาน`
      },
      wanderer_exodus: {
        seal: '生', title: 'ผู้นำทางใต้เงาจันทร์',
        quote: '“การมีชีวิตอยู่ไม่ใช่ความขลาด หากเรายังรู้ว่าจะใช้ชีวิตนั้นเพื่อใคร”',
        story: `เจ้าพาศิษย์และผู้ลี้ภัยที่สำนักรับไว้ผ่านอุโมงค์ลับก่อนเพลิงลามถึงหอคัมภีร์ สำนักเมฆาครามล่มสลาย แต่อุดมการณ์และผู้คนยังเดินทางไปกับผู้รอดชีวิต หลายปีต่อมา ${state.hero.name} ก่อตั้งเรือนเมฆาเล็ก ๆ ในแดนใต้ ถ่ายทอดวิชาและดูแลผู้รอดชีวิตของสำนัก`
      },
      wanderer_lone: {
        seal: '風', title: 'ผู้รอดชีวิตแห่งทางไกล',
        quote: '“ตัดใจจากอดีต มุ่งหน้าสู่ขอบฟ้าที่ไม่มีใครรู้จัก”',
        story: `${state.hero.name} เลือกฉวยเสบียงและออกจากภูเขาเพียงลำพัง ทิ้งผู้คนและอดีตไว้หลังแนวหิมะ แต่การตัดสินใจนี้ไม่ใช่การถูกผู้คนขับไล่เพราะชื่อเสียงติดลบ—เจ้าเพียงเลือกให้ชีวิตของตนมาก่อนพวกเขา ข่าวสำนักเมฆาครามล่มสลายตามมาถึงเมืองชายแดน ชื่อของเจ้าไม่ถูกกล่าวถึงในเรื่องเล่าของผู้กล้า แต่ยังมีลมหายใจ มีทางข้างหน้า และมีชีวิตใหม่ที่ต้องก้าวเดินต่อไป`
      },
      traitor_kingpin: {
        seal: '叛', title: 'ขุนพลงูดำแห่งคืนเพลิง',
        quote: '“เมื่อโลกไม่ยุติธรรม ข้าก็เพียงเลือกข้างผู้ชนะ”',
        story: `สัญญาณไฟของ ${state.hero.name} ทำให้ประตูตะวันตกเปิดจากด้านใน สำนักเมฆาครามล่มสลายในเวลาไม่ถึงหนึ่งชั่วยาม พรรคงูดำตบรางวัลด้วยทองคำ คัมภีร์ลับ และตำแหน่งขุนพลคุมแดนเหนือ ${state.flags.darkPastFromChildhood ? 'รอยมือจากฤดูหนาวที่เจ้าเคยขโมยเสบียงบอกว่าเส้นทางนี้เริ่มต้นจากการเลือกเอาตัวรอดตั้งแต่วัยเด็ก ' : ''}${state.flags.masterBondGiven || state.flags.seniorBondGiven || state.flags.friendBondGiven ? 'ของที่เจ้าเคยได้รับจากผู้คนในสำนักกลับกลายเป็นเครื่องเตือนใจถึงความไว้วางใจที่เจ้าทิ้งไว้เบื้องหลัง ' : ''}อาจารย์เหวินจากไปโดยไม่กล่าวคำสาปแช่ง—สายตาของท่านในคืนนั้นจะคอยหลอกหลอนเจ้าทุกครั้งที่หลับตา ทว่าในโลกมืด อำนาจของหลินอันกำลังแผ่ขยายไร้ผู้ใดขวาง`
      },
      outlaw: {
        seal: '惡', title: 'จอมยุทธ์ชื่อฉาว',
        quote: '“เมื่อชื่อเสียงยุทธภพต่ำกว่าลบสิบห้า แม้ยังมีชีวิตอยู่ ทุกประตูก็อาจปิดลง”',
        story: state.flags.linAnRoute === 'underworld' ? 'หลินอันเลือกงานใต้ดินแทนการเข้าสำนัก เขาสร้างเครือข่ายจากข่าวสาร ข้อตกลง และความเสี่ยงที่ทิ้งร่องรอยไว้ในชื่อเสียงของตน เมื่อสงครามมาถึง เขายังมีชีวิต แต่ต้องอยู่กับผลของสิ่งที่เลือก' : `${state.hero.name} หลบหนีออกจากภูเขาพร้อมทรัพย์สิน แต่การตัดสินใจหลายครั้งทำให้ชื่อเสียงยุทธภพลดต่ำกว่าลบสิบห้า ${extra.rejected ? 'ผู้ลี้ภัยปฏิเสธไม่ยอมตามเจ้าไป ทำให้ต้องหนีเพียงลำพัง ' : ''}ข่าวลือเดินทางเร็วกว่าฝีเท้า ร้านค้าและผู้คนในหลายเมืองเริ่มไม่ไว้วางใจ บางแห่งปฏิเสธไม่ให้ความช่วยเหลือ และทุกคืนต้องนอนพร้อมมือจับอาวุธ แม้มีชีวิตอยู่ แต่โลกยุทธภพไม่เหลือที่ให้กลับบ้าน`
      },
      quiet_roof: {
        seal: '家', title: 'ชีวิตสงบใต้ชายคา', quote: '“บ้านที่ดูแลได้ คือวิชาชีวิตที่ไม่ต้องมีคัมภีร์”',
        story: `หลินอันปฏิเสธประตูสำนักตั้งแต่อายุสิบสอง เขาไม่เคยเปิดรากวิญญาณ ไม่เคยได้รับเคล็ดรวบรวมปราณ และไม่ถูกลากเข้าสู่สงครามบนยอดเขา ${state.flags.mortalPeaceProgress >= 8 ? 'ร้านเล็กและชายคาของเขากลายเป็นที่พักพิงให้ผู้คนในตลาด ' : ''}ชีวิตนี้ไม่ได้ยิ่งใหญ่ในสายตายุทธภพ แต่มีคนกลับบ้านได้จริง`
      },
      nameless_martial: {
        seal: '武', title: 'นักยุทธ์ไร้นาม', quote: '“ผู้ไม่ขึ้นสำนักก็ยังยืนหยัดด้วยสองมือของตนได้”',
        story: `หลินอันไม่รับวิชาบำเพ็ญและไม่อ้างตนเป็นเซียน เขาฝึกกาย ฝึกกระบวนท่า และรับงานที่คนธรรมดาต้องการ ${state.flags.namelessMartialProgress >= 10 ? 'ผู้คนตามเมืองชายแดนเริ่มเรียกหาเขาเมื่อมีผู้รังแกชาวบ้าน ' : ''}ชื่อของเขาไม่อยู่ในทำเนียบสำนัก แต่ไม่ใช่ทุกชื่อที่ต้องอยู่ในนั้น`
      },
      war_shadow_survivor: {
        seal: '影', title: 'ผู้รอดชีวิตจากเงาสงคราม', quote: '“ไม่ใช่ทุกคนที่รอดจากสงครามเพราะถือดาบ”',
        story: `หลินอันเห็นข่าวไฟสงครามผ่านตลาดและถนนไกล โดยไม่ต้องสวมป้ายสำนักหรือรับคำสั่งจากแม่ทัพ เขาช่วยเท่าที่สุขภาพ เงิน และความสัมพันธ์เอื้อ แล้วพาชีวิตของตนผ่านเงาควันออกมาได้`
      },
      new_land_wanderer: {
        seal: '界', title: 'ผู้เดินทางสู่ดินแดนใหม่', quote: '“อนาคตอาจไม่มีคำตอบ แต่ถนนเส้นใหม่เป็นของเราเอง”',
        story: `หลินอันออกจากภูเขาก่อนสงครามจะกลืนชื่อของทุกคน เขาใช้เสบียง เงิน และคนรู้จักที่สร้างขึ้นระหว่างทางเพื่อข้ามแดน ${state.flags.newLandProgress >= 12 ? 'เมืองใหม่รับเขาไว้ในฐานะคนที่สร้างชื่อของตนเอง ไม่ใช่ทายาทที่หลบหนี ' : ''}อดีตยังอยู่ แต่ไม่ใช่ผู้กำหนดทุกก้าวต่อไป`
      },
      death_early: {
        seal: '塵', title: 'เถ้าถ่านที่ไร้ชื่อ',
        quote: '“ในโลกยุทธภพอันกว้างใหญ่ มีเด็กกี่หมื่นคนที่ตายข้างทางก่อนจะได้ยินเสียงระฆังสำนัก”',
        story: state.mode === 'story' && state.characterId === 'lin-an'
          ? `ร่างของเด็กน้อยหยุดหายใจ ${extra.cause ? `เพราะ ${extra.cause}` : 'ก่อนจะได้เติบโตเป็นผู้ฝึกตน'} สายเลือดตระกูลหลินดับสูญอย่างเงียบงัน ชะตานี้จบลงก่อนที่เรื่องราวยุทธภพจะเริ่มต้น`
          : `${state.hero.name} จากไปในวัยเยาว์ ${extra.cause ? `เพราะ ${extra.cause}` : 'ก่อนจะได้เติบโต'} เรื่องราวชีวิตนี้จบลง แต่ความทรงจำของผู้ที่เคยพบพานยังคงอยู่`
      },
      death_battle: {
        seal: '戰', title: 'เถ้ากระดูกหน้ากำแพง',
        quote: '“ความกล้าหาญที่ไร้กำลังหนุนหลัง มักจบลงด้วยกองเลือด”',
        story: extra.cause && extra.cause.includes('ป่าสน')
          ? `${state.hero.name} ชักกระบี่เข้าสู้กลางป่าสนทั้งที่พลังยังไม่ถึงระดับรับมือขุนพลย่อยงูดำ คมดาบและพิษทำให้เขาล้มลงก่อนกลับถึงสำนัก การตายครั้งนี้ไม่ใช่การยืนแนวหน้าครั้งสุดท้าย แต่คือราคาของการฝืนสู้เร็วเกินไป`
          : `${state.hero.name} ชักกระบี่เข้าสู้ด้วยหัวใจภักดี แต่ฐานบำเพ็ญที่ยังไม่แข็งแกร่งพอทำให้ถูกคมดาบของทหารงูดำปลิดชีพตั้งแต่แนวหน้า ร่างของเขากลายเป็นหนึ่งในผู้พลีชีพที่นอนทอดกายใต้กำแพงสำนัก`
      },
      death_escape: {
        seal: '寒', title: 'ลูกศรกลางหิมะ',
        quote: '“หิมะขาวกลบรอยเลือด แต่ไม่อาจลบความเสียดาย”',
        story: `ฝีเท้าของ ${state.hero.name} ช้าเกินไปท่ามกลางพายุหิมะ ลูกศรอาบพิษของหน่วยล่าสังหารงูดำพุ่งทะลุแผ่นหลัง ร่างของเขาทรุดลงจมกองหิมะ เสบียงและแผนที่กระจัดกระจายโดยไม่มีใครตามมาช่วยทัน`
      },
      death_deviation: {
        seal: '劫', title: 'ชีพจรแตกดับ',
        quote: '“เต๋าแห่งสวรรค์ไม่อาจเร่งรัด ผู้ฝืนฟ้ามักถูกฟ้ากลืนกิน”',
        story: `ลมปราณที่ปั่นป่วนย้อนเข้าทำลายหัวใจและชีพจรหลักทั้งเก้า เลือดทะลักออกจากทวารทั้งเจ็ด ${state.hero.name} ล้มลงกลางลานฝึก การทะลวงด่านโดยประมาทปิดฉากเส้นทางเซียนของเขาลงในชั่วพริบตา`
      },
      death_poison: {
        seal: '毒', title: 'พิษชาดกลืนวิญญาณ',
        quote: '“ของวิเศษในป่าลึก หากไร้วาสนาครอบครอง ย่อมกลายเป็นยาพิษปลิดชีพ”',
        story: `พิษร้ายจากผลชาดพันปีกัดกร่อนอวัยวะภายในจนไหม้เกรียม ${state.hero.name} สิ้นใจบนหน้าผาไร้นาม ร่างของเขาเน่าเปื่อยกลายเป็นปุ๋ยแก่พฤกษาพิษ โดยไม่มีศิษย์ร่วมสำนักคนใดรู้เบาะแส`
      },
      death: {
        seal: '終', title: extra.cause ? 'วาระที่ไม่คาดคิด' : 'ดอกเหมยกลางหิมะ',
        quote: '“ชีวิตหนึ่งอาจสั้นดั่งประกายกระบี่ แต่ร่องรอยของมันยาวนานกว่าที่ผู้ถือจะรู้”',
        story: `ร่างของ ${state.hero.name} ล้มลง${extra.cause ? `เพราะ ${extra.cause}` : 'ก่อนเสียงระฆังสุดท้ายจะเงียบ'} ${state.flags.helpedFriend ? 'เฉินหยูรอดชีวิตและนำป้ายไม้ของเจ้าไปฝังใต้ต้นสน เขาเล่าเรื่องบุญคุณครั้งนั้นให้ศิษย์รุ่นหลังฟัง ' : 'สายลมพัดรอยเท้าบนทางเขาจางหายไปทีละน้อย '}บางเส้นทางจบลงก่อนปมใหญ่ของยุทธภพจะคลี่คลาย`
      }
    };

    const echoes = [];
    if (state.flags.retainerAlive) echoes.push('ลุงโจว ผู้พาเจ้าหนีจากคืนตระกูลล่ม ยังมีชีวิตเห็นเด็กที่เคยอุ้มกลายเป็นผู้กำหนดชะตาตนเอง');
    else if (state.flags.loyalRetainer) echoes.push('คำสาบานของลุงโจวยังติดอยู่ในใจ แม้เขาจะหายไปก่อนเห็นจุดจบของหนี้เลือด');
    if (state.flags.loneWanderer) echoes.push('ปีที่เร่ร่อนลำพังสอนให้เจ้ารอดจากสิ่งที่ตำราในสำนักไม่เคยกล่าวถึง');
    if (state.flags.underworldContact) echoes.push('สัญลักษณ์ตลาดมืดจากวัยเด็กทำให้เจ้าอ่านข่าวลือและเส้นทางลับได้เร็วกว่าคนในสำนัก');
    if (state.flags.darkPastFromChildhood) echoes.push('ฤดูหนาวที่เจ้าขโมยเสบียงทิ้งเงามืดไว้ในใจ และทำให้โลกใต้ดินมองเจ้าเป็นคนที่ต่อรองได้');
    if (state.flags.houseEnemyKnown) echoes.push('เสียงของผู้สั่งเผาตระกูลในคืนนั้นเชื่อมอดีตเข้ากับตรางูดำ และทำให้ความจริงไม่ถูกฝังไปพร้อมคนตาย');
    if (state.flags.wenTruthKnown) echoes.push('หลักฐานฉบับต้นล้างข้อสงสัยต่ออาจารย์เหวิน ผู้ส่งยาช่วยผู้รอดชีวิตจากตระกูลหลิน และยืนยันว่าหลัวรับคำสั่งจากชายหน้ากากงูดำ');
    if (state.flags.familyTokenVerified) echoes.push('ป้ายหยกที่เจ้ารักษาไว้กลับมาประกบรอยตราในบัญชีลับ ทำให้มรดกของมารดากลายเป็นพยานของหนี้เลือด');
    if (state.flags.helpedFriend) echoes.push('บุญคุณที่มอบให้เฉินหยูในปีแรก ทำให้เขากลับมายืนข้างเจ้าในวันที่มืดมนที่สุด');
    else echoes.push('การหายไปของเฉินหยูยังคงเป็นคำถามที่ไม่มีผู้ใดตอบได้');
    if (state.flags.masterBondGiven) echoes.push('จี้หยกของอาจารย์เหวินยังอุ่นอยู่ที่อก เตือนว่าชัยชนะนี้เริ่มต้นจากความไว้วางใจ');
    if (state.flags.seniorBondGiven) echoes.push('กระบี่ของเซี่ยหลันช่วยคุมแนวแตกในคืนศึก และทำให้ความสัมพันธ์ของพวกเจ้ากลายเป็นคำมั่นที่จับต้องได้');
    if (state.flags.friendBondGiven) echoes.push('สมุนไพรจากเฉินหยูช่วยฟื้นร่างกายของหลินอันก่อนคืนศึก เป็นคำตอบของบุญคุณที่เริ่มต้นในป่า');
    if (state.flags.masterHealed) echoes.push('โอสถน้ำพุจากผาไร้นามช่วยรักษาชีวิตอาจารย์เหวิน ทำให้สำนักไม่ขาดเสาหลัก');
    else if (state.flags.masterCrippled) echoes.push('อาการบาดเจ็บเรื้อรังของอาจารย์เหวินกลายเป็นแผลลึกที่สั่นคลอนกำลังรบของสำนักจนถึงวันสุดท้าย');
    if (state.flags.shelterBuilt) echoes.push('ครอบครัวผู้ลี้ภัยที่เจ้าเคยรับไว้กลายเป็นรากของชุมชนแห่งใหม่');
    if (state.flags.traitorExposed) echoes.push('เบาะแสที่สะสมมาหลายปีปิดประตูมิให้คนทรยศเปลี่ยนผลศึกได้');
    else echoes.push('ผู้ดูแลหลัวหายไปพร้อมรายชื่อศิษย์และความลับอีกหลายอย่าง');
    if (state.flags.civiliansSaved) echoes.push('ผู้ลี้ภัยและชาวบ้านที่สำนักรับไว้รอดผ่านฤดูหนาว เพราะคำสั่งที่เจ้าเลือกก่อนศึก');
    if (state.flags.forbiddenPower) echoes.push(`พลังต้องห้ามช่วยให้เจ้าผ่านคืนสุดท้าย แต่พรากอายุขัยไปสิบปี—ราคาที่จะติดตาม ${state.hero.name} ไปตลอดชีวิต`);
    if (state.flags.spiritWeapon) echoes.push(`อาวุธวิเศษที่ค้นพบระหว่างทางเพิ่มพลังให้เจ้า แต่ก็เปลี่ยนสายตาที่ผู้คนมอง ${state.hero.name}`);
    if (state.flags.betrayedSect) echoes.push('ตรางูดำในมือคือหลักฐานว่าการล่มสลายของสำนักไม่ได้เกิดจากศัตรูภายนอกเพียงอย่างเดียว');

    const dominant = Object.entries(state.paths).sort((a, b) => b[1] - a[1])[0];
    const pathNames = { compassion: 'เมตตา', duty: 'ภักดี', freedom: 'อิสระ', insight: 'หยั่งรู้' };
    const characterStory = extra.characterStory;
    const e = characterStory ? { ...(endings[type] || endings.death), ...characterStory } : (endings[type] || endings.death);
    const grade = endingGrade(type, extra);
    const combat = syncCombat(state);

    $('ending-seal').textContent = e.seal;
    $('ending-title').textContent = e.title;
    $('ending-quote').textContent = e.quote;

    const gradeEl = $('ending-grade');
    gradeEl.className = `ending-grade ${grade.cssClass || ''}`;
    gradeEl.innerHTML = `<small>เกรด Achievement</small><b>${grade.mark} · ${grade.name}</b><small>คะแนน ${grade.score} · ราก ${state.hero.rootKnown ? (ROOTS[state.hero.root]?.name || 'ไม่ทราบ') : 'ยังไม่เปิดเผย'}</small>`;
    const achievement = $('ending-achievement');
    achievement.className = `ending-achievement ${grade.cssClass}`;
    const endingArt = { quiet_roof: 'wanderer_lone', nameless_martial: 'wanderer_lone', war_shadow_survivor: 'wanderer_exodus', new_land_wanderer: 'wanderer_lone' };
    $('achievement-art').src = `assets/ending/${endingArt[type] || type}.png`;
    $('achievement-mark').textContent = e.seal;
    $('achievement-title').textContent = e.title;
    $('achievement-grade').textContent = `${grade.name} · ${grade.score} คะแนน`;

    const rarity = grade.rarity || calculateEndingRarity(type, state, extra);
    $('rarity-fraction').textContent = `1 ใน ${rarity.oneIn.toLocaleString()} คน`;
    $('rarity-pct').textContent = `(ความน่าจะเป็น ~${rarity.pct}) · ${rarity.category}`;

    const simulationText = extra.simulationResult ? `\n\nผลจำลองอนาคต\nบทบาทที่เหมาะสม: ${extra.simulationResult.role}\nจำลองต่ออีก ${extra.simulationResult.horizonMonths} เดือน · โอกาสสำเร็จ ${extra.simulationResult.success}%\nรางวัล: ปราณ +${extra.simulationResult.rewards.cultivation} · เงิน +${extra.simulationResult.rewards.money} · ความหยั่งรู้ +${extra.simulationResult.rewards.insight}` : '';
    const freeDeath = state.mode === 'free' && type.startsWith('death');
    const storyLead = freeDeath && type !== 'death_early'
      ? `${state.hero.name} สิ้นลมหายใจ${extra.cause ? `: ${extra.cause}` : 'หลังผ่านเรื่องราวมากมายในยุทธภพ'} ความทรงจำของชีวิตนี้ยังคงอยู่กับผู้ที่เคยพบพาน`
      : characterStory || state.mode === 'free' ? e.story : `${e.story}\n\n${rootEndingNarrative(type)}`;
    const storyEchoes = state.mode === 'story' ? `\n\nร่องรอยจากการตัดสินใจ:\n• ${echoes.join('\n• ')}` : '';
    $('ending-story').textContent = `${storyLead}${storyEchoes}\n\nแนวทางที่เด่นที่สุดของชีวิตนี้คือ “${pathNames[dominant[0]]}” (${dominant[1]}) จากการตัดสินใจสำคัญ ${Object.keys(state.choices || {}).length} ครั้ง${extra.battleScore ? ` · กำลังรบรวมวันศึก ${extra.battleScore.toLocaleString()}` : ''}${simulationText}`;
    $('ending-stats').innerHTML = `<div><small>อายุ</small><b>${formatAge(state.hero.ageMonths)}</b></div><div><small>ขั้นบำเพ็ญ</small><b>${realmName(state.hero)}</b></div><div><small>รากวิญญาณ</small><b>${state.hero.rootKnown ? (ROOTS[state.hero.root]?.name || 'ไม่ทราบ') : 'ยังไม่เปิดเผย'}</b></div><div><small>พลังรวม</small><b>${state.hero.power.toLocaleString()}</b></div><div><small>โจมตี / ป้องกัน</small><b>${combat.attack} / ${combat.defense}</b></div><div><small>กายา / ว่องไว</small><b>${combat.body} / ${combat.agility}</b></div><div><small>ชื่อเสียง</small><b>${state.hero.reputation}</b></div><div><small>แนวทางเด่น</small><b>${pathNames[dominant[0]]}</b></div>${Object.entries(pathNames).map(([key, label]) => `<div><small>${label}</small><b>${state.paths[key] || 0}</b></div>`).join('')}`;
    const lineage = state.lineageState;
    const simulationReward = extra.simulationResult?.rewards;
    const signature = state.lifeSummary?.deathSignature ? (DEATH_SIGNATURES[state.lifeSummary.deathSignature] || state.lifeSummary.deathSignature) : 'ยังไม่เกิดลายเซ็น';
    $('life-summary-meta').innerHTML = `<div><small>จำนวนชีวิตในสายนี้</small><b>${1 + (state.lifeHistory || []).length}</b></div><div><small>กฎชีวิต</small><b>${Object.values(LIFE_RULES).find(rule => rule.id === state.ruleSet)?.name || state.ruleSet || 'หนึ่งชีวิต'}</b></div><div><small>ตัวละคร</small><b>${STORY_CHARACTERS[state.characterId]?.title || state.characterId || 'ชีวิตอิสระ'}</b></div><div><small>ลายเซ็นความตาย</small><b>${signature}</b></div>${state.flags.unluckyOriginName ? `<div><small>ต้นกำเนิดสุ่ม</small><b>${state.flags.unluckyOriginName}</b></div>` : ''}${lineage ? `<div><small>รุ่นตระกูล</small><b>${lineage.generation} · ระดับ ${lineage.stage}</b></div><div><small>คลังตระกูล</small><b>${lineage.treasury} ตำลึง</b></div><div><small>ชื่อเสียงตระกูล</small><b>${lineage.prestige}</b></div>` : ''}${simulationReward ? `<div><small>รางวัลจำลอง</small><b>ปราณ +${simulationReward.cultivation}</b></div>` : ''}`;
    renderEndingTimeline();
    const meta = recordAchievement(type, grade);
    $('ending-unlock').textContent = `ค้นพบบทจบแล้ว ${meta.endings.length} / ${CODEX_DEFINITIONS.length} รูปแบบในสมุดบันทึกชะตา`;
  }

  // แสดงผล Destiny Codex Modal
  function renderCodexModal() {
    const meta = getMeta();
    const grid = $('codex-grid');
    grid.innerHTML = '';
    const testedCount = CODEX_DEFINITIONS.filter(def => endingAvailability(def.id, meta).tested).length;
    $('codex-progress-text').textContent = `ตราประทับที่ค้นพบ ${meta.endings.length} / ${CODEX_DEFINITIONS.length} ชะตา · เล่นจริงแล้ว ${testedCount}`;

    CODEX_DEFINITIONS.forEach(def => {
      const unlocked = meta.endings.includes(def.id);
      if (!unlocked) {
        const card = document.createElement('div');
        card.className = 'codex-card locked codex-blackout';
        card.setAttribute('aria-label', 'ยังไม่ค้นพบบทจบนี้');
        grid.appendChild(card);
        return;
      }
      const best = meta.grades[def.id];
      const card = document.createElement('div');
      const frameClass = best ? GRADE_DEFINITIONS[best.rank].cssClass : 'achievement-black';
      const achievementName = ACHIEVEMENT_NAMES[def.id] || def.title;
      card.className = `codex-card unlocked ${frameClass}`;
      card.title = `บทจบ: ${def.title}\nเงื่อนไข: ${def.hint}`;
      card.innerHTML = `
        <div class="codex-seal">${unlocked ? def.mark : '?'}</div>
        <div class="codex-info">
          <strong>${def.title}</strong>
          <small class="achievement-name">${achievementName}</small>
          <small>${def.desc}</small>
          <em>${best ? `Achievement: ${best.name} · ${best.score} คะแนน · ` : ''}ความหายาก: ${def.rarity}</em>
        </div>
        <div class="codex-tooltip"><b>${achievementName}</b><span>บทจบ: ${def.title}</span><span>เงื่อนไข: ${def.hint}</span></div>
      `;
      grid.appendChild(card);
    });
    $('codex-modal').hidden = false;
  }

  function getFreeModeLifeGoal(s) {
    const age = Number(s.hero?.ageMonths || 0);
    const postWar = s.world.worldMonth > MAX_MONTHS ? ` · หลังศึกเมฆาคราม (${s.world.worldMonth - MAX_MONTHS} ด.)` : '';
    if (age < 24) {
      return {
        chapter: `ก้าวแรกแห่งชีวิต · วัยทารก${postWar}`,
        title: 'เติบโตรอดพ้นวัยทารก',
        text: 'กินอิ่ม นอนหลับ รักษาสุขภาพให้แข็งแรง และพึ่งพาผู้ดูแลในเรือนให้ปลอดภัย'
      };
    }
    if (age < 60) {
      return {
        chapter: `วัยเยาว์ · ก้าวแรกสู่โลกกว้าง${postWar}`,
        title: 'ฟูมฟักร่างกายและสติปัญญา',
        text: 'เล่นซุกซน รู้จักคนรอบข้าง และวางรากฐานสุขภาพและจิตใจที่ดี'
      };
    }
    if (age < 144) {
      return {
        chapter: `วัยเด็ก · สั่งสมวิชาและช่วยงาน${postWar}`,
        title: 'ช่วยงานเรือนและค้นหาความถนัด',
        text: 'ช่วยงานในเรือน คัดอักษร และเตรียมความพร้อมเพื่อก้าวสู่อาชีพที่ตนเลือก'
      };
    }

    // Youth (144-179) and Adult (180+)
    const job = s.household?.job || 'odd_jobs';
    const money = Number(s.hero?.money || 0);
    const materials = s.materials || {};
    const crafting = s.crafting || { knowledge: {}, equipment: [] };
    const buildings = s.family?.buildings || [];
    const ownedHouses = s.household?.ownedProperties || [];
    const realm = Number(s.hero?.realm || 0);
    const power = Number(s.hero?.power || 0);

    // 1. Farmer / Herb Gatherer
    if (job === 'farmer' || (s.materialLife?.farmMonths || 0) > 6) {
      const hasGarden = buildings.includes('herb_garden');
      if (!hasGarden) {
        return {
          chapter: `วิถีกสิกรรม · ผู้ปลูกแห่งผืนดิน${postWar}`,
          title: 'สร้างแปลงสมุนไพรในเรือน',
          text: 'สะสมทุนรอนเพื่อปลูกแปลงสมุนไพรประจำเรือนตระกูล เพิ่มผลผลิตสมุนไพรต่อเนื่อง'
        };
      }
      if ((materials.herb || 0) < 15) {
        return {
          chapter: `วิถีกสิกรรม · คัดเกรดสมุนไพร${postWar}`,
          title: 'เพาะพันธุ์สมุนไพรชั้นดี',
          text: 'บำรุงสวนสมุนไพรอย่างต่อเนื่อง สะสมสมุนไพรและคัดเกรดสมุนไพรหายากส่งตลาด'
        };
      }
      return {
        chapter: `วิถีกสิกรรม · คลังเสบียงชุมชน${postWar}`,
        title: 'คลังเสบียงและสมุนไพรของเมือง',
        text: 'ขยายผลผลิตสู่ตลาด ช่วยบรรเทาความขาดแคลนและโรคระบาดในดินแดน'
      };
    }

    // 2. Healer / Alchemist
    if (job === 'physician' || (crafting.knowledge?.alchemy || 0) >= 2 || crafting.equipment?.includes('alchemy_stove')) {
      const hasStove = crafting.equipment?.includes('alchemy_stove');
      const alchemyLvl = crafting.knowledge?.alchemy || 0;
      if (!hasStove) {
        return {
          chapter: `วิถีโอสถ · เมตตาเยียวยา${postWar}`,
          title: 'จัดหาเตาปรุงยาประจำเรือน',
          text: 'สะสมเงินและสมุนไพร ซื้อเตาปรุงยาเพื่อเริ่มหลอมโอสถฟื้นฟูและถอนพิษ'
        };
      }
      if (alchemyLvl < 3) {
        return {
          chapter: `วิถีโอสถ · ศึกษาตำรับยา${postWar}`,
          title: 'ยกระดับความรู้ปรุงยาสู่ระดับ 3',
          text: 'ศึกษาความรู้ปรุงยาหรือลงมือสกัดโอสถให้ชำนาญ สามารถปรุงยาเกรดสูงขึ้น'
        };
      }
      return {
        chapter: `วิถีโอสถ · หมอเทวดาผู้พิทักษ์ชีพ${postWar}`,
        title: 'รักษาโรคภัยและขจัดพิษร้าย',
        text: 'ปรุงโอสถชั้นสูง คอยรักษาชีวิตผู้คนในครอบครัวและขจัดโรคร้ายให้ชาวเมือง'
      };
    }

    // 3. Artisan / Crafter
    if (job === 'artisan' || (crafting.knowledge?.smithing || 0) >= 2 || (crafting.knowledge?.tools || 0) >= 2 || crafting.equipment?.includes('forge') || crafting.equipment?.includes('workbench')) {
      const hasForge = crafting.equipment?.includes('forge');
      const hasBench = crafting.equipment?.includes('workbench');
      const smithLvl = Math.max(crafting.knowledge?.smithing || 0, crafting.knowledge?.tools || 0);
      if (!hasForge && !hasBench) {
        return {
          chapter: `วิถีเชิงช่าง · สรรค์สร้างสรรพสิ่ง${postWar}`,
          title: 'จัดตั้งเตาตีเหล็กหรือโต๊ะช่าง',
          text: 'สะสมเงินและแร่เหล็ก ซื้อเตาตีเหล็กหรือโต๊ะช่างเพื่อเริ่มรังสรรค์อุปกรณ์'
        };
      }
      if (smithLvl < 3) {
        return {
          chapter: `วิถีเชิงช่าง · ฝึกปรือทักษะ${postWar}`,
          title: 'ยกระดับความรู้ช่างสู่ระดับ 3',
          text: 'สร้างเครื่องมือ ตีอาวุธ หรือศึกษาความรู้ช่างให้ชำนาญเพื่อสร้างของระดับสูง'
        };
      }
      return {
        chapter: `วิถีเชิงช่าง · ปรมาจารย์หัตถศิลป์${postWar}`,
        title: 'รังสรรค์ยอดศาสตราและชุดเกราะ',
        text: 'หลอมสร้างอุปกรณ์ชั้นเลิศ เสริมกำลังการป้องกันให้เมืองและทิ้งชื่อไว้ในแผ่นดิน'
      };
    }

    // 4. Merchant
    if (job === 'merchant' || (money >= 35 && (s.materialLife?.tradeMonths || 0) > 3)) {
      const hasOwnHouse = ownedHouses.includes('owned') || ownedHouses.includes('estate');
      if (money < 45) {
        return {
          chapter: `วิถีพาณิชย์ · กงล้อการค้า${postWar}`,
          title: 'สะสมทุนรอนก้อนแรก (45 ตำลึง)',
          text: 'ทำบัญชีการค้า ซื้อขายวัตถุดิบทำกำไร และสะสมเงินเพื่อตั้งหลักแหล่งถาวร'
        };
      }
      if (!hasOwnHouse) {
        return {
          chapter: `วิถีพาณิชย์ · ตั้งหลักปักฐาน${postWar}`,
          title: 'ซื้อบ้านของตนเองเพื่อความมั่นคง',
          text: 'ใช้เงินกำไรจากการค้าซื้อขาดบ้านของตนเอง ปลดเปลื้องภาระค่าเช่ารายเดือน'
        };
      }
      return {
        chapter: `วิถีพาณิชย์ · คหบดีผู้มั่งคั่ง${postWar}`,
        title: 'สั่งสมทรัพย์สินสู่มหาเศรษฐี (100 ตำลึง)',
        text: 'ขยายเส้นทางการค้า คุมกลไกตลาด และสร้างกองคาราวานที่มั่นคง'
      };
    }

    // 5. Hunter / Wanderer
    if (job === 'hunter' || job === 'guard' || s.flags?.foundMap || (s.materialLife?.huntMonths || 0) > 3) {
      if (!s.flags?.foundMap) {
        return {
          chapter: `วิถีพเนจร · ผู้ท่องพงไพร${postWar}`,
          title: 'แกะรอยป่าเขาและค้นหาเส้นทางลับ',
          text: 'ออกล่าสัตว์ รวบรวมวัตถุดิบ และสำรวจค้นหาแผนที่ทางลับรอบเมือง'
        };
      }
      if ((materials.beast || 0) < 10) {
        return {
          chapter: `วิถีพเนจร · ปราบสัตว์อสูร${postWar}`,
          title: 'ล่าวัตถุดิบสัตว์ชั้นดี',
          text: 'ออกล่าในเขตป่าลึก รวบรวมวัตถุดิบสัตว์ชั้นเลิศ และกำจัดภัยคุกคามรอบนอก'
        };
      }
      return {
        chapter: `วิถีพเนจร · ผู้เปิดแดนกว้าง${postWar}`,
        title: 'สำรวจเส้นทางข้ามแดนและคุ้มครองผู้คน',
        text: 'เดินทางสู่เมืองใหม่ สำรวจพื้นที่อันตราย และคุ้มกันคาราวานให้ปลอดภัย'
      };
    }

    // 6. Martial Artist / Cultivator
    if (s.activity === 'train' || realm >= 1 || power >= 100 || (s.techniques && s.techniques.length > 0)) {
      if (realm === 0) {
        return {
          chapter: `วิถียุทธ์ · บำเพ็ญกายา${postWar}`,
          title: 'ขัดเกลาร่างกายสู่ขั้นหลอมกาย',
          text: 'ฝึกฝนร่างกาย โคจรลมหายใจ และฝึกวิชาต่อสู้เพื่อเปิดทางสู่ขั้นบำเพ็ญ'
        };
      }
      if (realm === 1) {
        return {
          chapter: `วิถียุทธ์ · ทะลวงขีดจำกัด${postWar}`,
          title: 'ทะลวงสู่ขั้นรวบรวมลมปราณ',
          text: 'เสริมรากฐานให้มั่นคง สะสมโอสถ และทะลวงผ่านคอขวดสู่ขั้นที่สอง'
        };
      }
      return {
        chapter: `วิถียุทธ์ · ยอดคนแห่งยุค${postWar}`,
        title: 'สร้างชื่อเสียงในยุทธภพ',
        text: 'บรรลุเพลงยุทธ์ขั้นสูง ทะลวงขั้นบำเพ็ญ และใช้วิชาปกป้องสิ่งที่ตนรัก'
      };
    }

    // Default: Commoner Life
    if (money < 20) {
      return {
        chapter: `วิถีสามัญ · หนึ่งชีวิตใต้ฟ้ากว้าง${postWar}`,
        title: 'สร้างความมั่นคงในชีวิตประจำวัน',
        text: 'ทำงานสร้างรายได้ รักษาสุขภาพ และหลีกเลี่ยงการก่อหนี้สิน'
      };
    }
    return {
      chapter: `วิถีสามัญ · เลือกเส้นทางชีวิต${postWar}`,
      title: 'ต่อยอดทักษะสู่เส้นทางที่ต้องการ',
      text: 'เมื่อมีทุนรอนพร้อม จงเลือกฝึกฝนวิชาช่าง ปรุงยา ทำการค้า หรือฝึกวิชาต่อสู้'
    };
  }

  function render() {
    if (!state) return; const h = state.hero, combat = syncCombat(state);
    const character = STORY_CHARACTERS[state.characterId];
    const lifeRole = character ? character.title : state.mode === 'free' ? 'ชีวิตอิสระ' : 'ผู้พเนจร';
    const generation = state.lineageState?.generation ? ` · รุ่นที่ ${state.lineageState.generation}` : '';
    $('hero-display-name').textContent = h.name || character?.name || 'ผู้พเนจร'; $('hero-subtitle').textContent = `${lifeRole}${generation} · ${realmName(h)}`; $('root-display').textContent = h.rootKnown ? `รากวิญญาณ${ROOTS[h.root]?.name || 'ไม่ทราบ'} · ${TALENTS[h.talent]?.name || 'พรสวรรค์สามัญ'}` : 'รากวิญญาณยังไม่ถูกตรวจพบ · สถานะปกปิด';
    $('age-stat').textContent = `${formatAge(h.ageMonths)} (${annualLifePhase(state).name})`; $('lifespan-stat').textContent = formatAge(Math.round(Number(h.lifespanMonths ?? h.lifespan * 12)));
    const worldMonth = state.world?.worldMonth ?? state.month;
    const worldYr = Math.floor(worldMonth / 12) + 1;
    const worldMo = (worldMonth % 12) + 1;
    const topbarClock = $('topbar-clock-text');
    if (topbarClock) topbarClock.textContent = `โลก ปี ${worldYr} ด.${worldMo} · อายุ ${formatAge(h.ageMonths)}`;
    const worldCalendarStat = $('world-calendar-stat');
    if (worldCalendarStat) worldCalendarStat.textContent = `🌏 โลก: ปี ${worldYr} เดือน ${worldMo} (เดือนรวม ${worldMonth})`;
    const characterMonthStat = $('character-month-stat');
    if (characterMonthStat) characterMonthStat.textContent = `👤 ชีวิต: ${formatAge(h.ageMonths)} (เดือนที่ ${h.ageMonths || 0})`;
    const topbarAutoControls = $('topbar-auto-controls');
    if (topbarAutoControls) topbarAutoControls.hidden = !state.autoMode;

    const chipsBar = $('status-chips-bar');
    if (chipsBar) {
      chipsBar.replaceChildren();
      const chips = [];
      if (state.conditions?.poison?.monthsLeft) {
        const chip = document.createElement('span');
        chip.className = 'status-chip poison-chip';
        chip.textContent = `☠️ ติดพิษ (-${state.conditions.poison.damage || 3}/ด. อีก ${state.conditions.poison.monthsLeft}ด.)`;
        chips.push(chip);
      }
      if (state.pillEffect?.usesLeft) {
        const chip = document.createElement('span');
        chip.className = 'status-chip buff-chip';
        chip.textContent = `✨ ยาบำรุง (${state.pillEffect.name} เหลือ ${state.pillEffect.usesLeft} ครั้ง)`;
        chips.push(chip);
      }
      if (state.poisonCoating?.usesLeft) {
        const chip = document.createElement('span');
        chip.className = 'status-chip buff-chip';
        chip.textContent = '🛡️ เคลือบยาสลบพร้อมใช้';
        chips.push(chip);
      }
      const fatigue = state.household?.fatigue || 0;
      if (fatigue >= 6) {
        const chip = document.createElement('span');
        chip.className = 'status-chip fatigue-chip';
        chip.textContent = `⚡ เหนื่อยล้า (${fatigue}/10)`;
        chips.push(chip);
      }
      if (h.health <= h.maxHealth * 0.3) {
        const chip = document.createElement('span');
        chip.className = 'status-chip risk-chip';
        chip.textContent = `⚠️ วิกฤต (${Math.round(h.health)}/${h.maxHealth})`;
        chips.push(chip);
      }
      if ((state.household?.debt || 0) > 0) {
        const chip = document.createElement('span');
        chip.className = 'status-chip debt-chip';
        chip.textContent = `💰 หนี้สิน ${state.household.debt} ตำลึง`;
        chips.push(chip);
      }
      if (state.mode === 'story' && state.month >= 136) {
        const chip = document.createElement('span');
        chip.className = 'status-chip war-chip';
        chip.textContent = '⚔️ เมฆาครามใกล้ปะทะ';
        chips.push(chip);
      }
      if (chips.length === 0) {
        const chip = document.createElement('span');
        chip.className = 'status-chip normal-chip';
        chip.textContent = '🍃 สภาพร่างกายปกติ';
        chips.push(chip);
      }
      chips.forEach(c => chipsBar.appendChild(c));
    }
    $('health-label').textContent = `${Math.round(h.health)} / ${h.maxHealth}`; $('health-bar').style.width = `${100 * h.health / h.maxHealth}%`;
    const conditionLabel = $('health-conditions'); if (conditionLabel) conditionLabel.textContent = state.conditions?.poison?.monthsLeft ? `ติดพิษ: สุขภาพ -${state.conditions.poison.damage || 3}/เดือน อีก ${state.conditions.poison.monthsLeft} เดือน` : '';
    ensureQiState(state); $('qi-label').textContent = `${Math.round(h.qi)} / ${Math.round(h.qiMax)}`; $('qi-bar').style.width = `${h.qiMax ? 100 * h.qi / h.qiMax : 0}%`;
    $('cultivation-label').textContent = !h.cultivationAccess ? `ยังไม่เปิดทางบำเพ็ญ · พื้นฐานกาย ${h.bodyFoundation}/100` : cultivationAtCeiling(state) ? `ถึงเพดาน ${cultivationCeilingName(equippedCultivationTechnique(state))} · เปลี่ยนวิชาเพื่อฝึกต่อ` : h.realm === REALMS.length && h.stage === 9 ? 'บรรลุขั้นสูงสุด' : `${Math.round(h.cultivation)} / 100 → ${h.stage === 9 ? REALMS[h.realm] : `${REALMS[h.realm - 1]} ขั้น ${h.stage + 1}`}`; $('cultivation-bar').style.width = `${h.cultivationAccess ? h.cultivation : h.bodyFoundation}%`;
    $('money-stat').textContent = h.money; $('power-stat').textContent = h.power.toLocaleString();
    $('power-stat').title = `ฐานขั้นบำเพ็ญ ${combat.realmPower.toLocaleString()} + สถิติ ${combat.statsPower.toLocaleString()} + พลังเสริม ${Math.max(0, Number(h.powerBonus) || 0)} · พลังอุปกรณ์ด้านร่างกายตามวัย ${Math.round(combat.equipmentMaturity * 100)}%`;
    $('rep-stat').textContent = h.reputation; $('attack-stat').textContent = combat.attack; $('attack-stat').title = combat.compatibility ? `${combat.compatibility.technique} เข้ากับ ${combat.compatibility.weapon} · โจมตี ×1.10` : 'สวมอาวุธที่เข้ากับวิชาจู่โจมเพื่อเพิ่มโจมตี ×1.10'; $('defense-stat').textContent = combat.defense; $('body-stat').textContent = combat.body; $('agility-stat').textContent = combat.agility; $('training-stat').textContent = `${combat.training}%`; $('training-stat').title = h.rootKnown ? `รากวิญญาณช่วยเพิ่มความเร็วบำเพ็ญ ×${ROOT_TRAINING_MULTIPLIER[h.root] ?? 1} เมื่อฝึกด้วยวิชาบำเพ็ญ` : 'รากวิญญาณยังไม่ถูกตรวจพบ';
    const attrs = combat.attributes || h.attributes || {};
    $('attr-body-stat').textContent = Math.round(attrs.body || combat.body);
    $('attr-intellect-stat').textContent = Math.round(attrs.intellect || 0);
    $('attr-spirit-stat').textContent = Math.round(attrs.spirit || 0);
    $('attr-charm-stat').textContent = Math.round(attrs.charm || 0);
    $('attr-luck-stat').textContent = Math.round(attrs.luck || 0);
    $('karma-stat').textContent = Math.round(combat.karma ?? h.karma ?? 0);
    $('body-foundation-stat').textContent = Math.round(h.bodyFoundation || 0); $('body-foundation-stat').title = `พื้นฐานกายช่วยทะลวงขั้น ลดความเสี่ยงบาดเจ็บจากการฝึก และช่วยความก้าวหน้าขั้นหลอมกาย`; 
    $('martial-skill-stat').textContent = Math.round(h.martialSkill || 0); $('martial-skill-stat').title = `เพิ่มโบนัสโจมตีของวิชาต่อสู้ที่ติดตั้ง ${Math.round(martialSkillBonus(state) * 100)}% (ทุก 10 จุดเพิ่ม 2% สูงสุด 20%)`;
    $('discipline-stat').textContent = Math.round(h.discipline || 0); $('discipline-stat').title = `วินัยเพิ่มโอกาสทะลวง ${disciplineBenefits(state).breakthroughBonus} จุดเปอร์เซ็นต์ และช่วยการฝึกวิชาเดิมต่อเนื่อง`; 
    const monthsLeftText = state.mode === 'story' && state.characterId === 'lin-an' ? `${Math.max(0, MAX_MONTHS - state.month)} เดือน` : (state.world.worldMonth <= MAX_MONTHS ? `${MAX_MONTHS - state.world.worldMonth} เดือนก่อนศึก` : `หลังศึกเมฆาคราม (${state.world.worldMonth - MAX_MONTHS} เดือน)`); $('months-left').textContent = monthsLeftText; $('weather-text').textContent = `${weather()} · เดือน ${state.month + 1} ปี ${Math.floor(state.month / 12) + 1}`;
    ['compassion', 'duty', 'freedom', 'insight'].forEach(key => { $(`path-${key}`).textContent = state.paths[key] || 0; });
    const actDisplayCurrent = getActivityDisplayName(state, state.activity);
    const activityName = actDisplayCurrent.name;
    const craftNote = state.activity === 'craft' ? ` · ${state.lastCraftMonth === state.month ? 'ทำแล้วในเดือนนี้' : 'สิทธิ์พร้อมใช้'}` : '';
    $('activity-badge').textContent = activityName; $('current-activity-note').textContent = `กำลัง${activityName}${craftNote}`; $('location-name').textContent = currentLocation();
    document.querySelectorAll('.activity-card').forEach(b => {
      const activity = b.dataset.activity, availability = activityAvailability(state, activity);
      b.hidden = false; b.disabled = !availability.ok; b.classList.toggle('activity-locked', !availability.ok);
      const isCurrent = activity === state.activity;
      b.title = availability.ok ? (isCurrent ? 'กิจกรรมหลักประจำเดือนปัจจุบัน (ใช้เวลาเดินเดือนละ 1 ครั้ง)' : 'สลับเป็นกิจกรรมหลักประจำเดือน (ใช้เวลา 1 เดือน)') : availability.reason;
      const actInfo = getActivityDisplayName(state, activity);
      const strong = b.querySelector('strong'); if (strong) strong.textContent = actInfo.name;
      const small = b.querySelector('small');
      if (small) {
        small.dataset.defaultText ||= small.textContent;
        if (!availability.ok) small.textContent = `🔒 ${availability.reason}`;
        else if (activity === 'craft') small.textContent = state.lastCraftMonth === state.month ? 'ใช้สิทธิ์เดือนนี้แล้ว' : (actInfo.desc || small.dataset.defaultText);
        else small.textContent = actInfo.desc || small.dataset.defaultText;
      }
      const previewEl = b.querySelector('b');
      if (previewEl) {
        if (!availability.ok) {
          previewEl.className = 'act-lock-hint';
          previewEl.textContent = `🔒 ${availability.reason}`;
        } else {
          previewEl.className = 'act-preview-cost';
          if (activity === 'train') previewEl.textContent = h.cultivationAccess ? '+บำเพ็ญ (ใช้ปราณ)' : '+พื้นฐานกาย (เหนื่อย+15)';
          else if (activity === 'work') {
            const j = JOB_DEFS.find(item => item.id === (state.household?.job || 'apprentice')) || JOB_DEFS[0];
            previewEl.textContent = `+${j.income} ตำลึง (เหนื่อย+20)`;
          } else if (activity === 'rest') {
            const r = restRoute(state);
            previewEl.textContent = `ฟื้น +${r.heal} HP / +${r.qi} ปราณ`;
          } else if (activity === 'explore') {
            const r = explorationRoute(state);
            previewEl.textContent = `เสี่ยง ${Math.round(r.risk)}% · วัตถุดิบ`;
          } else if (activity === 'study') {
            previewEl.textContent = '+ปัญญา · ศึกษาตำรา';
          } else if (activity === 'social') {
            const r = socialRoute(state);
            previewEl.textContent = `+${r.reputation} ชื่อเสียง (-${r.cost}ตำลึง)`;
          } else if (activity === 'craft') {
            previewEl.textContent = state.lastCraftMonth === state.month ? 'ใช้สิทธิ์เดือนนี้แล้ว' : 'สิทธิ์สร้าง 1 ครั้ง/ด.';
          } else if (activity === 'family') {
            previewEl.textContent = '+ผูกพันครอบครัว';
          } else if (activity === 'quest') {
            previewEl.textContent = 'ดำเนินเควส';
          } else if (activity === 'sect') {
            previewEl.textContent = '+ผลงานสำนัก/ราชการ';
          } else if (activity === 'travel') {
            previewEl.textContent = 'เดินทางสู่เป้าหมาย';
          } else if (activity === 'free') {
            previewEl.textContent = 'ตามกระแสชะตา';
          } else {
            previewEl.textContent = actInfo.gain || '';
          }
        }
      }
    });
    const sectDefenseHint = $('sect-defense-hint');
    if (sectDefenseHint) {
      sectDefenseHint.textContent = state.month < 84
        ? '(ช่วงวัยเยาว์: มุ่งเน้นการเอาตัวรอดและสร้างรากฐานชีวิต)'
        : state.month < 120
        ? '(ช่วงเข้าสำนัก: ฝึกฝนฝีมือและสร้างสายสัมพันธ์)'
        : state.month < 136
        ? '(ช่วงก่อนศึก: สังเกตความเคลื่อนไหวและสะสมกำลัง)'
        : '(ช่วงวิกฤต: ชะตากรรมของสำนักใกล้ถึงจุดตัดสิน)';
    }
    $('hero-sprite').className = `pixel-hero ${ACTIVITY[state.activity].className}`;
    $('scene').className = `scene ${state.activity === 'explore' ? 'scene-forest' : state.month < 84 || state.activity === 'work' ? 'scene-village' : 'scene-sect'}`;
    document.querySelectorAll('.activity-card').forEach(b => b.classList.toggle('selected', b.dataset.activity === state.activity));
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === state.speed));
    $('pause-btn').textContent = state.paused ? '▶' : 'Ⅱ'; $('pause-btn').setAttribute('aria-label', state.paused ? 'เดินเวลา' : 'หยุดเวลา');
    const growBtn = $('grow-phase-btn');
    if (growBtn) {
      const ageMonths = Number(h.ageMonths || 0);
      let nextPhaseName = '';
      let targetDiff = 0;
      if (ageMonths < 24) {
        nextPhaseName = 'วัยเด็กเล็ก (อายุ 2 ปี)';
        targetDiff = 24 - ageMonths;
      } else if (ageMonths < 60) {
        nextPhaseName = 'วัยเด็กโต (อายุ 5 ปี)';
        targetDiff = 60 - ageMonths;
      } else if (ageMonths < 144) {
        nextPhaseName = 'วัยหนุ่มสาว (อายุ 12 ปี)';
        targetDiff = 144 - ageMonths;
      } else if (ageMonths < 180) {
        nextPhaseName = 'วัยผู้ใหญ่ (อายุ 15 ปี)';
        targetDiff = 180 - ageMonths;
      } else {
        nextPhaseName = '1 ปี (+12 เดือน)';
        targetDiff = 12;
      }
      growBtn.textContent = `🌱 สู่${nextPhaseName}`;
      growBtn.title = `เดินเวลาจำลองทีละเดือนอย่างปลอดภัยไปข้างหน้า ${targetDiff} เดือน (หยุดทันทีเมื่อมีเหตุการณ์หรืออันตราย)`;
      growBtn.disabled = !!state.pendingEvent || !!state.ending;
    }
    const autoBtn = $('auto-btn'); if (autoBtn) { autoBtn.classList.toggle('active', !!state.autoMode); autoBtn.textContent = state.autoMode ? 'AUTO ✓' : 'AUTO'; }
    const autoSelect = $('auto-activity-select'); if (autoSelect) { ensureAutoSchedule(state); autoSelect.value = state.autoSchedule[state.month % 12] || state.autoActivity || 'train'; autoSelect.title = `กำหนดกิจกรรมอัตโนมัติสำหรับเดือนที่ ${state.month + 1}`; Array.from(autoSelect.options).forEach(option => { option.disabled = !activityAvailability(state, option.value).ok; }); }
    const autoFreeRuleSelect = $('auto-free-rule-select'); if (autoFreeRuleSelect) { const rule = ensureAutoFreeRule(state); autoFreeRuleSelect.value = rule.enabled ? rule.policy : 'off'; autoFreeRuleSelect.disabled = state.mode === 'story'; }
    const mobileActivity = $('activity-mobile-select'); if (mobileActivity) { mobileActivity.value = state.activity; Array.from(mobileActivity.options).forEach(option => { const availability = activityAvailability(state, option.value); option.disabled = !availability.ok; option.title = availability.reason; }); }
    const doctrineSelect = $('auto-doctrine-select'); if (doctrineSelect) doctrineSelect.value = state.autoDoctrine || 'survive';
    const familyRuleSelect = $('auto-family-rule-select'); if (familyRuleSelect) familyRuleSelect.value = ensureAutoFamilyRule(state);
    renderRestControls();
    renderExplorationControls();
    renderWorkControls();
    renderSocialControls();
    renderOfficialControls();
    renderTravelControls();
    renderTrainingControls();
    renderLearningControls();
    if (state.mode === 'story') {
      const chapter = state.month < 24 ? 'บทที่ ๑ · คืนบ้านแตก' : state.month < 60 ? 'บทที่ ๒ · เด็กบนถนน' : state.month < 84 ? 'บทที่ ๓ · หนี้เลือดเก่า' : state.month < 104 ? 'บทที่ ๔ · รากฐานในสำนัก' : state.month < 122 ? 'บทที่ ๕ · เงางูดำ' : state.month < 136 ? 'บทที่ ๖ · โลกนอกกำแพง' : 'บทที่ ๗ · หิมะก่อนศึก';
      $('chapter-label').textContent = chapter;
      if (state.month >= 136) { $('goal-title').textContent = 'กำหนดชะตาสุดท้าย'; $('goal-text').textContent = 'ทุกมิตร เบาะแส หนี้เลือด และคำสัตย์กำลังกลับมาทวงคำตอบ'; }
      else if (state.month >= 122) { $('goal-title').textContent = 'รวบรวมผู้คนและความจริง'; $('goal-text').textContent = 'ผลจากวัยเด็กและการตัดสินใจในสำนักกำลังเปลี่ยนกำลังของทั้งสองฝ่าย'; }
      else if (state.month >= 104) { $('goal-title').textContent = 'ค้นหาเงาในสำนัก'; $('goal-text').textContent = 'ผู้ทำลายตระกูลอาจอยู่ใกล้กว่าที่คิด รวบรวมหลักฐานก่อนถูกพบตัว'; }
      else if (state.month >= 84) { $('goal-title').textContent = 'ตั้งหลักในสำนัก'; $('goal-text').textContent = 'ซ่อนอดีต ฝึกตน และค้นหาว่าใครเชื่อมโยงกับตรางูดำ'; }
      else if (state.month >= 60) { $('goal-title').textContent = 'ตามรอยหนี้เลือด'; $('goal-text').textContent = 'ตัดสินใจว่าจะทวงความจริง ขายอดีต หรือหาที่ซ่อนแห่งใหม่'; }
      else if (state.month >= 24) { $('goal-title').textContent = 'เติบโตบนถนน'; $('goal-text').textContent = state.flags.retainerAlive ? 'เอาตัวรอดกับลุงโจว และหลบหนีมือสังหารที่ตามล่า' : 'เรียนรู้การมีชีวิตลำพัง หาอาหารและอย่าให้ใครรู้ชื่อจริง'; }
      else { $('goal-title').textContent = 'หนีออกจากเมืองที่ถูกเผา'; $('goal-text').textContent = 'เอาชีวิตรอดและเลือกว่าใครจะเดินทางไปกับเจ้า'; }
    } else {
      const goal = getFreeModeLifeGoal(state);
      $('chapter-label').textContent = goal.chapter;
      $('goal-title').textContent = goal.title;
      $('goal-text').textContent = goal.text;
    }

    // อัปเดตแผงความพร้อมรับศึกของสำนัก (แสดงเฉพาะเมื่อเข้าสำนักแล้ว)
    const sectPanel = $('sect-defense-panel');
    if (sectPanel) {
      const showSectPanel = state.mode === 'story'
        ? (state.month >= 84 && !state.flags.linAnRoute)
        : (state.flags.metSect && (state.sectCareer?.merit > 0 || state.officialCareer?.affiliation === 'sect'));
      if (showSectPanel) {
        sectPanel.hidden = false;
        const status = calculateSectStatus(state);
        $('sect-morale-badge').textContent = status.morale;
        $('sect-morale-badge').className = `badge ${status.badgeClass}`;
        $('sect-morale-label').textContent = status.morale;
        $('sect-readiness-label').textContent = status.readiness;
        $('sect-defense-bar').style.width = `${status.pct}%`;
        const career = ensureSectCareer(state), rank = SECT_RANKS.find(item => item.id === career.rank) || SECT_RANKS[0];
        $('sect-rank-label').textContent = rank.name;
        $('sect-merit-label').textContent = career.merit;
      } else {
        sectPanel.hidden = true;
      }
    }

    renderLog(); renderRelations(); renderQuests(); renderTechniques(); renderCrafting(); renderHousehold(); renderFamily(); renderLegacy();
    renderMobileNavigation();
  }

  function applyMobileSections() {
    const gameScreen = $('game-screen');
    if (!gameScreen) return;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const topbar = gameScreen.querySelector('.topbar');
    if (mobile) {
      if (topbar) gameScreen.style.setProperty('--mobile-topbar-height', `${topbar.offsetHeight}px`);
      gameScreen.dataset.mobileView = mobileView;
      document.querySelectorAll('[data-mobile-panel]').forEach(panel => {
        panel.hidden = panel.dataset.mobilePanel !== mobileView;
      });
      return;
    }
    gameScreen.style.removeProperty('--mobile-topbar-height');
    gameScreen.removeAttribute('data-mobile-view');
    document.querySelectorAll('[data-mobile-panel]').forEach(panel => {
      panel.hidden = panel.hasAttribute('data-tab-panel')
        ? panel.dataset.tabPanel !== activeInfoPanelTab
        : false;
    });
  }

  function renderMobileNavigation() {
    if (!state) return;
    if (mobileUnlockState !== state) {
      mobileUnlockState = state;
      mobileView = 'summary';
      activeInfoPanelTab = 'overview';
      knownMobileActivities = new Set(Object.keys(ACTIVITY).filter(id => activityAvailability(state, id).ok));
      newlyUnlockedMobileActivities = new Set();
    } else {
      Object.keys(ACTIVITY).forEach(id => {
        if (activityAvailability(state, id).ok && !knownMobileActivities.has(id)) {
          knownMobileActivities.add(id);
          newlyUnlockedMobileActivities.add(id);
        }
      });
    }

    const availableActivities = Object.keys(ACTIVITY).filter(id => activityAvailability(state, id).ok);
    document.querySelectorAll('[data-mobile-activity]').forEach(button => {
      const id = button.dataset.mobileActivity;
      const availability = activityAvailability(state, id);
      const isNew = newlyUnlockedMobileActivities.has(id);
      button.setAttribute('aria-disabled', String(!availability.ok));
      button.setAttribute('aria-pressed', String(state.activity === id));
      button.dataset.newUnlock = String(isNew);
      button.title = availability.ok ? (isNew ? 'เพิ่งปลดล็อก · แตะเพื่อเริ่มกิจกรรม' : `เปลี่ยนเป็น${ACTIVITY[id].name}`) : availability.reason;
      button.setAttribute('aria-label', `${ACTIVITY[id].name}${isNew ? ' เพิ่งปลดล็อก' : ''}${availability.ok ? '' : ` ยังใช้ไม่ได้: ${availability.reason}`}`);
    });

    const activityName = ACTIVITY[state.activity]?.name || 'กิจกรรม';
    const activityLocation = LOCATION_DEFS[state.locations?.current]?.name || ACTIVITY[state.activity]?.location || '';
    const activityLabel = $('mobile-current-activity');
    const locationLabel = $('mobile-current-location');
    if (activityLabel) activityLabel.textContent = activityName;
    if (locationLabel) locationLabel.textContent = activityLocation;
    const nextAction = $('mobile-next-action');
    if (nextAction) {
      const quests = ensureQuestState(state);
      const breakthroughReady = state.activity === 'train' && state.breakthroughState?.ready;
      nextAction.textContent = breakthroughReady
        ? 'ถึงเวลาตัดสินใจเรื่องทะลวงขั้นแล้ว กิจกรรมฝึกตนจะเปิดเหตุการณ์พิเศษ'
        : quests.available.length
          ? `มีภารกิจใหม่ ${quests.available.length} รายการ · ดูและรับได้ในหมวดผู้คน`
          : `กิจกรรม${activityName}จะดำเนินต่อเมื่อเวลาเดิน · ใช้แถบด้านบนเปลี่ยนกิจกรรมได้ทันที`;
    }
    const timeToggle = $('mobile-time-toggle');
    if (timeToggle) {
      timeToggle.textContent = state.paused ? '▶ เริ่มเดินเวลา' : 'Ⅱ หยุดชั่วคราว';
      timeToggle.disabled = !!state.pendingEvent || !!state.ending;
    }

    const availableQuestCount = ensureQuestState(state).available.length;
    const availableManualCount = availableTechniqueManuals(state).length;
    const inventoryCount = (state.treasures || []).length + (state.consumables || []).length;
    const healthNeedsCare = (Number(state.hero?.health) || 0) <= (Number(state.hero?.maxHealth) || 100) * .3;
    const badgeValues = {
      summary: healthNeedsCare ? '!' : '',
      activities: newlyUnlockedMobileActivities.size ? String(newlyUnlockedMobileActivities.size) : state.breakthroughState?.ready ? '!' : '',
      people: availableQuestCount ? String(availableQuestCount) : '',
      techniques: availableManualCount ? String(availableManualCount) : '',
      items: inventoryCount ? String(Math.min(99, inventoryCount)) : '',
      world: ''
    };
    document.querySelectorAll('#mobile-category-nav [data-mobile-view]').forEach(button => {
      const view = button.dataset.mobileView;
      if (view === mobileView) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      const badge = button.querySelector('small');
      if (badge) badge.textContent = badgeValues[view] || '';
    });

    const hint = $('mobile-unlock-hint');
    if (hint) {
      const newNames = [...newlyUnlockedMobileActivities].map(id => ACTIVITY[id].name);
      hint.textContent = newNames.length
        ? `ปลดล็อกใหม่: ${newNames.join(' · ')} · แตะกิจกรรมด้านบนเพื่อเริ่ม หรือเปิดคู่มือดูเงื่อนไข`
        : `เปิดใช้แล้ว ${availableActivities.length} จาก ${Object.keys(ACTIVITY).length} กิจกรรม · แตะรายการที่ล็อกเพื่ออ่านเงื่อนไข`;
    }

    const featureList = $('mobile-feature-list');
    if (featureList) {
      featureList.replaceChildren();
      Object.entries(ACTIVITY).forEach(([id, definition]) => {
        const availability = activityAvailability(state, id);
        const row = document.createElement('div');
        row.className = `mobile-feature-row${availability.ok ? '' : ' is-locked'}`;
        const name = document.createElement('strong');
        name.textContent = definition.name;
        const note = document.createElement('small');
        note.textContent = availability.ok ? 'พร้อมใช้' : availability.reason;
        row.append(name, note);
        featureList.append(row);
      });
    }
    applyMobileSections();
  }

  function renderLog() {
    const list = $('life-log'); list.innerHTML = '';
    const currentWorldMonth = Number(state.world?.worldMonth ?? state.worldMonth ?? state.month) || 0;
    const currentLifeMonth = Number(state.month) || 0;
    const currentAge = Number(state.hero?.ageMonths) || 0;
    const entries = list.dataset.expanded === 'true' ? state.log : state.log.slice(0, 8);
    entries.forEach(l => {
      const d = document.createElement('div'); d.className = `log-entry${l.highlight ? ' highlight' : ''}`;
      const text = String(l.text || '').replace(/(?:เมตตา|ภักดี|อิสระ|หยั่งรู้)\s*[+-]\d+\s*[·,]?\s*/g, '').replace(/[·,]\s*$/, '').trim();
      const elapsed = Math.max(0, Number(l.month) || 0);
      const worldMonth = Math.max(0, Number.isFinite(l.worldMonth) ? l.worldMonth : currentWorldMonth - currentLifeMonth + elapsed);
      const ageMonths = Math.max(0, Number.isFinite(l.ageMonths) ? l.ageMonths : currentAge - currentLifeMonth + elapsed);
      d.innerHTML = `<time>ปี ${Math.floor(worldMonth / 12) + 1}<br>เดือน ${worldMonth % 12 + 1}</time><div><strong>${l.highlight ? 'จุดเปลี่ยน' : 'กิจวัตร'} · อายุ ${esc(formatAge(ageMonths))}</strong><p>${esc(text)}</p></div>`;
      list.appendChild(d);
    });
    if (!state.log.length) list.innerHTML = '<p class="empty">บันทึกยังว่างเปล่า — เลือกกิจกรรมแล้วปล่อยเวลาเดิน</p>';
  }
  function currentLocation() {
    if (state.activity === 'rest') return restRoute(state).location;
    if (state.activity === 'travel') {
      ensureTravelState(state);
      if (state.travel.active) return `เส้นทางไป${TRAVEL_DESTINATIONS[state.travel.active.destination]?.name || state.travel.active.destination}`;
      if (state.travel.lastArrival) return TRAVEL_DESTINATIONS[state.travel.lastArrival.destination]?.name || ACTIVITY.travel.location;
      return ACTIVITY.travel.location;
    }
    if (state.month >= 84) return ACTIVITY[state.activity].location;
    if (state.activity === 'explore') return state.month < 24 ? 'ป่าหลังเมืองเพลิง' : 'เส้นทางไร้นาม';
    if (state.activity === 'work') return LOCATION_DEFS[workLocationKey(state)]?.name || 'สถานที่ทำงาน';
    if (state.activity === 'rest') return state.flags.retainerAlive ? 'กองไฟของลุงโจว' : 'ชายคาร้าง';
    return state.flags.retainerAlive ? 'ลานพักคาราวาน' : 'ศาลเจ้าร้าง';
  }
  function renderRestControls() {
    const panel = $('rest-location-control'); if (!panel || !state) return;
    ensureLocationState(state); ensureAutoRestRule(state);
    const visible = state.activity === 'rest' || !!state.locations.longRest; panel.hidden = !visible;
    if (!visible) return;
    const select = $('rest-location-select'); const locations = getAvailableLocations(state, 'rest');
    const key = restLocationKey(state); select.innerHTML = locations.map(location => `<option value="${location.id}">${location.name} · ปลอดภัย ${location.safety}% · ฟื้น ${location.rest.health}/${location.rest.qi}</option>`).join(''); select.value = key;
    const route = restRoute(state); const longRest = state.locations.longRest;
    $('rest-location-meta').textContent = `${route.location} · โอกาสตรวจเหตุเสี่ยงขณะพัก ${100 - route.safety}% (จะเกิดเหตุเมื่อมีเหตุที่เข้าเงื่อนไข) · ฟื้นจริง สุขภาพ +${route.heal} / ปราณ +${route.qi}${longRest ? ` · พักยาวเหลือ ${longRest.monthsLeft} เดือน` : ''}`;
    const innButton = $('rent-inn-btn'); if (innButton) { innButton.hidden = state.locations.owned.includes('inn') || state.hero.money < (LOCATION_DEFS.inn.cost || 0); innButton.textContent = `เช่าโรงเตี๊ยม ${LOCATION_DEFS.inn.cost} ตำลึง`; }
    $('auto-rest-rule-select').value = state.autoRestRule.enabled ? String(state.autoRestRule.threshold) : 'off';
    const autoMedSelect = $('auto-medicine-rule-select');
    if (autoMedSelect) {
      const medRule = ensureAutoMedicineRule(state);
      autoMedSelect.value = medRule.enabled ? String(medRule.healThreshold) : 'off';
    }
    $('start-long-rest-btn').hidden = state.mode !== 'free' || !!longRest;
    $('cancel-long-rest-btn').hidden = !longRest;
  }
  function renderWorkControls() {
    const panel = $('work-location-control'); if (!panel || !state) return;
    ensureLocationState(state);
    const visible = state.activity === 'work'; panel.hidden = !visible;
    if (!visible) return;
    const select = $('work-location-select'); const locations = getAvailableLocations(state, 'work');
    const key = workLocationKey(state);
    select.innerHTML = locations.map(location => `<option value="${location.id}">${location.name}</option>`).join('');
    select.value = key;
    const job = JOB_DEFS.find(item => item.id === ensureHousehold(state).job) || JOB_DEFS[0];
    $('work-location-meta').textContent = `${LOCATION_DEFS[key]?.name || key} · ${job.name} · รายได้พื้นฐาน ${job.income} ตำลึง · ความเสี่ยงตามเส้นทางงาน`;
  }

  function renderExplorationControls() {
    const panel = $('exploration-control'); if (!panel || !state) return;
    const visible = state.activity === 'explore'; panel.hidden = !visible;
    if (!visible) return;
    const areas = getAvailableExplorationAreas(state); const exploration = ensureExplorationState(state);
    const autoRule = ensureAutoExploreRule(state);
    const select = $('exploration-area-select');
    select.innerHTML = areas.map(area => `<option value="${area.id}">${area.name} · ${area.tier === 'safe' ? 'ปลอดภัย' : area.tier === 'danger' ? 'อันตราย' : 'ลับ'}</option>`).join('');
    select.value = areas.some(area => area.id === exploration.selectedArea) ? exploration.selectedArea : areas[0]?.id;
    const route = explorationRoute(state);
    $('exploration-area-meta').textContent = `${route.name} · ความเสี่ยง ${Math.round(route.risk)}% · โอกาสพบสิ่งสำคัญ ${Math.round(route.findChance)}% · ${route.log}${state.conditions?.poison?.monthsLeft ? ` · ติดพิษอีก ${state.conditions.poison.monthsLeft} เดือน` : ''}${state.poisonCoating?.usesLeft ? ' · ยาสลบพร้อมป้องกันตัว' : ''}`;
    const autoSelect = $('auto-explore-rule-select'); if (autoSelect) autoSelect.value = autoRule.policy;
    const visited = Object.entries(exploration.visited).map(([id, count]) => `${EXPLORATION_AREA_DEFS[id]?.name || id} ×${count}`).join(' · ');
    const last = exploration.lastOutcome;
    $('exploration-journal-visited').textContent = visited ? `พื้นที่ที่เคยไป: ${visited}` : 'พื้นที่ที่เคยไป: ยังไม่มี';
    $('exploration-journal-news').textContent = exploration.news.length ? `ข่าวสาร: ${exploration.news.slice(-3).join(' · ')}` : 'ข่าวสาร: ยังไม่มี';
    $('exploration-journal-last').textContent = last ? `ผลล่าสุด: เดือน ${last.month} · ${EXPLORATION_AREA_DEFS[last.area]?.name || last.area} · ${last.outcome === 'enemy' ? 'พบศัตรู' : last.outcome === 'lost' ? 'หลงทาง' : 'ได้ทรัพยากร'}` : 'ผลล่าสุด: ยังไม่มี';
  }
  function renderSocialControls() {
    const panel = $('social-control'); if (!panel || !state) return;
    ensureSocialState(state); ensureAutoSocialRule(state);
    const visible = state.activity === 'social'; panel.hidden = !visible;
    if (!visible) return;
    const select = $('social-target-select');
    if (select) {
      [...select.options].forEach(option => { option.disabled = option.value !== 'auto' && !socialTargetAvailable(state, option.value); });
      select.value = state.socialState.target || 'auto';
    }
    const route = socialRoute(state);
    const meta = $('social-target-meta'); if (meta) meta.textContent = `${route.name} · ${route.group} · ค่าใช้จ่าย ${route.cost} · ชื่อเสียง +${route.reputation}`;
    const rule = $('auto-social-rule-select'); if (rule) rule.value = state.autoSocialRule.mode;
    const money = $('auto-social-money'); if (money) money.value = state.autoSocialRule.minMoney;
  }

  function renderOfficialControls() {
    const panel = $('official-control'); if (!panel || !state) return;
    const visible = state.activity === 'sect'; panel.hidden = !visible;
    if (!visible) return;
    const career = ensureOfficialCareer(state);
    const affiliation = $('official-affiliation-select');
    const assignment = $('official-assignment-select');
    const examChoice = $('official-exam-choice-select');
    if (affiliation) { affiliation.value = career.affiliation || 'city'; affiliation.disabled = state.mode === 'story' && state.month < 84; }
    if (assignment) {
      const options = availableOfficialAssignments(state);
      assignment.innerHTML = options.map(item => `<option value="${item.id}">${item.name} · ผลงาน +${item.merit}${item.risk ? ` · เสี่ยง ${item.risk}` : ''}</option>`).join('');
      assignment.value = options.some(item => item.id === career.assignment) ? career.assignment : (options[0]?.id || 'normal');
    }
    if (examChoice) examChoice.value = career.examChoice || 'power';
    const rank = career.affiliation === 'sect' ? (SECT_RANKS.find(item => item.id === state.sectCareer.rank) || SECT_RANKS[0]) : officialRank(career);
    const nextSectRank = career.affiliation === 'sect' ? officialExamTarget(state) : null;
    $('official-career-meta').textContent = `${career.affiliation === 'sect' ? 'สำนัก' : career.affiliation === 'border' ? 'ชายแดน' : 'เมือง'} · ${rank.name} · ผลงาน ${career.affiliation === 'sect' ? state.sectCareer.merit : career.cityMerit} · สิทธิ์ ${[...officialRights(state)].join(', ') || 'ยังไม่มี'}${nextSectRank ? ` · ตำแหน่งถัดไป ${nextSectRank.name}: ${REALMS[nextSectRank.realm - 1]} ขั้น ${nextSectRank.stage} ขึ้นไป และผลงาน ${nextSectRank.merit}` : ''}${career.pendingDiscipline ? ' · รอสอบสวน' : ''}`;
  }

  function renderTravelControls() {
    const panel = $('travel-control'); if (!panel || !state) return;
    ensureTravelState(state); ensureAutoTravelRule(state);
    const active = state.activity === 'travel'; panel.hidden = !active; if (!active) return;
    const destinations = $('travel-destination-select');
    const available = availableTravelDestinations(state), availableIds = new Set(available.map(item => item.id));
    destinations.innerHTML = Object.entries(TRAVEL_DESTINATIONS).map(([id, item]) => `<option value="${id}" ${availableIds.has(id) ? '' : 'disabled'}>${item.name}${availableIds.has(id) ? '' : ' · ยังไม่เปิด'}</option>`).join('');
    destinations.value = state.travel.destination && availableIds.has(state.travel.destination) ? state.travel.destination : (available[0]?.id || '');
    const vehicle = $('travel-vehicle-select'); vehicle.value = state.travel.vehicle || 'foot';
    const selected = destinations.value; const estimate = selected ? calculateTravel(state, selected, { vehicle: vehicle.value }) : { ok: false, reason: 'destination-locked' };
    const reasonText = { 'route-closed': 'เส้นทางถูกปิด', 'insufficient-funds': 'เงินไม่พอสำหรับค่าเดินทาง', 'insufficient-supplies': 'เสบียงไม่พอสำหรับเส้นทางนี้', 'insufficient-time': 'อายุขัยไม่พอถึงปลายทาง', 'missed-deadline': 'ไปไม่ทันกำหนด', 'vehicle-locked': 'ยังใช้พาหนะนี้ไม่ได้', 'destination-locked': 'ปลายทางยังไม่เปิด' }[estimate.reason];
    const supplyLabels = { herb: 'สมุนไพร', iron: 'แร่เหล็ก', spiritStone: 'หินปราณ' };
    const supplyText = estimate.resources ? Object.entries(estimate.resources).map(([key, value]) => `${supplyLabels[key] || key} ${value}`).join(' · ') : '';
    const deadlineText = estimate.deadlineMonth == null ? '' : ` · กำหนดเดือน ${estimate.deadlineMonth}`;
    $('travel-meta').textContent = state.travel.active
      ? `กำลังเดินทาง · เหลือ ${state.travel.active.monthsLeft} เดือน · ถึงเดือน ${state.travel.active.etaMonth} · อายุขัยลด ${state.travel.active.lifespan} เดือน · เสบียง ${supplyText || 'ไม่มี'}`
      : (estimate.ok ? `ใช้เวลา ${estimate.months} เดือน · ค่าใช้จ่าย ${estimate.cost} · ปลอดภัย ${estimate.safety}% · สุขภาพ -${estimate.health} · อายุขัย -${estimate.lifespan} เดือน · เสบียง ${supplyText || 'ไม่มี'}${deadlineText}` : reasonText || 'เลือกปลายทางและพาหนะ');
    $('auto-travel-rule-select').value = state.autoTravelRule;
    $('start-travel-btn').disabled = !!state.travel.active || !estimate.ok;
  }

  function cultivationGuidance(s) {
    const current = equippedCultivationTechnique(s);
    const atCeiling = !!current && cultivationAtCeiling(s);
    const canAdvance = t => { const cap = cultivationTechniqueCeiling(t); return !cap || cap.realm > (s.hero.realm || 0) || (cap.realm === (s.hero.realm || 0) && cap.stage > (s.hero.stage || 0)); };
    const manuals = availableTechniqueManuals(s).filter(item => item.learningType === 'cultivation' && (!atCeiling || canAdvance(TECHNIQUES.find(t => t.id === item.techniqueId))));
    const eligible = manuals.find(item => manualLearningRequirement(s, item).eligible);
    const locked = manuals.find(item => !manualLearningRequirement(s, item).eligible);
    const alternatives = unlockedTechniques(s).filter(t => techniqueSlot(t) === 'cultivation' && t.id !== current?.id && canAdvance(t));
    if (current && !atCeiling) return `วิชาที่ใช้: ${current.name} · ฝึกต่อหรือรอจุดทะลวง`;
    if (alternatives.length) return `ขั้นต่อไป: เปิดแผงวิชาและติดตั้ง ${alternatives[0].name}`;
    if (eligible) return `ขั้นต่อไป: เลือกเรียนรู้ → คัมภีร์บำเพ็ญ → อ่าน ${eligible.name} แล้วติดตั้งวิชาที่เรียนสำเร็จ`;
    if (locked) return `${locked.name} ต้องถึง ${manualLearningRequirement(s, locked).name} ก่อนเรียน · มองหาคัมภีร์พื้นฐานที่เหมาะกับขั้นปัจจุบัน`;
    return `เบาะแส: ลองสำรวจหาคัมภีร์บำเพ็ญ${atCeiling ? 'ที่สูงกว่าวิชาปัจจุบัน' : 'พื้นฐาน'} หรือพบผู้สอนและติดตามโอกาสเข้าสำนัก แล้วเลือกเรียนรู้และติดตั้งวิชา`;
  }

  function renderTrainingControls() {
    const panel = $('training-control'); if (!panel || !state) return;
    const active = state.activity === 'train'; panel.hidden = !active; if (!active) return;
    ensureTrainingState(state);
    const select = $('training-goal-select'); if (select) select.value = state.trainingGoal;
    const autoRule = $('auto-training-rule-select'); if (autoRule) autoRule.value = state.autoTrainingRule;
    const techniques = chooseTrainingSet(state);
    const location = trainingLocationKey(state);
    const mastery = techniques.length ? techniques.map(t => `${t.name}: ${techniqueMasteryLevel(state, t.id).name}`).join(' · ') : 'ฝึกร่างกายทั่วไป';
    const status = $('training-status');
    const bodyBonus = bodyFoundationBenefits(state);
    const currentMethod = equippedCultivationTechnique(state);
    if (status) status.textContent = state.hero.cultivationAccess
      ? `${mastery} · สถานที่ ${LOCATION_DEFS[location]?.name || location} · ${!equippedCultivationTechnique(state) ? 'ต้องติดตั้งวิชาบำเพ็ญเพื่อเลื่อนขั้น' : cultivationAtCeiling(state) ? 'ถึงเพดานวิชา · ติดตั้งวิชาบำเพ็ญที่สูงกว่าก่อนทะลวง' : state.breakthroughState.ready ? `จุดตัน · โอกาสทะลวง ${breakthroughChance(state, 'force')}% (เกรดวิชา +${cultivationGradeBreakthroughBonus(state)} จุดเปอร์เซ็นต์)` : `ความก้าวหน้า ${Math.round(state.hero.cultivation)}/100`}`
      : `${mastery} · ยังไม่มีวิชาหลอมกาย · พื้นฐานกาย ${Math.round(bodyBonus.value)}/100`;
    if (status && currentMethod && cultivationCeilingName(currentMethod)) status.textContent += ` · เพดานวิชา ${cultivationCeilingName(currentMethod)}${cultivationAtCeiling(state) ? ' · ถึงเพดานแล้ว ต้องเปลี่ยนวิชาเพื่อฝึกต่อ' : ''}`;
    const discipline = disciplineBenefits(state);
    if (status) status.textContent += ` · วินัย ${Math.round(discipline.value)}/100: ทะลวง +${discipline.breakthroughBonus} จุดเปอร์เซ็นต์ · ฝึกต่อเนื่อง ${discipline.months}/5 เดือน +${Math.round((discipline.trainingMultiplier - 1) * 100)}%`;
    if (status) status.textContent += ` · ชำนาญยุทธ์ ${Math.round(clamp(Number(state.hero.martialSkill) || 0, 0, 100))}/100: โบนัสโจมตีวิชาต่อสู้ +${Math.round(martialSkillBonus(state) * 100)}%`;
    if (status) status.textContent += ` · พื้นฐานกาย ${Math.round(bodyBonus.value)}/100: ทะลวง +${bodyBonus.breakthroughBonus} จุดเปอร์เซ็นต์ · โอกาสบาดเจ็บเพิ่มจากการฝึก -${Math.round((1 - bodyBonus.injuryChanceMultiplier) * 100)}%${bodyBonus.earlyTrainingMultiplier > 1 ? ` · ฝึกหลอมกาย +${Math.round((bodyBonus.earlyTrainingMultiplier - 1) * 100)}%` : ''}`;
    if (status) status.textContent += ` · ${cultivationGuidance(state)}`;
  }
  function renderLearningControls() {
    const panel = $('learning-control'); if (!panel || !state) return;
    const active = state.activity === 'study'; panel.hidden = !active; if (!active) return;
    const learning = ensureLearningState(state); const route = learningRoute(state); const teacher = route.teacher;
    const focus = $('learning-focus-select'); if (focus) { focus.value = learning.focus; focus.querySelectorAll('option').forEach(option => { option.disabled = !learningTypeAvailable(state, option.value); }); }
    const techniqueSelect = $('learning-technique-select');
    if (techniqueSelect) {
      const techniques = TECHNIQUES.filter(technique => technique.id !== 'survival' && technique.unlock(state));
      const manuals = availableTechniqueManuals(state);
      techniqueSelect.innerHTML = `<option value="">อัตโนมัติตามประเภทความรู้</option>${manuals.map(manual => { const technique = TECHNIQUES.find(t => t.id === manual.techniqueId); const target = manualStudyTarget(manual); const requirement = manualLearningRequirement(state, manual); return `<option value="manual:${esc(manual.techniqueId)}" ${requirement.eligible ? '' : 'disabled'}>${requirement.eligible ? 'อ่าน' : '🔒'} ${esc(technique.name)} · ขั้น ${esc(requirement.name)} (${formatManualProgress(learning.manualProgress[manual.techniqueId])}/${target}${requirement.eligible ? ` · ราว ${manualStudyMonthsLeft(state, manual, route)} เดือน` : ''})</option>`; }).join('')}${techniques.map(technique => `<option value="${technique.id}">${technique.name}</option>`).join('')}`;
      techniqueSelect.value = learning.techniqueFocus || '';
    }
    const auto = $('auto-learning-rule-select'); if (auto) auto.value = learning.autoRule;
    const status = $('learning-status');
    if (status) {
      const selectedManual = availableTechniqueManuals(state).find(manual => learning.techniqueFocus === `manual:${manual.techniqueId}`);
      const estimate = selectedManual && manualLearningRequirement(state, selectedManual).eligible ? ` · เรียนคัมภีร์ราว ${manualStudyMonthsLeft(state, selectedManual, route)} เดือนที่ความเร็วปัจจุบัน` : '';
      status.textContent = `${route.name} · ผู้สอน: ${teacher.name} · ไอเทมเสริม +${learningItemBonus(state)}%${estimate} · ${Object.entries(LEARNING_TYPES).map(([id, def]) => `${def.name} ${learning.knowledge[id] || 0}`).join(' · ')} · ${cultivationGuidance(state)}`;
    }
  }
  function renderRelations() {
    const memory = ensureRelationshipState(state);
    const masterStatus = state.flags.masterCrippled ? 'เจ็บเรื้อรัง' : state.flags.masterHealed ? 'สมบูรณ์' : relationWord(state.relations.master);
    const isLinAnStory = state.mode === 'story' && state.characterId === 'lin-an';
    const friendName = isLinAnStory ? 'เฉินหยู' : 'สหายสนิท';
    const masterName = isLinAnStory ? 'เหวินจง' : 'อาจารย์ผู้ชี้แนะ';
    const seniorName = isLinAnStory ? 'เซี่ยหลัน' : 'รุ่นพี่ร่วมวิชาชีพ';
    const livingParents = state.family?.parents?.filter(p => p.alive !== false) || [];
    const parentsName = livingParents.length ? livingParents.map(p => p.name).join('และ') : 'พ่อแม่/ผู้ดูแล';
    const data = [
      ['parents', parentsName, '家'], ['siblings', 'พี่น้อง', '親'], ['relatives', 'ญาติ', '族'],
      ['friend', friendName, '友'], ['companion', 'สหายร่วมทาง', '伴'], ['master', masterName, '師'],
      ['senior', seniorName, '劍'], ['subordinate', 'ผู้ติดตาม', '從'], ['enemy', 'ศัตรู', '敵'], ['acquaintance', 'คนรู้จัก', '識'], ['mysteriousSwordsman', 'ชายแก่ขี่กระบี่', '劍'], ['bellMatron', 'หญิงชราเรือนระฆัง', '鈴']
    ].filter(([id]) => {
      const score = Number(state.relations[id] || 0);
      const knownFlags = {
        friend: state.flags.helpedFriend || state.flags.friendBondGiven,
        companion: state.flags.loneWanderer || state.flags.alliesRecruited,
        master: state.flags.metSect || state.flags.masterBondGiven || state.flags.masterCrippled || state.flags.masterHealed,
        senior: state.flags.seniorBondGiven || state.flags.metSect,
        enemy: state.flags.houseEnemyKnown || state.flags.betrayedSect || state.flags.traitorExposed,
        mysteriousSwordsman: state.flags.mysteriousSwordsmanMet,
        bellMatron: state.flags.bellHouseVisited
      };
      if (state.mode === 'free') {
        if (id === 'parents') return true;
        if (id === 'relatives') return (state.family?.relatives?.length || 0) > 0;
        return Math.abs(score) > 0 || !!knownFlags[id];
      }
      return Math.abs(score) > 0 || !!knownFlags[id] || ['parents', 'relatives'].includes(id);
    }).map(([id, name, glyph]) => [id, name, glyph, id === 'master' ? masterStatus : relationWord(state.relations[id] || 0)]);
    $('relations-list').innerHTML = data.map(([id, name, g, status]) => { const relationStatus = id === 'parents' && state.mode === 'free' && (state.hero.ageMonths || 0) < 24 && memory[id].status === 'ห่างเหิน' ? 'อยู่ในความดูแล' : memory[id].status; return `<div class="relation"><span class="npc-avatar">${g}</span><div><strong>${name}</strong><small>${memory[id].category} · ${memory[id].trait}</small><small>เป้าหมาย: ${memory[id].goal} · สถานะ: ${relationStatus}</small><small>ความสัมพันธ์ ${clamp(state.relations[id] || 0, -100, 100)}/100 · ไว้วางใจ ${clamp(memory[id].trust, -100, 100)} · เข้ากันได้ ${relationshipCompatibility(state, id)}%</small></div><b class="${status === 'เจ็บเรื้อรัง' ? 'negative' : ''}">${status}</b></div>`; }).join('');
    const f = updateFactionReputation(state), names = { sect: ['สำนักเมฆาคราม', '雲'], serpent: ['พรรคงูดำ', '蛇'], jianghu: ['ยุทธภพ', '俠'] };
    $('factions-list').innerHTML = Object.entries(names).map(([id, [name, g]]) => `<div class="faction"><span>${g}</span><div><strong>${name}</strong><small>${reputationWord(f[id])}</small></div><b class="${f[id] < 0 ? 'negative' : 'positive'}">${f[id] >= 0 ? '+' : ''}${f[id]}</b></div>`).join('');
  }
  function renderQuests() {
    const wrap = $('quests-list');
    if (!wrap) return;
    const quests = ensureQuestState(state);
    $('quest-slots-label').textContent = `${quests.active.length}/3`;
    wrap.innerHTML = quests.active.length ? quests.active.map(quest => {
      const def = QUEST_DEFS.find(item => item.id === quest.id);
      const tracked = quests.trackedId === quest.id;
      const monthsLeft = Math.max(0, quest.deadlineMonth - state.month);
      return `<article class="quest-card${tracked ? ' tracked' : ''}"><div class="quest-head"><strong>${def?.title || quest.id}</strong><small>${monthsLeft} เดือน</small></div><p>${def?.text || ''}</p><div class="quest-progress"><i style="width:${quest.progress || 0}%"></i></div><div class="quest-actions"><button type="button" data-track-quest="${quest.id}">${tracked ? 'กำลังติดตาม' : 'ติดตาม'}</button><button type="button" data-cancel-quest="${quest.id}">ยกเลิก</button></div></article>`;
    }).join('') : '<p class="empty">ยังไม่มีเควส — โลกจะยื่นเส้นทางใหม่เมื่อเวลาผ่านไป</p>';
    wrap.querySelectorAll('[data-track-quest]').forEach(button => button.onclick = () => { quests.trackedId = button.dataset.trackQuest; saveGame(); render(); });
    wrap.querySelectorAll('[data-cancel-quest]').forEach(button => button.onclick = () => { cancelQuest(state, button.dataset.cancelQuest); saveGame(); render(); });
  }
  function renderCrafting() {
    const materials = $('materials-list');
    if (!materials) return;
    ensureInventory(state);
    const labels = MATERIAL_NAMES;
    materials.innerHTML = Object.keys(labels).map(key => { const graded = MATERIAL_GRADE_IDS.slice(1).filter(grade => state.gradedMaterials[key][grade] > 0).map(grade => `<small style="border-left:3px solid ${ITEM_GRADES[grade].color};padding-left:4px;color:#29332b">${ITEM_GRADES[grade].name} ${state.gradedMaterials[key][grade]}</small>`).join(' · '); return `<span>${labels[key]} สามัญ <b>${state.materials[key] || 0}</b>${graded ? `<br>${graded}` : ''}</span>`; }).join('');
    if (state.materialStacks.length) {
      materials.insertAdjacentHTML('beforeend', `<details><summary>กองวัตถุดิบแยกไว้ ${state.materialStacks.length} กอง</summary>${state.materialStacks.map((stack, i) => `<button type="button" data-merge-stack="${i}" ${MATERIAL_NAMES[stack.material] && Number.isInteger(stack.amount) && stack.amount > 0 && MATERIAL_GRADE_IDS.includes(stack.grade || 'common') ? '' : 'disabled'}>รวม${labels[stack.material] || 'วัตถุดิบไม่ทราบชนิด'} ${ITEM_GRADES[stack.grade || 'common']?.name || ''} ${Number.isInteger(stack.amount) ? stack.amount : 0} ชิ้นเข้าคลัง</button>`).join('')}</details>`);
      materials.querySelectorAll('[data-merge-stack]').forEach(button => button.onclick = () => { if (mergeMaterialStack(state, button.dataset.mergeStack)) { saveGame(); render(); } });
    }
    const target = state.crafting.target;
    let planText = '';
    if (state.lastCraftMonth === state.month) {
      planText = '<span style="color:#b25828">สิทธิ์ช่างเดือนนี้: ใช้สร้าง/ศึกษาแล้ว</span>';
    } else if (state.activity === 'craft') {
      if (target?.type === 'recipe') {
        const plannedRecipe = RECIPES.find(r => r.id === target.recipeId);
        planText = `<span style="color:#2f6e52">แผนงานเดือนนี้: เตรียมสร้าง ${plannedRecipe?.name || target.recipeId} (รอดำเนินการเมื่อเดินเวลา)</span>`;
      } else if (target?.type === 'study') {
        const studyLabels = { alchemy: 'ปรุงยา', smithing: 'ตีเหล็ก', tools: 'เครื่องมือ', support: 'ของสนับสนุน' };
        planText = `<span style="color:#2f6e52">แผนงานเดือนนี้: เตรียมศึกษา ${studyLabels[target.knowledge] || target.knowledge} (รอดำเนินการเมื่อเดินเวลา)</span>`;
      } else {
        planText = '<span style="color:#7a6d59">กิจกรรมงานช่าง: ยังไม่ได้เลือกสูตร (จะฝึกพื้นฐานช่างทั่วไปเมื่อเดินเวลา)</span>';
      }
    } else {
      planText = '<span style="color:#2f6e52">สิทธิ์ช่างเดือนนี้: พร้อมใช้ (เลือกทำเมื่อสลับกิจกรรมเป็นงานช่าง)</span>';
    }
    $('craft-month-label').innerHTML = planText + (state.pillEffect?.usesLeft ? ` · ${state.pillEffect.name} เหลือ ${state.pillEffect.usesLeft} ครั้งฝึก` : '') + (state.conditions?.poison?.monthsLeft ? ` · ติดพิษ ${state.conditions.poison.monthsLeft} เดือน` : '') + (state.poisonCoating?.usesLeft ? ' · เคลือบยาสลบพร้อมใช้' : '');
    ensureCraftingState(state);
    const autoMode = $('craft-auto-mode'); const autoRecipe = $('craft-auto-recipe');
    if (autoMode) autoMode.value = state.crafting.auto.mode;
    if (autoRecipe) { autoRecipe.innerHTML = `<option value="">เลือกสูตรหลัก</option>${RECIPES.map(recipe => `<option value="${recipe.id}">${recipe.name}</option>`).join('')}`; autoRecipe.value = state.crafting.auto.recipeId || ''; }
    const tabs = $('craft-tabs');
    if (tabs) { tabs.innerHTML = [['all','ทั้งหมด'],['alchemy','ปรุงยา'],['smithing','ช่าง'],['utility','ของใช้']].map(([id, name]) => `<button type="button" data-craft-tab="${id}" aria-pressed="${state.crafting.tab === id}">${name}</button>`).join(''); tabs.querySelectorAll('[data-craft-tab]').forEach(button => button.onclick = () => { state.crafting.tab = button.dataset.craftTab; renderCrafting(); }); }
    const training = $('craft-training');
    if (training) {
      const labels = {alchemy:'ปรุงยา',smithing:'ตีเหล็ก',tools:'เครื่องมือ',support:'สนับสนุน'};
      const studyBtns = Object.entries(labels).map(([key,name]) => {
        const isMax = (state.crafting.knowledge[key] || 0) >= 5;
        const usedThisMonth = state.lastCraftMonth === state.month;
        const noMoney = state.hero.money < 2;
        const avail = activityAvailability(state, 'craft');
        const reasons = [];
        if (usedThisMonth) reasons.push('ใช้สิทธิ์สร้างหรือศึกษาของเดือนนี้แล้ว');
        if (noMoney) reasons.push('ขาดตำลึง (ต้องใช้ 2 ตำลึง)');
        if (isMax) reasons.push('ความรู้ระดับสูงสุดแล้ว (5/5)');
        if (!avail.ok) reasons.push(avail.reason);
        const canStudy = reasons.length === 0;
        const isPlanned = target?.type === 'study' && target?.knowledge === key;
        const studyAllowed = canStudy || isPlanned;
        const title = isPlanned
          ? `คลิกเพื่อยกเลิกแผนการศึกษาความรู้${name}`
          : (canStudy ? (state.activity === 'craft' ? `วางแผนศึกษาความรู้${name} ใช้ 2 ตำลึงเมื่อเดินเวลา` : `สลับกิจกรรมเป็นงานช่างและวางแผนศึกษาความรู้${name} ใช้ 2 ตำลึง (ใช้เวลา 1 เดือน)`) : reasons.join(' · '));
        const label = isPlanned ? `✓ แผนเดือนนี้: เรียน${name} (กดยกเลิก)` : (state.activity === 'craft' ? `วางแผนเรียน${name}` : `สลับมาเรียน${name}`);
        return `<button type="button" class="${isPlanned ? 'active selected' : ''}" data-study-craft="${key}" ${studyAllowed ? '' : 'disabled'} title="${title}">${label} · ระดับ ${state.crafting.knowledge[key] || 0}/5</button>`;
      }).join('');
      const equipBtns = [['forge','เตาตีเหล็ก',12],['workbench','โต๊ะช่าง',8],['alchemy_stove','เตาปรุงยา',10]].map(([key,name,price]) => {
        const has = state.crafting.equipment.includes(key);
        const loc = ['owned','estate','sect'].includes(craftLocation(state));
        const canBuy = !has && state.hero.money >= price && loc;
        const title = has ? 'มีอุปกรณ์นี้ในโรงช่างแล้ว' : !loc ? 'สถานที่ไม่อำนวยให้ติดตั้งอุปกรณ์' : state.hero.money < price ? `ขาดเงิน (ต้องใช้ ${price} ตำลึง)` : `ซื้อ${name}ติดตั้งในโรงช่างทันที (${price} ตำลึง)`;
        return `<button type="button" data-craft-equipment="${key}" ${canBuy ? '' : 'disabled'} title="${title}">${has ? 'มีแล้ว' : `ซื้อ ${price} ตำลึง`}: ${name}</button>`;
      }).join('');
      training.innerHTML = `<details><summary>ความรู้และอุปกรณ์ช่าง (ศึกษาใช้เวลาเดือนละ 1 ครั้ง · ซื้ออุปกรณ์ทันที)</summary><small>ศึกษาด้วยตนเอง 2 ตำลึง ใช้สิทธิ์สร้างของเดือนนี้ หรือสร้างสำเร็จ 3 ครั้งเพื่อเพิ่มความรู้ · ปรุงพลาดเสียครึ่งหนึ่งของวัตถุดิบ (ปัดขึ้น) และค่าใช้จ่าย</small>${studyBtns}${equipBtns}</details>`;
      training.querySelectorAll('[data-study-craft]').forEach(button => button.onclick = () => { if (studyCraft(state, button.dataset.studyCraft)) { saveGame(); render(); toast(state.crafting?.target ? 'วางแผนศึกษาช่างประจำเดือนแล้ว' : 'ยกเลิกแผนศึกษาช่าง'); } else { render(); } });
      training.querySelectorAll('[data-craft-equipment]').forEach(button => button.onclick = () => { if (acquireCraftingEquipment(state, button.dataset.craftEquipment)) { saveGame(); render(); } });
    }
    $('crafting-list').innerHTML = RECIPES.filter(recipe => state.crafting.tab === 'all' || (state.crafting.tab === 'alchemy' ? recipe.knowledge === 'alchemy' : state.crafting.tab === 'smithing' ? recipe.knowledge === 'smithing' : ['tools', 'support'].includes(recipe.knowledge))).map(recipe => {
      const cost = [...Object.entries(effectiveCraftCost(state, recipe)).map(([key, value]) => `${key === 'money' ? 'ตำลึง' : labels[key] || key} ${value}`), ...(recipe.gradedCost || []).map(req => `${labels[req.material]} ${ITEM_GRADES[req.grade].name} ${req.amount}`)].join(' · ');
      const req = craftRequirements(state, recipe); const profile = craftingProfile(state, recipe); const location = recipe.locations?.map(id => LOCATION_DEFS[id]?.name || id).join(' / ') || 'ทุกสถานที่'; const equipment = ({ forge: 'เตาตีเหล็ก', workbench: 'โต๊ะช่าง', alchemy_stove: 'เตาปรุงยา' })[recipe.equipment] || 'ไม่กำหนด'; const teacher = recipe.teacher ? (RELATIONSHIP_DEFS[recipe.teacher]?.name || recipe.teacher) : 'ไม่กำหนด';
      const usedThisMonth = state.lastCraftMonth === state.month;
      const isPlanned = target?.type === 'recipe' && target?.recipeId === recipe.id;
      const craftAllowed = (req.ok && !usedThisMonth) || isPlanned;
      const buttonLabel = isPlanned ? '✓ แผนเดือนนี้ (กดยกเลิก)' : (state.activity === 'craft' ? 'เลือกสร้างในเดือนนี้' : 'สลับทำช่างและเลือกสร้าง');
      const buttonTitle = isPlanned
        ? 'สูตรนี้ถูกวางแผนไว้สำหรับเดือนนี้ จะดำเนินการสร้างเมื่อกดเดินเวลา (กดซ้ำเพื่อยกเลิก)'
        : (craftAllowed
          ? (state.activity === 'craft' ? 'เลือกสูตรนี้เพื่อสร้างเมื่อเดินเวลาเดือนนี้' : 'สลับกิจกรรมหลักประจำเดือนเป็นงานช่างและวางแผนสร้างสูตรนี้')
          : (usedThisMonth ? 'ใช้สิทธิ์สร้างหรือศึกษาของเดือนนี้ไปแล้ว รอเดือนถัดไป' : req.reasons.join(' · ')));
      const statusNote = usedThisMonth
        ? '<span style="color:#8a4d2e">ใช้สิทธิ์สร้าง/ศึกษาของเดือนนี้แล้ว</span>'
        : (req.ok ? '<span style="color:#2f6e52">พร้อมสร้าง</span>' : req.reasons.join(' · '));
      return `<div class="craft-row"><div><strong>${recipe.name}</strong><small>${recipe.effect}${recipe.quality === 'training' ? ' (คุณภาพสูงเพิ่มผลอีก 2% ต่อระดับ)' : ''}</small><small>วัตถุดิบ: ${cost}</small><small>${statusNote} · สำเร็จ ${profile.chance}%</small><details><summary>รายละเอียดสูตร</summary><small>${recipe.kind} · ความรู้ ${recipe.knowledgeMin || 0} · สถานที่ ${location} · อุปกรณ์ ${equipment} · ผู้สอน ${teacher}</small><small>คุณภาพ ${recipe.kind === 'ปรุงยา' ? Math.min(profile.quality, Math.max(1, MATERIAL_GRADE_IDS.indexOf(recipe.grade || 'common') + 1)) : profile.quality}</small></details></div><button type="button" data-craft="${recipe.id}" ${craftAllowed ? '' : 'disabled'} title="${buttonTitle}">${buttonLabel}</button></div>`;
    }).join('');
    const ROMAN_GRADES = { common: '[I · สามัญ]', uncommon: '[II · ชั้นดี]', rare: '[III · หายาก]', epic: '[IV · มหากาพย์]', legendary: '[V · ตำนาน]' };
    $('consumables-list').innerHTML = state.consumables.length ? state.consumables.map(item => {
      const normalized = normalizeItemGrade(item);
      const gradeClass = `grade-${normalized.grade || 'common'}`;
      const gradeLabel = ROMAN_GRADES[normalized.grade] || `[${normalized.gradeData?.name || 'สามัญ'}]`;
      const stars = '★'.repeat(Math.max(1, Math.min(5, item.quality || 1)));
      const effectDesc = item.karmaBonus || item.luckBonus ? `กรรม +${item.karmaBonus || 0} · โชค +${item.luckBonus || 0} (ใช้ครั้งเดียว)` : item.trainingBonus ? `ฝึกบำเพ็ญ +${item.trainingBonus}% (${item.trainingUses} ครั้ง)`
        : item.cures ? 'ถอนพิษจากการสำรวจทันที'
        : item.fatigueRelief ? `ลดความเหนื่อยล้า ${item.fatigueRelief} หน่วย`
        : item.poisonCoating ? 'ลดความเสียหายและกันพิษ 1 ครั้ง'
        : item.homeRepair ? `ลดค่าดูแลบ้าน ${item.homeRepair} เดือน`
        : `ฟื้นฟูสุขภาพ +${item.heal || 0} หน่วย`;
      
      let canUse = true;
      let disabledReason = '';
      if (item.cures && !state.conditions?.poison?.monthsLeft) {
        canUse = false;
        disabledReason = '🔒 ร่างกายไม่ติดพิษ';
      } else if (item.heal && !item.trainingBonus && !item.fatigueRelief && state.hero.health >= state.hero.maxHealth) {
        canUse = false;
        disabledReason = '🔒 สุขภาพเต็มแล้ว';
      }

      return `<div class="consumable-card">
        <div class="consumable-info">
          <strong>${item.name}</strong>
          <span class="grade-badge ${gradeClass}">${gradeLabel}</span>
          <span class="consumable-quality" title="คุณภาพระดับ ${item.quality || 1}">${stars}</span>
          <small class="consumable-effect">${effectDesc}</small>
        </div>
        <button type="button" class="btn btn-sm btn-consume" data-consume="${encodeURIComponent(item.inventoryUid)}" ${canUse ? '' : 'disabled'} title="${canUse ? 'กดใช้ทันที ไม่เสียเวลาเดือน' : disabledReason}">
          ${canUse ? 'ใช้' : disabledReason}
        </button>
      </div>`;
    }).join('') : '<small class="empty">ยังไม่มีของใช้ในคลัง</small>';
    const sellable = canSellItems(state);
    const materialSellButtons = Object.keys(MATERIAL_NAMES).filter(key => Number(state.materials[key] || 0) > 0).map(key => `<button type="button" class="consumable" data-sell-material="${key}" ${sellable ? '' : 'disabled'} title="ซื้อขายทันที ไม่เสียเวลาเดือน">ขาย${labels[key]} 1 ชิ้น · +${Math.max(1, Math.round(economyPriceMultiplier(state, key)))} ตำลึง</button>`).join('');
    const materialBuyButtons = Object.entries(MATERIAL_SHOP_PRICES).map(([key, base]) => { const price = Math.max(1, Math.ceil(base * economyPriceMultiplier(state, key))); return `<button type="button" class="consumable" data-buy-material="${key}" ${sellable && state.hero.money >= price ? '' : 'disabled'} title="ซื้อขายทันที ไม่เสียเวลาเดือน">ซื้อ${labels[key]}สามัญ · ${price} ตำลึง</button>`; }).join('');
    const gradedBuyButtons = Object.keys(MATERIAL_NAMES).map(key => { const price = gradedMaterialPrice(state, key, 'uncommon', true); return `<button type="button" class="consumable" data-buy-grade="${key}:uncommon" ${sellable && state.hero.money >= price ? '' : 'disabled'} title="ซื้อขายทันที ไม่เสียเวลาเดือน">ซื้อ${labels[key]}ชั้นดี · ${price} ตำลึง</button>`; }).join('');
    const gradedSellButtons = Object.keys(MATERIAL_NAMES).flatMap(key => MATERIAL_GRADE_IDS.slice(1).filter(grade => state.gradedMaterials[key][grade] > 0).map(grade => `<button type="button" class="consumable" data-sell-grade="${key}:${grade}" ${sellable ? '' : 'disabled'} title="ซื้อขายทันที ไม่เสียเวลาเดือน">ขาย${labels[key]}${ITEM_GRADES[grade].name} · ${gradedMaterialPrice(state, key, grade, false)} ตำลึง</button>`)).join('');
    const itemSellButtons = [...(state.treasures || []), ...(state.consumables || [])].map(item => { const id = typeof item === 'object' ? (item.inventoryUid || item.id || item.name) : item; const name = typeof item === 'object' ? item.name : item; const value = itemSalePrice(state, item); return `<button type="button" class="consumable" data-sell-item="${encodeURIComponent(id)}" ${sellable ? '' : 'disabled'} title="ซื้อขายทันที ไม่เสียเวลาเดือน">ขาย${name} · +${value} ตำลึง</button>`; }).join('');
    $('selling-list').innerHTML = `<small class="empty">${sellable ? 'ขายของได้ที่ตลาด/สำนัก' : 'การขายของใช้ได้เฉพาะตลาดหรือสำนัก'}</small><details><summary>ซื้อวัตถุดิบสามัญ</summary>${materialBuyButtons}</details><details><summary>ซื้อวัตถุดิบชั้นดี</summary>${gradedBuyButtons}</details><details><summary>ขายวัตถุดิบ</summary>${materialSellButtons}${gradedSellButtons || '<small>ไม่มีวัตถุดิบเกรดสูง</small>'}</details><details><summary>ขายไอเทม</summary>${itemSellButtons || '<small>ไม่มีไอเทม</small>'}</details>`;
    $('crafting-list').querySelectorAll('[data-craft]').forEach(button => button.onclick = () => { if (craftItem(state, button.dataset.craft)) { syncCombat(state); saveGame(); render(); toast(state.crafting?.target ? 'เลือกเป้าหมายสร้างของประจำเดือนแล้ว' : 'ยกเลิกเป้าหมายสร้างของ'); } else { render(); } });
    $('consumables-list').querySelectorAll('[data-consume]').forEach(button => button.onclick = () => { if (consumeItem(state, decodeURIComponent(button.dataset.consume))) { saveGame(); render(); toast('ใช้ไอเทมแล้ว'); } });
    $('selling-list').querySelectorAll('[data-buy-grade]').forEach(button => button.onclick = () => { const [material, grade] = button.dataset.buyGrade.split(':'); if (tradeGradedMaterial(state, material, grade, true)) { saveGame(); render(); } });
    $('selling-list').querySelectorAll('[data-sell-grade]').forEach(button => button.onclick = () => { const [material, grade] = button.dataset.sellGrade.split(':'); if (tradeGradedMaterial(state, material, grade, false)) { saveGame(); render(); } });
    $('selling-list').querySelectorAll('[data-buy-material]').forEach(button => button.onclick = () => { if (buyMaterial(state, button.dataset.buyMaterial)) { saveGame(); render(); } });
    $('selling-list').querySelectorAll('[data-sell-material]').forEach(button => button.onclick = () => { if (sellMaterial(state, button.dataset.sellMaterial, 1)) { saveGame(); render(); } });
    $('selling-list').querySelectorAll('[data-sell-item]').forEach(button => button.onclick = () => { if (sellItem(state, decodeURIComponent(button.dataset.sellItem))) { saveGame(); render(); } });
  }
  function renderHousehold() {
    const jobSelect = $('job-select'), housingSelect = $('housing-select');
    if (!jobSelect) return;
    const household = ensureHousehold(state), house = HOUSE_TYPES[household.housing] || HOUSE_TYPES.shelter, job = JOB_DEFS.find(item => item.id === household.job) || JOB_DEFS[0];
    const isChild = (state.hero?.ageMonths || 0) < 180;
    const workRule = ensureAutoWorkRule(state);
    const family = ensureFamilyState(state);
    const members = familyMemberCount(family);
    const familyCareCost = (!isChild && members) ? 1 + Math.max(0, Math.ceil((members - 1) / 2)) : 0;
    const housingUpkeep = isChild ? 0 : Number(house.upkeep || 0);
    const monthlyJobIncome = (state.activity === 'work') ? (job.income + Math.max(0, household.careerLevel - 1)) : 0;
    const totalExpenses = housingUpkeep + familyCareCost;
    const netFlow = monthlyJobIncome - totalExpenses;

    $('household-debt-label').textContent = `หนี้ ${household.debt}${household.arrears ? ` · ค้าง ${household.arrears} งวด` : ''}`;

    let debtReasonText = '';
    if (household.debt > 0) {
      const reasons = household.debtReasons || {};
      const parts = [];
      if (reasons.rent) parts.push(`ค่าที่พัก ${reasons.rent}`);
      if (reasons.family) parts.push(`ค่าดูแลคนในเรือน ${reasons.family}`);
      if (reasons.loan) parts.push(`เงินกู้ ${reasons.loan}`);
      if (reasons.interest) parts.push(`ดอกเบี้ย ${reasons.interest}`);
      debtReasonText = parts.length ? `(${parts.join(' · ')})` : '';
    }

    const fatigueLevel = household.workFatigue >= 8 ? 'ตรากตรำเกินกำลัง (สุขภาพลด -2/เดือน)' : household.workFatigue >= 4 ? 'เริ่มเหนื่อยล้า (ควรพักฟื้น)' : 'ร่างกายสดชื่น';

    if (isChild) {
      $('household-status').innerHTML = `
        <div class="household-ledger">
          <strong>🌱 วัยเยาว์ภายใต้การดูแลของผู้ใหญ่</strong>
          <small>ที่พักและอาหารได้รับการอุปถัมภ์จากครอบครัว/สำนัก · ไม่มีภาระค่าเช่าบ้านหรือหนี้สิน</small>
          <small>เงินเก็บส่วนตัว: ${state.hero.money} ตำลึง (จากการช่วยงานหยิบจับหรือของขวัญ)</small>
        </div>
      `;
    } else {
      $('household-status').innerHTML = `
        <div class="household-ledger">
          <div class="household-ledger-row income">
            <span>รายรับเมื่อทำงาน (${job.name} ขั้น ${household.careerLevel})</span>
            <b>+${job.income + Math.max(0, household.careerLevel - 1)} ตำลึง</b>
          </div>
          <div class="household-ledger-row expense">
            <span>ค่าที่พัก (${house.name})</span>
            <b>-${housingUpkeep} ตำลึง/ด.</b>
          </div>
          ${familyCareCost > 0 ? `
          <div class="household-ledger-row expense">
            <span>ค่าดูแลคนในเรือน (${members} คน)</span>
            <b>-${familyCareCost} ตำลึง/ด.</b>
          </div>` : ''}
          <div class="household-ledger-row net">
            <span>กระแสเงินสุทธิ (เดือนที่ทำงาน)</span>
            <b style="color: ${netFlow >= 0 ? '#8cd69e' : '#e8988e'}">${netFlow >= 0 ? `+${netFlow}` : netFlow} ตำลึง</b>
          </div>
          <div class="household-ledger-row">
            <span>ความเหนื่อยล้าจากงาน: ${household.workFatigue}/10</span>
            <small style="color: ${household.workFatigue >= 8 ? '#e8988e' : '#c5bdaa'}">${fatigueLevel}</small>
          </div>
        </div>
        ${household.debt > 0 ? `
        <div class="household-debt-box">
          <strong>ยอดหนี้สิน: ${household.debt} ตำลึง ${debtReasonText}</strong>
          <small>เจ้าหนี้: ${household.creditor || 'นายทุนตลาดชายแดน'} · ดอกเบี้ย ${Math.round(household.interestRate * 100)}% · ค้างชำระ ${household.arrears} เดือน</small>
        </div>` : ''}
        ${household.bankruptcy ? '<small class="negative" style="display:block;margin-top:4px;color:#e8988e">สถานะล้มละลาย · ทรัพย์สินถูกยึด เริ่มต้นใหม่จากชายคาชั่วคราว</small>' : ''}
      `;
    }

    jobSelect.innerHTML = JOB_DEFS.map(item => {
      const allowed = canTakeJob(state, item);
      const isCurrent = item.id === household.job;
      return `<option value="${item.id}" ${isCurrent ? 'selected' : ''} ${allowed ? '' : 'disabled'}>${item.name} (รายได้ ${item.income} · ${allowed ? 'พร้อมทำ' : item.requirement})</option>`;
    }).join('');

    housingSelect.innerHTML = Object.entries(HOUSE_TYPES).map(([id, item]) => {
      const isOwned = (household.ownedProperties || []).includes(id);
      const isCurrent = id === household.housing;
      let label = item.name;
      let priceDesc = '';
      if (id === 'shelter') {
        priceDesc = 'ไม่มีค่าเช่า · ปลอดภัยต่ำ';
      } else if (id === 'rented') {
        priceDesc = `มัดจำ ${item.cost} · เช่า ${item.upkeep}/ด.`;
      } else if (isOwned) {
        priceDesc = `เป็นเจ้าของแล้ว · บำรุง ${item.upkeep}/ด.`;
      } else {
        priceDesc = `ซื้อขาด ${item.cost} · บำรุง ${item.upkeep}/ด.`;
      }
      const canAfford = isOwned || id === 'shelter' || state.hero.money >= item.cost;
      return `<option value="${id}" ${isCurrent ? 'selected' : ''} ${canAfford ? '' : 'disabled'}>${label} (${priceDesc})</option>`;
    }).join('');

    $('household-loan-btn').disabled = isChild || household.loanCount >= 3;
    $('household-loan-btn').title = isChild ? 'ผู้เยาว์ไม่สามารถก่อหนี้สินเงินกู้ได้' : household.loanCount >= 3 ? 'เกินวงเงินกู้สูงสุดแล้ว' : 'กู้เงินฉุกเฉิน 30 ตำลึง (ดอกเบี้ย 25%)';
    const workRuleSelect = $('auto-work-rule-select');
    if (workRuleSelect) workRuleSelect.value = workRule.enabled ? String(workRule.fatigueThreshold) : 'off';
    jobSelect.onchange = e => { if (setJob(state, e.target.value)) { saveGame(); render(); } };
    housingSelect.onchange = e => { if (buyOrRentHouse(state, e.target.value)) { saveGame(); render(); } else render(); };
    $('household-loan-btn').onclick = () => { if (takeHouseholdLoan(state)) { saveGame(); render(); } };
  }
  function renderFamily() {
    const status = $('family-status');
    if (!status) return;
    const family = ensureFamilyState(state), dynastyAllowed = state.mode === 'free' || state.ruleSet === 'dynasty';
    $('family-building-label').textContent = `${family.buildings.length} อาคาร`;
    const spouseText = family.spouse ? `คู่ครอง: ${family.spouse.name} · ความผูกพัน ${family.spouse.affection}` : 'ยังไม่มีคู่ครอง — มรดกตระกูลยังไม่เริ่ม';
    const children = family.children.length ? family.children.map(child => `<div class="family-child"><strong>${child.name}${child.alive === false ? ' · จากไปแล้ว' : ''}</strong><small>${formatAge(child.ageMonths)} · สุขภาพ ${child.health} · การศึกษา ${child.education} · ${child.path ? CHILD_PATHS[child.path].name : 'ยังไม่กำหนดแนวทาง'}</small><small>สถานะ: ${child.status} · เป้าหมาย: ${child.goal}</small></div>`).join('') : '<small>ยังไม่มีทายาท</small>';
    const relatives = `พ่อแม่ ${family.parents.filter(member => member.alive !== false).length} · ญาติ ${family.relatives.filter(member => member.alive !== false).length}`;
    const finances = `ค่าใช้จ่ายพื้นฐาน ${familyMemberCount(family) ? 1 + Math.max(0, Math.ceil((familyMemberCount(family) - 1) / 2)) : 0} · คลัง ${family.treasury} · หนี้ ${family.debt}`;
    const condition = `สุขภาพครอบครัว ${family.health} · ความผูกพัน ${family.bond} · ความขัดแย้ง ${family.conflict} · Legacy ${family.legacyScore}`;
    status.innerHTML = `<strong>${dynastyAllowed ? 'ร่องรอยที่ส่งต่อได้' : 'แผงมรดกตระกูล (ปลดล็อกในโหมดอิสระ/สืบตระกูล)'}</strong><small>${spouseText} · ${relatives}</small><small>${finances}</small><small>${condition}</small><div class="family-children">${children}</div>${family.construction ? `<small>กำลังก่อสร้าง: ${FAMILY_BUILDINGS.find(x => x.id === family.construction.id)?.name || family.construction.id} · อีก ${family.construction.monthsLeft} เดือน</small>` : ''}`;
    const canStart = dynastyAllowed && state.hero.ageMonths >= 15 * 12;
    $('marry-btn').disabled = !canStart || !!family.spouse;
    $('child-btn').disabled = !canStart || !family.spouse || state.month - family.lastChildMonth < 24;
    $('marry-btn').title = dynastyAllowed ? 'สร้างสายสัมพันธ์ที่อาจกลายเป็นมรดก' : 'ระบบนี้ไม่ใช่แกนของเรื่องตัวละครนี้';
    $('family-buildings').innerHTML = FAMILY_BUILDINGS.map(building => {
      const built = family.buildings.includes(building.id), buildingNow = family.construction?.id === building.id;
      return `<div class="family-building${built ? ' built' : ''}"><div><strong>${building.name}</strong><small>${built ? building.effect : `ใช้ ${building.cost} ตำลึง · ${building.effect}`}</small></div><button type="button" data-family-building="${building.id}" ${!canStart || built || !!family.construction || state.hero.money < building.cost ? 'disabled' : ''}>${built ? '已สร้าง' : buildingNow ? 'กำลังก่อสร้าง' : 'เริ่มสร้าง'}</button></div>`;
    }).join('');
    $('marry-btn').onclick = () => { if (marry(state)) { saveGame(); render(); } };
    $('child-btn').onclick = () => { if (haveChild(state)) { saveGame(); render(); } };
    $('family-buildings').querySelectorAll('[data-family-building]').forEach(button => button.onclick = () => { if (startFamilyBuilding(state, button.dataset.familyBuilding)) { saveGame(); render(); } });
  }
  function renderLegacy() {
    const oathPanel = $('oath-status'), pressurePanel = $('world-pressure-status');
    const world = ensureWorldState(state), route = ensureStoryRoute(state);
    const timeline = $('world-timeline-status');
    if (timeline) {
      const routeLabel = route.id === 'free' ? `แนวทางชีวิต: ${inferFreeLifeIdentity(state)}` : `Route: ${route.id}`;
      const eventLine = WORLD_EVENTS.map(event => `${event.title}: ${world.events[event.id]?.status || worldEventStatus(event, world.worldMonth)}`).join(' · ');
      timeline.innerHTML = `<small>ปฏิทินโลก เดือนที่ ${world.worldMonth} · ภูมิภาค ${world.region}</small><small>${routeLabel} · ความคืบหน้า ${route.progress}</small><small>ผลกระทบโลก · ผู้ลี้ภัย ${world.modifiers.refugeePressure} · เสี่ยงเดินทาง +${world.modifiers.travelRisk}</small><small>${eventLine}</small>`;
    }
    const news = $('world-news-list');
    if (news) news.innerHTML = world.news.length ? world.news.slice(0, 4).map(item => `<small>ข่าวโลก · ${item}</small>`).join('') : '<small>ยังไม่มีข่าวโลกที่รู้ถึงตัวเจ้า</small>';
    const directionPanel = $('life-direction-panel');
    if (directionPanel) {
      const direction = lifeDirection(state), auto = state.autoDoctrine === 'route' ? routeAutoDoctrine(state) : null;
      directionPanel.innerHTML = `<strong>ชีวิตนี้กำลังมุ่งไปทางไหน</strong><small>${direction.hints.join(' · ')}</small>${direction.missing.length ? `<small>ยังขาด: ${direction.missing.join(', ')}</small>` : ''}${auto ? `<small>Auto ตาม Route · สุขภาพขั้นต่ำ ${auto.floor}%</small>` : ''}`;
    }
    if (oathPanel) {
      const oaths = ensureOathState(state);
      oathPanel.innerHTML = oaths.active.length ? oaths.active.map(id => `<div><strong>${OATH_DEFS[id].name}</strong><small>${OATH_DEFS[id].desc}</small><button type="button" data-break-oath="${id}">ละทิ้งคำสัตย์</button></div>`).join('') : `<small>เลือกหลักที่อยากให้ชีวิตนี้ยึดถือ — คำสัตย์จะเปลี่ยนแรงกดดันและบทสรุป</small><div class="oath-choices">${Object.entries(OATH_DEFS).filter(([id]) => !oaths.broken.includes(id)).map(([id, oath]) => `<button type="button" data-choose-oath="${id}">${oath.name}</button>`).join('')}</div>`;
      oathPanel.querySelectorAll('[data-choose-oath]').forEach(button => button.onclick = () => { if (chooseOath(state, button.dataset.chooseOath)) { saveGame(); render(); } });
      oathPanel.querySelectorAll('[data-break-oath]').forEach(button => button.onclick = () => { if (breakOath(state, button.dataset.breakOath)) { saveGame(); render(); } });
    }
    if (pressurePanel) {
      const pressure = ensureWorldPressure(state);
      pressurePanel.innerHTML = Object.entries(PRESSURE_DEFS).map(([key, def]) => `<div class="pressure-row"><span>${def.name}</span><b>${pressure[key]}</b><i><em style="width:${pressure[key]}%"></em></i></div>`).join('');
    }
    const scars = $('world-scars-list');
    if (scars) scars.innerHTML = state.worldScars?.length ? state.worldScars.slice(-4).map(item => `<small>✦ ${item.text}</small>`).join('') : '<small>โลกยังไม่มีรอยแผลที่ถูกบันทึก</small>';
    renderReplayMeta();
  }

  function replayMetaLabel(id) {
    return String(id || '').replace(/^blessing:/, 'พร ').replace(/^(world_|middle_|debt_)/, '').replace(/_/g, ' ') || 'ไม่ระบุ';
  }
  function replayMetaSnapshot(s) {
    const meta = getMeta();
    const past = [...(meta.lifeRecords || []), ...(s?.lifeHistory || [])];
    const seen = new Set();
    const records = past.filter(record => {
      const key = `${record.endingType || ''}|${record.month || 0}|${record.deathSignature || ''}|${record.cause || ''}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(-20).reverse();
    return {
      records,
      unlockedCharacters: meta.unlockedCharacters || [],
      unlockedItems: meta.unlockedItems || [],
      unlockedTechniques: meta.unlockedTechniques || [],
      unlockedEvents: meta.unlockedEvents || [],
      blessings: meta.blessings || [],
      simulations: Number(meta.simulations || 0)
    };
  }
  function renderReplayMeta() {
    const status = $('replay-meta-status');
    const history = $('replay-life-history');
    const unlocks = $('replay-unlocks');
    if (!status || !history || !unlocks) return;
    const snapshot = replayMetaSnapshot(state);
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const worldLine = record => {
      const impact = record.worldImpact || {};
      const news = impact.news?.[0] ? ` · ข่าว: ${esc(impact.news[0])}` : '';
      const modifiers = impact.modifiers ? Object.entries(impact.modifiers).filter(([, value]) => Number(value) !== 0).slice(0, 3).map(([key, value]) => `${esc(key)} ${Number(value) > 0 ? '+' : ''}${esc(value)}`).join(', ') : '';
      return `โลกเดือน ${Number(impact.worldMonth || record.month || 0)}${news}${modifiers ? ` · ผลกระทบ ${modifiers}` : ''}`;
    };
    $('replay-meta-count').textContent = `${snapshot.records.length} ชีวิต`;
    status.innerHTML = `<small>ตัวละครปลดล็อก ${snapshot.unlockedCharacters.length} · พร ${snapshot.blessings.length} · ไอเท็ม ${snapshot.unlockedItems.length} · วิชา ${snapshot.unlockedTechniques.length} · เหตุการณ์ ${snapshot.unlockedEvents.length}</small><small>การจำลองอนาคตที่สะสม ${snapshot.simulations} ครั้ง</small>`;
    history.innerHTML = snapshot.records.length ? snapshot.records.map((record, index) => `<div class="replay-life-record"><strong>ชีวิตที่ ${snapshot.records.length - index} · ${esc(replayMetaLabel(record.endingType))}</strong><small>เดือน ${Number(record.month || 0)} · ${esc(record.cause || 'จบเส้นทางชีวิต')} · ลายเซ็น ${esc(record.deathSignature || 'ไม่มี')}</small><small>${worldLine(record)}</small></div>`).join('') : '<small>ยังไม่มีประวัติชีวิตที่จบลง — การตายหรือบทจบครั้งถัดไปจะถูกบันทึกไว้ที่นี่</small>';
    const groups = [
      ['ตัวละคร', snapshot.unlockedCharacters],
      ['ไอเท็ม', snapshot.unlockedItems],
      ['วิชา', snapshot.unlockedTechniques],
      ['เหตุการณ์', snapshot.unlockedEvents],
      ['พรจากบทจบ', snapshot.blessings]
    ];
    unlocks.innerHTML = groups.map(([label, values]) => `<small><b>${label}:</b> ${values.length ? values.slice(-8).map(value => esc(replayMetaLabel(value))).join(' · ') : 'ยังไม่มี'}</small>`).join('');
  }
  ['item-filter-type', 'item-filter-grade', 'item-filter-realm'].forEach(id => {
    $(id)?.addEventListener('change', () => { if (state) renderTechniques(); });
  });
  function renderTechniques() {
    normalizeDiscoveryManuals(state);
    const statNames = { attack: 'โจมตี', defense: 'ป้องกัน', body: 'กายา', agility: 'ว่องไว', spirit: 'จิตใจ', charisma: 'เสน่ห์', charm: 'เสน่ห์', comprehension: 'ปัญญา', intellect: 'ปัญญา', luck: 'วาสนา', karma: 'กรรม', training: 'ฝึกฝน', restHealth: 'ฟื้นสุขภาพเมื่อพัก', restQi: 'ฟื้นปราณเมื่อพัก', healthCost: 'สุขภาพที่เสียเมื่อฝึก', riskReduction: 'ลดโอกาสบาดเจ็บจากการฝึก', breakthroughProtection: 'คุ้มครองการทะลวง', breakthroughBonus: 'โอกาสทะลวง', cultivationRate: 'ความเร็วฝึกตน', masteryRate: 'ความเร็วชำนาญ', learningRate: 'ความเร็วเรียนรู้' };
    const loadout = ensureTechniqueLoadout(state);
    const activeIds = new Set(effectiveTechniques(state).map(t => t.id));
    const techniquePanel = $('technique-loadout-status');
    const renderSlots = (panel, title, labels, slots, active, resolveName, begin, resolveBonus) => {
      if (!panel) return;
      panel.replaceChildren();
      const heading = document.createElement('strong'); heading.textContent = title; panel.appendChild(heading);
      const note = document.createElement('p'); note.className = 'loadout-note';
      note.textContent = active ? 'เลือกวิชาหรืออุปกรณ์ด้านล่างเพื่อติดตั้ง · กดช่องที่มีของเพื่อถอด' : 'เซฟเดิมใช้งานทั้งหมดโดยอัตโนมัติ เมื่อเริ่มจัดชุดจะเลือกได้หนึ่งรายการต่อช่อง โบนัสอาจเปลี่ยน';
      panel.appendChild(note);
      if (!active) {
        const start = document.createElement('button'); start.type = 'button'; start.className = 'technique-equip'; start.textContent = 'เริ่มจัดชุด';
        start.onclick = () => { if (!state || state.pendingEvent) return; begin(state); syncCombat(state); saveGame(); render(); };
        panel.appendChild(start); return;
      }
      const grid = document.createElement('div'); grid.className = 'loadout-grid';
      Object.entries(labels).forEach(([slot, label]) => {
        const id = slots[slot]; const button = document.createElement('button'); button.type = 'button'; button.className = 'loadout-slot'; button.disabled = !id;
        const caption = document.createElement('small'); caption.textContent = label;
        const name = document.createElement('span'); name.className = 'slot-item-name'; name.textContent = id ? (resolveName(id) || 'ไม่พบรายการ') : 'ว่าง';
        button.append(caption, name);
        if (id && resolveBonus) {
          const bonusText = resolveBonus(id, slot);
          if (bonusText) {
            const bonusTag = document.createElement('span');
            bonusTag.className = 'slot-bonus-tag';
            bonusTag.textContent = bonusText;
            button.appendChild(bonusTag);
          }
        }
        if (id) { button.title = `ถอด ${name.textContent}`; button.onclick = () => { if (!state || state.pendingEvent) return; slots[slot] = null; syncCombat(state); saveGame(); render(); }; }
        grid.appendChild(button);
      });
      panel.appendChild(grid);
    };
    renderSlots(techniquePanel, 'ชุดวิชาที่ใช้งาน', TECHNIQUE_SLOT_LABELS, loadout, state.loadoutMode, id => TECHNIQUES.find(t => t.id === id)?.name, beginTechniqueLoadout, id => { const t = TECHNIQUES.find(x => x.id === id); return t ? `กำลัง ×${t.gradeData?.powerMultiplier || 1}` : ''; });
    if (techniquePanel) { const match = weaponTechniqueCompatibility(state); const note = document.createElement('p'); note.className = 'loadout-note'; note.textContent = match ? `วิชาและอาวุธเข้ากัน: ${match.technique} + ${match.weapon} · โจมตี ×1.10` : 'วิชาจู่โจมที่เข้ากับอาวุธที่สวมใส่เพิ่มโจมตี ×1.10'; techniquePanel.appendChild(note); }
    const techniques = TECHNIQUES.filter(t => t.unlock(state)).map(t => {
      const open = t.unlock(state), slot = techniqueSlot(t), active = open && activeIds.has(t.id);
      const action = open && state.loadoutMode ? `<button type="button" class="technique-equip${active ? ' active' : ''}" data-equip-technique="${t.id}">${active ? 'ถอดออก' : 'ติดตั้ง'}</button>` : '';
      return `<div class="technique ${open ? '' : 'locked'}"><div><strong>${open ? t.name : '???'}</strong><small>${open ? `${t.categoryData?.name || TECHNIQUE_SLOT_LABELS[slot]} · ${t.subtypeName}${t.id.startsWith('discovery_') ? ` · ขั้น ${esc(manualRealmName(manualRealmForTechnique(t)))}` : ''}${cultivationCeilingName(t) ? ` · ฝึกสูงสุด ${esc(cultivationCeilingName(t))}` : ''}${active ? ' · ใช้งาน' : ''} · <em class="item-grade grade-${t.grade}">${t.gradeData.name}</em>` : 'ยังไม่ค้นพบ'}</small></div>${open && t.description ? `<p class="technique-description">${esc(t.description)}</p>` : ''}<small>${open ? t.effect : 'เหตุการณ์ เงื่อนไข หรือค่าพลังบางอย่างจะเปิดเผยวิชานี้'}</small>${action}</div>`;
    }).join('');
    const undiscovered = TECHNIQUES.filter(t => !t.unlock(state)).length;
    $('techniques-list').innerHTML = (techniques || '<p class="empty">ยังไม่มีวิชาที่ค้นพบ</p>') + (undiscovered ? `<details class="undiscovered-techniques"><summary>วิชาที่ยังไม่ค้นพบ (${undiscovered})</summary><p>ค้นพบได้จากเหตุการณ์และการเดินทาง</p></details>` : '');
    $('techniques-list').querySelectorAll('[data-equip-technique]').forEach(button => {
      button.onclick = () => { if (!state || state.pendingEvent) return; equipTechnique(state, button.dataset.equipTechnique); syncCombat(state); saveGame(); render(); };
    });
    const focus = $('training-selection');
    if (focus) {
      const available = availableTrainingTechniques(state);
      const selected = selectedTrainingTechniques(state);
      state.trainingSelection = selected;
      focus.innerHTML = available.length
        ? available.map(t => `<button type="button" class="training-choice${selected.includes(t.id) ? ' selected' : ''}" data-training-id="${t.id}" aria-pressed="${selected.includes(t.id)}"><span>${selected.includes(t.id) ? '✓' : '＋'}</span><strong>${t.name}</strong><small>${t.effect}</small></button>`).join('')
        : '<p class="empty">ยังไม่มีวิชาที่ฝึกได้ — ระบบจะฝึกร่างกายทั่วไป</p>';
      const count = $('training-selection-count');
      if (count) count.textContent = `${selected.length}/2`;
      const note = $('training-selection-note');
      if (note) note.textContent = available.length ? 'ไม่เลือก = สุ่มฝึก 1 วิชาที่มี · เลือกได้สูงสุด 2 วิชา' : 'ไม่มีวิชาให้ฝึก · ใช้การฝึกร่างกายทั่วไป';
      focus.querySelectorAll('[data-training-id]').forEach(button => {
        button.onclick = () => {
          if (!state || state.pendingEvent) return;
          const id = button.dataset.trainingId;
          const next = selectedTrainingTechniques(state);
          const index = next.indexOf(id);
          if (index >= 0) next.splice(index, 1);
          else if (next.length < 2) next.push(id);
          state.trainingSelection = next;
          saveGame(); render();
        };
      });
    }
    const itemLoadout = ensureItemLoadout(state);
    const slotLabels = Object.fromEntries(Object.entries(ITEM_SLOT_DEFS).map(([id, def]) => [id, def.name]));
    const loadoutPanel = $('item-loadout-status');
    renderSlots(loadoutPanel, 'อุปกรณ์ที่สวมใส่', slotLabels, itemLoadout, state.itemLoadoutMode, id => { const item = findTreasure(state, id); return typeof item === 'object' ? `${item.name}${equipmentRequirement(state, item)?.eligible === false ? ' (ขั้นไม่ถึง · ไม่เกิดผล)' : ''}` : item; }, beginItemLoadout, id => { const item = findTreasure(state, id); if (!item) return ''; const normalized = typeof item === 'object' ? normalizeItemGrade(item) : normalizeItemGrade({ name: item, bonus: {} }); const b = effectiveTreasureBonus(state, normalized); const parts = Object.entries(b).map(([k, v]) => `${statNames[k] || k} ${v >= 0 ? '+' : ''}${v}${k === 'training' ? '%' : ''}`); return parts.slice(0, 2).join(' · '); });
    if (loadoutPanel && state.itemLoadoutMode) { const note = document.createElement('p'); note.className = 'loadout-note'; note.textContent = 'ของสำคัญที่ไม่มีช่องสวมใส่ยังให้ผลติดตัว'; loadoutPanel.appendChild(note); }
    if (loadoutPanel && equipmentMaturityFactor(state) < 1) { const note = document.createElement('p'); note.className = 'loadout-note'; note.textContent = `ตามวัย ใช้ค่าสู้รบจากไอเทมได้ ${Math.round(equipmentMaturityFactor(state) * 100)}% และจะเพิ่มจนเต็มเมื่ออายุ 12 ปี`; loadoutPanel.appendChild(note); }
    const typeFilter = $('item-filter-type')?.value || 'all', gradeFilter = $('item-filter-grade')?.value || 'all', realmFilter = $('item-filter-realm')?.value || 'all';
    const treasureItems = (state.treasures || []).filter(item => {
      const n = normalizeItemGrade(typeof item === 'object' ? item : { name: item, bonus: {} });
      const type = n.techniqueId ? 'manual' : n.craftingMaterial || n.category === 'material' ? 'material' : itemSlot(n) || n.subtype === 'ring' ? 'equipment' : 'relic';
      const req = n.techniqueId ? manualLearningRequirement(state, n)?.required : equipmentRequirement(state, n)?.realm;
      return (typeFilter === 'all' || type === typeFilter) && (gradeFilter === 'all' || n.grade === gradeFilter) && (realmFilter === 'all' || (realmFilter === 'other' ? req == null || req > 4 : req === Number(realmFilter)));
    });
    const treasures = treasureItems.map(item => {
      const normalized = typeof item === 'object' ? normalizeItemGrade(item) : normalizeItemGrade({ name: item, bonus: {} });
      const name = normalized.name, itemId = normalized.inventoryUid, bonus = effectiveTreasureBonus(state, normalized);
      const manualTechnique = normalized.techniqueId && TECHNIQUES.find(t => t.id === normalized.techniqueId);
      const requirement = manualTechnique ? manualLearningRequirement(state, normalized) : null;
      const effect = normalized.consumable ? 'ไอเท็มใช้สิ้นเปลือง ไม่ให้โบนัสเพียงเพราะเก็บไว้' : normalized.craftingMaterial ? 'วัสดุสำหรับสร้างของ ไม่ให้โบนัสเพียงเพราะเก็บไว้' : manualTechnique ? (manualTechnique.unlock(state) ? `เรียนรู้ ${manualTechnique.name} แล้ว` : requirement.eligible ? `ใช้กิจกรรมเรียนรู้เพื่อศึกษาวิชา ${manualTechnique.name}` : `ยังเรียนไม่ได้ · ต้องมีขั้น ${requirement.name}`) : (Object.entries(bonus).map(([k, v]) => `${statNames[k] || k} ${v >= 0 ? '+' : ''}${v}${k === 'training' ? '%' : ''}`).join(' · ') || 'วัตถุสำคัญต่อชะตา');
      const baseSlot = itemSlot(normalized);
      const equipSlot = normalized.subtype === 'ring' ? (itemLoadout.ring1 === itemId ? 'ring1' : itemLoadout.ring2 === itemId ? 'ring2' : itemLoadout.ring1 ? 'ring2' : 'ring1') : baseSlot;
      const equipped = equipSlot && itemLoadout[equipSlot] === itemId;
      const ageAllowed = itemAllowedByAge(state, normalized);
      const equipRequirement = equipmentRequirement(state, normalized);
      const allowed = ageAllowed && (equipRequirement?.eligible !== false);
      const blockedReason = !ageAllowed ? 'เด็กเล็กสวมใส่ได้เฉพาะเครื่องประดับ' : `ต้องมีขั้น ${equipRequirement?.name}`;
      const unopened = isUnopenedStoryContainer(normalized);
      const active = activeTreasures(state).includes(item);
      const status = unopened ? 'ยังไม่เปิดผนึก · รอเนื้อเรื่อง · ไม่เกิดผล' : manualTechnique ? 'คัมภีร์สำหรับเรียนรู้ · ไม่ใช่วิชาที่ติดตั้ง' : normalized.craftingMaterial ? 'วัตถุดิบ · ไม่ให้ผลติดตัว' : equipSlot ? (!allowed ? `ยังใช้ไม่ได้ · ${blockedReason}` : active ? (state.itemLoadoutMode ? 'สวมใส่และเกิดผล' : 'เกิดผลอัตโนมัติในเซฟเดิม') : 'ต้องสวมใส่จึงเกิดผล') : (equipRequirement?.eligible === false ? `ยังไม่เกิดผล · ต้องมีขั้น ${equipRequirement.name}` : active && Object.keys(bonus).length ? 'พกไว้แล้วเกิดผล' : 'ไม่เกิดผลติดตัว');
      const current = equipSlot && state.itemLoadoutMode && !equipped ? findTreasure(state, itemLoadout[equipSlot]) : null;
      const currentBonus = current && activeTreasures(state).includes(current) ? effectiveTreasureBonus(state, normalizeItemGrade(current)) : {};
      const differences = current ? [...new Set([...Object.keys(bonus), ...Object.keys(currentBonus)])].map(key => { const delta = Math.round(((Number(bonus[key]) || 0) - (Number(currentBonus[key]) || 0)) * 100) / 100; return delta ? `${statNames[key] || key} ${delta > 0 ? '+' : ''}${delta}${key === 'training' ? '%' : ''}` : ''; }).filter(Boolean) : [];
      const comparison = current ? `<small class="item-comparison">เทียบกับ ${esc(current.name || current)}: ${esc(differences.join(' · ') || 'ค่าสถานะเท่ากัน')}${!allowed ? ' (เมื่อใช้ได้)' : ''}</small>` : '';
      const action = equipSlot && state.itemLoadoutMode ? `<button type="button" class="technique-equip${equipped ? ' active' : ''}" data-equip-item="${encodeURIComponent(itemId)}" data-equip-slot="${equipSlot}" ${allowed || equipped ? '' : `disabled title="${esc(blockedReason)}"`}>${equipped ? (allowed ? 'ถอดออก' : 'ถอดออก · ไม่เกิดผล') : allowed ? `ใส่${slotLabels[equipSlot]}` : esc(blockedReason)}</button>` : '';
      return `<div class="technique treasure"><div><strong>✦ ${esc(name)}</strong><small class="item-grade grade-${normalized.grade}">${normalized.gradeData.name} · ${normalized.categoryData?.name || 'ไอเท็ม'} · ${normalized.subtypeName}${requirement ? ` · ขั้นต่ำเรียน ${esc(requirement.name)}${cultivationCeilingName(manualTechnique) ? ` · ฝึกสูงสุด ${esc(cultivationCeilingName(manualTechnique))}` : ''}` : equipRequirement ? ` · ขั้นต่ำ ${esc(equipRequirement.name)}` : ''}</small></div><span class="item-status">${esc(status)}</span>${normalized.description ? `<p class="technique-description">${esc(normalized.description)}</p>` : ''}<small class="item-effect">${unopened ? 'ยังไม่ทราบสิ่งที่อยู่ภายใน' : esc(effect)} · มูลค่า ${normalized.value}</small>${comparison}${action}</div>`;
    }).join('');
    $('treasures-list').innerHTML = treasures || `<p class="empty">${state.treasures?.length ? 'ไม่มีไอเท็มที่ตรงกับตัวกรอง' : 'ยังไม่มีไอเท็มในคลัง'}</p>`;
    $('treasures-list').querySelectorAll('[data-equip-item]').forEach(button => {
      button.onclick = () => { if (!state || state.pendingEvent) return; equipItem(state, decodeURIComponent(button.dataset.equipItem), button.dataset.equipSlot); syncCombat(state); saveGame(); render(); };
    });
  }
  function updateWorldCopy() {
    const worldMonth = state.world?.worldMonth ?? state.month;
    let omen = worldMonth < 24 ? 'ประกาศตามหาทายาทตระกูลหลินถูกติดทั่วเมือง' : worldMonth < 60 ? 'คนของทางการสอบถามเด็กเร่ร่อนตามถนนสายเหนือ' : worldMonth < 84 ? 'ข่าวลือว่าผู้รอดชีวิตตระกูลหลินยังมีชีวิตเริ่มแพร่ไปตลาดมืด' : worldMonth < 98 ? 'พ่อค้าเร่พูดถึงโจรชุดดำที่ปรากฏใกล้ชายแดน' : worldMonth < 110 ? 'สัตว์ป่าอพยพลงจากเขา ราวกับหวาดกลัวบางสิ่ง' : worldMonth < 122 ? 'ควันจากหมู่บ้านตะวันตกมองเห็นได้ถึงยอดเขา' : worldMonth < 134 ? 'ผู้ลี้ภัยเริ่มมาถึง ขณะที่เสบียงในสำนักลดลง' : worldMonth < 140 ? 'สายลับถูกพบใกล้กำแพง สำนักแบ่งเป็นหลายฝ่าย' : 'หิมะกำลังละลาย เสียงกลองศึกดังมาจากหุบเขา';
    if (state.mode === 'free' && state.world?.news?.length) omen = state.world.news[0];
    if (state.flags.masterCrippled && state.month >= 128) omen += ' (อาจารย์เหวินไอเป็นเลือด แขนขวาใช้การไม่ได้)';
    $('world-omen').textContent = omen;
  }

  function startNewGame() {
    const input = $('hero-name');
    if (selectedMode === 'story' && selectedCharacter !== 'lin-an') {
      toast('ตัวละครนี้ปิดชั่วคราวระหว่างพัฒนาระบบหลัก');
      return;
    }
    const character = STORY_CHARACTERS[selectedCharacter] || STORY_CHARACTERS['lin-an'];
    const name = selectedMode === 'story' ? character.name : (input.value.trim() || 'ผู้พเนจร');
    if (selectedRoot === 'none') selectedRoot = 'human';
    const gender = selectedMode === 'story' ? (character.gender || 'unspecified') : ($('hero-gender').value || 'unspecified');
    state = defaultState(name, selectedTalent, selectedRoot, gender);
    state.mode = selectedMode; state.characterId = selectedMode === 'story' ? character.id : 'free-life'; state.ruleSet = selectedMode === 'story' ? character.ruleSet : selectedRule;
    state.hero.ageMonths = selectedMode === 'story' ? character.startAgeMonths : 0;
    if (selectedMode === 'free') state.activity = 'rest';
    state.world.worldMonth = 0;
    state.worldMonth = 0; state.characterMonth = 0;
    state.storyRoute.id = selectedMode === 'free' ? 'free' : null;
    const unluckyOrigin = state.ruleSet === LIFE_RULES.unluckyIsekai.id ? rollUnluckyOrigin(state) : null;
    syncCombat(state);
    if (selectedMode === 'story' && character.id === 'lin-an') {
      addLog(`${name} อายุห้าขวบในคืนที่ตระกูลหลินถูกลบออกจากเมือง พร้อม “${TALENTS[selectedTalent].name}” แต่ยังไม่รู้ว่าตนมีรากวิญญาณแบบใด`, true);
      state.pendingEvent = 'fallenHouse';
    } else if (selectedMode === 'story' && character.intro) {
      addLog(`${name} เริ่มต้นเรื่องราวในธีม “${character.title}”`, true);
      if (unluckyOrigin) addLog(`ต้นกำเนิดสุ่ม: ${unluckyOrigin.name} — ${unluckyOrigin.effect}`, true);
      state.pendingEvent = character.intro;
    } else {
      addLog(`${name} เริ่มจำลองชีวิตอิสระ กฎการต่อชีวิตคือ “${Object.values(LIFE_RULES).find(rule => rule.id === state.ruleSet)?.name || 'หนึ่งชีวิต'}”`, true);
      if (unluckyOrigin) addLog(`ต้นกำเนิดสุ่ม: ${unluckyOrigin.name} — ${unluckyOrigin.effect}`, true);
    }
    showScreen('game-screen'); render(); saveGame(); startTimer();
    if (state.pendingEvent) setTimeout(() => {
      if (!state || !state.pendingEvent) return;
      const opening = EVENTS[state.pendingEvent] || STORY_CHARACTER_EVENTS[state.pendingEvent];
      if (opening) triggerEvent(state.pendingEvent, opening);
    }, 250);
  }

  function migrateState(data) {
    if (!data || !data.hero || typeof data.month !== 'number') throw new Error('invalid save');
    data.choiceHistory = Array.isArray(data.choiceHistory) ? data.choiceHistory : Object.entries(data.choices || {}).map(([id, choice]) => ({ id, ...choice }));
    data.hero.gender = ['male', 'female', 'unspecified'].includes(data.hero.gender) ? data.hero.gender : (STORY_CHARACTERS[data.characterId || '']?.gender || 'unspecified');
    if (data.version === VERSION) { data.mode = data.mode || 'story'; data.characterId = data.characterId || 'lin-an'; data.ruleSet = data.ruleSet || LIFE_RULES.oneLife.id; data.hero.name = data.characterId === 'lin-an' ? 'หลินอัน' : (data.hero.name || STORY_CHARACTERS[data.characterId]?.name || 'ผู้พเนจร'); data.hero.stage = clamp(data.hero.stage || 1, 1, 9); data.hero.powerBonus = Number.isFinite(data.hero.powerBonus) ? data.hero.powerBonus : 0; data.trainingSelection = Array.isArray(data.trainingSelection) ? data.trainingSelection.slice(0, 2) : []; data.loadoutMode = !!data.loadoutMode; ensureTechniqueLoadout(data); ensureTrainingState(data); ensureLearningState(data); data.autoMode = !!data.autoMode; data.autoActivity = ACTIVITY[data.autoActivity] ? data.autoActivity : 'train'; data.autoDoctrine = AUTO_DOCTRINES[data.autoDoctrine] ? data.autoDoctrine : 'survive'; ensureAutoSchedule(data); ensureAutoRestRule(data); ensureAutoWorkRule(data); ensureAutoSocialRule(data); ensureLocationState(data); ensureQuestState(data); ensureRelationshipState(data); ensureSocialState(data); ensureInventory(data); ensureHousehold(data); ensureSectCareer(data); ensureFamilyState(data); ensureOathState(data); ensureWorldPressure(data); data.factions = data.factions || { sect: 0, serpent: 0, jianghu: data.hero.reputation || 0 }; ensureStateLayers(data); syncCombat(data); return data; }
    if (data.version === VERSION) { data.mode = data.mode || 'story'; data.characterId = data.characterId || 'lin-an'; data.ruleSet = data.ruleSet || LIFE_RULES.oneLife.id; data.hero.name = data.characterId === 'lin-an' ? 'หลินอัน' : (data.hero.name || STORY_CHARACTERS[data.characterId]?.name || 'ผู้พเนจร'); data.hero.stage = clamp(data.hero.stage || 1, 1, 9); data.hero.powerBonus = Number.isFinite(data.hero.powerBonus) ? data.hero.powerBonus : 0; data.trainingSelection = Array.isArray(data.trainingSelection) ? data.trainingSelection.slice(0, 2) : []; data.loadoutMode = !!data.loadoutMode; ensureTechniqueLoadout(data); ensureTrainingState(data); ensureLearningState(data); data.autoMode = !!data.autoMode; data.autoActivity = ACTIVITY[data.autoActivity] ? data.autoActivity : 'train'; data.autoDoctrine = AUTO_DOCTRINES[data.autoDoctrine] ? data.autoDoctrine : 'survive'; ensureAutoSchedule(data); ensureAutoRestRule(data); ensureAutoWorkRule(data); ensureAutoSocialRule(data); ensureLocationState(data); ensureQuestState(data); ensureRelationshipState(data); ensureSocialState(data); ensureInventory(data); ensureHousehold(data); ensureSectCareer(data); ensureOfficialCareer(data); ensureFamilyState(data); ensureOathState(data); ensureWorldPressure(data); data.factions = data.factions || { sect: 0, serpent: 0, jianghu: data.hero.reputation || 0 }; ensureStateLayers(data); syncCombat(data); return data; }
    if (data.version === VERSION) { data.mode = data.mode || 'story'; data.characterId = data.characterId || 'lin-an'; data.ruleSet = data.ruleSet || LIFE_RULES.oneLife.id; data.hero.name = data.characterId === 'lin-an' ? 'หลินอัน' : (data.hero.name || STORY_CHARACTERS[data.characterId]?.name || 'ผู้พเนจร'); data.hero.stage = clamp(data.hero.stage || 1, 1, 9); data.hero.powerBonus = Number.isFinite(data.hero.powerBonus) ? data.hero.powerBonus : 0; data.trainingSelection = Array.isArray(data.trainingSelection) ? data.trainingSelection.slice(0, 2) : []; data.loadoutMode = !!data.loadoutMode; ensureTechniqueLoadout(data); ensureTrainingState(data); data.autoMode = !!data.autoMode; data.autoActivity = ACTIVITY[data.autoActivity] ? data.autoActivity : 'train'; data.autoDoctrine = AUTO_DOCTRINES[data.autoDoctrine] ? data.autoDoctrine : 'survive'; ensureAutoSchedule(data); ensureAutoRestRule(data); ensureAutoFreeRule(data); ensureLocationState(data); ensureQuestState(data); ensureRelationshipState(data); ensureInventory(data); ensureHousehold(data); ensureSectCareer(data); ensureFamilyState(data); ensureOathState(data); ensureWorldPressure(data); data.factions = data.factions || { sect: 0, serpent: 0, jianghu: data.hero.reputation || 0 }; ensureStateLayers(data); syncCombat(data); return data; }
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(data.version)) throw new Error('unsupported version');
    if (data.version === VERSION) { data.mode = data.mode || 'story'; data.characterId = data.characterId || 'lin-an'; data.ruleSet = data.ruleSet || LIFE_RULES.oneLife.id; data.hero.name = data.characterId === 'lin-an' ? 'หลินอัน' : (data.hero.name || STORY_CHARACTERS[data.characterId]?.name || 'ผู้พเนจร'); data.hero.stage = clamp(data.hero.stage || 1, 1, 9); data.hero.powerBonus = Number.isFinite(data.hero.powerBonus) ? data.hero.powerBonus : 0; data.trainingSelection = Array.isArray(data.trainingSelection) ? data.trainingSelection.slice(0, 2) : []; data.loadoutMode = !!data.loadoutMode; ensureTechniqueLoadout(data); ensureTrainingState(data); data.autoMode = !!data.autoMode; data.autoActivity = ACTIVITY[data.autoActivity] ? data.autoActivity : 'train'; data.autoDoctrine = AUTO_DOCTRINES[data.autoDoctrine] ? data.autoDoctrine : 'survive'; ensureAutoFamilyRule(data); ensureAutoSchedule(data); ensureAutoRestRule(data); ensureLocationState(data); ensureQuestState(data); ensureRelationshipState(data); ensureInventory(data); ensureHousehold(data); ensureSectCareer(data); ensureFamilyState(data); ensureOathState(data); ensureWorldPressure(data); data.factions = data.factions || { sect: 0, serpent: 0, jianghu: data.hero.reputation || 0 }; ensureStateLayers(data); syncCombat(data); return data; }
    if (![1, 2, 3, 4, 5, 6, 7, 8].includes(data.version)) throw new Error('unsupported version');
    const sourceVersion = data.version;
    if (data.version === 1) data.paths = {
      compassion: (data.flags.helpedFriend ? 3 : 0) + Math.max(0, Math.floor((data.relations.friend || 0) / 15)),
      duty: (data.flags.choseLoyalty ? 4 : 0) + (data.flags.warnedMaster ? 3 : 0) + Math.max(0, Math.floor((data.relations.master || 0) / 20)),
      freedom: (data.flags.escapePrepared ? 4 : 0) + (data.flags.stepLearned ? 2 : 0),
      insight: (data.flags.foundMap ? 3 : 0) + (data.flags.knowsTraitor ? 3 : 0)
    };
    if (sourceVersion <= 2 && !data.ending) { data.month += 84; data.flags.loneWanderer = true; }
    data.version = VERSION;
    data.choices = data.choices || {};
    ensureQuestState(data);
    ensureRelationshipState(data);
    ensureSocialState(data);
    ensureAutoFamilyRule(data);
    ensureInventory(data);
    ensureHousehold(data);
    ensureAutoWorkRule(data);
    ensureSectCareer(data);
    ensureOfficialCareer(data);
    ensureFamilyState(data);
    ensureOathState(data);
    ensureWorldPressure(data);
    ensureWorldState(data);
    ensureStoryRoute(data);
    data.trainingSelection = Array.isArray(data.trainingSelection) ? data.trainingSelection.slice(0, 2) : [];
    ensureTrainingState(data); ensureLearningState(data);
    data.loadoutMode = !!data.loadoutMode;
    ensureTechniqueLoadout(data);
    ensureItemLoadout(data);
    data.autoMode = !!data.autoMode;
    data.autoActivity = ACTIVITY[data.autoActivity] ? data.autoActivity : 'train';
    data.autoDoctrine = AUTO_DOCTRINES[data.autoDoctrine] ? data.autoDoctrine : 'survive';
    ensureAutoFamilyRule(data);
    ensureAutoSchedule(data);
    ensureAutoRestRule(data);
    ensureAutoSocialRule(data);
    ensureAutoFreeRule(data);
    ensureLocationState(data);
    data.treasures = data.treasures || [];
    data.factions = data.factions || { sect: 0, serpent: 0, jianghu: data.hero.reputation || 0 };
    data.lastRandomMonth = Number.isFinite(data.lastRandomMonth) ? data.lastRandomMonth : -99;
    data.flags = data.flags && typeof data.flags === 'object' ? data.flags : {};
    const oldFlags = { ...data.flags };
    Object.assign(data.flags, {
      basicCultivation: data.month >= 84,
      cultivationCapped: false,
      shieldLearned: false,
      bodyLearned: false,
      cultivationLearned: false,
      workedUnderworld: false,
      darkPastFromChildhood: false,
      loyalRetainer: false,
      loneWanderer: false,
      retainerAlive: false,
      houseEnemyKnown: false,
      familyToken: false,
      shelterBuilt: false,
      alliesRecruited: false,
      traitorExposed: false,
      civiliansSaved: false,
      forbiddenPower: false,
      betrayedSect: false,
      spiritWeapon: false,
      spiritFruit: false,
      enlightenment: false,
      masterHealed: oldFlags.masterHealed || false,
      masterCrippled: oldFlags.masterCrippled || false,
      masterBondGiven: oldFlags.masterBondGiven || false,
      seniorBondGiven: oldFlags.seniorBondGiven || false,
      friendBondGiven: oldFlags.friendBondGiven || false
    }, oldFlags);
    data.pendingEvent = null;
    data.mode = data.mode || 'story'; data.characterId = data.characterId || 'lin-an'; data.ruleSet = data.ruleSet || LIFE_RULES.oneLife.id;
    data.runId = typeof data.runId === 'string' && data.runId ? data.runId : createRunId(); data.hero.name = data.hero.name || (data.characterId === 'lin-an' ? 'หลินอัน' : STORY_CHARACTERS[data.characterId]?.name || 'ผู้พเนจร'); data.hero.root = data.hero.root || 'human'; data.hero.stage = clamp(data.hero.stage || data.hero.realm || 1, 1, 9); data.hero.powerBonus = 0; if (sourceVersion <= 4) data.hero.realm = 1; ensureCombat(data); updateFactionReputation(data); syncCombat(data);
    ensureStateLayers(data);
    if (!data.ending) addLogFor(data, `บันทึกเวอร์ชัน ${sourceVersion} ถูกอัปเกรดสู่เวอร์ชัน ${VERSION} สำเร็จ`, true);
    return data;
  }

  function addLogFor(data, text, highlight = false) { data.log = data.log || []; data.log.unshift({ month: data.month, text, highlight, at: Date.now() }); }
  function resolveEventById(s, id) {
    if (!id) return null;
    if (id === 'training-health-warning') return trainingHealthWarning();
    if (String(id).startsWith('breakthrough-')) return breakthroughEvent(s);
    if (String(id).startsWith('world_')) {
      const worldEvent = WORLD_EVENTS.find(event => `world_${event.id}` === id);
      return worldEventIntervention(s, worldEvent);
    }
    return EVENTS[id] || ALTERNATE_ROUTE_EVENTS[id] || STORY_CHARACTER_EVENTS[id] || INFANT_LEGENDARY_EVENTS.find(e => e.id === id) || INFANT_EPIC_EVENTS.find(e => e.id === id) || MIDDLE_GAME_EVENTS.find(e => e.id === id) || DEBT_EVENTS.find(e => e.id === id) || RANDOM_EVENTS.find(e => e.id === id)
      || EXPLORATION_EVENTS.find(e => e.id === id)
      || LEARNING_EVENTS.find(e => e.id === id)
      || SOCIAL_EVENTS.find(e => e.id === id)
      || REST_EVENTS.find(e => e.id === id) || CRAFT_EVENTS.find(e => e.id === id) || FAMILY_EVENTS.find(e => e.id === id) || TRAVEL_EVENTS.find(e => e.id === id) || FREE_LIFE_EVENTS.find(e => e.id === id) || buildLibraryDiscoveryEvents().find(e => e.id === id) || buildUniqueGradedEvents(s, annualLifePhase(s)).find(e => e.id === id) || buildAnnualEventPool(s).find(e => e.id === id) || null;
  }
  function showOfflineSummary(summary) {
    const content = $('offline-summary-content');
    const modal = $('offline-modal');
    if (!content || !modal || !summary) return;

    const healthDiffText = summary.deltaHealth > 0
      ? `<span style="color:#22c55e;">+${Math.round(summary.deltaHealth)}</span>`
      : summary.deltaHealth < 0
      ? `<span style="color:#ef4444;">${Math.round(summary.deltaHealth)}</span>`
      : '±0';
    const moneyDiffText = summary.deltaMoney > 0
      ? `<span style="color:#22c55e;">+${summary.deltaMoney}</span>`
      : summary.deltaMoney < 0
      ? `<span style="color:#ef4444;">${summary.deltaMoney}</span>`
      : '±0';

    let activitiesHtml = Object.entries(summary.activityCounts || {})
      .map(([act, count]) => `<li>${getActivityDisplayName(state, act).name}: <strong>${count}</strong> เดือน</li>`)
      .join('');
    if (!activitiesHtml) activitiesHtml = '<li>ไม่มีข้อมูลกิจกรรม</li>';

    let itemsHtml = '';
    if (summary.gainedItems && summary.gainedItems.length) {
      itemsHtml = summary.gainedItems.map(item => `<span class="badge" style="background:rgba(255,255,255,0.08); padding:2px 8px; border-radius:4px; margin-right:4px;">${item}</span>`).join(' ');
    } else {
      itemsHtml = '<span style="color:var(--text-muted);">ไม่มีไอเทมใหม่</span>';
    }

    content.innerHTML = `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 12px;">
          <div>
            <div style="color: var(--text-muted); font-size: 0.78rem;">เวลานอกเกมจริง</div>
            <div style="font-weight: 600; font-size: 1.05rem;">${summary.realMinutes} นาที</div>
          </div>
          <div>
            <div style="color: var(--text-muted); font-size: 0.78rem;">เวลาจำลองในเกม</div>
            <div style="font-weight: 600; font-size: 1.05rem;">${summary.simulatedMonths} / ${summary.capMonths} เดือน</div>
          </div>
          <div>
            <div style="color: var(--text-muted); font-size: 0.78rem;">สุขภาพสุทธิ</div>
            <div style="font-weight: 600; font-size: 1.05rem;">${Math.round(summary.endHealth)}/${summary.maxHealth} (${healthDiffText})</div>
          </div>
          <div>
            <div style="color: var(--text-muted); font-size: 0.78rem;">เงินทองสุทธิ</div>
            <div style="font-weight: 600; font-size: 1.05rem;">${summary.endMoney} ตำลึง (${moneyDiffText})</div>
          </div>
        </div>
        <div style="border-top: 1px dashed var(--border-color); padding-top: 10px; margin-top: 6px;">
          <span style="color: var(--text-muted);">เหตุผลที่หยุดจำลอง:</span>
          <strong style="color: var(--accent, #f59e0b); margin-left: 6px;">${summary.stopReason}</strong>
        </div>
      </div>
      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 6px 0; font-size: 0.9rem; color: var(--text-light, #f3f4f6);">สัดส่วนกิจกรรมที่ทำ</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-muted);">
          ${activitiesHtml}
        </ul>
      </div>
      <div>
        <h4 style="margin: 0 0 6px 0; font-size: 0.9rem; color: var(--text-light, #f3f4f6);">ของและวัตถุดิบสำคัญที่ได้รับ</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.85rem;">
          ${itemsHtml}
        </div>
      </div>
    `;
    modal.hidden = false;
  }

  function dismissOfflineModal() {
    const modal = $('offline-modal');
    if (modal) modal.hidden = true;
    if (!state) return;
    if (state.ending) {
      showSummary(state.ending.type, state.ending.extra);
      return;
    }
    if (state.pendingEvent) {
      const event = resolveEventById(state, state.pendingEvent);
      if (event) triggerEvent(state.pendingEvent, event);
      else { state.pendingEvent = null; toast('เหตุการณ์ที่ค้างอยู่ไม่รองรับแล้ว'); saveGame(); }
    }
  }

  function continueGame() {
    if (isGuestSession()) { toast('Guest ไม่สามารถเล่นต่อจากเซฟได้'); return; }
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      state = migrateState(JSON.parse(raw));
      if (state.ending) { showSummary(state.ending.type, state.ending.extra); return; }
      const offlineSummary = applyOfflineProgress();
      showScreen('game-screen');
      render();
      if (offlineSummary) {
        showOfflineSummary(offlineSummary);
      } else if (state.pendingEvent) {
        const event = resolveEventById(state, state.pendingEvent);
        if (event) triggerEvent(state.pendingEvent, event);
        else { state.pendingEvent = null; toast('เหตุการณ์ที่ค้างอยู่ไม่รองรับแล้ว'); saveGame(); }
      }
      startTimer();
    } catch (e) {
      try { localStorage.setItem(CORRUPTED_SAVE_BACKUP_KEY, raw); } catch (backupError) { /* เก็บเซฟเดิมไว้ แม้พื้นที่สำรองจะเต็ม */ }
      toast('ไฟล์บันทึกมีปัญหา แต่ยังเก็บข้อมูลเดิมไว้ที่ไฟล์สำรองแล้ว');
      refreshTitle();
    }
  }

  function applyOfflineProgress() {
    if (!state || isGuestSession()) return null;
    const lastSaved = state.lastSavedAt;
    if (!lastSaved || typeof lastSaved !== 'number') {
      state.lastSavedAt = Date.now();
      return null;
    }
    const elapsed = Math.max(0, Date.now() - lastSaved);
    const months = Math.min(12, Math.floor(elapsed / (5 * 60 * 1000)));
    if (months <= 0) return null;

    const startHealth = state.hero.health;
    const startMaxHealth = state.hero.maxHealth;
    const startMoney = state.hero.money;
    const startItemCounts = {};
    (state.consumables || []).forEach(it => { startItemCounts[it.name] = (startItemCounts[it.name] || 0) + 1; });
    (state.inventory || []).forEach(it => { startItemCounts[it.name] = (startItemCounts[it.name] || 0) + (it.count || 1); });

    let done = 0;
    let stopReason = months >= 12 ? 'ครบเพดานเวลาจำลองออฟไลน์สูงสุด (12 เดือน / 60 นาทีจริง)' : 'จำลองครบตามช่วงเวลาที่ไม่ได้เข้าเล่น';
    const activityCounts = {};

    state.paused = false;
    for (let i = 0; i < months; i++) {
      const act = state.activity;
      const ok = processMonth(true);
      activityCounts[act] = (activityCounts[act] || 0) + 1;
      done++;

      if (state.ending) {
        stopReason = `ตัวละครเสียชีวิตหรือสิ้นสุดเส้นทางชีวิต (${state.ending.title || 'ชีวิตดับสูญ'})`;
        break;
      }
      if (state.pendingEvent) {
        const evt = resolveEventById(state, state.pendingEvent);
        stopReason = `พบเหตุการณ์หรือจุดตัดสินใจสำคัญ: "${evt?.title || 'เหตุการณ์ระหว่างทาง'}"`;
        break;
      }
      const healthPct = state.hero.maxHealth ? (state.hero.health / state.hero.maxHealth) * 100 : 100;
      if (healthPct <= 35) {
        stopReason = `สุขภาพลดลงสู่ระดับวิกฤต (${Math.round(state.hero.health)}/${state.hero.maxHealth}) หยุดจำลองเพื่อความปลอดภัย`;
        break;
      }
      if (!ok) {
        stopReason = 'ระบบหยุดจำลองตามเงื่อนไขความปลอดภัย';
        break;
      }
    }
    state.paused = true;
    state.lastSavedAt = Date.now();
    saveGame();

    if (done === 0) return null;

    const endItemCounts = {};
    (state.consumables || []).forEach(it => { endItemCounts[it.name] = (endItemCounts[it.name] || 0) + 1; });
    (state.inventory || []).forEach(it => { endItemCounts[it.name] = (endItemCounts[it.name] || 0) + (it.count || 1); });

    const gainedItems = [];
    Object.keys(endItemCounts).forEach(name => {
      const diff = endItemCounts[name] - (startItemCounts[name] || 0);
      if (diff > 0) gainedItems.push(`${name} x${diff}`);
    });

    addLog(`เวลานอกเกมผ่านไป ${done} เดือน (${stopReason})`, true);

    return {
      realMinutes: Math.floor(elapsed / (60 * 1000)),
      simulatedMonths: done,
      capMonths: 12,
      activityCounts,
      deltaHealth: state.hero.health - startHealth,
      endHealth: state.hero.health,
      maxHealth: state.hero.maxHealth,
      deltaMoney: state.hero.money - startMoney,
      endMoney: state.hero.money,
      stopReason,
      gainedItems
    };
  }
  function startTimer() { stopTimer(); tickTimer = setInterval(() => { if (!state || state.paused || state.pendingEvent || state.ending) return; for (let i = 0; i < state.speed; i++) { if (!processMonth()) break; } }, 3200); }
  function stopTimer() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }
  function saveGame() { if (!state || isGuestSession()) return; syncStateLayers(state); state.lastSavedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function exportSave() { if (!state) return; saveGame(); const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `one-life-${state.hero.name}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); toast('ส่งออกบันทึกแล้ว'); }
  function importSave(file) { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { state = migrateState(JSON.parse(reader.result)); saveGame(); $('drawer').hidden = true; if (state.ending) showSummary(state.ending.type, state.ending.extra); else { showScreen('game-screen'); render(); startTimer(); if (state.pendingEvent) { const e = resolveEventById(state, state.pendingEvent); if (e) triggerEvent(state.pendingEvent, e); else { state.pendingEvent = null; saveGame(); toast('เหตุการณ์ที่ค้างอยู่ไม่รองรับแล้ว'); } } } toast('นำเข้าบันทึกสำเร็จ'); } catch (e) { toast('ไฟล์บันทึกไม่ถูกต้อง'); } }; reader.readAsText(file); }
  function getMeta() {
    if (isGuestSession()) return emptyMeta();
    try {
      const parsed = JSON.parse(localStorage.getItem(META_KEY));
      const endings = Array.isArray(parsed?.endings) ? parsed.endings.filter(id => typeof id === 'string') : [];
      const grades = parsed?.grades && typeof parsed.grades === 'object' ? parsed.grades : {};
      const unlockedCharacters = deriveUnlockedCharacters({ endings });
      const simulationRewards = parsed?.simulationRewards && typeof parsed.simulationRewards === 'object' ? parsed.simulationRewards : { cultivation: 0, money: 0, insight: 0 };
      const achievements = Array.isArray(parsed?.achievements) ? parsed.achievements.filter(id => typeof id === 'string') : [];
      const list = key => Array.isArray(parsed?.[key]) ? [...new Set(parsed[key].filter(id => typeof id === 'string'))] : [];
      return { endings: [...new Set(endings)], grades, unlockedCharacters: [...new Set(unlockedCharacters)], achievements: [...new Set(achievements)], unlockedItems: list('unlockedItems'), unlockedTechniques: list('unlockedTechniques'), unlockedEvents: list('unlockedEvents'), blessings: list('blessings'), lifeRecords: Array.isArray(parsed?.lifeRecords) ? parsed.lifeRecords.slice(-20) : [], simulations: Number(parsed?.simulations || 0), simulationRewards, clearedRunIds: Array.isArray(parsed?.clearedRunIds) ? [...new Set(parsed.clearedRunIds.filter(id => typeof id === 'string'))] : [] };
    } catch (e) { return emptyMeta(); }
  }
  function refreshCharacterUnlocks() {
    document.querySelectorAll('.mode-card[data-character]').forEach(button => {
      const character = STORY_CHARACTERS[button.dataset.character];
      const unlocked = character?.id === 'lin-an';
      const small = button.querySelector('small');
      if (small && !button.dataset.originalNote) button.dataset.originalNote = small.textContent;
      button.disabled = !unlocked; button.classList.toggle('locked', !unlocked);
      if (small) small.textContent = unlocked ? button.dataset.originalNote : 'ปิดชั่วคราวระหว่างพัฒนาระบบหลัก';
    });
  }
  function isGuestSession() { return accountSession.kind === 'guest'; }
  function accountStorageSuffix(email) { return encodeURIComponent(String(email || '').trim().toLowerCase()).replace(/%/g, '_'); }
  function setAccountSession(kind, email = null, persist = true) {
    accountSession = kind === 'gmail' ? { kind: 'gmail', email: String(email).trim().toLowerCase() } : { kind: 'guest', email: null };
    const suffix = accountSession.email ? accountStorageSuffix(accountSession.email) : null;
    SAVE_KEY = suffix ? `${SAVE_KEY_BASE}:${suffix}` : SAVE_KEY_BASE;
    CORRUPTED_SAVE_BACKUP_KEY = `${SAVE_KEY}_corrupted_backup`;
    META_KEY = suffix ? `${META_KEY_BASE}:${suffix}` : META_KEY_BASE;
    if (persist && accountSession.kind === 'gmail') localStorage.setItem(AUTH_KEY, JSON.stringify(accountSession));
    if (accountSession.kind === 'gmail') {
      if (!localStorage.getItem(SAVE_KEY) && localStorage.getItem(SAVE_KEY_BASE)) {
        localStorage.setItem(SAVE_KEY, localStorage.getItem(SAVE_KEY_BASE));
        localStorage.removeItem(SAVE_KEY_BASE);
      }
      if (!localStorage.getItem(META_KEY) && localStorage.getItem(META_KEY_BASE)) {
        localStorage.setItem(META_KEY, localStorage.getItem(META_KEY_BASE));
        localStorage.removeItem(META_KEY_BASE);
      }
    }
  }
  function clearAccountSession() {
    stopTimer(); state = null; accountSession = { kind: 'unbound', email: null };
    SAVE_KEY = SAVE_KEY_BASE; CORRUPTED_SAVE_BACKUP_KEY = `${SAVE_KEY}_corrupted_backup`; META_KEY = META_KEY_BASE;
    localStorage.removeItem(AUTH_KEY); showScreen('auth-screen');
  }
  function restoreAccountSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY));
      if (saved?.kind === 'gmail' && /@gmail\.com$/i.test(saved.email || '')) setAccountSession('gmail', saved.email, false);
      else setAccountSession('guest', null, false);
    } catch (e) { setAccountSession('guest', null, false); }
  }
  function emptyMeta() { return { endings: [], grades: {}, unlockedCharacters: ['lin-an'], achievements: [], unlockedItems: [], unlockedTechniques: [], unlockedEvents: [], blessings: [], lifeRecords: [], simulations: 0, simulationRewards: { cultivation: 0, money: 0, insight: 0 }, clearedRunIds: [] }; }
  function refreshTitle() { const has = !isGuestSession() && !!localStorage.getItem(SAVE_KEY); $('continue-btn').hidden = !has; $('mode-continue-btn').hidden = !has; }
  function refreshModeMenu() {
    const label = $('account-status');
    if (label) label.textContent = isGuestSession() ? 'Guest · เซสชันนี้จะไม่บันทึกเกมหรือ Meta Progression' : `บัญชี Gmail · ${accountSession.email}`;
    refreshTitle();
  }
  function showScreen(id) { ['auth-screen', 'mode-screen', 'title-screen', 'setup-screen', 'game-screen', 'summary-screen'].forEach(x => $(x).hidden = x !== id); }
  function toast(msg) { $('toast').textContent = msg; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2300); }
  function weather() { return pick(['เช้าอากาศแจ่มใส', 'หมอกบางคลุมยอดเขา', 'ลมเหนือพัดแรง', 'ฝนปรอยเหนือชายคา']); }
  function formatAge(m) { if (m < 12) return m > 0 ? `${m} เดือน` : 'แรกเกิด'; return `${Math.floor(m / 12)} ปี ${m % 12 ? `${m % 12} เดือน` : ''}`.trim(); }
  function relationWord(n) { return n >= 35 ? 'ผูกพัน' : n >= 15 ? 'ไว้วางใจ' : n > 0 ? 'รู้จัก' : n === 0 ? 'ไม่รู้จัก' : n >= -15 ? 'ห่างเหิน' : 'บาดหมาง'; }
  function reputationWord(n) { return n >= 35 ? 'ยกย่อง' : n >= 15 ? 'เป็นมิตร' : n >= 0 ? 'เป็นกลาง' : n >= -15 ? 'ระแวง' : 'เป็นศัตรู'; }

  function toggleAutoMode(s) { if (!s) return false; s.autoMode = !s.autoMode; if (s.autoMode) s.autoActivity = s.activity; return s.autoMode; }

  function updateSetupSummary() {
    const summary = $('setup-summary');
    if (!summary) return;
    const name = selectedMode === 'story' ? (STORY_CHARACTERS[selectedCharacter]?.name || 'หลินอัน') : ($('hero-name').value.trim() || 'ผู้พเนจร');
    const rule = document.querySelector(`.mode-card[data-rule="${selectedRule}"] strong`)?.textContent || 'กฎพื้นฐาน · เกิดใหม่';
    const talent = document.querySelector(`.talent-card[data-talent="${selectedTalent}"] strong`)?.textContent || '';
    const root = document.querySelector(`.root-card[data-root="${selectedRoot}"] strong`)?.textContent || '';
    summary.textContent = `สรุปชีวิต · ${selectedMode === 'story' ? 'เนื้อเรื่อง' : 'อิสระ'} · ${name}${selectedMode === 'free' ? ` · ${rule}` : ''} · ${talent} · ราก${root}`;
  }

  // ผูกปุ่มการทำงานและ Codex Modal
  function openSetup(mode) {
    selectedMode = mode;
    document.querySelector(`.mode-card[data-mode="${mode}"]`)?.click();
    refreshCharacterUnlocks();
    const rootHint = $('root-choice-hint');
    if (rootHint) {
      rootHint.textContent = mode === 'story'
        ? '📌 โหมดเนื้อเรื่อง: หลินอันเริ่มต้นในฐานะมนุษย์ธรรมดา (รากวิญญาณจะเปิดเผยตามชะตากรรม)'
        : '✨ โหมดอิสระ: เลือกรากวิญญาณตามต้องการ หรือเริ่มต้นด้วยรากมนุษย์';
    }
    document.querySelectorAll('.root-card').forEach(b => {
      if (b.dataset.root === 'none') {
        b.disabled = true; b.classList.add('root-locked');
      } else if (mode === 'story') {
        if (b.dataset.root !== 'human') {
          b.disabled = true; b.classList.add('root-locked');
          b.title = 'โหมดเนื้อเรื่อง: หลินอันเริ่มต้นด้วยรากมนุษย์เท่านั้น';
        } else {
          b.disabled = false; b.classList.remove('root-locked');
          b.classList.add('selected');
          selectedRoot = 'human';
        }
      } else {
        b.disabled = false; b.classList.remove('root-locked');
        b.title = '';
      }
    });
    updateSetupSummary();
    showScreen('setup-screen');
  }
  $('gmail-login-form').onsubmit = e => {
    e.preventDefault();
    const email = $('gmail-email').value.trim().toLowerCase();
    if (!/^[^\s@]+@gmail\.com$/i.test(email)) { toast('กรุณาใช้ที่อยู่ Gmail ที่ถูกต้อง'); return; }
    setAccountSession('gmail', email);
    refreshModeMenu(); showScreen('mode-screen');
  };
  $('guest-login-btn').onclick = () => { setAccountSession('guest'); refreshModeMenu(); showScreen('mode-screen'); };
  $('mode-story-btn').onclick = () => openSetup('story');
  $('mode-free-btn').onclick = () => openSetup('free');
  $('mode-continue-btn').onclick = continueGame;
  $('mode-logout-btn').onclick = clearAccountSession;
  $('new-game-btn').onclick = () => openSetup('story');
  $('back-title-btn').onclick = () => { refreshModeMenu(); showScreen('mode-screen'); };
  $('begin-btn').onclick = startNewGame;
  $('continue-btn').onclick = continueGame;

  document.querySelectorAll('.mode-card[data-mode]').forEach(button => button.onclick = () => {
    selectedMode = button.dataset.mode;
    document.querySelectorAll('.mode-card[data-mode]').forEach(item => item.classList.toggle('selected', item === button));
    $('free-rule-choices').hidden = selectedMode !== 'free';
    $('story-character-choices').hidden = selectedMode !== 'story';
    $('hero-name').readOnly = selectedMode === 'story'; $('hero-name').setAttribute('aria-readonly', String(selectedMode === 'story'));
    $('hero-gender').disabled = selectedMode === 'story';
    $('hero-gender').value = selectedMode === 'story' ? (STORY_CHARACTERS[selectedCharacter]?.gender || 'unspecified') : ($('hero-gender').value || 'unspecified');
    $('hero-name').value = selectedMode === 'story' ? (STORY_CHARACTERS[selectedCharacter]?.name || 'หลินอัน') : 'ผู้พเนจร';
    if (selectedMode === 'free') selectedRule = document.querySelector('.mode-card[data-rule].selected')?.dataset.rule || 'one-life';
    $('story-lock-note').textContent = selectedMode === 'story' ? 'ชื่อนี้ถูกกำหนดโดยเนื้อเรื่องและไม่สามารถเปลี่ยนได้' : 'โหมดอิสระตั้งชื่อตัวละครเองได้';
    $('setup-description').textContent = selectedMode === 'story' ? 'เรื่องราวเริ่มเมื่ออายุ 5 ขวบ ในคืนที่บ้านถูกเผา—ก่อนเจ้าจะรู้จักคำว่าสำนักหรือยุทธภพ' : 'สร้างตัวละครของเจ้า เริ่มชีวิตตั้งแต่เกิดในโลกเดียวกับตัวละครเนื้อเรื่อง';
    document.querySelector('#setup-screen .setup-card h2').textContent = selectedMode === 'story' ? 'ทายาทคนสุดท้ายของตระกูลหลิน' : 'สร้างชีวิตของเจ้า';
    const rootHint = $('root-choice-hint');
    if (rootHint) {
      rootHint.textContent = selectedMode === 'story'
        ? '📌 โหมดเนื้อเรื่อง: หลินอันเริ่มต้นในฐานะมนุษย์ธรรมดา (รากวิญญาณจะเปิดเผยตามชะตากรรม)'
        : '✨ โหมดอิสระ: เลือกรากวิญญาณตามต้องการ หรือเริ่มต้นด้วยรากมนุษย์';
    }
    document.querySelectorAll('.root-card').forEach(b => {
      if (b.dataset.root === 'none') {
        b.disabled = true; b.classList.add('root-locked');
      } else if (selectedMode === 'story') {
        if (b.dataset.root !== 'human') {
          b.disabled = true; b.classList.add('root-locked');
          b.title = 'โหมดเนื้อเรื่อง: หลินอันเริ่มต้นด้วยรากมนุษย์เท่านั้น';
        } else {
          b.disabled = false; b.classList.remove('root-locked');
          b.classList.add('selected');
          selectedRoot = 'human';
        }
      } else {
        b.disabled = false; b.classList.remove('root-locked');
        b.title = '';
      }
    });
    updateSetupSummary();
  });
  document.querySelectorAll('.mode-card[data-character]').forEach(button => button.onclick = () => {
    if (button.disabled) return;
    selectedCharacter = button.dataset.character;
    const character = STORY_CHARACTERS[selectedCharacter];
    selectedRule = character.ruleSet;
    document.querySelectorAll('.mode-card[data-character]').forEach(item => item.classList.toggle('selected', item === button));
    $('hero-name').value = character.name;
    $('hero-gender').value = character.gender || 'unspecified';
    $('setup-description').textContent = `${character.title} · ${character.ruleSet === LIFE_RULES.oneLife.id ? 'ทุกการตัดสินใจนำไปสู่บทจบหลายรูปแบบ' : 'กฎเฉพาะของตัวละครจะเปลี่ยนวิธีที่ความตายและอนาคตทำงาน'}`;
    document.querySelector('#setup-screen .setup-card h2').textContent = character.title;
    updateSetupSummary();
  });
  document.querySelectorAll('.mode-card[data-rule]').forEach(button => button.onclick = () => {
    selectedRule = button.dataset.rule;
    document.querySelectorAll('.mode-card[data-rule]').forEach(item => item.classList.toggle('selected', item === button));
    updateSetupSummary();
  });

  // Codex & Offline Modal Buttons
  $('title-codex-btn').onclick = renderCodexModal;
  $('drawer-codex-btn').onclick = () => { $('drawer').hidden = true; renderCodexModal(); };
  $('summary-codex-btn').onclick = renderCodexModal;
  $('close-codex-btn').onclick = () => { $('codex-modal').hidden = true; };
  $('codex-modal').onclick = (e) => { if (e.target === $('codex-modal')) $('codex-modal').hidden = true; };
  const closeOfflineBtn = $('close-offline-btn');
  if (closeOfflineBtn) closeOfflineBtn.onclick = dismissOfflineModal;
  const confirmOfflineBtn = $('confirm-offline-btn');
  if (confirmOfflineBtn) confirmOfflineBtn.onclick = dismissOfflineModal;
  const offlineModalEl = $('offline-modal');
  if (offlineModalEl) offlineModalEl.onclick = (e) => { if (e.target === offlineModalEl) dismissOfflineModal(); };
  document.addEventListener('keydown', e => {
    const eventModal = $('event-modal'), codexModal = $('codex-modal'), offlineModal = $('offline-modal');
    const activeModal = eventModal && !eventModal.hidden ? eventModal : codexModal && !codexModal.hidden ? codexModal : offlineModal && !offlineModal.hidden ? offlineModal : null;
    if (!activeModal) return;
    if (e.key === 'Escape' && activeModal === codexModal) { $('close-codex-btn').click(); return; }
    if (e.key === 'Escape' && activeModal === offlineModal) { dismissOfflineModal(); return; }
    if (e.key !== 'Tab') return;
    const focusable = [...activeModal.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.querySelectorAll('.talent-card').forEach(b => b.onclick = () => { selectedTalent = b.dataset.talent; document.querySelectorAll('.talent-card').forEach(x => x.classList.toggle('selected', x === b)); updateSetupSummary(); });
  document.querySelectorAll('.root-card').forEach(b => b.onclick = () => { if (b.disabled || b.classList.contains('root-locked')) return; selectedRoot = b.dataset.root; document.querySelectorAll('.root-card').forEach(x => x.classList.toggle('selected', x === b)); updateSetupSummary(); });
  $('hero-name').addEventListener('input', updateSetupSummary);
  document.querySelectorAll('[data-panel-tab]').forEach(button => button.onclick = () => {
    const tab = button.dataset.panelTab;
    activeInfoPanelTab = tab;
    document.querySelectorAll('[data-panel-tab]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
    document.querySelectorAll('[data-tab-panel]').forEach(panel => { panel.hidden = tab !== panel.dataset.tabPanel; });
  });
  const activateActivity = activity => {
    if (!state || state.pendingEvent || !ACTIVITY[activity]) return;
    const availability = activityAvailability(state, activity);
    if (!availability.ok) { toast(availability.reason || 'กิจกรรมนี้ยังใช้ไม่ได้'); return; }
    if (state.activity === activity) { newlyUnlockedMobileActivities.delete(activity); renderMobileNavigation(); return; }
    if (!setActivity(state, activity)) { toast(availability.reason || 'กิจกรรมนี้ยังใช้ไม่ได้'); render(); return; }
    newlyUnlockedMobileActivities.delete(activity);
    state.paused = false;
    addLog(`เปลี่ยนกิจกรรมเป็น “${ACTIVITY[state.activity].name}”`);
    saveGame(); render();
  };
  const chooseActivityFromInput = e => activateActivity(ACTIVITY[e.target.value] ? e.target.value : 'train');
  document.querySelectorAll('.activity-card').forEach(button => button.onclick = () => activateActivity(button.dataset.activity));
  document.querySelectorAll('[data-mobile-activity]').forEach(button => button.onclick = () => activateActivity(button.dataset.mobileActivity));
  document.querySelectorAll('[data-mobile-view]').forEach(button => button.onclick = () => {
    mobileView = button.dataset.mobileView;
    applyMobileSections();
    renderMobileNavigation();
  });
  $('mobile-open-activities').onclick = () => { mobileView = 'activities'; applyMobileSections(); renderMobileNavigation(); };
  $('mobile-time-toggle').onclick = () => { if (!state || state.pendingEvent || state.ending) return; state.paused = !state.paused; saveGame(); render(); };
  window.addEventListener('resize', applyMobileSections);
  const mobileTopbar = $('game-screen')?.querySelector('.topbar');
  if (mobileTopbar && typeof ResizeObserver !== 'undefined') new ResizeObserver(applyMobileSections).observe(mobileTopbar);
  $('activity-mobile-select').onchange = chooseActivityFromInput;
  $('activity-mobile-select').oninput = chooseActivityFromInput;
  $('training-goal-select').onchange = e => { if (!state) return; ensureTrainingState(state); if (TRAINING_GOALS[e.target.value]) { state.trainingGoal = e.target.value; saveGame(); render(); } };
  $('auto-training-rule-select').onchange = e => { if (!state) return; ensureTrainingState(state); if (['stop', 'auto-item', 'auto-foundation'].includes(e.target.value)) { state.autoTrainingRule = e.target.value; saveGame(); render(); } };
  $('learning-focus-select').onchange = e => { if (!state) return; const learning = ensureLearningState(state); if (learningTypeAvailable(state, e.target.value)) { learning.focus = e.target.value; saveGame(); render(); } };
  $('learning-technique-select').onchange = e => { if (!state) return; const learning = ensureLearningState(state); learning.techniqueFocus = e.target.value || null; if (learning.techniqueFocus?.startsWith('manual:')) { const manual = availableTechniqueManuals(state).find(item => item.techniqueId === learning.techniqueFocus.slice(7)); if (!manual || !manualLearningRequirement(state, manual).eligible) { learning.techniqueFocus = null; toast('ขั้นบำเพ็ญยังไม่ถึงขั้นต่ำของคัมภีร์'); } else learning.focus = manual.learningType || 'martial'; } saveGame(); render(); };
  $('auto-learning-rule-select').onchange = e => { if (!state) return; if (setAutoLearningRule(state, e.target.value)) { saveGame(); render(); } };
  $('craft-auto-mode').onchange = e => { if (!state) return; setCraftAutoRule(state, e.target.value, state.crafting?.auto?.recipeId || null); saveGame(); render(); };
  $('craft-auto-recipe').onchange = e => { if (!state) return; setCraftAutoRule(state, state.crafting?.auto?.mode || 'stop', e.target.value || null); saveGame(); render(); };
  $('auto-family-rule-select').onchange = e => { if (!state || !setAutoFamilyRule(state, e.target.value)) return; saveGame(); render(); };
  $('rest-location-select').onchange = e => { if (!state || !selectLocation(state, e.target.value)) return; setCurrentLocation(state, e.target.value); saveGame(); render(); };
  $('exploration-area-select').onchange = e => { if (!state || !selectExplorationArea(state, e.target.value)) return; saveGame(); render(); };
  $('auto-explore-rule-select').onchange = e => { if (!state) return; setAutoExploreRule(state, e.target.value); saveGame(); render(); };
  $('work-location-select').onchange = e => { if (!state || !selectWorkLocation(state, e.target.value)) return; saveGame(); render(); };
  $('official-affiliation-select').onchange = e => { if (!state || !setOfficialAffiliation(state, e.target.value)) return; saveGame(); render(); };
  $('official-assignment-select').onchange = e => { if (!state || !setOfficialAssignment(state, e.target.value)) return; saveGame(); render(); };
  $('official-exam-choice-select').onchange = e => { if (!state || !OFFICIAL_EXAM_OPTIONS[e.target.value]) return; ensureOfficialCareer(state).examChoice = e.target.value; saveGame(); render(); };
  $('travel-destination-select').onchange = e => { if (!state) return; ensureTravelState(state).destination = e.target.value; render(); };
  $('travel-vehicle-select').onchange = e => { if (!state) return; ensureTravelState(state).vehicle = e.target.value; render(); };
  $('start-travel-btn').onclick = () => { if (!state) return; const destination = $('travel-destination-select').value, vehicle = $('travel-vehicle-select').value; if (startTravel(state, destination, { vehicle })) { saveGame(); render(); } else { render(); } };
  $('auto-travel-rule-select').onchange = e => { if (!state || !setAutoTravelRule(state, e.target.value)) return; saveGame(); render(); };
  $('rent-inn-btn').onclick = () => { if (!state || !acquireLocation(state, 'inn')) return; saveGame(); render(); };
  $('auto-rest-rule-select').onchange = e => { if (!state) return; const enabled = e.target.value !== 'off'; setAutoRestRule(state, enabled, enabled ? Number(e.target.value) : 50); saveGame(); render(); };
  const autoMedSelect = $('auto-medicine-rule-select');
  if (autoMedSelect) {
    autoMedSelect.onchange = e => {
      if (!state) return;
      const enabled = e.target.value !== 'off';
      setAutoMedicineRule(state, enabled, enabled ? Number(e.target.value) : 35);
      saveGame();
      render();
    };
  }
  $('auto-work-rule-select').onchange = e => { if (!state) return; const enabled = e.target.value !== 'off'; setAutoWorkRule(state, enabled, enabled ? Number(e.target.value) : 6); saveGame(); render(); };
  $('social-target-select').onchange = e => { if (!state || !setSocialTarget(state, e.target.value)) return; saveGame(); render(); };
  $('auto-social-rule-select').onchange = e => { if (!state) return; const rule = ensureAutoSocialRule(state); if (['maintain', 'avoid_conflict', 'build_alliance'].includes(e.target.value)) { rule.mode = e.target.value; rule.avoidConflict = rule.mode === 'avoid_conflict'; saveGame(); render(); } };
  $('auto-social-money').onchange = e => { if (!state) return; ensureAutoSocialRule(state).minMoney = Math.max(0, Number(e.target.value) || 0); saveGame(); render(); };
  $('auto-free-rule-select').onchange = e => { if (!state || state.mode === 'story') return; const val = e.target.value; if (val === 'off') setAutoFreeRule(state, false, 'safe'); else setAutoFreeRule(state, true, val); saveGame(); render(); };
  $('start-long-rest-btn').onclick = () => { if (startLongRest(state, 3)) { saveGame(); render(); } };
  $('cancel-long-rest-btn').onclick = () => { if (cancelLongRest(state)) { saveGame(); render(); } };
  document.querySelectorAll('.speed-btn').forEach(b => b.onclick = () => { state.speed = Number(b.dataset.speed); state.paused = false; render(); saveGame(); });
  $('pause-btn').onclick = () => { state.paused = !state.paused; render(); saveGame(); };
  $('auto-btn').onclick = () => { if (!state) return; toggleAutoMode(state); render(); saveGame(); };
  const growPhaseBtn = $('grow-phase-btn');
  if (growPhaseBtn) growPhaseBtn.onclick = () => { if (!state) return; advanceAgePhase(state); };
  $('auto-activity-select').onchange = e => { if (!state) return; const activity = ACTIVITY[e.target.value] ? e.target.value : 'train'; ensureAutoSchedule(state)[state.month % 12] = activity; state.autoActivity = activity; render(); saveGame(); };
  $('auto-doctrine-select').onchange = e => { if (!state) return; if (setAutoDoctrine(state, e.target.value)) { render(); saveGame(); } };
  $('menu-btn').onclick = () => { $('drawer').hidden = false; state.paused = true; render(); }; $('close-drawer-btn').onclick = () => { $('drawer').hidden = true; state.paused = false; render(); };
  $('drawer').onclick = e => { if (e.target === $('drawer')) $('close-drawer-btn').click(); }; $('export-btn').onclick = exportSave; $('summary-export-btn').onclick = exportSave;
  $('import-input').onchange = e => importSave(e.target.files[0]); $('title-import-input').onchange = e => importSave(e.target.files[0]); $('title-import-btn').onclick = () => $('title-import-input').click();
  $('restart-btn').onclick = () => { if (confirm('เริ่มชีวิตใหม่? บันทึกปัจจุบันจะถูกแทนที่')) { stopTimer(); if (!isGuestSession()) localStorage.removeItem(SAVE_KEY); $('drawer').hidden = true; openSetup('story'); } };
  $('replay-btn').onclick = () => { if (!isGuestSession()) localStorage.removeItem(SAVE_KEY); openSetup('story'); };
  $('motion-toggle').onclick = e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); document.body.classList.toggle('reduce-motion', on); };
  $('font-toggle').onclick = e => { const on = !document.body.classList.contains('large-text'); document.body.classList.toggle('large-text', on); e.currentTarget.textContent = on ? 'ใหญ่' : 'ปกติ'; };
  $('expand-log-btn').onclick = () => { const el = $('life-log'); const expanded = el.dataset.expanded !== 'true'; el.dataset.expanded = String(expanded); el.style.maxHeight = expanded ? '520px' : ''; $('expand-log-btn').textContent = expanded ? 'ย่อ' : 'ดูทั้งหมด'; renderLog(); };
  window.addEventListener('beforeunload', saveGame); document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  ({ TRAINING_EVENTS, TRAVEL_EVENTS, QUEST_EVENTS, CRAFT_EVENTS, WORLD_EVENTS, OFFICIAL_EVENTS, LEARNING_EVENTS, FAMILY_EVENTS, FREE_LIFE_EVENTS, MIDDLE_GAME_EVENTS, DEBT_EVENTS, SOCIAL_EVENTS, INFANT_LEGENDARY_EVENTS, INFANT_EPIC_EVENTS, SCOPED_EPIC_EVENTS, RANDOM_EVENTS, EXPLORATION_EVENTS, REST_EVENTS, EXPLORATION_DISCOVERIES } = window.OneLifeEventPoolCatalog.createEventPools({ $: $, addFamilyChronicle: addFamilyChronicle, addLog: addLog, addTreasure: addTreasure, advanceCultivationStage: advanceCultivationStage, canCraft: canCraft, clamp: clamp, cultivationAtCeiling: cultivationAtCeiling, effectiveCraftCost: effectiveCraftCost, endGame: endGame, ensureExplorationState: ensureExplorationState, ensureFamilyState: ensureFamilyState, ensureHousehold: ensureHousehold, ensureLifespanState: ensureLifespanState, ensureQuestState: ensureQuestState, ensureRelationshipState: ensureRelationshipState, ensureSocialState: ensureSocialState, equippedCultivationTechnique: equippedCultivationTechnique, explorationRoute: explorationRoute, extendTravel: extendTravel, familyAllowed: familyAllowed, freeLifeLocationWeight: freeLifeLocationWeight, getAvailableExplorationAreas: getAvailableExplorationAreas, hasLearningItem: hasLearningItem, learningLocationKey: learningLocationKey, learningTeacher: learningTeacher, restLocationKey: restLocationKey, restRoute: restRoute, revealRoot: revealRoot, scopedEpicEvent: scopedEpicEvent, socialRoute: socialRoute }));
  EXPLORATION_DISCOVERIES.push(...EXTRA_MANUAL_SCENES);
  Object.entries(EXTRA_GRADED_SCENES).forEach(([rarity, phases]) => {
    Object.entries(phases).forEach(([phase, scenes]) => UNIQUE_GRADED_SCENES[rarity][phase].push(...scenes));
  });
  window.__game__ = { getState: () => state, render, beginTechniqueLoadout, processMonth, continueLife, createLifeSummary, advanceAgePhase, applyOfflineProgress, showOfflineSummary, setAutoMedicineRule, applyAutoMedicine, EVENTS, saveGame, continueGame, setActivity, craftItem, studyCraft, planCraft, planStudyCraft, executeCraft, executeStudyCraft, selectChoice: (i) => {
    if (state.pendingEvent) {
      const id = state.pendingEvent;
      const ev = resolveEventById(state, id) || EVENTS[id] || ALTERNATE_ROUTE_EVENTS[id] || STORY_CHARACTER_EVENTS[id];
      if (ev && ev.choices && ev.choices.length > 0) {
        const choiceIdx = (i !== undefined && ev.choices[i]) ? i : 0;
        return chooseEvent(id, ev, ev.choices[choiceIdx], choiceIdx, ev.choices[choiceIdx].text);
      }
      state.pendingEvent = null;
      return true;
    }
    const btns = document.querySelectorAll('#event-choices button');
    if (btns[i]) { btns[i].click(); return true; }
    return false;
  } };
  restoreAccountSession();
  if (accountSession.kind === 'gmail') { refreshModeMenu(); showScreen('mode-screen'); } else showScreen('auth-screen');
})();
