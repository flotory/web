#!/usr/bin/env bash
# Resize iPhone screenshots to App Store Connect 6.5" Display (1284 × 2778).
# Usage: ./resize-for-app-store.sh ~/Desktop/flotory-screenshots/*.png
set -euo pipefail

TARGET_W=1284
TARGET_H=2778
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/ready-6.5"

mkdir -p "$OUT_DIR"

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 path/to/screenshot1.png [screenshot2.png ...]"
  echo "Output: $OUT_DIR"
  exit 1
fi

index=1
for src in "$@"; do
  if [[ ! -f "$src" ]]; then
    echo "Skip (not a file): $src"
    continue
  fi

  width=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  height=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')
  base=$(basename "$src")
  dest="$OUT_DIR/$(printf '%02d' "$index")-${base%.png}-1284x2778.png"

  echo "→ $base (${width}×${height}) → $(basename "$dest")"

  if [[ "$width" -lt 1000 ]]; then
    echo "  WARNING: image looks like a thumbnail. AirDrop the full photo from iPhone Photos."
  fi

  # Scale to cover 1284×2778, then center-crop (keeps sharpness vs stretching).
  sips -z "$TARGET_H" "$TARGET_W" "$src" --out "$dest" >/dev/null

  index=$((index + 1))
done

echo ""
echo "Done. Upload files from:"
echo "  $OUT_DIR"
echo "to App Store Connect → iOS 1.0 → 6.5\" Display"
