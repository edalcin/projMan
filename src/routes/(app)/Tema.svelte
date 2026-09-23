<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	// O script em app.html aplica a classe antes da pintura; aqui só alterna e grava.
	let escuro = $state(false);
	$effect(() => {
		escuro = document.documentElement.classList.contains('dark');
	});
	function alternar() {
		escuro = !escuro;
		document.documentElement.classList.toggle('dark', escuro);
		localStorage.setItem('tema', escuro ? 'escuro' : 'claro');
	}
</script>

<Button variant="ghost" size="sm" class="justify-start" onclick={alternar}>
	<i class="bx {escuro ? 'bx-sun' : 'bx-moon'} text-base"></i>
	{escuro ? 'Tema claro' : 'Tema escuro'}
</Button>
