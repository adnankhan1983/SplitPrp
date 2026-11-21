import React, { useEffect, useMemo, useState } from 'react';
import { X, Camera, Trash2, UserPlus } from 'lucide-react';
import type {
  AppState,
  CurrencyCode,
  Expense,
  RecurringType,
  SplitMode,
} from '../types';
import {
  computeSplits,
  EXPENSE_CATEGORIES,
  formatCurrency,
  formatPKR,
  validateMultiPayers,
} from '../utils/ledger';

interface ExpenseModalProps {
  isOpen: boolean;
  state: AppState;
  defaultGroupId?: string | null;
  editExpenseId?: string | null;
  onClose: () => void;
  onSave: (expense: Expense, isEdit: boolean) => void;
  onOpenAddContact: () => void;
  onNotify: (msg: string) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  state,
  defaultGroupId,
  editExpenseId,
  onClose,
  onSave,
  onOpenAddContact,
  onNotify,
}) => {
  const existingExp = useMemo(
    () =>
      editExpenseId
        ? state.expenses.find((e) => e.id === editExpenseId) || null
        : null,
    [editExpenseId, state.expenses],
  );

  const [groupId, setGroupId] = useState('DIRECT');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('PKR');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState<RecurringType>('One-time');
  const [notes, setNotes] = useState('');
  const [receiptImg, setReceiptImg] = useState('');

  const [payerMode, setPayerMode] = useState<'single' | 'multi'>('single');
  const [singlePayerId, setSinglePayerId] = useState(state.currentUserId);
  const [multiPayerValues, setMultiPayerValues] = useState<Record<string, string>>(
    {},
  );

  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [customSplitValues, setCustomSplitValues] = useState<
    Record<string, string>
  >({});

  const eligibleMembers = useMemo(() => {
    if (groupId && groupId !== 'DIRECT') {
      const grp = state.groups.find((g) => g.id === groupId);
      if (grp && grp.memberIds.length > 0) {
        return state.contacts.filter((c) => grp.memberIds.includes(c.id));
      }
    }
    return state.contacts;
  }, [groupId, state.groups, state.contacts]);

  // Reset form when modal opens or switches edit target
  useEffect(() => {
    if (!isOpen) return;

    const initialGroup = existingExp
      ? existingExp.groupId || 'DIRECT'
      : defaultGroupId || 'DIRECT';

    setGroupId(initialGroup);
    setCategory(existingExp?.category || EXPENSE_CATEGORIES[0]);
    setDescription(existingExp?.description || '');
    setCurrency(existingExp?.currency || 'PKR');
    setAmountStr(existingExp ? String(existingExp.amount) : '');
    setDate(existingExp?.date || new Date().toISOString().slice(0, 10));
    setRecurring(existingExp?.recurring || 'One-time');
    setNotes(existingExp?.notes || '');
    setReceiptImg(existingExp?.receiptImg || '');

    const grp =
      initialGroup !== 'DIRECT'
        ? state.groups.find((g) => g.id === initialGroup)
        : null;
    const members =
      grp && grp.memberIds.length > 0
        ? state.contacts.filter((c) => grp.memberIds.includes(c.id))
        : state.contacts;

    if (existingExp && existingExp.payers.length > 1) {
      setPayerMode('multi');
      const map: Record<string, string> = {};
      existingExp.payers.forEach((p) => {
        map[p.memberId] = String(p.amount);
      });
      setMultiPayerValues(map);
      setSinglePayerId(existingExp.payers[0]?.memberId || state.currentUserId);
    } else {
      setPayerMode('single');
      setMultiPayerValues({});
      const fallbackPayer = members.some((m) => m.id === state.currentUserId)
        ? state.currentUserId
        : members[0]?.id || state.currentUserId;
      setSinglePayerId(existingExp?.payers[0]?.memberId || fallbackPayer);
    }

    setSplitMode(existingExp?.splitMode || 'equal');
    if (existingExp) {
      setCheckedIds(existingExp.splits.map((s) => s.memberId));
      const customMap: Record<string, string> = {};
      existingExp.splits.forEach((s) => {
        customMap[s.memberId] = String(s.rawVal ?? s.amount);
      });
      setCustomSplitValues(customMap);
    } else {
      setCheckedIds(members.map((m) => m.id));
      setCustomSplitValues({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editExpenseId, defaultGroupId]);

  // Keep newly added contacts checked when adding a contact mid-flow
  useEffect(() => {
    if (!isOpen) return;
    const memberIds = eligibleMembers.map((m) => m.id);
    setCheckedIds((prev) => {
      const valid = prev.filter((id) => memberIds.includes(id));
      if (!existingExp) {
        const added = memberIds.filter((id) => !valid.includes(id));
        return [...valid, ...added];
      }
      return valid.length > 0 ? valid : memberIds;
    });
    if (!memberIds.includes(singlePayerId) && memberIds.length > 0) {
      setSinglePayerId(memberIds[0]);
    }
  }, [eligibleMembers, isOpen, existingExp, singlePayerId]);

  if (!isOpen) return null;

  const amount = parseFloat(amountStr) || 0;
  const rate = state.ratesToPKR[currency] || 1;

  const numericPayers: Record<string, number> = {};
  Object.entries(multiPayerValues).forEach(([k, v]) => {
    numericPayers[k] = parseFloat(v) || 0;
  });
  const multiPayerCheck = validateMultiPayers(amount, currency, numericPayers);

  const numericCustomSplits: Record<string, number> = {};
  Object.entries(customSplitValues).forEach(([k, v]) => {
    numericCustomSplits[k] = parseFloat(v) || 0;
  });
  const computedSplit = computeSplits(
    amount,
    currency,
    splitMode,
    checkedIds,
    numericCustomSplits,
  );

  const splitAmountByMember: Record<string, number> = {};
  computedSplit.splits.forEach((s) => {
    splitAmountByMember[s.memberId] = s.amount;
  });

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    const grp =
      nextGroupId !== 'DIRECT'
        ? state.groups.find((g) => g.id === nextGroupId)
        : null;
    const members =
      grp && grp.memberIds.length > 0
        ? state.contacts.filter((c) => grp.memberIds.includes(c.id))
        : state.contacts;
    setCheckedIds(members.map((m) => m.id));
    if (!members.some((m) => m.id === singlePayerId) && members.length > 0) {
      setSinglePayerId(members[0].id);
    }
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode);
    if (mode === 'shares') {
      setCustomSplitValues((prev) => {
        const next = { ...prev };
        eligibleMembers.forEach((m) => {
          if (!next[m.id]) next[m.id] = '1';
        });
        return next;
      });
    }
  };

  const toggleMember = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setReceiptImg(canvas.toDataURL('image/jpeg', 0.68));
          onNotify('Receipt compressed & attached');
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      onNotify('Please enter a bill description.');
      return;
    }
    if (amount <= 0) {
      onNotify('Please enter an amount greater than 0.');
      return;
    }

    let finalPayers = [{ memberId: singlePayerId, amount }];
    if (payerMode === 'multi') {
      if (!multiPayerCheck.isValid) {
        onNotify('Multi-payer amounts must equal the total bill.');
        return;
      }
      finalPayers = multiPayerCheck.payers;
    }

    if (!computedSplit.isValid) {
      onNotify(computedSplit.errorMessage || 'Check split values before saving.');
      return;
    }

    const record: Expense = {
      id: existingExp ? existingExp.id : `exp_${Date.now()}`,
      groupId: groupId || 'DIRECT',
      category,
      description: trimmedDesc,
      currency,
      amount,
      date: date || new Date().toISOString().slice(0, 10),
      recurring,
      notes: notes.trim(),
      splitMode,
      payers: finalPayers,
      splits: computedSplit.splits,
      receiptImg,
    };

    onSave(record, Boolean(existingExp));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="animate-sheet-up flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="expense-modal-title"
              className="font-display text-base font-bold text-slate-900"
            >
              {existingExp ? 'Edit Expense' : 'Add Shared Expense'}
            </h2>
            <p className="text-xs text-slate-500">
              Multi-payer &amp; 4 flexible split modes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close expense dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Group & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expGroupSelect"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Group (Optional)
              </label>
              <select
                id="expGroupSelect"
                value={groupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              >
                <option value="DIRECT">1-on-1 Direct (No Group)</option>
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="expCategorySelect"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Category
              </label>
              <select
                id="expCategorySelect"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="expDescription"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Description *
            </label>
            <input
              id="expDescription"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner, Electricity Bill, Diesel, Groceries"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Currency & Total Amount */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5 sm:col-span-4">
              <label
                htmlFor="expCurrencySelect"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Currency
              </label>
              <select
                id="expCurrencySelect"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              >
                <option value="PKR">PKR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED</option>
                <option value="SAR">SAR</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div className="col-span-7 sm:col-span-8">
              <label
                htmlFor="expAmount"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Total Amount *
              </label>
              <input
                id="expAmount"
                type="number"
                step="0.01"
                min="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="h-11 w-full rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 font-mono text-base font-bold text-slate-900 outline-none tabular-nums focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          {currency !== 'PKR' && amount > 0 && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 font-mono text-xs font-semibold text-emerald-800 tabular-nums">
              Converted Ledger Value: {formatPKR(amount * rate)} (Rate: 1 {currency}{' '}
              = {rate} PKR)
            </p>
          )}

          {/* Date & Recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expDate"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Date
              </label>
              <input
                id="expDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="expRecurring"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Recurring
              </label>
              <select
                id="expRecurring"
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as RecurringType)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              >
                <option value="One-time">One-time</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Paid By Panel */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">Paid By</span>
              <div className="inline-grid grid-cols-2 gap-1 rounded-lg bg-slate-200/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setPayerMode('single')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    payerMode === 'single'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Payer
                </button>
                <button
                  type="button"
                  onClick={() => setPayerMode('multi')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    payerMode === 'multi'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Multiple Payers
                </button>
              </div>
            </div>

            {payerMode === 'single' ? (
              <select
                aria-label="Single Payer"
                value={singlePayerId}
                onChange={(e) => setSinglePayerId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
              >
                {eligibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                {eligibleMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-slate-800">
                      {m.name}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      aria-label={`Amount paid by ${m.name}`}
                      value={multiPayerValues[m.id] || ''}
                      onChange={(e) =>
                        setMultiPayerValues((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="h-8 w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 text-right font-mono text-sm font-bold text-slate-900 outline-none tabular-nums focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                ))}
                <p
                  className={`text-right font-mono text-xs font-semibold tabular-nums ${
                    multiPayerCheck.isValid ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {multiPayerCheck.message}
                </p>
              </div>
            )}
          </div>

          {/* Split Between Panel */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">Split Mode</span>
              <span
                className={`font-mono text-xs font-bold tabular-nums ${
                  computedSplit.isValid ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {computedSplit.statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200/80 p-1">
              {(
                [
                  ['equal', '= Equal'],
                  ['exact', 'Exact'],
                  ['percent', '% Percent'],
                  ['shares', 'Shares'],
                ] as [SplitMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSplitModeChange(mode)}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    splitMode === mode
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {eligibleMembers.length <= 1 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p>
                  Only <strong>You</strong> exist in Contacts right now. Add a
                  friend or partner to split bills with them.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddContact}
                  className="mt-2 inline-flex h-8 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Add Contact Now</span>
                </button>
              </div>
            )}

            <div className="space-y-2">
              {eligibleMembers.map((m) => {
                const isChecked = checkedIds.includes(m.id);
                const computedAmt = isChecked ? splitAmountByMember[m.id] || 0 : 0;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMember(m.id)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        {m.name}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      {splitMode !== 'equal' && (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isChecked}
                          aria-label={`${splitMode} value for ${m.name}`}
                          value={customSplitValues[m.id] ?? ''}
                          onChange={(e) =>
                            setCustomSplitValues((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          placeholder={splitMode === 'percent' ? '%' : '0'}
                          className="h-8 w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 text-right font-mono text-xs font-bold text-slate-900 outline-none tabular-nums focus:border-emerald-600 focus:bg-white disabled:opacity-40"
                        />
                      )}
                      <span className="min-w-[78px] text-right font-mono text-xs font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(computedAmt, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="expNotes"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Notes / Memo
            </label>
            <input
              id="expNotes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional invoice #, shop name, or memo..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Attach Receipt Image (Auto-Compressed)
            </span>
            <div className="flex items-center gap-3">
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100">
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Choose Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="sr-only"
                />
              </label>

              {receiptImg && (
                <div className="flex items-center gap-2">
                  <img
                    src={receiptImg}
                    alt="Receipt preview"
                    className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptImg('')}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2.5 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-1/3 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 w-2/3 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            {existingExp ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};
