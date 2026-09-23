<script lang="ts">
	// PROTÓTIPO #14 — Variante C: densa. Sem sidebar: barra superior com seletor
	// de lista/projeto e abas das smart lists. Linha única em colunas, estilo
	// planilha. Detalhe em modal (<dialog>, com ?tarefa=). Criação rápida fixa no rodapé.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { alternar, corPrioridade, criar, daLista, filtros, projetos, smartLists, tarefas } from './dados.svelte';
	import Sentinela from './Sentinela.svelte';

	let { estado, escuro = $bindable() }: { estado: string; escuro: boolean } = $props();
	let lista = $state('Hoje');
	let limite = $state(40);
	let erro = $state<string | null>(null);
	let novo = $state('');
	let novoPrazo = $state('');
	let dialogo: HTMLDialogElement;

	const itens = $derived(estado === 'vazio' ? [] : daLista(lista));
	const abertaId = $derived(Number(page.url.searchParams.get('tarefa')) || null);
	const aberta = $derived(tarefas.find((t) => t.id === abertaId));

	$effect(() => {
		if (aberta && !dialogo.open) dialogo.showModal();
		if (!aberta && dialogo.open) dialogo.close();
	});
	function abrir(id: number | null) {
		const u = new URL(page.url);
		if (id) u.searchParams.set('tarefa', String(id));
		else u.searchParams.delete('tarefa');
		goto(u, { keepFocus: true, noScroll: true });
	}
	function enviar(e: SubmitEvent) {
		e.preventDefault();
		if (!novo.trim()) return;
		erro = criar(novo.trim(), projetos.includes(lista) ? lista : 'Casa', novoPrazo || null, estado);
		if (!erro) novo = novoPrazo = '';
	}
</script>

<header>
	<b>projMan</b>
	<select bind:value={lista} onchange={() => (limite = 40)}>
		<optgroup label="Listas">{#each smartLists as l (l)}<option>{l}</option>{/each}</optgroup>
		<optgroup label="Projetos">{#each projetos as p (p)}<option>{p}</option>{/each}</optgroup>
		<optgroup label="Filtros salvos">{#each filtros as f (f)}<option>{f}</option>{/each}</optgroup>
	</select>
	<nav>
		{#each smartLists.slice(0, 3) as l (l)}<button class:ativo={lista === l} onclick={() => (lista = l)}>{l}</button>{/each}
	</nav>
	<input class="busca" placeholder="Buscar…" />
	<button onclick={() => (escuro = !escuro)} aria-label="Tema">{escuro ? '☀' : '☾'}</button>
</header>

{#if erro}<p class="erro" role="alert">{erro} <button onclick={() => (erro = null)}>×</button></p>{/if}

<table>
	<thead><tr><th></th><th>Título</th><th class="m">Projeto</th><th class="m">Labels</th><th class="m">Sub</th><th>Prazo</th></tr></thead>
	<tbody>
		{#if estado === 'carregando'}
			{#each Array(12) as _, i (i)}<tr><td colspan="6"><div class="esqueleto"></div></td></tr>{/each}
		{:else if itens.length === 0}
			<tr><td colspan="6" class="vazio">Nenhuma tarefa em {lista}. Use a linha abaixo para criar.</td></tr>
		{:else}
			{#each itens.slice(0, limite) as t (t.id)}
				<tr class:feita={t.feita} class:selecionada={t.id === abertaId}>
					<td style="box-shadow: inset 3px 0 {corPrioridade[t.prioridade]}"><input type="checkbox" checked={t.feita} onchange={(e) => { erro = alternar(t, estado); if (erro) e.currentTarget.checked = t.feita; }} /></td>
					<td><button class="titulo" onclick={() => abrir(t.id)}>{t.titulo}</button></td>
					<td class="m">{t.projeto}</td>
					<td class="m">{t.labels.join(', ')}</td>
					<td class="m">{t.sub ? `${t.sub[0]}/${t.sub[1]}` : ''}</td>
					<td class:atrasada={t.atrasada}>{t.prazo ?? ''}</td>
				</tr>
			{/each}
		{/if}
	</tbody>
</table>
{#if limite < itens.length}<Sentinela mais={() => (limite += 40)} />{/if}

<form class="rapida" onsubmit={enviar}>
	<input bind:value={novo} placeholder="+ Nova tarefa em {projetos.includes(lista) ? lista : 'Casa'}" />
	<input type="date" bind:value={novoPrazo} aria-label="Prazo" />
	<button>Criar ⏎</button>
</form>

<dialog bind:this={dialogo} onclose={() => aberta && abrir(null)}>
	{#if aberta}
		<button class="fechar" onclick={() => dialogo.close()}>✕</button>
		<h2>{aberta.titulo}</h2>
		<div class="grade">
			<div>
				<div class="editor">{aberta.descricao || 'Sem descrição. (TipTap aqui)'}</div>
				<h3>Subtarefas</h3><p>{aberta.sub ? `${aberta.sub[0]} de ${aberta.sub[1]}` : 'Nenhuma'}</p>
				<h3>Comentários</h3><p>—</p>
			</div>
			<dl>
				<dt>Projeto</dt><dd>{aberta.projeto}</dd>
				<dt>Prazo</dt><dd>{aberta.prazo ?? '—'}</dd>
				<dt>Prioridade</dt><dd>{aberta.prioridade}</dd>
				<dt>Labels</dt><dd>{aberta.labels.join(', ') || '—'}</dd>
				<dt>Anexos</dt><dd>—</dd>
			</dl>
		</div>
	{/if}
</dialog>

<style>
	header { position: sticky; top: 0; z-index: 5; display: flex; gap: 10px; align-items: center; padding: 6px 12px; background: var(--painel); border-bottom: 1px solid var(--borda); }
	header select, .busca, header > button { padding: 4px 8px; border: 1px solid var(--borda); border-radius: 4px; background: var(--fundo); color: inherit; }
	.busca { margin-left: auto; width: 160px; }
	nav { display: flex; gap: 2px; }
	nav button { background: none; border: 0; padding: 4px 8px; border-bottom: 2px solid transparent; cursor: pointer; }
	nav .ativo { border-color: var(--realce); color: var(--realce); }
	table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 110px; }
	th { text-align: left; font-weight: 500; color: var(--suave); font-size: 11px; text-transform: uppercase; padding: 4px 8px; border-bottom: 1px solid var(--borda); position: sticky; top: 37px; background: var(--fundo); }
	td { padding: 3px 8px; border-bottom: 1px solid var(--borda); white-space: nowrap; }
	tr:hover td { background: color-mix(in srgb, var(--realce) 6%, transparent); }
	tr.selecionada td { background: color-mix(in srgb, var(--realce) 14%, transparent); }
	tr.feita .titulo { text-decoration: line-through; color: var(--suave); }
	.titulo { background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
	.m { color: var(--suave); }
	.atrasada { color: var(--erro); font-weight: 600; }
	.vazio { text-align: center; color: var(--suave); padding: 40px; }
	.esqueleto { height: 14px; background: var(--borda); border-radius: 3px; animation: pulso 1s infinite alternate; }
	@keyframes pulso { to { opacity: 0.3; } }
	.erro { margin: 6px 12px; color: var(--erro); border: 1px solid var(--erro); padding: 4px 8px; border-radius: 4px; display: flex; justify-content: space-between; }
	.erro button { background: none; border: 0; }
	.rapida { position: fixed; bottom: 56px; left: 12px; right: 12px; display: flex; gap: 6px; background: var(--painel); border: 1px solid var(--borda); border-radius: 6px; padding: 6px; box-shadow: 0 2px 8px #0002; }
	.rapida input { padding: 6px; border: 0; background: none; color: inherit; }
	.rapida input:first-child { flex: 1; }
	.rapida button { background: var(--realce); color: #fff; border: 0; border-radius: 4px; padding: 0 12px; }
	dialog { width: min(820px, 92vw); border: 1px solid var(--borda); border-radius: 10px; background: var(--painel); color: var(--texto); padding: 20px; }
	dialog::backdrop { background: #0007; }
	.fechar { float: right; background: none; border: 0; cursor: pointer; font-size: 16px; }
	.grade { display: grid; grid-template-columns: 1fr 200px; gap: 20px; }
	.editor { border: 1px solid var(--borda); border-radius: 6px; padding: 10px; min-height: 120px; }
	dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; margin: 0; align-content: start; }
	dt { color: var(--suave); }
	dd { margin: 0; }
	@media (max-width: 720px) {
		.m, nav, .busca { display: none; }
		dialog { width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; border-radius: 0; box-sizing: border-box; }
		.grade { grid-template-columns: 1fr; }
	}
</style>
