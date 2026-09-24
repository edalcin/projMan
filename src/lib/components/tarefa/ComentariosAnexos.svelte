<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import type { Anexo } from '$lib/server/anexos';
	import type { Comentario } from '$lib/server/comentarios';
	import EditorRico from './EditorRico.svelte';

	let { tarefaId }: { tarefaId: number } = $props();

	let comentarios = $state<Comentario[]>([]);
	let anexos = $state<Anexo[]>([]);
	let erro = $state(false);
	let editandoId = $state<number | null>(null);
	let novoKey = $state(0);
	let enviando = $state(false);
	let arquivoInput = $state<HTMLInputElement>();

	async function carregar() {
		erro = false;
		try {
			const [rc, ra] = await Promise.all([fetch(`/api/tarefas/${tarefaId}/comentarios`), fetch(`/api/tarefas/${tarefaId}/anexos`)]);
			if (!rc.ok || !ra.ok) throw new Error(String(rc.status));
			comentarios = await rc.json();
			anexos = await ra.json();
		} catch {
			erro = true;
		}
	}

	$effect(() => {
		tarefaId;
		carregar();
	});

	async function criarComentario(html: string) {
		erro = false;
		try {
			const r = await fetch(`/api/tarefas/${tarefaId}/comentarios`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: html }) });
			if (!r.ok) throw new Error(String(r.status));
			novoKey++; // remonta o editor de novo comentário vazio
			await carregar();
		} catch {
			erro = true;
		}
	}

	async function salvarEdicao(id: number, html: string) {
		erro = false;
		try {
			const r = await fetch(`/api/tarefas/${tarefaId}/comentarios/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: html }) });
			if (!r.ok) throw new Error(String(r.status));
			editandoId = null;
			await carregar();
		} catch {
			erro = true;
		}
	}

	async function apagarComentario(id: number) {
		if (!confirm('Apagar este comentário?')) return;
		erro = false;
		try {
			const r = await fetch(`/api/tarefas/${tarefaId}/comentarios/${id}`, { method: 'DELETE' });
			if (!r.ok) throw new Error(String(r.status));
			await carregar();
		} catch {
			erro = true;
		}
	}

	async function enviarArquivo() {
		const arquivo = arquivoInput?.files?.[0];
		if (!arquivo) return;
		erro = false;
		enviando = true;
		try {
			const form = new FormData();
			form.set('file', arquivo);
			const r = await fetch(`/api/tarefas/${tarefaId}/anexos`, { method: 'POST', body: form });
			if (!r.ok) throw new Error(String(r.status));
			if (arquivoInput) arquivoInput.value = '';
			await carregar();
		} catch {
			erro = true;
		} finally {
			enviando = false;
		}
	}

	async function apagarAnexo(id: number) {
		if (!confirm('Apagar este anexo?')) return;
		erro = false;
		try {
			const r = await fetch(`/api/anexos/${id}`, { method: 'DELETE' });
			if (!r.ok) throw new Error(String(r.status));
			await carregar();
		} catch {
			erro = true;
		}
	}

	function tamanho(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="space-y-4">
	{#if erro}
		<p role="alert" class="text-sm text-destructive">Não foi possível salvar. Tente de novo.</p>
	{/if}

	<div>
		<Label class="mb-1 block text-xs text-muted-foreground">Anexos</Label>
		<ul class="space-y-1">
			{#each anexos as a (a.id)}
				<li class="flex items-center gap-2 text-sm">
					<i class="bx bx-paperclip text-muted-foreground"></i>
					<a href={`/api/anexos/${a.id}`} class="flex-1 truncate text-primary underline-offset-4 hover:underline">{a.file_name}</a>
					<span class="text-xs text-muted-foreground">{tamanho(a.size)}</span>
					<Button variant="ghost" size="icon-sm" class="text-destructive" aria-label="Apagar anexo" onclick={() => apagarAnexo(a.id)}>
						<i class="bx bx-trash"></i>
					</Button>
				</li>
			{:else}
				<li class="text-xs text-muted-foreground">Nenhum anexo ainda.</li>
			{/each}
		</ul>
		<div class="mt-2 flex items-center gap-2">
			<input bind:this={arquivoInput} type="file" class="flex-1 text-xs" disabled={enviando} onchange={enviarArquivo} />
			{#if enviando}<i class="bx bx-loader-alt animate-spin text-muted-foreground"></i>{/if}
		</div>
	</div>

	<div>
		<Label class="mb-1 block text-xs text-muted-foreground">Comentários</Label>
		<ul class="space-y-3">
			{#each comentarios as c (c.id)}
				<li class="rounded-md border p-2 text-sm">
					{#if editandoId === c.id}
						{#key c.id}
							<EditorRico valor={c.body} onSalvar={(html) => salvarEdicao(c.id, html)} />
						{/key}
					{:else}
						<div class="[&_a]:text-primary [&_a]:underline [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">{@html c.body}</div>
					{/if}
					<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
						<span>{new Date(c.created_at).toLocaleString('pt-BR', { timeZone: (page.data as { tz?: string }).tz ?? 'America/Sao_Paulo' })}</span>
						<button type="button" class="hover:underline" onclick={() => (editandoId = editandoId === c.id ? null : c.id)}>
							{editandoId === c.id ? 'Cancelar' : 'Editar'}
						</button>
						<button type="button" class="text-destructive hover:underline" onclick={() => apagarComentario(c.id)}>Apagar</button>
					</div>
				</li>
			{:else}
				<li class="text-xs text-muted-foreground">Nenhum comentário ainda.</li>
			{/each}
		</ul>
		<div class="mt-2">
			{#key novoKey}
				<EditorRico valor="" placeholder="Escreva um comentário…" onSalvar={criarComentario} />
			{/key}
		</div>
	</div>
</div>
