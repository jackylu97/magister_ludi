"""The archer: a hood and a long cloak that are one garment, a bow held upright in one hand."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from mathutils import Vector


def build():
    kit.base(); kit.body(); kit.head()
    kit.mantle({0: -.07, 30: .02}, band=None)                 # plain shoulders; the front edge rises to open the cloak
    kit.hood()
    kit.coat_edge()                                           # the hood rim runs on as the cloak's front edges
    grip = Vector((-.40, -.27, .58))
    kit.sleeve(kit.SHOULDER_L, grip, cuff='Seat', cloth='SeatDark', hand=False)
    a = math.radians(25); kit.bow(grip, (-math.cos(a), -math.sin(a), 0))
    kit.sleeve(kit.SHOULDER_R, (.265, -.17, .37), cuff='Seat', cloth='SeatDark')
    return kit.finish('archer')


if __name__ == '__main__':
    kit.start(); o = build(); kit.report(o)
    kit.export(o, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'archer.glb'))
