/**
 * **The draft's toast and its door** (Scientific batch S10, the approved
 * prototype `docs/plans/mockups/charter-ux.html` step 2).
 *
 * Drafting a technology charter changes no research. It stamps the card, and
 * one toast says the technology is open for research; a click on the toast
 * opens the star chart centred on the node, with a ring around it. This file
 * checks the watcher that decides when the toast speaks, its words, the new
 * notification kind (`openTech`) and the wiring from the toast to the chart.
 */

import { describe, expect, it } from 'vitest';

import { playerById } from '../../src/sim/state';
import {
  type NotificationAction,
  charterOpenedText,
  createCharterWatcher,
} from '../../src/ui/notifications';
import { researchingGame } from '../sim/techHelpers';
import { braceBody, uiSource } from './sourceHelpers';

describe('the charter watcher', () => {
  it('says nothing about charters a seat held when it sat down', () => {
    const g = researchingGame();
    playerById(g.state, 0)!.charteredTechs.push('casting');
    const watcher = createCharterWatcher();
    watcher.baseline(g.state, 0);
    expect(watcher.poll(g.state, 0)).toEqual([]);
  });

  it('announces a newly drafted charter technology once', () => {
    const g = researchingGame();
    const watcher = createCharterWatcher();
    watcher.baseline(g.state, 0);
    playerById(g.state, 0)!.charteredTechs.push('mechanics');
    expect(watcher.poll(g.state, 0)).toEqual(['mechanics']);
    expect(watcher.poll(g.state, 0)).toEqual([]);
  });

  it('reads only the seat it is asked about', () => {
    const g = researchingGame();
    const watcher = createCharterWatcher();
    watcher.baseline(g.state, 0);
    watcher.baseline(g.state, 1);
    playerById(g.state, 1)!.charteredTechs.push('optics');
    expect(watcher.poll(g.state, 0)).toEqual([]);
    expect(watcher.poll(g.state, 1)).toEqual(['optics']);
  });

  it('treats a seat it was never told about as its baseline, and forgets every seat on reset', () => {
    const g = researchingGame();
    const watcher = createCharterWatcher();
    playerById(g.state, 0)!.charteredTechs.push('casting');
    expect(watcher.poll(g.state, 0)).toEqual([]);
    playerById(g.state, 0)!.charteredTechs.push('mechanics');
    expect(watcher.poll(g.state, 0)).toEqual(['mechanics']);
    watcher.reset();
    expect(watcher.poll(g.state, 0)).toEqual([]);
  });

  it('announces two at once in the rows’ order, whatever order they were drafted in', () => {
    const g = researchingGame();
    const watcher = createCharterWatcher();
    watcher.baseline(g.state, 0);
    playerById(g.state, 0)!.charteredTechs.push('mechanics', 'casting');
    expect(watcher.poll(g.state, 0)).toEqual(['casting', 'mechanics']);
  });
});

describe('the toast', () => {
  it('says the technology is open, and who may research it, in plain words', () => {
    expect(charterOpenedText('mechanics')).toBe(
      'Mechanics is open for research. Only an empire with this charter may research it.',
    );
  });

  it('carries an openTech action naming the technology', () => {
    const action: NotificationAction = { kind: 'openTech', tech: 'mechanics' };
    expect(action.tech).toBe('mechanics');
    const controls = uiSource('controls.ts');
    expect(controls).toContain("entry.action = { kind: 'openTech', tech: opts.openTech };");
    expect(braceBody(controls, 'function reportCharters(')).toContain(
      'announce(charterOpenedText(tech), { openTech: tech });',
    );
  });

  it('is polled where the draft is reported, and baselined with the sightings', () => {
    const controls = uiSource('controls.ts');
    // `main.ts` sends `chooseOrder` itself and reports it through
    // `reportCommand`, so that is where the toast can hear the draft.
    expect(braceBody(controls, 'function reportCommand(')).toContain('reportCharters();');
    expect(braceBody(controls, 'function baselineSightings(')).toContain(
      'charterNews.baseline(getGame().state, localPlayerId);',
    );
    expect(controls).toContain('charterNews.reset();');
  });

  it('opens the star chart on the node when clicked', () => {
    const main = uiSource('main.ts');
    const run = braceBody(main, 'function runAction(');
    expect(run).toContain("case 'openTech':");
    expect(run).toContain('techTree?.openAt(action.tech);');
    // The chart centres on the node and rings it.
    const tree = uiSource('techTree.ts');
    const open = tree.slice(tree.indexOf('openAt(tech: TechId): void {'));
    expect(open.slice(0, 500)).toContain('centreOn(card);');
    expect(open.slice(0, 500)).toContain('ringNode(card);');
    expect(uiSource('style.css')).toContain('.tech-node.is-ringed {');
  });
});
