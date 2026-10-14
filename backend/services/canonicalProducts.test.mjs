import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSourceKey} from '../../shared/comparison.mjs';

test('a entidade canônica reúne representações equivalentes', () => {
  const left = {name:'Arroz Tio João 5kg', department:'Mercearia', priceBasis:'unit'};
  const right = {name:'Tio João Arroz 5 Kg', department:'Cereais e farináceos', priceBasis:'unit'};
  assert.equal(canonicalSourceKey(left), canonicalSourceKey(right));
});

test('tamanho e variante criam produtos canônicos diferentes', () => {
  const base = {department:'Mercearia', priceBasis:'unit'};
  assert.notEqual(canonicalSourceKey({...base, name:'Arroz Tio João 5kg'}), canonicalSourceKey({...base, name:'Arroz Tio João 1kg'}));
  assert.notEqual(canonicalSourceKey({...base, name:'Arroz Tio João Tipo 1 5kg'}), canonicalSourceKey({...base, name:'Arroz Tio João Tipo 2 5kg'}));
});
