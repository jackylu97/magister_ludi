// A focused cabinet route avoids loading all the other WebGL stalls for one review.
import '../style.css';
import './style.css';
import { element, section } from './sheet';

const review = new URLSearchParams(location.search).get('review');
if (review === 'scene') {
  // The visual test scene (batch V1): full-window, one fixed world, every
  // control in the URL. See `testScene.ts`.
  document.getElementById('index')!.hidden = true;
  void import('./testScene').then(module => module.drawTestScene(document.getElementById('sheet')!));
} else if (review === 'banners') {
  document.body.classList.add('focused-works-review', 'focused-banners-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'Leader banners'));
  const back = element('a', undefined, 'Full art cabinet'); back.href = '/flair.html'; nav.append(back);
  const root = section(document.getElementById('sheet')!, 'leader-banners', 'Leader banners',
    'Historical references, simplified for the map.').root;
  void import('./leaderBanners').then(module => module.drawLeaderBanners(root));
} else if (review === 'order-face') {
  // The Order card's emblem face alone (batch SS10), with no WebGL stall
  // loaded beside it: the page a capture script opens.
  document.body.classList.add('focused-works-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'Order card face'));
  const cabinet = element('a', undefined, 'Full art cabinet'); cabinet.href = '/flair.html#order-face'; nav.append(cabinet);
  const root = section(document.getElementById('sheet')!, 'order-face', 'Order Card Face',
    'The emblem face for Orders and Doctrines, built from real rows.').root;
  void Promise.all([import('../ui/keywordCards'), import('./orderFaces')]).then(([cards, module]) => {
    cards.mountKeywordCards();
    module.drawOrderFaces(root);
  });
} else if (review === 'abacus') {
  // The 3D Abacus (look B, 2026-11-19): the real stage, alone, because it needs
  // a WebGL context of its own.
  document.body.classList.add('focused-works-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'The Abacus'));
  const cabinet = element('a', undefined, 'Full art cabinet'); cabinet.href = '/flair.html#abacus'; nav.append(cabinet);
  const root = section(document.getElementById('sheet')!, 'abacus', 'The Abacus',
    'The score frame of the bead page, the Abacus screen and the Opus close, drawn by the game renderer.').root;
  void import('./abacus').then(module => module.drawAbacus(root));
} else if (review === 'elephants') {
  document.body.classList.add('focused-works-review');
  const nav = document.getElementById('index')!;
  nav.append(element('h1', undefined, 'Elephant pieces'));
  const root = section(document.getElementById('sheet')!, 'elephants', 'Elephant comparison',
    'The accepted war elephant and its siege variant.').root;
  void import('./elephants').then(module => module.drawElephants(root));
} else if (review === 'diplomacy-game') {
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
} else if (review === 'northstar') {
  document.body.classList.add('focused-works-review');
  const nav = document.getElementById('index')!;
  const pillaged = new URLSearchParams(location.search).get('rows') === 'pillaged';
  nav.append(element('h1', undefined, pillaged ? 'Pillaged improvements' : 'North-star models'));
  const cabinet = element('a', undefined, 'Full art cabinet'); cabinet.href = '/flair.html#north-star-kit'; nav.append(cabinet);
  const root = section(document.getElementById('sheet')!, 'north-star-kit', pillaged ? 'Model comparison' : 'Houses, hall, works and monuments',
    pillaged ? 'Choose an improvement to compare the two models.' : 'The models of the visual test, each by itself under a soft light.').root;
  void import('./northStarKit').then(module => module.drawNorthStarKit(root));
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
