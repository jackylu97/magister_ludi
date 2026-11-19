/**
 * **The In play screen's forms** (stage 3 of the Council and In play board,
 * `docs/plans/mockups/scholars-study/council-and-in-play/`): the marks, a
 * wonder's plate, a belief's tablet, a legacy's medal, a temporary tag, the
 * tucked edge in every ink, the "more" edge, an arrival's glow, and one stack
 * laid out as the screen lays it. Drawn by the functions the screen draws with
 * (`src/ui/inPlayForms.ts`), on the screen's dark cloth, with sample figures.
 *
 * A wonder's picture window shows the engraved stand-in, the one answer
 * `wonderPicture` gives today; when a wonder has a painted picture, the same
 * window shows it.
 */
import '../ui/inPlayScreen.css';

import { IN_PLAY_MARK_IDS, IN_PLAY_MARKS, inPlayMarkDataUri } from '../art/inPlayMarks';
import { BUILDING_IDS, isWonder } from '../sim/buildingData';
import { GREAT_PERSON_IDS, greatPersonDef } from '../sim/greatPeopleData';
import { MALICE_IDS, maliceDef } from '../sim/maliceData';
import { BELIEF_IDS, RITE_IDS, beliefDef, riteDef } from '../sim/religionData';
import { buildingDef } from '../sim/buildingData';
import { ORDER_IDS, orderDef, orderIsDealt } from '../sim/statecraftData';
import type { InPlayEntry, InPlayForm, InPlayStackId } from '../ui/inPlayPieces';
import {
  beliefTabletNode,
  edgeNode,
  legacyMedalNode,
  maliceCardNode,
  moreEdgeNode,
  temporaryTagNode,
  wonderPlateNode,
} from '../ui/inPlayForms';
import type { PlateFigure } from '../ui/orderFace';
import { block, element, markCell, markGrid } from './sheet';

/** A sample piece: the fields the forms read, and nothing that leads anywhere. */
function sample(form: InPlayForm, stack: InPlayStackId, name: string, card: string | null, extra: Partial<InPlayEntry> = {}): InPlayEntry {
  return {
    key: `sample:${form}:${name}`,
    stack,
    form,
    name,
    sub: null,
    card,
    piece: null,
    subject: null,
    link: null,
    ...extra,
  } as InPlayEntry;
}

/** A dark plate the forms stand on, as the screen's cloth. */
function cloth(into: HTMLElement): HTMLElement {
  const node = element('div', 'ip-gallery-cloth');
  into.append(node);
  return node;
}

/** One form with its caption. */
function figure(into: HTMLElement, form: HTMLElement, caption: string): void {
  const cell = element('figure', 'ip-gallery-figure');
  cell.append(form, element('figcaption', undefined, caption));
  into.append(cell);
}

const PAYS: PlateFigure[] = [
  { voice: 'food', amount: 14 },
  { voice: 'science', amount: 7 },
];
const METERS: PlateFigure[] = [
  { voice: 'culture', amount: 3 },
  { voice: 'happiness', amount: 1 },
];
const COST: PlateFigure[] = [
  { voice: 'science', amount: -10 },
  { voice: 'happiness', amount: -6 },
];

export function drawInPlayForms(into: HTMLElement): void {
  // The marks.
  const grid = markGrid(
    block(
      into,
      'The marks — src/art/inPlayMarks.ts',
      'The seal on each tucked edge, the device in each form, the line of hills in a wonder’s window, and the door on the corner panel. Each is masked to the ink of its piece.',
    ),
  );
  for (const id of IN_PLAY_MARK_IDS) markCell(grid, id, inPlayMarkDataUri(id), IN_PLAY_MARKS[id].note);

  const wonder = BUILDING_IDS.find((id) => isWonder(id))!;
  const belief = BELIEF_IDS[0]!;
  const person = GREAT_PERSON_IDS[0]!;
  const rite = RITE_IDS[0]!;
  const malice = MALICE_IDS[0]!;
  const order = ORDER_IDS.find((id) => orderIsDealt(id))!;

  // The top forms.
  const tops = cloth(
    block(
      into,
      'The top forms — src/ui/inPlayForms.ts',
      'The piece on top of each stack, in its own form, 206 px wide: a wonder’s plate with its picture window (the engraved stand-in until each wonder has a picture), a belief’s tablet, a legacy’s medal and a temporary tag with the turn it ends on. The figures are samples; happiness and authority are in the ink of the text.',
    ),
  );
  figure(tops, wonderPlateNode(sample('wonder', 'wonders', buildingDef(wonder).name, wonder, { sub: 'with Cusco' }), PAYS), 'a wonder’s plate');
  figure(tops, beliefTabletNode(sample('belief', 'beliefs', beliefDef(belief).name, belief, { sub: 'pantheon' }), METERS), 'a belief’s tablet');
  figure(tops, beliefTabletNode(sample('holyCity', 'beliefs', 'Holy city: Cusco', null, { sub: 'the Way of the Grain' }), [{ voice: 'faith', amount: 5 }]), 'the holy city’s share');
  figure(tops, legacyMedalNode(sample('legacy', 'legacies', greatPersonDef(person).name, person, { sub: 'legacy' }), [{ voice: 'science', amount: 21 }]), 'a legacy’s medal');
  figure(tops, legacyMedalNode(sample('bead', 'legacies', 'The Great Games', null, { sub: 'bead' }), [{ voice: 'happiness', amount: 5 }]), 'a bead’s cap, on a medal');
  figure(tops, temporaryTagNode(sample('timed', 'temporary', riteDef(rite).name, rite, { sub: 'Quito', endsTurn: 81 }), [{ voice: 'food', amount: 21 }]), 'a temporary tag');

  // The full forms, as the tray and the hover show them.
  const full = cloth(
    block(into, 'With their text', 'The same forms with the piece’s own sentences, as the tray and the hover show them. A malice wears its own card in the council’s tray.'),
  );
  figure(full, wonderPlateNode(sample('wonder', 'wonders', buildingDef(wonder).name, wonder, { sub: 'with Cusco' }), PAYS, { text: true }), 'a wonder, in the tray');
  figure(full, beliefTabletNode(sample('belief', 'beliefs', beliefDef(belief).name, belief, { sub: 'pantheon' }), METERS, { text: true }), 'a belief, in the tray');
  figure(full, maliceCardNode(sample('malice', 'council', maliceDef(malice).name, malice), COST), 'a malice, in the tray');

  // The edges.
  const edges = cloth(
    block(
      into,
      'The tucked edge, in every ink',
      'Every piece under a stack’s top is one edge of 206 by 46 px: a seal, the name, and the figure for each turn (the user: “each card the same size”). A rule shows its name and no figure. A council edge counts its chair; a temporary edge carries its last turn; a stack of more than eight edges ends in the “more” edge.',
    ),
  );
  const column = element('div', 'ip-pile');
  edges.append(column);
  column.append(edgeNode(sample('order', 'council', orderDef(order).name, order, { chair: 1 }), PAYS, { first: true }));
  column.append(edgeNode(sample('malice', 'council', maliceDef(malice).name, malice, { chair: 2, sub: 'malice' }), COST));
  column.append(edgeNode(sample('chair', 'council', 'an empty chair', null, { chair: 3 }), []));
  column.append(edgeNode(sample('wonder', 'wonders', buildingDef(wonder).name, wonder, { sub: 'with Cusco' }), [{ voice: 'production', amount: 11 }, { voice: 'authority', amount: 2 }]));
  column.append(edgeNode(sample('belief', 'beliefs', beliefDef(belief).name, belief, { sub: 'pantheon' }), []));
  column.append(edgeNode(sample('legacy', 'legacies', greatPersonDef(person).name, person, { sub: 'legacy' }), [{ voice: 'gold', amount: 120 }, { voice: 'happiness', amount: 24 }]));
  column.append(edgeNode(sample('timed', 'temporary', riteDef(rite).name, rite, { sub: 'Quito', endsTurn: 108 }), undefined));
  column.append(moreEdgeNode(4));
  const fresh = element('div', 'ip-pile');
  fresh.append(edgeNode(sample('wonder', 'wonders', buildingDef(wonder).name, wonder, { sub: 'with Quito' }), PAYS, { first: true, fresh: true }));
  figure(edges, fresh, 'an arrival, on top with its glow (frame A3)');
}
