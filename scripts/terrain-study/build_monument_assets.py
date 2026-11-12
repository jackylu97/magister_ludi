"""Monuments for the north-star look; run via build_settlement_assets.py -- --monuments-only.

The art direction (docs/art-pass.md, 2026-11-12) asks for a board seen by
Renaissance magistrates: monumental, mythologized, a little occult. These three
landmarks are what a town raises where it used to raise a small spire or dome:
- monument-ziggurat: a stepped temple-mountain with a gilded shrine;
- monument-armillary: the magistrates' own instrument, a great armillary sphere;
- monument-obelisk: a tall needle with a gilded tip and a lapis seal.
Broad, simple forms, so each keeps its outline at strategy zoom.
"""

HONEY=pigment('Monument limestone','d8caa3')
LIGHT=pigment('Monument pale edge','ecdfbd')
GILT=pigment('Gilded bronze','e2b443')
LAPIS=pigment('Lapis','3a5a96')
SHADOW=pigment('Monument recess','3b4a55')

def ziggurat():
 tiers=[(.80,.115),(.66,.110),(.53,.105),(.41,.100),(.30,.095)]
 z=0
 for i,(w,h) in enumerate(tiers):
  block((0,0,z+h/2),(w,w,h),HONEY if i%2==0 else LIGHT,.010);z+=h
 # One broad stair up the front face, in steps a little narrower each tier.
 steps=14;rise=z/steps
 for i in range(steps):
  y=-.47+i*.027
  block((0,y,(i+.5)*rise*.98),(.17-i*.004,.03,rise*1.02+i*rise*.0),LIGHT,0)
  block((0,y,(i*rise)/2),(.17-i*.004,.03,max(.002,i*rise)),HONEY,0)
 # The shrine: a small dark-doored cell under a gilded pyramid roof.
 block((0,0,z+.07),(.19,.19,.14),LIGHT,.008)
 block((0,-.097,z+.06),(.07,.012,.10),SHADOW,0)
 top=z+.14
 mesh('Gilded roof',[(-.12,-.12,top),(.12,-.12,top),(.12,.12,top),(-.12,.12,top),(0,0,top+.12)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],GILT)
 disc=cylinder((0,0,0),.05,.010,GILT,12);disc.rotation_euler[0]=math.pi/2;disc.location=(0,-.104,z+.20)

def armillary():
 # An eight-sided plinth and a short column carry the sphere.
 cylinder((0,0,.05),.30,.10,HONEY,8)
 cylinder((0,0,.13),.24,.06,LIGHT,8)
 tube([(0,0,.16),(0,0,.40),(0,0,.46)],[.085,.065,.10],HONEY,8)
 centre=(0,0,.86);radius=.36
 # Three great rings: the horizon, the meridian and the tilted ecliptic.
 for rot in [(0,0,0),(math.pi/2,0,0),(math.pi/2,0,math.pi/2),(math.radians(66),0,math.radians(30))]:
  bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=.020,major_segments=24,minor_segments=5,location=centre,rotation=rot)
  bpy.context.object.data.materials.append(GILT)
 # The axis, and the world at the centre.
 tube([(0,0,.44),(0,0,1.30)],[.014,.014],GILT,6)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.115,location=centre);bpy.context.object.data.materials.append(LAPIS)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.035,location=(0,0,1.32));bpy.context.object.data.materials.append(GILT)

def obelisk():
 for i,(w,h) in enumerate([(.42,.07),(.33,.07),(.25,.09)]):
  block((0,0,sum(x[1] for x in [(.42,.07),(.33,.07),(.25,.09)][:i])+h/2),(w,w,h),HONEY if i!=1 else LIGHT,.008)
 base=.23;top=1.28
 r0=.105;r1=.055
 v=[(-r0,-r0,base),(r0,-r0,base),(r0,r0,base),(-r0,r0,base),(-r1,-r1,top),(r1,-r1,top),(r1,r1,top),(-r1,r1,top)]
 mesh('Needle',v,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(3,2,1,0)],LIGHT)
 mesh('Gilded tip',[(-r1,-r1,top),(r1,-r1,top),(r1,r1,top),(-r1,r1,top),(0,0,top+.13)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],GILT)
 # Two gilded bands and a lapis seal on the front face.
 for z,r in [(.50,.098),(.98,.074)]:block((0,0,z),(r*2+.012,r*2+.012,.022),GILT,0)
 seal=cylinder((0,0,0),.045,.012,LAPIS,10);seal.rotation_euler[0]=math.pi/2;seal.location=(0,-.094,.72)

for name,author in [('monument-ziggurat',ziggurat),('monument-armillary',armillary),('monument-obelisk',obelisk)]:
 reset();author()
 bpy.ops.object.select_all(action='SELECT')
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.join();export(name)
