# Mounted equipment review

User ruling, September 14: anti-cavalry and ranged look approved; continue with
the mounted variants. Preserve the accepted horseman and horse-archer chess
busts, circular plinths, enamel and ivory materials. No articulated riders.

Implement the remaining cavalry and mounted-ranged roster: cataphract, knight,
Knights Templar, Tang cavalry, Chanyu guard, gendarme, Mandekalu, whistling arrow,
Xiongnu horse archer, camel archer, chariot, scythed chariot and chariot archer.
Small armour/weapon variations use the existing horse; the camel has its own
recognizable curved neck and blunt muzzle. Chariots are small wheeled counters.

Separate Cavalry and Mounted ranged comparison groups in Flair include the
approved bases. Use the production resolver for stationary, moving and falling
copies, owner colours, fog and interaction. Preserve existing geometry hashes.
Validate the two groups visually and through tests; run typecheck, core and
build before returning for an eye check. Siege/naval and world layers follow.

Implemented: thirteen variants through the shared production resolver; two
comparison groups with ten cavalry and five mounted-ranged specimens. Armour
is fitted to the horse's shoulder taper. Existing accepted asset fingerprints
pass; a dedicated geometry test also preserves the exact horse and mounting
under all nine new horse-based variants.

Validation: typecheck, all 6,493 core tests in 230 files and production build
pass. Build retains the existing large-chunk advisory. Live inspection covered
both comparison groups, armour, shields, pennants, camel and chariots, maroon
and jade owner palettes, direct model selection with badges hidden, real
movement, remembered fog and restoration. No browser errors reported.

Evidence: `.dream-loop/cavalry-variants-review.png` and
`.dream-loop/mounted-ranged-variants-review.png`.

Review routes:
- `/flair.html?review=units&unit=cavalry&group=cavalry&light=golden&detail=close`
- `/flair.html?review=units&unit=mountedRanged&group=mountedRanged&light=golden&detail=close`

Approved by the user; proceed to the siege family.
