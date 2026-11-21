"""City plot models for the Scientific charters. Run build_settlement_assets.py with --charter-buildings."""

glass = pigment('Green crown glass', '82c8b6')
sunlit = pigment('Pale glass roof', 'b4ddd1')
copper = pigment('Painted iron ribs', '397869')
slate = pigment('Archive roof slate', '596b85')
reset()
block((0, 0, -.035), (.70, .43, .17), SHADE)
block((0, 0, .129), (.65, .39, .17), glass)
block((0, 0, .061), (.68, .42, .055), CREAM)
# The roof and its ribs share a ridge along the long side of the house.
pane = roof(0, 0, .20, .43, .69, .15, sunlit)
pane.rotation_euler[2] = math.pi / 2
for x in [-.33, -.20, -.067, .067, .20, .33]:
    for side in [-1, 1]:
        tube([(x, side * .197, .072), (x, side * .197, .204), (x, 0, .352)], [.010] * 3, copper)
for y, z in [(-.198, .14), (.198, .14), (-.207, .205), (.207, .205), (0, .352)]:
    tube([(-.345, y, z), (.345, y, z)], [.010, .010], copper)
block((0, -.204, .142), (.117, .022, .167), copper, .005)
block((0, -.219, .155), (.079, .009, .109), glass, .003)
export('ns-glasshouse')

reset()
block((0, 0, -.028), (.65, .47, .16), SHADE)
block((0, .025, .19), (.58, .37, .30), CREAM)
block((0, .025, .34), (.62, .41, .046), EDGE)
hall = roof(0, .025, .35, .44, .65, .13, slate)
hall.rotation_euler[2] = math.pi / 2
for x in [-.216, -.112, .112, .216]:
    block((x, -.163, .216), (.061, .012, .115), DARK, .004)
    block((x, -.174, .16), (.080, .027, .014), EDGE, .002)
block((0, -.174, .13), (.097, .026, .178), WOOD)
for x in [-.110, .110]:
    column(x, -.248, .056, .218, .022)
block((0, -.229, .277), (.299, .119, .034), EDGE)
roof(0, -.216, .29, .32, .167, .098, slate)
roof(0, -.304, .29, .284, .010, .083, EDGE)
block((0, -.299, .047), (.25, .077, .037), EDGE, .004)
for side in [-1, 1]:
    for y in [-.064, .086]:
        block((side * .292, y, .203), (.008, .070, .117), DARK, .003)
export('ns-great-archive')
