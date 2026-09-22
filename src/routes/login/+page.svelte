<script lang="ts">
	// ponytail: HTML puro. O visual (shadcn-svelte, tema) entra com o protótipo do shell (#14).
	let { form } = $props();
</script>

<svelte:head><title>Entrar · projMan</title></svelte:head>

<main>
	<h1>projMan</h1>
	<form method="POST">
		<label>
			Senha
			<input type="password" name="senha" autocomplete="current-password" required autofocus />
		</label>
		{#if form?.erro}<p role="alert">{form.erro}</p>{/if}
		<button>Entrar</button>
	</form>
</main>
