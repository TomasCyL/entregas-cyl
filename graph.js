// Acceso a las listas EN_* vía Microsoft Graph con inicio de sesión Microsoft (MSAL). Se usa cuando la app corre como PWA (sin APIs de extensión).
// Misma interfaz que SP (sp.js): configurar, preparar, usuario, items, upsert, borrar.
const GRAPH_CFG={clientId:'10fd9db5-58cc-4b64-b3a9-ad33ab097b51',tenantId:'5946134b-9789-4d13-86c4-e01684301b6a',scopes:['Sites.ReadWrite.All','User.Read']};
const GraphSP={
  host:'https://cylfruit.sharepoint.com',site:'',_msal:null,_acct:null,_siteId:null,_lists:{},
  LISTAS:{EN_Parametros:[['Valor','Note']],EN_Planes:[['Datos','Note']],EN_Reuniones:[['Datos','Note']],EN_Productos:[['Datos','Note']],EN_Datos:[['Tipo','Text'],['Ver','Text'],['Indice','Number'],['Filas','Note']]},
  configurar(site){this.site=(site||'').replace(/\/+$/,'');this._siteId=null;this._lists={};},
  async msal(){
    if(this._msal)return this._msal;
    if(!window.msal)throw new Error('No se cargó la librería de inicio de sesión (msal).');
    const base=location.origin+location.pathname.replace(/[^/]*$/,'');
    this._msal=new msal.PublicClientApplication({auth:{clientId:GRAPH_CFG.clientId,authority:'https://login.microsoftonline.com/'+GRAPH_CFG.tenantId,redirectUri:base,navigateToLoginRequestUrl:false},cache:{cacheLocation:'localStorage'}});
    await this._msal.initialize();
    const res=await this._msal.handleRedirectPromise();
    const accts=this._msal.getAllAccounts();
    this._acct=(res&&res.account)||accts[0]||null;
    return this._msal;
  },
  async token(interactive=true){
    const m=await this.msal();
    if(!this._acct){if(!interactive)throw new Error('Sin sesión.');await m.loginRedirect({scopes:GRAPH_CFG.scopes});return new Promise(()=>{});}
    try{const r=await m.acquireTokenSilent({scopes:GRAPH_CFG.scopes,account:this._acct});return r.accessToken;}
    catch(e){if(!interactive)throw e;await m.acquireTokenRedirect({scopes:GRAPH_CFG.scopes,account:this._acct});return new Promise(()=>{});}
  },
  async salir(){const m=await this.msal();await m.logoutRedirect({account:this._acct});},
  async g(path,{method='GET',body,headers={}}={}){
    const t=await this.token();
    const url=path.startsWith('http')?path:'https://graph.microsoft.com/v1.0'+path;
    const r=await fetch(url,{method,headers:{Authorization:'Bearer '+t,Accept:'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body!==undefined?JSON.stringify(body):undefined});
    if(r.status===204)return null;
    const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
    if(!r.ok){const err=new Error('Graph '+r.status+': '+((j&&j.error&&j.error.message)||txt.slice(0,200)));err.status=r.status;throw err;}
    return j;
  },
  async siteId(){
    if(this._siteId)return this._siteId;
    const m=/^https:\/\/([^\/]+)(\/.*)?$/.exec(this.site);if(!m)throw new Error('Sitio de SharePoint no válido: '+this.site);
    const j=await this.g(`/sites/${m[1]}:${m[2]||'/'}`);this._siteId=j.id;return j.id;
  },
  async listId(nombre){
    if(this._lists[nombre])return this._lists[nombre];
    const sid=await this.siteId();
    const j=await this.g(`/sites/${sid}/lists?$select=id,displayName&$top=200`);
    for(const l of j.value)this._lists[l.displayName]=l.id;
    return this._lists[nombre]||null;
  },
  async usuario(){try{const u=await this.g('/me?$select=displayName,mail,userPrincipalName');return u.displayName||u.mail||'';}catch(e){return '';}},
  async existe(lista){return !!(await this.listId(lista));},
  async preparar(log=()=>{}){
    const sid=await this.siteId();
    for(const [lista,campos] of Object.entries(this.LISTAS)){
      let lid=await this.listId(lista);
      const col=([n,t])=>t==='Note'?{name:n,text:{allowMultipleLines:true,textType:'plain',maxLength:0}}:t==='Number'?{name:n,number:{decimalPlaces:'none'}}:{name:n,text:{maxLength:255}};
      if(!lid){const j=await this.g(`/sites/${sid}/lists`,{method:'POST',body:{displayName:lista,description:'Gestión y Monitoreo de Entregas C&L',columns:campos.map(col),list:{template:'genericList'}}});this._lists[lista]=j.id;log('Lista creada: '+lista);continue;}
      const cols=await this.g(`/sites/${sid}/lists/${lid}/columns?$select=name`);const have=new Set(cols.value.map(c=>c.name));
      for(const c of campos){if(have.has(c[0]))continue;await this.g(`/sites/${sid}/lists/${lid}/columns`,{method:'POST',body:col(c)});log(`  campo ${c[0]} agregado a ${lista}`);}
    }
  },
  async items(lista,select){
    const sid=await this.siteId();const lid=await this.listId(lista);if(!lid)throw new Error('No existe la lista '+lista);
    const sel='id,Title'+(select?','+select:'');
    let url=`/sites/${sid}/lists/${lid}/items?$expand=fields($select=${sel})&$top=999`;const out=[];
    while(url){const j=await this.g(url);for(const it of j.value){const f=it.fields||{};out.push({Id:+it.id,...f,Title:f.Title});}url=j['@odata.nextLink']||null;}
    return out;
  },
  async upsert(lista,title,data,idMap){
    const sid=await this.siteId();const lid=await this.listId(lista);
    const id=idMap.get(title);
    if(id){await this.g(`/sites/${sid}/lists/${lid}/items/${id}/fields`,{method:'PATCH',body:data});return id;}
    const j=await this.g(`/sites/${sid}/lists/${lid}/items`,{method:'POST',body:{fields:{Title:title,...data}}});
    idMap.set(title,+j.id);return +j.id;
  },
  async borrar(lista,title,idMap){
    const id=idMap.get(title);if(!id)return;const sid=await this.siteId();const lid=await this.listId(lista);
    await this.g(`/sites/${sid}/lists/${lid}/items/${id}`,{method:'DELETE'});idMap.delete(title);
  }
};
