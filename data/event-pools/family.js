(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['family'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const FAMILY_EVENTS = [
    {
      id: 'family_health_crisis', activity: 'family', minMonth: 1,
      unlock: s => familyAllowed(s) && (ensureFamilyState(s).children.some(child => child.alive !== false) || (ensureFamilyState(s).spouse && ensureFamilyState(s).spouse.alive !== false) || ensureFamilyState(s).parents.some(p => p.alive !== false)),
      title: 'ไข้ที่ไม่ควรมองข้าม', text: 'คนในเรือนล้มป่วยพร้อมกัน ค่าใช้จ่ายรักษาและเวลาที่ต้องดูแลอาจกระทบทั้งตระกูล',
      choices: [
        { text: 'ใช้เงินรักษาเต็มที่', note: 'สุขภาพครอบครัวและความผูกพันดีขึ้น', requires: s => s.hero.money >= 8, effects: [{ type: 'stat', path: 'hero.money', value: -8 }], effect: s => { const f = ensureFamilyState(s); f.health = clamp(f.health + 12, 0, 100); f.bond = clamp(f.bond + 8, 0, 100); addFamilyChronicle(s, 'ทุ่มทรัพย์รักษาคนในเรือน', 3); } },
        { text: 'กู้เงินจากคลังตระกูล', note: 'รักษาได้แต่เกิดหนี้และแรงกดดัน', effect: s => { const f = ensureFamilyState(s); f.debt += 12; f.health = clamp(f.health + 5, 0, 100); f.conflict = clamp(f.conflict + 4, 0, 100); addFamilyChronicle(s, 'กู้หนี้เพื่อประคองชีวิตคนในเรือน', -1); } }
      ]
    },
    {
      id: 'family_education_choice', activity: 'family', minMonth: 72,
      unlock: s => familyAllowed(s) && ensureFamilyState(s).children.some(child => child.alive !== false && child.ageMonths >= 6 * 12 && child.ageMonths < 18 * 12),
      title: 'ทางแยกของทายาท', text: 'ทายาทเริ่มมีพรสวรรค์ การเลือกครูและเส้นทางวันนี้จะสะท้อนในพงศาวดารตระกูล',
      choices: [
        { text: 'ส่งเข้าเรียนกับครูผู้รู้', note: 'การศึกษาสูงขึ้น ใช้เงิน 10 ตำลึง', requires: s => s.hero.money >= 10, effects: [{ type: 'stat', path: 'hero.money', value: -10 }], effect: s => { const f = ensureFamilyState(s); const c = f.children.find(child => child.alive !== false && child.ageMonths >= 6 * 12 && child.ageMonths < 18 * 12); if (c) { c.path = 'study'; c.education = Math.min(100, c.education + 20); f.legacyScore += 4; addFamilyChronicle(s, `ส่ง${c.name}เข้าสู่เส้นทางการศึกษา`, 4); } } },
        { text: 'ให้ฝึกงานและช่วยงานเรือน', note: 'ได้ทรัพยากรเล็กน้อยและความรับผิดชอบ', effect: s => { const f = ensureFamilyState(s); const c = f.children.find(child => child.alive !== false && child.ageMonths >= 6 * 12 && child.ageMonths < 18 * 12); if (c) { c.path = 'social'; c.education = Math.min(100, c.education + 8); s.hero.money += 4; f.bond = clamp(f.bond + 3, 0, 100); addFamilyChronicle(s, `${c.name} เรียนรู้หน้าที่จากชีวิตจริง`, 2); } } }
      ]
    },
    {
      id: 'family_conflict', activity: 'family', minMonth: 1,
      unlock: s => familyAllowed(s) && ensureFamilyState(s).conflict >= 8,
      title: 'รอยร้าวในเรือน', text: 'หนี้ ความเหนื่อยล้า และความคาดหวังต่างกันทำให้คนในครอบครัวเริ่มขัดแย้ง',
      choices: [
        { text: 'หยุดงานเพื่อพูดคุยและไกล่เกลี่ย', note: 'ความขัดแย้งลดลง ใช้เงิน 3 ตำลึง', requires: s => s.hero.money >= 3, locked: 'ต้องมีเงินอย่างน้อย 3 ตำลึง', effects: [{ type: 'stat', path: 'hero.money', value: -3 }], effect: s => { const f = ensureFamilyState(s); f.conflict = Math.max(0, f.conflict - 10); f.bond = clamp(f.bond + 6, 0, 100); addFamilyChronicle(s, 'ไกล่เกลี่ยรอยร้าวในเรือน', 3); } },
        { text: 'ปล่อยให้เวลาตัดสิน', note: 'ความขัดแย้งรุนแรงขึ้นและชื่อเสียงครอบครัวเสียหาย', effect: s => { const f = ensureFamilyState(s); f.conflict = clamp(f.conflict + 8, 0, 100); s.hero.reputation -= 3; f.legacyScore = Math.max(0, f.legacyScore - 2); addFamilyChronicle(s, 'ความขัดแย้งถูกปล่อยให้ลุกลาม', -2); } }
      ]
    },
    {
      id: 'family_child_growth', activity: 'family', minMonth: 72,
      unlock: s => familyAllowed(s) && ensureFamilyState(s).children.some(child => child.alive !== false && child.ageMonths >= 12 * 12 && child.ageMonths < 18 * 12),
      title: 'ทายาทเริ่มเติบโต', text: 'ทายาทเริ่มมีความคิดของตนเอง การดูแลวันนี้จะกลายเป็นชื่อเสียงและความสามารถของตระกูลในวันหน้า',
      choices: [
        { text: 'มอบหน้าที่และให้เรียนรู้จากโลก', note: 'ความรับผิดชอบและ Legacy เพิ่มขึ้น', effect: s => { const f = ensureFamilyState(s); const c = f.children.find(child => child.alive !== false && child.ageMonths >= 12 * 12 && child.ageMonths < 18 * 12); if (c) { c.education = Math.min(100, c.education + 12); c.path = c.path || 'wander'; f.bond = clamp(f.bond + 5, 0, 100); f.legacyScore += 5; addFamilyChronicle(s, `${c.name} เริ่มรับผิดชอบงานของตระกูล`, 5); } } },
        { text: 'เก็บทายาทไว้คุ้มครองในเรือน', note: 'สุขภาพครอบครัวดีขึ้น แต่การศึกษาช้าลง', effect: s => { const f = ensureFamilyState(s); const c = f.children.find(child => child.alive !== false && child.ageMonths >= 12 * 12 && child.ageMonths < 18 * 12); if (c) { c.health = clamp(c.health + 10, 0, 100); f.health = clamp(f.health + 5, 0, 100); f.conflict = clamp(f.conflict + 2, 0, 100); addFamilyChronicle(s, `คุ้มครอง${c.name}ไว้ในเรือน`, 2); } } }
      ]
    },
    {
      id: 'family_debt_inheritance', activity: 'family', minMonth: 1,
      unlock: s => familyAllowed(s) && (ensureFamilyState(s).debt >= 10 || ensureFamilyState(s).legacyScore >= 8),
      title: 'หนี้เก่ากับมรดกใหม่', text: 'เอกสารจากญาติผู้ล่วงลับเผยทั้งทรัพย์สินและหนี้สินที่ตระกูลต้องรับผิดชอบ',
      choices: [
        { text: 'รับมรดกพร้อมชำระหนี้', note: 'ได้ทรัพย์สินและชื่อเสียง แต่ต้องจ่าย 12 ตำลึง', requires: s => s.hero.money >= 12, effects: [{ type: 'stat', path: 'hero.money', value: -12 }], effect: s => { const f = ensureFamilyState(s); f.debt = Math.max(0, f.debt - 12); f.treasury += 18; f.legacyScore += 6; f.bond = clamp(f.bond + 4, 0, 100); addFamilyChronicle(s, 'รับมรดกและสะสางหนี้เก่าของตระกูล', 6); } },
        { text: 'ปฏิเสธมรดกเพื่อรักษาความอยู่รอด', note: 'ลดหนี้แต่สูญเสียโอกาสและชื่อเสียง', effect: s => { const f = ensureFamilyState(s); f.debt = Math.max(0, f.debt - 5); f.legacyScore = Math.max(0, f.legacyScore - 2); s.hero.reputation -= 2; addFamilyChronicle(s, 'ปฏิเสธมรดกที่ผูกติดหนี้สิน', -2); } }
      ]
    },
  ];
    return { FAMILY_EVENTS };
  };
})();
