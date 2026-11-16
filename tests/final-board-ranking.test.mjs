import test from 'node:test';
import assert from 'node:assert/strict';
import { rankBuildPaths } from '../src/build-paths.js';

test('final boards rank by actual owned unit overlap even at level 5',()=>{
 const guides=[
 {id:'one',name:'One',kind:'final-board',stages:[{level:9,units:['A','B','C','D','E','F','G','H','I']}],finalUnits:['A','B','C','D','E','F','G','H','I'],items:[]},
 {id:'two',name:'Two',kind:'final-board',stages:[{level:9,units:['A','B','X','Y','Z','P','Q','R','S']}],finalUnits:['A','B','X','Y','Z','P','Q','R','S'],items:[]}
 ];
 const ranked=rankBuildPaths(guides,{units:['A','B','C'],items:[],level:5});
 assert.equal(ranked[0].id,'one');
 assert.equal(ranked[0].finalMatchedUnits.length,3);
 assert.equal(ranked[0].finalMissingUnits.length,6);
 assert.equal(ranked[0].stageLevel,null);
 assert.deepEqual(ranked[0].stageUnits,[]);
});
