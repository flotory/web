#!/usr/bin/env bash
# Pad an iPhone screenshot onto a 13-inch iPad canvas (no stretch).
# Usage: ./ipad-13-pad-screenshot.sh ~/Downloads/IMG_1103.png
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 path/to/iphone-screenshot.png [output.png]"
  exit 1
fi

SRC="$1"
OUT="${2:-$(dirname "$0")/ready-ipad-13/$(basename "${1%.png}")-ipad-13.png}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$(dirname "$OUT")"

# 13-inch iPad Pro portrait (App Store Connect)
IPAD_W=2064
IPAD_H=2752
BG="#FCFAF6"

(cd "${SCRIPT_DIR}" && node --input-type=module <<EOF
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

mkdirSync(dirname('${OUT}'), { recursive: true });

const meta = await sharp('${SRC}').metadata();
const scale = Math.min(${IPAD_W} / meta.width, ${IPAD_H} / meta.height);
const w = Math.round(meta.width * scale);
const h = Math.round(meta.height * scale);
const left = Math.round((${IPAD_W} - w) / 2);
const top = Math.round((${IPAD_H} - h) / 2);

await sharp('${SRC}')
  .resize(w, h, { fit: 'inside' })
  .extend({
    top,
    bottom: ${IPAD_H} - top - h,
    left,
    right: ${IPAD_W} - left - w,
    background: '${BG}',
  })
  .png()
  .toFile('${OUT}');

console.log('Wrote ${OUT} (${IPAD_W}×${IPAD_H}, centered, no stretch)');
EOF
)
