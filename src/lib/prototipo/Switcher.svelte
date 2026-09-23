<script lang="ts">
	// PROTÓTIPO #14 — barra flutuante: troca `?variant=` e `?estado=`. Some em produção.
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { variantes, atual }: { variantes: Record<string, string>; atual: string } = $props();
	const chaves = $derived(Object.keys(variantes));
	const estados = ['normal', 'vazio', 'carregando', 'offline'];

	function ir(param: string, valor: string) {
		const u = new URL(page.url);
		u.searchParams.set(param, valor);
		u.searchParams.delete('tarefa');
		goto(u, { replaceState: true, keepFocus: true, noScroll: true });
	}
	function passo(d: number) {
		const i = chaves.indexOf(atual);
		ir('variant', chaves[(i + d + chaves.length) % chaves.length]);
	}
	function tecla(e: KeyboardEvent) {
		const t = e.target as HTMLElement;
		if (t.closest('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'ArrowLeft') passo(-1);
		if (e.key === 'ArrowRight') passo(1);
	}
</script>

<svelte:window onkeydown={tecla} />

{#if dev}
	<div class="barra">
		<button onclick={() => passo(-1)}>←</button>
		<b>{atual} ({variantes[atual]})</b>
		<button onclick={() => passo(1)}>→</button>
		<select value={page.url.searchParams.get('estado') ?? 'normal'} onchange={(e) => ir('estado', e.currentTarget.value)}>
			{#each estados as e (e)}<option>{e}</option>{/each}
		</select>
	</div>
{/if}

<style>
	.barra {
		position: fixed;
		bottom: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 6px 12px;
		border-radius: 999px;
		background: #111;
		color: #ff0;
		font: 13px monospace;
		box-shadow: 0 4px 16px #0008;
	}
	button, select {
		background: #333;
		color: #ff0;
		border: 0;
		border-radius: 6px;
		padding: 2px 8px;
		font: inherit;
	}
</style>
