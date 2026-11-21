"""Build both pieces and render the review pictures into renders/."""
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy, bmesh, kit, archer, spearman
from mathutils import Vector
OUT = os.path.join(HERE, 'renders')
kit.start(); sc = bpy.context.scene
A = archer.build(); S = spearman.build()
kit.report(A); kit.report(S)

# studio: warm grey ground, a soft key from the upper left, a dark outline
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60)
G = kit.obj_from(bm, 'ground', kit.mat('Ground', '#8F8072').name); kit.PARTS.clear()
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 3.2; sun.data.angle = math.radians(12); sun.rotation_euler = (math.radians(48), 0, math.radians(-38))
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (1, .96, .9, 1); w.node_tree.nodes['Background'].inputs[1].default_value = .55
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'
sc.render.engine = 'BLENDER_EEVEE_NEXT'; sc.view_settings.view_transform = 'Standard'
sc.render.use_freestyle = True
ls = bpy.context.view_layer.freestyle_settings.linesets.new('line'); ls.linestyle.color = (.16, .09, .08)
ls.select_silhouette = True; ls.select_border = False; ls.select_crease = True


def shot(name, yaw, elev, target, scale, res, line=1.8):
    y, e = math.radians(yaw), math.radians(elev); t = Vector(target)
    cam.location = t + 12 * Vector((math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e)))
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale; sc.render.resolution_x, sc.render.resolution_y = res; sc.render.line_thickness = line
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True)


def show(objs):
    for o in (A, S): o.hide_render = o not in objs


A.location.x = -.5; S.location.x = .5
show([A, S]); shot('pair.png', -8, 18, (0, 0, .60), 2.3, (1180, 760))
A.location.x = S.location.x = 0
for o in (A, S):
    show([o])
    shot(o.name + '-34.png', -35, 18, (0, 0, .62), 1.75, (640, 640))
    shot(o.name + '-game.png', 0, 50, (0, 0, .5), 1.75, (640, 640))

# the board sheet: 51 pixels to a unit, so a piece is about 56 pixels tall from the game's camera.
# Rows: front, turned 40 degrees each way. Each row has its own seat colours, to show the recolour.
kit.mat('Ground').node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = kit.srgb('#6F7A47')
show([]); ls.select_crease = False
for r, (yaw, seat, dark) in enumerate([(0, None, None), (40, '#2F5FA8', '#1F2F5E'), (-40, '#2E7D4F', '#17472F')]):
    for c, src in enumerate((A, S)):
        o = src.copy(); o.data = src.data.copy(); sc.collection.objects.link(o); o.hide_render = False
        o.location = ((c - .5) * 1.5, (1 - r) * 1.5, 0); o.rotation_euler.z = math.radians(yaw)
        if seat:
            for i, m in enumerate(o.data.materials):
                if m.name in ('Seat', 'SeatDark'):
                    o.data.materials[i] = kit.mat('%s-%d' % (m.name, r), seat if m.name == 'Seat' else dark)
shot('board.png', 0, 50, (0, 0, .4), 300 / 51, (300, 250), line=0.8)
