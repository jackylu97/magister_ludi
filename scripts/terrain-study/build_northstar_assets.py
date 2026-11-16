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
- ns-quarry: pale stone cut in square steps, with a crane.
- ns-barn, ns-haystack: the farm's building and its stacks.
- ns-granary, ns-rack, ns-thatch-barn: the farm before the barn. A small store
  on legs and a drying rack in the first age, a low straw barn in the second.
- ns-mine-pit, ns-mine-winch: the mine before the pithead.
- ns-quarry-cut, ns-quarry-frame: the quarry before the crane.
- ns-shelter, ns-stable: the pasture's straw shed, and the stable that follows it.
- ns-lumber-camp: the lumber camp before the saw shed.
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

def quarry():
 # Pale stone cut in square steps round a corner, and a crane.
 for w,d,h,x,y in [(.86,.70,.14,0,.04),(.86,.24,.30,0,.27),(.26,.70,.30,-.30,.04),(.62,.16,.46,-.12,.31),(.18,.44,.46,-.34,.17)]:
  block((x,y,h/2-.12),(w,d,h+.24),CUT if h>.2 else CUT_SHADE,.012)
 # Loose blocks waiting on the floor.
 block((.12,-.10,.19),(.17,.13,.10),CUT,.008);block((.27,.02,.18),(.12,.12,.08),CUT,.008)
 block((.16,-.08,.285),(.11,.10,.09),CUT,.008)
 # The crane: a post, a jib and a hanging block.
 tube([(.32,-.22,.14),(.32,-.22,.66)],[.032,.026],TIMBER,6)
 tube([(.36,-.20,.62),(.02,-.30,.72)],[.022,.018],TIMBER,6)
 tube([(.32,-.22,.40),(.14,-.27,.685)],[.014,.014],TIMBER,5)
 tube([(.04,-.295,.71),(.04,-.295,.50)],[.006,.006],PIT,4)
 block((.04,-.295,.46),(.09,.09,.08),CUT,.006)

def barn():
 # A broad barn: a deep roof, a wide dark door.
 block((0,0,.02),(.50,.38,.04),STONE,.008);block((0,0,.14),(.46,.34,.24),WALL,.018)
 eaves(0,0,.24,.54,.42,TILE_DEEP);gable(0,0,.275,.51,.39,.24,TILE,'y')
 block((0,-.171,.10),(.16,.02,.20),DOOR,.004)
 block((0,-.201,.40),(.06,.02,.06),DOOR,.003)
def haystack():
 rock((0,0,.05),(.12,.12,.13),STRAW,21,1,.06)
 cone(0,0,.13,.085,.08,STRAW_DEEP,8)

CANVAS=pigment('NS sail canvas','f6edd6')
def windmill():
 # A round tower that narrows upward, under a tiled cap. The hub is at (0,-.15,.50).
 cylinder((0,0,.02),.17,.04,STONE,10)
 tube([(0,0,.04),(0,0,.30),(0,0,.47)],[.145,.115,.098],WALL,10)
 cone(0,0,.47,.135,.17,TILE,10)
 block((0,-.139,.10),(.07,.02,.14),DOOR,.004)
 block((0,-.112,.33),(.045,.02,.055),DOOR,.003)
 tube([(0,-.06,.50),(0,-.16,.50)],[.022,.022],TIMBER,6)
def windmill_sails():
 block((0,0,0),(.06,.035,.06),TIMBER,.006)
 for spar,spar_size,sail,sail_size in [
  ((0,0,.17),(.018,.016,.34),(.05,0,.215),(.08,.010,.24)),
  ((.17,0,0),(.34,.016,.018),(.215,0,-.05),(.24,.010,.08)),
  ((0,0,-.17),(.018,.016,.34),(-.05,0,-.215),(.08,.010,.24)),
  ((-.17,0,0),(.34,.016,.018),(-.215,0,.05),(.24,.010,.08)),
 ]:
  block(spar,spar_size,TIMBER,.002);block(sail,sail_size,CANVAS,.002)

# Scenery for rich hexes (docs/flags.md (nnnnnnn), "Yields on the board"):
# what a hex shows as its food, production or gold rises.
AWNING=pigment('NS awning red','c8553d')
def sheaf():
 # Three bound stooks of grain.
 for x,y,s in [(-.07,.02,1.0),(.06,.04,.9),(0,-.06,.82)]:
  cone(x,y,0,.055*s,.17*s,STRAW,7,.012*s);cone(x,y,.15*s,.03*s,.05*s,STRAW_DEEP,7)
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
 # The farm of the first age: a small round store on four legs, under a straw cone.
 for x,y in [(-.07,-.07),(.07,-.07),(.07,.07),(-.07,.07)]:block((x,y,.04),(.032,.032,.08),TIMBER,.004)
 cylinder((0,0,.092),.135,.03,TIMBER,8)
 tube([(0,0,.105),(0,0,.19),(0,0,.25)],[.098,.118,.102],MUD,8)
 cone(0,0,.235,.17,.045,STRAW_DEEP,8);cone(0,0,.262,.152,.21,STRAW,8)
 block((0,-.112,.175),(.05,.02,.075),DOOR,.003)
 pole((-.03,-.20,0),(-.03,-.115,.11),.009);pole((.03,-.20,0),(.03,-.115,.11),.009)
def rack():
 # A drying rack: two pairs of crossed poles, a rail, and bundles of grain hung over it.
 for x in [-.17,.17]:
  pole((x,-.07,0),(x,.02,.25));pole((x,.07,0),(x,-.02,.25))
 pole((-.21,0,.218),(.21,0,.218),.012)
 for i in range(5):
  x=-.13+i*.065;m=STRAW if i%2==0 else STRAW_DEEP
  block((x,0,.15),(.052,.085,.15),m,.010)
def thatch_barn():
 # The farm of the second age: a low, long barn with timber posts under a heavy straw roof.
 block((0,0,.095),(.50,.30,.19),MUD,.016)
 for x in [-.245,-.09,.09,.245]:block((x,-.152,.095),(.03,.022,.19),TIMBER,.004)
 eaves(0,0,.18,.60,.40,STRAW_DEEP,.04);hip(0,0,.22,.57,.37,.25,STRAW,.55)
 block((0,-.153,.08),(.13,.02,.16),DOOR,.004)

def mine_pit():
 # The mine of the first age: a hole dug into an outcrop, propped with three logs, and baskets of ore.
 rock((0,.11,.07),(.25,.20,.18),ROCK,31)
 rock((-.19,.13,.03),(.13,.13,.10),ROCK_LIGHT,33,1);rock((.19,.14,.02),(.12,.12,.09),ROCK,35,1)
 block((0,-.06,.075),(.14,.12,.15),PIT,0)
 for x in [-.09,.09]:pole((x,-.125,0),(x*.92,-.115,.20),.024,TIMBER,6)
 pole((-.13,-.12,.195),(.13,-.12,.195),.024,TIMBER,6)
 basket(.20,-.15,0,ORE,37);basket(.27,-.05,0,ORE,38)
 rock((-.20,-.13,.0),(.085,.075,.05),ROCK_LIGHT,39,1)
def mine_winch():
 # The mine of the second age: a square shaft with a timber curb, and a windlass over it.
 rock((-.04,.19,.05),(.24,.12,.13),ROCK,41,1);rock((.20,.17,.02),(.10,.10,.08),ROCK_LIGHT,43,1)
 block((0,-.02,.03),(.27,.27,.06),TIMBER,.008);block((0,-.02,.061),(.19,.19,.006),PIT,0)
 for x in [-.16,.16]:
  pole((x,-.13,0),(x,-.02,.31),.02);pole((x,.09,0),(x,-.02,.31),.02)
 tube([(-.20,-.02,.285),(.20,-.02,.285)],[.032,.032],TIMBER,7)
 block((.225,-.02,.25),(.016,.016,.09),TIMBER,.002);block((.25,-.02,.21),(.05,.016,.016),TIMBER,.002)
 tube([(0,-.02,.28),(0,-.02,.13)],[.006,.006],PIT,4)
 tube([(0,-.02,.07),(0,-.02,.13)],[.032,.042],TIMBER,7)
 block((-.24,-.17,.045),(.15,.11,.07),TIMBER,.008);rock((-.24,-.17,.09),(.06,.045,.03),ORE,45,1)
 basket(.24,-.18,0,ORE,47)

def quarry_cut():
 # The quarry of the first age: a low face cut by hand, rough stone left above it, and a block on log rollers.
 for w,d,h,x,y,m in [(.86,.70,.10,0,.04,CUT_SHADE),(.84,.22,.22,0,.28,CUT),(.22,.48,.20,-.31,.12,CUT)]:
  block((x,y,h/2-.12),(w,d,h+.24),m,.012)
 rock((.24,.30,.25),(.15,.09,.09),CUT_SHADE,51,1);rock((-.30,.28,.24),(.11,.10,.09),CUT_SHADE,53,1)
 for x in [.04,.13,.22]:tube([(x,-.22,.12),(x,-.02,.12)],[.02,.02],TIMBER,6)
 block((.13,-.12,.19),(.22,.15,.10),CUT,.010)
 block((-.10,-.02,.135),(.11,.10,.07),CUT,.008);block((-.12,.12,.255),(.10,.09,.07),CUT,.008)
 pole((.30,-.26,.10),(.20,-.06,.20),.012)
def quarry_frame():
 # The quarry of the second age: deeper steps, and two poles tied at the top to lift a block.
 for w,d,h,x,y in [(.86,.70,.12,0,.04),(.86,.24,.27,0,.27),(.26,.70,.27,-.30,.04),(.50,.16,.39,-.16,.31)]:
  block((x,y,h/2-.12),(w,d,h+.24),CUT if h>.2 else CUT_SHADE,.012)
 block((.26,.04,.16),(.13,.12,.08),CUT,.008);block((-.02,.08,.16),(.12,.11,.08),CUT,.008)
 top=(.14,-.16,.60)
 pole((-.04,-.30,.12),top,.022,TIMBER,6);pole((.34,-.06,.12),top,.022,TIMBER,6);pole((.36,-.30,.12),top,.014)
 tube([(.14,-.16,.58),(.14,-.16,.33)],[.006,.006],PIT,4)
 block((.14,-.16,.28),(.11,.10,.09),CUT,.006)

def straw_shed(x,y,w,d,h):
 """An open shed: four short posts, a dark space, and a steep straw roof of two slopes that comes low. The ridge runs north to south, so the two slopes take different light and the open end faces the camera."""
 for px in [-1,1]:
  for py in [-1,1]:block((x+px*(w/2-.03),y+py*(d/2-.04),.05),(.028,.028,.10),TIMBER,.004)
 block((x,y+.01,.045),(w-.09,d-.10,.09),DOOR,0)
 eaves(x,y,.085,w+.03,d+.03,STRAW_DEEP,.03);gable(x,y,.112,w,d,h,STRAW,'y')
 block((x,y-d/2-.002,.15),(w*.34,.012,.075),DOOR,.002)
def shelter():
 # The pasture of the early ages: an open straw shed and a water trough.
 straw_shed(0,0,.34,.30,.26)
 block((.02,-.24,.025),(.17,.055,.05),TIMBER,.006)
def stable():
 # The pasture of the late ages: a small stable of pale walls and tile, open at the front.
 block((0,0,.015),(.40,.28,.03),STONE,.006)
 block((0,.105,.115),(.36,.04,.19),WALL,.008)
 for x in [-.16,.16]:block((x,-.005,.115),(.04,.21,.19),WALL,.008)
 block((0,-.005,.10),(.28,.19,.15),DOOR,0)
 eaves(0,0,.20,.44,.32,TILE_DEEP,.03);gable(0,0,.23,.42,.30,.13,TILE)
 block((0,-.118,.115),(.03,.03,.19),TIMBER,.004)
 block((.02,-.24,.025),(.17,.055,.05),STONE,.006)

def lumber_camp():
 # The lumber camp before the saw shed: a log on two trestles with a long saw in it, a block and axe, an open straw shed.
 straw_shed(0,.13,.36,.26,.25)
 for x in [-.13,.13]:
  pole((x,-.20,0),(x,-.08,.15),.016);pole((x,-.08,0),(x,-.20,.15),.016)
 tube([(-.23,-.14,.135),(.23,-.14,.135)],[.042,.042],TIMBER,7)
 for x in [-.231,.231]:tube([(x-.002,-.14,.135),(x+.002,-.14,.135)],[.032,.032],STRAW,7)
 block((.03,-.14,.215),(.012,.20,.07),BLADE,.002)
 for y in [-.25,-.03]:block((.03,y,.235),(.016,.016,.07),TIMBER,.002)
 cylinder((-.22,.0,.035),.045,.07,TIMBER,7);cylinder((-.22,.0,.071),.036,.004,STRAW,7)
 block((-.22,.0,.12),(.012,.012,.10),TIMBER,.002);block((-.20,.0,.165),(.05,.012,.03),BLADE,.002)

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
 ('ns-great-hut',great_hut),('ns-great-house',great_house),('ns-house-3d',house_3d),('ns-house-3e',house_3e),('ns-house-3f',house_3f),('ns-hall-3',hall_3),
]
# `--only=ns-rack,ns-granary` writes those models and leaves every other file as it is.
ONLY=next((a[7:].split(',') for a in sys.argv if a.startswith('--only=')),None)
for name,author in MODELS:
 if ONLY and name not in ONLY:continue
 reset();author()
 bpy.ops.object.select_all(action='SELECT')
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.join();export(name)
