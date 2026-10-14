import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyExtension, healthScore, buildLinks } from '../src/core.js';
import { layoutReport } from '../src/layout.js';

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
