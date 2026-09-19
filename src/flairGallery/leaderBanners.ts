import leaders from '../../data/leaders.json';
import { BANNER_LEADER_IDS, LEADER_BANNERS, leaderBannerSvg } from '../art/leaderBanners';
import { checkbox, controls, element } from './sheet';
import './leaderBanners.css';

export function drawLeaderBanners(into: HTMLElement): void {
  into.classList.add('leader-banner-review');
  const intro = element('div', 'banner-intro');
  intro.append(element('p', 'banner-eyebrow', '13 LEADERS / TWO INKS / ONE CLEAR SYMBOL'));
  intro.append(element('p', 'banner-lede', 'Standards for a small world.'));
  intro.append(element('p', 'banner-description', 'Original vector drawings based on documented emblems, period objects and the realms represented by the leaders. Game colors and a common banner shape unify the set; these are not reconstructions of historical flags.'));
  into.append(intro);
  const knobs = controls(into), wall = element('div', 'banner-wall');
  let mono = false;
  const redraw = (): void => {
    wall.replaceChildren();
    for (const [index, id] of BANNER_LEADER_IDS.entries()) {
      const leader = leaders.leaders[id], design = LEADER_BANNERS[id];
      const card = element('article', 'banner-card');
      const caption = element('div', 'banner-card-top');
      caption.append(element('span', 'banner-number', String(index + 1).padStart(2, '0')),
        element('span', undefined, leader.people));
      const display = element('div', 'banner-display');
      display.innerHTML = leaderBannerSvg(id, { monochrome: mono });
      const headings = element('div', 'banner-card-title');
      headings.append(element('h3', undefined, leader.name), element('p', undefined, design.motif));
      const sizes = element('div', 'banner-sizes');
      for (const width of [16, 24, 32, 48]) {
        const sample = element('figure'), image = element('div');
        image.innerHTML = leaderBannerSvg(id, { monochrome: mono });
        const svg = image.querySelector('svg')!; svg.style.width = `${width}px`; svg.style.height = 'auto';
        sample.append(image, element('figcaption', undefined, `${width}px`)); sizes.append(sample);
      }
      const details = element('details', 'banner-evidence'), summary = element('summary', undefined, design.basis);
      const note = element('p', undefined, design.note), source = element('a', undefined, design.source.label);
      source.href = design.source.url; source.target = '_blank'; source.rel = 'noreferrer';
      details.append(summary, note, source);
      const files = element('div', 'banner-files');
      for (const [suffix, label] of [['', 'Banner SVG'], ['-mark', 'Symbol SVG']]) {
        const link = element('a', undefined, label); link.href = `/banners/${id}${suffix}.svg`;
        link.download = `${id}${suffix}.svg`; files.append(link);
      }
      card.append(caption, display, headings, sizes, details, files); wall.append(card);
    }
  };
  checkbox(knobs, 'Monochrome check', false, value => { mono = value; redraw(); });
  checkbox(knobs, 'Dark background', false, value => { wall.classList.toggle('banner-wall-dark', value); });
  into.append(element('p', 'banner-review-note', 'Sizes are actual CSS pixels. The 24–32px samples are the main readability target; 16px is a stress test. Flat color only, with no outlines or border trim. Three secondary inks are darkened for contrast without changing the game palette. Downloaded symbols are single-color, transparent SVGs.'));
  into.append(wall); redraw();
}
