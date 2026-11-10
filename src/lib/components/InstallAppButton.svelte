<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Download, Monitor, Smartphone, Check, X, Sparkles } from '@lucide/svelte';

  let { variant = 'header' }: { variant?: 'header' | 'menu' | 'footer' | 'floating' } = $props();

  let deferredPrompt: any = $state(null);
  let isInstalled = $state(false);
  let isIOS = $state(false);
  let showIOSGuide = $state(false);
  let showDesktopGuide = $state(false);

  onMount(() => {
    if (!browser) return;

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      isInstalled = true;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    isIOS = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);

    // Listen for PWA beforeinstallprompt (Chrome, Edge, Samsung Internet, Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      isInstalled = true;
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  });

  async function handleInstallClick() {
    if (deferredPrompt) {
      // Trigger native 1-click install prompt
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        isInstalled = true;
      }
      deferredPrompt = null;
    } else if (isIOS) {
      showIOSGuide = true;
    } else {
      // Generic desktop guide when already promptable or in address bar
      showDesktopGuide = true;
    }
  }
</script>

{#if !isInstalled}
  {#if variant === 'header'}
    <button
      type="button"
      onclick={handleInstallClick}
      title="PC/Laptop বা মোবাইলে সরাসরি ১-ক্লিক অ্যাপ হিসেবে ইনস্টল করুন"
      class="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-aura-green/20 to-aura-gold/20 hover:from-aura-green/30 hover:to-aura-gold/30 border border-aura-green/40 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-aura-green transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
    >
      <Download size={13} class="text-aura-green animate-pulse" />
      <span>১-ক্লিক অ্যাপ</span>
    </button>
  {:else if variant === 'menu'}
    <button
      type="button"
      onclick={handleInstallClick}
      class="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-aura-green/15 via-white/[0.04] to-aura-gold/15 border border-aura-green/30 text-white hover:border-aura-green text-xs font-bold transition-all cursor-pointer shadow-lg"
    >
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-aura-green/20 text-aura-green">
          <Download size={16} />
        </div>
        <div class="text-left">
          <div class="font-black text-sm flex items-center gap-1.5">
            <span>১-ক্লিক অ্যাপ ইনস্টল</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] bg-aura-green text-black uppercase font-black">PC & Mobile</span>
          </div>
          <p class="text-[10px] text-gray-400 mt-0.5">কোনো APK ডাউনলোড ছাড়া সরাসরি অ্যাপ চালু করুন</p>
        </div>
      </div>
      <Sparkles size={16} class="text-aura-gold" />
    </button>
  {:else if variant === 'footer'}
    <button
      type="button"
      onclick={handleInstallClick}
      title="PC/Laptop বা মোবাইলে সরাসরি ১-ক্লিক অ্যাপ হিসেবে ইনস্টল করুন"
      class="inline-flex items-center gap-2 text-aura-green hover:text-white transition-colors cursor-pointer text-sm font-bold"
    >
      <Download size={14} class="text-aura-green" />
      <span>১-ক্লিক অ্যাপ ইনস্টল (PWA)</span>
    </button>
  {/if}
{/if}

<!-- iOS Install Guide Modal -->
{#if showIOSGuide}
  <div class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div class="max-w-sm w-full bg-[#0d120f] border border-aura-green/40 rounded-3xl p-6 shadow-2xl relative">
      <button
        onclick={() => showIOSGuide = false}
        class="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
      >
        <X size={18} />
      </button>
      <div class="text-center mb-4">
        <Smartphone size={32} class="text-aura-green mx-auto mb-2" />
        <h3 class="text-lg font-bold text-white">iPhone/iPad-এ ইনস্টল করুন</h3>
        <p class="text-xs text-gray-400 mt-1">সাফারি ব্রাউজার থেকে সরাসরি হোমস্ক্রিনে অ্যাপটি যুক্ত করুন:</p>
      </div>
      <ol class="space-y-3 text-xs text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/10 mb-5">
        <li class="flex items-start gap-2">
          <span class="font-bold text-aura-green">১.</span>
          <span>সাফারি ব্রাউজারের নিচের <strong>Share (শেয়ার)</strong> আইকনটিতে ট্যাপ করুন।</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="font-bold text-aura-green">২.</span>
          <span>নিচে স্ক্রল করে <strong>'Add to Home Screen'</strong> সিলেক্ট করুন।</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="font-bold text-aura-green">৩.</span>
          <span>উপরে ডানে <strong>'Add'</strong> চাপলেই অ্যাপটি ইনস্টল হয়ে যাবে!</span>
        </li>
      </ol>
      <button
        onclick={() => showIOSGuide = false}
        class="w-full py-3 rounded-xl bg-aura-green text-black font-black text-xs uppercase tracking-wider"
      >
        বুঝেছি
      </button>
    </div>
  </div>
{/if}

<!-- Desktop Browser Guide Modal (when beforeinstallprompt wasn't intercepted yet) -->
{#if showDesktopGuide}
  <div class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div class="max-w-sm w-full bg-[#0d120f] border border-aura-green/40 rounded-3xl p-6 shadow-2xl relative">
      <button
        onclick={() => showDesktopGuide = false}
        class="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
      >
        <X size={18} />
      </button>
      <div class="text-center mb-4">
        <Monitor size={32} class="text-aura-green mx-auto mb-2" />
        <h3 class="text-lg font-bold text-white">PC / Laptop-এ ইনস্টল করুন</h3>
        <p class="text-xs text-gray-400 mt-1">ব্রাউজারের অ্যাড্রেস বার থেকে সরাসরি ১-ক্লিকে ইনস্টল করুন:</p>
      </div>
      <div class="space-y-3 text-xs text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/10 mb-5">
        <p>১. আপনার Chrome বা Edge ব্রাউজারের <strong>URL / Address Bar</strong>-এর ডানপাশে থাকা <strong>Install (ইনস্টল) ⊕</strong> আইকনটিতে ক্লিক করুন।</p>
        <p>২. অথবা ব্রাউজারের ৩-ডট মেনু থেকে <strong>"Save and share" → "Install Snehalata"</strong> দিন।</p>
        <p class="text-[11px] text-aura-gold">💡 এটি আপনার উইন্ডোজ ডেস্কটপে একটি স্বতন্ত্র ফাস্ট অ্যাপ হিসেবে যুক্ত হবে।</p>
      </div>
      <button
        onclick={() => showDesktopGuide = false}
        class="w-full py-3 rounded-xl bg-aura-green text-black font-black text-xs uppercase tracking-wider"
      >
        ঠিক আছে
      </button>
    </div>
  </div>
{/if}