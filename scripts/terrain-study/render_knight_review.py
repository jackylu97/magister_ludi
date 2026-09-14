"""Render neutral inspection views of the saved knight without saving the scene.

Blender --background .dream-loop/knight-sculpture-review.blend \
  --python-exit-code 1 --python scripts/terrain-study/render_knight_review.py
"""

import math
from pathlib import Path

import bpy
from mathutils import Vector


OUTPUT = Path(__file__).resolve().parents[2] / ".dream-loop"


def linear(hex_color):
    channels = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055)**2.4
                 for c in channels)


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area_light(name, position, power, size, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = position
    point_at(obj, target)


def main():
    scene = bpy.context.scene
    if scene.objects.get("Knight cloak") is None:
        raise ValueError("Load .dream-loop/knight-sculpture-review.blend first")
    points = [obj.matrix_world @ Vector(corner)
              for obj in scene.objects if obj.type == "MESH"
              for corner in obj.bound_box]
    lower = Vector(tuple(min(p[axis] for p in points) for axis in range(3)))
    upper = Vector(tuple(max(p[axis] for p in points) for axis in range(3)))
    center = (lower + upper) * 0.5

    # Match the owner's red preview while retaining every material's existing
    # relative shade. This changes only the in-memory scene used for rendering.
    tint = linear("cf4936")
    for material in bpy.data.materials:
        if material.name.startswith("Owner"):
            color = tuple(material.diffuse_color[i] * tint[i] for i in range(3)) + (1.0,)
            material.diffuse_color = color
            if material.use_nodes:
                shader = material.node_tree.nodes.get("Principled BSDF")
                if shader:
                    shader.inputs["Base Color"].default_value = color

    for obj in list(scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(obj, do_unlink=True)
    floor = bpy.data.materials.new("Review warm neutral floor")
    floor.use_nodes = True
    shader = floor.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*linear("e2ddd3"), 1.0)
    shader.inputs["Roughness"].default_value = 0.95
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, lower.z - 0.003))
    bpy.context.object.name = "Review floor"
    bpy.context.object.data.materials.append(floor)

    scene.world = bpy.data.worlds.new("Review neutral world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (*linear("f1eee7"), 1.0)
    background.inputs["Strength"].default_value = 0.65
    area_light("Review soft key", (2.5, -3.5, 4.0), 180, 4, center)
    area_light("Review soft fill", (-3.0, 2.5, 3.0), 100, 5, center)

    camera_data = bpy.data.cameras.new("Review camera")
    camera = bpy.data.objects.new("Review camera", camera_data)
    scene.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.lens = 50
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 576
    scene.render.resolution_y = 576
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for name, azimuth in (("front", -52), ("side", 98), ("back", -142)):
        angle, elevation = math.radians(azimuth), math.radians(14)
        direction = Vector((math.cos(angle) * math.cos(elevation),
                            math.sin(angle) * math.cos(elevation), math.sin(elevation)))
        camera.location = center + direction * 4
        point_at(camera, center)
        bpy.context.view_layer.update()
        inverse_camera = camera.matrix_world.inverted()
        projected = [inverse_camera @ point for point in points]
        extent = max(max(p[axis] for p in projected) - min(p[axis] for p in projected)
                     for axis in (0, 1))
        camera_data.ortho_scale = extent * 1.22
        scene.render.filepath = str(OUTPUT / f"knight-turnaround-{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"TURNAROUND {scene.render.filepath}", flush=True)


if __name__ == "__main__":
    main()
