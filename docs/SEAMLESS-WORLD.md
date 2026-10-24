# Seamless surface

Stable rollback: tag `v0.28.1`, branch `backup/v0.28.1`, commit `88aad71`. The first joined-pair preview is also preserved in commit `d186c02`.

Choose **Seamless preview** on the title screen. **New Game** still starts the standard expedition, including crypts. The seamless surface now generates terrain in every direction as the player approaches it. It includes all surface biomes, local quests, camp services, the northern landmarks, Northwatch, city services and Aldren's escort completion. Crypt interiors are not connected to this mode yet.

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
- Terrain and visited history are retained in memory. There is no save/resume or regeneration timer; memory use grows with the places a run visits.

## Geography and map

- The first woodland's river uses a shared global plan and continues through neighboring regions, independently of generation order. The Willow Crossing retains its quest solutions and shallow ford. Other river stretches have ordinary trail bridges.
- Nearby shows the surrounding terrain; Explored shows the continuous known world, without quadrant borders. Camp and Northwatch are permanent waypoints. Accepted quests are marked; completed objectives point back to their giver.
- Survey maps chart the 5×5 areas around camp, showing broad biome information without generating inhabitants, visiting areas or revealing local encounters. Their muted background appears on the Explored map.
- Town services and the royal keep use global positions. Rescued citizens can be added after Northwatch was prepared, without duplication.

## Remaining stages

1. Attach crypt instances to global entrances and support surface return/companion behavior.
2. Tune border scenery and biome blending, trail variety and the density of discoveries on longer journeys.
3. Decide turn/distance rules for repopulation, preserving quest rewards and preventing enemies from appearing in sight.
4. Add long-run cache budgets and persistence before making seamless mode the default expedition.
