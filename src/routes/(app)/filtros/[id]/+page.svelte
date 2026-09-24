<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Button } from '$lib/components/ui/button';
	import ConstrutorFiltro from '../ConstrutorFiltro.svelte';

	let { data, form } = $props();

	const confirmar: SubmitFunction = ({ cancel }) => {
		if (!confirm(`Apagar o filtro "${data.filtro.title}"?`)) cancel();
	};
</script>

<svelte:head><title>Editar filtro · projMan</title></svelte:head>

<main class="mx-auto w-full max-w-xl space-y-4 px-4 py-4 md:px-6">
	<h1 class="text-xl font-semibold">Editar filtro</h1>

	{#if form?.erro}
		<p role="alert" class="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">{form.erro}</p>
	{/if}

	<form method="POST" action="?/salvar" use:enhance class="space-y-6">
		<ConstrutorFiltro projetos={data.projetos} labels={data.labels} valor={data.filtro} />
		<div class="flex items-center gap-2">
			<Button type="submit">Salvar</Button>
			<Button href="/filtros" variant="outline">Cancelar</Button>
		</div>
	</form>

	<form method="POST" action="?/apagar" use:enhance={confirmar}>
		<Button type="submit" variant="destructive"><i class="bx bx-trash text-base"></i>Apagar filtro</Button>
	</form>
</main>
