#!/usr/bin/env bash
# Design-system guard: fails if raw palette colors / hex / dark: variants leak into TSX.
# Usage: ./scripts/audit-colors.sh   (run from repo root)
cd "$(dirname "$0")/../client/src" || exit 1

PATTERN='\b(bg|text|border(-[lrtb])?|ring|from|to|via|divide|fill|stroke|shadow)-(red|rose|pink|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|slate|gray|zinc|neutral|stone)-[0-9]{2,3}|\b(bg|text|border)-\[#[0-9a-fA-F]{3,8}\]|\bdark:|\brounded-(\[[0-9]+px\]|sm|md|lg|xl|2xl|3xl)([^a-zA-Z0-9_-]|$)|\bshadow-(xs|sm|md|lg|xl|2xl)\b'

hits=$(grep -rnE "$PATTERN" --include=*.tsx . )
if [ -n "$hits" ]; then
  echo "$hits"
  echo; echo "✖ $(echo "$hits" | wc -l) design-token violations. See .agents/skills/design-system/SKILL.md"
  exit 1
fi
echo "✔ 0 violations — all colors come from design tokens."
