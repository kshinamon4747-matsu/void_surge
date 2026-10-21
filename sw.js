const CACHE='solo-ward-v80';
const ASSETS=['./','./index.html','./style.css?v=80','./solo-game.js?v=80','./game-config.js?v=80','./game-upgrades.js?v=80','./game-utils.js?v=80','./manifest.webmanifest','./icon-core-turret-v2-192.png','./icon-core-turret-v2-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request))) });
