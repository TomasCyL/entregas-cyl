'use strict';
/* =========================================================
   Utilidades
   ========================================================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NF=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0});
const NF1=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1,minimumFractionDigits:1});
const fmt=n=>(n==null||isNaN(n))?'–':NF.format(Math.round(n));
const pct=x=>(x==null||isNaN(x))?'–':NF1.format(x*100)+'%';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const segSafe=s=>String(s??'').trim().replace(/[^A-Za-z0-9_\-.~:@+]/g,'_').slice(0,90)||'x';
const sum=(a,f=x=>x)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const nowISO=()=>new Date().toISOString();
const fdt=iso=>{if(!iso)return '–';const d=new Date(iso);if(isNaN(d))return esc(iso);return d.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});};
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

/* Semanas ISO como entero AAAASS (202645) */
function ywUTC(t){const d=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const y=d.getUTCFullYear();const w=Math.ceil(((d-Date.UTC(y,0,1))/864e5+1)/7);return y*100+w;}
function ywOf(date){return ywUTC(new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())));}
function mondayOf(yw){const y=Math.floor(yw/100),w=yw%100;const j4=new Date(Date.UTC(y,0,4));const d=j4.getUTCDay()||7;const m=new Date(j4);m.setUTCDate(4-d+1+(w-1)*7);return m;}
function wAdd(yw,n){const m=mondayOf(yw);m.setUTCDate(m.getUTCDate()+7*n);return ywUTC(m);}
function wDiff(a,b){return Math.round((mondayOf(b)-mondayOf(a))/(7*864e5));}
function wRange(a,b){const o=[];let w=a,g=0;while(w<=b&&g++<160){o.push(w);w=wAdd(w,1);}return o;}
function wLabel(yw){if(!yw)return '–';const y=Math.floor(yw/100);return 'W'+String(yw%100).padStart(2,'0')+(y!==Math.floor(CUR/100)?'·'+String(y).slice(2):'');}
function wDates(yw){const m=mondayOf(yw);const s=new Date(m);s.setUTCDate(s.getUTCDate()+6);const f=d=>String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0');return f(m)+'–'+f(s);}
const CUR=ywOf(new Date());

/* =========================================================
   Estado
   ========================================================= */
function defaultCfg(){
  const y=Math.floor(CUR/100);
  return {
    tolUnder:0.10, tolOver:0.10, year:y, wFrom:y*100+27, wTo:y*100+52,
    plants:[
      {name:'Bodega C&L',alm:[],cap:0,init:0,stack:1,out:0}],
    resp:[
      {name:'Proveedor',pen:true},{name:'Abastecimiento',pen:false},{name:'Packaging',pen:false},{name:'Bodega',pen:false},
      {name:'Planificación',pen:false},{name:'Industrial',pen:false},{name:'Marketing',pen:false},{name:'Comercial',pen:false},{name:'VB Diseño',pen:false},{name:'Aprobación',pen:false}],
    motivos:['Proveedor sin capacidad de producción','Falta de materia prima (papel / cartulina)','Rechazo por calidad','Atraso de transporte','Cambio de programa de producción','Falta de espacio en bodega','Cambio de arte o especificación','Adelanto solicitado por planta','Acuerdo comercial con proveedor','Saldo no requerido por temporada','Otro'],
    email:'',
    npMotivos:['SPOT/URGENTE','ERROR RECEPCIÓN BODEGA','CALENDARIO NO ACTUALIZADO','ERROR DE PROVEEDOR'],
    rsec:{venc:true,look:true,ocs:true},
    metas:[
      {cat:'CAJAS DE CARTON',fmt:'',m:{[y+'-10']:.7,[y+'-11']:.15,[y+'-12']:.15}},
      {cat:'CAJAS DE CARTON',fmt:'Master Rainier',m:{[y+'-10']:1}},
      {cat:'CAJAS DE CARTON',fmt:'Autosop 2 kg',m:{[y+'-10']:.7,[y+'-11']:.3}},
      {cat:'CAJAS DE CARTON',fmt:'Master Cherry Plum',m:{[y+'-11']:.5,[y+'-12']:.5}},
      {cat:'CAJAS DE CARTON',fmt:'USA',m:{[y+'-10']:.7,[y+'-11']:.3}},
      {cat:'CAJAS DE CARTON',fmt:'Brasil',m:{[y+'-10']:1}},
      {cat:'CAJAS DE CARTON',fmt:'Otras Master/ 5 kg',m:{[y+'-10']:1}},
      {cat:'BOLSAS CAMISA',fmt:'',m:{[y+'-10']:.7,[y+'-11']:.15,[y+'-12']:.15}}]
  };
}
const S={
  mode:'loading', canWrite:true, me:{id:null,name:'Yo'}, names:{},
  cfg:defaultCfg(), meta:{}, oc:[], rec:[], pal:[], mae:[], plans:{}, meets:{}, prod:{}, pos:{out:{}},
  view:lsGet('otif.view','resumen'), filt:{cat:'',prov:'',oc:'',q:'',pl:'',esp:'',wk:'',...lsGet('otif.filt',{})},
  wFrom:wAdd(CUR,-6), wTo:wAdd(CUR,8), agLine:null, agMode:'linea', tab:{}, ix:null, downloads:null
};

/* =========================================================
   Índices derivados
   ========================================================= */
function lineState(s){const n=norm(s);if(!n)return 'Abierta';if(n.includes('CANCEL'))return 'Cancelada';if(n.includes('RECIB')||n.includes('FACTUR')||n.includes('CERRAD')||n.includes('INVOICED')||n.includes('RECEIVED'))return 'Recibida/Facturada';return 'Abierta';}
const defPlant=()=>S.cfg.plants.length===1?S.cfg.plants[0].name:'';
function plantOf(v){
  if(v==null||v==='')return defPlant();
  const s=String(v).trim(), n=norm(s);
  for(const p of S.cfg.plants){if(norm(p.name)===n)return p.name;if((p.alm||[]).some(a=>norm(a)===n))return p.name;}
  return s;
}
function rebuild(){
  const ix={lines:[],byK:{},rec:new Map(),recLine:new Map(),recPl:new Map(),recTot:{},cats:new Set(),provs:new Set(),plants:new Set(S.cfg.plants.map(p=>p.name)),upp:new Map(),uppCod:new Map()};
  for(const p of S.pal){const u=+p.upp;if(!u)continue;ix.upp.set(norm(p.prov)+'|'+norm(p.cod),u);const c=norm(p.cod);if(!ix.uppCod.has(c))ix.uppCod.set(c,[]);ix.uppCod.get(c).push({prov:norm(p.prov),u});}
  ix.prod=new Map();for(const v of Object.values(S.prod||{}))if(v&&v.cod)ix.prod.set(norm(v.cod),v);
  ix.mae=new Map();for(const m of S.mae||[])ix.mae.set(norm(m.cod),m);ix.esps=new Set();S._rank=null;
  for(const o of S.oc){
    const mm=ix.mae.get(norm(o.cod))||{};
    const pp=ix.prod.get(norm(o.cod))||{};const l={...o,st:lineState(o.est),cat:pp.cat||o.cat,esp:pp.esp||mm.esp||o.esp||'',fmt:pp.fmt||mm.fmt||o.fmt||'',precio:+o.precio||0};ix.lines.push(l);ix.byK[l.k]=l;
    if(l.cat)ix.cats.add(l.cat);if(l.prov)ix.provs.add(l.prov);if(l.esp)ix.esps.add(l.esp);
  }
  for(const r of S.rec){
    const k=r.k; const pl=plantOf(r.pl); ix.plants.add(pl);
    const key=k+'|'+pl+'|'+r.wk;
    ix.rec.set(key,(ix.rec.get(key)||0)+(+r.qty||0));
    if(!ix.recLine.has(k))ix.recLine.set(k,[]);
    ix.recLine.get(k).push({...r,pl});
    ix.recTot[k]=(ix.recTot[k]||0)+(+r.qty||0);
  }
  for(const p of Object.values(S.plans))for(const c of p.commits||[]){if(!c.pl||c.pl==='Sin planta'){const d=defPlant();if(d)c.pl=d;}if(c.pl)ix.plants.add(c.pl);}
  ix.plants.delete('');
  S.ix=ix;
}
function uppOf(l){if(!l)return null;const p=prodOf(l.cod);if(p){const ex=Object.entries(p.uppProv||{}).find(([pv,v])=>norm(pv)===norm(l.prov)&&+v>0);if(ex)return +ex[1];if(+p.upp>0)return +p.upp;}return legacyUpp(l);}
function legacyUpp(l){
  if(!l)return null;const ix=S.ix;const pn=norm(l.prov),cn=norm(l.cod);
  const d=ix.upp.get(pn+'|'+cn);if(d)return d;
  const arr=ix.uppCod.get(cn);if(!arr)return null;
  const m=arr.find(a=>a.prov.startsWith(pn.slice(0,18))||pn.startsWith(a.prov.slice(0,18)));
  return m?m.u:arr[0].u;
}
const recAt=(k,pl,wk)=>S.ix.rec.get(k+'|'+pl+'|'+wk)||0;
const recTot=k=>S.ix.recTot[k]||0;
const planOf=k=>S.plans[k]||{k,confirmed:false,commits:[],cancel:0,excess:0,log:[]};
const ensurePlan=k=>S.plans[k]||(S.plans[k]={k,confirmed:false,commits:[],cancel:0,excess:0,log:[]});
const isActive=c=>c.st==='activa';
const activeCommits=p=>(p.commits||[]).filter(isActive);
const planSum=p=>sum(activeCommits(p),c=>c.plan);
function pendingOf(l,p){return Math.max(0,(+l.qty||0)-(+p.cancel||0)-planSum(p));}
const MO=()=>{const v=+S.cfg.otifMeta;return v>0?v:0.9;};const MA=()=>{const v=+S.cfg.otifAlerta;return v>0?Math.min(v,MO()):0.75;};
const oCss=v=>v==null?'inherit':v>=MO()?'var(--ok)':v>=MA()?'var(--warn)':'var(--bad)';
function respPen(name){const r=S.cfg.resp.find(x=>x.name===name);return r?!!r.pen:false;}
function lineClosed(l){return l.st!=='Abierta';}
function isLocked(l,p,c){return !!p.confirmed||c.wk<=CUR||lineClosed(l);}

/* Medición: mide | pen (compromiso original modificado por responsable que penaliza) | info | excl */
function measureOf(p,c){
  if(c.st==='cancelada'||!(c.qty>0))return 'excl';
  if(c.manual==='nm')return 'info';
  if(c.st==='modificada')return respPen(c.resp)?'pen':'info';
  if(c.rem){const par=(p.commits||[]).find(x=>x.id===c.parent);if(par&&respPen(par.resp))return 'info';}
  return 'mide';
}
function evalC(l,p,c){
  const r=recAt(l.k,c.pl,c.wk); const tu=+S.cfg.tolUnder||0, to=+S.cfg.tolOver||0;
  const m=measureOf(p,c); const phase=c.wk>CUR?'fut':c.wk===CUR?'cur':'past';
  let ot=r>0?1:0, inf=(r>=c.qty*(1-tu)-1e-6&&r<=c.qty*(1+to)+1e-6)?1:0;
  if(c.manual===1||c.manual===0){ot=c.manual;inf=c.manual;}
  return {r,m,phase,ot,inf,otif:ot*inf,diff:r-c.qty,counts:phase==='past'&&(m==='mide'||m==='pen')};
}
function nearestRecWeek(l,pl,wk){
  const rows=(S.ix.recLine.get(l.k)||[]).filter(r=>r.pl===pl&&r.wk!==wk);
  if(!rows.length)return null;let best=null;
  for(const r of rows){const d=wDiff(wk,r.wk);if(best==null||Math.abs(d)<Math.abs(best.d)||(Math.abs(d)===Math.abs(best.d)&&d>0))best={wk:r.wk,d};}
  return best;
}

/* Filtros */
/* filtros visibles y aplicados según el módulo */
const FALL=['cat','esp','prov','oc','q','pl','wk'];
function fAllowed(){const v=S.view;
  if(v==='resumen')return ['cat','esp','pl'];
  if(v==='hoy'||v==='semana')return ['cat','prov','pl'];
  if(v==='agenda')return ['cat','prov','oc','q','pl'];
  if(v==='seguimiento'||v==='avance')return FALL;
  if(v==='bodegas')return ['pl'];
  if(v==='preparar'||v==='informe')return ['cat'];
  if(v==='maestro')return ['cat','q'];
  return [];}
function fEff(){const a=fAllowed();const o={};for(const k of FALL)o[k]=a.includes(k)?(S.filt[k]||''):'';return o;}
function lineMatches(l){
  const f=fEff();
  if(f.cat&&l.cat!==f.cat)return false;
  if(f.esp&&l.esp!==f.esp)return false;
  if(f.prov&&l.prov!==f.prov)return false;
  if(f.oc&&!String(l.oc).toUpperCase().includes(f.oc.toUpperCase()))return false;
  if(f.q){const q=norm(f.q);if(!norm(l.cod).includes(q)&&!norm(l.prod).includes(q))return false;}
  return true;
}
const plMatch=pl=>{const v=fEff().pl;return !v||pl===v;};
const wkMatch=w=>{const v=fEff().wk;return !v||+w===+v;};
function fLines(){return S.ix.lines.filter(lineMatches);}
/* Todos los compromisos evaluados (con filtros) */
function allEvals(){
  const out=[];
  for(const l of fLines()){const p=S.plans[l.k];if(!p)continue;for(const c of p.commits||[]){if(!plMatch(c.pl)||!wkMatch(c.wk))continue;out.push({l,p,c,e:evalC(l,p,c)});}}
  return out;
}

/* =========================================================
   Motor de reglas (acciones)
   ========================================================= */
function logE(p,e,ctx){p.log=p.log||[];p.log.push({id:uid(),t:ctx.t||nowISO(),by:ctx.by||S.me.id||'local',...e});}
function newC(o,ctx){return {id:uid(),wk:o.wk,pl:o.pl,qty:+o.qty,plan:+o.qty,src:o.src||'plan',parent:o.parent||null,rem:!!o.rem,st:'activa',manual:o.manual??null,mnp:o.mnp||'',at:ctx.t||nowISO(),by:ctx.by||S.me.id||'local'};}
function cleanRows(rows){
  const m=new Map();
  for(const r of rows||[]){const q=Math.round(+r.qty||0);if(!(q>0)||!r.wk||!r.pl)continue;const key=r.pl+'|'+r.wk;m.set(key,{wk:+r.wk,pl:r.pl,qty:(m.get(key)?.qty||0)+q});}
  return [...m.values()];
}
/* Agendar con regla de acumulación: misma Semana+Planta suma al compromiso activo existente */
function addCommits(k,rows,opt,ctx){
  const l=S.ix.byK[k];const p=ensurePlan(k);rows=cleanRows(rows);
  if(!rows.length)throw new Error('Ingresa al menos una fila con semana, planta y cantidad.');
  if(l.st==='Cancelada')throw new Error('La línea está cancelada: no se puede agendar.');
  const tot=sum(rows,r=>r.qty);
  if(opt.src!=='express'&&!opt.allowPast&&ctx.by!=='ejemplo'){const past=rows.find(r=>r.wk<CUR);if(past)throw new Error(wLabel(past.wk)+' ya cerró: solo se agenda desde la semana en curso ('+wLabel(CUR)+').');}
  if(!opt.allowOver){const pend=pendingOf(l,p)+(opt.extra||0);if(tot>pend+1e-6)throw new Error('La suma ('+fmt(tot)+') supera lo pendiente por calendarizar ('+fmt(pend)+').');}
  const g=uid();
  for(const r of rows){
    const ex=activeCommits(p).find(c=>c.wk===r.wk&&c.pl===r.pl);
    if(ex){const b=ex.qty;ex.qty+=r.qty;ex.plan+=r.qty;logE(p,{g,act:opt.act||'agendar',cid:ex.id,wk:r.wk,pl:r.pl,field:'Cantidad (suma)',before:b,after:ex.qty,note:opt.note||'Se sumó a compromiso existente de la misma semana y planta',resp:opt.resp||'',mot:opt.mot||''},ctx);}
    else{const c=newC({...r,src:opt.src,parent:opt.parent,manual:opt.manual,mnp:opt.mnp},ctx);if(opt.planZero)c.plan=0;p.commits.push(c);logE(p,{g,act:opt.act||'agendar',cid:c.id,wk:r.wk,pl:r.pl,field:'Compromiso',before:null,after:r.qty,note:opt.note||'',resp:opt.resp||'',mot:opt.mot||''},ctx);}
  }
  return p;
}
/* Modificar / reprogramar con trazabilidad y atribución */
function changeCommit(k,cid,newQty,moves,resp,mot,ctx){
  const l=S.ix.byK[k];const p=ensurePlan(k);const c=p.commits.find(x=>x.id===cid);
  if(!c||!isActive(c))throw new Error('El compromiso ya no está activo.');
  newQty=Math.max(0,Math.round(+newQty||0));moves=cleanRows(moves).filter(m=>!(m.wk===c.wk&&m.pl===c.pl));
  {const past=moves.find(m=>m.wk<CUR);if(past)throw new Error(wLabel(past.wk)+' ya cerró: solo se puede mover a la semana en curso o posteriores.');}
  const tot=newQty+sum(moves,m=>m.qty);const avail=c.plan+pendingOf(l,p);
  if(tot>avail+1e-6)throw new Error('El total ('+fmt(tot)+') supera lo comprado disponible ('+fmt(avail)+').');
  if(newQty===c.plan&&!moves.length)throw new Error('No hay cambios que guardar.');
  const locked=isLocked(l,p,c);const g=uid();
  const moved=sum(moves,m=>m.qty);const imp=moves.length?(tot!==c.plan?'OT+IF':'OT'):'IF';
  if(!locked){
    const b=c.plan;
    if(newQty>0){c.qty=newQty;c.plan=newQty;logE(p,{g,act:'ajuste',cid:c.id,wk:c.wk,pl:c.pl,field:'Cantidad',before:b,after:newQty,note:'Ajuste antes de confirmar calendario',resp:resp||'',mot:mot||''},ctx);}
    else{p.commits=p.commits.filter(x=>x.id!==c.id);logE(p,{g,act:'ajuste',cid:c.id,wk:c.wk,pl:c.pl,field:'Compromiso eliminado',before:b,after:0,note:'Ajuste antes de confirmar calendario',resp:resp||'',mot:mot||''},ctx);}
    if(moves.length)addCommits(k,moves,{act:'ajuste',src:'plan',allowOver:true,note:'Movido desde '+wLabel(c.wk)+' '+c.pl,resp,mot},ctx);
    return {locked:false};
  }
  if(!resp)throw new Error('Indica el responsable del cambio.');
  if(!mot)throw new Error('Indica el motivo del cambio.');
  c.st='modificada';c.resp=resp;c.mot=mot;c.closedAt=ctx.t||nowISO();const oldPlan=c.plan;c.plan=0;c.imp=imp;
  logE(p,{g,act:moves.length?'reprogramar':'modificar',cid:c.id,wk:c.wk,pl:c.pl,field:moves.length?'Semana/Planta/Cantidad':'Cantidad',before:oldPlan,after:newQty,moved:moves.map(m=>({wk:m.wk,pl:m.pl,qty:m.qty})),imp,resp,mot,note:''},ctx);
  if(newQty>0){const nc=newC({wk:c.wk,pl:c.pl,qty:newQty,src:'reprog',parent:c.id,rem:true},ctx);p.commits.push(nc);}
  if(moves.length){
    for(const m of moves){
      const ex=activeCommits(p).find(x=>x.wk===m.wk&&x.pl===m.pl);
      if(ex){const b=ex.qty;ex.qty+=m.qty;ex.plan+=m.qty;logE(p,{g,act:'reprogramar',cid:ex.id,wk:m.wk,pl:m.pl,field:'Cantidad (suma)',before:b,after:ex.qty,note:'Recibe '+fmt(m.qty)+' desde '+wLabel(c.wk)+' '+c.pl,resp,mot,imp},ctx);}
      else{const nc=newC({...m,src:'reprog',parent:c.id},ctx);p.commits.push(nc);logE(p,{g,act:'reprogramar',cid:nc.id,wk:m.wk,pl:m.pl,field:'Compromiso nuevo',before:null,after:m.qty,note:'Desde '+wLabel(c.wk)+' '+c.pl,resp,mot,imp},ctx);}
    }
  }
  return {locked:true,moved};
}
/* Anular por error de ingreso: elimina el compromiso sin contarlo como cambio */
const canAnular=(l,p,c)=>isActive(c)&&c.src!=='express'&&l.st!=='Cancelada'&&c.wk>=CUR&&!recAt(l.k,c.pl,c.wk);
function anularCommit(k,cid,ctx){
  const l=S.ix.byK[k];const p=ensurePlan(k);const c=p.commits.find(x=>x.id===cid);
  if(!c||!canAnular(l,p,c))throw new Error('Este compromiso ya no se puede anular: solo se anulan compromisos de la semana en curso o futuras, sin recepciones.');
  if(p.base&&p.confirmedAt&&c.at<=p.confirmedAt){p.base={qty:Math.max(0,(+p.base.qty||0)-c.qty),n:Math.max(0,(+p.base.n||0)-1)};}
  p.commits=p.commits.filter(x=>x.id!==cid);
  logE(p,{act:'anular',cid:c.id,wk:c.wk,pl:c.pl,field:'Compromiso anulado',before:c.qty,after:0,resp:'',mot:'Error de ingreso',note:'No se mide ni cuenta como cambio al plan; la cantidad vuelve a quedar pendiente por calendarizar'},ctx);
}
/* Cambiar responsable después (recalcula la medición) */
function setResp(k,cid,resp,ctx){
  const p=ensurePlan(k);const c=p.commits.find(x=>x.id===cid);if(!c)throw new Error('Compromiso no encontrado.');
  if(c.resp===resp)return;const b=c.resp;c.resp=resp;
  logE(p,{act:'responsable',cid:c.id,wk:c.wk,pl:c.pl,field:'Responsable',before:b,after:resp,resp,mot:c.mot||'',note:'Medición recalculada: '+(respPen(resp)?'penaliza al proveedor':'informativo')},ctx);
}
/* Recalendarizar faltante: mantiene compromiso original y su resultado */
function recalFaltante(k,cid,rows,ctx){
  const l=S.ix.byK[k];const p=ensurePlan(k);const c=p.commits.find(x=>x.id===cid);
  const r=recAt(k,c.pl,c.wk);const falt=Math.max(0,c.plan-r);rows=cleanRows(rows);const tot=sum(rows,x=>x.qty);
  if(!tot)throw new Error('Ingresa al menos una fila.');
  if(tot>falt+1e-6)throw new Error('No puedes recalendarizar más que el faltante ('+fmt(falt)+').');
  const b=c.plan;c.plan-=tot;c.recal=(c.recal||0)+tot;
  const g=uid();logE(p,{g,act:'recalendarizar',cid:c.id,wk:c.wk,pl:c.pl,field:'Faltante recalendarizado',before:b,after:c.plan,note:'Se mantiene el compromiso original ('+fmt(c.qty)+') y su resultado. Faltante '+fmt(tot)+' a '+rows.map(x=>wLabel(x.wk)+' '+x.pl).join(', '),resp:'',mot:''},ctx);
  addCommits(k,rows,{act:'recalendarizar',src:'recal',parent:c.id,note:'Faltante de '+wLabel(c.wk)+' '+c.pl},ctx);
}
/* Adelanto: llegó más de lo comprometido en la semana → descontar de semanas siguientes */
function descontarAdelanto(k,cid,alloc,ctx){
  const p=ensurePlan(k);const c=p.commits.find(x=>x.id===cid);const r=recAt(k,c.pl,c.wk);const exc=Math.max(0,r-c.plan);
  const tot=sum(alloc,a=>+a.qty||0);if(!tot)throw new Error('Indica cuánto descontar.');
  if(tot>exc+1e-6)throw new Error('No puedes descontar más que el adelanto ('+fmt(exc)+').');
  const g=uid();
  for(const a of alloc){const q=Math.round(+a.qty||0);if(!q)continue;const t=p.commits.find(x=>x.id===a.cid);if(!t||!isActive(t))continue;if(q>t.plan)throw new Error('El descuento en '+wLabel(t.wk)+' supera su compromiso.');
    const b=t.qty;t.qty-=q;t.plan-=q;if(t.qty<=0){t.st='cancelada';}
    logE(p,{g,act:'adelanto',cid:t.id,wk:t.wk,pl:t.pl,field:'Cantidad',before:b,after:t.qty,note:'Descuento por adelanto recibido en '+wLabel(c.wk)+' '+c.pl,resp:'',mot:''},ctx);}
  const b=c.plan;c.plan+=tot;logE(p,{g,act:'adelanto',cid:c.id,wk:c.wk,pl:c.pl,field:'Plan (recibido adelantado)',before:b,after:c.plan,note:'El compromiso original ('+fmt(c.qty)+') se sigue evaluando igual',resp:'',mot:''},ctx);
}
/* Saldo cancelado: primero lo no calendarizado, luego LIFO desde la última semana */
function previewSaldo(k,qty){
  const l=S.ix.byK[k];const p=planOf(k);let rest=Math.round(+qty||0);const steps=[];
  const unsched=pendingOf(l,p);const a0=Math.min(rest,unsched);if(a0>0){steps.push({unsched:true,qty:a0});rest-=a0;}
  const act=activeCommits(p).slice().sort((a,b)=>b.wk-a.wk||(b.at>a.at?1:-1));
  for(const c of act){if(rest<=0)break;const room=Math.max(0,c.plan-Math.min(c.plan,recAt(k,c.pl,c.wk)));const a=Math.min(rest,room);if(a>0){steps.push({cid:c.id,wk:c.wk,pl:c.pl,before:c.qty,after:c.qty-a,qty:a});rest-=a;}}
  return {steps,rest};
}
function saldoCancelado(k,qty,resp,mot,ctx){
  const l=S.ix.byK[k];const p=ensurePlan(k);qty=Math.round(+qty||0);
  const max=Math.max(0,(+l.qty||0)-(+p.cancel||0)-recTot(k));
  if(!(qty>0))throw new Error('Ingresa la cantidad cancelada.');
  if(qty>max)throw new Error('El saldo cancelado no puede superar comprado − recibido ('+fmt(max)+').');
  if(!mot)throw new Error('Indica el motivo.');
  const pv=previewSaldo(k,qty);if(pv.rest>0)throw new Error('No hay compromisos sin recibir suficientes para descontar '+fmt(pv.rest)+'.');
  const g=uid();p.cancel=(+p.cancel||0)+qty;
  logE(p,{g,act:'saldo',field:'Saldo cancelado',before:(p.cancel-qty),after:p.cancel,resp:resp||'',mot,note:'No exigible al proveedor (no penaliza OTIF)'},ctx);
  for(const s of pv.steps){if(s.unsched){logE(p,{g,act:'saldo',field:'Pendiente sin calendarizar',before:null,after:-s.qty,note:'Se descuenta primero lo no calendarizado',resp:resp||'',mot},ctx);continue;}
    const c=p.commits.find(x=>x.id===s.cid);c.qty-=s.qty;c.plan-=s.qty;if(c.qty<=0)c.st='cancelada';
    logE(p,{g,act:'saldo',cid:c.id,wk:c.wk,pl:c.pl,field:'Cantidad (LIFO)',before:s.before,after:c.qty,resp:resp||'',mot,note:'Ajuste LIFO por saldo cancelado'},ctx);}
}
/* Exceso recepcionado: se suma a la última KEY calendarizada */
/* Exceso sobre lo comprado.
   El responsable decide la medición: si penaliza (proveedor, no acordado) el compromiso evaluado no cambia y la sobreentrega
   se mide contra la tolerancia; si no penaliza (exceso acordado/solicitado por C&L) se sube el compromiso. */
function excesoTarget(l,p){
  const act=activeCommits(p);const over=act.filter(c=>c.wk<=CUR&&recAt(l.k,c.pl,c.wk)>c.plan).sort((a,b)=>b.wk-a.wk);
  if(over[0])return over[0];const withR=act.filter(c=>c.wk<=CUR&&recAt(l.k,c.pl,c.wk)>0).sort((a,b)=>b.wk-a.wk);
  return withR[0]||act.slice().sort((a,b)=>b.wk-a.wk)[0];
}
function sumarExceso(k,ctx,opt){
  opt=opt||{resp:'Proveedor',mot:'Exceso no acordado'};
  const l=S.ix.byK[k];const p=ensurePlan(k);const e=recTot(k)-(+l.qty||0)-(+p.excess||0);
  if(!(e>0))throw new Error('No hay exceso por registrar.');
  const c=excesoTarget(l,p);
  if(!c)throw new Error('La línea no tiene compromisos: regístrala en Recepciones no planificadas.');
  if(!opt.resp)throw new Error('Indica el responsable del exceso.');
  const pen=respPen(opt.resp);const b=c.qty,bp=c.plan;
  c.plan+=e;if(pen)c.exc=(+c.exc||0)+e;else c.qty+=e;p.excess=(+p.excess||0)+e;
  logE(p,{act:'exceso',cid:c.id,wk:c.wk,pl:c.pl,field:pen?'Plan (exceso no acordado)':'Compromiso (exceso acordado)',before:pen?bp:b,after:pen?c.plan:c.qty,resp:opt.resp,mot:opt.mot||'',
    note:pen?`Exceso de ${fmt(e)} sobre lo comprado. El compromiso evaluado se mantiene en ${fmt(c.qty)}: la sobreentrega se mide contra la tolerancia`:`Exceso acordado de ${fmt(e)}: el compromiso evaluado sube a ${fmt(c.qty)} y no penaliza`},ctx);
}
/* Express: calendarizar según recepciones */
function expressCopy(k,rows,manual,ctx){
  addCommits(k,rows,{act:'express',src:'express',allowOver:true,manual,note:'Express desde recepciones'+(manual==='nm'?' (no se mide)':manual===1?' (resultado OTIF = 1)':' (resultado OTIF = 0)')},ctx);
  const p=ensurePlan(k);p.confirmed=true;
}
function confirmPlan(k,ctx){const p=ensurePlan(k);if(p.confirmed)return;p.confirmed=true;p.confirmedAt=ctx.t||nowISO();p.base={qty:planSum(p),n:activeCommits(p).length};logE(p,{act:'confirmar',field:'Calendario',before:'Borrador',after:'Confirmado',note:'Acuerdo inicial con el proveedor',resp:'',mot:''},ctx);}

/* =========================================================
   Almacenamiento: listas de SharePoint (EXPORTADORACYL) o modo local
   ========================================================= */
const IS_EXT=typeof chrome!=='undefined'&&!!(chrome.scripting&&chrome.tabs);
const BK=IS_EXT?SP:GraphSP; // extensión: pestaña de SharePoint; PWA: Microsoft Graph con inicio de sesión
const SP_DEF={modo:'sp',site:'https://cylfruit.sharepoint.com/sites/EXPORTADORACYL'};
const spCfg=()=>({...SP_DEF,...lsGet('otif.sp',{})});
const Store={
  user:null, q:new Map(), ids:{EN_Parametros:new Map(),EN_Planes:new Map(),EN_Reuniones:new Map(),EN_Productos:new Map(),EN_Datos:new Map()}, _snap:'', _poll:null,
  async init(){
    const c=spCfg();
    if(c.modo!=='sp'){S.mode='local';this.loadLocal();return;}
    BK.configurar(c.site);S.mode='db';
    try{
      await BK.preparar(m=>console.log(m));
      const u=await BK.usuario();if(u){S.me.name=u;S.me.id=u;}
      await this.cargar();S.loadNote='';
      this._poll=setInterval(()=>{if(document.visibilityState==='visible')this.refresh();},120000);
    }catch(e){console.warn('sp',e);S.loadNote='Sin conexión con SharePoint: '+(e.message||e)+' Los cambios no se guardarán hasta reconectar.';S.canWrite=false;S.spError=true;}
  },
  /* lee todo desde SharePoint y lo deja en S */
  async cargar(){
    const [pa,pl,me,pr,da]=await Promise.all([
      BK.items('EN_Parametros','Valor'),BK.items('EN_Planes','Datos'),BK.items('EN_Reuniones','Datos'),BK.items('EN_Productos','Datos'),BK.items('EN_Datos','Tipo,Ver,Indice,Filas')]);
    for(const m of Object.values(this.ids))m.clear();
    const J=(s,d)=>{try{return JSON.parse(s);}catch(e){return d;}};
    const cfg=defaultCfg();let pos={out:{}},meta={};
    for(const p of pa){this.ids.EN_Parametros.set(p.Title,p.Id);if(p.Title==='cfg')Object.assign(cfg,J(p.Valor,{}));else if(p.Title==='pos')pos={out:{},...J(p.Valor,{})};else if(p.Title==='meta')meta=J(p.Valor,{});}
    const plans={};for(const x of pl){this.ids.EN_Planes.set(x.Title,x.Id);const d=J(x.Datos,null);if(d)plans[d.k||x.Title]=d;}
    const meets={};for(const x of me){this.ids.EN_Reuniones.set(x.Title,x.Id);const d=J(x.Datos,null);if(d)meets[x.Title]=d;}
    const prod={};for(const x of pr){this.ids.EN_Productos.set(x.Title,x.Id);const d=J(x.Datos,null);if(d)prod[x.Title]=d;}
    const src={oc:[],rec:[],pal:[],mae:[]};const chunks={};
    for(const x of da){this.ids.EN_Datos.set(x.Title,x.Id);if(!meta[x.Tipo+'Ver']||x.Ver!==meta[x.Tipo+'Ver'])continue;(chunks[x.Tipo]=chunks[x.Tipo]||[]).push(x);}
    for(const [k,arr] of Object.entries(chunks))src[k]=arr.sort((a,b)=>a.Indice-b.Indice).flatMap(x=>J(x.Filas,[]));
    const snap=JSON.stringify([cfg,pos,meta,plans,meets,prod,src.oc.length,src.rec.length,src.pal.length,src.mae.length]);
    const changed=snap!==this._snap;this._snap=snap;
    if(changed){Object.assign(S,{cfg,pos,meta,plans,meets,prod,oc:src.oc,rec:src.rec,pal:src.pal,mae:src.mae});rebuild();}
    return changed;
  },
  async refresh(){if(S.mode!=='db'||this.q.size)return;try{if(await this.cargar())render();}catch(e){console.warn('refresh',e);}},
  async reconectar(){
    const c=spCfg();BK.configurar(c.site);S.mode='db';S.loadNote='';S.spError=false;S.canWrite=true;
    try{await BK.preparar(()=>{});const u=await BK.usuario();if(u){S.me.name=u;S.me.id=u;}this._snap='';await this.cargar();toast('Conectado a SharePoint.');}
    catch(e){S.loadNote='Sin conexión con SharePoint: '+(e.message||e);S.canWrite=false;S.spError=true;}
    render();
  },
  loadLocal(){
    const d=lsGet('otif.local.v1',null);
    if(d&&d.oc){Object.assign(S,{cfg:{...defaultCfg(),...d.cfg},meta:d.meta||{},oc:d.oc||[],rec:d.rec||[],pal:d.pal||[],mae:d.mae||[],plans:d.plans||{},meets:d.meets||{},prod:d.prod||{},pos:d.pos||{out:{}}});}
    rebuild();
  },
  saveLocal(){lsSet('otif.local.v1',{cfg:S.cfg,meta:S.meta,oc:S.oc,rec:S.rec,pal:S.pal,mae:S.mae,plans:S.plans,meets:S.meets,prod:S.prod,pos:S.pos});},
  /* path → lista/título */
  _dest(path){const [a,...r]=path.split('/');const id=r.join('/');
    if(a==='cfg')return ['EN_Parametros',id==='main'?'cfg':id,'Valor'];
    if(a==='plan')return ['EN_Planes',id,'Datos'];if(a==='meet')return ['EN_Reuniones',id,'Datos'];if(a==='prod')return ['EN_Productos',id,'Datos'];
    if(a==='src'&&id==='meta')return ['EN_Parametros','meta','Valor'];return null;},
  /* una escritura a la vez por documento */
  write(path,data){
    if(S.mode!=='db'){this.saveLocal();return Promise.resolve();}
    if(S.spError){toast('Sin conexión con SharePoint: el cambio no se guardó. Pulsa Reconectar en Configuración.');return Promise.resolve();}
    const [lista,title,campo]=this._dest(path);const body=JSON.stringify(data);
    const prev=this.q.get(path)||Promise.resolve();
    const nx=prev.catch(()=>{}).then(()=>BK.upsert(lista,title,{[campo]:body},this.ids[lista]));
    this.q.set(path,nx);
    return nx.then(()=>{if(this.q.get(path)===nx)this.q.delete(path);}).catch(e=>{this.q.delete(path);if(e?.status===403||e?.status===401){S.canWrite=false;toast('No tienes permiso para guardar en la lista de SharePoint.');}else toast('No se pudo guardar: '+(e?.message||e));render();});
  },
  async _del(path){if(S.mode!=='db')return;const [lista,title]=this._dest(path);try{await BK.borrar(lista,title,this.ids[lista]);}catch(e){console.warn(e);}},
  savePlan(k){return this.write('plan/'+segSafe(k),S.plans[k]);},
  saveCfg(){return this.write('cfg/main',S.cfg);},
  savePos(){return this.write('cfg/pos',S.pos);},
  async saveSource(kind,rows,info){
    const ver=uid();
    if(S.mode==='db'){
      const chunks=[];let cc=[],len=0;for(const r of rows){const l=JSON.stringify(r).length+1;if(cc.length&&len+l>180000){chunks.push(cc);cc=[];len=0;}cc.push(r);len+=l;}chunks.push(cc);
      for(let i=0;i<chunks.length;i++)await BK.upsert('EN_Datos',`${kind}-${ver}-${i}`,{Tipo:kind,Ver:ver,Indice:i,Filas:JSON.stringify(chunks[i])},this.ids.EN_Datos);
      const meta={...S.meta,[kind+'Ver']:ver,[kind+'Info']:info};
      await BK.upsert('EN_Parametros','meta',{Valor:JSON.stringify(meta)},this.ids.EN_Parametros);
      for(const t of [...this.ids.EN_Datos.keys()])if(t.startsWith(kind+'-')&&!t.startsWith(`${kind}-${ver}-`))await BK.borrar('EN_Datos',t,this.ids.EN_Datos);
    }
    S[kind]=rows;S.meta={...S.meta,[kind+'Ver']:ver,[kind+'Info']:info};rebuild();if(S.mode!=='db')this.saveLocal();
  },
  async clearAll(keepPal){
    if(S.mode==='db'){
      for(const k of Object.keys(S.plans))await this._del('plan/'+segSafe(k));
      for(const k of Object.keys(S.meets||{}))await this._del('meet/'+k);
      if(!keepPal)for(const k of Object.keys(S.prod||{}))await this._del('prod/'+k);
      const meta={};if(keepPal){for(const k of ['pal','mae'])if(S.meta[k+'Ver']){meta[k+'Ver']=S.meta[k+'Ver'];meta[k+'Info']=S.meta[k+'Info'];}}
      for(const t of [...this.ids.EN_Datos.keys()]){const kind=t.split('-')[0];if(['oc','rec'].includes(kind)||(!keepPal&&['pal','mae'].includes(kind)))await BK.borrar('EN_Datos',t,this.ids.EN_Datos);}
      await BK.upsert('EN_Parametros','meta',{Valor:JSON.stringify(meta)},this.ids.EN_Parametros);await BK.upsert('EN_Parametros','pos',{Valor:JSON.stringify({out:{}})},this.ids.EN_Parametros);
    }
    S.plans={};S.meets={};if(!keepPal)S.prod={};S.oc=[];S.rec=[];if(!keepPal){S.pal=[];S.mae=[];}const km={};if(keepPal)for(const k of ['pal','mae'])if(S.meta[k+'Ver']){km[k+'Ver']=S.meta[k+'Ver'];km[k+'Info']=S.meta[k+'Info'];}S.meta=km;S.pos={out:{}};rebuild();if(S.mode!=='db')this.saveLocal();
  }
};
async function nameOf(id){
  if(!id)return '–';if(id==='ejemplo')return 'Ejemplo';if(id==='local')return 'Este navegador';if(id===S.me.id)return S.me.name||'Yo';
  if(S.names[id]!==undefined)return S.names[id]||'Usuario';
  return 'Usuario';
}
async function resolveNames(ids){
  const need=[...new Set(ids)].filter(i=>i&&i!=='ejemplo'&&i!=='local'&&S.names[i]===undefined);
  if(!need.length||!Store.user||!Store.user.profiles)return;
  try{const ps=await Store.user.profiles(need);let ch=false;for(const i of need){S.names[i]=ps[i]?.name||'';ch=true;}if(ch)render();}catch(e){}
}
function uname(id){if(!id)return '–';if(id==='ejemplo')return 'Ejemplo';if(id==='local')return 'Este navegador';if(id===S.me.id)return S.me.name||'Yo';return S.names[id]||'Usuario';}

/* Ejecuta una acción del motor y guarda la(s) línea(s) */
function act(k,fn){
  if(!S.canWrite){toast('Solo lectura: no tienes permiso para modificar.');return false;}
  const backup=JSON.stringify(S.plans[k]||null);
  try{fn({t:nowISO(),by:S.me.id||'local'});}
  catch(e){if(backup==='null')delete S.plans[k];else S.plans[k]=JSON.parse(backup);throw e;}
  rebuild();Store.savePlan(k);render();return true;
}

/* =========================================================
   Render
   ========================================================= */
const VIEWS=[
  ['resumen','Resumen'],['hoy','Gestiones pendientes'],['semana','Entregas de la semana'],['agenda','Agenda semanal'],['seguimiento','Seguimiento OTIF'],['avance','Avance de entregas'],['preparar','Reuniones semanales'],['informe','Reunión semanal'],['posiciones','Ocupación de posiciones'],['bodegas','Bodegas'],['maestro','Maestro de productos'],['datos','Datos y configuración']];
/* menú: 5 módulos + configuración */
const NAV=[
  {t:'Resumen',v:['resumen'],ico:'M3 17V9M8 17V5M13 17v-6M18 17H2'},
  {t:'Hoy',v:['hoy','semana'],ico:'M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM10 6v4l2.5 2.5'},
  {t:'Calendario',v:['agenda'],ico:'M3 5h14v12H3zM3 8.5h14M7 3v4M13 3v4'},
  {t:'Proveedores',v:['seguimiento','avance','preparar','informe'],sub:['seguimiento','avance','preparar'],ico:'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 17c0-3 2.2-5 5-5s5 2 5 5M14 8a2.5 2.5 0 1 0 0-5M15 12c2 .4 3.5 2.2 3.5 5'},
  {t:'Bodegas',v:['bodegas'],ico:'M2 8 10 3l8 5v9H2zM6 17v-5h8v5',hide:()=>!S.cfg.plants.some(p=>+p.cap>0)},
  {sep:true},
  {t:'Configuración',v:['datos','maestro'],gear:true,ico:'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 2v2.2M10 15.8V18M2 10h2.2M15.8 10H18M4.3 4.3l1.6 1.6M14.1 14.1l1.6 1.6M4.3 15.7l1.6-1.6M14.1 5.9l1.6-1.6'}];
const navOf=v=>NAV.find(n=>n.v&&n.v.includes(v))||NAV[0];
function subTabs(){const n=navOf(S.view);const list=n.sub||n.v;if(!list||list.length<2)return '';const cur=S.view==='informe'?'preparar':S.view;return `<div class="subnav" role="tablist">${list.map(v=>`<button role="tab" data-a="go" data-v="${v}" aria-selected="${cur===v}">${(VIEWS.find(x=>x[0]===v)||[,v])[1]}</button>`).join('')}</div>`;}
let toastT=null;
function toast(m){clearTimeout(toastT);let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);}t.textContent=m;t.hidden=false;toastT=setTimeout(()=>{t.hidden=true},3600);}

function counts(){
  const ix=S.ix;let pend=0,exp=0,exc=0;
  for(const l of fLines()){const p=planOf(l.k);
    if(l.st==='Abierta'&&pendingOf(l,p)>0)pend++;
    if(expressEligible(l,p))exp++;}
  const ex=exceptions();exc=ex.total;const np=npRows().length;
  const sug=ex.falt.length+ex.adel.length+ex.saldo.length+ex.exceso.length+np;
  return {pend,exp,exc,np,sug};
}
function renderNav(){
  const c=S.ix?counts():{pend:0,exp:0,exc:0,np:0,sug:0};
  const cur=navOf(S.view);
  $('#nav').innerHTML=NAV.filter(n=>!n.hide||!n.hide()).map(n=>n.sep?'<div class="sep"></div>':
    `<button data-a="go" data-v="${n.v[0]}" ${cur===n?'aria-current="page"':''} class="${n.gear?'gear':''}"><span class="ni"><svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true"><path d="${n.ico}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${n.t}</span>${n.t==='Hoy'&&c.sug?`<span class="badge hot" title="Gestiones pendientes">${c.sug}</span>`:''}${n.t==='Calendario'&&c.pend?`<span class="badge" title="Líneas con cantidad sin calendarizar">${c.pend}</span>`:''}</button>`).join('');
  const m=S.meta||{};
  $('#railfoot').innerHTML=`<span class="sync"><span class="dot ${S.mode==='db'?(S.loadNote?'warn':'ok'):'info'}"></span>${S.mode==='db'?(S.spError?'SharePoint sin conexión':'SharePoint · EXPORTADORACYL'):'Datos en este navegador'}</span>
   <span>OC: ${m.ocInfo?fdt(m.ocInfo.at):'sin cargar'}</span><span>Recepciones: ${m.recInfo?fdt(m.recInfo.at):'sin cargar'}</span>${S.me.name&&S.mode==='db'?`<span>${esc(S.me.name)}${S.canWrite?'':' · solo lectura'}</span>`:''}`;
}
function renderFilters(){
  const ix=S.ix;const f=S.filt;
  const opt=(arr,v)=>'<option value="">Todos</option>'+[...arr].sort().map(x=>`<option ${x===v?'selected':''} value="${esc(x)}">${esc(x)}</option>`).join('');
  const provs=new Set(ix.lines.filter(l=>!f.cat||l.cat===f.cat).map(l=>l.prov));
  const al=fAllowed();const hid=k=>al.includes(k)?'':' hidden';const nAct=al.filter(k=>f[k]).length;
  $('#filters').innerHTML=`
   <div class="fsel"${hid('cat')}><label for="f-cat">Categoría</label><select id="f-cat" data-f="cat">${opt(ix.cats,f.cat)}</select></div>
   ${ix.esps.size?`<div class="fsel"${hid('esp')}><label for="f-esp">Especie</label><select id="f-esp" data-f="esp">${opt(ix.esps,f.esp)}</select></div>`:''}
   <div class="fsel"${hid('prov')}><label for="f-prov">Proveedor</label><select id="f-prov" data-f="prov">${opt(provs,f.prov)}</select></div>
   <div class="fsel"${hid('oc')}><label for="f-oc">Orden de compra</label><input id="f-oc" type="search" data-f="oc" value="${esc(f.oc)}" placeholder="N° OC"></div>
   <div class="fsel"${hid('q')}><label for="f-q">Código o producto</label><input id="f-q" type="search" data-f="q" value="${esc(f.q)}" placeholder="IN002… / caja"></div>
   <div class="fsel"${hid('pl')}><label for="f-pl">Planta</label><select id="f-pl" data-f="pl">${opt(ix.plants,f.pl)}</select></div>
   <div class="fsel"${hid('wk')}><label for="f-wk">Semana</label><select id="f-wk" data-f="wk"><option value="">Todas</option>${wRange(wAdd(S.cfg.wFrom,-4),wAdd(S.cfg.wTo,10)).map(w=>`<option value="${w}" ${String(w)===String(f.wk)?'selected':''}>${wLabel(w)} · ${wDates(w)}${w===CUR?' (actual)':''}</option>`).join('')}</select></div>
   ${nAct?`<div class="fact"><span class="chip acc">Filtros activos: ${nAct}</span><button class="btn ghost sm" data-a="clearf">Limpiar</button></div>`:''}`;
  $('#weekchip').innerHTML=`Semana actual <b>${wLabel(CUR)}</b> · ${wDates(CUR)}<button class="helpbtn" data-tour-open title="Volver a ver la visita guiada"><i>?</i>Ayuda</button>`;
}
let renderQueued=false;
function render(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;doRender();});}
function doRender(){
  if(!S.ix){return;}
  if(['rnp','express','excepciones'].includes(S.view)){S.view='hoy';}
  if(S.view==='resumen'&&S.tab.ini==='gest'){S.view='hoy';S.tab.ini='ej';}
  if(S.view==='bandeja')S.view='agenda';
  if(S.view==='historial'){S.view='datos';S.tab.datos='hist';}
  if(S.view==='posiciones'||(S.view==='agenda'&&S.agMode==='cons')){S.view='bodegas';S.agMode='linea';}
  const focusId=document.activeElement&&document.activeElement.id;const selStart=document.activeElement&&document.activeElement.selectionStart;
  renderNav();renderFilters();
  $('#vtitle').textContent=navOf(S.view).t;
  const fn={hoy:vGestiones,semana:vSemanaHoy,bodegas:vBodegas,preparar:vPreparar,resumen:vResumen,agenda:vAgenda,rnp:vRNP,express:vRNP,excepciones:vRNP,seguimiento:vSeguimiento,posiciones:vPosiciones,historial:vHistorial,datos:vDatos,maestro:vMaestro,avance:vAvance,informe:vInforme}[S.view]||vResumen;
  let banners='';
  if(S.meta&&S.meta.example)banners+=`<div class="banner ex"><span class="grow"><b>Estás viendo datos de ejemplo.</b> Las órdenes y recepciones son ficticias; el mantenedor de unidades por pallet es el de tu planilla. Carga tus archivos en <i>Datos y configuración</i> para reemplazarlos.</span><button class="btn sm" data-a="go" data-v="datos">Cargar mis datos</button></div>`;
  if(!S.canWrite)banners+=`<div class="banner ro"><span class="grow">Tienes acceso de solo lectura. Puedes revisar el calendario y el OTIF, pero no modificarlos.</span></div>`;
  if(S.mode==='local'&&!S.meta.example&&S.ix.lines.length&&!lsGet('otif.localok',0))banners+=`<div class="banner"><span class="dot info"></span><span class="grow">Los datos quedan guardados en este navegador. Para compartirlos o cambiar de equipo usa <b>Respaldar / Restaurar</b> en Configuración.</span><button class="btn sm" data-a="localok">Entendido</button></div>`;
  if(S.loadNote)banners+=`<div class="banner"><span class="dot warn"></span><span class="grow">${esc(S.loadNote)}</span><button class="btn sm" data-a="spOpen">Abrir SharePoint</button><button class="btn sm pri" data-a="spReconnect">Reconectar</button></div>`;
  $('#content').innerHTML=subTabs()+banners+fn();
  if(focusId){const el=document.getElementById(focusId);if(el&&el!==document.activeElement){el.focus();try{if(selStart!=null)el.setSelectionRange(selStart,selStart)}catch(e){}}}
  postRender();
  if(TOUR.on){const j=tourStepFor(S.view),cur=TOUR_STEPS[TOUR.i];if(j>=0&&(!cur.v||navOf(cur.v)!==navOf(S.view))){TOUR.i=j;TOUR.from=S.view;tourCard();}requestAnimationFrame(tourPos);}
  else if(!TOUR.chk){TOUR.chk=1;if(!lsGet('otif.tour.done',0))setTimeout(()=>{if(!D)tourStart();},700);}
}
let postFns=[];

/* =========================================================
   Visita guiada
   ========================================================= */
const TOUR_STEPS=[
  {v:null,k:'Bienvenida',h:'Te damos la bienvenida a Gestión y Monitoreo de Entregas',p:'Aquí se acuerdan con cada proveedor las entregas de materiales de embalaje, se mide si cumplieron (OTIF) y se proyecta cuánto espacio van a ocupar en bodega. La visita toma unos 2 minutos.',
   li:['<b>Filtros de arriba</b> (categoría, proveedor, OC, código, planta): son tuyos, quedan guardados en tu navegador y no cambian lo que ven los demás.','Usa <b>Siguiente</b> para avanzar o <b>Saltar</b> para cerrar. Puedes volver a verla con el botón <b>? Ayuda</b>.']},
  {v:'resumen',k:'Resumen',h:'La foto general',p:'Cómo vamos en la temporada, de un vistazo y sin entrar al detalle.',
   li:['OTIF, a tiempo (OT), cantidad completa (IN) y fill rate.','Avance por categoría y por formato.','Ocupación de las plantas hoy y el máximo de las próximas semanas.'],
   auto:'Todos los indicadores se recalculan solos con cada actualización de datos y cada cambio en el calendario.'},
  {v:'hoy',k:'Hoy',h:'Tu punto de partida cada día',p:'Reúne todo lo que necesita una acción. El número rojo en el menú indica cuántas gestiones hay.',
   li:['<b>Gestiones pendientes</b>: faltantes por recalendarizar, adelantos o excesos por descontar, recepciones no planificadas y líneas sin calendarizar.','Toca <b>Revisar</b>: la aplicación propone una solución y tú la aceptas o la ajustas.','<b>Semana actual</b>: cuánto ha llegado de lo comprometido esta semana.'],
   auto:'Las gestiones pendientes aparecen solas: faltantes y adelantos al cerrar la semana, recepciones fuera de calendario y OC nuevas sin calendarizar. Cada una trae una solución sugerida que la persona revisa y acepta (o modifica manualmente).'},
  {v:'agenda',k:'Calendario',h:'Las entregas acordadas',p:'Una planilla por producto, planta y semana, desde la semana actual en adelante.',
   li:['Toca <b>+</b> para agendar una entrega, o una cantidad para modificarla o reprogramarla.','Un calendario nuevo queda en <b>Borrador</b>. Cuando el proveedor lo acepta, toca <b>Confirmar</b>: desde ahí cada cambio queda en el historial con su responsable.','<b>Carga masiva</b> sube muchas entregas desde un Excel.','<b>⚠ Gestión pendiente</b> avisa si un producto no cuadra.'],
   auto:'Cada OC nueva cargada aparece sola, con todo su adjudicado en Por calendarizar. Lo recibido y lo que falta por llegar se descuentan solos; la persona agenda y confirma.'},
  {v:'seguimiento',k:'Proveedores',h:'El cumplimiento de cada proveedor',p:'Para revisar lo que ya pasó y preparar las reuniones.',
   li:['<b>Seguimiento OTIF</b>: semanas cerradas, qué cumplió y qué no, y por qué.','<b>Avance de OC</b>: cuánto se ha recibido de cada orden.','<b>Reunión semanal</b>: la pauta para conversar con cada proveedor y el PDF para enviarle.'],
   auto:'El OTIF de cada entrega se calcula solo al cerrar la semana, y la pauta, el PDF y el correo se arman solos. En la sección de acuerdos, los cambios hechos en el calendario durante la reunión se registran solos, y la persona solo anota lo adicional.'},
  {v:'bodegas',k:'Bodegas',h:'El espacio en las plantas',p:'Convierte lo recibido y lo calendarizado en posiciones ocupadas.',
   li:['Ocupación de hoy y proyectada según el calendario, por planta.','Alertas cuando una planta pasa de 75% y de 90%.','Consolidado por planta y semana para anticipar decisiones.'],
   auto:'La ocupación real se calcula con las recepciones y la proyectada con lo calendarizado; se actualiza sola con cada entrega que se agenda o se recibe.',
   pend:'Definir con la subgerencia de bodegas la mejor fuente para conocer los espacios disponibles en cada momento. La ocupación cambia no solo con las recepciones de proveedores, sino también con los traslados entre plantas, que liberan u ocupan posiciones.'},
  {v:'datos',k:'Configuración',h:'Datos y ajustes',p:'Lo que alimenta todo lo anterior.',
   li:['Carga por Excel de órdenes de compra y recepciones.','Capacidad de cada planta y tolerancias del OTIF.','<b>Maestro de productos</b>: unidades por pallet y por posición en cada planta.','<b>Historial de cambios</b> de todas las líneas.'],
   auto:'Por ahora las órdenes de compra y las recepciones se cargan desde Excel; la lectura automática desde el sistema de compras está pendiente.'}
];
const TOUR={on:false,i:0,from:null,chk:0};
function tourStart(help){TOUR.on=true;TOUR.help=!!help;TOUR.from=S.view;
  if(help){const j=tourStepFor(S.view);TOUR.i=j>=0?j:0;}else TOUR.i=0;
  tourShow();}
function tourEnd(){TOUR.on=false;lsSet('otif.tour.done',1);const el=$('#tour');if(el)el.remove();
  document.querySelectorAll('.nav .tour-hl').forEach(b=>b.classList.remove('tour-hl'));
  if(TOUR.from&&S.view!==TOUR.from){S.view=TOUR.from;lsSet('otif.view',S.view);render();}}
function tourStepFor(v){const nv=navOf(v);return nv?TOUR_STEPS.findIndex(x=>x.v&&nv.v.includes(x.v)):-1;}
function tourShow(){
  const st=TOUR_STEPS[TOUR.i];if(st.v&&navOf(S.view)!==navOf(st.v)){S.view=st.v;lsSet('otif.view',S.view);window.scrollTo(0,0);}
  let el=$('#tour');if(!el){el=document.createElement('div');el.id='tour';el.className='tour';el.setAttribute('role','dialog');el.setAttribute('aria-labelledby','tour-h');document.body.appendChild(el);
    el.addEventListener('click',ev=>{const b=ev.target.closest('[data-t]');if(!b)return;const a=b.dataset.t;
      if(a==='skip')tourEnd();else if(a==='prev'){if(TOUR.i>0){TOUR.i--;tourShow();}}else if(a==='next'){if(TOUR.i<TOUR_STEPS.length-1){TOUR.i++;tourShow();}else tourEnd();}});}
  tourCard();render();requestAnimationFrame(()=>{tourPos();const f=el.querySelector('[data-t="next"]');if(f)f.focus({preventScroll:true});});
}
function tourCard(){
  const el=$('#tour');if(!el)return;const st=TOUR_STEPS[TOUR.i];
  const n=TOUR_STEPS.length,last=TOUR.i===n-1;
  el.innerHTML=`<span class="tk">${TOUR.i?`${TOUR.i} de ${n-1} · `:''}${esc(st.k)}</span><h2 id="tour-h">${st.h}</h2><p>${st.p}</p><ul>${st.li.map(x=>`<li>${x}</li>`).join('')}</ul>${st.auto?`<div class="tauto"><b>Se actualiza solo:</b> ${st.auto}</div>`:''}${st.pend?`<div class="tpend"><b>Pendiente:</b> ${st.pend}</div>`:''}
   <div class="tfoot"><div class="tdots" aria-hidden="true">${TOUR_STEPS.map((_,j)=>`<i class="${j===TOUR.i?'on':''}"></i>`).join('')}</div><span class="spacer" style="flex:1"></span>
   ${TOUR.help?'<button class="tskip" data-t="skip">Cerrar</button>':last?'':'<button class="tskip" data-t="skip">Saltar</button>'}${TOUR.i?'<button class="btn sm" data-t="prev">Anterior</button>':''}<button class="btn pri sm" data-t="next">${last?'Terminar':TOUR.i?'Siguiente':'Comenzar'}</button></div>`;
}
function tourPos(){
  const el=$('#tour');if(!el)return;const st=TOUR_STEPS[TOUR.i];
  document.querySelectorAll('.nav .tour-hl').forEach(b=>b.classList.remove('tour-hl'));
  const nb=st.v?document.querySelector(`#nav button[data-v="${navOf(st.v).v[0]}"]`):null;if(nb)nb.classList.add('tour-hl');
  if(window.innerWidth<=860){el.style.left='';el.style.top='';return;}
  const rail=document.querySelector('.rail').getBoundingClientRect();const left=rail.right+14;
  if(!nb){el.classList.add('nob');el.style.left=Math.max(left,(window.innerWidth-el.offsetWidth)/2)+'px';el.style.top=Math.max(80,(window.innerHeight-el.offsetHeight)/2)+'px';return;}
  el.classList.remove('nob');const r=nb.getBoundingClientRect();const top=Math.max(12,Math.min(r.top+r.height/2-30,window.innerHeight-el.offsetHeight-12));
  el.style.left=left+'px';el.style.top=top+'px';el.style.setProperty('--ay',Math.max(14,Math.min(el.offsetHeight-26,r.top+r.height/2-top-6))+'px');
}
document.addEventListener('click',ev=>{if(ev.target.closest('[data-tour-open]')){if(D)closeDrawer();if(TOUR.on){const el=$('#tour');if(el)el.remove();TOUR.on=false;}tourStart(true);}});
document.addEventListener('keydown',ev=>{if(!TOUR.on)return;if(ev.key==='Escape'&&!D){tourEnd();}else if(ev.key==='ArrowRight'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){$('#tour [data-t="next"]').click();}else if(ev.key==='ArrowLeft'&&TOUR.i&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){$('#tour [data-t="prev"]').click();}});
window.addEventListener('resize',()=>{if(TOUR.on)tourPos();});function postRender(){const f=postFns;postFns=[];f.forEach(x=>x());}

/* ---------- helpers de UI ---------- */
const chipLine=st=>st==='Cancelada'?'<span class="chip bad">Cancelada</span>':st==='Abierta'?'<span class="chip info">Abierta</span>':'<span class="chip kr">Recibida/Facturada</span>';
const bin=v=>v==null?'<span class="bin bn">–</span>':`<span class="bin b${v}">${v}</span>`;
const SRC={plan:'Plan',reprog:'Reprogramado',recal:'Recalendarizado',express:'No planificada'};
function statusChip(e){
  if(e.m==='excl')return '<span class="chip">Cancelado</span>';
  if(e.phase==='fut')return '<span class="chip">En plazo</span>';
  if(e.phase==='cur')return `<span class="chip warn">En curso</span>`;
  const base=e.otif?'<span class="chip ok">Cumple</span>':'<span class="chip bad">No cumple</span>';
  return base;
}
function measChip(m){return m==='pen'?'<span class="chip acc" title="Compromiso original modificado por el proveedor: se evalúa y penaliza">Penaliza</span>':m==='info'?'<span class="chip info" title="Se mide solo como información; no afecta el OTIF del proveedor">Informativo</span>':m==='excl'?'':'<span class="chip">Mide</span>';}
function emptyState(t,s,btn){return `<div class="empty-st"><b>${t}</b><span>${s}</span>${btn||''}</div>`;}
function lineLabel(l){return `<span class="mono">${esc(l.oc)}</span> · <span class="mono">${esc(l.cod)}</span>`;}
function svgBar(segs,total){if(!total)return '<div class="bar"></div>';return `<div class="bar" role="img" aria-label="${segs.map(s=>s.t+' '+pct(s.v/total)).join(', ')}">${segs.map(s=>`<i style="width:${Math.max(0,100*s.v/total)}%;background:${s.c}" title="${esc(s.t)}: ${fmt(s.v)}"></i>`).join('')}</div>`;}

/* ---------- KPIs ---------- */
function kpi(evs){
  const m=evs.filter(x=>x.e.counts);const n=m.length;
  const ot=sum(m,x=>x.e.ot),inf=sum(m,x=>x.e.inf),otif=sum(m,x=>x.e.otif);
  const q=sum(m,x=>x.c.qty),qOk=sum(m.filter(x=>x.e.otif),x=>x.c.qty);
  const r=sum(m,x=>Math.min(x.e.r,x.c.qty));
  return {n,ot:n?ot/n:null,inf:n?inf/n:null,otif:n?otif/n:null,wotif:q?qOk/q:null,fill:q?r/q:null,q,ok:otif};
}

/* =========================================================
   Vista: Resumen
   ========================================================= */
/* =========================================================
   Inicio: Resumen ejecutivo + Gestiones pendientes
   ========================================================= */
function vResumen(){
  if(!S.ix.lines.length)return noData();
  return vEjecutivo();
}
function vSemanaHoy(){if(!S.ix.lines.length)return noData();return vSemanaActual('');}
function vGestiones(){
  if(!S.ix.lines.length)return noData();
  const ex=exceptions();
  const next4=wRange(CUR,wAdd(CUR,3));const occ=occupancy(next4);let hot=[];for(const pl of Object.keys(occ))for(const w of next4){const o=occ[pl][w];if(o&&o.pct>=0.9)hot.push(pl+' '+wLabel(w)+' ('+pct(o.pct)+')');}
  return `<div class="panel" id="gestiones"><div class="panel-h"><h2>Gestiones pendientes</h2><p>La herramienta propone cómo resolver cada caso. Abre Revisar para ver las sugerencias y aceptarlas, o usa Modificar para hacer algo distinto.</p></div><div class="panel-b"><div class="tw"><table><tbody>
      ${sugRow('Líneas abiertas con cantidad sin calendarizar','pend')}
      ${sugRow('Faltantes por recalendarizar (semanas cerradas que no cumplieron In Full)','falt')}
      ${sugRow('Adelantos por descontar de semanas siguientes','adel')}
      ${sugRow('Líneas cerradas con saldo (registrar saldo cancelado)','saldo')}
      ${sugRow('Exceso recepcionado sobre lo comprado','exceso')}
      ${sugRow('Recepciones no planificadas por registrar','np')}
      ${attRow('Plantas sobre 90% de ocupación (próximas 4 semanas)',hot.length,'bodegas',null,hot.join(' · '))}
      ${sugRow('Productos con ficha incompleta (no se pueden convertir a posiciones)','nopal')}
      ${sugRow('Reuniones de la semana por cerrar ('+wLabel(CUR)+')','meet')}
    </tbody></table></div></div></div>`;
}
function vEjecutivo(){
  const lines=fLines();const evs=allEvals();const K=kpi(evs);
  const wIn=(a,b)=>x=>x.c.wk>=a&&x.c.wk<=b;
  const K4=kpi(evs.filter(wIn(wAdd(CUR,-4),wAdd(CUR,-1)))),K8=kpi(evs.filter(wIn(wAdd(CUR,-8),wAdd(CUR,-5))));
  const A=avanceAgg(lines,l=>['t','Total','']);const T=A.tot;const realP=T.adj?T.real/T.adj:null,planP=T.adj?T.planHoy/T.adj:null,metaP=avMeta(T,A.curYM);
  const mo=MO();
  const dlt=(a,b)=>a==null||b==null?'':`<span class="dl ${a>=b?'up':'dn'}">${a>=b?'▲':'▼'} ${Math.abs((a-b)*100).toFixed(1).replace('.',',')} pts</span>`;
  const vsMeta=v=>v==null?'':v>=mo?`<span class="chip ok">sobre meta</span>`:`<span class="chip ${v>=MA()?'warn':'bad'}">${((mo-v)*100).toFixed(1).replace('.',',')} pts bajo meta</span>`;
  // vencido y próximas semanas
  let venc=0,prox=0;const n4=wRange(CUR,wAdd(CUR,3));
  for(const x of evs){if(!isActive(x.c))continue;if(x.c.wk<CUR&&(x.e.m==='mide'||x.e.m==='pen'))venc+=Math.max(0,x.c.plan-x.e.r);if(n4.includes(x.c.wk))prox+=Math.max(0,x.c.plan-(x.c.wk===CUR?x.e.r:0));}
  const Bt=bodData();let ocT='';
  if(Bt.pls.length){const nx4=wRange(wAdd(CUR,1),wAdd(CUR,4));let o=0,c=0;for(const pl of Bt.pls){const x=Bt.occ[pl][CUR];if(x){o+=x.occ;c+=x.cap;}}const p0=c?o/c:null;
    let pk=null;for(const pl of Bt.pls)for(const w of nx4){const x=Bt.occ[pl][w];if(x&&(!pk||x.pct>pk.pct))pk={pl,w,pct:x.pct};}
    const oc=v=>v>=.9?'var(--bad)':v>=.75?'var(--warn)':'inherit';
    ocT=`<div class="tile"><span class="k">Ocupación de bodegas</span><span class="v" style="color:${oc(p0)}">${pct(p0)}</span><span class="s">${fmt(Math.round(o))} de ${fmt(c)} posiciones hoy</span>
      <div class="tpl">${Bt.pls.map(pl=>{const x=Bt.occ[pl][CUR];return `<div><span>${esc(pl)}</span><b style="color:${x?oc(x.pct):''}">${x?pct(x.pct):'–'}</b></div>`;}).join('')}</div>${pk?`<span class="s" style="margin-top:6px">Máx. próx. 4 sem.: <b style="color:${oc(pk.pct)}">${pct(pk.pct)}</b> en ${esc(pk.pl)} ${wLabel(pk.w)}</span>`:''}</div>`;}
  const tiles=`<div class="tiles">
   <div class="tile lead"><span class="k">OTIF temporada</span><span class="v" style="color:${oCss(K.otif)}">${pct(K.otif)}</span><span class="s">Meta ${pct(mo)} · ${K.ok} de ${K.n} compromisos</span><div>${vsMeta(K.otif)}</div></div>
   <div class="tile"><span class="k">OTIF últimas 4 semanas</span><span class="v" style="color:${oCss(K4.otif)}">${pct(K4.otif)}</span><span class="s">${wLabel(wAdd(CUR,-4))}–${wLabel(wAdd(CUR,-1))} · ${K4.n} compromisos</span><div>${dlt(K4.otif,K8.otif)} <span class="muted" style="font-size:12px">vs 4 sem. previas</span></div></div>
   <div class="tile"><span class="k">On Time</span><span class="v">${pct(K.ot)}</span><span class="s">Llegó en la semana comprometida</span></div>
   <div class="tile"><span class="k">In Full</span><span class="v">${pct(K.inf)}</span><span class="s">Cantidad dentro de −${Math.round(S.cfg.tolUnder*100)}% / +${Math.round(S.cfg.tolOver*100)}%</span></div>
   <div class="tile"><span class="k">Avance de entregas</span><span class="v">${pct(realP)}</span><span class="s">de lo adjudicado · plan a hoy ${pct(planP)}${metaP?` · meta ${ymLabel(A.curYM)} ${pct(metaP)}`:''}</span>${metaP?`<div>${realP>=metaP-0.005?'<span class="chip ok">en meta</span>':`<span class="chip bad">${((metaP-realP)*100).toFixed(1).replace('.',',')} pts bajo meta</span>`}</div>`:''}</div>${ocT}</div>`;
  // gráfico OTIF semanal
  const wk=new Map();for(const x of evs){if(!x.e.counts)continue;const o=wk.get(x.c.wk)||{n:0,ok:0,ot:0,inf:0};o.n++;o.ok+=x.e.otif;o.ot+=x.e.ot;o.inf+=x.e.inf;wk.set(x.c.wk,o);}
  const weeks=[...wk.keys()].sort((a,b)=>a-b).slice(-16);
  const chart=(()=>{if(!weeks.length)return emptyState('Aún no hay semanas cerradas','El OTIF se calcula cuando termina la semana comprometida.');
    const W=900,H=150,ml=40,mr=10,mt=16,mb=30;const iw=W-ml-mr,ih=H-mt-mb;const n=weeks.length;const bw=Math.min(22,iw/n*0.45);const cx=i=>ml+(i+0.5)*iw/n;const y=v=>mt+ih-v*ih;
    const grid=[0,.5,1].map(v=>`<line x1="${ml}" x2="${W-mr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${ml-6}" y="${y(v)+4}" text-anchor="end" class="ax">${v*100}%</text>`).join('');
    const bars=weeks.map((w,i)=>{const o=wk.get(w);const v=o.ok/o.n;const c=v>=mo?'var(--s1)':v>=MA()?'var(--warn)':'var(--bad)';const h=Math.max(2,v*ih);
      return `<g><title>${wLabel(w)} · OTIF ${pct(v)} (${o.ok} de ${o.n}) · On Time ${pct(o.ot/o.n)} · In Full ${pct(o.inf/o.n)}</title><rect x="${cx(i)-bw/2}" y="${y(v)}" width="${bw}" height="${h}" rx="4" fill="${c}"/><rect x="${cx(i)-iw/n/2}" y="${mt}" width="${iw/n}" height="${ih}" fill="transparent"/>
        <text x="${cx(i)}" y="${y(v)-5}" text-anchor="middle" class="lb">${Math.round(v*100)}</text><text x="${cx(i)}" y="${H-16}" text-anchor="middle" class="ax">${wLabel(w)}</text><text x="${cx(i)}" y="${H-4}" text-anchor="middle" class="ax" style="font-size:10px">${o.n} comp.</text></g>`;}).join('');
    const meta=`<line x1="${ml}" x2="${W-mr}" y1="${y(mo)}" y2="${y(mo)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W-mr}" y="${y(mo)-5}" text-anchor="end" class="ax" style="fill:var(--ink);font-weight:700">Meta ${pct(mo)}</text>`;
    return `<div class="bchart"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="OTIF por semana">${grid}${bars}${meta}</svg></div>
      <div class="legend"><span><i class="sw" style="background:var(--s1)"></i>En meta (≥ ${pct(mo)})</span><span><i class="sw" style="background:var(--warn)"></i>Bajo meta</span><span><i class="sw" style="background:var(--bad)"></i>Bajo umbral de alerta (${pct(MA())})</span><span>Pasa el cursor por una barra para ver On Time e In Full.</span></div>`;})();
  // causas
  const fails=evs.filter(x=>x.e.counts&&!x.e.otif);const tu=+S.cfg.tolUnder||0;
  const cz={none:0,late:0,short:0,over:0};
  for(const x of fails){if(!x.e.r){cz.none++;}else if(!x.e.ot)cz.late++;else if(x.e.r<x.c.qty*(1-tu))cz.short++;else cz.over++;}
  const czRows=[['No llegó en la semana',cz.none,'Sin recepción en la semana comprometida'],['Llegó incompleto',cz.short,`Bajo −${Math.round(tu*100)}% de lo comprometido`],['Sobreentrega',cz.over,`Sobre +${Math.round((+S.cfg.tolOver||0)*100)}% de lo comprometido`]].filter(r=>r[1]||true);
  const czMax=Math.max(1,...czRows.map(r=>r[1]));
  const causas=`<div class="panel"><div class="panel-h"><h2>Causas de incumplimiento</h2><p>${fails.length} compromisos no cumplidos en la temporada.</p></div><div class="panel-b" style="display:flex;flex-direction:column;gap:12px">
    ${czRows.map(([t,v,d])=>`<div><div class="row" style="justify-content:space-between"><span><b style="font-weight:600">${t}</b> <span class="muted" style="font-size:12px">${d}</span></span><b>${v} <span class="muted" style="font-weight:500">(${fails.length?Math.round(v/fails.length*100):0}%)</span></b></div><div class="hbar"><i style="width:${fails.length?v/fails.length*100:0}%"></i></div></div>`).join('')}
    <div class="kv" style="margin-top:4px"><span>Pendiente vencido <b style="color:${venc?'var(--bad)':'inherit'}">${fmt(venc)}</b> u.</span><span>Por recibir ${wLabel(CUR)}–${wLabel(wAdd(CUR,3))} <b>${fmt(prox)}</b> u.</span></div></div></div>`;
  const Ac=avanceAgg(lines,l=>[norm(l.cat),l.cat,'']);
  const catPanel=`<div class="panel"><div class="panel-h"><h2>Avance por categoría</h2><p>Entregado sobre lo adjudicado, comparado con la meta acumulada a ${ymLabel(Ac.curYM)} (marca negra) y el plan a hoy.</p><span class="spacer"></span><button class="btn ghost sm" data-a="go" data-v="avance">Ver KPI Avance</button></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:14px">${Ac.rows.map(g=>{const r=g.adj?g.real/g.adj:0,m=avMeta(g,Ac.curYM),ph=g.adj?g.planHoy/g.adj:null;const low=m&&r<m-0.005;
     return `<div><div class="row" style="justify-content:space-between"><b style="font-weight:600">${esc(g.label)}</b><span><b style="color:${low?'var(--bad)':'inherit'}">${pct(r)}</b> <span class="muted" style="font-size:12px">${m?'meta '+pct(m):''}${ph!=null?' · plan '+pct(ph):''}</span></span></div>
       <div class="pbar"><i style="width:${Math.min(100,r*100)}%;background:${low?'var(--bad)':'var(--s1)'}"></i>${m?`<u style="left:${Math.min(100,m*100)}%" title="Meta ${pct(m)}"></u>`:''}</div>
       <div class="muted" style="font-size:12px">${fmt(g.real)} de ${fmt(g.adj)} u.${m&&low?` · faltan ${fmt(Math.round((m-r)*g.adj))} u. para la meta`:''}</div></div>`;}).join('')||emptyState('Sin categorías','')}</div></div>`;
  // proveedores
  const byP=new Map();for(const x of evs){if(!byP.has(x.l.prov))byP.set(x.l.prov,[]);byP.get(x.l.prov).push(x);}
  const pr=[...byP.entries()].map(([prov,a])=>{const k=kpi(a);const k4=kpi(a.filter(wIn(wAdd(CUR,-4),wAdd(CUR,-1))));const f=a.filter(x=>x.e.counts&&!x.e.otif);let c={'No llegó':0,'Incompleto':0,'Sobreentrega':0};for(const x of f){if(!x.e.r)c['No llegó']++;else if(!x.e.ot)c['No llegó']++;else if(x.e.r<x.c.qty*(1-tu))c['Incompleto']++;else c['Sobreentrega']++;}
    const top=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];return {prov,k,k4,fails:f.length,cause:top&&top[1]?top[0]:'–'};}).filter(r=>r.k.n).sort((a,b)=>(a.k.otif??2)-(b.k.otif??2)||b.k.n-a.k.n);
  const nBelow=pr.filter(r=>r.k.otif<mo).length;
  const provs=`<div class="panel"><div class="panel-h"><h2>Proveedores</h2><p>${nBelow} de ${pr.length} bajo la meta de ${pct(mo)}. Ordenados de menor a mayor OTIF de la temporada.</p><span class="spacer"></span><button class="btn ghost sm" data-a="go" data-v="seguimiento">Ver detalle</button></div>
   <div class="tw"><table><thead><tr><th>Proveedor</th><th class="num">Comp.</th><th class="num">OTIF temporada</th><th class="num">Últ. 4 sem.</th><th>Causa principal</th></tr></thead><tbody>
   ${pr.slice(0,10).map(r=>`<tr><td class="wrap">${esc(r.prov)}</td><td class="num">${r.k.n}</td><td class="num"><b style="color:${oCss(r.k.otif)}">${pct(r.k.otif)}</b></td><td class="num">${pct(r.k4.otif)}${r.k4.otif!=null&&r.k.otif!=null?` <span class="dl ${r.k4.otif>=r.k.otif?'up':'dn'}">${r.k4.otif>=r.k.otif?'▲':'▼'}</span>`:''}</td><td>${r.fails?esc(r.cause):'<span class="muted">–</span>'}</td></tr>`).join('')}
   </tbody></table></div>${pr.length>10?`<p class="hint" style="padding:6px 14px">Se muestran los 10 con menor OTIF de ${pr.length}.</p>`:''}</div>`;
  // avance por categoría
  const Af=avanceAgg(lines,l=>[norm(l.cat)+'|'+(l.fmt||'Sin formato'),l.fmt||'Sin formato',l.cat]);
  const comprado=sum(lines.filter(l=>l.st!=='Cancelada'),l=>l.qty),cancel=sum(lines,l=>planOf(l.k).cancel||0),plan=sum(lines,l=>planSum(planOf(l.k))),recib=sum(lines,l=>recTot(l.k)),sinCal=Math.max(0,comprado-cancel-plan);
  const avance=`<div class="panel"><div class="panel-h"><h2>Avance de la temporada</h2><span class="spacer"></span><button class="btn ghost sm" data-a="go" data-v="avance">Ver KPI Avance</button></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:10px">
    ${svgBar([{t:'Recibido',v:Math.min(recib,comprado),c:'var(--s1)'},{t:'Calendarizado por recibir',v:Math.max(0,plan-recib),c:'var(--kraft)'},{t:'Sin calendarizar',v:sinCal,c:'var(--line-2)'},{t:'Saldo cancelado',v:cancel,c:'var(--fut)'}],comprado)}
    <div class="legend"><span><i class="sw" style="background:var(--s1)"></i>Recibido ${fmt(recib)}</span><span><i class="sw" style="background:var(--kraft)"></i>Por recibir ${fmt(Math.max(0,plan-recib))}</span><span><i class="sw" style="background:var(--line-2)"></i>Sin calendarizar ${fmt(sinCal)}</span>${cancel?`<span><i class="sw" style="background:var(--fut)"></i>Cancelado ${fmt(cancel)}</span>`:''}</div>
    <div class="tw"><table><thead><tr><th>Formato</th><th class="num">Adjudicado</th><th class="num">Real hoy</th><th class="num">Meta ${ymLabel(Af.curYM)}</th></tr></thead><tbody>
    ${Af.rows.map(g=>{const r=g.adj?g.real/g.adj:null,m=avMeta(g,Af.curYM);return `<tr><td class="wrap">${esc(g.label)}<div class="muted" style="font-size:11.5px">${esc(g.sub||'')}</div></td><td class="num">${fmt(g.adj)}</td><td class="num"><b style="color:${m&&r<m-0.005?'var(--bad)':'inherit'}">${pct(r)}</b></td><td class="num">${pct(m)}</td></tr>`;}).join('')}</tbody></table></div></div></div>`;
  // plantas
  const B=bodData();const n4b=wRange(wAdd(CUR,1),wAdd(CUR,4));
  const byPl=new Map();for(const x of evs){if(!byPl.has(x.c.pl))byPl.set(x.c.pl,[]);byPl.get(x.c.pl).push(x);}
  const plRows=[...new Set([...B.pls,...byPl.keys()])].map(pl=>{const k=kpi(byPl.get(pl)||[]);const o=B.occ[pl]||{};const now=o[CUR];let mx=null;for(const w of n4b){const x=o[w];if(x&&(!mx||x.pct>mx.pct))mx={w,pct:x.pct,occ:x.occ};}const cap=+((S.cfg.plants.find(q=>q.name===pl)||{}).cap)||0;return {pl,k,now,mx,cap};}).filter(r=>r.k.n||r.now);
  const occC=v=>v>=.9?'var(--bad)':v>=.75?'var(--warn)':'inherit';
  const plantas=`<div class="panel"><div class="panel-h"><h2>Plantas</h2><span class="spacer"></span><button class="btn ghost sm" data-a="go" data-v="bodegas">Ver Bodegas</button></div>
   <div class="tw"><table class="grp"><thead><tr><th rowspan="2">Planta</th><th class="gh" colspan="1">Cumplimiento</th><th class="gh" colspan="3">Posiciones</th></tr>
     <tr><th class="num">OTIF</th><th class="num gs">Capacidad planta</th><th class="num">Ocupación hoy</th><th class="num">Máx. próx. 4 sem.</th></tr></thead><tbody>
   ${plRows.map(r=>`<tr><td>${esc(r.pl)}</td><td class="num"><b style="color:${oCss(r.k.otif)}">${pct(r.k.otif)}</b></td>
     <td class="num gs">${r.cap?fmt(r.cap):'–'}</td>
     <td class="num">${r.now?`${fmt(Math.round(r.now.occ))}<div class="muted" style="font-size:11.5px">${pct(r.now.pct)}</div>`:'–'}</td>
     <td class="num">${r.mx?`${fmt(Math.round(r.mx.occ))}<div style="font-size:11.5px"><b style="color:${occC(r.mx.pct)}">${pct(r.mx.pct)}</b> <span class="muted">${wLabel(r.mx.w)}</span></div>`:'–'}</td></tr>`).join('')}
   </tbody></table></div></div>`;
  const m=S.meta||{};const at=[m.ocInfo&&m.ocInfo.at,m.recInfo&&m.recInfo.at].filter(Boolean).sort().pop();
  return `<div class="exhead"><div><b>Resumen OTIF · materiales de embalaje</b><span class="muted"> · Temporada ${wLabel(S.cfg.wFrom)}–${wLabel(S.cfg.wTo)} · semana actual ${wLabel(CUR)}</span></div><span class="muted">Datos al ${at?fdt(at):'–'}${m.example?' (ejemplo)':''}</span></div>
   ${tiles}
   <div class="panel"><div class="panel-h"><h2>OTIF por semana</h2><p>Semanas cerradas. La línea punteada es la meta.</p></div><div class="panel-b">${chart}</div></div>
   <div class="grid2">${provs}${catPanel}</div>
   <div class="grid2">${avance}${plantas}</div>`;
}
/* =========================================================
   Ruta semanal (Inicio) y Preparar semana (Proveedores)
   ========================================================= */
function weekRoute(){
  const m=S.meta||{};const at=[m.ocInfo&&m.ocInfo.at,m.recInfo&&m.recInfo.at].filter(Boolean).sort().pop();
  const loaded=!m.example&&at&&new Date(at)>=mondayOf(CUR);
  const c=counts();
  const nBorr=fLines().filter(x=>{const q=planOf(x.k);return !q.confirmed&&activeCommits(q).length>0&&x.st==='Abierta';}).length;
  const provs=provList().filter(p=>p.act);const closed=provs.filter(p=>{const mm=meetFor(p.prov);return mm&&mm.status==='cerrada';}).length;
  const steps=[
    {t:'Cargar datos',done:loaded,s:m.example?'Estás con datos de ejemplo.':at?`Última carga: ${fdt(at)}${loaded?'':' (antes de esta semana)'}`:'Aún no hay datos cargados.',b:['datos','','Cargar archivos']},
    {t:'Revisar sugerencias',done:!c.sug,s:c.sug?`${c.sug} gestión(es) con propuesta de solución.`:'Sin gestiones pendientes.',b:c.sug?['resumen','sug','Ver gestiones']:null},
    {t:'Confirmar calendario',done:!nBorr,s:nBorr?`${nBorr} línea(s) en borrador por confirmar.`:'Todo el calendario está confirmado.'+(c.pend?` ${c.pend} línea(s) con cantidad sin calendarizar.`:''),b:['agenda','','Ir al calendario']},
    {t:'Reuniones de la semana',done:provs.length>0&&closed===provs.length,s:provs.length?`${closed} de ${provs.length} reuniones cerradas.`:'Sin proveedores con entregas.',b:['preparar','','Preparar semana']}];
  const nd=steps.filter(x=>x.done).length;
  return `<div class="panel"><div class="panel-h"><h2>Ruta de la semana ${wLabel(CUR)}</h2><span class="spacer"></span><span class="muted">${nd} de 4 pasos listos</span></div>
   <div class="panel-b"><div class="route">${steps.map((x,i)=>`<div class="st ${x.done?'done':''}"><div class="n"><i>${x.done?'✓':i+1}</i>${x.t}</div><div class="s">${esc(x.s)}</div>${x.b?`<div><button class="btn ${x.done?'ghost':'pri'} sm" ${x.b[1]==='sug'?'data-a="scrollSug"':`data-a="go" data-v="${x.b[0]}"`}>${x.b[2]}</button></div>`:''}</div>`).join('')}</div></div></div>`;
}
function prepRows(){
  let list=provList().filter(p=>p.act);if(!list.length)list=provList();
  return list.map(p=>{const R=repData(p.prov);const m=meetFor(p.prov);const pm=prevMeet(p.prov);const pendAc=pm?pm.acuerdos.filter(a=>a.estado==='pendiente').length:0;
    let sc=0;const why=[];
    if(R.prevFail.length){sc+=2+R.prevFail.length;why.push(`${R.prevFail.length} incumplimiento(s) en ${wLabel(R.W1)}`);}
    if(R.vq>0){sc+=3;why.push(`deuda vencida ${fmt(R.vq)} u.`);}
    if(R.K4.otif!=null&&R.K4.otif<MA()){sc+=3;why.push('OTIF 4 sem. bajo el umbral de alerta');}else if(R.K4.otif!=null&&R.K4.otif<MO()){sc+=1;why.push('OTIF 4 sem. bajo la meta');}
    if(pendAc){sc+=1;why.push(`${pendAc} acuerdo(s) pendiente(s)`);}
    const pr=sc>=5?['Alta','bad']:sc>=2?['Media','warn']:['Baja','ok'];
    const est=m?(m.status==='cerrada'?['Cerrada','ok']:['En curso','warn']):['Sin iniciar',''];
    return {prov:p.prov,R,sc,why,pr,est,pendAc};}).sort((a,b)=>b.sc-a.sc||a.prov.localeCompare(b.prov));
}
function vPreparar(){
  if(!S.ix.lines.length)return noData();
  const rows=prepRows();const hi=rows.filter(r=>r.pr[0]==='Alta').length;const cl=rows.filter(r=>r.est[0]==='Cerrada').length;
  const spark=ser=>{const a=ser.slice(-6);return `<span style="display:inline-flex;gap:2px;align-items:flex-end;height:20px" aria-hidden="true">${a.map(x=>`<i style="display:inline-block;width:6px;height:${x.v==null?2:Math.max(2,x.v*20)}px;background:${x.v==null?'var(--line-2)':oCss(x.v)};border-radius:1px" title="${wLabel(x.wk)}: ${pct(x.v)}"></i>`).join('')}</span>`;};
  return `<div class="tiles">
    <div class="tile lead"><span class="k">Reuniones esta semana</span><span class="v">${rows.length}</span><span class="s">Proveedores con entregas entre ${wLabel(wAdd(CUR,-8))} y ${wLabel(wAdd(CUR,4))}</span></div>
    <div class="tile"><span class="k">Prioridad alta</span><span class="v" style="color:${hi?'var(--bad)':'inherit'}">${hi}</span><span class="s">Incumplimientos, deuda vencida u OTIF bajo alerta</span></div>
    <div class="tile"><span class="k">Cerradas</span><span class="v">${cl} de ${rows.length}</span><span class="s">Actas guardadas de ${wLabel(CUR)}</span></div></div>
   <div class="panel"><div class="panel-h"><h2>Orden sugerido de reuniones</h2><span class="spacer"></span>
     <button class="btn sm" data-a="mailGen">Correo resumen general</button><button class="btn pri sm" data-a="pdfAll">Descargar PDF de todos</button>
     <p>Ordenados por prioridad: primero quienes tienen incumplimientos de la semana anterior, deuda vencida, OTIF bajo meta o acuerdos pendientes. Abre la reunión para seguir los pasos, cerrar el acta y descargar el PDF del proveedor.</p></div>
   <div class="tw"><table><thead><tr><th>Prioridad</th><th>Proveedor</th><th>Por qué</th><th class="num">OTIF 4 sem.</th><th>Últimas sem.</th><th class="num">Próx. semana</th><th>Reunión</th><th></th></tr></thead><tbody>
   ${rows.map(r=>`<tr><td><span class="chip ${r.pr[1]}">${r.pr[0]}</span></td><td class="wrap" style="min-width:150px"><b style="font-weight:600">${esc(r.prov)}</b></td><td class="wrap" style="min-width:170px;font-size:12.5px">${r.why.length?esc(r.why.join(' · ')):'<span class="muted">Sin alertas</span>'}</td>
     <td class="num"><b style="color:${oCss(r.R.K4.otif)}">${pct(r.R.K4.otif)}</b></td><td>${spark(r.R.series)}</td><td class="num">${fmt(r.R.qn)}</td><td><span class="chip ${r.est[1]}">${r.est[0]}</span></td>
     <td><div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn sm pri" data-a="openMeet" data-p="${esc(r.prov)}">${r.est[0]==='Sin iniciar'?'Iniciar':'Abrir'}</button><button class="btn sm" data-a="mailProv" data-p="${esc(r.prov)}" title="Texto del correo">Correo</button></div></td></tr>`).join('')||`<tr><td colspan="8">${emptyState('Sin proveedores','Ajusta los filtros superiores.')}</td></tr>`}
   </tbody></table></div></div>`;
}
function plantPos(pl,a){
  const pc=S.cfg.plants.find(x=>x.name===pl);const stack=pc&&+pc.stack||1;let pend=0;const miss=new Set();
  for(const x of a){if(x.e.phase==='past'||!isActive(x.c))continue;const rem=x.e.phase==='cur'?Math.max(0,x.c.plan-x.e.r):x.c.plan;if(!rem)continue;const f=posFactor(x.l,pl);if(!f){miss.add(x.l.cod);continue;}pend+=rem*f;}
  const cap=pc?+pc.cap||0:0;let disp=null;
  if(cap){const w=wAdd(CUR,-1);const o=occupancy(w>=S.cfg.wFrom?[w]:[S.cfg.wFrom])[pl];const ow=o&&(o[w]||o[S.cfg.wFrom]);const occ=w>=S.cfg.wFrom?(ow?ow.occ:+pc.init||0):(+pc.init||0);disp=Math.max(0,cap-occ);}
  return {pend,cap,disp,saldo:disp!=null?disp-pend:null,sinUpp:miss.size};
}
function attRow(t,n,v,tab,extra,list){return `<tr><td class="wrap">${t}${extra?`<div class="muted" style="font-size:12px">${esc(extra)}</div>`:''}</td><td class="num"><span class="badge ${n?'hot':''}">${n}</span></td><td style="text-align:right">${n?(list?`<button class="btn ghost sm" data-a="exList" data-kind="${list}">Revisar</button>`:`<button class="btn ghost sm" data-a="go" data-v="${v}" ${tab?`data-tab="${tab}"`:''}>Revisar</button>`):''}</td></tr>`;}
function noData(){return `<div class="panel">${emptyState('Aún no hay órdenes de compra cargadas','Carga el detalle de órdenes de compra y las recepciones exportadas desde el sistema de compras para comenzar a calendarizar.','<button class="btn pri" data-a="go" data-v="datos">Cargar datos</button>')}</div>`;}

/* =========================================================
   Vista: Bandeja de pendientes
   ========================================================= */
function lineStatus(l,p){
  if(l.st==='Cancelada')return '<span class="chip">No se agenda</span>';
  const ps=planSum(p),pend=pendingOf(l,p);const n=activeCommits(p).length+(p.commits||[]).filter(c=>c.st==='modificada').length;
  if(!n)return l.st==='Abierta'?'<span class="chip bad">Sin calendario</span>':'<span class="chip warn">Sin calendario</span>';
  const conf=p.confirmed?'':' <span class="chip">Borrador</span>';
  return (pend>0?'<span class="chip warn">Parcial</span>':'<span class="chip ok">Completo</span>')+conf;
}
/* =========================================================
   Vista: Agenda semanal
   ========================================================= */
function weekCtl(){
  const wk=wRange(wAdd(S.cfg.wFrom,-4),wAdd(S.cfg.wTo,10));
  const o=v=>wk.map(w=>`<option value="${w}" ${w===v?'selected':''}>${wLabel(w)} · ${wDates(w)}</option>`).join('');
  return `<div class="row"><button class="btn sm" data-a="wshift" data-n="-4" aria-label="4 semanas antes">◀</button>
   <div class="fsel"><label for="w-from">Desde</label><select style="width:178px" id="w-from" data-wsel="from">${o(S.wFrom)}</select></div>
   <div class="fsel"><label for="w-to">Hasta</label><select style="width:178px" id="w-to" data-wsel="to">${o(S.wTo)}</select></div>
   <button class="btn sm" data-a="wshift" data-n="4" aria-label="4 semanas después">▶</button><button class="btn ghost sm" data-a="wtoday">Semana actual</button></div>`;
}
function plantsList(){const s=new Set(S.cfg.plants.map(p=>p.name));for(const p of S.ix.plants)s.add(p);return [...s].filter(plMatch);}
/* =========================================================
   Calendario: vista planilla (productos × semanas)
   ========================================================= */
function agPlanilla(){
  const weeks=wRange(CUR,Math.max(S.cfg.wTo,wAdd(CUR,8)));
  let ls=fLines().filter(l=>l.st!=='Cancelada'||activeCommits(planOf(l.k)).length);
  const pendOf=l=>l.st==='Abierta'?pendingOf(l,planOf(l.k)):0;
  if(S.agPend)ls=ls.filter(l=>pendOf(l)>0);
  ls.sort((a,b)=>String(a.prov).localeCompare(b.prov)||String(a.prod).localeCompare(b.prod)||String(a.oc).localeCompare(b.oc));
  if(!ls.length)return emptyState(S.agPend?'Todo está calendarizado':'No hay líneas con estos filtros',S.agPend?'No quedan líneas con saldo por calendarizar con estos filtros.':'Ajusta los filtros superiores.');
  const groups=new Map();for(const l of ls){if(!groups.has(l.prov))groups.set(l.prov,[]);groups.get(l.prov).push(l);}
  const one=groups.size===1;
  const th=`<tr><th class="pl-c1">Producto</th><th class="pl-c3 num">Adjudicado</th><th class="pl-c6 num">Recibido</th><th class="pl-c5 num">Por calendarizar</th><th class="pl-c4 num">Calendarizado por planta <span style="font-weight:500">(por llegar)</span></th><th class="pl-c2">Planta</th>${weeks.map(w=>`<th class="wk ${w===CUR?'cur':''}">${wLabel(w)}<span class="dts">${wDates(w)}</span></th>`).join('')}</tr>`;
  const ini=pl=>esc(String(pl).slice(0,3));
  const basePls=(S.cfg.plants.some(x=>+x.cap>0)?S.cfg.plants.filter(x=>+x.cap>0):S.cfg.plants).map(x=>x.name).filter(plMatch);
  const row=l=>{const p=planOf(l.k);const act=activeCommits(p);const pend=pendOf(l);
    const recPls=(S.ix.recLine.get(l.k)||[]).filter(r=>+r.qty>0).map(r=>r.pl);
    const pls=[...new Set([...basePls,...act.map(c=>c.pl),...recPls])].filter(plMatch);if(!pls.length)pls.push(plantOf(l.alm)||l.alm||defPlant()||'Sin planta');
    const n=pls.length;const brd=!p.confirmed&&act.length&&l.st==='Abierta';
    const llegPl=pl=>sum(act.filter(c=>c.pl===pl&&c.wk>=CUR),c=>Math.max(0,c.plan-(c.wk===CUR?recAt(l.k,pl,CUR):0)));
    const rec=recTot(l.k),lleg=sum(pls,llegPl),canc=+p.cancel||0;const diff=(l.st==='Abierta'?l.qty-canc-rec-lleg-pend:0);
    return pls.map((pl,ix)=>{
      const cells=weeks.map(w=>{const a=act.filter(c=>c.wk===w&&c.pl===pl);const r=recAt(l.k,pl,w);const cur=w===CUR?'pl-cur':'';
        if(!a.length){if(w<CUR)return `<td class="${cur}">${r?`<button class="cell pl-x" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}" title="Recibido ${fmt(r)} sin compromiso">·<small>rec. ${fmt(r)}</small></button>`:'<span class="cell empty">·</span>'}</td>`;
          return `<td class="${cur}"><button class="cell empty pl-add" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}" ${l.st==='Abierta'&&pend>0&&S.canWrite?'':'disabled'} aria-label="Agendar en ${esc(pl)} ${wLabel(w)}">+</button></td>`;}
        const q=sum(a,c=>c.plan);
        return `<td class="${cur}"><button class="cell pl-q" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}" title="${esc(pl)} · ${wLabel(w)} · ${fmt(q)}">${fmt(q)}</button></td>`;}).join('');
      const calPl=sum(act.filter(c=>c.pl===pl),c=>c.plan);const lleg=llegPl(pl);
      const first=ix===0?`<td class="pl-c1" rowspan="${n}"><div class="pl-prod"><b>${esc(l.prod)}</b><span class="muted pl-meta"><span class="mono">${esc(l.oc)} · ${esc(l.cod)}</span>${brd?` · <span class="chip warn" style="font-size:10.5px">Borrador</span>`:''}${l.st!=='Abierta'?` · ${chipLine(l.st)}`:''}</span>${Math.abs(diff)>0.5?`<span class="pl-nc" title="Adjudicado ${fmt(l.qty)}${canc?' − cancelado '+fmt(canc):''} ≠ recibido ${fmt(rec)} + por llegar ${fmt(lleg)} + por calendarizar ${fmt(pend)}. ${diff>0?'Hay faltantes de semanas pasadas sin recalendarizar.':'Llegó más de lo calendarizado (adelanto o exceso por descontar).'} Revísalo en Hoy → Gestiones pendientes.">⚠ Gestión pendiente: ${diff>0?'falta':'sobra'} ${fmt(Math.abs(diff))}</span>`:''}
          <span class="pl-acts"><button class="lnk" data-a="lineHist" data-k="${esc(l.k)}">Historial</button>${brd?`<button class="lnk" data-a="confirm" data-k="${esc(l.k)}" ${S.canWrite?'':'disabled'}>Confirmar</button>`:''}</span></div></td>`:'';
      const adj=ix===0?`<td class="pl-c3 pl-tot" rowspan="${n}"><span class="pl-tl">Total</span>${fmt(l.qty)}</td><td class="pl-c6 pl-tot" rowspan="${n}"><span class="pl-tl">Total</span>${fmt(rec)}<span class="pl-pct">${l.qty?pct(rec/l.qty):'–'}</span></td>`:'';
      const pc=ix===0?`<td class="pl-c5 pl-tot" rowspan="${n}"><span class="pl-tl">Total</span>${pend>0?`<b style="color:var(--bad)">${fmt(pend)}</b>`:'<span class="muted">0</span>'}</td>`:'';
      return `<tr ${ix===0?`id="pl-${segSafe(l.k)}"`:''} class="${S.agFocus===l.k?'pl-focus':''} ${ix===0?'pl-first':''}">${first}${adj}${pc}<td class="pl-c4 num">${calPl?`${fmt(calPl)} <span class="pl-ll" title="Por llegar desde ${wLabel(CUR)}">(${fmt(lleg)})</span>`:'<span class="muted">–</span>'}</td><td class="pl-c2">${esc(pl)}</td>${cells}</tr>`;}).join('');};
  S.agCol=S.agCol||lsGet('otif.agCol',{});const allCol=groups.size>1&&[...groups.keys()].every(g=>S.agCol[g]);
  const body=[...groups.entries()].map(([prov,a])=>{const col=!!S.agCol[prov];return `<tbody>${`<tr class="pl-g ${col?'pl-col':''}"><td class="pl-c1" colspan="6"><button class="pl-tg" data-a="agCol" data-g="${esc(prov)}" aria-expanded="${!col}" title="${col?'Expandir':'Colapsar'}">${col?'▸':'▾'}</button><b>${esc(prov)}</b> <span class="muted" style="font-size:12px">${a.length} línea${a.length>1?'s':''} · por calendarizar ${fmt(sum(a,pendOf))}${col?` · calendarizado ${fmt(sum(a,l=>planSum(planOf(l.k))))}`:''}</span></td><td colspan="${weeks.length}"></td></tr>`}${col?'':a.map(row).join('')}</tbody>`;}).join('');
  const colCtl=groups.size>1?`<div class="row" style="margin-bottom:6px;gap:8px"><button class="btn ghost sm" data-a="agColAll" data-v="${allCol?'0':'1'}">${allCol?'Expandir todos':'Colapsar todos'}</button></div>`:'';
  const tot=`<tfoot><tr class="pl-t"><td class="pl-c1"><b>Total</b></td><td class="pl-c3 num"><b>${fmt(sum(ls,l=>l.qty))}</b></td><td class="pl-c6 num"><b>${fmt(sum(ls,l=>recTot(l.k)))}</b></td><td class="pl-c5 num"><b>${fmt(sum(ls,pendOf))}</b></td><td class="pl-c4 num"><b>${fmt(sum(ls,l=>planSum(planOf(l.k))))}</b> <span class="pl-ll">(${fmt(sum(ls,l=>sum(activeCommits(planOf(l.k)).filter(c=>c.wk>=CUR&&plMatch(c.pl)),c=>Math.max(0,c.plan-(c.wk===CUR?recAt(l.k,c.pl,CUR):0)))))})</span></td><td class="pl-c2"></td>${weeks.map(w=>{const q=sum(ls,l=>sum(activeCommits(planOf(l.k)).filter(c=>c.wk===w),c=>c.plan));return `<td class="num ${w===CUR?'pl-cur':''}"><b>${q?fmt(q):''}</b></td>`;}).join('')}</tr></tfoot>`;
  postFns.push(()=>{const sc=document.getElementById('plan-scroll');if(!sc)return;
    if(S.agFocus){const r=document.getElementById('pl-'+segSafe(S.agFocus));if(r){r.scrollIntoView({block:'center'});}}
    if(S._plSL!=null)sc.scrollLeft=S._plSL;else sc.scrollLeft=0;
    sc.onscroll=()=>{S._plSL=sc.scrollLeft;};});
  return `${colCtl}<div class="tw pl-wrap" id="plan-scroll"><table class="ag plan">${`<thead>${th}</thead>`}${body}${tot}</table></div>
   <p class="hint" style="margin:8px 0 0">Calendario desde la semana actual (destacada) en adelante. Cuadratura de cada producto: Adjudicado = Recibido + Por llegar (entre paréntesis) + Por calendarizar; si no se cumple aparece ⚠ Gestión pendiente con lo que falta o sobra. Toca una celda con cantidad para modificar esa entrega, o <b>+</b> para agendar una nueva. Lo ya ocurrido y su cumplimiento se revisan en Proveedores → Seguimiento OTIF.</p>`;
}
function vAgenda(){
  if(!S.ix.lines.length)return noData();
  const nBorr=fLines().filter(x=>{const q=planOf(x.k);return !q.confirmed&&activeCommits(q).length>0&&x.st==='Abierta';}).length;
  return `<div class="panel"><div class="panel-h"><h2>Calendario de entregas</h2><span class="muted" style="font-size:13px">${wLabel(CUR)} en adelante</span><span class="spacer"></span>
    <label style="display:flex;gap:6px;align-items:center;font-size:13px;white-space:nowrap"><input class="cbx" type="checkbox" data-agpend="1" ${S.agPend?'checked':''}>Solo con saldo por calendarizar</label>
    ${nBorr?`<button class="btn sm" data-a="confirmAll" ${S.canWrite?'':'disabled'}>Confirmar ${nBorr} borrador${nBorr>1?'es':''}</button>`:''}
    <button class="btn sm pri" data-a="bulkOpen" ${S.canWrite?'':'disabled'}>Carga masiva</button></div>
   <div class="panel-b">${agPlanilla()}</div></div>`;
}
function agLinea(){
  const pendL=l=>l.st==='Abierta'?pendingOf(l,planOf(l.k)):0;
  const allL=fLines().filter(l=>l.st!=='Cancelada'||planOf(l.k).commits?.length);const nPend=allL.filter(l=>pendL(l)>0).length;
  const lines=allL.filter(l=>S.agAll||pendL(l)>0||l.k===S.agKeep).sort((a,b)=>(pendL(b)>0)-(pendL(a)>0)||String(a.prov).localeCompare(b.prov)||String(a.oc).localeCompare(b.oc));
  const nBorr=fLines().filter(x=>{const q=planOf(x.k);return !q.confirmed&&activeCommits(q).length>0&&x.st==='Abierta';}).length;
  const allCtl=`<label style="display:flex;gap:6px;align-items:center;font-size:13px;white-space:nowrap"><input class="cbx" type="checkbox" id="ag-all" data-agall="1" ${S.agAll?'checked':''}>Mostrar también líneas ya calendarizadas</label>`;
  if(!allL.length)return emptyState('No hay líneas con estos filtros','Ajusta los filtros superiores.');
  if(!lines.length)return emptyState('Todas las líneas están calendarizadas','No quedan líneas con saldo por calendarizar con estos filtros. Para revisar o modificar una línea ya calendarizada, activa la opción.',`<div class="row" style="justify-content:center">${allCtl}</div>`);
  if(!S.agLine||!S.ix.byK[S.agLine]||!lines.find(l=>l.k===S.agLine))S.agLine=lines[0].k;
  const l=S.ix.byK[S.agLine];const p=planOf(l.k);const pend=pendingOf(l,p);const weeks=wRange(S.wFrom,S.wTo);const pls=plantsList();
  const sel=`<div class="fsel" style="flex:1;min-width:240px"><label for="ag-line">Línea OC · producto · ${S.agAll?allL.length+' líneas':nPend+' con saldo por calendarizar'}</label><select id="ag-line" data-a2="agline" style="width:100%">${lines.map(x=>`<option value="${esc(x.k)}" ${x.k===l.k?'selected':''}>${pendL(x)>0?'● Sin calendarizar '+fmt(pendL(x))+' · ':''}${esc(x.prov)} · OC ${esc(x.oc)} · ${esc(x.cod)} · ${esc(x.prod)}</option>`).join('')}</select></div>`;
  const upp=uppOf(l);
  const sel2=sel+`<div style="align-self:flex-end;padding-bottom:6px">${allCtl}</div>`;
  const head=`<div class="lhead">
    <div><span class="k">Proveedor</span><span class="v">${esc(l.prov)}</span></div><div><span class="k">OC / Código</span><span class="v">${lineLabel(l)}</span></div>
    <div><span class="k">Producto</span><span class="v">${esc(l.prod)}</span></div><div><span class="k">Comprado</span><span class="v">${fmt(l.qty)}</span></div>
    <div><span class="k">Calendarizado</span><span class="v">${fmt(planSum(p))}</span></div><div><span class="k">Pendiente por calendarizar</span><span class="v" style="color:${pend>0?'var(--bad)':'inherit'}">${fmt(pend)}</span></div>
    <div><span class="k">Recibido</span><span class="v">${fmt(recTot(l.k))}</span></div><div><span class="k">Saldo cancelado</span><span class="v">${fmt(p.cancel||0)}</span></div>
    <div><span class="k">Especie · formato</span><span class="v">${esc(l.esp||'–')} · ${esc(l.fmt||'Sin formato')}</span></div>
    <div><span class="k">Almacenamiento</span><span class="v">${unitOf(l.cod)==='pallet'?(upp?fmt(upp)+' u./pallet':'<span class="chip warn">Sin dato</span>'):(uposOf(l.cod,null)?esc(unitLabel(l.cod))+' · '+fmt(uposOf(l.cod,null))+' por posición':'<span class="chip warn">Sin dato</span>')}</span></div>
    <div><span class="k">Estado</span><span class="v">${chipLine(l.st)} ${lineStatus(l,p)}</span></div></div>`;
  const ev=c=>evalC(l,p,c);
  const cellP=(pl,w)=>{
    const act=activeCommits(p).filter(c=>c.pl===pl&&c.wk===w);const mod=(p.commits||[]).filter(c=>c.pl===pl&&c.wk===w&&c.st==='modificada');
    if(!act.length&&!mod.length)return `<button class="cell empty" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}" aria-label="Agregar en ${esc(pl)} ${wLabel(w)}">+</button>`;
    const q=sum(act,c=>c.qty);const meas=act.filter(c=>measureOf(p,c)!=='info');const anyE=act[0]?ev(act[0]):null;
    let cls='c-fut';if(w<CUR){const e=(meas[0]||act[0]);if(e){const ee=ev(e);cls=ee.otif?'c-ok':'c-bad';}else cls='c-info';}else if(w===CUR)cls='c-fut c-cur';
    const pq=sum(act,c=>c.plan);const exq=sum(act,c=>+c.exc||0);const adj=pq-q-exq;
    const tag=(mod.length?`<small>${mod.length} modif.</small>`:(act.some(c=>c.src!=='plan')?`<small>${SRC[act.find(c=>c.src!=='plan').src]}</small>`:''))+(exq>0?`<small title="Exceso no acordado sobre lo comprado: el compromiso evaluado se mantiene en ${fmt(q)}">+${fmt(exq)} exceso</small>`:'')+(act.length&&adj>0?`<small title="Llegó más de lo comprometido y se descontó de semanas siguientes: en el calendario cuenta ${fmt(pq)}">+${fmt(adj)} adelanto</small>`:act.length&&adj<0?`<small title="Parte del faltante se pasó a otra semana: en el calendario cuenta ${fmt(pq)}">${fmt(adj)} recalend.</small>`:'');
    return `<button class="cell ${act.length?cls:'c-info'}" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}">${act.length?fmt(q):'<s>'+fmt(sum(mod,c=>c.qty))+'</s>'}${tag}</button>`;
  };
  const cellR=(pl,w)=>{const r=recAt(l.k,pl,w);return `<button class="cell ${r?'':'empty'}" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}">${r?fmt(r):'·'}</button>`;};
  const cellD=(pl,w)=>{const act=activeCommits(p).filter(c=>c.pl===pl&&c.wk===w);const r=recAt(l.k,pl,w);if(w>CUR||(!act.length&&!r))return '<span class="cell empty">·</span>';const d=r-sum(act,c=>c.qty);if(!act.length&&r)return `<button class="cell pos" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}">+${fmt(r)}<small>sin compromiso</small></button>`;return `<button class="cell ${d<0?'neg':d>0?'pos':''}" data-a="cell" data-k="${esc(l.k)}" data-pl="${esc(pl)}" data-w="${w}">${d>0?'+':''}${fmt(d)}</button>`;};
  const th=`<tr><th class="rowh">Planta</th>${weeks.map(w=>`<th class="wk ${w===CUR?'cur':''}">${wLabel(w)}<span class="dts">${wDates(w)}</span></th>`).join('')}<th>Total</th></tr>`;
  const band=(t)=>`<tr><td class="band" colspan="1">${t}</td><td class="band" colspan="${weeks.length+1}"></td></tr>`;
  const tp=w=>sum(activeCommits(p).filter(c=>c.wk===w&&plMatch(c.pl)),c=>c.plan);const tr=w=>sum(pls,pl=>recAt(l.k,pl,w));
  const rowsP=pls.map(pl=>`<tr><td class="rowh">${esc(pl)}</td>${weeks.map(w=>`<td>${cellP(pl,w)}</td>`).join('')}<td class="num" style="padding:0 8px">${fmt(sum(activeCommits(p).filter(c=>c.pl===pl&&weeks.includes(c.wk)),c=>c.plan))}</td></tr>`).join('');
  const rowsR=pls.map(pl=>`<tr><td class="rowh">${esc(pl)}</td>${weeks.map(w=>`<td>${cellR(pl,w)}</td>`).join('')}<td class="num" style="padding:0 8px">${fmt(sum(weeks,w=>recAt(l.k,pl,w)))}</td></tr>`).join('');
  const rowsD=pls.map(pl=>`<tr><td class="rowh">${esc(pl)}</td>${weeks.map(w=>`<td>${cellD(pl,w)}</td>`).join('')}<td></td></tr>`).join('');
  const out=(p.commits||[]).filter(c=>c.st!=='cancelada'&&(c.wk<S.wFrom||c.wk>S.wTo)).length;
  return `<div style="display:flex;flex-direction:column;gap:14px">
   <div class="row">${sel2}
     <button class="btn pri" data-a="agendar" data-k="${esc(l.k)}" ${S.canWrite&&pend>0&&l.st!=='Cancelada'?'':'disabled'}>Agendar pendiente</button>
     ${!p.confirmed&&activeCommits(p).length?`<button class="btn" data-a="confirm" data-k="${esc(l.k)}" ${S.canWrite?'':'disabled'}>Confirmar calendario acordado</button>`:''}
     ${expressEligible(l,p)?`<button class="btn" data-a="sugList" data-kind="np">Registrar recepciones</button>`:''}
     <button class="btn ghost" data-a="lineHist" data-k="${esc(l.k)}">Historial</button>${nBorr>1?`<button class="btn ghost" data-a="confirmAll" ${S.canWrite?'':'disabled'}>Confirmar los ${nBorr} calendarios en borrador</button>`:''}</div>
   ${head}
   <div class="field"><label for="ln-note">Comentario de la línea</label><input id="ln-note" type="text" data-note="${esc(l.k)}" value="${esc(p.note||'')}" placeholder="Ej.: proveedor confirma despacho parcial por falta de papel" ${S.canWrite?'':'disabled'}></div>
   <div class="legend"><span><i class="sw" style="background:var(--ok-soft)"></i>Cumple OTIF</span><span><i class="sw" style="background:var(--bad-soft)"></i>No cumple</span><span><i class="sw" style="box-shadow:inset 0 0 0 2px var(--warn)"></i>Semana en curso</span><span><s>tachado</s>: compromiso modificado (historial)</span><span>Total: lo que cuenta en el calendario (incluye adelantos recibidos, descuenta faltantes recalendarizados)</span><span>Haz clic en una celda para agendar, modificar, reprogramar o recalendarizar.</span>${out?`<span class="chip">${out} compromisos fuera del rango de semanas</span>`:''}</div>
   <div class="tw"><table class="ag"><thead>${th}</thead><tbody>
     ${band('Planificado')}${rowsP}<tr class="tot"><td class="rowh">Total plan</td>${weeks.map(w=>`<td class="num" style="padding:4px 6px">${tp(w)?fmt(tp(w)):''}</td>`).join('')}<td></td></tr>
     ${band('Real (recepciones)')}${rowsR}<tr class="tot"><td class="rowh">Total real</td>${weeks.map(w=>`<td class="num" style="padding:4px 6px">${tr(w)?fmt(tr(w)):''}</td>`).join('')}<td></td></tr>
     ${band('Diferencia (real − plan)')}${rowsD}
   </tbody></table></div></div>`;
}
/* =========================================================
   Bodegas: KPI de posiciones, evolución y consolidado por planta
   ========================================================= */
const PL_COLORS=['var(--s1)','var(--s2)','var(--s3)','var(--s4)'];
function bodData(){
  const pls=S.cfg.plants.filter(p=>+p.cap>0).map(p=>p.name);
  const w0=S.cfg.wFrom,w1=Math.max(S.cfg.wTo||wAdd(CUR,8),wAdd(CUR,4));
  const weeks=wRange(w0,w1);const occ=occupancy(weeks);
  return {pls,weeks,occ};
}
function bodChart(B){
  const {pls,weeks,occ}=B;if(!pls.length)return '';
  const W=900,H=260,ml=44,mr=96,mt=14,mb=28;const iw=W-ml-mr,ih=H-mt-mb;
  const n=weeks.length;const x=i=>ml+(n<=1?0:i*iw/(n-1));
  let ymax=1;for(const pl of pls)for(const w of weeks){const o=occ[pl]&&occ[pl][w];if(o&&o.pct>ymax)ymax=Math.min(1.5,Math.ceil(o.pct*10)/10);}
  const y=v=>mt+ih-(v/ymax)*ih;const ci=weeks.indexOf(CUR);
  const grid=[0,.25,.5,.75,1].filter(v=>v<=ymax).map(v=>`<line x1="${ml}" x2="${ml+iw}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${ml-6}" y="${y(v)+4}" text-anchor="end" class="ax">${Math.round(v*100)}%</text>`).join('');
  const thr=[[.9,'90%','var(--bad)'],[.75,'75%','var(--warn)']].map(([v,t,c])=>`<line x1="${ml}" x2="${ml+iw}" y1="${y(v)}" y2="${y(v)}" stroke="${c}" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>`).join('');
  const step=Math.max(1,Math.ceil(n/12));
  const xl=weeks.map((w,i)=>i%step===0||i===ci?`<text x="${x(i)}" y="${H-8}" text-anchor="middle" class="ax" ${i===ci?'style="fill:var(--accent);font-weight:700"':''}>${wLabel(w)}</text>`:'').join('');
  const today=ci>=0?`<line x1="${x(ci)}" x2="${x(ci)}" y1="${mt}" y2="${mt+ih}" stroke="var(--accent)" stroke-width="1.5"/><text x="${x(ci)+4}" y="${mt+10}" class="ax" style="fill:var(--accent);font-weight:700">Hoy</text>`:'';
  const ends=pls.map((pl,k)=>{const o=occ[pl][weeks[n-1]];return o?{k,pl,y:y(o.pct),v:o.pct}:null;}).filter(Boolean).sort((a,b)=>a.y-b.y);
  for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<14)ends[i].y=ends[i-1].y+14;
  const endLb=ends.map(e=>`<text x="${x(n-1)+6}" y="${e.y+4}" class="lb">${esc(e.pl)} ${pct(e.v)}</text>`).join('');
  const lines=pls.map((pl,k)=>{const pts=weeks.map((w,i)=>{const o=occ[pl][w];return o?[x(i),y(o.pct)]:null;});
    const past=pts.slice(0,ci+1).filter(Boolean),fut=pts.slice(Math.max(0,ci)).filter(Boolean);const d=a=>a.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join('');
    const last=pts.filter(Boolean).slice(-1)[0];const lo=occ[pl][weeks[n-1]];
    return `<path d="${d(past)}" fill="none" stroke="${PL_COLORS[k%4]}" stroke-width="2" stroke-linejoin="round"/><path d="${d(fut)}" fill="none" stroke="${PL_COLORS[k%4]}" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>
`;}).join('')+endLb;
  const hit=weeks.map((w,i)=>`<rect x="${x(i)-iw/(2*Math.max(1,n-1))}" y="${mt}" width="${iw/Math.max(1,n-1)}" height="${ih}" fill="transparent" data-bw="${w}" data-bx="${x(i)}"/>`).join('');
  // label collision: nudge end labels apart
  return `<div class="bchart" id="bchart"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Ocupación semanal por planta, real y proyectada">${grid}${thr}${today}${lines}<line id="bc-x" x1="0" x2="0" y1="${mt}" y2="${mt+ih}" stroke="var(--muted)" stroke-width="1" opacity="0"/>${hit}${xl}</svg><div class="btip" id="btip" hidden></div></div>`;
}
function bodTip(w,bx){
  const B=S._bod;if(!B)return;const tip=$('#btip'),ln=$('#bc-x');if(!tip)return;
  const rows=B.pls.map((pl,k)=>{const o=B.occ[pl][w];return o?`<div class="r"><i style="background:${PL_COLORS[k%4]}"></i>${esc(pl)}<b>${pct(o.pct)}</b><span class="muted">${fmt(Math.max(0,Math.round(o.cap-o.occ)))} disp.</span></div>`:'';}).join('');
  tip.innerHTML=`<div class="h">${wLabel(w)} · ${wDates(w)}${w>CUR?' · proyectado':w===CUR?' · en curso':''}</div>${rows}`;tip.hidden=false;
  const svg=$('#bchart svg');const sc=svg.getBoundingClientRect().width/900;const left=bx*sc;
  tip.style.left=Math.min(left+12,svg.getBoundingClientRect().width-tip.offsetWidth-4)+'px';ln.setAttribute('x1',bx);ln.setAttribute('x2',bx);ln.setAttribute('opacity','.6');
}
function vBodegas(){
  if(!S.ix.lines.length)return noData();
  const B=bodData();S._bod=B;const {pls,occ}=B;
  if(!pls.length)return `<div class="panel"><div class="panel-b">${emptyState('Sin capacidad configurada','Ingresa la capacidad de cada planta en Configuración → Datos y configuración para calcular la ocupación.')}</div></div>`+`<div class="panel"><div class="panel-h"><h2>Consolidado por planta</h2><span class="spacer"></span>${weekCtl()}</div><div class="panel-b">${agCons()}</div></div>`;
  const at=w=>{let o=0,c=0,inn=0;for(const pl of pls){const x=occ[pl][w];if(x){o+=x.occ;c+=x.cap;inn+=x.inn;}}return {o,c,inn,p:c?o/c:0};};
  const now=at(CUR);const next4=wRange(wAdd(CUR,1),wAdd(CUR,4));const next8=wRange(wAdd(CUR,1),wAdd(CUR,8));
  const risk=[];for(const pl of pls){const ws=next8.filter(w=>occ[pl][w]&&occ[pl][w].pct>=.9);risk.push({pl,first:ws[0],n:ws.length});}
  const inn4=sum(next4,w=>at(w).inn);const out4=sum(next4,w=>sum(pls,pl=>occ[pl][w]?occ[pl][w].out:0));
  const col=v=>v>=.9?'var(--bad)':v>=.75?'var(--warn)':'inherit';
  const prev=at(wAdd(CUR,-4));const d4=now.p-prev.p;
  let tpk=null;for(const w of next4){const a=at(w);if(!tpk||a.p>tpk.p)tpk={w,...a};}
  const ppk=pl=>{let m=null;for(const w of next4){const x=occ[pl][w];if(x&&(!m||x.pct>m.pct))m={w,pct:x.pct};}return m;};
  const sub=rows=>`<div class="tpl">${rows.map(([n,v,c])=>`<div><span>${esc(n)}</span><b style="color:${c||'inherit'}">${v}</b></div>`).join('')}</div>`;
  const nR=risk.filter(r=>r.n).length;
  const tiles=`<div class="tiles">
    <div class="tile lead"><span class="k">Ocupación hoy · ${wLabel(CUR)}</span><span class="v" style="color:${col(now.p)}">${pct(now.p)}</span><span class="s">${fmt(Math.round(now.o))} de ${fmt(now.c)} posiciones · ${d4>=0?'+':''}${(d4*100).toFixed(1).replace('.',',')} pts vs ${wLabel(wAdd(CUR,-4))}</span>
      ${sub(pls.map(pl=>{const x=occ[pl][CUR];return [pl,x?pct(x.pct):'–',x?col(x.pct):''];}))}</div>
    <div class="tile"><span class="k">Disponibles hoy</span><span class="v">${fmt(Math.max(0,Math.round(now.c-now.o)))}</span><span class="s">posiciones libres en total</span>
      ${sub(pls.map(pl=>{const x=occ[pl][CUR];return [pl,x?fmt(Math.max(0,Math.round(x.cap-x.occ))):'–'];}))}</div>
    <div class="tile"><span class="k">Ocupación máxima · próx. 4 sem.</span><span class="v" style="color:${col(tpk.p)}">${pct(tpk.p)}</span><span class="s">total de las plantas, en ${wLabel(tpk.w)}</span>
      ${sub(pls.map(pl=>{const m=ppk(pl);return [pl,m?`${pct(m.pct)} · ${wLabel(m.w)}`:'–',m?col(m.pct):''];}))}</div>
    <div class="tile"><span class="k">Entradas · ${wLabel(next4[0])}–${wLabel(next4[3])}</span><span class="v">${fmt(Math.ceil(inn4))}</span><span class="s">posiciones según calendario · liberación estimada ${fmt(out4)}</span>
      ${sub(pls.map(pl=>[pl,fmt(Math.ceil(sum(next4,w=>occ[pl][w]?occ[pl][w].inn:0)))]))}</div></div>`;
  return tiles+`<div class="panel"><div class="panel-h"><h2>Evolución de la ocupación</h2><p>Ocupación al cierre de cada semana, temporada ${wLabel(S.cfg.wFrom)}–${wLabel(B.weeks[B.weeks.length-1])}. Línea continua: real (recepciones); punteada: proyectada según el calendario. Líneas de referencia en 75% y 90%. Pasa el cursor para ver cada semana.</p></div>
    <div class="panel-b">${bodChart(B)}<div class="legend">${pls.map((pl,k)=>`<span><i class="sw" style="background:${PL_COLORS[k%4]}"></i>${esc(pl)}</span>`).join('')}<span><i class="sw" style="background:none;border-top:2px dashed var(--muted);height:0;border-radius:0"></i>Proyectado</span><span style="color:var(--warn)">- - 75%</span><span style="color:var(--bad)">- - 90%</span></div></div></div>
   <div class="panel"><div class="panel-h"><h2>Consolidado por planta</h2><div class="tabs" style="margin-left:8px">${[['pos','Posiciones'],['palpos','Pallets y posiciones']].map(([k,t])=>`<button data-a="bodMode" data-k="${k}" aria-pressed="${(S.bodMode||'pos')===k}">${t}</button>`).join('')}</div><span class="spacer"></span>${weekCtl()}</div><div class="panel-b">${agCons()}</div></div>`;
}
function agCons(){
  const lines=fLines();const weeks=wRange(S.wFrom,S.wTo);const pls=plantsList();
  const agg={};for(const pl of pls){agg[pl]={};for(const w of weeks)agg[pl][w]={p:0,r:0,n:0,bad:0,ev:0,pp:0,rp:0,pa:0,ra:0,nc:0};}
  const palOf=(l,q)=>{if(unitOf(l.cod)!=='pallet')return 0;const u=uppOf(l);return u?q/u:0;};
  for(const l of lines){const p=planOf(l.k);
    for(const c of activeCommits(p)){if(!agg[c.pl]||!agg[c.pl][c.wk])continue;const a=agg[c.pl][c.wk];a.p+=c.qty;a.n++;const ps=posOf(l,c.pl,c.plan);if(ps==null)a.nc++;else a.pp+=ps;a.pa+=palOf(l,c.plan);const e=evalC(l,p,c);if(e.counts){a.ev++;if(!e.otif)a.bad++;}}
    for(const r of S.ix.recLine.get(l.k)||[]){if(agg[r.pl]&&agg[r.pl][r.wk]){const a=agg[r.pl][r.wk];a.r+=+r.qty;a.rp+=posOf(l,r.pl,+r.qty)||0;a.ra+=palOf(l,+r.qty);}}}
  const pm=S.bodMode||'pos';
  const cellV=(pos,pal)=>`${fmt(Math.ceil(pos-1e-9))}${pm==='palpos'?`<small>${fmt(Math.ceil(pal-1e-9))} pal.</small>`:''}`;
  const occ=occupancy(weeks);
  const th=`<tr><th class="rowh">Planta</th>${weeks.map(w=>`<th class="wk ${w===CUR?'cur':''}">${wLabel(w)}<span class="dts">${wDates(w)}</span></th>`).join('')}</tr>`;
  const next4=wRange(CUR,wAdd(CUR,3));const occ4=occupancy(next4);
  const occCol=v=>v>=.9?'var(--bad)':v>=.75?'var(--warn)':'var(--info)';
  const blocks=pls.filter(pl=>{const pc=S.cfg.plants.find(x=>x.name===pl)||{};return +pc.cap||weeks.some(w=>agg[pl][w].p||agg[pl][w].r);}).map(pl=>{const pc=S.cfg.plants.find(x=>x.name===pl)||{};const cap=+pc.cap||0;
    let mx=null;if(cap&&occ4[pl])for(const w of next4){const o=occ4[pl][w];if(o&&(mx==null||o.pct>mx.pct))mx={pct:o.pct,w};}
    const head=`<tr class="cb-h"><td class="rowh" colspan="1"><span class="cb-name">${esc(pl)}</span></td><td colspan="${weeks.length}" class="cb-meta">${cap?`Capacidad <b>${fmt(cap)}</b> posiciones${mx?` · Máx. próximas 4 semanas: <b style="color:${occCol(mx.pct)}">${pct(mx.pct)}</b> en ${wLabel(mx.w)}`:''}`:'<span class="muted">Sin capacidad configurada: la ocupación no se calcula</span>'}</td></tr>`;
    const plan=`<tr><td class="rowh cb-l">Plan<div style="font-size:11px">${pm==='palpos'?'posiciones · pallets':'posiciones'}</div></td>${weeks.map(w=>{const a=agg[pl][w];return `<td class="${w===CUR?'cb-cur':''}">${a.p||a.r?`<button class="cell cb-n" data-a="consCell" data-pl="${esc(pl)}" data-w="${w}" title="${fmt(a.p)} unidades${a.nc?' · '+a.nc+' línea(s) sin ficha: no convertidas':''}">${a.p?cellV(a.pp,a.pa):'<span class="muted">–</span>'}</button>`:'<span class="cell empty">·</span>'}</td>`;}).join('')}</tr>`;
    const real=`<tr><td class="rowh cb-l">Real<div style="font-size:11px">${pm==='palpos'?'posiciones · pallets':'posiciones'}</div></td>${weeks.map(w=>{const a=agg[pl][w];if(w>CUR||(!a.r&&!a.p))return `<td class="${w===CUR?'cb-cur':''}"><span class="cell empty">·</span></td>`;
      const bad=w<CUR&&a.bad>0;return `<td class="${w===CUR?'cb-cur':''}"><button class="cell cb-n ${bad?'cb-bad':''}" data-a="consCell" data-pl="${esc(pl)}" data-w="${w}" title="${fmt(a.r)} unidades${a.ev?' · '+(a.ev-a.bad)+' de '+a.ev+' compromisos cumplieron':''}">${a.r?cellV(a.rp,a.ra):'0'}${bad?`<small>${a.bad} no cumple${a.bad>1?'n':''}</small>`:w===CUR?'<small>en curso</small>':''}</button></td>`;}).join('')}</tr>`;
    const oc=!cap?'':`<tr class="cb-o"><td class="rowh cb-l"><b>Ocupación</b></td>${weeks.map(w=>{const o=occ[pl]&&occ[pl][w];if(!o||!o.cap)return '<td><span class="cell empty">·</span></td>';const v=Math.min(1,o.pct);
      return `<td class="${w===CUR?'cb-cur':''}"><button class="cell cb-occ" data-a="posDet" data-pl="${esc(pl)}" data-w="${w}" title="${fmt(Math.round(o.occ))} ocupadas de ${fmt(o.cap)} · clic para ver entradas y consumo"><span class="cb-pct" style="color:${o.pct>=.75?occCol(o.pct):'var(--ink)'}">${pct(o.pct)}</span><span class="cb-bar"><i style="width:${(v*100).toFixed(1)}%;background:${occCol(o.pct)}"></i></span><small>${fmt(Math.max(0,Math.round(o.cap-o.occ)))} disp.</small></button></td>`;}).join('')}</tr>`;
    return `<tbody class="cb">${head}${plan}${real}${oc}</tbody>`;}).join('');
  return `<div style="display:flex;flex-direction:column;gap:10px">
   <div class="tw"><table class="ag cons"><thead>${th}</thead>${blocks}</table></div>
   <p class="hint" style="margin:0"><b>Plan / Real</b>: ${pm==='palpos'?'posiciones y pallets':'posiciones'} que entran a la planta (unidades convertidas con el Maestro de productos; pasa el cursor para ver las unidades). Real en <b style="color:var(--bad)">rojo</b>: al menos un compromiso de la semana no cumplió.</p><div class="legend">
    <span><b>Ocupación</b> (total de la planta, al cierre de la semana): <i class="sw" style="background:var(--info)"></i>bajo 75% <i class="sw" style="background:var(--warn)"></i>75%–90% <i class="sw" style="background:var(--bad)"></i>sobre 90%</span>
    <span>Haz clic en una celda para ver el detalle.</span></div></div>`;
}

/* =========================================================
   Drawers (acciones)
   ========================================================= */
let D=null; // estado del drawer
function openDrawer(d){D=d;drawRender();}
function closeDrawer(){D=null;$('#layer').innerHTML='';}
function drawRender(){
  if(!D){$('#layer').innerHTML='';return;}
  const fn={cell:dCell,agendar:dAgendar,modify:dModify,recal:dRecal,adel:dAdel,saldo:dSaldo,cons:dCons,hist:dHist,map:dMap,resp:dResp,confirmClear:dConfirmClear,exlist:dExList,bulk:dBulk,exceso:dExceso,anular:dAnular,pos:dPos,sug:dSug,mail:dMail,prod:dProd,cal:dCal}[D.type];
  const r=fn();
  const focusId=document.activeElement&&document.activeElement.id;
  $('#layer').innerHTML=`<div class="scrim" data-a="close"></div><div class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title"><div class="drawer-h"><h2 id="dr-title">${r.title}${r.sub?`<span class="sub">${r.sub}</span>`:''}</h2><button class="xbtn" data-a="close" aria-label="Cerrar">✕</button></div><div class="drawer-b">${r.body}</div>${r.foot?`<div class="drawer-f">${r.foot}</div>`:''}</div>`;
  if(focusId&&document.getElementById(focusId))document.getElementById(focusId).focus();
}
function wkOptions(sel,from){const ws=wRange(from||wAdd(CUR,-12),wAdd(S.cfg.wTo,10));if(sel&&!ws.includes(sel))ws.unshift(sel);return ws.map(w=>`<option value="${w}" ${w===sel?'selected':''}>${wLabel(w)} · ${wDates(w)}${w===CUR?' (actual)':''}</option>`).join('');}
function plOptions(sel){const s=new Set(S.cfg.plants.map(p=>p.name));for(const p of S.ix.plants)s.add(p);return [...s].map(p=>`<option ${p===sel?'selected':''}>${esc(p)}</option>`).join('');}
function rowsEditor(rows,avail,label){
  const tot=sum(rows,r=>+r.qty||0);const over=avail!=null&&tot>avail;
  return `<div class="rows-ed" id="rows-ed"><div class="re lbl"><span>Semana</span><span>Planta</span><span>Cantidad</span><span></span></div>
   ${rows.map((r,i)=>`<div class="re"><select id="re-w-${i}" data-re="wk" data-i="${i}" aria-label="Semana fila ${i+1}">${wkOptions(r.wk)}</select><select id="re-p-${i}" data-re="pl" data-i="${i}" aria-label="Planta fila ${i+1}">${plOptions(r.pl)}</select><input id="re-q-${i}" type="number" min="0" step="1" inputmode="numeric" data-re="qty" data-i="${i}" value="${r.qty||''}" aria-label="Cantidad fila ${i+1}"><button class="xbtn" data-a="reDel" data-i="${i}" aria-label="Quitar fila">✕</button></div>`).join('')}
   <div class="row"><button class="btn sm" data-a="reAdd">+ Agregar semana</button>${avail!=null?`<button class="btn ghost sm" data-a="reFill">Completar con lo disponible</button>`:''}</div>
   <div class="sumline ${over?'err':''}" id="re-sum"><span>${label||'Total'}: <b>${fmt(tot)}</b></span>${avail!=null?`<span>Disponible: <b>${fmt(avail)}</b>${over?' · supera lo disponible':''}</span>`:''}</div></div>`;
}
function respFields(req){
  return `<div class="fgrid"><div class="field"><label for="d-resp">Responsable del cambio${req?' *':''}</label><select id="d-resp" data-d="resp"><option value="">Selecciona…</option>${S.cfg.resp.map(r=>`<option ${D.resp===r.name?'selected':''} value="${esc(r.name)}">${esc(r.name)}${r.pen?' (penaliza)':''}</option>`).join('')}</select></div>
   <div class="field"><label for="d-mot">Motivo${req?' *':''}</label><select id="d-mot" data-d="mot"><option value="">Selecciona…</option>${S.cfg.motivos.map(m=>`<option ${D.mot===m?'selected':''}>${esc(m)}</option>`).join('')}</select></div></div>
   <div class="field"><label for="d-com">Comentario (opcional)</label><input id="d-com" type="text" data-d="com" value="${esc(D.com||'')}" placeholder="Detalle del acuerdo, correo, persona que informó…"></div>`;
}
function motText(){return [D.mot,D.com].filter(Boolean).join(' — ');}
function errBox(){return D.err?`<div class="err-msg" role="alert">${esc(D.err)}</div>`:'';}
function commitBox(l,p,c){
  const e=evalC(l,p,c);const r=e.r;const lk=isLocked(l,p,c);
  const par=c.parent?(p.commits||[]).find(x=>x.id===c.parent):null;
  const canRecal=isActive(c)&&c.wk<CUR&&c.plan>r&&l.st==='Abierta';
  const futs=activeCommits(p).filter(x=>x.wk>c.wk&&x.id!==c.id);
  const canAdel=isActive(c)&&c.wk<=CUR&&r>c.plan&&futs.length;
  return `<div class="box ${isActive(c)?'':'muted'}">
   <div class="row"><b style="font-size:15px;font-variant-numeric:tabular-nums">${isActive(c)?fmt(c.qty):'<s>'+fmt(c.qty)+'</s>'}</b><span class="chip kr">${SRC[c.src]||c.src}</span>${c.st==='modificada'?'<span class="chip">Modificado</span>':''}${c.st==='cancelada'?'<span class="chip">Cancelado</span>':''}${measChip(e.m)}${statusChip(e)}<span class="spacer"></span>${e.phase==='past'?`OT ${bin(e.ot)} IF ${bin(e.inf)} OTIF ${bin(e.otif)}`:e.phase==='cur'?'<span class="muted" style="font-size:12px">OT · IF · OTIF en curso hasta el cierre de la semana</span>':''}</div>
   <div class="kv"><span>Recibido en la semana <b>${fmt(r)}</b></span><span>Diferencia <b>${fmt(r-c.qty)}</b></span>${c.plan!==c.qty&&isActive(c)?`<span>Cuenta en plan <b>${fmt(c.plan)}</b></span>`:''}${c.recal?`<span>Faltante recalendarizado <b>${fmt(c.recal)}</b></span>`:''}${c.manual!=null?`<span>Resultado manual <b>${c.manual==='nm'?'No se mide':c.manual}</b></span>`:''}<span>Creado ${fdt(c.at)} por ${esc(uname(c.by))}</span>${lk&&isActive(c)?'<span>Cambios requieren responsable y motivo</span>':''}</div>
   ${c.st==='modificada'?`<div class="kv"><span>Responsable <b>${esc(c.resp)}</b></span><span>Motivo <b>${esc(c.mot)}</b></span><span>Impacto <b>${esc(c.imp||'')}</b></span><button class="btn ghost sm" data-a="dResp" data-cid="${c.id}" ${S.canWrite?'':'disabled'}>Cambiar responsable</button></div>`:''}
   ${par?`<div class="kv"><span>Viene de ${wLabel(par.wk)} · ${esc(par.pl)} (${esc(par.resp||SRC[c.src]||'')})</span></div>`:''}
   ${isActive(c)?`<div class="row">${l.st!=='Cancelada'?`<button class="btn sm" data-a="dModify" data-cid="${c.id}" ${S.canWrite?'':'disabled'}>Modificar o reprogramar</button>`:''}${canRecal?`<button class="btn sm pri" data-a="dRecal" data-cid="${c.id}" ${S.canWrite?'':'disabled'}>Recalendarizar faltante (${fmt(c.plan-r)})</button>`:''}${canAdel?`<button class="btn sm" data-a="dAdel" data-cid="${c.id}" ${S.canWrite?'':'disabled'}>Descontar adelanto (${fmt(r-c.plan)})</button>`:''}${canAnular(l,p,c)?`<span class="spacer"></span><button class="btn ghost sm" data-a="dAnular" data-cid="${c.id}" ${S.canWrite?'':'disabled'}>Anular (error de ingreso)</button>`:''}</div>`:''}
  </div>`;
}
function dCell(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const cs=(p.commits||[]).filter(c=>c.pl===D.pl&&c.wk===D.w).sort((a,b)=>(isActive(b)-isActive(a))||(a.at<b.at?-1:1));
  const r=recAt(l.k,D.pl,D.w);const pend=pendingOf(l,p);const hasAct=cs.some(isActive);
  const near=!r&&D.w<=CUR?nearestRecWeek(l,D.pl,D.w):null;
  const recRows=(S.ix.recLine.get(l.k)||[]).filter(x=>x.pl===D.pl&&x.wk===D.w);
  const canAdd=S.canWrite&&l.st!=='Cancelada'&&pend>0&&!hasAct;
  return {title:`${esc(D.pl)} · ${wLabel(D.w)}`,sub:`${wDates(D.w)} · ${esc(l.prov)} · OC ${esc(l.oc)} · ${esc(l.cod)} ${esc(l.prod)}`,
   body:`${D.pick?`<div class="field" style="max-width:220px"><label for="d-pl">Planta</label><select id="d-pl" data-d="pl">${[...new Set([...plantsList(),D.pl])].map(x=>`<option ${x===D.pl?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`:''}${cs.length?`<h3>Compromisos en esta semana y planta</h3>${cs.map(c=>commitBox(l,p,c)).join('')}`:`<p class="hint">No hay compromisos en esta semana y planta.</p>`}
    ${D.w>=CUR?'':`<div class="box"><h3>Recepciones</h3><div class="kv"><span>Recibido <b>${fmt(r)}</b></span>${recRows.length?`<span>${recRows.reduce((s,x)=>s+(x.n||1),0)} recepción(es)</span>`:''}${near?`<span>Recepción más cercana en esta planta: <b>${wLabel(near.wk)}</b> (${near.d>0?'+':''}${near.d} sem.)</span>`:''}</div></div>`}
    ${!hasAct&&l.st!=='Cancelada'&&D.w<CUR?`<p class="hint">${wLabel(D.w)} ya cerró: no se pueden agregar compromisos en semanas pasadas. Si llegó una entrega sin calendario, se registra como recepción no planificada.</p>`:''}
    ${!hasAct&&l.st!=='Cancelada'&&D.w>=CUR?`<div class="box sel"><h3>Agregar compromiso</h3>
      <div class="fgrid"><div class="field"><label for="d-qty">Cantidad</label><input id="d-qty" type="number" min="0" inputmode="numeric" data-d="qty" value="${D.qty??''}"><small>Pendiente por calendarizar: ${fmt(pend)}</small></div></div>
      ${(p.confirmed||D.w<=CUR||lineClosed(l))?`<p class="hint">El calendario de esta línea ya está confirmado o la semana ya comenzó: este compromiso quedará registrado como nuevo en el historial.</p>`:''}
      ${errBox()}<div class="row"><button class="btn pri" data-a="cellAdd" ${canAdd?'':'disabled'}>Agregar ${D.qty?fmt(D.qty):''}</button></div></div>`:errBox()}`};
}
function dAgendar(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const pend=pendingOf(l,p);
  return {title:'Agendar compromisos',sub:`${esc(l.prov)} · OC ${esc(l.oc)} · ${esc(l.cod)} ${esc(l.prod)}`,
   body:`<div class="kv"><span>Comprado <b>${fmt(l.qty)}</b></span><span>Calendarizado <b>${fmt(planSum(p))}</b></span><span>Pendiente <b>${fmt(pend)}</b></span><span>Almacén OC <b>${esc(l.alm||'–')}</b></span></div>
    <p class="hint">Ingresa las semanas acordadas con el proveedor (no necesitan ser consecutivas), con la planta de cada fila. Si ya existe un compromiso en la misma semana y planta, la cantidad se suma.</p>
    ${rowsEditor(D.rows,pend)}${errBox()}`,
   foot:`<button class="btn" data-a="back">Cancelar</button><button class="btn pri" data-a="doAgendar">Guardar compromisos</button>`};
}
function dModify(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const c=p.commits.find(x=>x.id===D.cid);const lk=isLocked(l,p,c);
  const movedQ=sum(D.rows,r=>+r.qty||0);if(D.nqAuto!==false)D.newQty=Math.max(0,c.plan-movedQ);
  const avail=c.plan+pendingOf(l,p);const tot=(+D.newQty||0)+movedQ;
  const moves=D.rows.filter(r=>+r.qty>0);const imp=moves.length?(tot!==c.plan?'OT + IF':'OT'):((+D.newQty||0)!==c.plan?'IF':'—');
  const pen=D.resp?respPen(D.resp):null;
  return {title:'Modificar o reprogramar',sub:`${esc(c.pl)} · ${wLabel(c.wk)} · ${esc(l.prov)} · OC ${esc(l.oc)} · ${esc(l.cod)}`,
   body:`<div class="kv"><span>Compromiso actual <b>${fmt(c.qty)}</b></span><span>Recibido <b>${fmt(recAt(l.k,c.pl,c.wk))}</b></span><span>Disponible para redistribuir <b>${fmt(avail)}</b></span></div>
    <div class="field"><label for="d-nq">Nueva cantidad en ${wLabel(c.wk)} · ${esc(c.pl)}</label><input id="d-nq" type="number" min="0" inputmode="numeric" data-d="newQty" value="${D.newQty??''}"><small>Se descuenta sola lo que muevas a otras semanas; puedes cambiarla.</small></div>
    <div><h3 style="margin-bottom:6px">Mover a otras semanas o plantas (opcional)</h3>${rowsEditor(D.rows,Math.max(0,avail-(+D.newQty||0)),'Movido')}</div>
    <div class="sumline ${tot>c.plan?'err':''}"><span>Queda en ${wLabel(c.wk)}: <b>${fmt(+D.newQty||0)}</b></span><span>Se mueve: <b>${fmt(movedQ)}</b></span><span>Total: <b>${fmt(tot)}</b> (antes ${fmt(c.plan)})${tot>c.plan?` · aumenta ${fmt(tot-c.plan)}, que se toma de lo pendiente por calendarizar`:tot<c.plan?` · baja ${fmt(c.plan-tot)}, que vuelve a quedar pendiente`:''}</span></div>
    ${lk?`<div class="box"><h3>Trazabilidad</h3><p class="hint" style="margin:0">${wDiff(CUR,c.wk)<2?'Sugerido: <b>Proveedor</b>, porque el cambio se informa con menos de 2 semanas de aviso.':'El cambio se informa con 2 o más semanas de aviso: se sugiere un responsable interno (no penaliza).'} Puedes elegir otro.</p>${respFields(true)}
      <div class="kv"><span>Impacta <b>${imp}</b></span>${pen===null?'':pen?'<span><b style="color:var(--accent)">El compromiso original se evalúa y penaliza al proveedor.</b> Lo reprogramado se mide como compromiso nuevo.</span>':'<span><b style="color:var(--info)">El compromiso original queda como informativo (no penaliza).</b> Lo reprogramado se mide normalmente.</span>'}</div></div>`
     :`<p class="hint">El calendario aún está en borrador: el cambio se aplica directo y queda registrado en el historial como ajuste.</p>`}
    ${errBox()}`,
   foot:`<button class="btn" data-a="back">Volver</button><button class="btn pri" data-a="doModify">Guardar cambio</button>`};
}
function dExceso(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const e=recTot(l.k)-(+l.qty||0)-(+p.excess||0);const c=excesoTarget(l,p);
  if(!c||!(e>0))return {title:'Exceso recepcionado',body:'<p class="hint">No hay exceso por registrar en esta línea.</p>',foot:`<button class="btn" data-a="back">Volver</button>`};
  const r=recAt(l.k,c.pl,c.wk);const pen=respPen(D.resp);const tu=+S.cfg.tolUnder||0,to=+S.cfg.tolOver||0;
  const inT=q=>r>=q*(1-tu)-1e-6&&r<=q*(1+to)+1e-6;
  return {title:'Registrar exceso recepcionado',sub:`${esc(l.prov)} · OC ${esc(l.oc)} · ${esc(l.cod)} · ${esc(l.prod)}`,
   body:`<div class="kv"><span>Comprado <b>${fmt(l.qty)}</b></span><span>Recibido <b>${fmt(recTot(l.k))}</b></span><span>Exceso <b style="color:var(--info)">+${fmt(e)}</b></span><span>Semana del exceso <b>${wLabel(c.wk)} · ${esc(c.pl)}</b>: comprometido ${fmt(c.qty)}, recibido ${fmt(r)}</span></div>
    <div class="box"><h3>¿Quién es responsable del exceso?</h3>${respFields(!pen)}
     <p class="hint" style="margin:0">${pen?`<b>Penaliza:</b> el compromiso de ${wLabel(c.wk)} se mantiene en ${fmt(c.qty)} y la sobreentrega se mide contra la tolerancia (+${Math.round(to*100)}%). Resultado In Full de esa semana: <b>${inT(c.qty)?'cumple':'no cumple'}</b>.`:`<b>No penaliza:</b> exceso acordado o solicitado por C&L. El compromiso de ${wLabel(c.wk)} sube a ${fmt(c.qty+e)}. Resultado In Full de esa semana: <b>${inT(c.qty+e)?'cumple':'no cumple'}</b>. Requiere motivo.`}</p></div>
    <p class="hint">En ambos casos la línea queda cuadrada: lo calendarizado pasa a coincidir con lo recibido y queda en el historial.</p>${errBox()}`,
   foot:`<button class="btn" data-a="back">Cancelar</button><button class="btn pri" data-a="doExceso" ${S.canWrite?'':'disabled'}>Registrar exceso</button>`};
}
function dAnular(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const c=p.commits.find(x=>x.id===D.cid);if(!c)return {title:'Anular compromiso',body:'<p class="hint">El compromiso ya no existe.</p>',foot:`<button class="btn" data-a="back">Volver</button>`};
  return {title:'Anular por error de ingreso',sub:`${esc(c.pl)} · ${wLabel(c.wk)} · ${esc(l.prov)} · OC ${esc(l.oc)} · ${esc(l.cod)}`,
   body:`<div class="kv"><span>Compromiso <b>${fmt(c.qty)}</b></span><span>Recibido <b>0</b></span></div>
    <p class="hint">Úsalo solo si el compromiso se ingresó por error (semana, planta o cantidad equivocada). El compromiso desaparece del calendario, no se mide en el OTIF y no cuenta en "Cambios al plan confirmado". Los ${fmt(c.qty)} vuelven a quedar pendientes por calendarizar. Queda registrado en el historial con tu usuario y la fecha.</p>
    <p class="hint">Si fue un cambio acordado con el proveedor, usa "Modificar o reprogramar" para que quede con responsable y motivo.</p>${errBox()}`,
   foot:`<button class="btn" data-a="back">Volver</button><button class="btn danger" data-a="doAnular">Anular compromiso</button>`};
}
function dRecal(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const c=p.commits.find(x=>x.id===D.cid);const r=recAt(l.k,c.pl,c.wk);const falt=Math.max(0,c.plan-r);
  return {title:'Recalendarizar faltante',sub:`${esc(c.pl)} · ${wLabel(c.wk)} · OC ${esc(l.oc)} · ${esc(l.cod)} ${esc(l.prod)}`,
   body:`<div class="kv"><span>Comprometido <b>${fmt(c.qty)}</b></span><span>Recibido <b>${fmt(r)}</b></span><span>Faltante <b>${fmt(falt)}</b></span></div>
    <p class="hint">El compromiso original y su resultado (OT ${evalC(l,p,c).ot} · IF ${evalC(l,p,c).inf}) se mantienen. El faltante se agenda como compromisos nuevos; si ya existe uno en la misma semana y planta, se suma.</p>
    ${rowsEditor(D.rows,falt,'Recalendarizado')}${errBox()}`,
   foot:`<button class="btn" data-a="back">Volver</button><button class="btn pri" data-a="doRecal">Recalendarizar</button>`};
}
function dAdel(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const c=p.commits.find(x=>x.id===D.cid);const r=recAt(l.k,c.pl,c.wk);const exc=r-c.plan;
  const futs=activeCommits(p).filter(x=>x.wk>c.wk).sort((a,b)=>a.wk-b.wk);
  return {title:'Descontar adelanto',sub:`${esc(c.pl)} · ${wLabel(c.wk)} · OC ${esc(l.oc)} · ${esc(l.cod)}`,
   body:`<div class="kv"><span>Comprometido <b>${fmt(c.qty)}</b></span><span>Recibido <b>${fmt(r)}</b></span><span>Adelanto <b>${fmt(exc)}</b></span></div>
   <p class="hint">Llegó más de lo comprometido en esta semana. Descuenta la diferencia de los compromisos siguientes para que el calendario no supere lo comprado. El resultado de esta semana no cambia.</p>
   <p class="hint">Se sugiere la siguiente semana con entrega. Puedes elegir otra semana calendarizada de este producto, o repartir el descuento entre varias.</p>
   <div class="rows-ed"><div class="re lbl" style="grid-template-columns:minmax(0,2.4fr) minmax(0,1fr) 30px"><span>Descontar de</span><span>Cantidad</span><span></span></div>
   ${D.arows.map((a,i)=>`<div class="re" style="grid-template-columns:minmax(0,2.4fr) minmax(0,1fr) 30px"><select id="adw-${i}" data-adw="${i}" aria-label="Semana a descontar ${i+1}">${futs.map((f,j)=>`<option value="${f.id}" ${f.id===a.cid?'selected':''}>${wLabel(f.wk)} · ${esc(f.pl)} · ${fmt(f.plan)} u.${j===0?' (sugerida)':''}</option>`).join('')}</select><input id="adq-${i}" type="number" min="0" inputmode="numeric" data-adq="${i}" value="${a.qty||''}" aria-label="Cantidad a descontar ${i+1}"><button class="xbtn" data-a="adDel" data-i="${i}" aria-label="Quitar fila">✕</button></div>`).join('')}
   ${futs.length>D.arows.length?`<div class="row"><button class="btn sm" data-a="adAdd">+ Descontar también de otra semana</button></div>`:''}</div>
   <div class="sumline ${sum(D.arows,a=>+a.qty||0)>exc?'err':''}" id="ad-sum"><span>Total a descontar <b>${fmt(sum(D.arows,a=>+a.qty||0))}</b></span><span>Adelanto <b>${fmt(exc)}</b></span></div>${errBox()}`,
   foot:`<button class="btn" data-a="back">Volver</button><button class="btn pri" data-a="doAdel">Descontar</button>`};
}
function dSaldo(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const max=Math.max(0,(+l.qty||0)-(+p.cancel||0)-recTot(l.k));
  const pv=previewSaldo(l.k,+D.qty||0);
  return {title:'Registrar saldo cancelado',sub:`${esc(l.prov)} · OC ${esc(l.oc)} · ${esc(l.cod)} ${esc(l.prod)}`,
   body:`<div class="kv"><span>Comprado <b>${fmt(l.qty)}</b></span><span>Recibido <b>${fmt(recTot(l.k))}</b></span><span>Saldo cancelado previo <b>${fmt(p.cancel||0)}</b></span><span>Máximo a cancelar <b>${fmt(max)}</b></span></div>
   <p class="hint">La cantidad cancelada deja de ser exigible al proveedor y no penaliza su OTIF. Se descuenta primero lo no calendarizado y luego desde la última semana hacia atrás (LIFO).</p>
   <div class="field"><label for="d-sq">Cantidad cancelada</label><input id="d-sq" type="number" min="0" inputmode="numeric" data-d="qty" value="${D.qty??''}"></div>
   ${respFields(false)}
   ${+D.qty>0?`<div><h3 style="margin-bottom:6px">Vista previa del ajuste</h3><div class="tw"><table><thead><tr><th>Compromiso</th><th class="num">Antes</th><th class="num">Después</th></tr></thead><tbody>
     ${pv.steps.map(s=>s.unsched?`<tr><td>Pendiente sin calendarizar</td><td class="num">${fmt(pendingOf(l,p))}</td><td class="num">${fmt(pendingOf(l,p)-s.qty)}</td></tr>`:`<tr><td>${wLabel(s.wk)} · ${esc(s.pl)}</td><td class="num">${fmt(s.before)}</td><td class="num"><b>${fmt(s.after)}</b></td></tr>`).join('')}
     ${pv.rest>0?`<tr><td colspan="3" class="err-msg">No alcanza: faltan ${fmt(pv.rest)} por descontar.</td></tr>`:''}</tbody></table></div></div>`:''}
   ${errBox()}`,
   foot:`<button class="btn" data-a="back">Cancelar</button><button class="btn pri" data-a="doSaldo">Registrar saldo cancelado</button>`};
}
function dResp(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);const c=p.commits.find(x=>x.id===D.cid);
  return {title:'Cambiar responsable',sub:`${esc(c.pl)} · ${wLabel(c.wk)} · OC ${esc(l.oc)} · ${esc(l.cod)}`,
   body:`<p class="hint">Al cambiar el responsable se recalcula la medición del compromiso original: si el responsable penaliza, se evalúa contra el proveedor; si no, queda como informativo.</p>
   <div class="field"><label for="d-resp">Responsable</label><select id="d-resp" data-d="resp">${S.cfg.resp.map(r=>`<option ${D.resp===r.name?'selected':''} value="${esc(r.name)}">${esc(r.name)}${r.pen?' (penaliza)':''}</option>`).join('')}</select></div>${errBox()}`,
   foot:`<button class="btn" data-a="back">Volver</button><button class="btn pri" data-a="doResp">Guardar</button>`};
}
function dCons(){
  const rows=[];for(const l of fLines()){const p=planOf(l.k);for(const c of activeCommits(p))if(c.pl===D.pl&&c.wk===D.w)rows.push({l,p,c,e:evalC(l,p,c)});
    const r=recAt(l.k,D.pl,D.w);if(r&&!activeCommits(p).some(c=>c.pl===D.pl&&c.wk===D.w))rows.push({l,p,c:null,r});}
  return {title:`${esc(D.pl)} · ${wLabel(D.w)}`,sub:wDates(D.w),body:`<div class="tw"><table><thead><tr><th>Proveedor / línea</th><th class="num">Plan</th><th class="num">Real</th><th>Estado</th><th></th></tr></thead><tbody>
   ${rows.map(x=>{const rq=x.c?x.e.r:x.r;const ps=q=>{const v=posOf(x.l,D.pl,q);return v==null?'<small class="muted">sin ficha</small>':`<small class="muted">${fmt(Math.ceil(v-1e-9))} pos.</small>`;};return `<tr><td class="wrap">${esc(x.l.prov)}<div class="muted">${lineLabel(x.l)} · ${esc(x.l.prod)}</div></td><td class="num">${x.c?`${fmt(x.c.qty)}<div>${ps(x.c.plan)}</div>`:'–'}</td><td class="num">${fmt(rq)}${rq?`<div>${ps(rq)}</div>`:''}</td><td>${x.c?statusChip(x.e)+' '+measChip(x.e.m):'<span class="chip warn">Sin compromiso</span>'}</td><td><button class="btn ghost sm" data-a="openLine" data-k="${esc(x.l.k)}">Abrir</button></td></tr>`;}).join('')}
   </tbody></table></div>`};
}
function dHist(){
  const l=S.ix.byK[D.k];const p=planOf(l.k);
  return {title:'Historial de la línea',sub:`${esc(l.prov)} · OC ${esc(l.oc)} · ${esc(l.cod)} ${esc(l.prod)}`,body:histTable((p.log||[]).map(e=>({e,l})).reverse(),true)};
}
function dExList(){
  const T={falt:['Faltantes por recalendarizar','Semanas cerradas donde llegó menos de lo comprometido.'],adel:['Adelantos por descontar','Semanas donde llegó más de lo comprometido y quedan compromisos posteriores.'],nopal:['Insumos sin unidades por pallet','Agrégalos al mantenedor para convertirlos a pallets y posiciones.']}[D.kind];
  return {title:T[0],sub:T[1],body:vExcepcionesBody(exceptions(),D.kind)+(D.kind==='nopal'?`<div class="row"><button class="btn" data-a="go" data-v="datos">Ir a cargar el mantenedor</button></div>`:'')};
}
function dMail(){
  const gen=D.which==='gen';const M=gen?mailGeneral():mailProv(S.rProv);const to=S.cfg.email||'';const mailto=`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(M.subj)}&body=${encodeURIComponent(M.body.length>1800?M.body.slice(0,1800)+'\n…':M.body)}`;
  return {title:'Texto del correo',sub:gen?'Resumen general de todos los proveedores':'Resumen de la reunión con '+esc(S.rProv),
   body:`<div class="tabs"><button data-a="mMail" data-w="prov" aria-pressed="${!gen}">Este proveedor</button><button data-a="mMail" data-w="gen" aria-pressed="${gen}">Resumen general</button></div>
    <div class="field"><label for="m-to">Para</label><input id="m-to" type="text" data-cfg="email" value="${esc(to)}"></div>
    <div class="field"><label for="m-subj">Asunto</label><input id="m-subj" type="text" readonly value="${esc(M.subj)}"></div>
    <div class="field"><label for="m-body">Cuerpo</label><textarea id="m-body" rows="18" readonly style="font-family:var(--f-mono);font-size:12px">${esc(M.body)}</textarea></div>
    <p class="hint">Si el botón de correo no abre tu programa, usa Copiar y pégalo en un correo nuevo. Adjunta el PDF descargado.</p>`,
   foot:`<a class="btn" href="${esc(mailto)}" target="_blank" rel="noopener">Abrir en mi correo</a><button class="btn pri" data-a="copyMail">Copiar asunto y cuerpo</button>`};
}
function dConfirmClear(){
  return {title:D.example?'Quitar datos de ejemplo':'Borrar todos los datos',body:`<p>${D.example?'Se eliminarán las órdenes, recepciones, compromisos e historial de ejemplo. Se conserva la configuración (las plantas vuelven a la configuración inicial) y el mantenedor de unidades por pallet.':'Se eliminarán órdenes, recepciones, compromisos e historial guardados en este navegador. Esta acción no se puede deshacer.'}</p>${errBox()}`,
   foot:`<button class="btn" data-a="close">Cancelar</button><button class="btn danger" data-a="doClear">${D.example?'Quitar ejemplo':'Borrar todo'}</button>`};
}

/* =========================================================
   Recepciones no planificadas (une Agendamiento express + Excepciones)
   ========================================================= */
const NP_MOT_DEF=['SPOT/URGENTE','ERROR RECEPCIÓN BODEGA','CALENDARIO NO ACTUALIZADO','ERROR DE PROVEEDOR'];
const npMotivos=()=>[...new Set([...NP_MOT_DEF,...(S.cfg.npMotivos||[])])];
function expressEligible(l,p){
  if(l.st==='Cancelada')return false;
  const recs=S.ix.recLine.get(l.k);if(!recs||!recs.length)return false;
  if((p.commits||[]).some(c=>c.st!=='cancelada'&&c.src!=='express'))return false;
  const reg=new Set((p.commits||[]).filter(c=>c.st!=='cancelada').map(c=>c.pl+'|'+c.wk));
  const g=new Map();for(const r of recs){const key=r.pl+'|'+r.wk;g.set(key,(g.get(key)||0)+(+r.qty));}
  for(const [key,q] of g)if(q>0&&!reg.has(key))return true;return false;
}
/* recepciones de líneas sin calendario, agrupadas por semana y planta */
const hasPlanCal=p=>(p.commits||[]).some(c=>c.st!=='cancelada'&&c.src!=='express');
function sinCalGroups(){
  const out=[];
  for(const l of fLines()){const p=planOf(l.k);if(l.st==='Cancelada'||hasPlanCal(p))continue;const reg=new Set((p.commits||[]).filter(c=>c.st!=='cancelada').map(c=>c.pl+'|'+c.wk));
    const g=new Map();for(const r of S.ix.recLine.get(l.k)||[]){if(!plMatch(r.pl)||!wkMatch(r.wk))continue;const key=r.pl+'|'+r.wk;const o=g.get(key)||{l,p,pl:r.pl,wk:r.wk,qty:0,n:0};o.qty+=+r.qty;o.n+=(r.n||1);g.set(key,o);}
    for(const [key,o] of g)if(o.qty>0&&!reg.has(key))out.push({...o,key:l.k+'|'+o.pl+'|'+o.wk});}
  return out.sort((a,b)=>a.l.prov.localeCompare(b.l.prov)||b.wk-a.wk);
}
function npState(key){const s=S.tab.np=S.tab.np||{};if(s[key])return s[key];const [k,pl,wk]=key.split('|');const g=npSuggest(k,pl,+wk);return (s[key]={sel:false,mot:g.mot,mide:g.mide,res:g.res,sug:true});}
const manualOf=st=>st.mide?(st.res===0?0:1):'nm';
function npMotSel(attr,val,id){return `<select id="${id}" ${attr} aria-label="Motivo" style="width:160px"><option value="">Selecciona motivo…</option>${npMotivos().map(m=>`<option ${m===val?'selected':''}>${esc(m)}</option>`).join('')}</select>`;}
function npMideCtl(st,dataKey,id){
  return `<div class="row" style="flex-wrap:nowrap;gap:6px"><div class="seg" role="group" aria-label="Mide OTIF"><button type="button" ${dataKey} data-v="1" aria-pressed="${st.mide}">Mide</button><button type="button" ${dataKey} data-v="0" aria-pressed="${!st.mide}">No mide</button></div>
   ${st.mide?`<select id="${id}" ${dataKey.replace('data-a="npMide"','data-npres="1"').replace('data-a="npMideC"','data-npresc="1"')} aria-label="Resultado OTIF" style="width:118px"><option value="1" ${st.res!==0?'selected':''}>Cumple (1)</option><option value="0" ${st.res===0?'selected':''}>No cumple (0)</option></select>`:''}</div>`;
}
/* registra recepciones no planificadas como compromisos express */
function registerNP(items){
  const byK=new Map();for(const it of items){if(!byK.has(it.k))byK.set(it.k,[]);byK.get(it.k).push(it);}
  const falta=items.filter(it=>!it.mot);if(falta.length)throw new Error('Selecciona el motivo en '+falta.length+' fila(s) antes de registrar.');
  let n=0;
  for(const [k,arr] of byK){
    act(k,ctx=>{const p=ensurePlan(k);const hadCal=hasPlanCal(p);
      for(const it of arr){addCommits(k,[{wk:it.wk,pl:it.pl,qty:it.qty}],{act:'express',src:'express',allowOver:true,manual:it.manual,mnp:it.mot,planZero:hadCal,
        note:`Recepción no planificada · ${it.mot} · ${it.manual==='nm'?'no mide OTIF':'mide OTIF, resultado '+it.manual}${hadCal?' · no suma al calendario':''}`},ctx);n++;}
      if(!hadCal)p.confirmed=true;});
  }
  return n;
}
function setNP(k,cid,patch,ctx){
  const p=ensurePlan(k);const c=p.commits.find(x=>x.id===cid);if(!c)throw new Error('Registro no encontrado.');
  if(patch.mnp!==undefined&&patch.mnp!==c.mnp){const b=c.mnp||'';c.mnp=patch.mnp;logE(p,{act:'noplan',cid:c.id,wk:c.wk,pl:c.pl,field:'Motivo no planificada',before:b||'–',after:c.mnp,mot:c.mnp,resp:'',note:''},ctx);}
  if(patch.manual!==undefined&&patch.manual!==c.manual){const lab=v=>v==='nm'?'No mide':v===0?'Mide · no cumple (0)':'Mide · cumple (1)';const b=c.manual;c.manual=patch.manual;logE(p,{act:'noplan',cid:c.id,wk:c.wk,pl:c.pl,field:'Mide OTIF',before:lab(b),after:lab(c.manual),mot:c.mnp||'',resp:'',note:'OTIF recalculado'},ctx);}
}
function npRegistered(){
  const out=[];for(const l of fLines()){const p=S.plans[l.k];if(!p)continue;for(const c of p.commits||[])if(c.src==='express'&&c.st!=='cancelada'&&plMatch(c.pl))out.push({l,p,c,e:evalC(l,p,c)});}
  return out.sort((a,b)=>b.c.wk-a.c.wk);
}
function npCounts(){const ex=exceptions();return {sincal:sinCalGroups().length,ex,total:sinCalGroups().length+ex.total};}
function npRows(){
  return sinCalGroups().sort((x,y)=>String(x.l.prov).localeCompare(y.l.prov)||y.wk-x.wk);
}
function vRNP(){
  if(!S.ix.lines.length)return noData();
  const rows=npRows();const dis=S.canWrite?'':'disabled';const sel=rows.filter(x=>npState(x.key).sel);
  const bulk=rows.length?`<div class="row" style="margin-bottom:8px"><label style="display:flex;gap:6px;align-items:center"><input class="cbx" type="checkbox" id="np-all" data-npall="1" ${sel.length===rows.length?'checked':''}>Seleccionar todas</label><span class="spacer"></span>
    ${sel.length?`<span class="muted">${sel.length} seleccionada(s)</span>${npMotSel(`data-npbulk="mot"`,'','np-bulk-mot')}<button class="btn sm" data-a="npBulkMide" data-v="1">Mide</button><button class="btn sm" data-a="npBulkMide" data-v="0">No mide</button>`:''}
    <button class="btn pri sm" data-a="npRegSel" ${sel.length&&S.canWrite?'':'disabled'}>Registrar seleccionadas${sel.length?' ('+sel.length+')':''}</button></div>`:'';
  return `<div class="panel"><div class="panel-h"><h2>Recepciones sin calendario</h2><span class="spacer"></span><span class="muted">${rows.length} por registrar</span>
    <p>Recepciones de líneas de OC que no tenían ningún registro de calendarización (por ejemplo compras SPOT o urgentes). Elige el motivo, define si mide OTIF y regístralas en el calendario tal como llegaron. Las entregas de líneas calendarizadas que llegaron en otra semana o planta no aparecen aquí: se gestionan desde Faltantes por recalendarizar.</p></div>
   <div class="panel-b">${bulk}
   <div class="tw"><table><thead><tr><th>Incluir</th><th>Proveedor · OC · producto</th><th>Planta · semana</th><th class="num">Recibido</th><th>Motivo</th><th>Mide OTIF</th><th></th></tr></thead><tbody>
   ${rows.map(x=>{const st=npState(x.key);const id=segSafe(x.key);const foc=S.tab.npFocus===x.l.k;
     return `<tr ${foc?'style="background:var(--accent-soft)"':''}><td><input class="cbx" type="checkbox" id="nps-${id}" data-npsel="${esc(x.key)}" ${st.sel?'checked':''} aria-label="Incluir"></td><td class="wrap" style="min-width:170px"><b style="font-weight:600">${esc(x.l.prov)}</b><div class="muted" style="font-size:12px">${lineLabel(x.l)}</div><div style="font-size:12.5px">${esc(x.l.prod)}</div></td><td style="white-space:nowrap">${esc(x.pl)}<div class="muted" style="font-size:12px">${wLabel(x.wk)} · ${wDates(x.wk)}</div></td><td class="num">${fmt(x.qty)}</td>
      <td>${npMotSel(`data-npmot="${esc(x.key)}"`,st.mot,'npm-'+id)}</td><td>${npMideCtl(st,`data-a="npMide" data-key="${esc(x.key)}"`,'npr-'+id)}</td>
      <td><div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start"><button class="btn sm pri" data-a="npReg" data-key="${esc(x.key)}" ${dis}>Registrar</button><button class="btn ghost sm" data-a="openLine" data-k="${esc(x.l.k)}" data-w="${x.wk}">Ver agenda</button></div></td></tr>`;}).join('')||`<tr><td colspan="7">${emptyState('No hay recepciones sin calendario','Todas las líneas con recepciones tienen calendario. Las entregas en otra semana o planta se gestionan en Faltantes por recalendarizar.')}</td></tr>`}
   </tbody></table></div></div></div>`;
}
function npKeys(){return npRows().map(x=>x.key);}
function npItemFromKey(key){
  const [k,pl,wk]=[key.split('|')[0],key.split('|')[1],+key.split('|')[2]];const st=npState(key);
  const qty=recAt(k,pl,wk);return {k,pl,wk,qty,mot:st.mot,manual:manualOf(st)};
}

/* =========================================================
   Excepciones
   ========================================================= */
function exceptions(){
  const saldo=[],exceso=[],falt=[],adel=[],sinc=[],nopal=[];
  for(const l of fLines()){
    const p=planOf(l.k);const rt=recTot(l.k);
    if(l.st==='Recibida/Facturada'&&(+l.qty||0)-(+p.cancel||0)-rt>0)saldo.push({l,p,diff:(+l.qty)-(+p.cancel||0)-rt});
    if(rt-(+l.qty||0)-(+p.excess||0)>0)exceso.push({l,p,diff:rt-(+l.qty)-(+p.excess||0)});
    for(const c of activeCommits(p)){if(!plMatch(c.pl)||!wkMatch(c.wk))continue;const r=recAt(l.k,c.pl,c.wk);
      if(c.wk<CUR&&c.plan>r&&l.st==='Abierta'&&!evalC(l,p,c).inf)falt.push({l,p,c,r,f:c.plan-r});
      if(c.wk<=CUR&&r>c.plan&&activeCommits(p).some(x=>x.wk>c.wk))adel.push({l,p,c,r,f:r-c.plan});}
    if(hasPlanCal(p)){
      const g=new Map();for(const r of S.ix.recLine.get(l.k)||[]){if(!plMatch(r.pl)||!wkMatch(r.wk))continue;const key=r.pl+'|'+r.wk;g.set(key,(g.get(key)||0)+(+r.qty));}
      for(const [key,q] of g){const [pl,wk]=[key.split('|')[0],+key.split('|')[1]];if(!(p.commits||[]).some(c=>c.pl===pl&&c.wk===wk&&c.st!=='cancelada'))sinc.push({l,p,pl,wk,q,near:nearestCommit(p,pl,wk)});}
    }
    if(l.st!=='Cancelada'&&lineIncomplete(l))nopal.push({l});
  }
  return {saldo,exceso,falt,adel,sinc,nopal,total:saldo.length+exceso.length+falt.length+adel.length+sinc.length};
}
/* =========================================================
   Sugerencias automáticas (Gestiones pendientes)
   ========================================================= */
/* motivo y medición sugeridos para una recepción sin calendario */
function npSuggest(k,pl,wk){
  const l=S.ix.byK[k];if(!l)return {mot:'',mide:true,res:1,why:''};
  let spot;let why;
  if(l.fw){const d=wDiff(l.fw,wk);spot=d<=2;why=spot?`OC emitida ${d<=0?'la misma semana':d+' semana(s) antes'} de la recepción`:`OC emitida ${d} semanas antes de la recepción`;}
  else{const wks=new Set((S.ix.recLine.get(k)||[]).filter(r=>+r.qty>0).map(r=>r.wk));spot=wks.size<=1;why=spot?'Toda la línea llegó en una sola entrega':'La línea tuvo varias entregas sin calendario';}
  return spot?{mot:'SPOT/URGENTE',mide:true,res:1,why}:{mot:'CALENDARIO NO ACTUALIZADO',mide:false,res:1,why};
}
const SUG_KINDS={
  falt:['Faltantes por recalendarizar','Semanas cerradas donde llegó menos de lo comprometido. Elige en cada caso si el faltante va como nueva entrega la semana siguiente o se suma a la próxima entrega ya programada (misma planta).'],
  adel:['Adelantos por descontar','Semanas donde llegó más de lo comprometido. Elige en cada caso si se descuenta de la entrega más cercana o de la última entrega programada; cada opción muestra cómo quedaría.'],
  saldo:['Líneas cerradas con saldo','La OC quedó recibida/facturada en el sistema de compras con saldo pendiente. Sugerencia: registrarlo como saldo cancelado (no penaliza al proveedor).'],
  exceso:['Exceso recepcionado','Se recibió más de lo comprado. Elige en cada caso si fue no acordado (penaliza si supera la tolerancia) o un acuerdo comercial (no penaliza).'],
  meet:['Reuniones de la semana','Proveedores con entregas cuya reunión semanal aún no está cerrada, ordenados por prioridad. Inicia o continúa la reunión; se cierra al guardar el acta.'],
  pend:['Líneas con cantidad sin calendarizar','Líneas de OC abiertas con saldo sin semana asignada. Agenda cada una aquí, o varias a la vez con la Carga masiva del Calendario.'],
  nopal:['Productos con ficha incompleta','Sin unidades por pallet (o por posición) no se pueden convertir a posiciones. Complétalo aquí; el producto sale de la lista apenas tiene el dato.'],
  np:['Recepciones no planificadas','Recepciones de líneas que no tenían calendario (compras SPOT o urgentes, calendario no actualizado…). Cada caso viene con el motivo y la medición sugeridos: revísalos y regístralos en el calendario tal como llegaron.']
};
function sugItems(kind){
  const ex=exceptions();const out=[];const dis=S.canWrite?'':'disabled';
  const head=l=>`<b style="font-weight:600">${esc(l.prov)}</b><div class="muted" style="font-size:12px">${lineLabel(l)} · ${esc(l.prod)}</div>`;
  if(kind==='falt')for(const x of ex.falt.sort((a,b)=>a.c.wk-b.c.wk)){const w2=Math.max(wAdd(CUR,1),wAdd(x.c.wk,1));const id=x.l.k+'|'+x.c.id;
    const nx=activeCommits(x.p).filter(c=>c.pl===x.c.pl&&c.wk>=CUR&&c.wk>x.c.wk).sort((a,b)=>a.wk-b.wk)[0];
    const busy=new Set(activeCommits(x.p).filter(c=>c.pl===x.c.pl).map(c=>c.wk));let wn=w2;for(let i=0;i<30&&busy.has(wn);i++)wn=wAdd(wn,1);
    const opts=[];
    opts.push({v:'new',t:`Nueva entrega en ${wLabel(wn)}`,d:`${esc(x.c.pl)} · ${fmt(x.f)} u. · primera siguiente semana sin entrega programada`,rows:[{wk:wn,pl:x.c.pl,qty:x.f}]});
    if(nx)opts.push({v:'next',t:`Sumar a la próxima entrega · ${wLabel(nx.wk)}`,d:`${esc(nx.pl)} · ${fmt(nx.plan)} + ${fmt(x.f)} = <b>${fmt(nx.plan+x.f)}</b> u.`,rows:[{wk:nx.wk,pl:nx.pl,qty:x.f}]});
    S.tab.fo=S.tab.fo||{};if(!opts.find(o=>o.v===S.tab.fo[id]))S.tab.fo[id]=opts[0].v;const sel=opts.find(o=>o.v===S.tab.fo[id]);
    out.push({id,head:head(x.l),sit:`${esc(x.c.pl)} · ${wLabel(x.c.wk)}: comprometido ${fmt(x.c.qty)}, recibido ${fmt(x.r)}, <b style="color:var(--bad)">faltan ${fmt(x.f)}</b>`,
      sug:'',ctl:`<span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">Elige cómo recalendarizar</span>
        <div class="optg" role="radiogroup" aria-label="Opción de recalendarización">${opts.map(o=>`<button type="button" class="opt" role="radio" aria-checked="${o.v===sel.v}" data-a="faltOpt" data-id="${esc(id)}" data-v="${o.v}"><span class="rd"></span><span><b>${o.t}</b><span class="od">${o.d}</span></span></button>`).join('')}</div>`,
      apply:()=>act(x.l.k,ctx=>recalFaltante(x.l.k,x.c.id,sel.rows,ctx)),
      man:`<button class="btn sm" data-a="exRecal" data-k="${esc(x.l.k)}" data-cid="${x.c.id}" ${dis}>Modificar</button>`});}
  if(kind==='adel')for(const x of ex.adel){const id=x.l.k+'|'+x.c.id;const futs=activeCommits(x.p).filter(f=>f.wk>x.c.wk).sort((a,b)=>a.wk-b.wk);
    const alloc=list=>{const al=[];let rest=x.f;for(const f of list){const q=Math.min(rest,f.plan);if(q>0){al.push({cid:f.id,qty:q,wk:f.wk,pl:f.pl,plan:f.plan});rest-=q;}if(rest<=0)break;}return al;};
    const res=al=>al.map(a=>`<span class="od">${wLabel(a.wk)} · ${esc(a.pl)}: ${fmt(a.plan)} − ${fmt(a.qty)} = <b>${fmt(a.plan-a.qty)}</b> u.${a.plan-a.qty===0?' (se elimina)':''}</span>`).join('');
    const near=alloc(futs),last=alloc(futs.slice().reverse());
    const opts=[];if(near.length)opts.push({v:'near',t:'Descontar de la entrega más cercana',al:near});
    if(last.length&&last.map(a=>a.cid).join()!==near.map(a=>a.cid).join())opts.push({v:'last',t:'Descontar de la última entrega',al:last});
    else if(last.length&&opts.length)opts[0].t='Descontar de la próxima entrega (es también la última)';
    S.tab.ao=S.tab.ao||{};if(opts.length&&!opts.find(o=>o.v===S.tab.ao[id]))S.tab.ao[id]=opts[0].v;const sel=opts.find(o=>o.v===S.tab.ao[id]);
    out.push({id,head:head(x.l),sit:`${esc(x.c.pl)} · ${wLabel(x.c.wk)}: comprometido ${fmt(x.c.plan)}, recibido ${fmt(x.r)}, <b style="color:var(--info)">adelanto ${fmt(x.f)}</b>`,
      sug:'',ctl:opts.length?`<span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">Elige de dónde descontar</span>
        <div class="optg" role="radiogroup" aria-label="Opción de descuento">${opts.map(o=>`<button type="button" class="opt" role="radio" aria-checked="${o.v===sel.v}" data-a="adelOpt" data-id="${esc(id)}" data-v="${o.v}"><span class="rd"></span><span><b>${o.t}</b>${res(o.al)}</span></button>`).join('')}</div>`:'<span class="muted">No hay entregas posteriores de donde descontar: revísalo con Modificar.</span>',
      apply:sel?()=>act(x.l.k,ctx=>descontarAdelanto(x.l.k,x.c.id,sel.al.map(a=>({cid:a.cid,qty:a.qty})),ctx)):null,
      man:`<button class="btn sm" data-a="exAdel" data-k="${esc(x.l.k)}" data-cid="${x.c.id}" ${dis}>Modificar</button>`});}
  if(kind==='saldo')for(const x of ex.saldo){const pv=previewSaldo(x.l.k,x.diff);const ok=!(pv.rest>0);
    out.push({id:x.l.k,head:head(x.l),sit:`Comprado ${fmt(x.l.qty)}, recibido ${fmt(recTot(x.l.k))}, <b>saldo ${fmt(x.diff)}</b>`,
      sug:ok?`Registrar saldo cancelado de ${fmt(x.diff)} · motivo "Saldo no requerido por temporada"`:'',
      apply:ok?()=>act(x.l.k,ctx=>saldoCancelado(x.l.k,x.diff,'Abastecimiento','Saldo no requerido por temporada — OC cerrada en el sistema de compras',ctx)):null,
      man:`<button class="btn sm" data-a="dSaldo" data-k="${esc(x.l.k)}" ${dis}>Modificar</button>`});}
  if(kind==='exceso')for(const x of ex.exceso){const last=excesoTarget(x.l,x.p);
    out.push({id:x.l.k,head:head(x.l),sit:`Comprado ${fmt(x.l.qty)}, recibido ${fmt(recTot(x.l.k))}, <b style="color:var(--info)">exceso ${fmt(x.diff)}</b>${last?` · llegó en ${wLabel(last.wk)} · ${esc(last.pl)}`:''}`,
      sug:last?excesoTxt(x.l,x.p,last,x.diff):'',apply:null,
      man:last?excBtns(x.l.k):`<button class="btn sm" data-a="openLine" data-k="${esc(x.l.k)}">Ver línea</button>`});}
  if(kind==='pend'){const ls=fLines().filter(l=>l.st==='Abierta'&&pendingOf(l,planOf(l.k))>0).sort((a,b)=>a.prov.localeCompare(b.prov)||String(a.oc).localeCompare(b.oc));
    for(const l of ls){const p=planOf(l.k);out.push({id:l.k,head:head(l),sit:`Comprado ${fmt(l.qty)} · calendarizado ${fmt(planSum(p))} · <b style="color:var(--bad)">pendiente ${fmt(pendingOf(l,p))}</b>${p.confirmed?'':' · calendario en borrador'}`,
      sug:'',ctl:'',apply:null,man:`<button class="btn sm pri" data-a="agendar" data-k="${esc(l.k)}" ${dis}>Agendar</button><button class="btn sm ghost" data-a="openLine" data-k="${esc(l.k)}">Ver calendario</button>`});}}
  if(kind==='nopal'){const g=new Map();for(const x of ex.nopal){const o=g.get(norm(x.l.cod))||{cod:x.l.cod,prod:x.l.prod,provs:new Set()};o.provs.add(x.l.prov);g.set(norm(x.l.cod),o);}
    for(const o of g.values()){const pr=prodOf(o.cod)||{};const un=unitOf(o.cod);const id=segSafe(o.cod);
      out.push({id:o.cod,head:`<b style="font-weight:600">${esc(o.prod)}</b><div class="muted" style="font-size:12px"><span class="mono">${esc(o.cod)}</span> · ${esc([...o.provs].join(', '))}</div>`,sit:'',
        ctl:`<div class="row" style="gap:8px;align-items:flex-end"><div class="field" style="margin:0"><label for="sg-unit-${id}">Almacenamiento</label><select id="sg-unit-${id}" data-pf="unit" data-cod="${esc(o.cod)}" ${dis}>${UNITS.map(([k,t])=>`<option value="${k}" ${un===k?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label for="sg-q-${id}">${un==='pallet'?'Unidades por pallet':'Unidades por posición'}</label><input class="posin" style="width:120px;text-align:left" type="number" min="0" id="sg-q-${id}" data-pf="${un==='pallet'?'upp':'uposDef'}" data-cod="${esc(o.cod)}" value="${un==='pallet'?(pr.upp||''):(pr.uposDef||'')}" ${dis}></div></div>
          <div class="muted" style="font-size:11.5px;margin-top:4px">Se guarda al escribir. Pallets por posición, valores por planta o por proveedor: en la ficha completa.</div>`,
        apply:null,man:`<button class="btn sm ghost" data-a="prodFicha" data-cod="${esc(o.cod)}">Ficha completa</button>`});}}
  if(kind==='meet')for(const r of prepRows().filter(r=>r.est[0]!=='Cerrada')){
    out.push({id:r.prov,head:`<b style="font-weight:600">${esc(r.prov)}</b> <span class="chip ${r.pr[1]}" style="margin-left:6px">Prioridad ${r.pr[0].toLowerCase()}</span>`,
      sit:`${r.why.length?esc(r.why.join(' · ')):'<span class="muted">Sin alertas</span>'} · OTIF 4 sem. <b style="color:${oCss(r.R.K4.otif)}">${pct(r.R.K4.otif)}</b> · reunión: <b>${r.est[0].toLowerCase()}</b>`,
      sug:'',ctl:'',apply:null,man:`<button class="btn sm pri" data-a="openMeet" data-p="${esc(r.prov)}">${r.est[0]==='Sin iniciar'?'Iniciar reunión':'Continuar reunión'}</button><button class="btn sm" data-a="mailProv" data-p="${esc(r.prov)}">Correo</button>`});}
  if(kind==='np')for(const x of npRows()){const sg=npSuggest(x.l.k,x.pl,x.wk);const st=npState(x.key);const id=segSafe(x.key);
    out.push({id:x.key,head:head(x.l),sit:`${esc(x.pl)} · ${wLabel(x.wk)}: recibido <b>${fmt(x.qty)}</b> sin calendario`,
      sug:'',ctl:`<span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">Viene con la sugerencia; cámbiala si corresponde</span><div class="muted" style="font-size:11.5px;margin-bottom:4px">Sugerido: ${esc(sg.mot)} · ${sg.mide?'mide, cumple (1)':'no mide'} — ${esc(sg.why)}</div><div class="row" style="gap:8px">${npMotSel(`data-npmot="${esc(x.key)}"`,st.mot,'npm-'+id)}${npMideCtl(st,`data-a="npMide" data-key="${esc(x.key)}"`,'npr-'+id)}</div>`,
      apply:()=>{if(!S.canWrite)throw new Error('Solo lectura: no tienes permiso para modificar.');registerNP([npItemFromKey(x.key)]);if(S.tab.np)delete S.tab.np[x.key];},
      man:''});}
  return out;
}
/* Exceso: dos opciones */
const EXC_AC={resp:'Abastecimiento',mot:'Acuerdo comercial con proveedor'};
function excesoTxt(l,p,c,e){const r=recAt(l.k,c.pl,c.wk);const to=+S.cfg.tolOver||0,tu=+S.cfg.tolUnder||0;const inT=q=>r>=q*(1-tu)-1e-6&&r<=q*(1+to)+1e-6;
  return `<div style="font-weight:500;color:var(--ink)">${wLabel(c.wk)}: comprometido ${fmt(c.qty)}, recibido ${fmt(r)} · No acordado → In Full <b>${inT(c.qty)?'cumple':'no cumple'}</b> · Acuerdo comercial → In Full <b>${inT(c.qty+e)?'cumple':'no cumple'}</b></div>`;}
function excBtns(k){const dis=S.canWrite?'':'disabled';return `<button class="btn sm" data-a="excReg" data-m="nc" data-k="${esc(k)}" ${dis}>Registrar como no acordado (penaliza)</button><button class="btn sm" data-a="excReg" data-m="ac" data-k="${esc(k)}" ${dis}>Registrar como acuerdo comercial (no penaliza)</button>`;}
function sugCount(kind){return sugItems(kind).filter(x=>x.apply).length;}
function sugAcceptAll(kind,ids){
  const tried=new Set();let ok=0;const errs=[];
  for(let i=0;i<5000;i++){const it=sugItems(kind).find(x=>x.apply&&!tried.has(x.id)&&(!ids||ids.includes(x.id)));if(!it)break;tried.add(it.id);
    try{if(it.apply()!==false)ok++;}catch(e){errs.push(e.message||String(e));}}
  return {ok,errs};
}
function dSug(){
  const T=SUG_KINDS[D.kind];const items=sugItems(D.kind);const n=items.filter(x=>x.apply).length;const dis=S.canWrite?'':'disabled';
  return {title:T[0],sub:T[1],
   body:`${D.kind==='meet'&&items.length?`<div class="row" style="margin-bottom:4px"><span class="muted">${items.length} reunión(es) por cerrar</span><span class="spacer"></span><button class="btn sm" data-a="mailGen">Correo resumen general</button><button class="btn sm pri" data-a="pdfAll">PDF de todos</button></div>`:''}${D.kind==='pend'&&items.length?`<div class="row" style="margin-bottom:4px"><span class="muted">${items.length} línea(s)</span><span class="spacer"></span><button class="btn sm" data-a="bulkOpen" ${dis}>Carga masiva</button></div>`:''}${items.length&&!['exceso','pend','nopal','meet'].includes(D.kind)?`<div class="row" style="margin-bottom:4px"><span class="muted">${items.length} caso(s) · ${n} con sugerencia automática</span><span class="spacer"></span><button class="btn pri sm" data-a="sugAll" data-kind="${D.kind}" ${n&&S.canWrite?'':'disabled'}>${D.kind==='np'?'Registrar todas':'Aceptar todas'} (${n})</button></div>`:''}
    ${items.map(x=>`<div class="box"><div>${x.head}</div><div style="font-size:13px">${x.sit}</div>
      <div class="row" style="align-items:flex-start;${D.kind==='exceso'||D.kind==='np'||D.kind==='nopal'||D.kind==='falt'||D.kind==='adel'?'flex-direction:column;align-items:stretch':''}"><div class="grow" style="flex:1;min-width:180px">${x.ctl?x.ctl:D.kind==='pend'||D.kind==='meet'?'':x.sug?`<span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">${D.kind==='exceso'?'Resultado según cómo lo registres':'Sugerencia'}</span><div style="color:var(--accent);font-weight:600">${x.sug}</div>`:'<span class="muted">Sin sugerencia automática: resuélvelo con Modificar.</span>'}</div>
      <div class="row" style="gap:6px">${x.apply?`<button class="btn sm pri" data-a="sugOne" data-kind="${D.kind}" data-id="${esc(x.id)}" ${dis}>${D.kind==='np'?'Registrar':'Aceptar'}</button>`:''}${x.man}</div></div></div>`).join('')||emptyState('Nada pendiente','Todas las gestiones de este tipo están resueltas.')}
    ${errBox()}`};
}
function sugRow(t,kind){
  const n=sugItems(kind).length,na=sugCount(kind);
  return `<tr><td class="wrap">${t}${n?`<div class="muted" style="font-size:12px">${kind==='exceso'?'Elige en cada caso: no acordado o acuerdo comercial':kind==='meet'?`${prepRows().filter(r=>r.pr[0]==='Alta'&&r.est[0]!=='Cerrada').length} de prioridad alta · se abren en orden de prioridad`:kind==='pend'?'Agenda cada línea o usa la Carga masiva':kind==='nopal'?'Completa las unidades por pallet o por posición':na===n?'Todas con sugerencia automática':na+' con sugerencia automática'}</div>`:''}</td><td class="num"><span class="badge ${n?'hot':''}">${n}</span></td>
   <td style="text-align:right;white-space:nowrap">${n?`<button class="btn sm" data-a="sugList" data-kind="${kind}">Revisar</button>`:''}</td></tr>`;
}
function nearestCommit(p,pl,wk){let b=null;for(const c of (p.commits||[]).filter(c=>c.st!=='cancelada')){const d=wDiff(c.wk,wk);if(b==null||Math.abs(d)<Math.abs(b.d))b={c,d};}return b;}
function vExcepcionesBody(ex,tab){
  let body='';
  if(tab==='falt')body=`<p class="hint">Compromisos de semanas cerradas que no cumplieron In Full por faltante. Su resultado queda registrado; recalendariza el faltante para volver a exigirlo.</p>
   <div class="tw"><table><thead><tr><th>Proveedor</th><th>OC · Código</th><th>Producto</th><th>Planta</th><th>Semana</th><th class="num">Comprometido</th><th class="num">Recibido</th><th class="num">Faltante</th><th>OTIF</th><th></th></tr></thead><tbody>
   ${ex.falt.sort((a,b)=>a.c.wk-b.c.wk).map(x=>`<tr><td>${esc(x.l.prov)}</td><td>${lineLabel(x.l)}</td><td>${esc(x.l.prod)}</td><td>${esc(x.c.pl)}</td><td>${wLabel(x.c.wk)}</td><td class="num">${fmt(x.c.qty)}</td><td class="num">${fmt(x.r)}</td><td class="num"><b style="color:var(--bad)">${fmt(x.f)}</b></td><td>${bin(evalC(x.l,x.p,x.c).otif)}</td><td><button class="btn sm pri" data-a="exRecal" data-k="${esc(x.l.k)}" data-cid="${x.c.id}" ${S.canWrite?'':'disabled'}>Recalendarizar</button></td></tr>`).join('')||`<tr><td colspan="10">${emptyState('Sin faltantes pendientes','')}</td></tr>`}</tbody></table></div>`;
  if(tab==='saldo')body=`<p class="hint">Líneas recibidas/facturadas donde lo recibido es menor a lo comprado. Si el saldo se canceló por acuerdo, regístralo para que no penalice al proveedor (ajuste LIFO).</p>
   <div class="tw"><table><thead><tr><th>Proveedor</th><th>OC · Código</th><th>Producto</th><th class="num">Comprado</th><th class="num">Recibido</th><th class="num">Saldo</th><th></th></tr></thead><tbody>
   ${ex.saldo.map(x=>`<tr><td>${esc(x.l.prov)}</td><td>${lineLabel(x.l)}</td><td>${esc(x.l.prod)}</td><td class="num">${fmt(x.l.qty)}</td><td class="num">${fmt(recTot(x.l.k))}</td><td class="num"><b>${fmt(x.diff)}</b></td><td><button class="btn sm pri" data-a="dSaldo" data-k="${esc(x.l.k)}" ${S.canWrite?'':'disabled'}>Registrar saldo cancelado</button></td></tr>`).join('')||`<tr><td colspan="7">${emptyState('Sin líneas cerradas con saldo','')}</td></tr>`}</tbody></table></div>`;
  if(tab==='exceso')body=`<p class="hint">Se recibió más de lo comprado (total recibido contra total comprado). <b>No acordado:</b> el compromiso no cambia y la sobreentrega se mide contra la tolerancia (penaliza si la supera). <b>Acuerdo comercial:</b> el compromiso sube a lo recibido y no penaliza (responsable Abastecimiento).</p>
   <div class="tw"><table><thead><tr><th>Proveedor</th><th>OC · Código</th><th>Producto</th><th class="num">Comprado</th><th class="num">Recibido</th><th class="num">Exceso</th><th>Semana del exceso</th><th></th></tr></thead><tbody>
   ${ex.exceso.map(x=>{const last=excesoTarget(x.l,x.p);return `<tr><td>${esc(x.l.prov)}</td><td>${lineLabel(x.l)}</td><td>${esc(x.l.prod)}</td><td class="num">${fmt(x.l.qty)}</td><td class="num">${fmt(recTot(x.l.k))}</td><td class="num"><b style="color:var(--info)">+${fmt(x.diff)}</b></td><td>${last?wLabel(last.wk)+' · '+esc(last.pl):'–'}</td><td>${last?`<div style="display:flex;flex-direction:column;gap:4px">${excBtns(x.l.k)}</div>`:`<button class="btn sm" data-a="go" data-v="seguimiento" data-tab="rnp" data-k="${esc(x.l.k)}">Registrar recepciones</button>`}</td></tr>`;}).join('')||`<tr><td colspan="8">${emptyState('Sin exceso recepcionado','')}</td></tr>`}</tbody></table></div>`;
  if(tab==='adel')body=`<p class="hint">Semanas en que llegó más de lo comprometido y quedan compromisos posteriores. Descuenta el adelanto de las semanas siguientes.</p>
   <div class="tw"><table><thead><tr><th>Proveedor</th><th>OC · Código</th><th>Planta</th><th>Semana</th><th class="num">Comprometido</th><th class="num">Recibido</th><th class="num">Adelanto</th><th></th></tr></thead><tbody>
   ${ex.adel.map(x=>`<tr><td>${esc(x.l.prov)}</td><td>${lineLabel(x.l)}</td><td>${esc(x.c.pl)}</td><td>${wLabel(x.c.wk)}</td><td class="num">${fmt(x.c.qty)}</td><td class="num">${fmt(x.r)}</td><td class="num"><b style="color:var(--info)">+${fmt(x.f)}</b></td><td><button class="btn sm" data-a="exAdel" data-k="${esc(x.l.k)}" data-cid="${x.c.id}" ${S.canWrite?'':'disabled'}>Descontar</button></td></tr>`).join('')||`<tr><td colspan="8">${emptyState('Sin adelantos por ajustar','')}</td></tr>`}</tbody></table></div>`;
  if(tab==='sinc')body=`<p class="hint">Recepciones en una semana o planta sin compromiso (entregas atrasadas, adelantadas o en otra planta). No suman al OTIF del compromiso original; revisa la línea para decidir.</p>
   <div class="tw"><table><thead><tr><th>Proveedor</th><th>OC · Código</th><th>Producto</th><th>Planta</th><th>Semana recibida</th><th class="num">Cantidad</th><th>Compromiso más cercano</th><th></th></tr></thead><tbody>
   ${ex.sinc.sort((a,b)=>b.wk-a.wk).map(x=>`<tr><td>${esc(x.l.prov)}</td><td>${lineLabel(x.l)}</td><td>${esc(x.l.prod)}</td><td>${esc(x.pl)}</td><td>${wLabel(x.wk)}</td><td class="num">${fmt(x.q)}</td><td>${x.near?`${wLabel(x.near.c.wk)} · ${esc(x.near.c.pl)} <span class="muted">(${x.near.d>0?'atraso '+x.near.d:x.near.d<0?'adelanto '+(-x.near.d):'misma semana'} sem.)</span>`:'–'}</td><td><button class="btn ghost sm" data-a="openLine" data-k="${esc(x.l.k)}" data-w="${x.wk}">Ver agenda</button></td></tr>`).join('')||`<tr><td colspan="8">${emptyState('Todas las recepciones calzan con un compromiso','')}</td></tr>`}</tbody></table></div>`;
  if(tab==='nopal')body=`<p class="hint">Productos sin unidades por pallet en el mantenedor: no se pueden convertir a posiciones de bodega.</p>
   <div class="tw"><table><thead><tr><th>Proveedor</th><th>Código</th><th>Producto</th><th>OC</th></tr></thead><tbody>${ex.nopal.map(x=>`<tr><td>${esc(x.l.prov)}</td><td class="mono">${esc(x.l.cod)}</td><td>${esc(x.l.prod)}</td><td class="mono">${esc(x.l.oc)}</td></tr>`).join('')||`<tr><td colspan="4">${emptyState('Todos los productos tienen unidades por pallet','')}</td></tr>`}</tbody></table></div>`;
  return body;
}

/* =========================================================
   Seguimiento OTIF (detalle por KEY)
   ========================================================= */
function segRows(){
  const tab=S.tab.seg||'eval';
  let evs=allEvals().filter(x=>x.e.m!=='excl');
  if(tab==='eval')evs=evs.filter(x=>x.e.phase==='past');
  if(tab==='nok')evs=evs.filter(x=>x.e.counts&&!x.e.otif);
  if(tab==='fut')evs=evs.filter(x=>x.e.phase!=='past'&&isActive(x.c));
  if(tab==='info')evs=evs.filter(x=>x.e.m==='info'||x.e.m==='pen');
  evs.sort((a,b)=>a.c.wk-b.c.wk||String(a.l.prov).localeCompare(b.l.prov));
  return evs;
}
function segStrip(){
  const m=allEvals().filter(x=>x.e.counts);const K=kpi(m);
  const fails=m.filter(x=>!x.e.otif);const soloOT=fails.filter(x=>!x.e.ot&&x.e.inf).length,soloIF=fails.filter(x=>x.e.ot&&!x.e.inf).length,ambos=fails.filter(x=>!x.e.ot&&!x.e.inf).length;
  const falt=sum(m,x=>Math.max(0,x.c.qty-x.e.r));
  const weeks=[...new Set(m.map(x=>x.c.wk))].sort((a,b)=>a-b).slice(-8);
  const ser=weeks.map(w=>{const a=m.filter(x=>x.c.wk===w);return {w,n:a.length,v:a.length?sum(a,x=>x.e.otif)/a.length:null};});
  const tile=(k,v,s,c)=>`<div class="tile"><span class="k">${k}</span><span class="v" style="color:${c||'inherit'}">${v}</span><span class="s">${s}</span></div>`;
  const tf=fails.length||1;
  const seg=(n,c,t)=>n?`<i style="width:${100*n/tf}%;background:${c}" title="${t}: ${n}"></i>`:'';
  const W=Math.max(ser.length,1)*34+40,H=78,base=60,ch=48;
  const spark=ser.length?`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="OTIF últimas semanas cerradas" style="max-width:${W*1.4}px">
    <line class="tl" x1="32" x2="${W-2}" y1="${base-MO()*ch}" y2="${base-MO()*ch}"/><line class="gl" x1="32" x2="${W-2}" y1="${base}" y2="${base}"/>
    <text x="29" y="${base-MO()*ch+3}" text-anchor="end">${Math.round(MO()*100)}%</text>
    ${ser.map((x,i)=>{const h=Math.max(1.5,(x.v||0)*ch);const xx=36+i*34;return `<rect x="${xx}" y="${base-h}" width="22" height="${h}" rx="2" fill="${oCss(x.v)}"><title>${wLabel(x.w)}: ${pct(x.v)} (${x.n} comp.)</title></rect><text x="${xx+11}" y="${base-h-3}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${Math.round((x.v||0)*100)}</text><text x="${xx+11}" y="${base+12}" text-anchor="middle">${wLabel(x.w)}</text>`;}).join('')}</svg>`:'<span class="muted">Sin semanas cerradas.</span>';
  return `<div class="panel"><div class="panel-h"><h2>Indicadores de semanas cerradas</h2><span class="spacer"></span><span class="muted">${K.n} compromisos medidos · según los filtros</span></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:14px">
    <div class="tiles">
     ${tile('OTIF',pct(K.otif),`${K.ok} de ${K.n} compromisos cumplidos`,K.otif==null?null:oCss(K.otif))}
     ${tile('On Time',pct(K.ot),'Llegó en la semana comprometida')}
     ${tile('In Full',pct(K.inf),`Dentro de −${Math.round(S.cfg.tolUnder*100)}% / +${Math.round(S.cfg.tolOver*100)}%`)}
     ${tile('Fill rate',pct(K.fill),'Recibido en su semana / comprometido')}
     ${tile('Unidades faltantes',fmt(falt),'Comprometido que no llegó en su semana',falt?'var(--bad)':null)}
    </div>
    <div><h3 style="margin-bottom:4px">OTIF últimas ${ser.length} semanas cerradas</h3>${spark}</div>
   </div></div>`;
}
/* =========================================================
   Seguimiento: semana actual (en curso)
   ========================================================= */
function vSemanaActual(tabs){
  const tu=+S.cfg.tolUnder||0,to=+S.cfg.tolOver||0;
  const now=new Date();const dow=(now.getDay()+6)%7+1;const day=Math.min(7,Math.max(1,dow));
  const evs=allEvals().filter(x=>x.c.wk===CUR&&isActive(x.c));
  const st=x=>{const r=x.e.r,q=x.c.plan;if(!r)return {k:'none',t:'Sin recepción',c:'',o:1};if(r>q*(1+to)+1e-6)return {k:'over',t:`Sobre +${Math.round(to*100)}%`,c:'warn',o:2};if(r>=q*(1-tu)-1e-6)return {k:'ok',t:'Completo',c:'ok',o:4};return {k:'part',t:'Parcial',c:'info',o:0};};
  const rows=evs.map(x=>({...x,s:st(x)}));
  const byP=new Map();for(const x of rows){if(!byP.has(x.l.prov))byP.set(x.l.prov,[]);byP.get(x.l.prov).push(x);}
  const grp=[...byP.entries()].map(([prov,a])=>{const q=sum(a,x=>x.c.plan),r=sum(a,x=>Math.min(x.e.r,x.c.plan*(1+to)));const ok=a.filter(x=>x.s.k==='ok').length;return {prov,a:a.sort((m,n)=>m.s.o-n.s.o||n.c.plan-m.c.plan),q,r,ok,n:a.length,pend:a.filter(x=>x.s.k==='none'||x.s.k==='part').length};})
    .sort((a,b)=>(a.ok/a.n)-(b.ok/b.n)||b.q-a.q);
  const Q=sum(rows,x=>x.c.plan),R=sum(rows,x=>x.e.r),N=rows.length,OK=rows.filter(x=>x.s.k==='ok').length,NONE=rows.filter(x=>x.s.k==='none').length,PART=rows.filter(x=>x.s.k==='part').length,OVER=rows.filter(x=>x.s.k==='over').length;
  // recepciones de la semana sin compromiso
  const comm=new Set(rows.map(x=>x.l.k+'|'+x.c.pl));let sinC=0,sinCq=0;
  for(const l of fLines())for(const r of S.ix.recLine.get(l.k)||[]){if(r.wk===CUR&&plMatch(r.pl)&&!comm.has(l.k+'|'+r.pl)&&+r.qty>0){sinC++;sinCq+=+r.qty;}}
  const pctR=Q?R/Q:null;
  const tiles=`<div class="tiles">
    <div class="tile lead"><span class="k">Recibido a hoy</span><span class="v">${pct(pctR)}</span><span class="s">${fmt(R)} de ${fmt(Q)} u. comprometidas en ${wLabel(CUR)}</span>
      <div class="pbar" style="margin-top:6px"><i style="width:${Math.min(100,(pctR||0)*100)}%;background:var(--s1)"></i><u style="left:${day/7*100}%" title="Avance de la semana: día ${day} de 7"></u></div><span class="muted" style="font-size:11.5px">Marca: día ${day} de 7 de la semana</span></div>
    <div class="tile"><span class="k">Compromisos completos</span><span class="v">${OK} de ${N}</span><span class="s">Dentro de la tolerancia −${Math.round(tu*100)}% / +${Math.round(to*100)}%</span></div>
    <div class="tile"><span class="k">Parciales</span><span class="v">${PART}</span><span class="s">Llegó una parte; falta completar</span></div>
    <div class="tile"><span class="k">Sin recepción aún</span><span class="v" style="color:${NONE&&day>=5?'var(--bad)':'inherit'}">${NONE}</span><span class="s">${NONE?`${fmt(sum(rows.filter(x=>x.s.k==='none'),x=>x.c.plan))} u. · quedan ${7-day} día(s)`:'Todos con recepciones'}</span></div>
    <div class="tile"><span class="k">Fuera de calendario</span><span class="v">${sinC}</span><span class="s">${sinC?`recepciones sin compromiso esta semana (${fmt(sinCq)} u.)`:'Sin recepciones fuera de calendario'}${OVER?` · ${OVER} sobre tolerancia`:''}</span></div></div>`;
  const tbl=grp.length?`<div class="tw"><table class="wk-cur"><thead><tr><th>Proveedor · OC · producto</th><th>Planta</th><th class="num">Comprometido</th><th class="num">Recibido</th><th style="min-width:150px">Avance</th><th>Estado</th></tr></thead>
   ${grp.map(g=>`<tbody><tr class="gh"><td colspan="2"><b>${esc(g.prov)}</b> <span class="muted" style="font-size:12px">${g.n} compromiso${g.n>1?'s':''}</span></td><td class="num"><b>${fmt(g.q)}</b></td><td class="num"><b>${fmt(sum(g.a,x=>x.e.r))}</b></td>
      <td><div class="pbar"><i style="width:${g.q?Math.min(100,sum(g.a,x=>x.e.r)/g.q*100):0}%;background:var(--s1)"></i></div></td><td><span class="muted" style="font-size:12.5px">${g.ok} de ${g.n} completos</span></td></tr>
     ${g.a.map(x=>{const r=x.e.r,q=x.c.plan;const p=q?r/q:0;return `<tr><td class="wrap" style="padding-left:22px"><span class="mono" style="font-size:12px">${esc(x.l.oc)}</span> · ${esc(x.l.prod)}<div class="muted" style="font-size:11.5px">${esc(x.l.cod)}${x.e.m==='info'?' · informativo (no mide)':''}</div></td><td>${esc(x.c.pl)}</td><td class="num">${fmt(q)}</td><td class="num">${r?fmt(r):'–'}</td>
       <td><div class="pbar"><i style="width:${Math.min(100,p*100)}%;background:${x.s.k==='over'?'var(--warn)':'var(--s1)'}"></i></div><span class="muted" style="font-size:11.5px">${pct(p)}${x.s.k==='part'?` · faltan ${fmt(Math.max(0,q-r))}`:''}</span></td>
       <td><span class="chip ${x.s.c}">${x.s.t}</span></td></tr>`;}).join('')}</tbody>`).join('')}</table></div>`:emptyState('Sin compromisos esta semana','No hay entregas comprometidas en '+wLabel(CUR)+' con estos filtros.');
  return `<div class="panel">${tabs?`<div class="panel-h"><div class="tabs">${tabs}</div></div>`:''}
   <div class="panel-b" style="display:flex;flex-direction:column;gap:14px">
    <p class="hint" style="margin:0"><b>${wLabel(CUR)} · ${wDates(CUR)}</b> · día ${day} de 7. La semana se mide al cerrar: aquí ves cómo van las entregas comprometidas, sin resultado OTIF todavía. Filtra por categoría o proveedor arriba para ver solo los tuyos.</p>
    ${tiles}${tbl}</div></div>`;
}
function vSeguimiento(){
  if(!S.ix.lines.length)return noData();
  if(S.tab.seg==='rnp'||S.tab.seg==='cierre')S.tab.seg='eval';
  if(S.tab.seg==='cur'||S.tab.seg==='fut')S.tab.seg='eval';
  const tab=S.tab.seg||'eval';
  const tb=(k,t)=>`<button data-a="tab" data-t="seg" data-k="${k}" aria-pressed="${tab===k}">${t}</button>`;
  const ex0=exceptions();const tabs=`${tb('eval','Semanas cerradas')}${tb('nok','No cumplidos')}${tb('info','Cambios al plan confirmado')}${tb('all','Todos')}`;
  const strip=segStrip();
  if(tab==='info')return strip+vModif(tabs);
  if(tab==='rnp')return strip+`<div class="panel"><div class="panel-h"><div class="tabs">${tabs}</div></div></div>`+vRNP();
  if(tab==='cierre')return strip+`<div class="panel"><div class="panel-h"><div class="tabs">${tabs}</div><p>Líneas cuyo total recibido no coincide con lo comprado: registra el saldo cancelado (no penaliza al proveedor, ajuste LIFO) o suma el exceso a la última semana calendarizada.</p></div>
    <div class="panel-b" style="display:flex;flex-direction:column;gap:14px"><h3>Cerradas con saldo</h3>${vExcepcionesBody(ex0,'saldo')}<h3>Exceso recepcionado</h3>${vExcepcionesBody(ex0,'exceso')}</div></div>`;
  const evs=segRows();const K=kpi(evs);
  const shown=evs.slice(0,600);
  return strip+`<div class="panel"><div class="panel-h"><div class="tabs">${tabs}</div><span class="spacer"></span>
   <button class="btn sm" data-a="exportSeg">Descargar Excel</button>
   <p>KEY OTIF = OC + código + planta + semana. OT = recepción en la semana comprometida. IF = cantidad recibida dentro de −${Math.round(S.cfg.tolUnder*100)}% / +${Math.round(S.cfg.tolOver*100)}%. OTIF = OT × IF.</p></div>
   <div class="tw"><table><thead><tr><th>Categoría</th><th>Código</th><th>Proveedor</th><th>OC</th><th>Producto</th><th>Planta</th><th>Sem. comprometida</th><th class="num">Cant. comprometida</th><th class="num">Q posiciones</th><th class="num">Cant. recibida</th><th>Sem. recibida</th><th class="num">Diferencia</th><th>OT</th><th>IF</th><th>OTIF</th><th>Medición</th><th>Origen</th></tr></thead><tbody>
   ${shown.map(x=>{const u=uppOf(x.l);const near=!x.e.r&&x.e.phase==='past'?nearestRecWeek(x.l,x.c.pl,x.c.wk):null;const past=x.e.phase!=='fut';return `<tr>
    <td>${esc(x.l.cat)}</td><td class="mono">${esc(x.l.cod)}</td><td>${esc(x.l.prov)}</td><td class="mono">${esc(x.l.oc)}</td><td>${esc(x.l.prod)}</td><td>${esc(x.c.pl)}</td><td>${wLabel(x.c.wk)}</td>
    <td class="num">${isActive(x.c)?fmt(x.c.qty):'<s>'+fmt(x.c.qty)+'</s>'}</td><td class="num">${(()=>{const v=posOf(x.l,x.c.pl,x.c.qty);return v==null?'–':fmt(Math.ceil(v));})()}</td><td class="num">${past?fmt(x.e.r):'–'}</td>
    <td>${x.e.r?wLabel(x.c.wk):''}</td><td class="num">${past?fmt(x.e.diff):'–'}</td>
    ${x.e.phase==='cur'?'<td><span class="chip warn">En curso</span></td>'.repeat(3):`<td>${past?bin(x.e.ot):bin(null)}</td><td>${past?bin(x.e.inf):bin(null)}</td><td>${past?bin(x.e.otif):bin(null)}</td>`}<td>${measChip(x.e.m)}${x.c.resp?` <span class="muted" style="font-size:12px">${esc(x.c.resp)}</span>`:''}</td><td><span class="chip kr">${SRC[x.c.src]}</span>${x.c.mnp?` <span class="muted" style="font-size:12px">${esc(x.c.mnp)}</span>`:''}</td></tr>`;}).join('')||`<tr><td colspan="17">${emptyState('Sin compromisos en esta selección','')}</td></tr>`}
   </tbody></table></div>${evs.length>shown.length?`<p class="hint" style="padding:8px 14px">Se muestran 600 de ${evs.length} filas. Usa los filtros o descarga el Excel completo.</p>`:''}</div>`;
}

/* =========================================================
   Ocupación de posiciones
   ========================================================= */
function occupancy(weeks){
  const out={};const start=S.cfg.wFrom;const all=wRange(start,weeks[weeks.length-1]>start?weeks[weeks.length-1]:start);
  for(const pc of S.cfg.plants){
    const pl=pc.name;const stack=+pc.stack||1;const row={};let occ=+pc.init||0;
    for(const w of all){
      let inn=0;const det=[];
      for(const l of S.ix.lines){const f=posFactor(l,pl);if(!f)continue;const p=planOf(l.k);
        let q=0;const r=recAt(l.k,pl,w);
        if(w<CUR)q=r;else{const pq=sum(activeCommits(p).filter(c=>c.pl===pl&&c.wk===w),c=>Math.max(0,c.plan));q=Math.max(r,pq);}
        if(q>0){const pos=q*f;inn+=pos;det.push({l,q,pos});}}
      const o=S.pos.out?.[pl]?.[w];const outv=o!=null&&o!==''?+o:(+pc.out||0);
      occ=Math.max(0,occ+inn-outv);
      row[w]={inn,out:outv,outSet:o!=null&&o!=='',occ,cap:+pc.cap||0,pct:pc.cap?occ/pc.cap:null,det};
    }
    out[pl]=row;
  }
  return out;
}
function vPosiciones(){
  if(!S.ix.lines.length)return noData();
  const weeks=wRange(S.wFrom,S.wTo);const occ=occupancy(weeks);
  const th=`<tr><th class="rowh">Planta</th>${weeks.map(w=>`<th class="wk ${w===CUR?'cur':''}">${wLabel(w)}<span class="dts">${wDates(w)}</span></th>`).join('')}</tr>`;
  const body=S.cfg.plants.filter(p=>plMatch(p.name)).map(pc=>{const o=occ[pc.name];return `
   <tr><td class="band" colspan="${weeks.length+1}">${esc(pc.name)} · capacidad ${fmt(pc.cap)} posiciones</td></tr>
   <tr><td class="rowh">Entradas (pos.)</td>${weeks.map(w=>`<td><button class="cell" data-a="posDet" data-pl="${esc(pc.name)}" data-w="${w}">${o[w].inn?fmt(Math.ceil(o[w].inn)):'·'}<small>${w<CUR?'real':'plan'}</small></button></td>`).join('')}</tr>
   <tr><td class="rowh">Armado / consumo</td>${weeks.map(w=>`<td style="padding:3px"><input class="posin" id="po-${segSafe(pc.name)}-${w}" type="number" min="0" data-pos="${esc(pc.name)}" data-w="${w}" value="${o[w].outSet?o[w].out:''}" placeholder="${fmt(pc.out||0)}" aria-label="Posiciones liberadas ${esc(pc.name)} ${wLabel(w)}" ${S.canWrite?'':'disabled'}></td>`).join('')}</tr>
   <tr><td class="rowh">Ocupadas</td>${weeks.map(w=>`<td><span class="cell">${fmt(o[w].occ)}</span></td>`).join('')}</tr>
   <tr class="tot"><td class="rowh">% ocupación</td>${weeks.map(w=>{const v=o[w].pct;return `<td><span class="cell heat-${v>=.9?3:v>=.75?2:1}">${pct(v)}<small>libres ${fmt(Math.max(0,o[w].cap-o[w].occ))}</small></span></td>`;}).join('')}</tr>`;}).join('');
  return `<div class="panel"><div class="panel-h"><h2>Ocupación de posiciones por planta</h2><span class="spacer"></span>${weekCtl()}
   <p>Entradas = recepciones reales (semanas pasadas) o compromisos del calendario (semana actual y futuras), convertidas a posiciones con el mantenedor de unidades por pallet. Armado/consumo = posiciones que se liberan cada semana; si lo dejas vacío se usa el consumo semanal estimado de la planta. La acumulación parte en ${wLabel(S.cfg.wFrom)} con las posiciones ocupadas iniciales.</p></div>
   <div class="panel-b"><div class="tw"><table class="ag"><thead>${th}</thead><tbody>${body}</tbody></table></div>
   <div class="legend" style="margin-top:10px"><span><i class="sw" style="background:var(--ok-soft)"></i>Bajo 75%</span><span><i class="sw" style="background:var(--warn-soft)"></i>75% a 90%</span><span><i class="sw" style="background:var(--bad-soft)"></i>Sobre 90%</span><span>Capacidad, ocupación inicial y consumo estimado se editan en Datos y configuración; pallets por posición, en el Maestro de productos.</span></div></div></div>`;
}

/* =========================================================
   Historial
   ========================================================= */
const ACT={anular:'Anulado (error de ingreso)',agendar:'Agendar',ajuste:'Ajuste (borrador)',modificar:'Modificar cantidad',reprogramar:'Reprogramar',recalendarizar:'Recalendarizar faltante',adelanto:'Descontar adelanto',saldo:'Saldo cancelado',exceso:'Exceso recepcionado',express:'Recepción no planificada',noplan:'Cambio en no planificada',confirmar:'Confirmar calendario',responsable:'Cambio de responsable'};
function histTable(rows,inLine){
  resolveNames(rows.map(x=>x.e.by));
  return `<div class="tw"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th>${inLine?'':'<th>Proveedor / línea</th>'}<th>Planta · Semana</th><th>Campo</th><th class="num">Antes</th><th class="num">Después</th><th>Responsable</th><th>Motivo</th><th>Impacto</th><th>Efecto OTIF</th><th>Nota</th></tr></thead><tbody>
  ${rows.slice(0,800).map(({e,l})=>{const p=planOf(l.k);const c=e.cid?(p.commits||[]).find(x=>x.id===e.cid):null;
   const eff=(e.act==='modificar'||e.act==='reprogramar')&&e.resp&&c&&c.st==='modificada'?(respPen(c.resp)?'<span class="chip acc">Penaliza</span>':'<span class="chip info">Informativo</span>'):e.act==='saldo'?'<span class="chip info">No penaliza</span>':'';
   return `<tr><td style="white-space:nowrap">${fdt(e.t)}</td><td>${esc(uname(e.by))}</td><td><span class="chip ${e.act==='reprogramar'||e.act==='modificar'?'acc':e.act==='saldo'?'info':e.act==='recalendarizar'?'warn':''}">${ACT[e.act]||esc(e.act)}</span></td>
   ${inLine?'':`<td class="wrap">${esc(l.prov)}<div class="muted">${lineLabel(l)}</div></td>`}
   <td style="white-space:nowrap">${e.pl?esc(e.pl)+' · '+wLabel(e.wk):'–'}</td><td>${esc(e.field||'')}</td><td class="num">${typeof e.before==='number'?fmt(e.before):esc(e.before??'–')}</td><td class="num">${typeof e.after==='number'?fmt(e.after):esc(e.after??'–')}</td>
   <td>${c&&c.st==='modificada'&&(e.act==='modificar'||e.act==='reprogramar')&&e.cid===c.id?`<button class="btn ghost sm" data-a="hResp" data-k="${esc(l.k)}" data-cid="${c.id}" title="Cambiar responsable">${esc(c.resp)} ✎</button>`:esc(e.resp||'')}</td>
   <td class="wrap">${esc(e.mot||'')}</td><td>${esc(e.imp||'')}</td><td>${eff}</td><td class="wrap muted">${esc(e.note||'')}${e.moved?' '+e.moved.map(m=>'→ '+wLabel(m.wk)+' '+esc(m.pl)+' '+fmt(m.qty)).join(', '):''}</td></tr>`;}).join('')||`<tr><td colspan="13">${emptyState('Sin cambios registrados','')}</td></tr>`}
  </tbody></table></div>`;
}
function vHistorial(){
  const tab=S.tab.hist||'cambios';let rows=[];
  for(const l of fLines()){const p=S.plans[l.k];if(!p)continue;for(const e of p.log||[]){if(e.pl&&!plMatch(e.pl))continue;if(fEff().wk&&e.wk&&!wkMatch(e.wk))continue;rows.push({e,l});}}
  if(tab==='cambios')rows=rows.filter(x=>['modificar','reprogramar','recalendarizar','saldo','exceso','adelanto','responsable','ajuste'].includes(x.e.act));
  rows.sort((a,b)=>a.e.t<b.e.t?1:-1);
  const tb=(k,t)=>`<button data-a="tab" data-t="hist" data-k="${k}" aria-pressed="${tab===k}">${t}</button>`;
  return `<div class="panel"><div class="panel-h"><div class="tabs">${tb('cambios','Cambios a compromisos')}${tb('todo','Todo el registro')}</div><span class="spacer"></span><button class="btn sm" data-a="exportHist">Descargar Excel</button>
   <p>Cada cambio guarda usuario, campo, valor antes y después, responsable, motivo e impacto. El responsable de una reprogramación se puede corregir después y el OTIF se recalcula.</p></div>${histTable(rows,false)}</div>`;
}

/* =========================================================
   Datos y configuración
   ========================================================= */
const FIELDS={
  oc:{title:'Detalle de órdenes de compra',desc:'Export de líneas de OC desde el sistema de compras (Softland u otro). Es el insumo de la planificación: una línea por OC y código.',
    f:[['oc','Orden de compra',1,['pedido de compra','orden de compra','=oc','n oc','purchase order','numero de pedido']],
       ['cod','Código artículo',1,['codigo articulo','codigo de articulo','=codigo','numero de articulo','=articulo','=item']],
       ['prod','Producto / descripción',0,['nombre producto','nombre del producto','=producto','=descripcion','nombre articulo']],
       ['prov','Proveedor',1,['nombre proveedor','nombre del proveedor','=proveedor','=vendor','razon social']],
       ['cat','Categoría',0,['categoria compras','categoria de compras','=categoria','subcategoria','=familia']],
       ['qty','Cantidad comprada',1,['cantidad comprada','=cantidad','cantidad pedida','cantidad compra','=qty']],
       ['est','Estado de línea',0,['estado linea','estado de linea','estado de la linea','=estado','=status']],
       ['fent','Fecha de entrega comprometida',0,['fecha entrega','fecha de entrega','entrega prometida','=entrega']],
       ['pend','Cantidad pendiente',0,['cantidad pendiente','cant pend','=pendiente','saldo pendiente']],
       ['alm','Almacén / planta OC',0,['=almacen','almacen oc','=sitio','=planta','=bodega']],
       ['esp','Especie',0,['nombre especie','=especie']],
       ['precio','Precio unitario USD',0,['precio unit usd','precio unitario usd','precio usd','=precio unitario','=precio']],
       ['fecha','Fecha de la OC',0,['fecha contable','=fecha pedido','fecha de pedido','fecha creacion','fecha documento','fecha emision']]]},
  rec:{title:'Recepciones',desc:'Export de recepciones de materiales en bodega. Se agrupan por OC + código + planta + semana; las salidas o reversas con cantidad negativa se descuentan.',
    f:[['oc','Orden de compra',0,['pedido compras','pedido de compra','orden de compra','numero de cuenta','=oc','=pedido','purchase order','=o/c']],
       ['cod','Código artículo',1,['codigo producto','codigo de articulo','codigo articulo','=codigo','=articulo','=item','=producto']],
       ['desc','Descripción',0,['=descripcion','descripcion producto']],
       ['pl','Planta / almacén',1,['=almacen','almacen recepcion','=planta','=bodega','=sitio']],
       ['fecha','Fecha de recepción',0,['fecha inventario','fecha fisica','fecha recepcion','fecha de recepcion','fecha ingreso','=fecha']],
       ['wk','Semana (si no hay fecha)',0,['=semana','semana recepcion','semana rec','semana recibida','=week']],
       ['qty','Cantidad recibida',1,['cantidad recibida','=cantidad','cant recibida','=qty']],
       ['prov','Proveedor',0,['proveeedor','proveedor rec','nombre proveedor','=proveedor']],
       ['guia','Guía / albarán',0,['albaran','guia de despacho','=guia','=documento']],
       ['tipo','Tipo de referencia',0,['tiporeferencia','tipo referencia']]]},
  pal:{title:'Mantenedor unidades por pallet',desc:'Unidades por pallet por proveedor y código (por ejemplo la hoja Q Posiciones). Es la base inicial: lo que edites en Maestro de productos tiene prioridad.',
    f:[['prov','Proveedor',0,['=proveedor','nombre proveedor']],['cod','Código artículo',1,['codigo de articulo','codigo articulo','=codigo','=articulo']],['upp','Unidades por pallet',1,['q unds x pallets','q unds x pallet','unidades por pallet','unds x pallet','unidades x pallet','q unidades','=upp']],['desc','Descripción',0,['=descripcion']],['fval','Fecha de validación',0,['fecha validacion']]]},
  mae:{title:'Especie y formato por código',desc:'Clasificación por código: especie y formato (por ejemplo la hoja Calendario Plan). Es la base inicial: lo que edites en Maestro de productos tiene prioridad.',
    f:[['cod','Código artículo',1,['codigo de articulo','codigo articulo','=codigo','=articulo']],['esp','Especie',0,['=especie','nombre especie']],['fmt','Formato',1,['=formato']]]}
};
function vDatos(){
  const dt=S.tab.datos||'cfg';const tb=(k,t)=>`<button data-a="tab" data-t="datos" data-k="${k}" aria-pressed="${dt===k}">${t}</button>`;
  const bar=`<div class="tabs" style="margin-bottom:-4px">${tb('cfg','Carga de datos y configuración')}${tb('hist','Historial de cambios')}</div>`;
  if(dt==='hist')return bar+vHistorial();
  return bar+vDatosCfg();
}
function vDatosCfg(){
  const m=S.meta||{};const c=S.cfg;
  const card=kind=>{const F=FIELDS[kind];const i=m[kind+'Info'];return `<div class="panel"><div class="panel-h"><h2>${F.title}</h2><span class="spacer"></span>${i?`<span class="chip ok">${fmt(i.rows)} filas</span>`:'<span class="chip warn">Sin cargar</span>'}<p>${F.desc}</p></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:8px"><div class="kv">${i?`<span>Archivo <b>${esc(i.file)}</b></span><span>Cargado <b>${fdt(i.at)}</b></span>${i.by?`<span>Por <b>${esc(uname(i.by))}</b></span>`:''}${i.src!=null?`<span>Filas origen <b>${fmt(i.src)}</b></span>`:''}`:''}</div>
   <div class="row"><label class="btn pri" for="file-${kind}" ${S.canWrite?'':'aria-disabled="true"'}>Cargar Excel o CSV</label><input type="file" id="file-${kind}" data-file="${kind}" accept=".xlsx,.xls,.csv" hidden ${S.canWrite?'':'disabled'}><button class="btn sm" data-a="tpl" data-kind="${kind}">Descargar plantilla</button></div>
   <p class="hint">Columnas: ${F.f.map(x=>x[1]+(x[2]?' *':'')).join(' · ')}. Los nombres de columna se detectan solos y puedes ajustarlos antes de importar.</p></div></div>`;};
  const ms=seasonMonths();
  const metas=`<div class="panel"><div class="panel-h"><h2>Metas de avance acumulado (Compromiso Plan)</h2><p>Porcentaje de lo adjudicado que debe llegar en cada mes, por categoría y formato. Deja el formato vacío para que aplique a toda la categoría. Se usa en Avance de entregas, el resumen y el informe al proveedor.</p></div>
   <div class="tw"><table><thead><tr><th>Categoría</th><th>Formato</th>${ms.map(M=>`<th class="num">${ymLabel(M)} %</th>`).join('')}<th class="num">Total</th><th></th></tr></thead><tbody>
   ${(c.metas||[]).map((m,i)=>{const t=sum(Object.values(m.m||{}));return `<tr><td><input type="text" id="mt-c-${i}" data-meta="${i}" data-mf="cat" value="${esc(m.cat)}" style="width:170px"></td><td><input type="text" id="mt-f-${i}" data-meta="${i}" data-mf="fmt" value="${esc(m.fmt||'')}" placeholder="Todos los formatos" style="width:160px"></td>${ms.map(M=>`<td class="num"><input class="posin" type="number" min="0" max="100" id="mt-${i}-${M}" data-meta="${i}" data-mf="${M}" value="${m.m&&m.m[M]!=null?Math.round(m.m[M]*100):''}" aria-label="Meta ${ymLabel(M)}"></td>`).join('')}<td class="num"><b style="color:${Math.abs(t-1)>0.005?'var(--bad)':'inherit'}">${pct(t)}</b></td><td><button class="xbtn" data-a="metaDel" data-i="${i}" aria-label="Quitar meta">✕</button></td></tr>`;}).join('')}
   </tbody></table></div><div class="panel-b"><button class="btn sm" data-a="metaAdd">+ Agregar meta</button></div></div>`;
  const calCard=`<div class="panel"><div class="panel-h"><h2>Calendario de entregas (Excel)</h2><span class="spacer"></span>${m.calInfo?`<span class="chip ok">${fmt(m.calInfo.rows)} compromisos</span>`:''}<p>Carga los calendarios que se llevaban en Excel (una hoja por especie: Proveedor, Código, Descripción y columnas SEM 44, SEM 45…). Cada cantidad se convierte en un compromiso de esa semana sobre la línea de OC del mismo código y proveedor. Carga primero las OC.</p></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:8px"><div class="kv">${m.calInfo?`<span>Archivo <b>${esc(m.calInfo.file)}</b></span><span>Cargado <b>${fdt(m.calInfo.at)}</b></span>`:''}</div>
   <div class="row"><label class="btn pri" for="file-cal" ${S.canWrite&&S.ix.lines.length?'':'aria-disabled="true"'}>Cargar calendario Excel</label><input type="file" id="file-cal" data-file="cal" accept=".xlsx,.xls" hidden ${S.canWrite&&S.ix.lines.length?'':'disabled'}></div>
   ${S.ix.lines.length?'':'<p class="hint">Primero carga el detalle de órdenes de compra.</p>'}</div></div>`;
  return `<div class="grid2">${card('oc')}${card('rec')}</div><div class="grid2">${card('pal')}${card('mae')}</div>${calCard}${metas}
  <div class="panel"><div class="panel-h"><h2>Reglas de medición</h2></div><div class="panel-b" style="display:flex;flex-direction:column;gap:14px">
    <div class="fgrid">
      <div class="field"><label for="c-tu">% bajo calendario (IF)</label><input id="c-tu" type="number" min="0" max="100" step="1" data-cfg="tolUnder" value="${Math.round(c.tolUnder*100)}"><small>Se acepta recibir hasta este % menos.</small></div>
      <div class="field"><label for="c-to">% sobre calendario (IF)</label><input id="c-to" type="number" min="0" max="100" step="1" data-cfg="tolOver" value="${Math.round(c.tolOver*100)}"><small>Se acepta recibir hasta este % más.</small></div>
      <div class="field"><label for="c-om">Meta OTIF (%)</label><input id="c-om" type="number" min="1" max="100" step="1" data-cfg="otifMeta" value="${Math.round(MO()*100)}"><small>Línea punteada y color verde en gráficos, tablas e informes.</small></div>
      <div class="field"><label for="c-oa">Umbral de alerta OTIF (%)</label><input id="c-oa" type="number" min="1" max="100" step="1" data-cfg="otifAlerta" value="${Math.round(MA()*100)}"><small>Bajo este valor se marca en rojo; entre este y la meta, en amarillo.</small></div>
      <div class="field"><label for="c-wf">Inicio de temporada</label><select id="c-wf" data-cfg="wFrom">${wkOptions(c.wFrom,(c.year-1)*100+40)}</select></div>
      <div class="field"><label for="c-wt">Fin de temporada</label><select id="c-wt" data-cfg="wTo">${wkOptions(c.wTo,(c.year-1)*100+40)}</select></div>
    </div>
    <div><h3 style="margin-bottom:6px">Responsables de cambios</h3><p class="hint">Si el responsable penaliza, el compromiso original se evalúa contra el proveedor y lo reprogramado se mide como nuevo. Si no, el original queda informativo.</p>
     <div class="tw"><table><thead><tr><th>Responsable</th><th>Penaliza al proveedor</th><th></th></tr></thead><tbody>
     ${c.resp.map((r,i)=>`<tr><td><input type="text" id="rs-n-${i}" data-resp="name" data-i="${i}" value="${esc(r.name)}"></td><td><input class="cbx" type="checkbox" id="rs-p-${i}" data-resp="pen" data-i="${i}" ${r.pen?'checked':''} aria-label="Penaliza"></td><td><button class="xbtn" data-a="respDel" data-i="${i}" aria-label="Quitar">✕</button></td></tr>`).join('')}
     </tbody></table></div><button class="btn sm" data-a="respAdd" style="margin-top:6px">+ Agregar responsable</button></div>
    <div class="field"><label for="c-mot">Motivos de cambio (uno por línea)</label><textarea id="c-mot" rows="6" data-cfg="motivos">${esc(c.motivos.join('\n'))}</textarea></div>
  </div></div>
  <div class="panel"><div class="panel-h"><h2>Familias Softland</h2><p>Al importar el informe de OC de Softland, cada familia (columna Producto, ej. 20039) se traduce a una categoría de esta herramienta. Las familias sin regla se clasifican por palabras clave de la descripción o quedan como "Familia N".</p></div>
   <div class="tw"><table><thead><tr><th>Familia</th><th>Categoría</th><th></th></tr></thead><tbody>
   ${Object.entries(c.fams||{}).map(([f,cat],i)=>`<tr><td><input type="text" id="fm-f-${i}" data-fam="f" data-i="${i}" value="${esc(f)}" style="width:120px"></td><td><input type="text" id="fm-c-${i}" data-fam="c" data-i="${i}" value="${esc(cat)}"></td><td><button class="xbtn" data-a="famDel" data-f="${esc(f)}" aria-label="Quitar">✕</button></td></tr>`).join('')}
   </tbody></table></div><div class="panel-b"><button class="btn sm" data-a="famAdd">+ Agregar familia</button></div></div>
  <div class="panel"><div class="panel-h"><h2>Plantas y posiciones</h2><p>Los códigos de almacén del sistema de compras se asocian a cada planta para leer las recepciones. Capacidad, ocupación inicial (al inicio de temporada) y consumo estimado alimentan la ocupación de posiciones. Los pallets o unidades por posición se definen por insumo en el Maestro de productos.</p></div>
   <div class="tw"><table><thead><tr><th>Planta</th><th>Códigos de almacén</th><th class="num">Capacidad (pos.)</th><th class="num">Ocupadas al inicio</th><th class="num">Consumo semanal estimado</th><th></th></tr></thead><tbody>
   ${c.plants.map((p,i)=>`<tr><td><input type="text" id="pl-n-${i}" data-plant="name" data-i="${i}" value="${esc(p.name)}"></td><td><input type="text" id="pl-a-${i}" data-plant="alm" data-i="${i}" value="${esc((p.alm||[]).join(', '))}" placeholder="111, 112"></td>
     <td class="num"><input class="posin" type="number" id="pl-c-${i}" data-plant="cap" data-i="${i}" value="${p.cap}"></td><td class="num"><input class="posin" type="number" id="pl-i-${i}" data-plant="init" data-i="${i}" value="${p.init||0}"></td><td class="num"><input class="posin" type="number" id="pl-o-${i}" data-plant="out" data-i="${i}" value="${p.out||0}"></td><td><button class="xbtn" data-a="plantDel" data-i="${i}" aria-label="Quitar planta">✕</button></td></tr>`).join('')}
   </tbody></table></div><div class="panel-b"><button class="btn sm" data-a="plantAdd">+ Agregar planta</button></div></div>
  <div class="panel"><div class="panel-h"><h2>Conexión</h2><span class="spacer"></span><span class="chip ${S.mode==='db'?(S.spError?'bad':'ok'):'info'}">${S.mode==='db'?(S.spError?'Sin conexión':'Conectado · '+esc(S.me.name||'')):'Modo local'}</span></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:10px"><p class="hint" style="margin:0">Los datos compartidos viven en listas <span class="mono">EN_*</span> del sitio de SharePoint indicado; cada persona entra con su sesión de Microsoft 365 (la extensión usa una pestaña de SharePoint abierta). El modo local guarda solo en este navegador.</p>
   <div class="fgrid"><div class="field"><label for="sp-modo">Modo</label><select id="sp-modo" data-spcfg="modo"><option value="sp" ${spCfg().modo==='sp'?'selected':''}>SharePoint (compartido)</option><option value="local" ${spCfg().modo==='local'?'selected':''}>Local (este navegador)</option></select></div>
   <div class="field" style="grid-column:span 2"><label for="sp-site">Sitio de SharePoint</label><input id="sp-site" type="text" data-spcfg="site" value="${esc(spCfg().site)}"></div></div>
   <div class="row"><button class="btn pri sm" data-a="spReconnect">Guardar y reconectar</button><button class="btn sm" data-a="spRefresh">Actualizar datos</button><button class="btn sm" data-a="spOpen">Abrir SharePoint</button>${IS_EXT?'':'<button class="btn sm" data-a="spLogout">Cerrar sesión Microsoft</button>'}</div>
   <p class="hint" style="margin:0">${IS_EXT?'':'En la app web/celular se entra con la cuenta Microsoft de C&L; los datos se leen por Microsoft Graph. '}No hace falta mantener SharePoint abierto: la extensión abre sola una pestaña del sitio en segundo plano y la usa. "Abrir SharePoint" sirve para iniciar sesión cuando aparece "Sin conexión".</p></div></div>
  <div class="panel"><div class="panel-h"><h2>Mantención</h2></div><div class="panel-b row">
      <button class="btn" data-a="bkExport">Respaldar datos (JSON)</button><label class="btn" for="file-bk">Restaurar respaldo</label><input type="file" id="file-bk" data-bkfile="1" accept=".json" hidden>
   <button class="btn danger" data-a="clearAsk" ${S.canWrite?'':'disabled'}>Borrar todos los datos</button>
   <span class="hint">Al cargar un nuevo detalle de OC, los compromisos ya agendados se conservan por OC + código.</span></div></div>`;
}

/* --- Importación --- */
const SHEET_HINT={oc:['BD PEDIDOS','BBDDOC','PEDIDOS COMPRA','PEDIDOS','COMPRA'],rec:['BD RECEPCIONES','TRANSACCIONES','RECEPCION'],pal:['Q POSICIONES','PALLET','POSICIONES','MANTENEDOR'],mae:['CALENDARIO PLAN','MAESTRO','PRODUCTOS']};
const PACK_RX=/CAJA|CARTON|BOLSA|ADHESIV|PALETIZ|CONSOLIDA|SEPARADOR|BOBINA|BANDEJA|POCILLO|CLAMSHELL|ESQUINER|EMBALAJE|COSECHERA|MINIBIN|ETIQUETA/;
async function readBook(file){
  const buf=await file.arrayBuffer();let names=null;
  try{names=XLSX.read(buf,{type:'array',bookSheets:true}).SheetNames;}catch(e){}
  return {buf,names:names&&names.length?names:['Hoja1']};
}
function parseSheet(buf,name){
  const wb=XLSX.read(buf,{type:'array',sheets:[name],cellDates:true,dense:true,cellHTML:false,cellText:false,cellFormula:false,cellStyles:false});
  const ws=wb.Sheets[name]||wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
}
/* Informe de Softland "Órdenes de Compra con detalle de Productos": cabecera por OC y líneas debajo → tabla plana */
function isSoftlandOC(rows){return rows.slice(0,20).some(r=>r&&r.some(c=>/ORDENES DE COMPRA/.test(norm(c))))||rows.slice(0,20).some(r=>r&&norm(r[0])==='N ORDEN'&&norm(r[1])==='ESTADO');}
const isDateStr=v=>typeof v==='string'&&/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(v.trim());
function flattenSoftlandOC(rows){
  const out=[['Orden de compra','Estado','Etapa','Fecha pedido','Fecha entrega OC','Proveedor','Moneda','Total OC','Línea','Código artículo','Producto','Familia Softland','Categoría','U.Medida','Cantidad','Precio unitario','Subtotal','Cantidad pendiente','Fecha entrega','Estado de línea']];
  let cur=null,hasPend=false;
  for(const r of rows){if(!r)continue;const cells=r.map(c=>typeof c==='string'?c.trim():c);
    const a=norm(cells[0]);
    if(a==='N ORDEN')continue;
    if(cells.some(c=>norm(c)==='LINEA')){hasPend=cells.some(c=>/^CANT\.?\s*PEND/.test(norm(c)));continue;}
    const ocNum=cells[0]!=null&&/^\d+$/.test(String(cells[0]).trim());
    if(ocNum&&typeof cells[1]==='string'&&/^(APROBADA|PENDIENTE|NULA|ANULADA|RECHAZADA|CERRADA|EMITIDA)/.test(norm(cells[1]))){
      const mon=cells.slice(6).find(c=>typeof c==='string'&&/^(\$|US|USD|UF|EUR)$/.test(c.trim()))||'';
      cur={oc:String(cells[0]).trim(),est:String(cells[1]),etapa:String(cells[2]??'').trim(),fe:cells[3],fent:cells[4],prov:String(cells[5]??'').trim(),mon,tot:cells[11]??cells[8]};continue;}
    if(!cur||typeof cells[0]!=='number')continue;
    /* línea de detalle: nº línea, código, descripción, [..], unidad, números… */
    const vals=cells.slice(1).filter(c=>c!=null&&c!=='');
    if(vals.length<4)continue;
    const fam=String(vals[0]).trim();let desc=String(vals[1]??'').trim();
    let ui=vals.findIndex((c,i)=>i>=2&&typeof c==='string'&&/^[A-Z]{1,4}\.?$/.test(c.trim()));
    if(ui<0){ui=2;}else if(ui>2){desc=vals.slice(1,ui).map(String).join(' ').trim();}
    const um=ui>=2&&typeof vals[ui]==='string'?vals[ui]:'';
    const rest=vals.slice(um?ui+1:ui);const nums=rest.filter(c=>typeof c==='number');const fechaEnt=rest.find(isDateStr)||cur.fent;
    const qty=nums[0]??0,punit=nums[1]??0,sub=nums[2]??0,pend=hasPend?(nums[3]??''):'';
    const m=desc.match(/^(\d{6,})\s+(.*)$/);const realCode=/^\d{6,}$/.test(fam);
    const prevL=(S.ix&&S.ix.lines||[]).find(l=>l.oc===cur.oc&&dNorm(l.prod)===dNorm(m?m[2]:desc));
    const cod=realCode?fam:(prevL?prevL.cod:(m?m[1]:(itemCodeFor(desc)||desc.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ]+/g,' ').trim().slice(0,60))));
    if(realCode)itemLearn(fam,desc);
    const est=/NUL|ANUL|RECHAZ/.test(norm(cur.est))?'Cancelada':(hasPend&&pend!==''&&pend<=0?'RECEPCION COMPLETA':(cur.etapa||cur.est));
    out.push([cur.oc,cur.est,cur.etapa,cur.fe,cur.fent,cur.prov,cur.mon,cur.tot,cells[0],cod,m?m[2]:desc,realCode?'':fam,famCat(realCode?'':fam,desc),um,qty,punit,sub,pend,fechaEnt,est]);
  }
  return out;
}
/* Categoría para el filtro de importación: familia Softland (configurable en Configuración → Familias) o, si no, palabra clave de la descripción */
function famCat(fam,desc){const fc=fam?(S.cfg.fams||{})[fam]:'';if(fc)return fc;const d=norm(desc);
  for(const [rx,c] of [[/CAJA|CARTON|FONDO|TAPA|BANDEJA|CLAMSHELL|POCILLO|ESTUCHE/,'CAJAS DE CARTON'],[/BOLSA|FILM|ATMOSFERA|MAP|LINER/,'BOLSAS'],[/ETIQUETA|STICKER|TARJETA|ADHESIV|CINTA/,'ETIQUETAS Y ADHESIVOS'],[/PALLET|ESQUINER|ZUNCHO|SELLO|GRAPA|PALETIZ/,'MATERIAL DE PALLET'],[/MALLA|ENMALLAD/,'MALLAS'],[/SERVICIO|FLETE|TRASLADO|ARRIENDO|MANTENCION|REPARACION|TRANSPORTE/,'SERVICIOS']])if(rx.test(d))return c;
  return fam?'Familia '+fam:'OTROS';}
/* Diccionario de ítems (código ↔ descripción) que se alimenta con compras y calendarios; se usa para dar código a las líneas del informe de OC */
const dNorm=s=>norm(s).replace(/[^A-Z0-9]+/g,' ').trim();
function itemsDict(){S.cfg.items=S.cfg.items||{};return S.cfg.items;}
function itemLearn(cod,desc){if(!cod||!desc)return;const d=itemsDict();const c=String(cod).trim(),k=dNorm(desc);if(!k)return;if(!d[k])d[k]=c;}
function itemCodeFor(desc){const d=itemsDict();return d[dNorm(desc)]||'';}
/* Informe de Softland "Compras por Proveedor" (facturas/guías por producto) → recepciones */
function isSoftlandCompras(rows){return rows.slice(0,8).some(r=>r&&r.some(c=>/COMPRAS POR PROVEEDOR/.test(norm(c))))||rows.slice(0,10).some(r=>r&&norm(r[0])==='PROVEEDOR'&&norm(r[1])==='NOMBRE PROVEEDOR'&&/O\s*\/?\s*C/.test(norm(r[4])));}
function flattenSoftlandCompras(rows){
  let bod='';for(const r of rows.slice(0,8)){const m=/BODEGA\s*:\s*(.*)$/i.exec(String((r||[])[0]||''));if(m)bod=m[1].trim();}
  const pl=!bod||/TODAS/i.test(bod)?(S.cfg.plants[0]?.name||'Bodega C&L'):bod;
  const out=[['Orden de compra','Código artículo','Descripción','Planta','Fecha de recepción','Cantidad recibida','Proveedor','Guía','RUT proveedor','Precio unitario']];
  let on=false;
  for(const r of rows){if(!r)continue;if(norm(r[0])==='PROVEEDOR'&&norm(r[1])==='NOMBRE PROVEEDOR'){on=true;continue;}if(!on)continue;
    if(r[5]==null||r[7]==null||String(r[5]).trim()==='')continue;const oc=r[4]!=null&&String(r[4]).trim()!=='0'&&String(r[4]).trim()!==''?String(r[4]).trim():'';
    if(/^\d{4,}$/.test(String(r[5]).trim()))itemLearn(r[5],r[6]);
    out.push([oc,String(r[5]).trim(),String(r[6]??'').trim(),pl,r[3],r[7],String(r[1]??'').trim(),r[2]!=null&&String(r[2])!=='0'?String(r[2]):'',String(r[0]??'').trim(),r[8]]);}
  return out;
}
/* Recepciones sin OC: se asignan a las líneas de OC abiertas del mismo código (misma empresa si se puede), de la más antigua a la más nueva */
const provTok=s=>new Set(dNorm(s).split(' ').filter(w=>w.length>2&&!['SPA','LTDA','S','A','SA','LIMITADA','CHILE','Y','E','DE','LOS','LAS','DEL','SOCIEDAD','COMERCIAL','INDUSTRIAL'].includes(w)));
function provMatch(a,b){if(!a||!b)return false;const A=dNorm(a),B=dNorm(b);if(A===B||A.includes(B)||B.includes(A))return true;const ta=provTok(a),tb=provTok(b);for(const w of ta)if(tb.has(w))return true;const al=(S.cfg.provAlias||{});for(const [k,v] of Object.entries(al)){if((dNorm(k)===A&&provMatch(v,b))||(dNorm(k)===B&&provMatch(v,a)))return true;}return false;}
function linesForCod(cod,desc,prov){
  const c=norm(cod);let ls=S.ix.lines.filter(l=>norm(l.cod)===c);
  if(!ls.length&&desc){const dn=dNorm(desc);ls=S.ix.lines.filter(l=>dNorm(l.prod)===dn||dNorm(l.cod)===dn);}
  if(ls.length>1&&prov){const pm=ls.filter(l=>provMatch(l.prov,prov));if(pm.length)ls=pm;}
  return ls.filter(l=>l.st!=='Cancelada').sort((a,b)=>(a.fw||0)-(b.fw||0)||(a.oc<b.oc?-1:1));
}
function pickSheet(names,kind){const N=names.map(n=>norm(n));for(const h of SHEET_HINT[kind]){const i=N.findIndex(n=>n.includes(norm(h)));if(i>=0)return i;}return 0;}
function detectHeader(rows,kind){
  const syn=FIELDS[kind].f.flatMap(f=>f[3]).map(s=>s.replace(/^=/,''));let best=0,bi=0;
  for(let i=0;i<Math.min(rows.length,25);i++){const r=rows[i]||[];let s=0;for(const c of r){const n=norm(c).toLowerCase();if(n&&syn.some(x=>n===x||n.includes(x)))s++;}if(s>best){best=s;bi=i;}}
  return bi;
}
function autoMap(headers,kind){
  const H=headers.map(h=>norm(h).toLowerCase());const map={};const used=new Set();
  for(const [key,,,syn] of FIELDS[kind].f){
    let idx=-1;
    for(const s0 of syn){const s=s0.replace(/^=/,'');idx=H.findIndex((h,i)=>!used.has(i)&&h===s);if(idx>=0)break;}
    if(idx<0)for(const s0 of syn){if(s0[0]==='=')continue;idx=H.findIndex((h,i)=>!used.has(i)&&h&&h.includes(s0));if(idx>=0)break;}
    if(idx>=0){map[key]=idx;used.add(idx);}
  }
  return map;
}
function toNum(v){if(v==null||v==='')return 0;if(typeof v==='number')return v;let s=String(v).trim().replace(/\s/g,'');if(/,\d{1,2}$/.test(s)&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');else s=s.replace(',','.');const n=parseFloat(s);return isNaN(n)?0:n;}
function toDate(v){
  if(v instanceof Date&&!isNaN(v))return v;
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());}
  if(typeof v==='string'){const s=v.trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1]);}}
  return null;
}
function toWeek(v){if(v==null||v==='')return null;const s=String(v).toUpperCase();let m=s.match(/(\d{4})\D*W?(\d{1,2})$/);if(m)return +m[1]*100+ +m[2];m=s.match(/W?(\d{1,2})/);if(m){const w=+m[1];if(w<1||w>53)return null;const y=Math.floor(S.cfg.wFrom/100);return (w<(S.cfg.wFrom%100)-20?y+1:y)*100+w;}return null;}
const cell=(r,g,k)=>g[k]!=null&&g[k]!==''?r[+g[k]]:null;
function catCounts(M){const m=new Map();if(M.map.cat==null)return m;for(const r of M.rows.slice(M.hdr+1)){if(!r)continue;const c=String(cell(r,M.map,'cat')??'').trim()||'Sin categoría';m.set(c,(m.get(c)||0)+1);}return m;}
function defaultOpt(kind,M){
  if(kind==='oc'){const cc=catCounts(M);const cats={};const all=cc.size<=8;for(const c of cc.keys())cats[c]=M.soft?!/^SERVICIOS$|^Familia /.test(c):(all||PACK_RX.test(norm(c)));return {cats,desde:(S.cfg.year-1)+'-10-01'};}
  if(kind==='rec')return {onlyKnown:S.oc.length>0};
  return {};
}
function buildRows(kind,M){
  const rows=M.rows.slice(M.hdr+1);const g=M.map;const o=M.opt||{};const v=(r,k)=>cell(r,g,k);
  if(kind==='oc'){
    const agg=new Map();let src=0,skipCat=0,skipOld=0;const desde=o.desde?toDate(o.desde):null;
    for(const r of rows){if(!r)continue;const oc=v(r,'oc'),cod=v(r,'cod');if(oc==null||cod==null||String(oc).trim()===''||String(cod).trim()==='')continue;
      const cat=String(v(r,'cat')??'').trim()||'Sin categoría';
      if(g.cat!=null&&o.cats&&o.cats[cat]===false){skipCat++;continue;}
      if(desde&&g.fecha!=null){const d=toDate(v(r,'fecha'));if(d&&d<desde){skipOld++;continue;}}
      src++;const k=segSafe(String(oc).trim())+'~'+segSafe(String(cod).trim());const q=toNum(v(r,'qty'));const pr=toNum(v(r,'precio'));
      const fd=g.fecha!=null?toDate(v(r,'fecha')):null;const fw=fd?ywOf(fd):0;
      const x=agg.get(k);
      if(x){x.qty+=q;if(lineState(v(r,'est'))==='Abierta')x.est=v(r,'est')||x.est;if(!x.precio&&pr)x.precio=pr;if(fw&&(!x.fw||fw<x.fw))x.fw=fw;}
      else{const fe=g.fent!=null?toDate(v(r,'fent')):null;agg.set(k,{k,fw,oc:String(oc).trim(),cod:String(cod).trim(),prod:String(v(r,'prod')??'').trim(),prov:String(v(r,'prov')??'').trim(),cat,qty:q,est:String(v(r,'est')??'').trim(),alm:String(v(r,'alm')??'').trim(),esp:String(v(r,'esp')??'').trim(),precio:pr||0,fent:fe?fe.toISOString().slice(0,10):'',pend:g.pend!=null&&v(r,'pend')!==''&&v(r,'pend')!=null?toNum(v(r,'pend')):null});}}
    const all=[...agg.values()];const out=all.filter(x=>x.qty>0);
    return {rows:out,src,skipCat,skipOld,neg:all.length-out.length};
  }
  if(kind==='rec'){
    const agg=new Map();let src=0,skip=0,skipTipo=0,skipUnk=0;const known=o.onlyKnown&&S.ix&&Object.keys(S.ix.byK).length;
    let noOC=0,asig=0;const used=new Map();const rem=l=>(+l.qty||0)-(used.get(l.k)||0);
    const sorted=rows.filter(Boolean).map(r=>({r,d:toDate(v(r,'fecha'))})).sort((a,b)=>(a.d?a.d.getTime():0)-(b.d?b.d.getTime():0));
    const push=(oc,cod,prov,pl,wk,q,gu)=>{const k=segSafe(String(oc).trim())+'~'+segSafe(String(cod).trim());const key=k+'|'+pl+'|'+wk;const x=agg.get(key);if(x){x.qty+=q;x.n++;if(gu&&x.g.length<5&&!x.g.includes(gu))x.g.push(gu);}else agg.set(key,{k,oc:String(oc).trim(),cod:String(cod).trim(),prov,pl,wk,qty:q,n:1,g:gu?[gu]:[]});};
    for(const {r,d} of sorted){let oc=v(r,'oc');const cod=v(r,'cod');if(cod==null||String(cod).trim()==='')continue;oc=oc==null?'':String(oc).trim();if(oc==='0')oc='';
      if(g.tipo!=null){const t=norm(v(r,'tipo'));if(t&&!t.includes('PEDIDO')){skipTipo++;continue;}}
      let wk=null;if(d)wk=ywOf(d);else wk=toWeek(v(r,'wk'));
      if(!wk){skip++;continue;}
      const pl=plantOf(v(r,'pl'))||String(v(r,'pl')??'').trim()||'Sin almacén';const q=toNum(v(r,'qty'));const gu=v(r,'guia')!=null?String(v(r,'guia')).trim():'';const prov=String(v(r,'prov')??'').trim();
      if(!oc){const ls=linesForCod(cod,g.desc!=null?v(r,'desc'):'',prov);if(!ls.length){noOC++;continue;}
        let rest=q;for(let i=0;i<ls.length&&rest>1e-9;i++){const l=ls[i];const cap=i===ls.length-1?rest:Math.min(rest,Math.max(0,rem(l)));if(cap<=0)continue;used.set(l.k,(used.get(l.k)||0)+cap);push(l.oc,l.cod,prov||l.prov,pl,wk,cap,gu);rest-=cap;}
        src++;asig++;continue;}
      const k=segSafe(oc)+'~'+segSafe(String(cod).trim());
      if(known&&!S.ix.byK[k]){skipUnk++;continue;}
      src++;const l=S.ix.byK[k];if(l)used.set(l.k,(used.get(l.k)||0)+q);push(oc,cod,prov,pl,wk,q,gu);}
    const all=[...agg.values()];const out=all.filter(x=>Math.abs(x.qty)>1e-9);
    return {rows:out,src,skip,skipTipo,skipUnk,noOC,asig,zero:all.length-out.length};
  }
  if(kind==='mae'){const m=new Map();for(const r of rows){if(!r)continue;const cod=v(r,'cod');if(!cod)continue;const fmt=String(v(r,'fmt')??'').trim(),esp=String(v(r,'esp')??'').trim();if(!fmt&&!esp)continue;m.set(norm(cod),{cod:String(cod).trim(),fmt,esp});}return {rows:[...m.values()],src:m.size};}
  const out=[];for(const r of rows){if(!r)continue;const cod=v(r,'cod');const u=toNum(v(r,'upp'));if(!cod||!u)continue;const fv=toDate(v(r,'fval'));out.push({prov:String(v(r,'prov')??'').trim(),cod:String(cod).trim(),upp:u,desc:String(v(r,'desc')??'').trim(),fval:fv?fv.toISOString().slice(0,10):''});}
  return {rows:out,src:out.length};
}
function dMap(){
  const M=D.M;const kind=D.kind;const F=FIELDS[kind];const headers=(M.rows[M.hdr]||[]).map(h=>h==null?'':String(h));
  const missing=F.f.filter(f=>f[2]&&(M.map[f[0]]==null||M.map[f[0]]===''));
  if(kind==='rec'&&(M.map.fecha==null||M.map.fecha==='')&&(M.map.wk==null||M.map.wk===''))missing.push(['fecha','Fecha de recepción o semana']);
  if(kind==='rec'&&(M.map.oc==null||M.map.oc==='')&&!S.ix.lines.length)missing.push(['oc','Orden de compra (o carga antes las OC para asignar por código)']);
  let prev='';let unmapped=[];let optHtml='';
  if(kind==='oc'&&M.map.cat!=null){const cc=catCounts(M);const cats=M.opt.cats||{};
    optHtml+=`<div class="box"><div class="row"><h3>Categorías a incluir</h3><span class="spacer"></span><button class="btn ghost sm" data-a="mcatAll" data-v="1">Todas</button><button class="btn ghost sm" data-a="mcatAll" data-v="0">Ninguna</button><button class="btn ghost sm" data-a="mcatAll" data-v="pack">Solo embalaje</button></div>
      <div style="max-height:180px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 12px">${[...cc.entries()].sort((a,b)=>b[1]-a[1]).map(([c,n],i)=>`<label style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input class="cbx" type="checkbox" id="mc-${i}" data-mcat="${esc(c)}" ${cats[c]!==false?'checked':''}>${esc(c)} <span class="muted">(${fmt(n)})</span></label>`).join('')}</div></div>`;}
  if(kind==='oc'&&M.map.fecha!=null)optHtml+=`<div class="field"><label for="m-desde">Solo OC con fecha desde</label><input id="m-desde" type="text" data-mopt="desde" value="${esc(M.opt.desde||'')}" placeholder="AAAA-MM-DD"><small>Deja vacío para traer todas las fechas.</small></div>`;
  if(kind==='rec'&&S.oc.length)optHtml+=`<label style="display:flex;gap:8px;align-items:center"><input class="cbx" type="checkbox" id="m-known" data-mopt="onlyKnown" ${M.opt.onlyKnown?'checked':''}>Solo recepciones de las OC cargadas (recomendado: descarta otras categorías y temporadas)</label>`;
  if(!missing.length){try{const b=buildRows(kind,M);D.built=b;
      const info=[`<span>Filas leídas <b>${fmt(b.src)}</b></span>`,`<span>${kind==='oc'?'Líneas OC + código':kind==='rec'?'Grupos OC + código + planta + semana':'Registros'} <b>${fmt(b.rows.length)}</b></span>`];
      if(b.skipCat)info.push(`<span>Otras categorías <b>${fmt(b.skipCat)}</b></span>`);if(b.skipOld)info.push(`<span>Anteriores a la fecha <b>${fmt(b.skipOld)}</b></span>`);if(b.neg)info.push(`<span>Líneas con cantidad 0 o negativa <b>${fmt(b.neg)}</b></span>`);
      if(b.skipUnk)info.push(`<span>De otras OC <b>${fmt(b.skipUnk)}</b></span>`);if(b.asig)info.push(`<span>Sin OC, asignadas por código <b>${fmt(b.asig)}</b></span>`);if(b.noOC)info.push(`<span style="color:var(--bad)">Sin OC y sin línea de OC con ese código <b>${fmt(b.noOC)}</b></span>`);if(b.skipTipo)info.push(`<span>No son pedidos de compra <b>${fmt(b.skipTipo)}</b></span>`);if(b.skip)info.push(`<span style="color:var(--bad)">Sin fecha válida <b>${fmt(b.skip)}</b></span>`);if(b.zero)info.push(`<span>Anuladas por reversa <b>${fmt(b.zero)}</b></span>`);
      const cols=Object.keys(b.rows[0]||{}).filter(x=>x!=='k'&&x!=='g');
      prev=`<div class="kv">${info.join('')}</div><div class="tw"><table class="prev"><thead><tr>${cols.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${b.rows.slice(0,5).map(r=>`<tr>${cols.map(x=>{const y=r[x];return `<td>${x==='wk'?wLabel(y):typeof y==='number'?fmt(y):esc(y)}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
      if(kind==='rec'){const known=new Set(S.cfg.plants.map(p=>p.name));unmapped=[...new Set(b.rows.map(r=>r.pl))].filter(p=>p&&!known.has(p));}
    }catch(e){prev=`<div class="err-msg">${esc(e.message)}</div>`;}}
  return {title:'Importar: '+F.title,sub:esc(D.file),
   body:`${M.names.length>1?`<div class="field"><label for="m-sh">Hoja</label><select id="m-sh" data-m="si">${M.names.map((s,i)=>`<option value="${i}" ${i===M.si?'selected':''}>${esc(s)}</option>`).join('')}</select></div>`:''}
   <div class="field"><label for="m-hdr">Fila de encabezados</label><select id="m-hdr" data-m="hdr">${M.rows.slice(0,25).map((r,i)=>`<option value="${i}" ${i===M.hdr?'selected':''}>Fila ${i+1}: ${esc((r||[]).filter(x=>x!=null).slice(0,4).join(' | ').slice(0,60))}</option>`).join('')}</select></div>
   <div><h3 style="margin-bottom:6px">Columnas</h3><table class="map-tbl"><tbody>${F.f.map(([k,t,req])=>`<tr><td><label for="m-c-${k}">${t}${req?' *':''}</label></td><td><select id="m-c-${k}" data-mc="${k}"><option value="">— No usar —</option>${headers.map((h,i)=>h?`<option value="${i}" ${String(M.map[k])===String(i)?'selected':''}>${esc(h)}</option>`:'').join('')}</select></td></tr>`).join('')}</tbody></table></div>
   ${optHtml}
   ${missing.length?`<div class="err-msg">Falta asignar: ${missing.map(f=>esc(f[1])).join(', ')}</div>`:prev}
   ${unmapped.length?`<div class="box"><h3>Almacenes sin planta asignada</h3><p class="hint">Asocia cada código de almacén a una planta. Quedará guardado en la configuración.</p>${unmapped.map((u,i)=>`<div class="row"><span class="mono" style="min-width:90px">${esc(u)}</span><select id="m-u-${i}" data-um="${esc(u)}"><option value="">Dejar como planta “${esc(u)}”</option>${S.cfg.plants.map(p=>`<option ${D.um&&D.um[u]===p.name?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>`).join('')}</div>`:''}
   ${M.soft&&kind==='rec'?`<div class="box"><b>Informe de compras de Softland detectado.</b> Cada factura o guía por producto se toma como recepción en su fecha. Las filas sin O/C se asignan a las líneas de OC abiertas del mismo código (misma empresa si se puede), de la más antigua a la más nueva. Bodega “TODAS” se asigna a la primera planta configurada.</div>`:''}
   ${M.soft&&kind==='oc'?`<div class="box"><b>Informe de Softland detectado.</b> Se aplanó la cabecera de cada OC con sus líneas. El código de artículo se toma del número al inicio de la descripción cuando existe; si no, de la descripción. La categoría sale de la familia Softland (editable en Configuración → Familias Softland) o de palabras clave de la descripción. Las OC en estado Nula se marcan canceladas y las etapas de recepción se usan como estado de línea.</div>`:''}
   ${kind==='oc'&&S.ix.lines.length?`<p class="hint">Reemplaza el detalle de OC actual. Los compromisos agendados se conservan si la OC + código sigue existiendo.</p>`:''}
   ${kind==='rec'?`<p class="hint">Reemplaza todas las recepciones cargadas (usa el export acumulado de la temporada). Las salidas o reversas con cantidad negativa se descuentan.</p>`:''}
   ${errBox()}`,
   foot:`<button class="btn" data-a="close">Cancelar</button><button class="btn pri" data-a="doImport" ${missing.length?'disabled':''}>Importar</button>`};
}
async function doImport(){
  const kind=D.kind;
  if(kind==='rec'&&D.um&&Object.keys(D.um).length){
    for(const [alm,pl] of Object.entries(D.um)){if(!pl)continue;const p=S.cfg.plants.find(x=>x.name===pl);if(p){p.alm=[...new Set([...(p.alm||[]),alm])];}}
    await Store.saveCfg();D.built=buildRows(kind,D.M);
  }
  const b=D.built;if(!b||!b.rows.length){D.err='No se encontraron filas válidas con estos filtros.';drawRender();return;}
  if(kind==='rec'&&D.M.map.desc!=null){let n=0;for(const r of D.M.rows.slice(D.M.hdr+1)){if(!r)continue;const c=cell(r,D.M.map,'cod'),d=cell(r,D.M.map,'desc');if(c&&d&&/^\d{4,}$/.test(String(c).trim())){itemLearn(c,d);n++;}}if(n)await Store.saveCfg();}
  const btn=$('[data-a="doImport"]');if(btn){btn.disabled=true;btn.textContent='Importando…';}
  try{
    if(S.meta.example&&(kind==='oc'||kind==='rec')){await Store.clearAll(true);}
    await Store.saveSource(kind,b.rows,{at:nowISO(),file:D.file,rows:b.rows.length,src:b.src,by:S.me.id||'local'});
    if(S.mode!=='db')Store.saveLocal();
    closeDrawer();toast('Importadas '+fmt(b.rows.length)+' filas.');render();
  }catch(e){D.err='No se pudo importar: '+(e.message||e.code||e);drawRender();}
}
/* --- Calendarios Excel (una hoja por especie) → compromisos --- */
function calWeek(h){const m=/^SEM\.?\s*0?(\d{1,2})$/.exec(norm(h).replace(/\s+/g,' ').trim());if(!m)return null;const w=+m[1];if(w<1||w>53)return null;const y=S.cfg.year||Math.floor(CUR/100);const from=(S.cfg.wFrom||y*100+27)%100;return w>=from?y*100+w:(y+1)*100+w;}
function calParse(bk){
  const props=new Map();const sheets=[];
  for(const nm of bk.names){let rows;try{rows=parseSheet(bk.buf,nm);}catch(e){continue;}
    let hi=-1,wk=[];for(let i=0;i<Math.min(rows.length,40);i++){const r=rows[i]||[];const ws=r.map((c,j)=>[calWeek(c),j]).filter(x=>x[0]);if(ws.length>=3&&r.some(c=>/^(CODIGO|CÓDIGO|COD)$/.test(norm(c)))){hi=i;wk=ws;break;}}
    if(hi<0){sheets.push({nm,ok:false});continue;}
    const H=rows[hi].map(c=>norm(c));const ix=re=>H.findIndex(h=>re.test(h));
    const cProv=ix(/^PROVEEDOR/),cCod=ix(/^(CODIGO|COD)$/),cDesc=ix(/^(DESCRIPCION|MATERIAL|PRODUCTO)$/),cOC=ix(/^(OC|O\/C|ORDEN)/);
    let prov='';let n=0;
    for(const r of rows.slice(hi+1)){if(!r)continue;if(cProv>=0&&r[cProv]!=null&&String(r[cProv]).trim())prov=String(r[cProv]).trim();
      const cod=r[cCod];if(cod==null||String(cod).trim()===''||/TOTAL/.test(norm(cod)))continue;
      const desc=cDesc>=0?String(r[cDesc]??'').trim():'';const oc=cOC>=0&&r[cOC]!=null&&String(r[cOC]).trim()!==''?String(r[cOC]).trim():'';
      const key=prov+'|'+String(cod).trim()+'|'+oc;const p=props.get(key)||{prov,cod:String(cod).trim(),desc,oc,wks:{},sheet:nm};
      for(const [yw,j] of wk){const q=toNum(r[j]);if(q>0){p.wks[yw]=(p.wks[yw]||0)+q;}}
      if(Object.keys(p.wks).length){props.set(key,p);n++;}}
    sheets.push({nm,ok:true,n});}
  const out=[...props.values()];
  for(const p of out){itemLearn(p.cod,p.desc);const ls=p.oc?S.ix.lines.filter(l=>l.oc===p.oc&&(norm(l.cod)===norm(p.cod)||dNorm(l.prod)===dNorm(p.desc)||!S.ix.lines.some(x=>x.oc===p.oc&&norm(x.cod)===norm(p.cod)))):linesForCod(p.cod,p.desc,p.prov);
    p.lines=ls;p.tot=sum(Object.values(p.wks));p.sched=ls.filter(l=>activeCommits(planOf(l.k)).length).length;}
  return {sheets,props:out};
}
function dCal(){
  const P=D.P;const ok=P.props.filter(p=>p.lines.length),bad=P.props.filter(p=>!p.lines.length);
  const row=p=>`<tr><td>${esc(p.prov)}</td><td class="mono">${esc(p.cod)}</td><td>${esc(p.desc)}</td><td>${p.oc?esc(p.oc):'<span class="muted">—</span>'}</td><td class="num">${fmt(p.tot)}</td><td class="num">${Object.keys(p.wks).length}</td><td>${p.lines.length?p.lines.map(l=>l.oc).join(', ')+(p.sched?' <span class="chip warn">ya agendada</span>':''):'<span style="color:var(--bad)">sin línea de OC</span>'}</td></tr>`;
  const tbl=rs=>`<div class="tw"><table class="prev"><thead><tr><th>Proveedor</th><th>Código</th><th>Descripción</th><th>OC Excel</th><th class="num">Unidades</th><th class="num">Semanas</th><th>Líneas OC</th></tr></thead><tbody>${rs.map(row).join('')}</tbody></table></div>`;
  return {title:'Importar calendario de entregas',sub:esc(D.file),
   body:`<div class="kv">${P.sheets.map(s=>`<span>${esc(s.nm)} <b>${s.ok?fmt(s.n)+' filas':'sin formato de calendario'}</b></span>`).join('')}</div>
   <div class="field"><label for="cal-pl">Planta de entrega</label><select id="cal-pl" data-calpl="1">${S.cfg.plants.map(p=>`<option ${p.name===D.pl?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
   <label style="display:flex;gap:8px;align-items:center"><input class="cbx" type="checkbox" id="cal-rep" data-calrep="1" ${D.rep?'checked':''}>Reemplazar los compromisos ya agendados de estas líneas (si no, esas líneas se saltan)</label>
   <h3>Se agendarán (${fmt(ok.length)} ítems · ${fmt(sum(ok,p=>p.tot))} unidades)</h3>${ok.length?tbl(ok):'<p class="hint">Nada que agendar.</p>'}
   ${bad.length?`<h3 style="color:var(--bad)">Sin línea de OC (${fmt(bad.length)} ítems · ${fmt(sum(bad,p=>p.tot))} unidades)</h3><p class="hint">No hay una OC cargada con ese código o descripción y proveedor. Carga el informe de OC de Softland que las incluya (rango de fechas más amplio) y vuelve a importar el calendario.</p>${tbl(bad)}`:''}
   <p class="hint">Las cantidades de cada semana se reparten entre las líneas de OC del mismo código, de la más antigua a la más nueva, según lo pendiente de cada una; el sobrante queda en la última. Las semanas ya pasadas se agendan igual para medir el OTIF histórico contra las recepciones.</p>${errBox()}`,
   foot:`<button class="btn" data-a="close">Cancelar</button><button class="btn pri" data-a="doCal" ${ok.length?'':'disabled'}>Importar calendario</button>`};
}
async function doCalImport(){
  const P=D.P;const pl=D.pl||S.cfg.plants[0]?.name||'Bodega C&L';const ctx={t:nowISO(),by:S.me.id||'local'};const touched=new Set();let n=0,skip=0;
  const btn=$('[data-a="doCal"]');if(btn){btn.disabled=true;btn.textContent='Importando…';}
  try{
    for(const p of P.props){if(!p.lines.length)continue;
      const ls=p.lines.filter(l=>D.rep||!activeCommits(planOf(l.k)).length);if(!ls.length){skip++;continue;}
      if(D.rep)for(const l of ls){const pp=ensurePlan(l.k);for(const c of activeCommits(pp)){c.st='anulada';logE(pp,{act:'anular',cid:c.id,wk:c.wk,pl:c.pl,field:'Compromiso',before:c.qty,after:0,note:'Reemplazado por calendario Excel '+D.file},ctx);}}
      const rem=new Map(ls.map(l=>[l.k,pendingOf(l,ensurePlan(l.k))]));
      const weeks=Object.keys(p.wks).map(Number).sort((a,b)=>a-b);
      for(const wk of weeks){let q=Math.round(p.wks[wk]);
        for(let i=0;i<ls.length&&q>0;i++){const l=ls[i];const cap=i===ls.length-1?q:Math.min(q,Math.max(0,rem.get(l.k)));if(cap<=0)continue;
          addCommits(l.k,[{wk,pl,qty:cap}],{src:'plan',allowOver:true,allowPast:true,note:'Calendario Excel · hoja '+p.sheet},ctx);rem.set(l.k,rem.get(l.k)-cap);q-=cap;touched.add(l.k);n++;}}
    }
    rebuild();for(const k of touched)await Store.savePlan(k);
    S.meta={...S.meta,calInfo:{at:nowISO(),file:D.file,rows:n}};if(S.mode==='db')await BK.upsert('EN_Parametros','meta',{Valor:JSON.stringify(S.meta)},Store.ids.EN_Parametros);
    await Store.saveCfg();if(S.mode!=='db')Store.saveLocal();
    closeDrawer();toast(`Calendario importado: ${fmt(n)} compromisos en ${fmt(touched.size)} líneas`+(skip?` · ${fmt(skip)} ítems ya agendados se saltaron`:'')+'.');render();
  }catch(e){rebuild();D.err='No se pudo importar: '+(e.message||e);drawRender();}
}
async function onFile(t){
  const f=t.files&&t.files[0];t.value='';if(!f)return;const kind=t.dataset.file;
  if(!window.XLSX){toast('No se pudo cargar el lector de Excel. Revisa tu conexión y recarga la página.');return;}
  toast('Leyendo '+f.name+'…');await sleep(60);
  if(kind==='cal'){try{const bk=await readBook(f);const P=calParse(bk);openDrawer({type:'cal',file:f.name,P,pl:S.cfg.plants[0]?.name||'',err:''});}catch(e){toast('No se pudo leer el calendario: '+(e.message||e));}return;}
  try{const bk=await readBook(f);const si=pickSheet(bk.names,kind);let rows=parseSheet(bk.buf,bk.names[si]);let soft=false;if(kind==='oc'&&isSoftlandOC(rows)){rows=flattenSoftlandOC(rows);soft=true;}if(kind==='rec'&&isSoftlandCompras(rows)){rows=flattenSoftlandCompras(rows);soft=true;}const hdr=soft?0:detectHeader(rows,kind);
    const M={buf:bk.buf,names:bk.names,si,rows,hdr,soft,map:autoMap((rows[hdr]||[]).map(x=>x==null?'':String(x)),kind)};M.opt=defaultOpt(kind,M);if(soft){M.opt.desde='';}
    openDrawer({type:'map',kind,file:f.name,M,um:{}});}
  catch(e){toast('No se pudo leer el archivo: '+(e.message||e));}
}
function mapReload(){const M=D.M;M.hdr=Math.min(M.hdr,Math.max(0,M.rows.length-1));M.map=autoMap((M.rows[M.hdr]||[]).map(x=>x==null?'':String(x)),D.kind);M.opt=defaultOpt(D.kind,M);}
async function saveFile(name,wb){
  const data=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function exportSeg(){
  const rows=segRows().map(x=>{const u=uppOf(x.l);const past=x.e.phase!=='fut';return {'Categoría':x.l.cat,'Código':x.l.cod,'Proveedor':x.l.prov,'Orden de Compra':x.l.oc,'Producto':x.l.prod,'Planta':x.c.pl,'Semana Comprometida':wLabel(x.c.wk),'KEY OTIF':[x.l.oc,x.l.cod,x.c.pl,x.c.wk].join('|'),'Cantidad comprometida':x.c.qty,'Q Posiciones':(()=>{const v=posOf(x.l,x.c.pl,x.c.qty);return v==null?null:Math.ceil(v);})(),'Cantidad Recibida':past?x.e.r:null,'Diferencia':past?x.e.diff:null,'OT':x.e.phase==='cur'?'En curso':past?x.e.ot:null,'IF':x.e.phase==='cur'?'En curso':past?x.e.inf:null,'OTIF':x.e.phase==='cur'?'En curso':past?x.e.otif:null,'Medición':{mide:'Mide',pen:'Penaliza',info:'Informativo'}[x.e.m]||'','Estado':x.c.st,'Origen':SRC[x.c.src],'Motivo no planificada':x.c.mnp||'','Responsable cambio':x.c.resp||'','Motivo cambio':x.c.mot||''};});
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Seguimiento OTIF');saveFile('Seguimiento_OTIF_'+wLabel(CUR)+'.xlsx',wb);
}
function exportHist(){
  const rows=[];for(const l of fLines()){const p=S.plans[l.k];if(!p)continue;for(const e of p.log||[])rows.push({'Fecha':e.t,'Usuario':uname(e.by),'Acción':ACT[e.act]||e.act,'Proveedor':l.prov,'OC':l.oc,'Código':l.cod,'Producto':l.prod,'Planta':e.pl||'','Semana':e.wk?wLabel(e.wk):'','Campo':e.field||'','Antes':e.before??'','Después':e.after??'','Responsable':e.resp||'','Motivo':e.mot||'','Impacto':e.imp||'','Nota':e.note||''});}
  rows.sort((a,b)=>a.Fecha<b.Fecha?1:-1);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Historial');saveFile('Historial_cambios_OTIF.xlsx',wb);
}
/* =========================================================
   Carga masiva de programación de entregas
   ========================================================= */
const BULK_HEAD=['Proveedor','Código','Producto','Planta','Semana','Cantidad','OC (opcional)','Pendiente por calendarizar (referencia)','OC con saldo (referencia)'];
function bulkTemplate(){
  const g=new Map();
  for(const l of fLines()){if(l.st!=='Abierta')continue;const pend=pendingOf(l,planOf(l.k));if(pend<=0)continue;const key=norm(l.prov)+'|'+norm(l.cod);
    const o=g.get(key)||{prov:l.prov,cod:l.cod,prod:l.prod,pl:plantOf(l.alm)||l.alm||'',pend:0,ocs:[]};o.pend+=pend;o.ocs.push(l.oc+' ('+fmt(pend)+')');g.set(key,o);}
  const rows=[...g.values()].sort((a,b)=>a.prov.localeCompare(b.prov)||a.cod.localeCompare(b.cod)).map(o=>[o.prov,o.cod,o.prod,o.pl,'','','',o.pend,o.ocs.join(', ')]);
  const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet([BULK_HEAD,...rows]);
  ws['!cols']=[{wch:34},{wch:16},{wch:34},{wch:12},{wch:10},{wch:12},{wch:14},{wch:16},{wch:34}];
  XLSX.utils.book_append_sheet(wb,ws,'Programación');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Cómo completar la programación'],[''],
    ['1. Una fila por entrega: proveedor, código, planta, semana y cantidad. Si un producto se entrega en varias semanas, copia la fila una vez por semana.'],
    ['2. Semana: W46, 2026-46, 46 o una fecha (se usa la semana de esa fecha). No se aceptan semanas que ya terminaron.'],
    ['3. Planta: nombre de la planta (Mostazal, Malloa, Molina…) o su código de almacén.'],
    ['4. OC es opcional. Si se deja vacía, la cantidad se asigna a la OC abierta más antigua del proveedor y código con saldo, y si no alcanza sigue con la siguiente.'],
    ['5. Las filas sin semana ni cantidad se ignoran. Las columnas de referencia no se leen.'],
    ['6. Solo se agenda lo pendiente por calendarizar: lo que ya está agendado o confirmado no se modifica.'],
    ['También se acepta una planilla con una columna por semana (W46, W47…) en lugar de las columnas Semana y Cantidad.']]),'Instrucciones');
  saveFile(`Programacion_entregas_${wLabel(CUR)}.xlsx`,wb);
}
function weekOf(v){if(v==null||v==='')return null;if(v instanceof Date)return ywOf(v);if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return ywOf(new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));}
  const s=String(v).trim();if(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)||/^\d{4}-\d{2}-\d{2}/.test(s)){const d=toDate(s);if(d)return ywOf(d);}return toWeek(s);}
const provEq=(a,b)=>{const x=norm(a),y=norm(b);return x===y||(x.length>=6&&y.length>=6&&(x.startsWith(y.slice(0,18))||y.startsWith(x.slice(0,18))));};
function bulkParse(rows){
  let hi=-1;for(let i=0;i<Math.min(rows.length,15);i++){const H=(rows[i]||[]).map(norm);if(H.some(h=>h.startsWith('CODIGO')||h==='ARTICULO')&&(H.some(h=>h.startsWith('CANTIDAD'))||H.some(h=>/^(\d{4}\s*)?W?\s?\d{1,2}$/.test(h)&&toWeek(h)))){hi=i;break;}}
  if(hi<0)throw new Error('No encontré los encabezados. Usa la plantilla: debe tener al menos Código, Planta, Semana y Cantidad.');
  const H=rows[hi].map(norm);const find=f=>H.findIndex(f);
  const ci={prov:find(h=>h.startsWith('PROVEEDOR')),cod:find(h=>h.startsWith('CODIGO')||h==='ARTICULO'),prod:find(h=>h.startsWith('PRODUCTO')||h.startsWith('DESCRIPCION')),pl:find(h=>h.startsWith('PLANTA')||h.startsWith('ALMACEN')),
    wk:find(h=>h.startsWith('SEMANA')||h.startsWith('FECHA')),qty:find(h=>h.startsWith('CANTIDAD')),oc:find(h=>h==='OC'||h.startsWith('OC ')||h.startsWith('ORDEN DE COMPRA')||h.startsWith('PEDIDO'))};
  const wcols=[];if(ci.wk<0||ci.qty<0)H.forEach((h,i)=>{if(/^(\d{4}\s*)?W?\s?\d{1,2}$/.test(h)){const w=toWeek(h);if(w)wcols.push([i,w]);}});
  const wide=wcols.length>0;
  if(!wide&&(ci.wk<0||ci.qty<0))throw new Error('Falta la columna '+(ci.wk<0?'Semana':'Cantidad')+'.');
  if(ci.cod<0)throw new Error('Falta la columna Código.');
  const raw=[];let empty=0;
  for(let i=hi+1;i<rows.length;i++){const r=rows[i];if(!r)continue;const cell=c=>c>=0?r[c]:null;
    const base={n:i+1,prov:String(cell(ci.prov)??'').trim(),cod:String(cell(ci.cod)??'').trim(),prod:String(cell(ci.prod)??'').trim(),plRaw:cell(ci.pl),oc:String(cell(ci.oc)??'').trim()};
    if(wide){let any=false;for(const [c,w] of wcols){const q=toNum(r[c]);if(r[c]==null||r[c]===''||!q)continue;any=true;raw.push({...base,wk:w,wkRaw:wLabel(w),qty:q});}if(!any)empty++;}
    else{const wv=cell(ci.wk),qv=cell(ci.qty);if((wv==null||wv==='')&&(qv==null||qv===''||!toNum(qv))){empty++;continue;}raw.push({...base,wk:weekOf(wv),wkRaw:wv,qty:toNum(qv)});}}
  const used=new Map();const out=[];
  for(const x of raw){const res={...x,pl:'',allocs:[],st:'error',msg:''};out.push(res);
    if(!x.cod){res.msg='Falta el código.';continue;}
    if(!(x.qty>0)){res.msg='Cantidad inválida.';continue;}
    if(!x.wk){res.msg='Semana no reconocida ('+(x.wkRaw??'vacía')+').';continue;}
    if(x.wk<CUR){res.msg=wLabel(x.wk)+' ya terminó: solo se programa desde la semana en curso.';continue;}
    const pl=plantOf(x.plRaw);if(!pl||!(S.cfg.plants.some(q=>q.name===pl)||S.ix.plants.has(pl))){res.msg=x.plRaw==null||x.plRaw===''?'Falta la planta.':'Planta no reconocida ('+x.plRaw+').';continue;}res.pl=pl;
    let cands=S.ix.lines.filter(l=>l.st==='Abierta'&&norm(l.cod)===norm(x.cod)&&(!x.prov||provEq(l.prov,x.prov))&&(!x.oc||norm(l.oc)===norm(x.oc)));
    if(!cands.length){const any=S.ix.lines.some(l=>norm(l.cod)===norm(x.cod)&&(!x.prov||provEq(l.prov,x.prov)));res.msg=x.oc?'La OC '+x.oc+' no tiene una línea abierta con este código'+(x.prov?' y proveedor':'')+'.':any?'Las OC de este proveedor y código no están abiertas.':'No hay OC con este código'+(x.prov?' para este proveedor':'')+'.';continue;}
    const provs=new Set(cands.map(l=>l.prov));if(!x.prov&&provs.size>1){res.msg='Este código tiene OC abiertas con '+provs.size+' proveedores: indica el proveedor.';continue;}
    cands.sort((a,b)=>(a.fw||999999)-(b.fw||999999)||String(a.oc).localeCompare(String(b.oc)));
    let rest=x.qty;
    for(const l of cands){const av=pendingOf(l,planOf(l.k))-(used.get(l.k)||0);if(av<=0)continue;const q=Math.min(av,rest);res.allocs.push({k:l.k,oc:l.oc,qty:q});used.set(l.k,(used.get(l.k)||0)+q);rest-=q;if(rest<=0)break;}
    res.prov=res.prov||cands[0].prov;res.prod=res.prod||cands[0].prod;
    const ok=x.qty-rest;
    if(!ok){res.msg='Sin cantidad pendiente por calendarizar en '+(cands.length>1?'sus OC':'la OC '+cands[0].oc)+'.';continue;}
    if(rest>0){res.st='parcial';res.msg='Solo había '+fmt(ok)+' pendientes: se agendan '+fmt(ok)+' y quedan fuera '+fmt(rest)+'.';}else res.st='ok';
  }
  return {rows:out,empty,wide};
}
async function bulkRead(file){
  if(!window.XLSX){toast('No se pudo cargar el lector de Excel.');return;}
  const bk=await readBook(file);const nm=bk.names.find(n=>norm(n).includes('PROGRAMACION'))||bk.names[0];
  const R=bulkParse(parseSheet(bk.buf,nm));D.res=R;D.file=file.name;D.err='';drawRender();
}
function bulkSave(){
  if(!S.canWrite)throw new Error('Solo lectura: no tienes permiso para modificar.');
  const R=D.res;const byK=new Map();
  for(const r of R.rows)if(r.st!=='error')for(const a of r.allocs){if(!byK.has(a.k))byK.set(a.k,[]);byK.get(a.k).push({wk:r.wk,pl:r.pl,qty:a.qty});}
  let n=0,conf=0;const errs=[];
  for(const [k,rows] of byK){try{act(k,ctx=>{const p=planOf(k);addCommits(k,rows,{src:'plan',note:'Carga masiva'+(p.confirmed?' · agregado después de confirmar el calendario':'')+(D.file?' · '+D.file:'')},ctx);if(D.conf&&!planOf(k).confirmed){confirmPlan(k,ctx);conf++;}});n+=rows.length;}catch(e){errs.push(S.ix.byK[k].oc+': '+e.message);}}
  return {n,lines:byK.size,conf,errs};
}
function dPos(){
  const pl=D.pl,w=D.w;const pc=S.cfg.plants.find(x=>x.name===pl)||{};const O=occupancy(wRange(S.cfg.wFrom,w))[pl]||{};const o=O[w];if(!o)return {title:esc(pl),body:'<p class="hint">Sin datos de ocupación para esta semana.</p>'};
  const prev=w>S.cfg.wFrom?(O[wAdd(w,-1)]?O[wAdd(w,-1)].occ:+pc.init||0):+pc.init||0;
  return {title:`Ocupación · ${esc(pl)} · ${wLabel(w)}`,sub:`${wDates(w)} · ${w<CUR?'entradas según recepciones reales':'entradas según el calendario'} · total de la planta`,
   body:`<div class="kv"><span>Capacidad <b>${fmt(o.cap)}</b></span><span>Ocupadas al inicio <b>${fmt(Math.round(prev))}</b></span><span>Entradas <b>+${fmt(Math.ceil(o.inn))}</b></span><span>Consumo <b>−${fmt(o.out)}</b></span><span>Ocupadas al cierre <b>${fmt(Math.round(o.occ))}</b> (${pct(o.pct)})</span><span>Disponibles <b style="color:${o.pct>=.9?'var(--bad)':'inherit'}">${fmt(Math.max(0,Math.round(o.cap-o.occ)))}</b></span></div>
    <div class="field"><label for="pos-out">Consumo / liberación de esta semana (posiciones)</label><input class="posin" style="max-width:160px;text-align:left" id="pos-out" type="number" min="0" data-pos="${esc(pl)}" data-w="${w}" value="${o.outSet?o.out:''}" placeholder="${fmt(pc.out||0)}" ${S.canWrite?'':'disabled'}><small>Déjalo vacío para usar el consumo semanal estimado de la planta (${fmt(pc.out||0)}).</small></div>
    <h3 style="margin:4px 0 0">Entradas por producto</h3>
    <div class="tw"><table><thead><tr><th>Proveedor / producto</th><th class="num">Unidades</th><th class="num">Posiciones</th></tr></thead><tbody>${o.det.sort((a,b)=>b.pos-a.pos).map(d=>`<tr><td class="wrap">${esc(d.l.prov)}<div class="muted">${lineLabel(d.l)} · ${esc(d.l.prod)}</div></td><td class="num">${fmt(d.q)}</td><td class="num">${NF1.format(d.pos)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Sin entradas esta semana.</td></tr>'}</tbody></table></div>`};
}
function dBulk(){
  const R=D.res;const dis=S.canWrite?'':'disabled';
  const intro=`<div class="box"><h3>1. Descarga la plantilla</h3><p class="hint" style="margin:0">Viene con los productos que tienen cantidad pendiente por calendarizar (según los filtros superiores), su planta habitual y el saldo como referencia. Completa semana y cantidad; copia la fila si hay varias entregas.</p><div class="row"><button class="btn sm" data-a="bulkTpl">Descargar plantilla</button></div></div>
   <div class="box"><h3>2. Carga el archivo completado</h3><p class="hint" style="margin:0">Una fila por entrega: proveedor, código, planta, semana y cantidad. La OC es opcional: si no viene, se asigna a la OC abierta más antigua con saldo. Antes de guardar verás una vista previa.</p>
    <div class="row"><label class="btn pri sm" for="file-bulk" ${S.canWrite?'':'aria-disabled="true"'}>${R?'Cargar otro archivo':'Elegir archivo'}</label><input type="file" id="file-bulk" data-bulkfile="1" accept=".xlsx,.xls,.csv" hidden ${dis}>${D.file?`<span class="muted">${esc(D.file)}</span>`:''}</div></div>`;
  if(!R)return {title:'Carga masiva de programación',sub:'Agenda entregas de varios proveedores y productos desde un Excel',body:intro+errBox(),foot:`<button class="btn" data-a="close">Cerrar</button>`};
  const ok=R.rows.filter(r=>r.st==='ok'),par=R.rows.filter(r=>r.st==='parcial'),er=R.rows.filter(r=>r.st==='error');
  const tot=sum(R.rows,r=>sum(r.allocs,a=>a.qty));const nl=new Set(R.rows.flatMap(r=>r.allocs.map(a=>a.k))).size;
  const sorted=[...er,...par,...ok].slice(0,400);
  const chip=r=>r.st==='ok'?'<span class="chip ok">OK</span>':r.st==='parcial'?'<span class="chip warn">Parcial</span>':'<span class="chip bad">No se carga</span>';
  return {title:'Carga masiva de programación',sub:esc(D.file||''),
   body:intro+`<div class="box"><h3>3. Revisa y guarda</h3>
    <div class="kv"><span>Filas leídas <b>${R.rows.length}</b></span><span style="color:var(--ok)">OK <b>${ok.length}</b></span>${par.length?`<span style="color:var(--warn)">Parciales <b>${par.length}</b></span>`:''}${er.length?`<span style="color:var(--bad)">No se cargan <b>${er.length}</b></span>`:''}${R.empty?`<span class="muted">Sin completar (ignoradas) <b>${R.empty}</b></span>`:''}<span>A agendar <b>${fmt(tot)}</b> u. en <b>${nl}</b> línea(s) de OC</span></div>
    <label style="display:flex;gap:8px;align-items:center"><input class="cbx" type="checkbox" id="bulk-conf" data-bulkconf="1" ${D.conf?'checked':''}>Confirmar el calendario de las líneas cargadas al guardar</label>
    <p class="hint" style="margin:0">${D.conf?'Las líneas quedan confirmadas: desde ahí, los cambios piden responsable y motivo.':'Las líneas en borrador quedan en borrador; las que ya estaban confirmadas reciben los compromisos como agregados después de confirmar.'}</p></div>
    <div class="tw"><table><thead><tr><th>Fila · proveedor · producto</th><th>Planta · sem.</th><th class="num">Cantidad</th><th>OC</th></tr></thead><tbody>
    ${sorted.map(r=>`<tr><td class="wrap" style="min-width:190px"><span class="muted" style="font-size:11.5px">Fila ${r.n}</span> · ${esc(r.prov||'–')}<div class="muted" style="font-size:12px"><span class="mono">${esc(r.cod)}</span> ${esc(r.prod)}</div><div style="margin-top:3px">${chip(r)}${r.msg?` <span style="font-size:12px">${esc(r.msg)}</span>`:''}</div></td>
      <td style="white-space:nowrap">${esc(r.pl||(r.plRaw??''))}<div class="muted" style="font-size:12px">${r.wk?wLabel(r.wk):esc(r.wkRaw??'')}</div></td><td class="num">${fmt(r.qty)}</td>
      <td style="font-size:12.5px;white-space:nowrap">${r.allocs.map(a=>`<span class="mono">${esc(a.oc)}</span>${r.allocs.length>1?' · '+fmt(a.qty):''}`).join('<br>')||'–'}</td></tr>`).join('')||`<tr><td colspan="4">${emptyState('El archivo no tiene filas completadas','Completa semana y cantidad en la plantilla.')}</td></tr>`}
    </tbody></table></div>${R.rows.length>400?`<p class="hint">Se muestran 400 de ${R.rows.length} filas (primero las que tienen observaciones).</p>`:''}${errBox()}`,
   foot:`<button class="btn" data-a="close">Cancelar</button><button class="btn pri" data-a="bulkSave" ${ok.length+par.length&&S.canWrite?'':'disabled'}>Guardar ${fmt(tot)} u. (${ok.length+par.length} fila${ok.length+par.length===1?'':'s'})</button>`};
}
function exportTpl(kind){
  const F=FIELDS[kind];const head=F.f.map(f=>f[1]);
  const ex={oc:[['4500012841','IN00200500294','CAJA CEREZA 5 KG MASTER SFCO','CARTOCOR CHILE SA','Cajas de Cartón',240000,'Pedido abierto','111']],rec:[['4500012841','IN00200500294','111','2026-10-05',null,40000,'CARTOCOR CHILE SA']],pal:[['CARTOCOR CHILE SA','IN00200500294',700]]}[kind];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([head,...ex]),'Plantilla');saveFile('Plantilla_'+kind+'.xlsx',wb);
}

/* =========================================================
   Avance de entregas (idea de "Planificación de Entregas y Recepciones")
   ========================================================= */
const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function monthOf(yw){const m=mondayOf(yw);m.setUTCDate(m.getUTCDate()+3);return m.getUTCFullYear()+'-'+String(m.getUTCMonth()+1).padStart(2,'0');}
const ymLabel=ym=>MES[+ym.slice(5)-1]+(+ym.slice(0,4)!==Math.floor(CUR/100)?' '+ym.slice(2,4):'');
function ymRange(a,b){const o=[];let y=+a.slice(0,4),m=+a.slice(5);for(let i=0;i<24;i++){const s=y+'-'+String(m).padStart(2,'0');if(s>b)break;o.push(s);m++;if(m>12){m=1;y++;}}return o;}
function seasonMonths(){
  let last=S.cfg.wTo;for(const p of Object.values(S.plans))for(const c of p.commits||[])if(isActive(c)&&c.wk>last)last=c.wk;
  let b=monthOf(last);const mm=(S.cfg.metas||[]).flatMap(m=>Object.keys(m.m||{})).sort().pop();if(mm&&mm>b)b=mm;
  return ymRange(monthOf(S.cfg.wFrom),b).slice(0,12);
}
const ncat=x=>norm(x).split(' ').map(w=>w.length>3?w.replace(/S$/,''):w).join(' ');
function metaFor(l){const ms=S.cfg.metas||[];const c=ncat(l.cat),f=norm(l.fmt);return ms.find(m=>ncat(m.cat)===c&&m.fmt&&norm(m.fmt)===f)||ms.find(m=>ncat(m.cat)===c&&!m.fmt)||null;}
function metaAcum(m,ym){if(!m)return null;let s=0;for(const [k,v] of Object.entries(m.m||{}))if(k<=ym)s+=+v||0;return Math.min(1,s);}
function avanceAgg(lines,keyFn){
  const months=seasonMonths();const curYM=monthOf(CUR);const G=new Map();
  const tot={key:'_t',label:'Total',sub:'',adj:0,plan:{},realM:{},meta:{},metaAdj:0,real:0,planHoy:0,cal:0,n:0,notes:[]};
  for(const l of lines){
    if(l.st==='Cancelada')continue;const p=planOf(l.k);const [key,label,sub]=keyFn(l);
    let g=G.get(key);if(!g){g={key,label,sub,adj:0,plan:{},realM:{},meta:{},metaAdj:0,real:0,planHoy:0,cal:0,n:0,notes:[]};G.set(key,g);}
    const adj=Math.max(0,(+l.qty||0)-(+p.cancel||0));const real=recTot(l.k);const cal=planSum(p);
    for(const t of [g,tot]){t.adj+=adj;t.n++;t.real+=real;t.cal+=cal;}
    if(p.note)g.notes.push(p.note);
    for(const r of S.ix.recLine.get(l.k)||[]){const ym=monthOf(r.wk);for(const M of months)if(ym<=M){g.realM[M]=(g.realM[M]||0)+(+r.qty);tot.realM[M]=(tot.realM[M]||0)+(+r.qty);}}
    for(const c of activeCommits(p)){const ym=monthOf(c.wk);for(const M of months)if(ym<=M){g.plan[M]=(g.plan[M]||0)+c.plan;tot.plan[M]=(tot.plan[M]||0)+c.plan;}if(c.wk<CUR){g.planHoy+=c.plan;tot.planHoy+=c.plan;}}
    const mt=metaFor(l);if(mt){for(const t of [g,tot]){t.metaAdj+=adj;for(const M of months)t.meta[M]=(t.meta[M]||0)+adj*metaAcum(mt,M);}}
  }
  return {months,curYM,rows:[...G.values()].sort((a,b)=>b.adj-a.adj),tot};
}
const avPct=(g,M)=>g.adj?(g.plan[M]||0)/g.adj:null;
const avMeta=(g,M)=>g.metaAdj?(g.meta[M]||0)/g.metaAdj:null;
const avReal=(g,M)=>g.adj?(g.realM[M]||0)/g.adj:null;
const kpiOk=(g,M)=>{const m=avMeta(g,M),r=avReal(g,M);return m?(r>=m-0.005):null;};
function avRealCls(g){const r=g.adj?g.real/g.adj:0,ph=g.adj?g.planHoy/g.adj:0;if(!ph)return '';return r>=ph*0.95?'ok':r>=ph*0.8?'warn':'bad';}
function avTable(A,opt={}){
  const ms=A.months.filter(M=>M>=A.curYM||A.tot.plan[M]||A.tot.realM[M]||avMeta(A.tot,M));const cym=A.curYM;
  const cell=(g,M)=>{const v=avPct(g,M),m=avMeta(g,M);const bg=M===cym?'background:var(--accent-soft)':'';
    if(M>cym){const low=m&&v!=null&&v<m-0.005;return `<td class="num" style="${bg}"><b style="color:${low?'var(--bad)':'inherit'}">${pct(v)}</b><div class="muted" style="font-size:11px">plan${m?' · meta '+pct(m):''}</div></td>`;}
    const r=avReal(g,M);const ok=kpiOk(g,M);const chip=ok==null?'':ok?'<span class="chip ok">Cumple</span>':(M===cym?'<span class="chip warn">En curso</span>':'<span class="chip bad">No cumple</span>');
    return `<td class="num" style="${bg}"><b>${pct(r)}</b> ${chip}<div class="muted" style="font-size:11px">plan ${pct(v)}${m?' · meta '+pct(m):''}</div></td>`;};
  const row=(g,tot)=>{const r=g.adj?g.real/g.adj:null,ph=g.adj?g.planHoy/g.adj:null;const cls=avRealCls(g);const br=g.real-g.planHoy;
    return `<tr ${tot?'style="font-weight:700;background:var(--surface-2)"':''}><td class="wrap">${esc(g.label)}${g.sub?`<div class="muted" style="font-size:11.5px;font-weight:400">${esc(g.sub)}</div>`:''}${g.notes&&g.notes.length&&!tot?`<div class="muted" style="font-size:11.5px;font-weight:400">“${esc(g.notes[0])}”</div>`:''}</td>
     <td class="num">${fmt(g.adj)}</td>${ms.map(M=>cell(g,M)).join('')}
     <td class="num">${fmt(g.real)}</td><td class="num"><span class="chip ${cls}">${pct(r)}</span></td><td class="num">${pct(ph)}</td><td class="num" style="color:${br<0?'var(--bad)':'inherit'}">${br>0?'+':''}${fmt(br)}</td><td class="num">${pct(g.adj?g.cal/g.adj:null)}</td></tr>`;};
  return `<div class="tw"><table><thead><tr><th>${opt.first||'Grupo'}</th><th class="num">Adjudicado</th>${ms.map(M=>`<th class="num" style="${M===cym?'color:var(--accent)':''}">Acum. ${ymLabel(M)}${M===cym?' (en curso)':''}</th>`).join('')}<th class="num">Real entregado</th><th class="num">% real hoy</th><th class="num">% plan a hoy</th><th class="num">Brecha (unid.)</th><th class="num">% calendarizado</th></tr></thead>
   <tbody>${A.rows.map(g=>row(g)).join('')||`<tr><td colspan="${ms.length+7}">${emptyState('Sin líneas','')}</td></tr>`}${A.rows.length>1?row(A.tot,true):''}</tbody></table></div>`;
}
function kpiTiles(A){
  const cym=A.curYM;const past=A.months.filter(M=>M<cym&&avMeta(A.tot,M));const prev=past[past.length-1];const T=A.tot;
  const withMeta=A.rows.filter(g=>g.metaAdj);
  const tile=(k,v,s,ok)=>`<div class="tile ${ok===false?'':''}"><span class="k">${k}</span><span class="v" style="color:${ok==null?'inherit':ok?'var(--ok)':'var(--bad)'}">${v}</span><span class="s">${s}</span></div>`;
  const parts=[];
  if(prev){const ok=kpiOk(T,prev);parts.push(tile('KPI '+ymLabel(prev)+' (cerrado)',pct(avReal(T,prev)),`Meta ${pct(avMeta(T,prev))} · ${ok?'Cumple':'No cumple'}`,ok));
    const n=withMeta.filter(g=>kpiOk(g,prev)).length;parts.push(tile('Grupos que cumplen '+ymLabel(prev),`${n} de ${withMeta.length}`,'Según la agrupación elegida',withMeta.length?n===withMeta.length:null));}
  if(avMeta(T,cym)!=null){const r=avReal(T,cym),m=avMeta(T,cym);parts.push(tile('KPI '+ymLabel(cym)+' (en curso)',pct(r),`Meta al cierre ${pct(m)} · faltan ${fmt(Math.max(0,m*T.adj-(T.realM[cym]||0)))} u.`,r>=m-0.005?true:null));
    const pl=avPct(T,cym);parts.push(tile('Plan a cierre de '+ymLabel(cym),pct(pl),pl!=null&&pl>=m-0.005?'El calendario alcanza la meta':'El calendario no alcanza la meta',pl!=null?pl>=m-0.005:null));}
  return parts.length?`<div class="panel-b"><div class="tiles">${parts.join('')}</div></div>`:'';
}
function vAvance(){
  if(!S.ix.lines.length)return noData();
  const tab=['cat','fmt','prod','prov'].includes(S.tab.av)?S.tab.av:'cat';
  const KF={fmt:l=>[norm(l.cat)+'|'+(l.fmt||'Sin formato'),l.fmt||'Sin formato',l.cat],prod:l=>[norm(l.cod),l.prod||l.cod,l.cod+' · '+(l.fmt||'Sin formato')],prov:l=>[l.prov,l.prov,''],cat:l=>[norm(l.cat),l.cat,'']};
  const A=avanceAgg(fLines(),KF[tab]);
  const tb=(k,t)=>`<button data-a="tab" data-t="av" data-k="${k}" aria-pressed="${tab===k}">${t}</button>`;
  return `<div class="panel"><div class="panel-h"><div class="tabs">${tb('cat','Por categoría')}${tb('fmt','Por formato')}${tb('prod','Por producto')}${tb('prov','Por proveedor')}</div><span class="spacer"></span><button class="btn sm" data-a="exportAv">Descargar Excel</button>
   <p>KPI: lo recibido acumulado al cierre de cada mes, sobre lo adjudicado (comprado menos saldo cancelado), contra la meta mensual de la política de abastecimiento. Los meses cerrados y el mes en curso muestran el real; los meses futuros muestran el plan del calendario (en rojo si queda bajo la meta).</p></div>${kpiTiles(A)}${avTable(A,{first:{fmt:'Formato',prod:'Producto',prov:'Proveedor',cat:'Categoría'}[tab]})}</div>`;
}
function exportAv(){
  const tab=['cat','fmt','prod','prov'].includes(S.tab.av)?S.tab.av:'cat';const KF={fmt:l=>[norm(l.cat)+'|'+(l.fmt||'Sin formato'),l.fmt||'Sin formato',l.cat],prod:l=>[norm(l.cod),l.prod||l.cod,l.cod+' · '+(l.fmt||'Sin formato')],prov:l=>[l.prov,l.prov,''],cat:l=>[norm(l.cat),l.cat,'']};
  const A=avanceAgg(fLines(),KF[tab]);
  const rows=A.rows.concat([A.tot]).map(g=>{const o={'Grupo':g.label,'Detalle':g.sub,'Adjudicado':g.adj};for(const M of A.months){o['Real acum '+ymLabel(M)]=M<=A.curYM?avReal(g,M):null;o['Plan acum '+ymLabel(M)]=g.adj?(g.plan[M]||0)/g.adj:null;o['Meta '+ymLabel(M)]=avMeta(g,M);o['KPI '+ymLabel(M)]=M<A.curYM?(kpiOk(g,M)==null?'':kpiOk(g,M)?'Cumple':'No cumple'):'';}Object.assign(o,{'Real entregado':g.real,'% real hoy':g.adj?g.real/g.adj:null,'% plan a hoy':g.adj?g.planHoy/g.adj:null,'Brecha unidades':g.real-g.planHoy,'% calendarizado':g.adj?g.cal/g.adj:null,'Comentarios':(g.notes||[]).join(' | ')});return o;});
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Avance');saveFile('Avance_entregas_'+wLabel(CUR)+'.xlsx',wb);
}

/* =========================================================
   Informe semanal a proveedor
   ========================================================= */
const RSEC=[
  ['kpi','Indicadores: OTIF, OT, IF, fill rate y avance',0],['claves','Puntos clave automáticos',0],['tend','Tendencia OTIF de las últimas 10 semanas',0],
  ['prox','Compromisos de la próxima semana',0],['ant','Incumplimientos de la semana anterior',0],['curso','Semana en curso: comprometido y recibido a la fecha',0],
  ['venc','Entregas vencidas pendientes (deuda de entrega)',1],['look','Calendario de las próximas 4 semanas por planta',1],['ocs','Estado de sus órdenes de compra',1],
  ['meta','Avance acumulado vs meta mensual por formato',1],['tmod','Tasa de modificación del plan confirmado',0],['cambios','Cambios de calendario atribuidos al proveedor',1],['sinc','Entregas fuera de calendario o en otra planta',1],['rank','Posición entre proveedores de la categoría (anónimo)',1]];
function provLines(prov){const f=fEff();return S.ix.lines.filter(l=>l.prov===prov&&(!f.cat||l.cat===f.cat)&&(!f.esp||l.esp===f.esp));}
function provList(){const m=new Map();const f=fEff();for(const l of S.ix.lines){if((f.cat&&l.cat!==f.cat)||(f.esp&&l.esp!==f.esp))continue;const p=planOf(l.k);const o=m.get(l.prov)||{prov:l.prov,n:0,act:0};o.n++;if((p.commits||[]).some(c=>c.st!=='cancelada'&&c.wk>=wAdd(CUR,-8)&&c.wk<=wAdd(CUR,4)))o.act++;m.set(l.prov,o);}return [...m.values()].sort((a,b)=>(b.act>0)-(a.act>0)||a.prov.localeCompare(b.prov));}
function rankMap(){
  if(S._rank)return S._rank;const byCat=new Map();
  for(const l of S.ix.lines){const p=S.plans[l.k];if(!p)continue;const key=norm(l.cat);if(!byCat.has(key))byCat.set(key,new Map());const m=byCat.get(key);if(!m.has(l.prov))m.set(l.prov,[]);for(const c of p.commits||[])m.get(l.prov).push({c,e:evalC(l,p,c)});}
  const out={};
  for(const [cat,m] of byCat){const arr=[...m.entries()].map(([prov,a])=>({prov,k:kpi(a)})).filter(x=>x.k.n>=3).sort((a,b)=>b.k.otif-a.k.otif);arr.forEach((x,i)=>{(out[x.prov]=out[x.prov]||{})[cat]={pos:i+1,of:arr.length};});}
  return S._rank=out;
}
function repData(prov){
  const lines=provLines(prov);const ev=[];
  for(const l of lines){const p=S.plans[l.k];if(!p)continue;for(const c of p.commits||[])ev.push({l,p,c,e:evalC(l,p,c)});}
  const W1=wAdd(CUR,-1),Wn=wAdd(CUR,1);const inW=(a,b)=>x=>x.c.wk>=a&&x.c.wk<=b;
  const K=kpi(ev),K4=kpi(ev.filter(inW(wAdd(CUR,-4),W1))),Kp=kpi(ev.filter(inW(wAdd(CUR,-8),wAdd(CUR,-5))));
  const series=wRange(wAdd(CUR,-10),W1).map(w=>{const a=ev.filter(x=>x.c.wk===w&&x.e.counts);return {wk:w,n:a.length,ok:sum(a,x=>x.e.otif),v:a.length?sum(a,x=>x.e.otif)/a.length:null};});
  const prev=ev.filter(x=>x.c.wk===W1&&x.e.counts);const prevFail=prev.filter(x=>!x.e.otif).sort((a,b)=>(a.e.r-a.c.qty)-(b.e.r-b.c.qty));
  const cur=ev.filter(x=>x.c.wk===CUR&&isActive(x.c));
  const upp=l=>uppOf(l);const pal=(l,q)=>{const u=upp(l);return u?Math.ceil(q/u):null;};
  const next=ev.filter(x=>x.c.wk===Wn&&isActive(x.c)).map(x=>({...x,pal:pal(x.l,x.c.plan)}));
  const lookW=wRange(Wn,wAdd(CUR,4));const lookPl=new Map();
  for(const x of ev){if(!isActive(x.c)||x.c.wk<Wn||x.c.wk>lookW[lookW.length-1])continue;const key=x.l.cod+'|'+x.c.pl;const o=lookPl.get(key)||{prod:x.l.prod||x.l.cod,cod:x.l.cod,pl:x.c.pl,ocs:new Set(),w:{}};o.w[x.c.wk]=(o.w[x.c.wk]||0)+x.c.plan;o.ocs.add(x.l.oc);lookPl.set(key,o);}
  const venc=ev.filter(x=>isActive(x.c)&&x.c.wk<CUR&&x.c.plan>x.e.r&&x.l.st==='Abierta').map(x=>({...x,f:x.c.plan-x.e.r})).sort((a,b)=>a.c.wk-b.c.wk);
  const ocs=lines.filter(l=>l.st!=='Cancelada').map(l=>{const p=planOf(l.k);const r=recTot(l.k);const adj=Math.max(0,(+l.qty||0)-(+p.cancel||0));
    const fut=sum(activeCommits(p).filter(c=>c.wk>=CUR),c=>Math.max(0,c.plan-(c.wk===CUR?recAt(l.k,c.pl,c.wk):0)));
    return {l,p,r,adj,fut,sinCal:pendingOf(l,p),pend:Math.max(0,adj-r),val:l.precio?Math.max(0,adj-r)*l.precio:null};}).sort((a,b)=>b.pend-a.pend);
  const metaA=avanceAgg(lines,l=>[norm(l.cat)+'|'+(l.fmt||'Sin formato'),l.fmt||'Sin formato',l.cat]);
  const cambios=[];for(const l of lines){const p=S.plans[l.k];if(!p)continue;for(const e of p.log||[])if((e.act==='modificar'||e.act==='reprogramar')&&e.field!=='Cantidad (suma)'&&e.field!=='Compromiso nuevo'){const c=(p.commits||[]).find(x=>x.id===e.cid);const resp=c&&c.st==='modificada'?c.resp:e.resp;if(resp&&respPen(resp))cambios.push({l,e,resp});}}
  cambios.sort((a,b)=>a.e.t<b.e.t?1:-1);
  const sinc=[];for(const l of lines){const p=planOf(l.k);const g=new Map();for(const r of S.ix.recLine.get(l.k)||[]){if(r.wk<wAdd(CUR,-2)||r.wk>CUR)continue;const key=r.pl+'|'+r.wk;g.set(key,(g.get(key)||0)+(+r.qty));}
    for(const [key,q] of g){const pl=key.split('|')[0],wk=+key.split('|')[1];if(!(p.commits||[]).some(c=>c.pl===pl&&c.wk===wk&&c.st!=='cancelada'))sinc.push({l,pl,wk,q,near:nearestCommit(p,pl,wk)});}}
  const mainCat=(()=>{const m=new Map();for(const l of lines)m.set(norm(l.cat),(m.get(norm(l.cat))||0)+(+l.qty||0));return [...m.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];})();
  const rk=mainCat?(rankMap()[prov]||{})[mainCat]:null;const catLabel=lines.find(l=>norm(l.cat)===mainCat)?.cat||'';
  const shortPrev=sum(prevFail,x=>Math.max(0,x.c.qty-x.e.r));
  const qc=sum(cur,x=>x.c.qty),rc=sum(cur,x=>x.e.r);const qn=sum(next,x=>x.c.plan);const paln=sum(next,x=>x.pal||0);const nextPl=[...new Set(next.map(x=>x.c.pl))];
  const comprado=sum(ocs,o=>o.adj),recib=sum(ocs,o=>o.r),sinCal=sum(ocs,o=>o.sinCal),vq=sum(venc,x=>x.f);
  const usdPend=ocs.some(o=>o.val!=null)?sum(ocs,o=>o.val||0):null;const usdVenc=venc.some(x=>x.l.precio)?sum(venc,x=>x.f*(x.l.precio||0)):null;
  const high=[];
  const tr=(K4.otif!=null&&Kp.otif!=null)?(K4.otif-Kp.otif):null;
  high.push(`OTIF de la temporada ${pct(K.otif)} (${K.ok} de ${K.n} compromisos cumplidos). Últimas 4 semanas: ${pct(K4.otif)}${tr!=null?` (${tr>=0?'+':''}${NF1.format(tr*100)} pp frente a las 4 semanas anteriores)`:''}.`);
  high.push(prev.length?`Semana ${wLabel(W1)}: cumplió ${prev.length-prevFail.length} de ${prev.length} compromisos${shortPrev?`; faltaron ${fmt(shortPrev)} unidades`:''}.`:`Semana ${wLabel(W1)}: sin compromisos medidos.`);
  if(cur.length)high.push(`Semana en curso ${wLabel(CUR)}: comprometido ${fmt(qc)}, recibido a la fecha ${fmt(rc)} (${pct(qc?rc/qc:null)}).`);
  high.push(next.length?`Próxima semana ${wLabel(Wn)}: ${next.length} entrega(s) por ${fmt(qn)} unidades${paln?` (${fmt(paln)} pallets)`:''} en ${nextPl.join(', ')}.`:`Próxima semana ${wLabel(Wn)}: sin compromisos calendarizados.`);
  if(vq>0)high.push(`Entregas vencidas pendientes: ${fmt(vq)} unidades en ${venc.length} compromiso(s).`);
  if(sinCal>0)high.push(`${fmt(sinCal)} unidades compradas aún no tienen calendario de entrega.`);
  const low=metaA.rows.filter(g=>g.metaAdj&&g.adj&&(g.real/g.adj)<(avMeta(g,metaA.curYM)||0)-0.1).map(g=>`${g.label} (${pct(g.real/g.adj)} vs meta ${pct(avMeta(g,metaA.curYM))})`);
  if(low.length)high.push(`Avance bajo la meta acumulada de ${ymLabel(metaA.curYM)} en: ${low.slice(0,4).join('; ')}.`);
  return {prov,lines,ev,K,K4,Kp,tr,series,prev,prevFail,shortPrev,cur,qc,rc,next,qn,paln,nextPl,lookW,lookPl,venc,vq,ocs,comprado,recib,sinCal,metaA,cambios,sinc,rk,catLabel,usdPend,usdVenc,high,W1,Wn};
}
function generalData(){
  const provs=provList().map(p=>p.prov);const reps=provs.map(repData);
  const ev=reps.flatMap(r=>r.ev);const W1=wAdd(CUR,-1),Wn=wAdd(CUR,1);
  const K=kpi(ev),K4=kpi(ev.filter(x=>x.c.wk>=wAdd(CUR,-4)&&x.c.wk<=W1)),Kp=kpi(ev.filter(x=>x.c.wk>=wAdd(CUR,-8)&&x.c.wk<=wAdd(CUR,-5)));
  const prev=reps.flatMap(r=>r.prev),prevFail=reps.flatMap(r=>r.prevFail);
  const ex=exceptions();const occ=occupancy(wRange(CUR,wAdd(CUR,3)));const hot=[];for(const pl of Object.keys(occ))for(const w of wRange(CUR,wAdd(CUR,3))){const o=occ[pl][w];if(o&&o.pct>=0.9)hot.push(`${pl} ${wLabel(w)} (${pct(o.pct)})`);}
  const avc=avanceAgg(fLines(),l=>[norm(l.cat)+'|'+(l.fmt||'Sin formato'),l.fmt||'Sin formato',l.cat]);
  const lowFmt=avc.rows.filter(g=>g.metaAdj&&g.adj&&(g.real/g.adj)<(avMeta(g,avc.curYM)||0)-0.1);
  return {reps,K,K4,Kp,prev,prevFail,ex,hot,avc,lowFmt,W1,Wn,
    qn:sum(reps,r=>r.qn),paln:sum(reps,r=>r.paln),nn:sum(reps,r=>r.next.length),vq:sum(reps,r=>r.vq),nv:sum(reps,r=>r.venc.length),qc:sum(reps,r=>r.qc),rc:sum(reps,r=>r.rc),shortPrev:sum(reps,r=>r.shortPrev)};
}
function filtText(){const f=S.filt;return [f.cat&&('Categoría '+f.cat),f.esp&&('Especie '+f.esp)].filter(Boolean).join(' · ')||'Todas las categorías cargadas';}
function mailGeneral(){
  const G=generalData();const tr=(G.K4.otif!=null&&G.Kp.otif!=null)?G.K4.otif-G.Kp.otif:null;
  const subj=`Resumen OTIF semanal ${wLabel(CUR)} · Materiales de embalaje · OTIF 4 sem. ${pct(G.K4.otif)}`;
  const L=[];
  L.push(`Resumen semanal de entregas – Semana ${wLabel(CUR)} (${wDates(CUR)})`);L.push(filtText());L.push('');
  L.push('RESUMEN GENERAL');
  L.push(`- OTIF temporada: ${pct(G.K.otif)} (${G.K.ok} de ${G.K.n} compromisos). Últimas 4 semanas: ${pct(G.K4.otif)}${tr!=null?` (${tr>=0?'+':''}${NF1.format(tr*100)} pp vs. 4 semanas anteriores)`:''}.`);
  L.push(`- Semana ${wLabel(G.W1)}: ${G.prev.length-G.prevFail.length} de ${G.prev.length} compromisos cumplidos${G.shortPrev?`; faltaron ${fmt(G.shortPrev)} unidades`:''}.`);
  L.push(`- Semana en curso ${wLabel(CUR)}: comprometido ${fmt(G.qc)}, recibido a la fecha ${fmt(G.rc)} (${pct(G.qc?G.rc/G.qc:null)}).`);
  L.push(`- Próxima semana ${wLabel(G.Wn)}: ${G.nn} entregas por ${fmt(G.qn)} unidades${G.paln?` (${fmt(G.paln)} pallets)`:''}.`);
  if(G.vq)L.push(`- Entregas vencidas pendientes: ${fmt(G.vq)} unidades en ${G.nv} compromisos.`);
  L.push(`- Excepciones abiertas: ${G.ex.falt.length} faltantes por recalendarizar, ${G.ex.saldo.length} líneas cerradas con saldo, ${G.ex.exceso.length} con exceso, ${G.ex.sinc.length} recepciones fuera de calendario.`);
  if(G.hot.length)L.push(`- Plantas sobre 90% de ocupación: ${G.hot.join(', ')}.`);
  L.push('');L.push('A RECALCAR');
  const bad=G.reps.filter(r=>r.K4.n&&r.K4.otif<MA()).sort((a,b)=>a.K4.otif-b.K4.otif);
  if(bad.length)L.push(`- OTIF bajo ${pct(MA())} en las últimas 4 semanas: ${bad.slice(0,6).map(r=>`${r.prov} (${pct(r.K4.otif)})`).join(', ')}.`);
  const fails=G.prevFail.slice().sort((a,b)=>(a.e.r-a.c.qty)-(b.e.r-b.c.qty)).slice(0,5);
  if(fails.length){L.push(`- Mayores incumplimientos de ${wLabel(G.W1)}:`);for(const x of fails)L.push(`   · ${x.l.prov} · ${x.l.prod||x.l.cod} · ${x.c.pl}: comprometido ${fmt(x.c.qty)}, recibido ${fmt(x.e.r)}.`);}
  const vencTop=G.reps.filter(r=>r.vq>0).sort((a,b)=>b.vq-a.vq).slice(0,5);
  if(vencTop.length)L.push(`- Mayor deuda de entrega: ${vencTop.map(r=>`${r.prov} (${fmt(r.vq)} u.)`).join(', ')}.`);
  if(G.lowFmt.length)L.push(`- Formatos bajo la meta acumulada de ${ymLabel(G.avc.curYM)}: ${G.lowFmt.slice(0,6).map(g=>`${g.label} ${pct(g.real/g.adj)} vs ${pct(avMeta(g,G.avc.curYM))}`).join('; ')}.`);
  if(L[L.length-1]==='A RECALCAR')L.push('- Sin alertas relevantes esta semana.');
  L.push('');L.push('POR PROVEEDOR');
  for(const r of G.reps.filter(r=>r.ev.length)){L.push(`- ${r.prov}: OTIF temp. ${pct(r.K.otif)} · 4 sem. ${pct(r.K4.otif)} · ${wLabel(G.W1)} ${r.prev.length-r.prevFail.length}/${r.prev.length} · ${wLabel(G.Wn)} ${r.next.length} entrega(s), ${fmt(r.qn)} u.${r.vq?` · vencido ${fmt(r.vq)} u.`:''}`);}
  L.push('');L.push('Los informes PDF por proveedor se descargan desde Gestión y Monitoreo de Entregas > Proveedores > Reunión semanal.');
  return {subj,body:L.join('\n')};
}
function mailProv(prov){
  const subj=`Cumplimiento de entregas ${wLabel(CUR)} · ${prov} · favor revisar informe adjunto`;
  const firma=[S.me&&S.me.name&&S.mode==='db'?S.me.name:'','Abastecimiento · C&L Fruit'].filter(Boolean);
  const L=[`Estimados ${prov}:`,'',
    `Junto con saludar, les enviamos adjunto el informe de entregas de la semana ${wLabel(CUR)}. Les pedimos abrirlo y revisarlo con su equipo.`,'',
    'Que cada entrega llegue en la semana y cantidad acordadas es clave para nosotros: sus materiales abastecen el embalaje de la fruta y, en plena temporada, un atraso puede detener una línea de proceso.','',
    'Si ven algún riesgo de no cumplir, les agradeceremos avisarnos apenas lo detecten, para reorganizar el calendario en conjunto.','',
    'Muchas gracias por su compromiso.','','Saludos cordiales,',...firma];
  return {subj,body:L.join('\n')};
}

/* --- PDF (pdf-lib) --- */
const PC={ink:[.12,.1,.11],muted:[.43,.39,.42],line:[.87,.84,.86],acc:[.584,.102,.227],accSoft:[.965,.894,.914],ok:[.137,.47,.29],okSoft:[.882,.949,.906],bad:[.72,.2,.165],badSoft:[.984,.89,.878],warn:[.66,.416,.07],warnSoft:[.984,.937,.851],soft:[.972,.966,.969],white:[1,1,1]};
const san=s=>String(s??'').replace(/[–—−]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/…/g,'...').replace(/→/g,'->').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/\s+/g,' ').replace(/[^\x20-\x7E\xA0-\xFF]/g,'');
class PdfW{
  constructor(doc,f,fb){Object.assign(this,{doc,f,fb,W:595.28,H:841.89,M:34,pages:[]});}
  col(c){return PDFLib.rgb(c[0],c[1],c[2]);}
  newPage(){this.page=this.doc.addPage([this.W,this.H]);this.pages.push(this.page);this.y=this.H-this.M;if(this.onPage)this.onPage(this);}
  need(h){if(this.y-h<this.M+24){this.newPage();return true;}return false;}
  width(s,size,bold){return (bold?this.fb:this.f).widthOfTextAtSize(san(s),size);}
  fit(s,size,bold,maxW){s=san(s);if(this.width(s,size,bold)<=maxW)return s;while(s.length>1&&this.width(s+'...',size,bold)>maxW)s=s.slice(0,-1);return s+'...';}
  text(s,x,y,o={}){const size=o.size||9,bold=!!o.bold;const t=o.maxW?this.fit(s,size,bold,o.maxW):san(s);if(!t)return;const w=this.width(t,size,bold);if(o.align==='right')x-=w;else if(o.align==='center')x-=w/2;this.page.drawText(t,{x,y,size,font:bold?this.fb:this.f,color:this.col(o.color||PC.ink)});}
  rect(x,y,w,h,fill){this.page.drawRectangle({x,y,width:w,height:h,color:this.col(fill)});}
  line(x1,y1,x2,y2,c,t,dash){this.page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:t||0.4,color:this.col(c||PC.line),dashArray:dash});}
  wrap(s,size,bold,maxW){const words=san(s).split(' ');const out=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(cur&&this.width(t,size,bold)>maxW){out.push(cur);cur=w;}else cur=t;}if(cur)out.push(cur);return out;}
  para(s,o={}){const size=o.size||9,lh=size*1.38,x=this.M+(o.indent||0),maxW=this.W-2*this.M-(o.indent||0)-(o.bullet?10:0);const ls=this.wrap(s,size,o.bold,maxW);this.need(ls.length*lh+2);ls.forEach((t,i)=>{if(o.bullet&&i===0)this.rect(x+1,this.y-size*0.72,3.2,3.2,o.bulletColor||PC.acc);this.text(t,x+(o.bullet?10:0),this.y-size,{size,bold:o.bold,color:o.color});this.y-=lh;});this.y-=(o.after??3);}
  h2(s,sub){this.need(60);this.y-=8;this.text(s,this.M,this.y-12,{size:11.5,bold:true,color:PC.acc,maxW:this.W-2*this.M});this.y-=17;if(sub){this.text(sub,this.M,this.y-8,{size:7.6,color:PC.muted,maxW:this.W-2*this.M});this.y-=12;}this.line(this.M,this.y,this.W-this.M,this.y,PC.line,0.6);this.y-=5;}
  table(cols,rows,o={}){
    const size=o.size||7.5,rh=size+7.6,tw=this.W-2*this.M;const tot=sum(cols,c=>c.w);const ws=cols.map(c=>c.w/tot*tw);
    if(!rows.length){this.para(o.empty||'Sin registros.',{size:8.4,color:PC.muted});return;}
    const head=()=>{this.rect(this.M,this.y-rh,tw,rh,PC.soft);let x=this.M;cols.forEach((c,i)=>{const r=c.align==='right';this.text(c.h,r?x+ws[i]-4:x+4,this.y-rh+5,{size:size-0.5,bold:true,color:PC.muted,align:r?'right':'left',maxW:ws[i]-8});x+=ws[i];});this.y-=rh;};
    this.need(rh*2+4);head();
    rows.forEach((r,ri)=>{const cells=r.cells||r;const st0=(!Array.isArray(r)&&r.style)||{};
      const L=cells.map((v,i)=>cols[i].wrap?this.wrap(v,size,!!(st0[i]&&st0[i].bold),ws[i]-8):null);const nl=Math.max(1,...L.map(x=>x?x.length:1));const lh=size+2.4;const rH=rh+(nl-1)*lh;
      if(this.need(rH+2))head();
      if(!Array.isArray(r)&&r.fill)this.rect(this.M,this.y-rH,tw,rH,r.fill);
      let x=this.M;cells.forEach((v,i)=>{const c=cols[i];const rt=c.align==='right';const st=st0[i]||{};const o={size,bold:st.bold||r.bold,color:st.color||r.color,align:rt?'right':'left',maxW:ws[i]-8};
        if(L[i])L[i].forEach((t,j)=>this.text(t,x+4,this.y-rh+5-j*lh,o));else this.text(v,rt?x+ws[i]-4:x+4,this.y-rh+5,o);x+=ws[i];});
      this.line(this.M,this.y-rH,this.M+tw,this.y-rH,PC.line,0.3);this.y-=rH;});
    this.y-=6;}
  kpis(items){const n=items.length,gap=6,tw=this.W-2*this.M,w=(tw-gap*(n-1))/n,h=52;this.need(h+8);items.forEach((it,i)=>{const x=this.M+i*(w+gap);this.rect(x,this.y-h,w,h,i===0?PC.accSoft:PC.soft);this.text(it.k.toUpperCase(),x+7,this.y-12,{size:6.2,bold:true,color:PC.muted,maxW:w-12});this.text(it.v,x+7,this.y-31,{size:15,bold:true,color:it.color||(i===0?PC.acc:PC.ink),maxW:w-12});this.text(it.s||'',x+7,this.y-44,{size:6.4,color:PC.muted,maxW:w-12});});this.y-=h+8;}
  bars(series){const h=112,tw=this.W-2*this.M;this.need(h+6);const top=this.y-4,base=top-h+24,ch=h-42,x0=this.M+26,cw=(tw-30)/Math.max(series.length,1);
    [0,.5,1].forEach(t=>{const yy=base+t*ch;this.line(x0,yy,this.M+tw,yy,PC.line,0.3);this.text(Math.round(t*100)+'%',x0-4,yy-2.5,{size:6.4,color:PC.muted,align:'right'});});
    this.line(x0,base+MO()*ch,this.M+tw,base+MO()*ch,PC.muted,0.5,[2,2]);
    series.forEach((s,i)=>{const bw=Math.min(28,cw*0.62),cx=x0+i*cw+(cw-bw)/2;if(s.v!=null){const bh=Math.max(1.5,s.v*ch);this.rect(cx,base,bw,bh,OKC(s.v));this.text(Math.round(s.v*100)+'%',cx+bw/2,base+bh+3,{size:6.6,bold:true,align:'center'});}else this.text('sin comp.',cx+bw/2,base+3,{size:5.8,color:PC.muted,align:'center'});
      this.text(wLabel(s.wk),cx+bw/2,base-9,{size:6.4,color:PC.muted,align:'center'});if(s.n)this.text(s.n+' comp.',cx+bw/2,base-17,{size:5.6,color:PC.muted,align:'center'});});
    this.y-=h+2;}
  band(title,sub,r1,r2){const h=72;this.rect(0,this.H-h,this.W,h,PC.acc);this.text(title,this.M,this.H-30,{size:14.5,bold:true,color:PC.white,maxW:this.W-2*this.M-150});this.text(sub,this.M,this.H-49,{size:10.5,color:PC.white,maxW:this.W-2*this.M-150});this.text(r1,this.W-this.M,this.H-30,{size:10,bold:true,color:PC.white,align:'right'});this.text(r2,this.W-this.M,this.H-47,{size:7.8,color:PC.white,align:'right'});this.y=this.H-h-14;}
  footer(left){const n=this.pages.length;this.pages.forEach((p,i)=>{p.drawLine({start:{x:this.M,y:this.M-4},end:{x:this.W-this.M,y:this.M-4},thickness:0.4,color:this.col(PC.line)});p.drawText(this.fit(left,6.6,false,this.W-2*this.M-70),{x:this.M,y:this.M-15,size:6.6,font:this.f,color:this.col(PC.muted)});const t='Página '+(i+1)+' de '+n;p.drawText(san(t),{x:this.W-this.M-this.width(t,6.6),y:this.M-15,size:6.6,font:this.f,color:this.col(PC.muted)});});}
}
async function pdfNew(){if(!window.PDFLib)throw new Error('No se pudo cargar el generador de PDF. Revisa tu conexión y recarga la página.');const doc=await PDFLib.PDFDocument.create();doc.setTitle('Informe OTIF '+wLabel(CUR));doc.setAuthor('C&L Fruit · Abastecimiento');const f=await doc.embedFont(PDFLib.StandardFonts.Helvetica);const fb=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);return new PdfW(doc,f,fb);}
const OKC=v=>v==null?PC.ink:v>=MO()?PC.ok:v>=MA()?PC.warn:PC.bad;
function pdfSupplier(w,prov){
  const R=repData(prov);const sec=S.cfg.rsec||{};const tu=Math.round(S.cfg.tolUnder*100),to=Math.round(S.cfg.tolOver*100);
  w.newPage();w.band('Informe semanal de cumplimiento de entregas',prov,'Semana '+wLabel(CUR)+' · '+wDates(CUR),'Emitido '+new Date().toLocaleDateString('es-CL')+' · '+filtText());
  w.para(`C&L Fruit · Abastecimiento de materiales de embalaje. Cada compromiso se mide por OC + producto + planta + semana. OT: la entrega llega en la semana comprometida. IF: la cantidad recibida está entre -${tu}% y +${to}% de lo comprometido. OTIF = OT x IF. Solo se consideran semanas cerradas.`,{size:7.6,color:PC.muted,after:7});
  if(sec.kpi!==false)w.kpis([{k:'OTIF temporada',v:pct(R.K.otif),s:`${R.K.ok} de ${R.K.n} compromisos`},{k:'OTIF últimas 4 sem.',v:pct(R.K4.otif),s:R.tr!=null?`${R.tr>=0?'+':''}${NF1.format(R.tr*100)} pp vs 4 sem. previas`:'sin base de comparación',color:OKC(R.K4.otif)},{k:'On Time',v:pct(R.K.ot),s:'temporada'},{k:'In Full',v:pct(R.K.inf),s:'temporada'},{k:'Fill rate',v:pct(R.K.fill),s:'unidades recibidas / comprometidas'},{k:'Avance entregas',v:pct(R.comprado?R.recib/R.comprado:null),s:`${fmt(R.recib)} de ${fmt(R.comprado)} u.`}]);
  if(sec.kpi!==false){const KA=kpi(allEvals());const vr=(x,y)=>x==null||y==null?'-':`${x>=y?'+':''}${NF1.format((x-y)*100)} pp`;
    w.h2('Indicadores generales',`Semanas cerradas. Últimas 4 semanas: ${wLabel(wAdd(CUR,-4))}-${wLabel(R.W1)}. Meta OTIF ${pct(MO())}. Fill rate: unidades recibidas (hasta lo comprometido) sobre comprometidas.`);
    w.table([{h:'Indicador',w:110},{h:'Temporada',w:75,align:'right'},{h:'Últimas 4 sem.',w:75,align:'right'},{h:'4 sem. previas',w:75,align:'right'},{h:'Variación',w:70,align:'right'},{h:'Promedio proveedores',w:95,align:'right'}],
      [['otif','OTIF'],['ot','On Time'],['inf','In Full'],['fill','Fill rate']].map(([k,t])=>({cells:[t,pct(R.K[k]),pct(R.K4[k]),pct(R.Kp[k]),vr(R.K4[k],R.Kp[k]),pct(KA[k])],style:{1:{bold:true,...(k==='otif'?{color:OKC(R.K[k])}:{})},4:{color:R.K4[k]!=null&&R.Kp[k]!=null?(R.K4[k]>=R.Kp[k]?PC.ok:PC.bad):PC.muted}}})));}
  if(sec.claves!==false){w.h2('Puntos clave');R.high.forEach(h=>w.para(h,{bullet:true,size:8.6}));}
  if(sec.tend!==false){w.h2('OTIF por semana','Últimas 10 semanas cerradas. Línea punteada: meta '+pct(MO())+'.');w.bars(R.series);}
  if(sec.prox!==false){w.h2(`Compromisos de la próxima semana · ${wLabel(R.Wn)} (${wDates(R.Wn)})`,R.next.length?`${R.next.length} entrega(s) · ${fmt(R.qn)} unidades${R.paln?` · ${fmt(R.paln)} pallets`:''}`:'');
    w.table([{h:'OC',w:62},{h:'Código',w:66},{h:'Producto',w:170},{h:'Planta',w:58},{h:'Cantidad',w:56,align:'right'},{h:'Pallets',w:42,align:'right'}],R.next.map(x=>[x.l.oc,x.l.cod,x.l.prod,x.c.pl,fmt(x.c.plan),x.pal==null?'-':fmt(x.pal)]),{empty:'No hay compromisos calendarizados para la próxima semana.'});}
  if(sec.ant!==false){w.h2(`Incumplimientos de la semana anterior · ${wLabel(R.W1)} (${wDates(R.W1)})`,R.prev.length?`Cumplió ${R.prev.length-R.prevFail.length} de ${R.prev.length} compromisos${R.shortPrev?` · faltaron ${fmt(R.shortPrev)} unidades`:''}`:'');
    w.table([{h:'OC',w:60},{h:'Producto',w:150},{h:'Planta',w:52},{h:'Comprometido',w:58,align:'right'},{h:'Recibido',w:52,align:'right'},{h:'Diferencia',w:52,align:'right'},{h:'OT',w:22,align:'right'},{h:'IF',w:22,align:'right'},{h:'Llegó en',w:40}],
      R.prevFail.map(x=>{const near=!x.e.r?nearestRecWeek(x.l,x.c.pl,x.c.wk):null;return {cells:[x.l.oc,x.l.prod||x.l.cod,x.c.pl,fmt(x.c.qty),fmt(x.e.r),fmt(x.e.r-x.c.qty),String(x.e.ot),String(x.e.inf),x.e.r?wLabel(x.c.wk):''],style:{5:{color:PC.bad,bold:true},6:{color:x.e.ot?PC.ok:PC.bad},7:{color:x.e.inf?PC.ok:PC.bad}}};}),{empty:R.prev.length?'Todos los compromisos de la semana se cumplieron.':'No hubo compromisos medidos la semana anterior.'});}
  if(sec.curso!==false){w.h2(`Semana en curso · ${wLabel(CUR)} (${wDates(CUR)})`,R.cur.length?`Comprometido ${fmt(R.qc)} · recibido a la fecha ${fmt(R.rc)} (${pct(R.qc?R.rc/R.qc:null)})`:'');
    w.table([{h:'OC',w:62},{h:'Producto',w:170},{h:'Planta',w:58},{h:'Comprometido',w:62,align:'right'},{h:'Recibido a la fecha',w:72,align:'right'},{h:'Pendiente',w:56,align:'right'}],R.cur.map(x=>({cells:[x.l.oc,x.l.prod||x.l.cod,x.c.pl,fmt(x.c.qty),fmt(x.e.r),fmt(Math.max(0,x.c.qty-x.e.r))],style:{5:{bold:true,color:x.c.qty-x.e.r>0?PC.warn:PC.ok}}})),{empty:'Sin compromisos en la semana en curso.'});}
  if(sec.venc){w.h2('Entregas vencidas pendientes','Compromisos de semanas cerradas con cantidad aún no recibida ni recalendarizada.');
    w.table([{h:'Semana',w:40},{h:'OC',w:62},{h:'Producto',w:170},{h:'Planta',w:58},{h:'Comprometido',w:60,align:'right'},{h:'Recibido',w:56,align:'right'},{h:'Pendiente',w:56,align:'right'}],R.venc.map(x=>({cells:[wLabel(x.c.wk),x.l.oc,x.l.prod||x.l.cod,x.c.pl,fmt(x.c.qty),fmt(x.e.r),fmt(x.f)],style:{6:{bold:true,color:PC.bad}}})),{empty:'No hay entregas vencidas pendientes.'});}
  if(sec.look){w.h2('Calendario de las próximas 4 semanas','Unidades comprometidas por producto, planta y semana.');const looks=[...R.lookPl.values()].sort((a,b)=>String(a.prod).localeCompare(b.prod)||String(a.pl).localeCompare(b.pl));
    w.table([{h:'Producto',w:140},{h:'Código',w:72},{h:'Planta',w:52},...R.lookW.map(x=>({h:wLabel(x)+' · '+wDates(x).slice(0,5),w:56,align:'right'})),{h:'Total',w:50,align:'right'}],looks.map(o=>({cells:[o.prod,o.cod,o.pl,...R.lookW.map(x=>o.w[x]?fmt(o.w[x]):'-'),fmt(sum(R.lookW,x=>o.w[x]||0))],style:{[3+R.lookW.length]:{bold:true}}})),{empty:'Sin compromisos en las próximas 4 semanas.'});}
  if(sec.ocs){w.h2('Estado de sus órdenes de compra','Avance de cada línea: recibido sobre adjudicado y lo que falta calendarizar.');const usd=false;
    w.table([{h:'OC',w:58},{h:'Código',w:62},{h:'Producto',w:140},{h:'Adjudicado',w:56,align:'right'},{h:'Recibido',w:52,align:'right'},{h:'% avance',w:42,align:'right'},{h:'Calendario futuro',w:58,align:'right'},{h:'Sin calendario',w:52,align:'right'},...(usd?[{h:'USD pend.',w:48,align:'right'}]:[])],
      R.ocs.map(o=>({cells:[o.l.oc,o.l.cod,o.l.prod,fmt(o.adj),fmt(o.r),pct(o.adj?o.r/o.adj:null),fmt(o.fut),fmt(o.sinCal),...(usd?[o.val==null?'-':fmt(o.val)]:[])],style:{7:{color:o.sinCal>0?PC.bad:PC.ink}}})));}
  if(sec.meta){w.h2('Avance acumulado vs meta mensual por formato',`Meta según la política de abastecimiento. Mes actual: ${ymLabel(R.metaA.curYM)}.`);const ms=R.metaA.months.filter(M=>R.metaA.rows.some(g=>avMeta(g,M)));
    w.table([{h:'Formato',w:110},{h:'Adjudicado',w:60,align:'right'},...ms.map(M=>({h:'Plan/meta '+ymLabel(M),w:62,align:'right'})),{h:'% real hoy',w:50,align:'right'}],R.metaA.rows.map(g=>({cells:[g.label,fmt(g.adj),...ms.map(M=>`${pct(avPct(g,M))} / ${pct(avMeta(g,M))}`),pct(g.adj?g.real/g.adj:null)]})),{empty:'Sin metas definidas para estos productos.'});}
  if(sec.tmod!==false){const MD=modData(R.lines);w.h2('Tasa de modificación del plan confirmado','Cambios hechos después de confirmar el calendario, en unidades sobre el plan confirmado.');
    if(!MD.baseQ)w.para('Aún no hay calendarios confirmados para este proveedor.',{size:8.4,color:PC.muted});
    else{w.para(`Del plan confirmado (${fmt(MD.baseQ)} unidades en ${fmt(MD.baseN)} compromisos) se modificaron ${fmt(MD.units)} unidades: tasa de modificación ${pct(MD.units/MD.baseQ)}. Atribuible al proveedor: ${fmt(MD.penU)} unidades (${pct(MD.penU/MD.baseQ)}).`,{size:8.8});
      w.table([{h:'Responsable',w:150},{h:'Cambios',w:50,align:'right'},{h:'Unidades',w:70,align:'right'},{h:'% del plan',w:60,align:'right'},{h:'Efecto',w:80}],MD.byResp.map(o=>({cells:[o.resp,String(o.n),fmt(o.units),pct(o.units/MD.baseQ),o.pen?'Penaliza':'Informativo'],style:{4:{color:o.pen?PC.acc:PC.muted,bold:o.pen}}})),{empty:'Sin cambios al plan confirmado.'});}}
  if(sec.cambios){w.h2('Cambios de calendario atribuidos al proveedor',`${R.cambios.length} cambio(s) en la temporada con responsable que penaliza.`);
    w.table([{h:'Fecha',w:52},{h:'OC',w:58},{h:'Producto',w:130},{h:'Desde',w:62},{h:'Cambio',w:92},{h:'Motivo',w:120}],R.cambios.slice(0,15).map(({l,e})=>[new Date(e.t).toLocaleDateString('es-CL'),l.oc,l.prod||l.cod,`${wLabel(e.wk)} ${e.pl}`,e.moved&&e.moved.length?'-> '+e.moved.map(m=>wLabel(m.wk)+' '+m.pl).join(', '):`${fmt(e.before)} -> ${fmt(e.after)}`,e.mot||'']),{empty:'Sin cambios atribuidos al proveedor.'});}
  if(sec.sinc){w.h2('Entregas fuera de calendario o en otra planta','Recepciones de las últimas 2 semanas sin compromiso en esa semana y planta.');
    w.table([{h:'Semana',w:44},{h:'OC',w:60},{h:'Producto',w:160},{h:'Planta',w:60},{h:'Cantidad',w:56,align:'right'},{h:'Compromiso más cercano',w:110}],R.sinc.map(x=>[wLabel(x.wk),x.l.oc,x.l.prod||x.l.cod,x.pl,fmt(x.q),x.near?`${wLabel(x.near.c.wk)} ${x.near.c.pl}`:'-']),{empty:'Todas las entregas recientes coincidieron con el calendario.'});}
  if(sec.rank&&R.rk){w.h2('Posición entre proveedores de la categoría');w.para(`Con un OTIF de temporada de ${pct(R.K.otif)}, ocupa el lugar ${R.rk.pos} de ${R.rk.of} proveedores de ${R.catLabel} con al menos 3 compromisos medidos.`,{size:9});}
  {const mt=meetFor(prov);if(mt)pdfActa(w,mt,R);}
  return R;
}
function pdfCover(w,G){
  w.newPage();w.band('Resumen semanal de cumplimiento de proveedores','Materiales de embalaje · '+filtText(),'Semana '+wLabel(CUR)+' · '+wDates(CUR),'Emitido '+new Date().toLocaleDateString('es-CL'));
  w.kpis([{k:'OTIF temporada',v:pct(G.K.otif),s:`${G.K.ok} de ${G.K.n} compromisos`},{k:'OTIF últimas 4 sem.',v:pct(G.K4.otif),color:OKC(G.K4.otif)},{k:wLabel(G.W1)+' cumplidos',v:`${G.prev.length-G.prevFail.length}/${G.prev.length}`,s:G.shortPrev?`faltaron ${fmt(G.shortPrev)} u.`:''},{k:'Próxima semana',v:fmt(G.qn),s:`${G.nn} entregas · ${fmt(G.paln)} pallets`},{k:'Vencido pendiente',v:fmt(G.vq),s:`${G.nv} compromisos`,color:G.vq?PC.bad:PC.ink}]);
  w.h2('Proveedores','Ordenados por OTIF de las últimas 4 semanas (menor a mayor).');
  const reps=G.reps.filter(r=>r.ev.length).sort((a,b)=>(a.K4.otif??2)-(b.K4.otif??2));
  w.table([{h:'Proveedor',w:150},{h:'OTIF temp.',w:46,align:'right'},{h:'OTIF 4 sem.',w:46,align:'right'},{h:wLabel(G.W1)+' ok/total',w:52,align:'right'},{h:'Faltó '+wLabel(G.W1),w:56,align:'right'},{h:'Vencido',w:52,align:'right'},{h:wLabel(G.Wn)+' unid.',w:56,align:'right'}],
    reps.map(r=>({cells:[r.prov,pct(r.K.otif),pct(r.K4.otif),`${r.prev.length-r.prevFail.length}/${r.prev.length}`,r.shortPrev?fmt(r.shortPrev):'-',r.vq?fmt(r.vq):'-',fmt(r.qn)],style:{2:{bold:true,color:OKC(r.K4.otif)},4:{color:r.shortPrev?PC.bad:PC.ink},5:{color:r.vq?PC.bad:PC.ink}}})));
  const M=mailGeneral().body.split('A RECALCAR')[1]?.split('POR PROVEEDOR')[0]||'';
  w.h2('A recalcar');M.split('\n').map(s=>s.trim()).filter(Boolean).forEach(s=>w.para(s.replace(/^[-·]\s*/,''),{bullet:!s.startsWith('·'),indent:s.startsWith('·')?12:0,size:8.4}));
}
async function downloadPdf(which){
  const btn=document.activeElement;if(btn&&btn.tagName==='BUTTON'){btn.disabled=true;btn.dataset.lbl=btn.textContent;btn.textContent='Generando…';}
  try{
    const w=await pdfNew();let name;
    if(which==='all'){const G=generalData();pdfCover(w,G);for(const r of G.reps.filter(r=>r.ev.length))pdfSupplier(w,r.prov);name=`Informe_OTIF_proveedores_${wLabel(CUR)}.pdf`;}
    else{pdfSupplier(w,which);name=`Informe_OTIF_${segSafe(which).slice(0,40)}_${wLabel(CUR)}.pdf`;}
    w.footer(`C&L Fruit · Abastecimiento · Informe generado desde Gestión y Monitoreo de Entregas · Consultas: ${S.cfg.email||''}`);
    const bytes=await w.doc.save();await saveBlob(name,bytes,'application/pdf');
  }catch(e){toast(e.message||String(e));}
  finally{if(btn&&btn.dataset.lbl){btn.disabled=false;btn.textContent=btn.dataset.lbl;}}
}
async function saveBlob(name,bytes,type){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Descarga lista: '+name);
}
function exportRepXlsx(prov){
  const R=repData(prov);const wb=XLSX.utils.book_new();const add=(n,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{'':'Sin registros'}]),n);
  add('Resumen',[{'Proveedor':prov,'Semana':wLabel(CUR),'OTIF temporada':R.K.otif,'OTIF 4 semanas':R.K4.otif,'OT':R.K.ot,'IF':R.K.inf,'Fill rate':R.K.fill,'Adjudicado':R.comprado,'Recibido':R.recib,'Vencido pendiente':R.vq,'Sin calendario':R.sinCal}].concat(R.high.map(h=>({'Proveedor':h}))));
  add('Próxima semana',R.next.map(x=>({'OC':x.l.oc,'Código':x.l.cod,'Producto':x.l.prod,'Planta':x.c.pl,'Semana':wLabel(x.c.wk),'Cantidad':x.c.plan,'Pallets':x.pal})));
  add('Incumplidos sem. anterior',R.prevFail.map(x=>({'OC':x.l.oc,'Código':x.l.cod,'Producto':x.l.prod,'Planta':x.c.pl,'Semana':wLabel(x.c.wk),'Comprometido':x.c.qty,'Recibido':x.e.r,'OT':x.e.ot,'IF':x.e.inf})));
  add('Próximas 4 semanas',[...R.lookPl.values()].map(o=>{const r={'Producto':o.prod,'Código':o.cod,'OC':[...o.ocs].join(', '),'Planta':o.pl};for(const x of R.lookW)r[wLabel(x)]=o.w[x]||0;r['Total']=sum(R.lookW,x=>o.w[x]||0);return r;}));
  add('Semana en curso',R.cur.map(x=>({'OC':x.l.oc,'Código':x.l.cod,'Producto':x.l.prod,'Planta':x.c.pl,'Comprometido':x.c.qty,'Recibido a la fecha':x.e.r})));
  add('Vencido pendiente',R.venc.map(x=>({'Semana':wLabel(x.c.wk),'OC':x.l.oc,'Producto':x.l.prod,'Planta':x.c.pl,'Comprometido':x.c.qty,'Recibido':x.e.r,'Pendiente':x.f})));
  add('Órdenes de compra',R.ocs.map(o=>({'OC':o.l.oc,'Código':o.l.cod,'Producto':o.l.prod,'Adjudicado':o.adj,'Recibido':o.r,'% avance':o.adj?o.r/o.adj:null,'Calendario futuro':o.fut,'Sin calendario':o.sinCal})));
  saveFile(`Informe_OTIF_${segSafe(prov).slice(0,40)}_${wLabel(CUR)}.xlsx`,wb);
}
/* =========================================================
   Reunión semanal Proveedor
   ========================================================= */
const meetId=(prov,wk)=>segSafe(prov).slice(0,80)+'~'+(wk||CUR);
function meetFor(prov,wk){return (S.meets||{})[meetId(prov,wk)]||null;}
function ensureMeet(prov){const id=meetId(prov);S.meets=S.meets||{};if(!S.meets[id])S.meets[id]={id,prov,wk:CUR,status:'borrador',createdAt:nowISO(),by:S.me.id||'local',gf:S.me.name&&S.mode==='db'?S.me.name:'',pv:'',notes:'',causes:{},cur:{},curc:{},next:{},acuerdos:[]};return S.meets[id];}
function saveMeet(m){if(!S.canWrite)return;m.updatedAt=nowISO();Store.write('meet/'+m.id,m);}
function prevMeet(prov){let b=null;for(const m of Object.values(S.meets||{}))if(m.prov===prov&&m.wk<CUR&&m.status==='cerrada'&&(!b||m.wk>b.wk))b=m;return b;}
function meetTxt(kind,k){try{
  const kk=k||D.k;const l=S.ix.byK[kk];const p=planOf(kk);const c=D&&D.cid?(p.commits||[]).find(x=>x.id===D.cid):null;const P=`${l.prod||l.cod} (OC ${l.oc})`;
  const rw=rs=>cleanRows(rs).map(r=>`${wLabel(r.wk)} ${r.pl} ${fmt(r.qty)} u.`).join(', ');const first=rs=>{const r=cleanRows(rs)[0];return r?r.wk:null;};
  if(kind==='recal')return {txt:`Recalendarizar faltante de ${wLabel(c.wk)} ${c.pl} de ${P}: ${rw(D.rows)}`,due:first(D.rows)};
  if(kind==='adel')return {txt:`Descontar adelanto de ${wLabel(c.wk)} ${c.pl} de ${P}: `+D.arows.filter(a=>+a.qty>0).map(a=>{const f=p.commits.find(x=>x.id===a.cid);return `${fmt(a.qty)} u. de ${wLabel(f.wk)} ${f.pl}`;}).join(', ')};
  if(kind==='saldo')return {txt:`Saldo cancelado de ${fmt(D.qty)} u. de ${P}: no se entregará`};
  if(kind==='modify'){const mv=cleanRows(D.rows).filter(r=>!(r.wk===c.wk&&r.pl===c.pl));return {txt:`Reprogramar ${P} de ${wLabel(c.wk)} ${c.pl}${+D.newQty>0?`: queda ${fmt(D.newQty)} u.`:': 0 u.'}${mv.length?` · mover ${rw(mv)}`:''} (responsable ${D.resp||'sin definir'})`,due:(mv[0]&&mv[0].wk)||c.wk};}
  if(kind==='agendar')return {txt:`Agendar ${P}: ${rw(D.rows)}`,due:first(D.rows)};
  if(kind==='exceso')return {txt:`Exceso de ${fmt(recTot(kk)-(+l.qty||0)-(+p.excess||0))} u. de ${P} registrado`};
}catch(e){}return null;}
function meetLog(t){if(!t||S.view!=='informe'||!S.rProv)return;const m=ensureMeet(S.rProv);if(m.status==='cerrada')return;m.acuerdos.push({id:uid(),txt:t.txt,resp:'Proveedor',fecha:t.due?wLabel(t.due):'',estado:'pendiente',auto:true});saveMeet(m);}
/* lo reprogramado o recalendarizado desde un compromiso: "40.000 reprogramados a W46" */
function movedTxt(p,c){if(!p||!c)return '';const out=[];
  for(const e of p.log||[])if(e.cid===c.id&&Array.isArray(e.moved))for(const m of e.moved)out.push(fmt(m.qty)+' reprogramados a '+wLabel(m.wk));
  for(const x of p.commits||[])if(x.parent===c.id&&x.src==='recal'&&x.st!=='cancelada')out.push(fmt(x.qty)+' recalendarizados a '+wLabel(x.wk));
  return out.join(' · ');}
const MSTEPS=[['kpi','Indicadores generales'],['prev','Acuerdos anteriores'],['ant','Semana anterior'],['dif','Diferencias'],['cur','Semana en curso'],['next','Próxima semana'],['cierre','Cierre y acta']];
const CUR_OPT=[['','Sin confirmar'],['completo','Llega completo'],['parcial','Llega parcial'],['riesgo','En riesgo']];
const NEXT_OPT=[['','Sin confirmar'],['ok','Confirmado'],['cambio','Requiere cambio']];
function vInforme(){
  if(!S.ix.lines.length)return noData();
  const list=provList();if(!list.length)return `<div class="panel">${emptyState('Sin proveedores con estos filtros','')}</div>`;
  if(!S.rProv||!list.find(p=>p.prov===S.rProv))S.rProv=(S.filt.prov&&list.find(p=>p.prov===S.filt.prov))?S.filt.prov:list[0].prov;
  const prov=S.rProv;const R=repData(prov);const m=meetFor(prov)||ensureMeet(prov);const pm=prevMeet(prov);const closed=m.status==='cerrada';const ro=closed||!S.canWrite?'disabled':'';
  const step=MSTEPS.find(s=>s[0]===S.tab.mstep)?S.tab.mstep:'kpi';S.tab.mstep=step;
  const tbl=(head,rows,empty)=>`<div class="tw"><table><thead><tr>${head.map(h=>`<th class="${h[1]?'num':''}">${h[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${head.length}" class="muted">${empty}</td></tr>`}</tbody></table></div>`;
  const tblc=(h,r,e)=>r.length?tbl(h,r,e):`<p class="hint" style="margin:0">${e}</p>`;
  const ex=exceptions();const mine=a=>a.filter(x=>x.l.prov===prov);
  const adel=mine(ex.adel),exc=mine(ex.exceso),sal=mine(ex.saldo);
  const counts={prev:pm?pm.acuerdos.filter(a=>a.estado==='pendiente').length:0,ant:R.prevFail.length,dif:R.venc.length+adel.length+exc.length+sal.length+R.ocs.filter(o=>o.sinCal>0&&o.l.st==='Abierta').length,cur:R.cur.length,next:R.next.length,cierre:m.acuerdos.length};
  const stepper=`<div class="tabs" role="tablist">${MSTEPS.map(([k,t],i)=>`<button data-a="mStep" data-s="${k}" aria-pressed="${step===k}">${i+1}. ${t}${counts[k]?` · ${counts[k]}`:''}</button>`).join('')}</div>`;
  let body='';
  if(step==='kpi'){
    const all=allEvals();const KA=kpi(all);const mo=MO();
    const dl=(a,b)=>a==null||b==null?'<span class="muted">–</span>':`<span class="dl ${a>=b?'up':'dn'}">${a>=b?'▲':'▼'} ${Math.abs((a-b)*100).toFixed(1).replace('.',',')} pts</span>`;
    const ind=[['otif','OTIF','Compromisos a tiempo y completos',true],['ot','On Time','Llegó en la semana comprometida'],['inf','In Full',`Cantidad dentro de −${Math.round(S.cfg.tolUnder*100)}% / +${Math.round(S.cfg.tolOver*100)}%`],['fill','Fill rate','Unidades recibidas sobre comprometidas']];
    const tiles=`<div class="tiles">${ind.map(([k,t,d,m])=>{const v=R.K[k];return `<div class="tile ${m?'lead':''}"><span class="k">${t} temporada</span><span class="v" style="color:${m?oCss(v):'inherit'}">${pct(v)}</span><span class="s">${d}${m?` · meta ${pct(mo)}`:''}</span>
      <div class="tpl"><div><span>Últimas 4 sem.</span><b>${pct(R.K4[k])} ${dl(R.K4[k],R.Kp[k])}</b></div><div><span>4 sem. previas</span><b>${pct(R.Kp[k])}</b></div><div><span>Promedio proveedores</span><b>${pct(KA[k])}</b></div></div></div>`;}).join('')}</div>`;
    const ser=R.series.filter(x=>x.n);
    const W=900,H=140,ml=40,mr=10,mt=16,mb=30,iw=W-ml-mr,ih=H-mt-mb,n=Math.max(1,R.series.length),cx=i=>ml+(i+0.5)*iw/n,y=v=>mt+ih-v*ih,bw=Math.min(22,iw/n*0.45);
    const chart=ser.length?`<div class="bchart"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="OTIF semanal del proveedor">${[0,.5,1].map(v=>`<line x1="${ml}" x2="${W-mr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${ml-6}" y="${y(v)+4}" text-anchor="end" class="ax">${v*100}%</text>`).join('')}
      ${R.series.map((x,i)=>`<g><title>${wLabel(x.wk)} · ${x.n?`OTIF ${pct(x.v)} (${x.ok} de ${x.n})`:'sin compromisos medidos'}</title>${x.n?`<rect x="${cx(i)-bw/2}" y="${y(x.v)}" width="${bw}" height="${Math.max(2,x.v*ih)}" rx="4" fill="${x.v>=mo?'var(--s1)':x.v>=MA()?'var(--warn)':'var(--bad)'}"/><text x="${cx(i)}" y="${y(x.v)-5}" text-anchor="middle" class="lb">${Math.round(x.v*100)}</text>`:`<text x="${cx(i)}" y="${y(0)-4}" text-anchor="middle" class="ax">–</text>`}<text x="${cx(i)}" y="${H-16}" text-anchor="middle" class="ax">${wLabel(x.wk)}</text><text x="${cx(i)}" y="${H-4}" text-anchor="middle" class="ax" style="font-size:10px">${x.n?x.n+' comp.':''}</text></g>`).join('')}
      <line x1="${ml}" x2="${W-mr}" y1="${y(mo)}" y2="${y(mo)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W-mr}" y="${y(mo)-5}" text-anchor="end" class="ax" style="fill:var(--ink);font-weight:700">Meta ${pct(mo)}</text></svg></div>`:emptyState('Sin semanas medidas','Este proveedor aún no tiene compromisos de semanas cerradas.');
    body=`<p class="hint">Indicadores del proveedor en semanas cerradas: temporada, últimas 4 semanas (${wLabel(wAdd(CUR,-4))}–${wLabel(R.W1)}) frente a las 4 previas, y el promedio de todos los proveedores como referencia.</p>${tiles}
      <h3 style="margin:14px 0 4px">OTIF por semana</h3>${chart}`;
  }
  if(step==='prev'){
    body=pm?`<p class="hint">Acuerdos de la reunión de ${wLabel(pm.wk)} (cerrada el ${fdt(pm.closedAt)}). Marca si se cumplieron.</p>
      ${tbl([['Acuerdo'],['Responsable'],['Fecha'],['Estado']],pm.acuerdos.map((a,i)=>`<tr><td class="wrap">${esc(a.txt)}</td><td>${esc(a.resp)}</td><td>${esc(a.fecha||'')}</td><td><select id="acp-${i}" data-acp="${i}" ${S.canWrite?'':'disabled'}>${[['pendiente','Pendiente'],['cumplido','Cumplido'],['nocumplido','No cumplido']].map(([v,t])=>`<option value="${v}" ${a.estado===v?'selected':''}>${t}</option>`).join('')}</select></td></tr>`),'La reunión anterior no dejó acuerdos.')}`
      :emptyState('No hay una reunión anterior cerrada con este proveedor','Cuando cierres esta reunión, sus acuerdos aparecerán aquí la próxima semana.');
  }
  if(step==='ant'){
    const K1=kpi(R.prev);
    body=`<div class="tiles">
      <div class="tile lead"><span class="k">OTIF ${wLabel(R.W1)}</span><span class="v" style="color:${oCss(K1.otif)}">${pct(K1.otif)}</span><span class="s">${K1.ok} de ${K1.n} compromisos cumplidos</span></div>
      <div class="tile"><span class="k">On Time</span><span class="v">${pct(K1.ot)}</span><span class="s">${wLabel(R.W1)}</span></div>
      <div class="tile"><span class="k">In Full</span><span class="v">${pct(K1.inf)}</span><span class="s">${wLabel(R.W1)}</span></div>
      <div class="tile"><span class="k">Unidades faltantes</span><span class="v" style="color:${R.shortPrev?'var(--bad)':'inherit'}">${fmt(R.shortPrev)}</span><span class="s">En ${wLabel(R.W1)}</span></div>
      <div class="tile"><span class="k">OTIF temporada</span><span class="v">${pct(R.K.otif)}</span><span class="s">Referencia · ${R.K.ok} de ${R.K.n}</span></div></div>
     <h3 style="margin:14px 0 6px">Incumplimientos de ${wLabel(R.W1)}</h3>
     ${tbl([['OC'],['Producto'],['Planta'],['Comprometido',1],['Recibido',1],['OT'],['IF'],['Causa informada por el proveedor']],R.prevFail.map(x=>`<tr><td class="mono">${esc(x.l.oc)}</td><td class="wrap">${esc(x.l.prod)}</td><td>${esc(x.c.pl)}</td><td class="num">${fmt(x.c.qty)}</td><td class="num">${fmt(x.e.r)}${movedTxt(x.p,x.c)?`<div style="font-size:11.5px;color:var(--info);white-space:nowrap">${movedTxt(x.p,x.c)}</div>`:''}</td><td>${bin(x.e.ot)}</td><td>${bin(x.e.inf)}</td><td style="min-width:240px"><input type="text" id="mc-${x.c.id}" data-mt="causa" data-cid="${x.c.id}" value="${esc(m.causes[x.c.id]||'')}" placeholder="Ej.: falta de papel, quiebre de máquina…" style="width:100%" ${ro}></td></tr>`),R.prev.length?'Todos los compromisos de la semana se cumplieron.':'No hubo compromisos medidos la semana anterior.')}`;
  }
  if(step==='dif'){
    const sinCal=R.ocs.filter(o=>o.sinCal>0&&o.l.st==='Abierta');
    const btn=(a,attrs,t,pri)=>`<button class="btn sm ${pri?'pri':''}" data-a="${a}" ${attrs} ${closed||!S.canWrite?'disabled':''}>${t}</button>`;
    body=`<p class="hint">Coordina aquí la nueva planificación. Cada acción queda como acuerdo en el acta.</p>
     <h3 style="margin:4px 0 6px">Faltantes por recalendarizar · ${R.venc.length}</h3>
     ${tblc([['Semana'],['OC'],['Producto'],['Planta'],['Comprometido',1],['Recibido',1],['Faltante',1],['']],R.venc.map(x=>`<tr><td>${wLabel(x.c.wk)}</td><td class="mono">${esc(x.l.oc)}</td><td class="wrap">${esc(x.l.prod)}</td><td>${esc(x.c.pl)}</td><td class="num">${fmt(x.c.qty)}</td><td class="num">${fmt(x.e.r)}</td><td class="num"><b style="color:var(--bad)">${fmt(x.f)}</b></td><td>${btn('exRecal',`data-k="${esc(x.l.k)}" data-cid="${x.c.id}"`,'Recalendarizar',1)}</td></tr>`),'Sin faltantes pendientes.')}
     <h3 style="margin:14px 0 6px">Cantidad sin calendarizar · ${sinCal.length}</h3>
     ${tblc([['OC'],['Producto'],['Adjudicado',1],['Recibido',1],['Sin calendario',1],['']],sinCal.map(o=>`<tr><td class="mono">${esc(o.l.oc)}</td><td class="wrap">${esc(o.l.prod)}</td><td class="num">${fmt(o.adj)}</td><td class="num">${fmt(o.r)}</td><td class="num"><b style="color:var(--bad)">${fmt(o.sinCal)}</b></td><td><button class="btn sm" data-a="agendar" data-k="${esc(o.l.k)}" ${closed||!S.canWrite?'disabled':''}>Agendar</button></td></tr>`),'Todo lo comprado tiene calendario.')}
     <h3 style="margin:14px 0 6px">Adelantos por descontar · ${adel.length}</h3>
     ${tblc([['Semana'],['OC'],['Producto'],['Planta'],['Comprometido',1],['Recibido',1],['Adelanto',1],['']],adel.map(x=>`<tr><td>${wLabel(x.c.wk)}</td><td class="mono">${esc(x.l.oc)}</td><td class="wrap">${esc(x.l.prod)}</td><td>${esc(x.c.pl)}</td><td class="num">${fmt(x.c.qty)}</td><td class="num">${fmt(x.r)}</td><td class="num"><b style="color:var(--info)">+${fmt(x.f)}</b></td><td>${btn('exAdel',`data-k="${esc(x.l.k)}" data-cid="${x.c.id}"`,'Descontar')}</td></tr>`),'Sin adelantos por descontar.')}
     <h3 style="margin:14px 0 6px">Exceso sobre lo comprado · ${exc.length}</h3>
     ${tblc([['OC'],['Producto'],['Comprado',1],['Recibido',1],['Exceso',1],['']],exc.map(x=>`<tr><td class="mono">${esc(x.l.oc)}</td><td class="wrap">${esc(x.l.prod)}</td><td class="num">${fmt(x.l.qty)}</td><td class="num">${fmt(recTot(x.l.k))}</td><td class="num"><b style="color:var(--info)">+${fmt(x.diff)}</b></td><td><div style="display:flex;flex-direction:column;gap:4px">${excBtns(x.l.k)}</div></td></tr>`),'Sin exceso sobre lo comprado.')}
     <h3 style="margin:14px 0 6px">Líneas cerradas con saldo · ${sal.length}</h3>
     ${tblc([['OC'],['Producto'],['Comprado',1],['Recibido',1],['Saldo',1],['']],sal.map(x=>`<tr><td class="mono">${esc(x.l.oc)}</td><td class="wrap">${esc(x.l.prod)}</td><td class="num">${fmt(x.l.qty)}</td><td class="num">${fmt(recTot(x.l.k))}</td><td class="num"><b>${fmt(x.diff)}</b></td><td>${btn('dSaldo',`data-k="${esc(x.l.k)}"`,'Saldo cancelado')}</td></tr>`),'Sin líneas cerradas con saldo.')}`;
  }
  if(step==='cur'){
    body=`<p class="hint">Semana ${wLabel(CUR)} (${wDates(CUR)}): comprometido ${fmt(R.qc)}, recibido a la fecha ${fmt(R.rc)} (${pct(R.qc?R.rc/R.qc:null)}). Registra lo que confirma el proveedor para lo pendiente.</p>
     ${tbl([['OC'],['Producto'],['Planta'],['Comprometido',1],['Recibido a la fecha',1],['Pendiente',1],['Confirmación del proveedor'],['Comentario']],R.cur.map(x=>{const v=m.cur[x.c.id]||'';const col=v==='riesgo'?'var(--bad)':v==='parcial'?'var(--warn)':v==='completo'?'var(--ok)':'inherit';return `<tr><td class="mono">${esc(x.l.oc)}</td><td class="wrap">${esc(x.l.prod)}</td><td>${esc(x.c.pl)}</td><td class="num">${fmt(x.c.qty)}</td><td class="num">${fmt(x.e.r)}</td><td class="num">${fmt(Math.max(0,x.c.qty-x.e.r))}</td><td><select id="mcur-${x.c.id}" data-mt="cur" data-cid="${x.c.id}" style="color:${col}" ${ro}>${CUR_OPT.map(([k,t])=>`<option value="${k}" ${v===k?'selected':''}>${t}</option>`).join('')}</select></td><td style="min-width:200px"><input type="text" id="mcc-${x.c.id}" data-mt="curc" data-cid="${x.c.id}" value="${esc(m.curc[x.c.id]||'')}" placeholder="Fecha estimada, cantidad…" style="width:100%" ${ro}></td></tr>`;}),'Sin compromisos en la semana en curso.')}`;
  }
  if(step==='next'){
    body=`<p class="hint">Semana ${wLabel(R.Wn)} (${wDates(R.Wn)}): ${R.next.length} entrega(s) por ${fmt(R.qn)} unidades${R.paln?` · ${fmt(R.paln)} pallets`:''}. Si el proveedor no puede cumplir, usa Reprogramar.</p>
     ${tbl([['OC'],['Producto'],['Planta'],['Cantidad',1],['Pallets',1],['Confirmación del proveedor'],['']],R.next.map(x=>{const v=m.next[x.c.id]||'';return `<tr><td class="mono">${esc(x.l.oc)}</td><td class="wrap">${esc(x.l.prod)}</td><td>${esc(x.c.pl)}</td><td class="num">${fmt(x.c.plan)}</td><td class="num">${x.pal==null?'–':fmt(x.pal)}</td><td><select id="mnx-${x.c.id}" data-mt="next" data-cid="${x.c.id}" style="color:${v==='cambio'?'var(--bad)':v==='ok'?'var(--ok)':'inherit'}" ${ro}>${NEXT_OPT.map(([k,t])=>`<option value="${k}" ${v===k?'selected':''}>${t}</option>`).join('')}</select></td><td>${v==='cambio'?`<button class="btn sm pri" data-a="mModify" data-k="${esc(x.l.k)}" data-cid="${x.c.id}" ${closed||!S.canWrite?'disabled':''}>Reprogramar</button>`:''}</td></tr>`;}),'Sin compromisos calendarizados para la próxima semana.')}`;
  }
  if(step==='cierre'){
    const sec=S.cfg.rsec||{};
    body=`<div class="fgrid"><div class="field"><label for="m-gf">Participantes C&L Fruit</label><input id="m-gf" type="text" data-mt="gf" value="${esc(m.gf||'')}" placeholder="Nombres separados por coma" ${ro}></div>
      <div class="field"><label for="m-pv">Participantes ${esc(prov)}</label><input id="m-pv" type="text" data-mt="pv" value="${esc(m.pv||'')}" placeholder="Nombres separados por coma" ${ro}></div></div>
     <div><div class="row" style="margin:6px 0"><h3>Acuerdos · ${m.acuerdos.length}</h3><span class="spacer"></span><button class="btn sm" data-a="acAdd" ${ro}>+ Agregar acuerdo</button></div>
      ${tbl([['Acuerdo'],['Responsable'],['Fecha'],['']],m.acuerdos.map((a,i)=>`<tr><td style="min-width:320px"><input type="text" id="ac-t-${i}" data-ac="txt" data-i="${i}" value="${esc(a.txt)}" style="width:100%" ${ro}></td><td><select id="ac-r-${i}" data-ac="resp" data-i="${i}" ${ro}>${['Proveedor','C&L Fruit','Ambos'].map(r=>`<option ${a.resp===r?'selected':''}>${r}</option>`).join('')}</select></td><td><input type="text" id="ac-f-${i}" data-ac="fecha" data-i="${i}" value="${esc(a.fecha||'')}" placeholder="W46 o fecha" style="width:100px" ${ro}></td><td><button class="xbtn" data-a="acDel" data-i="${i}" aria-label="Quitar acuerdo" ${ro}>✕</button></td></tr>`),'Las acciones que hagas en los pasos anteriores (recalendarizar, descontar, reprogramar, agendar) se agregan aquí solas.')}</div>
     <div class="field"><label for="m-notes">Notas de la reunión</label><textarea id="m-notes" rows="3" data-mt="notes" ${ro}>${esc(m.notes||'')}</textarea></div>
     <details class="sec" ${S.tab.secOpen?'open':''}><summary>Secciones del PDF para el proveedor</summary>
      <div class="fgrid" style="margin-top:8px">${RSEC.map(([k,t,prop])=>{const on=prop?!!sec[k]:sec[k]!==false;return `<label style="display:flex;gap:8px;align-items:flex-start"><input class="cbx" type="checkbox" id="rs-${k}" data-rsec="${k}" ${on?'checked':''}><span>${t}</span></label>`;}).join('')}</div><p class="hint" style="margin-top:6px">El acta con participantes y acuerdos se incluye siempre al final del PDF.</p></details>
     <div class="row" style="margin-top:6px">${closed?`<span class="chip ok">Reunión cerrada el ${fdt(m.closedAt)}</span><button class="btn" data-a="mReopen" ${S.canWrite?'':'disabled'}>Reabrir</button>`:`<button class="btn pri" data-a="mClose" ${S.canWrite?'':'disabled'}>Cerrar reunión y guardar acta</button>`}
      <button class="btn ${closed?'pri':''}" data-a="pdfOne">Descargar PDF para el proveedor</button><button class="btn" data-a="xlsOne">Excel</button><button class="btn ghost" data-a="mMail">Texto del correo</button></div>`;
  }
  const hist=Object.values(S.meets||{}).filter(x=>x.prov===prov&&x.status==='cerrada').length;
  return `<div style="margin:-6px 0 2px"><button class="btn ghost sm" data-a="go" data-v="preparar">← Volver a la lista de reuniones</button></div><div class="panel"><div class="panel-h"><div class="fsel" style="min-width:260px;flex:1"><label for="r-prov">Proveedor</label><select id="r-prov" data-a2="rprov" style="width:100%">${list.map(p=>`<option value="${esc(p.prov)}" ${p.prov===prov?'selected':''}>${esc(p.prov)}${p.act?'':' (sin compromisos recientes)'}</option>`).join('')}</select></div>
     <span class="chip ${closed?'ok':'warn'}">${closed?'Acta cerrada':'Reunión en curso'} · ${wLabel(CUR)}</span>
     <button class="btn ghost sm" data-a="mHist" ${hist?'':'disabled'}>Reuniones anteriores${hist?' · '+hist:''}</button><button class="btn pri sm" data-a="pdfOne">PDF de este proveedor</button><button class="btn sm" data-a="pdfAll">PDF de todos los proveedores</button>
     <p>Revisión de la semana anterior (${wLabel(R.W1)}), la semana en curso (${wLabel(CUR)}) y la próxima (${wLabel(R.Wn)}), con la nueva planificación de faltantes y excesos.</p></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:12px">${stepper}${body}
    <div class="row"><span class="spacer"></span>${(()=>{const i=MSTEPS.findIndex(s=>s[0]===step);return `${i>0?`<button class="btn" data-a="mStep" data-s="${MSTEPS[i-1][0]}">← ${MSTEPS[i-1][1]}</button>`:''}${i<MSTEPS.length-1?`<button class="btn pri" data-a="mStep" data-s="${MSTEPS[i+1][0]}">${MSTEPS[i+1][1]} →</button>`:''}`;})()}</div>
   </div></div>`;
}
function pdfActa(w,m,R){
  w.newPage();w.band('Acta de reunión semanal',R.prov,'Semana '+wLabel(m.wk)+' · '+wDates(m.wk),m.status==='cerrada'?'Cerrada el '+new Date(m.closedAt).toLocaleDateString('es-CL'):'Borrador al '+new Date().toLocaleDateString('es-CL'));
  w.para(`Participantes C&L Fruit: ${m.gf||'—'}`,{size:9});w.para(`Participantes ${R.prov}: ${m.pv||'—'}`,{size:9,after:6});
  w.h2('Acuerdos');w.table([{h:'Acuerdo',w:330,wrap:1},{h:'Responsable',w:80},{h:'Fecha',w:60}],m.acuerdos.map(a=>[a.txt,a.resp,a.fecha||'']),{empty:'Sin acuerdos registrados.'});
  const causas=R.prevFail.filter(x=>m.causes[x.c.id]);
  if(causas.length){w.h2(`Causas informadas de los incumplimientos de ${wLabel(R.W1)}`);w.table([{h:'OC',w:60},{h:'Producto',w:150},{h:'Planta',w:55},{h:'Causa informada',w:210,wrap:1}],causas.map(x=>[x.l.oc,x.l.prod,x.c.pl,m.causes[x.c.id]]));}
  const lab=(o,v)=>(o.find(x=>x[0]===v)||['',''])[1]||'Sin confirmar';
  if(R.cur.length){w.h2(`Confirmación de la semana en curso · ${wLabel(CUR)}`);w.table([{h:'OC',w:60},{h:'Producto',w:150},{h:'Planta',w:55},{h:'Pendiente',w:55,align:'right'},{h:'Confirmación',w:70},{h:'Comentario',w:140,wrap:1}],R.cur.map(x=>({cells:[x.l.oc,x.l.prod,x.c.pl,fmt(Math.max(0,x.c.qty-x.e.r)),lab(CUR_OPT,m.cur[x.c.id]),m.curc[x.c.id]||''],style:{4:{bold:true,color:m.cur[x.c.id]==='riesgo'?PC.bad:m.cur[x.c.id]==='parcial'?PC.warn:m.cur[x.c.id]==='completo'?PC.ok:PC.muted}}})));}
  if(R.next.length){w.h2(`Confirmación de la próxima semana · ${wLabel(R.Wn)}`);w.table([{h:'OC',w:60},{h:'Producto',w:170},{h:'Planta',w:60},{h:'Cantidad',w:60,align:'right'},{h:'Confirmación',w:90}],R.next.map(x=>({cells:[x.l.oc,x.l.prod,x.c.pl,fmt(x.c.plan),lab(NEXT_OPT,m.next[x.c.id])],style:{4:{bold:true,color:m.next[x.c.id]==='cambio'?PC.bad:m.next[x.c.id]==='ok'?PC.ok:PC.muted}}})));}
  const pm=prevMeet(R.prov);if(pm&&pm.acuerdos.length){w.h2(`Seguimiento de acuerdos de ${wLabel(pm.wk)}`);const st={pendiente:'Pendiente',cumplido:'Cumplido',nocumplido:'No cumplido'};w.table([{h:'Acuerdo',w:330,wrap:1},{h:'Responsable',w:80},{h:'Estado',w:70}],pm.acuerdos.map(a=>({cells:[a.txt,a.resp,st[a.estado]||a.estado],style:{2:{bold:true,color:a.estado==='cumplido'?PC.ok:a.estado==='nocumplido'?PC.bad:PC.warn}}})));}
  if(m.notes){w.h2('Notas');w.para(m.notes,{size:9});}
}
function meetMailText(prov){const m=meetFor(prov);if(!m||!m.acuerdos.length)return '';return '\nACUERDOS DE LA REUNIÓN\n'+m.acuerdos.map(a=>`- ${a.txt} · ${a.resp}${a.fecha?' · '+a.fecha:''}`).join('\n')+(m.pv||m.gf?`\n\nParticipantes: ${[m.gf,m.pv].filter(Boolean).join(' / ')}`:'')+'\n';}

/* =========================================================
   Cambios al plan confirmado (tasa de modificación)
   ========================================================= */
function planBase(p){
  if(p.base)return p.base;if(!p.confirmed||!p.confirmedAt)return {qty:0,n:0};
  let q=0;const ids=new Set();
  for(const e of p.log||[]){if(e.t>p.confirmedAt||!['agendar','ajuste'].includes(e.act))continue;const b=typeof e.before==='number'?e.before:0,a=typeof e.after==='number'?e.after:0;
    if(e.field==='Compromiso'){q+=a;ids.add(e.cid);}else if(e.field==='Cantidad (suma)'||e.field==='Cantidad'){q+=a-b;}else if(e.field==='Compromiso eliminado'){q-=b;ids.delete(e.cid);}}
  return {qty:Math.max(0,q),n:ids.size};
}
const motBase=m=>String(m||'').split(' — ')[0]||'Sin motivo';
function modData(lines){
  const ch=[];let baseQ=0,baseN=0;const provBase=new Map();
  for(const l of lines){const p=S.plans[l.k];if(!p||!p.confirmed)continue;const b=planBase(p);baseQ+=b.qty;baseN+=b.n;const pb=provBase.get(l.prov)||{qty:0,n:0};pb.qty+=b.qty;pb.n+=b.n;provBase.set(l.prov,pb);
    for(const e of p.log||[]){
      if(!(e.act==='modificar'||e.act==='reprogramar'))continue;if(e.field==='Cantidad (suma)'||e.field==='Compromiso nuevo')continue;
      if(p.confirmedAt&&e.t<p.confirmedAt)continue;if(!plMatch(e.pl)||!wkMatch(e.wk))continue;
      const c=(p.commits||[]).find(x=>x.id===e.cid);const resp=(c&&c.st==='modificada'&&c.resp)||e.resp||'Sin responsable';
      const mv=e.moved||[];const moved=sum(mv,m=>m.qty);const before=+e.before||0,after=+e.after||0;const units=moved+Math.abs(before-after-moved);
      const parts=[];if(after>0)parts.push(`${wLabel(e.wk)} ${e.pl} ${fmt(after)}`);for(const m of mv)parts.push(`${wLabel(m.wk)} ${m.pl} ${fmt(m.qty)}`);
      const txt=`${wLabel(e.wk)} ${e.pl} ${fmt(before)} → ${parts.length?parts.join(' + '):'eliminado'}`;
      ch.push({l,p,e,c,resp,mot:motBase((c&&c.mot)||e.mot),units,txt,pen:respPen(resp),imp:e.imp||(mv.length?'OT':'IF')});}
  }
  ch.sort((a,b)=>a.e.t<b.e.t?1:-1);
  const units=sum(ch,x=>x.units),penU=sum(ch.filter(x=>x.pen),x=>x.units);const nCom=new Set(ch.map(x=>x.l.k+'|'+x.e.cid)).size;
  const byResp=new Map();for(const x of ch){const o=byResp.get(x.resp)||{resp:x.resp,n:0,units:0,coms:new Set(),pen:x.pen};o.n++;o.units+=x.units;o.coms.add(x.l.k+'|'+x.e.cid);byResp.set(x.resp,o);}
  const byProv=new Map();for(const [prov,b] of provBase)byProv.set(prov,{prov,base:b.qty,baseN:b.n,n:0,units:0,penU:0,mots:new Map()});
  for(const x of ch){const o=byProv.get(x.l.prov);if(!o)continue;o.n++;o.units+=x.units;if(x.pen)o.penU+=x.units;o.mots.set(x.mot,(o.mots.get(x.mot)||0)+1);}
  return {ch,baseQ,baseN,units,penU,nCom,ot:ch.filter(x=>String(x.imp).includes('OT')).length,inf:ch.filter(x=>String(x.imp).includes('IF')).length,
    byResp:[...byResp.values()].sort((a,b)=>b.units-a.units),byProv:[...byProv.values()].filter(o=>o.base||o.n).sort((a,b)=>(b.base?b.units/b.base:0)-(a.base?a.units/a.base:0))};
}
const topMot=m=>{let best='',n=0;for(const [k,v] of m)if(v>n){best=k;n=v;}return best||'–';};
function vModif(tabs){
  const M=modData(fLines());const fr=S.tab.modResp,fp=S.tab.modProv;
  const det=M.ch.filter(x=>(!fr||x.resp===fr)&&(!fp||x.l.prov===fp));
  const tile=(k,v,s,c)=>`<div class="tile"><span class="k">${k}</span><span class="v" style="color:${c||'inherit'}">${v}</span><span class="s">${s}</span></div>`;
  const sel=(on)=>on?'style="background:var(--accent-soft);cursor:pointer"':'style="cursor:pointer"';
  return `<div class="panel"><div class="panel-h"><div class="tabs">${tabs}</div><span class="spacer"></span><button class="btn sm" data-a="exportMod">Descargar Excel</button>
   <p>Solo modificaciones y reprogramaciones hechas después de confirmar el calendario, con responsable. Tasa de modificación = unidades modificadas sobre unidades del plan confirmado. No incluye ajustes en borrador, recepciones no planificadas, faltantes recalendarizados ni saldos cancelados.</p></div>
   <div class="panel-b" style="display:flex;flex-direction:column;gap:16px">
    <div class="tiles">
     ${tile('Plan confirmado',fmt(M.baseQ),`unidades en ${fmt(M.baseN)} compromisos`)}
     ${tile('Tasa de modificación',pct(M.baseQ?M.units/M.baseQ:null),`${fmt(M.units)} u. · ${M.nCom} de ${M.baseN} compromisos (${pct(M.baseN?M.nCom/M.baseN:null)})`)}
     ${tile('Atribuible al proveedor',pct(M.baseQ?M.penU/M.baseQ:null),`${fmt(M.penU)} u. con responsable que penaliza`,M.penU?'var(--accent)':null)}
     ${tile('Impacto',`${M.ot} OT · ${M.inf} IF`,'Cambios de semana o planta · cambios de cantidad')}
    </div>
    <div class="grid2">
     <div><h3 style="margin-bottom:6px">Por responsable</h3><div class="tw"><table><thead><tr><th>Responsable</th><th class="num">Cambios</th><th class="num">Unidades</th><th class="num">% del plan</th><th>Efecto</th></tr></thead><tbody>
      ${M.byResp.map(o=>`<tr data-a="modF" data-f="resp" data-v="${esc(o.resp)}" ${sel(fr===o.resp)}><td>${esc(o.resp)}</td><td class="num">${o.n}</td><td class="num">${fmt(o.units)}</td><td class="num">${pct(M.baseQ?o.units/M.baseQ:null)}</td><td>${o.pen?'<span class="chip acc">Penaliza</span>':'<span class="chip info">Informativo</span>'}</td></tr>`).join('')||`<tr><td colspan="5" class="muted">Sin cambios al plan confirmado.</td></tr>`}</tbody></table></div></div>
     <div><h3 style="margin-bottom:6px">Por proveedor</h3><div class="tw"><table><thead><tr><th>Proveedor</th><th class="num">Plan confirmado</th><th class="num">Modificado</th><th class="num">Tasa</th><th class="num">Atribuible a él</th><th>Motivo más frecuente</th></tr></thead><tbody>
      ${M.byProv.map(o=>`<tr data-a="modF" data-f="prov" data-v="${esc(o.prov)}" ${sel(fp===o.prov)}><td class="wrap">${esc(o.prov)}</td><td class="num">${fmt(o.base)}</td><td class="num">${fmt(o.units)}</td><td class="num"><b>${pct(o.base?o.units/o.base:null)}</b></td><td class="num" style="color:${o.penU?'var(--accent)':'inherit'}">${pct(o.base?o.penU/o.base:null)}</td><td class="wrap">${o.n?esc(topMot(o.mots)):'–'}</td></tr>`).join('')||`<tr><td colspan="6" class="muted">Sin planes confirmados.</td></tr>`}</tbody></table></div></div>
    </div>
    <div><div class="row" style="margin-bottom:6px"><h3>Detalle de cambios · ${det.length}</h3>${fr||fp?`<span class="chip acc">${esc(fr||fp)}</span><button class="btn ghost sm" data-a="modF" data-f="clear">Quitar filtro</button>`:'<span class="hint">Haz clic en un responsable o proveedor para filtrar.</span>'}</div>
     <div class="tw"><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>OC · Código</th><th>Producto</th><th>Cambio</th><th>Responsable</th><th>Motivo</th><th>Impacto</th><th>Efecto OTIF</th></tr></thead><tbody>
     ${det.map(x=>`<tr><td style="white-space:nowrap">${fdt(x.e.t)}</td><td class="wrap">${esc(x.l.prov)}</td><td>${lineLabel(x.l)}</td><td class="wrap">${esc(x.l.prod)}</td><td style="white-space:nowrap">${esc(x.txt)}</td><td>${esc(x.resp)}</td><td class="wrap">${esc((x.c&&x.c.mot)||x.e.mot||'')}</td><td>${esc(x.imp)}</td><td>${x.pen?'<span class="chip acc">Penaliza</span>':'<span class="chip info">Informativo</span>'}</td></tr>`).join('')||`<tr><td colspan="9">${emptyState('Sin cambios al plan confirmado','Aparecen aquí cuando se modifica o reprograma un compromiso después de confirmar el calendario.')}</td></tr>`}
     </tbody></table></div></div>
   </div></div>`;
}
function exportMod(){
  const M=modData(fLines());const wb=XLSX.utils.book_new();const add=(n,r)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(r.length?r:[{'':'Sin registros'}]),n);
  add('Resumen',[{'Plan confirmado (u.)':M.baseQ,'Compromisos confirmados':M.baseN,'Unidades modificadas':M.units,'Tasa de modificación':M.baseQ?M.units/M.baseQ:null,'Compromisos modificados':M.nCom,'Atribuible al proveedor (u.)':M.penU,'Tasa atribuible al proveedor':M.baseQ?M.penU/M.baseQ:null}]);
  add('Por responsable',M.byResp.map(o=>({'Responsable':o.resp,'Cambios':o.n,'Unidades':o.units,'% del plan':M.baseQ?o.units/M.baseQ:null,'Efecto':o.pen?'Penaliza':'Informativo'})));
  add('Por proveedor',M.byProv.map(o=>({'Proveedor':o.prov,'Plan confirmado':o.base,'Modificado':o.units,'Tasa':o.base?o.units/o.base:null,'Atribuible al proveedor':o.base?o.penU/o.base:null,'Motivo más frecuente':o.n?topMot(o.mots):''})));
  add('Detalle',M.ch.map(x=>({'Fecha':x.e.t,'Proveedor':x.l.prov,'OC':x.l.oc,'Código':x.l.cod,'Producto':x.l.prod,'Cambio':x.txt,'Unidades':x.units,'Responsable':x.resp,'Motivo':(x.c&&x.c.mot)||x.e.mot||'','Impacto':x.imp,'Efecto OTIF':x.pen?'Penaliza':'Informativo'})));
  saveFile('Cambios_plan_confirmado_'+wLabel(CUR)+'.xlsx',wb);
}

/* =========================================================
   Maestro de productos
   ========================================================= */
const UNITS=[['pallet','Pallet'],['unidad','Unidad'],['otro','Otro']];
function prodOf(cod){return (S.ix&&S.ix.prod&&S.ix.prod.get(norm(cod)))||null;}
function unitOf(cod){const p=prodOf(cod);return (p&&p.unit)||'pallet';}
function unitLabel(cod){const p=prodOf(cod);const u=unitOf(cod);return u==='otro'?((p&&p.unitName)||'Otro'):(UNITS.find(x=>x[0]===u)||['','Pallet'])[1];}
function pposOf(cod,pl){const p=prodOf(cod);const v=p&&((p.ppos||{})[pl]||p.pposDef);if(+v>0)return +v;return 1;}
function uposOf(cod,pl){const p=prodOf(cod);if(!p)return null;const v=pl?((p.upos||{})[pl]||p.uposDef):(p.uposDef||Object.values(p.upos||{}).find(x=>+x>0));return +v>0?+v:null;}
/* posiciones que ocupa 1 unidad del producto en una planta */
function posFactor(l,pl){if(unitOf(l.cod)==='pallet'){const u=uppOf(l);return u?1/(u*pposOf(l.cod,pl)):null;}const up=uposOf(l.cod,pl);return up?1/up:null;}
const posOf=(l,pl,q)=>{const f=posFactor(l,pl);return f?q*f:null;};
function lineIncomplete(l){return unitOf(l.cod)==='pallet'?!uppOf(l):!uposOf(l.cod,null);}
function ensureProd(cod){S.prod=S.prod||{};const id=segSafe(cod);if(!S.prod[id]){const l=S.ix.lines.find(x=>norm(x.cod)===norm(cod));S.prod[id]={cod,desc:l?l.prod:'',unit:'pallet',uppProv:{},ppos:{},upos:{}};}return S.prod[id];}
let prodT={};
function saveProd(p,now){p.updatedAt=nowISO();p.by=S.me.id||'local';rebuild();const go=()=>{Store.write('prod/'+segSafe(p.cod),p);};clearTimeout(prodT[p.cod]);if(now)go();else prodT[p.cod]=setTimeout(go,700);}
function prodRows(){
  const m=new Map();
  for(const l of fLines()){const k=norm(l.cod);let o=m.get(k);if(!o){o={cod:l.cod,desc:l.prod,cat:l.cat,lines:[],provs:new Set(),qty:0};m.set(k,o);}o.lines.push(l);o.provs.add(l.prov);if(l.st!=='Cancelada')o.qty+=(+l.qty||0);}
  for(const o of m.values()){const p=prodOf(o.cod);o.p=p;o.inc=o.lines.some(lineIncomplete);o.unit=unitOf(o.cod);o.fmt=(p&&p.fmt)||o.lines[0].fmt||'';o.esp=(p&&p.esp)||o.lines[0].esp||'';o.catEf=(p&&p.cat)||o.cat;
    const base=S.ix.lines.find(x=>norm(x.cod)===norm(o.cod));o.uppEf=p&&+p.upp?+p.upp:(base?legacyUpp(base):null);o.nEx=p?Object.values(p.uppProv||{}).filter(v=>+v>0).length:0;o.nPl=p?Object.values(o.unit==='pallet'?(p.ppos||{}):(p.upos||{})).filter(v=>+v>0).length:0;}
  return [...m.values()];
}
function vMaestro(){
  if(!S.ix.lines.length)return noData();
  const all=prodRows();const f=S.tab.mf||{};
  let rows=all.filter(o=>(!f.inc||o.inc)&&(!f.unit||o.unit===f.unit)).sort((a,b)=>(b.inc-a.inc)||b.qty-a.qty);
  const nInc=all.filter(o=>o.inc).length;const shown=rows.slice(0,300);const dis=S.canWrite?'':'disabled';
  const fmts=[...new Set(all.map(o=>o.fmt).filter(Boolean))].sort();
  const tile=(k,v,s,c)=>`<div class="tile"><span class="k">${k}</span><span class="v" style="color:${c||'inherit'}">${v}</span><span class="s">${s}</span></div>`;
  return `<datalist id="dl-fmt">${fmts.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
  <div class="tiles">${tile('Productos',fmt(all.length),'Con órdenes de compra cargadas (según filtros)')}${tile('Ficha completa',fmt(all.length-nInc),'Se pueden convertir a posiciones','var(--ok)')}${tile('Ficha incompleta',fmt(nInc),'Falta unidad de almacenamiento o unidades por pallet / posición',nInc?'var(--bad)':null)}</div>
  <div class="panel"><div class="panel-h"><h2>Fichas de producto</h2><span class="spacer"></span>
    <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input class="cbx" type="checkbox" id="mf-inc" data-mf="inc" ${f.inc?'checked':''}>Solo incompletos</label>
    <div class="fsel"><label for="mf-unit">Unidad de almacenamiento</label><select id="mf-unit" data-mf="unit" style="width:150px"><option value="">Todas</option>${UNITS.map(([k,t])=>`<option value="${k}" ${f.unit===k?'selected':''}>${t}</option>`).join('')}</select></div>
    <button class="btn sm" data-a="prodExport">Descargar Excel</button><label class="btn sm pri" for="file-prod" ${S.canWrite?'':'aria-disabled="true"'}>Cargar Excel</label><input type="file" id="file-prod" data-prodfile="1" accept=".xlsx,.xls" hidden ${dis}>
    <p>Posiciones = cantidad ÷ unidades por posición. Para productos en pallet: unidades por pallet × pallets por posición (este último puede variar por planta; si queda vacío se usa 1). Para productos por unidad u otro: unidades por posición directas, también por planta. Las excepciones por proveedor y los valores por planta se editan en "Ficha". Los campos vacíos usan el mantenedor cargado en Datos y configuración (se muestran en gris).</p></div>
   <div class="tw"><table><thead><tr><th>Código · descripción</th><th>Categoría</th><th>Especie</th><th>Formato</th><th>Almacenamiento</th><th class="num">Unid. por pallet</th><th class="num">Por posición</th><th>Estado</th><th></th></tr></thead><tbody>
   ${shown.map(o=>{const p=o.p||{};const id=segSafe(o.cod);const isP=o.unit==='pallet';const pl=S.cfg.plants.find(x=>x.cap)||S.cfg.plants[0];
     const defPos=isP?(p.pposDef||''):(p.uposDef||'');const phPos=isP?'1':'';
     return `<tr><td class="wrap" style="min-width:170px"><span class="mono" style="font-size:12px">${esc(o.cod)}</span><div style="font-size:12.5px">${esc(o.desc)}</div></td>
      <td><input type="text" id="pf-cat-${id}" data-pf="cat" data-cod="${esc(o.cod)}" value="${esc(p.cat||'')}" placeholder="${esc(o.cat)}" style="width:125px" ${dis}></td>
      <td><input type="text" id="pf-esp-${id}" data-pf="esp" data-cod="${esc(o.cod)}" value="${esc(p.esp||'')}" placeholder="${esc(o.lines[0].esp||'')}" style="width:85px" ${dis}></td>
      <td><input type="text" id="pf-fmt-${id}" data-pf="fmt" data-cod="${esc(o.cod)}" value="${esc(p.fmt||'')}" placeholder="${esc(o.lines[0].fmt||'')}" list="dl-fmt" style="width:115px" ${dis}></td>
      <td><div class="row" style="flex-wrap:nowrap;gap:4px"><select id="pf-unit-${id}" data-pf="unit" data-cod="${esc(o.cod)}" ${dis}>${UNITS.map(([k,t])=>`<option value="${k}" ${o.unit===k?'selected':''}>${t}</option>`).join('')}</select>${o.unit==='otro'?`<input type="text" id="pf-un-${id}" data-pf="unitName" data-cod="${esc(o.cod)}" value="${esc(p.unitName||'')}" placeholder="Bobina, caja…" style="width:90px" ${dis}>`:''}</div></td>
      <td class="num">${isP?`<input class="posin" type="number" min="0" id="pf-upp-${id}" data-pf="upp" data-cod="${esc(o.cod)}" value="${p.upp||''}" placeholder="${o.uppEf&&!p.upp?fmt(o.uppEf):''}" style="width:80px" ${dis}>`:'<span class="muted">–</span>'}</td>
      <td class="num"><input class="posin" type="number" min="0" step="0.5" id="pf-def-${id}" data-pf="${isP?'pposDef':'uposDef'}" data-cod="${esc(o.cod)}" value="${defPos}" placeholder="${phPos}" style="width:70px" ${dis} title="${isP?'Pallets por posición':'Unidades por posición'}"><div class="muted" style="font-size:11px">${isP?'pallets/pos.':esc(unitLabel(o.cod).toLowerCase())+'s/pos.'}</div></td>
      <td>${o.inc?'<span class="chip bad">Incompleta</span>':'<span class="chip ok">Completa</span>'}</td>
      <td><button class="btn sm" data-a="prodFicha" data-cod="${esc(o.cod)}">Ficha</button>${o.nEx||o.nPl?`<div class="muted" style="font-size:11px;white-space:nowrap" title="Excepciones guardadas en la ficha: valores distintos al base para algún proveedor o planta">${[o.nEx?o.nEx+(o.nEx>1?' excep. proveedor':' excep. proveedor'):'',o.nPl?o.nPl+' excep. planta':''].filter(Boolean).join(' · ')}</div>`:''}</td></tr>`;}).join('')||`<tr><td colspan="9">${emptyState('Sin productos con estos filtros','')}</td></tr>`}
   </tbody></table></div>${rows.length>shown.length?`<p class="hint" style="padding:8px 14px">Se muestran 300 de ${rows.length} productos. Usa los filtros o el buscador de código o producto.</p>`:''}</div>`;
}
function dProd(){
  const o=prodRows().find(x=>norm(x.cod)===norm(D.cod))||{cod:D.cod,desc:'',lines:[],provs:new Set()};const p=prodOf(D.cod)||{};const isP=unitOf(D.cod)==='pallet';const dis=S.canWrite?'':'disabled';
  const provs=[...new Set([...(o.provs||[]),...Object.keys(p.uppProv||{})])].sort();
  const lineFor=pv=>(o.lines||[]).find(l=>l.prov===pv)||{cod:D.cod,prov:pv};
  return {title:'Ficha de producto',sub:`${esc(D.cod)} · ${esc(o.desc||'')}`,
   body:`<div class="kv"><span>Unidad de almacenamiento <b>${esc(unitLabel(D.cod))}</b></span>${isP?`<span>Unidades por pallet base <b>${p.upp?fmt(p.upp):(o.uppEf?fmt(o.uppEf)+' (mantenedor)':'sin dato')}</b></span>`:''}<span>Compras temporada <b>${fmt(o.qty||0)}</b></span></div>
   ${isP?`<div><h3 style="margin-bottom:6px">Unidades por pallet por proveedor</h3><p class="hint">Déjalo vacío si el proveedor arma igual que el valor base. Solo completa las excepciones.</p>
    <div class="tw"><table><thead><tr><th>Proveedor</th><th class="num">Excepción</th><th class="num">Se usa</th></tr></thead><tbody>
    ${provs.map((pv,i)=>`<tr><td class="wrap">${esc(pv)}</td><td class="num"><input class="posin" type="number" min="0" id="pfp-${i}" data-pfp="${esc(pv)}" value="${(p.uppProv||{})[pv]||''}" placeholder="${p.upp?fmt(p.upp):''}" style="width:90px" ${dis}></td><td class="num">${fmt(uppOf(lineFor(pv)))||'–'}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Sin proveedores en las órdenes cargadas.</td></tr>'}
    </tbody></table></div></div>`:''}
   <div><h3 style="margin-bottom:6px">${isP?'Pallets por posición por planta':'Unidades por posición por planta'}</h3><p class="hint">Vacío = usa el valor general del producto${isP?' o, si no hay, el apilamiento por defecto de la planta':''}.</p>
    <div class="tw"><table><thead><tr><th>Planta</th><th class="num">${isP?'Pallets por posición':esc(unitLabel(D.cod))+'s por posición'}</th>${isP?'<th class="num">Unidades por posición</th>':''}</tr></thead><tbody>
    ${S.cfg.plants.map((pc,i)=>{const v=isP?(p.ppos||{})[pc.name]:(p.upos||{})[pc.name];const ph=isP?(p.pposDef||1):(p.uposDef||'');const upp=uppOf((o.lines||[])[0]||{cod:D.cod,prov:''});
      return `<tr><td>${esc(pc.name)}</td><td class="num"><input class="posin" type="number" min="0" step="0.5" id="pfl-${i}" data-pfl="${esc(pc.name)}" value="${v||''}" placeholder="${ph}" style="width:80px" ${dis}></td>${isP?`<td class="num">${upp?fmt(upp*pposOf(D.cod,pc.name)):'–'}</td>`:''}</tr>`;}).join('')}
    </tbody></table></div></div>
   <div class="fgrid"><div class="field"><label for="pf-fval">Fecha de validación</label><input id="pf-fval" type="text" data-pf="fval" data-cod="${esc(D.cod)}" value="${esc(p.fval||'')}" placeholder="AAAA-MM-DD" ${dis}></div></div>
   <div class="field"><label for="pf-note">Comentario</label><input id="pf-note" type="text" data-pf="note" data-cod="${esc(D.cod)}" value="${esc(p.note||'')}" placeholder="Quién validó en bodega, observaciones…" ${dis}></div>`,
   foot:`<button class="btn" data-a="${D.backTo?"back":"close"}">${D.backTo?"Volver":"Cerrar"}</button>`};
}
function prodExport(){
  const pls=S.cfg.plants.map(p=>p.name);const rows=prodRows().map(o=>{const p=o.p||{};const r={'Código':o.cod,'Descripción':o.desc,'Categoría':p.cat||'','Especie':p.esp||'','Formato':p.fmt||'','Unidad de almacenamiento':UNITS.find(x=>x[0]===o.unit)[1],'Nombre unidad (si es Otro)':p.unitName||'','Unidades por pallet':p.upp||'','Pallets por posición (general)':p.pposDef||'','Unidades por posición (general)':p.uposDef||''};
    for(const pl of pls){r['Pallets por posición '+pl]=(p.ppos||{})[pl]||'';r['Unidades por posición '+pl]=(p.upos||{})[pl]||'';}
    Object.assign(r,{'Fecha validación':p.fval||'','Comentario':p.note||'','Estado':o.inc?'Incompleta':'Completa','Valor vigente unidades por pallet (referencia)':o.uppEf||''});return r;});
  const ex=[];for(const o of prodRows()){const p=o.p||{};for(const pv of o.provs)ex.push({'Código':o.cod,'Proveedor':pv,'Unidades por pallet':(p.uppProv||{})[pv]||''});}
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Maestro');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ex),'Excepciones proveedor');saveFile('Maestro_productos.xlsx',wb);
}
async function prodImport(file){
  if(!window.XLSX){toast('No se pudo cargar el lector de Excel.');return;}
  const bk=await readBook(file);const nm=bk.names.find(n=>norm(n).includes('MAESTRO'))||bk.names[0];const rows=parseSheet(bk.buf,nm);
  const H=(rows[0]||[]).map(h=>norm(h));const col=n=>H.indexOf(norm(n));const pls=S.cfg.plants.map(p=>p.name);
  const num=v=>{const n=toNum(v);return n>0?n:'';};let n=0;const touched=new Set();
  const ic=col('Código');if(ic<0){toast('El archivo no tiene la columna "Código". Usa el Excel descargado desde este módulo.');return;}
  for(const r of rows.slice(1)){if(!r||r[ic]==null||String(r[ic]).trim()==='')continue;const cod=String(r[ic]).trim();const p=ensureProd(cod);touched.add(cod);
    const g=n2=>{const i=col(n2);return i>=0?r[i]:undefined;};const setS=(k,n2)=>{const v=g(n2);if(v!==undefined)p[k]=v==null?'':String(v).trim();};
    setS('cat','Categoría');setS('esp','Especie');setS('fmt','Formato');setS('unitName','Nombre unidad (si es Otro)');setS('note','Comentario');
    const fv=g('Fecha validación');if(fv!==undefined){const d=toDate(fv);p.fval=d?d.toISOString().slice(0,10):(fv?String(fv):'');}
    const u=g('Unidad de almacenamiento');if(u!==undefined&&u!=null){const un=norm(u);p.unit=un.startsWith('PALL')?'pallet':un.startsWith('UNI')?'unidad':un?'otro':'pallet';}
    for(const [k,n2] of [['upp','Unidades por pallet'],['pposDef','Pallets por posición (general)'],['uposDef','Unidades por posición (general)']]){const v=g(n2);if(v!==undefined)p[k]=num(v);}
    p.ppos=p.ppos||{};p.upos=p.upos||{};for(const pl of pls){const a=g('Pallets por posición '+pl),b=g('Unidades por posición '+pl);if(a!==undefined)p.ppos[pl]=num(a);if(b!==undefined)p.upos[pl]=num(b);}
    n++;}
  const en=bk.names.find(x=>norm(x).includes('EXCEPCION'));
  if(en){const er=parseSheet(bk.buf,en);const EH=(er[0]||[]).map(h=>norm(h));const a=EH.indexOf(norm('Código')),b=EH.indexOf(norm('Proveedor')),c=EH.indexOf(norm('Unidades por pallet'));
    if(a>=0&&b>=0&&c>=0)for(const r of er.slice(1)){if(!r||!r[a]||!r[b])continue;const p=ensureProd(String(r[a]).trim());touched.add(String(r[a]).trim());p.uppProv=p.uppProv||{};const v=num(r[c]);if(v)p.uppProv[String(r[b]).trim()]=v;else delete p.uppProv[String(r[b]).trim()];}}
  for(const cod of touched){const p=S.prod[segSafe(cod)];if(!p)continue;p.updatedAt=nowISO();await Store.write('prod/'+segSafe(p.cod),p);}
  rebuild();render();toast(n+' productos actualizados desde el Excel.');
}

/* =========================================================
   Eventos
   ========================================================= */
document.addEventListener('mousemove',ev=>{const r=ev.target.closest&&ev.target.closest('[data-bw]');if(r){bodTip(+r.dataset.bw,+r.dataset.bx);}else{const tip=document.getElementById('btip');if(tip&&!tip.hidden&&!ev.target.closest('#bchart')){tip.hidden=true;const l=document.getElementById('bc-x');if(l)l.setAttribute('opacity','0');}}});
document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-a]');if(!t)return;const a=t.dataset.a;const k=t.dataset.k;
  try{
  switch(a){
    case 'go':if(t.dataset.tab==='rnp'||t.dataset.tab==='cierre'||['rnp','express','excepciones'].includes(t.dataset.v)){S.view='hoy';lsSet('otif.view',S.view);render();openDrawer({type:'sug',kind:t.dataset.tab==='cierre'?'saldo':'np'});break;}
      S.view=t.dataset.v;S.agFocus=null;lsSet('otif.view',S.view);if(S.view==='posiciones'||(S.view==='agenda'&&t.dataset.tab==='cons')){S.view='bodegas';}else if(t.dataset.tab){if(S.view==='agenda')S.agMode=t.dataset.tab;else if(S.view==='seguimiento')S.tab.seg=t.dataset.tab;else if(S.view==='maestro')S.tab.mf={...(S.tab.mf||{}),inc:t.dataset.tab==='inc'};else S.tab.exc=t.dataset.tab;}closeDrawer();S.tab.npFocus=(k&&S.view==='seguimiento'&&S.tab.seg==='rnp')?k:null;window.scrollTo(0,0);render();break;
    case 'clearf':S.filt={cat:'',prov:'',oc:'',q:'',pl:'',esp:'',wk:''};lsSet('otif.filt',S.filt);render();break;
    case 'fprov':S.filt.prov=t.dataset.p;lsSet('otif.filt',S.filt);S.view='seguimiento';render();break;
    case 'tab':S.tab[t.dataset.t]=k;render();break;
    case 'agmode':S.agMode=k;render();break;
    case 'wshift':{const n=+t.dataset.n;S.wFrom=wAdd(S.wFrom,n);S.wTo=wAdd(S.wTo,n);render();break;}
    case 'wtoday':S.wFrom=wAdd(CUR,-6);S.wTo=wAdd(CUR,8);render();break;
    case 'openLine':S.view='agenda';S.agFocus=k;S._plSL=null;closeDrawer();window.scrollTo(0,0);render();break;
    case 'pcell':openDrawer({type:'cell',k,pl:t.dataset.pl,w:+t.dataset.w,qty:'',pick:true});break;
    case 'agendar':{const l=S.ix.byK[k];const p=planOf(k);const def=plantOf(l.alm);const pl=S.ix.plants.has(def)?def:(S.cfg.plants[0]?.name||'');const lastW=activeCommits(p).reduce((m,c)=>Math.max(m,c.wk),0);openDrawer({type:'agendar',backTo:D&&D.type==='sug'?{...D,err:''}:null,k,rows:[{wk:Math.max(wAdd(CUR,1),lastW?wAdd(lastW,1):0),pl,qty:''}]});break;}
    case 'cell':openDrawer({type:'cell',k,pl:t.dataset.pl,w:+t.dataset.w,qty:''});break;
    case 'bodMode':S.bodMode=t.dataset.k;render();break;
    case 'consCell':openDrawer({type:'cons',pl:t.dataset.pl,w:+t.dataset.w});break;
    case 'posDet':openDrawer({type:'pos',pl:t.dataset.pl,w:+t.dataset.w});break;
    case 'close':closeDrawer();break;
    case 'back':if(D&&D.backTo){const b=D.backTo;openDrawer(b);}else closeDrawer();break;
    case 'reAdd':{const last=D.rows[D.rows.length-1];D.rows.push({wk:last?wAdd(+last.wk,1):wAdd(CUR,1),pl:last?last.pl:(S.cfg.plants[0]?.name||''),qty:''});drawRender();break;}
    case 'reDel':D.rows.splice(+t.dataset.i,1);if(!D.rows.length)D.rows.push({wk:wAdd(CUR,1),pl:S.cfg.plants[0]?.name||'',qty:''});drawRender();break;
    case 'reFill':{const avail=drawerAvail();const other=sum(D.rows.slice(0,-1),r=>+r.qty||0);D.rows[D.rows.length-1].qty=Math.max(0,avail-other);drawRender();break;}
    case 'cellAdd':D.err='';act(D.k,ctx=>addCommits(D.k,[{wk:D.w,pl:D.pl,qty:+D.qty}],{src:'plan',note:(planOf(D.k).confirmed||D.w<=CUR)?'Compromiso agregado después de confirmar el calendario':''},ctx));D.qty='';toast('Compromiso agregado.');drawRender();break;
    case 'doAgendar':D.err='';act(D.k,ctx=>addCommits(D.k,D.rows,{src:'plan'},ctx));meetLog(meetTxt('agendar'));D.backTo?openDrawer(D.backTo):closeDrawer();toast('Compromisos guardados.');break;
    case 'dModify':{const p=planOf(D.k);const c=p.commits.find(x=>x.id===t.dataset.cid);openDrawer({type:'modify',k:D.k,cid:c.id,newQty:c.plan,rows:[],resp:wDiff(CUR,c.wk)<2?'Proveedor':'',backTo:{...D,err:''}});break;}
    case 'doModify':D.err='';{const r=null;act(D.k,ctx=>changeCommit(D.k,D.cid,D.newQty,D.rows,D.resp,motText(),ctx));meetLog(meetTxt('modify'));toast('Cambio registrado en el historial.');const b=D.backTo;b?openDrawer(b):closeDrawer();}break;
    case 'dAnular':openDrawer({type:'anular',k:D.k,cid:t.dataset.cid,backTo:{...D,err:''}});break;
    case 'doAnular':D.err='';{const q=(planOf(D.k).commits.find(x=>x.id===D.cid)||{}).qty;act(D.k,ctx=>anularCommit(D.k,D.cid,ctx));toast('Compromiso anulado: '+fmt(q)+' vuelven a quedar pendientes.');const b=D.backTo;b?openDrawer(b):closeDrawer();}break;
    case 'dRecal':case 'exRecal':{const kk=k||D.k;const p=planOf(kk);const c=p.commits.find(x=>x.id===t.dataset.cid);const r=recAt(kk,c.pl,c.wk);openDrawer({type:'recal',k:kk,cid:c.id,rows:[{wk:Math.max(wAdd(CUR,1),wAdd(c.wk,1)),pl:c.pl,qty:Math.max(0,c.plan-r)}],backTo:D&&(a==='dRecal'||D.type==='exlist'||D.type==='sug')?{...D,err:''}:null});break;}
    case 'doRecal':D.err='';act(D.k,ctx=>recalFaltante(D.k,D.cid,D.rows,ctx));meetLog(meetTxt('recal'));toast('Faltante recalendarizado.');D.backTo?openDrawer(D.backTo):closeDrawer();break;
    case 'dAdel':case 'exAdel':{const kk=k||D.k;const p=planOf(kk);const c=p.commits.find(x=>x.id===t.dataset.cid);const exc=recAt(kk,c.pl,c.wk)-c.plan;const arows=[];let rest=exc;for(const f of activeCommits(p).filter(x=>x.wk>c.wk).sort((a,b)=>a.wk-b.wk)){const q=Math.min(rest,f.plan);if(q>0){arows.push({cid:f.id,qty:q});rest-=q;}if(rest<=0)break;}openDrawer({type:'adel',k:kk,cid:c.id,arows,backTo:D&&(a==='dAdel'||D.type==='exlist'||D.type==='sug')?{...D,err:''}:null});break;}
    case 'doAdel':D.err='';{const al={};for(const a of D.arows){if(+a.qty>0)al[a.cid]=(al[a.cid]||0)+(+a.qty);}act(D.k,ctx=>descontarAdelanto(D.k,D.cid,Object.entries(al).map(([cid,qty])=>({cid,qty})),ctx));meetLog(meetTxt('adel'));}toast('Adelanto descontado.');D.backTo?openDrawer(D.backTo):closeDrawer();break;
    case 'dSaldo':{const l=S.ix.byK[k];const p=planOf(k);openDrawer({type:'saldo',k,qty:Math.max(0,l.qty-(p.cancel||0)-recTot(k)),resp:'',mot:'Saldo no requerido por temporada',backTo:D&&D.type==='sug'?{...D,err:''}:null});break;}
    case 'doSaldo':D.err='';act(D.k,ctx=>saldoCancelado(D.k,D.qty,D.resp,motText(),ctx));meetLog(meetTxt('saldo'));D.backTo?openDrawer(D.backTo):closeDrawer();toast('Saldo cancelado registrado. No penaliza al proveedor.');break;
    case 'dResp':case 'hResp':{const kk=k||D.k;const p=planOf(kk);const c=p.commits.find(x=>x.id===t.dataset.cid);openDrawer({type:'resp',k:kk,cid:c.id,resp:c.resp,backTo:D&&a==='dResp'?{...D,err:''}:null});break;}
    case 'doResp':D.err='';act(D.k,ctx=>setResp(D.k,D.cid,D.resp,ctx));toast('Responsable actualizado; OTIF recalculado.');D.backTo?openDrawer(D.backTo):closeDrawer();break;
    case 'excReg':{const kk=t.dataset.k;const ac=t.dataset.m==='ac';S._mt=meetTxt('exceso',kk);act(kk,ctx=>sumarExceso(kk,ctx,ac?EXC_AC:undefined));meetLog(S._mt);toast(ac?'Exceso registrado como acuerdo comercial: no penaliza.':'Exceso registrado como no acordado: el compromiso se mide igual.');if(D&&D.type==='sug')drawRender();render();break;}
    case 'dExceso':openDrawer({type:'exceso',k:t.dataset.k,resp:'Proveedor',mot:'',com:'',backTo:D&&D.type==='sug'?{...D,err:''}:null});break;
    case 'doExceso':{const kk=D.k;if(!D.resp)throw new Error('Indica el responsable del exceso.');if(!respPen(D.resp)&&!D.mot)throw new Error('Indica el motivo del exceso acordado.');
      S._mt=meetTxt('exceso',kk);const pen=respPen(D.resp);act(kk,ctx=>sumarExceso(kk,ctx,{resp:D.resp,mot:motText()||(pen?'Exceso no acordado':'')}));meetLog(S._mt);toast(pen?'Exceso registrado: el compromiso se mide igual.':'Exceso acordado registrado: el compromiso sube y no penaliza.');D.backTo?openDrawer(D.backTo):closeDrawer();break;}
    case 'confirm':act(k,ctx=>confirmPlan(k,ctx));toast('Calendario confirmado. Desde ahora los cambios piden responsable y motivo.');break;
    case 'confirmAll':{const ls=fLines().filter(l=>{const p=planOf(l.k);return !p.confirmed&&activeCommits(p).length>0&&l.st==='Abierta';});for(const l of ls)act(l.k,ctx=>confirmPlan(l.k,ctx));toast(ls.length+' calendarios confirmados.');break;}
    case 'exOpen':S.tab.expressK=k;render();break;
    case 'doExpress':{const sel=S.tab['exsel_'+k]||{};const man=S.tab['exman_'+k]??1;const g=new Map();for(const r of S.ix.recLine.get(k)||[]){const key=r.pl+'|'+r.wk;if(!sel[key])continue;const o=g.get(key)||{wk:r.wk,pl:r.pl,qty:0};o.qty+=+r.qty;g.set(key,o);}
      act(k,ctx=>expressCopy(k,[...g.values()],man,ctx));delete S.tab['exsel_'+k];toast('Recepciones copiadas a la agenda.');break;}
    case 'lineHist':openDrawer({type:'hist',k});break;
    case 'tpl':exportTpl(t.dataset.kind);break;
    case 'exportSeg':exportSeg();break;
    case 'exportMod':exportMod();break;
    case 'modF':{const f=t.dataset.f,v=t.dataset.v;if(f==='clear'){S.tab.modResp=null;S.tab.modProv=null;}else if(f==='resp'){S.tab.modResp=S.tab.modResp===v?null:v;S.tab.modProv=null;}else{S.tab.modProv=S.tab.modProv===v?null:v;S.tab.modResp=null;}render();break;}
    case 'exportHist':exportHist();break;
    case 'respAdd':S.cfg.resp.push({name:'Nuevo responsable',pen:false});Store.saveCfg();render();break;
    case 'respDel':S.cfg.resp.splice(+t.dataset.i,1);Store.saveCfg();render();break;
    case 'plantAdd':S.cfg.plants.push({name:'Nueva planta',alm:[],cap:0,init:0,stack:1,out:0});Store.saveCfg();rebuild();render();break;
    case 'plantDel':S.cfg.plants.splice(+t.dataset.i,1);Store.saveCfg();rebuild();render();break;
    case 'clearAsk':openDrawer({type:'confirmClear',example:!!t.dataset.ex});break;
    case 'localok':lsSet('otif.localok',1);render();break;
    case 'spReconnect':{const c=spCfg();c.modo=$('#sp-modo')?$('#sp-modo').value:c.modo;c.site=$('#sp-site')?$('#sp-site').value.trim().replace(/\/+$/,''):c.site;lsSet('otif.sp',c);toast('Conectando…');if(c.modo==='sp')await Store.reconectar();else{S.mode='local';S.loadNote='';S.spError=false;S.canWrite=true;Store.loadLocal();render();}break;}
    case 'spOpen':{const site=spCfg().site||'https://cylfruit.sharepoint.com';if(typeof chrome!=='undefined'&&chrome.tabs)chrome.tabs.create({url:site,active:true});else window.open(site,'_blank');break;}
    case 'doCal':await doCalImport();break;
    case 'spLogout':if(!IS_EXT){await GraphSP.salir();}break;
    case 'spRefresh':toast('Actualizando…');await Store.refresh();render();toast('Datos actualizados.');break;
    case 'bkExport':bkExport();break;
    case 'doClear':t.disabled=true;{const ex=!!D.example;await Store.clearAll(ex);if(ex){S.cfg.plants=defaultCfg().plants;Store.saveCfg();rebuild();}}closeDrawer();toast(D&&D.example?'Datos de ejemplo eliminados.':'Datos eliminados.');render();break;
    case 'doImport':await doImport();break;
    case 'prodFicha':openDrawer({type:'prod',cod:t.dataset.cod,backTo:D&&D.type==='sug'?{...D,err:''}:null});break;
    case 'prodExport':prodExport();break;
    case 'mStep':S.tab.mstep=t.dataset.s;window.scrollTo(0,0);render();break;
    case 'mClose':{const m=ensureMeet(S.rProv);m.status='cerrada';m.closedAt=nowISO();m.closedBy=S.me.id||'local';saveMeet(m);toast('Reunión cerrada. El acta quedó guardada.');render();break;}
    case 'mReopen':{const m=ensureMeet(S.rProv);m.status='borrador';saveMeet(m);render();break;}
    case 'mModify':{const p=planOf(k);const c=p.commits.find(x=>x.id===t.dataset.cid);openDrawer({type:'modify',k,cid:c.id,newQty:c.plan,rows:[],resp:'Proveedor'});break;}
    case 'acAdd':{const m=ensureMeet(S.rProv);m.acuerdos.push({id:uid(),txt:'',resp:'Proveedor',fecha:'',estado:'pendiente'});saveMeet(m);render();break;}
    case 'acDel':{const m=ensureMeet(S.rProv);m.acuerdos.splice(+t.dataset.i,1);saveMeet(m);render();break;}
    case 'mMail':openDrawer({type:'mail',which:t.dataset.w||'prov'});break;
    case 'mHist':{const ms=Object.values(S.meets||{}).filter(x=>x.prov===S.rProv&&x.status==='cerrada').sort((a,b)=>b.wk-a.wk);const st=a=>a.filter(x=>x.estado==='cumplido').length;
      openDrawerRaw('Reuniones anteriores',esc(S.rProv),`<div class="tw"><table><thead><tr><th>Semana</th><th>Cerrada</th><th>Participantes</th><th class="num">Acuerdos</th><th class="num">Cumplidos</th></tr></thead><tbody>${ms.map(x=>`<tr><td>${wLabel(x.wk)}</td><td>${fdt(x.closedAt)}</td><td class="wrap">${esc([x.gf,x.pv].filter(Boolean).join(' / '))}</td><td class="num">${x.acuerdos.length}</td><td class="num">${st(x.acuerdos)} de ${x.acuerdos.length}</td></tr><tr><td colspan="5" class="muted" style="font-size:12px">${x.acuerdos.map(a=>'• '+esc(a.txt)).join('<br>')||'Sin acuerdos'}</td></tr>`).join('')}</tbody></table></div>`);break;}
    case 'adAdd':{const p=planOf(D.k);const c=p.commits.find(x=>x.id===D.cid);const futs=activeCommits(p).filter(x=>x.wk>c.wk).sort((a,b)=>a.wk-b.wk);const used=new Set(D.arows.map(a=>a.cid));const f=futs.find(x=>!used.has(x.id))||futs[0];const exc=recAt(D.k,c.pl,c.wk)-c.plan;D.arows.push({cid:f.id,qty:Math.max(0,exc-sum(D.arows,a=>+a.qty||0))||''});drawRender();break;}
    case 'adDel':D.arows.splice(+t.dataset.i,1);if(!D.arows.length){const p=planOf(D.k);const c=p.commits.find(x=>x.id===D.cid);const f=activeCommits(p).filter(x=>x.wk>c.wk).sort((a,b)=>a.wk-b.wk)[0];if(f)D.arows.push({cid:f.id,qty:''});}drawRender();break;
    case 'exList':openDrawer({type:'exlist',kind:t.dataset.kind});break;
    case 'openMeet':closeDrawer();S.rProv=t.dataset.p;S.tab.mstep=null;S.view='informe';lsSet('otif.view',S.view);window.scrollTo(0,0);render();break;
    case 'pdfProv':await downloadPdf(t.dataset.p);break;
    case 'mailProv':S.rProv=t.dataset.p;openDrawer({type:'mail',which:'prov'});break;
    case 'mailGen':if(!S.rProv){const pl=provList();S.rProv=pl[0]&&pl[0].prov;}openDrawer({type:'mail',which:'gen'});break;
    case 'scrollSug':{S.view='hoy';render();const el=document.getElementById('gestiones');if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.style.outline='2px solid var(--accent)';setTimeout(()=>el.style.outline='',1600);}break;}
    case 'bulkOpen':openDrawer({type:'bulk',res:null,conf:false});break;
    case 'agCol':S.agCol=S.agCol||{};S.agCol[t.dataset.g]=!S.agCol[t.dataset.g];lsSet('otif.agCol',S.agCol);render();break;
    case 'agColAll':{const v=t.dataset.v==='1';S.agCol={};if(v)for(const l of fLines())S.agCol[l.prov]=true;lsSet('otif.agCol',S.agCol);render();break;}
    case 'bulkTpl':bulkTemplate();break;
    case 'bulkSave':{D.err='';const r=bulkSave();closeDrawer();toast(`${r.n} compromiso(s) agendados en ${r.lines} línea(s)${r.conf?` · ${r.conf} calendario(s) confirmados`:''}.${r.errs.length?' '+r.errs.length+' línea(s) con error: '+r.errs[0]:''}`);render();break;}
    case 'adelOpt':S.tab.ao=S.tab.ao||{};S.tab.ao[t.dataset.id]=t.dataset.v;drawRender();break;
    case 'faltOpt':S.tab.fo=S.tab.fo||{};S.tab.fo[t.dataset.id]=t.dataset.v;drawRender();break;
    case 'sugList':openDrawer({type:'sug',kind:t.dataset.kind});break;
    case 'sugOne':case 'sugAll':{if(!S.canWrite){toast('Solo lectura: no tienes permiso para modificar.');break;}const kind=t.dataset.kind;const r=sugAcceptAll(kind,a==='sugOne'?[t.dataset.id]:null);
      toast(r.ok?`${r.ok} sugerencia(s) aplicada(s).${r.errs.length?' '+r.errs.length+' no se pudieron aplicar: revísalas con Modificar.':''}`:(r.errs[0]||'No había sugerencias por aplicar.'));if(D&&D.type==='sug')drawRender();render();break;}
    case 'npMide':{const st=npState(t.dataset.key);st.mide=t.dataset.v==='1';if(D&&D.type==='sug')drawRender();render();break;}
    case 'npBulkMide':{for(const key of npKeys()){const st=npState(key);if(st.sel)st.mide=t.dataset.v==='1';}render();break;}
    case 'npReg':{if(!S.canWrite){toast('Solo lectura: no tienes permiso para modificar.');break;}const it=npItemFromKey(t.dataset.key);const n=registerNP([it]);delete S.tab.np[t.dataset.key];toast(n+' recepción registrada como no planificada.');render();break;}
    case 'npRegSel':{if(!S.canWrite){toast('Solo lectura: no tienes permiso para modificar.');break;}const keys=npKeys().filter(k2=>npState(k2).sel);const n=registerNP(keys.map(npItemFromKey));keys.forEach(k2=>delete S.tab.np[k2]);toast(n+' recepciones registradas como no planificadas.');render();break;}
    case 'npMideC':{const c=planOf(k).commits.find(x=>x.id===t.dataset.cid);const v=t.dataset.v==='1'?(c.manual===0?0:1):'nm';act(k,ctx=>setNP(k,t.dataset.cid,{manual:v},ctx));toast('Medición OTIF actualizada.');break;}
    case 'mcatAll':{const v=t.dataset.v;for(const c of Object.keys(D.M.opt.cats))D.M.opt.cats[c]=v==='pack'?PACK_RX.test(norm(c)):v==='1';drawRender();break;}
    case 'pdfOne':await downloadPdf(S.rProv);break;
    case 'pdfAll':await downloadPdf('all');break;
    case 'xlsOne':exportRepXlsx(S.rProv);break;
    case 'exportAv':exportAv();break;
    case 'copyMail':{const txt=$('#m-subj').value+'\n\n'+$('#m-body').value;try{await navigator.clipboard.writeText(txt);toast('Correo copiado. Pégalo en un correo nuevo.');}catch(e){const ta=$('#m-body');ta.focus();ta.select();toast('Selecciona el texto y cópialo con Ctrl+C.');}break;}
    case 'famAdd':S.cfg.fams=S.cfg.fams||{};S.cfg.fams['']='';Store.saveCfg();render();break;
    case 'famDel':{S.cfg.fams=S.cfg.fams||{};delete S.cfg.fams[t.dataset.f];Store.saveCfg();render();break;}
    case 'metaAdd':S.cfg.metas=S.cfg.metas||[];S.cfg.metas.push({cat:'CAJAS DE CARTON',fmt:'',m:{}});Store.saveCfg();render();break;
    case 'metaDel':S.cfg.metas.splice(+t.dataset.i,1);Store.saveCfg();render();break;
  }}catch(e){if(D){D.err=e.message||String(e);drawRender();}else toast(e.message||String(e));}
});
function drawerAvail(){
  if(!D)return 0;const l=S.ix.byK[D.k];const p=planOf(D.k);
  if(D.type==='agendar')return pendingOf(l,p);
  if(D.type==='recal'){const c=p.commits.find(x=>x.id===D.cid);return Math.max(0,c.plan-recAt(D.k,c.pl,c.wk));}
  if(D.type==='modify'){const c=p.commits.find(x=>x.id===D.cid);return Math.max(0,c.plan+pendingOf(l,p)-(+D.newQty||0));}
  return 0;
}
function openDrawerRaw(title,sub,body){D={type:'raw'};$('#layer').innerHTML=`<div class="scrim" data-a="close"></div><div class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title"><div class="drawer-h"><h2 id="dr-title">${title}<span class="sub">${sub}</span></h2><button class="xbtn" data-a="close" aria-label="Cerrar">✕</button></div><div class="drawer-b">${body}</div></div>`;}
let cfgT=null;const cfgSave=()=>{clearTimeout(cfgT);cfgT=setTimeout(()=>{Store.saveCfg();rebuild();render();},500);};
let posT=null;let noteT=null;
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.dataset.f!=null&&t.tagName==='INPUT'){S.filt[t.dataset.f]=t.value;lsSet('otif.filt',S.filt);render();return;}
  if(D&&t.dataset.re!=null){D.rows[+t.dataset.i][t.dataset.re]=t.dataset.re==='pl'?t.value:+t.value||(t.dataset.re==='qty'?'':0);updRowsSum();if(D.type==='modify'&&t.dataset.re==='qty'){clearTimeout(posT);posT=setTimeout(drawRender,350);}return;}
  if(D&&t.dataset.d!=null){if(t.dataset.d==='newQty'&&D.type==='modify')D.nqAuto=false;D[t.dataset.d]=t.type==='number'?(t.value===''?'':+t.value):t.value;if(t.dataset.d==='qty'||t.dataset.d==='newQty'){if(D.type==='saldo'||D.type==='modify'){clearTimeout(posT);posT=setTimeout(drawRender,350);}else{const b=$('[data-a="cellAdd"]');if(b)b.textContent='Agregar '+(D.qty?fmt(D.qty):'');}}if(D.type==='exceso'&&(t.dataset.d==='resp'||t.dataset.d==='mot')){D.err='';drawRender();}if(D.type==='cell'&&t.dataset.d==='pl'){D.err='';drawRender();}return;}
  if(D&&t.dataset.adq!=null){D.arows[+t.dataset.adq].qty=t.value===''?'':+t.value;const el=$('#ad-sum');if(el){const c=planOf(D.k).commits.find(x=>x.id===D.cid);const exc=recAt(D.k,c.pl,c.wk)-c.plan;const tot=sum(D.arows,a=>+a.qty||0);el.className='sumline'+(tot>exc?' err':'');el.innerHTML=`<span>Total a descontar <b>${fmt(tot)}</b></span><span>Adelanto <b>${fmt(exc)}</b></span>`;}return;}
  if(t.dataset.pos!=null){S.pos.out=S.pos.out||{};S.pos.out[t.dataset.pos]=S.pos.out[t.dataset.pos]||{};if(t.value==='')delete S.pos.out[t.dataset.pos][t.dataset.w];else S.pos.out[t.dataset.pos][t.dataset.w]=+t.value;clearTimeout(posT);posT=setTimeout(()=>{Store.savePos();render();if(D&&D.type==='pos')drawRender();},600);return;}
  if(t.dataset.plant!=null){const p=S.cfg.plants[+t.dataset.i];const f=t.dataset.plant;p[f]=f==='name'?t.value:f==='alm'?t.value.split(',').map(x=>x.trim()).filter(Boolean):+t.value||0;cfgSave();return;}
  if(t.dataset.resp!=null&&t.dataset.resp==='name'){S.cfg.resp[+t.dataset.i].name=t.value;cfgSave();return;}
  if(t.dataset.mt&&t.tagName!=='SELECT'){const m=ensureMeet(S.rProv);const f=t.dataset.mt==='causa'?'causes':t.dataset.mt;if(t.dataset.cid)m[f][t.dataset.cid]=t.value;else m[f]=t.value;clearTimeout(noteT);noteT=setTimeout(()=>saveMeet(m),700);return;}
  if(t.dataset.ac==='txt'||t.dataset.ac==='fecha'){const m=ensureMeet(S.rProv);m.acuerdos[+t.dataset.i][t.dataset.ac]=t.value;clearTimeout(noteT);noteT=setTimeout(()=>saveMeet(m),700);return;}
  if(t.dataset.pf&&t.dataset.pf!=='unit'){if(!S.canWrite)return;const p=ensureProd(t.dataset.cod);const f=t.dataset.pf;p[f]=['upp','pposDef','uposDef'].includes(f)?(t.value===''?'':Math.max(0,+t.value||0)):t.value;saveProd(p);clearTimeout(posT);posT=setTimeout(()=>{render();if(D&&D.type==='sug')drawRender();},900);return;}
  if(D&&D.type==='prod'&&(t.dataset.pfp!=null||t.dataset.pfl!=null)){if(!S.canWrite)return;const p=ensureProd(D.cod);const v=t.value===''?'':Math.max(0,+t.value||0);
    if(t.dataset.pfp!=null){p.uppProv=p.uppProv||{};if(v)p.uppProv[t.dataset.pfp]=v;else delete p.uppProv[t.dataset.pfp];}
    else{const key=unitOf(D.cod)==='pallet'?'ppos':'upos';p[key]=p[key]||{};if(v)p[key][t.dataset.pfl]=v;else delete p[key][t.dataset.pfl];}
    saveProd(p);clearTimeout(posT);posT=setTimeout(()=>{drawRender();render();},900);return;}
  if(t.dataset.fam){const ents=Object.entries(S.cfg.fams||{});const i=+t.dataset.i;if(!ents[i])return;if(t.dataset.fam==='f')ents[i][0]=t.value.trim();else ents[i][1]=t.value.trim();S.cfg.fams=Object.fromEntries(ents);clearTimeout(cfgT);cfgT=setTimeout(()=>{Store.saveCfg();},800);return;}
  if(t.dataset.cfg==='email'){S.cfg.email=t.value.trim();clearTimeout(cfgT);cfgT=setTimeout(()=>{Store.saveCfg();},800);return;}
  if(t.dataset.note!=null){const k=t.dataset.note;clearTimeout(noteT);noteT=setTimeout(()=>{if(!S.canWrite)return;ensurePlan(k).note=t.value;Store.savePlan(k);},800);return;}
  if(t.dataset.meta!=null){const m=S.cfg.metas[+t.dataset.meta];const f=t.dataset.mf;if(f==='cat'||f==='fmt')m[f]=t.value;else{m.m=m.m||{};if(t.value==='')delete m.m[f];else m.m[f]=Math.max(0,+t.value||0)/100;}cfgSave();return;}
  if(t.dataset.cfg==='motivos'){S.cfg.motivos=t.value.split('\n').map(x=>x.trim()).filter(Boolean);cfgSave();return;}
  if(t.dataset.cfg==='otifMeta'||t.dataset.cfg==='otifAlerta'){const v=+t.value;if(v>0&&v<=100){S.cfg[t.dataset.cfg]=v/100;cfgSave();}return;}
  if(t.dataset.cfg==='tolUnder'||t.dataset.cfg==='tolOver'){S.cfg[t.dataset.cfg]=Math.max(0,+t.value||0)/100;cfgSave();return;}
});
function updRowsSum(){
  const avail=drawerAvail();const tot=sum(D.rows,r=>+r.qty||0);const el=$('#re-sum');
  if(el){const over=tot>avail;el.className='sumline'+(over?' err':'');el.innerHTML=`<span>Total: <b>${fmt(tot)}</b></span><span>Disponible: <b>${fmt(avail)}</b>${over?' · supera lo disponible':''}</span>`;}
}
document.addEventListener('change',async ev=>{
  const t=ev.target;
  if(t.dataset.f!=null&&t.tagName==='SELECT'){S.filt[t.dataset.f]=t.value;if(t.dataset.f==='cat')S.filt.prov='';if(t.dataset.f==='wk'&&t.value){const w=+t.value;S.wFrom=wAdd(w,-3);S.wTo=wAdd(w,4);}lsSet('otif.filt',S.filt);render();return;}
  if(t.dataset.wsel){const v=+t.value;if(t.dataset.wsel==='from'){S.wFrom=v;if(S.wTo<v)S.wTo=wAdd(v,8);}else{S.wTo=v;if(S.wFrom>v)S.wFrom=wAdd(v,-8);}render();return;}
  if(t.dataset.a2==='agline'){S.agLine=t.value;render();return;}
  if(D&&t.dataset.re!=null){D.rows[+t.dataset.i][t.dataset.re]=t.dataset.re==='pl'?t.value:+t.value;updRowsSum();return;}
  if(D&&t.dataset.adw!=null){D.arows[+t.dataset.adw].cid=t.value;return;}
  if(D&&t.dataset.d!=null&&t.tagName==='SELECT'){D[t.dataset.d]=t.value;drawRender();return;}
  if(t.dataset.exsel){const s=S.tab['exsel_'+t.dataset.exsel]=S.tab['exsel_'+t.dataset.exsel]||{};s[t.dataset.key]=t.checked;render();return;}
  if(t.dataset.exman){S.tab['exman_'+t.dataset.exman]=t.value==='nm'?'nm':+t.value;return;}
  if(t.dataset.resp==='pen'){S.cfg.resp[+t.dataset.i].pen=t.checked;cfgSave();return;}
  if(t.dataset.cfg==='wFrom'||t.dataset.cfg==='wTo'){S.cfg[t.dataset.cfg]=+t.value;S.cfg.year=Math.floor(S.cfg.wFrom/100);cfgSave();return;}
  if(t.dataset.file){await onFile(t);return;}
  if(D&&D.type==='map'){
    if(t.dataset.m==='si'){toast('Leyendo hoja…');await sleep(40);D.M.si=+t.value;try{D.M.rows=parseSheet(D.M.buf,D.M.names[D.M.si]);D.M.soft=false;if(D.kind==='oc'&&isSoftlandOC(D.M.rows)){D.M.rows=flattenSoftlandOC(D.M.rows);D.M.soft=true;}if(D.kind==='rec'&&isSoftlandCompras(D.M.rows)){D.M.rows=flattenSoftlandCompras(D.M.rows);D.M.soft=true;}}catch(e){toast('No se pudo leer la hoja: '+(e.message||e));return;}D.M.hdr=D.M.soft?0:detectHeader(D.M.rows,D.kind);mapReload();drawRender();return;}
    if(t.dataset.m==='hdr'){D.M.hdr=+t.value;mapReload();drawRender();return;}
    if(t.dataset.mc){D.M.map[t.dataset.mc]=t.value===''?null:+t.value;if(t.dataset.mc==='cat')D.M.opt=defaultOpt(D.kind,D.M);drawRender();return;}
    if(t.dataset.mcat!=null){D.M.opt.cats[t.dataset.mcat]=t.checked;drawRender();return;}
    if(t.dataset.mopt==='onlyKnown'){D.M.opt.onlyKnown=t.checked;drawRender();return;}
    if(t.dataset.mopt==='desde'){D.M.opt.desde=t.value.trim();drawRender();return;}
    if(t.dataset.um!=null){D.um[t.dataset.um]=t.value;return;}
  }
  if(t.dataset.npsel!=null){npState(t.dataset.npsel).sel=t.checked;render();return;}
  if(t.dataset.npall!=null){for(const key of npKeys())npState(key).sel=t.checked;render();return;}
  if(t.dataset.npmot!=null){npState(t.dataset.npmot).mot=t.value;return;}
  if(t.dataset.npres!=null&&t.dataset.key){npState(t.dataset.key).res=+t.value;return;}
  if(t.dataset.npbulk==='mot'){for(const key of npKeys()){const st=npState(key);if(st.sel)st.mot=t.value;}render();return;}
  if(t.dataset.npmotc!=null){const [k,cid]=t.dataset.npmotc.split('|');try{act(k,ctx=>setNP(k,cid,{mnp:t.value},ctx));toast('Motivo actualizado.');}catch(e){toast(e.message);}return;}
  if(t.dataset.npresc!=null&&t.dataset.cid){const k=t.dataset.k,cid=t.dataset.cid;try{act(k,ctx=>setNP(k,cid,{manual:+t.value},ctx));toast('Resultado OTIF actualizado.');}catch(e){toast(e.message);}return;}
  if(t.dataset.acp!=null){const pm=prevMeet(S.rProv);if(pm){pm.acuerdos[+t.dataset.acp].estado=t.value;saveMeet(pm);render();}return;}
  if(t.dataset.mt&&t.tagName==='SELECT'){const m=ensureMeet(S.rProv);m[t.dataset.mt][t.dataset.cid]=t.value;saveMeet(m);render();return;}
  if(t.dataset.ac==='resp'){const m=ensureMeet(S.rProv);m.acuerdos[+t.dataset.i].resp=t.value;saveMeet(m);return;}
  if(t.dataset.mf){S.tab.mf={...(S.tab.mf||{}),[t.dataset.mf]:t.type==='checkbox'?t.checked:t.value};render();return;}
  if(t.dataset.agall){S.agAll=t.checked;render();return;}
  if(t.dataset.agpend){S.agPend=t.checked;render();return;}
  if(t.dataset.bulkfile){const f=t.files&&t.files[0];t.value='';if(f){try{await bulkRead(f);}catch(e){D.err=e.message||String(e);drawRender();}}return;}
  if(t.dataset.bulkconf){D.conf=t.checked;drawRender();return;}
  if(t.dataset.calpl){D.pl=t.value;return;}
  if(t.dataset.calrep){D.rep=t.checked;return;}
  if(t.dataset.bkfile){const f=t.files&&t.files[0];t.value='';if(f){try{await bkImport(f);}catch(e){toast('No se pudo restaurar: '+(e.message||e));}}return;}
  if(t.dataset.prodfile){const f=t.files&&t.files[0];t.value='';if(f){toast('Leyendo '+f.name+'…');try{await prodImport(f);}catch(e){toast('No se pudo leer el archivo: '+(e.message||e));}}return;}
  if(t.dataset.pf==='unit'){if(!S.canWrite)return;const p=ensureProd(t.dataset.cod);p.unit=t.value;saveProd(p,true);render();if(D&&D.type==='sug')drawRender();return;}
  if(t.dataset.rsec){S.tab.secOpen=true;S.cfg.rsec={...(S.cfg.rsec||{}),[t.dataset.rsec]:t.checked};Store.saveCfg();render();return;}
  if(t.dataset.a2==='rprov'){S.rProv=t.value;render();return;}
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&D)closeDrawer();});


/* =========================================================
   Respaldo / restauración (mientras la carga sea manual)
   ========================================================= */
function bkExport(){
  const st={v:1,app:'entregas-cyl',at:nowISO(),cfg:S.cfg,meta:S.meta,oc:S.oc,rec:S.rec,pal:S.pal,mae:S.mae,plans:S.plans,meets:S.meets,prod:S.prod,pos:S.pos};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(st)],{type:'application/json'}));a.download='Respaldo_Entregas_CyL_'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();toast('Respaldo descargado.');
}
async function bkImport(file){
  const d=JSON.parse(await file.text());
  if(!d||d.app!=='entregas-cyl'||!d.cfg)throw new Error('El archivo no es un respaldo de esta herramienta.');
  if(!confirm('Restaurar reemplaza todos los datos actuales de este navegador por los del respaldo del '+fdt(d.at)+'. ¿Continuar?'))return;
  Object.assign(S,{cfg:{...defaultCfg(),...d.cfg},meta:d.meta||{},oc:d.oc||[],rec:d.rec||[],pal:d.pal||[],mae:d.mae||[],plans:d.plans||{},meets:d.meets||{},prod:d.prod||{},pos:d.pos||{out:{}}});
  if(S.mode==='db'){toast('Subiendo respaldo a SharePoint…');await Store.saveCfg();await Store.savePos();for(const k of Object.keys(S.plans))await Store.write('plan/'+segSafe(k),S.plans[k]);for(const [id,m] of Object.entries(S.meets))await Store.write('meet/'+id,m);for(const [id,p] of Object.entries(S.prod))await Store.write('prod/'+id,p);for(const kind of ['oc','rec','pal','mae'])if(S[kind].length)await Store.saveSource(kind,S[kind],S.meta[kind+'Info']||{at:nowISO(),file:'Respaldo',rows:S[kind].length});}else Store.saveLocal();
  rebuild();render();toast('Respaldo restaurado.');
}
if(!IS_EXT&&'serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>{navigator.serviceWorker.register('pwa-sw.js').catch(e=>console.warn('sw',e));});}
/* =========================================================
   Arranque
   ========================================================= */
(async()=>{
  await Store.init();
  if(!S.ix)rebuild();
  render();
  window.__otif={S,exportState:()=>JSON.parse(JSON.stringify({cfg:S.cfg,meta:S.meta,oc:S.oc,rec:S.rec,pal:S.pal,mae:S.mae,plans:S.plans,pos:S.pos}))};
})();
