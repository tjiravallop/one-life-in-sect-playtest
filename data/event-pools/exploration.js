(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['exploration'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const EXPLORATION_EVENTS = [
    {
      id: 'explore_waystone_news', activity: 'explore', explorationTier: 'normal', rarity: 'normal', minMonth: 0,
      title: 'หลักหินบอกทาง', text: s => `ระหว่างสำรวจ${explorationRoute(s).name} เจ้าพบหลักหินเก่าที่คนเดินทางใช้ฝากข่าว และมีคนเดินทางกำลังอ่านข่าวอยู่`,
      choices: [
        { text: 'จดแผนที่และถามข่าวจากคนเดินทาง', effects: [{ type: 'path', key: 'insight', value: 2 }, { type: 'stat', path: 'hero.reputation', value: 1 }], effect: s => { ensureExplorationState(s).news.push('หลักหินชี้ทางไปหุบเขาเถ้าถ่าน'); addLog('ข่าวจากหลักหินถูกบันทึกเป็นความรู้สำหรับการสำรวจครั้งต่อไป', true); } },
        { text: 'ทำเครื่องหมายไว้แล้วเก็บสมุนไพรกลับ', effects: [{ type: 'material', key: 'herb', value: 2 }], effect: s => addLog('เจ้ากลับจากทางป่าโดยไม่เสี่ยงเกินจำเป็น') }
      ]
    },
    {
      id: 'explore_lost_scout', activity: 'explore', explorationTier: 'uncommon', rarity: 'uncommon', minMonth: 24, risk: true,
      title: 'ผู้ลาดตระเวนที่หายไป', text: s => `รอยเลือดพาเจ้าไปพบผู้ลาดตระเวนบาดเจ็บใน${explorationRoute(s).name}`,
      unlock: s => explorationRoute(s).tier !== 'safe' || s.paths?.insight >= 4,
      choices: [
        { text: 'พากลับไปหาคนของเขา', effects: [{ type: 'relation', key: 'companion', value: 8 }, { type: 'stat', path: 'hero.health', value: -8 }, { type: 'stat', path: 'hero.reputation', value: 5 }], effect: s => { s.flags.helpedScout = true; ensureExplorationState(s).news.push('กองลาดตระเวนพบการเคลื่อนกำลังของงูดำ'); addLog('ผู้ลาดตระเวนรอดชีวิตและสัญญาจะตอบแทนด้วยข่าวสาร', true); } },
        { text: 'ชิงม้วนข่าวและเงินจากคนเจ็บแล้วแยกตัว', effects: [{ type: 'path', key: 'freedom', value: 2 }, { type: 'stat', path: 'hero.money', value: 6 }, { type: 'stat', path: 'hero.reputation', value: -2 }], effect: s => { s.flags.scoutScroll = true; addLog('เจ้าชิงม้วนข่าวและเงินมาได้ แต่ทิ้งคนเจ็บไว้เบื้องหลัง'); } }
      ]
    },
    {
      id: 'explore_hidden_archive', activity: 'explore', explorationTier: 'extraordinary', rarity: 'extraordinary', minMonth: 36,
      title: 'หอจารึกใต้บ่อน้ำ', text: 'ทางลับเปิดสู่หอจารึกที่เก็บชื่อผู้เดินทาง เส้นทางของสำนักเก่า และหินปราณสองเม็ด',
      unlock: s => getAvailableExplorationAreas(s).some(area => area.tier === 'secret') && ((s.paths?.insight || 0) >= 6 || s.hero?.talent === 'keen'),
      choices: [
        { text: 'นำแผ่นจารึกเส้นทางและหินปราณกลับไป', effects: [{ type: 'path', key: 'insight', value: 5 }, { type: 'material', key: 'spiritStone', value: 2 }], effect: s => { s.flags.ancientArchive = true; s.flags.foundMap = true; addTreasure(s, 'แผ่นจารึกเส้นทางโบราณ', { agility: 3, training: 4 }); addLog('แผ่นจารึกทำให้เส้นทางลับหลายสายปรากฏขึ้น', true); } },
        { text: 'นำหลักฐานไปมอบให้สำนัก', requires: s => s.flags.metSect, locked: 'ต้องมีความสัมพันธ์กับสำนัก', effects: [{ type: 'faction', key: 'sect', value: 5 }, { type: 'stat', path: 'hero.reputation', value: 8 }, { type: 'relation', key: 'master', value: 5 }], effect: s => { s.flags.archivesToSect = true; addLog('สำนักรับรองความน่าเชื่อถือของเจ้าและเปิดเส้นทางข่าวสาร', true); } }
      ]
    },
    {
      id: 'explore_serpent_cache', activity: 'explore', explorationTier: 'main', rarity: 'epic', minMonth: 72,
      title: 'คลังลับใต้เงางู', text: 'ในอุโมงค์งูดำ เจ้าพบคลังเสบียง เงิน และบัญชีรายชื่อคนที่ส่งข่าวให้ศัตรู',
      unlock: s => s.mode === 'story' && s.flags.serpentTunnelFound === true,
      choices: [
        { text: 'นำบัญชีกลับไปเปิดโปง', effects: [{ type: 'flag', key: 'knowsTraitor', value: true }, { type: 'stat', path: 'hero.reputation', value: 12 }, { type: 'relation', key: 'master', value: 8 }, { type: 'faction', key: 'sect', value: 6 }], effect: s => { s.flags.houseEnemyKnown = true; addLog('บัญชีคลังลับกลายเป็นหลักฐานชิ้นสำคัญของสำนัก', true); } },
        { text: 'ทำลายคลังแล้วเก็บเงินกับเสบียงไว้ใช้เอง', effects: [{ type: 'stat', path: 'hero.money', value: 24 }, { type: 'stat', path: 'hero.reputation', value: -5 }, { type: 'path', key: 'freedom', value: 4 }], effect: s => { s.flags.escapePrepared = true; addLog('คลังลับถูกทำลาย เหลือเพียงเสบียงที่เจ้าขนออกมาได้'); } }
      ]
    }
  ];
  const EXPLORATION_DISCOVERIES = [
    ['uncommon','herb','สมุนไพรบนไหล่ทาง','ระหว่างสำรวจ เจ้าพบสมุนไพรชั้นดีขึ้นอยู่ในพื้นที่ที่ต้องระวังเท้าพลาด'],
    ['extraordinary','herb','สมุนไพรใต้ร่มหิน','ใต้ร่มหินมีสมุนไพรหายากขึ้นอยู่ใกล้พื้นดินที่ไม่มั่นคง'],
    ['epic','herb','สมุนไพรกลางหมอก','ในบริเวณที่หมอกปกคลุม เจ้าพบสมุนไพรมหากาพย์ แต่การเข้าใกล้อาจทำให้หลงทาง'],
    ['uncommon','weapon','กระบี่ข้างทาง','เจ้าพบกระบี่ชั้นดีถูกทิ้งไว้ใกล้ร่องรอยการต่อสู้ ไม่มีผู้ใดอยู่ให้ถามหาเจ้าของ'],
    ['extraordinary','weapon','กระบี่ในห่อผ้า','ห่อผ้าเก่าที่ซ่อนอยู่ตามเส้นทางบรรจุกระบี่หายาก และมีร่องรอยว่าพื้นที่นี้อาจไม่ปลอดภัย'],
    ['epic','weapon','กระบี่จากซากค่าย','เจ้าพบกระบี่มหากาพย์ในซากค่ายร้าง การนำมันออกมาต้องผ่านบริเวณที่เสี่ยงพังทลาย'],
    ['uncommon','manual','บันทึกกระบวนท่าชำรุด','เจ้าพบคัมภีร์กระบี่ชั้นดีที่ขาดบางหน้า ซ่อนอยู่ในห่อกันฝน'],
    ['extraordinary','manual','คัมภีร์ใต้ก้อนหิน','เจ้าพบคัมภีร์กระบี่หายากซ่อนใต้ก้อนหิน แต่ทางเข้ามีร่องรอยสัตว์'],
    ['epic','manual','คัมภีร์ในซากเก่า','ในซากสถานที่ร้าง เจ้าพบคัมภีร์กระบี่มหากาพย์วางอยู่หลังสิ่งกีดขวางที่อาจพังลงมา']
  ];
    return { EXPLORATION_EVENTS, EXPLORATION_DISCOVERIES };
  };
})();
