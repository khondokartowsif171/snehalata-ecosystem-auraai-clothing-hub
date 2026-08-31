<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/admin-login', { replaceState: true });
  });
</script>

<svelte:head>
  <title>Admin Gateway · Redirecting</title>
</svelte:head>

<div class="min-h-screen bg-black flex items-center justify-center text-white text-xs">
  <span>Redirecting to Admin Gateway…</span>
</div>
