import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeComparisonResponse} from './api.js';

test('converte grupos da API antiga para o comparador simplificado', () => {
  const base = {department:'Mercearia', priceBasis:'unit', ultimaAtualizacao:'2026-09-23T12:00:00Z', disponivel:true};
  const response = normalizeComparisonResponse({
    product:{...base, id:'a', supermercado:'a', name:'Arroz Camil 5kg', priceNumber:20},
    groups:{
      identical:[],
      highConfidence:[{...base, id:'b', supermercado:'b', name:'Camil Arroz 5 kg', priceNumber:19}],
      equivalent:[{...base, id:'c', supermercado:'c', name:'Arroz Camil 1kg', priceNumber:5}],
      similar:[{...base, id:'d', supermercado:'d', name:'Arroz Tio João 5kg', priceNumber:18}]
  }});
  assert.deepEqual(response.groups.sameProduct.map(item => item.id), ['b']);
  assert.deepEqual(response.groups.similar.map(item => item.id), ['c']);
  assert.deepEqual(response.groups.alternatives.map(item => item.id), ['d']);
});

test('preserva respostas no formato novo', () => {
  const response = {groups:{sameProduct:[], similar:[], alternatives:[]}};
  assert.equal(normalizeComparisonResponse(response), response);
});
