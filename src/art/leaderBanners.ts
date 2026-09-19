import leaders from '../../data/leaders.json';
import type { MarkPath } from './resourceMarks';

export type BannerLeaderId = keyof typeof leaders.leaders;
export interface LeaderBannerDesign {
  motif: string;
  basis: 'Attested emblem' | 'Period motif' | 'Biographical motif' | 'Dynastic color';
  note: string;
  source: { label: string; url: string };
  /** Banner-only ink adjustment keeps similar-value leader colors readable without outlines. */
  ink?: string;
  /** Original drawings on a 64-unit square; no text, fonts or raster images. */
  paths: readonly MarkPath[];
}

export const LEADER_BANNERS = {
  pachacuti: {
    motif: 'Sun of Inti', basis: 'Period motif',
    note: 'Inca royal solar symbolism. A new sun drawing, not a reconstruction of Pachacuti’s standard; the modern rainbow flag is not used.',
    source: { label: 'The Met · Inca gold and Inti', url: 'https://www.metmuseum.org/essays/ancient-andean-metalworking' },
    paths: [{ d: 'M20 32a12 12 0 1 0 24 0a12 12 0 1 0 -24 0', fill: true, width: 0 }, { d: 'M28 7H36L35 17H29ZM28 47H36L35 57H29ZM7 28V36L17 35V29ZM47 29V35L57 36V28ZM12 17L17 12L24 20L20 24ZM40 44L44 40L52 47L47 52ZM12 47L20 40L24 44L17 52ZM40 20L47 12L52 17L44 24Z', fill: true, width: 0 }],
  },
  taizong: {
    motif: 'Coiled dragon', basis: 'Period motif',
    note: 'Inspired by Tang dragon mirrors. The curled body is a new reduction of the motif, not an attested imperial flag or later Qing dragon.',
    source: { label: 'Tokyo National Museum · Tang dragon mirror', url: 'https://emuseum.nich.go.jp/detail?content_base_id=100662&content_part_id=000&content_pict_id=0&langId=en&webView=' },
    paths: [{ d: 'M41 10L46 5L48 14L55 19L52 25L43 25L40 20C23 15 13 29 19 41C24 52 40 51 44 40C47 32 38 28 32 33L34 39C27 40 25 34 28 29C34 18 52 25 52 38C52 57 25 64 13 47C1 29 14 9 33 10L36 4L39 11Z', fill: true, width: 0 }, { d: 'M19 24L8 19L6 25L14 31ZM23 47L19 57L25 59L29 50ZM45 46L56 48L58 42L50 39Z', fill: true, width: 0 }],
  },
  modu: {
    motif: 'Xiongnu sun and moon', basis: 'Attested emblem',
    note: 'Gold sun disks and crescent moons decorate excavated Xiongnu elite coffins, including Tomb 64 at Takhiltiin Khotgor. The motif is archaeological; its use here as a banner is a game adaptation, not a verified flag of Modu.',
    source: { label: 'Max Planck Institute · Xiongnu sun and moon finds', url: 'https://www.eurekalert.org/multimedia/980867' },
    paths: [{ d: 'M20 20a12 12 0 1 0 24 0a12 12 0 1 0 -24 0', fill: true, width: 0 }, { d: 'M9 33C10 67 54 67 55 33C44 51 20 51 9 33Z', fill: true, width: 0 }],
  },
  akhenaten: {
    motif: 'Egyptian ankh', basis: 'Attested emblem',
    note: 'The Egyptian sign for life, documented on Eighteenth Dynasty objects. A broad loop and crossbar make a clearer Egyptian silhouette than the earlier tiny Aten hands. This is a cultural emblem, not Akhenaten’s personal flag.',
    source: { label: 'The Met · Eighteenth Dynasty ceremonial ankh', url: 'https://www.metmuseum.org/art/collection/search/544840' },
    paths: [{ d: 'M32 5C12 5 12 24 22 31L27 35H10V43H27V60H37V43H54V35H37L42 31C52 24 52 5 32 5ZM32 13C22 13 22 24 32 30C42 24 42 13 32 13Z', fill: true, width: 0, fillRule: 'evenodd' }],
  },
  almamun: {
    motif: 'Abbasid palmette', basis: 'Period motif',
    note: 'A gold palmette adapted from ninth-century Abbasid stucco ornament at Samarra, on the Abbasid black field. Samarra became the capital just after Al-Ma’mun’s reign. The ornament is a visible cultural identifier, not an attested dynastic badge or personal standard.',
    source: { label: 'The Met · Architectural ornament of Abbasid Samarra', url: 'https://www.metmuseum.org/perspectives/architectural-ornament-of-abbasid-samarra' },
    paths: [{ d: 'M32 5C22 17 23 28 32 38C41 28 42 17 32 5ZM9 14C8 31 17 40 28 41C26 28 19 20 9 14ZM55 14C56 31 47 40 36 41C38 28 45 20 55 14ZM6 35C9 47 20 52 29 48C24 41 16 37 6 35ZM58 35C55 47 44 52 35 48C40 41 48 37 58 35ZM28 43H36V53H45V59H19V53H28Z', fill: true, width: 0 }],
  },
  mithridates: {
    motif: 'Pontic star and crescent', basis: 'Attested emblem',
    note: 'Star above crescent from Mithridates VI’s coinage. The open upward crescent and eight-ray star distinguish it from modern national flag compositions.',
    source: { label: 'Ashmolean · Mithridates VI coin HCR141496', url: 'https://hcr.ashmus.ox.ac.uk/coin/hcr141496' },
    paths: [{ d: 'M32 5L35 14L43 10L39 18L48 21L39 24L43 32L35 28L32 37L29 28L21 32L25 24L16 21L25 18L21 10L29 14Z', fill: true, width: 0 }, { d: 'M9 30C11 64 53 64 55 30C46 49 18 49 9 30Z', fill: true, width: 0 }],
  },
  joan: {
    motif: 'Fleur-de-lis', basis: 'Attested emblem',
    note: 'One gold fleur-de-lis reduces the royal French lilies to a readable emblem. This is a cultural adaptation, not a reconstruction of Joan’s personal battle standard.',
    source: { label: 'Canadian Heraldic Authority · Royal France', url: 'https://www.gg.ca/en/heraldry/public-register/project/1214' },
    paths: [{ d: 'M32 5C23 15 21 23 26 32L29 39H24C24 28 19 19 11 21C1 24 5 37 14 38C10 34 11 29 15 30C20 32 20 38 21 40H43C44 38 44 32 49 30C53 29 54 34 50 38C59 37 63 24 53 21C45 19 40 28 40 39H35L38 32C43 23 41 15 32 5ZM20 42H44V47H20ZM27 49L20 56L28 54L32 61L36 54L44 56L37 49Z', fill: true, width: 0 }],
  },
  mansaMusa: {
    motif: 'Malian royal parasol', basis: 'Period motif',
    note: 'A royal parasol topped with a bird, based on Ibn Battuta’s eyewitness description of the court of Mansa Sulayman, Musa’s later successor. It represents fourteenth-century Malian royal regalia, not a documented flag or a claim that this exact parasol belonged to Musa.',
    source: { label: 'Ibn Battuta · Court ceremonial in Mali', url: 'https://human.libretexts.org/Courses/The_Westminster_Schools/Ibn_Battuta%27s_Travels_in_Africa' },
    paths: [{ d: 'M24 17L18 8L30 12L37 7L42 8L47 13H41C41 19 35 22 27 20L24 23ZM8 38C11 26 23 23 32 23C41 23 53 26 56 38ZM8 42H15V48H8ZM49 42H56V48H49ZM28 42H36V55H44V60H20V55H28Z', fill: true, width: 0 }],
  },
  zhengHeOfMing: {
    motif: 'Ming crane', basis: 'Period motif', ink: '#142e58',
    note: 'A flying crane with a long curved neck, swept feather fan and trailing legs draws on the first-rank civil official’s bird insignia used under the Ming. It represents courtly distinction and cultural prestige; it is not a claim about Zheng He’s own rank badge or an attested Ming naval flag.',
    source: { label: 'Australian Museum · Mandarin rank badges', url: 'https://australian.museum/learn/cultures/international-collection/chinese/mandarin-square/' },
    paths: [
      { d: 'M31 35C17 34 7 22 6 7C13 15 19 21 25 24C17 16 14 10 14 5C22 10 28 16 30 23C26 15 26 9 28 6C36 15 41 25 37 33C43 30 44 25 41 21C37 17 38 11 43 9C47 7 51 9 51 12L61 14L50 16C46 13 42 15 45 19C52 27 47 36 39 40C32 43 26 42 21 39L9 45L15 36L7 36L18 31C21 34 26 36 31 35Z', fill: true, width: 0, fillRule: 'evenodd' },
      { d: 'M29 40L32 42L16 56L8 56L16 52ZM35 40L38 42L24 58L15 59L23 54Z', fill: true, width: 0, fillRule: 'evenodd' }
    ],
  },
  nezahualcoyotl: {
    motif: 'Tlaloc mask', basis: 'Period motif', ink: '#673914',
    note: 'A simplified rain-god mask with ringed eyes, a nose bar, curled upper lip and prominent fangs, based on a Mixtec Tlaloc mask dated 1325–1521. This is a broader Mesoamerican cultural emblem for Texcoco, not a documented standard of Nezahualcoyotl.',
    source: { label: 'The Met · Mixtec rain god mask', url: 'https://www.metmuseum.org/art/collection/search/313255' },
    paths: [
      // The eye rings are filled silhouettes with cutouts, not stroked outlines.
      { d: 'M7 23C7 8 27 6 32 18C37 6 57 8 57 23C57 38 37 40 32 29C27 40 7 38 7 23ZM13.5 23a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0ZM37.5 23a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0Z', fill: true, width: 0, fillRule: 'evenodd' },
      { d: 'M29 28H35L37 34H41V39H23V34H27Z', fill: true, width: 0 },
      { d: 'M15 40H49C57 40 60 49 53 53H46V47H18V53H11C4 49 7 40 15 40ZM20 46H27L25 60H21ZM37 46H44L43 60H39ZM29 46H35V52H29Z', fill: true, width: 0 }
    ],
  },

  hypatiaOfAlexandria: {
    motif: 'Pharos of Alexandria', basis: 'Attested emblem',
    note: 'The Pharos lighthouse appears on Roman Alexandrian coins. Its stepped silhouette represents Alexandria rather than Hypatia’s scholarly work. These coin depictions predate her lifetime; the banner is a simplified civic motif, not her personal standard.',
    source: { label: 'Centre d’Études Alexandrines · Pharos on Roman coins', url: 'https://pharos.cealex.org/ressources-documentaires/iconographie-antique/the-coins/' },
    paths: [{ d: 'M12 59H52V53H47V34H42V20H37V12H35V5H29V12H27V20H22V34H17V53H12ZM29 25V31H35V25ZM28 40V50H36V40Z', fill: true, width: 0, fillRule: 'evenodd' }, { d: 'M7 19L19 22V26L7 29ZM57 19V29L45 26V22Z', fill: true, width: 0 }],
  },
  hildegard: {
    motif: 'Imperial eagle', basis: 'Attested emblem',
    note: 'A single-headed eagle for the Holy Roman Empire in which Hildegard lived. This uses the medieval imperial symbol rather than her book and flame. The later double-headed imperial eagle is deliberately avoided; the green and vellum remain game colors.',
    source: { label: 'German Bundestag · History of the imperial eagle', url: 'https://www.bundestag.de/en/parliament/symbols/eagle' },
    paths: [{ d: 'M28 21V12L22 9L25 5H36L40 11L35 15V23L41 27L52 11L58 8V23L48 32L58 27V34L46 40L54 39V45L40 45L36 49L42 54L49 52V57H39L34 53L38 62H26L30 53L25 57H15V52L22 54L28 49L24 45H10V39L18 40L6 34V27L16 32L6 23V8L12 11L23 27Z', fill: true, width: 0 }],
  },
  ibnBattutaOfTangier: {
    motif: 'Marinid eight-pointed star', basis: 'Period motif', ink: '#073c3a',
    note: 'An eight-pointed geometric star from the decorative vocabulary of Marinid Morocco, rather than the modern five-pointed Moroccan star. Marinid objects document the motif; the frequently reproduced red-and-gold dynastic flag should not be treated as securely attested by those objects.',
    source: { label: 'Bou Inania Madrasa · Marinid minbar and its sources', url: 'https://en.wikipedia.org/wiki/Bou_Inania_Madrasa#Minbar'  },
    paths: [{ d: 'M32 6L40 14H50V24L58 32L50 40V50H40L32 58L24 50H14V40L6 32L14 24V14H24Z', fill: true, width: 0 }],
  },
} satisfies Record<BannerLeaderId, LeaderBannerDesign>;

export const BANNER_LEADER_IDS = Object.keys(LEADER_BANNERS) as BannerLeaderId[];
const escape = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Two flat inks only: no outlines, gradients, or framing trim. */
export function leaderBannerSvg(id: BannerLeaderId, options: { monochrome?: boolean; markOnly?: boolean } = {}): string {
  const design: LeaderBannerDesign = LEADER_BANNERS[id], leader = leaders.leaders[id];
  const field = options.monochrome ? '#f4ecd7' : leader.colors.primary;
  const ink = options.monochrome ? '#243038' : design.ink ?? leader.colors.secondary;
  const mark = `<g fill="${options.markOnly ? 'currentColor' : ink}">${design.paths.map(p => `<path d="${p.d}"${p.fillRule ? ` fill-rule="${p.fillRule}"` : ''}/>`).join('')}</g>`;
  const title = escape(`${leader.name}: ${design.motif}`);
  const desc = escape(`${design.basis}. ${design.note} Colors follow the game palette, with darker banner ink where needed for contrast; not historical flag colors.`);
  const body = options.markOnly ? mark : `<path fill="${field}" d="M3 2H61V65L32 79L3 65Z"/><g transform="translate(0 5)">${mark}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="${options.markOnly ? 64 : 80}" viewBox="0 0 64 ${options.markOnly ? 64 : 80}" role="img"><title>${title}</title><desc>${desc}</desc>${body}</svg>`;
}

/** Unknown leaders keep the seat's legacy charge, including older saves. */
export function isBannerLeaderId(id: string | undefined): id is BannerLeaderId {
  return id !== undefined && Object.prototype.hasOwnProperty.call(LEADER_BANNERS, id);
}

/** Preserve saved/custom seat colors; contrast overrides apply only to the stock pair. */
export function leaderBannerInk(id: string | undefined, primary: string, secondary: string): string {
  if (!isBannerLeaderId(id)) return secondary;
  const def = leaders.leaders[id];
  return primary === def.colors.primary && secondary === def.colors.secondary
    ? (LEADER_BANNERS[id] as LeaderBannerDesign).ink ?? secondary : secondary;
}
