import type { ExpenseFeed, ExpenseRecord } from '@/lib/expense-types';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const categories = ['Groceries', 'Transport', 'Dining', 'Bills', 'Shopping', 'Health', 'Travel', 'Subscriptions'];

const mockExpenses: ExpenseRecord[] = [
  {
    id: 'mock-001',
    date: '2026-05-12T11:40:00.000Z',
    merchant: 'Fresh Basket Market',
    category: 'Groceries',
    amount: 84.27,
    account: 'Everyday Checking',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Weekly pantry refill',
    status: 'posted'
  },
  {
    id: 'mock-002',
    date: '2026-05-11T19:15:00.000Z',
    merchant: 'Northline Transit',
    category: 'Transport',
    amount: 18.4,
    account: 'Everyday Checking',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Ride share and subway',
    status: 'posted'
  },
  {
    id: 'mock-003',
    date: '2026-05-10T20:05:00.000Z',
    merchant: 'Solstice Cafe',
    category: 'Dining',
    amount: 36.58,
    account: 'Rewards Credit',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Dinner with friends',
    status: 'posted'
  },
  {
    id: 'mock-004',
    date: '2026-05-09T09:00:00.000Z',
    merchant: 'City Utilities',
    category: 'Bills',
    amount: 142.88,
    account: 'Bills Checking',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Monthly electric service',
    status: 'posted'
  },
  {
    id: 'mock-005',
    date: '2026-05-07T17:20:00.000Z',
    merchant: 'Aurora Outfitters',
    category: 'Shopping',
    amount: 129.99,
    account: 'Rewards Credit',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Spring wardrobe update',
    status: 'pending'
  },
  {
    id: 'mock-006',
    date: '2026-05-06T15:45:00.000Z',
    merchant: 'Summit Pharmacy',
    category: 'Health',
    amount: 52.19,
    account: 'Everyday Checking',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Prescription refill',
    status: 'posted'
  },
  {
    id: 'mock-007',
    date: '2026-05-04T08:30:00.000Z',
    merchant: 'Cloudline Travel',
    category: 'Travel',
    amount: 318.44,
    account: 'Rewards Credit',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Weekend train booking',
    status: 'posted'
  },
  {
    id: 'mock-008',
    date: '2026-05-03T12:10:00.000Z',
    merchant: 'MusicFlow',
    category: 'Subscriptions',
    amount: 14.99,
    account: 'Rewards Credit',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Streaming subscription',
    status: 'posted'
  },
  {
    id: 'mock-009',
    date: '2026-04-29T13:55:00.000Z',
    merchant: 'Fresh Basket Market',
    category: 'Groceries',
    amount: 76.31,
    account: 'Everyday Checking',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Weekend grocery top-up',
    status: 'posted'
  },
  {
    id: 'mock-010',
    date: '2026-04-26T22:00:00.000Z',
    merchant: 'City Garage',
    category: 'Transport',
    amount: 29.5,
    account: 'Everyday Checking',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Parking for event night',
    status: 'posted'
  },
  {
    id: 'mock-011',
    date: '2026-04-24T18:40:00.000Z',
    merchant: 'Bluebird Bistro',
    category: 'Dining',
    amount: 61.82,
    account: 'Rewards Credit',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Business dinner',
    status: 'posted'
  },
  {
    id: 'mock-012',
    date: '2026-04-20T10:00:00.000Z',
    merchant: 'Northline Insurance',
    category: 'Bills',
    amount: 212.9,
    account: 'Bills Checking',
    bankName: 'Atlas Bank',
    source: 'mock',
    description: 'Monthly coverage payment',
    status: 'posted'
  }
];

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

  return categories[Math.floor(Math.random() * categories.length)];
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
    return null;
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

    if (expenses && expenses.length > 0) {
      return {
        expenses,
        connection: {
          status: 'connected',
          message: `Live bank feed connected with ${expenses.length} transactions.`,
          endpoint: process.env.BANK_API_EXPENSES_ENDPOINT?.trim() || process.env.BANK_EXPENSES_PATH?.trim() || '/expenses',
          lastSynced: new Date().toISOString()
        }
      };
    }
  } catch (error) {
    return {
      expenses: mockExpenses,
      connection: {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to reach bank endpoint. Showing cached sample data.',
        endpoint: process.env.BANK_API_EXPENSES_ENDPOINT?.trim() || process.env.BANK_EXPENSES_PATH?.trim() || '/expenses',
        lastSynced: new Date().toISOString()
      }
    };
  }

  return {
    expenses: mockExpenses,
    connection: {
      status: 'mock',
      message: 'No bank endpoint configured. Showing realistic dashboard sample data.',
      endpoint: 'mock-data',
      lastSynced: new Date().toISOString()
    }
  };
}

export { currency, mockExpenses };