// Storage-backed site config — the single source of truth the Aura Control Center writes
// and the home reads (categories + their cover images, featured/High-Recommended brand).
// Lives as a JSON blob in the public `tryon` Supabase bucket, so NO extra DB table/DDL is
// needed. Everything falls back to code defaults when the file is absent.
import { adminClient } from '$lib/server/vendorSync';

const BUCKET = 'tryon';
const CONFIG_PATH = 'config/site-config.json';

export type ConfigCategory = { id: string; name: string; cover?: string; active?: boolean; order?: number };
// Aura Smart Commission — a deterministic rule (NOT a live LLM; money must be predictable +
// explainable). `fixed` = every vendor pays `base`% unless they have their own rate; `aura` =
// each sale is scored within [min,max].
export type CommissionCfg = { mode: 'fixed' | 'aura'; base: number; min: number; max: number };
export const DEFAULT_COMMISSION_CFG: CommissionCfg = { mode: 'fixed', base: 10, min: 6, max: 11 };
export type SiteConfig = {
  categories?: ConfigCategory[];
  featured?: { vendorSlugs?: string[]; productIds?: number[] };
  commission?: CommissionCfg;
};

/**
 * Deterministic "Aura Smart" commission for one vendor's slice of an order, clamped to
 * [cfg.min, cfg.max]. Signals: bigger orders pay less (reward volume); top-rated vendors pay
 * less; low-rated pay a touch more. Transparent + instant + un-gameable.
 */
export function computeAuraCommission(cfg: CommissionCfg, orderValue: number, avgRating = 0): number {
  let r = cfg.base;
  if (orderValue > 10000) r -= 2;
  else if (orderValue > 5000) r -= 1;
  if (avgRating >= 4.5) r -= 1;
  else if (avgRating >= 1 && avgRating < 3) r += 1;
  return Math.max(cfg.min, Math.min(cfg.max, Math.round(r)));
}

/** Normalise a possibly-partial stored commission config onto safe defaults. */
export function normalizeCommission(c: any): CommissionCfg {
  const min = Number.isFinite(c?.min) ? Number(c.min) : DEFAULT_COMMISSION_CFG.min;
  const max = Number.isFinite(c?.max) ? Number(c.max) : DEFAULT_COMMISSION_CFG.max;
  return {
    mode: c?.mode === 'aura' ? 'aura' : 'fixed',
    base: Number.isFinite(c?.base) ? Number(c.base) : DEFAULT_COMMISSION_CFG.base,
    min: Math.max(0, Math.min(min, max)),
    max: Math.max(min, max)
  };
}

/** Read the site config JSON from Storage. Returns {} if missing/unreadable. */
export async function readSiteConfig(): Promise<SiteConfig> {
  try {
    const { data, error } = await adminClient().storage.from(BUCKET).download(CONFIG_PATH);
    if (error || !data) return {};
    const text = await data.text();
    return text ? (JSON.parse(text) as SiteConfig) : {};
  } catch {
    return {};
  }
}

/** Persist the site config JSON to Storage (overwrite). */
export async function writeSiteConfig(cfg: SiteConfig): Promise<void> {
  const bytes = Buffer.from(JSON.stringify(cfg), 'utf-8');
  const { error } = await adminClient()
    .storage.from(BUCKET)
    .upload(CONFIG_PATH, bytes, { contentType: 'application/json', upsert: true });
  if (error) throw new Error('config write failed: ' + error.message);
}

/** Upload a base64 data-URL image to public Storage, return its public URL. */
export async function uploadAsset(dataUrl: string, prefix = 'assets/img'): Promise<string> {
  const m = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  if (!m) throw new Error('invalid image data URL');
  const mime = m[1];
  const ext = (mime.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
  const bytes = Buffer.from(m[2], 'base64');
  const a = adminClient();
  const path = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9).toString(36)}.${ext}`;
  const { error } = await a.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error('asset upload failed: ' + error.message);
  return a.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
