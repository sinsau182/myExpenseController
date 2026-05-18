# Expense Dashboard

An interactive Next.js dashboard for exploring personal expense history. The app is built to show totals, monthly trends, category breakdowns, and recent transactions in a single view.

## What it does

- Fetches expense data from a bank endpoint when environment variables are configured.
- Falls back to realistic mock data when no bank endpoint is available.
- Lets you filter transactions by search term, category, account, and time window.
- Surfaces summary cards, a monthly spend chart, a category ranking, and a recent activity feed.

## Setup

1. Install Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.

## Bank API configuration

Set one of these environment variables before starting the app:

- `BANK_API_BASE_URL`
- `BANK_EXPENSES_PATH` or `BANK_API_EXPENSES_ENDPOINT`
- `BANK_API_KEY`
- `BANK_ACCOUNT_ID`

If no bank endpoint is configured, the app uses mocked expense data so the dashboard still works.

## Project structure

- `src/app/page.tsx` renders the dashboard.
- `src/app/api/expenses/route.ts` serves normalized expense data.
- `src/components/expense-dashboard.tsx` holds the interactive UI.
- `src/lib/bank.ts` fetches and normalizes bank data.
