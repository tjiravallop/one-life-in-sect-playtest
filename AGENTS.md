# One Life in Sect: project instructions

## Canonical game source

- The canonical runtime is `app.js` at the project root.
- Canonical equipment data is authored in `data/catalog-source/Xianxia_DeepLore_Item_Catalog_v16.xlsx`.
- Canonical technique and cultivation data is authored in `data/catalog-source/Xianxia_Techniques_UltimateCultivation_v20.xlsx`.
- `data/workbook-catalogs.js` is generated from those workbooks by `python scripts/generate_workbook_catalogs.py`; do not edit it directly.
- The generator's `WORKBOOK_REALM_TO_GAME` table maps workbook realm labels to the current game ladder by meaning. Game realm 8 (`หลอมสุญญตา`) has no workbook entries; do not synthesize records for it.
- `data/items.js` owns item behavior metadata, materials, crafting recipes, cursed items, and mounts; workbook equipment records are loaded from the generated module.
- `data/items - Backup.js` is an unused historical backup; `index.html` does not load it and it is not an authoring source.
- The canonical scripted story/event records are `data/story-events.js`.
- `data/event-pools/` owns authored event pool records grouped by Activity; training events live in `training.js`, while cross-Activity, annual, and world pools remain in `shared.js`.
- `data/techniques.js` owns technique progression rules and authored story/manual bridges; workbook technique records are loaded from the generated module.
- Keep item behavior and state changes in `app.js`; keep item definitions and recipe metadata in `data/items.js`.
- Keep core event processing and runtime helpers in `app.js`; story event records and their existing choice callbacks live in `data/story-events.js`.
- Keep event pool records and their existing choice callbacks in `data/event-pools/<activity>.js` (or `shared.js` for cross-Activity pools); keep event selection, filtering, and processing in `app.js`. `data/event-pools.js` only combines the registered pool modules.
- Keep technique/manual definitions and their metadata in `data/techniques.js`; keep learning, training, loadout, and progression behavior in `app.js`.
- The canonical UI and styling are root `index.html` and `styles.css`.
- The canonical visual assets are under root `assets/`.
- Resolve game asset paths relative to root `index.html`; do not create or maintain a second authored copy.
- `index.html` must load `data/workbook-catalogs.js` before `data/items.js` and `data/techniques.js`, then load `data/story-events.js`, all `data/event-pools/*.js` modules, `data/event-pools.js`, and `app.js`; catalogs expose factories used by the engine.
- There is no checked-in `dist/` source tree. Do not refer to `dist/` as a runtime, development, or testing source.
- If a deployment artifact is introduced later, treat it as generated output from the root files and assets. Do not edit generated copies directly.

## Documentation and audit records

- Start with `docs/AI_README.md` and `docs/GAME_DIRECTION.md` before changing game behavior or narrative.
- When documentation conflicts with implemented behavior, inspect root `app.js`; for item and recipe definitions, inspect `data/items.js`; for technique and manual definitions, inspect `data/techniques.js`. Report discrepancies explicitly.
- Files under `project-audit-results/` are historical audit records. References there to `dist/` describe the project as it existed during those audits; they are not current path instructions.
- If a test is restored from Git history, update it to load root `app.js` before relying on it.
