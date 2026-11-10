// SharePoint: listas compartidas de la herramienta (Gestión y Monitoreo de Entregas C&L).
// Las llamadas se ejecutan dentro de una pestaña del sitio (mismo origen) con la sesión del usuario;
// las escrituras directas desde la extensión son rechazadas por SharePoint.
function spMsg(t){try{const j=JSON.parse(t);return (j['odata.error']&&j['odata.error'].message&&j['odata.error'].message.value)||(j.error&&j.error.message&&(j.error.message.value||j.error.message))||t.slice(0,200);}catch(e){return String(t).slice(0,200);}}

const SP={
  host:'https://cylfruit.sharepoint.com',
  site:'',
  _tab:null,_dig:null,_digT:0,
  LISTAS:{
    EN_Parametros:[['Valor','Note']],                                   // cfg, pos, meta (JSON)
    EN_Planes:[['Datos','Note']],                                       // un ítem por línea OC+código: compromisos e historial (JSON)
    EN_Reuniones:[['Datos','Note']],                                    // acta semanal por proveedor (JSON)
    EN_Productos:[['Datos','Note']],                                    // ficha de producto (JSON)
    EN_Datos:[['Tipo','Text'],['Ver','Text'],['Indice','Number'],['Filas','Note']] // OC / recepciones / pallet / maestro por trozos
  },
  configurar(site){this.site=(site||'').replace(/\/+$/,'');this._tab=null;this._dig=null;},

  async tab(){
    const okTab=t=>t&&t.url&&t.url.startsWith(this.host+'/')&&t.status==='complete';
    if(this._tab){try{const t=await chrome.tabs.get(this._tab);if(okTab(t))return t.id;}catch(e){}}
    const tabs=await chrome.tabs.query({url:this.host+'/*'});
    const t0=tabs.find(okTab);
    if(t0)return (this._tab=t0.id);
    const t=await chrome.tabs.create({url:this.site,active:false});
    for(let i=0;i<100;i++){
      await new Promise(r=>setTimeout(r,300));
      let cur;try{cur=await chrome.tabs.get(t.id);}catch(e){break;}
      if(okTab(cur))return (this._tab=cur.id);
      if(cur.status==='complete'&&cur.url&&!cur.url.startsWith(this.host)){await chrome.tabs.update(t.id,{active:true});throw new Error('Inicia sesión en SharePoint en la pestaña que se abrió y luego pulsa Reconectar.');}
    }
    throw new Error('No pude abrir SharePoint. Abre el sitio en una pestaña y pulsa Reconectar.');
  },
  async http(url,{method='GET',headers={},body=null}={}){
    const tabId=await this.tab();
    let res;
    const limite=new Promise((_,rej)=>setTimeout(()=>rej(new Error('la pestaña de SharePoint no respondió en 40 s')),40000));
    try{
      [{result:res}]=await Promise.race([limite,chrome.scripting.executeScript({
        target:{tabId},world:'MAIN',args:[url,method,headers,body],
        func:async(url,method,headers,body)=>{try{const r=await fetch(url,{method,headers,body,credentials:'include'});return {status:r.status,ok:r.ok,text:await r.text()};}catch(e){return {status:0,ok:false,text:String(e)};}}
      })]);
    }catch(e){this._tab=null;throw new Error('No pude usar la pestaña de SharePoint ('+e.message+'). Revisa que la pestaña de SharePoint tenga la sesión iniciada y pulsa Reconectar.');}
    if(!res){this._tab=null;throw new Error('La pestaña de SharePoint no respondió. Pulsa Reconectar.');}
    return res;
  },
  async digest(){
    if(this._dig&&Date.now()-this._digT<20*60*1000)return this._dig;
    const r=await this.http(this.site+'/_api/contextinfo',{method:'POST',headers:{Accept:'application/json;odata=nometadata'}});
    if(!r.ok)throw new Error(r.status===403||r.status===401?'Sin acceso al sitio de SharePoint configurado.':'SharePoint '+r.status+' al conectar: '+spMsg(r.text));
    this._dig=JSON.parse(r.text).FormDigestValue;this._digT=Date.now();
    return this._dig;
  },
  async req(rel,{method='GET',body,merge=false,del=false}={}){
    const h={Accept:'application/json;odata=nometadata'};
    if(method!=='GET')h['X-RequestDigest']=await this.digest();
    if(merge){h['IF-MATCH']='*';h['X-HTTP-Method']='MERGE';}
    if(del){h['IF-MATCH']='*';h['X-HTTP-Method']='DELETE';}
    let b=null;
    if(body!==undefined){b=JSON.stringify(body);h['Content-Type']='application/json;odata=nometadata';}
    let r=await this.http(this.site+rel,{method,headers:h,body:b});
    if(r.status===403&&method!=='GET'&&/digest|security validation/i.test(r.text)){this._dig=null;h['X-RequestDigest']=await this.digest();r=await this.http(this.site+rel,{method,headers:h,body:b});}
    if(!r.ok){const err=new Error('SharePoint '+r.status+': '+spMsg(r.text));err.status=r.status;throw err;}
    return r.text?JSON.parse(r.text):null;
  },
  async usuario(){try{const u=await this.req('/_api/web/currentuser');return (u&&u.Title)||'';}catch(e){return '';}},

  // ---- listas
  async existe(lista){try{await this.req(`/_api/web/lists/getbytitle('${lista}')?$select=Id`);return true;}catch(e){if(e.status===404)return false;throw e;}},
  async preparar(log=()=>{}){
    for(const [lista,campos] of Object.entries(this.LISTAS)){
      if(!(await this.existe(lista))){
        await this.req('/_api/web/lists',{method:'POST',body:{Title:lista,BaseTemplate:100,Description:'Gestión y Monitoreo de Entregas C&L'}});
        log('Lista creada: '+lista);
      }
      const existentes=new Set((await this.req(`/_api/web/lists/getbytitle('${lista}')/fields?$select=InternalName&$top=500`)).value.map(f=>f.InternalName));
      for(const [nombre,tipo] of campos){
        if(existentes.has(nombre))continue;
        const xml=tipo==='Note'?`<Field Type="Note" Name="${nombre}" DisplayName="${nombre}" NumLines="6" RichText="FALSE" />`
          :tipo==='Number'?`<Field Type="Number" Name="${nombre}" DisplayName="${nombre}" Decimals="0" />`
          :`<Field Type="Text" Name="${nombre}" DisplayName="${nombre}" MaxLength="255" />`;
        await this.req(`/_api/web/lists/getbytitle('${lista}')/fields/createfieldasxml`,{method:'POST',body:{parameters:{SchemaXml:xml,Options:12}}});
        log(`  campo ${nombre} agregado a ${lista}`);
      }
    }
  },
  async items(lista,select){
    let url=`/_api/web/lists/getbytitle('${lista}')/items?$top=5000`+(select?'&$select=Id,Title,'+select:'');
    const out=[];
    while(url){const j=await this.req(url);out.push(...j.value);url=j['odata.nextLink']?j['odata.nextLink'].replace(this.site,''):null;}
    return out;
  },
  async upsert(lista,title,data,idMap){
    const id=idMap.get(title);
    if(id){await this.req(`/_api/web/lists/getbytitle('${lista}')/items(${id})`,{method:'POST',body:data,merge:true});return id;}
    const j=await this.req(`/_api/web/lists/getbytitle('${lista}')/items`,{method:'POST',body:{Title:title,...data}});
    idMap.set(title,j.Id);return j.Id;
  },
  async borrar(lista,title,idMap){
    const id=idMap.get(title);if(!id)return;
    await this.req(`/_api/web/lists/getbytitle('${lista}')/items(${id})`,{method:'POST',del:true});
    idMap.delete(title);
  }
};
