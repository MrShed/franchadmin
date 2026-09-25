#!/bin/sh
# Concatenates src/ into one self-contained HTML file.
cd "$(dirname "$0")" && cat src/00-head.html src/*.js src/99-tail.html > ../showcase/depth.html && echo "built showcase/depth.html ($(wc -c < ../showcase/depth.html) bytes)"
