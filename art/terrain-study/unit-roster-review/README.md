# Painted unit models for review

[View all ten units on the game board](on-board.jpg). Each crop shows the same tile at normal play zoom on turn 151. The game supplies the seat colours, shadows and badges.

[Compare all ten models with the current Swordsman, Horseman and Catapult](roster.jpg). The sheet shows each mesh at the same scale. It uses teal for the player's colour.

| Model | Equipment |
|---|---|
| [Hypaspist](hypaspist.glb) | Broad round shield, short sword and crested helmet |
| [Janissary](janissary.glb) | Tall felt cap and upright matchlock |
| [Condottiere](condottiere.glb) | Poleaxe and plumed visor helmet |
| [Qin Crossbowman](qinCrossbowman.glb) | Transverse crossbow, bound topknot and lamellar armour |
| [Sparabara](sparabara.glb) | Tall wicker shield and spear |
| [Hwacha](hwacha.glb) | Inclined rack of fifteen rockets on the current siege chassis |
| [Numidian Cavalry](numidianCavalry.glb) | Paired javelins and small round shield |
| [Company Guard](companyGuard.glb) | Folded hat, cartridge box, crossbelt and sword |
| [Ballista Elephant](ballistaElephant.glb) | The existing siege elephant carries a ballista in its howdah. |
| [Keshig](keshig.glb) | The unit retains the xiongnuHorseArcher id and its mounted bow model. |

From the repository root, run `node scripts/terrain-study/build-roster-review.mjs` to rebuild the GLBs. The script prints the directory that holds the three reference pieces. Pass that directory to `python3 scripts/terrain-study/render-roster-review.py` to rebuild the sheet. The renderer uses NumPy and Pillow.
