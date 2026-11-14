<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import { Menu, X, Sparkles, History, PackageSearch, Store, LayoutGrid, Search, Camera, Loader2, Mic, Mail, User } from '@lucide/svelte';
  import Logo from './Logo.svelte';
  import InstallAppButton from './InstallAppButton.svelte';
  import { fileToCompressedDataURL } from '$lib/imageUpload';
  import { navMenuOpen, categorySheetOpen } from '$lib/ui';
  import { getStoredCustomer, initCustomerAuthListener, type CustomerProfile } from '$lib/customerAuth';

  let currentCustomer = $state<CustomerProfile | null>(null);
  let q = $state('');
  let searchLoading = $state(false);
  let listening = $state(false);
  let voiceSupported = $state(true);
  let voiceLang = $state<'bn-BD' | 'en-US'>('bn-BD');
  let voiceStatusText = $state('');
  let voiceDrawerOpen = $state(false);
  let focused = $state(false);

  const QUICK_VOICE_CHIPS = [
    { label: 'সবুজ টি-শার্ট', query: 'সবুজ টি-শার্ট' },
    { label: 'জামদানি শাড়ি', query: 'জামদানি শাড়ি' },
    { label: 'পাঞ্জাবি', query: 'পাঞ্জাবি' },
    { label: 'থ্রি-পিস', query: 'থ্রি-পিস' },
    { label: 'বাচ্চাদের পোশাক', query: 'বাচ্চাদের পোশাক' },
    { label: 'জিন্স প্যান্ট', query: 'জিন্স প্যান্ট' },
    { label: 'ব্লেজার ও স্যুট', query: 'ব্লেজার স্যুট' },
    { label: 'বোরকা', query: 'বোরকা' }
  ];

  // Rotating placeholder — cycles helpful hints so the search always feels alive.
  const PLACEHOLDERS = [
    'Neural search · products, brands, stores…',
    'খুঁজুন — শাড়ি, পাঞ্জাবি, কসমেটিকস…',
    'Aura Neural Grid · সব দোকান এক জায়গায়',
    'ভয়েস বা ছবিতেও খুঁজুন 🎙️ 📷'
  ];
  let phIndex = $state(0);
  const placeholder = $derived(PLACEHOLDERS[phIndex]);

  // Neural search lives in the global header → text goes to the home via ?q= (matches the
  // site's SearchAction schema); the home reacts to the param and runs the semantic search.
  function submitSearch(customTerm?: string) {
    const term = (customTerm ?? q).trim();
    if (!term) return;
    q = term;
    voiceDrawerOpen = false;
    listening = false;
    try { recognition?.stop(); } catch {}
    goto('/?q=' + encodeURIComponent(term));
  }

  // Photo/visual search: compress → hand off via sessionStorage → home consumes it.
  async function onCamera(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    searchLoading = true;
    voiceDrawerOpen = false;
    try {
      const base64 = await fileToCompressedDataURL(file);
      sessionStorage.setItem('aura_visual_pending', base64);
      sessionStorage.setItem('aura_visual_preview', base64);
      if (location.pathname === '/') {
        window.dispatchEvent(new Event('aura-visual'));
      } else {
        await goto('/');
        window.dispatchEvent(new Event('aura-visual'));
      }
    } catch { /* ignore */ }
    finally { searchLoading = false; input.value = ''; }
  }

  // Bangla & English voice search — speak in বাংলা/English, Aura searches immediately.
  let recognition: any = null;
  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (listening) {
      try { recognition?.stop(); } catch {}
      listening = false;
      return;
    }
    voiceDrawerOpen = true;
    if (!SR) {
      voiceStatusText = 'মাইক্রোফোন প্রস্তুত — নিচের যেকোনো ভয়েস ট্যাগ চাপুন বা টাইপ করুন:';
      return;
    }
    try {
      recognition = new SR();
      recognition.lang = voiceLang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      voiceStatusText = voiceLang === 'bn-BD' ? '🎙️ শুনছি... বাংলায় বা ইংরেজিতে বলুন' : '🎙️ Listening... Speak product name';

      recognition.onresult = (ev: any) => {
        const res = ev.results?.[ev.results.length - 1];
        const text = res?.[0]?.transcript?.trim() || '';
        if (text) {
          q = text;
          voiceStatusText = `🎙️ "${text}"`;
          if (res.isFinal) {
            submitSearch(text);
          }
        }
      };
      recognition.onend = () => {
        listening = false;
        if (q.trim() && voiceDrawerOpen) {
          submitSearch(q.trim());
        }
      };
      recognition.onerror = (err: any) => {
        listening = false;
        voiceStatusText =
          err?.error === 'not-allowed'
            ? 'মাইক্রোফোন পারমিশন দিন অথবা নিচের কুইক ভয়েস চিপে ক্লিক করুন:'
            : 'আবার চেষ্টা করুন অথবা নিচের ভয়েস অপশন বেছে নিন:';
      };
      listening = true;
      recognition.start();
    } catch {
      listening = false;
      voiceStatusText = 'নিচের যেকোনো ভয়েস অপশন বেছে নিন:';
    }
  }

  function toggleVoiceLang() {
    voiceLang = voiceLang === 'bn-BD' ? 'en-US' : 'bn-BD';
    if (listening) {
      try { recognition?.stop(); } catch {}
      listening = false;
      setTimeout(startVoice, 150);
    }
  }

  $effect(() => {
    // detect voice support + start the rotating placeholder (paused while focused)
    voiceSupported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const ph = setInterval(() => { if (!focused) phIndex = (phIndex + 1) % PLACEHOLDERS.length; }, 2800);
    
    currentCustomer = getStoredCustomer();
    const unsubAuth = initCustomerAuthListener((p) => { currentCustomer = p; });
    const onAuthEvent = (e: any) => { currentCustomer = e.detail; };
    window.addEventListener('snehalata_customer_auth_changed', onAuthEvent);

    return () => {
      clearInterval(ph);
      unsubAuth();
      window.removeEventListener('snehalata_customer_auth_changed', onAuthEvent);
    };
  });

</script>

<nav class="sticky top-0 z-50 bg-[#0a0f0d]/95 backdrop-blur-lg border-b border-aura-green/12 shadow-2xl">
  <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
    <a href="/" class="flex items-center gap-3 group">
      <Logo size={34} />
      <span class="hidden sm:flex flex-col leading-none">
        <span class="text-base font-bold tracking-wide font-display">
          <span class="text-white">SNEHALATA</span><span class="text-gray-500 text-xs font-normal">.com</span>
        </span>
        <span class="text-aura-gold text-[8px] font-semibold tracking-[0.25em] mt-1 font-display">AURA NEURAL GRID</span>
      </span>
    </a>

    <!-- Neural search — permanent in the header (text · voice · photo) -->
    <div class="flex-1 max-w-xl mx-3 sm:mx-5 relative">
      <div class="relative flex items-center gap-2">
        <div class="flex-1 relative group">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-aura-dim group-focus-within:text-aura-green transition-colors" size={16} />
          <input type="text" bind:value={q} onkeydown={(e) => e.key === 'Enter' && submitSearch()}
            onfocus={() => focused = true} onblur={() => focused = false}
            placeholder={placeholder}
            aria-label="Neural search"
            class="w-full bg-aura-card border border-aura-green/16 rounded-xl h-10 pl-10 pr-3 text-[13px] focus:outline-none focus:border-aura-green/55 transition-all placeholder:text-aura-dim" />
        </div>
        <button type="button" onclick={startVoice} title="বাংলায় বা ইংরেজিতে বলে খুঁজুন · Voice search" aria-label="Voice search"
          class="w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-all cursor-pointer {listening ? 'bg-aura-green text-black border-aura-green shadow-[0_0_18px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-aura-card border-aura-green/18 text-aura-green hover:border-aura-green'}">
          <Mic size={16} />
        </button>
        <label class="w-10 h-10 shrink-0 rounded-xl bg-aura-card border border-aura-green/18 flex items-center justify-center text-aura-green hover:border-aura-green transition-all cursor-pointer" title="ছবি আপলোড করে খুঁজুন · Search by photo" aria-label="Search by photo">
          <input type="file" accept="image/*" onchange={onCamera} class="hidden" disabled={searchLoading} />
          {#if searchLoading}<Loader2 size={15} class="animate-spin" />{:else}<Camera size={16} />{/if}
        </label>
      </div>

      {#if voiceDrawerOpen}
        <div class="absolute left-0 right-0 top-12 z-50 rounded-2xl bg-[#0b1310]/98 border border-aura-green/35 p-3.5 shadow-2xl backdrop-blur-xl" transition:fade={{ duration: 150 }}>
          <div class="flex items-center justify-between gap-2 mb-2.5">
            <div class="flex items-center gap-2 text-xs font-bold text-aura-green">
              <span class="w-2.5 h-2.5 rounded-full bg-aura-green {listening ? 'animate-ping' : ''}"></span>
              <span>{voiceStatusText || '🎙️ ভয়েস সার্চ সক্রিয়'}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick={toggleVoiceLang}
                class="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-white/10 text-aura-cream hover:bg-aura-green hover:text-black transition-all cursor-pointer">
                {voiceLang === 'bn-BD' ? 'বাংলা ⇄ EN' : 'EN ⇄ বাংলা'}
              </button>
              <button type="button" onclick={() => { voiceDrawerOpen = false; listening = false; try { recognition?.stop(); } catch {} }}
                class="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer" aria-label="Close voice search">
                <X size={14} />
              </button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5">
            {#each QUICK_VOICE_CHIPS as chip}
              <button type="button" onclick={() => submitSearch(chip.query)}
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-aura-green/25 text-[#cfe8dd] hover:bg-aura-green hover:text-black transition-all cursor-pointer">
                🎙️ {chip.label}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="hidden lg:flex items-center gap-8">
      <a href="/" class="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] py-1 border-b-2 transition-all duration-300 {$page.url.pathname === '/' ? 'border-aura-green text-aura-green' : 'text-gray-500 border-transparent hover:text-white hover:-translate-y-px'}">
        <LayoutGrid size={14} /> Hub
      </a>
      <a href="/studio" class="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] py-1 border-b-2 transition-all duration-300 {$page.url.pathname === '/studio' ? 'border-aura-green text-aura-green' : 'text-gray-500 border-transparent hover:text-white hover:-translate-y-px'}">
        <Sparkles size={14} /> Aura Studio
      </a>
      <a href="/orders" class="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] py-1 border-b-2 transition-all duration-300 {$page.url.pathname.startsWith('/orders') ? 'border-aura-green text-aura-green' : 'text-gray-500 border-transparent hover:text-white hover:-translate-y-px'}">
        <History size={14} /> History
      </a>
      <a href="/account" class="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] py-1 border-b-2 transition-all duration-300 {$page.url.pathname.startsWith('/account') ? 'border-aura-green text-aura-green' : 'text-gray-400 border-transparent hover:text-white hover:-translate-y-px'}">
        {#if currentCustomer?.avatar_url}
          <img src={currentCustomer.avatar_url} alt="" class="w-4 h-4 rounded-full border border-aura-green" />
        {:else}
          <User size={14} class="text-aura-green" />
        {/if}
        <span>{currentCustomer ? currentCustomer.name.split(' ')[0] : 'Account'}</span>
      </a>
    </div>

    <div class="flex items-center gap-5">
      <a href="/tracking" class="hidden xl:flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-aura-green transition-all">
        <PackageSearch size={12} /> Track Order
      </a>
      <a href="/bazar" class="hidden xl:flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-aura-green transition-all">
        <Store size={12} /> বাজার
      </a>
      <InstallAppButton variant="header" />
      <a href="/sell" class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-aura-gold/10 border border-aura-gold/25 text-[9px] font-black uppercase tracking-[0.25em] text-aura-gold hover:bg-aura-gold/20 transition-colors">
        <Store size={12} /> Sell on Snehalata
      </a>

      <button type="button" aria-label="Open menu" onclick={() => navMenuOpen.update((v) => !v)} class="lg:hidden text-white cursor-pointer p-2 -m-2 touch-manipulation">
        {#if $navMenuOpen}
          <X size={24} />
        {:else}
          <Menu size={24} />
        {/if}
      </button>
    </div>
  </div>

  {#if $navMenuOpen}
    <div class="lg:hidden bg-[#0a0f0d]/97 border-b border-aura-green/12 py-6 px-6" transition:fade={{ duration: 200 }}>
      <div class="flex flex-col gap-5">
        <a href="/" onclick={() => navMenuOpen.set(false)} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider"
           class:text-aura-green={$page.url.pathname === '/'} class:text-gray-400={$page.url.pathname !== '/'}>
          <LayoutGrid size={16} /> Hub
        </a>
        <button type="button" onclick={() => { navMenuOpen.set(false); categorySheetOpen.set(true); }} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider text-gray-400 hover:text-white">
          <LayoutGrid size={16} /> Categories
        </button>
        <a href="/studio" onclick={() => navMenuOpen.set(false)} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider"
           class:text-aura-green={$page.url.pathname === '/studio'} class:text-gray-400={$page.url.pathname !== '/studio'}>
          <Sparkles size={16} /> Aura Studio
        </a>
        <a href="/tracking" onclick={() => navMenuOpen.set(false)} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider text-gray-400 hover:text-white">
          <PackageSearch size={16} /> Track Order
        </a>
        <a href="/guide" onclick={() => navMenuOpen.set(false)} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider text-gray-400 hover:text-white">
          <Sparkles size={16} /> কীভাবে ব্যবহার করবেন
        </a>
        <a href="/bazar" onclick={() => navMenuOpen.set(false)} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider text-gray-400 hover:text-white">
          <Store size={16} /> সরাসরি বাজার
        </a>
        <a href="/orders" onclick={() => navMenuOpen.set(false)} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider"
           class:text-aura-green={$page.url.pathname.startsWith('/orders')} class:text-gray-400={!$page.url.pathname.startsWith('/orders')}>
          <History size={16} /> My Orders
        </a>
        <a href="/account" onclick={() => navMenuOpen.set(false)} class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider"
           class:text-aura-green={$page.url.pathname.startsWith('/account')} class:text-gray-400={!$page.url.pathname.startsWith('/account')}>
          {#if currentCustomer?.avatar_url}
            <img src={currentCustomer.avatar_url} alt="" class="w-4 h-4 rounded-full border border-aura-green inline-block" />
          {:else}
            <User size={16} />
          {/if}
          <span>{currentCustomer ? `Account (${currentCustomer.name.split(' ')[0]})` : 'Customer Account (Login)'}</span>
        </a>
        <a href="mailto:support@snehalata.com" class="flex items-center gap-2.5 text-sm font-black uppercase tracking-wider text-gray-400 hover:text-white">
          <Mail size={16} /> Help &amp; Support
        </a>
        <div class="h-px bg-white/10 my-1" />
        <InstallAppButton variant="menu" />
        <a href="/sell" onclick={() => navMenuOpen.set(false)} class="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-aura-gold bg-aura-gold/10 border border-aura-gold/25 rounded-xl py-3">
          <Store size={16} /> Sell on Snehalata
        </a>
        <p class="text-[10px] text-gray-600 text-center -mt-1">দোকান/ব্র্যান্ড থাকলে — বিক্রেতা হন</p>
      </div>
    </div>
  {/if}
</nav>
