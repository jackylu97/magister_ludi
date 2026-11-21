"""Place the reference and the two renders at the same base width. Requires Pillow."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / 'renders'
W, H = 480, 352
PAPER = '#F3EEE4'
INK = '#302B27'


def font(size):
    for file in ('/System/Library/Fonts/Supplemental/Arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(file, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    panel = Image.new('RGB', (3 * W + 8, H + 46), PAPER)
    draw = ImageDraw.Draw(panel)
    reference = Image.open(HERE.parent / 'reference.png').convert('RGB')
    reference = reference.crop((680, 0, 1774, 887))
    # The base is 438 pixels wide in the reference and .74 units in the render.
    scale = (.74 * W / 2.05) / 438
    reference = reference.resize((round(reference.width * scale), round(reference.height * scale)),
                                 Image.Resampling.LANCZOS)
    ref_frame = Image.new('RGB', (W, H), PAPER)
    ref_frame.paste(reference, ((W - reference.width) // 2, H - reference.height))
    frames = [ref_frame] + [Image.open(OUT / (v + '-pair.png')).convert('RGB').resize((W, H),
                            Image.Resampling.LANCZOS) for v in ('third', 'review')]
    for i, (image, title) in enumerate(zip(frames, ('Reference', 'Third pass', 'Revised pair'))):
        left = i * (W + 4)
        draw.text((left + 15, 11), title, font=font(20), fill=INK)
        panel.paste(image, (left, 46))
    panel.save(OUT / 'comparison.png')


if __name__ == '__main__':
    main()
