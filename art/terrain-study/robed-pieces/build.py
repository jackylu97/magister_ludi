"""Build the archer and spearman for art review in Blender 4.5.

Run Blender in background mode with --threads 2 --python build.py.
Append -- --draft for a small test render without saving the models.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent
DRAFT = '--draft' in sys.argv
pi, sin, cos = math.pi, math.sin, math.cos
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
bpy.context.preferences.filepaths.save_version = 0


def linear(channel):
    value = channel / 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


def finish(name, hex_color, roughness=.47, metal=0, grain=True):
    color = tuple(linear(int(hex_color[i:i+2], 16)) for i in (0, 2, 4)) + (1,)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    tree = mat.node_tree
    shader = tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    shader.inputs["Specular IOR Level"].default_value = .28
    if grain:
        # The pigment stays a plain base colour in glTF. Blender adds shallow grain.
        coords = tree.nodes.new('ShaderNodeTexCoord')
        stretch = tree.nodes.new('ShaderNodeVectorMath')
        stretch.operation = 'MULTIPLY'
        stretch.inputs[1].default_value = (2.2, 2.2, .39)
        tree.links.new(coords.outputs['Object'], stretch.inputs[0])
        noise = tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 56
        noise.inputs['Detail'].default_value = 2
        tree.links.new(stretch.outputs[0], noise.inputs['Vector'])
        bump = tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .115
        bump.inputs['Distance'].default_value = .009
        tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
        pigment = tree.nodes.new('ShaderNodeTexNoise')
        pigment.inputs['Scale'].default_value = 11
        pigment.inputs['Detail'].default_value = 2.4
        tree.links.new(stretch.outputs[0], pigment.inputs['Vector'])
        tint = tree.nodes.new('ShaderNodeValToRGB')
        tint.name = 'Paint over the wood grain'
        tint.color_ramp.elements[0].position = .24
        tint.color_ramp.elements[0].color = tuple(v*.82 for v in color[:3])+(1,)
        tint.color_ramp.elements[1].position = .78
        tint.color_ramp.elements[1].color = tuple(v*1.09 for v in color[:3])+(1,)
        tree.links.new(pigment.outputs['Fac'], tint.inputs[0])
        tree.links.new(tint.outputs[0], shader.inputs['Base Color'])
    return mat


red = finish('Player paint | madder red', '943737')
hoodred = finish('Player paint | hood and shoulder', '9E3F3C')
lightred = finish('Player paint | cut edge', 'AA4B44')
lining = finish('Lining | dark oxblood', '55262D')
plum = finish('Robe | black cherry', '53303B')
pleat = finish('Robe | shaded folds', '4D2C34')
chestnut = finish('Leather | chestnut', '764536')
ochre = finish('Bow | honey yew', 'C68B46')
maple = finish('Maple | turned foot', 'D8AD79')
ivory = finish('Maple | ivory wax', 'F0CE9B', .40)
gold = finish('Leaf | antique gold', 'C3934E', .37, .43)
shaft = finish('Shaft | oxblood lacquer', '824038')
string = finish('Cord | waxed flax', 'E1CA9D', .7, grain=False)
ground = finish('Studio | warm stone', '938579', .9, grain=False)


def group(name):
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    return collection


def move_to(obj, coll):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    coll.objects.link(obj)


def unit(name, pos):
    global coll, root
    coll = group(name)
    root = bpy.data.objects.new(name + ' | move piece', None)
    coll.objects.link(root)
    root.empty_display_type = 'CIRCLE'
    root.empty_display_size = .8
    root.location = (pos, 0, 0)
    return root


def mesh(name, verts, faces, mats, indices=None, bevel=0, smooth=False):
    verts = [Vector(v) for v in verts]
    center = sum(verts, Vector()) / len(verts)
    geo = bpy.data.meshes.new(name)
    geo.from_pydata([v-center for v in verts], [], faces)
    for mat in mats:
        geo.materials.append(mat)
    for i, poly in enumerate(geo.polygons):
        poly.use_smooth = smooth
        if indices:
            poly.material_index = indices[i]
    bm = bmesh.new()
    bm.from_mesh(geo)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(geo)
    bm.free()
    ob = bpy.data.objects.new(name, geo)
    coll.objects.link(ob)
    ob.parent = root
    ob.location = center
    if bevel:
        mod = ob.modifiers.new('Soft carved edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.harden_normals = True
        normal = ob.modifiers.new('Keep broad faces flat', 'WEIGHTED_NORMAL')
        normal.keep_sharp = True
    return ob


def loft(name, rings, mats, shade=None, bevel=0, smooth=False):
    n = len(rings[0])
    faces, idx = [tuple(reversed(range(n)))], [0]
    for j in range(len(rings)-1):
        for i in range(n):
            k = (i+1) % n
            faces.append((j*n+i, j*n+k, (j+1)*n+k, (j+1)*n+i))
            idx.append(shade(j, i) if shade else 0)
    faces.append(tuple(range((len(rings)-1)*n, len(rings)*n)))
    idx.append(0)
    return mesh(name, sum(rings, []), faces, mats, idx, bevel, smooth)


def ellipse(rx, ry, z, n, cx=0, cy=0):
    return [(cx+rx*sin(2*pi*i/n), cy-ry*cos(2*pi*i/n), z) for i in range(n)]


def turned(name, rings, mats, shade=None, n=64, bevel=.008, smooth=False):
    return loft(name, [ellipse(r, r, z, n) for z,r in rings], mats, shade, bevel, smooth)


def foot():
    turned('Plinth | turned maple foot', [(0,.765),(.022,.798),(.058,.823),(.135,.823),(.17,.80),(.185,.762)], [maple], smooth=True)
    turned('Plinth | gold leaf band', [(.166,.721),(.183,.75),(.272,.75),(.287,.735)], [gold], smooth=True)
    turned('Plinth | maple seat', [(.272,.732),(.288,.748),(.315,.742),(.334,.712)], [maple], smooth=True)


def ball(name, xyz, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=26, ring_count=16)
    ob = bpy.context.object
    ob.name = name
    move_to(ob, coll)
    ob.parent = root
    ob.location = xyz
    ob.scale = scale
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def limb(name, points, widths, depths, mat, bevel=.012, sides=8, orient=(0,1,0)):
    rings = []
    for i,p in enumerate(points):
        direction = Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        direction.normalize()
        cross = direction.cross(Vector(orient)).normalized()
        other = direction.cross(cross).normalized()
        rings.append([tuple(Vector(p) + widths[i]*cos(2*pi*j/sides+pi/sides)*cross
                            + depths[i]*sin(2*pi*j/sides+pi/sides)*other) for j in range(sides)])
    return loft(name, rings, [mat], bevel=bevel)


def rod(name, a, b, r, mat, sides=12, bevel=.006):
    return limb(name, [a,b], [r,r], [r,r], mat, bevel, sides)


def underrobe(archer):
    rings = []
    for z,rx,ry,cx,cy in [
        (.33,.682,.604,.05,.035),
        (.92,.583,.508,.025,.027),(1.48,.427,.372,-.036 if archer else 0,0),
        (1.78,.314,.257,-.09 if archer else 0,-.02),(1.89,.209,.175,-.10 if archer else 0,-.02)]:
        pts = []
        for i in range(24):
            t = 2*pi*i/24
            fold = (1.026,.931,.987,1.047)[i%4]
            pts.append((cx+rx*fold*sin(t), cy-ry*fold*cos(t), z+.012*cos(5*t)))
        rings.append(pts)
    return loft('Undertunic | cut folds', rings, [plum,pleat], lambda j,i: int(i%4==0), .011)


def cloth(name, surface, mats, shade, thickness=.035, bevel=.011, loop=False):
    # A lined garment has a real underside, including along its open front.
    rows, cols = len(surface), len(surface[0])
    inside = []
    for row in surface:
        inside.extend([(x*.95,y*.95,z-thickness*.8) for x,y,z in row])
    verts = sum(surface, []) + inside
    faces, inds = [], []
    offset = rows*cols
    def add(f,k):
        faces.append(f)
        inds.append(k)
    for j in range(rows-1):
        for i in range(cols if loop else cols-1):
            k=(i+1)%cols
            f=(j*cols+i,j*cols+k,(j+1)*cols+k,(j+1)*cols+i)
            add(f,shade(j,i))
            add(tuple(v+offset for v in reversed(f)),len(mats)-1)
    for j in [0,rows-1]:
        for i in range(cols if loop else cols-1):
            a=j*cols+i
            b=j*cols+(i+1)%cols
            add((a,b,b+offset,a+offset),shade(max(0,j-1),i))
    if not loop:
        for i in [0,cols-1]:
            for j in range(rows-1):
                a=j*cols+i
                b=(j+1)*cols+i
                add((a,b,b+offset,a+offset),0)
    garment=mesh(name,verts,faces,mats,inds,bevel)
    if not loop:
        # A fold keeps its cut planes along the length of the coat.
        # Across a fold, join the normals at intermediate construction rings.
        for poly in garment.data.polygons:
            poly.use_smooth=True
        for edge in garment.data.edges:
            a,b=edge.vertices
            row_a,col_a=divmod(a%offset,cols)
            row_b,col_b=divmod(b%offset,cols)
            edge.use_edge_sharp=(a//offset!=b//offset or col_a==col_b or
                                 (row_a==row_b and row_a in (0,rows-1)))
    return garment


def mantle():
    rows=[]
    for band in range(7):
        row=[]
        for i in range(32):
            t=2*pi*i/32
            v=1-abs(sin(t)) if cos(t)>0 else .14
            hem=1.71-.30*v-.045*sin(t)
            rx,ry,z=[(.515,.417,hem+.005),(.606,.522,hem+.024),(.593,.511,hem+.125),
                     (.515,.425,hem+.235),(.33,.326,2.01-.175*v),
                     (.300,.297,2.01-.183*v),(.211,.202,2.012-.161*v)][band]
            row.append((rx*sin(t),ry*-cos(t)-.024,z))
        rows.append(row)
    cloth('Mantle | folded shoulders and gilded V',rows,[hoodred,gold,red,lining],
          lambda j,i: 1 if j<2 else 2 if j==4 else 3 if j==5 else 0,loop=True)


def cloak(archer):
    rows=[]
    for h,rx,ry in [(0,.718,.636),(.10,.705,.62),(.47,.588,.523),(.80,.487,.443),(1,.42,.359)]:
        row=[]
        for i in range(29):
            u=i/28
            # Separate the front edges at the foot, then cross them near the collar.
            a=(.64-.56*h if archer else 1.66-.31*h)
            b=(2*pi-1.09+.72*h if archer else 2*pi-.19+1.41*h)
            t=a+(b-a)*u
            fold=1+.024*cos(5*t+.3)-.021*cos(3*t-.55)
            if archer:
                hem=.331+.024*(1-u)**8+.095*u**7+.047*(1-cos(t))*.5
                cx=.095*(1-h)-.115*h
                cy=.058*(1-h)
                z=hem+(1.91-hem)*h
            else:
                hem=.34+.065*(1-u)**3.2+.06*u**3
                cx=.022*(1-h)
                cy=0
                z=hem+(1.76-hem)*h
            row.append((cx+rx*fold*sin(t),cy-ry*fold*cos(t),z))
        rows.append(row)
    cloth('Cape | swept open front' if archer else 'Overrobe | diagonal lap',rows,[red,lining],lambda j,i:0,bevel=.013)


def hood():
    # Outline in frontal cross-section. The lowest cut crosses in front of the throat.
    outline=[(-.04,1),(.31,.94),(.60,.78),(.81,.55),(.96,.25),(1,.02),
             (.90,-.21),(.71,-.43),(.43,-.62),(.17,-.81),(-.06,-1),
             (-.34,-.78),(-.61,-.55),(-.83,-.31),(-.98,-.03),(-.97,.24),
             (-.83,.52),(-.61,.78),(-.35,.94)]
    spans=[
        # radius x, radius z, depth, x offset and height
        (.22,.235,.095,-.14,2.23),(.332,.348,-.205,-.155,2.245),
        (.345,.347,-.411,-.182,2.27),(.372,.383,-.440,-.182,2.254),
        (.443,.445,-.335,-.15,2.264),(.474,.49,-.135,-.077,2.27),
        (.481,.47,.106,-.014,2.22),(.386,.35,.285,.023,2.132),
        (.204,.179,.377,.051,2.126),(.055,.052,.414,.089,2.096)]
    rings=[]
    for j,(rx,rz,depth,cx,cz) in enumerate(spans):
        row=[]
        for x,z in outline:
            # Lower sides flow back to the shoulders. The brow projects over the head.
            y=depth+(.085*(1-z)*.5 if j in (2,3,4) else 0)+(.035*x if j in (2,3,4,5) else 0)
            skirt = [0,0,0,.23,.77,1,.94,.73,.37,0][j]
            lower = max(0, -z)
            shoulder = max(0, 1-abs(z+.29)*1.38)
            side = cx+rx*x+skirt*x*shoulder*(.125 if x>0 else .055)
            y -= skirt*(.41*lower+.065*shoulder)
            height = cz+rz*z-.058*x-skirt*(.137*lower+.085*shoulder)
            row.append((side,y,height))
        rings.append(row)
    return loft('Hood | hollow carved shell and lining',rings,[hoodred,lining,lightred],
         lambda j,i: 1 if j<2 else 2 if j==2 else 0,.023,True)


arch = unit('Archer',-1.18)
foot()
underrobe(True)
cloak(True)
hood_shell=hood()
archer_head=ball('Head | blank ivory maple',(-.184,-.213,2.255),(.271,.247,.28),ivory)
for part in [hood_shell, archer_head]:
    yaw=-.235
    x,y=part.location.x+.10,part.location.y+.08
    part.location.x=-.10+x*cos(yaw)-y*sin(yaw)
    part.location.y=-.08+x*sin(yaw)+y*cos(yaw)
    part.rotation_euler.z=yaw
limb('Bow arm | bent sleeve',[(-.37,-.055,1.69),(-.55,-.219,1.50),(-.76,-.384,1.43),(-.905,-.448,1.443)],
     [.194,.203,.174,.143],[.194,.199,.175,.14],plum,.035)
limb('Bow arm | compressed cuff',[(-.814,-.408,1.439),(-.901,-.446,1.442)],
     [.183,.164],[.175,.161],chestnut,.014,8)
limb('Bow hand | carved mitten',[(-.882,-.449,1.447),(-.947,-.49,1.435),(-1.048,-.504,1.435)],
     [.148,.161,.148],[.152,.153,.142],red,.026,4)
bowpoints=[(-.559,-.50,.55),(-.580,-.504,.615),(-.733,-.52,.726),(-.874,-.52,.894),
           (-.952,-.512,1.09),(-.970,-.493,1.302),(-.952,-.49,1.555),
           (-.969,-.493,1.736),(-.938,-.491,1.896),(-.840,-.49,2.047),
           (-.695,-.488,2.168),(-.608,-.48,2.214),(-.572,-.476,2.276)]
bowpoints=[(x-.028-.095*max(0,(z-1.4)/.88)-.055*max(0,(1.15-z)/.60),
            y-.47*(x+.970),z) for x,y,z in bowpoints]
def bow_curve(controls):
    samples=[]
    for i in range(len(controls)-1):
        p0,p1,p2,p3=[controls[max(0,min(j,len(controls)-1))] for j in (i-1,i,i+1,i+2)]
        for t in (0,.5):
            samples.append(.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+
                                (-p0+3*p1-3*p2+p3)*t*t*t))
    return samples+[controls[-1]]


limb('Bow | yew stave',bow_curve([Vector(p) for p in bowpoints]),
     bow_curve([.021,.041,.049,.058,.064,.068,.065,.062,.057,.051,.048,.036,.02]),
     bow_curve([.034,.049,.059,.064,.07,.07,.07,.07,.062,.060,.052,.045,.026]),ochre,.008)
rod('Bow | taut flax string',(-.644,-.687,.577),(-.694,-.659,2.251),.009,string,8,.001)
rod('Bow | leather grip',(-.993,-.492,1.315),(-.997,-.492,1.53),.078,chestnut)

spear = unit('Spearman',1.13)
foot()
underrobe(False)
cloak(False)
mantle()
ball('Head | blank ivory maple',(0,-.095,2.103),(.25,.226,.284),ivory)
helmetrings=[(.291,.267,2.185),(.298,.27,2.243),(.28,.244,2.315),(.234,.215,2.399),
             (.162,.151,2.454),(.075,.075,2.48)]
loft('Helmet | maple dome',[ellipse(a,b,c,32,0,-.041) for a,b,c in helmetrings],[maple],bevel=.008,smooth=True)
loft('Helmet | painted brow band',[ellipse(a,b,c,36,0,-.048) for a,b,c in [
    (.302,.276,2.168),(.318,.286,2.183),(.316,.284,2.257),(.30,.269,2.27)]],[red],bevel=.007,smooth=True)
for sign,label in [(-1,'left'),(1,'right')]:
    pts=[(sign*.253,-.024,2.205),(sign*.262,-.027,2.115),(sign*.28,-.024,1.991)]
    limb('Helmet | '+label+' cheek guard',pts,[.052,.054,.052],[.119,.125,.122],maple,.012,6)
loft('Helmet | short finial',[ellipse(r,r,z,12,0,-.041) for z,r in [
    (2.472,.061),(2.509,.063),(2.521,.081),(2.64,.014)]],[gold],bevel=.006)
limb('Spear arm | sleeve',[(.415,.03,1.68),(.513,.023,1.391),(.607,-.082,1.35),(.73,-.135,1.423)],
     [.179,.172,.154,.132],[.16,.164,.144,.132],plum,.03)
limb('Spear hand | carved mitten',[(.638,-.139,1.405),(.712,-.163,1.421),(.818,-.166,1.424)],
     [.132,.149,.138],[.124,.137,.125],red,.034,6)
rod('Spear | lacquered pole',(.744,-.143,.333),(.797,-.143,2.621),.066,shaft,12,.011)
rod('Spear | gilded socket',(.791,-.143,2.47),(.797,-.143,2.655),.092,gold,16,.012)
loft('Spear | carved leaf point',[[(.798+x*r,-.143+y*d,z) for x,y in [(-1,0),(0,-1),(1,0),(0,1)]]
     for z,r,d in [(2.637,.065,.05),(2.754,.135,.081),(2.814,.147,.084),(3.209,.008,.007)]],[ivory],bevel=.008)
limb('Shield arm | sleeve',[(-.39,-.02,1.64),(-.44,-.183,1.34),(-.51,-.336,1.19)],
     [.17,.17,.135],[.16,.16,.13],plum,.024)
center=Vector((-.498,-.435,1.07))
forward=Vector((-.31,-.945,.12)).normalized()
side=Vector((-forward.y,forward.x,0)).normalized()
up=side.cross(forward).normalized()
def shieldring(r,shift):
    r *= 1.12
    return [center+forward*shift+side*cos(2*pi*i/48)*r+up*sin(2*pi*i/48)*r for i in range(48)]
loft('Shield | turned gilt rim and painted face',[shieldring(r,s) for r,s in [
    (.354,-.092),(.385,-.074),(.399,-.033),(.400,.010),(.386,.029),(.334,.040),
    (.328,.040),(.322,.031),(.255,.051),(.141,.063),(.036,.070)]],
    [plum,gold,chestnut],lambda j,i: 2 if j<2 else 1 if j<7 else 0,.005,smooth=True)

studio=group('Studio')
coll,root=studio,None
mesh('Ground',[(-200,-200,-.004),(200,-200,-.004),(200,200,-.004),(-200,200,-.004)],[(0,1,2,3)],[ground])

def look(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def softbox(name, loc, size, energy, color):
    data=bpy.data.lights.new(name,'AREA')
    data.shape='DISK'
    data.size=size
    data.energy=energy
    data.color=color
    ob=bpy.data.objects.new(name,data)
    studio.objects.link(ob)
    ob.location=loc
    look(ob,(0,0,1))

softbox('Light | large window',(-4,-4,7),4.1,495,(1,.89,.78))
softbox('Light | cool fill',(4,-3,4),4.8,235,(.84,.90,1))
softbox('Light | rim',(1.5,3.8,5.8),3.5,475,(1,.79,.61))
world=bpy.data.worlds.new('Studio | ambient')
scene.world=world
world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.38,.34,.33,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.45
camdata=bpy.data.cameras.new('Orthographic pair')
cam=bpy.data.objects.new('Camera | pair',camdata)
studio.objects.link(cam)
cam.location=(2,-15,5.9)
look(cam,(-.04,0,1.45))
camdata.type='ORTHO'
camdata.ortho_scale=5.34
scene.camera=cam
upper_data=bpy.data.cameras.new('Orthographic high angle')
upper_cam=bpy.data.objects.new('Camera | high angle',upper_data)
studio.objects.link(upper_cam)
upper_cam.location=(-3.75,-12.6,10.9)
look(upper_cam,(-.065,0,1.38))
upper_data.type='ORTHO'
upper_data.ortho_scale=5.78
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.use_denoising=True
scene.cycles.samples=6 if DRAFT else 24
scene.render.resolution_x=800 if DRAFT else 1500
scene.render.resolution_y=550 if DRAFT else 1030
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT / ('draft.png' if DRAFT else 'robed-pair.png'))
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=arch
arch.select_set(True)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            view=area.spaces.active
            view.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
            view.region_3d.view_location=(-.04,0,1.45)
            view.region_3d.view_distance=6.3
            view.region_3d.view_perspective='ORTHO'
            view.shading.color_type='MATERIAL'
            view.overlay.show_floor=False
            view.overlay.show_extras=False
if not DRAFT:
    # Each glTF has its own base origin. Restore the review arrangement for the blend.
    # The interchange copies use the same pigment colours without shader nodes.
    paint_links = []
    for mat in bpy.data.materials:
        if mat.use_nodes and mat.node_tree.nodes.get('Paint over the wood grain'):
            tree = mat.node_tree
            paint_input = tree.nodes.get('Principled BSDF').inputs['Base Color']
            paint_links.append((tree, paint_input.links[0].from_socket, paint_input))
            tree.links.remove(paint_input.links[0])
    for selection, filename in [(arch,'archer.glb'),(spear,'spearman.glb')]:
        rest=selection.location.copy()
        selection.location.x=0
        bpy.ops.object.select_all(action='DESELECT')
        for ob in [selection]+list(selection.children_recursive):
            ob.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUT/filename),use_selection=True,export_apply=True,
                                  export_yup=True,export_texcoords=False,export_tangents=False)
        selection.location=rest
    for tree, source, target in paint_links:
        tree.links.new(source, target)
    bpy.ops.object.select_all(action='DESELECT')
    arch.select_set(True)
    bpy.context.view_layer.objects.active=arch
    scene.render.filepath='//robed-pair.png'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'robed-pieces.blend'))
bpy.ops.render.render(write_still=True)
if not DRAFT:
    scene.camera=upper_cam
    scene.render.resolution_x=1000
    scene.render.resolution_y=688
    scene.render.filepath='//robed-pair-high-angle.png'
    bpy.ops.render.render(write_still=True)
