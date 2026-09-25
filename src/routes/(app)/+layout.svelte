<script lang="ts">
	import { page } from '$app/state';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import { SMART_LISTS } from '$lib/listas';
	import FecharDrawer from './FecharDrawer.svelte';
	import Tema from './Tema.svelte';
	import FabNovaTarefa from '$lib/components/tarefa/FabNovaTarefa.svelte';
	import PainelTarefa from '$lib/components/tarefa/PainelTarefa.svelte';

	let { data, children } = $props();
	const ativos = $derived(data.projetos.filter((p) => !p.archived));
	const arquivados = $derived(data.projetos.filter((p) => p.archived));
	const q = $derived(page.url.searchParams);
	const projetoAtual = $derived(page.url.pathname.match(/^\/projeto\/(\d+)/)?.[1]);
</script>

{#snippet item(href: string, icone: string, nome: string, ativo: boolean)}
	<Sidebar.MenuItem>
		<Sidebar.MenuButton isActive={ativo}>
			{#snippet child({ props })}
				<a {href} {...props}><i class="bx {icone} text-base"></i><span>{nome}</span></a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
{/snippet}

<Sidebar.Provider>
	<FecharDrawer />
	<Sidebar.Root>
		<Sidebar.Header class="px-4 pt-4 text-base font-semibold">projMan</Sidebar.Header>
		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupLabel>Listas</Sidebar.GroupLabel>
				<Sidebar.Menu>
					{#each SMART_LISTS as l (l.chave)}
						{@render item(`/?lista=${l.chave}`, l.icone, l.nome, q.get('lista') === l.chave)}
					{/each}
				</Sidebar.Menu>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Projetos</Sidebar.GroupLabel>
				<Sidebar.GroupAction title="Gerenciar projetos e labels">
					{#snippet child({ props })}
						<a href="/projetos" {...props}><i class="bx bx-cog"></i><span class="sr-only">Gerenciar projetos e labels</span></a>
					{/snippet}
				</Sidebar.GroupAction>
				<Sidebar.Menu>
					{#each ativos as p (p.id)}
						{@render item(`/projeto/${p.id}`, 'bx-folder', p.title, projetoAtual === String(p.id))}
					{:else}
						<p class="px-2 text-xs text-muted-foreground">Nenhum projeto ainda. <a href="/projetos" class="underline">Criar</a></p>
					{/each}
				</Sidebar.Menu>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Filtros salvos</Sidebar.GroupLabel>
				<Sidebar.GroupAction title="Gerenciar filtros salvos">
					{#snippet child({ props })}
						<a href="/filtros" {...props}><i class="bx bx-cog"></i><span class="sr-only">Gerenciar filtros salvos</span></a>
					{/snippet}
				</Sidebar.GroupAction>
				<Sidebar.Menu>
					{#each data.filtros as f (f.id)}
						{@render item(`/?filtro=${f.id}`, 'bx-filter-alt', f.title, q.get('filtro') === String(f.id))}
					{:else}
						<p class="px-2 text-xs text-muted-foreground">Nenhum filtro ainda. <a href="/filtros/novo" class="underline">Criar</a></p>
					{/each}
				</Sidebar.Menu>
			</Sidebar.Group>

			{#if arquivados.length}
				<Collapsible.Root>
					<Sidebar.Group>
						<Sidebar.GroupLabel>
							{#snippet child({ props })}
								<Collapsible.Trigger {...props} class="{props.class} group/arq w-full">
									Arquivados ({arquivados.length})
									<i class="bx bx-chevron-down ml-auto transition-transform group-data-[state=open]/arq:rotate-180"></i>
								</Collapsible.Trigger>
							{/snippet}
						</Sidebar.GroupLabel>
						<Collapsible.Content>
							<Sidebar.Menu>
								{#each arquivados as p (p.id)}
									{@render item(`/projeto/${p.id}`, 'bx-archive', p.title, projetoAtual === String(p.id))}
								{/each}
							</Sidebar.Menu>
						</Collapsible.Content>
					</Sidebar.Group>
				</Collapsible.Root>
			{/if}
		</Sidebar.Content>
		<Sidebar.Footer>
			<Tema />
			<form method="POST" action="/logout" data-sveltekit-reload class="flex">
				<Button type="submit" variant="ghost" size="sm" class="flex-1 justify-start"><i class="bx bx-log-out text-base"></i>Sair</Button>
			</form>
		</Sidebar.Footer>
	</Sidebar.Root>

	<Sidebar.Inset class="min-w-0">
		<header class="flex h-12 items-center gap-2 border-b px-3 md:hidden">
			<Sidebar.Trigger />
			<span class="font-semibold">projMan</span>
		</header>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>

<PainelTarefa />
<FabNovaTarefa />
