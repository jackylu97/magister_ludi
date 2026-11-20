import math
R=44
def center(q,r):  # pointy-top axial
    return (R*math.sqrt(3)*(q+r/2), R*1.5*r)
def hexpts(cx,cy,s=R):
    return ' '.join(f'{cx+s*math.cos(math.radians(60*i-90)):.1f},{cy+s*math.sin(math.radians(60*i-90)):.1f}' for i in range(6))
cells=[(q,r) for q in range(-3,4) for r in range(-3,4) if abs(q+r)<=3]
def dist(q,r): return max(abs(q),abs(r),abs(q+r))
TERR={'grass':'#b9c77a','plain':'#dcc77a','forest':'#7fa063','hill':'#c9a877','water':'#7fb3d6','mount':'#a9a39b','desert':'#e6d6a0'}
import random
random.seed(7)
terr={}
for c in cells:
    q,r=c
    if c==(0,0): terr[c]='plain'
    elif r>=2 and q<=0: terr[c]='water'
    elif c in [(2,-3),(3,-3),(3,-2)]: terr[c]='mount'
    else: terr[c]=random.choice(['grass','grass','plain','forest','hill','plain'])
YIELD={'grass':(2,0,0),'plain':(1,1,0),'forest':(1,2,0),'hill':(0,2,0),'water':(1,0,2),'mount':(0,0,0),'desert':(0,0,0)}
worked=[(1,0),(0,-1),(-1,0),(1,-1),(-1,1),(0,1),(2,-1),(-2,1)]
pinned=[(2,-1),(0,1)]
other=[(-3,1),(-3,2),(-3,3),(-2,-1),(-3,0)]   # worked by a neighbouring town
outside=[c for c in cells if dist(*c)==3 and c not in other]
INK='#1d1a20'; BONE='#f7f2e1'; SEAT='#8b2635'; GILT='#c8901f'
F,P,G='#3f7d2c','#a0522d','#b8860b'
def yields(cx,cy,c,scale=1,op=1):
    f,p,g=YIELD[terr[c]]
    items=[(F,f),(P,p),(G,g)]; items=[i for i in items if i[1]]
    if not items: return ''
    w=22*scale; x0=cx-w*len(items)/2
    out=''
    for i,(col,n) in enumerate(items):
        x=x0+i*w
        out+=f'<g opacity="{op}"><rect x="{x+1:.1f}" y="{cy-8*scale:.1f}" width="{w-2:.1f}" height="{16*scale:.1f}" rx="3" fill="{BONE}" stroke="{col}" stroke-width="1.2"/><text x="{x+w/2:.1f}" y="{cy+4.5*scale:.1f}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="{11*scale:.1f}" fill="{col}">{n}</text></g>'
    return out
def head(cx,cy,col=INK,fill=BONE,s=1):
    return f'<g><circle cx="{cx}" cy="{cy-5*s}" r="{6*s}" fill="{fill}" stroke="{col}" stroke-width="2"/><path d="M{cx-10*s} {cy+12*s}a{10*s} {9*s} 0 0 1 {20*s} 0Z" fill="{fill}" stroke="{col}" stroke-width="2"/></g>'
def lock(cx,cy,col=SEAT):
    return f'<g><rect x="{cx-6}" y="{cy-3}" width="12" height="10" rx="2" fill="{col}"/><path d="M{cx-3.5} {cy-3}v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="{col}" stroke-width="2"/></g>'
def city(cx,cy):
    return f'<g><rect x="{cx-15}" y="{cy-6}" width="30" height="18" fill="{BONE}" stroke="{INK}" stroke-width="2"/><path d="M{cx-19} {cy-6}L{cx} {cy-22}L{cx+19} {cy-6}Z" fill="{SEAT}" stroke="{INK}" stroke-width="2"/></g>'
def board(option):
    xs=[center(*c)[0] for c in cells]; ys=[center(*c)[1] for c in cells]
    minx,maxx,miny,maxy=min(xs)-R,max(xs)+R,min(ys)-R,max(ys)+R
    o=f'<svg viewBox="{minx:.0f} {miny:.0f} {maxx-minx:.0f} {maxy-miny:.0f}" role="img" aria-label="Option {option}">'
    for c in cells:
        cx,cy=center(*c)
        o+=f'<polygon points="{hexpts(cx,cy)}" fill="{TERR[terr[c]]}" stroke="rgba(29,26,32,.28)" stroke-width="1"/>'
    for c in cells:
        cx,cy=center(*c); w=c in worked; pin=c in pinned; oth=c in other; out=c in outside; mt=terr[c]=='mount'
        if c==(0,0): o+=city(cx,cy); continue
        if option=='today':
            if w: o+=f'<polygon points="{hexpts(cx,cy,15)}" fill="none" stroke="{SEAT if pin else BONE}" stroke-width="3"/>'
        if option=='A':  # tokens
            if w:
                o+=head(cx,cy-8, SEAT if pin else INK); o+=yields(cx,cy+22,c)
                if pin: o+=lock(cx+16,cy-20)
            elif not(oth or out or mt): o+=f'<circle cx="{cx}" cy="{cy-8}" r="9" fill="none" stroke="{INK}" stroke-width="1.5" stroke-dasharray="3 3" opacity=".55"/>'+yields(cx,cy+22,c,1,.55)
            elif oth: o+=f'<text x="{cx}" y="{cy+4}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="11" fill="{INK}" opacity=".7">Pisac</text>'
        if option=='B':  # light and shade
            if not w: o+=f'<polygon points="{hexpts(cx,cy)}" fill="rgba(29,26,32,{.62 if (oth or out or mt) else .40})"/>'
            if w:
                o+=f'<polygon points="{hexpts(cx,cy,R-3)}" fill="none" stroke="{BONE}" stroke-width="3"/>'
                o+=yields(cx,cy+2,c,1.15)
                if pin: o+=lock(cx,cy-24)
            elif not(oth or out or mt): o+=yields(cx,cy+2,c,1,.8)
        if option=='C':  # recommended: both
            if not w and (oth or out or mt): o+=f'<polygon points="{hexpts(cx,cy)}" fill="rgba(29,26,32,.58)"/>'
            elif not w: o+=f'<polygon points="{hexpts(cx,cy)}" fill="rgba(29,26,32,.30)"/>'
            if w:
                o+=f'<polygon points="{hexpts(cx,cy,R-3)}" fill="none" stroke="{SEAT if pin else BONE}" stroke-width="{4 if pin else 3}"/>'
                o+=head(cx,cy-10, INK, BONE, .9); o+=yields(cx,cy+20,c)
                if pin: o+=lock(cx+17,cy-22)
            elif not(oth or out or mt): o+=yields(cx,cy+6,c,1,.85)
            elif oth: o+=f'<text x="{cx}" y="{cy+4}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="11" fill="{BONE}" opacity=".85">Pisac</text>'
    # the town's reach
    if option in('B','C','A'):
        pass
    o+='</svg>'
    return o
def legend(items):
    return '<ul class="lg">'+''.join(f'<li>{i}</li>' for i in items)+'</ul>'
OPTS=[
('today','Today','A small bone ring means a citizen works the hex. A ring in your colour means you pinned it. Nothing shows which hexes are free to take, which belong to the next town, or what a hex pays.',
 ['Hard to see on light ground.','A ring does not say "a person".','No difference between "free" and "not yours".']),
('A','A. Citizens as pieces','Each worked hex has a citizen on it, with the yields under them. A free hex has an empty dashed seat and faint yields. A pinned citizen is in your colour with a lock. A hex the next town works carries that town\'s name.',
 ['Reads as "a person stands here".','The board stays bright, so the marks compete with the terrain.','Click an empty seat to send a citizen; click a citizen to pin or free them.']),
('B','B. Light and shade','Worked hexes stay bright with a bone outline. Every other hex goes dark: free hexes a little, hexes you cannot use a lot. Yields show on every hex you can use. A pinned hex has a lock.',
 ['The town\'s working land reads at one look, even zoomed out.','No figure of a citizen, so "worked" is only brightness.','It darkens most of the screen while the city is open.']),
('C','C. Both (recommended)','Worked hexes are bright, outlined, and carry a citizen and the yields. Free hexes are slightly shaded with their yields. Hexes you cannot use are dark, and the next town\'s hexes carry its name. A pinned hex has your colour on its outline and a lock.',
 ['Three clear states: worked, free, not available.','The citizen and the lock say who decided: the town or you.','The legend below sits at the bottom centre of the city screen, beside Buy tiles.']),
]
css='''
:root{--bg:#f6f3ec;--fg:#1d1a16;--mut:#6b6459;--line:#d8d1c2;--card:#fffdf6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#17150f;--fg:#ece6d8;--mut:#a39b8b;--line:#3a352b;--card:#201d16;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#17150f;--fg:#ece6d8;--mut:#a39b8b;--line:#3a352b;--card:#201d16;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding-inline:16px;padding-block:20px;max-width:1240px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:0 0 6px}
p{color:var(--mut);margin:0 0 10px;max-width:70ch}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:20px;margin-top:18px}
.opt{border:1px solid var(--line);border-radius:6px;padding:14px;background:var(--card);min-width:0}
.opt svg{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:4px;background:#8fb7d3}
.lg{margin:8px 0 0;padding-left:18px;color:var(--mut);font-size:14px}
.key{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin-top:10px;padding:8px 12px;border:1px solid var(--line);border-radius:4px;font-size:13px}
.key span{display:inline-flex;align-items:center;gap:6px}.key svg{width:22px;height:22px;border:0;background:none}
'''
key='''<div class="key" aria-label="The legend the city screen would show"><b>Legend on the screen:</b>
<span><svg viewBox="-14 -16 28 30">'''+head(0,0)+'''</svg>worked</span>
<span><svg viewBox="-10 -12 20 22">'''+lock(0,0)+'''</svg>pinned by you</span>
<span><svg viewBox="0 0 22 22"><rect x="2" y="2" width="18" height="18" fill="rgba(29,26,32,.30)" stroke="#888"/></svg>free to work</span>
<span><svg viewBox="0 0 22 22"><rect x="2" y="2" width="18" height="18" fill="rgba(29,26,32,.62)" stroke="#888"/></svg>not available</span></div>'''
h='<title>Citizen Hex Marks</title><style>'+css+'</style><h1>How the board shows the citizens\' hexes</h1><p>Your comment on the city screen: "could we do a design pass on the hex assignments? it\'s a bit unclear right now". These are diagrams on a plain hex map, not the game\'s board. The town is in the middle. Eight citizens work the land, and you pinned two of them. The five hexes at the left belong to the next town, Pisac. The outer ring and the mountains cannot be worked.</p><div class="grid">'
for k,t,d,pts in OPTS:
    h+=f'<section class="opt" id="option-{k}"><h2>{t}</h2><p>{d}</p>{board(k)}{legend(pts)}{key if k=="C" else ""}</section>'
h+='</div>'
open('citizen-hex-marks.html','w').write(h)
open('wrap.html','w').write('<!doctype html><html><head><meta charset="utf-8"></head><body>'+h+'</body></html>')
print(len(h))
