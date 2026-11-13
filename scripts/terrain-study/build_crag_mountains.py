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

Some parts keep the colour given here on every terrain, and the loader knows
them by their material's name (`CRAG_OWN` in vegetation.js): the snow on a
summit, the shrubs and small trees on the ledges, and the scree at the foot.
`scatter` finds the places for them by looking down on the finished rock, so
they follow whatever shape the blocks have.
"""
import bpy, bmesh, math, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'public'/'terrain-study'

def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
# The renderer keeps only the light and dark of the stones and gives the rock
# its colour, so they are greys: darker low down, lighter toward the summit.
STONE=[material('stone'+str(i),(v,v,v)) for i,v in enumerate([.42,.50,.58,.68])]
# The cap of a ledge is dark under the ground's colour, so a ledge is a little
# darker and browner than the open ground and still shows on sand.
LEDGE=material('stoneLedge',(.2,.2,.2))
# These keep their own colour on every terrain.
SNOW=material('snow',(.93,.95,1.))
SCREE=material('scree',(.40,.36,.31))
PINE=material('pine',(.045,.17,.11))
BARK=material('bark',(.30,.17,.08))
LEAVES=[material('leaf'+str(i),(.22+i*.023,.36+i*.018,.10+i*.012)) for i in range(4)]

def mass(name,centre,radius,profile,seed,sides=7,turn=0.,stretch=1.,bevel=.045,tilt=(0,0),lean=(0,0),apron=0.,rough=.14,ragged=.05,pigment=1,cap='ledge',snow=None):
 """One block of rock: an uneven ring of walls under a level cap.

 `profile` is a list of (height, width) pairs from the foot up; width is a
 share of `radius`. `apron` adds a low slope round the foot. `tilt` tips the
 cap, and `lean` moves each ring sideways as it rises: a lean larger than the
 block's narrowing makes an overhang on that side. The corners of each ring
 move in and out on their own, and the rings between foot and cap rise and
 fall by `ragged`, so a wall breaks into a few large uneven facets and no two
 blocks match. `cap` is 'ledge' for a cap that may carry green and 'rock' for
 a bare one. Above the height `snow`, the cap and the faces that are not too
 steep are snow.
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
 verts=[v for r in rings for v in r];faces=[];n=sides
 for j in range(len(rings)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 for m in (STONE[pigment],LEDGE,SNOW):obj.data.materials.append(m)
 for p in obj.data.polygons:
  p.use_smooth=False;last=p.index==len(obj.data.polygons)-1
  if snow is not None and p.center.z>snow and (last or p.normal.z>.2):p.material_index=2
  elif last and cap=='ledge':p.material_index=1
 return obj

def solid(name,verts,faces,mat):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
 for p in obj.data.polygons:p.use_smooth=False
 return obj

def blob(name,pos,size,seed,mat,squash=.75,stand=1.,sunk=.35):
 """A shrub or a round crown: a small ball of twenty facets, uneven and a little flat."""
 rng=random.Random(seed);bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=1,radius=1)
 verts=[];index={}
 for i,v in enumerate(bm.verts):
  k=size*rng.uniform(.82,1.18);index[v]=i
  verts.append((pos[0]+v.co.x*k,pos[1]+v.co.y*k,pos[2]+(v.co.z+1-sunk*2)*k*squash*stand))
 faces=[tuple(index[v] for v in f.verts) for f in bm.faces];bm.free()
 return solid(name,verts,faces,mat)

def pine(name,pos,height,seed,stand=1.):
 """A small conifer: two rings of five corners and a tip."""
 rng=random.Random(seed);turn=rng.uniform(0,math.tau);r=height*.34;verts=[]
 for z,w in ((.06,1),(.5,.66)):
  for i in range(5):
   a=turn+i*math.tau/5;k=r*w*rng.uniform(.88,1.12)
   verts.append((pos[0]+math.cos(a)*k,pos[1]+math.sin(a)*k,pos[2]+z*height*stand))
 verts.append((pos[0]+rng.uniform(-.01,.01),pos[1]+rng.uniform(-.01,.01),pos[2]+height*stand))
 faces=[(i,(i+1)%5,5+(i+1)%5,5+i) for i in range(5)]+[(5+i,5+(i+1)%5,10) for i in range(5)]
 return solid(name,verts,faces,PINE)

def stone(name,pos,size,seed,stand=1.):
 """One piece of scree: eight facets, low and uneven, partly in the ground."""
 rng=random.Random(seed);turn=rng.uniform(0,math.tau);verts=[]
 for i in range(4):
  a=turn+i*math.tau/4+rng.uniform(-.3,.3);k=size*rng.uniform(.75,1.25)
  verts.append((pos[0]+math.cos(a)*k,pos[1]+math.sin(a)*k,pos[2]+size*rng.uniform(.05,.3)*stand))
 verts.append((pos[0]+rng.uniform(-.3,.3)*size,pos[1]+rng.uniform(-.3,.3)*size,pos[2]+size*rng.uniform(.7,1.)*stand))
 verts.append((pos[0],pos[1],pos[2]-size*.5*stand))
 faces=[(i,(i+1)%4,4) for i in range(4)]+[((i+1)%4,i,5) for i in range(4)]
 return solid(name,verts,faces,SCREE)

def scatter(prefix,seed,shrubs,pines,rounds,scree,stand=1.):
 """Stand shrubs and small trees on the ledges of the rock, and scree at its foot.

 Looks straight down on the blocks whose names start with `prefix`. A place
 is a ledge if it is level and lies in the band of heights the loader turns
 green (CRAG_SHELF in vegetation.js: .25 to .82 of the height), with level
 rock all round it. `stand` makes everything taller, for the saddle, which
 the renderer squashes.
 """
 rng=random.Random(seed);verts=[];faces=[]
 for o in [o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]:
  o.data.calc_loop_triangles();base=len(verts)
  verts.extend(v.co.copy() for v in o.data.vertices)
  faces.extend(tuple(base+i for i in t.vertices) for t in o.data.loop_triangles)
 bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True);top=max(v.z for v in verts)
 down=Vector((0,0,-1))
 def look(x,y):
  loc,normal,_,_=bvh.ray_cast(Vector((x,y,5)),down)
  return (loc,normal) if loc is not None else (None,None)
 def ledge(x,y,room):
  loc,normal=look(x,y)
  if loc is None or normal.z<.9 or not top*.29<loc.z<top*.78:return None
  for k in range(6):
   other,n=look(x+math.cos(k*math.tau/6)*room,y+math.sin(k*math.tau/6)*room)
   if other is None or n.z<.9 or abs(other.z-loc.z)>.02+room*.45:return None
  return loc
 placed=[]
 def free(x,y,gap):return all((x-px)**2+(y-py)**2>(gap+pg)**2 for px,py,pg in placed)
 count=0
 for _ in range(6000):
  if not (shrubs or pines or rounds):break
  r=math.sqrt(rng.random())*.74;a=rng.uniform(0,math.tau);x,y=math.cos(a)*r,math.sin(a)*r
  if (pines or rounds) and free(x,y,.06):
   loc=ledge(x,y,.07)
   if loc is not None:
    count+=1;placed.append((x,y,.06))
    if pines and (not rounds or rng.random()<.7):
     pines-=1;pine(prefix+'Pine'+str(count),loc,rng.uniform(.2,.27),seed*31+count,stand)
    else:
     rounds-=1;size=rng.uniform(.07,.085)
     solid(prefix+'Trunk'+str(count),[(loc.x+math.cos(k*math.tau/3)*.018,loc.y+math.sin(k*math.tau/3)*.018,loc.z+h*stand) for h in (0,.1) for k in range(3)],[(k,(k+1)%3,3+(k+1)%3,3+k) for k in range(3)],BARK)
     blob(prefix+'Crown'+str(count),(loc.x,loc.y,loc.z+.07*stand),size,seed*37+count,LEAVES[count%4],squash=.85,stand=stand,sunk=0)
    continue
  if shrubs and free(x,y,.04):
   loc=ledge(x,y,.045)
   if loc is not None:
    count+=1;shrubs-=1;placed.append((x,y,.04))
    blob(prefix+'Shrub'+str(count),loc,rng.uniform(.05,.075),seed*41+count,LEAVES[count%4],stand=stand)
 heap=[]
 for _ in range(4000):
  if not scree:break
  r=rng.uniform(.45,.84);a=rng.uniform(0,math.tau);x,y=math.cos(a)*r,math.sin(a)*r
  # Scree lies in small heaps: most stones fall beside one already there.
  if heap and rng.random()<.7:
   hx,hy=rng.choice(heap);d=rng.uniform(.07,.13);x,y=hx+math.cos(a)*d,hy+math.sin(a)*d
   if x*x+y*y>.84**2:continue
  loc,normal=look(x,y)
  # On the open ground just clear of the rock, on the apron, or on the bare footing.
  if loc is not None and (loc.z>top*.24 or (loc.z>.05 and normal.z<.9)):continue
  if loc is None and look(x*.93,y*.93)[0] is None and look(x*.86,y*.86)[0] is None:continue
  size=rng.uniform(.04,.085)
  if not free(x,y,size):continue
  count+=1;scree-=1;placed.append((x,y,size));heap.append((x,y))
  stone(prefix+'Scree'+str(count),(x,y,loc.z if loc is not None else 0),size,seed*43+count,stand)

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

def saddle(seed,block):
 # Drawn tall because the renderer squashes it to about a third: a low
 # footing with one block of rock on it.
 mass('SaddleBase',(0,0),.78,[(0,1),(.3,.93),(.6,.84)],seed,sides=8,apron=.06,stretch=1.05,pigment=0,bevel=.05,ragged=.08)
 mass('SaddleBlock',block,.50,[(.3,1),(.95,.84),(1.45,.6)],seed+1,sides=6,turn=seed*.37,stretch=1.25,pigment=2,bevel=.05,tilt=(.1,.06),ragged=.1,cap='rock')
 scatter('Saddle',seed,2,0,0,2,stand=2.6)

# Heights: the foot is 0 and the tallest summit 1.62, a little under the old
# models' tallest block (1.64). The board is seen from above, so a wall leans
# in and stands tall. Each block sits toward one side of the block under it:
# that side is one high cliff, and the other side steps down in ledges.
def crag0():
 # The horn: one sharp leaning summit over a high cliff, and a stepped prow
 # that runs down from it on the other side.
 mass('CragBase',(0,0),.78,[(0,1),(.16,.95),(.32,.88)],11,sides=8,apron=.06,pigment=0,tilt=(.03,-.02),cap='rock')
 mass('CragStepA',(.08,.05),.64,[(.15,1),(.45,.9),(.72,.78)],12,sides=7,turn=.5,stretch=1.06,pigment=1,tilt=(-.04,.03))
 mass('CragPeak',(.17,.10),.50,[(.5,1),(.85,.8),(1.12,.56)],15,sides=6,turn=.3,lean=(.06,.03),tilt=(.08,.05),pigment=2,snow=.96)
 mass('CragHorn',(.24,.13),.34,[(.9,1),(1.2,.72),(1.45,.44),(1.62,.2)],17,sides=5,turn=.8,bevel=.03,lean=(.07,.04),tilt=(.2,.1),rough=.2,pigment=3,cap='rock',snow=1.2)
 mass('CragProwA',(-.33,-.20),.31,[(.2,1),(.58,.88),(.90,.64)],13,sides=6,pigment=2,tilt=(.08,.06))
 mass('CragProwB',(-.52,-.33),.21,[(.1,1),(.4,.9),(.56,.78)],16,sides=5,turn=.4,pigment=1,tilt=(-.06,.05))
 scatter('Crag',1,7,3,1,14)
 saddle(21,(-.08,.05))

def crag1():
 # The twin: two summits, one lower, with a deep notch between them.
 mass('CragBase',(0,0),.78,[(0,1),(.16,.95),(.32,.88)],31,sides=8,apron=.06,stretch=1.08,pigment=0,tilt=(-.02,.03),cap='rock')
 mass('CragStepA',(0,.03),.60,[(.15,1),(.42,.92),(.62,.84)],32,sides=8,turn=.3,stretch=1.25,pigment=1,tilt=(.03,.03))
 mass('CragPeak',(-.34,.06),.38,[(.45,1),(.9,.8),(1.22,.58)],34,sides=6,lean=(-.03,.02),tilt=(.06,-.08),pigment=2,snow=1.05)
 mass('CragHorn',(-.37,.09),.27,[(1.0,1),(1.3,.72),(1.6,.3)],37,sides=5,turn=.4,bevel=.03,lean=(-.04,.02),tilt=(-.28,.12),rough=.18,pigment=3,cap='rock',snow=1.25)
 mass('CragPeakB',(.37,-.02),.34,[(.45,1),(.86,.8),(1.16,.52),(1.36,.26)],35,sides=6,turn=.5,bevel=.03,lean=(.05,.02),tilt=(.2,.1),rough=.16,pigment=3,cap='rock',snow=1.08)
 mass('CragLedge',(.02,-.46),.25,[(.15,1),(.42,.9),(.56,.78)],36,sides=5,turn=.2,pigment=1,tilt=(.04,-.06))
 scatter('Crag',2,7,3,1,14)
 saddle(41,(.08,-.04))

def crag2():
 # The buttress: one long block that leans out over its foot. Its top is a
 # green ramp that climbs to the foot of the summit.
 mass('CragBase',(0,0),.78,[(0,1),(.18,.95),(.34,.88)],51,sides=8,apron=.06,stretch=1.08,pigment=0,tilt=(.02,.02),cap='rock')
 mass('CragStepA',(-.03,.0),.64,[(.15,1),(.34,.94),(.52,.86)],58,sides=7,turn=.6,stretch=1.1,pigment=1,tilt=(.03,-.03))
 mass('CragWedge',(-.05,.02),.48,[(.35,1),(.62,.96),(.9,.9)],52,sides=7,turn=.1,stretch=1.28,pigment=1,lean=(.13,0),tilt=(.24,0),ragged=.07)
 mass('CragPeak',(.12,.03),.36,[(.55,1),(1.0,.84),(1.34,.6)],54,sides=6,turn=.9,stretch=1.08,lean=(.07,.01),tilt=(.16,.04),pigment=2,cap='rock',snow=1.12)
 mass('CragHorn',(.19,.04),.25,[(1.05,1),(1.38,.72),(1.62,.28)],57,sides=5,turn=.2,bevel=.03,lean=(.05,.01),tilt=(.2,-.1),rough=.18,pigment=3,cap='rock',snow=1.26)
 mass('CragSpur',(-.10,-.46),.27,[(.2,1),(.6,.88),(.8,.68)],55,sides=6,turn=.5,pigment=2,tilt=(.07,-.05))
 mass('CragLedge',(-.34,.44),.25,[(.15,1),(.46,.9),(.6,.78)],56,sides=5,turn=.1,pigment=1,tilt=(-.08,-.06))
 scatter('Crag',3,7,3,1,14)
 saddle(61,(.04,.06))

for variant,build in enumerate([crag0,crag1,crag2]):
 reset();build();export('crag-'+str(variant))
