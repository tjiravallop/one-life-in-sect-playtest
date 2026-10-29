# Location implementation and verification audit

Objective: implement the complete supplied location specification, phases A–F, including the final testing matrix. Implementation and verification are complete within that specification; general NPC population simulation remains the explicitly subsequent project.

## Current evidence

- Phase A complete: positional read/write inventory captured in `outputs/location-references-before.txt`; mappings below cover every old location, destination and exploration area. `outputs/story-location-audit.json` inventories the 69 authored story policies.
- Phase B: the five original registry literals moved unchanged into `data/locations.js`, `travel-routes.js`, and `exploration-areas.js`; factories are loaded before root `app.js`. Literal hashes are in `outputs/location-extraction-evidence.json`.
- Phase B baseline: all 20 preexisting system regression cases passed after extraction, before changing location rules.
- `node scripts/validate-location-catalogs.cjs` checks unique world IDs, area/point/route/shop/offer/exploration references, material and technique IDs, and retention of every legacy destination.
- Phase C complete: canonical `locationState` (schemaVersion 1), legacy `locations.current` non-enumerable accessor, sole travel state in `travel.active` with origin/destination area IDs, directional routes, local point checks, stranded journeys and camp/return recovery. Migration backs up a legacy save before conversion. Actual arrival, multi-month wait, reload, closure and reversal cases pass.
- Phase D complete: location/service UI, original material trading controls now authored in the location panel, two basic manual offers and buy/read/equip/train links. Services fold away for routine Idle play. Both from-birth free profiles and repeated trade checks pass.
- Phase E complete: authored story classification, explicit escorted scene transitions and interruption history, local jobs/exploration/teachers, world deadlines that respect transit, and closed/destroyed area escape checks. All five Lin An routes finish at month 216.
- Phase F complete: canonical area/point adapters for existing story characters and authored named-person placements, living/local/present checks, local teacher access and reference validation. General NPC generation remains explicitly outside this specification.
- Combined Edge suite: 45/45 cases passed. Final display, mobile, NPC-health and route-ID refinements were rechecked in their affected cases; see `playtest-reports/location-system/README.md` and the raw outputs it links.

## Canonical ownership

`locationState.currentAreaId/currentPointId` are the body's only persisted position. `travel.active` is the only active journey. `locations` retains property ownership, legacy access tokens, selected local rest/work point and destroyed points. Its legacy `current` adapter reads/writes canonical state and is excluded from serialized saves. Area/point access checks distinguish ownership from membership/official rights; reaching a public area grants neither a house nor archive access.

Known areas, current area, services unlocked, properties owned, closures, discovered exploration areas, and story clues must remain distinct. `lastArrival` is history and must never infer present position.

## Old point/destination mapping

| Old ID | Canonical area |
|---|---|
| roadside, retainer, rented, owned, estate | starting_village |
| market, inn, city_records | border_market |
| sect, sect_archive | cloud_sect |
| hidden_cave | forest_caves |
| auction | jade_auction |
| warfront | sect_warfront |
| npc | traveler_village |

`distant_land` and `distant_land_camp` are the new story/travel continuation for the existing new-land route; they do not replace or remove a legacy destination.

Properties are initially attached to the starting village, not globally accessible. Area membership of points is authored in `data/locations.js`.

## Directional route graph

All routes have authored reverse support with the same initial budget. Asymmetric future routes must be authored separately.

- starting_village ↔ border_market (old market budget)
- border_market ↔ jade_auction (old auction budget)
- jade_auction ↔ sect_warfront (old warfront budget)
- starting_village ↔ traveler_village (old npc budget)
- starting_village ↔ forest_caves (old hidden_cave budget)
- border_market ↔ cloud_sect (new connecting road)
- cloud_sect ↔ forest_caves (new connecting trail)
- traveler_village ↔ distant_land (new-land continuation)

`refuge_convoy` is a separately authored emergency budget used for escaping a closed/destroyed location. Legacy and reverse leg IDs resolve through `canonicalRouteId`; retreat retains the authored base route ID.

## Final acceptance audit (must be proved before goal completion)

- [x] Every persisted position writer and consumer is canonical; changing activity cannot teleport. Authority: area/access helpers, positional reference inventories, origin/activity regression.
- [x] Arrive, wait several months and reload while remaining at the destination. Authority: market persistence/reload regression.
- [x] No destination shops/services during transit or from another area. Authority: shop/access predicates, stranded and remote trade tests, in-transit world intervention test.
- [x] Stranding, route closure and destroyed/closed locations have playable recovery paths. Authority: camp completion, retreat/reopen, child evacuation, individual shop destruction tests.
- [x] Quotes, installments, delays, remaining budgets and return trips match actual state. Authority: shared `nextTravelInstallment`, budget/migration/rounding and denied-quote cases.
- [x] Manual purchase charges once, adds the correct manual, learns, equips and trains through normal rules. Authority: manual purchase/progression case and natural from-birth profiles.
- [x] Repeated buying/selling cannot create money or stack passive bonuses incorrectly. Authority: all five common/uncommon material roundtrips, both basic manual roundtrips, empty manual bonuses and existing per-recipe passive de-duplication.
- [x] Save migration backs up first, preserves personal/story data, pending choices and active travel, is idempotent, and reports ambiguous positions. Authority: legacy migration/fallback fixture, pending choice reload, active budget, old-version roundtrips and cross-life closure assertions.
- [x] Every scripted story event has a deliberate location policy, with canonical authored metadata. Authority: 69-entry story audit and catalog validator.
- [x] Lin An sect route and every non-sect alternative finish without losing required scenes or softlocking. Authority: five natural story route runs, recorded context counts and month-216 endings; unchanged authored choice callbacks and explicit story movement policies.
- [x] Free lives: cautious, risky, exploration and work profiles; non-sect cultivation attainable from infancy. Authority: worker/explorer birth-to-cultivation runs and risky life/death run.
- [x] Auto and offline progression preserve location, resources and pending events. Authority: Auto remote-sect and paused/pending/active offline regressions.
- [x] Existing story NPCs reference valid canonical areas/points and are not presented remotely/dead as local teachers. Authority: placement validator, presence/teacher tests including nonpositive health, and player-copy transit case.
- [x] Mobile 320px and 390px: location, shops, reasons and controls visible and usable; visual inspection recorded. Authority: mobile raw outputs and four reviewed screenshots after fonts/scroll settled, including compact folded services.
- [x] Catalog validator and relevant regression suites pass on the final runtime, with reproducible output. Authority: 45-case combined result, affected-case rechecks, syntax checks, source hash manifest and report commands.
- [x] Update canonical instructions/README/changelog and record final result/known limits. Authority: root AGENTS, README, CHANGELOG, NPC proposal, AI navigation and location report.

The original `docs/AI_README.md` and `docs/GAME_DIRECTION.md` were absent when this work began. Do not infer missing narrative design rules from historical audits.
