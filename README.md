# Crediterreno 🏠

**Calculadora Integral de Crédito Infonavit para compra de terreno.**

Simula tu crédito Crediterreno con desglose completo de amortización, ISR estimado (tablas SAT 2024), IMSS, gastos fijos y un plan inteligente de pagos extraordinarios.

## Características

- 💳 **Simulación de crédito** — monto, tasa, plazo (5/10/15 años), pagos fijos
- 📅 **Amortización con pagos extra** — tabla dinámica con impacto visual de pagos adelantados
- 💼 **Nómina & ISR** — cálculo con tablas SAT 2024, subsidio al empleo e IMSS estimado
- 📊 **Plan de pagos** — sugerencias inteligentes basadas en superávit, ahorros e ingresos extraordinarios
- 📄 **Exportación/Importación PDF** — guarda y recupera el estado completo de la simulación
- 📈 **Gráfico anual** — capital vs interés por año (Canvas API)

## Archivos

| Archivo | Propósito |
|---------|-----------|
| `index.html` | Markup HTML puro (sin `<style>`/`<script>` inline) |
| `styles.css` | Todos los estilos y design tokens |
| `app.js` | Lógica completa: estado, cálculos, rendering, PDF I/O |
| `.claude/skills/crediterreno-logic/SKILL.md` | Referencia de la lógica de negocio para agentes AI |

| Archivo | Propósito |
|---------|-----------|
| `index.html` | Markup HTML puro (sin <style>/<script> inline) |
| `styles.css` | Todos los estilos y design tokens |
| `app.js` | Lógica completa: estado, cálculos, rendering, PDF I/O |

## Stack

- HTML + CSS + JavaScript (vanilla, sin dependencias)
- [jsPDF](https://github.com/parallax/jsPDF) — generación de PDF
- Canvas API — gráficos de barras
- Tablas ISR SAT 2024 · Subsidio al Empleo · IMSS

## Uso

1. Abre `index.html` en tu navegador o despliega con cualquier servidor estático
2. Ingresa el precio del terreno, ahorro disponible, tasa y plazo
3. (Opcional) Agrega pagos extraordinarios a capital
4. Ve a la pestaña **Nómina & ISR** para calcular tu capacidad de pago
5. La pestaña **Plan** te sugerirá cómo aplicar ingresos extra para liquidar antes
6. Exporta a PDF para guardar tu simulación

## Disclaimer

⚠️ **Esta herramienta es una SIMULACIÓN con fines informativos y educativos únicamente.** Los resultados son estimaciones y pueden diferir de los valores reales. No constituye asesoría financiera, fiscal ni legal. Consulta a un asesor certificado o contador antes de tomar decisiones de crédito.

## Autor

**Carlos Cervantes Bedoy** · Software Engineer · Aguascalientes, México

[![LinkedIn](https://img.shields.io/badge/LinkedIn-carlos--cervantes--bedoy-blue)](https://www.linkedin.com/in/carlos-cervantes-bedoy/)
📧 carlos.bedoy@gmail.com

---

⚡ Desarrollado con Claude AI · Anthropic
