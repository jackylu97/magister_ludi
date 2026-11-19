"""Houses and works for the north-star look; run via build_settlement_assets.py -- --northstar-only.

The visual test of 2026-11-12 (docs/flags.md (nnnnnnn), "Towns and works in the
test scene") asks for new houses, mines, quarries and farms in the style of the
round trees and the monuments: simple, full shapes, matte colour, few details,
readable at play zoom. These files sit beside the study's kit and replace
nothing: `visualTest.northStar` in data/view3d.json picks which set is drawn.

- ns-house-1a/1b/1c: the first age. Mud walls under thick straw roofs.
- ns-house-2a/2b/2c: the middle ages. Pale walls under terracotta roofs.
- ns-house-3a/3b/3c: the late ages. Taller houses, a turret, an arcade.
- ns-hall: the town's hall, a broad roof with one square tower.
- ns-great-hut, ns-great-house: the centre of a town of the first age and of
  the middle ages, in the materials of that age's houses.
- ns-house-3d/3e/3f, ns-hall-3: the richer houses and hall of the late ages.
- ns-mine: a dark tunnel mouth with a timber frame in a round rock.
- ns-quarry: a stepped stone face and a treadwheel crane.
- ns-barn, ns-haystack: the farm's building and its stacks.
- ns-granary, ns-rack, ns-thatch-barn: the farm before the barn. A small store
  on legs and a drying rack in the first age, a low straw barn in the second.
- ns-mine-pit, ns-mine-winch: the mine before the pithead.
- ns-quarry-cut, ns-quarry-frame: the quarry before the crane.
- ns-shelter, ns-stable: the pasture's straw shed, and the stable that follows it.
- ns-lumber-camp: a trestle saw and a roofed timber shelter.
- ns-loft-barn, ns-mine-headframe, ns-saw-hall: a raised grain loft, a mine
  hoist and a roofed frame saw for the fourth age.
- ns-windmill, ns-windmill-sails: a tower mill for some farms. The sails are a
  separate model, flat in the X-Z plane round the origin, so the renderer can
  turn them about their hub (`visualTest.works.windmillHub`).

A door faces -Y here, which is toward the camera on the board.
The mine and the quarry reach below the ground line, so they can sit into a
hill with no plinth.
"""

# Wider chamfers (2026-11-12): the reference games' models catch a thin light
# on every edge. A chamfer is never more than three tenths of a block's
# thinnest side, so small pieces keep their shape.
_plain_block=block
BEVEL_SCALE=2.4
def block(p,s,m=CREAM,bevel=.015):
 return _plain_block(p,s,m,min(bevel*BEVEL_SCALE,min(s)*.3) if bevel else 0)

WALL=pigment('NS pale wall','f0e5c9')
MUD=pigment('NS mud wall','dcc091')
STONE=pigment('NS footing stone','c4b99d')
TILE=pigment('NS terracotta','cb6a43')
TILE_DEEP=pigment('NS deep tile','ad4d33')
STRAW=pigment('NS straw','ecbc4f')
STRAW_DEEP=pigment('NS old straw','cf9a3c')
TIMBER=pigment('NS timber','7c5b3d')
DOOR=pigment('NS door','6b4d37')
SLATE=pigment('NS slate','6e8793')
GILT_NS=pigment('NS gilt','e2b443')
ROCK=pigment('NS mine rock','9d9788')
ROCK_LIGHT=pigment('NS mine rock top','b9b19e')
PIT=pigment('NS tunnel dark','2f2a28')
CUT=pigment('NS cut stone','e6d9b8')
CUT_SHADE=pigment('NS cut stone face','cdbf9c')
ORE=pigment('NS ore','d0a24a')

def gable(x,y,z,w,d,h,m,along='x'):
 """A solid pitched roof. `along` is the direction of the ridge."""
 if along=='x':
  v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x-w/2,y,z+h),(x+w/2,y,z+h)]
  f=[(0,1,5,4),(2,3,4,5),(1,2,5),(3,0,4),(3,2,1,0)]
 else:
  v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x,y-d/2,z+h),(x,y+d/2,z+h)]
  f=[(1,2,5,4),(3,0,4,5),(0,1,4),(2,3,5),(3,2,1,0)]
 return mesh('NS gable',v,f,m)

def hip(x,y,z,w,d,h,m,ridge=.35):
 """A hipped roof. `ridge` is the ridge length as a share of the long side; 0 gives a pyramid."""
 rx=w*ridge/2 if w>=d else 0;ry=d*ridge/2 if d>w else 0
 v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x-rx,y-ry,z+h),(x+rx,y-ry,z+h),(x+rx,y+ry,z+h),(x-rx,y+ry,z+h)]
 return mesh('NS hip',v,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7),(3,2,1,0)],m)

def cone(x,y,z,r,h,m,n=10,top=.0):
 v=[(x+math.cos(i*math.tau/n)*r,y+math.sin(i*math.tau/n)*r,z) for i in range(n)]+[(x,y,z+h)]
 return mesh('NS cone',v,[(i,(i+1)%n,n) for i in range(n)]+[tuple(reversed(range(n)))],m)

def eaves(x,y,z,w,d,m,t=.035):
 """The thick lower edge of a roof. It makes the roof read as one heavy slab."""
 return block((x,y,z+t/2),(w,d,t),m,.008)

def door(x,y,w=.085,h=.15):block((x,y,h/2),(w,.02,h),DOOR,.004)
def window(x,y,z,w=.055,h=.07):block((x,y,z),(w,.014,h),DOOR,.003)

def rock(p,s,m,seed,sub=2,jitter=.10):
 """A faceted boulder: a sphere with its points pushed in and out a little."""
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=p);o=bpy.context.object;rng=random.Random(seed)
 for v in o.data.vertices:v.co*=rng.uniform(1-jitter,1+jitter)
 o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(m);return o

# --- Age one: mud and straw -------------------------------------------------
def house_1a():
 # A round hut under one tall straw cone.
 cylinder((0,0,.13),.185,.26,MUD,10)
 cone(0,0,.22,.275,.085,STRAW_DEEP,10);cone(0,0,.25,.25,.40,STRAW,10)
 door(0,-.185,.085,.16)
def house_1b():
 block((0,0,.13),(.40,.31,.26),MUD,.018)
 eaves(0,0,.24,.50,.41,STRAW_DEEP);gable(0,0,.275,.47,.38,.32,STRAW)
 door(-.06,-.156)
def house_1c():
 # A long house with a small store against one end.
 block((-.05,0,.125),(.46,.27,.25),MUD,.018)
 eaves(-.05,0,.23,.55,.36,STRAW_DEEP);hip(-.05,0,.265,.52,.33,.28,STRAW,.5)
 block((.25,.02,.08),(.17,.20,.16),MUD,.014);hip(.25,.02,.15,.22,.25,.14,STRAW_DEEP,0)
 door(-.10,-.136)

# --- The middle ages: pale walls, terracotta ---------------------------------
def house_2a():
 block((0,0,.025),(.45,.38,.05),STONE,.01);block((0,0,.16),(.41,.34,.28),WALL,.018)
 eaves(0,0,.28,.49,.42,TILE_DEEP);gable(0,0,.315,.46,.39,.21,TILE)
 block((.12,.07,.47),(.07,.07,.16),WALL,.008)
 door(-.08,-.171);window(.09,-.171,.17)
def house_2b():
 # Two wings at a right angle, each with its own ridge.
 block((0,.04,.025),(.50,.30,.05),STONE,.01);block((0,.04,.15),(.46,.26,.26),WALL,.018)
 eaves(0,.04,.26,.53,.33,TILE_DEEP);gable(0,.04,.295,.50,.30,.18,TILE)
 block((.11,-.12,.13),(.22,.22,.22),WALL,.016)
 eaves(.11,-.13,.22,.28,.26,TILE_DEEP);gable(.11,-.13,.255,.25,.24,.15,TILE,'y')
 door(.11,-.231,.08,.13);window(-.13,-.091,.16)
def house_2c():
 # A tall narrow house with a pointed roof.
 block((0,0,.025),(.34,.34,.05),STONE,.01);block((0,0,.24),(.30,.30,.44),WALL,.018)
 eaves(0,0,.44,.38,.38,TILE_DEEP);hip(0,0,.475,.36,.36,.25,TILE_DEEP,0)
 door(0,-.151);window(-.07,-.151,.31);window(.07,-.151,.31)

# --- The late ages: taller, with a turret or an arcade ------------------------
def house_3a():
 block((0,0,.025),(.40,.36,.05),STONE,.01);block((0,0,.28),(.36,.32,.52),WALL,.018)
 eaves(0,0,.52,.42,.40,TILE_DEEP);gable(0,0,.555,.40,.38,.30,TILE,'y')
 block((-.11,.08,.74),(.07,.07,.18),WALL,.008)
 door(0,-.161,.09,.16)
 for x in [-.09,.09]:window(x,-.161,.36)
 window(0,-.191,.66,.06,.08)
def house_3b():
 # A broad house with a round turret at one corner.
 block((0,0,.025),(.50,.38,.05),STONE,.01);block((-.03,0,.20),(.42,.34,.36),WALL,.018)
 eaves(-.03,0,.36,.50,.42,TILE_DEEP);hip(-.03,0,.395,.47,.39,.20,TILE,.4)
 cylinder((.20,-.12,.32),.105,.64,WALL,10)
 cone(.20,-.12,.62,.15,.05,SLATE,10);cone(.20,-.12,.65,.135,.27,SLATE,10)
 door(-.10,-.171);window(.20,-.226,.44,.045,.08)
def house_3c():
 # A long hall with three dark arches along its front.
 block((0,0,.025),(.60,.36,.05),STONE,.01);block((0,0,.20),(.56,.32,.36),WALL,.018)
 eaves(0,0,.36,.64,.40,TILE_DEEP);hip(0,0,.395,.61,.37,.20,TILE,.55)
 for x in [-.17,0,.17]:
  block((x,-.161,.11),(.10,.02,.16),DOOR,.004)
  arc=cylinder((0,0,0),.05,.02,DOOR,10);arc.rotation_euler[0]=math.pi/2;arc.location=(x,-.161,.19)

def hall():
 # The town's hall: one broad roof and one square tower with a gilded cap.
 for i,(w,d) in enumerate([(.86,.62),(.78,.54)]):block((0,0,.02+i*.04),(w,d,.04),STONE,.008)
 block((0,.02,.26),(.70,.44,.36),WALL,.02)
 eaves(0,.02,.42,.78,.52,TILE_DEEP,.04);hip(0,.02,.46,.75,.49,.24,TILE,.5)
 block((0,-.10,.42),(.25,.25,.72),WALL,.016)
 block((0,-.10,.79),(.30,.30,.04),STONE,.008)
 hip(0,-.10,.81,.28,.28,.24,SLATE,0)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.04,location=(0,-.10,1.07));bpy.context.object.data.materials.append(GILT_NS)
 block((0,-.226,.19),(.12,.02,.22),DOOR,.004)
 arc=cylinder((0,0,0),.06,.02,DOOR,10);arc.rotation_euler[0]=math.pi/2;arc.location=(0,-.226,.30)
 disc=cylinder((0,0,0),.05,.012,GILT_NS,12);disc.rotation_euler[0]=math.pi/2;disc.location=(0,-.228,.60)
 for x in [-.24,.24]:window(x,-.201,.28,.06,.10)

# --- Works -------------------------------------------------------------------
COPPER_WORK=pigment('Work copper','518982')
BRASS_WORK=pigment('Work bronze','bf8b47')
OCHRE_WORK=pigment('Work fired earth','bd7550')
INK_WORK=pigment('Work deep shade','354447')
CLAY_WORK=pigment('Work sunlit clay','e0a174')

def work_profile(x,y,levels,m,sides=8):
 """Widths measure to a flat face, so four sides give a square footing."""
 verts=[];faces=[]
 for z,rx,ry in levels:
  for i in range(sides):
   a=(i+.5)*math.tau/sides
   verts.append((x+rx*math.cos(a)/math.cos(math.pi/sides),y+ry*math.sin(a)/math.cos(math.pi/sides),z))
 for level in range(len(levels)-1):
  for i in range(sides):
   a=level*sides+i;b=level*sides+(i+1)%sides
   faces.append((a,b,b+sides,a+sides))
 faces.extend([tuple(reversed(range(sides))),tuple(range(len(verts)-sides,len(verts)))])
 return mesh('Work profile',verts,faces,m)

def work_panel(outline,front,back,m):
 """A panel cut to shape in the plane facing the board camera."""
 n=len(outline)
 verts=[(x,y,z) for y in [front,back] for x,z in outline]
 faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
 faces.extend((i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n))
 return mesh('Cut panel',verts,faces,m)

def work_arcade(x,y,width,spring,peak,top,depth,m):
 """A plaster wall with a pointed opening cut all the way through it."""
 half=width/2;opening=width*.36
 profile=[(-half,0),(-opening,0),(-opening,spring),(-opening*.68,spring+(peak-spring)*.57),
          (0,peak),(opening*.68,spring+(peak-spring)*.57),(opening,spring),
          (opening,0),(half,0),(half,top),(-half,top)]
 return work_panel([(x+dx,z) for dx,z in profile],y-depth/2,y+depth/2,m)

def hoist_wheel(x,y,z,r,depth,m,arms=3):
 """The open rim and its spokes show where the hoist rope winds."""
 verts=[];faces=[];n=12
 for yy,rr in [(y-depth/2,r),(y-depth/2,r*.77),(y+depth/2,r*.77),(y+depth/2,r)]:
  for i in range(n):
   a=i*math.tau/n
   verts.append((x+rr*math.cos(a),yy,z+rr*math.sin(a)))
 for j in range(4):
  for i in range(n):
   k=(i+1)%n;jj=(j+1)%4
   faces.append((j*n+i,j*n+k,jj*n+k,jj*n+i))
 mesh('Hoist rim',verts,faces,m)
 for i in range(arms):
  a=(i+.18)*math.pi/arms;dx=r*.84*math.cos(a);dz=r*.84*math.sin(a)
  tube([(x-dx,y,z-dz),(x+dx,y,z+dz)],[r*.085,r*.085],TIMBER,4)
 tube([(x,y-depth*.74,z),(x,y+depth*.74,z)],[r*.18,r*.18],BRASS_WORK,8)

def mine():
 # One round rock, darker than the land, with a black mouth in a timber frame.
 # A low rock floor carries the rock and the cart, and reaches below the ground line.
 tube([(0,0,-.30),(0,0,-.03),(0,0,.012)],[.68,.64,.58],ROCK_LIGHT,10)
 rock((0,.08,.10),(.46,.40,.42),ROCK,3)
 rock((-.30,.10,.02),(.26,.26,.24),ROCK,5)
 rock((.31,.12,.0),(.25,.25,.22),ROCK,7)
 rock((.02,.12,.36),(.27,.25,.19),ROCK_LIGHT,9)
 # The mouth: a dark recess pushed into the rock, framed by three heavy timbers.
 block((0,-.26,.12),(.24,.20,.30),PIT,0)
 for x in [-.15,.15]:block((x,-.37,.14),(.07,.07,.34),TIMBER,.008)
 block((0,-.37,.33),(.44,.085,.075),TIMBER,.008)
 # A cart of ore on the way out.
 block((.02,-.52,.075),(.15,.11,.08),TIMBER,.008)
 rock((.02,-.52,.125),(.065,.05,.04),ORE,11,1)
 for x in [-.035,.075]:
  wheel=cylinder((0,0,0),.03,.13,PIT,8);wheel.rotation_euler[0]=math.pi/2;wheel.location=(x,-.52,.03)

def quarry_benches(floor,ledge,upper=0):
 # A continuous face for each cut keeps the corner clean at low camera angles.
 def bench(plan,base,top,m):
  n=len(plan);verts=[(x,y,z) for z in [base,top] for x,y in plan]
  faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
  faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
  return mesh('Stone bench',verts,faces,m)
 base=[(-.42,-.24),(-.35,-.31),(.35,-.31),(.427,-.21),(.427,.25),(.33,.38),(-.33,.38),(-.42,.27)]
 bench(base,-.24,floor,CUT_SHADE)
 bench([(-.42,-.24),(-.35,-.31),(-.22,-.31),(-.22,.065),(-.09,.065),(-.09,.159),
        (.427,.159),(.427,.25),(.33,.38),(-.33,.38),(-.42,.27)],floor,ledge,CUT)
 if upper:
  bench([(-.42,-.04),(-.314,-.04),(-.314,.233),(.144,.233),(.144,.38),(-.33,.38),(-.42,.27)],
        ledge,upper,CUT_SHADE)

def quarry():
 quarry_benches(.14,.29,.417)
 # Loose blocks waiting on the floor.
 block((.12,-.10,.19),(.17,.13,.10),CUT,.008);block((.27,.02,.18),(.12,.12,.08),CUT,.008)
 block((.16,-.08,.285),(.11,.10,.09),CUT,.008)
 # A treadwheel raises stone on a jib. Its open rim stands clear of the pale cut face.
 work_profile(.24,-.07,[(.14,.12,.11),(.18,.12,.11),(.47,.061,.057)],CLAY_WORK,4)
 block((.24,-.07,.47),(.19,.16,.035),CUT,0)
 hoist_wheel(.24,-.17,.39,.147,.073,TIMBER,4)
 pole((.24,-.06,.46),(.24,-.06,.62),.027)
 pole((.31,-.06,.52),(-.17,-.19,.68),.029,TIMBER,4)
 pole((.24,-.06,.40),(-.12,-.175,.665),.018)
 for x,z in [(.24,.62),(-.16,.676)]:
  yy=-.06 if x>0 else -.19
  tube([(x,yy-.026,z),(x,yy+.026,z)],[.030,.030],BRASS_WORK,8)
 pole((-.16,-.19,.67),(-.16,-.19,.40),.008,INK_WORK)
 for dx in [-.056,.056]:pole((-.16,-.19,.409),(-.16+dx,-.19,.338),.007,INK_WORK)
 block((-.16,-.19,.302),(.15,.105,.075),CUT,.004)

def barn():
 # Tall loading doors and a covered side bay leave the outline of a working barn.
 block((-.055,.124,.131),(.358,.05,.262),MUD,0)
 for x in [-.221,.111]:block((x,0,.13),(.033,.284,.26),WALL,0)
 work_arcade(-.055,-.137,.36,.161,.229,.271,.041,WALL)
 work_panel([(-.254,.267),(-.055,.48),(.144,.267)],-.166,.166,CLAY_WORK)
 work_panel([(-.277,.259),(-.055,.494),(.165,.259),(.151,.253),(-.055,.466),(-.26,.253)],-.187,.187,TILE)
 # The half-open leaves give the loading bay depth when it faces the camera.
 block((-.055,.077,.108),(.245,.018,.211),INK_WORK,0)
 for side in [-1,1]:
  leaf=block((-.055+side*.096,-.108,.087),(.089,.014,.174),TIMBER,0)
  leaf.rotation_euler.z=side*math.pi*.22
 block((-.055,-.165,.255),(.274,.034,.027),TIMBER,0)
 block((-.055,-.168,.349),(.078,.02,.092),TIMBER,0)
 block((-.055,-.208,.407),(.031,.105,.034),TIMBER,0)
 for y in [-.122,.122]:
  block((.235,y,.099),(.029,.035,.198),TIMBER,0)
 work_panel([(.09,.279),(.268,.204),(.268,.181),(.09,.252)],-.15,.15,TILE_DEEP)

def loft_barn():
 # Grain dries in the vented tower above a long, low loading gallery.
 work_profile(-.151,.015,[(0,.122,.14),(.29,.114,.125),(.315,.127,.137)],CLAY_WORK,4)
 block((-.151,.015,.369),(.19,.207,.11),INK_WORK,0)
 for dx in [-.089,.089]:
  for dy in [-.093,.093]:
   block((-.151+dx,.015+dy,.37),(.024,.024,.11),CUT,0)
 work_profile(-.151,.015,[(.417,.134,.148),(.44,.134,.148),(.523,.044,.063)],COPPER_WORK,4)
 block((.097,.115,.109),(.31,.085,.218),MUD,0)
 for x in [-.011,.100,.211]:work_arcade(x,-.11,.111,.094,.158,.198,.055,CUT)
 eaves(.096,.008,.198,.36,.298,TILE_DEEP,.02)
 hip(.096,.008,.217,.352,.292,.113,TILE,.54)
 block((-.151,-.127,.13),(.103,.025,.225),TIMBER,0)
def haystack():
 rock((0,0,.05),(.12,.12,.13),STRAW,21,1,.06)
 cone(0,0,.13,.085,.08,STRAW_DEEP,8)

CANVAS=pigment('NS sail canvas','f6edd6')
def windmill():
 # The cap and bearing sit on an octagonal service gallery. The sails turn at (0,-.165,.50).
 work_profile(0,0,[(0,.158,.151),(.037,.158,.151),(.055,.137,.132)],STONE)
 work_profile(0,0,[(.036,.135,.133),(.247,.113,.112),(.282,.12,.118),(.436,.088,.090)],WALL)
 work_profile(0,0,[(.24,.116,.115),(.266,.145,.142),(.284,.145,.142)],OCHRE_WORK)
 for x in [-.082,.082]:
  work_panel([(x-.026,.035),(x+.026,.035),(x+.013,.177),(x-.013,.177)],-.112,-.073,CLAY_WORK)
 work_profile(0,0,[(.424,.09,.093),(.447,.133,.134),(.473,.133,.134)],TIMBER)
 work_profile(0,0,[(.47,.132,.132),(.51,.129,.129),(.567,.081,.081),(.602,.039,.039),(.636,.020,.020)],COPPER_WORK)
 block((0,-.128,.097),(.063,.022,.122),INK_WORK,0)
 block((0,-.104,.344),(.032,.016,.066),INK_WORK,0)
 tube([(0,-.072,.50),(0,-.164,.50)],[.036,.027],BRASS_WORK,8)
def windmill_sails():
 tube([(0,-.023,0),(0,.021,0)],[.034,.034],BRASS_WORK,10)
 for i in range(4):
  angle=i*math.pi/2
  def blade(points,front,back,m):
   outline=[(x*math.cos(angle)+z*math.sin(angle),z*math.cos(angle)-x*math.sin(angle)) for x,z in points]
   return work_panel(outline,front,back,m)
  blade([(-.010,.016),(.010,.016),(.007,.345),(-.007,.345)],-.009,.009,TIMBER)
  blade([(.006,.087),(.066,.108),(.112,.277),(.104,.312),(.006,.339)],-.004,.005,CANVAS)
  blade([(.006,.248),(.102,.242),(.108,.257),(.006,.265)],-.006,-.004,OCHRE_WORK)

# Scenery for rich hexes (docs/flags.md (nnnnnnn), "Yields on the board"):
# what a hex shows as its food, production or gold rises.
AWNING=pigment('NS awning red','c8553d')
def sheaf():
 # A bound sheaf flares above the tie and spreads at the ground.
 for x,y,s in [(-.055,.021,1.0),(.053,.03,.92),(0,-.048,.78)]:
  work_profile(x,y,[(0,.057*s,.045*s),(.095*s,.020*s,.019*s),(.153*s,.042*s,.031*s),
                    (.187*s,.017*s,.012*s)],STRAW,6)
  cylinder((x,y,.096*s),.024*s,.017*s,TIMBER,6)
def logs():
 # A stack of three logs and a cut block of stone.
 for y,z in [(-.045,.04),(.045,.04),(0,.115)]:
  tube([(-.15,y,z),(.15,y,z)],[.04,.04],TIMBER,7)
  for x in [-.151,.151]:tube([(x-.002,y,z),(x+.002,y,z)],[.03,.03],STRAW,7)
 block((.24,0,.05),(.11,.13,.10),CUT,.012)
def stall():
 # A market stall: a counter with goods under a striped awning.
 block((0,0,.06),(.26,.14,.12),TIMBER,.01)
 for x in [-.08,0,.08]:block((x,-.01,.135),(.05,.06,.03),GILT_NS,.006)
 for x in [-.125,.125]:
  for y in [-.07,.07]:block((x,y,.15),(.016,.016,.30),TIMBER,.003)
 for i in range(5):block((-.12+i*.06,0,.31),(.06,.20,.022),AWNING if i%2==0 else WALL,.004)

# --- Works of the earlier ages ------------------------------------------------
# A work follows the age of its owner, as a town does (the user, 2026-11-16:
# "the windmills feel out of place with the huts representing the city"). These
# are the earlier steps. `NORTH_STAR_WORK_AGES` in
# src/terrainStudy/northStarAssets.js says which model each age draws.
BLADE=pigment('NS saw blade','aab4b8')
def pole(a,b,r=.014,m=None,n=5):return tube([a,b],[r,r*.85],m or TIMBER,n)
def basket(x,y,z,load,seed):
 tube([(x,y,z),(x,y,z+.065)],[.032,.044],STRAW_DEEP,7);rock((x,y,z+.066),(.034,.034,.02),load,seed,1)

def granary():
 # A raised clay bin keeps grain dry. A second skin of thatch covers its round shoulder.
 for x,y in [(-.07,-.07),(.07,-.07),(.07,.07),(-.07,.07)]:block((x,y,.04),(.032,.032,.08),TIMBER,.004)
 cylinder((0,0,.092),.135,.03,TIMBER,8)
 work_profile(0,0,[(.103,.094,.091),(.147,.124,.116),(.234,.121,.112),(.266,.093,.088)],CLAY_WORK)
 work_profile(0,0,[(.228,.152,.144),(.25,.158,.148),(.304,.110,.104)],STRAW_DEEP)
 work_profile(0,0,[(.286,.133,.127),(.335,.104,.097),(.409,.035,.035),(.446,.014,.014)],STRAW)
 block((0,-.112,.175),(.05,.02,.075),DOOR,.003)
 pole((-.03,-.20,0),(-.03,-.115,.11),.009);pole((.03,-.20,0),(.03,-.115,.11),.009)
 for i in range(1,4):
  y=-.20+.021*i;z=.027*i
  pole((-.034,y,z),(.034,y,z),.008)
def rack():
 # A drying rack: two pairs of crossed poles, a rail, and bundles of grain hung over it.
 for x in [-.17,.17]:
  pole((x,-.07,0),(x,.02,.25));pole((x,.07,0),(x,-.02,.25))
 pole((-.21,0,.218),(.21,0,.218),.012)
 for i in range(4):
  x=-.126+i*.083;m=STRAW if i%2==0 else STRAW_DEEP
  work_profile(x,0,[(.062,.036,.039),(.137,.020,.04),(.205,.034,.052),(.23,.019,.023)],m,6)
  work_profile(x,0,[(.13,.023,.042),(.143,.023,.042)],TIMBER,6)
def thatch_barn():
 # A raised ridge ventilates the threshing floor. The shaded loading bay stays open.
 work_profile(0,.028,[(0,.25,.128),(.175,.226,.116)],MUD,4)
 for x in [-.219,-.09,.09,.219]:
  block((x,-.157,.089),(.028,.031,.178),TIMBER,0)
 work_profile(0,0,[(.162,.293,.192),(.189,.298,.196),(.293,.202,.067)],STRAW_DEEP,4)
 work_profile(0,0,[(.190,.288,.19),(.288,.199,.067)],STRAW,4)
 block((-.018,0,.305),(.324,.086,.063),TIMBER,0)
 hip(-.018,0,.325,.394,.163,.092,STRAW,.60)
 block((-.035,-.095,.096),(.137,.017,.168),INK_WORK,0)

def mine_pit():
 # The mine of the first age: a hole dug into an outcrop, propped with three logs, and baskets of ore.
 rock((0,.11,.07),(.25,.20,.18),ROCK,31)
 rock((-.19,.13,.03),(.13,.13,.10),ROCK_LIGHT,33,1);rock((.19,.14,.02),(.12,.12,.09),ROCK,35,1)
 block((0,-.06,.075),(.14,.12,.15),PIT,0)
 for x in [-.089,.089]:
  work_profile(x,-.104,[(0,.027,.046),(.181,.018,.035)],OCHRE_WORK,4)
  pole((x*1.5,-.146,0),(x,-.113,.149),.014)
 work_panel([(-.144,.164),(.143,.164),(.121,.202),(-.086,.212)],-.153,-.063,CUT_SHADE)
 basket(.20,-.15,0,ORE,37);basket(.27,-.05,0,ORE,38)
 rock((-.20,-.13,.0),(.085,.075,.05),ROCK_LIGHT,39,1)
def mine_winch():
 # The mine of the second age: a square shaft with a timber curb, and a windlass over it.
 rock((-.04,.19,.05),(.24,.12,.13),ROCK,41,1);rock((.20,.17,.02),(.10,.10,.08),ROCK_LIGHT,43,1)
 block((0,-.02,.03),(.27,.27,.06),TIMBER,.008);block((0,-.02,.061),(.19,.19,.006),PIT,0)
 for y in [-.141,.109]:
  for side in [-1,1]:
   pole((side*.152,y,.011),(side*.015,y,.295),.020)
 tube([(0,-.186,.285),(0,.139,.285)],[.027,.027],TIMBER,8)
 tube([(0,-.071,.285),(0,.049,.285)],[.047,.047],STRAW_DEEP,8)
 hoist_wheel(0,-.17,.285,.089,.028,BRASS_WORK)
 tube([(0,-.02,.28),(0,-.02,.13)],[.006,.006],PIT,4)
 tube([(0,-.02,.07),(0,-.02,.13)],[.032,.042],TIMBER,7)
 block((-.24,-.17,.045),(.15,.11,.07),TIMBER,.008);rock((-.24,-.17,.09),(.06,.045,.03),ORE,45,1)
 basket(.24,-.18,0,ORE,47)

def mine_headframe():
 # The lifting cage rises between battered piers. An overhead sheave leads its rope back to the winding drum.
 work_profile(0,0,[(0,.268,.191),(.039,.268,.191)],ROCK_LIGHT,4)
 block((0,-.028,.042),(.221,.225,.009),PIT,0)
 for x in [-.158,.158]:
  work_profile(x,.036,[(.026,.079,.155),(.09,.065,.124),(.397,.042,.059),(.445,.055,.069)],CLAY_WORK,4)
  block((x,.036,.456),(.129,.155,.026),CUT,0)
  pole((x,.168,.043),(x,.045,.429),.021,TIMBER,4)
 block((0,.027,.469),(.423,.127,.034),TIMBER,0)
 work_panel([(.045,.484),(.12,.484),(.10,.556),(.069,.556)],-.017,.045,TIMBER)
 hoist_wheel(.081,-.038,.548,.082,.043,BRASS_WORK,4)
 pole((0,-.048,.548),(0,-.048,.269),.008,INK_WORK)
 for x in [-.061,.061]:pole((0,-.048,.269),(x,-.047,.22),.006,INK_WORK)
 block((0,-.042,.118),(.146,.107,.066),TIMBER,.003)
 for x in [-.061,.061]:pole((x,-.082,.124),(x,-.082,.217),.007)
 block((0,-.042,.215),(.142,.106,.019),BRASS_WORK,0)
 pole((.162,-.028,.548),(.106,.19,.14),.007,INK_WORK)
 tube([(-.111,.182,.13),(.111,.182,.13)],[.044,.044],TIMBER,8)
 for x in [-.062,.062]:pole((x,-.299,.039),(x,-.119,.052),.009)
 block((.186,-.231,.045),(.111,.086,.055),TIMBER,.003)
 rock((.186,-.231,.079),(.045,.033,.025),ORE,71,1)

def quarry_cut():
 # The quarry of the first age: a low face cut by hand, rough stone left above it, and a block on log rollers.
 quarry_benches(.10,.21)
 rock((.24,.30,.25),(.15,.09,.09),CUT_SHADE,51,1);rock((-.30,.28,.24),(.11,.10,.09),CUT_SHADE,53,1)
 for x in [.04,.13,.22]:tube([(x,-.22,.12),(x,-.02,.12)],[.02,.02],TIMBER,6)
 block((.13,-.12,.19),(.22,.15,.10),CUT,.010)
 block((-.10,-.02,.135),(.11,.10,.07),CUT,.008);block((-.12,.12,.255),(.10,.09,.07),CUT,.008)
 pole((.30,-.26,.10),(.20,-.06,.20),.012)
def quarry_frame():
 # The quarry of the second age: deeper steps, and two poles tied at the top to lift a block.
 quarry_benches(.12,.257,.352)
 block((.26,.04,.16),(.13,.12,.08),CUT,.008);block((-.02,.08,.16),(.12,.11,.08),CUT,.008)
 top=(.14,-.16,.60)
 for x,y in [(-.04,-.26),(.34,-.06),(.32,-.27)]:
  work_profile(x,y,[(.12,.043,.038),(.162,.032,.031)],CUT,4)
  pole((x,y,.135),top,.022,TIMBER,6)
 hoist_wheel(.14,-.177,.55,.044,.028,BRASS_WORK,2)
 tube([(.137,-.18,.53),(.137,-.18,.33)],[.008,.008],PIT,4)
 block((.14,-.16,.28),(.11,.10,.09),CUT,.006)

def straw_shed(x,y,w,d,h):
 """Unequal rafters leave a high sheltered end where an animal or a cut log can fit."""
 for yy in [y-d*.37,y+d*.37]:
  pole((x-w*.40,yy,.004),(x-w*.125,yy,.129+h*.73),.017)
  pole((x+w*.38,yy,.004),(x+w*.27,yy,.162),.017)
 block((x,y+d*.36,.076),(w*.74,.029,.15),MUD,0)
 for edge,inner,m in [
  ([(-.52,.088),(-.16,.128+h),(.53,.135)],[(-.51,.064),(-.16,.098+h),(.52,.11)],STRAW_DEEP),
  ([(-.49,.115),(-.16,.146+h),(.49,.153)],[(-.49,.09),(-.16,.117+h),(.49,.127)],STRAW)]:
  outline=[(x+dx*w,z) for dx,z in edge+list(reversed(inner))]
  work_panel(outline,y-d/2,y+d/2,m)

def trough(x,y,w,m):
 block((x,y,.026),(w,.065,.052),m,.004)
 block((x,y,.052),(w-.025,.041,.006),COPPER_WORK,0)

def shelter():
 straw_shed(0,0,.33,.27,.146)
 trough(.04,-.189,.18,TIMBER)
def stable():
 # The pointed arcade shades two stalls. A high hay door opens above the feed trough.
 block((0,.101,.107),(.42,.05,.213),OCHRE_WORK,0)
 for x in [-.122,.023]:
  work_arcade(x,-.076,.145,.092,.157,.179,.042,CUT)
  block((x,.066,.073),(.108,.022,.134),TIMBER,0)
  block((x,.024,.060),(.086,.059,.043),STRAW_DEEP,0)
 for x in [-.186,-.049]:block((x,.019,.088),(.021,.176,.176),MUD,0)
 eaves(-.05,0,.179,.333,.269,TILE_DEEP,.018);hip(-.05,0,.197,.326,.26,.089,TILE,.56)
 work_profile(.146,.012,[(0,.072,.118),(.231,.066,.104),(.254,.072,.111)],CLAY_WORK,4)
 block((.146,-.094,.179),(.063,.014,.092),INK_WORK,0)
 hip(.146,.012,.251,.165,.251,.116,TILE_DEEP,.5)
 trough(.015,-.188,.19,STONE)

def lumber_camp():
 # The lumber camp before the saw shed: a log on two trestles with a long saw in it, a block and axe, an open straw shed.
 straw_shed(0,.13,.36,.26,.13)
 for x in [-.13,.13]:
  pole((x,-.20,0),(x,-.08,.15),.016);pole((x,-.08,0),(x,-.20,.15),.016)
 tube([(-.23,-.14,.135),(.23,-.14,.135)],[.042,.042],TIMBER,7)
 for x in [-.231,.231]:tube([(x-.002,-.14,.135),(x+.002,-.14,.135)],[.032,.032],STRAW,7)
 block((.03,-.14,.215),(.012,.20,.07),BLADE,.002)
 for y in [-.25,-.03]:block((.03,y,.235),(.016,.016,.07),TIMBER,.002)
 cylinder((-.22,.0,.035),.045,.07,TIMBER,7);cylinder((-.22,.0,.071),.036,.004,STRAW,7)
 block((-.22,.0,.12),(.012,.012,.10),TIMBER,.002);block((-.20,.0,.165),(.05,.012,.03),BLADE,.002)

def saw_hall():
 # The saw frame stands taller than the covered timber run. The open front shows the carriage and blade.
 for x in [-.154,.154]:
  work_profile(x,-.048,[(0,.043,.073),(.048,.043,.073),(.339,.029,.043)],CLAY_WORK,4)
  block((x,-.048,.341),(.08,.105,.024),CUT,0)
  pole((x,.091,0),(x,-.047,.312),.018,TIMBER,4)
 block((0,-.048,.366),(.364,.10,.044),TIMBER,0)
 for x in [-.077,.077]:pole((x,-.102,.117),(x,-.102,.379),.012,BRASS_WORK,4)
 for z in [.156,.31]:block((0,-.106,z),(.168,.024,.022),TIMBER,0)
 block((0,-.104,.234),(.016,.016,.151),BLADE,0)
 for y in [-.198,.116]:
  for x in [-.06,.06]:pole((x*1.44,y,0),(x*.77,y,.134),.016,TIMBER,4)
 block((0,-.044,.126),(.14,.415,.031),TIMBER,0)
 tube([(.008,-.273,.159),(.008,.193,.159)],[.034,.034],TIMBER,8)
 tube([(.008,-.275,.159),(.008,-.272,.159)],[.028,.028],STRAW,8)
 for x in [-.15,.15]:
  block((x,.167,.105),(.032,.042,.21),TIMBER,0)
 work_panel([(-.204,.203),(-.01,.285),(.205,.203),(.203,.182),(-.01,.257),(-.201,.183)],.038,.211,TILE_DEEP)
 block((-.091,-.048,.416),(.042,.093,.075),TIMBER,0)
 work_panel([(-.206,.399),(-.091,.484),(.206,.397),(.203,.377),(-.09,.452),(-.203,.379)],-.119,.023,COPPER_WORK)

# --- Town centres by age, and the richer houses of the late ages ---------------
# The user, 2026-11-16: "The town center building feels out of place in age
# 1/2, lets have towns contain just huts in age 1, small buildings in age 2,
# but could we have slightly more intricate buildings for age 3/4?"
# `NORTH_STAR_TOWN_AGES` in src/terrainStudy/northStarAssets.js says which
# models each age draws, and where each centre's smoke leaves it.
def dark_arch(x,y,w=.09,h=.15):
 """A dark arched opening on a front wall: a door-coloured slab with a round head. Plain edges, to keep the count low."""
 block((x,y,h/2+.03),(w,.02,h),DOOR,0)
 head=cylinder((0,0,0),w/2,.02,DOOR,6);head.rotation_euler[0]=math.pi/2;head.location=(x,y,h+.03)
def dormer(x,y,z):
 block((x,y,z),(.075,.06,.07),WALL,0);gable(x,y,z+.035,.095,.08,.05,TILE_DEEP,'y');block((x,y-.031,z),(.035,.01,.04),DOOR,0)
def chimney(x,y,z,h=.16):
 block((x,y,z+h/2),(.06,.06,h),WALL,0);block((x,y,z+h),(.08,.08,.025),STONE,0)
def pane(x,y,z,w=.055,h=.07):block((x,y,z),(w,.014,h),DOOR,0)

def great_hut():
 # The centre of a town of the first age: a broad round hut under two tiers of straw. Its smoke leaves the top, at (0,0,.80).
 cylinder((0,0,.15),.30,.30,MUD,12)
 cone(0,0,.25,.43,.10,STRAW_DEEP,12);cone(0,0,.29,.40,.34,STRAW,12)
 cylinder((0,0,.57),.125,.06,MUD,10)
 cone(0,0,.575,.21,.05,STRAW_DEEP,10);cone(0,0,.605,.185,.19,STRAW,10)
 cylinder((0,0,.79),.035,.02,PIT,6)
 door(0,-.30,.11,.20)
 for x in [-.105,.105]:block((x,-.37,.14),(.035,.035,.28),TIMBER,.004)
 block((0,-.37,.29),(.29,.045,.04),TIMBER,.004)
def great_house():
 # The centre of a town of the middle ages: a house of the same kind as the others, a little larger, with a wing and a chimney.
 # Its smoke leaves the chimney, at (.19,.10,.67).
 block((0,0,.025),(.62,.44,.05),STONE,.01);block((0,.04,.19),(.56,.30,.33),WALL,.018)
 eaves(0,.04,.34,.63,.37,TILE_DEEP);gable(0,.04,.375,.60,.34,.22,TILE)
 block((-.14,-.13,.16),(.24,.24,.27),WALL,.016)
 eaves(-.14,-.14,.28,.30,.28,TILE_DEEP);gable(-.14,-.14,.315,.27,.26,.17,TILE,'y')
 chimney(.19,.10,.44,.21)
 door(-.14,-.251,.09,.15);window(.10,-.111,.20);window(.22,-.111,.20)

def house_3d():
 # A tall house whose upper storey stands out over the lower on a timber band, with a chimney.
 block((0,0,.025),(.40,.36,.05),STONE,.01);block((0,0,.17),(.34,.30,.26),WALL,.016)
 block((0,-.01,.305),(.40,.35,.03),TIMBER,.006)
 block((0,-.01,.43),(.38,.34,.24),WALL,.016)
 eaves(0,-.01,.54,.44,.40,TILE_DEEP);gable(0,-.01,.575,.42,.38,.30,TILE,'y')
 chimney(-.13,.09,.62,.22)
 door(0,-.151,.09,.16)
 for x in [-.10,.10]:pane(x,-.181,.43)
 pane(0,-.201,.68,.06,.08)
def house_3e():
 # A broad house with a round turret, two arches on the ground floor, a dormer and a chimney.
 block((0,0,.025),(.50,.38,.05),STONE,.01);block((-.03,0,.20),(.42,.34,.36),WALL,.018)
 eaves(-.03,0,.36,.50,.42,TILE_DEEP);hip(-.03,0,.395,.47,.39,.20,TILE,.4)
 cylinder((.20,-.12,.34),.105,.68,WALL,10);cylinder((.20,-.12,.665),.125,.03,STONE,10)
 cone(.20,-.12,.68,.15,.05,SLATE,10);cone(.20,-.12,.71,.135,.29,SLATE,10)
 for x in [-.17,-.045]:dark_arch(x,-.171,.085,.13)
 pane(-.17,-.171,.29);pane(-.045,-.171,.29);pane(.20,-.226,.46,.045,.08)
 dormer(-.11,-.11,.475);chimney(-.17,.09,.44,.2)
def house_3f():
 # A long house: three arches along the front, and a second storey set back under its own roof.
 block((0,0,.025),(.60,.36,.05),STONE,.01);block((0,0,.18),(.56,.32,.32),WALL,.018)
 block((0,0,.345),(.60,.36,.03),TILE_DEEP,.006)
 block((0,.03,.46),(.50,.24,.22),WALL,.016)
 eaves(0,.03,.56,.58,.32,TILE_DEEP);hip(0,.03,.595,.55,.29,.20,TILE,.55)
 for x in [-.17,0,.17]:
  dark_arch(x,-.161,.10,.14);pane(x,-.091,.47,.05,.065)
 chimney(.20,.07,.62,.17)
def hall_3():
 # The hall of the late ages: the hall of before with an arcade on both sides of a taller tower, an open belfry, two dormers and a chimney.
 # Its smoke leaves the chimney, at (.27,.15,.83).
 for i,(w,d) in enumerate([(.90,.66),(.82,.58)]):block((0,0,.02+i*.04),(w,d,.04),STONE,.008)
 block((0,.04,.28),(.72,.42,.40),WALL,.02)
 eaves(0,.04,.46,.80,.50,TILE_DEEP,.04);hip(0,.04,.50,.77,.47,.25,TILE,.5)
 for side in [-1,1]:
  block((side*.245,-.215,.19),(.25,.10,.22),WALL,.01);block((side*.245,-.215,.315),(.28,.13,.03),TILE_DEEP,.006)
  for x in [side*.185,side*.305]:dark_arch(x,-.267,.075,.12)
  pane(side*.245,-.171,.40,.06,.07);dormer(side*.25,-.09,.615)
 block((0,-.12,.48),(.25,.25,.84),WALL,.016)
 block((0,-.12,.74),(.29,.29,.03),STONE,.006)
 block((0,-.246,.84),(.08,.012,.11),DOOR,0)
 for x in [-.126,.126]:block((x,-.12,.84),(.012,.08,.11),DOOR,0)
 block((0,-.12,.915),(.31,.31,.04),STONE,.008)
 hip(0,-.12,.935,.29,.29,.30,SLATE,0)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.04,location=(0,-.12,1.26));bpy.context.object.data.materials.append(GILT_NS)
 dark_arch(0,-.246,.12,.22)
 disc=cylinder((0,0,0),.05,.012,GILT_NS,12);disc.rotation_euler[0]=math.pi/2;disc.location=(0,-.248,.60)
 chimney(.27,.15,.58,.22)


# The four civic buildings use one palette. Early settlements use fired clay.
# Deep blue glaze appears on the later civic roofs in larger areas.
LAPIS = pigment('Town lapis glaze', '405780')
COPPER = pigment('Town weathered copper', '588783')
TERRA = pigment('Town red slip', 'a75036')
LIME = pigment('Town limewash', 'eddfbf')
OCHRE = pigment('Town brass edge', 'd6aa58')

def lantern(x, y, z, radius, height, roof):
    """An open octagonal lantern with a domed cap. The sky shows between its piers."""
    cylinder((x, y, z + height * .06), radius, height * .12, LIME, 8)
    spring = z + height * .43
    for i in range(8):
        angle = math.tau * i / 8
        px = x + math.cos(angle) * radius * .81
        py = y + math.sin(angle) * radius * .81
        cylinder((px, py, (z + spring) / 2), radius * .13, spring - z, LIME, 4)
    rings = [(spring, 1), (spring + height * .07, 1.08), (z + height * .73, .79),
             (z + height * .91, .40), (z + height, .12)]
    tube([(x, y, top) for top, _ in rings], [radius * width for _, width in rings], roof, 8)
    for i in range(0, 8, 2):
        a = math.tau * i / 8
        points = [(x + math.cos(a) * radius * w, y + math.sin(a) * radius * w, top) for top, w in rings[1:]]
        tube(points, [radius * .044] * len(points), OCHRE, 4)
    cone(x, y, z + height, radius * .13, height * .15, OCHRE, 6)

def court_hut():
    great_hut()
    # A low fired-clay porch projects beyond the thatch. Its ridge rises into
    # the roof, so the entrance remains visible from the board camera.
    for side in [-1, 1]:
        block((side * .118, -.390, .095), (.061, .16, .19), TERRA, .005)
        pole((side * .119, -.447, .17), (side * .119, -.410, .318), .020, TIMBER, 5)
    gable(0, -.364, .273, .333, .28, .129, TERRA, 'y')
    block((0, -.437, .026), (.256, .122, .052), LIME, .004)
    block((0, -.508, .014), (.289, .063, .028), TERRA, .003)
    cylinder((0, 0, .568), .139, .052, TERRA, 12)

def portico_house():
    great_house()
    # The sheltered work yard shares the house's front wall. Low terracotta
    # coping and the blue fascia trace its two roof levels.
    for x in [.035, .245]:
        block((x, -.202, .139), (.042, .052, .215), STONE, .003)
    block((.140, -.204, .256), (.269, .066, .036), LAPIS, .002)
    hip(.14, -.169, .274, .29, .15, .07, TILE, .65)
    # Three steps on each gable end give the ridge a distinct sawtooth profile.
    for side in [-1, 1]:
        x = side * .288
        for y, top in [(-.104, .447), (-.044, .525), (.019, .601), (.080, .590), (.141, .509), (.201, .437)]:
            block((x, y, (.362 + top) / 2), (.047, .063, top - .362), TERRA, 0)
            block((x, y, top), (.059, .068, .019), LIME, .002)
    block((0, .042, .595), (.54, .036, .025), TERRA, 0)

def tower_hall():
    hall_3()
    # A glazed clock stage and buttresses frame the hall's existing gold dial.
    # The darker band holds the top of the tower together at map scale.
    block((0, -.12, .722), (.285, .284, .044), LAPIS, .004)
    # Give the dial a dark face and brass hands so it reads on pale masonry.
    face = cylinder((0, 0, 0), .048, .010, LAPIS, 12)
    face.rotation_euler[0] = math.pi / 2
    face.location = (0, -.259, .60)
    pole((0, -.269, .598), (0, -.269, .635), .006, OCHRE, 5)
    pole((0, -.269, .598), (.028, -.269, .609), .006, OCHRE, 5)
    for side in [-1, 1]:
        block((side * .137, -.213, .26), (.058, .085, .41), LIME, .006)
        hip(side * .137, -.213, .463, .071, .099, .055, TILE, 0)

def lantern_hall():
    # The pitched roof covers the hall at the back. An open loggia occupies
    # the front third of the same footprint and casts its own arcade shadows.
    block((0, 0, .036), (.85, .61, .072), STONE, .012)
    block((0, .085, .275), (.70, .36, .414), LIME, .012)
    hip(0, .085, .473, .77, .42, .164, TILE, .57)
    for x in [-.234, 0, .234]:
        arch(x, -.212, .067, .166, .288, .080, LIME)
    block((0, -.179, .385), (.74, .166, .060), LIME, .005)
    block((0, -.170, .422), (.756, .193, .025), COPPER, .003)
    block((-.05, .018, .71), (.315, .315, .41), LIME, .012)
    block((-.05, .018, .884), (.349, .348, .047), LAPIS, .004)
    for dx in [-.096, 0, .096]:
        pane(-.05 + dx, -.141, .705, .043, .157)
    lantern(-.05, .018, .906, .207, .385, LAPIS)
    for x in [-.313, .313]:
        cylinder((x, -.19, .457), .047, .072, LIME, 6)
        cone(x, -.19, .49, .055, .116, COPPER, 6)
    chimney(.257, .13, .485, .205)

def courtyard_house():
    # The townhouse stays low beside the civic lantern. Its roof terrace
    # steps back from a pair of openings that go through the front gallery.
    block((0, 0, .022), (.47, .36, .044), STONE, .006)
    block((0, .055, .175), (.405, .234, .277), LIME, .011)
    for x in [-.103, .103]:
        arch(x, -.117, .042, .14, .21, .057, LIME)
    block((0, -.001, .298), (.449, .335, .041), TERRA, .005)
    block((-.037, .045, .409), (.297, .220, .189), LIME, .006)
    for x in [-.105, .035]:
        pane(x, -.070, .413, .051, .097)
    hip(-.037, .046, .502, .332, .258, .134, COPPER, .25)
    chimney(.152, .079, .308, .212)


MODELS=[
 ('ns-sheaf',sheaf),('ns-logs',logs),('ns-stall',stall),
 ('ns-windmill',windmill),('ns-windmill-sails',windmill_sails),
 ('ns-house-1a',house_1a),('ns-house-1b',house_1b),('ns-house-1c',house_1c),
 ('ns-house-2a',house_2a),('ns-house-2b',house_2b),('ns-house-2c',house_2c),
 ('ns-house-3a',house_3a),('ns-house-3b',house_3b),('ns-house-3c',house_3c),
 ('ns-hall',hall),('ns-mine',mine),('ns-quarry',quarry),('ns-barn',barn),('ns-haystack',haystack),
 ('ns-granary',granary),('ns-rack',rack),('ns-thatch-barn',thatch_barn),
 ('ns-mine-pit',mine_pit),('ns-mine-winch',mine_winch),('ns-quarry-cut',quarry_cut),('ns-quarry-frame',quarry_frame),
 ('ns-shelter',shelter),('ns-stable',stable),('ns-lumber-camp',lumber_camp),
 ('ns-loft-barn',loft_barn),('ns-mine-headframe',mine_headframe),('ns-saw-hall',saw_hall),
 ('ns-great-hut',court_hut),('ns-great-house',portico_house),('ns-house-3d',house_3d),('ns-house-3e',house_3e),('ns-house-3f',house_3f),('ns-hall-3',tower_hall),
 ('ns-hall-4',lantern_hall),('ns-house-4a',courtyard_house),
]
if '--pillaged-works-only' in sys.argv:
 MODELS=runpy.run_path(str(Path(__file__).with_name('build_pillaged_works.py')),init_globals=globals())['PILLAGED_MODELS']
# `--only=ns-rack,ns-granary` writes those models and leaves every other file as it is.
ONLY=next((a[7:].split(',') for a in sys.argv if a.startswith('--only=')),None)
for name,author in MODELS:
 if ONLY and name not in ONLY:continue
 reset();author()
 bpy.ops.object.select_all(action='SELECT')
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.join();export(name)
