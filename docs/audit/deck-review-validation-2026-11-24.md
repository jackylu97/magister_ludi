# November deck review validation

## Release

The user approved releasing after the production build, without waiting for the tests. Commit `831c0087` reached `main` and the local playtest server on port 5199. The build passed, and the local server returned HTTP 200.

The user then requested the slow tests and repairs on `decks`. Further changes must not reach `main` or 5199 without the user's approval. The rollback tags are `codex/main-before-review-2026-11-24` and, in the playtest repository, `codex/play-before-review-2026-11-24`.

## Follow-up fixes on decks

- World’s Fair now values the income from existing foreign routes. The previous bot estimate could return zero when the useful route was already active. Deals and domestic routes do not earn this reward.
- Great Person action descriptions retain their family restriction. The Raising of the Land again names engineers.
- Display rounding treats a value one representable step below a half as a tie. This fixes the difference between an Order's displayed contribution and the Council's displayed change. Exact yields and banked amounts do not change. The tolerance stays small enough to preserve quarter points at large values.
- Citizen-focus fixtures now provide a real food/production choice without depending on a generated game's card choices.
- Text and price fixtures now match trade partners counted through routes or deals, half-price charter research, revised beliefs, and retired cards.

## Full test run

The combined core and slow run covered 634 files and 13,311 tests with two workers. It completed in 1,260.73 seconds. There were 13,303 passing tests and eight failures:

- One old trading-partner phrase.
- Four old charter-price expectations.
- Two state hashes recorded before the current card and rule changes.
- One display-rounding discrepancy. The test confirmed that the raw yield calculations agreed before the display assertion failed.

The fixes preserve the original assertions' coverage. The final checks rerun core, the affected slow display test, typecheck, and the production build. The two long games are verified from their saved command logs instead of driving the bots again. The full combined suite is not repeated after these fixture and display-only corrections.

## Recorded bot games

Both games used the existing six-seat digest configuration and reached turn 120 without warnings or stalls. Both saved command logs replayed to exactly the recorded state.

- Duel: 7,487 commands; digest `95725a88:437341`.
- Standard: 8,435 commands; digest `806e8052:1159065`.

The previous pins came from version 266 and the earlier bot valuations. Version 267 changes card pools, research prices, wonder effects, and bot forecasts. The new pins record these intentional changes; they do not waive warnings, stalls, or replay equality.

Set `AI_DIGEST_REPORT_DIR` when running the digest tests to retain their saves and measured results. This diagnostic mode also checks replay equality and keeps the normal pin assertions enabled. It does not rewrite the pins.

## Final checks

All final checks passed:

- Typecheck.
- Core: 584 files, 13,140 tests.
- Affected checks: 5 files, 96 tests, including the unchanged slow comparison across every live Order.
- Both saved 120-turn games replayed under the final code and matched the updated pins.
- Production build.

The full combined run was not repeated after the fixture and display corrections. All eight reported failures were corrected and checked. Detailed logs are in `/private/tmp/webciv-decks-checks-2026-11-24`.
