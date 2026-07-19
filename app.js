const BRAND = {
  name: 'Carlos Cervantes Bedoy',
  title: 'Software Engineer',
  linkedin: 'linkedin.com/in/carlos-cervantes-bedoy',
  email: 'carlos.bedoy@gmail.com',
  location: 'Aguascalientes, México',
  builtWith: 'Desarrollado con Claude AI · Anthropic',
  year: new Date().getFullYear(),
  disclaimer: [
    'Esta herramienta es una SIMULACIÓN con fines informativos. Los resultados son aproximaciones y NO tienen validez oficial.',
    'ISR calculado con tablas SAT 2024. Puede diferir de la retención real de nómina.',
    'Cuotas IMSS estimadas; el valor exacto depende del Salario Base de Cotización registrado.',
    'Condiciones Infonavit varían por perfil del acreditado y políticas vigentes.',
    'NO constituye asesoría financiera, fiscal ni legal.',
    'Consulta a un asesor certificado o contador antes de tomar decisiones de crédito.',
  ]
};
document.getElementById('yr').textContent = BRAND.year;

const ISR_T = [
  {li:0.01,      ls:746.04,     c:0,         p:.0192},
  {li:746.05,    ls:6332.05,    c:14.32,     p:.0640},
  {li:6332.06,   ls:11128.01,   c:371.83,    p:.1088},
  {li:11128.02,  ls:12935.82,   c:893.63,    p:.1600},
  {li:12935.83,  ls:15487.71,   c:1182.88,   p:.1792},
  {li:15487.72,  ls:31236.49,   c:1640.18,   p:.2136},
  {li:31236.50,  ls:49233.00,   c:4002.14,   p:.2352},
  {li:49233.01,  ls:93993.90,   c:8233.57,   p:.3000},
  {li:93993.91,  ls:125325.20,  c:21661.94,  p:.3200},
  {li:125325.21, ls:375975.61,  c:31683.24,  p:.3400},
  {li:375975.62, ls:Infinity,   c:117912.32, p:.3500},
];
const SUB_T = [
  {ls:1768.96,s:407.02},{ls:2653.38,s:406.83},{ls:3472.84,s:406.62},
  {ls:3537.87,s:392.77},{ls:4446.15,s:382.46},{ls:4717.18,s:354.23},
  {ls:5335.42,s:324.87},{ls:6224.67,s:294.63},{ls:7113.90,s:253.54},
  {ls:7382.33,s:217.61},{ls:Infinity,s:0},
];
const MN  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MNL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const EI_TYPES = [
  {v:'aguinaldo',  l:'🎄 Aguinaldo',       dm:12},
  {v:'ptu',        l:'📈 Utilidades (PTU)', dm:5},
  {v:'fondo',      l:'💰 Fondo de ahorro',  dm:6},
  {v:'vacaciones', l:'🏖️ Prima vacacional', dm:7},
  {v:'bono',       l:'🎯 Bono',             dm:null},
  {v:'otro',       l:'💵 Otro',             dm:null},
];

let cYears=10,epId=0,gfId=0,eiId=0;
let extraPayments=[],fixedExpenses=[],extraIncomes=[];
let appliedEIs=new Set();

const fmx =new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2});
const fmx0=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
const fmt=v=>fmx.format(v), fmt0=v=>fmx0.format(v);

function calcISR(g){
  const row=ISR_T.find(r=>g>=r.li&&g<=r.ls);
  if(!row) return {isr:0,raw:0,sub:0,bracket:null};
  const raw=row.c+(g-row.li)*row.p;
  const sub=SUB_T.find(r=>g<=r.ls)?.s||0;
  return {isr:Math.max(0,raw-sub),raw,sub,bracket:row};
}
const UMA_M=3300.53;
function calcIMSS(g){
  const ex=Math.max(0,g-3*UMA_M);
  return ex*.0075+g*(.00625+.01125);
}

function calcPMT(P,r,n){
  if(r===0) return P/n;
  const f=Math.pow(1+r,n);
  return P*(r*f)/(f-1);
}
function buildTable(P,r,n,pmt,exMap,sm,sy){
  const rows=[];let bal=P;
  for(let m=1;m<=n&&bal>0.005;m++){
    const int=bal*r,cap=Math.min(pmt-int,bal);
    bal-=cap;
    const ex=Math.min(exMap.get(m)||0,bal);
    bal-=ex;
    const idx=(sm-1+m-1)%12,yr=sy+Math.floor((sm-1+m-1)/12);
    rows.push({month:m,date:`${MN[idx]} ${yr}`,payment:int+cap,interest:int,principal:cap,extra:ex,balance:Math.max(0,bal)});
    if(bal<0.005) break;
  }
  return rows;
}
function groupByYear(rows){
  const m={};
  rows.forEach(r=>{const y=Math.ceil(r.month/12);if(!m[y])m[y]={capital:0,interest:0,extra:0};m[y].capital+=r.principal;m[y].interest+=r.interest;m[y].extra+=r.extra;});
  return Object.entries(m).map(([y,v])=>({year:+y,...v}));
}
function eiToMonths(ei,sm,n){
  const cm=parseInt(ei.calMonth);if(!cm) return [];
  const months=[];
  for(let y=0;y<Math.ceil(n/12);y++){
    const off=((cm-sm+12)%12)+1+y*12;
    if(off>=1&&off<=n) months.push(off);
    if(!ei.repeat) break;
  }
  return months;
}
function buildExtrasMap(n,sm){
  const map=new Map();
  extraPayments.forEach(ep=>{const mo=parseInt(ep.month),am=parseFloat(ep.amount);if(mo>=1&&mo<=n&&am>0)map.set(mo,(map.get(mo)||0)+am);});
  extraIncomes.filter(ei=>appliedEIs.has(ei.id)).forEach(ei=>{
    eiToMonths(ei,sm,n).forEach(m=>{const am=parseFloat(ei.amount)||0;if(am>0)map.set(m,(map.get(m)||0)+am);});
  });
  return map;
}

function recalcAll(){recalcCredit();recalcNomina();recalcPlan();}

function recalcCredit(){
  const price=parseFloat(document.getElementById('price').value)||null;
  const sav=parseFloat(document.getElementById('savings').value)||0;
  const rate=parseFloat(document.getElementById('rate').value)||0;
  const sm=parseInt(document.getElementById('startMonth').value)||1;
  const sy=parseInt(document.getElementById('startYear').value)||2025;
  const errEl=document.getElementById('err-credit');
  const err=!price||price<=0?'Ingresa un precio de terreno válido.':sav<0?'El ahorro no puede ser negativo.':sav>=price?'El ahorro no puede ser mayor o igual al precio.':rate<0?'La tasa no puede ser negativa.':null;
  if(err){errEl.textContent='⚠️ '+err;errEl.classList.add('on');clearCreditUI();return;}
  errEl.classList.remove('on');
  const P=price-sav,r=rate/100/12,n=cYears*12,pmt=calcPMT(P,r,n);
  const extMap=buildExtrasMap(n,sm);
  const baseTable=buildTable(P,r,n,pmt,new Map(),sm,sy);
  const table=buildTable(P,r,n,pmt,extMap,sm,sy);
  const baseInt=baseTable.reduce((s,r)=>s+r.payment,0)-P;
  const totPaid=table.reduce((s,r)=>s+r.payment+r.extra,0);
  const totInt=totPaid-P;
  window._credit={P,r,n,pmt,table,totPaid,totInt,saved:baseInt-totInt,mosSaved:baseTable.length-table.length,sm,sy};
  renderCreditResults(window._credit);
  renderChart(groupByYear(table));
  renderAmortTable(table);
}
function clearCreditUI(){
  document.getElementById('credit-results').innerHTML='<p class="ph">⚠️ Corrige los datos para ver resultados</p>';
  ['chart-card','amort-section'].forEach(id=>document.getElementById(id).style.display='none');
  document.getElementById('amort-card').style.display='none';
  document.getElementById('toggle-btn').textContent='📋 Ver tabla de amortización completa';
  window._credit=null;
}
function recalcNomina(){
  const gross=parseFloat(document.getElementById('salary').value)||0;
  const curSav=parseFloat(document.getElementById('currentSavings').value)||0;
  const pmt=window._credit?.pmt||0;
  if(!gross){document.getElementById('isr-breakdown').innerHTML='<p class="ph" style="padding:12px 0">Ingresa tu salario bruto mensual</p>';window._nomina=null;return;}
  const {isr,raw,sub,bracket}=calcISR(gross);
  const imss=calcIMSS(gross);
  const neto=gross-isr-imss;
  const gfTotal=fixedExpenses.reduce((s,g)=>s+(parseFloat(g.amount)||0),0);
  window._nomina={gross,isr,imss,neto,pmt,gfTotal,superavit:neto-pmt-gfTotal,curSav,bracket};
  renderNomina(window._nomina,raw,sub);
}
function recalcPlan(){renderPlan();}

function renderCreditResults({P,pmt,totPaid,totInt,saved,mosSaved,table}){
  const hasSav=saved>0.01||mosSaved>0;
  document.getElementById('credit-results').innerHTML=`
    <div class="rg">
      <div class="ri c-red"><div class="rl">💳 Pago mensual fijo</div><div class="rv">${fmt(pmt)}</div></div>
      <div class="ri c-green"><div class="rl">Monto financiado</div><div class="rv">${fmt(P)}</div></div>
      <div class="ri c-amber"><div class="rl">Total pagado</div><div class="rv">${fmt(totPaid)}</div></div>
      <div class="ri c-gray"><div class="rl">Total intereses</div><div class="rv">${fmt(totInt)}</div></div>
      <div class="ri c-gray"><div class="rl">Plazo real</div><div class="rv">${table.length} meses</div></div>
      <div class="ri c-gray"><div class="rl">Interés prom./mes</div><div class="rv">${fmt(totInt/table.length)}</div></div>
    </div>
    ${hasSav?`<div class="sbrow"><div class="sb g"><div class="sbl">💰 Interés ahorrado</div><div class="sbv">${fmt(saved)}</div></div><div class="sb p"><div class="sbl">📅 Meses adelantados</div><div class="sbv">${mosSaved} ${mosSaved===1?'mes':'meses'}</div></div></div>`:''}`;
  document.getElementById('chart-card').style.display='block';
  document.getElementById('amort-section').style.display='block';
}
function renderAmortTable(rows){
  document.getElementById('amort-body').innerHTML=rows.map(r=>`
    <tr class="${r.extra>0?'xrow':''}">
      <td>${r.month}</td><td style="white-space:nowrap">${r.date}</td>
      <td>${fmt(r.payment)}</td><td class="tx">${r.extra>0?fmt(r.extra):'—'}</td>
      <td class="ti">${fmt(r.interest)}</td><td class="tc">${fmt(r.principal)}</td>
      <td>${fmt(r.balance)}</td></tr>`).join('');
}
function toggleTable(){
  const c=document.getElementById('amort-card'),b=document.getElementById('toggle-btn');
  const o=c.style.display==='none';
  c.style.display=o?'block':'none';
  b.textContent=o?'✕ Ocultar tabla de amortización':'📋 Ver tabla de amortización completa';
}
function renderChart(yd){
  const cv=document.getElementById('chart'),ctx=cv.getContext('2d');
  const dpr=window.devicePixelRatio||1,W=cv.offsetWidth,H=165;
  cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';
  ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
  const PL=8,PT=8,PB=20,cH=H-PT-PB,cW=W-PL-8;
  const maxV=Math.max(...yd.map(d=>d.capital+d.extra+d.interest))||1;
  const gap=cW/yd.length,bW=gap*.6;
  yd.forEach((d,i)=>{
    const x=PL+i*gap+(gap-bW)/2;
    const cH2=d.capital/maxV*cH,eH=d.extra/maxV*cH,iH=d.interest/maxV*cH;
    ctx.fillStyle='#c8102e';ctx.fillRect(x,PT+cH-cH2,bW,cH2);
    ctx.fillStyle='#7c3aed';ctx.fillRect(x,PT+cH-cH2-eH,bW,eH||0);
    ctx.fillStyle='#f4a300';ctx.fillRect(x,PT+cH-cH2-eH-iH,bW,iH);
    ctx.fillStyle='#6b7280';ctx.font=`${Math.max(9,10*(W<400?.8:1))}px -apple-system,sans-serif`;
    ctx.textAlign='center';ctx.fillText('A'+d.year,x+bW/2,H-4);
  });
}
function renderNomina({gross,isr,imss,neto,pmt,gfTotal,superavit,curSav,bracket},raw,sub){
  const pct=bracket?Math.round(bracket.p*100):0;
  document.getElementById('isr-breakdown').innerHTML=`
    <div class="nomina-flow">
      <div class="nf-row"><span class="nf-label">Salario bruto mensual</span><span class="nf-value">${fmt(gross)}</span></div>
      <div class="nf-row neg"><span class="nf-label">(-) ISR retenido estimado<div class="nf-sub">ISR bruto ${fmt(raw||0)} − Subsidio al empleo ${fmt(sub||0)}</div></span><span class="nf-value">−${fmt(isr)}</span></div>
      <div class="nf-row neg"><span class="nf-label">(-) IMSS empleado estimado<div class="nf-sub">Enf/Mat + Inv/Vida + Ces/Vejez (estimado)</div></span><span class="nf-value">−${fmt(imss)}</span></div>
      <div class="nf-row total ok"><span class="nf-label">= Sueldo neto estimado</span><span class="nf-value">${fmt(neto)}</span></div>
      ${pmt>0?`<div class="nf-row neg"><span class="nf-label">(-) Descuento Infonavit (crédito)<div class="nf-sub">Se descuenta del neto, NO reduce base de ISR</div></span><span class="nf-value">−${fmt(pmt)}</span></div>`:''}
      ${gfTotal>0?`<div class="nf-row neg"><span class="nf-label">(-) Gastos fijos registrados</span><span class="nf-value">−${fmt(gfTotal)}</span></div>`:''}
      <div class="nf-row total ${superavit>=0?'ok':'bad'}"><span class="nf-label">${superavit>=0?'✅ Superávit mensual disponible':'❌ Déficit mensual'}</span><span class="nf-value">${superavit>=0?'+':''}${fmt(superavit)}</span></div>
    </div>
    <div class="bracket-badge">📊 Tasa marginal ISR: <strong>${pct}%</strong> sobre el excedente de ${fmt0(bracket?.li||0)}</div>
    ${curSav>0?`<div class="callout ok" style="margin-top:9px">💰 Ahorro actual: <strong>${fmt(curSav)}</strong> — considera aplicar parte como pago extraordinario en mes 1.</div>`:''}`;
  const tot=document.getElementById('gf-total');
  tot.innerHTML=fixedExpenses.length?`<div class="callout" style="margin-top:9px">Total gastos fijos: <strong>${fmt(gfTotal)}</strong></div>`:'';
}
function renderPlan(){
  const cr=window._credit,no=window._nomina;
  const el=document.getElementById('plan-content');
  if(!cr){el.innerHTML='<p class="ph">⚙️ Completa los datos del crédito primero.</p>';return;}
  const sm=parseInt(document.getElementById('startMonth').value)||1;
  const n=cYears*12,sugs=[];
  const curSav=no?.curSav||0;
  if(curSav>5000&&!appliedEIs.has('curSav'))
    sugs.push({id:'curSav',icon:'💰',title:`Usar ahorro actual como pago inicial`,sub:`Aplicar ${fmt(curSav)} en el mes 1 reduce el saldo inmediatamente.`,amount:curSav,onApply:()=>{appliedEIs.add('curSav');extraPayments.push({id:++epId,month:1,amount:curSav});renderEPList();recalcAll();}});
  if(no?.superavit>500)
    sugs.push({id:'sup',icon:'📈',title:`Superávit mensual de ${fmt(no.superavit)}`,sub:`Considera aportar ${fmt(Math.floor(no.superavit*.4/500)*500)} extra cada 6 meses.`,amount:no.superavit,onApply:null});
  else if(no?.superavit<0)
    sugs.push({id:'def',icon:'⚠️',title:'Déficit mensual detectado',sub:'Tu neto no cubre el crédito más gastos. Considera un plazo mayor o reducir gastos.',amount:null,onApply:null});
  extraIncomes.forEach(ei=>{
    const am=parseFloat(ei.amount)||0;if(!am) return;
    const months=eiToMonths(ei,sm,n),applied=appliedEIs.has(ei.id);
    sugs.push({id:ei.id,icon:'🎯',title:`${ei.label} — ${fmt(am)}`,sub:ei.repeat?`Anual cada mes ${ei.calMonth}. Crédito meses: ${months.slice(0,4).join(', ')}${months.length>4?'…':''}`:`Único en mes ${months[0]||'?'}.`,amount:am,applied,onApply:!applied?()=>{appliedEIs.add(ei.id);renderPlan();recalcAll();}:null});
  });
  window._sugs=sugs;
  el.innerHTML=`<div class="plan-bar">
    <div class="pbar-item red"><div class="pbar-label">Pago mensual</div><div class="pbar-val">${fmt(cr.pmt)}</div></div>
    ${no?`<div class="pbar-item ${no.superavit>=0?'green':'red'}"><div class="pbar-label">Superávit/mes</div><div class="pbar-val">${fmt(no.superavit)}</div></div>`:''}
    <div class="pbar-item blue"><div class="pbar-label">Plazo real</div><div class="pbar-val">${cr.table.length} meses</div></div>
    <div class="pbar-item amber"><div class="pbar-label">Interés total</div><div class="pbar-val">${fmt(cr.totInt)}</div></div>
  </div>
  ${sugs.length?`<div class="card"><div class="card-title"><span class="dot amber"></span>Sugerencias para pagar antes</div>
    <div class="sug-list">${sugs.map((s,si)=>`
      <div class="sug-card ${s.applied?'applied':''}">
        <div class="sug-info"><div class="sug-title">${s.icon} ${s.title}</div><div class="sug-sub">${s.sub}</div></div>
        ${s.amount!=null?`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px"><span class="sug-amount">${fmt(s.amount)}</span>${s.onApply?`<button class="apply-btn" onclick="window._sugs[${si}]?.onApply()">Aplicar ↗</button>`:s.applied?`<span class="apply-btn applied">✅ Aplicado</span>`:''}</div>`:''}</div>`).join('')}
    </div></div>`:'<div class="callout">Sin sugerencias. Agrega tu salario e ingresos extraordinarios en Nómina.</div>'}
  <div class="callout warn">ℹ️ Los pagos aplicados aquí se reflejan en la tabla de amortización.</div>`;
}

function addEP(){extraPayments.push({id:++epId,month:'',amount:''});renderEPList();recalcAll();}
function removeEP(id){extraPayments=extraPayments.filter(e=>e.id!==id);renderEPList();recalcAll();}
function updateEP(id,f,v){const e=extraPayments.find(e=>e.id===id);if(e)e[f]=v;recalcAll();}
function renderEPList(){
  const el=document.getElementById('ep-list'),n=cYears*12;
  el.innerHTML=extraPayments.length?extraPayments.map(ep=>`
    <div class="drow"><span class="dlabel">Mes</span>
      <input type="number" min="1" max="${n}" placeholder="ej. 12" value="${ep.month}" style="max-width:80px" oninput="updateEP(${ep.id},'month',this.value)"/>
      <span class="dlabel" style="min-width:52px">Monto $</span>
      <input type="number" min="0" step="1000" placeholder="50,000" value="${ep.amount}" oninput="updateEP(${ep.id},'amount',this.value)"/>
      <button class="del-btn" onclick="removeEP(${ep.id})">✕</button></div>`).join('')
    :'<p class="hint">Sin pagos extraordinarios. Agrégalos aquí o desde el Plan.</p>';
}
function addGF(){fixedExpenses.push({id:++gfId,label:'',amount:''});renderGFList();recalcAll();}
function removeGF(id){fixedExpenses=fixedExpenses.filter(g=>g.id!==id);renderGFList();recalcAll();}
function updateGF(id,f,v){const g=fixedExpenses.find(g=>g.id===id);if(g)g[f]=v;recalcAll();}
function renderGFList(){
  const el=document.getElementById('gf-list');
  el.innerHTML=fixedExpenses.length?fixedExpenses.map(g=>`
    <div class="drow">
      <input type="text" placeholder="Concepto (ej. Renta)" value="${g.label}" style="flex:1.5" oninput="updateGF(${g.id},'label',this.value)"/>
      <span class="dlabel">$</span>
      <input type="number" min="0" step="100" placeholder="5,000" value="${g.amount}" oninput="updateGF(${g.id},'amount',this.value)"/>
      <button class="del-btn" onclick="removeGF(${g.id})">✕</button></div>`).join('')
    :'<p class="hint">Sin gastos fijos registrados.</p>';
}
function addEI(){extraIncomes.push({id:++eiId,type:'aguinaldo',label:'🎄 Aguinaldo',calMonth:12,amount:'',repeat:true});renderEIList();recalcAll();}
function removeEI(id){extraIncomes=extraIncomes.filter(e=>e.id!==id);appliedEIs.delete(id);renderEIList();recalcAll();}
function updateEI(id,f,v){
  const ei=extraIncomes.find(e=>e.id===id);if(!ei)return;
  if(f==='type'){const t=EI_TYPES.find(x=>x.v===v);ei.type=v;ei.label=t?.l||v;if(t?.dm)ei.calMonth=t.dm;}
  else ei[f]=f==='repeat'?v==='true':v;
  renderEIList();recalcAll();
}
function renderEIList(){
  const el=document.getElementById('ei-list');
  if(!extraIncomes.length){el.innerHTML='<p class="hint">Sin ingresos extraordinarios.</p>';return;}
  const opts=EI_TYPES.map(t=>`<option value="${t.v}">${t.l}</option>`).join('');
  const mOpts=Array.from({length:12},(_,i)=>`<option value="${i+1}">${MNL[i]}</option>`).join('');
  el.innerHTML=extraIncomes.map(ei=>`
    <div class="drow" style="flex-wrap:wrap">
      <select style="flex:1.5;min-width:150px" onchange="updateEI(${ei.id},'type',this.value)">${opts.replace(`value="${ei.type}"`,'value="'+ei.type+'" selected')}</select>
      <select style="min-width:80px" onchange="updateEI(${ei.id},'calMonth',this.value)">${mOpts.replace(`value="${ei.calMonth}"`,'value="'+ei.calMonth+'" selected')}</select>
      <input type="number" min="0" step="500" placeholder="Monto $" value="${ei.amount}" style="min-width:90px" oninput="updateEI(${ei.id},'amount',this.value)"/>
      <select style="min-width:90px" onchange="updateEI(${ei.id},'repeat',this.value)">
        <option value="true" ${ei.repeat?'selected':''}>Cada año</option>
        <option value="false" ${!ei.repeat?'selected':''}>Solo una vez</option>
      </select>
      <button class="del-btn" onclick="removeEI(${ei.id})">✕</button></div>`).join('');
}

function packState(){
  return JSON.stringify({v:3,
    price:document.getElementById('price').value,
    savings:document.getElementById('savings').value,
    rate:document.getElementById('rate').value,
    years:cYears,
    startMonth:document.getElementById('startMonth').value,
    startYear:document.getElementById('startYear').value,
    salary:document.getElementById('salary').value,
    currentSavings:document.getElementById('currentSavings').value,
    extraPayments,fixedExpenses,extraIncomes,
    appliedEIs:[...appliedEIs],epId,gfId,eiId
  });
}
function loadState(data){
  if(!data||data.v<3){toast('❌ Versión de archivo incompatible.',true);return;}
  const gi=id=>document.getElementById(id);
  gi('price').value=data.price||''; gi('savings').value=data.savings||'';
  gi('rate').value=data.rate||'8.0'; gi('startMonth').value=data.startMonth||1;
  gi('startYear').value=data.startYear||2025; gi('salary').value=data.salary||'';
  gi('currentSavings').value=data.currentSavings||'';
  cYears=data.years||10;
  document.querySelectorAll('.ptab').forEach(t=>t.classList.toggle('active',parseInt(t.dataset.y)===cYears));
  extraPayments=data.extraPayments||[]; fixedExpenses=data.fixedExpenses||[];
  extraIncomes=data.extraIncomes||[]; appliedEIs=new Set(data.appliedEIs||[]);
  epId=data.epId||0; gfId=data.gfId||0; eiId=data.eiId||0;
  renderEPList();renderGFList();renderEIList();recalcAll();showTab('credito');
}
const toB64=s=>btoa(unescape(encodeURIComponent(s)));
const fromB64=s=>decodeURIComponent(escape(atob(s)));

function exportPDF(){
  if(!window._credit){toast('⚠️ Genera primero un cálculo de crédito.',true);return;}
  const btn=document.getElementById('btn-export');
  btn.disabled=true;document.getElementById('exp-spin').style.display='inline-block';
  setTimeout(()=>{try{generatePDF();}catch(e){toast('❌ Error: '+e.message,true);}finally{btn.disabled=false;document.getElementById('exp-spin').style.display='none';}},50);
}

function generatePDF(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,M=14,cW=182;
  const C={red:[200,16,46],dark:[26,26,46],muted:[107,114,128],green:[22,163,74],
    purple:[124,58,237],amber:[244,163,0],bg:[245,246,248],white:[255,255,255],
    border:[229,231,235],lRed:[255,235,238],lGreen:[240,253,244]};
  const fc=([r,g,b])=>doc.setFillColor(r,g,b);
  const tc=([r,g,b])=>doc.setTextColor(r,g,b);
  const dc=([r,g,b])=>doc.setDrawColor(r,g,b);
  const F=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(v);
  let y=0;

  const FOOTER_Y=287;
  const drawPageFooter=()=>{
    dc(C.border);doc.setLineWidth(.3);doc.line(M,FOOTER_Y-4,M+cW,FOOTER_Y-4);
    tc(C.muted);doc.setFont('helvetica','normal');doc.setFontSize(6);
    doc.text(`${BRAND.name} · ${BRAND.title} · ${BRAND.email} · ${BRAND.linkedin}`,M,FOOTER_Y);
    doc.text(`${BRAND.builtWith} · ${BRAND.year}`,M+cW,FOOTER_Y,{align:'right'});
  };

  const secH=(title,col=C.dark)=>{
    fc(col);doc.rect(M,y,cW,7.5,'F');
    tc(C.white);doc.setFont('helvetica','bold');doc.setFontSize(7.5);
    doc.text(title,M+3,y+5.5);y+=10;
  };

  fc(C.red);doc.rect(0,0,W,30,'F');
  tc(C.white);doc.setFont('helvetica','bold');doc.setFontSize(15);
  doc.text('Calculadora Integral Infonavit',M,12);
  doc.setFont('helvetica','normal');doc.setFontSize(8);
  doc.text('Infonavit · Simulación de crédito hipotecario',M,19);
  doc.setFont('helvetica','bold');doc.setFontSize(8);
  doc.text(BRAND.name,W-M,12,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(7);
  doc.text(`${BRAND.title} · ${BRAND.location}`,W-M,18,{align:'right'});
  doc.text('Generado: '+new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'}),W-M,24,{align:'right'});
  y=36;

  fc([255,251,235]);doc.rect(M,y,cW,10,'F');
  dc([253,230,138]);doc.setLineWidth(.4);doc.rect(M,y,cW,10);
  tc([146,64,14]);doc.setFont('helvetica','bold');doc.setFontSize(7);
  doc.text('⚠ AVISO: Esta simulación es una aproximación con fines informativos. No constituye asesoría financiera, fiscal ni legal.',M+3,y+6,{maxWidth:cW-6});
  y+=14;

  const cr=window._credit,no=window._nomina;
  const price=parseFloat(document.getElementById('price').value)||0;
  const sav=parseFloat(document.getElementById('savings').value)||0;
  const rate=parseFloat(document.getElementById('rate').value)||0;
  const sm=parseInt(document.getElementById('startMonth').value)||1;
  const sy=parseInt(document.getElementById('startYear').value)||2025;

  secH('DATOS DEL CRÉDITO');
  const info=[['Precio del terreno',F(price)],['Ahorro inicial',F(sav)],['Monto financiado',F(cr.P)],['Tasa de interés anual',rate+'%'],['Plazo',cYears+' años ('+cr.n+' meses)'],['Inicio',MNL[sm-1]+' '+sy]];
  info.forEach(([l,v],i)=>{
    const col=i%2,row=Math.floor(i/2),xB=M+col*(cW/2);
    if(i%4<2){fc(C.bg);doc.rect(xB,y+row*10,cW/2,9.5,'F');}
    tc(C.muted);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(l,xB+3,y+row*10+4.5);
    tc(C.dark);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(v,xB+3,y+row*10+9.5);
  });
  y+=Math.ceil(info.length/2)*10+6;

  secH('RESULTADOS DEL CRÉDITO');
  fc(C.lRed);doc.roundedRect(M,y,cW,18,2,2,'F');
  tc(C.red);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(F(cr.pmt),W/2,y+11,{align:'center'});
  tc(C.muted);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('PAGO MENSUAL FIJO · ESTIMADO',W/2,y+16.5,{align:'center'});
  y+=21;
  const res=[['Total pagado al plazo',F(cr.totPaid),C.dark],['Total de intereses',F(cr.totInt),C.dark],['Plazo real',cr.table.length+' meses',C.dark],['Interés prom./mes',F(cr.totInt/cr.table.length),C.dark],
    ...(cr.saved>0?[['Interes ahorrado (extras)',F(cr.saved),C.green],['Meses adelantados',cr.mosSaved+' meses',C.purple]]:[])];
  res.forEach(([l,v,col],i)=>{
    const even=i%2===0,xC=even?M:M+cW/2,rY=y+Math.floor(i/2)*9;
    if(even){fc(C.bg);doc.rect(xC,rY,cW/2-1,8.5,'F');}
    tc(C.muted);doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.text(l,xC+3,rY+4);
    tc(col);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(v,xC+cW/2-3,rY+8.5,{align:'right'});
  });
  y+=Math.ceil(res.length/2)*9+6;

  if(no){
    if(y>200){drawPageFooter();doc.addPage();y=14;}
    secH('NÓMINA & ISR ESTIMADO (TABLAS SAT 2024)');
    const nr=[['Salario bruto mensual',F(no.gross),C.dark,false],
      ['(-) ISR retenido estimado','-'+F(no.isr),C.red,true],
      ['(-) IMSS empleado estimado','-'+F(no.imss),C.red,true],
      ['= Sueldo neto estimado',F(no.neto),C.green,false],
      ['(-) Descuento Infonavit','-'+F(no.pmt),C.red,true],
      ...(no.gfTotal>0?[['(-) Gastos fijos','-'+F(no.gfTotal),C.red,true]]:[]),
      [(no.superavit>=0?'= Superavit mensual':'= Deficit mensual'),(no.superavit>=0?'+':'')+F(no.superavit),no.superavit>=0?C.green:C.red,false]];
    nr.forEach(([l,v,col,ind])=>{
      const isT=l.startsWith('=');
      if(isT){fc(C.bg);doc.rect(M,y-1,cW,9,'F');}
      tc(C.muted);doc.setFont('helvetica',isT?'bold':'normal');doc.setFontSize(7.5);doc.text(l,M+(ind?4:0),y+4.5);
      tc(col);doc.setFont('helvetica','bold');doc.setFontSize(isT?8.5:7.5);doc.text(v,M+cW,y+4.5,{align:'right'});y+=9;
    });
    const pct=no.bracket?Math.round(no.bracket.p*100):0;
    tc(C.muted);doc.setFont('helvetica','italic');doc.setFontSize(6);
    doc.text(`Tasa marginal ISR: ${pct}% | Valores estimados, no representan retención oficial de nómina.`,M,y+4,{maxWidth:cW});y+=9;
  }

  if(extraPayments.filter(ep=>ep.month&&ep.amount).length){
    if(y>240){drawPageFooter();doc.addPage();y=14;}
    secH('PAGOS EXTRAORDINARIOS A CAPITAL');
    extraPayments.filter(ep=>ep.month&&ep.amount).forEach(ep=>{
      tc(C.purple);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(`Mes ${ep.month}: ${F(parseFloat(ep.amount))}`,M+3,y+5);y+=8;
    });
  }

  drawPageFooter();

  if(cr.table.length){
    doc.addPage();y=14;
    const cols=[12,22,29,22,29,29,39];
    const heads=['Mes','Fecha','Pago fijo','Extra','Interes','Capital','Saldo'];
    const aligns=['center','left','right','right','right','right','right'];
    const RH=6.2;
    const drawTH=()=>{
      fc(C.red);doc.rect(M,y,cW,8,'F');
      tc(C.white);doc.setFont('helvetica','bold');doc.setFontSize(6.5);
      let cx=M;cols.forEach((w,i)=>{doc.text(heads[i],cx+(aligns[i]==='center'?w/2:aligns[i]==='right'?w-2:2),y+5.5,{align:aligns[i]});cx+=w;});y+=10;
    };
    tc(C.dark);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Tabla de Amortización',M,y);
    tc(C.muted);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('★ = Mes con pago extraordinario a capital',M+cW,y,{align:'right'});y+=6;
    drawTH();
    cr.table.forEach((row,ri)=>{
      if(y+RH>FOOTER_Y-8){drawPageFooter();doc.addPage();y=14;drawTH();}
      if(row.extra>0){fc([250,245,255]);doc.rect(M,y-1,cW,RH,'F');}
      else if(ri%2===0){fc(C.bg);doc.rect(M,y-1,cW,RH,'F');}
      doc.setFont('helvetica',row.extra>0?'bold':'normal');doc.setFontSize(6);
      const vals=[row.month.toString(),row.date,F(row.payment),row.extra>0?F(row.extra):'—',F(row.interest),F(row.principal),F(row.balance)];
      let cx=M;
      vals.forEach((v,i)=>{tc(i===3&&row.extra>0?C.purple:i===4?C.red:i===5?C.green:C.dark);doc.text(v,cx+(aligns[i]==='center'?cols[i]/2:aligns[i]==='right'?cols[i]-2:2),y+4,{align:aligns[i]});cx+=cols[i];});
      y+=RH;
    });
    drawPageFooter();
  }

  doc.addPage();y=14;
  fc(C.dark);doc.rect(0,0,W,22,'F');
  tc(C.white);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('Aviso Legal y Descargo de Responsabilidad',M,14);
  y=30;
  secH('NATURALEZA DE ESTA HERRAMIENTA',[50,50,80]);
  tc(C.dark);doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  doc.text('Esta herramienta de simulacion financiera fue desarrollada con fines informativos y educativos unicamente.',M,y,{maxWidth:cW});y+=8;
  doc.text('Los resultados son estimaciones basadas en formulas de amortizacion estandar y tablas del SAT 2024, y pueden',M,y,{maxWidth:cW});y+=6;
  doc.text('diferir significativamente de los valores reales aplicables a tu caso especifico.',M,y,{maxWidth:cW});y+=12;

  secH('LIMITACIONES IMPORTANTES',[200,16,46]);
  const limits=[
    'CALCULO DE ISR: Los montos de ISR son estimados con las tablas SAT 2024 y el subsidio al empleo. La retencion real de ISR realizada por el patron puede variar por conceptos adicionales como percepciones no ordinarias, deducciones personales, becas u otros factores no considerados.',
    'CUOTAS IMSS: Las cuotas del IMSS son una aproximacion. El calculo exacto depende del Salario Base de Cotizacion (SBC) registrado ante el IMSS, el cual puede ser diferente al salario bruto mensual ingresado.',
    'CREDITO INFONAVIT: Las condiciones del credito varian segun el perfil del acreditado, historial de aportaciones, edad, y politicas vigentes de Infonavit al momento de la solicitud. La tasa de interes real puede diferir.',
    'PAGOS EXTRAORDINARIOS: Los efectos de pagos extra son proyecciones bajo supuestos fijos de tasa y plazo. En la practica, Infonavit puede tener condiciones especificas para la aplicacion de pagos anticipados.',
    'TIPO DE CAMBIO Y ECONOMIA: Los calculos no consideran inflacion, cambios de tasa, reestructuras de credito ni ningun factor economico externo.',
  ];
  limits.forEach((l,i)=>{
    if(y>FOOTER_Y-20){drawPageFooter();doc.addPage();y=14;}
    const num=`${i+1}. `;
    tc(C.red);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.text(num,M,y);
    tc(C.dark);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.text(l,M+6,y,{maxWidth:cW-6});
    const lines=doc.splitTextToSize(l,cW-6).length;y+=lines*4.5+4;
  });

  if(y>FOOTER_Y-40){drawPageFooter();doc.addPage();y=14;}
  secH('RECOMENDACION');
  tc(C.dark);doc.setFont('helvetica','bold');doc.setFontSize(9);
  doc.text('Esta herramienta NO constituye asesoria financiera, fiscal ni legal.',M,y,{maxWidth:cW});y+=9;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  doc.text('Se recomienda ampliamente consultar con un asesor financiero certificado, contador publico titulado o representante',M,y,{maxWidth:cW});y+=6;
  doc.text('de Infonavit antes de tomar cualquier decision de inversion, credito o declaracion fiscal.',M,y,{maxWidth:cW});y+=14;

  secH('AUTOR Y CONTACTO',[22,163,74]);
  tc(C.dark);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(BRAND.name,M,y+6);y+=6;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  tc(C.muted);doc.text(BRAND.title+' · '+BRAND.location,M,y+5);y+=9;
  tc(C.blue||[37,99,235]);doc.text('LinkedIn: '+BRAND.linkedin,M,y+5);y+=7;
  doc.text('Email: '+BRAND.email,M,y+5);y+=10;
  tc(C.muted);doc.setFont('helvetica','italic');doc.setFontSize(7.5);
  doc.text(BRAND.builtWith,M,y+5);
  drawPageFooter();

  doc.setProperties({title:'Calculadora Infonavit — '+BRAND.name,subject:'Simulacion Infonavit',
    keywords:'%%CTDATA%%'+toB64(packState())+'%%CTDATA%%',creator:'Calculadora Infonavit v3',author:BRAND.name});

  doc.save('infonavit-'+new Date().toISOString().split('T')[0]+'.pdf');
  toast('✅ PDF exportado correctamente.');
}

async function importPDF(file){
  if(!file) return;
  try{
    const buf=await file.arrayBuffer();
    const raw=new TextDecoder('latin1').decode(new Uint8Array(buf));
    const norm=raw.replace(/[\r\n\s]+/g,'');
    const m=norm.match(/%%CTDATA%%([\w+/=]+)%%CTDATA%%/);
    if(!m){toast('❌ No se encontraron datos en este PDF.',true);return;}
    loadState(JSON.parse(fromB64(m[1])));
    toast('✅ Datos importados correctamente.');
  }catch(e){toast('❌ Error al leer el PDF: '+e.message,true);}
  document.getElementById('pdf-input').value='';
}

function showTab(id){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  document.querySelectorAll('.tn')[['credito','nomina','plan'].indexOf(id)].classList.add('active');
  if(id==='plan') recalcPlan();
}
let _tt;
function toast(msg,err=false){
  const el=document.getElementById('toast');
  el.textContent=msg;el.style.background=err?'#dc2626':'#1a1a2e';
  el.classList.add('on');clearTimeout(_tt);
  _tt=setTimeout(()=>el.classList.remove('on'),3500);
}

['price','savings','rate','startMonth','startYear'].forEach(id=>
  document.getElementById(id)?.addEventListener('input',recalcAll));
document.querySelectorAll('.ptab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.ptab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');cYears=parseInt(t.dataset.y);recalcAll();
}));
window.addEventListener('resize',()=>{if(window._credit)renderChart(groupByYear(window._credit.table));});
renderEPList();renderGFList();renderEIList();recalcAll();
