import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyExtension, healthScore, buildLinks } from '../src/core.js';
import { layoutReport } from '../src/layout.js';
import { attentionQueue, eventFeed, languageConstellations, signalAtHorizon, weatherWord, reportStats } from '../public/insights.js';

test('classifies common source files and ignores unknown extensions', () => {
  assert.equal(classifyExtension('main.ts'), 'TypeScript');
  assert.equal(classifyExtension('script.PS1'), 'PowerShell');
  assert.equal(classifyExtension('image.png'), null);
});

test('health score rewards living, documented repositories', () => {
  assert.equal(healthScore({ hasReadme:true, manifests:['Node'], commitCount:20, fileCount:10, lastCommitDays:2 }), 100);
  assert.ok(healthScore({ hasReadme:false, manifests:[], commitCount:0, fileCount:0, lastCommitDays:9999 }) < 50);
});

test('links repositories that share a language', () => {
  const links = buildLinks([{ id:'a', languages:[{name:'Rust'}] }, { id:'b', languages:[{name:'Rust'},{name:'Go'}] }, { id:'c', languages:[{name:'Python'}] }]);
  assert.deepEqual(links, [{ source:'a', target:'b', shared:['Rust'], weight:1 }]);
});

test('layout is deterministic and includes all nodes', () => {
  const report = { repos:[{id:'a',fileCount:3},{id:'b',fileCount:30}], links:[] };
  const a = layoutReport(report), b = layoutReport(report);
  assert.deepEqual(a, b); assert.equal(a.nodes.length, 2); assert.ok(a.nodes[1].radius > a.nodes[0].radius);
});

test('weather signal decays predictably as the horizon rewinds', () => {
  const repo = { health: 92, lastCommitDays: 4 };
  assert.equal(signalAtHorizon(repo, 0), 92);
  assert.ok(signalAtHorizon(repo, 365) < signalAtHorizon(repo, 0));
  assert.equal(weatherWord(repo, 0), 'radiant');
});

test('report stats count bright worlds and language families', () => {
  const report = {
    repos: [
      { health: 90, lastCommitDays: 2, languages: [{ name: 'Rust' }] },
      { health: 40, lastCommitDays: 500, languages: [{ name: 'Rust' }, { name: 'Python' }] }
    ],
    links: [{ source: 'a', target: 'b' }]
  };
  assert.deepEqual(reportStats(report), { worlds: 2, bridges: 1, average: 59, bright: 1, languages: 2 });
});

test('mission control produces an ordered attention queue and event feed', () => {
  const report = {
    repos: [
      { id:'quiet', name:'quiet', health:40, lastCommitDays:500, fileCount:10, languages:[{name:'Rust',files:4}] },
      { id:'bright', name:'bright', health:95, lastCommitDays:1, fileCount:4, languages:[{name:'Rust',files:2},{name:'Go',files:1}] }
    ],
    links: [{ source:'quiet', target:'bright', shared:['Rust'], weight:1 }]
  };
  assert.equal(attentionQueue(report)[0].name, 'quiet');
  assert.deepEqual(languageConstellations(report), [{ name:'Rust', files:6 }, { name:'Go', files:1 }]);
  assert.ok(eventFeed(report).some(event => event.tone === 'bright'));
});
