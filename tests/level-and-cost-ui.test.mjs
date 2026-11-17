import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const script=html.slice(html.indexOf('<script>')+8,html.indexOf('</script>'));
test('inline frontend JavaScript parses after level-picker refactor',()=>{assert.doesNotThrow(()=>new Script(script));});
test('cost tabs replace global level selector',()=>{
 assert.doesNotMatch(html,/id="playerLevel"/);
 for(let cost=0;cost<=5;cost++)assert.match(html,new RegExp('data-unit-cost="'+cost+'"'));
 assert.match(script,/state\.unitCost/);
 assert.match(script,/x\.cost===state\.unitCost/);
});
test('composition-specific level tabs show only registered stages',()=>{
 assert.match(script,/data-build-level/);
 assert.match(script,/빌드업 데이터 미등록/);
 assert.match(script,/st\.units\.length<=selected/);
});
