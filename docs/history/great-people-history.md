# Great people — the measurements behind the ladder

Cut out of `docs/great-people.md` on 2026-09-11. The bench runs, the solve and
the before/after counts that produced `rules.renown`'s three figures. The rule
itself is in the reference; open this for the why behind a number.

## The rate, measured

Two bot games — standard map, two balanced seats (Crimson and Teal), the wild in
the fog, driven by `createBotStepper` — played until every seat had left Æra III
and on to turn 150, counting the great people each seat had recruited and the
renown it had banked all told (the pool plus every rung it had already paid). Bot
figures are a *scale* rather than a baseline (the user, 2026-09-09: the bot is
not a yardstick), and they are here so a ruling about a rate can be read as a
number rather than as an intention. Each cell is the two seats of seed 1, then
the two seats of seed 20260903.

**What the old ladder bought.** Under the pre-B4 ladder — `first 40 · step 25`,
the shape every figure below is solved against — the four seats left Æra III on
turn 116 · 123 · 129 · 127, having banked **1359 · 2323 · 1963 · 1827** renown
(mean 1868) and recruited **9 · 12 · 11 · 10** people (mean 10.5).

**The solve.** A linear ladder's cumulative cost is Σ(first + step·i), which at
40 · 25 is 12.5N² + 27.5N — quadratic in N, which is B4's finding written as
algebra: the number of people a bank of renown buys goes as the square root of
that bank over the ladder's *linear* term, so tripling the rungs bought half the
arrivals rather than a third. Thirding the count at the same bank therefore
multiplies the linear term by **nine**: 25 × 9 = **225**, which is B4's own
prediction reached by arithmetic rather than by another sweep. With the ruled
`base` of 75 and culture's own `exponent` of 2.8, the rungs sum to 75 · 376 · 907
· 1678 · 2701 · 3991 · 5566 · 7448, so the four measured banks buy **3 · 4 · 4 ·
4** people against a target of 3 · 4 · 4 · 3 (each seat's own count ÷ 3,
rounded) — the fourth seat is one rounding over, on a bank of 1827 against a
fourth rung reached at 1678. The base pays for the first rung alone and the
exponent is worth 1 · 7 · 22 · 49 renown on rungs two to five — a tail rather
than a term, which is why the linear does the work at the scale a game reaches.

**Confirmation** — the same two games replayed under `base 75 · linear 225 ·
exponent 2.8`. (Play diverges once the arrivals do, so the Æra III doors fall on
turn 115 · 123 · 127 · 129 rather than the old ladder's 116 · 123 · 129 · 127.)

| Ladder | Recruited, end of Æra III | by t100 | by t150 |
|---|---|---|---|
| first 40 · step 25 (the pre-B4 ladder) | 9 · 12 · 11 · 10 — mean 10.5 | 6 · 7 · 7 · 6 — mean 6.5 | 15 · 18 · 14 · 15 — mean 15.5 |
| base 75 · linear 225 · exponent 2.8 (now) | 3 · 4 · 4 · 4 — mean 3.75 | 2 · 3 · 3 · 2 — mean 2.5 | 5 · 6 · 5 · 4 — mean 5.0 |

**Finding: the ruling lands.** The mean is 0.36 of the old ladder's at the Æra
III door, 0.38 at turn 100 and 0.32 at turn 150 — a third as often, where B4's ×3
on both rungs managed only a half. The count keeps climbing after the door
because renown income does: a seat that had banked 650–980 by turn 100 has banked
three to four times that by turn 150, which is what puts the fifth and sixth
names inside a long game rather than out of reach.
