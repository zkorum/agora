#!/usr/bin/env python3
"""Generate OG image for Taraaz site."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
import math
import os

W, H = 1200, 630
bg_color = (245, 243, 239)       # Light warm cream like jomhoor.org
text_color = (30, 42, 74)        # Dark navy
subtitle_color = (120, 120, 120) # Gray
# Jomhoor sun color: #F59E0B = rgb(245, 158, 11)
sun_color = (245, 158, 11)

img = Image.new('RGB', (W, H), bg_color)
draw = ImageDraw.Draw(img)

FONTS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'jomhoor-wallet', 'assets', 'fonts')
parastoo_bold = os.path.abspath(os.path.join(FONTS_DIR, 'Parastoo-Bold.ttf'))
parastoo_regular = os.path.abspath(os.path.join(FONTS_DIR, 'Parastoo-Regular.ttf'))

title_font = ImageFont.truetype(parastoo_bold, 108)
symbol_font = ImageFont.truetype('/System/Library/Fonts/Apple Symbols.ttf', 108)
subtitle_font = ImageFont.truetype(parastoo_regular, 32)

# Title: "Tar" + ⚖ + "z" + gap + farsi (⚖ drawn with symbol font)
part_tar = "Tar"
part_z = "z"
symbol = "\u2696"
farsi_title = get_display(arabic_reshaper.reshape("\u062a\u0631\u0627\u0632"))

tar_bbox = draw.textbbox((0, 0), part_tar, font=title_font)
tar_w = tar_bbox[2] - tar_bbox[0]
sym_bbox = draw.textbbox((0, 0), symbol, font=symbol_font)
sym_w = sym_bbox[2] - sym_bbox[0]
z_bbox = draw.textbbox((0, 0), part_z, font=title_font)
z_w = z_bbox[2] - z_bbox[0]
farsi_bbox = draw.textbbox((0, 0), farsi_title, font=title_font)
farsi_w = farsi_bbox[2] - farsi_bbox[0]

sym_pad = 12
sep = "|"
sep_bbox = draw.textbbox((0, 0), sep, font=title_font)
sep_w = 3  # thin line (1/3 of font glyph width)
sep_h = sep_bbox[3] - sep_bbox[1]
sep_pad = 24
latin_total = tar_w + sym_pad + sym_w + sym_pad + z_w
total_w = latin_total + sep_pad + sep_w + sep_pad + farsi_w
start_x = (W - total_w) // 2
y_title = H // 2 - 80

x = start_x
draw.text((x, y_title), part_tar, fill=text_color, font=title_font)
x += tar_w + sym_pad
# Vertically center the symbol relative to title text
tar_top = tar_bbox[1]
tar_h = tar_bbox[3] - tar_bbox[1]
sym_top = sym_bbox[1]
sym_h = sym_bbox[3] - sym_bbox[1]
sym_y = y_title + tar_top + (tar_h - sym_h) // 2 - sym_top
draw.text((x, sym_y), symbol, fill=text_color, font=symbol_font)
x += sym_w + sym_pad
draw.text((x, y_title), part_z, fill=text_color, font=title_font)
x += z_w + sep_pad
# Draw thin separator line
sep_top = y_title + sep_bbox[1]
draw.rectangle([(x, sep_top), (x + sep_w, sep_top + sep_h)], fill=text_color)
x += sep_w + sep_pad
draw.text((x, y_title), farsi_title, fill=text_color, font=title_font)

# Subtitle
subtitle = get_display(arabic_reshaper.reshape("\u06af\u0631\u062f\u0647\u0645\u0627\u06cc\u06cc \u062c\u0645\u0647\u0648\u0631 \u0628\u0631\u0627\u06cc \u062a\u0635\u0645\u06cc\u0645\u200c\u0633\u0627\u0632\u06cc"))
sub_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
sub_w = sub_bbox[2] - sub_bbox[0]
draw.text(((W - sub_w) // 2, y_title + 170), subtitle, fill=subtitle_color, font=subtitle_font)

# Sun with warm glow (matches jomhoor.org nav__logo-dot #F59E0B with glow)
# Position: top-right corner, partially off-screen like the jomhoor site
cx, cy = W - 120, 60
sun_radius = 40

# Create glow on a separate RGBA layer for proper alpha blending
glow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)

# Multi-ring soft glow (simulates CSS drop-shadow + text-shadow)
glow_rings = [
    (140, 8),   # outermost — very faint, large
    (110, 15),  # mid-outer
    (80, 30),   # mid
    (60, 50),   # inner glow
]
for glow_r, glow_alpha in glow_rings:
    glow_draw.ellipse(
        [cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r],
        fill=(sun_color[0], sun_color[1], sun_color[2], glow_alpha)
    )

# Blur the glow layer for softness
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=30))

# Composite glow onto main image
img_rgba = img.convert('RGBA')
img_rgba = Image.alpha_composite(img_rgba, glow_layer)

# Draw solid sun circle on top
sun_draw = ImageDraw.Draw(img_rgba)
sun_draw.ellipse(
    [cx - sun_radius, cy - sun_radius, cx + sun_radius, cy + sun_radius],
    fill=(sun_color[0], sun_color[1], sun_color[2], 255)
)

# Convert back to RGB
img = img_rgba.convert('RGB')

out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'og-image.png')
out_path = os.path.abspath(out_path)
img.save(out_path, 'PNG')
print(f'Saved: {out_path} ({os.path.getsize(out_path)} bytes)')
