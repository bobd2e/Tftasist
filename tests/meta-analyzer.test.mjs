import assert from 'node:assert/strict';
import { getCoreTraits, getCoreUnits, clusterCompositions } from '../src/meta-analyzer.js';

const traits = [{ name: 'DA_Riftbeast18', num_units: 10, tier_current: 4, tier_total: 4 }, { name: 'DA_18_Brawler', num_units: 2, tier_current: 1, tier_total: 3 }, { name: 'Inactive', num_units: 1, tier_current: 0 }];
const units = [{ character_id: 'DA_18_ElderDragon', tier: 2, rarity: 4, itemNames: ['DA_LastWhisper', 'DA_HandOfJustice', 'DA_18_EmblemSlayer'] }, { character_id: 'DA_Krug18', tier: 3, rarity: 2, itemNames: ['DA_GargoyleStoneplate'] }];
assert.equal(getCoreTraits(traits)[0].id, 'DA_Riftbeast18');
assert.equal(getCoreTraits(traits).length, 2);
assert.equal(getCoreUnits(units)[0].id, 'DA_18_ElderDragon');
assert.equal(getCoreUnits(units)[0].items.length, 2);
const sample = placement => ({ placement, units_json: JSON.stringify(units), traits_json: JSON.stringify(traits) });
const clusters = clusterCompositions([sample(1), sample(5), sample(3)]);
assert.equal(clusters.length, 1);
assert.equal(clusters[0].sampleSize, 3);
assert.equal(clusters[0].averagePlacement, 3);
assert.equal(clusters[0].top4Rate, 0.667);
assert.equal(clusters[0].winRate, 0.333);
console.log('meta-analyzer smoke tests passed');

const unrelated = {
  placement: 8,
  units_json: JSON.stringify([
    { character_id: 'DA_18_Ivern', tier: 2, rarity: 4, itemNames: ['DA_Morellonomicon'] },
    { character_id: 'DA_18_Diana', tier: 1, rarity: 2, itemNames: [] }
  ]),
  traits_json: JSON.stringify([{ name: 'DA_18_Spellweaver', num_units: 4, tier_current: 2, tier_total: 4 }])
};
const separate = clusterCompositions([sample(1), unrelated]);
assert.equal(separate.length, 2);
assert.deepEqual(separate.map(c => c.sampleSize), [1, 1]);
assert.equal(clusterCompositions([]).length, 0);
assert.equal(clusterCompositions([{ placement: 2, units_json: '{broken', traits_json: '[]' }]).length, 0);
