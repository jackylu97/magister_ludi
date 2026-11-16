"""Unit pieces for the north-star look; run via build_settlement_assets.py -- --ns-units-only.

The user, 2026-11-14: "could you create a page for how you'd redesign the
units? lets do a single melee piece for now, you can choose." The first
swordsman was a cartoon figure with a face. The user, 2026-11-15: "i like the
direction of the new models a lot. I think they come off as amateur-ish or too
cartoonish in terms of the art style, but they look impressive already." And,
with a picture of a faceted hoplite cast in one colour: "you don't need to do
exactly like this, but i think it reads better if it looks somewhat like a
board game piece, and leans more elegant/simple instead of cartoony".

This file builds:

- `ns-swordsman`: the board game piece (the default). A tall slim figure whose
  tunic falls as one column to a round pedestal. It has a closed helmet with a
  dark slit and no face, a large round shield and a sword that rests point
  down. It is the seat's first colour all over. The seat's second colour is on
  the crest and the face of the shield only;
- `ns-swordsman-cast`: the same sculpt in the seat's first colour only;
- `ns-swordsman-toon`: the cartoon figure of 2026-11-14, kept so the two can be
  compared and the old one restored;
- `ns-swordsman-squad`: three small cartoon figures on one base (a direction
  the user rejected, kept for comparison);
- `ns-block-spearman`, `ns-block-archer`, `ns-block-horseman`,
  `ns-block-catapult`: rough shapes in one grey, to show how the classes differ
  in outline. They are not finished models.

After this script, run `node scripts/terrain-study/bake_northstar_units.mjs`.
It writes the models into src/terrainStudy/northStarUnitData.json, which the
renderer reads. `NORTH_STAR_UNITS` in src/terrainStudy/northStarAssets.js names
the unit types that use a model from here.

The rules of a piece:
- A figure looks toward -Y and stands on z = 0. One unit is one world unit, and
  a foot piece is about 1.0 tall with its crest.
- A material whose name starts with `Owner` takes the seat's first colour. One
  that starts with `Trim` takes the seat's second colour. Both are written in
  white or a grey, because the renderer multiplies them by the seat's colour.
  Every other material keeps its own colour.
- Each vertex carries how it moves when the piece idles, as a vertex colour:
  red is how much it follows the body's breath and shift of weight (0 at the
  feet, 1 at the top of the head), green how much it flutters (0 at the root of
  a plume or the top of a cape, 1 at its free end), and blue is the figure's
  own phase from 0 to 1, so the three figures of a squad do not move as one.
- A board game piece has few parts and few colours. A part that does not read
  when the piece is 50 pixels tall does not belong on it.
"""

OUT_UNITS=Path(__file__).resolve().parents[2]/'art'/'terrain-study'/'northstar-units'
OUT_UNITS.mkdir(parents=True,exist_ok=True)

OWNER=pigment('Owner cloth','ffffff');OWNER_DEEP=pigment('Owner cloth in shade','d2d2d2');OWNER_BASE=pigment('Owner base','e6e6e6')
TRIM=pigment('Trim cloth','ffffff');TRIM_DEEP=pigment('Trim metal','dcdcdc')
STEEL=pigment('NS unit steel','8f9dab');STEEL_DARK=pigment('NS unit dark steel','66727f');BLADE=pigment('NS unit blade','cfd8e0')
SKIN=pigment('NS unit skin','e9b98e');LEATHER=pigment('NS unit leather','54402f');HOSE=pigment('NS unit hose','6f5f52')
WOOD_U=pigment('NS unit wood','8a6a48');EYE=pigment('NS unit eye','2e2724');BLOCK=pigment('NS blockout grey','9aa0a6')

STATE={'phase':0.,'top':1.,'new':[]}

def keep(o,idle='body',root=None):
 """Notes how an object moves. `flutter` parts swing from `root`."""
 o['idle']=idle
 if root is not None:o['root']=list(root)
 STATE['new'].append(o);return o

def rings(profile,m,n=8,turn=0.,idle='body',root=None):
 """A form of stacked rings: each is (x, y, z, radius in x, radius in y)."""
 v=[];f=[]
 for x,y,z,rx,ry in profile:
  for i in range(n):
   a=turn+(i+.5)*math.tau/n;v.append((x+math.cos(a)*rx,y+math.sin(a)*ry,z))
 for j in range(len(profile)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.extend([tuple(reversed(range(n))),tuple(range((len(profile)-1)*n,len(profile)*n))])
 return keep(mesh('Ringed form',v,f,m),idle,root)

def limb(points,radii,m,n=5,idle='body',root=None):return keep(tube(points,radii,m,n),idle,root)
def slab(p,s,m,idle='body',root=None):return keep(block(p,s,m,0),idle,root)

def plate(centre,normal,radius,thick,m,n=10,dome=0.):
 """A round plate that faces along `normal`. `dome` pushes its middle out."""
 c=Vector(centre);d=Vector(normal).normalized()
 pts=[c-d*thick/2,c+d*thick/2];rad=[radius,radius]
 if dome:pts.append(c+d*(thick/2+dome));rad.append(radius*.45)
 return keep(tube([tuple(p) for p in pts],rad,m,n))

def blade(grip,tip,width,m=BLADE,thick=.014):
 """A flat blade with a point, from the guard to the tip."""
 a=Vector(grip);b=Vector(tip);d=(b-a).normalized();side=d.cross(Vector((0,1,0)))
 if side.length<.05:side=d.cross(Vector((1,0,0)))
 side.normalize();face=d.cross(side).normalized();s=a+(b-a)*.80
 v=[a-side*width,a+face*thick,a+side*width,a-face*thick,s-side*width*.9,s+face*thick,s+side*width*.9,s-face*thick,b]
 f=[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,8),(5,6,8),(6,7,8),(7,4,8),(3,2,1,0)]
 return keep(mesh('Blade',[tuple(p) for p in v],f,m))

def base(radius=.235,rim=TRIM_DEEP):
 """The low round base: the seat's first colour, with a rim in the second."""
 o=rings([(0,0,0,radius*1.06,radius*1.06),(0,0,.018,radius*1.06,radius*1.06)],rim,14,idle=None)
 p=rings([(0,0,.018,radius,radius),(0,0,.034,radius*.97,radius*.97)],OWNER_BASE,14,idle=None)
 return o,p

def place(objects,at=(0,0),scale=1.,yaw=0.,phase=0.):
 """Moves the parts of one figure to its place in the piece."""
 for o in objects:
  # A block keeps its place in `location`. Write every vertex where it ends up, and clear the location.
  c=math.cos(yaw);n=math.sin(yaw);own=o.location.copy()
  for v in o.data.vertices:
   p=(v.co+own)*scale;v.co=(p.x*c-p.y*n+at[0],p.x*n+p.y*c+at[1],p.z)
  if 'root' in o:
   r=Vector(o['root'])*scale;o['root']=[r.x*c-r.y*n+at[0],r.x*n+r.y*c+at[1],r.z]
  o.location=(0,0,0);o['phase']=phase;o['top']=1.02*scale;o['size']=scale

def tilt(objects,pivot,angle):
 """Leans parts back about a line through `pivot` that runs from side to side, so a face looks up at the camera."""
 c=math.cos(angle);n=math.sin(angle)
 for o in objects:
  at=o.location
  for v in o.data.vertices:
   # A block keeps its place in `location`, so that is added before the turn and taken off after it.
   y=v.co.y+at.y-pivot[1];z=v.co.z+at.z-pivot[2];v.co.y=pivot[1]+y*c+z*n-at.y;v.co.z=pivot[2]-y*n+z*c-at.z
  if 'root' in o:
   y=o['root'][1]-pivot[1];z=o['root'][2]-pivot[2];o['root']=[o['root'][0],pivot[1]+y*c+z*n,pivot[2]-y*n+z*c]

def swordsman_figure(detail=True):
 """One swordsman. Returns its parts. `detail=False` leaves out the small parts, for a squad."""
 STATE['new']=[]
 n=8 if detail else 6
 # Boots and legs: a wide stance, the left foot (+X) a little forward.
 for x,y in ((.095,-.04),(-.095,.035)):
  slab((x,y-.018,.062),(.092,.140,.056),LEATHER)
  limb([(x,y,.09),(x*.95,y,.22),(x*.85,0,.38)],[.058,.062,.070],HOSE,5)
 # The tunic: a short flared skirt, a waist, a deep chest. The seat's first colour.
 rings([(0,.005,.30,.190,.155),(0,.005,.35,.172,.140),(0,0,.44,.130,.108),(0,-.005,.56,.162,.126),(0,0,.645,.150,.112),(0,0,.69,.085,.075)],OWNER,n)
 # A hem and a belt in the seat's second colour.
 rings([(0,.005,.285,.196,.160),(0,.005,.318,.186,.152)],TRIM,n)
 rings([(0,0,.412,.146,.122),(0,0,.458,.143,.119)],TRIM,n)
 # A large head, then an open helmet set back on it, so the face shows from above.
 head=[rings([(0,-.005,.675,.075,.070),(0,-.012,.730,.122,.114),(0,-.012,.810,.128,.118),(0,-.008,.860,.095,.090)],SKIN,n)]
 head.append(rings([(0,.012,.815,.150,.142),(0,.012,.830,.134,.126),(0,.012,.895,.112,.106),(0,.012,.930,.050,.048)],STEEL,n))
 if detail:
  head.append(slab((0,-.136,.768),(.026,.024,.030),SKIN))
  for s in (-1,1):head.append(slab((s*.056,-.124,.796),(.020,.014,.028),EYE))
 # The crest: the second colour, a ridge from the brow over the crown and down the back of the helmet.
 root=(0,-.10,.86)
 crest=[(-.105,.868,.014),(-.06,.915,.058),(.012,.932,.075),(.085,.915,.075),(.128,.868,.055),(.142,.815,.014)]
 v=[];f=[]
 for y,z,h in crest:
  d=Vector((y-.012,z-.83)).normalized()
  v+=[(-.034,y,z),(.034,y,z),(.022,y+d.x*h,z+d.y*h),(-.022,y+d.x*h,z+d.y*h)]
 for k in range(len(crest)-1):
  a=k*4;f+=[(a+i,a+(i+1)%4,a+4+(i+1)%4,a+4+i) for i in range(4)]
 f+=[(3,2,1,0),tuple(range(len(v)-4,len(v)))]
 head.append(keep(mesh('Crest',v,f,TRIM),'flutter',root))
 tilt(head,(0,0,.70),.32)
 # Small dark steel shoulders.
 for s in (-1,1):rings([(s*.160,0,.610,.056,.064),(s*.164,0,.655,.052,.058),(s*.150,0,.690,.020,.024)],STEEL_DARK,6)
 # Right arm (-X): the fist forward at the hip, the sword up and a little out.
 limb([(-.165,0,.640),(-.225,-.03,.540),(-.235,-.115,.50)],[.052,.046,.042],OWNER_DEEP,5)
 slab((-.238,-.135,.50),(.076,.076,.080),SKIN)
 hand=Vector((-.238,-.135,.50));up=Vector((-.26,-.06,1.)).normalized()
 limb([tuple(hand-up*.075),tuple(hand+up*.05)],[.017,.017],LEATHER,4)
 limb([tuple(hand-up*.105),tuple(hand-up*.07)],[.028,.028],TRIM_DEEP,5)
 guard=hand+up*.060;side=up.cross(Vector((0,1,0))).normalized()
 limb([tuple(guard-side*.095),tuple(guard+side*.095)],[.019,.019],TRIM_DEEP,4)
 blade(tuple(guard),tuple(guard+up*.50),.048)
 # Left arm (+X) behind a large round shield: first colour, a rim in the second, a steel boss.
 limb([(.165,0,.640),(.225,-.05,.56),(.20,-.13,.50)],[.052,.046,.042],OWNER_DEEP,5)
 centre=Vector((.175,-.180,.46));face=Vector((.38,-1.,.30)).normalized()
 plate(centre,face,.195,.022,TRIM_DEEP,10)
 plate(centre+face*.014,face,.158,.022,OWNER,10)
 plate(centre+face*.028,face,.060,.012,STEEL_DARK,6,dome=.03)
 # A short cape down the back, in the first colour's shade, so the back is not bare.
 root=(0,.10,.68)
 v=[];rows=[(.68,.115,.105),(.56,.150,.135),(.44,.175,.175),(.33,.185,.215)]
 for z,half,back in rows:
  for t in (-1,-.5,0,.5,1):v.append((t*half,back-abs(t)*.045,z))
 f=[(j*5+i,j*5+i+1,(j+1)*5+i+1,(j+1)*5+i) for j in range(len(rows)-1) for i in range(4)]
 f+=[tuple(reversed(q)) for q in f]
 keep(mesh('Short cape',v,f,OWNER_DEEP),'flutter',root)
 return STATE['new']

OWNER_SLIT=pigment('Owner slit','4a4a4a');OWNER_CAST=pigment('Owner cast body','c4c4c4');SLIT=pigment('NS unit slit','2b2622')

def cone(a,b,ra,rb,m,n=10,idle='body',root=None):return keep(tube([tuple(a),tuple(b)],[ra,rb],m,n),idle,root)

def pedestal(m_low=OWNER_DEEP,m_top=OWNER):
 """A round pedestal with one step, as a game piece has."""
 rings([(0,0,0,.200,.200),(0,0,.036,.200,.200),(0,0,.048,.186,.186)],m_low,12,idle=None)
 rings([(0,0,.048,.166,.166),(0,0,.080,.154,.154)],m_top,12,idle=None)

def column_body(m,n=8):
 """The tunic as one column from the pedestal to the shoulders, and the helmet. Returns the helmet's rings."""
 rings([(0,0,.070,.128,.116),(0,0,.105,.112,.102),(0,0,.52,.082,.070),(0,-.004,.660,.134,.088),(0,-.004,.735,.124,.082),(0,0,.775,.046,.046)],m,n)
 return rings([(0,0,.760,.056,.060),(0,0,.782,.074,.082),(0,0,.880,.074,.082),(0,.004,.930,.042,.050)],m,n)

def swordsman_piece(cast=False):
 """The swordsman as a board game piece. `cast` paints every part in the seat's first colour."""
 STATE['new']=[]
 # In the cast piece the body is a step darker, so the shield, crest and blade still stand out from it.
 second=OWNER if cast else TRIM;cloth=OWNER_CAST if cast else OWNER
 column_body(cloth)
 # The helmet's one dark slit. A T-shaped slit read as two eyes and a nose at play zoom.
 dark=OWNER_SLIT if cast else SLIT
 slab((0,-.076,.852),(.062,.018,.024),dark)
 # A short upright crest that runs from the brow to the back and is wider at the top.
 root=(0,.01,.915);v=[]
 for x in (-.016,.016):v+=[(x,-.062,.910),(x,.082,.898),(x,.106,.990),(x,-.080,1.005)]
 f=[(0,1,2,3),(7,6,5,4),(0,3,7,4),(1,5,6,2),(3,2,6,7),(0,4,5,1)]
 keep(mesh('Crest',v,f,second),'flutter',root)
 # The right arm (-X) comes down to the hilt of a sword that stands on its point.
 hand=Vector((-.150,-.105,.560))
 limb([(-.108,0,.700),(-.150,-.035,.640),tuple(hand)],[.038,.034,.032],cloth,4)
 limb([tuple(hand+Vector((0,0,-.03))),tuple(hand+Vector((0,0,.065)))],[.020,.024],OWNER,5)
 slab((hand.x,hand.y,.512),(.150,.032,.028),OWNER)
 blade((hand.x,hand.y,.500),(hand.x,hand.y,.050),.042,OWNER if cast else BLADE,.020)
 # The left arm (+X) holds a large round shield with a pointed boss. Its face looks a little up, at the camera.
 limb([(.108,0,.700),(.165,-.05,.57)],[.038,.034],cloth,4)
 c=Vector((.185,-.085,.500));d=Vector((.75,-1.,.30)).normalized();r=.140
 cone(c-d*.020,c+d*.006,r,r,OWNER,10)
 cone(c+d*.006,c+d*.040,r*.84,r*.24,second,10)
 cone(c+d*.040,c+d*.105,r*.20,.004,OWNER,6)
 return STATE['new']

# --- the art deco piece (the user, 2026-11-15) ------------------------------------------
# "the angles should be sharper in its silhouette, make broad sweeping strokes in its form
# instead of faceted/detailed. Treat it like an avant garde piece of art, maybe art deco?
# I'm imagining something slightly more chess piece looking, with sharp angles and more
# exagerated form/pose."
# So every form here has four sides or fewer, with an edge toward the camera, and the piece
# is a few long lines: a body that sweeps in from the foot to a high waist and out to sharp
# shoulders, a sword that rises to one side, and a cape that falls away behind.
DIAMOND=-math.tau/8

def spike(a,b,side,face,w,t,m,idle='body'):
 """A blade of four long planes: a flat diamond at `a`, `w` wide and `t` thick, that runs to a point at `b`."""
 a=Vector(a);b=Vector(b);side=Vector(side).normalized();face=Vector(face).normalized()
 v=[a-side*w,a+face*t,a+side*w,a-face*t,b]
 return keep(mesh('Spike',[tuple(q) for q in v],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],m),idle)

def deco_pedestal(m_low=OWNER_DEEP):
 """A low round foot with one sharp slope up to the body."""
 rings([(0,0,0,.215,.215),(0,0,.028,.215,.215),(0,0,.082,.150,.150)],m_low,12,idle=None)

def swordsman_deco(cast=False):
 """The swordsman as an art deco chess piece. `cast` paints every part in the seat's first colour."""
 STATE['new']=[]
 second=OWNER if cast else TRIM;cloth=OWNER_CAST if cast else OWNER;deep=OWNER_CAST if cast else OWNER_DEEP
 # The body: a diamond in section, so one edge looks at the camera. It leans forward as it rises.
 rings([(0,.030,.070,.165,.150),(0,.020,.160,.100,.092),(0,.000,.360,.070,.066),(0,-.020,.500,.064,.060),(0,-.050,.700,.180,.072),(0,-.056,.735,.130,.054),(0,-.060,.755,.036,.036)],cloth,4,DIAMOND)
 # The helm: a tall diamond that ends in a point, with no face at all.
 rings([(0,-.060,.735,.036,.042),(0,-.072,.790,.060,.082),(0,-.078,.870,.054,.086),(0,-.040,.985,.003,.003)],cloth,4,DIAMOND)
 # The crest: one thin fin from the brow that sweeps up and back to a point behind the head.
 v=[]
 for x in (-.011,.011):v+=[(x,-.150,.885),(x,.020,.800),(x,.200,1.020)]
 keep(mesh('Crest fin',v,[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],second))
 # The sword arm (-X): down and forward to the fist, then the blade rises out to the side in one line.
 hand=Vector((-.215,-.165,.500));tip=Vector((-.400,-.120,1.030))
 spike((-.150,-.050,.690),tuple(hand),(1,0,.6),(0,1,0),.062,.050,cloth)
 along=(tip-hand).normalized();flat=along.cross(Vector((0,1,0))).normalized()
 spike(tuple(hand),tuple(hand+flat*.115),along,(0,1,0),.024,.024,second);spike(tuple(hand),tuple(hand-flat*.115),along,(0,1,0),.024,.024,second)
 spike(tuple(hand-along*.03),tuple(tip),flat,(0,1,0),.072,.018,OWNER if cast else BLADE)
 # The shield arm (+X) and a long kite shield with one ridge down its middle.
 c=Vector((.190,-.160,.470));d=Vector((.50,-1.,.22)).normalized();across=d.cross(Vector((0,0,1))).normalized();up=across.cross(d).normalized()
 spike((.150,-.050,.690),tuple(c),(1,0,-.6),(0,1,0),.062,.050,cloth)
 top=c+up*.190;foot=c-up*.310;l=c+up*.080-across*.130;r=c+up*.080+across*.130;ridge=c+up*.090+d*.050;back=c+up*.090-d*.012
 keep(mesh('Kite shield',[tuple(q) for q in (top,l,foot,r,ridge,back)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(1,0,5),(2,1,5),(3,2,5),(0,3,5)],second))
 # The cape: two long planes from the shoulders that fall away behind to a point past the foot.
 v=[(-.165,-.030,.700),(0,.020,.735),(.165,-.030,.700),(-.170,.150,.100),(0,.250,.060),(.170,.150,.100)]
 f=[(0,1,4,3),(1,2,5,4)];f+=[tuple(reversed(q)) for q in f]
 keep(mesh('Cape',v,f,deep))
 return STATE['new']

def swordsman_art(cast=False):
 reset();deco_pedestal();place(swordsman_deco(cast),scale=1.25);marks_and_export('ns-swordsman-deco-cast' if cast else 'ns-swordsman-deco')

# --- the turned piece (the user, 2026-11-15) --------------------------------------------
# "its a little too angular, could you try another pass with sweeping curves folded into
# the design? like a chess piece almost."
# So the body is turned like a chess piece: round, with one long curved profile. A cloak
# lies over the shoulders and its hem sweeps down across the chest in one curve. There are
# no arms. The sword stands on its point beside the figure, on a wide base of two steps.
def turned(profile,m,n=16,sway=None,idle='body'):
 """A turned form: rings of (z, radius). `sway(z)` moves a ring's centre in y, for a slight S-curve."""
 return rings([(0,sway(z) if sway else 0,z,r,r*.92) for z,r in profile],m,n,idle=idle)

def turned_base(m=TRIM_DEEP):
 """One thick plain drum, as under a statue, in the seat's second colour."""
 rings([(0,0,0,.240,.240),(0,0,.096,.240,.240),(0,0,.110,.226,.226)],m,16,idle=None)

def swordsman_turned(cast=False):
 """The swordsman as a small statue with the lines of a chess piece. `cast` paints every part in the seat's first colour.

 The user's later references (2026-11-15, `images/16.png` to `18.png` of the session) are statues of a soldier on a
 thick drum: a long robe, a cloak that sweeps down the back, a real helmet, a round shield and an upright weapon.
 """
 STATE['new']=[]
 second=OWNER if cast else TRIM;robe=OWNER_CAST if cast else OWNER_DEEP;cloak=OWNER
 sway=lambda z:.014*math.sin((z-.09)/.70*math.tau)
 # The robe: one turned form from the drum to the neck, with a small flare at the hem.
 turned([(.088,.118),(.110,.110),(.160,.098),(.300,.088),(.450,.082),(.550,.088),(.630,.104),(.695,.110),(.742,.086),(.770,.036),(.800,.034)],robe,12,sway)
 # The cloak: a shell from the shoulders. Its hem is high on the chest and sweeps down to the calves behind.
 n=12;v=[];f=[]
 for z,r in ((.774,.042),(.750,.100),(.700,.134)):
  for i in range(n):
   a=(i+.5)*math.tau/n;v.append((math.cos(a)*r,sway(z)+math.sin(a)*r*.92,z))
 for i in range(n):
  a=(i+.5)*math.tau/n;low=.5+.5*math.cos(a-math.radians(105));z=.640-.400*low**1.4;r=.128+.040*low
  v.append((math.cos(a)*r,sway(z)+.035*low+math.sin(a)*r*.92,z))
 for j in range(3):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.append(tuple(range(n)))
 keep(mesh('Cloak',v,f,cloak))
 # The helmet: a round dome that comes to a blunt point, a dark opening for the face, and a crest that arcs from brow to nape.
 turned([(.790,.050),(.812,.066),(.860,.070),(.900,.060),(.935,.034),(.950,.008)],cloak,10,sway)
 y0=sway(.86)
 slab((0,y0-.062,.842),(.040,.022,.050),OWNER_SLIT if cast else SLIT)
 v=[]
 for x in (-.016,.016):v+=[(x,y0-.070,.905),(x,y0+.070,.850),(x,y0+.100,.930),(x,y0+.060,1.000),(x,y0-.010,1.020),(x,y0-.070,.985)]
 f=[(0,1,2,3,4,5),(11,10,9,8,7,6)]+[(i,6+i,6+(i+1)%6,(i+1)%6) for i in range(6)]
 keep(mesh('Crest',v,f,second))
 # The right arm (-X) comes out of the cloak to the hilt of a sword that stands on its point.
 x,y=-.150,-.105;steel=OWNER if cast else BLADE
 limb([(-.098,-.010,.690),(-.150,-.050,.640),(x,y,.622)],[.036,.032,.030],robe,6)
 blade((x,y,.555),(x,y,.094),.034,steel,.016)
 slab((x,y,.565),(.130,.030,.028),second)
 turned([(.579,.016),(.640,.016)],second,6).location=(x,y,0)
 turned([(.640,.028),(.664,.028),(.674,.010)],second,8).location=(x,y,0)
 # The left arm (+X) carries a round shield with a pointed boss at the side.
 limb([(.098,-.010,.690),(.150,-.060,.560)],[.036,.032],robe,6)
 c=Vector((.158,-.080,.480));d=Vector((.75,-1.,.26)).normalized();r=.128
 cone(c-d*.018,c+d*.006,r,r,cloak,12)
 cone(c+d*.006,c+d*.034,r*.86,r*.26,second,12)
 cone(c+d*.034,c+d*.090,r*.20,.004,cloak,6)
 return STATE['new']

def swordsman_turn(cast=False):
 reset();turned_base(OWNER_DEEP if cast else TRIM_DEEP);place(swordsman_turned(cast),scale=1.22);marks_and_export('ns-swordsman-statue-cast' if cast else 'ns-swordsman-statue')

# --- the long figure (the user, 2026-11-15) ---------------------------------------------
# "please look at the proportions and figure weighting of my reference, imagine you're a
# master of gestural form, i want some visual intrigue and forms that feel a bit long and
# skinny than natural."
# The references are figures 8 to 9 heads tall. Their weight is high, in the shoulders and
# the cloak, and they taper to narrow feet. A thin weapon rises above the helmet. One round
# mass sits on one side and one thin line on the other, and the figure stands on a broad drum.
def lathe(profile,m,n,centre,idle='body'):
 """A turned form whose centre line bends: `centre(z)` gives (x, y) for a ring at height z."""
 return rings([(centre(z)[0],centre(z)[1],z,r,r*.9) for z,r in profile],m,n,idle=idle)

def swordsman_long(cast=False):
 """The swordsman as a long, slim statue. `cast` paints every part in the seat's first colour."""
 STATE['new']=[]
 second=OWNER if cast else TRIM;robe=OWNER_CAST if cast else OWNER_DEEP;cloak=OWNER
 # The figure stands upright (the user, 2026-11-15: "the pose feels awkward and the silhouette unnatural. have it jst be upright").
 def centre(z):return (0.,0.)
 # The robe: narrow at the hem, a little fuller at the hip, widest at the shoulders.
 lathe([(.085,.062),(.120,.052),(.300,.047),(.500,.050),(.640,.056),(.780,.064),(.890,.084),(.940,.062),(.972,.026),(1.000,.024)],robe,10,centre)
 # The cloak: one long shell from the shoulders. It is open at the sword side and falls to the ankle behind the shield side.
 n=12;v=[];f=[]
 for z,r in ((.968,.030),(.940,.074),(.890,.102)):
  cx,cy=centre(z)
  for i in range(n):
   a=(i+.5)*math.tau/n;v.append((cx+math.cos(a)*r,cy+math.sin(a)*r*.9,z))
 for i in range(n):
  a=(i+.5)*math.tau/n;low=(.5+.5*math.cos(a-math.radians(62)))**1.3;z=.800-.640*low;r=.104-.012*low;cx,cy=centre(z)
  v.append((cx+.030*low+math.cos(a)*r,cy+.045*low+math.sin(a)*r*.9,z))
 for j in range(3):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.append(tuple(range(n)))
 keep(mesh('Long cloak',v,f,cloak))
 # A small helmet with a dark opening and a crest that arcs from brow to nape.
 lathe([(.992,.030),(1.012,.044),(1.058,.047),(1.094,.040),(1.122,.020),(1.132,.004)],cloak,8,centre)
 hx,hy=centre(1.06)
 slab((hx,hy-.040,1.044),(.026,.016,.036),OWNER_SLIT if cast else SLIT)
 v=[]
 for x in (hx-.011,hx+.011):v+=[(x,hy-.048,1.086),(x,hy+.046,1.046),(x,hy+.074,1.110),(x,hy+.044,1.172),(x,hy-.008,1.188),(x,hy-.050,1.150)]
 f=[(0,1,2,3,4,5),(11,10,9,8,7,6)]+[(i,6+i,6+(i+1)%6,(i+1)%6) for i in range(6)]
 keep(mesh('Crest',v,f,second))
 sx,sy=centre(.89)
 # The sword arm (-X): a long sword stands on its point, and the hand rests on its pommel at the chest.
 x,y=sx-.104,sy-.092;steel=OWNER if cast else BLADE
 limb([(sx-.070,sy-.010,.890),(sx-.118,sy-.030,.810),(x,y,.800)],[.032,.027,.026],cloak,6)
 blade((x,y,.690),(x,y,.094),.026,steel,.014)
 slab((x,y,.700),(.104,.022,.020),second)
 limb([(x,y,.708),(x,y,.776)],[.012,.012],second,6);limb([(x,y,.776),(x,y,.800)],[.020,.020],second,6)
 # The shield arm (+X): a long arm down to a round shield held low at the hip.
 limb([(sx+.070,sy-.010,.890),(sx+.116,sy-.040,.720),(sx+.118,sy-.070,.580)],[.032,.027,.026],cloak,6)
 c=Vector((sx+.124,sy-.088,.520));d=Vector((.70,-1.,.24)).normalized();r=.112
 cone(c-d*.016,c+d*.006,r,r,cloak,12)
 cone(c+d*.006,c+d*.030,r*.86,r*.26,second,12)
 cone(c+d*.030,c+d*.085,r*.20,.004,cloak,6)
 return STATE['new']

def long_base(m=TRIM_DEEP):
 """A broad thick drum, so the slim figure looks slimmer still."""
 rings([(0,0,0,.215,.215),(0,0,.078,.215,.215),(0,0,.090,.203,.203)],m,16,idle=None)

def swordsman_tall(cast=False):
 reset();long_base(OWNER_DEEP if cast else TRIM_DEEP);place(swordsman_long(cast),scale=1.);marks_and_export('ns-swordsman-cast' if cast else 'ns-swordsman')

def marks_and_export(name):
 """Writes each vertex's idle weights as a vertex colour, then exports the piece."""
 bpy.context.view_layer.update();tris=0
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  for p in o.data.polygons:p.use_smooth=False
  o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
 for o in meshes:
  kind=o.get('idle');top=o.get('top',.97);phase=o.get('phase',0.);scale=o.get('size',1.)
  world=[o.matrix_world@v.co for v in o.data.vertices]
  root=o.matrix_world@Vector(o['root']) if 'root' in o else None
  reach=max([(w-root).length for w in world] or [1]) if root is not None else 1
  attr=o.data.color_attributes.new(name='move',type='FLOAT_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
  for loop in o.data.loops:
   w=world[loop.vertex_index]
   body=0 if kind is None else max(0,min(1,(w.z-.10*scale)/(top-.10*scale)))**1.5
   flutter=min(1,(w-root).length/reach) if kind=='flutter' else 0
   attr.data[loop.index].color=(body,flutter,phase,1)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT_UNITS/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_vertex_color='ACTIVE')
 print('ASSET',name,tris,flush=True)

# --- abstract game pieces, three families (the user, 2026-11-15) ---------------------------
# "lets do the abstract game pieces. it can look like a more elegant/inspired version of
# what we currently have (the chess pieces) that feel less stocky ... We should also find a
# slightly better design so that the unit type is more obvious from looking at it, more
# differentiation in the template so that it reads better? could you do 3 different
# variations with different weights/forms". And, with a picture of a small plain figure on a
# tall drum (`images/19.png` of the session): "maybe something like this, but with even
# simpler shapes?"
#
# Each family builds five classes: sword, spear, bow, horse and siege engine.
# - Family A, turned: a slim turned stem, and the class is a large finial on top.
# - Family B, cut-out: the whole piece is one thick flat outline of the class.
# - Family C, monument: a tall drum on a wide disc, with a very plain small figure on top.
# In all three the class also sets the height, and the class mark faces the camera (it lies
# in the plane from side to side). The seat's first colour is the body; the second colour is
# the class mark in A, the inlay in B and the disc in C. The pieces do not idle.
def lat(profile,m,n=16,at=(0,0),squash=1.):
 """A turned form about an upright line at `at`: rings of (z, radius)."""
 return rings([(at[0],at[1],z,r,r*squash) for z,r in profile],m,n,idle=None)

def outline(points,depth,m,y=0.):
 """A flat outline in the plane from side to side, `depth` thick. `points` are (x, z), counter-clockwise seen from the front."""
 k=len(points);v=[(x,y-depth/2,z) for x,z in points]+[(x,y+depth/2,z) for x,z in points]
 f=[tuple(range(k)),tuple(reversed(range(k,2*k)))]+[(i,k+i,k+(i+1)%k,(i+1)%k) for i in range(k)]
 return keep(mesh('Outline',v,f,m),None)

def bar(a,b,width,depth,m,y=0.):
 """A straight flat bar from (x, z) `a` to `b`."""
 a=Vector((a[0],a[1]));b=Vector((b[0],b[1]));d=(b-a).normalized();side=Vector((-d.y,d.x))*width/2
 return outline([tuple(a-side),tuple(b-side),tuple(b+side),tuple(a+side)],depth,m,y)

def crescent(cx,cz,radius,spread,thick,depth,m,y=0.,steps=9):
 """A bow: an arc that bulges toward -X and thins to a point at each end."""
 outer=[];inner=[]
 for i in range(steps):
  a=math.radians(-spread+2*spread*i/(steps-1));t=thick*math.cos(a/spread*math.pi/2*math.radians(1)*57.2958)
  outer.append((cx-radius*math.cos(a),cz+radius*math.sin(a)));inner.append((cx-(radius-t)*math.cos(a),cz+(radius-t)*math.sin(a)))
 return outline(list(reversed(outer))+inner[1:-1],depth,m,y)

HORSE=[(-.07,0),(.08,0),(.105,.15),(.075,.275),(.052,.365),(.012,.305),(-.04,.295),(-.16,.175),(-.172,.112),(-.10,.098),(-.05,.142),(-.072,.05)]
def horse_head(at,scale,depth,m,y=0.):
 """A horse's head and neck in outline, looking toward -X. `at` is the (x, z) of the middle of the neck's foot."""
 return outline([(at[0]+x*scale,at[1]+z*scale) for x,z in reversed(HORSE)],depth,m,y)

def still(name):
 """Marks every part as standing still, then exports."""
 for o in bpy.context.scene.objects:
  if o.type=='MESH':o['idle']=None
 marks_and_export(name)

# Family A: turned.
def a_stem(h,foot=.165,waist=.040,squash=1.):
 lat([(0,foot),(.022,foot),(.040,foot*.90)],OWNER_DEEP,16,squash=squash)
 lat([(.040,foot*.84),(.062,foot*.56),(.100,foot*.38),(.200,waist*1.3),(h*.55,waist),(h-.075,waist*1.3),(h-.035,waist*1.9)],OWNER,12,squash=squash)
 lat([(h-.035,waist*1.9),(h-.020,waist*2.5),(h,waist*2.5),(h+.014,waist*1.3)],TRIM,12)

def a_sword():
 a_stem(.60);slab((0,0,.640),(.230,.034,.032),TRIM);blade((0,0,.650),(0,0,1.10),.050,TRIM,.016)
def a_spear():
 a_stem(.46,.150,.034);lat([(.46,.014),(1.00,.014)],TRIM,6);blade((0,0,.98),(0,0,1.27),.058,TRIM,.018)
def a_bow():
 a_stem(.48,.150,.036);crescent(.135,.76,.275,74,.060,.034,TRIM);bar((.060,.496),(.060,1.024),.012,.014,TRIM)
def a_horse():
 a_stem(.44,.185,.050,.80);horse_head((.005,.452),1.18,.080,TRIM)
def a_siege():
 lat([(0,.215),(.024,.215),(.044,.195)],OWNER_DEEP,16)
 lat([(.044,.180),(.070,.130),(.330,.118),(.380,.150),(.440,.150)],OWNER,12)
 for i in range(6):
  a=i*math.tau/6;slab((math.cos(a)*.122,math.sin(a)*.122,.462),(.058,.058,.046),OWNER)
 bar((-.165,.455),(.215,.930),.034,.034,TRIM);slab((-.165,0,.455),(.090,.070,.090),TRIM);lat([(.905,.020),(.925,.046),(.955,.046),(.975,.020)],TRIM,8,(.215,0))

# Family B: cut-out.
def b_foot(rx=.175,squash=.62):
 lat([(0,rx),(.026,rx),(.040,rx*.93)],TRIM_DEEP,16,squash=squash)
D=.072
def b_sword():
 b_foot()
 outline([(-.036,.03),(.036,.03),(.036,.290),(.165,.290),(.165,.345),(.076,.345),(.056,.930),(0,1.120),(-.056,.930),(-.076,.345),(-.165,.345),(-.165,.290),(-.036,.290)],D,OWNER)
 outline([(-.013,.400),(.013,.400),(.008,.900),(-.008,.900)],D+.014,TRIM)
def b_spear():
 b_foot(.150)
 outline([(-.022,.03),(.022,.03),(.022,.800),(.078,.800),(.078,.840),(.022,.840),(.022,.900),(-.022,.900),(-.022,.840),(-.078,.840),(-.078,.800),(-.022,.800)],D,OWNER)
 outline([(-.022,.900),(.022,.900),(.086,1.010),(0,1.275),(-.086,1.010)],D,TRIM)
def b_bow():
 b_foot(.165)
 crescent(.170,.640,.350,74,.082,D,OWNER);bar((.074,.304),(.074,.976),.016,D*.5,OWNER)
 outline([(-.026,.03),(.026,.03),(.026,.615),(-.026,.615)],D,OWNER)
 outline([(-.250,.640),(-.180,.600),(-.180,.628),(.130,.628),(.130,.652),(-.180,.652),(-.180,.680)],D+.014,TRIM)
def b_horse():
 b_foot(.200)
 horse_head((.010,.03),2.45,D,OWNER)
 outline([(.150,.380),(.215,.360),(.190,.640),(.150,.800)],D+.014,TRIM)
def b_siege():
 b_foot(.215)
 outline([(-.200,.03),(.200,.03),(.036,.520),(-.036,.520)],D,OWNER)
 bar((-.270,.300),(.250,.900),.046,D+.014,TRIM);outline([(-.330,.200),(-.215,.200),(-.215,.330),(-.330,.330)],D+.014,TRIM);outline([(.215,.860),(.300,.860),(.300,.945),(.215,.945)],D+.014,TRIM)

# Family C: monument.
def c_plinth(top=.40,drum=.150,disc=.300,squash=1.):
 lat([(0,disc),(.050,disc),(.060,disc*.965)],TRIM_DEEP,20,squash=squash)
 lat([(.060,drum),(top-.012,drum),(top,drum*.94)],OWNER,16,squash=squash)
 return top

def c_figure(z,at=(0,0),m=OWNER):
 """A very plain small figure: a tapered robe and a round head."""
 lat([(z,.056),(z+.210,.040),(z+.250,.050),(z+.275,.018)],m,8,at)
 lat([(z+.270,.018),(z+.288,.034),(z+.318,.034),(z+.336,.016)],m,8,at)

def c_sword():
 z=c_plinth();c_figure(z);slab((-.062,-.050,z+.170),(.110,.022,.022),TRIM);blade((-.062,-.050,z+.180),(-.062,-.050,z+.660),.030,TRIM,.012);lat([(z+.110,.012),(z+.170,.012)],TRIM,6,(-.062,-.050))
def c_spear():
 z=c_plinth(.34);c_figure(z);lat([(z,.011),(z+.700,.011)],TRIM,6,(-.070,-.040));blade((-.070,-.040,z+.690),(-.070,-.040,z+.920),.040,TRIM,.014)
def c_bow():
 z=c_plinth(.36);c_figure(z);crescent(-.010,z+.190,.150,72,.036,.026,TRIM,-.062);bar((-.056,z+.047),(-.056,z+.333),.008,.010,TRIM,-.062)
def c_horse():
 z=c_plinth(.30,.175,.320,.80)
 outline([(-.150,z+.130),(-.150,z),(-.110,z),(-.110,z+.110),(.090,z+.110),(.090,z),(.130,z),(.130,z+.150),(.150,z+.230),(.110,z+.250),(.040,z+.245),(-.080,z+.250),(-.120,z+.330),(-.100,z+.400),(-.150,z+.380),(-.240,z+.290),(-.235,z+.245),(-.185,z+.250),(-.170,z+.190)][::-1],.090,OWNER)
 c_figure(z+.235,(-.010,0),TRIM)
def c_siege():
 z=c_plinth(.26,.185,.320)
 outline([(-.130,z),(.130,z),(.026,z+.250),(-.026,z+.250)],.110,OWNER);bar((-.190,z+.110),(.190,z+.480),.030,.040,TRIM);slab((-.190,0,z+.110),(.080,.070,.080),TRIM);lat([(z+.455,.016),(z+.472,.040),(z+.498,.040),(z+.515,.016)],TRIM,8,(.190,0))

# Family D: monolith (the user, 2026-11-15, with `images/20.png` of the session: tall dark carved
# pieces, each a tapered block with slanted shoulders and a small block for a head: "or maybe
# something like this as a template"). The body is one carved block with five sides. Each
# section is turned a little against the one below, so the long faces break on a diagonal, as
# a knife cut does. The class is the block's own shape and height, and one plain mark in the
# seat's second colour.
def carved(sections,m,n=5):
 """A carved block: sections of (z, x, y, radius in x, radius in y, turn in radians), joined by faces that twist."""
 v=[];f=[]
 for z,x,y,rx,ry,turn in sections:
  for i in range(n):
   a=turn+(i+.5)*math.tau/n;v.append((x+math.cos(a)*rx,y+math.sin(a)*ry,z))
 for j in range(len(sections)-1):
  for i in range(n):
   a,b,c,d=j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i;f+=[(a,b,c),(a,c,d)]
 f+=[tuple(reversed(range(n))),tuple(range((len(sections)-1)*n,len(sections)*n))]
 return keep(mesh('Carved block',v,f,m),None)

def d_body(h,w=.150,head=.20,lean=.018):
 """The block, its slanted shoulders and its small head. `h` is the height of the shoulders."""
 carved([(0,0,0,w,w*.84,.30),(h*.46,0,0,w*.90,w*.74,.42),(h,0,0,w*.74,w*.60,.62),(h+.105,lean,0,.036,.034,.62)],OWNER)
 carved([(h+.085,lean,0,.030,.030,.2),(h+.125,lean,0,.042,.040,.2),(h+.085+head*.86,lean,0,.038,.036,.3),(h+.085+head,lean,0,.020,.020,.3)],OWNER,4)

def d_sword():
 d_body(.66);x,y=-.185,-.070
 blade((x,y,.560),(x,y,.0),.036,TRIM,.016);slab((x,y,.572),(.130,.026,.026),TRIM);slab((x,y,.640),(.026,.026,.110),TRIM)
def d_spear():
 d_body(.80,.125,.22);x,y=-.165,-.060
 lat([(0,.012),(1.02,.012)],TRIM,5,(x,y));blade((x,y,1.00),(x,y,1.275),.046,TRIM,.016)
def d_bow():
 d_body(.56,.140,.19);crescent(.030,.440,.290,72,.058,.034,TRIM,-.105);bar((-.060,.164),(-.060,.716),.012,.014,TRIM,-.105)
def d_horse():
 carved([(0,.02,0,.185,.125,.30),(.20,.02,0,.165,.108,.40),(.40,.03,0,.120,.090,.52)],OWNER)
 horse_head((.040,.385),1.62,.120,OWNER);outline([(.135,.640),(.180,.620),(.168,.800),(.135,.930)],.134,TRIM)
def d_siege():
 carved([(0,0,0,.235,.190,.785),(.20,0,0,.185,.150,.84),(.36,0,0,.110,.095,.90)],OWNER,4)
 bar((-.215,.300),(.225,.800),.036,.040,TRIM);slab((-.215,0,.300),(.094,.080,.094),TRIM);lat([(.775,.018),(.795,.046),(.825,.046),(.845,.018)],TRIM,6,(.225,0))

def tokens():
 for family,pieces in (('a',(a_sword,a_spear,a_bow,a_horse,a_siege)),('b',(b_sword,b_spear,b_bow,b_horse,b_siege)),('c',(c_sword,c_spear,c_bow,c_horse,c_siege)),('d',(d_sword,d_spear,d_bow,d_horse,d_siege))):
  for author in pieces:
   reset();STATE['new']=[];author();still('tok-'+author.__name__.replace('_','-'))

def swordsman_toon():
 reset();base(.25);place(swordsman_figure(),scale=1.06);marks_and_export('ns-swordsman-toon')

def swordsman(cast=False):
 reset();pedestal();place(swordsman_piece(cast),scale=1.24);marks_and_export('ns-swordsman-column-cast' if cast else 'ns-swordsman-column')

def swordsman_squad():
 reset();base(.29)
 for at,yaw,phase in (((0,-.135),0,.0),((-.165,.085),.22,.37),((.165,.085),-.18,.71)):
  place(swordsman_figure(False),at,.60,yaw,phase)
 marks_and_export('ns-swordsman-squad')

# --- grey blockouts: outline only ---------------------------------------------------
def block_body():
 """The slim column body and helmet of the board game piece, in grey."""
 column_body(BLOCK)

def blockout(name,author,foot=True):
 """`foot` pieces stand on the swordsman's pedestal. The horseman and the catapult keep a wide low base."""
 reset();STATE['new']=[]
 if foot:pedestal(BLOCK,BLOCK)
 else:rings([(0,0,0,.265,.265),(0,0,.034,.25,.25)],BLOCK,14,idle=None)
 author();marks_and_export('ns-block-'+name)

def block_spearman():
 block_body()
 # A tall spear, a tall narrow shield and a pointed helmet: the tallest foot piece.
 rings([(0,0,.86,.078,.086),(0,0,.93,.050,.056),(0,0,1.04,.008,.008)],BLOCK,8)
 limb([(-.19,-.11,.08),(-.19,-.11,1.22)],[.014,.014],BLOCK,4);blade((-.19,-.11,1.20),(-.19,-.11,1.40),.040,BLOCK)
 limb([(-.108,0,.70),(-.19,-.11,.58)],[.038,.034],BLOCK,4)
 slab((.13,-.15,.40),(.17,.03,.48),BLOCK)

def block_archer():
 block_body()
 # No shield and no crest: a hood, a tall bow held out to the side and a quiver over the shoulder.
 rings([(0,0,.86,.080,.088),(0,.02,.94,.048,.052),(0,.06,.99,.008,.008)],BLOCK,8)
 pts=[(-.27+.10*math.cos(a),-.10,.52+.40*math.sin(a)) for a in [math.radians(d) for d in (-90,-60,-30,0,30,60,90)]]
 limb(pts,[.012,.016,.018,.02,.018,.016,.012],BLOCK,4)
 limb([(-.108,0,.70),(-.18,-.10,.52)],[.038,.034],BLOCK,4)
 limb([(.06,.10,.52),(.13,.12,.88)],[.036,.040],BLOCK,5)

def block_horseman():
 # A rider on a horse: long and low, twice the footprint of a foot piece.
 loft([(-.30,.36,.05,.08),(-.20,.38,.13,.15),(.0,.37,.13,.14),(.18,.39,.13,.15),(.27,.42,.07,.10)],BLOCK,6).rotation_euler[2]=-math.pi/2
 for x,y in ((.07,-.20),(-.07,-.20),(.07,.20),(-.07,.20)):limb([(x,y,.34),(x,y,.03)],[.05,.035],BLOCK,4)
 limb([(0,-.22,.42),(0,-.32,.60),(0,-.36,.70)],[.10,.075,.06],BLOCK,5);limb([(0,-.34,.72),(0,-.48,.62)],[.07,.045],BLOCK,5)
 limb([(0,.30,.44),(0,.38,.24)],[.03,.04],BLOCK,4)
 rings([(0,0,.46,.11,.10),(0,0,.66,.13,.10),(0,0,.76,.07,.065)],BLOCK,8);rings([(0,-.01,.75,.07,.066),(0,-.01,.84,.105,.10),(0,-.01,.93,.06,.06)],BLOCK,8)
 limb([(-.16,-.05,.60),(-.16,-.40,1.10)],[.014,.014],BLOCK,4)

def block_catapult():
 # A machine with no figure taller than it: a frame, four wheels and one long arm.
 slab((0,0,.16),(.34,.52,.06),BLOCK)
 for x in (-.19,.19):
  for y in (-.18,.18):keep(tube([(x-.02,y,.13),(x+.02,y,.13)],[.13,.13],BLOCK,8))
  limb([(x*.8,-.10,.18),(x*.8,.02,.56)],[.03,.03],BLOCK,4)
 limb([(-.16,.02,.56),(.16,.02,.56)],[.03,.03],BLOCK,4)
 limb([(0,-.22,.20),(0,.30,.78)],[.03,.022],BLOCK,4);slab((0,.32,.80),(.12,.12,.07),BLOCK)

tokens();swordsman_tall();swordsman_tall(True);swordsman_turn();swordsman_art();swordsman();swordsman_toon();swordsman_squad()
for name,author,foot in (('spearman',block_spearman,True),('archer',block_archer,True),('horseman',block_horseman,False),('catapult',block_catapult,False)):blockout(name,author,foot)
