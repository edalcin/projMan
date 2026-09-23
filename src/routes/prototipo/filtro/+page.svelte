<script lang="ts">
	// PROTÓTIPO #15 — descartável, só na branch prototipo/15-filtro.
	// Construtor de filtro por campos (só AND). Mostra o JSON v1 ao vivo.
	const projetos = [[1, 'Herbário'], [2, 'Casa'], [3, 'projMan']] as const;
	const labels = [[1, 'herbário'], [2, 'urgente'], [3, 'campo']] as const;
	const prioridades = ['qualquer', 'baixa+', 'média+', 'alta+', 'urgente+', 'agora'];

	let estado = $state('abertas');
	let projSel = $state<number[]>([]);
	let labIn = $state<number[]>([]);
	let labNotIn = $state<number[]>([]);
	let semLabel = $state(false);
	let prioridade = $state(0);
	let prazo = $state('');
	let dias = $state(7);
	let criada = $state<number | null>(null);
	let texto = $state('');

	const json = $derived({
		v: 1,
		...(estado !== 'abertas' && { estado }),
		...(projSel.length && { projetos: projSel }),
		...((labIn.length || labNotIn.length || semLabel) && {
			labels: {
				...(labIn.length && { in: labIn }),
				...(labNotIn.length && { notIn: labNotIn }),
				...(semLabel && { nenhuma: true })
			}
		}),
		...(prioridade && { prioridadeMin: prioridade }),
		...(prazo && { prazo: prazo === 'proximos' ? { tipo: prazo, dias } : { tipo: prazo } }),
		...(texto.trim() && { texto: texto.trim() }),
		...(criada && { criadaHaMaisDe: criada })
	});

	const casos: [string, () => void][] = [
		['Abertas, 7 dias, sem label', () => { prazo = 'proximos'; dias = 7; semLabel = true; }],
		['Alta ou urgente, qualquer projeto', () => { prioridade = 3; }],
		["Label 'herbário', não feita", () => { labIn = [1]; }],
		['Sem prazo, criada há +30 dias', () => { prazo = 'sem'; criada = 30; }]
	];
	function limpar() {
		estado = 'abertas'; projSel = []; labIn = []; labNotIn = []; semLabel = false;
		prioridade = 0; prazo = ''; dias = 7; criada = null; texto = '';
	}
	const alternar = (lista: number[], id: number) =>
		lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
</script>

<main>
	<h1>Novo filtro</h1>
	<div class="casos">
		{#each casos as caso (caso[0])}<button onclick={() => { limpar(); caso[1](); }}>{caso[0]}</button>{/each}
	</div>

	<label>Nome <input placeholder="Ex.: Urgentes do herbário" /></label>

	<fieldset>
		<legend>Estado</legend>
		{#each ['abertas', 'feitas', 'todas'] as e (e)}
			<label class="chip"><input type="radio" bind:group={estado} value={e} /> {e}</label>
		{/each}
	</fieldset>

	<fieldset>
		<legend>Projetos <small>(nenhum = todos)</small></legend>
		{#each projetos as [id, nome] (id)}
			<label class="chip"><input type="checkbox" checked={projSel.includes(id)} onchange={() => (projSel = alternar(projSel, id))} /> {nome}</label>
		{/each}
	</fieldset>

	<fieldset>
		<legend>Labels</legend>
		<label class="chip"><input type="checkbox" bind:checked={semLabel} disabled={labIn.length > 0} /> sem label alguma</label>
		{#each labels as [id, nome] (id)}
			<div class="tri">
				<span>{nome}</span>
				<button class:on={labIn.includes(id)} disabled={semLabel} onclick={() => { labIn = alternar(labIn, id); labNotIn = labNotIn.filter((x) => x !== id); }}>tem</button>
				<button class:on={labNotIn.includes(id)} onclick={() => { labNotIn = alternar(labNotIn, id); labIn = labIn.filter((x) => x !== id); }}>não tem</button>
			</div>
		{/each}
	</fieldset>

	<fieldset>
		<legend>Prioridade mínima</legend>
		<select bind:value={prioridade}>{#each prioridades as p, i (i)}<option value={i}>{p}</option>{/each}</select>
	</fieldset>

	<fieldset>
		<legend>Prazo</legend>
		<select bind:value={prazo}>
			<option value="">qualquer</option><option value="atrasadas">atrasadas</option><option value="hoje">hoje</option>
			<option value="proximos">próximos N dias</option><option value="sem">sem prazo</option>
		</select>
		{#if prazo === 'proximos'}<input type="number" min="1" max="366" bind:value={dias} /> dias{/if}
	</fieldset>

	<fieldset>
		<legend>Criada há mais de</legend>
		<input type="number" min="1" max="3650" placeholder="—" bind:value={criada} /> dias
	</fieldset>

	<label>Texto <input bind:value={texto} placeholder="no título ou na descrição" /></label>

	<p class="nota">Todas as condições valem juntas (E).</p>
	<pre>{JSON.stringify(json, null, 1)}</pre>
</main>

<style>
	:global(body) { margin: 0; font: 15px system-ui, sans-serif; background: #fafaf9; }
	main { max-width: 560px; margin: 0 auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
	h1 { font-size: 20px; margin: 4px 0; }
	.casos { display: flex; flex-wrap: wrap; gap: 6px; }
	.casos button { font-size: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 4px 8px; }
	fieldset { border: 1px solid #e7e5e4; border-radius: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	legend { font-size: 12px; color: #78716c; text-transform: uppercase; }
	.chip { border: 1px solid #e7e5e4; border-radius: 999px; padding: 4px 10px; background: #fff; }
	.tri { display: flex; gap: 4px; align-items: center; width: 100%; }
	.tri span { flex: 1; }
	.tri button { border: 1px solid #d6d3d1; background: #fff; border-radius: 6px; padding: 4px 10px; }
	.tri button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
	input, select { padding: 6px; border: 1px solid #d6d3d1; border-radius: 6px; font: inherit; }
	input[type='number'] { width: 80px; }
	label > input:not([type]) { width: 100%; box-sizing: border-box; }
	.nota { color: #78716c; font-size: 13px; margin: 0; }
	pre { background: #111; color: #0f0; padding: 8px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; }
</style>
