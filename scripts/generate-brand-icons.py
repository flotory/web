#!/usr/bin/env python3
"""Generate Flotory brand icons from the master logo PNG."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public' / 'icons' / 'flotory-icon-source.png'
CURSOR_SOURCE = Path(
    '/Users/narek1/.cursor/projects/Users-narek1-Desktop-Loyalty-App/assets/'
    '0d056a40e7bc9592d371b30d2365d52442adcd83f1cc23e0ec1cd1f5616923fb-'
    '9575697b-cd82-4681-8d47-624d944bc20a.png'
)

NAVY = (8, 18, 51, 255)
CREAM = (247, 242, 232, 255)
WHITE = (255, 255, 255, 255)

WEB_ICONS = ROOT / 'public' / 'icons'
MOBILE_ASSETS = ROOT / 'apps' / 'mobile' / 'assets'
PUBLIC_FAVICON = ROOT / 'public' / 'favicon.png'

# How much larger the F mark sits inside each canvas (1.60 = 60% bigger)
MARK_SCALE = 1.60


def scale_padding(padding_ratio: float) -> float:
    inner = 1 - padding_ratio * 2
    new_inner = min(inner * MARK_SCALE, 0.94)
    return max((1 - new_inner) / 2, 0.015)


def trim_transparent(image: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    bbox = rgba.getbbox()
    if bbox:
        return rgba.crop(bbox)
    return rgba


def prepare_mark(source: Image.Image) -> Image.Image:
    return trim_transparent(strip_near_black(source))


def strip_near_black(image: Image.Image, threshold: int = 58) -> Image.Image:
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def fit_mark(mark: Image.Image, canvas: int, padding_ratio: float = 0.14) -> Image.Image:
    inner = int(round(canvas * (1 - scale_padding(padding_ratio) * 2)))
    fitted = ImageOps.contain(mark, (inner, inner), Image.Resampling.LANCZOS)
    canvas_img = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    offset = ((canvas - fitted.width) // 2, (canvas - fitted.height) // 2)
    canvas_img.paste(fitted, offset, fitted)
    return canvas_img


def on_background(mark: Image.Image, canvas: int, background: tuple[int, int, int, int], padding_ratio: float = 0.14) -> Image.Image:
    base = Image.new('RGBA', (canvas, canvas), background)
    overlay = fit_mark(mark, canvas, padding_ratio)
    base.alpha_composite(overlay)
    return base


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    image.save(path, format='PNG', optimize=True)


def monochrome_mark(mark: Image.Image, canvas: int) -> Image.Image:
    fitted = fit_mark(mark, canvas, padding_ratio=0.16)
    alpha = fitted.getchannel('A')
    mono = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    white = Image.new('RGBA', (canvas, canvas), WHITE)
    mono.paste(white, (0, 0), alpha)
    return mono


def main() -> int:
    source_path = SOURCE if SOURCE.exists() else CURSOR_SOURCE
    if not source_path.exists():
        print(f'Missing source logo: {SOURCE}', file=sys.stderr)
        return 1

    source = Image.open(source_path)
    mark = prepare_mark(source)

    # Keep master source in repo
    save_png(source.convert('RGBA'), WEB_ICONS / 'flotory-icon-source.png')

    web_sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-48.png': 48,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }

    for name, size in web_sizes.items():
        # Web logo tiles need more breathing room in the dashboard sidebar.
        icon = on_background(mark, size, NAVY, padding_ratio=0.28)
        save_png(icon, WEB_ICONS / name)

    save_png(on_background(mark, 32, NAVY, padding_ratio=0.28), PUBLIC_FAVICON)

    # Mobile — use the same breathing room as dashboard/web tiles.
    save_png(fit_mark(mark, 1024, padding_ratio=0.28), MOBILE_ASSETS / 'flotory-gold-icon.png')
    save_png(fit_mark(mark, 640, padding_ratio=0.28), MOBILE_ASSETS / 'brand-mark-v160.png')

    # Native splash: cream + gold F baked into one image.
    save_png(on_background(mark, 1024, CREAM, padding_ratio=0.28), MOBILE_ASSETS / 'flotory-boot-splash.png')

    # Expo app icon (1024)
    app_icon = on_background(mark, 1024, NAVY, padding_ratio=0.28)
    save_png(app_icon, MOBILE_ASSETS / 'flotory-app-icon-padded.png')
    save_png(app_icon, MOBILE_ASSETS / 'flotory-app-icon.png')
    save_png(app_icon, MOBILE_ASSETS / 'icon.png')

    save_png(on_background(mark, 48, NAVY, padding_ratio=0.28), MOBILE_ASSETS / 'favicon.png')

    # Android adaptive layers
    save_png(fit_mark(mark, 432, padding_ratio=0.28), MOBILE_ASSETS / 'android-icon-foreground.png')
    save_png(Image.new('RGBA', (432, 432), NAVY), MOBILE_ASSETS / 'android-icon-background.png')
    save_png(monochrome_mark(mark, 432), MOBILE_ASSETS / 'android-icon-monochrome.png')

    print('Generated brand icons:')
    print(f'  Web: {WEB_ICONS}')
    print(f'  Mobile: {MOBILE_ASSETS}')
    print(f'  Favicon: {PUBLIC_FAVICON}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
