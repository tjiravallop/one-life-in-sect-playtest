(() => {
  'use strict';

  // Recipe callbacks use the runtime API injected by app.js; definitions stay data-only otherwise.
  const createItemCatalog = ({ addTreasure }) => {
    if (typeof addTreasure !== 'function') throw new Error('Item catalog requires the game addTreasure function');

    const RECIPES = [
      { id: 'basic_pill', name: 'ยาฟื้นปราณพื้นฐาน', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 1, cost: { herb: 2, money: 2 }, time: 1, chance: 100, quality: 'healing', effect: 'ใช้พักฟื้นแล้วฟื้นสุขภาพเพิ่ม', craft: (s, item) => { s.consumables.push({ ...item, id: 'basic_pill', name: 'ยาฟื้นปราณพื้นฐาน', heal: item.stats.heal, category: 'consumable', subtype: 'pill' }); } },
      { id: 'iron_charm', name: 'ยันต์เหล็กคุ้มกาย', kind: 'ตีเหล็ก', category: 'talisman', subtype: 'ward', knowledge: 'smithing', knowledgeMin: 1, equipment: 'forge', locations: ['owned', 'estate', 'sect'], cost: { iron: 2, spiritStone: 1 }, time: 1, chance: 78, quality: 'defense', effect: 'ป้องกัน +3', craft: (s, item) => addTreasure(s, item.name, item.stats, { category: 'talisman', subtype: 'ward', recipeId: item.recipeId }) },
      { id: 'spirit_pill', name: 'โอสถรวมปราณ', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 2, teacher: 'master', cost: { herb: 3, spiritStone: 2, money: 5 }, time: 1, chance: 68, quality: 'training', effect: 'ฝึกปราณ +10% เป็นเวลา 3 ครั้งที่ฝึก', craft: (s, item) => s.consumables.push({ ...item, id: 'spirit_pill', name: 'โอสถรวมปราณ', category: 'consumable', subtype: 'pill', trainingBonus: 10, trainingUses: 3 }) },
      { id: 'field_tool', name: 'ชุดเครื่องมือเดินทาง', kind: 'สร้างเครื่องมือ', category: 'consumable', subtype: 'tool', knowledge: 'tools', knowledgeMin: 1, equipment: 'workbench', locations: ['owned', 'estate', 'sect'], cost: { iron: 2, herb: 1, money: 3 }, time: 1, chance: 84, quality: 'utility', effect: 'สำรวจและสร้างของมีประสิทธิภาพขึ้น', craft: (s, item) => addTreasure(s, item.name, item.stats, { category: 'consumable', subtype: 'tool', recipeId: item.recipeId }) },
      { id: 'support_kit', name: 'ชุดสนับสนุนภาคสนาม', kind: 'ของสนับสนุน', category: 'consumable', subtype: 'tool', knowledge: 'support', knowledgeMin: 1, teacher: 'friend', cost: { herb: 2, iron: 1, money: 2 }, time: 1, chance: 82, quality: 'support', effect: 'พักฟื้นและเดินทางดีขึ้น', craft: (s, item) => addTreasure(s, item.name, item.stats, { category: 'consumable', subtype: 'tool', recipeId: item.recipeId }) }
    ];
    // เกรดวัตถุดิบใช้ชุดชื่อและสีเดียวกับไอเทม ส่วนคุณภาพการปรุงเป็นอีกค่าหนึ่ง
    const MATERIAL_NAMES = { herb: 'สมุนไพร', iron: 'แร่เหล็ก', spiritStone: 'หินปราณ', beast: 'วัตถุดิบสัตว์', spiritSpring: 'น้ำพุวิญญาณ' };
    const MATERIAL_GRADE_IDS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    RECIPES.push(
      { id: 'beast_tonic', name: 'ยาบำรุงกาย', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 1, cost: { herb: 2, beast: 1, money: 2 }, chance: 82, quality: 'healing', effect: 'ฟื้นสุขภาพ เหมาะกับผู้ฝึกกาย', grade: 'common', craft: (s, item) => s.consumables.push({ ...item, id: 'beast_tonic', name: 'ยาบำรุงกาย', heal: item.stats.heal + 6, category: 'consumable', subtype: 'pill' }) },
      { id: 'refined_spirit_pill', name: 'โอสถปราณชั้นดี', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 2, cost: { herb: 2, spiritStone: 1, money: 4 }, gradedCost: [{ material: 'herb', grade: 'uncommon', amount: 1 }], chance: 75, quality: 'training', effect: 'ฝึกปราณ +15% เป็นเวลา 3 ครั้งที่ฝึก', grade: 'uncommon', craft: (s, item) => s.consumables.push({ ...item, id: 'refined_spirit_pill', name: 'โอสถปราณชั้นดี', trainingBonus: 15, trainingUses: 3, category: 'consumable', subtype: 'pill' }) },
      { id: 'moon_pill', name: 'โอสถจันทรา', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 3, cost: { herb: 2, spiritSpring: 1, spiritStone: 2, money: 6 }, gradedCost: [{ material: 'herb', grade: 'rare', amount: 1 }], chance: 65, quality: 'training', effect: 'ฝึกปราณ +25% เป็นเวลา 3 ครั้งที่ฝึก', grade: 'rare', craft: (s, item) => s.consumables.push({ ...item, id: 'moon_pill', name: 'โอสถจันทรา', trainingBonus: 25, trainingUses: 3, category: 'consumable', subtype: 'pill' }) },
      { id: 'refined_iron_charm', name: 'ยันต์เหล็กชั้นดี', kind: 'ตีเหล็ก', category: 'talisman', subtype: 'ward', knowledge: 'smithing', knowledgeMin: 2, equipment: 'forge', locations: ['owned', 'estate', 'sect'], cost: { iron: 2, spiritStone: 1, money: 3 }, gradedCost: [{ material: 'iron', grade: 'uncommon', amount: 1 }], chance: 70, quality: 'defense', effect: 'เครื่องรางป้องกัน', grade: 'uncommon', craft: (s, item) => addTreasure(s, item.name, { defense: item.stats.defense + 2 }, { category: 'talisman', subtype: 'ward', grade: item.grade, gradeExplicit: false, recipeId: item.recipeId }) },
      { id: 'herb_soup', name: 'ซุปสมุนไพร', kind: 'ทำอาหาร', category: 'consumable', subtype: 'food', knowledge: 'tools', knowledgeMin: 1, cost: { herb: 1, beast: 1, money: 1 }, chance: 95, quality: 'healing', effect: 'ฟื้นสุขภาพอย่างน้อย 12 จุดตามคุณภาพ', craft: (s, item) => s.consumables.push({ ...item, id: 'herb_soup', name: 'ซุปสมุนไพร', heal: 12 + (item.quality - 1) * 2, category: 'consumable', subtype: 'food' }) },
      { id: 'travel_sword', name: 'กระบี่เดินทาง', kind: 'ตีเหล็ก', category: 'weapon', subtype: 'jian', knowledge: 'smithing', knowledgeMin: 1, equipment: 'forge', locations: ['owned', 'estate', 'sect'], cost: { iron: 3, money: 3 }, chance: 85, quality: 'defense', effect: 'โจมตี +5 · ว่องไว +1 เมื่อสวมใส่', craft: (s, item) => addTreasure(s, item.name, { attack: 5, agility: 1 }, { category: 'weapon', subtype: 'jian', recipeId: item.recipeId }) },
      { id: 'hunter_vest', name: 'เสื้อหนังนายพราน', kind: 'สร้างเครื่องมือ', category: 'armor', subtype: 'body', knowledge: 'tools', knowledgeMin: 2, equipment: 'workbench', locations: ['owned', 'estate', 'sect'], cost: { beast: 2, money: 4 }, gradedCost: [{ material: 'beast', grade: 'uncommon', amount: 1 }], chance: 78, quality: 'defense', effect: 'ป้องกัน +5 เมื่อสวมใส่', craft: (s, item) => addTreasure(s, item.name, { defense: 5 }, { category: 'armor', subtype: 'body', recipeId: item.recipeId }) },
      { id: 'stone_lantern', name: 'โคมหินปราณ', kind: 'สร้างเครื่องมือ', category: 'talisman', subtype: 'relic', knowledge: 'tools', knowledgeMin: 2, equipment: 'workbench', locations: ['owned', 'estate', 'sect'], cost: { iron: 1, money: 3 }, gradedCost: [{ material: 'spiritStone', grade: 'uncommon', amount: 1 }], chance: 80, quality: 'utility', effect: 'เพิ่มโอกาสสร้างของ 4% เมื่อพกไว้', craft: (s, item) => addTreasure(s, item.name, { craftChance: 4 }, { category: 'talisman', subtype: 'relic', recipeId: item.recipeId }) },
      { id: 'clearwater_pill', name: 'ยาน้ำค้างฟื้นกาย', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 2, cost: { herb: 2, money: 2 }, gradedCost: [{ material: 'spiritSpring', grade: 'uncommon', amount: 1 }], chance: 80, quality: 'healing', effect: 'ฟื้นสุขภาพอย่างน้อย 28 จุดตามคุณภาพ', grade: 'uncommon', craft: (s, item) => s.consumables.push({ ...item, id: 'clearwater_pill', name: 'ยาน้ำค้างฟื้นกาย', heal: 28 + (item.quality - 1) * 3, category: 'consumable', subtype: 'pill' }) },
      { id: 'antidote', name: 'ยาแก้พิษพื้นฐาน', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 1, cost: { herb: 3, money: 2 }, chance: 90, quality: 'healing', effect: 'รักษาพิษจากการสำรวจ ไม่ใช้เมื่อไม่มีพิษ', craft: (s, item) => s.consumables.push({ ...item, id: 'antidote', name: 'ยาแก้พิษพื้นฐาน', cures: 'poison', category: 'consumable', subtype: 'pill' }) },
      { id: 'fatigue_salve', name: 'ยาทาคลายเมื่อย', kind: 'ปรุงยา', category: 'consumable', subtype: 'potion', knowledge: 'alchemy', knowledgeMin: 1, cost: { herb: 2, beast: 1, money: 1 }, chance: 85, quality: 'healing', effect: 'ลดความเหนื่อยจากงาน 3 หน่วย ไม่ใช้เมื่อไม่เหนื่อย', craft: (s, item) => s.consumables.push({ ...item, id: 'fatigue_salve', name: 'ยาทาคลายเมื่อย', fatigueRelief: 3, category: 'consumable', subtype: 'potion' }) },
      { id: 'sleeping_poison', name: 'ยาสลบเคลือบอาวุธ', kind: 'ปรุงยา', category: 'consumable', subtype: 'poison', knowledge: 'alchemy', knowledgeMin: 2, cost: { herb: 2, beast: 1, money: 3 }, chance: 75, quality: 'utility', effect: 'เคลือบไว้ป้องกันตัวจากศัตรูขณะสำรวจ 1 ครั้ง ลดบาดเจ็บ 6 และป้องกันพิษจากงู ซ้อนกันไม่ได้', craft: (s, item) => s.consumables.push({ ...item, id: 'sleeping_poison', name: 'ยาสลบเคลือบอาวุธ', poisonCoating: true, category: 'consumable', subtype: 'poison' }) },
      { id: 'home_repair_kit', name: 'ชุดซ่อมเรือน', kind: 'สร้างเครื่องมือ', category: 'consumable', subtype: 'tool', knowledge: 'tools', knowledgeMin: 1, equipment: 'workbench', locations: ['owned', 'estate', 'sect'], cost: { iron: 1, herb: 1, money: 1 }, chance: 90, quality: 'utility', effect: 'ลดค่าดูแลบ้าน 1 ตำลึงต่อเดือน เป็นเวลา 3 เดือน ใช้ได้กับบ้านที่มีค่าใช้จ่ายและใช้ซ้อนไม่ได้', craft: (s, item) => s.consumables.push({ ...item, id: 'home_repair_kit', name: 'ชุดซ่อมเรือน', homeRepair: 3, category: 'consumable', subtype: 'tool' }) },
      { id: 'cloud_pill', name: 'โอสถเมฆาพิสุทธิ์', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 4, equipment: 'alchemy_stove', locations: ['owned', 'estate', 'sect'], cost: { spiritSpring: 2, spiritStone: 3, money: 10 }, gradedCost: [{ material: 'herb', grade: 'epic', amount: 1 }], chance: 52, quality: 'training', effect: 'ฝึกปราณ +35% เป็นเวลา 3 ครั้งที่ฝึก', grade: 'epic', craft: (s, item) => s.consumables.push({ ...item, id: 'cloud_pill', name: 'โอสถเมฆาพิสุทธิ์', trainingBonus: 35, trainingUses: 3, category: 'consumable', subtype: 'pill' }) },
      { id: 'heaven_pill', name: 'โอสถฟ้าประทาน', kind: 'ปรุงยา', category: 'consumable', subtype: 'pill', knowledge: 'alchemy', knowledgeMin: 5, equipment: 'alchemy_stove', locations: ['owned', 'estate', 'sect'], cost: { spiritSpring: 3, spiritStone: 4, money: 15 }, gradedCost: [{ material: 'herb', grade: 'legendary', amount: 1 }], chance: 40, quality: 'training', effect: 'ฝึกปราณ +50% เป็นเวลา 3 ครั้งที่ฝึก', grade: 'legendary', craft: (s, item) => s.consumables.push({ ...item, id: 'heaven_pill', name: 'โอสถฟ้าประทาน', trainingBonus: 50, trainingUses: 3, category: 'consumable', subtype: 'pill' }) }
    );
    const MATERIAL_SHOP_PRICES = { herb: 3, iron: 4, spiritStone: 8, beast: 6, spiritSpring: 10 };
    const ITEM_GRADES = {
      common: { id: 'common', name: 'สามัญ', color: '#a7b0bc', priceMultiplier: 1, powerMultiplier: 1, rarityWeight: 1 },
      uncommon: { id: 'uncommon', name: 'ชั้นดี', color: '#65d391', priceMultiplier: 2.5, powerMultiplier: 1.75, rarityWeight: .45 },
      rare: { id: 'rare', name: 'หายาก', color: '#5eb7ff', priceMultiplier: 6, powerMultiplier: 2.5, rarityWeight: .16 },
      epic: { id: 'epic', name: 'มหากาพย์', color: '#c491ff', priceMultiplier: 15, powerMultiplier: 3.25, rarityWeight: .05 },
      legendary: { id: 'legendary', name: 'ตำนาน', color: '#ffbd62', priceMultiplier: 40, powerMultiplier: 4, rarityWeight: .01 }
    };
    const ITEM_CATEGORY_DEFS = {
      weapon: { id: 'weapon', name: 'อาวุธ', subtypes: { sword: 'ดาบ', jian: 'กระบี่', dao: 'ดาบใหญ่/ดาบโค้ง', spear: 'หอก', staff: 'พลอง/กระบอง', dagger: 'มีดสั้น', bow: 'ธนู', whip: 'แส้', fan: 'พัดเหล็ก', claw: 'กรงเล็บ', hammer: 'ค้อน', needle: 'เข็มลับ' } },
      armor: { id: 'armor', name: 'เครื่องป้องกัน', subtypes: { head: 'เครื่องป้องกันศีรษะ', body: 'เกราะ/เสื้อ', legs: 'เครื่องป้องกันขา', boots: 'รองเท้า', cloak: 'ผ้าคลุม', shield: 'โล่/กระบัง' } },
      talisman: { id: 'talisman', name: 'เครื่องราง', subtypes: { jade: 'หยก', ward: 'ยันต์คุ้มครอง', pendant: 'จี้/ตรา', ring: 'แหวน', necklace: 'สร้อย', bell: 'ระฆัง', relic: 'วัตถุโบราณ', keepsake: 'ของแทนใจ' } },
      material: { id: 'material', name: 'วัตถุดิบ', subtypes: { ore: 'แร่', relic: 'วัตถุดิบพิเศษ' } },
      consumable: { id: 'consumable', name: 'ของกดใช้', subtypes: { pill: 'ยา/โอสถ', food: 'อาหาร', potion: 'น้ำยา', tool: 'เครื่องมือ', poison: 'พิษ', scroll: 'ม้วนใช้ครั้งเดียว' } },
      cursed: { id: 'cursed', name: 'ของอาถรรพ์', subtypes: { blood: 'โลหิตอาถรรพ์', soul: 'วิญญาณ', seal: 'คำสาปผนึก', forbidden: 'พลังต้องห้าม', haunted: 'วัตถุสิงสู่' } },
      technique_manual: { id: 'technique_manual', name: 'คัมภีร์วิชา', subtypes: { attack_fist: 'คัมภีร์หมัด', attack_sword: 'คัมภีร์ดาบ', attack_jian: 'คัมภีร์กระบี่', defense: 'คัมภีร์ป้องกัน', movement: 'คัมภีร์ตัวเบา', cultivation: 'คัมภีร์บำเพ็ญ' } },
      mount: { id: 'mount', name: 'พาหนะ', subtypes: { horse: 'ม้า', wolf: 'หมาป่า', boar: 'หมูป่า', deer: 'กวาง', ox: 'วัว', tiger: 'เสือ', lion: 'สิงโต' } }
    };
    const WEAPON_TYPE_LABELS = ITEM_CATEGORY_DEFS.weapon.subtypes;
    const ITEM_SLOT_DEFS = {
      weapon: { id: 'weapon', name: 'อาวุธ', limit: 1 },
      armor: { id: 'armor', name: 'เครื่องป้องกัน', limit: 1 },
      boots: { id: 'boots', name: 'รองเท้า', category: 'armor', subtype: 'boots', limit: 1 },
      ring1: { id: 'ring1', name: 'แหวนช่องที่ 1', category: 'talisman', subtype: 'ring', limit: 1 },
      ring2: { id: 'ring2', name: 'แหวนช่องที่ 2', category: 'talisman', subtype: 'ring', limit: 1 },
      necklace: { id: 'necklace', name: 'สร้อย', category: 'talisman', subtype: 'necklace', limit: 1 },
      mount: { id: 'mount', name: 'พาหนะ', category: 'mount', limit: 1 }
    };
    const COMMON_WEAPON_NAMES = {
      sword: ['ดาบเหล็กฝึกหัด', 'ดาบคนเดินทาง', 'ดาบคมเดียวบ้านนา', 'ดาบทหารยาม', 'ดาบไม้เสริมเหล็ก'],
      jian: ['กระบี่เหล็กขาว', 'กระบี่ศิษย์ใหม่', 'กระบี่ปลายธาร', 'กระบี่ลมอ่อน', 'กระบี่ใบไผ่'],
      dao: ['ดาบใหญ่ช่างตีเหล็ก', 'ดาบโค้งนักล่า', 'ดาบผ่าฟืน', 'ดาบทหารราบ', 'ดาบเขี้ยวหมาป่า'],
      spear: ['หอกไม้ปลายเหล็ก', 'หอกยามเมือง', 'หอกล่าหมูป่า', 'หอกด้ามไผ่', 'หอกสามัญ'],
      staff: ['พลองหวาย', 'กระบองไม้เนื้อแข็ง', 'พลองคนเดินทาง', 'ไม้เท้าศิษย์ใหม่', 'กระบองเถ้าดำ'],
      dagger: ['มีดสั้นชาวบ้าน', 'มีดล่าสัตว์', 'มีดพกนักเดินทาง', 'มีดปลายแหลม', 'มีดเหล็กบาง'],
      bow: ['คันธนูไม้ไผ่', 'ธนูนักล่า', 'คันธนูเมืองชายแดน', 'ธนูสายปอ', 'ธนูไม้สน'],
      whip: ['แส้หนังธรรมดา', 'แส้เถาวัลย์', 'แส้คุมม้า', 'แส้เส้นปอ', 'แส้หนังวัว'],
      fan: ['พัดกระดาษเสริมเหล็ก', 'พัดไม้ไผ่', 'พัดนักเดินทาง', 'พัดลายเมฆา', 'พัดขนนกธรรมดา'],
      claw: ['กรงเล็บเหล็กฝึกหัด', 'กรงเล็บนักล่า', 'ปลอกเล็บชาวยุทธ์', 'กรงเล็บเขี้ยวหิน', 'กรงเล็บทองแดง'],
      hammer: ['ค้อนช่างเหล็ก', 'ค้อนศิษย์ใหม่', 'ค้อนทุบหิน', 'ค้อนด้ามไม้', 'ค้อนเหล็กสั้น'],
      needle: ['เข็มเงินธรรมดา', 'เข็มเย็บผ้าซ่อนคม', 'เข็มทองแดง', 'เข็มแพทย์ฝึกหัด', 'เข็มลมเบา']
    };
    const COMMON_ARMOR_NAMES = ['เสื้อผ้าฝ้ายหนา', 'เสื้อเกราะหนังบาง', 'เสื้อคลุมเดินทาง', 'เกราะไม้ไผ่', 'เสื้อเกราะชาวบ้าน', 'หมวกหนังนักเดินทาง', 'ปลอกแขนผ้าเสริมเหล็ก', 'สนับขาผ้าใบ', 'รองเท้าหนังพื้นแข็ง', 'ผ้าคลุมกันฝนชายแดน'];
    const COMMON_RING_NAMES = ['แหวนทองแดงรวบปราณ', 'แหวนเหล็กผู้เดินทาง', 'แหวนไม้จันทน์', 'แหวนหยกแตกร้าว', 'แหวนเชือกถักคุ้มภัย'];
    const COMMON_NECKLACE_NAMES = ['สร้อยเหรียญเก่า', 'สร้อยหยกเมฆา', 'สร้อยเชือกแดง', 'สร้อยฟันหมาป่า', 'สร้อยป้ายไม้'];
    const COMMON_CURSED_ITEMS = [
      makeLibraryItem('common_cursed_blood_1', 'มีดเลือดค้างคืน', 'cursed', 'blood', { attack: 7.5, healthCost: 1 }),
      makeLibraryItem('common_cursed_soul_1', 'กระดิ่งเรียกเงา', 'cursed', 'soul', { defense: 6, restHealth: -2 }),
      makeLibraryItem('common_cursed_seal_1', 'ผ้ายันต์กลับด้าน', 'cursed', 'seal', { defense: 6, riskReduction: -1 }),
      makeLibraryItem('common_cursed_forbidden_1', 'แหวนลมหายใจดำ', 'cursed', 'forbidden', { training: 6, healthCost: 1 }),
      makeLibraryItem('common_cursed_haunted_1', 'หน้ากากคนเฝ้าศพ', 'cursed', 'haunted', { agility: 6, karma: -1 }),
      makeLibraryItem('common_cursed_blood_2', 'ปลอกแขนดูดแรง', 'cursed', 'blood', { attack: 7.5, body: -1 }),
      makeLibraryItem('common_cursed_soul_2', 'ขวดเสียงครวญ', 'cursed', 'soul', { spirit: 6, restQi: -2 }),
      makeLibraryItem('common_cursed_seal_2', 'ป้ายผนึกแตก', 'cursed', 'seal', { defense: 6, breakthroughBonus: -2 }),
      makeLibraryItem('common_cursed_forbidden_2', 'ตำราครึ่งหน้า', 'cursed', 'forbidden', { training: 6, riskReduction: -1 }),
      makeLibraryItem('common_cursed_haunted_2', 'สร้อยฟันผีดิบ', 'cursed', 'haunted', { luck: 3, karma: -1 })
    ];
    function libraryItemDescription(name, category, subtype) {
      const descriptions = {
        weapon: `อาวุธ${ITEM_CATEGORY_DEFS.weapon.subtypes[subtype] || 'สามัญ'}สำหรับผู้เริ่มต้น ใช้งานได้ตรงไปตรงมา`,
        armor: 'เครื่องป้องกันระดับสามัญ เนื้อวัสดุไม่หรูหราแต่พอช่วยรับแรงได้',
        talisman: subtype === 'ring' ? 'แหวนระดับสามัญสำหรับพกติดตัว ช่วยเสริมพลังเล็กน้อย' : 'สร้อยระดับสามัญสำหรับพกติดตัว ช่วยคุ้มครองผู้สวมใส่เล็กน้อย',
        cursed: 'วัตถุอาถรรพ์ระดับสามัญ พลังเด่นกว่าของทั่วไปแต่มีผลข้างเคียงติดมาด้วย',
        mount: 'พาหนะระดับสามัญ ฝึกเลี้ยงได้ง่ายและช่วยลดเวลาเดินทาง',
        material: 'วัตถุดิบระดับสามัญ ใช้เป็นฐานในการหลอมและคราฟต์ไอเท็ม'
      };
      return descriptions[category] || `${name} ระดับสามัญสำหรับผู้เริ่มต้น`;
    }
    function makeLibraryItem(id, name, category, subtype, bonus, extra = {}) { return { id, name, category, subtype, grade: 'common', bonus: { ...bonus }, description: extra.description || libraryItemDescription(name, category, subtype), ...extra }; }
    const COMMON_MOUNT_NAMES = {
      horse: ['ม้าสีน้ำตาล', 'ม้าขาวบ้านนา', 'ม้าขาไว', 'ม้าศึกเก่า', 'ม้าดำเดินทาง'],
      wolf: ['หมาป่าเทา', 'หมาป่าหลังเขา', 'หมาป่าลายดำ', 'หมาป่าตีนเบา', 'หมาป่าฝูงเหนือ'],
      boar: ['หมูป่าขนแข็ง', 'หมูป่าดอยหิน', 'หมูป่าจมูกดำ', 'หมูป่าตัวหนา', 'หมูป่าป่าลึก'],
      deer: ['กวางเขาสั้น', 'กวางหางขาว', 'กวางป่าเหนือ', 'กวางลายจุด', 'กวางเขาอ่อน'],
      ox: ['วัวเขาสั้น', 'วัวทุ่ง', 'วัวเทา', 'วัวลากเกวียน', 'วัวเขาโค้ง'],
      tiger: ['เสือลายหมอก', 'เสือเขี้ยวสั้น', 'เสือป่าหินผา', 'เสือเงาไม้', 'เสือโคร่งชายเขา'],
      lion: ['สิงโตแผงคอสั้น', 'สิงโตทุ่งหญ้า', 'สิงโตเขี้ยวขาว', 'สิงโตเฝ้าผา', 'สิงโตฝุ่นแดง']
    };
    const COMMON_MOUNT_PROFILES = {
      horse: { timeMultiplier: .65, costMultiplier: 1, dangerMultiplier: .95, healthMultiplier: .85, resourceMultiplier: .95, description: 'ม้าสามัญที่วิ่งได้เร็วและทรงตัวดี เหมาะกับถนนยาวและการเดินทางทั่วไป' },
      wolf: { timeMultiplier: .82, costMultiplier: .9, dangerMultiplier: .9, healthMultiplier: .8, resourceMultiplier: .9, description: 'หมาป่าสามัญที่คล่องตัวและประสาทสัมผัสดี เดินทางในทางรกได้คล่องกว่าสัตว์พาหนะทั่วไป' },
      boar: { timeMultiplier: .92, costMultiplier: 1, dangerMultiplier: .85, healthMultiplier: .75, resourceMultiplier: .95, description: 'หมูป่าสามัญร่างแน่นและอึด เดินช้ากว่าแต่รับทางขรุขระและอันตรายได้ดี' },
      deer: { timeMultiplier: .75, costMultiplier: .95, dangerMultiplier: 1.05, healthMultiplier: .95, resourceMultiplier: .85, description: 'กวางสามัญขาไวและเบาตัว ทำความเร็วได้ดีแต่บอบบางเมื่อเจอเส้นทางอันตราย' },
      ox: { timeMultiplier: 1.02, costMultiplier: .8, dangerMultiplier: .8, healthMultiplier: .7, resourceMultiplier: .75, description: 'วัวสามัญกำลังมาก แบกเสบียงได้ดีและใจเย็น แต่เคลื่อนที่ช้ากว่าสัตว์ชนิดอื่น' },
      tiger: { timeMultiplier: .72, costMultiplier: 1.15, dangerMultiplier: .72, healthMultiplier: .82, resourceMultiplier: .9, description: 'เสือสามัญพุ่งตัวได้เร็วและข่มสัตว์ร้ายระหว่างทาง แต่ต้องใช้เนื้อเลี้ยงและควบคุมให้ดี' },
      lion: { timeMultiplier: .8, costMultiplier: 1.1, dangerMultiplier: .68, healthMultiplier: .78, resourceMultiplier: .88, description: 'สิงโตสามัญร่างกำยำและน่าเกรงขาม ช่วยลดภัยจากสัตว์ป่าได้ดีแต่กินเสบียงมาก' }
    };
    const COMMON_MOUNTS = Object.entries(COMMON_MOUNT_NAMES).flatMap(([subtype, names]) => names.map((name, index) => makeLibraryItem(`common_mount_${subtype}_${index + 1}`, name, 'mount', subtype, {}, { travel: { ...COMMON_MOUNT_PROFILES[subtype] }, description: COMMON_MOUNT_PROFILES[subtype].description })));
    const WEAPON_DESIGNS = {
      sword: { label: 'ดาบ', roots: ['ตัดลม', 'เงาฝน', 'ยอดสน', 'แสงอรุณ', 'ธารศิลา'], action: 'คมดาบทอดแนวฟันมั่นคง', attack: 6, secondary: 'body', secondaryBase: 1 },
      jian: { label: 'กระบี่', roots: ['ใบไผ่', 'จันทร์เสี้ยว', 'สายธาร', 'หมอกเช้า', 'ดาวเคียง'], action: 'ปลายกระบี่สมดุลและพลิกทิศคล่อง', attack: 5, secondary: 'agility', secondaryBase: 1 },
      dao: { label: 'ดาบใหญ่', roots: ['ผาหิน', 'คลื่นเพลิง', 'เขี้ยวพยัคฆ์', 'เมฆทึบ', 'พสุธา'], action: 'คมกว้างและน้ำหนักส่งแรงฟันหนัก', attack: 8, secondary: 'body', secondaryBase: 1 },
      spear: { label: 'หอก', roots: ['ปลายสน', 'สายฝน', 'วายุเหนือ', 'จันทร์ไกล', 'เงาเมฆ'], action: 'ด้ามยาวช่วยคุมระยะด้วยปลายหอก', attack: 6, secondary: 'defense', secondaryBase: 1 },
      staff: { label: 'พลอง', roots: ['ไผ่เขียว', 'ไม้จันทน์', 'ธารไหล', 'เงาภูผา', 'ลมหมุน'], action: 'ด้ามพลองสมดุลสำหรับกวาดและตั้งรับ', attack: 4, secondary: 'defense', secondaryBase: 2 },
      dagger: { label: 'มีดสั้น', roots: ['คมจันทร์', 'ฝนปรอย', 'เงาไผ่', 'ปลายดาว', 'น้ำค้าง'], action: 'คมสั้นเบามือเหมาะกับจังหวะประชิด', attack: 4, secondary: 'agility', secondaryBase: 2 },
      bow: { label: 'ธนู', roots: ['ไม้สน', 'ลมเหนือ', 'เหยี่ยวไกล', 'จันทร์คราม', 'ดาวร่วง'], action: 'คันธนูตึงสม่ำเสมอช่วยรักษาจังหวะยิง', attack: 6, secondary: 'agility', secondaryBase: 1 },
      whip: { label: 'แส้', roots: ['เถาวัลย์', 'สายฝน', 'อสรพิษ', 'ลมหวน', 'เงาจันทร์'], action: 'เส้นแส้อ่อนตัวเพื่อควบคุมระยะ', attack: 4, secondary: 'agility', secondaryBase: 2 },
      fan: { label: 'พัดเหล็ก', roots: ['ใบหลิว', 'เมฆขาว', 'สายลม', 'จันทร์เย็น', 'ดาวพราว'], action: 'ซี่พัดเสริมคมช่วยรับและสวนกลับ', attack: 4, secondary: 'defense', secondaryBase: 2 },
      claw: { label: 'กรงเล็บ', roots: ['เหล็กกล้า', 'เหยี่ยวบิน', 'พยัคฆ์', 'รัตติกาล', 'พายุ'], action: 'ปลอกเล็บกระชับมือสำหรับเข้าประชิด', attack: 5, secondary: 'agility', secondaryBase: 2 },
      hammer: { label: 'ค้อน', roots: ['ทุบหิน', 'เหล็กดำ', 'ภูผา', 'สายฟ้า', 'ดาวตก'], action: 'หัวค้อนถ่วงน้ำหนักให้ส่งแรงกระแทก', attack: 8, secondary: 'body', secondaryBase: 2 },
      needle: { label: 'เข็ม', roots: ['เงินอ่อน', 'น้ำค้าง', 'ดอกเหมย', 'เงาจันทร์', 'ดาวเร้น'], action: 'เข็มขนาดเล็กพกง่ายและส่งคมได้รวดเร็ว', attack: 3, secondary: 'agility', secondaryBase: 2 }
    };
    function makeBalancedWeapon(grade, subtype, index) {
      const def = WEAPON_DESIGNS[subtype];
      const gradePrefix = { common: ['ไม้', 'เหล็ก', 'ทองแดง', 'ช่าง', 'เก่า'], uncommon: ['คม', 'หลอม', 'เกล็ด', 'แก่น', 'ขัด'], rare: ['คราม', 'หยก', 'นิล', 'เงิน', 'จันทร์'], epic: ['สวรรค์', 'ดารา', 'เทพ', 'มังกร', 'วิญญาณ'] }[grade][index];
      const name = `${def.label}${gradePrefix}${def.roots[index]}`;
      const bonus = { attack: def.attack + (index % 3), [def.secondary]: def.secondaryBase + (index >= 3 ? 1 : 0) };
      const stories = {
        common: `${name} ${def.action} รูปทรงเรียบง่ายเหมาะกับการฝึกและเดินทาง`,
        uncommon: `${name} ${def.action} ช่างเก็บรายละเอียดตามแนว${def.roots[index]} ทำให้อาวุธจับถนัดและใช้ได้มั่นคง`,
        rare: `${name} ${def.action} ผิวอาวุธสะท้อนลวดลาย${def.roots[index]}อย่างประณีต ผู้สร้างปรับน้ำหนักให้ผู้ใช้เคลื่อนไหวได้ตามจังหวะ`,
        epic: `${name} ${def.action} ลวดลาย${def.roots[index]}ทอดตลอดแนวอาวุธ ร่องรอยงานช่างบอกถึงเวลาที่ยาวนานกว่าจะได้สมดุลนี้ ผู้ครอบครองต้องเรียนรู้จังหวะของมันด้วยตนเอง`
      };
      return { id: `${grade}_${subtype}_${index + 1}`, name, category: 'weapon', subtype, grade, gradeExplicit: true, bonus, description: stories[grade] };
    }
    const COMMON_WEAPONS = Object.keys(WEAPON_DESIGNS).flatMap(subtype => Array.from({ length: 5 }, (_, index) => makeBalancedWeapon('common', subtype, index)));
    const ARMOR_DESIGNS = [
      { label: 'เสื้อผ้า', root: 'ฝ้าย', subtype: 'body', defense: 3, secondary: 'agility', value: 1, detail: 'เนื้อผ้านุ่มและตัดให้ขยับตัวสะดวก' },
      { label: 'เสื้อเกราะ', root: 'สน', subtype: 'body', defense: 5, secondary: 'body', value: 1, detail: 'แผ่นหนังซ้อนกันช่วยรับแรงที่ลำตัว' },
      { label: 'ผ้าคลุม', root: 'สายฝน', subtype: 'cloak', defense: 3, secondary: 'agility', value: 2, detail: 'ผ้าคลุมบางเบาเก็บชายให้ไม่กีดขวางเท้า' },
      { label: 'เกราะ', root: 'ไผ่เขียว', subtype: 'body', defense: 5, secondary: 'defense', value: 1, detail: 'ซี่ไผ่เรียงซ้อนเพื่อกระจายแรงปะทะ' },
      { label: 'เสื้อเกราะ', root: 'พสุธา', subtype: 'body', defense: 4, secondary: 'body', value: 2, detail: 'ชั้นผ้าและหนังหุ้มลำตัวอย่างแน่นหนา' },
      { label: 'หมวก', root: 'ยอดสน', subtype: 'head', defense: 4, secondary: 'body', value: 1, detail: 'หมวกบุด้านในช่วยรับแรงที่ศีรษะ' },
      { label: 'ปลอกแขน', root: 'เงาเหล็ก', subtype: 'body', defense: 3, secondary: 'defense', value: 2, detail: 'ปลอกแขนเสริมแผ่นเหล็กช่วยยกแขนรับแรง' },
      { label: 'สนับขา', root: 'ทางศิลา', subtype: 'legs', defense: 3, secondary: 'body', value: 2, detail: 'ชั้นผ้าหนาโอบขาและช่วยประคองการยืน' },
      { label: 'รองเท้า', root: 'ก้าวลม', subtype: 'boots', defense: 2, secondary: 'agility', value: 3, detail: 'พื้นรองเท้ายึดกระชับและเบาพอให้ก้าวคล่อง' },
      { label: 'ผ้าคลุม', root: 'เมฆเย็น', subtype: 'cloak', defense: 2, secondary: 'agility', value: 3, detail: 'ผืนคลุมพริ้วเบาช่วยเคลื่อนกายโดยไม่รั้งไหล่' }
    ];
    function makeBalancedArmor(grade, index) {
      const def = ARMOR_DESIGNS[index];
      const prefixes = {
        common: ['ทอ', 'หนัง', 'เดินทาง', 'ถัก', 'พื้นบ้าน', 'หนัง', 'เก่า', 'ผ้า', 'หนัง', 'กันฝน'],
        uncommon: ['ทอแน่น', 'หนังขัด', 'สายลม', 'ถักเหล็ก', 'หนังเสริม', 'คุ้มศีรษะ', 'หุ้มเหล็ก', 'รองชั้น', 'พื้นนุ่ม', 'ชายสั้น'],
        rare: ['หยก', 'เงาจันทร์', 'วายุ', 'คราม', 'ศิลาทอง', 'เมฆาคราม', 'นิล', 'หินเย็น', 'ดาวเหนือ', 'จันทร์ขาว'],
        epic: ['ดารา', 'พยัคฆ์', 'เมฆาสวรรค์', 'มังกร', 'เทพศิลา', 'สุริยัน', 'พิทักษ์ฟ้า', 'พสุธาทอง', 'เมฆาคล้อย', 'หงส์เหมันต์']
      };
      const name = `${def.label}${prefixes[grade][index]}${def.root}`;
      const bonus = def.secondary === 'defense' ? { defense: def.defense + def.value } : { defense: def.defense, [def.secondary]: def.value };
      const descriptions = {
        common: `${name} ${def.detail} รูปทรงเรียบง่ายเหมาะกับการใช้งานทั่วไป`,
        uncommon: `${name} ${def.detail} ช่างเก็บขอบและรอยต่อให้แน่นขึ้น เพื่อให้ผู้สวมใส่เคลื่อนไหวได้มั่นคง`,
        rare: `${name} ${def.detail} ลวดลาย${def.root}ทอดตามขอบเครื่องป้องกัน งานตัดเย็บและน้ำหนักได้รับการปรับให้สมดุล`,
        epic: `${name} ${def.detail} ลวดลาย${def.root}เชื่อมไปตามรอยต่อทุกส่วน ช่างวางชั้นวัสดุอย่างประณีตเพื่อรักษาสมดุลระหว่างการคุ้มกายกับการเคลื่อนไหว`
      };
      return { id: `${grade}_armor_${index + 1}`, name, category: 'armor', subtype: def.subtype, grade, gradeExplicit: true, bonus, description: descriptions[grade] };
    }
    const COMMON_ARMOR = ARMOR_DESIGNS.map((_, index) => makeBalancedArmor('common', index));
    const JEWELRY_DESIGNS = {
      ring: [
        { root: 'หินผา', detail: 'วงแหวนเรียบขัดเป็นลายชั้นหิน ช่วยประคองแนวรับ', bonus: { defense: 2, body: 1 } },
        { root: 'สายลม', detail: 'วงแหวนบางเบามีรอยสลักคล้ายลมพัด ช่วยให้ขยับตัวคล่อง', bonus: { agility: 2, defense: 1 } },
        { root: 'แสงอรุณ', detail: 'วงแหวนสีอุ่นเก็บขอบเรียบ ช่วยประคองกายขณะฝึก', bonus: { training: 2, body: 1 } },
        { root: 'คมธาร', detail: 'แหวนวงแคบสลักเส้นธาร ช่วยให้การเคลื่อนไหวหนักแน่น', bonus: { attack: 2, agility: 1 } },
        { root: 'ม่านเมฆ', detail: 'วงแหวนลายเมฆซ้อนชั้น ช่วยประคองท่าป้องกันและจังหวะฝึก', bonus: { defense: 1, training: 2 } }
      ],
      necklace: [
        { root: 'หินคุ้มกาย', detail: 'จี้หินกลมถักกับเชือกแน่น ช่วยประคองร่างกายและการตั้งรับ', bonus: { body: 2, defense: 1 } },
        { root: 'ใบไผ่', detail: 'จี้รูปใบไผ่ห้อยเบาไม่รั้งคอ ช่วยให้เคลื่อนตัวคล่อง', bonus: { agility: 2, body: 1 } },
        { root: 'ธารปราณ', detail: 'จี้สลักลายธารเรียงต่อกัน ช่วยประคองจังหวะการฝึกและท่ากาย', bonus: { training: 3, body: 1 } },
        { root: 'ดาวคุ้มภัย', detail: 'จี้ดาวมีขอบมนและสายถักแน่น ช่วยเสริมการป้องกัน', bonus: { defense: 2, agility: 1 } },
        { root: 'ประกายเหล็ก', detail: 'จี้เหล็กขัดเงาห้อยใกล้ลำตัว ช่วยประคองแรงและการตั้งรับ', bonus: { attack: 1, body: 2 } }
      ]
    };
    function makeBalancedJewelry(grade, subtype, index) {
      const def = JEWELRY_DESIGNS[subtype][index];
      const label = subtype === 'ring' ? 'แหวน' : 'สร้อย';
      const prefix = { common: ['ทองแดง', 'ไม้', 'เชือก', 'เหล็ก', 'หิน'], uncommon: ['หลอม', 'ขัด', 'ถัก', 'คัด', 'ประณีต'], rare: ['คราม', 'หยก', 'นิล', 'เงิน', 'จันทร์'], epic: ['สวรรค์', 'ดารา', 'เทพ', 'มังกร', 'วิญญาณ'] }[grade][index];
      const name = `${label}${prefix}${def.root}`;
      const descriptions = {
        common: `${name} ${def.detail} รูปแบบเรียบง่ายสำหรับพกติดตัว`,
        uncommon: `${name} ${def.detail} ช่างขัดรอยต่อและเลือกวัสดุให้แน่นหนาขึ้น`,
        rare: `${name} ${def.detail} ลวดลาย${def.root}ได้รับการเก็บรายละเอียดอย่างประณีต น้ำหนักสมดุลเมื่อสวมใส่`,
        epic: `${name} ${def.detail} ลวดลาย${def.root}ต่อเนื่องตลอดชิ้นงาน ช่างปรับทั้งน้ำหนักและรอยต่ออย่างละเอียด จนเครื่องประดับแนบสนิทเมื่อผู้ครอบครองเคลื่อนไหว`
      };
      return { id: `${grade}_${subtype}_${index + 1}`, name, category: 'talisman', subtype, grade, gradeExplicit: true, bonus: { ...def.bonus }, description: descriptions[grade] };
    }
    const COMMON_RINGS = JEWELRY_DESIGNS.ring.map((_, index) => makeBalancedJewelry('common', 'ring', index));
    const COMMON_NECKLACES = JEWELRY_DESIGNS.necklace.map((_, index) => makeBalancedJewelry('common', 'necklace', index));
    function makeGradeLibraryItem(id, name, category, subtype, grade, bonus, description, extra = {}) {
      return { id, name, category, subtype, grade, gradeExplicit: true, bonus: { ...bonus }, description, ...extra };
    }
    const UNCOMMON_WEAPONS = Object.keys(WEAPON_DESIGNS).flatMap(subtype => Array.from({ length: 5 }, (_, index) => makeBalancedWeapon('uncommon', subtype, index)));
    const UNCOMMON_ARMOR = ARMOR_DESIGNS.map((_, index) => makeBalancedArmor('uncommon', index));
    const UNCOMMON_RINGS = JEWELRY_DESIGNS.ring.map((_, index) => makeBalancedJewelry('uncommon', 'ring', index));
    const UNCOMMON_NECKLACES = JEWELRY_DESIGNS.necklace.map((_, index) => makeBalancedJewelry('uncommon', 'necklace', index));
    const UNCOMMON_CURSED_ITEMS = COMMON_CURSED_ITEMS.map((item, index) => makeGradeLibraryItem(`uncommon_cursed_${index + 1}`, `ของอาถรรพ์ชั้นดีชิ้นที่ ${index + 1}`, 'cursed', item.subtype, 'uncommon', item.bonus, `วัตถุอาถรรพ์ชั้นดีที่กักพลังได้มากขึ้น ผลดีเด่นกว่าของสามัญแต่ยังทิ้งผลข้างเคียงไว้`, { curseSource: 'uncommon' }));
    const UNCOMMON_MOUNTS = COMMON_MOUNTS.map((item, index) => makeGradeLibraryItem(`uncommon_mount_${item.subtype}_${(index % 5) + 1}`, `พาหนะชั้นดี${item.name}`, 'mount', item.subtype, 'uncommon', { agility: 2 }, `พาหนะ${ITEM_CATEGORY_DEFS.mount.subtypes[item.subtype]}ชั้นดี ฝึกมาเป็นพิเศษ จังหวะก้าวสม่ำเสมอและดูแลได้ง่ายกว่า`, { travel: { ...item.travel, timeMultiplier: Number((item.travel.timeMultiplier * .94).toFixed(3)) } }));
    const RARE_WEAPONS = Object.keys(WEAPON_DESIGNS).flatMap(subtype => Array.from({ length: 5 }, (_, index) => makeBalancedWeapon('rare', subtype, index)));
    const RARE_ARMOR = ARMOR_DESIGNS.map((_, index) => makeBalancedArmor('rare', index));
    const RARE_RINGS = JEWELRY_DESIGNS.ring.map((_, index) => makeBalancedJewelry('rare', 'ring', index));
    const RARE_NECKLACES = JEWELRY_DESIGNS.necklace.map((_, index) => makeBalancedJewelry('rare', 'necklace', index));
    const RARE_CURSED_ITEMS = COMMON_CURSED_ITEMS.map((item, index) => makeGradeLibraryItem(`rare_cursed_${index + 1}`, `วัตถุเงามืดหายาก ${index + 1}`, 'cursed', item.subtype, 'rare', item.bonus, `วัตถุอาถรรพ์หายากที่สะสมพลังได้หนาแน่น ผลตอบแทนสูงแต่ต้องรับภาระคำสาปให้ดี`, { curseSource: 'rare' }));
    const RARE_MOUNTS = COMMON_MOUNTS.map((item, index) => makeGradeLibraryItem(`rare_mount_${item.subtype}_${(index % 5) + 1}`, `พาหนะสายเลือดหายาก${index + 1}`, 'mount', item.subtype, 'rare', { agility: 3 }, `พาหนะ${ITEM_CATEGORY_DEFS.mount.subtypes[item.subtype]}หายาก สายพันธุ์แข็งแรงและตอบสนองต่อผู้ขี่ได้ไวกว่า`, { travel: { ...item.travel, timeMultiplier: Number((item.travel.timeMultiplier * .88).toFixed(3)) } }));
    const EPIC_WEAPONS = Object.keys(WEAPON_DESIGNS).flatMap(subtype => Array.from({ length: 5 }, (_, index) => makeBalancedWeapon('epic', subtype, index)));
    const EPIC_ARMOR = ARMOR_DESIGNS.map((_, index) => makeBalancedArmor('epic', index));
    const EPIC_RINGS = JEWELRY_DESIGNS.ring.map((_, index) => makeBalancedJewelry('epic', 'ring', index));
    const EPIC_NECKLACES = JEWELRY_DESIGNS.necklace.map((_, index) => makeBalancedJewelry('epic', 'necklace', index));
    const EPIC_CURSED_ITEMS = COMMON_CURSED_ITEMS.map((item, index) => makeGradeLibraryItem(`epic_cursed_${index + 1}`, `เศษเงาต้องห้ามมหากาพย์ ${index + 1}`, 'cursed', item.subtype, 'epic', item.bonus, `วัตถุอาถรรพ์มหากาพย์ที่พลังเกินกว่าวัตถุทั่วไปมาก แต่คำสาปก็ฝังลึกและแก้ยากขึ้น`, { curseSource: 'epic' }));
    const EPIC_MOUNTS = COMMON_MOUNTS.map((item, index) => makeGradeLibraryItem(`epic_mount_${item.subtype}_${(index % 5) + 1}`, `พาหนะเงาสวรรค์${index + 1}`, 'mount', item.subtype, 'epic', { agility: 4 }, `พาหนะ${ITEM_CATEGORY_DEFS.mount.subtypes[item.subtype]}มหากาพย์ที่ผ่านการปลุกเส้นปราณ ความเร็วและการตอบสนองเหนือสัตว์ทั่วไป`, { travel: { ...item.travel, timeMultiplier: Number((item.travel.timeMultiplier * .8).toFixed(3)) } }));
    const ITEM_LIBRARY = {
      common: { weapons: COMMON_WEAPONS, armor: COMMON_ARMOR, jewelry: [...COMMON_RINGS, ...COMMON_NECKLACES], cursed: COMMON_CURSED_ITEMS, mounts: COMMON_MOUNTS },
      uncommon: { weapons: UNCOMMON_WEAPONS, armor: UNCOMMON_ARMOR, jewelry: [...UNCOMMON_RINGS, ...UNCOMMON_NECKLACES], cursed: UNCOMMON_CURSED_ITEMS, mounts: UNCOMMON_MOUNTS },
      rare: { weapons: RARE_WEAPONS, armor: RARE_ARMOR, jewelry: [...RARE_RINGS, ...RARE_NECKLACES], cursed: RARE_CURSED_ITEMS, mounts: RARE_MOUNTS },
      epic: { weapons: EPIC_WEAPONS, armor: EPIC_ARMOR, jewelry: [...EPIC_RINGS, ...EPIC_NECKLACES], cursed: EPIC_CURSED_ITEMS, mounts: EPIC_MOUNTS },
      legendary: { weapons: [], armor: [], jewelry: [], cursed: [], mounts: [] }
    };
    // เกรดบอกคุณภาพ ส่วนชั้นบอกขั้นขั้นต่ำ: กระจายทุกสีในทุกชั้น
    const EQUIPMENT_REALM_SCALE = [1, 2, 3.5];
    Object.entries(ITEM_LIBRARY).forEach(([grade, groups]) => {
      const shift = { common: 0, uncommon: 1, rare: 2, epic: 3 }[grade] ?? 0;
      ['weapons', 'armor', 'jewelry'].forEach(category => (groups[category] || []).forEach((item, index) => {
        const designIndex = category === 'weapons' ? index % 5 : index;
        const tier = [0, 0, 1, 1, 2][(designIndex + shift) % 5];
        item.equipmentRealm = tier;
        item.equipmentStage = tier ? 1 : 0;
        item.bonus = Object.fromEntries(Object.entries(item.bonus || {}).map(([key, value]) => [key,
          ['attack', 'defense', 'body', 'agility'].includes(key) && Number.isFinite(value)
            ? Math.round(value * EQUIPMENT_REALM_SCALE[tier] * 100) / 100 : value]));
      }));
    });
    const ITEM_LIBRARY_BY_ID = Object.fromEntries(Object.values(ITEM_LIBRARY).flatMap(group => Object.values(group).flat()).map(item => [item.id, item]));
    const COMMON_ORE_NAMES = ['แร่เหล็กหยาบ', 'แร่ทองแดงเขียว', 'เศษเงินดิบ', 'หินดำช่างตี', 'แร่ตะกั่วแดง', 'เศษเหล็กเก่า', 'หินทรายแข็ง', 'แร่ดีบุกหม่น', 'เกล็ดหินฟ้า', 'ก้อนทองแดงดิบ'];
    const COMMON_HERB_NAMES = ['หญ้าฟื้นกาย', 'ใบลมอ่อน', 'รากขมพื้นบ้าน', 'ดอกน้ำค้าง', 'ผลเถาวัลย์แดง', 'ใบไผ่ปราณ', 'เห็ดดินชื้น', 'เมล็ดหอมจิต', 'กิ่งสนอุ่น', 'ดอกหญ้าหิมะ'];
    const COMMON_MATERIAL_LIBRARY = [
      ...COMMON_ORE_NAMES.map((name, index) => ({ id: `common_ore_${index + 1}`, name, type: 'ore', materialKey: 'iron', grade: 'common', value: 1, description: 'แร่ระดับสามัญ เนื้อไม่สม่ำเสมอแต่ใช้ตีอาวุธและเครื่องมือพื้นฐานได้' })),
      ...COMMON_HERB_NAMES.map((name, index) => ({ id: `common_herb_${index + 1}`, name, type: 'herb', materialKey: 'herb', grade: 'common', value: 1, description: 'สมุนไพรระดับสามัญ สรรพคุณไม่แรงมากแต่ใช้เป็นส่วนผสมพื้นฐานได้' }))
    ];
    const MATERIAL_LIBRARY = { common: COMMON_MATERIAL_LIBRARY, uncommon: [], rare: [], epic: [], legendary: [] };
    const MATERIAL_LIBRARY_BY_ID = Object.fromEntries(COMMON_MATERIAL_LIBRARY.map(item => [item.id, item]));
    return {
      RECIPES,
      MATERIAL_NAMES,
      MATERIAL_GRADE_IDS,
      MATERIAL_SHOP_PRICES,
      ITEM_GRADES,
      ITEM_CATEGORY_DEFS,
      WEAPON_TYPE_LABELS,
      ITEM_SLOT_DEFS,
      ITEM_LIBRARY,
      ITEM_LIBRARY_BY_ID,
      EQUIPMENT_REALM_SCALE,
      MATERIAL_LIBRARY,
      MATERIAL_LIBRARY_BY_ID
    };
  };

  Object.defineProperty(window, 'OneLifeItemCatalog', { value: createItemCatalog });
})();
