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
| `index.html` | Single-file app: markup, styles, and all JS logic |

## Commands

- **Build**: none — static HTML, no build step
- **Dev**: `open index.html` or any static file server
- **Deploy**: push `main` — GitHub Pages serves `index.html` from root

## Architecture

All logic lives in a single `<script>` block inside `index.html`:

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
