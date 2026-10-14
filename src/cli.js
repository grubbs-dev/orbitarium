import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { createReport } from './core.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');
const args = process.argv.slice(2);
const command = args[0] ?? 'scan';
function flag(name, fallback) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; }
function json(value) { return JSON.stringify(value, null, 2); }

async function localDrives() {
  const drives = [];
  for (let code = 65; code <= 90; code++) {
    const root = `${String.fromCharCode(code)}:\\`;
    try { await fs.readdir(root); drives.push(root); } catch {}
  }
  return drives;
}

async function writeReport(root, out, depth) {
  const report = await createReport(root, { maxDepth: Number(depth) });
  await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await fs.writeFile(out, json(report));
  console.log(`Orbitarium mapped ${report.repos.length} repositories -> ${path.resolve(out)}`);
  return report;
}

async function serve(reportFile, port, host) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/report') {
      try { res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(await fs.readFile(reportFile)); }
      catch { res.writeHead(404); res.end(JSON.stringify({ error: 'report not found' })); }
      return;
    }
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const safe = path.resolve(publicDir, file);
    if (!safe.startsWith(path.resolve(publicDir))) { res.writeHead(403); res.end('forbidden'); return; }
    try {
      const data = await fs.readFile(safe);
      const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8';
      res.writeHead(200, { 'content-type': type });
      res.end(data);
    }
    catch { res.writeHead(404); res.end('not found'); }
  });
  server.listen(Number(port), host, () => console.log(`Orbitarium is orbiting at http://${host}:${port}`));
}

async function watchReport(reportFile, roots, interval) {
  let busy = false;
  const refresh = async () => {
    if (busy) return;
    busy = true;
    try {
      const report = await createReport(roots);
      await fs.mkdir(path.dirname(reportFile), { recursive: true });
      await fs.writeFile(reportFile, json(report));
      console.log(`Orbitarium refreshed ${report.repos.length} worlds`);
    } catch (error) { console.error(`Orbitarium refresh failed: ${error.message}`); }
    finally { busy = false; }
  };
  await refresh();
  setInterval(refresh, Math.max(5000, Number(interval) || 30000));
}

if (command === 'demo') {
  const demo = { schema: 'orbitarium/v1', generatedAt: new Date().toISOString(), root: 'demo universe', repos: [
    { id:'aurora', name:'aurora', relativePath:'aurora', branch:'main', commitCount:87, lastCommitDays:2, fileCount:142, bytes:620000, languages:[{name:'TypeScript',files:74},{name:'CSS',files:22}], manifests:['Node'],hasReadme:true,health:95 },
    { id:'tiny-compiler', name:'tiny-compiler', relativePath:'tiny-compiler', branch:'trunk', commitCount:31, lastCommitDays:42, fileCount:58, bytes:180000, languages:[{name:'Rust',files:43},{name:'Markdown',files:6}], manifests:['Rust'],hasReadme:true,health:85 },
    { id:'moss', name:'moss', relativePath:'moss', branch:'main', commitCount:8, lastCommitDays:410, fileCount:19, bytes:31000, languages:[{name:'Python',files:11},{name:'JSON',files:4}], manifests:['Python'],hasReadme:false,health:47 },
    { id:'night-shift', name:'night-shift', relativePath:'night-shift', branch:'develop', commitCount:14, lastCommitDays:16, fileCount:77, bytes:420000, languages:[{name:'JavaScript',files:39},{name:'HTML',files:18}], manifests:['Node'],hasReadme:true,health:88 },
    { id:'atlas', name:'atlas', relativePath:'atlas', branch:'main', commitCount:3, lastCommitDays:9999, fileCount:8, bytes:12000, languages:[{name:'Markdown',files:6}], manifests:[],hasReadme:true,health:75 }
  ], links: [] };
  demo.links = [{source:'aurora',target:'night-shift',shared:['TypeScript'],weight:1},{source:'tiny-compiler',target:'moss',shared:[],weight:0},{source:'aurora',target:'atlas',shared:['Markdown'],weight:1}].filter(l=>l.weight);
  await fs.mkdir('reports', { recursive: true }); await fs.writeFile('reports/demo.json', json(demo)); console.log('Created reports/demo.json');
} else if (command === 'serve') {
  const reportFile = path.resolve(flag('--report', 'reports/orbitarium.json'));
  await serve(reportFile, flag('--port', 4317), flag('--host', '127.0.0.1'));
  if (args.includes('--watch-all-drives')) await watchReport(reportFile, await localDrives(), flag('--watch-interval', 30000));
  else if (flag('--watch-root', null)) await watchReport(reportFile, flag('--watch-root'), flag('--watch-interval', 30000));
} else if (command === 'scan') {
  await writeReport(args.includes('--all-drives') ? await localDrives() : flag('--root', '.'), flag('--out', 'reports/orbitarium.json'), flag('--depth', 4));
} else {
  console.error('Usage: node src/cli.js [scan|demo|serve]'); process.exitCode = 1;
}
