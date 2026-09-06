<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import { getTheme } from '$lib/stores/gameState.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
	const theme = $derived(getTheme());
</script>

<svelte:head>
	<meta name="description" content="Secret Admirer — Find your match at orientation. Play the game." />
</svelte:head>

<div class="app-shell" data-theme={theme}>
	{@render children()}
</div>

<Toast />

<style>
	.app-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		position: relative;
	}
</style>
