const CACHE="komsco-dpad-fit-fix-v17";
const STATIC=["./public/assets/world/world_day.png","./public/assets/world/world_exact_map.png","./public/assets/characters/hunmin.png","./public/assets/characters/daim.png","./public/assets/characters/sunsik.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const req=e.request,networkFirst=req.mode==="navigate"||/\.(?:html|js|css)$/.test(new URL(req.url).pathname);
 if(networkFirst)e.respondWith(fetch(req,{cache:"no-store"}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req)));
 else e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res})));
});