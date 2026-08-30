// M-Pesa Daraja API Shared Utilities
// Consumer key/secret must be stored as Supabase Edge Function secrets:
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, MPESA_SHORTCODE, MPESA_ENV (sandbox|production)

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  env: 'sandbox' | 'production';
  callbackUrl: string;
}

export function getMpesaConfig(): MpesaConfig {
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY') || '';
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET') || '';
  const passkey = Deno.env.get('MPESA_PASSKEY') || '';
  const shortcode = Deno.env.get('MPESA_SHORTCODE') || '174379';
  const env = (Deno.env.get('MPESA_ENV') as 'sandbox' | 'production') || 'sandbox';
  const projectUrl = Deno.env.get('SUPABASE_URL') || '';
  
  if (!consumerKey || !consumerSecret || !passkey) {
    throw new Error('M-Pesa not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY secrets.');
  }

  return {
    consumerKey,
    consumerSecret,
    passkey,
    shortcode,
    env,
    callbackUrl: `${projectUrl}/functions/v1/mpesa-callback`
  };
}

const API_BASE = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke'
};

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(config: MpesaConfig): Promise<string> {
  // Reuse cached token if still valid (expire 10 min early for safety)
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const auth = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  const res = await fetch(`${API_BASE[config.env]}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to get M-Pesa access token: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 600) * 1000
  };
  return data.access_token;
}

export function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return btoa(shortcode + passkey + timestamp);
}

export function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function formatPhoneForDaraja(phone: string): string {
  // Safaricom requires 2547XXXXXXXX format (no leading + or 0)
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
  return cleaned;
}