// Service worker de la PWA: deja la app disponible aunque no haya red (los datos siguen viniendo de SharePoint).
const V='entregas-cyl-v1';
const SHELL=['./','./index.html','./app.js','./sp.js','./graph.js','./lib/xlsx.full.min.js','./lib/pdf-lib.min.js','./lib/msal-browser.min.js','./manifest.webmanifest','./icons/192.png','./icons/512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return; // Graph, login y SharePoint van directo a la red
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
