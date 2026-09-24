<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Checkbox } from '$lib/components/ui/checkbox';

	// onSaved: extra opcional (não quebra o contrato) para quem precisa recarregar
	// dado próprio depois do sucesso — o painel de detalhe usa (#7).
	let { id, feita, onSaved }: { id: number; feita: boolean; onSaved?: () => void } = $props();

	let marcada = $state(feita);
	let erro = $state(false);
	// Recorrente marcada feita reabre no servidor (#8): quando `feita` muda por
	// fora (invalidateAll de outro lugar), o visual segue a verdade do servidor.
	$effect(() => {
		marcada = feita;
	});

	async function alternar(v: boolean) {
		const antes = marcada;
		marcada = v;
		erro = false;
		try {
			const r = await fetch(`/api/tarefas/${id}/feita`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ feita: v })
			});
			if (!r.ok) throw new Error(String(r.status));
			await invalidateAll();
			onSaved?.();
		} catch {
			marcada = antes;
			erro = true;
		}
	}
</script>

<span class="inline-flex items-center gap-1">
	<Checkbox checked={marcada} onCheckedChange={(v) => alternar(!!v)} aria-label="Marcar tarefa como feita" />
	{#if erro}
		<i class="bx bx-error-circle text-xs text-destructive" title="Falha ao salvar. Tente de novo."></i>
	{/if}
</span>
