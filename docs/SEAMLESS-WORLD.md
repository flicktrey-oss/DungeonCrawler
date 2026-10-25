# Seamless surface

Stable rollback: tag `v0.28.1`, branch `backup/v0.28.1`, commit `88aad71`. The first joined-pair preview is also preserved in commit `d186c02`.

Choose **New Game** on the title screen for the expanding world. **Classic expedition** retains the region-based expedition, including crypts. The seamless surface now generates terrain in every direction as the player approaches it. It includes all surface biomes, local quests, camp services, the northern landmarks, Northwatch, city services and Aldren's escort completion. Discovered crypt entrances connect to persistent two-floor interiors.

## Coordinates and ownership

- Tiles use global coordinates: `region × region size + local tile`. Floor division handles negatives correctly. Region coordinates remain generation/ownership metadata, not a transition in gameplay.
- `surface-map.js` presents one persistent map object over retained chunks. Bounds expand without replacing the map. Tile writes go directly to their owning chunk; undefined gaps remain solid and undisclosed.
- A surrounding 3×3 ring is prepared when the current generation area changes. Preparation is deterministic and does not visit or reveal it. Four shared edges are reconciled before they enter sight.
- Entities live in shared global arrays. Enemy IDs are namespaced by their source region; loot uses that source's danger, even if a creature is lured elsewhere. Dropped items, damage, completed encounters and exploration persist. Chunks are generated once per run.

## Turns and performance

- Crossing an old boundary is ordinary one-tile movement. It never calls `activate`, teleports actors, grants arrival grace, clears attacks, resets ability durations or regenerates enemies.
- TurnManager remains authoritative. Every living enemy receives one action per completed player turn. Enemies beyond 24 tiles wait cheaply instead of pathfinding. Outstanding attacks and bleeding finish on their normal enemy phases; nothing runs on autonomous AI timers, and no catch-up turns occur on return.
- Aldren follows across boundaries. If separated by more than 32 walking tiles, he waits for the player to return instead of searching the entire world or teleporting. His position is marked on the overview when waiting, downed or separated.
- Rendering clips terrain to the camera viewport. Visibility and nearby map drawing use local windows. The overview reads known cells, not the rectangle between distant cache entries. Pathfinding searches a bounded corridor around its endpoints.
- Terrain and visited history are retained in memory. There is no save/resume; habitat populations recover through completed turns. Memory use grows with the places a run visits.

## Geography and map

- The first woodland's river uses a shared global plan and continues through neighboring regions, independently of generation order. The Willow Crossing retains its quest solutions and shallow ford. Other river stretches have ordinary trail bridges.
- Nearby shows the surrounding terrain; Explored shows the continuous known world, without quadrant borders. Camp is a permanent waypoint; Northwatch becomes one after a visit. An escort-only direction indicator guides travel before discovery. Accepted quests are marked; completed objectives point back to their giver.
- Survey maps chart the 5×5 areas around camp, showing broad biome information without generating inhabitants, visiting areas or revealing local encounters. Their muted background appears on the Explored map.
- Town services and the royal keep use global positions. Rescued citizens can be added after Northwatch was prepared, without duplication.

## Remaining stages

1. Playtest the connected two-floor crypts and their reward/difficulty balance.
2. Tune border scenery and biome blending, trail variety and the density of discoveries on longer journeys.
3. Extend the initial rabbit/rat habitats to other biomes if the population rules play well; keep quests and unique rewards persistent.
4. Add long-run cache budgets; local run persistence is implemented in v0.32.0.

## Default world and habitats (v0.31.0)

New Game uses `SeamlessExpedition`; Classic expedition explicitly retains the old `Expedition` mode. Death/retry preserves the chosen mode. Crypt instances remain available only in Classic expedition until the surface-return integration is complete.

`habitats.js` prepares local habitat encounters and residents before global coordinate conversion, using an independent per-region RNG. The guaranteed starting forest has rabbit and rat homes; other forests use separate habitat probabilities. Residents retain globally unique habitat IDs and source-region enemy IDs. Quest/event-owned creatures are preserved when replacing ordinary prey.

Population recovery runs in `finishTurn`, after the enemy snapshot has acted. Visibility is updated from the player's current position before selecting a spawn. A newborn takes its first enemy action on the following completed turn. Homes below capacity wait 30 turns between births, within 48 Manhattan tiles of the player. A blocked/visible habitat waits without building a backlog. Candidates exclude occupants, scenery, items and encounter sites; no map tiles are rewritten.

A live rat burrow blocks player movement through a bump strike and is excluded from creature, companion and click-travel paths. Destroying its 12 HP permanently disables births for the run without killing its survivors. Rabbit homes are non-destructible. Inspection is free; strikes use one authoritative player turn. Rabbits flee on alternate turns, remain within six walking tiles of their warren and never attack; rats use ordinary combat near home and return when the player leaves.


## Connected crypts and local saves (v0.32.0)

`SeamlessExpedition` retains a surface area snapshot while activating a local-coordinate crypt. Global player stats, inventory, quests, turn count and RNG streams stay shared. Crypt instances are cached by region/depth, retain their own entities and fog, and do not respawn on return. Transition actions take one turn with the existing arrival grace; other areas do not simulate catch-up turns. Returning restores the original surface map proxy and arrays, placing the player at the entrance or the nearest safe tile if occupied. Following Aldren travels only when nearby; Stay and downed companions remain at their actual location.

`save.js` uses a versioned reference graph, retaining identity between equipped inventory items, quick slots, quests and their events. It restores Maps, Sets and independent Random streams, rebuilds surface proxies and creates a fresh TurnManager. Runtime input/animation state is not resumed. The browser saves after rendered changes and on page-hide/background events; Continue advances no turn. Death removes the key. New Game confirms replacement of a valid save. Storage failures and damaged/version-incompatible saves produce clear messages without blocking a new run. A single localStorage value is written atomically; quota failures retain the preceding save. Browser storage is device/origin specific and is not cloud backup.

Tests exercise negative-coordinate entrances, both depths, persistent drops/deaths, companion Stay, reference/RNG restoration, invalid data, storage errors and permadeath. Desktop and mobile-browser tests enter a crypt through real input, reload, Continue without time passing, inspect the surface map underground and return to the same entrance. Actual iPhone hardware testing remains separate.

## Map discovery and zoom (v0.33.0)

Map rendering and hit testing share zoom-adjusted frames. Each UI tab keeps its own runtime zoom; map actions never touch the turn manager or reveal terrain. The direction indicator is derived from the active escort and global player/surface-return coordinates. It is absent before acceptance and after completion. Northwatch's marker, escort destination marker and fully revealed settlement bounds require an actual visit, rather than chunk preparation. Refresh also applies that policy to old saves and underground surface-map views.

## Travel altars (v0.34.0)

`altars.js` uses an independent region seed. Camp and its first woodland receive an altar; other surface regions are eligible on a sparse lattice with a seeded probability. Sites use existing walkable terrain and avoid entities/scenery; no terrain is carved. Activation is stored on the encounter object. Save restoration retrofits missing sites to retained chunks and their shared surface array without resetting anything.

Activation and travel resolve through TurnManager. An activated adjacent source and an activated known destination are required. Guards reject active escorts, nearby threats at either end, incoming telegraphs and obstructed arrivals before moving or spending a turn. Travel changes the player position and synchronizes metadata without calling region activation or granting transition grace; living enemies receive their usual one action. No additional healing, gold charge, ability reset, enemy regeneration or catch-up simulation occurs. Ordinary per-turn effects still apply.


## Readable danger and highland footholds (v0.35.0)

`highlands.js` places four lighter trail creatures and up to three territory-bound ridge guards. A deep-site fallback also uses the lighter profile rather than turning an unusable trail into a stat gate. `enemy-stats.js` separates encounter stats and loot danger: trail prey yields tier-two rewards while guarded highland creatures retain tier-three eligibility.

`creature-variants.js` uses an independent per-region RNG and at most one modifier on an ordinary off-trail enemy. It excludes renewable habitat populations, quest objectives and named bosses. Variant names, graphics badges, inspection and separate journal entries expose their traits. Stalkers reuse the existing next-turn charge/recovery machinery; Armored slow actions do not delay an already prepared telegraph. Generation consumes no combat or loot RNG.

Existing expanding-world saves use a one-time combat-balance upgrade for ordinary retained highland goats/wolves. It retains position, actions, deaths and health fraction, never generates enemies or changes player stats, and does not add variants to already explored populations. New areas use the new seeded generation. The main loops still use exactly one enemy action per completed non-transition player turn.
