"""Check the authored knight's boot/cloak clearance in world-space Blender units.

Run before joining the export meshes:
  Blender --background .dream-loop/knight-sculpture-review.blend \
    --python-exit-code 1 --python scripts/terrain-study/check_knight_sculpt.py

The two named boots are always compared with the cloak. Add ``-- --include-horse``
to also check the horse against the cloak. Other intentional sculpted overlaps
are outside this check. The default required surface gap is 0.003; override it
with ``-- --minimum-clearance VALUE`` after the script argument.
"""

import argparse
import hashlib
import json
from pathlib import Path
import sys

import bpy
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri


ROOT = Path(__file__).resolve().parents[2]
SCENE = ROOT / ".dream-loop/knight-sculpture-review.blend"
REPORT = ROOT / ".dream-loop/knight-clearance.json"
CONTACT_TOLERANCE = 1e-7


def surface(name):
    """Copy evaluated triangles, including object transforms, then release mesh."""
    obj = bpy.context.scene.objects.get(name)
    if obj is None or obj.type != "MESH":
        raise ValueError(f"Required mesh is missing: {name}")
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        indices = [tuple(triangle.vertices) for triangle in mesh.loop_triangles]
    finally:
        evaluated.to_mesh_clear()
    if not indices:
        raise ValueError(f"Required mesh has no triangles: {name}")
    return {
        "name": name,
        "vertices": vertices,
        "indices": indices,
        "triangles": [tuple(vertices[i] for i in triangle) for triangle in indices],
        "tree": BVHTree.FromPolygons(vertices, indices, all_triangles=True),
    }


def clamp(value):
    return max(0.0, min(1.0, value))


def segment_distance_squared(p, q, r, s):
    """Closest distance between finite segments, including parallel edges."""
    u, v, w = q - p, s - r, p - r
    a, e = u.dot(u), v.dot(v)
    tiny = 1e-20
    if a <= tiny and e <= tiny:
        return w.length_squared
    if a <= tiny:
        alpha, beta = 0.0, clamp(v.dot(w) / e)
    else:
        c = u.dot(w)
        if e <= tiny:
            alpha, beta = clamp(-c / a), 0.0
        else:
            b, f = u.dot(v), v.dot(w)
            denominator = a * e - b * b
            alpha = clamp((b * f - c * e) / denominator) if denominator > a * e * 1e-12 else 0.0
            beta = (b * alpha + f) / e
            if beta < 0.0:
                alpha, beta = clamp(-c / a), 0.0
            elif beta > 1.0:
                alpha, beta = clamp((b - c) / a), 1.0
    return ((p + alpha * u) - (r + beta * v)).length_squared


def segment_pierces_triangle(start, end, triangle):
    """Detect an edge crossing a triangle interior; coplanarity is handled below."""
    a, b, c = triangle
    direction = end - start
    normal = (b - a).cross(c - a)
    denominator = normal.dot(direction)
    if abs(denominator) <= 1e-12 * normal.length * direction.length:
        return False
    t = normal.dot(a - start) / denominator
    if not 0.0 <= t <= 1.0:
        return False
    point = start + t * direction
    return (point - closest_point_on_tri(point, a, b, c)).length_squared <= CONTACT_TOLERANCE**2


def triangle_distance_squared(first, second):
    """Exact triangle features: edge/face crossings, vertices/faces, edges/edges.

    Coplanar contact is detected by vertex/face or edge/edge distance. A BVH
    overlap alone is insufficient: overlapping triangle boxes may be disjoint.
    """
    first_edges = tuple(zip(first, first[1:] + first[:1]))
    second_edges = tuple(zip(second, second[1:] + second[:1]))
    if any(segment_pierces_triangle(a, b, second) for a, b in first_edges):
        return 0.0
    if any(segment_pierces_triangle(a, b, first) for a, b in second_edges):
        return 0.0
    distances = [(p - closest_point_on_tri(p, *second)).length_squared for p in first]
    distances += [(p - closest_point_on_tri(p, *first)).length_squared for p in second]
    distances += [segment_distance_squared(a, b, c, d)
                  for a, b in first_edges for c, d in second_edges]
    return min(distances)


def check_pair(boot, cloak, required_gap):
    # Vertex/face distances provide an upper bound. Include every triangle-box
    # pair within it to catch closer edge/edge minima. Blender's BVH overlap
    # query filters triangles internally, so its epsilon is not a distance query.
    bound = min(
        target["tree"].find_nearest(vertex)[3]
        for source, target in ((boot, cloak), (cloak, boot))
        for vertex in source["vertices"]
    )
    bvh_candidates = boot["tree"].overlap(cloak["tree"])
    candidates = set(bvh_candidates)
    def boxes(mesh):
        return [(tuple(min(p[axis] for p in triangle) for axis in range(3)),
                 tuple(max(p[axis] for p in triangle) for axis in range(3)))
                for triangle in mesh["triangles"]]
    boot_boxes, cloak_boxes = boxes(boot), boxes(cloak)
    bound_squared = (bound + 10 * CONTACT_TOLERANCE)**2
    for boot_index, (a_min, a_max) in enumerate(boot_boxes):
        for cloak_index, (b_min, b_max) in enumerate(cloak_boxes):
            box_distance_squared = sum(
                max(0.0, a_min[axis] - b_max[axis], b_min[axis] - a_max[axis])**2
                for axis in range(3)
            )
            if box_distance_squared <= bound_squared:
                candidates.add((boot_index, cloak_index))
    minimum_squared = float("inf")
    closest_pair = None
    contact_pairs = []
    for boot_index, cloak_index in sorted(candidates):
        distance_squared = triangle_distance_squared(
            boot["triangles"][boot_index], cloak["triangles"][cloak_index],
        )
        if distance_squared < minimum_squared:
            minimum_squared = distance_squared
            closest_pair = [boot_index, cloak_index]
        if distance_squared <= CONTACT_TOLERANCE**2:
            contact_pairs.append([boot_index, cloak_index])
    if closest_pair is None:
        raise RuntimeError(f"BVH produced no clearance candidates for {boot['name']}")
    clearance = minimum_squared**0.5
    return {
        "boot": boot["name"],
        "cloak": cloak["name"],
        "boot_triangles": len(boot["triangles"]),
        "cloak_triangles": len(cloak["triangles"]),
        "bvh_overlap_candidates": len(bvh_candidates),
        "candidate_pairs_checked": len(candidates),
        "intersection_or_contact_count": len(contact_pairs),
        "intersection_or_contact_triangle_pairs": contact_pairs,
        "minimum_surface_clearance": clearance,
        "closest_triangle_pair": closest_pair,
        "passed": not contact_pairs and clearance + CONTACT_TOLERANCE >= required_gap,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum-clearance", type=float, default=0.003)
    parser.add_argument("--include-horse", action="store_true",
                        help="Also require horse/cloak clearance and no intersections")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    report = {
        "scene": str(SCENE),
        "minimum_required_clearance": args.minimum_clearance,
        "contact_tolerance": CONTACT_TOLERANCE,
        "coordinate_space": "world",
        "passed": False,
        "pairs": [],
    }
    try:
        if not 0.0 <= args.minimum_clearance < float("inf"):
            raise ValueError("Minimum clearance must be finite and nonnegative")
        if Path(bpy.data.filepath).resolve() != SCENE.resolve():
            raise ValueError(f"Open the authored review scene first: {SCENE}")
        report["scene_sha256"] = hashlib.sha256(SCENE.read_bytes()).hexdigest()
        cloak = surface("Knight cloak")
        report["pairs"] = [
            check_pair(surface(name), cloak, args.minimum_clearance)
            for name in ("Knight boot left", "Knight boot right")
        ]
        if args.include_horse:
            horse = check_pair(surface("Knight horse"), cloak, args.minimum_clearance)
            horse["horse"] = horse.pop("boot")
            horse["horse_triangles"] = horse.pop("boot_triangles")
            report["pairs"].append(horse)
        report["passed"] = all(pair["passed"] for pair in report["pairs"])
    except Exception as error:
        report["error"] = f"{type(error).__name__}: {error}"
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2), flush=True)
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
