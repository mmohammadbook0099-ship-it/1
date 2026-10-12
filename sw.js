/* Service Worker - لعبة ليدو */
const CACHE_NAME = 'ludo-game-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

/* التثبيت - تخزين الملفات في الكاش */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.error('[SW] Cache failed:', err))
    );
});

/* التفعيل - حذف الكاش القديم */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

/* الجلب - خدمة الملفات من الكاش أولاً (يعمل أوفلاين) */
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // تجاهل طلبات غير GET
    if (req.method !== 'GET') return;

    // تجاهل الطلبات الخارجية (خارج نطاق التطبيق)
    if (!req.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) {
                // إرجاع من الكاش + تحديث في الخلفية
                fetch(req).then((response) => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(req, response.clone());
                        });
                    }
                }).catch(() => {});
                return cached;
            }

            // غير موجود في الكاش → اجلبه من الشبكة وخزّنه
            return fetch(req).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(req, responseClone);
                });
                return response;
            }).catch(() => {
                // عند فشل الشبكة وعدم وجود الكاش، ارجع الصفحة الرئيسية
                if (req.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

/* الاستماع للرسائل من الصفحة */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
