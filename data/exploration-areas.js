(() => {
  'use strict';
  window.OneLifeExplorationCatalog = () => {
  const EXPLORATION_AREA_DEFS = {
    village_trails: { name: 'ทางป่าชายหมู่บ้าน', tier: 'safe', safety: 88, risk: 4, minMonth: 0, requires: () => true, yield: { herb: 2, money: 2 }, log: 'เก็บสมุนไพรตามทางป่าที่ชาวบ้านคุ้นเคยและฟังข่าวจากคนเดินทาง' },
    sect_border: { name: 'ชายแดนสำนักเมฆาคราม', tier: 'safe', safety: 78, risk: 7, minMonth: 24, requires: s => s.flags?.metSect || s.hero?.reputation >= 5, yield: { herb: 2, spiritStone: 1, reputation: 1 }, log: 'สำรวจแนวชายแดนสำนัก แลกข่าวกับผู้คุมทางและจดจำจุดพักปลอดภัย' },
    blackpine: { name: 'ป่าสนดำ', tier: 'danger', safety: 48, risk: 18, minMonth: 24, requires: s => (s.paths?.insight || 0) >= 3 || s.flags?.foundMap || s.hero?.power >= 100, yield: { herb: 3, iron: 1, money: 5 }, log: 'ฝ่าแนวป่าสนดำที่มีสัตว์ร้ายและร่องรอยคนหาย เพื่อค้นหาทรัพยากรที่เมืองไม่มี' },
    ash_canyon: { name: 'หุบเขาเถ้าถ่าน', tier: 'danger', safety: 32, risk: 28, minMonth: 60, requires: s => s.hero?.power >= 220 || s.flags?.spiritWeapon || s.flags?.metSect && s.hero?.reputation >= 8, yield: { iron: 3, spiritStone: 2, money: 8, reputation: 2 }, log: 'สำรวจหุบเขาเถ้าถ่าน เก็บแร่และร่องรอยการเคลื่อนกำลังของศัตรู' },
    moonwell: { name: 'บ่อน้ำจันทร์ซ่อนเร้น', tier: 'secret', safety: 54, risk: 22, minMonth: 36, requires: s => (s.flags?.foundMap && (s.paths?.insight || 0) >= 6) || s.hero?.talent === 'keen' && ((s.hero?.attributes?.luck || 0) >= 15 || (s.hero?.attributes?.intellect || 0) >= 18), yield: { herb: 4, spiritStone: 3, qi: 12, reputation: 3 }, secret: 'moonwell', log: 'ตามแผนที่และความรู้ไปถึงบ่อน้ำจันทร์ที่ไม่ปรากฏในเส้นทางปกติ' },
    serpent_tunnel: { name: 'อุโมงค์งูดำ', tier: 'secret', safety: 24, risk: 36, minMonth: 72, requires: s => (s.flags?.foundMap || s.flags?.escapePrepared) && (s.flags?.knowsTraitor || s.paths?.insight >= 8 || s.hero?.reputation >= 15), yield: { iron: 2, spiritStone: 4, money: 14, reputation: 4 }, secret: 'serpent_tunnel', log: 'เปิดทางลับใต้ภูเขาเพื่อค้นหาหลักฐาน เสบียง และข่าวจากเครือข่ายเงา ระวังพิษเมื่อพบศัตรู'  }
  };
  const EXPLORATION_AREA_LINKS = {
    village_trails: ['starting_village', 'traveler_village', 'border_market', 'distant_land'],
    sect_border: ['cloud_sect', 'border_market'], blackpine: ['forest_caves', 'starting_village'],
    ash_canyon: ['forest_caves', 'sect_warfront'], moonwell: ['forest_caves'], serpent_tunnel: ['forest_caves', 'cloud_sect']
  };
  Object.entries(EXPLORATION_AREA_DEFS).forEach(([id, area]) => { Object.assign(area, { id, connectedAreaIds: EXPLORATION_AREA_LINKS[id], durationMonths: 1, returnsToOrigin: true, outcomeKinds: ['resource', 'enemy', 'lost'] }); });
  return { EXPLORATION_AREA_DEFS, EXPLORATION_AREA_LINKS };
  };
})();
