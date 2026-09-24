<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import ConstrutorFiltro from '../ConstrutorFiltro.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Novo filtro · projMan</title></svelte:head>

<main class="mx-auto w-full max-w-xl space-y-4 px-4 py-4 md:px-6">
	<h1 class="text-xl font-semibold">Novo filtro</h1>

	{#if form?.erro}
		<p role="alert" class="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">{form.erro}</p>
	{/if}

	<form method="POST" action="?/salvar" use:enhance class="space-y-6">
		<ConstrutorFiltro projetos={data.projetos} labels={data.labels} />
		<div class="flex gap-2">
			<Button type="submit">Salvar</Button>
			<Button href="/filtros" variant="outline">Cancelar</Button>
		</div>
	</form>
</main>
