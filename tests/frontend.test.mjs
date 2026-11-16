import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

test('frontend inline JavaScript parses and includes observed recommendation wiring', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)];
  assert.ok(scripts.length > 0, 'expected inline application script');
  for (const [, code] of scripts) new Script(code);
  assert.match(html, /async function analyzeObserved\\(/);
  assert.match(html, /fetch\\('\/api\/recommend'/);
  assert.match(html, /analyzeObserved\\(\\)/);
});
