// Transactional email for vendor onboarding — via Resend (domain snehalata.com verified).
// Two mails: (1) on registration → "received, admin will approve"; (2) on approval → "congrats, login".
// Professional, brand-consistent, email-client-safe (table layout + inline styles). Never blocks the caller.
import { env } from '$env/dynamic/private';

const FROM = 'Snehalata <noreply@snehalata.com>';
const SITE = 'https://www.snehalata.com';
const LOGIN_URL = `${SITE}/dashboard`;

// Brand
const DARK = '#0a3a2a';
const GREEN = '#0b8f5e';
const NEON = '#17c964';
const MINT = '#e7f7ef';
const INK = '#1c2b26';
const MUTE = '#5a6b64';

function esc(s: unknown): string {
  return String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] as string);
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const key = env.RESEND_API_KEY;
  if (!key || !to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || /@snehalata\.local$/i.test(to)) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html })
    });
    return r.ok;
  } catch {
    return false;
  }
}

const FONT = "-apple-system,'Segoe UI',Roboto,'Hind Siliguri',Arial,sans-serif";

function trustStrip(): string {
  const cell = (icon: string, label: string) =>
    `<td align="center" width="33%" style="padding:15px 6px;font-size:12px;color:#3f5049;font-family:${FONT};line-height:1.5;"><span style="font-size:20px;">${icon}</span><br>${label}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f6;border-radius:14px;border:1px solid #e4efe9;">
    <tr>${cell('🤖', 'AI-যাচাইকৃত')}${cell('👗', 'AR Try-On')}${cell('💵', 'Cash on Delivery')}</tr>
  </table>`;
}

function shell(opts: { preheader: string; badge: string; title: string; subtitle: string; inner: string }): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef2f0;">
  <span style="display:none!important;opacity:0;color:#eef2f0;font-size:1px;line-height:1px;max-height:0;max-width:0;overflow:hidden;">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f0;padding:26px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e9e6;">
        <!-- header -->
        <tr><td style="background:${DARK};padding:24px 34px;font-family:${FONT};">
          <div style="font-size:23px;font-weight:800;color:#ffffff;letter-spacing:.3px;">স্নেহলতা <span style="color:${NEON};">✦</span></div>
          <div style="font-size:10.5px;letter-spacing:.26em;color:#8fd9b6;font-weight:700;margin-top:4px;">AI + AR MARKETPLACE · BANGLADESH</div>
        </td></tr>
        <tr><td style="height:4px;background:${NEON};line-height:4px;font-size:0;">&nbsp;</td></tr>
        <!-- hero -->
        <tr><td align="center" style="padding:34px 34px 4px;font-family:${FONT};">
          <div style="width:70px;height:70px;line-height:70px;border-radius:50%;background:${MINT};font-size:32px;margin:0 auto 16px;">${opts.badge}</div>
          <div style="font-size:22px;font-weight:800;color:${DARK};">${opts.title}</div>
          <div style="font-size:14px;color:${MUTE};margin-top:7px;">${opts.subtitle}</div>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:22px 34px 6px;font-family:${FONT};font-size:15px;color:${INK};line-height:1.8;">${opts.inner}</td></tr>
        <!-- trust -->
        <tr><td style="padding:14px 34px 30px;">${trustStrip()}</td></tr>
        <!-- footer -->
        <tr><td style="background:${DARK};padding:22px 34px;font-family:${FONT};">
          <div style="color:#ffffff;font-weight:700;font-size:15px;">স্নেহলতা</div>
          <div style="color:#8fd9b6;font-size:12px;margin:3px 0 12px;">প্রতিটি ব্র্যান্ড এক ছাদের নিচে</div>
          <a href="${SITE}" style="color:#cfeede;font-size:12.5px;text-decoration:none;margin-right:16px;">🛍️ Shop</a>
          <a href="${LOGIN_URL}" style="color:#cfeede;font-size:12.5px;text-decoration:none;margin-right:16px;">🔑 Dashboard</a>
          <a href="${SITE}/guide" style="color:#cfeede;font-size:12.5px;text-decoration:none;">❓ সাহায্য</a>
          <div style="color:#5f7a6e;font-size:11px;margin-top:14px;line-height:1.6;">© 2026 Snehalata · Bangladesh<br>আপনি বিক্রেতা হিসেবে রেজিস্ট্রেশন করেছেন বলে এই ইমেইলটি পেয়েছেন।</div>
        </td></tr>
      </table>
      <div style="font-size:11px;color:#9aa8a2;margin-top:14px;font-family:${FONT};">Powered by Aura AI</div>
    </td></tr>
  </table></body></html>`;
}

function stepRow(): string {
  const step = (icon: string, label: string, color: string) =>
    `<td align="center" width="33%" style="font-size:12px;font-weight:700;color:${color};font-family:${FONT};line-height:1.6;"><span style="font-size:19px;">${icon}</span><br>${label}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;">
    <tr>${step('✅', 'রেজিস্ট্রেশন', GREEN)}${step('✅', 'Aura AI Audit', GREEN)}${step('⏳', 'Admin Approve', '#c9922b')}</tr>
  </table>`;
}

/** Sent right after a vendor registers. */
export function sendVendorPending(to: string, shopName: string): Promise<boolean> {
  const inner = `
    <p style="margin:0 0 14px;">প্রিয় পার্টনার,</p>
    <p style="margin:0 0 14px;">স্নেহলতা <b>Aura Neural Grid</b>-এ স্বাগতম — বাংলাদেশের প্রথম <b>Neural Verified Commerce Ecosystem</b>।</p>
    <p style="margin:0 0 6px;">আপনার Storefront <b>${esc(shopName)}</b> এখন verification-এ — Aura AI নিজেই যাচাই করছে। ✅ হলেই সঙ্গে সঙ্গে এই ইমেইলে জানাব।</p>
    ${stepRow()}
    <p style="margin:18px 0 0;color:${MUTE};">— টিম স্নেহলতা</p>`;
  return send(
    to,
    'স্নেহলতা Neural Grid — আপনার Storefront verify হচ্ছে ⚡',
    shell({ preheader: 'Aura AI আপনার Storefront যাচাই করছে — শীঘ্রই LIVE ⚡', badge: '⚡', title: 'স্বাগতম, পার্টনার', subtitle: 'বাংলাদেশের প্রথম Neural Verified Commerce Ecosystem', inner })
  );
}

/** Sent when the admin approves the vendor. */
export function sendVendorApproved(to: string, shopName: string, username: string): Promise<boolean> {
  const btn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 4px;"><tr>
      <td align="center" style="border-radius:999px;background:${GREEN};">
        <a href="${LOGIN_URL}" style="display:inline-block;padding:15px 44px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:999px;font-family:${FONT};">Login করে দোকান শুরু করুন →</a>
      </td></tr></table>`;
  const creds = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f6;border:1px solid #d9e7e0;border-radius:12px;margin:8px 0 20px;">
      <tr><td style="padding:16px 18px;font-family:${FONT};font-size:14px;color:${INK};line-height:1.85;">
        <span style="color:${MUTE};">🔑 ইউজারনেম</span><br><b style="font-size:15px;">${esc(username)}</b> <span style="color:${MUTE};font-size:12px;">(ইমেইল বা মোবাইল নম্বর)</span><br>
        <span style="color:${MUTE};">🔒 পাসওয়ার্ড</span><br>registration-এ আপনি যেটি দিয়েছিলেন <span style="color:${MUTE};font-size:12px;">(ভুলে গেলে login পেজে "Reset")</span>
      </td></tr></table>`;
  const inner = `
    <p style="margin:0 0 14px;font-size:17px;color:${DARK};font-weight:800;">Congratulations, পার্টনার! 🎉</p>
    <p style="margin:0 0 16px;">স্নেহলতা <b>Neural Verified</b>-এর পার্টনার হিসেবে আপনার Storefront <b>${esc(shopName)}</b> এখন সম্পূর্ণ প্রস্তুত — সারা বাংলাদেশের জন্য <b>LIVE</b>। ⚡</p>
    ${btn}
    ${creds}
    <p style="margin:0 0 5px;">🛍️ পণ্যের website বা Facebook দিন — Aura AI <b>নিজেই import</b> করে দেবে</p>
    <p style="margin:0 0 5px;">👗 কাস্টমার <b>AR Try-On</b>-এ গায়ে পরে দেখে অর্ডার করবে</p>
    <p style="margin:0 0 0;">💵 Cash on Delivery — সারা দেশে</p>
    <p style="margin:20px 0 0;font-size:16px;color:${DARK};font-weight:800;">চলুন, E-commerce-এর ভবিষ্যৎ একসাথে গড়ি। 🚀</p>
    <p style="margin:8px 0 0;color:${MUTE};">— টিম স্নেহলতা</p>`;
  return send(
    to,
    '🎉 আপনার Storefront এখন LIVE — স্নেহলতা Neural Verified',
    shell({ preheader: 'অভিনন্দন! আপনার Storefront LIVE — এখনই login করুন।', badge: '🎉', title: 'আপনার Storefront এখন LIVE', subtitle: 'স্নেহলতা Neural Verified পার্টনার', inner })
  );
}
