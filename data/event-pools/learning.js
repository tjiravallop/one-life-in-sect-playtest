(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['learning'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const LEARNING_EVENTS = [
    { id: 'learning_master_lesson', activity: 'study', minMonth: 24, unlock: s => learningTeacher(s).id === 'master', title: 'บทเรียนจากอาจารย์', text: 'อาจารย์ผู้ชี้แนะวางตำราสองเล่มลงตรงหน้า เล่มหนึ่งสอนให้จำ อีกเล่มสอนให้ตั้งคำถาม', choices: [
      { text: 'จดจำหลักการและทบทวนให้แม่น', effects: [{ type: 'path', key: 'insight', value: 2 }], effect: s => { s.learningState.focus = 'cultivation'; const teacherName = s.mode === 'story' && s.characterId === 'lin-an' ? 'อาจารย์เหวินจง' : 'อาจารย์ผู้ชี้แนะ'; addLog(`${teacherName}มอบคัมภีร์ปฐมเมฆาให้เจ้าใช้ศึกษาต่อ`, true); addTreasure(s, 'คัมภีร์ปฐมเมฆา', { learningRate: 10, learningType: 'cultivation' }); } },
      { text: 'ถามถึงเหตุผลที่อยู่เบื้องหลังวิชา', effects: [{ type: 'stat', path: 'hero.attributes.spirit', value: 2 }, { type: 'path', key: 'insight', value: 2 }], effect: s => addLog('คำถามของเจ้าทำให้อาจารย์ยอมรับว่า ความเข้าใจสำคัญกว่าการท่องจำ') }
    ] },
    { id: 'learning_sect_archive', activity: 'study', minMonth: 84, unlock: s => s.flags?.metSect && learningLocationKey(s) === 'sect', title: 'หอคัมภีร์ที่ถูกผนึก', text: 'หอคัมภีร์สำนักเปิดให้ศิษย์ที่มีผลงาน เจ้าพบชื่อของวิชาที่ไม่มีในบัญชีทั่วไป', choices: [
      { text: 'ขออนุญาตเปิดผนึกอย่างเป็นทางการ', conditions: { statMin: { path: 'relations.senior', value: 8 } }, locked: 'ต้องมีศิษย์พี่รับรองอย่างน้อย 8', effects: [{ type: 'flag', key: 'cultivationLearned', value: true }, { type: 'path', key: 'duty', value: 2 }], effect: s => addLog('สำนักอนุญาตให้เจ้าเรียนวิชาโคจรปราณเก้าชีพจร', true) },
      { text: 'คัดลอกเฉพาะส่วนที่ใช้ช่วยผู้คน', effects: [{ type: 'flag', key: 'swordLearned', value: true }, { type: 'path', key: 'compassion', value: 2 }], effect: s => addLog('เจ้าคัดลอกกระบวนท่าป้องกันตัวโดยไม่แย่งสิทธิ์ของสำนัก', true) }
    ] },
    { id: 'learning_item_rubbing', activity: 'study', minMonth: 24, unlock: s => hasLearningItem(s), title: 'รอยหมึกบนคัมภีร์', text: 'ไอเทมที่เจ้าครอบครองเผยตัวอักษรซ่อนเร้นเมื่อวางไว้ใต้แสงจันทร์', choices: [
      { text: 'ถอดความอย่างระมัดระวัง', effects: [{ type: 'path', key: 'insight', value: 3 }], effect: s => { s.learningState.knowledge.lore = Math.min(100, s.learningState.knowledge.lore + 4); addLog('ความรู้จากไอเทมถูกถอดความและเก็บเป็นบทเรียนของเจ้า', true); } },
      { text: 'ทดลองกับวิชาที่กำลังฝึก', effects: [{ type: 'stat', path: 'hero.attributes.intellect', value: 2 }], effect: s => { s.learningState.knowledge.martial = Math.min(100, s.learningState.knowledge.martial + 3); addLog('เจ้าทดลองความรู้จากไอเทมกับกระบวนท่าที่กำลังฝึก'); } }
    ] }
  ];
    return { LEARNING_EVENTS };
  };
})();
