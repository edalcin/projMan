<script lang="ts">
	import 'boxicons/css/boxicons.min.css';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" type="image/png" href="/icon-192.png" /></svelte:head>
{@render children()}
