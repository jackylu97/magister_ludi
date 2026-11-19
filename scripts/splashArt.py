#!/usr/bin/env python3
"""Turn full-size splash art into the files the game loads.

Reads   art-masters/<kind>/<any name>.png        (git ignores art-masters/)
Writes  public/art/splash/<kind>/<row id>.jpg

Kinds:
  wonders   16:9, at most 1600 px wide
  people    5:6,  at most 720 px wide (great people's portraits)

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
KINDS = {
    'wonders': {'names': WONDERS, 'ratio': (16, 9), 'width': 1600},
    'people': {'names': PEOPLE, 'ratio': (5, 6), 'width': 720},
}
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
        im = src.crop(box)
        w, h = im.size
        if w * rh > h * rw:
            nw = h * rw // rh
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = w * rh // rw
            # Portraits keep their top: the head is there. Wide pictures keep their middle.
            off = 0 if rh > rw else (h - nh) // 2
            im = im.crop((0, off, w, off + nh))
        if im.width > spec['width']:
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
