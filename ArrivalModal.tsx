import React, { useMemo } from 'react';
import { Award, CheckCircle2, Cloud, Compass, PlaneLanding, Unlock } from 'lucide-react';
import { motion } from 'motion/react';
import {
  AIRPORTS,
  type Airport,
  formatMinutesArabic,
  getDurationMotivation,
  VEHICLES,
} from '../data/airports';

interface ArrivalModalProps {
  isOpen: boolean;
  origin: Airport;
  destination: Airport;
  completedMinutes: number;
  distanceKm: number;
  subject: string;
  flightNumber: string;
  totalCompletedFlights: number;
  previousTotalMinutes: number;
  newTotalMinutes: number;
  isSignedIn: boolean;
  onSignIn: () => void;
  onNewFlight: () => void;
  onOpenLogbook: () => void;
}

const CONFETTI_PIECES = [
  { x: -120, y: -90, color: '#38BDF8', rotate: 45 },
  { x: -85, y: -130, color: '#F59E0B', rotate: -30 },
  { x: -40, y: -115, color: '#34D399', rotate: 75 },
  { x: 0, y: -140, color: '#A78BFA', rotate: -60 },
  { x: 45, y: -120, color: '#38BDF8', rotate: 25 },
  { x: 90, y: -125, color: '#F59E0B', rotate: -45 },
  { x: 125, y: -85, color: '#34D399', rotate: 60 },
  { x: -105, y: -45, color: '#F472B6', rotate: -20 },
  { x: 110, y: -40, color: '#A78BFA', rotate: 50 },
];

export const ArrivalModal: React.FC<ArrivalModalProps> = ({
  isOpen,
  origin,
  destination,
  completedMinutes,
  distanceKm,
  subject,
  flightNumber,
  totalCompletedFlights,
  previousTotalMinutes,
  newTotalMinutes,
  isSignedIn,
  onSignIn,
  onNewFlight,
  onOpenLogbook,
}) => {
  const newlyUnlockedRewards = useMemo(() => {
    const items: Array<{ label: string; detail: string }> = [];
    VEHICLES.forEach((v) => {
      if (
        v.unlockMinutesRequired > 0 &&
        previousTotalMinutes < v.unlockMinutesRequired &&
        newTotalMinutes >= v.unlockMinutesRequired
      ) {
        items.push({
          label: `فتح طائرة جديدة: ${v.nameAr}`,
          detail: v.subtitleAr,
        });
      }
    });
    AIRPORTS.forEach((a) => {
      if (
        a.unlockMinutesRequired &&
        previousTotalMinutes < a.unlockMinutesRequired &&
        newTotalMinutes >= a.unlockMinutesRequired
      ) {
        items.push({
          label: `فتح وجهة جديدة: ${a.cityAr} (${a.code})`,
          detail: a.landmark,
        });
      }
    });
    return items;
  }, [previousTotalMinutes, newTotalMinutes]);

  if (!isOpen) return null;

  const todayFormatted = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const durationMessage = getDurationMotivation(completedMinutes);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arrival-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg w-full bg-[#111A2E] border border-slate-700 rounded-2xl p-6 sm:p-8 space-y-5 relative overflow-hidden"
      >
        {/* Celebratory Confetti Burst */}
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2">
          {CONFETTI_PIECES.map((piece, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.5, rotate: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: piece.x,
                y: piece.y,
                scale: [0.6, 1.1, 0.8],
                rotate: piece.rotate * 3,
              }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: idx * 0.03 }}
              className="absolute w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: piece.color }}
            />
          ))}
        </div>

        {/* Top Celebration Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>اكتملت الرحلة الدراسية بنجاح</span>
            </div>
            <h2 id="arrival-title" className="text-2xl font-bold text-white">
              أهلاً بك في {destination.cityAr}
            </h2>
            <p className="text-xs text-slate-400">
              {origin.cityAr} ({origin.code}) ← {destination.cityAr} ({destination.code}) · {destination.landmark}
            </p>
          </div>

          <motion.div
            initial={{ scale: 1.4, opacity: 0, rotate: -25 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 w-24 h-24 rounded-full border-2 border-dashed border-sky-400/70 bg-sky-500/10 flex flex-col items-center justify-center select-none"
          >
            <span className="text-[10px] text-sky-300 font-medium">ختم الوصول</span>
            <span className="font-mono-tabular text-xl font-bold text-sky-400 tracking-wider">
              {destination.code}
            </span>
            <span className="font-mono-tabular text-[9px] text-slate-300">{flightNumber}</span>
          </motion.div>
        </div>

        {/* Duration-Tailored Motivational Quote */}
        <div className="bg-[#0B1222] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <Award className="w-4 h-4" />
            <span>رسالة تحفيزية عند الوصول</span>
          </div>
          <p className="text-sm text-sky-200 leading-relaxed font-medium">
            {durationMessage}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {destination.arrivalQuote}
          </p>
          {subject.trim() && (
            <div className="text-xs text-slate-400 pt-1">
              المهمة المنجزة: <span className="text-slate-200">{subject}</span>
            </div>
          )}
        </div>

        {/* Newly Unlocked Rewards */}
        {newlyUnlockedRewards.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Unlock className="w-4 h-4" />
              <span>مكافآت جديدة تم فتحها!</span>
            </div>
            <div className="space-y-1.5">
              {newlyUnlockedRewards.map((reward, idx) => (
                <div key={idx} className="text-xs text-slate-100">
                  <span className="font-semibold">{reward.label}</span>
                  <span className="text-slate-400"> · {reward.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flight Summary Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[#0B1222] border border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">مدة التركيز</div>
            <div className="text-sm sm:text-base font-bold font-mono-tabular text-sky-400">
              {formatMinutesArabic(completedMinutes)}
            </div>
          </div>
          <div className="bg-[#0B1222] border border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">المسافة</div>
            <div className="text-sm sm:text-base font-bold font-mono-tabular text-slate-100">
              {distanceKm.toLocaleString('en-US')} كم
            </div>
          </div>
          <div className="bg-[#0B1222] border border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">إجمالي الرحلات</div>
            <div className="text-sm sm:text-base font-bold font-mono-tabular text-amber-400">
              {totalCompletedFlights}
            </div>
          </div>
        </div>

        {/* Cloud Sync Status */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <Cloud className={`w-4 h-4 ${isSignedIn ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>
              {isSignedIn
                ? `تمت مزامنة السجل سحابياً · ${todayFormatted}`
                : 'محفوظ محلياً على هذا الجهاز'}
            </span>
          </div>
          {!isSignedIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="text-sky-400 hover:text-sky-300 font-medium cursor-pointer whitespace-nowrap"
            >
              تسجيل الدخول للمزامنة
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onNewFlight}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <PlaneLanding className="w-4 h-4" />
            <span>رحلة دراسية جديدة</span>
          </button>
          <button
            type="button"
            onClick={onOpenLogbook}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span>عرض سجل التركيز والأختام</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
