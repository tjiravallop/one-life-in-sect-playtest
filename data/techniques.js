(() => {
  'use strict';

  function createManualCatalog() {
  const MANUAL_DISCOVERY_TYPES = {
    fist: { label: 'หมัด', slot: 'combat', subtype: 'fist', manualSubtype: 'attack_fist', learningType: 'martial', names: ['หมัดสายธาร', 'หมัดสะท้อนหิน', 'หมัดสะท้านเมฆา'], bonus: power => ({ attack: Math.floor(power * .8), body: Math.floor(power / 2) }) },
    blade: { label: 'ดาบ', slot: 'combat', subtype: 'sword', manualSubtype: 'attack_sword', learningType: 'martial', names: ['ดาบลมเช้า', 'ดาบเงาจันทร์', 'ดาบแหวกหมอก'], bonus: power => ({ attack: power + Math.floor(power / 3) }) },
    defense: { label: 'คุ้มกาย', slot: 'defense', subtype: 'shield', manualSubtype: 'defense', learningType: 'martial', names: ['ม่านไม้ไผ่', 'ม่านหินผา', 'ม่านเมฆาซ้อน'], bonus: power => ({ defense: power, body: Math.floor(power / 3) }) },
    movement: { label: 'ย่างก้าว', slot: 'movement', subtype: 'step', manualSubtype: 'movement', learningType: 'survival', names: ['ก้าวใบไผ่', 'ก้าวข้ามธาร', 'ก้าวไร้รอย'], bonus: power => ({ agility: power, defense: Math.floor(power / 4) }) },
    cultivation: { label: 'บำเพ็ญ', slot: 'cultivation', subtype: 'breath', manualSubtype: 'cultivation', learningType: 'cultivation', names: ['ลมหายใจยามเช้า', 'โคจรธารเย็น', 'ปราณเมฆาทบชั้น'], bonus: power => ({ training: power }) }
  };
  const EXTRA_MANUAL_SCENES = [
    ['uncommon','fist','ภาพหมัดบนผืนผ้า','เจ้าพบคัมภีร์หมัดชั้นดีห่อด้วยผ้ากันฝนใต้สัมภาระเก่า'],
    ['extraordinary','fist','รอยหมัดบนแผ่นไม้','เจ้าพบคัมภีร์หมัดหายากเก็บอยู่ข้างแผ่นไม้ที่มีรอยฝึก'],
    ['epic','fist','สมุดหมัดในซากเก่า','เจ้าพบคัมภีร์หมัดมหากาพย์ในซากที่อาจพังลงมา'],
    ['uncommon','blade','สมุดดาบของผู้เดินทาง','เจ้าพบคัมภีร์ดาบชั้นดีในห่อของผู้เดินทางที่ถูกทิ้งไว้'],
    ['extraordinary','blade','ตำราดาบใต้รากไม้','เจ้าพบคัมภีร์ดาบหายากใต้รากไม้ใกล้พื้นที่ลาดชัน'],
    ['epic','blade','ม้วนดาบหลังแผ่นหิน','เจ้าพบคัมภีร์ดาบมหากาพย์ซ่อนหลังแผ่นหินที่ไม่มั่นคง'],
    ['uncommon','defense','บทคุ้มกายที่ตกหล่น','เจ้าพบคัมภีร์คุ้มกายชั้นดีในห่อกระดาษที่เปียกฝน'],
    ['extraordinary','defense','บันทึกรับแรง','เจ้าพบคัมภีร์คุ้มกายหายากในหีบเก่าข้างรอยทาง'],
    ['epic','defense','ตำราม่านป้องกัน','เจ้าพบคัมภีร์คุ้มกายมหากาพย์ในบริเวณซากปรักที่มีเศษหินหล่น'],
    ['uncommon','movement','แผนผังก้าวเท้า','เจ้าพบคัมภีร์ย่างก้าวชั้นดีพร้อมภาพรอยเท้าบนผืนผ้า'],
    ['extraordinary','movement','ม้วนก้าวข้ามธาร','เจ้าพบคัมภีร์ย่างก้าวหายากใกล้ทางน้ำที่ไหลเชี่ยว'],
    ['epic','movement','ตำราก้าวไร้รอย','เจ้าพบคัมภีร์ย่างก้าวมหากาพย์ในที่ซ่อนซึ่งทางกลับถูกหมอกบัง'],
    ['uncommon','cultivation','ลมหายใจในสมุดเก่า','เจ้าพบคัมภีร์บำเพ็ญชั้นดีอยู่ในห่อผ้าใต้สัมภาระ'],
    ['extraordinary','cultivation','ม้วนโคจรปราณ','เจ้าพบคัมภีร์บำเพ็ญหายากซ่อนในที่ซึ่งพื้นดินไม่มั่นคง'],
    ['epic','cultivation','คัมภีร์ปราณในซากหอ','เจ้าพบคัมภีร์บำเพ็ญมหากาพย์ในซากหอที่อาจพังทลาย']
  ].map(([rarity, type, title, text]) => [rarity, `manual_${type}`, title, text]);

  const ADDITIONAL_MANUAL_TECHNIQUES = [
  {
    "id": "discovery_alt_fist_uncommon",
    "type": "fist",
    "grade": "uncommon",
    "name": "หมัดตอกไม้",
    "bonus": {
      "attack": 3,
      "body": 3
    },
    "description": "ส่งหมัดสั้นจากช่วงเอว พร้อมตั้งกายให้มั่น",
    "title": "ม้วนหมัดในกองฟืน",
    "text": "เจ้าพบคัมภีร์หมัดตอกไม้ซ่อนอยู่ในห่อผ้าระหว่างท่อนไม้"
  },
  {
    "id": "discovery_alt_fist_rare",
    "type": "fist",
    "grade": "rare",
    "name": "หมัดขุนเขา",
    "bonus": {
      "attack": 8,
      "body": 3
    },
    "description": "ออกหมัดจากฐานเท้าหนักแน่นดั่งขุนเขา โดยรักษากำลังของร่างกายไว้พร้อมรับแรง",
    "title": "ภาพหมัดบนแผ่นไม้",
    "text": "เจ้าพบคัมภีร์หมัดขุนเขาในหีบที่ซ่อนหลังแผ่นไม้ชำรุด"
  },
  {
    "id": "discovery_alt_fist_epic",
    "type": "fist",
    "grade": "epic",
    "name": "หมัดอสนีคราม",
    "bonus": {
      "attack": 13,
      "body": 5
    },
    "description": "ผู้ฝึกขยับเท้าเข้าประชิดก่อนรวมแรงขึ้นจากพื้น แล้วส่งหมัดอย่างเด็ดขาดดุจอสนี พร้อมรักษารากฐานกายให้รองรับแรงสะท้อน",
    "title": "หมัดในศาลาร้าง",
    "text": "คัมภีร์หมัดอสนีครามอยู่บนชั้นหินของศาลาเก่าที่มีหลังคาชำรุด"
  },
  {
    "id": "discovery_alt_blade_uncommon",
    "type": "blade",
    "grade": "uncommon",
    "name": "ดาบตัดกิ่งหลิว",
    "bonus": {
      "attack": 5,
      "agility": 1
    },
    "description": "ฟันสั้นตามแนวโค้ง พร้อมก้าวเปลี่ยนมุมอย่างคล่องตัว",
    "title": "ดาบบนผ้าใบ",
    "text": "เจ้าพบคัมภีร์ดาบตัดกิ่งหลิวในผ้าใบที่พันอยู่รอบด้ามไม้"
  },
  {
    "id": "discovery_alt_blade_rare",
    "type": "blade",
    "grade": "rare",
    "name": "ดาบสลายหิมะ",
    "bonus": {
      "attack": 10,
      "defense": 2
    },
    "description": "คมดาบฟันหนักเพียงจังหวะเดียว ก่อนจัดแนวรับให้มั่นเหมือนหิมะที่ค่อย ๆ คลายตัว",
    "title": "ม้วนดาบในช่องหิน",
    "text": "คัมภีร์ดาบสลายหิมะถูกซ่อนไว้ในช่องหินที่ปากทางแคบ"
  },
  {
    "id": "discovery_alt_blade_epic",
    "type": "blade",
    "grade": "epic",
    "name": "ดาบเพลิงทมิฬ",
    "bonus": {
      "attack": 16,
      "defense": 3
    },
    "description": "ผู้ฝึกส่งคมดาบหนักแน่นดุจเปลวไฟในราตรี แล้วพลิกด้ามกลับสู่ท่าตั้งรับ เคล็ดนี้รักษาสมดุลระหว่างแรงฟันกับการป้องกัน",
    "title": "คัมภีร์หลังเตาหิน",
    "text": "เจ้าพบคัมภีร์ดาบเพลิงทมิฬด้านหลังเตาหินเก่าใกล้เศษซาก"
  },
  {
    "id": "discovery_alt_sword_uncommon",
    "type": "sword",
    "grade": "uncommon",
    "name": "กระบี่หยดน้ำ",
    "bonus": {
      "attack": 4,
      "agility": 1
    },
    "description": "ปลายกระบี่เคลื่อนเบาพร้อมก้าวสั้น ดั่งหยดน้ำที่เลื่อนไหล",
    "title": "กระบี่บนแพไม้",
    "text": "เจ้าพบคัมภีร์กระบี่หยดน้ำในกล่องเล็กผูกกับซากแพไม้"
  },
  {
    "id": "discovery_alt_sword_rare",
    "type": "sword",
    "grade": "rare",
    "name": "กระบี่วสันต์",
    "bonus": {
      "attack": 8,
      "agility": 3
    },
    "description": "แนวกระบี่เปลี่ยนไปตามจังหวะเท้าเหมือนสายลมฤดูใบไม้ผลิ ให้ความคล่องตัวเด่นกว่าการปะทะตรง",
    "title": "บันทึกกระบี่ในโพรง",
    "text": "เจ้าพบคัมภีร์กระบี่วสันต์ในโพรงไม้ที่มีรอยขุดเก่า"
  },
  {
    "id": "discovery_alt_sword_epic",
    "type": "sword",
    "grade": "epic",
    "name": "กระบี่ดาวเคียงจันทร์",
    "bonus": {
      "attack": 12,
      "agility": 6
    },
    "description": "ปลายกระบี่เปลี่ยนทิศพร้อมการย่างเท้า ดุจหมู่ดาวเคลื่อนรอบจันทร์ ผู้ฝึกอาศัยความคล่องตัวสร้างช่องว่างก่อนส่งคมเข้าหาเป้าหมาย",
    "title": "สมุดใต้โคมหิน",
    "text": "เจ้าพบคัมภีร์กระบี่ดาวเคียงจันทร์ใต้โคมหินที่เอนอยู่ริมทาง"
  },
  {
    "id": "discovery_alt_defense_uncommon",
    "type": "defense",
    "grade": "uncommon",
    "name": "เกราะเปลือกไม้",
    "bonus": {
      "defense": 4,
      "body": 2
    },
    "description": "ตั้งกายรับแรงอย่างยืดหยุ่น ดุจเปลือกไม้หุ้มแก่น",
    "title": "สมุดรับแรงในร่องไม้",
    "text": "คัมภีร์เกราะเปลือกไม้ถูกซ่อนไว้ในร่องของท่อนไม้กลวง"
  },
  {
    "id": "discovery_alt_defense_rare",
    "type": "defense",
    "grade": "rare",
    "name": "โล่ธารหิน",
    "bonus": {
      "defense": 8,
      "body": 4
    },
    "description": "ตั้งแขนรับแรงพร้อมรักษาจุดศูนย์ถ่วง ดุจก้อนหินที่ยืนอยู่ท่ามกลางธารไหล",
    "title": "ตำราคุ้มกายริมธาร",
    "text": "เจ้าพบคัมภีร์โล่ธารหินในห่อกันน้ำใกล้ทางน้ำตื้น"
  },
  {
    "id": "discovery_alt_defense_epic",
    "type": "defense",
    "grade": "epic",
    "name": "เกราะผาสวรรค์",
    "bonus": {
      "defense": 12,
      "body": 6
    },
    "description": "ผู้ฝึกวางฐานกายให้หนักแน่นดั่งผาสูง ก่อนผ่อนแรงจากไหล่ลงสู่เท้า เคล็ดรับแรงนี้ให้ความสำคัญกับความแข็งแรงของร่างกาย",
    "title": "บันทึกผาสูง",
    "text": "คัมภีร์เกราะผาสวรรค์อยู่ในซอกผาเก่าที่ต้องปีนอย่างระวัง"
  },
  {
    "id": "discovery_alt_movement_uncommon",
    "type": "movement",
    "grade": "uncommon",
    "name": "ก้าวนกกระจอก",
    "bonus": {
      "agility": 4,
      "defense": 2
    },
    "description": "ก้าวสั้นสลับซ้ายขวา เพื่อหลบพร้อมตั้งท่ารับ",
    "title": "แผนเท้าใต้ก้อนหิน",
    "text": "เจ้าพบคัมภีร์ก้าวนกกระจอกใต้ก้อนหินที่มีสัญลักษณ์เท้า"
  },
  {
    "id": "discovery_alt_movement_rare",
    "type": "movement",
    "grade": "rare",
    "name": "ย่างลมวน",
    "bonus": {
      "agility": 8,
      "defense": 3
    },
    "description": "หมุนตัวตามจังหวะเท้าเพื่อรักษาระยะและแนวป้องกัน แม้ต้องเคลื่อนที่ต่อเนื่อง",
    "title": "ผืนผ้าลายวน",
    "text": "เจ้าพบคัมภีร์ย่างลมวนม้วนอยู่ในผืนผ้าที่มีแผนก้าวเป็นวง"
  },
  {
    "id": "discovery_alt_movement_epic",
    "type": "movement",
    "grade": "epic",
    "name": "ก้าวเมฆาคล้อย",
    "bonus": {
      "agility": 12,
      "defense": 5
    },
    "description": "ผู้ฝึกเปลี่ยนระยะด้วยก้าวโค้งต่อเนื่องดั่งเมฆาที่เคลื่อนคล้อย การหันไหล่แต่ละครั้งช่วยรักษาแนวรับขณะเคลื่อนออกจากแรงปะทะ",
    "title": "ม้วนเท้าในหอเก่า",
    "text": "เจ้าพบคัมภีร์ก้าวเมฆาคล้อยในหอเก่าที่พื้นบางส่วนยุบตัว"
  },
  {
    "id": "discovery_alt_cultivation_uncommon",
    "type": "cultivation",
    "grade": "uncommon",
    "name": "ลมหายใจต้นสน",
    "bonus": {
      "training": 4,
      "body": 1
    },
    "description": "หายใจยาวตามจังหวะตั้งกาย เพื่อประคองการบำเพ็ญ",
    "title": "เคล็ดลมบนเปลือกไม้",
    "text": "เจ้าพบคัมภีร์ลมหายใจต้นสนห่ออยู่ในเปลือกไม้แห้ง"
  },
  {
    "id": "discovery_alt_cultivation_rare",
    "type": "cultivation",
    "grade": "rare",
    "name": "ปราณสายน้ำวน",
    "bonus": {
      "training": 8,
      "defense": 2
    },
    "description": "กำหนดปราณเป็นจังหวะวนอย่างสม่ำเสมอ พร้อมรักษาท่ากายให้มั่นคงตลอดการฝึก",
    "title": "ม้วนปราณในไหดิน",
    "text": "เจ้าพบคัมภีร์ปราณสายน้ำวนในไหดินที่ปิดผนึกด้วยผ้า"
  },
  {
    "id": "discovery_alt_cultivation_epic",
    "type": "cultivation",
    "grade": "epic",
    "name": "ห้วงปราณดารา",
    "bonus": {
      "training": 12,
      "body": 3
    },
    "description": "ผู้ฝึกค่อย ๆ รวบลมหายใจเป็นจังหวะยาวราวหมู่ดาวเรียงตัว พร้อมขัดเกลาร่างกายให้รองรับการบำเพ็ญที่ต่อเนื่อง",
    "title": "ตำราดาราในกล่องทองแดง",
    "text": "เจ้าพบคัมภีร์ห้วงปราณดาราในกล่องทองแดงใต้พื้นหินที่ชำรุด"
  }
];
  ADDITIONAL_MANUAL_TECHNIQUES.push(...[
  {
    "id": "discovery_third_fist_uncommon",
    "type": "fist",
    "grade": "uncommon",
    "name": "หมัดคลื่นทราย",
    "bonus": {
      "attack": 3,
      "defense": 1,
      "body": 1
    },
    "description": "ยืนหยัดแล้วส่งหมัดสั้นดุจคลื่นทรายกระทบฝั่ง",
    "title": "ตำราหมัดในห่อป่าน",
    "text": "เจ้าพบคัมภีร์หมัดคลื่นทรายในห่อป่านที่ซ่อนอยู่หลังหลักทาง"
  },
  {
    "id": "discovery_third_fist_rare",
    "type": "fist",
    "grade": "rare",
    "name": "หมัดหมีตั้งหลัก",
    "bonus": {
      "attack": 6,
      "defense": 2,
      "body": 3
    },
    "description": "ฝึกตั้งไหล่รับแรงก่อนส่งหมัดหนัก คล้ายหมีที่ยืนมั่นบนสองเท้า",
    "title": "สมุดหมัดในโพรงดิน",
    "text": "คัมภีร์หมัดหมีตั้งหลักอยู่ในโพรงดินที่มีเศษหินร่วงปิดทาง"
  },
  {
    "id": "discovery_third_fist_epic",
    "type": "fist",
    "grade": "epic",
    "name": "หมัดพิทักษ์ปฐพี",
    "bonus": {
      "attack": 10,
      "defense": 4,
      "body": 5
    },
    "description": "ผู้ฝึกถ่ายน้ำหนักลงสู่พื้นก่อนส่งแรงกลับผ่านกำปั้น ท่าที่มั่นคงช่วยรักษาการป้องกันและร่างกายยามเข้าประชิด",
    "title": "แผ่นจารึกหมัดใต้ผา",
    "text": "เจ้าพบคัมภีร์หมัดพิทักษ์ปฐพีในกล่องหินใต้หน้าผาที่แตกร้าว"
  },
  {
    "id": "discovery_third_blade_uncommon",
    "type": "blade",
    "grade": "uncommon",
    "name": "ดาบเฉือนเมฆ",
    "bonus": {
      "attack": 5,
      "body": 1
    },
    "description": "ฟันดาบจากฐานมั่นคง ให้คมผ่านเป้าหมายในจังหวะเดียว",
    "title": "ตำราดาบในซอกตอไม้",
    "text": "คัมภีร์ดาบเฉือนเมฆถูกสอดไว้ในซอกตอไม้ใกล้แนวทางเก่า"
  },
  {
    "id": "discovery_third_blade_rare",
    "type": "blade",
    "grade": "rare",
    "name": "ดาบวายุย้อน",
    "bonus": {
      "attack": 9,
      "agility": 3
    },
    "description": "ชักดาบกลับพร้อมเปลี่ยนเท้า แล้วอาศัยจังหวะลมย้อนเข้าหาช่องว่าง",
    "title": "ม้วนดาบใต้ผ้าคลุม",
    "text": "เจ้าพบคัมภีร์ดาบวายุย้อนใต้ผ้าคลุมเก่าซึ่งติดอยู่กับกิ่งไม้"
  },
  {
    "id": "discovery_third_blade_epic",
    "type": "blade",
    "grade": "epic",
    "name": "ดาบพิรุณทลาย",
    "bonus": {
      "attack": 15,
      "agility": 4
    },
    "description": "ผู้ฝึกเปลี่ยนมุมยืนก่อนฟันต่อเนื่องดั่งสายฝนที่กระทบพื้น ท่วงท่าเน้นแรงดาบและการขยับตัวเพื่อรักษาระยะโจมตี",
    "title": "หีบดาบในทางฝน",
    "text": "คัมภีร์ดาบพิรุณทลายอยู่ในหีบเก่าบนทางลาดที่ฝนกัดเซาะ"
  },
  {
    "id": "discovery_third_sword_uncommon",
    "type": "sword",
    "grade": "uncommon",
    "name": "กระบี่เข็มสน",
    "bonus": {
      "attack": 3,
      "agility": 2
    },
    "description": "ปลายกระบี่พุ่งสั้นและแม่นยำ พร้อมก้าวเบาราวเข็มสน",
    "title": "กระดาษลายเข็มสน",
    "text": "เจ้าพบคัมภีร์กระบี่เข็มสนม้วนอยู่ในกระบอกไม้ที่มีลายใบสน"
  },
  {
    "id": "discovery_third_sword_rare",
    "type": "sword",
    "grade": "rare",
    "name": "กระบี่สายรุ้ง",
    "bonus": {
      "attack": 7,
      "agility": 4
    },
    "description": "ก้าวเฉียงแล้วเปลี่ยนแนวกระบี่อย่างลื่นไหล ดั่งสีรุ้งที่ทอดผ่านหลังฝน",
    "title": "ตำราสีจางหลังฝน",
    "text": "คัมภีร์กระบี่สายรุ้งซ่อนในกล่องเคลือบสีใต้ชายหินที่เปียกฝน"
  },
  {
    "id": "discovery_third_sword_epic",
    "type": "sword",
    "grade": "epic",
    "name": "กระบี่ธารดารา",
    "bonus": {
      "attack": 11,
      "agility": 7
    },
    "description": "แนวกระบี่และก้าวเท้าเคลื่อนไหลราวธารดาว ผู้ฝึกอาศัยการเปลี่ยนทิศเข้าประชิดก่อนส่งคม แล้วถอยออกโดยไม่เสียจังหวะ",
    "title": "จารึกใต้แสงดาว",
    "text": "เจ้าพบคัมภีร์กระบี่ธารดาราในหีบไม้ใต้ศิลาที่มีรอยดาว"
  },
  {
    "id": "discovery_third_defense_uncommon",
    "type": "defense",
    "grade": "uncommon",
    "name": "ท่ายืนรากหญ้า",
    "bonus": {
      "defense": 3,
      "body": 3
    },
    "description": "ยืนรับแรงด้วยขาที่มั่นคง ดั่งรากหญ้ายึดดิน",
    "title": "สมุดท่ายืนริมทาง",
    "text": "เจ้าพบคัมภีร์ท่ายืนรากหญ้าในห่อผ้าที่ผูกไว้กับกิ่งไม้ต่ำ"
  },
  {
    "id": "discovery_third_defense_rare",
    "type": "defense",
    "grade": "rare",
    "name": "กายาฝนพรำ",
    "bonus": {
      "defense": 7,
      "body": 5
    },
    "description": "รับแรงทีละส่วนและผ่อนลมหายใจต่อเนื่อง ดั่งหยดฝนซึมลงสู่ผืนดิน",
    "title": "ม้วนผ้ารับฝน",
    "text": "คัมภีร์กายาฝนพรำอยู่ในม้วนผ้าที่ถูกซ่อนไว้ใต้กระเบื้องแตก"
  },
  {
    "id": "discovery_third_defense_epic",
    "type": "defense",
    "grade": "epic",
    "name": "กายาขุนเขาเงียบ",
    "bonus": {
      "defense": 11,
      "body": 7
    },
    "description": "ผู้ฝึกตั้งกายอย่างสงบนิ่งแล้วกระจายแรงไปยังฐานเท้า ท่าคุ้มกายนี้เสริมความแข็งแรงของร่างกายเพื่อรองรับการปะทะ",
    "title": "บันทึกกายาในถ้ำตื้น",
    "text": "เจ้าพบคัมภีร์กายาขุนเขาเงียบในกล่องเก่าของถ้ำตื้นที่มีหินหล่น"
  },
  {
    "id": "discovery_third_movement_uncommon",
    "type": "movement",
    "grade": "uncommon",
    "name": "ก้าวแมวป่า",
    "bonus": {
      "agility": 3,
      "defense": 2,
      "body": 1
    },
    "description": "ย่อกายแล้วก้าวสั้นเพื่อหลบ พร้อมรักษาการทรงตัว",
    "title": "ภาพเท้าบนแผ่นผ้า",
    "text": "เจ้าพบคัมภีร์ก้าวแมวป่าในแผ่นผ้าที่มีภาพรอยเท้าหลายจังหวะ"
  },
  {
    "id": "discovery_third_movement_rare",
    "type": "movement",
    "grade": "rare",
    "name": "ก้าวแยกเงา",
    "bonus": {
      "agility": 7,
      "defense": 4
    },
    "description": "เคลื่อนตัวออกด้านข้างก่อนตั้งแนวรับ ทำให้เปลี่ยนระยะได้โดยไม่เปิดช่องง่าย",
    "title": "บันทึกเงาบนพื้นหิน",
    "text": "เจ้าพบคัมภีร์ก้าวแยกเงาใต้แผ่นหินที่มีรอยขีดเป็นแนวเท้า"
  },
  {
    "id": "discovery_third_movement_epic",
    "type": "movement",
    "grade": "epic",
    "name": "ย่างวายุโอบผา",
    "bonus": {
      "agility": 11,
      "defense": 6
    },
    "description": "ผู้ฝึกก้าวเฉียงเลาะแนวแรงปะทะดุจลมวนรอบหน้าผา พร้อมยกแขนคุ้มกายขณะเปลี่ยนตำแหน่งอย่างต่อเนื่อง",
    "title": "ม้วนลมหลังโขดหิน",
    "text": "คัมภีร์ย่างวายุโอบผาวางในซอกหลังโขดหินซึ่งลมพัดแรง"
  },
  {
    "id": "discovery_third_cultivation_uncommon",
    "type": "cultivation",
    "grade": "uncommon",
    "name": "ลมหายใจดินอุ่น",
    "bonus": {
      "training": 3,
      "body": 2
    },
    "description": "หายใจช้าและมั่นคงเพื่อฝึกปราณควบคู่การตั้งกาย",
    "title": "สมุดลมหายใจในถุงผ้า",
    "text": "เจ้าพบคัมภีร์ลมหายใจดินอุ่นในถุงผ้าที่เก็บไว้ในภาชนะดิน"
  },
  {
    "id": "discovery_third_cultivation_rare",
    "type": "cultivation",
    "grade": "rare",
    "name": "ปราณเกล็ดน้ำค้าง",
    "bonus": {
      "training": 7,
      "body": 3
    },
    "description": "ค่อย ๆ รวบรวมลมหายใจดั่งหยดน้ำค้าง พร้อมขัดเกลาร่างกายให้มั่นคงระหว่างฝึก",
    "title": "คัมภีร์หยดน้ำค้าง",
    "text": "เจ้าพบคัมภีร์ปราณเกล็ดน้ำค้างในห่อกันชื้นข้างแนวหิน"
  },
  {
    "id": "discovery_third_cultivation_epic",
    "type": "cultivation",
    "grade": "epic",
    "name": "เคล็ดปราณขอบฟ้า",
    "bonus": {
      "training": 11,
      "defense": 4
    },
    "description": "ผู้ฝึกเรียงจังหวะหายใจให้ยาวและสม่ำเสมอราวเส้นขอบฟ้า พร้อมตั้งท่าคุ้มกายเพื่อประคองการบำเพ็ญ",
    "title": "บันทึกขอบฟ้าในหอร้าง",
    "text": "เจ้าพบคัมภีร์เคล็ดปราณขอบฟ้าในหอร้างที่หน้าต่างเปิดรับลมแรง"
  }
]);
  const EXTRA_MANUAL_ACTIONS = {
    discovery_alt_fist_uncommon: ['ดึงห่อผ้าออกจากระหว่างท่อนไม้', 'ดูว่าท่อนไม้กดห่ออยู่ตรงไหน', 'ปล่อยห่อผ้าไว้'],
    discovery_alt_fist_rare: ['เปิดหีบหลังแผ่นไม้ชำรุด', 'ตรวจแผ่นไม้ที่บังหีบก่อน', 'ไม่เปิดหีบหลังแผ่นไม้'],
    discovery_alt_fist_epic: ['ขึ้นชั้นหินไปหยิบคัมภีร์ในศาลา', 'ดูหลังคาศาลาที่ชำรุดจากด้านนอก', 'ไม่เข้าไปใต้หลังคาศาลา'],
    discovery_alt_blade_uncommon: ['แก้ผ้าใบจากด้ามไม้แล้วเก็บตำรา', 'ตรวจผ้าใบที่พันรอบด้ามไม้', 'วางด้ามไม้กับผ้าใบไว้'],
    discovery_alt_blade_rare: ['ลอดทางแคบไปเอาคัมภีร์จากช่องหิน', 'มองความกว้างของทางเข้าก่อน', 'ไม่ลอดเข้าไปในช่องทางแคบ'],
    discovery_alt_blade_epic: ['ค้นหลังเตาหินเพื่อนำคัมภีร์ออกมา', 'สังเกตเศษซากรอบเตาหิน', 'ออกจากบริเวณเตาเก่า'],
    discovery_alt_sword_uncommon: ['แก้กล่องออกจากซากแพไม้', 'ดูเชือกที่ผูกกล่องกับแพ', 'ทิ้งกล่องไว้กับซากแพ'],
    discovery_alt_sword_rare: ['นำคัมภีร์ออกจากโพรงไม้', 'ตรวจรอยขุดเก่าข้างโพรง', 'ไม่แตะโพรงไม้'],
    discovery_alt_sword_epic: ['หยิบตำราใต้โคมหินที่เอน', 'ดูว่าโคมหินเอนไปทางใด', 'เดินผ่านโคมหินโดยไม่หยิบตำรา'],
    discovery_alt_defense_uncommon: ['ดึงคัมภีร์ออกจากท่อนไม้กลวง', 'ดูร่องท่อนไม้ก่อนเอื้อมมือ', 'ปล่อยท่อนไม้ไว้'],
    discovery_alt_defense_rare: ['นำห่อกันน้ำจากข้างทางน้ำ', 'สำรวจความลึกของน้ำตื้น', 'ไม่เก็บห่อที่ริมน้ำ'],
    discovery_alt_defense_epic: ['ปีนขึ้นไปหยิบคัมภีร์จากซอกผา', 'ตรวจจุดจับบนผาก่อนปีน', 'ไม่ปีนขึ้นซอกผา'],
    discovery_alt_movement_uncommon: ['ยกหินสัญลักษณ์เท้าเพื่อเก็บตำรา', 'ดูเครื่องหมายเท้าบนก้อนหิน', 'ไม่ขยับก้อนหิน'],
    discovery_alt_movement_rare: ['คลี่ผืนผ้าและเก็บคัมภีร์', 'พิจารณาแผนก้าวเป็นวงบนผ้า', 'ปล่อยผืนผ้าม้วนไว้'],
    discovery_alt_movement_epic: ['ข้ามพื้นที่ยุบไปเอาคัมภีร์ในหอ', 'ตรวจพื้นหอจากปากทาง', 'ออกจากหอพื้นทรุด'],
    discovery_alt_cultivation_uncommon: ['แกะเปลือกไม้เพื่อเก็บคัมภีร์', 'ตรวจเปลือกไม้แห้งที่ห่อไว้', 'ทิ้งเปลือกไม้ไว้'],
    discovery_alt_cultivation_rare: ['เปิดผ้าผนึกไหดินแล้วเก็บคัมภีร์', 'ตรวจผ้าที่ปิดปากไห', 'ไม่เปิดไหดิน'],
    discovery_alt_cultivation_epic: ['ยกพื้นหินชำรุดเพื่อเอากล่องทองแดง', 'ตรวจรอยชำรุดบนพื้นหิน', 'ไม่ยกพื้นหิน'],
    discovery_third_fist_uncommon: ['เก็บห่อป่านหลังหลักทาง', 'ตรวจหลักทางและห่อป่านก่อน', 'ปล่อยห่อป่านไว้หลังหลัก'],
    discovery_third_fist_rare: ['เคลื่อนเศษหินเพื่อเอาคัมภีร์ในโพรง', 'ดูเศษหินที่ปิดโพรงดิน', 'ไม่ขุดโพรงที่มีหินร่วง'],
    discovery_third_fist_epic: ['เข้าใต้หน้าผาแตกร้าวไปเอากล่องหิน', 'ตรวจรอยแตกจากนอกหน้าผา', 'ออกห่างจากหน้าผา'],
    discovery_third_blade_uncommon: ['ดึงตำราดาบออกจากซอกตอไม้', 'สำรวจตอไม้ริมทางเก่า', 'ทิ้งตำราในตอไม้'],
    discovery_third_blade_rare: ['ปลดผ้าคลุมจากกิ่งไม้เพื่อเก็บตำรา', 'ดูว่าผ้าคลุมติดกิ่งตรงไหน', 'ไม่ปลดผ้าจากกิ่งไม้'],
    discovery_third_blade_epic: ['ไปเปิดหีบบนทางลาดที่ถูกฝนกัดเซาะ', 'ตรวจความมั่นคงของทางลาด', 'ไม่ขึ้นทางลาดที่สึกกร่อน'],
    discovery_third_sword_uncommon: ['เปิดกระบอกลายใบสนแล้วเก็บคัมภีร์', 'ดูรายละเอียดลายบนกระบอกไม้', 'ปล่อยกระบอกไม้ไว้'],
    discovery_third_sword_rare: ['นำกล่องเคลือบสีจากใต้ชายหินเปียกฝน', 'ดูพื้นเปียกใต้ชายหินก่อน', 'ไม่เข้าใต้ชายหินเปียก'],
    discovery_third_sword_epic: ['เปิดหีบไม้ใต้ศิลาลายดาว', 'ตรวจรอยดาวบนศิลาก่อน', 'ปล่อยหีบไว้ใต้ศิลา'],
    discovery_third_defense_uncommon: ['แก้ห่อผ้าจากกิ่งไม้ต่ำ', 'ตรวจปมที่ผูกห่อกับกิ่ง', 'ไม่แก้ห่อจากกิ่งไม้'],
    discovery_third_defense_rare: ['ยกกระเบื้องแตกเพื่อเอาม้วนผ้า', 'ดูขอบกระเบื้องแตกก่อนยก', 'ไม่แตะกระเบื้องแตก'],
    discovery_third_defense_epic: ['เข้าไปเอากล่องเก่าจากถ้ำที่มีหินหล่น', 'ฟังเสียงหินหล่นจากปากถ้ำ', 'ไม่เข้าไปในถ้ำ'],
    discovery_third_movement_uncommon: ['เก็บคัมภีร์บนแผ่นผ้ารอยเท้า', 'ดูภาพรอยเท้าหลายจังหวะ', 'วางแผ่นผ้าไว้'],
    discovery_third_movement_rare: ['ยกแผ่นหินรอยเท้าเพื่อเอาคัมภีร์', 'ตรวจแนวรอยขีดบนแผ่นหิน', 'ไม่ยกแผ่นหิน'],
    discovery_third_movement_epic: ['ฝ่าลมแรงไปหยิบคัมภีร์หลังโขดหิน', 'ดูทิศลมก่อนเข้าใกล้โขดหิน', 'ไม่เข้าไปด้านหลังโขดหิน'],
    discovery_third_cultivation_uncommon: ['เปิดภาชนะดินแล้วหยิบถุงคัมภีร์', 'ตรวจสภาพภาชนะดินก่อนเปิด', 'วางภาชนะดินไว้'],
    discovery_third_cultivation_rare: ['เก็บห่อกันชื้นข้างแนวหิน', 'ตรวจห่อกันชื้นก่อนหยิบ', 'ปล่อยห่อไว้ข้างแนวหิน'],
    discovery_third_cultivation_epic: ['เข้าไปเก็บคัมภีร์ที่หน้าต่างหอร้าง', 'มองภายในหอร้างจากทางเข้า', 'ไม่เข้าไปในหอร้าง']
  };
  const ADDITIONAL_MANUAL_TYPES = { ...MANUAL_DISCOVERY_TYPES, sword: { label: 'กระบี่', slot: 'combat', subtype: 'jian', manualSubtype: 'attack_jian', learningType: 'martial' } };

    return { MANUAL_DISCOVERY_TYPES, EXTRA_MANUAL_SCENES, ADDITIONAL_MANUAL_TECHNIQUES, EXTRA_MANUAL_ACTIONS, ADDITIONAL_MANUAL_TYPES };
  }

  function createTechniqueData({ MANUAL_DISCOVERY_TYPES, ADDITIONAL_MANUAL_TECHNIQUES, ADDITIONAL_MANUAL_TYPES }) {
  const TECHNIQUES = [
    { id: 'survival', name: 'สัญชาตญาณเอาตัวรอด', effect: 'กายา +1 · ว่องไว +1', bonus: { body: 1, agility: 1 }, unlock: () => true },
    { id: 'breath', name: 'เคล็ดรวบรวมปราณเมฆา', effect: 'วิชาบำเพ็ญพื้นฐาน · ความเร็วฝึกตน +10%', bonus: { training: 10 }, unlock: (s) => s.flags.basicCultivation },
    { id: 'sword', name: 'กระบี่ธารไหล', effect: 'โจมตี +6', bonus: { attack: 6 }, unlock: (s) => s.flags.swordLearned },
    { id: 'step', name: 'ย่างก้าวไร้เงา', effect: 'ว่องไว +6', bonus: { agility: 6 }, unlock: (s) => s.flags.stepLearned },
    { id: 'cloudShield', name: 'ม่านเมฆคุ้มกาย', effect: 'ป้องกัน +8', bonus: { defense: 8 }, unlock: (s) => s.flags.shieldLearned },
    { id: 'tigerBody', name: 'กายาพยัคฆ์หิน', effect: 'กายา +8 · ป้องกัน +3', bonus: { body: 8, defense: 3 }, unlock: (s) => s.flags.bodyLearned },
    { id: 'swiftBreath', name: 'โคจรปราณเก้าชีพจร', effect: 'ความเร็วฝึกตน +22%', bonus: { training: 22 }, unlock: (s) => s.flags.cultivationLearned },
    { id: 'ironBody', name: 'กายาเหล็กดำ', effect: 'ป้องกัน +5 · กายา +5', bonus: { defense: 5, body: 5 }, unlock: (s) => s.hero.combat?.body >= 15 },
    { id: 'clanBlade', name: 'มีดสั้นตระกูลหลิน', effect: 'โจมตี +5 · ว่องไว +3', bonus: { attack: 5, agility: 3 }, unlock: (s) => s.flags.familyToken },
    { id: 'starSword', name: 'กระบี่ดาวตก', effect: 'โจมตี +12', bonus: { attack: 12 }, unlock: (s) => s.flags.spiritWeapon },
    { id: 'voidBreath', name: 'หายใจหลอมสุญญตา', effect: 'ความเร็วฝึกตน +18% · โจมตี +4', bonus: { training: 18, attack: 4 }, unlock: (s) => s.flags.enlightenment },
    { id: 'forbidden', name: 'โลหิตงูดำต้องห้าม', effect: 'โจมตี +15 · กายา -3', bonus: { attack: 15, body: -3 }, unlock: (s) => s.flags.forbiddenPower },
    { id: 'masterPendant', name: 'จี้หยกคุ้มชีพอาจารย์เหวิน', effect: 'ป้องกัน +10 · กายา +8', bonus: { defense: 10, body: 8 }, unlock: (s) => s.flags.masterBondGiven },
    { id: 'seniorFlow', name: 'กระบี่ธารเมฆาประสาน', effect: 'โจมตี +14 · ว่องไว +5', bonus: { attack: 14, agility: 5 }, unlock: (s) => s.flags.seniorBondGiven },
    { id: 'discovery_sword_uncommon', name: 'กระบี่ทางไผ่', grade: 'uncommon', effect: 'โจมตี +5', bonus: { attack: 5 }, unlock: s => (s.learnedManualTechniques || []).includes('discovery_sword_uncommon') },
    { id: 'discovery_sword_rare', name: 'กระบี่เงาหิน', grade: 'rare', effect: 'โจมตี +9 · ว่องไว +2', bonus: { attack: 9, agility: 2 }, unlock: s => (s.learnedManualTechniques || []).includes('discovery_sword_rare') },
    { id: 'discovery_sword_epic', name: 'กระบี่ลวงหมอก', grade: 'epic', effect: 'โจมตี +14 · ว่องไว +4', bonus: { attack: 14, agility: 4 }, unlock: s => (s.learnedManualTechniques || []).includes('discovery_sword_epic') }
  ];
  Object.entries(MANUAL_DISCOVERY_TYPES).forEach(([type, def]) => {
    ['uncommon', 'rare', 'epic'].forEach((grade, index) => {
      const id = `discovery_${type}_${grade}`;
      const bonus = def.bonus([5, 9, 14][index]);
      const labels = { attack: 'โจมตี', defense: 'ป้องกัน', body: 'กายา', agility: 'ว่องไว', training: 'ความเร็วฝึก' };
      TECHNIQUES.push({ id, name: def.names[index], grade, techniqueSubtype: def.subtype, manualSlot: def.slot, learningType: def.learningType,
        effect: Object.entries(bonus).map(([key, value]) => `${labels[key]} +${value}${key === 'training' ? '%' : ''}`).join(' · '), bonus,
        unlock: s => (s.learnedManualTechniques || []).includes(id) });
    });
  });
  ADDITIONAL_MANUAL_TECHNIQUES.forEach(entry => {
    const def = ADDITIONAL_MANUAL_TYPES[entry.type];
    const labels = { attack: 'โจมตี', defense: 'ป้องกัน', body: 'กายา', agility: 'ว่องไว', training: 'ความเร็วฝึก' };
    TECHNIQUES.push({ id: entry.id, name: entry.name, grade: entry.grade, techniqueSubtype: def.subtype, manualSubtype: def.manualSubtype, manualSlot: def.slot, learningType: def.learningType, description: entry.description, bonus: { ...entry.bonus },
      effect: Object.entries(entry.bonus).map(([key, value]) => `${labels[key]} +${value}${key === 'training' ? '%' : ''}`).join(' · '), unlock: s => (s.learnedManualTechniques || []).includes(entry.id) });
  });
  TECHNIQUES.push({ id: 'manual_cloud_origin', name: 'ลมหายใจปฐมเมฆา', grade: 'uncommon', techniqueSubtype: 'breath', manualSlot: 'cultivation', learningType: 'cultivation', effect: 'ความเร็วฝึก +5%', bonus: { training: 5 }, unlock: s => (s.learnedManualTechniques || []).includes('manual_cloud_origin') });
  const WORKBOOK_TECHNIQUE_GRADE = { 'สามัญ': 'common', 'ชั้นดี': 'uncommon', 'หายาก': 'rare', 'มหากาพย์': 'epic', 'ตำนาน': 'legendary' };
  const WORKBOOK_TECHNIQUE_SHEETS = {
    Attack: { category: 'attack', slot: 'combat', learningType: 'martial', manualSubtype: subtype => subtype === 'fist' ? 'attack_fist' : 'attack_jian' },
    'Defense & Body': { category: 'defense', slot: 'defense', learningType: 'martial', manualSubtype: () => 'defense' },
    Movement: { category: 'movement', slot: 'movement', learningType: 'survival', manualSubtype: () => 'movement' },
    Cultivation: { category: 'cultivation', slot: 'cultivation', learningType: 'cultivation', manualSubtype: () => 'cultivation' }
  };
  const WORKBOOK_TECHNIQUE_ROWS = window.OneLifeWorkbookCatalog?.techniques;
  if (!WORKBOOK_TECHNIQUE_ROWS) throw new Error('Technique catalog requires data/workbook-catalogs.js');
  const WORKBOOK_TECHNIQUES = Object.entries(WORKBOOK_TECHNIQUE_SHEETS).flatMap(([sheet, definition]) =>
    (WORKBOOK_TECHNIQUE_ROWS[sheet] || []).map(row => {
      const grade = WORKBOOK_TECHNIQUE_GRADE[row.Grade];
      if (!grade) throw new Error(`Unknown workbook technique grade: ${row.Grade}`);
      const bonus = {};
      [['Attack', 'attack'], ['Defense', 'defense'], ['Agility', 'agility'], ['Body', 'body'], ['Training_Bonus(%)', 'training']].forEach(([column, key]) => {
        const value = Number(row[column]);
        if (Number.isFinite(value) && value !== 0) bonus[key] = value;
      });
      const technique = {
        id: row.ID, name: row.Display_Name, baseName: row.Base_Name, grade, category: definition.category,
        techniqueSubtype: row.Subtype, manualSlot: definition.slot, learningType: definition.learningType,
        manualSubtype: definition.manualSubtype(row.Subtype), manualRealm: Number(row.Game_Realm), manualStage: Number(row.Req_Stage),
        description: row.Description, bonus, workbookRealmName: row.Realm_Name,
        workbookStats: true, workbookSourceId: row.ID,
        unlock: state => (state.learnedManualTechniques || []).includes(row.ID)
      };
      if (definition.category === 'cultivation') {
        technique.maxRealm = Number(row.Game_Max_Realm);
        technique.maxStage = Number(row.Game_Max_Stage);
        technique.maxBoundary = row.Max_Boundary;
      }
      return technique;
    })
  );
  TECHNIQUES.push(...WORKBOOK_TECHNIQUES);
  const TECHNIQUE_DESCRIPTIONS = {
    survival: 'สัญชาตญาณที่ค่อย ๆ หล่อหลอมจากการเอาชีวิตรอด ทำให้ร่างกายพร้อมขยับเมื่อภัยมาถึง',
    breath: 'ลมหายใจพื้นฐานของสำนักเมฆาคราม ช่วยให้ผู้ฝึกประคองปราณอย่างสม่ำเสมอ',
    sword: 'คมกระบี่เคลื่อนไปตามจังหวะต่อเนื่อง ประหนึ่งสายน้ำที่ไม่หยุดไหล',
    step: 'ย่างเท้าอย่างเบาและเปลี่ยนตำแหน่งรวดเร็ว ทิ้งเพียงเงาที่จับทางได้ยาก',
    cloudShield: 'รวมแรงตั้งรับให้มั่นคง ดุจม่านเมฆาที่ซ้อนทับกันอยู่เบื้องหน้า',
    tigerBody: 'ขัดเกลาร่างกายให้รับแรงปะทะได้มั่นคง ดั่งพยัคฆ์ที่ยืนหยัดอยู่บนผาหิน',
    swiftBreath: 'กำหนดลมหายใจให้ผ่านชีพจรทีละสาย แล้วค่อย ๆ เพิ่มจังหวะการฝึกโดยไม่ปล่อยให้ปราณสะดุด',
    ironBody: 'ฝึกรับแรงซ้ำอย่างมีแบบแผน เพื่อให้ร่างกายแข็งแกร่งและยืนหยัดได้นานขึ้น',
    clanBlade: 'เคล็ดใช้มีดสั้นที่ตกทอดในตระกูลหลิน อาศัยก้าวสั้นและคมมีดเข้าประชิด',
    starSword: 'กระบี่ที่ออกคมอย่างรวดเร็วดุจดาวตก ผู้ใช้ต้องจับจังหวะให้มั่นก่อนส่งแรงออกไป',
    voidBreath: 'ปล่อยลมหายใจให้สงบก่อนรวบรวมพลัง ความว่างระหว่างแต่ละจังหวะช่วยให้จิตตั้งมั่น แล้วส่งแรงออกไปโดยไม่ลังเล',
    forbidden: 'เคล็ดโลหิตต้องห้ามที่เร่งพลังโจมตีอย่างรุนแรง แต่แรงย้อนกลับกัดกร่อนร่างกายของผู้ใช้',
    masterPendant: 'คำสอนและจี้หยกของอาจารย์เตือนให้ตั้งมั่นก่อนรับศึก ช่วยประคองทั้งร่างกายและการป้องกัน',
    seniorFlow: 'กระบี่ที่เรียนรู้ร่วมกับศิษย์พี่ เน้นรับส่งจังหวะให้ต่อเนื่อง จนการรุกและการเคลื่อนไหวประสานกันอย่างเป็นธรรมชาติ',
    manual_cloud_origin: 'ลมหายใจปฐมเมฆาเริ่มจากการตั้งจิตให้สงบ แล้วประคองการฝึกให้ต่อเนื่อง',
    discovery_sword_uncommon: 'กระบี่พื้นฐานที่ก้าวผ่านช่องแคบดั่งลมลอดแนวไผ่',
    discovery_sword_rare: 'ปลายกระบี่ซ่อนอยู่หลังจังหวะก้าวมั่นคงดุจเงาหิน ก่อนเปลี่ยนทิศเข้าหาช่องว่าง',
    discovery_sword_epic: 'ผู้ฝึกปล่อยคมกระบี่คล้อยตามจังหวะเท้า ราวกับเงาที่เลือนหายในม่านหมอก เมื่อคู่ต่อสู้มองตามคมแรก จึงเปลี่ยนแนวโจมตีจากอีกมุมอย่างต่อเนื่อง',
    discovery_fist_uncommon: 'ส่งหมัดจากฐานกายที่มั่นคง ให้แรงไหลต่อเนื่องดั่งสายน้ำ',
    discovery_fist_rare: 'ตั้งหลักรับแรงก่อนส่งหมัดกลับ ราวคลื่นสะท้อนจากหน้าผา ทั้งพลังโจมตีและร่างกายจึงเติบโตไปพร้อมกัน',
    discovery_fist_epic: 'ผู้ฝึกรวบแรงจากเท้าสู่หัวไหล่แล้วปล่อยหมัดหนักแน่น ดุจเสียงสะท้านกลางชั้นเมฆา เคล็ดนี้อาศัยรากฐานกายที่แข็งแรงเพื่อรองรับแรงที่ส่งออก',
    discovery_blade_uncommon: 'ดาบฟันตรงอย่างฉับไว ดั่งลมแรกที่พัดผ่านยามเช้า',
    discovery_blade_rare: 'คมดาบเคลื่อนผ่านจังหวะเงียบงัน ก่อนทุ่มแรงลงในแนวฟันเดียวที่หนักแน่นดั่งเงาจันทร์ทาบพื้น',
    discovery_blade_epic: 'ผู้ฝึกยกดาบรวบแรงไว้ครู่หนึ่ง ก่อนฟันเปิดทางราวผ่าม่านหมอก ทุกส่วนของร่างกายร่วมส่งแรงในทิศเดียว ทำให้คมดาบหนักแน่นยิ่งขึ้น',
    discovery_defense_uncommon: 'ตั้งกายรับแรงอย่างยืดหยุ่น ดั่งแนวไผ่ที่เอนตามลม',
    discovery_defense_rare: 'รับแรงด้วยท่าที่มั่นคงดั่งหน้าผา แล้วกระจายแรงผ่านร่างกายเพื่อลดการเสียหลัก',
    discovery_defense_epic: 'จัดท่ายืนและลมหายใจเป็นชั้นต่อเนื่อง ดุจม่านเมฆาซ้อนกันหลายแนว ผู้ฝึกค่อย ๆ ผ่อนแรงปะทะลง พร้อมรักษารากฐานกายให้มั่นคง',
    discovery_movement_uncommon: 'ย่างเท้าเบาและมั่นคง ดั่งใบไผ่ที่ลอยตามสายลม',
    discovery_movement_rare: 'เปลี่ยนจังหวะเท้าสั้นยาวดั่งก้าวข้ามธาร ช่วยให้เคลื่อนตัวคล่องและตั้งรับได้ทัน',
    discovery_movement_epic: 'ผู้ฝึกเคลื่อนเท้าอย่างต่อเนื่องจนยากจะจับจุดหยุดนิ่ง ราวเดินผ่านพื้นที่โดยไม่ทิ้งรอย ทุกการเปลี่ยนทิศยังรักษาท่าป้องกันไว้พร้อมกัน',
    discovery_cultivation_uncommon: 'ปรับลมหายใจให้สม่ำเสมอดั่งความสงบยามเช้า เพื่อเริ่มฝึกปราณ',
    discovery_cultivation_rare: 'โคจรปราณอย่างนุ่มนวลดั่งธารเย็น ผู้ฝึกจึงประคองจังหวะบำเพ็ญได้ต่อเนื่องขึ้น',
    discovery_cultivation_epic: 'รวบรวมลมหายใจเป็นจังหวะซ้อนกันดุจเมฆาหลายชั้น ผู้ฝึกค่อย ๆ เรียบเรียงทางเดินปราณและรักษาความต่อเนื่องตลอดการบำเพ็ญ'
  };
  TECHNIQUES.forEach(technique => { technique.description = TECHNIQUE_DESCRIPTIONS[technique.id] || technique.description || ''; });

  const TECHNIQUE_CATEGORY_DEFS = {
    attack: { id: 'attack', name: 'วิชาจู่โจม', subtypes: { fist: 'วิชาหมัด', sword: 'วิชาดาบ', jian: 'วิชากระบี่', dao: 'วิชาดาบใหญ่', spear: 'วิชาหอก', staff: 'วิชาพลอง', claw: 'วิชากรงเล็บ' } },
    defense: { id: 'defense', name: 'วิชาป้องกัน', subtypes: { body: 'วิชาหลอมกาย', shield: 'วิชาคุ้มกาย', qi: 'วิชาปราณพิทักษ์' } },
    movement: { id: 'movement', name: 'วิชาตัวเบา', subtypes: { step: 'วิชาก้าวเท้า', escape: 'วิชาหลบหนี', wind: 'วิชาลมกรด' } },
    cultivation: { id: 'cultivation', name: 'วิชาบำเพ็ญ', subtypes: { breath: 'วิชาปราณ', body: 'วิชาหลอมกาย', spirit: 'วิชาขัดเกลาจิต' } },
    support: { id: 'support', name: 'วิชาสนับสนุน', subtypes: { survival: 'วิชาเอาตัวรอด', craft: 'วิชาช่าง', insight: 'วิชาหยั่งรู้' } }
  };
  const WORKBOOK_LIBRARY_CATEGORY = { attack: 'attack', defense: 'defense', movement: 'movement', cultivation: 'cultivation' };
  const TECHNIQUE_LIBRARY = Object.fromEntries(Object.keys(WORKBOOK_TECHNIQUE_GRADE).map(gradeName => [WORKBOOK_TECHNIQUE_GRADE[gradeName], { attack: [], defense: [], movement: [], cultivation: [], support: [] }]));
  WORKBOOK_TECHNIQUES.forEach(item => TECHNIQUE_LIBRARY[item.grade][WORKBOOK_LIBRARY_CATEGORY[item.category]].push(item));
  const TECHNIQUE_LIBRARY_BY_ID = Object.fromEntries(Object.values(TECHNIQUE_LIBRARY).flatMap(group => Object.values(group).flat()).map(item => [item.id, item]));
  const COMMON_ATTACK_TECHNIQUES = TECHNIQUE_LIBRARY.common.attack;
  const COMMON_DEFENSE_TECHNIQUES = TECHNIQUE_LIBRARY.common.defense;
  const COMMON_MOVEMENT_TECHNIQUES = TECHNIQUE_LIBRARY.common.movement;
  const COMMON_CULTIVATION_TECHNIQUES = TECHNIQUE_LIBRARY.common.cultivation;
  const COMMON_ATTACK_TECHNIQUE_NAMES = Object.fromEntries([...new Set(COMMON_ATTACK_TECHNIQUES.map(item => item.techniqueSubtype))]
    .map(subtype => [subtype, COMMON_ATTACK_TECHNIQUES.filter(item => item.techniqueSubtype === subtype).map(item => item.name)]));
  const COMMON_DEFENSE_TECHNIQUE_NAMES = COMMON_DEFENSE_TECHNIQUES.map(item => item.name);
  const COMMON_MOVEMENT_TECHNIQUE_NAMES = COMMON_MOVEMENT_TECHNIQUES.map(item => item.name);
  const COMMON_CULTIVATION_TECHNIQUE_NAMES = COMMON_CULTIVATION_TECHNIQUES.map(item => item.name);
  const COMMON_SUPPORT_TECHNIQUE_NAMES = [];
  const COMMON_SUPPORT_TECHNIQUES = [];
    return { TECHNIQUES, TECHNIQUE_DESCRIPTIONS, TECHNIQUE_CATEGORY_DEFS, COMMON_ATTACK_TECHNIQUE_NAMES, COMMON_DEFENSE_TECHNIQUE_NAMES, COMMON_MOVEMENT_TECHNIQUE_NAMES, COMMON_CULTIVATION_TECHNIQUE_NAMES, COMMON_ATTACK_TECHNIQUES, COMMON_DEFENSE_TECHNIQUES, COMMON_MOVEMENT_TECHNIQUES, COMMON_CULTIVATION_TECHNIQUES, TECHNIQUE_LIBRARY, TECHNIQUE_LIBRARY_BY_ID, COMMON_SUPPORT_TECHNIQUE_NAMES, COMMON_SUPPORT_TECHNIQUES };
  }

  function createTechniqueRules() {
  const TECHNIQUE_MASTERY_LEVELS = [
    { min: 0, name: 'ยังไม่เข้าใจ' }, { min: 20, name: 'เริ่มต้น' }, { min: 50, name: 'คุ้นเคย' },
    { min: 80, name: 'เชี่ยวชาญ' }, { min: 120, name: 'แตกฉาน' }
  ];
  const TECHNIQUE_TRAINING_RULES = {
    breath: { kind: 'cultivation', minRootLevel: 1 }, swiftBreath: { kind: 'cultivation', minRootLevel: 2, requiresTeacher: true, requiresSect: true },
    voidBreath: { kind: 'cultivation', minRootLevel: 3, requiresTeacher: true, cost: { spiritStone: 1, money: 2 } }, sword: { kind: 'combat' }, step: { kind: 'movement' },
    cloudShield: { kind: 'defense' }, tigerBody: { kind: 'body' }, ironBody: { kind: 'body' }
  };
  const TECHNIQUE_SLOT_LABELS = { cultivation: 'วิชาบำเพ็ญ', combat: 'วิชาจู่โจม', movement: 'วิชาตัวเบา', defense: 'วิชาป้องกัน', support: 'วิชาสนับสนุน' };
  const TECHNIQUE_SLOTS = {
    survival: 'support', breath: 'cultivation', sword: 'combat', step: 'movement', cloudShield: 'defense', tigerBody: 'defense',
    swiftBreath: 'cultivation', ironBody: 'defense', clanBlade: 'combat', starSword: 'combat', voidBreath: 'cultivation',
    forbidden: 'combat', masterPendant: 'defense', seniorFlow: 'combat',
    discovery_sword_uncommon: 'combat', discovery_sword_rare: 'combat', discovery_sword_epic: 'combat'
  };
    return { TECHNIQUE_MASTERY_LEVELS, TECHNIQUE_TRAINING_RULES, TECHNIQUE_SLOT_LABELS, TECHNIQUE_SLOTS };
  }

  function createManualProgressionData() {
  const DISCOVERY_MANUAL_IDS = {
    'คัมภีร์กระบี่จากการสำรวจ ชั้นดี': 'discovery_sword_uncommon',
    'คัมภีร์กระบี่จากการสำรวจ หายาก': 'discovery_sword_rare',
    'คัมภีร์กระบี่จากการสำรวจ มหากาพย์': 'discovery_sword_epic',
    'คัมภีร์กระบี่จากการสำรวจ มหัศจรรย์': 'discovery_sword_epic',
    'คัมภีร์ปฐมเมฆา': 'manual_cloud_origin'
  };
    const MANUAL_STUDY_TARGETS = { common: 6, uncommon: 12, rare: 18, epic: 24, legendary: 36 };
    return { DISCOVERY_MANUAL_IDS, MANUAL_STUDY_TARGETS };
  }

  Object.defineProperty(window, 'OneLifeTechniqueCatalog', { value: { createManualCatalog, createTechniqueData, createTechniqueRules, createManualProgressionData } });
})();
