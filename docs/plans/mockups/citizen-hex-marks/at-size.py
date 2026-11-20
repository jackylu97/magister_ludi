import math, random
R=64; SQ=.84; CX,CY=640,470
INK='#1d1a20'; BONE='#f7f2e1'; SEAT='#8b2635'
F,P,G,S='#3f7d2c','#a0522d','#b8860b','#2f5d8a'
def center(q,r): return (CX+R*math.sqrt(3)*(q+r/2), CY+R*1.5*r*SQ)
def pts(cx,cy,s=R): return ' '.join(f'{cx+s*math.cos(math.radians(60*i-90)):.1f},{cy+s*SQ*math.sin(math.radians(60*i-90)):.1f}' for i in range(6))
def dist(q,r): return max(abs(q),abs(r),abs(q+r))
cells=[(q,r) for q in range(-7,8) for r in range(-6,7) if -80<center(q,r)[0]<1520 and -40<center(q,r)[1]<960]
random.seed(11)
TERR={'grass':['#a9bd6a','#b4c674','#9fb563'],'plain':['#d6c170','#dcc97e','#cfb964'],'forest':['#6f9457','#789c5f','#668b50'],'hill':['#c2a06c','#caa977','#b99763'],'water':['#6fa8cf','#78b0d6','#689fc6'],'mount':['#9d978f','#a7a199']}
terr={}
for c in cells:
    q,r=c
    if c==(0,0): terr[c]='plain'
    elif (r>=2 and -3<=q<=0) or (q>=3 and r<=-1 and q+r>=2 and random.random()<.0): terr[c]='water'
    elif c in [(2,-3),(3,-3),(3,-2),(4,-3)]: terr[c]='mount'
    else: terr[c]=random.choice(['grass','grass','plain','forest','hill','plain','grass'])
Y={'grass':(2,0,0),'plain':(1,1,0),'forest':(1,2,0),'hill':(0,2,0),'water':(1,0,2),'mount':(0,0,0)}
bonus={(1,-1):(0,0,2),(-1,0):(1,0,0),(2,-1):(0,2,0),(0,-2):(0,0,1),(-2,1):(0,1,1)}
worked=[(1,0),(0,-1),(-1,0),(1,-1),(-1,1),(0,1),(2,-1),(-2,1),(0,-2),(1,-2),(-1,2),(2,0)]
pinned=[(2,-1),(0,1)]
other=[(-3,1),(-3,2),(-3,3),(-2,-1),(-3,0),(-4,2),(-4,1),(-4,3)]
improved={(1,0):'farm',(0,-1):'farm',(-1,0):'farm',(1,-1):'mine',(2,-1):'mine',(-1,1):'farm',(0,-2):'camp',(-2,2):'farm',(1,1):'farm',(2,-2):'mine',(-1,-1):'farm'}
def yl(c):
    f,p,g=Y[terr[c]]; b=bonus.get(c,(0,0,0)); return (f+b[0],p+b[1],g+b[2])
def chips(cx,cy,c,op=1,sc=1):
    it=[(col,n) for col,n in zip((F,P,G),yl(c)) if n]
    if not it: return ''
    w=21*sc; x0=cx-w*len(it)/2; o=f'<g opacity="{op}">'
    for i,(col,n) in enumerate(it):
        x=x0+i*w
        o+=f'<rect x="{x+1:.1f}" y="{cy-8*sc:.1f}" width="{w-2:.1f}" height="{16*sc:.1f}" rx="3" fill="{BONE}" stroke="{col}" stroke-width="1.2"/><text x="{x+w/2:.1f}" y="{cy+4.3*sc:.1f}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="{11*sc:.1f}" fill="{col}">{n}</text>'
    return o+'</g>'
def decor(cx,cy,c):
    t=terr[c]; o=''
    rnd=random.Random(hash(c)%999)
    if t=='forest':
        for i in range(5):
            x=cx+rnd.uniform(-34,34); y=cy+rnd.uniform(-22,22)
            o+=f'<path d="M{x:.0f} {y-9:.0f}l7 14h-14Z" fill="#4f7a41"/>'
    if t=='hill':
        for i in range(2):
            x=cx+rnd.uniform(-24,24); y=cy+rnd.uniform(-10,14)
            o+=f'<path d="M{x-18:.0f} {y+8:.0f}q18 -22 36 0Z" fill="#b08d5a"/>'
    if t=='mount': o+=f'<path d="M{cx-30} {cy+20}L{cx-6} {cy-26}L{cx+8} {cy-4}L{cx+18} {cy-18}L{cx+34} {cy+20}Z" fill="#8a847c"/><path d="M{cx-6} {cy-26}l-7 13l8 -4l5 6Z" fill="#f2efe8"/>'
    if t=='water':
        for i in range(3):
            x=cx+rnd.uniform(-30,20); y=cy+rnd.uniform(-18,18)
            o+=f'<path d="M{x:.0f} {y:.0f}q5 -4 10 0t10 0" fill="none" stroke="#a9d0ea" stroke-width="1.5"/>'
    k=improved.get(c)
    if k=='farm':
        for i in range(4): o+=f'<path d="M{cx-30} {cy-14+i*9}h60" stroke="#8e7a36" stroke-width="2" opacity=".55"/>'
    if k=='mine': o+=f'<path d="M{cx-26} {cy+16}l10 -16h12l10 16Z" fill="#5a4a3a" opacity=".8"/>'
    if k=='camp': o+=f'<path d="M{cx-26} {cy+14}l10 -18l10 18Z" fill="#e9dfc6" stroke="#5a4a3a" stroke-width="1.5"/>'
    return o
def city(cx,cy):
    o=''
    for dx,dy,w,h in [(-34,-2,22,20),(-8,-12,26,30),(22,0,20,18),(-22,14,18,14),(8,18,22,14)]:
        o+=f'<rect x="{cx+dx}" y="{cy+dy}" width="{w}" height="{h}" fill="#efe6cf" stroke="{INK}" stroke-width="1.2"/><path d="M{cx+dx-2} {cy+dy}l{w/2+2} -10l{w/2+2} 10Z" fill="#b5533c" stroke="{INK}" stroke-width="1.2"/>'
    return o
def pip(cx,cy,pin=False):
    return f'<circle cx="{cx}" cy="{cy}" r="7.5" fill="{SEAT if pin else BONE}" stroke="{INK}" stroke-width="2"/>'
def lock(cx,cy):
    return f'<g><rect x="{cx-6}" y="{cy-3}" width="12" height="10" rx="2" fill="{SEAT}" stroke="{BONE}" stroke-width="1"/><path d="M{cx-3.5} {cy-3}v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="{SEAT}" stroke-width="2.2"/></g>'
def scene(opt):
    o=f'<svg viewBox="0 0 1440 900" role="img" aria-label="Option {opt} at the size of the game"><rect width="1440" height="900" fill="#6fa8cf"/>'
    for c in cells:
        cx,cy=center(*c); col=random.Random(hash(c)%777).choice(TERR[terr[c]])
        o+=f'<polygon points="{pts(cx,cy)}" fill="{col}" stroke="rgba(29,26,32,.14)" stroke-width="1"/>'+decor(cx,cy,c)
    cx,cy=center(0,0); o+=city(cx,cy)
    for c in cells:
        if c==(0,0): continue
        cx,cy=center(*c); w=c in worked; pin=c in pinned
        na = (c in other) or dist(*c)>3 or terr[c]=='mount'
        if not w: o+=f'<polygon points="{pts(cx,cy)}" fill="rgba(24,22,30,{.62 if na else .34})"/>'
    for c in cells:
        if c==(0,0): continue
        cx,cy=center(*c); w=c in worked; pin=c in pinned
        na = (c in other) or dist(*c)>3 or terr[c]=='mount'
        if w:
            o+=f'<polygon points="{pts(cx,cy,R-3)}" fill="none" stroke="{INK}" stroke-width="5" opacity=".55"/><polygon points="{pts(cx,cy,R-3)}" fill="none" stroke="{SEAT if pin else BONE}" stroke-width="3"/>'
            if opt=='B':
                o+=chips(cx,cy+14,c,1,1.1)
                if pin: o+=lock(cx,cy-22)
            else:
                o+=pip(cx,cy-12,pin)+chips(cx,cy+14,c,1,1.1)
        elif not na: o+=chips(cx,cy+14,c,.8)
        elif c in other and dist(*c)<=3: o+=f'<text x="{cx}" y="{cy+5}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="13" fill="{BONE}" opacity=".85">Pisac</text>'
    # the screen's panels, as plain boxes, so the density reads at true size
    o+=f'<rect width="1440" height="44" fill="#f7f2e1"/><path d="M0 44h1440" stroke="{INK}" stroke-width="2"/><text x="44" y="30" font-family="Georgia,serif" font-size="24" fill="{INK}">Aldermarch</text><text x="230" y="29" font-family="Georgia,serif" font-size="15" fill="{INK}">240/240 hp · Defence 122</text>'
    o+=f'<rect x="14" y="56" width="286" height="420" fill="#f7f2e1" stroke="rgba(29,26,32,.3)"/><text x="28" y="84" font-family="system-ui" font-size="12" fill="#6b6459">growth, borders, citizens, fold rows</text>'
    o+=f'<rect x="1026" y="56" width="400" height="770" fill="#f7f2e1" stroke="rgba(29,26,32,.3)"/><text x="1040" y="84" font-family="system-ui" font-size="12" fill="#6b6459">building now, queue, build list</text>'
    # legend, bottom centre
    lx=470
    o+=f'<g transform="translate({lx},846)"><rect width="430" height="38" rx="4" fill="#f7f2e1" stroke="{INK}" stroke-width="1.5"/>'
    if opt=='B':
        o+=f'<polygon points="{pts(26,19,11)}" fill="none" stroke="{INK}" stroke-width="2"/><text x="44" y="24" font-family="system-ui" font-size="13" fill="{INK}">worked</text>'+lock(118,17)+f'<text x="132" y="24" font-family="system-ui" font-size="13" fill="{INK}">pinned by you</text>'
    else:
        o+=pip(26,19)+f'<text x="42" y="24" font-family="system-ui" font-size="13" fill="{INK}">citizen</text>'+pip(116,19,True)+f'<text x="132" y="24" font-family="system-ui" font-size="13" fill="{INK}">pinned by you</text>'
    o+=f'<rect x="246" y="10" width="18" height="18" fill="rgba(24,22,30,.34)" stroke="#888"/><text x="270" y="24" font-family="system-ui" font-size="13" fill="{INK}">free</text><rect x="318" y="10" width="18" height="18" fill="rgba(24,22,30,.62)" stroke="#888"/><text x="342" y="24" font-family="system-ui" font-size="13" fill="{INK}">not yours</text></g>'
    return o+'</svg>'
css='''
:root{--bg:#f6f3ec;--fg:#1d1a16;--mut:#6b6459;--line:#d8d1c2}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#17150f;--fg:#ece6d8;--mut:#a39b8b;--line:#3a352b;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#17150f;--fg:#ece6d8;--mut:#a39b8b;--line:#3a352b;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding-inline:16px;padding-block:20px;max-width:1480px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 6px;border-top:1px solid var(--line);padding-top:16px}
p,li{color:var(--mut);max-width:72ch}p{margin:0 0 10px}ul{margin:0 0 12px;padding-left:20px}
svg{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:4px}
'''
h='<title>Citizen Hex Marks At Size</title><style>'+css+'</style><h1>B and C at the size of the game</h1><p>A mock-up of the city screen at 1440 by 900, with twelve citizens on the land. The terrain is a drawing with fields, mines, trees and hills on it, so the marks have something to compete with. The panels are plain boxes at their new widths. This is not the game\'s board.</p>'
h+='<h2 id="option-B">B. Light and shade, with an outline</h2><ul><li>A worked hex is bright with a bone outline. No other mark.</li><li>A hex you pinned has the outline in your colour and a small lock.</li><li>A free hex is lightly shaded. A hex that is not yours is dark.</li></ul>'+scene('B')
h+='<h2 id="option-C">C. The same, with one dot for the citizen</h2><ul><li>Everything in B, plus one plain dot on each worked hex.</li><li>The dot is bone for a citizen the town placed, and your colour for one you pinned. So the dot replaces the lock.</li></ul>'+scene('C')
open('citizen-hex-marks-at-size.html','w').write(h)
open('wrap2.html','w').write('<!doctype html><html><head><meta charset="utf-8"></head><body>'+h+'</body></html>')
