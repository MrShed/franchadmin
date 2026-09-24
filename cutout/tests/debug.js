// debug: which relevant entries did the solver never see? node tests/debug.js <seed> [attempt]
var CX = require('./load.js')();
var seed = process.argv[2] || '1', att = +(process.argv[3] || 0);
var gs = att ? seed + '#' + att : seed;
var W = CX.buildWorld(gs, {}); CX.makeTraces(W);
var rep = CX.solveWorld(W, { keep: true });
var cs = rep._cs;
console.log('solved', rep.solved, 'fails', rep.fails, 'clues', rep.clues, 'war', rep.warrants);
var P = W.net.principal;
console.log('principal', P.real, P.idents.map(function (x) { return x.name; }), 'root', W.rootAccount, 'cover', W.coverAccount, W.coverCompany, 'fin', !!W.net.financier);
W.network.forEach(function (p) { console.log(' ', p.role, p.real, p.idents.slice(1).map(function (a) { return a.name + '{' + a.links + '}'; }).join(' '), 'acct', p.account, 'car', p.car); });
var unseen = W.entries.filter(function (e) { return e._sys !== 'traffic' && !cs._s.seen[e._id] && (e._net || (e._pids || []).some(function (x) { return W.P[x] && W.P[x].net; })) && !e._noise && e.r !== 'tx' || (e.r === 'tx' && e._net && !cs._s.seen[e._id]); });
unseen.forEach(function (e) {
  var o = {}; for (var k in e) if (k.charAt(0) !== '_' && typeof e[k] !== 'object') o[k] = e[k];
  console.log('UNSEEN', e._sys, e._day >= cs.day ? '(future)' : '', JSON.stringify(o).slice(0, 220));
});
