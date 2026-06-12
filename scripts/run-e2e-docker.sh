#!/usr/bin/env bash
# Explicit Docker entrypoint — same as run-e2e-smoke.sh when system php < 8.4.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT}/scripts/run-e2e-smoke.sh" "$@"
