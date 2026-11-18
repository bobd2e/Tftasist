import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('POST /api/build-paths accepts Korean champion and item names', async () => {
 const request = new Request('https://example.test/api/build-paths', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body:JSON.stringify({units:['덩굴정령','돌거북'],items:['B.F. 대검','곡궁'],level:7})
 });
 const response=await worker.fetch(request,{});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.ok,true);
 assert.ok(data.recommendations.some(x=>x.id==='brambleback'));
 assert.ok(data.recommendations.some(x=>x.id==='brambleback' && x.finalMatchedUnits.length===2));
});
