(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['travel'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const TRAVEL_EVENTS = [
    { id: 'travel_bandits', activity: 'travel', rarity: 'uncommon', tag: 'ภัยระหว่างทาง', title: 'เงาโจรบนสันเขา', text: 'โจรดักทางเรียกค่าผ่านแดนจากขบวนของเจ้า', unlock: s => !!s.travel?.active, choices: [
      { text: 'ฝ่าวงล้อม', check: { stat: 'body', difficulty: 22 }, effects: [{ type: 'stat', path: 'hero.reputation', value: 3 }, { type: 'path', key: 'freedom', value: 2 }], failureEffects: [{ type: 'stat', path: 'hero.health', value: -12 }] },
      { text: 'จ่ายเงินและเก็บแรงไว้เดินทางต่อ', requires: s => s.hero.money >= 8, locked: 'ต้องมีเงินอย่างน้อย 8 ตำลึง', effects: [{ type: 'stat', path: 'hero.money', value: -8 }, { type: 'path', key: 'compassion', value: 1 }] }
    ] },
    { id: 'travel_storm', activity: 'travel', rarity: 'extraordinary', tag: 'ภัยธรรมชาติ', title: 'พายุปิดช่องเขา', text: 'ฝนหล่มและก้อนหินถล่มทำให้เส้นทางเดิมใช้เวลาเพิ่มขึ้น', unlock: s => !!s.travel?.active, choices: [
      { text: 'อ้อมเขาและรักษาขบวน', requires: s => s.hero.money >= 4, locked: 'ต้องมีเงินอย่างน้อย 4 ตำลึงสำหรับการอ้อมทาง', effects: [{ type: 'stat', path: 'hero.health', value: -5 }, { type: 'stat', path: 'hero.money', value: -4 }], effect: s => extendTravel(s, 1, 'พายุปิดช่องเขา') },
      { text: 'เสี่ยงฝ่าช่องเขา', check: { stat: 'luck', difficulty: 25 }, effects: [{ type: 'path', key: 'freedom', value: 4 }], failureEffects: [{ type: 'stat', path: 'hero.health', value: -18 }] }
    ] },
    { id: 'travel_wayfarer', activity: 'travel', rarity: 'normal', tag: 'ผู้เดินทาง', title: 'ผู้เดินทางร่วมทาง', text: 'คนแปลกหน้าขอร่วมขบวนและแลกข่าวสารจากปลายทาง', unlock: s => !!s.travel?.active, choices: [{ text: 'รับฟังข่าวสารระหว่างร่วมทาง', effects: [{ type: 'relation', key: 'acquaintance', value: 2 }, { type: 'path', key: 'insight', value: 2 }] }] },
    { id: 'travel_secret', activity: 'travel', rarity: 'epic', tag: 'โอกาสลับ', title: 'ตราประทับใต้หลักหิน', text: 'แผนที่เก่าชี้ทางลับที่อาจย่นระยะทางและเปิดเรื่องราวใหม่', unlock: s => !!s.travel?.active && (s.flags?.foundMap || s.hero?.talent === 'keen'), choices: [{ text: 'จดจำเส้นทางไว้', effects: [{ type: 'flag', key: 'secretRouteKnown', value: true }, { type: 'path', key: 'insight', value: 4 }, { type: 'stat', path: 'hero.attributes.luck', value: 1 }] }] }
  ];
    return { TRAVEL_EVENTS };
  };
})();
