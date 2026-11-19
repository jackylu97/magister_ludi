/**
 * The 120-turn six-seat standard digest. The duel digest shares a game with the
 * card audit in aiCardStamp.slow.test.ts. Both pins and their history are in
 * aiDigestPins.ts.
 */
import { describe, it } from 'vitest';

import { playSeatedGame, sixSeatSpec } from './aiDigestHelpers';
import { expectSixSeatDigest } from './aiDigestPins';

describe('the six-seat digest', () => {
  it(
    'plays a hundred and twenty turns on the standard board to the state it always reaches',
    () => {
      expectSixSeatDigest('standard', playSeatedGame(sixSeatSpec('standard')));
    },
    900_000,
  );
});
