(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['quests'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const QUEST_EVENTS = [
    { id: 'quest_board_whisper', activity: 'quest', minMonth: 12, title: 'เสียงกระซิบบนกระดานประกาศ', text: 'หมึกบนใบประกาศเปลี่ยนเป็นชื่อภารกิจที่เหมาะกับเส้นทางของเจ้า', conditions: s => ensureQuestState(s).active.length > 0, choices: [{ text: 'อ่านเบาะแสและจัดลำดับความสำคัญ', effects: [{ type: 'path', key: 'insight', value: 1 }], effect: s => { const q = ensureQuestState(s); q.active.forEach(item => { item.progress = Math.min(99, (item.progress || 0) + 5); }); addLog('จัดลำดับเบาะแสของภารกิจสำเร็จ', true); } }, { text: 'พักหมึกไว้ก่อน', effects: [{ type: 'stat', path: 'hero.health', value: 2 }] }] }
  ];
    return { QUEST_EVENTS };
  };
})();
