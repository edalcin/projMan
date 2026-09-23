<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { useSidebar } from '$lib/components/ui/sidebar';

	// No celular a sidebar é um drawer: escolher uma lista fecha o drawer.
	const sidebar = useSidebar();
	afterNavigate(() => sidebar.setOpenMobile(false));
</script>
