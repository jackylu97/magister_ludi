"""The spearman: a low helmet, a gold-edged mantle, an upright spear and a round shield."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit


def build():
    kit.base(); kit.body(); kit.head()
    kit.mantle({0: .10, 30: .05, 180: .10, 150: .05})         # the edge comes to a V at the front and the back
    kit.helmet()
    foot = (.24, -.20, kit.BASE_TOP - .03)                    # the butt stands on the top step
    kit.spear(foot)
    kit.sleeve(kit.SHOULDER_R, (foot[0], foot[1], .45), cuff='Seat')
    kit.sleeve(kit.SHOULDER_L, (-.23, -.17, .40), cuff='Seat')
    kit.shield((-.25, -.19, .375), (-.75, -.66, .05), r=.15)
    return kit.finish('spearman')


if __name__ == '__main__':
    kit.start(); o = build(); kit.report(o)
    kit.export(o, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'spearman.glb'))
