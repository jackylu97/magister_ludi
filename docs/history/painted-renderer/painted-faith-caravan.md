# Religious and caravan completion

The user approved naval and requested the next stage. Complete the remaining
roster art: augur, apostle, inquisitor, canoness and Rihla caravan. Keep the
approved prophet and wagon as comparison anchors. Religious variants share the
turned pawn, ivory/enamel/gilt palette and restrained emblem equipment. Rihla
uses the approved four-wheel covered wagon with journey cargo and a pennant.
The retired augur is compatibility art only; do not restore it to gameplay.

Add Religious and Caravans groups in Flair with production movement, fog,
owner colours and model selection. Preserve existing representative geometry.
Laden traders and embarked land units retain runtime art until that separate
stage. Validate catalogue coverage, variant identities, land/water/laden
resolution, motion and visual review, then typecheck, core tests and build.
Stop for the user's eye check before proceeding to runtime/world layers.

Implemented the four religious variants and Rihla wagon equipment. Religious
and Caravans review groups include their original approved anchors. All 61
roster IDs now resolve through the painted kit in their idle land/naval state;
retired/parked entries remain retired/parked in the simulation. Both ordinary
and Rihla laden caravans preserve the runtime trade model. All land pieces
still use runtime embarkation boats when on water.

The earlier prophet, wagon and other representative/infantry geometry
fingerprints pass unchanged. Coverage includes both caravan fallbacks, Rihla
wheel support on slopes, each new model's packed pigments and contacts, real
fixture movement, instancing and moving/falling copies. Sixty-five focused
checks and typecheck pass; production build passes with its existing chunk
size advisory.

Final validation: all 6,504 core tests in 231 files pass. A subsequent minor
Rihla pannier-clearance adjustment passed 50 focused rendering/fixture/motion
checks; final typecheck and production build also pass. Diff whitespace check
is clean. Live model selection, movement and remembered fog were checked on
the canoness, and caravan geometry was inspected in both maroon/gold and
papyrus/lapis. No browser errors. Evidence: `.dream-loop/faith-family-review.png`,
`.dream-loop/canoness-review.png`, `.dream-loop/rihla-caravan-review.png`.

Review URLs use `group=faith&unit=faith` and `group=caravans&unit=caravans` on
`/flair.html?review=units&light=golden&detail=close`. Approved by the user; loaded caravan art declined, proceed with embarked boats.
