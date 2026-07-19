const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ISR_T, UMA_M,
  calcISR, calcIMSS, calcPMT,
  buildTable, buildExtrasMap, eiToMonths, groupByYear,
} = require('../calc.js');

const approx = (a, b, eps = 0.01) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (±${eps})`);

// ── calcPMT ──────────────────────────────────────────────────────────
test('calcPMT: zero interest divides principal by n', () => {
  approx(calcPMT(120000, 0, 12), 10000);
});

test('calcPMT: 9% annual over 10 years on 900k', () => {
  approx(calcPMT(900000, 0.09 / 12, 120), 11400.82, 0.5);
});

// ── buildTable core invariants ───────────────────────────────────────
test('buildTable: principal + extra sum to P over full amortization', () => {
  const P = 900000, r = 0.09 / 12, n = 120;
  const pmt = calcPMT(P, r, n);
  const rows = buildTable(P, r, n, pmt, new Map(), 1, 2025);
  const totalCap = rows.reduce((s, x) => s + x.principal + x.extra, 0);
  approx(totalCap, P, 0.05);
  assert.ok(rows[rows.length - 1].balance < 0.01);
});

test('buildTable: extra payment reduces balance same month', () => {
  const P = 900000, r = 0.09 / 12, n = 120;
  const pmt = calcPMT(P, r, n);
  const base = buildTable(P, r, n, pmt, new Map(), 1, 2025);
  const withEx = buildTable(P, r, n, pmt, new Map([[1, 200000]]), 1, 2025);
  // Row 1 balance in `withEx` should be exactly 200k less than base row 1
  approx(withEx[0].balance, base[0].balance - 200000, 0.01);
  assert.equal(withEx[0].extra, 200000);
});

test('buildTable: extras shorten term and reduce total interest', () => {
  const P = 900000, r = 0.09 / 12, n = 120;
  const pmt = calcPMT(P, r, n);
  const base = buildTable(P, r, n, pmt, new Map(), 1, 2025);
  const withEx = buildTable(P, r, n, pmt, new Map([[1, 200000]]), 1, 2025);
  const baseInt = base.reduce((s, x) => s + x.interest, 0);
  const wInt = withEx.reduce((s, x) => s + x.interest, 0);
  assert.ok(withEx.length < base.length, 'term should shrink');
  assert.ok(wInt < baseInt, 'total interest should decrease');
});

test('buildTable: extra capped at remaining balance (no negative balance)', () => {
  const P = 100000, r = 0.09 / 12, n = 120;
  const pmt = calcPMT(P, r, n);
  const rows = buildTable(P, r, n, pmt, new Map([[1, 500000]]), 1, 2025);
  assert.equal(rows.length, 1);
  assert.ok(rows[0].balance < 0.01);
  assert.ok(rows[0].extra < 200000, 'extra should be capped, not full 500k');
});

test('buildTable: zero interest — every peso goes to principal', () => {
  const P = 1200, r = 0, n = 12;
  const rows = buildTable(P, r, n, calcPMT(P, r, n), new Map(), 1, 2025);
  rows.forEach(row => assert.equal(row.interest, 0));
  approx(rows.reduce((s, x) => s + x.principal, 0), P);
});

// ── buildExtrasMap ───────────────────────────────────────────────────
test('buildExtrasMap: aggregates extraPayments for same month', () => {
  const eps = [
    { id: 1, month: '3', amount: '5000' },
    { id: 2, month: '3', amount: '2000' },
    { id: 3, month: '5', amount: '1000' },
  ];
  const map = buildExtrasMap(eps, [], new Set(), 120, 1);
  assert.equal(map.get(3), 7000);
  assert.equal(map.get(5), 1000);
});

test('buildExtrasMap: ignores empty/invalid month or amount', () => {
  const eps = [
    { id: 1, month: '', amount: '5000' },
    { id: 2, month: '3', amount: '' },
    { id: 3, month: '0', amount: '1000' },     // out of range
    { id: 4, month: '999', amount: '1000' },   // > n
    { id: 5, month: '3', amount: '-500' },     // negative
  ];
  const map = buildExtrasMap(eps, [], new Set(), 120, 1);
  assert.equal(map.size, 0);
});

test('buildExtrasMap: includes applied EIs, excludes unapplied', () => {
  const eis = [
    { id: 10, calMonth: 12, amount: '30000', repeat: false },
    { id: 11, calMonth: 6,  amount: '20000', repeat: false },
  ];
  const applied = new Set([10]);
  const map = buildExtrasMap([], eis, applied, 24, 1);
  assert.equal(map.get(12), 30000);
  assert.ok(!map.has(6));
});

test('buildExtrasMap: recurring EI populates every year in range', () => {
  const eis = [{ id: 1, calMonth: 12, amount: '30000', repeat: true }];
  const map = buildExtrasMap([], eis, new Set([1]), 36, 1);
  assert.equal(map.get(12), 30000);
  assert.equal(map.get(24), 30000);
  assert.equal(map.get(36), 30000);
});

test('buildExtrasMap: EI + extraPayment on same month sum together', () => {
  const eps = [{ id: 1, month: '12', amount: '5000' }];
  const eis = [{ id: 9, calMonth: 12, amount: '30000', repeat: false }];
  const map = buildExtrasMap(eps, eis, new Set([9]), 24, 1);
  assert.equal(map.get(12), 35000);
});

// ── eiToMonths ───────────────────────────────────────────────────────
test('eiToMonths: startMonth=1, calMonth=12 → month 12', () => {
  assert.deepEqual(eiToMonths({ calMonth: 12, repeat: false }, 1, 24), [12]);
});

test('eiToMonths: startMonth=6, calMonth=12 → month 7 first, then 19 if repeat', () => {
  assert.deepEqual(eiToMonths({ calMonth: 12, repeat: false }, 6, 36), [7]);
  assert.deepEqual(eiToMonths({ calMonth: 12, repeat: true },  6, 36), [7, 19, 31]);
});

test('eiToMonths: falsy calMonth returns empty', () => {
  assert.deepEqual(eiToMonths({ calMonth: null,    repeat: true }, 1, 12), []);
  assert.deepEqual(eiToMonths({ calMonth: 0,       repeat: true }, 1, 12), []);
  assert.deepEqual(eiToMonths({ calMonth: 'abc',   repeat: true }, 1, 12), []);
});

// ── calcISR (SAT 2024) ───────────────────────────────────────────────
test('calcISR: bracket 1 (very low income) — mostly offset by subsidy', () => {
  const { isr, bracket, raw, sub } = calcISR(500);
  assert.equal(bracket.p, 0.0192);
  approx(raw, (500 - 0.01) * 0.0192);
  assert.ok(sub > 0);
  assert.equal(isr, Math.max(0, raw - sub));
});

test('calcISR: bracket 8 (mid income ~$50k) uses 30% rate', () => {
  const { bracket } = calcISR(50000);
  assert.equal(bracket.p, 0.3);
});

test('calcISR: top bracket applies to very high incomes', () => {
  const { bracket } = calcISR(500000);
  assert.equal(bracket.p, 0.35);
});

test('calcISR: bracket boundaries match ISR_T', () => {
  ISR_T.forEach(row => {
    if (row.ls === Infinity) return;
    const { bracket } = calcISR(row.ls);
    assert.equal(bracket, row);
  });
});

// ── calcIMSS ─────────────────────────────────────────────────────────
test('calcIMSS: below 3× UMA has no excess component', () => {
  const g = 3 * UMA_M - 1;
  approx(calcIMSS(g), g * (0.00625 + 0.01125));
});

test('calcIMSS: above 3× UMA adds 0.75% on excess', () => {
  const g = 3 * UMA_M + 10000;
  const expected = 10000 * 0.0075 + g * (0.00625 + 0.01125);
  approx(calcIMSS(g), expected);
});

// ── groupByYear ──────────────────────────────────────────────────────
test('groupByYear: sums capital/interest/extra per year of 12 months', () => {
  const rows = [
    { month: 1,  principal: 100, interest: 50, extra: 10 },
    { month: 12, principal: 200, interest: 40, extra:  0 },
    { month: 13, principal: 300, interest: 30, extra: 20 },
    { month: 24, principal: 400, interest: 20, extra:  0 },
  ];
  const g = groupByYear(rows);
  assert.equal(g.length, 2);
  assert.deepEqual(g[0], { year: 1, capital: 300, interest: 90, extra: 10 });
  assert.deepEqual(g[1], { year: 2, capital: 700, interest: 50, extra: 20 });
});
