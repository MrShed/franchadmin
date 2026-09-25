/* DEPTH engine — 03-city.js
 * DX.makeCity(seed, opts) -> the port city of Haldmar on the unit square (x right, y down; sea to the north).
 *  {name, coast:[[x,y],[x,y]], sea:[[x,y]..], land:[[x,y]..], harbour:{poly, quays:[placeId]}, river:[[x,y]..],
 *   districts:[{id,name,poly,centre,blurb}], streets:[{id,name,line}], places:[{id,kind,name,code,district,pos,blurb}],
 *   outstations:[{id,name,pos,quality}]}
 * Also: DX.cityDistrictAt(city, pos), DX.address(city, rng, district) (fictional street + number).
 */
(function () {
  'use strict';
  var D = DX.DATA;

  function coastY(x) { return 0.2 + 0.04 * (x - 0.5); }  // straight, slightly tilted coast (a half-plane)
  DX.coastY = coastY;

  DX.cityDistrictAt = function (city, p) {
    for (var i = 0; i < city.districts.length; i++) if (DX.inPoly(p, city.districts[i].poly)) return city.districts[i].id;
    // nearest centre fallback (edges / sea)
    var best = null, bd = 9;
    city.districts.forEach(function (d) { var dd = DX.dist(p, d.centre); if (dd < bd) { bd = dd; best = d.id; } });
    return best;
  };

  function streetName(R, used) {
    for (var k = 0; k < 50; k++) {
      var n = R.pick(D.STREET_A) + R.pick(D.STREET_B);
      if (!used[n]) { used[n] = 1; return n; }
    }
    return 'Nygade';
  }

  DX.makeCity = function (seed, opts) {
    opts = opts || {};
    var R = DX.rng(seed + '/city');
    var city = { name: D.CITY };
    var c0 = coastY(0), c1 = coastY(1);
    city.coast = [[0, c0], [1, c1]];
    city.sea = [[0, 0], [1, 0], [1, c1], [0, c0]];
    city.land = [[0, c0], [1, c1], [1, 1], [0, 1]];

    // ---- districts: jittered 4x3 grid of seeds, Voronoi cells clipped to land
    var nx = 4, ny = 3, seeds = [];
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var x = (i + 0.5) / nx + R.range(-0.07, 0.07);
      var y0 = coastY(x), y = y0 + (j + 0.5) / ny * (1 - y0) + R.range(-0.05, 0.05);
      seeds.push([x, y]);
    }
    var names = R.shuffle(D.DISTRICTS.map(function (n, k) { return [n, D.DISTRICT_BLURB[k]]; }));
    city.districts = seeds.map(function (s, k) {
      var poly = city.land.map(function (p) { return p.slice(); });
      seeds.forEach(function (o, m) {
        if (m === k) return;
        var nxv = o[0] - s[0], nyv = o[1] - s[1];
        var cc = (o[0] * o[0] + o[1] * o[1] - s[0] * s[0] - s[1] * s[1]) / 2;
        poly = DX.clipHalf(poly, nxv, nyv, cc);
      });
      poly = poly.map(function (p) { return [DX.round(p[0], 4), DX.round(p[1], 4)]; });
      var cen = DX.centroid(poly);
      return { id: 'd' + k, name: names[k][0], poly: poly, centre: [DX.round(cen[0], 4), DX.round(cen[1], 4)], blurb: names[k][1], coastal: j === 0 };
    });

    // ---- river: from the south edge to the coast, meandering
    var rx = R.range(0.38, 0.62), river = [];
    for (var t = 0; t <= 8; t++) {
      var yy = 1 - t / 8 * (1 - coastY(rx));
      river.push([DX.round(DX.clamp(rx + 0.05 * Math.sin(t * 1.3 + R.range(0, 1)), 0.05, 0.95), 4), DX.round(yy, 4)]);
    }
    river[river.length - 1][1] = DX.round(coastY(river[river.length - 1][0]) - 0.01, 4);
    city.river = river;
    var mouthX = river[river.length - 1][0];

    // ---- streets
    var used = {}, streets = [];
    function addStreet(line, name) { streets.push({ id: 's' + streets.length, name: name || streetName(R, used), line: line.map(function (p) { return [DX.round(p[0], 4), DX.round(p[1], 4)]; }) }); }
    addStreet([[0.02, coastY(0.02) + 0.03], [0.5, coastY(0.5) + 0.03], [0.98, coastY(0.98) + 0.03]], 'Strandvej');
    for (var h = 1; h <= 3; h++) {
      var yh = 0.2 + h * 0.2 + R.range(-0.04, 0.04), pts = [];
      for (var q = 0; q <= 4; q++) pts.push([q / 4, yh + R.range(-0.03, 0.03)]);
      addStreet(pts);
    }
    for (var v = 1; v <= 4; v++) {
      var xv = v * 0.2 + R.range(-0.04, 0.04), pv = [];
      for (var q2 = 0; q2 <= 4; q2++) { var yq = coastY(xv) + 0.03 + q2 / 4 * (0.97 - coastY(xv)); pv.push([xv + R.range(-0.03, 0.03), yq]); }
      addStreet(pv);
    }
    // a ring road and a couple of diagonals
    var ring = [];
    for (var a = 0; a <= 12; a++) { var ang = Math.PI * (a / 12); ring.push([0.5 + 0.34 * Math.cos(ang), 0.62 + 0.3 * Math.sin(ang) * 0.9]); }
    addStreet(ring.reverse(), 'Ringvejen');
    addStreet([[0.05, 0.95], [0.3, 0.7], [0.5, 0.5]]);
    addStreet([[0.95, 0.95], [0.72, 0.68], [0.55, 0.45]]);
    city.streets = streets;

    // ---- places
    var places = [];
    function landPoint(rx0, rx1, ry0, ry1) {
      for (var k = 0; k < 30; k++) {
        var p = [R.range(rx0, rx1), R.range(ry0, ry1)];
        if (p[1] > coastY(p[0]) + 0.025 && Math.abs(p[0] - riverXAt(p[1])) > 0.02) return p;
      }
      return [R.range(0.2, 0.8), R.range(0.5, 0.9)];
    }
    function riverXAt(y) {
      for (var k = 0; k < river.length - 1; k++) {
        var a0 = river[k], a1 = river[k + 1];
        if ((y <= a0[1] && y >= a1[1]) || (y >= a0[1] && y <= a1[1])) { var tt = (y - a0[1]) / ((a1[1] - a0[1]) || 1e-9); return a0[0] + tt * (a1[0] - a0[0]); }
      }
      return -1;
    }
    function addPlace(kind, name, code, pos, blurb) {
      var p = { id: 'p' + places.length, kind: kind, name: name, code: code, pos: [DX.round(pos[0], 4), DX.round(pos[1], 4)], district: null, blurb: blurb || '' };
      places.push(p); return p;
    }
    // quays: numbered 1..9 along the coast, skipping the river mouth
    var quayIds = [], qx = 0.08;
    for (var qn = 1; qn <= D.QUAYS; qn++) {
      if (Math.abs(qx - mouthX) < 0.05) qx += 0.06;
      var qp = addPlace('quay', 'Quay ' + qn, 'QUAY ' + qn, [qx, coastY(qx) + 0.012], qn <= 3 ? 'fish and ferry berths' : qn <= 6 ? 'general cargo, bonded sheds' : 'tanker and naval berths');
      quayIds.push(qp.id); qx += 0.09 + R.range(-0.01, 0.01);
    }
    city.harbour = { poly: [[0.02, coastY(0.02)], [0.02, coastY(0.02) - 0.08], [0.98, coastY(0.98) - 0.08], [0.98, coastY(0.98)]].map(function (p) { return [DX.round(p[0], 4), DX.round(p[1], 4)]; }), quays: quayIds };
    // landmarks with plausible positions
    var where = {
      naval_yard: [0.78, 0.95, 0.0, 0.08], fuel_depot: [0.06, 0.2, 0.0, 0.07], station: [0.4, 0.6, 0.45, 0.6], ferry: [0.25, 0.4, 0.0, 0.04],
      lighthouse: [0.93, 0.98, 0.0, 0.03], power: [0.62, 0.74, 0.0, 0.06], bridge: [0, 0, 0, 0], customs: [0.45, 0.58, 0.02, 0.07],
      radar: [0.02, 0.07, 0.0, 0.05], hotel: [0.4, 0.6, 0.12, 0.25], church: [0.3, 0.55, 0.2, 0.35], market: [0.3, 0.45, 0.02, 0.08],
      cinema: [0.35, 0.65, 0.25, 0.4], post: [0.4, 0.6, 0.3, 0.42], tram: [0.1, 0.3, 0.6, 0.8], park: [0.55, 0.8, 0.3, 0.5],
      gasworks: [0.7, 0.9, 0.75, 0.9], hospital: [0.15, 0.35, 0.35, 0.5]
    };
    D.LANDMARKS.forEach(function (L) {
      var w = where[L[0]], pos;
      if (L[0] === 'bridge') { var ry = R.range(0.55, 0.8); pos = [riverXAt(ry), ry]; }
      else { var xx = R.range(w[0], w[1]); pos = [xx, coastY(xx) + 0.02 + R.range(w[2], w[3])]; }
      addPlace(L[0], L[1], L[2], pos);
    });
    D.CAFES.forEach(function (cf) { addPlace('cafe', cf[0], cf[1], landPoint(0.08, 0.92, 0.28, 0.9)); });
    D.SPOTS.forEach(function (sp) { addPlace('spot', sp[0], sp[1], landPoint(0.06, 0.94, 0.3, 0.94), 'a quiet corner'); });
    D.SIGNALS.forEach(function (sg) { addPlace('signal', sg[0], sg[1], landPoint(0.1, 0.9, 0.3, 0.9), 'a public fixture'); });
    D.PHONES.forEach(function (ph) { addPlace('phone', ph[0], ph[1], landPoint(0.1, 0.9, 0.28, 0.9), 'public telephone'); });
    places.forEach(function (p) { p.district = DX.cityDistrictAt(city, p.pos); });
    city.places = places;

    // ---- DF outstations (the 4th only on grades that have it)
    var OS = [['DF1', 'Skovhøj', [0.03, 0.97], 1.0], ['DF2', 'Rønnebakke', [0.97, 0.95], 1.1], ['DF3', 'Holmen mole', [0.5, 0.07], 0.9], ['DF4', 'Fyrhøj', [0.98, 0.35], 1.2]];
    city.outstations = OS.slice(0, opts.outstations || 3).map(function (o) { return { id: o[0], name: o[1], pos: o[2], quality: o[3] }; });
    return city;
  };

  /** a fictional address in a district: {street, number, text, pos} */
  DX.address = function (city, R, did) {
    var d = null;
    city.districts.forEach(function (x) { if (x.id === did) d = x; });
    var pos = d.centre, poly = d.poly;
    var xs = poly.map(function (p) { return p[0]; }), ys = poly.map(function (p) { return p[1]; });
    for (var k = 0; k < 60; k++) {
      var p = [R.range(Math.min.apply(null, xs), Math.max.apply(null, xs)), R.range(Math.min.apply(null, ys), Math.max.apply(null, ys))];
      if (DX.inPoly(p, poly) && p[1] > coastY(p[0]) + 0.03) { pos = p; break; }
    }
    var street = R.pick(D.STREET_A) + R.pick(D.STREET_B);
    var num = R.int(1, 68);
    return { street: street, number: num, text: street + ' ' + num, pos: [DX.round(pos[0], 4), DX.round(pos[1], 4)], district: did };
  };
})();
