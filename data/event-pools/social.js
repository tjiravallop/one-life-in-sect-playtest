(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['social'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const SOCIAL_EVENTS = [
    {
      id: 'social_new_contact', minAge: 12, activity: 'social', minMonth: 0, rarity: 'uncommon',
      title: 'คนแปลกหน้าที่จำชื่อเจ้าได้', text: s => { const route = socialRoute(s); return `${route.log} ที่นั่นมี${route.group}คนหนึ่งจำชื่อเจ้าได้ และยื่นโอกาสให้รู้จักผู้คนมากขึ้น`; },
      choices: [
        { text: 'รับไมตรีและแลกข่าวสาร', check: { stat: 'charm', difficulty: 18 }, effects: [{ type: 'relation', key: 'acquaintance', value: 4 }, { type: 'stat', path: 'hero.reputation', value: 2 }, { type: 'path', key: 'compassion', value: 2 }], effect: s => { const social = ensureSocialState(s); social.newContacts++; social.lastTarget = socialRoute(s).key; addLog('ได้คนรู้จักใหม่จากการวางตัวอย่างเหมาะสม', true); } },
        { text: 'ถอยก่อน ไม่เสี่ยงผูกพัน', effects: [{ type: 'stat', path: 'hero.health', value: 1 }], effect: s => addLog('เจ้ารักษาระยะห่าง จึงปลอดภัยแต่พลาดโอกาสสร้างสายสัมพันธ์') }
      ]
    },
    {
      id: 'social_rumor', minAge: 12, activity: 'social', minMonth: 6, rarity: 'uncommon',
      title: 'ข่าวลือใต้ถ้วยชา', text: s => { const route = socialRoute(s); return `ที่${route.name} ข่าวลือเรื่องศัตรู เส้นทางค้า และความเคลื่อนไหวของสำนักกำลังแพร่ไปในหมู่${route.group}`; },
      choices: [
        { text: 'ฟังอย่างมีสติและตรวจสอบต้นทาง', check: { stat: 'intellect', difficulty: 20 }, effects: [{ type: 'path', key: 'insight', value: 3 }, { type: 'stat', path: 'hero.reputation', value: 1 }, { type: 'flag', key: 'socialRumorVerified', value: true }], effect: s => { ensureSocialState(s).rumors++; addLog('เจ้าคัดข่าวลือที่ตรวจสอบแล้ว เก็บเบาะแสไว้ใช้ภายหลัง', true); } },
        { text: 'เล่าต่อเพื่อซื้อความนิยม', effects: [{ type: 'stat', path: 'hero.reputation', value: 3 }, { type: 'stat', path: 'hero.karma', value: -1 }], effect: s => { ensureSocialState(s).rumors++; addLog('ข่าวลือแพร่เร็วขึ้น ชื่อเสียงเพิ่มขึ้น แต่การแพร่ข่าวที่ยังไม่ยืนยันส่งผลต่อกรรม'); } }
      ]
    },
    {
      id: 'social_conflict', minAge: 12, activity: 'social', minMonth: 12, rarity: 'extraordinary',
      title: 'โต๊ะเดียวกับคนที่ไม่ลงรอย', text: 'การพบปะครั้งนี้พาเจ้าเผชิญหน้ากับคนที่เคยขัดแย้งกัน ความเงียบหนึ่งช่วงอาจกลายเป็นพันธมิตร หรือศัตรูที่จำชื่อเจ้าไปตลอดชีวิต',
      choices: [
        { text: 'ยอมลดทิฐิและเจรจา', check: { stat: 'charm', difficulty: 25 }, effects: [{ type: 'relation', key: 'enemy', value: 4 }, { type: 'relation', key: 'friend', value: 3 }, { type: 'path', key: 'compassion', value: 3 }], effect: s => { const social = ensureSocialState(s); social.reconciliations++; social.conflicts = Math.max(0, social.conflicts - 1); s.flags.socialReconciled = true; addLog('ความขัดแย้งคลี่คลาย กลายเป็นความเข้าใจที่ยังต้องพิสูจน์ต่อไป', true); } },
        { text: 'ประกาศจุดยืนและไม่ยอมถอย', effects: [{ type: 'relation', key: 'enemy', value: -5 }, { type: 'stat', path: 'hero.reputation', value: 4 }, { type: 'path', key: 'duty', value: 2 }], effect: s => { ensureSocialState(s).conflicts++; s.flags.socialRival = true; addLog('การปะทะคารมจบลงด้วยคู่แข่งใหม่ แต่ชื่อเสียงเรื่องความเด็ดขาดเพิ่มขึ้น'); } }
      ]
    },
    {
      id: 'social_alliance', minAge: 12, activity: 'social', minMonth: 36, rarity: 'epic',
      title: 'ข้อเสนอจากผู้มีอิทธิพล', text: s => `ผู้คนที่เจ้าสั่งสมความไว้วางใจมาพบกันที่${socialRoute(s).name} พวกเขาเสนอให้รวมกำลังเป็นพันธมิตร โดยต้องใช้ทั้งชื่อเสียง ความเข้ากันได้ และทรัพยากร`,
      conditions: s => (s.hero?.reputation || 0) >= 15 && ((s.relations?.friend || 0) + (s.relations?.companion || 0)) >= 8,
      choices: [
        { text: 'ลงทุนทรัพยากรเพื่อสร้างพันธมิตร', requires: s => s.hero.money >= 5, locked: 'ต้องมีเงินอย่างน้อย 5 ตำลึง', note: 'ใช้เงิน 5 ตำลึงแม้เจรจาไม่สำเร็จ', check: { stat: 'charm', difficulty: 30 }, failureEffects: [{ type: 'stat', path: 'hero.money', value: -5 }], effects: [{ type: 'stat', path: 'hero.money', value: -5 }, { type: 'faction', key: 'jianghu', value: 5 }, { type: 'stat', path: 'hero.reputation', value: 5 }, { type: 'flag', key: 'alliesRecruited', value: true }], effect: s => { ensureSocialState(s).alliances++; addLog('พันธมิตรใหม่ตอบรับคำเชิญและจะช่วยเหลือเมื่อโลกเข้าสู่ภาวะวิกฤต', true); } },
        { text: 'ปฏิเสธอย่างสุภาพ เก็บทรัพยากรไว้ก่อน', effects: [{ type: 'path', key: 'insight', value: 2 }], effect: s => addLog('เจ้ายังไม่ผูกมัดตนเองกับพันธมิตรที่อาจเรียกร้องมากเกินไป') }
      ]
    },
    {
      id: 'social_family_visit', minAge: 12, activity: 'social', minMonth: 6, rarity: 'uncommon',
      conditions: s => (s.relations?.parents || 0) > 0 || (s.relations?.relatives || 0) > 0,
      title: 'จดหมายจากคนในสายเลือด', text: 'ญาติผู้ใหญ่ส่งข่าวผ่านตลาดมายังเจ้า พวกเขาไม่ได้ขอเงินทอง เพียงอยากรู้ว่าเจ้าจะยังนับตนเป็นคนในเรือนหรือไม่',
      choices: [
        { text: 'กลับไปเยี่ยมและรับฟังเรื่องในบ้าน', effects: [{ type: 'relation', key: 'parents', value: 3 }, { type: 'relation', key: 'relatives', value: 3 }, { type: 'path', key: 'compassion', value: 2 }], effect: s => { s.flags.familyContactRestored = true; addLog('สายเลือดที่ห่างหายกลับมามีเสียงในชีวิตของเจ้าอีกครั้ง', true); } },
        { text: 'ส่งทรัพยากรไปแทนการกลับไปพบ', requires: s => s.hero.money >= 3, locked: 'ต้องมีเงินอย่างน้อย 3 ตำลึง', effects: [{ type: 'stat', path: 'hero.money', value: -3 }, { type: 'relation', key: 'parents', value: 1 }, { type: 'relation', key: 'relatives', value: 1 }], effect: s => { s.flags.familySupportSent = true; addLog('สิ่งของถูกส่งถึงเรือนเดิม แม้ตัวเจ้ายังกลับไปไม่ได้'); } }
      ]
    },
    {
      id: 'social_friend_gathering', minAge: 12, activity: 'social', minMonth: 12, rarity: 'uncommon',
      conditions: s => (s.relations?.friend || 0) > 0 || (s.relations?.companion || 0) > 0,
      title: 'นัดพบของสหายร่วมทาง', text: 'สหายและคนที่เคยร่วมทางกับเจ้าชวนมาพบกัน พวกเขามีทั้งเรื่องที่อยากเล่าและคำถามว่าควรเดินไปทางใดต่อ',
      choices: [
        { text: 'เปิดใจแบ่งปันเสบียงและแผนการ', requires: s => s.hero.money >= 2, locked: 'ต้องมีเงินอย่างน้อย 2 ตำลึง', effects: [{ type: 'relation', key: 'friend', value: 3 }, { type: 'relation', key: 'companion', value: 3 }, { type: 'stat', path: 'hero.money', value: -2 }], effect: s => { s.flags.friendCircleKept = true; addLog('วงสหายยังไม่แตก แม้แต่ละคนต้องเดินคนละเส้นทาง', true); } },
        { text: 'ถามข่าวสารก่อน ไม่ผูกมัดตนเอง', effects: [{ type: 'relation', key: 'acquaintance', value: 2 }, { type: 'path', key: 'insight', value: 2 }], effect: s => { s.flags.friendRumorNetwork = true; addLog('เจ้าเก็บเครือข่ายข่าวของสหายไว้โดยยังไม่เปิดไพ่ทั้งหมด'); } }
      ]
    },
    {
      id: 'social_sect_mentor', minAge: 12, activity: 'social', minMonth: 84, rarity: 'extraordinary',
      conditions: s => !!s.flags?.metSect && ((s.relations?.master || 0) > 0 || (s.relations?.senior || 0) > 0),
      title: 'คำเตือนหลังศาลาสำนัก', text: 'อาจารย์และศิษย์พี่ไม่ได้เรียกเจ้าไปฝึก พวกเขาอยากรู้ว่าชื่อเสียงและความสัมพันธ์ที่เจ้าสร้างนอกสำนักจะยืนข้างสำนักในวันศึกหรือไม่',
      choices: [
        { text: 'ยืนยันว่าจะรักษาคนของสำนัก', effects: [{ type: 'relation', key: 'master', value: 3 }, { type: 'relation', key: 'senior', value: 3 }, { type: 'faction', key: 'sect', value: 2 }, { type: 'flag', key: 'warnedMaster', value: true }], effect: s => addLog('คำตอบของเจ้าทำให้อาจารย์และศิษย์พี่เริ่มวางใจในเครือข่ายของเจ้า', true) },
        { text: 'ขอรักษาอิสระ ไม่รับปากแทนผู้ใด', effects: [{ type: 'relation', key: 'master', value: -1 }, { type: 'relation', key: 'senior', value: 1 }, { type: 'path', key: 'freedom', value: 2 }], effect: s => { s.flags.sectTrustCautious = true; addLog('สำนักยังไม่ถือว่าเจ้าเป็นศัตรู แต่จะจับตาดูเส้นทางของเจ้าใกล้ขึ้น'); } }
      ]
    },
    {
      id: 'social_subordinate_rival', minAge: 12, activity: 'social', minMonth: 24, rarity: 'extraordinary',
      conditions: s => (s.relations?.subordinate || 0) > 0 || (s.relations?.enemy || 0) < 0,
      title: 'คนใต้มือกับคู่แข่งเก่า', text: 'คนที่เคยเดินตามคำสั่งของเจ้าและคู่แข่งที่เคยขวางทางปรากฏในวงสนทนาเดียวกัน หากจัดการไม่ดี ความไม่พอใจจะกลายเป็นศัตรูถาวร',
      choices: [
        { text: 'ให้คนของตนพูดก่อน แล้วเปิดทางคืนดี', check: { stat: 'charm', difficulty: 24 }, effects: [{ type: 'relation', key: 'subordinate', value: 4 }, { type: 'relation', key: 'enemy', value: 3 }, { type: 'flag', key: 'subordinateLoyal', value: true }], effect: s => { ensureSocialState(s).reconciliations++; addLog('ผู้ติดตามรู้ว่าคำสั่งของเจ้ามีที่ว่างให้ความเห็น และคู่แข่งยอมลดกำแพงลง'); } },
        { text: 'กดทุกคนให้ยอมรับอำนาจ', effects: [{ type: 'relation', key: 'subordinate', value: -2 }, { type: 'relation', key: 'enemy', value: -4 }, { type: 'stat', path: 'hero.reputation', value: 3 }], effect: s => { ensureSocialState(s).conflicts++; s.flags.socialRival = true; addLog('อำนาจทำให้คนเงียบลง แต่คู่แข่งจดจำวิธีที่เจ้าปฏิบัติต่อผู้ใต้มือ'); } }
      ]
    }
  ];
    return { SOCIAL_EVENTS };
  };
})();
