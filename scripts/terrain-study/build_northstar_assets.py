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
- ns-mine: a dark tunnel mouth with a timber frame in a round rock.
- ns-quarry: pale stone cut in square steps, with a crane.
- ns-barn, ns-haystack: the farm's building and its stacks.

A door faces -Y here, which is toward the camera on the board.
The mine and the quarry reach below the ground line, so they can sit into a
hill with no plinth.
"""

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

for name,author in [
 ('ns-house-1a',house_1a),('ns-house-1b',house_1b),('ns-house-1c',house_1c),
 ('ns-house-2a',house_2a),('ns-house-2b',house_2b),('ns-house-2c',house_2c),
 ('ns-house-3a',house_3a),('ns-house-3b',house_3b),('ns-house-3c',house_3c),
 ('ns-hall',hall),('ns-mine',mine),('ns-quarry',quarry),('ns-barn',barn),('ns-haystack',haystack),
]:
 reset();author()
 bpy.ops.object.select_all(action='SELECT')
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.join();export(name)
