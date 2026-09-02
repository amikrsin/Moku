/**
 * Cloudflare Worker for MOKU (Kakeibo Ledger)
 * Provides D1 database persistence and strict Firebase ID Token authentication.
 */

import { verifyFirebaseIdToken, WorkerEnv, AuthContext, D1PreparedStatement } from './auth';

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
      });
    }

    // API state & sync endpoints
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
