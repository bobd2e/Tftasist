import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

test('frontend inline JavaScript parses and includes observed recommendation wiring', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const start = html.indexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start, 'expected inline application script');
  new Script(html.slice(start + '<script>'.length, end));
  assert.ok(html.includes('async function analyzeObserved('));
  assert.ok(html.includes("fetch('/api/recommend'"));
  assert.ok(html.includes("state.ready?analyzeObserved()"));
});
