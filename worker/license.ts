/**
 * Commercial License Generation, Razorpay Webhook Verification,
 * Device-Capped Activation, and Automated Buyer Email Delivery.
 *
 * NOTE: The developer/offline master key 'MOKU-PRO-2026' is kept strictly separate
 * from live Razorpay customer license records in Cloudflare D1.
 */

import { D1Database, WorkerEnv } from './auth';

/**
 * Developer / Offline Master Demo Key
 * Kept strictly isolated from live Razorpay customer records.
 */
export const MASTER_DEMO_KEY = 'MOKU-PRO-2026';

export function isMasterDemoKey(key: string): boolean {
  return key.trim().toUpperCase() === MASTER_DEMO_KEY;
}

/**
 * Generates an unambiguous, cryptographically secure 16-character license key
 * Example: MOKU-RZP-7X9B-4D2A-8K1E
 */
export function generateLicenseKey(prefix = 'MOKU-RZP'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes 0, 1, I, O to prevent customer confusion
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);

  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return `${prefix}-${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}`;
}

/**
 * Verifies Razorpay Webhook HMAC-SHA256 signature using timing-safe comparison
 */
export async function verifyRazorpaySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const bodyData = encoder.encode(rawBody);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyData);

    // Convert to hex string
    const hex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const expected = hex;
    const received = signatureHeader.trim().toLowerCase();

    // Constant-time string comparison to prevent timing attacks
    if (expected.length !== received.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ received.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (err) {
    console.error('Razorpay signature verification error:', err);
    return false;
  }
}

/**
 * Sends automated delivery email with License Key and 1-Click Launch Link
 */
export async function sendLicenseDeliveryEmail(
  env: WorkerEnv,
  recipientEmail: string,
  buyerName: string,
  licenseKey: string,
  unlockUrl: string
): Promise<{ sent: boolean; provider: string; error?: string }> {
  const senderEmail = env.SUPPORT_EMAIL || 'support@mokuledger.com';
  const nameDisplay = buyerName && buyerName.trim() ? buyerName.trim() : 'Customer';

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your MOKU License Key</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #F4F6F4; color: #1A1C1A; padding: 32px 16px; margin: 0; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 24px; padding: 36px 28px; border: 1px solid #DDE2DD; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
    .badge { display: inline-block; background: #E8F5EE; color: #176B52; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-size: 24px; margin: 16px 0 8px; color: #176B52; }
    p { font-size: 14px; line-height: 1.6; color: #4A4F4B; margin: 8px 0; }
    .key-box { background: #F7F9F7; border: 2px dashed #176B52; border-radius: 16px; padding: 18px; text-align: center; margin: 20px 0; }
    .key-code { font-size: 24px; font-weight: 800; color: #176B52; letter-spacing: 0.08em; font-family: monospace; margin-top: 4px; }
    .btn { display: block; width: 100%; box-sizing: border-box; text-align: center; background: #176B52; color: #FFFFFF !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 20px; border-radius: 12px; margin: 20px 0; }
    .steps { background: #F7F9F7; border-radius: 14px; padding: 16px 20px; margin-top: 20px; }
    .steps ol { margin: 8px 0 0; padding-left: 18px; }
    .steps li { margin-bottom: 6px; font-size: 13px; color: #333; }
    .footer { text-align: center; font-size: 11px; color: #888; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Payment Confirmed ✓</span>
    <h1>Your MOKU Lifetime App is Ready</h1>
    <p>Hi ${nameDisplay}, thank you for your order! Your purchase unlocks <strong>Full App Installation (PWA on iOS, Android & Desktop)</strong>, <strong>CSV/JSON Data Backups</strong>, and <strong>Unlimited SMS Expense Auto-Fill</strong>.</p>
    
    <a class="btn" href="${unlockUrl}" target="_blank">1-Click Launch &amp; Auto-Unlock App →</a>

    <div class="key-box">
      <div style="font-size: 11px; color: #6E736F; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Your Activation License Key</div>
      <div class="key-code">${licenseKey}</div>
      <div style="font-size: 11px; color: #888; margin-top: 4px;">Valid for up to 2 personal devices (Phone + Laptop)</div>
    </div>

    <div class="steps">
      <strong style="font-size: 13px;">Quick Installation Instructions:</strong>
      <ol>
        <li>Click the green <strong>1-Click Launch</strong> button above (or open the app and enter your key).</li>
        <li>Once the app opens, tap <strong>"Install App"</strong> in the top banner or Profile menu to add it to your home screen.</li>
        <li>Your ledger is 100% private and works completely offline!</li>
      </ol>
    </div>

    <div class="footer">
      MOKU — Mindful Japanese Kakeibo Ledger · If you need any assistance, reply directly to this email.
    </div>
  </div>
</body>
</html>`;

  // 1. Try Resend API first if RESEND_API_KEY is configured
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [recipientEmail],
          subject: 'Your MOKU License Key & 1-Click Download Link',
          html: htmlBody,
        }),
      });

      if (res.ok) {
        return { sent: true, provider: 'resend' };
      } else {
        const errorText = await res.text();
        console.warn('Resend API returned non-OK status:', res.status, errorText);
      }
    } catch (e: any) {
      console.error('Failed to send via Resend API:', e);
    }
  }

  // 2. Fallback to Cloudflare MailChannels (works on Cloudflare Workers without API keys)
  try {
    const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipientEmail, name: nameDisplay }],
          },
        ],
        from: {
          email: senderEmail,
          name: 'MOKU Kakeibo',
        },
        subject: 'Your MOKU License Key & 1-Click Download Link',
        content: [
          {
            type: 'text/html',
            value: htmlBody,
          },
        ],
      }),
    });

    if (mcRes.ok || mcRes.status === 202) {
      return { sent: true, provider: 'mailchannels' };
    }
  } catch (e) {
    // Graceful fallback
  }

  // If email provider is not yet configured, log delivery payload
  console.log(`[License Delivery Generated] To: ${recipientEmail} | Key: ${licenseKey} | Link: ${unlockUrl}`);
  return { sent: false, provider: 'none', error: 'No active email provider configured (set RESEND_API_KEY)' };
}

/**
 * Activates a license key for a specific device.
 * Enforces max device limit (default 2 devices per key).
 * Keeps 'MOKU-PRO-2026' master demo key strictly separate from customer records.
 */
export async function activateDeviceLicense(
  db: D1Database,
  licenseKey: string,
  deviceId: string,
  deviceName = 'Personal Device'
): Promise<{
  success: boolean;
  message: string;
  isMasterDemo?: boolean;
  seatsUsed?: number;
  maxSeats?: number;
}> {
  const cleanKey = licenseKey.trim().toUpperCase();
  if (!cleanKey || !deviceId) {
    return { success: false, message: 'Invalid license key or device identifier.' };
  }

  // 1. Separate Master Demo Key (Developer / Testing Bypass)
  if (isMasterDemoKey(cleanKey)) {
    return {
      success: true,
      message: 'Master Demo Key verified (Offline / Developer Test Mode).',
      isMasterDemo: true,
      seatsUsed: 1,
      maxSeats: 99,
    };
  }

  // 2. Query Commercial License in D1 (Razorpay / Admin Issued)
  const licenseStmt = db.prepare('SELECT * FROM licenses WHERE license_key = ?').bind(cleanKey);
  const licenseRes = await licenseStmt.all<any>();
  const license = licenseRes.results?.[0];

  if (!license) {
    return { success: false, message: 'License key not found. Please verify your purchase receipt.' };
  }

  if (license.status !== 'active') {
    return {
      success: false,
      message: `This license is ${license.status}. Please contact support.`,
    };
  }

  const maxSeats = license.max_devices || 2;

  // 3. Query existing activations for this key
  const activationsStmt = db.prepare(
    'SELECT * FROM license_activations WHERE license_key = ?'
  ).bind(cleanKey);
  const activationsRes = await activationsStmt.all<any>();
  const existingList = activationsRes.results || [];

  // Check if current device is already activated
  const isAlreadyActive = existingList.some((a: any) => a.device_id === deviceId);
  if (isAlreadyActive) {
    return {
      success: true,
      message: 'Device verified. Full app unlocked!',
      seatsUsed: existingList.length,
      maxSeats,
    };
  }

  // If new device, enforce maximum device seat limit
  if (existingList.length >= maxSeats) {
    return {
      success: false,
      message: `Device limit reached. This license is already active on ${existingList.length}/${maxSeats} devices. Sharing is prohibited.`,
      seatsUsed: existingList.length,
      maxSeats,
    };
  }

  // Insert new activation record
  const activationId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.prepare(
    'INSERT INTO license_activations (id, license_key, device_id, device_name, activated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(activationId, cleanKey, deviceId, deviceName, Date.now()).run();

  return {
    success: true,
    message: 'Activation successful! Full app unlocked.',
    seatsUsed: existingList.length + 1,
    maxSeats,
  };
}
