# Loot & wardrobe — v0.10.0

Balance target: a roughly 20-minute expedition with attainable plain equipment and occasional desirable finds. This is a tuning target, not a measured completion time. Items can repeat; rarity comes from combinations and opportunity costs.

## Item table

Ordinary item rolls use the weights below out of 115. A roll below its minimum area danger becomes a small purse rather than re-rolling into rare equipment. Area danger is not player level. Den, crypt and boss rewards select only eligible equipment and apply context weights.

| Item | Kind | Weight / 115 | Minimum danger | Effect |
| --- | --- | ---: | ---: | --- |
| Throwing stones | stone | 18 | 1 | Throw up to 4 tiles for 2 damage before defense (minimum 1). One stone and one turn; 50% recovery chance. Stacks of 9 occupy 1×1. |
| Ember tonic | potion | 16 | 1 | Restores 16 health. Using it costs one turn. |
| Honeyed Rations | ration | 8 | 1 | Heal 3 HP after each of the next 4 turns. Taking damage interrupts the meal. Best outside combat. |
| Clearwater Draught | cleanse | 6 | 3 | Removes sap corrosion. Using it takes one turn. |
| Moonwell Sip | mana | 4 | 3 | Restores 35 Mana. Using it takes one turn. |
| Worn shortsword | weapon | 7 | 1 | +1 attack. Reliable adjacent strikes. Main hand; 7×2 cells. |
| Trail spear | weapon | 6 | 1 | +1 Reach: strike 1–2 tiles in a cardinal direction through a clear line. No attack bonus. Main hand; 7×2 cells. |
| Woodcutter’s Hatchet | weapon | 4 | 3 | Ignores 1 point of enemy defense on melee strikes. |
| Patched vest | armor | 6 | 1 | +1 defense while equipped. Takes 4×4 satchel cells. |
| Quilted Gambeson | armor | 4 | 3 | +2 defense. Bulky quilted protection. |
| Weathered buckler | offhand | 6 | 1 | Off hand. 35% chance to completely block each incoming attack while equipped. Passive: no action or Mana cost. 3×3 cells. |
| Reed Shield | offhand | 3 | 3 | 55% block against ranged attacks, 15% against melee. No action needed. |
| Reedheart amulet | amulet | 3 | 3 | +1 defense while equipped. A villager’s gratitude, bound in silver reeds. |
| Amber Moth Pendant | amulet | 2 | 6 | +2 Mana recovered on movement/melee. |
| Wolf-Tooth Charm | amulet | 2 | 6 | +1 melee damage against an enemy with no living ally within 2 tiles. |
| Bellflower Charm | amulet | 1 | 6 | Consumable healing is increased by 25%. |
| Balanced Throwing Knives | knife | 1 | 3 | Throw within 4 tiles for 4 damage before defense. 50% recovery chance. Stacks of 9. |
| Smoke Flask | smoke | 1 | 3 | For 3 enemy phases, enemies beyond adjacent range cannot pursue or fire at you. Adjacent enemies still attack. |
| Thunderstone | thunder | 1 | 6 | Throw within 4 tiles to interrupt an enemy and make it lose its next action. No damage; consumed on impact. |
| Last-Light Medallion | amulet | 1 | 9 | Prevents one fatal hit, leaving 1 HP, then permanently shatters. Later hits can still kill you. |
| Trail Boots | boots | 4 | 1 | +1 defense. Sturdy brown leather boots. |
| Softstep Shoes | boots | 2 | 3 | Enemy detection range is reduced by 2 tiles. No armor bonus. |
| Iron Band | ring | 3 | 1 | +1 defense. |
| Hunter’s Ring | ring | 2 | 3 | +1 attack. |
| Moonstone Ring | ring | 2 | 3 | +20 maximum Mana. Equipping does not restore Mana. |
| Lantern Relic | offhand | 1 | 2 | Off-hand relic: +1 sight and +2 Mana recovered on movement/melee. Replaces a shield. |
| Waystone Focus | offhand | 1 | 3 | Off-hand relic: +20 maximum Mana; Mind Vision lasts one additional turn. Replaces a shield. |

## Sources

Ordinary kills: 25% small coins (2–4), 17% trophy, 8% weighted item roll, 50% empty. Named den beasts use a 24% item roll instead, plus their guaranteed equipment hoard. Locked item rolls become coins, so total coin frequency can be higher. Loot must be picked up; coins take no satchel space.

Dens guarantee eligible equipment and triple weapon/boot weights. Crypt coffers and the Warden reliquary guarantee eligible equipment and triple armor, ring, off-hand and amulet weights. The Mirekeeper gives a Reedheart amulet with quest modifier odds. Cache/caravan chests make an 80% weighted item roll, otherwise coins.

| Equipment source | Plain | Useful | Powerful | Exceptional |
| --- | ---: | ---: | ---: | ---: |
| Ordinary | 70% | 25% | 4.5% | 0.5% |
| Cache / caravan | 50% | 35% | 14% | 1% |
| Den / crypt / quest | 30% | 45% | 22% | 3% |
| Boss | 0% | 50% | 40% | 10% |

These are conditional odds for equipment, not the chance that an enemy drops a particular item. Useful modifiers can reduce footprint, increase attack/defense, or add Mana capacity. Powerful weapons bleed; powerful other gear protects against special attacks. Exceptional gear offers stronger bonuses. Blocks cap at 60%. Rewards lock before a failed collection/claim, preventing full-bag rerolls.

## Equipment and use

Seven slots: main hand, off hand, body, boots, neck, ring 1 and ring 2. Two rings may share a type and stack. The equipment popup lets you select which ring slot to replace. Inventory Equip fills an empty ring slot first. Failed swaps/unequips preserve gear and take no turn.

Relics compete with shields in the off hand. Mana-capacity equipment never restores Mana on equip; removal clamps current Mana to the lower cap. New runs have 8 gold: a plain shortsword or boots are immediately affordable. Camp stock is finite per run.

The shared original pixel silhouette appears in the world, HUD, inspection and equipment popup. It starts in a patched brown tunic without a weapon. Armor, boots, weapon type, shield/relic, necklace and both rings add visible details. Appearance is categorical rather than a unique drawing for every modifier.

Use new consumables from the satchel. Rations heal over four turns, interrupted by damage. Sap corrosion lowers defense until it expires or is cleansed. Smoke blocks distant pursuit/special attacks for three phases, but adjacent enemies remain dangerous. Last-Light prevents one fatal hit and shatters; later attacks in that same turn can still kill you.

Throwing uses the existing T quick slot. Choose ammunition in the targeting selector, or choose a specific stack in the satchel. Thunderstones interrupt one action; knives deal more damage than stones. Selection/cancellation stays free. Every successful use/equip/unequip/throw takes one turn.
