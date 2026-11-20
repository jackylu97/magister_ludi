"""Export a smaller board mesh from the saved master. Run after model.py."""
import bpy
from pathlib import Path

out = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(out/'court-reader.blend'))
for obj in list(bpy.context.scene.objects):
    source = obj.data
    if obj.name.startswith('Stole'):
        # Keep both boundaries and more samples across the wider ivory ribbon.
        cols = [0,3,6,9,12] if 'ivory' in obj.name else [0,12]
        verts = [source.vertices[r*13+c].co.copy() for r in range(0,97,4) for c in cols]
        n = len(cols)
        faces = [(r*n+c,r*n+c+1,(r+1)*n+c+1,(r+1)*n+c)
                 for r in range(24) for c in range(n-1)]
    else:
        ring = len(source.polygons[0].vertices)
        step = 4 if ring==112 else 2 if ring>=48 else 1
        n = ring//step
        rows = len(source.vertices)//ring
        verts = [source.vertices[r*ring+c].co.copy() for r in range(rows) for c in range(0,ring,step)]
        faces = [tuple(reversed(range(n)))]
        faces.extend((r*n+c,r*n+(c+1)%n,(r+1)*n+(c+1)%n,(r+1)*n+c)
                     for r in range(rows-1) for c in range(n))
        faces.append(tuple(range(len(verts)-n,len(verts))))
    mesh = bpy.data.meshes.new(obj.name+' board')
    mesh.from_pydata(verts,[],faces)
    mesh.materials.append(source.materials[0])
    for face in mesh.polygons:
        face.use_smooth = source.polygons[0].use_smooth
    mesh.update()
    obj.data = mesh
bpy.ops.export_scene.gltf(filepath=str(out/'court-reader.glb'),export_format='GLB')
