import { reportStats, signalAtHorizon, weatherWord } from './insights.js';

const svg = document.querySelector('#map');
const inspector = document.querySelector('#inspector');
const search = document.querySelector('#search');
const health = document.querySelector('#health');
const mode = document.querySelector('#mode');
const horizon = document.querySelector('#horizon');
const horizonValue = document.querySelector('#horizon-value');
const pulseButton = document.querySelector('#pulse');
const liveButton = document.querySelector('#live');
const summary = document.querySelector('#summary');
const skyStatus = document.querySelector('#sky-status');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const state = { report: null, graph: null, selected: null, pulse: false, live: false, phase: 0, nodes: [], liveTimer: null };

function visibleRepos() {
  const query = search.value.trim().toLowerCase();
  const minimum = Number(health.value);
  return state.report.repos.filter(repo => {
    const haystack = [repo.name, repo.relativePath, repo.branch, ...repo.languages.map(language => language.name)].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && signalAtHorizon(repo, Number(horizon.value)) >= minimum;
  });
}

function colorFor(repo) {
  const signal = signalAtHorizon(repo, Number(horizon.value));
  return signal >= 80 ? '#b9ff72' : signal >= 55 ? '#ffcd70' : '#8b93b7';
}

function layoutFor(repos) {
  const center = { x: 550, y: 340 };
  const count = Math.max(1, repos.length);
  return repos.map((repo, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const signal = signalAtHorizon(repo, Number(horizon.value));
    if (mode.value === 'radar') {
      const distance = 70 + (100 - signal) * 2.25;
      return { ...repo, x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance, radius: 10 + Math.sqrt(repo.fileCount + 1) * 3.4, angle, distance };
    }
    const distance = mode.value === 'orbit' ? 190 + (index % 4) * 52 : 220 + (index % 3) * 48;
    return { ...repo, x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance, radius: 12 + Math.min(34, Math.sqrt(repo.fileCount + 1) * 4), angle, distance };
  });
}

function background() {
  const stars = Array.from({ length: 46 }, (_, index) => {
    const x = (index * 193) % 1100;
    const y = (index * 89 + index * index * 7) % 680;
    return `<circle class="dust" cx="${x}" cy="${y}" r="${index % 3 === 0 ? 1.6 : 1}" opacity="${0.18 + (index % 5) * 0.07}"/>`;
  }).join('');
  const rings = mode.value === 'radar' ? `<g class="radar-rings"><circle cx="550" cy="340" r="90"/><circle cx="550" cy="340" r="180"/><circle cx="550" cy="340" r="290"/><path d="M550 40V640M250 340H850"/></g>` : '';
  return `<defs><filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="space"><stop stop-color="#171b3c"/><stop offset="1" stop-color="#080a19"/></radialGradient></defs><rect width="1100" height="680" fill="url(#space)"/>${stars}${rings}`;
}

function draw() {
  const repos = visibleRepos();
  const ids = new Set(repos.map(repo => repo.id));
  const nodes = layoutFor(repos);
  state.nodes = nodes;
  state.graph = { nodes };
  svg.innerHTML = background();
  state.report.links.filter(link => ids.has(link.source) && ids.has(link.target)).forEach(link => {
    const source = nodes.find(node => node.id === link.source);
    const target = nodes.find(node => node.id === link.target);
    if (!source || !target) return;
    svg.insertAdjacentHTML('beforeend', `<line class="link" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke-width="${1 + link.weight * 1.5}"/><text class="link-label" x="${(source.x + target.x) / 2}" y="${(source.y + target.y) / 2}">${esc(link.shared.join(' · '))}</text>`);
  });
  nodes.forEach(node => {
    const selected = state.selected?.id === node.id;
    const signal = signalAtHorizon(node, Number(horizon.value));
    const color = colorFor(node);
    svg.insertAdjacentHTML('beforeend', `<g class="node ${selected ? 'selected' : ''}" tabindex="0" data-id="${esc(node.id)}" data-x="${node.x}" data-y="${node.y}" data-angle="${node.angle}" data-distance="${node.distance}" transform="translate(${node.x},${node.y})"><circle class="halo" r="${node.radius + 9}" fill="${color}" opacity=".1"/><circle class="star" r="${node.radius}" fill="${color}" filter="${signal > 85 ? 'url(#glow)' : ''}"/><text class="node-score" y="5">${signal}</text><text class="node-name" y="${node.radius + 22}">${esc(node.name)}</text></g>`);
  });
  document.querySelectorAll('.node').forEach(node => {
    const selectNode = () => select(state.report.repos.find(repo => repo.id === node.dataset.id));
    node.addEventListener('click', selectNode);
    node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectNode(); } });
  });
  const stats = reportStats(state.report, Number(horizon.value));
  summary.textContent = `${repos.length} of ${stats.worlds} worlds · ${stats.bridges} bridges · average signal ${stats.average}`;
  skyStatus.textContent = `${stats.bright} bright worlds · ${stats.languages} language families · ${weatherWord(repos[0] ?? { health: 0 }, Number(horizon.value))} horizon${state.live ? ' · live' : ''}`;
  horizonValue.textContent = Number(horizon.value) === 0 ? 'now' : `${horizon.value}d ago`;
}

function select(repo) {
  if (!repo) return;
  state.selected = repo;
  const signal = signalAtHorizon(repo, Number(horizon.value));
  inspector.innerHTML = `<div class="card"><div class="eyebrow">repository / ${esc(repo.relativePath)}</div><h2>${esc(repo.name)}</h2><div class="weather"><span class="weather-icon">✦</span><div><strong>${weatherWord(repo, Number(horizon.value))}</strong><small>weather at ${horizon.value == 0 ? 'now' : horizon.value + ' days ago'}</small></div></div><div class="score"><strong>${signal}</strong><span>signal strength</span></div><dl><dt>branch</dt><dd>${esc(repo.branch)}</dd><dt>commits</dt><dd>${repo.commitCount.toLocaleString()}</dd><dt>last pulse</dt><dd>${repo.lastCommitDays > 9000 ? 'unknown' : repo.lastCommitDays + ' days ago'}</dd><dt>footprint</dt><dd>${repo.fileCount.toLocaleString()} files · ${(repo.bytes / 1024).toFixed(1)} KB</dd></dl><h3>languages</h3><div class="chips">${repo.languages.map(language => `<span>${esc(language.name)} <b>${language.files}</b></span>`).join('') || '<span>unclassified</span>'}</div><h3>signals</h3><p class="signals">${repo.hasReadme ? '✦ has a README' : '○ missing a README'} · ${repo.manifests.length ? esc(repo.manifests.join(', ')) : 'no manifest detected'}</p><button class="clear" id="clear-selection">return to sky</button></div>`;
  document.querySelector('#clear-selection').onclick = () => { state.selected = null; inspector.innerHTML = emptyInspector(); draw(); };
  draw();
}

function emptyInspector() {
  return '<div class="empty"><span>✦</span><h2>Choose a star</h2><p>Every repository is a small world.<br>Click one to read its weather.</p><div class="empty-tip">Try the radar lens or rewind the horizon.</div></div>';
}

function animate(time) {
  state.phase = time / 1000;
  if (state.pulse || mode.value === 'orbit') {
    document.querySelectorAll('.node').forEach(node => {
      const baseX = Number(node.dataset.x);
      const baseY = Number(node.dataset.y);
      const angle = Number(node.dataset.angle);
      const drift = mode.value === 'orbit' ? Math.sin(state.phase * 0.35 + angle) * 10 : 0;
      const beat = state.pulse ? Math.sin(state.phase * 2.2 + angle) * 2 : 0;
      node.setAttribute('transform', `translate(${baseX + Math.cos(angle) * drift},${baseY + Math.sin(angle) * drift}) scale(${1 + beat / 100})`);
    });
  }
  requestAnimationFrame(animate);
}

async function init() {
  state.report = await fetch('/api/report').then(response => response.json());
  inspector.innerHTML = emptyInspector();
  draw();
  requestAnimationFrame(animate);
}

async function refreshLive() {
  if (!state.live) return;
  try {
    const fresh = await fetch(`/api/report?live=${Date.now()}`, { cache: 'no-store' }).then(response => response.json());
    if (fresh.generatedAt === state.report.generatedAt) return;
    state.report = fresh;
    if (state.selected) state.selected = fresh.repos.find(repo => repo.id === state.selected.id) ?? null;
    draw();
  } catch { skyStatus.textContent = 'live link lost · retrying'; }
}

search.oninput = draw;
health.onchange = draw;
mode.onchange = () => { document.body.dataset.mode = mode.value; draw(); };
horizon.oninput = draw;
pulseButton.onclick = () => { state.pulse = !state.pulse; pulseButton.classList.toggle('active', state.pulse); pulseButton.textContent = state.pulse ? 'pulse / on' : 'pulse / off'; };
liveButton.onclick = () => {
  state.live = !state.live;
  liveButton.classList.toggle('active', state.live);
  liveButton.textContent = state.live ? 'live / on' : 'live / off';
  if (state.live && !state.liveTimer) state.liveTimer = setInterval(refreshLive, 15000);
  if (!state.live && state.liveTimer) { clearInterval(state.liveTimer); state.liveTimer = null; }
  draw();
};
document.querySelector('#focus').onclick = () => document.body.classList.toggle('focus');
document.onkeydown = event => {
  if (event.key === '/' && document.activeElement !== search) { event.preventDefault(); search.focus(); }
  if (event.key.toLowerCase() === 'f') document.body.classList.toggle('focus');
  if (event.key.toLowerCase() === 'p') pulseButton.click();
};
init();
