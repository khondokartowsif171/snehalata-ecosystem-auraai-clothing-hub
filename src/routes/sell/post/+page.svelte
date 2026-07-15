<script lang="ts">
  import { browser } from '$app/environment';
  import { fileToCompressedDataURL } from '$lib/imageUpload';
  import { ECO_CATEGORIES } from '$lib/categories';
  import { priceStats, fairVerdict } from '$lib/fairPrice';

  const CATS = ECO_CATEGORIES.filter((c) => c.id !== 'all');

  let token = $state(browser ? localStorage.getItem('aura_vendor_token') || '' : '');
  let mode = $state<'register' | 'login'>('register');
  let fullName = $state('');
  let mobile = $state('');
  let password = $state('');
  let authBusy = $state(false);
  let authErr = $state('');

  let imageUrl = $state('');
  let name = $state('');
  let price = $state('');
  let category = $state('others');
  let condition = $state('new');
  let contactPhone = $state('');
  let description = $state('');
  let quality = $state<number | null>(null);
  let aiSuggested = $state<number | null>(null);
  let merchBusy = $state(false);
  let postBusy = $state(false);
  let posted = $state(false);
  let postErr = $state('');

  const verdict = $derived(price && Number(price) > 0 ? fairVerdict(Number(price), category, $priceStats) : null);

  function saveToken(t: string, id?: number, email?: string) {
    token = t;
    if (browser) {
      localStorage.setItem('aura_vendor_token', t);
      if (id) localStorage.setItem('aura_active_vendor_id', String(id));
      if (email) localStorage.setItem('aura_active_vendor_email', email);
    }
  }

  async function doAuth() {
    authErr = '';
    authBusy = true;
    try {
      if (!mobile || !password) throw new Error('মোবাইল ও পাসওয়ার্ড দিন');
      if (mode === 'register') {
        const r = await fetch('/api/vendor/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopName: fullName || 'Seller ' + mobile, ownerName: fullName, phone: mobile, password, vendorType: 'INDIVIDUAL' })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok && r.status !== 409) throw new Error(d.message || 'রেজিস্ট্রেশন ব্যর্থ');
      }
      const lr = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: mobile, password })
      });
      const ld = await lr.json().catch(() => ({}));
      if (!lr.ok) throw new Error(ld.message || 'ভুল মোবাইল বা পাসওয়ার্ড');
      saveToken(ld.token, ld.vendor?.id, ld.vendor?.email);
      if (!contactPhone) contactPhone = mobile;
    } catch (e: any) {
      authErr = e?.message || 'সমস্যা হয়েছে';
    } finally {
      authBusy = false;
    }
  }

  function matchCat(c: string) {
    const s = String(c || '').toLowerCase();
    return CATS.find((x) => s.includes(x.id))?.id || 'others';
  }

  async function onPhoto(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    merchBusy = true;
    quality = null;
    try {
      const b64 = await fileToCompressedDataURL(f);
      imageUrl = b64;
      const r = await fetch('/api/vendor/merchandise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image: b64 })
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        const s = d.suggestion || {};
        if (s.title && !name) name = s.title;
        if (s.suggested_price_bdt) aiSuggested = Math.round(s.suggested_price_bdt);
        if (!description) description = [s.description_bn, s.description_en].filter(Boolean).join('\n\n');
        if (typeof s.quality_score === 'number') quality = Math.round(s.quality_score);
        if (s.category) category = matchCat(s.category);
      }
    } catch {
      /* AI busy — seller fills manually */
    } finally {
      merchBusy = false;
      (e.target as HTMLInputElement).value = '';
    }
  }

  async function submit() {
    postErr = '';
    if (!name || !price || Number(price) <= 0) { postErr = 'নাম ও সঠিক দাম দিন'; return; }
    if (!contactPhone || contactPhone.replace(/[^0-9]/g, '').length < 11) { postErr = 'যোগাযোগের সঠিক মোবাইল নম্বর দিন'; return; }
    postBusy = true;
    try {
      const r = await fetch('/api/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, price: Number(price), category, description, image_url: imageUrl, contact_phone: contactPhone, item_condition: condition })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'পোস্ট ব্যর্থ হয়েছে');
      posted = true;
    } catch (e: any) {
      postErr = e?.message || 'সমস্যা হয়েছে';
    } finally {
      postBusy = false;
    }
  }

  function again() {
    posted = false;
    imageUrl = '';
    name = '';
    price = '';
    description = '';
    quality = null;
    aiSuggested = null;
    condition = 'new';
  }
</script>

<svelte:head>
  <title>সরাসরি বিক্রি করুন — স্নেহলতা বাজার | Sell on Snehalata Bazar</title>
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-10 text-white">
  <div class="mb-6">
    <p class="text-xs font-bold uppercase tracking-widest text-aura-gold">স্নেহলতা সরাসরি বাজার</p>
    <h1 class="mt-1 text-3xl font-bold">যেকোনো কিছু বিক্রি করুন</h1>
    <p class="mt-2 text-sm text-white/60">ছবি তুলুন, দাম দিন — Aura দাম যাচাই করে বলে দেবে সেরা, ন্যায্য নাকি বেশি। কমিশন-ফ্রি, ক্রেতা সরাসরি আপনাকে ফোন করবে।</p>
  </div>

  {#if !token}
    <!-- Lightweight seller profile: full name + mobile + password -->
    <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div class="mb-4 flex gap-2 text-sm font-semibold">
        <button class="rounded-lg px-3 py-1.5 {mode === 'register' ? 'bg-aura-gold text-black' : 'bg-white/10 text-white/70'}" onclick={() => (mode = 'register')}>নতুন — Register</button>
        <button class="rounded-lg px-3 py-1.5 {mode === 'login' ? 'bg-aura-gold text-black' : 'bg-white/10 text-white/70'}" onclick={() => (mode = 'login')}>আগে থেকে আছে — Login</button>
      </div>
      {#if mode === 'register'}
        <label class="mb-1 block text-xs text-white/60">পুরো নাম</label>
        <input class="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" bind:value={fullName} placeholder="আপনার নাম" />
      {/if}
      <label class="mb-1 block text-xs text-white/60">মোবাইল নম্বর</label>
      <input class="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" bind:value={mobile} inputmode="numeric" placeholder="01XXXXXXXXX" />
      <label class="mb-1 block text-xs text-white/60">পাসওয়ার্ড</label>
      <input class="mb-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" type="password" bind:value={password} placeholder="কমপক্ষে ৬ অক্ষর" />
      {#if authErr}<p class="mb-3 text-sm text-red-400">{authErr}</p>{/if}
      <button class="w-full rounded-xl bg-aura-gold py-3 text-sm font-bold text-black disabled:opacity-50" onclick={doAuth} disabled={authBusy}>
        {authBusy ? 'অপেক্ষা করুন…' : mode === 'register' ? 'প্রোফাইল খুলে শুরু করুন' : 'লগইন করুন'}
      </button>
    </div>
  {:else if posted}
    <div class="rounded-2xl border border-aura-green/30 bg-aura-green/10 p-6 text-center">
      <p class="text-lg font-bold text-aura-green">✓ আপনার পণ্য বাজারে পোস্ট হয়েছে!</p>
      <p class="mt-2 text-sm text-white/70">ক্রেতারা এখন আপনার নম্বরে সরাসরি যোগাযোগ করতে পারবে। (সন্দেহজনক হলে Aura যাচাইয়ের জন্য কিছুক্ষণ আটকে রাখতে পারে।)</p>
      <div class="mt-5 flex justify-center gap-3">
        <button class="rounded-xl bg-aura-gold px-5 py-2.5 text-sm font-bold text-black" onclick={again}>আরেকটা পোস্ট করুন</button>
        <a class="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white" href="/bazar">বাজার দেখুন</a>
      </div>
    </div>
  {:else}
    <div class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <!-- Photo → AI -->
      <div>
        <label class="mb-1 block text-xs text-white/60">পণ্যের ছবি</label>
        {#if imageUrl}
          <img src={imageUrl} alt="preview" class="mb-2 h-40 w-full rounded-lg object-cover" />
        {/if}
        <label class="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-aura-gold/40 bg-aura-gold/5 py-3 text-sm font-semibold text-aura-gold">
          {merchBusy ? 'Aura পড়ছে…' : imageUrl ? 'ছবি বদলান' : '📷 ছবি তুলুন / আপলোড করুন'}
          <input type="file" accept="image/*" class="hidden" onchange={onPhoto} />
        </label>
        {#if quality !== null}
          <p class="mt-1 text-xs text-white/50">Aura মান-স্কোর: <span class="font-bold text-aura-gold">{quality}/100</span></p>
        {/if}
      </div>

      <div>
        <label class="mb-1 block text-xs text-white/60">পণ্যের নাম</label>
        <input class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" bind:value={name} placeholder="যেমন: নতুন পাঞ্জাবি, ব্যবহৃত ফোন…" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-xs text-white/60">দাম (৳)</label>
          <input class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" bind:value={price} inputmode="numeric" placeholder="0" />
        </div>
        <div>
          <label class="mb-1 block text-xs text-white/60">ক্যাটাগরি</label>
          <select class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" bind:value={category}>
            {#each CATS as c}<option value={c.id}>{c.name}</option>{/each}
          </select>
        </div>
      </div>

      <!-- Aura's live price verdict — the core of the request -->
      {#if verdict}
        <div class="rounded-lg border px-3 py-2 text-sm font-semibold {verdict.cls}">
          {verdict.label}
          {#if aiSuggested}<span class="ml-1 font-normal opacity-80">· Aura বলছে এই মানের জন্য ~৳{aiSuggested} যুক্তিসঙ্গত</span>{/if}
        </div>
      {:else if aiSuggested}
        <p class="text-xs text-white/50">Aura বলছে এই মানের জন্য ~৳{aiSuggested} যুক্তিসঙ্গত হতে পারে।</p>
      {/if}

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-xs text-white/60">অবস্থা</label>
          <select class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" bind:value={condition}>
            <option value="new">নতুন</option>
            <option value="used">ব্যবহৃত</option>
            <option value="refurbished">রিফারবিশড</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs text-white/60">যোগাযোগ নম্বর</label>
          <input class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" bind:value={contactPhone} inputmode="numeric" placeholder="01XXXXXXXXX" />
        </div>
      </div>

      <div>
        <label class="mb-1 block text-xs text-white/60">বিবরণ (ঐচ্ছিক)</label>
        <textarea class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm" rows="2" bind:value={description}></textarea>
      </div>

      {#if postErr}<p class="text-sm text-red-400">{postErr}</p>{/if}
      <button class="w-full rounded-xl bg-aura-gold py-3 text-sm font-bold text-black disabled:opacity-50" onclick={submit} disabled={postBusy}>
        {postBusy ? 'পোস্ট হচ্ছে…' : 'বাজারে পোস্ট করুন'}
      </button>
      <p class="text-center text-[11px] text-white/40">পোস্ট করলে আপনি নিশ্চিত করছেন পণ্যটি আসল ও বিবরণ সঠিক। সরাসরি লেনদেন আপনার ও ক্রেতার দায়িত্বে।</p>
    </div>
  {/if}
</div>
