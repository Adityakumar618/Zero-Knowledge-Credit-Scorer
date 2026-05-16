export interface Bill {
  id: string;
  provider: string;
  status: 'paid' | 'unpaid';
  amount: number;
  month?: string;
}

export interface FinancialData {
  bills: Bill[];
  creditScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  monthlyIncome: number | null;
  monthlyExpenses: number;
  totalDebt: number;
  latePayments: number;
  scoreBreakdown: {
    payment_history: number;
    debt_ratio: number;
    average_balance: number;
  };
}
