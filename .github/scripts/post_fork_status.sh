#!/usr/bin/env bash
# Post a commit status on ahuai6/Sub-Store-Fork.
# A 401, 403, or 404 means the token cannot write statuses. That is reported
# and does not fail the caller: verification still stands on this Actions run.
# The token and the response body are not printed.
#
# Usage: post_fork_status.sh <state> <description>
# Env:   FORK_REPO_TOKEN, SOURCE_SHA, TARGET_URL
#        FORK_REPO (default ahuai6/Sub-Store-Fork)

set -euo pipefail

state=${1:?state required}
description=${2:?description required}
repo=${FORK_REPO:-ahuai6/Sub-Store-Fork}

case "$state" in
  pending|success|failure|error) ;;
  *)
    echo "::error::Unsupported commit status state."
    exit 1
    ;;
esac
if [[ ! "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::SOURCE_SHA is not a 40-character hex commit."
  exit 1
fi
if [[ ${#description} -gt 140 ]]; then
  echo "::error::Commit status description is longer than 140 characters."
  exit 1
fi

body=$(python3 -c 'import json,sys; print(json.dumps({"state":sys.argv[1],"context":"Sub-Store-Fork-Dist/verify","description":sys.argv[2],"target_url":sys.argv[3]}))' \
  "$state" "$description" "$TARGET_URL")

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
code=$(curl -sS -o "$tmp" -w '%{http_code}' \
  -X POST \
  -H "Authorization: Bearer ${FORK_REPO_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${repo}/statuses/${SOURCE_SHA}" \
  --data "$body" || true)

case "$code" in
  201)
    echo "Posted ${state} status Sub-Store-Fork-Dist/verify on ${SOURCE_SHA}."
    ;;
  401|403|404)
    echo "::warning::Commit status was not posted (HTTP ${code}). FORK_REPO_TOKEN needs Commit statuses: Read and write on ${repo}. The verification result is still this Actions run."
    ;;
  *)
    echo "::error::Commit status API returned HTTP ${code}."
    exit 1
    ;;
esac
