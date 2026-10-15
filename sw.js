/* No private pages or account data are cached by this worker. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch (_) { /* Show a visible fallback. */ }
    const kind = payload?.kind === 'month' ? 'month' : 'sale';
    const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(payload?.period || '') ? payload.period : '';
    const title = kind === 'month' ? 'Cierre de mes disponible' : payload?.kind === 'test' ? 'Avisos activados' : 'Nueva venta registrada';
    const body = kind === 'month'
        ? `Tu resumen de ${period || 'mes anterior'} está listo en BASE DE LOLITA.`
        : payload?.kind === 'test' ? 'Tu teléfono ya puede recibir avisos de BASE DE LOLITA.' : 'Abre BASE DE LOLITA para consultar la venta.';
    event.waitUntil(self.registration.showNotification(title, {
        body,
        icon:new URL('./icons/icon-192.png',self.registration.scope).href,
        badge:new URL('./icons/icon-192.png',self.registration.scope).href,
        tag:typeof payload?.eventKey === 'string' ? payload.eventKey.slice(0,180) : 'lolita-notice',
        data:{kind,period},
        renotify:false
    }));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    // Build the destination locally, never follow a URL from a push payload.
    const target = new URL('./index.html',self.registration.scope);
    target.searchParams.set('push',event.notification.data?.kind === 'month' ? 'month' : 'sale');
    const period = event.notification.data?.period;
    if(/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) target.searchParams.set('period',period);
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
        for(const client of windows){
            const url = new URL(client.url);
            if(url.origin === target.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname)){
                await client.focus();
                client.postMessage({type:'LOLITA_PUSH_OPEN',kind:event.notification.data?.kind,period});
                return;
            }
        }
        await self.clients.openWindow(target.href);
    })());
});
