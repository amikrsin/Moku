import { Category } from '../types';

export interface ParsedSmsTransaction {
  amount: number;
  merchant: string;
  type: 'expense' | 'income';
  suggestedCategory: Category;
  suggestedSector?: string;
  source: string;
  dateIso?: string;
  rawText: string;
}

const MERCHANT_RULES: Array<{
  pattern: RegExp;
  merchantName?: string;
  category: Category;
  sector: string;
}> = [
  { pattern: /swiggy|zomato|dominos|pizza|kfc|mcdonald|burger|starbucks|blue tokai|cafe|coffee|restaurant|dining|eatclub|box8/i, category: 'optional', sector: 'Dining Out' },
  { pattern: /blinkit|zepto|instamart|bigbasket|dmart|reliance fresh|nature'?s basket|grocer|supermarket|milk|vegetables|kirana/i, category: 'survival', sector: 'Groceries' },
  { pattern: /uber|ola|rapido|namma yatri|metro|irctc|petrol|fuel|shell|hpcl|bpcl|iocl|fastag|parking|toll/i, category: 'survival', sector: 'Transport' },
  { pattern: /apollo|pharmeasy|1mg|medplus|netmeds|hospital|clinic|doctor|dental|pharmacy|medical|health/i, category: 'survival', sector: 'Medical' },
  { pattern: /bescom|electricity|water bill|gas bill|indane|bharatgas|hp gas|jio|airtel|vi |vodafone|act fibernet|broadband|wifi|recharge|billdesk|bbps/i, category: 'survival', sector: 'Utilities' },
  { pattern: /rent|maintenance|society|nobroker|mygate/i, category: 'survival', sector: 'Rent / Mortgage' },
  { pattern: /netflix|prime video|hotstar|spotify|youtube|apple|bookmyshow|pvr|inox|movie|gaming|steam|playstation/i, category: 'optional', sector: 'Subscriptions' },
  { pattern: /amazon|flipkart|myntra|ajio|nykaa|meesho|zara|h&m|uniqlo|decathlon|shopping|mall|lifestyle|westside/i, category: 'optional', sector: 'Shopping' },
  { pattern: /udemy|coursera|audible|kindle|crossword|book|course|workshop|tuition|school|college|exam|linkedin/i, category: 'culture', sector: 'Books' },
  { pattern: /cult\.?fit|gym|fitness|yoga|sports/i, category: 'culture', sector: 'Fitness' },
  { pattern: /zerodha|groww|kuvera|coin|mutual fund|sip|nps|ppf|lic|insurance/i, category: 'culture', sector: 'Self-Improvement' },
  { pattern: /plumber|electrician|urban company|repair|service|mechanic|emergency|fine|penalty|gift|wedding/i, category: 'extra', sector: 'Repairs' },
];

/**
 * Parses a single raw Bank / UPI / Card SMS message into structured transaction fields.
 */
export function parseSingleSms(rawText: string): ParsedSmsTransaction | null {
  const cleaned = rawText.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length < 4) return null;

  // 1. Extract Amount:
  // Matches formats like: Rs. 450.00, INR 1,250, ₹500, Rs 340, USD 25.50, $19.99, or "450.00 debited/spent/paid"
  const currencyPrefixRegex = /(?:rs\.?|inr|₹|usd|\$|eur|€|gbp|£)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const currencySuffixRegex = /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹|debited|spent|paid|credited|received|sent|withdrawn)/i;
  const standaloneNumberRegex = /\b(\d[\d,]*(?:\.\d{1,2})?)\b/;

  const prefixMatch = cleaned.match(currencyPrefixRegex);
  const suffixMatch = cleaned.match(currencySuffixRegex);
  const fallbackMatch = cleaned.match(standaloneNumberRegex);

  let amount = 0;
  if (prefixMatch && prefixMatch[1]) {
    amount = parseFloat(prefixMatch[1].replace(/,/g, ''));
  } else if (suffixMatch && suffixMatch[1]) {
    amount = parseFloat(suffixMatch[1].replace(/,/g, ''));
  } else if (fallbackMatch && fallbackMatch[1]) {
    amount = parseFloat(fallbackMatch[1].replace(/,/g, ''));
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  // 2. Determine Transaction Type (Income vs Expense)
  const isIncome =
    /\b(?:credited|received|deposited|salary|refund|cashback|inflow)\b/i.test(cleaned) &&
    !/\b(?:debited|spent|paid|sent)\b.*?\b(?:credited)\b/i.test(cleaned);

  // 3. Extract Merchant / Payee Name
  let merchant = '';

  // Common Indian & Global Bank / UPI SMS patterns:
  // - "at MERCHANT on" / "to MERCHANT on" / "to VPA merchant@okaxis"
  // - "Paid Rs. 450 to MERCHANT" / "Sent Rs. 200 to MERCHANT"
  // - "trf to MERCHANT Ref" / "Info: UPI/12345/MERCHANT"
  const merchantPatterns = [
    /(?:paid to|sent to|trf to|transfer to|debited for|spent on|spent at|purchase at|at|to)\s+(?:vpa\s+)?([A-Za-z0-9][A-Za-z0-9\s.&'_-]{1,30}?)(?:\s+(?:on|via|ref|upi|txn|dated|from|bal|avl|a\/c|ac|card|not you|\.|,|-|;)|$)/i,
    /vpa\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i,
    /info[:\s-]+(?:upi\/[^/]+\/)?([A-Za-z0-9\s.&_-]{2,25})/i,
  ];

  for (const regex of merchantPatterns) {
    const m = cleaned.match(regex);
    if (m && m[1]) {
      const candidate = m[1]
        .replace(/\b(?:upi|ref|no|txn|id|ac|a\/c|xx\d+)\b.*/i, '')
        .trim();
      if (candidate.length >= 2 && !/^\d+$/.test(candidate)) {
        merchant = candidate;
        break;
      }
    }
  }

  // 4. Match against known merchants & Kakeibo categories
  let suggestedCategory: Category = 'survival';
  let suggestedSector: string | undefined = undefined;

  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(cleaned) || (merchant && rule.pattern.test(merchant))) {
      suggestedCategory = rule.category;
      suggestedSector = rule.sector;
      if (!merchant && rule.merchantName) {
        merchant = rule.merchantName;
      }
      break;
    }
  }

  // Clean up VPA handle if merchant is an email/VPA like swiggy@axisbank
  if (merchant.includes('@')) {
    const handle = merchant.split('@')[0].replace(/[._-]/g, ' ');
    merchant = handle.replace(/\b\w/g, (c) => c.toUpperCase());
  } else if (merchant) {
    // Title-case if all uppercase
    if (merchant === merchant.toUpperCase() && merchant.length > 3) {
      merchant = merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  // Fallback merchant name if none extracted
  if (!merchant) {
    if (isIncome) {
      merchant = /salary/i.test(cleaned) ? 'Monthly Salary' : 'Bank Credit / Inflow';
    } else if (suggestedSector) {
      merchant = `${suggestedSector} Payment`;
    } else {
      // Take non-numeric words if user typed something simple like "Coffee 250" or "250 Zomato"
      const simpleWords = cleaned
        .replace(currencyPrefixRegex, '')
        .replace(/\b(?:\d+(?:\.\d+)?|rs\.?|inr|upi|debited|credited|spent|paid|sent|from|acct|a\/c|xx\d+|on|ref)\b/gi, '')
        .replace(/[^\w\s]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 2);
      merchant = simpleWords.slice(0, 3).join(' ') || 'SMS Expense';
    }
  }

  // 5. Detect Payment Source
  let source = 'SMS / Clipboard';
  if (/upi|gpay|phonepe|paytm|bhim|vpa/i.test(cleaned)) {
    source = 'UPI SMS';
  } else if (/card|credit card|debit card|pos|ecom/i.test(cleaned)) {
    source = 'Card Alert SMS';
  } else if (/hdfc|sbi|icici|axis|kotak|pnb|bob|bank|a\/c|acct/i.test(cleaned)) {
    source = 'Bank SMS';
  }

  // 6. Optional Date Extraction (e.g. 19-10-2026, 19/10/26, 19 Oct)
  let dateIso: string | undefined = undefined;
  const dateMatch = cleaned.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    let year = parseInt(dateMatch[3], 10);
    if (year < 100) year += 2000;
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      dateIso = parsedDate.toISOString().slice(0, 10);
    }
  }

  return {
    amount,
    merchant,
    type: isIncome ? 'income' : 'expense',
    suggestedCategory,
    suggestedSector,
    source,
    dateIso,
    rawText: cleaned,
  };
}

/**
 * Splits multi-line or bulk pasted SMS messages and parses all valid transactions.
 */
export function parseBulkSms(rawInput: string): ParsedSmsTransaction[] {
  if (!rawInput.trim()) return [];

  // Split by blank lines or newline if each line looks like a separate transaction with an amount
  const lines = rawInput
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const single = parseSingleSms(rawInput);
    return single ? [single] : [];
  }

  const results: ParsedSmsTransaction[] = [];
  for (const line of lines) {
    const parsed = parseSingleSms(line);
    if (parsed) {
      results.push(parsed);
    }
  }

  // Fallback: if splitting by lines produced nothing, try parsing the whole block as one SMS
  if (results.length === 0) {
    const single = parseSingleSms(rawInput);
    if (single) results.push(single);
  }

  return results;
}

export interface QuickMemoResult {
  amount?: number;
  note?: string;
  category?: Category;
  sector?: string;
  paymentMethod?: 'UPI' | 'Card' | 'Cash' | 'NetBanking';
}

/**
 * Parses user natural language quick text like:
 * "Coffee 150", "Lunch 320 at Swiggy", "450 Groceries cash", "12.50 book"
 */
export function parseQuickMemo(text: string): QuickMemoResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Try SMS parser first if it looks like a bank message
  if (/(?:debited|spent|paid to|credited|vpa|txn|ref|avl bal|a\/c)/i.test(trimmed)) {
    const sms = parseSingleSms(trimmed);
    if (sms) {
      return {
        amount: sms.amount,
        note: sms.merchant || trimmed,
        category: sms.suggestedCategory,
        sector: sms.suggestedSector,
        paymentMethod: /upi/i.test(trimmed) ? 'UPI' : /card/i.test(trimmed) ? 'Card' : undefined,
      };
    }
  }

  // 2. Extract number (supports ₹150, $24.50, 450, etc.)
  let amount: number | undefined;
  const numMatch = trimmed.match(/(?:(?:rs\.?|inr|₹|\$|€|£)\s*)?(\d+(?:\.\d{1,2})?)/i);
  if (numMatch && numMatch[1]) {
    const parsed = parseFloat(numMatch[1]);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 3. Extract payment method
  let paymentMethod: 'UPI' | 'Card' | 'Cash' | 'NetBanking' | undefined;
  if (/\b(?:upi|gpay|phonepe|paytm)\b/i.test(trimmed)) {
    paymentMethod = 'UPI';
  } else if (/\b(?:card|credit|debit|visa|mastercard)\b/i.test(trimmed)) {
    paymentMethod = 'Card';
  } else if (/\b(?:cash|atm)\b/i.test(trimmed)) {
    paymentMethod = 'Cash';
  } else if (/\b(?:netbanking|neft|rtgs|imps)\b/i.test(trimmed)) {
    paymentMethod = 'NetBanking';
  }

  // 4. Extract note / description by stripping amount, currency symbols, and payment keywords
  let note = trimmed
    .replace(/(?:rs\.?|inr|₹|\$|€|£)\s*\d+(?:\.\d{1,2})?/gi, '')
    .replace(/\b\d+(?:\.\d{1,2})?\b/g, '')
    .replace(/\b(?:via|by|with|paid|spent|debited|for|at|on)\b/gi, '')
    .replace(/\b(?:upi|gpay|phonepe|paytm|cash|card|credit|debit)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If note became empty, fallback to clean trimmed text
  if (!note) {
    note = trimmed;
  }

  // 5. Match category & sector from rules
  let category: Category | undefined;
  let sector: string | undefined;

  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(trimmed)) {
      category = rule.category;
      sector = rule.sector;
      break;
    }
  }

  return {
    amount,
    note: note || undefined,
    category,
    sector,
    paymentMethod,
  };
}
