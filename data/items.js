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
    function makeGradeLibraryItem(id, name, category, subtype, grade, bonus, description, extra = {}) {
      return { id, name, category, subtype, grade, gradeExplicit: true, bonus: { ...bonus }, description, ...extra };
    }
    const UNCOMMON_CURSED_ITEMS = COMMON_CURSED_ITEMS.map((item, index) => makeGradeLibraryItem(`uncommon_cursed_${index + 1}`, `ของอาถรรพ์ชั้นดีชิ้นที่ ${index + 1}`, 'cursed', item.subtype, 'uncommon', item.bonus, `วัตถุอาถรรพ์ชั้นดีที่กักพลังได้มากขึ้น ผลดีเด่นกว่าของสามัญแต่ยังทิ้งผลข้างเคียงไว้`, { curseSource: 'uncommon' }));
    const UNCOMMON_MOUNTS = COMMON_MOUNTS.map((item, index) => makeGradeLibraryItem(`uncommon_mount_${item.subtype}_${(index % 5) + 1}`, `พาหนะชั้นดี${item.name}`, 'mount', item.subtype, 'uncommon', { agility: 2 }, `พาหนะ${ITEM_CATEGORY_DEFS.mount.subtypes[item.subtype]}ชั้นดี ฝึกมาเป็นพิเศษ จังหวะก้าวสม่ำเสมอและดูแลได้ง่ายกว่า`, { travel: { ...item.travel, timeMultiplier: Number((item.travel.timeMultiplier * .94).toFixed(3)) } }));
    const RARE_CURSED_ITEMS = COMMON_CURSED_ITEMS.map((item, index) => makeGradeLibraryItem(`rare_cursed_${index + 1}`, `วัตถุเงามืดหายาก ${index + 1}`, 'cursed', item.subtype, 'rare', item.bonus, `วัตถุอาถรรพ์หายากที่สะสมพลังได้หนาแน่น ผลตอบแทนสูงแต่ต้องรับภาระคำสาปให้ดี`, { curseSource: 'rare' }));
    const RARE_MOUNTS = COMMON_MOUNTS.map((item, index) => makeGradeLibraryItem(`rare_mount_${item.subtype}_${(index % 5) + 1}`, `พาหนะสายเลือดหายาก${index + 1}`, 'mount', item.subtype, 'rare', { agility: 3 }, `พาหนะ${ITEM_CATEGORY_DEFS.mount.subtypes[item.subtype]}หายาก สายพันธุ์แข็งแรงและตอบสนองต่อผู้ขี่ได้ไวกว่า`, { travel: { ...item.travel, timeMultiplier: Number((item.travel.timeMultiplier * .88).toFixed(3)) } }));
    const EPIC_CURSED_ITEMS = COMMON_CURSED_ITEMS.map((item, index) => makeGradeLibraryItem(`epic_cursed_${index + 1}`, `เศษเงาต้องห้ามมหากาพย์ ${index + 1}`, 'cursed', item.subtype, 'epic', item.bonus, `วัตถุอาถรรพ์มหากาพย์ที่พลังเกินกว่าวัตถุทั่วไปมาก แต่คำสาปก็ฝังลึกและแก้ยากขึ้น`, { curseSource: 'epic' }));
    const EPIC_MOUNTS = COMMON_MOUNTS.map((item, index) => makeGradeLibraryItem(`epic_mount_${item.subtype}_${(index % 5) + 1}`, `พาหนะเงาสวรรค์${index + 1}`, 'mount', item.subtype, 'epic', { agility: 4 }, `พาหนะ${ITEM_CATEGORY_DEFS.mount.subtypes[item.subtype]}มหากาพย์ที่ผ่านการปลุกเส้นปราณ ความเร็วและการตอบสนองเหนือสัตว์ทั่วไป`, { travel: { ...item.travel, timeMultiplier: Number((item.travel.timeMultiplier * .8).toFixed(3)) } }));
    const WORKBOOK_ITEM_GRADE = { 'สามัญ': 'common', 'ชั้นดี': 'uncommon', 'หายาก': 'rare', 'มหากาพย์': 'epic', 'ตำนาน': 'legendary' };
    const WORKBOOK_ITEMS = window.OneLifeWorkbookCatalog?.items;
    if (!WORKBOOK_ITEMS) throw new Error('Item catalog requires data/workbook-catalogs.js');
    const ITEM_LIBRARY = {
      common: { weapons: [], armor: [], jewelry: [], cursed: COMMON_CURSED_ITEMS, mounts: COMMON_MOUNTS },
      uncommon: { weapons: [], armor: [], jewelry: [], cursed: UNCOMMON_CURSED_ITEMS, mounts: UNCOMMON_MOUNTS },
      rare: { weapons: [], armor: [], jewelry: [], cursed: RARE_CURSED_ITEMS, mounts: RARE_MOUNTS },
      epic: { weapons: [], armor: [], jewelry: [], cursed: EPIC_CURSED_ITEMS, mounts: EPIC_MOUNTS },
      legendary: { weapons: [], armor: [], jewelry: [], cursed: [], mounts: [] }
    };
    const itemSheetCategories = { 'Weapons (Deep Lore)': 'weapons', 'Armor (Deep Lore)': 'armor', 'Jewelry (Deep Lore)': 'jewelry' };
    Object.entries(itemSheetCategories).forEach(([sheet, libraryCategory]) => {
      (WORKBOOK_ITEMS[sheet] || []).forEach(row => {
        const grade = WORKBOOK_ITEM_GRADE[row.Grade];
        if (!grade || !ITEM_LIBRARY[grade]) throw new Error(`Unknown workbook item grade: ${row.Grade}`);
        const bonus = {};
        [['Attack', 'attack'], ['Defense', 'defense'], ['Agility', 'agility'], ['Body', 'body']].forEach(([column, key]) => {
          const value = Number(row[column]);
          if (Number.isFinite(value) && value !== 0) bonus[key] = value;
        });
        const category = libraryCategory === 'jewelry' ? 'talisman' : libraryCategory === 'weapons' ? 'weapon' : 'armor';
        ITEM_LIBRARY[grade][libraryCategory].push({
          id: row.ID, name: row.Display_Name, baseName: row.Base_Name, category, subtype: row.Subtype,
          grade, gradeExplicit: false, bonus, description: row.Description, value: Math.round(4 * ITEM_GRADES[grade].priceMultiplier),
          equipmentRealm: Number(row.Game_Realm), equipmentStage: Number(row.Req_Stage), equipmentRealmName: row.Game_Realm_Name, workbookRealmName: row.Realm_Name,
          workbookStats: true, workbookSourceId: row.ID
        });
      });
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
      MATERIAL_LIBRARY,
      MATERIAL_LIBRARY_BY_ID
    };
  };

  Object.defineProperty(window, 'OneLifeItemCatalog', { value: createItemCatalog });
})();
