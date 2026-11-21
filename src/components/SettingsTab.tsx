import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Share2,
  FileSpreadsheet,
  Phone,
  MessageCircle,
  Copy,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import type { AppState, ExchangeRates } from '../types';
import {
  calculateNetBalances,
  DEFAULT_USER_ID,
  formatPKR,
  getCombinedLedger,
} from '../utils/ledger';

interface SettingsTabProps {
  state: AppState;
  onOpenContactModal: (contactId?: string) => void;
  onDeleteContact: (contactId: string) => void;
  onSaveRates: (rates: ExchangeRates) => void;
  onExportCSV: () => void;
  onOpenWhatsApp: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onClearAllData: () => void;
  onCopyDeveloperPhone: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  state,
  onOpenContactModal,
  onDeleteContact,
  onSaveRates,
  onExportCSV,
  onOpenWhatsApp,
  onExportJSON,
  onImportJSON,
  onClearAllData,
  onCopyDeveloperPhone,
}) => {
  const [usd, setUsd] = useState(String(state.ratesToPKR.USD));
  const [aed, setAed] = useState(String(state.ratesToPKR.AED));
  const [sar, setSar] = useState(String(state.ratesToPKR.SAR));
  const [gbp, setGbp] = useState(String(state.ratesToPKR.GBP));

  useEffect(() => {
    setUsd(String(state.ratesToPKR.USD));
    setAed(String(state.ratesToPKR.AED));
    setSar(String(state.ratesToPKR.SAR));
    setGbp(String(state.ratesToPKR.GBP));
  }, [state.ratesToPKR]);

  const net = calculateNetBalances(
    getCombinedLedger(state, 'ALL'),
    state.contacts,
    state.ratesToPKR,
  );

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRates({
      PKR: 1,
      USD: parseFloat(usd) || 278.5,
      AED: parseFloat(aed) || 75.8,
      SAR: parseFloat(sar) || 74.2,
      GBP: parseFloat(gbp) || 354.0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-slate-900">
          Contacts &amp; Settings
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Manage people, offline exchange rates, backups, and app info
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Contacts Directory */}
        <section
          aria-label="Contacts and Members"
          className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Contacts &amp; Members
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                People you split bills with · {state.contacts.length} total
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenContactModal()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Contact</span>
            </button>
          </div>

          <ul className="mt-3 divide-y divide-slate-100">
            {state.contacts.map((c) => {
              const isDefaultYou = c.id === DEFAULT_USER_ID;
              const bal = net[c.id] || 0;
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-display text-xs font-extrabold text-emerald-800">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-900">
                          {c.name}
                        </span>
                        {c.id === state.currentUserId && (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            · Active
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {c.note || 'Contact'}
                        {c.phone ? ` · ${c.phone}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="mr-1 font-mono text-xs font-bold tabular-nums">
                      {bal > 0.5 ? (
                        <span className="text-emerald-700">
                          Gets {formatPKR(bal)}
                        </span>
                      ) : bal < -0.5 ? (
                        <span className="text-rose-600">
                          Owes {formatPKR(Math.abs(bal))}
                        </span>
                      ) : (
                        <span className="font-normal text-slate-400">Settled</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenContactModal(c.id)}
                      aria-label={`Edit ${c.name}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    {!isDefaultYou && (
                      <button
                        type="button"
                        onClick={() => onDeleteContact(c.id)}
                        aria-label={`Delete ${c.name}`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        <span>Del</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Right Column: Rates & Backup */}
        <div className="space-y-6 lg:col-span-5">
          {/* Multi-Currency Exchange Rates */}
          <section
            aria-label="Multi-Currency Exchange Rates"
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Multi-Currency Rates
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Offline conversion rates · Base: PKR
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRates} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <span>1 USD =</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={usd}
                    onChange={(e) => setUsd(e.target.value)}
                    className="w-20 bg-transparent text-right font-mono text-sm font-bold text-slate-900 outline-none tabular-nums"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <span>1 AED =</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={aed}
                    onChange={(e) => setAed(e.target.value)}
                    className="w-20 bg-transparent text-right font-mono text-sm font-bold text-slate-900 outline-none tabular-nums"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <span>1 SAR =</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={sar}
                    onChange={(e) => setSar(e.target.value)}
                    className="w-20 bg-transparent text-right font-mono text-sm font-bold text-slate-900 outline-none tabular-nums"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <span>1 GBP =</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={gbp}
                    onChange={(e) => setGbp(e.target.value)}
                    className="w-20 bg-transparent text-right font-mono text-sm font-bold text-slate-900 outline-none tabular-nums"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Save Exchange Rates
              </button>
            </form>
          </section>

          {/* Data Export, Backup & Reset */}
          <section
            aria-label="Backup, Export and Reset"
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="font-display text-base font-bold text-slate-900">
              Backup, Export &amp; Reset
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              100% offline local storage vault
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onExportCSV}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={onOpenWhatsApp}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-green-700"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>WhatsApp Report</span>
              </button>
              <button
                type="button"
                onClick={onExportJSON}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>JSON Backup</span>
              </button>
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100">
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportJSON(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onClearAllData}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear All Data (Reset Blank)</span>
            </button>
          </section>
        </div>
      </div>

      {/* About & Developer Information Section */}
      <section
        id="aboutDeveloperCard"
        aria-label="About and Developer"
        className="rounded-2xl border border-emerald-200 bg-white p-5 sm:p-6"
      >
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold text-emerald-700">
              About &amp; Developer · SplitPro Version 1.0
            </p>
            <div className="mt-3 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 font-display text-base font-extrabold text-white">
                AB
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Adnan Babar
                </h2>
                <p className="text-xs font-medium text-slate-600">
                  Creator &amp; Developer
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Rawalpindi, Pakistan
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 tabular-nums">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    03005115522
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <a
                href="tel:03005115522"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Call</span>
              </a>
              <a
                href="https://wa.me/923005115522?text=Assalam-o-Alaikum%20Adnan%20Babar%2C%20I%20am%20contacting%20you%20regarding%20the%20SplitPro%20app."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onCopyDeveloperPhone}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy No.</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Offline Shared Expense &amp; Partnership Ledger
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Designed and built by <strong className="text-slate-900">Adnan Babar</strong>{' '}
              for effortless, 100% offline shared expense tracking, roommate bills,
              trips, and business partnership ledgers without subscriptions or internet
              dependency.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Multi-Payer · Equal / Exact / Percent / Shares · Smart Debt Simplification ·
              PKR / USD / AED / SAR / GBP · Receipt Compression · SVG Analytics · English
              + اردو WhatsApp Statements · JSON / CSV Backup
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
