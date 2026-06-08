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
    '4c1dc51e929d13beccdb973033da9a190e432d93bf6cd0c777d2b1ceea9a95a0-'
    '79bc3b73-7051-4f74-8bee-cf139d115603.png'
)

NAVY = (5, 13, 30, 255)
WHITE = (255, 255, 255, 255)

WEB_ICONS = ROOT / 'public' / 'icons'
MOBILE_ASSETS = ROOT / 'apps' / 'mobile' / 'assets'
PUBLIC_FAVICON = ROOT / 'public' / 'favicon.png'


def trim_transparent(image: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    bbox = rgba.getbbox()
    if bbox:
        return rgba.crop(bbox)
    return rgba


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


def prepare_mark(source: Image.Image) -> Image.Image:
    return trim_transparent(strip_near_black(source))


def is_finalized_app_icon(source: Image.Image) -> bool:
    return source.width == source.height and source.width >= 512


def resize_master(source: Image.Image, size: int) -> Image.Image:
    rgba = source.convert('RGBA')
    if rgba.width == size and rgba.height == size:
        return rgba
    return rgba.resize((size, size), Image.Resampling.LANCZOS)


def fit_mark(mark: Image.Image, canvas: int, padding_ratio: float = 0.14) -> Image.Image:
    inner = int(round(canvas * (1 - padding_ratio * 2)))
    fitted = ImageOps.contain(mark, (inner, inner), Image.Resampling.LANCZOS)
    canvas_img = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    offset = ((canvas - fitted.width) // 2, (canvas - fitted.height) // 2)
    canvas_img.paste(fitted, offset, fitted)
    return canvas_img


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


def generate_from_master(source: Image.Image) -> None:
    save_png(source, WEB_ICONS / 'flotory-icon-source.png')

    web_sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-48.png': 48,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }

    for name, size in web_sizes.items():
        save_png(resize_master(source, size), WEB_ICONS / name)

    save_png(resize_master(source, 32), PUBLIC_FAVICON)

    app_icon = resize_master(source, 1024)
    mark = prepare_mark(source)

    save_png(app_icon, MOBILE_ASSETS / 'flotory-app-icon-padded.png')
    save_png(app_icon, MOBILE_ASSETS / 'flotory-app-icon.png')
    save_png(app_icon, MOBILE_ASSETS / 'icon.png')
    save_png(app_icon, MOBILE_ASSETS / 'flotory-boot-splash.png')
    save_png(resize_master(source, 1024), MOBILE_ASSETS / 'flotory-gold-icon.png')
    save_png(resize_master(source, 640), MOBILE_ASSETS / 'brand-mark-v160.png')
    save_png(resize_master(source, 48), MOBILE_ASSETS / 'favicon.png')

    save_png(fit_mark(mark, 432, padding_ratio=0.18), MOBILE_ASSETS / 'android-icon-foreground.png')
    save_png(Image.new('RGBA', (432, 432), NAVY), MOBILE_ASSETS / 'android-icon-background.png')
    save_png(monochrome_mark(mark, 432), MOBILE_ASSETS / 'android-icon-monochrome.png')


def main() -> int:
    source_path = SOURCE if SOURCE.exists() else CURSOR_SOURCE
    if not source_path.exists():
        print(f'Missing source logo: {SOURCE}', file=sys.stderr)
        return 1

    source = Image.open(source_path).convert('RGBA')

    if not is_finalized_app_icon(source):
        print(f'Source must be a square PNG >= 512px, got {source.width}x{source.height}', file=sys.stderr)
        return 1

    print('Using finalized app-icon source (direct resize).')
    generate_from_master(source)

    print('Generated brand icons:')
    print(f'  Web: {WEB_ICONS}')
    print(f'  Mobile: {MOBILE_ASSETS}')
    print(f'  Favicon: {PUBLIC_FAVICON}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
