"""Shelved sculpted unit studies. The live study uses primitiveUnitModels.js.
Blender remeshes and relaxes joined forms before
decimation so shoulders, cloth and arms share a continuous carved surface.
Run build_settlement_assets.py -- --units-only. Z-up authoring, Y-up export.
"""
MOUNTED_STUDY='--mounted-study' in sys.argv
OUT=Path(__file__).resolve().parents[2]/('art/terrain-study/mounted-knight' if MOUNTED_STUDY else 'art/terrain-study/sculpted-units')
OUT.mkdir(parents=True,exist_ok=True);export.__globals__['OUT']=OUT
BODY=pigment('Owner sculpture','ffffff')
BASE=pigment('Owner turned stone','c5c9cb')
FOLD=pigment('Owner mantle','e0e3e5')
STEEL=pigment('Pale carved weapon','b9c2c8')
SHAFT=pigment('Slate pole','8a959f')
SOCKET=pigment('Carved recess','727d85')
IVORY=pigment('Carved warm ivory','cdb993')
MANE=pigment('Mane relief','d1c0a1')
HARNESS=pigment('Blue grey harness','768995')
ARMOUR=pigment('Carved armour','8599a7')

def interpolate(values,steps=4):
 out=[]
 for j in range(len(values)-1):
  a=values[max(0,j-1)];b=values[j];c=values[j+1];d=values[min(len(values)-1,j+2)]
  for i in range(steps):
   t=i/steps
   out.append(tuple(.5*((2*v)+(-u+w)*t+(2*u-5*v+4*w-q)*t*t+(-u+3*v-3*w+q)*t*t*t) for u,v,w,q in zip(a,b,c,d)))
 return out+[values[-1]]

def rounded_form(name,profiles,n=32,folds=0,phase=0,m=BODY,steps=3):
 # x/y centres, z, transverse radii. Folds taper out through the shoulders.
 v=[];f=[];rings=interpolate(profiles,steps)
 for x,y,z,rx,ry in rings:
  for i in range(n):
   a=math.tau*i/n;wave=math.cos(a*7+phase+z*1.5)+.38*math.cos(a*11-phase-z*2.0)
   depth=folds*(.45+.55*max(0,min(1,(.65-z)/.45)));r=1+wave*depth
   v.append((x+math.cos(a)*rx*r,y+math.sin(a)*ry*r,z))
 for j in range(len(rings)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.extend([tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))])
 return mesh(name,v,f,m)

def sweep(name,points,radii,m=BODY,n=12):
 values=interpolate([(*p,r) for p,r in zip(points,radii)],4)
 o=tube([p[:3] for p in values],[p[3] for p in values],m,n);o.name=name;return o

def sculpt_join(objects,name,target=1300,voxel=.009):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 mod=o.modifiers.new('Union sculpted clay','REMESH');mod.mode='VOXEL';mod.voxel_size=voxel;mod.use_smooth_shade=False;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Relax carved surface','SMOOTH');mod.factor=.63;mod.iterations=4;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.calc_loop_triangles();mod=o.modifiers.new('Broad carved facets','DECIMATE');mod.ratio=min(1,target/max(1,len(o.data.loop_triangles)));bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def base(radius=.258,m=BASE,steps=3):
 # One low circular plinth, without bright stripes or counter trim.
 rounded_form('Turned circular base',[(0,0,0,radius*.90,radius*.90),(0,0,.012,radius,radius),(0,0,.046,radius,radius),(0,0,.065,radius*.94,radius*.94),(0,0,.084,radius*.81,radius*.81)],32,m=m,steps=steps)

def face_head(x=0,y=-.006,z=.815,hood=False):
 return rounded_form('Hooded head' if hood else 'Anonymous oval head',[(x,y,z,.031,.029),(x,y-.015,z+.026,.047,.041),(x,y-.008,z+.072,.056 if hood else .053,.048),(x,y+.005,z+.129,.046,.040),(x,y+.009,z+.153,.025,.024),(x,y+.009,z+.157,.007,.008)],24)

def robe(kind):
 shift=.012 if kind=='spearman' else -.009
 return rounded_form('Continuous folded robe',[(0,0,.081,.157,.128),(.007,.006,.110,.173,.134),(.008,.007,.240,.153,.119),(shift,.010,.375,.129,.103),(shift,.006,.492,.089,.075),(shift,-.002,.577,.087,.074),(0,0,.670,.109,.078),(0,.004,.723,.126,.073),(0,.008,.765,.103,.061),(0,.010,.797,.059,.041),(0,.006,.824,.035,.032)],40,folds=.095,phase=.6 if kind=='spearman' else 1.8)

def mantle(kind):
 # The cloth follows the body's profile. An asymmetric front edge sweeps from
 # the shoulder across the waist; the back drops in a few long folds.
 v=[];f=[];n=36;rows=15
 profiles=[(.10,.174,.140),(.25,.157,.127),(.38,.139,.113),(.50,.104,.086),(.58,.100,.083),(.67,.122,.089),(.72,.139,.085),(.765,.114,.072),(.800,.049,.038)]
 def radii(z):
  for (a,x,y),(b,xx,yy) in zip(profiles,profiles[1:]):
   if z<=b:
    t=max(0,(z-a)/(b-a));return x*(1-t)+xx*t,y*(1-t)+yy*t
  return profiles[-1][1:]
 for j in range(rows):
  t=j/(rows-1)
  for i in range(n+1):
   a=-math.pi+i*math.tau/n;top=.792+.008*math.cos(a+.5)
   front=max(0,-math.sin(a))
   bottom=.12+front**1.2*(.37+.10*math.cos(a+.25))+.028*math.cos(a*2+.6)
   z=top*(1-t)+bottom*t;rx,ry=radii(z)
   ripple=(.011*math.cos(6*a+z*3)+.004*math.sin(9*a-z*3.4))*math.sin(math.pi*t*.85)
   v.append(((rx+ripple)*math.cos(a),.005+(ry+ripple)*math.sin(a),z))
 for j in range(rows-1):
  for i in range(n):
   k=j*(n+1)+i;f.append((k,k+1,k+n+2,k+n+1))
 o=mesh('Draped shoulder mantle',v,f,FOLD)
 mod=o.modifiers.new('Sculpted cloth edge','SOLIDIFY');mod.thickness=.009;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Cloth facets','DECIMATE');mod.ratio=.48;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def blade(grip,tip,width=.025):
 a=Vector(grip);b=Vector(tip);d=(b-a).normalized();side=d.cross(Vector((0,1,0))).normalized();c=a+(b-a)*.18
 mesh('Simple tapered blade',[a-side*width,a+side*width,c+Vector((0,-.009,0)),c+Vector((0,.009,0)),b],[(0,1,2),(0,3,1),(0,2,4),(1,4,2),(0,4,3),(1,3,4)],STEEL)

def shield():
 v=[(-.125,-.190,.437)]
 v+=[(-.125,-.143,.612),(-.035,-.152,.559),(-.033,-.151,.410),(-.121,-.142,.273),(-.210,-.136,.415),(-.215,-.138,.555)]
 o=mesh('Curved almond shield',v,[(0,i+1,(i+1)%6+1) for i in range(6)],BODY)
 mod=o.modifiers.new('Carved shield rim','SOLIDIFY');mod.thickness=.014;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Soften shield edge','BEVEL');mod.width=.012;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)

def standing(kind):
 base();parts=[robe(kind),face_head(hood=kind=='spearman')]
 if kind=='warrior':
  parts.append(sweep('Arm resting on shield',[(-.106,-.008,.715),(-.157,-.065,.615),(-.152,-.130,.571),(-.085,-.143,.568)],[.064,.053,.036,.026]))
  parts.append(sweep('Sword hand',[(.105,-.002,.710),(.154,-.054,.584),(.148,-.118,.541)],[.061,.043,.028]))
 else:
  parts.append(sweep('Quiet resting arm',[(.108,-.002,.719),(.149,-.070,.603),(.079,-.120,.514)],[.060,.049,.031]))
  parts.append(sweep('Spear holding arm',[(-.106,-.004,.716),(-.157,-.046,.586),(-.212,-.077,.650)],[.062,.044,.028]))
 sculpt_join(parts,'Unified robed figure',1450);mantle(kind)
 if kind=='warrior':
  shield();blade((.151,-.128,.491),(.161,-.132,.121),.023)
  sweep('Sword handle',[(.151,-.128,.489),(.150,-.128,.574)],[.014,.013],SHAFT,10)
  sweep('Sword guard',[(.106,-.128,.497),(.195,-.128,.497)],[.011,.011],STEEL,10)
 else:
  sweep('Upright spear',[(-.232,-.088,.099),(-.212,-.079,.649),(-.194,-.070,1.043)],[.013,.012,.010],SHAFT,10)
  blade((-.194,-.070,1.022),(-.190,-.068,1.162),.031)

def knight():
 base(.277);parts=[]
 # The simple chess knight is the default cavalry piece. Its sweeping neck
 # grows directly out of the plinth, without a rider or separate legs.
 parts.append(rounded_form('Knight neck',[(0,0,.077,.175,.127),(-.028,.002,.158,.180,.129),(-.069,.003,.306,.149,.119),(-.096,.002,.464,.118,.108),(-.080,0,.626,.111,.094),(-.019,0,.744,.105,.084),(.045,0,.813,.096,.076),(.078,0,.846,.065,.061)],32))
 parts.append(loft([(-.005,.809,.056,.075),(.073,.818,.077,.109),(.145,.786,.082,.106),(.216,.716,.063,.096),(.276,.647,.050,.059),(.309,.642,.035,.039)],BODY,20))
 parts.append(sweep('Near ear',[(.004,-.052,.858),(-.007,-.057,.947),(.016,-.052,.991)],[.034,.025,.005],BODY,12))
 parts.append(sweep('Far ear',[(.043,.049,.872),(.032,.053,.955),(.056,.053,.987)],[.029,.023,.004],BODY,12))
 sculpt_join(parts,'Carved horse knight',1650,.008)
 mane=rounded_form('Continuous mane',[(-.122,.010,.160,.105,.070),(-.182,.011,.287,.041,.052),(-.200,.010,.436,.024,.044),(-.172,.009,.599,.023,.035),(-.113,.007,.757,.028,.030),(-.045,.005,.886,.027,.026)],24,folds=.10,m=FOLD)
 sculpt_join([mane],'Carved mane',340,.008)
 for side in [-1,1]:
  o=leaf((.132,side*.077,.828),(.019,.007,.013),SOCKET);o.name='Inset eye cut'

def mounted_knight():
 runpy.run_path(str(Path(__file__).with_name('build_knight_asset.py')),init_globals=globals())

for name,author in [('warrior',lambda:standing('warrior')),('spearman',lambda:standing('spearman')),('horseman',mounted_knight if MOUNTED_STUDY else knight)]:
 if ('--knight-only' in sys.argv or MOUNTED_STUDY) and name!='horseman':continue
 reset();author()
 if MOUNTED_STUDY:bpy.ops.wm.save_as_mainfile(filepath=str(Path.cwd()/'.dream-loop'/'knight-sculpture-review.blend'))
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.join()
 # Remove redundant near-coplanar rings on reins, bases and helmet surfaces.
 o=bpy.context.object;mod=o.modifiers.new('Remove redundant planes','DECIMATE');mod.decimate_type='DISSOLVE';mod.angle_limit=.012;mod.delimit={'MATERIAL'};bpy.ops.object.modifier_apply(modifier=mod.name)
 export(name)
