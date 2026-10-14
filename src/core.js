import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const EXTENSIONS = new Map([
  ['.js', 'JavaScript'], ['.mjs', 'JavaScript'], ['.cjs', 'JavaScript'], ['.ts', 'TypeScript'],
  ['.tsx', 'TypeScript'], ['.jsx', 'JavaScript'], ['.py', 'Python'], ['.rs', 'Rust'], ['.go', 'Go'],
  ['.java', 'Java'], ['.cs', 'C#'], ['.cpp', 'C++'], ['.c', 'C'], ['.h', 'C'], ['.html', 'HTML'],
  ['.css', 'CSS'], ['.scss', 'CSS'], ['.json', 'JSON'], ['.md', 'Markdown'], ['.ps1', 'PowerShell'],
  ['.sh', 'Shell'], ['.yml', 'YAML'], ['.yaml', 'YAML'], ['.sql', 'SQL']
]);
const MANIFESTS = new Map([
  ['package.json', 'Node'], ['Cargo.toml', 'Rust'], ['go.mod', 'Go'], ['pyproject.toml', 'Python'],
  ['requirements.txt', 'Python'], ['*.csproj', '.NET'], ['pom.xml', 'Java'], ['CMakeLists.txt', 'CMake']
]);
const SKIP = new Set(['.git', 'node_modules', 'bin', 'obj', 'dist', 'build', '.next', 'coverage']);

export function classifyExtension(name) { return EXTENSIONS.get(path.extname(name).toLowerCase()) ?? null; }

export function healthScore(repo) {
  let score = 45;
  if (repo.hasReadme) score += 18;
  if (repo.manifests.length) score += 12;
  if (repo.commitCount >= 5) score += 10;
  if (repo.fileCount >= 3) score += 5;
  if (repo.lastCommitDays <= 30) score += 10;
  else if (repo.lastCommitDays > 365) score -= 10;
  return Math.max(0, Math.min(100, score));
}

async function walk(dir, depth, maxDepth, stats) {
  if (depth > maxDepth) return;
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git') continue;
      await walk(full, depth + 1, maxDepth, stats);
    } else if (entry.isFile()) {
      stats.fileCount++;
      try { stats.bytes += (await fs.stat(full)).size; } catch {}
      const language = classifyExtension(entry.name);
      if (language) stats.languages[language] = (stats.languages[language] ?? 0) + 1;
    }
  }
}

async function gitInfo(dir) {
  const result = { branch: 'unknown', commitCount: 0, lastCommit: null, lastCommitDays: 9999 };
  try {
    const { stdout: branch } = await exec('git', ['-C', dir, 'branch', '--show-current'], { windowsHide: true });
    result.branch = branch.trim() || 'detached';
    const { stdout: count } = await exec('git', ['-C', dir, 'rev-list', '--count', 'HEAD'], { windowsHide: true });
    result.commitCount = Number.parseInt(count.trim(), 10) || 0;
    const { stdout: date } = await exec('git', ['-C', dir, 'log', '-1', '--format=%cI'], { windowsHide: true });
    result.lastCommit = date.trim() || null;
    if (result.lastCommit) result.lastCommitDays = Math.floor((Date.now() - Date.parse(result.lastCommit)) / 86400000);
  } catch {}
  return result;
}

async function manifests(dir) {
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch {}
  const found = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (MANIFESTS.has(entry.name)) found.push(MANIFESTS.get(entry.name));
    else if (entry.name.endsWith('.csproj')) found.push('.NET');
  }
  return [...new Set(found)].sort();
}

export async function discover(root, { maxDepth = 4 } = {}) {
  const found = [];
  async function find(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    const isRepo = entries.some(e => e.isDirectory() && e.name === '.git');
    if (isRepo) { found.push(dir); return; }
    for (const entry of entries) {
      if (entry.isDirectory() && !SKIP.has(entry.name) && !(entry.name.startsWith('.'))) await find(path.join(dir, entry.name), depth + 1);
    }
  }
  await find(path.resolve(root), 0);
  return found.sort((a, b) => a.localeCompare(b));
}

export async function inspectRepository(dir, root, multiRoot = false) {
  const stats = { fileCount: 0, bytes: 0, languages: {} };
  await walk(dir, 0, 8, stats);
  const git = await gitInfo(dir);
  const repo = {
    id: multiRoot ? dir.replaceAll(path.sep, '/') : path.relative(root, dir).replaceAll(path.sep, '/') || path.basename(dir),
    name: path.basename(dir),
    path: dir,
    relativePath: multiRoot ? dir.replaceAll(path.sep, '/') : path.relative(root, dir).replaceAll(path.sep, '/') || '.',
    ...git,
    fileCount: stats.fileCount,
    bytes: stats.bytes,
    languages: Object.entries(stats.languages).sort((a, b) => b[1] - a[1]).map(([name, files]) => ({ name, files })),
    manifests: await manifests(dir),
    hasReadme: (await fs.readdir(dir).catch(() => [])).some(name => /^readme(?:\.|$)/i.test(name)),
  };
  repo.health = healthScore(repo);
  return repo;
}

export function buildLinks(repos) {
  const links = [];
  for (let i = 0; i < repos.length; i++) for (let j = i + 1; j < repos.length; j++) {
    const a = new Set(repos[i].languages.map(l => l.name));
    const shared = repos[j].languages.map(l => l.name).filter(l => a.has(l));
    if (shared.length) links.push({ source: repos[i].id, target: repos[j].id, shared, weight: shared.length });
  }
  return links;
}

export async function createReport(root, options = {}) {
  const roots = (Array.isArray(root) ? root : [root]).map(value => path.resolve(value));
  const discovered = await Promise.all(roots.map(value => discover(value, options)));
  const dirs = [...new Set(discovered.flat())].sort((a, b) => a.localeCompare(b));
  const multiRoot = roots.length > 1;
  const repos = await Promise.all(dirs.map(dir => {
    const owner = roots.find(candidate => dir === candidate || dir.startsWith(candidate)) ?? roots[0];
    return inspectRepository(dir, owner, multiRoot);
  }));
  return { schema: 'orbitarium/v1', generatedAt: new Date().toISOString(), root: roots.length === 1 ? roots[0] : roots, repos, links: buildLinks(repos) };
}
