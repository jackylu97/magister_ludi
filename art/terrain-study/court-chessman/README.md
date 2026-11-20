# Court reader

An unarmed chessman with a carved mantle, an ivory stole, and a peaked court cap. The flared foot and shoulder give the piece its shape at board scale. The long ivory edge makes its facing easier to see.

The [board study](board-study.jpg) shows the Court Reader and the current swordsman at the same height on the same tile. Both normal-zoom views include the unit badge. The close view shows the new model with the badge hidden.

The [Murasaki Shikibu splash](../../../public/art/splash/people/murasakiShikibu.jpg) supplied the broad diagonal lapel. The [Mausoleum splash](../../../public/art/splash/wonders/mausoleum.jpg) supplied the stepped base and warm stone colour. The [painted sovereign study](../../../mockups/concept-plates/04-painted-sovereign.png) pairs a dark robe with a warm edge. The [carved unit lineup](../carved-unit-roster/lineup.jpg) gave a reference for the size and spacing of large facets.

- Open `court-reader.blend` to edit the individual parts.
- Load `court-reader.glb` for the board. Its height is 1.045 units. Its foot is 0.564 units wide and 0.485 deep. The origin sits at the centre of the foot at ground level. The model faces +Z in glTF.
- Set the base colour of `Player | Lacquer` to change the mantle and cap together. The walnut, ivory and brass keep their own materials.
- Run Blender in background mode with `-P model.py` to rebuild the master and the two-colour CPU render. Then run Blender with `-P export_board.py` to create the 3,412-triangle board GLB. This export uses fewer segments around the foot and mantle and along the ivory inlay.
