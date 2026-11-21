"""The shared kit for the carved game pieces.

Every piece is built from the same parts: base, body, mantle (the shoulder
block), head, a hood or a helmet, sleeves with a cuff and a hand, and props.

Conventions:
- Blender units. Z is up. The piece faces -Y (toward the camera).
- The foot of the base is z = 0 and the top of the bare head is z = 1.0.
- An angle `t` around the piece is measured from the front: 0 is the front,
  90 is +X (the viewer's right), 180 is the back.
- Faceted parts keep flat faces. Turned parts (base, head, shafts) are shaded
  smooth, with a sharp edge wherever two faces meet at more than 40 degrees.
  The glTF exporter writes both as real split normals, so a toon material
  that ignores a flat-shading flag still shows the facets.
- "Seat" and "SeatDark" are the two materials the game recolours per player.
"""
import bpy, bmesh, math
from mathutils import Vector

PALETTE = {
    'WoodPale': '#E7CD9D',
    'Gold': '#C9932E',
    'Seat': '#A3293A',
    'SeatDark': '#5A2444',
    'WoodBrown': '#7B4A2B',
}
BASE_TOP = 0.20          # the body stands on this
HEAD_R = 0.12
HEAD_C = Vector((0, -0.005, 1.0 - HEAD_R))
SHOULDER_L = Vector((-0.215, -0.04, 0.60))   # the viewer's left
SHOULDER_R = Vector((0.215, -0.04, 0.60))

PARTS = []


# ---------------------------------------------------------------- basics
def start():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PARTS.clear()


def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


def mat(name, hexcol=None):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(hexcol or PALETTE[name])
    b.inputs['Roughness'].default_value = 0.9
    return m


def obj_from(bm, name, materials, smooth=False):
    """Turn a bmesh into an object. `materials` is a name or a list of names
    (faces pick one with material_index)."""
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if smooth:
        bm.normal_update()
        for f in bm.faces: f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(40): e.smooth = False
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for m in ([materials] if isinstance(materials, str) else materials): me.materials.append(mat(m))
    PARTS.append(o); return o


def pt(t, r, z, ry=None):
    """A point at angle t (degrees from the front) and radius r."""
    a = math.radians(t)
    return Vector((r * math.sin(a), -(r if ry is None else ry) * math.cos(a), z))


def _ring(bm, centre, axis, rx, ry, n, rot=0.0):
    axis = Vector(axis).normalized()
    ref = Vector((0, 1, 0)) if abs(axis.z) > 0.9 else Vector((0, 0, 1))
    u = axis.cross(ref).normalized(); v = axis.cross(u).normalized()
    return [bm.verts.new(Vector(centre) + u * (rx * math.cos(rot + 2 * math.pi * i / n)) + v * (ry * math.sin(rot + 2 * math.pi * i / n))) for i in range(n)]


def _skin(bm, rings, caps=True):
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    if caps: bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def loft(name, sections, n, material, axis=(0, 0, 1), rot=0.0, smooth=False):
    """Rings along one axis. sections: (centre, rx, ry)."""
    bm = bmesh.new()
    _skin(bm, [_ring(bm, c, axis, rx, ry, n, rot) for c, rx, ry in sections])
    return obj_from(bm, name, material, smooth)


def limb(name, pts, radii, n, material, smooth=False, rot=0.0):
    """A chain of prisms through pts, with a radius at each point."""
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        a = Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])
        rings.append(_ring(bm, p, a, radii[i], radii[i], n, rot))
    _skin(bm, rings)
    return obj_from(bm, name, material, smooth)


def lathe(name, profile, n, material, smooth=True):
    """Turn a profile of (radius, z) points about the Z axis. Radius 0 is a point."""
    bm = bmesh.new(); rings = []
    for r, z in profile:
        rings.append([bm.verts.new((0, 0, z))] if r == 0 else [bm.verts.new(pt(360 * i / n, r, z)) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            if len(a) == 1: bm.faces.new((a[0], b[j], b[i]))
            elif len(b) == 1: bm.faces.new((a[i], a[j], b[0]))
            else: bm.faces.new((a[i], a[j], b[j], b[i]))
    return obj_from(bm, name, material, smooth)


def block(name, centre, size, material, along=None, turn=0.0):
    """A box. `along` points its local Z; `turn` (degrees) spins it about Z first."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    o = obj_from(bm, name, material); o.scale = size; o.location = centre
    q = Vector(along).to_track_quat('Z', 'Y') if along is not None else Vector((0, 0, 1)).to_track_quat('Z', 'Y')
    o.rotation_euler = q.to_euler(); o.rotation_euler.rotate_axis('Z', math.radians(turn))
    return o


def ribbon(name, pts, widths, thicks, normal, material):
    """A blade: a diamond section swept through pts. `normal` is the thin
    direction; the wide direction lies across the path."""
    bm = bmesh.new(); N = Vector(normal).normalized(); pts = [Vector(p) for p in pts]; rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        w = t.cross(N).normalized()
        rings.append([bm.verts.new(p + w * widths[i]), bm.verts.new(p + N * thicks[i]), bm.verts.new(p - w * widths[i]), bm.verts.new(p - N * thicks[i])])
    _skin(bm, rings)
    return obj_from(bm, name, material)


def shell(name, outer, inner, material, cap_last=False):
    """A thick carved shell from two grids of points (outer and inner skin).
    The rim joins them. With cap_last the last row is closed, not rimmed."""
    bm = bmesh.new()
    vo = [[bm.verts.new(p) for p in row] for row in outer]; vi = [[bm.verts.new(p) for p in row] for row in inner]
    R, C = len(vo), len(vo[0])
    for g in (vo, vi):
        for k in range(R - 1):
            for j in range(C - 1): bm.faces.new((g[k][j], g[k][j + 1], g[k + 1][j + 1], g[k + 1][j]))
    for j in range(C - 1):
        bm.faces.new((vo[0][j], vo[0][j + 1], vi[0][j + 1], vi[0][j]))
        if not cap_last: bm.faces.new((vo[-1][j], vo[-1][j + 1], vi[-1][j + 1], vi[-1][j]))
    for k in range(R - 1):
        for j in (0, C - 1): bm.faces.new((vo[k][j], vo[k + 1][j], vi[k + 1][j], vi[k][j]))
    if cap_last:
        bm.faces.new(vo[-1]); bm.faces.new(vi[-1]); bm.faces.new((vo[-1][0], vo[-1][-1], vi[-1][-1], vi[-1][0]))
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    return obj_from(bm, name, material)


# ---------------------------------------------------------------- the body kit
def base():
    """A wide pale disc, a gold band, a narrower pale step."""
    lathe('base-disc', [(.37, 0), (.37, .085), (.36, .10), (.345, .10)], 20, 'WoodPale')
    lathe('base-band', [(.345, .10), (.345, .17), (.325, .17)], 20, 'Gold')
    lathe('base-step', [(.325, .17), (.325, BASE_TOP), (0, BASE_TOP)], 20, 'WoodPale')


BODY = [(BASE_TOP, .272), (.56, .172), (.66, .135)]                          # the dark inner bell: (z, radius)
CLOAK = [(BASE_TOP, .30, 41), (.28, .29, 38), (.56, .20, 28), (.66, .165, 22)]  # (z, radius, half opening in degrees)


def body(cloak='Seat', panel='SeatDark'):
    """A 12-facet bell in the panel colour, and a cloak over it that is open at the front."""
    bm = bmesh.new()
    _skin(bm, [[bm.verts.new(pt(15 + 30 * i, r, z)) for i in range(12)] for z, r in BODY])
    obj_from(bm, 'body', panel)
    outer, inner = [], []
    for z, r, a in CLOAK:
        ts = [a] + [45 + 30 * i for i in range(10)] + [360 - a]
        outer.append([pt(t, r, z) for t in ts]); inner.append([pt(t, r - .045, z) for t in ts])
    shell('cloak', outer, inner, cloak)


def mantle(drops, band='Gold', cloth='Seat'):
    """The shoulder block: a thick yoke on top of the body. Its top slopes a
    little from the collar to the shoulder points, then drops steeply to an
    edge band that stands out from the body. `drops` says how far the edge
    hangs below the shoulder line at each angle from the front, for example
    {0: .10, 30: .05} is a V. `band` is the edge colour (None for the cloth)."""
    bm = bmesh.new(); n = 12; edge = .60; bw = .055
    def dz(t): return drops.get(t, drops.get(360 - t, 0))
    rings = [[bm.verts.new(pt(30 * i, .105, .80)) for i in range(n)],                                # collar
             [bm.verts.new(pt(30 * i, .232, .735, .185)) for i in range(n)],                         # shoulder points
             [bm.verts.new(pt(30 * i, .252, edge - dz(30 * i), .215)) for i in range(n)],            # edge
             [bm.verts.new(pt(30 * i, .27, edge - dz(30 * i) - bw, .233)) for i in range(n)],        # foot of the band
             [bm.verts.new(pt(30 * i, .16, edge - dz(30 * i) - bw, .13)) for i in range(n)]]         # underside
    bm.faces.new(rings[0])
    for i in range(n):
        j = (i + 1) % n
        a, c = (i, j) if i < n // 2 else (j, i)   # a is the corner nearer the front, so both sides fold the same way
        for lo, hi, m in zip(rings, rings[1:], (0, 0, 1, 0)):
            for tri in ((lo[a], lo[c], hi[c]), (lo[a], hi[c], hi[a])): bm.faces.new(tri).material_index = m
    return obj_from(bm, 'mantle', [cloth, band or cloth])


def head():
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=HEAD_R)
    bmesh.ops.translate(bm, verts=bm.verts, vec=HEAD_C)
    return obj_from(bm, 'head', 'WoodPale', smooth=True)


# rows from the face opening to the back of the head: (y, half width, height, brow overhang, peak)
HOOD = [(-.14, .16, .15, .03, 0), (-.02, .195, .175, 0, 0), (.10, .185, .17, 0, .02), (.19, .11, .10, 0, 0)]


def hood(rows=HOOD, material='Seat', thick=.045):
    """A round thick shell over the head, open at the front. Each row is an
    arch from one shoulder over the head to the other."""
    outer, inner = [], []
    for y, w, h, fwd, peak in rows:
        c = Vector((0, y, HEAD_C.z)); row = [Vector((-w, y, .70))]
        for f in range(-120, 121, 30):
            a = math.radians(f); k = max(0, math.cos(a))
            row.append(Vector((w * math.sin(a), y - fwd * k, HEAD_C.z + h * math.cos(a) + peak * k)))
        row.append(Vector((w, y, .70)))
        outer.append(row); inner.append([p + (c - p).normalized() * thick for p in row])
    return shell('hood', outer, inner, material, cap_last=True)


def helmet():
    """A low pale cap from the brow up, a thin seat-colour band at the brow,
    cheek plates and a neck guard that hang from the band, a small gold finial."""
    lathe('helm-dome', [(.13, .935), (.123, .97), (.10, 1.0), (.058, 1.02), (0, 1.027)], 16, 'WoodPale')
    lathe('helm-band', [(.115, .90), (.14, .90), (.14, .938), (.115, .938)], 16, 'Seat')
    lathe('helm-finial', [(.026, 1.018), (.026, 1.032), (.012, 1.04), (0, 1.08)], 8, 'Gold')
    for s in (-1, 1): block('helm-cheek', (s * .125, -.03, .85), (.03, .10, .11), 'WoodPale', turn=-s * 8)
    block('helm-guard', (0, .12, .85), (.17, .03, .11), 'WoodPale')


def band(name, pts, width, thick, material):
    """A flat strip of rectangular section through pts, lying on the garment
    and standing a little proud of it. One chain of quads with shared edges."""
    bm = bmesh.new(); pts = [Vector(p) for p in pts]; rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = (p - Vector((0, .08, min(p.z, HEAD_C.z)))).normalized(); w = t.cross(n).normalized(); n = w.cross(t)
        q = p + n * .006
        rings.append([bm.verts.new(q + w * width / 2 + n * thick / 2), bm.verts.new(q - w * width / 2 + n * thick / 2),
                      bm.verts.new(q - w * width / 2 - n * thick / 2), bm.verts.new(q + w * width / 2 - n * thick / 2)])
    _skin(bm, rings)
    return obj_from(bm, name, material)


def coat_edge(material='Seat'):
    """The hood's rim and the cloak's two front edges as ONE band: up one
    front edge of the cloak, over the shoulder block, around the face and down
    the other side. It makes the hood and the cloak read as one garment."""
    side = [pt(a, r + .004, z) for z, r, a in CLOAK[:2]] + [pt(31, .228, .49), pt(27, .275, .542, .238), pt(26, .256, .60, .219),
            pt(31, .236, .737, .189), Vector((.152, -.148, .775))]
    y, w, h, fwd, _ = HOOD[0]
    for f in (120, 90, 60, 30):
        a = math.radians(f); c = max(0, math.cos(a))
        side.append(Vector((w * math.sin(a), y - fwd * c, HEAD_C.z + h * math.cos(a))))
    top = Vector((0, y - fwd, HEAD_C.z + h))
    return band('coat-edge', side + [top] + [Vector((-p.x, p.y, p.z)) for p in reversed(side)], .055, .032, material)


def sleeve(shoulder, grip, cuff='Gold', cloth='Seat', hand=True):
    """One thick faceted sleeve from under the shoulder block to `grip`, the
    point a prop is held at. The cuff is a band around the sleeve's end and
    wraps the prop. The hand is a small block that barely shows past the cuff.
    Pass hand=False where the cuff grips a prop and the prop hides the hand."""
    s, g = Vector(shoulder), Vector(grip); d = (g - s).normalized()
    limb('sleeve', [s, g - d * .03], [.076, .08], 6, cloth)
    limb('cuff', [g - d * .04, g + d * .04], [.093, .093], 6, cuff)
    if hand: block('hand', g + d * .05, (.085, .085, .05), 'WoodPale', along=d)


# ---------------------------------------------------------------- props
def pick(butt, tip, out=(-1, 0, 0), drop=(0, 0, -1)):
    """A turned brown shaft, a gold collar at the head, a pale curved blade and a short back spike."""
    b, t = Vector(butt), Vector(tip); d = (t - b).normalized(); o = Vector(out).normalized(); g = Vector(drop)
    limb('pick-shaft', [b, t], [.02, .02], 8, 'WoodBrown', smooth=True)
    limb('pick-collar', [t - d * .085, t - d * .005], [.04, .04], 8, 'Gold', smooth=True)
    c = t - d * .045; n = o.cross(g)
    ribbon('pick-blade', [c, c + o * .10 + g * .012, c + o * .20 + g * .07, c + o * .265 + g * .17, c + o * .275 + g * .27],
           [.05, .058, .05, .034, .004], [.022, .022, .018, .012, .004], n, 'WoodPale')
    ribbon('pick-spike', [c, c - o * .075 - g * .005, c - o * .12 + g * .01], [.04, .032, .006], [.02, .016, .004], n, 'WoodPale')


BOW = [(0, 0), (-.012, .08), (-.052, .19), (-.085, .28), (-.07, .34), (-.025, .375)]   # (toward the belly, up) from the grip


def bow(grip, out):
    """An upright recurve. `out` is the direction the belly faces, away from the archer."""
    g = Vector(grip); o = Vector(out).normalized(); z = Vector((0, 0, 1)); n = o.cross(z)
    curve = [(u, -v) for u, v in reversed(BOW[1:])] + BOW
    w = [.022, .036, .048, .054, .058, .06, .058, .054, .048, .036, .022]
    ribbon('bow', [g + o * u + z * v for u, v in curve], w, [.03] * 11, n, 'WoodPale')
    for s in (-1, 1):
        ribbon('bow-grip', [g + o * BOW[1][0] + z * s * .085, g + o * BOW[1][0] + z * s * .15], [.07, .068], [.04, .04], n, 'Gold')
    a, b = [g + o * BOW[4][0] + z * s * BOW[4][1] for s in (-1, 1)]
    limb('bow-string', [a, b], [.006, .006], 3, 'WoodPale')


def quiver(foot=(.07, .25, .50), mouth=(.235, .25, .94)):
    """A brown tube on the back with a gold mouth and three pale arrow ends."""
    f, m = Vector(foot), Vector(mouth); d = (m - f).normalized()
    limb('quiver', [f, m], [.04, .05], 6, 'WoodBrown')
    limb('quiver-mouth', [m - d * .03, m + d * .012], [.058, .058], 6, 'Gold')
    for dx, dy, l in ((-.02, 0, .10), (.02, .012, .075), (0, -.018, .055)):
        block('arrow', m + Vector((dx, dy, 0)) + d * (l / 2), (.024, .024, l), 'WoodPale', along=d, turn=45)


def spear(foot, top=1.0):
    """A thick seat-colour post, a tall gold collar, a large pale leaf blade with flat facets."""
    f = Vector(foot); x, y = f.x, f.y
    limb('spear-shaft', [f, (x, y, top)], [.038, .038], 8, 'Seat', smooth=True)
    limb('spear-collar', [(x, y, top - .02), (x, y, top + .08)], [.052, .052], 8, 'Gold', smooth=True)
    ribbon('spear-blade', [(x, y, top + .07), (x, y, top + .16), (x, y, top + .36)], [.034, .09, .004], [.022, .04, .004], (0, -1, 0), 'WoodPale')


def shield(centre, normal, r=.167):
    """A thick round shield: a wide gold rim and a plum face."""
    c = Vector(centre); n = Vector(normal).normalized()
    loft('shield-rim', [(c - n * .035, r, r), (c + n * .02, r, r), (c + n * .04, r * .93, r * .93), (c + n * .04, r * .70, r * .70)], 14, 'Gold', axis=n, smooth=True)
    loft('shield-face', [(c + n * .03, r * .72, r * .72), (c + n * .05, r * .62, r * .62)], 14, 'SeatDark', axis=n)


# ---------------------------------------------------------------- finishing
def finish(name):
    """Join every part made so far into one object with the origin at the foot of the base."""
    bpy.context.view_layer.update()   # a new object's world matrix is not set until the scene updates
    for o in bpy.data.objects: o.select_set(False)
    for o in PARTS: o.select_set(True)
    bpy.context.view_layer.objects.active = PARTS[0]
    bpy.ops.object.join(); o = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.name = name; o.data.name = name; PARTS.clear(); return o


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def report(o):
    by = {}
    for p in o.data.polygons:
        k = o.data.materials[p.material_index].name; by[k] = by.get(k, 0) + len(p.vertices) - 2
    zs = [v.co.z for v in o.data.vertices]
    print('TRIS', o.name, tris(o), by, 'height %.3f' % max(zs))


def export(o, path):
    for x in bpy.data.objects: x.select_set(x == o)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_yup=True)
