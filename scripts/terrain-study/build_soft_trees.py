"""Author the north-star trees: round, full crowns on short thick trunks.
Run Blender --background --python scripts/terrain-study/build_soft_trees.py.

The visual test of 2026-11-12 (docs/flags.md (nnnnnnn)) aims at Islanders and
Dorfromantik. Their trees are a few soft, overlapping rounded masses, not a
scalloped sculpt. These files sit beside the study's grove-sculpt and
cypress-sculpt files and replace nothing: `visualTest.northStar` in
data/view3d.json picks which set the renderer loads.
"""
import bpy, math, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'public'/'terrain-study'

def reset():
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
BARK=material('bark',(.30,.17,.08))
LEAVES=[material('leaf'+str(i),(.22+i*.023,.36+i*.018,.10+i*.012)) for i in range(4)]

def trunk(points,radii,n=9):
 verts=[];faces=[]
 for p,r in zip(points,radii):
  for i in range(n):
   a=i*math.tau/n;verts.append((p[0]+math.cos(a)*r,p[1]+math.sin(a)*r,p[2]))
 for j in range(len(points)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.append(tuple(range((len(points)-1)*n,len(points)*n)))
 mesh=bpy.data.meshes.new('trunk');mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new('Trunk',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(BARK)
 return obj

def crown(lobes,seed,triangles):
 """A few large rounded masses, fused and smoothed into one soft form."""
 pieces=[];rng=random.Random(seed)
 for pos,scale in lobes:
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=pos)
  obj=bpy.context.object;obj.scale=scale;pieces.append(obj)
  for v in obj.data.vertices:v.co*=rng.uniform(.975,1.025)
 bpy.ops.object.select_all(action='DESELECT')
 for obj in pieces:obj.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();obj=bpy.context.object
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=obj.modifiers.new('Fuse','REMESH');mod.mode='VOXEL';mod.voxel_size=.045
 bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=obj.modifiers.new('Round','SMOOTH');mod.factor=1.0;mod.iterations=14
 bpy.ops.object.modifier_apply(modifier=mod.name)
 obj.data.calc_loop_triangles();tris=len(obj.data.loop_triangles)
 mod=obj.modifiers.new('Planes','DECIMATE');mod.ratio=min(1,triangles/max(1,tris));mod.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=mod.name)
 for m in LEAVES:obj.data.materials.append(m)
 zs=[(obj.matrix_world@p.center).z for p in obj.data.polygons];low,high=min(zs),max(zs)
 for p in obj.data.polygons:
  p.use_smooth=False
  c=obj.matrix_world@p.center;t=(c.z-low)/max(1e-6,high-low)
  # Two broad bands of pigment: the underside darker, the top lighter, with a
  # slow wave in the line between them so it is not a ruled ring.
  p.material_index=max(0,min(3,int(t*3.2+math.sin(c.x*2.2+c.y*1.7)*.28)))
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
    # A softer cavity than the study's: the round masses carry the form.
    ao=max(.62,1-occlusion/8*.5);attr.data[li].color=(ao,ao,ao,1)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_vertex_color='ACTIVE')
 print('ASSET',name,'triangles',len(faces),flush=True)

GROVES=[
 # One big round mass with three smaller ones leaning out of it.
 [((0,0,1.08),(.60,.56,.50)),((-.36,.08,.94),(.38,.36,.33)),((.34,-.06,1.0),(.40,.37,.35)),((.02,.05,1.44),(.38,.36,.33))],
 # A wide, low crown of three.
 [((-.27,0,.98),(.50,.46,.41)),((.30,.05,1.02),(.49,.45,.41)),((.0,-.08,1.34),(.45,.43,.37))],
 # A taller crown of three stacked masses.
 [((0,0,1.0),(.48,.46,.45)),((.06,.03,1.42),(.41,.39,.39)),((-.04,-.02,1.76),(.29,.28,.29))],
]
for variant,lobes in enumerate(GROVES):
 reset()
 lean=[-.03,.04,.01][variant]
 trunk([(0,0,0),(lean*.5,0,.3),(lean,0,.75)],[.135,.10,.075])
 crown(lobes,variant+11,900);export('grove-soft-'+str(variant))

for variant in range(2):
 reset();trunk([(0,0,0),(.01,0,.5)],[.07,.045])
 # A plump teardrop: full at the shoulder, with only a slight lean and waver.
 rings=[(.12,.11),(.26,.25),(.48,.31),(.74,.30),(1.0,.25),(1.26,.18),(1.50,.10),(1.70,.012)]
 v=[];f=[];n=14
 for j,(z,r) in enumerate(rings):
  for i in range(n):
   a=i*math.tau/n;rr=r*(1+.05*math.sin(i*2.3+j*.55+variant));v.append((math.cos(a)*rr+.02*math.sin(z*2+variant),math.sin(a)*rr,z))
 for j in range(len(rings)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.append(tuple(range((len(rings)-1)*n,len(rings)*n)))
 m=bpy.data.meshes.new('Plump cypress');m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new('Cypress',m);bpy.context.collection.objects.link(o);o.data.materials.append(LEAVES[0]);export('cypress-soft-'+str(variant))
