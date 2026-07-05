<script lang="ts">
  import { Feather, Gem, Scissors, Flower2, ArrowRight, Home, Hand, Snowflake, Baby, HeartHandshake, ShieldCheck } from '@lucide/svelte';

  const DIRECT = [
    { icon: Hand, title: 'সরাসরি তাঁতির কাছ থেকে', sub: 'মাঝের লোক নেই — তাই দাম কম, আর তাঁতির লাভ বেশি। ন্যায্য দাম দুই পক্ষেই।' },
    { icon: Home, title: 'ঘরে বসেই আয়', sub: 'গৃহিণী, ছোট কারিগর ও কুটির শিল্পী নিজের পণ্য অনলাইনে বিক্রি করেন — নিজের দোকান, নিজের নামে।' },
    { icon: ShieldCheck, title: 'আসল হাতের কাজ', sub: 'জামদানি, মসলিন, নকশি কাঁথা, তাঁত — প্রতিটি AI-Verified, যাচাই করা authentic।' }
  ];

  const CRAFTS = [
    { bn: 'জামদানি', en: 'Jamdani', story: 'UNESCO-স্বীকৃত ঢাকাই মসলিন মোটিফ, সুতোয় সুতোয় হাতে বোনা।', icon: Feather },
    { bn: 'মসলিন', en: 'Muslin', story: 'বাংলার কিংবদন্তি পালকের মতো হালকা বুনন, আজকের জন্য নতুন করে।', icon: Gem },
    { bn: 'নকশি কাঁথা', en: 'Nakshi Kantha', story: 'গ্রামের কারিগরের হাতে গল্প-বোনা কাঁথা।', icon: Scissors },
    { bn: 'তাঁত ও সিল্ক', en: 'Tangail & Rajshahi Silk', story: 'প্রজন্মের পর প্রজন্ম ধরে বোনা উজ্জ্বল সিল্কের ঐতিহ্য।', icon: Flower2 }
  ];

  const CARE = [
    { icon: Snowflake, title: 'শীতে বস্ত্র বিতরণ', sub: 'প্রতি শীতে দরিদ্র মানুষের জন্য গরম কাপড়।' },
    { icon: Baby, title: 'পথশিশুদের পোশাক', sub: 'পথশিশুদের জন্য সারাবছর বিনামূল্যে পোশাক।' },
    { icon: HeartHandshake, title: 'বস্ত্রহীনের পাশে', sub: 'কেউ বস্ত্রহীন থাকলে — তার জন্য বিনামূল্যে, সম্মানের সাথে।' }
  ];
</script>

<svelte:head>
  <title>বাংলার তাঁতি ও স্নেহলতার অঙ্গীকার — Artisans & Humanity | Snehalata</title>
  <meta name="description" content="বাংলার তাঁতি, কুটির শিল্পী ও ঘরে বসে সেলাই করা মা-বোনের হাতের কাজ সরাসরি আপনার ঘরে — মাঝের লোক ছাড়া, ন্যায্য দামে। আর স্নেহলতার মানবিক অঙ্গীকার: দরিদ্র ও পথশিশুদের জন্য বিনামূল্যে পোশাক।" />
</svelte:head>

<div class="min-h-screen text-white">
  <!-- Hero -->
  <section class="border-b border-white/5 bg-gradient-to-b from-[#100b06] to-[#060507]">
    <div class="max-w-5xl mx-auto px-6 pt-20 pb-16">
      <div class="flex items-center gap-3 mb-5">
        <span class="h-px w-10 bg-aura-gold/60"></span>
        <span class="text-[10px] font-black uppercase tracking-[0.4em] text-aura-gold">আমাদের আত্মা · Our Roots</span>
      </div>
      <h1 class="text-4xl sm:text-6xl font-serif font-black italic leading-tight mb-6">
        বাংলার হাত থেকে <br /> সরাসরি <span class="text-aura-gold">আপনার ঘরে।</span>
      </h1>
      <p class="text-gray-300 text-base sm:text-lg max-w-2xl leading-relaxed">
        কোনো মাঝের লোক নেই। তাঁতি, কুটির শিল্পী আর ঘরে বসে সেলাই করা মা-বোনের হাতের কাজ —
        <span class="text-white font-semibold">ন্যায্য দামে, সরাসরি</span>। যিনি বানান, লাভটা তাঁরই।
      </p>
    </div>
  </section>

  <!-- Direct from artisan -->
  <section class="max-w-6xl mx-auto px-6 py-16">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      {#each DIRECT as d}
        {@const Icon = d.icon}
        <div class="p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-aura-gold/25 transition-colors">
          <div class="p-3 w-fit rounded-2xl bg-aura-gold/10 text-aura-gold mb-5"><Icon size={22} /></div>
          <h3 class="text-lg font-black mb-1.5">{d.title}</h3>
          <p class="text-sm text-gray-400 leading-relaxed">{d.sub}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Heritage crafts -->
  <section class="border-y border-white/5 bg-white/[0.015]">
    <div class="max-w-6xl mx-auto px-6 py-16">
      <h2 class="text-2xl sm:text-3xl font-serif font-black italic mb-2">শতাব্দীর <span class="text-aura-gold">তাঁত ও কারুশিল্প</span></h2>
      <p class="text-gray-500 text-sm mb-10 max-w-2xl">প্রজন্মের হাত ধরে আসা যে ঐতিহ্য — আজ Aura Neural Grid-এ যাচাই করা, বিশ্বমানে।</p>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {#each CRAFTS as c}
          {@const Icon = c.icon}
          <div class="p-6 rounded-3xl bg-[#0A0A0A] border border-white/5">
            <div class="w-12 h-12 rounded-2xl bg-aura-gold/10 border border-aura-gold/20 flex items-center justify-center text-aura-gold mb-5"><Icon size={20} /></div>
            <h3 class="text-lg font-serif font-black italic mb-0.5">{c.bn}</h3>
            <p class="text-[10px] font-black uppercase tracking-widest text-aura-gold/80 mb-3">{c.en}</p>
            <p class="text-xs text-gray-500 leading-relaxed">{c.story}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Humanitarian pledge -->
  <section class="max-w-5xl mx-auto px-6 py-20">
    <div class="text-center mb-12">
      <div class="text-4xl mb-4">🤲</div>
      <h2 class="text-3xl sm:text-4xl font-serif font-black italic mb-4">শুধু ব্যবসা নয় — একটা <span class="text-aura-gold">অঙ্গীকার।</span></h2>
      <p class="text-gray-400 max-w-2xl mx-auto leading-relaxed">
        স্নেহলতা মানে স্নেহ। প্রতিটি কেনাকাটা শুধু আপনার নয় — একজন তাঁতি, একজন কারিগর, আর একজন অভাবী মানুষের পাশেও দাঁড়ায়।
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      {#each CARE as c}
        {@const Icon = c.icon}
        <div class="p-6 rounded-3xl bg-gradient-to-br from-aura-gold/10 to-transparent border border-aura-gold/20 text-center">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-aura-gold/15 text-aura-gold flex items-center justify-center mb-5"><Icon size={24} /></div>
          <h3 class="text-lg font-black mb-1.5">{c.title}</h3>
          <p class="text-sm text-gray-400 leading-relaxed">{c.sub}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- CTA -->
  <section class="border-t border-white/5">
    <div class="max-w-4xl mx-auto px-6 py-16 text-center">
      <h2 class="text-2xl sm:text-3xl font-serif font-black italic mb-4">কিনুন — আর পাশে দাঁড়ান।</h2>
      <p class="text-gray-400 mb-8">আপনার প্রতিটি অর্ডার একজন কারিগরের রুটি আর একজন শিশুর পোশাক।</p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="/" class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-aura-gold text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors">
          কেনাকাটা করুন <ArrowRight size={16} />
        </a>
        <a href="/sell" class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-aura-gold text-white font-black uppercase tracking-widest text-xs transition-colors">
          তাঁতি/উদ্যোক্তা? বিক্রেতা হোন
        </a>
      </div>
    </div>
  </section>
</div>
