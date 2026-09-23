<script lang="ts">
	// PROTÓTIPO #14 — descartável, vive só na branch prototipo/14-shell.
	// Três variantes do shell, trocadas por ?variant=A|B|C; estados por ?estado=.
	import { page } from '$app/state';
	import Switcher from '$lib/prototipo/Switcher.svelte';
	import VarianteA from '$lib/prototipo/VarianteA.svelte';
	import VarianteB from '$lib/prototipo/VarianteB.svelte';
	import VarianteC from '$lib/prototipo/VarianteC.svelte';

	const variantes = {
		A: 'sidebar + painel lateral',
		B: 'barra inferior + página própria',
		C: 'densa + modal'
	};
	const variante = $derived(page.url.searchParams.get('variant') ?? 'A');
	const estado = $derived(page.url.searchParams.get('estado') ?? 'normal');
	let escuro = $state(false);
	$effect(() => {
		document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
	});
</script>

{#if variante === 'B'}
	<VarianteB {estado} bind:escuro />
{:else if variante === 'C'}
	<VarianteC {estado} bind:escuro />
{:else}
	<VarianteA {estado} bind:escuro />
{/if}
<Switcher {variantes} atual={variante in variantes ? variante : 'A'} />

<style>
	:global(html) {
		--fundo: #fafaf9;
		--painel: #fff;
		--texto: #1c1917;
		--suave: #78716c;
		--borda: #e7e5e4;
		--realce: #2563eb;
		--erro: #b91c1c;
		color-scheme: light;
	}
	:global(html[data-tema='escuro']) {
		--fundo: #0c0a09;
		--painel: #1c1917;
		--texto: #f5f5f4;
		--suave: #a8a29e;
		--borda: #292524;
		--realce: #60a5fa;
		--erro: #f87171;
		color-scheme: dark;
	}
	:global(body) {
		margin: 0;
		background: var(--fundo);
		color: var(--texto);
		font: 14px/1.4 system-ui, sans-serif;
	}
	:global(button) {
		font: inherit;
		color: inherit;
	}
</style>
