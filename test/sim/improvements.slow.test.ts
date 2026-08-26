/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the chop's
 * protection rule, asked of every row in the resource table.
 *
 * A table sweep, and that is the whole reason it is slow: forty-odd fresh
 * states, one per resource, each founding a city and standing a worker in a
 * wood. Half the placements are impossible on a real map — a wheat field does
 * not grow in a wood — and that is fine, because the rule is about the *table*
 * and asserting it over the whole table is what stops it drifting. A test that
 * checked three hand-picked resources would pass forever while the fourth
 * quietly stopped being protected.
 *
 * `improvements.test.ts` keeps everything else the concern has, which is nearly
 * all of it: the improvement table, the worker's charges, `buildImprovement`'s
 * constraint shape and technology gate, the chop table and the chop's gate and
 * effect, pillage, the yield explanation, the growth renewals, and the log.
 */
import { describe, expect, it } from 'vitest';

import { chopError } from '../../src/sim/improvements';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { woodedWorker } from './improvementHelpers';

describe('chopFeature', () => {
  describe('the protection rule', () => {
    it('protects exactly the resources whose ground required the feature', () => {
      // Read off `validFeatures` in `resources.json` rather than from a list
      // kept here, which is the whole claim: the question is "would the chop
      // leave this resource somewhere it could never have been generated". Half
      // of these placements are impossible on a real map — a wheat field does
      // not grow in a wood — and that is fine: the rule is about the *table*,
      // and asserting it over the whole table is what stops it drifting.
      for (const id of RESOURCE_IDS) {
        const { state, worker, tile } = woodedWorker();
        tile.resource = id;
        const bound = resourceDef(id).validFeatures?.includes('none') === false;
        const refused = chopError(state, worker.id) !== null;
        expect(`${id}: ${refused ? 'refused' : 'allowed'}`).toBe(
          `${id}: ${bound ? 'refused' : 'allowed'}`,
        );
      }
    });

  });
});
