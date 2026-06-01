#!/usr/bin/env bash
# Wait until the GitHub Actions "Tests" workflow succeeds for the current HEAD commit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

GITHUB_REPO="${GITHUB_REPO:-flotory/web}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
WORKFLOW_NAME="${GITHUB_WORKFLOW_NAME:-Tests}"
MAX_WAIT_SECONDS="${CI_WAIT_SECONDS:-900}"
POLL_SECONDS="${CI_POLL_SECONDS:-15}"

SHA="$(git rev-parse HEAD)"
STARTED_AT=$(date +%s)

if [[ -z "${GITHUB_TOKEN}" ]]; then
  echo "ERROR: GITHUB_TOKEN is required to verify GitHub Actions on a private repo."
  echo "Add a fine-grained or classic token with repo:status (or Actions read) to deploy/config.sh:"
  echo "  GITHUB_TOKEN=\"ghp_...\""
  exit 1
fi

api() {
  curl -fsS \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$@"
}

echo "==> Waiting for GitHub Actions (${WORKFLOW_NAME}) on ${SHA:0:7}..."

while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - STARTED_AT))
  if (( ELAPSED > MAX_WAIT_SECONDS )); then
    echo "ERROR: Timed out after ${MAX_WAIT_SECONDS}s waiting for CI."
    exit 1
  fi

  RUN_JSON="$(api "https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/tests.yml/runs?head_sha=${SHA}&per_page=1")"
  RUN_ID="$(echo "${RUN_JSON}" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["workflow_runs"][0]["id"] ?? "";')"
  STATUS="$(echo "${RUN_JSON}" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["workflow_runs"][0]["status"] ?? "";')"
  CONCLUSION="$(echo "${RUN_JSON}" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["workflow_runs"][0]["conclusion"] ?? "";')"
  HTML_URL="$(echo "${RUN_JSON}" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["workflow_runs"][0]["html_url"] ?? "";')"

  if [[ -z "${RUN_ID}" ]]; then
    echo "… no workflow run yet (${ELAPSED}s)"
  elif [[ "${STATUS}" == "completed" ]]; then
    if [[ "${CONCLUSION}" == "success" ]]; then
      echo "==> GitHub CI passed: ${HTML_URL}"
      exit 0
    fi
    echo "ERROR: GitHub CI finished with conclusion: ${CONCLUSION}"
    echo "       ${HTML_URL}"
    exit 1
  else
    echo "… ${STATUS} (${ELAPSED}s) ${HTML_URL}"
  fi

  sleep "${POLL_SECONDS}"
done
