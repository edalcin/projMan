<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Sortable from 'sortablejs';
	import CheckFeita from '$lib/components/tarefa/CheckFeita.svelte';
	import { linkTarefa } from '$lib/components/tarefa/linkTarefa';
	import { formatarPrazo } from '$lib/prazo';
	import type { Bucket } from '$lib/server/views';

	let { data } = $props();
	const COR = ['', 'bg-sky-400', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-600', 'bg-red-600'];

	let buckets = $state<Bucket[]>(data.buckets);
	let erro = $state(false);
	$effect.pre(() => {
		buckets = data.buckets;
		erro = false;
	});

	async function mover(taskId: number, bucketId: number, antes: number | null, depois: number | null) {
		try {
			const r = await fetch('/api/posicao/kanban', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ task_id: taskId, bucket_id: bucketId, antes, depois })
			});
			if (!r.ok) throw new Error(String(r.status));
		} catch {
			erro = true; // sem retry automático (#6)
		} finally {
			await invalidateAll(); // recarrega buckets/posições e o estado "feita" reais
		}
	}

	function coluna(el: HTMLElement) {
		const s = Sortable.create(el, {
			group: 'kanban',
			handle: '.alca',
			animation: 150,
			forceFallback: true, // mesmo caminho (ponteiro) no mouse e no toque
			delay: 250, // toque: pressão longa para arrastar, para não brigar com o scroll
			delayOnTouchOnly: true,
			touchStartThreshold: 5,
			onEnd(e) {
				const { oldIndex, newIndex, from, to } = e;
				// Devolve o nó ao lugar: quem move o DOM é o Svelte, não o Sortable.
				const volta = from === to && oldIndex! > newIndex! ? 1 : 0;
				from.insertBefore(e.item, from.children[oldIndex! + volta] ?? null);
				if (from === to && oldIndex === newIndex) return;
				const deId = Number(from.dataset.bucket);
				const paraId = Number(to.dataset.bucket);
				const lista = buckets.map((b) => ({ ...b, tarefas: [...b.tarefas] }));
				const de = lista.find((b) => b.id === deId)!;
				const para = lista.find((b) => b.id === paraId)!;
				const [t] = de.tarefas.splice(oldIndex!, 1);
				para.tarefas.splice(newIndex!, 0, t);
				const antes = para.tarefas[newIndex! - 1]?.position ?? null;
				const depois = para.tarefas[newIndex! + 1]?.position ?? null;
				buckets = lista;
				mover(t.id, paraId, antes, depois);
			}
		});
		return { destroy: () => s.destroy() };
	}
</script>

{#if erro}
	<p role="alert" class="mb-3 flex items-center gap-2 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
		<i class="bx bx-wifi-off"></i> Não foi possível mover o card.
	</p>
{/if}

<div class="flex gap-3 overflow-x-auto pb-4">
	{#each buckets as b (b.id)}
		{@const passou = b.wip_limit > 0 && b.tarefas.length > b.wip_limit}
		<section class="w-72 shrink-0 rounded-lg bg-muted/50 p-2">
			<h2 class="mb-2 flex items-center justify-between px-1 text-sm font-medium">
				<span>{b.title}</span>
				<span class:text-destructive={passou} class:font-semibold={passou} class="text-xs text-muted-foreground">
					{b.tarefas.length}{b.wip_limit > 0 ? ` / ${b.wip_limit}` : ''}
				</span>
			</h2>
			<ul class="flex min-h-10 flex-col gap-2" data-bucket={b.id} use:coluna>
				{#each b.tarefas as t (t.id)}
					{@const prazo = t.due_date ? formatarPrazo(t.due_date, !!t.due_all_day, page.data.tz) : null}
					<li class="rounded-md border bg-background p-2 text-sm">
						<div class="mb-1 flex items-start gap-1.5">
							<i class="alca bx bx-move mt-0.5 shrink-0 cursor-grab text-muted-foreground" title="Arrastar"></i>
							<span class="mt-1 h-4 w-1 shrink-0 rounded-full {COR[t.priority]}"></span>
							<a href={linkTarefa(page.url, t.id)} class="min-w-0 flex-1 hover:underline" class:line-through={!!t.done}>{t.title}</a>
							<CheckFeita id={t.id} feita={!!t.done} />
						</div>
						{#if t.mae}<p class="text-xs text-muted-foreground">{t.mae}</p>{/if}
						<div class="flex flex-wrap items-center gap-1">
							{#each t.labels as l (l.id)}
								<span class="rounded-full px-1.5 py-0.5 text-xs" style="background:#{l.hex_color ?? '9ca3af'}33">{l.title}</span>
							{/each}
							{#if prazo}
								<span class="ml-auto whitespace-nowrap text-xs {prazo.atrasada ? 'font-semibold text-destructive' : 'text-muted-foreground'}">
									{prazo.texto}
								</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
