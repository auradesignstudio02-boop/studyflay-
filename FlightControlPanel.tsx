import React, { useMemo, useState } from 'react';
import {
  Building2,
  Clock,
  Disc3,
  Lock,
  MapPin,
  Palmtree,
  Pause,
  Plane,
  PlaneTakeoff,
  Play,
  RefreshCw,
  Rocket,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import {
  AIRPORTS,
  type Airport,
  type AirportRegion,
  calculateDistanceKm,
  type DestinationType,
  estimateFlightMinutes,
  formatMinutesArabic,
  getDestinationsForDuration,
  getVehicleById,
  HUB_AIRPORTS,
  isAirportUnlocked,
  isVehicleUnlocked,
  VEHICLES,
  type VehicleType,
} from '../data/airports';

export type PlanningMode = 'duration' | 'destination';

interface FlightControlPanelProps {
  planningMode: PlanningMode;
  onChangePlanningMode: (mode: PlanningMode) => void;
  destinationType: DestinationType;
  onChangeDestinationType: (type: DestinationType) => void;
  vehicleType: VehicleType;
  onChangeVehicleType: (type: VehicleType) => void;
  origin: Airport;
  onChangeOrigin: (code: string) => void;
  destination: Airport;
  onSelectDestination: (airport: Airport, updateDuration?: boolean) => void;
  plannedMinutes: number;
  onChangePlannedMinutes: (minutes: number) => void;
  subject: string;
  onChangeSubject: (subject: string) => void;
  flightNumber: string;
  isFlying: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  ambientSoundOn: boolean;
  totalCompletedMinutes: number;
  onToggleAmbientSound: () => void;
  onStartFlight: () => void;
  onTogglePause: () => void;
  onEndFlightEarly: () => void;
  onCycleSuggestedDestination: () => void;
  onOpenWheel: () => void;
}

const DURATION_PRESETS = [15, 25, 45, 60, 90, 120, 180, 240];

const DESTINATION_TYPE_TABS: Array<{
  id: DestinationType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'city', label: 'مدينة', icon: Building2 },
  { id: 'island', label: 'جزيرة استوائية', icon: Palmtree },
  { id: 'space', label: 'محطة فضائية', icon: Rocket },
];

const REGION_TABS: Array<{ id: 'all' | AirportRegion; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'arab', label: 'عربي' },
  { id: 'europe', label: 'أوروبا' },
  { id: 'asia', label: 'آسيا' },
  { id: 'global', label: 'عالمي' },
];

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export const FlightControlPanel: React.FC<FlightControlPanelProps> = ({
  planningMode,
  onChangePlanningMode,
  destinationType,
  onChangeDestinationType,
  vehicleType,
  onChangeVehicleType,
  origin,
  onChangeOrigin,
  destination,
  onSelectDestination,
  plannedMinutes,
  onChangePlannedMinutes,
  subject,
  onChangeSubject,
  flightNumber,
  isFlying,
  isPaused,
  remainingSeconds,
  ambientSoundOn,
  totalCompletedMinutes,
  onToggleAmbientSound,
  onStartFlight,
  onTogglePause,
  onEndFlightEarly,
  onCycleSuggestedDestination,
  onOpenWheel,
}) => {
  const [regionFilter, setRegionFilter] = useState<'all' | AirportRegion>('all');
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const distanceKm = useMemo(
    () => calculateDistanceKm(origin, destination),
    [origin, destination]
  );

  const topMatches = useMemo(
    () =>
      getDestinationsForDuration(
        origin.code,
        plannedMinutes,
        destinationType,
        vehicleType,
        totalCompletedMinutes
      ).slice(0, 4),
    [origin.code, plannedMinutes, destinationType, vehicleType, totalCompletedMinutes]
  );

  const filteredDestinations = useMemo(() => {
    return AIRPORTS.filter((a) => {
      if (a.code === origin.code) return false;
      if (a.type !== destinationType) return false;
      if (destinationType === 'city' && regionFilter !== 'all' && a.region !== regionFilter) {
        return false;
      }
      return true;
    }).map((airport) => {
      const dist = calculateDistanceKm(origin, airport);
      const unlocked = isAirportUnlocked(airport, totalCompletedMinutes);
      return {
        airport,
        distanceKm: dist,
        estimatedMinutes: estimateFlightMinutes(dist, vehicleType),
        unlocked,
      };
    });
  }, [origin, destinationType, regionFilter, vehicleType, totalCompletedMinutes]);

  const expectedArrivalTime = useMemo(() => {
    const msToAdd = isFlying ? remainingSeconds * 1000 : plannedMinutes * 60 * 1000;
    const eta = new Date(Date.now() + msToAdd);
    return eta.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [isFlying, remainingSeconds, plannedMinutes]);

  const totalSeconds = plannedMinutes * 60;
  const elapsedPercent =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100)))
      : 0;

  const activeVehicle = getVehicleById(vehicleType);

  if (isFlying) {
    return (
      <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono-tabular font-semibold text-sky-400">
              {flightNumber} · {activeVehicle.nameAr}
            </span>
            <span>الوصول المتوقع {expectedArrivalTime}</span>
          </div>

          <div className="flex items-center justify-between gap-3 py-3 border-y border-slate-800/80">
            <div>
              <div className="font-mono-tabular text-2xl font-bold text-amber-400">{origin.code}</div>
              <div className="text-xs text-slate-400">{origin.cityAr}</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 px-2">
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-500"
                  style={{ width: `${elapsedPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {distanceKm.toLocaleString('en-US')} كم
              </span>
            </div>
            <div className="text-left">
              <div className="font-mono-tabular text-2xl font-bold text-sky-400">{destination.code}</div>
              <div className="text-xs text-slate-400">{destination.cityAr}</div>
            </div>
          </div>

          <div className="py-4 text-center space-y-2">
            <div className="text-xs text-slate-400">
              {isPaused ? 'الرحلة متوقفة مؤقتاً' : 'الوقت المتبقي حتى الوصول'}
            </div>
            <div className="font-mono-tabular text-5xl font-bold tracking-tight text-white">
              {formatCountdown(remainingSeconds)}
            </div>
            <div className="text-sm text-slate-300 truncate max-w-full" title={subject}>
              {subject.trim() ? subject : 'جلسة دراسة وتركيز عميق'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onToggleAmbientSound}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-slate-800 bg-[#0D1526] hover:border-slate-700 text-sm text-slate-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {ambientSoundOn ? (
                <Volume2 className="w-4 h-4 text-sky-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span>صوت المقصورة</span>
            </span>
            <span className="text-xs text-slate-400">
              {ambientSoundOn ? 'مفعّل' : 'صامت'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onTogglePause}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 text-sky-400" />
                  <span>استئناف</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>إيقاف مؤقت</span>
                </>
              )}
            </button>

            {!confirmingCancel ? (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <XCircle className="w-4 h-4" />
                <span>إنهاء الرحلة</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmingCancel(false);
                  onEndFlightEarly();
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>تأكيد الإنهاء</span>
              </button>
            )}
          </div>

          {confirmingCancel && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>هل تريد إنهاء الجلسة قبل الوصول؟</span>
              <button
                type="button"
                onClick={() => setConfirmingCancel(false)}
                className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
              >
                تراجع
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111A2E] border border-slate-800 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
      {/* Mode Switcher + Country Wheel Trigger */}
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-2 gap-1 p-1 bg-[#0A101F] border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => onChangePlanningMode('duration')}
            className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              planningMode === 'duration'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            حسب مدة الدراسة
          </button>
          <button
            type="button"
            onClick={() => onChangePlanningMode('destination')}
            className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              planningMode === 'destination'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            اختيار الوجهة
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenWheel}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="تدوير عجلة البلدان لاختيار وجهة عشوائية"
        >
          <Disc3 className="w-4 h-4" />
          <span>عجلة البلدان</span>
        </button>
      </div>

      {/* Destination Type Selector */}
      <div>
        <div className="text-xs text-slate-400 mb-1.5">نوع الوجهة</div>
        <div className="grid grid-cols-3 gap-1.5">
          {DESTINATION_TYPE_TABS.map((item) => {
            const Icon = item.icon;
            const active = destinationType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeDestinationType(item.id)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-sky-500/15 border-sky-400 text-sky-300 font-semibold'
                    : 'bg-[#0A101F] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aircraft / Vehicle Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            <span>نموذج الطائرة</span>
          </span>
          <span className="text-[11px] text-slate-500">{activeVehicle.subtitleAr}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {VEHICLES.map((v) => {
            const unlocked = isVehicleUnlocked(v, totalCompletedMinutes);
            const active = vehicleType === v.id;
            return (
              <button
                key={v.id}
                type="button"
                disabled={!unlocked}
                onClick={() => onChangeVehicleType(v.id)}
                title={
                  unlocked
                    ? v.subtitleAr
                    : `يُفتح بعد إتمام ${v.unlockMinutesRequired} دقيقة تركيز`
                }
                className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                  !unlocked
                    ? 'bg-[#0A101F]/60 border-slate-800/60 text-slate-600 cursor-not-allowed'
                    : active
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-semibold cursor-pointer'
                    : 'bg-[#0A101F] border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer'
                }`}
              >
                {!unlocked && <Lock className="w-3 h-3 shrink-0" />}
                <span className="truncate">{v.nameAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Departure Hub & Subject */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="hub-select" className="block text-xs text-slate-400 mb-1.5">
            مطار المغادرة
          </label>
          <select
            id="hub-select"
            value={origin.code}
            onChange={(e) => onChangeOrigin(e.target.value)}
            className="w-full bg-[#0A101F] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
          >
            {HUB_AIRPORTS.map((hub) => (
              <option key={hub.code} value={hub.code}>
                {hub.cityAr} ({hub.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="study-subject" className="block text-xs text-slate-400 mb-1.5">
            موضوع الدراسة
          </label>
          <input
            id="study-subject"
            type="text"
            maxLength={140}
            value={subject}
            onChange={(e) => onChangeSubject(e.target.value)}
            placeholder="مثال: مراجعة الفيزياء"
            className="w-full bg-[#0A101F] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {planningMode === 'duration' ? (
        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>مدة الدراسة</span>
              </span>
              <span className="text-sm font-semibold font-mono-tabular text-sky-400">
                {formatMinutesArabic(plannedMinutes)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangePlannedMinutes(mins)}
                  className={`py-1.5 rounded-lg text-xs font-mono-tabular font-medium border transition-colors cursor-pointer ${
                    plannedMinutes === mins
                      ? 'bg-sky-500/15 border-sky-400 text-sky-300 font-semibold'
                      : 'bg-[#0A101F] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {mins >= 60 ? `${mins / 60} س` : `${mins} د`}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={10}
              max={360}
              step={5}
              value={plannedMinutes}
              onChange={(e) => onChangePlannedMinutes(Number(e.target.value))}
              aria-label="مدة الدراسة بالدقائق"
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Matched Destination Recommendation */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">الوجهة المقترحة لهذه المدة</span>
              <button
                type="button"
                onClick={onCycleSuggestedDestination}
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تبديل الوجهة</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {topMatches.map((match) => {
                const isSelected = match.airport.code === destination.code;
                return (
                  <button
                    key={match.airport.code}
                    type="button"
                    onClick={() => onSelectDestination(match.airport, false)}
                    className={`text-right p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-400/70'
                        : 'bg-[#0A101F] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {match.airport.cityAr}
                      </span>
                      <span className="text-xs font-mono-tabular text-sky-400 shrink-0">
                        {match.airport.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {match.airport.countryAr} · {match.distanceKm.toLocaleString('en-US')} كم
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>اختر وجهتك</span>
            </span>
            <span className="text-xs font-mono-tabular text-sky-400">
              {formatMinutesArabic(plannedMinutes)}
            </span>
          </div>

          {destinationType === 'city' && (
            <div className="flex items-center gap-1 p-1 bg-[#0A101F] border border-slate-800 rounded-lg overflow-x-auto">
              {REGION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRegionFilter(tab.id)}
                  className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    regionFilter === tab.id
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-40 overflow-y-auto space-y-1.5 pl-1">
            {filteredDestinations.map((item) => {
              const isSelected = item.airport.code === destination.code;
              return (
                <button
                  key={item.airport.code}
                  type="button"
                  disabled={!item.unlocked}
                  onClick={() => onSelectDestination(item.airport, true)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-right transition-colors ${
                    !item.unlocked
                      ? 'bg-[#0A101F]/60 border-slate-800/60 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-sky-500/10 border-sky-400/70 cursor-pointer'
                      : 'bg-[#0A101F] border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate flex items-center gap-1.5">
                      {!item.unlocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span>{item.airport.cityAr}</span>
                      <span className="text-slate-400 font-normal">· {item.airport.countryAr}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono-tabular">
                      {item.unlocked
                        ? `${item.distanceKm.toLocaleString('en-US')} كم`
                        : `تُفتح عند ${item.airport.unlockMinutesRequired} دقيقة تركيز`}
                    </div>
                  </div>
                  <div className="text-left shrink-0 mr-3">
                    <div className="text-xs font-mono-tabular font-semibold text-sky-400">
                      {item.airport.code}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatMinutesArabic(item.estimatedMinutes)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Boarding Pass Summary & Launch CTA */}
      <div className="pt-3 border-t border-dashed border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            <span>بطاقة الصعود</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="font-mono-tabular text-slate-200">{flightNumber}</span>
          </div>
          <div>
            <span>الوصول المتوقع</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="font-mono-tabular text-slate-200">{expectedArrivalTime}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 bg-[#0A101F] border border-slate-800 rounded-lg px-4 py-2.5">
          <div>
            <div className="font-mono-tabular text-lg font-bold text-amber-400">{origin.code}</div>
            <div className="text-xs text-slate-400">{origin.cityAr}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-slate-200">
              {formatMinutesArabic(plannedMinutes)}
            </div>
            <div className="text-[11px] font-mono-tabular text-slate-500">
              {distanceKm.toLocaleString('en-US')} كم · {activeVehicle.nameAr}
            </div>
          </div>
          <div className="text-left">
            <div className="font-mono-tabular text-lg font-bold text-sky-400">{destination.code}</div>
            <div className="text-xs text-slate-400">{destination.cityAr}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartFlight}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-slate-950 font-bold text-base transition-all cursor-pointer whitespace-nowrap"
        >
          <PlaneTakeoff className="w-5 h-5" />
          <span>إقلاع الطائرة وبدء الدراسة</span>
        </button>
      </div>
    </div>
  );
};
