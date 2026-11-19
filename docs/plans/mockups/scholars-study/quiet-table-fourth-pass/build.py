#!/usr/bin/env python3
"""Builds quiet-table-fourth-pass.html: only the frames that still need a decision.

Run: python3 build.py
Reads board.css, extra.css, four.css, symbols.py, base.py (the second pass's
drawing code) and third.py (the third pass's), both used as libraries, and the
pictures in img/. Every picture goes into the page as a data: URI.
preview.html is the same content in a full document.
"""
import os
import base as B
import third as T
from base import uri, yi, ic, dev, mk, stage, veil, pw, fb, FACE, F, P, G, SC, CU, FA, topbar, gp
from third import seal_dot, war_button, owner_row, oc, give_half

HERE = os.path.dirname(os.path.abspath(__file__))
B.PAINT = ['terracottaArmy', 'colossus', 'statueOfZeus', 'greatLibrary']
B.THUMB = ['pyramids']
GEAR = f'<span style="color:var(--soft)">{P}</span>'

# ================================================================ 1 the city
QROWS = [('Warrior', '15', '1t', None), ('Scout', '15', '1t', None), ('Settler', '119', '4t', None), ('Worker', '38', '1t', None), ('Spearman', '27', '1t', None),
         ('Horseman', '151', '4t', None), ('Catapult', '174', '5t', None), ('Composite Bowman', '151', '4t', None), ('Bireme', '61', '2t', '244'), ('War Galley', '87', '3t', '348')]

def city_head(name, size, hp):
    ys = ''.join(f'<span style="color:var(--{c})">{i}{v}</span>' for c, i, v in (('f', F, 30), ('p', P, 40), ('g', G, 46), ('s', SC, 26), ('c', CU, 13), ('fa', FA, 3)))
    return f'''<div class="abs" style="left:0;right:0;top:0;background:var(--parch);z-index:2"><div class="sh" style="padding:9px 14px 8px"><span class="btn sm" style="padding:0 7px">‹</span><span class="sh-title">{name}</span><span class="btn sm" style="padding:0 7px">›</span><span class="lbl">size <span class="n">{size}</span> · <span class="n">{hp}</span> hp</span><span class="sp"></span><span class="n" style="font-size:13px;display:flex;gap:13px;font-weight:600">{ys}</span><span class="x" title="Leave the town">×</span></div><div class="hr-q"></div></div>'''

def queue(now='The Great Lighthouse', prog='131/170 · 1t', pct=77, rows=QROWS):
    rs = ''
    for n, c, t, g in rows:
        buy = f'<span class="buy">{g}{G}</span>' if g else '<span style="width:52px"></span>'
        rs += f'<div class="row" style="grid-template-columns:18px 1fr auto auto;padding:5px 12px">{GEAR}<span style="font-weight:600">{n}</span><span class="cst"><span style="color:var(--p)">{c}{P}</span> · {t}</span>{buy}</div>'
    return f'''<div class="panel" style="position:absolute;right:14px;top:66px;width:400px"><div style="padding:10px 12px 9px"><div class="lbl">Building now</div><div style="display:flex;align-items:baseline;gap:10px;margin-top:2px"><span style="font-family:var(--disp);font-size:21px;line-height:1.1">{now}</span><span style="flex:1"></span><span class="n" style="font-size:12.5px">{prog}</span></div><div class="meter" style="margin-top:5px"><i style="width:{pct}%;background:var(--p)"></i></div></div>
<div style="padding:7px 12px 8px;border-top:1px solid var(--rule)"><div class="lbl" style="margin-bottom:5px">Add to queue</div><div style="display:flex;gap:5px;flex-wrap:wrap"><span class="chip on">All</span><span class="chip">Units</span><span class="chip">Buildings</span><span class="chip">Wonders</span><span class="chip">Projects</span><span class="chip">Faith</span></div><div style="display:flex;justify-content:space-between;margin-top:7px"><span class="lbl">Buy outright · full price</span><span class="lbl">you have <span class="n" style="color:var(--g)">555</span> gold</span></div></div>
<div class="lbl" style="padding:2px 12px 4px">Units</div>{rs}</div>'''

def fold(label, right, open_=False, body=''):
    arrow = '▾' if open_ else '›'
    st = 'background:#fffaf0;' if open_ else ''
    b = f'<div style="padding:2px 0 9px">{body}</div>' if open_ else ''
    return f'<div style="border-top:1px solid var(--rule);{st}margin:0 -13px;padding:0 13px"><div style="display:flex;align-items:center;gap:8px;height:32px;font-size:13px"><b style="font-weight:600">{label}</b><span style="flex:1"></span><span style="font-size:12px;color:var(--soft)">{right}</span><span style="color:var(--faint);width:10px;text-align:center">{arrow}</span></div>{b}</div>'

def city4(state):
    def first(t, right=''):
        return f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:9px"><span class="lbl">{t}</span><span class="n" style="font-size:12px;white-space:nowrap">{right}</span></div>'
    if state == 'small':
        growth = f'''{first('Growth', f'+3{F} · 6 turns')}<div class="meter" style="margin-top:4px"><i style="width:40%;background:var(--f)"></i></div>'''
        borders = f'''{first('Borders', f'+2{CU} · 9 turns')}<div class="meter" style="margin-top:4px"><i style="width:10%;background:var(--c)"></i></div>'''
        cit = f'''{first('Citizens', '2')}<div style="display:flex;gap:5px;margin:6px 0 11px"><span class="chip on">Default</span><span class="chip">Food</span><span class="chip">Production</span><span class="chip">Gold</span></div>'''
        left = f'''<div class="panel" style="position:absolute;left:14px;top:66px;width:286px;padding:2px 13px 0;overflow:hidden">{growth}{borders}{cit}{fold('Buildings', '<span class="n">1</span>')}</div>'''
        return stage(1280, 420, city_head('Pisac', 2, '60/60') + left + queue('Monument', '12/40 · 5t', 30, QROWS[:5]), 'map-close')
    growth = f'''{first('Growth', f'+8{F} · 15 turns')}<div class="meter" style="margin-top:4px"><i style="width:14%;background:var(--f)"></i></div>'''
    borders = f'''{first('Borders', f'+13{CU} · 5 turns')}<div class="meter" style="margin-top:4px"><i style="width:22%;background:var(--c)"></i></div>'''
    cit = f'''{first('Citizens', '12')}<div style="display:flex;gap:5px;margin:6px 0 11px"><span class="chip on">Default</span><span class="chip">Food</span><span class="chip">Production</span><span class="chip">Gold</span></div>'''
    faith_body = f'''<div style="font-size:12px">Follows <b style="color:var(--fa)">the Children of Elder and Cloud</b> · <span class="n">3</span> of <span class="n">12</span> citizens · <span class="n">+10{FA}</span> pressed a turn</div>
<div style="border:1px solid var(--edge);border-radius:4px;background:var(--parch);padding:6px 8px;margin-top:6px"><div style="display:flex;justify-content:space-between;font-size:12.5px"><b>Rite of the Harvest</b><span class="n" style="color:var(--f)">+10{F}</span></div><div class="meter" style="margin-top:4px;height:5px"><i style="width:10%;background:var(--fa)"></i></div><div style="font-size:11.5px;color:var(--faint);margin-top:3px"><span class="n">9</span> turns left. A town keeps one rite.</div></div>
<div style="font-size:12px;margin-top:6px"><u style="text-underline-offset:3px">Every rite, in the Faith sheet →</u></div>'''
    op = state == 'open'
    folds = (fold('Buildings', '<span class="n">6</span>') + fold('Great houses', '<span class="n">2</span>') + fold('Wonders', '<span class="n">2</span>') + fold('Specialists', '<span class="n">3</span>')
             + fold('Faith', '' if op else 'a rite, <span class="n">9</span> turns', op, faith_body) + fold('Levy a citizen', '<span class="n">1</span> ready'))
    left = f'''<div class="panel" style="position:absolute;left:14px;top:66px;width:286px;padding:2px 13px 0;overflow:hidden">{growth}{borders}{cit}{folds}</div>'''
    return stage(1280, 700, city_head('Cusco ★', 12, '190/190') + left + queue(), 'map-close')

# ================================================================ 2 diplomacy B
COURTS = [('Emperor Taizong', '#1f7a5c', 'i-knot', 'peace'), ('Modu Chanyu', '#2f5d8a', 'i-horse', 'peace'), ('Akhenaten', '#c9771e', 'm-sun', 'war'), ("Al-Ma'mun", '#1d1a20', 's-sphere', 'offer'), ('Mithridates VI', '#6b2a7a', 's-cup', 'peace'),
          ('Joan of Arc', '#2b3f9e', 's-sword', 'peace'), ('Mansa Musa', '#d9a521', 's-coin', 'peace'), ('Zheng He', '#b5301f', 'e-compass', 'unmet'), ('Nezahualcoyotl', '#1f8f8a', 'e-tree', 'peace'), ('Hypatia', '#d8cfae', 's-sphere', 'unmet'), ('Hildegard of Bingen', '#4d9a3a', 'e-sheaf', 'peace')]

def court_mark(name, col, dv, st, size=30, on=False):
    dot = {'war': '<i style="position:absolute;right:-3px;top:-3px;width:9px;height:9px;border-radius:50%;background:#7a1f14;border:1.5px solid var(--parch)"></i>', 'offer': '<i style="position:absolute;right:-3px;top:-3px;width:9px;height:9px;border-radius:50%;background:var(--cinnabar);border:1.5px solid var(--parch)"></i>'}.get(st, '')
    ring = 'box-shadow:0 0 0 2px var(--parch),0 0 0 4px var(--ink);' if on else ''
    op = 'opacity:.35;' if st == 'unmet' else ''
    return f'<span style="position:relative;display:block;width:{size}px;height:{size}px;{op}" title="{name}">{fb(size, size, dv, "thin", tinct=col, style="border-radius:4px;" + ring)}{dot}</span>'

def diplo_b4(mode):
    def col(t, hand, items, hidden=''):
        its = ''.join(f'<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">{x}</div>' for x in items)
        return f'<div><div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:3px"><b style="font-family:var(--name);font-size:14px">{t}</b><span class="lbl"><span class="n">{hand}</span> gold</span></div>{its}<div style="font-size:11.5px;color:var(--faint);margin-top:8px;font-style:italic">{hidden}</div></div>'
    you = col('You can give', '555', ['<span class="give">Gold, once</span><span class="give">Gold a turn <i>20 turns</i></span>', '<span class="give">Open borders</span>', '<span class="give">Incense <span class="n">1</span> <i>last</i></span><span class="give">Marble <span class="n">0</span></span>'], 'Not shown: Wine, Jade, Tea. You both own them.')
    they = col('They can give', '343', ['<span class="give">Gold, once</span><span class="give">Gold a turn <i>20 turns</i></span>', '<span class="give">Open borders</span>', '<span class="give">Sugar <span class="n">2</span></span>'])
    slip = f'''<div style="background:#fffaf0;border:1px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:10px 14px 12px"><div style="font-family:var(--disp);font-style:italic;font-size:23px;line-height:1.18"><span style="color:var(--rubric)">“</span>{T.SPEECH}<span style="color:var(--rubric)">”</span></div></div>'''
    table = '''<div style="background:#fffaf0;border:1px solid var(--edge);padding:9px 14px;display:grid;grid-template-columns:auto 1fr 1fr;gap:4px 18px;align-items:baseline"><span style="font-family:var(--disp);font-size:18px;grid-row:1/3;align-self:center">On the table</span><span style="font-size:12.5px"><b>Pachacuti gives</b> <span class="slip" style="color:var(--faint);font-size:13px">nothing</span></span><span style="font-size:12.5px"><b>Emperor Taizong gives</b> <span class="slip" style="color:var(--faint);font-size:13px">nothing</span></span></div>'''
    px = 62 if mode != 'plate' else 18  # the portrait moves right when the strip stands beside it
    strip = ''
    if mode != 'plate':
        marks = ''.join(f'<div style="margin-bottom:7px">{court_mark(n, c, d, s, 30, i == 0)}</div>' for i, (n, c, d, s) in enumerate(COURTS))
        strip = f'<div class="abs" style="left:18px;top:18px;width:34px">{marks}</div>'
        if mode == 'strip':
            strip += '<div class="abs panel" style="left:58px;top:86px;padding:4px 9px;font-size:12px;border-color:var(--ink);white-space:nowrap;z-index:4"><b style="font-family:var(--name)">Akhenaten</b> · at war</div>'
    plate = f'''<div style="display:flex;align-items:center;gap:8px;background:var(--ink);color:#f7f2e1;padding:6px 8px"><span class="btn sm" style="background:transparent;color:#f7f2e1;border-color:rgba(247,242,225,.5);padding:0 7px">‹</span><span style="flex:1;text-align:center"><span style="font-family:var(--cn);font-size:16px;letter-spacing:.04em">Emperor Taizong</span> <span style="font-size:11.5px;color:#cfc8b8">· the Tang ▾</span></span><span class="btn sm" style="background:transparent;color:#f7f2e1;border-color:rgba(247,242,225,.5);padding:0 7px">›</span></div>'''
    pw_w, pw_h = (330, 440) if mode == 'plate' else (318, 424)
    portrait = f'''<div class="abs" style="left:{px}px;top:16px">{pw('terracottaArmy', pw_w, pw_h, bg=FACE['terracottaArmy'], label='stand-in for a portrait')}</div>'''
    nameplate = f'<div class="abs" style="left:{px + 1}px;top:17px;width:{pw_w}px">{plate}</div>' if mode == 'plate' else f'<div class="abs" style="left:{px + 14}px;top:300px;font-family:var(--cn);font-size:14px;letter-spacing:.06em;color:#fbf3e2;text-shadow:0 1px 3px rgba(0,0,0,.7)">Emperor Taizong · the Tang · at peace</div>'
    picker = ''
    if mode == 'plate':
        rows = ''.join(f'<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;font-size:12.5px;{"background:#fffaf0;font-weight:600;" if i == 0 else ""}{"opacity:.45;" if s == "unmet" else ""}">{court_mark(n, c, d, "", 20)}<span style="flex:1">{n}</span><span style="font-size:11.5px;color:{"#7a1f14" if s == "war" else "var(--faint)"}">{ {"peace": "at peace", "war": "at war", "offer": "an offer waits", "unmet": "not met"}[s] }</span></div>' for i, (n, c, d, s) in enumerate(COURTS))
        picker = f'<div class="abs panel" style="left:{px + 30}px;top:52px;width:270px;padding:4px 0;border-color:var(--ink);box-shadow:0 8px 22px rgba(29,26,32,.35);z-index:5">{rows}</div>'
    rx = px + pw_w + 24
    deals_btn = '<span class="btn" style="position:relative">Standing and deals <span class="n">2</span><i style="position:absolute;right:-4px;top:-4px;width:9px;height:9px;border-radius:50%;background:var(--cinnabar);border:1.5px solid var(--parch)"></i></span>'
    right = f'''<div class="abs" style="left:{rx}px;top:16px;right:18px;display:flex;gap:14px;align-items:baseline;border-bottom:1px solid var(--rule);padding-bottom:6px"><b style="font-size:13px;border-bottom:2px solid var(--ink);padding-bottom:6px;margin-bottom:-7px">Exchange</b><span style="font-size:13px;color:var(--faint)">Peace terms</span></div>
<div class="abs" style="left:{rx}px;top:60px;right:18px;display:grid;grid-template-columns:1fr 1fr;gap:22px">{you}{they}</div>
<div class="abs" style="left:{rx}px;top:300px;right:18px">{table}</div>
<div class="abs" style="left:{rx}px;right:18px;top:384px;display:flex;gap:8px"><span class="btn off">What would make this work?</span><span class="btn off">What would you give for this?</span></div>
<div class="abs" style="left:{rx}px;right:18px;bottom:12px;display:flex;align-items:center;gap:8px">{war_button()}<span style="flex:1"></span>{deals_btn}<span class="btn pri off">Propose</span></div>'''
    drawer = ''
    if mode == 'drawer':
        def h(t, r=''):
            return f'<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:3px;margin-top:14px"><b style="font-family:var(--name);font-size:14px">{t}</b><span class="lbl">{r}</span></div>'
        def deal(a, b, left, btn='Read'):
            l = f'<span class="n" style="font-weight:600">{left}</span>' if left else ''
            return f'<div style="display:grid;grid-template-columns:1fr auto auto;gap:2px 12px;align-items:center;border-bottom:1px solid var(--rule);padding:6px 0;font-size:12.5px"><span>You give {a}<br>You receive {b}</span>{l}<span class="btn sm">{btn}</span></div>'
        rel = ''.join(f'<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--rule);padding:5px 0;font-size:12.5px"><span>{a}</span><b>{b}</b></div>' for a, b in (('Relation', 'At peace'), ('Their borders', 'Open to you, 14 turns'), ('Your borders', 'Closed to them')))
        drawer = f'''<div class="abs" style="left:{rx - 12}px;top:0;right:0;bottom:0;background:var(--parch);border-left:1px solid var(--ink);box-shadow:-10px 0 24px rgba(29,26,32,.18);padding:14px 18px;z-index:3"><div style="display:flex;align-items:center"><span style="font-family:var(--disp);font-size:22px">Standing and deals</span><span style="flex:1"></span><span class="hint" style="font-size:12px;color:var(--faint);margin-right:8px">back to the exchange</span><span class="x">×</span></div>
{h('Standing')}{rel}
{h('In force', 'turns left')}{deal('<span class="n">4</span> gold a turn', 'Open borders', '14')}{deal('Incense', 'Sugar', '6')}
{h('Waiting for your answer')}{deal('Marble', '<span class="n">60</span> gold, once', '')}
{h('Your offers')}<div class="slip" style="color:var(--faint);font-size:13px;padding:6px 0">None</div></div>'''
    sheet = f'''<div class="sheet" style="left:30px;top:14px;width:940px;height:592px"><div class="sh"><span class="sh-title">Foreign <i>courts</i></span><span class="lbl">turn <span class="n">101</span> · <span class="n">9</span> of <span class="n">11</span> courts met</span><span class="sp"></span><span class="x">×</span></div><div class="hr-q"></div>
<div style="position:relative;flex:1;overflow:hidden">{strip}{portrait}{nameplate}
<div class="abs" style="left:{px + 22}px;top:344px;width:{pw_w - 34}px">{slip}</div>{picker}{right}{drawer}</div></div>'''
    return stage(1000, 620, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

# ================================================================ 3 faith: religion and followers
def faith_religion():
    tabs = ''.join(f'<span class="chip{" on" if i == 1 else ""}" style="font-family:var(--ui);font-size:12.5px;font-weight:600;padding:3px 12px">{t}</span>' for i, t in enumerate(('Rites <span class="n" style="font-weight:400">1 kept · 9 free</span>', 'Religion &amp; followers', 'Bonuses')))
    head = f'''<div class="sh"><span class="sh-title">The Children of <i>Elder and Cloud</i></span><span class="btn sm" title="Rename">Rename</span><span class="lbl" style="white-space:nowrap">holy city Cusco ★ · founded by you</span><span class="sp"></span><span class="n" style="font-size:13px;font-weight:600;color:var(--fa);white-space:nowrap">{FA}67 (+22)</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="padding:10px 16px 0;display:flex;gap:6px;align-items:center">{tabs}</div>'''
    def bar(n, m):
        return f'<span style="display:inline-flex;align-items:center;gap:8px"><span class="meter" style="width:56px;height:6px;border-color:var(--edge)"><i style="width:{100 * n / m:.0f}%;background:var(--fa)"></i></span><span class="n">{n} of {m}</span></span>'
    towns = [('Cusco ★', 3, 12, '+10'), ('Quito', 1, 6, '+6'), ('Tumebamba', 1, 6, '+6'), ('Cajamarca', 1, 8, '+6'), ('Machu Picchu', 1, 5, '+6')]
    far = [('Vilcashuamán', 8), ('Huánuco Pampa', 6), ('Hatun Xauxa', 3), ('Ollantaytambo', 2), ('Pisac', 2)]
    trs = ''.join(f'<tr><td><b>{n}</b></td><td>{bar(a, b)}</td><td class="n" style="color:var(--fa)">{p}</td><td class="n" style="color:var(--faint)">none</td></tr>' for n, a, b, p in towns)
    trs += ''.join(f'<tr style="color:var(--faint)"><td><b>{n}</b></td><td>{bar(0, b)}</td><td colspan="2" class="n" style="font-family:var(--ui)">not reached</td></tr>' for n, b in far)
    summary = f'''<div style="display:flex;gap:26px;align-items:baseline;padding:8px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);font-size:12.5px"><span><span class="n" style="font-size:15px;font-weight:600">5</span> of <span class="n">10</span> of your towns follow</span><span><span class="n" style="font-size:15px;font-weight:600">0</span> foreign towns follow</span><span><span class="n" style="font-size:15px;font-weight:600;color:var(--fa)">+6{FA}</span> a turn from the holy site</span><span style="flex:1"></span><u style="text-underline-offset:3px">What your gods and beliefs pay: Bonuses →</u></div>'''
    wheel = '''<svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="70" fill="#fffaf0" stroke="#1d1a20" stroke-width="2"/><circle cx="75" cy="75" r="42" fill="#f7f2e1" stroke="#1d1a20" stroke-width="2"/><g stroke="rgba(29,26,32,.35)" stroke-width="1">''' + ''.join(f'<line x1="{75 + 42 * __import__("math").cos(i * 0.3927):.1f}" y1="{75 + 42 * __import__("math").sin(i * 0.3927):.1f}" x2="{75 + 70 * __import__("math").cos(i * 0.3927):.1f}" y2="{75 + 70 * __import__("math").sin(i * 0.3927):.1f}"/>' for i in range(16)) + '''</g><path d="M75 5A70 70 0 0 1 101.8 10.3L91.1 36.2A42 42 0 0 0 75 33Z" fill="#e8c35e" stroke="#1d1a20"/><path d="M139.7 48.2A70 70 0 0 1 145 75L117 75A42 42 0 0 0 113.8 58.9Z" fill="#e8c35e" stroke="#1d1a20"/><path d="M25.5 124.5A70 70 0 0 1 10.3 101.8L36.2 91.1A42 42 0 0 0 45.3 104.7Z" fill="#e8c35e" stroke="#1d1a20"/><text x="75" y="74" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-weight="600" font-size="17" fill="#994074">3/3</text><text x="75" y="90" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="8.5" letter-spacing="1" fill="#625e5b">PANTHEON</text></svg>'''
    rel_rows = f'''<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--fa);margin-right:6px"></i><b>The Children of Elder and Cloud</b></td><td>You</td><td>Cusco ★</td><td class="n">5</td></tr><tr style="color:var(--faint)"><td colspan="4">One more religion can be founded in this world (<span class="n">1</span> of <span class="n">2</span>).</td></tr>'''
    def cl(name, what, price, why):
        return f'<div style="display:grid;grid-template-columns:74px minmax(0,1fr) auto;gap:8px;align-items:center;border-top:1px solid var(--rule);padding:6px 0;font-size:12.5px;line-height:1.3"><b style="font-family:var(--name);font-size:13.5px">{name}</b><span>{what}<br><span style="color:var(--rubric);font-size:11.5px">{why}</span></span><span class="btn sm off">Call · <span class="n" style="color:var(--fa)">{price}{FA}</span></span></div>'
    clergy = (cl('Prophet', 'Founds the religion, draws a belief, says a rite over the realm.', 180, 'A Settler stands in Cusco. Move it first.')
              + cl('Apostle', 'Proclaims the faith, mends units, leaves a relic.', 90, 'Apostles need Theology.')
              + cl('Inquisitor', 'Pushes rival faiths back, steadies soldiers.', 200, 'Inquisitors need The Holy Office.'))
    sheet = f'''<div class="sheet" style="left:30px;top:14px;width:940px;height:672px">{head}
<div style="padding:10px 16px 0">{summary}</div>
<div style="display:grid;grid-template-columns:minmax(0,1fr) 348px;gap:22px;padding:10px 16px 0">
<div style="min-width:0"><table class="led"><thead><tr><th>Your towns</th><th>Following</th><th class="n">Yours presses</th><th class="n">Rivals press</th></tr></thead><tbody>{trs}</tbody></table>
<table class="led" style="margin-top:10px"><thead><tr><th>Foreign towns · <span class="n">0</span> follow, <span class="n">0</span> by majority</th></tr></thead><tbody><tr><td style="color:var(--faint)">No foreign town follows yet. When one does, its owner gets your follower beliefs.</td></tr></tbody></table></div>
<div><div style="display:flex;gap:14px;align-items:center">{wheel}<div style="font-size:12.5px;min-width:0"><div class="lbl">Pantheon</div><div style="margin-top:3px">The pantheon is full: <span class="n">3</span> of <span class="n">3</span> gods.</div><div style="margin-top:6px;color:var(--soft)">Sacred Fire<br>Star Readers<br>God of the Forge</div></div></div>
<table class="led wrap" style="margin-top:10px"><thead><tr><th>Religions in the world</th><th>Founder</th><th>Holy city</th><th class="n">Towns</th></tr></thead><tbody>{rel_rows}</tbody></table>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><span class="lbl">The clergy</span><span style="font-size:12px">called in <span class="btn sm">Cusco ▾</span></span></div><div style="margin-top:5px">{clergy}</div></div></div></div>'''
    return stage(1000, 700, veil('rgba(29,26,32,.42)') + sheet, 'map-wide')

# ================================================================ 4 the Order draft
def card_back(w=206, style=''):
    return f'<div class="cb" style="--w:{w}px;{style}"><svg style="width:38%;height:38%"><use href="#m-sun"/></svg></div>'

def oc_wait(key, w=206, sel=False):
    """An Order card as a choice: the flourish stands where the figure will land on the pick."""
    h = oc(key, w, sel)
    c = T.CARDS[key]
    plate_old = f'<div class="oc-plate">{c["plate"]}</div>' if c['plate'] else '<div class="oc-plate" style="border-top-color:transparent">&nbsp;</div>'
    assert plate_old in h
    return h.replace(plate_old, '<div class="oc-plate" style="font-weight:400;color:#56505a;font-size:1.2em">— · ✶ · —</div>')

def order_offer4():
    sheet = f'''<div class="sheet" style="left:96px;top:14px;width:808px;height:444px"><div class="sh"><span class="sh-title">Write it into law</span><span class="lbl">a new Order joins your collection</span><span class="sp"></span><span class="hint">The offer waits. Nothing is spent.</span><span class="x">×</span></div><div class="hr-q"></div>
<div style="display:flex;gap:30px;justify-content:center;margin-top:28px">{oc_wait('yards', 220, True)}{oc_wait('names', 220)}{oc_wait('watch', 220)}</div>
<div style="margin-top:auto;padding:10px 16px 12px;display:flex;align-items:center;gap:10px"><span class="btn">Ask again · <span class="n" style="color:var(--fa)">56{FA}</span></span><span style="font-size:12px;color:var(--faint)">You have <span class="n">67</span> faith.</span><span style="flex:1"></span><span class="btn">Pass</span><span class="btn pri">Take The Engineers' Yards</span></div></div>'''
    return stage(1000, 472, veil('rgba(29,26,32,.42)') + sheet, 'map-close')

def storyboard():
    W = 52
    def fr(x, t, title, cards, note):
        return f'''<div class="abs" style="left:{x}px;top:14px;width:184px"><div class="n" style="font-size:11.5px;font-weight:600">{t}</div><div style="font-weight:600;font-size:12.5px;margin-top:1px">{title}</div><div style="height:96px;margin-top:8px;border:1px solid var(--edge);border-radius:4px;background:var(--parch);display:flex;gap:8px;justify-content:center;align-items:center">{cards}</div><div style="font-size:12px;color:var(--soft);margin-top:6px;line-height:1.35">{note}</div></div>'''
    back = card_back(W, 'box-shadow:2px 2px 0 #1d1a20;border-width:1.5px;')
    def face(col, lift=False, dim=False, fig=''):
        st = ('transform:translateY(-6px);box-shadow:2px 2px 0 #1d1a20,0 0 0 2px var(--gilt-hi);' if lift else 'box-shadow:2px 2px 0 #1d1a20;') + ('opacity:.3;' if dim else '')
        return f'<div style="width:{W}px;height:{W * 1.229:.0f}px;border:1.5px solid {col};border-radius:4px;background:var(--card);{st}display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:5px 3px 3px"><svg style="width:22px;height:22px;color:{col}" viewBox="0 0 100 100"><use href="#dev"/></svg><span class="n" style="font-size:9.5px;font-weight:600;color:#94500f">{fig}</span></div>'
    turning = f'<div style="width:{W}px;display:grid;place-items:center">{card_back(W, "transform:scaleX(.28);box-shadow:none;border-width:1.5px;")}</div>'
    eco, civ, mil = '#b5791b', '#4f78be', '#a8361b'
    inner = (fr(16, '0 ms', 'The sheet settles', back + back + back, 'Three cards lie face down, with the draft pile\'s back. The sheet takes <span class="n">240</span> ms to settle, as today.')
             + fr(212, '300 to 720 ms', 'The first card turns', turning + back + back, 'Each card takes <span class="n">420</span> ms to turn, as today.')
             + fr(408, '560 to 980 ms', 'The second card turns', face(eco) + turning + back, 'The next card starts <span class="n">260</span> ms after the one before. Today it is <span class="n">110</span> ms, so the three look like one move.')
             + fr(604, '1240 ms', 'All three are up', face(eco) + face(civ) + face(mil), 'The buttons wake now. A click or a key before this turns every card up at once and chooses nothing.')
             + fr(800, 'On the pick', 'The figure arrives', face(eco, True, fig='+8') + face(civ, dim=True) + face(mil, dim=True), 'As today: the card is weighed when it is taken. The figure counts up over <span class="n">750</span> ms and the sheet leaves at <span class="n">1450</span> ms.'))
    return stage(1000, 232, inner, '', 'background:var(--table)')

# ================================================================ 5 setup
ROWS5 = [('Pachacuti', 'Expansionist · Commerce', '#8b2635', 'm-sun'), ('Emperor Taizong', 'Dominion · Magisterial', '#1f7a5c', 'i-knot'), ('Modu Chanyu', 'Dominion · Devotion', '#2f5d8a', 'i-horse'),
         ('Akhenaten', 'Devotion · Magisterial', '#c9771e', 'm-sun'), ("Al-Ma'mun", 'Devotion · Scientific', '#1d1a20', 's-sphere'), ('Mithridates VI', 'Dominion · Expansionist', '#6b2a7a', 's-cup'),
         ('Joan of Arc', 'Dominion · Devotion', '#2b3f9e', 's-sword'), ('Mansa Musa', 'Commerce · Devotion', '#d9a521', 's-coin'), ('Zheng He', 'Commerce · Magisterial', '#b5301f', 'e-compass'),
         ('Nezahualcoyotl', 'Expansionist · Scientific', '#1f8f8a', 'e-tree'), ('Hypatia', 'Scientific · Magisterial', '#d8cfae', 's-sphere'), ('Hildegard of Bingen', 'Devotion · Magisterial', '#4d9a3a', 'e-sheaf'), ('Ibn Battuta', 'every deck', '#a85a1c', 's-wand')]
def setup4(fallback=False):
    sel = 2 if fallback else 0
    rows = ''
    for i, (n, d, col, dv) in enumerate(ROWS5):
        on = 'background:#fffaf0;box-shadow:inset 3px 0 0 var(--ink);' if i == sel else ''
        rows += f'<div style="display:flex;gap:10px;align-items:center;padding:3px 12px;border-top:1px solid var(--rule);{on}">{fb(20, 22, dv, "thin", tinct=col)}<b style="font-family:var(--name);font-size:13.5px;flex:1;white-space:nowrap">{n}</b><span style="font-size:11px;color:var(--faint);white-space:nowrap">{d}</span></div>'
    rows += ''.join(f'<div style="display:flex;gap:10px;align-items:center;padding:4px 12px;border-top:1px solid var(--rule);font-size:13px;color:var(--soft)"><span style="width:22px;text-align:center">{g}</span><b style="font-weight:600;flex:1">{n}</b><span style="font-size:11px">{d}</span></div>' for g, n, d in (('○', 'No leader', 'the plain rules'), ('?', 'Random', 'dealt by the seed')))
    left = f'''<div class="panel" style="position:absolute;left:30px;top:24px;width:310px;height:552px;padding:0;box-shadow:0 3px 10px rgba(29,26,32,.12);overflow:hidden"><div class="sh" style="padding:11px 12px 9px"><span class="sh-title" style="font-size:23px">Choose your civ</span></div><div class="hr-q"></div><div class="lbl" style="padding:7px 12px 6px">new game · step two of two</div>{rows}</div>'''
    if fallback:
        port = fb(330, 440, 'i-horse', tinct='#2f5d8a')
        nm, people, decks, cols, colnames = 'Modu Chanyu', 'the Xiongnu', ('Dominion', 'Devotion'), ('#2f5d8a', '#e9dfc6'), 'steppe blue and bone'
        ab = (('The Whistling Arrow', 'Mounted units pay no extra movement to cross a hill.'), ('The Tribute Road', 'A court at peace with you pays you gold each turn.'))
        raise_ = 'The <b>Horse Archer</b> (a unit) and the <b>Ordu</b> (an improvement).'
        note = '<span class="cap" style="left:364px;top:34px">sample text for this leader</span>'
    else:
        port = pw('colossus', 330, 440, bg='background-size:250%;background-position:48% 30%;background-repeat:no-repeat;', label='stand-in for a portrait')
        nm, people, decks, cols, colnames = 'Pachacuti', 'the Inca', ('Expansionist', 'Commerce'), ('#8b2635', '#e0b21a'), 'maroon and sun gold'
        ab = (('The Qhapaq Ñan', 'Every city joined to your capital by road pays <span class="n">+1</span> happiness and <span class="n">+1</span> production.'), ('The Gold of the Peaks', 'Farms pay <span class="n">+1</span> gold for every mountain beside them.'))
        raise_ = 'The <b>Slinger</b> (a unit) and the <b>Terraces</b> (an improvement), each when its technology arrives.'
        note = ''
    abh = ''.join(f'<div style="margin-top:9px;font-size:13px;line-height:1.4"><b>{n}</b><br>{t}</div>' for n, t in ab)
    dk = ''.join(f'<span class="chip" style="font-family:var(--ui);font-size:12.5px;font-weight:600;padding:3px 12px">{d}</span>' for d in decks)
    right = f'''<div class="abs" style="left:364px;top:28px">{port}</div>{note}
<div class="abs" style="left:364px;top:482px;width:332px;display:flex;gap:7px;align-items:center;font-size:12px"><i style="width:14px;height:14px;background:{cols[0]};border:1px solid var(--ink)"></i><i style="width:14px;height:14px;background:{cols[1]};border:1px solid var(--ink)"></i>{colnames}</div>
<div class="abs" style="left:722px;top:28px;width:248px"><div style="font-family:var(--disp);font-size:36px;line-height:1">{nm}</div><div class="lbl" style="margin-top:6px">{people}</div>
<div class="lbl" style="margin-top:18px">Two decks</div><div style="display:flex;gap:6px;margin-top:5px">{dk}</div>
<div class="lbl" style="margin-top:18px">Two rules, from the first turn</div>{abh}
<div class="lbl" style="margin-top:18px">Only this leader may raise</div><div style="font-size:13px;margin-top:4px;line-height:1.4">{raise_}</div></div>
<div class="abs" style="right:30px;bottom:24px;display:flex;gap:10px"><span class="btn" style="height:40px">← Back</span><span class="btn pri" style="height:40px;padding:0 26px;font-size:15px">Begin</span></div>'''
    return stage(1000, 600, left + right, '', 'background:#efe9da')

# ================================================================ 6 the unit panel and the forecast
def unit4():
    def st(lab, val, bar=None, col='var(--f)'):
        b = f'<div class="meter" style="height:5px;margin-top:3px"><i style="width:{bar}%;background:{col}"></i></div>' if bar is not None else ''
        return f'<div><div class="lbl" style="font-size:9.5px">{lab}</div><div class="n" style="font-size:15px;font-weight:600">{val}</div>{b}</div>'
    acts = ''.join(f'<span class="btn" style="justify-content:space-between;{"opacity:.45;" if off else ""}">{n}<span class="kbd" style="{"visibility:hidden" if not k else ""}">{k or "x"}</span></span>' for n, k, off in (('Fortify', 'F', False), ('Auto-explore', '', False), ('Skip turn', 'Space', False), ('Pillage', '', True)))
    panel = f'''<div class="panel" style="position:absolute;right:14px;top:46px;width:304px;padding:0;overflow:hidden"><div class="sh" style="padding:10px 12px 8px"><span style="font-family:var(--name);font-weight:600;font-size:19px">Composite Bowman</span><span class="sp"></span><span class="x">×</span></div><div class="hr-q"></div>
<div style="padding:8px 12px 12px"><div class="lbl" style="display:flex;gap:6px;align-items:center"><i style="width:9px;height:9px;border-radius:2px;background:#8f1f33"></i>Pachacuti · veteran</div>
<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px 14px;margin-top:9px">{st('Health', '100/100', 100)}{st('Moves', '3/2')}{st('Strength', '30')}{st('Experience', '4/10', 40, 'var(--g)')}{st('Ranged', '39')}{st('Range', '2')}</div>
<div style="font-size:12px;color:var(--soft);margin-top:9px;border-top:1px solid var(--rule);padding-top:7px">Upkeep <span class="n" style="color:var(--g)">3{G}</span> a turn · <span class="n">+3</span> strength as a veteran</div>
<div class="lbl" style="margin-top:10px">Actions</div><div style="display:grid;gap:5px;margin-top:5px">{acts}</div><div style="text-align:right;margin-top:9px"><span class="btn war">Disband</span></div></div></div>'''
    def colm(name, total, lines, col):
        ls = ''.join(f'<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--soft)"><span>{a}</span><span class="n">{b}</span></div>' for a, b in lines)
        return f'<div><div class="lbl" style="display:flex;gap:6px;align-items:center;font-size:10px"><i style="width:8px;height:8px;border-radius:2px;background:{col}"></i>{name}</div><div class="n" style="font-size:20px;font-weight:600;line-height:1.2">{total}</div>{ls}</div>'
    def side(name, dmg, left, mx, loss):
        return f'<div style="display:grid;grid-template-columns:1fr auto 62px auto;gap:8px;align-items:center;font-size:12px;margin-top:5px"><span>{name}</span><span class="n" style="font-weight:600;color:var(--rubric)">{dmg}</span><span class="meter" style="height:6px;position:relative"><i style="width:{100 * left / mx:.0f}%;background:var(--f)"></i><i style="position:absolute;left:{100 * left / mx:.0f}%;top:0;width:{loss}%;background:var(--cinnabar);opacity:.6"></i></span><span class="n">{left}/{mx}</span></div>'
    fc = f'''<div style="border:1px solid var(--ink);border-radius:4px;background:var(--table);padding:8px 9px 9px;margin-bottom:9px"><div style="font-family:var(--name);font-weight:600;font-size:14.5px">Shoot Horse Archer</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px">{colm('Composite Bowman', '47', (('Veteran', '+3'), (seal_dot(10) + ' The Town Watch', '+5')), '#8f1f33')}{colm('Horse Archer', '32', (('Hill', '+4'),), '#2f5d8a')}</div>
<div style="border-top:1px solid var(--edge);margin-top:8px;padding-top:3px">{side('Horse Archer', '−41 ±5', 39, 80, 51)}{side('Composite Bowman', '−0', 100, 100, 0)}</div></div>'''
    tip = f'''<div class="tip panel" style="left:12px;bottom:14px;width:290px">{fc}<dl><dt>Terrain</dt><dd><b style="font-family:var(--name)">Hills</b></dd>{owner_row('Modu Chanyu', '#2f5d8a')}<dt>Yields</dt><dd><span class="n" style="color:var(--f)">1{F}</span> <span class="n" style="color:var(--p)">2{P}</span></dd><dt>Unit</dt><dd>Horse Archer · <span class="n">80/80</span> hp</dd></dl></div>'''
    end = '<button class="endturn" style="background:var(--parch);color:var(--ink)">Unit needs orders <span class="kbd">⏎</span></button>'
    return stage(1000, 580, topbar(False) + panel + tip + end, 'map-wide')

# ================================================================ 7 the corner panel's row of marks
def corner4(routes, faith, inplay, dot=False):
    d = '<i style="width:6px;height:6px;border-radius:50%;background:var(--cinnabar);flex:none"></i>' if dot else ''
    return f'''<div class="panel" style="display:inline-block;min-width:272px;font-size:13px;vertical-align:top"><div style="display:grid;grid-template-columns:56px 1fr;gap:8px;padding:0 10px 8px 6px"><div><div class="pennant" style="width:46px"><i>{ic('m-sun','')}</i></div></div>
<div><div class="cl4"><div class="ln" style="margin-top:9px"><u>Satrapies →</u><span class="n">4t</span></div><div class="pb"><i style="width:22%;background:var(--lapis)"></i></div><div class="ln"><u>Next draft →</u><span class="n">3t</span></div><div class="pb"><i style="width:40%;background:var(--c)"></i></div></div></div></div>
<div class="q4"><span>{ic('i-flag','')}</span><span>{ic('i-route','')}<b style="color:#1f7a5c">{routes}</b></span><span>{ic('y-faith','')}<b>{faith}</b>{d}</span><span>{ic('i-cards','')}<b>{inplay}</b></span><span>{ic('i-rank','')}</span></div></div>'''

def corner_states():
    def cell(x, label, body, sub):
        return f'<div class="abs" style="left:{x}px;top:16px"><div class="lbl" style="margin-bottom:8px">{label}</div>{body}<div style="font-size:12px;color:var(--soft);margin-top:8px">{sub}</div></div>'
    inner = (cell(20, 'Short figures', corner4('4/5', '67', '22'), 'The panel is <span class="n">272</span> px, as today.')
             + cell(330, 'Long figures', corner4('10/12', '120/160', '104', True), 'The panel grows to about <span class="n">297</span> px.')
             + cell(664, 'The longest figures', corner4('12/12', '1.2k/2.4k', '104', True), 'The panel grows to about <span class="n">310</span> px.'))
    return stage(1000, 196, inner, '', 'background:var(--table)')

def hint4():
    frame = '<div class="abs" style="inset:8px 8px -30px 8px;border:1px solid var(--gilt);border-radius:6px"></div>'
    head = '''<div class="abs" style="left:26px;right:26px;top:24px;display:flex;align-items:center;gap:14px;color:#f1e9d2"><span class="sh-title" style="font-size:28px">Natural Philosophy</span><span style="flex:1"></span><span class="n" style="font-size:11.5px;color:#a9a294">click a technology to research it · <span class="kbd">shift</span>-click to research it after · drag or <span class="kbd">←</span><span class="kbd">→</span><span class="kbd">↑</span><span class="kbd">↓</span> to move</span><span class="x">×</span></div>'''
    return stage(1000, 84, frame + head, '', 'background:#15131a')

# ================================================================ the page
def fig(img, cap, alt, w=640):
    return f'<figure class="today" style="max-width:{w}px"><img src="{uri(img)}" alt="{alt}" loading="lazy"><figcaption><span class="tag">today</span>{cap}</figcaption></figure>'

def sub(fid, tag, cls, title, note, body):
    return f'<div class="sub" id="{fid}"><h3><span class="tag {cls}">{tag}</span>{title}</h3><p>{note}</p>{body}</div>'

def section(n, title, quote, lede, body):
    return f'<section class="frame" id="frame-{n}"><h2><span class="tag">{n}</span>{title}</h2><p class="quote">You said: "{quote}"</p><p>{lede}</p>{body}</section>'

def build():
    css = ''.join(open(os.path.join(HERE, f)).read() for f in ('board.css', 'extra.css', 'four.css'))
    fonts = "@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Fraunces:opsz,wght@9..144,400..700&family=Instrument+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400;500;600&family=EB+Garamond:ital,wght@0,400..700;1,400..600&family=IM+Fell+English+SC&display=swap');"
    out = ['<title>Quiet Table Fourth Pass</title>', f'<style>{fonts}{css}{B.image_css()}</style>', B.SYMBOLS, B.EXTRA_SYMBOLS, '<div class="page">']
    out.append('''<h1>Quiet Table, <i>fourth pass</i></h1>
<p class="lede">Only the eight things that still need a decision. Everything you approved in the first three passes is in the list at the end, as a build order.</p>
<p class="small">Mock-ups are HTML over screenshots of the current build. A painting marked "stand-in" is a wonder painting in a slot that has no art yet. The typefaces are the game's own, from Google Fonts; a system stack takes their place if they are blocked. Card texts and figures are samples. Comment by id, for example "frame-2-strip".</p>
<nav class="nav"><a href="#frame-1">1 City</a><a href="#frame-2">2 Diplomacy</a><a href="#frame-3">3 Faith</a><a href="#frame-4">4 Order draft</a><a href="#frame-5">5 Setup</a><a href="#frame-6">6 Forecast</a><a href="#frame-7">7 Corner panel</a><a href="#frame-8">8 Hint</a><a href="#build">Build order</a><a href="#questions">Questions</a></nav>''')

    out.append(section(1, 'The city screen, simpler',
        'this is too cluttered, could you make it a bit simpler and less overwhelming for new players? The build list doesn\'t require icons… The bottom bar feels too busy.',
        'A new player needs three answers at a glance: what the town is building, how it grows, and what it can build next. The screen now shows those and folds the rest. One version only.',
        '''<div class="notes"><div><b>What stays in view</b>The build list, exactly as today: the gear, the cost, the turns, the price. On the left, three segments: growth, borders, and the citizens' focus.</div><div><b>What is folded</b>One row each, with a count: Buildings, Great houses, Wonders, Specialists, Faith, Levy a citizen. A row opens in place, and one row is open at a time. A row with nothing in it is not drawn.</div><div><b>What I removed, and where it went</b>The band at the foot: gone; its three lists are fold rows. The treasury and faith in the head: gone; the build list says "you have 555 gold", and the Faith row holds the faith. The Supply line: into the list's Units tab, where it matters. "Next citizen 18 / 128" and "Next hex": on hover of each meter. The Dismiss buttons: in the Specialists row. The levy menu: opens from its row, as today's menu.</div></div>
<p class="cost"><b>Cost to build:</b> medium. The left panel is new; the build list is not touched except for the Supply line. The fold rows are the height guard too: the panel is about 330 px at rest, so it fits a 700 px window.</p>'''
        + fig('now-city.jpg', 'The city screen today.', 'The city screen today')
        + sub('frame-1-rest', 'proposed', '', 'At rest', 'Cusco, with everything a late town has. Six fold rows, all shut.', city4('rest'))
        + sub('frame-1-open', 'proposed', '', 'One row open', 'The Faith row is open. It shows the rite the town keeps, and a link to the Faith sheet for the rest.', city4('open'))
        + sub('frame-1-small', 'proposed', '', 'A small new town', 'Pisac has one building and nothing else, so it has one fold row.', city4('small'))))

    out.append(section(2, 'Diplomacy, layout B',
        'I like this one better actually. What happens if you click standing and deals? Also, i\'m worried there wont be enough room on the top bar for all portraits.',
        'Two answers. First, "Standing and deals" is one button today and it opens one drawer; I kept that. Second, two ways to change court that hold eleven other seats.',
        '''<div class="notes"><div><b>Standing and deals</b>Today the drawer holds: the relation and the two border lines; the deals in force with their turns left; papers that wait for your answer (Read); your own offers (Withdraw); and the other acts (peace, Declare war). In B the drawer slides over the right side. The portrait and the words stay in view. The × or Esc goes back to the exchange. The button shows the count of deals, and a dot when a paper waits. Declare war is not in the drawer now: it is the button at the foot.</div><div><b>Changing court: the strip (recommended)</b>A column of charges down the left edge of the portrait, 30 px each. Eleven fit in the portrait's height. A dot marks a war or a waiting paper. A court you have not met is faint. The name shows on hover. One click changes court, and the up and down keys do the same.</div><div><b>Changing court: the nameplate</b>The name on the portrait is the control: arrows step to the next court, and a click on the name opens a list of all of them. It is the cleanest at rest, but it hides who else is there, and a far court costs two clicks.</div></div>
<p><b>I recommend the strip.</b> You see every court and its state without a click, and the head of the sheet stays empty. It uses charges, not faces, so it needs no small portraits. Splash art slot: the leader portrait, 3:4, about 318 by 424 px; fallback the seat's charge.</p>
<p class="cost"><b>Cost to build:</b> medium. The trays and the paper keep today's logic. The drawer exists; it moves. The strip is new.</p>'''
        + fig('now-diplo.jpg', 'Foreign courts today. The "Standing and deals" column is open at the right (on a narrow window it is a drawer behind a button).', 'The diplomacy sheet today')
        + sub('frame-2-strip', 'recommended', 'r', 'The strip of courts', 'Eleven courts. The pointer is on Akhenaten, who is at war with you. The drawer is shut: its button says 2 deals and has a dot.', diplo_b4('strip'))
        + sub('frame-2-drawer', 'proposed', '', 'After a click on Standing and deals', 'The drawer covers the trays. The leader and the words stay.', diplo_b4('drawer'))
        + sub('frame-2-plate', 'option', '', 'The nameplate as the picker', 'Shown with its list open.', diplo_b4('plate'))))

    facts = ''.join(f'<li>{t}</li>' for t in (
        'The religion\'s name, and the control to rename it: in the head.', '"Founded by you" and the holy city: in the head.', '"1 of 2 religions founded": the foot of the "Religions in the world" table.',
        'The pantheon wheel, "3 of 3" and "The pantheon is full": kept, smaller, with the gods\' names beside it.', 'The four boxes (5 towns follow, 5 of 10 of yours, 0 foreign, +6 from the holy site): one line under the tabs.',
        'The link to Bonuses: at the end of that line.', 'Your towns, with citizens following and what your faith presses a turn: the main table.', 'Towns your faith does not reach: the same table, faint.',
        'Foreign towns that follow, and the rule that their owners get your follower beliefs: the second table.', 'Rival faiths pressing your towns: a column of the main table (today a separate list).',
        'The clergy (prophet, apostle, inquisitor), each with what it does, its price, why it is refused, and the town it is called in: three rows at the lower right.'))
    out.append(section(3, 'Faith: the tab order, and Religion &amp; followers',
        'lets move bonuses to the third tab. Could we have a reworked version of the religion and followers tab too? it looks quite dated.',
        'The tabs are now Rites, Religion &amp; followers, Bonuses. Rites opens first for a seat that has not chosen a tab; after that the sheet opens on the tab the player last used, as it does today.',
        '''<div class="notes"><div><b>What changed</b>The page is two plain tables and one short list, in the style of the Rites page. The four boxes become one line. Rival pressure becomes a column, so one row tells the whole state of a town. A new small table lists the religions in the world with founder, holy city and towns. The clergy become rows.</div><div><b>Splash art slot</b>None on this page. The pantheon wheel is its picture.</div></div>
<p class="cost"><b>Cost to build:</b> small to medium. The "Religions in the world" table shows one new fact (the towns of each religion); check that the rules can count it for a rival.</p>
<p>Every fact of today's page, and where it is now:</p><ul class="qs">''' + facts + '</ul>'
        + fig('now-faith3.jpg', 'Religion &amp; followers today.', 'The Religion and followers tab today')
        + sub('frame-3-religion', 'proposed', '', 'Religion &amp; followers, as tables', 'The same game state as the picture above.', faith_religion())))

    kept = ''.join(f'<li>{t}</li>' for t in (
        '<b>The sheet arrives:</b> the ground fades in <span class="n">160</span> ms and the sheet settles in <span class="n">240</span> ms.',
        '<b>The deal:</b> each card is laid face down and turns over in <span class="n">420</span> ms, one <span class="n">110</span> ms after the other (<code>src/ui/cardDeal.ts</code>). So the flip exists today; it is too quick to read as "one by one".',
        '<b>The stamp on the pick:</b> a card shows a flourish while it is a choice. When it is taken, its figure counts up over about <span class="n">750</span> ms, lands (<span class="n">420</span> ms) and glows (<span class="n">520</span> ms). This is "the number arrives on the pick" (<code>src/ui/cardStamp.ts</code>).',
        '<b>The leave:</b> the taken card holds while the others fall away, and the sheet goes at <span class="n">1450</span> ms.',
        '<b>Reduced motion:</b> no deal at all; the cards are drawn face up.'))
    out.append(section(4, 'The Order draft offer',
        'The text below the card isn\'t needed. Lets make sure this is basically the same as the great people draft screen, just with order cards. There feels like too much negative space on the bottom. Make sure to preserve the animations, maybe adding a flipping effect here and have the cards reveal themselves one by one?',
        'It is now the great person sheet with Order cards: the same head, the same place for "Ask again" at the left and the choice at the right, and Pass beside the choice. The line under each card is gone. The sheet is as tall as its content.',
        '''<div class="notes"><div><b>What changed</b>No text under the cards. The sheet is 444 px tall, not 532. The card's foot shows the flourish until the pick, because today's figure arrives on the pick.</div><div><b>The reveal</b>Keep today's flip and slow the gap between cards from 110 to 260 ms, after a 300 ms hold on the three backs. The whole reveal is 1240 ms; today it is 640 ms. The back is the draft pile's back.</div><div><b>Skip, and reduced motion</b>A click or a key during the reveal turns every card up at once and chooses nothing. With reduced motion the cards are face up from the start and the figure appears without a count.</div></div>
<p><b>The great person offer should get the same reveal.</b> It is the same sheet in the code (<code>src/ui/offerCard.ts</code>), and so is the charter. One change of two numbers covers all three, and three offers that behave alike are easier to learn.</p>
<p class="cost"><b>Cost to build:</b> small. The card face and the deal exist. New: the hold, the longer gap, and the skip.</p>
<p>Today's animations, all kept:</p><ul class="qs">''' + kept + '</ul>'
        + fig('now-offer.jpg', 'The Order draft today (a tutorial note covers the middle card).', 'The Order draft today')
        + sub('frame-4-sheet', 'proposed', '', 'The sheet, after the reveal', 'The first card is chosen and not yet taken.', order_offer4())
        + sub('frame-4-reveal', 'proposed', '', 'The reveal, in five frames', 'Times are from the moment the sheet opens.', storyboard())))

    out.append(section(5, 'Setup: the leader step',
        'faces on both the chip and the right panel seems unneeded. Could we have more of a focus on the leader portrait?',
        'One face. The list is names, decks and the seat\'s charge. The chosen leader has a portrait of the size diplomacy uses, with the decks and the two rules beside it.',
        '''<div class="notes"><div><b>What changed</b>The grid of tiles becomes one plain list of 13 leaders and two other choices. The portrait is 330 by 440 px. The name is the largest text on the screen.</div><div><b>Splash art slot</b>Leader portrait, 3:4, 330 by 440 px: the same file as diplomacy. Count: 13. Fallback: the charge on the seat's colour, in the same window.</div></div>
<p class="cost"><b>Cost to build:</b> small to medium. It can ship with charges only.</p>'''
        + fig('now-setup.jpg', 'Choose your civ today.', 'The leader step today')
        + sub('frame-5-proposed', 'proposed', '', 'A list, and one large portrait', 'Pachacuti is chosen.', setup4())
        + sub('frame-5-fallback', 'fallback', '', 'A leader with no painting', 'The window keeps its size and shows the charge. The two rules here are sample text.', setup4(True))))

    out.append(section(6, 'The unit panel, with the forecast at the bottom left',
        'lets make sure this forecast is on the bottom left, where it used to be.',
        'Done. In the game the forecast is the first block of the hex card at the bottom left (<code>#combat-forecast</code>, inside the card that shows terrain and yields). The frame puts it there and follows the real block part for part.',
        '''<div class="notes"><div><b>The real forecast's parts</b>A head ("Shoot" or "Attack" and the name). Two columns: each side's name, its strength as a large figure, and the lines that make it. Two rows: each side's damage with its spread ("−41 ±5"), a health bar with the loss marked, and the health after. Notes replace the columns for a capture, a plunder or a blow that is refused. A dashed frame marks a comparison the unit cannot act on this turn.</div><div><b>What changed</b>Nothing in the forecast but the kit: mono figures, the small seal on a line that a card pays. The unit panel at the right is the third pass's: plain buttons in place of teal, Disband apart.</div></div>
<p class="cost"><b>Not captured:</b> I read the forecast from its code (<code>renderCombatForecast</code> in <code>src/main.ts</code> and its CSS), because the game I had was at peace with every unit in reach. The parts above are the real ones; the figures are samples.</p>'''
        + fig('now-unit.jpg', 'The unit panel today. With a target under the pointer, the forecast shows in the hex card at the bottom left.', 'The unit panel today')
        + sub('frame-6-proposed', 'proposed', '', 'The forecast in the hex card', 'A Composite Bowman is selected and the pointer is on a Horse Archer.', unit4())))

    out.append(section(7, 'The corner panel: figures that overflow',
        'i\'m noticing in playtesting that these can overflow. Could we slightly lower the text size here and make it so the panel can expand instead of overflowing?',
        'The figure is the faith count in the corner panel\'s row of five marks (<code>#quick-faith-figure</code> in <code>.empire-quick</code>, <code>src/style.css</code>). It is not the top bar.',
        '''<div class="notes"><div><b>What overflows today</b>The panel is fixed at 272 px. The row is five cells: 44, a share, a share, 54 and 44 px. So Routes and Faith get 64 px each. A mark and its gap take 22 px, and the type is 12 px mono, about 7.2 px a character. That leaves room for five characters. While a god has a price, faith reads "banked/price": "120/160" is seven characters and needs 72 px. Routes at "10/12" needs 58 px and just fits. I set these figures in the real game and measured them; the pictures show the result.</div><div><b>The change, for the builder</b>In <code>.quick-button</code>: the type goes from 12 px to 11 px, the gap from 6 to 4 px, and each cell gets 6 px of padding at each side. In <code>.empire-quick</code>: the two middle columns become as wide as their content and share any room that is left, and the In play column is at least 54 px. In <code>.empire-corner</code>: <code>width</code> becomes <code>min-width</code> of 272 px with the width set by the content. Nothing wraps and nothing is cut.</div><div><b>The result</b>With figures of up to five characters the panel stays 272 px. With "120/160" it is about 297 px. With the longest figures the game can print ("1.2k/2.4k", because figures shorten above 999) it is about 310 px. I measured these in the mock-up. The research and draft lines above stretch with the panel.</div></div>'''
        + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px">' + ''.join(f'<figure class="today" style="max-width:300px;margin:0"><img src="{uri("now-corner%d.jpg" % i)}" alt="The corner panel today"><figcaption><span class="tag">today</span>{c}</figcaption></figure>' for i, c in enumerate(('"4/5" and "67": fits.', '"10/12", "120/160", "104": the faith figure runs into its neighbours.', '"12/12" and "1240/2400": worse. (The game would print "1.2k/2.4k".)'))) + '</div>'
        + sub('frame-7-states', 'proposed', '', 'The fix at three states', 'Type at 11 px, and a panel that grows.', corner_states())))

    out.append(section(8, 'The technology hint',
        'click a technology to research it',
        'Your words open the line. For the rest I suggest the same plain pattern.',
        '''<div class="tbl"><table><thead><tr><th></th><th>The line</th></tr></thead><tbody>
<tr><td>Today</td><td>click a star to aim · shift-click to queue · drag, scroll or ← → ↑ ↓ to travel</td></tr>
<tr><td>Proposed</td><td>click a technology to research it · shift-click to research it after · drag or ← → ↑ ↓ to move</td></tr></tbody></table></div>'''
        + sub('frame-8-line', 'proposed', '', 'The line in place', 'In the head of the star chart.', hint4())))

    out.append('''<section class="frame" id="build"><h2>Everything approved, as a build order</h2>
<p>These stages can start now. Each one is gated and landed on its own.</p>
<div class="tbl"><table><thead><tr><th>Stage</th><th>What is approved</th><th>Size</th></tr></thead><tbody>
<tr><td>1 · The kit and the words</td><td>The painting window with its fallback. The ink and gilt head rule and the × on every sheet. The small seal (a ring and a dot) in toasts and keyword chips; no painting in a toast. The Owner line in the hex tooltip, only on an owned hex. "click a technology to research it". The tag line "a game for the ages". The HUD at the quiet level.</td><td>Small</td></tr>
<tr><td>2 · The working sheets</td><td>Caravans, the Ledger, Standings, the census, saves: the head, filter chips with today's tab words, plain tables.</td><td>Small</td></tr>
<tr><td>3 · The offers</td><td>The great person card on a paper sheet. The government banner rows. (The Order draft joins this stage when frame 4 is approved.)</td><td>Medium</td></tr>
<tr><td>4 · Declare war, version A</td><td>The solid dark red button with the blade, at the bottom left; then the sheet that names what follows. Enter does not confirm.</td><td>Small</td></tr>
<tr><td>5 · The endings</td><td>The win on the lapis page with the sun. The loss on the dark cloth with the moon.</td><td>Medium</td></tr>
<tr><td>6 · The Reliquary</td><td>The great person card in the deck, after stage 3.</td><td>Small</td></tr>
<tr><td>7 · The faith sheet</td><td>The religion as the head. Rites as a plain table. Bonuses as tablets. Tabs in the order Rites, Religion &amp; followers, Bonuses. (The middle tab joins when frame 3 is approved.)</td><td>Medium</td></tr>
<tr><td>8 · The age plate and the title</td><td>The age on the ribbon over the board, with a painting window. The wide title screen.</td><td>Small to medium</td></tr>
</tbody></table></div>
<p style="margin-top:14px">What still waits:</p>
<div class="tbl"><table><thead><tr><th>Work</th><th>It waits for</th></tr></thead><tbody>
<tr><td>The city screen</td><td>Your word on frame 1</td></tr>
<tr><td>Diplomacy, then the deal notice and the war dispatch</td><td>Your choice of court switcher (frame 2); the leaders' own lines need writing, with the leader design pass</td></tr>
<tr><td>Religion &amp; followers</td><td>Your word on frame 3</td></tr>
<tr><td>The Order draft and the slower reveal on every offer</td><td>Your word on frame 4</td></tr>
<tr><td>Setup, the leader step</td><td>Your word on frame 5</td></tr>
<tr><td>The unit panel and forecast</td><td>Your word on frame 6</td></tr>
<tr><td>The corner panel's figures</td><td>Your word on frame 7; then it joins stage 1</td></tr>
<tr><td>Paintings: leaders (13), ages (5), great people (about 20), governments (13), beliefs, the title, two endings</td><td>You. Every slot has a fallback, so no stage waits for art.</td></tr>
</tbody></table></div></section>

<section class="frame" id="questions"><h2>Questions for you</h2>
<ol class="qs">
<li><b>The city screen:</b> is the folded panel simple enough? And may the Supply line move from the top of the build list into its Units tab? That is the one change to the list.</li>
<li><b>Diplomacy:</b> the strip of charges, or the nameplate?</li>
<li><b>The reveal:</b> is 1240 ms for three cards right, and should the great person offer and the charter get the same reveal?</li>
<li><b>Are frames 3, 5, 6 and 7 approved as drawn?</b> (Religion &amp; followers, setup, the forecast in the hex card, the corner panel.)</li>
</ol></section>''')

    out.append('''</div><script>
(function(){function fit(){document.querySelectorAll('.fit').forEach(function(f){var s=f.firstElementChild,w=+s.dataset.w,h=+s.dataset.h;f.classList.add('js');var k=Math.max(Math.min(1,f.clientWidth/w),0.62);s.style.transform='scale('+k+')';f.style.height=Math.round(h*k)+'px';s.style.marginBottom=Math.round(h*k-h)+'px';s.style.marginRight=Math.round(w*k-w)+'px';f.style.overflowX=w*k>f.clientWidth+1?'auto':'hidden';s.style.marginLeft=Math.max(0,(f.clientWidth-w*k)/2)+'px';});}
fit();addEventListener('resize',fit);})();
</script>''')
    html = '\n'.join(out)
    open(os.path.join(HERE, 'quiet-table-fourth-pass.html'), 'w').write(html)
    open(os.path.join(HERE, 'preview.html'), 'w').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + '</body></html>')
    print('ok', round(len(html) / 1e6, 2), 'MB')

if __name__ == '__main__':
    build()
