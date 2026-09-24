#!/bin/sh
# Concatenates src/ into one self-contained HTML file.
cd "$(dirname "$0")" && cat src/00-head.html src/*.js src/99-tail.html > ../showcase/index-case.html && echo "built showcase/index-case.html ($(wc -c < ../showcase/index-case.html) bytes)"
