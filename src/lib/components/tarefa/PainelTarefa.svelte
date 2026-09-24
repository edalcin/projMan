<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { partesLocais, type RepeatUnit } from '$lib/datas';
	import type { TarefaDetalhe } from '$lib/server/tarefas';
	import CheckFeita from './CheckFeita.svelte';
	import EditorRico from './EditorRico.svelte';
	import ComentariosAnexos from './ComentariosAnexos.svelte';

	const PRIORIDADES = ['Sem prioridade', 'Baixa', 'Média', 'Alta', 'Urgente', 'Agora'];
	const UNIDADES: { valor: RepeatUnit; nome: string }[] = [
		{ valor: 'day', nome: 'dia(s)' },
		{ valor: 'week', nome: 'semana(s)' },
		{ valor: 'month', nome: 'mês(es)' },
		{ valor: 'year', nome: 'ano(s)' }
	];

	type LabelOpcao = { id: number; title: string; hex_color: string | null };

	const tarefaId = $derived.by(() => {
		const v = page.url.searchParams.get('tarefa');
		const n = Number(v);
		return v && Number.isInteger(n) && n > 0 ? n : null;
	});
	const tz = $derived(page.data.tz as string);

	let t = $state<TarefaDetalhe | null>(null);
	let idAtual = $state<number | null>(null);
	let carregando = $state(false);
	let erroCarregar = $state(false);
	let erroSalvar = $state(false);
	let apagarAberto = $state(false);
	let novaSubtarefa = $state('');
	let labelsDisponiveis = $state<LabelOpcao[]>([]);

	// campos editáveis, sincronizados só quando a tarefa carregada muda de fato
	let tituloEdit = $state('');
	let diaInteiro = $state(true);
	let dataStr = $state('');
	let horaStr = $state('');
	let prioridade = $state(0);
	let projetoId = $state<number | null>(null);
	let repeatEvery = $state<number | null>(null);
	let repeatUnit = $state<RepeatUnit | null>(null);
	let labelsSel = $state<number[]>([]);

	$effect(() => {
		fetch('/api/labels')
			.then((r) => r.json())
			.then((l: LabelOpcao[]) => (labelsDisponiveis = l))
			.catch(() => {});
	});

	$effect(() => {
		const id = tarefaId;
		if (id === null) {
			t = null;
			idAtual = null;
			return;
		}
		carregando = true;
		erroCarregar = false;
		fetch(`/api/tarefas/${id}`)
			.then((r) => {
				if (!r.ok) throw new Error(String(r.status));
				return r.json();
			})
			.then((d: TarefaDetalhe) => (t = d))
			.catch(() => (erroCarregar = true))
			.finally(() => (carregando = false));
	});

	$effect(() => {
		if (!t || t.id === idAtual) return;
		idAtual = t.id;
		tituloEdit = t.title;
		diaInteiro = !!t.due_all_day;
		if (t.due_date) {
			const p = partesLocais(Date.parse(t.due_date), tz);
			dataStr = `${p.ano}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
			horaStr = `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
		} else {
			dataStr = '';
			horaStr = '';
		}
		prioridade = t.priority;
		projetoId = t.project_id;
		repeatEvery = t.repeat_every;
		repeatUnit = t.repeat_unit;
		labelsSel = [...t.labels];
	});

	function fechar() {
		const u = new URL(page.url);
		u.searchParams.delete('tarefa');
		goto(u.pathname + u.search, { noScroll: true, keepFocus: true });
	}

	async function recarregar() {
		if (tarefaId === null) return;
		const r = await fetch(`/api/tarefas/${tarefaId}`);
		if (r.ok) t = await r.json();
	}

	async function salvar(campos: Record<string, unknown>) {
		if (!t) return;
		erroSalvar = false;
		try {
			const r = await fetch(`/api/tarefas/${t.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(campos)
			});
			if (!r.ok) throw new Error(String(r.status));
			await invalidateAll();
		} catch {
			erroSalvar = true;
			await recarregar();
		}
	}

	function salvarTitulo() {
		const v = tituloEdit.trim();
		if (v) salvar({ title: v });
		else if (t) tituloEdit = t.title;
	}

	function payloadPrazo(): { due_date: string | null; due_all_day: boolean } {
		if (!dataStr) return { due_date: null, due_all_day: true };
		if (diaInteiro) return { due_date: dataStr, due_all_day: true };
		return { due_date: new Date(`${dataStr}T${horaStr || '00:00'}:00`).toISOString(), due_all_day: false };
	}
	function salvarPrazo() {
		salvar(payloadPrazo());
	}

	function salvarPrioridade() {
		salvar({ priority: Number(prioridade) });
	}

	function toggleLabel(id: number) {
		labelsSel = labelsSel.includes(id) ? labelsSel.filter((x) => x !== id) : [...labelsSel, id];
		salvar({ labels: labelsSel });
	}

	function adicionarRecorrencia() {
		repeatEvery = 1;
		repeatUnit = 'day';
		salvar({ repeat_every: 1, repeat_unit: 'day' });
	}
	function removerRecorrencia() {
		repeatEvery = null;
		repeatUnit = null;
		salvar({ repeat_every: null, repeat_unit: null });
	}
	function salvarRecorrencia() {
		if (repeatEvery && repeatUnit) salvar({ repeat_every: Number(repeatEvery), repeat_unit: repeatUnit });
	}

	function salvarProjeto() {
		if (projetoId !== null) salvar({ project_id: projetoId });
	}

	async function criarSubtarefa(e: SubmitEvent) {
		e.preventDefault();
		const titulo = novaSubtarefa.trim();
		if (!t || !titulo) return;
		erroSalvar = false;
		try {
			const r = await fetch('/api/tarefas', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ project_id: t.project_id, title: titulo, parent_task_id: t.id })
			});
			if (!r.ok) throw new Error(String(r.status));
			novaSubtarefa = '';
			await recarregar();
			await invalidateAll();
		} catch {
			erroSalvar = true;
		}
	}

	async function apagar() {
		if (!t) return;
		erroSalvar = false;
		try {
			const r = await fetch(`/api/tarefas/${t.id}`, { method: 'DELETE' });
			if (!r.ok) throw new Error(String(r.status));
			apagarAberto = false;
			await invalidateAll();
			fechar();
		} catch {
			erroSalvar = true;
			apagarAberto = false;
		}
	}
</script>

{#if tarefaId !== null}
	<div class="fixed inset-0 z-40 bg-black/40 md:hidden" onclick={fechar} aria-hidden="true"></div>
	<aside class="fixed inset-0 z-50 flex w-full flex-col overflow-y-auto border-l bg-background md:inset-y-0 md:right-0 md:left-auto md:w-[380px]">
		<header class="flex items-center gap-2 border-b p-3">
			<Button variant="ghost" size="icon" onclick={fechar} aria-label="Fechar"><i class="bx bx-x text-lg"></i></Button>
			<span class="font-semibold">Tarefa</span>
			{#if t}
				<Button variant="ghost" size="icon" class="ml-auto text-destructive" onclick={() => (apagarAberto = true)} aria-label="Apagar tarefa">
					<i class="bx bx-trash"></i>
				</Button>
			{/if}
		</header>

		{#if erroSalvar}
			<p role="alert" class="border-b border-destructive px-3 py-2 text-sm text-destructive">Não foi possível salvar. Tente de novo.</p>
		{/if}

		{#if carregando && !t}
			<div class="space-y-3 p-4" aria-busy="true">
				<Skeleton class="h-8 w-full" />
				<Skeleton class="h-6 w-full" />
				<Skeleton class="h-6 w-full" />
				<Skeleton class="h-24 w-full" />
			</div>
		{:else if erroCarregar}
			<p class="p-4 text-sm text-destructive">Não foi possível carregar a tarefa.</p>
		{:else if t}
			<div class="flex-1 space-y-4 p-4">
				<div class="flex items-center gap-2">
					<CheckFeita id={t.id} feita={!!t.done} onSaved={recarregar} />
					<input
						class="flex-1 border-b bg-transparent text-base font-medium outline-none focus:border-primary"
						bind:value={tituloEdit}
						onblur={salvarTitulo}
						maxlength={200}
						aria-label="Título da tarefa"
					/>
				</div>
				{#if t.mae}<p class="text-xs text-muted-foreground">Subtarefa de {t.mae}</p>{/if}

				<div>
					<Label class="mb-1 block text-xs text-muted-foreground">Prazo</Label>
					<div class="flex flex-wrap items-center gap-2">
						<Input type="date" class="w-auto" bind:value={dataStr} onchange={salvarPrazo} />
						{#if dataStr}
							{#if !diaInteiro}
								<Input type="time" class="w-auto" bind:value={horaStr} onchange={salvarPrazo} />
							{/if}
							<label class="flex items-center gap-1 text-xs">
								<Checkbox
									checked={diaInteiro}
									onCheckedChange={(v) => {
										diaInteiro = !!v;
										salvarPrazo();
									}}
								/>
								Dia inteiro
							</label>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Remover prazo"
								onclick={() => {
									dataStr = '';
									horaStr = '';
									salvarPrazo();
								}}><i class="bx bx-x"></i></Button
							>
						{/if}
					</div>
				</div>

				<div>
					<Label class="mb-1 block text-xs text-muted-foreground">Prioridade</Label>
					<select bind:value={prioridade} onchange={salvarPrioridade} class="w-full rounded-md border bg-background px-2 py-2 text-sm">
						{#each PRIORIDADES as nome, i (i)}<option value={i}>{nome}</option>{/each}
					</select>
				</div>

				<div>
					<Label class="mb-1 block text-xs text-muted-foreground">Labels</Label>
					<div class="flex flex-wrap gap-2">
						{#each labelsDisponiveis as l (l.id)}
							<label class="flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
								<Checkbox checked={labelsSel.includes(l.id)} onCheckedChange={() => toggleLabel(l.id)} />
								<span class="size-2 rounded-full" style="background:#{l.hex_color ?? '9ca3af'}"></span>
								{l.title}
							</label>
						{:else}
							<span class="text-xs text-muted-foreground">Nenhuma label ainda.</span>
						{/each}
					</div>
				</div>

				<div>
					<Label class="mb-1 block text-xs text-muted-foreground">Recorrência</Label>
					{#if repeatEvery && repeatUnit}
						<div class="flex items-center gap-2">
							<Input type="number" min="1" class="w-16" bind:value={repeatEvery} onchange={salvarRecorrencia} />
							<select bind:value={repeatUnit} onchange={salvarRecorrencia} class="rounded-md border bg-background px-2 py-2 text-sm">
								{#each UNIDADES as u (u.valor)}<option value={u.valor}>{u.nome}</option>{/each}
							</select>
							<Button variant="ghost" size="icon-sm" aria-label="Remover recorrência" onclick={removerRecorrencia}><i class="bx bx-x"></i></Button>
						</div>
					{:else}
						<Button variant="outline" size="sm" onclick={adicionarRecorrencia}><i class="bx bx-repeat"></i> Repetir</Button>
					{/if}
				</div>

				<div>
					<Label class="mb-1 block text-xs text-muted-foreground">Projeto</Label>
					<select bind:value={projetoId} onchange={salvarProjeto} class="w-full rounded-md border bg-background px-2 py-2 text-sm">
						{#each page.data.projetos as p (p.id)}
							<option value={p.id}>{p.title}{p.archived ? ' (arquivado)' : ''}</option>
						{/each}
					</select>
				</div>

				<div>
					<Label class="mb-1 block text-xs text-muted-foreground">Descrição</Label>
					{#key t.id}
						<EditorRico valor={t.description} placeholder="Sem descrição." onSalvar={(html) => salvar({ description: html })} />
					{/key}
				</div>

				{#if !t.parent_task_id}
					<div>
						<Label class="mb-1 block text-xs text-muted-foreground">Subtarefas</Label>
						<ul class="space-y-1">
							{#each t.subtarefas as s (s.id)}
								<li class="flex items-center gap-2 text-sm">
									<CheckFeita id={s.id} feita={!!s.done} onSaved={recarregar} />
									<span class:text-muted-foreground={s.done} class:line-through={s.done}>{s.title}</span>
								</li>
							{:else}
								<li class="text-xs text-muted-foreground">Nenhuma subtarefa ainda.</li>
							{/each}
						</ul>
						<form class="mt-2 flex gap-2" onsubmit={criarSubtarefa}>
							<Input bind:value={novaSubtarefa} placeholder="Nova subtarefa" maxlength={200} class="flex-1" />
							<Button type="submit" size="sm">Adicionar</Button>
						</form>
					</div>
				{/if}

				{#key t.id}<ComentariosAnexos tarefaId={t.id} />{/key}
			</div>
		{/if}
	</aside>
{/if}

<AlertDialog.Root bind:open={apagarAberto}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Apagar tarefa?</AlertDialog.Title>
			<AlertDialog.Description>"{t?.title}" será apagada, com subtarefas. Não tem volta.</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action onclick={apagar}>Apagar</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
