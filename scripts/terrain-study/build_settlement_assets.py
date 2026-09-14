"""Small carved animals and an architectural kit for the approved terrain look.
Blender --background --python scripts/terrain-study/build_settlement_assets.py
Coordinates in this authoring file are Z-up; the GLB exporter supplies Y-up.
"""
import bpy, bmesh, math, random, runpy, sys
from mathutils import Vector
from pathlib import Path

OUT=Path(__file__).resolve().parents[2]/'public'/'terrain-study'/'settlements'
OUT.mkdir(exist_ok=True)
def pigment(name,hexcode):
 c=[int(hexcode[i:i+2],16)/255 for i in (0,2,4)]
 c=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c]
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.94
 return m
CREAM=pigment('Chalk limestone','d9ceac');EDGE=pigment('Fresh stone edge','e8ddba');SHADE=pigment('Cut stone','b6b39f')
ROOF=pigment('Terracotta','b95e40');RIDGE=pigment('Clay ridge tiles','d48154');WOOD=pigment('Old walnut','775d43');DARK=pigment('Recesses','364c50');GOLD=pigment('Ochre brass','cbae66')
LEAF=pigment('Leaf pigment','68833f');FRUIT=pigment('Fruit pigment','9e5959');BROWN=pigment('Chestnut coat','895437');MANE=pigment('Mane and hooves','423d36');WHITE=pigment('Cream coat','d0c5a5');BISON=pigment('Bison coat','756047');HORN=pigment('Horn','d5c4a0');GREY=pigment('Elephant slate','858d92')

def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mesh(name,v,f,m):
 g=bpy.data.meshes.new(name);g.from_pydata(v,[],f);g.update();o=bpy.data.objects.new(name,g);bpy.context.collection.objects.link(o);g.materials.append(m);return o
def block(p,s,m=CREAM,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Carved edges','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(m);return o
def tube(points,radii,m,n=6):
 v=[];f=[]
 for j,(p,r) in enumerate(zip(points,radii)):
  tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
  tangent.normalize();u=tangent.cross(Vector((0,1,0)))
  if u.length<.01:u=tangent.cross(Vector((1,0,0)))
  u.normalize();w=tangent.cross(u)
  for i in range(n):v.append(Vector(p)+r*(u*math.cos(i*math.tau/n)+w*math.sin(i*math.tau/n)))
 for j in range(len(points)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.extend([tuple(reversed(range(n))),tuple(range((len(points)-1)*n,len(points)*n))]);return mesh('Tapered form',v,f,m)
def loft(rings,m,n=10):
 # Rings (x, z-centre, width, height) make intentionally drawn silhouettes.
 v=[];f=[]
 for x,z,ry,rz in rings:
  for i in range(n):
   a=(i+.5)*math.tau/n;v.append((x,math.cos(a)*ry,z+math.sin(a)*rz))
 for j in range(len(rings)-1):
  for i in range(n):f.append((j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n))
 f.extend([tuple(range(n)),tuple(reversed(range((len(rings)-1)*n,len(rings)*n)))]);return mesh('Sculpted silhouette',v,f,m)
def leaf(p,s,m=LEAF):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p);o=bpy.context.object;o.scale=s;o.data.materials.append(m);return o
def cylinder(p,r,h,m=CREAM,n=10):return tube([(p[0],p[1],p[2]-h/2),(p[0],p[1],p[2]+h/2)],[r,r],m,n)
def roof(x,y,z,w,d,h,m=ROOF):
 return mesh('Pitched roof',[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x,y-d/2,z+h),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y+d/2,z+h)],[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1),(0,1,4,3)],m)
def arch(x,y,z,w,h,depth,m=CREAM):
 # An actual open arch, including intrados; there is no painted black plug.
 n=10;r=w/2;thick=w*.16;spring=z+h-r
 for side in [-1,1]:block((x+side*(r+thick/2),y,(z+spring)/2),(thick,depth,spring-z),m,.006)
 for i in range(n):
  a=i*math.pi/n;b=(i+1)*math.pi/n;v=[]
  for yy in [y-depth/2,y+depth/2]:
   for rr,angle in [(r,a),(r,b),(r+thick,b),(r+thick,a)]:v.append((x+math.cos(angle)*rr,yy,spring+math.sin(angle)*rr))
  mesh('Arch voussoir',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m)
def house(w=.42,d=.38,h=.34):
 block((0,0,h/2),(w,d,h));block((0,0,.025),(w+.04,d+.04,.05),SHADE,.01)
 roof(0,0,h,w+.07,d+.07,.18)
 block((0,0,h+.002),(w+.07,d+.07,.028),RIDGE,.004)
 tube([(0,-d*.56,h+.18),(0,d*.56,h+.18)],[.018,.018],RIDGE)
 for x,z in [(-w*.25,h*.63),(w*.25,h*.63)]:block((x,-d/2-.002,z),(.047,.008,.072),DARK,.004)
 block((0,-d/2-.009,.09),(.095,.018,.18),DARK,.006)
 block((.012,-d/2-.021,.085),(.057,.008,.16),WOOD,.004)
 block((0,-d/2-.021,.19),(.11,.028,.027),EDGE,.006)
 block((w*.24,d*.20,h+.075),(.055,.065,.18),CREAM,.006)
def column(x,y,z,h,r=.024):
 cylinder((x,y,z+.015),r*1.5,.03,EDGE)
 tube([(x,y,z+.03),(x,y,z+h-.035)],[r,r*.84],CREAM,10)
 block((x,y,z+h-.017),(r*3.2,r*3.2,.035),EDGE,.005)
def temple():
 for i in range(3):block((0,0,.026+i*.045),(.62-i*.065,.63-i*.035,.05),CREAM,.008)
 block((0,.07,.31),(.44,.30,.36),CREAM)
 for x in [-.21,-.07,.07,.21]:column(x,-.215,.14,.36)
 block((0,-.21,.51),(.54,.09,.055),EDGE,.005)
 roof(0,0,.54,.61,.64,.17)
 roof(0,-.328,.535,.55,.023,.145,EDGE)
 roof(0,-.342,.55,.43,.01,.103,RIDGE)
 block((0,-.087,.28),(.10,.015,.23),DARK,.008)
 for i in range(3):block((0,-.34-i*.06,.10-i*.029),(.31+i*.035,.065,.032),EDGE,.005)
def export(name):
 bpy.context.view_layer.update();tris=0
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  # Preserve broad polygon normals and add a restrained cavity tint at joins.
  for p in o.data.polygons:p.use_smooth=False
  o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True)
 print('ASSET',name,tris,flush=True)

def animal(kind):
 reset();stocky=kind in ['cattle','bison'];deer=kind=='deer';elephant=kind=='elephant';beaver=kind=='beaver'
 coat=BISON if kind=='bison' else WHITE if kind=='cattle' else GREY if elephant else BROWN
 leg=.30 if deer else .25 if not beaver else .05
 if elephant:leg=.23
 body=.18 if not stocky else .22
 if beaver:body=.14
 loft([(-.40,leg+.10,.045,.07),(-.28,leg+.14,.16,body*.92),(.02,leg+.14,.19 if stocky or elephant else .15,body),(.25,leg+.17,.17,body*.92),(.34,leg+.18,.06,.07)],coat)
 for x in [-.27,.21]:
  for side in [-1,1]:
   y=side*(.11 if not elephant else .145);offset=.055 if side==1 else -.015
   tube([(x,y,leg+.13),(x+offset,y*1.08,leg*.50),(x+offset-.025,y*1.06,.035)],[.055 if stocky or elephant else .044,.030 if elephant else .026,.022],coat)
   block((x+offset-.01,y*1.06,.025),(.065,.045,.05),MANE,.008)
 if kind=='horse' or deer:
  loft([(.14,leg+.20,.10,.13),(.27,leg+.36,.085,.15),(.38,leg+.52,.054,.115),(.43,leg+.55,.047,.07)],coat,8)
  loft([(.35,leg+.55,.054,.077),(.46,leg+.54,.063,.075),(.63,leg+.46,.040,.046)],coat,8)
  for s in [-1,1]:tube([(.39,s*.043,leg+.60),(.42,s*.05,leg+.74)],[.031,.002],coat,5)
  if not deer:
   tube([(.16,-.004,leg+.27),(.20,-.004,leg+.47),(.33,-.004,leg+.66)],[.045,.05,.028],MANE,5)
  else:
   for s in [-1,1]:
    tube([(.36,s*.035,leg+.62),(.31,s*.11,leg+.81),(.35,s*.15,leg+.96)],[.016,.011,.002],HORN,5)
    tube([(.31,s*.11,leg+.81),(.46,s*.16,leg+.85)],[.009,.002],HORN,5)
 elif stocky:
  if kind=='bison':loft([(.00,leg+.27,.13,.12),(.19,leg+.33,.19,.20),(.30,leg+.24,.16,.16)],BISON)
  loft([(.27,leg+.14,.13,.14),(.43,leg+.11,.14,.15),(.58,leg+.055,.09,.085)],BISON if kind=='bison' else BROWN,8)
  if kind=='bison':tube([(.45,0,leg+.02),(.39,0,leg-.10)],[.09,.012],MANE,6)
  for s in [-1,1]:
   tube([(.41,s*.11,leg+.22),(.39,s*.21,leg+.23),(.40,s*.23,leg+.32)],[.031,.021,.001],HORN)
  if kind=='cattle':
   for s in [-1,1]:leaf((-.10,s*.148,leg+.13),(.13,.021,.13),BROWN)
 elif elephant:
  loft([(.20,leg+.21,.12,.17),(.38,leg+.23,.16,.20),(.49,leg+.18,.11,.15)],GREY)
  tube([(.47,0,leg+.18),(.57,0,leg+.02),(.59,0,.07),(.68,0,.08)],[.066,.050,.028,.012],GREY,8)
  for s in [-1,1]:
   leaf((.26,s*.18,leg+.22),(.10,.08,.20),GREY)
   tube([(.45,s*.065,leg+.08),(.58,s*.08,leg+.01),(.65,s*.07,leg+.06)],[.021,.012,.001],HORN)
 else:
  loft([(.24,.14,.11,.11),(.39,.13,.08,.08),(.45,.10,.05,.05)],BROWN,8)
  leaf((-.52,0,.045),(.21,.095,.03),MANE)
 if not beaver:
  tube([(-.35,0,leg+.20),(-.46,.01,leg+.06),(-.49,.02,.10)],[.026,.019,.01],coat)
  leaf((-.49,.02,.11),(.035,.032,.065),MANE)
 # Eyes are tiny embedded dark facets, not oversized mascot eyes.
 for s in [-1,1]:leaf(((.46 if stocky else .44),s*(.119 if stocky else .14 if elephant else .055),leg+(.19 if stocky else .28 if elephant else .105 if beaver else .565)),(.011,.007,.011),MANE)
 export(kind)

def city_assets():
 runpy.run_path(str(Path(__file__).with_name('build_city_assets.py')),init_globals=globals())

def site_assets():
 runpy.run_path(str(Path(__file__).with_name('build_site_assets.py')),init_globals=globals())

def unit_assets():
 runpy.run_path(str(Path(__file__).with_name('build_unit_assets.py')),init_globals=globals())

if '--city-only' in sys.argv:
 city_assets();sys.exit(0)
if '--sites-only' in sys.argv:
 site_assets();sys.exit(0)
if '--units-only' in sys.argv:
 unit_assets();sys.exit(0)

for name in ['horse','cattle','bison','deer','elephant','beaver']:animal(name)
reset();house();export('house')
reset();temple();export('temple')
reset()
block((0,0,.16),(.23,.23,.32));block((0,0,.34),(.27,.27,.055),EDGE)
for x in [-.085,.085]:
 for y in [-.085,.085]:column(x,y,.37,.21,.017)
roof(0,0,.61,.30,.29,.20);cylinder((0,0,.86),.025,.10,GOLD,7);export('bell-tower')
reset()
block((0,0,.035),(.57,.46,.07),SHADE)
arch(0,-.04,.055,.28,.31,.10,WOOD)
block((0,.015,.13),(.28,.018,.26),DARK,.0)
roof(0,0,.34,.47,.42,.17,WOOD)
for x in [-.19,.19]:tube([(x,-.19,.05),(x,-.19,.37)],[.025,.025],WOOD)
for x in [-.10,.10]:tube([(x,-.42,.04),(x,.10,.04)],[.009,.009],MANE,4)
block((.23,-.14,.10),(.11,.13,.09),WOOD,.005);export('mine')
reset()
roof(0,0,.015,.45,.43,.29,WHITE)
mesh('Tent opening',[(-.14,-.222,.016),(.14,-.222,.016),(0,-.222,.245)],[(0,1,2)],DARK)
tube([(0,-.28,0),(0,-.28,.35)],[.015,.008],WOOD)
for x in [-.25,.25]:tube([(0,-.22,.30),(x,-.31,.01)],[.004,.004],WOOD,4)
export('camp')
reset()
for x,y,z,w,d,h in [(-.12,.02,.07,.3,.26,.14),(.14,.12,.10,.20,.22,.20),(.02,-.20,.04,.25,.14,.08)]:block((x,y,z),(w,d,h),CREAM,.01)
tube([(-.27,.11,.0),(-.27,.11,.43),(.22,.11,.48)],[.022,.022,.014],WOOD)
tube([(.05,.11,.46),(.05,.11,.22)],[.004,.004],WOOD,4);export('quarry')
reset()
# A clinker-shaped fishing hull, drawn as nested elliptical sections.
v=[];f=[];n=12
for z,rx,ry in [(0,.24,.06),(.07,.34,.125),(.12,.36,.14)]:
 for i in range(n):
  a=i*math.tau/n;v.append((math.cos(a)*rx,math.sin(a)*ry,z))
for j in range(2):
 for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
mesh('Clinker hull',v,f,WOOD);block((0,0,.08),(.40,.14,.025),DARK,.003)
tube([(0,0,.07),(0,0,.64)],[.013,.009],WOOD)
mesh('Linen sail',[(0,0,.61),(0,0,.24),(.26,.015,.25),(.13,.035,.42)],[(0,1,3),(1,2,3),(2,0,3)],WHITE)
export('fishing-boat')
reset()
for p,s in [((-.13,0,.23),(.12,.11,.11)),((.13,.01,.28),(.13,.12,.12)),((0,-.12,.30),(.12,.11,.12)),((.01,.03,.41),(.11,.10,.12))]:leaf(p,s)
tube([(0,0,0),(0,0,.23),(0,.01,.39)],[.030,.018,.006],WOOD)
for p in [(-.13,0,.23),(.13,.01,.28),(0,-.12,.30)]:tube([(0,0,.14),p],[.014,.007],WOOD)
for p in [(-.14,-.09,.24),(.16,-.09,.28),(.01,-.20,.33),(-.06,.09,.43)]:leaf(p,(.033,.027,.034),FRUIT)
export('resource-shrub')
city_assets()
site_assets()
