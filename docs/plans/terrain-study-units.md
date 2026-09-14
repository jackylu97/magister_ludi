# Unit pieces — original memory-table direction

Updated September 14, 2026. The user clarified that the desired baseline is the
**first lapis/enamel board's primitive chess pieces**, with only a little more
detail. The later Blender sculptures, including the mounted knight, are shelved.

## Active style and scope

The source reference is `mockups/memory-table/study-01.js`, especially `piece()`:
a low gold/colour/ivory plinth, a turned coloured robe, an ivory head and a small
crown or staff. This is a symbolic tabletop counter, with no articulated anatomy.

`src/terrainStudy/primitiveUnitModels.js` adapts that family into twelve
representatives:

- Warrior: the same ivory face and simple conical cap as the spearman,
  with a compact shield and straight sword.
- Spearman: simple ivory cap and an upright gilt spear.
- Horseman: one continuous ivory chess-knight bust on a short enamel seat.
  Its flared chest narrows in depth as it rises into the neck and compact
  downward muzzle. The shared circular plinth and gilt trim tie it to the
  family; there is no separate human robe or head collar beneath the bust.
  Small ears, an incised eye and a restrained gilt mane complete the silhouette.
  A straight ivory sword beside the bust distinguishes it from mounted archers.
- Archer: the shared cap and turned body, with a bow, string and quiver.
- Horse Archer: the approved horse bust, with a side bow and quiver.
- Worker: an abstract tapered enamel pawn with a blank ivory ball finial and a
  pickaxe symbol. The human face, hat, tool pack and strap are removed.
- Prophet: a religious headpiece, solar staff and book.
- Scout: the larger military body wrapped in a simple hooded cloak, with
  an upright walking staff. No explorer's hat or compass badge.
- Settler: a compact plain pawn carrying a flag beside it. The backpack
  is removed, and its review angle faces the flag toward the map camera.
- Trader: a compact covered wagon standing directly on four wheels, with no
  pedestal or display seat. Its selection/reservation radius covers the wagon.
- Great person: a shared turned body, diagonal ivory mantle and laurel. Five
  small role emblems distinguish scholar (scroll), artist (lyre), engineer
  (dividers), merchant (coins), and general (sword and baton). These are family
  variants of the existing `greatPerson` ID, not new unit IDs or named portraits.
- War elephant: a broad ivory bust on the knight socket, with an integrated
  curled trunk, flared ears, paired tusks and an enamel brow cloth. The cloth
  samples the carved forehead during asset construction to avoid clipping.
  The finial is narrowed 20% and reduced 13% in depth, with 12% smaller ear
  spans; its height and circular plinth remain the same.

Modest collar, hem and insignia details extend the first study's language. Lapis
and vermilion study pigments come from that first palette. Ivory and antique gold
remain fixed while the robe and coloured plinth communicate ownership. Existing
Crimson, Teal and Lapis faction colours remain available.

The original only had king and sage variants; the military identifiers are new
adaptations in that family. All twelve representatives, including the cavalry
sword, five great-person family variants and war elephant, are accepted for this
integration baseline. The leader integration expands the inventory from 44 to
61 data IDs; it adds no sculpts and approves no new variants.

The first production unit review is approved. The next review implements the
six remaining infantry variants around the same pawn: swordsman, legionary,
longswordsman, fire lance, khopesh and eagle warrior. `unitExamples` and
`unitArtSpecs.ready` continue to identify the twelve approved sculpts;
`unitReviewVariants` and `unitArtSpecs.implemented` track the additional models
available for inspection. This distinction keeps implementation from silently
becoming visual approval. See [the infantry checkpoint](painted-infantry-variants.md).

## Leader roster inventory

The original 44 IDs retain their exact line and zero-based rank. `unitLines`
appends membership for new IDs, while `leaderUnitArtSpecs` assigns their ranks
explicitly; appending a leader alternative must not turn it into the next tier.
The twelve example IDs, their order and their readiness remain unchanged. Every
entry below has `ready: false`, including alternatives whose base is represented.

The current leader sheet assigns thirteen units. Four earlier alternatives remain
in unit data for saved-game coverage but are not assigned by the current sheet.
“Parked” below describes that roster status, not a separate art approval.

| ID | Line | Rank | Variant | Roster |
| --- | --- | --- | --- | --- |
| `slinger` | `ranged` | 1 | `sling` | active |
| `fubing` | `polearm` | 0 | `militia-spear` | parked |
| `tangCavalry` | `cavalry` | 2 | `lamellar-lance` | active |
| `whistlingArrow` | `mountedRanged` | 0 | `whistling-bow` | parked |
| `xiongnuHorseArcher` | `mountedRanged` | 1 | `steppe-bow` | active |
| `chanyuGuard` | `cavalry` | 3 | `household-guard` | parked |
| `khopesh` | `infantry` | 1 | `sickle-sword` | active |
| `camelArcher` | `mountedRanged` | 1 | `camel-bow` | active |
| `ponticPeltast` | `polearm` | 0 | `javelin-shield` | active |
| `scythedChariot` | `cavalry` | 0 | `scythed-carriage` | parked |
| `gendarme` | `cavalry` | 3 | `heavy-lance` | active |
| `mandekalu` | `cavalry` | 1 | `quilted-mail` | active |
| `treasureShip` | `navalHeavy` | 2 | `treasure-rig` | active |
| `eagleWarrior` | `infantry` | 1 | `eagle-headdress` | active |
| `alexandrianGalley` | `navalLight` | 2 | `lookout-galley` | active |
| `canoness` | `faith` | 2 | `choir-book` | active |
| `rihlaCaravan` | `trader` | 0 | `journey-wagon` | active |

Ranks identify visual positions within a line, not technology columns or a new
gameplay upgrade chain. The slinger shares the bowman's early ranged rank but
needs a sling silhouette. Fubing and Pontic Peltast use the spearman's anti-cavalry
rank despite their broad `melee` model class. Khopesh and Eagle Warrior share the
swordsman's rank with distinct weapon/headwear identifiers. Tang cavalry shares
the cataphract's armored rank; Mandekalu shares the horseman's; Gendarme and
Chanyu's Guard share the knight's heavy rank. These are equipment alternatives,
not increasingly large bodies.

The Whistling Arrow occupies the early mounted-ranged rank; that does not imply
the chariot wheels belonging to the original `chariotArcher` entry. Xiongnu Horse
Archer and Camel Archer share the horse archer's rank, with the latter requiring
a camel shape. Canoness follows the apostle's religious role, and Rihla Caravan
the trader's route role, despite both using broad worker-class data.

Naval rank follows the existing rig scale: Treasure Ship uses heavy rank 2 beside
the four-mast carrack; Alexandrian Galley uses light rank 2 beside the three-mast
galley. Read actual `masts` and `canton` data during implementation. Treasure Ship's
descriptive nine-mast prose and deferred second passenger do not override its
authored four-mast model contract or invent transport gameplay.

## Rendering and review

Geometry is built once from Three.js primitives, packed into fixed/owner roles,
and instanced. The page no longer downloads sculpted unit GLBs. It uses the same
terrain materials, lighting, cached shadows and surface-contact fitting as before.
Changing ownership updates instance colours without rebuilding the map.

Open `terrain-study.html?review&view=units&unit=warrior&light=day&settled&units&owner=enamel`.
Controls → Unit pieces provides individual views, All unit pieces, Compare pieces,
Civilian pieces, New unit pieces, owner colours and an optional selection ring.
The new-unit view compares cavalry, mounted archers, great person and elephant;
the civilian view includes the great person with worker, scout, settler and trader.
New placements are appended, preserving the earlier ten poses. Comparison framing
uses the posed mesh bounds, including tools and terrain elevation. The all-piece
view persists as `unit=all`, civilian group as `unit=civilian`, and new group as
`unit=new`. Great person family switches among five prebuilt models and persists
as `family=scholar|artist|engineer|merchant|general`. It rebuilds only the small unit
batches and invalidates the cached shadow map once; terrain and poses stay intact.
The study remains a set of staged examples on generated land. As of September
14, the twelve accepted models are also integrated into the opt-in production
renderer; simulation, gameplay equipment and map generation are unchanged. See
[the production unit checkpoint](painted-unit-integration.md).

`node scripts/terrain-study/check-unit-pieces.mjs` checks the actual primitive
factory and packed meshes: finite geometry, owner material masks, tabletop scale,
a 3,000-triangle ceiling per representative, every inventory mapping, and
independent ground-contact raycasts on three standard seeded maps. The caravan
also has independent checks beneath each wheel and across its carriage bed,
so a crest between the wheels cannot silently intersect the body. `npm run build`
checks the production compilation. The five family variants are checked for
distinct geometry and identical contact points, so role changes can reuse the
fitted pose. Browser review covers every family, close and combined views.

Current geometry: Warrior 1,556 triangles; Spearman 1,380; Horseman 1,256;
Archer 1,632; Horse Archer 1,436; Worker 1,120; Prophet 1,636;
Scout 1,856; Settler 1,208; Trader 1,551; War Elephant 1,608;
Great-person variants 1,552–1,644. The freestanding wagon is deliberately
lower than the upright pawns (.479 world units) and has a .40 minimum-height check.
The earlier build and three-seed placement checks passed, including 8,109 independent ground
contact samples, 75 carriage-bed samples and fourteen hill placements. The same
contact-fitting logic uses plinth undersides for eleven pieces and eight tread
vertices across the caravan's four wheels. Evidence: `.dream-loop/primitive-unit-checks.json`,
`primitive-unit-build.log`, `primitive-seven-pieces.png`,
`primitive-warrior-shared-cap.png`, `primitive-worker-token.png` and the
archer, horse-archer and prophet `primitive-*-draft.png` views. The civilian batch
uses `primitive-civilian-revised.png`, `primitive-scout-hood.png`,
`primitive-settler-flag.png` and `primitive-trader-revised.png`.
New-batch evidence: `primitive-cavalry-sword.png`, `primitive-war-elephant-slim.png`,
five `primitive-great-*.png` family views and `primitive-new-pieces.png`.

`test/render/paintedUnitCatalog.test.ts` checks the current 61-ID inventory,
unchanged original ranks/examples, explicit unready leader variants, naval rank
equivalence, and this table against the current thirteen-unit leader sheet.

## Remaining unit art

Four base families still need representatives: siege, light ships, heavy ships
and ranged ships. Together they cover sixteen IDs after the two leader hulls
are included. Twenty-seven additional IDs in represented families still need
equipment or rank models, and six infantry variants are implemented for review.
The twelve accepted representatives, six infantry review variants and forty-three
remaining IDs account for the full roster.

The bounded model work includes a readable sling; a camel adaptation of the
mounted-ranged counter; wheels/carriage for `chariot`, `chariotArcher` and the
parked Scythed Chariot; and per-rig hull ranks and cantons, including the two
leader ships. Leader-specific insignia, lance/armor, headwear and book/wagon
details remain pending even where the underlying primitive is approved.

The production kit now maps `Unit.person` through the game's existing family
lookup, preserving all five families and the scholar fallback. Named people are
not additional unit IDs. Embarked land units and laden caravans retain existing
models. The integration preserves the upstream seat-primary body and secondary
outline, with hostile and routed-state emphasis taking precedence over normal
trim on both stationary and moving copies.

## Preserved experiments

`art/terrain-study/` contains the shelved Blender GLBs and detailed knight scene.
Its README records the authoring commands. Default Blender unit generation writes
there; it cannot silently overwrite the live primitive kit. Earlier mounted-knight
review notes are historical evidence, not approval of the active direction.

Next: eye-check the infantry equipment variants in the production unit review,
then continue the remaining line/variant work in bounded batches. The inventory does
not change the active art examples or imply approval of unfinished models.
