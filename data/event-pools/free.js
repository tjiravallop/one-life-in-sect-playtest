(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['free'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const FREE_LIFE_EVENTS = [
    {
      id: 'free-life-day-work', freeLife: true, activity: 'free', rarity: 'normal', tag: 'โอกาสจากถนน',
      title: 'งานหนึ่งวันใต้ชายคาตลาด',
      text: 'เจ้าพบคนขายของที่ต้องการแรงงานชั่วคราว งานนี้ไม่เปลี่ยนเส้นทางชีวิตในทันที แต่ช่วยให้เดือนนี้ไม่ขาดมือ',
      freeWeight: s => ((s.hero?.money || 0) < 12 ? 2.4 : .65) * freeLifeLocationWeight(s, ['roadside', 'inn', 'rented']),
      choices: [
        { text: 'รับงานและลงมือช่วย', auto: 'safe', effects: [{ type: 'flag', key: 'freeLifeWorked', value: true }, { type: 'stat', path: 'hero.money', value: 5 }, { type: 'stat', path: 'hero.health', value: -2 }, { type: 'path', key: 'duty', value: 1 }] },
        { text: 'ปฏิเสธเพื่อรักษาแรง', auto: 'safe', effects: [{ type: 'stat', path: 'hero.health', value: 2 }, { type: 'path', key: 'freedom', value: 1 }] }
      ]
    },
    {
      id: 'free-life-teahouse', freeLife: true, activity: 'free', rarity: 'normal', tag: 'ผู้คนระหว่างทาง',
      title: 'โต๊ะว่างในโรงน้ำชา',
      text: 'เสียงสนทนาหลายสายพาเจ้ารู้จักผู้คนใหม่ ทั้งข่าวสารและความสัมพันธ์อาจเริ่มจากโต๊ะเล็ก ๆ นี้',
      freeWeight: s => (1 + ((s.hero?.attributes?.charm || 0) / 40) + ((s.relations?.acquaintance || 0) > 5 ? .35 : 0)) * freeLifeLocationWeight(s, ['owned', 'estate', 'rented', 'inn']),
      choices: [
        { text: 'นั่งฟังและทำความรู้จักผู้คน', auto: 'safe', effects: [{ type: 'flag', key: 'freeLifeNewsNetwork', value: true }, { type: 'relation', key: 'acquaintance', value: 3 }, { type: 'stat', path: 'hero.reputation', value: 1 }, { type: 'path', key: 'compassion', value: 1 }] },
        { text: 'ฟังเฉพาะข่าวสำคัญแล้วเดินต่อ', auto: 'safe', effects: [{ type: 'stat', path: 'hero.attributes.intellect', value: 1 }, { type: 'path', key: 'insight', value: 1 }] }
      ]
    },
    {
      id: 'free-life-quiet-shelter', freeLife: true, activity: 'free', rarity: 'normal', tag: 'จังหวะพัก',
      title: 'เรือนพักที่ยังมีห้องว่าง',
      text: 'เจ้าพบสถานที่สงบให้หยุดพักหนึ่งคืน คุณภาพของที่พักขึ้นอยู่กับสถานที่ที่เจ้าครอบครองและทรัพย์ที่มี',
      freeWeight: s => ((s.hero?.health || 0) < (s.hero?.maxHealth || 100) * .65 ? 2.2 : .55) * freeLifeLocationWeight(s, ['owned', 'estate', 'rented', 'retainer', 'sect']),
      choices: [
        { text: 'จ่ายค่าที่พักและพักให้เต็มที่', auto: 'safe', requires: s => s.hero.money >= 2, locked: 'ต้องมีเงินอย่างน้อย 2 ตำลึง', note: 'ใช้เงิน 2 ตำลึงเพื่อพักฟื้น', effects: [{ type: 'flag', key: 'freeLifeShelterKnown', value: true }, { type: 'stat', path: 'hero.money', value: -2 }, { type: 'stat', path: 'hero.health', value: s => Math.max(4, Math.round((restRoute(s).heal || 8) * .45)) }] },
        { text: 'นอนกลางแจ้งโดยไม่เสียเงิน', auto: 'safe', effects: [{ type: 'stat', path: 'hero.health', value: 2 }, { type: 'path', key: 'freedom', value: 1 }] }
      ]
    },
    {
      id: 'free-life-road-merchant', freeLife: true, activity: 'free', rarity: 'rare', tag: 'การเดินทางและทรัพยากร',
      title: 'พ่อค้าร่วมทาง',
      text: 'พ่อค้ารับซื้อสมุนไพรทั่วไป และชวนเจ้าเดินร่วมทางช่วงหนึ่งโดยช่วยออกค่าเสบียง',
      freeWeight: s => (1 + ((s.hero?.money || 0) >= 20 ? .45 : 0) + ((s.hero?.attributes?.luck || 0) / 80)) * freeLifeLocationWeight(s, ['roadside', 'inn', 'hidden_cave']),
      choices: [
        { text: 'ขายสมุนไพรให้พ่อค้า', auto: 'safe', requires: s => (s.materials?.herb || 0) >= 1, locked: 'ต้องมีสมุนไพรทั่วไปอย่างน้อย 1', note: 'สมุนไพรทั่วไป −1 · เงิน +7', effects: [{ type: 'material', key: 'herb', value: -1 }, { type: 'stat', path: 'hero.money', value: 7 }, { type: 'path', key: 'freedom', value: 2 }] },
        { text: 'เดินร่วมทางกับพ่อค้าชั่วคราว', auto: 'safe', requires: s => s.hero.money >= 2, locked: 'ต้องมีเงินอย่างน้อย 2 ตำลึง', note: 'ใช้เงิน 2 ตำลึงและเสียสุขภาพเล็กน้อย', effects: [{ type: 'flag', key: 'freeLifeTraveled', value: true }, { type: 'faction', key: 'jianghu', value: 1 }, { type: 'stat', path: 'hero.money', value: -2 }, { type: 'stat', path: 'hero.health', value: -1 }, { type: 'stat', path: 'hero.attributes.luck', value: 2 }, { type: 'path', key: 'freedom', value: 3 }] },
        { text: 'ขอบคุณและแยกทางกับพ่อค้า', auto: 'safe', effects: [{ type: 'path', key: 'freedom', value: 1 }] }
      ]
    },
    {
      id: 'free-life-hillside', freeLife: true, activity: 'free', rarity: 'rare', tag: 'สำรวจโลกกว้าง',
      title: 'ทางแยกบนไหล่เขา',
      text: 'ทางหนึ่งนำไปยังซากหมู่บ้าน อีกทางลัดเลาะไปยังหุบเขาเงียบงัน เจ้าเลือกได้ตามกำลังและนิสัยของตน',
      freeWeight: s => (1 + ((s.hero?.talent === 'keen' || s.hero?.attributes?.luck || 0) >= 14 ? .8 : 0)) * freeLifeLocationWeight(s, ['roadside', 'hidden_cave']),
      choices: [
        { text: 'สำรวจซากหมู่บ้านอย่างระมัดระวัง', auto: 'safe', effects: [{ type: 'flag', key: 'freeLifeTrailMapped', value: true }, { type: 'material', key: 'herb', value: 2 }, { type: 'stat', path: 'hero.attributes.intellect', value: 1 }, { type: 'stat', path: 'hero.health', value: -2 }, { type: 'path', key: 'insight', value: 2 }] },
        { text: 'เลือกทางหุบเขาเพื่อเก็บประสบการณ์', auto: 'safe', effects: [{ type: 'stat', path: 'hero.attributes.luck', value: 1 }, { type: 'stat', path: 'hero.health', value: -1 }, { type: 'path', key: 'freedom', value: 2 }] }
      ]
    },
    {
      id: 'free-life-news', freeLife: true, activity: 'free', rarity: 'normal', tag: 'ข่าวสารจากโลก',
      title: 'ข่าวลือที่เปลี่ยนทิศทางลม',
      text: 'เจ้ารับรู้ข่าวของเมือง สำนัก และผู้คนจากหลายแหล่ง ข่าวนี้ไม่มีคำสั่งให้ต้องทำตาม แต่ช่วยให้ตัดสินใจเดือนหน้าได้ดีขึ้น',
      freeWeight: s => (1 + ((s.hero?.attributes?.intellect || 0) / 60)) * freeLifeLocationWeight(s, ['owned', 'estate', 'sect', 'inn']),
      choices: [
        { text: 'จดจำข่าวและตรวจสอบแหล่งที่มา', auto: 'safe', effects: [{ type: 'flag', key: 'freeLifeNewsVerified', value: true }, { type: 'stat', path: 'hero.attributes.intellect', value: 1 }, { type: 'stat', path: 'hero.reputation', value: 1 }, { type: 'path', key: 'insight', value: 2 }] },
        { text: 'ปล่อยให้ข่าวผ่านไปตามลม', auto: 'safe', effects: [{ type: 'stat', path: 'hero.health', value: 1 }, { type: 'path', key: 'freedom', value: 1 }] }
      ]
    }
  ];
    return { FREE_LIFE_EVENTS };
  };
})();
