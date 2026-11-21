import React from 'react';
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  PieChart,
  UserCog,
  Plus,
  Info,
  Wallet,
} from 'lucide-react';
import type { Contact, TabId } from '../types';

interface NavigationProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  contacts: Contact[];
  currentUserId: string;
  onChangeUser: (userId: string) => void;
  onOpenAddExpense: () => void;
  onOpenAbout: () => void;
}

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'groups', label: 'Groups', Icon: Users },
  { id: 'activity', label: 'Activity', Icon: ReceiptText },
  { id: 'analytics', label: 'Analytics', Icon: PieChart },
  { id: 'settings', label: 'Contacts', Icon: UserCog },
];

export const TopHeader: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  contacts,
  currentUserId,
  onChangeUser,
  onOpenAddExpense,
  onOpenAbout,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Desktop 3-Zone Top Bar Contract */}
      <div className="mx-auto hidden h-16 max-w-6xl items-center justify-between gap-8 px-6 md:flex">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-left font-display text-lg font-extrabold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Wallet className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>SplitPro</span>
        </button>

        {/* Zone 2: 5 Single-line Text Navigation Links */}
        <nav aria-label="Primary Navigation" className="flex items-center gap-7">
          {NAV_ITEMS.map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded ${
                  isActive
                    ? 'text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 -bottom-[14px] left-0 h-0.5 bg-emerald-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-emerald-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Top Bar (52px height to stay strictly under 15% sticky cap) */}
      <div className="flex h-[52px] items-center justify-between gap-2 px-4 md:hidden">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-base font-extrabold tracking-tight text-slate-900"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>SplitPro</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAddExpense}
            aria-label="Add Expense"
            title="Add Expense"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenAbout}
            aria-label="About Developer"
            title="About Developer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
          <select
            aria-label="Active User"
            value={currentUserId}
            onChange={(e) => onChangeUser(e.target.value)}
            className="h-9 max-w-[116px] truncate rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-800 outline-none focus:border-emerald-600"
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

interface WorkspaceContextBarProps {
  contacts: Contact[];
  currentUserId: string;
  onChangeUser: (userId: string) => void;
  onOpenAbout: () => void;
}

export const WorkspaceContextBar: React.FC<WorkspaceContextBarProps> = ({
  contacts,
  currentUserId,
  onChangeUser,
  onOpenAbout,
}) => {
  return (
    <div className="hidden border-b border-slate-200/80 bg-white md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2.5 text-xs text-slate-500">
        <p className="truncate">
          Offline Expense &amp; Bill Splitter · Stored locally on this device · Base currency PKR
        </p>
        <div className="flex shrink-0 items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Viewing as</span>
            <select
              aria-label="Active User Desktop"
              value={currentUserId}
              onChange={(e) => onChangeUser(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-emerald-600"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden="true" className="text-slate-300">
            |
          </span>
          <button
            type="button"
            onClick={onOpenAbout}
            className="inline-flex items-center gap-1 font-medium text-slate-600 transition-colors hover:text-emerald-700 whitespace-nowrap"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            <span>About Developer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface MobileBottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
    >
      <div className="grid h-[58px] grid-cols-5 items-center px-1">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
