'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ExpenseFeed, ExpenseRecord } from '@/lib/expense-types';
import { currency } from '@/lib/bank';

type TimeWindow = '30d' | '90d' | 'all';

const formatDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const formatMonth = new Intl.DateTimeFormat('en-US', {
  month: 'short'
});

function getMonthKey(dateValue: string) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return formatMonth.format(new Date(year, month - 1, 1));
}

function daysAgo(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function calculateWindowStart(window: TimeWindow) {
  if (window === '30d') {
    return daysAgo(30);
  }

  if (window === '90d') {
    return daysAgo(90);
  }

  return Number.NEGATIVE_INFINITY;
}

function toPercent(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / maxValue) * 100));
}

function computeTotals(expenses: ExpenseRecord[]) {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const average = expenses.length > 0 ? total / expenses.length : 0;
  const largest = expenses.reduce((highest, item) => (item.amount > highest.amount ? item : highest), expenses[0] ?? null);

  return { total, average, largest };
}

export function ExpenseDashboard() {
  const [feed, setFeed] = useState<ExpenseFeed | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [account, setAccount] = useState('all');
  const [window, setWindow] = useState<TimeWindow>('90d');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadExpenses = async () => {
    setLoadState('loading');

    try {
      const response = await fetch('/api/expenses', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load expenses (${response.status})`);
      }

      const payload = (await response.json()) as ExpenseFeed;
      setFeed(payload);
      setLoadState('ready');
    } catch {
      setLoadState('error');
      setFeed({
        expenses: [],
        connection: {
          status: 'error',
          message: 'The dashboard could not load expense data right now.',
          endpoint: '/api/expenses',
          lastSynced: new Date().toISOString()
        }
      });
    }
  };

  useEffect(() => {
    void loadExpenses();
  }, []);

  const expenses = useMemo(() => feed?.expenses ?? [], [feed]);

  const categories = useMemo<string[]>(
    () => ['all', ...new Set(expenses.map((item: ExpenseRecord) => item.category))],
    [expenses]
  );
  const accounts = useMemo<string[]>(
    () => ['all', ...new Set(expenses.map((item: ExpenseRecord) => item.account))],
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    const queryValue = query.trim().toLowerCase();
    const startTime = calculateWindowStart(window);

    return expenses
      .filter((item: ExpenseRecord) => {
        const matchesQuery =
          queryValue.length === 0 ||
          [item.merchant, item.description, item.category, item.account, item.bankName].some((value) =>
            value.toLowerCase().includes(queryValue)
          );
        const matchesCategory = category === 'all' || item.category === category;
        const matchesAccount = account === 'all' || item.account === account;
        const matchesWindow = new Date(item.date).valueOf() >= startTime;

        return matchesQuery && matchesCategory && matchesAccount && matchesWindow;
      })
      .sort(
        (left: ExpenseRecord, right: ExpenseRecord) =>
          new Date(right.date).valueOf() - new Date(left.date).valueOf()
      );
  }, [account, category, expenses, query, window]);

  const visibleTotals = useMemo(() => computeTotals(filteredExpenses), [filteredExpenses]);
  const allTotals = useMemo(() => computeTotals(expenses), [expenses]);

  const monthlySeries = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const item of filteredExpenses) {
      const key = getMonthKey(item.date);
      buckets.set(key, (buckets.get(key) ?? 0) + item.amount);
    }

    return Array.from(buckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6)
      .map(([key, value]) => ({ key, label: getMonthLabel(key), value }));
  }, [filteredExpenses]);

  const categorySeries = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const item of filteredExpenses) {
      buckets.set(item.category, (buckets.get(item.category) ?? 0) + item.amount);
    }

    return Array.from(buckets.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [filteredExpenses]);

  const maxCategorySpend = categorySeries[0]?.value ?? 0;
  const maxMonthlySpend = monthlySeries[0]?.value ?? 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-glow backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-cyan-200">
              Expense Intelligence Console
            </div>
            <h1 className="font-[var(--font-display)] text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              See every spending pattern in one focused dashboard.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Pull expense history from your bank endpoints, filter it instantly, and surface the data that matters most:
              category drift, major vendors, recent transactions, and the overall shape of your cash flow.
            </p>
          </div>

          <div className="grid min-w-[280px] gap-3 rounded-[1.5rem] border border-white/10 bg-[var(--panel-strong)] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Bank connection</p>
                <p className="mt-1 text-sm font-medium text-white">{feed?.connection.status === 'connected' ? 'Live feed' : 'Needs attention'}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${feed?.connection.status === 'connected' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
                {feed?.connection.status ?? 'loading'}
              </div>
            </div>
            <div className="h-px bg-white/10" />
            <div className="grid gap-1 text-sm text-slate-300">
              <span>{feed?.connection.message ?? 'Loading expense feed...'}</span>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Endpoint: {feed?.connection.endpoint ?? '/api/expenses'}</span>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Last sync: {feed ? formatDate.format(new Date(feed.connection.lastSynced)) : '—'}</span>
            </div>
            <button
              type="button"
              onClick={() => startTransition(() => void loadExpenses())}
              className="mt-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
            >
              {isPending ? 'Refreshing...' : 'Refresh data'}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          <MetricCard label="Filtered spend" value={currency.format(visibleTotals.total)} caption={`${filteredExpenses.length} transactions`} />
          <MetricCard label="All-time spend" value={currency.format(allTotals.total)} caption={`${expenses.length} total transactions`} />
          <MetricCard label="Average ticket" value={currency.format(visibleTotals.average)} caption="For the current filter" />
          <MetricCard label="Largest item" value={visibleTotals.largest ? currency.format(visibleTotals.largest.amount) : currency.format(0)} caption={visibleTotals.largest ? visibleTotals.largest.merchant : 'No matching expenses'} />
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(7,16,31,0.55)] p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Monthly trend</p>
                <h2 className="mt-1 font-[var(--font-display)] text-2xl text-white">Spending over time</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 px-3 py-1">Bank sourced</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Live filtering</span>
              </div>
            </div>

            <div className="mt-6 grid h-72 grid-cols-6 items-end gap-3">
              {monthlySeries.length > 0 ? monthlySeries.map((bucket) => (
                <div key={bucket.key} className="flex h-full flex-col justify-end gap-3">
                  <div className="flex min-h-0 flex-1 items-end rounded-3xl border border-cyan-300/10 bg-white/5 p-2">
                    <div
                      className="w-full rounded-2xl bg-gradient-to-t from-[var(--accent-strong)] via-[var(--accent)] to-cyan-200 shadow-[0_0_35px_rgba(98,208,255,0.35)] transition hover:opacity-90"
                      style={{ height: `${toPercent(bucket.value, maxMonthlySpend)}%` }}
                      title={`${bucket.label}: ${currency.format(bucket.value)}`}
                    />
                  </div>
                  <div className="text-center text-xs uppercase tracking-[0.2em] text-slate-400">
                    <div>{bucket.label}</div>
                    <div className="mt-1 text-slate-200">{currency.format(bucket.value)}</div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full grid h-full place-items-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-400">
                  No data matches the selected filters.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(7,16,31,0.55)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Top categories</p>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl text-white">Where the money goes</h2>

            <div className="mt-6 space-y-4">
              {categorySeries.length > 0 ? categorySeries.map((bucket) => (
                <div key={bucket.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-200">{bucket.label}</span>
                    <span className="text-slate-400">{currency.format(bucket.value)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-300 to-[var(--accent-strong)]"
                      style={{ width: `${toPercent(bucket.value, maxCategorySpend)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                  No category data is available for the current selection.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Quick interpretation</p>
              <p className="mt-2 leading-6">
                Use the filters to isolate a time range or vendor set, then inspect the bars to see whether spending is flat,
                seasonal, or concentrated in a few categories.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(7,16,31,0.55)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Filters</p>
                <h2 className="mt-1 font-[var(--font-display)] text-2xl text-white">Focus the dataset</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                  setAccount('all');
                  setWindow('90d');
                }}
                className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
              >
                Reset
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="grid gap-2 text-sm text-slate-300">
                Search
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Merchant, memo, category..."
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-300">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                >
                  {categories.map((item) => (
                    <option key={item} value={item} className="bg-slate-950">
                      {item === 'all' ? 'All categories' : item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-slate-300">
                Account
                <select
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                >
                  {accounts.map((item) => (
                    <option key={item} value={item} className="bg-slate-950">
                      {item === 'all' ? 'All accounts' : item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 text-sm text-slate-300">
                Time window
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: '30d', label: '30d' },
                    { value: '90d', label: '90d' },
                    { value: 'all', label: 'All' }
                  ] as const).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setWindow(item.value)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${window === item.value ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(7,16,31,0.55)] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Recent activity</p>
                <h2 className="mt-1 font-[var(--font-display)] text-2xl text-white">Transactions in context</h2>
              </div>
              <p className="text-sm text-slate-400">
                Showing {filteredExpenses.length} of {expenses.length}
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.4fr] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>Merchant</span>
                <span>Category</span>
                <span>Date</span>
                <span className="text-right">Amount</span>
              </div>

              <div className="max-h-[34rem] divide-y divide-white/10 overflow-y-auto">
                {filteredExpenses.length > 0 ? filteredExpenses.slice(0, 12).map((item) => (
                  <div key={item.id} className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.4fr] gap-3 px-4 py-4 text-sm transition hover:bg-white/5">
                    <div>
                      <p className="font-semibold text-white">{item.merchant}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                    </div>
                    <div>
                      <p className="text-slate-200">{item.category}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.account}</p>
                    </div>
                    <div>
                      <p className="text-slate-200">{formatDate.format(new Date(item.date))}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{item.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{currency.format(item.amount)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{item.bankName}</p>
                    </div>
                  </div>
                )) : (
                  <div className="px-4 py-8 text-sm text-slate-400">
                    No transactions match the current filters.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {loadState === 'error' ? (
          <div className="mt-6 rounded-3xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            The dashboard could not load live data. Configure the bank API endpoint and refresh.
          </div>
        ) : null}
      </section>
    </main>
  );
}

function MetricCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(7,16,31,0.55)] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 font-[var(--font-display)] text-3xl text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{caption}</p>
    </div>
  );
}