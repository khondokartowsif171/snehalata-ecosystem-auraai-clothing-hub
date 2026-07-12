<script lang="ts">
  import { XCircle, RotateCcw, ShoppingBag } from '@lucide/svelte';
</script>

<svelte:head><title>পেমেন্ট ব্যর্থ — Snehalata</title></svelte:head>

<div class="min-h-screen bg-[#080b09] flex items-center justify-center p-6">
  <div class="max-w-md w-full text-center space-y-6 bg-white/[0.03] border border-red-500/25 rounded-[2.5rem] p-8 sm:p-10">
    <div class="w-20 h-20 rounded-[1.75rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
      <XCircle size={44} class="text-red-400" />
    </div>
    <div>
      <h1 class="text-2xl font-serif font-black text-white">পেমেন্ট সম্পন্ন হয়নি</h1>
      <p class="text-gray-400 mt-2 text-sm">কোনো টাকা কাটা হয়নি। আবার চেষ্টা করুন, অথবা <b class="text-white">ক্যাশ অন ডেলিভারি (COD)</b> বেছে নিন।</p>
    </div>
    <div class="grid grid-cols-1 gap-3">
      <a href="/cart" class="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-aura-green text-black font-black text-[11px] uppercase tracking-widest hover:brightness-110 transition-all">
        <RotateCcw size={16} /> আবার চেষ্টা করুন
      </a>
      <a href="/" class="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">
        <ShoppingBag size={16} /> কেনাকাটায় ফিরুন
      </a>
    </div>
  </div>
</div>
