# DungeonCrawler: The Wildlands

A strictly turn-based, original Phaser 3 browser adventure. Explore a shifting wilderness, hunt modest prey, complete local encounters, and return to Lantern Camp to sell trophies and prepare for harder lands.

**Play:** https://flicktrey-oss.github.io/DungeonCrawler/

Look for **v0.5.3 — Hold to move** and start **New Game** after deployment. The source lives on `feature/playable-roguelike` until merged into `main`.

## Install and run

Use Node.js 22 or newer:

```sh
git clone https://github.com/flicktrey-oss/DungeonCrawler.git
cd DungeonCrawler
git switch feature/playable-roguelike
npm ci
npm run dev
```

Open Vite’s printed address. Existing checkouts can skip cloning. In the restricted cloud home directory use `npm ci --cache /workspace/.npm-cache`. No backend, paid service, art download, or API key is needed.

## Controls

| Desktop | Touch | Action |
| --- | --- | --- |
| WASD / arrows | Direction pad | One tile; bump enemies to attack |
| E | Collect / Trade / Interact | Loot, camp storage, merchant, or local encounter |
| Enter / `>` | Enter ↓ | Enter a discovered crypt / descend on stairs |
| Q / `<` | Leave ↑ | Retreat while on an upward stair |
| H | Potion | Drink a tonic for up to 16 health |
| M | Vision · 25 | Reveal through walls for three turns, costing 25 Mana |
| Period | Wait | Spend one turn |
| I | Manage 10×10 satchel | Arrange, rotate, use, equip, or drop items |
| Esc | Pause / Help | Instructions / pause |

The world waits indefinitely for you. Each valid action costs exactly one turn, followed by one action per living enemy in the current region. Slimes and beetles can spend actions resting. Walking into obstacles or invalid actions is free. Crossing regions and using stairs costs a turn but gives **arrival grace**, so enemies cannot attack before you inspect the destination. Held keys/touches do not repeat. Only the current region is active.

## Slower progression and danger

Start at level 1 with 3 attack, 0 defense, 32 health, two tonics, and no gold. Ordinary woodland rats and beetles award 2 XP; the first level needs 20 XP (ten ordinary kills). Later thresholds increase with level. Levels grant a little health, occasional attack/defense, and a small heal. Quests and stronger foes can accelerate progress.

| Region distance from camp | Biome | Suggested level |
| --- | --- | ---: |
| 0–1 | Whisperwood | 1 |
| 2–3 | Lantern Marsh | 4 |
| 4–6 | Broken Highlands | 8 |
| 7+ | Ashen Reach | 12 |

Distance is Manhattan distance: `abs(regionX) + abs(regionY)`. Farther biomes contain substantially stronger creatures. Area levels remain visible on phones and trail exits warn before crossing. Being able to enter a biome does not mean you can survive it. Forests form groves and meadows; marshes contain pools/reeds, highlands rocky ridges, and ashlands burned trees. Fallen logs, graves, flowers, bones and other scenery provide visual variation without gathering or crafting.

## Six discoverable encounters

Each wilderness visit rolls **one or two different encounters**. None is guaranteed on every map. Camp is the exception: it remains a safe, fixed base with its trader.

| Encounter | Interaction |
| --- | --- |
| Forgotten crypt | Discover its archway, then enter a two-depth dungeon with a dangerous Warden and a rare gear reward |
| Creature den | Fight a stronger named beast for its hoard |
| Mirekeeper | Accept a quest to clear three troublesome frogs, return for a Reedheart amulet (+1 defense) and 6 XP |
| Abandoned caravan | Find a coffer guarded by scavengers |
| Wayfarer shrine | Choose one exchange: 5 gold for 12 HP, or 6 HP for 25 Mana; each costs a turn |
| Hidden cache | Follow the grave/cloth marker to buried supplies |

Stand next to the Mirekeeper and press E / Interact. Accepting and claiming are separate turns; reading dialogue is free. Only that encounter’s three frogs count. You can clear them before accepting, but must claim before leaving. Open Local quest for progress. The amulet is 2×2 and must be equipped to grant defense. A full satchel leaves the reward claimable.

Shrines reject exchanges you cannot afford, lethal HP payments, and restoring an already full resource. Once used, a shrine is spent for that visit. Common coffers contain a tonic or a small purse; equipment is rare and low tier in early regions. Better gear belongs to harder areas and Wardens.

## Regenerating visits, stable camp

**Every re-entry into a non-camp region or crypt floor generates a fresh visit**, including terrain, enemies, encounters, treasure, quest status, and local fog. This is intentional: hunting and rewards are repeatable. Different visit numbers are seeded, so the same seed plus the same visits/actions is reproducible. Biome and region coordinates remain stable.

Leaving a quest abandons its local progress; claimed character rewards stay yours. Ascending from a crypt regenerates the surface, so its entrance may move or disappear. You emerge on a vacant walkable tile nearest your old entrance. Moving between crypt depths likewise generates a fresh floor with valid return stairs. Camp terrain, stored supplies, and merchant stock persist throughout the run.

The World map remembers **which regions you visited**, not permanent terrain. Purple entrance markers outside the active region mean **last seen**; a new visit can change those encounters.

## Gold, drops and merchant

Creatures do not always drop loot: approximately 50% drop nothing, 20% drop 1–3 coins, and 30% drop a low-value trophy. Loot remains on the ground and must be collected. Brush-rat fangs sell for 2 gold; frog pearls for 3. Coins do not occupy inventory cells.

Mara stands two tiles east and one north of the tent. From the starting position, walk **two steps east**, then E / Trade. Buy tonics (10 gold, three per run), a worn longsword (+1 attack, 35 gold), or patched vest (+1 defense, 30 gold). Sell carried items from the same dialogue. Equipped gear must first be replaced before it can be sold. Trading costs one turn per successful transaction; browsing is free. Stock does not replenish on travel.

## The 10×10 satchel

Open **I** or **Satchel / equipment → Manage 10×10 satchel**.

- Potions and trophies: **1×1**.
- Swords/spears: **7×2**, rotatable to **2×7**.
- Armor: **4×4**.
- Amulets: **2×2**.

Select an item, then tap an empty cell or set a one-based Column/Row and press Place item. Rotate item changes the planned orientation; choose a destination to commit it. Rearranging is free and does not advance enemies. Using, equipping or dropping costs a turn.

Capacity depends on contiguous shape, not just the number of free cells. Pickups, purchases, retrieval, quest rewards and equipment swaps check fit before committing. Failures leave ground items, money, stock, stored items and rewards intact. Camp storage is not spatially limited. Bag inspection also offers **Pick up item here**, so items dropped at camp or beside the merchant remain recoverable even where E normally opens another dialogue.

## Maps, Mana and permadeath

Local and World tabs switch the same minimap canvas. Local shows explored tiles and discovered features. World shows one square per visited region, biome colors, camp, your region, and last-seen entrances. Minimize/restore with Map − / +; switching costs no turns.

Mana begins at 100. Mind Vision costs 25 and lasts for the casting turn plus two further completed turns. Moving/melee restore 5 Mana; waiting and casting do not. Transitions end the effect. Terrain revealed during a visit stays mapped until that region regenerates.

**There is no save system.** Death ends the run, including camp storage. Refreshing, closing the page or Safari unloading it also loses the run. The slower progression is intended for longer runs, not cross-session persistence yet. No construction, crafting, hunger, gathering, farming systems, multiplayer, or paid services were added.

## Verify

```sh
npm test
npm run build
npm run preview
# Optional browser suite:
npx playwright install chromium
npm run test:browser
# Existing Linux Chromium:
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Validation: 65 simulation tests and 21 Chromium browser tests. Coverage includes all generated walkable tiles/exits across seeded samples, spawn uniqueness, turn accounting, regeneration, slow leveling, loot outcomes, all six encounters, quest completion, shop purchases/sales, inventory footprints/rotation/full-bag transactions, and phone gestures/layout. Browser fixtures use actual inputs against a deterministic simulation, without injecting character state. One browser run completes the frog quest, sells its reward and buys a tonic; another rearranges and drops/recovers inventory on a phone layout.

Phone tests are Chromium touch emulation. Actual iPhone Safari remains a manual check; WebKit download was blocked by the environment. Balance is a first pass, not an exhaustive long-run playtest. Art is simple original procedural pixel-style drawing. There is no sound. Vite reports the expected large Phaser bundle warning.

## Architecture and publishing

`src/game/expedition.js` is the current mode, extending the original dungeon-only `Game`. `world.js` builds terrain and encounter sites; `encounters.js` defines the six types and treasure; `inventory.js` owns spatial capacity; `merchant.js` owns stock and purchasing. Combat, items, visibility, AI, seeded RNG and the central turn manager remain independent of Phaser. `inventory-ui.js` provides the grid editor; `main.js` handles dialogues/HUD/input; `render/scene.js` draws snapshots; `minimap.js` owns both map views.

GitHub Pages uses **Source: GitHub Actions**, with `feature/playable-roguelike` allowed by the `github-pages` environment. Source pushes trigger testing/building and official Pages artifact deployment. The public URL changes only after a successful workflow; a Git push alone does not verify publication. Relative asset URLs support `/DungeonCrawler/`. The historical `gh-pages` branch is not the active deployment source.

## Character equipment screen (v0.5.1)

Open **I → Equipment**, or expand Satchel / equipment and choose **Character / equipment**. Satchel and Equipment are separate tabs in the same popup. A character portrait shows your equipped weapon in hand, armor on the torso, and an amulet at the neck. Tap a slot to inspect its item and bonus, then use its Unequip button. Carried equipment is listed below the portrait with Equip buttons. The world character sprite is unchanged.

Equipped items leave the satchel because they occupy the character’s weapon, armor or neck slot—not because they were discarded. Unequipping places the item back into a fitting bag space, including rotation when needed. A full or fragmented bag rejects unequipping without losing the item or spending a turn. Equipment changes update attack/defense and consume one turn; looking and switching tabs are free. If enemies are nearby, they act after each successful equipment change.

Touch actions commit once through the native click after a valid release, preventing a compatibility click from immediately activating newly opened dialogs. Dragged, canceled and ambiguous two-finger gestures spend no turns. Keyboard and assistive activation are supported. The desktop and phone browser suites complete a real frog quest, equip its amulet, verify the neck icon and defense bonus, then unequip and verify that the bag item returns.

## Desktop panels (v0.5.2)

Map and Satchel / equipment are independent dropdowns beside each other in the upper-right of the play area. Satchel starts collapsed; expand it for quick item use, the 10×10 bag, or the character equipment screen. The I shortcut still opens the bag directly. Chronicle now appears directly below character stats, with its own scrolling log. Local quest sits at the bottom of the desktop sidebar. Browsing these panels does not spend turns.

## Held keyboard movement (v0.5.3)

Hold WASD or an arrow key to keep stepping: one immediate action, a 300 ms initial delay, then one action every 150 ms. Each valid step or bump attack advances exactly one turn; walls still cost no turn. Release to stop. Menus, clicking controls, switching tabs, and losing window focus cancel held movement. After cancellation, release and press again to move. Only the most recently pressed direction repeats; other actions and touch controls remain one action per press/tap.
