import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));

function setup(fetchImpl) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', innerHTML: '', value: '', disabled: false,
      classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {}, click() {}
    });
    return elements.get(id);
  };
  const document = {
    getElementById: element,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  const context = {
    document, fetch: fetchImpl, console,
    Date, Set, Map, JSON, Number, String, Array,
    navigator: {}, window: { prompt() {} }
  };
  // Suppress startup data loading; test explicitly triggers analysis.
  runInNewContext(script.replace(/fetchData\(\);\s*$/, ''), context);
  runInNewContext("state.ready=true;state.units=['DA_18_A'];state.champions=[{id:'DA_18_A',name:'A',cost:1,traits:['TestTrait'],icon:''},{id:'DA_18_B',name:'B',cost:2,traits:['TestTrait'],icon:''}]", context);
  return { context, element };
}

test('clicking analyze displays observed recommendations and normalized add button', async () => {
  const { context, element } = setup(async (url, options) => {
    assert.equal(url, '/api/recommend');
    assert.deepEqual(JSON.parse(options.body).units, ['DA_18_A']);
    return { ok: true, json: async () => ({
      ok: true, sampledParticipants: 3, recommendations: [{
        unitIds: ['da_18_a', 'da_18_b'], matchedUnits: ['da_18_a'],
        missingUnits: ['da_18_b'], removeUnits: [],
        sampleSize: 3, averagePlacement: 3, matchCount: 1
      }]
    }) };
  });
  await element('analyze').onclick();
  assert.match(element('results').innerHTML, /수집 덱 후보 1/);
  assert.match(element('results').innerHTML, /data-id="DA_18_B"/);
  assert.match(element('status').textContent, /수집 경기 3명/);
  assert.equal(element('analyze').disabled, false);
});

test('changing selection during an API request discards stale recommendations', async () => {
  let resolve;
  const { context, element } = setup(() => new Promise(r => { resolve = r; }));
  const pending = runInNewContext('analyzeObserved()', context);
  runInNewContext("toggle('units','DA_18_B')", context);
  resolve({ ok: true, json: async () => ({ ok: true, sampledParticipants: 1,
    recommendations: [{ unitIds: ['DA_18_A'], matchedUnits: ['DA_18_A'], missingUnits: [], removeUnits: [], sampleSize: 1 }] }) });
  await pending;
  assert.match(element('results').innerHTML, /선택이 변경됐어/);
  assert.equal(element('analyze').disabled, false);
});

test('API failure falls back to local synergy candidate generation', async () => {
  const { context, element } = setup(async () => ({ ok: false, status: 503 }));
  await runInNewContext('analyzeObserved()', context);
  assert.match(element('status').textContent, /시너지 기반 탐색으로 전환/);
  assert.match(element('results').innerHTML, /후보 1/);
  assert.equal(element('analyze').disabled, false);
});

test('empty selection never calls the recommendation API', async () => {
  let calls = 0;
  const { context, element } = setup(async () => { calls++; throw Error('Unexpected API request'); });
  runInNewContext('state.units=[]', context);
  await runInNewContext('analyzeObserved()', context);
  assert.equal(calls, 0);
  assert.match(element('results').innerHTML, /기물을 한 개 이상 선택/);
});

test('valid API response with no observed compositions falls back to synergy search', async () => {
  const { context, element } = setup(async () => ({
    ok: true, json: async () => ({ ok: true, sampledParticipants: 0, recommendations: [] })
  }));
  await element('analyze').onclick();
  assert.match(element('results').innerHTML, /후보 1/);
  assert.equal(element('analyze').disabled, false);
});

test('invalid API response falls back rather than showing a blank screen', async () => {
  const { element } = setup(async () => ({ ok: true, json: async () => ({ ok: false }) }));
  await element('analyze').onclick();
  assert.match(element('results').innerHTML, /후보 1/);
  assert.equal(element('analyze').disabled, false);
});
