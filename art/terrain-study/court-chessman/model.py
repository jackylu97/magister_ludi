"""Build the court reader and render the two colour studies with Cycles on CPU."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

out = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def material(name, rgb, rough, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

team = material('Player | Lacquer', (.025, .117, .25), .34)
wood = material('Walnut', (.078, .031, .017), .40)
ivory = material('Honey ivory', (.86, .62, .32), .39)
brass = material('Brushed brass', (.60, .31, .085), .33, .66)
hair = material('Dark walnut', (.034, .015, .012), .43)

def mesh(name, verts, faces, mat, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    data.materials.append(mat)
    for face in data.polygons:
        face.use_smooth = smooth
    return obj

def turned(name, levels, mat, n=64, depth=.86, smooth=True, transform=None):
    verts = []
    for i, (z, r) in enumerate(levels):
        for k in range(n):
            a = 2 * math.pi * k / n
            p = (r * math.cos(a), r * depth * math.sin(a), z)
            verts.append(transform(*p, a, i) if transform else p)
    faces = [tuple(reversed(range(n)))]
    for i in range(len(levels)-1):
        for k in range(n):
            j = (k+1) % n
            faces.append((i*n+k, i*n+j, (i+1)*n+j, (i+1)*n+k))
    faces.append(tuple(range(len(verts)-n, len(verts))))
    return mesh(name, verts, faces, mat, smooth)

turned('Foot | turned walnut', [(0,.238),(.007,.26),(.019,.278),(.033,.282),(.045,.279),(.056,.267),(.063,.251),(.070,.247),(.079,.252),(.091,.247),(.098,.214),(.109,.203),(.125,.202)], wood)
turned('Foot | inset brass wire',[(.060,.255),(.063,.256),(.066,.252)],brass)
# Shallow carved flutes gather into a narrower waist, then spread across the shoulder.
levels=[(.109,.203,0),(.117,.214,0),(.135,.216,.004),(.170,.207,.009),(.255,.172,.011),(.365,.135,.008),(.46,.127,.004),(.53,.144,.004),(.59,.177,.004),(.633,.192,.003),(.656,.187,.002),(.692,.145,0),(.723,.093,0)]
def surface(i,a,offset=0):
    z,r,f=levels[i]
    r+=f*math.cos(7*a+.7*z)+offset
    return (r*math.cos(a)-.022*(z-.1),r*.85*math.sin(a),z+.025*math.cos(a)*max(0,(z-.48)/.24))
turned('Mantle | carved folds',[(z,r) for z,r,f in levels],team,112,transform=lambda x,y,z,a,i:surface(i,a))
# The long diagonal edge follows the mantle and widens over one shoulder.
def band(name,start,end,mat,off):
    vs=[]
    rows = (len(levels)-1)*8+1
    for row in range(rows):
        i = min(row//8,len(levels)-2)
        t = row/8-i
        z = levels[i][0]*(1-t)+levels[i+1][0]*t
        u=(z-.109)/(.723-.109)
        center=-2.18+1.44*u**1.45
        width=.19+.37*u
        for j in range(13):
            a = center+width*(start+(end-start)*j/12)
            lower = Vector(surface(i,a,off))
            upper = Vector(surface(i+1,a,off))
            vs.append(lower.lerp(upper,t))
    faces=[(i*13+j,i*13+j+1,(i+1)*13+j+1,(i+1)*13+j) for i in range(rows-1) for j in range(12)]
    return mesh(name,vs,faces,mat,True)
band('Stole | ivory inlay',-1,1,ivory,.0028)
band('Stole | lower gold edge',-1.19,-1.02,brass,.0033)
band('Stole | upper gold edge',1.02,1.19,brass,.0033)
turned('Collar | coved walnut',[(.699,.093),(.717,.109),(.730,.11),(.735,.090),(.762,.068),(.776,.071)],wood)
turned('Collar | brass lip',[(.716,.109),(.719,.114),(.725,.114),(.727,.111)],brass)
# A single nose ridge joins the brow and chin. Large planes catch the grazing light.
head=[(.754,.053),(.772,.070),(.790,.081),(.825,.102),(.853,.108),(.875,.114),(.911,.112),(.934,.095),(.944,.074)]
def face(x,y,z,a,i):
    d=math.atan2(math.sin(a+math.pi/2),math.cos(a+math.pi/2))
    nose=[0,.003,.008,.010,.037,.018,.006,0,0][i]*max(0,1-abs(d)/.49)
    return (x-.017,y-nose-.018*(1-(z-.754)/.19),z+.009*math.sin(a))
turned('Head | carved ivory',head,ivory,16,.91,False,face)
# The cap overhangs the brow and climbs to a clipped, off-centre crest.
def hat(x,y,z,a,i):
    t=(z-.904)/.13
    return (x-.017-.046*t,y+.013*t,z-.12*x+.105*y)
turned('Cap | inked brim',[(.904,.113),(.91,.129),(.924,.134),(.930,.129)],hair,48,transform=hat)
turned('Cap | lacquered crown',[(.922,.128),(.933,.132),(.952,.120),(.981,.111),(1.018,.09),(1.033,.076)],team,12,.91,False,hat)
turned('Cap | brass fillet',[(.932,.133),(.937,.132),(.941,.128)],brass,48,.90,transform=hat)
objects=list(scene.objects)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out/'court-reader.glb'),use_selection=True,export_format='GLB',export_yup=True)
# The editable file opens on one centered piece. Construct the photograph after saving.
bpy.context.view_layer.objects.active=objects[0]
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active
            space.region_3d.view_distance=1.95
            space.region_3d.view_location=(0,0,.50)
            space.region_3d.view_rotation=Vector((1.6,-3,1)).to_track_quat('Z','Y')
            space.shading.color_type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(out/'court-reader.blend'))
red=material('Vermilion lacquer',(.41,.048,.022),.34)
for obj in objects:
    copy=obj.copy()
    copy.data=obj.data.copy()
    scene.collection.objects.link(copy)
    copy.rotation_euler.z=-.64
    copy.location=(.45,.17,0)
    if copy.data.materials[0]==team:
        copy.data.materials[0]=red
    obj.location=(-.39,-.035,0)
    obj.rotation_euler.z=.42
back=material('Warm grey paper',(.27,.218,.16),.9)
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.data.materials.append(back)
def aim(obj,point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
def lamp(name,pos,power,size,color):
    bpy.ops.object.light_add(type='AREA',location=pos)
    o=bpy.context.object
    o.name=name
    o.data.energy=power
    o.data.shape='DISK'
    o.data.size=size
    o.data.color=color
    aim(o,(0,0,.5))
lamp('Large window',(-2.2,-2.5,3.6),260,2.4,(1,.91,.80))
lamp('Cool fill',(2,-2,2),105,2.2,(.74,.84,1))
lamp('Edge light',(0,2,2.9),260,1.7,(1,.82,.64))
bpy.ops.object.camera_add(location=(.15,-3.8,1.68))
cam=bpy.context.object
aim(cam,(0,0,.50))
cam.data.type='ORTHO'
cam.data.ortho_scale=1.92
scene.camera=cam
scene.world=bpy.data.worlds.new('Studio')
scene.world.color=(.19,.19,.19)
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1100
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.filepath=str(out/'court-reader.png')
bpy.ops.render.render(write_still=True)
