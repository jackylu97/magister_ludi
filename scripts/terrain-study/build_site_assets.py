"""Discovery-site pieces for the painted map. Author with -- --sites-only.
Uses the settlement kit's Blender helpers; every part retains a small, separate
footprint so ruins and huts can be seated individually on real hill surfaces.
"""
AGED=pigment('Weathered limestone','bfb393')
FRESH=pigment('Exposed stone cut','d9caaa')
EARTH=pigment('Clay plaster','ba936a')
THATCH=pigment('Reed thatch','b79453')
STRAW=pigment('Sunlit reed bundles','ccb271')
TIMBER=pigment('Broken oak','86694c')
ENDGRAIN=pigment('Fresh broken timber','b49870')
RED=pigment('Madder canvas','a95743')
OCHRE=pigment('Canvas seam','c8965a')

def ruin_arch():
 for side in [-1,1]:
  block((side*.183,0,.021),(.14,.20,.042),AGED,.012)
  for j in range(4):
   block((side*(.183+.005*math.sin(j*3)),.004*math.cos(j*2),.09+j*.080),(.099,.151,.077),FRESH if j==2 else AGED,.010)
 # Unequal wedge faces and one chipped outer corner, still structurally joined.
 n=9;r=.135;spring=.356
 for i in range(n):
  a=i*math.pi/n;b=(i+1)*math.pi/n;outer=r+.085-(.018 if i==2 else 0)
  v=[]
  for yy in [-.073,.073]:
   for rr,angle in [(r,a),(r,b),(outer,b),(outer,a)]:v.append((math.cos(angle)*rr,yy,spring+math.sin(angle)*rr))
  mesh('Worn arch block',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],FRESH if i%4==0 else AGED)
 block((-.18,.045,.407),(.15,.17,.028),FRESH,.009)
 # Moss is pigment on a few quiet surfaces, not another foliage layer.
 block((.19,.020,.044),(.09,.13,.010),LEAF,.003)

def ruin_column():
 block((0,0,.026),(.18,.18,.052),AGED,.014)
 cylinder((0,0,.069),.078,.035,FRESH,10)
 n=10;v=[];f=[]
 for j,(z,r) in enumerate([(.085,.054),(.38,.047)]):
  for i in range(n):
   a=i*math.tau/n;v.append((r*math.cos(a),r*math.sin(a),z+(.012*math.sin(i*2.3) if j else 0)))
 for i in range(n):f.append((i,(i+1)%n,n+(i+1)%n,n+i))
 f.extend([tuple(reversed(range(n))),tuple(range(n,2*n))]);mesh('Snapped column',v,f,AGED)
 for i in range(5):
  a=i*math.tau/5
  tube([(.052*math.cos(a),.052*math.sin(a),.105),(.046*math.cos(a),.046*math.sin(a),.31)],[.005,.004],FRESH,4)

def ruin_fragment():
 block((-.024,.009,.027),(.21,.15,.054),AGED,.018)
 o=block((.035,-.005,.074),(.13,.12,.062),FRESH,.009);o.rotation_euler[2]=.21
 o=block((-.063,.026,.092),(.074,.10,.056),AGED,.012);o.rotation_euler[2]=-.27

def hut():
 cylinder((0,0,.027),.168,.054,AGED,10)
 cylinder((0,0,.135),.151,.205,EARTH,10)
 block((0,-.148,.107),(.069,.015,.139),DARK,.015)
 for x in [-.046,.046]:tube([(x,-.153,.029),(x,-.153,.202)],[.013,.011],WOOD,6)
 block((0,-.16,.201),(.12,.042,.025),TIMBER,.005)
 v=[];f=[];n=12
 for z,r in [(.226,.193),(.267,.178),(.381,.060),(.401,.023)]:
  for i in range(n):v.append((r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z))
 for j in range(3):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.append(tuple(range(3*n,4*n)));mesh('Bundled reed roof',v,f,THATCH)
 for i in range(12):
  a=i*math.tau/12
  tube([(.027*math.cos(a),.027*math.sin(a),.402),(.18*math.cos(a),.18*math.sin(a),.243)],[.006,.011],STRAW,5)
 cylinder((0,0,.412),.025,.036,TIMBER,8)

def longhouse():
 block((0,0,.026),(.45,.31,.052),AGED,.011)
 block((0,0,.141),(.405,.27,.23),EARTH,.014)
 roof(0,0,.261,.48,.35,.18,THATCH)
 for x in [-.18,0,.18]:tube([(x,-.145,.052),(x,-.145,.259)],[.012,.011],TIMBER,6)
 block((.06,-.146,.133),(.071,.016,.165),DARK,.006)
 for j in range(7):
  y=-.15+j*.05
  for side in [-1,1]:tube([(side*.012,y,.445),(side*.226,y,.277)],[.006,.010],STRAW,5)
 tube([(0,-.19,.445),(0,.19,.445)],[.015,.015],TIMBER,6)

def antiquity():
 # Low opened burial chest and a worn stele: recognisable as an excavation,
 # distinctly below the architectural silhouette of an above-ground ruin.
 block((0,0,.016),(.34,.22,.032),AGED,.008)
 for side in [-1,1]:block((side*.15,0,.073),(.041,.22,.112),AGED,.008)
 for side in [-1,1]:block((0,side*.095,.073),(.30,.032,.112),AGED,.007)
 block((0,0,.040),(.254,.154,.016),DARK,.002)
 o=block((.032,.165,.052),(.32,.15,.057),FRESH,.009);o.rotation_euler[2]=-.19;o.rotation_euler[0]=.15
 # A broken ceremonial tablet still half sunk into the mound.
 mesh('Half buried stele',[(-.072,.085,.04),(.078,.085,.04),(.075,.085,.265),(.025,.085,.319),(-.063,.085,.286),(-.072,.15,.04),(.078,.15,.04),(.075,.15,.265),(.025,.15,.319),(-.063,.15,.286)],[(0,1,2,3,4),(9,8,7,6,5),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0)],AGED)
 medallion=cylinder((0,0,0),.035,.005,GOLD,10);medallion.rotation_euler[0]=math.pi/2;medallion.location=(.006,.080,.237)
 for z,w in [(.158,.086),(.183,.066)]:block((.003,.078,z),(w,.006,.009),MASON if 'MASON' in globals() else SHADE,.002)
 for x,y in [(-.10,-.008),(.059,.01)]:
  cylinder((x,y,.067),.017,.038,GOLD,7)

def wreck():
 # An open fractured hull, with no intact sail to confuse it with a unit.
 # The waterline is z=0; the lower keel is intentionally submerged.
 n=12;v=[];f=[]
 for z,rx,ry in [(-.075,.28,.055),(.015,.43,.16),(.104,.46,.20)]:
  for i in range(n):
   a=i*math.tau/n;v.append((math.cos(a)*rx,math.sin(a)*ry,z+(.035*math.sin(i*3) if z>.1 else 0)))
 for j in range(2):
  for i in range(n):
   if j==1 and i in [1,2,3,7]:continue
   f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 mesh('Broken planking',v,f,TIMBER)
 for i in range(7):
  x=-.32+i*.107;w=.16*math.sqrt(max(.1,1-(x/.46)**2))
  tube([(x,-w,.115),(x,-w*.77,.005),(x,0,-.017),(x,w*.8,.005),(x,w,.14)],[.015]*5,ENDGRAIN,5)
 tube([(-.37,0,-.020),(.43,0,.023)],[.022,.019],TIMBER,6)
 tube([(-.07,0,.012),(.095,.043,.43),(.10,.046,.452)],[.023,.016,.002],TIMBER,6)
 tube([(-.25,-.24,.035),(.27,.22,.04)],[.018,.013],ENDGRAIN,5)
 tube([(.06,.03,.335),(-.18,.03,.34)],[.011,.009],TIMBER,5)
 mesh('Torn linen remnant',[(.09,.034,.414),(.047,.014,.261),(-.005,.021,.295),(-.036,.024,.257),(-.055,.031,.335),(-.176,.043,.339)],[(0,1,2),(0,2,4),(2,3,4),(0,4,5)],WHITE)
 for x,y in [(.24,-.04),(-.18,.06)]:block((x,y,.058),(.081,.074,.071),WOOD,.005)

def raider_tent():
 roof(0,0,.023,.38,.38,.30,RED)
 mesh('Tent mouth',[(-.12,-.197,.025),(.12,-.197,.025),(0,-.197,.28)],[(0,1,2)],DARK)
 for side in [-1,1]:tube([(0,-.20,.33),(side*.22,-.21,.016)],[.010,.010],OCHRE,5)
 tube([(0,-.225,.0),(0,-.225,.36)],[.017,.010],TIMBER,6)
 for y in [-.10,.07]:
  for side in [-1,1]:tube([(0,y,.33),(side*.185,y,.035)],[.009,.008],OCHRE,5)
 tube([(.20,.13,.01),(.20,.13,.48)],[.011,.008],TIMBER,6)
 mesh('Notched camp standard',[(.20,.13,.465),(.35,.13,.445),(.31,.13,.395),(.34,.13,.357),(.20,.13,.369)],[(0,1,2),(0,2,4),(2,3,4)],RED)

def watchtower():
 for x in [-.085,.085]:
  for y in [-.085,.085]:tube([(x*1.18,y*1.18,0),(x,y,.44)],[.020,.016],TIMBER,6)
 block((0,0,.375),(.27,.27,.029),ENDGRAIN,.003)
 for side in [-1,1]:
  block((side*.124,0,.439),(.022,.27,.106),TIMBER,.003)
  block((0,side*.124,.439),(.27,.022,.106),TIMBER,.003)
 for y in [-.071,.071]:tube([(-.086,y,.083),(.086,y,.345)],[.011,.011],ENDGRAIN,5)
 for z in [.07,.13,.19,.25,.31]:tube([(-.046,-.13,z),(.046,-.13,z)],[.009,.009],ENDGRAIN,5)
 for x in [-.051,.051]:tube([(x,-.15,0),(x,-.095,.39)],[.012,.012],TIMBER,5)

for name,author in [('site-ruin-arch',ruin_arch),('site-ruin-column',ruin_column),('site-ruin-fragment',ruin_fragment),('site-hut',hut),('site-longhouse',longhouse),('site-antiquity',antiquity),('site-wreck',wreck),('site-raider-tent',raider_tent),('site-watchtower',watchtower)]:
 reset();author();bpy.ops.object.select_all(action='SELECT')
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.join();export(name)
