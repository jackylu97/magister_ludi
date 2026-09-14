"""Mounted knight study, matched to the user's carved mounted-knight reference.
Called by build_unit_assets.py; all mesh helpers and pigments are supplied.
Named authoring parts remain separate for clearance and turnaround review.
"""
def oval(name,p,scale,m=IVORY,n=20):
 x,y,z=p;rx,ry,rz=scale
 rings=[]
 for j in range(9):
  a=-math.pi/2+j*math.pi/8
  rings.append((x,y,z+math.sin(a)*rz,max(.002,math.cos(a)*rx),max(.002,math.cos(a)*ry)))
 o=rounded_form(name,rings,n,m=m);return o

def strap(name,points,radii,m=HARNESS,n=6,steps=2):
 values=interpolate([(*p,r) for p,r in zip(points,radii)],steps)
 o=tube([p[:3] for p in values],[p[3] for p in values],m,n);o.name=name;return o

def inlay(name,p,s,m=SOCKET):
 x,y,z=p;rx,ry,rz=s
 return mesh(name,[(x+rx,y,z),(x-rx,y,z),(x,y+ry,z),(x,y-ry,z),(x,y,z+rz),(x,y,z-rz)],[(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)],m)

def build_knight():
 base(.395,IVORY,steps=1)
 # Full horse: curved breast and rump, a tucked belly, arched neck and a long
 # dropped face. Each volume merges into one carved surface, not stacked blocks.
 horse=[loft(interpolate([(-.337,.501,.035,.061),(-.259,.511,.147,.175),(-.126,.519,.156,.172),(.027,.531,.150,.170),(.146,.545,.133,.185),(.250,.553,.074,.127)],3),IVORY,20)]
 horse.append(rounded_form('Forward arched neck',[(.101,0,.470,.132,.119),(.155,0,.603,.154,.116),(.211,0,.755,.139,.099),(.250,0,.881,.096,.075),(.272,0,.931,.061,.056)],28,m=IVORY))
 horse.append(loft(interpolate([(.240,.932,.042,.043),(.302,.921,.071,.089),(.361,.866,.065,.096),(.417,.789,.056,.089),(.458,.719,.056,.057),(.481,.714,.042,.043)],3),IVORY,20))
 # The convex cheek and inset jaw give the face a brow, jawline and throat.
 for side in [-1,1]:
  horse.append(oval('Horse cheek',(.312,side*.049,.883),(.052,.032,.067),IVORY))
  horse.append(sweep('Short pointed ear',[(.239,side*.043,.968),(.225,side*.052,1.026),(.243,side*.049,1.053)],[.027,.018,.003],IVORY,12))
 # A deliberate open bend: elbow -> projecting knee -> tucked fetlock.
 legs=[
  ([(.142,.098,.571),(.219,.143,.405),(.337,.183,.304),(.282,.184,.200),(.272,.184,.161)],[.063,.049,.037,.026,.025]),
  ([(.145,-.095,.554),(.189,-.137,.346),(.190,-.141,.149),(.213,-.141,.113)],[.059,.036,.025,.025]),
  ([(-.252,.094,.517),(-.282,.127,.372),(-.164,.148,.235),(-.222,.151,.118)],[.066,.048,.032,.028]),
  ([(-.224,-.090,.510),(-.241,-.128,.339),(-.154,-.140,.211),(-.167,-.144,.113)],[.062,.043,.030,.027])]
 for points,radii in legs:horse.append(sweep('Anatomical horse leg',points,radii,IVORY,14))
 for x,y,z in [(.284,.185,.147),(.226,-.141,.093),(-.211,.151,.093),(-.157,-.144,.093)]:
  horse.append(rounded_form('Broad pointed hoof',[(x,y,z-.009,.052,.044),(x+.009,y,z+.008,.055,.044),(x-.004,y,z+.047,.031,.030)],12,m=IVORY))
 horse.append(sweep('Heavy curled tail',[(-.32,.004,.565),(-.385,.020,.491),(-.381,.058,.337),(-.364,.083,.203),(-.424,.111,.135)],[.048,.054,.047,.037,.013],IVORY,14))
 sculpt_join(horse,'Knight horse',2450,.0075)
 # Five broad sculpted locks follow the curved crest toward the shoulders.
 locks=[]
 for k in range(5):
  x=.210-k*.031;z=.947-k*.063
  locks.append(sweep('Carved mane lock',[(x,.024,z),(x-.038,.075,z-.027),(x-.027,.097,z-.073),(x+.015,.086,z-.086)],[.037,.048,.039,.015],MANE,12))
 sculpt_join(locks,'Knight mane',390,.0065)
 # Seated upright torso: narrower shoulders and a long front breastplate.
 rider=[rounded_form('Seated torso',[(-.073,0,.639,.076,.075),(-.071,0,.747,.069,.079),(-.063,0,.859,.077,.090),(-.065,0,.942,.074,.105),(-.066,0,.990,.042,.047)],26,m=IVORY)]
 hands=[]
 for side in [-1,1]:
  rounded_form('Knight mantle sleeve',[(-.009,side*.125,.823,.041,.040),(-.020,side*.128,.853,.044,.043),(-.053,side*.101,.931,.048,.046),(-.061,side*.081,.955,.034,.039)],16,m=BODY,steps=1)
  rider.append(sweep('Seated armoured leg',[(-.079,side*.058,.713),(.047,side*.144,.579),(.090,side*.181,.506),(.025,side*.198,.384)],[.051,.046,.035,.027],IVORY,14))
  hands.append(sweep('Resting forearm',[(.012,side*.135,.821),(.068,side*.120,.802),(.133,side*.092,.818)],[.040,.035,.034],ARMOUR,14))
  hands.append(oval('Gauntlet knuckles',(.139,side*.089,.821),(.030,.031,.030),ARMOUR,16))
 sculpt_join(rider,'Knight rider',850,.007)
 sculpt_join(hands,'Knight gauntlets',320,.0055)
 # Kneecaps, overlapping thigh lames and long greaves remain cream stone.
 # Each entire boot/greave has its own object for independent cloak checks.
 for side,label in [(1,'left'),(-1,'right')]:
  pieces=[rounded_form('Fitted greave',[(.025,side*.207,.308,.026,.027),(.019,side*.204,.338,.030,.029),(.034,side*.196,.415,.031,.029),(.049,side*.193,.455,.030,.027)],14,m=IVORY),oval('Compact pointed sabaton',(.057,side*.214,.307),(.052,.032,.023),IVORY,14)]
  sculpt_join(pieces,'Knight boot '+label,190,.005)
  cap=oval('Knee plate',(.091,side*.186,.502),(.044,.030,.046),IVORY,16)
  sculpt_join([cap],'Knight knee '+label,100,.006)
  for k in range(2):
   x=.069-k*.012;z=.544+k*.023
   strap('Thigh armour lame',[(x-.022,side*.173,z),(x,side*.189,z-.007),(x+.024,side*.174,z-.015)],[.008,.009,.007],MANE,6,1)
 # A rounded barrel helmet: long parallel visor, short domed crown.
 rounded_form('Knight great helm',[(-.066,0,.981,.051,.054),(-.062,0,1.007,.058,.057),(-.060,0,1.112,.059,.056),(-.060,0,1.128,.057,.054),(-.062,0,1.161,.044,.042),(-.065,0,1.184,.023,.022),(-.066,0,1.187,.010,.010)],22,m=IVORY,steps=1)
 # One narrow recessed visor and two rows of small vent cuts.
 for side in [-1,1]:
  strap('Knight visor slit',[(-.001,0,1.096),(-.006,side*.029,1.096),(-.018,side*.046,1.096)],[.0037,.0037,.0028],HARNESS,4,1)
  for y in [.012,.031]:
   for z in [1.064,1.043,1.023]:
    x=-.004-(y/.057)**2*.014
    inlay('Knight visor vent',(x,side*y,z),(.0039,.0035,.0042))
 # A shaped breastplate, with an intentionally broad and readable chest mark.
 # Fit the surcoat directly to the torso, wrapping its broad chest rather
 # than projecting a disconnected shield in front of the rider.
 chest=[]
 for z,x,r in [(.779,-.069,.073),(.869,-.063,.081),(.934,-.065,.078)]:
  for y in [-.065,-.031,0,.031,.065]:
   chest.append((x+r*math.sqrt(max(.06,1-(y/.097)**2))+.002,y,z))
 mesh('Knight breastplate',chest,[(j*5+i,j*5+i+1,(j+1)*5+i+1,(j+1)*5+i) for j in range(2) for i in range(4)],IVORY)
 cross=[];cross_faces=[]
 def chest_x(y,z):return -.063+.081*math.sqrt(max(.06,1-(y/.097)**2))+.005
 for ys,zs in [([-.054,-.027,0,.027,.054],[.887,.912]),([-.014,.014],[.803,.887,.912,.923])]:
  first=len(cross)
  for z in zs:
   for y in ys:cross.append((chest_x(y,z),y,z))
  for j in range(len(zs)-1):
   for i in range(len(ys)-1):
    k=first+j*len(ys)+i;cross_faces.append((k,k+1,k+len(ys)+1,k+len(ys)))
 mesh('Knight heraldic mark',cross,cross_faces,BODY)
 # Shared cloak profile. Below the waist its front edges move BEHIND the
 # exposed knees/boots. This prevents isolated boot fragments through cloth.
 v=[];f=[];cols=48;rows=29
 cloth_profiles=[(.11,-.111,.211,.194),(.17,-.121,.255,.218),(.29,-.124,.260,.224),(.44,-.128,.261,.226),(.60,-.131,.251,.229),(.73,-.111,.194,.197),(.85,-.088,.144,.166),(.94,-.076,.096,.112),(.994,-.067,.044,.049)]
 def cloth_shape(z):
  for p,q in zip(cloth_profiles,cloth_profiles[1:]):
   if z<=q[0]:
    u=max(0,min(1,(z-p[0])/(q[0]-p[0])))
    return tuple(p[k]*(1-u)+q[k]*u for k in [1,2,3])
  return cloth_profiles[-1][1:]
 for j in range(rows):
  t=j/(rows-1)
  u=max(0,min(1,(t-.20)/.50));u=u*u*(3-2*u)
  start=math.pi*(.28+.25*u)
  for i in range(cols+1):
   a=start+(math.tau-2*start)*i/cols
   top=.994
   rear=max(0,-math.cos(a))**4
   edge=min(a-start,math.tau-start-a)
   bottom=.132+.493*rear+.055*math.exp(-(edge/.14)**2)
   z=top*(1-t)+bottom*t
   # Shoulder flare is rounded; the hem narrows back toward a hanging tongue.
   cx,sx,sy=cloth_shape(z)
   b=min(a,math.tau-a)
   fold=.010*math.cos(5*a+.45*math.sin(math.pi*t))
   weight=math.sin(math.pi*t*.91)
   curl=max(0,(t-.88)/.12)**2
   x=cx+(sx+fold*weight+.008*curl)*math.cos(a)
   roll=.045*math.exp(-((b-(1.99+.11*math.sin(math.pi*t)))/.115)**2)
   roll+=.032*math.exp(-((b-(2.39+.07*math.sin(math.pi*t)))/.13)**2)
   trough=.016*math.exp(-((b-(2.23+.07*math.sin(math.pi*t)))/.13)**2)
   y=(sy+fold*weight+.009*curl)*math.sin(a)+(1 if a<math.pi else -1)*(roll-trough)*math.sin(math.pi*t*.86)
   v.append((x,y,z+.015*curl))
 for j in range(rows-1):
  for i in range(cols):
   k=j*(cols+1)+i;f.append((k,k+1,k+cols+2,k+cols+1))
 # Let the cloth ride over the actual flanks. A side ray gives the exterior
 # horse silhouette at each cloth sample, including the bent hind legs.
 # This is authored once, so the game still receives one static shared mesh.
 from mathutils.bvhtree import BVHTree
 horse_tree=BVHTree.FromObject(bpy.data.objects['Knight horse'],bpy.context.evaluated_depsgraph_get())
 for i,(x,y,z) in enumerate(v):
  side=1 if y>=0 else -1
  hit,normal,face,distance=horse_tree.ray_cast(Vector((x,side,z)),Vector((0,-side,0)),2)
  if hit is not None and side*y<side*hit.y+.028:
   v[i]=(x,side*(side*hit.y+.028),z)
 cloak=mesh('Knight cloak',v,f,BODY)
 mod=cloak.modifiers.new('Heavy cloth thickness','SOLIDIFY');mod.thickness=.017;mod.offset=0;bpy.context.view_layer.objects.active=cloak;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=cloak.modifiers.new('Broad cloth planes','DECIMATE');mod.ratio=.36;bpy.ops.object.modifier_apply(modifier=mod.name)
 cloak.name='Knight cloak'
 # Bridle follows cheek/muzzle; reins run back to the actual mittens.
 for side in [-1,1]:
  strap('Knight bridle cheek',[(.308,side*.071,.923),(.361,side*.067,.845),(.453,side*.062,.746)],[.0075,.008,.0075])
  strap('Knight held rein',[(.143,side*.091,.817),(.257,side*.105,.741),(.374,side*.079,.712),(.451,side*.062,.749)],[.006]*4)
  inlay('Knight horse eye',(.337,side*.072,.892),(.011,.0045,.009))
  inlay('Knight horse nostril',(.468,side*.051,.735),(.008,.0035,.007),MANE)
 strap('Knight noseband',[(.454,-.062,.750),(.482,-.034,.765),(.490,0,.769),(.482,.034,.765),(.454,.062,.750)],[.008]*5)
 collar=[]
 for p in interpolate([(.090,-.130,.626),(.218,-.104,.556),(.273,0,.515),(.218,.104,.556),(.090,.130,.626)],4):
  hit,normal,index,distance=horse_tree.find_nearest(Vector(p))
  collar.append(hit+normal*.012)
 tube(collar,[.010]*len(collar),HARNESS,6).name='Horse breast collar'
 # Keep the horse compact: shorten the lower-leg zone while translating the
 # torso/rider as a whole, preserving head and helmet proportions.
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or o.name=='Turned circular base':continue
  for p in o.data.vertices:
   z=p.co.z
   p.co.z=z-.045*max(0,min(1,(z-.084)/(.430-.084)))
build_knight()
