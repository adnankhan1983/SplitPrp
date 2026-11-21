import React, { useState } from 'react';
import { Search, X, Plus, ReceiptText } from 'lucide-react';
import type { AppState } from '../types';
import {
  getCombinedLedger,
  getContactName,
  getGroupName,
} from '../utils/ledger';
import { LedgerCard } from './LedgerCard';

interface ActivityTabProps {
  state: AppState;
  onOpenAddExpense: () => void;
  onEditExpense: (expenseId: string) => void;
  onDeleteEntry: (id: string, entryType: 'expense' | 'settlement') => void;
  onOpenReceipt: (expenseId: string) => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  state,
  onOpenAddExpense,
  onEditExpense,
  onDeleteEntry,
  onOpenReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'expense' | 'settlement'>(
    'ALL',
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  let list = getCombinedLedger(state, groupFilter);
  if (typeFilter !== 'ALL') {
    list = list.filter((item) => item.entryType === typeFilter);
  }
  if (normalizedQuery) {
    list = list.filter((item) => {
      const payersStr = (item.payers || [])
        .map((p) => getContactName(state.contacts, p.memberId))
        .join(' ');
      const splitsStr = (item.splits || [])
        .map((s) => getContactName(state.contacts, s.memberId))
        .join(' ');
      const desc =
        item.entryType === 'settlement'
          ? `${getContactName(state.contacts, item.from)} paid ${getContactName(state.contacts, item.to)}`
          : item.description;
      const cat = item.entryType === 'settlement' ? 'settlement' : item.category;
      const hay = `${desc} ${cat} ${item.notes || ''} ${getGroupName(state.groups, item.groupId)} ${payersStr} ${splitsStr}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Activity &amp; Ledger
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
            {list.length} matching {list.length === 1 ? 'record' : 'records'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddExpense}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Search ledger entries"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, category, notes, person..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-10 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by group"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white"
            >
              <option value="ALL">All Groups &amp; Direct</option>
              <option value="DIRECT">1-on-1 Direct Only</option>
              {state.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by entry type"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as 'ALL' | 'expense' | 'settlement')
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:bg-white"
            >
              <option value="ALL">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="settlement">Settlements Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger List */}
      {list.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <ReceiptText className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
            {searchQuery || groupFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'No Matching Records'
              : 'No Ledger Activity Yet'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            {searchQuery || groupFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'Try clearing your search query or switching group filters.'
              : 'All shared expenses and recorded settlements will appear here in chronological order.'}
          </p>
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Expense</span>
          </button>
        </section>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <LedgerCard
              key={item.id}
              item={item}
              contacts={state.contacts}
              groups={state.groups}
              ratesToPKR={state.ratesToPKR}
              onEditExpense={onEditExpense}
              onDeleteEntry={onDeleteEntry}
              onOpenReceipt={onOpenReceipt}
            />
          ))}
        </div>
      )}
    </div>
  );
};
