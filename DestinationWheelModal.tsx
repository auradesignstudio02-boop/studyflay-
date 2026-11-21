import React, { useMemo, useState } from 'react';
import { Disc3, PlaneTakeoff, RotateCw, X } from 'lucide-react';
import {
  AIRPORTS,
  type Airport,
  calculateDistanceKm,
  type DestinationType,
  estimateFlightMinutes,
  formatMinutesArabic,
  isAirportUnlocked,
  type VehicleType,
} from '../data/airports';
import { aviationAudio } from '../utils/sound';

interface DestinationWheelModalProps {
  isOpen: boolean;
  origin: Airport;
  vehicleType: VehicleType;
  totalCompletedMinutes: number;
  onClose: () => void;
  onConfirmDestination: (airport: Airport, estimatedMinutes: number) => void;
}

const SLICE_COLORS = [
  '#0284C7',
  '#1D4ED8',
  '#0D9488',
  '#7C3AED',
  '#D97706',
  '#0369A1',
  '#2563EB',
  '#0F766E',
  '#6D28D9',
  '#B45309',
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    cx,
    cy,
    'L',
    start.x,
    start.y,
    'A',
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    'Z',
  ].join(' ');
}

export const DestinationWheelModal: React.FC<DestinationWheelModalProps> = ({
  isOpen,
  origin,
  vehicleType,
  totalCompletedMinutes,
  onClose,
  onConfirmDestination,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | DestinationType>('all');
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{
    airport: Airport;
    minutes: number;
    distanceKm: number;
  } | null>(null);

  const wheelAirports = useMemo(() => {
    const eligible = AIRPORTS.filter((a) => {
      if (a.code === origin.code) return false;
      if (!isAirportUnlocked(a, totalCompletedMinutes)) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      return true;
    });
    // Pick up to 10 diverse destinations evenly for a clean, legible wheel
    if (eligible.length <= 10) return eligible;
    const step = eligible.length / 10;
    const picked: Airport[] = [];
    for (let i = 0; i < 10; i++) {
      picked.push(eligible[Math.floor(i * step)]);
    }
    return picked;
  }, [origin.code, totalCompletedMinutes, typeFilter]);

  if (!isOpen) return null;

  const sliceAngle = 360 / Math.max(1, wheelAirports.length);

  const handleSpin = () => {
    if (isSpinning || wheelAirports.length === 0) return;
    setIsSpinning(true);
    setSelectedCandidate(null);

    const winIndex = Math.floor(Math.random() * wheelAirports.length);
    const winningAirport = wheelAirports[winIndex];
    const dist = calculateDistanceKm(origin, winningAirport);
    const mins = estimateFlightMinutes(dist, vehicleType);

    // Pointer is at top (0 deg). Center of slice i is (i + 0.5) * sliceAngle.
    // To align slice center to 0 deg top pointer, rotation mod 360 must equal (360 - centerAngle).
    const centerAngle = (winIndex + 0.5) * sliceAngle;
    const targetMod = (360 - centerAngle + 360) % 360;
    const currentMod = ((rotationDeg % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const extraSpins = 5 * 360;
    const nextRotation = rotationDeg + extraSpins + delta;

    setRotationDeg(nextRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedCandidate({
        airport: winningAirport,
        minutes: mins,
        distanceKm: dist,
      });
      aviationAudio.playBoardingChime();
    }, 3600);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wheel-modal-title"
    >
      <div className="max-w-lg w-full bg-[#111A2E] border border-slate-700 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Disc3 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 id="wheel-modal-title" className="text-lg font-bold text-white">
                عجلة البلدان والوجهات
              </h2>
              <p className="text-xs text-slate-400">
                أدر العجلة لتحديد وجهتك القادمة ومدة الدراسة المطلوبة للوصول إليها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#0A101F] border border-slate-800 rounded-lg">
          {(
            [
              { id: 'all', label: 'الكل' },
              { id: 'city', label: 'مدن' },
              { id: 'island', label: 'جزر' },
              { id: 'space', label: 'فضاء' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={isSpinning}
              onClick={() => {
                setTypeFilter(tab.id);
                setSelectedCandidate(null);
              }}
              className={`py-1.5 px-2 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === tab.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Wheel SVG Canvas */}
        <div className="relative flex flex-col items-center justify-center py-2">
          {/* Top Pointer */}
          <div className="z-10 -mb-2.5">
            <svg width="24" height="20" viewBox="0 0 24 20">
              <polygon points="12,20 2,2 22,2" fill="#F59E0B" stroke="#090F1D" strokeWidth="2" />
            </svg>
          </div>

          <div className="w-64 h-64 sm:w-72 sm:h-72 relative">
            <svg
              viewBox="0 0 300 300"
              className="w-full h-full drop-shadow-xl"
              style={{
                transform: `rotate(${rotationDeg}deg)`,
                transition: isSpinning
                  ? 'transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)'
                  : 'none',
              }}
            >
              <circle cx="150" cy="150" r="146" fill="#090F1D" stroke="#334155" strokeWidth="3" />
              {wheelAirports.map((airport, idx) => {
                const start = idx * sliceAngle;
                const end = start + sliceAngle;
                const mid = start + sliceAngle / 2;
                const textPos = polarToCartesian(150, 150, 96, mid);
                const color = SLICE_COLORS[idx % SLICE_COLORS.length];

                return (
                  <g key={airport.code}>
                    <path
                      d={describeSlice(150, 150, 142, start, end)}
                      fill={color}
                      stroke="#090F1D"
                      strokeWidth="1.5"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill="#FFFFFF"
                      fontSize={wheelAirports.length > 7 ? '10.5' : '12'}
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid}, ${textPos.x}, ${textPos.y})`}
                    >
                      {airport.cityAr}
                    </text>
                  </g>
                );
              })}
              <circle cx="150" cy="150" r="22" fill="#090F1D" stroke="#F59E0B" strokeWidth="3" />
              <circle cx="150" cy="150" r="7" fill="#F59E0B" />
            </svg>
          </div>
        </div>

        {/* Selected Result Banner */}
        {selectedCandidate ? (
          <div className="bg-[#0A101F] border border-sky-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-sky-400 font-medium">تم اختيار وجهتك</div>
              <div className="text-base font-bold text-white mt-0.5">
                {selectedCandidate.airport.cityAr} · {selectedCandidate.airport.countryAr}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                مدة الدراسة المطلوبة للوصول:{' '}
                <span className="text-amber-400 font-semibold">
                  {formatMinutesArabic(selectedCandidate.minutes)}
                </span>{' '}
                ({selectedCandidate.distanceKm.toLocaleString('en-US')} كم)
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onConfirmDestination(selectedCandidate.airport, selectedCandidate.minutes);
                onClose();
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlaneTakeoff className="w-4 h-4" />
              <span>اعتماد الوجهة والإقلاع</span>
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-slate-400">
            {isSpinning ? 'جاري تدوير العجلة واختيار الوجهة...' : 'اضغط على زر التدوير لاختيار بلد ووجهة عشوائية'}
          </div>
        )}

        {/* Spin Button */}
        <button
          type="button"
          disabled={isSpinning || wheelAirports.length === 0}
          onClick={handleSpin}
          className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{selectedCandidate ? 'تدوير العجلة مجدداً' : 'أدر عجلة البلدان الآن'}</span>
        </button>
      </div>
    </div>
  );
};
