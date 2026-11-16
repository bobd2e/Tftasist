import test from 'node:test';
import assert from 'node:assert/strict';
import { rankBuildPaths } from '../src/build-paths.js';

const guides = [{id:'sample',name:'Test route',stages:[{level:5,units:['A','B']},{level:7,units:['A','B','C']}],items:['item_a','item_a']}];

test('level-specific lineup is used for route comparison', () => {
  const [at5] = rankBuildPaths(guides,{units:['A'],items:[],level:5});
  const [at7] = rankBuildPaths(guides,{units:['A'],items:[],level:7});
  assert.equal(at5.stageLevel,5);
  assert.equal(at7.stageLevel,7);
  assert.deepEqual(at7.missingUnits,['B','C']);
  assert.ok(at5.stageCoverage > at7.stageCoverage);
});

test('duplicate owned items only match available guide item copies', () => {
  const [one] = rankBuildPaths(guides,{units:['A'],items:['item_a'],level:5});
  const [two] = rankBuildPaths(guides,{units:['A'],items:['item_a','item_a'],level:5});
  const [three] = rankBuildPaths(guides,{units:['A'],items:['item_a','item_a','item_a'],level:5});
  assert.equal(one.matchedItems.length,1);
  assert.equal(two.matchedItems.length,2);
  assert.equal(three.matchedItems.length,2);
  assert.ok(two.similarity > one.similarity);
});
