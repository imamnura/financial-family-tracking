// Shared type definitions for Transaction and Budget features

export interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  walletId: string;
  notes?: string | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
    type: "INCOME" | "EXPENSE";
  };
  wallet: {
    id: string;
    name: string;
    type: string;
  };
  user: {
    id: string;
    name: string;
  };
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number;
  category: {
    id: string;
    name: string;
    icon: string | null;
    type: "INCOME" | "EXPENSE";
  };
  spent?: number;
  percentage?: number;
  status?: "SAFE" | "WARNING" | "DANGER" | "EXCEEDED";
}

export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  description?: string | null;
}

export interface Wallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  description?: string | null;
}
