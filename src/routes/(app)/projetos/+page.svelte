<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { data, form } = $props();

	// Apagar é físico e leva tudo junto (#9): confirma antes.
	const confirmar =
		(msg: string): SubmitFunction =>
		({ cancel }) => {
			if (!confirm(msg)) cancel();
		};
	// Formulários de edição: sem reset depois de salvar, o campo mostra o valor novo.
	const manter: SubmitFunction = () => ({ update }) => update({ reset: false });
</script>

<svelte:head><title>Projetos e labels · projMan</title></svelte:head>

{#snippet icone(nome: string, rotulo: string)}
	<i class="bx {nome} text-base"></i><span class="sr-only">{rotulo}</span>
{/snippet}

<main class="mx-auto w-full max-w-3xl space-y-8 px-4 py-4 md:px-6">
	{#if form?.erro}
		<p role="alert" class="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">{form.erro}</p>
	{/if}

	<section>
		<h1 class="mb-3 text-xl font-semibold">Projetos</h1>
		<form method="POST" action="?/criar" use:enhance class="mb-4 flex gap-2">
			<Input name="title" placeholder="Novo projeto" required maxlength={200} />
			<Button type="submit">Criar</Button>
		</form>

		<ul class="divide-y">
			{#each data.projetos as p, i (p.id)}
				<li class="flex items-center gap-1 py-2" class:opacity-60={p.archived}>
					<form method="POST" action="?/renomear" use:enhance={manter} class="flex flex-1 gap-2">
						<input type="hidden" name="id" value={p.id} />
						<Input name="title" value={p.title} required maxlength={200} aria-label="Nome do projeto" />
						<Button type="submit" variant="ghost" size="icon" title="Salvar nome">{@render icone('bx-check', 'Salvar nome')}</Button>
					</form>
					<form method="POST" action="?/mover" use:enhance={manter} class="flex">
						<input type="hidden" name="id" value={p.id} />
						<Button type="submit" name="delta" value="-1" variant="ghost" size="icon" disabled={i === 0} title="Subir">{@render icone('bx-chevron-up', 'Subir')}</Button>
						<Button type="submit" name="delta" value="1" variant="ghost" size="icon" disabled={i === data.projetos.length - 1} title="Descer">{@render icone('bx-chevron-down', 'Descer')}</Button>
					</form>
					<form method="POST" action="?/arquivar" use:enhance={manter}>
						<input type="hidden" name="id" value={p.id} />
						<input type="hidden" name="archived" value={p.archived ? '0' : '1'} />
						<Button type="submit" variant="ghost" size="icon" title={p.archived ? 'Desarquivar' : 'Arquivar'}>
							{@render icone(p.archived ? 'bx-archive-out' : 'bx-archive-in', p.archived ? 'Desarquivar' : 'Arquivar')}
						</Button>
					</form>
					<form method="POST" action="?/apagar" use:enhance={confirmar(`Apagar "${p.title}" com todas as tarefas? Não tem volta.`)}>
						<input type="hidden" name="id" value={p.id} />
						<Button type="submit" variant="ghost" size="icon" class="text-destructive" title="Apagar">{@render icone('bx-trash', 'Apagar')}</Button>
					</form>
				</li>
			{:else}
				<li class="py-6 text-center text-sm text-muted-foreground">Nenhum projeto ainda. Crie o primeiro acima.</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold">Labels</h2>
		<form method="POST" action="?/label" use:enhance class="mb-4 flex gap-2">
			<Input name="title" placeholder="Nova label" required maxlength={200} />
			<input type="color" name="hex_color" value="#9ca3af" class="h-9 w-10 cursor-pointer rounded-md border bg-transparent" aria-label="Cor" />
			<Button type="submit">Criar</Button>
		</form>

		<ul class="divide-y">
			{#each data.labels as l (l.id)}
				<li class="flex items-center gap-1 py-2">
					<form method="POST" action="?/label" use:enhance={manter} class="flex flex-1 gap-2">
						<input type="hidden" name="id" value={l.id} />
						<input type="color" name="hex_color" value="#{l.hex_color ?? '9ca3af'}" class="h-9 w-10 cursor-pointer rounded-md border bg-transparent" aria-label="Cor" />
						<Input name="title" value={l.title} required maxlength={200} aria-label="Nome da label" />
						<Button type="submit" variant="ghost" size="icon" title="Salvar">{@render icone('bx-check', 'Salvar')}</Button>
					</form>
					<form method="POST" action="?/apagarLabel" use:enhance={confirmar(`Apagar a label "${l.title}"? Ela sai de todas as tarefas.`)}>
						<input type="hidden" name="id" value={l.id} />
						<Button type="submit" variant="ghost" size="icon" class="text-destructive" title="Apagar">{@render icone('bx-trash', 'Apagar')}</Button>
					</form>
				</li>
			{:else}
				<li class="py-6 text-center text-sm text-muted-foreground">Nenhuma label ainda.</li>
			{/each}
		</ul>
	</section>
</main>
