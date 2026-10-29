(() => {
  'use strict';
  const parts = window.OneLifeEventPoolParts;
  if (!parts) throw new Error('Event pool modules must load before data/event-pools.js');
  const createEventPools = deps => Object.assign({}, ...Object.values(parts).map(create => create(deps)));
  Object.defineProperty(window, 'OneLifeEventPoolCatalog', { value: { createEventPools } });
})();
