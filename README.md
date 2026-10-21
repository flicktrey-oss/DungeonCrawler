# DungeonCrawler: The Wildlands

An original, strictly turn-based exploration game in Phaser 3 and JavaScript. Set out from Lantern Camp into a seeded wilderness of forests and marshes, discover ruined watchposts and crypt entrances, and return with better equipment. There is no final world boundary or mandatory victory screen: the expedition continues until you die.

**Play:** https://flicktrey-oss.github.io/DungeonCrawler/

Look for **v0.4.0 — Merchant & minimap** on the title screen. The source is currently on `feature/playable-roguelike`, pending merge to `main`. The previous dungeon-only game remains in Git history and in the original `Game` simulation for regression tests.

## Play locally

Install Node.js 22 or newer, then:

```sh
git clone https://github.com/flicktrey-oss/DungeonCrawler.git
cd DungeonCrawler
git switch feature/playable-roguelike
npm ci
npm run dev
```

Open the local address printed by Vite and click **New Game**. If you already have the checkout, skip cloning. For a restricted cloud home directory, use `npm ci --cache /workspace/.npm-cache`. No backend, paid services, accounts, or API keys are required.

## Controls

| Control | Action |
| --- | --- |
| WASD / arrows | Move one tile; bump an enemy to attack |
| E | Collect/open loot underfoot; open storage while on the camp tent |
| Enter / `>` | Enter a crypt, or descend on its downward stair |
| Q / `<` | Ascend on an upward stair; depth one returns to the surface entrance |
| M / Mind Vision button | Reveal nearby terrain and entities through walls for 3 turns; costs 25 Mana |
| H | Drink a healing tonic |
| Click satchel item | Drink or equip; replaced gear returns to the satchel |
| Period (`.`) | Wait one turn |
| I | Inventory help |
| Esc / Pause button | Pause, help, resume |

Successful actions cost one turn. Each living enemy in the **current** region gets one action afterward; slow slimes rest every other turn. Idle time never advances the world. Key repeat is ignored: separate presses move separate tiles. Trees, rocks, deep water, walls, and invalid commands cost no turn.

**Arrival grace:** crossing regions and using stairs consumes a turn, but enemies do not act on that arrival turn. You see the destination before deciding what to do. Regions you leave remain frozen.

## Explore and return

- Start on the tent at **Lantern Camp (0, 0)**. Its entire region is enemy-free. Press E or click Camp storage to transfer supplies. Inspection is free; each transfer costs a turn. Only carried inventory can be stored; equipped items must first be replaced.
- Follow trails to the north, south, east, or west edges to generate neighboring 40×30 regions. The HUD shows region coordinates so you can find the camp again. East or west changes the first coordinate; north or south changes the second.
- Whisperwood forests contain wolves and boars. Lantern Marsh contains slimes and leeches. Terrain, creatures, and danger vary by region. Difficulty rises with distance from camp, capped at danger 5/5 in this first version.
- Seek ruined stone watchposts for equipment and dark stone archways for **crypt entrances**. Stand on an archway and press Enter. Every region has an entrance, including the starting region east of camp.
- Crypts have **two depths**, stronger melee encounters, equipment, potions, coffers, and a Crypt Warden on the second depth. Defeating it awards XP and bonus gold and counts as a cleared crypt; the wilderness remains open.
- Retreat using Q on a green upward stair. From depth two, this returns to the first depth's downward stair; from depth one, it returns to the exact outdoor entrance. Retrace your route to camp.
- Collected loot, dead enemies, discoveries, and explored terrain remain changed when you revisit. Persistence is **within the current run only**. Reloading the page starts over.
- **Permadeath remains enabled:** death ends the character, world changes, and camp storage. A new run starts fresh. There is no hardcore toggle or resurrection.

Mana starts at 100. Mind Vision costs 25 and lasts for the casting turn plus the next two completed turns. Revealed terrain stays mapped; entities return to ordinary line of sight afterward. Successful movement and melee restore 5 Mana, capped at 100. Waiting and casting do not recharge. Region transitions end the vision effect, preserving remaining Mana.

## Verify and build

```sh
npm test                 # all Vitest simulation suites
npm run build            # production files in dist/
npm run preview          # local production preview
```

Optional browser tests:

```sh
npx playwright install chromium
npm run test:browser
# Or use installed Linux Chromium:
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

The 41 simulation tests cover original combat/turn rules plus seeded world connectivity, biome spawn validity, negative coordinates, world transitions, inactive-region freezing, persistent crypt returns, guardian rewards, arrival safety, camp storage, and permadeath. Twelve browser tests exercise desktop input, touch movement, canceled gestures, multiple fingers, held touches, phone layouts, Mana, storage, region travel, and crypt entry/exit. Phone tests use Chromium touch emulation, not a physical iPhone. The expected large-bundle warning comes from bundled Phaser.

## Architecture

- `src/game/expedition.js`: current game mode; region transitions, per-run storage, crypts, persistence, guardian rewards. Extends the original `Game` rather than mixing rendering with rules.
- `src/game/world.js`: coordinate-seeded forest/marsh region generation, connected trails, spawn locations, landmarks. Generation order does not change terrain.
- `src/game/game.js`, `turn-manager.js`: authoritative player state, inventory/combat/leveling, synchronous turn transaction. Enemy decisions never run on a timer.
- `src/game/dungeon.js`, `ai.js`, `visibility.js`, `combat.js`, `items.js`, `random.js`: reusable generation, pathfinding, fog, rules, and PRNG.
- `src/render/scene.js`: original programmatic terrain, creature, item, and landmark graphics; player-centered camera.
- `src/main.js`, `style.css`: menus, controls, HUD, camp storage, log.
- `tests/*.test.js`, `tests/browser/`: simulation and Chromium validation.

Only the active region is simulated or drawn. Visited regions retain state in memory; there is no disk saving, region eviction, or cross-session persistence yet. The world is generated on demand in connected regions, with an immediate transition at a trail edge rather than continuous pixel scrolling. Forests and marshes currently change by region, not through blended biome boundaries. Equipment and creature variety are intentionally small. There is no gathering, crafting, freeform construction, terrain destruction, hunger, farming, multiplayer, audio or teleportation. Difficulty is an initial pass requiring playtesting.

## GitHub Pages

In **Settings → Pages**, use **Source: GitHub Actions**. In **Settings → Environments → github-pages**, allow deployment from `feature/playable-roguelike` (and `main` after merging). The Publish browser game workflow tests, builds, and uses GitHub's official Pages artifact deployment on source pushes. A successful workflow deployment is required before the public version changes.

Relative Vite asset URLs support `/DungeonCrawler/`. The old `gh-pages` branch is a historical fallback snapshot, not the source for current automatic deployments. No new hosting service or secret is required.

## iPhone / touch browser controls

Open the same public link in Safari and start New Game. A directional pad and six action buttons appear on touch devices (or narrow screens). Tap an arrow to move or bump attack; **one release is one turn**. Holding does not repeat. Sliding off a button, canceling a gesture, or using a secondary finger does not commit another action.

- **Wait** spends a turn.
- **Collect / Camp chest** picks up an item or opens storage on the camp tent.
- **Enter ↓ / Leave ↑** enter crypts, descend, or retreat on stairs.
- **Potion** heals; **Vision · 25** casts Mind Vision; **Pause / Help** opens instructions.
- Contextual buttons are dimmed when unavailable.
- Health, Mana, and XP sit above the map. Tap **Satchel / equipment** or **Chronicle** to expand them below the controls. Descriptions appear under items; no hover is required.
- Portrait and landscape layouts preserve readable tiles and at least 44 CSS-pixel touch targets. Scroll outside the movement controls to inspect inventory/logs.

No saving was added: refreshing, closing, or Safari unloading the page loses the run. Real iPhone Safari testing remains necessary; automated validation here used Chromium. Playwright WebKit could not be downloaded because the environment blocked its download domains.

## Mara’s camp shop and the minimap (v0.4.0)

Mara the Wayfarer stands **two tiles east and one north of the tent**. Her stall blocks movement; stand on a neighboring tile to trade. From a new run, walk **two steps east**, then press **E** or tap **Trade**. The starting character has no gold: find caches and fight enemies before buying.

| Item | Price | Stock per run |
| --- | ---: | ---: |
| Ember tonic (+16 health when used) | 10 gold | 3 |
| Ashwood spear (+3 attack when equipped) | 35 gold | 1 |
| Ringmail (+2 defense when equipped) | 30 gold | 1 |

Browsing is free and pauses input; a successful purchase spends one turn and adds the item to your satchel. Equip or drink it separately. Unaffordable or sold-out purchases are disabled; rejected purchases never spend gold or turns. Stock persists across travel and resets on a new run. There is no selling or restocking in this version.

The **minimap in the map’s upper-right corner** shows the entire current region or crypt depth, with unexplored tiles hidden and remembered terrain dimmed. Your marker is turquoise with a white border. Known features use **C** for camp, **M** for merchant, **R** for ruins, and **> / <** for entrances and stairs. It never shows enemies or loose items. Region coordinates and a bearing toward camp help you navigate the overworld; underground, return to the surface first. Tap/click **Map** to hide or show it without taking a turn. This is a local region map, not a whole-world atlas.

Validation includes earning gold through actual UI movement, collecting it, buying a tonic, checking gold/stock, touch trading, minimap fog, region/depth changes, and free minimap toggling.
