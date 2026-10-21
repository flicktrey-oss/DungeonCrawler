# DungeonCrawler: The Ember Vault

An original desktop-browser fantasy roguelike built with Phaser 3, JavaScript ES modules, and Vite. Explore five seeded procedural floors, find equipment, and defeat the Ash Warden. The game uses original programmatic pixel-style graphics and needs no backend, account, API keys, or downloaded art.

## Play locally

Install **Node.js 22 or newer** (includes npm), then open a terminal:

```sh
git clone https://github.com/flicktrey-oss/DungeonCrawler.git
cd DungeonCrawler
# Until the pull request is merged:
git switch feature/playable-roguelike
npm ci
npm run dev
```

Open the local address printed by Vite in a desktop browser, then click **New Game**. If using an existing checkout, skip cloning and run the npm commands there. In a cloud workspace, use your development environment's supported browser access; the server binds to all interfaces. Nothing is deployed publicly by these commands.

If npm reports that its default cache is unwritable in the cloud container, use `npm ci --cache /workspace/.npm-cache`.

## Controls and rules

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move one tile; bump an enemy to attack |
| E | Pick up the item or open the coffer under you |
| M / Mind Vision button | Spend 25 Mana to reveal nearby terrain and enemies through walls for 3 turns |
| H | Drink an Ember tonic, restoring up to 16 health |
| Click a satchel item | Drink a tonic or equip weapon/armor |
| Period (`.`) | Wait one turn |
| Enter / `>` | Descend while standing on the stairs |
| I | Inspect equipment and inventory help |
| Escape / Pause button | Pause or resume / show help |

Each successful action costs **exactly one turn**, followed by one action for each surviving enemy. Slow slimes spend every other action resting. Held-key repeat is ignored; release and press again to act again. Walking into walls, unusable stairs, empty pickups, and drinking at full health cost no turn. Thinking, inspecting inventory, and pausing never advance time. On death or victory the turn ends immediately. Descending costs a turn; new-floor enemies receive their action, with the player starting in an enemy-free room.

Doors are passable wooden archways in this first version. Stand on an item before collecting it; hover over satchel entries for descriptions. Equipping swaps your old item into the satchel and consumes a turn. Gold is score/loot, with no shop yet.

## Surviving the vault

- Explore for weapons, armor, three tonics per floor, gold, and a randomized coffer reward.
- Enemies pursue within their detection range using grid pathfinding. Corridors prevent being surrounded. Slimes rest every other turn; goblins hit harder than skeletons.
- Your health does not automatically refill between floors. Kill enemies for XP, occasional gold, and levels; leveling improves health, attack, and sometimes defense, and restores a little health.
- The map remembers explored terrain in dim light. Creatures and loose items are only shown in current line of sight.
- Descend through five floors and kill the Ash Warden on floor five to win. The final stair is sealed. Death is permanent; New Run creates a fresh randomized character and dungeon. No save/resume is implemented.

## Build and verify

```sh
npm test                 # Vitest simulation tests
npm run build            # produces dist/
npm run preview          # locally serves the production build
```

An optional real-browser test checks rendering, keyboard repeat, idle behavior, pause, and inventory:

```sh
npx playwright install chromium
npm run test:browser
# Or use an existing Linux Chromium installation:
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

The default unit suite does not require browser downloads. Vite may report a large chunk because Phaser is bundled; this is expected for this initial version.

## Architecture

- `src/game/random.js`: deterministic PRNG. `new Game(seed)` reproduces a run for the same action sequence.
- `src/game/dungeon.js`: rooms, connected corridors, archways, stairs, tile rules.
- `src/game/game.js`: authoritative state, floor creation, player commands, progression, enemy actions.
- `src/game/turn-manager.js`: synchronous action transaction; guards reentrancy and stops finished runs.
- `src/game/ai.js`, `combat.js`, `items.js`, `visibility.js`: pathfinding, combat definitions, equipment, fog.
- `src/render/scene.js`: Phaser canvas graphics and player-centered camera; never advances the simulation.
- `src/main.js`, `style.css`: keyboard input, menus, HUD, satchel, event log.
- `tests/game.test.js`: 15 tests, including connectivity across 150 seeds and spawn constraints on all floors across 30 seeds.
- `tests/browser/game.spec.js`: browser input and UI smoke test.

The engine has no timers or dependency on Phaser. Graphics render snapshots of state; animation timing cannot cause a turn. The only simulation entry point for UI actions is `Game.action`, mediated by the turn manager. Dead enemies remain as inert records and never render, block paths, or act.

## First-version limits

Designed for keyboard and mouse on desktop. Combat feedback uses the scrolling chronicle; there are no floating damage numbers or movement animations. Art and equipment variety are deliberately modest. No sound, mobile touch controls, save system, shops, ranged attacks, or interactive door-opening yet. Balance is an initial pass, not an exhaustive playtest. All code, names, and graphics in the game are original; no art from other roguelikes is included.

## Play on GitHub Pages

The public game address, once Pages is enabled and its deployment completes, is:

https://flicktrey-oss.github.io/DungeonCrawler/

For the one-time setup, open repository **Settings → Pages**, select **Deploy from a branch**, choose **gh-pages** and **/ (root)**, and click **Save**. GitHub builds and publishes the site; it can take a few minutes. The `gh-pages` branch contains only the generated browser files and is separate from source code.

The **Publish browser game** workflow tests, builds, and updates `gh-pages` on code pushes to `main` or `feature/playable-roguelike`. It can also be run manually from the Actions tab. Relative asset URLs let the build work under `/DungeonCrawler/`. There is no backend or secret configuration. Keep the source on the feature branch until its PR is merged; no merge is required to play the initial published version.

Mind Vision is available from level 1. Start with 100 Mana; successful movement and melee restore 5 Mana (capped at 100). Waiting, casting, and other actions do not restore Mana. Vision lasts for the casting turn plus the next two completed turns, with no real-time countdown. Revealed terrain remains explored after the effect ends; enemies return to ordinary line-of-sight visibility. Mana persists between floors; the vision effect does not. Teleportation and class abilities are not implemented yet.
