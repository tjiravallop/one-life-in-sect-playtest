(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['rest'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const REST_EVENTS = [
    {
      id: 'rest_whispered_news', activity: 'rest', rarity: 'uncommon', minMonth: 0,
      title: 'ข่าวลือใต้ชายคา', text: s => `ระหว่างพักที่${restRoute(s).location} เจ้าได้ยินข่าวเรื่องเส้นทางและผู้คนที่กำลังเคลื่อนไหว ข่าวนี้อาจไม่มีค่าในวันนี้ แต่วันหนึ่งอาจช่วยชีวิตเจ้าได้`,
      choices: [
        { text: 'ตั้งใจฟังและจดจำรายละเอียด', effects: [{ type: 'path', key: 'insight', value: 2 }, { type: 'stat', path: 'hero.reputation', value: 1 }], effect: s => addLog('เจ้าจดจำข่าวลือจากสถานที่พักไว้เป็นเบาะแส', true) },
        { text: 'ปล่อยให้ข่าวผ่านไป นอนต่อ', effects: [{ type: 'stat', path: 'hero.health', value: 4 }], effect: s => addLog('เจ้าปล่อยให้โลกวุ่นวายอยู่ข้างนอก แล้วพักต่ออย่างสงบ') }
      ]
    },
    {
      id: 'rest_ambush', activity: 'rest', rarity: 'uncommon', minMonth: 12, risk: true,
      title: 'เสียงฝีเท้ายามดึก', text: s => `ความปลอดภัยของ${restRoute(s).location}ไม่เพียงพอ เสียงฝีเท้าหยุดอยู่หน้าที่พักก่อนเงาดำจะค่อย ๆ แทรกเข้ามา`,
      unlock: s => restRoute(s).safety < 60,
      choices: [
        { text: 'ตื่นขึ้นแล้วหนีออกทางด้านหลัง', note: 'ใช้ความว่องไวและเสียสุขภาพเล็กน้อย', effects: [{ type: 'stat', path: 'hero.health', value: -4 }, { type: 'path', key: 'freedom', value: 2 }], effect: s => addLog('เจ้าหนีออกจากที่พักก่อนผู้บุกรุกจะเห็นหน้า', true) },
        { text: 'ซ่อนตัวและรอให้พวกมันไป', note: 'ถ้าสุขภาพต่ำ เหตุการณ์อาจรุนแรงขึ้น', effect: s => { if (s.hero.health < 30) { s.hero.health -= 14; addLog('ผู้บุกรุกค้นพบร่องรอย เจ้าบาดเจ็บก่อนหนีรอด', true); } else addLog('เจ้ากลั้นลมหายใจจนเสียงฝีเท้าหายไป'); } }
      ]
    },
    {
      id: 'rest_healer', activity: 'rest', rarity: 'uncommon', minMonth: 24,
      title: 'หมอเร่ร่อนหน้าประตู', text: s => `หมอเร่ร่อนเห็นสภาพของเจ้าที่${restRoute(s).location} และเสนอจะตรวจชีพจรแลกกับสมุนไพรหรือเงินเล็กน้อย`,
      choices: [
        { text: 'จ่ายค่าตรวจและรับการรักษา', requires: s => s.hero.money >= 4, locked: 'ต้องมี 4 ตำลึง', effects: [{ type: 'stat', path: 'hero.money', value: -4 }, { type: 'stat', path: 'hero.health', value: 16 }, { type: 'stat', path: 'hero.qi', value: 10 }], effect: s => addLog('หมอเร่ร่อนจัดยาให้ ชีพจรของเจ้าสงบลง', true) },
        { text: 'แลกสมุนไพรกับคำแนะนำ', requires: s => (s.materials?.herb || 0) >= 2, locked: 'ต้องมีสมุนไพร 2 ชิ้น', effects: [{ type: 'material', key: 'herb', value: -2 }, { type: 'stat', path: 'hero.health', value: 12 }, { type: 'stat', path: 'hero.qi', value: 8 }], effect: s => addLog('หมอรับสมุนไพรแล้วสอนวิธีประคองลมปราณ', true) },
        { text: 'ปฏิเสธและรักษาตัวเอง', effects: [{ type: 'stat', path: 'hero.health', value: 3 }], effect: s => addLog('เจ้าระวังคนแปลกหน้าและพักต่อด้วยวิธีของตน') }
      ]
    },
    {
      id: 'rest_sect_array', activity: 'rest', rarity: 'extraordinary', minMonth: 84,
      title: 'ห้องพักที่ไม่เปิดให้ทุกคน', text: 'ค่ายกลพักฟื้นชั้นในเปิดช่องว่างเพียงหนึ่งคืน ผู้ดูแลเสนอให้เจ้าเข้าไปพัก แต่ชื่อของเจ้าจะถูกบันทึกไว้ในทะเบียนสำนัก',
      unlock: s => restLocationKey(s) === 'sect' && (s.flags?.sectFormationLevel || 1) >= 3,
      choices: [
        { text: 'เข้าไปพักในค่ายกลชั้นใน', effects: [{ type: 'stat', path: 'hero.qi', value: 18 }, { type: 'stat', path: 'hero.health', value: 12 }, { type: 'faction', key: 'sect', value: 2 }], effect: s => addLog('ค่ายกลชั้นในฟื้นทั้งร่างกายและปราณ แต่สำนักจดจำการเข้าใช้ของเจ้าไว้', true) },
        { text: 'ปฏิเสธเพื่อไม่ติดหนี้สำนัก', effects: [{ type: 'path', key: 'freedom', value: 2 }], effect: s => addLog('เจ้าเลือกไม่รับความช่วยเหลือที่อาจกลายเป็นหนี้บุญคุณ') }
      ]
    }
  ];
    return { REST_EVENTS };
  };
})();
