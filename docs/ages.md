# The Five Ages — tech tree working doc

Supersedes `docs/tech-unlocks.md` (2026-08-23; kept as the Age-I-rework record).
Companion: `docs/mythic-sciences.md` (tone arc, threads, late-game candidates).

## The ladder

| Æra | Name | Register | Pacing role (user, 2026-08-23) |
|---|---|---|---|
| 1 | **The Age of Omens** | tribal mysticism, divination, first fields | core improvements · early religion investments · early growth + expansion · early military vs roaming barbarians *(barbarians: new system, roadmap)* |
| 2 | **The Age of Heroes** | Iliad, Hittites, Shang/Zhou, Assyria/Babylon, early Olmec | **rest-of-game wonders** (+ plainer techs that unlock them, e.g. Epic Poetry → the Oracle) · early great-people generation *(system TBD)* · administrative/science/cultural/gold buildings introduced |
| 3 | **The Age of Empire** | Rome, Han, Alexander, Maya | ramping empire bonuses · road + trade networks · premiere war units + combat bonuses · victory specialization begins |
| 4 | **The Age of Cathedrals** | House of Wisdom, Song China, Mansa Musa, sagas, khanates | late-game victory conditions · highly specialized rewards · unique flavor units · powerful empire-wide bonuses · late war units |
| 5 | **The Age of the Magister** | renaissance shading into the dream of engines (see mythic-sciences) | post-victory accelerants · explicit victory-condition bonuses · massive game-enders. **Most games end late Age 4 / early Age 5.** |

(If a sixth "Age of Engines" is ever wanted, it splits out of Age 5; for now the
engines are Age 5's late content.)

## Age 1 — The Age of Omens

**Existing (from the shipped tree):**
- Agriculture (root, free) — settler/warrior/scout/worker · farm
- Husbandry — horseman · pasture · reveals horses
- Fletching — archer · camp
- Mining — mine
- Earthenware — granary (+3🌾) · **water tiles +1🌾 in a granary town, from Sailing**
- Divination — shrine (+1🔬 +1🎵)
- **Sailing** *(shipped 2026-08-26, Entry XXVII)* — **embark** (civilians cross coastal
  water) · **fishing boats** · the granary's water line. The sea lane (row 6) opens with
  it, and it is the age's third 8🔬 node off Agriculture.

**Suggested additions (grounded bonuses/unlocks):**
- **Wayfinding** — scouts +1 sight, settlers +1 movement. The expansion tech; flavor: the
  paths are songs (songlines).
- **The Palisade** — city defense building (+city HP/defense). The barbarian answer; every
  early game wants one. **Shipped 2026-08-26** as a *building* rather than a node — the
  **palisade** (30⚙, +5 city defense) hangs off Stonecraft, since a wall is what stone is
  for and Stonecraft was already the masonry node. The tech this entry proposed is
  therefore spent; if the five-age re-banding still wants a node here it needs a different
  gift.
- **Ancestor Rites** — barrow/ancestor-mound building: +1🎵 (+1 happiness when the meter
  wants more sources). The second religion investment after Divination — omens for the
  living, rites for the dead. **The happiness half shipped 2026-08-26** as **Funeral
  Games** (35⚙, +3 happiness, on Bronzeworking — the games are held for the war dead, on
  the node that hands over the spearman). It is the first building in the game to touch a
  meter's *supply* side, and it did it through the generic `happiness` field rather than a
  case, so a barrow that also pays culture is a data row.
- *(optional)* **Weaving** — city center +1🪙; plants the loom thread that ends at the
  Jacquard/Calculating Engine in Age 5.

Age total ~9–10 nodes. Pacing goals covered: improvements (existing **seven**, the
fishing boats included), religion (Divination + Ancestor Rites), growth (Earthenware),
expansion (Wayfinding **and Sailing** — a coastal start is no longer a wall), military
(Husbandry/Fletching units + The Palisade).

## Age 2 — The Age of Heroes

**Existing (from the shipped tree):**
- Bronzeworking — spearman · barracks · **funeral games (+3 happiness)** · reveals iron
  *(the Bronze Age itself)*
- Stonecraft — quarry · monument (+2🎵 +1 authority) · **palisade (+5 city defense)**
- Calendar — plantation · +1🪙 renewal · **Tithes** *(repeating project: 20⚙ → 5🪙)*
- The Wheel — war chariot + chariot archer · granary renewal *(the Iliad's weapon)*
- Letters — library/Tablet House *(oracle-bone writing)* · **Scholarship** *(repeating
  project: 20⚙ → 5🔬)*

**Suggested additions:**
- **Epic Poetry** — unlocks **the Oracle** (wonder) · candidate rule: fallen units yield
  culture ("the fallen become verse"). The user's own example of the wonder-carrier tech.
- **Kingship** — unlocks the **Stele of Laws** building (+authority capacity — the ancient
  administrative building) · candidate wonder: **the Walls of Uruk**.
- **The High Temple** — unlocks the **ziggurat** (temple-tier religion building, +🎵 +🔬
  per the religion-feeds-science doctrine) · natural early great-prophet source when great
  people exist.
- **Caravans** — unlocks the **bazaar** (+2🪙, the first gold building) · placeholder hook
  for trade routes (Age 3 system).

**Age 2 wonder candidates (rest-of-game influencing):**
- **The Oracle** — mints a Magister's Die each age (the dice economy's canon source)
- **The Pyramids** — workers +1 charge, empire-wide, forever
- **The Walls of Uruk** — capital defense + culture; "climb the walls and walk them"
- **The Hanging Gardens** — growth (+🌾 or happiness) — the vertical-play wonder
- **The Great Ziggurat** — religion/science hybrid engine

Age total ~9 nodes. Wonders need the wonder system (unique buildable, one per world —
new but small: a building flag + claimed-by tracking).

## Ages 3–5 — current mapping and direction

- **Age 3 (Empire)** = current Age II techs (Iron Working, Mathematics, Currency,
  Construction, Philosophy, Engineering, Drama) + the road/trade systems when built.
- **Age 4 (Cathedrals)** = current Age III techs (Feudalism, Machinery, Theology, Chivalry,
  Steel, Physics, Education) + victory-specialization content. Flavor direction:
  House of Wisdom (science), Song fire-medicine (the eastern truth), Mansa Musa (gold),
  sagas (culture) — the age the world talks to itself along the Silk Road.
- **Age 5 (Magister)** = new content from `mythic-sciences.md`: Perspective Glass,
  Clockwork Servant, aerostats, Mesmerism, the Calculating Engine, ending at
  **The Great Work → the Magnum Opus** (Entry VI victory).

## Systems this ladder assumes (roadmap, in rough order of need)

barbarians (Age 1's antagonist) · wonders (Age 2's signature) · great people (Age 2 onward)
· roads + trade routes (Age 3) · victory-condition beads wiring (Ages 4–5, Entry VI) ·
the unlock-roll masteries + Statecraft drafting (Entry XV) threading through all of it.

## Revisions

*(yours — edit away)*
