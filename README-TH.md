# หนึ่งชีวิตในสำนัก

เกมเว็บ Idle เนื้อเรื่องของ “หลินอัน” สร้างด้วย HTML, CSS และ JavaScript ล้วน ไม่ต้องติดตั้งแพ็กเกจเพิ่มเติม

## เปิดเล่นและแก้ไข

1. แก้ไฟล์ต้นฉบับที่โฟลเดอร์โปรเจกต์: `index.html`, `styles.css`, `app.js`, catalog ใน `data/` และไฟล์ภาพใน `assets/`
2. เปิดเทอร์มินัลที่โฟลเดอร์โปรเจกต์
3. รัน `python -m http.server 4173`
4. เปิด `http://127.0.0.1:4173`

ไฟล์หลัก:

- `index.html` — โครงหน้าจอ
- `styles.css` — ธีมและการจัดวาง
- `app.js` — เนื้อเรื่อง ระบบบำเพ็ญ เหตุการณ์ และฉากจบ
- `data/catalog-source/Xianxia_DeepLore_Item_Catalog_v16.xlsx` — workbook ต้นทางหลักของอาวุธ เกราะ และเครื่องประดับ
- `data/catalog-source/Xianxia_Techniques_UltimateCultivation_v20.xlsx` — workbook ต้นทางหลักของวิชาและวิชาบำเพ็ญ
- `data/workbook-catalogs.js` — ไฟล์ runtime ที่สร้างจาก workbook ด้วย `python scripts/generate_workbook_catalogs.py`; ไม่แก้ไฟล์นี้โดยตรง
- `data/items.js` — วัตถุดิบ สูตรคราฟต์ ของอาถรรพ์ พาหนะ และ metadata ของไอเทม
- `data/story-events.js` — เหตุการณ์และเส้นเรื่องที่เขียนไว้ล่วงหน้า
- `data/techniques.js` — กฎการเรียนรู้ คัมภีร์ หมวดวิชา และ progression เฉพาะเกม
- `data/event-pools/` — event pools แยกตามกิจกรรม พร้อม `shared.js` สำหรับเหตุการณ์ข้ามกิจกรรม
- `data/event-pools.js` — registry รวม event-pool modules; ข้อมูลเควสหลักยังอยู่ใน `app.js`
- `assets/` — ภาพฉากจบและภาพประกอบที่เกมใช้
- `.openai/hosting.json` — การตั้งค่าเผยแพร่ด้วย Sites

เอกสารสำหรับ AI และนักเขียนเริ่มที่ `docs/AI_README.md` โดยแยกแนวทางเกม, Lore โลก, Lore หลินอัน และ Storyboard ออกจากกัน

ไฟล์ต้นฉบับสำหรับพัฒนาและทดสอบอยู่ที่ root ตาม `AGENTS.md`; ไม่มีสำเนา source สำหรับแก้ไขแยกในโฟลเดอร์ build

workbook ใช้ชื่อ/ลำดับ realm รุ่นเก่า ตัวสร้างแมปตามชื่อไปยัง realm ปัจจุบันในเกม และคงขั้น `หลอมสุญญตา` ไว้โดยไม่มีข้อมูล workbook แทน ดู mapping ได้ที่ `scripts/generate_workbook_catalogs.py`

เซฟเกมเก็บใน `localStorage` ของเบราว์เซอร์ ผู้เล่นสามารถส่งออก/นำเข้าเซฟจากเมนูในเกมได้
