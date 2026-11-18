import test from 'node:test';
import assert from 'node:assert/strict';
import {rankBuildPaths} from '../src/build-paths.js';
const guides=[{id:'g',name:'검증용',kind:'final-board',finalUnits:['덩굴정령','돌거북'],stages:[{level:9,units:['덩굴정령','돌거북']}],items:[],itemByUnit:{'덩굴정령':['도적의 장갑'],'돌거북':['가고일 돌갑옷','가고일 돌갑옷','정령의 형상']}}];
test('per-champion item match respects duplicate quantities and Korean names',()=>{
 const [r]=rankBuildPaths(guides,{units:['덩굴정령'],items:['가고일 돌갑옷','도적의 장갑'],level:7});
 assert.equal(r.suggestedItemCount,4);
 assert.equal(r.matchedSuggestedItems.length,2);
 assert.equal(r.itemCoverage,null);
 assert.equal(r.stageLevel,null);
});
test('extra owned copies cannot exceed suggested item quantity',()=>{
 const [r]=rankBuildPaths(guides,{units:['돌거북'],items:['도적의 장갑','도적의 장갑','도적의 장갑'],level:7});
 assert.deepEqual(r.matchedSuggestedItems,['도적의장갑']);
});

test('ignore item suggestions for champions outside final board and cap to three slots',()=>{
 const guide={id:'cap',name:'캡',kind:'final-board',finalUnits:['돌거북'],stages:[{level:9,units:['돌거북']}],itemByUnit:{'돌거북':['가고일 돌갑옷','워모그의 갑옷','정령의 형상','도적의 장갑'],'다른 기물':['곡궁']}};
 const [r]=rankBuildPaths([guide],{units:['돌거북'],items:['곡궁','도적의 장갑','가고일 돌갑옷'],level:7});
 assert.equal(r.suggestedItemCount,3);
 assert.equal(r.matchedSuggestedItems.length,1);
});
