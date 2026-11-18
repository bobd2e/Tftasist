import test from 'node:test';
import assert from 'node:assert/strict';
import {metaGuides} from '../src/meta-guides.js';
import {rankBuildPaths} from '../src/build-paths.js';

test('source-backed Sivir/Amumu route has playable 5–9 level boards',()=>{
 const guide=metaGuides.find(x=>x.id==='sivir-amumu-build');
 assert.ok(guide);
 assert.equal(guide.kind,'level-guide');
 assert.deepEqual(guide.stages.map(x=>x.level),[5,6,7,8,9]);
 for(const stage of guide.stages){
   assert.equal(stage.units.length,stage.level);
   assert.equal(new Set(stage.units).size,stage.units.length);
 }
 assert.ok(guide.source.startsWith('https://'));
 const [result]=rankBuildPaths([guide],{units:['시비르','바이'],level:7});
 assert.equal(result.stageLevel,7);
 assert.ok(result.stageUnits.includes('시비르'));
});

test('other final-only guides are not mislabeled as complete build-ups',()=>{
 for(const guide of metaGuides.filter(x=>x.kind==='final-board')){
  assert.deepEqual(guide.stages.map(x=>x.level),[9]);
 }
});
