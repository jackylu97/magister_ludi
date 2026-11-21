"""Build the review pair from the third-pass kit. Run with Blender 4.5."""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Vector

HERE = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE.parent))
import kit


def cowl():
    """Use one shell so the edge of the hood continues onto both shoulders."""
    # Cross sections from the hem to the crown. The front gap frames the face.
    # The first three rings share a front vertex across the seam.
    sections = [
        (.265, .223, .665, .006, 0),
        (.252, .211, .690, .006, 0),
        (.172, .165, .780, .002, 0),
        (.163, .183, .818, .005, 34),
        (.185, .206, .901, .006, 47),
        (.176, .206, .963, .000, 39),
        (.144, .179, 1.005, -.004, 0),
        (.086, .110, 1.047, .014, 0),
        (.033, .049, 1.061, .023, 0),
    ]
    bm = bmesh.new()
    rings = []
    count = 14
    for k, (width, depth, z, offset, gap) in enumerate(sections):
        row = []
        for j in range(count + 1):
            if j == count and gap == 0:
                row.append(row[0])
                continue
            t = math.radians(gap + (360 - 2 * gap) * j / count)
            front = max(0, math.cos(t))
            # A shallow point falls below the chin. The side hem stays high.
            drop = .116 * front ** 3.8 + .030 * max(0, -math.cos(t)) ** 2
            height = z - (drop if k < 2 else 0)
            row.append(bm.verts.new((width * math.sin(t), offset - depth * math.cos(t), height)))
        rings.append(row)
    for a, b in zip(rings, rings[1:]):
        for j in range(count):
            bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
    bm.faces.new(rings[-1][:-1])
    hem = bm.verts.new((0, 0, .666))
    for j in range(count):
        bm.faces.new((rings[0][j], rings[0][j + 1], hem))
    # The carved recess ends behind the face. No hidden inner dome is needed.
    mouth = [rings[k][0] for k in range(2, 7)] + [rings[k][-1] for k in (5, 4, 3)]
    lip = [bm.verts.new((v.co.x * .96, v.co.y + .020, .89 + (v.co.z - .89) * .97)) for v in mouth]
    hollow = bm.verts.new((0, .028, .89))
    for i, vertex in enumerate(mouth):
        j = (i + 1) % len(mouth)
        bm.faces.new((vertex, mouth[j], lip[j], lip[i]))
        bm.faces.new((lip[i], lip[j], hollow))
    return kit.obj_from(bm, 'hood and shoulder cape', 'Seat')


def sleeve(side, elbow, grip, cuff='SeatDark', quiet=False):
    """Keep the elbow bend visible. Give the cuff the same section as the sleeve."""
    shoulder = Vector((side * .186, -.018, .680))
    elbow, grip = Vector(elbow), Vector(grip)
    along = (grip - elbow).normalized()
    wrist = grip - along * (.034 if quiet else .045)
    points = [shoulder, shoulder.lerp(elbow, .68), elbow, wrist - along * .026, wrist]
    widths = [.058, .075, .076, .066, .062]
    bm = bmesh.new()
    rings = []
    for i, (p, radius) in enumerate(zip(points, widths)):
        tangent = (points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]).normalized()
        # A fixed outward direction keeps the folds aligned through the elbow.
        up = tangent.cross(Vector((1, 0, 0))).normalized()
        across = up.cross(tangent).normalized()
        ring = []
        for j in range(8):
            a = (j + .5) * math.tau / 8
            ring.append(bm.verts.new(p + (across * math.cos(a) + up * math.sin(a)) * radius))
        rings.append(ring)
    kit._skin(bm, rings)
    for face in bm.faces:
        if all(v in rings[-2] + rings[-1] for v in face.verts):
            face.material_index = 1
    kit.obj_from(bm, 'bent sleeve', ['Seat', cuff])
    # One palm holds each prop. The resting hand shows only below the hem.
    radius = .034 if quiet else .044
    kit.loft('hand', [(wrist - along * .009, radius * .82, radius * .84),
                      (grip, radius * 1.10, radius),
                      (grip + along * (.022 if quiet else .033), radius * .86, radius * .84)],
             6, 'WoodPale', axis=along, rot=math.pi / 6)


def bow(grip):
    """A broad curve and a straight string enclose a visible gap at board size."""
    grip = Vector(grip)
    # Tilt the stave around the hand so its upper limb clears the hood in the rear view.
    turn = Euler((math.radians(-22), math.radians(-19), 0), 'XYZ').to_matrix()
    inward = turn @ Vector((.998, .062, 0)).normalized()
    up = turn @ Vector((-.060, .004, 1)).normalized()
    normal = inward.cross(up).normalized()
    stations = [(0, 0, .024), (.006, .091, .031), (.040, .200, .038),
                (.097, .285, .028), (.157, .331, .014), (.169, .357, .006)]
    curve = [(a, -b, w) for a, b, w in reversed(stations[1:])] + stations
    kit.ribbon('bow stave', [grip + inward * x + up * z for x, z, _ in curve],
               [w for _, _, w in curve], [max(.005, .62 * w) for _, _, w in curve],
               normal, 'Gold')
    # The wood handle ends inside the palm and sleeve. It stays narrow beside the fingers.
    kit.limb('bow handle', [grip - up * .064, grip + up * .064], [.029, .029], 8, 'WoodBrown')
    tip = grip + inward * stations[-1][0]
    kit.limb('bow string', [tip - up * .355, tip + up * .355], [.0042, .0042], 4, 'WoodPale')


def spear(foot):
    x, y, _ = foot
    kit.limb('spear shaft', [foot, (x, y, 1.008)], [.030, .030], 8, 'Seat', smooth=True)
    kit.limb('spear socket', [(x, y, .994), (x, y, 1.062)], [.036, .034], 8, 'Gold', smooth=True)
    kit.ribbon('spear blade', [(x, y, 1.054), (x, y, 1.130), (x, y, 1.340)],
               [.025, .066, .0015], [.016, .029, .0015], (0, -1, 0), 'WoodPale')


def shield():
    """A shallow wood disc puts most of its visible width in the dark face."""
    normal = Vector((-.62, -.78, .025)).normalized()
    center = Vector((-.252, -.186, .398))
    radius = .156
    bm = bmesh.new()
    sections = [(-.016, .91), (-.009, 1.00), (.009, 1.00),
                (.016, .96), (.016, .85), (.026, .79)]
    rings = [kit._ring(bm, center + normal * d, normal, radius * r, radius * r, 16)
             for d, r in sections]
    bm.faces.new(rings[0]).material_index = 1
    for i, (a, b) in enumerate(zip(rings, rings[1:])):
        for j in range(16):
            k = (j + 1) % 16
            bm.faces.new((a[j], a[k], b[k], b[j])).material_index = int(i >= 4)
    bm.faces.new(rings[-1]).material_index = 1
    kit.obj_from(bm, 'shield', ['Gold', 'SeatDark'])


def spearman_clothes():
    # Raise the rear point just above the unbroken back of the cloak.
    mantle = kit.mantle({0: .10, 30: .05, 180: .066, 150: .031})
    for vertex in mantle.data.vertices:
        x, y, z = vertex.co
        if abs(z - .735) < .0001:
            vertex.co.z -= .04 * (abs(y) / .185) ** 2
    kit.helmet()
    # Replace the three separate plates with a single guard under the helmet band.
    for obj in kit.PARTS.copy():
        if obj.name.startswith(('helm-cheek', 'helm-guard')):
            kit.PARTS.remove(obj)
            bpy.data.objects.remove(obj, do_unlink=True)
    outer, inner = [], []
    for z, radius in [(.907, .134), (.806, .143)]:
        out_row, in_row = [], []
        for j in range(11):
            t = 65 + 230 * j / 10
            bottom = z + (.016 * math.sin(j * math.pi / 5) ** 2 if z < .82 else 0)
            out_row.append(kit.pt(t, radius, bottom))
            in_row.append(kit.pt(t, radius - .014, bottom))
        outer.append(out_row)
        inner.append(in_row)
    kit.shell('helmet neck guard', outer, inner, 'WoodPale')


def make_piece(name):
    kit.base()
    # The base can also be seen from underneath in a model viewer.
    kit.lathe('foot underside', [(0, 0), (.37, 0)], 20, 'WoodPale')
    kit.body()
    kit.head()
    if name == 'archer':
        cowl()
        grip = (-.352, -.273, .580)
        sleeve(-1, (-.276, -.054, .476), grip)
        bow(grip)
        sleeve(1, (.229, -.009, .471), (.212, -.131, .405), quiet=True)
    else:
        spearman_clothes()
        foot = (.268, -.184, .170)
        spear(foot)
        sleeve(1, (.264, -.001, .473), (foot[0], foot[1], .485), cuff='SeatDark')
        sleeve(-1, (-.254, -.010, .474), (-.252, -.159, .421), quiet=True)
        shield()


def main():
    kit.start()
    for name, x in [('archer', -.49), ('spearman', .49)]:
        make_piece(name)
        # Keep editable parts in the blend file. Join copies for the single-mesh export.
        parts = kit.PARTS.copy()
        collection = bpy.data.collections.new(name.title())
        bpy.context.scene.collection.children.link(collection)
        for part in parts:
            collection.objects.link(part)
            bpy.context.scene.collection.objects.unlink(part)
        copies = []
        for part in parts:
            copy = part.copy()
            copy.data = part.data.copy()
            bpy.context.scene.collection.objects.link(copy)
            copies.append(copy)
        kit.PARTS[:] = copies
        obj = kit.finish(name)
        kit.report(obj)
        kit.export(obj, str(HERE / (name + '.glb')))
        bpy.data.objects.remove(obj, do_unlink=True)
        for part in parts:
            part.location.x += x
    # Open the editable file with both pieces in view and their material colours visible.
    for material in bpy.data.materials:
        if material.use_nodes:
            shader = material.node_tree.nodes.get('Principled BSDF')
            if shader:
                material.diffuse_color = shader.inputs['Base Color'].default_value[:]
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.shading.color_type = 'MATERIAL'
            space.overlay.show_overlays = False
            space.region_3d.view_distance = 2.9
            space.region_3d.view_location = (0, 0, .62)
            space.region_3d.view_rotation = Vector((-.12, -1, .30)).to_track_quat('Z', 'Y')
            space.region_3d.view_perspective = 'ORTHO'
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'pieces.blend'))


if __name__ == '__main__':
    main()
