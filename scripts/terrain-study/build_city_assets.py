"""Monumental city kit; run via build_settlement_assets.py -- --city-only.

Uses the same Blender authoring helpers and generated stone-grain material as
the existing settlement kit. Broad carved forms carry detail at strategy zoom.
"""

STONE=pigment('Honey limestone','cdb994')
PALE=pigment('Carved limestone edge','e3d1ae')
MASON=pigment('Aged block face','bda988')
CLAY=pigment('Sunbaked clay','c47550')

def cornice(x,y,z,w,d):
 block((x,y,z),(w,d,.024),MASON,.004)
 block((x,y,z+.020),(w+.025,d+.025,.017),PALE,.003)
 block((x,y,z+.039),(w+.050,d+.050,.022),STONE,.005)

def niche(x,y,z,w,h):
 # Dark recessed arched silhouette behind a raised, genuinely three-dimensional
 # stone surround; unlike the old houses, there is no square black window.
 r=w/2;spring=z+h-r
 points=[(x-r,y+.011,z),(x+r,y+.011,z)]
 points += [(x+r*math.cos(a*math.pi/8),y+.011,spring+r*math.sin(a*math.pi/8)) for a in range(9)]
 mesh('Deep arched recess',points,[tuple(range(len(points)))],DARK)
 arch(x,y-.004,z,w,h,.023,PALE)
 block((x,y-.012,z-.005),(w*1.40,.042,.018),STONE,.003)

def quoins(w,d,z0,h):
 count=5
 for side in [-1,1]:
  for i in range(count):
   z=z0+(i+.5)*h/count
   block((side*(w/2-.025),-d/2-.005,z),(.059 if i%2 else .084,.021,h/count*.83),PALE if i%3 else MASON,.003)

def roof_tiles(z,w,d,h):
 roof(0,0,z,w,d,h,ROOF)
 # Sparse raised clay rolls describe the roof planes without a dense texture
 # grid that would shimmer when the city occupies one hex.
 for side in [-1,1]:
  for j in range(7):
   y=-d*.45+j*d*.15
   tube([(side*.015,y,z+h+.002),(side*w*.49,y,z+.013)],[.0065,.008],CLAY,5)
 tube([(0,-d*.52,z+h),(0,d*.52,z+h)],[.012,.012],RIDGE,7)
 block((0,0,z), (w,d,.026),CLAY,.004)

def arcade(w,d,z,h,count=3):
 # Set the back wall well behind the columns. Light passes through the front
 # arcade and the underside casts a continuous shadow on the entrance steps.
 block((0,.052,z+h*.49),(w-.035,d-.13,h*.98),STONE,.007)
 opening=w/(count*1.30)
 for j in range(count):
  x=(j-(count-1)/2)*w/count
  arch(x,-d/2-.009,z+.022,opening,h-.02,.065,STONE)
  block((x,-d/2+.041,z+h*.40),(opening,.009,h*.72),DARK,0)
 for i in range(count+1):
  x=-w/2+i*w/count
  column(x,-d/2-.024,z+.017,h-.012,.014)

def city_house():
 w=.40;d=.35
 block((0,0,.022),(w+.044,d+.054,.044),MASON,.006)
 arcade(w,d,.044,.205)
 cornice(0,0,.247,w+.01,d+.01)
 block((0,0,.383),(w,d,.195),STONE,.008)
 for x in [-.108,.108]:niche(x,-d/2-.008,.333,.058,.108)
 # Side windows are a repeated relief element, rotated with their stone frame.
 before=set(bpy.context.scene.objects)
 for x in [-.09,.09]:niche(x,-w/2-.008,.333,.052,.108)
 # Rotate the side group around the building origin.
 for o in set(bpy.context.scene.objects)-before:
  o.rotation_euler[2]=math.pi/2
  p=o.location.copy();o.location=(-p.y,p.x,p.z)
 quoins(w,d,.29,.19)
 cornice(0,0,.48,w,d)
 roof_tiles(.548,w+.07,d+.07,.13)
 for i in range(2):block((0,-d/2-.045-i*.028,.027-i*.010),(.26+i*.026,.064,.021),PALE,.003)

def city_loggia():
 w=.44;d=.33
 block((0,0,.026),(w+.04,d+.055,.052),MASON,.005)
 arcade(w,d,.055,.28)
 cornice(0,0,.332,w,d)
 # A low parapet and recessed upper chamber make a different silhouette from
 # the pitched-roof houses while retaining the same carved-stone vocabulary.
 block((0,.055,.44),(.25,.21,.17),STONE,.009)
 roof(0,.055,.532,.29,.255,.095,ROOF)
 niche(0,-.059,.393,.075,.108)
 for side in [-1,1]:
  block((side*.215,0,.398),(.022,.33,.070),PALE,.003)
  cylinder((side*.213,-.147,.451),.014,.037,STONE,8)
 block((0,-.158,.391),(.43,.021,.054),STONE,.004)
 for i in range(3):block((0,-.205-i*.027,.043-i*.013),(.32+i*.025,.055,.020),PALE,.003)

def draped_figure(x,y,z,scale=1):
 # A quiet robed silhouette, including an offset head and two articulated
 # arms. Alternating long folds read as carving, rather than a smooth pawn.
 v=[];f=[];n=9
 for row,(height,r,cx,cy) in enumerate([(0,.055,0,0),(.10,.040,.007,0),(.205,.052,-.004,0),(.237,.029,.002,0)]):
  for i in range(n):
   a=i*math.tau/n;fold=1.12 if i%2 else .88
   v.append((x+scale*(cx+math.cos(a)*r*fold),y+scale*(cy+math.sin(a)*r*.73),z+scale*(height+(0 if row else .009*(i%3)))))
 for row in range(3):
  for i in range(n):f.extend([(row*n+i,row*n+(i+1)%n,(row+1)*n+i),(row*n+(i+1)%n,(row+1)*n+(i+1)%n,(row+1)*n+i)])
 f.extend([tuple(reversed(range(n))),tuple(range(3*n,4*n))]);mesh('Carved drapery',v,f,PALE)
 leaf((x+.006*scale,y-.002*scale,z+.276*scale),(.032*scale,.029*scale,.040*scale),PALE)
 tube([(x-.039*scale,y,z+.204*scale),(x-.072*scale,y-.013*scale,z+.149*scale),(x-.018*scale,y-.041*scale,z+.137*scale)],[.019*scale,.017*scale,.014*scale],PALE,7)
 tube([(x+.037*scale,y,z+.206*scale),(x+.077*scale,y-.006*scale,z+.218*scale),(x+.085*scale,y-.003*scale,z+.253*scale)],[.017*scale,.015*scale,.010*scale],PALE,7)
 tube([(x+.092*scale,y,z+.02*scale),(x+.092*scale,y,z+.337*scale)],[.006*scale,.004*scale],GOLD,6)

def civic_sanctum():
 # Stepped podium, deeply recessed entrance and a roofline shrine. The arch
 # and figure are the landmark; the roof no longer dominates the whole city.
 for i in range(3):block((0,0,.022+i*.035),(.61-i*.025,.61-i*.025,.039),STONE,.005)
 block((0,.105,.278),(.46,.32,.35),STONE,.008)
 for side in [-1,1]:block((side*.225,-.102,.278),(.080,.28,.35),STONE,.007)
 arch(0,-.208,.110,.275,.32,.070,STONE)
 block((0,-.064,.240),(.27,.018,.267),DARK,0)
 for x in [-.248,.248]:column(x,-.25,.108,.352,.027)
 for x in [-.247,.247]:
  for i in range(4):block((x,-.158,.148+i*.073),(.065,.020,.049),PALE if i%2 else MASON,.003)
 cornice(0,-.008,.451,.535,.545)
 block((0,.037,.537),(.31,.285,.085),STONE,.006)
 cornice(0,.037,.579,.355,.33)
 # A sun medallion behind the open arch lends the tarot reference an emblem
 # without introducing readable symbols or ornamental UI into the model.
 arch(0,.093,.642,.277,.483,.057,STONE)
 disc=cylinder((0,0,0),.096,.011,GOLD,12);disc.rotation_euler[0]=math.pi/2;disc.location=(0,.123,1.008)
 for side in [-1,1]:
  column(side*.192,.09,.636,.422,.022)
  cylinder((side*.192,.09,1.087),.029,.026,PALE,8)
 block((0,-.067,.660),(.156,.15,.085),MASON,.008)
 block((0,-.067,.707),(.185,.173,.023),PALE,.004)
 draped_figure(0,-.087,.721,1.10)
 for i in range(4):block((0,-.306-i*.025,.098-i*.023),(.26+i*.027,.068,.028),PALE,.004)

def city_spire():
 for i in range(2):block((0,0,.02+i*.037),(.26-i*.035,.26-i*.035,.044),MASON,.006)
 block((0,0,.288),(.185,.185,.44),STONE,.008)
 for x in [-.075,.075]:block((x,-.099,.29),(.024,.027,.414),PALE,.003)
 niche(0,-.098,.17,.059,.19)
 cornice(0,0,.515,.21,.21)
 for x in [-.071,.071]:
  for y in [-.071,.071]:column(x,y,.577,.184,.016)
 arch(0,-.073,.58,.108,.166,.036,STONE)
 cornice(0,0,.762,.23,.23)
 # Four broad stone faces produce the tall obelisk-like crown in the reference.
 mesh('Stone spire',[(-.13,-.13,.825),(.13,-.13,.825),(.13,.13,.825),(-.13,.13,.825),(0,0,1.112)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],PALE)
 tube([(0,0,1.11),(0,0,1.16)],[.008,.004],GOLD,6)

def city_dome():
 block((0,0,.026),(.36,.36,.052),MASON,.006)
 cylinder((0,0,.18),.158,.285,STONE,12)
 for angle in [0,math.pi/2,math.pi,-math.pi/2]:
  before=set(bpy.context.scene.objects);niche(0,-.154,.077,.068,.18)
  for o in set(bpy.context.scene.objects)-before:
   o.rotation_euler[2]=angle;p=o.location.copy();o.location=(p.x*math.cos(angle)-p.y*math.sin(angle),p.x*math.sin(angle)+p.y*math.cos(angle),p.z)
 cylinder((0,0,.336),.18,.040,PALE,12)
 v=[];f=[];n=12
 for z,r in [(.359,.184),(.395,.177),(.470,.135),(.514,.074),(.530,.018)]:
  for i in range(n):v.append((r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z))
 for row in range(4):
  for i in range(n):f.append((row*n+i,row*n+(i+1)%n,(row+1)*n+(i+1)%n,(row+1)*n+i))
 f.append(tuple(range(4*n,5*n)));mesh('Faceted terracotta cupola',v,f,CLAY)
 tube([(0,0,.526),(0,0,.584)],[.014,.006],GOLD,7)

for name,author in [('city-house',city_house),('city-loggia',city_loggia),('civic-sanctum',civic_sanctum),('city-spire',city_spire),('city-dome',city_dome)]:
 reset();author()
 # Bake object transforms and combine the carved pieces before export. Keep
 # material regions for pigment, without hundreds of redundant GLB nodes.
 bpy.ops.object.select_all(action='SELECT')
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.join();export(name)
