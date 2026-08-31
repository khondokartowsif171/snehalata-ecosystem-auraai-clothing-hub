<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import {
    User, Mail, Phone, MapPin, Package, ShieldCheck,
    LogOut, CheckCircle2, Truck, Clock, Sparkles,
    ArrowRight, ShoppingBag, Edit3, Save, Heart, Shirt, MessageCircle
  } from '@lucide/svelte';
  import {
    getStoredCustomer,
    saveCustomer,
    loginWithGoogle,
    directGoogleLogin,
    customerLogout,
    initCustomerAuthListener,
    type CustomerProfile
  } from '$lib/customerAuth';
  import { getOrders } from '$lib/mockData';
  import type { Order } from '$lib/types';
  import { BD_LOCATIONS } from '$lib/locationData';

  let customer = $state<CustomerProfile | null>(null);
  let orders = $state<Order[]>([]);
  let loading = $state(false);
  let oauthError = $state('');

  // Manual / Fast sign in inputs
  let manualEmail = $state('');
  let manualName = $state('');
  let showManualInput = $state(true);

  // Address editing
  let isEditingAddress = $state(false);
  let addrStreet = $state('');
  let addrCity = $state('Dhaka');
  let addrDistrict = $state('Dhaka');
  let addrDivision = $state('Dhaka');
  let addrPhone = $state('');

  onMount(() => {
    customer = getStoredCustomer();
    orders = getOrders();

    if (customer) {
      syncAddressFields(customer);
    }

    const unsubscribe = initCustomerAuthListener((profile) => {
      customer = profile;
      if (profile) {
        syncAddressFields(profile);
      }
    });

    const handleOrders = () => { orders = getOrders(); };
    window.addEventListener('orderUpdated', handleOrders);
    window.addEventListener('cartUpdated', handleOrders);

    return () => {
      unsubscribe();
      window.removeEventListener('orderUpdated', handleOrders);
      window.removeEventListener('cartUpdated', handleOrders);
    };
  });

  function syncAddressFields(c: CustomerProfile) {
    addrStreet = c.address?.street || '';
    addrCity = c.address?.city || 'Dhaka';
    addrDistrict = c.address?.district || 'Dhaka';
    addrDivision = c.address?.division || 'Dhaka';
    addrPhone = c.phone || '';
  }

  async function handleGoogleOAuth() {
    loading = true;
    oauthError = '';
    const res = await loginWithGoogle();
    if (!res.success) {
      oauthError = res.error || 'Google Login failed';
      loading = false;
    }
  }

  function handleDirectGmailSubmit(e?: Event) {
    if (e) e.preventDefault();
    if (!manualEmail || !manualEmail.includes('@')) {
      oauthError = 'Please enter a valid Gmail address';
      return;
    }

    loading = true;
    try {
      const profile = directGoogleLogin(manualEmail, manualName);
      customer = profile;
      syncAddressFields(profile);
      showManualInput = false;
      manualEmail = '';
      manualName = '';
      oauthError = '';
    } catch (err: any) {
      oauthError = err?.message || 'Login failed';
    } finally {
      loading = false;
    }
  }

  function handleSaveAddress() {
    if (!customer) return;
    const updated: CustomerProfile = {
      ...customer,
      phone: addrPhone,
      address: {
        street: addrStreet,
        city: addrCity,
        district: addrDistrict,
        division: addrDivision,
      }
    };
    saveCustomer(updated);
    customer = updated;
    isEditingAddress = false;
  }

  async function handleSignOut() {
    await customerLogout();
    customer = null;
  }
</script>

<svelte:head>
  <title>Customer Account · SNEHALATA Aura</title>
  <meta name="description" content="Manage your Snehalata customer profile, track orders, and view your AR wardrobe." />
</svelte:head>

<div class="min-h-screen bg-[#080B09] text-white pt-10 pb-24 px-4 sm:px-6">
  <div class="max-w-4xl mx-auto">
    
    {#if !customer}
      <!-- ================= UNLOGGED / SIGN-IN VIEW ================= -->
      <div class="max-w-md mx-auto my-12 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        <div class="absolute top-0 right-0 w-48 h-48 bg-aura-green/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-3xl bg-aura-green/12 border border-aura-green/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-aura-green/10">
            <User size={30} class="text-aura-green" />
          </div>
          <h1 class="text-3xl font-display font-black text-white">Customer Account</h1>
          <p class="text-xs text-gray-400 mt-2">গুগল বা জিমেইল দিয়ে সরাসরি ১-ক্লিক লগইন করুন</p>
        </div>

        {#if oauthError}
          <div class="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
            <span>⚠️ {oauthError}</span>
          </div>
        {/if}

        <!-- Primary Google OAuth Button -->
        <button
          onclick={handleGoogleOAuth}
          disabled={loading}
          class="w-full py-4 px-6 rounded-2xl bg-white text-gray-900 font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          <!-- Official Google "G" SVG -->
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{loading ? 'কানেক্ট হচ্ছে…' : 'Continue with Google'}</span>
        </button>

        <div class="my-6 flex items-center gap-3">
          <div class="flex-1 h-px bg-white/10"></div>
          <span class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">or direct gmail</span>
          <div class="flex-1 h-px bg-white/10"></div>
        </div>

        {#if showManualInput}
          <!-- Direct Gmail Form -->
          <form onsubmit={handleDirectGmailSubmit} class="space-y-4">
            <div>
              <label for="gmail-input" class="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">আপনার জিমেইল এড্রেস</label>
              <div class="relative">
                <Mail class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="gmail-input"
                  type="email"
                  bind:value={manualEmail}
                  placeholder="yourname@gmail.com"
                  required
                  class="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:border-aura-green focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label for="name-input" class="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">আপনার নাম (ঐচ্ছিক)</label>
              <div class="relative">
                <User class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  id="name-input"
                  type="text"
                  bind:value={manualName}
                  placeholder="যেমন: আমিরুল ইসলাম"
                  class="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:border-aura-green focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full py-4 rounded-xl bg-aura-green text-black font-bold text-xs uppercase tracking-widest hover:bg-aura-green/90 transition-all shadow-lg cursor-pointer"
            >
              {loading ? 'প্রবেশ করা হচ্ছে…' : 'লগইন সম্পন্ন করুন →'}
            </button>
          </form>
        {:else}
          <button
            onclick={() => showManualInput = true}
            class="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-semibold text-xs hover:border-aura-green/40 hover:text-white transition-all cursor-pointer"
          >
            ✉️ জিমেইল বা ইমেইল টাইপ করে লগইন করুন
          </button>
        {/if}

        <div class="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-3 text-[11px] text-gray-400">
          <div class="flex items-center gap-2">
            <ShieldCheck size={14} class="text-aura-green shrink-0" />
            <span>১০০% নিরাপদ অ্যাকাউন্ট</span>
          </div>
          <div class="flex items-center gap-2">
            <Truck size={14} class="text-aura-gold shrink-0" />
            <span>সরাসরি পার্সেল ট্র্যাকিং</span>
          </div>
        </div>
      </div>

    {:else}
      <!-- ================= AUTHENTICATED CUSTOMER DASHBOARD ================= -->
      
      <!-- 1. Header Profile Banner -->
      <div class="bg-gradient-to-r from-aura-green/10 via-white/[0.03] to-aura-gold/10 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden mb-8">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          
          <div class="flex items-center gap-5">
            <div class="relative">
              <img
                src={customer.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.name)}`}
                alt={customer.name}
                class="w-20 h-20 rounded-3xl object-cover border-2 border-aura-green shadow-xl"
              />
              <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-aura-green text-black flex items-center justify-center shadow-lg" title="Verified Customer">
                <CheckCircle2 size={14} strokeWidth={3} />
              </div>
            </div>

            <div>
              <div class="flex items-center gap-3 flex-wrap">
                <h1 class="text-2xl sm:text-3xl font-display font-black text-white">{customer.name}</h1>
                <span class="px-3 py-1 rounded-full bg-aura-green/15 border border-aura-green/30 text-aura-green text-[10px] font-bold tracking-wider uppercase">
                  Verified Google User
                </span>
              </div>
              <p class="text-sm text-gray-400 flex items-center gap-2 mt-1">
                <Mail size={14} class="text-aura-gold" /> {customer.email}
              </p>
              {#if customer.phone}
                <p class="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  <Phone size={12} class="text-gray-400" /> {customer.phone}
                </p>
              {/if}
            </div>
          </div>

          <button
            onclick={handleSignOut}
            class="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>লগআউট · Sign Out</span>
          </button>
        </div>
      </div>

      <!-- 2. Grid Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left 2 Cols: Orders & Try-On -->
        <div class="lg:col-span-2 space-y-8">
          
          <!-- Recent Orders Section -->
          <div class="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-xl">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <div class="p-3 rounded-2xl bg-aura-green/10 border border-aura-green/20 text-aura-green">
                  <Package size={22} />
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">আমার অর্ডারসমূহ · My Orders</h2>
                  <p class="text-xs text-gray-500">আপনার সমস্ত কেনাকাটা ও ডেলিভারি স্ট্যাটাস</p>
                </div>
              </div>
              <a href="/orders" class="text-aura-green text-xs font-bold hover:underline flex items-center gap-1">
                সব দেখুন <ArrowRight size={14} />
              </a>
            </div>

            {#if orders.length === 0}
              <div class="text-center py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                <ShoppingBag size={36} class="text-gray-600 mx-auto mb-3" />
                <p class="text-sm font-bold text-gray-400">আপনার কোনো সক্রিয় অর্ডার নেই</p>
                <p class="text-xs text-gray-600 mt-1 mb-4">দেশসেরা ঐতিহ্যবাহী তাঁত ও ফ্যাশন কালেকশন ব্রাউজ করুন</p>
                <a href="/" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-aura-green text-black text-xs font-black uppercase tracking-wider hover:bg-aura-green/90 transition-all">
                  শপিং শুরু করুন
                </a>
              </div>
            {:else}
              <div class="space-y-4">
                {#each orders.slice(0, 3) as ord (ord.id)}
                  <div
                    onclick={() => goto(`/orders/${ord.id}`)}
                    class="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-aura-green/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-xl bg-aura-black border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {#if ord.items?.[0]?.imageUrl}
                          <img src={ord.items[0].imageUrl} alt={ord.items[0].name} class="w-full h-full object-cover" />
                        {:else}
                          <Package size={20} class="text-gray-600" />
                        {/if}
                      </div>
                      <div>
                        <h4 class="text-sm font-bold text-white group-hover:text-aura-green transition-colors">
                          অর্ডার ID: {ord.id}
                        </h4>
                        <p class="text-xs text-gray-400 mt-0.5">
                          {ord.items.length} টি আইটেম · <span class="text-aura-gold font-bold">৳{ord.totalAmount.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center justify-between sm:justify-end gap-3">
                      <span class="px-3 py-1 rounded-full text-[11px] font-bold border {
                        ord.currentStatus === 'DELIVERED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        ord.currentStatus === 'SHIPPED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-aura-gold/10 text-aura-gold border-aura-gold/20'
                      }">
                        {ord.currentStatus}
                      </span>
                      <ArrowRight size={16} class="text-gray-600 group-hover:text-aura-green group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Virtual Try-on Wardrobe Banner -->
          <div class="bg-gradient-to-br from-aura-purple/20 via-black to-aura-green/10 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div class="space-y-2 text-center sm:text-left">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aura-purple/20 border border-aura-purple/40 text-aura-purple text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={12} /> AR Aura Studio
              </div>
              <h3 class="text-xl font-bold text-white">ভার্চুয়াল ট্রাই-অন ওয়ার্ডরোব</h3>
              <p class="text-xs text-gray-400 max-w-md">আপনার সেলফিতে শাড়ি বা পাঞ্জাবি মানাচ্ছে কিনা এআই দিয়ে ট্রাই করে দেখুন।</p>
            </div>
            <a
              href="/studio"
              class="px-6 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0"
            >
              <Shirt size={16} />
              <span>স্টুডিও ওপেন করুন</span>
            </a>
          </div>

        </div>

        <!-- Right Col: Saved Shipping Address & Support -->
        <div class="space-y-8">
          
          <!-- Saved Address Card -->
          <div class="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-xl">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-xl bg-aura-gold/10 border border-aura-gold/20 text-aura-gold">
                  <MapPin size={18} />
                </div>
                <h3 class="text-base font-bold text-white">ডেলিভারি ঠিকানা</h3>
              </div>
              {#if !isEditingAddress}
                <button
                  onclick={() => isEditingAddress = true}
                  class="text-aura-green hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={13} /> এডিট
                </button>
              {/if}
            </div>

            {#if isEditingAddress}
              <div class="space-y-4">
                <div>
                  <label for="street-input" class="block text-[10px] text-gray-400 font-bold uppercase mb-1">বাসা/রোড/এরিয়া</label>
                  <input
                    id="street-input"
                    type="text"
                    bind:value={addrStreet}
                    placeholder="রোড #৫, হাউস #১২, ধানমন্ডি"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-aura-green focus:outline-none"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="district-select" class="block text-[10px] text-gray-400 font-bold uppercase mb-1">জেলা · District</label>
                    <select
                      id="district-select"
                      bind:value={addrDistrict}
                      class="w-full px-3 py-2.5 rounded-xl bg-[#121614] border border-white/10 text-white text-xs focus:border-aura-green focus:outline-none"
                    >
                      {#each Object.keys(BD_LOCATIONS) as dName}
                        <option value={dName}>{dName}</option>
                      {/each}
                    </select>
                  </div>
                  <div>
                    <label for="phone-input" class="block text-[10px] text-gray-400 font-bold uppercase mb-1">ফোন নাম্বার</label>
                    <input
                      id="phone-input"
                      type="tel"
                      bind:value={addrPhone}
                      placeholder="017XXXXXXXX"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-aura-green focus:outline-none"
                    />
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-2">
                  <button
                    onclick={handleSaveAddress}
                    class="flex-1 py-2.5 rounded-xl bg-aura-green text-black text-xs font-bold uppercase tracking-wider hover:bg-aura-green/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save size={13} /> সেভ করুন
                  </button>
                  <button
                    onclick={() => isEditingAddress = false}
                    class="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold hover:text-white transition-all cursor-pointer"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            {:else}
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-gray-300 space-y-2">
                {#if customer.address?.street || customer.address?.district}
                  <p class="font-semibold text-white">{customer.name}</p>
                  <p class="text-gray-400">{customer.address?.street || 'ঠিকানা যোগ করা হয়নি'}</p>
                  <p class="text-aura-green font-medium">{customer.address?.district || 'Dhaka'}, Bangladesh</p>
                  {#if customer.phone}
                    <p class="text-gray-400 font-mono text-[11px] pt-1">📞 {customer.phone}</p>
                  {/if}
                {:else}
                  <p class="text-gray-500 py-2">কোনো ডেলিভারি ঠিকানা সেভ করা নেই। এডিটে ক্লিক করে যুক্ত করুন।</p>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Customer Support Hotline -->
          <div class="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-xl">
            <h3 class="text-base font-bold text-white mb-2">সাহায্য বা অর্ডার সংক্রান্ত তথ্য</h3>
            <p class="text-xs text-gray-400 mb-6">আমাদের কাস্টমার রিলেশন টিম সার্বক্ষণিক আপনার সেবায় নিয়োজিত।</p>

            <div class="space-y-3">
              <a
                href="https://wa.me/8801317685758"
                target="_blank"
                rel="noopener"
                class="w-full py-3.5 px-4 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600/30 transition-all"
              >
                <MessageCircle size={16} /> WhatsApp হেল্পলাইন (+8801317685758)
              </a>
              <a
                href="tel:01317685758"
                class="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs flex items-center justify-center gap-2 hover:text-white hover:border-aura-green/40 transition-all"
              >
                <Phone size={14} class="text-aura-gold" /> সরাসরি কল করুন (01317-685758)
              </a>
            </div>
          </div>

        </div>

      </div>

    {/if}

  </div>
</div>
