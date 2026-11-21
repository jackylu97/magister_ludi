#!/usr/bin/env python3
"""Turn full-size splash art into the files the game loads.

Reads   art-masters/<kind>/<any name>.png        (git ignores art-masters/)
Writes  public/art/splash/<kind>/<row id>.jpg

Kinds:
  wonders   16:9, at most 1600 px wide
  people    5:6,  at most 720 px wide (great people's portraits)
  ages      16:9, at most 1600 px wide (three sets of four: form, still, abstract)
  endings   16:9, at most 1600 px wide (win and loss)
  beliefs   1:1,  at most 480 px wide (shown in a round window)

What it does to each picture:
  1. cuts off a border, if the picture has one: black bars, or a paper mount
     of one colour on all four sides;
  2. cuts the middle to the kind's shape;
  3. saves a JPEG no wider than the kind's width.

Each kind has a NAMES table that maps a master's file name to the row id. A
master that is not in the table is reported and skipped. Needs Pillow
(`pip install pillow`). Run from the repo root:

    python3 scripts/splashArt.py            # every kind
    python3 scripts/splashArt.py people     # one kind
"""
import os, sys
from PIL import Image

WONDERS = {
    'alhambra': 'alhambra', 'angkor_wat': 'angkorWat', 'artemis': 'templeOfArtemis',
    'ashurbanipal': 'libraryOfAshurbanipal', 'chichen_itza': 'chichenItza',
    'circus_maxima': 'circusMaximus', 'colossus': 'colossus', 'forbidden_city': 'forbiddenCity',
    'great_library': 'greatLibrary', 'great_lighthouse': 'greatLighthouse',
    'great_mosque': 'greatMosqueOfDjenne', 'great_pyramids': 'pyramids', 'hagia_sophia': 'hagiaSophia',
    'hanging_gardens': 'hangingGardens', 'house_wisdom': 'houseOfWisdom', 'iron_pillar': 'ironPillar',
    'machu': 'machuPicchu', 'mausoleum': 'mausoleum', 'notre_dame': 'notreDame', 'oracle': 'theOracle',
    'petra': 'petra', 'pyramid_sun': 'pyramidOfTheSun', 'solomons': 'solomonsTemple',
    'sphinx': 'greatSphinx', 'statue_zeus': 'statueOfZeus', 'stelae': 'greatStelaeOfAksum',
    'stonehenge': 'stonehenge', 'terracotta_army': 'terracottaArmy', 'the_great_wall': 'greatWall',
    'theatre_dionysus': 'theatreOfDionysus', 'thoth': 'templeOfThoth', 'walls_uruk': 'wallsOfUruk',
    'weiyang': 'weiyangPalace', 'ziggurat': 'greatZiggurat',
}
PEOPLE = {
    'aljazari': 'alJazari', 'alkhwarizmi': 'alKhwarizmi', 'archimedes': 'archimedes',
    'aristotle': 'aristotle', 'boudica': 'boudica', 'ea_nasir': 'eaNasir',
    'enheduanna': 'enheduanna', 'gozen': 'tomoeGozen', 'hannibal': 'hannibal', 'homer': 'homer',
    'ibn_sina': 'ibnSina', 'imhotep': 'imhotep', 'marco_polo': 'marcoPolo',
    'mimarsinan': 'mimarSinan', 'rumi': 'rumi', 'sappho': 'sappho',
    'shikibu': 'murasakiShikibu', 'subutai': 'subutai', 'vitruvius': 'vitruvius',
    'zhangqian': 'zhangQian',
}
# One painting an age in each of three sets. A game shows one set throughout.
AGES = {
    'age1form_alt': 'form1', 'age2form_alt2': 'form2', 'age3form': 'form3', 'age4form_alt': 'form4',
    'age1still': 'still1', 'age2still': 'still2', 'age3still': 'still3', 'age4still': 'still4',
    'age1abstract': 'abstract1', 'age2abstract': 'abstract2', 'age3abstract': 'abstract3',
    'age4abstract': 'abstract4',
}
# The two paintings of the ending page: the local player wins, or another seat does.
ENDINGS = {'ending_win': 'win', 'ending_loss_alt': 'loss'}
# One portrait a leader, shown on the setup's leader card and in diplomacy.
# Where the user made two versions, the table names the one that was chosen.
LEADERS = {
    'alexander': 'alexanderTheGreat', 'battuta': 'ibnBattutaOfTangier', 'cleopatra': 'cleopatra',
    'cyrus': 'cyrusTheGreat', 'genghis': 'genghisKhan', 'jayavarman': 'jayavarmanVII', 'joan': 'joan',
    'justinian': 'justinian', 'medici': 'lorenzoDeMedici', 'mehmed': 'mehmedTheConqueror',
    'musa_alt': 'mansaMusa', 'nezahualcoyotl': 'nezahualcoyotl', 'pachacuti': 'pachacuti',
    'qin': 'qinShiHuang', 'rashid_alt': 'harunAlRashid', 'sejong': 'sejongTheGreat',
}
# One wide painting a government, shown in its banner (3:1).
GOVERNMENTS = {
    'aristocracy': 'aristocracy', 'chiefdom': 'chiefdom', 'curia': 'theCuria',
    'divinemandate': 'divineMandate', 'elders': 'councilOfElders', 'estates': 'theEstates',
    'imperium': 'imperium', 'merchantleague': 'merchantLeague', 'priestking': 'priestKing',
    'republic': 'republic', 'sultanate': 'theSultanate', 'tyranny': 'tyranny',
    'warchief': 'warChief',
}
# One square picture a belief, shown in a round window.
BELIEFS = {
    'harvest': 'goddessOfTheHarvest', 'hearth': 'keeperOfTheHearth', 'star_readers': 'starReaders',
    'calendar': 'keeperOfTheCalendar', 'standing_stones': 'theStandingStones',
    'ancestor_worship': 'ancestorWorship', 'hunt': 'ladyOfTheHunt', 'woods': 'spiritsOfTheWood',
    'river': 'riverMother', 'lord_sea': 'lordOfTheSea', 'anvil': 'godOfTheForge',
    'blood': 'ritesOfBlood', 'crossroads': 'oracleOfTheCrossroads', 'sacred_fire': 'sacredFire',
    'desert': 'desertFathers', 'winter': 'winterMother', 'stone_hoard': 'lordOfTheHoard',
    'vigil': 'courtAugurs', 'vineyard': 'vineyardRites', 'heroes': 'cultOfHeroes',
    'herd_gods': 'herdGods', 'merchants': 'patronOfMerchants', 'muses': 'theMuses',
}
KINDS = {
    'beliefs': {'names': BELIEFS, 'ratio': (1, 1), 'width': 480},
    'endings': {'names': ENDINGS, 'ratio': (16, 9), 'width': 1600},
    'ages': {'names': AGES, 'ratio': (16, 9), 'width': 1600},
    'wonders': {'names': WONDERS, 'ratio': (16, 9), 'width': 1600},
    'people': {'names': PEOPLE, 'ratio': (5, 6), 'width': 720},
    'leaders': {'names': LEADERS, 'ratio': (3, 4), 'width': 720},
    'governments': {'names': GOVERNMENTS, 'ratio': (3, 1), 'width': 990},
}
# Borders the automatic trim cannot see (a pale strip on two sides only):
# pixels to cut from the left, top, right and bottom of the master.
INSETS = {
    'ages/age4form_alt': (38, 0, 36, 0),
    # Leader masters with a second frame inside the paper mount, or a coloured edge.
    'leaders/alexander': (54, 54, 54, 54),
    'leaders/joan': (52, 60, 52, 60),
        'leaders/mehmed': (52, 60, 52, 52),
    'leaders/pachacuti': (22, 14, 22, 14),
}
# Where each leader's head is, so that every portrait shows the leader at one
# size, from the middle of the body up. Fractions of the trimmed picture:
# (centre of the face across, top of the hair or headgear to keep, top of the
# skull, chin). `frame` cuts a 3:4 box that makes skull-to-chin HEAD_SHARE of
# the height. A master that is already closer than that keeps its whole frame.
HEAD_SHARE = 0.28
HEAD_ROOM = 0.05
LEADER_FRAMES = {
    'alexander': (.42, .08, .08, .43), 'battuta': (.50, .07, .08, .36),
    'cleopatra': (.65, .03, .10, .40), 'cyrus': (.55, .02, .13, .39),
    'genghis': (.49, .15, .17, .30), 'jayavarman': (.53, .03, .20, .46),
    'joan': (.50, .10, .13, .35), 'justinian': (.50, .00, .16, .49),
    'medici': (.55, .05, .07, .34), 'mehmed': (.58, .08, .19, .43),
    'musa_alt': (.46, .07, .12, .30), 'nezahualcoyotl': (.60, .04, .19, .42),
    'pachacuti': (.50, .00, .16, .36), 'qin': (.52, .01, .07, .20),
    'rashid_alt': (.48, .08, .20, .39), 'sejong': (.56, .12, .20, .39),
}


def frame(im, spec):
    """Cut the 3:4 box that shows a leader from the middle of the body up."""
    cx, keep, skull, chin = spec
    w, h = im.size
    size = min(1.0, (chin - skull) / HEAD_SHARE)   # the box's share of each side
    y0 = min(max(0.0, keep - HEAD_ROOM * size), 1.0 - size)
    x0 = min(max(0.0, cx - size / 2), 1.0 - size)
    return im.crop((round(x0 * w), round(y0 * h), round((x0 + size) * w), round((y0 + size) * h)))


DARK = 26        # a black bar is a line whose brightest tenth is darker than this (0 to 255)
MOUNT = 46       # a mount line is one whose pixels sit this close to the mount's colour
MAX_TRIM = 0.2   # never cut more than a fifth from one side
MAX_MOUNT = 0.08 # a paper mount is thinner than this share of a side


def trim(im):
    """The box of the picture without its border: black bars, or a one-colour mount."""
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()

    def patch(x0, y0):
        vals = [px[x, y] for x in range(x0, x0 + 6) for y in range(y0, y0 + 6)]
        return tuple(sum(v[i] for v in vals) / len(vals) for i in range(3))

    def far(a, b):
        return max(abs(a[i] - b[i]) for i in range(3))

    corners = [patch(1, 1), patch(w - 7, 1), patch(1, h - 7), patch(w - 7, h - 7)]
    mount = None
    if all(far(corners[0], c) < 34 for c in corners[1:]):
        mount = tuple(sum(c[i] for c in corners) / 4 for i in range(3))

    def border_line(pixels, mount=None):
        # Black bar: nearly every pixel dark.
        lum = sorted((p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000 for p in pixels)
        if lum[int(len(lum) * 0.9)] < DARK:
            return True
        # Mount: the picture's four corners share one colour, and so does this line.
        if mount is not None:
            dist = sorted(far(p, mount) for p in pixels)
            return dist[int(len(dist) * 0.85)] < MOUNT
        return False

    def edges(mount):
        def col(x):
            return border_line([px[x, y] for y in range(0, h, 4)], mount)

        def row(y):
            return border_line([px[x, y] for x in range(0, w, 4)], mount)

        left = 0
        while left < w * MAX_TRIM and col(left): left += 1
        right = w
        while right > w * (1 - MAX_TRIM) and col(right - 1): right -= 1
        top = 0
        while top < h * MAX_TRIM and row(top): top += 1
        bottom = h
        while bottom > h * (1 - MAX_TRIM) and row(bottom - 1): bottom -= 1
        return left, top, right, bottom

    left, top, right, bottom = edges(mount)
    if mount is not None:
        # A real mount is a thin strip on all four sides. A plain sky that
        # happens to match the corners is not: it would cut deep on one side.
        cuts = (left / w, top / h, (w - right) / w, (h - bottom) / h)
        if not all(0 < c <= MAX_MOUNT for c in cuts):
            mount = None
            left, top, right, bottom = edges(None)
    # A soft edge beside a border: take a few more pixels where something was cut.
    pad = 4 if mount is not None else 2
    if left: left += pad
    if right < w: right -= pad
    if top: top += pad
    if bottom < h: bottom -= pad
    return left, top, right, bottom


def run(kind):
    spec = KINDS[kind]
    masters = f'art-masters/{kind}'
    out_dir = f'public/art/splash/{kind}'
    rw, rh = spec['ratio']
    if not os.path.isdir(masters):
        print(f'no folder {masters}')
        return
    os.makedirs(out_dir, exist_ok=True)
    for name in sorted(os.listdir(masters)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'): continue
        if stem not in spec['names']:
            print(f'skipped (not in the {kind} table): {name}')
            continue
        src = Image.open(os.path.join(masters, name)).convert('RGB')
        box = trim(src)
        l, t, r, b = INSETS.get(f'{kind}/{stem}', (0, 0, 0, 0))
        box = (max(box[0], l), max(box[1], t), min(box[2], src.width - r), min(box[3], src.height - b))
        im = src.crop(box)
        if kind == 'leaders' and stem in LEADER_FRAMES:
            # Bring the trimmed master to 3:4 first, so the fractions mean the same on every one.
            w, h = im.size
            if w * 4 > h * 3:
                nw = h * 3 // 4
                im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
            else:
                im = im.crop((0, 0, w, w * 4 // 3))
            im = frame(im, LEADER_FRAMES[stem])
        w, h = im.size
        if w * rh > h * rw:
            nw = h * rw // rh
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = w * rh // rw
            # Portraits keep their top: the head is there. Wide pictures keep their middle.
            off = 0 if rh > rw else (h - nh) // 2
            im = im.crop((0, off, w, off + nh))
        if im.width != spec['width'] and (im.width > spec['width'] or kind == 'leaders'):
            im = im.resize((spec['width'], spec['width'] * rh // rw), Image.LANCZOS)
        out = os.path.join(out_dir, spec['names'][stem] + '.jpg')
        im.save(out, quality=85, optimize=True, progressive=True)
        cut = '' if box == (0, 0) + src.size else f'  border cut {box}'
        print(f'{name} -> {out}  {im.width}x{im.height}  {os.path.getsize(out) // 1024} KB{cut}')


if __name__ == '__main__':
    kinds = sys.argv[1:] or list(KINDS)
    for kind in kinds:
        if kind not in KINDS:
            sys.exit(f'unknown kind {kind}; choose from {", ".join(KINDS)}')
        run(kind)
