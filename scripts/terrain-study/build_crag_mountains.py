"""Author the north-star mountains: broad crags that step up through level shelves.
Run Blender --background --python scripts/terrain-study/build_crag_mountains.py.

The user's ruling of 2026-11-13 (docs/flags.md, "The ground as it was, and new
mountain models") asks for rounded, faceted crags with level shelves where
green or snow can lie, in the rock of the hills' cliffs. These files sit beside
the study's escarpment files and replace nothing: `NORTH_STAR_CRAGS` in
src/terrainStudy/northStarTrees.js picks which set the renderer loads.

Each file holds two models, told apart by object name:
  - objects named `Crag...` and `Rubble...` are the mountain itself;
  - objects named `Saddle...` are the low mass the renderer stretches between
    two peaks and toward a hill (the loader calls it the shoulder).
Both stand on z = 0, fit a circle of radius 0.8 and are about 1.45 high, which
are close to the old models' sizes, so the placement code is unchanged. The renderer
squashes a saddle to about a third of its height, so a saddle is drawn tall
here.

The loader decides which faces take the ground's colour (`finishVegetation` in
src/terrainStudy/vegetation.js): a face that looks up, and the low apron at the
foot. So a shelf here is a level cap, and a wall is steep.
"""
import bpy, math, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'public'/'terrain-study'

def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,value):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(value,value,value,1);return m
# The renderer keeps only the light and dark of these and gives the rock its
# colour, so they are greys: darker low down, lighter toward the summit.
STONE=[material('stone'+str(i),v) for i,v in enumerate([.42,.50,.58,.68])]

# Every height below is multiplied by this, so the tallest summit (1.58 as
# written) stands no higher than the old models' tallest block.
HEIGHT=.94

def mass(name,centre,radius,profile,seed,sides=7,turn=0.,stretch=1.,bevel=.045,tilt=(0,0),lean=(0,0),apron=0.,rough=.14,ragged=.05,pigment=1):
 """One block of rock: an uneven ring of walls under a level cap.

 `profile` is a list of (height, width) pairs from the foot up; width is a
 share of `radius`. `apron` adds a low slope round the foot. `tilt` tips the
 cap a little, and `lean` moves each ring sideways as it rises. The corners
 of each ring move in and out on their own, and the rings between foot and
 cap rise and fall by `ragged`, so a wall breaks into a few large uneven
 facets and no two blocks match.
 """
 rng=random.Random(seed);cx,cy=centre
 angles=[turn+(i+rng.uniform(-.28,.28))*math.tau/sides for i in range(sides)]
 spoke=[1+rng.uniform(-rough,rough) for _ in range(sides)]
 z0=profile[0][0];top=profile[-1][0];rings=[]
 def ring(z,width,wobble,tipped,uneven=0.):
  out=[];level=z
  for a,s in zip(angles,spoke):
   z=level+rng.uniform(-uneven,uneven)
   r=radius*width*s*(1+rng.uniform(-wobble,wobble));t=(z-z0)/max(1e-6,top-z0)
   x=math.cos(a)*r*stretch+lean[0]*t;y=math.sin(a)*r/stretch+lean[1]*t
   out.append((cx+x,cy+y,z+(x*tilt[0]+y*tilt[1])*tipped))
  rings.append(out)
 if apron:ring(z0,profile[0][1]+apron/radius,.05,0);z0+=apron*.55;profile=[(z0,profile[0][1])]+profile[1:]
 for j,(z,width) in enumerate(profile):
  last=j==len(profile)-1
  # The top ring stops short of the cap's height; the bevel ring finishes it.
  ring(z-(bevel*.8 if last else 0),width,0 if last else .09,j/(len(profile)-1),0 if last or j==0 else ragged)
 inner=[]
 for a,s in zip(angles,spoke):
  r=max(.02,radius*profile[-1][1]*s-bevel)
  x=math.cos(a)*r*stretch+lean[0];y=math.sin(a)*r/stretch+lean[1]
  inner.append((cx+x,cy+y,top+x*tilt[0]+y*tilt[1]))
 rings.append(inner)
 verts=[(x,y,z*HEIGHT) for r in rings for x,y,z in r];faces=[];n=sides
 for j in range(len(rings)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(STONE[pigment])
 for p in obj.data.polygons:p.use_smooth=False
 return obj

def export(name):
 bpy.context.view_layer.update()
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
 # The mountain and the saddle are drawn apart, so each shades only itself.
 for group in ([o for o in objects if not o.name.startswith('Saddle')],[o for o in objects if o.name.startswith('Saddle')]):
  verts=[];faces=[]
  for o in group:
   o.data.calc_loop_triangles();base=len(verts)
   verts.extend(o.matrix_world@v.co for v in o.data.vertices)
   faces.extend(tuple(base+i for i in t.vertices) for t in o.data.loop_triangles)
  print('ASSET',name,'saddle' if group and group[0].name.startswith('Saddle') else 'mountain','triangles',len(faces),flush=True)
  bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True)
  for o in group:
   attr=o.data.color_attributes.new(name='cavity',type='FLOAT_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
   for p in o.data.polygons:
    n=p.normal.normalized();axis=n.cross(Vector((0,0,1)))
    if axis.length<.01:axis=n.cross(Vector((0,1,0)))
    axis.normalize();second=n.cross(axis)
    for li in p.loop_indices:
     point=o.data.vertices[o.data.loops[li].vertex_index].co;origin=point+n*.012+(p.center-point)*.08;occlusion=0
     for k in range(8):
      a=k*2.39996;u=(k+.5)/8;direction=(n*math.sqrt(1-u)+axis*math.cos(a)*math.sqrt(u)+second*math.sin(a)*math.sqrt(u)).normalized()
      hit,_,_,dist=bvh.ray_cast(origin,direction,.38)
      if hit is not None:occlusion+=1-dist/.38
     ao=max(.5,1-occlusion/8*.6);attr.data[li].color=(ao,ao,ao,1)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_vertex_color='ACTIVE')

def rubble(seed,spots):
 rng=random.Random(seed)
 for i,(x,y,size) in enumerate(spots):
  mass('Rubble'+str(i),(x,y),size,[(-.02,1),(size*.55,.95),(size*.95,.6)],seed*7+i,sides=5,bevel=size*.16,tilt=(rng.uniform(-.2,.2),rng.uniform(-.2,.2)),rough=.2,pigment=i%3)

# Heights: the foot is 0 and the main summit about 1.5. The board is seen from
# above, so a wall leans in and stands tall. Each block sits toward one side of
# the block under it: that side is one high cliff, and the other side is a
# ledge. The summit is two blocks, so the steps go on to the top.
def saddle(seed,block):
 # Drawn tall because the renderer squashes it to about a third: a low
 # footing with one block of rock on it.
 mass('SaddleBase',(0,0),.78,[(0,1),(.3,.93),(.6,.84)],seed,sides=8,apron=.06,stretch=1.05,pigment=0,bevel=.05,ragged=.08)
 mass('SaddleBlock',block,.50,[(.3,1),(.95,.84),(1.45,.6)],seed+1,sides=6,turn=seed*.37,stretch=1.25,pigment=2,bevel=.05,tilt=(.1,.06),ragged=.1)

def crag0():
 # One summit set back from the middle, with ledges that wind up to it.
 mass('CragBase',(0,0),.78,[(0,1),(.16,.95),(.32,.88)],11,sides=8,apron=.06,pigment=0,tilt=(.03,-.02))
 mass('CragStepA',(.06,.06),.66,[(.15,1),(.48,.9),(.76,.8)],12,sides=7,turn=.5,stretch=1.06,pigment=1,tilt=(-.04,.03))
 mass('CragPeak',(.12,.12),.50,[(.5,1),(.92,.87),(1.28,.68)],15,sides=6,turn=.3,lean=(.05,.04),tilt=(.08,.05),pigment=2)
 mass('CragSummit',(.20,.19),.32,[(1.0,1),(1.34,.78),(1.58,.38)],17,sides=5,turn=.8,bevel=.035,lean=(.04,.03),tilt=(.25,.12),rough=.18,pigment=3)
 mass('CragSpur',(-.36,-.24),.31,[(.2,1),(.6,.86),(.88,.6)],13,sides=6,pigment=2,tilt=(.08,.06))
 mass('CragLedge',(.44,-.28),.25,[(.15,1),(.45,.9),(.6,.78)],16,sides=5,turn=.4,pigment=1,tilt=(-.06,.05))
 rubble(1,[(-.66,.30,.11),(.02,-.70,.13),(.70,.26,.09)])
 saddle(21,(-.08,.05))

def crag1():
 # Two summits, one lower, with a ledge in the pass between them.
 mass('CragBase',(0,0),.78,[(0,1),(.16,.95),(.32,.88)],31,sides=8,apron=.06,stretch=1.06,pigment=0,tilt=(-.02,.03))
 mass('CragStepA',(-.02,.05),.66,[(.15,1),(.46,.9),(.72,.8)],32,sides=8,turn=.3,stretch=1.16,pigment=1,tilt=(.03,.03))
 mass('CragPeak',(-.22,.10),.46,[(.5,1),(.92,.86),(1.26,.68)],34,sides=6,lean=(-.03,.03),tilt=(.06,-.08),pigment=2)
 mass('CragSummit',(-.28,.15),.30,[(1.0,1),(1.34,.78),(1.58,.38)],37,sides=5,turn=.4,bevel=.035,lean=(-.04,.02),tilt=(-.25,.12),rough=.18,pigment=3)
 mass('CragPeakB',(.34,.0),.36,[(.45,1),(.84,.84),(1.12,.6),(1.32,.34)],35,sides=6,turn=.5,bevel=.035,lean=(.03,.03),tilt=(.18,.1),rough=.16,pigment=3)
 mass('CragLedge',(.06,-.46),.26,[(.15,1),(.44,.9),(.58,.78)],36,sides=5,turn=.2,pigment=1,tilt=(.04,-.06))
 rubble(2,[(.68,.36,.12),(-.62,-.44,.10),(-.20,.72,.09)])
 saddle(41,(.08,-.04))

def crag2():
 # A heavy block: one wide high shelf like a buttress, with the summit at its end.
 mass('CragBase',(0,0),.78,[(0,1),(.18,.95),(.36,.88)],51,sides=8,apron=.06,pigment=0,tilt=(.02,.02))
 mass('CragStepA',(.03,.02),.67,[(.2,1),(.6,.92),(.90,.83)],52,sides=7,turn=.1,stretch=1.08,pigment=1,tilt=(-.03,-.03))
 mass('CragPeak',(.20,.10),.44,[(.7,1),(1.02,.88),(1.27,.72)],54,sides=6,turn=.9,lean=(.03,.03),tilt=(-.06,.05),pigment=2)
 mass('CragSummit',(.26,.15),.29,[(1.05,1),(1.34,.78),(1.55,.4)],57,sides=5,turn=.2,bevel=.035,lean=(.03,.03),tilt=(.22,-.12),rough=.18,pigment=3)
 mass('CragSpur',(-.38,.20),.29,[(.3,1),(.75,.86),(1.06,.58)],55,sides=6,turn=.5,pigment=2,tilt=(.07,-.05))
 mass('CragLedge',(-.26,-.46),.25,[(.15,1),(.46,.9),(.64,.76)],56,sides=5,turn=.1,pigment=1,tilt=(-.08,-.06))
 rubble(3,[(.64,-.44,.12),(-.70,-.14,.10),(.30,.72,.10)])
 saddle(61,(.04,.06))

for variant,build in enumerate([crag0,crag1,crag2]):
 reset();build();export('crag-'+str(variant))
