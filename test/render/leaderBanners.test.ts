import { heraldryFor, heraldryMark } from '../../src/art/heraldryMarks';
import { describe, expect, it } from 'vitest';
import leaders from '../../data/leaders.json';
import { BANNER_LEADER_IDS, LEADER_BANNERS, leaderBannerSvg, leaderBannerInk } from '../../src/art/leaderBanners';

const files = import.meta.glob('/public/banners/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('leader banner exports', () => {
  it('covers the current leader roster exactly once', () => {
    expect([...BANNER_LEADER_IDS].sort()).toEqual(Object.keys(leaders.leaders).sort());
    expect(Object.keys(files)).toHaveLength(BANNER_LEADER_IDS.length * 2);
  });

  it.each(BANNER_LEADER_IDS)('%s exports match the reviewed art and current palette', id => {
    expect(files[`/public/banners/${id}.svg`]).toBe(`${leaderBannerSvg(id)}\n`);
    expect(files[`/public/banners/${id}-mark.svg`]).toBe(`${leaderBannerSvg(id, { markOnly: true })}\n`);
    expect(LEADER_BANNERS[id].source.url).toMatch(/^https:\/\//);
    for (const options of [{}, { markOnly: true }, { monochrome: true }]) {
      const svg = leaderBannerSvg(id, options);
      expect(svg).not.toMatch(/<(?:script|image|foreignObject|text)\b|\b(?:href|filter|stroke|stroke-width)=|NaN/);
      expect(svg).toContain('<title>'); expect(svg).toContain('<desc>');
    }
  });
});


describe('in-game leader emblems', () => {
  it.each(BANNER_LEADER_IDS)('%s uses its reviewed paths in the board atlas', id => {
    expect(heraldryFor(0, undefined, id)).toBe(id);
    expect(heraldryMark(id).paths).toEqual(LEADER_BANNERS[id].paths);
  });

  it('keeps leaderless, unknown-leader and older save charges', () => {
    expect(heraldryFor(0, 'hound')).toBe('hound');
    expect(heraldryFor(0, 'hound', 'unknown')).toBe('hound');
    expect(heraldryFor(0, undefined, 'unknown')).toBe('crescent');
  });

  it('preserves custom saved colors while improving stock banner contrast', () => {
    const colors = leaders.leaders.zhengHeOfMing.colors;
    expect(leaderBannerInk('zhengHeOfMing', colors.primary, colors.secondary)).toBe('#142e58');
    expect(leaderBannerInk('zhengHeOfMing', '#123456', '#abcdef')).toBe('#abcdef');
  });

  it('gives Zheng He Commerce and Magisterial without changing his uniques', () => {
    const ming = leaders.leaders.zhengHeOfMing;
    expect(ming.decks).toEqual(['commerce', 'magisterial']);
    expect(ming.unit).toBe('treasureShip');
    expect(ming.building).toBe('longjiangDockyard');
  });
});
