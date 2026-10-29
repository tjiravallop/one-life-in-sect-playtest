(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['craft'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const CRAFT_EVENTS = [
    { id: 'craft_lost_formula', minAge: 12, activity: 'craft', rarity: 'uncommon', minMonth: 12, title: 'สูตรที่หายไป', text: 'ระหว่างจัดชั้นตำรา เจ้าพบเศษสูตรเก่าที่อาจต่อยอดความรู้ได้ แต่ต้องแลกกับเวลาตามหาส่วนที่ขาด', choices: [
      { text: 'รื้อค้นจนพบเค้าสูตร', effects: [{ type: 'craftKnowledge', key: 'alchemy', value: 1 }, { type: 'path', key: 'insight', value: 1 }], effect: s => addLog('เจ้าต่อเศษสูตรที่หายไปกลับมาได้ ความรู้ปรุงยาเพิ่มขึ้น', true) },
      { text: 'ขายข่าวเรื่องสูตรให้คนรู้จัก', effects: [{ type: 'stat', path: 'hero.money', value: 2 }], effect: s => addLog('เจ้าขายข่าวเรื่องสูตรให้คนรู้จักแทน') }
    ] },
    { id: 'craft_spoiled_materials', minAge: 12, activity: 'craft', rarity: 'uncommon', minMonth: 6, unlock: s => (s.materials?.herb || 0) >= 1, title: 'วัตถุดิบเริ่มเสีย', text: 'ความชื้นทำให้วัตถุดิบชุดหนึ่งเสื่อมสภาพ เจ้าต้องตัดสินใจว่าจะคัดทิ้งหรือเสี่ยงใช้ต่อ', choices: [
      { text: 'คัดทิ้งและรักษาเตาให้ปลอดภัย', effects: [{ type: 'material', key: 'herb', value: -1 }, { type: 'stat', path: 'hero.health', value: 2 }], effect: s => addLog('เจ้าคัดวัตถุดิบเสียออกจากคลังอย่างระมัดระวัง') },
      { text: 'เสี่ยงใช้วัตถุดิบต่อ', effects: [{ type: 'material', key: 'herb', value: -1 }, { type: 'stat', path: 'hero.health', value: -5 }, { type: 'craftKnowledge', key: 'alchemy', value: 1 }], effect: s => addLog('กลิ่นพิษทำให้เจ้าบาดเจ็บ แต่ได้บทเรียนราคาแพง', true) }
    ] },
    { id: 'craft_special_customer', minAge: 12, activity: 'craft', rarity: 'rare', minMonth: 24, title: 'ลูกค้าพิเศษหน้าร้าน', text: 'ผู้เดินทางปิดบังตัวตนมาขอของสนับสนุน เขาจ่ายดี แต่การรับงานอาจทำให้ความสัมพันธ์บางสายเปลี่ยนไป', choices: [
      { text: 'ทำชุดสนับสนุนและส่งให้ลูกค้า', requires: s => canCraft(s, RECIPES.find(r => r.id === 'support_kit')), locked: 'ต้องมีวัตถุดิบและความรู้สำหรับชุดสนับสนุน', note: 'ใช้วัตถุดิบและเงินตามต้นทุนสูตร รับค่าจ้าง 6 ตำลึง', effects: [{ type: 'money', value: 6 }, { type: 'craftKnowledge', key: 'support', value: 1 }, { type: 'relation', key: 'acquaintance', value: 2 }], effect: s => { const cost = effectiveCraftCost(s, RECIPES.find(r => r.id === 'support_kit')); Object.entries(cost).forEach(([key, amount]) => { if (key === 'money') s.hero.money -= amount; else s.materials[key] -= amount; }); s.lastCraftMonth = s.month; addLog('เจ้าทำชุดสนับสนุนส่งให้ลูกค้า ผู้ว่าจ้างจ่ายเงินและฝากช่องทางติดต่อไว้', true); } },
      { text: 'ปฏิเสธเพื่อไม่เสี่ยง', effects: [{ type: 'path', key: 'freedom', value: 1 }], effect: s => addLog('เจ้าไม่รับงานที่ไม่รู้ที่มา') }
    ] }
  ];
    return { CRAFT_EVENTS };
  };
})();
