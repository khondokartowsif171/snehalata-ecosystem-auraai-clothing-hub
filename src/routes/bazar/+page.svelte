<script lang="ts">
  import { onMount } from 'svelte';
  import { priceStats, fairVerdict } from '$lib/fairPrice';
  import { ECO_CATEGORIES } from '$lib/categories';

  type Listing = {
    id: number; name: string; price: number; category?: string; image_url?: string | null;
    description?: string; contact_phone?: string; item_condition?: string;
  };

  let listings = $state<Listing[]>([]);
  let loading = $state(true);
  let filter = $state('all');
  const CATS = ECO_CATEGORIES;

  const shown = $derived(filter === 'all' ? listings : listings.filter((l) => (l.category || 'others') === filter));

  function waLink(phone?: string) {
    const d = String(phone || '').replace(/[^0-9]/g, '');
    if (!d) return '';
    const intl = d.startsWith('88') ? d : '88' + d;
    return `https://wa.me/${intl}`;
  }
  function condLabel(c?: string) {
    return c === 'used' ? 'ব্যবহৃত' : c === 'refurbished' ? 'রিফারবিশড' : c === 'new' ? 'নতুন' : '';
  }

  async function report(id: number) {
    if (!confirm('এই পোস্টটি সন্দেহজনক বলে রিপোর্ট করবেন? এটি যাচাইয়ের জন্য সরিয়ে নেওয়া হবে।')) return;
    listings = listings.filter((l) => l.id !== id);
    try {
      await fetch('/api/bazar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report: id }) });
    } catch { /* best-effort */ }
  }

  onMount(async () => {
    try {
      const r = await fetch('/api/bazar');
      const d = await r.json().catch(() => ({}));
      listings = d.listings || [];
    } catch { /* empty */ }
    loading = false;
  });
</script>

<svelte:head>
  <title>স্নেহলতা সরাসরি বাজার — সরাসরি বিক্রেতার কাছে | Snehalata Bazar</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 text-white">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <p class="text-xs font-bold uppercase tracking-widest text-aura-gold">স্নেহলতা সরাসরি বাজার · Open Bazaar</p>
      <h1 class="mt-1 text-3xl font-bold">সরাসরি বিক্রেতার কাছ থেকে</h1>
      <p class="mt-1 text-sm text-white/60">Aura প্রতিটি দাম যাচাই করে — সেরা, ন্যায্য নাকি বেশি। যোগাযোগ সরাসরি বিক্রেতার সাথে।</p>
    </div>
    <a href="/sell/post" class="rounded-xl bg-aura-gold px-5 py-2.5 text-sm font-bold text-black">+ বিক্রি করুন</a>
  </div>

  <!-- Trust disclaimer — this tier is peer-to-peer, distinct from verified vendors -->
  <div class="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-200/90">
    ⚠ এটি সরাসরি (peer-to-peer) বাজার। Aura দাম ও মান যাচাই করে, তবে লেনদেন ও যোগাযোগ আপনার নিজ দায়িত্বে। সন্দেহ হলে অগ্রিম টাকা দেবেন না — এবং “রিপোর্ট” করুন।
  </div>

  <!-- Category filter -->
  <div class="mt-4 flex gap-2 overflow-x-auto pb-1">
    {#each CATS as c}
      <button class="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold {filter === c.id ? 'bg-aura-gold text-black' : 'bg-white/10 text-white/70'}" onclick={() => (filter = c.id)}>{c.name}</button>
    {/each}
  </div>

  {#if loading}
    <p class="mt-10 text-center text-white/50">লোড হচ্ছে…</p>
  {:else if shown.length === 0}
    <div class="mt-10 rounded-2xl border border-white/10 bg-white/5 py-14 text-center">
      <p class="text-white/60">এই মুহূর্তে এখানে কোনো পোস্ট নেই।</p>
      <a href="/sell/post" class="mt-4 inline-block rounded-xl bg-aura-gold px-5 py-2.5 text-sm font-bold text-black">প্রথম পোস্টটি করুন</a>
    </div>
  {:else}
    <div class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {#each shown as l (l.id)}
        {@const v = fairVerdict(Number(l.price), l.category, $priceStats)}
        <div class="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {#if l.image_url}
            <img src={l.image_url} alt={l.name} class="h-40 w-full object-cover" loading="lazy" />
          {:else}
            <div class="flex h-40 w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/5 text-2xl">🛍️</div>
          {/if}
          <div class="flex flex-1 flex-col p-3">
            <p class="line-clamp-2 text-sm font-semibold">{l.name}</p>
            <div class="mt-1 flex items-center gap-2">
              <span class="text-lg font-bold text-aura-gold">৳{Number(l.price).toLocaleString('bn-BD')}</span>
              {#if condLabel(l.item_condition)}<span class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">{condLabel(l.item_condition)}</span>{/if}
            </div>
            {#if v}
              <span class="mt-2 inline-block w-fit rounded border px-1.5 py-0.5 text-[11px] font-semibold {v.cls}">{v.label}</span>
            {/if}
            <div class="mt-auto grid grid-cols-2 gap-2 pt-3">
              <a href={'tel:' + (l.contact_phone || '')} class="rounded-lg bg-aura-gold py-1.5 text-center text-xs font-bold text-black">ফোন</a>
              <a href={waLink(l.contact_phone)} target="_blank" rel="noopener" class="rounded-lg bg-aura-green/80 py-1.5 text-center text-xs font-bold text-black">WhatsApp</a>
            </div>
            <button class="mt-1.5 text-[10px] text-white/35 hover:text-red-400" onclick={() => report(l.id)}>⚠ রিপোর্ট</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
