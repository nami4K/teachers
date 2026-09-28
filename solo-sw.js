// 티처스 혼공 — 인터넷 없이도 열리게 해 주는 파일 (서비스 워커)
// · 인터넷이 되면: 항상 최신 solo.html 을 받아 오고, 폰에도 한 부 저장해 둬요
// · 인터넷이 안 되면: 폰에 저장해 둔 solo.html 로 열어요
// · 반 앱(index.html)은 건드리지 않아요
const CACHE = 'teachers-solo-v1';
const BASE = new URL('./', self.location).href;
const PAGE = BASE + 'solo.html';
const FILES = [PAGE, BASE + 'solo.webmanifest', BASE + 'solo-icon-192.png', BASE + 'solo-icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('teachers-solo-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 앱 화면: 인터넷 먼저, 안 되면 저장해 둔 것
  if (url.href.split('?')[0].split('#')[0] === PAGE || (req.mode === 'navigate' && url.pathname.endsWith('/solo.html'))) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(PAGE, copy)); }
        return res;
      }).catch(() => caches.match(PAGE))
    );
    return;
  }

  // 아이콘·앱 정보: 저장해 둔 것 먼저
  if (FILES.includes(url.href)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // 글꼴(구글 폰트): 한 번 받으면 저장해 두고 다음부터 바로 써요
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
  // 그 밖의 요청은 그대로 인터넷으로
});
