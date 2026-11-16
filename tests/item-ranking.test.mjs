import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendCompositions } from '../src/meta-analyzer.js';

test('owned items break ties between equally matching alternative boards', () => {
  const groups = [
    {id:'a',unitIds:['DA_18_A','DA_18_B'],coreUnits:[{items:['DA_GuinsoosRageblade']}],sampleSize:10,averagePlacement:3},
    {id:'b',unitIds:['DA_18_A','DA_18_C'],coreUnits:[{items:['DA_SpearOfShojin']}],sampleSize:10,averagePlacement:3}
  ];
  const result = recommendCompositions(groups,['DA_18_A'],5,['DA_SpearOfShojin']);
  assert.equal(result[0].id,'b');
  assert.equal(result[0].itemMatchCount,1);
});

test('a single owned item cannot match two copies of a desired item', () => {
  const groups = [{id:'a',unitIds:['DA_18_A'],coreUnits:[{items:['DA_SpearOfShojin','DA_SpearOfShojin']}]}];
  assert.equal(recommendCompositions(groups,['DA_18_A'],5,['DA_SpearOfShojin'])[0].itemMatchCount,1);
  assert.equal(recommendCompositions(groups,['DA_18_A'],5,['DA_SpearOfShojin','DA_SpearOfShojin'])[0].itemMatchCount,2);
});
