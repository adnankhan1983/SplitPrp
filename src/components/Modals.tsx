import React, { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, UserPlus } from 'lucide-react';
import type { AppState, Contact, Group, Settlement } from '../types';
import { buildWhatsAppStatement, GROUP_CATEGORIES } from '../utils/ledger';

/* ==================== 1. GROUP MODAL ==================== */
interface GroupModalProps {
  isOpen: boolean;
  state: AppState;
  editGroupId?: string | null;
  onClose: () => void;
  onSave: (group: Group, isEdit: boolean) => void;
  onOpenAddContact: () => void;
  onNotify: (msg: string) => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  state,
  editGroupId,
  onClose,
  onSave,
  onOpenAddContact,
  onNotify,
}) => {
  const existing = editGroupId
    ? state.groups.find((g) => g.id === editGroupId) || null
    : null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState(GROUP_CATEGORIES[0]);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setName(existing ? existing.name : '');
    setCategory(existing ? existing.category : GROUP_CATEGORIES[0]);
    setMemberIds(
      existing ? existing.memberIds : state.contacts.map((c) => c.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editGroupId]);

  useEffect(() => {
    if (!isOpen || existing) return;
    setMemberIds((prev) => {
      const added = state.contacts
        .map((c) => c.id)
        .filter((id) => !prev.includes(id));
      return added.length > 0 ? [...prev, ...added] : prev;
    });
  }, [state.contacts, isOpen, existing]);

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotify('Please enter a group name.');
      return;
    }
    if (memberIds.length < 2) {
      onNotify('Add and select at least 2 members for a group.');
      return;
    }
    onSave(
      {
        id: existing ? existing.id : `grp_${Date.now()}`,
        name: name.trim(),
        category,
        memberIds,
      },
      Boolean(existing),
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="animate-sheet-up flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="group-modal-title"
            className="font-display text-base font-bold text-slate-900"
          >
            {existing ? 'Edit Group' : 'Create Group'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close group dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label
              htmlFor="groupNameInput"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Group Name *
            </label>
            <input
              id="groupNameInput"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Apartment 4B, Northern Areas Trip, Shop"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="groupCategoryInput"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Category
            </label>
            <select
              id="groupCategoryInput"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            >
              {GROUP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                Select Members * (min 2)
              </span>
              <button
                type="button"
                onClick={onOpenAddContact}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>New Contact</span>
              </button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {state.contacts.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={memberIds.includes(c.id)}
                    onChange={() => toggleMember(c.id)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-1/3 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 w-2/3 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save Group
          </button>
        </div>
      </form>
    </div>
  );
};

/* ==================== 2. CONTACT MODAL ==================== */
interface ContactModalProps {
  isOpen: boolean;
  contacts: Contact[];
  editContactId?: string | null;
  onClose: () => void;
  onSave: (contact: Contact, isEdit: boolean) => void;
  onNotify: (msg: string) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  contacts,
  editContactId,
  onClose,
  onSave,
  onNotify,
}) => {
  const existing = editContactId
    ? contacts.find((c) => c.id === editContactId) || null
    : null;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(existing ? existing.name : '');
    setPhone(existing ? existing.phone : '');
    setNote(existing ? existing.note : '');
  }, [isOpen, existing]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotify('Please enter a contact name.');
      return;
    }
    onSave(
      {
        id: existing ? existing.id : `usr_${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim(),
      },
      Boolean(existing),
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="animate-sheet-up flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="contact-modal-title"
            className="font-display text-base font-bold text-slate-900"
          >
            {existing ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="contactNameInput"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Full Name *
            </label>
            <input
              id="contactNameInput"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter person's name"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="contactPhoneInput"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Phone / WhatsApp Number (Optional)
            </label>
            <input
              id="contactPhoneInput"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 923001234567"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="contactNoteInput"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Note / Role (Optional)
            </label>
            <input
              id="contactNoteInput"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Roommate, Partner, Friend"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex gap-2.5 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-1/3 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 w-2/3 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save Contact
          </button>
        </div>
      </form>
    </div>
  );
};

/* ==================== 3. SETTLE UP MODAL ==================== */
interface SettleModalProps {
  isOpen: boolean;
  state: AppState;
  initialFrom?: string;
  initialTo?: string;
  initialAmount?: number;
  initialGroupId?: string;
  onClose: () => void;
  onConfirm: (settlement: Settlement) => void;
  onNotify: (msg: string) => void;
}

export const SettleModal: React.FC<SettleModalProps> = ({
  isOpen,
  state,
  initialFrom,
  initialTo,
  initialAmount,
  initialGroupId,
  onClose,
  onConfirm,
  onNotify,
}) => {
  const [from, setFrom] = useState(state.currentUserId);
  const [to, setTo] = useState(state.currentUserId);
  const [amountStr, setAmountStr] = useState('');
  const [groupId, setGroupId] = useState('DIRECT');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const defaultFrom = initialFrom || state.currentUserId;
    setFrom(defaultFrom);
    if (initialTo) {
      setTo(initialTo);
    } else {
      const other = state.contacts.find((c) => c.id !== defaultFrom);
      setTo(other ? other.id : defaultFrom);
    }
    setAmountStr(initialAmount ? String(initialAmount) : '');
    setGroupId(initialGroupId || 'DIRECT');
    setNotes('');
  }, [isOpen, initialFrom, initialTo, initialAmount, initialGroupId, state.contacts, state.currentUserId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountStr) || 0;
    if (from === to) {
      onNotify('Payer and receiver cannot be the same person.');
      return;
    }
    if (amt <= 0) {
      onNotify('Enter a valid settlement amount.');
      return;
    }

    onConfirm({
      id: `stl_${Date.now()}`,
      from,
      to,
      amount: amt,
      currency: 'PKR',
      groupId: groupId || 'DIRECT',
      date: new Date().toISOString().slice(0, 10),
      notes: notes.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="animate-sheet-up flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="settle-modal-title"
            className="font-display text-base font-bold text-slate-900"
          >
            Record Settlement
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settlement dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="settleFromSelect"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Payer (From)
              </label>
              <select
                id="settleFromSelect"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              >
                {state.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="settleToSelect"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Receiver (To)
              </label>
              <select
                id="settleToSelect"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              >
                {state.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="settleAmountInput"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Amount (PKR) *
              </label>
              <input
                id="settleAmountInput"
                type="number"
                step="0.01"
                min="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="h-10 w-full rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 font-mono text-sm font-bold text-slate-900 outline-none tabular-nums focus:border-emerald-600 focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="settleGroupSelect"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Group Scope
              </label>
              <select
                id="settleGroupSelect"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
              >
                <option value="DIRECT">1-on-1 Direct</option>
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="settleNoteInput"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Payment Note (Optional)
            </label>
            <input
              id="settleNoteInput"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Bank Transfer, JazzCash, Cash"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex gap-2.5 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-1/3 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-10 w-2/3 items-center justify-center rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Confirm Payment
          </button>
        </div>
      </form>
    </div>
  );
};

/* ==================== 4. WHATSAPP STATEMENT MODAL ==================== */
interface WhatsAppModalProps {
  isOpen: boolean;
  state: AppState;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  state,
  onClose,
  onNotify,
}) => {
  const [lang, setLang] = useState<'bilingual' | 'en'>('bilingual');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setText(buildWhatsAppStatement(state, lang));
  }, [isOpen, lang, state]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify('Statement copied to clipboard!');
    } catch {
      onNotify('Select the text above to copy manually.');
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
    >
      <div className="animate-sheet-up flex w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="wa-modal-title"
              className="font-display text-base font-bold text-slate-900"
            >
              WhatsApp Statement
            </h2>
            <p className="text-xs text-slate-500">
              Clean bilingual English + Urdu summary
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close WhatsApp dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLang('bilingual')}
              className={`h-9 rounded-xl text-xs font-semibold transition-colors ${
                lang === 'bilingual'
                  ? 'bg-green-600 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              English + اردو
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`h-9 rounded-xl text-xs font-semibold transition-colors ${
                lang === 'en'
                  ? 'bg-green-600 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              English Only
            </button>
          </div>

          <textarea
            aria-label="WhatsApp statement preview"
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>

        <div className="flex gap-2.5 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-10 w-5/12 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span>Copy Text</span>
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-7/12 items-center justify-center gap-1.5 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span>Share on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};

/* ==================== 5. CONFIRM DIALOG ==================== */
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
    >
      <div className="animate-sheet-up w-full max-w-sm rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="confirm-modal-title"
            className="font-display text-base font-bold text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700">{message}</p>
        </div>
        <div className="flex gap-2.5 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 w-1/2 items-center justify-center rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Yes, Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 6. RECEIPT LIGHTBOX ==================== */
interface LightboxModalProps {
  title: string;
  src: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  title,
  src,
  onClose,
}) => {
  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receipt preview"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="truncate font-display text-sm font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <img
          src={src}
          alt={title}
          className="max-h-[70vh] w-full rounded-2xl bg-slate-100 object-contain"
        />
      </div>
    </div>
  );
};
