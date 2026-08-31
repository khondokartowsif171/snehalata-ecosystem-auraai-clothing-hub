import { browser } from '$app/environment';
import { supabase } from './supabaseClient';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  provider: 'google' | 'email' | 'guest';
  address?: {
    street?: string;
    city?: string;
    district?: string;
    division?: string;
    postalCode?: string;
  };
  createdAt: string;
}

const STORAGE_KEY = 'snehalata_customer_session_v1';

export function getStoredCustomer(): CustomerProfile | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCustomer(profile: CustomerProfile | null) {
  if (!browser) return;
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('snehalata_customer_auth_changed', { detail: profile }));
  } catch (err) {
    console.error('Failed to save customer session:', err);
  }
}

/**
 * Trigger official Google OAuth Login via Supabase
 */
export async function loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (!browser) return { success: false, error: 'Browser environment required' };

  if (supabase) {
    try {
      const redirectUrl = `${window.location.origin}/account`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.warn('Supabase OAuth error, falling back to direct sign-in:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('OAuth trigger exception:', err);
      return { success: false, error: err?.message || 'OAuth initialization failed' };
    }
  }

  // Fallback for demo / offline environment when Supabase keys are not active:
  return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
}

/**
 * Direct Google / Gmail One-Tap or Quick Sign In
 */
export function directGoogleLogin(email: string, name?: string, avatarUrl?: string): CustomerProfile {
  const cleanEmail = email.trim().toLowerCase();
  const userName = name?.trim() || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  const existing = getStoredCustomer();
  const profile: CustomerProfile = {
    id: existing?.id || 'cust_' + Math.random().toString(36).substring(2, 9),
    name: userName,
    email: cleanEmail,
    phone: existing?.phone || '',
    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=047857`,
    provider: 'google',
    address: existing?.address || {
      street: '',
      city: 'Dhaka',
      district: 'Dhaka',
      division: 'Dhaka',
    },
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  saveCustomer(profile);
  return profile;
}

/**
 * Sign out customer cleanly
 */
export async function customerLogout() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  saveCustomer(null);
}

/**
 * Listen and sync Supabase auth session if active
 */
export function initCustomerAuthListener(onProfileLoaded?: (profile: CustomerProfile | null) => void) {
  if (!browser) return () => {};

  // Check stored first
  const current = getStoredCustomer();
  if (onProfileLoaded) onProfileLoaded(current);

  // If Supabase is available, sync OAuth redirect session
  if (supabase) {
    // 1. Process URL hash / code if returning from OAuth
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data?.session?.user) {
          const u = data.session.user;
          const meta = u.user_metadata || {};
          const profile: CustomerProfile = {
            id: u.id,
            name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Customer',
            email: u.email || '',
            phone: u.phone || meta.phone || '',
            avatar_url: meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(meta.name || 'User')}`,
            provider: 'google',
            createdAt: u.created_at || new Date().toISOString(),
          };
          saveCustomer(profile);
          if (onProfileLoaded) onProfileLoaded(profile);
          // Clean up URL query
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }

    // 2. Check active Supabase session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        const u = data.session.user;
        const meta = u.user_metadata || {};
        const profile: CustomerProfile = {
          id: u.id,
          name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Customer',
          email: u.email || '',
          phone: u.phone || meta.phone || '',
          avatar_url: meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(meta.name || 'User')}`,
          provider: 'google',
          createdAt: u.created_at || new Date().toISOString(),
        };
        saveCustomer(profile);
        if (onProfileLoaded) onProfileLoaded(profile);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = session.user;
        const meta = u.user_metadata || {};
        const profile: CustomerProfile = {
          id: u.id,
          name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Customer',
          email: u.email || '',
          phone: u.phone || meta.phone || '',
          avatar_url: meta.avatar_url || meta.picture,
          provider: 'google',
          createdAt: u.created_at || new Date().toISOString(),
        };
        saveCustomer(profile);
        if (onProfileLoaded) onProfileLoaded(profile);
      } else if (event === 'SIGNED_OUT') {
        saveCustomer(null);
        if (onProfileLoaded) onProfileLoaded(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }

  return () => {};
}
