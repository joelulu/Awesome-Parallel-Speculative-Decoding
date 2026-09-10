import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData, validateData } from '../scripts/validate-data.mjs';
import { filterMethods } from '../src/lib/catalog.mjs';
const data=await loadData();

test('unavailable and placeholder repositories do not count as usable code',()=>{
  const base=data.methods[0];
  const fixtures=['available','unavailable','placeholder','pull-request'].map(availability=>({...base,id:availability,code:[{...base.code[0],availability}]}));
  assert.deepEqual(filterMethods(fixtures,'','all',true).map(m=>m.id),['available','pull-request']);
});

test('D-CUT links to the implementation PR with framework-scoped stars',()=>{
  const code=data.methods.find(m=>m.id==='d-cut').code[0];
  assert.equal(code.url,'https://github.com/vllm-project/vllm/pull/47131');
  assert.equal(code.repo,'vllm-project/vllm');
  assert.equal(code.kind,'integration');
});

test('audited code entries preserve primary evidence and unknown stars',()=>{
  for(const method of data.methods) for(const code of method.code){
    assert.ok(code.evidenceUrl && code.checkedAt && code.availability);
    if(code.availability==='unavailable')assert.equal(data.stars[code.repo],undefined);
    else assert.ok(Number.isInteger(data.stars[code.repo]?.count));
  }
  const methods=structuredClone(data.methods);
  methods[0].code[0].evidenceUrl='';
  assert.ok(validateData({...data,methods}).some(error=>error.includes('code evidence')));
});
