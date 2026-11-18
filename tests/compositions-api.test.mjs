import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';

const units = [
  { character_id: 'DA_18_ElderDragon', tier: 2, rarity: 4, itemNames: ['DA_LastWhisper', 'DA_HandOfJustice'] },
  { character_id: 'DA_Krug18', tier: 3, rarity: 2, itemNames: ['DA_GargoyleStoneplate'] }
];
const traits = [
  { name: 'DA_Riftbeast18', num_units: 10, tier_current: 4, tier_total: 4 },
  { name: 'DA_18_Brawler', num_units: 2, tier_current: 1, tier_total: 3 }
];
const row = placement => ({ placement, units_json: JSON.stringify(units), traits_json: JSON.stringify(traits) });

test('GET /api/compositions reads D1 without requiring Riot API key', async () => {
  let statement = '';
  let bound = null;
  const env = {
    tft_meta_db: {
      prepare(sql) {
        statement = sql;
        return {
          bind(limit) {
            bound = limit;
            return { async all() { return { results: [row(1), row(5), row(3)] }; } };
          }
        };
      }
    }
  };
  const res = await worker.fetch(new Request('https://example.com/api/compositions?limit=3'), env);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.sampledParticipants, 3);
  assert.equal(body.analyzedParticipants, 3);
  assert.equal(body.excludedParticipants, 0);
  assert.equal(body.groupCount, 1);
  assert.equal(body.compositions.length, 1);
  assert.equal(body.compositions[0].averagePlacement, 3);
  assert.equal(body.compositions[0].top4Rate, 0.667);
  assert.equal(body.compositions[0].winRate, 0.333);
  assert.match(statement, /JOIN matches/);
  assert.match(statement, /m.set_number = 18/);
  assert.equal(bound, 3);
});

test('GET /api/compositions handles missing D1 binding', async () => {
  const res = await worker.fetch(new Request('https://example.com/api/compositions'), {});
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'D1 binding missing');
});

test('GET /api/compositions rejects non-GET methods', async () => {
  const res = await worker.fetch(new Request('https://example.com/api/compositions', { method: 'POST' }), {});
  assert.equal(res.status, 405);
});

test('GET /api/compositions caps requested participant sample size', async () => {
  let limit = null;
  const env = { tft_meta_db: { prepare() { return { bind(n) { limit = n; return { async all() { return { results: [] }; } }; } }; } } };
  const res = await worker.fetch(new Request('https://example.com/api/compositions?limit=999999'), env);
  assert.equal(res.status, 200);
  assert.equal(limit, 2000);
});

test('GET /api/compositions handles D1 read errors', async () => {
  const env = { tft_meta_db: { prepare() { throw Error('D1 unavailable'); } } };
  const res = await worker.fetch(new Request('https://example.com/api/compositions'), env);
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'Composition analysis failed');
});

test('GET /api/compositions reports excluded malformed participants', async () => {
  const env = { tft_meta_db: { prepare() { return { bind() { return { async all() {
    return { results: [row(1), { placement: 9, units_json: '[]', traits_json: '[]' }] };
  } }; } }; } } };
  const res = await worker.fetch(new Request('https://example.com/api/compositions'), env);
  const body = await res.json();
  assert.equal(body.sampledParticipants, 2);
  assert.equal(body.analyzedParticipants, 1);
  assert.equal(body.excludedParticipants, 1);
});
