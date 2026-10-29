(() => {
  'use strict';
  // Only common starting manuals are sold. Story keys and rare manuals are excluded.
  window.OneLifeShopCatalog = () => ({ SHOP_DEFS: {
    border_materials: { id: 'border_materials', name: 'ตลาดวัตถุดิบ', areaId: 'border_market', pointId: 'market_materials', kind: 'materials', stockPolicy: 'unlimited-common-uncommon', buysItems: true, materials: ['herb', 'iron', 'spiritStone', 'beast', 'spiritSpring'] },
    border_books: { id: 'border_books', name: 'ร้านตำราริมทาง', areaId: 'border_market', pointId: 'market_books', kind: 'manuals', stockPolicy: 'single-owned-or-learned', offers: [
      { id: 'book_cloud_origin', techniqueId: 'manual_cloud_origin', name: 'คัมภีร์ปฐมเมฆา', price: 18, grade: 'uncommon', subtype: 'cultivation', learningType: 'cultivation', manualRealm: 0, manualStage: 0 },
      { id: 'book_bamboo_sword', techniqueId: 'discovery_sword_uncommon', name: 'คัมภีร์กระบี่ทางไผ่', price: 12, grade: 'uncommon', subtype: 'attack_sword', learningType: 'martial', manualRealm: 0, manualStage: 0 }
    ] }
  } });
})();
