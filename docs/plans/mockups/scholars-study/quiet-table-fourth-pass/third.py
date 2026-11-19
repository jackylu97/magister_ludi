#!/usr/bin/env python3
"""Builds quiet-table-third-pass.html: the third pass of the Quiet Table board.

Run: python3 build.py
Reads board.css, extra.css, symbols.py, base.py (the second pass's drawing
code, used as a library) and the pictures in img/. Every picture goes into the
page as a data: URI. preview.html is the same content in a full document.

The pictures in img/ are not kept in the repo (about 3 MB). To build again:
- p-<wonder>.jpg, t-<wonder>.jpg, map-wide.jpg, map-close.jpg: see base.py.
- now-<screen>.jpg: screenshots of the game at 1440 by 900 through
  `sips -Z 1280` (city, cityold, diplo, great, offer, faith1, faith2, faith3,
  setup, unit, reliquary).
"""
import os
import base as B
from base import (uri, yi, ic, dev, mk, stage, veil, pw, fb, FACE, F, P, G, SC, CU, FA,
                  topbar, tb, BANNERS, great, gov, gov_fallback, age_ribbon, ending, gp, chairs, today, sub)

HERE = os.path.dirname(os.path.abspath(__file__))
OX = '#7a1f14'  # the war button's ground: darker than the cinnabar of the next step

def seal_dot(size=13, col='var(--deep-gilt)'):
    """The small, simple seal: a ring and a centre. No rays, no hatching."""
    return f'<svg class="mk" style="width:{size}px;height:{size}px;color:{col}" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg>'

def owner_row(name='Pachacuti', col='#8f1f33'):
    return f'<dt>Owner</dt><dd><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:{col};margin-right:6px"></i>{name}</dd>'

# ================================================================ Part A
def hud3():
    corner = f'''<div class="corner panel"><div class="top"><div><div class="pennant"><i>{ic('m-sun','')}</i></div><div style="text-align:center;margin-top:3px"><span class="kbd">Q</span></div></div>
<div><div class="ln"><u>Satrapies →</u><span class="n">4t</span></div><div class="pb"><i style="width:22%;background:var(--lapis)"></i></div><div class="ln"><u>Next draft →</u><span class="n">3t</span></div><div class="pb"><i style="width:40%;background:var(--c)"></i></div></div></div>
<div class="doors"><span>{ic('i-flag','')}</span><span>{ic('i-route','')}4/5</span><span>{ic('y-faith','')}67</span><span>{ic('i-cards','')}22</span><span>{ic('i-rank','')}</span></div></div>'''
    toast1 = f'''<div class="toast panel" style="top:46px;padding:6px 14px;gap:8px">{seal_dot()}<small>TURN 101</small><span>A new Order: <span class="held-name">The Market Halls</span>.</span></div>'''
    toast2 = '''<div class="toast panel" style="top:86px;padding:6px 14px"><small>TURN 101</small><span>Cusco grew to <span class="n">13</span> citizens.</span></div>'''
    tip = f'''<div class="tip panel" style="left:12px;bottom:14px"><dl><dt>Terrain</dt><dd><b style="font-family:var(--name)">Coast</b></dd><dt>Water</dt><dd>Coastal</dd>{owner_row()}
<dt>Yields</dt><dd><span class="n" style="color:var(--f)">1{F}</span> <span class="n" style="color:var(--g)">3{G}</span><div style="border-top:1px solid var(--rule);margin-top:3px;padding-top:3px;color:var(--soft);font-size:12px"><span class="n" style="color:var(--f)">1{F}</span> <span class="n" style="color:var(--g)">1{G}</span> Coast<br><span class="n" style="color:var(--g)">+1{G}</span> Lighthouse<br><span class="n" style="color:var(--g)">+1{G}</span> Order · The Gilded Country</div></dd></dl></div>'''
    dispatch = f'''<div class="panel" style="position:absolute;right:14px;bottom:72px;display:flex;align-items:center;gap:8px;padding:6px 12px;font-size:13px"><svg style="width:15px;height:15px;color:var(--rubric)"><use href="#i-mail"/></svg><span><span class="n" style="color:var(--rubric)">1</span> offer waiting</span></div>'''
    end = '<button class="endturn">End turn <span class="kbd">⏎</span></button>'
    lens = '<div class="panel" style="position:absolute;right:238px;bottom:14px;height:44px;padding:0 12px;display:grid;place-items:center;text-align:center;font-weight:600;line-height:1.1"><span class="lbl" style="font-size:9.5px">Lens</span>off</div>'
    return stage(1000, 600, topbar(False) + corner + ''.join(tb(*b) for b in BANNERS) + toast1 + toast2 + tip + dispatch + lens + end, 'map-wide')

def trade3():
    h = B.trade()
    old = h[h.index('<span class="chip on">Running'):h.index('<span style="flex:1"></span><span style="font-size:12px;color:var(--faint)">Next hire')]
    new = '<span class="chip">Recommended <span class="n">2</span></span><span class="chip on">Running <span class="n">4</span></span><span class="chip">All routes <span class="n">6</span></span><span class="chip">Unavailable <span class="n">200</span></span>'
    h = h.replace(old, new).replace('<th>Can set out</th>', '<th>Recommended</th>')
    assert 'Shut' not in h and 'Can set out' not in h
    return h

def tech_hint():
    frame = '<div class="abs" style="inset:8px 8px -30px 8px;border:1px solid var(--gilt);border-radius:6px"></div>'
    head = f'''<div class="abs" style="left:26px;right:26px;top:24px;display:flex;align-items:center;gap:14px;color:#f1e9d2"><span class="sh-title" style="font-size:28px">Natural Philosophy</span><span style="flex:1"></span><span class="n" style="font-size:11.5px;color:#a9a294">Click a technology to research toward it · <span class="kbd">shift</span>-click to add it to the plan · drag or <span class="kbd">←</span><span class="kbd">→</span><span class="kbd">↑</span><span class="kbd">↓</span> to move</span><span class="x">×</span></div>'''
    return stage(1000, 84, frame + head, '', 'background:#15131a')

def title3():
    h = B.title()
    assert 'one seed · one world' in h
    return h.replace('one seed · one world', 'a game for the ages')

def war_button(label='Declare war', style=''):
    return f'<span class="btn" style="background:{OX};color:#fbf3e2;border:2px solid var(--ink);gap:8px;{style}"><svg style="width:14px;height:14px"><use href="#c-sword"/></svg>{label}</span>'

def strip3():
    def cell(x, y, label, body, w=None):
        ws = f'width:{w}px;' if w else ''
        return f'<div class="abs" style="left:{x}px;top:{y}px;{ws}"><div class="lbl" style="margin-bottom:6px;white-space:nowrap">{label}</div>{body}</div>'
    tip1 = f'''<div class="tip panel" style="position:relative"><dl><dt>Terrain</dt><dd><b style="font-family:var(--name)">Desert</b></dd><dt>Feature</dt><dd>Floodplain</dd>{owner_row()}<dt>Yields</dt><dd><span class="n" style="color:var(--f)">4{F}</span> <span class="n" style="color:var(--p)">2{P}</span></dd></dl></div>'''
    tip2 = f'''<div class="tip panel" style="position:relative"><dl><dt>Terrain</dt><dd><b style="font-family:var(--name)">Plains</b></dd><dt>Feature</dt><dd>Forest</dd><dt>Yields</dt><dd><span class="n" style="color:var(--f)">1{F}</span> <span class="n" style="color:var(--p)">2{P}</span></dd></dl></div>'''
    t_plain = '<div class="toast panel" style="position:relative;left:0;transform:none;padding:6px 14px"><small>TURN 101</small><span>Cusco grew to <span class="n">13</span> citizens.</span></div>'
    t_held = f'''<div class="toast panel" style="position:relative;left:0;transform:none;padding:6px 14px;gap:8px">{seal_dot()}<small>TURN 101</small><span>A new Order: <span class="held-name">The Market Halls</span>.</span></div>'''
    head = '<div class="panel" style="width:260px;overflow:hidden"><div class="sh" style="padding:10px 12px 8px"><span class="sh-title" style="font-size:22px">The <i>Ledger</i></span><span class="sp"></span><span class="hint"><span class="kbd">Esc</span></span><span class="x">×</span></div><div class="hr-q"></div><div style="height:22px"></div></div>'
    btns = '<div style="display:flex;gap:8px;align-items:center;width:640px"><span class="btn">Pass</span><span class="btn pri">Confirm</span><span class="btn sm">Cancel</span><span class="btn off">Revert</span><span style="background:var(--deep-lapis);padding:8px 10px;border-radius:4px"><span class="btn gl">Continue <span class="kbd">⏎</span></span></span></div>'
    ychips = ''.join(f'<span class="chip" style="color:var(--{c});border-color:currentColor;font-weight:600;font-size:12px">+{v}{i}</span> ' for c, i, v in (('f', F, 21), ('p', P, 44), ('g', G, 12), ('s', SC, 4))) + f'<span class="chip" style="font-weight:600;font-size:12px">+2{yi("happy")}</span>'
    kw = f'''<div style="font-size:13.5px;line-height:1.9;width:330px">Opens <u style="text-decoration-style:dotted;text-underline-offset:3px">{mk('star', 10, 'var(--lapis)', 'margin-right:3px')}Mathematics</u> and needs <u style="text-decoration-style:dotted;text-underline-offset:3px">Iron</u>.<br>Paid by <span style="white-space:nowrap">{seal_dot(12)} <span class="held-name" style="font-size:14.5px;border-bottom:1px solid var(--gilt)">The Market Halls</span></span> and <span style="white-space:nowrap">{seal_dot(12)} <span class="held-name" style="font-size:14.5px;border-bottom:1px solid var(--gilt)">The Pyramids</span></span>.</div>'''
    card = f'''<div class="turncard" style="position:relative;width:230px">{mk('sun', 20, 'var(--deep-gilt)')}<div class="lbl" style="margin-top:6px">Turn <span class="n">102</span> · Æra III</div><div style="font-family:var(--disp);font-size:26px;line-height:1.1;margin-top:2px">Pachacuti</div><div style="font-size:12.5px;color:var(--soft);margin:6px 0 10px">Rhetoric is known. A caravan came home.</div><span class="btn pri">Begin the turn</span></div>'''
    marks = f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 24px;font-size:13px;width:600px"><span>{mk('sun', 16, 'var(--deep-gilt)', 'vertical-align:-3px;margin-right:8px')}yours, or ready</span><span>{mk('moon', 16, 'var(--deep-gilt)', 'vertical-align:-3px;margin-right:8px')}another court, or waiting</span><span>{mk('star', 16, 'var(--deep-gilt)', 'vertical-align:-3px;margin-right:8px')}a capital, and a list mark</span><span>{mk('star', 16, 'var(--lapis)', 'vertical-align:-3px;margin-right:8px')}flat lapis star: a technology</span></div>'''
    inner = (cell(24, 18, 'A tooltip on an owned hex: one new line', tip1) + cell(24, 150, 'A tooltip on a free hex: no line', tip2)
             + cell(290, 18, 'A toast that tells: plain', t_plain) + cell(290, 84, 'A toast about a held thing: a small seal, same size', t_held)
             + cell(290, 150, 'No toast carries a painting', '<div style="font-size:12.5px;color:var(--soft);width:330px">A painted thing has its own screen (the wonder plate, the age plate).</div>')
             + cell(716, 18, 'A sheet head: ink over gilt, on every sheet', head)
             + cell(24, 262, 'Buttons: plain. The next step is cinnabar. Gilt outline only on lapis or cloth.', btns) + cell(24, 348, 'Yield chips: flat, mono, the yield colour', f'<div style="display:flex;gap:5px">{ychips}</div>')
             + cell(24, 412, 'Keywords: plain for a technology or a resource, the small seal for a held thing', kw)
             + cell(24, 500, 'The three marks', marks, 600)
             + cell(716, 150, 'The turn card', card))
    return stage(1000, 580, inner, '', 'background:var(--table)')

def war_strip():
    def cell(x, y, label, body, w=None):
        ws = f'width:{w}px;' if w else ''
        return f'<div class="abs" style="left:{x}px;top:{y}px;{ws}"><div class="lbl" style="margin-bottom:8px;white-space:nowrap">{label}</div>{body}</div>'
    was = '<span class="btn war">Declare war</span>'
    a_confirm = f'''<div class="panel" style="width:330px;padding:14px 16px;border-color:var(--ink);border-top:4px solid {OX}"><div style="font-family:var(--disp);font-size:22px;line-height:1.1">Declare war on the Tang?</div><ul style="margin:8px 0 12px;padding-left:18px;font-size:13px;line-height:1.5"><li>Your <span class="n">2</span> deals with Emperor Taizong end now.</li><li>His soldiers may enter your land, and yours his.</li><li>Peace needs his agreement.</li></ul><div style="display:flex;justify-content:space-between;align-items:center"><span class="btn pri" style="background:var(--parch);color:var(--ink);box-shadow:3px 3px 0 var(--ink)">Keep the peace <span class="kbd">Esc</span></span>{war_button()}</div></div>'''
    b_hold = f'''<span class="btn" style="position:relative;overflow:hidden;background:var(--parch);color:{OX};border:2px solid {OX};gap:8px;width:230px;justify-content:center"><i style="position:absolute;left:0;top:0;bottom:0;width:58%;background:{OX};opacity:.22"></i><span style="position:relative;display:flex;gap:8px;align-items:center;color:{OX}"><svg style="width:14px;height:14px"><use href="#c-sword"/></svg>Hold to declare war</span></span>'''
    inner = (cell(24, 20, 'Second pass: a text link', was)
             + cell(24, 96, 'A · step one: a solid button', war_button())
             + cell(24, 170, 'Its place: bottom left, far from Propose', '<div style="display:flex;align-items:center;width:400px;border-top:1px solid var(--rule);padding-top:10px">' + war_button() + '<span style="flex:1"></span><span class="btn pri">Propose</span></div>')
             + cell(470, 20, 'A · step two: a sheet that asks. Enter does not confirm.', a_confirm)
             + cell(24, 276, 'B · press and hold for one second (shown part filled)', b_hold)
             + cell(470, 276, 'B · no second sheet', '<div style="font-size:12.5px;color:var(--soft);width:400px">A short click does nothing and shows the word "Hold". A keyboard player holds Enter. The button must explain itself the first time, which costs a line of text.</div>'))
    return stage(1000, 350, inner, '', 'background:var(--parch)')

# ================================================================ Part B: the city
QROWS = [('Warrior', '15', '1t', None), ('Scout', '15', '1t', None), ('Settler', '119', '4t', None), ('Worker', '38', '1t', None), ('Spearman', '27', '1t', None), ('Horseman', '151', '4t', None),
         ('Catapult', '174', '5t', None), ('Composite Bowman', '151', '4t', None), ('Bireme', '61', '2t', '244'), ('War Galley', '87', '3t', '348'), ('Horse Archer', '151', '4t', None)]

def city3(small=False):
    ys = ''.join(f'<span style="color:var(--{c})">{i}{v}</span>' for c, i, v in (('f', F, 30), ('p', P, 40), ('g', G, 46), ('s', SC, 26), ('c', CU, 13), ('fa', FA, 3)))
    nm = 'Pisac' if small else 'Cusco ★'
    head = f'''<div class="abs" style="left:0;right:0;top:0;background:var(--parch);z-index:2"><div class="sh" style="padding:9px 14px 8px"><span class="btn sm" style="padding:0 7px">‹</span><span class="sh-title">{nm}</span><span class="btn sm" style="padding:0 7px">›</span><span class="lbl">size <span class="n">{2 if small else 12}</span> · <span class="n">{'60/60' if small else '190/190'}</span> hp</span><span class="sp"></span><span class="lbl">Treasury <span class="n" style="color:var(--g)">555 (+161)</span> · Faith <span class="n" style="color:var(--fa)">67 (+22)</span></span><span class="n" style="font-size:13px;display:flex;gap:13px;font-weight:600;margin-left:8px">{ys}</span><span class="x" title="Leave the town">×</span></div><div class="hr-q"></div></div>'''
    def sec(t, right=''):
        return f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:11px;border-top:1px solid var(--rule);padding-top:8px"><span class="lbl">{t}</span><span class="n" style="font-size:12px">{right}</span></div>'
    def first(t, right=''):
        return f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px"><span class="lbl">{t}</span><span class="n" style="font-size:12px;white-space:nowrap">{right}</span></div>'
    growth = f'''{first('Growth', f'+8{F} · 15 turns')}<div class="meter" style="margin-top:4px"><i style="width:14%;background:var(--f)"></i></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:3px"><span>Next citizen</span><span class="n">18 / 128</span></div>'''
    borders = f'''{sec('Borders', f'+13{CU} · 5 turns')}<div class="meter" style="margin-top:4px"><i style="width:22%;background:var(--c)"></i></div><div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-top:4px"><span>Next hex <span class="n">18 / 82</span></span><span class="btn sm">Buy hexes</span></div>'''
    if small:
        cit = f'''{sec('Citizens', '2')}<div style="font-size:12px;margin-top:2px"><span class="n">2</span> on land</div><div style="display:flex;gap:5px;margin-top:6px"><span class="chip on">Default</span><span class="chip">Food</span><span class="chip">Production</span><span class="chip">Gold</span></div>'''
        blds = f'''{sec('Buildings', '1')}<div style="font-size:12.5px;margin-top:4px;display:flex;gap:5px;align-items:center"><svg style="width:11px;height:11px;color:var(--soft)"><use href="#i-bld"/></svg>Monument</div>'''
        left = f'''<div class="panel" style="position:absolute;left:14px;top:66px;width:286px;padding:2px 13px 13px">{growth}{borders}{cit}</div><div class="panel" style="position:absolute;left:310px;bottom:14px;width:190px;padding:10px 12px 11px">{blds.replace('border-top:1px solid var(--rule);padding-top:8px', '').replace('margin-top:11px', 'margin-top:0')}</div>'''
        return stage(1280, 400, head + left + '<div class="cap" style="left:320px;top:76px">a town of 2 citizens: no levy card, no faith, no great house, no wonder</div>', 'map-close')
    levy = f'''<div style="display:flex;align-items:center;gap:8px;margin-top:7px"><span class="btn sm" style="background:var(--ink);color:var(--parch)">Levy a citizen ▴</span><span style="font-size:11.5px;color:var(--faint)"><span class="n">1</span> ready · <span class="n">1</span> waits</span></div>'''
    cit = f'''{sec('Citizens', '12')}<div style="font-size:12px;margin-top:2px"><span class="n">9</span> on land · <span class="n">3</span> specialists</div><div style="display:flex;gap:5px;margin-top:6px"><span class="chip on">Default</span><span class="chip">Food</span><span class="chip">Production</span><span class="chip">Gold</span></div>
<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-top:6px"><span><span class="n">1</span> scholar <span class="n" style="color:var(--s)">+2{SC}</span></span><span class="btn sm">Dismiss</span></div><div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-top:4px"><span><span class="n">2</span> merchants <span class="n" style="color:var(--g)">+8{G}</span></span><span class="btn sm">Dismiss</span></div>'''
    bl = ''.join(f'<span style="display:flex;gap:5px;align-items:center"><svg style="width:11px;height:11px;color:var(--soft)"><use href="#i-bld"/></svg>{n}</span>' for n in ('Granary', 'Monument', 'Shrine', 'Market', 'Library', 'Stone Walls'))
    blds = f'''{first('Buildings', '6').replace('margin-top:8px', 'margin-top:0')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;font-size:12.5px;margin-top:4px">{bl}</div>'''
    gh = ''.join(f'<div style="display:flex;gap:7px;align-items:center;margin-top:4px;font-size:12.5px">{seal_dot(12)}<b style="font-family:var(--name);font-weight:600">{n}</b><span style="flex:1"></span><span class="n" style="font-size:12px">{p}</span></div>' for n, p in (('Imperial Throne', f'<span style="color:var(--c)">+4{CU}</span>'), ('Heroic Epic', f'<span style="color:var(--c)">+3{CU}</span>')))
    great_h = f'''{first('Great houses', '2 here').replace('margin-top:8px', 'margin-top:0')}{gh}<div style="font-size:11.5px;color:var(--faint);margin-top:5px">One of each in the realm. <span class="n">3</span> more stand in other towns.</div>'''
    won = ''.join(f'<div style="display:flex;gap:9px;align-items:center;margin-top:6px">{pw(i, 60, 34, "thin", label="")}<span><span class="held-name" style="font-size:14px">{n}</span><br><span class="n" style="font-size:12px">{p}</span></span></div>'
                  for i, n, p in (('greatLibrary', 'The Great Library', f'<span style="color:var(--s)">+16{SC}</span> <span style="color:var(--c)">+15{CU}</span>'), ('pyramids', 'The Pyramids', f'<span style="color:var(--p)">+6{P}</span>')))
    wonders = f'''{first('Wonders here', '2').replace('margin-top:8px', 'margin-top:0')}{won}'''
    def rite(n, what, on=True):
        st = '' if on else 'opacity:.5;'
        return f'<div style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:12.5px;{st}"><span style="flex:1">{n} <span class="n" style="font-size:11.5px">{what}</span></span><span class="btn sm"><span class="n" style="color:var(--fa)">30{FA}</span></span></div>'
    faith = f'''{sec('Faith', f'+10{FA} pressed a turn')}<div style="font-size:12px;margin-top:2px">Follows <b style="color:var(--fa)">the Children of Elder and Cloud</b> · <span class="n">3</span> of <span class="n">12</span> citizens</div>
<div style="border:1px solid var(--edge);border-radius:4px;background:#fffaf0;padding:6px 8px;margin-top:6px"><div style="display:flex;justify-content:space-between;font-size:12.5px"><b>Keeping the Rite of the Harvest</b><span class="n" style="color:var(--f)">+10{F}</span></div><div class="meter" style="margin-top:4px;height:5px"><i style="width:10%;background:var(--fa)"></i></div><div style="font-size:11.5px;color:var(--faint);margin-top:3px"><span class="n">9</span> turns left of <span class="n">10</span></div></div>
<div style="font-size:11.5px;color:var(--faint);margin-top:6px">A town keeps one rite. The next can start when this one ends.</div>{rite('Omen Reading', f'<span style="color:var(--s)">+10{SC}</span>', False)}{rite('Consecration of the Bounds', f'<span style="color:var(--c)">+4{CU}</span>', False)}'''
    left = f'''<div class="panel" style="position:absolute;left:14px;top:66px;width:286px;padding:2px 13px 12px">{growth}{levy}{borders}{cit}{faith}</div>'''
    def colm(body, w):
        return f'<div style="width:{w}px;flex:none;border-left:1px solid var(--rule);padding:0 12px">{body}</div>'
    band = f'''<div class="panel" style="position:absolute;left:308px;bottom:14px;width:524px;padding:10px 0 11px;display:flex">{colm(blds, 150).replace('border-left:1px solid var(--rule);', '')}{colm(great_h, 176)}{colm(wonders, 196)}</div>'''
    menu = f'''<div class="panel" style="position:absolute;left:308px;top:136px;width:318px;padding:10px 12px;border-color:var(--ink);box-shadow:0 8px 22px rgba(29,26,32,.3)"><div class="lbl">Spend one of this town's citizens</div>
<div style="display:grid;grid-template-columns:1fr auto;gap:2px 10px;border:1px solid var(--ink);border-radius:4px;padding:6px 8px;margin-top:6px;background:#fffaf0"><b>Production here</b><span class="n" style="color:var(--p);font-weight:600">+76{P}</span><span style="grid-column:1/3;font-size:11.5px;color:var(--faint)">{seal_dot(11)} The Corvée: the food it took to grow this citizen</span></div>
<div style="display:grid;grid-template-columns:1fr auto;gap:2px 10px;border:1px dashed var(--edge);border-radius:4px;padding:6px 8px;margin-top:5px;color:var(--faint)"><b>Raise a unit</b><span class="n">Spearman</span><span style="grid-column:1/3;font-size:11.5px">{seal_dot(11, 'var(--faint)')} The General Levy · this town waits <span class="n">3</span> more turns</span></div>
<div style="font-size:12px;margin-top:8px;border-top:1px solid var(--rule);padding-top:6px">Costs <span class="n">1</span> citizen (pop <span class="n">12 → 11</span>). Next levy here in <span class="n">5</span> turns.</div></div>'''
    rows = ''
    for n, c, t, g in QROWS:
        buy = f'<span class="buy">{g}{G}</span>' if g else '<span class="n" style="font-size:12px;color:var(--faint);width:44px;text-align:right">−1</span>'
        rows += f'<div class="row" style="grid-template-columns:22px 1fr auto auto;padding:5px 12px">{ic("i-unit", "ic")}<span><b style="font-family:var(--ui);font-size:13px">{n}</b></span><span class="cst"><span style="color:var(--p)">{c}{P}</span> · {t}</span>{buy}</div>'
    right = f'''<div class="panel" style="position:absolute;right:14px;top:66px;width:420px"><div style="padding:10px 12px 9px"><div class="lbl">Building now</div><div style="display:flex;align-items:baseline;gap:10px;margin-top:2px"><span style="font-family:var(--disp);font-size:21px;line-height:1.1">The Great Lighthouse</span><span style="flex:1"></span><span class="n" style="font-size:12.5px">131/170 · 1t</span><span class="x" style="width:20px;height:20px;font-size:12px">×</span></div><div class="meter" style="margin-top:5px"><i style="width:77%;background:var(--p)"></i></div></div>
<div style="padding:7px 12px;border-top:1px solid var(--rule);font-size:12.5px"><span class="lbl">Supply</span> Copper <span class="n">0/9</span> · Obsidian <span class="n">0/5</span> · Horses <span class="n">3/7</span> · Camels <span class="n">12/12</span> · Ivory <span class="n">6/6</span></div>
<div style="padding:7px 12px 8px;border-top:1px solid var(--rule)"><div class="lbl" style="margin-bottom:5px">Add to queue</div><div style="display:flex;gap:5px;flex-wrap:wrap"><span class="chip on">All</span><span class="chip">Units</span><span class="chip">Buildings</span><span class="chip">Wonders</span><span class="chip">Projects</span><span class="chip">Faith</span></div><div style="display:flex;justify-content:space-between;margin-top:7px"><span class="lbl">Buy outright · full price</span><span class="lbl">you have <span class="n" style="color:var(--g)">555</span> gold</span></div></div>
<div class="lbl" style="padding:2px 12px 4px">Units</div>{rows}</div>'''
    note = '<div class="cap" style="right:446px;top:76px">the build queue: as it is today</div>'
    return stage(1280, 800, head + left + band + menu + right + note, 'map-close')

# ================================================================ Part B: diplomacy
SPEECH = 'Let us put something useful on the table.'
def court_chip(face, name, rel, on=False, tinct=None, device=None):
    f = pw(face, 28, 28, 'circ thin', label='', bg=FACE[face]) if face else fb(28, 28, device, 'circ thin', tinct=tinct)
    st = 'border-color:var(--ink);background:#fffaf0;box-shadow:0 2px 0 var(--ink)' if on else ''
    return f'<span style="display:inline-flex;gap:8px;align-items:center;border:1px solid var(--edge);border-radius:999px;padding:3px 12px 3px 4px;{st}">{f}<b style="font-family:var(--name);font-size:13px">{name}</b><span style="font-size:11.5px;color:var(--faint)">{rel}</span></span>'

def give_half(who, hand, chips):
    cs = ''.join(f'<span class="give">{c}</span>' for c in chips)
    return f'''<div><div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:3px"><b style="font-family:var(--name);font-size:14px">{who} gives</b><span class="lbl"><span class="n">{hand}</span> gold in hand</span></div><div class="slip" style="color:var(--faint);font-size:13.5px;margin-top:5px">Nothing yet</div><div class="lbl" style="margin-top:12px">Add</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">{cs}</div></div>'''

def diplo_a(fallback=False):
    if fallback:
        port = fb(228, 304, 'i-horse', tinct='#2f5d8a')
        nm, people, row = 'Modu Chanyu', 'the Xiongnu', court_chip('terracottaArmy', 'Emperor Taizong', 'at peace') + court_chip(None, 'Modu Chanyu', 'at peace', True, '#2f5d8a', 'i-horse')
    else:
        port = pw('terracottaArmy', 228, 304, bg=FACE['terracottaArmy'], label='stand-in for a portrait')
        nm, people, row = 'Emperor Taizong', 'the Tang', court_chip('terracottaArmy', 'Emperor Taizong', 'at peace', True) + court_chip(None, 'Modu Chanyu', 'at peace', False, '#2f5d8a', 'i-horse')
    rel = ''.join(f'<div style="display:flex;justify-content:space-between;border-top:1px solid var(--rule);padding:5px 0;font-size:12.5px"><span>{a}</span><b>{b}</b></div>' for a, b in (('Relation', 'At peace'), ('Their borders', 'Closed to you'), ('Your borders', 'Closed to them')))
    speech = f'''<div style="font-family:var(--cn);font-size:14px;letter-spacing:.06em;color:var(--deep-gilt)">{nm} · {people} · at peace</div>
<div style="font-family:var(--disp);font-style:italic;font-size:33px;line-height:1.14;margin-top:8px;max-width:600px"><span style="color:var(--rubric)">“</span>{SPEECH}<span style="color:var(--rubric)">”</span></div>'''
    paper = f'''<div style="background:#fffaf0;border:1px solid var(--edge);box-shadow:0 3px 10px rgba(29,26,32,.14);padding:12px 16px 14px"><div style="display:flex;align-items:baseline;gap:12px"><span style="font-family:var(--disp);font-size:20px">An exchange with {people}</span><span class="lbl">nothing on the table</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:10px">{give_half('Pachacuti', '555', ['Gold, once', 'Gold a turn <i>20 turns</i>', 'Open borders', 'Incense <span class="n">1</span> <i>last</i>', 'Marble <span class="n">0</span>'])}{give_half(nm, '343', ['Gold, once', 'Gold a turn <i>20 turns</i>', 'Open borders', 'Sugar <span class="n">2</span>'])}</div></div>'''
    sheet = f'''<div class="sheet" style="left:30px;top:14px;width:940px;height:{592 if not fallback else 592}px"><div class="sh"><span class="sh-title">Foreign <i>courts</i></span><span class="lbl">turn <span class="n">101</span> · <span class="n">2</span> courts met</span><span class="sp"></span><span class="x">×</span></div><div class="hr-q"></div>
<div style="padding:9px 16px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--rule)">{row}<span style="flex:1"></span><span class="btn sm">Exchange</span><span style="font-size:12.5px;color:var(--faint)">Peace terms</span></div>
<div style="position:relative;flex:1">
<div class="abs" style="left:18px;top:16px">{port}</div>
<div class="abs" style="left:18px;top:332px;width:228px">{rel}</div>
<div class="abs" style="left:274px;top:18px;right:18px">{speech}</div>
<div class="abs" style="left:274px;top:158px;right:18px">{paper}</div>
<div class="abs" style="left:18px;right:18px;bottom:12px;display:flex;align-items:center;gap:8px">{war_button()}<span class="btn">Standing and deals <span class="n">0</span></span><span style="flex:1"></span><span class="btn off">What would make this work?</span><span class="btn off">What would you give for this?</span><span class="btn pri off">Propose</span></div></div></div>'''
    return stage(1000, 620, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

def diplo_b():
    faces = ('<div style="display:flex;gap:6px;align-items:center">' + pw('terracottaArmy', 38, 38, 'circ', label='', bg=FACE['terracottaArmy'], style='box-shadow:0 0 0 2px var(--parch),0 0 0 4px var(--ink);')
             + '<span style="width:6px"></span>' + fb(34, 34, 'i-horse', 'circ thin', tinct='#2f5d8a') + '<span style="font-size:11.5px;color:var(--faint);margin-left:4px">Modu Chanyu</span></div>')
    def col(t, hand, items, hidden=''):
        its = ''.join(f'<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">{x}</div>' for x in items)
        return f'<div><div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:3px"><b style="font-family:var(--name);font-size:14px">{t}</b><span class="lbl"><span class="n">{hand}</span> gold</span></div>{its}<div style="font-size:11.5px;color:var(--faint);margin-top:8px;font-style:italic">{hidden}</div></div>'
    you = col('You can give', '555', ['<span class="give">Gold, once</span><span class="give">Gold a turn <i>20 turns</i></span>', '<span class="give">Open borders</span>', '<span class="give">Incense <span class="n">1</span> <i>last</i></span><span class="give">Marble <span class="n">0</span></span>'], 'Not shown: Wine, Jade, Tea. You both own them.')
    they = col('They can give', '343', ['<span class="give">Gold, once</span><span class="give">Gold a turn <i>20 turns</i></span>', '<span class="give">Open borders</span>', '<span class="give">Sugar <span class="n">2</span></span>'])
    slip = f'''<div style="background:#fffaf0;border:1px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:10px 14px 12px"><div style="font-family:var(--cn);font-size:13px;letter-spacing:.06em;color:var(--deep-gilt)">Emperor Taizong · the Tang</div><div style="font-family:var(--disp);font-style:italic;font-size:22px;line-height:1.18;margin-top:4px"><span style="color:var(--rubric)">“</span>{SPEECH}<span style="color:var(--rubric)">”</span></div></div>'''
    table = '''<div style="background:#fffaf0;border:1px solid var(--edge);padding:9px 14px;display:grid;grid-template-columns:auto 1fr 1fr;gap:4px 18px;align-items:baseline"><span style="font-family:var(--disp);font-size:18px;grid-row:1/3;align-self:center">On the table</span><span style="font-size:12.5px"><b>Pachacuti gives</b> <span class="slip" style="color:var(--faint);font-size:13px">nothing</span></span><span style="font-size:12.5px"><b>Emperor Taizong gives</b> <span class="slip" style="color:var(--faint);font-size:13px">nothing</span></span></div>'''
    sheet = f'''<div class="sheet" style="left:30px;top:14px;width:940px;height:592px"><div class="sh"><span class="sh-title">Foreign <i>courts</i></span><span class="lbl">turn <span class="n">101</span> · at peace with the Tang</span><span class="sp"></span>{faces}<span class="x" style="margin-left:10px">×</span></div><div class="hr-q"></div>
<div style="position:relative;flex:1">
<div class="abs" style="left:18px;top:16px">{pw('terracottaArmy', 330, 440, bg=FACE['terracottaArmy'], label='stand-in for a portrait')}</div>
<div class="abs" style="left:44px;top:346px;width:330px">{slip}</div>
<div class="abs" style="left:384px;top:16px;right:18px;display:flex;gap:14px;align-items:baseline;border-bottom:1px solid var(--rule);padding-bottom:6px"><b style="font-size:13px;border-bottom:2px solid var(--ink);padding-bottom:6px;margin-bottom:-7px">Exchange</b><span style="font-size:13px;color:var(--faint)">Peace terms</span><span style="flex:1"></span><span style="font-size:12px;color:var(--soft)">Their borders: closed to you · Your borders: closed to them</span></div>
<div class="abs" style="left:384px;top:60px;right:18px;display:grid;grid-template-columns:1fr 1fr;gap:22px">{you}{they}</div>
<div class="abs" style="left:384px;top:300px;right:18px">{table}</div>
<div class="abs" style="left:384px;right:18px;top:384px;display:flex;gap:8px"><span class="btn off">What would make this work?</span><span class="btn off">What would you give for this?</span></div>
<div class="abs" style="left:384px;right:18px;bottom:12px;display:flex;align-items:center;gap:8px">{war_button()}<span style="flex:1"></span><span class="btn">Standing and deals <span class="n">0</span></span><span class="btn pri off">Propose</span></div></div></div>'''
    return stage(1000, 620, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

LINES = [('The paper is empty, in peace', 'Let us put something useful on the table.'), ('The paper is empty, at war', 'You have my attention. Speak.'), ('The answer is on its way', 'One moment. Let me consider it.'),
         ('An exchange is signed', 'A fair exchange. My merchants will see it done.'), ('Peace is agreed', 'Let the fighting end. We have an agreement.'), ('An exchange is refused', 'These terms do not suit us. What else can you offer?'),
         ('Peace is refused', 'Not yet. I am not ready to end this war.'), ('You ask for their last copy', 'I will not part with our last incense. Ask for something we can spare.'), ('A counter offer', 'These are terms I could agree to.'),
         ('No counter offer, in peace', 'There is no exchange I can offer you today.'), ('No counter offer, at war', 'I am not ready to offer terms.'), ('A declaration of war (the dispatch)', 'The time for bargaining is over.')]

# ================================================================ Part C: faith
def tablet(name, kind, text, pay, face=None, empty=None, col='#994074'):
    if empty:
        return f'<div class="tablet empty"><div style="margin-top:74px;font-family:var(--disp);font-style:italic;font-size:14px">{empty[0]}</div><div style="font-size:11.5px;margin-top:4px">{empty[1]}</div></div>'
    if face:
        vig = f'<div class="pw im-{face} circ" style="width:62px;height:62px;{face_bg(face)}border-color:{col};box-shadow:0 0 0 2px var(--card),0 0 0 3px {col}"></div>'
    else:
        vig = f'<svg style="width:66px;height:66px;color:{col}" viewBox="0 0 100 100"><use href="#dev"/><use href="#y-faith" x="33" y="31" width="34" height="34"/></svg>'
    return f'''<div class="tablet" style="--k:{col}">{vig}<div class="tb-n">{name}</div><div class="tb-k">{kind}</div><div class="tb-t">{text}</div><div class="tb-p">{pay}</div></div>'''

def face_bg(face):
    return {'theOracle': 'background-size:260%;background-position:48% 55%;', 'hagiaSophia': 'background-size:300%;background-position:52% 55%;'}.get(face, 'background-size:cover;')

def faith_head(tab):
    tabs = ''.join(f'<span class="chip{" on" if i == tab else ""}" style="font-family:var(--ui);font-size:12.5px;font-weight:600;padding:3px 12px">{t}</span>' for i, t in enumerate(('Rites <span class="n" style="font-weight:400">1 kept · 9 free</span>', 'Bonuses', 'Religion &amp; followers')))
    return f'''<div class="sh"><span class="sh-title">The Children of <i>Elder and Cloud</i></span><span class="lbl" style="white-space:nowrap">holy city Cusco ★ · <span class="n">5</span> of <span class="n">10</span> towns follow</span><span class="sp"></span><span class="n" style="font-size:13px;font-weight:600;color:var(--fa);white-space:nowrap">{FA}67 (+22)</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="padding:10px 16px 0;display:flex;gap:6px;align-items:center">{tabs}</div>'''

def faith_bonuses():
    gods = (tablet('Sacred Fire', 'a god · pantheon', '<b>+2 production</b> in every city', f'<span style="color:var(--p)">+20{P}</span>', face='theOracle')
            + tablet('Star Readers', 'a god · pantheon', '<b>+4 science</b> in every city with a mountain hex in its borders', f'<span style="color:var(--s)">+4{SC}</span>')
            + tablet('God of the Forge', 'a god · pantheon', '<b>+2 production</b> in every city per military building there', f'<span style="color:var(--p)">+36{P}</span>')
            + tablet('Holy city: Cusco', 'the seat of your faith', 'Presses your faith on the towns around it', f'<span style="color:var(--g)">+2{G}</span> <span style="color:var(--fa)">+5{FA}</span>', face='hagiaSophia'))
    fol = (tablet('Temple Spires', 'a follower belief', 'Opens the <b>Wat</b>: +1 faith per 2 citizens, +3 happiness', '<span style="font-size:11.5px;font-family:var(--ui);font-weight:400;color:#56505a">pays once a Wat stands</span>')
           + tablet('The Open Kitchen', 'a follower belief', 'Opens the <b>Gurdwara</b>: +3 food, +3 faith, +1 science per 3 citizens', '<span style="font-size:11.5px;font-family:var(--ui);font-weight:400;color:#56505a">pays once a Gurdwara stands</span>')
           + tablet('', '', '', '', empty=('a follower belief', 'a prophet\'s charge draws one')) + tablet('', '', '', '', empty=('an enhancer belief', 'a prophet\'s charge, once you have Theology')))
    line = f'''<div style="margin:10px 16px 0;padding:7px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);display:flex;gap:18px;align-items:baseline;font-size:12.5px"><span><span class="n" style="color:var(--fa);font-weight:600;font-size:14px">+22{FA}</span> a turn</span><span style="color:var(--soft)">the land <span class="n">+18</span> · buildings <span class="n">+1</span> · wonders <span class="n">+3</span></span><span style="flex:1"></span><span>Your religion pays <span class="n" style="font-weight:600;color:var(--p)">+56{P}</span> <span class="n" style="font-weight:600;color:var(--s)">+4{SC}</span> a turn</span></div>'''
    sheet = f'''<div class="sheet" style="left:30px;top:14px;width:940px;height:652px">{faith_head(1)}{line}
<div style="padding:10px 16px 0"><div class="lbl">Your gods · <span class="n">3</span> of <span class="n">3</span> places · and your holy city</div><div style="display:flex;gap:14px;margin-top:8px">{gods}</div>
<div class="lbl" style="margin-top:14px">Your religion's beliefs · <span class="n">2</span> of <span class="n">3</span> follower · <span class="n">0</span> of <span class="n">2</span> enhancer</div><div style="display:flex;gap:14px;margin-top:8px">{fol}</div></div></div>'''
    return stage(1000, 680, veil('rgba(29,26,32,.42)') + sheet + '<span class="cap" style="right:50px;top:200px">stand-in vignettes: tablets 1 and 4</span>', 'map-wide')

def faith_rites():
    know = ''.join(f'<span class="chip" style="font-family:var(--ui);font-size:12px;font-weight:600;border-color:var(--ink)">{n} <span style="color:var(--{c})">{i}</span></span>' for n, c, i in (('Rite of the Harvest', 'f', F), ('Omen Reading', 's', SC), ('Consecration of the Bounds', 'c', CU), ('Blessing of Arms', 'soft', ''), ('Rite of Plenty', 'g', G)))
    locked = ''.join(f'<span class="chip" style="font-family:var(--ui);font-size:12px;border-style:dashed;color:var(--faint)">{n} · needs {o}</span>' for n, o in (('Rite of Fasting', 'The Fast'), ('Votive Offering', 'The Votive Gifts')))
    towns = [('Cusco ★', '3 of 12 follow', 'Rite of the Harvest', f'<span style="color:var(--f)">+10{F}</span>', '9 turns left'), ('Quito', '1 of 6 follow', None, f'<span style="color:var(--f)">+6{F}</span>', ''), ('Tumebamba', '1 of 6 follow', None, f'<span style="color:var(--f)">+5{F}</span>', ''),
             ('Cajamarca', '1 of 8 follow', None, f'<span style="color:var(--f)">+8{F}</span>', ''), ('Vilcashuamán', 'follows no faith', None, f'<span style="color:var(--f)">+7{F}</span>', ''), ('Huánuco Pampa', 'follows no faith', None, f'<span style="color:var(--f)">+4{F}</span>', '')]
    trs = ''
    for n, fo, keep, add, left in towns:
        if keep:
            trs += f'<tr><td><b>{n}</b></td><td>{fo}</td><td>{seal_dot(11, "var(--fa)")} {keep}</td><td class="n">{add}</td><td class="n">{left}</td><td class="n"><span class="btn sm off">Keeping</span></td></tr>'
        else:
            trs += f'<tr><td><b>{n}</b></td><td>{fo}</td><td style="color:var(--faint)">keeps no rite</td><td class="n">{add}</td><td></td><td class="n"><span class="btn sm">Start · <span class="n" style="color:var(--fa)">30{FA}</span></span></td></tr>'
    sheet = f'''<div class="sheet" style="left:30px;top:14px;width:940px;height:532px">{faith_head(0)}
<div style="padding:10px 16px 0"><div class="lbl">Rites you know · press one to rank your free towns by it</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">{know}{locked}</div>
<table class="led" style="margin-top:12px"><thead><tr><th>Town</th><th>Faith</th><th>Keeps</th><th class="n">The Rite of the Harvest would add</th><th class="n">Left</th><th></th></tr></thead><tbody>{trs}</tbody></table></div>
<div style="margin-top:auto;padding:9px 16px 11px;border-top:1px solid var(--rule);display:flex;gap:14px;align-items:baseline;font-size:12.5px"><span><span class="n" style="color:var(--fa);font-weight:600">67{FA}</span> is enough for <span class="n">2</span> rites now.</span><span style="flex:1"></span><span style="color:var(--faint)">Over the whole realm: a prophet says one rite in every town at once. You have no prophet (<span class="n">180</span> faith).</span></div></div>'''
    return stage(1000, 560, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

# ================================================================ Part C: new frames
CARDS = {
    'yards': dict(name="The Engineers' Yards", num='II', ink='eco', suit='s-wand', fx='<b>+2 production</b> on every improved hex beside a Manufactory', plate=f'<span style="color:#94500f">+8{P}</span>'),
    'names': dict(name='Names in Stone', num='II', ink='civ', suit='s-coin', fx='<b>+1% science</b> and <b>+1% culture</b> in every city per <b>200 gold</b> you have spent buying (at most <b>+30%</b> each)', plate=f'<span style="color:#2757b8">+17{SC}</span><span style="color:#7b3fa8">+11{CU}</span>'),
    'watch': dict(name='The Town Watch', num='II', ink='mil', suit='s-sword', fx='<b>+5 combat strength</b> when defending inside your territory', plate=''),
}
def oc(key, w=206, sel=False):
    c = CARDS[key]
    plate = f'<div class="oc-plate">{c["plate"]}</div>' if c['plate'] else '<div class="oc-plate" style="border-top-color:transparent">&nbsp;</div>'
    ring = 'transform:translateY(-8px);box-shadow:.35em .35em 0 #1d1a20,0 0 0 3px var(--gilt-hi);' if sel else ''
    return f'''<div class="oc {c['ink']}" style="--w:{w}px;{ring}"><div class="oc-in"><span class="oc-num">{c['num']}</span><div class="oc-name">{c['name']}</div><div class="oc-pic">{dev(c['suit'])}</div><div class="oc-fx">{c['fx']}</div>{plate}</div></div>'''

def order_offer():
    sheet = f'''<div class="sheet" style="left:96px;top:14px;width:808px;height:532px"><div class="sh"><span class="sh-title">Write it into law</span><span class="lbl">tier <span class="n">17</span> · the culture meter is full</span><span class="sp"></span><span class="hint">The offer waits. Nothing is spent.</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="display:flex;gap:30px;justify-content:center;margin-top:30px">{oc('yards', sel=True)}{oc('names')}{oc('watch')}</div>
<div style="display:flex;gap:30px;justify-content:center;margin-top:12px;font-size:11.5px;color:var(--faint)"><span style="width:206px;text-align:center">Economic · common · Expansionist</span><span style="width:206px;text-align:center">Civic · uncommon · Commerce</span><span style="width:206px;text-align:center">Military · common · Generic</span></div>
<div style="margin-top:auto;padding:10px 16px 12px;display:flex;align-items:center;gap:10px"><span class="btn">Ask again · <span class="n" style="color:var(--fa)">56{FA}</span></span><span class="btn">Pass</span><span style="font-size:12px;color:var(--faint)">A pass makes the next hand rarer.</span><span style="flex:1"></span><span class="btn pri">Take The Engineers' Yards</span></div></div>'''
    return stage(1000, 560, veil('rgba(29,26,32,.42)') + sheet, 'map-close')

def scaled(html, w, h, k, style=''):
    return f'<div style="width:{w * k:.0f}px;height:{h * k:.0f}px;flex:none;{style}"><div style="transform:scale({k});transform-origin:0 0;width:{w}px;height:{h}px">{html}</div></div>'

def reliquary():
    fams = ''.join(f'<div style="display:flex;justify-content:space-between;align-items:center;border:1px {"solid var(--ink)" if on else ("dashed var(--edge)" if c == "none yet" else "solid var(--edge)")};border-radius:4px;padding:6px 9px;margin-top:5px;font-size:13px;{"background:#fffaf0;" if on else ""}{"color:var(--faint);" if c == "none yet" else ""}"><b style="font-weight:600">{n}</b><span class="n" style="font-size:12px">{c}</span></div>' for n, c, on in (('The whole deck', '4', True), ('Scholars', '2', False), ('Artists', '1', False), ('Merchants', '1', False), ('Engineers', 'none yet', False), ('Generals', 'none yet', False)))
    top = gp('sch', 'Scholar', 's-sphere', 'Roger Bacon', 'The friar of Oxford', 'Completing a technology grants <b>+15% food</b> and <b>+15% production</b> in every city for <b>3</b> turns', 'Try it first, and argue about it after.', face='colossus')
    rest = (scaled(gp('art', 'Artist', 's-cup', 'Murasaki', 'The lady of the court', '', ''), 214, 392, .36, 'transform:rotate(-5deg)') + scaled(gp('mer', 'Merchant', 's-coin', 'Nanaivandak', 'The Sogdian trader', '', '', face='statueOfZeus'), 214, 392, .36, 'margin-left:-26px') + scaled(gp('sch', 'Scholar', 's-sphere', 'Archimedes', 'Of Syracuse', '', ''), 214, 392, .36, 'margin-left:-26px;transform:rotate(5deg)'))
    odds = ''.join(f'<div style="display:grid;grid-template-columns:74px 1fr 34px;gap:8px;align-items:center;font-size:12.5px;margin-top:4px"><span>{n}</span><span class="meter" style="height:5px;border-color:var(--edge)"><i style="width:{v * 3}%;background:var(--soft)"></i></span><span class="n" style="text-align:right">{v}%</span></div>' for n, v in (('Scholar', 22), ('Artist', 11), ('Engineer', 23), ('Merchant', 20), ('General', 24)))
    ren = ''.join(f'<div style="display:flex;justify-content:space-between;border-top:1px solid var(--rule);padding:3px 0;font-size:12.5px"><span>{n}</span><span class="n">+{v}</span></div>' for n, v in (('Cusco ★', 8), ('Cajamarca', 10), ('Tumebamba', 5), ('Order · Houses of Account', 5), ('7 more', 8)))
    sheet = f'''<div class="sheet" style="left:30px;top:14px;width:940px;height:592px"><div class="sh"><span class="sh-title">The <i>Reliquary</i></span><span class="lbl">Pachacuti · <span class="n">4</span> legacies in force</span><span class="sp"></span><span class="hint">The arrow keys turn the deck.</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="position:relative;flex:1">
<div class="abs" style="left:16px;top:14px;width:180px"><div class="lbl">The families</div>{fams}<div class="lbl" style="margin-top:18px">The rest of the deck</div><div style="display:flex;margin-top:10px">{rest}</div><div style="font-size:11.5px;color:var(--faint);margin-top:8px">Click a card to bring it to the top.</div></div>
<div class="abs" style="left:226px;top:10px;width:440px;height:520px;background:var(--table);border:1px solid var(--edge);border-radius:4px;display:grid;place-items:center"><div style="display:flex;align-items:center;gap:26px"><span class="btn sm" style="border-radius:50%;width:30px;height:30px;padding:0;justify-content:center">‹</span>{top}<span class="btn sm" style="border-radius:50%;width:30px;height:30px;padding:0;justify-content:center">›</span></div><div class="abs" style="bottom:10px;left:0;right:0;text-align:center;font-size:12px;color:var(--soft)"><span class="n">1</span> of <span class="n">4</span> · spent as a scholar: Write a Treatise, or Found an Academy</div></div>
<div class="abs" style="left:690px;top:14px;right:16px"><div class="lbl">The next great person</div><div style="font-size:12.5px;margin-top:4px">Renown <span class="n" style="font-weight:600">27</span> of <span class="n">310</span></div><div class="meter" style="margin-top:4px"><i style="width:9%;background:var(--g)"></i></div>
<div class="lbl" style="margin-top:16px">The odds of the next offer</div>{odds}<div style="font-size:11.5px;color:var(--faint);margin-top:4px">Æra IV has <span class="n">16</span> names left.</div>
<div class="lbl" style="margin-top:16px">Renown this turn</div>{ren}<div style="display:flex;justify-content:space-between;border-top:1px solid var(--ink);padding:4px 0;font-size:13px;font-weight:600"><span>This turn</span><span class="n">+36</span></div></div></div></div>'''
    return stage(1000, 620, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

LEADERS = [('Pachacuti', 'Expansionist · Commerce', '#8b2635', 'm-sun', 'colossus'), ('Emperor Taizong', 'Dominion · Magisterial', '#1f7a5c', 'i-knot', 'terracottaArmy'), ('Modu Chanyu', 'Dominion · Devotion', '#2f5d8a', 'i-horse', None),
           ('Akhenaten', 'Devotion · Magisterial', '#c9771e', 'm-sun', 'statueOfZeus'), ("Al-Ma'mun", 'Devotion · Scientific', '#1d1a20', 's-sphere', None), ('Mithridates VI', 'Dominion · Expansionist', '#6b2a7a', 's-cup', None),
           ('Joan of Arc', 'Dominion · Devotion', '#2b3f9e', 's-sword', None), ('Mansa Musa', 'Commerce · Devotion', '#d9a521', 's-coin', None), ('Zheng He', 'Commerce · Magisterial', '#b5301f', 'e-compass', None),
           ('Nezahualcoyotl', 'Expansionist · Scientific', '#1f8f8a', 'e-tree', None), ('Hypatia', 'Scientific · Magisterial', '#d8cfae', 's-sphere', None), ('Hildegard of Bingen', 'Devotion · Magisterial', '#4d9a3a', 'e-sheaf', None)]
def setup():
    tiles = ''
    for i, (n, d, col, dv, face) in enumerate(LEADERS):
        f = pw(face, 48, 64, 'thin', label='', bg=FACE[face]) if face else fb(48, 64, dv, 'thin', tinct=col)
        on = 'border-color:var(--ink);background:#fffaf0;box-shadow:0 0 0 2px var(--gilt-hi);' if i == 0 else ''
        tiles += f'<div style="display:flex;gap:10px;align-items:center;border:1px solid var(--edge);border-radius:5px;padding:7px 8px;{on}">{f}<span><b style="font-family:var(--name);font-size:13.5px;line-height:1.15;display:block">{n}</b><span style="font-size:11px;color:var(--faint);line-height:1.25;display:block;margin-top:2px">{d}</span></span></div>'
    extra = ''.join(f'<span class="chip" style="font-family:var(--ui);font-size:12px;padding:3px 12px">{t}</span>' for t in ('Ibn Battuta · every deck', 'No leader · the plain rules', 'Random · dealt by the seed'))
    ab = ''.join(f'<div style="margin-top:8px;font-size:13px"><b>{n}</b><br>{t}</div>' for n, t in (('The Qhapaq Ñan', 'Every city joined to your capital by road pays <span class="n">+1</span> happiness and <span class="n">+1</span> production.'), ('The Gold of the Peaks', 'Farms pay <span class="n">+1</span> gold for every mountain beside them.')))
    left = f'''<div class="panel" style="position:absolute;left:36px;top:28px;width:590px;height:544px;padding:0;box-shadow:0 3px 10px rgba(29,26,32,.12);display:flex;flex-direction:column"><div class="sh"><span class="sh-title">Choose your civ</span><span class="lbl">new game · step two of two</span></div><div class="hr-q"></div>
<div style="padding:12px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">{tiles}</div><div style="padding:0 16px;display:flex;gap:6px">{extra}</div></div>'''
    right = f'''<div class="panel" style="position:absolute;left:646px;top:28px;width:318px;height:544px;padding:16px;box-shadow:0 3px 10px rgba(29,26,32,.12)"><div style="display:flex;gap:14px">{pw('colossus', 132, 176, bg=FACE['colossus'])}<div><div style="font-family:var(--disp);font-size:28px;line-height:1.02">Pachacuti</div><div class="lbl" style="margin-top:4px">the Inca</div><div style="margin-top:10px;display:grid;gap:4px"><span class="chip" style="justify-self:start">Expansionist</span><span class="chip" style="justify-self:start">Commerce</span></div><div style="display:flex;gap:6px;align-items:center;margin-top:12px;font-size:12px"><i style="width:14px;height:14px;background:#8b2635;border:1px solid var(--ink)"></i><i style="width:14px;height:14px;background:#e0b21a;border:1px solid var(--ink)"></i>maroon and sun gold</div></div></div>
<div class="lbl" style="margin-top:14px">Two rules, from the first turn</div>{ab}<div class="lbl" style="margin-top:14px">Only this leader may raise</div><div style="font-size:13px;margin-top:4px">The <b>Slinger</b> (a unit) and the <b>Terraces</b> (an improvement), each when its technology arrives.</div>
<div class="abs" style="left:16px;right:16px;bottom:16px;display:flex;justify-content:space-between"><span class="btn">← Back</span><span class="btn pri" style="height:40px;padding:0 26px;font-size:15px">Begin</span></div></div>'''
    return stage(1000, 600, left + right, '', 'background:#efe9da')

def unit_panel():
    def st(lab, val, bar=None, col='var(--f)'):
        b = f'<div class="meter" style="height:5px;margin-top:3px"><i style="width:{bar}%;background:{col}"></i></div>' if bar is not None else ''
        return f'<div><div class="lbl" style="font-size:9.5px">{lab}</div><div class="n" style="font-size:15px;font-weight:600">{val}</div>{b}</div>'
    acts = ''.join(f'<span class="btn" style="justify-content:space-between;{"opacity:.45;" if off else ""}">{n}<span class="kbd" style="{"visibility:hidden" if not k else ""}">{k or "x"}</span></span>' for n, k, off in (('Fortify', 'F', False), ('Auto-explore', '', False), ('Skip turn', 'Space', False), ('Pillage', '', True)))
    panel = f'''<div class="panel" style="position:absolute;right:14px;top:46px;width:304px;padding:0;overflow:hidden"><div class="sh" style="padding:10px 12px 8px"><span style="font-family:var(--name);font-weight:600;font-size:19px">Composite Bowman</span><span class="sp"></span><span class="x">×</span></div><div class="hr-q"></div>
<div style="padding:8px 12px 12px"><div class="lbl" style="display:flex;gap:6px;align-items:center"><i style="width:9px;height:9px;border-radius:2px;background:#8f1f33"></i>Pachacuti · veteran</div>
<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px 14px;margin-top:9px">{st('Health', '100/100', 100)}{st('Moves', '3/2')}{st('Strength', '30')}{st('Experience', '4/10', 40, 'var(--g)')}{st('Ranged', '39')}{st('Range', '2')}</div>
<div style="font-size:12px;color:var(--soft);margin-top:9px;border-top:1px solid var(--rule);padding-top:7px">Upkeep <span class="n" style="color:var(--g)">3{G}</span> a turn · <span class="n">+3</span> strength as a veteran</div>
<div class="lbl" style="margin-top:10px">Actions</div><div style="display:grid;gap:5px;margin-top:5px">{acts}</div><div style="text-align:right;margin-top:9px"><span class="btn war">Disband</span></div></div></div>'''
    def ln(a, b, bold=False):
        w = 'font-weight:600;border-top:1px solid var(--ink);' if bold else ''
        return f'<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:12.5px;{w}"><span>{a}</span><span class="n">{b}</span></div>'
    fc = f'''<div class="panel" style="position:absolute;left:300px;top:150px;width:372px;padding:0;border-color:var(--ink)"><div style="padding:9px 12px 7px;display:flex;align-items:baseline;gap:8px"><span style="font-family:var(--name);font-weight:600;font-size:15px">A shot at the Horse Archer</span><span class="sp" style="flex:1"></span><span class="lbl">forecast</span></div><div class="hr-q"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px 12px 10px"><div><div class="lbl" style="display:flex;gap:6px;align-items:center"><i style="width:9px;height:9px;border-radius:2px;background:#8f1f33"></i>Composite Bowman</div>{ln('Ranged strength', '39')}{ln('Veteran', '+3')}{ln(seal_dot(11) + ' The Town Watch', '+5')}{ln('In all', '47', True)}</div>
<div><div class="lbl" style="display:flex;gap:6px;align-items:center"><i style="width:9px;height:9px;border-radius:2px;background:#2f5d8a"></i>Horse Archer</div>{ln('Strength', '28')}{ln('On a hill', '+4')}{ln('&nbsp;', '')}{ln('In all', '32', True)}</div></div>
<div style="padding:8px 12px 10px;border-top:1px solid var(--rule);display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12.5px"><div>You take <span class="n" style="font-weight:600">0</span><div class="meter" style="height:6px;margin-top:3px"><i style="width:100%;background:var(--f)"></i></div><span class="n" style="font-size:11.5px">100 → 100</span></div><div>It takes <span class="n" style="font-weight:600;color:var(--rubric)">41</span><div class="meter" style="height:6px;margin-top:3px"><i style="width:39%;background:var(--f)"></i></div><span class="n" style="font-size:11.5px">80 → 39</span></div></div></div>'''
    end = '<button class="endturn" style="background:var(--parch);color:var(--ink)">Unit needs orders <span class="kbd">⏎</span></button>'
    return stage(1000, 560, topbar(False) + panel + fc + end, 'map-wide')

# ================================================================ the page
def approved(fid, title, note, body, tag='approved'):
    cls = 'ok' if tag == 'approved' else ''
    return f'<div class="sub" id="{fid}"><h3><span class="tag {cls}">{tag}</span>{title}</h3><p>{note}</p>{body}</div>'

def section(sid, title, lede, body):
    return f'<section class="frame" id="{sid}"><h2>{title}</h2><p>{lede}</p>{body}</section>'

def notes(changed, slot, cost=''):
    c = f'<p class="cost"><b>Cost to build or to draw:</b> {cost}</p>' if cost else ''
    return f'<div class="notes"><div><b>What changed</b>{changed}</div><div><b>Splash art slot</b>{slot}</div></div>{c}'

SURF = [  # surface, look today, covered by, needs
    ('Map HUD: top bar, corner panel, toasts, tooltip, End turn and its to-do list', 'modern', 'this board, A1 and A10', 'the kit only'),
    ('City screen', 'modern', 'this board, B1', 'its own board for the final layout'),
    ('Star chart (technology)', 'arcane', 'unchanged by ruling', 'new hint words only'),
    ('Council (Orders &amp; Doctrines) and In play', 'arcane', 'approved boards, built', 'nothing'),
    ('Wonder plate, age plate, bead page, Abacus screen', 'arcane', 'approved boards; the age plate takes a painting (A7)', 'nothing more'),
    ('Order draft offer', 'modern (plain panels)', 'this board, C3', 'its own frame: drawn'),
    ('Great person offer and charter (government) offer', 'modern (plain panels)', 'this board, A5 and A6', 'approved'),
    ('Rite offer in a town, discovery claim', 'modern', 'not drawn', 'the kit only; they stay plain'),
    ('The Reliquary and the spend ceremony', 'modern (plain cards)', 'this board, C4', 'its own frame: drawn; the ceremony follows the card'),
    ('Faith sheet (three tabs)', 'modern', 'this board, C1 and C2', 'its own frame: drawn'),
    ('Caravans &amp; Roads', 'modern', 'this board, A3', 'approved'),
    ('The Ledger, Standings, the census, the leader sheet, the bead ledger, the wager sheet', 'modern', 'the kit (A10)', 'the kit only'),
    ('Foreign courts (diplomacy)', 'modern', 'this board, B2', 'your choice of layout'),
    ('The deal notice, the offers tray, the war and peace dispatch', 'modern', 'not drawn', 'one frame after the diplomacy layout is chosen: they take the face and the speech'),
    ('The turn card', 'modern with a gilt frame', 'the kit (A10)', 'the kit only'),
    ('The Triumph sheet, the capture sheet (a town taken), elimination', 'modern', 'not drawn', 'the kit now; later the ribbon plate with one painting each'),
    ('The ending (the Opus closes)', 'arcane page with the abacus', 'this board, A9', 'approved (win); the loss drawn to match'),
    ('Title screen', 'mixed (a painting in a banner)', 'this board, A8', 'approved'),
    ('Game setup: mode, seed, seats; then the leader', 'modern', 'this board, C5 (the leader step)', 'its own frame: drawn; step one takes the kit only'),
    ('Unit panel and combat forecast', 'modern, with teal action buttons that no other screen has', 'this board, C6', 'its own frame: drawn'),
    ('The Compendium (in the game and as a page)', 'modern', 'not drawn', 'the kit, and the painting window on a wonder, leader and great person entry; a small frame later'),
    ('Menu card, lens card, help card, the chronicle, the happiness and authority cards, the empire drawer, keyword cards, confirm cards', 'modern', 'the kit (A10)', 'the kit only'),
    ('Save and load, the loading sheet, tutorial notes', 'modern', 'not drawn', 'the kit only; the loading sheet could show the title painting'),
    ('Settings, multiplayer', 'not built', 'not drawn', 'the kit when they are built'),
    ('Developer pages: spectate, arena, mapgen, pieces, flair, abacus', 'plain', 'not drawn', 'nothing: they stay plain. The flair gallery gains each new mark (the small seal, the tablet, the window)'),
]

def build():
    css = open(os.path.join(HERE, 'board.css')).read() + open(os.path.join(HERE, 'extra.css')).read()
    N = [
        notes('The left panel holds what the town does: growth (with the levy button), borders, citizens and faith. A band at the foot of the map holds what stands in the town: buildings, great houses, wonders here. I moved those three out of the left panel because one panel with all seven segments is about 920 px tall, and no window has that height. The build queue on the right is today\'s queue: no pictures, the same rows and prices. The levy menu opens beside the button, over the map. The faith segment shows the rite the town keeps and the rites it could start.',
       'Only the wonders segment: a 16:9 thumbnail, 60 by 34 px. The build queue has no picture.',
       'Medium to large. The band takes about 160 px of the map\'s foot between the two panels. At 1180 by 700 the left panel is still tight, so the faith segment must close to one line there and open on a click. This frame is still a start; the final layout needs its own board.'),
        notes('Layout A reads from the top: who is here (a row of faces), the portrait with the leader\'s words beside it in the display face, then one paper with two halves. The two trays of today become the "Add" chips inside each half, so the working part is two columns. Layout B makes the portrait larger, puts the words on a slip over its foot, and keeps today\'s two trays as two columns, with the table as one line under them.',
       'Leader portrait, 3:4: 228 by 304 px in A, 330 by 440 px in B, and a 28 px circle in the row of faces. Count: one for each of the 13 leaders. Fallback: the seat\'s charge on its colour.',
       'Medium for either. A changes how a deal is built (chips inside the paper), so it needs care with the deal rules. B keeps today\'s trays and is the smaller change.'),
        notes('The head is the religion: its name as the title, with the holy city and the count of towns that follow. A realm with no religion keeps the title "Faith". The two large boxes at the top of Bonuses become one fine line. The gods, the beliefs and the holy city are tablets, the form they have on the In play screen: an arched top, a round vignette, the name in the card face, the pay figure at the foot. An empty place is a dashed tablet. The Rites tab is a plain table.',
       'Belief vignette, 1:1, shown as a circle of 62 px. Count: one for each belief and god (the old plan said 18; the pantheon wheel shows more places). Fallback: the belief mark as an engraved seal.',
       'Medium. The tablet exists on In play, so the form is not new. The third tab (the pantheon wheel, who follows, the clergy) keeps its layout and takes the kit only. One level only: a richer level would put the tablets on cloth, and your rule for offers says paper.'),
        notes('The three plain panels become the Council\'s card, with its pay plate at the foot. A card that pays nothing each turn has no plate. The kind, rarity and deck are one plain line under each card. Take is at the bottom right.', 'None. An Order has its engraved device and no painting.', 'Small. The card face exists; the offer sheet takes it.'),
        notes('The plain card becomes the great person card of the offer, with the arched window. The rest of the deck is the same card, small. The families and the renown figures stay plain lists. The head takes the kit.', 'Great person portrait, 5:6 with an arched top (150 by 180 px), the same file as in the offer. Fallback: the family emblem as a seal, as on two of the small cards.', 'Small after the card is built for the offer (stage 5 of the build order).'),
        notes('Each leader tile shows a small portrait, or the charge when there is no painting. The panel on the right shows the chosen leader: a larger portrait, the people, the two decks, the two rules in the game\'s own words, and what only this leader may raise. Begin is cinnabar at the bottom right; today it is an ink pill. The three choices that are not leaders (Ibn Battuta\'s every deck, no leader, random) are chips under the grid.', 'Leader portrait, 3:4: 48 by 64 px in a tile and 132 by 176 px in the panel. The same 13 files as diplomacy. Fallback: the charge on the seat\'s colour.', 'Small to medium. It can be built with charges only and take portraits as they arrive.'),
        notes('The teal action buttons become the plain button of the kit, with the key at the right. Disband is apart, as a rubric link, because it cannot be taken back. The five boxed figures become one grid of mono figures with two meters. The forecast is a small ledger: each side\'s strength lines, a total, and the health after the blow. A line that a card pays has the small seal.', 'None. A unit has no painting.', 'Small. I drew the forecast from its rules (flat strength lines on one ledger) and did not capture it; check it against the real one before a build.'),
    ]
    fonts = "@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Fraunces:opsz,wght@9..144,400..700&family=Instrument+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400;500;600&family=EB+Garamond:ital,wght@0,400..700;1,400..600&family=IM+Fell+English+SC&display=swap');"
    B.PAINT = ['hangingGardens', 'greatLibrary', 'forbiddenCity', 'stonehenge', 'colossus', 'statueOfZeus', 'terracottaArmy', 'ironPillar', 'hagiaSophia']
    out = ['<title>Quiet Table Third Pass</title>', f'<style>{fonts}{css}{B.image_css()}</style>', B.SYMBOLS, B.EXTRA_SYMBOLS, '<div class="page">']
    out.append('''<h1>Quiet Table, <i>third pass</i></h1>
<p class="lede">This board has three parts. Part A is the record of what you approved, with each of your changes applied. Part B draws again the two screens you sent back: the city screen and diplomacy. Part C is new: the faith screen, the answer to "anything we're missing?", and four screens that were not drawn before.</p>
<p>Tags: <span class="tag ok">approved</span> is settled and shown with your change. <span class="tag">proposed</span> needs your word. Comment by id, for example "frame-b2-a".</p>
<p class="small">The "today" pictures are from the current build (19 November), a bot game at turn 101. The mock-ups are HTML over screenshots. Paintings marked "stand-in" are wonder paintings in a slot that has no art yet. The typefaces are the game's own six faces from Google Fonts; a system stack takes their place if they are blocked. Card texts and figures are samples.</p>
<nav class="nav"><a href="#part-a">A · Approved</a><a href="#frame-a10">Kit</a><a href="#frame-a11">Declare war</a><a href="#frame-b1">B1 City</a><a href="#frame-b2">B2 Diplomacy</a><a href="#frame-c1">C1 Faith</a><a href="#missing">C2 What is missing</a><a href="#frame-c3">C3 Order draft</a><a href="#frame-c4">C4 Reliquary</a><a href="#frame-c5">C5 Setup</a><a href="#frame-c6">C6 Unit panel</a><a href="#slots">Art slots</a><a href="#rules">Rules</a><a href="#build">Build order</a><a href="#questions">Questions</a></nav>''')

    # ---------------- Part A
    hint_tbl = '''<div class="tbl"><table><thead><tr><th>Version</th><th>The words</th><th>Note</th></tr></thead><tbody>
<tr><td>Today</td><td>click a star to aim · shift-click to queue · drag, scroll or ← → ↑ ↓ to travel</td><td>In the head of the star chart (<code>index.html</code>, <code>#tech-hint</code>). "Aim" and "star" are not explained anywhere.</td></tr>
<tr><td>1 (recommended)</td><td>Click a technology to research toward it · shift-click to add it to the plan · drag or ← → ↑ ↓ to move</td><td>It says what a click does when the technology is far away: the game researches the steps on the way.</td></tr>
<tr><td>2</td><td>Click: research this next · Shift-click: research it after that · Drag: move the chart</td><td>The shortest. "Next" is not exact when the technology needs others first.</td></tr>
<tr><td>3</td><td>Choose what to learn. A click starts it. Shift-click puts it in line.</td><td>The friendliest. It does not say how to move the chart.</td></tr>
</tbody></table></div>'''
    out.append(section('part-a', 'Part A · Approved, with your changes',
        'Each frame is short. The sentence under its title says what your comment changed.',
        approved('frame-a1', 'The HUD, quiet level', 'Your words: "lets go with this one". The toasts are today\'s size. The seal in a toast is a ring and a dot, 13 px. The dispatch is as it was: an envelope and a count, no face. No toast carries a painting. The tooltip has the new Owner line.', hud3())
        + approved('frame-a3', 'A working sheet: the light touch, today\'s tab words', 'The four filters keep the words of today\'s tabs: Recommended, Running, All routes, Unavailable. They stay chips, not folder tabs. Say so if you want the folder tabs back.', trade3())
        + approved('frame-a4', 'The technology screen: unchanged, new hint words', 'The paper panel is dropped and the screen stays as built. Only the hint line changes. The strip below shows version 1 in place.', tech_hint() + hint_tbl)
        + approved('frame-a5', 'The great person offer, on paper', 'Your word: "great". No change.', great(False))
        + approved('frame-a6', 'Government banners', 'Your words: "Great, love it". No change.', gov())
        + approved('frame-a7', 'The age plate, on the ribbon', 'Your words: "i like the ribbon better, so it doesn\'t take you out of the game." The own-page form is dropped. One thing follows: with no painting, an age falls back to the ribbon with the large numeral in the window, not to the lapis page.', age_ribbon())
        + approved('frame-a8', 'The title screen', 'The tag line is now "a game for the ages".', title3())
        + approved('frame-a9-victory', 'The ending: a win', 'Your words: "Great, approved." No change.', ending(True))
        + approved('frame-a9-defeat', 'The ending: a loss', 'You made no comment on this one. It is the same layout on the dark cloth, with the moon, and the painting at dusk. It needs your word.', ending(False), 'proposed')
        + approved('frame-a10', 'The kit', 'Your changes: the tooltip shows the owner of an owned hex and nothing on a free hex; no painting in a toast; a small seal; the sheet head is the quiet one (ink over gilt) on every sheet, the Ledger included. The Declare war button is in the next frame.', strip3())
        + f'<div class="sub" id="frame-a11"><h3><span class="tag">proposed</span>The Declare war button: two versions</h3><p>The button must look important and must be hard to press by accident. Both versions use a dark red that is not the cinnabar of the next step, a blade mark, and a place at the bottom left, far from Propose. <b>I recommend A.</b> It is the more forceful of the two, it tells the player what follows before the act, and the game has a confirm card already. B is faster, but a player must learn it, and it is harder for a keyboard.</p>{war_strip()}</div>'))

    # ---------------- Part B
    out.append(f'''<section class="frame" id="frame-b1"><h2><span class="tag">B1</span>The city screen, quiet level, with levies and faith</h2>
<p>Your four comments: keep the build queue as it is, keep the wonders segment, add a separate segment for empire buildings, and draw levying and the faith panel into the screen. The frame is drawn at 1280 px so that the town's hexes keep their room.</p>
{N[0]}
<p><b>The game\'s name for an empire building is a "great house"</b> (the In play screen and the rules use it). Fourteen buildings are one to a realm today: the Forum, the Caravanserai, the Bourse, Chart the Stars, The Turning Heavens, The Alchemical Codex, the Mouseion, the Bimaristan, the Tophane, the Heroic Epic, the Imperial Throne, the High Temple, The Valley of Kings and The Magnum Opus. The rules mark which of them count as great houses; the segment should read that mark, not a list. A great house has the small seal, because In play counts it as a thing you hold.</p>
<figure class="today"><img src="{uri('now-city.jpg')}" alt="The city screen today" loading="lazy"><figcaption><span class="tag">today</span>The city screen in this game: three panels on the left (growth and borders, specialists, faith with its rites) and the build queue on the right. This seat holds no levy card, so no levy button shows.</figcaption></figure>
<figure class="today"><img src="{uri('now-cityold.jpg')}" alt="The city screen with the levy button" loading="lazy"><figcaption><span class="tag">today</span>A picture of 18 November from a game with a levy card: the "Levy a citizen" button stands under the growth meter. I could not capture its open menu; the menu in the frame follows <code>src/ui/levyMenu.ts</code> (one line a use, the card under it, the cost line at the foot).</figcaption></figure>
<div class="sub" id="frame-b1-full"><h3><span class="tag">proposed</span>A town with everything on</h3><p>Cusco keeps a rite, has a levy that is ready and a levy that waits, two great houses and two wonders. The levy menu is open.</p>{city3()}</div>
<div class="sub" id="frame-b1-small"><h3><span class="tag">proposed</span>A small town with none of it</h3><p>A segment with nothing in it is not drawn. A town with no levy card has no levy button. A town of a realm with no religion and no rites has no faith segment. The left panel is then three segments and about 250 px tall, and the band is one short column.</p>{city3(True)}</div></section>''')

    lines = ''.join(f'<tr><td>{a}</td><td>“{b}”</td></tr>' for a, b in LINES)
    out.append(f'''<section class="frame" id="frame-b2"><h2><span class="tag">B2</span>Diplomacy: two layouts</h2>
<p>Your comment: five columns are busy, the leader selector should be somewhere else, the portrait should be the main focus, and the leader\'s words should be more prominent. The ribbon version is dropped. Both layouts below have no courts column and no standing column.</p>
{N[1]}
<p><b>I recommend A.</b> The words are the largest text on the sheet, which is what you asked for, and the eye has one path: face, words, paper, button. B gives the portrait more room, but the words become a caption and the right side is still three blocks.</p>
<figure class="today"><img src="{uri('now-diplo.jpg')}" alt="The diplomacy sheet today" loading="lazy"><figcaption><span class="tag">today</span>Foreign courts: five columns. The leader is a crest at the top right, and the words are small, at the foot of the paper.</figcaption></figure>
<div class="sub" id="frame-b2-a"><h3><span class="tag r">A</span>The audience (recommended)</h3><p>The other courts are a row of faces under the head. The standing is three lines under the portrait. Declare war is at the bottom left in its new form.</p>{diplo_a()}</div>
<div class="sub" id="frame-b2-b"><h3><span class="tag">B</span>The large portrait</h3><p>The other courts are small faces in the head. The words are on a slip over the portrait.</p>{diplo_b()}</div>
<div class="sub" id="frame-b2-fallback"><h3><span class="tag">fallback</span>Layout A with no painting</h3><p>Modu Chanyu has no portrait here. The window keeps its size and shows the charge of the seat on its colour.</p>{diplo_a(True)}</div>
<div class="sub" id="frame-b2-lines"><h3>What the leaders say today</h3><p>The game has twelve spoken lines, and every leader says the same ones. They are below, with the moment for each. No leader has a line of their own, a greeting, or a line for a first meeting. So "more speaking" needs writing: about four to six lines for each of 13 leaders (a greeting, a yes, a no, a threat, a line for war and one for peace). That is a job to schedule, and it belongs with the leader design pass.</p>
<div class="tbl"><table><thead><tr><th>When</th><th>The line</th></tr></thead><tbody>{lines}</tbody></table></div></div></section>''')

    # ---------------- Part C
    out.append(f'''<section class="frame" id="frame-c1"><h2><span class="tag">C1</span>The faith screen</h2>
<p>The Faith sheet has three tabs today: Rites, Bonuses, and Religion &amp; followers. The frame keeps the three tabs and their words. It changes the head and the Bonuses tab, and gives the Rites tab the light touch.</p>
{N[2]}
<figure class="today"><img src="{uri('now-faith2.jpg')}" alt="The Bonuses tab today" loading="lazy"><figcaption><span class="tag">today</span>The Bonuses tab: two headline boxes, then gods and beliefs as flat boxes with coloured edges.</figcaption></figure>
<figure class="today"><img src="{uri('now-faith1.jpg')}" alt="The Rites tab today" loading="lazy"><figcaption><span class="tag">today</span>The Rites tab: the rites you know as chips, and one row a town.</figcaption></figure>
<figure class="today"><img src="{uri('now-faith3.jpg')}" alt="The Religion and followers tab today" loading="lazy"><figcaption><span class="tag">today</span>Religion &amp; followers: the name, the pantheon wheel, who follows, and the clergy. Not drawn again; it takes the head and the kit.</figcaption></figure>
<div class="sub" id="frame-c1-bonuses"><h3><span class="tag">proposed</span>Bonuses: the tablets</h3><p>Two tablets show a stand-in vignette. The others show the fallback mark.</p>{faith_bonuses()}</div>
<div class="sub" id="frame-c1-rites"><h3><span class="tag">proposed</span>Rites: a plain table</h3><p>The rite a town keeps has the small seal. The figures are mono and aligned.</p>{faith_rites()}</div></section>''')

    rows = ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in SURF)
    out.append(f'''<section class="frame" id="missing"><h2><span class="tag">C2</span>Anything we're missing?</h2>
<p>Yes: four screens that matter, and one group that waits for a choice. I walked every sheet in <code>index.html</code>, the screen list in <code>main.ts</code>, the surfaces in <code>docs/README.md</code> and the eight root pages. The table says what each one looks like today and what it needs.</p>
<div class="tbl"><table><thead><tr><th>Surface</th><th>Look today</th><th>Covered by</th><th>It needs</th></tr></thead><tbody>{rows}</tbody></table></div>
<p style="margin-top:12px">The four drawn below, and why these four:</p>
<ul class="qs"><li><b>The Order draft offer (C3).</b> It is the most frequent choice in the game, and it still shows plain panels while the Council shows engraved cards. It should be one card in both places.</li>
<li><b>The Reliquary (C4).</b> The great person card you approved needs its home, or the offer and the collection would show two different cards.</li>
<li><b>Game setup, the leader step (C5).</b> It is the first place a player meets a leader, and it is the largest leader slot.</li>
<li><b>The unit panel and combat forecast (C6).</b> It is the panel a player sees most, and its teal buttons are the one colour in the game that belongs to neither look.</li></ul>
<p>Left for later: the deal notice and the war dispatch (they wait for your diplomacy layout), and the Compendium (the kit covers it, and a wonder entry gets the window).</p></section>''')

    out.append(f'''<section class="frame" id="frame-c3"><h2><span class="tag">C3</span>The Order draft offer</h2>
<p>The same sheet as the great person offer you approved, with the engraved Order card of the Council screen.</p>
{N[3]}
<figure class="today"><img src="{uri('now-offer.jpg')}" alt="The Order draft today" loading="lazy"><figcaption><span class="tag">today</span>The Order draft: plain panels with a drawn mark.</figcaption></figure>
<div class="sub" id="frame-c3-proposed"><h3><span class="tag">proposed</span>Engraved cards on paper</h3><p>The first card is chosen.</p>{order_offer()}</div></section>''')

    out.append(f'''<section class="frame" id="frame-c4"><h2><span class="tag">C4</span>The Reliquary</h2>
<p>The collection of great people. The layout of today stays: families on the left, the deck in the middle, renown on the right.</p>
{N[4]}
<figure class="today"><img src="{uri('now-reliquary.jpg')}" alt="The Reliquary today" loading="lazy"><figcaption><span class="tag">today</span>The Reliquary: a plain card with a family mark.</figcaption></figure>
<div class="sub" id="frame-c4-proposed"><h3><span class="tag">proposed</span>The same card as the offer</h3><p>Roger Bacon is on top, with a stand-in portrait.</p>{reliquary()}</div></section>''')

    out.append(f'''<section class="frame" id="frame-c5"><h2><span class="tag">C5</span>Game setup: choose a leader</h2>
<p>Step two of a new game. Step one (mode, seed, seats) takes the kit only and is not drawn.</p>
{N[5]}
<figure class="today"><img src="{uri('now-setup.jpg')}" alt="Choose your civ today" loading="lazy"><figcaption><span class="tag">today</span>Choose your civ: a grid of charges, and a small panel on the right.</figcaption></figure>
<div class="sub" id="frame-c5-proposed"><h3><span class="tag">proposed</span>Faces in the grid, the chosen leader on the right</h3><p>Four leaders show stand-in portraits. The rest show the fallback.</p>{setup()}</div></section>''')

    out.append(f'''<section class="frame" id="frame-c6"><h2><span class="tag">C6</span>The unit panel and the combat forecast</h2>
<p>Both are working parts on the map, so both are plain. This frame removes a colour, it does not add a look.</p>
{N[6]}
<figure class="today"><img src="{uri('now-unit.jpg')}" alt="The unit panel today" loading="lazy"><figcaption><span class="tag">today</span>The unit panel: five boxes and teal buttons.</figcaption></figure>
<div class="sub" id="frame-c6-proposed"><h3><span class="tag">proposed</span>Plain figures, plain buttons</h3><p>A Composite Bowman is selected and the pointer is on an enemy.</p>{unit_panel()}</div></section>''')

    out.append('''<section class="frame" id="slots"><h2>The splash art slots, updated</h2>
<div class="tbl"><table><thead><tr><th>Slot</th><th>Shape</th><th>Size on screen</th><th>Count</th><th>Fallback</th><th>Frame</th><th>State</th></tr></thead><tbody>
<tr><td>Wonder, plate</td><td class="n">16:9</td><td class="n">about 1100 px wide</td><td class="n">34, painted</td><td>The lapis page with the seal</td><td>built</td><td>built</td></tr>
<tr><td>Wonder, in the city's "wonders here"</td><td class="n">16:9</td><td class="n">60 by 34 px</td><td class="n">same 34</td><td>The small seal</td><td>B1</td><td>approved</td></tr>
<tr><td>Age</td><td class="n">16:9</td><td class="n">720 by 405 px, on the ribbon</td><td class="n">5</td><td>The ribbon with the numeral in the window</td><td>A7</td><td>approved</td></tr>
<tr><td>Great person</td><td class="n">5:6, arched</td><td class="n">150 by 180 px</td><td class="n">about 20 to start</td><td>The family emblem as a seal</td><td>A5, C4</td><td>approved</td></tr>
<tr><td>Government</td><td class="n">3:1</td><td class="n">330 by 110 px</td><td class="n">13</td><td>The emblem, the name and the tier</td><td>A6</td><td>approved</td></tr>
<tr><td>Title</td><td class="n">16:9, shown wide</td><td class="n">full width</td><td class="n">1</td><td>Today's banner</td><td>A8</td><td>approved</td></tr>
<tr><td>Ending</td><td class="n">16:9</td><td class="n">496 by 279 px</td><td class="n">1 for a win, 1 for a loss</td><td>The abacus alone</td><td>A9</td><td>win approved</td></tr>
<tr><td>Leader</td><td class="n">3:4</td><td class="n">228 or 330 px wide; 132; 48; a 28 px circle</td><td class="n">13</td><td>The seat's charge on its colour</td><td>B2, C5</td><td>proposed</td></tr>
<tr><td>Belief</td><td class="n">1:1, shown round</td><td class="n">62 px</td><td class="n">one a belief and god</td><td>The belief mark as a seal</td><td>C1</td><td>proposed</td></tr>
</tbody></table></div>
<p class="small" style="margin-top:10px">Removed since the second pass: the painting in a toast, in the build queue and in the star chart. A painted thing has its own screen.</p></section>

<section class="frame" id="rules"><h2>The rules of the style, updated</h2>
<div class="reco"><ol>
<li><b>Paper is the working interface.</b> Panels, sheets, lists, tables, tooltips and buttons are flat parchment with ink text and mono figures. This includes the build queue, the unit panel and the forecast.</li>
<li><b>Engraving marks what you hold:</b> an Order, a Doctrine, a government, a wonder, a great house, a belief, a great person, a legacy. In a list or a toast, a held thing has only the small seal (a ring and a dot).</li>
<li><b>A technology, a resource, a building and a unit are never engraved.</b></li>
<li><b>Lapis and gilt mark a moment.</b> The ribbon stands behind a wonder and an age, over the board. The full lapis page is for the ending only. No ribbon on a working sheet.</li>
<li><b>Gilt is a hairline, never a fill,</b> outside a card. Every sheet head has the same rule: ink over gilt.</li>
<li><b>A painting appears only in the window,</b> and only on a screen made for it: a plate, an offer, the Reliquary, diplomacy, setup, the faith tablets, the title, the ending. Never in a toast, a queue, a table or a tooltip.</li>
<li><b>Every window has a fallback of the same size.</b></li>
<li><b>The dark cloth is the card table</b> (the Council, In play, the star chart). An offer opens on paper.</li>
<li><b>Colour has a job.</b> Cinnabar is the next step, at the bottom right. Dark red with the blade is war, at the bottom left, and it asks first. No other button has a fill.</li>
<li><b>These never change:</b> the ink top bar, End turn, the × to close, today's tab words, plain words, the town banners.</li>
</ol></div></section>

<section class="frame" id="build"><h2>The build order, updated</h2>
<p>A stage marked <span class="tag ok">can start</span> is fully approved: no open question on this board touches it.</p>
<div class="tbl"><table><thead><tr><th>Stage</th><th>What</th><th>Size</th><th>State</th></tr></thead><tbody>
<tr><td>1 · The kit</td><td>The painting window with its fallback. The ink and gilt head rule and the × on every sheet. The small seal in toasts and keyword chips. The Owner line in the hex tooltip. The star chart's new hint words. The tag line on the title.</td><td>Small</td><td><span class="tag ok">can start</span></td></tr>
<tr><td>2 · The working sheets</td><td>Caravans, the Ledger, Standings, the census, saves: the head, the chips with today's words, the tables.</td><td>Small</td><td><span class="tag ok">can start</span></td></tr>
<tr><td>3 · The offers</td><td>The great person card and the government banner rows in the offer sheet, with their fallbacks.</td><td>Medium</td><td><span class="tag ok">can start</span></td></tr>
<tr><td>4 · The age plate and the title</td><td>The painting window on the ribbon for an age. The wide title screen.</td><td>Small to medium</td><td><span class="tag ok">can start</span>; paintings can come later</td></tr>
<tr><td>5 · The ending</td><td>The page for a win and for a loss.</td><td>Medium</td><td>The win can start; the loss needs your word</td></tr>
<tr><td>6 · Declare war</td><td>The button and its confirm step.</td><td>Small</td><td>Needs your choice of A or B</td></tr>
<tr><td>7 · The Order draft and the Reliquary</td><td>The engraved Order card in the offer. The great person card in the Reliquary and in In play.</td><td>Small to medium</td><td>Needs your word on C3 and C4; after stage 3</td></tr>
<tr><td>8 · The unit panel and forecast</td><td>Plain buttons and figures.</td><td>Small</td><td>Needs your word on C6</td></tr>
<tr><td>9 · The faith sheet</td><td>The head, the tablets on Bonuses, the plain Rites table.</td><td>Medium</td><td>Needs your word on C1</td></tr>
<tr><td>10 · The city screen</td><td>The left panel, the band of what stands in the town, the levy menu, the faith segment.</td><td>Medium to large</td><td>Needs your word on B1, then its own board</td></tr>
<tr><td>11 · Faces</td><td>Diplomacy in the layout you choose, then the deal notice and the war dispatch, the setup screen, the turn card.</td><td>Medium to large</td><td>Needs your choice on B2 and the leader design pass; the leaders' own lines need writing</td></tr>
</tbody></table></div></section>

<section class="frame" id="questions"><h2>Questions for you</h2>
<ol class="qs">
<li><b>Diplomacy: layout A or layout B?</b> (B2.) And may I schedule the writing of each leader's own lines with the leader design pass?</li>
<li><b>Declare war: A (a solid button, then a sheet that asks) or B (press and hold)?</b> (A11.)</li>
<li><b>The city screen: is the band at the foot right</b> for buildings, great houses and wonders, with growth, levies and faith on the left? Or do you want all of it in the left panel, with segments that open and close? (B1.)</li>
<li><b>Are the four new frames right as drawn:</b> the Order draft (C3), the Reliquary (C4), setup (C5) and the unit panel (C6)? And is the loss ending (A9) approved with the win?</li>
</ol></section>''')

    out.append('''</div><script>
(function(){function fit(){document.querySelectorAll('.fit').forEach(function(f){var s=f.firstElementChild,w=+s.dataset.w,h=+s.dataset.h;f.classList.add('js');var k=Math.max(Math.min(1,f.clientWidth/w),0.62);s.style.transform='scale('+k+')';f.style.height=Math.round(h*k)+'px';s.style.marginBottom=Math.round(h*k-h)+'px';s.style.marginRight=Math.round(w*k-w)+'px';f.style.overflowX=w*k>f.clientWidth+1?'auto':'hidden';s.style.marginLeft=Math.max(0,(f.clientWidth-w*k)/2)+'px';});}
fit();addEventListener('resize',fit);})();
</script>''')
    html = '\n'.join(out)
    open(os.path.join(HERE, 'quiet-table-third-pass.html'), 'w').write(html)
    open(os.path.join(HERE, 'preview.html'), 'w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + '</body></html>')
    print('ok', round(len(html) / 1e6, 2), 'MB')

if __name__ == '__main__':
    build()
