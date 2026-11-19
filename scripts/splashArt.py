#!/usr/bin/env python3
"""Turn the full-size wonder paintings into the files the game loads.

Reads   art-masters/wonders/<any name>.png                 (git ignores art-masters/)
Writes  public/art/splash/wonders/<wonder id>.jpg          (16:9, JPEG)

What it does to each painting:
  1. cuts off a black border, if the picture has one;
  2. cuts the middle to exactly 16:9;
  3. saves a JPEG no wider than 1600 px.

The table NAMES maps a master's file name to the wonder's row id. A master
that is not in the table is reported and skipped. Needs Pillow
(`pip install pillow`). Run from the repo root:  python3 scripts/splashArt.py
"""
import os, sys
from PIL import Image

MASTERS = 'art-masters/wonders'
OUT = 'public/art/splash/wonders'
NAMES = {
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
DARK = 26        # a border line is one whose brightest tenth is darker than this (0 to 255)
MAX_TRIM = 0.2   # never cut more than a fifth from one side
WIDTH = 1600


def trim(im):
    """The box of the picture without its black border."""
    grey = im.convert('L')
    w, h = grey.size
    px = grey.load()

    def dark_col(x):
        vals = sorted(px[x, y] for y in range(0, h, 4))
        return vals[int(len(vals) * 0.9)] < DARK

    def dark_row(y):
        vals = sorted(px[x, y] for x in range(0, w, 4))
        return vals[int(len(vals) * 0.9)] < DARK

    left = 0
    while left < w * MAX_TRIM and dark_col(left): left += 1
    right = w
    while right > w * (1 - MAX_TRIM) and dark_col(right - 1): right -= 1
    top = 0
    while top < h * MAX_TRIM and dark_row(top): top += 1
    bottom = h
    while bottom > h * (1 - MAX_TRIM) and dark_row(bottom - 1): bottom -= 1
    # A soft edge beside a border: take two more pixels where something was cut.
    if left: left += 2
    if right < w: right -= 2
    if top: top += 2
    if bottom < h: bottom -= 2
    return left, top, right, bottom


def main():
    os.makedirs(OUT, exist_ok=True)
    for name in sorted(os.listdir(MASTERS)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'): continue
        if stem not in NAMES:
            print(f'skipped (not in NAMES): {name}')
            continue
        im = Image.open(os.path.join(MASTERS, name)).convert('RGB')
        box = trim(im)
        im = im.crop(box)
        w, h = im.size
        if w * 9 > h * 16:
            nw = h * 16 // 9
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = w * 9 // 16
            im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        if im.width > WIDTH:
            im = im.resize((WIDTH, WIDTH * 9 // 16), Image.LANCZOS)
        out = os.path.join(OUT, NAMES[stem] + '.jpg')
        im.save(out, quality=85, optimize=True, progressive=True)
        cut = '' if box == (0, 0) + Image.open(os.path.join(MASTERS, name)).size else f'  border cut {box}'
        print(f'{name} -> {out}  {im.width}x{im.height}  {os.path.getsize(out) // 1024} KB{cut}')


if __name__ == '__main__':
    sys.exit(main())
