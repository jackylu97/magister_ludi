"""The drawn marks of the board: suits, emblems, yields, the sun, moon and star. Copied from the first one-style board so this folder builds alone."""
import math
# ---------------------------------------------------------------- symbols
def polar(r, deg):
    a = math.radians(deg); return 50 + r*math.cos(a), 50 + r*math.sin(a)
RAYS = ''.join('M%.2f %.2fL%.2f %.2f' % (*polar(37.5, i*11.25), *polar(48 if i % 2 == 0 else 44, i*11.25)) for i in range(32))
def hatch():
    out = []
    for i in range(-10, 11):
        off = i*3.2; half = math.sqrt(34*34 - off*off); f = 50 + off/math.sqrt(2); d = half/math.sqrt(2)
        out.append('M%.2f %.2fL%.2f %.2f' % (f-d, f+d, f+d, f-d))
    return ''.join(out)
def star(cx, cy, n, ro, ri):
    pts = []
    for i in range(n):
        for r, off in ((ro, 0), (ri, 180/n)):
            a = math.radians(-90 + i*360/n + off); pts.append('%.2f %.2f' % (cx + r*math.cos(a), cy + r*math.sin(a)))
    return 'M' + 'L'.join(pts) + 'Z'
S = 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"'
T = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'
SYMBOLS = f'''
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="dev" viewBox="0 0 100 100"><path d="{RAYS}" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="50" cy="50" r="34" style="fill:var(--disc,#f8f1dc)" stroke="currentColor" stroke-width="2.2"/><path d="{hatch()}" fill="none" stroke="currentColor" stroke-width=".7" opacity=".42"/><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width=".9"/><circle cx="50" cy="50" r="24" style="fill:var(--disc,#f8f1dc)" opacity=".88"/></symbol>
<symbol id="s-sword" viewBox="0 0 64 64"><g {S}><path d="M26 18L32 8L38 18"/><path d="M32 8V42"/><path d="M13 42H51"/><path d="M32 42V53"/></g><circle cx="32" cy="56" r="4" fill="currentColor"/></symbol>
<symbol id="s-wand" viewBox="0 0 64 64"><path d="M22 58L42 6" {S}/><g fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M35.6 28.5Q37.8 20.2 46.4 19.5Q44.2 27.8 35.6 28.5Z"/><path d="M27.2 41Q19.8 41.9 16.8 35Q24.3 34.1 27.2 41Z"/><path d="M36.5 16.3Q30.5 14 31.5 7.7Q37.5 10 36.5 16.3Z"/></g></symbol>
<symbol id="s-coin" viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" {S}/><path d="M32 17L40.8 44.1L17.7 27.4L46.3 27.4L23.2 44.1Z" {T}/></symbol>
<symbol id="s-cup" viewBox="0 0 64 64"><g {S}><path d="M13 12H51Q51 38 32 38Q13 38 13 12Z"/><path d="M32 38V52"/><path d="M19 55H45"/></g></symbol>
<symbol id="s-sphere" viewBox="0 0 64 64"><circle cx="32" cy="28" r="21" {S}/><ellipse cx="32" cy="28" rx="21" ry="6.5" {T}/><path d="M23 7L41 49" {T}/><g {S}><path d="M32 49V56"/><path d="M22 59H42"/></g></symbol>
<symbol id="s-crown" viewBox="0 0 64 64"><g {S}><path d="M13 46L9 20L22 31L32 13L42 31L55 20L51 46Z"/><path d="M13 53H51"/></g><g fill="currentColor"><circle cx="9" cy="20" r="3.5"/><circle cx="32" cy="12" r="3.5"/><circle cx="55" cy="20" r="3.5"/></g></symbol>
<symbol id="e-garden" viewBox="0 0 64 64"><g {S}><path d="M6 56H58"/><path d="M12 56V44H52V56"/><path d="M19 44V32H45V44"/><path d="M26 32V22H38V32"/></g><g {T}><path d="M12 44q-5-7 2-10"/><path d="M52 44q5-7-2-10"/><path d="M19 32q-4-6 2-9"/><path d="M45 32q4-6-2-9"/><path d="M26 22q6-12 12 0"/><path d="M32 16V8"/></g></symbol>
<symbol id="e-zeus" viewBox="0 0 64 64"><path d="M37 5L19 34H30L25 59L46 27H34Z" {S}/></symbol>
<symbol id="e-sheaf" viewBox="0 0 64 64"><g {S}><path d="M32 58V20"/><path d="M22 58H42"/></g><g {T}><path d="M32 30q-10-2-12-12q10 0 12 12"/><path d="M32 30q10-2 12-12q-10 0-12 12"/><path d="M32 44q-10-2-12-12q10 0 12 12"/><path d="M32 44q10-2 12-12q-10 0-12 12"/><path d="M32 20q-5-6 0-14q5 8 0 14"/></g></symbol>
<symbol id="e-compass" viewBox="0 0 64 64"><g {S}><circle cx="32" cy="12" r="5"/><path d="M30 17L17 58"/><path d="M34 17L47 58"/></g><path d="M21 42Q32 50 43 42" {T}/></symbol>
<symbol id="e-bust" viewBox="0 0 64 64"><g {S}><circle cx="32" cy="20" r="11"/><path d="M12 58q2-22 20-22t20 22Z"/></g></symbol>
<symbol id="e-grape" viewBox="0 0 64 64"><g {S}><circle cx="24" cy="26" r="6"/><circle cx="40" cy="26" r="6"/><circle cx="32" cy="38" r="6"/><circle cx="32" cy="52" r="5"/><path d="M32 18V8q8 0 12 4"/></g></symbol>
<symbol id="e-forum" viewBox="0 0 64 64"><g {S}><path d="M8 24L32 9L56 24Z"/><path d="M14 24V50"/><path d="M26 24V50"/><path d="M38 24V50"/><path d="M50 24V50"/><path d="M8 55H56"/></g></symbol>
<symbol id="e-tree" viewBox="0 0 64 64"><g {S}><path d="M32 58V34"/><circle cx="32" cy="22" r="15"/><path d="M20 58H44"/></g></symbol>
<symbol id="e-bow" viewBox="0 0 64 64"><g {S}><path d="M20 6Q50 32 20 58"/><path d="M20 6V58"/><path d="M10 32H52"/><path d="M45 25l7 7-7 7"/></g></symbol>
<symbol id="e-tent" viewBox="0 0 64 64"><g {S}><path d="M6 54L32 10L58 54Z"/><path d="M24 54L32 36L40 54"/></g></symbol>
<symbol id="e-shoe" viewBox="0 0 64 64"><g {S}><path d="M18 54V30a14 14 0 0 1 28 0V54"/><path d="M11 54H25"/><path d="M39 54H53"/></g></symbol>
<symbol id="m-star" viewBox="0 0 24 24"><path d="{star(12,12,8,11.5,4.6)}" fill="currentColor"/></symbol>
<symbol id="m-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.8"/><path d="M12 1.2V4.6M12 19.4V22.8M1.2 12H4.6M19.4 12H22.8M4.9 4.9L6.9 6.9M17.1 17.1L19.1 19.1M4.9 19.1L6.9 17.1M17.1 6.9L19.1 4.9"/></g></symbol>
<symbol id="m-moon" viewBox="0 0 24 24"><path d="M9.39 4.14A9 9 0 1 0 19.86 14.61A7.5 7.5 0 0 1 9.39 4.14Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
<symbol id="m-fl" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 21C3 10.5 10.5 3 21 3"/><path d="M3 13.5C7.5 13.5 10.5 10.5 10.5 6"/><path d="M9 21C9 16.5 12 13.5 16.5 13.5C19.5 13.5 21 15 21 18"/></g><circle cx="4.5" cy="4.5" r="2.1" fill="currentColor"/></symbol>
<symbol id="y-food" viewBox="0 0 16 16"><path d="M2.5 13.5C2.5 6.5 7 2.5 13.5 2.5C13.5 9 9.5 13.5 2.5 13.5ZM2.5 13.5L9 7" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></symbol>
<symbol id="y-prod" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1l6 3.5v7L8 15l-6-3.5v-7ZM8 5.4a2.6 2.6 0 1 0 .01 0Z" fill="currentColor"/></symbol>
<symbol id="y-gold" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/></symbol>
<symbol id="y-sci" viewBox="0 0 16 16"><path d="M6 1.5h4v4.2l3.6 7a1.2 1.2 0 0 1-1 1.8H3.4a1.2 1.2 0 0 1-1-1.8L6 5.7Z" fill="currentColor"/></symbol>
<symbol id="y-cul" viewBox="0 0 16 16"><path d="M6.4 3.2L13 1.6v9a2.4 2.4 0 1 1-1.6-2.2V4.2L8 5v6.6a2.4 2.4 0 1 1-1.6-2.2Z" fill="currentColor"/></symbol>
<symbol id="y-faith" viewBox="0 0 16 16"><path d="M5.5 7h5v8h-5ZM8 .8c1.8 1.8 1.8 3.6 0 4.8c-1.8-1.2-1.8-3 0-4.8Z" fill="currentColor"/></symbol>
<symbol id="y-happy" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.2 9.2q2.8 2.8 5.6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="5.8" cy="6.3" r="1" fill="currentColor"/><circle cx="10.2" cy="6.3" r="1" fill="currentColor"/></symbol>
<symbol id="y-auth" viewBox="0 0 16 16"><path d="M3 14V8h10v6M5 8V3h6v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
<symbol id="y-renown" viewBox="0 0 16 16"><path d="{star(8,8,5,7,3)}" fill="currentColor"/></symbol>
<symbol id="y-bead" viewBox="0 0 16 16"><path d="M0 8H16" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="4.2" fill="currentColor"/></symbol>
<symbol id="i-flag" viewBox="0 0 16 16"><path d="M3 15V2h9l-2 3.5 2 3.5H3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
<symbol id="i-route" viewBox="0 0 16 16"><path d="M1.5 5h9v5h-9ZM10.5 7h3l1 3h-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="4.5" cy="12" r="1.7" fill="currentColor"/><circle cx="11.5" cy="12" r="1.7" fill="currentColor"/></symbol>
<symbol id="i-rank" viewBox="0 0 16 16"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
<symbol id="c-sword" viewBox="0 0 64 64"><path d="M32 3L39 14V40H50a3 3 0 0 1 0 6H36V55a4.5 4.5 0 1 1-8 0V46H14a3 3 0 0 1 0-6H25V14Z" fill="currentColor"/></symbol>
<symbol id="c-wand" viewBox="0 0 64 64"><path d="M22 58L42 6" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><g fill="currentColor"><path d="M35 30Q37 17 50 16Q48 29 35 30Z"/><path d="M28 43Q17 45 12 34Q23 32 28 43Z"/></g></symbol>
<symbol id="c-coin" viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="currentColor"/><path d="{star(32,33,5,17,7)}" style="fill:var(--hole,#fbf3dc)"/></symbol>
<symbol id="c-sphere" viewBox="0 0 64 64"><circle cx="32" cy="27" r="22" fill="currentColor"/><ellipse cx="32" cy="27" rx="22" ry="6" fill="none" style="stroke:var(--hole,#fbf3dc)" stroke-width="3"/><path d="M28 48h8v6h8v6H20v-6h8Z" fill="currentColor"/></symbol>
<symbol id="c-bolt" viewBox="0 0 64 64"><path d="M38 3L16 35H29L24 61L48 26H35Z" fill="currentColor"/></symbol>
<symbol id="c-sheaf" viewBox="0 0 64 64"><g fill="currentColor"><path d="M29 60V34h6V60Z"/><path d="M32 32Q18 30 16 14Q30 16 32 32Z"/><path d="M32 32Q46 30 48 14Q34 16 32 32Z"/><path d="M32 22Q25 13 32 3Q39 13 32 22Z"/><path d="M32 46Q20 45 17 33Q29 34 32 46Z"/><path d="M32 46Q44 45 47 33Q35 34 32 46Z"/></g></symbol>
<symbol id="c-compass" viewBox="0 0 64 64"><g fill="currentColor"><circle cx="32" cy="11" r="8"/><path d="M27 16L13 58h7L34 20Z"/><path d="M37 16L51 58h-7L30 20Z"/></g></symbol>
<symbol id="c-garden" viewBox="0 0 64 64"><g fill="currentColor"><path d="M4 60V49H13V38H22V27H42V38H51V49H60V60Z"/><path d="M30 27V16h4V27Z"/><circle cx="32" cy="12" r="9"/></g></symbol>
<symbol id="c-unit" viewBox="0 0 64 64"><g fill="currentColor"><circle cx="32" cy="15" r="11"/><path d="M22 28h20l6 26H16Z"/><path d="M10 54h44v7H10Z"/></g></symbol>
<symbol id="c-bld" viewBox="0 0 64 64"><g fill="currentColor"><path d="M6 24L32 6L58 24Z"/><path d="M11 28h8v24h-8ZM28 28h8v24h-8ZM45 28h8v24h-8ZM6 54h52v6H6Z"/></g></symbol>
</defs></svg>'''

def yi(k, col=None):
    st = f' style="color:{col}"' if col else ''
    return f'<svg class="yi"{st}><use href="#y-{k}"/></svg>'
def ic(k, cls='yi'):
    return f'<svg class="{cls}"><use href="#{k}"/></svg>'
def dev(e, cls='dev', style=''):
    st = f' style="{style}"' if style else ''
    return f'<svg class="{cls}" viewBox="0 0 100 100"{st}><use href="#dev"/><use href="#{e}" x="25" y="25" width="50" height="50"/></svg>'
