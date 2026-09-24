/* CUTOUT UI — 12-docs.js
 * Renders an engine document ({style, kind, title, from, body:[{k, x:[seg]}]})
 * as 1989 paperwork. Works only from the body lines the engine produced, so
 * every token the engine emitted stays tappable (.tk[data-t][data-v]).
 */
var UIDoc = (function () {
  'use strict';
  var D = {};
  var hlSet = {};
  D.setHighlights = function (h) { hlSet = h || {}; };

  // ---------------------------------------------------------------- segments
  function tokHTML(t) {
    var k = t.t + ':' + t.v;
    return '<span class="tk' + (hlSet[k] ? ' hl' : '') + '" data-t="' + UIesc(t.t) + '" data-v="' + UIesc(t.v) + '" role="button" tabindex="0">' + UIesc(t.d || t.v) + '</span>';
  }
  function segs(x, upper) {
    return (x || []).map(function (s) {
      if (typeof s === 'string') return UIesc(upper ? s.toUpperCase() : s);
      if (s && typeof s === 'object') return tokHTML(upper ? { t: s.t, v: s.v, d: String(s.d || s.v).toUpperCase() } : s);
      return '';
    }).join('');
  }
  D.segs = segs;
  function plain(x) { return (x || []).map(function (s) { return typeof s === 'string' ? s : (s.d || s.v); }).join(''); }
  D.plain = plain;
  /** split a line into cells at runs of 2+ spaces inside text segments */
  function cells(x) {
    var out = [[]], merged = [];
    (x || []).forEach(function (s) {
      if (typeof s === 'string' && typeof merged[merged.length - 1] === 'string') merged[merged.length - 1] += s; else merged.push(s);
    });
    merged.forEach(function (s) {
      if (typeof s !== 'string') { out[out.length - 1].push(s); return; }
      var parts = s.split(/\s{2,}/);
      parts.forEach(function (p, i) {
        if (i > 0) out.push([]);
        if (p) out[out.length - 1].push(p);
      });
    });
    return out.filter(function (c) { return c.length && plain(c).trim() !== ''; });
  }
  /** "Label: value" fields from a cell */
  function field(c) {
    if (typeof c[0] === 'string') {
      var m = /^\s*([A-Z][A-Za-z .\/()'-]{0,38}?):\s*(.*)$/.exec(c[0]);
      if (m) { var rest = c.slice(1); if (m[2]) rest.unshift(m[2]); return { label: m[1], val: rest }; }
      var r = /^\s*(Room|Rm)\s+(.+)$/.exec(c[0]);
      if (r && c.length === 1) return { label: r[1], val: [r[2]] };
    }
    return null;
  }
  function group(body) {
    // records: each 'h' starts a group; lines before the first h form group 0
    var g = [], cur = { h: null, lines: [] };
    body.forEach(function (l) {
      if (l.k === 'h') { if (cur.h || cur.lines.length) g.push(cur); cur = { h: l, lines: [] }; }
      else cur.lines.push(l);
    });
    if (cur.h || cur.lines.length) g.push(cur);
    return g;
  }
  function stamps(doc) {
    var out = '';
    var s = doc.body.filter(function (l) { return l.k === 's'; });
    s.forEach(function (l, i) { out += '<div class="stamp" style="right:' + (14 + i * 8) + 'px;top:' + (14 + i * 46) + 'px">' + segs(l.x) + '</div>'; });
    if (!s.length && doc.kind === 'query' && doc.recs && doc.recs.length === 0) out += '<div class="stamp" style="right:16px;top:14px;transform:rotate(-6deg)">No trace</div>';
    return out;
  }
  function rot(doc, amt) { return 'transform:rotate(' + (UIjit(doc.id) * (amt || 0.35)).toFixed(2) + 'deg)'; }
  function foot(doc, extra) {
    return '<div class="docfoot"><span>' + UIesc(doc.id) + (doc.query ? ' · request ' + UIesc(UISYSABBR[doc.sys] || '') + '/' + (UIh(doc.id) % 900 + 100) : '') + '</span><span>' + (extra || ('Recd. ' + UIesc(UIA.dateLabel(doc.day)) + ' ' + UIesc(doc.time || ''))) + '</span></div>';
  }
  function crest() {
    return '<svg class="crest" viewBox="0 0 34 40" fill="none" stroke="#3c352a" stroke-width="1.3"><path d="M17 2l13 5v12c0 9-6 15-13 19C10 34 4 28 4 19V7z"/><path d="M17 9v22M10 15h14M11 23c3 2 9 2 12 0"/></svg>';
  }
  function hand(x) { return '<p class="hand" style="font-size:17px;line-height:1.35;margin:8px 0 0;transform:rotate(-.6deg)">' + segs(x) + '</p>'; }

  // ---------------------------------------------------------------- field-ish lines
  function formLines(lines, opts) {
    opts = opts || {};
    var html = '', grid = [], table = null;
    function flushGrid() {
      if (!grid.length) return;
      html += '<div class="fgrid typed">' + grid.map(function (f) {
        var wide = f.wide || plain(f.val).length > 22;
        return '<div' + (wide ? ' class="w2"' : '') + '>' + (f.label ? '<span class="plbl">' + UIesc(f.label) + '</span>' : '') + '<span class="fv">' + segs(f.val) + '</span></div>';
      }).join('') + '</div>';
      grid = [];
    }
    function flushTable() { if (table) { html += '<table class="calls typed"><tbody>' + table.join('') + '</tbody></table>'; table = null; } }
    lines.forEach(function (l) {
      if (l.k === 's') return;
      if (l.k === 'n') { flushGrid(); flushTable(); html += hand(l.x); return; }
      if (l.k === 'p') { flushGrid(); flushTable(); html += '<p class="typed" style="margin:8px 0">' + segs(l.x) + '</p>'; return; }
      var txt = plain(l.x);
      if (/^\s{2,}/.test(txt) && table) { table.push('<tr>' + cells(l.x).map(function (c) { return '<td>' + segs(c) + '</td>'; }).join('') + '</tr>'); return; }
      if (/:\s*$/.test(txt) && cells(l.x).length === 1) { flushGrid(); flushTable(); html += '<div class="fsec">' + UIesc(txt.replace(/:\s*$/, '')) + '</div>'; table = []; return; }
      flushTable();
      var cs = cells(l.x), fs = cs.map(field);
      if (fs[0]) { fs.forEach(function (f, i) { grid.push(f || { label: '', val: cs[i] }); }); if (fs.length === 1) grid[grid.length - 1].wide = true; }
      else { flushGrid(); html += '<p class="typed" style="margin:6px 0">' + segs(l.x) + '</p>'; }
    });
    flushGrid(); flushTable();
    return html;
  }

  // ---------------------------------------------------------------- styles
  var R = {};
  R.register = function (doc) {
    var gs = group(doc.body);
    if (!gs.some(function (g) { return g.h; })) return sheet(doc, 'd-form', '<div class="fhead">' + crest() + '<div><h4>Guest registrations</h4><h5>' + UIesc(doc.from || '') + '</h5></div></div>' + formLines(gs[0] ? gs[0].lines : []) + stamps(doc) + foot(doc));
    var night = gs.some(function (g) { return g.lines.some(function (l) { return /^Rm /.test(plain(l.x)); }); });
    if (night) return registerNight(doc, gs);
    return gs.map(function (g, i) {
      if (!g.h) return '';
      var h = plain(g.h.x);
      var parts = h.split(' — ');
      var formName = parts.slice(1).join(' — ');
      var num = (/No\. (\d+)/.exec(formName) || [])[1] || '';
      var head = '<div class="fhead">' + crest() + '<div><h4>' + segs(g.h.x.slice(0, 3)) + '</h4><h5>' + UIesc(formName.replace(/\s*No\. \d+/, '')) + '</h5></div><div class="fno">No.<br><b class="typed" style="font-size:15px">' + UIesc(num) + '</b></div></div>';
      var isResv = /reservations book/.test(h);
      return '<div class="paper d-form" style="' + rot({ id: doc.id + i }, 0.6) + '">' + head + (isResv ? '<div class="fsec">Reservation</div>' : '') + formLines(g.lines) + (i === 0 ? stamps(doc) : '') + (i === gs.length - 1 ? foot(doc) : '') + '</div>';
    }).join('');
  };
  function registerNight(doc, gs) {
    var html = '';
    gs.forEach(function (g) {
      if (!g.h) return;
      html += '<div class="fsec" style="font-size:11px;margin-top:4px">' + segs(g.h.x) + '</div>';
      g.lines.forEach(function (l) {
        if (l.k === 'n') html += hand(l.x);
        else if (l.k === 'm') html += '<div class="typed" style="border-bottom:1px solid #b9ad95;padding:5px 0;font-size:13.5px">' + segs(l.x) + '</div>';
        else if (l.k === 'p') html += '<p class="typed">' + segs(l.x) + '</p>';
      });
    });
    return sheet(doc, 'd-form', '<div class="fhead">' + crest() + '<div><h4>Hotel register — night extract</h4><h5>' + UIesc(doc.from || '') + '</h5></div></div>' + html + stamps(doc) + foot(doc));
  }
  function sheet(doc, cls, inner, style) { return '<div class="paper ' + cls + '" style="' + (style || rot(doc)) + '">' + inner + '</div>'; }

  R.telex = function (doc) {
    var n = UIh(doc.id);
    var head = '<div class="zc">ZCZC ' + ('VIE' + (n % 900 + 100)) + ' ' + (doc.kind === 'intercept' ? 'SEC' : 'PRI') + '\n' + UIesc(UIA.cs ? (UIA.cs.dmy(doc.day) + ' ' + (doc.time || '')) : '') + '\n' + UIesc((doc.from || '').toUpperCase()) + '</div>';
    var body = doc.body.map(function (l) {
      if (l.k === 's') return '';
      if (l.k === 'n') return '</div>' + hand(l.x).replace('class="hand"', 'class="hand" style="color:#555049;font-size:16px;margin:4px 0 10px"') + '<div class="telex">';
      if (l.k === 'h') return '<p><b>' + segs(l.x, true) + '</b></p>';
      return '<p>' + segs(l.x, true) + '</p>';
    }).join('');
    var cls = doc.kind === 'intercept' ? '<div style="margin-bottom:10px"><span class="classif">Secret — partner material — do not copy</span></div>' : '';
    return sheet(doc, 'd-telex', cls + '<div class="telex">' + head + body + '<p class="zc">NNNN</p></div>' + stamps(doc) + foot(doc));
  };

  R.cdr = function (doc) {
    var html = '<div class="dm"><div class="hdr">' + UIesc((doc.from || '').toUpperCase()) + '\n' + '*** ' + UIesc(doc.title.toUpperCase()) + ' ***</div><div class="rule"></div>';
    doc.body.forEach(function (l) {
      if (l.k === 's') return;
      if (l.k === 'n') { html += '</div>' + hand(l.x) + '<div class="dm">'; return; }
      var c = cells(l.x);
      var t = plain(l.x);
      if (l.k === 'm' && c.length >= 4 && (/^DATE/.test(t) || typeof l.x[0] === 'object')) {
        html += '<div class="row' + (/^DATE/.test(t) ? ' io' : '') + '">' + c.map(function (cc, i) { var tx = plain(cc).trim(); if (tx === 'DURATION') cc = ['DUR.']; if (tx === 'OTHER PARTY') cc = ['NUMBER'];
          return '<span class="' + (i === c.length - 1 ? 'rhs' : '') + (/^(OUT|IN)\b/.test(tx) ? ' io' : '') + '">' + segs(cc, true) + '</span>'; }).join('') + '</div>';
      } else html += '<div class="hdr">' + (l.k === 'h' ? '<b>' + segs(l.x, true) + '</b>' : segs(l.x, true)) + '</div>';
    });
    html += '<div class="rule"></div><div class="hdr">END OF LISTING    PAGE 1 OF 1</div></div>';
    return sheet(doc, 'd-cdr', html + stamps(doc) + foot(doc), 'transform:none');
  };

  R.bank = function (doc) {
    var from = doc.from || '';
    var bankName = from.split(',')[0];
    var initials = bankName.split(/\s+/).filter(function (w) { return /^[A-ZÀ-Ž]/.test(w); }).map(function (w) { return w.charAt(0); }).join('').slice(0, 3) || 'B';
    var html = '<div class="bank-hd"><div class="bank-logo">' + UIesc(initials) + '</div><div><h4>' + UIesc(bankName) + '</h4><small>Statement of account · extract</small></div></div>';
    html += '<div style="font:italic 12px var(--f-serif);color:#555;margin:-4px 0 10px">' + UIesc(from.split(' — ').slice(1).join(' — ')) + '</div>';
    group(doc.body).forEach(function (g) {
      if (g.h) html += '<div class="fsec" style="font-size:11px">' + segs(g.h.x) + '</div>';
      var meta = [], rows = [], other = '';
      g.lines.forEach(function (l) {
        if (l.k === 's') return;
        var t = plain(l.x), c = cells(l.x);
        if (l.k === 'n') { other += hand(l.x); return; }
        if (/^DATE/.test(t)) return;
        if (l.k === 'm' && typeof l.x[0] === 'object' && l.x[0].t === 'date') { rows.push(c); return; }
        var fs = c.map(field);
        if (l.k === 'm' && fs[0]) { fs.forEach(function (f, i) { meta.push(f || { label: '', val: c[i] }); }); return; }
        other += '<p style="margin:6px 0;font-size:13.5px">' + segs(l.x) + '</p>';
      });
      if (meta.length) html += '<div class="bank-meta">' + meta.map(function (f) { return '<div><span class="plbl">' + UIesc(f.label) + '</span>' + segs(f.val) + '</div>'; }).join('') + '</div>';
      if (rows.length) {
        html += '<table class="ledger"><thead><tr><th>Date</th><th>Particulars</th><th class="amt">Amount</th></tr></thead><tbody>' + rows.map(function (c) {
          var amt = c[1] ? plain(c[1]) : '';
          var neg = /^[−-]/.test(amt);
          var ref = c.slice(3).map(function (x) { return segs(x); }).join(' ');
          return '<tr><td>' + segs(c[0], false).replace(/\.19(\d\d)/, '.$1') + '</td><td>' + (c[2] ? segs(c[2]) : '') + (ref ? '<span class="ref">' + ref + '</span>' : '') + '</td><td class="amt ' + (neg ? 'db' : 'cr') + '">' + UIesc(amt) + '</td></tr>';
        }).join('') + '</tbody></table>';
      }
      html += other;
    });
    return sheet(doc, 'd-bank', html + stamps(doc) + foot(doc));
  };

  R.card = function (doc) {
    var gs = group(doc.body);
    if (!gs.some(function (g) { return g.h; })) return sheet(doc, 'd-card', '<div class="ch"><b>INDEX — ' + UIesc(doc.query ? String(doc.query.key.v || '').toUpperCase() : '') + '</b><span class="plbl">Registry</span></div><div class="typed">' + (gs[0] ? gs[0].lines.map(function (l) { return l.k === 'n' ? hand(l.x) : '<p style="margin:0">' + segs(l.x) + '</p>'; }).join('') : '') + '</div>' + stamps(doc) + '<div class="hole"></div>', rot(doc, 0.8));
    return gs.map(function (g, i) {
      if (!g.h) return '';
      var hx = g.h.x;
      var photo = g.lines.some(function (l) { return /Photograph on file: yes/.test(plain(l.x)); });
      var body = g.lines.filter(function (l) { return !/Photograph on file/.test(plain(l.x)); }).map(function (l) {
        if (l.k === 'n') return hand(l.x);
        return '<p style="margin:0">' + segs(l.x) + '</p>';
      }).join('');
      var ph = photo ? '<div class="photo"><svg viewBox="0 0 48 60"><circle cx="24" cy="22" r="10" fill="#6e695f"/><path d="M6 60c2-14 10-20 18-20s16 6 18 20z" fill="#6e695f"/></svg><span class="ps">Photo on file</span></div>' : '';
      var fileNo = (/CARD\s+(\S+)/.exec(plain(hx)) || [])[1] || '';
      var nameSegs = hx.filter(function (s) { return typeof s === 'object'; });
      return '<div class="paper d-card" style="' + rot({ id: doc.id + i }, 1) + '"><div class="ch"><b>' + (nameSegs.length ? segs(nameSegs) : segs(hx)) + '</b><span class="typed" style="font-size:12px">' + UIesc(fileNo) + '</span></div><div class="typed">' + ph + body + '</div>' + (i === 0 ? stamps(doc) : '') + '<div class="hole"></div></div>';
    }).join('');
  };

  R.news = function (doc) {
    var h = doc.body[0] && doc.body[0].k === 'h' ? plain(doc.body[0].x) : doc.title;
    var p = h.split(' — ');
    var mast = '<div class="mast"><h4>' + UIesc(p[0]) + '</h4><small><span>' + UIesc(p[1] || '') + '</span><span>Price 10 —</span></small></div>';
    var head = (p[2] || '').replace(/"/g, '');
    var open = false;
    var html = mast + (head ? '<div class="news-h">' + UIesc(head) + '</div>' : '') + '<div class="news-cols">';
    doc.body.slice(doc.body[0] && doc.body[0].k === 'h' ? 1 : 0).forEach(function (l) {
      if (l.k === 's') return;
      var t = plain(l.x);
      if (/^\s{2}/.test(t)) html += '<p class="sub">' + segs(l.x) + '</p>';
      else if (/^•/.test(t)) { var x = l.x.slice(); if (typeof x[0] === 'string') x[0] = x[0].replace(/^•\s*/, ''); html += (open ? '</div>' : '') + '<div style="break-inside:avoid"><p><b>■</b> ' + segs(x) + '</p>'; open = true; }
      else html += '<p>' + segs(l.x) + '</p>';
    });
    html += (open ? '</div>' : '') + '</div>';
    return sheet(doc, 'd-news', html + stamps(doc) + foot(doc));
  };

  R.note = function (doc) {
    if (doc.kind === 'informant') {
      var html = '<div class="torn"></div><div class="hand">';
      doc.body.forEach(function (l, i) {
        if (l.k === 's') return;
        html += '<p' + (l.k === 'h' ? ' style="text-decoration:underline;text-decoration-thickness:1px"' : '') + '>' + segs(l.x) + '</p>';
      });
      html += '</div>';
      return '<div class="paper d-note" style="transform:rotate(' + (UIjit(doc.id) * 1.2 - 0.3).toFixed(2) + 'deg)">' + html + stamps(doc) + foot(doc) + '</div>';
    }
    return R.report(doc, true);
  };

  R.report = function (doc, slip) {
    var hl = doc.body[0] && doc.body[0].k === 'h' ? doc.body[0] : null;
    var rest = hl ? doc.body.slice(1) : doc.body;
    var classif = doc.kind === 'statement' ? 'Secret' : doc.kind === 'consular' ? '' : 'Restricted';
    var mh = '<div class="mh"><b>' + (hl ? segs(hl.x) : UIesc(doc.title)) + '</b>' + (classif ? '<span class="classif">' + classif + '</span>' : '') + '</div>';
    var body;
    if (doc.sys === 'border') {
      body = doc.body.map(function (l) {
        if (l.k === 's') return '';
        if (l.k === 'n') return hand(l.x);
        if (l.k === 'h') return '<p style="margin:12px 0 2px"><b>' + segs(l.x, true) + '</b></p>';
        return '<p style="margin:0 0 0 1.2em">' + segs(l.x, true) + '</p>';
      }).join('');
      return sheet(doc, 'd-telex', '<div class="telex"><span class="zc">' + UIesc(('Frontier control — computer enquiry\n' + (doc.from || '')).toUpperCase()) + '</span>\n' + body + '<p class="zc">*** END ***</p></div>' + stamps(doc) + foot(doc));
    }
    body = '<div class="typed">' + formLines(rest) + '</div>';
    if (doc.kind === 'intercept') body = rest.map(function (l) { return '<p class="typed">' + segs(l.x) + '</p>'; }).join('');
    var from = doc.from && doc.kind !== 'query' ? '<div class="plbl" style="margin-bottom:8px">' + UIesc(doc.from) + '</div>' : '';
    return sheet(doc, 'd-memo' + (doc.kind === 'statement' ? ' d-statement' : ''), from + mh + body + stamps(doc) + foot(doc), slip ? 'max-width:520px;' + rot(doc, 0.8) : rot(doc));
  };

  R.form = function (doc) {
    var gs = group(doc.body);
    if (doc.sys === 'vehicles') {
      return gs.map(function (g, i) {
        if (!g.h) return sheet(doc, 'd-reg', formLines(g.lines) + stamps(doc) + foot(doc));
        var ht = plain(g.h.x);
        if (/^Rental agreement/.test(ht)) {
          var p = ht.split(' — ');
          return '<div class="paper d-rental" style="' + rot({ id: doc.id + i }, 0.8) + '"><div class="copyof">COPY 2 — FOR AUTHORITIES</div><div class="rent-hd"><h4>' + UIesc(p[1] || 'Rental') + '</h4><small>' + UIesc(p[0]) + '</small></div>' + formLines(g.lines) + (i === gs.length - 1 ? foot(doc) : '') + '</div>';
        }
        return '<div class="paper d-reg" style="' + rot({ id: doc.id + i }) + '"><div class="rh"><h4>Vehicle register</h4><small>' + UIesc(doc.from || '') + '</small></div><div class="fgrid typed"><div class="w2"><span class="plbl">Registration / vehicle</span>' + segs(g.h.x) + '</div></div>' + formLines(g.lines) + (i === 0 ? stamps(doc) : '') + (i === gs.length - 1 ? foot(doc) : '') + '</div>';
      }).join('');
    }
    var title = doc.sys === 'companies' ? 'Extract from the commercial register' : doc.sys === 'residents' ? 'Extract from the residence registry' : doc.title;
    var html = '<div class="rh">' + (doc.sys === 'residents' || doc.sys === 'companies' ? crest().replace('class="crest"', 'class="crest" style="width:28px;height:32px;display:block;margin:0 auto 4px"') : '') + '<h4>' + UIesc(title) + '</h4><small>' + UIesc(doc.from || '') + '</small></div>';
    gs.forEach(function (g) {
      if (g.h) html += '<div class="fsec" style="font-size:11px;border-bottom:1px solid #8c806a;padding-bottom:3px">' + segs(g.h.x) + '</div>';
      html += formLines(g.lines);
    });
    return sheet(doc, 'd-reg', html + stamps(doc) + foot(doc));
  };

  R.manifest = function (doc) {
    var html = '<div class="pnl"><div class="ph"><span>' + UIesc((doc.from || '').toUpperCase()) + '</span><span>PNL/ADL</span></div>';
    doc.body.forEach(function (l) {
      if (l.k === 's') return;
      if (l.k === 'n') { html += hand(l.x); return; }
      if (l.k === 'h') html += '<div style="margin:10px 0 4px;font-weight:700">' + segs(l.x, true) + '</div>';
      else html += '<div style="white-space:pre-wrap;' + (/^\s{3}/.test(plain(l.x)) ? 'padding-left:2ch;color:#555;' : 'margin-top:6px;') + '">' + segs(l.x, true) + '</div>';
    });
    html += '<div style="margin-top:10px">END OF DISPLAY</div></div>';
    return sheet(doc, 'd-manifest', html + stamps(doc) + foot(doc));
  };

  /** HTML for the whole document (one or more sheets) */
  D.render = function (doc) {
    var f = R[doc.style] || R.report;
    if (doc.kind === 'statement' || doc.kind === 'police' || doc.kind === 'porter' || doc.kind === 'press') f = R.report;
    if (doc.kind === 'intercept') f = R.telex;
    try { return f(doc); } catch (e) { return R.report(doc); }
  };

  /** short visual kind for thumbnails */
  D.thumbKind = function (doc) {
    if (doc.kind === 'intercept') return 'intercept';
    if (doc.kind === 'statement') return 'statement';
    if (doc.kind === 'informant') return 'note';
    if (doc.sys === 'vehicles' && doc.body.some(function (l) { return /^Rental agreement/.test(plain(l.x)); })) return 'rental';
    return { telex: 'telex', cdr: 'cdr', bank: 'bank', card: 'card', news: 'news', note: 'note' }[doc.style] || 'form';
  };
  D.sourceLabel = function (doc) {
    if (doc.sys === 'traffic') return { tip: 'Liaison telex', intercept: 'Intercept', police: 'Police', news: 'Press', informant: 'Informant', press: 'Protective security', porter: 'Hotel contact', consular: 'Desk', statement: 'Interrogation' }[doc.kind] || 'Traffic';
    var s = UIA.system(doc.sys);
    return s ? s.label : doc.sys;
  };
  /** does this doc mention a token (t:v)? */
  D.mentions = function (doc, t, v) {
    return (doc.tokens || []).some(function (k) { return k.t === t && k.v === v; });
  };
  return D;
})();
