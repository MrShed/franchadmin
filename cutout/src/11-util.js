/* CUTOUT UI — 11-util.js: small DOM helpers, hashing, icons. */
function UI$(sel, root) { return (root || document).querySelector(sel); }
function UI$$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function UIesc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function UIh(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** deterministic float in [-1,1] from a string */
function UIjit(s) { return (UIh(s) % 2001) / 1000 - 1; }
function UIel(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function UIcap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function UItokKey(t) { return t.t + ':' + t.v; }
function UItokDisp(t) { return t.d || t.v; }
function UIvibe(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) { /* ignore */ } }

var UITYPE = { name: 'Name', passport: 'Passport', number: 'Telephone', plate: 'Vehicle plate', account: 'Bank account', address: 'Address', company: 'Company', hotel: 'Hotel', flight: 'Flight', place: 'Place', date: 'Date', target: 'Scheduled visitor' };
var UIROLE = { principal: 'Principal', cutout: 'Cutout (go-between)', operative: 'Operative', armourer: 'Armourer', forger: 'Forger', driver: 'Driver', financier: 'Financier', 'inside-man': 'Inside man', chemist: 'Chemist', lookout: 'Lookout', courier: 'Courier', innocent: 'Innocent', herring: 'Unrelated criminal' };
var UISYSABBR = { hotels: 'HTL', border: 'BDR', airline: 'AIR', phones: 'TEL', bank: 'BNK', vehicles: 'VEH', residents: 'RES', companies: 'COM', archive: 'ARC', traffic: 'TRF' };
var UISYSHINT = { hotels: 'guest registrations', border: 'frontier controls', airline: 'bookings & manifests', phones: 'call records', bank: 'court order needed', vehicles: 'registry & rentals', residents: 'Meldeamt', companies: 'commercial register', archive: 'our old file cards' };

var UIICON = {
  desk: '<svg viewBox="0 0 24 24"><path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5M8 12h8M8 15.5h8M8 19h5"/></svg>',
  records: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M7 9l3 2.5L7 14M12 14h5M8 21h8M12 17v4"/></svg>',
  board: '<svg viewBox="0 0 24 24"><rect x="2.5" y="3.5" width="19" height="15" rx="1"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="16" cy="7" r="1.4"/><circle cx="12" cy="14" r="1.4"/><path d="M7.5 8L12 14l4-7M8 21l2-2.5M16 21l-2-2.5"/></svg>',
  "case": '<svg viewBox="0 0 24 24"><path d="M3 7h18v13H3zM8.5 7V4.5h7V7"/><path d="M3 12h18M11 11v2.5h2V11"/></svg>',
  lamp: '<svg viewBox="0 0 24 24"><path d="M4.5 21h10M9 21l-2.5-7.5L12 8"/><path d="M11 5.2l6.3 3.1-3.4 3.9z"/><path d="M16.5 13.5l1.3 1.6M18.6 11.8l1.9.6M14.4 14.6l.2 2"/><circle cx="6.5" cy="13.5" r=".9"/></svg>',
  file: '<svg viewBox="0 0 64 64"><path d="M14 8h24l12 12v36H14z"/><path d="M38 8v12h12M21 30h22M21 37h22M21 44h14"/></svg>'
};

/* tiny persistent per-viewer UI prefs (never game state) */
var UIPREF = {
  get: function (k, d) { try { var v = localStorage.getItem('cutout.pref.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('cutout.pref.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};
