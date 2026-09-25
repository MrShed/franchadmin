/* DEPTH UI — 20-desk.js: the DESK. Inbox (typed memos with tappable
 * references), warrants (watch / lift / raid / stake-out, with plain
 * explanations), the operation card filling in WHAT / WHERE / WHEN / WHO,
 * the case file, the night supervisor's three tiers of hints, and a pencil
 * notepad. */
var UIDesk = (function () {
  var K = {}, root = null;
  var SUBS = [['inbox', 'Inbox', 'inbox'], ['op', 'Operation', 'op'], ['warrants', 'Warrants', 'stamp'], ['file', 'Case file', 'file'], ['mentor', 'Supervisor', 'mentor'], ['notes', 'Notes', 'note']];
  var FROM = { super: ['Superintendent', 'sup'], mentor: ['Night supervisor', 'men'], sb: ['Special Branch', 'sb'], report: ['Field report', 'rep'], file: ['Registry', 'reg'], bench: ['Workbench', 'rep'], system: ['Station', 'rep'] };
  K.build = function (r) {
    root = r;
    root.innerHTML = '<div class="desk"><nav class="dk-subs" id="dk-subs">' + SUBS.map(function (s) { return '<button data-s="' + s[0] + '">' + UIICON[s[2]] + '<span>' + s[1] + '</span><i class="badge" hidden></i></button>'; }).join('') + '</nav><div class="dk-body" id="dk-body"></div></div>';
    UI$('#dk-subs').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; UIAudio.cue('paper'); K.sub(b.dataset.s); });
    K.refresh();
  };
  K.reset = function () { root = null; };
  K.sub = function (s) { UIS.desk.sub = s; if (s !== 'inbox') UIS.desk.open = null; if (UIS.tab !== 'desk') UI.go('desk'); else K.refresh(); UI.emit('desk', s); };
  K.refresh = function () {
    if (!root) return;
    var s = UIS.desk.sub;
    UI$$('#dk-subs [data-s]').forEach(function (b) { b.classList.toggle('on', b.dataset.s === s); });
    var un = UIA.inbox().filter(function (m) { return !m.read && !UIS.seenInbox[m.id]; }).length, bd = UI$('#dk-subs [data-s=inbox] .badge');
    bd.hidden = !un; bd.textContent = un;
    var body = UI$('#dk-body');
    if (s === 'op') opCard(body); else if (s === 'warrants') warrants(body); else if (s === 'file') caseFile(body); else if (s === 'mentor') mentor(body); else if (s === 'notes') notes(body); else inbox(body);
  };

  // ------------------------------------------------------------------ inbox
  function blocks(bl) {
    return bl.map(function (b) {
      var x = UIparts(b.x);
      if (b.k === 'n') return '<p class="m-n">' + x + '</p>';
      if (b.k === 'm') return '<pre class="m-m">' + x + '</pre>';
      if (b.k === 'q') return '<blockquote>' + x + '</blockquote>';
      if (b.k === 'h') return '<h5>' + x + '</h5>';
      return '<p>' + x + '</p>';
    }).join('');
  }
  function inbox(body) {
    var list = UIA.inbox(), open = UIS.desk.open && list.filter(function (m) { return m.id === UIS.desk.open; })[0];
    var wide = UIwide() || UIland();
    var h = '<div class="ib-wrap' + (open ? ' reading' : '') + '"><div class="ib-list">' + (list.length ? list.map(function (m) {
      var f = FROM[m.kind] || FROM.system, unread = !m.read && !UIS.seenInbox[m.id];
      return '<button class="ib-it k-' + f[1] + (unread ? ' unread' : '') + (open && open.id === m.id ? ' on' : '') + (m.urgent ? ' urgent' : '') + '" data-o="' + UIesc(m.id) + '"><span class="ib-k">' + UIesc(f[0]) + '</span><b>' + UIesc(m.title) + '</b><span class="ib-m">Night ' + (m.shift + 1) + ' · ' + m.label + ' · ' + UIesc(m.from) + '</span></button>';
    }).join('') : '<p class="note">Nothing yet.</p>') + '</div>';
    if (open) {
      var f = FROM[open.kind] || FROM.system;
      h += '<article class="memo paper k-' + f[1] + '"><button class="btn xs ghost memo-back" data-back>' + UIICON.back + 'Inbox</button>' +
        '<header><span class="lh">' + (f[1] === 'sb' ? 'Politiets Efterretningstjeneste · Special Branch' : f[1] === 'sup' ? 'Station Kestrel · Office of the Superintendent' : f[1] === 'reg' ? 'Registry · Case file' : f[1] === 'men' ? 'Night supervisor' : 'Station Kestrel') + '</span>' +
        '<h3>' + UIesc(open.title) + '</h3><dl><dt>From</dt><dd>' + UIesc(open.from) + '</dd><dt>Time</dt><dd>Night ' + (open.shift + 1) + ', ' + open.label + '</dd></dl></header>' +
        '<div class="memo-b' + (f[1] === 'men' ? ' hand' : '') + '">' + blocks(open.body) + '</div>' +
        (open.msg ? '<button class="btn sm" data-ref="msg" data-id="' + UIesc(open.msg) + '">' + UIICON.bench + 'Open ' + UIesc(open.msg) + ' on the bench</button>' : '') + '</article>';
    } else if (wide) h += '<div class="memo-empty"><p class="pencil-note">Pick a memo.</p></div>';
    h += '</div>';
    body.innerHTML = h;
    body.onclick = function (e) {
      var o = e.target.closest('[data-o]'); if (o) { UIAudio.cue('paper'); UIS.desk.open = o.dataset.o; UIS.seenInbox[o.dataset.o] = 1; UIA.markRead(o.dataset.o); UI.save(); UI.badges(); K.refresh(); UI.emit('memo', o.dataset.o); var v = UI$('#v-desk'); if (v && !wide) v.scrollTop = 0; return; }
      if (e.target.closest('[data-back]')) { UIS.desk.open = null; K.refresh(); }
    };
  }

  // ------------------------------------------------------------------ operation card
  K.pencilCard = function (field, value) { UIS.op[field] = value; if (UIA.cardNote(field, value)) UI.refresh(); UI.save(); if (UIS.tab === 'desk') K.refresh(); };
  function opCard(body) {
    var c = UIA.opCard(), c2 = UIA.clock(), labels = { what: ['What', 'What they mean to do'], where: ['Where', 'The place'], when: ['When', 'Night and hour'], who: ['Who', 'Which agent does it'] };
    var h = '<article class="opcard"><div class="oc-clip"></div><header><span class="eyebrow">Operation card</span><h3>' + (c.codeword ? 'Operation ' + UIesc(c.codeword) : 'Operation ?') + '</h3><span class="oc-stamp">Secret</span></header>';
    ['what', 'where', 'when', 'who'].forEach(function (k) {
      var f = c[k], note = f.note || UIS.op[k] || '';
      h += '<div class="oc-f' + (f.known ? ' known' : '') + '"><span class="oc-k">' + labels[k][0] + '</span><div class="oc-v">' +
        (f.known ? '<b>' + UIesc(f.value) + '</b><small>confirmed by ' + f.from.map(function (id) { return '<span class="lnk" data-ref="msg" data-id="' + UIesc(id) + '">' + UIesc(id) + '</span>'; }).join(', ') + '</small>' : '<span class="oc-blank">' + UIesc(labels[k][1]) + '</span>') +
        '<input class="oc-note" data-k="' + k + '" value="' + UIesc(note) + '" placeholder="pencil a guess…" maxlength="80" autocomplete="off"></div></div>';
    });
    h += '</article>';
    var canStake = c.where.known && c.where.place;
    h += '<div class="oc-act">' + (canStake ? '<p>You know where' + (c.when.known ? ' and when' : '') + '. A stake-out on the right night catches them in the act.</p><button class="btn pri" id="oc-stake">' + UIICON.stake + 'Order the stake-out' + (c.when.known ? ' · ' + UIesc(c.when.value) : '') + '</button>' :
      '<p class="note">Facts appear here when a decrypt you file confirms them. Pencil your own guesses in meanwhile. Three ways to win: arrest the agent who will do it before the night, stake out the right place on the right night, or take the resident and enough of his people that the ring collapses.</p>') + '</div>';
    body.innerHTML = h;
    UI$$('.oc-note', body).forEach(function (i) { i.addEventListener('change', function () { K.pencilCard(i.dataset.k, i.value); UIAudio.cue('pencil'); }); });
    var st = UI$('#oc-stake', body); if (st) st.addEventListener('click', function () { K.warrantForm('stakeout', c.where.place, c.when.night !== null ? c.when.night : null); });
  }

  // ------------------------------------------------------------------ warrants
  var WK = {
    watch: ['Watch', 'eye', 'Special Branch watch an address or place tonight: who lives there, who calls, who leaves a mark. Cheap and safe.'],
    lift: ['Lift', 'lift', 'Open a dead drop at a quiet spot named in a decrypt, photograph what is inside, put it back. Tonight only.'],
    raid: ['Raid', 'raid', 'Arrest whoever is inside a located building. Needs evidence tying it to the ring. A wrong raid warns the ring and angers the superintendent.'],
    stakeout: ['Stake-out', 'stake', 'Men in position at a place on a chosen night. If the operation happens there and then, it is stopped in the act.']
  };
  function warrants(body) {
    var w = UIA.warrants(), toks = '';
    for (var i = 0; i < w.max; i++) toks += '<i class="' + (i < w.left ? 'on' : '') + '"></i>';
    body.innerHTML = '<section class="wr"><header class="wr-h"><div><span class="eyebrow">Special Branch warrants</span><h3>' + w.left + ' of ' + w.max + ' left</h3></div><div class="wr-toks">' + toks + '</div>' + UIExplain.btn('warrants') + '</header>' +
      '<div class="wr-kinds">' + Object.keys(WK).map(function (k) { return '<button class="wr-k" data-k="' + k + '"' + (w.left <= 0 ? ' disabled' : '') + '>' + UIICON[WK[k][1]] + '<span><b>' + WK[k][0] + '</b><small>' + WK[k][2] + '</small></span></button>'; }).join('') + '</div>' +
      '<h4>Issued</h4>' + (w.used.length ? '<div class="wr-used">' + w.used.map(function (u) { return '<div class="wr-u"><span class="wr-stamp k-' + u.kind + '">' + (WK[u.kind] ? WK[u.kind][0] : u.kind) + '</span><span><b>' + UIesc(u.targetName) + '</b><small>Night ' + (u.night + 1) + ' · ' + UIesc(u.status) + (u.result ? ' — ' + UIesc(u.result) : '') + '</small></span></div>'; }).join('') + '</div>' : '<p class="note">None yet.</p>') + '</section>';
    body.onclick = function (e) { var k = e.target.closest('[data-k]'); if (k && !k.disabled) K.warrantForm(k.dataset.k); };
    UIExplain.once('warrants');
  }
  /** warrant form: kind, then a target (places / located buildings), and a night for a stake-out */
  K.warrantForm = function (kind, target, night) {
    var city = UIA.city(), c = UIA.clock(), card = UIA.opCard(), blds = UIA.buildings();
    var opts = kind === 'raid' ? blds.filter(function (b) { return !b.raided; }).map(function (b) { return { id: b.id, name: b.address, sub: 'located building' + (b.strong ? ' · evidence' : '') }; })
      : kind === 'lift' ? city.places.filter(function (p) { return p.kind === 'spot'; }).map(function (p) { return { id: p.id, name: p.name, sub: 'quiet spot' }; })
      : (kind === 'watch' ? blds.map(function (b) { return { id: b.id, name: b.address, sub: 'located building' }; }) : []).concat(city.places.map(function (p) { return { id: p.id, name: p.name, sub: UIMap.kindName(p.kind) + (card.where.place === p.id ? ' · the target' : '') }; }));
    if (kind === 'stakeout' && card.where.place) opts.sort(function (a, b) { return (b.id === card.where.place) - (a.id === card.where.place); });
    var sel = target || (opts[0] && opts[0].id), nt = night === undefined || night === null ? (kind === 'stakeout' && card.when.known && card.when.night !== null ? card.when.night : c.shift) : night;
    var nights = []; for (var n = c.shift; n < c.shifts; n++) nights.push(n);
    UIsheet.open({ title: WK[kind][0], eyebrow: 'Warrant request · ' + UIA.warrants().left + ' left', tag: 'warrant:' + kind, push: UIsheet.isOpen(), html:
      '<p class="note">' + WK[kind][2] + '</p>' +
      (opts.length ? '<label class="eyebrow" for="wf-t">Target</label><select id="wf-t" class="sel">' + opts.map(function (o) { return '<option value="' + UIesc(o.id) + '"' + (o.id === sel ? ' selected' : '') + '>' + UIesc(o.name) + ' — ' + UIesc(o.sub) + '</option>'; }).join('') + '</select>' : '<p class="pencil-note">' + (kind === 'raid' ? 'No building located yet. The DF van or a watch finds one.' : 'Nothing to choose.') + '</p>') +
      (kind === 'stakeout' || kind === 'watch' ? '<label class="eyebrow" for="wf-n">Night</label><div class="seg nights" id="wf-n">' + nights.map(function (n) { return '<button data-n="' + n + '"' + (n === nt ? ' class="on"' : '') + '>' + UIesc(UIA.nightLabel(n)) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="row gap"><button class="btn pri" id="wf-go"' + (opts.length ? '' : ' disabled') + '>' + UIICON.stamp + 'Sign the warrant</button></div>',
      mount: function (b) {
        var ns = UI$('#wf-n', b); if (ns) ns.addEventListener('click', function (e) { var x = e.target.closest('[data-n]'); if (!x) return; nt = +x.dataset.n; UI$$('[data-n]', ns).forEach(function (q) { q.classList.toggle('on', q === x); }); });
        UI$('#wf-go', b).addEventListener('click', function () {
          var t = UI$('#wf-t', b); if (!t) return;
          var r = UIA.warrant(kind, t.value, (kind === 'stakeout' || kind === 'watch') ? { night: nt } : {});
          if (!r.ok) { UIAudio.cue('err'); UItoast(r.err, { err: true, ms: 4200 }); return; }
          UIAudio.cue('stamp'); UIsheet.close();
          UItoast((r.msgs[0] || 'Warrant signed.') + ' ' + UIA.warrants().left + ' left.', { ms: 4200 });
          UI.act(function () { }); UI.showEvents(r.events);
          UI.emit('warrant', kind);
        });
      } });
  };

  // ------------------------------------------------------------------ case file
  function caseFile(body) {
    var bd = UIA.board(), ms = UIA.messages().filter(function (m) { return m.decrypted; }), ppl = UIA.people(), blds = UIA.buildings(), cs = UIA.callsigns();
    body.innerHTML = '<section class="cf">' +
      '<div class="cf-sec"><h4>Decrypts on file</h4>' + (ms.length ? ms.map(function (m) { return '<button class="cf-dec" data-ref="msg" data-id="' + UIesc(m.id) + '"><b>' + UIesc(m.id) + '</b> <small>' + UIesc(m.from) + ' → ' + UIesc(m.to) + ' · ' + UIesc(m.decrypted.verdict) + '</small><span>' + UIesc(m.decrypted.text) + '</span></button>'; }).join('') : '<p class="note">None yet.</p>') + '</div>' +
      '<div class="cf-sec"><h4>Callsigns</h4>' + (cs.length ? '<div class="chips">' + cs.map(function (c) { return '<button class="chip" data-ref="callsign" data-id="' + UIesc(c.id) + '">' + UIesc(c.id) + ' <small>' + c.n + '</small></button>'; }).join('') + '</div>' : '<p class="note">None heard.</p>') + '</div>' +
      '<div class="cf-sec"><h4>Located buildings</h4>' + (blds.length ? blds.map(function (b) { return '<button class="li" data-ref="building" data-id="' + UIesc(b.id) + '"><span><b>' + UIesc(b.address) + '</b><small>' + (b.callsigns.join(', ') || 'no callsign') + (b.raided ? ' · raided' : '') + '</small></span></button>'; }).join('') : '<p class="note">None. The van finds buildings; so do watches and lifts.</p>') + '</div>' +
      '<div class="cf-sec"><h4>People</h4>' + (ppl.length ? ppl.map(function (p) { return '<button class="li" data-ref="person" data-id="' + UIesc(p.id) + '"><span><b>' + UIesc(p.name) + '</b><small>' + UIesc(p.job || '') + (p.arrested ? ' · in custody' : '') + '</small></span></button>'; }).join('') : '<p class="note">Nobody named yet.</p>') + '</div>' +
      '<div class="cf-sec"><h4>Checkerboard</h4>' + (bd ? '<p>Keyword <b class="mono">' + UIesc(bd.key) + '</b>. <button class="btn xs" id="cf-board">' + UIICON.grid + 'Open the card</button></p>' : '<p class="note">Not held.</p>') + '</div></section>';
    var b = UI$('#cf-board', body); if (b) b.addEventListener('click', function () { UI.go('bench'); UIS.bench.tech = 'board'; UIBench.render(); });
  }
  K.personSheet = function (id, o) {
    var p = UIA.person(id); if (!p) return;
    var b = p.home ? (UIA.building(p.home) || UIA.place(p.home)) : null;
    UIsheet.open({ push: o && o.push, title: p.name, eyebrow: 'Person' + (p.arrested ? ' · in custody' : ''), tag: 'person:' + id, html:
      '<dl class="kv">' + (p.job ? '<dt>Cover</dt><dd>' + UIesc(p.job) + '</dd>' : '') + (b ? '<dt>Address</dt><dd><span class="lnk" data-ref="' + (b.address ? 'building' : 'place') + '" data-id="' + UIesc(b.id) + '">' + UIesc(b.address || b.name) + '</span></dd>' : '') + '</dl>' +
      '<div class="row gap"><button class="btn sm" data-who>' + UIICON.pencil + 'Pencil in as WHO</button></div>',
      mount: function (bd) { UI$('[data-who]', bd).addEventListener('click', function () { K.pencilCard('who', p.name); UItoast('Pencilled on the operation card: WHO — ' + p.name + '.'); }); } });
  };

  // ------------------------------------------------------------------ the night supervisor
  function mentor(body) {
    var mi = UIA.mentorInfo(), ms = UIA.mentorStatus();
    var c = UIA.clock(), freeUsed = !ms[1].ok || UIS.mentorFree === c.shift, log = UIS.mentorLog || (UIS.mentorLog = []);
    body.innerHTML = '<section class="mentor"><div class="mt-id paper"><div class="mt-photo" aria-hidden="true"><svg viewBox="0 0 60 70"><rect width="60" height="70" fill="#cfc6ae"/><circle cx="30" cy="27" r="13" fill="#6d6452"/><path d="M8 70c2-17 11-24 22-24s20 7 22 24z" fill="#6d6452"/><path d="M17 24c0-10 6-15 13-15s13 5 13 15c-3-5-8-7-13-7s-10 2-13 7z" fill="#4a4336"/></svg></div>' +
      '<div><span class="eyebrow">' + UIesc(mi.title) + '</span><h3>' + UIesc(mi.name) + '</h3><p class="note">' + UIesc(mi.bio) + '</p></div></div>' +
      '<div class="mt-tiers">' +
      '<button class="mt-t" data-tier="1"' + (freeUsed ? ' disabled' : '') + '><b>A nudge</b><small>' + (freeUsed ? 'Used tonight' : 'Free, once a night') + '</small></button>' +
      '<button class="mt-t" data-tier="2"><b>Point me at it</b><small>Costs ' + ms[2].cost + ' min of station time</small></button>' +
      '<button class="mt-t" data-tier="3"><b>Do it for me</b><small>Costs ' + ms[3].cost + ' points of score</small></button></div>' +
      '<div class="mt-log">' + (log.length ? log.slice().reverse().map(function (l) { return '<div class="mt-note"><span class="mt-n">Night ' + (l.shift + 1) + ' · ' + UIesc(l.label) + ' · tier ' + l.tier + '</span><p>' + UIesc(l.text) + '</p>' + (l.action && l.action.tab ? '<button class="btn xs" data-go="' + UIesc(JSON.stringify(l.action)) + '">Take me there</button>' : '') + '</div>'; }).join('') : '<p class="pencil-note">“Ask when you are stuck. Not before.”</p>') + '</div></section>';
    body.onclick = function (e) {
      var t = e.target.closest('[data-tier]');
      if (t && !t.disabled) {
        var tier = +t.dataset.tier;
        if (tier === 1) UIS.mentorFree = c.shift;
        var r = UIA.mentor(tier);
        UIAudio.cue('paper');
        if (!r.ok) { UItoast(r.text || 'She is busy.', { err: true }); return; }
        log.push({ tier: tier, text: r.text, refs: r.refs || [], action: r.action, shift: c.shift, label: UIA.clock().label });
        UI.act(function () { }); UI.showEvents(r.events); mentor(body); UI.emit('mentor', tier);
        return;
      }
      var g = e.target.closest('[data-go]');
      if (g) { var a = JSON.parse(g.dataset.go); if (a.tab === 'bench' && a.a && a.b) UIBench.depth(a.a, a.b); else if (a.tab === 'bench' && a.a) UIBench.openMsg(a.a); else UI.go(a.tab); }
    };
  }

  // ------------------------------------------------------------------ notes
  function notes(body) {
    body.innerHTML = '<section class="notepad"><div class="np-top"></div><textarea id="np-t" spellcheck="false" placeholder="Pencil notes…">' + UIesc(UIA.notes()) + '</textarea></section>';
    var t = UI$('#np-t', body), tm = null;
    t.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { UIA.notes(t.value); UI.save(); }, 400); });
  }
  UI.views.desk = K;
  return K;
})();
