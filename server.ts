import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface BudgetLine {
  id: string;
  name: string;
  budget: number;
}

interface CategoryBudgets {
  survival: number;
  optional: number;
  culture: number;
  extra: number;
}

interface Plan {
  monthKey: string;
  income: number;
  savingsTarget: number;
  totalExpenses: number;
  improvementNotes: string;
  categoryBudgets: CategoryBudgets;
  categoryBudgetLines?: {
    survival?: BudgetLine[];
    optional?: BudgetLine[];
    culture?: BudgetLine[];
    extra?: BudgetLine[];
  };
  currency: string;
  reflection: string;
  updatedAt: number;
}

interface Expense {
  id: string;
  monthKey: string;
  amount: number;
  category: "survival" | "optional" | "culture" | "extra";
  budgetLineId?: string;
  budgetLineName?: string;
  note: string;
  date: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

type SavingsDestination = 
  | 'savings_account' 
  | 'fixed_deposit' 
  | 'recurring_deposit' 
  | 'mutual_fund' 
  | 'cash' 
  | 'other';

interface SavingsEntry {
  id: string;
  monthKey: string;
  amount: number;
  destination: SavingsDestination;
  destinationCustom?: string;
  committedReturn?: string;
  date: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

interface UserData {
  plans: Record<string, Plan>; // monthKey -> Plan
  expenses: Record<string, Expense>; // id -> Expense
  savingsEntries?: Record<string, SavingsEntry>; // id -> SavingsEntry
}

// In-memory data store with file persistence
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "kakeibo_store.json");

let globalStore: Record<string, UserData> = {};

// Load existing data from file if present
function loadStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      globalStore = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading data store file:", err);
    globalStore = {};
  }
}

// Save store to disk
function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(globalStore, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving data store file:", err);
  }
}

loadStore();

function getUserIdFromRequest(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      // In production Firebase token decode or user-hash
      // We safely derive or use the token identity
      return token.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128) || "local-user";
    }
  }
  const customUser = req.headers["x-user-id"];
  if (typeof customUser === "string" && customUser.trim()) {
    return customUser.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
  }
  return "local-user";
}

function getUserData(userId: string): UserData {
  if (!globalStore[userId]) {
    globalStore[userId] = { plans: {}, expenses: {}, savingsEntries: {} };
  }
  if (!globalStore[userId].savingsEntries) {
    globalStore[userId].savingsEntries = {};
  }
  return globalStore[userId];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", app: "Kakeibo Ledger", timestamp: Date.now() });
  });

  // GET /api/state - Returns all plans, expenses, and savings for the requesting user
  app.get("/api/state", (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      const userData = getUserData(userId);

      const plans = Object.values(userData.plans);
      const expenses = Object.values(userData.expenses);
      const savingsEntries = Object.values(userData.savingsEntries || {});

      res.json({
        plans,
        expenses,
        savingsEntries,
        syncedAt: Date.now(),
        userId,
      });
    } catch (error) {
      console.error("GET /api/state error:", error);
      res.status(500).json({ error: "Failed to retrieve state" });
    }
  });

  // POST /api/sync - Bulk upsert with last-write-wins reconciliation by updatedAt
  app.post("/api/sync", (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      const userData = getUserData(userId);
      const { 
        plans = [], 
        expenses = [],
        savingsEntries = [] 
      } = req.body as {
        plans?: Plan[];
        expenses?: Expense[];
        savingsEntries?: SavingsEntry[];
      };

      let plansUpdated = 0;
      let expensesUpdated = 0;
      let savingsUpdated = 0;

      // Upsert plans
      for (const incomingPlan of plans) {
        if (!incomingPlan || !incomingPlan.monthKey) continue;
        const existing = userData.plans[incomingPlan.monthKey];
        if (!existing || (incomingPlan.updatedAt || 0) >= (existing.updatedAt || 0)) {
          userData.plans[incomingPlan.monthKey] = {
            ...incomingPlan,
            updatedAt: incomingPlan.updatedAt || Date.now(),
          };
          plansUpdated++;
        }
      }

      // Upsert expenses
      for (const incomingExp of expenses) {
        if (!incomingExp || !incomingExp.id) continue;
        const existing = userData.expenses[incomingExp.id];
        if (!existing || (incomingExp.updatedAt || 0) >= (existing.updatedAt || 0)) {
          userData.expenses[incomingExp.id] = {
            ...incomingExp,
            updatedAt: incomingExp.updatedAt || Date.now(),
          };
          expensesUpdated++;
        }
      }

      // Upsert savings entries
      for (const incomingSav of savingsEntries) {
        if (!incomingSav || !incomingSav.id) continue;
        if (!userData.savingsEntries) userData.savingsEntries = {};
        const existing = userData.savingsEntries[incomingSav.id];
        if (!existing || (incomingSav.updatedAt || 0) >= (existing.updatedAt || 0)) {
          userData.savingsEntries[incomingSav.id] = {
            ...incomingSav,
            updatedAt: incomingSav.updatedAt || Date.now(),
          };
          savingsUpdated++;
        }
      }

      saveStore();

      res.json({
        ok: true,
        plansUpdated,
        expensesUpdated,
        savingsUpdated,
        serverTime: Date.now(),
      });
    } catch (error) {
      console.error("POST /api/sync error:", error);
      res.status(500).json({ error: "Failed to sync state" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kakeibo Ledger server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
