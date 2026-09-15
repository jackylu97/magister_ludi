// A focused cabinet route avoids loading all the other WebGL stalls for one review.
import '../style.css';
import './style.css';
import { element, section } from './sheet';

const review = new URLSearchParams(location.search).get('review');
if (review === 'diplomacy-game') {
  void import('./diplomacyGameReview').then(module => module.drawDiplomacyGameReview(document.getElementById('sheet')!));
} else if (review === 'diplomacy') {
  document.body.classList.add('diplomacy-prototype');
  document.getElementById('index')!.hidden = true;
  void import('./diplomacyReview').then(module => module.drawDiplomacyReview(document.getElementById('sheet')!));
} else if (review === 'movement') {
  document.body.classList.add('focused-works-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'Movement study'));
  const back = element('a', undefined, 'Full art cabinet'); back.href = '/flair.html'; nav.append(back);
  const root = section(document.getElementById('sheet')!, 'movement', 'A lighter touch',
    'Three quieter movement treatments over the same ruins, village and barbarian camp. Preview only.').root;
  void import('./movementReview').then(module => module.drawMovementReview(root));
} else if (review === 'world') {
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
  if (new URLSearchParams(location.search).get('work') === 'terraces' && new URLSearchParams(location.search).has('mockup')) {
    root.querySelector('h2')!.textContent = 'Pachacuti · Terrace farm';
    root.querySelector('.sheet-where')!.textContent = 'A cultivated hillside, using the approved painted lighting and terrain.';
    void import('./terraceFarm').then(module => module.drawTerraceFarm(root));
  } else void import('./paintedWorks').then(module => module.drawPaintedWorks(root));
} else {
  void import('./main');
}
