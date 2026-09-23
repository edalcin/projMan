<script lang="ts">
	// PROTÓTIPO #14 — Variante B: mobile-first. Barra de abas embaixo (no topo no
	// desktop), coluna única, linha em dois níveis, detalhe em página própria
	// (?tarefa= substitui a lista). Criação por botão flutuante + folha inferior.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { alternar, corPrioridade, criar, daLista, filtros, projetos, smartLists, tarefas } from './dados.svelte';
	import Sentinela from './Sentinela.svelte';

	let { estado, escuro = $bindable() }: { estado: string; escuro: boolean } = $props();
	let aba = $state<'Hoje' | 'Projetos' | 'Filtros' | 'Mais'>('Hoje');
	let lista = $state('Hoje');
	let limite = $state(30);
	let erro = $state<string | null>(null);
	let folha = $state(false);
	let novo = $state({ titulo: '', projeto: 'Casa', prazo: '', prioridade: '0' });

	const itens = $derived(estado === 'vazio' ? [] : daLista(lista));
	const abertaId = $derived(Number(page.url.searchParams.get('tarefa')) || null);
	const aberta = $derived(tarefas.find((t) => t.id === abertaId));

	function abrir(id: number | null) {
		const u = new URL(page.url);
		if (id) u.searchParams.set('tarefa', String(id));
		else u.searchParams.delete('tarefa');
		goto(u);
	}
	function escolher(l: string) {
		lista = l;
		limite = 30;
		aba = 'Hoje';
	}
	function enviar(e: SubmitEvent) {
		e.preventDefault();
		if (!novo.titulo.trim()) return;
		erro = criar(novo.titulo.trim(), novo.projeto, novo.prazo || null, estado);
		folha = false;
		if (!erro) novo.titulo = novo.prazo = '';
	}
</script>

<div class="app">
	{#if aberta}
		<article>
			<button class="voltar" onclick={() => history.back()}>‹ {lista}</button>
			<label class="grande"><input type="checkbox" checked={aberta.feita} onchange={(e) => { erro = alternar(aberta, estado); if (erro) e.currentTarget.checked = aberta.feita; }} /> {aberta.titulo}</label>
			{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
			<div class="chips">
				<span># {aberta.projeto}</span>
				<span>📅 {aberta.prazo ?? 'sem prazo'}</span>
				<span>⚑ {aberta.prioridade}</span>
				{#each aberta.labels as l (l)}<span>{l}</span>{/each}
			</div>
			<div class="editor">{aberta.descricao || 'Sem descrição. (TipTap aqui)'}</div>
			<h3>Subtarefas {aberta.sub ? `${aberta.sub[0]}/${aberta.sub[1]}` : ''}</h3>
			<h3>Comentários</h3>
			<h3>Anexos</h3>
		</article>
	{:else if aba === 'Projetos' || aba === 'Filtros'}
		<section>
			<h2>{aba}</h2>
			{#each aba === 'Projetos' ? projetos : filtros as p (p)}
				<button class="item" onclick={() => escolher(p)}>{p} <span>›</span></button>
			{/each}
		</section>
	{:else if aba === 'Mais'}
		<section>
			<h2>Mais</h2>
			<button class="item" onclick={() => (escuro = !escuro)}>Tema: {escuro ? 'escuro' : 'claro'} <span>⇄</span></button>
			<button class="item">Exportar backup <span>›</span></button>
			<button class="item">Sair <span>›</span></button>
		</section>
	{:else}
		<section>
			<div class="pilulas">
				{#each smartLists as l (l)}<button class:ativo={lista === l} onclick={() => escolher(l)}>{l}</button>{/each}
			</div>
			<h2>{lista}</h2>
			{#if erro}<p class="erro" role="alert">{erro} <button onclick={() => (erro = null)}>×</button></p>{/if}
			{#if estado === 'carregando'}
				{#each Array(6) as _, i (i)}<div class="card esqueleto"></div>{/each}
			{:else if itens.length === 0}
				<div class="vazio"><p style="font-size:40px">☀</p><p>Nada para <b>{lista}</b>.</p><button onclick={() => (folha = true)}>Criar tarefa</button></div>
			{:else}
				{#each itens.slice(0, limite) as t (t.id)}
					<div class="card" class:feita={t.feita} style="border-left-color:{corPrioridade[t.prioridade]}">
						<input type="checkbox" checked={t.feita} onchange={(e) => { erro = alternar(t, estado); if (erro) e.currentTarget.checked = t.feita; }} />
						<button class="corpo" onclick={() => abrir(t.id)}>
							<span class="titulo">{t.titulo}</span>
							<span class="meta">
								{t.projeto}
								{#if t.prazo}· <b class:atrasada={t.atrasada}>{t.prazo}</b>{/if}
								{#if t.sub}· ☑ {t.sub[0]}/{t.sub[1]}{/if}
								{#each t.labels as l (l)}· {l} {/each}
							</span>
						</button>
					</div>
				{/each}
				{#if limite < itens.length}<Sentinela mais={() => (limite += 30)} />{/if}
			{/if}
		</section>
	{/if}

	{#if !aberta}<button class="fab" onclick={() => (folha = true)} aria-label="Nova tarefa">+</button>{/if}

	{#if folha}
		<button class="veu" aria-label="Fechar" onclick={() => (folha = false)}></button>
		<form class="folha" onsubmit={enviar}>
			<!-- svelte-ignore a11y_autofocus -->
			<input autofocus bind:value={novo.titulo} placeholder="O que precisa ser feito?" />
			<div class="linha">
				<select bind:value={novo.projeto}>{#each projetos as p (p)}<option>{p}</option>{/each}</select>
				<input type="date" bind:value={novo.prazo} />
				<select bind:value={novo.prioridade}><option value="0">sem prioridade</option><option value="1">baixa</option><option value="2">média</option><option value="3">alta</option></select>
			</div>
			<button class="primario">Criar</button>
		</form>
	{/if}

	<footer>
		{#each ['Hoje', 'Projetos', 'Filtros', 'Mais'] as const as a (a)}
			<button class:ativo={aba === a && !aberta} onclick={() => { aba = a; if (aberta) abrir(null); }}>
				<span>{({ Hoje: '☀', Projetos: '▦', Filtros: '⚲', Mais: '⋯' })[a]}</span>{a}
			</button>
		{/each}
	</footer>
</div>

<style>
	.app { max-width: 640px; margin: 0 auto; padding: 12px 12px 140px; }
	h2 { margin: 12px 0; }
	.pilulas { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
	.pilulas button { white-space: nowrap; border: 1px solid var(--borda); background: var(--painel); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
	.pilulas .ativo { background: var(--realce); color: #fff; border-color: var(--realce); }
	.card { display: flex; gap: 10px; align-items: flex-start; background: var(--painel); border: 1px solid var(--borda); border-left: 4px solid; border-radius: 10px; padding: 10px; margin-bottom: 8px; }
	.card input { margin-top: 3px; transform: scale(1.3); }
	.card.feita .titulo { text-decoration: line-through; color: var(--suave); }
	.corpo { flex: 1; display: flex; flex-direction: column; gap: 2px; text-align: left; background: none; border: 0; padding: 0; cursor: pointer; min-width: 0; }
	.titulo { font-size: 15px; }
	.meta { font-size: 12px; color: var(--suave); }
	.atrasada { color: var(--erro); }
	.esqueleto { height: 44px; opacity: 0.5; animation: pulso 1s infinite alternate; }
	@keyframes pulso { to { opacity: 0.15; } }
	.vazio { text-align: center; color: var(--suave); padding: 50px 0; }
	.vazio button, .primario { background: var(--realce); color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; cursor: pointer; }
	.erro { color: var(--erro); background: color-mix(in srgb, var(--erro) 10%, transparent); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; }
	.erro button { background: none; border: 0; }
	.item { display: flex; justify-content: space-between; width: 100%; padding: 14px 8px; background: none; border: 0; border-bottom: 1px solid var(--borda); cursor: pointer; font-size: 15px; }
	.fab { position: fixed; right: max(20px, calc(50% - 300px)); bottom: 80px; width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--realce); color: #fff; font-size: 28px; box-shadow: 0 4px 12px #0004; cursor: pointer; }
	.veu { position: fixed; inset: 0; background: #0006; border: 0; z-index: 40; }
	.folha { position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: min(640px, 100%); box-sizing: border-box; z-index: 41; background: var(--painel); border-radius: 16px 16px 0 0; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
	.folha input, .folha select { padding: 8px; border: 1px solid var(--borda); border-radius: 8px; background: var(--fundo); color: inherit; }
	.folha .linha { display: flex; gap: 8px; flex-wrap: wrap; }
	footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; background: var(--painel); border-top: 1px solid var(--borda); padding-bottom: 44px; }
	footer button { flex: 0 1 160px; display: flex; flex-direction: column; align-items: center; background: none; border: 0; padding: 8px; font-size: 11px; color: var(--suave); cursor: pointer; }
	footer button span { font-size: 20px; }
	footer .ativo { color: var(--realce); }
	article .voltar { background: none; border: 0; color: var(--realce); cursor: pointer; padding: 0; font-size: 15px; }
	.grande { display: flex; gap: 10px; font-size: 22px; font-weight: 600; margin: 12px 0; }
	.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
	.chips span { border: 1px solid var(--borda); border-radius: 999px; padding: 3px 10px; font-size: 13px; }
	.editor { border: 1px solid var(--borda); border-radius: 8px; padding: 12px; min-height: 100px; background: var(--painel); }
	@media (min-width: 721px) {
		footer { top: 0; bottom: auto; border-top: 0; border-bottom: 1px solid var(--borda); padding-bottom: 0; }
		footer button { flex-direction: row; gap: 6px; font-size: 13px; }
		footer button span { font-size: 16px; }
		.app { padding-top: 60px; }
		.fab { bottom: 60px; }
	}
</style>
