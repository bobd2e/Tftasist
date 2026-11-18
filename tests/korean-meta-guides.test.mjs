import test from 'node:test';
import assert from 'node:assert/strict';
import { metaGuides } from '../src/meta-guides.js';
import { rankBuildPaths } from '../src/build-paths.js';

test('five Korean patch 18.6 final boards retain their original structure', () => {
  const finalBoards=metaGuides.filter(guide=>guide.kind==='final-board');
  assert.equal(finalBoards.length,5);
  for (const guide of finalBoards) {
    assert.equal(guide.patch,'18.6');
    assert.equal(guide.kind,'final-board');
    assert.ok(guide.source.startsWith('https://'));
    assert.equal(guide.stages.length,1);
    assert.equal(guide.stages[0].level,9);
    assert.ok(guide.finalUnits.every(x=>typeof x==='string' && x.length>0));
  }
});

test('Korean name overlap returns a sourced final board without fabricated early stages', () => {
  const finalBoards=metaGuides.filter(guide=>guide.kind==='final-board');
  const result=rankBuildPaths(finalBoards,{units:['덩굴정령','돌거북'],items:[],level:5});
  assert.ok(result.some(x=>x.id==='brambleback'));
  assert.ok(result.every(x=>x.kind==='final-board' && x.stageLevel===null && x.stageUnits.length===0));
});
