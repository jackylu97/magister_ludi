"""The great people's works for the north-star look; run via build_settlement_assets.py -- --great-works-only.

The second pass (the user, 2026-11-14, docs/flags.md (nnnnnnn), "Great works,
second pass"): "i prefer the old design for the landmark and citadel", and for
the others "make them greater complexity/epic ... their height should still be
scale-wise similar to the other improvements, lets compensate for height by
designing larger structures and not just scaling it to be larger".

So a work is now wide and low. It fills most of its hex with several buildings
on one paved yard, and its roofs stay near the height of a farm's windmill
(0.64 to the top of the cap, 0.84 to the tip of a sail). One slim part (a spire,
a flag, a chimney) may pass that a little.
- ns-academy: a domed rotunda on a terrace between two halls, two cloister
  ranges round a garden court with an armillary sphere, and an observatory
  tower.
- ns-landmark: the study's stele again. Three steps, a tapered needle with a
  gilt cap, a plaque and cut strokes down its faces. New here: a low plaza,
  four corner posts and two braziers, inside a ring of old rough stones.
- ns-manufactory: a forge hall with a waterwheel and a flume, a blast furnace,
  two chimneys, a casting shed, a store, a crane, a cart on rails and heaps of
  coal and ore.
- ns-customs-house: a toll yard. The road enters under a gate with a striped
  barrier and a flag tower. Inside are a great pair of scales, two bonded
  warehouses with a loading dock, a counting house, a crane, a wagon and
  stacked goods.
- ns-citadel: the study's fort again. Six walls and six towers round an open
  court, with a gate arch and a gilt shield at the front. New here: sloped
  feet, wall walks, arrow slits, banners, a stair and a well.
- ns-holy-site: a round stepped court with a ring of standing stones and a
  stone gate, a sanctuary with a flame under a canopy and a blue spire, two
  domed chapels and a pool.

Sizes here are the board's own: a hex is 1.73 wide and 2.0 deep, and
`visualTest.works.greatWorks` in data/view3d.json draws each model at the size
it is authored (the model's `size` there is its widest side here). A model
stays inside 1.28 by 1.17, which is the rectangle the renderer can fit on a hex.

These files sit beside the study's works and replace nothing:
`NORTH_STAR_GREAT_WORKS` in src/terrainStudy/northStarAssets.js picks which set
is drawn. The first pass (checkpoint 61) is this file's previous version in git.

The front is -Y here, which is toward the camera on the board. Every model
reaches below z = 0, so it sits into a slope with no gap.
"""

MARBLE=pigment('GW marble','f2ead6');PLINTH=pigment('GW plinth stone','c9bea0');PAVE=pigment('GW paving','ddd2b4')
WALL=pigment('GW pale wall','eee2c4');MASONRY=pigment('GW masonry','cfc5ab');MASONRY_DEEP=pigment('GW masonry shade','b3aa93')
TILE=pigment('GW terracotta','cb6a43');TILE_DEEP=pigment('GW deep tile','a84d33');BRICK=pigment('GW brick','b9714c')
COPPER=pigment('GW verdigris copper','5f9c8c');LAPIS=pigment('GW lapis','3a5a96');GILT=pigment('GW gilt','e8b93f')
RECESS=pigment('GW recess','3b4a55');TIMBER=pigment('GW timber','7c5b3d');SOOT=pigment('GW soot','4a4441');EMBER=pigment('GW ember','f2892c')
ROCK=pigment('GW rock','a59c88');COBBLE=pigment('GW yard earth','c2b08c');BAND=pigment('GW clay band','c98a62')
CYPRESS=pigment('GW cypress','3f7d5a');HEDGE=pigment('GW hedge','7aa84c');WATER=pigment('GW water','5aa6d6')
CANVAS=pigment('GW canvas','f3ead2');RED=pigment('GW awning red','c8553d');ORE=pigment('GW ore','9a6a4c')

GROUND=.03  # the top of a yard
FOOT=-.22   # how far a yard reaches below the ground line

def solid(cx,cy,profile,m,n=8,turn=0.):
 """A stack of rings round a vertical axis. `profile` is (height, half-width in x, half-width in y) from the foot up;
 a half-width is measured to the flat of a side, so four sides make a box of that size. A profile entry of two
 numbers has the same half-width both ways."""
 v=[];f=[];k=1/math.cos(math.pi/n)
 profile=[(p[0],p[1],p[-1]) for p in profile]
 for z,rx,ry in profile:
  for i in range(n):
   a=turn+(i+.5)*math.tau/n;v.append((cx+math.cos(a)*rx*k,cy+math.sin(a)*ry*k,z))
 for j in range(len(profile)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.extend([tuple(reversed(range(n))),tuple(range((len(profile)-1)*n,len(profile)*n))]);return mesh('GW solid',v,f,m)

def box(x0,x1,y0,y1,z0,z1,m,bevel=0):
 """A block named by its six sides, which is easier to lay out a yard with than a centre and a size."""
 return block(((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),(abs(x1-x0),abs(y1-y0),abs(z1-z0)),m,bevel)

def turned(p,s,m,angle,bevel=0):
 """A block turned about the vertical line through its centre."""
 o=block(p,s,m,bevel);o.rotation_euler[2]=angle;return o

def prism(points,z0,z1,m):
 n=len(points);v=[(x,y,z0) for x,y in points]+[(x,y,z1) for x,y in points]
 return mesh('GW prism',v,[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]+[tuple(reversed(range(n))),tuple(range(n,2*n))],m)

def pad(w,d,m,cut=.04,top=GROUND,foot=FOOT):
 """The yard a work stands on: a rectangle with its corners cut."""
 a,b=w/2,d/2
 return prism([(-a+cut,-b),(a-cut,-b),(a,-b+cut),(a,b-cut),(a-cut,b),(-a+cut,b),(-a,b-cut),(-a,-b+cut)],foot,top,m)

def gable(x,y,z,w,d,h,m,along='x',wall=None,inset=.03):
 """A solid pitched roof. `along` is the direction of the ridge. `wall` paints the two end walls under the roof."""
 if along=='x':
  v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x-w/2,y,z+h),(x+w/2,y,z+h)]
  f=[(0,1,5,4),(2,3,4,5),(1,2,5),(3,0,4),(3,2,1,0)]
 else:
  v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x,y-d/2,z+h),(x,y+d/2,z+h)]
  f=[(1,2,5,4),(3,0,4,5),(0,1,4),(2,3,5),(3,2,1,0)]
 mesh('GW gable',v,f,m)
 if wall:
  # A thin wedge just outside each end of the roof, narrower than the roof, so the roof shows as an overhang.
  for s in (-1,1):
   if along=='x':
    b=d/2-inset;hh=h*b/(d/2);x0=x+s*(w/2-.004);x1=x+s*(w/2+.004)
    pts=[(x0,y-b,z),(x0,y+b,z),(x0,y,z+hh),(x1,y-b,z),(x1,y+b,z),(x1,y,z+hh)]
   else:
    b=w/2-inset;hh=h*b/(w/2);y0=y+s*(d/2-.004);y1=y+s*(d/2+.004)
    pts=[(x-b,y0,z),(x+b,y0,z),(x,y0,z+hh),(x-b,y1,z),(x+b,y1,z),(x,y1,z+hh)]
   mesh('GW gable wall',pts,[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],wall)

def hip(x,y,z,w,d,h,m,ridge=.35):
 """A hipped roof. `ridge` is the ridge length as a share of the long side; 0 gives a pyramid."""
 rx=w*ridge/2 if w>=d else 0;ry=d*ridge/2 if d>w else 0
 v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x-rx,y-ry,z+h),(x+rx,y-ry,z+h),(x+rx,y+ry,z+h),(x-rx,y+ry,z+h)]
 return mesh('GW hip',v,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7),(3,2,1,0)],m)

def hall(x0,x1,y0,y1,z0,z1,rise,wall,roof,along='x',over=.025,hipped=None,eaves=TILE_DEEP):
 """Walls, a thick edge of roof and a roof. Returns the height of the ridge."""
 box(x0,x1,y0,y1,z0,z1,wall,.008)
 cx,cy,w,d=(x0+x1)/2,(y0+y1)/2,x1-x0+2*over,y1-y0+2*over
 box(cx-w/2,cx+w/2,cy-d/2,cy+d/2,z1-.006,z1+.016,eaves)
 if hipped is None:gable(cx,cy,z1+.016,w-.02,d-.02,rise,roof,along,wall)
 else:hip(cx,cy,z1+.016,w-.02,d-.02,rise,roof,hipped)
 return z1+.016+rise

def south(x,y,z0,z1,w,m=RECESS,out=.006):
 """A door or a window on a wall that faces the front. `y` is the wall's face."""
 box(x-w/2,x+w/2,y-out,y+.004,z0,z1,m)
def side(x,y,z0,z1,w,m=RECESS,out=.006,s=1):
 """The same on a wall that faces east (s=1) or west (s=-1). `x` is the wall's face."""
 box(x-.004*s,x+out*s,y-w/2,y+w/2,z0,z1,m)

def stairs(x,y,w,z0,z1,n,run,m):
 """Steps down toward the front from the edge at `y`, from height z1 to z0."""
 rise=(z1-z0)/(n+1)
 for i in range(n):box(x-w/2,x+w/2,y-run*(i+1),y-run*i,z0-.02,z1-rise*(i+1),m)

def flame(x,y,z,h=.1,r=.03):
 tube([(x,y,z),(x,y,z+h)],[r,.002],EMBER,5)
def brazier(x,y,z,h=.13,m=PLINTH):
 solid(x,y,[(z,.03),(z+h*.7,.02),(z+h,.04)],m,5)
 flame(x,y,z+h,.07,.027)
def barrel(x,y,z,r=.028,h=.07,m=TIMBER):
 solid(x,y,[(z,r*.8),(z+h*.5,r),(z+h,r*.8)],m,6)
def cypress(x,y,z,h=.17,r=.035):
 solid(x,y,[(z,r*.7),(z+h*.3,r),(z+h,.004)],CYPRESS,6)
def heap(x,y,z,rx,ry,h,m):
 solid(x,y,[(z,rx,ry),(z+h*.6,rx*.6,ry*.6),(z+h,rx*.12,ry*.12)],m,6,.3)
def banner(x,y,z0,z1,m=LAPIS,w=.085,h=.05):
 tube([(x,y,z0),(x,y,z1)],[.006,.006],TIMBER,4)
 box(x,x+w,y-.003,y+.003,z1-h-.01,z1-.01,m)
def wheel(x,y,z,r,t,m=SOOT):
 """A cart wheel whose axle runs east to west."""
 tube([(x-t/2,y,z),(x+t/2,y,z)],[r,r],m,8)

STANDING=pigment('GW standing stone','b3a68f');STANDING_DEEP=pigment('GW standing stone shade','968a76');MOSS=pigment('GW moss','8c9c58')
def menhir(x,y,h,seed,lean=.09):
 """A rough standing stone: five uneven sides, a slanted top and a lean. Returns the middle of its top."""
 rng=random.Random(seed*7+1);n=5;v=[];f=[]
 w,d=rng.uniform(.045,.062),rng.uniform(.032,.045);lx,ly=rng.uniform(-lean,lean),rng.uniform(-lean,lean)*.6
 tilt=rng.uniform(-.04,.04)
 for z,k in ((FOOT,1.1),(h*.45,1.0+rng.uniform(-.08,.12)),(h*.85,.82),(h,.55)):
  for i in range(n):
   a=-math.pi/2+(i+.5)*math.tau/n;j=rng.uniform(.88,1.12)
   zz=max(z,0) if z<=0 else z
   v.append((x+lx*zz+math.cos(a)*w*k*j,y+ly*zz+math.sin(a)*d*k*j,z+(tilt*math.cos(a)*(z/h) if z>0 else 0)))
 for r in range(3):
  for i in range(n):f.append((r*n+i,r*n+(i+1)%n,(r+1)*n+(i+1)%n,(r+1)*n+i))
 f.extend([tuple(reversed(range(n))),tuple(range(3*n,4*n))])
 mesh('GW menhir',v,f,STANDING if seed%3 else STANDING_DEEP)
 return (x+lx*h,y+ly*h,h)

def academy():
 reset();pad(1.28,1.14,PLINTH)
 box(-.42,.42,-.50,.04,GROUND,GROUND+.008,PAVE)
 # The upper terrace at the back, with a broad stair down to the court.
 upper=.09
 box(-.625,.625,.04,.555,FOOT,upper,MASONRY,.008)
 stairs(0,.04,.36,GROUND,upper,2,.035,MARBLE)
 # A rail of short posts along the terrace's edge, and a statue on each side of the stair.
 for s in (-1,1):
  for k in range(4):box(s*(.215+k*.065)-.012,s*(.215+k*.065)+.012,.045,.069,upper,upper+.05,MARBLE)
  box(*sorted((s*.20,s*.425)),.047,.067,upper+.05,upper+.062,PAVE)
  box(s*.215-.03,s*.215+.03,-.035,.025,GROUND,.11,MASONRY,.006)
  solid(s*.215,-.005,[(.11,.022,.018),(.19,.016,.014),(.20,.024,.016),(.215,.012)],MARBLE,5)
  leaf((s*.215,-.005,.228),(.014,.014,.016),MARBLE)
 # The rotunda: a round hall, a half ring of columns, one ring of stone and a copper dome.
 cx,cy=0,.30
 solid(cx,cy,[(upper,.25),(upper+.025,.24)],MARBLE,10)
 solid(cx,cy,[(upper+.025,.165),(.37,.165)],WALL,10)
 south(cx,cy-.165,upper+.025,.26,.075)
 for i in range(7):
  a=math.pi+i*math.pi/6;x,y=cx+math.cos(a)*.215,cy+math.sin(a)*.215
  tube([(x,y,upper+.025),(x,y,.35)],[.02,.016],MARBLE,5)
 solid(cx,cy,[(.345,.245),(.39,.255)],MARBLE,10)
 solid(cx,cy,[(.39,.205),(.455,.19),(.52,.135),(.56,.05)],COPPER,10)
 solid(cx,cy,[(.555,.04),(.61,.034)],MARBLE,6)
 solid(cx,cy,[(.61,.048),(.645,.004)],COPPER,6)
 leaf((cx,cy,.665),(.026,.026,.026),GILT)
 tube([(cx,cy,.68),(cx,cy,.75)],[.009,.001],GILT,4)
 # Two halls beside it, each joined to it by a low gallery with a flat roof.
 for s in (-1,1):
  x0,x1=sorted((s*.31,s*.60))
  hall(x0,x1,.15,.50,upper,.28,.10,WALL,TILE,'y')
  for x in (s*.40,s*.51):south(x,.15,.16,.24,.04)
  tube([(s*.455,.122,.335),(s*.455,.134,.335)],[.026,.026],GILT,8)
  g0,g1=sorted((s*.16,s*.31))
  box(g0,g1,.22,.40,upper,.22,WALL)
  box(g0,g1,.21,.41,.22,.238,PAVE)
  south((g0+g1)/2,.22,upper,.18,.05)
 # Two cloister ranges run forward from the terrace. Dark arches face the court.
 for s in (-1,1):
  y0=-.50 if s<0 else -.365
  x0,x1=sorted((s*.455,s*.615))
  hall(x0,x1,y0,.04,GROUND,.17,.065,WALL,TILE,'y',.02)
  n=5 if s<0 else 3
  for i in range(n):side(s*.455,y0+.07+i*.105,GROUND,.13,.06,RECESS,.006,-s)
 south(-.535,-.50,.08,.14,.05)
 # The observatory: a square tower with a small copper dome and a gilt telescope.
 box(.44,.61,-.535,-.365,GROUND,.42,WALL,.008)
 box(.425,.625,-.55,-.35,.42,.445,MARBLE)
 solid(.525,-.45,[(.445,.075),(.49,.07),(.535,.04),(.55,.008)],COPPER,8)
 tube([(.525,-.47,.50),(.585,-.53,.585)],[.011,.014],GILT,5)
 for z in (.15,.29):south(.525,-.535,z,z+.07,.04)
 south(.525,-.535,GROUND,.11,.05,TIMBER)
 # The front wall and its gate, with a gilt ball on each pier.
 for s in (-1,1):
  x0,x1=sorted((s*.125,s*.455 if s<0 else s*.44))
  box(x0,x1,-.545,-.52,GROUND,.10,MASONRY);box(x0,x1,-.55,-.515,.10,.115,PAVE)
  box(s*.10-.03,s*.10+.03,-.56,-.50,GROUND,.17,MARBLE,.006)
  leaf((s*.10,-.53,.19),(.024,.024,.024),GILT)
 # The court: an armillary sphere on a pedestal, clipped hedges, cypresses and two benches.
 solid(0,-.24,[(GROUND,.065),(.06,.055),(.12,.032),(.135,.05)],MARBLE,8)
 for rot in ((0,0,0),(math.pi/2,0,0),(math.radians(62),0,math.radians(35))):
  bpy.ops.mesh.primitive_torus_add(major_radius=.07,minor_radius=.008,major_segments=14,minor_segments=4,location=(0,-.24,.225),rotation=rot)
  bpy.context.object.data.materials.append(GILT)
 leaf((0,-.24,.225),(.028,.028,.028),LAPIS)
 tube([(0,-.24,.135),(0,-.24,.31)],[.006,.006],GILT,4)
 for s in (-1,1):
  box(s*.33-.035,s*.33+.035,-.43,-.30,GROUND,.07,HEDGE,.008);box(s*.33-.035,s*.33+.035,-.18,-.05,GROUND,.07,HEDGE,.008)
  cypress(s*.33,-.24,GROUND,.19);cypress(s*.20,-.46,GROUND,.16,.03)
  box(s*.19-.05,s*.19+.05,-.255,-.225,GROUND,.06,MARBLE)
 export('ns-academy')

def landmark():
 reset()
 # A low plaza carries the study's three steps.
 pad(.82,.60,PLINTH,.08)
 pad(.74,.52,PAVE,.06,GROUND+.012,GROUND)
 z=GROUND+.012
 for w,h,m in ((.50,.032,MASONRY_DEEP),(.39,.032,MASONRY),(.28,.045,MARBLE)):
  box(-w/2,w/2,-w/2,w/2,z,z+h,m,.008);z+=h
 # The foot of the needle: a block with a plaque in lapis and gilt, under a ledge.
 box(-.11,.11,-.11,.11,z,z+.065,MARBLE,.006)
 south(0,-.11,z+.012,z+.054,.14,GILT,.005);south(0,-.11,z+.019,z+.047,.115,LAPIS,.009)
 z+=.065
 box(-.125,.125,-.125,.125,z,z+.016,PAVE);z+=.016
 # The needle: four tapering sides and a gilt cap, with a gilt band under the cap.
 foot,top,height=.088,.052,.52
 solid(0,0,[(z,foot),(z+height,top)],MARBLE,4)
 at=lambda u:foot+(top-foot)*u
 solid(0,0,[(z+height*.90,at(.90)+.004),(z+height*.94,at(.94)+.004)],GILT,4)
 solid(0,0,[(z+height,top),(z+height+.125,.001)],GILT,4)
 # Short strokes cut into three of its faces. They follow its taper.
 for i,width in enumerate((.085,.05,.10,.06,.08,.045)):
  u=.12+i*.125;zz=z+height*u;f=at(u)
  south(0,-f,zz,zz+.016,width*f/foot,MASONRY_DEEP,.003)
  for s in (-1,1):side(s*f,0,zz,zz+.016,width*f/foot,MASONRY_DEEP,.003,s)
 # Four corner posts with gilt balls, and a brazier at each side.
 for sx in (-1,1):
  for sy in (-1,1):
   solid(sx*.33,sy*.22,[(GROUND,.04),(.10,.032),(.115,.042),(.13,.042)],MARBLE,4)
   leaf((sx*.33,sy*.22,.15),(.024,.024,.024),GILT)
  brazier(sx*.33,0,GROUND,.11,MARBLE)
 # The needle stands a little behind the middle of the hex, so the ring's mouth has room.
 for o in bpy.context.scene.objects:o.location.y+=.08
 # The old ring (the user, 2026-11-14: "add a ring of stones around the landmark so that its visually as big as
 # the others"). Rough stones of uneven height and lean on a round of worn earth, open at the front. They are
 # grey and uncut, where the holy site's stones are white, even and capped.
 solid(0,0,[(FOOT,.64,.57),(.012,.64,.57)],COBBLE,12)
 rng=random.Random(63)
 for k in range(11):
  a=math.radians(250-k*32+rng.uniform(-6,6));d=rng.uniform(.72,.80)
  if abs(math.cos(a)*.58*d)<.47 and -.30<math.sin(a)*.50*d<.46:continue
  turned((math.cos(a)*.58*d,math.sin(a)*.50*d,.014),(rng.uniform(.07,.11),rng.uniform(.05,.08),.012),PLINTH,rng.uniform(0,3))
 ring=((300,.37,0),(322,.27,1),(345,.15,2),(8,.31,3),(33,.25,4),(70,.33,5),(92,.36,6),(112,.35,7),(147,.34,8),(172,.33,9),(220,.29,11),(242,.39,12))
 at={}
 for deg,h,seed in ring:
  a=math.radians(deg);x,y=math.cos(a)*.575,math.sin(a)*.50
  # The half-sunk stone leans hard; the rest lean a little, each its own way.
  at[deg]=menhir(x,y,h,seed,.32 if deg==345 else .09)
 for d0,d1 in ((92,112),(147,172)):
  (x0,y0,z0),(x1,y1,z1)=at[d0],at[d1];top=max(z0,z1)
  o=turned(((x0+x1)/2,(y0+y1)/2,top+.022),(math.hypot(x1-x0,y1-y0)+.09,.075,.05),STANDING,math.atan2(y1-y0,x1-x0),.012)
  o.rotation_euler[1]=.04*(1 if d0==92 else -1)
 # One stone has fallen and lies broken in two.
 a=math.radians(197);x,y=math.cos(a)*.56,math.sin(a)*.49
 turned((x-.03,y+.05,.035),(.17,.075,.06),STANDING,1.1,.014).rotation_euler[1]=.12
 turned((x+.05,y-.085,.03),(.10,.07,.05),STANDING_DEEP,.75,.012)
 # Moss at the feet of some stones, and cut marks on four of them: the needle's strokes, older.
 for deg in (322,8,70,147,220,242):
  a=math.radians(deg+7);leaf((math.cos(a)*.555,math.sin(a)*.485,.018),(.04,.03,.012),MOSS)
 for deg,m in ((300,GILT),(242,GILT),(220,STANDING_DEEP),(322,STANDING_DEEP)):
  x,y,z=at[deg]
  for j in range(3):box(x-.022+j*.004,x+.022-j*.004,y-.052,y-.04,z*.38+j*.045,z*.38+j*.045+.014,m)
 export('ns-landmark')

def manufactory():
 reset();pad(1.28,1.14,COBBLE)
 # The forge hall: brick on a stone footing, a vent along the ridge, windows lit by the fires.
 box(-.565,.125,.115,.485,GROUND,.075,MASONRY)
 ridge=hall(-.56,.12,.12,.48,GROUND,.28,.13,BRICK,TILE_DEEP,'x')
 box(-.44,0,.265,.335,ridge-.035,ridge+.02,TIMBER);gable(-.22,.30,ridge+.02,.48,.11,.035,TILE_DEEP,'x')
 south(-.10,.12,GROUND,.20,.15);box(-.19,-.01,.105,.125,.20,.225,TIMBER)
 for x in (-.26,.045):south(x,.12,.13,.21,.045,EMBER)
 for x in (-.305,-.20,0,.115):box(x-.02,x+.02,.10,.12,GROUND,.28,MASONRY)
 # The waterwheel on the hall's front, facing the yard, with a flume that feeds it and a race under it.
 wx,wy,wz=-.455,.075,.195
 tube([(wx,wy-.025,wz),(wx,wy+.025,wz)],[.15,.15],TIMBER,10)
 tube([(wx,wy-.035,wz),(wx,wy+.04,wz)],[.04,.04],SOOT,6)
 box(wx-.16,wx+.16,wy-.032,wy+.032,wz-.011,wz+.011,MASONRY_DEEP);box(wx-.011,wx+.011,wy-.032,wy+.032,wz-.16,wz+.16,MASONRY_DEEP)
 for k in range(8):
  a=k*math.tau/8+math.pi/8;turned((wx+math.cos(a)*.15,wy,wz+math.sin(a)*.15),(.035,.06,.012),MASONRY_DEEP,0).rotation_euler[1]=-a
 box(-.64,-.28,wy-.05,wy+.05,GROUND,GROUND+.008,WATER)
 box(-.64,wx+.02,wy-.03,wy+.03,.355,.385,TIMBER);box(-.64,wx+.02,wy-.018,wy+.018,.385,.39,WATER)
 for y in (wy-.025,wy+.025):tube([(-.625,y,GROUND),(-.625,y,.355)],[.011,.011],TIMBER,4)
 box(wx-.03,wx+.03,wy-.065,wy-.04,GROUND,wz+.02,MASONRY)
 # The blast furnace: a square stack that narrows upward, bound with iron, with fire at its mouth and its tap.
 fx,fy=.36,.30
 solid(fx,fy,[(GROUND,.15),(.36,.105)],MASONRY,4)
 for z,r in ((.13,.139),(.24,.124)):solid(fx,fy,[(z,r),(z+.022,r-.003)],SOOT,4)
 solid(fx,fy,[(.36,.12),(.39,.12)],MASONRY_DEEP,4)
 solid(fx,fy,[(.39,.085),(.395,.085)],EMBER,8)
 box(fx-.05,fx+.05,fy-.16,fy-.13,GROUND,.14,RECESS);box(fx-.03,fx+.03,fy-.165,fy-.14,GROUND,.07,EMBER)
 box(fx-.015,fx+.015,-.02,fy-.16,GROUND,GROUND+.01,EMBER)
 # A timber ramp for the barrows runs up its east side.
 turned((.555,.23,.19),(.07,.45,.014),TIMBER,0).rotation_euler[0]=math.atan2(.30,.34)
 for y,z in ((.14,.10),(.32,.25)):tube([(.555,y,GROUND),(.555,y,z)],[.011,.011],TIMBER,4)
 # Two brick chimneys. The tall one is the work's one high part.
 for x,y,h,r in ((.545,.485,.86,.065),(.17,.50,.60,.058)):
  box(x-r-.01,x+r+.01,y-r-.01,y+r+.01,GROUND,.09,MASONRY)
  solid(x,y,[(.09,r),(h-.06,r*.62),(h-.04,r*.8),(h-.01,r*.8)],BRICK,6)
  solid(x,y,[(h-.01,r*.84),(h+.02,r*.74)],SOOT,6)
  solid(x,y,[(h+.02,r*.5),(h+.024,r*.5)],EMBER,6)
 # The casting shed: a roof on posts. The moulds, the anvil and the ingots stand in the open in front of it.
 for x in (.23,.40,.57):
  for y in (-.27,-.07):tube([(x,y,GROUND),(x,y,.20)],[.012,.012],TIMBER,4)
 box(.20,.60,-.30,-.04,.195,.212,TILE_DEEP);gable(.40,-.17,.212,.38,.24,.065,TILE,'x',TIMBER,.02)
 box(.29,.43,-.20,-.10,GROUND,.085,MASONRY);box(.31,.41,-.18,-.12,.085,.09,EMBER)
 box(.33,.39,-.40,-.34,GROUND,.045,MASONRY_DEEP);box(.34,.38,-.39,-.35,.045,.05,EMBER)
 box(.235,.275,-.40,-.34,GROUND,.07,TIMBER);box(.225,.285,-.395,-.345,.07,.10,SOOT)
 for x,y,z in ((.47,-.38,GROUND),(.53,-.38,GROUND),(.50,-.38,GROUND+.035),(.47,-.46,GROUND),(.53,-.46,GROUND)):box(x-.025,x+.025,y-.035,y+.035,z,z+.035,GILT)
 # The store, with a stack of logs behind it.
 hall(-.60,-.32,-.44,-.20,GROUND,.19,.085,MASONRY,TILE,hipped=.4)
 side(-.32,-.32,GROUND,.13,.07,TIMBER);south(-.46,-.44,.09,.15,.05)
 for y,z in ((-.10,.055),(-.045,.055),(-.072,.10)):tube([(-.58,y,z),(-.36,y,z)],[.027,.027],TIMBER,6)
 # The crane in the middle of the yard, lifting a bucket.
 tube([(-.06,-.10,GROUND),(-.06,-.10,.43)],[.018,.015],TIMBER,5)
 tube([(-.09,-.085,.40),(.13,-.20,.50)],[.013,.011],TIMBER,4)
 tube([(-.06,-.10,.22),(.06,-.165,.465)],[.008,.008],TIMBER,4)
 tube([(.12,-.195,.495),(.12,-.195,.25)],[.004,.004],SOOT,3)
 solid(.12,-.195,[(.19,.022),(.25,.03)],SOOT,6)
 for a in (0,math.pi/2):turned((-.06,-.10,GROUND+.012),(.16,.03,.024),TIMBER,a+.4)
 # Rails from the gate, a cart of ore on them, and heaps of coal and ore.
 for x in (-.03,.07):box(x-.006,x+.006,-.56,-.26,GROUND,GROUND+.008,SOOT)
 box(-.02,.06,-.45,-.34,.055,.105,TIMBER);heap(.02,-.395,.10,.045,.045,.04,ORE)
 for y in (-.43,-.36):
  for x in (-.03,.07):wheel(x,y,.052,.022,.012)
 heap(-.19,-.42,GROUND,.09,.08,.085,SOOT);heap(-.20,-.26,GROUND,.075,.065,.07,ORE);heap(.20,-.50,GROUND,.06,.05,.05,SOOT)
 # A low brick wall round the front of the yard, with two piers at the gate.
 for s in (-1,1):
  x0,x1=sorted((s*.13,s*.615))
  box(x0,x1,-.555,-.53,GROUND,.10,BRICK);box(x0,x1,-.56,-.525,.10,.113,MASONRY)
  box(s*.11-.03,s*.11+.03,-.565,-.505,GROUND,.16,MASONRY,.006);hip(s*.11,-.535,.16,.075,.075,.035,TILE_DEEP,0)
 box(.595,.62,-.53,.05,GROUND,.10,BRICK);box(.59,.625,-.53,.05,.10,.113,MASONRY)
 export('ns-manufactory')

def customs_house():
 reset();pad(1.28,1.14,PLINTH)
 # The road runs in under the gate and up the yard.
 box(-.085,.085,-.57,.12,GROUND,GROUND+.008,PAVE)
 # The gate: a short pier, an arch with a gilt coin on it, and the flag tower.
 box(-.20,-.085,-.565,-.45,GROUND,.25,MASONRY,.008);box(-.21,-.075,-.575,-.44,.25,.27,PAVE);hip(-.1425,-.5075,.27,.12,.12,.06,TILE_DEEP,0)
 box(-.085,.085,-.55,-.47,.21,.275,MASONRY);box(-.095,.095,-.56,-.46,.275,.292,PAVE)
 tube([(0,-.548,.243),(0,-.558,.243)],[.026,.026],GILT,8)
 box(.085,.255,-.575,-.405,GROUND,.50,MASONRY,.008)
 box(.07,.27,-.59,-.39,.50,.525,PAVE)
 solid(.17,-.49,[(.525,.095),(.71,.006)],TILE_DEEP,4)
 banner(.17,-.49,.70,.89)
 for z in (.17,.33):south(.17,-.575,z,z+.075,.04)
 tube([(.17,-.573,.445),(.17,-.582,.445)],[.03,.03],GILT,8)
 # The barrier: a red and white pole across the road, on a post with a weight.
 tube([(-.115,-.585,GROUND),(-.115,-.585,.13)],[.013,.013],TIMBER,4)
 for i in range(5):box(-.135+i*.045,-.09+i*.045,-.593,-.577,.105,.123,RED if i%2==0 else CANVAS)
 box(-.165,-.135,-.597,-.573,.095,.133,SOOT)
 # The yard's front wall.
 for x0,x1 in ((-.615,-.20),(.255,.615)):
  box(x0,x1,-.55,-.525,GROUND,.13,MASONRY);box(x0,x1,-.555,-.52,.13,.145,PAVE)
 # Stone posts along the road, a lamp on the short pier, a pennant on the first warehouse and a chest of coin by the scales.
 for y in (-.38,-.26,-.14,-.02):
  for s in (-1,1):solid(s*.105,y,[(GROUND,.014),(.075,.011),(.085,.016)],MASONRY_DEEP,5)
 banner(-.36,.17,.47,.62,RED,.07,.04)
 box(-.24,-.17,-.40,-.35,GROUND,.075,TIMBER);box(-.235,-.175,-.395,-.355,.075,.085,GILT)
 # The first bonded warehouse: brick, with a stepped front, two loading doors and a hoist.
 hall(-.60,-.12,.16,.53,GROUND,.28,.15,BRICK,TILE_DEEP,'y',.015)
 for x0,x1,z0,z1 in ((-.60,-.12,.27,.33),(-.52,-.20,.33,.40),(-.44,-.28,.40,.475)):box(x0,x1,.15,.185,z0,z1,BRICK)
 for x0,x1,z in ((-.61,-.52,.33),(-.20,-.11,.33),(-.53,-.44,.40),(-.28,-.19,.40),(-.45,-.27,.475)):box(x0,x1,.145,.19,z,z+.012,PAVE)
 south(-.36,.15,GROUND,.18,.13,TIMBER);south(-.36,.15,.24,.34,.075)
 for x in (-.52,-.20):south(x,.15,.10,.17,.045)
 tube([(-.36,.16,.43),(-.36,.07,.43)],[.011,.011],TIMBER,4)
 tube([(-.36,.08,.43),(-.36,.08,.30)],[.004,.004],SOOT,3);box(-.395,-.325,.05,.11,.24,.30,CANVAS,.006)
 # The second: pale, long side to the yard, three dark doors on a loading dock and a hoist in the roof.
 ridge=hall(.03,.60,.24,.53,GROUND,.25,.12,WALL,TILE,'x',.015)
 box(.03,.60,.13,.24,GROUND,.075,MASONRY,.006)
 for x in (.13,.315,.50):south(x,.24,.075,.20,.10);box(x-.06,x+.06,.232,.245,.20,.215,TIMBER)
 box(.265,.365,.215,.30,.25,.33,WALL);gable(.315,.255,.33,.12,.10,.045,TILE,'y',WALL,.012)
 south(.315,.215,.265,.32,.05);tube([(.315,.22,.335),(.315,.16,.335)],[.009,.009],TIMBER,4)
 # Goods on the dock.
 for x,y in ((.07,.17),(.125,.17),(.098,.20)):barrel(x,y,.075)
 barrel(.098,.172,.145,.026,.06)
 box(.40,.47,.15,.21,.075,.135,TIMBER);box(.48,.54,.15,.20,.075,.125,TIMBER);box(.42,.48,.155,.205,.135,.185,TIMBER)
 # The counting house, with a gilt coin for its sign.
 hall(.34,.60,-.38,-.12,GROUND,.29,.11,WALL,TILE_DEEP,hipped=0)
 side(.34,-.25,GROUND,.14,.06,TIMBER,.006,-1);south(.47,-.38,.17,.25,.045);south(.47,-.38,.06,.13,.045)
 tube([(.335,-.33,.23),(.28,-.33,.23)],[.006,.006],SOOT,3);tube([(.29,-.326,.195),(.29,-.334,.195)],[.028,.028],GILT,8)
 box(.52,.56,-.20,-.16,.33,.44,WALL)
 # The great scales on a round stone floor: one pan holds a bale, the other the weights.
 sx,sy=-.37,-.22
 solid(sx,sy,[(GROUND,.15),(.06,.14)],MARBLE,10)
 solid(sx,sy,[(.06,.035),(.09,.025)],MASONRY_DEEP,6)
 tube([(sx,sy,.09),(sx,sy,.36)],[.016,.013],TIMBER,5)
 tube([(sx-.135,sy,.335),(sx+.135,sy,.335)],[.011,.011],TIMBER,4)
 leaf((sx,sy,.375),(.022,.022,.022),GILT)
 for s in (-1,1):
  px=sx+s*.125
  solid(px,sy,[(.135,.035),(.15,.055)],GILT,8)
  for dy in (-.045,.045):tube([(px,sy,.335),(px,sy+dy,.15)],[.004,.004],SOOT,3)
 box(sx-.16,sx-.09,sy-.03,sy+.03,.15,.20,CANVAS,.006)
 for dx,r in ((.105,.016),(.14,.013),(.125,.011)):solid(sx+dx,sy+(.015 if r>.012 else -.02),[(.15,r),(.15+r*2.2,r*.7)],SOOT,6)
 # The crane beside the road, with its drum, lifting a crate.
 tube([(-.14,.05,GROUND),(-.14,.05,.42)],[.018,.015],TIMBER,5)
 tube([(-.17,.06,.39),(.02,-.02,.49)],[.013,.011],TIMBER,4)
 tube([(-.14,.05,.22),(-.05,.01,.455)],[.008,.008],TIMBER,4)
 tube([(.01,-.015,.485),(.01,-.015,.27)],[.004,.004],SOOT,3);box(-.025,.045,-.05,.02,.20,.27,TIMBER)
 tube([(-.21,.05,.09),(-.16,.05,.09)],[.06,.06],TIMBER,8)
 # A wagon on the road, loaded and covered.
 box(-.05,.05,-.33,-.17,.075,.105,TIMBER)
 for y in (-.30,-.20):
  for x in (-.058,.058):wheel(x,y,.065,.035,.012)
 box(-.042,.042,-.32,-.18,.105,.165,CANVAS,.012)
 tube([(0,-.33,.085),(0,-.41,.06)],[.007,.007],TIMBER,4)
 # Goods along the front wall, some under a striped awning.
 for x,y in ((-.56,-.47),(-.50,-.47),(-.53,-.42)):barrel(x,y,GROUND)
 barrel(-.53,-.455,.10,.026,.06)
 for i in range(4):box(-.44+i*.05,-.39+i*.05,-.52,-.40,.20,.215,RED if i%2==0 else CANVAS)
 for x in (-.435,-.245):
  for y in (-.51,-.41):tube([(x,y,GROUND),(x,y,.20)],[.008,.008],TIMBER,4)
 box(-.42,-.34,-.50,-.43,GROUND,.085,CANVAS,.008);box(-.33,-.26,-.50,-.44,GROUND,.09,TIMBER);box(-.40,-.33,-.49,-.44,.085,.13,CANVAS,.008)
 for x,y in ((-.56,.07),(-.50,.085),(-.53,.03)):heap(x,y,GROUND,.035,.03,.05,CANVAS)
 box(-.33,-.26,.04,.11,GROUND,.10,TIMBER);box(-.32,-.26,-.04,.02,GROUND,.09,TIMBER)
 export('ns-customs-house')

def citadel():
 reset()
 # The study's plan: six walls and six towers, flat sides to the front and the back, the gate in the front wall.
 ap=.45;r=ap/math.cos(math.pi/6);run=r+.012
 def place(a,u,v,z,size,m,bevel=0):
  """A block on the wall whose outward direction is `a`: `u` along the wall, `v` outward from its line."""
  turned((math.cos(a)*(ap+v)-math.sin(a)*u,math.sin(a)*(ap+v)+math.cos(a)*u,z),size,m,a+math.pi/2,bevel)
 for i in range(6):
  a=-math.pi/2+i*math.pi/3
  parts=[(-(.14+(run-.28)/4),(run-.28)/2),((.14+(run-.28)/4),(run-.28)/2)] if i==0 else [(0,run)]
  for u,length in parts:
   place(a,u,0,-.05,(length,.13,.34),MASONRY_DEEP)
   place(a,u,0,.19,(length,.085,.16),MASONRY)
   place(a,u,0,.283,(length,.105,.026),BAND)
   # Merlons along the outer edge of the wall walk, and one arrow slit.
   count=max(2,round(length/.085))
   for k in range(count):place(a,u-length/2+(k+.5)*length/count,.032,.318,(.042,.036,.045),MARBLE)
   if i:place(a,u,.044,.19,(.022,.008,.07),RECESS)
 for i in range(6):
  a=-math.pi/2+(i+.5)*math.pi/3;x,y=math.cos(a)*r,math.sin(a)*r
  # A tower: a wide sloped foot, a shaft, a ledge, a clay band and six merlons.
  solid(x,y,[(FOOT,.10),(.07,.094),(.11,.082),(.40,.078),(.425,.098),(.445,.098)],MASONRY,6,a)
  solid(x,y,[(.445,.10),(.47,.10)],BAND,6,a)
  solid(x,y,[(.47,.07),(.475,.07)],MASONRY_DEEP,6,a)
  for k in range(6):
   b=a+k*math.pi/3
   turned((x+math.cos(b)*.08,y+math.sin(b)*.08,.495),(.036,.05,.05),MARBLE,b)
  turned((x+math.cos(a)*.081,y+math.sin(a)*.081,.28),(.008,.022,.075),RECESS,a)
 # The gate: two piers, an open arch, a ledge over it and the gilt shield.
 arch(0,-ap,-.02,.20,.27,.11,MASONRY)
 for s in (-1,1):box(s*.165-.035,s*.165+.035,-ap-.075,-ap+.06,-.05,.33,MASONRY,.006)
 for s in (-1,1):box(s*.07,s*.13,-ap-.04,-ap+.04,.215,.27,MASONRY)
 box(-.20,.20,-ap-.07,-ap+.055,.27,.345,MASONRY);box(-.215,.215,-ap-.085,-ap+.06,.345,.365,BAND)
 for k in range(4):box(-.185+k*.107,-.135+k*.107,-ap-.08,-ap-.04,.365,.41,MARBLE)
 prism([(-.032,-ap-.082),(.032,-ap-.082),(.032,-ap-.07),(-.032,-ap-.07)],.285,.335,GILT)
 mesh('GW shield point',[(-.032,-ap-.082,.285),(.032,-ap-.082,.285),(0,-ap-.082,.25),(-.032,-ap-.07,.285),(.032,-ap-.07,.285),(0,-ap-.07,.25)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],GILT)
 # Two leaves of the gate stand open inside the arch.
 for s in (-1,1):turned((s*.115,-ap+.10,.11),(.012,.10,.20),TIMBER,s*.5)
 # Banners on the two rear towers.
 for s in (-1,1):banner(s*r*.5,r*math.sin(math.pi/3),.47,.70)
 # In the court, against the walls and clear of the middle: a stair to the wall walk, a well and stores.
 for k in range(5):place(math.pi/2,.20-k*.045,-.075,(.01+k*.05)/2,(.045,.07,.09+k*.05),MASONRY_DEEP)
 solid(.27,.10,[(-.05,.05),(.07,.05)],MASONRY,8);solid(.27,.10,[(.07,.036),(.073,.036)],RECESS,8)
 for s in (-1,1):tube([(.27+s*.05,.10,.0),(.27+s*.05,.10,.17)],[.008,.008],TIMBER,4)
 box(.205,.335,.085,.115,.17,.185,TIMBER)
 for x,y in ((-.30,.06),(-.33,.01),(-.27,.01)):barrel(x,y,-.02,.028,.09)
 box(-.33,-.26,-.12,-.05,-.02,.06,TIMBER)
 export('ns-citadel')

def stone(x,y,z,h,cap=True):
 """A standing stone with a gilt cap."""
 solid(x,y,[(z,.05,.036),(z+h*.5,.044,.03),(z+h,.034,.024)],MARBLE,4)
 if cap:solid(x,y,[(z+h,.04,.03),(z+h+.05,.002,.002)],GILT,4)

def holy_site():
 reset()
 # A round court on three low steps.
 solid(0,0,[(FOOT,.64,.57),(GROUND,.64,.57)],PLINTH,12)
 solid(0,0,[(GROUND,.57,.505),(.055,.57,.505)],MARBLE,12)
 solid(0,0,[(.055,.47,.41),(.075,.47,.41)],PAVE,12)
 floor=.075;ring=.055
 box(-.13,.13,-.50,-.40,ring,ring+.004,PAVE)
 # The sanctuary at the back: three steps, the altar and its flame, a canopy on four columns, and the spire.
 cy=.30
 box(-.25,.25,cy-.15,cy+.15,GROUND,.125,PLINTH,.008)
 box(-.20,.20,cy-.115,cy+.115,.125,.165,MARBLE,.006)
 stairs(0,cy-.115,.16,floor,.165,3,.03,PAVE)
 box(-.05,.05,cy-.035,cy+.035,.165,.225,PLINTH);box(-.06,.06,cy-.045,cy+.045,.225,.238,MARBLE)
 flame(0,cy,.238,.10,.03)
 for sx in (-1,1):
  for sy in (-1,1):
   x,y=sx*.155,cy+sy*.075
   box(x-.026,x+.026,y-.026,y+.026,.165,.185,PAVE);tube([(x,y,.185),(x,y,.40)],[.019,.016],MARBLE,6)
 box(-.205,.205,cy-.125,cy+.125,.40,.43,MARBLE,.006);box(-.215,.215,cy-.135,cy+.135,.43,.445,PAVE)
 solid(0,cy,[(.445,.17,.10),(.50,.11,.07),(.56,.06,.045),(.82,.012,.012)],LAPIS,4)
 solid(0,cy,[(.535,.085,.062),(.552,.08,.058)],GILT,4)
 solid(0,cy,[(.82,.022),(.89,.001)],GILT,4)
 # A domed chapel on each side of it.
 for s in (-1,1):
  x,y=s*.37,.25
  solid(x,y,[(GROUND,.085),(.22,.085)],WALL,8);solid(x,y,[(.22,.097),(.238,.097)],MARBLE,8)
  solid(x,y,[(.238,.08),(.275,.068),(.305,.04),(.318,.008)],LAPIS,8)
  leaf((x,y,.33),(.016,.016,.016),GILT)
  south(x,y-.085,ring,.17,.05)
 # The ring of standing stones, and a stone gate at the front: two tall stones under one beam.
 ringed=((190,.30),(212,.34),(236,.29),(304,.31),(328,.35),(350,.29))
 for deg,h in ringed:
  a=math.radians(deg);stone(math.cos(a)*.52,math.sin(a)*.455,ring,h)
 # A low rail joins each stone to the next, with a gap at the gate.
 for (d0,_),(d1,_) in ((ringed[0],ringed[1]),(ringed[1],ringed[2]),(ringed[3],ringed[4]),(ringed[4],ringed[5])):
  a0,a1=math.radians(d0),math.radians(d1);x0,y0,x1,y1=math.cos(a0)*.52,math.sin(a0)*.455,math.cos(a1)*.52,math.sin(a1)*.455
  turned(((x0+x1)/2,(y0+y1)/2,ring+.05),(math.hypot(x1-x0,y1-y0)-.07,.022,.02),PAVE,math.atan2(y1-y0,x1-x0))
  turned(((x0+x1)/2,(y0+y1)/2,ring+.02),(.03,.03,.04),MARBLE,math.atan2(y1-y0,x1-x0))
 for s in (-1,1):solid(s*.17,-.445,[(ring,.042,.036),(.37,.034,.03)],MARBLE,4)
 box(-.225,.225,-.48,-.41,.37,.415,MARBLE,.006);box(-.05,.05,-.487,-.403,.378,.407,GILT)
 # The pool in the middle, with a gilt bowl on a stem.
 solid(0,-.10,[(floor,.21),(floor+.004,.21)],LAPIS,10);solid(0,-.10,[(floor,.185),(floor+.007,.185)],PAVE,10)
 for k in range(4):
  a=math.pi/4+k*math.pi/2;solid(math.cos(a)*.235,-.10+math.sin(a)*.235,[(floor,.022),(.12,.016),(.135,.026)],MARBLE,5);flame(math.cos(a)*.235,-.10+math.sin(a)*.235,.135,.05,.018)
 solid(0,-.10,[(floor,.14),(.105,.13)],MARBLE,10);solid(0,-.10,[(.105,.105),(.108,.105)],WATER,10)
 solid(0,-.10,[(.105,.02),(.16,.014),(.175,.04)],MARBLE,6);solid(0,-.10,[(.175,.04),(.19,.05)],GILT,6)
 # Braziers at the gate, a banner on each side of the sanctuary, and two cypresses behind the chapels.
 for s in (-1,1):
  brazier(s*.29,-.36,ring,.12,MARBLE)
  banner(s*.29,.36,GROUND,.50,LAPIS,s*.07,.11)
  cypress(s*.50,.10,GROUND,.22,.036)
 export('ns-holy-site')

academy();landmark();manufactory();customs_house();citadel();holy_site()
