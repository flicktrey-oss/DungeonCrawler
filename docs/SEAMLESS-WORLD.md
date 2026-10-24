# Seamless world: first playable stage

Stable rollback: tag `v0.28.1`, branch `backup/v0.28.1`, commit `88aad71`.

Choose **Seamless preview** on the title screen. **New Game** still starts the full existing expedition. The preview connects Lantern Camp and the guaranteed neighboring forest in any cardinal direction. It is intentionally bounded: other biomes, Northwatch and crypt interiors remain in standard runs. Camp services, inventory, combat, local quests, the bridge/ford and Aldren's Follow/Stay commands work inside the joined surface. Preview stock excludes the full-world survey chart, since the full world is not loaded there.

## Working rules

- A tile uses global coordinates: `region × region size + local tile`. Negative coordinates use floor division, including tiles immediately north/west of camp.
- `surface-map.js` presents one persistent map object over the two regions. Tile writes go directly to the owning region. Terrain at their old borders blends into open woodland instead of retaining artificial tree walls.
- Movement across the seam is ordinary one-tile movement. It never calls `activate`, teleports actors, grants arrival grace, clears intents, resets ability durations or regenerates creatures.
- The existing TurnManager remains authoritative. Every valid player action grants one action to each living enemy. Combat, pathfinding, sight and Aldren operate in the same global coordinate space.
- Region ownership is still metadata for biome/quest/loot purposes. Preparing adjacent terrain does not count as visiting it or reveal its occupants.
- Map bounds are explicit, including negative coordinates. Rendering, visibility and bounded AI use these bounds; camera coordinates stay continuous when the current area's label changes.
- Exploration and encounter knowledge are persistent global sets. The minimap fits known terrain, including the always-known camp, rather than preloaded geometry. The preview has no quadrant overview.
- Preview entities live in the shared state arrays for the life of the run. They do not respawn on a return. Boundary-keyed regeneration is deliberately not used in this mode.

## Next stages

1. Extend the fixed joined pair into a growing chunk cache. Keep map identity stable as bounds expand, and establish explicit ownership for moving entities, dynamic drops and dormant simulation.
2. Reconcile rivers, paths and biome borders between arbitrary neighboring chunks using shared edge seeds; only the first camp/forest border is blended now.
3. Replace remaining region-oriented service placement and quest navigation with named locations and global positions. Preserve visited local knowledge separately from broad survey charts.
4. Attach crypt instances to global entrances and support the entire escort route and Northwatch on the streamed surface.
5. Define turn-based repopulation using distance and turns away, avoiding instant reward rerolls or enemies spawning inside sight. Add an active simulation radius before loading large numbers of chunks.

Do not switch the standard expedition to this mode until these stages and their regression tests are complete.
