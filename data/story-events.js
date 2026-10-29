(() => {
  'use strict';

  // Scripted narrative records. Runtime helpers are injected by app.js.
  const createStoryEventCatalog = ({
    adaptiveDialogue,
    addHerb,
    addLog,
    addMaterial,
    addTreasure,
    endGame,
    ensureCraftingState,
    ensureHousehold,
    ensureInventory,
    ensureLifespanState,
    finishBattle,
    finishEscape,
    resolveAmbush,
    siegeBattleOmen,
    updateFactionReputation
  }) => {

  const STORY_CHARACTER_EVENTS = {
    story_dream_intro: {
      id: 'story_dream_intro', characterId: 'dream-walker', activity: 'train', minMonth: 0,
      title: 'ห้องจำลองใต้หอคัมภีร์', text: 'ผลึกหยั่งอนาคตเปิดภาพชีวิตนับพันเส้นทาง เจ้าสามารถกำหนดบทบาทที่จะให้ระบบจำลองทดสอบได้ แต่ทุกคำตอบจะแลกด้วยอายุขัยและความทรงจำ',
      choices: [
        { text: 'จำลองตนเป็นผู้พิทักษ์สำนัก', effects: [{ type: 'path', key: 'duty', value: 3 }, { type: 'relation', key: 'master', value: 10 }], effect: s => { s.flags.simulationRole = 'guardian'; addLog('ระบบจำลองบันทึกบทบาทผู้พิทักษ์สำนักไว้เป็นเส้นทางหลัก', true); } },
        { text: 'จำลองตนเป็นจอมยุทธ์พเนจร', effects: [{ type: 'path', key: 'freedom', value: 3 }], effect: s => { s.flags.simulationRole = 'wanderer'; addLog('ภาพอนาคตพาเจ้าออกนอกกำแพงสำนัก สู่เส้นทางที่ไม่มีใครกำหนด', true); } },
        { text: 'จำลองตนเป็นผู้ค้นความจริง', effects: [{ type: 'path', key: 'insight', value: 3 }], effect: s => { s.flags.simulationRole = 'truth-seeker'; addLog('เจ้าจดจำร่องรอยในอนาคตเพื่อไล่ตามต้นเหตุของหายนะ', true); } }
      ]
    },
    story_revenge_intro: {
      id: 'story_revenge_intro', characterId: 'revenant', activity: 'train', minMonth: 0,
      title: 'คำสาบานก่อนสิ้นใจ', text: 'ชีวิตแรกของเจ้าถูกบีบให้เดินเข้าสู่ความตาย แต่เสียงในใจกลับไม่ยอมดับ หากเกิดใหม่ได้ เจ้าจะเลือกสิ่งใดติดตัวไปกับร่างใหม่',
      choices: [
        { text: 'เก็บรายชื่อผู้แค้นไว้ในความทรงจำ', effects: [{ type: 'flag', key: 'revengeLedger', value: true }, { type: 'path', key: 'insight', value: 2 }], effect: s => addLog('รายชื่อศัตรูถูกสลักไว้ในความทรงจำของวิญญาณ', true) },
        { text: 'เก็บความเมตตาไว้ ไม่กลายเป็นคนแบบพวกมัน', effects: [{ type: 'flag', key: 'revengeMercy', value: true }, { type: 'path', key: 'compassion', value: 3 }], effect: s => addLog('แม้ต้องล้างแค้น เจ้าจะไม่ยอมสูญเสียหัวใจของตนเอง', true) }
      ]
    },
    story_dynasty_intro: {
      id: 'story_dynasty_intro', characterId: 'dynasty-heir', activity: 'rest', minMonth: 0,
      title: 'ทารกใต้ธงตระกูล', text: 'เจ้าลืมตาขึ้นในตระกูลที่กำลังร่วงโรย ทุกชีวิตที่ผ่านไปจะฝากทรัพย์สิน ศัตรู และชื่อเสียงไว้ให้ทายาทรุ่นต่อไป',
      choices: [
        { text: 'วางรากฐานเศรษฐกิจของตระกูล', effects: [{ type: 'flag', key: 'dynastyCommerce', value: true }, { type: 'stat', path: 'hero.money', value: 12 }], effect: s => addLog('ตระกูลเริ่มฟื้นจากบัญชีการค้าและเส้นทางคาราวาน', true) },
        { text: 'วางรากฐานกำลังยุทธ์', effects: [{ type: 'flag', key: 'dynastyMartial', value: true }, { type: 'stat', path: 'hero.powerBonus', value: 25 }], effect: s => addLog('ตระกูลเปิดหอฝึกเล็ก ๆ เพื่อรวบรวมผู้มีพรสวรรค์', true) }
      ]
    },
    story_isekai_intro: {
      id: 'story_isekai_intro', characterId: 'isekai-underdog', activity: 'rest', minMonth: 0,
      title: 'เกิดใหม่ในร่างสวะ', text: 'โลกใหม่ไม่ได้ต้อนรับเจ้า เด็กคนนี้ถูกเรียกว่าสวะ ถูกทิ้งไว้ใต้ชายคา และไม่มีใครเชื่อว่าจะลุกขึ้นได้',
      choices: [
        { text: 'อดทนสะสมความรู้เงียบ ๆ', effects: [{ type: 'flag', key: 'isekaiKnowledge', value: true }, { type: 'path', key: 'insight', value: 2 }], effect: s => addLog('เจ้าซ่อนความทรงจำจากโลกเดิมไว้ แล้วเริ่มอ่านทุกตำราในบ้าน', true) },
        { text: 'ประกาศว่าจะปีนขึ้นไปเหนือทุกคน', effects: [{ type: 'flag', key: 'isekaiDefiance', value: true }, { type: 'path', key: 'freedom', value: 2 }, { type: 'stat', path: 'hero.powerBonus', value: 10 }], effect: s => addLog('คำดูถูกกลายเป็นเชื้อไฟก้อนแรกของชีวิตใหม่', true) }
      ]
    },
    story_revenge_trial: {
      id: 'story_revenge_trial', characterId: 'revenant', activity: 'explore', minMonth: 12,
      title: 'เงาของศัตรูในชีวิตก่อน', text: 'ร่องรอยของคนที่เคยสังหารเจ้าในชีวิตก่อนปรากฏขึ้นอีกครั้ง คราวนี้เจ้ามีเวลาเลือกว่าจะเสี่ยงเปิดเผยตัวหรือสะสมกำลังต่อ',
      choices: [
        { text: 'ตามรอยทันที', conditions: { flag: { key: 'revengeLedger', value: true } }, locked: 'ต้องรักษาบัญชีแค้นไว้ตั้งแต่ชีวิตแรก', effect: s => { s.flags.revengeTargetFound = true; s.hero.powerBonus += 35; addLog('เจ้าเห็นตราประทับเดิมบนอาวุธของศัตรู และรู้ว่าการเกิดใหม่ไม่ใช่เรื่องบังเอิญ', true); } },
        { text: 'สะสมกำลังและรอวันเอาคืน', effects: [{ type: 'stat', path: 'hero.cultivation', value: 30 }, { type: 'path', key: 'insight', value: 2 }], effect: s => addLog('เจ้ายอมปล่อยศัตรูผ่านไปชั่วคราว เพื่อให้การแก้แค้นครั้งเดียวจบสิ้น') },
        { text: 'เปิดเผยตัว ล่อศัตรูให้ฆ่าเพื่อเริ่มชีวิตใหม่', conditions: { flag: { key: 'revengeLedger', value: true } }, note: 'จบชีวิตปัจจุบันและเกิดใหม่เป็นทารกในร่างใหม่', effect: s => { s.hero.health = 0; endGame('death_battle', { cause: 'ยอมสละชีวิตเพื่อรักษาร่องรอยของศัตรูและเริ่มการล้างแค้นในร่างใหม่' }); } }
      ]
    },
    story_dynasty_council: {
      id: 'story_dynasty_council', characterId: 'dynasty-heir', activity: 'work', minMonth: 12,
      title: 'สภาทายาท', text: 'ผู้ใหญ่ในตระกูลเริ่มถามว่ารุ่นของเจ้าจะพาตระกูลไปทางใด ทุกคำตอบจะกลายเป็นมรดกที่ทายาทรุ่นต่อไปต้องแบก',
      choices: [
        { text: 'ขยายการค้าและพันธมิตร', conditions: { flag: { key: 'dynastyCommerce', value: true } }, effects: [{ type: 'faction', key: 'jianghu', value: 5 }, { type: 'stat', path: 'hero.money', value: 18 }], effect: s => addLog('ตระกูลเริ่มมีเส้นทางค้าขายที่ไม่มีสำนักใดกล้าขวาง', true) },
        { text: 'รวบรวมยอดฝีมือเข้าตระกูล', conditions: { flag: { key: 'dynastyMartial', value: true } }, effects: [{ type: 'stat', path: 'hero.powerBonus', value: 60 }, { type: 'faction', key: 'sect', value: 3 }], effect: s => addLog('หอฝึกของตระกูลกลายเป็นที่รวมตัวของคนหนุ่มสาวผู้มีความทะเยอทะยาน', true) }
      ]
    },
    story_isekai_awakening: {
      id: 'story_isekai_awakening', characterId: 'isekai-underdog', activity: 'train', minMonth: 12,
      title: 'วันที่สวะลุกขึ้น', text: 'คนที่เคยรังแกเจ้าพบว่าร่างกายของสวะเริ่มแข็งแกร่งขึ้น พวกเขายื่นข้อเสนอให้ก้มหัวหรือพิสูจน์ตัวเองต่อหน้าทุกคน',
      choices: [
        { text: 'รับการประลองต่อหน้าทุกคน', effects: [{ type: 'stat', path: 'hero.powerBonus', value: 50 }, { type: 'path', key: 'duty', value: 1 }], effect: s => { s.flags.isekaiProven = true; addLog('เด็กที่เคยถูกเรียกว่าสวะยืนหยัดได้ด้วยกำลังของตนเอง', true); } },
        { text: 'เก็บไพ่ตายไว้และออกเดินทาง', effects: [{ type: 'stat', path: 'hero.combat.agility', value: 3 }, { type: 'path', key: 'freedom', value: 3 }], effect: s => { s.flags.isekaiWanderer = true; addLog('เจ้าไม่ต้องการคำยอมรับจากคนเดิมอีกต่อไป จึงเลือกสร้างชื่อในโลกกว้าง'); } }
      ]
    },
    story_dream_final: {
      id: 'story_dream_final', characterId: 'dream-walker', activity: 'train', month: 120,
      title: 'อนาคตที่เลือกเอง', text: 'ผลึกจำลองแตกร้าว เหลือเพียงเส้นทางหนึ่งที่ยังไม่ดับ เจ้าจะยอมรับบทบาทที่คำนวณไว้ หรือทำลายแบบจำลองแล้วเดินด้วยเจตจำนงของตนเอง',
      choices: [
        { text: 'ทำตามบทบาทที่จำลองว่าประสบความสำเร็จ', effects: [{ type: 'flag', key: 'simulationCompleted', value: true }], effect: s => endGame('guardian', { characterStory: { seal: '夢', title: 'ผู้เลือกอนาคต', quote: '“อนาคตที่ดีที่สุดไม่ใช่อนาคตที่คำนวณได้ แต่คืออนาคตที่เรายอมรับผลของมัน”', story: `บทบาท “${s.flags.simulationRole || 'ผู้ค้นความจริง'}” พา ${s.hero.name} ผ่านอนาคตที่เป็นไปได้หลายพันเส้นทาง ก่อนเลือกเส้นทางที่สร้างผลลัพธ์สูงสุดและรับรางวัลจากหอคัมภีร์` } }) },
        { text: 'ทำลายผลึกและสร้างอนาคตใหม่', effects: [{ type: 'path', key: 'freedom', value: 4 }], effect: s => endGame('wanderer_lone', { characterStory: { seal: '破', title: 'ผู้ทำลายคำทำนาย', quote: '“การจำลองบอกได้ว่าอะไรอาจเกิดขึ้น แต่ไม่มีสิทธิ์บอกว่าเราต้องเป็นใคร”', story: `${s.hero.name} ทำลายผลึกทั้งหมดและออกจากหอคัมภีร์ ไม่มีรางวัลใดจากอนาคตที่คำนวณไว้ แต่ทุกก้าวหลังจากนั้นเป็นของตนเอง` } }) }
      ]
    },
    story_revenge_final: {
      id: 'story_revenge_final', characterId: 'revenant', activity: 'explore', month: 120,
      title: 'บัญชีแค้นหน้าสุดท้าย', text: 'ศัตรูจากชีวิตแรกปรากฏตัวในฐานะผู้มีอำนาจสูงสุด เจ้าจำทุกความเจ็บปวดได้ แต่ครั้งนี้มีทั้งความทรงจำและร่างกายใหม่อยู่ในมือ',
      choices: [
        { text: 'ชำระบัญชีด้วยมือของตนเอง', conditions: { flag: { key: 'revengeTargetFound', value: true } }, locked: 'ต้องตามรอยศัตรูให้พบก่อน', effects: [{ type: 'flag', key: 'revengeComplete', value: true }], effect: s => endGame('guardian', { characterStory: { seal: '仇', title: 'ผู้ล้างแค้นเหนือกาล', quote: '“ข้าไม่ได้เกิดใหม่เพื่อหนีความตาย แต่เพื่อคืนความจริงให้ทุกชีวิตที่ถูกพรากไป”', story: `${s.hero.name} ปิดบัญชีแค้นของชีวิตแรกลงได้โดยไม่ปล่อยให้ความแค้นกลืนหัวใจ ความตายหลายครั้งกลายเป็นบันไดสู่ชัยชนะครั้งเดียว` } }) },
        { text: 'ปล่อยวางและตัดวงจรแค้น', effects: [{ type: 'path', key: 'compassion', value: 4 }], effect: s => endGame('wanderer_exodus', { characterStory: { seal: '慈', title: 'ผู้ชนะโดยไม่ฆ่า', quote: '“การแก้แค้นที่ยิ่งใหญ่ที่สุด คือการไม่ยอมให้ศัตรูกำหนดว่าข้าจะกลายเป็นใคร”', story: `${s.hero.name} เลือกตัดวงจรความแค้นและพาผู้รอดชีวิตออกจากเงามืด ชีวิตก่อนหน้านี้ไม่สูญเปล่า เพราะมันทำให้เจ้ารู้ว่าความเมตตาต้องใช้ความกล้าเพียงใด` } }) }
      ]
    },
    story_dynasty_final: {
      id: 'story_dynasty_final', characterId: 'dynasty-heir', activity: 'work', month: 120,
      title: 'ธงตระกูลเหนือเมือง', text: 'หลังผ่านมือทายาทหลายรุ่น ตระกูลมีโอกาสผงาดขึ้นเป็นหนึ่งในอำนาจหลักของยุทธภพ แต่การผงาดต้องแลกด้วยการตัดสินใจสุดท้าย',
      choices: [
        { text: 'ประกาศตระกูลเป็นพันธมิตรของผู้คน', conditions: { statMin: { path: 'lineageState.prestige', value: 80 } }, locked: 'ชื่อเสียงตระกูลยังไม่ถึง 80', effect: s => endGame('guardian', { characterStory: { seal: '門', title: 'ตระกูลผงาด', quote: '“คนหนึ่งชีวิตอาจดับลง แต่ชื่อของตระกูลอยู่ได้ด้วยสิ่งที่ส่งต่อให้คนรุ่นหลัง”', story: `ทายาทรุ่นที่ ${s.lineageState.generation} ชูธงตระกูลเหนือเมือง ตระกูลไม่ได้ผงาดเพราะคนใดคนหนึ่ง แต่เพราะทุกชีวิตก่อนหน้าฝากรากฐานไว้ไม่ขาดสาย` } }) },
        { text: 'ขายอำนาจตระกูลเพื่อความอยู่รอด', effect: s => endGame('outlaw', { characterStory: { seal: '散', title: 'ตระกูลที่เลือกอยู่รอด', quote: '“ชื่อเสียงไม่อาจเลี้ยงคนตาย ความอยู่รอดจึงเป็นมรดกอีกแบบหนึ่ง”', story: `ตระกูลยอมลดธงและแลกอำนาจกับเส้นทางปลอดภัย ผู้คนอาจลืมชื่อของพวกเจ้า แต่ทายาทยังมีชีวิตให้เริ่มต้นใหม่` } }) }
      ]
    },
    story_isekai_final: {
      id: 'story_isekai_final', characterId: 'isekai-underdog', activity: 'train', month: 120,
      title: 'เหนือคำว่าสวะ', text: 'คนที่เคยเหยียดหยามเจ้าคุกเข่าอยู่เบื้องหน้า โลกทั้งใบกำลังรอฟังว่าเด็กที่ถูกทิ้งจะใช้พลังที่ได้มาอย่างไร',
      choices: [
        { text: 'ยึดอำนาจและบังคับให้ทุกคนยอมรับ', effects: [{ type: 'path', key: 'duty', value: 2 }], effect: s => endGame('guardian', { characterStory: { seal: '天', title: 'ผู้เหนือคำดูแคลน', quote: '“จากสวะสู่ยอดคน ไม่มีใครมอบตำแหน่งนี้ให้ ข้าจึงจะเป็นคนกำหนดความหมายของมันเอง”', story: `${s.hero.name} ยืนเหนือคนที่เคยหัวเราะเยาะ ร่างสวะกลายเป็นชื่อที่ทุกสำนักต้องกล่าวถึง แม้ไม่มีใครกล้าดูถูกอีกต่อไป` } }) },
        { text: 'เปิดทางให้คนที่ถูกกดขี่รุ่นต่อไป', effects: [{ type: 'path', key: 'compassion', value: 4 }], effect: s => endGame('wanderer_exodus', { characterStory: { seal: '新', title: 'ผู้เปิดประตูให้คนรุ่นใหม่', quote: '“ข้าไม่ได้ปีนขึ้นมาเพื่อยืนเหนือคนอื่น แต่เพื่อดึงคนที่ถูกทิ้งขึ้นมาด้วยกัน”', story: `${s.hero.name} เปลี่ยนบ้านที่เคยเรียกเจ้าว่าสวะให้กลายเป็นสถานที่รับผู้ถูกทอดทิ้งจากทั่วโลกใหม่ และเริ่มยุคของผู้ไม่มีใครเลือก` } }) }
      ]
    }
  };

  const EVENTS = {
    fallenHouse: {
      month: 0, tag: 'ปฐมบท · อายุ 5 ขวบ', art: 'gate', title: 'คืนตระกูลหลินล่มสลาย',
      text: 'กลางดึก เสียงเหล็กกระทบกันดังจากเรือนหน้า เปลวไฟลามถึงชายคาห้องนอน บิดาผลักเจ้าเข้าใต้เตียงก่อนประตูจะถูกถีบแตก บนแขนของคนชุดดำมีรอยสักงูพันเมฆ—ภาพสุดท้ายก่อนทุกอย่างกลายเป็นควัน',
      choices: [
        { text: 'คลานฝ่าควันไปหาลุงโจว คนรับใช้เก่าแก่', note: 'เปิดเส้นทางคนรับใช้ผู้ภักดี ลุงโจวจะร่วมเดินทางด้วย', effect: s => { s.flags.loyalRetainer = true; s.flags.retainerAlive = true; s.hero.health -= 14; s.relations.master += 2; addLog('ลุงโจวอุ้มเจ้าฝ่ากำแพงหลังเรือน เขาสาบานจะรักษาทายาทคนสุดท้ายด้วยชีวิต', true); } },
        { text: 'ลอดช่องระบายน้ำ หนีออกไปเพียงลำพัง', note: 'เปิดเส้นทางเด็กเร่ร่อน (จะไม่ได้เดินทางกับลุงโจว)', effect: s => { s.flags.loneWanderer = true; s.flags.retainerAlive = false; s.flags.escapePrepared = true; s.hero.health -= 8; s.hero.money += 2; addLog('เด็กห้าขวบเดินออกจากเมืองที่กำลังไหม้โดยไม่มีใครจับมือ', true); } },
        { text: 'ซ่อนตัวดูหน้าผู้สั่งฆ่าให้ชัด', note: 'อันตรายมาก แต่จำตรางูดำและเสียงหัวหน้าคนร้ายได้ (ลุงโจวพลัดหลง)', effect: s => { s.flags.houseEnemyKnown = true; s.flags.familyToken = true; s.flags.retainerAlive = false; s.hero.health -= 24; s.paths.insight += 1; addTreasure(s, 'ป้ายหยกตระกูลหลิน', {}); addLog('เจ้าจำเสียงของชายหน้ากากและกำป้ายหยกของมารดาไว้จนเลือดซึมมือ', true); } }
      ]
    },
    firstRoad: {
      month: 12, tag: 'วัยเด็ก · หนึ่งปีหลังบ้านแตก', title: 'ทางแยกใต้ฝนหนาว',
      text: 'หนึ่งปีแห่งการหลบหนีทำให้เจ้าไม่เหมือนเด็กทั่วไป ข่าวประกาศตามหาทายาทหลินติดอยู่ทุกประตูเมือง ถนนสายหนึ่งทอดไปยังชุมชนคนไร้บ้านที่ไม่มีใครถามชื่อใคร',
      choices: [
        {
          text: 'เดินทางกับลุงโจวในฐานะหลานพ่อค้าเร่',
          note: 'เส้นทางผู้ภักดี: ได้รับการปกป้องและฝึกพื้นฐาน',
          requires: s => s.flags.retainerAlive,
          locked: 'เจ้าไม่ได้หนีมากับลุงโจวตั้งแต่คืนบ้านแตก',
          effect: s => { s.flags.loyalRetainer = true; s.hero.powerBonus += 25; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 18); s.hero.money += 6; addLog('ลุงโจวสอนอ่านบัญชี ซ่อนมีด และไม่ไว้ใจป้ายประกาศของทางการ', true); }
        },
        {
          text: 'แยกไปอยู่กับเด็กเร่ร่อน เปลี่ยนชื่อและลบร่องรอย',
          note: 'เส้นทางเร่ร่อน: อิสระ เอาตัวรอดลำพัง',
          effect: s => { s.flags.loneWanderer = true; s.flags.retainerAlive = false; s.hero.powerBonus += 15; s.hero.money += 9; s.hero.reputation -= 3; addLog('เจ้าหายเข้าไปในตรอกเมืองท่า เรียนรู้ว่าความหิวสอนคนได้เร็วกว่าตำรา', true); }
        },
        {
          text: 'ช่วยเด็กอีกคนที่ถูกมือปราบไล่จับ',
          note: 'เสียทรัพยากร แต่ได้สหายวัยเด็กและเบาะแสโลกใต้ดิน',
          effect: s => { s.hero.money = Math.max(0, s.hero.money - 3); s.hero.health -= 6; s.hero.reputation += 4; s.paths.compassion += 1; s.flags.underworldContact = true; addLog('เด็กชื่ออาเถารอดไปได้ และมอบสัญลักษณ์ตลาดมืดให้เจ้าก่อนแยกทาง', true); }
        }
      ]
    },
    growingStep: {
      month: 24, tag: 'วัยเด็ก · สองปีแห่งการเรียนรู้', art: 'gate', title: 'ก้าวแรกของชีวิตใหม่',
      dynamicText: s => s.flags.retainerAlive
        ? 'สองปีหลังบ้านแตก ลุงโจวพาเจ้ามาซ่อนตัวในเรือนเช่าเล็ก ๆ ชายชราหาบน้ำทำงานหนักเพื่อหาข้าวต้มให้เจ้าทุกวัน วันนี้เขาถามเจ้าว่าพร้อมจะเริ่มเรียนรู้สิ่งใดสำหรับชีวิตข้างหน้า'
        : s.flags.loneWanderer
        ? 'สองปีในตรอกของเด็กเร่ร่อน เจ้าเติบโตขึ้นด้วยความว่องไวและสายตาที่ระแวดระวัง ในเมืองท่ามีหลายทางรอดให้เด็กคนหนึ่งเลือกหยิบจับ'
        : 'สองปีแห่งความเงียบงัน เจ้ากำป้ายหยกและรอยตราในความทรงจำไว้แน่น วันนี้ชีวิตในชุมชนชานเมืองเริ่มมีทางแยกให้เจ้าเลือกก้าวเดิน',
      choices: [
        {
          text: 'เรียนอ่านตัวอักษรและช่วยงานร้านยา/ช่างฝีมือ',
          note: 'ปูพื้นฐานปัญญาและทักษะสุจริต (เพิ่มความรู้และสุขภาพ)',
          effect: s => {
            s.paths.insight += 2;
            s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 8);
            s.hero.attributes = s.hero.attributes || {};
            s.hero.attributes.intellect = (s.hero.attributes.intellect || 10) + 1;
            addLog('เจ้าหัดคัดอักษรและจำชื่อสมุนไพรพื้นฐาน ความรู้คือเกราะกำบังที่ไม่ต้องถือดาบ', true);
          }
        },
        {
          text: 'ฝึกยืดเส้นสาย วิ่งส่งของ และทำงานใช้แรงกาย',
          note: 'ปูพื้นฐานร่างกายและความคล่องแคล่วตามวัยเด็ก',
          effect: s => {
            s.hero.combat = s.hero.combat || {};
            s.hero.combat.body = (s.hero.combat.body || 0) + 1;
            s.hero.combat.agility = (s.hero.combat.agility || 0) + 1;
            s.hero.money += 4;
            addLog('เจ้าช่วยงานขนส่งรอบตลาด ร่างกายแข็งแรงขึ้นตามวัยและได้รับเบี้ยเล็กน้อย', true);
          }
        },
        {
          text: 'ซ่อนตัว สังเกตผู้คน และจำเส้นทางหลบหนีในเมือง',
          note: 'เตรียมทางรอดและระแวดระวังตัว',
          effect: s => {
            s.paths.freedom += 2;
            s.flags.escapePrepared = true;
            s.hero.reputation = (s.hero.reputation || 0) + 1;
            addLog('เจ้าจดจำตรอกซอกซอยและทางระบายน้ำไว้ในใจ ไม่มีใครรู้ว่าเจ้าอยู่ที่ใดอย่างแท้จริง', true);
          }
        }
      ]
    },
    // แก้ไขพล็อตลุงโจว: ปรับข้อความและตัวเลือกตามสถานะ retainerAlive อย่างถูกต้อง
    winterChild: {
      month: 36, tag: 'วัยเด็ก · ฤดูหนาวปีที่สาม', title: 'ข้าวหนึ่งชามกับชีวิตหนึ่งคน',
      dynamicText: s => s.flags.retainerAlive
        ? 'หิมะปิดถนน เสบียงเหลือเพียงชามเดียว ลุงโจวได้รับบาดเจ็บจากการล่อมือสังหารออกไป ขณะเดียวกันเด็กข้างถนนหลายคนอดอาหาร ไม่มีคำตอบใดช่วยทุกคนได้'
        : 'หิมะปิดถนน เสบียงเหลือเพียงชามเดียว ในตรอกหนาวเหน็บ เด็กเร่ร่อนหลายคนนอนขดตัวสั่นเทาโดยไร้ผ้าห่ม ความหิวโหยเริ่มกัดกินสติของทุกคน',
      choices: [
        {
          dynamicText: s => s.flags.retainerAlive ? 'แบ่งข้าวและยาให้ลุงโจวกับเด็ก ๆ' : 'แบ่งข้าวและผ้าห่มให้เด็กเร่ร่อนที่อ่อนแอกว่า',
          note: 'ช่วยผู้อื่น แต่เจ้าจะอ่อนแอและเสียเงินทั้งหมด',
          effect: s => {
            s.hero.money = 0; s.hero.health -= 18; s.hero.reputation += 8;
            if (s.flags.retainerAlive) {
              addLog('เจ้าหิวจนหมดสติ แต่ทุกคนผ่านคืนนั้นมาได้ ลุงโจวไม่เคยลืมน้ำใจนี้', true);
            } else {
              addLog('เจ้าสละอาหารให้เพื่อนร่วมตรอก แม้ท้องจะกิ่ว แต่เด็ก ๆ ต่างมองเจ้าเป็นผู้นำ', true);
            }
          }
        },
        {
          text: 'ขโมยเสบียงจากคฤหาสน์นายอำเภอ',
          note: 'รอดแน่ แต่ชื่อเสียงลดและเริ่มคุ้นเคยกับทางมืด',
          effect: s => { s.hero.money += 16; s.hero.health += 10; s.hero.reputation -= 10; s.flags.escapePrepared = true; s.flags.darkPastFromChildhood = true; addLog('เจ้ารอดฤดูหนาวจากของที่ขโมยมา และพบตรางูดำบนหีบของนายอำเภอ', true); }
        },
        {
          text: 'ตามรอยมือสังหารเพื่อแลกข้อมูลกับอาหาร',
          note: 'ได้เบาะแสตระกูล แต่เสี่ยงภัยอย่างยิ่ง',
          effect: s => {
            s.flags.houseEnemyKnown = true; s.hero.money += 8; s.hero.powerBonus += 20;
            if (s.flags.retainerAlive) {
              s.hero.health += 6; s.flags.retainerAlive = false; s.flags.retainerMissing = true;
              addLog('เมื่อเจ้ากลับมา ลุงโจวหายไป เหลือเพียงรอยเลือดและข้อความให้มุ่งหน้าสำนักเมฆาคราม', true);
            } else {
              addLog('เบาะแสชี้ว่าผู้ทำลายตระกูลเกี่ยวข้องกับคนในสำนักเมฆาคราม', true);
            }
          }
        }
      ]
    },
    caravanBeacon: {
      month: 48, tag: 'วัยเด็ก · เมืองหน้าด่าน', title: 'คาราวานแห่งทิศประจิม',
      text: 'หลังฤดูหนาว เจ้าลากสังขารมาถึงเมืองหน้าด่าน คาราวานจากทิศประจิมกำลังพักม้า พ่อค้าพูดถึงชายชุดดำที่ตามล่าเด็กตระกูลหลิน และสำนักเมฆาครามบนยอดเขาที่ไม่ยอมก้มหัวให้เงามืด',
      choices: [
        { text: 'ช่วยขนฟืนและเสบียงให้คาราวาน', note: 'ได้ค่าจ้างเล็กน้อยและรู้ทิศทางไปภูเขาเมฆาคราม', effect: s => { s.flags.caravanBeacon = true; s.flags.blueCloudRoute = true; s.hero.money += 3; s.hero.combat = s.hero.combat || {}; s.hero.combat.body = (s.hero.combat.body || 0) + 1; addLog('คาราวานชี้ทางขึ้นภูเขาเมฆาครามให้เจ้า แม้จะบอกได้เพียงเส้นทางหลัก', true); } },
        { text: 'ลอบขโมยอาหารและแผนที่จากพ่อค้า', note: 'ได้ของประทังชีวิต แต่ทิ้งร่องรอยให้คนทวงหนี้ตามกลิ่นมา', effect: s => { s.flags.caravanBeacon = true; s.flags.caravanTrace = true; s.flags.darkPastFromChildhood = true; s.hero.money += 6; s.hero.combat = s.hero.combat || {}; s.hero.combat.agility = (s.hero.combat.agility || 0) + 1; addLog('อาหารช่วยให้เจ้ารอด แต่รอยเท้าและแผนที่ที่หายไปทำให้มีคนเริ่มตามรอยเจ้า', true); } },
        { text: 'แอบฟังข่าวและช่วยเด็กพลัดหลงในขบวน', note: 'ไม่ได้เส้นทางเต็มรูปแบบ แต่ฝากน้ำใจไว้กับคนเดินทาง', effect: s => { s.flags.caravanBeacon = true; s.flags.caravanChildSaved = true; s.flags.blueCloudRumor = true; s.paths.compassion += 1; s.hero.reputation += 2; addLog('เด็กในคาราวานพาเจ้าไปชี้ยอดเขาเมฆาคราม และคำขอบคุณยังติดอยู่ในใจ', true); } }
      ]
    },
    oldDebt: {
      month: 60, tag: 'ปมอดีตหวนคืน', title: 'จดหมายที่รอมาห้าปี',
      dynamicText: s => {
        const tokenClue = s.flags.familyToken
          ? 'พร้อมตราครึ่งหนึ่งซึ่งเข้าคู่กับป้ายหยกตระกูลหลิน'
          : 'พร้อมตราครึ่งหนึ่งซึ่งตรงกับรอยตราที่เจ้าจำได้จากบ้านเก่า แม้ป้ายหยกจะไม่อยู่กับเจ้าแล้ว';
        return `จดหมายไร้นามระบุตำแหน่งหลุมศพปลอมของบิดา ภายในมีบันทึกว่า “งูดำซื้อคนในเมฆาครามแล้ว — ชื่อของอาจารย์เหวินจงอยู่ในบันทึกนี้ แต่ยังไม่มีหลักฐานว่าเป็นผู้ร่วมมือหรือผู้ถูกใส่ร้าย” ${tokenClue}${s.flags.caravanTrace ? ' รอยแผนที่ที่หายจากคาราวานทำให้เจ้ารู้ว่าคนทวงหนี้ตามมาถึงเมืองนี้ได้อย่างไร' : s.flags.blueCloudRoute || s.flags.blueCloudRumor ? ' ข่าวจากคาราวานยืนยันว่าทางขึ้นยอดเขาเมฆาครามมีอยู่จริง' : ''}`;
      },
      choices: [
        {
          text: 'ตามหาผู้ส่งและช่วยลุงโจว หากเขายังมีชีวิต',
          note: 'ความภักดีในอดีต: ลุงโจวจะกลับมาช่วยเจ้า',
          requires: s => s.flags.loyalRetainer && (s.flags.retainerAlive || s.flags.retainerMissing),
          locked: 'เจ้าไม่ได้มีสายสัมพันธ์หรือเบาะแสของลุงโจว',
          effect: s => { s.flags.retainerAlive = true; s.flags.retainerMissing = false; s.flags.houseEnemyKnown = true; s.hero.reputation += 6; s.hero.powerBonus += 30; addLog('จากรอยเลือดและเบาะแสที่สะสมมา เจ้าช่วยลุงโจวออกจากคุกลับ เขาเผยว่ามีคนในสำนักเมฆาครามช่วยผู้สั่งฆ่าปกปิดร่องรอย', true); }
        },
        {
          text: 'ขายตราครึ่งหนึ่งให้ตลาดมืด แล้วเดินทางต่อคนเดียว',
          note: 'ตัดอดีต ได้เงินมาก แต่สูญเสียหลักฐานสำคัญ',
          effect: s => { s.flags.loneWanderer = true; s.flags.retainerAlive = false; s.flags.familyToken = false; s.treasures = (s.treasures || []).filter(item => (typeof item === 'string' ? item : item.name) !== 'ป้ายหยกตระกูลหลิน'); s.hero.money += 28; s.hero.reputation -= 8; addLog('ป้ายหยกถูกขายเปลี่ยนมือ อดีตเบาลง แต่ความจริงก็ไกลออกไป', true); }
        },
        {
          text: 'เก็บหลักฐานและมุ่งหน้าสำนักเมฆาคราม',
          note: 'เปิดปมผู้บงการและเตรียมแฝงตัวเข้าสำนัก',
          effect: s => { s.flags.houseEnemyKnown = true; s.flags.familyToken = true; addTreasure(s, 'ป้ายหยกตระกูลหลิน', {}); s.flags.knowsTraitor = true; s.paths.insight += 2; addLog('เป้าหมายของเจ้าไม่ใช่เพียงฝึกตน แต่คือหาคนที่เปิดประตูให้ศัตรูในคืนนั้น', true); }
        }
      ]
    },
    foothills: {
      month: 72, tag: 'ระหว่างทาง · เชิงเขาเมฆา', title: 'ข่าวลือใต้เงาเมฆา',
      dynamicText: s => `สองปีหลังจากเรื่องหนี้เก่าผ่านไป เส้นทางของหลินอันมาถึงเมืองเชิงเขาเมฆา ที่นี่มีทั้งคนเตรียมสอบเข้าสำนัก คนทำมาหากินใต้เงาภูเขา และข่าวลือว่าสงครามกำลังขยับเข้ามาใกล้${s.flags.caravanTrace ? ' ชายชุดดำยังถามถึงแผนที่ที่หายไปจากคาราวาน' : ''}`,
      choices: [
        { text: 'เก็บเงินและเตรียมตัวสมัครเข้าสำนัก', note: 'เปิดเบาะแสการสอบและความสัมพันธ์กับผู้คนเชิงเขา', effect: s => { s.flags.foothillsPrepared = true; s.flags.blueCloudRoute = true; s.hero.money += 4; s.hero.reputation += 1; addLog('เจ้ารู้ว่าการเข้าสำนักไม่ได้มีเพียงประตูเดียว แต่ต้องมีทั้งเงิน ความพร้อม และคนรับรอง', true); } },
        { text: 'รับงานคุ้มกันชาวบ้านรอบเชิงเขา', note: 'ฝึกกายและสร้างชื่อในฐานะนักยุทธ์ก่อนเลือกเส้นทาง', effect: s => { s.flags.foothillsMartial = true; s.hero.health = Math.max(1, s.hero.health - 4); s.hero.combat = s.hero.combat || {}; s.hero.combat.body = (s.hero.combat.body || 0) + 2; s.hero.reputation += 3; addLog('ชาวบ้านเชิงเขาจำฝีมือของเจ้าได้ แม้ยังไม่มีใครเรียกเจ้าว่าผู้บำเพ็ญ', true); } },
        { text: 'ออกจากเมืองตามเส้นทางชายแดน', note: 'ปูทางผู้พเนจรและเปิดข้อมูลดินแดนใหม่', effect: s => { s.flags.foothillsDeparted = true; s.flags.escapePrepared = true; s.paths.freedom += 1; s.hero.money = Math.max(0, s.hero.money - 2); addLog('เจ้าซื้อเสบียงแล้วมองเลยยอดเขาไปยังถนนที่ไม่มีชื่อสำนักใดครอบครอง', true); } }
      ]
    },
    arrival: {
      month: 84, tag: 'อายุ 12 ปี · เหตุการณ์สำคัญ', art: 'gate', title: 'ก้าวแรกใต้เมฆาคราม',
      dynamicText: s => adaptiveDialogue(s, 'สำนักเมฆาครามเป็นเพียงสำนักระดับต่ำ ประมุขมีพลังราวขั้นสร้างรากฐาน ขั้น 1 และศิษย์นอกอยู่ขั้นหลอมกาย ศิษย์ในรวบรวมวิญญาณขั้น 1–5 ศิษย์เอกรวบรวมวิญญาณขั้น 6–9 ศิษย์สืบทอดควบแน่นวิญญาณขั้น 1–5 ส่วนอาจารย์และผู้อาวุโสอยู่ขั้นควบแน่นวิญญาณขั้น 6–9 อาจารย์เหวินมองเจ้าอยู่ครู่หนึ่ง ก่อนยื่นป้ายไม้ศิษย์นอกพร้อมเคล็ดรวบรวมปราณพื้นฐาน “ที่นี่ให้โอกาส แต่ไม่เคยรับรองชะตาของผู้ใด”'),
      choices: [
        { text: 'คำนับและขอคำชี้แนะเรื่องการฝึก', note: 'อาจารย์จดจำความมุ่งมั่นของเจ้า', effect: s => { s.relations.master += 12; s.hero.cultivation += 10; addLog('อาจารย์ชี้แนะจังหวะลมหายใจ ทำให้พื้นฐานมั่นคงขึ้น', true); } },
        { text: 'ช่วยศิษย์พี่ขนของเข้าสำนัก', note: 'เสียแรงเล็กน้อย แต่ได้รู้จักผู้คน', effect: s => { s.relations.senior += 14; s.hero.health -= 4; s.hero.money += 3; addLog('ศิษย์พี่เซี่ยหลันตอบแทนด้วยอาหารและตำลึงเล็กน้อย', true); } },
        { text: 'สำรวจทางหนีทีไล่รอบประตู', note: 'เริ่มต้นด้วยความระวังตัว', effect: s => { s.flags.escapePrepared = true; s.hero.reputation -= 2; addLog('เจ้าจดจำทางลับด้านกำแพงตะวันตกไว้เงียบ ๆ', true); } },
        { text: 'ปฏิเสธสำนัก กลับไปสร้างชีวิตธรรมดา', note: 'เปิดเส้นทางงาน บ้าน และครัวเรือน — ไม่เปิดรากวิญญาณหรือปราณ', effect: s => { s.flags.linAnRoute = 'mortal-peace'; s.flags.sectDeclined = true; s.hero.cultivationAccess = false; s.paths.compassion += 1; addLog('หลินอันคำนับขอบคุณ แต่เลือกกลับไปสร้างชายคาที่ตนดูแลได้จริง', true); } },
        { text: 'ปฏิเสธสำนัก ฝึกกายเป็นนักยุทธ์พเนจร', note: 'เปิดเส้นทางฝึกกาย/วิชาต่อสู้ — ยังไม่เข้าสู่การบำเพ็ญ', effect: s => { s.flags.linAnRoute = 'nameless-martial'; s.flags.sectDeclined = true; s.hero.cultivationAccess = false; s.paths.freedom += 2; addLog('หลินอันเลือกฝึกกายและฝีมือด้วยตนเอง ไม่ขอรับเคล็ดรวบรวมปราณ', true); } },
        { text: 'ออกเดินทางไปดินแดนใหม่', note: 'เปิดเส้นทางเดินทาง เสบียง เมืองใหม่ และการตัดอดีต', effect: s => { s.flags.linAnRoute = 'new-land'; s.flags.sectDeclined = true; s.hero.cultivationAccess = false; s.flags.escapePrepared = true; s.paths.freedom += 2; addLog('หลินอันหันหลังให้ประตูสำนัก แล้วเลือกถนนที่ไม่มีใครรู้จักชื่อของตน', true); } },
        { text: 'ปฏิเสธสำนัก เข้าสู่เครือข่ายใต้ดิน', note: 'เลือกเส้นทางค้าข่าวและงานเสี่ยง แลกเงินกับชื่อเสียงและความปลอดภัย', effect: s => { s.flags.linAnRoute = 'underworld'; s.flags.sectDeclined = true; s.hero.cultivationAccess = false; s.paths.freedom += 2; addLog('หลินอันหันไปหาคนที่ทำมาหากินอยู่ใต้กฎหมายของเมือง', true); } }
      ]
    },
    wounded: {
      month: 88, tag: 'เหตุการณ์', title: 'ศิษย์ร่วมรุ่นผู้บาดเจ็บ',
      text: 'ระหว่างกลับจากป่าหลังเขา เจ้าพบเฉินหยู ศิษย์ร่วมรุ่นนอนบาดเจ็บอยู่ข้างทาง รอยกรงเล็บสีดำบนแขนของเขาไม่เหมือนสัตว์ป่าทั่วไป',
      choices: [
        { text: 'ใช้สมุนไพรช่วยรักษาและพากลับสำนัก', note: 'ใช้ 6 ตำลึง หรือเสียสุขภาพหากเงินไม่พอ', effect: s => { if (s.hero.money >= 6) s.hero.money -= 6; else s.hero.health -= 12; s.relations.friend += 25; s.flags.helpedFriend = true; addLog('เฉินหยูรอดชีวิต เขาติดค้างบุญคุณเจ้าครั้งใหญ่', true); } },
        { text: 'สอบถามต้นตอของรอยแผลก่อน', note: 'อาจได้ข้อมูล แต่เขาจะจดจำความลังเล', effect: s => { s.flags.knowsTraitor = true; s.relations.friend += 5; s.hero.reputation += 2; addLog('ก่อนหมดสติ เฉินหยูเอ่ยถึงชายสวมหน้ากากกับตรางูดำ', true); } },
        { text: 'รีบกลับไปแจ้งสำนัก ไม่เสี่ยงแตะต้อง', note: 'ปลอดภัยกว่า แต่ช้าเกินช่วยเขา', effect: s => { s.relations.master += 4; s.relations.friend -= 18; s.hero.reputation += 4; addLog('หน่วยลาดตระเวนมาถึงช้า เฉินหยูหายตัวไปจากป่า', true); } }
      ]
    },
    manual: {
      month: 93, tag: 'เหตุการณ์สำคัญ', title: 'คัมภีร์ในหอฝุ่น',
      text: 'หลังฝึกเคล็ดรวบรวมปราณพื้นฐานมาระยะหนึ่ง สำนักอนุญาตให้ศิษย์เลือกวิชาเฉพาะทางได้หนึ่งแขนง วิชาแต่ละสายเปลี่ยนแนวทางเติบโตอย่างชัดเจน',
      choices: [
        { text: 'เลือก “กระบี่ธารไหล”', note: 'สายโจมตี: โจมตี +6', effect: s => { s.flags.swordLearned = true; s.relations.master += 8; addLog('คมกระบี่ของเจ้าลื่นไหลดั่งสายน้ำ', true); } },
        { text: 'เลือก “ม่านเมฆคุ้มกาย”', note: 'สายป้องกัน: ป้องกัน +8', effect: s => { s.flags.shieldLearned = true; s.relations.senior += 6; addLog('ม่านปราณบางเบารับแรงกระแทกแทนร่างของเจ้า', true); } },
        { text: 'เลือก “กายาพยัคฆ์หิน”', note: 'สายร่างกาย: กายา +8 ป้องกัน +3', effect: s => { s.flags.bodyLearned = true; s.hero.maxHealth += 12; s.hero.health += 12; addLog('เลือดลมหนักแน่น กล้ามเนื้อและกระดูกแข็งดุจศิลา', true); } },
        { text: 'เลือก “โคจรปราณเก้าชีพจร”', note: 'สายบำเพ็ญ: ความเร็วฝึกตน +22%', effect: s => { s.flags.cultivationLearned = true; s.relations.master += 4; addLog('เส้นทางโคจรใหม่ทำให้การดูดซับปราณเร็วขึ้นมาก', true); } }
      ]
    },
    sectSparring: {
      month: 100, tag: 'ชีวิตในสำนัก · ลานไผ่', title: 'มิตรภาพใต้เงาไผ่',
      text: 'ก่อนข่าวสงครามจะกลบทุกเสียง สำนักจัดการประลองคัดเลือกในลานไผ่ ศิษย์พี่เซี่ยหลันวางค่ายกลทดสอบ ส่วนเฉินหยูส่งเสียงเชียร์อยู่ข้างสนาม นี่อาจเป็นวันที่สงบสุขที่สุดก่อนพายุมาเยือน',
      choices: [
        { text: 'ทุ่มสุดกำลัง ประลองเพื่อศักดิ์ศรี', note: 'ชื่อเสียงสำนักและความไว้วางใจจากศิษย์พี่เพิ่มขึ้น', effect: s => { s.flags.sectSparringWon = true; s.flags.sectSparringWitnessed = true; s.relations.senior += 10; s.hero.powerBonus += 20; addLog('เจ้าชนะการประลองอย่างสง่างาม ชื่อของเจ้าถูกพูดถึงทั่วลานไผ่', true); } },
        { text: 'ยับยั้งกระบวนท่า ชี้แนะจุดบกพร่องให้เฉินหยู', note: 'เฉินหยูฝากของแทนใจไว้ ซึ่งช่วยให้ถอยจากดักซุ่มได้ดีขึ้น', effect: s => { s.flags.friendKeepsake = true; s.flags.sectSparringMercy = true; s.paths.compassion += 1; s.relations.friend += 14; addTreasure(s, 'ถุงขนมเมฆา', { restHealth: 4, restQi: 3 }); addLog('เฉินหยูจำคำชี้แนะของเจ้าไว้ และมอบถุงขนมเมฆาเป็นของแทนใจ', true); } },
        { text: 'ซ่อนเร้นฝีมือ หาจังหวะพลิกแพลงตามใจ', note: 'เก็บไพ่ตายไว้ แลกกับชื่อเสียงที่ไม่โดดเด่น', effect: s => { s.flags.sparringRead = true; s.paths.insight += 2; s.paths.freedom += 1; s.relations.senior += 3; addLog('เจ้าจบการประลองโดยไม่มีใครอ่านทางได้หมด เหลือเพียงความลับในใจ', true); } }
      ]
    },
    trader: {
      month: 98, tag: 'ข่าวลือจากโลกภายนอก', title: 'พ่อค้าใต้แสงตะเกียง',
      text: 'พ่อค้าเร่จากชายแดนเสนอขายแผนที่เก่าซึ่งทำเครื่องหมายอุโมงค์ใต้สำนัก เขายืนยันว่ากองโจรงูดำกำลังรวบรวมคน แต่ราคาของข้อมูลคือทุกอย่างที่เจ้ามีเกือบทั้งหมด',
      choices: [
        { text: 'ซื้อแผนที่ในราคา 18 ตำลึง', requires: s => s.hero.money >= 18, locked: 'ต้องมี 18 ตำลึง', effect: s => { s.hero.money -= 18; s.flags.foundMap = true; s.flags.escapePrepared = true; addLog('แผนที่เผยทั้งทางลับเข้าคลังและเส้นทางออกจากเขา', true); } },
        { text: 'ต่อรองด้วยข้อมูลที่เจ้ารู้', requires: s => s.flags.knowsTraitor || s.flags.underworldContact || s.hero.reputation >= 10, locked: 'ต้องมีข้อมูลจากเบาะแส โลกใต้ดิน หรือชื่อเสียง 10', effect: s => { s.flags.foundMap = true; s.hero.reputation += 3; addLog('พ่อค้ายอมแลกแผนที่กับข่าวของชายหน้ากากและสัญลักษณ์จากโลกใต้ดิน', true); } },
        { text: 'ปฏิเสธ ข้อมูลไร้หลักฐานไม่น่าเชื่อถือ', effect: s => { s.hero.money += 2; addLog('เจ้าประหยัดเงินไว้ แต่ความกังวลยังติดอยู่ในใจ'); } }
      ]
    },
    council: {
      month: 104, tag: 'จุดเปลี่ยนของชะตา', title: 'เงางูดำในที่ประชุม',
      dynamicText: s => adaptiveDialogue(s, 'กลางที่ประชุม ศิษย์พี่เซี่ยหลันเผยว่ามีคนส่งข่าวจากในสำนักให้ศัตรู อาจารย์เหวินถามความเห็นของเจ้า ทว่าการกล่าวหาโดยไร้หลักฐานอาจทำให้ผู้บริสุทธิ์ถูกลงโทษ'),
      choices: [
        { text: 'เผยทุกข้อมูลและเสนอให้ตรวจคลังเสบียง', note: 'ยิ่งมีเบาะแส ผลยิ่งดี', effect: s => { if (s.flags.knowsTraitor || s.flags.foundMap) { s.flags.warnedMaster = true; s.relations.master += 18; s.hero.reputation += 12; addLog('หลักฐานเชื่อมไปถึงผู้ดูแลหลัว สำนักเริ่มเตรียมรับศึกทันเวลา', true); } else { s.hero.reputation -= 8; s.relations.master -= 5; addLog('คำเตือนขาดหลักฐาน ผู้คนมองว่าเจ้าตื่นตูม'); } } },
        { text: 'อาสาสืบเงียบ ๆ กับศิษย์พี่เซี่ยหลัน', note: 'ต้องอาศัยความสัมพันธ์กับศิษย์พี่', requires: s => s.relations.senior >= 8, locked: 'ความสัมพันธ์กับศิษย์พี่ยังไม่พอ', effect: s => { s.flags.warnedMaster = true; s.relations.senior += 15; s.hero.powerBonus += 40; addLog('เจ้ากับเซี่ยหลันพบรอยส่งข่าวจากคลัง จึงเพิ่มเวรยามและหยุดแผนเผาเสบียงไว้ก่อน แต่ยังต้องหาหลักฐานมัดตัวผู้ดูแลหลัว', true); } },
        { text: 'เก็บเรื่องไว้ และเตรียมทางรอดของตน', effect: s => { s.flags.escapePrepared = true; s.relations.master -= 12; s.hero.money += 8; addLog('เจ้าซ่อนเสบียงไว้ตามทางลับ เตรียมพร้อมสำหรับวันที่เลวร้าย', true); } }
      ]
    },
    vow: {
      month: 110, tag: 'คำสัตย์', title: 'คำถามของอาจารย์',
      dynamicText: s => adaptiveDialogue(s, 'อาจารย์เหวินพาเจ้าไปยังผาเมฆา “เมื่อภัยมาถึง สำนักมิใช่อาคาร แต่คือผู้คน เจ้ายินดีแบกชะตาของพวกเขาหรือไม่?” ลมหนาวพัดชายเสื้อของท่านพลิ้วไหว'),
      choices: [
        { text: 'ข้าจะอยู่และปกป้องผู้คนที่นี่', note: 'ผูกชะตากับสำนัก · เพิ่มกำลังใจ', effect: s => { s.flags.choseLoyalty = true; s.relations.master += 20; s.hero.reputation += 10; s.hero.powerBonus += 50; addLog('อาจารย์ถ่ายทอดเคล็ดรวมปราณฉบับสมบูรณ์ให้เจ้า', true); } },
        { text: 'ข้าจะช่วยเท่าที่กำลังเอื้อ แล้วรักษาชีวิตไว้', effect: s => { s.flags.escapePrepared = true; s.relations.master += 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 8); addLog('อาจารย์พยักหน้า แม้แววตาจะเจือความผิดหวัง'); } },
        { text: 'ยุทธภพกว้างใหญ่ ข้าไม่ยอมตายที่นี่', effect: s => { s.flags.escapePrepared = true; s.relations.master -= 15; s.hero.money += 6; addLog('เจ้าตัดสินใจแล้วว่าจะออกจากเขาก่อนทุกอย่างสายเกินไป', true); } }
      ]
    },
    // รีบาลานซ์ค่าพลังในเหตุการณ์ดักซุ่ม (Ambush) ให้สมดุลกับสเกลพลังใหม่
    ambush: {
      month: 116, tag: 'อันตราย', title: 'ลูกศรกลางป่าสน',
      text: 'ระหว่างทางกลับสำนัก ลูกศรอาบพิษพุ่งออกจากเงาไม้ ขุนพลย่อยงูดำสามคนปิดทาง เจ้าต้องตัดสินใจในชั่วลมหายใจ',
      choices: [
        { text: 'ชักอาวุธ สู้เต็มกำลัง', note: 'พลัง 1,000 ขึ้นไปจึงมีโอกาสรอด หากฝืนสู้ทั้งที่พลังไม่ถึงจะเสียชีวิตทันที', effect: s => { if (s.hero.power < 1000) { s.hero.health = 0; endGame('death_battle', { cause: 'ฝืนสู้กับขุนพลย่อยงูดำทั้งที่พลังไม่ถึง 1,000 ถูกสังหารกลางป่าสน' }); } else { resolveAmbush(s, 'fight'); } } },
        { text: 'ใช้ภูมิประเทศถ่วงเวลาแล้วถอย', note: 'มีแผนที่ วิชาย่างก้าว ของแทนใจสหาย พรสวรรค์ดวงตาเฉียบคม หรือว่องไวอย่างน้อย 12 จะช่วยให้ถอยได้ดี มิฉะนั้นเสียสุขภาพ 32', effect: s => resolveAmbush(s, 'flee') },
        { text: 'อ้างว่ามีข้อมูลของสำนัก แลกกับชีวิต', note: 'รอดง่าย แต่เสียชื่อเสียง', effect: s => { s.flags.survivedAmbush = true; s.hero.reputation -= 18; s.relations.master -= 15; s.hero.health -= 8; addLog('คำลวงซื้อเวลาให้เจ้าหนี แต่ข่าวความขลาดแพร่กลับถึงสำนัก', true); } }
      ]
    },
    refugees: {
      month: 122, tag: 'ผลจากโลกภายนอก', title: 'ผู้ลี้ภัยใต้กำแพง',
      text: 'ผู้รอดชีวิตจากหมู่บ้านตะวันตกมาถึงสำนักหลายสิบคน เสบียงของสำนักมีจำกัด และบางคนหวาดกลัวว่าศัตรูแฝงตัวมากับฝูงชน สิ่งที่เจ้าสั่งวันนี้จะกำหนดว่าใครยืนอยู่ข้างสำนักในวันศึก',
      choices: [
        { text: 'ใช้เงินสร้างที่พักและแบ่งเสบียง', note: 'ใช้ 12 ตำลึง ผู้คนจะจดจำความเมตตา', requires: s => s.hero.money >= 12, locked: 'ต้องมี 12 ตำลึง', effect: s => { s.hero.money -= 12; s.flags.shelterBuilt = true; s.flags.civiliansSaved = true; s.relations.friend += 12; s.hero.reputation += 12; addLog('เรือนพักชั่วคราวกลายเป็นชุมชนเล็ก ๆ ที่พร้อมช่วยสำนัก', true); } },
        { text: 'คัดผู้แข็งแรงเข้าหน่วยอาสา', note: 'ได้กำลังรบ แต่ผู้ชราและเด็กต้องพึ่งตนเอง', effect: s => { s.flags.alliesRecruited = true; s.hero.reputation += 8; s.hero.powerBonus += 60; s.relations.senior += 6; addLog('หน่วยอาสาสามสิบคนเริ่มฝึกใต้คำสั่งของเซี่ยหลัน', true); } },
        { text: 'ปิดประตู เก็บเสบียงไว้ให้ศิษย์สำนัก', note: 'ทรัพยากรปลอดภัย แต่ชื่อของเจ้าจะถูกจดจำอีกแบบ', effect: s => { s.hero.money += 8; s.hero.reputation -= 15; s.relations.friend -= 10; s.flags.escapePrepared = true; addLog('เสียงร่ำไห้ด้านนอกกำแพงเงียบลงในคืนที่สาม', true); } }
      ]
    },
    pilgrimage: {
      month: 128, tag: 'บททดสอบแห่งเต๋า', title: 'ผาไร้นาม',
      text: 'อาจารย์เหวินบาดเจ็บจากพิษเก่าและมอบกุญแจถ้ำบรรพชนให้เจ้า ภายในมีน้ำพุรักษาโรค ค่ายกลทดสอบจิต และวิชาต้องห้ามที่ดูดพลังจากอายุขัย เจ้าพาได้เพียงสิ่งเดียวกลับลงเขา',
      choices: [
        {
          text: 'นำน้ำพุกลับไปรักษาอาจารย์และผู้บาดเจ็บ',
          note: 'อาจารย์เหวินจะฟื้นฟูเต็มร้อย · กำลังรบหลักของสำนักจะมั่นคงในศึกสุดท้าย',
          effect: s => {
            s.flags.masterHealed = true;
            s.flags.masterCrippled = false;
            s.relations.master += 28;
            s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 25);
            if (s.flags.helpedFriend) s.relations.friend += 14;
            addLog('อาจารย์เหวินฟื้นตัวจากพิษร้าย พลังยุทธ์ฟื้นคืนเต็มสิบส่วน สำนักมีความหวังอีกครั้ง และมอบตราแสดงความไว้วางใจให้เจ้า', true);
          }
        },
        {
          text: 'ผ่านค่ายกลเพื่อค้นคำเตือนของบรรพชน',
          note: 'ใช้ข้อมูลเตรียมรับกลศึกงูดำ (แต่อาจารย์จะไม่ได้รับการรักษา เกิดแผลเรื้อรัง)',
          effect: s => {
            s.flags.masterHealed = false;
            s.flags.masterCrippled = true;
            s.flags.knowsTraitor = true;
            s.flags.foundMap = true;
            s.hero.cultivation += 28;
            s.hero.powerBonus += 80;
            addLog('ภาพในค่ายกลเผยประตูที่ศัตรูจะใช้ แต่อาจารย์เหวินทรุดหนักลงเพราะขาดโอสถรักษา กำลังรบสำนักลดฮวบ!', true);
          }
        },
        {
          text: 'ฝึกวิชาต้องห้าม แลกอายุขัยสิบปี',
          note: 'พลังมหาศาลเพื่อตนเอง (แต่อาจารย์จะไม่ได้รับการรักษา เสาหลักสำนักจะทรุด)',
          effect: s => {
            s.flags.masterHealed = false;
            s.flags.masterCrippled = true;
            s.flags.forbiddenPower = true;
            ensureLifespanState(s); s.hero.lifespanMonths = Math.max(s.hero.ageMonths, s.hero.lifespanMonths - 120); s.hero.lifespan = s.hero.lifespanMonths / 12;
            s.hero.powerBonus += 450;
            s.relations.master -= 18;
            addLog('พลังเย็นเยียบไหลเข้าชีพจร ขณะที่อาจารย์เหวินบาดเจ็บเรื้อรังไร้คนเยียวยา เสาหลักสำนักกำลังจะสั่นคลอน', true);
          }
        }
      ]
    },
    betrayal: {
      month: 196, tag: 'ผลจากเบาะแสในอดีต', title: 'คืนหน้ากากหลุด',
      text: 'ผู้ดูแลหลัวเรียกเจ้าไปพบลับ ๆ เขายอมรับว่าเป็นสายของงูดำ แต่กล่าวว่าสำนักเคยทำลายตระกูลของเขา หากเจ้ามีหลักฐานมากพอ เจ้าสามารถเปิดโปงหรือใช้เขาส่งข่าวลวงได้ มิฉะนั้นเหลือเพียงการรับข้อเสนอหนีร่วมกัน',
      dynamicText: s => {
        const proof = s.flags.familyToken
          ? 'เจ้าประกบป้ายหยกตระกูลหลินกับรอยตราในบัญชีลับ รอยบิ่นตรงกันพอดี หลักฐานนี้ยืนยันว่าคำสั่งเผาตระกูลมาจากชายหน้ากากงูดำ และผู้ดูแลหลัวเป็นคนส่งเส้นทางให้'
          : 'เซี่ยหลันนำบัญชีเวรยามฉบับต้นและใบส่งยาที่มีตราหอยามาเทียบกัน ทั้งสองฉบับยืนยันว่าชายหน้ากากงูดำสั่งเผาตระกูล และหลัวเป็นคนส่งเส้นทางให้ แม้ไม่มีป้ายหยก เจ้าก็ตรวจความจริงจากเอกสารเหล่านี้ได้';
        const tokenMeaning = s.flags.familyToken
          ? 'ป้ายหยกของมารดาทำให้ความจริงนี้ไม่ใช่เพียงคดีในเอกสาร แต่เป็นมรดกที่ผูกเจ้ากับหนี้เลือดของตระกูลโดยตรง'
          : 'เมื่อไม่มีป้ายหยก ความจริงยังยืนอยู่ได้ด้วยบัญชีเวรยามและใบส่งยา แต่หลักฐานของเจ้าจะเป็นความทรงจำและเอกสารแทนมรดกของตระกูล';
        const masterState = s.flags.masterCrippled
          ? 'อาจารย์เหวินนั่งนิ่งอยู่ข้างเสา มือข้างหนึ่งยังสั่นจากพิษเก่าและไม่อาจนำกำลังรบได้เต็มที่'
          : s.flags.masterHealed
            ? 'อาจารย์เหวินยืนอยู่หลังเจ้าอย่างมั่นคง พิษเก่าถูกขับออกจนพร้อมรับผิดชอบต่อสำนักด้วยตนเอง'
            : 'อาจารย์เหวินยังฝืนยืนคุมสำนักด้วยร่างกายที่อ่อนแรง แม้พิษเก่าจะยังไม่หายดี';
        return `${EVENTS.betrayal.text}

${masterState} ${proof} ชื่อเหวินจงอยู่ในรายชื่อผู้ส่งยาช่วยผู้รอดชีวิต มิใช่รายชื่อผู้สมรู้ร่วมคิด หลัวตัดข้อความส่วนนี้ออกเพื่อให้เจ้าระแวงอาจารย์ ความจริงปรากฏแล้ว แต่เจ้าจะใช้มันอย่างไรยังเป็นการตัดสินใจของเจ้า ${tokenMeaning}`;
      },
      choices: [
        { text: 'เปิดโปงต่อหน้าทุกคนพร้อมหลักฐาน', note: 'ต้องมีแผนที่ เบาะแส หรือเคยเตือนอาจารย์', requires: s => s.flags.foundMap || s.flags.knowsTraitor || s.flags.warnedMaster, locked: 'หลักฐานยังไม่พอ', effect: s => { s.flags.traitorExposed = true; s.flags.warnedMaster = true; s.hero.reputation += 18; s.relations.master += 15; addLog('หลักฐานจากหลายปีต่อกันแน่นหนา ผู้ดูแลหลัวถูกจับก่อนเปิดประตู', true); } },
        { text: 'บีบให้เขาส่งข่าวลวงกลับไป', note: 'เสี่ยงสูง ความหยั่งรู้หรือความสัมพันธ์มีผล และข่าวลวงจะลดกำลังศัตรูในศึกสุดท้าย แต่ตัวตนของหลัวยังไม่ถูกเปิดโปงต่อสาธารณะ', requires: s => s.paths.insight >= 7 || s.relations.senior >= 20, locked: 'ต้องมีความหยั่งรู้ 7 หรือศิษย์พี่ไว้วางใจ', effect: s => { s.flags.misdirectionSuccessful = true; s.flags.alliesRecruited = true; s.hero.powerBonus += 60; s.relations.senior += 10; addLog('ข่าวลวงทำให้กำลังหลักของงูดำหลงเข้าหุบเขากับดัก แต่ผู้ดูแลหลัวยังเป็นความลับ', true); } },
        { text: 'รับข้อเสนอ เก็บทรัพย์แล้วเตรียมหนี', note: 'ได้เงินและเส้นทางปลอดภัย แต่สำนักเสียความได้เปรียบ', effect: s => { s.hero.money += 25; s.flags.escapePrepared = true; s.relations.master -= 25; s.hero.reputation -= 12; addLog('เจ้าเก็บป้ายผ่านทางของงูดำไว้ใต้เสื้อ โดยไม่มีใครเห็น', true); } },
        {
          text: 'เข้าร่วมงูดำเต็มตัว รับตำแหน่งแลกกับการเปิดประตู',
          note: 'ต้องมีอดีตด้านมืดวัยเด็ก ชื่อเสียงงูดำอย่างน้อย 10 และชื่อเสียงสำนักไม่เกิน -5 หรือแนวทางอิสระอย่างน้อย 8',
          requires: s => {
            const f = updateFactionReputation(s);
            const hasDarkPast = s.flags.darkPastFromChildhood === true;
            return hasDarkPast && f.serpent >= 10 && (f.sect <= -5 || s.paths.freedom >= 8);
          },
          locked: 'งูดำไม่ไว้ใจเจ้า! ต้องเคยร่วมมือกับโลกมืดและสร้างสัมพันธ์กับงูดำตั้งแต่เนิ่นๆ',
          effect: s => {
            s.flags.betrayedSect = true;
            s.flags.workedUnderworld = true;
            s.hero.money += 40;
            s.hero.reputation -= 30;
            s.relations.master -= 50;
            s.relations.senior -= 35;
            s.relations.friend -= 25;
            addLog('เจ้ารับตรางูดำและจำตำแหน่งเวรยามทุกจุดไว้ในใจ', true);
          }
        }
      ]
    },
    lanternVow: {
      month: 210, tag: 'คืนก่อนศึก · แสงตะเกียง', title: 'คำมั่นใต้แสงตะเกียง',
      dynamicText: s => {
        const masterState = s.flags.masterCrippled ? 'อาจารย์เหวินนั่งอยู่ข้างหน้าต่าง มือข้างหนึ่งยังสั่นจากพิษเก่า' : s.flags.masterHealed ? 'อาจารย์เหวินยืนต้อนรับเจ้าอย่างมั่นคง แม้แววตาจะซ่อนความเหนื่อยล้า' : 'อาจารย์เหวินยกถ้วยชาขึ้นช้า ๆ ร่างกายยังไม่หายจากบาดแผลทั้งหมด';
        return `${masterState} หลินอันถือโคมไฟไปยังเรือนพักของอาจารย์ หลังความจริงในคดีตระกูลเปิดเผย ทั้งสองมีเวลาเพียงคืนเดียวที่จะพูดสิ่งที่ค้างอยู่ในใจ`;
      },
      choices: [
        { text: 'คุกเข่ารินชา ขอขมาที่เคยสงสัยอาจารย์', note: 'คลี่คลายความระแวงและรับตราคำสอนเป็นไอเทมป้องกัน', effect: s => { s.flags.wenDoubtResolved = true; s.flags.masterBondGiven = true; s.relations.master += 25; s.paths.compassion += 1; addTreasure(s, 'ตราคำสอนเหวินจง', { defense: 8, body: 4 }); addLog('คำขอโทษไม่ได้ลบอดีต แต่ทำให้ความไว้วางใจระหว่างศิษย์กับอาจารย์กลับคืนมา', true); } },
        { text: 'อ้อนวอนขอให้อาจารย์หนีผ่านทางลับไปด้วยกัน', note: 'เปิดเส้นทางอพยพ แต่ยังไม่ล็อกบทจบ', effect: s => { s.flags.escapeRouteKnown = true; s.flags.escapePrepared = true; s.relations.master += 5; s.paths.freedom += 2; addLog('อาจารย์เผยทางลับสายเก่าที่ใช้ได้จริง แต่ยังให้เจ้าเป็นผู้ตัดสินใจในคืนศึก', true); } },
        { text: 'สบตาอาจารย์และให้คำมั่นว่าจะเป็นกระบี่เล่มสุดท้ายของท่าน', note: 'เพิ่มความมุ่งมั่นผู้พิทักษ์ ซึ่งจะช่วยประเมินศึกสุดท้าย', effect: s => { s.flags.guardianCommitment = true; s.flags.choseLoyalty = true; s.relations.master += 18; s.paths.duty += 4; addLog('คำมั่นของเจ้าไม่ใช่คำสั่งจากชะตา แต่เป็นเจตจำนงที่เลือกเองก่อนเสียงระฆังศึก', true); } }
      ]
    },
    lastwinter: {
      month: 212, tag: 'ฤดูหนาวสุดท้าย', title: 'หนึ่งคำสั่งก่อนหิมะละลาย',
      dynamicText: s => adaptiveDialogue(s, 'เสบียงเหลือพอสำหรับงานใหญ่เพียงอย่างเดียว ข่าวยืนยันว่าศัตรูจะมาถึงเมื่อหิมะละลาย เจ้าได้รับสิทธิ์ตัดสินใจว่าจะใช้แรงคนทั้งหมดไปกับอะไร การอพยพวันนี้เป็นเพียงการพาผู้ลี้ภัยกลุ่มแรกออกไป ผู้คนส่วนหนึ่งยังคงอยู่ในสำนักและต้องรอการตัดสินใจในคืนศึก'),
      choices: [
        { text: 'อพยพชาวบ้านกลุ่มแรกและเตรียมหอยา', note: 'ช่วยผู้ลี้ภัยบางส่วนก่อน แต่ยังมีผู้คนเหลืออยู่ในสำนัก', effect: s => { s.flags.civiliansSaved = true; s.hero.reputation += 15; s.relations.friend += 15; addLog('เฉินหยูนำขบวนผู้ลี้ภัยกลุ่มแรกข้ามเขา ตามทางที่เจ้าวางไว้ ขณะที่คนอีกส่วนยังรออยู่ในสำนัก', true); } },
        { text: 'เสริมกำแพงและฝึกหน่วยรบทั้งวันคืน', note: 'เพิ่มโอกาสรักษาสำนักในศึกสุดท้าย', effect: s => { s.flags.alliesRecruited = true; s.hero.powerBonus += 100; s.relations.senior += 12; s.hero.health -= 8; addLog('กำแพงตะวันตกถูกเสริมใหม่ หน่วยอาสาพร้อมยืนแนวหน้า', true); } },
        { text: 'ซ่อนเสบียงตามทางลับสามจุด', note: 'เส้นทางถอยพร้อม แต่ไม่มีใครรู้ว่าใครจะได้ใช้', effect: s => { s.flags.escapePrepared = true; s.hero.money += 12; s.hero.health += 5; addLog('เสบียงลับทำให้การจากไปยังเป็นทางเลือกเสมอ', true); } }
      ]
    },
    siege: {
      month: 216, tag: 'มหันตภัย', title: 'คืนสำนักแตก',
      dynamicText: s => adaptiveDialogue(s, 'เปลวไฟลุกขึ้นพร้อมเสียงระฆังเตือนภัย แม่ทัพงูดำขั้นสร้างรากฐาน ขุนพลขั้นควบแน่น 10 คน และทหารขั้นรวบรวม 50 คน ทะลักเข้าสู่ประตูเขา หากสำนักและหลินอันไม่ได้เตรียมพร้อมอย่างแท้จริง การเลือกสู้คือความตาย'),
      choices: [
        { text: 'รวมศิษย์เข้าต้านศัตรู เคียงข้างอาจารย์', note: 'ตัดสินชะตาด้วยพลังของสำนักและหลินอันร่วมกัน', dynamicNote: s => siegeBattleOmen(s), requires: s => updateFactionReputation(s).sect >= 0, locked: 'ชื่อเสียงต่อสำนักต่ำเกินกว่าจะรวมผู้คน', effect: s => finishBattle(s) },
        { text: 'พาผู้คนหนีผ่านอุโมงค์ลับ', note: 'ต้องมีแผนที่หรือเสบียง และเส้นทางพร้อม และ (ว่องไว ≥ 6 หรือเมตตา ≥ 6) และ (กายา ≥ 4 หรือพลังรวม ≥ 300); ชื่อเสียงต่ำกว่า -15 จะกลายเป็น Outlaw', requires: s => (s.flags.foundMap || s.flags.escapePrepared), locked: 'ยังไม่มีเส้นทางหรือเสบียงสำหรับพาผู้คนหนี', effect: s => finishEscape(s, true) },
        { text: 'ฉวยเสบียงแล้วหนีเพียงลำพัง', note: 'ต้องมี (ว่องไว ≥ 6 หรือเส้นทางพร้อม) และ (กายา ≥ 4 หรือพลังรวม ≥ 300); ชื่อเสียงต่ำกว่า -15 จะกลายเป็น Outlaw', effect: s => finishEscape(s, false) },
        { text: 'ส่งสัญญาณ เปิดประตูให้กองโจรงูดำ', note: 'ทรยศสำนักและรับรางวัลจากศัตรู', requires: s => s.flags.betrayedSect, locked: 'ต้องเข้าร่วมงูดำเสียก่อน', effect: s => endGame('traitor_kingpin', { battleScore: 0 }) }
      ]
    }
  };

  // เส้นทาง M84 ที่ไม่เข้าสำนักใช้ Core เดียวกัน แต่เปลี่ยนแรงผลักของ Event
  // ให้กิจกรรม งาน สุขภาพ เงิน ความสัมพันธ์ และการเดินทางมีความหมายแทนการบำเพ็ญ
  // ช่วงชีวิตที่เพิ่มขึ้นให้หลินอันเตรียมตัวได้หลายทาง ก่อนสงครามในปีที่ 18
  Object.assign(EVENTS, {
    years_of_service: {
      month: 150, tag: 'ชีวิตในสำนัก · ปีที่สิบสาม', title: 'สิ่งที่สำนักขาด',
      text: 'หลายปีผ่านไป สำนักต้องรับทั้งผู้บาดเจ็บ ผู้ลี้ภัย และข่าวจากชายแดน เจ้าช่วยได้เพียงงานเดียวในเดือนนี้',
      choices: [
        { text: 'ช่วยดูแลผู้ลี้ภัยและจัดที่พัก', note: 'สร้างแนวหลังและความไว้วางใจ แลกกับแรงกาย', effect: s => { s.flags.shelterBuilt = true; s.hero.health = Math.max(1, s.hero.health - 4); s.paths.compassion += 3; s.relations.friend += 3; addLog('ผู้ลี้ภัยมีที่พักและคนในสำนักเริ่มร่วมมือกัน', true); } },
        { text: 'รวบรวมข่าวจากชายแดนให้สำนัก', note: 'ช่วยให้สำนักเตรียมพร้อมและเพิ่มความเข้าใจ', effect: s => { s.flags.warnedMaster = true; s.paths.insight += 3; s.relations.master += 3; addLog('ข่าวจากชายแดนถึงมือผู้ดูแลสำนักก่อนจะสายเกินไป', true); } },
        { text: 'รับงานหาเสบียงและดูแลตัวเอง', note: 'เพิ่มเงินและฟื้นกำลัง โดยไม่ได้เตรียมแนวรบ', effect: s => { s.hero.money += 8; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 5); addLog('เจ้าช่วยจัดเสบียงและเก็บแรงไว้สำหรับวันข้างหน้า'); } }
      ]
    },
    years_of_choice: {
      month: 174, tag: 'ชีวิตในสำนัก · หนทางของตน', title: 'เมื่อการฝึกไม่ใช่ทุกอย่าง',
      text: 'สำนักเปิดโอกาสให้ศิษย์เลือกว่าจะใช้เวลาช่วงนี้กับสิ่งใด ความสามารถ ความสัมพันธ์ และชีวิตนอกสนามฝึกต่างมีความหมาย',
      choices: [
        { text: 'ฝึกพื้นฐานและศึกษาอย่างรอบคอบ', note: 'เพิ่มพื้นฐานและความเข้าใจ', effect: s => { s.trainingFoundation = (s.trainingFoundation || 0) + 6; s.paths.insight += 2; s.hero.health = Math.max(1, s.hero.health - 3); addLog('เจ้ากลับไปทบทวนพื้นฐาน แทนการเร่งเอาชนะผู้อื่น'); } },
        { text: 'ใช้เวลากับสหายและช่วยงานส่วนรวม', note: 'เพิ่มความสัมพันธ์และความไว้วางใจ', effect: s => { s.relations.friend += 7; s.relations.senior += 4; s.paths.compassion += 2; addLog('ผู้คนที่เคยร่วมทุกข์ร่วมสุขเริ่มพึ่งพากันได้มากขึ้น'); } },
        { text: 'พักและรับงานสุจริตนอกเวลา', note: 'ฟื้นสุขภาพและเพิ่มเงิน', effect: s => { s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 8); s.hero.money += 6; addLog('เจ้าหาเลี้ยงตัวและให้ร่างกายได้พัก'); } }
      ]
    },
    border_preparation: {
      month: 186, tag: 'เงาศึก · การเตรียมตัว', title: 'คนที่อยู่หลังแนวหน้า',
      text: 'เส้นทางชายแดนไม่ปลอดภัยอีกต่อไป ศิษย์ได้รับมอบหมายให้ตัดสินใจว่าจะช่วยเตรียมสำนักอย่างไร',
      choices: [
        { text: 'ชักชวนอาสาสมัครเสริมแนวป้องกัน', note: 'เพิ่มกำลังป้องกัน แลกกับสุขภาพ', effect: s => { s.flags.alliesRecruited = true; s.hero.health = Math.max(1, s.hero.health - 6); s.paths.duty += 2; addLog('อาสาสมัครเข้าร่วมฝึกและเตรียมแนวป้องกัน', true); } },
        { text: 'สำรวจเส้นทางอพยพและซ่อนเสบียง', note: 'เตรียมทางหนีและช่วยผู้คนในภายหลัง', effect: s => { s.flags.escapePrepared = true; s.paths.freedom += 2; s.paths.compassion += 1; addLog('เส้นทางอพยพและจุดพักถูกทำเครื่องหมายไว้', true); } },
        { text: 'ช่วยจัดหายาและพักรักษาตัว', note: 'ฟื้นสุขภาพและช่วยงานสำนัก', effect: s => { s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 7); s.relations.master += 3; addLog('ยาที่รวบรวมได้ถูกส่งไปยังหอรักษา'); } }
      ]
    },
    before_the_storm: {
      month: 204, tag: 'เงาศึก · ทางเลือก', title: 'ก่อนเสียงระฆัง',
      text: 'ข่าวการเคลื่อนทัพเริ่มแน่ชัด ไม่มีใครทำทุกอย่างได้ทัน เจ้าต้องเลือกว่าจะฝากแรงที่เหลือไว้กับสิ่งใด',
      choices: [
        { text: 'เตรียมป้องกันประตูเขา', note: 'เพิ่มความมุ่งมั่นและกำลังแนวหน้า', effect: s => { s.flags.choseLoyalty = true; s.paths.duty += 3; s.hero.powerBonus += 30; addLog('เจ้าร่วมฝึกกับผู้ที่จะยืนรักษาประตูเขา', true); } },
        { text: 'เตรียมช่วยคนที่สู้ไม่ได้', note: 'สร้างที่พักสำหรับผู้ลี้ภัย', effect: s => { s.flags.shelterBuilt = true; s.paths.compassion += 3; s.relations.friend += 3; addLog('แนวหลังเตรียมรับผู้บาดเจ็บและผู้ที่ต้องอพยพ', true); } },
        { text: 'เตรียมเส้นทางถอยให้ยังเลือกได้', note: 'เปิดทางหลบหนีและเพิ่มความคล่องตัว', effect: s => { s.flags.escapePrepared = true; s.paths.freedom += 3; s.hero.attributes.agility = Math.min(126, (s.hero.attributes.agility || 0) + 1); addLog('เจ้าจดจำเส้นทางถอยไว้ เผื่อถึงเวลาที่ต้องเลือก', true); } }
      ]
    }
  });

  const ALTERNATE_ROUTE_EVENTS = {
    // ==========================================
    // 1. เส้นทางชีวิตสงบใต้ชายคา (Mortal Peace)
    // ==========================================
    route_mortal_peace_m90: {
      month: 90, route: 'mortal-peace', tag: 'ชีวิตสงบ · วัยสิบสองปี', art: 'road',
      title: 'เพิงเช่ากับงานแรก',
      text: 'หลินอันอายุสิบสอง ตัดสินใจไม่ขึ้นเขาเมฆาคราม เขายืนอยู่กลางตลาดเมืองหน้าด่าน มีเงินติดตัวเพียงเล็กน้อยและต้องเลือกงานแรกเพื่อประทังชีพและเริ่มต้นชีวิตธรรมดา',
      choices: [
        {
          text: 'รับจ้างคัดแยกสมุนไพรในร้านยาหมอเฒ่า',
          note: 'ปูทางสายหมอยา: ได้สมุนไพร ทักษะปรุงยา และสุขภาพฟื้นฟู',
          effect: s => {
            s.paths.compassion += 2; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 10);
            s.hero.money += 4; addHerb(s, null, 3); ensureCraftingState(s).knowledge.alchemy += 1; s.flags.mortalPeaceRole = 'healer';
            ensureHousehold(s).householdSkill = (ensureHousehold(s).householdSkill || 0) + 2;
            addLog('หลินอันเรียนรู้การดมกลิ่นและคัดสมุนไพรในร้านยา หมอเฒ่าชมความจำของเจ้า', true);
          }
        },
        {
          text: 'ช่วยซ่อมเครื่องมือและคัดแร่เหล็กในโรงช่าง',
          note: 'ปูทางสายช่างฝีมือ: ได้วัสดุช่าง ทักษะช่าง และร่างกายแข็งแรง',
          effect: s => {
            s.hero.combat = s.hero.combat || {}; s.hero.combat.body = (s.hero.combat.body || 0) + 1;
            s.hero.money += 5; addMaterial(s, null, 2); ensureCraftingState(s).knowledge.smithing += 1; s.flags.mortalPeaceRole = 'artisan';
            ensureHousehold(s).householdSkill = (ensureHousehold(s).householdSkill || 0) + 2;
            addLog('หลินอันช่วยซ่อมเครื่องมือและคัดแร่เหล็ก เรียนรู้งานช่างและได้ค่าแรงสุจริต', true);
          }
        },
        {
          text: 'หาบของเร่ขายและหัดทำบัญชีสินค้าในตลาด',
          note: 'ปูทางสายพ่อค้า: ได้เงินทอง ทักษะค้าขาย และรู้จักราคาสินค้า',
          effect: s => {
            s.hero.money += 9; s.paths.insight += 1; s.flags.mortalPeaceRole = 'merchant';
            ensureHousehold(s).householdSkill = (ensureHousehold(s).householdSkill || 0) + 2;
            addLog('หลินอันหาบตะกร้าขายของในตลาด เรียนรู้กลไกราคาและกำไรขาดทุน', true);
          }
        }
      ]
    },
    route_mortal_peace_m108: {
      month: 108, route: 'mortal-peace', tag: 'ชีวิตสงบ · สัญญาตั้งตัว', art: 'road',
      title: 'สัญญาเช่าห้องแถวไม้',
      text: 'สองปีแห่งความมุมานะ ห้องแถวไม้เก่าท้ายตลาดว่างลง เจ้าของยินดีให้เซ้งสิทธิ์เช่าราคา 15 ตำลึง นี่คือโอกาสมีหน้าร้านและที่พัก',
      choices: [
        {
          text: 'ยอมกู้เงินเล็กน้อยเพื่อเซ้งห้องแถวเปิดร้านของตนเอง',
          note: 'จ่าย 7 ตำลึง กู้ 8 ตำลึง และมีค่าเช่ารายเดือน',
          requires: s => s.hero.money >= 7, locked: 'ต้องมีเงิน 7 ตำลึงเพื่อร่วมจ่ายค่าเซ้ง',
          effect: s => {
            const h = ensureHousehold(s); h.housing = 'rented'; h.debt = (h.debt || 0) + 8;
            s.hero.money -= 7; s.flags.hasShop = true; s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('ป้ายชื่อร้านเล็ก ๆ ถูกแขวนขึ้นใต้ชายคา แม้มีหนี้สินแต่มีหลังคาคุ้มหัวตนเอง', true);
          }
        },
        {
          text: 'เช่าห้องแถวรายเดือนธรรมดา ไม่ยอมมีหนี้สินผูกมัด',
          note: 'จ่าย 3 ตำลึงและมีค่าเช่ารายเดือน โดยไม่ก่อหนี้เพิ่ม',
          requires: s => s.hero.money >= 3, locked: 'ต้องมีเงิน 3 ตำลึง',
          effect: s => {
            ensureHousehold(s).housing = 'rented'; s.hero.money -= 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 5);
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 1;
            addLog('หลินอันเลือกเช่าแบบสบายใจ ไร้หนี้สินกวนใจในยามหลับ', true);
          }
        },
        {
          text: 'ชวนเพื่อนบ้านลงขันร่วมหุ้น แบ่งเบาภาระและแบ่งกำไร',
          note: 'สร้างสัมพันธ์ชุมชนและได้หุ้นส่วนช่วยงาน',
          effect: s => {
            s.relations.friend += 8; s.paths.compassion += 2; s.flags.hasPartner = true; s.flags.hasShop = true;
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('เพื่อนบ้านตอบรับคำชวน ร่วมกันเปิดร้านและเป็นหูเป็นตาให้กัน', true);
          }
        }
      ]
    },
    route_mortal_peace_m126: {
      month: 126, route: 'mortal-peace', tag: 'ชีวิตสงบ · ภัยหนาว', art: 'road',
      title: 'ไข้หวัดป่าลามตลาด',
      text: 'ลมหนาวพัดพาโรคไข้หวัดป่าระบาดทั่วเมือง ร้านยาใหญ่กักตุนสินค้าเพื่อโก่งราคา ชาวบ้านยากจนนอนรอความหวังอยู่หน้าประตู',
      choices: [
        {
          text: 'ต้มยาสมุนไพรแจกจ่ายผู้ยากไร้หน้าเรือน',
          note: 'ใช้เงิน 5 ตำลึงจัดหายาและช่วยเหลือชาวบ้าน',
          requires: s => s.hero.money >= 5,
          locked: 'ต้องมีเงิน 5 ตำลึงเพื่อจัดหายา',
          effect: s => {
            s.hero.money -= 5;
            s.hero.reputation += 15; s.paths.compassion += 4; s.relations.friend += 12;
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 3; s.flags.belovedCitizen = true;
            addLog(s.flags.hasShop ? 'ชาวบ้านที่ได้รับยามาขอบคุณหน้าร้าน ความช่วยเหลือนี้ถูกจดจำทั่วตลาด' : 'ชาวบ้านที่ได้รับยามาขอบคุณ ความช่วยเหลือนี้ถูกจดจำทั่วตลาด', true);
          }
        },
        {
          text: 'รับจ้างช่วยพ่อค้าขายยาและของใช้ในราคาทุน',
          note: 'ช่วยขายของให้พ่อค้า ได้ค่าจ้าง 6 ตำลึงและชื่อเสียง',
          effect: s => {
            s.hero.money += 6; s.hero.reputation += 6; s.paths.compassion += 1;
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('หลินอันช่วยพ่อค้าจัดของในราคาทุนและได้รับค่าจ้าง ผู้คนจดจำความสุจริตนี้', true);
          }
        },
        {
          text: 'อยู่ที่พักและดูแลสุขภาพตนเอง',
          note: 'ปลอดภัยสูงสุด สุขภาพแข็งแรงสมบูรณ์',
          effect: s => {
            s.hero.health = s.hero.maxHealth; s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 1;
            addLog('หลินอันดูแลสุขภาพในเรือนจนทุกคนปลอดภัยจากไข้หวัดป่า');
          }
        }
      ]
    },
    route_mortal_peace_m144: {
      month: 144, route: 'mortal-peace', tag: 'ชีวิตสงบ · ซ่อมแซมเรือน', art: 'road',
      title: 'ลมฝนกระหน่ำหลังคา',
      text: s => ensureHousehold(s).housing === 'shelter' ? 'พายุฤดูฝนพัดหลังคาที่พักชั่วคราวจนเสียหาย น้ำฝนเริ่มซึมถึงข้าวของ หากไม่ซ่อมก่อนลมหนาวอุปกรณ์อาจเสียหาย' : 'พายุฤดูฝนพัดกระเบื้องหลังคาปลิวไปครึ่งแถบ น้ำฝนรั่วซึมลงห้องเก็บของ หากไม่ซ่อมแซมก่อนลมหนาว ข้าวของและเครื่องมือจะเสียหาย',
      choices: [
        {
          text: 'ลงแรงปีนซ่อมแซมหลังคาเองและช่วยบ้านข้างเคียง',
          note: 'ช่วยซ่อมหลังคา เสียสุขภาพ 6 จุดและสัมพันธ์เพื่อนบ้านดีขึ้น',
          effect: s => {
            s.hero.health = Math.max(1, s.hero.health - 6);
            s.relations.friend += 6; s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('หลังคาใหม่ถูกมุงด้วยกระเบื้องหนาแน่น ฝนหยุดรั่วและเรือนอบอุ่นขึ้น', true);
          }
        },
        {
          text: 'จ้างช่างฝีมือมาซ่อมแซมอย่างประณีต',
          note: 'เสียเงิน 6 ตำลึง ได้งานเรียบร้อยสมบูรณ์โดยไม่เจ็บตัว',
          requires: s => s.hero.money >= 6, locked: 'ต้องมีเงิน 6 ตำลึง',
          effect: s => {
            s.hero.money -= 6;
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('ช่างฝีมือซ่อมแซมคานและหลังคาอย่างแน่นหนา บ้านปลอดภัยไร้กังวล', true);
          }
        },
        {
          text: 'นำผ้าใบและฟางมาคลุมกันฝนชั่วคราว',
          note: 'ประหยัดเงิน แต่บ้านยังมีความเสี่ยงในฤดูหนาว',
          effect: s => {
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 1;
            addLog('ผ้าใบช่วยกันฝนได้ชั่วคราว หลินอันเก็บเงินไว้ใช้ยามจำเป็น');
          }
        }
      ]
    },
    route_mortal_peace_m162: {
      month: 162, route: 'mortal-peace', tag: 'ชีวิตสงบ · เงาอดีต', art: 'road',
      title: 'คนคุ้นเคยแวะเยือน',
      text: s => `ยามพลบค่ำ ${s.flags.retainerAlive ? 'ลุงโจว' : 'คนรู้จักเก่าในวัยเด็ก'}มาเคาะประตูเรือนในสภาพเปียกฝน เขาหนีสายสืบงูดำมาและต้องการที่หลบภัยชั่วคราว`,
      choices: [
        {
          text: 'เปิดประตูรับเข้าเรือน ทายาและจัดห้องพักให้อย่างอบอุ่น',
          note: 'รักษาคนสำคัญ ปกป้องผู้มีพระคุณ เพิ่มสายสัมพันธ์ลึกซึ้ง',
          effect: s => {
            if (s.flags.retainerAlive) s.flags.retainerSheltered = true; else s.relations.friend += 3; s.paths.compassion += 3;
            s.hero.health = Math.max(1, s.hero.health - 4); s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog(s.flags.retainerAlive ? 'ลุงโจวน้ำตาซึมเมื่อเห็นเด็กที่ตนเคยอุ้มมีบ้านที่คุ้มภัยให้เขา' : 'คนรู้จักเก่าขอบใจหลินอันที่เปิดบ้านให้พักพิง', true);
          }
        },
        {
          text: 'มอบเงินเสบียงและยา แล้วพาไปซ่อนที่เพิงพักนอกเมือง',
          note: 'ช่วยเหลืออย่างระมัดระวัง ไม่ดึงอันตรายเข้าสู่เรือนตนเอง',
          requires: s => s.hero.money >= 8, locked: 'ต้องมีเงิน 8 ตำลึง',
          effect: s => {
            s.hero.money -= 8; s.paths.insight += 2;
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('เสบียงและเงินทองช่วยให้เขาหลบหนีต่อไปได้อย่างปลอดภัย โดยไม่ทิ้งร่องรอยมาถึงร้าน', true);
          }
        },
        {
          text: 'มอบอาหารแห้งและชี้ทางหลบหนี แต่ปฏิเสธไม่ให้พักในเรือน',
          note: 'เด็ดขาด ปกป้องร้านและความสงบของครอบครัวเป็นหลัก',
          effect: s => {
            s.paths.freedom += 1; s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 1;
            addLog('หลินอันเลือกปกป้องความปลอดภัยของเรือน คนรู้จักเข้าใจและจากไปอย่างเงียบงัน');
          }
        }
      ]
    },
    route_mortal_peace_m180: {
      month: 180, route: 'mortal-peace', tag: 'ชีวิตสงบ · เงาศึก', art: 'road',
      title: 'ข่าวไฟสงครามจากยอดเขา',
      text: 'ข่าวความขัดแย้งระหว่างสำนักเมฆาครามกับพรรคงูดำเริ่มตึงเครียด กองคาราวานชะลอตัว ข้าวสารและสมุนไพรในตลาดเริ่มขาดแคลน',
      choices: [
        {
          text: 'ซื้อสมุนไพรเก็บไว้สำหรับชาวบ้านในชุมชน',
          note: 'ใช้เงิน 6 ตำลึง ซื้อสมุนไพรทั่วไป 5 ชิ้น',
          requires: s => s.hero.money >= 6, locked: 'ต้องมีเงิน 6 ตำลึง',
          effect: s => {
            s.hero.money -= 6; addHerb(s, null, 5);
            s.flags.medicineReserve = true; s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('หลินอันเก็บสมุนไพรเตรียมไว้ให้คนในชุมชน', true);
          }
        },
        {
          text: 'รับจ้างช่วยจัดหาสินค้าจำเป็นให้ตลาด',
          note: 'รับค่าจ้าง 10 ตำลึงจากการช่วยจัดหาของ',
          effect: s => {
            s.hero.money += 10; s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('หลินอันช่วยจัดหาสินค้าให้ตลาดและได้รับค่าจ้าง', true);
          }
        },
        {
          text: 'ซ่อนทรัพย์สิน ขุดห้องใต้ดินลับไว้ใต้เรือน',
          note: 'เตรียมที่หลบภัยฉุกเฉิน ปลอดภัยสูงสุด',
          effect: s => {
            s.flags.escapePrepared = true; s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 1;
            addLog('ห้องใต้ดินลับถูกสร้างเสร็จ มีช่องระบายอากาศและทางหนีออกหลังสวน');
          }
        }
      ]
    },
    route_mortal_peace_m198: {
      month: 198, route: 'mortal-peace', tag: 'ชีวิตสงบ · ผู้อพยพ', art: 'road',
      title: 'คลื่นผู้อพยพใต้ชายคา',
      text: 'หกเดือนก่อนศึกใหญ่ ผู้อพยพจากหมู่บ้านเชิงเขาหนีตายลงมาที่ตลาด เด็กและคนชราไร้ที่พักพิง นั่งกอดเข่าหนาวสั่นอยู่ตามชายคา',
      choices: [
        {
          text: 'ช่วยตั้งโรงทานในลานชุมชนและดูแลผู้ลี้ภัย',
          note: 'ชุมชนยกย่องเป็นเสาหลักแห่งตลาด',
          effect: s => {
            s.hero.health = Math.max(1, s.hero.health - 6); s.paths.compassion += 4;
            s.relations.friend += 15; s.flags.civiliansSaved = true;
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 3;
            addLog('โรงทานในลานชุมชนกลายเป็นที่พึ่งของผู้ลี้ภัย หลินอันช่วยเท่าที่กำลังมี', true);
          }
        },
        {
          text: 'จัดจ้างผู้อพยพที่แข็งแรงมาช่วยงานในร้านและจ่ายค่าแรงเป็นอาหาร',
          requires: s => !!s.flags.hasShop, locked: 'ต้องมีร้านที่เปิดไว้ก่อน',
          note: 'สร้างงานอย่างยั่งยืน ช่วยเหลือเกื้อกูลกันอย่างมีศักดิ์ศรี',
          effect: s => {
            s.hero.money += 8; s.relations.friend += 8; s.flags.civiliansSaved = true;
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 2;
            addLog('ผู้อพยพได้งานทำ ร้านค้าขยายกำลังผลิต ทุกฝ่ายผ่านพ้นวิกฤตไปด้วยกัน', true);
          }
        },
        {
          text: 'กลับที่พักและรักษาความปลอดภัยของตนเอง',
          note: 'เน้นความปลอดภัยของครอบครัวตนเอง ไร้ความเสี่ยง',
          effect: s => {
            s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 6);
            s.flags.mortalPeaceProgress = (s.flags.mortalPeaceProgress || 0) + 1;
            addLog('เรือนของหลินอันปลอดภัยท่ามกลางความวุ่นวายภายนอก');
          }
        }
      ]
    },
    route_mortal_peace_m216: {
      month: 216, route: 'mortal-peace', tag: 'ชีวิตสงบ · บทสรุป', art: 'road',
      title: 'รุ่งอรุณหลังสงคราม — ชีวิตใต้ชายคา',
      text: s => s.flags.hasShop ? 'ควันไฟบนยอดเขาเมฆาครามมอดดับลง สงครามยุติแล้ว หลินอันมองตลาดและร้านที่ร่วมสร้างขึ้นผ่านคืนอันยาวนาน' : 'ควันไฟบนยอดเขาเมฆาครามมอดดับลง สงครามยุติแล้ว หลินอันกลับมามองผู้คนในตลาดที่พยายามเริ่มต้นชีวิตอีกครั้ง',
      choices: [
        {
          text: 'ช่วยฟื้นฟูชุมชนหลังสงคราม',
          note: 'บทสรุปชีวิตสงบสุขที่สมบูรณ์แบบ',
          effect: s => {
            const h = ensureHousehold(s);
            const isAffluent = s.hero.money >= 20 || h.housing === 'owned' || h.housing === 'estate';
            if (isAffluent && s.hero.health >= 20) {
              endGame('quiet_roof', { cause: s.flags.hasShop ? 'หลินอันรักษาร้านและช่วยชุมชนผ่านไฟสงคราม' : 'หลินอันช่วยชุมชนตั้งหลักและผ่านไฟสงคราม' });
            } else {
              endGame('war_shadow_survivor', { cause: s.flags.hasShop ? 'แม้มีบาดแผลจากสงคราม ร้านและชายคาของหลินอันยังคงมีคนกลับมาได้' : 'แม้มีบาดแผลจากสงคราม หลินอันยังคงอยู่ช่วยผู้คนในชุมชน' });
            }
          }
        },
        {
          text: 'เก็บออมทรัพย์สิน ใช้ชีวิตเรียบง่ายสงบสุขกับคนที่รัก',
          note: 'บทสรุปชีวิตธรรมดาที่เปี่ยมสุข',
          effect: s => {
            endGame('quiet_roof', { cause: 'หลินอันเลือกใช้ชีวิตเรียบง่าย ไม่แสวงหาความยิ่งใหญ่ในยุทธภพ' });
          }
        },
        {
          text: 'มอบร้านให้ลูกศิษย์ดูแลต่อ แล้วออกเดินทางท่องเที่ยวตามใจปรารถนา',
          requires: s => !!s.flags.hasShop, locked: 'ต้องมีร้านที่เปิดไว้ก่อน',
          note: 'บทสรุปกึ่งเกษียณและมีอิสรภาพ',
          effect: s => {
            endGame('quiet_roof', { cause: 'หลินอันวางมือจากงาน ส่งต่อร้านให้คนรุ่นหลัง แล้วใช้ชีวิตบั้นปลายอย่างสงบ' });
          }
        }
      ]
    },

    // ==========================================
    // 2. เส้นทางนักยุทธ์ไร้นาม (Nameless Martial)
    // ==========================================
    route_nameless_martial_m90: {
      month: 90, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · วัยสิบสองปี', art: 'road',
      title: 'ลานดินกับเสาไม้',
      text: 'หลินอันปฏิเสธการฝึกปราณเซียน แต่มุ่งมั่นฝึกฝนร่างกายและกระบวนท่า เขายืนหน้าเสาไม้ที่ลานดินท้ายเมือง หมัดและเหงื่อคือคำตอบของทุกคำถาม',
      choices: [
        {
          text: 'ต่อยเสาไม้และยกหิน ฝึกกระดูกเหล็กและพลังหมัด',
          note: 'เน้นพลังกาย: กายา +1 สุขภาพสูงสุดเพิ่มขึ้น',
          effect: s => {
            s.hero.combat = s.hero.combat || {}; s.hero.combat.body = (s.hero.combat.body || 0) + 1;
            s.hero.maxHealth += 10; s.hero.health += 10; s.hero.powerBonus += 20;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('หมัดกระแทกเสาไม้จนผิวแตกด้าน ร่างกายของหลินอันเริ่มแกร่งดั่งศิลา', true);
          }
        },
        {
          text: 'วิ่งหลบกิ่งไผ่และกระโดดข้ามขอนไม้ ฝึกย่างก้าวพริบตา',
          note: 'เน้นความคล่องตัว: ว่องไว +1 หลบหลีกแม่นยำ',
          effect: s => {
            s.hero.combat = s.hero.combat || {}; s.hero.combat.agility = (s.hero.combat.agility || 0) + 1;
            s.paths.freedom += 2; s.hero.powerBonus += 15;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('ปลายเท้าแตะพื้นเบาดั่งนกนางแอ่น ย่างก้าวของหลินอันรวดเร็วคล่องแคล่ว', true);
          }
        },
        {
          text: 'รับจ้างเป็นคู่ซ้อมในค่ายมวย แลกเงินและประสบการณ์จริง',
          note: 'ได้เงินทองและประสบการณ์ปะทะจริง แลกกับรอยฟกช้ำ',
          effect: s => {
            s.hero.money += 8; s.hero.health = Math.max(1, s.hero.health - 6); s.hero.powerBonus += 15;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 1;
            addLog('การรับหมัดจริงทำให้หลินอันคุ้นชินกับความเจ็บปวดและจับทางคู่ต่อสู้ได้');
          }
        }
      ]
    },
    route_nameless_martial_m108: {
      month: 108, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · คุ้มกันคาราวาน', art: 'road',
      title: 'คมดาบแรกคุ้มกันคาราวาน',
      text: 'คาราวานพ่อค้าถูกโจรป่าดักซุ่มที่ช่องเขาเสือหมอบ เสียงดาบปะทะกันดังสนั่น นี่คือสนามรบจริงครั้งแรกของหลินอัน',
      choices: [
        {
          text: 'ชักดาบพุ่งเข้าชาร์จหัวหน้าโจรด้วยพลังกายล้วน ๆ',
          note: 'โจรพ่ายแพ้ ได้ชื่อเสียง พลังรบ และเงินรางวัล',
          effect: s => {
            s.hero.reputation += 8; s.hero.powerBonus += 30; s.hero.money += 6;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('เพลงดาบหนักแน่นผ่าอาวุธหัวหน้าโจรหักครึ่ง โจรป่าแตกพ่าย ชื่อเสียงเริ่มเลื่องลือ', true);
          }
        },
        {
          text: 'ใช้ความคล่องตัวล่อโจรแยกกลุ่มแล้วจัดการทีละคน',
          note: 'แยกจัดการโจร ได้เงินรางวัลและพลังรบ',
          effect: s => {
            s.hero.money += 10; s.paths.insight += 2; s.hero.powerBonus += 25;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('หลินอันเคลื่อนไหวประดุจเงา ปราบโจรป่าทีละคนโดยขบวนสินค้าไม่เสียหาย', true);
          }
        },
        {
          text: 'ยืนคุ้มกันข้างเกวียน ไม่ผลีผลาม รักษาชีวิตคนในคาราวาน',
          note: 'สุขุมรอบคอบ ได้รับความไว้วางใจจากพ่อค้า',
          effect: s => {
            s.relations.friend += 8; s.paths.compassion += 2; s.hero.money += 7;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 1;
            addLog('พ่อค้าซาบซึ้งใจ มอบเงินรางวัลและยกย่องหลินอันว่าเป็นคนรักษาคำสัตย์', true);
          }
        }
      ]
    },
    route_nameless_martial_m126: {
      month: 126, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · ครูดาบพเนจร', art: 'road',
      title: 'ยอดคนพเนจรในโรงเตี๊ยม',
      text: 'จอมยุทธ์ชราไร้สังกัดนั่งดื่มสุราอยู่มุมมืด เมื่อเห็นกระบวนท่าของหลินอัน เขาเอ่ยทัก: "เพลงดาบเจ้าหนักแน่น แต่วิถียังขาดความเด็ดเดี่ยว เจ้าฝึกเพื่อสิ่งใด?"',
      choices: [
        {
          text: 'คุกเข่ารินสุรา ขอคำชี้แนะวิชาหมัดและดาบไร้นาม',
          note: 'ได้รับการถ่ายทอดวิชาลับ: เพิ่มพลังรบมหาศาล',
          effect: s => {
            s.hero.powerBonus += 80; s.hero.combat = s.hero.combat || {};
            s.hero.combat.body = (s.hero.combat.body || 0) + 1;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 3;
            addLog('จอมยุทธ์เฒ่าถ่ายทอด "เพลงดาบไร้นาม" ให้ คมดาบคมกล้าขึ้นในชั่วข้ามคืน', true);
          }
        },
        {
          text: 'ขอประลองแลกเปลี่ยนกระบวนท่าด้วยความเคารพ',
          note: 'ประลองแลกเปลี่ยน ได้ชื่อเสียงและพลังรบ',
          effect: s => {
            s.hero.reputation += 6; s.hero.powerBonus += 50; s.paths.insight += 2;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('การประลองจบลงด้วยรอยยิ้ม เฒ่าพเนจรชมเชยวาสนาและความมุ่งมั่นของเจ้า', true);
          }
        },
        {
          text: 'เลี้ยงสุราและนั่งฟังประสบการณ์อันโชกโชนในยุทธภพ',
          note: 'ได้ฟังประสบการณ์และมุมมองของจอมยุทธ์ชรา',
          effect: s => {
            s.paths.insight += 4; s.paths.freedom += 2;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 1;
            addLog('เรื่องเล่าของเฒ่าพเนจรเปิดมุมมองยุทธภพที่แท้จริงให้หลินอันตระหนัก');
          }
        }
      ]
    },
    route_nameless_martial_m144: {
      month: 144, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · ประลองลานเปิด', art: 'road',
      title: 'งานประลองลานเปิดเมืองชายแดน',
      text: 'เมืองชายแดนจัดการประลองยุทธ์ชาวบ้าน ศิษย์สำนักต่าง ๆ มาร่วมประลองเพื่อโอ้อวด หลินอันถูกท้าทายให้ขึ้นลานในฐานะตัวแทนจอมยุทธ์ไร้สังกัด',
      choices: [
        {
          text: 'ขึ้นลานประลอง สยบคู่ต่อสู้ด้วยวิชากายาล้วน ๆ',
          note: 'ชื่อเสียงยุทธภพพุ่งสูง เอาชนะใจผู้ชมชาวบ้าน',
          effect: s => {
            s.hero.reputation += 14; s.hero.powerBonus += 60;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 3;
            addLog('เพลงดาบธรรมดาแต่ไร้ช่องโหว่ล้มศิษย์สำนักลง ชื่อของหลินอันก้องทั่วลานประลอง', true);
          }
        },
        {
          text: 'ยับยั้งดาบไว้ที่คอคู่แข่ง ชนะอย่างมีคุณธรรมและให้เกียรติ',
          note: 'ได้ชื่อเสียงและความเคารพจากทั้งสำนักและชาวบ้าน',
          effect: s => {
            s.hero.reputation += 10; s.paths.compassion += 3; s.hero.powerBonus += 40;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('คู่ต่อสู้ยอมรับความพ่ายแพ้ด้วยความนับถือ หลินอันได้ชื่อว่าเป็นจอมยุทธ์ผู้มีคุณธรรม', true);
          }
        },
        {
          text: 'ปฏิเสธการขึ้นลาน ไม่หลงใหลในชื่อเสียงจอมปลอม',
          note: 'รักษาความลับ ไม่เปิดเผยตัวตน อิสรภาพเพิ่มขึ้น',
          effect: s => {
            s.paths.freedom += 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 8);
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 1;
            addLog('หลินอันยืนดูอยู่เงียบ ๆ คมดาบที่แท้จริงมีไว้ปกป้อง มิใช่เพื่อโอ้อวด');
          }
        }
      ]
    },
    route_nameless_martial_m162: {
      month: 162, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · สยบโจร', art: 'road',
      title: 'โจรเข้างูดำปล้นเสบียง',
      text: 'หน่วยสอดแนมงูดำปลอมเป็นโจรดักปล้นเกวียนยาและข้าวของชาวบ้าน พวกมันมีทั้งอาวุธพิษและกำลังพลเหนือกว่า ชาวบ้านไร้ทางสู้',
      choices: [
        {
          text: 'รวบรวมจอมยุทธ์พเนจร วางแผนซุ่มโจมตีกำจัดพวกมัน',
          note: 'ตัดกำลังงูดำ ช่วยชาวบ้านสำเร็จ ได้ฉายา "จอมยุทธ์ไร้นาม"',
          effect: s => {
            s.hero.reputation += 12; s.flags.survivedAmbush = true; s.hero.powerBonus += 70;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 3;
            addLog('การซุ่มโจมตีเด็ดขาด กองโจรแตกพ่าย ชาวบ้านปลอดภัยและก้มกราบขอบคุณ', true);
          }
        },
        {
          text: 'ลอบสังหารหัวหน้าหน่วยในความมืด ปล่อยให้ลูกน้องแตกพ่าย',
          note: 'เด็ดขาด ว่องไว ได้ของกลางและเงินทอง',
          effect: s => {
            s.hero.money += 14; s.hero.powerBonus += 50; s.paths.insight += 2;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('หัวหน้าโจรล้มลงโดยไม่ทันร้อง กองโจรไร้ผู้นำหนีเตลิดไปคนละทิศ', true);
          }
        },
        {
          text: 'ช่วยชาวบ้านขนย้ายเสบียงหลบหนีเข้าป่าลึก',
          note: 'รักษาชีวิตคนเป็นหลัก ไม่เสี่ยงปะทะกับศัตรู',
          effect: s => {
            s.paths.compassion += 3; s.relations.friend += 8;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 1;
            addLog('ชาวบ้านทุกคนรอดชีวิต ข้าวของปลอดภัยแม้ต้องลำบากย้ายที่พัก');
          }
        }
      ]
    },
    route_nameless_martial_m180: {
      month: 180, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · มิตรสหาย', art: 'road',
      title: 'คำชวนจากสำนักเมฆาคราม',
      text: 'ศิษย์เซี่ยหลันลงเขามาพบหลินอันหลังได้ยินเรื่องฝีมือจากผู้เดินทาง เธอชวนเขาช่วยผู้คนรับศึกใหญ่ที่ใกล้เข้ามา',
      choices: [
        {
          text: 'ปฏิเสธฐานะศิษย์ แต่สัญญาจะช่วยป้องกันชาวบ้านเชิงเขา',
          note: 'รักษาจุดยืนอิสระและสร้างความสัมพันธ์กับเซี่ยหลัน',
          effect: s => {
            s.relations.senior += 12; s.paths.duty += 3; s.paths.freedom += 2;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('เซี่ยหลันพยักหน้าเข้าใจ "อยู่ข้างล่าง คุ้มครองผู้คน นั่นคือเต๋าของเจ้า"', true);
          }
        },
        {
          text: 'รับเงินว่าจ้างเป็นหน่วยรบนอกสำนัก คอยตีตัดเสบียงศัตรู',
          note: 'ได้เงินทอง 18 ตำลึง และช่วยตัดกำลังงูดำ',
          effect: s => {
            s.hero.money += 18; s.hero.powerBonus += 60;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('หลินอันรับงานตัดเสบียงงูดำ เป็นคมดาบนอกสำนักที่ศัตรูคาดไม่ถึง', true);
          }
        },
        {
          text: 'เตือนเธอให้ระวังคนทรยศในสำนัก แต่ไม่ขอเข้าร่วมศึกใด ๆ',
          requires: s => !!(s.flags.knowsTraitor || s.flags.houseEnemyKnown), locked: 'ต้องมีเบาะแสเกี่ยวกับคนทรยศก่อน',
          note: 'มอบเบาะแสสำคัญ รักษาระยะห่างเพื่ออิสรภาพ',
          effect: s => {
            s.flags.knowsTraitor = true; s.paths.insight += 3; s.paths.freedom += 3;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 1;
            addLog('คำเตือนเรื่องคนทรยศถูกส่งถึงเซี่ยหลัน หลินอันหันหลังกลับสู่เส้นทางของตน');
          }
        }
      ]
    },
    route_nameless_martial_m198: {
      month: 198, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · ช่องแคบ', art: 'road',
      title: 'ดาบเล่มสุดท้ายหน้าช่องแคบ',
      text: 'ก่อนวันศึกใหญ่ กองทหารแนวหน้างูดำพยายามยึดช่องแคบเชิงเขาเพื่อปิดทางหนีของชาวบ้าน หลินอันยืนตระหง่านอยู่หน้าช่องแคบนั้นเพียงลำพัง',
      choices: [
        {
          text: 'ปักดาบลงดิน ยืนขวางช่องแคบสกัดทหารศัตรู',
          note: 'สกัดทัพงูดำ ช่วยชาวบ้าน และได้ชื่อเสียงกับพลังรบ',
          effect: s => {
            s.hero.powerBonus += 100; s.hero.reputation += 18; s.flags.civiliansSaved = true;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 3;
            addLog('ดาบเดียวขวางพันคน ทหารงูดำไม่อาจผ่านช่องแคบ ชาวบ้านนับร้อยหนีรอดปลอดภัย', true);
          }
        },
        {
          text: 'วางกับดักหินถล่มปิดช่องแคบ ชะลอศัตรูด้วยปัญญา',
          note: 'ฉลาด รอบคอบ ชะลอศัตรูได้โดยไม่ต้องเสี่ยงบาดเจ็บ',
          effect: s => {
            s.paths.insight += 3; s.flags.civiliansSaved = true; s.hero.powerBonus += 50;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 2;
            addLog('หินผาถล่มลงมาปิดช่องแคบ ทหารงูดำต้องเสียเวลาอ้อมทาง ชาวบ้านหนีพ้น', true);
          }
        },
        {
          text: 'พาชาวบ้านข้ามช่องแคบหนีไปก่อนที่ทหารจะมาถึง',
          note: 'ช่วยชีวิตผู้คนสำเร็จ เน้นความปลอดภัยเป็นหลัก',
          effect: s => {
            s.paths.compassion += 3; s.flags.civiliansSaved = true;
            s.flags.namelessMartialProgress = (s.flags.namelessMartialProgress || 0) + 1;
            addLog('หลินอันนำทางพาชาวบ้านข้ามเขาอย่างปลอดภัยในคืนที่มืดมิด');
          }
        }
      ]
    },
    route_nameless_martial_m216: {
      month: 216, route: 'nameless-martial', tag: 'นักยุทธ์ไร้นาม · บทสรุป', art: 'road',
      title: 'เพลงดาบใต้จันทรา — บทสรุปของนักยุทธ์ไร้นาม',
      text: 'ศึกบนเขาเมฆาครามจบลงแล้ว เสียงระฆังเงียบหาย ผู้คนตามโรงน้ำชาและตลาดเล่าเรื่องนักยุทธ์ไร้นามผู้เคยผ่านเชิงเขา',
      choices: [
        {
          text: 'สะพายดาบออกเดินทางท่องยุทธภพ ช่วยเหลือผู้ยากไร้ต่อไป',
          note: 'บทสรุปตำนานจอมยุทธ์ไร้นาม',
          effect: s => {
            if (s.hero.reputation >= 20 && s.hero.powerBonus >= 150) {
              endGame('nameless_martial', { cause: 'หลินอันยืนหยัดด้วยกระบวนท่าและคุณธรรม กลายเป็นตำนานจอมยุทธ์ไร้นามที่ผู้คนเล่าขาน' });
            } else if (s.hero.reputation < -5) {
              endGame('outlaw', { cause: 'เพลงดาบเด็ดขาด แต่ความขัดแย้งทำให้ต้องเดินทางในฐานะจอมยุทธ์นอกทำเนียบ' });
            } else {
              endGame('war_shadow_survivor', { cause: 'ดาบหักแต่ชีวิตยังอยู่ หลินอันรอดจากศึกใหญ่โดยไม่ต้องก้มหัวให้สำนักใด' });
            }
          }
        },
        {
          text: 'เปิดสำนักดาบธรรมดาสอนวิชาป้องกันตัวให้คนรุ่นหลัง',
          note: 'บทสรุปอาจารย์ผู้ถ่ายทอดวิถียุทธ์',
          effect: s => {
            endGame('nameless_martial', { cause: 'หลินอันเปิดค่ายมวยธรรมดา ถ่ายทอดวิชาต่อสู้ให้ลูกหลานชาวบ้านยืนหยัดได้ด้วยตนเอง' });
          }
        },
        {
          text: 'วางดาบ ใช้ชีวิตสงบในหมู่บ้านที่เคยปกป้อง',
          note: 'บทสรุปจอมยุทธ์วางมือ',
          effect: s => {
            endGame('war_shadow_survivor', { cause: 'หลินอันเก็บดาบเข้าฝัก ใช้ชีวิตเรียบง่ายเคียงข้างชาวบ้านที่ตนเคยช่วยชีวิต' });
          }
        }
      ]
    },

    // ==========================================
    // 3. เส้นทางถนนสู่ดินแดนใหม่ (New Land)
    // ==========================================
    route_new_land_m90: {
      month: 90, route: 'new-land', tag: 'ดินแดนใหม่ · วัยสิบสองปี', art: 'road',
      title: 'ก้าวแรกพ้นประตูด่าน',
      text: 'หลินอันหันหลังให้ภูเขาเมฆาคราม มุ่งหน้าสู่ประตูด่านทิศประจิม ดินแดนที่ไม่มีใครรู้จักตระกูลหลินและไม่มีใครถามถึงอดีต',
      choices: [
        {
          text: 'สมัครเป็นเด็กช่วยงานคาราวานใหญ่แลกที่พักและอาหาร',
          note: 'เดินทางปลอดภัย ได้เงินและแผนที่เส้นทางข้ามแดน',
          effect: s => {
            s.hero.money += 8; s.flags.foundMap = true; s.paths.freedom += 2;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('หลินอันช่วยตรวจตราเกวียนและเสบียง คาราวานต้อนรับเด็กหนุ่มผู้ขยันขันแข็ง', true);
          }
        },
        {
          text: 'ซื้อเสบียงม้าและออกเดินทางร่วมกับกลุ่มนักเดินทางอิสระ',
          note: 'เน้นความเร็ว อิสรภาพพุ่งสูง',
          effect: s => {
            s.paths.freedom += 4; s.hero.money = Math.max(0, s.hero.money - 3);
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('สายลมทะเลทรายพัดผ่านใบหน้า หลินอันสูดหายใจแห่งอิสรภาพเป็นครั้งแรก', true);
          }
        },
        {
          text: 'รับจ้างนำทางและขนน้ำข้ามทะเลทรายผืนแรก',
          note: 'ได้ทักษะเอาตัวรอด ทรัพยากรน้ำและเสบียง',
          effect: s => {
            s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 8); s.hero.money += 5;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 1;
            addLog('หลินอันจดจำตำแหน่งบ่อน้ำและโอเอซิส ทักษะการเดินทางพัฒนาขึ้น');
          }
        }
      ]
    },
    route_new_land_m110: {
      month: 110, route: 'new-land', tag: 'ดินแดนใหม่ · พายุทราย', art: 'road',
      title: 'พายุทรายแห่งช่องเขาหมาป่า',
      text: 'พายุทรายสีเหลืองกระหน่ำช่องเขา ขบวนคาราวานหลงทิศ ม้าเริ่มตื่นตระหนก หลินอันต้องช่วยตัดสินใจทิศทางรอด',
      choices: [
        {
          text: 'ใช้เข็มทิศดวงดาวและสังเกตเนินหิน นำขบวนเข้าถ้ำบังลม',
          note: 'ช่วยคาราวานรอดพ้น ได้รับความนับถือจากหัวหน้าขบวน',
          effect: s => {
            s.paths.insight += 3; s.hero.money += 10; s.relations.friend += 8;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('ถ้ำหินช่วยชีวิตทุกคนในคาราวาน หัวหน้าขบวนมอบส่วนแบ่งพิเศษให้หลินอัน', true);
          }
        },
        {
          text: 'ปลดเกวียนสินค้าที่หนักทิ้ง รักษาม้าและชีวิตคนเดินทาง',
          note: 'เสียสินค้าบางส่วน แต่ทุกคนปลอดภัยไร้รอยขีดข่วน',
          effect: s => {
            s.paths.compassion += 2; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 6);
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('ทุกคนรอดพ้นพายุทราย ม้าและคนเดินทางปลอดภัยครบถ้วน', true);
          }
        },
        {
          text: 'ฝ่าพายุทรายไปข้างหน้า เสี่ยงเพื่อไปถึงโอเอซิสก่อนใคร',
          note: 'เสี่ยงสูง หากรอดได้รับกำไรจากการค้าพิเศษ',
          effect: s => {
            s.hero.money += 18; s.hero.health = Math.max(1, s.hero.health - 8);
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('ขบวนฝ่าพายุมาถึงโอเอซิสได้ก่อนใคร ขายสินค้าได้ราคาสูงลิ่ว', true);
          }
        }
      ]
    },
    route_new_land_m130: {
      month: 130, route: 'new-land', tag: 'ดินแดนใหม่ · โอเอซิส', art: 'road',
      title: 'เมืองโอเอซิสศิลาทอง',
      text: 'เมืองการค้ากลางทะเลทรายเต็มไปด้วยผู้คนหลากภาษา พ่อค้า หยก และผ้าไหม หลินอันเริ่มมองเห็นโอกาสตั้งตัวในแดนไกล',
      choices: [
        {
          text: 'นำเงินสะสมเปิดแผงค้าและนายหน้าแลกเปลี่ยนสินค้า',
          note: 'เริ่มกิจการค้าขายข้ามแดน ได้เงินสม่ำเสมอ',
          effect: s => {
            s.hero.money += 15; s.flags.hasShop = true;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('แผงค้าของหลินอันเปิดขึ้นในตลาดโอเอซิส สินค้าแปลกตาทำกำไรได้ดี', true);
          }
        },
        {
          text: 'เรียนรู้ภาษาต่างแดนและกฎหมายการค้าของชนเผ่าทะเลทราย',
          note: 'ได้ความรู้และเปิดเส้นทางการค้าลับในแดนประจิม',
          effect: s => {
            s.paths.insight += 3; s.relations.acquaintance += 8;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('หลินอันพูดคุยกับหัวหน้าเผ่าทะเลทรายได้อย่างคล่องแคล่ว เส้นทางค้าใหม่เปิดออก', true);
          }
        },
        {
          text: 'ซื้อสถานีพักม้าและบ่อน้ำเพื่อให้บริการคาราวาน',
          note: 'สร้างหลักประกันถาวรในเมืองใหม่',
          effect: s => {
            s.hero.money = Math.max(0, s.hero.money - 6); s.flags.hasStable = true;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('สถานีพักม้ามีคาราวานแวะเวียนมาไม่ขาดสาย รายได้มั่นคงยั่งยืน');
          }
        }
      ]
    },
    route_new_land_m150: {
      month: 150, route: 'new-land', tag: 'ดินแดนใหม่ · ขบวนเกวียน', art: 'road',
      title: 'ขบวนเกวียนเหยี่ยวดำ',
      text: 'หลินอันจัดตั้งคาราวานของตนเองชื่อ "คาราวานเหยี่ยวดำ" มีเกวียนสินค้าสิบเล่มพร้อมคนนำทาง ถึงเวลาเลือกเส้นทางค้าใหญ่',
      choices: [
        {
          text: 'ขนส่งหยกและผ้าไหมข้ามเทือกเขาหิมะ',
          note: 'กำไรมหาศาล เงินทองเพิ่มพูน',
          effect: s => {
            s.hero.money += 25; s.hero.reputation += 8;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 3;
            addLog('ผ้าไหมและหยกถูกขายในราคาทองคำ คาราวานเหยี่ยวดำมีชื่อเสียงข้ามแดน', true);
          }
        },
        {
          text: 'รับส่งจดหมายและผู้โดยสารที่ต้องการเริ่มต้นชีวิตใหม่',
          note: 'รายได้มั่นคง ได้มิตรภาพทั่วดินแดน',
          effect: s => {
            s.hero.money += 14; s.relations.friend += 10; s.paths.compassion += 2;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('ผู้แสวงโชคหลายสิบคนขอบคุณหลินอันที่พาพวกเขามาถึงดินแดนแห่งความหวัง', true);
          }
        },
        {
          text: 'บุกเบิกเส้นทางลัดสายใหม่ที่ไม่เคยมีในแผนที่',
          note: 'ค้นพบหุบเขาลับ ได้สมบัติโบราณล้ำค่า',
          effect: s => {
            s.paths.freedom += 4; addTreasure(s, 'หยกดวงดาวประจิม', { moneyValue: 30 });
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('หุบเขาลับเผยซากอารยธรรมโบราณ หลินอันได้หยกดวงดาวล้ำค่า', true);
          }
        }
      ]
    },
    route_new_land_m170: {
      month: 170, route: 'new-land', tag: 'ดินแดนใหม่ · จดหมาย', art: 'road',
      title: 'จดหมายจากแดนไกล',
      text: 'นกพิราบสื่อสารบินข้ามทะเลทรายมาถึง นำจดหมายข่าวจากแผ่นดินเดิม: พรรคงูดำกำลังรวบรวมไพร่พลและเตรียมถล่มสำนักเมฆาคราม',
      choices: [
        {
          text: 'เผาจดหมายทิ้ง ละทิ้งความแค้นในอดีต มุ่งสู่อนาคตใหม่',
          note: 'อิสรภาพเต็มร้อย ตัดขาดจากหนี้เลือดในอดีต',
          effect: s => {
            s.paths.freedom += 5; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 10);
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('เถ้ากระดาษปลิวหายไปกับสายลมทะเลทราย หลินอันเป็นอิสระจากเงาอดีตโดยสิ้นเชิง', true);
          }
        },
        {
          text: 'ส่งทองคำและเสบียงผ่านคนรู้จักกลับไปช่วยลุงโจวเงียบ ๆ',
          note: 'ส่งความช่วยเหลือโดยไม่เปิดเผยตัว ไม่ลืมบุญคุณ',
          requires: s => s.hero.money >= 15 && s.flags.retainerAlive, locked: 'ต้องมีเงิน 15 ตำลึงและลุงโจวยังมีชีวิต',
          effect: s => {
            s.hero.money -= 15; s.paths.compassion += 3;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('ทองคำและเสบียงถูกส่งถึงมือลุงโจวอย่างปลอดภัยในเงามืด', true);
          }
        },
        {
          text: 'เตือนพ่อค้าข้ามแดนให้ยุติการส่งสินค้าเข้าไปในเขตสงคราม',
          note: 'ปกป้องขบวนการค้าของตนและพันธมิตร',
          effect: s => {
            s.paths.insight += 3; s.relations.acquaintance += 6;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 1;
            addLog('คาราวานสินค้าหลีกเลี่ยงเส้นทางสงครามได้ทันเวลา ลดความเสียหายได้มหาศาล');
          }
        }
      ]
    },
    route_new_land_m186: {
      month: 186, route: 'new-land', tag: 'ดินแดนใหม่ · ปิดด่าน', art: 'road',
      title: 'ด่านชายแดนปิดตาย',
      text: 'ทหารชายแดนปิดประตูด่านห้ามคนเข้าออกเนื่องจากภัยสงคราม คาราวานสินค้าจำนวนมากติดค้างอยู่กลางทะเลทราย',
      choices: [
        {
          text: 'ใช้เส้นทางลับใต้เทือกเขาที่ตนเคยสำรวจ นำคาราวานอ้อมด่าน',
          note: 'พ้นด่านสำเร็จ สินค้าทำกำไรทวีคูณเพราะเป็นเจ้าเดียวที่ข้ามได้',
          effect: s => {
            s.hero.money += 30; s.hero.reputation += 10;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 3;
            addLog('คาราวานเหยี่ยวดำข้ามพ้นด่านผ่านทางลับ สินค้าขายได้ราคาทองคำ', true);
          }
        },
        {
          text: 'ตั้งค่ายพักแรมชั่วคราวและเปิดตลาดค้าขายหน้าประตูด่าน',
          note: 'เปลี่ยนวิกฤตเป็นโอกาส ค้าขายกับคนที่ติดค้าง',
          effect: s => {
            s.hero.money += 18; s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('ค่ายพักกลายเป็นตลาดชั่วคราวที่คึกคัก หลินอันกอบโกยกำไรเป็นกอบเป็นกำ', true);
          }
        },
        {
          text: 'ช่วยเหลือแจกจ่ายน้ำและเสบียงให้ผู้ลี้ภัยที่ด่าน',
          note: 'ได้ความรักและความภักดีจากผู้คนข้ามแดน',
          effect: s => {
            s.paths.compassion += 4; s.relations.friend += 10;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('ผู้ลี้ภัยนับร้อยรอดตายจากความเมตตาของหลินอัน ต่างสาบานว่าจะช่วยเหลืองานในอนาคต');
          }
        }
      ]
    },
    route_new_land_m202: {
      month: 202, route: 'new-land', tag: 'ดินแดนใหม่ · ยุคทอง', art: 'road',
      title: 'พายุหมุนแห่งทิศประจิม',
      text: 'สงครามในแผ่นดินเดิมทำให้พ่อค้า ช่างฝีมือ และผู้มีปัญญาอพยพมายังแดนประจิม เมืองใหม่เติบโตเป็นศูนย์กลางอารยธรรมแห่งใหม่',
      choices: [
        {
          text: 'รวบรวมช่างฝีมือและพ่อค้า จัดตั้งสมาคมการค้าเหยี่ยวดำ',
          note: 'ก้าวขึ้นเป็นผู้นำการค้าข้ามแดนแห่งยุค',
          effect: s => {
            s.hero.money += 40; s.hero.reputation += 20;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 3;
            addLog('สมาคมการค้าเหยี่ยวดำกลายเป็นกลุ่มอิทธิพลการค้าที่ใหญ่ที่สุดในแดนประจิม', true);
          }
        },
        {
          text: 'ซื้อบ้านในโอเอซิสสำหรับตนเอง',
          note: 'ใช้เงิน 45 ตำลึงเพื่อซื้อบ้าน พร้อมค่าดูแลรายเดือน',
          requires: s => s.hero.money >= 45, locked: 'ต้องมีเงิน 45 ตำลึง',
          effect: s => {
            s.hero.money -= 45; const h = ensureHousehold(s); h.housing = 'owned';
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('หลินอันซื้อบ้านในเมืองโอเอซิสเป็นที่พักของตน', true);
          }
        },
        {
          text: 'สนับสนุนทุนให้คนรุ่นใหม่ที่เดินทางมาแสวงโชค',
          note: 'สร้างเครือข่ายพันธมิตรรุ่นต่อไป',
          effect: s => {
            s.paths.compassion += 3; s.relations.friend += 12;
            s.flags.newLandProgress = (s.flags.newLandProgress || 0) + 2;
            addLog('คนรุ่นใหม่นับร้อยได้รับโอกาส ต่างนับถือหลินอันดั่งบิดาบุญธรรม');
          }
        }
      ]
    },
    route_new_land_m216: {
      month: 216, route: 'new-land', tag: 'ดินแดนใหม่ · บทสรุป', art: 'road',
      title: 'ขอบฟ้าใหม่ที่ไม่มีป้ายหลิน — บทสรุปแห่งดินแดนใหม่',
      text: 'ข่าวสงครามบนยอดเขาเมฆาครามมาถึงในฐานะเรื่องเล่าของแผ่นดินโบราณ หลินอันยืนอยู่บนกำแพงเมืองโอเอซิส มองดูกองคาราวานของตนมุ่งหน้าสู่ขอบฟ้าใหม่',
      choices: [
        {
          text: 'ขยายกองคาราวานสู่ทะเลใหญ่ทิศประจิม บุกเบิกเส้นทางใหม่ต่อไป',
          note: 'บทสรุปผู้บุกเบิกแห่งขอบฟ้า',
          effect: s => {
            if (s.hero.money >= 30 || s.paths.freedom >= 10) {
              endGame('new_land_wanderer', { cause: 'หลินอันตัดอดีตสำเร็จ สร้างชื่อและคาราวานในแดนใหม่ด้วยตนเอง' });
            } else {
              endGame('war_shadow_survivor', { cause: 'ข้ามพ้นแดนมาได้ แม้ยังต้องสะสมเงินทองใหม่ แต่ขอบฟ้าข้างหน้าเป็นของตนเอง' });
            }
          }
        },
        {
          text: 'ปักหลักเป็นคหบดีใหญ่ผู้คุมการค้าเมืองโอเอซิส',
          note: 'บทสรุปเจ้าเมืองการค้าผู้มั่งคั่ง',
          effect: s => {
            endGame('new_land_wanderer', { cause: 'หลินอันกลายเป็นเจ้าแห่งการค้าโอเอซิส มีชีวิตที่มั่งคั่งและสงบสุขไร้ผู้ใดรบกวน' });
          }
        },
        {
          text: 'ใช้ชีวิตอิสระ เดินทางสำรวจดินแดนลับต่อไป',
          note: 'บทสรุปนักเดินทางแห่งทะเลทราย',
          effect: s => {
            endGame('war_shadow_survivor', { cause: 'หลินอันไม่ผูกมัดกับสิ่งใด ขี่ม้าคู่ใจมุ่งหน้าสู่ดินแดนลับสุดขอบฟ้า' });
          }
        }
      ]
    },

    // ==========================================
    // 4. เส้นทางเงาตลาดมืด (Underworld)
    // ==========================================
    route_underworld_m90: {
      month: 90, route: 'underworld', tag: 'เงาตลาดมืด · วัยสิบสองปี', art: 'road',
      title: 'ตรอกจันทร์ดับกับสัญลักษณ์ลับ',
      text: 'หลินอันนำตราตลาดมืดที่เคยได้ในวัยเด็ก ก้าวเข้าสู่ตรอกจันทร์ดับหลังโรงเตี๊ยม ที่นี่ไม่มีกฎหมาย มีเพียงผลประโยชน์ ความลับ และคนที่อยู่ในเงา',
      choices: [
        {
          text: 'รับงานส่งจดหมายลับและฟังข่าวในบ่อน',
          note: 'ได้เงินทองและความปลอดภัย เริ่มสร้างประวัติในโลกมืด',
          effect: s => {
            s.hero.money += 10; s.paths.insight += 2;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('หลินอันส่งจดหมายลับสำเร็จ รู้จักคนกลางและเส้นทางหลบหนีในตรอก', true);
          }
        },
        {
          text: 'แอบดูโกดังสินค้าเถื่อนและจดบัญชีลับ',
          note: 'ได้ข้อมูลสำคัญ เสี่ยงถูกสงสัย',
          effect: s => {
            s.flags.knowsSmuggling = true; s.hero.money += 6; s.hero.health = Math.max(1, s.hero.health - 4);
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('บัญชีสินค้าเถื่อนถูกจดจำไว้ในสมอง ข้อมูลนี้มีค่าดั่งทองคำในอนาคต', true);
          }
        },
        {
          text: 'ช่วยเด็กรับใช้ในบ่อนที่กำลังถูกรังแก',
          note: 'ได้สายสืบเด็กผู้ภักดีในตรอกคอยส่งข่าว',
          effect: s => {
            s.paths.compassion += 2; s.relations.friend += 8;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 1;
            addLog('เด็กรับใช้ซาบซึ้งใจ สัญญาจะเป็นหูเป็นตาให้หลินอันในทุกบ่อนการพนัน', true);
          }
        }
      ]
    },
    route_underworld_m108: {
      month: 108, route: 'underworld', tag: 'เงาตลาดมืด · ค้าข่าว', art: 'road',
      title: 'ราคาของข่าวสาร',
      text: 'ข่าวการเคลื่อนไหวของสายสืบงูดำและข้อมูลคลังเสบียงสำนักมีคนยินดีจ่ายหนัก หลินอันได้เบาะแสสำคัญชิ้นแรก',
      choices: [
        {
          text: 'ขายข่าวการเคลื่อนทัพงูดำให้คนในสำนักแบบนิรนาม',
          note: 'ได้เงิน ได้ช่วยสำนักทางอ้อมโดยไม่เปิดเผยตัว',
          effect: s => {
            s.hero.money += 12; s.flags.warnedMaster = true; s.hero.reputation += 4;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('จดหมายนิรนามถูกส่งถึงหอผู้ตรวจการสำนัก หลินอันได้เงินและไม่ลืมคุณธรรม', true);
          }
        },
        {
          text: 'ขายข่าวการส่งยาของสำนักให้ตลาดมืดเพื่อผลตอบแทนสูงสุด',
          note: 'ได้เงินทองมหาศาล แต่ชื่อเสียงทางสว่างลดลง',
          effect: s => {
            s.hero.money += 22; s.hero.reputation -= 8;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 3;
            addLog('ทองคำหนักในย่ามแลกกับข่าวลับ หลินอันเริ่มคุ้นชินกับกลิ่นคาวเลือดของเงิน', true);
          }
        },
        {
          text: 'เก็บข้อมูลไว้เป็นหลักฐานเพื่อแบล็กเมลในอนาคต',
          note: 'ได้ไพ่ตายสำหรับการเผชิญหน้าครั้งต่อไป',
          effect: s => {
            s.paths.insight += 4; s.flags.knowsTraitor = true;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 1;
            addLog('ข้อมูลถูกซ่อนไว้ใต้แผ่นกระเบื้อง นี่คือมีดสั้นที่พร้อมปักหลังศัตรูในยามจำเป็น');
          }
        }
      ]
    },
    route_underworld_m126: {
      month: 126, route: 'underworld', tag: 'เงาตลาดมืด · ศึกชิงถิ่น', art: 'road',
      title: 'หนี้เลือดในโรงน้ำชา',
      text: 'หัวหน้าแก๊งคุมบ่อนเดิมพยายามบีบหลินอันให้ยอมจำนนและส่งส่วนแบ่งทั้งหมดให้ พวกมันส่งอันธพาลมาล้อมโรงน้ำชา',
      choices: [
        {
          text: 'วางแผนส่งหลักฐานบ่อนผิดกฎหมายให้นายอำเภอบุกจับ',
          note: 'กำจัดศัตรูด้วยมือทางการ ไม่ต้องเปื้อนเลือดเอง',
          effect: s => {
            s.paths.insight += 3; s.hero.reputation += 6;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('ทางการบุกทลายบ่อนคู่แข่ง หลินอันเข้ายึดกิจการต่ออย่างราบรื่น', true);
          }
        },
        {
          text: 'นำคนในตรอกบุกถล่มโรงบ่อน ยึดอำนาจเบ็ดเสร็จ',
          note: 'อำนาจใต้ดินพุ่งสูง แต่บาดเจ็บเล็กน้อย',
          effect: s => {
            s.hero.health = Math.max(1, s.hero.health - 8); s.hero.money += 18;
            s.hero.powerBonus += 40; s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 3;
            addLog('หลินอันลงมือเด็ดขาด อันธพาลยอมสยบ เขาขึ้นเป็นผู้คุมตรอกคนใหม่', true);
          }
        },
        {
          text: 'เจรจาขอแบ่งเขตการค้าและทำข้อตกลงร่วมกัน',
          note: 'ประนีประนอม ได้พันธมิตรในเงามืด',
          effect: s => {
            s.relations.friend += 8; s.hero.money += 8;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 1;
            addLog('ข้อตกลงลับถูกลงนาม ทั้งสองฝ่ายแบ่งปันผลประโยชน์ร่วมกัน');
          }
        }
      ]
    },
    route_underworld_m144: {
      month: 144, route: 'underworld', tag: 'เงาตลาดมืด · ประมูลมืด', art: 'road',
      title: 'การประมูลในห้องใต้ดิน',
      text: 'ของมีค่าที่ถูกปล้นมาจากตระกูลหลินหลุดมาในงานประมูลมืด: ป้ายหยกประจำตระกูลหลินชิ้นที่สอง',
      choices: [
        {
          text: 'ทุ่มเงินประมูลกลับคืนมาด้วยความภาคภูมิ',
          note: 'ได้มรดกตระกูลกลับคืนมาอย่างถูกต้อง',
          requires: s => s.hero.money >= 20, locked: 'ต้องมีเงิน 20 ตำลึง',
          effect: s => {
            s.hero.money -= 20; s.flags.familyToken = true; addTreasure(s, 'ป้ายหยกตระกูลหลินสมบูรณ์', { defense: 6 });
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('ป้ายหยกกลับคืนสู่มือทายาท หลินอันลูบรอยตราด้วยน้ำตาซึม', true);
          }
        },
        {
          text: 'ลอบวางเพลิงแล้วขโมยป้ายหยกออกมาในความวุ่นวาย',
          note: 'ได้ของโดยไม่เสียเงิน แต่สร้างความวุ่นวายในโลกมืด',
          effect: s => {
            s.flags.familyToken = true; addTreasure(s, 'ป้ายหยกตระกูลหลินสมบูรณ์', { defense: 6 }); s.hero.reputation -= 10; s.hero.money += 10;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 3;
            addLog('เพลิงไหม้เบี่ยงเบนความสนใจ หลินอันคว้าป้ายหยกหายเข้าเงามืดอย่างลอยนวล', true);
          }
        },
        {
          text: 'ปล่อยให้คนอื่นประมูลไป แล้วตามไปรีดไถข้อมูลจากผู้ชนะ',
          note: 'ได้ข้อมูลเส้นทางเงินของงูดำแทน',
          effect: s => {
            s.paths.insight += 4; s.hero.money += 12;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 1;
            addLog('ข้อมูลเส้นทางเงินของงูดำถูกบันทึกไว้ หลินอันเริ่มมองเห็นโครงข่ายของศัตรู');
          }
        }
      ]
    },
    route_underworld_m162: {
      month: 162, route: 'underworld', tag: 'เงาตลาดมืด · ข้อเสนองูดำ', art: 'road',
      title: 'ข้อตกลงกับอสรพิษ',
      text: 'ตัวแทนพรรคงูดำติดต่อหลินอันโดยตรง ยื่นทองคำก้อนโตเพื่อขอใช้เส้นทางใต้ดินในการลอบส่งกำลังพลเข้าโจมตีสำนัก',
      choices: [
        {
          text: 'ปฏิเสธอย่างเด็ดขาดและส่งข่าวเตือนชาวเมืองลับ ๆ',
          note: 'รักษาศีลธรรม ไม่ยอมร่วมมืองูดำ',
          effect: s => {
            s.paths.compassion += 4; s.hero.reputation += 8; s.flags.warnedMaster = true;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('หลินอันปฏิเสธทองคำเปื้อนเลือด ส่งข่าวเตือนชาวเมืองให้เตรียมรับมือ', true);
          }
        },
        {
          text: 'รับทองคำและยอมเปิดเส้นทางลับให้พวกมัน',
          note: 'ได้เงินทองมหาศาล 35 ตำลึง ก้าวสู่อำนาจมืดเต็มตัว',
          effect: s => {
            s.hero.money += 35; s.hero.reputation -= 20; s.flags.betrayedSect = true;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 4;
            addLog('ทองคำหนักในหีบแลกกับเส้นทางลับ หลินอันเลือกข้างผู้ชนะตามสัญชาตญาณมืด', true);
          }
        },
        {
          text: 'รับเงินทองมา แล้วแจ้งทางการและจัดกับดักซุ่มโจมตี',
          note: 'ตลบหลังศัตรู ได้ทั้งเงินทองและตัดกำลังงูดำ',
          effect: s => {
            s.hero.money += 20; s.flags.misdirectionSuccessful = true; s.hero.powerBonus += 50;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 3;
            addLog('หลินอันตลบหลังงูดำ กองกำลังศัตรูหลงเข้ากับดักในอุโมงค์มืด', true);
          }
        }
      ]
    },
    route_underworld_m180: {
      month: 180, route: 'underworld', tag: 'เงาตลาดมืด · เจ้าพ่อเงา', art: 'road',
      title: 'เครือข่ายใต้ดินแผ่ขยาย',
      text: 'หลินอันกลายเป็น "นายหน้าหลิน" แห่งตลาดมืด ข่าวสารและสินค้าเถื่อนทั่วชายแดนต้องผ่านการอนุมัติจากเขา',
      choices: [
        {
          text: 'จัดระเบียบตลาดมืด ห้ามค้ายาพิษและค้าทาส คุมเฉพาะข่าวสารและของมีค่า',
          note: 'กลายเป็น "เจ้าพ่อคุณธรรม" ได้รับความเคารพจากคนทุกระดับ',
          effect: s => {
            s.paths.compassion += 3; s.hero.reputation += 10; s.hero.money += 15;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('ตลาดมืดมีกฎระเบียบชัดเจน ผู้คนในตรอกยกย่องหลินอันดั่งผู้พิทักษ์ในเงามืด', true);
          }
        },
        {
          text: 'ขยายธุรกิจทุกประเภท กอบโกยกำไรมหาศาลเพื่อความมั่งคั่งสูงสุด',
          note: 'เงินทองล้นคลัง มีอิทธิพลล้นฟ้าในโลกมืด',
          effect: s => {
            s.hero.money += 35; s.hero.reputation -= 12;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 3;
            addLog('ทองคำไหลเข้าคลังดั่งสายน้ำ อำนาจของหลินอันในโลกมืดไม่มีผู้ใดกล้าท้าทาย', true);
          }
        },
        {
          text: 'ใช้เครือข่ายช่วยเหลือผู้ถูกรังแกและคุ้มกันคนยากไร้ในเงามืด',
          note: 'ได้ความจงรักภักดีจากชาวตรอกมืดอย่างแท้จริง',
          effect: s => {
            s.relations.friend += 14; s.paths.compassion += 4;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 2;
            addLog('คนยากจนในตรอกมืดต่างสาบานจะยอมตายแทนหลินอัน เครือข่ายสายลับเหนียวแน่น');
          }
        }
      ]
    },
    route_underworld_m198: {
      month: 198, route: 'underworld', tag: 'เงาตลาดมืด · ก่อนสงคราม', art: 'road',
      title: 'กำไรก่อนสงครามหรือทางรอดของผู้คน',
      text: 'สงครามใหญ่ใกล้ระเบิด ราคาตั๋วหนีเมือง อาวุธ และเสบียงในตลาดมืดพุ่งสูงขึ้นหลายเท่าตัว พ่อค้าหน้าเลือดกักตุนสินค้า',
      choices: [
        {
          text: 'ควบคุมราคาอาวุธและจัดเส้นทางอพยพราคาถูกให้คนจน',
          note: 'เสียสละกำไร ได้รับการจดจำดั่งเทพพิทักษ์แห่งตรอกมืด',
          effect: s => {
            s.flags.civiliansSaved = true; s.hero.reputation += 15; s.paths.compassion += 4;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 3;
            addLog('คนจนนับร้อยหนีพ้นไฟสงครามผ่านทางลับของหลินอัน ชื่อของเขาถูกจารึกด้วยน้ำตาซาบซึ้ง', true);
          }
        },
        {
          text: 'ขายข่าวและเส้นทางหนีให้ขุนนางและเศรษฐีในราคาสูงลิ่ว',
          note: 'กอบโกยทองคำนับร้อยตำลึง มั่งคั่งสูงสุด',
          effect: s => {
            s.hero.money += 50; s.hero.reputation -= 10;
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 3;
            addLog('หีบทองคำจากเศรษฐีวางเรียงรายในคลังลับ หลินอันรวยล้นฟ้าก่อนวันสงคราม', true);
          }
        },
        {
          text: 'จัดเตรียมเรือและทางลับสำหรับตนเองและคนใกล้ชิด',
          note: 'เน้นความปลอดภัยส่วนตัวสูงสุด',
          effect: s => {
            s.flags.escapePrepared = true; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 8);
            s.flags.underworldProgress = (s.flags.underworldProgress || 0) + 1;
            addLog('ทางลับและเรือเร็วพร้อมออกเดินทาง หลินอันเตรียมพร้อมสำหรับทุกสถานการณ์');
          }
        }
      ]
    },
    route_underworld_m216: {
      month: 216, route: 'underworld', tag: 'เงาตลาดมืด · บทสรุป', art: 'road',
      title: 'ราตรีแห่งการชำระแค้น — ผู้คุมตลาดมืดในคืนไฟสงคราม',
      text: 'คืนสำนักแตก ไฟสงครามลามถึงเชิงเขา หลินอันยืนอยู่บนหลังคาโรงเตี๊ยมจันทร์ดับ มองดูผู้คนและกองกำลังที่เคลื่อนไหวในความมืดตามคำสั่งของเขา',
      choices: [
        {
          text: 'ส่งคนในเครือข่ายเข้าช่วยคุ้มกันชาวบ้านและผู้ลี้ภัยจากสงคราม',
          note: 'บทสรุปผู้พิทักษ์แห่งเงามืด',
          effect: s => {
            if (s.flags.betrayedSect) {
              endGame('traitor_kingpin', { cause: 'หลินอันเลือกอำนาจและผลประโยชน์ เปิดทางให้งูดำยึดเมืองจนขึ้นเป็นใหญ่' });
            } else if (s.hero.reputation < -10) {
              endGame('outlaw', { cause: 'หลินอันเป็นคนในเงามืด แม้มีชีวิตรอดแต่ต้องอยู่นอกกฎหมายไปตลอดชีวิต' });
            } else {
              endGame('outlaw', { cause: 'หลินอันใช้ชีวิตในเงามืด แต่ตรอกมืดยังจำได้ว่าเขาไม่เคยทอดทิ้งพวกพ้อง' });
            }
          }
        },
        {
          text: 'นำกำลังใต้ดินเข้ากวาดล้างศัตรูที่เหลือ ยึดอำนาจคุมเมืองอย่างเบ็ดเสร็จ',
          note: 'บทสรุปเจ้าพ่อตลาดมืดผู้ไร้เทียมทาน',
          effect: s => {
            if (s.flags.betrayedSect) {
              endGame('traitor_kingpin', { cause: 'หลินอันกวาดล้างทุกขั้วอำนาจ สถาปนาตนเป็นขุนพลคุมแดนเหนือในเงามืด' });
            } else {
              endGame('outlaw', { cause: 'หลินอันขึ้นเป็นเจ้าพ่อคุมโลกใต้ดิน ยึดกุมเศรษฐกิจเงาของเมืองไว้ในมือ' });
            }
          }
        },
        {
          text: 'เก็บกวาดทรัพย์สินและหลักฐาน แล้วหายตัวไปในเงามืดอย่างไร้ร่องรอย',
          note: 'บทสรุปนายหน้าเงาผู้สาบสูญ',
          effect: s => {
            endGame('war_shadow_survivor', { cause: 'สงครามเปลี่ยนมือผู้คุมเมือง หลินอันรอดมาได้พร้อมทรัพย์สินและความลับมากมาย' });
          }
        }
      ]
    }
  };

    return { STORY_CHARACTER_EVENTS, EVENTS, ALTERNATE_ROUTE_EVENTS };
  };

  Object.defineProperty(window, 'OneLifeStoryEventCatalog', { value: createStoryEventCatalog });
})();
