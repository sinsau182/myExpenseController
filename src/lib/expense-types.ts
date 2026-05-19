export type ExpenseSource = 'bank-api';

export type ExpenseRecord = {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  account: string;
  bankName: string;
  source: ExpenseSource;
  description: string;
  status: 'posted' | 'pending';
};

export type ExpenseConnectionStatus = 'connected' | 'error';

export type ExpenseFeed = {
  expenses: ExpenseRecord[];
  connection: {
    status: ExpenseConnectionStatus;
    message: string;
    endpoint: string;
    lastSynced: string;
  };
};