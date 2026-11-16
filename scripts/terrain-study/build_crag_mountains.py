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

The rocks at the foot (the user, 2026-11-16: "rocks at the base that feel too
evenly distributed, pointed outward radially"). `fallen` lays them as rock
that fell and gathered: a few groups of different size where a wall stands
high above, a bare stretch, and one or two strays lower down. Each rock has
its own size, shape, turn and tip. A rib also turns a face outward now, each
by its own amount, where it turned a corner straight out before.
`--old-rocks` after `--` on the command line builds the arrangement of before
(three blocks of one size, and ribs with a corner out) and writes the old file
names, `crag-0.glb` to `crag-4.glb`. Without it the files are
`crag-fallen-0.glb` to `crag-fallen-4.glb`. `NORTH_STAR_FALLEN_ROCKS` in
src/terrainStudy/northStarTrees.js picks which files the renderer loads.
After a build, run `node scripts/terrain-study/build_asset_bundle.mjs`.
"""
import bpy, bmesh, math, random, sys
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'public'/'terrain-study'
OLD_ROCKS='--old-rocks' in (sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])

def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
# The renderer keeps only the light and dark of the stones and gives the rock
# its colour, so they are greys: darker low down, lighter toward the summit.
STONE=[material('stone'+str(i),(v,v,v)) for i,v in enumerate([.46,.54,.62,.72])]
# The cap of a ledge is dark under the ground's colour, so a ledge is a little
# darker and browner than the open ground and still shows on sand.
LEDGE=material('stoneLedge',(.2,.2,.2))
# These keep their own colour on every terrain.
SNOW=material('snow',(.93,.95,1.))
SCREE=material('scree',(.40,.36,.31))
PINE=material('pine',(.045,.17,.11))
BARK=material('bark',(.30,.17,.08))
LEAVES=[material('leaf'+str(i),(.22+i*.023,.36+i*.018,.10+i*.012)) for i in range(4)]

def mass(name,centre,radius,profile,seed,sides=7,turn=0.,stretch=1.,bevel=.045,tilt=(0,0),lean=(0,0),apron=0.,rough=.14,ragged=.05,pigment=1,cap='ledge',snow=None,stone=None):
 """One block of rock: an uneven ring of walls under a level cap.

 `profile` is a list of (height, width) pairs from the foot up; width is a
 share of `radius`. `apron` adds a low slope round the foot. `tilt` tips the
 cap, and `lean` moves each ring sideways as it rises: a lean larger than the
 block's narrowing makes an overhang on that side. The corners of each ring
 move in and out on their own, and the rings between foot and cap rise and
 fall by `ragged`, so a wall breaks into a few large uneven facets and no two
 blocks match. `cap` is 'ledge' for a cap that may carry green and 'rock' for
 a bare one. Above the height `snow`, the cap and the faces that are not too
 steep are snow; the line moves up or down a little from face to face, so
 its lower edge is uneven. `stone` gives the block another material.
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
 for m in (stone or STONE[pigment],LEDGE,SNOW):obj.data.materials.append(m)
 for p in obj.data.polygons:
  p.use_smooth=False;last=p.index==len(obj.data.polygons)-1
  if snow is not None and (p.center.z>snow-.12 if last else p.center.z>snow+rng.uniform(-.16,.16) and p.normal.z>.2):p.material_index=2
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

def boulder(name,pos,size,seed,stand=1.):
 """One block of scree: a small block of rock that lies at the foot, partly in the ground."""
 x,y,z=pos;rng=random.Random(seed)
 return mass(name,(x,y),size,[(z-.03,1),(z+size*.55*stand,.94),(z+size*.95*stand,.62)],seed,sides=4,turn=rng.uniform(0,math.tau),
  stretch=rng.uniform(.85,1.2),bevel=size*.16,tilt=(rng.uniform(-.25,.25),rng.uniform(-.25,.25)),rough=.22,ragged=0,cap='rock',stone=SCREE)

def rock(name,pos,size,seed,kind,yaw,tip,toward):
 """One fallen rock, lying partly in the ground.

 `kind` is 'block' (about as high as wide), 'slab' (long and low), 'round'
 (five sides, widest in the middle) or 'chip' (a small stone of few faces).
 The rock is turned by `yaw` about the upright, then tipped by `tip` toward
 the direction `toward`, so a rock can lean on its neighbour. Its lowest
 ring is under the ground, so no gap shows on a slope.
 """
 rng=random.Random(seed)
 sides,long,high,rings={'block':(rng.choice((4,5)),rng.uniform(1.,1.3),rng.uniform(.75,1.05),((-.5,1.),(.5,.98),(1.,.62))),
  'slab':(rng.choice((4,5)),rng.uniform(1.5,1.9),rng.uniform(.32,.46),((-.9,1.),(.55,1.),(1.,.8))),
  'round':(5,rng.uniform(1.,1.2),rng.uniform(.7,.85),((-.4,.78),(.45,1.),(1.,.5))),
  'chip':(rng.choice((3,4,4)),rng.uniform(1.,1.25),rng.uniform(.55,.8),((-.6,1.),(1.,.6)))}[kind]
 angles=[(i+rng.uniform(-.3,.3))*math.tau/sides for i in range(sides)];spoke=[1+rng.uniform(-.2,.2) for _ in range(sides)]
 shift=(rng.uniform(-.18,.18)*size,rng.uniform(-.18,.18)*size)
 axis=Vector((-math.sin(toward),math.cos(toward),0));verts=[]
 for j,(z,width) in enumerate(rings):
  t=j/(len(rings)-1)
  for a,k in zip(angles,spoke):
   r=size*width*k*(1+(rng.uniform(-.08,.08) if 0<j else 0))
   v=Vector((math.cos(a)*r*long+shift[0]*t,math.sin(a)*r/math.sqrt(long)+shift[1]*t,z*size*high+(rng.uniform(-.1,.1)*size*high if j==len(rings)-1 else 0)))
   v.rotate(Matrix.Rotation(yaw,3,'Z'));v.rotate(Matrix.Rotation(tip,3,axis))
   verts.append((pos[0]+v.x,pos[1]+v.y,pos[2]+v.z))
 n=sides;faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(rings)-1) for i in range(n)]
 faces.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
 return solid(name,verts,faces,SCREE)

def fallen(prefix,seed,look,top,groups,strays):
 """Lay the rocks at the foot as rock that fell from the walls and gathered.

 `look` looks straight down on the mountain. First the foot is read in 72
 directions: where the first wall stands, and how high the rock is just
 behind it. A high wall drops more rock, so a group starts there more often.
 The back of the mountain is never seen on the board, so it gets none.
 `groups` gives the number of rocks in each group, largest first. A group is
 one large rock against the wall and smaller ones beside it and on its
 downhill side, each touching one already laid. `strays` single rocks lie
 further down the slope, away from every group.
 """
 rng=random.Random(seed*67+5);N=72;foot=[]
 def height(x,y):
  loc,_=look(x,y);return loc.z if loc is not None else 0.
 for k in range(N):
  a=k*math.tau/N;c,s=math.cos(a),math.sin(a);r=.8;wall=None
  while r>.3:
   if height(c*(r-.03),s*(r-.03))-height(c*r,s*r)>.1:wall=r;break
   r-=.02
  if wall is None:foot.append((a,0,0));continue
  drop=max(height(c*(wall-.08),s*(wall-.08)),.7*height(c*(wall-.24),s*(wall-.24)))-height(c*wall,s*wall)
  seen=min(1.,max(0.,(.5-s)/.5))
  foot.append((a,wall,max(0.,drop)**1.5*seen))
 placed=[];count=0
 def ground(x,y,size):
  # Open slope: not on a wall, not on a ledge above the foot, and inside the model's circle.
  if math.hypot(x,y)+size*.8>.8:return None
  loc,normal=look(x,y)
  if loc is None:return Vector((x,y,0)) if look(x*.9,y*.9)[0] is not None else None
  if loc.z>top*.2 or normal.z<.55:return None
  for k in range(4):
   other,_=look(x+math.cos(k*math.tau/4)*size*.5,y+math.sin(k*math.tau/4)*size*.5)
   if other is not None and other.z-loc.z>.12:return None
  return loc
 def lay(x,y,size,loc,lean=None):
  nonlocal count;count+=1
  kind='chip' if size<.062 else rng.choices(('block','slab','round'),(5,3,2))[0]
  if lean is None:tip,toward=rng.uniform(.05,.3),rng.uniform(0,math.tau)
  else:tip,toward=rng.uniform(.15,.38),lean
  # A rock on a slope sinks a little more, so its downhill edge is still in the ground.
  placed.append((x,y,size))
  rock(prefix+'Scree'+str(count),(x,y,loc.z-size*(.1+.25*math.sin(tip))),size,seed*71+count,kind,rng.uniform(0,math.tau),tip,toward)
 anchors=[]
 for g,number in enumerate(groups):
  for _ in range(400):
   a,wall,_=rng.choices(foot,[f[2] for f in foot])[0]
   # The groups stand unevenly apart: each needs its own distance from the others.
   apart=rng.uniform(.75,1.5)
   if any(abs((a-b+math.pi)%math.tau-math.pi)<apart for b in anchors):continue
   size=rng.uniform(.125,.155)*(1.,.74,.6,.5)[min(g,3)]
   a+=rng.uniform(-.04,.04);r=wall+size*rng.uniform(.5,.75);x,y=math.cos(a)*r,math.sin(a)*r
   loc=ground(x,y,size)
   if loc is None:continue
   anchors.append(a);lay(x,y,size,loc);group=[(x,y,size)]
   for i in range(number-1):
    for _ in range(200):
     px,py,ps=rng.choices(group,[m[2]**2 for m in group])[0]
     small=ps*rng.uniform(.35,.7) if i else ps*rng.uniform(.5,.75)
     small=max(.03,small)
     # Beside or below the rock it touches: seldom between it and the wall.
     out=math.atan2(py,px);b=out+rng.uniform(-1.9,1.9);d=ps*.72+small*.6
     x,y=px+math.cos(b)*d,py+math.sin(b)*d
     if any((x-qx)**2+(y-qy)**2<((qs+small)*.74)**2 for qx,qy,qs in placed if (qx,qy)!=(px,py)):continue
     loc=ground(x,y,small)
     if loc is None:continue
     lay(x,y,small,loc,math.atan2(py-y,px-x) if rng.random()<.6 else None);group.append((x,y,small));break
   break
 for _ in range(strays):
  for _ in range(400):
   a,wall,weight=rng.choice(foot)
   if not wall or weight<=0 or any(abs((a-b+math.pi)%math.tau-math.pi)<.38 for b in anchors):continue
   # Not far from a group: a rock that rolled on. The stretch with no group stays bare.
   if not any(abs((a-b+math.pi)%math.tau-math.pi)<.8 for b in anchors):continue
   size=rng.uniform(.04,.085);r=wall+rng.uniform(.1,.24);x,y=math.cos(a)*r,math.sin(a)*r
   if any((x-qx)**2+(y-qy)**2<(qs+size+.08)**2 for qx,qy,qs in placed):continue
   loc=ground(x,y,size)
   if loc is None:continue
   lay(x,y,size,loc);break
 print('ROCKS',prefix,seed,'groups at',[round(math.degrees(a)) for a in anchors],'rocks',len(placed),flush=True)

def scatter(prefix,seed,shrubs,pines,rounds,scree,stand=1.,rocks=None):
 """Stand shrubs and small trees on the ledges of the rock, and blocks of scree at its foot.

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
  # Most stand on the side the board is seen from, where they show.
  if y>.2 and rng.random()<.75:continue
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
 if rocks and not OLD_ROCKS:fallen(prefix,seed,look,top,*rocks);return
 heap=[]
 for _ in range(4000):
  if not scree:break
  r=rng.uniform(.5,.8);a=rng.uniform(0,math.tau);x,y=math.cos(a)*r,math.sin(a)*r
  # The blocks lie on the side the board is seen from, and some in pairs.
  if heap and rng.random()<.4:
   hx,hy=rng.choice(heap);d=rng.uniform(.14,.2);x,y=hx+math.cos(a)*d,hy+math.sin(a)*d
   if x*x+y*y>.8**2:continue
  if y>.3:continue
  loc,normal=look(x,y)
  # On the open ground just clear of the rock, on the apron, or on the bare footing.
  if loc is not None and (loc.z>top*.24 or (loc.z>.05 and normal.z<.9)):continue
  if loc is None and look(x*.93,y*.93)[0] is None and look(x*.86,y*.86)[0] is None:continue
  size=rng.uniform(.075,.12)
  if not free(x,y,size):continue
  count+=1;scree-=1;placed.append((x,y,size));heap.append((x,y))
  boulder(prefix+'Scree'+str(count),(x,y,loc.z if loc is not None else 0),size,seed*43+count,stand)

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

def details(prefix,seed,ribs,ledges,snow):
 """Break the large faces of the rock: ribs that run down a face, and small ledges cut into it.

 Looks at the blocks from the front and from the right, the sides the board
 and its sun see, and works where it finds a steep face. A rib is a narrow
 block that leans on the face from the ground up, with a sloping top. A
 ledge is a small shelf at some height under the snow line `snow`; some are
 level, and the loader turns a level one green, and the rest slope and stay
 bare rock.
 """
 rng=random.Random(seed);verts=[];faces=[]
 for o in [o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(prefix)]:
  o.data.calc_loop_triangles();base=len(verts)
  verts.extend(v.co.copy() for v in o.data.vertices)
  faces.extend(tuple(base+i for i in t.vertices) for t in o.data.loop_triangles)
 bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True);top=max(v.z for v in verts)
 def face(a,z,side=0.):
  d=Vector((math.cos(a),math.sin(a),0));across=Vector((-d.y,d.x,0))
  loc,normal,_,_=bvh.ray_cast(d*2+across*side+Vector((0,0,z)),-d)
  return (loc,d) if loc is not None and abs(normal.z)<.5 and normal.dot(d)>.35 else (None,d)
 placed=[]
 def free(loc,gap):return all((loc-other).length>gap for other in placed)
 count=0
 for _ in range(600):
  if not ribs:break
  a=rng.uniform(math.radians(-175),math.radians(35));loc,d=face(a,.14,rng.uniform(-.4,.4))
  if loc is None or not free(loc,.3):continue
  # The rib is as high as the face behind it stays close.
  height=0
  for h in (1.0,.85,.7,.55):
   above,_=face(a,h*.9,(loc-d*loc.dot(d)).dot(Vector((-d.y,d.x,0))))
   if above is not None and (Vector((above.x-loc.x,above.y-loc.y,0))).length<.17:height=h;break
  if not height:continue
  count+=1;ribs-=1;placed.append(loc);size=rng.uniform(.11,.15);pigment=rng.choice((1,2,3));turn=a
  if not OLD_ROCKS:
   # A rib stood with one corner straight out, like a pointer. Now a face looks
   # out, turned by its own amount, and the ribs differ in size. `own` is a
   # second source of numbers, so the ledges that follow stay where they were.
   own=random.Random(seed*61+count);turn=a+math.pi/4+own.uniform(-.5,.5);size*=own.uniform(.75,1.3);height=min(height,height*own.uniform(.7,1.1))
  mass(prefix+'Rib'+str(count),(loc.x-d.x*size*.2,loc.y-d.y*size*.2),size,[(.02,1.15),(height*.6,.9),(height,.5)],seed*53+count,sides=4,turn=turn,
   bevel=.02,tilt=(-d.x*.6,-d.y*.6),rough=.18,ragged=.06,pigment=pigment,cap='rock',snow=snow)
 for _ in range(1500):
  if not ledges:break
  a=rng.uniform(math.radians(-175),math.radians(35));loc,d=face(a,rng.uniform(.34,snow-.12),rng.uniform(-.5,.5))
  if loc is None or not free(loc,.24):continue
  count+=1;ledges-=1;placed.append(loc);size=rng.uniform(.1,.15);level=rng.random()<.4
  mass(prefix+'Shelf'+str(count),(loc.x-d.x*size*.3,loc.y-d.y*size*.3),size,[(loc.z-size*1.2,.5),(loc.z,1)],seed*59+count,sides=4,turn=a+math.pi/4+rng.uniform(-.2,.2),
   bevel=.018,tilt=(0,0) if level else (-d.x*.5,-d.y*.5),rough=.14,ragged=0,pigment=rng.choice((1,2)),cap='ledge' if level else 'rock',snow=snow)

def saddle(seed,block):
 # Drawn tall because the renderer squashes it to about a third: a low
 # footing with one block of rock on it.
 mass('SaddleBase',(0,0),.78,[(0,1),(.3,.93),(.6,.84)],seed,sides=8,apron=.06,stretch=1.05,pigment=0,bevel=.05,ragged=.08)
 mass('SaddleBlock',block,.50,[(.3,1),(.95,.84),(1.45,.6)],seed+1,sides=6,turn=seed*.37,stretch=1.25,pigment=2,bevel=.05,tilt=(.1,.06),ragged=.1,cap='rock')
 scatter('Saddle',seed,2,0,0,1,stand=2.6)

def skirt(seed,stretch=1.):
 # The low slope every mountain stands on. It takes the ground's colour at its edge.
 mass('CragBase',(0,0),.78,[(0,1),(.1,.9),(.3,.6)],seed,sides=8,apron=.07,stretch=stretch,pigment=0,cap='rock')

def finish(seed,snow,ribs=3,ledges=6,rocks=((5,3),1)):
 # `rocks` is the mountain's own arrangement at the foot: the size of each group, and the number of strays.
 details('Crag',seed,ribs,ledges,snow)
 scatter('Crag',seed,5,3,1,3,rocks=rocks)
 saddle(seed*20+1,((seed%3-1)*.08,.05))

# The board is seen from the south, which is -y here, with its sun in the east,
# which is +x. A mountain is set down facing between the two
# (`createMountainRanges`), so each model is composed for that view: its high
# sheer face is at the front right, and its green terraces step down toward the
# front left. The blocks stand upright. A mountain gets its form from its
# proportions: a broad lower block, narrower blocks on it, and one summit
# clearly higher than its shoulders.
# Heights: the foot is 0 and the tallest summit 1.62, a little under the old
# models' tallest block (1.64).
def crag0():
 # The great crag: the summit stands over the sheer east face, with a
 # shoulder behind it, and three terraces step down to the west.
 skirt(11)
 mass('CragTier1',(-.04,.02),.60,[(.02,1),(.3,.96),(.52,.9)],12,sides=8,turn=.5,stretch=1.1,pigment=1,tilt=(-.03,.03))
 mass('CragTier2',(.12,.10),.42,[(.02,1),(.6,.95),(.95,.86)],13,sides=6,turn=.2,pigment=2,tilt=(.04,-.03))
 mass('CragSummit',(.24,.06),.27,[(.5,1),(1.2,.86),(1.45,.6),(1.62,.3)],15,sides=5,turn=.8,bevel=.03,lean=(.02,-.02),tilt=(.12,-.08),rough=.18,ragged=.08,pigment=3,cap='rock',snow=1.28)
 mass('CragShoulder',(.02,.22),.24,[(.5,1),(1.05,.88),(1.26,.56)],16,sides=5,turn=.3,bevel=.03,tilt=(-.2,.1),rough=.18,pigment=2,cap='rock',snow=1.2)
 mass('CragStep',(-.42,-.22),.25,[(.02,1),(.5,.95),(.72,.86)],17,sides=5,turn=.4,pigment=1,tilt=(-.05,.04))
 finish(1,1.25,rocks=((5,2,2),1))

def crag1():
 # The twin: two upright summits, one lower, on one broad block, with a
 # cleft between them down to its green top.
 skirt(31,1.08)
 mass('CragTier1',(0,.02),.60,[(.02,1),(.3,.96),(.5,.9)],32,sides=8,turn=.3,stretch=1.2,pigment=1,tilt=(.03,.03))
 mass('CragPeakL',(-.35,.04),.32,[(.02,1),(.7,.93),(1.1,.8)],34,sides=6,pigment=2,tilt=(-.05,.04))
 mass('CragSummitL',(-.38,.06),.22,[(.6,1),(1.3,.84),(1.62,.34)],37,sides=5,turn=.4,bevel=.03,tilt=(-.14,-.08),rough=.18,ragged=.08,pigment=3,cap='rock',snow=1.3)
 mass('CragPeakR',(.37,.0),.30,[(.02,1),(.6,.93),(.9,.8)],35,sides=6,turn=.5,pigment=2,tilt=(.05,.03))
 mass('CragSummitR',(.40,.02),.2,[(.5,1),(1.05,.84),(1.3,.36)],38,sides=5,turn=.1,bevel=.03,tilt=(.14,-.06),rough=.18,ragged=.08,pigment=3,cap='rock',snow=1.14)
 mass('CragBack',(0,.36),.26,[(.02,1),(.55,.94),(.8,.84)],36,sides=5,turn=.2,pigment=1,tilt=(.04,-.06))
 finish(2,1.2,rocks=((4,3),2))

def crag2():
 # The horn: four blocks, each narrower than the one under it, to one
 # summit in the middle. The steps are wider at the front.
 skirt(51)
 mass('CragTier1',(0,.04),.66,[(.02,1),(.28,.95),(.46,.89)],52,sides=8,turn=.6,pigment=1,tilt=(.02,-.03))
 mass('CragTier2',(.03,.10),.50,[(.02,1),(.6,.93),(.86,.83)],53,sides=6,turn=.1,pigment=2,tilt=(-.04,.03))
 mass('CragTier3',(.06,.14),.35,[(.4,1),(1.0,.9),(1.24,.76)],54,sides=6,turn=.7,bevel=.035,pigment=2,tilt=(.05,.04),snow=1.2)
 mass('CragSummit',(.08,.15),.23,[(.8,1),(1.4,.8),(1.62,.3)],57,sides=5,turn=.2,bevel=.03,tilt=(.12,-.1),rough=.18,ragged=.08,pigment=3,cap='rock',snow=1.3)
 finish(3,1.22,ribs=4,ledges=7,rocks=((6,2),1))

def crag3():
 # The table and tower: one wide high block with a sheer wall all round and
 # a green top, and a tower with a shoulder at the back of it.
 skirt(71,1.06)
 mass('CragTable',(-.06,-.04),.56,[(.02,1),(.5,.97),(.9,.93)],72,sides=8,turn=.3,stretch=1.15,pigment=1,tilt=(.03,.02),ragged=.07)
 mass('CragTower',(.26,.16),.27,[(.5,1),(1.2,.9),(1.42,.7),(1.58,.36)],74,sides=5,turn=.6,bevel=.03,tilt=(.12,-.06),rough=.18,ragged=.08,pigment=3,cap='rock',snow=1.3)
 mass('CragShoulder',(.04,.24),.22,[(.5,1),(1.1,.88),(1.24,.6)],75,sides=5,turn=.1,bevel=.03,tilt=(-.2,.08),rough=.18,pigment=2,cap='rock',snow=1.22)
 mass('CragStep',(.46,-.28),.24,[(.02,1),(.4,.95),(.56,.87)],76,sides=5,turn=.5,pigment=2,tilt=(.05,-.04))
 finish(4,1.25,rocks=((3,3,2),1))

def crag4():
 # The ridge: four upright teeth in a row, the third the highest, behind one
 # long green terrace.
 skirt(91,1.1)
 for i,(x,y,r,h,snow) in enumerate([(-.42,.02,.27,1.0,None),(-.14,.05,.30,1.3,1.16),(.16,.02,.30,1.62,1.28),(.44,.05,.25,1.12,None)]):
  mass('CragTooth'+str(i),(x,y),r,[(.02,1),(h*.55,.9),(h*.85,.66),(h,.34)],92+i,sides=5,turn=i*.7,bevel=.03,tilt=((i-1.5)*.08,-.08),rough=.18,ragged=.08,pigment=2+i%2,cap='rock',snow=snow)
 mass('CragTerrace',(-.02,-.27),.36,[(.02,1),(.3,.96),(.5,.9)],97,sides=7,turn=.2,stretch=1.7,pigment=1,tilt=(.03,-.02))
 finish(5,1.2,ribs=2,rocks=((5,1,1),2))

for variant,build in enumerate([crag0,crag1,crag2,crag3,crag4]):
 reset();build();export(('crag-' if OLD_ROCKS else 'crag-fallen-')+str(variant))
