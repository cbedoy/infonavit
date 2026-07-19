// Pure calculation module. Loaded as a classic <script> in the browser
// (declarations become visible to app.js loaded afterwards) and as a
// CommonJS module in Node for unit tests.

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
const UMA_M = 3300.53;
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

function calcISR(g){
  const row=ISR_T.find(r=>g>=r.li&&g<=r.ls);
  if(!row) return {isr:0,raw:0,sub:0,bracket:null};
  const raw=row.c+(g-row.li)*row.p;
  const sub=SUB_T.find(r=>g<=r.ls)?.s||0;
  return {isr:Math.max(0,raw-sub),raw,sub,bracket:row};
}

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

function buildExtrasMap(extraPayments,extraIncomes,appliedEIs,n,sm){
  const map=new Map();
  extraPayments.forEach(ep=>{const mo=parseInt(ep.month),am=parseFloat(ep.amount);if(mo>=1&&mo<=n&&am>0)map.set(mo,(map.get(mo)||0)+am);});
  extraIncomes.filter(ei=>appliedEIs.has(ei.id)).forEach(ei=>{
    eiToMonths(ei,sm,n).forEach(m=>{const am=parseFloat(ei.amount)||0;if(am>0)map.set(m,(map.get(m)||0)+am);});
  });
  return map;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ISR_T, SUB_T, UMA_M, EI_TYPES, MN, MNL,
    calcISR, calcIMSS, calcPMT, buildTable, groupByYear,
    eiToMonths, buildExtrasMap,
  };
}
