import React from 'react';
import { Receipt, Pencil, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import type { Contact, ExchangeRates, Group, LedgerEntry } from '../types';
import {
  formatCurrency,
  formatPKR,
  getContactName,
  getGroupName,
} from '../utils/ledger';

interface LedgerCardProps {
  item: LedgerEntry;
  contacts: Contact[];
  groups: Group[];
  ratesToPKR: ExchangeRates;
  variant?: 'card' | 'row';
  onEditExpense?: (expenseId: string) => void;
  onDeleteEntry: (id: string, entryType: 'expense' | 'settlement') => void;
  onOpenReceipt?: (expenseId: string) => void;
}

export const LedgerCard: React.FC<LedgerCardProps> = ({
  item,
  contacts,
  groups,
  ratesToPKR,
  variant = 'card',
  onEditExpense,
  onDeleteEntry,
  onOpenReceipt,
}) => {
  const isSettlement = item.entryType === 'settlement';
  const currency = item.currency || 'PKR';
  const rate = ratesToPKR[currency] || 1;
  const pkrHint =
    currency !== 'PKR' ? ` · ≈ ${formatPKR(item.amount * rate)}` : '';

  const title = isSettlement
    ? `${getContactName(contacts, item.from)} paid ${getContactName(contacts, item.to)}`
    : item.description;

  const paidByText = (item.payers || [])
    .map(
      (p) =>
        `${getContactName(contacts, p.memberId)} (${formatCurrency(p.amount, currency)})`,
    )
    .join(', ');

  const splitSummary = (item.splits || [])
    .map(
      (s) =>
        `${getContactName(contacts, s.memberId)}: ${formatCurrency(s.amount, currency)}`,
    )
    .join(' · ');

  const containerClass =
    variant === 'row'
      ? `py-4 first:pt-0 last:pb-0 ${
          isSettlement ? 'rounded-xl bg-teal-50/60 px-3.5 my-1' : ''
        }`
      : `rounded-2xl border p-4 transition-colors ${
          isSettlement
            ? 'border-teal-200 bg-teal-50/50'
            : 'border-slate-200 bg-white'
        }`;

  return (
    <article className={containerClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Clean unboxed metadata row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isSettlement ? 'text-teal-700' : 'text-slate-700'
              }`}
            >
              {isSettlement && (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isSettlement ? 'Settlement' : item.category}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-emerald-700">
              {getGroupName(groups, item.groupId)}
            </span>
            {!isSettlement && item.recurring && item.recurring !== 'One-time' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  {item.recurring}
                </span>
              </>
            )}
          </div>

          <h3 className="mt-1 font-display text-[15px] font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-0.5 text-xs text-slate-600">
            Paid by <span className="font-semibold text-slate-800">{paidByText}</span>
          </p>

          {item.notes && (
            <p className="mt-1 text-xs italic text-slate-500">&ldquo;{item.notes}&rdquo;</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`font-display text-base font-extrabold tracking-tight tabular-nums ${
              isSettlement ? 'text-teal-800' : 'text-slate-900'
            }`}
          >
            {formatCurrency(item.amount, currency)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
            {item.date}
            {pkrHint}
          </div>
        </div>
      </div>

      {/* Bottom split breakdown & actions */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2">
        <p className="min-w-0 flex-1 text-xs text-slate-500 tabular-nums">
          <span className="font-medium text-slate-600">Split:</span> {splitSummary}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          {!isSettlement && item.receiptImg && onOpenReceipt && (
            <button
              type="button"
              onClick={() => onOpenReceipt(item.id)}
              aria-label={`View receipt for ${title}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Receipt</span>
            </button>
          )}

          {!isSettlement && onEditExpense && (
            <button
              type="button"
              onClick={() => onEditExpense(item.id)}
              aria-label={`Edit ${title}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDeleteEntry(item.id, item.entryType)}
            aria-label={`Delete ${title}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </article>
  );
};
