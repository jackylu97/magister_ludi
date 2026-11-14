"""Unit pieces for the north-star look; run via build_settlement_assets.py -- --ns-units-only.

The user, 2026-11-14: "could you create a page for how you'd redesign the
units? lets do a single melee piece for now, you can choose." This file builds
the swordsman in two directions, and grey blockouts of four other classes:

- `ns-swordsman`: one large figure on a low base (the direction chosen);
- `ns-swordsman-squad`: three smaller figures on one base (the direction
  rejected, kept so the two can be compared);
- `ns-block-spearman`, `ns-block-archer`, `ns-block-horseman`,
  `ns-block-catapult`: rough shapes in one grey, to show how the classes differ
  in outline. They are not finished models.

After this script, run `node scripts/terrain-study/bake_northstar_units.mjs`.
It writes the models into src/terrainStudy/northStarUnitData.json, which the
renderer reads. `NORTH_STAR_UNITS` in src/terrainStudy/northStarAssets.js names
the unit types that use a model from here.

The rules of a piece:
- A figure looks toward -Y and stands on z = 0. One unit is one world unit, and
  the single figure is about 0.95 tall with its plume, as today's piece is.
- A material whose name starts with `Owner` takes the seat's first colour. One
  that starts with `Trim` takes the seat's second colour. Both are written in
  white or a light grey, because the renderer multiplies them by the seat's
  colour. Every other material keeps its own colour.
- Each vertex carries how it moves when the piece idles, as a vertex colour:
  red is how much it follows the body's breath and shift of weight (0 at the
  feet, 1 at the top of the head), green how much it flutters (0 at the root of
  a plume or the top of a cape, 1 at its free end), and blue is the figure's
  own phase from 0 to 1, so the three figures of a squad do not move as one.
"""

OUT_UNITS=Path(__file__).resolve().parents[2]/'art'/'terrain-study'/'northstar-units'
OUT_UNITS.mkdir(parents=True,exist_ok=True)

OWNER=pigment('Owner cloth','ffffff');OWNER_DEEP=pigment('Owner cloth in shade','d2d2d2');OWNER_BASE=pigment('Owner base','e6e6e6')
TRIM=pigment('Trim cloth','ffffff');TRIM_DEEP=pigment('Trim metal','dcdcdc')
STEEL=pigment('NS unit steel','8f9dab');STEEL_DARK=pigment('NS unit dark steel','66727f');BLADE=pigment('NS unit blade','cfd8e0')
SKIN=pigment('NS unit skin','e9b98e');LEATHER=pigment('NS unit leather','54402f');HOSE=pigment('NS unit hose','6f5f52')
WOOD_U=pigment('NS unit wood','8a6a48');EYE=pigment('NS unit eye','2e2724');BLOCK=pigment('NS blockout grey','9aa0a6')

STATE={'phase':0.,'top':1.,'new':[]}

def keep(o,idle='body',root=None):
 """Notes how an object moves. `flutter` parts swing from `root`."""
 o['idle']=idle
 if root is not None:o['root']=list(root)
 STATE['new'].append(o);return o

def rings(profile,m,n=8,turn=0.,idle='body',root=None):
 """A form of stacked rings: each is (x, y, z, radius in x, radius in y)."""
 v=[];f=[]
 for x,y,z,rx,ry in profile:
  for i in range(n):
   a=turn+(i+.5)*math.tau/n;v.append((x+math.cos(a)*rx,y+math.sin(a)*ry,z))
 for j in range(len(profile)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.extend([tuple(reversed(range(n))),tuple(range((len(profile)-1)*n,len(profile)*n))])
 return keep(mesh('Ringed form',v,f,m),idle,root)

def limb(points,radii,m,n=5,idle='body',root=None):return keep(tube(points,radii,m,n),idle,root)
def slab(p,s,m,idle='body',root=None):return keep(block(p,s,m,0),idle,root)

def plate(centre,normal,radius,thick,m,n=10,dome=0.):
 """A round plate that faces along `normal`. `dome` pushes its middle out."""
 c=Vector(centre);d=Vector(normal).normalized()
 pts=[c-d*thick/2,c+d*thick/2];rad=[radius,radius]
 if dome:pts.append(c+d*(thick/2+dome));rad.append(radius*.45)
 return keep(tube([tuple(p) for p in pts],rad,m,n))

def blade(grip,tip,width,m=BLADE,thick=.014):
 """A flat blade with a point, from the guard to the tip."""
 a=Vector(grip);b=Vector(tip);d=(b-a).normalized();side=d.cross(Vector((0,1,0)))
 if side.length<.05:side=d.cross(Vector((1,0,0)))
 side.normalize();face=d.cross(side).normalized();s=a+(b-a)*.80
 v=[a-side*width,a+face*thick,a+side*width,a-face*thick,s-side*width*.9,s+face*thick,s+side*width*.9,s-face*thick,b]
 f=[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,8),(5,6,8),(6,7,8),(7,4,8),(3,2,1,0)]
 return keep(mesh('Blade',[tuple(p) for p in v],f,m))

def base(radius=.235,rim=TRIM_DEEP):
 """The low round base: the seat's first colour, with a rim in the second."""
 o=rings([(0,0,0,radius*1.06,radius*1.06),(0,0,.018,radius*1.06,radius*1.06)],rim,14,idle=None)
 p=rings([(0,0,.018,radius,radius),(0,0,.034,radius*.97,radius*.97)],OWNER_BASE,14,idle=None)
 return o,p

def place(objects,at=(0,0),scale=1.,yaw=0.,phase=0.):
 """Moves the parts of one figure to its place in the piece."""
 for o in objects:
  # A block keeps its place in `location`. Write every vertex where it ends up, and clear the location.
  c=math.cos(yaw);n=math.sin(yaw);own=o.location.copy()
  for v in o.data.vertices:
   p=(v.co+own)*scale;v.co=(p.x*c-p.y*n+at[0],p.x*n+p.y*c+at[1],p.z)
  if 'root' in o:
   r=Vector(o['root'])*scale;o['root']=[r.x*c-r.y*n+at[0],r.x*n+r.y*c+at[1],r.z]
  o.location=(0,0,0);o['phase']=phase;o['top']=1.02*scale;o['size']=scale

def tilt(objects,pivot,angle):
 """Leans parts back about a line through `pivot` that runs from side to side, so a face looks up at the camera."""
 c=math.cos(angle);n=math.sin(angle)
 for o in objects:
  at=o.location
  for v in o.data.vertices:
   # A block keeps its place in `location`, so that is added before the turn and taken off after it.
   y=v.co.y+at.y-pivot[1];z=v.co.z+at.z-pivot[2];v.co.y=pivot[1]+y*c+z*n-at.y;v.co.z=pivot[2]-y*n+z*c-at.z
  if 'root' in o:
   y=o['root'][1]-pivot[1];z=o['root'][2]-pivot[2];o['root']=[o['root'][0],pivot[1]+y*c+z*n,pivot[2]-y*n+z*c]

def swordsman_figure(detail=True):
 """One swordsman. Returns its parts. `detail=False` leaves out the small parts, for a squad."""
 STATE['new']=[]
 n=8 if detail else 6
 # Boots and legs: a wide stance, the left foot (+X) a little forward.
 for x,y in ((.095,-.04),(-.095,.035)):
  slab((x,y-.018,.062),(.092,.140,.056),LEATHER)
  limb([(x,y,.09),(x*.95,y,.22),(x*.85,0,.38)],[.058,.062,.070],HOSE,5)
 # The tunic: a short flared skirt, a waist, a deep chest. The seat's first colour.
 rings([(0,.005,.30,.190,.155),(0,.005,.35,.172,.140),(0,0,.44,.130,.108),(0,-.005,.56,.162,.126),(0,0,.645,.150,.112),(0,0,.69,.085,.075)],OWNER,n)
 # A hem and a belt in the seat's second colour.
 rings([(0,.005,.285,.196,.160),(0,.005,.318,.186,.152)],TRIM,n)
 rings([(0,0,.412,.146,.122),(0,0,.458,.143,.119)],TRIM,n)
 # A large head, then an open helmet set back on it, so the face shows from above.
 head=[rings([(0,-.005,.675,.075,.070),(0,-.012,.730,.122,.114),(0,-.012,.810,.128,.118),(0,-.008,.860,.095,.090)],SKIN,n)]
 head.append(rings([(0,.012,.815,.150,.142),(0,.012,.830,.134,.126),(0,.012,.895,.112,.106),(0,.012,.930,.050,.048)],STEEL,n))
 if detail:
  head.append(slab((0,-.136,.768),(.026,.024,.030),SKIN))
  for s in (-1,1):head.append(slab((s*.056,-.124,.796),(.020,.014,.028),EYE))
 # The crest: the second colour, a ridge from the brow over the crown and down the back of the helmet.
 root=(0,-.10,.86)
 crest=[(-.105,.868,.014),(-.06,.915,.058),(.012,.932,.075),(.085,.915,.075),(.128,.868,.055),(.142,.815,.014)]
 v=[];f=[]
 for y,z,h in crest:
  d=Vector((y-.012,z-.83)).normalized()
  v+=[(-.034,y,z),(.034,y,z),(.022,y+d.x*h,z+d.y*h),(-.022,y+d.x*h,z+d.y*h)]
 for k in range(len(crest)-1):
  a=k*4;f+=[(a+i,a+(i+1)%4,a+4+(i+1)%4,a+4+i) for i in range(4)]
 f+=[(3,2,1,0),tuple(range(len(v)-4,len(v)))]
 head.append(keep(mesh('Crest',v,f,TRIM),'flutter',root))
 tilt(head,(0,0,.70),.32)
 # Small dark steel shoulders.
 for s in (-1,1):rings([(s*.160,0,.610,.056,.064),(s*.164,0,.655,.052,.058),(s*.150,0,.690,.020,.024)],STEEL_DARK,6)
 # Right arm (-X): the fist forward at the hip, the sword up and a little out.
 limb([(-.165,0,.640),(-.225,-.03,.540),(-.235,-.115,.50)],[.052,.046,.042],OWNER_DEEP,5)
 slab((-.238,-.135,.50),(.076,.076,.080),SKIN)
 hand=Vector((-.238,-.135,.50));up=Vector((-.26,-.06,1.)).normalized()
 limb([tuple(hand-up*.075),tuple(hand+up*.05)],[.017,.017],LEATHER,4)
 limb([tuple(hand-up*.105),tuple(hand-up*.07)],[.028,.028],TRIM_DEEP,5)
 guard=hand+up*.060;side=up.cross(Vector((0,1,0))).normalized()
 limb([tuple(guard-side*.095),tuple(guard+side*.095)],[.019,.019],TRIM_DEEP,4)
 blade(tuple(guard),tuple(guard+up*.50),.048)
 # Left arm (+X) behind a large round shield: first colour, a rim in the second, a steel boss.
 limb([(.165,0,.640),(.225,-.05,.56),(.20,-.13,.50)],[.052,.046,.042],OWNER_DEEP,5)
 centre=Vector((.175,-.180,.46));face=Vector((.38,-1.,.30)).normalized()
 plate(centre,face,.195,.022,TRIM_DEEP,10)
 plate(centre+face*.014,face,.158,.022,OWNER,10)
 plate(centre+face*.028,face,.060,.012,STEEL_DARK,6,dome=.03)
 # A short cape down the back, in the first colour's shade, so the back is not bare.
 root=(0,.10,.68)
 v=[];rows=[(.68,.115,.105),(.56,.150,.135),(.44,.175,.175),(.33,.185,.215)]
 for z,half,back in rows:
  for t in (-1,-.5,0,.5,1):v.append((t*half,back-abs(t)*.045,z))
 f=[(j*5+i,j*5+i+1,(j+1)*5+i+1,(j+1)*5+i) for j in range(len(rows)-1) for i in range(4)]
 f+=[tuple(reversed(q)) for q in f]
 keep(mesh('Short cape',v,f,OWNER_DEEP),'flutter',root)
 return STATE['new']

def marks_and_export(name):
 """Writes each vertex's idle weights as a vertex colour, then exports the piece."""
 bpy.context.view_layer.update();tris=0
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  for p in o.data.polygons:p.use_smooth=False
  o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
 for o in meshes:
  kind=o.get('idle');top=o.get('top',.97);phase=o.get('phase',0.);scale=o.get('size',1.)
  world=[o.matrix_world@v.co for v in o.data.vertices]
  root=o.matrix_world@Vector(o['root']) if 'root' in o else None
  reach=max([(w-root).length for w in world] or [1]) if root is not None else 1
  attr=o.data.color_attributes.new(name='move',type='FLOAT_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
  for loop in o.data.loops:
   w=world[loop.vertex_index]
   body=0 if kind is None else max(0,min(1,(w.z-.10*scale)/(top-.10*scale)))**1.5
   flutter=min(1,(w-root).length/reach) if kind=='flutter' else 0
   attr.data[loop.index].color=(body,flutter,phase,1)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT_UNITS/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_vertex_color='ACTIVE')
 print('ASSET',name,tris,flush=True)

def swordsman():
 reset();base(.25);place(swordsman_figure(),scale=1.06);marks_and_export('ns-swordsman')

def swordsman_squad():
 reset();base(.29)
 for at,yaw,phase in (((0,-.135),0,.0),((-.165,.085),.22,.37),((.165,.085),-.18,.71)):
  place(swordsman_figure(False),at,.60,yaw,phase)
 marks_and_export('ns-swordsman-squad')

# --- grey blockouts: outline only ---------------------------------------------------
def block_body():
 for x in (.08,-.08):limb([(x,0,.03),(x,0,.36)],[.06,.066],BLOCK,5)
 rings([(0,0,.27,.185,.150),(0,0,.44,.128,.105),(0,0,.56,.158,.122),(0,0,.70,.085,.075)],BLOCK,8)
 rings([(0,-.01,.685,.07,.066),(0,-.01,.735,.108,.10),(0,-.01,.80,.112,.104),(0,-.01,.84,.085,.08)],BLOCK,8)

def blockout(name,author):
 reset();STATE['new']=[];rings([(0,0,0,.265,.265),(0,0,.034,.25,.25)],BLOCK,14,idle=None);author();marks_and_export('ns-block-'+name)

def block_spearman():
 block_body()
 # A tall spear, a tall narrow shield and a pointed helmet: the tallest foot piece.
 rings([(0,-.01,.79,.13,.12),(0,-.01,.88,.09,.085),(0,-.01,1.0,.012,.012)],BLOCK,8)
 limb([(-.23,-.10,.03),(-.23,-.10,1.22)],[.016,.016],BLOCK,4);blade((-.23,-.10,1.20),(-.23,-.10,1.40),.045,BLOCK)
 limb([(-.165,0,.645),(-.23,-.10,.56)],[.05,.045],BLOCK,5)
 slab((.17,-.17,.42),(.20,.03,.50),BLOCK)

def block_archer():
 block_body()
 # No shield and no helmet: a hood, a tall bow held out to the side and a quiver over the shoulder.
 rings([(0,0,.76,.125,.12),(0,.03,.90,.07,.07),(0,.07,.94,.01,.01)],BLOCK,8)
 pts=[(-.30+.10*math.cos(a),-.10,.52+.40*math.sin(a)) for a in [math.radians(d) for d in (-90,-60,-30,0,30,60,90)]]
 limb(pts,[.012,.016,.018,.02,.018,.016,.012],BLOCK,4)
 limb([(-.165,0,.645),(-.21,-.10,.52)],[.05,.045],BLOCK,5)
 limb([(.10,.13,.50),(.17,.15,.86)],[.045,.05],BLOCK,5)

def block_horseman():
 # A rider on a horse: long and low, twice the footprint of a foot piece.
 loft([(-.30,.36,.05,.08),(-.20,.38,.13,.15),(.0,.37,.13,.14),(.18,.39,.13,.15),(.27,.42,.07,.10)],BLOCK,6).rotation_euler[2]=-math.pi/2
 for x,y in ((.07,-.20),(-.07,-.20),(.07,.20),(-.07,.20)):limb([(x,y,.34),(x,y,.03)],[.05,.035],BLOCK,4)
 limb([(0,-.22,.42),(0,-.32,.60),(0,-.36,.70)],[.10,.075,.06],BLOCK,5);limb([(0,-.34,.72),(0,-.48,.62)],[.07,.045],BLOCK,5)
 limb([(0,.30,.44),(0,.38,.24)],[.03,.04],BLOCK,4)
 rings([(0,0,.46,.11,.10),(0,0,.66,.13,.10),(0,0,.76,.07,.065)],BLOCK,8);rings([(0,-.01,.75,.07,.066),(0,-.01,.84,.105,.10),(0,-.01,.93,.06,.06)],BLOCK,8)
 limb([(-.16,-.05,.60),(-.16,-.40,1.10)],[.014,.014],BLOCK,4)

def block_catapult():
 # A machine with no figure taller than it: a frame, four wheels and one long arm.
 slab((0,0,.16),(.34,.52,.06),BLOCK)
 for x in (-.19,.19):
  for y in (-.18,.18):keep(tube([(x-.02,y,.13),(x+.02,y,.13)],[.13,.13],BLOCK,8))
  limb([(x*.8,-.10,.18),(x*.8,.02,.56)],[.03,.03],BLOCK,4)
 limb([(-.16,.02,.56),(.16,.02,.56)],[.03,.03],BLOCK,4)
 limb([(0,-.22,.20),(0,.30,.78)],[.03,.022],BLOCK,4);slab((0,.32,.80),(.12,.12,.07),BLOCK)

swordsman();swordsman_squad()
for name,author in (('spearman',block_spearman),('archer',block_archer),('horseman',block_horseman),('catapult',block_catapult)):blockout(name,author)
