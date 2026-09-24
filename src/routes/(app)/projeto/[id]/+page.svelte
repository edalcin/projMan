<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Sortable from 'sortablejs';
	import CheckFeita from '$lib/components/tarefa/CheckFeita.svelte';
	import { linkTarefa } from '$lib/components/tarefa/linkTarefa';
	import { formatarPrazo } from '$lib/prazo';
	import type { TarefaPosicionada } from '$lib/server/views';

	let { data } = $props();
	// Faixa de cor da prioridade: 0 sem, 1 baixa … 5 agora (CONTEXT.md)
	const COR = ['', 'bg-sky-400', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-600', 'bg-red-600'];

	let tarefas = $state<TarefaPosicionada[]>(data.tarefas);
	let erro = $state(false);
	$effect.pre(() => {
		tarefas = data.tarefas;
		erro = false;
	});

	async function mover(taskId: number, antes: number | null, depois: number | null) {
		try {
			const r = await fetch('/api/posicao/view', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ task_id: taskId, view_id: data.viewId, antes, depois })
			});
			if (!r.ok) throw new Error(String(r.status));
			await invalidateAll(); // recarrega a ordem real (ponto único de verdade do servidor)
		} catch {
			erro = true; // sem retry automático (#5); a lista volta ao lugar abaixo
			await invalidateAll();
		}
	}

	function arrastar(el: HTMLElement) {
		const s = Sortable.create(el, {
			handle: '.alca',
			animation: 150,
			forceFallback: true, // mesmo caminho (ponteiro) no mouse e no toque
			delay: 250,
			delayOnTouchOnly: true,
			touchStartThreshold: 5,
			onEnd(e) {
				const { oldIndex, newIndex } = e;
				// Devolve o nó ao lugar: quem move o DOM é o Svelte, não o Sortable.
				const volta = oldIndex! > newIndex! ? 1 : 0;
				e.from.insertBefore(e.item, e.from.children[oldIndex! + volta] ?? null);
				if (oldIndex === newIndex) return;
				const lista = [...tarefas];
				const [t] = lista.splice(oldIndex!, 1);
				lista.splice(newIndex!, 0, t);
				const antes = lista[newIndex! - 1]?.position ?? null;
				const depois = lista[newIndex! + 1]?.position ?? null;
				mover(t.id, antes, depois);
			}
		});
		return { destroy: () => s.destroy() };
	}
</script>

{#if erro}
	<p role="alert" class="mb-3 flex items-center gap-2 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
		<i class="bx bx-wifi-off"></i> Não foi possível mover a tarefa. A ordem voltou ao lugar.
	</p>
{/if}

<div class="mb-3">
	<a
		href="?feitas={data.feitas ? '0' : '1'}"
		class="text-sm text-muted-foreground hover:text-foreground hover:underline"
	>
		{data.feitas ? '← Ver abertas' : 'Ver feitas'}
	</a>
</div>

{#if tarefas.length === 0}
	<div class="py-16 text-center text-muted-foreground">
		<i class="bx bx-check-circle text-4xl"></i>
		<p class="mt-2">Nada em {data.feitas ? 'feitas' : 'aberto'}.</p>
	</div>
{:else}
	<ul use:arrastar>
		{#each tarefas as t (t.id)}
			{@const prazo = t.due_date ? formatarPrazo(t.due_date, !!t.due_all_day, page.data.tz) : null}
			<li class="flex items-center gap-2 border-b py-2 text-sm">
				<i class="alca bx bx-move cursor-grab text-muted-foreground" title="Arrastar"></i>
				<CheckFeita id={t.id} feita={!!t.done} />
				<span class="h-5 w-1 shrink-0 rounded-full {COR[t.priority]}"></span>
				<a href={linkTarefa(page.url, t.id)} class="min-w-0 flex-1 truncate hover:underline" class:line-through={!!t.done}>
					{t.title}
				</a>
				{#if t.mae}<span class="hidden min-w-0 max-w-[40%] truncate text-xs text-muted-foreground sm:inline" title={t.mae}>{t.mae}</span>{/if}
				{#each t.labels as l (l.id)}
					<span class="hidden shrink-0 rounded-full px-1.5 py-0.5 text-xs md:inline" style="background:#{l.hex_color ?? '9ca3af'}33">{l.title}</span>
				{/each}
				{#if prazo}
					<span class="shrink-0 whitespace-nowrap text-xs {prazo.atrasada ? 'font-semibold text-destructive' : 'text-muted-foreground'}">
						{prazo.texto}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
