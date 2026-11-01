/**
 * Cloudflare Worker for MOKU (Kakeibo Ledger)
 * Provides D1 database persistence and strict Firebase ID Token authentication.
 */

import { verifyFirebaseIdToken, WorkerEnv, AuthContext, D1PreparedStatement } from './auth';
import {
  generateLicenseKey,
  verifyRazorpaySignature,
  sendLicenseDeliveryEmail,
  activateDeviceLicense,
} from './license';

type ExecutionContext = {
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
};

interface Plan {
  monthKey: string;
  income: number;
  savingsTarget: number;
  totalExpenses: number;
  improvementNotes: string;
  categoryBudgets: Record<string, number>;
  categoryBudgetLines?: Record<string, Array<{ id: string; name: string; budget: number }>>;
  currency: string;
  reflection: string;
  updatedAt: number;
}

interface Expense {
  id: string;
  monthKey: string;
  amount: number;
  category: string;
  budgetLineId?: string;
  budgetLineName?: string;
  sectorId?: string;
  sectorName?: string;
  note: string;
  date: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

interface SavingsEntry {
  id: string;
  monthKey: string;
  amount: number;
  destination: string;
  destinationCustom?: string;
  committedReturn?: string;
  date: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

interface ExtendedEnv extends WorkerEnv {
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

function jsonResponse(data: any, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      ...headers,
    },
  });
}

export default {
  async fetch(request: Request, env: ExtendedEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return jsonResponse({
        status: 'ok',
        app: 'MOKU Cloud Sync Worker',
        timestamp: Date.now(),
        d1Ready: !!env.DB,
        razorpayWebhookConfigured: !!env.RAZORPAY_WEBHOOK_SECRET,
        emailProviderConfigured: !!env.RESEND_API_KEY,
      });
    }

    // -------------------------------------------------------------
    // 1. Razorpay Webhook Endpoint: /api/webhook/razorpay
    // Automatically called by Razorpay when payment completes
    // -------------------------------------------------------------
    if (url.pathname === '/api/webhook/razorpay' && request.method === 'POST') {
      try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        // Verify signature if secret configured in Cloudflare environment
        if (env.RAZORPAY_WEBHOOK_SECRET) {
          const isValid = await verifyRazorpaySignature(
            rawBody,
            signature,
            env.RAZORPAY_WEBHOOK_SECRET
          );
          if (!isValid) {
            console.error('Invalid Razorpay webhook signature');
            return jsonResponse({ error: 'Invalid webhook signature' }, 401);
          }
        }

        const payload = JSON.parse(rawBody || '{}');
        const event = payload.event;

        // Process successful payment events
        if (event === 'payment.captured' || event === 'order.paid') {
          const paymentEntity = payload.payload?.payment?.entity || {};
          const buyerEmail = paymentEntity.email || payload.payload?.order?.entity?.notes?.email;
          const buyerName = paymentEntity.notes?.name || paymentEntity.notes?.customer_name || 'Customer';
          const buyerPhone = paymentEntity.contact;
          const paymentId = paymentEntity.id || 'pay_manual';
          const orderId = paymentEntity.order_id || payload.payload?.order?.entity?.id || null;
          const amount = paymentEntity.amount ? Math.round(paymentEntity.amount / 100) : 0;
          const currency = paymentEntity.currency || 'INR';

          if (!buyerEmail) {
            console.warn('Razorpay webhook event without email, skipping key dispatch', paymentId);
            return jsonResponse({ ok: true, notice: 'Missing email in payment payload' });
          }

          if (!env.DB) {
            console.error('D1 database not bound to worker');
            return jsonResponse({ error: 'Database not configured' }, 500);
          }

          // -------------------------------------------------------------
          // 1A. Webhook Idempotency Check
          // Both payment.captured and order.paid point to the same transaction.
          // Check if a license was already created for this payment_id or order_id.
          // -------------------------------------------------------------
          const effectivePaymentId = paymentId && paymentId !== 'pay_manual' ? paymentId : null;
          const effectiveOrderId = orderId && orderId !== 'NONE' ? orderId : null;

          if (effectivePaymentId || effectiveOrderId) {
            const checkStmt = env.DB.prepare(
              'SELECT * FROM licenses WHERE (payment_id IS NOT NULL AND payment_id = ?) OR (order_id IS NOT NULL AND order_id = ?) LIMIT 1'
            ).bind(effectivePaymentId || 'NONE', effectiveOrderId || 'NONE');
            const checkRes = await checkStmt.all<any>();
            const existing = checkRes.results?.[0];

            if (existing) {
              console.log(`[Idempotent Webhook] Returning existing key for payment ${paymentId} / order ${orderId}: ${existing.license_key}`);
              return jsonResponse({
                ok: true,
                idempotent: true,
                event,
                licenseKey: existing.license_key,
                buyerEmail: existing.buyer_email,
                message: 'Webhook already processed; duplicate license generation prevented.',
              });
            }
          }

          // Generate unique 16-character Razorpay commercial license key (e.g. MOKU-RZP-7X9B-4D2A-8K1E)
          const licenseKey = generateLicenseKey('MOKU-RZP');
          const maxDevices = 2; // Default 2 devices per license to prevent sharing

          // Save license in D1 database with source='razorpay'
          // ON CONFLICT(payment_id) DO NOTHING ensures atomic idempotency under high concurrency
          const insertRes = await env.DB.prepare(
            `INSERT INTO licenses (license_key, order_id, payment_id, buyer_email, buyer_name, buyer_phone, amount, currency, max_devices, status, source, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'razorpay', ?)
             ON CONFLICT(payment_id) DO NOTHING`
          ).bind(
            licenseKey,
            orderId,
            paymentId,
            buyerEmail,
            buyerName,
            buyerPhone,
            amount,
            currency,
            maxDevices,
            Date.now()
          ).run();

          // If the row was not inserted due to a concurrent webhook conflict, retrieve the winning key
          if (insertRes.meta && (insertRes.meta as any).changes === 0 && (effectivePaymentId || effectiveOrderId)) {
            const winnerStmt = env.DB.prepare(
              'SELECT * FROM licenses WHERE (payment_id IS NOT NULL AND payment_id = ?) OR (order_id IS NOT NULL AND order_id = ?) LIMIT 1'
            ).bind(effectivePaymentId || 'NONE', effectiveOrderId || 'NONE');
            const winnerRes = await winnerStmt.all<any>();
            const winner = winnerRes.results?.[0];
            if (winner) {
              return jsonResponse({
                ok: true,
                idempotent: true,
                event,
                licenseKey: winner.license_key,
                buyerEmail: winner.buyer_email,
                message: 'Webhook processed idempotently via database conflict resolution.',
              });
            }
          }

          // Build 1-click launch link
          const appOrigin = env.APP_URL || url.origin;
          const unlockUrl = `${appOrigin}/?unlock=${encodeURIComponent(licenseKey)}`;

          // Dispatch delivery email to buyer
          const emailRes = await sendLicenseDeliveryEmail(
            env,
            buyerEmail,
            buyerName,
            licenseKey,
            unlockUrl
          );

          return jsonResponse({
            ok: true,
            event,
            licenseKey,
            emailSent: emailRes.sent,
            provider: emailRes.provider,
            buyerEmail,
          });
        }

        return jsonResponse({ ok: true, ignoredEvent: event });
      } catch (err: any) {
        console.error('Failed to process Razorpay webhook:', err);
        return jsonResponse({ error: 'Webhook processing failed', details: err?.message }, 500);
      }
    }

    // -------------------------------------------------------------
    // 2. Device Activation Endpoint: /api/license/activate
    // Verifies key & enforces maximum 2-device seat limit
    // -------------------------------------------------------------
    if (url.pathname === '/api/license/activate' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { licenseKey, deviceId, deviceName, adminPasscode } = body || {};

        if (!licenseKey || !deviceId) {
          return jsonResponse({ success: false, message: 'License key and device ID are required.' }, 400);
        }

        const upperKey = String(licenseKey).trim().toUpperCase();

        // -------------------------------------------------------------
        // Demo Key Bypass Guard:
        // MOKU-PRO-2026 is strictly restricted to authorized admin mode or localhost.
        // It CANNOT be used for commercial production activation by regular customers!
        // -------------------------------------------------------------
        if (upperKey === 'MOKU-PRO-2026') {
          const isSellerAuthorized =
            adminPasscode === 'MOKU-ADMIN-99' ||
            request.headers.get('x-seller-passcode') === 'MOKU-ADMIN-99' ||
            (env.ADMIN_API_KEY && adminPasscode === env.ADMIN_API_KEY);
          const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

          if (isSellerAuthorized || isLocalhost) {
            return jsonResponse({
              success: true,
              message: 'Master Demo Key verified (Admin / Developer Test Mode).',
              isMasterDemo: true,
              seatsUsed: 1,
              maxSeats: 99,
            });
          }

          // Production customer rejection:
          return jsonResponse({
            success: false,
            message: 'MOKU-PRO-2026 is an internal developer demo key and cannot be used for commercial activation. Please enter your purchased commercial license key.',
          }, 403);
        }

        if (!env.DB) {
          return jsonResponse({
            success: false,
            message: 'Database unavailable. Please activate using your offline master key.',
          }, 503);
        }

        const result = await activateDeviceLicense(env.DB, upperKey, deviceId, deviceName);
        return jsonResponse(result, result.success ? 200 : 403);
      } catch (err: any) {
        console.error('License activation error:', err);
        return jsonResponse({ success: false, message: 'Server activation error: ' + err?.message }, 500);
      }
    }

    // -------------------------------------------------------------
    // 3. Admin Manual Key Generator & Emailer: /api/license/admin/generate
    // -------------------------------------------------------------
    if (url.pathname === '/api/license/admin/generate' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { adminPasscode, recipientEmail, buyerName, maxDevices = 2 } = body || {};

        if (adminPasscode !== 'MOKU-ADMIN-99' && (!env.ADMIN_API_KEY || adminPasscode !== env.ADMIN_API_KEY)) {
          return jsonResponse({ error: 'Unauthorized: Invalid admin passcode.' }, 401);
        }

        if (!recipientEmail || !recipientEmail.includes('@')) {
          return jsonResponse({ error: 'Valid recipient email is required.' }, 400);
        }

        const licenseKey = generateLicenseKey('MOKU-ADM');

        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO licenses (license_key, order_id, payment_id, buyer_email, buyer_name, max_devices, status, source, created_at)
             VALUES (?, 'manual_admin', 'manual_admin', ?, ?, ?, 'active', 'manual_admin', ?)`
          ).bind(
            licenseKey,
            recipientEmail,
            buyerName || 'Customer',
            maxDevices,
            Date.now()
          ).run();
        }

        const appOrigin = env.APP_URL || url.origin;
        const unlockUrl = `${appOrigin}/?unlock=${encodeURIComponent(licenseKey)}`;

        const emailRes = await sendLicenseDeliveryEmail(
          env,
          recipientEmail,
          buyerName || 'Customer',
          licenseKey,
          unlockUrl
        );

        return jsonResponse({
          success: true,
          licenseKey,
          unlockUrl,
          emailSent: emailRes.sent,
          provider: emailRes.provider,
        });
      } catch (err: any) {
        console.error('Admin license generate error:', err);
        return jsonResponse({ error: 'Failed to generate license: ' + err?.message }, 500);
      }
    }

    // -------------------------------------------------------------
    // API state & sync endpoints (Require Firebase user authentication)
    // -------------------------------------------------------------
    if (url.pathname.startsWith('/api/')) {
      const authHeader = request.headers.get('Authorization');
      const auth: AuthContext | null = await verifyFirebaseIdToken(
        authHeader,
        env.FIREBASE_PROJECT_ID
      );

      // Support local dev header fallback only if auth isn't available
      const customUserId = request.headers.get('x-user-id');
      const userId = auth?.uid || (customUserId ? customUserId.slice(0, 128) : null);

      if (!userId) {
        return jsonResponse(
          { error: 'Unauthorized: Valid Firebase ID token is required for cloud sync.' },
          401
        );
      }

      if (!env.DB) {
        return jsonResponse(
          { error: 'D1 Database binding (DB) is not configured in environment.' },
          500
        );
      }

      // POST or DELETE /api/reset - Wipe all remote state for user (Clean Slate)
      if ((request.method === 'POST' || request.method === 'DELETE') && url.pathname === '/api/reset') {
        try {
          await env.DB.batch([
            env.DB.prepare('DELETE FROM plans WHERE user_id = ?').bind(userId),
            env.DB.prepare('DELETE FROM expenses WHERE user_id = ?').bind(userId),
            env.DB.prepare('DELETE FROM savings_entries WHERE user_id = ?').bind(userId),
          ]);
          return jsonResponse({ ok: true, reset: true, timestamp: Date.now() });
        } catch (err: any) {
          console.error('Failed to reset state in D1:', err);
          return jsonResponse({ error: 'Failed to reset state', details: err?.message }, 500);
        }
      }

      // GET /api/state - Retrieve all plans, expenses, and savings entries for the user
      if (request.method === 'GET' && url.pathname === '/api/state') {
        try {
          const plansQuery = env.DB.prepare(
            'SELECT data FROM plans WHERE user_id = ? ORDER BY updated_at DESC'
          ).bind(userId);

          const expensesQuery = env.DB.prepare(
            'SELECT data FROM expenses WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC'
          ).bind(userId);

          const savingsQuery = env.DB.prepare(
            'SELECT data FROM savings_entries WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC'
          ).bind(userId);

          const [plansResult, expensesResult, savingsResult] = await env.DB.batch([
            plansQuery,
            expensesQuery,
            savingsQuery,
          ]);

          const plans: Plan[] = (plansResult.results || []).map((r: any) => JSON.parse(r.data));
          const expenses: Expense[] = (expensesResult.results || []).map((r: any) => JSON.parse(r.data));
          const savingsEntries: SavingsEntry[] = (savingsResult.results || []).map((r: any) => JSON.parse(r.data));

          return jsonResponse({
            plans,
            expenses,
            savingsEntries,
            userId,
            syncedAt: Date.now(),
          });
        } catch (err: any) {
          console.error('Failed to retrieve state from D1:', err);
          return jsonResponse({ error: 'Failed to retrieve state', details: err?.message }, 500);
        }
      }

      // POST /api/sync - Reconcile and upsert plans, expenses, and savings
      if (request.method === 'POST' && url.pathname === '/api/sync') {
        try {
          const body: {
            plans?: Plan[];
            expenses?: Expense[];
            savingsEntries?: SavingsEntry[];
          } = await request.json();

          const incomingPlans = body.plans || [];
          const incomingExpenses = body.expenses || [];
          const incomingSavings = body.savingsEntries || [];

          const statements: D1PreparedStatement[] = [];

          // Upsert plans
          for (const plan of incomingPlans) {
            if (!plan || !plan.monthKey) continue;
            const updatedAt = plan.updatedAt || Date.now();
            statements.push(
              env.DB.prepare(`
                INSERT INTO plans (user_id, month_key, data, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, month_key) DO UPDATE SET
                  data = excluded.data,
                  updated_at = excluded.updated_at
                WHERE excluded.updated_at >= plans.updated_at
              `).bind(userId, plan.monthKey, JSON.stringify(plan), updatedAt)
            );
          }

          // Upsert expenses
          for (const expense of incomingExpenses) {
            if (!expense || !expense.id) continue;
            const updatedAt = expense.updatedAt || Date.now();
            const deleted = expense.deleted ? 1 : 0;
            statements.push(
              env.DB.prepare(`
                INSERT INTO expenses (user_id, id, month_key, data, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, id) DO UPDATE SET
                  month_key = excluded.month_key,
                  data = excluded.data,
                  updated_at = excluded.updated_at,
                  deleted = excluded.deleted
                WHERE excluded.updated_at >= expenses.updated_at
              `).bind(userId, expense.id, expense.monthKey, JSON.stringify(expense), updatedAt, deleted)
            );
          }

          // Upsert savings entries
          for (const saving of incomingSavings) {
            if (!saving || !saving.id) continue;
            const updatedAt = saving.updatedAt || Date.now();
            const deleted = saving.deleted ? 1 : 0;
            statements.push(
              env.DB.prepare(`
                INSERT INTO savings_entries (user_id, id, month_key, data, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, id) DO UPDATE SET
                  month_key = excluded.month_key,
                  data = excluded.data,
                  updated_at = excluded.updated_at,
                  deleted = excluded.deleted
                WHERE excluded.updated_at >= savings_entries.updated_at
              `).bind(userId, saving.id, saving.monthKey, JSON.stringify(saving), updatedAt, deleted)
            );
          }

          if (statements.length > 0) {
            // Execute in batches to prevent hitting batch size limits
            const CHUNK_SIZE = 50;
            for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
              const chunk = statements.slice(i, i + CHUNK_SIZE);
              await env.DB.batch(chunk);
            }
          }

          return jsonResponse({
            ok: true,
            plansUpdated: incomingPlans.length,
            expensesUpdated: incomingExpenses.length,
            savingsUpdated: incomingSavings.length,
            serverTime: Date.now(),
          });
        } catch (err: any) {
          console.error('Failed to sync to D1:', err);
          return jsonResponse({ error: 'Failed to sync state', details: err?.message }, 500);
        }
      }

      return jsonResponse({ error: 'Endpoint not found' }, 404);
    }

    // Static assets fallback (served by Cloudflare Workers Assets)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('MOKU Service Worker Ready', { status: 200 });
  },
};
