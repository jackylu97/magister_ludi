"""Rebuild the faceted pieces with Blender 4.5 in background mode.
Use -- --draft for a small preview. Each piece has a separate base origin.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

out = Path(__file__).resolve().parent
draft = '--draft' in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2


def material(name, hex_color, metal=0, rough=.59):
    def linear(i):
        c=int(hex_color[i:i+2],16)/255
        return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
    color=tuple(linear(i) for i in (0,2,4))+(1,)
    m=bpy.data.materials.new(name)
    m.diffuse_color=color
    m.use_nodes=True
    shader=m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=color
    shader.inputs['Metallic'].default_value=metal
    shader.inputs['Roughness'].default_value=rough
    shader.inputs['Specular IOR Level'].default_value=.25
    return m


red=material('Player | carmine','963A3C')
redlight=material('Player | crimson','A54444')
redshade=material('Player | dark side of hood','813039')
lining=material('Hood lining | oxblood','783A3C')
plum=material('Undertunic | wine','593241')
ivory=material('Head | ivory','EFD2A8')
wood=material('Base | pale maple','DABA91')
gold=material('Trim | ochre gold','C3995B',.22)
yew=material('Bow | warm yew','CC9251')
cord=material('String | flax','DDC7A0')
stage_mat=material('Studio | sand','AD9989')


def collection(name):
    c=bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c


def unit(name, x):
    global root, coll
    coll=collection(name)
    root=bpy.data.objects.new(name+' | base origin',None)
    coll.objects.link(root)
    root.location.x=x
    root.empty_display_type='CIRCLE'
    root.empty_display_size=.78
    return root


def mesh(name, points, faces, materials, ids=None, smooth=False):
    points=[Vector(p) for p in points]
    mid=sum(points,Vector())/len(points)
    data=bpy.data.meshes.new(name)
    data.from_pydata([p-mid for p in points],[],faces)
    for m in materials:
        data.materials.append(m)
    for i,f in enumerate(data.polygons):
        f.material_index=ids[i] if ids else 0
        f.use_smooth=smooth
    bm=bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(data)
    bm.free()
    obj=bpy.data.objects.new(name,data)
    coll.objects.link(obj)
    obj.parent=root
    obj.location=mid
    return obj


def stack(name,rings,mats,ids=None,smooth=False):
    n=len(rings[0])
    faces=[list(reversed(range(n)))]
    colors=[0]
    for j in range(len(rings)-1):
        for i in range(n):
            a=j*n+i
            b=j*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
            colors.append(ids(j,i) if ids else 0)
    faces.append([len(rings)*n-n+i for i in range(n)])
    colors.append(0)
    return mesh(name,sum(rings,[]),faces,mats,colors,smooth)


def pointed(name, rings, tip, mat):
    n=len(rings[0])
    points=sum(rings,[])+[tip]
    faces=[tuple(range(n))]
    for j in range(len(rings)-1):
        for i in range(n):
            k=(i+1)%n
            faces.append((j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i))
    last=(len(rings)-1)*n
    for i in range(n):
        faces.append((last+i,last+(i+1)%n,len(points)-1))
    return mesh(name,points,faces,[mat])


def ring(n,rx,ry,z,cx=0,cy=0,phase=0):
    return [(cx+rx*math.sin(i*math.tau/n+phase),cy-ry*math.cos(i*math.tau/n+phase),z)
            for i in range(n)]


def base():
    # The step and the stripe are part of one turned profile.
    stack('Base | maple and gold',
          [ring(16,r,r,z,phase=math.pi/16) for r,z in [(.795,0),(.795,.105),(.733,.145),(.733,.252)]],
          [wood,gold],lambda j,i: int(j==2))


def head(center, scale):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2)
    obj=bpy.context.object
    obj.name='Head | blank ivory'
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    coll.objects.link(obj)
    obj.parent=root
    obj.location=center
    obj.scale=scale
    obj.data.materials.append(ivory)
    for f in obj.data.polygons:
        f.use_smooth=True
    return obj


def tube(name, points, widths, depths, mat, n=4, phase=math.pi/4):
    rings=[]
    for i,p in enumerate(points):
        d=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])).normalized()
        v=d.cross(Vector((0,1,0))).normalized()
        w=d.cross(v).normalized()
        rings.append([Vector(p)+v*widths[i]*math.cos(phase+j*math.tau/n)+
                      w*depths[i]*math.sin(phase+j*math.tau/n) for j in range(n)])
    return stack(name,rings,[mat])


def tunic(archer):
    n=9
    stack('Tunic | long folds',
          [ring(n,.66,.578,.253,.052,.015,-.15),
           ring(n,.394 if archer else .32,.320 if archer else .235,1.66 if archer else 1.62,-.10 if archer else 0,-.008,-.22)],
          [plum])


def panel(name,bottom,top):
    # Only the open edges need a return. A closed back on the hidden side adds no shape.
    front=bottom+top
    n=len(top)
    back=[(x*.941,y*.937,z+.016 if i<n else z-.012) for i,(x,y,z) in enumerate(front)]
    points=front+back
    faces=[]
    materials=[]
    def face(f,mat):
        faces.append(f)
        materials.append(mat)
    for i in range(n-1):
        face((i,i+1,n+i+1,n+i),0)
        face((2*n+i,3*n+i,3*n+i+1,2*n+i+1),1)
        face((i,2*n+i,2*n+i+1,i+1),1)
        face((n+i,n+i+1,3*n+i+1,3*n+i),0)
    for i in (0,n-1):
        face((i,n+i,3*n+i,2*n+i),1)
    return mesh(name,points,faces,[red,redshade],materials)


def cape(archer):
    if archer:
        bottom=[(.238,-.591,.252),(.562,-.451,.291),(.768,-.124,.457),
                (.574,.423,.405),(-.10,.621,.351),(-.591,.332,.302),(-.55,-.204,.406)]
        top=[(-.244,-.319,1.69),(.122,-.38,1.73),(.378,-.205,1.78),
             (.34,.21,1.81),(-.094,.353,1.77),(-.386,.215,1.72),(-.401,-.079,1.63)]
    else:
        bottom=[(-.058,-.603,.254),(-.54,-.36,.288),(-.705,.03,.343),
                (-.46,.46,.343),(.139,.55,.306),(.55,.30,.305),(.577,-.156,.37)]
        top=[(.358,-.331,1.72),(-.139,-.382,1.73),(-.469,-.045,1.74),
             (-.33,.30,1.76),(.12,.355,1.74),(.38,.215,1.71),(.354,-.111,1.69)]
    if archer:
        top=[(x,y+(-.032,.10,.125,0,0,0,0)[i],z+(.16 if i in (1,2,3) else .07))
             for i,(x,y,z) in enumerate(top)]
    else:
        top=[(x*.78,y*.68,z-.10) for x,y,z in top]
    panel('Cloak | long diagonal overlap',bottom,top)


def hood():
    # The aperture is deliberately offset. The bottom opening folds back at the
    # left cheek. A separate broad plane crosses from it to the opposite shoulder.
    aperture=[
        (-.324,-.387,1.838),(-.481,-.302,2.046),(-.460,-.347,2.236),
        (-.337,-.415,2.375),(-.076,-.420,2.361),(.095,-.382,2.269),
        (.228,-.298,2.054),(.242,-.295,1.950),(-.205,-.428,1.758)]
    lip=[
        (-.345,-.395,1.831),(-.506,-.311,2.037),(-.482,-.36,2.244),
        (-.350,-.433,2.394),(-.071,-.438,2.383),(.112,-.399,2.283),
        (.248,-.314,2.058),(.267,-.308,1.939),(-.216,-.442,1.735)]
    shoulder=[
        (-.484,-.416,1.710),(-.530,-.198,2.007),(-.483,-.191,2.260),
        (-.258,-.234,2.474),(.055,-.185,2.509),(.231,-.163,2.440),
        (.50,-.123,2.081),(.581,-.191,1.814),(-.303,-.485,1.648)]
    rear=[
        (-.379,.232,1.810),(-.369,.185,2.028),(-.284,.218,2.269),
        (-.151,.147,2.443),(.097,.168,2.468),(.277,.143,2.390),
        (.459,.238,2.110),(.496,.304,1.853),(-.116,.281,1.706)]
    for edge in (aperture,lip,shoulder):
        x,y,z=edge[3]
        edge[3]=(x,y,z+.032)
    # Cut the right side on one plane from the brow to the shoulder.
    for edge in (lip,shoulder):
        for i in (5,6,7):
            x,y,z=edge[i]
            edge[i]=(x,.410*x-.080*z-.263,z)
    inner=[(x+.019,y+.103,z-.017 if z>2.20 else z+.008) for x,y,z in aperture]
    # The lower edge is the top of the shoulder fold. End the narrow brow
    # lining at the cheeks so a second edge cannot run under the chin.
    inner[0]=(-.376,-.411,1.773)
    inner[7]=(.258,-.312,1.964)
    inner[8]=(-.196,-.409,1.824)
    for edge in (inner,shoulder):
        for i in (0,7,8):
            x,y,z=edge[i]
            edge[i]=(x,.244*x+.21*(z-1.78)-.353,z)
    n=len(aperture)
    points=inner+aperture+lip+shoulder+rear
    faces=[tuple(range(n))]
    colors=[3]
    for j in range(4):
        for i in range(n):
            if j<3 and i in (7,8):
                continue
            a=j*n+i
            b=j*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
            if j==0:
                colors.append(3)
            elif j==1:
                colors.append(0)
            elif j==2 and i in (5,6):
                colors.append(2)
            else:
                colors.append(0 if j==2 and i in (7,8) else 1)
    for i in (0,7):
        faces.append((i,n+i,2*n+i,3*n+i))
        colors.append(0)
    faces.append((7,8,0,3*n,3*n+8,3*n+7))
    colors.append(0)
    faces.append(tuple(range(4*n,5*n)))
    colors.append(2)
    return mesh('Hood | sloping crown and crossed mantle',points,faces,
                [red,redlight,redshade,lining],colors)


arch=unit('Archer',-1.09)
base()
tunic(True)
cape(True)
hood()
head((-.129,-.320,2.097),(.266,.25,.271))
tube('Sleeve | bent bow arm',[(-.296,-.076,1.591),(-.594,-.289,1.292),(-.833,-.396,1.258)],
     [.212,.211,.170],[.221,.219,.205],plum)
tube('Hand | square grip',[(-.785,-.394,1.266),(-.92,-.425,1.266)],
     [.192,.177],[.209,.19],red)
bow=[
    (-.615,-.637,.534),(-.726,-.576,.606),(-.867,-.482,.768),(-.927,-.435,.972),
    (-.91,-.429,1.27),(-.917,-.43,1.511),(-.832,-.494,1.700),
    (-.701,-.573,1.858),(-.596,-.632,1.933)]
tube('Bow | yew',bow,[.021,.044,.057,.060,.064,.063,.059,.043,.023],
     [.036,.049,.068,.073,.073,.073,.063,.047,.034],yew,4)
tube('Bow | flax string',[bow[0],bow[-1]],[.008,.008],[.008,.008],cord,3,0)


spearman=unit('Spearman',1.10)
base()
tunic(False)
cape(False)
# The collar covers both shoulders in six broad planes.
hem=[(0,-.490,1.231),(-.444,-.334,1.464),(-.556,-.035,1.536),
     (-.404,.277,1.515),(0,.386,1.426),(.417,.255,1.501),(.568,-.030,1.506),(.467,-.337,1.464)]
gilt=[(x*.974,y*.974,z+.095) for x,y,z in hem]
top=[(x*.51,y*.60,1.852 if i!=0 else 1.665) for i,(x,y,z) in enumerate(hem)]
neck=[(x*.83,y*.76,z+.033) for x,y,z in top]
mantle=stack('Mantle | broad shoulders and V band',[hem,gilt,top,neck],[redlight,gold,plum],
      lambda j,i: 1 if j==0 else 2 if j==2 else 0)
mantle.data.polygons[-1].material_index=2
head((0,-.074,1.970),(.241,.216,.263))
stack('Helmet | dome and painted band',
      [ring(10,r,r*.92,z,0,-.058,math.pi/10) for r,z in [(.295,2.043),(.300,2.138),(.225,2.252),(.073,2.313)]],
      [wood,red],lambda j,i: int(j==0))
for sign,label in [(-1,'left'),(1,'right')]:
    upper=[(sign*.198,-.169,2.077),(sign*.278,-.131,2.08),
           (sign*.268,.057,2.082),(sign*.183,.059,2.08)]
    bottom=[(x+sign*.014,y-.004,z-.218) for x,y,z in upper]
    tucked=[(x*.93,y*.93,2.051) for x,y,z in upper]
    stack('Helmet | '+label+' cheek guard',[bottom,tucked],[wood])
pointed('Helmet | short point',[ring(5,.076,.074,2.309,0,-.059)],(0,-.059,2.469),gold)
tube('Spear arm | bent sleeve',[(.338,.007,1.493),(.502,-.025,1.236),(.683,-.094,1.277)],
     [.186,.175,.139],[.193,.172,.143],plum)
tube('Spear hand | square grip',[(.618,-.102,1.267),(.791,-.107,1.282)],
     [.183,.172],[.178,.180],red)
staff=stack('Spear | staff and socket',
      [ring(6,r,r,z,.720+.038*z/2.5,-.109,math.pi/6) for r,z in [(.063,.253),(.071,2.291),(.095,2.303),(.095,2.478)]],
      [redshade,gold],lambda j,i:int(j>0))
staff.data.polygons[-1].material_index=1
pointed('Spear | leaf point',
      [[(.760+x*r,-.109+y*d,z) for x,y in ((-1,0),(0,-1),(1,0),(0,1))]
       for r,d,z in [(.061,.056,2.463),(.146,.086,2.622)]],(.760,-.109,3.014),ivory)
tube('Shield arm',[(-.316,.003,1.471),(-.439,-.258,1.168),(-.521,-.323,1.075)],
     [.19,.161,.14],[.17,.16,.132],plum)
shieldcenter=Vector((-.507,-.413,1.016))
normal=Vector((-.39,-.918,.09)).normalized()
across=Vector((-normal.y,normal.x,0)).normalized()
up=normal.cross(across)
def disk(r,depth):
    return [shieldcenter+normal*depth+r*(across*math.cos(math.tau*i/14)+up*math.sin(math.tau*i/14)) for i in range(14)]
shield=stack('Shield | round face and gold rim',
             [disk(.39,-.040),disk(.409,.029),disk(.35,.048)],[plum,gold],lambda j,i:1)


studio=collection('Studio')
coll,root=studio,None
mesh('Ground',[(-100,-100,-.003),(100,-100,-.003),(100,100,-.003),(-100,100,-.003)],[(0,1,2,3)],[stage_mat])
def point(obj,at):
    obj.rotation_euler=(Vector(at)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(name,location,size,energy,color):
    data=bpy.data.lights.new(name,'AREA')
    obj=bpy.data.objects.new(name,data)
    coll.objects.link(obj)
    obj.location=location
    point(obj,(0,0,1.1))
    data.shape='DISK'
    data.size=size
    data.energy=energy
    data.color=color
area('Key | broad window',(-3.7,-4.5,7),5,690,(1,.90,.79))
area('Fill | cool',(4,-2,4.1),5,180,(.85,.91,1))
area('Rim | warm',(1,4.1,5.8),4,460,(1,.84,.72))
world=bpy.data.worlds.new('Warm studio')
world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.41,.38,.36,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.40
scene.world=world
def camera(name,loc,target,scale):
    d=bpy.data.cameras.new(name)
    c=bpy.data.objects.new(name,d)
    coll.objects.link(c)
    c.location=loc
    d.type='ORTHO'
    d.ortho_scale=scale
    point(c,target)
    return c

front=camera('Camera | studio',(1.0,-13.6,5.43),(-.045,0,1.36),5.02)
high=camera('Camera | high',(-3,-12,9.8),(-.045,0,1.31),5.42)
scene.camera=front
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=4 if draft else 16
scene.cycles.use_denoising=True
scene.render.resolution_x=800 if draft else 1450
scene.render.resolution_y=544 if draft else 986
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.file_format='PNG'
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            space=a.spaces.active
            space.region_3d.view_rotation=front.rotation_euler.to_quaternion()
            space.region_3d.view_location=(-.045,0,1.36)
            space.region_3d.view_distance=6.2
            space.region_3d.view_perspective='ORTHO'
            space.shading.color_type='MATERIAL'
            space.overlay.show_floor=False
            space.overlay.show_extras=False
if draft:
    scene.camera=high if '--high' in sys.argv else front
    scene.render.filepath=str(out/('draft-high.png' if '--high' in sys.argv else 'draft.png'))
else:
    for piece,filename in [(arch,'archer.glb'),(spearman,'spearman.glb')]:
        where=piece.location.copy()
        piece.location.x=0
        bpy.ops.object.select_all(action='DESELECT')
        for obj in [piece]+list(piece.children_recursive):
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(out/filename),use_selection=True,export_apply=True,
                                  export_yup=True,export_texcoords=False)
        piece.location=where
    bpy.ops.object.select_all(action='DESELECT')
    arch.select_set(True)
    bpy.context.view_layer.objects.active=arch
    scene.render.filepath='//studio.png'
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'robed-pieces.blend'))
bpy.ops.render.render(write_still=True)
if not draft:
    scene.camera=high
    scene.render.filepath='//high-angle.png'
    scene.render.resolution_x=1000
    scene.render.resolution_y=680
    bpy.ops.render.render(write_still=True)
