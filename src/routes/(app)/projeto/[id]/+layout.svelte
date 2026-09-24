<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props();
	const abas = $derived([
		{ href: `/projeto/${data.projeto.id}`, nome: 'List', icone: 'bx-list-ul' },
		{ href: `/projeto/${data.projeto.id}/kanban`, nome: 'Kanban', icone: 'bx-columns' },
		{ href: `/projeto/${data.projeto.id}/tabela`, nome: 'Table', icone: 'bx-table' }
	]);
</script>

<svelte:head><title>{data.projeto.title} · projMan</title></svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-4 md:px-6">
	<h1 class="mb-3 text-xl font-semibold">
		{data.projeto.title}
		{#if data.projeto.archived}<span class="text-sm font-normal text-muted-foreground">(arquivado)</span>{/if}
	</h1>
	<nav class="mb-4 flex gap-1 border-b">
		{#each abas as a (a.href)}
			<a
				href={a.href}
				class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium {page.url.pathname === a.href
					? 'border-primary text-foreground'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				<i class="bx {a.icone}"></i>{a.nome}
			</a>
		{/each}
	</nav>
	{@render children()}
</div>
