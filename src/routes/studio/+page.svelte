<script lang="ts">
  import { browser } from '$app/environment';
  import { tick } from 'svelte';
  import { fade, scale, slide } from 'svelte/transition';
  import {
    Sparkles, Loader2, Download, Layers, Zap, X,
    Camera, RefreshCw, CheckCircle2, User,
    Upload, Palette, Sliders, Info, Ruler, Scan, ShoppingBag, Share2, Wand2, Eye
  } from '@lucide/svelte';
  import {
    generateTryOnTransformation,
    generateStyleTransfer,
    generateMakeupTryOn,
    generateFreeStudioImage
  } from '$lib/geminiService';
  import { getProducts, getVendors } from '$lib/mockData';
  import { fileToCompressedDataURL, productImg, imgFallback } from '$lib/imageUpload';
  import { BD_LOCATIONS } from '$lib/locationData';
  import type { Product } from '$lib/types';

  let activeTool = $state<'TRYON' | 'IMAGINE' | 'MAKEUP' | 'STYLE'>('TRYON');
  let stylePrompt = $state('Vintage Heritage / Warm Film');

  // AI Imaginator (Free Image Generator) states
  let imaginePrompt = $state('লাল ও সোনালি ঢাকাই জামদানি শাড়ি পরিহিত বাংলাদেশি মডেল, রাজকীয় স্টুডিও লাইটিং');
  let imagineAspectRatio = $state<'3:4' | '1:1' | '16:9'>('3:4');
  let imagineQuality = $state<'turbo' | 'hd'>('turbo');
  let useImagineRef = $state(false);
  let imagineHistory = $state<{ url: string; prompt: string; engine?: string | null }[]>([]);
  let showOriginalCompare = $state(false);

  const IMAGINE_PRESETS = [
    {
      label: 'ঢাকাই জামদানি',
      sub: 'Dhakai Jamdani Editorial',
      prompt: 'লাল ও সোনালি ঢাকাই জামদানি শাড়ি পরিহিত বাংলাদেশি মডেল, রাজকীয় স্টুডিও লাইটিং, 8k fashion photography'
    },
    {
      label: 'রয়্যাল পাঞ্জাবি',
      sub: 'Royal Panjabi Lookbook',
      prompt: 'গাঢ় পান্না সবুজ সিল্কের এমব্রয়ডারি পাঞ্জাবি পরা বাংলাদেশি তরুণ মডেল, লাক্সারি লুকবুক ফটোগ্রাফি'
    },
    {
      label: 'ব্রাইডাল কাতান',
      sub: 'Bridal Katan & Gold',
      prompt: 'মেরুন বেনারসি কাতান শাড়ি ও ঐতিহ্যবাহী গহনা পরা বাংলাদেশি কনে, সিনেমাটিক গোল্ডেন লাইটিং'
    },
    {
      label: 'পহেলা বৈশাখ',
      sub: 'Festive Boishakh',
      prompt: 'সাদা ও লাল পাড়ের তাঁতের শাড়ি এবং খোঁপায় বেলি ফুলের মালা পরা বাঙালি মডেল, সকালের স্নিগ্ধ আলো'
    },
    {
      label: 'লাক্সারি বোরকা',
      sub: 'Modest Abaya Gown',
      prompt: 'কালো ও রোজ-গোল্ড এমব্রয়ডারি করা দুবাই সিল্ক বোরকা ও হিজাব পরিহিত এলিগ্যান্ট মডেল, মডার্ন স্টুডিও'
    },
    {
      label: 'ঈদ থ্রি-পিস',
      sub: 'Festive Three-Piece',
      prompt: 'প্যাস্টেল অর্গানজা ও সিল্কের কাজ করা বাংলাদেশি ডিজাইনার থ্রি-পিস ও দোপাট্টা, বোকাহ গার্ডেন ব্যাকগ্রাউন্ড'
    },
    {
      label: 'মডার্ন ফিউশন',
      sub: 'Dhaka Streetwear',
      prompt: 'Contemporary Dhaka street fashion model wearing premium graphic t-shirt and tailored jacket, twilight urban glow'
    },
    {
      label: 'প্রোডাক্ট শুট',
      sub: 'Commercial Studio Ad',
      prompt: 'Luxury folded silk Jamdani saree and golden jewelry displayed on a white marble podium with warm rim lighting'
    }
  ];

  const DEMO_SILHOUETTES = [
    { label: 'Female Model 1', url: '/products/threepiece-1.jpg' },
    { label: 'Female Model 2', url: '/products/saree-2.jpg' },
    { label: 'Male Model 1', url: '/products/panjabi-2.jpg' }
  ];

  // Cosmetics try-on — selfie + a shade → recoloured lips/cheeks/eyes
  const MAKEUP_KINDS = [
    { id: 'lipstick', label: 'লিপস্টিক' },
    { id: 'blush', label: 'ব্লাশ' },
    { id: 'eyeshadow', label: 'আইশ্যাডো' }
  ];
  const SHADES = [
    { name: 'Classic Red', hex: '#c8102e' },
    { name: 'Maroon', hex: '#7b1e3a' },
    { name: 'Coral', hex: '#ff6f61' },
    { name: 'Nude Pink', hex: '#c98a7a' },
    { name: 'Berry', hex: '#8e2e5d' },
    { name: 'Plum', hex: '#5e2750' },
    { name: 'Rose', hex: '#d6688a' },
    { name: 'Brick', hex: '#a63a2a' }
  ];
  let makeupKind = $state('lipstick');
  let selectedShade = $state<{ name: string; hex: string } | null>(SHADES[0]);
  let result = $state<any>(null);
  let studioError = $state<string | null>(null);
  let isProcessing = $state(false);
  let isCameraActive = $state(false);
  let selectedProduct = $state<Product | null>(null);
  let capturedImage = $state<string | null>(null);
  let showSizeGuide = $state(false);
  let overlayOpacity = $state(0.4);
  let videoRef: HTMLVideoElement | undefined = $state(undefined);
  let canvasRef: HTMLCanvasElement | undefined = $state(undefined);
  let fileInputRef: HTMLInputElement | undefined = $state(undefined);
  let stream = $state<MediaStream | null>(null);
  let products = $state<any[]>([]);
  let vendors = $state<any[]>([]);
  let categoryFilter = $state('All');
  let districtFilter = $state('All');

  let filteredProducts = $derived(products.filter(p => {
    const vendor = vendors.find(v => v.id === p.vendorId);
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesDistrict = districtFilter === 'All' || vendor?.district === districtFilter;
    return matchesCategory && matchesDistrict;
  }));

  $effect(() => {
    if (!browser) return;
    const t = new URLSearchParams(window.location.search).get('tool');
    if (t === 'makeup') activeTool = 'MAKEUP';
    else if (t === 'imagine' || t === 'generator') activeTool = 'IMAGINE';
    else if (t === 'style') activeTool = 'STYLE';

    const refresh = () => {
      products = getProducts();
      vendors = getVendors();
      if (!selectedProduct && products.length > 0) {
        selectedProduct = products[0];
      }
    };
    refresh();
    window.addEventListener('productUpdated', refresh);
    window.addEventListener('vendorUpdated', refresh);
    return () => {
      window.removeEventListener('productUpdated', refresh);
      window.removeEventListener('vendorUpdated', refresh);
    };
  });

  $effect(() => {
    const currentStream = stream;
    return () => {
      if (currentStream) currentStream.getTracks().forEach(track => track.stop());
    };
  });

  /**
   * Sample the center pixels of the selected product image on an offscreen canvas
   * so the Free Neural Engine receives an accurate RGB/Hex color hint even for external URLs.
   */
  async function sampleProductColorClient(imgUrl: string): Promise<string> {
    if (!browser || !imgUrl) return '';
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(''), 1800);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const c = document.createElement('canvas');
          c.width = 24;
          c.height = 24;
          const ctx = c.getContext('2d');
          if (!ctx) return resolve('');
          const sx = img.naturalWidth * 0.25;
          const sy = img.naturalHeight * 0.25;
          const sw = Math.max(1, img.naturalWidth * 0.5);
          const sh = Math.max(1, img.naturalHeight * 0.5);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 24, 24);
          const data = ctx.getImageData(0, 0, 24, 24).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) continue;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
          if (!count) return resolve('');
          const hex = '#' + [r / count, g / count, b / count]
            .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
            .join('');
          resolve(hex);
        } catch {
          resolve('');
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve('');
      };
      img.src = imgUrl;
    });
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      studioError = 'এই ব্রাউজারে ক্যামেরা সমর্থন করে না — ছবি আপলোড করুন।';
      return;
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      stream = newStream;
      capturedImage = null;
      studioError = null;
      isCameraActive = true;
      await tick();
      if (videoRef) {
        videoRef.srcObject = newStream;
        try { await videoRef.play(); } catch { /* iOS muted autoplay */ }
      }
    } catch (err) {
      console.error('Camera access denied', err);
      isCameraActive = false;
      studioError = 'ক্যামেরা চালু করা যায়নি — অনুমতি দিন, নাহলে ছবি আপলোড করুন।';
    }
  };

  const captureFrame = () => {
    if (videoRef && canvasRef) {
      const canvas = canvasRef;
      const video = videoRef;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedImage = canvas.toDataURL('image/jpeg', 0.85);
        isCameraActive = false;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
      }
    }
  };

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      capturedImage = await fileToCompressedDataURL(file);
      result = null;
      studioError = null;
      isCameraActive = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
    }
  };

  const useAsTryOnModel = (imgUrl: string) => {
    capturedImage = imgUrl;
    result = null;
    studioError = null;
    activeTool = 'TRYON';
  };

  const handleRun = async () => {
    if (activeTool === 'TRYON' && (!selectedProduct || (!capturedImage && !isCameraActive))) return;
    if (activeTool === 'MAKEUP' && (!selectedShade || (!capturedImage && !isCameraActive))) return;
    if (activeTool === 'STYLE' && (!capturedImage && !isCameraActive)) return;
    if (activeTool === 'IMAGINE' && !imaginePrompt.trim()) return;

    isProcessing = true;
    result = null;
    studioError = null;
    showOriginalCompare = false;
    const busyMsg = 'Aura ফ্রি নিউরাল ইঞ্জিন এখন ব্যস্ত — অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।';

    try {
      if (activeTool !== 'IMAGINE' && isCameraActive && !capturedImage) {
        captureFrame();
        await new Promise((r) => setTimeout(r, 100));
      }

      if (activeTool === 'TRYON') {
        if (selectedProduct && capturedImage) {
          const colorHint = await sampleProductColorClient(selectedProduct.imageUrl || '');
          const transformed = await generateTryOnTransformation(
            capturedImage,
            selectedProduct.imageUrl!,
            selectedProduct.category,
            selectedProduct.name,
            selectedProduct.description,
            colorHint
          );
          if (transformed.image) {
            result = {
              type: 'TRYON',
              url: transformed.image,
              product: selectedProduct,
              engine: transformed.engine || 'flux-kontext-free'
            };
          } else {
            studioError = transformed.error || busyMsg;
          }
        }
      } else if (activeTool === 'IMAGINE') {
        const refImg = useImagineRef
          ? (capturedImage || selectedProduct?.imageUrl || undefined)
          : undefined;
        const generated = await generateFreeStudioImage({
          prompt: imaginePrompt,
          referenceImage: refImg,
          aspectRatio: imagineAspectRatio,
          quality: imagineQuality
        });
        if (generated.image) {
          result = {
            type: 'IMAGINE',
            url: generated.image,
            prompt: imaginePrompt,
            engine: generated.engine || (imagineQuality === 'hd' ? 'flux-merged-hd' : 'flux-schnell-free')
          };
          imagineHistory = [{ url: generated.image, prompt: imaginePrompt, engine: generated.engine }, ...imagineHistory.slice(0, 7)];
        } else {
          studioError = generated.error || busyMsg;
        }
      } else if (activeTool === 'MAKEUP') {
        if (capturedImage && selectedShade) {
          const transformed = await generateMakeupTryOn(capturedImage, `${selectedShade.name} (${selectedShade.hex})`, makeupKind);
          if (transformed.image) {
            result = { type: 'MAKEUP', url: transformed.image, shade: selectedShade, engine: transformed.engine };
          } else {
            studioError = transformed.error || busyMsg;
          }
        }
      } else if (capturedImage) {
        const transformed = await generateStyleTransfer(capturedImage, stylePrompt);
        if (transformed.image) {
          result = { type: 'STYLE', url: transformed.image, engine: transformed.engine };
        } else {
          studioError = transformed.error || busyMsg;
        }
      }
    } catch (error: any) {
      console.error(error);
      studioError = busyMsg;
    } finally {
      isProcessing = false;
    }
  };

  let addedToCart = $state(false);
  function addStudioToCart() {
    const p = result?.product || selectedProduct;
    if (!p) return;
    try {
      const cart = JSON.parse(localStorage.getItem('aura_cart') || '[]');
      const i = cart.findIndex((x: any) => x.id === p.id);
      if (i > -1) cart[i].quantity += 1;
      else cart.push({ ...p, quantity: 1, size: null });
      localStorage.setItem('aura_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      addedToCart = true;
      setTimeout(() => (addedToCart = false), 2200);
    } catch {
      /* ignore storage errors */
    }
  }

  async function shareResult() {
    const url = result?.url;
    if (!url) return;
    const text = result?.product ? `আমার Aura Try-On — ${result.product.name} · Snehalata` : 'আমার Aura AI স্টুডিও লুক · Snehalata';
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], 'aura-studio.png', { type: blob.type || 'image/png' });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], text });
        return;
      }
    } catch {
      /* fall through to link share */
    }
    try {
      if (navigator.share) { await navigator.share({ text, url: 'https://www.snehalata.com/studio' }); return; }
      await navigator.clipboard.writeText(text + ' https://www.snehalata.com/studio');
      alert('লিংক কপি হয়েছে!');
    } catch {
      /* ignore */
    }
  }

  const STYLE_VIBES = ['Vintage Heritage', 'Classic Oil', 'Sketch', 'Studio Portrait', 'Golden Hour', 'Editorial'];
  const PRODUCT_CATEGORIES = ['All', 'Saree', 'Panjabi', 'Three-Piece', 'Borka', 'Shirt', 'T-Shirt', 'Pant', 'Baby'];
</script>

{#snippet toolTab(active, IconComponent, label, sub, badge, onClick)}
  <button
    type="button"
    onclick={onClick}
    class="w-full text-left p-5 sm:p-6 rounded-3xl border transition-all flex items-center gap-4 relative overflow-hidden cursor-pointer {active ? 'bg-aura-green border-aura-green shadow-[0_10px_30px_rgba(16,185,129,0.3)]' : 'bg-aura-glass border-aura-glassBorder hover:border-aura-green/50'}"
  >
    {#if badge}
      <span class="absolute top-2.5 right-3 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest {active ? 'bg-black/30 text-white' : 'bg-aura-gold/20 text-aura-gold border border-aura-gold/30'}">{badge}</span>
    {/if}
    <div class="p-3 rounded-2xl {active ? 'bg-white/20' : 'bg-white/5'}">
      <svelte:component this={IconComponent} size={16} />
    </div>
    <div class="min-w-0">
      <div class="text-xs font-black uppercase tracking-widest truncate {active ? 'text-white' : 'text-gray-300'}">{label}</div>
      <div class="text-[8px] uppercase tracking-widest mt-1 truncate {active ? 'text-white/70' : 'text-gray-500'}">{sub}</div>
    </div>
  </button>
{/snippet}

<div class="min-h-screen bg-aura-black pb-20 pt-10 px-6">
  <div class="max-w-6xl mx-auto">
    <header class="mb-12 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aura-gold/10 border border-aura-gold/20 mb-6">
        <Sparkles size={14} class="text-aura-gold" />
        <span class="text-[10px] font-black uppercase tracking-widest text-aura-gold">Neural Creative Hub • 100% Free AI Engine</span>
      </div>
      <h1 class="text-5xl font-serif font-black text-white mb-4">Aura Studio</h1>
      <p class="text-gray-400 max-w-2xl mx-auto text-sm">
        Try heritage looks on yourself with <span class="text-aura-green font-bold">Free Neural AR Try-On</span>, generate unlimited fashion imagery with <span class="text-aura-gold font-bold">AI Imaginator</span>, or restyle your portrait.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-10">
      <aside class="flex lg:flex-col gap-3 overflow-x-auto no-scrollbar min-w-0">
        <div class="min-w-[220px] lg:min-w-0">
          {@render toolTab(activeTool === 'TRYON', Camera, 'Neural AR Try-On', 'Live Vision • Virtual Fit', 'FREE HD', () => { activeTool = 'TRYON'; result = null; studioError = null; })}
        </div>
        <div class="min-w-[220px] lg:min-w-0">
          {@render toolTab(activeTool === 'IMAGINE', Wand2, 'AI Imaginator', 'Free Image Generator', 'NEW • FREE', () => { activeTool = 'IMAGINE'; result = null; studioError = null; })}
        </div>
        <div class="min-w-[220px] lg:min-w-0">
          {@render toolTab(activeTool === 'MAKEUP', Sparkles, 'Makeup Try-On', 'Selfie • Lip & Shade', 'FREE', () => { activeTool = 'MAKEUP'; result = null; studioError = null; })}
        </div>
        <div class="min-w-[220px] lg:min-w-0">
          {@render toolTab(activeTool === 'STYLE', Palette, 'Style Transfer', 'Creative • Photo Restyle', 'FREE', () => { activeTool = 'STYLE'; result = null; studioError = null; })}
        </div>
      </aside>

      <main class="lg:col-span-3 space-y-8 min-w-0">
        <div class="bg-aura-glass border border-aura-glassBorder rounded-[2.5rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-aura-green/5 blur-[100px] pointer-events-none" />

          <div class="relative z-10 space-y-6">
            {#if activeTool === 'TRYON'}
              <div class="flex flex-wrap justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 gap-4">
                <div class="flex gap-4 items-center overflow-x-auto no-scrollbar">
                  <div class="flex gap-2">
                    {#each PRODUCT_CATEGORIES as cat}
                      <button
                        type="button"
                        onclick={() => categoryFilter = cat}
                        class="px-4 py-2 rounded-xl text-[10px] font-bold border transition-all flex-shrink-0 cursor-pointer {categoryFilter === cat ? 'bg-aura-green border-aura-green text-white' : 'bg-white/5 border-white/10 text-gray-400'}"
                      >
                        {cat}
                      </button>
                    {/each}
                  </div>
                  <div class="h-4 w-px bg-white/10" />
                  <select bind:value={districtFilter} class="bg-transparent text-white text-[10px] font-black uppercase tracking-wider focus:outline-none cursor-pointer pr-4 hover:text-aura-green transition-colors border-none">
                    <option value="All" class="bg-aura-black">All Districts</option>
                    {#each Object.keys(BD_LOCATIONS).sort() as d}
                      <option value={d} class="bg-aura-black">{d}</option>
                    {/each}
                  </select>
                </div>
                <div class="flex items-center gap-4">
                  <button type="button" onclick={() => showSizeGuide = !showSizeGuide} class="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 font-black hover:text-aura-green transition-colors cursor-pointer">
                    <Ruler size={14} /> Size Guide
                  </button>
                  <div class="text-[10px] uppercase tracking-widest text-aura-green font-black">
                    {selectedProduct ? `Selected: ${selectedProduct.name}` : 'Select an item to try on'}
                  </div>
                </div>
              </div>
            {/if}

            {#if activeTool === 'IMAGINE'}
              <div class="space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-aura-green block">✨ Free Neural Fashion & Heritage Image Generator</span>
                    <p class="text-xs text-gray-400 mt-1">বাংলা, বাংলিশ অথবা English-এ আপনার মনের মতো পোশাক ও মডেলের বর্ণনা লিখুন — ১০০% ফ্রি আনলিমিটেড জেনারেশন।</p>
                  </div>
                  <div class="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    <button
                      type="button"
                      onclick={() => imagineQuality = 'turbo'}
                      class="px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer {imagineQuality === 'turbo' ? 'bg-aura-green text-white shadow-lg' : 'text-gray-400 hover:text-white'}"
                    >
                      ⚡ Turbo (3s)
                    </button>
                    <button
                      type="button"
                      onclick={() => imagineQuality = 'hd'}
                      class="px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer {imagineQuality === 'hd' ? 'bg-aura-gold text-black shadow-lg' : 'text-gray-400 hover:text-white'}"
                    >
                      ✨ Ultra HD (8-Step)
                    </button>
                  </div>
                </div>

                <div>
                  <label class="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">১-ক্লিক ফ্যাশন প্রিসেট · Instant Heritage Presets</label>
                  <div class="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
                    {#each IMAGINE_PRESETS as preset}
                      <button
                        type="button"
                        onclick={() => imaginePrompt = preset.prompt}
                        class="px-4 py-2.5 rounded-2xl border text-left transition-all flex-shrink-0 cursor-pointer {imaginePrompt === preset.prompt ? 'bg-aura-green/20 border-aura-green text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-300 hover:border-aura-green/40'}"
                      >
                        <div class="text-[10px] font-black text-white">{preset.label}</div>
                        <div class="text-[8px] uppercase tracking-wider text-gray-400 mt-0.5">{preset.sub}</div>
                      </button>
                    {/each}
                  </div>
                </div>

                <div class="space-y-3">
                  <textarea
                    bind:value={imaginePrompt}
                    rows="2"
                    placeholder="উদাহরণ: লাল জামদানি শাড়ি পরা বাংলাদেশি মডেল, রাজকীয় স্টুডিও লাইটিং..."
                    class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-aura-green transition-all resize-none"
                  ></textarea>

                  <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                      <span class="text-[9px] font-black uppercase tracking-widest text-gray-500 mr-1"> সাইজ / Ratio:</span>
                      {#each [
                        { id: '3:4', label: '3:4 Portrait' },
                        { id: '1:1', label: '1:1 Square' },
                        { id: '16:9', label: '16:9 Cinema' }
                      ] as ratio}
                        <button
                          type="button"
                          onclick={() => imagineAspectRatio = ratio.id as any}
                          class="px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer {imagineAspectRatio === ratio.id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}"
                        >
                          {ratio.label}
                        </button>
                      {/each}
                    </div>

                    <label class="flex items-center gap-2.5 text-[10px] font-bold text-gray-300 cursor-pointer select-none bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-aura-green/40">
                      <input type="checkbox" bind:checked={useImagineRef} class="accent-aura-green rounded cursor-pointer" />
                      <span>Use Uploaded Photo / Selected Product as Reference (Kontext Remix)</span>
                    </label>
                  </div>
                </div>
              </div>
            {/if}

            {#if activeTool === 'STYLE'}
              <div class="space-y-4">
                <label class="text-[10px] font-black uppercase tracking-widest text-aura-green px-2">Neural Artistic Vibe</label>
                <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {#each STYLE_VIBES as v}
                    <button
                      type="button"
                      onclick={() => stylePrompt = v}
                      class="px-6 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 cursor-pointer {stylePrompt === v ? 'bg-aura-green border-aura-green text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}"
                    >
                      {v}
                    </button>
                  {/each}
                </div>
                <input type="text" bind:value={stylePrompt} placeholder="Or specify a custom artistic medium in Bengali or English..." class="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white focus:outline-none focus:border-aura-green transition-all" />
              </div>
            {/if}

            {#if activeTool === 'MAKEUP'}
              <div class="space-y-4">
                <div class="flex gap-2">
                  {#each MAKEUP_KINDS as k}
                    <button type="button" onclick={() => makeupKind = k.id}
                      class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer {makeupKind === k.id ? 'bg-aura-green border-aura-green text-white' : 'bg-white/5 border-white/10 text-gray-400'}">{k.label}</button>
                  {/each}
                </div>
                <label class="text-[10px] font-black uppercase tracking-widest text-aura-green px-1 block">শেড বেছে নিন · Pick a shade</label>
                <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {#each SHADES as s}
                    <button type="button" onclick={() => selectedShade = s} title={s.name}
                      class="flex-shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer">
                      <span class="w-11 h-11 rounded-full border-2 transition-all {selectedShade?.name === s.name ? 'border-white scale-110 ring-2 ring-aura-green' : 'border-white/20 group-hover:border-white/50'}" style="background:{s.hex}"></span>
                      <span class="text-[8px] font-bold uppercase tracking-wide {selectedShade?.name === s.name ? 'text-white' : 'text-gray-500'}">{s.name}</span>
                    </button>
                  {/each}
                </div>
                <p class="text-[10px] text-gray-400 italic px-1">সেলফি তুলুন বা আপলোড করুন — Aura আপনার {makeupKind === 'blush' ? 'গালে' : makeupKind === 'eyeshadow' ? 'চোখে' : 'ঠোঁটে'} শেডটা নিখুঁতভাবে বসিয়ে দেখাবে।</p>
              </div>
            {/if}

            {#if activeTool === 'TRYON' && showSizeGuide}
              <div transition:slide class="bg-aura-green/5 border border-aura-green/20 rounded-3xl p-6">
                <div class="flex justify-between items-start mb-6">
                  <h4 class="text-[10px] font-black uppercase tracking-widest text-aura-green flex items-center gap-2">
                    <Info size={14} /> Neural Fitting Guidelines & Measurements
                  </h4>
                  <button type="button" onclick={() => showSizeGuide = false} class="text-gray-600 hover:text-white"><X size={14} /></button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div class="space-y-4">
                    <div class="text-[10px] font-bold text-white uppercase tracking-widest pb-2 border-b border-white/5">Standard Fit Node Matrix (inches)</div>
                    <div class="space-y-2">
                      <div class="flex justify-between text-[10px]">
                        <span class="text-gray-500 uppercase tracking-widest">Small</span>
                        <span class="text-white font-mono">Chest 36 • Length 40</span>
                      </div>
                      <div class="flex justify-between text-[10px]">
                        <span class="text-gray-500 uppercase tracking-widest">Medium</span>
                        <span class="text-white font-mono">Chest 38 • Length 42</span>
                      </div>
                      <div class="flex justify-between text-[10px]">
                        <span class="text-gray-500 uppercase tracking-widest">Large</span>
                        <span class="text-white font-mono">Chest 40 • Length 44</span>
                      </div>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div class="text-[10px] font-bold text-white uppercase tracking-widest pb-2 border-b border-white/5">Neural Quality Assurance</div>
                    <p class="text-[10px] text-gray-500 leading-relaxed italic">"The engine adjusts fabric drape based on identified shoulder-to-waist ratios. Ensure a clear silhouette for the most accurate fit."</p>
                    <div class="flex gap-4">
                      <div class="p-2 bg-aura-green/10 rounded-lg flex items-center gap-2 border border-aura-green/20">
                        <CheckCircle2 size={10} class="text-aura-green" />
                        <span class="text-[8px] font-black uppercase text-aura-green">HD Mapping OK</span>
                      </div>
                      <div class="p-2 bg-green-500/10 rounded-lg flex items-center gap-2 border border-green-500/20">
                        <Zap size={10} class="text-green-500" />
                        <span class="text-[8px] font-black uppercase text-green-500">Live Calibration Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}

            {#if activeTool === 'TRYON' || (activeTool === 'IMAGINE' && useImagineRef)}
              <div class="overflow-x-auto no-scrollbar flex gap-4 pb-2">
                {#each filteredProducts as p (p.id)}
                  <button
                    type="button"
                    onclick={() => selectedProduct = p}
                    class="flex-shrink-0 w-32 h-40 rounded-2xl overflow-hidden border-2 transition-all group relative cursor-pointer {selectedProduct?.id === p.id ? 'border-aura-green scale-95 ring-4 ring-aura-green/20' : 'border-white/10 hover:border-white/30'}"
                  >
                    <img src={productImg(p.imageUrl, 300)} onerror={imgFallback} loading="lazy" decoding="async" alt={p.name} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent">
                      <div class="text-[8px] font-black uppercase text-white truncate">{p.name}</div>
                      <div class="text-[8px] font-bold text-aura-gold">৳{p.price.toLocaleString()}</div>
                    </div>
                  </button>
                {/each}
              </div>
            {/if}

            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex flex-wrap gap-3 items-center">
                <input type="file" bind:this={fileInputRef} onchange={handleFileUpload} accept="image/*" class="hidden" />
                {#if activeTool !== 'IMAGINE' || useImagineRef}
                  <button
                    type="button"
                    onclick={() => fileInputRef?.click()}
                    class="px-6 py-4 bg-white/5 border border-white/10 text-gray-300 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-white hover:text-black transition-all shadow-xl cursor-pointer"
                  >
                    <Upload size={14} /> Upload Photo
                  </button>
                  <button
                    type="button"
                    onclick={startCamera}
                    class="px-6 py-4 bg-aura-green/10 border border-aura-green/20 text-aura-green rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-aura-green hover:text-white transition-all shadow-xl shadow-aura-green/5 cursor-pointer"
                  >
                    <RefreshCw size={14} /> {isCameraActive ? 'Reset Vision' : 'Activate Vision'}
                  </button>
                {/if}
                {#if activeTool === 'TRYON'}
                  <div class="flex items-center gap-2 pl-1">
                    <span class="text-[9px] font-black uppercase tracking-widest text-gray-500">Demo Model:</span>
                    {#each DEMO_SILHOUETTES as dm}
                      <button
                        type="button"
                        onclick={() => { capturedImage = dm.url; result = null; studioError = null; }}
                        class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold text-gray-300 hover:border-aura-green hover:text-white transition-all cursor-pointer"
                      >
                        {dm.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              <button
                type="button"
                onclick={handleRun}
                disabled={
                  isProcessing ||
                  (activeTool === 'TRYON' && (!selectedProduct || (!capturedImage && !isCameraActive))) ||
                  (activeTool === 'MAKEUP' && (!selectedShade || (!capturedImage && !isCameraActive))) ||
                  (activeTool === 'STYLE' && (!capturedImage && !isCameraActive)) ||
                  (activeTool === 'IMAGINE' && !imaginePrompt.trim())
                }
                class="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center gap-3 hover:bg-aura-green hover:text-white transition-all shadow-xl disabled:opacity-50 cursor-pointer"
              >
                {#if isProcessing}
                  <Loader2 size={16} class="animate-spin" />
                {:else if activeTool === 'IMAGINE'}
                  <Wand2 size={16} />
                {:else}
                  <Zap size={16} />
                {/if}
                {isProcessing
                  ? 'Synthesizing...'
                  : activeTool === 'TRYON'
                    ? 'Synthesize AR Look'
                    : activeTool === 'IMAGINE'
                      ? 'Generate Free AI Image'
                      : activeTool === 'MAKEUP'
                        ? 'Apply Makeup'
                        : 'Synthesize Style'}
              </button>
            </div>
          </div>
        </div>

        <div class="w-full bg-aura-glass border border-aura-glassBorder rounded-[2.5rem] min-h-[420px] sm:min-h-[520px] flex items-center justify-center relative overflow-hidden {activeTool === 'TRYON' ? 'lg:aspect-video' : ''}">
          {#if isProcessing}
            <div class="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-aura-green to-transparent z-20 shadow-[0_0_20px_rgba(16,185,129,1)] scan-line" />
            <div class="flex flex-col items-center gap-6 relative z-10 p-6">
              <div class="relative">
                <div class="w-16 h-16 border-4 border-aura-green border-t-transparent rounded-full animate-spin" />
                <div class="absolute inset-0 flex items-center justify-center">
                  <Zap size={14} class="text-aura-green animate-pulse" />
                </div>
              </div>
              <div class="space-y-2 text-center">
                <p class="text-[10px] font-black uppercase tracking-[0.3em] text-aura-green">
                  {activeTool === 'IMAGINE' ? 'Synthesizing Free AI Fashion Look' : 'Synthesizing Neural Flow'}
                </p>
                <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  {activeTool === 'TRYON'
                    ? 'Analyzing garment colors & weave • Fitting silhouette'
                    : activeTool === 'IMAGINE'
                      ? 'Running FLUX.1 Neural Diffusion Engine'
                      : 'Applying style matrices • Map reconstruction'}
                </p>
              </div>
            </div>
          {:else if result}
            <div class="w-full h-full p-6">
              {#if result.type === 'TRYON'}
                <div transition:scale class="relative w-full h-full duration-700">
                  <img src={showOriginalCompare && capturedImage ? capturedImage : result.url} class="w-full h-full object-contain rounded-3xl max-h-[540px] mx-auto" alt="Try-on result" />
                  <div class="absolute top-4 left-4 flex flex-wrap items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10">
                    <CheckCircle2 size={15} class="text-green-400" />
                    <span class="text-[10px] font-black uppercase tracking-widest text-white">Neural Try-On Complete</span>
                  </div>
                  <div class="absolute top-4 right-4 flex items-center gap-2">
                    {#if capturedImage}
                      <button
                        type="button"
                        onclick={() => showOriginalCompare = !showOriginalCompare}
                        class="px-4 py-2.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-aura-green transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} /> {showOriginalCompare ? 'Show AI Try-On' : 'Compare Original'}
                      </button>
                    {/if}
                    <a href={result.url} download="aura-tryon.png" title="Download" aria-label="Download look" class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all"><Download size={18} /></a>
                    <button type="button" onclick={shareResult} title="Share" aria-label="Share look" class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all cursor-pointer"><Share2 size={18} /></button>
                  </div>
                  <div class="mt-4 sm:mt-0 sm:absolute sm:bottom-6 sm:left-6 sm:right-6 md:left-auto p-4 sm:p-5 bg-aura-glass backdrop-blur-3xl border border-aura-glassBorder rounded-[2rem] flex items-center gap-4 sm:gap-6 shadow-2xl">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <img src={result.product.imageUrl} class="w-full h-full object-cover" alt={result.product.name} />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="text-[10px] font-black uppercase tracking-widest text-aura-green mb-1">{result.product.category}</div>
                      <div class="text-white font-bold truncate">{result.product.name}</div>
                      <div class="text-aura-gold font-mono text-sm mt-1">৳{result.product.price.toLocaleString()}</div>
                    </div>
                    <div class="flex flex-col gap-2 shrink-0">
                      <button type="button" onclick={addStudioToCart}
                        class="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer {addedToCart ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-aura-green hover:text-white'}">
                        {#if addedToCart}<CheckCircle2 size={14} /> Added{:else}<ShoppingBag size={14} /> Add to Cart{/if}
                      </button>
                      {#if addedToCart}
                        <a href="/cart" class="text-[9px] font-black uppercase tracking-widest text-aura-green text-center hover:text-white transition-colors">View Cart →</a>
                      {/if}
                    </div>
                  </div>
                </div>
              {/if}

              {#if result.type === 'IMAGINE'}
                <div transition:scale class="relative w-full h-full duration-700 flex flex-col items-center">
                  <img src={result.url} class="w-full max-h-[520px] object-contain rounded-3xl" alt="AI Generated Fashion Look" />
                  <div class="absolute top-4 left-4 flex items-center gap-2.5 bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10">
                    <Wand2 size={15} class="text-aura-gold" />
                    <span class="text-[10px] font-black uppercase tracking-widest text-white">Aura AI Imaginator • Free HD</span>
                  </div>
                  <div class="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onclick={() => useAsTryOnModel(result.url)}
                      class="px-4 py-2.5 bg-aura-green text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-white hover:text-black transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={13} /> এই মডেলে পোশাক ট্রাই-অন করুন
                    </button>
                    <a href={result.url} download="aura-imaginator.png" title="Download" class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all"><Download size={18} /></a>
                    <button type="button" onclick={shareResult} title="Share" class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all cursor-pointer"><Share2 size={18} /></button>
                  </div>
                </div>
              {/if}

              {#if result.type === 'STYLE'}
                <div transition:scale class="relative w-full h-full duration-700">
                  <img src={showOriginalCompare && capturedImage ? capturedImage : result.url} class="w-full h-full object-contain rounded-3xl max-h-[520px] mx-auto" alt="Style transfer result" />
                  <div class="absolute top-4 left-4 flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
                    <Palette size={16} class="text-aura-green" />
                    <span class="text-[10px] font-black uppercase tracking-widest text-white">Neural Style Transfer Applied</span>
                  </div>
                  <div class="absolute top-4 right-4 flex items-center gap-2">
                    {#if capturedImage}
                      <button
                        type="button"
                        onclick={() => showOriginalCompare = !showOriginalCompare}
                        class="px-4 py-2.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-aura-green transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} /> {showOriginalCompare ? 'Show Styled' : 'Compare Original'}
                      </button>
                    {/if}
                    <a href={result.url} download="aura-style.png" class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all"><Download size={18} /></a>
                    <button type="button" onclick={shareResult} class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all cursor-pointer"><Share2 size={18} /></button>
                  </div>
                </div>
              {/if}

              {#if result.type === 'MAKEUP'}
                <div transition:scale class="relative w-full h-full duration-700">
                  <img src={showOriginalCompare && capturedImage ? capturedImage : result.url} class="w-full h-full object-contain rounded-3xl max-h-[520px] mx-auto" alt="Makeup try-on result" />
                  <div class="absolute top-4 left-4 flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
                    <CheckCircle2 size={16} class="text-green-400" />
                    <span class="text-[10px] font-black uppercase tracking-widest text-white">Makeup Applied</span>
                  </div>
                  <div class="absolute top-4 right-4 flex items-center gap-2">
                    {#if capturedImage}
                      <button
                        type="button"
                        onclick={() => showOriginalCompare = !showOriginalCompare}
                        class="px-4 py-2.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-aura-green transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} /> {showOriginalCompare ? 'Show Makeup' : 'Compare Original'}
                      </button>
                    {/if}
                    <a href={result.url} download="aura-makeup.png" title="Download" aria-label="Download look" class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all"><Download size={18} /></a>
                    <button type="button" onclick={shareResult} title="Share" aria-label="Share look" class="p-3 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white hover:text-black transition-all cursor-pointer"><Share2 size={18} /></button>
                  </div>
                  {#if result.shade}
                    <div class="absolute bottom-6 right-6 flex items-center gap-3 bg-aura-glass backdrop-blur-3xl border border-aura-glassBorder rounded-full pl-3 pr-5 py-2 shadow-2xl">
                      <span class="w-7 h-7 rounded-full border border-white/20" style="background:{result.shade.hex}"></span>
                      <span class="text-white font-bold text-xs">{result.shade.name}</span>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {:else if studioError}
            <div class="flex flex-col items-center justify-center gap-6 text-center p-10">
              <div class="w-16 h-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Zap size={28} class="text-amber-400" />
              </div>
              <p class="text-gray-300 text-sm max-w-xs leading-relaxed">{studioError}</p>
              <button type="button" onclick={handleRun} class="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-aura-green hover:text-white transition-all cursor-pointer">Try Again</button>
            </div>
          {:else if activeTool === 'IMAGINE'}
            <div class="flex flex-col items-center justify-center gap-6 text-center p-10">
              <div class="p-10 bg-aura-gold/10 rounded-[3rem] border border-aura-gold/20 flex items-center justify-center">
                <Wand2 size={56} class="text-aura-gold" />
              </div>
              <div>
                <h3 class="text-3xl font-serif font-black text-white mb-2 uppercase tracking-tight">Aura Free AI Imaginator</h3>
                <p class="text-gray-400 text-sm max-w-md mx-auto">
                  উপরে যেকোনো প্রিসেট বেছে নিন অথবা বাংলায়/ইংরেজিতে আপনার পছন্দের পোশাকের বিবরণ লিখে <span class="text-aura-green font-black">Generate Free AI Image</span> বাটনে ক্লিক করুন।
                </p>
              </div>
              <button
                type="button"
                onclick={handleRun}
                class="px-10 py-5 bg-aura-green text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all shadow-2xl flex items-center gap-3 cursor-pointer"
              >
                <Wand2 size={16} /> Generate Free AI Image Now
              </button>
            </div>
          {:else}
            <div class="w-full h-full relative group">
              <canvas bind:this={canvasRef} class="hidden" />
              {#if isCameraActive}
                <div class="relative w-full h-full bg-black">
                  <video bind:this={videoRef} autoplay playsinline muted class="w-full h-full object-cover scale-x-[-1]" ></video>
                  <div class="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
                  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-dashed border-aura-green/40 rounded-[3rem] pointer-events-none">
                    <div class="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-aura-green rounded-tl-3xl" />
                    <div class="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-aura-green rounded-tr-3xl" />
                    <div class="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-aura-green rounded-bl-3xl" />
                    <div class="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-aura-green rounded-br-3xl" />
                  </div>

                  {#if activeTool === 'TRYON' && selectedProduct}
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        class="relative w-1/2 h-2/3 shadow-[0_0_100px_rgba(16,185,129,0.2)] animate-pulse"
                        style="opacity: {overlayOpacity}"
                      >
                        <img src={selectedProduct.imageUrl} class="w-full h-full object-contain mix-blend-screen" alt="Overlay preview" />
                        <div class="absolute bottom-[-40px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.4em] text-aura-green bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">Live Projection Overlay</div>
                      </div>

                      <div class="absolute right-10 top-1/2 -translate-y-1/2 w-8 h-48 bg-white/5 border border-white/10 rounded-full flex flex-col items-center justify-between py-6 pointer-events-auto">
                        <span class="text-[8px] font-black vertical-text uppercase tracking-widest text-gray-500">Overlay</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          bind:value={overlayOpacity}
                          class="appearance-none w-32 -rotate-90 bg-aura-green/20 rounded-full h-1 cursor-pointer accent-aura-green"
                        />
                        <Sliders size={14} class="text-aura-green" />
                      </div>
                    </div>
                  {/if}

                  <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                    <button
                      type="button"
                      onclick={captureFrame}
                      class="w-20 h-20 bg-white rounded-full border-8 border-white/20 shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
                    >
                      <div class="w-6 h-6 bg-aura-green rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/10">Capture Neural Silhouette</p>
                  </div>
                </div>
              {:else if capturedImage}
                <div class="relative w-full h-full p-4">
                  <img src={capturedImage} class="w-full h-full object-contain rounded-3xl max-h-[500px] mx-auto" alt="Captured" />
                  <div class="absolute top-6 right-6 flex gap-4">
                    <button type="button" onclick={() => capturedImage = null} class="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-xl cursor-pointer"><X size={20} /></button>
                  </div>
                  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-center bg-black/75 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl shadow-2xl">
                    <p class="text-[10px] font-black uppercase tracking-widest text-aura-green mb-3">
                      {selectedProduct && activeTool === 'TRYON'
                        ? `Ready to Try On: ${selectedProduct.name}`
                        : 'Node Profile Captured • Ready for Neural Processing'}
                    </p>
                    <div class="flex gap-4 justify-center items-center">
                      <button type="button" onclick={handleRun} class="px-5 py-2 bg-aura-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all cursor-pointer">
                        ⚡ Synthesize Now
                      </button>
                      <div class="w-px h-3 bg-white/10" />
                      <button type="button" onclick={() => fileInputRef?.click()} class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors cursor-pointer">Re-upload</button>
                      <div class="w-px h-3 bg-white/10" />
                      <button type="button" onclick={startCamera} class="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors cursor-pointer">Camera</button>
                    </div>
                  </div>
                </div>
              {:else}
                <div class="flex flex-col items-center justify-center gap-8 text-center p-10">
                  <div class="flex gap-6">
                    <div class="p-10 bg-white/5 rounded-[3rem] border border-white/10 group-hover:border-aura-green/30 transition-all duration-700 shadow-inner">
                      <User size={64} class="text-gray-500 group-hover:text-aura-green transition-colors" />
                    </div>
                    <div class="p-10 bg-aura-green/5 rounded-[3rem] border border-aura-green/10 border-dashed animate-pulse flex items-center justify-center">
                      <Scan size={64} class="text-aura-green/40" />
                    </div>
                  </div>
                  <div>
                    <h3 class="text-3xl font-serif font-black text-white mb-3 uppercase tracking-tighter">Neural Grid Vision</h3>
                    <p class="text-gray-500 text-sm max-w-sm">Capture or upload your silhouette to start the <span class="text-aura-green font-black">100% Free Neural AR</span> transformation.</p>
                  </div>
                  <div class="flex flex-wrap gap-4 justify-center">
                    <button
                      type="button"
                      onclick={() => fileInputRef?.click()}
                      class="px-8 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all shadow-xl cursor-pointer"
                    >
                      Upload Photo
                    </button>
                    <button
                      type="button"
                      onclick={startCamera}
                      class="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-aura-green hover:text-white transition-all shadow-2xl cursor-pointer"
                    >
                      Activate Live Vision
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        {#if imagineHistory.length > 0}
          <div class="bg-aura-glass border border-aura-glassBorder rounded-3xl p-5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-widest text-aura-gold">Recent Studio Creations (Session Gallery)</span>
              <span class="text-[9px] text-gray-500 uppercase tracking-widest">Click any creation to preview or try-on</span>
            </div>
            <div class="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {#each imagineHistory as item}
                <div class="flex-shrink-0 w-24 h-32 rounded-2xl overflow-hidden border border-white/10 relative group">
                  <button
                    type="button"
                    onclick={() => { result = { type: 'IMAGINE', url: item.url, prompt: item.prompt, engine: item.engine }; }}
                    class="w-full h-full cursor-pointer"
                  >
                    <img src={item.url} alt={item.prompt} class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onclick={() => useAsTryOnModel(item.url)}
                    title="Use as Try-On Model"
                    class="absolute bottom-1.5 inset-x-1.5 bg-aura-green/90 text-white text-[7px] font-black uppercase tracking-wider py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Try-On
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </main>
    </div>
  </div>
</div>

<style>
  .scan-line {
    animation: scan-line 2s linear infinite;
  }
  @keyframes scan-line {
    from { top: -10%; }
    to { top: 110%; }
  }
  .vertical-text {
    writing-mode: vertical-lr;
    text-orientation: mixed;
  }
</style>
