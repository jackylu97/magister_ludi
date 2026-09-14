// A focused cabinet route avoids loading all the other WebGL stalls for one review.
import '../style.css';
import './style.css';
import { element, section } from './sheet';

const review = new URLSearchParams(location.search).get('review');
if (review === 'world') {
  document.body.classList.add('focused-works-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'Painted world'));
  const cabinet = element('a', undefined, 'Full art cabinet'); cabinet.href = '/flair.html#painted-world'; nav.append(cabinet);
  const root = section(document.getElementById('sheet')!, 'painted-world', 'Roads, discoveries & borders',
    'The approved study art, connected to the main game.').root;
  void import('./paintedWorld').then(module => module.drawPaintedWorld(root));
} else if (review === 'units') {
  document.body.classList.add('focused-works-review', 'focused-units-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'Painted units'));
  const cabinet = element('a', undefined, 'Full art cabinet'); cabinet.href = '/flair.html#painted-units'; nav.append(cabinet);
  const root = section(document.getElementById('sheet')!, 'painted-units', 'Pieces on the board',
    'Accepted representatives and equipment variants across infantry, anti-cavalry, ranged, mounted, siege, naval, religious and caravan lines, with the terrain and lighting used by the game.').root;
  void import('./paintedUnits').then(module => module.drawPaintedUnits(root));
} else if (review === 'works') {
  document.body.classList.add('focused-works-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'Painted improvements'));
  const cabinet = element('a', undefined, 'Full art cabinet'); cabinet.href = '/flair.html#painted-works'; nav.append(cabinet);
  const root = section(document.getElementById('sheet')!, 'painted-works', 'Works & monuments',
    'A small piece of the world, drawn by the game renderer.').root;
  void import('./paintedWorks').then(module => module.drawPaintedWorks(root));
} else {
  void import('./main');
}
