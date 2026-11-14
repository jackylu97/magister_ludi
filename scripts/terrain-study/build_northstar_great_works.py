"""The great people's works for the north-star look; run via build_settlement_assets.py -- --great-works-only.

The user, 2026-11-14: "I'd also like to do a pass on the great people
improvements, please make them more monumental and larger in stature, they
should look and feel important." These are the six works a great person leaves
on a hex. Each is one clear idea with a strong outline, on its own plinth, and
is the largest thing on its hex:
- ns-academy: a domed rotunda with a ring of columns, between two wings.
- ns-landmark: a colossus on a stepped pedestal, one arm raised with a gilt
  sun, between four braziers.
- ns-manufactory: a forge hall with two tall chimneys, a waterwheel and a crane.
- ns-customs-house: an arcaded hall with a clock tower and stacked goods.
- ns-citadel: a keep with a turret on a rock, and four towers joined by walls
  round an open court.
- ns-holy-site: a stepped sanctuary with a flame under a canopy and a tall
  blue spire, and four standing stones round an open court.

These files sit beside the study's works and replace nothing:
`NORTH_STAR_GREAT_WORKS` in src/terrainStudy/northStarAssets.js picks which set
is drawn.

The front is -Y here, which is toward the camera on the board. The first four
stand at the back of the hex, so a piece can stand in front of them. The
citadel and the holy site stand round the middle of the hex: nothing in them
comes nearer the middle than 0.30, so a piece stands in the court. Every model
reaches a little below z = 0, so it sits into a slope with no gap.
"""

MARBLE=pigment('GW marble','f2ead6');PLINTH=pigment('GW plinth stone','c9bea0');PAVE=pigment('GW paving','ddd2b4')
WALL=pigment('GW pale wall','eee2c4');MASONRY=pigment('GW masonry','cfc5ab');MASONRY_DEEP=pigment('GW masonry shade','b3aa93')
TILE=pigment('GW terracotta','cb6a43');TILE_DEEP=pigment('GW deep tile','a84d33');BRICK=pigment('GW brick','b9714c')
COPPER=pigment('GW verdigris copper','5f9c8c');LAPIS=pigment('GW lapis','3a5a96');GILT=pigment('GW gilt','e8b93f')
RECESS=pigment('GW recess','3b4a55');TIMBER=pigment('GW timber','7c5b3d');SOOT=pigment('GW soot','4a4441');EMBER=pigment('GW ember','f2892c')
ROCK=pigment('GW rock','a59c88')

def solid(cx,cy,profile,m,n=8,turn=0.):
 """A stack of rings round a vertical axis. `profile` is (height, half-width in x, half-width in y) from the foot up;
 a half-width is measured to the flat of a side, so four sides make a box of that size."""
 v=[];f=[];k=1/math.cos(math.pi/n)
 for z,rx,ry in profile:
  for i in range(n):
   a=turn+(i+.5)*math.tau/n;v.append((cx+math.cos(a)*rx*k,cy+math.sin(a)*ry*k,z))
 for j in range(len(profile)-1):
  for i in range(n):f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 f.extend([tuple(reversed(range(n))),tuple(range((len(profile)-1)*n,len(profile)*n))]);return mesh('GW solid',v,f,m)

def gable(x,y,z,w,d,h,m,along='x'):
 """A solid pitched roof. `along` is the direction of the ridge."""
 if along=='x':
  v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x-w/2,y,z+h),(x+w/2,y,z+h)]
  f=[(0,1,5,4),(2,3,4,5),(1,2,5),(3,0,4),(3,2,1,0)]
 else:
  v=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x,y-d/2,z+h),(x,y+d/2,z+h)]
  f=[(1,2,5,4),(3,0,4,5),(0,1,4),(2,3,5),(3,2,1,0)]
 return mesh('GW gable',v,f,m)

def plinth(w=1.0,d=.56):
 """The terrace a work at the back of the hex stands on. The paving in front of it is painted on the ground."""
 block((0,0,-.02),(w,d,.14),PLINTH,.02)

def flame(x,y,z,h=.1,r=.03):
 tube([(x,y,z),(x,y,z+h)],[r,.002],EMBER,5)

def brazier(x,y,z,h=.13):
 solid(x,y,[(z,.034,.034),(z+h*.7,.022,.022),(z+h,.045,.045)],PLINTH,5)
 flame(x,y,z+h,.08,.03)

def academy():
 reset();plinth()
 solid(0,.02,[(.05,.34,.25),(.10,.32,.23)],MARBLE,8)
 solid(0,.02,[(.10,.20,.20),(.50,.20,.20)],WALL,10)
 block((0,-.185,.22),(.08,.02,.20),RECESS,0)
 # A half ring of tall columns at the front, under one ring of stone.
 for i in range(7):
  a=math.pi+i*math.pi/6;x,y=math.cos(a)*.27,.02+math.sin(a)*.27
  tube([(x,y,.10),(x,y,.46)],[.025,.02],MARBLE,5)
 solid(0,.02,[(.45,.30,.30),(.51,.31,.31)],MARBLE,10)
 solid(0,.02,[(.51,.255,.255),(.63,.23,.23),(.73,.155,.155),(.775,.06,.06)],COPPER,10)
 solid(0,.02,[(.77,.048,.048),(.85,.04,.04)],MARBLE,6)
 leaf((0,.02,.90),(.05,.05,.05),GILT)
 tube([(0,.02,.94),(0,.02,1.05)],[.013,.001],GILT,4)
 for s in (-1,1):
  block((s*.37,.05,.20),(.22,.34,.30),WALL,.012)
  gable(s*.37,.05,.35,.26,.38,.13,TILE,'y')
  block((s*.37,-.125,.20),(.05,.012,.12),RECESS,0)
 export('ns-academy')

def landmark():
 reset();plinth(.9,.56)
 block((0,.02,.09),(.46,.40,.08),MARBLE,.01)
 block((0,.02,.16),(.36,.31,.07),PAVE,.01)
 block((0,.02,.275),(.27,.25,.17),MARBLE,.012)
 block((0,.02,.375),(.32,.30,.03),PAVE,0)
 block((0,-.108,.275),(.12,.012,.09),LAPIS,0)
 # The figure: a long robe, shoulders, a head with a gilt crown.
 solid(0,.02,[(.39,.125,.10),(.60,.105,.085),(.83,.085,.068),(.90,.12,.072),(.935,.08,.06)],MARBLE,6)
 leaf((0,.02,1.0),(.058,.058,.066),MARBLE)
 solid(0,.02,[(1.035,.06,.06),(1.07,.075,.075)],GILT,6)
 # One arm raised with a gilt sun; the other holds a tall gilt staff.
 tube([(.10,.02,.88),(.18,.0,1.02),(.205,-.01,1.14)],[.033,.026,.023],MARBLE,4)
 leaf((.205,-.01,1.21),(.065,.065,.065),GILT)
 tube([(-.10,.02,.88),(-.165,-.01,.70)],[.033,.023],MARBLE,4)
 tube([(-.17,-.02,.39),(-.17,-.02,1.14)],[.012,.012],GILT,4)
 for sx in (-1,1):
  for sy in (-1,1):brazier(sx*.37,.02+sy*.19,.05)
 export('ns-landmark')

def manufactory():
 reset();plinth()
 block((-.10,.03,.25),(.60,.36,.40),BRICK,.012)
 gable(-.10,.03,.45,.64,.40,.19,TILE_DEEP,'x')
 block((-.10,-.155,.19),(.16,.02,.27),RECESS,0)
 for x in (-.31,.11):block((x,-.155,.30),(.06,.012,.09),RECESS,0)
 # The furnace house and its two chimneys, each with a dark rim and a glow.
 block((.36,.05,.19),(.26,.34,.28),MASONRY,.012)
 for x,y,h in ((.31,.13,.96),(.42,-.03,1.2)):
  solid(x,y,[(.05,.08,.08),(h-.06,.055,.055),(h-.03,.068,.068)],BRICK,6)
  solid(x,y,[(h-.03,.068,.068),(h,.062,.062)],SOOT,6)
  solid(x,y,[(h,.043,.043),(h+.004,.043,.043)],EMBER,6)
 # The waterwheel stands across the hall's west end.
 tube([(-.475,.03,.25),(-.415,.03,.25)],[.205,.205],TIMBER,8)
 tube([(-.49,.03,.25),(-.40,.03,.25)],[.055,.055],SOOT,6)
 block((-.445,.03,.25),(.075,.42,.014),TIMBER,0)
 block((-.445,.03,.25),(.075,.014,.42),TIMBER,0)
 # A crane and a stack of ingots in the yard.
 tube([(.40,-.21,.05),(.40,-.21,.46)],[.017,.015],TIMBER,4)
 tube([(.42,-.19,.43),(.27,-.25,.56)],[.013,.011],TIMBER,4)
 block((.27,-.25,.46),(.03,.03,.06),SOOT,0)
 for x,z in ((.22,.075),(.28,.075),(.25,.12)):block((x,-.21,z),(.055,.08,.045),GILT,0)
 export('ns-manufactory')

def customs_house():
 reset();plinth()
 block((-.11,.04,.30),(.60,.34,.50),WALL,.012)
 block((-.11,.04,.25),(.62,.36,.025),PAVE,0)
 for i in range(4):
  x=-.335+i*.15
  block((x,-.135,.14),(.09,.02,.15),RECESS,0)
  block((x,-.135,.33),(.05,.012,.07),RECESS,0)
  block((x,-.135,.46),(.05,.012,.07),RECESS,0)
 solid(-.11,.04,[(.55,.33,.20),(.70,.12,.02)],TILE,4)
 # The clock tower, with a pointed roof and a flag.
 block((.34,.02,.51),(.21,.21,.92),WALL,.012)
 block((.34,.02,.985),(.26,.26,.03),PAVE,0)
 tube([(.34,-.087,.80),(.34,-.105,.80)],[.07,.07],GILT,8)
 tube([(.34,-.105,.80),(.34,-.109,.80)],[.02,.02],RECESS,6)
 solid(.34,.02,[(1.0,.13,.13),(1.24,.008,.008)],TILE_DEEP,4)
 tube([(.34,.02,1.23),(.34,.02,1.37)],[.007,.007],TIMBER,4)
 block((.39,.02,1.33),(.09,.006,.055),LAPIS,0)
 # Goods on the terrace: crates, barrels and a bale.
 for x,y,z in ((-.42,-.21,.09),(-.34,-.22,.09),(-.38,-.215,.165)):block((x,y,z),(.075,.075,.075),TIMBER,0)
 for x in (-.20,-.12):tube([(x,-.22,.05),(x,-.22,.14)],[.036,.036],BRICK,6)
 block((.02,-.22,.08),(.10,.07,.06),PAVE,.012)
 export('ns-customs-house')

def tower(x,y,h,roofed):
 """A six-sided tower with a wide foot. `roofed` gives it a pointed tile roof; otherwise a flat top with a stone rim."""
 solid(x,y,[(-.08,.125,.125),(.10,.105,.105),(h,.10,.10),(h+.02,.122,.122),(h+.07,.122,.122)],MASONRY,6)
 if roofed:solid(x,y,[(h+.07,.13,.13),(h+.25,.006,.006)],TILE,6)
 else:solid(x,y,[(h+.07,.085,.085),(h+.075,.085,.085)],MASONRY_DEEP,6)

def citadel():
 reset()
 # The keep stands on a rock at the back, with a turret and a banner.
 solid(0,.47,[(-.08,.44,.15),(.07,.40,.13),(.13,.33,.11)],ROCK,7)
 block((0,.46,.38),(.34,.26,.52),MASONRY,.014)
 block((0,.46,.655),(.38,.30,.045),PAVE,0)
 for sx in (-1,1):
  for sy in (-1,1):block((sx*.155,.46+sy*.115,.705),(.07,.07,.055),MASONRY,0)
 block((0,.327,.30),(.07,.012,.14),RECESS,0)
 solid(.07,.48,[(.64,.085,.085),(.93,.08,.08),(.95,.10,.10),(.99,.10,.10)],MASONRY,6)
 solid(.07,.48,[(.99,.11,.11),(1.16,.005,.005)],TILE,6)
 tube([(.07,.48,1.15),(.07,.48,1.28)],[.007,.007],TIMBER,4)
 block((.115,.48,1.245),(.08,.006,.05),LAPIS,0)
 # Four towers, the back pair roofed and higher. Walls join them, and the front is open for the gate.
 for s in (-1,1):
  tower(s*.46,.24,.40,True);tower(s*.42,-.37,.27,False)
  block((s*.27,.31,.13),(.24,.07,.30),MASONRY_DEEP,0)
  block((s*.445,-.065,.11),(.075,.50,.26),MASONRY_DEEP,0)
  block((s*.445,-.065,.25),(.10,.50,.03),PAVE,0)
  block((s*.27,-.39,.07),(.18,.065,.18),MASONRY_DEEP,0)
 export('ns-citadel')

def stone(x,y,h):
 """A standing stone with a gilt cap."""
 solid(x,y,[(-.08,.07,.07),(.04,.058,.058),(h,.038,.038)],MARBLE,4,math.pi/4)
 solid(x,y,[(h,.044,.044),(h+.07,.002,.002)],GILT,4,math.pi/4)

def holy_site():
 reset()
 # Three steps at the back carry the altar, its flame, the canopy over it and the spire.
 block((0,.47,.03),(.64,.30,.14),PLINTH,.012)
 block((0,.49,.14),(.50,.24,.08),MARBLE,.01)
 block((0,.50,.21),(.38,.20,.06),PAVE,.008)
 block((0,.49,.275),(.10,.08,.07),PLINTH,0)
 flame(0,.49,.31,.13,.036)
 for sx in (-1,1):
  for sy in (-1,1):tube([(sx*.14,.50+sy*.065,.24),(sx*.14,.50+sy*.065,.52)],[.021,.018],MARBLE,5)
 block((0,.50,.54),(.36,.22,.045),MARBLE,0)
 solid(0,.50,[(.56,.155,.10),(.66,.10,.07),(1.14,.014,.014)],LAPIS,4)
 solid(0,.50,[(1.14,.024,.024),(1.24,.001,.001)],GILT,4)
 # Four standing stones round the court, and two braziers at its mouth.
 for s in (-1,1):
  stone(s*.47,.10,.56);stone(s*.41,-.36,.42)
  brazier(s*.17,-.52,-.08,.22)
 export('ns-holy-site')

academy();landmark();manufactory();customs_house();citadel();holy_site()
