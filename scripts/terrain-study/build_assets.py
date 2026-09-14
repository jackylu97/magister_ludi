# Rebuild with: Blender --background --python scripts/terrain-study/build_assets.py
# Sculpted meshes and baked cavity colours; export remains fully instanced in the browser.
import bpy, math, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
out=Path(__file__).resolve().parents[2] / 'public' / 'terrain-study'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);return m
bark=mat('warm carved bark',(.32,.12,.035));leaf=[mat('leaf'+str(i),(.25+i*.035,.40+i*.02,.09)) for i in range(4)]
def branch(a,b,r1,r2):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=r1,radius2=r2,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(bark)
def canopy(pos,scale,index):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=pos);o=bpy.context.object;o.scale=scale;o.data.materials.append(leaf[index%4]);r=random.Random(index+21)
 for v in o.data.vertices:v.co*=1+r.uniform(-.09,.09)
 for p in o.data.polygons:p.use_smooth=False
 return o
def bake_and_export(name):
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];verts=[];faces=[]
 for o in objects:
  o.data.calc_loop_triangles();base=len(verts);verts += [o.matrix_world @ v.co for v in o.data.vertices];faces += [tuple(base+i for i in t.vertices) for t in o.data.loop_triangles]
 bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True)
 for o in objects:
  attr=o.data.color_attributes.new(name='cavity',type='FLOAT_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
  for poly in o.data.polygons:
   normal=(o.matrix_world.to_3x3().inverted().transposed()@poly.normal).normalized();axis=normal.cross(Vector((0,0,1)))
   if axis.length<.01:axis=normal.cross(Vector((0,1,0)))
   axis.normalize();second=normal.cross(axis)
   for li in poly.loop_indices:
    p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;origin=p+normal*.012;occlusion=0
    for k in range(12):
     a=k*2.39996;u=(k+.5)/12;direction=(normal*math.sqrt(1-u)+axis*(math.cos(a)*math.sqrt(u))+second*(math.sin(a)*math.sqrt(u))).normalized();hit,_,_,dist=bvh.ray_cast(origin,direction,.5)
     if hit is not None:occlusion+=1-dist/.5
    ao=max(.30,1-occlusion/12*.85)
    # Ground-facing parts remain richly shaded even under broad ambient fill.
    ao*=.78+.22*max(0,normal.z)
    attr.data[li].color=(ao,ao,ao,1)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_vertex_color='ACTIVE')
branch((0,0,0),(.02,0,.78),.13,.06)
for i,a in enumerate([.3,2.5,4.5]):branch((0,0,.40),(math.cos(a)*.30,math.sin(a)*.25,1.0),.05,.018)
for i,(pos,scale) in enumerate([((-.28,.05,1.01),(.39,.36,.39)),((.27,.1,1.09),(.40,.33,.38)),((.02,-.23,1.25),(.40,.34,.40)),((-.14,-.08,1.46),(.33,.28,.36)),((.12,.16,1.45),(.34,.30,.36)),((-.42,-.04,1.24),(.23,.23,.30))]):canopy(pos,scale,i)
bpy.context.view_layer.update();bake_and_export('grove-tree')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
branch((0,0,0),(0,0,.8),.06,.025)
v=[];f=[];n=9
for j,(z,r) in enumerate([(.08,.12),(.22,.27),(.52,.245),(.92,.18),(1.22,.105),(1.61,.015)]):
 for i in range(n):
  a=i/n*math.tau;rj=r*(1+.1*math.sin(i*3.2+j*.6));v.append((math.cos(a)*rj+.028*math.sin(z*3),math.sin(a)*rj,z+.018*math.sin(i*4+j)))
for j in range(5):
 for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
f.append(tuple(range(5*n,6*n)))
m=bpy.data.meshes.new('Long tapered planes');m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new('Cypress',m);bpy.context.collection.objects.link(o);o.data.materials.append(leaf[0]);bpy.context.view_layer.update();bake_and_export('cypress')

import bpy, random
from pathlib import Path
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.43))
o=bpy.context.object;o.scale=(.92,.73,.86);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bevel=o.modifiers.new('hand-chipped arris','BEVEL');bevel.width=.23;bevel.segments=1;bpy.ops.object.modifier_apply(modifier=bevel.name)
for v in o.data.vertices:
 x,y,z=v.co;v.co.x+=.09*z+.07*y;v.co.z+=.055*x-.055*y;v.co.y+=.045*x
bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
m=bpy.data.materials.new('warm limestone');m.diffuse_color=(.55,.55,.53,1);o.data.materials.append(m)
bpy.ops.export_scene.gltf(filepath=str(out/'limestone.glb'),export_format='GLB',use_selection=True,export_yup=True)
