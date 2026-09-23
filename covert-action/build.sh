#!/bin/sh
# Concatenates src/ into one self-contained HTML file.
cd "$(dirname "$0")" && cat src/00-head.html src/*.js src/99-tail.html > ../showcase/covert-action.html && echo "built showcase/covert-action.html ($(wc -c < ../showcase/covert-action.html) bytes)"
