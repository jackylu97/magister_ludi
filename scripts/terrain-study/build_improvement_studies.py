"""Build review GLBs using build_settlement_assets.py -- --improvement-study.

Add --pictures to render each mesh on a separate terrain tile. Stage objects
are created after export. Add --source-scene to save the editable Blender kit.
Use --only=name to rebuild a single GLB and picture.
"""
from math import cos, sin, pi, tau
from pathlib import Path
from random import Random

STUDY = Path(__file__).resolve().parents[2] / 'art/terrain-study/improvement-studies'
STUDY.mkdir(parents=True, exist_ok=True)
CYAN = pigment('Water in shade', '387e81')
JADE = pigment('Reservoir water', '65aaa1')
RIPPLE = pigment('Water highlights', 'abceab')
CUT_EARTH = pigment('Exposed red gravel', '81452e')
DESERT = pigment('Desert varnish', 'ab704c')
RUST = pigment('Laterite courses', 'a76547')
SAND = pigment('Warm sandstone', 'd2986b')
HONEY = pigment('Weathered sandstone', 'e8bd88')
CHALK = pigment('Sandstone nosing', 'f2d4a0')
GRANITE = [pigment('Granite brown', '79756a'), pigment('Granite warm', 'a29986'),
           pigment('Granite grey', '969b94'), pigment('Granite pale', 'b9b8a6')]
CEDAR = pigment('Carved red cedar', 'b87746')
CEDAR_EDGE = pigment('Fresh cedar', 'd9a16a')
OXIDE = pigment('Iron oxide', 'ad513d')
TEAL = pigment('Dark painted teal', '385e58')
BARK = pigment('Bark', '64553c')
WATTLE = pigment('Split willow', 'a38254')
REED = pigment('Dried reed', 'c59e60')
LIME = pigment('Warm lime plaster', 'e5d6ad')
CYPRESS = pigment('Cypress', '3a5e4b')
GRASS = pigment('Turf', '889359')
MOSS = pigment('Turf edge', '78814e')
DIRT = pigment('Exposed earth', '997349')
CANOPY = [pigment('Leaf shadow', '5a784a'), pigment('Leaf green', '7f994c'),
          pigment('Leaf in light', '98a657')]
PEAR = pigment('Amber apples', 'e4a245')
RED_FRUIT = pigment('Ochre red apples', 'c9753c')


def polygon_solid(name, outline, bottom, top, material):
    n = len(outline)
    vertices = [(x, y, z) for z in (bottom, top) for x, y in outline]
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces += [(i, (i+1) % n, n+(i+1) % n, n+i) for i in range(n)]
    return mesh(name, vertices, faces, material)


def rock_slab(name, x, y, bottom, rx, ry, height, material, seed, yaw=0):
    """Offset the corners on each course but leave a flat bearing face for the next stone."""
    rng = Random(seed)
    n = 7
    outline = []
    for i in range(n):
        angle = tau * (i + .18 + rng.uniform(-.12, .12)) / n
        outline.append((rx * cos(angle) * rng.uniform(.9, 1.12), ry * sin(angle) * rng.uniform(.91, 1.09)))
    v = []
    for z, scale, drift in [(0,.77,0),(.22,1,0),(.76,.97,.025), (1,.76,.04)]:
        for i, (u, w) in enumerate(outline):
            a = u * scale + drift * rx
            b = w * scale
            lift = rng.uniform(-.035,.035) if z in (.22,.76) else 0
            v.append((x + a*cos(yaw)-b*sin(yaw), y+a*sin(yaw)+b*cos(yaw), bottom+(z+lift)*height))
    faces = [tuple(reversed(range(n))),tuple(range(3*n,4*n))]
    faces += [(k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i) for k in range(3) for i in range(n)]
    return mesh(name,v,faces,material)


def stroke(points, width, z, material):
    """Join flat strokes at bisected corners so a line has no cracks at board zoom."""
    points = [Vector((x, y)) for x, y in points]
    v = []
    for i, p in enumerate(points):
        a = (p - points[i-1]).normalized() if i else (points[1] - p).normalized()
        b = (points[i+1] - p).normalized() if i+1 < len(points) else a
        n1, n2 = Vector((-a.y, a.x)), Vector((-b.y, b.x))
        cross = (n1 + n2).normalized()
        side = cross * min(width, width / (2 * max(.12, cross.dot(n1))))
        v.extend([(p.x+side.x,p.y+side.y,z),(p.x-side.x,p.y-side.y,z)])
    return mesh('Cut line',v,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)],material)


def nazca():
    # One path traces the beak, the spread flight feathers, the tail and the belly.
    outline = [(-.34,.025),(-.26,.132),(-.157,.148),(-.081,.073),
               (.06,.423),(.49,.606),(.18,.403),(.55,.484),(.19,.317),(.52,.354),
               (.11,.177),(.045,.059),(.18,-.04),(.59,-.182),(.246,-.139),
               (.52,-.299),(.158,-.177),(.336,-.350),(.037,-.194),(-.115,-.174),
               (-.251,-.089),(-.34,-.017)]
    stroke(outline,.048,.004,CUT_EARTH)
    mesh('Tapered bill',[(-.76,-.054,.004),(-.332,-.027,.004),(-.325,.038,.004)],[(0,1,2)],CUT_EARTH)
    for x,y in [(-.63,.17),(.52,-.40),(.45,.04),(-.40,-.31)]:
        rock_slab('Gravel beside the cut',x,y,-.009,.020,.015,.014,DESERT,int((x+1)*50))


def inuksuk():
    stones = [
        (-.20,.02,-.015,.245,.19,.13,0,1,-.15),(.20,.016,-.015,.224,.177,.14,1,2,.14),
        (-.21,.025,.109,.172,.151,.14,2,3,.16),(.20,.015,.12,.16,.142,.132,0,4,-.2),
        (-.215,.03,.240,.164,.147,.114,1,6,-.16),(.193,.034,.244,.165,.15,.108,2,7,.12),
        (-.012,.035,.336,.445,.184,.151,0,8,-.03),(-.012,.045,.476,.225,.16,.133,1,9,.21),
        (-.065,.042,.602,.424,.155,.109,2,10,.04),(.047,.04,.704,.176,.12,.084,0,11,.2),
        (.058,.048,.782,.132,.119,.148,3,12,-.2)]
    for x,y,z,rx,ry,h,c,seed,yaw in stones:
        if z < .3:x+=.044 if x>0 else -.044
        rock_slab('Stacked granite',x,y,z,rx,ry,h,GRANITE[c],seed,yaw)
    for x,y,z,rx,ry in [(-.41,-.12,.079,.13,.093),(.40,.08,.052,.145,.075),(.29,-.18,.044,.086,.064)]:
        rock_slab('Talus',x,y,-.015,rx,ry,z,GRANITE[1],34+int((x+1)*22))


def cross_section(name, silhouette, y_front, y_back, material):
    n=len(silhouette)
    v=[(x,y,z) for y in (y_front,y_back) for x,z in silhouette]
    faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
    faces.extend((i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n))
    return mesh(name,v,faces,material)


def totem():
    tube([(0,.025,-.016),(0,.026,.22),(.01,.03,.60),(.006,.037,1.04)],
         [.166,.159,.149,.146],CEDAR,10)
    # Relief faces sit forward of the trunk, leaving wood visible around the paint.
    for side in [-1,1]:
        def flank(outline, front, back, material):
            cross_section('Carved relief',[(side*x,z) for x,z in outline],front,back,material)
        flank([(.011,.88),(.045,.966),(.153,.993),(.138,.922),(.092,.88)],-.123,-.038,TEAL)
        flank([(.021,.861),(.055,.899),(.115,.904),(.133,.874),(.101,.837),(.055,.829)],-.14,-.06,CEDAR_EDGE)
        flank([(.054,.861),(.074,.879),(.106,.877),(.109,.856),(.078,.847)],-.146,-.10,DARK)
        flank([(.043,.69),(.154,.78),(.208,.717),(.203,.568),(.161,.469),(.115,.408),(.103,.593)],-.086,.076,CEDAR)
        flank([(.110,.686),(.161,.734),(.187,.695),(.176,.551),(.119,.46)],-.091,-.063,OXIDE)
        flank([(.118,.651),(.168,.685),(.155,.572),(.124,.518)],-.095,-.064,CEDAR_EDGE)
        flank([(.012,.363),(.058,.404),(.126,.405),(.134,.375),(.088,.35)],-.127,-.069,TEAL)
        flank([(.029,.306),(.074,.337),(.124,.343),(.115,.312),(.069,.294)],-.133,-.068,CEDAR_EDGE)
    # The hooked bird bill changes the outline as well as the face seen from above.
    mesh('Beak',[(0,-.142,.905),(-.068,-.109,.83),(.068,-.109,.83),(0,-.284,.784),
                 (0,-.234,.724),(0,-.12,.782)],[(0,1,3),(2,0,3),(1,5,4,3),(3,4,5,2),(0,2,5,1)],CEDAR_EDGE)
    cross_section('Lower mouth',[(-.079,.225),(-.046,.246),(.052,.246),(.082,.224),(.048,.201),(-.051,.201)],-.135,-.10,OXIDE)
    for side in [-1,1]:
        cross_section('Carved ear',[(side*.058,.966),(side*.112,1.092),(side*.139,1.076),(side*.132,.974)],-.048,.094,CEDAR)
    cylinder((0,.025,.123),.167,.026,TEAL,10)


def stair(x,y,angle,width,run,rise,count,floor,material):
    """The bottom riser starts at x,y and each following step climbs away from it."""
    for i in range(count):
        inset=(i+.5)*run
        p=(x-sin(angle)*inset,y+cos(angle)*inset,floor+(i+1)*rise/2)
        tread=block(p,(width,run+.001,(i+1)*rise),material if i%3 else HONEY,.003)
        tread.rotation_euler.z=angle


def stepwell():
    # Raised outer shoulders contain the well on an intact terrain mesh.
    block((0,.015,.013),(1.17,1.10,.045),RUST,.055)
    block((0,.02,.043),(.52,.45,.026),CYAN,.013)
    for x in [-1,1]:
        stair(x*.251,.017,-x*pi/2,.60,.065,.052,5,.037,SAND)
    stair(0,-.205,pi,.49,.064,.052,5,.037,SAND)
    for x in [-1,1]:
        for y in [-1,1]:
            for i in range(4):
                w=.326-i*.038;d=.273-i*.033
                block((x*(.572-w/2),y*(.533-d/2),.067+i*.073),(w,d,.078),SAND if i%2 else HONEY,.006)
    # Corbelled niches break up the rear retaining wall above the pool.
    block((0,.409,.173),(.505,.245,.295),SAND,.012)
    for x in [-.161,0,.161]:
        cross_section('Niche in shade',[(x-.053,.099),(x+.053,.099),(x+.053,.191),
                      (x+.027,.222),(x-.027,.222),(x-.053,.191)],.281,.287,RUST)
    block((0,.402,.333),(.51,.264,.04),HONEY,.009)
    for x in [-.192,0,.192]:
        for y in [.325,.475]:
            block((x,y,.437),(.045,.045,.189),CHALK,.006)
    block((0,.4,.55),(.504,.235,.044),HONEY,.01)
    block((0,.4,.578),(.418,.173,.024),RUST,.006)
    for x in [-.11,.095]:
        stroke([(x-.045,-.046),(x+.038,-.046)],.011,.057,RIPPLE)


def bank(rx,ry,width,height,gap_angle):
    """Turf caps are continuous around the rampart. The gate cuts through both banks."""
    n=32
    angles=[-pi/2+gap_angle+(tau-2*gap_angle)*i/n for i in range(n+1)]
    ridges=[(-width, .003),(-width*.38,height),(.14*width,height*1.01),(width,.002)]
    v=[]
    for a in angles:
        wobble=.018*sin(3*a+.3)+.014*cos(5*a)
        for d,z in ridges:
            v.append(((rx+d+wobble)*cos(a),(ry+d+wobble*.65)*sin(a),z*(1+.055*cos(3*a))))
    f=[(4*i+j,4*i+j+1,4*(i+1)+j+1,4*(i+1)+j) for i in range(n) for j in range(3)]
    f.extend([(3,2,1,0),tuple(4*n+j for j in range(4))])
    o=mesh('Turf rampart',v,f,MOSS);o.data.materials.append(GRASS);o.data.materials.append(DIRT)
    for i,face in enumerate(o.data.polygons):
        face.material_index=1 if i%3==1 else 2 if i%3==2 and 7<=i//3<=10 else 0


def roundhouse(x,y,r):
    tube([(x,y,.064),(x,y,.226)],[r*.88,r*.82],LIME,12)
    tube([(x,y,.209),(x,y,.251),(x,y,.382)],[r*1.14,r*1.17,r*.19],REED,12)
    cylinder((x,y,.383),r*.15,.019,BARK,8)
    block((x,y-r*.81,.134),(r*.46,.025,.108),BARK,.011)
    for i in range(8):
        a=i*tau/8
        tube([(x+r*.99*cos(a),y+r*.99*sin(a),.272),(x+r*.34*cos(a),y+r*.34*sin(a),.359)],
             [.006,.004],WATTLE,4)


def hillfort():
    rock_slab('Hill crown',0,0,-.04,.60,.49,.126,GRASS,164)
    bank(.672,.53,.087,.108,.215)
    bank(.491,.399,.094,.162,.265)
    for i in range(37):
        a=-pi/2+.295+(tau-.59)*i/36
        x,y=.493*cos(a),.398*sin(a)
        h=.235+.023*sin(i*3.21)
        tube([(x,y,.12),(x,y,h),(x+.002,y+.002,h+.046)], [.023,.026,.004],WATTLE if i%4 else BARK,5)
    for x in [-.125,.125]:
        block((x,-.38,.14),(.053,.066,.275),BARK,.005)
    block((0,-.383,.272),(.302,.071,.048),WATTLE,.008)
    roundhouse(.078,.064,.161)
    roundhouse(-.17,.142,.115)


def rectangular_bank(rx,ry,width,height):
    rings=[(rx+width,ry+width,-.012),(rx+.044,ry+.044,height),(rx,ry,height),(rx-.04,ry-.04,.044)]
    v=[(a*x,b*y,z) for x,y,z in rings for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    f=[(j*4+i,j*4+(i+1)%4,(j+1)*4+(i+1)%4,(j+1)*4+i) for j in range(3) for i in range(4)]
    o=mesh('Reservoir banks',v,f,RUST);o.data.materials.append(HONEY)
    for poly in o.data.polygons[4:8]:poly.material_index=1


def baray():
    rectangular_bank(.575,.352,.095,.111)
    block((0,0,.044),(1.095,.659,.023),JADE,.013)
    # A double opening sustains the footbridge over the river intake.
    for x in [-.145,0,.145]:
        block((x,-.399,.111),(.060,.218,.222),RUST,.009)
        block((x,-.40,.226),(.082,.240,.037),HONEY,.008)
    block((0,-.393,.246),(.39,.093,.042),SAND,.009)
    for x in [-.145,.145]:
        block((x,-.393,.277),(.081,.12,.029),HONEY,.006)
    block((0,-.521,.022),(.25,.19,.046),CYAN,.014)
    for x in [-.138,.138]:
        block((x,-.533,.045),(.039,.202,.096),SAND,.007)
    # The low stair gives the long back bank a readable point of access.
    stair(.27,.196,0,.235,.04,.023,4,.051,SAND)
    for x in [-.568,.568]:
        for y in [-.346,.346]:
            block((x,y,.119),(.084,.082,.028),HONEY,.007)
    for x,y,w in [(-.30,.13,.18),(-.19,.06,.13),(.23,-.17,.14)]:
        stroke([(x-w*.5,y),(x+.035,y+.009),(x+w*.5,y+.009)],.012,.057,RIPPLE)


def fish_traps():
    for side in [-1,1]:
        a=Vector((side*.61,.38,0)); b=Vector((side*.093,-.22,0))
        vec=b-a
        for i in range(8):
            p=a+vec*i/7;h=.134+.027*sin(i*2.61+side)
            tube([(p.x,p.y,-.063),(p.x+.012*side,p.y+.01,h)],[.018,.013],BARK,6)
        for lift in [.024,.070,.107]:
            points=[]
            for j in range(15):
                p=a+vec*(j/14)
                points.append((p.x+.012*side*cos(j*pi),p.y,lift+.008*sin(j*1.8)))
            tube(points,[.013]*len(points),WATTLE,5)
    # The chamber is a tapered reed basket. Gaps expose water between the ribs.
    for j in range(12):
        a=j*tau/12; points=[(rx*cos(a),y,.053+rz*sin(a)) for y,rx,rz in
                            [(-.18,.092,.077),(-.31,.153,.099),(-.47,.096,.07),(-.51,.045,.044)]]
        tube(points,[.013,.013,.012,.009],REED,5)
    for y,rx,rz in [(-.224,.111,.084),(-.328,.147,.095),(-.433,.108,.076)]:
        loop=[(rx*cos(i*tau/12),y,.053+rz*sin(i*tau/12)) for i in range(13)]
        tube(loop,[.012]*13,BARK,5)
    for x in [.19,.36]:
        for y in [-.40,-.19]:
            tube([(x,y,-.09),(x,y,.165)],[.023,.018],BARK,6)
    for i in range(5):
        block((.273,-.418+i*.059,.128),(.269,.05,.034),WATTLE if i%2 else CEDAR_EDGE,.005)


def tree(x,y,size,seed):
    rng=Random(seed)
    fork=(x-.022*size,y,.287*size)
    tube([(x,y,-.012),fork,(x+.018*size,y+.015*size,.438*size)],
         [.066*size,.046*size,.019*size],BARK,7)
    lobes=[(-.098,-.045,.385,.143),(.09,-.053,.412,.14),(-.057,.082,.456,.132),(.061,.069,.522,.113)]
    for i,(dx,dy,z,r) in enumerate(lobes):
        p=(x+dx*size,y+dy*size,z*size)
        tube([fork,p],[.033*size,.012*size],BARK,6)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=p)
        o=bpy.context.object
        for vert in o.data.vertices:vert.co*=rng.uniform(.965,1.035)
        o.scale=(r*size*1.25,r*size,r*size*.87)
        o.data.materials.append(CANOPY[(i+seed)%3])
        o.rotation_euler.z=rng.uniform(0,tau)
        if i < 3:
            for a in [-1,1]:
                fx=p[0]+a*r*.61*size
                leaf((fx,p[1]-r*.71*size,p[2]-.008*size),(.033*size,)*3,PEAR if a>0 else RED_FRUIT)


def orchard():
    tree(-.277,.105,1.21,3);tree(.258,.198,1.02,5);tree(.353,-.118,.76,7)
    # The wide feet stand clear of the canopy at the normal board angle.
    for side in [-1,1]:
        tube([(-.19+side*.127,-.52,.012),(-.21+side*.088,-.17,.58)],[.022,.017],HONEY,7)
    for i in range(1,6):
        t=i/6
        x=-.19-.02*t
        half=.127-.039*t
        y=-.52+.35*t
        z=.012+.568*t
        tube([(x-half,y,z),(x+half,y,z)],[.017,.017],HONEY,7)
    for x,y in [(-.04,-.22),(.04,-.29)]:
        tube([(x,y,.004),(x,y,.071)],[.044,.061],WATTLE,8)
        for j in range(3):
            a=j*tau/3
            leaf((x+.027*cos(a),y+.022*sin(a),.078),(.026,.024,.024),PEAR)


def pavilion():
    for x in [-.193,.193]:
        for y in [.228,.448]:
            block((x,y,.221),(.046,.046,.274),HONEY,.006)
            block((x,y,.349),(.073,.074,.041),CHALK,.005)
    block((0,.338,.377),(.496,.322,.044),SAND,.008)
    v=[(-.274,.156,.406),(.274,.156,.406),(.274,.519,.406),(-.274,.519,.406),
       (-.116,.336,.537),(.116,.336,.537)]
    mesh('Pavilion roof',v,[(0,3,2,1),(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)],TEAL)
    tube([(-.13,.336,.54),(.13,.336,.54)],[.014,.014],SAND,6)


def paradise_garden():
    block((0,0,.025),(1.17,.98,.063),SAND,.030)
    block((0,0,.062),(1.1,.914,.024),LIME,.024)
    for x in [-.557,.557]:
        block((x,.015,.103),(.044,.942,.13),LIME,.009)
    block((0,.465,.126),(1.144,.046,.171),LIME,.011)
    for side in [-1,1]:
        block((side*.354,-.456,.099),(.424,.047,.11),LIME,.009)
    for x in [-.28,.28]:
        for y in [-.247,.104]:
            block((x,y,.087),(.376,.205,.037),MOSS,.026)
            for s in [-1,1]:
                leaf((x+s*.106,y,.133),(.077,.060,.060),CANOPY[1])
                leaf((x+s*.105,y-.027,.167),(.030,.028,.031),RED_FRUIT)
    block((0,-.043,.082),(.061,.803,.016),JADE,.002)
    block((0,-.073,.083),(.989,.063,.017),JADE,.002)
    cylinder((0,-.073,.097),.135,.036,CHALK,8)
    cylinder((0,-.073,.117),.106,.012,CYAN,8)
    cylinder((0,-.073,.154),.035,.067,SAND,8)
    for x in [-.46,.46]:
        for y in [-.341,.318]:
            cylinder((x,y,.153),.022,.143,BARK,7)
            height=.457 if y>.1 else .329
            tube([(x,y,.157),(x,y,.157+height*.30),(x,y,.157+height*.67),(x+.009,y,.157+height)],
                 [.042,.085,.062,.005],CYPRESS,8)
    pavilion()


MODELS = [
    ('nazca-lines',nazca,'desert'),('inuksuk',inuksuk,'tundra'),('totem-pole',totem,'forest'),
    ('stepwell',stepwell,'dry'),('hillfort',hillfort,'hill'),('baray',baray,'river'),
    ('fish-traps',fish_traps,'water'),('wild-orchard',orchard,'grove'),('paradise-garden',paradise_garden,'garden')
]


def finish_model(name):
    # Keep one named mesh with material slots. The game's settlement loader merges its colours for instancing.
    bpy.context.view_layer.update()
    objects=list(bpy.context.scene.objects)
    for obj in objects:
        bm=bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data)
        bm.free()
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.calc_loop_triangles()
    print(f'MODEL {name}: {len(obj.data.loop_triangles)} triangles',flush=True)
    bpy.ops.export_scene.gltf(filepath=str(STUDY/(name+'.glb')),export_format='GLB',
                             use_selection=True,export_yup=True,export_animations=False)


TILES = {
    'desert':('b27e52','aa754e','b98255'), 'tundra':('a7b6a2','a4b4a0','b8c1b5'),
    'forest':('88915b','87905a','919b64'), 'dry':('bd9c6c','b79a69','c3a575'),
    'hill':('8a965d','85905a','959c68'), 'river':('93a066','89955f','9ea971'),
    'water':('64a4a2','61a0a0','6caaa6'), 'grove':('8e995f','89945e','98a16a'),
    'garden':('b2a071','a99c69','bfae7a')
}


def stage_tile(kind):
    # Terrain is for scale and lighting only. A flat centre leaves each model's foot visible.
    palette=[pigment('Stage '+kind+' '+str(i),h) for i,h in enumerate(TILES[kind])]
    rng=Random(1973)
    n=18
    angles=[pi/6+i*tau/6 for i in range(7)]
    corners=[Vector((cos(a),sin(a))) for a in angles]
    brim=[corners[i//3].lerp(corners[i//3+1],(i%3)/3) for i in range(n)]
    surface=.002 if kind=='desert' else -.014
    v=[(0,0,surface)]
    for k,scale in enumerate([.37,.72,1.0]):
        for i,p in enumerate(brim):
            q=p*scale
            if k!=2:q+=Vector((rng.uniform(-.085,.085),rng.uniform(-.07,.07)))
            v.append((q.x,q.y,surface if k!=2 else -.019))
    faces=[(0,1+i,1+(i+1)%n) for i in range(n)]
    for k in range(2):
        for i in range(n):
            a=1+k*n+i;b=1+k*n+(i+1)%n
            faces.append((a,a+n,b+n));faces.append((a,b+n,b))
    o=mesh('Painted review ground',v,faces,palette[0])
    for m in palette[1:]:o.data.materials.append(m)
    for poly in o.data.polygons:poly.material_index=rng.choices([0,1,2],[7,4,2])[0]
    side=palette[1] if kind=='water' else DIRT
    polygon_solid('Tile edge',[(p.x,p.y) for p in brim],-.123,-.023,side)
    # Sparse marks around the edge keep terrain recognizable behind the work.
    for i in range(10):
        a=i*tau/10+rng.uniform(-.18,.18);rad=rng.uniform(.70,.84)
        x,y=rad*cos(a),rad*sin(a)
        if kind=='water':
            stroke([(x-.039,y),(x+.026,y+.006)],.007,-.010,RIPPLE)
        elif kind in ['forest','grove','hill','river','garden'] and i%3!=1:
            for s in [-1,1]:
                mesh('Ground grass',[(x-.015,y,-.013),(x+.012,y+.007,-.013),
                                     (x+s*.024,y+.008,.033+i%3*.006)],[(0,1,2)],MOSS)
        else:
            rock_slab('Loose stone',x,y,-.014,.025+i%3*.007,.018,.012+i%3*.005,
                      GRANITE[3] if kind=='tundra' else palette[2],i+29)


def review_picture(name,kind):
    from tempfile import gettempdir
    stage_tile(kind)
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.device='CPU'
    scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.cycles.max_bounces=4
    scene.render.film_transparent=True
    scene.render.resolution_x=548;scene.render.resolution_y=408;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
    scene.world.use_nodes=True
    sky=scene.world.node_tree.nodes.get('Background')
    sky.inputs[0].default_value=(.76,.81,.89,1);sky.inputs[1].default_value=.58
    def aim(obj,p):
        obj.rotation_euler=(Vector(p)-obj.location).to_track_quat('-Z','Y').to_euler()
    for label,p,power,size,col in [('Window',(-2.8,-3.4,5.7),510,3.1,(1,.88,.74)),
                                  ('Sky',(2,2.8,4.6),285,3.6,(.82,.90,1))]:
        light=bpy.data.lights.new(label,'AREA');light.energy=power;light.shape='DISK';light.size=size;light.color=col
        obj=bpy.data.objects.new(label,light);scene.collection.objects.link(obj);obj.location=p;aim(obj,(0,0,.12))
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.126))
    bpy.context.object.is_shadow_catcher=True
    bpy.ops.object.camera_add()
    camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.50
    target=(0,0,.23 if kind in ['forest','tundra'] else .075)
    camera.location=Vector(target)+Vector((1.52,-3.8,3.18))
    aim(camera,target)
    output=Path(gettempdir())/'magister-improvement-review'
    output.mkdir(parents=True,exist_ok=True)
    scene.render.filepath=str(output/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    print('REVIEW',scene.render.filepath,flush=True)


def source_scene():
    """Place each editable model in its own collection and keep the origin at the tile centre."""
    reset()
    scene=bpy.context.scene
    scene.name='Improvement studies'
    for index,(name,make,_) in enumerate(MODELS):
        collection=bpy.data.collections.new(name)
        scene.collection.children.link(collection)
        before=set(scene.objects)
        make()
        parts=set(scene.objects)-before
        root=bpy.data.objects.new(name,None)
        collection.objects.link(root)
        for part in sorted(parts,key=lambda obj:obj.name):
            for previous in list(part.users_collection):
                previous.objects.unlink(part)
            collection.objects.link(part)
            part.parent=root
        root.location=((index%3-1)*1.9,(1-index//3)*1.85,0)
        root.empty_display_type='PLAIN_AXES'
        root.empty_display_size=.1
    bpy.ops.object.select_all(action='DESELECT')
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                view=area.spaces.active
                view.shading.color_type='MATERIAL'
                view.overlay.show_overlays=False
                view.region_3d.view_distance=8.1
                view.region_3d.view_location=(0,0,.13)
                view.region_3d.view_rotation=Vector((-.32,.80,-.68)).to_track_quat('-Z','Y')
                view.region_3d.view_perspective='ORTHO'
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(STUDY/'improvements.blend'),compress=True)


if '--source-scene' in sys.argv:
    source_scene()
else:
    only=next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--only=')),None)
    if only and not any(only==name for name,_,_ in MODELS):
        raise ValueError(f'Unknown improvement {only}')
    for name,make,kind in MODELS:
        if only and only!=name:continue
        reset()
        make()
        finish_model(name)
        if '--pictures' in sys.argv:review_picture(name,kind)
