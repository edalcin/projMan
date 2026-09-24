<script lang="ts">
	import { Editor } from '@tiptap/core';
	import { untrack } from 'svelte';
	import StarterKit from '@tiptap/starter-kit';
	import { Button } from '$lib/components/ui/button';

	// Não controlado após montar: `valor` só serve de conteúdo inicial. Quem usa
	// troca de tarefa remonta com `{#key}` (a tarefa é outro documento inteiro).
	let { valor, onSalvar, placeholder }: { valor: string; onSalvar: (html: string) => void | Promise<void>; placeholder?: string } = $props();

	let elemento: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined;
	let versao = $state(0); // bump força reler editor.isActive()/isEmpty depois de cada transação
	let sujo = false;

	function ativo(nome: string): boolean {
		versao;
		return !!editor?.isActive(nome);
	}
	function vazio(): boolean {
		versao;
		return !!editor?.isEmpty;
	}

	async function salvarSeSujo() {
		if (!editor || !sujo) return;
		sujo = false;
		await onSalvar(editor.getHTML());
	}

	function link() {
		if (!editor) return;
		if (editor.isActive('link')) {
			editor.chain().focus().unsetLink().run();
			return;
		}
		const href = window.prompt('Endereço do link (https://, http:// ou mailto:):');
		if (href) editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
	}

	$effect(() => {
		if (!elemento) return;
		const el = elemento;
		// untrack: o efeito só depende do elemento; ler `valor`/`versao` aqui recriava o editor em laço.
		return untrack(() => montar(el));
	});

	function montar(el: HTMLDivElement) {
		const inst = new Editor({
			element: el,
			extensions: [StarterKit],
			content: valor || '',
			editorProps: {
				attributes: {
					class:
						'min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring ' +
						'[&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 ' +
						'[&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 ' +
						'[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground ' +
						'[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold'
				}
			},
			onTransaction: ({ transaction }) => {
				if (transaction.docChanged) sujo = true;
				versao++;
			},
			onBlur: () => salvarSeSujo()
		});
		editor = inst;
		versao++; // primeira leitura reativa: ativo()/vazio() rodaram antes do editor existir
		return () => inst.destroy();
	}

	const semMouseDown = (e: MouseEvent) => e.preventDefault(); // não tira o foco do editor ao clicar na barra
</script>

<div class="space-y-1">
	<div class="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 bg-muted/30 p-1">
		<Button variant={ativo('bold') ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Negrito" onmousedown={semMouseDown} onclick={() => editor?.chain().focus().toggleBold().run()}>
			<i class="bx bx-bold"></i>
		</Button>
		<Button variant={ativo('italic') ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Itálico" onmousedown={semMouseDown} onclick={() => editor?.chain().focus().toggleItalic().run()}>
			<i class="bx bx-italic"></i>
		</Button>
		<Button variant={ativo('bulletList') ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Lista com marcadores" onmousedown={semMouseDown} onclick={() => editor?.chain().focus().toggleBulletList().run()}>
			<i class="bx bx-list-ul"></i>
		</Button>
		<Button variant={ativo('orderedList') ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Lista numerada" onmousedown={semMouseDown} onclick={() => editor?.chain().focus().toggleOrderedList().run()}>
			<i class="bx bx-list-ol"></i>
		</Button>
		<Button variant={ativo('link') ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Link" onmousedown={semMouseDown} onclick={link}>
			<i class="bx bx-link"></i>
		</Button>
		<Button variant={ativo('code') ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Código" onmousedown={semMouseDown} onclick={() => editor?.chain().focus().toggleCode().run()}>
			<i class="bx bx-code-alt"></i>
		</Button>
		<Button variant="ghost" size="icon-sm" class="ml-auto" aria-label="Salvar descrição" onmousedown={semMouseDown} onclick={salvarSeSujo}>
			<i class="bx bx-save"></i>
		</Button>
	</div>
	<div class="relative">
		<div bind:this={elemento} class="rounded-b-md"></div>
		{#if placeholder && vazio()}
			<p class="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground">{placeholder}</p>
		{/if}
	</div>
</div>
