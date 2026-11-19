// Работа сайта без интернета.
// Этот файл лежит рядом с index.html (на GitHub загружать тоже рядом).
// Сначала сайт пробует взять свежую версию из интернета; если связи нет
// или она очень медленная (дольше 4 секунд), показывает сохранённую копию.
// Новая картинка или файл: допиши имя в FILES и поменяй номер в CACHE.
const CACHE = "uroki-3-klass-v1";
const FILES = [
  "./",
  "index.html",
  "igry-8-2.html",
  "igry-8-3.html",
  "kartinki/mat-11-12-tablica.png",
  "kartinki/mat-27-11-tablica.png",
  "kartinki/mat-3-12-figury-1.png",
  "kartinki/mat-3-12-figury-2.png",
  "kartinki/mat-7-12-figura.png",
  "kartinki/mat-8-12-tablica.png",
  "kartinki/parus.jpg",
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // по одному: если какого-то файла нет, остальные всё равно сохранятся
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  // Только свои файлы. Таблицу Google и Диск не трогаем.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(new Promise(function (resolve) {
    let done = false;
    function fromCache() {
      if (done) return;
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (done) return;
        if (hit) { done = true; resolve(hit); }
      });
    }
    const timer = setTimeout(fromCache, 4000);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      if (!done) { done = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (done) return;
        done = true;
        resolve(hit || new Response("Нет интернета, а этот файл ещё не сохранён на устройстве.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));
      });
    });
  }));
});
