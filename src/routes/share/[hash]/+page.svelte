<script lang="ts">
	import { formatarPrazo } from '$lib/prazo';

	let { data } = $props();
	type Tarefa = {
		id: number;
		parent_task_id: number | null;
		title: string;
		description: string;
		done: number;
		due_date: string | null;
		due_all_day: number;
		labels: string | null;
	};
	const tarefas = $derived(data.tarefas as Tarefa[]);
</script>

<svelte:head>
	<title>{data.projeto.title} · projMan</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto w-full max-w-3xl px-4 py-8">
	<header class="mb-6 flex items-center gap-3">
		<img src="/icon-192.png" alt="" width="32" height="32" class="size-8" />
		<h1 class="text-2xl font-semibold tracking-tight">{data.projeto.title}</h1>
		<span class="ml-auto text-xs text-muted-foreground">Somente leitura</span>
	</header>

	<ul class="divide-y">
		{#each tarefas.filter((t) => !t.parent_task_id) as t (t.id)}
			<li class="py-3" class:opacity-60={t.done}>
				<div class="flex items-baseline gap-3">
					<i class="bx {t.done ? 'bx-check-square' : 'bx-square'} text-muted-foreground"></i>
					<strong class="flex-1 font-medium" class:line-through={t.done}>{t.title}</strong>
					{#if t.due_date}<time datetime={t.due_date} class="whitespace-nowrap text-xs text-muted-foreground">{formatarPrazo(t.due_date, !!t.due_all_day, data.tz).texto}</time>{/if}
				</div>
				{#if t.labels}<p class="mt-1 pl-7 text-xs text-muted-foreground">{t.labels}</p>{/if}
				<!-- HTML sanitizado na escrita (#4) -->
				{#if t.description}<div class="prose-sm mt-2 pl-7 text-sm text-muted-foreground">{@html t.description}</div>{/if}
				{#if tarefas.some((s) => s.parent_task_id === t.id)}
					<ul class="mt-2 space-y-1 pl-7">
						{#each tarefas.filter((s) => s.parent_task_id === t.id) as s (s.id)}
							<li class="flex items-baseline gap-2 text-sm" class:opacity-60={s.done}>
								<i class="bx {s.done ? 'bx-check-square' : 'bx-square'} text-muted-foreground"></i>
								<span class:line-through={s.done}>{s.title}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{:else}
			<li class="py-12 text-center text-muted-foreground">Este projeto não tem tarefas.</li>
		{/each}
	</ul>
</main>
