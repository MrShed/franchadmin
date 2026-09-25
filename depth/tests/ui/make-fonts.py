#!/usr/bin/env python3
"""Downloads the OFL fonts used by Depth from Google Fonts, subsets them to Latin
and prints one <style id="dx-fonts"> block with the fonts inlined as base64 woff2.
Used once to produce the first lines of src/00-head.html (no network at runtime).
usage: python3 tests/ui/make-fonts.py > /tmp/fonts.html"""
import base64, io, re, subprocess, sys, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
Q = ('https://fonts.googleapis.com/css2?family=Big+Shoulders+Stencil+Display:wght@500..900&family=JetBrains+Mono:wght@400..700'
     '&family=Courier+Prime:wght@400;700&family=Caveat:wght@400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..600&display=swap')
NAMES = {'Big Shoulders Stencil Display': 'DX Stencil', 'JetBrains Mono': 'DX Mono', 'Courier Prime': 'DX Type', 'Caveat': 'DX Hand', 'Source Serif 4': 'DX Serif'}
TEXT = ''.join(chr(c) for c in range(0x20, 0x7f)) + ''.join(chr(c) for c in range(0xa0, 0x180)) + '‘’“”–—…•·′″°±×÷←→↑↓✓✗№€′‹›«»'
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA})).read()
css = get(Q).decode()
out = ['<style id="dx-fonts">', '/* fonts (SIL OFL): Big Shoulders Stencil Display, JetBrains Mono, Courier Prime, Caveat, Source Serif 4; Latin subset */']
for sub, b in re.findall(r"/\* (\S+) \*/\s*@font-face \{(.*?)\}", css, re.S):
    if sub != 'latin': continue
    fam = re.search(r"font-family: '([^']+)'", b).group(1)
    st = re.search(r"font-style: (\w+)", b).group(1)
    w = re.search(r"font-weight: ([\d ]+);", b).group(1).strip()
    url = re.search(r"url\((.*?)\)", b).group(1)
    f = TTFont(io.BytesIO(get(url)))
    if 'fvar' in f:
        from fontTools.varLib import instancer
        ax = {a.axisTag: a for a in f['fvar'].axes}
        pins = {}
        if 'opsz' in ax: pins['opsz'] = 14
        if fam == 'Source Serif 4': pins['wght'] = (400, 600)
        if fam == 'Caveat': pins['wght'] = 600
        if pins:
            f = instancer.instantiateVariableFont(f, pins); tmp = io.BytesIO(); f.save(tmp); f = TTFont(io.BytesIO(tmp.getvalue()))
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = []; opt.notdef_outline = True
    s = subset.Subsetter(opt); s.populate(text=TEXT); s.subset(f)
    bio = io.BytesIO(); f.flavor = 'woff2'; f.save(bio)
    b64 = base64.b64encode(bio.getvalue()).decode()
    out.append('@font-face{font-family:"%s";font-style:%s;font-weight:%s;font-display:block;src:url(data:font/woff2;base64,%s) format("woff2")}' % (NAMES[fam], st, w, b64))
    sys.stderr.write('%s %s %s %d bytes\n' % (fam, st, w, len(bio.getvalue())))
out.append('</style>')
print('\n'.join(out))
