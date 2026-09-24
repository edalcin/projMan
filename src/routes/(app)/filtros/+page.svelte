<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

	const confirmar =
		(msg: string): SubmitFunction =>
		({ cancel }) => {
			if (!confirm(msg)) cancel();
		};
</script>

<svelte:head><title>Filtros salvos · projMan</title></svelte:head>

{#snippet icone(nome: string, rotulo: string)}
	<i class="bx {nome} text-base"></i><span class="sr-only">{rotulo}</span>
{/snippet}

<main class="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 md:px-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Filtros salvos</h1>
		<Button href="/filtros/novo">Novo filtro</Button>
	</div>

	<ul class="divide-y">
		{#each data.filtros as f, i (f.id)}
			<li class="flex items-center gap-1 py-2">
				<a href="/filtros/{f.id}" class="flex-1 truncate text-sm hover:underline">{f.title}</a>
				<form method="POST" action="?/mover" use:enhance class="flex">
					<input type="hidden" name="id" value={f.id} />
					<Button type="submit" name="delta" value="-1" variant="ghost" size="icon" disabled={i === 0} title="Subir">{@render icone('bx-chevron-up', 'Subir')}</Button>
					<Button type="submit" name="delta" value="1" variant="ghost" size="icon" disabled={i === data.filtros.length - 1} title="Descer">{@render icone('bx-chevron-down', 'Descer')}</Button>
				</form>
				<form method="POST" action="?/apagar" use:enhance={confirmar(`Apagar o filtro "${f.title}"?`)}>
					<input type="hidden" name="id" value={f.id} />
					<Button type="submit" variant="ghost" size="icon" class="text-destructive" title="Apagar">{@render icone('bx-trash', 'Apagar')}</Button>
				</form>
			</li>
		{:else}
			<li class="py-6 text-center text-sm text-muted-foreground">Nenhum filtro salvo ainda. Crie o primeiro acima.</li>
		{/each}
	</ul>
</main>
