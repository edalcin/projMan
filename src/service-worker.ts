/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// PWA só de leitura offline (ADR 0004): cache-first nos assets do build,
// network-first com fallback de cache para navegação e GET /api/tarefas*.
// Mutação (não-GET) nunca é interceptada; /login, /logout, /api/export e
// /ical/* nunca são cacheados (sessão, token e export não devem persistir).
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `projman-${version}`;
const ASSETS = new Set([...build, ...files]);
const NUNCA_CACHE = ['/login', '/logout', '/api/export', '/ical/'];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(build); // `files` (static/) pode incluir algo que 404 e derrubar o addAll
			sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const chave of await caches.keys()) if (chave !== CACHE) await caches.delete(chave);
			sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return; // mutação: sempre rede, sem fila
	const url = new URL(event.request.url);
	if (url.origin !== location.origin || NUNCA_CACHE.some((p) => url.pathname === p || url.pathname.startsWith(p))) return;

	if (ASSETS.has(url.pathname)) {
		event.respondWith(cacheFirst(event.request));
		return;
	}
	if (event.request.mode === 'navigate' || url.pathname.startsWith('/api/tarefas')) {
		event.respondWith(networkFirst(event.request));
	}
});

async function cacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	const achado = await cache.match(request);
	if (achado) return achado;
	const resposta = await fetch(request);
	if (resposta.ok) cache.put(request, resposta.clone());
	return resposta;
}

async function networkFirst(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	try {
		const resposta = await fetch(request);
		if (resposta.ok) cache.put(request, resposta.clone());
		return resposta;
	} catch (erro) {
		const achado = await cache.match(request);
		if (achado) return achado;
		throw erro;
	}
}
