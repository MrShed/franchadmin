#!/usr/bin/env python3
"""Fetches the OFL fonts for the Facet film from Google Fonts, subsets them to Latin and prints
a <style> block with them inlined as base64 woff2 (the film needs no network at runtime).
usage: python3 facet/make-fonts.py > /tmp/facet-fonts.html"""
import base64, io, re, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
Q = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@96,500;96,700;96,800&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
TEXT = ''.join(chr(c) for c in range(0x20, 0x7f)) + '‘’“”–—…•·→←↔✓'
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA})).read()
css = get(Q).decode()
out = ['<style id="fonts">']
for sub, b in re.findall(r"/\* (\S+) \*/\s*@font-face \{(.*?)\}", css, re.S):
    if sub != 'latin': continue
    fam = re.search(r"font-family: '([^']+)'", b).group(1)
    w = re.search(r"font-weight: ([\d ]+);", b).group(1).strip()
    f = TTFont(io.BytesIO(get(re.search(r"url\((.*?)\)", b).group(1))))
    if 'fvar' in f:
        from fontTools.varLib import instancer
        ax = {a.axisTag for a in f['fvar'].axes}
        pins = {}
        if 'opsz' in ax: pins['opsz'] = 96
        if 'wdth' in ax: pins['wdth'] = 100
        if 'wght' in ax: pins['wght'] = int(w.split()[0])
        f = instancer.instantiateVariableFont(f, pins); tmp = io.BytesIO(); f.save(tmp); f = TTFont(io.BytesIO(tmp.getvalue()))
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = []
    s = subset.Subsetter(opt); s.populate(text=TEXT); s.subset(f)
    bio = io.BytesIO(); f.flavor = 'woff2'; f.save(bio)
    out.append('@font-face{font-family:"%s";font-weight:%s;font-display:block;src:url(data:font/woff2;base64,%s) format("woff2")}' % (fam, w.split()[0], base64.b64encode(bio.getvalue()).decode()))
out.append('</style>')
print('\n'.join(out))
