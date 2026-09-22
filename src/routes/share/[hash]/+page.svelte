<script lang="ts">
	let { data } = $props();
	type Tarefa = {
		id: number;
		parent_task_id: number | null;
		title: string;
		description: string;
		done: number;
		due_date: string | null;
		labels: string | null;
	};
	const tarefas = $derived(data.tarefas as Tarefa[]);
</script>

<svelte:head>
	<title>{data.projeto.title} · projMan</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<h1>{data.projeto.title}</h1>
	<ul>
		{#each tarefas.filter((t) => !t.parent_task_id) as t (t.id)}
			<li class:feita={t.done}>
				<strong>{t.title}</strong>
				{#if t.due_date}<time datetime={t.due_date}>{t.due_date.slice(0, 10)}</time>{/if}
				{#if t.labels}<small>{t.labels}</small>{/if}
				<!-- HTML sanitizado na escrita (#4) -->
				{#if t.description}<div>{@html t.description}</div>{/if}
				<ul>
					{#each tarefas.filter((s) => s.parent_task_id === t.id) as s (s.id)}
						<li class:feita={s.done}>{s.title}</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</main>

<style>
	.feita {
		text-decoration: line-through;
		opacity: 0.6;
	}
</style>
