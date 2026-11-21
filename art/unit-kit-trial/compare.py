"""Put the reference (archer and spearman) beside renders/pair.png at the same base width.
Run with plain Python after render.py: python3 compare.py  (needs Pillow). Writes renders/compare.png."""
import os
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
ref = Image.open(os.path.join(H, 'reference.png')).convert('RGB').crop((680, 0, 1774, 887))   # the worker is cut off
pair = Image.open(os.path.join(H, 'renders', 'pair.png')).convert('RGB')
k = (0.74 * 1180 / 2.3) / 438.0     # the render's base width in pixels over the reference's
ref = ref.resize((round(ref.width * k), round(ref.height * k)), Image.LANCZOS)
W = Image.new('RGB', (ref.width + pair.width, max(ref.height, pair.height)), (143, 128, 114))
W.paste(ref, (0, W.height - ref.height)); W.paste(pair, (ref.width, W.height - pair.height))
W.save(os.path.join(H, 'renders', 'compare.png'))
