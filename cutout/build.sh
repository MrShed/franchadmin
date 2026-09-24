#!/bin/sh
# Concatenates src/ into one self-contained HTML file.
cd "$(dirname "$0")" && cat src/00-head.html src/*.js src/99-tail.html > ../showcase/cutout.html && echo "built showcase/cutout.html ($(wc -c < ../showcase/cutout.html) bytes)"
