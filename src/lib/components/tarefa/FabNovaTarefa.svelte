<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';

	const PRIORIDADES = ['Sem prioridade', 'Baixa', 'Média', 'Alta', 'Urgente', 'Agora'];

	// Só na página do grupo (app) faz sentido oferecer criação rápida.
	const ativos = $derived((page.data.projetos ?? []).filter((p: { archived: number }) => !p.archived));
	const projetoAtual = $derived.by(() => {
		const q = page.url.pathname.match(/^\/projeto\/(\d+)/)?.[1] ?? page.url.searchParams.get('projeto');
		if (q && /^\d+$/.test(q)) return +q;
		return ativos[0]?.id ?? null;
	});

	let aberta = $state(false);
	let titulo = $state('');
	let projetoId = $state<number | null>(null);
	let data = $state('');
	let prioridade = $state(0);
	let criando = $state(false);
	let erro = $state(false);

	$effect(() => {
		if (aberta) projetoId = projetoAtual;
	});

	async function criar(e: SubmitEvent) {
		e.preventDefault();
		const t = titulo.trim();
		if (!t || !projetoId || criando) return;
		criando = true;
		erro = false;
		try {
			const r = await fetch('/api/tarefas', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					project_id: projetoId,
					title: t,
					priority: prioridade,
					...(data ? { due_date: data, due_all_day: true } : {})
				})
			});
			if (!r.ok) throw new Error(String(r.status));
			titulo = '';
			data = '';
			prioridade = 0;
			aberta = false;
			await invalidateAll();
		} catch {
			erro = true;
		} finally {
			criando = false;
		}
	}
</script>

<Button size="icon" class="fixed right-4 bottom-4 z-30 size-12 rounded-full shadow-lg md:hidden" onclick={() => (aberta = true)} aria-label="Nova tarefa">
	<i class="bx bx-plus text-xl"></i>
</Button>

<Sheet.Root bind:open={aberta}>
	<Sheet.Content side="bottom">
		<Sheet.Header><Sheet.Title>Nova tarefa</Sheet.Title></Sheet.Header>
		<form onsubmit={criar} class="space-y-3 px-4 pb-4">
			{#if erro}<p role="alert" class="text-sm text-destructive">Não foi possível criar a tarefa.</p>{/if}
			<div>
				<Label class="mb-1 block text-xs text-muted-foreground">Título</Label>
				<Input bind:value={titulo} maxlength={200} required autofocus />
			</div>
			<div>
				<Label class="mb-1 block text-xs text-muted-foreground">Projeto</Label>
				<select bind:value={projetoId} class="w-full rounded-md border bg-background px-2 py-2 text-sm">
					{#each ativos as p (p.id)}<option value={p.id}>{p.title}</option>{/each}
				</select>
			</div>
			<div>
				<Label class="mb-1 block text-xs text-muted-foreground">Prazo</Label>
				<Input type="date" bind:value={data} />
			</div>
			<div>
				<Label class="mb-1 block text-xs text-muted-foreground">Prioridade</Label>
				<select bind:value={prioridade} class="w-full rounded-md border bg-background px-2 py-2 text-sm">
					{#each PRIORIDADES as nome, i (i)}<option value={i}>{nome}</option>{/each}
				</select>
			</div>
			<Button type="submit" class="w-full" disabled={!projetoId || criando}>Criar</Button>
		</form>
	</Sheet.Content>
</Sheet.Root>
