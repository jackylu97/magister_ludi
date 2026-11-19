"""Pillaged work models for review. Run build_settlement_assets.py with --pillaged-works-only.

Each piece keeps the sound parts of the approved model. Broken equipment is static and
uses the same matte materials as the standing work. Coordinates here are Blender Z-up.
"""
CHAR = pigment('Weathered broken timber', '57453f')
END = pigment('Exposed wood', 'bd976a')
OLD_TILE = pigment('Broken terracotta', 'a3634e')


def remove_parts(test):
    """Replace whole parts of the original sculpture. Leave the surviving surfaces closed."""
    bpy.context.view_layer.update()
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        coords = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        center = sum(coords, Vector()) / len(coords)
        if test(center.x, center.y, center.z):
            bpy.data.objects.remove(obj, do_unlink=True)


def half_beam(a, b, radius):
    """Show the pale fracture at one end of a dark timber."""
    pole(a, b, radius, CHAR, 4)
    start, end = Vector(a), Vector(b)
    tip = end + (end - start).normalized() * radius * 1.6
    tube([end.lerp(start, .04), end, tip], [radius * .80, radius * .84, radius * .08], END, 4)


def broken_roof(x, y, z, width, depth):
    """Two exposed rafters, one remaining slope and a fallen section of tile."""
    for dy in [-depth * .36, depth * .36]:
        ridge = (x - width * .08, y + dy, z + width * .22)
        pole((x - width * .51, y + dy, z), ridge, .013, CHAR, 4)
        half_beam(ridge, (x + width * .21, y + dy, z + width * .10), .013)
    work_panel([(x-width*.54,z),(x-width*.23,z+width*.17),(x-width*.23,z+width*.12),(x-width*.51,z-.012)],
               y-depth*.47,y+depth*.47,OLD_TILE)
    slab = block((x + width * .14, y - depth * .73, .024),
                 (width*.43, depth*.29, .026), OLD_TILE, .003)
    slab.rotation_euler.z = -.21


def damaged_loft():
    loft_barn()
    # Expose the roof over the loading gallery. One side of the loft cap
    # survives on the taller tower, so this still reads as a grain store.
    remove_parts(lambda x,y,z: (x > -.05 and z > .195) or z > .413)
    broken_roof(.097,.008,.201,.345,.28)
    for y in [-.089,.112]:
        half_beam((-.242,y,.418),(-.152,y,.479),.018)
    work_panel([(-.281,.415),(-.185,.485),(-.168,.476),(-.266,.406)],-.112,.14,COPPER_WORK)


def damaged_pasture():
    stable()
    # The feeding trough and remaining masonry stalls identify the pasture.
    remove_parts(lambda x,y,z: (x < .085 and z > .178) or (x > .09 and z > .252))
    broken_roof(-.052,0,.180,.329,.262)
    half_beam((.119,-.069,.251),(.161,-.062,.302),.016)
    half_beam((-.182,-.185,.005),(-.071,-.20,.065),.013)


def damaged_hoist():
    mine_headframe()
    remove_parts(lambda x,y,z: z > .459 or (x > .085 and z > .15) or (abs(x) < .073 and z > .10))
    # The main girder has fallen into the shaft. The second pier has lost its top.
    work_profile(.158,.036,[(.027,.079,.155),(.094,.065,.124),(.170,.043,.074)],CLAY_WORK,4)
    half_beam((-.172,.025,.448),(-.022,-.008,.355),.034)
    half_beam((.143,-.009,.176),(-.060,-.076,.067),.031)
    hoist_wheel(.084,-.14,.106,.079,.038,BRASS_WORK,3)
    block((-.008,-.100,.058),(.146,.107,.035),TIMBER,.003)


def damaged_quarry():
    quarry_benches(.14,.29,.417)
    work_profile(.24,-.07,[(.14,.12,.11),(.18,.12,.11),(.36,.074,.071)],CLAY_WORK,4)
    # The fallen jib lies across the cut. The wheel is on the floor of the quarry.
    half_beam((.248,-.07,.364),(.087,-.13,.239),.031)
    half_beam((-.235,-.168,.175),(-.010,-.191,.228),.026)
    hoist_wheel(.115,-.223,.236,.096,.040,TIMBER,3)
    for x,y,w in [(-.101,-.092,.124),(-.173,-.183,.083),(.268,.028,.096)]:
        stone = block((x,y,.174),(w,w*.73,.061),CUT,.006)
        stone.rotation_euler.z = x * 2


def damaged_saw():
    saw_hall()
    remove_parts(lambda x,y,z: z > .319 or (x > .09 and y < .05 and z > .131)
                 or (abs(x) < .10 and y < -.055 and .18 < z < .32))
    # The feed bed and its log stay in place below the split saw frame.
    half_beam((-.152,-.048,.311),(-.054,-.06,.279),.026)
    half_beam((.151,-.074,.025),(.063,-.072,.184),.034)
    pole((.063,-.130,.165),(-.076,-.168,.152),.012,BLADE,4)
    half_beam((-.145,-.07,.312),(-.102,-.015,.381),.018)


def damaged_windmill():
    windmill()
    # A single strip of sail survives. Its torn edge and the missing opposing
    # arms keep a stopped mill distinct even when the game clock is paused.
    hub = (0,-.170,.50)
    for end in [(-.185,-.170,.698),(.072,-.170,.408),(-.056,-.170,.455)]:
        half_beam(hub,end,.012)
    work_panel([(-.187,.686),(-.195,.647),(-.176,.643),(-.176,.622),(-.146,.627),
                (-.146,.605),(-.099,.607),(-.074,.582)],-.177,-.169,CANVAS)
    half_beam((-.108,-.15,.024),(.185,-.141,.047),.013)
    work_panel([(.045,.022),(.137,.036),(.16,.072),(.102,.052)],-.179,-.139,CANVAS)


def damaged_boat():
    fishing_hull()
    # The hull still floats. The mast has snapped across the gunwale and the
    # sail sags into the boat, clear of the surrounding fish or whale.
    half_beam((0,0,.074),(.023,.002,.222),.016)
    half_beam((.021,.002,.207),(.288,-.094,.113),.014)
    mesh('Slack linen',[(.02,0,.202),(.102,-.037,.128),(.268,-.081,.118),
                       (.207,-.10,.101),(.102,-.091,.099),(.033,-.05,.129)],
         [(0,1,5),(1,4,5),(1,3,4),(1,2,3)],CANVAS)
    pole((-.22,.096,.112),(-.095,-.110,.103),.009,TIMBER,4)


PILLAGED_MODELS = [
    ('ns-pillaged-grain-loft',damaged_loft), ('ns-pillaged-pasture',damaged_pasture),
    ('ns-pillaged-mine-hoist',damaged_hoist), ('ns-pillaged-quarry',damaged_quarry),
    ('ns-pillaged-saw-hall',damaged_saw), ('ns-pillaged-windmill',damaged_windmill),
    ('ns-pillaged-fishing-boat',damaged_boat),
]
