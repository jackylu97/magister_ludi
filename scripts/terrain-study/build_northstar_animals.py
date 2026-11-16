"""Animals for the north-star look; run via build_settlement_assets.py -- --animals-only.

The user, 2026-11-13: "Could you also do a pass on improving the models for the
animal models on the map? the horses seem a bit too simple now." On the board
an animal is about a fifth of a hex long, so the study's fine sculpts lose
their legs and necks and read as small brown marks. These models are for that
size: a full body, thick legs, a large head and neck, and a dark mane, tail and
hooves that stand against the coat. Each kind has two or three models (a pose,
a coat or a size), so a herd is not one model three times.

These files sit beside the study's animals and replace nothing:
`NORTH_STAR_ANIMALS` in src/terrainStudy/northStarAssets.js picks which set is
drawn, and names the models of each herd.

Each vertex carries how it moves when the animal idles, as a vertex colour:
red is how much it belongs to the head and neck (0 at the shoulder, 1 at the
part of the head farthest from it), green how much to the tail (0 at its root,
1 at its tip), and blue is 1 everywhere. The loader turns it into the
`herdMove` attribute, and src/render3d/paintedAnimals.ts moves the head and the
tail by it. `headpart` and `tailpart` below make a part of the head or of the
tail.

An animal looks toward +X, stands on z = 0 and is about one unit long, as the
study's animals are, so the code that places a herd is unchanged.
"""

CHESTNUT=pigment('NS chestnut coat','b9683a');BAY=pigment('NS bay coat','7a4729');PALE=pigment('NS palomino coat','dcae6a')
BLACK=pigment('NS black mane','2e2724');FLAX=pigment('NS flaxen mane','f0e2bd');HOOF=pigment('NS hoof','3a332e')
CREAM_COAT=pigment('NS cream coat','ece0c4');RED=pigment('NS red coat','a65a36');PALE_HORN=pigment('NS horn','eadfc0')
FAWN=pigment('NS fawn coat','b98049');FAWN_DEEP=pigment('NS deep fawn coat','9a6437');RUMP=pigment('NS white rump','f1ead6')
SHAG=pigment('NS bison shoulders','4f3a2a');HIDE=pigment('NS bison hide','7d5f42')
SAND=pigment('NS camel coat','c7955a');SAND_LIGHT=pigment('NS camel hump','dcb27a')
SLATE_HIDE=pigment('NS elephant hide','8c9399');SLATE_EAR=pigment('NS elephant ear','a0a6aa')

MARKS={}
def begin():
 reset();MARKS.clear()
def headpart(points,radii,m,n=5):
 """A part of the neck or the head. The first one made gives the shoulder the head turns about."""
 o=tube(points,radii,m,n);o['move']='head';MARKS.setdefault('head',Vector(points[0]));return o
def tailpart(points,radii,m,n=4):
 """The tail. Its first point is the root it swings from."""
 o=tube(points,radii,m,n);o['move']='tail';MARKS.setdefault('tail',Vector(points[0]));return o

def legs(spots,top,radii,coat,hoof=.05,steps=None):
 """Four legs of four sides each, with a dark hoof. `steps` moves each foot forward or back for a pose."""
 for k,(x,y,bend) in enumerate(spots):
  step=(steps or (0,0,0,0))[k]
  tube([(x,y,top),(x+bend+step*.5,y,top*.5),(x+step,y,hoof)],radii,coat,4)
  tube([(x+step,y,hoof),(x+step,y,0)],[radii[2]*1.08,radii[2]*1.2],HOOF,4)

def finish(name,scale=1.):
 bpy.context.view_layer.update();tris=0
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  for p in o.data.polygons:p.use_smooth=False
  o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
 # How far the farthest vertex of the head, and of the tail, is from its pivot.
 reach={kind:max([((o.matrix_world@v.co)-MARKS[kind]).length for o in meshes if o.get('move')==kind for v in o.data.vertices] or [1]) for kind in MARKS}
 for o in meshes:
  kind=o.get('move');attr=o.data.color_attributes.new(name='move',type='FLOAT_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
  for loop in o.data.loops:
   w=min(1,((o.matrix_world@o.data.vertices[loop.vertex_index].co)-MARKS[kind]).length/reach[kind]) if kind else 0
   attr.data[loop.index].color=(w if kind=='head' else 0,w if kind=='tail' else 0,1,1)
 for o in meshes:o.location=o.location*scale;o.scale=o.scale*scale
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_vertex_color='ACTIVE')
 print('ASSET',name,tris,flush=True)

def horse(name,coat,dark,pose='stand',scale=1.):
 begin()
 # A high croup, a back that dips and high withers, so the back is not a straight line.
 loft([(-.41,.52,.05,.08),(-.32,.54,.13,.16),(-.18,.53,.155,.175),(.02,.50,.14,.15),(.20,.53,.15,.18),(.31,.57,.08,.12)],coat,6)
 graze=pose=='graze'
 legs([(.19,.085,.01),(.19,-.085,.01),(-.26,.085,-.05),(-.26,-.085,-.05)],.47,[.072,.043,.045],coat,steps=(.07,-.03,0,-.05) if graze else (0,.03,-.02,.03))
 if graze:
  headpart([(.22,0,.54),(.40,0,.42),(.50,0,.27)],[.115,.085,.065],coat,5)
  headpart([(.46,0,.30),(.53,0,.17),(.58,0,.05)],[.065,.078,.048],coat,5)
  for s in (-1,1):headpart([(.44,s*.045,.33),(.39,s*.06,.40)],[.024,.002],coat,3)
  headpart([(.17,0,.66),(.35,0,.56),(.46,0,.40)],[.03,.05,.03],dark,4)
 else:
  turn=.16 if pose=='turn' else 0.
  headpart([(.22,0,.56),(.34,0,.76),(.40,turn*.2,.88)],[.115,.085,.065],coat,5)
  headpart([(.36,turn*.1,.90),(.46,turn*.6,.86),(.61,turn*1.3,.75)],[.065,.078,.048],coat,5)
  for s in (-1,1):headpart([(.37,s*.04+turn*.1,.94),(.36,s*.05+turn*.1,1.02)],[.024,.002],coat,3)
  headpart([(.16,0,.66),(.26,0,.86),(.35,turn*.1,.97)],[.03,.05,.03],dark,4)
 tailpart([(-.38,0,.58),(-.48,.02 if graze else 0,.46),(-.49,.05 if graze else 0,.20)],[.03,.045,.012],dark,4)
 finish(name,scale)

def cattle(name,front,rear,face,pose='stand',scale=1.):
 begin()
 # Two halves in two colours make a patched coat that shows at any size.
 loft([(-.40,.42,.08,.11),(-.28,.44,.19,.19),(.0,.42,.20,.20)],rear,6)
 loft([(.0,.42,.20,.20),(.22,.45,.19,.20),(.32,.46,.10,.13)],front,6)
 legs([(.20,.11,0),(.20,-.11,0),(-.26,.11,-.02),(-.26,-.11,-.02)],.37,[.068,.046,.046],front,steps=(.04,-.02,0,-.03) if pose=='graze' else None)
 if pose=='graze':
  headpart([(.26,0,.46),(.40,0,.32)],[.13,.10],front,5)
  headpart([(.37,0,.31),(.46,0,.19),(.52,0,.06)],[.085,.095,.06],face,5)
  horn=(.40,.36);ear=(.36,.30)
 else:
  headpart([(.26,0,.50),(.40,0,.52)],[.13,.10],front,5)
  headpart([(.36,0,.54),(.50,0,.50),(.62,0,.42)],[.085,.095,.06],face,5)
  horn=(.42,.60);ear=(.40,.55)
 for s in (-1,1):
  headpart([(horn[0],s*.07,horn[1]),(horn[0],s*.17,horn[1]+.03),(horn[0]+.02,s*.20,horn[1]+.12)],[.022,.016,.002],PALE_HORN,4)
  headpart([(ear[0],s*.09,ear[1]),(ear[0]-.01,s*.17,ear[1]-.02)],[.025,.004],face,3)
 tailpart([(-.40,0,.50),(-.46,0,.32),(-.46,0,.16)],[.018,.016,.03],HOOF,4)
 finish(name,scale)

def deer(name,coat,stag=True,pose='stand',scale=1.):
 begin()
 loft([(-.34,.50,.06,.09),(-.22,.52,.12,.14),(.0,.50,.11,.13),(.18,.52,.12,.14),(.27,.55,.07,.10)],coat,6)
 legs([(.16,.065,0),(.16,-.065,0),(-.22,.065,-.04),(-.22,-.065,-.04)],.47,[.046,.025,.024],coat,hoof=.04,steps=(.05,-.02,0,-.04) if pose=='graze' else None)
 if pose=='graze':
  headpart([(.19,0,.54),(.30,0,.40),(.36,0,.26)],[.08,.06,.05],coat,5)
  headpart([(.34,0,.27),(.39,0,.17),(.43,0,.07)],[.05,.055,.03],coat,5)
  crown=(.33,.30)
 else:
  headpart([(.19,0,.56),(.26,0,.76),(.28,0,.90)],[.08,.06,.05],coat,5)
  headpart([(.25,0,.92),(.34,0,.90),(.45,0,.84)],[.05,.055,.03],coat,5)
  crown=(.27,.95)
 for s in (-1,1):
  headpart([(crown[0],s*.05,crown[1]),(crown[0]-.03,s*.13,crown[1]+.05)],[.026,.003],coat,3)
  if stag:
   headpart([(crown[0]+.01,s*.035,crown[1]+.01),(crown[0]-.03,s*.10,crown[1]+.17),(crown[0]+.03,s*.14,crown[1]+.31)],[.016,.012,.002],PALE_HORN,4)
   headpart([(crown[0]-.03,s*.10,crown[1]+.17),(crown[0]+.09,s*.13,crown[1]+.22)],[.01,.002],PALE_HORN,3)
 tailpart([(-.33,0,.58),(-.40,0,.50)],[.04,.02],RUMP,4)
 finish(name,scale)

def bison(name,scale=1.):
 begin()
 loft([(-.40,.42,.07,.10),(-.26,.42,.15,.16),(.0,.46,.19,.21)],HIDE,6)
 loft([(.0,.46,.19,.21),(.2,.52,.21,.27),(.33,.46,.13,.19)],SHAG,6)
 legs([(.20,.11,0),(.20,-.11,0),(-.26,.10,-.02),(-.26,-.10,-.02)],.36,[.065,.042,.042],SHAG)
 headpart([(.30,0,.42),(.44,0,.34),(.54,0,.22)],[.11,.105,.06],SHAG,5)
 headpart([(.46,0,.26),(.44,0,.12)],[.05,.008],BLACK,4)
 for s in (-1,1):headpart([(.40,s*.10,.42),(.40,s*.17,.44),(.42,s*.18,.52)],[.02,.014,.002],PALE_HORN,4)
 tailpart([(-.40,0,.48),(-.45,0,.34),(-.45,0,.22)],[.016,.014,.026],BLACK,4)
 finish(name,scale)

def camel(name,pose='stand',scale=1.):
 begin()
 loft([(-.38,.62,.06,.08),(-.26,.64,.14,.15),(.0,.63,.15,.16),(.22,.64,.13,.15),(.32,.66,.07,.09)],SAND,6)
 loft([(-.27,.72,.12,.05),(-.15,.84,.13,.14),(-.03,.88,.12,.17),(.10,.82,.11,.12),(.19,.72,.09,.05)],SAND_LIGHT,6)
 legs([(.20,.085,.02),(.20,-.085,.02),(-.26,.085,-.04),(-.26,-.085,-.04)],.6,[.052,.03,.034],SAND,steps=(.06,-.04,.03,-.05) if pose=='walk' else None)
 if pose=='walk':
  headpart([(.24,0,.66),(.40,0,.60),(.54,0,.66),(.62,0,.78)],[.09,.08,.062,.052],SAND,5)
  headpart([(.60,0,.81),(.69,0,.80),(.81,0,.73)],[.05,.065,.04],SAND_LIGHT,5)
  ear=(.60,.86)
 else:
  headpart([(.24,0,.66),(.38,0,.62),(.48,0,.78),(.47,0,.98),(.48,0,1.08)],[.09,.08,.065,.052,.05],SAND,5)
  headpart([(.44,0,1.10),(.54,0,1.10),(.68,0,1.04)],[.05,.065,.04],SAND_LIGHT,5)
  ear=(.45,1.15)
 for s in (-1,1):headpart([(ear[0],s*.04,ear[1]),(ear[0]-.02,s*.07,ear[1]+.05)],[.02,.002],SAND,3)
 tailpart([(-.37,0,.66),(-.45,0,.50),(-.45,0,.34)],[.018,.014,.022],BAY,4)
 finish(name,scale)

def elephant(name,scale=1.,tusks=True):
 begin()
 loft([(-.40,.48,.10,.14),(-.26,.52,.21,.24),(.0,.54,.22,.25),(.22,.54,.21,.25),(.32,.52,.14,.18)],SLATE_HIDE,6)
 legs([(.20,.12,0),(.20,-.12,0),(-.24,.12,0),(-.24,-.12,0)],.36,[.088,.072,.076],SLATE_HIDE,hoof=.035)
 headpart([(.26,0,.58),(.42,0,.60),(.52,0,.52)],[.15,.16,.10],SLATE_HIDE,6)
 headpart([(.50,0,.52),(.60,0,.34),(.60,0,.14),(.68,0,.08)],[.075,.055,.035,.02],SLATE_HIDE,5)
 for s in (-1,1):
  block((.27,s*.185,.57),(.17,.035,.26),SLATE_EAR,.012)['move']='head'
  if tusks:headpart([(.47,s*.07,.46),(.60,s*.09,.38),(.68,s*.08,.44)],[.022,.014,.002],PALE_HORN,4)
 tailpart([(-.40,0,.56),(-.46,0,.40),(-.46,0,.26)],[.02,.014,.022],HOOF,4)
 finish(name,scale)

horse('ns-horse-a',CHESTNUT,BLACK)
horse('ns-horse-b',BAY,BLACK,'graze')
horse('ns-horse-c',PALE,FLAX,'turn',.74)
cattle('ns-cattle-a',CREAM_COAT,RED,RED)
cattle('ns-cattle-b',RED,RED,CREAM_COAT,'graze',.94)
deer('ns-deer-a',FAWN_DEEP)
deer('ns-deer-b',FAWN,False,'graze',.9)
bison('ns-bison-a')
bison('ns-bison-b',.8)
camel('ns-camel-a')
camel('ns-camel-b','walk',.92)
elephant('ns-elephant-a')
elephant('ns-elephant-b',.66,False)
