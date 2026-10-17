#!/usr/bin/env bash
# Dependabot のコミット本文から、自動マージしてよいか決める。
# stdin: コミット本文（複数可）
# exit 0: minor / patch のみ
# exit 1: major がある、または判定できない
set -euo pipefail

bodies=$(cat)

if [[ "$bodies" == *"update-type: version-update:semver-major"* ]]; then
  echo "skip: semver-major"
  exit 1
fi

if [[ "$bodies" == *"update-type: version-update:semver-minor"* ]] ||
  [[ "$bodies" == *"update-type: version-update:semver-patch"* ]]; then
  echo "merge: minor or patch"
  exit 0
fi

echo "skip: update-type がない"
exit 1
