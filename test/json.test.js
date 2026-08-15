import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLastJsonBlock } from '../server/claude.js';

const fence = (body) => '```json\n' + body + '\n```';

test('czysty blok json parsuje się', () => {
  assert.deepEqual(extractLastJsonBlock(`Proszę:\n${fence('{"a": 1}')}\ngotowe`), { a: 1 });
});

test('literalny ``` wewnątrz wartości stringa nie ucina bloku', () => {
  const body = '{"code": "użyj ``` do bloku kodu", "a": 2}';
  assert.deepEqual(extractLastJsonBlock(fence(body)), { code: 'użyj ``` do bloku kodu', a: 2 });
});

test('przy dwóch blokach wygrywa ostatni', () => {
  const text = `${fence('{"a": 1}')}\n\nPoprawka:\n${fence('{"a": 2}')}`;
  assert.deepEqual(extractLastJsonBlock(text), { a: 2 });
});

test('goły JSON bez płotków parsuje się', () => {
  assert.deepEqual(extractLastJsonBlock('  {"a": 1}  '), { a: 1 });
  assert.deepEqual(extractLastJsonBlock('[1, 2]'), [1, 2]);
});

test('odpowiedź ucięta przed domknięciem płotka wciąż parsuje się', () => {
  assert.deepEqual(extractLastJsonBlock('```json\n{"a": 1}'), { a: 1 });
});

test('śmieci dają null, nie wyjątek', () => {
  assert.equal(extractLastJsonBlock('nie ma tu nic'), null);
  assert.equal(extractLastJsonBlock(fence('{nie json}')), null);
  assert.equal(extractLastJsonBlock('{"a": '), null);
});
