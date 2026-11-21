import React from 'react';
import {
  Users,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle2,
  ArrowRight,
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

interface GroupsTabProps {
  state: AppState;
  activeGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onOpenGroupModal: (editGroupId?: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenAddExpense: (groupId?: string) => void;
  onOpenSettle: (
    from?: string,
    to?: string,
    amount?: number,
    groupId?: string,
  ) => void;
  onEditExpense: (expenseId: string) => void;
  onDeleteEntry: (id: string, entryType: 'expense' | 'settlement') => void;
  onOpenReceipt: (expenseId: string) => void;
}

export const GroupsTab: React.FC<GroupsTabProps> = ({
  state,
  activeGroupId,
  onSelectGroup,
  onOpenGroupModal,
  onDeleteGroup,
  onOpenAddExpense,
  onOpenSettle,
  onEditExpense,
  onDeleteEntry,
  onOpenReceipt,
}) => {
  const activeGroup = activeGroupId
    ? state.groups.find((g) => g.id === activeGroupId) || null
    : null;

  if (activeGroup) {
    const entries = getCombinedLedger(state, activeGroup.id);
    const expensesOnly = entries.filter((e) => e.entryType === 'expense');
    const totalSpend = expensesOnly.reduce(
      (sum, e) => sum + e.amount * (state.ratesToPKR[e.currency] || 1),
      0,
    );
    const net = calculateNetBalances(entries, state.contacts, state.ratesToPKR);
    const simplified = simplifyDebts(net);
    const memberNames = activeGroup.memberIds
      .map((id) => getContactName(state.contacts, id))
      .join(', ');

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectGroup(null)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All Groups</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenGroupModal(activeGroup.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edit Group</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteGroup(activeGroup.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Group Summary Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-700">
                {activeGroup.category || 'Shared Group'}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
                {activeGroup.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">Members: {memberNames}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold text-slate-500">Total Group Spend</p>
              <p className="mt-0.5 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatPKR(totalSpend)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onOpenAddExpense(activeGroup.id)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:flex-none"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add Expense</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSettle(undefined, undefined, undefined, activeGroup.id)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700 sm:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Settle Up</span>
            </button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Group Simplified Debts */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              Group Balances &amp; Settlements
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Simplified payments inside this group
            </p>

            <div className="mt-4">
              {simplified.length === 0 ? (
                <div className="rounded-xl bg-emerald-50/70 px-4 py-5 text-center text-sm font-semibold text-emerald-800">
                  Everyone in this group is settled up.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {simplified.map((tx) => {
                    const fromName = getContactName(state.contacts, tx.from);
                    const toName = getContactName(state.contacts, tx.to);
                    return (
                      <li
                        key={`${tx.from}-${tx.to}`}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
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
                          onClick={() =>
                            onOpenSettle(tx.from, tx.to, tx.amount, activeGroup.id)
                          }
                          aria-label={`Settle ${formatPKR(tx.amount)} from ${fromName} to ${toName} in ${activeGroup.name}`}
                          className="inline-flex h-9 shrink-0 items-center rounded-xl bg-teal-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
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

          {/* Group Expense Feed */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="font-display text-base font-bold text-slate-900">
                Group Expense Feed
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {entries.length} {entries.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No expenses in this group yet. Use Add Expense above to record one.
                </p>
              ) : (
                entries.map((item) => (
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
      </div>
    );
  }

  // Groups Directory List View
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Shared Groups
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Select any group to inspect simplified balances and expense history
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenGroupModal()}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Group</span>
        </button>
      </div>

      {state.groups.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
            No Groups Created Yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Create a group for roommates, trips, or shared business expenses to track
            balances together.
          </p>
          <button
            type="button"
            onClick={() => onOpenGroupModal()}
            className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create First Group</span>
          </button>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {state.groups.map((g) => {
            const gEntries = getCombinedLedger(state, g.id);
            const gExps = gEntries.filter((x) => x.entryType === 'expense');
            const totalSpend = gExps.reduce(
              (sum, e) => sum + e.amount * (state.ratesToPKR[e.currency] || 1),
              0,
            );
            const net = calculateNetBalances(gEntries, state.contacts, state.ratesToPKR);
            const myBal = net[state.currentUserId] || 0;
            const memberNames = g.memberIds
              .map((id) => getContactName(state.contacts, id))
              .join(', ');

            return (
              <article
                key={g.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-700">
                      {g.category || 'Shared Group'}
                    </span>
                    <span className="font-mono tabular-nums">
                      {gEntries.length} {gEntries.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectGroup(g.id)}
                    className="mt-1.5 block w-full text-left font-display text-lg font-bold text-slate-900 transition-colors hover:text-emerald-700"
                  >
                    {g.name}
                  </button>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    Members: {memberNames}
                  </p>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3.5">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Total Spend</p>
                    <p className="font-display text-base font-extrabold text-slate-900 tabular-nums">
                      {formatPKR(totalSpend)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold tabular-nums">
                      {myBal > 0.5 ? (
                        <span className="text-emerald-700">
                          You get {formatPKR(myBal)}
                        </span>
                      ) : myBal < -0.5 ? (
                        <span className="text-rose-600">
                          You owe {formatPKR(Math.abs(myBal))}
                        </span>
                      ) : (
                        <span className="text-slate-500">Settled up</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenAddExpense(g.id)}
                        aria-label={`Add expense to ${g.name}`}
                        className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                      >
                        + Expense
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectGroup(g.id)}
                        aria-label={`Open ${g.name}`}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
