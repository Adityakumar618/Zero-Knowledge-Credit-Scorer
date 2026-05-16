export interface Bill {
  id: string;
  provider: string;
  status: 'paid' | 'unpaid';
  amount: number;
  month?: string;
}

export interface MonthEntry {
  month: string;
  income: number;
  expenses: number;
  debt_payment: number;
}

export interface FinancialData {
  // Statement metadata
  user_id: string;
  bank?: string;
  currency?: string;
  account_holder?: string;
  period?: string;

  // Balances
  beginning_balance?: number;
  ending_balance?: number;
  average_balance?: number;

  // Monthly breakdown
  months?: MonthEntry[];

  // Aggregates
  total_credits?: number;
  total_debits?: number;
  service_charges?: number;

  // Legacy / computed fields used by ScoreFlow & PrivacyView
  bills: Bill[];
  monthlyIncome: number | null;
  monthlyExpenses: number;
  totalDebt: number;
  latePayments: number;

  // Credit assessment
  creditScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  scoreBreakdown: {
    payment_history: number;
    debt_ratio: number;
    average_balance: number;
  };
}
