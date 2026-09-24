<script lang="ts">
	import { navigating, page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CheckFeita from '$lib/components/tarefa/CheckFeita.svelte';
	import { linkTarefa } from '$lib/components/tarefa/linkTarefa';
	import { formatarPrazo } from '$lib/prazo';
	import type { Linha } from '$lib/server/filtro';

	let { data } = $props();

	// Páginas seguintes somam à primeira (SSR). Trocar de lista zera tudo.
	let mais = $state<Linha[]>([]);
	let cursor = $state<string | null>(null);
	let carregando = $state(false);
	let erro = $state(false);
	$effect.pre(() => {
		cursor = data.cursor;
		mais = [];
		erro = false;
	});
	const tarefas = $derived([...data.tarefas, ...mais]);
	// Faixa de cor da prioridade: 0 sem, 1 baixa … 5 agora (CONTEXT.md)
	const COR = ['', 'bg-sky-400', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-600', 'bg-red-600'];

	// Criação rápida (#14): no projeto da URL, ou no primeiro projeto ativo.
	const projetoAtual = $derived.by(() => {
		const q = page.url.searchParams.get('projeto');
		if (q && /^\d+$/.test(q)) return +q;
		return (data.projetos as { id: number; archived: number }[]).find((p) => !p.archived)?.id ?? null;
	});
	let novoTitulo = $state('');
	let novaData = $state('');
	let criando = $state(false);
	let erroCriar = $state(false);

	async function criarRapida(e: SubmitEvent) {
		e.preventDefault();
		const titulo = novoTitulo.trim();
		if (!titulo || !projetoAtual || criando) return;
		criando = true;
		erroCriar = false;
		try {
			const r = await fetch('/api/tarefas', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					project_id: projetoAtual,
					title: titulo,
					...(novaData ? { due_date: novaData, due_all_day: true } : {})
				})
			});
			if (!r.ok) throw new Error(String(r.status));
			novoTitulo = '';
			novaData = '';
			await invalidateAll();
		} catch {
			erroCriar = true;
		} finally {
			criando = false;
		}
	}

	async function carregarMais() {
		if (!cursor || carregando) return;
		carregando = true;
		erro = false;
		try {
			const q = new URLSearchParams(page.url.searchParams);
			q.set('cursor', cursor);
			const r = await fetch(`/api/tarefas?${q}`);
			if (!r.ok) throw new Error(String(r.status));
			const p: { tarefas: Linha[]; cursor: string | null } = await r.json();
			mais.push(...p.tarefas);
			cursor = p.cursor;
		} catch {
			erro = true; // sem retry automático (#5); o botão tenta de novo
		} finally {
			carregando = false;
		}
	}

	function sentinela(el: HTMLElement) {
		const io = new IntersectionObserver((e) => e[0].isIntersecting && !erro && carregarMais(), {
			rootMargin: '300px'
		});
		io.observe(el);
		return { destroy: () => io.disconnect() };
	}
</script>

<svelte:head><title>{data.titulo} · projMan</title></svelte:head>

<main class="mx-auto w-full max-w-4xl px-4 py-4 md:px-6">
	<h1 class="mb-3 text-xl font-semibold">{data.titulo}</h1>

	<form onsubmit={criarRapida} class="mb-4 hidden gap-2 md:flex">
		<Input bind:value={novoTitulo} placeholder="Nova tarefa" maxlength={200} class="flex-1" disabled={!projetoAtual} />
		<input type="date" bind:value={novaData} class="rounded-md border bg-background px-2 text-sm" />
		<Button type="submit" disabled={!projetoAtual || criando}>Criar</Button>
	</form>
	{#if erroCriar}<p role="alert" class="mb-3 text-sm text-destructive">Não foi possível criar a tarefa.</p>{/if}

	{#if navigating.to}
		<div class="space-y-3" aria-busy="true">
			{#each Array(8) as _, i (i)}<Skeleton class="h-6 w-full" />{/each}
		</div>
	{:else if tarefas.length === 0}
		<div class="py-16 text-center text-muted-foreground">
			<i class="bx bx-check-circle text-4xl"></i>
			<p class="mt-2">Nada em <b>{data.titulo}</b>.</p>
		</div>
	{:else}
		<ul>
			{#each tarefas as t (t.id)}
				{@const prazo = t.due_date ? formatarPrazo(t.due_date, !!t.due_all_day, page.data.tz) : null}
				<li class="flex items-center gap-2 border-b py-2 text-sm">
					<span class="h-5 w-1 shrink-0 rounded-full {COR[t.priority]}"></span>
					<CheckFeita id={t.id} feita={!!t.done} />
					<a href={linkTarefa(page.url, t.id)} class="min-w-0 flex-1 truncate hover:underline">
						{t.title}
						{#if t.mae}<span class="text-xs text-muted-foreground"> · {t.mae}</span>{/if}
					</a>
					{#if !page.url.searchParams.has('projeto')}
						<span class="hidden text-xs text-muted-foreground sm:inline">{t.projeto}</span>
					{/if}
					{#if prazo}
						<span class="whitespace-nowrap text-xs {prazo.atrasada ? 'font-semibold text-destructive' : 'text-muted-foreground'}">
							{prazo.texto}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
		{#if erro}
			<p role="alert" class="mt-3 flex items-center gap-2 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
				<i class="bx bx-wifi-off"></i> Não foi possível carregar mais tarefas.
				<Button variant="outline" size="sm" class="ml-auto" onclick={carregarMais}>Tentar de novo</Button>
			</p>
		{:else if cursor}
			<div use:sentinela class="py-3">
				{#if carregando}<Skeleton class="h-6 w-full" />{/if}
			</div>
		{/if}
	{/if}
</main>
