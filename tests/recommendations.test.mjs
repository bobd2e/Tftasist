import assert from 'node:assert/strict';
import test from 'node:test';
import { clusterCompositions, recommendCompositions } from '../src/meta-analyzer.js';
import worker from '../src/index.js';

const units = [
  { character_id: 'DA_18_A', tier: 2, itemNames: ['DA_Item'] },
  { character_id: 'DA_18_B', tier: 1, itemNames: [] }
];
const traits = [{ name: 'DA_18_Trait', num_units: 2, tier_current: 1 }];
const rows = [1, 3, 5].map(placement => ({
  placement, units_json: JSON.stringify(units), traits_json: JSON.stringify(traits)
}));
const db = { prepare() { return { async all() { return { results: rows }; } }; } };

test('matching prioritizes champions already owned and identifies missing champions', () => {
  const groups = clusterCompositions(rows);
  const [match] = recommendCompositions(groups, ['DA_18_A']);
  assert.equal(match.matchCount, 1);
  assert.deepEqual(match.matchedUnits, ['DA_18_A']);
  assert.deepEqual(match.missingUnits, ['DA_18_B']);
  assert.equal(match.coverage, 0.5);
  assert.equal(match.sampleSize, 3);
});

test('POST /api/recommend returns feasible groups without Riot API key', async () => {
  const response = await worker.fetch(new Request('https://example.com/api/recommend', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ units: ['DA_18_A'] })
  }), { tft_meta_db: db });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.recommendations[0].missingCount, 1);
  assert.equal(body.sampledParticipants, 3);
});

test('POST /api/recommend rejects malformed input', async () => {
  const response = await worker.fetch(new Request('https://example.com/api/recommend', {
    method: 'POST', body: JSON.stringify({ units: [42] })
  }), { tft_meta_db: db });
  assert.equal(response.status, 400);
});

test('GET /api/recommend is rejected', async () => {
  const response = await worker.fetch(new Request('https://example.com/api/recommend'), {});
  assert.equal(response.status, 405);
});

test('recommendations expose swap and bench candidates without duplicate ownership', () => {
  const groups = clusterCompositions(rows);
  const [match] = recommendCompositions(groups, ['DA_18_A', 'DA_18_C', 'DA_18_C']);
  assert.deepEqual(match.removeUnits, ['DA_18_C']);
  assert.deepEqual(match.missingUnits, ['DA_18_B']);
  assert.equal(match.swapCount, 1);
  assert.equal(match.changeCost, 2);
  assert.equal(match.acquisitionCount, 1);
  assert.equal(match.matchCount, 1);
});
