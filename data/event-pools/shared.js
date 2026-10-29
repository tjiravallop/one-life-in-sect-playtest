(() => {
  'use strict';
  window.OneLifeEventPoolParts = window.OneLifeEventPoolParts || Object.create(null);
  window.OneLifeEventPoolParts['shared'] = function(deps) {
    const {$, addFamilyChronicle, addLog, addTreasure, advanceCultivationStage, canCraft, clamp, cultivationAtCeiling, effectiveCraftCost, endGame, ensureExplorationState, ensureFamilyState, ensureHousehold, ensureLifespanState, ensureQuestState, ensureRelationshipState, ensureSocialState, equippedCultivationTechnique, explorationRoute, extendTravel, familyAllowed, freeLifeLocationWeight, getAvailableExplorationAreas, hasLearningItem, learningLocationKey, learningTeacher, restLocationKey, restRoute, revealRoot, scopedEpicEvent, socialRoute} = deps;
  const WORLD_EVENTS = [
    { id: 'lin_house_falls', worldMonth: 0, region: 'north-city', duration: 1, title: 'คืนตระกูลหลินล่มสลาย', news: 'ข่าวจากเมืองเหนือ: ตระกูลหลินถูกทำลาย เด็กทายาทหายสาบสูญ', importance: 'major' },
    {
      id: 'world_caravan_beacon', worldMonth: 48, region: 'border-town', duration: 1, title: 'คาราวานทิศประจิมมาถึงเมืองหน้าด่าน',
      news: 'คาราวานจากทิศประจิมนำข่าวเส้นทางใหม่และเสบียงเข้ามา แต่มีคนตามหาหีบสินค้าหายจากขบวน', importance: 'major', intervention: true,
      interventionChoices: [
        { outcome: 'escort_caravan', text: 'ช่วยคุ้มกันคาราวาน', note: 'เมืองได้เสบียง ราคาสมุนไพรลดลง และเส้นทางปลอดภัยขึ้น', hero: { money: 4, reputation: 3 }, paths: { compassion: 1 } },
        { outcome: 'take_caravan_map', text: 'ขอแลกแผนที่กับแรงงาน', note: 'ได้ความรู้เส้นทาง แต่คาราวานเสียเวลาจัดขบวน', hero: { money: 2 }, paths: { freedom: 1 } },
        { outcome: 'ignore_caravan', text: 'ไม่เข้าไปยุ่ง', note: 'ข่าวยังแพร่ไปตามตลาด แต่ไม่มีใครช่วยคุ้มกันขบวน', hero: {}, paths: {} }
      ],
      outcomes: {
        escort_caravan: { news: 'คาราวานทิศประจิมเดินทางถึงเมืองอย่างปลอดภัย เสบียงเริ่มกลับมาและทางตะวันตกเปิดกว้างขึ้น', modifiers: { herbPrice: -.2, travelRisk: -2, guardPresence: -1 } },
        take_caravan_map: { news: 'แผนที่เส้นทางใหม่ถูกแลกเปลี่ยนในเมือง ทำให้ผู้เดินทางเริ่มกระจายออกจากถนนหลัก', modifiers: { herbPrice: -.1, travelRisk: -1 } },
        ignore_caravan: { news: 'คาราวานทิศประจิมผ่านเมืองไปโดยไร้ผู้คุ้มกัน ข่าวโจรบนถนนเริ่มแพร่กระจาย', modifiers: { travelRisk: 2 } }
      }
    },
    {
      id: 'world_sect_rival_council', worldMonth: 100, region: 'cloud-sect', duration: 1, title: 'สภาศิษย์เก่าแตกเป็นสองฝ่าย',
      news: 'สำนักเมฆาครามถกเถียงเรื่องเสบียงและแนวป้องกัน ฝ่ายเก่ากับฝ่ายศิษย์ใหม่เริ่มไม่ไว้ใจกัน', importance: 'major', intervention: true,
      interventionChoices: [
        { outcome: 'support_sect_council', text: 'ช่วยประสานศิษย์สองฝ่าย', note: 'ความขัดแย้งลดลงและสำนักมีกำลังคุ้มกันเพิ่ม', hero: { reputation: 4 }, relations: { senior: 3 }, paths: { duty: 1 } },
        { outcome: 'expose_sect_shortage', text: 'เปิดบัญชีเสบียงต่อหน้าสภา', note: 'ความจริงถูกเปิดเผย ราคาของสมุนไพรสูงขึ้นชั่วคราว', hero: { reputation: 2 }, paths: { insight: 2 } },
        { outcome: 'ignore_sect_council', text: 'เก็บตัวฝึกต่อ', note: 'ไม่เสียศัตรู แต่ปล่อยให้ความแตกแยกสะสม', hero: {}, relations: {}, paths: {} }
      ],
      outcomes: {
        support_sect_council: { news: 'ศิษย์สองฝ่ายยอมจับมือชั่วคราว สำนักเมฆาครามเริ่มเสริมเวรยามก่อนฤดูศึก', modifiers: { guardPresence: -2, travelRisk: -1 } },
        expose_sect_shortage: { news: 'บัญชีเสบียงสำนักถูกเปิดเผย พ่อค้ากักสมุนไพรและรอดูท่าทีของสงคราม', modifiers: { herbPrice: .35, guardPresence: 1, travelRisk: 1 } },
        ignore_sect_council: { news: 'สภาศิษย์เก่ายังไม่ลงรอย คำสั่งเวรยามของสำนักเริ่มล่าช้า', modifiers: { guardPresence: 2, travelRisk: 3 } }
      }
    },
    {
      id: 'world_pine_road_ambush', worldMonth: 116, region: 'western-border', duration: 1, title: 'ลูกศรกลางป่าสนปิดถนนตะวันตก',
      news: 'ขบวนเดินทางหลายสายถูกซุ่มโจมตีในป่าสน ผู้ลี้ภัยจากหมู่บ้านชายแดนเริ่มหาทางเข้าสู่เมือง', importance: 'major', intervention: true,
      interventionChoices: [
        { outcome: 'clear_pine_road', text: 'ช่วยเปิดทางให้ขบวนผู้ลี้ภัย', note: 'เสียสุขภาพเล็กน้อย แต่ลดความเสี่ยงบนเส้นทางและช่วยคนได้', hero: { health: -6, reputation: 5 }, paths: { compassion: 2 } },
        { outcome: 'warn_pine_road', text: 'ส่งข่าวเตือนเมืองล่วงหน้า', note: 'ไม่ต้องปะทะโดยตรง แต่เมืองจะกักเสบียงและขึ้นราคา', hero: { money: -2 }, paths: { insight: 1 } },
        { outcome: 'cross_pine_road', text: 'ผ่านทางลับคนเดียว', note: 'รักษาแรงของตนเอง แต่โจรยังคุมถนนหลัก', hero: { health: -2 }, paths: { freedom: 1 } }
      ],
      outcomes: {
        clear_pine_road: { news: 'ถนนป่าสนเปิดให้ผู้ลี้ภัยผ่านได้อีกครั้ง เมืองรับคนเพิ่มแต่ความเสี่ยงระหว่างทางลดลง', modifiers: { refugeePressure: 5, herbPrice: .2, travelRisk: -4, guardPresence: -1 } },
        warn_pine_road: { news: 'เมืองชายแดนปิดคลังบางส่วนหลังได้รับข่าวซุ่มโจมตี สมุนไพรและเสบียงเริ่มแพงขึ้น', modifiers: { refugeePressure: 3, herbPrice: .35, travelRisk: 1, guardPresence: 1 } },
        cross_pine_road: { news: 'โจรยังคุมถนนป่าสน ผู้เดินทางจึงต้องอ้อมทางไกลและเสี่ยงมากขึ้น', modifiers: { travelRisk: 5, guardPresence: 1 } }
      }
    },
    {
      id: 'world_mask_unveiled', worldMonth: 196, region: 'cloud-sect', duration: 1, title: 'บัญชีหน้ากากถูกเปิดเผย',
      news: 'เอกสารลับเผยว่ามีคนในสำนักส่งเส้นทางให้ศัตรู ความไว้วางใจระหว่างศิษย์สั่นคลอน', importance: 'major', intervention: true,
      interventionChoices: [
        { outcome: 'expose_mask_network', text: 'ช่วยตรวจสอบบัญชีลับ', note: 'จับสายลับได้บางส่วน สำนักคุมประตูเข้มขึ้นแต่ผู้คนเดินทางลำบาก', hero: { reputation: 5 }, paths: { insight: 2 } },
        { outcome: 'protect_wen_truth', text: 'ยืนยันความบริสุทธิ์ของผู้บริสุทธิ์', note: 'รักษาความสัมพันธ์และลดการลงโทษผิดคน', hero: { reputation: 3 }, relations: { master: 4 }, paths: { compassion: 2 } },
        { outcome: 'sell_mask_news', text: 'ขายข่าวให้ตลาดมืด', note: 'ได้เงินทันที แต่ศัตรูรู้ตัวและเส้นทางอันตรายขึ้น', hero: { money: 18, reputation: -8 }, paths: { freedom: 1 } }
      ],
      outcomes: {
        expose_mask_network: { news: 'เครือข่ายส่งข่าวในสำนักถูกเปิดโปง ประตูเขาถูกคุมเข้มและการลอบโจมตีลดลง', modifiers: { guardPresence: -3, travelRisk: -2, herbPrice: .1 } },
        protect_wen_truth: { news: 'บัญชีลับถูกตรวจใหม่ ผู้บริสุทธิ์รอดจากการลงโทษและศิษย์บางส่วนกลับมาร่วมมือกัน', modifiers: { guardPresence: -1, travelRisk: -1 } },
        sell_mask_news: { news: 'ข่าวบัญชีลับหลุดสู่ตลาดมืด งูดำเริ่มขยับกำลังและเส้นทางภูเขาไม่ปลอดภัย', modifiers: { guardPresence: 2, travelRisk: 6, herbPrice: .25 } }
      }
    },
    {
      id: 'world_lantern_vow', worldMonth: 210, region: 'cloud-sect', duration: 1, title: 'คำมั่นใต้แสงตะเกียง',
      news: 'ก่อนหิมะละลาย สำนักต้องเลือกระหว่างเสริมกำแพง อพยพผู้คน หรือซ่อนเสบียงไว้ตามทางลับ', importance: 'major', intervention: true,
      interventionChoices: [
        { outcome: 'prepare_refugee_route', text: 'ช่วยเตรียมเส้นทางอพยพ', note: 'ผู้คนรอดมากขึ้น แต่เสบียงในสำนักลดลง', hero: { money: -4, reputation: 4 }, paths: { compassion: 2 } },
        { outcome: 'reinforce_sect_wall', text: 'ช่วยเสริมกำแพงสำนัก', note: 'แนวป้องกันแข็งแรงขึ้นและลดความเสี่ยงของศึก', hero: { health: -4, reputation: 3 }, paths: { duty: 2 } },
        { outcome: 'hide_sect_supplies', text: 'ซ่อนเสบียงตามทางลับ', note: 'เปิดทางรอดสำรอง แต่การเดินทางหลังศึกจะยากขึ้น', hero: { money: 3 }, paths: { freedom: 2 } }
      ],
      outcomes: {
        prepare_refugee_route: { news: 'เส้นทางอพยพใต้แสงตะเกียงพร้อมใช้งาน ผู้คนจากเชิงเขาจะมีทางหนีเมื่อศึกมาถึง', modifiers: { refugeePressure: -3, herbPrice: .25, travelRisk: -2 } },
        reinforce_sect_wall: { news: 'กำแพงเมฆาครามได้รับการเสริมก่อนหิมะละลาย สำนักพร้อมรับแรงปะทะมากขึ้น', modifiers: { guardPresence: -3, travelRisk: -3 } },
        hide_sect_supplies: { news: 'เสบียงลับถูกซ่อนไว้สามจุด ผู้รู้เส้นทางมีน้อยลงแต่ยังมีทางรอดหลังศึก', modifiers: { refugeePressure: 2, travelRisk: 2, herbPrice: .1 } }
      }
    },
    { id: 'world_market_shortage', worldMonth: 64, region: 'border-town', duration: 1, title: 'ตลาดชายแดนขาดสมุนไพร', news: 'พ่อค้ากักสมุนไพรหลังถนนตะวันตกมีโจรชุก ราคายาและวัตถุดิบเริ่มสูงขึ้น', importance: 'minor', autoOutcome: 'shortage', outcomes: { shortage: { news: 'ตลาดชายแดนขาดสมุนไพรต่อเนื่อง สำนักและหมอยาเริ่มแย่งซื้อเสบียง', modifiers: { herbPrice: .3, travelRisk: 1 } } } },
    { id: 'world_mountain_quake', worldMonth: 108, region: 'western-border', duration: 1, title: 'แผ่นดินไหวเปิดทางเขา', news: 'แรงสั่นสะเทือนทำให้ทางผ่านภูเขาเปิดและปิดสลับกัน ผู้เดินทางต้องเปลี่ยนเส้นทาง', importance: 'minor', autoOutcome: 'quake', outcomes: { quake: { news: 'ทางเขาถูกเปิดใหม่บางส่วน แต่หินถล่มทำให้การเดินทางเสี่ยงขึ้นในช่วงสั้น ๆ', modifiers: { travelRisk: 3, guardPresence: -1 } } } },
    { id: 'world_refugee_camp', worldMonth: 128, region: 'cloud-sect', duration: 1, title: 'ค่ายผู้ลี้ภัยตั้งใต้เชิงเขา', news: 'ผู้ลี้ภัยจากหมู่บ้านตะวันตกตั้งค่ายใต้เชิงเขาเมฆา สำนักต้องแบ่งเสบียงช่วยเหลือ', importance: 'minor', autoOutcome: 'refugees', outcomes: { refugees: { news: 'ค่ายผู้ลี้ภัยใต้เชิงเขาขยายตัว สำนักแบ่งเสบียงและเมืองชายแดนเริ่มรับคนเพิ่ม', modifiers: { refugeePressure: 7, herbPrice: .2, travelRisk: 1 } } } },
    { id: 'world_snowmelt_signal', worldMonth: 214, region: 'cloud-sect', duration: 1, title: 'หิมะละลายก่อนเวลา', news: 'หิมะบนช่องเขาละลายเร็วกว่าปกติ เสียงกลองจากแนวหน้าดังมาถึงสำนักเมฆาคราม', importance: 'minor', autoOutcome: 'signal', outcomes: { signal: { news: 'หิมะละลายเปิดทางให้กองกำลังเคลื่อนเร็วขึ้น ทุกฝ่ายเร่งเตรียมรับศึกใหญ่', modifiers: { guardPresence: 2, travelRisk: 4, herbPrice: .15 } } } },
    { id: 'cloud_sect_invasion', worldMonth: 216, region: 'cloud-sect', duration: 1, title: 'คืนสำนักเมฆาครามถูกบุก', news: 'ข่าวด่วนจากภูเขาเมฆาคราม: สำนักถูกกองกำลังงูดำบุก', importance: 'major', intervention: true }
  ];
  const MIDDLE_GAME_EVENTS = [
    { id: 'middle_rival_sect', activity: 'sect', minMonth: 84, title: 'สำนักคู่แข่งส่งสารท้าทาย', text: 'สำนักหุบเขาแดงส่งสารกล่าวหาว่าเมฆาครามแย่งเส้นทางค้าและศิษย์ของพวกเขา ความขัดแย้งยังแก้ได้ด้วยคำพูดหรือฝีมือ', choices: [
      { text: 'ขอเจรจาแบ่งเส้นทาง', effects: [{ type: 'faction', key: 'sect', value: 3 }, { type: 'stat', path: 'hero.reputation', value: 3 }, { type: 'path', key: 'compassion', value: 2 }], effect: s => { s.flags.rivalSectTreaty = true; addLog('สำนักคู่แข่งยอมแบ่งเส้นทางค้า ชื่อของเจ้าเริ่มมีน้ำหนักในสภาสำนัก', true); } },
      { text: 'รับคำประลองแทนสำนัก', effects: [{ type: 'stat', path: 'hero.health', value: -10 }, { type: 'stat', path: 'hero.powerBonus', value: 45 }, { type: 'path', key: 'duty', value: 2 }], effect: s => { s.flags.rivalSectDuel = true; addLog('เจ้ารับคำประลองแทนสำนัก แม้บาดเจ็บแต่ไม่ยอมให้ชื่อเมฆาครามถูกเหยียบ', true); } },
      { text: 'ปล่อยให้ผู้อาวุโสตัดสิน', effects: [{ type: 'path', key: 'freedom', value: 1 }], effect: s => addLog('เจ้าถอยออกจากการเมืองสำนัก และเก็บข้อมูลความขัดแย้งไว้เงียบ ๆ') }
    ] },
    { id: 'middle_sect_politics', activity: 'sect', minMonth: 96, title: 'เสียงกระซิบในสภาศิษย์', text: 'ศิษย์อาวุโสสองฝ่ายผลักดันคนละแนวทาง ฝ่ายหนึ่งต้องการส่งกำลังไปช่วยเมือง อีกฝ่ายต้องการเก็บกำลังไว้ป้องกันสำนัก', choices: [
      { text: 'สนับสนุนการช่วยเมือง', effects: [{ type: 'faction', key: 'sect', value: 2 }, { type: 'stat', path: 'hero.reputation', value: 4 }, { type: 'path', key: 'compassion', value: 2 }], effect: s => { s.flags.sectCivicFaction = true; addLog('สภาสำนักส่งกำลังช่วยเมือง ผู้คนภายนอกเริ่มเชื่อใจเมฆาคราม', true); } },
      { text: 'สนับสนุนการรักษากำลัง', effects: [{ type: 'stat', path: 'hero.powerBonus', value: 35 }, { type: 'path', key: 'duty', value: 2 }], effect: s => { s.flags.sectFortressFaction = true; addLog('สำนักเก็บกำลังไว้ได้มากขึ้น แต่เมืองชายแดนจำการตัดสินใจนี้ไว้', true); } }
    ] },
    { id: 'middle_disciple_traitor', activity: 'any', minMonth: 108, unlock: s => !!s.flags?.metSect && ((s.relations?.senior || 0) >= 8 || s.flags?.knowsTraitor), title: 'ศิษย์ร่วมรุ่นผู้ส่งข่าว', text: 'เจ้าพบรอยหมึกงูดำบนใบขอเบิกเสบียง ศิษย์ร่วมรุ่นคนหนึ่งอาจส่งข้อมูลให้คนนอก แต่หลักฐานยังไม่พอจะกล่าวหาใคร', choices: [
      { text: 'ติดตามรอยหมึกอย่างลับ ๆ', effects: [{ type: 'path', key: 'insight', value: 3 }, { type: 'stat', path: 'hero.reputation', value: 2 }], effect: s => { s.flags.discipleTraitorTracked = true; s.flags.knowsTraitor = true; addLog('เจ้าตามรอยหมึกจนพบว่าศิษย์ทรยศยังไม่ได้ส่งข้อมูลทั้งหมด ความจริงใกล้เปิดเผย', true); } },
      { text: 'แจ้งอาจารย์ทันที', effects: [{ type: 'relation', key: 'master', value: 6 }, { type: 'path', key: 'duty', value: 2 }], effect: s => { s.flags.warnedMaster = true; addLog('อาจารย์สั่งตรวจบัญชีใหม่และป้องกันไม่ให้ความสงสัยกลายเป็นการลงโทษผิดคน', true); } },
      { text: 'แบล็กเมลศิษย์คนนั้น', effects: [{ type: 'stat', path: 'hero.money', value: 12 }, { type: 'stat', path: 'hero.reputation', value: -4 }, { type: 'path', key: 'freedom', value: 2 }], effect: s => { s.flags.debtProvoked = true; addLog('เจ้าบังคับให้ศิษย์ทรยศจ่ายเงินแลกกับความเงียบ ข่าวนี้อาจย้อนกลับมาทวงราคาในภายหลัง'); } }
    ] },
    { id: 'middle_black_market', minAge: 12, activity: 'social', minMonth: 90, title: 'ประตูหลังตลาดมืด', text: 'คนรู้จักพาเจ้าเข้าตรอกที่ไม่มีป้าย ร้านค้าด้านในรับซื้อของจากสงครามและขายข้อมูลที่ทางการไม่ยอมรับ', choices: [
      { text: 'ขายของที่ไม่ต้องใช้', effects: [{ type: 'stat', path: 'hero.money', value: 10 }, { type: 'path', key: 'freedom', value: 1 }], effect: s => { s.flags.blackMarketKnown = true; addLog('ตลาดมืดจ่ายเงินสูงกว่าตลาดปกติ แต่ชื่อของเจ้าถูกจดลงในบัญชีลับ', true); } },
      { text: 'ซื้อข่าวเส้นทางงูดำ', requires: s => (s.hero?.money || 0) >= 8, locked: 'เงินไม่พอซื้อข่าว', effects: [{ type: 'stat', path: 'hero.money', value: -8 }, { type: 'path', key: 'insight', value: 3 }], effect: s => { s.flags.blackMarketIntel = true; s.flags.foundMap = true; addLog('ข่าวจากตลาดมืดชี้เส้นทางลำเลียงของงูดำและช่วยให้เจ้าเตรียมตัวก่อนคนอื่น', true); } },
      { text: 'แจ้งทางการและถอนตัว', effects: [{ type: 'stat', path: 'hero.reputation', value: 5 }, { type: 'path', key: 'duty', value: 2 }], effect: s => { s.flags.blackMarketReported = true; addLog('ทางการกวาดตรอกตลาดมืด แต่คนขายข่าวจำชื่อของเจ้าได้'); } }
    ] },
    { id: 'middle_natural_disaster', minAge: 12, activity: 'explore', minMonth: 104, title: 'ฝนหล่มถล่มหมู่บ้าน', text: 'ฝนตกต่อเนื่องจนทางน้ำเปลี่ยนทิศ บ้านชายเขาหลายหลังถูกตัดขาด และผู้คนต้องการทั้งแรงงานกับยา', choices: [
      { text: 'ใช้แรงเปิดทางน้ำ', effects: [{ type: 'stat', path: 'hero.health', value: -8 }, { type: 'stat', path: 'hero.reputation', value: 6 }, { type: 'relation', key: 'acquaintance', value: 5 }], effect: s => { s.flags.disasterRelief = true; addLog('ทางน้ำเปิดอีกครั้ง ผู้คนจำมือที่เปื้อนโคลนของเจ้าได้ดีกว่าคำประกาศใด', true); } },
      { text: 'ขายสมุนไพรให้ผู้ดูแลเสบียง', requires: s => (s.materials?.herb || 0) >= 2, locked: 'สมุนไพรไม่พอ', effects: [{ type: 'material', key: 'herb', value: -2 }, { type: 'stat', path: 'hero.money', value: 8 }, { type: 'path', key: 'compassion', value: 2 }], effect: s => { s.flags.disasterSupplies = true; addLog('ผู้ดูแลเสบียงรับซื้อสมุนไพรเพื่อนำไปรักษาคนเจ็บ'); } },
      { text: 'จดแผนที่น้ำหลากแล้วเดินทางต่อ', effects: [{ type: 'path', key: 'insight', value: 3 }, { type: 'stat', path: 'hero.health', value: -2 }], effect: s => { s.flags.floodMap = true; addLog('แผนที่น้ำหลากทำให้เส้นทางในฤดูฝนของเจ้าปลอดภัยขึ้น'); } }
    ] },
    { id: 'middle_regional_war', activity: 'any', minMonth: 120, minAge: 15, unlock: s => (s.world?.modifiers?.travelRisk || 0) >= 4 || (s.world?.modifiers?.refugeePressure || 0) >= 5, title: 'สงครามลามถึงชายแดน', text: 'กองกำลังจากสองฝ่ายขยับเข้าหาเมืองชายแดน ผู้ลี้ภัยเพิ่มขึ้น และคนธรรมดาต้องเลือกว่าจะช่วยแนวหน้า แนวหลัง หรือพาตัวเองออกไป', choices: [
      { text: 'เข้าหน่วยรักษาแนวหลัง', effects: [{ type: 'stat', path: 'hero.health', value: -10 }, { type: 'stat', path: 'hero.reputation', value: 8 }, { type: 'path', key: 'duty', value: 3 }], effect: s => { s.flags.regionalWarService = true; addLog('เจ้ารับงานแนวหลังและเห็นว่าสงครามไม่ได้มีแต่คนถือดาบ', true); } },
      { text: 'พาผู้ลี้ภัยออกจากเส้นทางศึก', requires: s => s.hero.money >= 6, locked: 'ต้องมีเงินอย่างน้อย 6 ตำลึง', effects: [{ type: 'stat', path: 'hero.money', value: -6 }, { type: 'stat', path: 'hero.reputation', value: 5 }, { type: 'path', key: 'compassion', value: 3 }], effect: s => { s.flags.regionalWarRelief = true; addLog('ขบวนผู้ลี้ภัยผ่านช่องเขาได้ก่อนกองทัพปิดถนน'); } },
      { text: 'รับสัญญาคุ้มกันสินค้า', effects: [{ type: 'stat', path: 'hero.money', value: 20 }, { type: 'stat', path: 'hero.reputation', value: -3 }, { type: 'path', key: 'freedom', value: 2 }], effect: s => { s.flags.regionalWarContract = true; addLog('สัญญาสงครามทำให้เจ้ามีเงินมากขึ้น แต่บางคนเรียกเจ้าว่าคนหากำไรจากความพินาศ'); } }
    ] },
    { id: 'middle_master_companion_arc', storyCharacter: 'lin-an', activity: 'social', minMonth: 96, unlock: s => (s.relations?.master || 0) >= 10 || (s.relations?.friend || 0) >= 10, title: 'คำสัญญาของอาจารย์และสหาย', text: 'อาจารย์เหวินกับเฉินหยูต่างขอให้เจ้าช่วยคนละเรื่องในคืนเดียว คนหนึ่งต้องการรักษารากฐานสำนัก อีกคนต้องการตามหาผู้สูญหายจากหมู่บ้านชายแดน', choices: [
      { text: 'แบ่งเวลาให้ทั้งสองฝ่าย', effects: [{ type: 'stat', path: 'hero.health', value: -6 }, { type: 'relation', key: 'master', value: 5 }, { type: 'relation', key: 'friend', value: 5 }, { type: 'path', key: 'compassion', value: 2 }], effect: s => { s.flags.masterFriendArcShared = true; addLog('เจ้าไม่ยอมให้คำสัญญาสองสายกลายเป็นเหตุผลที่ต้องทอดทิ้งใครคนหนึ่ง', true); } },
      { text: 'เลือกภารกิจของอาจารย์', effects: [{ type: 'relation', key: 'master', value: 10 }, { type: 'stat', path: 'hero.powerBonus', value: 55 }, { type: 'path', key: 'duty', value: 2 }], effect: s => { s.flags.masterArcChosen = true; addLog('อาจารย์มอบความลับของค่ายกลให้เจ้า เพราะรู้ว่าเจ้ารักษาหน้าที่ได้'); } },
      { text: 'เลือกตามหาคนหายกับสหาย', effects: [{ type: 'relation', key: 'friend', value: 10 }, { type: 'stat', path: 'hero.reputation', value: 5 }, { type: 'path', key: 'freedom', value: 2 }], effect: s => { s.flags.friendArcChosen = true; addLog('เฉินหยูได้คนกลับบ้าน และมิตรภาพของพวกเจ้ากลายเป็นเรื่องที่คนอื่นพึ่งพาได้'); } }
    ] }
  ];
  const DEBT_EVENTS = [
    {
      id: 'debt_collection_notice', minAge: 12, activity: 'any', minMonth: 1,
      unlock: s => !!s.flags?.debtCollectionDue && (s.household?.debt || 0) > 0,
      title: 'เจ้าหนี้มาถึงหน้าบ้าน',
      text: s => `${s.household?.creditor || 'เจ้าหนี้ตลาดชายแดน'}ส่งคนมาติดตามหนี้ ดอกเบี้ยสะสม ${s.household?.interestAccrued || 0} ตำลึง และเอกสารยึดทรัพย์ถูกวางไว้บนโต๊ะ`,
      choices: [
        { text: 'จ่ายเงินก้อนเพื่อลดแรงกดดัน', note: 'จ่าย 10 ตำลึง ลดหนี้ 16 ตำลึงและล้างค้างชำระ', requires: s => (s.hero?.money || 0) >= 10, locked: 'เงินไม่พอจ่ายก้อนเจรจา', effect: s => { const h = ensureHousehold(s); s.hero.money -= 10; h.debt = Math.max(0, h.debt - 16); h.arrears = 0; h.collectionStage = Math.max(0, h.collectionStage - 1); s.flags.debtCollectionDue = false; s.hero.reputation += 2; addLog('เจ้าหนี้รับเงินก้อนและถอนเอกสารยึดทรัพย์ชั่วคราว', true); } },
        { text: 'ขอผ่อนผันด้วยผลงาน', note: 'ลดดอกเบี้ยชั่วคราว แต่ต้องทำงานและเสียชื่อเสียงเล็กน้อย', effect: s => { const h = ensureHousehold(s); h.interestRate = Math.max(.04, h.interestRate - .01); h.arrears = Math.max(0, h.arrears - 1); s.flags.debtCollectionDue = false; s.hero.reputation -= 1; h.workRisk += 1; addLog('เจ้าหนี้ยอมเลื่อนกำหนดแลกกับการรับงานเสี่ยงในเดือนถัดไป', true); } },
        { text: 'ปฏิเสธและเตรียมรับการยึดทรัพย์', note: 'ไม่เสียเงินตอนนี้ แต่เจ้าหนี้จะยกระดับการบังคับใช้หนี้', effect: s => { const h = ensureHousehold(s); h.collectionStage = Math.min(3, h.collectionStage + 1); h.arrears += 1; s.flags.debtProvoked = true; s.hero.reputation -= 4; addLog('เจ้าหนี้เก็บเอกสารกลับไปพร้อมรอยยิ้ม และบอกว่าจะกลับมาอีกครั้ง', true); } }
      ]
    }
  ];
  const INFANT_LEGENDARY_EVENTS = [
    {
      id: 'mysterious_swordsman', activity: 'any', rarity: 'legendary', minMonth: 1, maxMonth: 23,
      unlock: s => !s.flags?.mysteriousSwordsmanMet && (s.hero?.ageMonths || 0) >= 1 && (s.hero?.ageMonths || 0) <= 23,
      tag: 'ตำนาน · วัยทารก', art: 'sword-cloud', title: 'ผู้เฒ่าผ่านเมฆา',
      dynamicText: s => `${s.hero?.gender === 'female' ? 'แสงจันทร์เหนือเปลของเจ้าสั่นไหวราวกับถูกคมกระบี่กรีดผ่าน' : s.hero?.gender === 'male' ? 'เงาคมกระบี่พาดผ่านหลังคาเหนือเปลของเจ้า ก่อนชายชราคนหนึ่งจะยืนอยู่กลางอากาศ' : 'เงาคมกระบี่และแสงประหลาดสั่นไหวเหนือเปลของเจ้า ก่อนชายชราคนหนึ่งจะปรากฏขึ้นกลางอากาศ'} ชายชราผู้หนึ่งยืนอยู่บนกระบี่สีหม่น แขนเสื้อปลิวอยู่เหนือเรือน เขามองผ่านหลังคาและหยุดสายตาลงที่เจ้า ราวกับมองเห็นบางสิ่งในร่างทารกที่ยังไม่มีผู้ใดค้นพบ\n\nเขายื่นนิ้วแตะกลางหน้าผากของเจ้า เสียงกระบี่นับหมื่นเล่มดังก้องขึ้นในจิตใจ ทั้งที่รอบตัวมีเพียงเสียงลม\n\n“เด็กน้อย…เจ้ามาเกิดผิดยุค หรือยุคนี้ต่างหากที่กำลังรอเจ้าอยู่”`,
      choices: [
        { text: 'พ่นน้ำลายใส่เขา', note: 'ชายชราหัวเราะและทิ้งของวิเศษไว้ข้างเปล', effect: s => { ensureRelationshipState(s); s.flags.mysteriousSwordsmanMet = true; s.relations.mysteriousSwordsman = 50; s.relationshipState.mysteriousSwordsman.lastTouched = s.month; addTreasure(s, 'แผ่นหยกฟังเสียงกระบี่', { attack: 18, agility: 8, training: 14 }, { grade: 'legendary' }); addLog('ชายชราหัวเราะเมื่อถูกเจ้าพ่นน้ำลายใส่ เขาทิ้งแผ่นหยกฟังเสียงกระบี่ไว้ข้างเปล และความสัมพันธ์กับชายแก่ขี่กระบี่เริ่มต้นที่ 50/100', true); } },
        { text: 'ฉี่รดแขนเสื้อของชายชรา', note: 'เขาตกใจเล็กน้อย แต่ทิ้งยันต์คุ้มครองไว้ให้', effect: s => { ensureRelationshipState(s); s.flags.mysteriousSwordsmanMet = true; s.relations.mysteriousSwordsman = 50; s.relationshipState.mysteriousSwordsman.lastTouched = s.month; addTreasure(s, 'ยันต์คุ้มครองผู้ไร้เดียงสา', { defense: 16, body: 10, luck: 12 }, { grade: 'epic' }); addLog('ชายชราถอนหายใจหลังถูกเจ้าฉี่รด แต่ยังทิ้งยันต์คุ้มครองผู้ไร้เดียงสาไว้ให้ ความสัมพันธ์เริ่มต้นที่ 50/100', true); } },
        { text: 'เอื้อมมือคว้าปลายกระบี่', note: 'ได้รับเส้นไหมกระบี่และบันทึกความสัมพันธ์กับชายชรา', effect: s => { ensureRelationshipState(s); s.flags.mysteriousSwordsmanMet = true; s.flags.swordsmanSecretHint = true; s.relations.mysteriousSwordsman = 50; s.relationshipState.mysteriousSwordsman.lastTouched = s.month; addTreasure(s, 'เส้นไหมกระบี่เมฆา', { attack: 20, defense: 12, agility: 10 }, { grade: 'legendary' }); addLog('ปลายนิ้วของเจ้าสัมผัสคมกระบี่ ชายชราทิ้งเส้นไหมกระบี่เมฆาและคำชี้แนะลับไว้ ความสัมพันธ์เริ่มต้นที่ 50/100', true); } },
        { text: 'ร้องไห้จนหลับไป', note: 'ไม่ได้รับของ แต่บันทึกความสัมพันธ์กับชายชรา', effect: s => { ensureRelationshipState(s); s.flags.mysteriousSwordsmanMet = true; s.flags.swordsmanMayReturn = true; s.relations.mysteriousSwordsman = 50; s.relationshipState.mysteriousSwordsman.lastTouched = s.month; addLog('ชายชรายิ้มบาง ๆ ก่อนหายไปพร้อมกลิ่นสนจาง ๆ เขาจดจำเจ้าไว้ และความสัมพันธ์เริ่มต้นที่ 50/100', true); } }
      ]
    },
    {
      id: 'bell_house_visitor', activity: 'any', rarity: 'legendary', minMonth: 6, maxMonth: 18,
      unlock: s => !s.flags?.bellHouseVisited && (s.hero?.ageMonths || 0) >= 6 && (s.hero?.ageMonths || 0) <= 18,
      tag: 'ตำนาน · วัยทารก', art: 'bell-house', title: 'ระฆังจากเรือนที่ไม่มีผู้คน',
      text: 'ในคืนหนึ่ง เสียงระฆังดังขึ้นจากท้ายหมู่บ้าน ทั้งที่บริเวณนั้นไม่มีวัด ไม่มีศาลเจ้า และไม่มีผู้ใดอาศัยอยู่มานานหลายสิบปี ผู้ใหญ่ในเรือนตื่นขึ้นพร้อมกัน แต่ไม่มีใครกล้าออกไปดู มีเพียงเจ้าที่ยังคงหลับอยู่ในเปล ราวกับเสียงนั้นกำลังเรียกหาเจ้าเพียงผู้เดียว\n\nเมื่อเสียงระฆังดังเป็นครั้งที่สาม เงาร่างสีขาวปรากฏอยู่ข้างหน้าต่าง นางมีรูปร่างคล้ายหญิงชรา ทว่าใบหน้ากลับเลือนรางราวกับถูกหมอกบดบัง นางวางกล่องไม้เก่าแก่ไว้ใต้หน้าต่าง แล้วกล่าวด้วยเสียงที่ไม่มีใครได้ยิน\n\n“ของสิ่งนี้เป็นของผู้ที่ยังไม่เคยก่อหนี้กับโลก”',
      choices: [
        { text: 'ให้ผู้ดูแลเปิดกล่องแทนเจ้า', note: 'ได้รับระฆังระดับตำนานและบันทึกความสัมพันธ์กับผู้มาเยือน', effect: s => { ensureRelationshipState(s); s.flags.bellHouseVisited = true; s.flags.bellDebt = true; s.relations.bellMatron = 30; s.relationshipState.bellMatron.lastTouched = s.month; addTreasure(s, 'ระฆังคืนหนี้', { luck: 16, spirit: 12, defense: 10 }, { grade: 'legendary' }); s.hero.karma += 2; addLog('ผู้ดูแลเปิดกล่องและพบระฆังคืนหนี้ ของวิเศษระดับตำนาน ความสัมพันธ์กับหญิงชราแห่งเรือนระฆังเริ่มต้นที่ 30/100', true); } },
        { text: 'เก็บกล่องไว้โดยไม่เปิด', note: 'ได้รับกล่องปริศนาที่ยังปิดผนึก', effect: s => { ensureRelationshipState(s); s.flags.bellHouseVisited = true; s.flags.bellBoxSealed = true; s.relations.bellMatron = 20; s.relationshipState.bellMatron.lastTouched = s.month; addTreasure(s, 'กล่องเรือนนิรันดร์', { luck: 12, intellect: 12, defense: 8 }, { grade: 'legendary', sealed: true }); addLog('ครอบครัวเก็บกล่องเรือนนิรันดร์ไว้โดยไม่เปิด หญิงชราแห่งเรือนระฆังจดจำการตัดสินใจนี้ ความสัมพันธ์เริ่มต้นที่ 20/100', true); } },
        { text: 'นำกล่องไปคืนยังเรือนร้าง', note: 'ไม่ได้รับของ เพิ่มกรรมและความสัมพันธ์กับหญิงชรา', effect: s => { ensureRelationshipState(s); s.flags.bellHouseVisited = true; s.flags.bellMatronAwakened = true; s.relations.bellMatron = 40; s.relationshipState.bellMatron.lastTouched = s.month; s.hero.karma += 5; s.hero.reputation += 1; addLog('ครอบครัวนำกล่องกลับคืนเรือนร้าง เสียงระฆังเงียบลง และหญิงชราแห่งเรือนระฆังเริ่มจดจำชื่อของเจ้า ความสัมพันธ์ 40/100', true); } },
        { text: 'ปล่อยให้กล่องถูกเผาไปพร้อมกับเครื่องเซ่น', note: 'ได้รับเถ้าระฆังไร้เสียงและบันทึกความสัมพันธ์กับหญิงชรา', effect: s => { ensureRelationshipState(s); s.flags.bellHouseVisited = true; s.flags.bellAshWard = true; s.relations.bellMatron = 5; s.relationshipState.bellMatron.lastTouched = s.month; addTreasure(s, 'เถ้าระฆังไร้เสียง', { karma: 10, luck: 8, defense: 8 }, { grade: 'epic', singleUse: true }); s.hero.karma += 1; addLog('กล่องไม้กลายเป็นเถ้าระฆังไร้เสียง หญิงชราแห่งเรือนระฆังไม่พอใจ ความสัมพันธ์เหลือ 5/100', true); } }
      ]
    }
  ];
  const INFANT_EPIC_EVENTS = [
    {
      id: 'infant_warm_jade', activity: 'any', rarity: 'epic', minMonth: 1, maxMonth: 23,
      unlock: s => !s.flags?.infantWarmJade && (s.hero?.ageMonths || 0) >= 1 && (s.hero?.ageMonths || 0) <= 23,
      tag: 'มหากาพย์ · วัยทารก', art: 'jade-warm', title: 'หยกอุ่นใต้หมอน',
      text: 'ในคืนที่ลมหนาวพัดลอดหน้าต่าง ผู้ดูแลพบหยกชิ้นหนึ่งซ่อนอยู่ใต้หมอนของเจ้า ทั้งที่ไม่มีใครนำมันเข้ามา\n\nหยกนั้นอุ่นราวกับเพิ่งถูกถือไว้ในมือ และมีแสงสีเขียวจาง ๆ ไหลอยู่ภายในเนื้อหยก เมื่อเจ้ากำมือรอบมัน อาการไข้ก็ลดลง ราวกับมีใครบางคนฝากคำอวยพรไว้กับเด็กที่ยังพูดไม่ได้',
      choices: [
        { text: 'ให้ผู้ดูแลวางหยกไว้ข้างตัวเจ้า', note: 'รับการคุ้มครองจากหยกและฟื้นสุขภาพ', effect: s => { s.flags.infantWarmJade = true; addTreasure(s, 'หยกอุ่นคุ้มชีพ', { defense: 8, body: 6, luck: 4 }, { grade: 'epic' }); s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 12); addLog('ผู้ดูแลวางหยกอุ่นไว้ข้างตัวเจ้า อาการไข้ลดลงและหยกคุ้มชีพกลายเป็นของวิเศษประจำตัว', true); } },
        { text: 'ให้ผู้ดูแลนำหยกไปให้หมอตรวจ', note: 'ได้ความรู้และเศษหยกจากห้องตรวจ', effect: s => { s.flags.infantWarmJade = true; s.flags.jadeExamined = true; s.hero.attributes.intellect += 2; s.hero.attributes.spirit += 2; s.hero.reputation += 1; addTreasure(s, 'เศษหยกเขียวจากห้องตรวจ', { intellect: 6, spirit: 5 }, { grade: 'rare' }); addLog('หมอไม่อาจบอกที่มาของหยก แต่บันทึกเส้นแสงภายในมันไว้ ทำให้ครอบครัวรู้จักผู้เชี่ยวชาญคนหนึ่ง', true); } },
        { text: 'ฝังหยกไว้ใต้ต้นไม้หน้าบ้าน', note: 'ไม่รับของวิเศษ แต่ฝากความอุ่นไว้กับผืนดิน', effect: s => { s.flags.infantWarmJade = true; s.hero.karma += 2; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 5); s.materials.herb += 1; addLog('หยกถูกฝังใต้ต้นไม้และทำให้ดินรอบรากอุ่นขึ้น สมุนไพรต้นแรกจึงงอกขึ้นในเช้าวันต่อมา', true); } }
      ]
    },
    {
      id: 'infant_crane_gift', activity: 'any', rarity: 'epic', minMonth: 2, maxMonth: 23,
      unlock: s => !s.flags?.infantCraneGift && (s.hero?.ageMonths || 0) >= 2 && (s.hero?.ageMonths || 0) <= 23,
      tag: 'มหากาพย์ · วัยทารก', art: 'white-crane', title: 'นกกระเรียนเหนือชายคา',
      text: 'ยามรุ่งสาง นกกระเรียนขาวตัวหนึ่งบินวนเหนือเรือนสามรอบ ปีกของมันสะท้อนแสงอาทิตย์จนผู้คนต้องยกมือบังตา\n\nก่อนจากไป มันปล่อยกิ่งสมุนไพรสีเงินลงตรงหน้าต่าง แล้วหันกลับมามองเจ้าเป็นครั้งสุดท้าย ไม่มีใครรู้ว่ามันมาจากภูเขาใด แต่กลิ่นหอมจากกิ่งไม้นั้นช่วยให้ลมหายใจของเจ้าสงบลงตลอดทั้งคืน',
      choices: [
        { text: 'เก็บกิ่งสมุนไพรไว้ต้มยา', note: 'ได้วัตถุดิบและฟื้นสุขภาพอย่างมาก', effect: s => { s.flags.infantCraneGift = true; s.materials.herb += 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 16); s.hero.attributes.spirit += 2; addLog('กิ่งสมุนไพรกระเรียนถูกต้มเป็นยา ลมหายใจของเจ้าสงบลงและชีพจรแข็งแรงขึ้น', true); } },
        { text: 'นำกิ่งไม้ไปปักไว้ข้างเปล', note: 'ได้รับของวิเศษที่ช่วยเสริมจิตใจและการพักฟื้น', effect: s => { s.flags.infantCraneGift = true; addTreasure(s, 'ขนกระเรียนขาว', { spirit: 8, luck: 8, restHealth: 5 }, { grade: 'epic' }); s.hero.attributes.spirit += 3; addLog('กิ่งไม้สลายเป็นขนกระเรียนขาวเมื่อรุ่งอรุณ ของวิเศษนั้นทำให้การพักฟื้นของเจ้าดีขึ้น', true); } },
        { text: 'วางกิ่งไม้คืนไว้บนหลังคา', note: 'ไม่เก็บของไว้กับตัว แต่เพิ่ม Karma และชื่อเสียง', effect: s => { s.flags.infantCraneGift = true; s.hero.karma += 3; s.hero.reputation += 2; s.hero.attributes.luck += 2; addLog('ครอบครัววางกิ่งไม้คืนบนหลังคา นกกระเรียนบินกลับมารับมันและทิ้งเสียงร้องใสกังวานไว้เหนือหมู่บ้าน', true); } }
      ]
    },
    {
      id: 'infant_rain_laugh', activity: 'any', rarity: 'epic', minMonth: 3, maxMonth: 23,
      unlock: s => !s.flags?.infantRainLaugh && (s.hero?.ageMonths || 0) >= 3 && (s.hero?.ageMonths || 0) <= 23,
      tag: 'มหากาพย์ · วัยทารก', art: 'rain-bell', title: 'เสียงหัวเราะในคืนฝน',
      text: 'ฝนตกหนักจนหลังคาสั่นสะเทือน ทว่าเสียงหัวเราะของเจ้ากลับดังขึ้นท่ามกลางเสียงฟ้าร้อง ราวกับได้ยินเรื่องสนุกจากผู้ที่ไม่มีใครมองเห็น\n\nเงาเล็ก ๆ เคลื่อนผ่านผนังห้องสามครั้ง ก่อนหยุดลงข้างเปลและวางกระดิ่งแก้วไว้บนพื้น เมื่อกระดิ่งดังขึ้น ฝนทั้งหมู่บ้านก็หยุดลงชั่วขณะ และความเงียบที่ตามมาทำให้ผู้ใหญ่ไม่มีใครกล้าหลับต่อ',
      choices: [
        { text: 'แขวนกระดิ่งไว้เหนือเปล', note: 'ได้ของวิเศษที่ช่วยเสริมโชคและจิตใจ', effect: s => { s.flags.infantRainLaugh = true; addTreasure(s, 'กระดิ่งฝนใส', { luck: 10, spirit: 6, defense: 5 }, { grade: 'epic' }); s.hero.attributes.luck += 3; addLog('กระดิ่งฝนใสถูกแขวนไว้เหนือเปล เสียงของมันทำให้ฝนไม่เคยตกหนักจนเจ้าหลับไม่ลงอีก', true); } },
        { text: 'ให้ผู้ดูแลนำกระดิ่งไปเก็บในหีบ', note: 'เก็บกระดิ่งไว้ เพิ่มจิตใจและฟื้นสุขภาพ', effect: s => { s.flags.infantRainLaugh = true; s.flags.rainBellStored = true; s.hero.attributes.spirit += 2; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 6); addLog('กระดิ่งถูกเก็บในหีบเก่า เสียงหัวเราะที่ไม่มีที่มาหายไป แต่ความสงบก็กลับคืนสู่เรือน', true); } },
        { text: 'หัวเราะตอบเสียงที่อยู่นอกหน้าต่าง', note: 'เพิ่มกรรม ปัญญา และจิตใจ', effect: s => { s.flags.infantRainLaugh = true; s.flags.heardRainVisitor = true; s.hero.karma += 3; s.hero.attributes.intellect += 2; s.hero.attributes.spirit += 3; addLog('เสียงหัวเราะของเจ้าตอบกลับไปยังความมืด เงานั้นจึงเลือนหายพร้อมทิ้งความรู้สึกว่ามีใครจดจำเจ้าไว้', true); } }
      ]
    },
    {
      id: 'infant_star_fragment', activity: 'any', rarity: 'epic', minMonth: 6, maxMonth: 23,
      unlock: s => !s.flags?.infantStarFragment && (s.hero?.ageMonths || 0) >= 6 && (s.hero?.ageMonths || 0) <= 23,
      tag: 'มหากาพย์ · วัยทารก', art: 'star-forge', title: 'เศษดาวจากเตาหลอม',
      text: 'ช่างตีเหล็กพบโลหะสีดำชิ้นหนึ่งตกอยู่กลางลานบ้าน หลังจากดาวตกพาดผ่านท้องฟ้าเมื่อคืนก่อน\n\nแม้ถูกโยนลงในเตาหลอมหลายครั้ง มันกลับไม่ละลาย แต่กลับส่งเสียงคล้ายเด็กหัวเราะทุกครั้งที่เจ้าอยู่ใกล้\n\nช่างจึงเก็บมันไว้ให้ครอบครัว พร้อมกล่าวว่าโลหะชิ้นนี้อาจกลายเป็นอาวุธหรือเครื่องรางของเจ้าในวันที่เติบโตพอ',
      choices: [
        { text: 'ฝากช่างตีเหล็กเก็บรักษาไว้', note: 'ได้เหล็ก หินปราณ และเศษเหล็กจากฟ้า', effect: s => { s.flags.infantStarFragment = true; s.materials.iron += 3; s.materials.spiritStone += 1; addTreasure(s, 'เศษเหล็กจากฟ้า', { attack: 10, defense: 8 }, { grade: 'epic', craftingMaterial: true }); s.hero.attributes.body += 2; addLog('ช่างตีเหล็กเก็บเศษเหล็กจากฟ้าไว้ให้เจ้า โลหะนี้ยังรอวันที่จะถูกตีขึ้นเป็นของคู่กาย', true); } },
        { text: 'ให้ช่างขึ้นรูปเป็นของเล่นชิ้นเล็ก', note: 'เพิ่มพละกำลังและความกล้า พร้อมได้รับของวิเศษ', effect: s => { s.flags.infantStarFragment = true; addTreasure(s, 'ลูกข่างเหล็กจากดาว', { body: 8, luck: 5, defense: 6 }, { grade: 'epic' }); s.hero.attributes.body += 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 8); addLog('เศษดาวถูกตีเป็นลูกข่างเหล็ก แม้หมุนช้า แต่ไม่เคยล้มลงแม้ถูกผลักด้วยแรงใด', true); } },
        { text: 'นำโลหะไปคืนจุดที่ดาวตก', note: 'นำเศษดาวกลับไป เพิ่มกรรม ปัญญา และชื่อเสียง', effect: s => { s.flags.infantStarFragment = true; s.flags.starfallSiteKnown = true; s.hero.karma += 4; s.hero.attributes.intellect += 2; s.hero.reputation += 1; addLog('ครอบครัวนำเศษดาวกลับไปยังจุดที่มันตกลงมา ดินตรงนั้นยังอุ่น และมีรอยแร่ประหลาดซ่อนอยู่ใต้ดิน', true); } }
      ]
    },
    {
      id: 'infant_snow_fever', activity: 'any', rarity: 'epic', minMonth: 1, maxMonth: 23,
      unlock: s => !s.flags?.infantSnowFever && (s.hero?.ageMonths || 0) >= 1 && (s.hero?.ageMonths || 0) <= 23,
      tag: 'มหากาพย์ · วัยทารก', art: 'snow-fever', title: 'ไข้คืนหิมะ',
      text: 'ในคืนที่หิมะตกหนัก เจ้าตัวร้อนจนผู้ดูแลคิดว่าอาจไม่รอดถึงเช้า เปลวไฟในเตาผิงเองยังสั่นไหวราวกับหวาดกลัว\n\nผู้ดูแลนำยาสามัญทุกอย่างที่มีมาผสมกันโดยไม่มีทางเลือกอื่น และหยดแรกที่แตะริมฝีปากของเจ้ากลับเปล่งแสงสีทอง\n\nก่อนรุ่งเช้า ไข้ของเจ้าลดลง เหลือเพียงรอยแสงบาง ๆ บนข้อมือ ราวกับร่างกายได้จดจำความตายไว้เป็นบทเรียนแรก',
      choices: [
        { text: 'ดื่มยาที่ผู้ดูแลปรุงต่อจนหมด', note: 'ฟื้นสุขภาพ เพิ่มสุขภาพสูงสุดและพละกำลัง พร้อมได้รับเม็ดยา', effect: s => { s.flags.infantSnowFever = true; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 10); s.hero.maxHealth += 5; s.hero.attributes.body += 3; addTreasure(s, 'เม็ดยาเกล็ดหิมะ', { body: 8, health: 5 }, { grade: 'rare', consumable: true }); addLog('ยาสามัญที่รวมกันอย่างสิ้นหวังช่วยให้เจ้ารอด และร่างกายจดจำคืนไข้หิมะไว้เป็นภูมิคุ้มกัน', true); } },
        { text: 'หยุดยาและใช้ความอบอุ่นของครอบครัวรักษาเจ้า', note: 'ปลอดภัยกว่า และเพิ่มความผูกพันกับครอบครัว', effect: s => { s.flags.infantSnowFever = true; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 6); s.relations.parents += 5; s.relations.relatives += 2; s.hero.attributes.spirit += 2; addLog('อ้อมแขนของครอบครัวช่วยพาเจอผ่านคืนหิมะ ความทรงจำเรื่องการถูกปกป้องฝังแน่นอยู่ในจิตใจ', true); } },
        { text: 'เก็บหยดแสงสีทองไว้ในขวดหยก', note: 'ได้รับไอเทมและเพิ่มจิตใจ แต่สุขภาพลดลงสูงสุด 4', effect: s => { s.flags.infantSnowFever = true; s.hero.health = Math.max(1, s.hero.health - 4); addTreasure(s, 'หยดแสงจากไข้หิมะ', { spirit: 10, luck: 6, defense: 6 }, { grade: 'epic', sealed: true }); s.hero.attributes.spirit += 4; addLog('หยดแสงสีทองถูกเก็บในขวดหยก กลายเป็นของวิเศษที่ยังเต้นเบา ๆ เมื่อเจ้าหลับ', true); } }
      ]
    },
    {
      id: 'infant_moon_shadow', activity: 'any', rarity: 'epic', minMonth: 4, maxMonth: 23,
      unlock: s => !s.flags?.infantMoonShadow && (s.hero?.ageMonths || 0) >= 4 && (s.hero?.ageMonths || 0) <= 23,
      tag: 'มหากาพย์ · วัยทารก', art: 'moon-water', title: 'เงาจันทร์ในอ่างน้ำ',
      text: 'ระหว่างอาบน้ำ ผู้ดูแลพบว่าเงาจันทร์บนผิวน้ำไม่เคลื่อนตามเมฆเหมือนเงาทั่วไป แต่มันกลับลอยเข้ามาใกล้เจ้าอย่างช้า ๆ\n\nเมื่อมือเล็ก ๆ ของเจ้าตีน้ำ เงาจันทร์ก็แตกออกเป็นประกายสีเงินและเกาะอยู่บนปลายนิ้ว\n\nประกายนั้นหายไปก่อนผู้ใดจะจับต้องได้ ทิ้งไว้เพียงความรู้สึกเย็นสบายและดวงตาที่สว่างขึ้นกว่าทุกวัน',
      choices: [
        { text: 'เก็บน้ำในอ่างไว้ในขวด', note: 'ได้ของวิเศษที่ช่วยเสริมการพักฟื้นและจิตใจ', effect: s => { s.flags.infantMoonShadow = true; addTreasure(s, 'น้ำค้างเงาจันทร์', { spirit: 8, restHealth: 6, luck: 6 }, { grade: 'epic', sealed: true }); s.hero.attributes.spirit += 2; addLog('น้ำในอ่างถูกเก็บไว้ในขวดหยก ประกายจันทร์ยังคงลอยอยู่ข้างในจนถึงรุ่งเช้า', true); } },
        { text: 'ปล่อยให้น้ำไหลกลับลงดิน', note: 'ไม่ได้รับไอเทม แต่เพิ่ม Karma และสุขภาพ', effect: s => { s.flags.infantMoonShadow = true; s.hero.karma += 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 7); s.hero.attributes.luck += 2; addLog('ครอบครัวปล่อยเงาจันทร์กลับคืนสู่ผืนดิน น้ำค้างสีเงินจึงเกาะตามใบไม้ทั่วเรือน', true); } },
        { text: 'ยื่นมือแตะประกายบนผิวน้ำอีกครั้ง', note: 'เพิ่มปัญญา จิตใจ และได้รับประกายจันทร์ติดนิ้ว', effect: s => { s.flags.infantMoonShadow = true; s.flags.moonShadowTouched = true; s.hero.attributes.intellect += 3; s.hero.attributes.spirit += 3; addTreasure(s, 'ประกายจันทร์ติดนิ้ว', { intellect: 8, spirit: 8, luck: 5 }, { grade: 'rare' }); addLog('ประกายจันทร์แตะปลายนิ้วของเจ้าอีกครั้ง ก่อนซึมเข้าไปในผิวหนังและทิ้งความเย็นไว้ในชีพจร', true); } }
      ]
    }
  ];
  const SCOPED_EPIC_EVENTS = [
    {
      id: 'young_child_lantern_footprint', flag: 'youngChildLanternFootprint', phase: 'วัยเด็กเล็ก', minAge: 2, maxAge: 5,
      when: s => ['roadside', 'owned', 'rented', 'shelter'].includes(s.locations?.current || 'roadside'), title: 'รอยเท้าใต้โคม',
      text: 'คืนหนึ่ง ผู้ดูแลจุดโคมไว้หน้าประตูเพื่อรอคนในเรือนกลับบ้าน แต่แสงโคมกลับทอดเงารอยเท้าเล็ก ๆ ที่ไม่มีเจ้าของเดินผ่าน\n\nรอยเท้านั้นหยุดอยู่ข้างเตียงของเจ้า ก่อนค่อย ๆ เลือนหายไปตามผนัง ขณะเดียวกันเสียงเคาะประตูก็ดังขึ้นสามครั้ง\n\nเมื่อเปิดออก ไม่มีใครอยู่ด้านนอก มีเพียงเหรียญทองแดงเย็นจัดวางอยู่บนพื้นและกลิ่นดินหลังฝนที่ไม่ควรมีในคืนแล้ง',
      choices: [
        { text: 'เก็บเหรียญไว้ใต้หมอน', note: 'ได้ของวิเศษเล็กน้อยและเพิ่มโชค', effect: s => { addTreasure(s, 'เหรียญโคมไร้เงา', { luck: 7, defense: 4 }, { grade: 'rare' }); s.hero.attributes.luck += 2; addLog('เหรียญโคมไร้เงาถูกเก็บไว้ใต้หมอน และไม่เคยเย็นลงอีกเลย', true); } },
        { text: 'นำเหรียญไปวางคืนหน้าประตู', note: 'ได้ Karma และความสัมพันธ์กับผู้ดูแล', effect: s => { s.hero.karma += 2; s.relations.parents += 3; s.hero.attributes.spirit += 1; addLog('เหรียญหายไปก่อนรุ่งเช้า เหลือเพียงรอยเท้าจาง ๆ ที่หันกลับไปทางถนน', true); } },
        { text: 'เรียกผู้ใหญ่ทุกคนมาดูพร้อมกัน', note: 'ชื่อเสียงเพิ่ม แต่ความสงบของเรือนลดลง', effect: s => { s.hero.reputation += 2; s.relations.relatives += 2; s.hero.health = Math.max(1, s.hero.health - 2); addLog('เรื่องรอยเท้าแพร่ไปทั่วเรือน ผู้ใหญ่เริ่มระวังทุกเสียงเคาะประตูหลังจากคืนนั้น', true); } }
      ]
    },
    {
      id: 'young_child_hidden_ledger', flag: 'youngChildHiddenLedger', phase: 'วัยเด็กเล็ก', minAge: 3, maxAge: 5,
      when: s => s.activity === 'study' || (s.hero?.attributes?.intellect || 0) >= 13, title: 'บัญชีลับหลังชั้นหนังสือ',
      text: 'ระหว่างที่ผู้ใหญ่กำลังจัดหีบตำรา เจ้าพบสมุดบัญชีบาง ๆ ซ่อนอยู่หลังชั้นหนังสือ หน้ากระดาษเต็มไปด้วยชื่อคนและจำนวนเงินที่ไม่ตรงกับบัญชีของบ้าน\n\nตรงหน้าสุดท้ายมีตราประทับของคนจากเมืองชายแดน และบรรทัดหนึ่งเขียนถึงเด็กคนหนึ่งที่ควรตายไปแล้ว\n\nผู้ใหญ่รีบปิดสมุดทันทีเมื่อเห็นเจ้า แต่เจ้าจำรอยหมึกสีแดงและกลิ่นน้ำมันสนบนปกได้แล้ว',
      choices: [
        { text: 'จำชื่อและซ่อนสมุดกลับที่เดิม', note: 'ได้รับเบาะแสระยะยาว', effect: s => { s.paths.insight += 2; s.hero.attributes.intellect += 2; s.flags.hiddenLedgerClue = true; addLog('เจ้าจำชื่อในบัญชีไว้โดยไม่ถาม ผู้ใหญ่ไม่รู้ว่าความลับถูกพบเห็นแล้ว', true); } },
        { text: 'นำสมุดไปให้พ่อแม่ดู', note: 'ความปลอดภัยของครอบครัวเพิ่มขึ้น แต่ศัตรูอาจรู้ตัว', effect: s => { s.relations.parents += 5; s.hero.reputation += 1; s.flags.familyWarnedLedger = true; addLog('สมุดบัญชีถูกเผาในคืนนั้น ครอบครัวเริ่มเปลี่ยนเส้นทางเดินทางและไม่รับแขกแปลกหน้า', true); } },
        { text: 'ฉีกหน้าที่มีชื่อเด็กคนนั้นออกมา', note: 'เสี่ยงทำลายหลักฐาน แต่ได้เบาะแสไว้กับตัว', effect: s => { s.paths.freedom += 1; s.paths.insight += 1; s.hero.health -= 2; addTreasure(s, 'เศษบัญชีหมึกแดง', { intellect: 5, luck: 4 }, { grade: 'rare' }); addLog('หน้ากระดาษถูกซ่อนไว้ในเสื้อของเจ้า และกลายเป็นหลักฐานชิ้นแรกที่ไม่มีใครรู้ว่าถูกนำออกมา', true); } }
      ]
    },
    {
      id: 'young_child_market_mask', flag: 'youngChildMarketMask', phase: 'วัยเด็กเล็ก', minAge: 4, maxAge: 5,
      when: s => (s.hero?.money || 0) <= 8 || s.activity === 'work', title: 'หน้ากากจากตลาดเช้า',
      text: 'ในตลาดเช้า ช่างเร่คนหนึ่งยื่นหน้ากากไม้ให้เจ้าโดยไม่คิดเงิน เขาบอกว่าหน้ากากนี้แกะจากไม้ที่ลอยมาจากแม่น้ำและไม่เคยมีผู้ใดสวมได้นาน\n\nทันทีที่เจ้ารับมัน เสียงจอแจรอบตัวกลับเงียบลง เหลือเพียงเสียงคนผู้หนึ่งกระซิบเรียกชื่อที่ไม่ใช่ชื่อของเจ้า\n\nช่างเร่หายไปก่อนผู้ดูแลจะหันกลับมา เหลือเพียงรอยสีดำบนฝ่ามือของเจ้า',
      choices: [
        { text: 'สวมหน้ากากกลับบ้าน', note: 'ได้ของวิเศษสำหรับซ่อนตัว แต่สุขภาพเสียเล็กน้อย', effect: s => { addTreasure(s, 'หน้ากากไม้หลบสายตา', { agility: 7, luck: 5, defense: 5 }, { grade: 'epic' }); s.hero.health -= 3; s.hero.attributes.luck += 1; addLog('หน้ากากไม้ไม่ยอมหลุดจากมือจนถึงบ้าน และเงาของเจ้าในคืนนั้นไม่มีใบหน้า', true); } },
        { text: 'คืนหน้ากากให้แม่น้ำ', note: 'ได้ Karma และลบรอยผิดปกติออกจากตัว', effect: s => { s.hero.karma += 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 4); s.relations.parents += 2; addLog('หน้ากากจมหายไปในแม่น้ำ และเสียงกระซิบก็ไม่กลับมาอีก', true); } },
        { text: 'ให้ผู้ดูแลต่อรองกับช่างเร่', note: 'ได้เงินเล็กน้อยและได้ข่าวจากตลาด', effect: s => { s.hero.money += 5; s.hero.reputation += 2; s.paths.insight += 1; addLog('ช่างเร่ยอมแลกหน้ากากกับข่าวสารหนึ่งเรื่อง ก่อนหายไปในฝูงชนราวกับไม่เคยมีตัวตน', true); } }
      ]
    },
    {
      id: 'child_bamboo_whistle', flag: 'childBambooWhistle', phase: 'วัยเด็ก', minAge: 6, maxAge: 12,
      when: s => s.activity === 'explore' || s.locations?.current === 'roadside', title: 'เสียงขลุ่ยจากป่าไผ่',
      text: 'ระหว่างเดินตามทางป่า เจ้าพบขลุ่ยไม้ไผ่แขวนอยู่บนกิ่งที่สูงเกินกว่าเด็กทั่วไปจะเอื้อมถึง ทว่าเมื่อเจ้าหันหลัง เสียงทำนองกลับดังขึ้นเองจากภายในป่า\n\nทำนองนั้นไม่ได้เรียกเจ้าไปข้างหน้า แต่นำทางกลับบ้านอย่างแม่นยำ แม้เส้นทางที่เดินอยู่จะไม่ใช่ทางเดิม\n\nเมื่อกลับถึงเรือน ขลุ่ยในมือกลับมีรอยสลักรูปเส้นทางที่ไม่เคยเห็นบนแผนที่ใด',
      choices: [
        { text: 'เก็บขลุ่ยไว้ใช้ยามหลงทาง', note: 'ได้ไอเทมช่วยสำรวจและเพิ่มว่องไว', effect: s => { addTreasure(s, 'ขลุ่ยนำทางป่าไผ่', { agility: 8, luck: 6, intellect: 4 }, { grade: 'epic' }); s.hero.attributes.luck += 2; addLog('ขลุ่ยนำทางป่าไผ่ส่งเสียงเบา ๆ ทุกครั้งที่เจ้าหันผิดทาง', true); } },
        { text: 'เป่าทำนองตอบกลับไป', note: 'อาจได้ยินเสียงตอบกลับ แต่เสียสุขภาพ 3', effect: s => { s.paths.insight += 2; s.hero.attributes.intellect += 3; s.hero.health -= 3; s.flags.bambooPathKnown = true; addLog('เสียงจากป่าตอบกลับมาเพียงครั้งเดียว แล้วทิ้งเส้นทางลับไว้ในความทรงจำของเจ้า', true); } },
        { text: 'แขวนขลุ่ยคืนไว้บนกิ่งเดิม', note: 'ได้ Karma และหลีกเลี่ยงอันตราย', effect: s => { s.hero.karma += 3; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 3); s.hero.reputation += 1; addLog('เมื่อขลุ่ยถูกแขวนคืน เสียงในป่าก็เงียบลง เหลือเพียงลมพัดผ่านใบไผ่', true); } }
      ]
    },
    {
      id: 'child_wounded_traveler', flag: 'childWoundedTraveler', phase: 'วัยเด็ก', minAge: 7, maxAge: 12,
      when: s => s.activity === 'explore' || s.hero?.health < s.hero?.maxHealth * .7, title: 'คนเจ็บใต้ต้นสน',
      text: 'ใต้ต้นสนริมทาง เจ้าพบคนเดินทางคนหนึ่งนอนกอดถุงผ้าไว้แน่น เลือดซึมผ่านชายเสื้อ แต่เขายังพยายามยิ้มให้เจ้า\n\nเขาไม่ได้ขอให้ช่วยรักษา เพียงถามว่าข้างหน้ามีหมู่บ้านหรือไม่ และขอให้เจ้ารับของชิ้นหนึ่งไว้ก่อนที่คนตามล่าจะมาถึง\n\nเสียงม้าดังมาจากทางไกล ขณะที่ถุงผ้าในมือเขาสั่นเบา ๆ ราวกับมีบางสิ่งยังมีชีวิตอยู่ข้างใน',
      choices: [
        { text: 'พาเขากลับไปหาผู้ใหญ่', note: 'เสียสุขภาพเล็กน้อย แต่ได้ของวิเศษและชื่อเสียง', effect: s => { addTreasure(s, 'เข็มกลัดผู้เดินทาง', { defense: 7, luck: 6 }, { grade: 'rare' }); s.hero.health -= 5; s.hero.reputation += 3; s.hero.karma += 2; addLog('คนเจ็บรอดถึงมือผู้ใหญ่ เขาทิ้งเข็มกลัดผู้เดินทางไว้เป็นคำขอบคุณก่อนจากไป', true); } },
        { text: 'รับถุงผ้าแล้วชี้ทางผิดให้ผู้ตามล่า', note: 'ได้ห่อผนึก แต่เสียสุขภาพ 4', effect: s => { s.flags.travelerSecret = true; s.paths.freedom += 2; s.paths.insight += 1; s.hero.health -= 4; addTreasure(s, 'ห่อผนึกของคนพเนจร', { agility: 8, intellect: 5 }, { grade: 'epic', sealed: true }); addLog('เจ้าชี้ทางผิดให้คนชุดดำ และคนเจ็บหายไปพร้อมถุงผ้าที่ไม่ยอมเปิดออก', true); } },
        { text: 'เดินผ่านไปเหมือนไม่เห็น', note: 'รักษาสุขภาพ แต่เสีย Karma', effect: s => { s.hero.karma -= 2; s.hero.attributes.luck -= 1; addLog('เมื่อเจ้าหันกลับมา คนเจ็บหายไปแล้ว เหลือเพียงรอยเลือดที่ถูกฝนชะล้าง', true); } }
      ]
    },
    {
      id: 'child_first_potion', flag: 'childFirstPotion', phase: 'วัยเด็ก', minAge: 8, maxAge: 12,
      when: s => s.activity === 'craft' || s.activity === 'study' || (s.materials?.herb || 0) >= 2, title: 'ยาขวดแรกของเจ้า',
      text: 'ในห้องครัวเล็ก ๆ เจ้าเห็นผู้ใหญ่พยายามต้มยาจากสมุนไพรที่เก็บมาทั้งวัน แต่ไฟอ่อนเกินไปและน้ำในหม้อเริ่มขุ่น\n\nเมื่อเจ้าขยับช้อนตามจังหวะที่ได้ยินจากเสียงลม ยากลับใสขึ้นและมีกลิ่นหอมเย็นกระจายทั่วเรือน\n\nไม่มีใครรู้ว่านั่นเป็นเพียงความบังเอิญ หรือมือเล็ก ๆ ของเจ้าจดจำวิธีปรุงบางอย่างจากที่ใด',
      choices: [
        { text: 'ปรุงยาต่อจนเสร็จ', note: 'ใช้สมุนไพร 2 ชิ้น ได้ยาและความรู้คราฟต์', requires: s => (s.materials?.herb || 0) >= 2, effect: s => { s.materials.herb -= 2; s.crafting.knowledge.alchemy += 1; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 12); addTreasure(s, 'ยาหอมลมหายใจแรก', { body: 6, spirit: 6 }, { grade: 'rare', consumable: true }); addLog('ยาหอมลมหายใจแรกสำเร็จเป็นครั้งแรก ช่างยาในเรือนเริ่มมองเจ้าไม่เหมือนเด็กทั่วไป', true); } },
        { text: 'เก็บตัวยาไว้ให้ผู้เชี่ยวชาญตรวจ', note: 'ได้ความรู้และเพิ่มโอกาสเรียนรู้วิชาในอนาคต', effect: s => { s.hero.attributes.intellect += 3; s.hero.attributes.spirit += 2; s.flags.potionKnowledge = true; s.hero.reputation += 1; addLog('ผู้เชี่ยวชาญยืนยันว่าตัวยาไม่มีพิษ และจดชื่อส่วนผสมไว้ในตำราให้ครอบครัว', true); } },
        { text: 'เทยาทิ้งก่อนเกิดอันตราย', note: 'ปลอดภัยที่สุด แต่เสียวัตถุดิบ', effect: s => { s.materials.herb = Math.max(0, (s.materials.herb || 0) - 1); s.hero.attributes.spirit += 1; addLog('เจ้าเทยาที่มีกลิ่นผิดปกติทิ้ง ก่อนที่ไอร้อนจากหม้อจะเปลี่ยนเป็นควันสีดำ', true); } }
      ]
    },
    {
      id: 'youth_sect_invitation', flag: 'youthSectInvitation', phase: 'วัยหนุ่มสาว', minAge: 13, maxAge: 18,
      when: s => s.flags?.metSect || s.activity === 'sect' || s.locations?.current === 'sect', title: 'จดหมายเชิญใต้ตราเมฆา',
      text: 'จดหมายผนึกขี้ผึ้งสีฟ้าถูกส่งมาถึงในคืนที่เมฆปกคลุมยอดเขา ตราบนซองเป็นของสำนักที่ไม่เคยส่งคำเชิญให้คนทั่วไป\n\nผู้ส่งเขียนเพียงว่าเคยเห็นชื่อของเจ้าปรากฏในบันทึกเก่า และต้องการให้เจ้าไปพบผู้ดูแลหอคัมภีร์ก่อนที่ฤดูหนาวจะมาถึง\n\nคำเชิญไม่มีตรารับรองจากอาจารย์ผู้ใด แต่กระดาษกลับมีปราณไหลเวียนอยู่จริง',
      choices: [
        { text: 'รับคำเชิญและเดินทางไปพบผู้ส่ง', note: 'เพิ่มชื่อเสียงและเปิดโอกาสเรียนรู้', effect: s => { s.flags.sectLetterAccepted = true; s.hero.reputation += 4; s.hero.attributes.intellect += 2; s.hero.cultivation += s.hero.cultivationAccess ? 8 : 0; addTreasure(s, 'ตราผนึกคำเชิญเมฆา', { intellect: 8, spirit: 6 }, { grade: 'rare' }); addLog('เจ้ารับจดหมายและได้พบผู้ดูแลหอคัมภีร์ เขาไม่สอนวิชา แต่เปิดประตูให้เจ้าอ่านบันทึกที่คนทั่วไปไม่มีสิทธิ์เห็น', true); } },
        { text: 'นำจดหมายไปให้อาจารย์ตรวจ', note: 'เพิ่มความสัมพันธ์กับอาจารย์และลดความเสี่ยง', effect: s => { s.relations.master += 6; s.flags.sectLetterVerified = true; s.hero.attributes.spirit += 2; addLog('อาจารย์ตรวจตราผนึกอยู่นาน ก่อนบอกว่าจดหมายนี้ไม่ได้มาจากศัตรู แต่ก็ไม่ควรเชื่อทั้งหมด', true); } },
        { text: 'เผาจดหมายทิ้ง', note: 'หลีกเลี่ยงความเสี่ยง แต่เสียโอกาสและชื่อเสียง 1', effect: s => { s.paths.freedom += 2; s.hero.reputation -= 1; addLog('จดหมายกลายเป็นเถ้าในมือเจ้า เส้นทางหนึ่งปิดลงโดยไม่มีใครรู้ว่าเคยเปิดอยู่', true); } }
      ]
    },
    {
      id: 'youth_duel_token', flag: 'youthDuelToken', phase: 'วัยหนุ่มสาว', minAge: 14, maxAge: 18,
      when: s => s.activity === 'train' || s.activity === 'social' || (s.hero?.power || 0) >= 40, title: 'ป้ายท้าประลองหน้าฝน',
      text: 'ป้ายไม้สีแดงถูกตอกไว้หน้าสำนักในเช้าวันฝนตก ชื่อของเจ้าถูกเขียนไว้ด้วยหมึกดำ ทั้งที่เจ้าไม่เคยรับคำท้าจากผู้ใด\n\nผู้คนมารวมตัวรอบลานประลอง บางคนต้องการเห็นเจ้าชนะ บางคนเพียงรอหัวเราะเมื่อเจ้าถอยหนี\n\nคู่แข่งไม่เผยหน้า แต่ทิ้งถ้อยคำไว้ว่า เพลงกระบี่ของเจ้ามีรอยต่อที่คนในอดีตเคยใช้ทำลายตระกูลหนึ่ง',
      choices: [
        { text: 'รับคำท้าและขึ้นลานประลอง', note: 'เสี่ยงบาดเจ็บ แต่ได้ชื่อเสียงและพลัง', effect: s => { s.flags.duelWitnessed = true; s.hero.powerBonus += 28; s.hero.reputation += 5; s.hero.health -= 6; s.relations.senior += 3; addTreasure(s, 'เหรียญผู้ผ่านลานประลอง', { attack: 8, agility: 6 }, { grade: 'rare' }); addLog('เจ้ารับคำท้าต่อหน้าฝูงชน แม้ยังไม่รู้ว่าใครส่งป้ายมา แต่ชื่อของเจ้าถูกจดจำในฐานะผู้ไม่ถอย', true); } },
        { text: 'ตรวจสอบที่มาของคำท้าก่อน', note: 'พบเบาะแสศัตรูและเพิ่มปัญญา', effect: s => { s.paths.insight += 3; s.flags.duelOriginKnown = true; s.hero.attributes.intellect += 2; addLog('เบาะแสบนป้ายเชื่อมไปถึงศัตรูเก่าของคนในสำนัก การประลองครั้งนี้อาจไม่ใช่เรื่องส่วนตัวของเจ้า', true); } },
        { text: 'ฉีกป้ายทิ้งต่อหน้าฝูงชน', note: 'รักษาสุขภาพ แต่ชื่อเสียงเปลี่ยนไป', effect: s => { s.paths.freedom += 2; s.hero.reputation += 1; s.relations.senior -= 2; addLog('เจ้าฉีกป้ายท้าประลองต่อหน้าทุกคน บางคนเรียกมันว่าขี้ขลาด บางคนกลับเรียกมันว่าการเลือกสนามของตนเอง', true); } }
      ]
    },
    {
      id: 'youth_old_letter', flag: 'youthOldLetter', phase: 'วัยหนุ่มสาว', minAge: 15, maxAge: 18,
      when: s => s.activity === 'social' || (s.relations?.friend || 0) >= 3, title: 'จดหมายจากผู้ที่จากไป',
      text: 'จดหมายฉบับหนึ่งถูกส่งมาถึงเจ้าหลังจากผู้เขียนหายไปจากเมืองนานหลายปี กระดาษมีกลิ่นดอกไม้แห้งและรอยน้ำตาที่ลบไม่ออก\n\nข้อความด้านในไม่ได้กล่าวถึงความรักหรือการจากลา แต่เตือนว่าอย่าเชื่อคนที่เอ่ยชื่อของเจ้าในงานเลี้ยงคืนนี้\n\nท้ายจดหมายมีแผนที่ครึ่งแผ่นและประโยคสั้น ๆ ว่า หากเจ้าจำข้าได้ จงอย่ามาตามหา',
      choices: [
        { text: 'ไปงานเลี้ยงและสังเกตคนที่เอ่ยชื่อเจ้า', note: 'ได้ชื่อเสียงและแผนที่ แต่เสี่ยงมีศัตรู', effect: s => { s.flags.oldLetterFollowed = true; s.paths.insight += 3; s.hero.reputation += 3; s.relations.enemy += 1; addTreasure(s, 'แผนที่ครึ่งใบจากคนเก่า', { intellect: 8, luck: 5 }, { grade: 'rare' }); addLog('ที่งานเลี้ยงมีคนเอ่ยชื่อเจ้าจริง และเขารีบออกจากงานทันทีเมื่อสบตาเจ้า', true); } },
        { text: 'เผาจดหมายและเก็บแผนที่ไว้', note: 'รักษาความลับและได้ไอเทมเบาะแส', effect: s => { s.flags.oldLetterBurned = true; s.paths.freedom += 2; addTreasure(s, 'เศษแผนที่ไร้นาม', { luck: 7, agility: 5 }, { grade: 'rare', sealed: true }); addLog('จดหมายถูกเผา เหลือเพียงแผนที่ครึ่งใบที่ไม่บอกว่าพาไปหาใคร', true); } },
        { text: 'เล่าเรื่องนี้ให้สหายฟัง', note: 'เพิ่มความสัมพันธ์และลดความเสี่ยงจากการรับมือคนเดียว', effect: s => { s.relations.friend += 8; s.relations.companion += 3; s.hero.attributes.charm += 2; addLog('สหายของเจ้าช่วยจำรายละเอียดในจดหมาย และสัญญาว่าจะไม่ปล่อยให้เจ้าตามรอยนี้เพียงลำพัง', true); } }
      ]
    },
    {
      id: 'builder_debt_seal', flag: 'builderDebtSeal', phase: 'วัยสร้างตัว', minAge: 19, maxAge: 30,
      when: s => (s.household?.debt || 0) > 0 || (s.hero?.money || 0) < 10, title: 'ตราประทับหนี้เก่า',
      text: 'เจ้าพบตราประทับสีชาดบนเอกสารหนี้ที่ไม่มีชื่อเจ้าของ แต่ทุกบรรทัดกลับระบุทรัพย์สินของเจ้าได้ถูกต้อง\n\nเจ้าหนี้ยืนยันว่าหนี้นี้สืบทอดมาจากคนที่เคยช่วยครอบครัวของเจ้า และกำหนดให้ชำระภายในเจ็ดวัน\n\nหากปฏิเสธ บ้านอาจถูกยึด หากยอมรับ เจ้าจะได้รู้ว่าความช่วยเหลือในอดีตมีราคาสูงเพียงใด',
      choices: [
        { text: 'ชำระหนี้เท่าที่มี', note: 'ใช้เงินเพื่อลดหนี้และรักษาชื่อเสียง', requires: s => (s.hero?.money || 0) >= 6, effect: s => { s.hero.money -= 6; s.household.debt = Math.max(0, (s.household.debt || 0) - 8); s.hero.reputation += 3; s.hero.karma += 2; addLog('เงินก้อนเล็กถูกวางลงบนโต๊ะ เจ้าหนี้ยอมลดตราประทับและเลื่อนกำหนดส่วนที่เหลือ', true); } },
        { text: 'ตรวจสอบว่าใครเป็นเจ้าของหนี้ตัวจริง', note: 'พบเบาะแสของตระกูลและเพิ่มปัญญา', effect: s => { s.flags.inheritedDebtTruth = true; s.paths.insight += 3; s.hero.attributes.intellect += 2; addTreasure(s, 'ใบรับรองหนี้เก่าของตระกูล', { intellect: 8, reputation: 5 }, { grade: 'rare', sealed: true }); addLog('เอกสารอีกชุดเผยว่าหนี้นี้ถูกขยายตัวเลขโดยมือที่สาม และตราประทับเดิมไม่ใช่ของเจ้าหนี้คนปัจจุบัน', true); } },
        { text: 'ฉีกเอกสารต่อหน้าเจ้าหนี้', note: 'รักษาเงิน แต่เพิ่มศัตรูและความเสี่ยง', effect: s => { s.relations.enemy += 4; s.hero.reputation -= 3; s.hero.karma -= 1; s.flags.debtProvoked = true; addLog('เอกสารถูกฉีกเป็นชิ้น เจ้าหนี้ไม่พูดอะไร เพียงส่งคนติดตามเจ้าออกจากตรอก', true); } }
      ]
    },
    {
      id: 'builder_forge_oath', flag: 'builderForgeOath', phase: 'วัยสร้างตัว', minAge: 20, maxAge: 30,
      when: s => s.activity === 'craft' || s.locations?.current === 'owned' || s.locations?.current === 'estate', title: 'ค้อนแรกของโรงช่าง',
      text: 'ช่างตีเหล็กเก่าที่บ้านของเจ้าขอให้ช่วยเฝ้าเตาหลอมในคืนที่เขาจะตีอาวุธชิ้นสุดท้ายของชีวิต\n\nประกายไฟทุกเม็ดสะท้อนภาพของสิ่งที่เจ้าสร้างไว้ในช่วงหลายปีที่ผ่านมา ทั้งบ้าน หนี้ ผู้คน และคำสัญญาที่เคยให้\n\nเมื่อค้อนตกลงครั้งสุดท้าย เหล็กในเตากลับมีรูปร่างตามความตั้งใจที่เจ้าซ่อนไว้ลึกที่สุด',
      choices: [
        { text: 'ตีอาวุธตามคำสัตย์ของตน', note: 'ได้อาวุธเกรด Epic และเพิ่มพลังรบ', effect: s => { addTreasure(s, 'ค้อนคำสัตย์แห่งเตาหลอม', { attack: 16, defense: 10, body: 8 }, { grade: 'epic' }); s.hero.powerBonus += 35; s.hero.reputation += 2; s.flags.forgeWeaponMade = true; addLog('อาวุธจากเตาหลอมมีรูปร่างตามคำสัตย์ของเจ้า และช่างเฒ่าก็ยอมรับว่าเจ้าสร้างสิ่งหนึ่งขึ้นมาด้วยตนเองแล้ว', true); } },
        { text: 'ตีเครื่องมือสำหรับคนในบ้าน', note: 'เพิ่มความมั่นคงครัวเรือนและลดค่าใช้จ่าย', effect: s => { s.hero.money += 8; s.household.monthlyCost = Math.max(0, (s.household.monthlyCost || 0) - 1); s.family.legacyScore += 3; addTreasure(s, 'เครื่องมือเหล็กประจำเรือน', { body: 8, defense: 6 }, { grade: 'rare' }); addLog('ค้อนของเจ้าสร้างเครื่องมือที่ทำให้คนในบ้านทำงานง่ายขึ้น และค่าใช้จ่ายบางส่วนลดลง', true); } },
        { text: 'ดับเตาก่อนงานเสร็จ', note: 'ไม่รับไอเทม แต่รักษาสุขภาพและเปิดทางใหม่', effect: s => { s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 6); s.paths.freedom += 2; addLog('เจ้าดับเตาก่อนโลหะจะได้รูปร่าง ช่างเฒ่าไม่โกรธ เพียงบอกว่าบางครั้งการวางค้อนก็เป็นการตัดสินใจเช่นกัน', true); } }
      ]
    },
    {
      id: 'builder_border_contract', flag: 'builderBorderContract', phase: 'วัยสร้างตัว', minAge: 22, maxAge: 30,
      when: s => s.activity === 'travel' || s.activity === 'work' || s.locations?.current === 'roadside', title: 'สัญญาจากด่านตะวันตก',
      text: 'กองคาราวานจากด่านตะวันตกเสนอสัญญาให้เจ้านำสินค้าไปส่งยังเมืองที่ไม่มีชื่ออยู่บนแผนที่ทั่วไป\n\nค่าตอบแทนสูงกว่าค่าจ้างหลายเท่า แต่ผู้คุมขบวนไม่ยอมบอกว่าสินค้าในหีบคืออะไร และกำชับว่าห้ามเปิดแม้ได้ยินเสียงจากด้านใน\n\nเส้นทางนี้อาจสร้างชื่อให้เจ้า หรือทำให้คนทั้งด่านจำชื่อของเจ้าในฐานะผู้ทรยศ',
      choices: [
        { text: 'รับสัญญาและคุมขบวนไปจนสุดทาง', note: 'ได้เงินและชื่อเสียง แต่เสี่ยงสุขภาพ', effect: s => { s.hero.money += 18; s.hero.reputation += 4; s.hero.health -= 8; s.paths.freedom += 2; addTreasure(s, 'ตราคาราวานตะวันตก', { agility: 10, luck: 6 }, { grade: 'rare' }); addLog('คาราวานถึงด่านปลายทางโดยไม่เปิดหีบ เจ้ากลับมาพร้อมเงินก้อนใหญ่และตราที่เปิดทางให้เดินทางไกลขึ้น', true); } },
        { text: 'ขอตรวจสินค้าและเงื่อนไขก่อนออกเดินทาง', note: 'ตรวจเงื่อนไขสัญญาและเพิ่มปัญญา', effect: s => { s.paths.insight += 3; s.hero.attributes.intellect += 2; s.flags.caravanContractRead = true; s.hero.reputation += 1; addLog('เจ้าพบว่าหีบมีของต้องห้ามปะปนอยู่ จึงต่อรองสัญญาใหม่ก่อนยอมเดินทาง', true); } },
        { text: 'ปฏิเสธและแจ้งทางการ', note: 'ได้ Karma แต่สร้างศัตรูกับคนในคาราวาน', effect: s => { s.hero.karma += 3; s.hero.reputation += 2; s.relations.enemy += 2; addLog('ทางการยึดคาราวานไว้ตรวจสอบ แต่คนคุมขบวนจำหน้าของเจ้าได้และไม่คิดให้อภัย', true); } }
      ]
    },
    {
      id: 'middle_old_enemy', flag: 'middleOldEnemy', phase: 'วัยกลางคน', minAge: 31, maxAge: 50,
      when: s => (s.relations?.enemy || 0) > 0 || (s.hero?.reputation || 0) >= 10, title: 'ศัตรูเก่ามาเคาะประตู',
      text: 'คนผู้หนึ่งมาหยุดอยู่หน้าบ้านในคืนที่ลมแรง ใบหน้าของเขาแก่ลงกว่าความทรงจำ แต่ท่าทางตอนวางมือบนด้ามอาวุธยังเหมือนเดิม\n\nเขาไม่ได้มาท้าสู้ เพียงนำของชิ้นหนึ่งที่เคยเป็นของผู้ตายมาวางไว้ และบอกว่าคนรุ่นใหม่กำลังจะรื้อฟื้นความแค้นเก่า\n\nหากเจ้ารับของไว้ เรื่องที่ควรจบอาจเริ่มต้นอีกครั้ง หากปฏิเสธ ความจริงบางส่วนอาจสูญหายไปตลอดกาล',
      choices: [
        { text: 'รับของและฟังความจริงจนจบ', note: 'ได้ไอเทมและเปิดเบาะแสศัตรูเก่า', effect: s => { s.flags.oldEnemyTruth = true; s.relations.enemy = Math.max(0, s.relations.enemy - 3); s.paths.insight += 3; addTreasure(s, 'ตราประทับจากศัตรูเก่า', { attack: 12, intellect: 8 }, { grade: 'epic' }); addLog('ศัตรูเก่าวางตราประทับลงบนโต๊ะ และความจริงที่ถูกฝังมานานก็มีพยานเพิ่มขึ้นอีกหนึ่งคน', true); } },
        { text: 'คืนของและขอให้เรื่องจบลงที่หน้าประตู', note: 'รักษาความสงบ แต่พลาดข้อมูลสำคัญ', effect: s => { s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 4); s.hero.reputation += 1; s.paths.freedom += 2; addLog('ของชิ้นนั้นถูกส่งคืน ประตูปิดลง และเจ้าตัดสินใจไม่ให้ความแค้นของคนรุ่นก่อนกำหนดวันพรุ่งนี้', true); } },
        { text: 'เรียกพยานและคนของตระกูลมาร่วมฟัง', note: 'เพิ่มความปลอดภัย แต่ความสัมพันธ์ศัตรูอาจรุนแรงขึ้น', effect: s => { s.hero.reputation += 4; s.relations.enemy += 2; s.family.legacyScore += 4; s.flags.oldEnemyWitnessed = true; addLog('ความจริงถูกเปิดเผยต่อหน้าพยานหลายฝ่าย ไม่มีใครฆ่าใครในคืนนั้น แต่หนี้แค้นก็ถูกจดชื่อไว้อย่างเป็นทางการ', true); } }
      ]
    },
    {
      id: 'middle_heir_scroll', flag: 'middleHeirScroll', phase: 'วัยกลางคน', minAge: 32, maxAge: 50,
      when: s => (s.family?.children?.length || 0) > 0 || s.activity === 'family', title: 'ม้วนคัมภีร์ของผู้สืบทอด',
      text: 'ในหีบเก่าของตระกูล เจ้าพบม้วนคัมภีร์ที่เขียนด้วยลายมือของบรรพบุรุษ แต่เนื้อหากลับไม่ใช่วิชา เป็นเพียงบันทึกว่าคนรุ่นก่อนเลือกอะไรเมื่อไม่มีทางเลือกที่ดี\n\nหน้าสุดท้ายเว้นที่ว่างไว้สำหรับชื่อของผู้สืบทอดคนต่อไป และหมึกบนพู่กันยังไม่แห้งสนิททั้งที่ไม่มีใครแตะต้องมัน\n\nทายาทของเจ้ามองม้วนคัมภีร์ด้วยแววตาคาดหวัง ขณะที่เจ้ารู้ว่าทุกคำที่เขียนลงไปจะกลายเป็นภาระของคนรุ่นหลัง',
      choices: [
        { text: 'เขียนความผิดพลาดของตนลงไปตามจริง', note: 'เพิ่ม Legacy และความสัมพันธ์กับครอบครัว', effect: s => { s.family.legacyScore += 8; s.family.bond += 5; s.relations.parents += 1; s.hero.karma += 2; addLog('เจ้าจารึกทั้งชัยชนะและความผิดพลาดลงในม้วนคัมภีร์ ทายาทจะไม่ต้องเรียนรู้จากคำโกหกของคนรุ่นก่อน', true); } },
        { text: 'เขียนเฉพาะสิ่งที่ทำให้ตระกูลภาคภูมิใจ', note: 'ชื่อเสียงเพิ่ม แต่ความจริงบางส่วนถูกปิดบัง', effect: s => { s.family.legacyScore += 5; s.hero.reputation += 5; s.flags.legacyBeautified = true; addTreasure(s, 'ตราหมึกบันทึกตระกูล', { charm: 8, reputation: 8 }, { grade: 'rare' }); addLog('ม้วนคัมภีร์เล่าเรื่องที่งดงามที่สุดของตระกูล ส่วนความจริงที่หนักกว่านั้นถูกเก็บไว้ในใจของเจ้า', true); } },
        { text: 'เผาม้วนคัมภีร์และให้ทายาทเริ่มใหม่', note: 'ให้ทายาทเริ่มใหม่ แต่ลดชื่อเสียงสืบทอดของตระกูล', effect: s => { s.family.legacyScore = Math.max(0, s.family.legacyScore - 3); s.paths.freedom += 3; s.hero.karma -= 1; addLog('เปลวไฟลบชื่อของคนรุ่นก่อนออกจากกระดาษ เหลือเพียงโอกาสให้ผู้สืบทอดเขียนเส้นทางของตนเอง', true); } }
      ]
    },
    {
      id: 'middle_broken_banner', flag: 'middleBrokenBanner', phase: 'วัยกลางคน', minAge: 35, maxAge: 50,
      when: s => s.flags?.metSect || s.activity === 'sect' || s.hero?.cultivationAccess, title: 'ธงที่ขาดเหนือยอดเขา',
      text: 'ธงสำนักที่เคยปักอยู่เหนือยอดเขาถูกส่งมาถึงเรือนของเจ้าในสภาพขาดครึ่งหนึ่ง ไม่มีจดหมาย ไม่มีผู้ส่ง และไม่มีใครกล้าบอกว่ามันหลุดมาจากสนามรบใด\n\nบนผืนผ้ามีรอยเลือดเก่าและชื่อของศิษย์หลายคนที่เจ้าจำได้ แม้เวลาจะผ่านไปนานจนบางคนกลายเป็นเพียงชื่อในพงศาวดาร\n\nธงผืนนี้รอให้เจ้าตัดสินใจว่าจะซ่อม เก็บ หรือเผา เพื่อให้เรื่องของสำนักจบลงพร้อมคนรุ่นนั้น',
      choices: [
        { text: 'ซ่อมธงและนำไปปักใหม่', note: 'เพิ่มชื่อเสียงและพลังใจของผู้คน', effect: s => { s.flags.sectBannerRestored = true; s.hero.reputation += 6; s.hero.powerBonus += 30; s.relations.master += 2; addTreasure(s, 'ธงเมฆาที่เย็บคืน', { defense: 12, spirit: 8 }, { grade: 'epic' }); addLog('ธงที่ขาดถูกเย็บใหม่ แม้รอยต่อยังมองเห็น แต่คนที่เห็นมันรู้ว่าสำนักยังไม่ถูกลืม', true); } },
        { text: 'เก็บธงไว้ในหอความทรงจำ', note: 'เพิ่ม Legacy และรักษาความสงบ', effect: s => { s.family.legacyScore += 4; s.hero.karma += 2; s.flags.sectBannerArchived = true; addLog('ธงถูกเก็บไว้ในหอความทรงจำ ไม่มีใครต้องตายเพื่อมันอีก แต่ชื่อของผู้ล่วงลับยังไม่ถูกลืม', true); } },
        { text: 'เผาธงตามธรรมเนียมผู้ตาย', note: 'ปล่อยอดีต แต่เสียชื่อเสียงบางส่วน', effect: s => { s.paths.freedom += 2; s.hero.reputation -= 2; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 5); addLog('ธงกลายเป็นเถ้าเหนือยอดเขา และเจ้าปล่อยให้เสียงลมพูดแทนคนที่ไม่มีโอกาสกลับมา', true); } }
      ]
    },
    {
      id: 'elder_last_herb', flag: 'elderLastHerb', phase: 'วัยชรา', minAge: 51, maxAge: 150,
      when: s => (s.hero?.health || 0) < (s.hero?.maxHealth || 100) * .55 || s.activity === 'rest', title: 'สมุนไพรต้นสุดท้าย',
      text: 'สมุนไพรต้นหนึ่งงอกขึ้นข้างบ่อน้ำในปีที่ไม่มีสิ่งใดเติบโต มันมีใบเพียงสามใบและดอกเดียว แต่กลิ่นของมันทำให้ความเจ็บปวดตามข้อกระดูกเบาบางลง\n\nผู้คนบอกให้เจ้าเก็บมันไว้กินในคืนสุดท้าย เพราะยานี้อาจยืดลมหายใจได้อีกหลายปี\n\nแต่เจ้ารู้ดีว่า หากถอนมันในวันนี้ จะไม่มีใครได้เห็นว่าพืชต้นนี้จะออกดอกอีกครั้งหรือไม่',
      choices: [
        { text: 'ถอนมาต้มเป็นยาให้ตนเอง', note: 'ฟื้นสุขภาพและเพิ่มอายุขัยเล็กน้อย', effect: s => { s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 22); ensureLifespanState(s); s.hero.lifespanMonths += 24; s.hero.lifespan = s.hero.lifespanMonths / 12; addTreasure(s, 'เม็ดยาสมุนไพรต้นสุดท้าย', { body: 8, spirit: 8 }, { grade: 'epic', consumable: true }); addLog('ยาจากสมุนไพรต้นสุดท้ายช่วยให้เจ้าหายใจได้ลึกขึ้นอีกครั้ง แม้รู้ว่าทุกสิ่งย่อมมีวันหมดลง', true); } },
        { text: 'ฝากให้ผู้สืบทอดดูแลต่อ', note: 'เพิ่ม Legacy และ Karma แต่ไม่ได้ฟื้นสุขภาพทันที', effect: s => { s.family.legacyScore += 7; s.hero.karma += 4; s.flags.lastHerbInherited = true; addLog('เจ้าฝากสมุนไพรต้นสุดท้ายไว้กับคนรุ่นหลัง และสอนว่าการรักษาชีวิตไม่จำเป็นต้องเริ่มจากการเด็ดทุกสิ่งมาเป็นของตน', true); } },
        { text: 'แบ่งรากให้ผู้ป่วยในหมู่บ้าน', note: 'เพิ่ม Karma และชื่อเสียง แต่เสียโอกาสยืดชีวิต', effect: s => { s.hero.karma += 7; s.hero.reputation += 5; s.hero.health = Math.max(1, s.hero.health - 4); addLog('รากสมุนไพรถูกแบ่งเป็นชิ้นเล็ก ๆ หลายส่วน ผู้ป่วยรอดชีวิต แม้เวลาของเจ้าจะไม่เพิ่มขึ้นเลย', true); } }
      ]
    },
    {
      id: 'elder_chronicle', flag: 'elderChronicle', phase: 'วัยชรา', minAge: 55, maxAge: 150,
      when: s => s.activity === 'family' || (s.family?.legacyScore || 0) > 5, title: 'หน้าว่างในพงศาวดาร',
      text: 'พงศาวดารตระกูลมาถึงหน้าสุดท้ายที่ยังว่างอยู่ ชื่อของคนรุ่นก่อนเต็มทุกบรรทัด ตั้งแต่ผู้ก่อตั้งจนถึงคนที่หายไปโดยไม่มีใครรู้ชะตา\n\nคนในเรือนนำพู่กันมาให้เจ้า และถามว่าควรเขียนอะไรไว้เพื่อให้ผู้สืบทอดจดจำ\n\nนอกหน้าต่าง แสงเย็นกำลังเลื่อนผ่านหลังคาอย่างช้า ๆ ราวกับเวลาเองก็กำลังรอคำตอบของเจ้า',
      choices: [
        { text: 'เขียนเรื่องราวทั้งหมดตามจริง', note: 'เพิ่ม Legacy และชื่อเสียงตระกูล', effect: s => { s.family.legacyScore += 10; s.hero.reputation += 4; s.hero.karma += 2; addLog('หน้าสุดท้ายถูกเติมด้วยเรื่องจริง ทั้งชัยชนะ ความสูญเสีย และสิ่งที่เจ้าปรารถนาให้คนรุ่นหลังไม่ทำซ้ำ', true); } },
        { text: 'เขียนคำสอนสั้น ๆ ไว้เพียงหนึ่งประโยค', note: 'ได้ไอเทมพงศาวดารและเพิ่มจิตใจ', effect: s => { s.family.legacyScore += 6; s.hero.attributes.spirit += 4; addTreasure(s, 'พู่กันพงศาวดารปลายชีวิต', { spirit: 10, charm: 6 }, { grade: 'epic' }); addLog('เจ้าวางพู่กันหลังเขียนประโยคเดียว แต่คนในเรือนกลับจดจำมันได้แม่นกว่าพงศาวดารทั้งเล่ม', true); } },
        { text: 'ปล่อยให้หน้าว่างอยู่เช่นนั้น', note: 'ให้ผู้สืบทอดเลือกอนาคตของตน', effect: s => { s.paths.freedom += 3; s.family.legacyScore += 1; s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 5); addLog('หน้าสุดท้ายยังคงว่าง ผู้สืบทอดจึงมีสิทธิ์เขียนคำตอบของตนเองโดยไม่ต้องเดินตามเงาของเจ้า', true); } }
      ]
    },
    {
      id: 'elder_empty_seat', flag: 'elderEmptySeat', phase: 'วัยชรา', minAge: 60, maxAge: 150,
      when: s => s.hero?.health < s.hero?.maxHealth * .7 || (s.hero?.reputation || 0) >= 15, title: 'ที่นั่งว่างใต้แสงจันทร์',
      text: 'ในงานรวมญาติปีนี้ มีที่นั่งหนึ่งตัวถูกเว้นไว้ให้คนที่ไม่มีวันกลับมา ทุกคนรู้ว่าควรเก็บมันไว้ แต่ไม่มีใครรู้ว่าควรพูดถึงเจ้าของที่นั่งหรือไม่\n\nเมื่อแสงจันทร์ตกกระทบโต๊ะ ถ้วยชาที่วางอยู่ตรงนั้นกลับมีไอน้ำลอยขึ้น ทั้งที่ไม่มีใครรินชา\n\nคนในเรือนหันมามองเจ้า เพราะรู้ว่าคำพูดสุดท้ายเกี่ยวกับที่นั่งนี้ควรเป็นของผู้ที่ผ่านชีวิตมานานที่สุด',
      choices: [
        { text: 'เล่าเรื่องของผู้จากไปให้คนรุ่นหลังฟัง', note: 'เพิ่มความสัมพันธ์และ Legacy', effect: s => { s.family.legacyScore += 6; s.relations.relatives += 5; s.hero.karma += 2; addLog('ชื่อของผู้จากไปถูกเรียกอีกครั้งในเรือน ไม่ใช่เพื่อรั้งเขาไว้ แต่เพื่อไม่ให้ชีวิตของเขาหายไปจากความทรงจำ', true); } },
        { text: 'เก็บถ้วยชาไว้เป็นของระลึก', note: 'ได้รับถ้วยชาของผู้ล่วงลับ', effect: s => { addTreasure(s, 'ถ้วยชาของผู้ล่วงลับ', { spirit: 12, intellect: 7, defense: 5 }, { grade: 'epic' }); s.paths.insight += 2; addLog('ถ้วยชาถูกเก็บไว้ในหอความทรงจำ ไอน้ำหายไปแล้ว แต่กลิ่นชาคืนเดิมยังคงอยู่', true); } },
        { text: 'ยกที่นั่งนั้นให้ผู้มาใหม่', note: 'เพิ่ม Karma และเปิดทางให้ครอบครัวเดินต่อ', effect: s => { s.hero.karma += 4; s.family.bond += 4; s.hero.reputation += 2; addLog('ที่นั่งว่างถูกมอบให้เด็กคนหนึ่งในเรือน ค่ำคืนนี้จึงไม่ใช่เพียงการไว้อาลัย แต่เป็นการยอมให้ชีวิตเดินหน้าต่อ', true); } }
      ]
    }
  ].map(scopedEpicEvent);
  const RANDOM_EVENTS = [
    // Bond Event: อาจารย์เหวิน
    {
      id: 'master_bond', minAge: 12, storyCharacter: 'lin-an', activity: 'train', minMonth: 90, unlock: s => s.relations.master >= 20, title: 'ชาน้ำชาบนผาเมฆา', text: 'อาจารย์เหวินรินชาสมุนไพรโบราณให้เจ้า “ในบรรดาศิษย์รุ่นนี้ แววตาของเจ้าหนักแน่นที่สุด” ท่านยื่นจี้หยกเก่าแก่ที่ลงอักขระคุ้มกายไว้ให้', choices: [
        { text: 'คุกเข่ารับจี้หยกและคำสอน', note: 'ได้รับจี้หยก · สวมใส่ต้องถึงหลอมกาย', effect: s => { s.flags.masterBondGiven = true; addTreasure(s, 'จี้หยกคุ้มชีพอาจารย์เหวิน', { defense: 10, body: 8 }); s.relations.master += 15; s.hero.cultivation += 25; addLog('จี้หยกไออุ่นของอาจารย์ปกป้องชีพจร ทำให้รากฐานมั่นคงขึ้น', true); } },
        { text: 'ขอเรียนเคล็ดลมปราณเสริมแทน', note: 'ความเร็วฝึกตน +15%', effect: s => { s.hero.combat.training += 15; s.relations.master += 10; addLog('อาจารย์ปรับชีพจรลมหายใจให้ ความเร็วในการบำเพ็ญเพิ่มขึ้นอย่างมาก', true); } }
      ]
    },
    // Bond Event: ศิษย์พี่เซี่ยหลัน
    {
      id: 'senior_bond', minAge: 12, storyCharacter: 'lin-an', activity: 'train', minMonth: 92, unlock: s => s.relations.senior >= 20, title: 'กระบี่ใต้แสงจันทร์', text: 'เซี่ยหลันเรียกเจ้าไปที่ลานกระบี่หลังเที่ยงคืน “เพลงกระบี่สำนักมีท่าลับที่บันทึกไว้เพียงนอกตำรา เจ้าพร้อมจะเรียนหรือไม่?”', choices: [
        { text: 'ฝึกกระบวนท่าลับจนรุ่งสาง', note: 'กระบี่หายาก · ขั้นต่ำหลอมกาย · เมื่อสวมใส่ โจมตี +30 · ว่องไว +10', effect: s => { s.flags.seniorBondGiven = true; addTreasure(s, 'กระบี่ธารเมฆาประสาน', { attack: 14, agility: 5 }); s.relations.senior += 15; s.hero.powerBonus += 80; addLog('เจ้ากับศิษย์พี่ประสานกระบี่ใต้แสงจันทร์ กระบวนท่าไหลลื่นไร้ช่องโหว่', true); } },
        { text: 'ขอให้ศิษย์พี่ช่วยฝึกเสริมร่างกาย', note: 'กายา +6 · สุขภาพสูงสุด +15', effect: s => { s.hero.combat.body += 6; s.hero.maxHealth += 15; s.hero.health = s.hero.maxHealth; s.relations.senior += 10; addLog('การฝึกเคี่ยวกรำของศิษย์พี่ทำให้กล้ามเนื้อและกระดูกแข็งแกร่งขึ้น', true); } }
      ]
    },
    // Bond Event: สหายเฉินหยู
    {
      id: 'friend_bond', minAge: 12, storyCharacter: 'lin-an', activity: 'explore', minMonth: 95, unlock: s => s.flags.helpedFriend === true, title: 'สัญญาใต้ต้นสน', text: 'เฉินหยูนำผลึกสมุนไพรหายากจากตระกูลของเขามามอบให้ “ถ้าวันนั้นเจ้าไม่ช่วยข้า ข้าคงกลายเป็นศพในป่าไปแล้ว สิ่งนี้ข้ามอบให้เจ้า”', choices: [
        { text: 'รับสมุนไพรและดื่มร่วมกัน', note: 'ฟื้นฟูสุขภาพเต็ม · สุขภาพสูงสุด +20', effect: s => { s.flags.friendBondGiven = true; s.hero.maxHealth += 20; s.hero.health = s.hero.maxHealth; s.relations.friend += 15; addLog('โอสถของเฉินหยูชำระล้างสิ่งสกปรกในชีพจร สุขภาพสมบูรณ์พร้อม', true); } },
        { text: 'แบ่งปันเคล็ดวิชาให้แก่กัน', note: 'พลัง +60 · ว่องไว +4', effect: s => { s.hero.combat.agility += 4; s.hero.powerBonus += 60; s.relations.friend += 18; addLog('มิตรภาพระหว่างศิษย์ร่วมรุ่นแน่นแฟ้น ทั้งสองต่างพัฒนาฝีมือร่วมกัน', true); } }
      ]
    },
    {
      id: 'street_instinct', activity: 'train', maxMonth: 83, title: 'บทเรียนจากตรอกแคบ', text: 'เด็กโตกว่าสามคนล้อมแย่งอาหาร เจ้าสังเกตว่าคนหัวโจกลงน้ำหนักที่ขาซ้ายไม่เต็ม การตัดสินใจครั้งนี้คือบทเรียนต่อสู้จริงครั้งแรก', choices: [
        { text: 'ใช้ทรายกับทางแคบเล่นงานทีละคน', effects: [{ type: 'stat', path: 'hero.powerBonus', value: 15 }, { type: 'stat', path: 'hero.reputation', value: -1 }, { type: 'stat', path: 'hero.health', value: -5 }], effect: () => addLog('เจ้าเรียนรู้ว่าชัยชนะไม่จำเป็นต้องงดงาม ขอเพียงมีชีวิตรอด', true) },
        { text: 'จำท่าทางแล้วถอยหนี ไม่เสี่ยงบาดเจ็บ', effects: [{ type: 'stat', path: 'hero.cultivation', value: 12 }, { type: 'stat', path: 'hero.health', value: 3 }], effect: () => addLog('เจ้าจำช่องโหว่ของทุกคนไว้ และเลือกไม่ต่อสู้ในวันที่เสียเปรียบ') }
      ]
    },
    {
      id: 'retainer_lesson', storyCharacter: 'lin-an', activity: 'train', maxMonth: 83, title: 'มีดไม้ของลุงโจว', text: 'ลุงโจวเหลาไม้เป็นมีดสั้น เขาบอกว่าทายาทตระกูลไม่ต้องชนะทุกครั้ง แต่ต้องรู้ว่าจะปกป้องสิ่งใดและหนีเมื่อใด', choices: [
        { text: 'ฝึกจนมือแตก', requires: s => s.flags.retainerAlive, locked: 'ลุงโจวไม่ได้อยู่สอนเจ้า', effect: s => { s.hero.powerBonus += 25; s.hero.health -= 7; addLog('แผลที่ฝ่ามือกลายเป็นพื้นฐานของทุกอาวุธที่เจ้าจับภายหลัง', true); } },
        { text: 'ขอเรียนวิธีอ่านทางหนีแทน', effect: s => { s.flags.escapePrepared = true; s.paths.insight += 1; addLog('เจ้าฝึกอ่านรอยล้อ ทิศลม และประตูที่ไม่มีคนเฝ้า'); } }
      ]
    },
    {
      id: 'enlightenment', minAge: 12, activity: 'train', minMonth: 84, unlock: s => !!s.hero?.cultivationAccess && !!equippedCultivationTechnique(s), title: 'หนึ่งลมหายใจ หนึ่งโลก', text: 'ระหว่างโคจรปราณ เสียงรอบกายเงียบหาย เจ้าสัมผัสประตูด่านที่ไม่เคยเห็นมาก่อน โอกาสตื่นรู้เช่นนี้อาจมีเพียงครั้งเดียว', choices: [
        { text: 'ปล่อยจิตตามกระแสเต๋า', note: 'ตื่นรู้ฉับพลัน: เปิดเผยวิชาบำเพ็ญ เพิ่มความก้าวหน้า และได้รอยตื่นรู้ช่วยฝึก', effect: s => { s.flags.enlightenment = true; s.hero.cultivation += 55; addTreasure(s, 'รอยตื่นรู้แห่งเมฆา', { training: 12 }); addLog('เจ้าตื่นรู้กลางลานฝึก ปราณก้าวหน้าเท่ากับหลายเดือน', true); } },
        { text: 'ถอนสมาธิ เก็บความมั่นคงไว้ก่อน', note: 'ปลอดภัย ฟื้นสุขภาพเล็กน้อย', effect: s => { s.hero.health = Math.min(s.hero.maxHealth, s.hero.health + 10); addLog('เจ้าไม่ไล่ตามภาพลวง รากฐานจึงมั่นคงขึ้น'); } }
      ]
    },
    {
      id: 'deviation', minAge: 12, activity: 'train', minMonth: 84, requires: s => s.hero && s.hero.cultivationAccess !== false, title: 'ปราณย้อนเข้าหัวใจ', text: 'การฝึกต่อเนื่องทำให้ลมปราณปั่นป่วน หากฝืนทะลวงด่านอาจก้าวหน้าในคืนเดียว—หรือชีพจรแตกดับ', choices: [
        { text: 'ฝืนทะลวงเดี๋ยวนี้', note: 'ต้องติดตั้งวิชาบำเพ็ญ · อันตรายถึงตาย: ควรมีพลัง 900 และสุขภาพ 45', requires: s => !!equippedCultivationTechnique(s) && !cultivationAtCeiling(s), locked: 'ต้องติดตั้งวิชาบำเพ็ญที่ยังไม่ถึงเพดานก่อน', effect: s => { if (s.hero.power >= 900 && s.hero.health >= 45) { advanceCultivationStage(s, 1, true); s.hero.health -= 22; addLog('เจ้าฝืนผ่านด่านสำเร็จ แม้เลือดไหลจากมุมปาก', true); } else { s.hero.health = 0; endGame('death_deviation', { cause: 'ฝืนทะลวงด่านทั้งที่รากฐานและสุขภาพไม่พอ ชีพจรระเบิดดับสิ้น' }); } } },
        { text: 'หยุดฝึกและระบายปราณ', note: 'เสียความก้าวหน้า 15 แต่ไม่เสี่ยงชีวิต', effect: s => { s.hero.cultivation = Math.max(0, s.hero.cultivation - 15); s.hero.health = Math.max(1, s.hero.health - 6); addLog('เจ้ารักษาชีพจรไว้ได้ แต่ต้องเริ่มสะสมปราณใหม่บางส่วน'); } }
      ]
    },
    {
      id: 'elder_lesson', minAge: 12, activity: 'train', minMonth: 84, title: 'ผู้เฒ่ากวาดลาน', text: 'ชายชราผู้กวาดลานชี้ว่าท่าของเจ้ามีช่องโหว่ เขาดูเหมือนคนธรรมดา แต่ไม้กวาดในมือไม่เคยแตะพื้นผิดจังหวะ', choices: [
        { text: 'คำนับขอคำชี้แนะ', effect: s => { s.hero.powerBonus += 40; s.hero.cultivation += 20; s.hero.reputation += 2; addLog('สามคำของผู้เฒ่าแก้สิ่งที่เจ้าติดขัดมาหลายเดือน', true); } },
        { text: 'ไม่สนใจ ฝึกตามตำราต่อไป', effect: s => { s.hero.cultivation += 8; addLog('ผู้เฒ่ายิ้มบาง ๆ แล้วไม่กล่าวอะไรอีก'); } }
      ]
    },
    {
      id: 'spar', minAge: 12, storyCharacter: 'lin-an', activity: 'train', minMonth: 84, title: 'คำท้าจากศิษย์พี่', text: 'เซี่ยหลันชวนเจ้าประลองเพื่อดูความก้าวหน้า การต่อสู้ครั้งนี้ไม่มีเดิมพันนอกจากศักดิ์ศรี', choices: [
        { text: 'รับคำท้า', note: 'พลัง 600 ขึ้นไปจึงมีโอกาสชนะ', requires: s => s.hero.power >= 600, locked: 'พลังยังไม่ถึง 600 (ขั้นรวบรวมวิญญาณ)', effect: s => { s.hero.reputation += 8; s.relations.senior += 8; s.hero.powerBonus += 40; addLog('เจ้ารับมือกระบี่ของเซี่ยหลันได้ครบสิบกระบวนท่า', true); } },
        { text: 'ขอฝึกด้วยกันแทน', effect: s => { s.relations.senior += 6; s.hero.cultivation += 12; addLog('การชี้แนะของศิษย์พี่ช่วยแก้จุดติดขัด'); } }
      ]
    },
    {
      id: 'work_investigation', minAge: 12, activity: 'work', minMonth: 60, conditions: { flag: { key: 'workWanted', value: true } }, title: 'เงาตามบัญชี', text: 'ข่าวการทำงานผิดกฎหมายเริ่มย้อนกลับมาหาเจ้า ทางการและสำนักต่างจับตาเส้นทางเงินของเจ้า', choices: [
        { text: 'ยอมคืนเงินและให้การ', note: 'ลดความเสี่ยง รักษาชีวิตและชื่อเสียงบางส่วน', effect: s => { s.flags.workWanted = false; s.hero.money = Math.max(0, s.hero.money - 12); s.hero.reputation += 5; s.household.workRisk = 0; addLog('เจ้าคืนเงินและเปิดเผยเครือข่ายบางส่วน ทางการยอมลดโทษ', true); } },
        { text: 'หนีต่อกับเครือข่ายใต้ดิน', note: 'ได้เงินเพิ่ม แต่ชื่อเสียงและความเสี่ยงร้ายขึ้น', effect: s => { s.flags.workedUnderworld = true; s.hero.money += 10; s.hero.reputation -= 10; s.hero.health -= 8; addLog('เจ้าหลบหนีการไล่ล่า กลายเป็นคนที่โลกปกติไม่อาจรับรอง', true); } }
      ]
    },
    {
      id: 'crooked_job', minAge: 12, activity: 'work', unlock: s => !!s.flags?.metSect, title: 'บัญชีที่ไม่ควรถาม', text: 'ผู้ดูแลคลังเสนอค่าจ้างก้อนใหญ่ให้แก้ตัวเลขสมุนไพรที่หายไป ไม่มีใครตรวจพบง่าย ๆ และเขาสัญญาว่าจะจำบุญคุณนี้', choices: [
        { text: 'รับงาน ปลอมบัญชีให้แนบเนียน', note: 'ได้เงินมาก ชื่อเสียงยุทธภพลด แต่พรรคงูดำเริ่มรู้จัก', effect: s => { s.flags.workedUnderworld = true; s.hero.money += 24; s.hero.reputation -= 12; addLog('เงินเต็มถุง แต่ชื่อของเจ้าถูกกระซิบในวงคนค้าของเถื่อน', true); } },
        { text: 'ปฏิเสธและนำเรื่องแจ้งอาจารย์', effect: s => { s.hero.reputation += 9; s.relations.master += 8; s.hero.money += 3; addLog('ผู้ดูแลคลังถูกสอบสวน สำนักเริ่มไว้ใจเจ้ามากขึ้น'); } }
      ]
    },
    {
      id: 'mine_collapse', minAge: 12, activity: 'work', minMonth: 24, title: 'อุโมงค์เหมืองถล่ม', text: 'เสียงหินแตกดังสนั่น คนงานสามคนติดอยู่หลังแนวไม้ค้ำที่กำลังหัก การเข้าไปต้องใช้ทั้งกำลังและเวลา', choices: [
        { text: 'ยกหินเปิดทางช่วยคนงาน', note: 'ต้องมีพลัง 120 (หลอมกายขั้นปลาย)', requires: s => s.hero.power >= 120, locked: 'พลังไม่ถึง 120 จึงยกหินไม่ไหว', effect: s => { s.hero.health -= 12; s.hero.reputation += 12; s.hero.money += 10; addLog('คนงานทั้งสามรอด ชื่อของเจ้าถูกเล่าทั่วหมู่บ้าน', true); } },
        { text: 'ถอยออกมาก่อนเหมืองพัง', note: 'ปลอดภัย แต่ผู้คนมองว่าเจ้าทอดทิ้งพวกเขา', effect: s => { s.hero.reputation -= 8; s.hero.health -= 2; addLog('อุโมงค์พังลงหลังเจ้าถอยออกมา เสียงขอความช่วยเหลือเงียบหาย'); } }
      ]
    },
    {
      id: 'forge', minAge: 12, activity: 'work', minMonth: 24, title: 'เหล็กดาวตกในเตาหลอม', text: 'ช่างตีเหล็กเมาพลาดทิ้งก้อนเหล็กดาวตกไว้ เจ้าช่วยประคองไฟจนมันหลอมได้ เขายอมตีของให้หนึ่งชิ้นแทนค่าจ้าง', choices: [
        { text: 'ตีเป็นกระบี่ดาวตก', note: 'กระบี่หายาก · ขั้นต่ำหลอมกาย · เมื่อสวมใส่ โจมตี +35 · ว่องไว +5', effect: s => { s.flags.spiritWeapon = true; addTreasure(s, 'กระบี่ดาวตก', { attack: 12 }); addLog('กระบี่ดาวตกส่งเสียงกังวานเมื่อปราณไหลผ่าน', true); } },
        { text: 'ขายเหล็ก แบ่งเงินกับช่าง', effect: s => { s.hero.money += 30; s.hero.reputation += 3; addLog('เงินก้อนใหญ่มาถึงมือโดยไม่มีผู้ใดเสียเปรียบ'); } }
      ]
    },
    {
      id: 'caravan', minAge: 12, activity: 'work', minMonth: 36, title: 'งานคุ้มกันขบวนสินค้า', text: 'พ่อค้าขอให้เจ้าคุ้มกันขบวนผ่านหุบเขา ค่าจ้างดี แต่ข่าวโจรป่าทำให้คนคุ้มกันคนอื่นถอนตัว', choices: [
        { text: 'รับงานคุ้มกัน', note: 'พลังต่ำกว่า 160 จะบาดเจ็บหนัก', effect: s => { if (s.hero.power >= 160) { s.hero.money += 18; s.hero.reputation += 5; addLog('ขบวนสินค้าถึงเมืองโดยปลอดภัย'); } else { s.hero.money += 5; s.hero.health -= 28; s.hero.reputation -= 3; addLog('โจรปล้นสินค้าไปกว่าครึ่ง เจ้ารอดกลับมาพร้อมบาดแผลหนัก', true); } } },
        { text: 'ปฏิเสธงานเสี่ยง', effect: s => { s.hero.money += 2; addLog('เจ้ารับงานเล็กในหมู่บ้านแทน วันนั้นผ่านไปอย่างเงียบสงบ'); } }
      ]
    },
    {
      id: 'spirit_fruit', minAge: 12, activity: 'explore', minMonth: 24, title: 'ผลชาดพันปี', text: 'บนหน้าผาที่ไม่ปรากฏในแผนที่ มีผลไม้สีชาดส่งกลิ่นปราณเข้มข้น เถาวัลย์รอบมันมีรอยกระดูกสัตว์กองอยู่', choices: [
        { text: 'กินผลชาดทันที', note: 'พรสวรรค์ดวงตาเฉียบคมหรือสุขภาพ 55 ช่วยต้านพิษ · กายา +8 · พักฟื้นดีขึ้น', effect: s => { if (s.hero.talent === 'keen' || s.hero.health >= 55) { s.flags.spiritFruit = true; s.hero.maxHealth += 16; s.hero.health = s.hero.maxHealth; addTreasure(s, 'แก่นผลชาด', { body: 8, restHealth: 8, restQi: 12 }); addLog('ปราณจากผลชาดหลอมเข้ากระดูก พลังเพิ่มพูนมหาศาล และเนื้อผลที่เหลือช่วยฟื้นตัวเมื่อพัก', true); } else { s.hero.health = 0; endGame('death_poison', { cause: 'กินผลวิเศษที่มีพิษร้ายแรงโดยไม่ตรวจสอบ พิษแทรกซึมเข้าสู่หัวใจ' }); } } },
        { text: 'เก็บตัวอย่างกลับไปตรวจสอบ', effect: s => { s.hero.money += 12; s.flags.savedHerbs = true; s.hero.reputation += 3; addLog('หอยายืนยันว่าผลชาดมีทั้งปราณและพิษรุนแรง'); } }
      ]
    },
    {
      id: 'ancient_blade', minAge: 12, activity: 'explore', minMonth: 36, title: 'กระบี่หักในสุสานไร้นาม', text: 'ใต้กองหิน เจ้าพบกระบี่หักที่ยังปล่อยไอสังหาร เจ้าของเดิมอาจเป็นยอดฝีมือ—หรือฆาตกรที่ถูกลบชื่อ', choices: [
        { text: 'หยดเลือดทำพันธสัญญา', note: 'พลัง 350 ขึ้นไปควบคุมได้ · สวมใส่ต้องถึงรวบรวมวิญญาณ · กระบี่มหากาพย์เพิ่มโจมตีและว่องไว แต่ลดกายา', effect: s => { if (s.hero.power >= 350) { s.flags.spiritWeapon = true; addTreasure(s, 'กระบี่หักกินโลหิต', { attack: 14, agility: 4 }); s.hero.reputation -= 5; addLog('กระบี่หักยอมสงบในมือ แต่ไอสังหารทำให้ผู้คนหวาดกลัว', true); } else { s.hero.health -= 35; s.hero.powerBonus += 30; addLog('กระบี่ต่อต้านและดูดเลือดไปมาก ก่อนเจ้าจะสะกดมันได้'); } } },
        { text: 'ฝังมันกลับตามเดิม', effect: s => { s.hero.reputation += 4; addLog('บางพลังไม่ควรถูกปลุก เจ้าจดจำตำแหน่งสุสานไว้'); } }
      ]
    },
    {
      id: 'beast_den', minAge: 12, activity: 'explore', minMonth: 60, title: 'รังพยัคฆ์เกราะดำ', text: 'พยัคฆ์ปีศาจขวางทางกลับ ด้านหลังมันมีหีบหยกโบราณ แต่กรงเล็บเดียวก็อาจฉีกร่างผู้ฝึกตนที่อ่อนแอได้', choices: [
        { text: 'สังหารพยัคฆ์ชิงหีบหยก', note: 'ต้องมีพลัง 400 · สวมใส่ต้องถึงหลอมกาย · เกราะเพิ่มป้องกัน +25 และกายา +15', requires: s => s.hero.power >= 400, locked: 'พลังไม่ถึง 400 การต่อสู้คือความตาย', effect: s => { s.hero.health -= 18; s.hero.money += 24; addTreasure(s, 'เกราะพยัคฆ์ดำ', { defense: 10, body: 6 }); addLog('หลังศึกหนัก เกราะพยัคฆ์กลายเป็นสมบัติของเจ้า', true); } },
        { text: 'โปรยอาหารล่อแล้วหลบหนี', effect: s => { s.hero.money = Math.max(0, s.hero.money - 4); s.hero.health -= 5; addLog('เจ้ารอดออกมาโดยไม่เห็นว่าภายในหีบมีสิ่งใด'); } }
      ]
    },
    {
      id: 'cave', minAge: 12, activity: 'explore', minMonth: 12, title: 'ถ้ำสะท้อนเสียง', text: 'ลึกเข้าไปในป่า เจ้าพบถ้ำที่มีปราณไหลเวียนผิดปกติ เสียงคล้ายคนเรียกดังมาจากความมืด', choices: [
        { text: 'เข้าไปสำรวจ', effect: s => { const good = s.hero.talent === 'keen' || s.hero.power >= 200; if (good) { revealRoot(s, 'ผลึกสะท้อนรากวิญญาณ'); if (s.hero.cultivationAccess) s.hero.cultivation += 22; else s.hero.bodyFoundation = Math.min(100, s.hero.bodyFoundation + 8); s.hero.money += 9; addLog(s.hero.cultivationAccess ? 'เจ้าพบผลึกปราณซ่อนอยู่ในผนังถ้ำ' : 'ผลึกสะท้อนรากวิญญาณเผยให้เห็นศักยภาพที่ซ่อนอยู่ แต่ยังไม่มีวิชาให้โคจรปราณ', true); } else { s.hero.health -= 16; s.hero.powerBonus += 15; addLog('ค้างคาวพิษทำให้เจ้าต้องหนีออกมา'); } } },
        { text: 'ทำเครื่องหมายไว้แล้วกลับ', effect: s => { s.flags.escapePrepared = true; s.hero.reputation += 2; addLog('ความรอบคอบอาจช่วยชีวิตในวันหน้า'); } }
      ]
    }
  ];
    return { WORLD_EVENTS, MIDDLE_GAME_EVENTS, DEBT_EVENTS, INFANT_LEGENDARY_EVENTS, INFANT_EPIC_EVENTS, SCOPED_EPIC_EVENTS, RANDOM_EVENTS };
  };
})();
