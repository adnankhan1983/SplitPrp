import React from 'react';
import {
  Plus,
  CheckCircle2,
  Download,
  Share2,
  Users,
  ArrowRight,
  UserPlus,
  FolderPlus,
} from 'lucide-react';
import type { AppState } from '../types';
import {
  calculateNetBalances,
  formatPKR,
  getCombinedLedger,
  getContactName,
  simplifyDebts,
} from '../utils/ledger';
import { LedgerCard } from './LedgerCard';

interface DashboardTabProps {
  state: AppState;
  onOpenAddExpense: () => void;
  onOpenSettle: (from?: string, to?: string, amount?: number) => void;
  onExportCSV: () => void;
  onOpenWhatsApp: () => void;
  onOpenAddContact: () => void;
  onOpenAddGroup: () => void;
  onViewAllActivity: () => void;
  onEditExpense: (expenseId: string) => void;
  onDeleteEntry: (id: string, entryType: 'expense' | 'settlement') => void;
  onOpenReceipt: (expenseId: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  state,
  onOpenAddExpense,
  onOpenSettle,
  onExportCSV,
  onOpenWhatsApp,
  onOpenAddContact,
  onOpenAddGroup,
  onViewAllActivity,
  onEditExpense,
  onDeleteEntry,
  onOpenReceipt,
}) => {
  const allEntries = getCombinedLedger(state, 'ALL');
  const net = calculateNetBalances(allEntries, state.contacts, state.ratesToPKR);
  const transfers = simplifyDebts(net);
  const me = state.currentUserId;

  let owedToMe = 0;
  let iOwe = 0;
  transfers.forEach((tx) => {
    if (tx.to === me) owedToMe += tx.amount;
    if (tx.from === me) iOwe += tx.amount;
  });

  const myNet = net[me] || 0;
  const isCompletelyEmpty = state.groups.length === 0 && allEntries.length === 0;

  let netStatusText = 'All Settled';
  let netColorClass = 'text-slate-900';
  let statusTextClass = 'text-slate-600';

  if (myNet > 0.5) {
    netStatusText = 'You Get Back';
    netColorClass = 'text-emerald-700';
    statusTextClass = 'text-emerald-700';
  } else if (myNet < -0.5) {
    netStatusText = 'You Owe';
    netColorClass = 'text-rose-600';
    statusTextClass = 'text-rose-600';
  }

  return (
    <div className="space-y-6">
      {/* Top Overview Panel */}
      <section
        aria-label="Balance Summary"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          {/* Primary Net Position */}
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold text-slate-500">
              Your Net Position (PKR) ·{' '}
              <span className={`font-bold ${statusTextClass}`}>{netStatusText}</span>
            </p>
            <div
              data-testid="net-balance-value"
              className={`mt-1.5 font-display text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl ${netColorClass}`}
            >
              {myNet > 0.5 ? `+${formatPKR(myNet)}` : formatPKR(myNet)}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Viewing ledger as{' '}
              <span className="font-semibold text-slate-800">
                {getContactName(state.contacts, me)}
              </span>
            </p>
          </div>

          {/* Owed vs Owe Split Figures */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-4">
            <div className="rounded-xl bg-emerald-50/80 p-3.5">
              <p className="text-xs font-semibold text-emerald-800">You Are Owed</p>
              <p
                data-testid="you-are-owed-value"
                className="mt-1 font-display text-lg font-extrabold tracking-tight text-emerald-700 tabular-nums sm:text-xl"
              >
                {formatPKR(owedToMe)}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50/80 p-3.5">
              <p className="text-xs font-semibold text-rose-800">You Owe</p>
              <p
                data-testid="you-owe-value"
                className="mt-1 font-display text-lg font-extrabold tracking-tight text-rose-700 tabular-nums sm:text-xl"
              >
                {formatPKR(iOwe)}
              </p>
            </div>
          </div>

          {/* 4 Quick Actions */}
          <div className="grid grid-cols-4 gap-2 lg:col-span-3 lg:grid-cols-2">
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] md:border md:border-emerald-200 md:bg-emerald-50 md:text-emerald-900 md:hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="whitespace-nowrap">Add Bill</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSettle()}
              className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-2 py-2.5 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span className="whitespace-nowrap">Settle Up</span>
            </button>
            <button
              type="button"
              onClick={onExportCSV}
              className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2 py-2.5 text-xs font-semibold text-sky-900 transition-colors hover:bg-sky-100 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="whitespace-nowrap">CSV/Excel</span>
            </button>
            <button
              type="button"
              onClick={onOpenWhatsApp}
              className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-green-200 bg-green-50 px-2 py-2.5 text-xs font-semibold text-green-900 transition-colors hover:bg-green-100 active:scale-[0.98]"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span className="whitespace-nowrap">WhatsApp</span>
            </button>
          </div>
        </div>
      </section>

      {/* Blank-State Onboarding Card */}
      {isCompletelyEmpty ? (
        <section
          aria-label="Getting Started"
          className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
            Welcome to SplitPro
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Your offline ledger is completely clean and ready. Start tracking shared
            bills in three quick steps:
          </p>

          <ol className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <li className="rounded-xl bg-slate-50 p-4">
              <span className="font-mono text-xs font-bold text-emerald-700">01</span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Add people
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Add friends, roommates, or business partners to your contacts.
              </p>
            </li>
            <li className="rounded-xl bg-slate-50 p-4">
              <span className="font-mono text-xs font-bold text-emerald-700">02</span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Create a group
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Organize shared trips, flats, or partnerships, or split 1-on-1.
              </p>
            </li>
            <li className="rounded-xl bg-slate-50 p-4">
              <span className="font-mono text-xs font-bold text-emerald-700">03</span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Split your bill
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Split equally, by exact Rs., percentages, or shares with multi-payer support.
              </p>
            </li>
          </ol>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onOpenAddContact}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>Add Contact</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddGroup}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              <span>Create Group</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add Expense</span>
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Smart Simplified Settlement Plan */}
          <section
            aria-label="Smart Debt Simplification"
            className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Smart Debt Simplification
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Minimum transfers to settle everyone · Auto-optimized
                </p>
              </div>
            </div>

            <div className="mt-4">
              {transfers.length === 0 ? (
                <div className="rounded-xl bg-emerald-50/70 px-4 py-5 text-center text-sm font-semibold text-emerald-800">
                  All balances are settled up.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {transfers.map((tx) => {
                    const fromName = getContactName(state.contacts, tx.from);
                    const toName = getContactName(state.contacts, tx.to);
                    return (
                      <li
                        key={`${tx.from}-${tx.to}`}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1 text-sm">
                            <span className="font-bold text-rose-700">{fromName}</span>
                            <ArrowRight
                              className="h-3.5 w-3.5 text-slate-400"
                              aria-hidden="true"
                            />
                            <span className="font-bold text-emerald-700">{toName}</span>
                          </div>
                          <div className="mt-0.5 font-display text-base font-extrabold text-slate-900 tabular-nums">
                            {formatPKR(tx.amount)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenSettle(tx.from, tx.to, tx.amount)}
                          aria-label={`Settle ${formatPKR(tx.amount)} from ${fromName} to ${toName}`}
                          className="inline-flex h-9 shrink-0 items-center rounded-xl bg-teal-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 whitespace-nowrap"
                        >
                          Settle Up
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Recent Bills & Settlements */}
          <section
            aria-label="Recent Bills and Settlements"
            className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Recent Bills &amp; Settlements
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Latest ledger entries across all groups
                </p>
              </div>
              <button
                type="button"
                onClick={onViewAllActivity}
                className="text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800 whitespace-nowrap"
              >
                View All →
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {allEntries.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No expenses logged yet.
                </p>
              ) : (
                allEntries
                  .slice(0, 4)
                  .map((item) => (
                    <LedgerCard
                      key={item.id}
                      item={item}
                      variant="row"
                      contacts={state.contacts}
                      groups={state.groups}
                      ratesToPKR={state.ratesToPKR}
                      onEditExpense={onEditExpense}
                      onDeleteEntry={onDeleteEntry}
                      onOpenReceipt={onOpenReceipt}
                    />
                  ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
