<script lang="ts">
	import type { Filtro } from '$lib/server/filtro';

	type Props = {
		projetos: { id: number; title: string }[];
		labels: { id: number; title: string }[];
		valor?: { title: string; filtro: Filtro };
	};
	let { projetos, labels, valor }: Props = $props();
	const f = valor?.filtro;

	let nenhuma = $state(f?.labels?.nenhuma === true);
	let prazoTipo = $state<string>(f?.prazo?.tipo ?? '');
	const prazoDiasInicial = f?.prazo?.tipo === 'proximos' ? f.prazo.dias : 7;

	const labelValor = (id: number): '' | 'in' | 'notIn' =>
		f?.labels?.in?.includes(id) ? 'in' : f?.labels?.notIn?.includes(id) ? 'notIn' : '';

	const campo = 'h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<div class="space-y-5">
	<div>
		<label for="title" class="mb-1 block text-sm font-medium">Nome</label>
		<input id="title" name="title" required maxlength="200" value={valor?.title ?? ''} class={campo} />
	</div>

	<p class="text-xs text-muted-foreground">Todas as condições valem juntas (E).</p>

	<fieldset>
		<legend class="mb-1 text-sm font-medium">Estado</legend>
		<div class="flex gap-4 text-sm">
			{#each [['abertas', 'Abertas'], ['feitas', 'Feitas'], ['todas', 'Todas']] as [v, nome] (v)}
				<label class="flex items-center gap-1.5">
					<input type="radio" name="estado" value={v} checked={(f?.estado ?? 'abertas') === v} class="accent-foreground" />
					{nome}
				</label>
			{/each}
		</div>
	</fieldset>

	<div>
		<label for="projetos" class="mb-1 block text-sm font-medium">Projetos</label>
		<select id="projetos" name="projetos" multiple size={Math.min(Math.max(projetos.length, 1), 5)} class="w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm outline-none">
			{#each projetos as p (p.id)}
				<option value={p.id} selected={f?.projetos?.includes(p.id) ?? false}>{p.title}</option>
			{/each}
		</select>
		<p class="mt-1 text-xs text-muted-foreground">Nenhum selecionado = qualquer projeto. Ctrl/Cmd+clique para vários.</p>
	</div>

	<fieldset>
		<legend class="mb-1 text-sm font-medium">Labels</legend>
		<label class="mb-2 flex items-center gap-1.5 text-sm">
			<input type="checkbox" name="labels_nenhuma" value="1" bind:checked={nenhuma} class="accent-foreground" />
			Sem label alguma
		</label>
		<ul class="space-y-1.5">
			{#each labels as l (l.id)}
				<li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
					<span>{l.title}</span>
					<div class="flex gap-3">
						{#each [['', 'Qualquer'], ['in', 'Tem'], ['notIn', 'Não tem']] as [v, nome] (v)}
							<label class="flex items-center gap-1" class:opacity-50={nenhuma}>
								<input type="radio" name="label_{l.id}" value={v} checked={labelValor(l.id) === v} disabled={nenhuma} class="accent-foreground" />
								{nome}
							</label>
						{/each}
					</div>
				</li>
			{:else}
				<li class="text-xs text-muted-foreground">Nenhuma label ainda.</li>
			{/each}
		</ul>
	</fieldset>

	<div>
		<label for="prioridadeMin" class="mb-1 block text-sm font-medium">Prioridade mínima</label>
		<select id="prioridadeMin" name="prioridadeMin" class={campo}>
			<option value="" selected={!f?.prioridadeMin}>Qualquer</option>
			{#each [[1, 'Baixa'], [2, 'Média'], [3, 'Alta'], [4, 'Urgente'], [5, 'Agora']] as [v, nome] (v)}
				<option value={v} selected={f?.prioridadeMin === v}>{nome}+</option>
			{/each}
		</select>
	</div>

	<fieldset>
		<legend class="mb-1 text-sm font-medium">Prazo</legend>
		<div class="flex flex-wrap gap-4 text-sm">
			{#each [['', 'Qualquer'], ['atrasadas', 'Atrasadas'], ['hoje', 'Hoje'], ['proximos', 'Próximos dias'], ['sem', 'Sem prazo']] as [v, nome] (v)}
				<label class="flex items-center gap-1.5">
					<input type="radio" name="prazoTipo" value={v} bind:group={prazoTipo} class="accent-foreground" />
					{nome}
				</label>
			{/each}
		</div>
		{#if prazoTipo === 'proximos'}
			<label class="mt-2 flex items-center gap-2 text-sm">
				dias:
				<input type="number" name="prazoDias" min="1" max="366" value={prazoDiasInicial} class="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm outline-none" />
			</label>
		{/if}
	</fieldset>

	<div>
		<label for="criadaHaMaisDe" class="mb-1 block text-sm font-medium">Criada há mais de (dias)</label>
		<input id="criadaHaMaisDe" name="criadaHaMaisDe" type="number" min="1" max="3650" value={f?.criadaHaMaisDe ?? ''} class="h-9 w-32 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm outline-none" />
	</div>

	<div>
		<label for="texto" class="mb-1 block text-sm font-medium">Texto</label>
		<input id="texto" name="texto" maxlength="200" value={f?.texto ?? ''} class={campo} />
	</div>
</div>
