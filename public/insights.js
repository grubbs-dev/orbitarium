export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function signalAtHorizon(repo, horizonDays = 0) {
  const age = Math.max(0, (repo.lastCommitDays ?? 9999) + horizonDays);
  const decay = age <= 30 ? 0 : age <= 180 ? Math.floor((age - 30) / 50) : 4 + Math.floor((age - 180) / 35);
  return clamp((repo.health ?? 0) - decay);
}

export function weatherWord(repo, horizonDays = 0) {
  const signal = signalAtHorizon(repo, horizonDays);
  if (signal >= 90) return 'radiant';
  if (signal >= 75) return 'clear';
  if (signal >= 55) return 'cloudy';
  if (signal >= 35) return 'stormwatch';
  return 'eclipsed';
}

export function reportStats(report, horizonDays = 0) {
  const signals = report.repos.map(repo => signalAtHorizon(repo, horizonDays));
  const average = signals.length ? Math.round(signals.reduce((sum, value) => sum + value, 0) / signals.length) : 0;
  const bright = signals.filter(value => value >= 80).length;
  const languages = new Set(report.repos.flatMap(repo => repo.languages.map(language => language.name)));
  return { worlds: report.repos.length, bridges: report.links.length, average, bright, languages: languages.size };
}

export function attentionQueue(report, horizonDays = 0) {
  return [...report.repos]
    .map(repo => ({ ...repo, signal: signalAtHorizon(repo, horizonDays), weather: weatherWord(repo, horizonDays) }))
    .sort((a, b) => a.signal - b.signal || b.fileCount - a.fileCount);
}

export function languageConstellations(report) {
  const counts = new Map();
  report.repos.forEach(repo => repo.languages.forEach(language => counts.set(language.name, (counts.get(language.name) ?? 0) + language.files)));
  return [...counts.entries()].map(([name, files]) => ({ name, files })).sort((a, b) => b.files - a.files);
}

export function eventFeed(report, horizonDays = 0) {
  const queue = attentionQueue(report, horizonDays);
  const bright = queue.filter(repo => repo.signal >= 85);
  const quiet = queue.filter(repo => repo.lastCommitDays > 180);
  const strongest = [...report.links].sort((a, b) => b.weight - a.weight)[0];
  const events = [];
  if (bright.length) events.push({ tone: 'bright', text: `${bright[0].name} is radiating at ${bright[0].signal}` });
  if (strongest) events.push({ tone: 'bridge', text: `${strongest.shared.join(' + ')} bridge connects two worlds` });
  if (quiet.length) events.push({ tone: 'quiet', text: `${quiet.length} quiet world${quiet.length === 1 ? '' : 's'} detected beyond the active belt` });
  if (!events.length) events.push({ tone: 'calm', text: 'the sky is calm · waiting for a new signal' });
  return events;
}
