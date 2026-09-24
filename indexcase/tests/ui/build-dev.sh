#!/bin/sh
# Dev build of the interface: engine files present in src/ (01..09) plus the UI
# mock (tests/ui/mock-engine.js), which only fills in the game API while the
# engine does not provide IX.newGame yet. MOCK=1 forces the mock game.
# Output: $1 (default /tmp/index-case-dev.html)
cd "$(dirname "$0")/../.." || exit 1
OUT=${1:-/tmp/index-case-dev.html}
{ cat src/00-head.html; cat src/0[1-9]-*.js 2>/dev/null; [ -n "$MOCK" ] && echo "IX._mockWanted=true;"; cat tests/ui/mock-engine.js src/[12][0-9]-*.js src/99-tail.html; } > "$OUT" && echo "built $OUT ($(wc -c < "$OUT") bytes)"
