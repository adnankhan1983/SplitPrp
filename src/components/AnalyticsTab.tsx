import React from 'react';
import { PieChart, Plus } from 'lucide-react';
import type { AppState } from '../types';
import { computeAnalytics, formatPKR } from '../utils/ledger';

interface AnalyticsTabProps {
  state: AppState;
  onOpenAddExpense: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  state,
  onOpenAddExpense,
}) => {
  const analytics = computeAnalytics(
    state.expenses,
    state.contacts,
    state.ratesToPKR,
  );

  if (analytics.billCount === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Pro Spending Analytics
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Insights converted to PKR
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 md:hidden"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Bill</span>
          </button>
        </div>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <PieChart className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
            No Analytics Data Yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Log your first shared expense to unlock category donut breakdowns,
            member fair-share comparisons, and 6-month spending trends.
          </p>
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Log First Expense</span>
          </button>
        </section>
      </div>
    );
  }

  const topCat = analytics.categories[0];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let runningOffset = 0;

  const maxMemberVal = Math.max(
    1,
    ...analytics.memberStats.flatMap((m) => [m.paid, m.share]),
  );
  const maxMonthVal = Math.max(
    1,
    ...analytics.monthlyTrend.map((m) => m.total),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Pro Spending Analytics
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            All multi-currency bills normalized to PKR
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddExpense}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 md:hidden"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Bill</span>
        </button>
      </div>

      {/* KPI Summary Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500">
            Total Expense Volume
          </p>
          <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {formatPKR(analytics.totalSpend)}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-700 tabular-nums">
            {analytics.billCount} shared {analytics.billCount === 1 ? 'bill' : 'bills'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500">Top Category</p>
          <p className="mt-1.5 truncate font-display text-xl font-bold text-slate-900">
            {topCat ? topCat.category : '—'}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
            {topCat ? `${topCat.pct}% (${formatPKR(topCat.amount)})` : '0%'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500">
            Average Per Bill
          </p>
          <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {formatPKR(analytics.totalSpend / Math.max(1, analytics.billCount))}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Across {analytics.categories.length}{' '}
            {analytics.categories.length === 1 ? 'category' : 'categories'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Pure SVG Category Donut Chart */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Spending by Category
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Category share in PKR</p>

          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
              <svg
                viewBox="0 0 150 150"
                className="h-40 w-40 -rotate-90"
                role="img"
                aria-label="Category spending donut chart"
              >
                {analytics.categories.map((cat) => {
                  const slice =
                    analytics.totalSpend > 0
                      ? (cat.amount / analytics.totalSpend) * circumference
                      : 0;
                  const dashOffset = -runningOffset;
                  runningOffset += slice;
                  return (
                    <circle
                      key={cat.category}
                      r={radius}
                      cx="75"
                      cy="75"
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth="22"
                      strokeDasharray={`${slice} ${Math.max(0, circumference - slice)}`}
                      strokeDashoffset={dashOffset}
                    />
                  );
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-medium text-slate-500">Total</span>
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {formatPKR(analytics.totalSpend)}
                </span>
              </div>
            </div>

            <div className="w-full flex-1 space-y-2.5">
              {analytics.categories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-semibold text-slate-800">
                      {cat.category}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono font-bold text-slate-900 tabular-nums">
                    {cat.pct}%{' '}
                    <span className="font-normal text-slate-500">
                      ({formatPKR(cat.amount)})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Monthly Spending Trend */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Monthly Spending Trend
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Last 6 months expense volume (PKR)
          </p>

          <div className="mt-5 grid h-44 grid-cols-6 items-end gap-3 pt-6">
            {analytics.monthlyTrend.map((m) => {
              const heightPct =
                m.total > 0
                  ? Math.max(10, Math.round((m.total / maxMonthVal) * 100))
                  : 4;
              const shortLabel =
                m.total >= 1000
                  ? `${(m.total / 1000).toFixed(m.total >= 10000 ? 0 : 1)}k`
                  : String(Math.round(m.total));
              return (
                <div
                  key={m.ym}
                  className="flex h-full flex-col items-center justify-end"
                >
                  <span className="mb-1.5 font-mono text-[11px] font-semibold text-slate-600 tabular-nums">
                    {shortLabel}
                  </span>
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                      m.total > 0
                        ? 'bg-emerald-600'
                        : 'bg-slate-200'
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${m.label}: ${formatPKR(m.total)}`}
                  />
                  <span className="mt-2 text-xs font-semibold text-slate-600">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Paid vs Fair Share Member Comparison */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Paid vs. Fair Share
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Emerald bar = Total Paid · Sky bar = Total Consumed Share
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {analytics.memberStats.map((m) => {
            const paidW = Math.round((m.paid / maxMemberVal) * 100);
            const shareW = Math.round((m.share / maxMemberVal) * 100);
            return (
              <div key={m.memberId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-900">{m.name}</span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    Paid{' '}
                    <strong className="text-emerald-700">
                      {formatPKR(m.paid)}
                    </strong>{' '}
                    · Share{' '}
                    <strong className="text-sky-700">
                      {formatPKR(m.share)}
                    </strong>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${paidW}%` }}
                  />
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-600"
                    style={{ width: `${shareW}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
