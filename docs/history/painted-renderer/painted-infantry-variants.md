# Painted infantry variants — September 14, 2026

The user approved the first twelve-piece production review and asked to continue.
The next bounded checkpoint completes the infantry line around the accepted
warrior pawn: swordsman, legionary, longswordsman, fire lance, khopesh and eagle
warrior. Preserve the accepted warrior, turned enamel body, ivory head, round
plinth and gold trim; equipment and restrained headgear distinguish the variants.
These are small board-game counters, not articulated people or new sculptures
in the shelved realistic style. Ownership stays in the same enamel and secondary
outline channels. Do not distinguish types solely by colour.

Use a sword and small guard for the swordsman, a broad shield and restrained
helmet crest for the legionary, a longer blade and enclosed helmet for the
longswordsman, an upright tube-tipped fire lance, a readable curved khopesh and
a compact eagle-shaped headpiece. Avoid overly tall crown-like helmets and
keep equipment within the scale/contact limits of the accepted family.

Integrate this line into the existing painted model resolver and its cached
instancing, movement, death and terrain support. Keep the original twelve
examples and unit-line rank mapping intact. Mark the new models as implemented
for review without claiming user approval. No simulation or roster changes.

Add a side-by-side Infantry group and individual specimens to the production
Flair unit review, retaining game/detail zoom, owner pairs, shadows, selection
and movement. Inspect the actual silhouettes at game and detail scale before
stopping for the next eye check. Other line variants, ships, siege and runtime
hulls remain outside this batch.

## Implementation

`infantryUnitModels.js` adds equipment to the unchanged primitive factory's
warrior robe, face and plinth. All six variants have the warrior's exact 245
underside contacts; packed geometry ranges from 1,620 to 2,028 triangles. The
original twelve models and all five great-person appearances match packed-byte
fingerprints captured before this batch. No accepted model was resculpted.

The production kit resolves eighteen IDs: twelve accepted representatives plus
six infantry variants for review. `unitArtSpecs.implemented` tracks availability;
`ready` and the original `unitExamples` list still track the accepted baseline.
Unit types and ranks remain unchanged. Moving and falling copies retain the
variant's own geometry, owner shader and support footprint.

The Flair unit review has separate Accepted representatives and Infantry variants
groups. `unit=infantry` opens a compact seven-piece world; each new type has a
direct individual route. Changing owners reuses the map, while changing groups
builds a separate fixture and resets its specimens. The original twelve-piece
world, city stack and hill examples remain intact.

An optional Badges checkbox exposes helmets for inspection. It removes the
stationary and moving badge passes and their hit targets together, restoring
them when enabled. The main game keeps badges enabled; no gameplay UI or save
format changes. The infantry comparison fits projected feet and head bounds to
the available canvas, including narrow panels, and reframes on resize. It does
not use the game's city-rail inset or change the main game's camera framing.

## Visual review

Entry: `/flair.html?review=units&unit=infantry&light=golden&detail=close`.
Inspected every variant with badges hidden at detail scale, the combined line
in maroon/gold and jade/ivory, and the legionary at game scale with selection
and a successful real one-hex movement command. The long blade, broad shield,
fire-lance tube, curved khopesh and eagle headpiece read as equipment changes
within one family. The user approved these on 2026-09-14; the next requested
pass changes the warrior to a club and adds unit hover/model selection, recorded
in `painted-unit-interaction.md`.

The new models stay in the opt-in painted renderer. The forty-three remaining
roster IDs and embarked/laden state models still use the existing art. No new
performance claim: geometry remains cached and instanced, with no per-frame
asset generation. Siege, ships and other line/leader variants follow this review.

## Validation

`npm run typecheck`, `npm run build` and the full core suite all exit 0. Core:
6,442 tests across 225 files. Focused coverage includes packed-byte preservation,
finite/distinct equipment meshes, identical ground contacts, owner masks,
stationary/moving/falling identity, badge visibility/hit targets, fixture routing,
legal movement and fog. The build retains its existing large-chunk advisory.
Logs: `.dream-loop/painted-infantry-{core,typecheck,build,runtime,badges}.log`.

The final browser pass caught a slow synchronous group-selection callback. Group
and specimen resets now defer the rebuild until after that event and show a
preparing status, preventing the selector from remaining half-switched. Both
directions were rechecked in the live gallery, with no console errors. The final
comparison was also checked at the narrower browser-panel width. Typecheck and
build passed again after these gallery-only scheduling/framing changes.
Screenshot: `.dream-loop/painted-infantry-review.png`.
