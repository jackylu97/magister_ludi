# Close ground texture trial, November 19, 2026

Open the game at `/?closeGround=1` and zoom all the way in. The trial bakes the visible ground at 64 texels per world unit. The regular game keeps its existing zoom switch. The visual decision remains open.

At closest zoom the most visible change is the softer edge where green ground meets sand. The river follows the same course, but its banks also soften. The hill silhouette and border follow the same lines. Each panel below is a 600 × 230 crop from the original 1920 × 1440 drawing buffer. The shore, river, hill and map seam use identical cameras on both sides.

![Shore, river, hill and seam at closest zoom. The left column shows the cut mesh and the right shows the local texture.](images/close-ground-2026-11-19.png)

## Motion and picking

Native WebKit rendered the 26 × 18 gallery on an Apple GPU with a 1280 × 960 viewport. The camera keeps a continuous x coordinate across the seam. The texture origin snaps to a texel. View coverage includes the ground mesh height bounds and the current camera pitch. The cut mesh draws while the view extends beyond the ready texture. The static shadow pass still uses the cut mesh.

| Gallery action | Cut frames / sampled frames | Elapsed until ready | Longest gap between sampled frames |
|---|---:|---:|---:|
| Half-unit pan | 0 / 1 | Already covered | Single sample |
| Two-unit refill after the small pan | 0 / 8 | 273 ms | 52 ms |
| Nine-unit drag | 7 / 8 | 275 ms | 38 ms |
| Jump to the seam | 7 / 8 | 318 ms | 50 ms |
| Cross the seam | 0 / 1 | Already covered | Single sample |

The elapsed column covers the whole refill. Each sample counts one display callback. These single runs include the rest of the board draw and host load. They do not establish a frame-time gain. On zooming out, the ordinary zoom rule selected the land mesh again.

On both the gallery and a generated Standard board (80 × 52, seed 42), all 140 tile picks matched between modes. All 20 unit contact heights also matched on each board, including the seam. The gallery used the warrior model and Standard used the settler model. The trial retains the current picking and placement geometry.

A separate six-seat Standard save (seed 20261116) loaded through Continue on the ordinary game URL with the option enabled. The painted board displayed the local texture at closest zoom. A jump to the seam used the cut mesh during the refill. Crossing the seam by half a unit then kept the same ready texture. Its base used 57.0 MiB and its ready local texture used 12 MiB.

## Giant allocation

WebKit allocated the real 8080 × 4380 base target at 25.92 texels per world unit and two 2048 × 1536 close targets. The base and both close targets completed their mipmaps. GPU completion after each allocation and each bake reported no WebGL error. The allocation test uses empty land batches and exercises the full target sizes.

| Ground paint storage | MiB |
|---|---:|
| Giant base including mipmaps | 180.005 |
| Two ultrawide close textures including mipmaps | 32 |
| One 1024 × 1024 square with four samples, resolved colour and depth | 40 |
| Estimated peak including the one-texel upload target | 252.005 |

These figures estimate attachment storage. Driver overhead, geometry and other renderer targets are separate. A full Giant board and its wide-view image at the lower base density remain unverified.

## Repeat the trial

With the Vite dev server running, open `/scripts/terrain-study/close-ground.html` for the paired gallery captures. Select a picture to save its full-resolution PNG. Add `?size=standard` to use the generated board or `?allocation=giant` to test the Giant targets. The page records measurements in `window.trialReport`.
