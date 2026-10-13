import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fmtNum, num, fmtIn, inStr, esc, cap } from '../../src/utils/format.js';

test('fmt usa punto para miles y coma para decimales', () => {
  assert.equal(fmt(1234.5), '$1.234,50');
  assert.equal(fmt(0), '$0,00');
  assert.equal(fmt(-8), '-$8,00');
  assert.equal(fmt(1234567.891), '$1.234.567,89');
  assert.equal(fmt(999.999), '$1.000,00');
});
test('fmt no muestra signo menos para valores que redondean a cero', () => {
  assert.equal(fmt(-0.001), '$0,00');
});
test('fmtNum sin decimales', () => { assert.equal(fmtNum(1234567, 0), '1.234.567'); });
test('num lee los formatos que escribe una persona', () => {
  assert.equal(num('1.234,56'), 1234.56);
  assert.equal(num('1234,56'), 1234.56);
  assert.equal(num('1234.56'), 1234.56);
  assert.equal(num('1.500'), 1500);     // punto de miles
  assert.equal(num('45'), 45);
  assert.equal(num('0,5'), 0.5);
  assert.equal(num('1.234.567,50'), 1234567.5);
  assert.ok(Number.isNaN(num('')));
  assert.ok(Number.isNaN(num('abc')));
});
test('fmtIn / inStr precargan campos', () => {
  assert.equal(fmtIn(1500), '1.500');
  assert.equal(fmtIn(1234.5), '1.234,50');
  assert.equal(inStr('1500'), '1.500');
  assert.equal(inStr('x'), '');
});
test('esc escapa HTML y cap capitaliza', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc(null), '');
  assert.equal(cap('hola'), 'Hola');
});
