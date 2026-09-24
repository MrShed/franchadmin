/* INDEX CASE engine — 07-policy.js
 * Staff and money, the action catalogue, standing orders (lags, costs, compliance),
 * trust by district and age, rumours on the social graph, the council, the mayor,
 * the press, published estimates, the cure clock and the vaccine rollout.
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var D = IX.DATA, SET = IX.SET, FLAG = IX.FLAG, OCC = IX.OCC, ST = IX.ST, u = IX.u;
  var GP = IX.GP;
  var NSET = 26;

  // ---------------------------------------------------------------- grades
  IX.GRADES = [
    { id: 'probationer', label: 'Probationer', blurb: 'Respiratory viruses only, a bigger team, quicker lab results and a patient council.',
      staff: { tracers: 5, field: 3, analysts: 2 }, panel: 16, pcrStart: 40, pcrGrow: 3, pcrMax: 160, seq: 4, funding: 450, vaccineBase: 50, lagBonus: 0, mentorCost: { analysts: 2, credibility: 6 } },
    { id: 'consultant', label: 'Consultant', blurb: 'The full range of diseases, a small team and a lab that is doing its best.',
      staff: { tracers: 4, field: 2, analysts: 2 }, panel: 12, pcrStart: 25, pcrGrow: 2.5, pcrMax: 120, seq: 3, funding: 300, vaccineBase: 60, lagBonus: 0, mentorCost: { analysts: 3, credibility: 10 } },
    { id: 'director', label: 'Director', blurb: 'Wider and nastier diseases, noisier data, slower results and a council that wants the city open.',
      staff: { tracers: 3, field: 1, analysts: 1 }, panel: 8, pcrStart: 15, pcrGrow: 2, pcrMax: 90, seq: 2, funding: 200, vaccineBase: 75, lagBonus: 1, mentorCost: { analysts: 4, credibility: 14 } }
  ];
  IX.gradeOf = function (id) { return IX.GRADES.filter(function (g) { return g.id === id; })[0] || IX.GRADES[1]; };
  GP.grades = function () { return IX.gradeOf(this.grade); };
  var HOURS = 7.5;

  // ---------------------------------------------------------------- orders
  // slot: compliance table index used by the simulation (0 isolate, 1 quarantine, 2 gatherings, 3 masks, 4 wfh, 5 lockdown, 6 shielding, 7 travel, 8 hygiene)
  var ORD = IX.ORDERS = {
    isolate: { label: 'Isolation of cases', area: 'contain', lag: 1, cost: 2, perHead: 0.4, econ: 0.02, slot: 0, base: 0.8, desc: 'Confirmed and probable cases stay at home for 10 days, with support payments so people can afford to.' },
    quarantine: { label: 'Quarantine of contacts', area: 'contain', lag: 1, cost: 1, perHead: 0.3, econ: 0.04, slot: 1, base: 0.62, desc: 'Traced contacts stay at home for 10 days from their last exposure.' },
    close_place: { label: 'Close a venue', area: 'contain', target: 'place', lag: 1, cost: 0.5, econ: 0.01, desc: 'Shuts one venue, school or workplace until you reopen it.' },
    close_schools: { label: 'Close schools and nurseries', area: 'contain', lag: 1, cost: 2, econ: 0.45, pain: 1.2, desc: 'Schools, nurseries and the university close. Parents stay home; children mix elsewhere.' },
    close_hospitality: { label: 'Close pubs, restaurants and gyms', area: 'contain', lag: 1, cost: 5, econ: 0.3, pain: 1, desc: 'Hospitality and gyms close (with grants).' },
    gatherings: { label: 'Limit gatherings', area: 'contain', lag: 1, cost: 0.5, econ: 0.06, slot: 2, base: 0.75, pain: 0.6, params: [{ id: 'max', label: 'Maximum', type: 'choice', options: [{ id: 30, label: '30 people' }, { id: 6, label: '6 people' }], default: 30 }],
      desc: 'Weddings, parties, services, choirs and matches above the limit are cancelled; at 6, home visits are cut too.' },
    masks: { label: 'Masks indoors', area: 'contain', lag: 3, cost: 1, econ: 0.005, slot: 3, base: 0.7, pain: 0.2, desc: 'Masks in shops, workplaces, transport, secondary schools and places of worship. Helps against droplets and shared air; little against hands and food.' },
    ventilation: { label: 'Ventilation drive', area: 'contain', lag: 14, cost: 6, econ: 0, desc: 'CO2 monitors, open windows, grants for air filters in schools, offices and hospitality. Slow to bite; strong against shared-air spread.' },
    hygiene: { label: 'Handwashing & cleaning campaign', area: 'contain', lag: 3, cost: 1.5, econ: 0, slot: 8, base: 0.7, desc: 'Handwashing, surface cleaning, sanitiser everywhere. Good against contact and faecal-oral spread; barely touches shared air.' },
    food_safety: { label: 'Food safety enforcement', area: 'contain', lag: 2, cost: 3, econ: 0.01, desc: 'Kitchen inspections; ill food handlers excluded for 48 hours after symptoms stop.' },
    wfh: { label: 'Work from home', area: 'contain', lag: 2, cost: 0.5, econ: 0.15, slot: 4, base: 0.8, pain: 0.4, desc: 'Everyone who can work from home does.' },
    travel: { label: 'Travel advice', area: 'contain', lag: 2, cost: 0.5, econ: 0.05, slot: 7, base: 0.65, pain: 0.2, desc: 'Avoid public transport and non-essential travel.' },
    lockdown: { label: 'Lockdown', area: 'contain', lag: 1, cost: 20, econ: 2.2, slot: 5, base: 0.8, pain: 3, desc: 'Stay at home except for essential work, food and medicine. The last resort: it works, it costs a fortune, and it wears out goodwill fast.' },
    close_animal: { label: 'Close an animal site', area: 'contain', target: 'place', targetKinds: ['market', 'farm', 'meat_plant'], lag: 1, cost: 2, econ: 0.04, desc: 'Shuts a market, farm or meat plant and culls or isolates the animals.' },
    mass_testing: { label: 'Community testing sites', area: 'lab', lag: 5, cost: 15, econ: 0, desc: 'Walk-in test sites and screening: +60 tests a day and more people come forward.' },
    wastewater: { label: 'Wastewater sampling', area: 'lab', lag: 2, cost: 1.5, econ: 0, desc: 'Sewage samples from every district three times a week. Rises days before cases do. Archived samples from the last fortnight are tested too.' },
    surge: { label: 'Hospital surge', area: 'protect', lag: 7, cost: 25, econ: 0.02, desc: 'Cancels routine operations and opens surge beds and intensive care. Takes a week.' },
    shielding: { label: 'Shielding advice', area: 'protect', lag: 2, cost: 2, econ: 0.02, slot: 6, base: 0.8, params: [{ id: 'group', label: 'Who', type: 'choice', options: [{ id: 'elderly', label: 'Over-70s' }, { id: 'vulnerable', label: 'Clinically vulnerable' }, { id: 'both', label: 'Both' }], default: 'both' }],
      desc: 'Advises the most vulnerable to stay home and away from others, with food deliveries.' },
    care_homes: { label: 'Care home rules', area: 'protect', lag: 2, cost: 4, econ: 0, desc: 'No visiting, staff testing, PPE, no agency staff moving between homes.' },
    hospital_ipc: { label: 'Hospital infection control', area: 'protect', lag: 2, cost: 3, econ: 0, desc: 'Cohort wards, PPE for all contact with suspected cases, screening of admissions.' },
    treatment: { label: 'Treatment protocol', area: 'protect', lag: 1, cost: 2, econ: 0, desc: 'Gives the trial drug to every admitted patient.' },
    vaccinate: { label: 'Vaccination programme', area: 'protect', lag: 0, cost: 10, econ: 0, params: [{ id: 'priority', label: 'Priority order', type: 'order', options: [{ id: 'care', label: 'Care homes' }, { id: 'hcw', label: 'Health & care staff' }, { id: '80', label: '80+' }, { id: '70', label: '70-79' }, { id: 'vulnerable', label: 'Clinically vulnerable' }, { id: '50', label: '50-69' }, { id: 'adults', label: '18-49' }, { id: 'children', label: 'Children 5-17' }, { id: 'deprived', label: 'Most deprived districts first' }], default: ['care', 'hcw', '80', '70', 'vulnerable', '50', 'adults', 'children'] }],
      desc: 'Rolls out the vaccine in your priority order, as fast as supply allows.' }
  };
  Object.keys(ORD).forEach(function (k) { ORD[k].id = k; });
  var RESTRICTIVE = ['close_schools', 'close_hospitality', 'gatherings', 'wfh', 'lockdown', 'masks', 'travel'];

  var ACTS = IX.ACTIONS = {
    interview: { label: 'Interview', area: 'investigate', target: 'case', hours: { tracers: 1.5 }, desc: 'Where they went, who they saw, when they fell ill, who else was ill.' },
    trace: { label: 'Trace contacts', area: 'investigate', target: 'case', hours: { tracers: 3 }, params: [{ id: 'daysBefore', label: 'From', type: 'choice', options: [{ id: 2, label: '2 days before onset' }, { id: 5, label: '5 days before onset' }], default: 2 }], desc: 'Finds and follows up their contacts for 14 days.' },
    timing_study: { label: 'Transmission timing study', area: 'investigate', target: 'case', hours: { field: 3, tracers: 2 }, seq: 1, desc: 'Diaries, daily tests and sequencing for everyone traced from this case: who caught it from them before they felt ill, and who after. Needs the case traced first.' },
    household: { label: 'Household study', area: 'investigate', target: 'case', hours: { field: 3 }, tests: 'household', desc: 'Swabs everyone at home three times, then antibodies: who was infected, and who never felt ill.' },
    site_visit: { label: 'Site visit', area: 'investigate', target: 'place', hours: { field: 4 }, desc: 'Attendance lists for 14 days, ventilation, layout, kitchens.' },
    questionnaire: { label: 'Cluster questionnaire', area: 'investigate', target: 'place', hours: { analysts: 3, field: 2 }, desc: 'Attack rates by activity and exposure among everyone at the cluster event.' },
    record_review: { label: 'Hospital record review', area: 'investigate', target: 'none', hours: { analysts: 4 }, desc: 'Admissions by age and symptoms, and a search for cases nobody reported.' },
    animal_sampling: { label: 'Animal sampling', area: 'investigate', target: 'place', targetKinds: ['market', 'farm', 'meat_plant'], hours: { field: 4 }, money: 3, desc: 'Swabs from animals and pens.' },
    test: { label: 'Test', area: 'lab', target: 'person', tests: 1, desc: 'PCR once the agent is known; the extended respiratory/enteric panel before.' },
    sequence: { label: 'Sequence sample', area: 'lab', target: 'case', hours: { analysts: 1 }, seq: 1, desc: 'Whole genome from a stored sample. 3-5 days.' },
    declare_novel: { label: 'Declare a novel agent', area: 'lab', target: 'none', hours: { analysts: 2 }, desc: 'Ask the lab to run metagenomic sequencing on panel-negative samples. Needs three.' },
    serosurvey: { label: 'Serosurvey', area: 'lab', target: 'none', hours: { field: 6 }, money: 'sero', params: [{ id: 'n', label: 'Sample size', type: 'int', min: 100, max: 1000, default: 300 }], desc: 'Antibodies in a random sample: how many have really been infected.' },
    trial: { label: 'Treatment trial', area: 'lab', target: 'none', hours: { analysts: 4 }, money: 20, params: [{ id: 'n', label: 'Patients', type: 'int', min: 20, max: 400, default: 80 }], desc: 'Randomised trial of an existing drug in admitted patients.' },
    publish_sequence: { label: 'Publish the genome', area: 'lab', target: 'none', hours: {}, desc: 'Starts the vaccine clock, once the disease is characterised.' },
    briefing: { label: 'Press briefing', area: 'communicate', target: 'none', hours: { analysts: 2 }, desc: 'Explain what you know and what you are doing. Builds trust; slows rumours.' },
    counter_rumour: { label: 'Counter a rumour', area: 'communicate', target: 'none', hours: { analysts: 2 }, money: 5, params: [{ id: 'rumour', label: 'Rumour', type: 'choice', options: [], default: null }], desc: 'Community leaders, local radio, social media: a targeted rebuttal.' },
    request_funding: { label: 'Request funding', area: 'admin', target: 'none', hours: { analysts: 1 }, params: [{ id: 'money', label: '£k', type: 'int', min: 0, max: 2000, default: 300 }, { id: 'staff', label: 'Extra staff', type: 'int', min: 0, max: 20, default: 4 }], desc: 'Goes to Monday\'s council meeting.' },
    hire: { label: 'Recruit staff', area: 'admin', target: 'none', hours: {}, money: 'hire', params: [{ id: 'kind', label: 'Team', type: 'choice', options: [{ id: 'tracers', label: 'Contact tracers' }, { id: 'field', label: 'Field epidemiologists' }, { id: 'analysts', label: 'Analysts' }], default: 'tracers' }, { id: 'n', label: 'How many', type: 'int', min: 1, max: 20, default: 2 }], desc: 'Staff start in three days. £3k each to recruit, £0.25k a day.' }
  };
  Object.keys(ACTS).forEach(function (k) { ACTS[k].id = k; });

  // ---------------------------------------------------------------- resources
  GP.resources = function () {
    var S = this.S, st = S.staff, g = this;
    var mx = { tracers: st.tracers * HOURS, field: st.field * HOURS, analysts: st.analysts * HOURS };
    var r = {
      staffHours: { tracers: IX.round(mx.tracers - S.used.tracers, 1), field: IX.round(mx.field - S.used.field, 1), analysts: IX.round(mx.analysts - S.used.analysts, 1) },
      staffMax: mx, staff: { tracers: st.tracers, field: st.field, analysts: st.analysts },
      testsLeft: Math.max(0, Math.floor(S.testsCap) - S.testQueue.length), testsCap: Math.floor(S.testsCap), testQueue: S.testQueue.length,
      seqLeft: Math.max(0, S.seqCap - S.seqUsed), seqCap: S.seqCap,
      funding: IX.round(S.funding, 1), spent: IX.round(S.spent, 1), economy: IX.round(S.economy, 2),
      beds: { used: this.sim.hospNow, cap: this.bedCap() }, icu: { used: this.sim.icuNow, cap: this.icuCap() },
      trust: this.trustSummary(), credibility: Math.round(S.credibility),
      vaccine: S.vaccine ? { status: S.vaccine.status, eta: S.vaccine.eta, done: S.vaccine.done || 0, eligible: S.vaccine.eligible || 0, perDay: S.vaccine.perDay || 0 } : null
    };
    return r;
  };
  GP.bedCap = function () { var b = this.sim.baseBeds; return b + (this.orderEffect('surge') >= 1 ? Math.round(16 * this.C.N / 8000) : 0); };
  GP.icuCap = function () { var b = this.sim.baseIcu; return b + (this.orderEffect('surge') >= 1 ? Math.round(4 * this.C.N / 8000) : 0); };

  // ---------------------------------------------------------------- the action catalogue
  GP.actions = function () {
    var S = this.S, self = this, out = [];
    Object.keys(ACTS).forEach(function (id) {
      var A = ACTS[id];
      var e = { id: id, label: A.label, area: A.area, order: false, target: A.target, costs: self.costOf(id, null, {}), desc: A.desc };
      if (A.targetKinds) e.targetKinds = A.targetKinds;
      if (A.params) e.params = IX.clone(A.params);
      if (id === 'counter_rumour') e.params[0].options = S.rumours.filter(function (r) { return r.reported; }).map(function (r) { return { id: r.id, label: r.short }; });
      var why = self.canAct(id, null, {}, true);
      e.available = !why; e.why = why || A.desc;
      out.push(e);
    });
    Object.keys(ORD).forEach(function (id) {
      var O = ORD[id];
      var e = { id: id, label: O.label, area: O.area, order: true, target: O.target || 'none', costs: { hours: {}, money: O.cost }, economy: O.econ, lag: O.lag, desc: O.desc };
      if (O.targetKinds) e.targetKinds = O.targetKinds;
      if (O.params) e.params = IX.clone(O.params);
      var why = self.canOrder(id, {}, true);
      e.available = !why; e.why = why || O.desc;
      e.active = self.ordersOf(id).map(function (o) { return o.id; });
      out.push(e);
    });
    return out;
  };
  GP.costOf = function (id, target, params) {
    var A = ACTS[id], c = { hours: IX.clone(A.hours || {}) };
    if (A.tests === 1) c.tests = 1;
    if (A.tests === 'household') { c.tests = 3; if (target !== null && target !== undefined) { var C = this.C, h = C.hh[+target]; c.tests = Math.max(0, C.hStart[h + 1] - C.hStart[h] - 1); } }
    if (A.seq) c.seq = A.seq;
    if (typeof A.money === 'number') c.money = A.money;
    if (A.money === 'sero') c.money = Math.round(5 * ((params && +params.n) || 300) / 100);
    if (A.money === 'hire') c.money = 3 * ((params && +params.n) || 2);
    return c;
  };
  GP.canAct = function (id, target, params, catalogue) {
    var S = this.S, A = ACTS[id];
    if (ORD[id]) return this.canOrder(id, params || {}, catalogue, target);
    if (!A) return 'Unknown action.';
    if (this.over) return 'The response is over.';
    var c = this.costOf(id, target, params), res = this.resources();
    var h = c.hours || {};
    for (var k in h) if (h[k] > res.staffHours[k] + 1e-9) return 'Not enough ' + (k === 'tracers' ? 'tracer' : k === 'field' ? 'field team' : 'analyst') + ' hours today (' + h[k] + ' needed).';
    if (c.seq && res.seqLeft < c.seq) return 'No sequencing slots left today.';
    if (c.money && S.funding < c.money) return 'Not enough money in the budget.';
    // availability by stage
    if (id === 'declare_novel') { if (S.recognized) return 'The agent has been identified: ' + S.agentName + '.'; if (S.declared) return 'The lab is working on it.'; }
    if ((id === 'sequence' || id === 'serosurvey' || id === 'trial' || id === 'publish_sequence') && !S.recognized) return 'Only once the lab has identified the agent.';
    if (id === 'counter_rumour' && !S.rumours.some(function (r) { return r.reported; })) return 'No rumours reported yet.';
    if (id === 'publish_sequence' && S.seqPublished !== undefined) return 'Already published.';
    if (catalogue) return null;
    var T = A.target;
    if (T === 'case' && !S.cases[+target]) return 'Pick someone on the line list.';
    if (T === 'person' && !(+target >= 0 && +target < this.C.N && S.people[+target])) return 'Pick a person you know about.';
    if (T === 'place') { var pi = this.placeIdx(target); if (pi < 0 || !this.C.places[pi]) return 'Pick a place.'; if (A.targetKinds && A.targetKinds.indexOf(this.C.places[pi].kind) < 0) return 'Not the right kind of place.'; }
    if (id === 'test' && res.testsLeft < 1) return 'The lab is at capacity today.';
    if (id === 'interview' && S.cases[+target].interviewDay === S.day) return 'Already interviewed today.';
    if (id === 'timing_study') { var ct = S.cases[+target]; if (!S.recognized) return 'Only once the lab has identified the agent.'; if (!ct.traced) return 'Trace their contacts first.'; if (ct.onset === null) return 'Needs a case with a known onset.'; if (ct.timing) return 'Already studied.'; }
    if (id === 'household') { var C = this.C, hh = C.hh[+target]; if (C.hStart[hh + 1] - C.hStart[hh] < 2) return 'Lives alone.'; if (S.cases[+target].household) return 'Household study already done.'; if (res.testsLeft < c.tests) return 'Not enough tests left today.'; }
    return null;
  };

  GP.act = function (id, target, params) {
    var S = this.S;
    params = params || {};
    if (ORD[id]) { if (target !== null && target !== undefined && params.target === undefined) params.target = target; return this.order(id, params); }
    var why = this.canAct(id, target, params);
    if (why) return { ok: false, msgs: [], err: why };
    var A = ACTS[id], fn = this['inv_' + id] || this['do_' + id];
    this._fresh = [];
    var tg = A.target === 'place' ? this.placeIdx(target) : (target === null || target === undefined ? null : +target);
    var r = fn.call(this, A.target === 'none' ? params : tg, params);
    if (!r || !r.ok) { this._fresh = null; return { ok: false, msgs: [], err: (r && r.err) || 'Could not do that.' }; }
    // charge
    var c = this.costOf(id, tg, params);
    for (var k in (c.hours || {})) S.used[k] += c.hours[k];
    if (c.seq) S.seqUsed += c.seq;
    if (c.money) this.spend(c.money);
    S.log.push([S.day, id, tg, params]);
    var msgs = this._fresh; this._fresh = null;
    return { ok: true, msgs: msgs, err: null };
  };
  GP.spend = function (k) { this.S.funding -= k; this.S.spent += k; };

  // simple actions
  GP.do_test = function (pid) {
    var S = this.S, t = this.requestTest(pid, S.recognized ? 'pcr' : 'panel', 1, 'requested by you');
    if (!S.cases[pid]) { /* tests of non-cases are tracked on the person */ var kp = this.knowPerson(pid); kp.tests = kp.tests || []; kp.tests.push(t.id); }
    return { ok: true, msgs: [] };
  };
  GP.do_briefing = function () {
    var S = this.S;
    var since = S.day - (S.lastBriefing === undefined ? -99 : S.lastBriefing);
    var gain = since >= 7 ? 2.5 : since >= 3 ? 1.2 : 0.3;
    S.lastBriefing = S.day;
    this.trustAll(gain);
    S.rumours.forEach(function (r) { r.damp = Math.max(r.damp || 0, 0.3); });
    var topics = [];
    if (S.recognized) topics.push('what ' + S.agentName + ' is and how we test for it');
    var pub = Object.keys(S.published);
    if (pub.length) topics.push('the current estimates (' + pub.map(function (k) { return k; }).join(', ') + ')');
    this.ordersActive().forEach(function (o) { topics.push('why ' + ORD[o.type].label.toLowerCase() + ' matters'); });
    var m = this.msg('press', 'Your briefing: ' + (S.recognized ? S.agentName : 'the illness at ' + (S.alert ? this.C.places[S.alert.place].name : 'the hospital')), 'Press office', [
      'You spoke for twenty minutes and took questions' + (topics.length ? ' on ' + topics.slice(0, 3).join('; ') : '') + '. ' + (gain > 1 ? 'Coverage was fair, even warm in places.' : 'The room was thinner than last time. Briefing every day turns news into noise.'),
      { k: 'n', x: ['Trust ' + (gain >= 1 ? 'up a little' : 'barely moved') + '; rumours spread more slowly for a few days.'] }]);
    return { ok: true, msgs: [m] };
  };
  GP.do_counter_rumour = function (params) {
    var S = this.S, r = S.rumours.filter(function (q) { return q.id === (params && params.rumour); })[0] || S.rumours.filter(function (q) { return q.reported; })[0];
    if (!r) return { ok: false, err: 'Which rumour?' };
    r.countered = S.day; r.damp = 0.7;
    // some believers are persuaded straight away
    var B = r.bel, K = this.keys.rum, n = 0;
    for (var i = 0; i < B.length; i++) if (B[i] && u(K, i, S.day, 9) < 0.35) { B[i] = 0; n++; }
    var m = this.msg('rumour', 'Rebuttal: "' + r.short + '"', 'Community engagement team', [IX.RUMOURS[r.kind].counter, { k: 'n', x: ['About ' + n + ' people changed their minds straight away (' + IX.fmt(n * this.C.scale) + ' across the city). It will keep slowing the rumour for a couple of weeks.'] }]);
    return { ok: true, msgs: [m] };
  };
  GP.do_request_funding = function (params) {
    var S = this.S;
    S.fundingRequests.push({ day: S.day, money: Math.max(0, +params.money || 0), staff: Math.max(0, +params.staff || 0) });
    var m = this.msg('council', 'Funding request filed', 'Council secretariat', ['Your request (£' + IX.fmt(+params.money || 0) + 'k and ' + (+params.staff || 0) + ' extra staff) will go to the council meeting on ' + this.dateLabel(this.nextMonday()) + '.']);
    return { ok: true, msgs: [m] };
  };
  GP.do_hire = function (params) {
    var S = this.S, k = params.kind || 'tracers', n = Math.max(1, Math.min(20, +params.n || 1));
    if (['tracers', 'field', 'analysts'].indexOf(k) < 0) return { ok: false, err: 'Which team?' };
    S.hires.push({ kind: k, n: n, arrive: S.day + 3 });
    var m = this.msg('system', n + ' ' + k + ' recruited', 'HR', ['They start on ' + this.dateLabel(S.day + 3) + '. Payroll: £' + (0.25 * n).toFixed(2) + 'k a day.']);
    return { ok: true, msgs: [m] };
  };
  GP.nextMonday = function () { var d = this.S.day + 1; while (this.cal.weekday(d) !== 1) d++; return d; };

  // ---------------------------------------------------------------- orders
  GP.ordersOf = function (type) { return this.S.orders.filter(function (o) { return o.type === type && o.until === undefined; }); };
  GP.ordersActive = function () { return this.S.orders.filter(function (o) { return o.until === undefined; }); };
  GP.orderActive = function (type) { return this.ordersOf(type).some(function (o) { return o.since + o.lag <= this.S.day; }, this); };
  /** effect ramp 0..1 for an order type (strongest instance) */
  GP.orderEffect = function (type) {
    var S = this.S, best = 0;
    this.ordersOf(type).forEach(function (o) {
      var age = S.day - o.since;
      var e = o.lag <= 1 ? (age >= o.lag ? 1 : 0) : Math.max(0, Math.min(1, (age - 1) / o.lag));
      if (type === 'surge' || type === 'mass_testing' || type === 'wastewater') e = age >= o.lag ? 1 : 0;
      if (e > best) best = e;
    });
    return best;
  };
  GP.canOrder = function (type, params, catalogue, target) {
    var S = this.S, O = ORD[type];
    if (!O) return 'Unknown order.';
    if (this.over) return 'The response is over.';
    if (type === 'vaccinate' && !(S.vaccine && S.vaccine.status !== 'developing')) return 'No vaccine yet.';
    if (type === 'treatment' && !(S.trial)) return 'Run a treatment trial first (LAB).';
    if (type === 'hospital_ipc' && !S.recognized && catalogue) return null;
    if (catalogue) return null;
    if (O.target === 'place') {
      var pi = this.placeIdx(params.target !== undefined ? params.target : target);
      if (pi < 0 || !this.C.places[pi]) return 'Pick a place.';
      if (O.targetKinds && O.targetKinds.indexOf(this.C.places[pi].kind) < 0) return 'Not an animal site.';
      if (this.C.places[pi].kind === 'hospital') return 'You cannot close the hospital.';
      if (this.S.orders.some(function (o) { return o.until === undefined && o.type === type && o.target === pi; })) return 'Already closed.';
    } else if (this.ordersOf(type).length && type !== 'gatherings' && type !== 'shielding' && type !== 'vaccinate') return 'Already in force.';
    if (S.funding < O.cost * 3) return 'Not enough money to fund it.';
    return null;
  };
  GP.order = function (type, params) {
    var S = this.S;
    params = params || {};
    var why = this.canOrder(type, params, false, params.target);
    if (why) return { ok: false, msgs: [], err: why };
    var O = ORD[type];
    this._fresh = [];
    // replacing a parameterised order
    if (type === 'gatherings' || type === 'shielding' || type === 'vaccinate') this.ordersOf(type).forEach(function (o) { o.until = S.day; });
    var o = { id: 'O' + (++S.orderSeq), type: type, since: S.day, lag: O.lag, params: IX.clone(params) };
    if (O.target === 'place') { o.target = this.placeIdx(params.target); delete o.params.target; }
    if (type === 'vaccinate') { o.params.priority = (params.priority && params.priority.length ? params.priority : O.params[0].default).slice(); S.vaccine.queue = null; }
    S.orders.push(o);
    S.log.push([S.day, 'order', type, o.params, o.target]);
    this.orderNews(o, true);
    var msgs = this._fresh; this._fresh = null;
    return { ok: true, order: this.orderView(o), msgs: msgs };
  };
  GP.revoke = function (orderId) {
    var S = this.S;
    var o = S.orders.filter(function (q) { return q.id === orderId && q.until === undefined; })[0];
    if (!o) return { ok: false, msgs: [], err: 'No such active order.' };
    this._fresh = [];
    o.until = S.day;
    S.log.push([S.day, 'revoke', orderId]);
    if (o.target !== undefined) this.closeHistEnd(o);
    this.orderNews(o, false);
    var msgs = this._fresh; this._fresh = null;
    return { ok: true, msgs: msgs };
  };
  GP.orderView = function (o) {
    var O = ORD[o.type], S = this.S;
    var v = { id: o.id, type: o.type, label: O.label + (o.target !== undefined ? ': ' + this.C.places[o.target].name : '') + (o.params && o.params.max ? ' (' + o.params.max + ')' : ''), since: o.since, lag: o.lag,
      effectFrom: o.since + o.lag, params: IX.clone(o.params || {}), costPerDay: O.cost, economyPerDay: this.econOf(o), compliance: IX.round(this.complianceOf(O.slot), 2) };
    if (o.target !== undefined) v.target = this.plref(o.target);
    if (o.until !== undefined) v.until = o.until;
    return v;
  };
  GP.orders = function () { var self = this; return this.ordersActive().map(function (o) { return self.orderView(o); }); };
  GP.econOf = function (o) {
    var O = ORD[o.type];
    if (o.type === 'close_place' && o.target !== undefined) { var k = this.C.places[o.target].kind; return { school: 0.06, office: 0.04, factory: 0.06, meat_plant: 0.08, market: 0.03, pub: 0.01, restaurant: 0.01, stadium: 0.03, hotel: 0.02, gym: 0.005, university: 0.08 }[k] || 0.01; }
    if (o.type === 'gatherings' && o.params && +o.params.max === 6) return 0.15;
    return O.econ;
  };
  GP.orderNews = function (o, on) {
    var O = ORD[o.type], name = O.label + (o.target !== undefined ? ': ' + this.C.places[o.target].name : '');
    this.msg('system', (on ? 'Order issued: ' : 'Order lifted: ') + name, 'Incident room', [on ? O.desc + (O.lag > 1 ? ' Full effect from ' + this.dateLabel(this.S.day + O.lag) + '.' : ' In force from tomorrow.') : 'Lifted from tomorrow.']);
    if (on && ['close_schools', 'close_hospitality', 'lockdown', 'gatherings', 'close_place'].indexOf(o.type) >= 0) this.S.pressQueue.push({ kind: 'order', type: o.type, place: o.target });
    if (on && (o.type === 'lockdown' || o.type === 'close_schools')) this.S.mayorQueue.push({ kind: 'order', type: o.type });
  };
  GP.closeHistEnd = function (o) { };

  /** settings where restrictions make people economical with the truth in interviews */
  GP.restrictionsOn = function () {
    var r = {};
    if (this.orderActive('lockdown')) [SET.PUB, SET.RESTAURANT, SET.GYM, SET.EVENT, SET.FAITH, SET.CHOIR, SET.VISIT].forEach(function (s) { r[s] = 1; });
    if (this.orderActive('gatherings')) [SET.EVENT, SET.CHOIR].forEach(function (s) { r[s] = 1; });
    if (this.orderActive('close_hospitality')) [SET.PUB, SET.RESTAURANT, SET.GYM].forEach(function (s) { r[s] = 1; });
    return r;
  };

  // ---------------------------------------------------------------- compile the day's policy for the simulation
  GP.complianceTable = function (slot, base) {
    var S = this.S, C = this.C, nd = C.districts.length, t = new Float32Array(nd * 3);
    var fear = Math.min(0.15, (S.deathsReported || 0) / (0.004 * C.N));
    var age = 0, type = null;
    this.ordersActive().forEach(function (o) { var O = ORD[o.type]; if (O.slot === slot) { type = o.type; age = Math.max(age, S.day - o.since); } });
    var fatigue = age > 21 ? Math.max(0.6, 1 - (age - 21) * 0.006) : 1;
    for (var d = 0; d < nd; d++) for (var b = 0; b < 3; b++) {
      var tr = S.trust[d * 3 + b] / 100;
      var rum = S.rumourShare ? S.rumourShare[d * 3 + b] || 0 : 0;
      var c = base * (0.45 + 0.75 * tr) * fatigue * (1 - 0.5 * rum) + fear;
      if (slot === 6 && b !== 2) c *= 0.9;
      t[d * 3 + b] = IX.clamp(c, 0.05, 0.97);
    }
    return t;
  };
  GP.complianceOf = function (slot) {
    if (slot === undefined) return 1;
    var t = this.complianceTable(slot, ORD[Object.keys(ORD).filter(function (k) { return ORD[k].slot === slot; })[0]].base), C = this.C, s = 0, w = 0;
    for (var d = 0; d < C.districts.length; d++) for (var b = 0; b < 3; b++) { var pw = C.districts[d].pop; s += t[d * 3 + b] * pw; w += pw; }
    return s / w;
  };
  GP.compilePolicy = function (sd) {
    var S = this.S, C = this.C, self = this, P = this.P;
    var pol = { closed: new Uint8Array(C.places.length), setRestr: new Array(NSET), mult: new Float32Array(NSET).fill(1), roomMult: new Float32Array(NSET).fill(1),
      foodMult: 1, excludeIllFood: false, hospIPC: 0, careRules: 0, isoList: null, quarList: null, comp: {}, hhIso: 0.6, beds: this.bedCap(), icu: this.icuCap(), treatment: false, visitMult: 1 };
    var any = false;
    function restr(set, slot, strength) { (pol.setRestr[set] = pol.setRestr[set] || []).push(slot, strength); any = true; }
    function comp(slot) { if (!pol.comp[slot]) { var O = ORD[Object.keys(ORD).filter(function (k) { return ORD[k].slot === slot; })[0]]; pol.comp[slot] = self.complianceTable(slot, O.base); } return pol.comp[slot]; }
    var hist = [];
    this.ordersActive().forEach(function (o) {
      var e = self.orderEffectOf(o);
      if (e <= 0) return;
      switch (o.type) {
        case 'isolate': comp(0); pol.isoList = S.isoList; pol.isoSym = true; pol.remoteGP = S.recognized; break;
        case 'quarantine': comp(1); pol.quarList = S.quarList; break;
        case 'close_place': pol.closed[o.target] = 1; if (C.places[o.target].kind === 'choir' && C.places[o.target].host !== undefined) { /* the choir, not the church */ } hist.push({ place: o.target }); break;
        case 'close_animal': pol.closed[o.target] = 1; hist.push({ place: o.target }); break;
        case 'close_schools': C.places.forEach(function (p) { if (p.kind === 'school' || p.kind === 'nursery' || p.kind === 'university') pol.closed[p.i] = 1; }); pol.visitMult *= 1.15; hist.push({ sets: [SET.SCHOOL, SET.NURSERY, SET.UNI] }); break;
        case 'close_hospitality': C.places.forEach(function (p) { if (p.kind === 'pub' || p.kind === 'restaurant' || p.kind === 'gym') pol.closed[p.i] = 1; }); hist.push({ sets: [SET.PUB, SET.RESTAURANT, SET.GYM] }); break;
        case 'gatherings':
          comp(2);
          var max = +(o.params && o.params.max) || 30;
          [SET.EVENT, SET.FAITH, SET.CHOIR].forEach(function (s) { restr(s, 2, 1); });
          restr(SET.STADIUM, -1, 1);
          if (max <= 6) { pol.visitMult *= 1 - 0.5 * self.complianceOf(2); restr(SET.PUB, 2, 0.4); restr(SET.RESTAURANT, 2, 0.4); }
          hist.push({ sets: [SET.STADIUM] });
          break;
        case 'masks':
          comp(3);
          var cm = self.complianceOf(3) * e;
          var fam = P.family, resp = P.humanRoute === 'airborne' || P.humanRoute === 'droplet';
          [SET.WORK, SET.UNI, SET.TRANSPORT, SET.SHOP, SET.FAITH, SET.MARKET, SET.GP, SET.HOSP, SET.PATIENT, SET.CARE].forEach(function (s) {
            pol.mult[s] *= 1 - (resp ? 0.28 : 0.04) * cm; pol.roomMult[s] *= 1 - (resp ? 0.2 : 0) * cm;
          });
          pol.mult[SET.SCHOOL] *= 1 - (resp ? 0.2 : 0.02) * cm;
          break;
        case 'ventilation':
          [SET.WORK, SET.SCHOOL, SET.NURSERY, SET.UNI, SET.PUB, SET.RESTAURANT, SET.GYM, SET.FAITH, SET.CHOIR, SET.CARE, SET.HOSP, SET.PATIENT, SET.GP].forEach(function (s) { pol.roomMult[s] *= 1 - 0.5 * e; });
          break;
        case 'hygiene':
          var ch = self.complianceOf(8) * e, hr = P.humanRoute;
          var k = hr === 'contact' || hr === 'gut' ? 0.35 : hr === 'droplet' ? 0.1 : 0.03;
          for (var s = 1; s < NSET; s++) pol.mult[s] *= 1 - k * ch;
          pol.foodMult *= 1 - 0.3 * ch;
          break;
        case 'food_safety': pol.foodMult *= 1 - 0.7 * e; pol.excludeIllFood = true; break;
        case 'wfh': comp(4); pol.wfh = 4; if (!pol.setRestr[SET.WORK]) pol.setRestr[SET.WORK] = []; any = true; break;
        case 'travel': comp(7); restr(SET.TRANSPORT, 7, 0.6); break;
        case 'lockdown':
          comp(5);
          C.places.forEach(function (p) { if (['pub', 'restaurant', 'gym', 'school', 'nursery', 'university', 'church', 'mosque', 'temple', 'gurdwara', 'choir', 'stadium', 'hotel', 'community_hall'].indexOf(p.kind) >= 0 || (p.kind === 'market' && p.sub === 'hall')) pol.closed[p.i] = 1; });
          pol.lockWork = 5; restr(SET.EVENT, 5, 1); restr(SET.SHOP, 5, 0.5); restr(SET.TRANSPORT, 5, 0.7);
          pol.visitMult *= 1 - 0.8 * self.complianceOf(5);
          hist.push({ sets: [SET.PUB, SET.RESTAURANT, SET.GYM, SET.SCHOOL, SET.NURSERY, SET.UNI, SET.FAITH, SET.CHOIR, SET.STADIUM, SET.EVENT] });
          break;
        case 'shielding': comp(6); pol.shield = 6; pol.shieldHH = true; pol.shieldGroup = (o.params && o.params.group) || 'both'; if (!pol.setRestr[SET.SHOP]) pol.setRestr[SET.SHOP] = []; any = true; break;
        case 'care_homes': pol.careRules = e; break;
        case 'hospital_ipc': pol.hospIPC = S.recognized ? e : e * 0.3; break;
        case 'treatment': pol.treatment = true; break;
      }
    });
    if (!any) pol.setRestr = null;
    // closure history (for reconstructing where people were in interviews)
    hist.forEach(function (h) {
      var last = S.closeHist.filter(function (q) { return q.place === h.place && JSON.stringify(q.sets) === JSON.stringify(h.sets) && q.to >= sd - 1; })[0];
      if (last) last.to = sd; else S.closeHist.push({ place: h.place, sets: h.sets, from: sd, to: sd });
    });
    // trial enrolment happens at admission inside the simulation
    if (S.trial && !S.trial.done && S.trial.closed === undefined) pol.trial = { open: true, n: S.trial.n, count: S.trial.enrolled.length };
    // vaccination
    pol.vaccinate = this.vaccineDoses(sd);
    return pol;
  };
  GP.orderEffectOf = function (o) {
    var age = this.S.day - o.since;
    if (o.lag <= 1 || ['surge', 'mass_testing', 'wastewater'].indexOf(o.type) >= 0) return age >= Math.max(1, o.lag) ? 1 : 0;
    return Math.max(0, Math.min(1, age / o.lag));
  };

  // ---------------------------------------------------------------- trust
  GP.trustOf = function (pid) { var C = this.C; return this.S.trust[C.dist[pid] * 3 + D.trustBand(C.age[pid])]; };
  GP.trustAll = function (delta, dist) {
    var T = this.S.trust;
    for (var i = 0; i < T.length; i++) if (dist === undefined || Math.floor(i / 3) === dist) T[i] = IX.clamp(T[i] + delta, 2, 98);
  };
  GP.trustSummary = function () {
    var S = this.S, C = this.C, byD = {}, byA = { '18-34': 0, '35-64': 0, '65+': 0 }, wA = [0, 0, 0], tot = 0, w = 0;
    C.districts.forEach(function (d, di) {
      var s = 0; for (var b = 0; b < 3; b++) { s += S.trust[di * 3 + b]; byA[D.TRUST_BANDS[b]] += S.trust[di * 3 + b] * d.pop; wA[b] += d.pop; }
      byD[d.id] = Math.round(s / 3); tot += s / 3 * d.pop; w += d.pop;
    });
    D.TRUST_BANDS.forEach(function (k, b) { byA[k] = Math.round(byA[k] / wA[b]); });
    return { overall: Math.round(tot / w), byDistrict: byD, byAge: byA };
  };
  GP.credit = function (delta, why) { this.S.credibility = IX.clamp(this.S.credibility + delta, 0, 100); this.S.credLog.push([this.S.day, delta, why]); };

  GP.trustDay = function () {
    var S = this.S, C = this.C, self = this;
    var nd = C.districts.length;
    // what the public can see: known cases and deaths in the last fortnight
    var known14 = 0;
    S.caseOrder.forEach(function (pid) { var cs = S.cases[pid]; if ((cs.status === 'confirmed' || cs.status === 'probable') && cs.reported >= S.day - 14) known14++; });
    var justify = Math.min(1, known14 / (12 * C.N / 8000) + (S.deathsReported || 0) / 6);
    var pain = 0;
    this.ordersActive().forEach(function (o) {
      var O = ORD[o.type]; if (!O.pain) return;
      var age = S.day - o.since;
      pain += O.pain * (1 + Math.max(0, age - 28) / 40);
    });
    var econPainD = [];
    for (var d = 0; d < nd; d++) {
      var dep = C.districts[d].deprivation;
      for (var b = 0; b < 3; b++) {
        var i = d * 3 + b, T = S.trust[i];
        var drift = 0.03 * (S.trust0[i] - T);
        var p = -0.035 * pain * (1 - 0.7 * justify) * (1 + 0.6 * dep) * (b === 2 ? 0.6 : 1);
        var rum = S.rumourShare ? S.rumourShare[i] || 0 : 0;
        var r = -0.25 * rum;
        var over = this.sim.hospNow > this.bedCap() ? -0.25 : 0;
        S.trust[i] = IX.clamp(T + drift + p + r + over, 2, 98);
      }
    }
  };

  // ---------------------------------------------------------------- rumours
  IX.RUMOURS = {
    water: { short: 'It\'s in the tap water', text: 'A voice note is going round the estates: a man who "works for the water board" says the illness is in the tap water and the council knows.', counter: 'The water company and the council published test results for every reservoir and treatment works; a well-known local GP recorded a video drinking a glass of tap water.', effect: 'Bottled water sold out; distrust of official advice.' },
    test: { short: 'The swabs spread it', text: 'Posts claim the test swabs are contaminated and "that\'s why everyone who gets tested gets ill".', counter: 'Lab staff explained on local radio how swabs are made and sterilised; test-site nurses answered questions at the market.', effect: 'Fewer people come forward for tests.' },
    coverup: { short: 'St Anne\'s is hiding deaths', text: 'A post by "a nurse at St Anne\'s" says the hospital is hiding deaths and bodies are being moved at night.', counter: 'The hospital published daily figures and invited the Echo onto a ward; staff spoke about what they are actually seeing.', effect: 'People refuse to talk to tracers; trust falls.' },
    remedy: { short: 'Hot lemon and whisky cures it', text: 'A remedy is doing the rounds: hot lemon, honey, garlic and a tot of whisky "knocks it on the head in a day".', counter: 'A pharmacist on local radio was kind about the lemon and firm about isolation.', effect: 'Some believers don\'t bother isolating.' },
    lab: { short: 'It escaped from the lab', text: 'People are saying the virus escaped from the laboratory on the university campus.', counter: 'The university published its incident logs and invited an independent inspection.', effect: 'Trust in public bodies falls.' },
    young: { short: 'Only the old and ill get it badly', text: 'The line on the student and gym-goer grapevine: it only really hurts the old and the already-ill, so the young can carry on.', counter: 'Young patients on ICU agreed to share their stories.', effect: 'Young adults comply less.' },
    vaccine: { short: 'The vaccine is dangerous', text: 'Claims that the new vaccine "was rushed" and "alters your DNA" are circulating in parents\' groups.', counter: 'GPs, faith leaders and the vaccine trial\'s local volunteers answered questions face to face.', effect: 'Vaccine uptake falls.' },
    blame: { short: 'It\'s the students', text: 'People are blaming the students for bringing it back and keeping it going; there have been ugly scenes outside a hall of residence.', counter: 'The council and the students\' union ran a joint campaign; the data show cases in every age group.', effect: 'Students stop coming forward for tests; trust falls in the University Quarter.' }
  };
  GP.rumourActive = function (kind) { return this.S.rumours.some(function (r) { return r.kind === kind && r.share > 0.02; }); };
  GP.rumourBelieves = function (kind, pid) { var r = this.S.rumours.filter(function (q) { return q.kind === kind; })[0]; return !!(r && r.bel[pid]); };
  GP.seedRumour = function (kind, district) {
    var S = this.S, C = this.C, K = this.keys.rum;
    if (S.rumours.some(function (r) { return r.kind === kind; })) return;
    var R = IX.RUMOURS[kind];
    var bel = new Uint8Array(C.N), n = 0;
    for (var i = 0; i < C.N && n < 12; i++) { var j = Math.floor(u(K, S.day, i, IX.hash(kind)) * C.N); if (district === undefined || C.dist[j] === district) { bel[j] = 1; n++; } }
    S.rumours.push({ id: 'R' + (S.rumours.length + 1), kind: kind, short: R.short, born: S.day, bel: bel, share: 0, reported: false, district: district });
  };
  GP.rumourDay = function () {
    var S = this.S, C = this.C, K = this.keys.rum, self = this;
    var nd = C.districts.length;
    var share = new Float32Array(nd * 3), cnt = new Float32Array(nd * 3);
    for (var a = 0; a < C.N; a++) cnt[C.dist[a] * 3 + D.trustBand(C.age[a])]++;
    S.rumours.forEach(function (r) {
      var B = r.bel, nb = new Uint8Array(B.length), tot = 0, damp = r.damp || 0;
      var pSpread = 0.022 * (1 - damp), pForget = 0.03 + 0.08 * damp, kh = IX.hash(r.kind);
      for (var i = 0; i < B.length; i++) {
        if (!B[i]) continue;
        if (u(K, i, S.day, 1) < pForget) continue;
        nb[i] = 1;
        for (var f = C.fStart[i]; f < C.fStart[i + 1]; f++) {
          var j = C.fList[f];
          if (B[j] || nb[j]) continue;
          var tr = self.trustOf(j) / 100;
          // only some people are open to a given rumour (fewer when they trust the authorities)
          if (u(K, j, kh, 77) >= 0.5 - 0.35 * tr) continue;
          if (u(K, i * 7 + 1, j, S.day) < pSpread * (1.4 - tr)) nb[j] = 1;
        }
      }
      for (i = 0; i < nb.length; i++) if (nb[i]) { tot++; share[C.dist[i] * 3 + D.trustBand(C.age[i])] += 1; }
      r.bel = nb; r.share = tot / C.N;
      r.damp = Math.max(0, damp - 0.03);
      if (!r.reported && r.share > 0.015) {
        r.reported = S.day;
        var R = IX.RUMOURS[r.kind];
        self.msg('rumour', 'Rumour: "' + r.short + '"', 'Community engagement team', [R.text, { k: 'n', x: ['Roughly ' + (100 * r.share).toFixed(0) + '% of people have heard it and half-believe it. ' + R.effect] }]);
        S.pressQueue.push({ kind: 'rumour', rumour: r.kind });
      }
    });
    for (var q = 0; q < share.length; q++) share[q] = cnt[q] ? Math.min(1, share[q] / cnt[q]) : 0;
    S.rumourShare = Array.prototype.slice.call(share);
  };
  GP.rumourTriggers = function () {
    var S = this.S, C = this.C, P = this.P;
    if (!S.recognized) return;
    var d = S.day - S.recognizedDay;
    if ((S.deathsReported || 0) >= 2 && u(this.keys.rum, 1, S.day, 0) < 0.05) this.seedRumour('coverup');
    if (d > 5 && (P.family === 'gut' || S.caseOrder.length > 20) && u(this.keys.rum, 2, S.day, 0) < 0.03) this.seedRumour('water', C.districts.filter(function (q) { return q.type === 'estate'; })[0] ? C.districts.filter(function (q) { return q.type === 'estate'; })[0].i : undefined);
    if ((this.orderActive('mass_testing') || S.testsCap > 60) && u(this.keys.rum, 3, S.day, 0) < 0.03) this.seedRumour('test');
    if (d > 8 && u(this.keys.rum, 4, S.day, 0) < (P.source === 'lab' ? 0.04 : 0.015)) this.seedRumour('lab');
    if (d > 10 && P.ageRisk === 'elderly' && u(this.keys.rum, 5, S.day, 0) < 0.03) this.seedRumour('young');
    if (d > 3 && u(this.keys.rum, 6, S.day, 0) < 0.02) this.seedRumour('remedy');
    if (S.vaccine && S.vaccine.status !== 'developing' && u(this.keys.rum, 7, S.day, 0) < 0.08) this.seedRumour('vaccine');
    var stud = C.districts.filter(function (q) { return q.type === 'student'; })[0];
    if (d > 12 && stud && u(this.keys.rum, 8, S.day, 0) < 0.012) this.seedRumour('blame', stud.i);
  };

  // ---------------------------------------------------------------- estimates
  IX.TRAITS = [
    { id: 'route', label: 'Route of spread', type: 'choice', options: D.ROUTES.slice(), key: true },
    { id: 'incubation', label: 'Incubation period (mean, days)', type: 'number', min: 1, max: 21, unit: 'days', key: true },
    { id: 'presym', label: 'Transmission before symptoms', type: 'percent', min: 0, max: 100, unit: '%', key: true },
    { id: 'asym', label: 'Infections never symptomatic', type: 'percent', min: 0, max: 100, unit: '%', key: true },
    { id: 'R', label: 'Reproduction number (R0)', type: 'number', min: 0.5, max: 8, key: true },
    { id: 'ifr', label: 'Infection fatality rate', type: 'percent', min: 0, max: 50, unit: '%', key: true },
    { id: 'ageRisk', label: 'Who it hits hardest', type: 'choice', options: D.AGE_SHAPES.slice(), key: true },
    { id: 'ihr', label: 'Infections hospitalised', type: 'percent', min: 0, max: 100, unit: '%', key: false },
    { id: 'source', label: 'Source', type: 'choice', options: D.SOURCES.slice(), key: false },
    { id: 'originCase', label: 'First case (primary)', type: 'person', key: false },
    { id: 'treatment', label: 'Existing drug helps', type: 'choice', options: D.TREATMENTS.slice(), key: false },
    { id: 'caseDef', label: 'Case definition (symptoms)', type: 'symptoms', key: false }
  ];
  IX.KEY_TRAITS = IX.TRAITS.filter(function (t) { return t.key; }).map(function (t) { return t.id; });
  GP.estimates = function () {
    var S = this.S;
    return { traits: IX.clone(IX.TRAITS), draft: IX.clone(S.draft), published: IX.clone(S.published), history: IX.clone(S.estHistory) };
  };
  GP.setDraft = function (trait, value) { this.S.draft[trait] = value; };

  /** is an estimate close enough to the truth (used for trust checks, the cure clock and the debrief) */
  GP.estimateError = function (trait, value) {
    var T = this.truthCard();
    var t = T[trait];
    if (value === null || value === undefined) return null;
    switch (trait) {
      case 'route': return value === T.route ? 0 : (value === T.humanRoute ? 0.3 : 1);
      case 'ageRisk': return value === t ? 0 : 1;
      case 'source': return value === t ? 0 : 1;
      case 'treatment': return value === t ? 0 : (Math.abs(D.TREATMENTS.indexOf(value) - D.TREATMENTS.indexOf(t)) === 1 ? 0.5 : 1);
      case 'originCase': return +value === T.originCase ? 0 : 1;
      case 'caseDef': return 0;
      case 'incubation': return Math.min(1, Math.abs(value - t) / Math.max(2, 0.5 * t));
      case 'presym': return Math.min(1, Math.abs(value - t) / 40);
      case 'asym': return Math.min(1, Math.abs(value - t) / 30);
      case 'R': return Math.min(1, Math.abs(value - t) / Math.max(0.5, 0.4 * t));
      case 'ifr': case 'ihr': return Math.min(1, Math.abs(Math.log(Math.max(0.01, value) / Math.max(0.01, t))) / (2 * Math.log(2)));
    }
    return null;
  };
  GP.publish = function (vals) {
    var S = this.S, self = this;
    this._fresh = [];
    var changed = [], revised = [];
    Object.keys(vals || {}).forEach(function (k) {
      var tr = IX.TRAITS.filter(function (t) { return t.id === k; })[0];
      if (!tr) return;
      var v = vals[k];
      if (tr.type === 'number' || tr.type === 'percent') { v = +v; if (!isFinite(v)) return; v = IX.clamp(v, tr.min, tr.max); }
      if (tr.type === 'choice' && tr.options.indexOf(v) < 0) return;
      if (tr.type === 'symptoms') { v = (v || []).filter(function (s) { return D.SYM[s]; }); S.caseDef = v; }
      var prev = S.published[k];
      if (prev && JSON.stringify(prev.value) === JSON.stringify(v)) return;
      S.published[k] = { value: v, day: S.day, revisions: prev ? prev.revisions + 1 : 0, first: prev ? prev.first : S.day };
      S.estHistory.push({ day: S.day, trait: k, value: v });
      changed.push(k); if (prev) revised.push(k);
      S.draft[k] = v;
    });
    if (!changed.length) { this._fresh = null; return { ok: false, msgs: [], err: 'Nothing new to publish.' }; }
    var dT = -0.8 * revised.length;
    if (dT) this.trustAll(dT);
    var labels = changed.map(function (k) { return self.estLabel(k, S.published[k].value); });
    this.msg('press', revised.length ? 'Estimates revised' : 'Estimates published', 'Press office', [
      'Published today: ' + labels.join('; ') + '.',
      revised.length ? { k: 'n', x: ['Revising in public costs a little trust now. Being wrong for weeks costs a lot more later.'] } : { k: 'n', x: ['The council, the hospital and the Echo will all hold you to these numbers.'] }]);
    S.pressQueue.push({ kind: 'estimates', traits: changed, revised: revised.length > 0 });
    this.checkCureClock();
    var msgs = this._fresh; this._fresh = null;
    return { ok: true, msgs: msgs, trust: this.trustSummary().overall };
  };
  GP.estLabel = function (k, v) {
    switch (k) {
      case 'route': return 'spread by ' + D.ROUTE_LABEL[v];
      case 'incubation': return 'incubation about ' + v + ' days';
      case 'presym': return 'about ' + v + '% of transmission before symptoms';
      case 'asym': return 'about ' + v + '% never get symptoms';
      case 'R': return 'R about ' + v;
      case 'ifr': return 'about ' + v + '% of those infected die';
      case 'ihr': return 'about ' + v + '% of those infected need hospital';
      case 'ageRisk': return 'hits ' + ({ elderly: 'the elderly', 'young-adult': 'young adults', children: 'children', even: 'all ages' }[v]) + ' hardest';
      case 'source': return 'source: ' + v;
      case 'originCase': return 'first case identified';
      case 'treatment': return 'existing drug: ' + v;
      case 'caseDef': return 'case definition: ' + (v || []).map(function (s) { return D.SYM[s].label; }).join(', ');
    }
    return k;
  };
  /** independent modellers check your published numbers every fortnight */
  GP.estimateChecks = function () {
    var S = this.S, self = this;
    if (!S.recognized) return;
    var due = Object.keys(S.published).filter(function (k) { var p = S.published[k]; return IX.KEY_TRAITS.indexOf(k) >= 0 && S.day - p.day >= 14 && (p.checked === undefined || S.day - p.checked >= 21); });
    if (!due.length || this.cal.weekday(S.day) !== 4) return;
    var good = [], bad = [];
    due.forEach(function (k) { var p = S.published[k]; p.checked = S.day; var e = self.estimateError(k, p.value); if (e <= 0.35) good.push(k); else if (e >= 0.75) bad.push(k); });
    if (!good.length && !bad.length) return;
    this.trustAll(1.2 * good.length - 1.5 * bad.length);
    this.credit(2 * good.length - 1.5 * bad.length, 'estimates checked');
    var lines = [];
    if (good.length) lines.push('Modellers at the university say the data now support your figures for ' + good.map(function (k) { return self.traitLabel(k); }).join(', ') + '.');
    if (bad.length) lines.push('They also say the data no longer fit your ' + bad.map(function (k) { return self.traitLabel(k); }).join(', ') + '. The Echo has noticed.');
    this.msg('press', bad.length ? 'Modellers question published estimates' : 'Modellers back your estimates', this.paperName(), lines);
  };
  GP.traitLabel = function (k) { return (IX.TRAITS.filter(function (t) { return t.id === k; })[0] || { label: k }).label.toLowerCase(); };

  // ---------------------------------------------------------------- the cure clock and vaccination
  GP.checkCureClock = function () {
    var S = this.S, self = this;
    if (S.vaccine || S.seqPublished === undefined) return;
    // developers need the genome and at least a start on the disease itself: two key traits published
    if (IX.KEY_TRAITS.filter(function (k) { return S.published[k]; }).length < 2) return;
    // the better the characterisation, the sooner it lands (unpublished traits count as wrong)
    var err = 0;
    IX.KEY_TRAITS.forEach(function (k) { var p = S.published[k]; err += p ? self.estimateError(k, p.value) : 1; });
    var base = this.grades().vaccineBase;
    var eta = S.day + Math.round(base + 7 * err);
    S.vaccine = { status: 'developing', start: S.day, eta: eta, err: IX.round(err, 2) };
    this.msg('lab', 'The cure clock has started', 'UK Health Security Agency', ['With the genome and your characterisation published, three vaccine developers and a drugs repurposing consortium have started work on ' + S.agentName + '.',
      'Their current estimate: doses could reach ' + this.C.name + ' around ' + this.dateLong(eta) + '. Better estimates (the ones you have not published yet, or the ones that are wrong) would bring that forward.'], { urgent: true });
  };
  GP.updateCureClock = function () {
    var S = this.S, self = this;
    var V = S.vaccine;
    if (!V || V.status !== 'developing') return;
    var err = 0;
    IX.KEY_TRAITS.forEach(function (k) { var p = S.published[k]; err += p ? self.estimateError(k, p.value) : 1; });
    var eta = V.start + Math.round(this.grades().vaccineBase + 7 * err);
    if (eta < V.eta - 1) { V.eta = Math.max(S.day + 7, eta); this.msg('lab', 'Vaccine timeline brought forward', 'UK Health Security Agency', ['Better characterisation means developers can skip some work. Doses now expected around ' + this.dateLong(V.eta) + '.']); }
    if (S.day === V.eta - 30) this.msg('press', 'Vaccine shows promise in trials', this.paperName(), ['Early results from the ' + S.agentName + ' vaccine trial look good, the developers say. Approval could come within a month.']);
    if (S.day >= V.eta) {
      V.status = 'rollout'; V.perDay = Math.round(0.02 * this.C.N); V.done = 0; V.arrived = S.day;
      this.msg('lab', 'Vaccine approved: doses arriving', 'UK Health Security Agency', ['The first ' + IX.fmt(V.perDay * this.C.scale) + ' doses a day are arriving in ' + this.C.name + ' from today. Set the priority order (PROTECT → Vaccination programme).', { k: 'n', x: ['About two-thirds protection against infection and more against severe illness, two weeks after the dose.'] }], { urgent: true });
      this.trustAll(4);
      S.pressQueue.push({ kind: 'vaccine' });
    }
  };
  GP.vaccinePriority = function (g) {
    var C = this.C;
    return function (a) {
      var age = C.age[a], f = C.flags[a];
      switch (g) {
        case 'care': return !!(f & (FLAG.CARE_RES | FLAG.CARE_WORKER));
        case 'hcw': return !!(f & FLAG.HCW);
        case '80': return age >= 80;
        case '70': return age >= 70 && age < 80;
        case 'vulnerable': return !!(f & FLAG.VULNERABLE) && age >= 16;
        case '50': return age >= 50 && age < 70;
        case 'adults': return age >= 18 && age < 50;
        case 'children': return age >= 5 && age < 18;
        case 'deprived': return C.districts[C.dist[a]].deprivation >= 0.6 && age >= 18;
      }
      return false;
    };
  };
  GP.vaccineDoses = function (sd) {
    var S = this.S, V = S.vaccine, C = this.C, sim = this.sim, K = this.keys.vac, self = this;
    if (!V || V.status !== 'rollout') return null;
    var o = this.ordersOf('vaccinate')[0];
    if (!o) return null;
    if (!V.queue) {
      var pr = o.params.priority, seen = new Uint8Array(C.N), q = [];
      var deprivedFirst = pr.indexOf('deprived') >= 0;
      pr.forEach(function (gname) {
        if (gname === 'deprived') return;
        var f = self.vaccinePriority(gname), L = [];
        for (var a = 0; a < C.N; a++) if (!seen[a] && f(a)) { seen[a] = 1; L.push(a); }
        if (deprivedFirst) L.sort(function (x, y) { return C.districts[C.dist[y]].deprivation - C.districts[C.dist[x]].deprivation || x - y; });
        q = q.concat(L);
      });
      V.queue = q; V.ptr = V.ptr || 0; V.eligible = q.length;
    }
    var out = [], n = V.perDay;
    while (out.length < n && V.ptr < V.queue.length) {
      var a = V.queue[V.ptr++];
      if (sim.st[a] === ST.D || sim.vac[a] > -30000) continue;
      var uptake = 0.55 + 0.4 * this.trustOf(a) / 100 + (C.age[a] >= 65 ? 0.1 : 0) - (this.rumourBelieves('vaccine', a) ? 0.45 : 0);
      if (u(K, a, 1, 0) >= uptake) continue;
      out.push(a);
    }
    V.done += out.length;
    if (V.ptr >= V.queue.length && V.status === 'rollout') { V.status = 'done'; V.doneDay = S.day; }
    return out;
  };

  // ---------------------------------------------------------------- council, mayor, press
  IX.PEOPLE = {
    mayor: { name: 'Cllr Denise Mottram', title: 'Mayor' },
    leader: { name: 'Cllr Graham Pettifer', title: 'Leader of the Council' },
    chief: { name: 'Sandra Okafor-Hughes', title: 'Chief Executive' },
    nhs: { name: 'Dr Imran Siddiqui', title: 'Chief Executive, St Anne\'s' },
    chamber: { name: 'Julian Brammer', title: 'Chamber of Commerce' },
    heads: { name: 'Mrs Rachel Holroyd', title: 'Headteachers\' representative' },
    opp: { name: 'Cllr Bev Lister', title: 'Leader of the Opposition' }
  };
  GP.paperName = function () { return this.C.name + ' ' + ['Echo', 'Evening Post', 'Gazette'][IX.h3(this.keys.misc, 11, 0, 0) % 3]; };

  GP.councilDay = function () {
    var S = this.S, C = this.C, self = this, PE = IX.PEOPLE;
    if (this.cal.weekday(S.day) !== 1 || !S.alerted || S.day < 2) return;
    var wk = this.weekStats();
    var lines = [{ k: 'h', x: ['Minutes: Emergency Response Committee'] }];
    lines.push({ k: 'n', x: ['Present: ' + PE.mayor.name + ' (chair), ' + PE.leader.name + ', ' + PE.opp.name + ', ' + PE.chief.name + ', ' + PE.nhs.name + ', ' + PE.chamber.name + ', ' + PE.heads.name + ', and you (Director of Public Health).'] });
    lines.push('1. Situation. The Director reported ' + wk.cases + ' new known cases in the past week (' + wk.casesPrev + ' the week before), ' + wk.adm + ' admissions and ' + wk.deaths + ' deaths. St Anne\'s has ' + this.sim.hospNow + ' patients with the illness (' + this.bedCap() + ' beds set aside).');
    // pressures
    var act = this.ordersActive(), restrictive = act.filter(function (o) { return RESTRICTIVE.indexOf(o.type) >= 0; });
    var choices = null, meta = null;
    var lastAsk = S.councilAsked || -99;
    if (restrictive.length && wk.cases < 0.8 * wk.casesPrev && S.day - lastAsk >= 14 && S.day - Math.max.apply(null, restrictive.map(function (o) { return o.since; })) > 13) {
      S.councilAsked = S.day;
      var target = restrictive.filter(function (o) { return o.type === 'lockdown'; })[0] || restrictive.filter(function (o) { return o.type === 'close_hospitality'; })[0] || restrictive.filter(function (o) { return o.type === 'close_schools'; })[0] || restrictive[0];
      lines.push('2. ' + PE.chamber.name + ' said footfall in the town centre is down ' + (20 + (S.day % 7) * 5) + '% and three businesses on Market Street have closed for good. ' + PE.leader.name + ' asked the Director to lift the ' + ORD[target.type].label.toLowerCase() + ' "now that cases are falling".');
      choices = [{ id: 'lift', label: 'Agree to lift it', hint: 'Council goodwill; the curve may turn' }, { id: 'hold', label: 'Hold for another fortnight', hint: 'Costs credibility with the council' }];
      meta = { ask: 'lift', order: target.id };
    } else if (this.sim.hospNow > 0.8 * this.bedCap() && !this.orderActive('surge')) {
      lines.push('2. ' + PE.nhs.name + ' warned that St Anne\'s will run out of beds for the illness within days and asked for surge funding and "a decision about the city, not just the hospital".');
      choices = [{ id: 'surge', label: 'Fund the surge now', hint: 'Order a hospital surge' }, { id: 'wait', label: 'Not yet', hint: 'The hospital will remember' }];
      meta = { ask: 'surge' };
    } else if (this.orderActive('close_schools') && S.day - this.ordersOf('close_schools')[0].since > 14) {
      lines.push('2. ' + PE.heads.name + ' reported that attendance at the food bank has doubled since the schools closed and asked when children can go back.');
      choices = [{ id: 'reopen', label: 'Reopen schools next week', hint: 'Parents relieved' }, { id: 'hold', label: 'Not yet', hint: 'Trust among parents falls' }];
      meta = { ask: 'schools' };
    } else {
      var opts2 = [
        PE.opp.name + ' asked whether the council had "a plan, or just a spreadsheet". ' + PE.mayor.name + ' asked her to keep it civil.',
        PE.heads.name + ' asked for clear advice for schools on what to do when a child is sent home ill. The Director agreed to issue it this week.',
        PE.nhs.name + ' reported that staff sickness at St Anne\'s is at ' + (6 + (S.day % 5)) + '% and rising, and asked members to remember that "the hospital is people".',
        PE.chamber.name + ' reported that the Christmas market stallholders want to know whether to order stock. The Director said the data would decide, and the data are not yet in.',
        PE.leader.name + ' asked how the city compares with its neighbours. The Director said the virus does not read league tables.'
      ];
      lines.push('2. ' + opts2[(S.day / 7 | 0) % opts2.length]);
      var qi = S.councilQuips || (S.councilQuips = []);
      var qs = IX.DATA.TEXT.council_quip, pick = null;
      for (var qk = 0; qk < qs.length; qk++) { var cand = (IX.h3(this.keys.text, S.day, qk, 3) + qk) % qs.length; if (qi.indexOf(cand) < 0) { pick = cand; break; } }
      if (pick !== null && u(this.keys.text, S.day, 5, 0) < 0.7) { qi.push(pick); lines.push('   ' + qs[pick]); }
    }
    // funding requests
    var reqs = S.fundingRequests.filter(function (r) { return !r.decided; });
    if (reqs.length) {
      var sev = Math.min(1, (wk.adm + 3 * wk.deaths) / (6 * C.N / 8000) + (S.recognized ? 0.2 : 0));
      var frac = IX.clamp(0.25 + 0.5 * S.credibility / 100 + 0.4 * sev, 0.1, 1);
      reqs.forEach(function (r) {
        r.decided = S.day;
        var money = Math.round(r.money * frac / 10) * 10, staff = Math.round(r.staff * frac);
        S.funding += money;
        if (staff) { var per = Math.ceil(staff / 3); S.hires.push({ kind: 'tracers', n: staff - 2 * Math.floor(staff / 3), arrive: S.day + 4 }); if (staff >= 3) { S.hires.push({ kind: 'field', n: Math.floor(staff / 3), arrive: S.day + 4 }); S.hires.push({ kind: 'analysts', n: Math.floor(staff / 3), arrive: S.day + 4 }); } }
        r.granted = { money: money, staff: staff };
        lines.push('3. Funding. The committee ' + (frac > 0.9 ? 'approved the Director\'s request in full' : frac > 0.5 ? 'approved most of the Director\'s request' : 'approved part of the Director\'s request') + ': £' + IX.fmt(money) + 'k and ' + staff + ' staff (starting ' + self.dateLabel(S.day + 4) + ').');
      });
    }
    lines.push({ k: 'n', x: ['Next meeting: ' + this.dateLabel(S.day + 7) + '.'] });
    this.msg('council', 'Council committee, ' + this.dateLabel(S.day), 'Council secretariat', lines, { choices: choices, meta: meta });
  };
  GP.weekStats = function () {
    var S = this.S, o = { cases: 0, casesPrev: 0, adm: 0, deaths: 0 };
    S.caseOrder.forEach(function (pid) { var cs = S.cases[pid]; if (cs.status !== 'confirmed' && cs.status !== 'probable') return; if (cs.reported >= S.day - 7) o.cases++; else if (cs.reported >= S.day - 14) o.casesPrev++; });
    for (var d = S.day - 7; d < S.day; d++) { o.adm += S.series.adm[d - S.from] || 0; o.deaths += S.series.deaths[d - S.from] || 0; }
    return o;
  };

  GP.answer = function (msgId, choiceId) {
    var S = this.S, m = S.msgs.filter(function (q) { return q.id === msgId; })[0];
    if (!m || !m.choices) return { ok: false, msgs: [], err: 'Nothing to answer.' };
    if (m.answered) return { ok: false, msgs: [], err: 'Already answered.' };
    if (!m.choices.some(function (c) { return c.id === choiceId; })) return { ok: false, msgs: [], err: 'Not one of the choices.' };
    this._fresh = [];
    m.answered = choiceId;
    S.log.push([S.day, 'answer', msgId, choiceId]);
    var meta = m.meta || {}, self = this, PE = IX.PEOPLE;
    if (meta.ask === 'lift') {
      if (choiceId === 'lift') { var o = S.orders.filter(function (q) { return q.id === meta.order; })[0]; if (o && o.until === undefined) this.revoke(o.id); this.credit(4, 'council'); this.trustAll(1); }
      else { this.credit(-2, 'council'); }
    } else if (meta.ask === 'surge') {
      if (choiceId === 'surge') { if (!this.orderActive('surge') && !this.ordersOf('surge').length) this.order('surge', {}); this.credit(2, 'hospital'); } else this.credit(-3, 'hospital');
    } else if (meta.ask === 'schools') {
      if (choiceId === 'reopen') { var sc = this.ordersOf('close_schools')[0]; if (sc) this.revoke(sc.id); this.trustAll(1.5); } else { this.trustAll(-1); }
    } else if (meta.ask === 'mayor') {
      var r = IX.MAYOR_REPLIES[meta.topic] && IX.MAYOR_REPLIES[meta.topic][choiceId];
      if (r) { this.credit(r.cred || 0, 'mayor'); if (r.trust) this.trustAll(r.trust); this.msg('mayor', 'The Mayor', PE.mayor.name, [{ k: 'q', x: [r.reply] }]); }
    }
    var msgs = this._fresh; this._fresh = null;
    return { ok: true, msgs: msgs };
  };

  IX.MAYOR_CALLS = {
    firstDeath: { q: 'I\'ve just had the family of the man who died on the phone. They want to know if anyone knew this was coming. I need to know what I can say to them, and to everyone else, by six o\'clock.', choices: [{ id: 'straight', label: 'Tell it straight: what we know and don\'t' }, { id: 'reassure', label: 'Reassure: it\'s under control' }] },
    lockdown: { q: 'A lockdown. You know what that does to this city? Half the people I represent are one pay packet from the food bank. Convince me.', choices: [{ id: 'data', label: 'Walk through the numbers' }, { id: 'short', label: 'Promise it will be short' }] },
    schools: { q: 'Closing the schools. I\'ve had forty emails in an hour, and those are the polite ones. When do they reopen?', choices: [{ id: 'depends', label: 'When the data say so' }, { id: 'date', label: 'Give a date: two weeks' }] },
    press: { q: 'Have you seen the Echo this morning? Why am I reading about this in the paper before I hear it from you?', choices: [{ id: 'sorry', label: 'Apologise; promise daily updates' }, { id: 'busy', label: 'Point out you have been rather busy' }] },
    beds: { q: 'Imran says St Anne\'s is nearly full. What is the plan if it fills? I want a plan, not a prayer.', choices: [{ id: 'surge', label: 'Surge beds and restrictions' }, { id: 'transfer', label: 'Transfers to other hospitals' }] }
  };
  IX.MAYOR_REPLIES = {
    firstDeath: { straight: { cred: 3, trust: 1, reply: 'All right. I\'d rather that than be made a liar of next week. Send me the lines.' }, reassure: { cred: -2, trust: -1, reply: 'Under control. I\'ll say that, then. I hope you\'re right, for both our sakes.' } },
    lockdown: { data: { cred: 2, reply: 'I don\'t like it. But I can\'t argue with that curve. Two weeks, then we look again, together.' }, short: { cred: -3, reply: 'I\'ll hold you to "short". People will.' } },
    schools: { depends: { cred: 1, trust: -0.5, reply: 'That\'s not an answer a parent wants. But it\'s honest.' }, date: { cred: -2, trust: 0.5, reply: 'Two weeks. Good. Don\'t make me say it twice.' } },
    press: { sorry: { cred: 2, reply: 'Daily. Eight in the morning. Thank you.' }, busy: { cred: -4, reply: 'We\'re all busy. Some of us still pick up the phone.' } },
    beds: { surge: { cred: 2, reply: 'Fine. Do it. I\'ll find the money somewhere.' }, transfer: { cred: -1, reply: 'Every other hospital in the region is saying the same thing, apparently. Think again.' } }
  };
  GP.mayorDay = function () {
    var S = this.S, self = this;
    var q = S.mayorQueue.shift();
    var topic = null;
    if (q) topic = q.kind === 'order' ? (q.type === 'lockdown' ? 'lockdown' : 'schools') : q.kind;
    if (!topic && (S.deathsReported || 0) >= 1 && !S.mayorDone.firstDeath) topic = 'firstDeath';
    if (!topic && this.sim.hospNow > 0.85 * this.bedCap() && !S.mayorDone.beds) topic = 'beds';
    if (!topic || S.mayorDone[topic]) return;
    S.mayorDone[topic] = S.day;
    var c = IX.MAYOR_CALLS[topic];
    this.msg('mayor', 'The Mayor is on the phone', IX.PEOPLE.mayor.name, [{ k: 'q', x: [c.q] }], { urgent: true, choices: c.choices, meta: { ask: 'mayor', topic: topic } });
  };

  IX.DATA.TEXT.council_quip = [
    'Cllr Pettifer asked whether the virus could be asked to observe the half-term holiday. The Director undertook to put it to the virus.',
    'The Chief Executive reminded members that the meeting was being streamed and that the chat function was not the place for that sort of language.',
    'The Chamber of Commerce proposed a "Shop Safe" logo. A draft was circulated. It was felt the mask on the cartoon sheep was upside down.',
    'The Leader of the Opposition asked why the figures in the Echo differed from the figures in the papers. The Director explained, not for the first time, about reporting delays.',
    'Members noted the tea urn in the council chamber had been removed on public health advice, and several expressed regret.',
    'Cllr Lister asked whether the Director had considered simply testing everyone. The Director confirmed that the idea had been considered, briefly.',
    'Cllr Pettifer wondered aloud whether "all this" might be over by Christmas. Nobody answered.',
    'The Leader asked for "fewer graphs and more answers". The Director offered one graph that answered the question. It was accepted.',
    'A resident\'s question about whether the virus could survive on bus tickets was referred to the Director, who said it would rather not.',
    'Mrs Holroyd reported that a Year 3 class had written to the Director. The letters were minuted as "encouraging, mostly".',
    'The Chamber of Commerce asked for a date. Any date. The chair noted the request.'
  ];

  GP.pressDay = function () {
    var S = this.S, C = this.C, self = this;
    if (!S.alerted) return;
    var paper = this.paperName();
    var item = S.pressQueue.shift();
    var story = null;
    // leaks: the paper finds a cluster the player has not linked
    if (!item && S.day >= 2 && S.day - (S.lastLeak || -99) >= 7 && u(this.keys.press, S.day, 1, 0) < 0.1) {
      var leak = this.findUnseenCluster();
      if (leak) { item = { kind: 'leak', place: leak.place, n: leak.n }; S.lastLeak = S.day; }
    }
    if (!item) return;
    switch (item.kind) {
      case 'leak': story = { h: IX.pickText(this, 'hl_leak', item.place, { place: C.places[item.place].name, n: item.n }), b: ['Parents and staff at ', this.plref(item.place), ' say at least ' + item.n + ' people there have been ill in the past fortnight. "Nobody from the council has been in touch," said one.'], mayor: 'press' }; break;
      case 'order':
        var pubs = C.places.filter(function (q) { return q.kind === 'pub'; }), pubN = pubs.length ? pubs[S.day % pubs.length].name : 'the Red Lion';
        var vars = { place: item.place !== undefined ? C.places[item.place].name : '', pub: pubN };
        story = { h: IX.pickText(this, 'hl_' + item.type, S.day, vars).toUpperCase(), b: [IX.pickText(this, 'pb_' + item.type, S.day, vars)] }; break;
      case 'rumour': story = { h: IX.pickText(this, 'hl_rumour', S.day, { r: IX.RUMOURS[item.rumour].short }), b: [IX.RUMOURS[item.rumour].text] }; break;
      case 'estimates': story = { h: item.revised ? IX.pickText(this, 'hl_revise', S.day, {}) : this.estimateHeadline(item.traits[0], S.published[item.traits[0]].value), b: ['The Director of Public Health published new figures on ' + (S.agentName || 'the illness') + ' yesterday: ' + item.traits.map(function (k) { return self.estLabel(k, S.published[k].value); }).join('; ') + '.'] }; break;
      case 'vaccine': story = { h: 'JAB DAY: FIRST DOSES ARRIVE', b: ['The first vaccines against ' + S.agentName + ' arrived at St Anne\'s last night under police escort. "I cried," said one nurse.'] }; break;
      case 'death': story = { h: item.n === 1 ? 'FIRST DEATH FROM MYSTERY BUG' : item.n + ' DEAD: CITY MOURNS', b: [item.n === 1 ? 'Tributes have been paid to ' + item.name + ', ' + item.age + ', the first person known to have died.' : 'The death toll from ' + (S.agentName || 'the illness') + ' has reached ' + item.n + '.'] }; break;
      case 'agent': story = { h: 'NEW VIRUS: WHAT WE KNOW', b: ['Scientists have identified a previously unknown virus, ' + S.agentName + ', behind the illness. The Director of Public Health said it was "too early to say" how it spreads.'] }; break;
      case 'variant': story = { h: 'NEW STRAIN FEARS', b: ['Scientists are watching a new branch of ' + S.agentName + ' that appears to be spreading faster than the rest.'] }; break;
    }
    if (!story) return;
    story.h = story.h.toUpperCase();
    this.msg('press', story.h, paper, [{ k: 'h', x: [story.h] }, story.b], { meta: { place: item.place } });
    if (story.mayor) S.mayorQueue.push({ kind: story.mayor });
    if (item.kind === 'leak') { this.credit(-1, 'press got there first'); this.trustAll(-0.3); }
  };
  GP.estimateHeadline = function (k, v) {
    switch (k) {
      case 'caseDef': return (v && v.length ? D.SYM[v[0]].label.toUpperCase() : 'SYMPTOMS') + ': THE SIGNS TO WATCH FOR';
      case 'R': return v >= 1.5 ? 'EACH CASE "INFECTS ' + (v >= 2.5 ? 'TWO OR THREE' : 'ONE OR TWO') + ' OTHERS"' : 'VIRUS SPREADING "SLOWLY", SAYS HEALTH CHIEF';
      case 'route': return { airborne: '"IT\'S IN THE AIR": VENTILATION WARNING', droplet: 'KEEP YOUR DISTANCE, SAYS HEALTH CHIEF', contact: 'HANDS, NOT AIR: HOW THE VIRUS SPREADS', gut: 'WASH YOUR HANDS: BUG SPREADS THROUGH FOOD', animal: 'ANIMALS BLAMED FOR OUTBREAK' }[v];
      case 'incubation': return 'VIRUS "CAN HIDE FOR ' + Math.round(v) + ' DAYS"';
      case 'presym': return v >= 25 ? 'YOU CAN SPREAD IT BEFORE YOU FEEL ILL' : 'MOST SPREAD "AFTER SYMPTOMS START"';
      case 'asym': return v >= 30 ? '"MANY WHO CATCH IT NEVER KNOW"' : 'MOST WHO CATCH IT FALL ILL, SAY EXPERTS';
      case 'ifr': return v >= 1 ? 'DEATH RATE "AROUND ' + IX.round(v, 1) + ' IN 100"' : 'MOST WILL RECOVER, SAYS HEALTH CHIEF';
      case 'ageRisk': return { elderly: 'ELDERLY MOST AT RISK', 'young-adult': 'YOUNG ADULTS "HIT HARDEST"', children: 'CHILDREN MOST AT RISK, PARENTS WARNED', even: '"NO AGE GROUP IS SAFE"' }[v];
    }
    return 'NEW FIGURES ON THE VIRUS';
  };
  GP.findUnseenCluster = function () {
    var S = this.S, sim = this.sim, C = this.C, sd = this.sdOf(S.day) - 1, byP = {};
    for (var x = 0; x < sim.n; x++) {
      var on = sim.xonset[x]; if (on < 0 || on > sd || on < sd - 14) continue;
      var k = this.clusterKey(x); if (k < 0 || k === C.hospital) continue;
      (byP[k] = byP[k] || []).push(sim.xwho[x]);
    }
    var best = null;
    Object.keys(byP).forEach(function (k) {
      var L = byP[k]; if (L.length < 4) return;
      if (S.pressLeaked[k]) return;
      var known = L.filter(function (p) { return S.cases[p]; }).length;
      if (known >= 2) return;
      if (!best || L.length > best.n) best = { place: +k, n: L.length };
    });
    if (best) S.pressLeaked[best.place] = S.day;
    return best;
  };
  var TX = IX.DATA.TEXT;
  TX.hl_leak = ['MYSTERY ILLNESS AT {place}', '"WHY WON\'T ANYONE TELL US?" — {place} ILLNESS FEARS', '{n} STRUCK DOWN AT {place}'];
  TX.hl_close_schools = ['SCHOOLS SHUT: PARENTS IN CHILDCARE SCRAMBLE', 'CLASS DISMISSED'];
  TX.pb_close_schools = ['Every school and nursery in the city closes from tomorrow. "I work nights at the distribution centre. Who is supposed to have my kids?" said one mother.'];
  TX.hl_close_hospitality = ['LAST ORDERS', 'PUBS CALL TIME: LANDLORDS FURIOUS'];
  TX.pb_close_hospitality = ['Pubs, restaurants and gyms close from tomorrow. The landlord of {pub} said he had "just bought forty kilos of chips".', 'Pubs, restaurants and gyms close from tomorrow. At {pub}, regulars held what one called "a wake for the darts league".'];
  TX.hl_lockdown = ['CITY IN LOCKDOWN', 'STAY HOME: CITY GRINDS TO A HALT'];
  TX.pb_lockdown = ['From tomorrow people may leave home only for work that cannot be done from home, food, medicine and exercise. The Chamber of Commerce called it "a hammer to crack a nut". The hospital called it overdue.'];
  TX.hl_gatherings = ['WEDDINGS OFF AS GATHERINGS LIMITED', 'NO MORE PARTIES'];
  TX.pb_gatherings = ['Gatherings are limited from tomorrow. Couples with weddings booked are asking for refunds; one vicar has offered to marry people "one at a time, in the car park".'];
  TX.hl_close_place = ['{place} CLOSED BY HEALTH CHIEFS', 'DOORS SHUT AT {place}'];
  TX.pb_close_place = ['{place} has been closed on public health advice. Regulars were told on the door.'];
  TX.hl_rumour = ['"{r}": THE CLAIM SWEEPING THE CITY', 'SOCIAL MEDIA STORM: "{r}"'];
  TX.hl_estimate = ['HEALTH CHIEF: "{what}"', 'WHAT WE KNOW: {what}'];
  TX.hl_revise = ['U-TURN ON VIRUS FIGURES', 'HEALTH CHIEF CHANGES HER TUNE'];

  // ---------------------------------------------------------------- daily upkeep of the response (costs, staff)
  GP.policyDay = function () {
    var S = this.S, self = this, C = this.C;
    // daily costs
    var cost = 0, econ = 0;
    this.ordersActive().forEach(function (o) {
      var O = ORD[o.type];
      cost += O.cost;
      if (o.type === 'isolate') cost += O.perHead * S.isoList.filter(function (p) { return self.sim.isoUntil[p] >= self.sdOf(S.day); }).length / 10;
      if (o.type === 'quarantine') cost += O.perHead * S.quarList.filter(function (p) { return self.sim.quarUntil[p] >= self.sdOf(S.day); }).length / 10;
      econ += self.econOf(o);
    });
    var staffN = S.staff.tracers + S.staff.field + S.staff.analysts;
    cost += 0.25 * Math.max(0, staffN - S.staff0);
    this.spend(cost);
    S.economy += econ;
    // new staff arrive
    S.hires = S.hires.filter(function (h) { if (h.arrive <= S.day) { S.staff[h.kind] += h.n; return false; } return true; });
    // test capacity grows once the PCR exists
    var G = this.grades();
    if (S.recognized) S.testsCap = Math.min(G.pcrMax, S.testsCap + G.pcrGrow);
    S.testsEffCap = S.testsCap + (this.orderActive('mass_testing') ? Math.round(60 * C.N / 8000) : 0);
    // running out of money
    if (S.funding < 0 && !S.brokeWarned) { S.brokeWarned = S.day; this.msg('council', 'Budget overspent', IX.PEOPLE.chief.name, ['The public health budget is overspent. Orders and staff will continue for now, but the council will want to see a request, and a plan, on Monday.'], { urgent: true }); this.credit(-5, 'overspend'); }
  };
})();
