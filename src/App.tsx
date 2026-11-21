import React, { useCallback, useEffect, useState } from 'react';
import type {
  AppState,
  Contact,
  ExchangeRates,
  Expense,
  Group,
  Settlement,
  TabId,
} from './types';
import {
  buildCSVContent,
  createBlankState,
  DEFAULT_USER_ID,
  getCombinedLedger,
  getContactName,
  normalizeLoadedState,
  STORAGE_KEY,
} from './utils/ledger';
import {
  MobileBottomNav,
  TopHeader,
  WorkspaceContextBar,
} from './components/Navigation';
import { DashboardTab } from './components/DashboardTab';
import { GroupsTab } from './components/GroupsTab';
import { ActivityTab } from './components/ActivityTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { ExpenseModal } from './components/ExpenseModal';
import {
  ConfirmModal,
  ContactModal,
  GroupModal,
  LightboxModal,
  SettleModal,
  WhatsAppModal,
} from './components/Modals';

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const normalized = normalizeLoadedState(JSON.parse(raw));
      if (normalized) return normalized;
    }
  } catch {
    // Fallback to clean blank state if storage is unavailable or corrupted
  }
  const blank = createBlankState();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blank));
  } catch {
    // Ignore quota errors on initial write
  }
  return blank;
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  // Modal states
  const [expenseModal, setExpenseModal] = useState<{
    open: boolean;
    defaultGroupId?: string | null;
    editExpenseId?: string | null;
  }>({ open: false });

  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    editGroupId?: string | null;
  }>({ open: false });

  const [contactModal, setContactModal] = useState<{
    open: boolean;
    editContactId?: string | null;
  }>({ open: false });

  const [settleModal, setSettleModal] = useState<{
    open: boolean;
    from?: string;
    to?: string;
    amount?: number;
    groupId?: string;
  }>({ open: false });

  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({ open: false, title: '', message: '', onConfirm: null });

  const [lightbox, setLightbox] = useState<{ title: string; src: string }>({
    title: '',
    src: '',
  });

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(''), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const persistState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          showToast('Storage limit reached. Remove large receipt images.');
        }
        return next;
      });
    },
    [showToast],
  );

  // Close top-most modal on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightbox.src) setLightbox({ title: '', src: '' });
      else if (confirmState.open)
        setConfirmState((p) => ({ ...p, open: false }));
      else if (contactModal.open) setContactModal({ open: false });
      else if (groupModal.open) setGroupModal({ open: false });
      else if (settleModal.open) setSettleModal({ open: false });
      else if (whatsappOpen) setWhatsappOpen(false);
      else if (expenseModal.open) setExpenseModal({ open: false });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    lightbox.src,
    confirmState.open,
    contactModal.open,
    groupModal.open,
    settleModal.open,
    whatsappOpen,
    expenseModal.open,
  ]);

  const handleSelectTab = (tab: TabId) => {
    setActiveTab(tab);
    if (tab !== 'groups') {
      setActiveGroupId(null);
    }
  };

  const handleChangeUser = (userId: string) => {
    persistState((prev) => ({ ...prev, currentUserId: userId }));
    showToast(`Switched active user to ${getContactName(state.contacts, userId)}`);
  };

  const handleOpenAbout = () => {
    setActiveTab('settings');
    window.setTimeout(() => {
      const card = document.getElementById('aboutDeveloperCard');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  // Expense handlers
  const handleSaveExpense = (expense: Expense, isEdit: boolean) => {
    persistState((prev) => ({
      ...prev,
      expenses: isEdit
        ? prev.expenses.map((e) => (e.id === expense.id ? expense : e))
        : [expense, ...prev.expenses],
    }));
    setExpenseModal({ open: false });
    showToast(isEdit ? 'Expense updated!' : 'Expense added!');
  };

  const handleDeleteEntry = (id: string, entryType: 'expense' | 'settlement') => {
    setConfirmState({
      open: true,
      title: 'Delete Record?',
      message:
        'Are you sure you want to permanently delete this entry from your ledger?',
      onConfirm: () => {
        persistState((prev) =>
          entryType === 'settlement'
            ? {
                ...prev,
                settlements: prev.settlements.filter((s) => s.id !== id),
              }
            : {
                ...prev,
                expenses: prev.expenses.filter((e) => e.id !== id),
              },
        );
        setConfirmState((p) => ({ ...p, open: false }));
        showToast('Entry deleted.');
      },
    });
  };

  // Group handlers
  const handleSaveGroup = (group: Group, isEdit: boolean) => {
    persistState((prev) => ({
      ...prev,
      groups: isEdit
        ? prev.groups.map((g) => (g.id === group.id ? group : g))
        : [...prev.groups, group],
    }));
    setGroupModal({ open: false });
    showToast(isEdit ? 'Group updated!' : 'Group created!');
  };

  const handleDeleteGroup = (groupId: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Group?',
      message:
        'This will delete the group. Existing expenses inside it will be moved to 1-on-1 Direct.',
      onConfirm: () => {
        persistState((prev) => ({
          ...prev,
          groups: prev.groups.filter((g) => g.id !== groupId),
          expenses: prev.expenses.map((e) =>
            e.groupId === groupId ? { ...e, groupId: 'DIRECT' } : e,
          ),
          settlements: prev.settlements.map((s) =>
            s.groupId === groupId ? { ...s, groupId: 'DIRECT' } : s,
          ),
        }));
        setActiveGroupId(null);
        setConfirmState((p) => ({ ...p, open: false }));
        showToast('Group deleted.');
      },
    });
  };

  // Contact handlers
  const handleSaveContact = (contact: Contact, isEdit: boolean) => {
    persistState((prev) => ({
      ...prev,
      contacts: isEdit
        ? prev.contacts.map((c) => (c.id === contact.id ? contact : c))
        : [...prev.contacts, contact],
    }));
    setContactModal({ open: false });
    showToast(
      isEdit ? 'Contact updated!' : `${contact.name} added to contacts!`,
    );
  };

  const handleDeleteContact = (contactId: string) => {
    if (contactId === DEFAULT_USER_ID) return;
    const name = getContactName(state.contacts, contactId);
    setConfirmState({
      open: true,
      title: 'Remove Contact?',
      message: `Remove ${name} from your contacts list?`,
      onConfirm: () => {
        persistState((prev) => ({
          ...prev,
          contacts: prev.contacts.filter((c) => c.id !== contactId),
          currentUserId:
            prev.currentUserId === contactId
              ? DEFAULT_USER_ID
              : prev.currentUserId,
        }));
        setConfirmState((p) => ({ ...p, open: false }));
        showToast('Contact removed.');
      },
    });
  };

  // Settlement handler
  const handleConfirmSettlement = (settlement: Settlement) => {
    persistState((prev) => ({
      ...prev,
      settlements: [settlement, ...prev.settlements],
    }));
    setSettleModal({ open: false });
    showToast('Settlement recorded!');
  };

  // Rates & Data handlers
  const handleSaveRates = (rates: ExchangeRates) => {
    persistState((prev) => ({ ...prev, ratesToPKR: rates }));
    showToast('Exchange rates updated!');
  };

  const handleExportCSV = () => {
    const ledger = getCombinedLedger(state, 'ALL');
    if (ledger.length === 0) {
      showToast('No records available to export.');
      return;
    }
    const csvContent = buildCSVContent(state);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SplitPro_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV / Excel file downloaded!');
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SplitPro_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSON backup downloaded!');
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        if (typeof raw !== 'string') return;
        const normalized = normalizeLoadedState(JSON.parse(raw));
        if (!normalized) {
          showToast('Invalid SplitPro backup file.');
          return;
        }
        persistState(() => normalized);
        setActiveGroupId(null);
        showToast('Backup restored successfully!');
      } catch {
        showToast('Could not read JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    setConfirmState({
      open: true,
      title: 'Clear All Data?',
      message:
        'This will permanently erase all groups, contacts, expenses, and settlements, resetting SplitPro to a blank slate.',
      onConfirm: () => {
        persistState(() => createBlankState());
        setActiveGroupId(null);
        setActiveTab('dashboard');
        setConfirmState((p) => ({ ...p, open: false }));
        showToast('All data cleared.');
      },
    });
  };

  const handleOpenReceipt = (expenseId: string) => {
    const exp = state.expenses.find((e) => e.id === expenseId);
    if (!exp || !exp.receiptImg) return;
    setLightbox({
      title: `${exp.description} (${exp.date})`,
      src: exp.receiptImg,
    });
  };

  const handleCopyDeveloperPhone = async () => {
    try {
      await navigator.clipboard.writeText('03005115522');
      showToast('Copied 03005115522 to clipboard!');
    } catch {
      showToast('Number: 03005115522');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-12">
      <TopHeader
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        contacts={state.contacts}
        currentUserId={state.currentUserId}
        onChangeUser={handleChangeUser}
        onOpenAddExpense={() =>
          setExpenseModal({ open: true, defaultGroupId: activeGroupId })
        }
        onOpenAbout={handleOpenAbout}
      />

      <WorkspaceContextBar
        contacts={state.contacts}
        currentUserId={state.currentUserId}
        onChangeUser={handleChangeUser}
        onOpenAbout={handleOpenAbout}
      />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        {activeTab === 'dashboard' && (
          <DashboardTab
            state={state}
            onOpenAddExpense={() => setExpenseModal({ open: true })}
            onOpenSettle={(from, to, amount) =>
              setSettleModal({ open: true, from, to, amount })
            }
            onExportCSV={handleExportCSV}
            onOpenWhatsApp={() => setWhatsappOpen(true)}
            onOpenAddContact={() => setContactModal({ open: true })}
            onOpenAddGroup={() => setGroupModal({ open: true })}
            onViewAllActivity={() => setActiveTab('activity')}
            onEditExpense={(id) =>
              setExpenseModal({ open: true, editExpenseId: id })
            }
            onDeleteEntry={handleDeleteEntry}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {activeTab === 'groups' && (
          <GroupsTab
            state={state}
            activeGroupId={activeGroupId}
            onSelectGroup={setActiveGroupId}
            onOpenGroupModal={(editGroupId) =>
              setGroupModal({ open: true, editGroupId: editGroupId || null })
            }
            onDeleteGroup={handleDeleteGroup}
            onOpenAddExpense={(groupId) =>
              setExpenseModal({ open: true, defaultGroupId: groupId || null })
            }
            onOpenSettle={(from, to, amount, groupId) =>
              setSettleModal({ open: true, from, to, amount, groupId })
            }
            onEditExpense={(id) =>
              setExpenseModal({ open: true, editExpenseId: id })
            }
            onDeleteEntry={handleDeleteEntry}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTab
            state={state}
            onOpenAddExpense={() => setExpenseModal({ open: true })}
            onEditExpense={(id) =>
              setExpenseModal({ open: true, editExpenseId: id })
            }
            onDeleteEntry={handleDeleteEntry}
            onOpenReceipt={handleOpenReceipt}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            state={state}
            onOpenAddExpense={() => setExpenseModal({ open: true })}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            state={state}
            onOpenContactModal={(editContactId) =>
              setContactModal({
                open: true,
                editContactId: editContactId || null,
              })
            }
            onDeleteContact={handleDeleteContact}
            onSaveRates={handleSaveRates}
            onExportCSV={handleExportCSV}
            onOpenWhatsApp={() => setWhatsappOpen(true)}
            onExportJSON={handleExportJSON}
            onImportJSON={handleImportJSON}
            onClearAllData={handleClearAllData}
            onCopyDeveloperPhone={handleCopyDeveloperPhone}
          />
        )}
      </main>

      <MobileBottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Modals */}
      <ExpenseModal
        isOpen={expenseModal.open}
        state={state}
        defaultGroupId={expenseModal.defaultGroupId}
        editExpenseId={expenseModal.editExpenseId}
        onClose={() => setExpenseModal({ open: false })}
        onSave={handleSaveExpense}
        onOpenAddContact={() => setContactModal({ open: true })}
        onNotify={showToast}
      />

      <GroupModal
        isOpen={groupModal.open}
        state={state}
        editGroupId={groupModal.editGroupId}
        onClose={() => setGroupModal({ open: false })}
        onSave={handleSaveGroup}
        onOpenAddContact={() => setContactModal({ open: true })}
        onNotify={showToast}
      />

      <ContactModal
        isOpen={contactModal.open}
        contacts={state.contacts}
        editContactId={contactModal.editContactId}
        onClose={() => setContactModal({ open: false })}
        onSave={handleSaveContact}
        onNotify={showToast}
      />

      <SettleModal
        isOpen={settleModal.open}
        state={state}
        initialFrom={settleModal.from}
        initialTo={settleModal.to}
        initialAmount={settleModal.amount}
        initialGroupId={settleModal.groupId}
        onClose={() => setSettleModal({ open: false })}
        onConfirm={handleConfirmSettlement}
        onNotify={showToast}
      />

      <WhatsAppModal
        isOpen={whatsappOpen}
        state={state}
        onClose={() => setWhatsappOpen(false)}
        onNotify={showToast}
      />

      <ConfirmModal
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onCancel={() => setConfirmState((p) => ({ ...p, open: false }))}
        onConfirm={() => {
          if (confirmState.onConfirm) confirmState.onConfirm();
        }}
      />

      <LightboxModal
        title={lightbox.title}
        src={lightbox.src}
        onClose={() => setLightbox({ title: '', src: '' })}
      />

      {/* Non-blocking Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[70px] left-1/2 z-50 max-w-[92vw] -translate-x-1/2 truncate rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg md:right-6 md:bottom-6 md:left-auto md:translate-x-0"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
