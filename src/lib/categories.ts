import { LayoutGrid, Store, TrendingUp, Sparkles, Zap } from '@lucide/svelte';

// Single source of truth for the marketplace categories — shared by the home grid,
// the mobile category sheet, and the desktop sidebar. `cover` = a real "Neural Verified"
// product photo shown on the category tile (falls back to a gradient when absent).
export const ECO_CATEGORIES = [
  { id: 'all', name: 'সব সংগ্রহ (All)', icon: LayoutGrid, cover: '' },
  { id: 'saree', name: 'শাড়ি (Saree)', icon: Store, cover: '/products/saree-1.jpg' },
  { id: 'panjabi', name: 'পাঞ্জাবি (Panjabi)', icon: Store, cover: '/products/panjabi-1.jpg' },
  { id: 'three-piece', name: 'থ্রি-পিস (3-Piece)', icon: Store, cover: '/products/threepiece-1.jpg' },
  { id: 't-shirt', name: 'টি-শার্ট (T-Shirt)', icon: Store, cover: '/products/kids-tee-1.jpg' },
  { id: 'pant', name: 'প্যান্ট (Pant)', icon: Store, cover: '/products/pant-1.jpg' },
  { id: 'baby', name: 'বেবি আইটেম (Baby)', icon: Store, cover: '/products/baby-1.jpg' },
  { id: 'market', name: 'মার্কেট প্লেস (Market)', icon: TrendingUp, cover: '' },
  { id: 'cosmetics', name: 'কসমেটিকস (Cosmetics)', icon: Sparkles, cover: '/products/cosmetic-2.jpg' },
  { id: 'undergarments', name: 'আন্ডারগার্মেন্টস (Undergarments)', icon: Store, cover: '/products/undergarment-1.jpg' },
  { id: 'gadgets', name: 'গ্যাজেট (Gadgets)', icon: Zap, cover: '' },
  { id: 'others', name: 'অন্যান্য (Others)', icon: LayoutGrid, cover: '' }
];
