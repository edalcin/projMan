<script lang="ts">
	// PROTÓTIPO #14 — rolagem infinita: chama `mais` quando entra na tela.
	let { mais }: { mais: () => void } = $props();
	let el: HTMLDivElement;
	$effect(() => {
		const io = new IntersectionObserver((e) => e[0].isIntersecting && mais(), {
			rootMargin: '300px'
		});
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<div bind:this={el} style="height:1px"></div>
