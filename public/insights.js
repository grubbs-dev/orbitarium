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
