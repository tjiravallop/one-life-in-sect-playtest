# Project navigation for AI collaborators

Read root `AGENTS.md` first. Root `app.js`, `index.html`, `styles.css`, `assets/` and authored `data/` are canonical; there is no authored build tree.

For Location work, read `LOCATION_SPEC.md` (the complete user-supplied specification) and `LOCATION_IMPLEMENTATION.md` (requirements, architecture and verification audit). `data/locations.js`, `travel-routes.js`, `exploration-areas.js` and `shops.js` own static world data; the engine owns behavior. Story location policies and named story-person placements belong in `data/story-events.js`.

`GAME_DIRECTION.md` was not present in this checkout when this work began. Do not invent its contents or treat historical audit paths as current source instructions. Existing narrative remains in `data/story-events.js` and `data/event-pools/`.

General NPC life simulation is a subsequent project described in root `NPC-ข้อเสนอปรับใช้.md`. Location provides canonical area/point adapters and presence checks for current story characters; it does not claim a complete generated NPC population.

Run `node scripts/validate-location-catalogs.cjs` for authored references and `node scripts/test-playtest-systems.cjs` for Edge/Playwright runtime regression checks. Test output is generated under `outputs/`; preserve historical playtest evidence in its existing folders.
