import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Cloud,
  PlaneTakeoff,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  AIRPORTS,
  formatMinutesArabic,
  getVehicleById,
} from '../data/airports';
import { type FocusSessionRecord } from '../firebase';

interface LogbookViewProps {
  sessions: FocusSessionRecord[];
  isLoading: boolean;
  isSignedIn: boolean;
  onSignIn: () => void;
  onDeleteSession: (sessionId: string) => void;
  onStartFirstFlight: () => void;
}

function calculateStreakDays(sessions: FocusSessionRecord[]): number {
  const completedDates = new Set(
    sessions
      .filter((s) => s.status === 'completed' && s.startedAt)
      .map((s) => s.startedAt.slice(0, 10))
  );
  if (completedDates.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  const todayStr = cursor.toISOString().slice(0, 10);

  if (!completedDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getDestTypeLabel(type: string): string {
  if (type === 'island') return 'جزيرة استوائية';
  if (type === 'space') return 'محطة فضائية';
  return 'مدينة';
}

export const LogbookView: React.FC<LogbookViewProps> = ({
  sessions,
  isLoading,
  isSignedIn,
  onSignIn,
  onDeleteSession,
  onStartFirstFlight,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.status === 'completed');
    const totalMinutes = completed.reduce((sum, s) => sum + s.completedMinutes, 0);
    const totalKm = completed.reduce((sum, s) => sum + s.distanceKm, 0);
    const avgMinutes =
      completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0;
    const streakDays = calculateStreakDays(sessions);

    const stampsMap = new Map<string, number>();
    const cityCounts = new Map<string, { city: string; code: string; count: number }>();

    completed.forEach((s) => {
      stampsMap.set(s.destinationCode, (stampsMap.get(s.destinationCode) || 0) + 1);
      const prev = cityCounts.get(s.destinationCode);
      cityCounts.set(s.destinationCode, {
        city: s.destinationCity,
        code: s.destinationCode,
        count: (prev?.count || 0) + 1,
      });
    });

    const sortedCities = Array.from(cityCounts.values()).sort(
      (a, b) => b.count - a.count
    );
    const topDestination = sortedCities[0] || null;

    return {
      completedCount: completed.length,
      totalMinutes,
      totalKm,
      avgMinutes,
      streakDays,
      stampsMap,
      topDestination,
    };
  }, [sessions]);

  const progressBars = useMemo(() => {
    const daysCount = chartPeriod === 'week' ? 7 : 30;
    const dailyTotals = new Map<string, number>();
    sessions
      .filter((s) => s.status === 'completed' && s.startedAt)
      .forEach((s) => {
        const key = s.startedAt.slice(0, 10);
        dailyTotals.set(key, (dailyTotals.get(key) || 0) + s.completedMinutes);
      });

    const bars: Array<{
      dateKey: string;
      shortLabel: string;
      fullLabel: string;
      minutes: number;
    }> = [];

    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const shortLabel =
        chartPeriod === 'week'
          ? d.toLocaleDateString('ar-SA', { weekday: 'short' })
          : String(d.getDate());
      const fullLabel = d.toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
      });
      bars.push({
        dateKey: key,
        shortLabel,
        fullLabel,
        minutes: dailyTotals.get(key) || 0,
      });
    }

    const maxMinutes = Math.max(30, ...bars.map((b) => b.minutes));
    const periodTotalMinutes = bars.reduce((sum, b) => sum + b.minutes, 0);

    return { bars, maxMinutes, periodTotalMinutes };
  }, [sessions, chartPeriod]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.subject.toLowerCase().includes(q) ||
        s.destinationCity.toLowerCase().includes(q) ||
        s.originCity.toLowerCase().includes(q) ||
        s.destinationCode.toLowerCase().includes(q)
      );
    });
  }, [sessions, statusFilter, searchQuery]);

  const groupedByDate = useMemo(() => {
    const groups: Array<{ dateKey: string; dateTitle: string; items: FocusSessionRecord[] }> = [];
    const map = new Map<string, FocusSessionRecord[]>();
    const todayKey = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    filteredSessions.forEach((s) => {
      const key = (s.startedAt || '').slice(0, 10) || 'unknown';
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });

    map.forEach((items, key) => {
      let title = 'تاريخ غير محدد';
      if (key === todayKey) {
        title = 'اليوم';
      } else if (key === yesterdayKey) {
        title = 'أمس';
      } else if (key !== 'unknown') {
        title = new Date(key).toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      groups.push({ dateKey: key, dateTitle: title, items });
    });

    return groups;
  }, [filteredSessions]);

  const activeBar = progressBars.bars.find((b) => b.dateKey === hoveredDayKey) || null;

  return (
    <div className="space-y-8">
      {/* Sync Banner if Guest */}
      {!isSignedIn && (
        <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Cloud className="w-5 h-5 text-sky-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-sm font-semibold text-slate-100">
                سجلك محفوظ محلياً على هذا المتصفح
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                سجّل دخولك بحساب Google لمزامنة ساعات تركيزك وأختام سفرك تلقائياً عبر جميع أجهزتك.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            مزامنة السجل الآن
          </button>
        </div>
      )}

      {/* Summary KPIs (6 metrics in clean 3x2 / 6-col responsive grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">إجمالي وقت التركيز</div>
          <div className="text-xl font-bold font-mono-tabular text-sky-400">
            {formatMinutesArabic(stats.totalMinutes)}
          </div>
        </div>
        <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">الرحلات المكتملة</div>
          <div className="text-xl font-bold font-mono-tabular text-white">
            {stats.completedCount}
          </div>
        </div>
        <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">متوسط مدة الجلسة</div>
          <div className="text-xl font-bold font-mono-tabular text-emerald-400">
            {stats.avgMinutes > 0 ? formatMinutesArabic(stats.avgMinutes) : '0 دقيقة'}
          </div>
        </div>
        <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">الوجهة الأكثر زيارة</div>
          <div className="text-lg font-bold text-white truncate">
            {stats.topDestination
              ? `${stats.topDestination.city} (${stats.topDestination.count})`
              : '—'}
          </div>
        </div>
        <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">المسافة المقطوعة</div>
          <div className="text-xl font-bold font-mono-tabular text-slate-100">
            {stats.totalKm.toLocaleString('en-US')} كم
          </div>
        </div>
        <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">سلسلة الأيام</div>
          <div className="text-xl font-bold font-mono-tabular text-amber-400">
            {stats.streakDays} يوم
          </div>
        </div>
      </div>

      {/* Weekly / Monthly Progress Chart */}
      <section className="bg-[#111A2E] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                تقدم التركيز {chartPeriod === 'week' ? 'الأسبوعي' : 'الشهري'}
              </h2>
              <p className="text-xs text-slate-400">
                الإجمالي خلال الفترة:{' '}
                <span className="font-mono-tabular text-sky-400 font-semibold">
                  {formatMinutesArabic(progressBars.periodTotalMinutes)}
                </span>
                {activeBar && (
                  <span>
                    {' '}
                    · {activeBar.fullLabel}: {formatMinutesArabic(activeBar.minutes)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#0A101F] border border-slate-800 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartPeriod('week')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                chartPeriod === 'week'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => setChartPeriod('month')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                chartPeriod === 'month'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              آخر 30 يوماً
            </button>
          </div>
        </div>

        <div className="h-44 flex items-end gap-1.5 sm:gap-2 pt-4 border-t border-slate-800/70">
          {progressBars.bars.map((bar) => {
            const heightPct = Math.round((bar.minutes / progressBars.maxMinutes) * 100);
            const isActive = hoveredDayKey === bar.dateKey;
            return (
              <div
                key={bar.dateKey}
                onMouseEnter={() => setHoveredDayKey(bar.dateKey)}
                onMouseLeave={() => setHoveredDayKey(null)}
                className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group cursor-pointer"
              >
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[32px] rounded-t transition-all duration-200 ${
                      bar.minutes === 0
                        ? 'bg-slate-800/60 h-[4px]'
                        : isActive
                        ? 'bg-amber-400'
                        : 'bg-sky-500/80 group-hover:bg-sky-400'
                    }`}
                    style={
                      bar.minutes > 0
                        ? { height: `${Math.max(8, heightPct)}%` }
                        : undefined
                    }
                  />
                </div>
                <span className="text-[10px] font-mono-tabular text-slate-500 truncate max-w-full">
                  {chartPeriod === 'month' && Number(bar.shortLabel) % 5 !== 0
                    ? ''
                    : bar.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Passport Stamps Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">جواز السفر والأختام</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              تم فتح {stats.stampsMap.size} من أصل {AIRPORTS.length} وجهة (مدن، جزر، ومحطات فضائية)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2.5">
          {AIRPORTS.map((airport) => {
            const count = stats.stampsMap.get(airport.code) || 0;
            const unlocked = count > 0;
            return (
              <div
                key={airport.code}
                className={`rounded-xl border p-2.5 flex flex-col items-center justify-center text-center transition-colors ${
                  unlocked
                    ? 'bg-[#111A2E] border-sky-500/40'
                    : 'bg-[#0C1323] border-slate-800/70 opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center font-mono-tabular text-[11px] font-bold mb-1.5 ${
                    unlocked
                      ? airport.type === 'space'
                        ? 'border-violet-400 text-violet-300 bg-violet-500/10 -rotate-6'
                        : airport.type === 'island'
                        ? 'border-teal-400 text-teal-300 bg-teal-500/10 -rotate-6'
                        : 'border-sky-400 text-sky-400 bg-sky-500/10 -rotate-6'
                      : 'border-slate-700 text-slate-600'
                  }`}
                >
                  {airport.code}
                </div>
                <div className="text-[11px] font-medium text-slate-200 truncate w-full">
                  {airport.cityAr}
                </div>
                <div className="text-[10px] font-mono-tabular text-slate-500 mt-0.5">
                  {unlocked ? `${count} رحلة` : 'غير مفتوحة'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Organized Flight Focus History Grouped by Date */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">تاريخ الجلسات الدراسية</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالموضوع أو المدينة..."
                className="bg-[#111A2E] border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#111A2E] border border-slate-800 rounded-lg">
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'completed', label: 'مكتملة' },
                  { id: 'cancelled', label: 'ملغاة' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-[#111A2E] border border-slate-800 rounded-xl divide-y divide-slate-800">
            {[1, 2, 3].map((row) => (
              <div key={row} className="p-4 flex items-center justify-between animate-pulse">
                <div className="h-4 w-48 bg-slate-800 rounded" />
                <div className="h-4 w-24 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-800/70 flex items-center justify-center mx-auto text-sky-400">
              <PlaneTakeoff className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">
                {sessions.length === 0 ? 'لا توجد رحلات دراسية مسجلة بعد' : 'لا توجد نتائج مطابقة للبحث'}
              </h3>
              <p className="text-sm text-slate-400">
                {sessions.length === 0
                  ? 'اختر مدة دراستك الآن وأقلع في أول رحلة تركيز لتوثيق إنجازك.'
                  : 'جرّب تغيير كلمات البحث أو فلتر الحالة.'}
              </p>
            </div>
            {sessions.length === 0 && (
              <button
                type="button"
                onClick={onStartFirstFlight}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
              >
                <PlaneTakeoff className="w-4 h-4" />
                <span>بدء رحلتك الأولى</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByDate.map((group) => (
              <div key={group.dateKey} className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 px-1">
                  {group.dateTitle}
                </div>
                <div className="bg-[#111A2E] border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/90">
                  {group.items.map((session) => {
                    const timeLabel = session.startedAt
                      ? new Date(session.startedAt).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';
                    const vehicle = getVehicleById(session.vehicleType);

                    return (
                      <div
                        key={session.id}
                        className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                            <span className="font-mono-tabular text-amber-400">
                              {session.originCode}
                            </span>
                            <span className="text-slate-500">←</span>
                            <span className="font-mono-tabular text-sky-400">
                              {session.destinationCode}
                            </span>
                            <span className="text-slate-400 font-normal truncate">
                              {session.originCity} إلى {session.destinationCity}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                            <span className="text-slate-200 truncate max-w-xs">{session.subject}</span>
                            <span aria-hidden="true">·</span>
                            <span>{vehicle.nameAr}</span>
                            <span aria-hidden="true">·</span>
                            <span>{getDestTypeLabel(session.destinationType)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">{timeLabel}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                          <div className="text-right sm:text-left">
                            <div className="text-sm font-semibold font-mono-tabular text-slate-100">
                              {formatMinutesArabic(session.completedMinutes)}
                            </div>
                            <div className="text-xs font-mono-tabular text-slate-500">
                              {session.distanceKm.toLocaleString('en-US')} كم
                            </div>
                          </div>

                          <div
                            className={`flex items-center gap-1.5 text-xs font-medium ${
                              session.status === 'completed'
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {session.status === 'completed' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>مكتملة</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>ملغاة</span>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteSession(session.id)}
                            aria-label="حذف السجل"
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
