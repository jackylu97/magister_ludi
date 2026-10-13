# Synergy patterns

## What cards can read today

These lists are a snapshot (2026-10-13). Check the source before relying on one; a member can be added or retired.

**Moments a card can pay on** (`WindfallOccasion`, `src/sim/statecraftData.ts`): chop, camp (cleared), growth, found (a city), completion, buildingCompletion, unitCompletion, capture, discovery, death, kill, pillage, improvementBuilt, veinFound, prospect, pillageTrader, tech, tilePurchase, rite, purchase, declareWar, periodic, greatPersonAct.

**Moments counted while a card is seated** (`TallyOccasion`, for growers and commissions): barbarianKill, wonderAnywhere, greatPersonSpent, unitLost, goldSpent, unitKilled, unitTrained, campCleared, cityCaptured, wonderOrCapitalCaptured, hexBought, buildingBoughtWithGold, riteStarted, foreignCityConverted, faithPerTurn, capitalFaithPerTurn.

**Moments the world announces** (`Occasion`, `src/sim/occasions.ts`; used by beads and Triumphs, not all of them wired to card pay): ageEntered, wonderCompleted, cityFounded, cityCaptured, governmentAdopted, beliefConsecrated, discoveryClaimed, campCleared, battleWonAgainstStronger, cityOnOtherContinent, religionFounded, capitalCaptured, greatPersonRecruited, navalUnitBuilt, ageClosed, wagerClaimed, maliceSeated, censusTaken. A card paying on one of these that is not a `WindfallOccasion` needs a new shape.

**Quantities a card can count** (`CountKind`; the list continues past this snapshot): cities, population, capitalPopulation, garrison, workedHills, bankedFaith, bankedGold, visibleCamps, scienceBuildings, buildingsOfKind, buildingsInCity, workedTilesInCity, workedUnimprovedTiles, wonders, revealedTiles, sightedCities, luxury and resource counts, tilesInBorders (with a tile test), and others.

**Empire conditions** (`EmpireCondition`): cityCountAtMost / AtLeast, authorityNegative / Positive, happinessNegative, atWar, atPeace, keepingRite, atWarWithOpusBuilder, noReligionFounded. Combat conditions: vsBarbarians, ownTerritory, foreignTerritory, onHills, vsCity, targetBelowHalf, capitalTerritory, inCity, capturedCity.

**The deck keywords** the user wants more cards to share (ruling, 2026-10-13): **levies** (a town spends a citizen), **tended works** (managed wild land), **commissions** (a goal that pays and leaves its chair), **charters** (a card that unlocks something and needs no chair).

## What the bot measurements found about raising and reading (2026-10-13 audit)

- Garrisons and military buildings saturate at one per town, with about 23 cards reading them between them. Readers of saturating quantities scale with towns, not effort.
- Units trained had about 12 cards making more of them and only 2 reading them.
- Citizens had about 20 creators and only about 4 midgame readers.
- Most scaling readers sat in Tier IV, too late to build around.
- Loops that already work: food → levy → trained unit; happiness; time.

## Patterns from other games (`docs/plans/card-synergy-research.md`)

- **Balatro.** Every joker touches the same few numbers, so jokers combine without being designed together. Three layers: flat adds (strong early, fall off), multipliers (worth more on a big flat base), and scaling jokers that grow as you act. Our yield fold has the same layers: flats, then town percentages, then empire percentages.
- **Slay the Spire.** Archetypes are built on a resource that grows (Strength, Poison). Set-up cards stand alone; pay-offs reward commitment; many medium pay-offs that are easy to reach and a few huge ones that are hard to reach. Bridge cards serve two archetypes. Conflicting archetypes produce dead cards.
- **TFT and Battlegrounds.** Our decks already work like tribes: two decks per seat narrow the pool. Battlegrounds' doublers (Brann, Baron) multiply a whole category and are the most memorable pay-offs. TFT's warning: cheap access to a deep threshold breaks balance.
- **Monster Train.** Two clans per run, like our two decks. Cross-clan synergy comes from generic keywords both clans make or use, not from pair-specific cards.
- **Hades.** Duo boons appear only once both gods are held, so the pay-off is never dead.
- **Against the Storm.** Cornerstones chosen each year reward the same kinds of events, so they combine with each other.

Declined by the user: tags written to make cards combine, and a smaller pool per game. Open: counters every card raises or reads, pay-offs that arrive when they work, keystone moments at band openings.

## Traps

- A pay-off whose quantity no card in the seat's pool raises before its band.
- A condition the player cannot meet in the band the card is dealt (Established Routes: a route kept 30 turns).
- Two narrow facts in one condition.
- A flat number written for the wrong age (a band 2 card at band 0 size).
- War-only cards too weak to hold a chair through peace.
- Early culture priced at face value.
- For Dominion: pay that grows with army size held at peace.
