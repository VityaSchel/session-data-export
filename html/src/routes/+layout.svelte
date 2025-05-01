<script lang="ts">
	import Conversations from '$lib/Conversations.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<div class="flex items-start">
	<Conversations />
	{@render children()}
</div>
