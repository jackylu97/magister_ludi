"""Author coherent tree crowns and jointed rock formations for the terrain study.
Run Blender --background --python scripts/terrain-study/build_landscape_assets.py.
The old study assets are retained for comparison.
"""
import bpy, bmesh, math, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'public'/'terrain-study'

def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
BARK=material('bark',(.24,.115,.045))
LEAVES=[material('leaf'+str(i),(.22+i*.023,.36+i*.018,.10+i*.012)) for i in range(4)]
STONE=[material('stone'+str(i),c) for i,c in enumerate([(.45,.48,.55),(.52,.54,.59),(.40,.45,.53),(.49,.50,.53)])]

def branch(points,radii):
 verts=[];faces=[];n=7
 for p,r in zip(points,radii):
  for i in range(n):
   a=i*math.tau/n;verts.append((p[0]+math.cos(a)*r,p[1]+math.sin(a)*r,p[2]))
 for j in range(len(points)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.append(tuple(range((len(points)-1)*n,len(points)*n)))
 mesh=bpy.data.meshes.new('bent branch');mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new('Branch',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(BARK)
 return obj

def crown(lobes,seed):
 pieces=[];rng=random.Random(seed)
 for pos,scale in lobes:
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=pos)
  obj=bpy.context.object;obj.scale=scale;pieces.append(obj)
  for v in obj.data.vertices:v.co*=rng.uniform(.93,1.07)
 bpy.ops.object.select_all(action='DESELECT')
 for obj in pieces:obj.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();obj=bpy.context.object
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 # Voxel union removes intersecting sphere outlines. Collapse gives broad
 # asymmetric facets while keeping the connected, scalloped crown silhouette.
 mod=obj.modifiers.new('Sculpt a single canopy','REMESH');mod.mode='VOXEL';mod.voxel_size=.065
 bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=obj.modifiers.new('Soften the union','SMOOTH');mod.factor=1.0;mod.iterations=3
 bpy.ops.object.modifier_apply(modifier=mod.name)
 obj.data.calc_loop_triangles();tris=len(obj.data.loop_triangles)
 mod=obj.modifiers.new('Broad sculpted planes','DECIMATE');mod.ratio=min(1,440/max(1,tris));mod.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=mod.name)
 for m in LEAVES:obj.data.materials.append(m)
 for p in obj.data.polygons:
  p.use_smooth=False
  c=obj.matrix_world@p.center
  # Regions share pigment; random per-face colours would look like confetti.
  p.material_index=max(0,min(3,int((c.z-.75)*1.4+math.sin(c.x*3+c.y*2)*.35)))
 return obj

def export(name):
 bpy.context.view_layer.update()
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];verts=[];faces=[]
 for o in objects:
  o.data.calc_loop_triangles();base=len(verts)
  verts.extend(o.matrix_world@v.co for v in o.data.vertices)
  faces.extend(tuple(base+i for i in t.vertices) for t in o.data.loop_triangles)
 bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True)
 for o in objects:
  attr=o.data.color_attributes.new(name='cavity',type='FLOAT_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
  for p in o.data.polygons:
   n=(o.matrix_world.to_3x3().inverted().transposed()@p.normal).normalized();axis=n.cross(Vector((0,0,1)))
   if axis.length<.01:axis=n.cross(Vector((0,1,0)))
   axis.normalize();second=n.cross(axis)
   for li in p.loop_indices:
    point=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;origin=point+n*.012;occlusion=0
    for k in range(8):
     a=k*2.39996;u=(k+.5)/8;direction=(n*math.sqrt(1-u)+axis*math.cos(a)*math.sqrt(u)+second*math.sin(a)*math.sqrt(u)).normalized()
     hit,_,_,dist=bvh.ray_cast(origin,direction,.38)
     if hit is not None:occlusion+=1-dist/.38
    ao=max(.45,1-occlusion/8*.65);attr.data[li].color=(ao,ao,ao,1)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_vertex_color='ACTIVE')
 print('ASSET',name,'triangles',len(faces),flush=True)

import sys
ROCKS_ONLY='--rocks-only' in sys.argv
for variant in ([] if ROCKS_ONLY else range(3)):
 reset();rng=random.Random(variant+53)
 bend=[-.10,.14,.035][variant]
 branch([(0,0,0),(.035,-.015,.18),(bend,.04,.62),(bend*.7,.05,.95)],[.115,.085,.06,.03])
 for i,a in enumerate([.4,2.5,4.4]):
  dx,dy=math.cos(a)*.38,math.sin(a)*.32
  branch([(bend,.04,.48),(dx*.65,dy*.65,.86),(dx,dy,1.12)],[.052,.032,.008])
 for a in [.2,2.3,4.5]:
  branch([(math.cos(a)*.19,math.sin(a)*.19,.01),(0,0,.19)],[.027,.067])
 if variant==0:lobes=[((-.29,.06,1.05),(.42,.36,.38)),((.30,.11,1.08),(.45,.34,.40)),((-.03,-.26,1.18),(.39,.37,.40)),((-.17,.08,1.44),(.41,.35,.42)),((.20,.05,1.50),(.32,.31,.36)),((-.46,-.05,1.26),(.25,.24,.26))]
 elif variant==1:lobes=[((-.33,.02,1.04),(.44,.39,.34)),((.33,.10,.96),(.43,.34,.32)),((.1,-.30,1.16),(.48,.32,.36)),((.06,.04,1.38),(.46,.39,.35)),((-.32,.27,1.29),(.34,.32,.31))]
 else:lobes=[((-.21,.1,1.03),(.36,.34,.42)),((.23,-.12,1.20),(.40,.35,.43)),((-.17,-.16,1.40),(.34,.33,.40)),((.04,.10,1.63),(.32,.29,.35)),((.39,.08,1.31),(.25,.26,.29))]
 crown(lobes,variant+73);export('grove-sculpt-'+str(variant))

for variant in ([] if ROCKS_ONLY else range(2)):
 reset();branch([(0,0,0),(.015,0,.6)],[.053,.025])
 # The profile is articulated, with a swept tip and broad longitudinal planes.
 rings=[(.12,.12),(.23,.24),(.46,.27),(.67,.23),(.85,.225),(1.10,.15),(1.36,.09),(1.65,.01)]
 v=[];f=[];n=10
 for j,(z,r) in enumerate(rings):
  for i in range(n):
   a=i*math.tau/n;rr=r*(1+.16*math.sin(i*2.3+j*.55+variant));v.append((math.cos(a)*rr+.045*math.sin(z*2+variant),math.sin(a)*rr,z+.025*math.sin(i*2+j)))
 for j in range(len(rings)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
 m=bpy.data.meshes.new('Swept cypress');m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new('Cypress',m);bpy.context.collection.objects.link(o);o.data.materials.append(LEAVES[0]);export('cypress-sculpt-'+str(variant))

def block(pos,scale,seed,pigment):
 rng=random.Random(seed)
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 b=o.modifiers.new('Broken stone corners','BEVEL');b.width=min(scale)*.19;b.segments=1
 bpy.ops.object.modifier_apply(modifier=b.name)
 # Large fracture planes remove the architectural box tops. Every piece has
 # a sloping shoulder and off-centre crown, with a few broad unbroken faces.
 bm=bmesh.new();bm.from_mesh(o.data)
 sx,sy,sz=scale
 for point,normal in [((sx*.18,sy*.08,sz*.24),(.75,.22,.57)),((-sx*.22,-sy*.10,sz*.35),(-.65,-.25,.61)),((sx*.24,-sy*.25,0),(.48,-.86,.08))]:
  result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=point,plane_no=normal,clear_outer=True,clear_inner=False)
  boundary=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_boundary]
  if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 for v in o.data.vertices:
  x,y,z=v.co
  v.co.x+=z*(.10+rng.random()*.05)+y*.09
  v.co.y+=z*.035+x*.08
  v.co.z+=x*.15-y*.08
 o.data.update()
 o.rotation_euler.z=rng.uniform(-.3,.3);o.data.materials.append(STONE[pigment%4]);return o
for variant in range(3):
 reset();rng=random.Random(variant+93)
 blocks=[((-.15,.04,.74),(.69,.74,1.48)),((.23,.13,.52),(.59,.65,1.04)),((-.40,-.16,.39),(.49,.53,.78)),((.29,-.31,.25),(.43,.48,.50)),((-.03,-.40,.19),(.39,.39,.38)),((.45,.29,.16),(.30,.35,.32)),((-.49,.27,.19),(.35,.38,.38))]
 for i,(pos,scale) in enumerate(blocks):
  x,y,z=pos;sx,sy,sz=scale
  if variant==1:x,y=y*.92,x;sz*=1.0 if i else 1.18;z=sz*.5
  if variant==2:x*=1.08;sz*=.86 if i<2 else 1.1;z=sz*.5
  block((x,y,z),(sx,sy,sz),i+variant*33,(i+variant)%4)
 for i in range(6):
  a=i*math.tau/6+.2;size=rng.uniform(.1,.2)
  block((math.cos(a)*.67,math.sin(a)*.62,size*.4),(size*1.25,size,size*.8),i+82,i)
 export('escarpment-'+str(variant))
