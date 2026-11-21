import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCSVContent,
  buildWhatsAppStatement,
  calculateNetBalances,
  computeAnalytics,
  computeSplits,
  createBlankState,
  DEFAULT_RATES,
  getCombinedLedger,
  simplifyDebts,
  validateMultiPayers,
} from './ledger';
import type { AppState, Contact, Expense } from '../types';

const sampleContacts: Contact[] = [
  { id: 'u1', name: 'You', phone: '', note: 'Default' },
  { id: 'u2', name: 'Ahmed', phone: '923001112233', note: 'Roommate' },
  { id: 'u3', name: 'Bilal', phone: '', note: 'Partner' },
];

test('createBlankState initializes cleanly with only You and zero records', () => {
  const state = createBlankState();
  assert.equal(state.contacts.length, 1);
  assert.equal(state.contacts[0].name, 'You');
  assert.equal(state.groups.length, 0);
  assert.equal(state.expenses.length, 0);
  assert.equal(state.settlements.length, 0);
});

test('computeSplits handles equal split with penny remainder assigned to last member', () => {
  const res = computeSplits(1000, 'PKR', 'equal', ['u1', 'u2', 'u3'], {});
  assert.equal(res.isValid, true);
  assert.deepEqual(
    res.splits.map((s) => s.amount),
    [333.33, 333.33, 333.34],
  );
  const sum = res.splits.reduce((acc, s) => acc + s.amount, 0);
  assert.equal(Math.round(sum * 100) / 100, 1000);
});

test('computeSplits validates exact, percent, and shares modes', () => {
  const exactOk = computeSplits(500, 'PKR', 'exact', ['u1', 'u2'], {
    u1: 300,
    u2: 200,
  });
  assert.equal(exactOk.isValid, true);

  const exactBad = computeSplits(500, 'PKR', 'exact', ['u1', 'u2'], {
    u1: 300,
    u2: 150,
  });
  assert.equal(exactBad.isValid, false);

  const pctOk = computeSplits(2000, 'PKR', 'percent', ['u1', 'u2'], {
    u1: 60,
    u2: 40,
  });
  assert.equal(pctOk.isValid, true);
  assert.equal(pctOk.splits[0].amount, 1200);
  assert.equal(pctOk.splits[1].amount, 800);

  const pctBad = computeSplits(2000, 'PKR', 'percent', ['u1', 'u2'], {
    u1: 60,
    u2: 30,
  });
  assert.equal(pctBad.isValid, false);

  const sharesOk = computeSplits(3000, 'PKR', 'shares', ['u1', 'u2'], {
    u1: 2,
    u2: 1,
  });
  assert.equal(sharesOk.isValid, true);
  assert.equal(sharesOk.splits[0].amount, 2000);
  assert.equal(sharesOk.splits[1].amount, 1000);
});

test('validateMultiPayers enforces total bill equality', () => {
  const ok = validateMultiPayers(5000, 'PKR', { u1: 3200, u2: 1800 });
  assert.equal(ok.isValid, true);
  assert.equal(ok.payers.length, 2);

  const bad = validateMultiPayers(5000, 'PKR', { u1: 3000, u2: 1500 });
  assert.equal(bad.isValid, false);
});

test('multi-currency net balances and greedy debt simplification minimize cash flow', () => {
  // Expense 1: You pay $10 USD (= 2785 PKR), split equally between You & Ahmed (1392.5 each)
  // Expense 2: Ahmed pays Rs. 1392.5 PKR for Bilal (Bilal owes Ahmed 1392.5)
  // Net: You = +1392.5, Ahmed = 0, Bilal = -1392.5 => Simplified: Bilal pays You Rs. 1393 (1 transfer instead of 2)
  const expenses: Expense[] = [
    {
      id: 'exp_1',
      groupId: 'DIRECT',
      category: 'Food & Dining',
      description: 'Airport Lunch',
      currency: 'USD',
      amount: 10,
      date: '2026-11-20',
      recurring: 'One-time',
      notes: '',
      splitMode: 'equal',
      payers: [{ memberId: 'u1', amount: 10 }],
      splits: [
        { memberId: 'u1', amount: 5 },
        { memberId: 'u2', amount: 5 },
      ],
      receiptImg: '',
    },
    {
      id: 'exp_2',
      groupId: 'DIRECT',
      category: 'Transport & Fuel',
      description: 'Cab Ride',
      currency: 'PKR',
      amount: 1392.5,
      date: '2026-11-21',
      recurring: 'One-time',
      notes: '',
      splitMode: 'exact',
      payers: [{ memberId: 'u2', amount: 1392.5 }],
      splits: [{ memberId: 'u3', amount: 1392.5 }],
      receiptImg: '',
    },
  ];

  const ledger = getCombinedLedger({ expenses, settlements: [] }, 'ALL');
  const net = calculateNetBalances(ledger, sampleContacts, DEFAULT_RATES);
  assert.equal(net.u1, 1392.5);
  assert.equal(net.u2, 0);
  assert.equal(net.u3, -1392.5);

  const transfers = simplifyDebts(net);
  assert.equal(transfers.length, 1);
  assert.deepEqual(transfers[0], { from: 'u3', to: 'u1', amount: 1393 });
});

test('settlements offset balances down to zero', () => {
  const state: AppState = {
    currentUserId: 'u1',
    ratesToPKR: { ...DEFAULT_RATES },
    contacts: sampleContacts,
    groups: [],
    expenses: [
      {
        id: 'exp_1',
        groupId: 'DIRECT',
        category: 'Utilities & Bills',
        description: 'Internet Bill',
        currency: 'PKR',
        amount: 3000,
        date: '2026-11-20',
        recurring: 'Monthly',
        notes: 'PTCL',
        splitMode: 'equal',
        payers: [{ memberId: 'u1', amount: 3000 }],
        splits: [
          { memberId: 'u1', amount: 1000 },
          { memberId: 'u2', amount: 1000 },
          { memberId: 'u3', amount: 1000 },
        ],
        receiptImg: '',
      },
    ],
    settlements: [
      {
        id: 'stl_1',
        from: 'u2',
        to: 'u1',
        amount: 1000,
        currency: 'PKR',
        groupId: 'DIRECT',
        date: '2026-11-21',
        notes: 'JazzCash',
      },
    ],
  };

  const ledger = getCombinedLedger(state, 'ALL');
  const net = calculateNetBalances(ledger, state.contacts, state.ratesToPKR);
  assert.equal(net.u1, 1000);
  assert.equal(net.u2, 0);
  assert.equal(net.u3, -1000);

  const transfers = simplifyDebts(net);
  assert.equal(transfers.length, 1);
  assert.deepEqual(transfers[0], { from: 'u3', to: 'u1', amount: 1000 });

  const waBi = buildWhatsAppStatement(state, 'bilingual', '2026-11-21');
  assert.ok(waBi.includes('حساب کتاب'));
  assert.ok(waBi.includes('Bilal'));
  assert.ok(waBi.includes('Rs. 1,000'));

  const csv = buildCSVContent(state);
  assert.ok(csv.includes('"Internet Bill"'));
  assert.ok(csv.includes('"SETTLEMENT"'));

  const analytics = computeAnalytics(
    state.expenses,
    state.contacts,
    state.ratesToPKR,
    new Date(2026, 10, 21),
  );
  assert.equal(analytics.totalSpend, 3000);
  assert.equal(analytics.categories[0].category, 'Utilities & Bills');
  assert.equal(analytics.categories[0].pct, 100);
  assert.equal(analytics.monthlyTrend.length, 6);
  assert.equal(analytics.monthlyTrend[5].total, 3000);
});
