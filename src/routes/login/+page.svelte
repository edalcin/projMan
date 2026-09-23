<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { form } = $props();
</script>

<svelte:head><title>Entrar · projMan</title></svelte:head>

<main class="grid min-h-dvh place-items-center bg-muted/40 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 flex flex-col items-center gap-3 text-center">
			<img src="/icon-192.png" alt="" width="64" height="64" class="size-16" />
			<h1 class="text-2xl font-semibold tracking-tight">projMan</h1>
		</div>

		<form method="POST" class="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
			<div class="space-y-2">
				<label for="senha" class="text-sm font-medium">Senha</label>
				<!-- svelte-ignore a11y_autofocus -->
				<Input
					id="senha"
					type="password"
					name="senha"
					autocomplete="current-password"
					required
					autofocus
					aria-invalid={form?.erro ? true : undefined}
					aria-describedby={form?.erro ? 'erro' : undefined}
				/>
			</div>
			{#if form?.erro}
				<p id="erro" role="alert" class="flex items-center gap-2 text-sm text-destructive">
					<i class="bx bx-error-circle"></i>{form.erro}
				</p>
			{/if}
			<Button type="submit" class="w-full">Entrar</Button>
		</form>
	</div>
</main>
