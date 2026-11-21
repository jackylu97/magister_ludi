"""The archer: a round hood whose front falls into two lapels, a bow held upright in one hand."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from mathutils import Vector


def build():
    kit.base(); kit.body(); kit.head()
    kit.mantle({0: .02, 30: .15, 60: .05}, band=None)         # the edge dips twice at the front: two lapels
    kit.hood()
    grip = Vector((-.33, -.25, .56))
    kit.sleeve(kit.SHOULDER_L, grip, cuff='SeatDark')
    a = math.radians(25); kit.bow(grip, (-math.cos(a), -math.sin(a), 0))
    kit.sleeve(kit.SHOULDER_R, (.24, -.19, .42), cuff='SeatDark')
    return kit.finish('archer')


if __name__ == '__main__':
    kit.start(); o = build(); kit.report(o)
    kit.export(o, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'archer.glb'))
