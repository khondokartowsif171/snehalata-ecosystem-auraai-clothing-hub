<script lang="ts">
  import { browser } from '$app/environment';
  import { fade, scale } from 'svelte/transition';
  import { Zap, LayoutDashboard, Users, ShieldCheck, Cpu, Network, Package, Plus, Layout, Palette, Eye, EyeOff, Globe, BarChart3, Sparkles, Loader2, Upload, Pencil } from '@lucide/svelte';
  let showLoginPw = $state(false);
  import ProductCard from '$lib/components/ProductCard.svelte';
  import { getVendors, getProductsByVendor, syncWithNeuralGrid } from '$lib/mockData';
  import { fileToCompressedDataURL } from '$lib/imageUpload';
  import type { Vendor } from '$lib/types';

  const vendorToken = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('aura_vendor_token') || '' : '');

  let vendor: any = $state(null);
  let products: any[] = $state([]);
  let vendorOrders = $state<any[]>([]);
  let loading = $state(true);

  async function loadVendorOrders() {
    try {
      const res = await fetch('/api/vendor/orders', { headers: { Authorization: `Bearer ${vendorToken()}` } });
      const data = await res.json().catch(() => ({}));
      vendorOrders = res.ok ? data.items || [] : [];
    } catch {
      vendorOrders = [];
    }
  }

  async function handleItemStatus(itemId: number, status: string) {
    try {
      const res = await fetch(`/api/vendor/orders?id=${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorToken()}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await loadVendorOrders();
    } catch (err: any) {
      alert('Update failed: ' + (err?.message || 'error'));
    }
  }
  let showLogin = $state(false);
  let loginEmail = $state('');
  let loginPassword = $state('');
  let loginError: string | null = $state(null);
  let isLoggingIn = $state(false);
  let isAddingProduct = $state(false);
  let newProduct = $state({ name: '', price: '', category: 'General', description: '', imageUrl: '' });
  let isSaving = $state(false);
  // When set, the product modal EDITS this own-product (PATCH) instead of adding (POST).
  let editingProductId = $state<number | null>(null);
  // A4 — AI merchandising (photo → listing) state.
  let merchLoading = $state(false);
  let merchQuality = $state<number | null>(null);
  let merchNote = $state<string>('');

  // One category list for the add-product form (matches the live storefront categories —
  // note "Shirt" is distinct from "T-Shirt"). Stored value lowercases to the home category id.
  const PRODUCT_CATEGORIES = ['Saree', 'Panjabi', 'Three-Piece', 'Borka', 'Shirt', 'T-Shirt', 'Pant', 'Baby', 'Cosmetics', 'Undergarments', 'Gadgets', 'Others'];
  // Snap a free-form (AI-suggested) category onto a real storefront category so a photo import
  // can never create an invisible orphan product. Falls back to "Others" when nothing matches.
  function snapCategory(raw: string): string {
    if (!raw) return newProduct.category;
    const n = String(raw).toLowerCase().trim();
    const exact = PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === n);
    if (exact) return exact;
    if (n.includes('saree') || n.includes('sari')) return 'Saree';
    if (n.includes('panjabi') || n.includes('punjabi') || n.includes('kurta')) return 'Panjabi';
    if (n.includes('three') || n.includes('3-piece') || n.includes('3 piece') || n.includes('salwar') || n.includes('kameez')) return 'Three-Piece';
    if (n.includes('borka') || n.includes('borkha') || n.includes('burka') || n.includes('hijab') || n.includes('niqab') || n.includes('nikab') || n.includes('abaya')) return 'Borka';
    if (n.includes('t-shirt') || n.includes('tshirt') || n.includes('tee')) return 'T-Shirt';
    if (n.includes('shirt')) return 'Shirt';
    if (n.includes('pant') || n.includes('trouser') || n.includes('jean') || n.includes('cargo') || n.includes('gabardine')) return 'Pant';
    if (n.includes('baby') || n.includes('kid') || n.includes('child') || n.includes('infant')) return 'Baby';
    if (n.includes('cosmetic') || n.includes('makeup') || n.includes('beauty') || n.includes('skin') || n.includes('cream')) return 'Cosmetics';
    if (n.includes('under') || n.includes('lingerie') || n.includes('night') || n.includes('bra') || n.includes('panty')) return 'Undergarments';
    if (n.includes('gadget') || n.includes('electronic') || n.includes('device')) return 'Gadgets';
    return 'Others';
  }

  async function handleMerchandise(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    merchLoading = true; merchQuality = null; merchNote = '';
    try {
      const base64 = await fileToCompressedDataURL(file);
      const resp = await fetch('/api/vendor/merchandise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorToken()}` },
        body: JSON.stringify({ image: base64 })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.message || 'AI merchandising failed');
      const s = data.suggestion || {};
      newProduct = {
        name: s.title || newProduct.name,
        price: s.suggested_price_bdt ? String(Math.round(s.suggested_price_bdt)) : newProduct.price,
        category: snapCategory(s.category),
        description: [s.description_bn, s.description_en].filter(Boolean).join('\n\n') || newProduct.description,
        imageUrl: base64
      };
      merchQuality = typeof s.quality_score === 'number' ? Math.round(s.quality_score) : null;
      merchNote = s.authenticity_note || '';
    } catch (err: any) {
      alert('AI merchandising: ' + (err?.message || 'failed'));
    } finally {
      merchLoading = false;
      input.value = '';
    }
  }
  let isAnalysisMode = $state(false);
  let analysisProgress = $state(0);
  let detectedItems: any[] = $state([]);
  let externalUrlInput = $state('');
  let isStylizing = $state(false);
  let accentColor = $state('#10b981');
  let showPwModal = $state(false);
  let newPass = $state('');
  let pwMsg = $state<string | null>(null);
  let pwLoading = $state(false);
  let isSyncing = $state(false);
  let isDeepImporting = $state(false);
  // Commission the vendor pays — reflects the global mode (Fixed % or Aura Smart 6–11%).
  let commissionLabel = $state('');
  $effect(() => {
    if (!vendor) return;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((cfg) => {
        const c = cfg?.commission;
        if (c?.mode === 'aura') commissionLabel = `Aura Smart · ${c.min ?? 6}%–${c.max ?? 11}%`;
        else commissionLabel = `${(vendor as any).commission_rate ?? c?.base ?? 10}%`;
      })
      .catch(() => {});
  });

  // Heavy headless render — for app-style (SPA) sites the fast Sync can't read.
  async function handleDeepImport() {
    isDeepImporting = true;
    try {
      const res = await fetch('/api/vendor/deep-import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${vendorToken()}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      await syncWithNeuralGrid();
      loadVendorData();
      alert(`Deep import complete — ${data.imported || 0} new product(s) added for review (${data.found ?? 0} detected on your live site).`);
    } catch (err: any) {
      alert('Deep import: ' + (err?.message || 'unavailable'));
    } finally {
      isDeepImporting = false;
    }
  }

  // Folder / multi-photo AI import — select many product photos at once → each becomes a
  // pending listing (Aura fills name/price/description). Loops client-side so it never times out.
  let isFolderImporting = $state(false);
  let folderProgress = $state('');
  async function handleFolderImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    isFolderImporting = true;
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      folderProgress = `ছবি ${i + 1}/${files.length} প্রসেস হচ্ছে…`;
      try {
        const dataUrl = await fileToCompressedDataURL(files[i]);
        const res = await fetch('/api/vendor/import-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorToken()}` },
          body: JSON.stringify({ image: dataUrl })
        });
        if (res.ok) ok++;
      } catch { /* skip a bad photo, keep going */ }
    }
    folderProgress = '';
    isFolderImporting = false;
    input.value = '';
    await syncWithNeuralGrid();
    loadVendorData();
    alert(`${ok}/${files.length} ছবি থেকে পণ্য বানানো হয়েছে — রিভিউ শেষে ক্যাটালগে দেখাবে।`);
  }

  async function handleSync() {
    isSyncing = true;
    try {
      const res = await fetch('/api/vendor/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${vendorToken()}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      await syncWithNeuralGrid();
      loadVendorData();
      alert(`Website sync complete — ${data.imported || 0} new product(s) imported (${data.found ?? 0} detected on your site).`);
    } catch (err: any) {
      alert('Sync failed: ' + (err?.message || 'unknown error'));
    } finally {
      isSyncing = false;
    }
  }

  let isFbSyncing = $state(false);
  // Consume the session handed by the FB callback via the URL hash (never hits the server/logs).
  function consumeFbHash() {
    if (typeof location === 'undefined' || !location.hash || location.hash.length < 2) return;
    const h = new URLSearchParams(location.hash.slice(1));
    const t = h.get('fbt');
    if (t) {
      localStorage.setItem('aura_vendor_token', t);
      if (h.get('fbid')) localStorage.setItem('aura_active_vendor_id', h.get('fbid') as string);
      if (h.get('fbe')) localStorage.setItem('aura_active_vendor_email', h.get('fbe') as string);
      history.replaceState(null, '', location.pathname);
    }
  }
  async function handleFbSync() {
    isFbSyncing = true;
    try {
      const res = await fetch('/api/vendor/fb/sync', { method: 'POST', headers: { Authorization: `Bearer ${vendorToken()}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      await syncWithNeuralGrid();
      loadVendorData();
      alert(data.imported ? `Facebook থেকে ${data.imported}টি নতুন পণ্য এল — রিভিউ শেষে ক্যাটালগে দেখাবে।` : (data.note || 'নতুন কিছু পাওয়া যায়নি।'));
    } catch (err: any) {
      alert('Facebook sync failed: ' + (err?.message || 'unknown error'));
    } finally {
      isFbSyncing = false;
    }
  }

  async function handleChangePassword() {
    if (!newPass || newPass.length < 6) { pwMsg = 'Password must be at least 6 characters'; return; }
    pwLoading = true; pwMsg = null;
    try {
      const res = await fetch('/api/vendor/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorToken()}` },
        body: JSON.stringify({ newPassword: newPass })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      pwMsg = 'Password updated successfully.';
      newPass = '';
      setTimeout(() => { showPwModal = false; pwMsg = null; }, 1200);
    } catch (err: any) {
      pwMsg = 'Failed: ' + (err?.message || 'unknown error');
    } finally {
      pwLoading = false;
    }
  }

  async function loadVendorData() {
    loading = true;
    const activeId = browser ? localStorage.getItem('aura_active_vendor_id') : null;
    const activeEmail = browser ? localStorage.getItem('aura_active_vendor_email') : null;
    const allVendors = getVendors();
    let currentVendor: any = null;
    // Authoritative: resolve straight from the session token — covers new / FB-connected stores not
    // yet in the CDN catalog, and carries fb_page_id for the "Sync from Facebook" button.
    if (browser && vendorToken()) {
      try {
        const meRes = await fetch('/api/vendor/me', { headers: { Authorization: `Bearer ${vendorToken()}` } });
        if (meRes.ok) { const md = await meRes.json(); if (md?.vendor) currentVendor = md.vendor; }
      } catch { /* fall back to the catalog lookup below */ }
    }
    if (!currentVendor && activeId) currentVendor = allVendors.find((v: any) => String(v.id) === activeId);
    if (!currentVendor && activeEmail) currentVendor = allVendors.find((v: any) => v.email === activeEmail);
    if (currentVendor) {
      vendor = currentVendor;
      if (currentVendor.website_url) externalUrlInput = currentVendor.website_url;
      // Load THIS vendor's products (including pending-review) via the API.
      try {
        const res = await fetch('/api/vendor/products', { headers: { Authorization: `Bearer ${vendorToken()}` } });
        const data = await res.json().catch(() => ({}));
        products = res.ok
          ? (data.products || []).map((p: any) => ({ ...p, imageUrl: p.image_url, vendorId: p.vendor_id }))
          : getProductsByVendor(Number(currentVendor.id));
      } catch {
        products = getProductsByVendor(Number(currentVendor.id));
      }
      loadVendorOrders();
    }
    loading = false;
  }

  $effect(() => {
    if (browser) { consumeFbHash(); loadVendorData(); }
  });

  function handleLogout() {
    localStorage.removeItem('aura_active_vendor_id');
    localStorage.removeItem('aura_active_vendor_email');
    localStorage.removeItem('aura_vendor_token');
    window.location.reload();
  }

  async function vendorPost(body: any) {
    const res = await fetch('/api/vendor/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorToken()}` },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  async function handleImport() {
    if (!vendor || detectedItems.length === 0) return;
    try {
      for (const item of detectedItems) {
        await vendorPost({
          name: item.name,
          price: Number(item.price) || 0,
          category: 'Imported',
          description: item.description || `Verified item from ${vendor.store_name}.`,
          image_url: item.imageUrl || ''
        });
      }
      await syncWithNeuralGrid();
      loadVendorData();
      detectedItems = [];
      isAnalysisMode = false;
    } catch (err: any) {
      alert('Import failed: ' + (err?.message || 'unknown error'));
    }
  }

  function closeProductModal() {
    isAddingProduct = false;
    editingProductId = null;
    newProduct = { name: '', price: '', category: 'General', description: '', imageUrl: '' };
    merchQuality = null; merchNote = '';
  }
  // Open the modal to EDIT one of my own products (price / name / category / description / image).
  function openEditProduct(p: any) {
    editingProductId = p.id;
    newProduct = {
      name: p.name || '',
      price: String(p.price ?? ''),
      category: p.category || 'General',
      description: p.description || '',
      imageUrl: p.imageUrl || p.image_url || ''
    };
    merchQuality = null; merchNote = '';
    isAddingProduct = true;
  }
  // Add (POST) or Edit (PATCH) my own product.
  async function handleAddManualProduct() {
    if (!vendor || isSaving) return;
    if (!newProduct.name.trim() || newProduct.price === '') { alert('Please add a name and price.'); return; }
    isSaving = true;
    try {
      const body = {
        name: newProduct.name,
        price: Number(newProduct.price),
        category: newProduct.category,
        description: newProduct.description,
        image_url: newProduct.imageUrl || ''
      };
      if (editingProductId != null) {
        const res = await fetch(`/api/vendor/products?id=${editingProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendorToken()}` },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      } else {
        await vendorPost(body);
      }
      await syncWithNeuralGrid();
      loadVendorData();
      closeProductModal();
    } catch (err: any) {
      alert((editingProductId ? 'Edit' : 'Add') + ' failed: ' + (err?.message || 'unknown error'));
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete(productId: number) {
    if (!confirm('Remove this neural asset from your catalog? This is permanent.')) return;
    try {
      const res = await fetch(`/api/vendor/products?id=${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${vendorToken()}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      await syncWithNeuralGrid();
      loadVendorData();
    } catch (err: any) {
      alert('Delete failed: ' + (err?.message || 'unknown error'));
    }
  }

  async function handleLogin(e: Event) {
    e.preventDefault();
    isLoggingIn = true;
    loginError = null;
    try {
      const res = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginEmail, password: loginPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('aura_active_vendor_id', String(data.vendor.id));
      localStorage.setItem('aura_active_vendor_email', data.vendor.email || loginEmail);
      localStorage.setItem('aura_vendor_token', data.token);
      await syncWithNeuralGrid();
      loadVendorData();
      showLogin = false;
    } catch (err: any) {
      loginError = err?.message || 'Neural node authentication failed.';
    } finally {
      isLoggingIn = false;
    }
  }
</script>

{#if loading}
  <div class="min-h-screen bg-black flex items-center justify-center">
    <Zap class="text-aura-green animate-pulse" size={40} />
  </div>
{:else if !vendor}
  <div class="min-h-screen bg-[#050505] text-white p-6 md:p-20 flex flex-col items-center justify-center relative overflow-hidden font-sans">
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-aura-green/5 blur-[120px] rounded-full animate-pulse" />
      <div class="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-900/5 blur-[120px] rounded-full animate-pulse" style="animation-delay: 1s" />
    </div>

    <div class="relative z-10 w-full max-w-xl" transition:fade={{ duration: 800 }}>
      <div class="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative group overflow-hidden">
        <div class="absolute inset-0 bg-aura-green/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
        <LayoutDashboard size={40} class="text-aura-green relative z-10" />
      </div>

      <div class="text-center mb-12">
        <h2 class="text-4xl sm:text-5xl font-serif font-black mb-6 italic tracking-tighter uppercase">
          স্বাগতম <br />
          <span class="text-aura-green text-5xl sm:text-6xl">পার্টনার</span>
        </h2>
        <p class="text-gray-400 leading-relaxed font-medium max-w-sm mx-auto">
          লগইন করে আপনার দোকান, অর্ডার আর সবকিছু সহজে ম্যানেজ করুন। স্নেহলতা পরিবারে আপনাকে আবার পেয়ে আমরা খুশি! 💚
        </p>
      </div>

      {#key showLogin}
        {#if !showLogin}
          <div transition:fade={{ duration: 300 }} class="flex flex-col gap-4">
            <button
              onclick={() => showLogin = true}
              class="w-full py-5 bg-aura-green text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-white/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              লগইন করুন
            </button>
            <a href="/onboarding" class="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-white hover:text-black transition-all flex items-center justify-center">
              পার্টনার হিসেবে যুক্ত হোন
            </a>
            <a href="/api/vendor/fb/connect" class="w-full py-5 bg-[#1877F2] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              Facebook দিয়ে যুক্ত হন
            </a>
          </div>
        {:else}
          <div transition:fade={{ duration: 300 }} class="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl">
            <form onsubmit={handleLogin} class="space-y-6">
              {#if loginError}
                <div class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                  <p class="text-[10px] text-red-400 font-black uppercase tracking-widest text-center">{loginError}</p>
                </div>
              {/if}
              <div class="space-y-2">
                <label class="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">মোবাইল নম্বর বা ইমেইল</label>
                <div class="relative group">
                  <div class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-aura-green transition-colors">
                    <Users size={18} />
                  </div>
                  <input
                    autofocus
                    type="text"
                    required
                    bind:value={loginEmail}
                    placeholder="মোবাইল নম্বর বা ইমেইল"
                    class="w-full bg-black/40 border border-white/10 rounded-2xl pl-16 pr-6 py-5 text-sm text-white focus:outline-none focus:border-aura-green transition-all placeholder:text-gray-800"
                  />
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">পাসওয়ার্ড</label>
                <div class="relative group">
                  <div class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-aura-green transition-colors">
                    <ShieldCheck size={18} />
                  </div>
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    required
                    bind:value={loginPassword}
                    placeholder="vendor access key"
                    class="w-full bg-black/40 border border-white/10 rounded-2xl pl-16 pr-14 py-5 text-sm text-white focus:outline-none focus:border-aura-green transition-all placeholder:text-gray-800"
                  />
                  <button type="button" onclick={() => (showLoginPw = !showLoginPw)} aria-label="Show password" class="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-aura-green transition-colors cursor-pointer">
                    {#if showLoginPw}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
                  </button>
                </div>
              </div>
              <div class="flex gap-4">
                <button
                  type="button"
                  onclick={() => showLogin = false}
                  class="px-8 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white hover:text-black transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  class="flex-1 py-5 bg-aura-green text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoggingIn ? 'Verifying Node...' : 'Access Dashboard'}
                </button>
              </div>
            </form>
          </div>
        {/if}
      {/key}

      <div class="mt-16 flex items-center justify-center gap-10 grayscale opacity-20 hover:opacity-100 hover:grayscale-0 transition-all duration-700">
        <ShieldCheck size={28} class="text-gray-400" />
        <div class="w-px h-6 bg-white/10" />
        <Cpu size={28} class="text-gray-400" />
        <div class="w-px h-6 bg-white/10" />
        <Network size={28} class="text-gray-400" />
      </div>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-[#050505] text-white selection:bg-aura-green/30">
    {#if isAddingProduct}
      <div class="fixed inset-0 z-[120] flex items-center justify-center p-6" transition:fade={{ duration: 200 }}>
        <div class="absolute inset-0 bg-black/90 backdrop-blur-3xl" onclick={closeProductModal} />
        <div class="relative bg-[#0A0A0A] border border-white/10 rounded-[3rem] w-full max-w-xl p-10 shadow-2xl overflow-hidden" transition:scale={{ duration: 300 }}>
          <div class="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Plus size={120} /></div>
          <h2 class="text-3xl font-serif font-black italic mb-8">{editingProductId ? 'Edit Product' : 'Add Neural Asset'}</h2>
          <div class="space-y-6">
            <label class="block cursor-pointer">
              <input type="file" accept="image/*" onchange={handleMerchandise} class="hidden" disabled={merchLoading} />
              <div class="w-full py-4 rounded-2xl border border-dashed border-aura-gold/40 bg-aura-gold/5 text-aura-gold flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest hover:bg-aura-gold/10 transition-all">
                {#if merchLoading}
                  <Loader2 size={16} class="animate-spin" /> Aura reading your photo…
                {:else}
                  <Sparkles size={16} /> AI: fill listing from a photo
                {/if}
              </div>
            </label>
            {#if merchQuality !== null}
              <div class="-mt-2 text-[10px] text-center text-gray-500">
                Aura photo quality: <span class="text-aura-gold font-black">{merchQuality}/100</span>
                {#if merchNote}<span class="block text-gray-600 italic mt-1">{merchNote}</span>{/if}
              </div>
            {/if}
            {#if newProduct.imageUrl}
              <img src={newProduct.imageUrl} alt="Preview" class="w-full h-40 object-cover rounded-2xl border border-white/10" />
            {/if}
            <input type="text" placeholder="Item Name" bind:value={newProduct.name}
              class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-aura-green outline-none transition-all" />
            <div class="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Price (৳)" bind:value={newProduct.price}
                class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-aura-green outline-none transition-all" />
              <select bind:value={newProduct.category}
                class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-aura-green outline-none transition-all appearance-none">
                <option value="General">Category</option>
                {#each PRODUCT_CATEGORIES as c}
                  <option value={c}>{c}</option>
                {/each}
              </select>
            </div>
            <textarea placeholder="Neural Description" bind:value={newProduct.description}
              class="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-aura-green outline-none transition-all resize-none" />
            <button onclick={handleAddManualProduct} disabled={isSaving}
              class="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-aura-green hover:text-white transition-all shadow-xl disabled:opacity-60 flex items-center justify-center gap-3">
              {#if isSaving}
                <Loader2 size={16} class="animate-spin" /> {editingProductId ? 'Saving…' : 'Deploying…'}
              {:else}
                {editingProductId ? 'Save Changes' : 'Deploy to Catalog'}
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if showPwModal}
      <div class="fixed inset-0 z-[130] flex items-center justify-center p-6" transition:fade={{ duration: 200 }}>
        <div class="absolute inset-0 bg-black/90 backdrop-blur-3xl" onclick={() => showPwModal = false}></div>
        <div class="relative bg-[#0A0A0A] border border-white/10 rounded-[3rem] w-full max-w-md p-10 shadow-2xl" transition:scale={{ duration: 300 }}>
          <h2 class="text-3xl font-serif font-black italic mb-2">Change Password</h2>
          <p class="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-8">Set a new access key for your vendor node</p>
          <input type="password" bind:value={newPass} placeholder="New password (min 6 chars)"
            class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-aura-green outline-none transition-all mb-4" />
          {#if pwMsg}
            <p class="text-[11px] font-bold mb-4 {pwMsg.startsWith('Password updated') ? 'text-green-400' : 'text-red-400'}">{pwMsg}</p>
          {/if}
          <div class="flex gap-3">
            <button onclick={() => showPwModal = false} class="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all cursor-pointer">Cancel</button>
            <button onclick={handleChangePassword} disabled={pwLoading} class="flex-[2] py-4 bg-aura-green text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50 cursor-pointer">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <header class="bg-black/50 backdrop-blur-3xl border-b border-white/5 py-12 px-6">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <span
              class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors {vendor.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}"
            >
              {vendor.status === 'APPROVED' ? 'Aura Verified Node' : 'Audit Pending'}
            </span>
            {#if vendor.metadata?.vendor_type === 'SUBDOMAIN'}
              <span class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-aura-green/10 text-aura-green border border-aura-green/20">
                Managed Sub-domain
              </span>
            {/if}
          </div>
          <h1 class="text-4xl sm:text-6xl font-serif font-black italic tracking-tighter mb-2 break-words">{vendor.store_name}</h1>
          <p class="text-gray-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-4">
            {vendor.email} • Neural ID: {vendor.id}
            <button onclick={() => { showPwModal = true; pwMsg = null; }} class="text-aura-green hover:underline cursor-pointer">Change Password</button>
            <button onclick={handleLogout} class="text-red-500 hover:underline cursor-pointer">Switch Account</button>
          </p>
          {#if commissionLabel}
            <div class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aura-green/10 border border-aura-green/25">
              <span class="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">আপনার কমিশন · Commission</span>
              <span class="text-sm font-black text-aura-green">{commissionLabel}</span>
            </div>
          {/if}
          <p class="text-[11px] text-gray-400 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span class="text-gray-600 uppercase tracking-[0.2em] text-[9px] font-black">সাহায্য / Support</span>
            <a href="tel:01911877091" class="text-aura-gold font-bold hover:text-white transition-colors">📞 01911-877091</a>
            <a href="https://wa.me/8801911877091" target="_blank" rel="noopener" class="text-aura-gold hover:text-white transition-colors">WhatsApp</a>
            <a href="mailto:contact@snehalata.com" class="text-aura-gold hover:text-white transition-colors">contact@snehalata.com</a>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          {#if vendor.website_url}
            <button
              onclick={handleSync}
              disabled={isSyncing}
              title="Import products from your own website"
              class="group px-8 py-5 bg-white/5 border border-white/10 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:border-aura-green transition-all disabled:opacity-50"
            >
              <Globe size={18} class={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing…' : 'Sync from Website'}</span>
            </button>
            <button
              onclick={handleDeepImport}
              disabled={isDeepImporting}
              title="For app-style sites the normal Sync can't read — renders your live site to pull products + images"
              class="group px-8 py-5 bg-white/5 border border-aura-ai/30 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:border-aura-ai transition-all disabled:opacity-50"
            >
              <Sparkles size={18} class={isDeepImporting ? 'animate-spin' : ''} />
              <span>{isDeepImporting ? 'Rendering…' : 'Deep Import'}</span>
            </button>
          {/if}
          {#if vendor.fb_page_id}
            <button
              onclick={handleFbSync}
              disabled={isFbSyncing}
              title="Import products from your connected Facebook page"
              class="group px-8 py-5 bg-[#1877F2]/10 border border-[#1877F2]/40 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:border-[#1877F2] transition-all disabled:opacity-50"
            >
              {#if isFbSyncing}<Loader2 size={18} class="animate-spin" />{:else}<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>{/if}
              <span>{isFbSyncing ? 'Syncing…' : 'Sync from Facebook'}</span>
            </button>
          {/if}
          <label
            title="একসাথে অনেক প্রোডাক্টের ছবি সিলেক্ট করুন — Aura প্রতিটা থেকে listing বানাবে (রিভিউর পর live)"
            class="group px-8 py-5 bg-white/5 border border-aura-gold/30 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:border-aura-gold transition-all cursor-pointer {isFolderImporting ? 'opacity-50 pointer-events-none' : ''}"
          >
            {#if isFolderImporting}<Loader2 size={18} class="animate-spin" />{:else}<Upload size={18} />{/if}
            <span>{isFolderImporting ? (folderProgress || 'Importing…') : 'Import Photos/Folder'}</span>
            <input type="file" accept="image/*" multiple onchange={handleFolderImport} class="hidden" disabled={isFolderImporting} />
          </label>
          <button
            onclick={() => isAddingProduct = true}
            class="group px-10 py-5 bg-aura-green text-white rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:bg-white hover:text-black transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
          >
            <Plus size={18} />
            <span class="relative">Add Neural Catalog Item</span>
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-6 py-12">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-8 space-y-12">
          <div>
            <div class="flex items-center justify-between mb-8 px-2">
              <div class="flex items-center gap-4">
                <BarChart3 class="text-aura-green" size={28} />
                <h2 class="text-3xl font-serif font-black italic">নতুন অর্ডার</h2>
              </div>
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/10">{vendorOrders.length} items</span>
            </div>
            {#if vendorOrders.length === 0}
              <div class="py-16 border-2 border-dashed border-white/5 rounded-[3rem] text-center text-gray-700 text-sm font-serif italic">No orders yet for your products.</div>
            {:else}
              <div class="space-y-4">
                {#each vendorOrders as it (it.id)}
                  <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    {#if it.image_url}<img src={it.image_url} class="w-14 h-14 rounded-xl object-cover shrink-0" alt={it.name} />{/if}
                    <div class="flex-1 min-w-0">
                      <p class="text-white font-bold text-sm truncate">{it.name} <span class="text-gray-500">×{it.quantity}</span></p>
                      <p class="text-[10px] text-gray-500 truncate">ORD-{it.orders?.id} · {it.orders?.customer_name} · {it.orders?.customer_phone}</p>
                      <p class="text-[10px] text-gray-600 truncate">{it.orders?.district} — {it.orders?.address}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-green-400 font-black">৳{Number(it.vendor_payout).toLocaleString()}</p>
                      <p class="text-[8px] text-gray-500 uppercase tracking-widest">Your payout (−{it.commission_rate}%)</p>
                    </div>
                    <select value={it.item_status} onchange={(e) => handleItemStatus(it.id, e.currentTarget.value)}
                      class="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer shrink-0">
                      {#each ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as s}
                        <option value={s} class="bg-black">{s}</option>
                      {/each}
                    </select>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          {#if vendor.metadata?.vendor_type === 'SUBDOMAIN'}
            <div class="bg-gradient-to-br from-aura-green/20 via-black to-black border border-white/5 rounded-[3rem] p-12 overflow-hidden relative group">
              <div class="absolute top-0 right-0 p-12 text-white/5 group-hover:text-white/10 transition-colors">
                <Layout size={180} />
              </div>
              <div class="relative z-10">
                <div class="flex items-center gap-4 mb-8">
                  <Zap class="text-aura-green" size={32} />
                  <h2 class="text-4xl font-serif font-black italic">1-Click Store Generator</h2>
                </div>
                <p class="text-gray-400 text-sm leading-relaxed mb-10 max-w-xl font-medium">
                  Design your digital presence in the Aura Ecosystem. Customize colors, layout, and neural features to stand out in the global marketplace.
                </p>
                <div class="flex flex-wrap gap-4">
                  <button
                    onclick={() => isStylizing = true}
                    class="px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <Palette size={16} /> Stylize Store
                  </button>
                  <button
                    onclick={() => window.open(`/store/${vendor.slug}`, '_blank')}
                    class="px-8 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <Eye size={16} /> Live Preview
                  </button>
                </div>
              </div>
            </div>
          {/if}

          {#if isStylizing}
            <div class="fixed inset-0 z-[100] flex items-center justify-center p-6" transition:fade={{ duration: 200 }}>
              <div class="absolute inset-0 bg-black/90 backdrop-blur-3xl" onclick={() => isStylizing = false} />
              <div class="relative bg-[#0A0A0A] border border-white/10 rounded-[3rem] w-full max-w-2xl p-12 overflow-hidden shadow-2xl" transition:scale={{ duration: 300 }}>
                <h2 class="text-4xl font-serif font-black italic mb-8">Neural Identity Studio</h2>
                <div class="space-y-8">
                  <div class="space-y-4">
                    <label class="text-[10px] font-black uppercase tracking-widest text-gray-500">Aura Accent Color</label>
                    <div class="flex gap-4">
                      {#each ['#10b981', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'] as c}
                        <button
                          onclick={() => accentColor = c}
                          class="w-12 h-12 rounded-full border-4 transition-transform"
                          class:border-white={accentColor === c}
                          class:scale-110={accentColor === c}
                          class:border-transparent={accentColor !== c}
                          style="background-color: {c}"
                        />
                      {/each}
                    </div>
                  </div>
                  <div class="space-y-4">
                    <label class="text-[10px] font-black uppercase tracking-widest text-gray-500">Storefront Blueprint</label>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="p-6 bg-white/5 border border-aura-green rounded-2xl">
                        <p class="text-xs font-bold uppercase tracking-widest mb-1">Aura Brutalist</p>
                        <p class="text-[9px] text-gray-500">High contrast, sharp edges, bold typography.</p>
                      </div>
                      <div class="p-6 bg-white/5 border border-white/10 rounded-2xl opacity-40">
                        <p class="text-xs font-bold uppercase tracking-widest mb-1">Ethereal Soft</p>
                        <p class="text-[9px] text-gray-500">Soft shadows, glassmorphism, pastel accents.</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onclick={() => { isStylizing = false; alert('Store aesthetic updated in the Neural Grid.'); }}
                    class="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[11px]"
                  >
                    Apply Configuration
                  </button>
                </div>
              </div>
            </div>
          {/if}

          {#if vendor.metadata?.vendor_type === 'EXTERNAL_BRIDGE'}
            <div class="bg-white/5 border border-white/10 rounded-[3rem] p-12">
              <div class="flex items-center gap-4 mb-10">
                <Network class="text-aura-green" size={32} />
                <h2 class="text-3xl font-serif font-black italic">Neural Website Bridge</h2>
              </div>
              <div class="flex flex-col md:flex-row gap-4 mb-8">
                <div class="flex-1 relative group">
                  <Globe class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none group-focus-within:text-aura-green transition-colors" size={20} />
                  <input
                    type="text"
                    bind:value={externalUrlInput}
                    placeholder="https://yourbrand.com/shop"
                    class="w-full bg-black border border-white/10 rounded-3xl py-5 pl-16 pr-6 text-sm font-serif focus:outline-none focus:border-aura-green/50 transition-all"
                  />
                </div>
                <button
                  onclick={handleSync}
                  disabled={isSyncing}
                  class="px-10 py-5 bg-white text-black rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-aura-green hover:text-white transition-all shadow-xl disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing…' : 'Sync from Website'}
                </button>
              </div>

              {#if isAnalysisMode}
                <div class="bg-black/50 border border-white/5 rounded-3xl p-10 text-center">
                  {#if detectedItems.length === 0}
                    <div class="py-12">
                      <div class="w-16 h-16 border-4 border-aura-green border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                      <p class="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Neural Scraping in Progress... {analysisProgress}%</p>
                    </div>
                  {:else}
                    <div>
                      <div class="flex items-center justify-between mb-8">
                        <h3 class="text-xl font-serif font-bold italic">Artifacts Detected ({detectedItems.length})</h3>
                        <button onclick={handleImport} class="px-6 py-2 bg-green-500 text-black rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-transform">Import Verified Items</button>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
                        {#each detectedItems as item, i}
                          <div class="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <span class="text-xs font-serif truncate pr-4">{item.name}</span>
                            <span class="text-[10px] font-bold text-green-500 whitespace-nowrap">৳{item.price}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

          <div>
            <div class="flex items-center justify-between mb-10 px-4">
              <div class="flex items-center gap-4">
                <Package class="text-aura-green" size={32} />
                <h2 class="text-3xl font-serif font-black italic">Active Catalog</h2>
              </div>
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                {products.length} Neural Entries
              </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-3 gap-8">
              {#if products.length > 0}
                {#each products as p (p.id)}
                  <div class="relative group/card">
                    <button
                      onclick={() => openEditProduct(p)}
                      title="Edit product"
                      class="absolute -top-2 right-8 z-20 w-8 h-8 bg-aura-green/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-aura-green shadow-lg"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onclick={() => handleDelete(p.id)}
                      title="Delete product"
                      class="absolute -top-2 -right-2 z-20 w-8 h-8 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    {#if p.is_active === false}
                      <span class="absolute top-2 left-2 z-20 px-2.5 py-1 bg-amber-500 text-black rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">Pending Review</span>
                    {/if}
                    <ProductCard product={p} />
                  </div>
                {/each}
              {:else}
                <div class="col-span-full py-40 border-4 border-dashed border-white/5 rounded-[4rem] text-center flex flex-col items-center">
                  <Package size={64} class="text-gray-800 mb-6" />
                  <h3 class="text-2xl font-serif italic text-gray-600">আপনার দোকান এখনো খালি — চলুন প্রথম পণ্যটা যোগ করি!</h3>
                  <p class="text-gray-700 text-sm mt-2 max-w-xs mx-auto">Populate your digital presence by importing artifacts or adding manual entries.</p>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <aside class="lg:col-span-4 space-y-8">
          <div class="bg-[#0A0A0A] border border-white/10 rounded-[3rem] p-10">
            <h3 class="text-xl font-serif font-black italic mb-8 flex items-center gap-3">
              <BarChart3 size={24} class="text-aura-green" />
              Neural Insights
            </h3>
            <div class="space-y-6">
              <div class="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:border-white/10 transition-colors group">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">Total Sales</p>
                  <p class="text-xl font-serif font-bold group-hover:text-aura-green transition-colors">৳15,500</p>
                </div>
                <div class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-500/10 text-green-500">+12%</div>
              </div>
              <div class="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:border-white/10 transition-colors group">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">Impression Index</p>
                  <p class="text-xl font-serif font-bold group-hover:text-aura-green transition-colors">1.2k</p>
                </div>
                <div class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-500/10 text-green-500">+4%</div>
              </div>
              <div class="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:border-white/10 transition-colors group">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">Neural Ranking</p>
                  <p class="text-xl font-serif font-bold group-hover:text-aura-green transition-colors">#12</p>
                </div>
                <div class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 text-red-500">-2</div>
              </div>
              <div class="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:border-white/10 transition-colors group">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">Try-On Pulse</p>
                  <p class="text-xl font-serif font-bold group-hover:text-aura-green transition-colors">482</p>
                </div>
                <div class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-green-500/10 text-green-500">+24%</div>
              </div>
            </div>
          </div>

          <div class="bg-aura-green/10 border border-aura-green/20 rounded-[3rem] p-10 overflow-hidden relative">
            <div class="absolute top-0 right-0 w-32 h-32 bg-aura-green/10 blur-[60px]" />
            <h3 class="text-xl font-serif font-black italic mb-6 relative z-10">Performance Pulse</h3>
            <div class="h-40 flex items-end gap-2 relative z-10">
              {#each [40, 70, 45, 90, 65, 80, 100] as h, i}
                <div class="flex-1 bg-aura-green rounded-t-lg transition-all duration-1000" style="height: {h}%"></div>
              {/each}
            </div>
            <div class="mt-6 flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
              <span>Mon</span><span>Sun</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
{/if}
