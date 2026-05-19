import type { ExpenseFeed, ExpenseRecord } from '@/lib/expense-types';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

function normalizeDate(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.abs(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) {
      return Math.abs(parsed);
    }
  }

  return 0;
}

function chooseCategory(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return 'Uncategorized';
}

function normalizeItem(item: Record<string, unknown>, index: number): ExpenseRecord {
  const merchant = String(item.merchant ?? item.payee ?? item.name ?? 'Unknown merchant');

  return {
    id: String(item.id ?? item.transactionId ?? `${merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`),
    date: normalizeDate(item.date ?? item.postedAt ?? item.timestamp),
    merchant,
    category: chooseCategory(item.category ?? item.mccCategory),
    amount: normalizeNumber(item.amount ?? item.value ?? item.debit),
    account: String(item.account ?? item.accountName ?? 'Primary account'),
    bankName: String(item.bankName ?? item.institution ?? 'Connected bank'),
    source: 'bank-api',
    description: String(item.description ?? item.memo ?? item.note ?? 'Imported from bank endpoint'),
    status: String(item.status ?? item.pending ?? '').toLowerCase() === 'pending' ? 'pending' : 'posted'
  };
}

async function fetchBankExpenses(): Promise<ExpenseRecord[] | null> {
  const baseUrl = process.env.BANK_API_BASE_URL?.trim();
  const path = process.env.BANK_EXPENSES_PATH?.trim() || process.env.BANK_API_EXPENSES_ENDPOINT?.trim() || '/expenses';

  if (!baseUrl) {
    throw new Error('BANK_API_BASE_URL is not configured. Set it to a bank-backed expense API endpoint.');
  }

  const endpoint = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const headers: HeadersInit = {
    Accept: 'application/json'
  };

  const apiKey = process.env.BANK_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const accountId = process.env.BANK_ACCOUNT_ID?.trim();
  if (accountId) {
    headers['X-Account-Id'] = accountId;
  }

  const response = await fetch(endpoint, {
    headers,
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Bank endpoint returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { transactions?: unknown[] }).transactions)
      ? (payload as { transactions: unknown[] }).transactions
      : Array.isArray((payload as { expenses?: unknown[] }).expenses)
        ? (payload as { expenses: unknown[] }).expenses
        : Array.isArray((payload as { items?: unknown[] }).items)
          ? (payload as { items: unknown[] }).items
          : [];

  return rawItems.map((item, index) => normalizeItem((item ?? {}) as Record<string, unknown>, index));
}

export async function getExpenseFeed(): Promise<ExpenseFeed> {
  try {
    const expenses = await fetchBankExpenses();

    return {
      expenses,
      connection: {
        status: 'connected',
        message: `Live bank feed connected with ${expenses.length} transactions.`,
        endpoint: process.env.BANK_API_EXPENSES_ENDPOINT?.trim() || process.env.BANK_EXPENSES_PATH?.trim() || '/expenses',
        lastSynced: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      expenses: [],
      connection: {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to reach the bank endpoint.',
        endpoint: process.env.BANK_API_EXPENSES_ENDPOINT?.trim() || process.env.BANK_EXPENSES_PATH?.trim() || '/expenses',
        lastSynced: new Date().toISOString()
      }
    };
  }
}

export { currency };