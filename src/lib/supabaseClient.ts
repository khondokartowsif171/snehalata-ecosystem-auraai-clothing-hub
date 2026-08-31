import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

const supabaseUrl = env.PUBLIC_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const fetchVendorsFromSupabase = async () => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  return supabase.from('vendors').select('*');
};

export const fetchProductsFromSupabase = async () => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  // Only surface products approved/live (is_active true or legacy null) on the storefront.
  return supabase.from('products').select('*').or('is_active.is.null,is_active.eq.true');
};

export const fetchCategoriesFromSupabase = async () => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  return supabase.from('categories').select('*');
};

export const addVendorToSupabase = async (vendor: any) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  return supabase.from('vendors').insert(vendor);
};

export const addProductToSupabase = async (product: any) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  return supabase.from('products').insert(product);
};
