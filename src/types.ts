export type CurrencyCode = 'PKR' | 'USD' | 'AED' | 'SAR' | 'GBP';

export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares';

export type RecurringType = 'One-time' | 'Weekly' | 'Monthly';

export type TabId = 'dashboard' | 'groups' | 'activity' | 'analytics' | 'settings';

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Groceries'
  | 'Transport & Fuel'
  | 'Utilities & Bills'
  | 'Rent'
  | 'Supplies & Inventory'
  | 'Travel'
  | 'Other';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  note: string;
}

export interface Group {
  id: string;
  name: string;
  category: string;
  memberIds: string[];
}

export interface PayerShare {
  memberId: string;
  amount: number;
}

export interface SplitShare {
  memberId: string;
  amount: number;
  rawVal?: number;
}

export interface Expense {
  id: string;
  groupId: string; // 'DIRECT' or group id
  category: ExpenseCategory | string;
  description: string;
  currency: CurrencyCode;
  amount: number;
  date: string; // YYYY-MM-DD
  recurring: RecurringType;
  notes: string;
  splitMode: SplitMode;
  payers: PayerShare[];
  splits: SplitShare[];
  receiptImg: string;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: CurrencyCode;
  groupId: string; // 'DIRECT' or group id
  date: string;
  notes: string;
}

export type LedgerEntry =
  | (Expense & { entryType: 'expense' })
  | (Settlement & {
      entryType: 'settlement';
      payers: PayerShare[];
      splits: SplitShare[];
    });

export interface ExchangeRates {
  PKR: number;
  USD: number;
  AED: number;
  SAR: number;
  GBP: number;
}

export interface AppState {
  currentUserId: string;
  ratesToPKR: ExchangeRates;
  contacts: Contact[];
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}
