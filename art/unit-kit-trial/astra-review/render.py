"""Render the exported GLBs in Cycles on two CPU threads. Use -- preview for a draft."""
import json
import math
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE.parent))
import kit

preview = '--' in sys.argv and 'preview' in sys.argv[sys.argv.index('--') + 1:]
out = Path(tempfile.gettempdir()) / 'astra-review-frames' if preview else HERE / 'renders'
out.mkdir(parents=True, exist_ok=True)
view = json.loads((HERE.parents[2] / 'data' / 'view3d.json').read_text())

kit.start()
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.cycles.samples = 5 if preview else 18
scene.cycles.max_bounces = 3
scene.cycles.use_denoising = True
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.world = bpy.data.worlds.new('Studio')
scene.world.use_nodes = True
background = scene.world.node_tree.nodes['Background']
background.inputs['Color'].default_value = (.88, .91, 1, 1)
background.inputs['Strength'].default_value = .36


def sunlight(name, position, power, angle):
    data = bpy.data.lights.new(name, 'SUN')
    data.energy, data.angle = power, math.radians(angle)
    lamp = bpy.data.objects.new(name, data)
    scene.collection.objects.link(lamp)
    lamp.rotation_euler = (-Vector(position)).to_track_quat('-Z', 'Y').to_euler()


sunlight('Main', (-4, -6, 8), 3.1, 18)
sunlight('Back', (3, 3, 4), .85, 25)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.0005))
ground = bpy.context.object
ground_mat = kit.mat('Ground', '#AA9886')
ground.data.materials.append(ground_mat)
camera = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type = 'ORTHO'

variants = {}
for version, folder in [('Third', HERE.parent), ('Review', HERE)]:
    for name in ('archer', 'spearman'):
        bpy.ops.import_scene.gltf(filepath=str(folder / (name + '.glb')))
        obj = bpy.context.selected_objects[0]
        obj.hide_render = True
        variants[version, name] = obj


def show(version, name, x, y, turn, colors=None):
    source = variants[version, name]
    obj = source.copy()
    scene.collection.objects.link(obj)
    obj.location = (x, y, 0)
    obj.rotation_mode = 'XYZ'
    obj.rotation_euler.z = math.radians(turn)
    obj.hide_render = False
    if colors:
        for slot in obj.material_slots:
            key = slot.material.name.split('.')[0]
            if key in colors:
                color = colors[key]
                slot.link = 'OBJECT'
                slot.material = kit.mat(key + color, color)
    return obj


def frame(file, objects, elevation, height, width, pixels):
    aim = Vector((0, 0, height))
    e = math.radians(elevation)
    camera.location = aim + 12 * Vector((0, -math.cos(e), math.sin(e)))
    camera.rotation_euler = (aim - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = width
    scene.render.resolution_x, scene.render.resolution_y = pixels
    scene.render.resolution_percentage = 48 if preview else 100
    scene.render.filepath = str(out / file)
    bpy.ops.render.render(write_still=True)
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)


def pair(version):
    objects = [show(version, name, x, 0, 12) for name, x in [('archer', -.49), ('spearman', .49)]]
    frame(version.lower() + '-pair.png', objects, 16, .63, 2.05, (786, 576))


pair('Review')
if not preview:
    pair('Third')
for name in ('archer', 'spearman'):
    objects = [show('Review', name, x, 0, yaw)
               for x, yaw in [(-1.08, 0), (0, 90), (1.08, -146)]]
    frame(name + '-views.png', objects, 15, .67, 3.34, (1110, 530))

if not preview:
    # The board camera looks from +Z in game space, or -Y in Blender at azimuth 90.
    camera_azimuth = view['camera']['azimuth']
    assert camera_azimuth == 90
    palette = view['palette']
    ground_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = kit.srgb(palette['sage'])
    colors = [dict(Seat=palette[name], SeatDark=dark) for name, dark in
              [('crimson', '#67392F'), ('lapis', '#233854'), ('teal', '#274749')]]
    objects = []
    for col, color in enumerate(colors):
        for y, yaw in [(1.0, 12), (-1.0, -146)]:
            for name, dx in [('archer', -.47), ('spearman', .47)]:
                objects.append(show('Review', name, (col - 1) * 2.30 + dx, y, yaw, color))
    # 51 pixels per Blender unit at the same camera scale as the third-pass board.
    frame('board.png', objects, view['camera']['elevation'], .45, 360 / 51, (360, 177))
