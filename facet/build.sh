#!/bin/sh
# Assembles the film page: fonts + shell + film.js -> facet/facet-film.html
cd "$(dirname "$0")" && python3 - <<'PY'
s = open('shell.html').read()
s = s.replace('@@FONTS@@', open('fonts.html').read()).replace('@@FILM@@', open('film.js').read())
open('facet-film.html', 'w').write(s)
print('built facet/facet-film.html (%d bytes)' % len(s))
PY
