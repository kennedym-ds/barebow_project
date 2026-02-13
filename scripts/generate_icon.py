"""Generate baretrack.ico from a programmatic drawing (no SVG dependency).

Produces a multi-resolution .ico with 16, 32, 48, 64, 128, 256 px sizes.
"""

import os

from PIL import Image, ImageDraw

SIZES = [16, 32, 48, 64, 128, 256]
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "baretrack.ico")


def draw_icon(size: int) -> Image.Image:
    """Draw a target + bow icon at the given pixel size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    s = size / 512  # scale factor

    # --- Background ---
    d.ellipse(
        [4 * s, 4 * s, size - 4 * s, size - 4 * s], fill=(26, 26, 46), outline=(200, 200, 210), width=max(1, int(4 * s))
    )

    # --- Target rings ---
    for r, alpha in [(200, 60), (155, 80), (110, 100), (65, 140)]:
        r_px = r * s
        box = [cx - r_px, cy - r_px, cx + r_px, cy + r_px]
        d.ellipse(box, fill=None, outline=(74, 144, 217, alpha), width=max(1, int(3 * s)))

    # --- Gold center ---
    r_gold = 28 * s
    d.ellipse([cx - r_gold, cy - r_gold, cx + r_gold, cy + r_gold], fill=(240, 192, 64))
    r_x = 12 * s
    d.ellipse([cx - r_x, cy - r_x, cx + r_x, cy + r_x], fill=(232, 160, 32))

    # --- Bow limb (arc approximated with thick line) ---
    bow_x = 120 * s
    top_y = 120 * s
    bot_y = 392 * s
    mid_x = 80 * s
    # Draw a curved bow using a series of points
    points = []
    for i in range(21):
        t = i / 20
        y = top_y + t * (bot_y - top_y)
        # Quadratic bezier: P = (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
        x = (1 - t) ** 2 * bow_x + 2 * (1 - t) * t * mid_x + t**2 * bow_x
        points.append((x, y))
    if len(points) >= 2:
        d.line(points, fill=(192, 149, 108), width=max(2, int(10 * s)), joint="curve")

    # --- String ---
    d.line([(bow_x, top_y), (bow_x, bot_y)], fill=(226, 226, 226, 200), width=max(1, int(2.5 * s)))

    # --- Arrow shaft ---
    d.line([(bow_x, cy), (cx, cy)], fill=(212, 212, 212), width=max(1, int(4 * s)))

    # --- Arrow point ---
    tip_x = cx + 18 * s
    d.polygon([(cx, cy - 8 * s), (tip_x, cy), (cx, cy + 8 * s)], fill=(212, 212, 212))

    # --- Fletching ---
    fl_x = bow_x + 8 * s
    d.polygon([(fl_x, cy - 4 * s), (fl_x + 12 * s, cy), (fl_x, cy + 4 * s), (fl_x - 6 * s, cy)], fill=(224, 80, 80))

    return img


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)

    # Save the largest image; Pillow will embed all requested sizes by
    # downscaling from it.  We pass the desired sizes explicitly.
    largest = draw_icon(256)
    largest.save(
        OUT,
        format="ICO",
        sizes=[(s, s) for s in SIZES],
    )
    print(f"Saved {OUT}  ({os.path.getsize(OUT) / 1024:.1f} KB, {len(SIZES)} sizes)")

    # Also save a PNG preview for easy viewing
    png_path = OUT.replace(".ico", ".png")
    draw_icon(512).save(png_path)
    print(f"Saved {png_path} (preview)")


if __name__ == "__main__":
    main()
