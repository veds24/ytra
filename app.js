/* ============================================================
   YatraOne — Prototype Logic
   ============================================================ */

/* ---------- STATE ---------- */
let currentPreference = 'Balanced';
let currentRoutes = [];
let currentOrigin = '';
let currentDestination = '';

/* ---------- MOCK DATA (base route templates) ---------- */
const BASE_ROUTES = [
  {
    name: 'Train + Walk',
    icon: '🚆',
    segments: [
      { mode: 'Walk',  detail: 'Walk to station',            time: 5,  cost: 0,   wait: 0,  reliability: 0.95 },
      { mode: 'Train', detail: 'Local train (M-Indicator)',  time: 35, cost: 10,  wait: 5,  reliability: 0.80 },
      { mode: 'Walk',  detail: 'Walk to destination',        time: 5,  cost: 0,   wait: 0,  reliability: 0.95 }
    ]
  },
  {
    name: 'Bus + Auto',
    icon: '🚌',
    segments: [
      { mode: 'Walk',  detail: 'Walk to bus stop',           time: 3,  cost: 0,   wait: 0,  reliability: 0.90 },
      { mode: 'Bus',   detail: 'BEST Bus (Chalo)',           time: 40, cost: 15,  wait: 12, reliability: 0.65 },
      { mode: 'Auto',  detail: 'Auto to destination',        time: 15, cost: 40,  wait: 3,  reliability: 0.80 }
    ]
  },
  {
    name: 'Cab Direct',
    icon: '🚗',
    segments: [
      { mode: 'Cab',   detail: 'Uber / Ola direct',          time: 40, cost: 250, wait: 5,  reliability: 0.85 }
    ]
  },
  {
    name: 'Bike + Train',
    icon: '🏍️',
    segments: [
      { mode: 'Bike',  detail: 'Rapido to station',          time: 8,  cost: 30,  wait: 3,  reliability: 0.90 },
      { mode: 'Train', detail: 'Local train',                time: 35, cost: 10,  wait: 5,  reliability: 0.80 },
      { mode: 'Walk',  detail: 'Walk to destination',        time: 7,  cost: 0,   wait: 0,  reliability: 0.95 }
    ]
  }
];

/* ============================================================
   SCREEN CONTROL
   ============================================================ */
function showScreen(id) {
  ['screen-home', 'screen-loading', 'screen-results'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

/* ============================================================
   PREFERENCE
   ============================================================ */
function setPreference(pref) {
  currentPreference = pref;
  document.querySelectorAll('.prefs button').forEach(b => b.classList.remove('active'));
  const active = document.getElementById('pref-' + pref.toLowerCase());
  if (active) active.classList.add('active');
}

/* ============================================================
   AGGREGATION
   ============================================================ */
function aggregate(route) {
  const time = route.segments.reduce((s, x) => s + x.time, 0);
  const cost = route.segments.reduce((s, x) => s + x.cost, 0);
  const wait = route.segments.reduce((s, x) => s + x.wait, 0);
  const reliability =
    route.segments.reduce((s, x) => s + x.reliability, 0) / route.segments.length;
  return { ...route, time, cost, wait, reliability };
}

/* ============================================================
   NORMALIZATION (min-max)
   ============================================================ */
function normalize(routes) {
  ['time', 'cost', 'wait'].forEach(k => {
    const vals = routes.map(r => r[k]);
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    routes.forEach(r => {
      r[k + '_norm'] = mx === mn ? 0 : (r[k] - mn) / (mx - mn);
    });
  });

  // reliability: higher is better → invert
  const rels = routes.map(r => r.reliability);
  const mnR = Math.min(...rels);
  const mxR = Math.max(...rels);
  routes.forEach(r => {
    r.reliability_norm =
      mxR === mnR ? 0 : 1 - (r.reliability - mnR) / (mxR - mnR);
  });

  return routes;
}

/* ============================================================
   SCORING (multi-criteria)
   ============================================================ */
function score(routes, pref) {
  const w =
    pref === 'Fastest'
      ? { t: 0.6, c: 0.1, w: 0.1, r: 0.2 }
      : pref === 'Cheapest'
      ? { t: 0.1, c: 0.6, w: 0.1, r: 0.2 }
      : { t: 0.3, c: 0.3, w: 0.2, r: 0.2 };

  routes.forEach(r => {
    r.score =
      w.t * r.time_norm +
      w.c * r.cost_norm +
      w.w * r.wait_norm +
      w.r * r.reliability_norm;
  });

  return routes.sort((a, b) => a.score - b.score);
}

/* ============================================================
   FIND ROUTES
   ============================================================ */
function findRoutes() {
  currentOrigin = document.getElementById('input-origin').value;
  currentDestination = document.getElementById('input-destination').value;

  showScreen('screen-loading');

  setTimeout(() => {
    // deep copy + aggregate
    let routes = JSON.parse(JSON.stringify(BASE_ROUTES)).map(aggregate);

    // slight random jitter so routes differ per trip
    routes.forEach(r => {
      r.time += Math.floor(Math.random() * 6);
      r.wait += Math.floor(Math.random() * 3);
    });

    routes = normalize(routes);
    routes = score(routes, currentPreference);
    currentRoutes = routes;

    renderRoutes(routes);
    showScreen('screen-results');
  }, 1400);
}

/* ============================================================
   RENDER CARDS
   ============================================================ */
function renderRoutes(routes) {
  document.getElementById('route-title').textContent =
    `${currentOrigin} → ${currentDestination}`;

  const medals = ['🥇', '🥈', '🥉'];
  const tags = ['BEST', 'VALUE', 'OPTION'];

  const html = routes.slice(0, 3).map((r, i) => `
    <div class="card ${i === 0 ? 'best' : ''}">
      <div class="row">
        <div class="name">
          ${medals[i]} ${r.name}
          <span class="badge ${i === 0 ? '' : i === 1 ? 'green' : 'orange'}">${tags[i]}</span>
        </div>
        <div class="price">₹${r.cost}</div>
      </div>
      <div class="meta">
        <span>⏱ ${r.time} min</span>
        <span>🚏 Wait ${r.wait} min</span>
        <span>📶 ${(r.reliability * 100).toFixed(0)}%</span>
      </div>
      <div class="segments">
        ${r.segments.map(s => `${s.mode} · ${s.time}m`).join(' → ')}
      </div>
    </div>
  `).join('');

  document.getElementById('cards-container').innerHTML = html;
}

/* ============================================================
   SIMULATE DELAY → REROUTE
   ============================================================ */
function simulateDelay() {
  if (!currentRoutes.length) return;

  // introduce delay to the *current best* route
  const top = currentRoutes[0];
  const longest = top.segments.reduce((a, b) => (a.time > b.time ? a : b));
  longest.time += 15;
  longest.reliability = Math.max(0.3, longest.reliability - 0.3);

  // recompute
  let routes = currentRoutes.map(aggregate);
  routes = normalize(routes);
  routes = score(routes, currentPreference);

  // craft message
  const newTop = routes[0];
  const saved = Math.max(0, top.time - newTop.time);

  document.getElementById('modal-message').innerHTML = `
    Your <b>${top.name}</b> is delayed by <b>15 minutes</b>.<br><br>
    New recommended: <b>${newTop.name}</b><br>
    Total: <b>${newTop.time} min</b> · You save <b>${saved} min</b>
  `;

  currentRoutes = routes;
  document.getElementById('modal').classList.remove('hidden');
}

/* ============================================================
   MODAL CLOSE
   ============================================================ */
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  renderRoutes(currentRoutes);
}

/* ============================================================
   RESET
   ============================================================ */
function resetSearch() {
  showScreen('screen-home');
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  setPreference('Balanced');
  showScreen('screen-home');
}

document.addEventListener('DOMContentLoaded', init);
