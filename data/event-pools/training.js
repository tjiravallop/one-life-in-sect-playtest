(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts.training = function({ addLog, cultivationAtCeiling, equippedCultivationTechnique }) {
    const TRAINING_EVENTS = [
      {
        id: 'training_steady_breath', activity: 'train', rarity: 'normal', minAge: 5,
        tag: 'ฝึกพื้นฐาน', title: 'ลมหายใจที่นับได้',
        text: 'เสียงไม้เคาะจังหวะจากลานฝึกดังสม่ำเสมอ เจ้าพบว่าการนับลมหายใจช่วยให้ร่างกายไม่รีบร้อนเกินไป',
        choices: [
          { text: 'นับลมหายใจให้ครบทุกจังหวะ', effects: [
            { type: 'set', path: 'hero.discipline', value: s => Math.min(100, (Number(s.hero.discipline) || 0) + 3) },
            { type: 'path', key: 'insight', value: 1 }
          ] },
          { text: 'เร่งจังหวะเพื่อทดสอบขีดจำกัด', check: { stat: 'spirit', difficulty: 21 }, effects: [
            { type: 'set', path: 'hero.bodyFoundation', value: s => Math.min(100, (Number(s.hero.bodyFoundation) || 0) + 4) }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 3) }
          ] }
        ]
      },
      {
        id: 'training_stone_stance', activity: 'train', rarity: 'normal', minAge: 5,
        tag: 'ฝึกกาย', title: 'ยืนมั่นบนหินลื่น',
        text: 'ฝนทิ้งคราบน้ำไว้บนลานหิน อาจารย์ให้เจ้าฝึกยืนให้นิ่งโดยไม่เกร็งจนเสียสมดุล',
        choices: [
          { text: 'ลดจุดศูนย์ถ่วงและค่อย ๆ ทรงตัว', effects: [
            { type: 'set', path: 'hero.bodyFoundation', value: s => Math.min(100, (Number(s.hero.bodyFoundation) || 0) + 3) },
            { type: 'set', path: 'hero.attributes.body', value: s => Math.min(126, (Number(s.hero.attributes.body) || 0) + 1) }
          ] },
          { text: 'ฝืนยืนต้านแรงลม', check: { stat: 'body', difficulty: 22 }, effects: [
            { type: 'set', path: 'hero.martialSkill', value: s => Math.min(100, (Number(s.hero.martialSkill) || 0) + 3) }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 3) }
          ] }
        ]
      },
      {
        id: 'training_shadow_steps', activity: 'train', rarity: 'uncommon', minAge: 5,
        tag: 'ฝึกกระบวนท่า', title: 'เงากระบี่บนกำแพง',
        text: 'แสงตะเกียงทอดเงากระบี่บนกำแพง เจ้าลองตามจังหวะเงาโดยไม่ปล่อยให้ท่าต่อเนื่องกลายเป็นการใช้แรงเปล่า',
        choices: [
          { text: 'ฝึกช้า ๆ ให้ท่าคมชัด', effects: [
            { type: 'set', path: 'hero.martialSkill', value: s => Math.min(100, (Number(s.hero.martialSkill) || 0) + 2) },
            { type: 'path', key: 'insight', value: 1 }
          ] },
          { text: 'เร่งต่อกระบวนท่าให้ครบชุด', check: { stat: 'body', difficulty: 24 }, effects: [
            { type: 'set', path: 'hero.martialSkill', value: s => Math.min(100, (Number(s.hero.martialSkill) || 0) + 4) }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 4) }
          ] }
        ]
      },
      {
        id: 'training_worn_grip', activity: 'train', rarity: 'uncommon', minAge: 5,
        tag: 'วินัยการฝึก', title: 'ด้ามไม้ที่สึกตามมือ',
        text: 'ด้ามอาวุธฝึกสึกเป็นรอยตามตำแหน่งนิ้ว อาจารย์ชี้ให้เห็นว่าความสม่ำเสมอทำให้เจ้ารู้ข้อผิดพลาดของตนเองได้',
        choices: [
          { text: 'ปรับจับใหม่ตามคำแนะนำ', effects: [
            { type: 'set', path: 'hero.discipline', value: s => Math.min(100, (Number(s.hero.discipline) || 0) + 2) },
            { type: 'path', key: 'insight', value: 2 }
          ] },
          { text: 'ฝึกต่อด้วยท่าที่คุ้นเคย', check: { stat: 'spirit', difficulty: 23 }, effects: [
            { type: 'set', path: 'hero.martialSkill', value: s => Math.min(100, (Number(s.hero.martialSkill) || 0) + 2) }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 2) }
          ] }
        ]
      },
      {
        id: 'training_qi_current', activity: 'train', rarity: 'uncommon', minAge: 5,
        tag: 'ฝึกปราณ', title: 'กระแสปราณใต้ฝ่ามือ',
        text: 'เมื่อโคจรปราณ กระแสหนึ่งไหลย้อนจากฝ่ามือ เจ้าต้องเลือกว่าจะประคองลมหายใจหรือเสี่ยงควบคุมกระแสนั้น',
        unlock: s => !!s.hero?.cultivationAccess && !!equippedCultivationTechnique(s) && !cultivationAtCeiling(s) && (Number(s.hero?.cultivation) || 0) < 100,
        choices: [
          { text: 'ประคองกระแสให้กลับสู่จังหวะเดิม', effects: [
            { type: 'stat', path: 'hero.qi', value: -2 },
            { type: 'path', key: 'insight', value: 1 }
          ] },
          { text: 'นำกระแสย้อนมาเสริมการโคจร', check: { stat: 'spirit', difficulty: 25 }, requires: s => (Number(s.hero?.qi) || 0) >= 2, locked: 'ต้องมีปราณอย่างน้อย 2 หน่วย', effects: [
            { type: 'stat', path: 'hero.qi', value: -2 }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 3) }
          ], effect: s => {
            if (!s.hero?.cultivationAccess || cultivationAtCeiling(s)) return;
            s.hero.cultivation = Math.min(100, (Number(s.hero.cultivation) || 0) + 3);
            addLog('เจ้าควบคุมกระแสปราณกลับเข้าสู่วงโคจรได้ ความก้าวหน้าเพิ่มขึ้นเล็กน้อย', true);
          } }
        ]
      },
      {
        id: 'training_body_foundation', activity: 'train', rarity: 'normal', minAge: 5,
        tag: 'ฝึกรากฐาน', title: 'พื้นฐานก่อนปราณ',
        text: 'ผู้ฝึกคนหนึ่งยังเปิดทางบำเพ็ญไม่ได้ แต่อาจารย์ย้ำว่าร่างกายและวินัยที่มั่นคงก็เป็นรากฐานของการฝึกในวันหน้า',
        unlock: s => !s.hero?.cultivationAccess,
        choices: [
          { text: 'ฝึกท่ายืนและการทรงตัว', effects: [
            { type: 'set', path: 'hero.bodyFoundation', value: s => Math.min(100, (Number(s.hero.bodyFoundation) || 0) + 4) },
            { type: 'set', path: 'hero.discipline', value: s => Math.min(100, (Number(s.hero.discipline) || 0) + 2) }
          ] },
          { text: 'ฝึกกำลังด้วยท่าพื้นฐาน', check: { stat: 'body', difficulty: 20 }, effects: [
            { type: 'set', path: 'hero.attributes.body', value: s => Math.min(126, (Number(s.hero.attributes.body) || 0) + 1) },
            { type: 'set', path: 'hero.martialSkill', value: s => Math.min(100, (Number(s.hero.martialSkill) || 0) + 2) }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 2) }
          ] }
        ]
      },
      {
        id: 'training_master_rhythm', activity: 'train', rarity: 'uncommon', minAge: 8,
        tag: 'คำชี้แนะ', title: 'จังหวะที่อาจารย์เว้นไว้',
        text: 'อาจารย์หยุดกระบวนท่าก่อนจังหวะสุดท้าย เจ้าสังเกตเห็นช่องว่างที่ตั้งใจเว้นไว้และมีโอกาสถามถึงเหตุผล',
        unlock: s => (Number(s.relations?.master) || 0) >= 5 && Array.isArray(s.trainingFocus) && s.trainingFocus.length > 0,
        choices: [
          { text: 'ถามถึงจังหวะที่ขาดหาย', effects: [{ type: 'path', key: 'insight', value: 2 }], effect: s => {
            s.trainingMastery = s.trainingMastery && typeof s.trainingMastery === 'object' ? s.trainingMastery : {};
            s.trainingFocus.forEach(id => { s.trainingMastery[id] = Math.min(120, (Number(s.trainingMastery[id]) || 0) + 2); });
            addLog('คำอธิบายของอาจารย์ช่วยให้เข้าใจวิชาที่กำลังฝึกมากขึ้น', true);
          } },
          { text: 'จดจำท่าไว้แล้วฝึกซ้ำด้วยตนเอง', effects: [
            { type: 'set', path: 'hero.discipline', value: s => Math.min(100, (Number(s.hero.discipline) || 0) + 2) }
          ] }
        ]
      },
      {
        id: 'training_sect_formation', activity: 'train', rarity: 'extraordinary', minAge: 8, minMonth: 24,
        tag: 'ค่ายกลฝึก', title: 'ช่องว่างในค่ายกลสำนัก',
        text: 'ค่ายกลฝึกของสำนักมีช่องว่างอยู่หนึ่งจุด หากจับจังหวะที่ถูกต้องได้ ปราณจะไหลเวียนราบรื่นขึ้น แต่การฝืนอาจทำให้เสียหลัก',
        unlock: s => !!s.flags?.metSect && (s.locations?.selected === 'sect' || s.locations?.current === 'sect'),
        choices: [
          { text: 'สังเกตการไหลเวียนก่อนก้าวเข้าไป', effects: [
            { type: 'path', key: 'insight', value: 2 },
            { type: 'faction', key: 'sect', value: 1 }
          ] },
          { text: 'ก้าวเข้าค่ายกลตามจังหวะที่คาดไว้', check: { stat: 'spirit', difficulty: 27 }, effects: [
            { type: 'stat', path: 'hero.qi', value: 3 },
            { type: 'faction', key: 'sect', value: 2 }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 5) }
          ] }
        ]
      },
      {
        id: 'training_bottleneck_reflection', activity: 'train', rarity: 'epic', minAge: 12, minMonth: 84,
        tag: 'ความเข้าใจ', title: 'ทางตันที่ยังไม่ใช่ประตู',
        text: 'ความก้าวหน้าชะลอลง แต่ยังไม่ถึงเวลาทะลวงขั้น อาจารย์เตือนให้แยกให้ออกระหว่างการฝืนเร่งกับการทำความเข้าใจสิ่งที่ฝึกมา',
        unlock: s => !!s.hero?.cultivationAccess && !s.breakthroughState?.ready && !cultivationAtCeiling(s) && (Number(s.hero?.cultivation) || 0) >= 70 && (Number(s.hero?.cultivation) || 0) < 100,
        choices: [
          { text: 'ทบทวนการโคจรและวางรากฐาน', effects: [
            { type: 'set', path: 'trainingFoundation', value: s => Math.max(0, Number(s.trainingFoundation) || 0) + 3 },
            { type: 'path', key: 'insight', value: 2 }
          ] },
          { text: 'เร่งปราณผ่านจุดที่ติดขัด', check: { stat: 'spirit', difficulty: 29 }, effects: [
            { type: 'stat', path: 'hero.qi', value: -2 }
          ], failureEffects: [
            { type: 'set', path: 'hero.health', value: s => Math.max(1, (Number(s.hero.health) || 1) - 5) }
          ], effect: s => {
            if (!s.hero?.cultivationAccess || cultivationAtCeiling(s)) return;
            s.hero.cultivation = Math.min(100, (Number(s.hero.cultivation) || 0) + 4);
            addLog('ความเข้าใจช่วยให้ปราณเคลื่อนผ่านจุดติดขัดไปได้เล็กน้อย', true);
          } }
        ]
      },
      {
        id: 'training_recovering_stance', activity: 'train', rarity: 'normal', minAge: 5,
        tag: 'ขีดจำกัดร่างกาย', title: 'ท่าฝึกหลังบาดเจ็บ',
        text: 'อาการล้าทำให้ทุกท่วงท่าหนักกว่าปกติ การฝึกต่ออาจช่วยรักษาวินัย แต่การหยุดพักสักครู่ก็ไม่ใช่ความพ่ายแพ้',
        unlock: s => (Number(s.hero?.health) || 0) <= (Number(s.hero?.maxHealth) || 100) * 0.6,
        choices: [
          { text: 'พักและปรับท่าให้เหมาะกับสภาพร่างกาย', effects: [
            { type: 'set', path: 'hero.health', value: s => Math.min(Number(s.hero.maxHealth) || 100, (Number(s.hero.health) || 0) + 5) },
            { type: 'path', key: 'compassion', value: 1 }
          ] },
          { text: 'ฝึกต่อโดยลดแรงลง', effects: [
            { type: 'set', path: 'hero.discipline', value: s => Math.min(100, (Number(s.hero.discipline) || 0) + 2) },
            { type: 'path', key: 'insight', value: 1 }
          ], effect: s => {
            s.hero.health = Math.max(1, (Number(s.hero.health) || 1) - 1);
            addLog('เจ้าฝึกต่ออย่างระมัดระวังและหยุดก่อนอาการบาดเจ็บรุนแรงขึ้น');
          } }
        ]
      }
    ];
    return { TRAINING_EVENTS };
  };
})();
