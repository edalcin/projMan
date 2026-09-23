<script lang="ts">
	// PROTÓTIPO #14 — Variante A: sidebar fixa (drawer no celular), lista no centro,
	// detalhe em painel lateral com URL (?tarefa=). Criação rápida no topo da lista.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { alternar, corPrioridade, criar, daLista, filtros, projetos, smartLists, tarefas } from './dados.svelte';
	import Sentinela from './Sentinela.svelte';

	let { estado, escuro = $bindable() }: { estado: string; escuro: boolean } = $props();
	let lista = $state('Hoje');
	let drawer = $state(false);
	let limite = $state(30);
	let erro = $state<string | null>(null);
	let novo = $state('');
	let novoPrazo = $state('');

	const itens = $derived(estado === 'vazio' ? [] : daLista(lista));
	const abertaId = $derived(Number(page.url.searchParams.get('tarefa')) || null);
	const aberta = $derived(tarefas.find((t) => t.id === abertaId));

	function abrir(id: number | null) {
		const u = new URL(page.url);
		if (id) u.searchParams.set('tarefa', String(id));
		else u.searchParams.delete('tarefa');
		goto(u, { keepFocus: true, noScroll: true });
	}
	function escolher(l: string) {
		lista = l;
		limite = 30;
		drawer = false;
	}
	function enviar(e: SubmitEvent) {
		e.preventDefault();
		if (!novo.trim()) return;
		erro = criar(novo.trim(), projetos.includes(lista) ? lista : 'Casa', novoPrazo || null, estado);
		if (!erro) novo = novoPrazo = '';
	}
</script>

<div class="shell" class:com-detalhe={aberta}>
	<button class="hamburguer" onclick={() => (drawer = true)} aria-label="Menu">☰</button>
	{#if drawer}<button class="veu" aria-label="Fechar menu" onclick={() => (drawer = false)}></button>{/if}

	<nav class:aberto={drawer}>
		<h1>projMan</h1>
		<h2>Listas</h2>
		{#each smartLists as l (l)}
			<button class:ativo={lista === l} onclick={() => escolher(l)}>{l}</button>
		{/each}
		<h2>Projetos</h2>
		{#each projetos as p (p)}
			<button class:ativo={lista === p} onclick={() => escolher(p)}># {p}</button>
		{/each}
		<h2>Filtros salvos</h2>
		{#each filtros as f (f)}<button>⚲ {f}</button>{/each}
		<button class="tema" onclick={() => (escuro = !escuro)}>{escuro ? '☀ Claro' : '☾ Escuro'}</button>
	</nav>

	<main>
		<header><h2>{lista}</h2></header>
		<form onsubmit={enviar}>
			<input bind:value={novo} placeholder="+ Nova tarefa em {projetos.includes(lista) ? lista : 'Casa'} (Enter)" />
			<input type="date" bind:value={novoPrazo} aria-label="Prazo" />
		</form>
		{#if erro}<p class="erro" role="alert">{erro} <button onclick={() => (erro = null)}>×</button></p>{/if}

		{#if estado === 'carregando'}
			{#each Array(8) as _, i (i)}<div class="linha esqueleto"></div>{/each}
		{:else if itens.length === 0}
			<div class="vazio">
				<p>Nada em <b>{lista}</b>.</p>
				<p>Escreva no campo acima e aperte Enter.</p>
			</div>
		{:else}
			<ul>
				{#each itens.slice(0, limite) as t (t.id)}
					<li class="linha" class:selecionada={t.id === abertaId} class:feita={t.feita}>
						<input type="checkbox" checked={t.feita} onchange={(e) => { erro = alternar(t, estado); if (erro) e.currentTarget.checked = t.feita; }} />
						<span class="prio" style="background:{corPrioridade[t.prioridade]}"></span>
						<button class="titulo" onclick={() => abrir(t.id)}>{t.titulo}</button>
						{#each t.labels as l (l)}<span class="label">{l}</span>{/each}
						{#if t.sub}<span class="meta">☑ {t.sub[0]}/{t.sub[1]}</span>{/if}
						{#if !projetos.includes(lista)}<span class="meta">{t.projeto}</span>{/if}
						{#if t.prazo}<span class="meta" class:atrasada={t.atrasada}>{t.prazo}</span>{/if}
					</li>
				{/each}
			</ul>
			{#if limite < itens.length}<Sentinela mais={() => (limite += 30)} />{/if}
		{/if}
	</main>

	{#if aberta}
		<aside>
			<button class="fechar" onclick={() => abrir(null)}>✕</button>
			<p class="meta"># {aberta.projeto}</p>
			<h2>{aberta.titulo}</h2>
			<dl>
				<dt>Prazo</dt><dd>{aberta.prazo ?? '—'}</dd>
				<dt>Prioridade</dt><dd>{aberta.prioridade}</dd>
				<dt>Labels</dt><dd>{aberta.labels.join(', ') || '—'}</dd>
			</dl>
			<div class="editor">{aberta.descricao || 'Sem descrição. (TipTap aqui)'}</div>
			<h3>Subtarefas</h3>
			<p class="meta">{aberta.sub ? `${aberta.sub[0]} de ${aberta.sub[1]}` : 'Nenhuma'}</p>
			<h3>Comentários · Anexos</h3>
			<p class="meta">—</p>
		</aside>
	{/if}
</div>

<style>
	.shell { display: grid; grid-template-columns: 230px 1fr; min-height: 100vh; }
	.shell.com-detalhe { grid-template-columns: 230px 1fr 380px; }
	nav { background: var(--painel); border-right: 1px solid var(--borda); padding: 12px; display: flex; flex-direction: column; gap: 2px; position: sticky; top: 0; height: 100vh; box-sizing: border-box; overflow: auto; }
	nav h1 { font-size: 16px; margin: 0 0 8px; }
	nav h2 { font-size: 11px; text-transform: uppercase; color: var(--suave); margin: 14px 0 4px; }
	nav button { text-align: left; background: none; border: 0; padding: 5px 8px; border-radius: 6px; cursor: pointer; }
	nav button:hover { background: var(--borda); }
	nav button.ativo { background: var(--realce); color: #fff; }
	.tema { margin-top: auto; }
	main { padding: 16px 24px 80px; min-width: 0; }
	header h2 { margin: 0 0 12px; }
	form { display: flex; gap: 8px; margin-bottom: 8px; }
	form input { padding: 8px; border: 1px solid var(--borda); border-radius: 6px; background: var(--painel); color: inherit; }
	form input:first-child { flex: 1; }
	ul { list-style: none; padding: 0; margin: 0; }
	.linha { display: flex; align-items: center; gap: 8px; padding: 7px 4px; border-bottom: 1px solid var(--borda); }
	.linha.selecionada { background: color-mix(in srgb, var(--realce) 12%, transparent); }
	.linha.feita .titulo { text-decoration: line-through; color: var(--suave); }
	.prio { width: 4px; height: 18px; border-radius: 2px; }
	.titulo { flex: 1; text-align: left; background: none; border: 0; padding: 0; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.label { font-size: 11px; padding: 1px 6px; border-radius: 999px; background: var(--borda); }
	.meta { font-size: 12px; color: var(--suave); white-space: nowrap; }
	.atrasada { color: var(--erro); font-weight: 600; }
	.esqueleto { height: 20px; background: linear-gradient(90deg, var(--borda), var(--painel), var(--borda)); background-size: 200%; animation: brilho 1.2s infinite; }
	@keyframes brilho { to { background-position: -200% 0; } }
	.vazio { text-align: center; color: var(--suave); padding: 60px 0; }
	.erro { color: var(--erro); border: 1px solid var(--erro); border-radius: 6px; padding: 6px 10px; display: flex; justify-content: space-between; }
	.erro button { background: none; border: 0; cursor: pointer; }
	aside { background: var(--painel); border-left: 1px solid var(--borda); padding: 16px; position: sticky; top: 0; height: 100vh; box-sizing: border-box; overflow: auto; }
	.fechar { float: right; background: none; border: 0; cursor: pointer; font-size: 16px; }
	dl { display: grid; grid-template-columns: 90px 1fr; gap: 4px; }
	dt { color: var(--suave); }
	dd { margin: 0; }
	.editor { border: 1px solid var(--borda); border-radius: 6px; padding: 10px; min-height: 80px; }
	.hamburguer, .veu { display: none; }

	@media (max-width: 720px) {
		.shell, .shell.com-detalhe { grid-template-columns: 1fr; }
		.hamburguer { display: block; position: fixed; top: 10px; right: 10px; z-index: 5; background: var(--painel); border: 1px solid var(--borda); border-radius: 6px; padding: 4px 10px; }
		nav { position: fixed; left: 0; top: 0; width: 260px; z-index: 20; transform: translateX(-100%); transition: transform 0.2s; }
		nav.aberto { transform: none; }
		.veu { display: block; position: fixed; inset: 0; background: #0006; z-index: 10; border: 0; }
		main { padding: 12px; }
		aside { position: fixed; inset: 0; z-index: 30; }
	}
</style>
