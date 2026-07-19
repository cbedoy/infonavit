---
name: infonavit-logic
description: Use when modifying, debugging, or extending the Calculadora Infonavit (app.js) — covers ISR/IMSS/PMT formulas, amortization with extras, extra-income scheduling, plan suggestions, and PDF round-trip state persistence.
---

# Calculadora Infonavit — Business Logic Reference

Single-page vanilla-JS calculator for Infonavit credit. All runtime logic lives in `app.js`; UI markup in `index.html`; styles in `styles.css`.

**Keep this skill in sync with `app.js`.** Every change to formulas, state shape, ID counters, PDF layout, or applied-suggestion rules requires updating the matching section here in the same commit.

## Module Map

| Area | Functions | Lines (approx) |
|------|-----------|----------------|
| Constants (SAT 2024, brand, EI types) | `BRAND`, `ISR_T`, `SUB_T`, `UMA_M`, `EI_TYPES` | 1–48 |
| Global state | `cYears`, `extraPayments`, `fixedExpenses`, `extraIncomes`, `appliedEIs`, `epId/gfId/eiId` | 50–52 |
| Tax calculations | `calcISR`, `calcIMSS` | 58–69 |
| Amortization | `calcPMT`, `buildTable`, `groupByYear` | 71–93 |
| Extra income scheduling | `eiToMonths`, `buildExtrasMap` | 94–111 |
| Recalc pipeline | `recalcAll`, `recalcCredit`, `recalcNomina`, `recalcPlan` | 113–156 |
| Renderers | `renderCreditResults`, `renderAmortTable`, `renderChart`, `renderNomina`, `renderPlan` | 158–254 |
| CRUD lists | `addEP/removeEP/updateEP/renderEPList` and GF/EI equivalents | 256–305 |
| Persistence | `packState`, `loadState`, `toB64`, `fromB64` | 307–336 |
| PDF | `exportPDF`, `generatePDF`, `importPDF` | 338–543 |
| UI plumbing | `showTab`, `toast`, `toggleTable`, event bindings | 545–567 |

## Core Formulas

### ISR (Impuesto Sobre la Renta)
```
raw    = bracket.c + (gross − bracket.li) × bracket.p
subsidy = SUB_T lookup where gross ≤ ls
isr    = max(0, raw − subsidy)
```
- `ISR_T` = 11 brackets (SAT 2024 monthly). Match with `g >= li && g <= ls`.
- `SUB_T` = subsidio al empleo table; first row where `g <= ls`.

### IMSS (employee quotas)
```
excess = max(0, gross − 3 × UMA_M)            // UMA_M = 3300.53
imss   = excess × 0.0075 + gross × (0.00625 + 0.01125)
```
Estimate only — real quotas depend on SBC.

### PMT (fixed monthly payment)
```
if r == 0: P / n
else:      P × (r × (1+r)^n) / ((1+r)^n − 1)
```
`r` = monthly rate (annual% / 100 / 12). `n` = `cYears × 12`.

### Amortization row
```
interest  = balance × r
principal = min(pmt − interest, balance)
extra     = min(exMap.get(month) || 0, balance_after_principal)
balance  -= principal + extra
```
Loop stops when `balance < 0.005` (5-millicent tolerance).

### Extra-income month projection (`eiToMonths`)
- `off = ((calMonth − startMonth + 12) % 12) + 1 + y × 12` for each year `y`.
- If `ei.repeat === false`, only first occurrence is kept.
- Only included if `appliedEIs.has(ei.id)`.

## State Shape

```js
{
  v: 3,                                    // bump when shape changes
  price, savings, rate, years,             // credit inputs
  startMonth, startYear,
  salary, currentSavings,                  // nómina inputs
  extraPayments: [{id, month, amount}],
  fixedExpenses: [{id, label, amount}],
  extraIncomes:  [{id, type, label, calMonth, amount, repeat}],
  appliedEIs: [ids…],                      // includes 'curSav' sentinel
  epId, gfId, eiId                         // monotonic counters
}
```

Applied suggestion sentinels currently stored in `appliedEIs`:
- Extra-income IDs (numbers from `eiId`)
- `'curSav'` — marks the "usar ahorro actual" suggestion as applied

## PDF Round-Trip Persistence

State is embedded in PDF metadata via `doc.setProperties({ keywords: '%%CTDATA%%<b64>%%CTDATA%%' })`.

Import path (`importPDF`):
1. Read file as `ArrayBuffer` → decode as `latin1`.
2. Strip whitespace (`\r\n\s+`).
3. Match `/%%CTDATA%%([\w+/=]+)%%CTDATA%%/`.
4. `fromB64` → `JSON.parse` → `loadState`.

Base64 helpers handle UTF-8 via `unescape(encodeURIComponent(...))` — do not remove.

## Recalc Pipeline

Any input change → `recalcAll()`:
1. `recalcCredit` — validates, computes `PMT`, base + extras amortization tables, stores `window._credit`.
2. `recalcNomina` — needs `window._credit.pmt`; computes ISR, IMSS, neto, superávit; stores `window._nomina`.
3. `recalcPlan` → `renderPlan` — reads both globals to render suggestions.

**Invariant:** `recalcNomina` and `renderPlan` are safe with `_credit == null` (early-return / placeholder rendering). Preserve this.

## Validation Rules (recalcCredit)

- `price > 0`
- `savings >= 0` and `savings < price`
- `rate >= 0`

On failure: show `#err-credit`, call `clearCreditUI()`, set `window._credit = null`.

## Plan Suggestions Ranking

`renderPlan` builds `sugs[]` in this order (do not reshuffle without updating apply-index references):
1. `curSav > 5000 && !appliedEIs.has('curSav')` → apply as month-1 extra payment.
2. `superavit > 500` → informational (no apply button).
3. `superavit < 0` → warning (no apply).
4. Each `extraIncome` with `amount > 0` — apply button toggles `appliedEIs`.

The `Aplicar` button uses `window._sugs[si]?.onApply()` — `_sugs` must be assigned before HTML render.

## Chart Rendering (`renderChart`)

Canvas with `devicePixelRatio` scaling. Three stacked bar segments per year:
- Red (`#c8102e`)   — principal
- Purple (`#7c3aed`) — extras
- Amber (`#f4a300`) — interest

Rebound on `window resize`.

## When Changing Things — Checklist

- [ ] Formula change (ISR/IMSS/PMT/amort) → update "Core Formulas" section.
- [ ] Add/remove state field → bump `packState` `v`, add `loadState` migration/guard, update "State Shape".
- [ ] New suggestion or applied-sentinel → update "Plan Suggestions Ranking" and "State Shape".
- [ ] PDF layout change → note in module map only if new function; otherwise no doc change needed.
- [ ] New tab / event binding → update "Module Map" line range and `showTab` index array (`['credito','nomina','plan']`).
- [ ] Change chart colors or segments → update "Chart Rendering".

## Common Pitfalls

- **Don't call `recalcNomina` before `recalcCredit`** — `_credit.pmt` would be stale.
- **`applyEIs` is a `Set`** — `packState` spreads to array, `loadState` reconstructs. Preserve this.
- **`eiToMonths` returns `[]` when `calMonth` is falsy** — required for `type: 'bono' | 'otro'` where `dm` is null; UI must supply month before amounts flow through.
- **PDF import strips whitespace globally** before regex — needed because jsPDF may line-wrap keywords.
- **`showTab` selects nav buttons by index** matching `['credito','nomina','plan']`. Adding a tab requires updating this array.
