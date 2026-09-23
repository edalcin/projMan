<script lang="ts">
	// PROTÓTIPO #16 — descartável, só na branch prototipo/16-kanban.
	// Kanban com SortableJS: ?n=<cards por coluna>, ?estado=offline faz a requisição falhar.
	import { page } from '$app/state';
	import Sortable from 'sortablejs';
	import { tick } from 'svelte';
	import { MIN, PASSO, entre } from '$lib/prototipo/posicao';

	type Card = { id: number; titulo: string; pos: number };
	const n = Number(page.url.searchParams.get('n') ?? 20);
	const offline = page.url.searchParams.get('estado') === 'offline';
	const nomes = ['A fazer', 'Fazendo', 'Feito'];

	let colunas = $state(
		nomes.map((_, c) =>
			Array.from({ length: n }, (_, i) => ({ id: c * n + i + 1, titulo: `Tarefa ${c * n + i + 1}`, pos: (i + 1) * PASSO }))
		)
	);
	let log = $state<string[]>([]);
	let erro = $state<string | null>(null);
	let renumeracoes = $state(0);
	let render = $state(0);
	const t0 = performance.now();
	$effect(() => {
		tick().then(() => (render = Math.round(performance.now() - t0)));
	});

	// Requisição falsa, 300 ms. Otimista: o estado já mudou quando ela sai.
	const salvar = () =>
		new Promise<void>((ok, falha) => setTimeout(() => (offline ? falha() : ok()), 300));

	function mover(de: number, para: number, i: number, j: number) {
		const antes = $state.snapshot(colunas);
		const [card] = colunas[de].splice(i, 1);
		const alvo = colunas[para];
		card.pos = entre(alvo[j - 1]?.pos ?? null, alvo[j]?.pos ?? null);
		alvo.splice(j, 0, card);
		const vao = Math.min(
			j > 0 ? card.pos - alvo[j - 1].pos : Infinity,
			j < alvo.length - 1 ? alvo[j + 1].pos - card.pos : Infinity
		);
		let msg = `#${card.id} → ${nomes[para]}[${j}] pos=${card.pos} vão=${vao}`;
		if (vao < MIN) {
			alvo.forEach((c, k) => (c.pos = (k + 1) * PASSO));
			renumeracoes++;
			msg += ` → RENUMERA ${alvo.length} cards`;
		}
		log = [msg, ...log].slice(0, 12);
		salvar().catch(() => {
			colunas = antes;
			erro = `Sem conexão: #${card.id} voltou para ${nomes[de]}.`;
		});
	}

	function kanban(el: HTMLElement, c: number) {
		const s = Sortable.create(el, {
			group: 'kanban',
			animation: 150,
			forceFallback: true, // mesmo caminho (ponteiro) no mouse e no toque; sem DnD nativo
			delay: 250, // toque: pressão longa para arrastar; antes disso a página rola
			delayOnTouchOnly: true,
			touchStartThreshold: 5,
			onEnd(e) {
				// Devolve o nó ao lugar: quem move o DOM é o Svelte, não o Sortable.
				const volta = e.from === e.to && e.oldIndex! > e.newIndex! ? 1 : 0;
				e.from.insertBefore(e.item, e.from.children[e.oldIndex! + volta] ?? null);
				if (e.from === e.to && e.oldIndex === e.newIndex) return;
				mover(c, Number(e.to.dataset.col), e.oldIndex!, e.newIndex!);
			}
		});
		return { destroy: () => s.destroy() };
	}

	// Martela o mesmo vão: sempre joga o último card da 1ª coluna na posição 1.
	function martelar() {
		for (let k = 0; k < 20; k++) mover(0, 0, colunas[0].length - 1, 1);
	}
</script>

<header>
	<b>Kanban protótipo</b> · {n}/coluna · render {render} ms · renumerações {renumeracoes}
	<button onclick={martelar}>Martelar o vão 20×</button>
	{#if offline}<span class="off">offline simulado</span>{/if}
</header>
{#if erro}<p class="erro">{erro} <button onclick={() => (erro = null)}>×</button></p>{/if}

<div class="quadro">
	{#each colunas as coluna, c (c)}
		<section>
			<h2>{nomes[c]} <small>{coluna.length}</small></h2>
			<ul data-col={c} use:kanban={c}>
				{#each coluna as card (card.id)}
					<li><span>{card.titulo}</span><small>{card.pos}</small></li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<pre>{log.join('\n')}</pre>

<style>
	:global(body) { margin: 0; font: 14px system-ui, sans-serif; background: #f5f5f4; }
	header { padding: 8px 12px; background: #fff; border-bottom: 1px solid #ddd; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
	.off { color: #b91c1c; font-weight: 600; }
	.erro { margin: 8px 12px; color: #b91c1c; border: 1px solid #b91c1c; padding: 6px 10px; border-radius: 6px; }
	.quadro { display: flex; gap: 12px; padding: 12px; overflow-x: auto; }
	section { flex: 0 0 280px; background: #e7e5e4; border-radius: 8px; padding: 8px; }
	h2 { font-size: 14px; margin: 4px 4px 8px; }
	ul { list-style: none; margin: 0; padding: 0; min-height: 40px; display: flex; flex-direction: column; gap: 6px; }
	li { background: #fff; border-radius: 6px; padding: 8px; display: flex; justify-content: space-between; cursor: grab; user-select: none; }
	li small { color: #999; font-family: monospace; }
	pre { margin: 12px; font-size: 12px; background: #111; color: #0f0; padding: 8px; border-radius: 6px; min-height: 60px; }
</style>
