import type {
  AppState,
  Contact,
  CurrencyCode,
  ExchangeRates,
  Expense,
  Group,
  LedgerEntry,
  PayerShare,
  SplitMode,
  SplitShare,
  Transfer,
} from '../types';

export const STORAGE_KEY = 'splitpro_offline_clean_v1';
export const DEFAULT_USER_ID = 'user_you';

export const EXPENSE_CATEGORIES: string[] = [
  'Food & Dining',
  'Groceries',
  'Transport & Fuel',
  'Utilities & Bills',
  'Rent',
  'Supplies & Inventory',
  'Travel',
  'Other',
];

export const GROUP_CATEGORIES: string[] = [
  'Home & Roommates',
  'Trip & Travel',
  'Business & Partnership',
  'Food & Outings',
  'General Shared',
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#059669',
  Groceries: '#10b981',
  'Transport & Fuel': '#d97706',
  'Utilities & Bills': '#7c3aed',
  Rent: '#0d9488',
  'Supplies & Inventory': '#0284c7',
  Travel: '#2563eb',
  Other: '#64748b',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  PKR: 'Rs.',
  USD: '$',
  AED: 'AED',
  SAR: 'SAR',
  GBP: '£',
};

export const DEFAULT_RATES: ExchangeRates = {
  PKR: 1,
  USD: 278.5,
  AED: 75.8,
  SAR: 74.2,
  GBP: 354.0,
};

export function createBlankState(): AppState {
  return {
    currentUserId: DEFAULT_USER_ID,
    ratesToPKR: { ...DEFAULT_RATES },
    contacts: [
      { id: DEFAULT_USER_ID, name: 'You', phone: '', note: 'Default Account' },
    ],
    groups: [],
    expenses: [],
    settlements: [],
  };
}

export function normalizeLoadedState(parsed: unknown): AppState | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Partial<AppState>;
  if (
    !Array.isArray(candidate.contacts) ||
    !Array.isArray(candidate.groups) ||
    !Array.isArray(candidate.expenses)
  ) {
    return null;
  }

  const contacts: Contact[] =
    candidate.contacts.length > 0
      ? candidate.contacts
      : [{ id: DEFAULT_USER_ID, name: 'You', phone: '', note: 'Default Account' }];

  const currentUserId = contacts.some((c) => c.id === candidate.currentUserId)
    ? (candidate.currentUserId as string)
    : contacts[0].id;

  return {
    currentUserId,
    ratesToPKR: {
      ...DEFAULT_RATES,
      ...(candidate.ratesToPKR || {}),
      PKR: 1,
    },
    contacts,
    groups: candidate.groups,
    expenses: candidate.expenses,
    settlements: Array.isArray(candidate.settlements) ? candidate.settlements : [],
  };
}

export function round2(val: number): number {
  return Math.round((Number(val) || 0) * 100) / 100;
}

export function formatPKR(val: number): string {
  const num = round2(val);
  const absStr = Math.abs(num).toLocaleString('en-PK', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return (num < 0 ? '-Rs. ' : 'Rs. ') + absStr;
}

export function formatCurrency(val: number, currency: CurrencyCode = 'PKR'): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const num = round2(val);
  const absStr = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${num < 0 ? '-' : ''}${sym} ${absStr}`;
}

export function getContactName(contacts: Contact[], id: string): string {
  const c = contacts.find((x) => x.id === id);
  return c ? c.name : 'Unknown';
}

export function getGroupName(groups: Group[], id?: string): string {
  if (!id || id === 'DIRECT') return '1-on-1 Direct';
  const g = groups.find((x) => x.id === id);
  return g ? g.name : '1-on-1 Direct';
}

export function getCombinedLedger(
  state: Pick<AppState, 'expenses' | 'settlements'>,
  groupIdFilter: string = 'ALL',
): LedgerEntry[] {
  const expItems: LedgerEntry[] = state.expenses.map((e) => ({
    ...e,
    entryType: 'expense',
  }));
  const stlItems: LedgerEntry[] = state.settlements.map((s) => ({
    ...s,
    entryType: 'settlement',
    payers: [{ memberId: s.from, amount: s.amount }],
    splits: [{ memberId: s.to, amount: s.amount }],
  }));

  let combined = [...expItems, ...stlItems];
  if (groupIdFilter && groupIdFilter !== 'ALL') {
    combined = combined.filter(
      (item) => (item.groupId || 'DIRECT') === groupIdFilter,
    );
  }
  return combined.sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });
}

/**
 * Net Balance Engine (converted to PKR).
 * Positive = person paid more than their share (is owed money).
 * Negative = person paid less than their share (owes money).
 */
export function calculateNetBalances(
  entries: LedgerEntry[],
  contacts: Contact[],
  ratesToPKR: ExchangeRates,
): Record<string, number> {
  const net: Record<string, number> = {};
  contacts.forEach((c) => {
    net[c.id] = 0;
  });

  entries.forEach((item) => {
    const rate = ratesToPKR[item.currency || 'PKR'] || 1;
    (item.payers || []).forEach((p) => {
      if (net[p.memberId] === undefined) net[p.memberId] = 0;
      net[p.memberId] += (Number(p.amount) || 0) * rate;
    });
    (item.splits || []).forEach((s) => {
      if (net[s.memberId] === undefined) net[s.memberId] = 0;
      net[s.memberId] -= (Number(s.amount) || 0) * rate;
    });
  });

  Object.keys(net).forEach((k) => {
    net[k] = round2(net[k]);
    if (Math.abs(net[k]) < 0.5) net[k] = 0;
  });

  return net;
}

/**
 * Greedy Min-Cash-Flow Debt Simplification.
 */
export function simplifyDebts(netMap: Record<string, number>): Transfer[] {
  const debtors: { memberId: string; amount: number }[] = [];
  const creditors: { memberId: string; amount: number }[] = [];

  Object.entries(netMap).forEach(([memberId, bal]) => {
    if (bal < -0.5) debtors.push({ memberId, amount: Math.abs(bal) });
    else if (bal > 0.5) creditors.push({ memberId, amount: bal });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].amount, creditors[j].amount);
    if (amt >= 1) {
      transfers.push({
        from: debtors[i].memberId,
        to: creditors[j].memberId,
        amount: Math.round(amt),
      });
    }
    debtors[i].amount -= amt;
    creditors[j].amount -= amt;
    if (debtors[i].amount < 0.5) i++;
    if (creditors[j].amount < 0.5) j++;
  }

  return transfers;
}

export interface ComputedSplitResult {
  splits: SplitShare[];
  isValid: boolean;
  statusLabel: string;
  errorMessage?: string;
}

export function computeSplits(
  totalAmount: number,
  currency: CurrencyCode,
  splitMode: SplitMode,
  checkedMemberIds: string[],
  customInputs: Record<string, number>,
): ComputedSplitResult {
  const total = Number(totalAmount) || 0;

  if (checkedMemberIds.length === 0) {
    return {
      splits: [],
      isValid: false,
      statusLabel: 'Select at least 1 person',
      errorMessage: 'Select at least one person to split with.',
    };
  }

  if (splitMode === 'equal') {
    const each = round2(total / checkedMemberIds.length);
    let running = 0;
    const splits: SplitShare[] = checkedMemberIds.map((id, idx) => {
      const shareAmt =
        idx === checkedMemberIds.length - 1
          ? Math.max(0, round2(total - running))
          : each;
      running = round2(running + each);
      return { memberId: id, amount: shareAmt, rawVal: shareAmt };
    });
    return {
      splits,
      isValid: true,
      statusLabel: `${formatCurrency(each, currency)} / person`,
    };
  }

  if (splitMode === 'exact') {
    let sum = 0;
    const splits: SplitShare[] = checkedMemberIds.map((id) => {
      const val = Math.max(0, Number(customInputs[id]) || 0);
      sum = round2(sum + val);
      return { memberId: id, amount: round2(val), rawVal: round2(val) };
    });
    const diff = round2(total - sum);
    const isValid = Math.abs(diff) <= 0.05;
    return {
      splits,
      isValid,
      statusLabel: isValid
        ? 'Exact match'
        : `${diff > 0 ? '+' : ''}${formatCurrency(diff, currency)} remaining`,
      errorMessage: isValid
        ? undefined
        : 'Exact split amounts must add up to total.',
    };
  }

  if (splitMode === 'percent') {
    let pctSum = 0;
    const splits: SplitShare[] = checkedMemberIds.map((id) => {
      const pct = Math.max(0, Number(customInputs[id]) || 0);
      pctSum = round2(pctSum + pct);
      const shareAmt = round2((total * pct) / 100);
      return { memberId: id, amount: shareAmt, rawVal: pct };
    });
    const diff = round2(100 - pctSum);
    const isValid = Math.abs(diff) <= 0.1;
    return {
      splits,
      isValid,
      statusLabel: isValid ? '100% allocated' : `${diff}% remaining`,
      errorMessage: isValid ? undefined : 'Percentages must add up to 100%.',
    };
  }

  // shares mode
  let totalShares = 0;
  const rawMap: Record<string, number> = {};
  checkedMemberIds.forEach((id) => {
    const sh = Math.max(0, Number(customInputs[id]) || 0);
    rawMap[id] = sh;
    totalShares = round2(totalShares + sh);
  });

  if (totalShares <= 0) {
    return {
      splits: checkedMemberIds.map((id) => ({ memberId: id, amount: 0, rawVal: 0 })),
      isValid: false,
      statusLabel: '0 shares',
      errorMessage: 'Total shares must be greater than 0.',
    };
  }

  let running = 0;
  const splits: SplitShare[] = checkedMemberIds.map((id, idx) => {
    const computed =
      idx === checkedMemberIds.length - 1
        ? Math.max(0, round2(total - running))
        : round2((total * rawMap[id]) / totalShares);
    running = round2(running + computed);
    return { memberId: id, amount: computed, rawVal: rawMap[id] };
  });

  return {
    splits,
    isValid: true,
    statusLabel: `Total: ${totalShares} shares`,
  };
}

export function validateMultiPayers(
  totalAmount: number,
  currency: CurrencyCode,
  payerInputs: Record<string, number>,
): { payers: PayerShare[]; isValid: boolean; message: string } {
  const total = Number(totalAmount) || 0;
  const payers: PayerShare[] = [];
  let paidSum = 0;

  Object.entries(payerInputs).forEach(([memberId, raw]) => {
    const val = round2(Number(raw) || 0);
    if (val > 0) {
      payers.push({ memberId, amount: val });
      paidSum = round2(paidSum + val);
    }
  });

  const diff = round2(total - paidSum);
  const isValid = total > 0 && Math.abs(diff) <= 0.05;

  if (isValid) {
    return {
      payers,
      isValid: true,
      message: `Total paid matches ${formatCurrency(total, currency)}`,
    };
  }

  return {
    payers,
    isValid: false,
    message:
      diff > 0
        ? `${formatCurrency(diff, currency)} remaining to assign`
        : `Over-assigned by ${formatCurrency(Math.abs(diff), currency)}`,
  };
}

export function buildCSVContent(state: AppState): string {
  const ledger = getCombinedLedger(state, 'ALL');
  const rows: (string | number)[][] = [
    [
      'Date',
      'Type',
      'Group',
      'Category',
      'Description',
      'Currency',
      'Amount',
      'PKR Equivalent',
      'Paid By',
      'Split Details',
      'Notes',
    ],
  ];

  ledger.forEach((item) => {
    const rate = state.ratesToPKR[item.currency || 'PKR'] || 1;
    const pkrVal = round2(item.amount * rate);
    const paidStr = (item.payers || [])
      .map((p) => `${getContactName(state.contacts, p.memberId)}:${p.amount}`)
      .join(' | ');
    const splitStr = (item.splits || [])
      .map((s) => `${getContactName(state.contacts, s.memberId)}:${s.amount}`)
      .join(' | ');
    const desc =
      item.entryType === 'settlement'
        ? `${getContactName(state.contacts, item.from)} paid ${getContactName(state.contacts, item.to)}`
        : item.description;

    rows.push([
      item.date,
      item.entryType.toUpperCase(),
      getGroupName(state.groups, item.groupId),
      item.entryType === 'settlement' ? 'Settlement' : item.category,
      desc,
      item.currency || 'PKR',
      item.amount,
      pkrVal,
      paidStr,
      splitStr,
      item.notes || '',
    ]);
  });

  return rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function buildWhatsAppStatement(
  state: AppState,
  mode: 'bilingual' | 'en' = 'bilingual',
  todayIso: string = new Date().toISOString().slice(0, 10),
): string {
  const ledger = getCombinedLedger(state, 'ALL');
  const net = calculateNetBalances(ledger, state.contacts, state.ratesToPKR);
  const transfers = simplifyDebts(net);
  const lines: string[] = [];

  if (mode === 'bilingual') {
    lines.push('*SplitPro Account Statement / حساب کتاب*');
    lines.push(`Date: ${todayIso}`);
    lines.push('--------------------------------');
    if (transfers.length === 0) {
      lines.push('All accounts are settled! / تمام حساب برابر ہیں');
    } else {
      lines.push('*Settlement Plan / ادائیگی کی تفصیل:*');
      transfers.forEach((tx, idx) => {
        lines.push(
          `${idx + 1}. *${getContactName(state.contacts, tx.from)}* -> *${getContactName(state.contacts, tx.to)}*: *${formatPKR(tx.amount)}*`,
        );
      });
    }
    lines.push('--------------------------------');
    lines.push('Generated via SplitPro');
  } else {
    lines.push('*SplitPro Account Statement*');
    lines.push(`Date: ${todayIso}`);
    lines.push('--------------------------------');
    if (transfers.length === 0) {
      lines.push('All balances are settled up!');
    } else {
      lines.push('*Simplified Settlement Plan:*');
      transfers.forEach((tx, idx) => {
        lines.push(
          `${idx + 1}. ${getContactName(state.contacts, tx.from)} pays ${getContactName(state.contacts, tx.to)}: ${formatPKR(tx.amount)}`,
        );
      });
    }
    lines.push('--------------------------------');
    lines.push('Generated via SplitPro');
  }

  return lines.join('\n');
}

export interface AnalyticsSummary {
  totalSpend: number;
  billCount: number;
  categories: { category: string; amount: number; pct: number; color: string }[];
  memberStats: { memberId: string; name: string; paid: number; share: number }[];
  monthlyTrend: { ym: string; label: string; total: number }[];
}

export function computeAnalytics(
  expenses: Expense[],
  contacts: Contact[],
  ratesToPKR: ExchangeRates,
  referenceDate: Date = new Date(),
): AnalyticsSummary {
  const totalSpend = round2(
    expenses.reduce(
      (sum, e) => sum + e.amount * (ratesToPKR[e.currency || 'PKR'] || 1),
      0,
    ),
  );

  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const pkr = e.amount * (ratesToPKR[e.currency || 'PKR'] || 1);
    catTotals[e.category] = round2((catTotals[e.category] || 0) + pkr);
  });

  const categories = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      pct: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
      color: CATEGORY_COLORS[category] || '#64748b',
    }));

  const paidMap: Record<string, number> = {};
  const shareMap: Record<string, number> = {};
  contacts.forEach((c) => {
    paidMap[c.id] = 0;
    shareMap[c.id] = 0;
  });

  expenses.forEach((e) => {
    const rate = ratesToPKR[e.currency || 'PKR'] || 1;
    e.payers.forEach((p) => {
      paidMap[p.memberId] = round2((paidMap[p.memberId] || 0) + p.amount * rate);
    });
    e.splits.forEach((s) => {
      shareMap[s.memberId] = round2(
        (shareMap[s.memberId] || 0) + s.amount * rate,
      );
    });
  });

  const memberStats = contacts.map((c) => ({
    memberId: c.id,
    name: c.name,
    paid: paidMap[c.id] || 0,
    share: shareMap[c.id] || 0,
  }));

  const monthlyTrend: { ym: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    monthlyTrend.push({
      ym: `${yyyy}-${mm}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      total: 0,
    });
  }

  expenses.forEach((e) => {
    const ym = (e.date || '').slice(0, 7);
    const bucket = monthlyTrend.find((m) => m.ym === ym);
    if (bucket) {
      bucket.total = round2(
        bucket.total + e.amount * (ratesToPKR[e.currency || 'PKR'] || 1),
      );
    }
  });

  return {
    totalSpend,
    billCount: expenses.length,
    categories,
    memberStats,
    monthlyTrend,
  };
}
