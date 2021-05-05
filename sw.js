"use strict"
const version = '0.0.38';
const appCache = location.pathname.split("/").slice(1,-1).join("/")+"#"; // Unique across origin (Current Path)
const versionedCache = appCache+version; // Unique across versions
const sharedCache = appCache+"shared"
const staticCache = versionedCache+'/static';
const localCache = versionedCache+'/local';
const foreignCache = versionedCache+'/foreign';
function getCache(cacheName){
  if (!getCache.storedcaches){ 
    getCache.storedcaches={};
  }
  const storedcaches = getCache.storedcaches;
  if (cacheName in Object.keys(storedcaches)){
    return Promise.resolve(storedcaches[cacheName]);
  }
  else {
    return caches.open(cacheName).then(cache=>{storedcaches[cacheName]=cache;return cache})
  }
}
const filesToCache = [
  '.',
  'index.html',
  './style.css',
  './script.js',
  './manifest.json'
];
function addAllFast(list,name) {
  const requests=[];
  for (let file of list){
    requests.push(fetch(file,{headers:{'Cache-Control': 'no-cache'}}).then((response)=>{if(response){return response}else{return Error()}}))
  }
  return Promise.all(requests).then(()=>
    getCache(name)).then(cache=>{
      let updates=[];
      for (let request of requests){
        request.then(response=>{
          updates.push(cache.put(response.url,response));
        })
      }
      return Promise.all(updates)
    })
}

// Start the service worker and cache all of the app's content
self.addEventListener('install', function(e) {
  e.waitUntil(addAllFast(filesToCache,staticCache).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', function(event) {
  console.log("Running new service worker "+versionedCache);
  return event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return (cacheName.startsWith(appCache)&&!(cacheName.startsWith(versionedCache)||cacheName.startsWith(sharedCache)))
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      ).then(()=>self.clients.claim());
    })
  );
});
function urlIn(url,list){
  for (let file of list){
    let ourl = new URL(file,location.href);
    if (ourl.hostname+ourl.pathname === url.hostname+url.pathname){
      return true;
    }
  }
  return false;
}
self.addEventListener('fetch', function(event) {
  const url=new URL(event.request.url);
  if (event.request.method.toUpperCase()==="GET"){
    if (urlIn(url,filesToCache)){ // Static Cache
      event.respondWith(getCache(staticCache).then(cache=>cache.match(event.request)));
    }
    else if (url.hostname===location.hostname){ // Local Cache
      event.respondWith(
        getCache(localCache).then(cache=>
          cache.match(event.request).then(function (response) {
            if (response){
              return response;
            }
            return fetch(event.request,{cache:'no-cache'}).then(function(response) {
              const copy=response.clone();
              cache.put(event.request,copy);
              return response;
            })
          })
        )
      )
    }
    else{ // Foreign Cache
      event.respondWith(
        getCache(foreignCache).then(cache=>
          cache.match(event.request).then(function (response) {
            if (response){
              return response;
            }
            else {
              return fetch(event.request).then(function(response) {
                const copy=response.clone();
                cache.put(event.request,copy);
                return response;
              })
            }
          })
        )
      );
    }
  }
});