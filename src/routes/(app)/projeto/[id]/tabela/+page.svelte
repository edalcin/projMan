<script lang="ts">
	import { page } from '$app/state';
	import CheckFeita from '$lib/components/tarefa/CheckFeita.svelte';
	import { linkTarefa } from '$lib/components/tarefa/linkTarefa';
	import { formatarPrazo } from '$lib/prazo';

	let { data } = $props();
	const COR = ['', 'bg-sky-400', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-600', 'bg-red-600'];

	function comOrdem(ordem: string) {
		const q = new URLSearchParams(page.url.searchParams);
		q.set('ordem', ordem);
		return `?${q}`;
	}
</script>

{#snippet cabecalho(ordem: string, nome: string)}
	<a
		href={comOrdem(ordem)}
		class="flex items-center gap-1 whitespace-nowrap {data.ordem === ordem ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}"
	>
		{nome}{#if data.ordem === ordem}<i class="bx bx-chevron-down text-xs"></i>{/if}
	</a>
{/snippet}

{#if data.tarefas.length === 0}
	<div class="py-16 text-center text-muted-foreground">
		<i class="bx bx-check-circle text-4xl"></i>
		<p class="mt-2">Nenhuma tarefa neste projeto.</p>
	</div>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b text-left text-xs">
					<th class="py-2 pr-2">{@render cabecalho('titulo', 'Título')}</th>
					<th class="py-2 pr-2">{@render cabecalho('prazo', 'Prazo')}</th>
					<th class="py-2 pr-2">{@render cabecalho('prioridade', 'Prioridade')}</th>
					<th class="py-2 pr-2">Labels</th>
					<th class="w-14 py-2">Feita</th>
				</tr>
			</thead>
			<tbody>
				{#each data.tarefas as t (t.id)}
					{@const prazo = t.due_date ? formatarPrazo(t.due_date, !!t.due_all_day, page.data.tz) : null}
					<tr class="border-b align-top">
						<td class="py-2 pr-2">
							<span class="mr-1 inline-block h-3 w-1 rounded-full {COR[t.priority]}"></span>
							<a href={linkTarefa(page.url, t.id)} class="hover:underline" class:line-through={!!t.done}>{t.title}</a>
							{#if t.mae}<span class="text-xs text-muted-foreground"> · {t.mae}</span>{/if}
						</td>
						<td class="whitespace-nowrap py-2 pr-2 {prazo?.atrasada ? 'font-semibold text-destructive' : 'text-muted-foreground'}">
							{prazo?.texto ?? '—'}
						</td>
						<td class="py-2 pr-2 text-muted-foreground">{t.priority || '—'}</td>
						<td class="py-2 pr-2">
							{#each t.labels as l (l.id)}
								<span class="mr-1 inline-block rounded-full px-1.5 py-0.5 text-xs" style="background:#{l.hex_color ?? '9ca3af'}33">{l.title}</span>
							{/each}
						</td>
						<td class="py-2"><CheckFeita id={t.id} feita={!!t.done} /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
