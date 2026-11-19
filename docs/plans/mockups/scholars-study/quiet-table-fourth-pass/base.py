#!/usr/bin/env python3
"""Builds quiet-table-second-pass.html: one board of mock-ups.

Run: python3 build.py
Reads board.css, symbols.py and the pictures in img/. Every picture goes into
the page as a data: URI. The output is page content only (title, one style,
content), and preview.html is the same content in a full document for a
headless check.

The pictures in img/ are not kept in the repo. To build again, make them:
- p-<wonder>.jpg: public/art/splash/wonders/<wonder>.jpg through
  `sips -Z 1100 -s format jpeg -s formatOptions 68` (the names in PAINT).
- t-<wonder>.jpg: the same files through `sips -Z 320` (the names in THUMB).
- map-wide.jpg, map-close.jpg: the two map screenshots in
  docs/plans/mockups/scholars-study/council-and-in-play/, through `sips -Z 1100`.
- now-<screen>.jpg: screenshots of the game at 1440 by 900, through
  `sips -Z 1280` (hud, city, tech, trade, diplo, great, offer, wonderplate,
  title, age, opus).
"""
import base64, os
from symbols import SYMBOLS, yi, ic, dev, star

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, 'img')

def uri(name):
    with open(os.path.join(IMG, name), 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()

PAINT = ['hangingGardens', 'greatLibrary', 'forbiddenCity', 'stonehenge', 'colossus', 'statueOfZeus', 'terracottaArmy', 'ironPillar', 'hagiaSophia']
THUMB = ['pyramids', 'theOracle', 'petra', 'greatWall']

def image_css():
    out = []
    for n in PAINT:
        out.append('.im-%s{background-image:url(%s)}' % (n, uri('p-%s.jpg' % n)))
    for n in THUMB:
        out.append('.im-%s{background-image:url(%s)}' % (n, uri('t-%s.jpg' % n)))
    out.append('.map-wide{background:url(%s) center/cover}' % uri('map-wide.jpg'))
    out.append('.map-close{background:url(%s) center/cover}' % uri('map-close.jpg'))
    # the line of stars, moons and suns on the ribbon's edges
    edge = ('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="16" viewBox="0 0 120 16" fill="none" stroke="%23e8c35e" stroke-width="1.2" stroke-linecap="round">'
            '<path fill="%23e8c35e" stroke="none" d="' + star(20, 8, 8, 5, 2) + '"/>'
            '<path d="M58.6 4.2A4.6 4.6 0 1 0 63.8 9.4A3.8 3.8 0 0 1 58.6 4.2Z"/>'
            '<circle cx="100" cy="8" r="2.4"/><path d="M100 2.6V4M100 12V13.4M94.6 8H96M104 8H105.4M96.2 4.2L97.2 5.2M102.8 10.8L103.8 11.8M96.2 11.8L97.2 10.8M102.8 5.2L103.8 4.2"/></svg>')
    out.append(".rib .edge{background-image:url('data:image/svg+xml;utf8,%s')}" % edge)
    return ''.join(out)

EXTRA_SYMBOLS = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-cards" viewBox="0 0 16 16"><rect x="2" y="4" width="8" height="10" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 2h7a1 1 0 0 1 1 1v9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
<symbol id="i-mail" viewBox="0 0 16 16"><path d="M1.5 3.5h13v9h-13ZM1.5 3.5L8 9l6.5-5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
<symbol id="i-knot" viewBox="0 0 64 64"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M32 8a24 24 0 1 0 24 24"/><path d="M32 20a12 12 0 1 0 12 12"/><circle cx="32" cy="32" r="3" fill="currentColor"/></g></symbol>
<symbol id="i-horse" viewBox="0 0 64 64"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 54V34q0-16 16-22l4-6 3 8q13 6 13 22"/><path d="M50 36l-9 5"/><path d="M28 54V42"/></g></symbol>
<symbol id="i-unit" viewBox="0 0 64 64"><g fill="currentColor"><circle cx="32" cy="15" r="10"/><path d="M22 28h20l6 26H16Z"/></g></symbol>
<symbol id="i-bld" viewBox="0 0 64 64"><g fill="currentColor"><path d="M6 24L32 6L58 24Z"/><path d="M11 28h8v24h-8ZM28 28h8v24h-8ZM45 28h8v24h-8ZM6 54h52v6H6Z"/></g></symbol>
</defs></svg>'''

F, P, G, SC, CU, FA = (yi('food'), yi('prod'), yi('gold'), yi('sci'), yi('cul'), yi('faith'))
SUN = '<svg class="mk"><use href="#m-sun"/></svg>'
MOON = '<svg class="mk"><use href="#m-moon"/></svg>'
STAR = '<svg class="mk"><use href="#m-star"/></svg>'

def mk(k, size=14, col=None, style=''):
    c = f'color:{col};' if col else ''
    return f'<svg class="mk" style="width:{size}px;height:{size}px;{c}{style}"><use href="#m-{k}"/></svg>'

def stage(w, h, inner, cls='', style=''):
    return f'<div class="fit"><div class="stage {cls}" data-w="{w}" data-h="{h}" style="width:{w}px;height:{h}px;{style}">{inner}</div></div>'

def veil(col):
    return f'<div class="veil" style="background:{col}"></div>'

def pw(img, w, h, cls='', style='', label='stand-in', inner='', bg=''):
    """A painting window. `bg` overrides the crop (background-size and position)."""
    si = f'<span class="si">{label}</span>' if label else ''
    return f'<div class="pw im-{img} {cls}" style="width:{w}px;height:{h}px;{bg}{style}">{si}{inner}</div>'

def fb(w, h, device, cls='', style='', tinct=None, canton=True):
    """The fallback in the same window: an engraved ground and a device."""
    t = f'--tinct:{tinct};' if tinct else ''
    d = min(w, h) * (0.5 if canton and tinct else 0.62)
    if tinct and canton:
        mark = f'<span class="canton" style="width:{d:.0f}px;height:{d:.0f}px"><svg style="width:{d*.66:.0f}px;height:{d*.66:.0f}px"><use href="#{device}"/></svg></span>'
    else:
        mark = f'<svg style="width:{d:.0f}px;height:{d:.0f}px;color:var(--fbc,#7f5b0e)" viewBox="0 0 100 100"><use href="#dev"/><use href="#{device}" x="25" y="25" width="50" height="50"/></svg>'
    return f'<div class="pw fb {"tinct" if tinct else ""} {cls}" style="width:{w}px;height:{h}px;{t}{style}">{mark}</div>'

# crops that turn a wonder painting into a stand-in face
FACE = {
    'colossus': 'background-size:330%;background-position:50% 27%;',
    'statueOfZeus': 'background-size:330%;background-position:66% 30%;',
    'terracottaArmy': 'background-size:300%;background-position:52% 34%;',
}

# ---------------------------------------------------------------- the HUD
def topbar(rich):
    def y(k, v, col): return f'<span class="y" style="color:var(--{col})">{yi(k)}{v}</span>'
    return (f'<div class="bar{" rich" if rich else ""}">' + y('food', '161', 'fl') + y('prod', '272', 'pl') + y('gold', '555 (+161)', 'gl') + y('sci', '187', 'sl') + y('cul', '156', 'cl') + y('faith', '67 (+22)', 'fal')
            + '<span class="box">' + y('happy', '+10', 'fl') + y('auth', '+2', 'pl') + '</span>' + y('renown', '27', 'gl') + f'<span class="y">{yi("bead")}1/7</span>'
            + '<span class="sp"></span><span class="age"><span class="n" style="font-size:12.5px;color:#cfc8b8">Turn 101 ·</span> Æra III</span><span class="sq">?</span><span class="sq">≡</span></div>')

def tb(x, y, size, name, what=''):
    w = f'<em>{what}</em>' if what else ''
    return f'<div class="tb" style="left:{x}px;top:{y}px"><span class="sz">{size}</span><b>{name}</b>{w}</div>'
BANNERS = [(492, 150, 16, 'Quito', 'The Statue of Zeus · 2t'), (397, 216, 20, 'Cusco ★', 'idle'), (454, 434, 11, 'Vilcashuamán', 'Garden · 1t'), (778, 152, 1, 'Huánuco Pampa', 'Monument · 5t')]

def hud(rich):
    r = ' rich' if rich else ''
    res_mark = mk('star', 12, 'var(--lapis)') if rich else ''
    draft_mark = '<i class="cback"></i>' if rich else ''
    corner = f'''<div class="corner panel{r}"><div class="top"><div><div class="pennant"><i>{ic('m-sun','')}</i></div><div style="text-align:center;margin-top:3px"><span class="kbd">Q</span></div></div>
<div><div class="ln"><u>{res_mark}Satrapies →</u><span class="n">4t</span></div><div class="pb"><i style="width:22%;background:var(--lapis)"></i></div><div class="ln"><u>{draft_mark}Next draft →</u><span class="n">3t</span></div><div class="pb"><i style="width:40%;background:var(--c)"></i></div></div></div>
<div class="doors"><span>{ic('i-flag','')}</span><span>{ic('i-route','')}4/5</span><span>{ic('y-faith','')}67</span><span>{ic('i-cards','')}22</span><span>{ic('i-rank','')}</span></div></div>'''
    if rich:
        toast1 = f'''<div class="toast panel rich" style="top:48px;padding:5px 14px 5px 6px">{pw('greatLibrary', 64, 36, 'thin', label='')}<small>TURN 101</small><span><span class="held-name">The Great Library</span> is finished in Cusco.</span></div>'''
    else:
        toast1 = f'''<div class="toast panel" style="top:46px">{dev('i-bld','seal')}<small>TURN 101</small><span><span class="held-name">The Great Library</span> is finished in Cusco.</span></div>'''
    toast2 = f'''<div class="toast panel" style="top:{100 if rich else 94}px;padding:6px 14px"><small>TURN 101</small><span>Cusco grew to <span class="n">13</span> citizens.</span></div>'''
    held = (dev('s-coin', '', 'width:14px;height:14px;color:var(--deep-gilt);vertical-align:-2px') + ' ') if rich else ''
    tip = f'''<div class="tip panel" style="left:12px;bottom:14px"><dl><dt>Terrain</dt><dd><b style="font-family:var(--name)">Coast</b></dd><dt>Water</dt><dd>Coastal</dd>
<dt>Yields</dt><dd><span class="n" style="color:var(--f)">1{F}</span> <span class="n" style="color:var(--g)">3{G}</span><div style="border-top:1px solid var(--rule);margin-top:3px;padding-top:3px;color:var(--soft);font-size:12px"><span class="n" style="color:var(--f)">1{F}</span> <span class="n" style="color:var(--g)">1{G}</span> Coast<br><span class="n" style="color:var(--g)">+1{G}</span> Lighthouse<br><span class="n" style="color:var(--g)">+1{G}</span> {held}Order · The Gilded Country</div></dd></dl></div>'''
    dispatch = f'''<div class="panel{r}" style="position:absolute;right:14px;bottom:72px;display:flex;align-items:center;gap:9px;padding:5px 8px 5px 6px;font-size:13px">{pw('terracottaArmy', 28, 28, 'circ thin', label='', bg=FACE['terracottaArmy'])}<span><b>Emperor Taizong</b> sent an offer</span><span class="btn sm">Read</span></div>'''
    sun = '<svg><use href="#m-sun"/></svg>' if rich else ''
    end = f'<button class="endturn{r}">{sun}End turn <span class="kbd">⏎</span></button>'
    lens = '<div class="panel" style="position:absolute;right:238px;bottom:14px;height:44px;padding:0 12px;display:grid;place-items:center;text-align:center;font-weight:600;line-height:1.1"><span class="lbl" style="font-size:9.5px">Lens</span>off</div>'
    return stage(1000, 600, topbar(rich) + corner + ''.join(tb(*b) for b in BANNERS) + toast1 + toast2 + tip + dispatch + lens + end, 'map-wide')

# ---------------------------------------------------------------- the city
ROWS = [
    ('unit', 'i-unit', 'Worker', 'Builds improvements. 3 charges.', '38', '2t', '152'),
    ('unit', 'i-unit', 'Bireme', 'A ship. Carries no one.', '61', '2t', '244'),
    ('bld', 'i-bld', 'Garden', '<span class="n">+1</span> happiness per <span class="n">5</span> citizens here', '89', '2t', '356'),
    ('bld', 'i-bld', 'Forum', '<span class="n">+10%</span> science and culture here', '176', '3t', '704'),
]
WROWS = [('theOracle', 'The Oracle', '<span class="n">+1</span> card in every draft offer', '382', '7t'), ('petra', 'Petra', '<span class="n">+1</span> food and production on desert hexes here', '501', '9t')]

def city(rich):
    r = ' rich' if rich else ''
    ys = ''.join(f'<span style="color:var(--{c})">{i}{v}</span>' for c, i, v in (('f', F, 30), ('p', P, 40), ('g', G, 46), ('s', SC, 26), ('c', CU, 13), ('fa', FA, 3)))
    head = f'''<div class="abs" style="left:0;right:0;top:0;background:var(--parch);z-index:2"><div class="sh" style="padding:9px 14px 8px"><span class="btn sm" style="padding:0 7px">‹</span><span class="sh-title">Cusco ★</span><span class="btn sm" style="padding:0 7px">›</span><span class="lbl">size <span class="n">12</span> · <span class="n">190/190</span> hp · follows no religion</span><span class="sp"></span><span class="n" style="font-size:13px;display:flex;gap:13px;font-weight:600">{ys}</span><span class="x" title="Leave the town">×</span></div><div class="{'hr-r' if rich else 'hr-q'}"></div></div>'''
    def sec(t, right=''):
        st = mk('star', 9, 'var(--deep-gilt)', 'margin-right:5px;vertical-align:-1px') if rich else ''
        return f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px"><span class="lbl">{st}{t}</span><span class="n" style="font-size:12px">{right}</span></div>'
    blds = ''.join(f'<span style="display:flex;gap:5px;align-items:center"><svg style="width:11px;height:11px;color:var(--soft)"><use href="#i-bld"/></svg>{n}</span>' for n in ('Granary', 'Monument', 'Shrine', 'Market', 'Library', 'Stone Walls', 'Lighthouse'))
    if rich:
        held = ('<div style="display:flex;gap:10px;margin-top:7px">'
                + f'<div class="piece" style="width:108px">{pw("greatLibrary", 100, 50, "thin", label="")}<div class="pn">The Great Library</div><div class="pp"><span style="color:var(--s)">+16{SC}</span><span style="color:var(--c)">+15{CU}</span></div></div>'
                + f'<div class="piece" style="width:108px">{pw("pyramids", 100, 50, "thin", label="")}<div class="pn">The Pyramids</div><div class="pp"><span style="color:var(--p)">+6{P}</span></div></div></div>')
    else:
        held = ''.join(f'<div style="display:flex;gap:9px;align-items:center;margin-top:7px">{pw(i, 60, 34, "thin", label="")}<span><span class="held-name" style="font-size:14px">{n}</span><br><span class="n" style="font-size:12px">{p}</span></span></div>'
                       for i, n, p in (('greatLibrary', 'The Great Library', f'<span style="color:var(--s)">+16{SC}</span> <span style="color:var(--c)">+15{CU}</span>'), ('pyramids', 'The Pyramids', f'<span style="color:var(--p)">+6{P}</span>')))
    left = f'''<div class="panel{r}" style="position:absolute;left:12px;top:62px;width:252px;padding:2px 12px 12px">
{sec('Growth', f'+8{F} · 15 turns')}<div class="meter" style="margin-top:4px"><i style="width:14%;background:var(--f)"></i></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:3px"><span>Next citizen</span><span class="n">18 / 128</span></div>
{sec('Borders', f'+13{CU} · 5 turns')}<div class="meter" style="margin-top:4px"><i style="width:22%;background:var(--c)"></i></div><div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-top:4px"><span>Next hex <span class="n">18 / 82</span></span><span class="btn sm">Buy hexes</span></div>
{sec('Citizens', '12')}<div style="font-size:12px;margin-top:2px"><span class="n">9</span> on land · <span class="n">3</span> specialists</div><div style="display:flex;gap:5px;margin-top:6px"><span class="chip on">Default</span><span class="chip">Food</span><span class="chip">Production</span><span class="chip">Gold</span></div>
{sec('Buildings', '7')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;font-size:12.5px;margin-top:4px">{blds}</div>
{sec('Wonders here', '2')}{held}</div>'''
    now_text = f'''<div><div class="lbl">Building now</div><div class="held-name" style="font-size:19px;line-height:1.1;margin-top:2px">The Hanging Gardens</div><div class="n" style="font-size:12.5px;margin-top:4px"><span style="color:var(--p)">131 / 170{P}</span> · 1 turn</div><div class="meter" style="margin-top:5px"><i style="width:77%;background:var(--p)"></i></div><div style="font-size:12px;color:var(--faint);margin-top:5px">A wonder is never for sale.</div></div>'''
    if rich:
        now = f'''<div class="plate" style="margin:13px 13px 6px;padding:9px;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center">{mk('sun', 12, 'var(--ink)', 'position:absolute;right:6px;top:6px')}{mk('moon', 12, 'var(--ink)', 'position:absolute;right:6px;bottom:6px')}{pw('hangingGardens', 184, 92)}{now_text}</div>'''
    else:
        now = f'''<div style="padding:11px 12px 9px;display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:center">{pw('hangingGardens', 168, 84)}{now_text}</div>'''
    rows = ''
    for k, e, n, fx, c, t, g in ROWS:
        rows += f'<div class="row">{ic(e, "ic")}<span><b>{n}</b><small>{fx}</small></span><span class="cst"><span style="color:var(--p)">{c}{P}</span> · {t}</span><span class="buy">{g}{G}</span></div>'
    for img, n, fx, c, t in WROWS:
        rows += f'<div class="row won">{pw(img, 80, 45, "thin", label="", style="margin:1px 0 1px 3px")}<span><b>{n}</b><small>{fx}</small></span><span class="cst"><span style="color:var(--p)">{c}{P}</span> · {t}</span><span class="buy" style="color:var(--faint);font-weight:400;border-color:transparent">no sale</span></div>'
    right = f'''<div class="panel{r}" style="position:absolute;right:12px;top:62px;width:416px">{now}
<div style="padding:2px 12px 7px;font-size:12px;display:flex;gap:6px;align-items:center"><span class="lbl">Then</span><span class="chip">Stone Walls · 1t</span><span class="chip">Bowman · 1t</span></div>
<div style="padding:0 12px 7px;display:flex;gap:5px;align-items:center;border-top:1px solid var(--rule);padding-top:8px"><span class="chip on">All</span><span class="chip">Units</span><span class="chip">Buildings</span><span class="chip">Wonders</span><span style="flex:1"></span><span class="lbl" style="white-space:nowrap">you have <span class="n" style="color:var(--g)">555</span> gold</span></div>
{rows}</div>'''
    end = '<button class="endturn' + r + '" style="min-width:180px">' + ('<svg><use href="#m-sun"/></svg>' if rich else '') + 'End turn <span class="kbd">⏎</span></button>'
    return stage(1000, 680, head + left + right, 'map-close')

# ---------------------------------------------------------------- the star chart
NODES = [  # column, row, name, cost, state
    (0, 0, 'The High Temple', '190', 'done'), (0, 1, 'Code of Laws', '190', 'done'), (0, 2, 'Irrigation', '190', 'done'), (0, 3, 'Siegecraft', '190', 'done'), (0, 4, 'Wayfinding', '190', 'done'),
    (1, 0, 'Rhetoric', '360', 'sel'), (1, 1.4, 'Iron Working', '360', 'done'), (1, 2.6, 'State Workforce', '360', 'done'), (1, 3.7, 'The Silk Road', '360', 'done'),
    (2, 0, 'The Civil Service', '650', ''), (2, 1, 'Mathematics', '650', ''), (2, 2, 'The Saddle', '650', ''), (2, 3, 'Satrapies', '650', 'plan'), (2, 4, 'Shipwrights', '650', 'plan'),
]
def tech():
    nodes = ''
    for c, rw, n, cost, st in NODES:
        x = 34 + c * 212; y = 122 + rw * 74
        bd = {'done': 'rgba(200,144,31,.55)', 'sel': '#e8c35e', 'plan': 'rgba(239,230,205,.55)', '': 'rgba(239,230,205,.2)'}[st]
        op = '.55' if st == '' else '1'
        glow = 'box-shadow:0 0 0 2px rgba(232,195,94,.35);' if st == 'sel' else ''
        nodes += f'<div class="abs" style="left:{x}px;top:{y:.0f}px;width:176px;height:58px;border:1px solid {bd};border-radius:4px;background:#1b1920;padding:6px 9px;opacity:{op};{glow}"><div style="font-family:var(--name);font-weight:600;font-size:13.5px;color:#f1e9d2">{n}</div><div class="n" style="font-size:11.5px;color:var(--sl);margin-top:2px">{cost}{SC}</div>{"<span class=abs style=right:8px;top:6px;color:#e8c35e>" + mk("star", 10) + "</span>" if st == "done" else ""}</div>'
    lines = '<svg class="abs" style="left:0;top:0" width="700" height="520" fill="none" stroke="rgba(200,144,31,.3)" stroke-width="1.2"><path d="M210 151H246M210 225C230 225 226 255 246 255M210 299C230 299 226 343 246 343M210 373C228 373 228 425 246 425M422 151H458M422 151C442 151 438 225 458 225M422 255C442 255 438 299 458 299M422 343C442 343 438 373 458 373M422 425C442 425 438 447 458 447"/></svg>'
    panel = f'''<div class="panel" style="position:absolute;right:26px;top:84px;width:292px;padding:14px 14px 12px;box-shadow:0 0 0 2px #17151b,0 0 0 3px var(--gilt),0 12px 30px rgba(0,0,0,.5)">
<div class="lbl">Technology · Æra III</div>
<div style="display:flex;align-items:center;gap:8px;margin-top:3px">{mk('star', 18, 'var(--lapis)')}<span style="font-family:var(--disp);font-size:27px;font-weight:500;line-height:1">Rhetoric</span></div>
<div class="n" style="font-size:12.5px;margin-top:8px;display:flex;justify-content:space-between"><span style="color:var(--s)">278 / 360{SC}</span><span>1 turn</span></div><div class="meter" style="margin-top:4px"><i style="width:77%;background:var(--s)"></i></div>
<div class="lbl" style="margin-top:14px">It opens</div>
<div class="row" style="padding:6px 0;grid-template-columns:30px 1fr auto">{ic('i-bld','ic')}<span><b>Forum</b><small><span class="n">+10%</span> science and culture in its city</small></span><span class="cst" style="color:var(--p)">176{P}</span></div>
<div class="row won" style="padding:7px 0;grid-template-columns:86px 1fr auto">{pw('greatLibrary', 80, 45, 'thin', label='')}<span><b>The Great Library</b><small>A wonder. One free technology.</small></span><span class="cst" style="color:var(--p)">501{P}</span></div>
<div style="border-top:1px solid var(--rule);margin-top:2px;padding-top:8px;font-size:12.5px"><span class="lbl">Flavour</span> <span class="slip" style="font-size:13.5px">The crowd is moved before it is told.</span></div>
<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><span class="btn">Add to plan</span><span class="btn pri">Research</span></div></div>'''
    head = f'''<div class="abs" style="left:26px;right:26px;top:22px;display:flex;align-items:center;gap:14px;color:#f1e9d2"><span class="sh-title" style="font-size:28px">Natural Philosophy</span><span style="flex:1"></span><span class="n" style="font-size:11.5px;color:#a9a294">click a star to aim · shift-click to queue</span><span class="x">×</span></div>
<div class="abs hr-r" style="left:26px;right:26px;top:62px"></div>'''
    plan = f'''<div class="abs" style="left:26px;right:26px;bottom:22px;display:flex;align-items:center;gap:8px;border-top:1px solid rgba(200,144,31,.4);padding-top:9px;color:#f1e9d2"><span class="lbl" style="color:#e8c35e">The plan</span><span class="chip" style="border-color:#e8c35e;color:#f1e9d2">① Rhetoric · 1t ×</span><span class="chip" style="border-color:rgba(239,230,205,.4);color:#f1e9d2">② Shipwrights · 6t ×</span><span class="chip" style="border-color:rgba(239,230,205,.4);color:#f1e9d2">③ Satrapies · 12t ×</span></div>'''
    era = '<div class="abs" style="left:34px;top:90px;font-family:var(--cn);font-size:13px;color:#e8c35e;letter-spacing:.05em">Æra II · Heroes</div><div class="abs" style="left:246px;top:90px;font-family:var(--cn);font-size:13px;color:#e8c35e;letter-spacing:.05em">Æra III · Empire</div>'
    frame = '<div class="abs" style="inset:8px;border:1px solid var(--gilt);border-radius:6px;pointer-events:none"></div><div class="abs" style="inset:12px;border:1px solid rgba(200,144,31,.35);border-radius:4px;pointer-events:none"></div>'
    return stage(1000, 560, frame + head + era + lines + nodes + panel + plan, '', 'background:#15131a')

# ---------------------------------------------------------------- a working sheet
def trade():
    def pays(*a): return ' '.join(f'<span style="color:var(--{c})">+{v}{i}</span>' for c, i, v in a)
    run = [('Cusco ★', 'Longcheng ★', 'Land', 'laid', '14', pays(('g', G, 3), ('s', SC, 1), ('c', CU, 1))),
           ('Cusco ★', "Chang'an ★", 'Land', 'laying', '14', pays(('g', G, 4), ('s', SC, 1), ('c', CU, 1))),
           ('Cajamarca', 'Cusco ★', 'Land', 'laid', '9', pays(('f', F, 2), ('p', P, 2), ('g', G, 3))),
           ('Cajamarca', 'Quito', 'Land', 'laying', '3', pays(('f', F, 2), ('p', P, 2), ('g', G, 2)))]
    trs = ''.join(f'<tr><td><b>{a}</b> → <b>{b}</b></td><td>{m}</td><td>{rd}</td><td class="n">{t}</td><td class="n">{p}</td><td class="n"><span class="btn sm">Cancel</span></td></tr>' for a, b, m, rd, t, p in run)
    can = [('Quito', 'Ordos', 'Land', '11 hexes', pays(('g', G, 5), ('s', SC, 2)), '135'), ('Cusco ★', 'Taiyuan', 'Sea', '8 hexes', pays(('g', G, 6), ('c', CU, 1)), '135')]
    trs2 = ''.join(f'<tr><td><b>{a}</b> → <b>{b}</b></td><td>{m}</td><td>{d}</td><td class="n">20</td><td class="n">{p}</td><td class="n"><span class="btn sm">Send · <span class="n" style="color:var(--g)">{c}{G}</span></span></td></tr>' for a, b, m, d, p, c in can)
    sheet = f'''<div class="sheet" style="left:60px;top:22px;width:880px;height:456px">
<div class="sh"><span class="sh-title">Caravans &amp; <i>Roads</i></span><span class="lbl"><span class="n">555</span> gold · <span class="n">1</span> of <span class="n">5</span> caravans idle</span><span class="sp"></span><span class="hint">A caravan runs one route at a time.</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="padding:12px 16px 0;display:flex;gap:6px;align-items:center"><span class="chip on">Running <span class="n">4</span></span><span class="chip">Can set out <span class="n">2</span></span><span class="chip">All routes <span class="n">6</span></span><span class="chip">Shut <span class="n">200</span></span><span style="flex:1"></span><span style="font-size:12px;color:var(--faint)">Next hire <span class="n" style="color:var(--g)">135{G}</span> · each route running adds <span class="n">15</span></span></div>
<div style="padding:8px 16px 0"><table class="led"><thead><tr><th>Running</th><th>Mode</th><th>Road</th><th class="n">Turns left</th><th class="n">Pays a turn</th><th></th></tr></thead><tbody>{trs}
<tr><td colspan="4" style="border-bottom:1px solid var(--ink)"><span class="lbl">All four, this turn</span></td><td class="n" style="border-bottom:1px solid var(--ink);font-weight:600">{pays(('f', F, 4), ('p', P, 4), ('g', G, 12), ('s', SC, 2), ('c', CU, 2))}</td><td style="border-bottom:1px solid var(--ink)"></td></tr></tbody></table>
<table class="led" style="margin-top:14px"><thead><tr><th>Can set out</th><th>Mode</th><th>Distance</th><th class="n">Turns</th><th class="n">Would pay a turn</th><th></th></tr></thead><tbody>{trs2}</tbody></table></div>
<div style="margin-top:auto;padding:10px 16px;border-top:1px solid var(--rule);font-size:12px;color:var(--faint)">The sheet stays open after a send.</div></div>'''
    return stage(1000, 500, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

# ---------------------------------------------------------------- diplomacy
def diplo(rich):
    courts = f'''<div class="lbl" style="margin-bottom:6px">The courts</div>
<div style="display:flex;gap:9px;align-items:center;border:1px solid var(--ink);border-radius:4px;padding:6px 8px;background:#fffaf0">{pw('terracottaArmy', 30, 30, 'circ thin', label='', bg=FACE['terracottaArmy'])}<span><b style="font-family:var(--name);font-size:13px">Emperor Taizong</b><br><span style="font-size:11.5px;color:var(--faint)">At peace</span></span></div>
<div style="display:flex;gap:9px;align-items:center;border:1px solid var(--edge);border-radius:4px;padding:6px 8px;margin-top:6px">{fb(30, 30, 'i-horse', 'circ thin', tinct='#2f5d8a')}<span><b style="font-family:var(--name);font-size:13px">Modu Chanyu</b><br><span style="font-size:11.5px;color:var(--faint)">At peace</span></span></div>'''
    rel = ''.join(f'<div style="display:flex;justify-content:space-between;border-top:1px solid var(--rule);padding:5px 0;font-size:12.5px"><span>{a}</span><b>{b}</b></div>' for a, b in (('Relation', 'At peace'), ('Their borders', 'Closed to you'), ('Your borders', 'Closed to them')))
    last = '<div class="lbl" style="margin-top:10px">Their last word</div><div class="slip" style="margin-top:2px">“Let us put something useful on the table.”</div>'
    def col(t, who, hand, items, hidden):
        its = ''.join(f'<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">{x}</div>' for x in items)
        return f'<div><div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:3px"><b style="font-family:var(--name);font-size:14px">{t}</b></div><div class="lbl" style="margin-top:8px">Gold <span style="float:right"><span class="n">{hand}</span> in hand</span></div>{its}<div style="font-size:11.5px;color:var(--faint);margin-top:8px;font-style:italic">{hidden}</div></div>'
    you = col('You can give', 'Pachacuti', '555', ['<span class="give">Gold, once</span> <span class="give">Gold a turn <i>20 turns</i></span>', '<span class="give">Open borders</span>', '<span class="give">Incense <span class="n">1</span> <i>last</i></span> <span class="give">Marble <span class="n">0</span></span>'], 'Not shown: Wine, Jade, Tea. You both own them.')
    they = col('They can give', 'the Tang', '343', ['<span class="give">Gold, once</span> <span class="give">Gold a turn <i>20 turns</i></span>', '<span class="give">Open borders</span>', '<span class="give">Sugar <span class="n">2</span></span>'], '')
    paper = f'''<div style="background:#fffaf0;border:1px solid var(--edge);box-shadow:0 3px 10px rgba(29,26,32,.14);padding:11px 12px;display:flex;flex-direction:column"><div style="font-family:var(--disp);font-size:18px;line-height:1.1">An exchange with the Tang</div><div class="lbl" style="margin-top:3px">Nothing on the table</div>
<div style="border-bottom:1px solid var(--ink);margin-top:10px;font-weight:600;font-size:12.5px;padding-bottom:2px">Pachacuti gives</div><div class="slip" style="color:var(--faint);font-size:13px">Nothing</div>
<div style="border-bottom:1px solid var(--ink);margin-top:10px;font-weight:600;font-size:12.5px;padding-bottom:2px">Emperor Taizong gives</div><div class="slip" style="color:var(--faint);font-size:13px">Nothing</div>
<div style="margin-top:auto;display:grid;gap:5px"><span class="btn sm off" style="justify-content:center;font-size:11px;padding:0 4px">What would make this work?</span><span class="btn sm off" style="justify-content:center;font-size:11px;padding:0 4px">What would you give for this?</span></div></div>'''
    ex_h = 318 if rich else 400
    exchange = f'''<div style="display:flex;gap:14px;align-items:baseline;border-bottom:1px solid var(--rule);padding-bottom:5px"><b style="font-size:13px;border-bottom:2px solid var(--ink);padding-bottom:5px;margin-bottom:-6px">Exchange</b><span style="font-size:13px;color:var(--faint)">Peace terms</span></div>
<div style="display:grid;grid-template-columns:minmax(0,1fr) 184px minmax(0,1fr);gap:12px;margin-top:10px;height:{ex_h - 40}px">{you}{paper}{they}</div>'''
    foot = '<div class="abs" style="left:16px;right:16px;bottom:12px;display:flex;align-items:center;gap:10px"><span class="btn war">Declare war</span><span style="flex:1"></span><span class="btn">Standing and deals <span class="n">0</span></span><span class="btn pri off">Propose</span></div>'
    port = pw('terracottaArmy', 186, 248, bg=FACE['terracottaArmy'], label='stand-in for a portrait')
    if rich:
        body = f'''<div class="rib" style="top:14px;height:84px"><div class="edge t"></div><div class="edge b"></div><svg class="bm" style="right:26px;width:34px;height:34px;margin-top:-17px"><use href="#m-moon"/></svg></div>
<div class="abs" style="left:16px;top:122px;width:160px">{courts}</div>
<div class="abs" style="left:196px;top:26px">{pw('terracottaArmy', 204, 272, 'lap', bg=FACE['terracottaArmy'], label='stand-in for a portrait')}</div>
<div class="abs" style="left:424px;top:28px;color:#f7f2e1"><div style="font-family:var(--disp);font-size:30px;line-height:1">Emperor Taizong</div><div style="font-family:var(--cn);font-size:14px;color:var(--gilt-hi);letter-spacing:.05em;margin-top:5px">the Tang · at peace</div></div>
<div class="abs" style="left:196px;top:312px;width:204px">{rel}{last}</div>
<div class="abs" style="left:424px;top:120px;width:500px">{exchange}</div>'''
    else:
        body = f'''<div class="abs" style="left:16px;top:14px;width:160px">{courts}</div>
<div class="abs" style="left:196px;top:16px">{port}</div>
<div class="abs" style="left:196px;top:276px;width:204px"><div style="font-family:var(--disp);font-size:23px;line-height:1.05">Emperor Taizong</div><div class="lbl" style="margin:3px 0 6px">the Tang</div>{rel}{last}</div>
<div class="abs" style="left:424px;top:14px;width:500px">{exchange}</div>'''
    sheet = f'''<div class="sheet" style="left:30px;top:18px;width:940px;height:544px"><div class="sh"><span class="sh-title">Foreign <i>courts</i></span><span class="lbl">Pachacuti · turn <span class="n">101</span> · <span class="n">2</span> courts met</span><span class="sp"></span><span class="hint">Choose a court, then fill the paper.</span><span class="x">×</span></div><div class="{'hr-q' if not rich else 'hr-q'}"></div>
<div style="position:relative;flex:1">{body}{foot}</div></div>'''
    return stage(1000, 580, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

def diplo_fallback():
    def pair(x, w, h, cls=''):
        return (f'<div class="abs" style="left:{x}px;top:{(176 - h) / 2 + 30:.0f}px">{pw("terracottaArmy", w, h, cls, bg=FACE["terracottaArmy"], label="")}</div>'
                + f'<div class="abs" style="left:{x + w + 16}px;top:{(176 - h) / 2 + 30:.0f}px">{fb(w, h, "i-horse", cls, tinct="#2f5d8a")}</div>')
    caps = ''.join(f'<div class="abs lbl" style="left:{x}px;top:10px;white-space:nowrap">{t}</div>' for x, t in ((40, 'Setup · 132 by 176'), (372, 'Turn card and courts · 72 by 96'), (590, 'Lists and dispatches · 28'), (720, 'A painted leader beside one with no painting yet')))
    row = f'''<div class="abs" style="left:720px;top:38px;width:250px;display:grid;gap:7px">
<div style="display:flex;gap:9px;align-items:center;border:1px solid var(--edge);border-radius:4px;padding:6px 8px;background:var(--parch)">{pw('terracottaArmy', 30, 30, 'circ thin', label='', bg=FACE['terracottaArmy'])}<b style="font-family:var(--name);font-size:13px">Emperor Taizong</b><span style="flex:1"></span><span class="n" style="font-size:12px">7 towns</span></div>
<div style="display:flex;gap:9px;align-items:center;border:1px solid var(--edge);border-radius:4px;padding:6px 8px;background:var(--parch)">{fb(30, 30, 'i-horse', 'circ thin', tinct='#2f5d8a')}<b style="font-family:var(--name);font-size:13px">Modu Chanyu</b><span style="flex:1"></span><span class="n" style="font-size:12px">6 towns</span></div>
<div style="display:flex;gap:9px;align-items:center;border:1px solid var(--edge);border-radius:4px;padding:6px 8px;background:var(--parch)">{fb(30, 30, 'm-sun', 'circ thin', tinct='#8f1f33')}<b style="font-family:var(--name);font-size:13px">Pachacuti</b><span style="flex:1"></span><span class="n" style="font-size:12px">11 towns</span></div></div>'''
    return stage(1000, 226, caps + pair(40, 132, 176) + pair(372, 72, 96) + pair(590, 28, 28, 'circ thin') + row, '', 'background:var(--table)')

# ---------------------------------------------------------------- the great person offer
def gp(cls, fam, emblem, name, where, fx, flavour, face=None, sel=False, tier='◆'):
    if face:
        win = f'<div class="gp-win arch im-{face}" style="{FACE[face]}"><span class="si" style="left:50%;transform:translateX(-50%);top:auto;bottom:4px;position:absolute;font-family:var(--num);font-size:9.5px;color:#fff;background:rgba(29,26,32,.72);padding:0 5px;border-radius:2px;white-space:nowrap">stand-in</span></div>'
    else:
        win = f'<div class="gp-win arch fb" style="display:grid;place-items:center"><svg style="width:116px;height:116px;color:var(--k)" viewBox="0 0 100 100"><use href="#dev"/><use href="#{emblem}" x="25" y="25" width="50" height="50"/></svg></div>'
    return f'''<div class="gp {cls}{' sel' if sel else ''}"><div class="gp-in"><svg class="cm l"><use href="#m-sun"/></svg><svg class="cm r"><use href="#m-moon"/></svg><span class="gp-k"><svg style="width:11px;height:11px"><use href="#{emblem}"/></svg>{fam}</span>{win}<div class="gp-name">{name}</div><div class="gp-ep">{where}</div><div class="gp-fx">{fx}</div><div class="gp-foot"><span><span class="lbl" style="font-size:9.5px">Flavour</span> <i>{flavour}</i></span><span class="n">{tier}</span></div></div></div>'''

def great_cards():
    return (gp('mer', 'Merchant', 's-coin', 'Francesco Datini', 'The merchant of Prato', '<b>+2 gold</b> on every hex with a resource, in every city with a Bank', 'In the name of God and of profit.', face='statueOfZeus')
            + gp('sch', 'Scholar', 's-sphere', 'al-Khwarizmi', 'The reckoner of Baghdad', '<b>+10% faith</b> in every city with a University. You may buy science buildings with faith.', 'By restoration and balancing.', face='colossus', sel=True)
            + gp('mer', 'Merchant', 's-coin', 'Marco Polo', 'The traveller', '<b>+1 gold</b> on a trade route per <b>5</b> hexes between its two cities', 'I have not told the half.'))

def great(rich):
    if rich:
        inner = f'''<div class="abs" style="left:28px;right:28px;top:20px;display:flex;align-items:center;gap:14px;color:#f1e9d2"><span class="sh-title" style="font-size:28px">Who will serve you</span><span class="lbl" style="color:#b9b2a6">the age offers you one name</span><span style="flex:1"></span><span style="font-size:12px;color:#b9b2a6">The offer waits. Nothing is spent.</span><span class="x">×</span></div>
<div class="abs" style="left:28px;right:28px;top:62px;border-top:1px solid rgba(200,144,31,.55)"></div>
<div class="abs" style="left:0;right:0;top:92px;display:flex;gap:34px;justify-content:center">{great_cards()}</div>
<div class="abs" style="left:28px;right:28px;bottom:20px;display:flex;align-items:center;gap:10px"><span class="btn gl">Ask again · <span class="n" style="color:var(--fal)">112{FA}</span></span><span style="font-size:12px;color:#b9b2a6">You have <span class="n">67</span> faith.</span><span style="flex:1"></span><span class="btn pri">Take al-Khwarizmi</span></div>'''
        return stage(1000, 580, inner, 'cloth')
    sheet = f'''<div class="sheet" style="left:96px;top:14px;width:808px;height:552px"><div class="sh"><span class="sh-title">Who will serve you</span><span class="lbl">the age offers you one name</span><span class="sp"></span><span class="hint">The offer waits. Nothing is spent.</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="display:flex;gap:26px;justify-content:center;margin-top:24px">{great_cards()}</div>
<div style="margin-top:auto;padding:10px 16px 12px;display:flex;align-items:center;gap:10px"><span class="btn">Ask again · <span class="n" style="color:var(--fa)">112{FA}</span></span><span style="font-size:12px;color:var(--faint)">You have <span class="n">67</span> faith.</span><span style="flex:1"></span><span class="btn pri">Take al-Khwarizmi</span></div></div>'''
    return stage(1000, 580, veil('rgba(29,26,32,.42)') + sheet, 'map-close')

# ---------------------------------------------------------------- government adoption
def chairs(spec):
    col = {'m': '#a8361b', 'e': '#b5791b', 'c': '#4f78be', 'w': '#4a2a72'}
    return ''.join(f'<i style="display:inline-block;width:11px;height:15px;border:1.5px solid {col[k]};border-radius:2px;background:var(--card);margin-right:3px"></i>' for k in spec)

def gov():
    def rowg(banner, lines, spec, fig, sel=False):
        ls = ''.join(f'<div style="margin-top:3px">{l}</div>' for l in lines)
        ring = 'border-color:var(--ink);background:#fffaf0;box-shadow:0 0 0 2px var(--gilt-hi)' if sel else ''
        return f'''<div style="display:grid;grid-template-columns:336px 1fr 190px;gap:16px;align-items:center;border:1px solid var(--edge);border-radius:5px;padding:9px 12px 9px 9px;margin-top:10px;{ring}">{banner}
<div style="font-size:13px">{ls}</div>
<div><div class="lbl">Its chairs</div><div style="margin-top:4px">{chairs(spec)}</div><div class="lbl" style="margin-top:8px">With the cards you keep</div><div class="n" style="font-size:13px;font-weight:600;margin-top:2px">{fig}</div></div></div>'''
    def named(img, name, pos='center'):
        return pw(img, 330, 110, inner=f'<div class="fall" style="padding:26px 10px 5px"><span style="font-family:var(--cn);font-size:21px;letter-spacing:.02em">{name}</span></div>', style=f'background-position:{pos};')
    b1 = f'''<div class="pw fb" style="width:330px;height:110px;display:flex;align-items:center;justify-content:center;gap:16px"><svg style="width:84px;height:84px;color:var(--deep-gilt)" viewBox="0 0 100 100"><use href="#dev"/><use href="#s-coin" x="25" y="25" width="50" height="50"/></svg><span><span style="font-family:var(--cn);font-size:22px;display:block;line-height:1">The Merchant League</span><span class="lbl">tier <span class="n">18</span></span></span></div>'''
    rows = (rowg(b1, ['<span class="n">+1</span> trade route', 'Every trade route pays <span class="n">+50%</span>'], 'eeecmw', f'<span style="color:var(--g)">+31{G}</span> <span style="color:var(--f)">+6{F}</span>')
            + rowg(named('forbiddenCity', 'The Imperium', '50% 42%'), ['<span class="n">+1</span> movement for every unit', '<span class="n">+10%</span> science in every city you have captured'], 'mmmecw', f'<span style="color:var(--p)">+14{P}</span> <span style="color:var(--s)">+9{SC}</span>', sel=True)
            + rowg(named('hagiaSophia', 'The Divine Mandate', '50% 58%'), ['<span class="n">+20%</span> culture in every city with a wonder', '<span class="n">+20%</span> faith in your holy city'], 'cccemw', f'<span style="color:var(--c)">+22{CU}</span> <span style="color:var(--fa)">+8{FA}</span>'))
    sheet = f'''<div class="sheet" style="left:56px;top:14px;width:888px;height:572px"><div class="sh"><span class="sh-title">Swear a government</span><span class="lbl">tier <span class="n">18</span> · a charter is ready</span><span class="sp"></span><span class="hint">The offer waits. Nothing is spent.</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="padding:2px 16px 0">{rows}</div>
<div style="margin-top:auto;padding:10px 16px 12px;display:flex;align-items:center;gap:12px"><span style="font-size:12.5px;color:var(--soft);max-width:520px">This choice is final. Your Orders keep their chairs where they still fit. The rest move to free chairs, or go back to your collection.</span><span style="flex:1"></span><span class="btn pri">Swear the Imperium</span></div></div>'''
    return stage(1000, 600, veil('rgba(29,26,32,.42)') + sheet, 'map-close')

# ---------------------------------------------------------------- the age plate
AGE_STATS = [('3', 'towns'), ('Pottery', 'first technology'), ('53 · 16', 'won · lost'), ('10', 'Orders')]
def age_ribbon():
    stats = ''.join(f'<div style="text-align:center"><div class="n" style="font-size:16px;font-weight:600;font-family:{"var(--name)" if not v[0].isdigit() else "var(--num)"}">{v}</div><div class="lbl" style="color:#cfc8b8;font-size:9.5px">{l}</div></div>' for v, l in AGE_STATS)
    fall = f'''<div class="fall" style="padding:90px 26px 20px;display:flex;align-items:flex-end;gap:18px"><span style="font-family:var(--cn);font-size:88px;line-height:.78;color:var(--gilt-hi)">II</span><div><div style="font-family:var(--cn);font-size:13px;letter-spacing:.08em;color:var(--gilt-hi)">An age opens</div><div style="font-family:var(--disp);font-size:34px;line-height:1.05;white-space:nowrap">The Age of Heroes</div><div style="font-size:13px;color:#e6dfcf;margin-top:2px;white-space:nowrap">The Age of Omens closes.</div></div><span style="flex:1"></span><div><div style="display:flex;gap:16px;margin-bottom:12px;white-space:nowrap">{stats}</div><div style="text-align:right"><span class="btn gl">Continue <span class="kbd">⏎</span></span></div></div></div>'''
    inner = (veil('rgba(20,16,24,.34)') + f'<div class="rib" style="top:212px;height:200px"><div class="edge t"></div><div class="edge b"></div><svg class="bm" style="left:44px"><use href="#m-sun"/></svg><svg class="bm" style="right:44px"><use href="#m-moon"/></svg></div>'
             + f'<div class="abs" style="left:140px;top:110px">{pw("stonehenge", 720, 405, "dark", label="stand-in: a wonder painting", inner=fall)}</div>')
    return stage(1000, 625, inner, 'map-wide')

def age_page():
    stats = ''.join(f'<div style="text-align:center;min-width:110px"><div style="font-size:21px;font-weight:600;font-family:{"var(--name)" if not v[0].isdigit() else "var(--num)"}">{v}</div><div class="lbl" style="color:#cfc8b8">{l}</div></div>' for v, l in AGE_STATS)
    inner = f'''<div class="fr1"></div><div class="fr2"></div>
<div class="abs" style="left:220px;top:42px">{pw('stonehenge', 560, 315, 'lap', label='stand-in: a wonder painting')}</div>
<div class="abs" style="left:462px;top:319px;width:76px;height:76px;border-radius:50%;background:var(--deep-lapis);border:2px solid var(--gilt);box-shadow:0 0 0 3px var(--deep-lapis),0 0 0 4px rgba(200,144,31,.6);display:grid;place-items:center;font-family:var(--cn);font-size:40px;color:var(--gilt-hi);line-height:1">II</div>
<div class="abs" style="left:0;right:0;top:402px;text-align:center"><div style="font-family:var(--disp);font-size:42px;line-height:1.05">The Age of Heroes</div><div style="font-family:var(--disp);font-size:16.5px;color:#e6dfcf;margin-top:4px">The Age of Omens closes. The wager of the new age is dealt.</div></div>
<div class="abs" style="left:230px;right:230px;top:492px;border-top:1px solid var(--gilt)"></div>
<div class="abs" style="left:0;right:0;top:504px;display:flex;justify-content:center;gap:18px">{stats}</div>
<div class="abs" style="left:0;right:0;top:568px;text-align:center"><span class="btn gl">Continue <span class="kbd">⏎</span></span></div>
{mk('sun', 22, 'var(--gilt-hi)', 'position:absolute;left:150px;top:188px')}{mk('moon', 22, 'var(--gilt-hi)', 'position:absolute;right:150px;top:188px')}'''
    return stage(1000, 625, inner, 'lpage')

# ---------------------------------------------------------------- title and ending
def title():
    inner = f'''<div class="abs im-hangingGardens" style="left:0;right:0;top:0;height:412px;background-size:cover;background-position:50% 30%"><div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(20,30,70,.62),rgba(20,30,70,.18) 46%,transparent 62%)"></div><span class="cap" style="right:10px;top:10px">stand-in: a wonder painting</span>
<div class="abs" style="left:56px;top:96px;color:#f7f2e1"><div style="font-family:var(--disp);font-size:78px;font-weight:500;line-height:.95;letter-spacing:-.01em">Magister <i style="color:var(--gilt-hi)">Ludi</i></div><div style="display:flex;align-items:center;gap:8px;margin-top:14px;color:var(--gilt-hi)"><i style="width:60px;border-top:1px solid currentColor"></i>{mk('star', 11)}<i style="width:60px;border-top:1px solid currentColor"></i></div><div style="font-family:var(--cn);font-size:15px;letter-spacing:.08em;margin-top:12px">one seed · one world</div></div></div>
<div class="rib" style="top:412px;height:26px;box-shadow:none"><div class="edge" style="top:4px"></div></div>
<div class="abs" style="left:0;right:0;top:440px;bottom:0;background:#efe9da"></div>
<div class="abs" style="left:56px;top:470px;display:flex;gap:10px;align-items:center"><span class="btn pri" style="height:44px;padding:0 26px;font-size:15.5px">New game <span class="kbd">N</span></span><span class="btn" style="height:44px">Continue<span style="font-weight:400;color:var(--faint)">Pachacuti · turn <span class="n">101</span></span></span><span class="btn" style="height:44px">Load a game <span class="kbd">L</span></span><span class="btn" style="height:44px">Compendium <span class="kbd">?</span></span></div>
<div class="abs" style="left:56px;top:534px;font-size:12px;color:var(--faint)">Multiplayer and settings come later.</div>
<div class="panel" style="position:absolute;right:36px;top:462px;width:222px;padding:9px 12px;box-shadow:none"><div class="lbl">Recent worlds</div><div style="display:flex;justify-content:space-between;border-top:1px solid var(--rule);margin-top:5px;padding-top:5px;font-size:12.5px"><b style="font-family:var(--name)">Pachacuti</b><span class="n">turn 101</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid var(--rule);margin-top:5px;padding-top:5px;font-size:12.5px"><b style="font-family:var(--name)">Emperor Taizong</b><span class="n">turn 72</span></div></div>'''
    return stage(1000, 580, inner, '', 'background:#efe9da')

def rods(win):
    seats = [('Pachacuti', '#8f1f33', 7 if win else 5), ('Emperor Taizong', '#1f7a5c', 5 if win else 7), ('Modu Chanyu', '#2f5d8a', 3)]
    out = ''
    for i, (n, c, k) in enumerate(seats):
        beads = ''.join(f'<i style="width:15px;height:21px;border-radius:50%;background:{c if j < k else "#e9dfc6"};border:1.5px solid #1d1a20;margin-right:2px;flex:none"></i>' for j in range(7))
        out += f'<div style="display:grid;grid-template-columns:150px 1fr 40px;align-items:center;gap:10px;margin-top:8px"><span style="font-family:var(--name);font-weight:600;font-size:14px">{n}</span><span style="display:flex;align-items:center;background:linear-gradient(var(--gilt),var(--gilt)) center/100% 3px no-repeat;padding:0 4px">{beads}</span><span class="n" style="font-size:13px;text-align:right">{k}/7</span></div>'
    return out

def ending(win):
    if win:
        img, page, filt, lab = 'greatLibrary', 'lpage', '', 'stand-in: a wonder painting'
        eyebrow, head, sub = 'The Great Work is closed', 'Pachacuti <i style="color:var(--gilt-hi)">wins</i>', 'You closed the Great Work in Cusco on turn <span class="n">212</span>.'
        mark = mk('sun', 30, 'var(--gilt-hi)')
    else:
        img, page, filt, lab = 'ironPillar', 'cloth', 'filter:saturate(.42) brightness(.72) contrast(1.05);', 'stand-in, at dusk by a filter'
        eyebrow, head, sub = 'The Great Work is closed', 'Emperor Taizong <i style="color:var(--gilt-hi)">wins</i>', 'He closed the Great Work in Chang\'an on turn <span class="n">212</span>. Your realm stands, with <span class="n">5</span> beads of <span class="n">7</span>.'
        mark = mk('moon', 30, 'var(--gilt-hi)')
    frame = '<div class="fr1"></div><div class="fr2"></div>' if win else '<div class="abs" style="inset:10px;border:1px solid rgba(200,144,31,.55)"></div>'
    wincls = 'lap' if win else 'dark'
    inner = f'''{frame}
<div class="abs" style="left:52px;top:52px"><div class="pw im-{img} {wincls}" style="width:496px;height:279px;{filt}"></div><span class="cap" style="left:6px;top:6px">{lab}</span></div>
<div class="abs" style="left:52px;top:356px;width:450px;color:#f7f2e1"><div class="lbl" style="color:var(--gilt-hi)">The abacus at the close</div>{rods(win)}</div>
<div class="abs" style="left:592px;top:60px;width:360px;color:#f7f2e1">{mark}<div style="font-family:var(--cn);font-size:14px;letter-spacing:.08em;color:var(--gilt-hi);margin-top:14px">{eyebrow}</div><div style="font-family:var(--disp);font-size:44px;line-height:1.04;margin-top:4px">{head}</div><div style="font-family:var(--disp);font-size:17px;line-height:1.35;color:#e6dfcf;margin-top:10px">{sub}</div>
<div style="border-top:1px solid var(--gilt);margin-top:18px;padding-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center"><div><div class="n" style="font-size:19px;font-weight:600">11</div><div class="lbl" style="color:#cfc8b8">towns</div></div><div><div class="n" style="font-size:19px;font-weight:600">6</div><div class="lbl" style="color:#cfc8b8">wonders</div></div><div><div class="n" style="font-size:19px;font-weight:600">1,480</div><div class="lbl" style="color:#cfc8b8">renown</div></div></div></div>
<div class="abs" style="right:48px;bottom:44px;display:flex;gap:10px"><span class="btn gl">Back to the title</span><span class="btn gl">Look at the board</span><span class="btn pri">See the Abacus</span></div>'''
    return stage(1000, 520, inner, page)

# ---------------------------------------------------------------- small things
def strip():
    def cell(x, y, label, body, w=None):
        ws = f'width:{w}px;' if w else ''
        return f'<div class="abs" style="left:{x}px;top:{y}px;{ws}"><div class="lbl" style="margin-bottom:6px;white-space:nowrap">{label}</div>{body}</div>'
    tip = f'''<div class="tip panel" style="position:relative"><dl><dt>Terrain</dt><dd><b style="font-family:var(--name)">Desert</b></dd><dt>Feature</dt><dd>Floodplain</dd><dt>Yields</dt><dd><span class="n" style="color:var(--f)">4{F}</span> <span class="n" style="color:var(--p)">2{P}</span></dd></dl></div>'''
    t_plain = '<div class="toast panel" style="position:relative;left:0;transform:none;padding:6px 14px"><small>TURN 101</small><span>Cusco grew to <span class="n">13</span> citizens.</span></div>'
    t_held = f'''<div class="toast panel" style="position:relative;left:0;transform:none">{dev('s-coin','seal')}<small>TURN 101</small><span>A new Order: <span class="held-name">The Market Halls</span>.</span></div>'''
    t_paint = f'''<div class="toast panel rich" style="position:relative;left:0;transform:none;padding:5px 14px 5px 6px">{pw('greatLibrary', 64, 36, 'thin', label='')}<small>TURN 101</small><span><span class="held-name">The Great Library</span> is finished.</span></div>'''
    head = '<div class="panel" style="width:260px;overflow:hidden"><div class="sh" style="padding:10px 12px 8px"><span class="sh-title" style="font-size:22px">The <i>Ledger</i></span><span class="sp"></span><span class="hint"><span class="kbd">Esc</span></span><span class="x">×</span></div><div class="hr-q"></div><div style="height:22px"></div></div>'
    head2 = '<div class="panel" style="width:260px;overflow:hidden"><div class="sh" style="padding:10px 12px 8px"><span class="sh-title" style="font-size:22px">The <i>Ledger</i></span><span class="sp"></span><span class="hint"><span class="kbd">Esc</span></span><span class="x">×</span></div><div class="hr-r"></div><div style="height:22px"></div></div>'
    btns = '<div style="display:flex;gap:8px;align-items:center;width:640px"><span class="btn">Pass</span><span class="btn pri">Confirm</span><span class="btn sm">Cancel</span><span class="btn off">Revert</span><span class="btn war">Declare war</span><span style="background:var(--deep-lapis);padding:8px 10px;border-radius:4px"><span class="btn gl">Continue <span class="kbd">⏎</span></span></span></div>'
    ychips = ''.join(f'<span class="chip" style="color:var(--{c});border-color:currentColor;font-weight:600;font-size:12px">+{v}{i}</span> ' for c, i, v in (('f', F, 21), ('p', P, 44), ('g', G, 12), ('s', SC, 4))) + f'<span class="chip" style="font-weight:600;font-size:12px">+2{yi("happy")}</span>'
    kw = f'''<div style="font-size:13.5px;line-height:1.9;width:320px">Opens <u style="text-decoration-style:dotted;text-underline-offset:3px">{mk('star', 10, 'var(--lapis)', 'margin-right:3px')}Mathematics</u> and needs <u style="text-decoration-style:dotted;text-underline-offset:3px">Iron</u>.<br>Paid by <span style="white-space:nowrap">{dev('s-coin', '', 'width:15px;height:15px;color:var(--deep-gilt);vertical-align:-3px')} <span class="held-name" style="font-size:14.5px;border-bottom:1px solid var(--gilt)">The Market Halls</span></span> and <span style="white-space:nowrap">{dev('i-bld', '', 'width:15px;height:15px;color:var(--deep-gilt);vertical-align:-3px')} <span class="held-name" style="font-size:14.5px;border-bottom:1px solid var(--gilt)">The Pyramids</span></span>.</div>'''
    card = f'''<div class="turncard" style="position:relative;width:230px">{mk('sun', 20, 'var(--deep-gilt)')}<div class="lbl" style="margin-top:6px">Turn <span class="n">102</span> · Æra III</div><div style="font-family:var(--disp);font-size:26px;line-height:1.1;margin-top:2px">Pachacuti</div><div style="font-size:12.5px;color:var(--soft);margin:6px 0 10px">Rhetoric is known. A caravan came home.</div><span class="btn pri">Begin the turn</span></div>'''
    marks = f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 24px;font-size:13px;width:600px"><span>{mk('sun', 16, 'var(--deep-gilt)', 'vertical-align:-3px;margin-right:8px')}yours, or ready: End turn, your seat</span><span>{mk('moon', 16, 'var(--deep-gilt)', 'vertical-align:-3px;margin-right:8px')}another court, or waiting</span><span>{mk('star', 16, 'var(--deep-gilt)', 'vertical-align:-3px;margin-right:8px')}a capital, and a list mark</span><span>{mk('star', 16, 'var(--lapis)', 'vertical-align:-3px;margin-right:8px')}flat lapis star: a technology</span></div>'''
    inner = (cell(24, 18, 'A tooltip: always plain', tip) + cell(290, 18, 'A toast that tells: plain', t_plain) + cell(290, 84, 'A toast about a thing you hold: its seal', t_held) + cell(290, 156, 'A toast about a painted thing: its picture', t_paint)
             + cell(716, 18, 'A sheet head, quiet', head) + cell(716, 126, 'A sheet head, richer', head2)
             + cell(24, 250, 'Buttons: plain. The next step is cinnabar. Gilt outline only on lapis or cloth.', btns) + cell(24, 338, 'Yield chips: flat, mono, the yield colour', f'<div style="display:flex;gap:5px">{ychips}</div>')
             + cell(24, 404, 'Keywords: plain for a technology or a resource, a seal for a held thing', kw)
             + cell(24, 496, 'The three marks', marks, 600)
             + cell(716, 250, 'The turn card', card))
    return stage(1000, 570, inner, '', 'background:var(--table)')

def gov_fallback():
    a = pw('forbiddenCity', 330, 110, label='with a painting', inner='<div class="fall" style="padding:26px 10px 5px"><span style="font-family:var(--cn);font-size:21px">The Imperium</span></div>', style='background-position:50% 42%;')
    b = f'''<div class="pw fb" style="width:330px;height:110px;display:flex;align-items:center;justify-content:center;gap:16px"><svg style="width:84px;height:84px;color:var(--deep-gilt)" viewBox="0 0 100 100"><use href="#dev"/><use href="#s-crown" x="25" y="25" width="50" height="50"/></svg><span><span style="font-family:var(--cn);font-size:22px;display:block;line-height:1">The Imperium</span><span class="lbl">tier <span class="n">18</span></span></span></div>'''
    return stage(1000, 150, f'<div class="abs" style="left:120px;top:20px">{a}</div><div class="abs" style="left:550px;top:20px">{b}</div>', '', 'background:var(--parch)')

# ---------------------------------------------------------------- the page
def today(img, cap, alt):
    return f'<figure class="today"><img src="{uri("now-" + img + ".jpg")}" alt="{alt}" loading="lazy"><figcaption><span class="tag">today</span>{cap}</figcaption></figure>'

def sub(fid, tag, cls, title, note, body):
    return f'<div class="sub" id="{fid}"><h3><span class="tag {cls}">{tag}</span>{title}</h3><p>{note}</p>{body}</div>'

def frame(n, title, lede, changed, slot, cost, body):
    cost_html = f'<p class="cost"><b>Cost to build or to draw:</b> {cost}</p>' if cost else ''
    return f'''<section class="frame" id="frame-{n}"><h2><span class="tag">{n}</span>{title}</h2><p>{lede}</p>
<div class="notes"><div><b>What changed</b>{changed}</div><div><b>Splash art slot</b>{slot}</div></div>{cost_html}{body}</section>'''

def build():
    css = open(os.path.join(HERE, 'board.css')).read()
    fonts = "@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Fraunces:opsz,wght@9..144,400..700&family=Instrument+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400;500;600&family=EB+Garamond:ital,wght@0,400..700;1,400..600&family=IM+Fell+English+SC&display=swap');"
    out = ['<title>Quiet Table Second Pass</title>', f'<style>{fonts}{css}{image_css()}</style>', SYMBOLS, EXTRA_SYMBOLS, '<div class="page">']
    out.append('''<h1>Quiet Table, <i>second pass</i></h1>
<p class="lede">One board for the whole game. The working interface stays plain. The arcane look marks what you hold and the big moments. This pass takes the arcane look further than the first Quiet Table did, and it gives every painting a fixed place.</p>
<p>The first Quiet Table had one rule: if a thing tells you something, it is plain; if you hold it, it is engraved. This pass keeps that rule and adds three things.</p>
<ul class="qs">
<li><b>A third material for moments and faces.</b> The lapis ribbon of the wonder plate becomes a part of the kit. It appears at three weights: a hairline under a sheet head, a band behind a face, and the full sash behind a painting.</li>
<li><b>One window for every painting.</b> An ink line, a gap of paper, then a gilt line. The same window holds the fallback when there is no painting, so no screen has two layouts.</li>
<li><b>Two more card forms.</b> A great person is a tall card with an arched window for a face. A government is a banner. Resources, technologies, buildings and units stay plain.</li>
</ul>
<p>Your paintings share three colours with the game: the lapis of the sky, the cream of the stone and the orange of the light. The interface already has lapis, parchment and cinnabar. So a painting sits well on a parchment sheet and on the lapis ribbon. It sits badly on the dark cloth. For that reason the dark cloth stays on the Council, In play and the star chart, and goes no further.</p>
<p>Where the amount of arcane is a real choice, the frame is drawn twice: <span class="tag q">quiet</span> and <span class="tag r">richer</span>. Comment by id, for example "frame-2-richer".</p>
<p class="small">The "today" pictures are from the current build (branch decks, 19 November), a bot game at turn 101, at 1440 by 900. The age plate and the Opus close are pictures from 18 November. The mock-ups are drawn in HTML at 1000 px wide. The map behind them is a screenshot. The typefaces load from Google Fonts and are the game's own six faces; if your browser blocks them, a close system stack takes their place. Card texts, costs and figures are samples.</p>
<nav class="nav"><a href="#frame-1">1 HUD</a><a href="#frame-2">2 City</a><a href="#frame-3">3 Star chart</a><a href="#frame-4">4 Working sheet</a><a href="#frame-5">5 Diplomacy</a><a href="#frame-6">6 Great person</a><a href="#frame-7">7 Government</a><a href="#frame-8">8 Age plate</a><a href="#frame-9">9 Title and ending</a><a href="#frame-10">10 Small things</a><a href="#slots">Art slots</a><a href="#rules">Rules</a><a href="#build">Build order</a><a href="#questions">Questions</a></nav>''')

    out.append(frame(1, 'The HUD on the map',
        'The map is the brightest and busiest thing in the game, so the HUD changes least. The ink bar, the flat panels, the mono figures and the cinnabar End turn all stay.',
        'A toast about a thing you hold carries that thing\'s seal or its painting. A toast that only tells stays plain. A dispatch shows the leader\'s face. In the richer level, a panel gets a gilt hairline, the draft line gets a small card back, the research line gets a flat lapis star, and End turn gets the sun.',
        'Wonder thumbnail, 16:9, 64 by 36 px, in a toast. Leader face, a circle of 28 px, in a dispatch. Fallbacks: the engraved seal, and the seat\'s charge on its colour.',
        'Small. The thumbnails need small files (see the art slots table). No new layout.',
        today('hud', 'The map screen. The corner panel, a tooltip, the list of things to do, a dispatch and the End turn button.', 'The map screen today')
        + sub('frame-1-quiet', 'quiet', 'q', 'Seals only', 'Today\'s HUD. The wonder toast has an engraved seal. The second toast only tells, so it is plain. The dispatch has a face.', hud(False))
        + sub('frame-1-richer', 'richer', 'r', 'Gilt hairlines, a picture in the toast, the sun on End turn', 'The corner panel and the dispatch get the ink and gilt edge. The wonder toast shows its painting. The tooltip marks a card with its seal. The town banners and the tooltip layout do not change.', hud(True))))

    out.append(frame(2, 'The city screen',
        'This is the screen you most want a pass on. It is a working screen, so it stays on paper. The wonders are the only held things in it, and they bring the paintings.',
        'The head is one line with the × to close, in place of the "Leave the town" pill. The left panel becomes one list: growth, borders, citizens, buildings, wonders here. A wonder in the build list has a small window for its painting. The item in work shows a 2:1 window when it is a wonder. In the richer level, the item in work is an engraved plate, the wonders here are the same pieces as on In play, and the head has the ribbon hairline.',
        'Wonder, 16:9 thumbnail (80 by 45 px) in a list row. Wonder, 2:1 centre band (168 by 84 px or larger) for the item in work and for a held wonder. Count: 34, all painted. Fallback: the engraved seal in the same window.',
        'Medium. The layout changes, so it needs the full design pass that the beta checklist asks for; this frame is a start, not that pass. A list of wonders must load thumbnails, not the full paintings: 34 full files in a scrolling list would be slow.',
        today('city', 'The city screen. The head, the growth panel, the specialists and faith panels, and the build list.', 'The city screen today')
        + sub('frame-2-quiet', 'quiet', 'q', 'Plain panels, paintings in small windows', 'Every panel is flat paper. A wonder is the only row with a picture and an engraved name.', city(False))
        + sub('frame-2-richer', 'richer', 'r', 'An engraved plate for the item in work, pieces for the wonders here', 'The plate and the pieces are the forms the In play screen already has. The rows of units and buildings stay plain in both levels.', city(True))))

    out.append(frame(3, 'The technology screen',
        'The star chart is the art of this screen and it does not change. This frame shows only the frame, the × and the panel of a selected technology. The chart behind is a sketch.',
        'The frame is the double gilt hairline of the plates. The head has the ribbon hairline. The selected technology opens a paper panel: information is on paper on every screen, also on a dark one. A technology has no seal and is never a card; its mark is a flat lapis star. The next step, Research, is at the bottom right in cinnabar.',
        'None for a technology. The panel shows the 16:9 thumbnail of a wonder that the technology opens. Fallback: the wonder\'s seal.',
        'Small. The panel is new; the chart is not touched.',
        today('tech', 'The star chart. A technology shows what it opens inside its own box, and there is no panel.', 'The technology screen today')
        + sub('frame-3-proposed', 'proposed', '', 'A paper panel on the chart', 'Rhetoric is selected. The panel says what it costs and what it opens.', tech())))

    out.append(frame(4, 'A working sheet: caravans and roads',
        'A sheet of figures stays plain. It takes two things from the kit: the head rule and the × to close. It has no seal, no gilt in the table and no lapis.',
        'The four folder tabs become four filter chips with counts, the same control as in the city build list. The running routes get a total line. The figures are mono and aligned to the right. The Ledger and the standings follow the same pattern.',
        'None. A working sheet carries no painting.',
        'Small. It is a restyle of the head and the tabs.',
        today('trade', 'The caravans sheet with its four tabs.', 'The trade screen today')
        + sub('frame-4-proposed', 'proposed', '', 'Dense data stays plain', 'One level only. If the richer level is chosen for the sheet heads, the ink and gilt rule under the title becomes the ribbon hairline, and nothing else changes.', trade())))

    out.append(frame(5, 'Diplomacy with a leader',
        'A leader is a face, so this is a painting\'s place. The exchange is working data, so it stays plain and keeps today\'s three columns.',
        'A 3:4 portrait stands where the small crest is today. The list of courts shows each face as a small circle. In the richer level, the portrait stands on the ribbon as a wonder does, and the leader\'s name is on the band. The moon on the band marks another court. Propose is at the bottom right.',
        'Leader portrait, 3:4. Three sizes: 204 by 272 px here and at setup, 72 by 96 px on the turn card, a 28 px circle in lists and dispatches. Count: one for each leader. Fallback: the seat\'s charge on a parchment canton over the seat\'s colour, engraved.',
        'Small for the window. The portraits are the cost: one painting for each leader.',
        today('diplo', 'Foreign courts. The leader is a small crest and a name at the top right.', 'The diplomacy sheet today')
        + sub('frame-5-quiet', 'quiet', 'q', 'The portrait in a window on paper', 'The sheet is today\'s sheet with a portrait column.', diplo(False))
        + sub('frame-5-richer', 'richer', 'r', 'The portrait on the ribbon', 'The band takes 84 px of height from the exchange. The paper column is shorter, and the last word moves under the portrait.', diplo(True))
        + sub('frame-5-fallback', 'fallback', '', 'The same window with no painting', 'The charge is the fallback at every size. A list can mix painted and unpainted leaders.', diplo_fallback())))

    out.append(frame(6, 'The great person recruit offer',
        'This is where the card motif grows. You choose a great person from three and you hold the legacy, so a great person is a card. Its form is not an Order\'s form: it is taller, and it has an arched window for a face.',
        'The three plain panels become three engraved cards. The family is the colour of the card\'s edge and the label at its top. The legacy text has the red figures of an Order card. The flavour line is labelled. The same card, smaller, goes in the Reliquary and in the legacies stack of In play.',
        'Great person portrait, about 5:6 (150 by 180 px), with an arched top. Count: one for each person; about 20 cover the people a first game meets. Fallback: the family\'s emblem as a large engraved seal, as on the third card.',
        'Medium. A new card component, used in three places (the offer, the Reliquary, In play). The portraits can arrive one at a time.',
        today('great', 'The offer today: three plain panels with a family mark.', 'The great person offer today')
        + sub('frame-6-quiet', 'quiet', 'q', 'The cards on a paper sheet over the map', 'The offer keeps its paper sheet. The cards are the only engraved things. The middle card is chosen.', great(False))
        + sub('frame-6-richer', 'richer', 'r', 'The cards on the cloth', 'The offer opens on the dark cloth of the Council screen, so an offer looks like a hand that is dealt to you. This level would apply to the Order draft too.', great(True))))

    out.append(frame(7, 'Government adoption',
        'Today the three governments are three cards in the common offer sheet (the picture shows that sheet with an Order draft, because this game had no charter ready). A government is the one choice you cannot take back, so it gets a larger form: a banner.',
        'Each government is one row with a 3:1 banner, what it does in plain lines, its chairs as small card shapes, and the figure it would pay with the cards you keep. The chosen row has a gilt ring. The warning is one short line at the foot, beside the button.',
        'Government banner, 3:1 (330 by 110 px). Count: one for each government in play (13 rows today, Chiefdom included). Fallback: the government\'s emblem as an engraved seal with its name and tier, as on the first row.',
        'Small to medium. A new row layout in the existing offer sheet. The same banner can head the government card on the Council screen later.',
        today('offer', 'The common offer sheet, here with an Order draft. A charter uses the same sheet with three government cards.', 'The offer sheet today')
        + sub('frame-7-proposed', 'proposed', '', 'Three banners', 'The Merchant League has no painting in this mock-up, to show the fallback in place.', gov())
        + sub('frame-7-fallback', 'fallback', '', 'The banner with and without a painting', 'The fallback keeps the size of the row.', gov_fallback())))

    out.append(frame(8, 'The age plate with a painting',
        'An age opens four times in a game. The painting here is a wonder painting as a stand-in. Two forms are drawn.',
        'Form A puts the painting on the ribbon over the dimmed board, as the wonder plate does. Form B keeps today\'s lapis page and puts the painting in a window at its top, with the age numeral on a medal. <b>I recommend B.</b> You approved the lapis page as a big moment. With B, the two moments are easy to tell apart: a wonder is a ribbon over the board (34 in a game), and an age is a full page (4 in a game). With A, an age looks like one more wonder.',
        'Age plate, 16:9 (560 by 315 px in B; 720 by 405 px in A). Count: one for each age (five). Fallback: today\'s lapis page with the large numeral, which is finished as it is.',
        'Small. Both forms reuse the wonder plate\'s window. B is a change to one page.',
        today('age', 'The age plate today: the lapis page, with no picture.', 'The age plate today')
        + '<figure class="today"><img src="' + uri('now-wonderplate.jpg') + '" alt="The wonder plate today" loading="lazy"><figcaption><span class="tag">today</span>The wonder plate, for comparison: the painting on the ribbon over the board.</figcaption></figure>'
        + sub('frame-8-ribbon', 'A', '', 'On the ribbon, over the board', 'The same form as a wonder. The numeral and the tally are on the foot of the painting.', age_ribbon())
        + sub('frame-8-page', 'B', 'r', 'On its own page (recommended)', 'The lapis page with a painting window. The sun and the moon stand beside the window.', age_page())))

    out.append(frame(9, 'The title screen and the ending',
        'These are the first and the last picture of a game. Each has one painting.',
        'The title: the painting is the full width of the window and the title is on its sky. The ribbon is the seam between the painting and the paper. The menu is one row of plain buttons, with New game in cinnabar. The ending: one layout for a win and a loss. A win is on the lapis page with the sun. A loss is on the dark cloth with the moon, and the painting is at dusk.',
        'Title, one painting, wide (about 5:2 visible, from a 16:9 file). Fallback: today\'s banner. Ending, 16:9 (496 by 279 px): one painting for a win and one for a loss, or one painting with a dusk filter for the loss. Fallback: the abacus alone, as today.',
        'Small for the title. Medium for the ending: the page is new, and the 3D abacus stays the next screen ("See the Abacus"). The rods in this frame are flat drawings of the count.',
        today('title', 'The title screen. It has a painting in a banner already.', 'The title screen today')
        + sub('frame-9-title', 'proposed', '', 'The title screen', 'The painting takes the upper two thirds. The lower third is plain paper with the menu.', title())
        + today('opus', 'The Opus close today (picture of 18 November): the abacus page.', 'The Opus close today')
        + sub('frame-9-victory', 'proposed', '', 'The ending: you close the Great Work', 'The lapis page. The painting is on the left, the result is on the right, and the count of beads is below.', ending(True))
        + sub('frame-9-defeat', 'proposed', '', 'The ending: another magister closes it', 'The same layout on the dark cloth. The painting is a stand-in with a filter; a painted dusk scene would be better.', ending(False))))

    out.append(frame(10, 'Small things: the rules of the look in one strip',
        'Every small part, drawn once. These are the parts that make the other frames consistent.',
        'Nothing here is new in shape. The strip fixes which parts are plain and which carry a seal, a painting or gilt.',
        'Only the toast for a painted thing (16:9 thumbnail).',
        '',
        sub('frame-10-strip', 'proposed', '', 'The kit', 'A tooltip never changes. A button is flat. The next step is cinnabar and sits at the bottom right. Gilt on a button appears only on lapis or on the cloth.', strip())))

    out.append('''<section class="frame" id="slots"><h2>The splash art slots</h2>
<p>Every slot uses the one window, and every slot has a fallback that looks finished. The files should be served in two sizes: the full painting for a plate, and a thumbnail of about 320 px for lists and toasts.</p>
<div class="tbl"><table><thead><tr><th>Slot</th><th>Shape</th><th>Size on screen</th><th>Count</th><th>Fallback</th><th>Frame</th></tr></thead><tbody>
<tr><td>Wonder, plate</td><td class="n">16:9</td><td class="n">about 1100 px wide</td><td class="n">34, painted</td><td>The lapis page with the engraved seal</td><td>built</td></tr>
<tr><td>Wonder, piece and item in work</td><td class="n">2:1 centre band</td><td class="n">96 to 184 px wide</td><td class="n">same 34</td><td>The seal</td><td>2</td></tr>
<tr><td>Wonder, list row and toast</td><td class="n">16:9</td><td class="n">64 to 80 px wide</td><td class="n">same 34</td><td>The seal</td><td>1, 2, 3</td></tr>
<tr><td>Leader</td><td class="n">3:4</td><td class="n">204, 72 and a 28 px circle</td><td class="n">one a leader</td><td>The seat's charge on its colour</td><td>1, 5</td></tr>
<tr><td>Great person</td><td class="n">5:6, arched</td><td class="n">150 by 180 px</td><td class="n">about 20 to start</td><td>The family emblem as a seal</td><td>6</td></tr>
<tr><td>Government</td><td class="n">3:1</td><td class="n">330 by 110 px</td><td class="n">13</td><td>The emblem, the name and the tier</td><td>7</td></tr>
<tr><td>Age</td><td class="n">16:9</td><td class="n">560 by 315 px</td><td class="n">5</td><td>Today's lapis page</td><td>8</td></tr>
<tr><td>Title</td><td class="n">16:9, shown wide</td><td class="n">full width</td><td class="n">1</td><td>Today's banner</td><td>9</td></tr>
<tr><td>Ending</td><td class="n">16:9</td><td class="n">496 by 279 px</td><td class="n">1 or 2</td><td>The abacus alone</td><td>9</td></tr>
</tbody></table></div>
<p class="small" style="margin-top:10px">Not drawn on this board: belief vignettes (they wait for the belief marks), a capital taken and a seat eliminated (they can reuse the ribbon plate with one generic painting each), and discovery claims.</p></section>''')

    out.append('''<section class="frame" id="rules"><h2>The rules of the style</h2>
<div class="reco"><ol>
<li><b>Paper is the working interface.</b> Panels, sheets, lists, tables, tooltips and buttons are flat parchment with ink text. Every counted figure is tabular mono.</li>
<li><b>Engraving marks what you hold.</b> An Order, a Doctrine, a government, a wonder, a belief, a great person and a legacy have an engraved card, piece or seal. Their names are in the small-caps card face.</li>
<li><b>A technology, a resource, a building and a unit are never engraved.</b> They are rows with a flat mark.</li>
<li><b>Lapis and gilt mark a moment or a face.</b> The ribbon has three weights: a hairline under a sheet head, a band behind a portrait, the full sash behind a plate. A full lapis page is for an age and for a win.</li>
<li><b>Gilt is a hairline, never a fill,</b> outside a card. It frames a painting, edges a panel that holds a held thing, and outlines a button on lapis or cloth.</li>
<li><b>A painting appears only in the window</b> (ink line, gap, gilt line), and only for a wonder, a leader, a great person, a government, an age, the title and the ending. Never on a control, a table or a tooltip.</li>
<li><b>Every window has a fallback of the same size:</b> a seal, an emblem or a charge on an engraved ground.</li>
<li><b>The dark cloth is the card table:</b> the Council, In play and the star chart. It goes no further, unless you choose the richer offer (frame 6).</li>
<li><b>The sun, the moon and the star have meanings:</b> yours or ready, another court or waiting, a capital or a list mark.</li>
<li><b>These never change:</b> the ink top bar, the cinnabar End turn, the next step at the bottom right, the × to close, plain words, and the town banners on the map.</li>
</ol></div></section>

<section class="frame" id="build"><h2>What I recommend, and a build order</h2>
<p><b>Levels.</b> Take <b>quiet for the HUD</b> (frame 1), with one part of the richer level: the painting in the wonder toast. The HUD is on the map all game and the map must stay the brightest thing. Take <b>richer for the city screen and for diplomacy</b> (frames 2 and 5): you step away from the board there, and the forms are ones the game already has. Take <b>quiet for the offers</b> (frame 6): a paper sheet over the map keeps the board in view while you choose. Take <b>form B for the age plate</b> (frame 8).</p>
<div class="tbl"><table><thead><tr><th>Stage</th><th>What</th><th>Size</th><th>Needs</th></tr></thead><tbody>
<tr><td>1 · The kit</td><td>The painting window with its fallback as one component. The head rule and the × on every sheet. The seal and the painting in toasts. Thumbnails of the 34 wonder paintings.</td><td>Small</td><td>Nothing new from you</td></tr>
<tr><td>2 · Wonders in lists</td><td>The painting in the city build list, on the item in work, and in the star chart's panel. The star chart's panel itself.</td><td>Small to medium</td><td>Stage 1</td></tr>
<tr><td>3 · The city screen</td><td>The full design pass on the city screen, from frame 2 at the level you choose.</td><td>Medium to large</td><td>Your choice of level; a second board for the layout</td></tr>
<tr><td>4 · The working sheets</td><td>Caravans, the Ledger, standings, saves: the head, the chips in place of tabs, the tables.</td><td>Small</td><td>Stage 1</td></tr>
<tr><td>5 · The great person card</td><td>The new card in the offer, the Reliquary and In play, with the emblem fallback.</td><td>Medium</td><td>Portraits can come later</td></tr>
<tr><td>6 · The government banner</td><td>The banner rows in the offer sheet, with the emblem fallback.</td><td>Small to medium</td><td>Banners can come later</td></tr>
<tr><td>7 · Faces</td><td>The portrait window in diplomacy, on the turn card, in dispatches and lists, with the charge fallback.</td><td>Medium</td><td>The leader design pass; portraits can come later</td></tr>
<tr><td>8 · The age plate, the title and the ending</td><td>The painting window on the age page. The wide title. The ending page for a win and a loss.</td><td>Medium</td><td>Five age paintings, one title painting, one or two ending paintings</td></tr>
</tbody></table></div>
<p class="small" style="margin-top:10px">Stages 1, 2 and 4 need no new art and no new decision past this board. Each stage is gated and landed on its own.</p></section>

<section class="frame" id="questions"><h2>Questions for you</h2>
<ol class="qs">
<li><b>Which level for each of the three screens with two?</b> The HUD (frame 1), the city screen (frame 2) and diplomacy (frame 5). My choice is quiet, richer, richer.</li>
<li><b>Should an offer open on paper over the map, or on the dark cloth?</b> (Frame 6.) The choice applies to the Order draft, the great person offer and the charter.</li>
<li><b>Is the great person card right as a third card form,</b> with the arched window, or should a great person look more like an Order card?</li>
<li><b>The age plate: form B (its own page) or form A (the ribbon)?</b> And should a loss get its own painted dusk scene, or the win's painting with a filter?</li>
</ol></section>''')

    out.append('''</div><script>
(function(){function fit(){document.querySelectorAll('.fit').forEach(function(f){var s=f.firstElementChild,w=+s.dataset.w,h=+s.dataset.h;f.classList.add('js');var k=Math.max(Math.min(1,f.clientWidth/w),0.62);s.style.transform='scale('+k+')';f.style.height=Math.round(h*k)+'px';s.style.marginBottom=Math.round(h*k-h)+'px';s.style.marginRight=Math.round(w*k-w)+'px';f.style.overflowX=w*k>f.clientWidth+1?'auto':'hidden';s.style.marginLeft=Math.max(0,(f.clientWidth-w*k)/2)+'px';});}
fit();addEventListener('resize',fit);})();
</script>''')
    html = '\n'.join(out)
    open(os.path.join(HERE, 'quiet-table-second-pass.html'), 'w').write(html)
    open(os.path.join(HERE, 'preview.html'), 'w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + '</body></html>')
    print('ok', round(len(html) / 1e6, 2), 'MB')

if __name__ == '__main__':
    build()
