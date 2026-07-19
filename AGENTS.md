# AGENTS.md — Crediterreno

## Project Overview

Una calculadora integral de crédito Infonavit para compra de terreno (Crediterreno). Simula pagos, amortización, nómina, ISR e ingresos extraordinarios. Single-page HTML/JS app.

## Tech Stack

- Vanilla HTML + CSS + JavaScript (no frameworks)
- jsPDF (CDN) for PDF export/import
- Canvas API for chart rendering
- SAT 2024 tax tables (ISR, Subsidio al Empleo, IMSS)

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Markup only (structure, IDs, script/style tags) |
| `styles.css` | All styles and design tokens |
| `app.js` | All runtime logic: state, calculations, rendering, PDF I/O |

## Skill maintenance (REQUIRED)

The [`crediterreno-logic`](.claude/skills/crediterreno-logic/SKILL.md) skill documents the calculation and state logic in `app.js`. **Every subsequent change to `app.js` must update this skill in the same commit** whenever it touches:

- ISR / IMSS / PMT / amortization formulas or SAT tables
- State shape (`packState` / `loadState`) or version bump
- Applied-suggestion sentinels in `appliedEIs`
- The recalc pipeline order or invariants
- Tab list, event bindings, or plan suggestion ranking
- PDF `%%CTDATA%%` embedding/extraction

Use the checklist in the skill's "When Changing Things" section. Pure cosmetic edits (whitespace, comments) do not require an update.

## Commands

- **Build**: none — static HTML, no build step
- **Dev**: `open index.html` or any static file server
- **Deploy**: push `main` — GitHub Pages serves `index.html` from root

## Architecture

All logic lives in `app.js` (loaded from `index.html`):

- **State**: `cYears`, `extraPayments[]`, `fixedExpenses[]`, `extraIncomes[]`, `appliedEIs`
- **Core modules**: ISR calculation (`calcISR`), credit amortization (`calcPMT`, `buildTable`), chart rendering (`renderChart`)
- **PDF**: Export via `generatePDF()` — embeds base64 state in PDF metadata for round-trip import
- **Tabs**: 3-tab UI — Crédito, Nómina & ISR, Plan (pagos extraordinarios)

## State Persistence

State is serialized via `packState()` / `loadState()`:
- **Export**: embedded as `%%CTDATA%%` in PDF metadata
- **Import**: PDF reader extracts and loads state

## Important Conventions

- Monetary formatting uses `Intl.NumberFormat` with `es-MX` locale and MXN currency
- All financial calculations are estimates — disclaimer is shown in UI and PDF export
- Extra payments are stored as objects `{id, month, amount}`
- Extra incomes can be one-time or recurring (annual)

## Design Tokens

CSS custom properties in `:root`:
- `--brand: #c8102e` (red, primary)
- `--accent: #f4a300` (amber, secondary)
- Semantic colors: `--green`, `--red`, `--purple`, `--blue`

## SAT 2024 Tables

Embedded as `ISR_T` (11 brackets) and `SUB_T` (subsidio al empleo). UMA mensual hardcoded at $3,300.53.
