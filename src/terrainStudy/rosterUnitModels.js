import * as T from 'three';

function equipmentKit(scene) {
  const materials = {};
  scene.traverse(part => {
    if (part.material) materials[part.material.name] = part.material;
  });
  const enamel = materials['Owner enamel'];
  const ivory = materials['Warm ivory'];
  const gold = materials['Antique gold'];
  const trim = materials['Trim gilt'] ?? gold;
  const dark = materials['Incised detail'] ?? new T.MeshStandardMaterial({ name: 'Incised detail', color: 0x303d42 });

  function mesh(name, geometry, material, position) {
    const part = new T.Mesh(geometry, material);
    part.name = name;
    part.position.fromArray(position);
    scene.add(part);
    return part;
  }
  function box(name, position, size, material) {
    return mesh(name, new T.BoxGeometry(...size), material, position);
  }
  function rod(name, a, b, radius, material, top = radius, sides = 8) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const axis = end.clone().sub(start);
    const midpoint = start.add(end).multiplyScalar(.5);
    const part = mesh(name, new T.CylinderGeometry(top, radius, axis.length(), sides), material, midpoint.toArray());
    part.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis.normalize());
    return part;
  }
  function panel(name, position, outline, depth, material) {
    const shape = new T.Shape(outline.map(point => new T.Vector2(...point)));
    return mesh(name, new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material, position);
  }
  function shield(x, y, radius) {
    rod('Round shield rim', [x, y, .20], [x, y, .26], radius, gold, radius, 18);
    rod('Round enamel shield', [x, y, .25], [x, y, .28], radius * .9, enamel, radius * .86, 18);
    rod('Raised boss', [x, y, .28], [x, y, .335], radius * .29, ivory, radius * .14, 12);
  }
  function spear(x, dx, top) {
    rod('Javelin shaft', [x, .31, .065], [x + dx, top - .13, .065], .018, gold);
    panel('Leaf point', [x + dx, top - .15, .053], [[-.012, 0], [-.04, .058], [0, .18], [.04, .058], [.012, 0]], .026, ivory);
  }
  function remove(pattern) {
    const parts = scene.children.filter(part => pattern.test(part.name));
    scene.remove(...parts);
  }
  return { scene, remove, box, rod, panel, shield, spear, enamel, ivory, gold, trim, dark };
}

function hypaspist({ scene, remove, panel, shield, gold, trim }) {
  remove(/buckler/);
  shield(-.25, .80, .225);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const loop = new T.TorusGeometry(.043, .008, 4, 12);
    const emblem = new T.Mesh(loop, gold);
    emblem.name = 'Embossed shield roundel';
    emblem.position.set(-.25 + .137 * Math.cos(angle), .80 + .137 * Math.sin(angle), .279);
    scene.add(emblem);
  }
  panel('Swept helmet crest', [-.025, 1.25, .08], [[-.10, 0], [-.15, .12], [-.11, .19], [.10, .17], [.16, .095], [.13, .055], [.06, .105]], .052, trim).rotation.y = -.40;
}

function janissary({ remove, box, rod, panel, enamel, ivory, gold, trim, dark }) {
  remove(/^Swordsman/);
  rod('Ivory felt cap', [0, 1.13, 0], [0, 1.48, -.04], .145, ivory, .110, 12);
  box('Folded cap tail', [0, 1.243, -.149], [.18, .40, .052], ivory).rotation.x = .14;
  panel('Empty gilt plume holder', [0, 1.16, .138], [[-.022, 0], [.022, 0], [.046, .254], [0, .296], [-.046, .254]], .028, gold);
  rod('Broad sash', [0, .586, 0], [0, .673, 0], .165, trim, .153, 16);
  rod('Cap band', [0, 1.13, 0], [0, 1.19, 0], .151, enamel, .15, 12);
  panel('Matchlock butt', [.32, .37, .10], [[-.057, 0], [.037, .018], [.035, .33], [.014, .43], [-.036, .43], [-.023, .21]], .067, enamel);
  rod('Upright matchlock barrel', [.32, .72, .13], [.32, 1.48, .13], .031, dark);
  for (const y of [.81, .99, 1.435]) {
    rod('Gilt barrel band', [.32, y, .13], [.32, y + .036, .13], .037, gold);
  }
}

function condottiere({ remove, box, rod, panel, enamel, ivory, dark }) {
  remove(/^Longswordsman/);
  rod('Barbute deep ivory skull', [0, 1.01, 0], [0, 1.30, 0], .158, ivory, .149, 12);
  rod('Barbute domed crown', [0, 1.30, 0], [0, 1.39, -.018], .149, ivory, .033, 12);
  panel('Barbute T opening', [0, 1.027, .152], [[-.018, 0], [.018, 0], [.024, .109], [.112, .122], [.110, .15], [-.110, .15], [-.112, .122], [-.024, .109]], .013, dark);
  box('Barbute crown ridge', [0, 1.356, -.025], [.021, .077, .203], ivory).rotation.x = .07;
  const axe = [[-.17, .20], [-.09, .195], [-.026, .153], [0, .31], [.042, .15], [.18, .21], [.139, .10], [.07, .054], [.025, .064], [.012, 0], [-.03, .005], [-.032, .079], [-.12, .067]];
  rod('Poleaxe haft', [.27, .30, .09], [.455, 1.30, .09], .023, enamel);
  panel('Broad poleaxe head', [.442, 1.23, .058], axe, .058, ivory).rotation.z = -.18;
}

function qinCrossbowman({ scene, remove, box, rod, enamel, ivory, gold, trim, dark }) {
  remove(/helmet|brow|cheek|knob|nasal|^Crossbow /i);
  const bow = new T.Group();
  bow.name = 'Qin crossbow';
  scene.add(bow);
  bow.position.set(.24, .91, .25);
  bow.rotation.z = -.32;
  bow.add(box('Ivory crossbow stock', [0, 0, 0], [.06, .54, .065], ivory));
  for (const side of [-1, 1]) {
    bow.add(rod('Crossbow inner limb', [0, .13, .035], [side * .17, .12, .035], .031, enamel));
    bow.add(rod('Crossbow recurved tip', [side * .17, .12, .035], [side * .30, .025, .035], .023, gold));
    bow.add(rod('Crossbow cord', [side * .30, .025, .035], [0, -.12, .035], .008, dark));
  }
  bow.add(rod('Bolt in groove', [0, -.13, .068], [0, .31, .068], .013, gold));
  rod('Wrapped hair', [0, 1.13, 0], [0, 1.29, 0], .14, dark, .10);
  rod('Bound topknot', [.035, 1.26, -.025], [.055, 1.385, -.04], .06, dark, .074);
  rod('Topknot tie', [.039, 1.29, -.029], [.043, 1.32, -.033], .065, trim);
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col++) {
      const x = col * .091;
      box('Overlapping armour plates', [x, .68 + row * .068, .17 + row * .011 - Math.abs(x) * .20], [.086, .061, .041], row === 0 ? trim : ivory);
    }
  }
  for (const side of [-1, 1]) {
    box('Shoulder armour', [side * .158, .87, .019], [.098, .139, .19], ivory).rotation.z = side * .24;
  }
}

function sparabara({ remove, box, panel, ivory, gold }) {
  remove(/Spear wall.*(shield|boss)|helmet spike/i);
  const shape = [[-.19, -.335], [.19, -.335], [.19, .308], [.18, .326], [-.18, .326], [-.19, .308]];
  panel('Tall wicker shield', [-.24, .83, .18], shape, .056, gold);
  for (let i = -2; i <= 2; i++) {
    box('Willow ribs', [-.24 + i * .064, .815, .245], [.025, .53, .021], ivory);
  }
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      if ((row + col) % 2 === 0) {
        const position = [-.24 + (col - 2) * .066, .572 + row * .099, .264];
        box('Alternating hide and wood', position, [.060, .083, .016], gold);
      }
    }
  }
}

function numidianCavalry({ remove, rod, shield, spear, gold }) {
  remove(/Cavalry.*(sword|crossguard)/i);
  shield(-.239, .755, .182);
  spear(.29, -.062, 1.43);
  spear(.29, .089, 1.56);
  rod('Loose neck cord', [-.13, .70, .217], [0, .63, .25], .017, gold);
  rod('Loose neck cord', [0, .63, .25], [.13, .70, .217], .017, gold);
}

function companyGuard({ remove, box, rod, enamel, ivory, dark }) {
  remove(/Swordsman.*(helmet|cheek|brow|nasal|buckler|crest)/);
  rod('Dark wrapped turban', [0, 1.128, 0], [0, 1.37, .01], .159, dark, .117, 12);
  const fold = rod('Diagonal turban fold', [-.013, 1.19, 0], [.004, 1.25, .003], .162, enamel, .154, 12);
  fold.rotation.z = .14;
  rod('Tunic collar', [0, .946, 0], [0, 1.00, 0], .100, enamel, .098, 12);
  box('Ivory crossbelt', [0, .737, .176], [.060, .415, .045], ivory).rotation.z = -.57;
  box('Cartridge box', [-.105, .617, .18], [.16, .103, .067], dark);
}

function hwacha({ scene, remove, box, rod, enamel, ivory, gold }) {
  remove(/^Catapult |^Trim (upright|stop|arm)/);
  remove(/catapult.*(wheel|tyre|spoke|hub|axle)/i);
  rod('Cart axle', [-.34, .435, 0], [.34, .435, 0], .034, gold);
  for (const side of [-1, 1]) {
    const x = side * .286;
    const wheel = new T.Mesh(new T.TorusGeometry(.192, .028, 6, 16), enamel);
    wheel.name = 'Cart wheel rim';
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, .435, 0);
    scene.add(wheel);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      rod('Cart wheel spoke', [x, .435, 0], [x, .435 + .183 * Math.sin(angle), .183 * Math.cos(angle)], .014, ivory);
    }
    rod('Cart handle', [side * .19, .404, -.15], [side * .21, .64, -.50], .029, gold);
  }
  for (const x of [-.16, .16]) {
    rod('Rack post', [x, .39, 0], [x, .77, 0], .045, ivory);
  }
  const rack = new T.Group();
  rack.name = 'Tilted rocket rack';
  scene.add(rack);
  rack.position.set(0, .83, .04);
  rack.rotation.x = -.38;
  rack.add(box('Enamel rack back', [0, 0, -.11], [.61, .47, .16], enamel));
  for (const x of [-.31, .31]) {
    rack.add(box('Rack side rails', [x, 0, 0], [.046, .52, .25], ivory));
  }
  for (const y of [-.245, .245]) {
    rack.add(box('Rack cross rails', [0, y, 0], [.63, .044, .25], gold));
  }
  for (let col = -2; col <= 2; col++) {
    for (let row = -1; row <= 1; row++) {
      const x = col * .105, y = row * .125;
      rack.add(rod('Rocket shaft', [x, y, -.22], [x, y, .20], .026, gold));
      rack.add(rod('Ivory rocket tip', [x, y, .17], [x, y, .29], .044, ivory, 0, 5));
    }
  }
}

// These bases include the proportions and decoration shown in the approved board review.
// Add the new equipment after the base model has set its tool scale and badge height.
export const rosterUnitModels = {
  hypaspist: { base: 'swordsman', tier: 1, equip: hypaspist },
  janissary: { base: 'swordsman', tier: 2, equip: janissary },
  condottiere: { base: 'longswordsman', tier: 2, equip: condottiere },
  qinCrossbowman: { base: 'crossbowman', tier: 1, equip: qinCrossbowman },
  sparabara: { base: 'spearWall', tier: 1, equip: sparabara },
  hwacha: { base: 'catapult', tier: 2, equip: hwacha },
  numidianCavalry: { base: 'horseman', tier: 1, equip: numidianCavalry },
  companyGuard: { base: 'swordsman', tier: 2, equip: companyGuard },
  ballistaElephant: { base: 'siegeElephant', tier: 2 },
};

export function equipRosterUnit(scene, type, equip) {
  equip(equipmentKit(scene));
  scene.name = type;
}
