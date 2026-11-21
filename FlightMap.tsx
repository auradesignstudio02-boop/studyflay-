import React, { useEffect, useMemo, useState } from 'react';
import {
  geoGraticule10,
  geoInterpolate,
  geoNaturalEarth1,
  geoPath,
} from 'd3-geo';
import { Compass, Eye, Globe2, Radar, Shield } from 'lucide-react';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import {
  AIRPORTS,
  type Airport,
  calculateDistanceKm,
  computeFlightTelemetry,
  type DestinationType,
  getVehicleById,
  isAirportUnlocked,
  type VehicleType,
} from '../data/airports';

interface FlightMapProps {
  origin: Airport;
  destination: Airport;
  destinationType: DestinationType;
  vehicleType: VehicleType;
  progress: number; // 0 to 1 smooth float
  isFlying: boolean;
  isPaused: boolean;
  totalCompletedMinutes: number;
  onSelectDestination?: (airport: Airport) => void;
  flightNumber: string;
}

type MapDisplayStyle = 'world' | 'atc-radar' | 'cockpit-window';

const MAP_WIDTH = 960;
const MAP_HEIGHT = 480;

const STARS = [
  [65, 42, 1.1], [120, 95, 0.8], [210, 35, 1.3], [310, 68, 0.9], [420, 28, 1.2],
  [540, 52, 0.8], [670, 36, 1.4], [790, 74, 1.0], [880, 48, 1.2], [910, 140, 0.9],
  [48, 190, 1.0], [85, 340, 1.2], [140, 420, 0.9], [840, 380, 1.1], [905, 310, 1.3],
  [760, 435, 0.8], [220, 445, 1.1], [480, 455, 0.9], [610, 448, 1.2], [35, 295, 0.8],
];

export const FlightMap: React.FC<FlightMapProps> = ({
  origin,
  destination,
  destinationType,
  vehicleType,
  progress,
  isFlying,
  isPaused,
  totalCompletedMinutes,
  onSelectDestination,
  flightNumber,
}) => {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapDisplayStyle>('world');

  // Automatically switch to high-contrast ATC radar view on takeoff if in world mode
  useEffect(() => {
    if (isFlying && mapStyle === 'world') {
      setMapStyle('atc-radar');
    } else if (!isFlying && mapStyle === 'atc-radar') {
      setMapStyle('world');
    }
  }, [isFlying]);

  const isSpace = destination.type === 'space' || destinationType === 'space';
  const isIsland = destination.type === 'island' || destinationType === 'island';

  const vehicleConfig = getVehicleById(vehicleType);

  // Styling based on mapStyle: 'world', 'atc-radar' (black & white high contrast radar), 'cockpit-window' (looking out aircraft window)
  const isAtcRadar = mapStyle === 'atc-radar';
  const isCockpitWindow = mapStyle === 'cockpit-window';

  const accentColor = isSpace ? '#C084FC' : isAtcRadar ? '#FFFFFF' : isIsland ? '#2DD4BF' : '#38BDF8';
  const zoomScale = isAtcRadar ? 3.8 : isCockpitWindow ? 4.2 : 1;
  const invScale = 1 / zoomScale;

  const { landPaths, graticulePath, spherePath, projection } = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent(
      [
        [18, 18],
        [MAP_WIDTH - 18, MAP_HEIGHT - 18],
      ],
      { type: 'Sphere' }
    );
    const pathGen = geoPath(proj);

    const topology = worldAtlas as unknown as Parameters<typeof feature>[0] & {
      objects: { countries: Parameters<typeof feature>[1] };
    };
    const geoCountries = feature(topology, topology.objects.countries) as unknown as {
      features: Array<GeoJSON.Feature<GeoJSON.Geometry>>;
    };

    const paths = geoCountries.features.map((f, idx) => ({
      id: f.id ?? idx,
      d: pathGen(f) || '',
    }));

    return {
      landPaths: paths,
      graticulePath: pathGen(geoGraticule10()) || '',
      spherePath: pathGen({ type: 'Sphere' }) || '',
      projection: proj,
    };
  }, []);

  const routeGeometry = useMemo(() => {
    const interpolator = geoInterpolate(origin.coords, destination.coords);
    const totalSteps = 96;
    const allPoints: Array<[number, number]> = [];
    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const pt = projection(interpolator(t));
      if (pt) {
        const liftY = destination.type === 'space' ? -Math.sin(t * Math.PI) * 34 : 0;
        allPoints.push([pt[0], pt[1] + liftY]);
      }
    }

    const clamped = Math.max(0, Math.min(1, progress));
    const currentGeo = interpolator(clamped);
    const basePx = projection(currentGeo) || allPoints[0] || [0, 0];
    const currentLift = destination.type === 'space' ? -Math.sin(clamped * Math.PI) * 34 : 0;
    const currentPx: [number, number] = [basePx[0], basePx[1] + currentLift];

    const tAhead = Math.min(1, clamped + 0.015);
    const tBehind = Math.max(0, clamped - 0.015);
    const aheadBase = projection(interpolator(tAhead)) || basePx;
    const behindBase = projection(interpolator(tBehind)) || basePx;
    const aheadPx: [number, number] = [
      aheadBase[0],
      aheadBase[1] + (destination.type === 'space' ? -Math.sin(tAhead * Math.PI) * 34 : 0),
    ];
    const behindPx: [number, number] = [
      behindBase[0],
      behindBase[1] + (destination.type === 'space' ? -Math.sin(tBehind * Math.PI) * 34 : 0),
    ];

    const dx = aheadPx[0] - behindPx[0];
    const dy = aheadPx[1] - behindPx[1];
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    const fullPathD =
      allPoints.length > 1
        ? `M ${allPoints.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L ')}`
        : '';

    const exactIndex = clamped * totalSteps;
    const activeCount = Math.floor(exactIndex);
    const flownPoints = allPoints.slice(0, activeCount + 1);
    if (clamped > 0 && currentPx) {
      flownPoints.push(currentPx);
    }
    const flownPathD =
      flownPoints.length > 1 && clamped > 0
        ? `M ${flownPoints.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L ')}`
        : '';

    const originPx = projection(origin.coords) || [0, 0];
    const destPx = projection(destination.coords) || [0, 0];

    return {
      fullPathD,
      flownPathD,
      currentPx,
      angleDeg,
      originPx,
      destPx,
    };
  }, [origin, destination, progress, projection]);

  const cameraTransform = useMemo(() => {
    if (mapStyle === 'world') return '';
    const [cx, cy] = routeGeometry.currentPx;
    const tx = MAP_WIDTH / 2 - cx * zoomScale;
    const ty = MAP_HEIGHT / 2 - cy * zoomScale;
    return `translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${zoomScale})`;
  }, [mapStyle, routeGeometry.currentPx, zoomScale]);

  const totalDistanceKm = useMemo(
    () => calculateDistanceKm(origin, destination),
    [origin, destination]
  );
  const coveredKm = Math.round(totalDistanceKm * Math.max(0, Math.min(1, progress)));
  const remainingKm = Math.max(0, totalDistanceKm - coveredKm);

  const telemetry = useMemo(
    () => computeFlightTelemetry(progress, vehicleType, destination.type, isFlying),
    [progress, vehicleType, destination.type, isFlying]
  );

  const flightPhase = useMemo(() => {
    if (!isFlying && progress === 0) return 'جاهز للإقلاع';
    if (isPaused) return 'توقف مؤقت';
    if (progress >= 1) return isSpace ? 'تم الالتحام بنجاح' : 'تم الهبوط بنجاح';
    if (progress < 0.12) return isSpace ? 'الإطلاق المداري' : 'الإقلاع والصعود';
    if (progress < 0.88) return isSpace ? 'العبور المداري' : 'التحليق المستقر';
    return isSpace ? 'الالتحام بالمحطة' : 'الاقتراب والهبوط';
  }, [isFlying, isPaused, progress, isSpace]);

  const airportMarkers = useMemo(() => {
    return AIRPORTS.filter((a) => isAirportUnlocked(a, totalCompletedMinutes)).map((airport) => {
      const px = projection(airport.coords);
      return {
        airport,
        x: px ? px[0] : 0,
        y: px ? px[1] : 0,
      };
    });
  }, [projection, totalCompletedMinutes]);

  const renderVehicleGlyph = () => {
    const vehicleScale = mapStyle !== 'world' ? 1.65 * invScale : 1;

    if (vehicleType === 'balloon') {
      return (
        <g transform={`scale(${vehicleScale}) translate(0, -4)`}>
          <path
            d="M 0 -13 C -7 -13 -10 -7 -8 -1 C -6 3 -3 6 -2 8 L 2 8 C 3 6 6 3 8 -1 C 10 -7 7 -13 0 -13 Z"
            fill={isAtcRadar ? '#FFFFFF' : '#F59E0B'}
            stroke="#000000"
            strokeWidth="0.9"
          />
          <rect x="-2.5" y="11" width="5" height="3.2" rx="0.8" fill={isAtcRadar ? '#CCCCCC' : '#B45309'} stroke="#000000" strokeWidth="0.6" />
        </g>
      );
    }

    if (vehicleType === 'propeller') {
      return (
        <g transform={`scale(${vehicleScale}) rotate(${routeGeometry.angleDeg})`}>
          <path
            d="M 9 0 L 2 -1.6 L 0 -10 L -2.5 -10 L -1.5 -1.4 L -7 -1 L -9.5 -3.8 L -11 -3.8 L -9.5 0 L -11 3.8 L -9.5 3.8 L -7 1 L -1.5 1.4 L -2.5 10 L 0 10 L 2 1.6 Z"
            fill={isAtcRadar ? '#FFFFFF' : '#F8FAFC'}
            stroke="#000000"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          <line x1="10.2" y1="-4.5" x2="10.2" y2="4.5" stroke={isAtcRadar ? '#FFFFFF' : '#38BDF8'} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    }

    if (vehicleType === 'concorde') {
      return (
        <g transform={`scale(${vehicleScale}) rotate(${routeGeometry.angleDeg})`}>
          <path
            d="M 13 0 L -8 -8.5 L -10 -8.5 L -7 -1.2 L -11.5 -3.5 L -12.5 -3.5 L -11 0 L -12.5 3.5 L -11.5 3.5 L -7 1.2 L -10 8.5 L -8 8.5 Z"
            fill={isAtcRadar ? '#FFFFFF' : '#FDE047'}
            stroke="#000000"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
        </g>
      );
    }

    return (
      <g transform={`scale(${vehicleScale}) rotate(${routeGeometry.angleDeg})`}>
        <path
          d="M 10 0 L 3 -1.8 L -4 -9.5 L -6.5 -9.5 L -2.5 -1.6 L -7.5 -1.2 L -10 -4.2 L -11.5 -4.2 L -10 0 L -11.5 4.2 L -10 4.2 L -7.5 1.2 L -2.5 1.6 L -6.5 9.5 L -4 9.5 L 3 1.8 Z"
          fill={isAtcRadar ? '#FFFFFF' : '#F8FAFC'}
          stroke="#000000"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  return (
    <div className="bg-[#111A2E] border border-slate-800 rounded-xl overflow-hidden flex flex-col relative">
      {/* Cockpit Window View Frame Overlay */}
      {isCockpitWindow && (
        <div className="absolute inset-0 pointer-events-none z-20 border-[16px] border-[#0A0E17]/90 rounded-xl shadow-[inset_0_0_50px_rgba(0,0,0,0.85)] flex flex-col justify-between p-4">
          {/* Top Window Curved Bezel Arc */}
          <div className="w-48 h-3 bg-black/60 rounded-full mx-auto border border-white/10 flex items-center justify-center">
            <span className="text-[9px] font-mono text-white/50 tracking-widest">COCKPIT VIEW // WINDOW 3L</span>
          </div>
          {/* Bottom Bezel */}
          <div className="flex items-center justify-between text-[10px] font-mono text-white/40 px-2">
            <span>ALT: {telemetry.altitudeFeet.toLocaleString()} FT</span>
            <span>HDG: {Math.round(routeGeometry.angleDeg + 180)}°</span>
            <span>IAS: {telemetry.speedKmh} KPH</span>
          </div>
        </div>
      )}

      {/* Map Viewport */}
      <div
        className={`relative w-full aspect-[2/1] select-none overflow-hidden transition-colors duration-500 ${
          isAtcRadar
            ? 'bg-[#000000]'
            : isCockpitWindow
            ? 'bg-[#060B14]'
            : isSpace
            ? 'bg-[#040712]'
            : 'bg-[#081020]'
        }`}
      >
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full block"
          role="img"
          aria-label={`خريطة مسار الرحلة من ${origin.cityAr} إلى ${destination.cityAr}`}
        >
          <defs>
            <radialGradient id="oceanGlow" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor={isAtcRadar ? '#050505' : isSpace ? '#0A1026' : isIsland ? '#0F2537' : '#112240'} />
              <stop offset="100%" stopColor={isAtcRadar ? '#000000' : isSpace ? '#030610' : '#080E1C'} />
            </radialGradient>
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Starfield when Space mode is active */}
          {isSpace && !isAtcRadar && (
            <g>
              {STARS.map(([sx, sy, sr], idx) => (
                <circle key={idx} cx={sx} cy={sy} r={sr} fill="#E2E8F0" fillOpacity="0.65" />
              ))}
            </g>
          )}

          {/* Camera-Tracked Moving Map Group */}
          <g transform={cameraTransform}>
            <path
              d={spherePath}
              fill="url(#oceanGlow)"
              stroke={isAtcRadar ? '#222222' : isSpace ? '#312E81' : '#1E293B'}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            <path
              d={graticulePath}
              fill="none"
              stroke={isAtcRadar ? '#1A1A1A' : isSpace ? '#1E1B4B' : '#182847'}
              strokeWidth="0.6"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />

            {/* World Landmasses - Monochrome black & white for ATC Radar */}
            <g>
              {landPaths.map((land) => (
                <path
                  key={land.id}
                  d={land.d}
                  fill={isAtcRadar ? '#111111' : isSpace ? '#141E38' : isIsland ? '#173142' : '#1B2D4D'}
                  stroke={isAtcRadar ? '#333333' : isSpace ? '#312E81' : isIsland ? '#2B5B73' : '#2E4770'}
                  strokeWidth="0.7"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>

            {/* Planned Great Circle Path */}
            {routeGeometry.fullPathD && (
              <path
                d={routeGeometry.fullPathD}
                fill="none"
                stroke={accentColor}
                strokeOpacity={isAtcRadar ? '0.6' : '0.4'}
                strokeWidth={isAtcRadar ? '2' : '1.8'}
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Completed Trail */}
            {routeGeometry.flownPathD && (
              <path
                d={routeGeometry.flownPathD}
                fill="none"
                stroke={accentColor}
                strokeWidth={isAtcRadar ? '3.2' : '2.8'}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter="url(#routeGlow)"
              />
            )}

            {/* Airport Pins */}
            <g>
              {airportMarkers.map(({ airport, x, y }) => {
                const isOrigin = airport.code === origin.code;
                const isDest = airport.code === destination.code;
                if (isOrigin || isDest) return null;

                const matchesType = airport.type === destinationType;
                const isHovered = hoveredCode === airport.code;
                const canClick = !isFlying && Boolean(onSelectDestination);
                const pinColor = isAtcRadar
                  ? '#888888'
                  : airport.type === 'space'
                  ? '#A78BFA'
                  : airport.type === 'island'
                  ? '#2DD4BF'
                  : '#94A3B8';

                return (
                  <g
                    key={airport.code}
                    transform={`translate(${x}, ${y}) scale(${invScale})`}
                    className={canClick ? 'cursor-pointer' : ''}
                    onMouseEnter={() => setHoveredCode(airport.code)}
                    onMouseLeave={() => setHoveredCode(null)}
                    onClick={() => {
                      if (canClick && onSelectDestination) {
                        onSelectDestination(airport);
                      }
                    }}
                  >
                    <circle
                      r={isHovered ? 6 : mapStyle !== 'world' ? 3.5 : matchesType ? 3.6 : 2.5}
                      fill={isHovered ? accentColor : pinColor}
                      fillOpacity={isHovered ? 0.95 : mapStyle !== 'world' ? 0.85 : matchesType ? 0.72 : 0.35}
                    />
                    {canClick && <circle r={11} fill="transparent" />}

                    {mapStyle !== 'world' && !isHovered && (
                      <text
                        x="6"
                        y="3"
                        fill={isAtcRadar ? '#AAAAAA' : '#CBD5E1'}
                        fillOpacity="0.88"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {airport.cityAr}
                      </text>
                    )}

                    {isHovered && (
                      <g transform="translate(0, -14)">
                        <rect
                          x="-56"
                          y="-18"
                          width="112"
                          height="20"
                          rx="4"
                          fill="#000000"
                          stroke={isAtcRadar ? '#FFFFFF' : '#334155'}
                          strokeWidth="0.8"
                        />
                        <text
                          textAnchor="middle"
                          y="-5"
                          fill="#FFFFFF"
                          fontSize="9.5"
                          fontWeight="600"
                        >
                          {airport.cityAr} ({airport.code})
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Origin Marker */}
            <g
              transform={`translate(${routeGeometry.originPx[0]}, ${routeGeometry.originPx[1]}) scale(${invScale})`}
            >
              <circle r="9" fill={isAtcRadar ? '#FFFFFF' : '#F59E0B'} fillOpacity="0.18" />
              <circle r="4.5" fill={isAtcRadar ? '#FFFFFF' : '#F59E0B'} stroke="#000000" strokeWidth="1.5" />
              <g transform="translate(0, 16)">
                <rect
                  x="-26"
                  y="-8"
                  width="52"
                  height="15"
                  rx="3"
                  fill="#000000"
                  fillOpacity="0.9"
                  stroke={isAtcRadar ? '#FFFFFF' : '#F59E0B'}
                  strokeOpacity="0.55"
                  strokeWidth="0.7"
                />
                <text
                  textAnchor="middle"
                  y="2.5"
                  fill={isAtcRadar ? '#FFFFFF' : '#FCD34D'}
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {origin.code}
                </text>
              </g>
            </g>

            {/* Destination Marker */}
            <g
              transform={`translate(${routeGeometry.destPx[0]}, ${routeGeometry.destPx[1]}) scale(${invScale})`}
            >
              <circle r="12" fill={accentColor} fillOpacity="0.2" />
              <circle r="5" fill={accentColor} stroke="#000000" strokeWidth="1.5" />
              <g transform="translate(0, -18)">
                <rect
                  x="-26"
                  y="-9"
                  width="52"
                  height="15"
                  rx="3"
                  fill="#000000"
                  fillOpacity="0.92"
                  stroke={accentColor}
                  strokeOpacity="0.7"
                  strokeWidth="0.7"
                />
                <text
                  textAnchor="middle"
                  y="1.5"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  {destination.code}
                </text>
              </g>
            </g>

            {/* Animated Aircraft */}
            <g transform={`translate(${routeGeometry.currentPx[0]}, ${routeGeometry.currentPx[1]})`}>
              <circle
                r={18 * invScale}
                fill={accentColor}
                fillOpacity={isFlying ? '0.2' : '0.1'}
              />
              {isFlying && (
                <circle
                  r={26 * invScale}
                  fill="none"
                  stroke={accentColor}
                  strokeOpacity="0.4"
                  strokeWidth={1.2 * invScale}
                  strokeDasharray={`${3 * invScale} ${3 * invScale}`}
                />
              )}
              {renderVehicleGlyph()}
            </g>
          </g>
        </svg>

        {/* Top Map Overlay + Map Style Switcher */}
        <div className="absolute top-3 right-4 left-4 flex items-center justify-between gap-3 text-xs text-slate-300 pointer-events-none z-30">
          <div className="bg-[#090F1D]/90 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 pointer-events-auto">
            <span className="font-mono-tabular font-semibold text-sky-400">{flightNumber}</span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="font-medium text-slate-100">
              {origin.cityAr} ← {destination.cityAr}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto bg-[#090F1D]/90 backdrop-blur-sm border border-slate-700 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMapStyle('world')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                mapStyle === 'world' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              خريطة العالم
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('atc-radar')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                mapStyle === 'atc-radar' ? 'bg-white text-black font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radar className="w-3 h-3" />
              <span>رادار مراقب جوي (أبيض وأسود)</span>
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('cockpit-window')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                mapStyle === 'cockpit-window' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>نافذة الطائرة الحقيقية</span>
            </button>
          </div>
        </div>

        {/* HUD In-Flight Bar */}
        {isFlying && (
          <div className="hidden sm:flex absolute bottom-3 right-4 left-4 items-center justify-between bg-[#090F1D]/90 backdrop-blur-sm border border-slate-800/90 rounded-lg px-4 py-2 text-xs pointer-events-none z-30">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400">الارتفاع: </span>
                <span className="font-mono-tabular font-semibold text-slate-100">
                  {telemetry.altitudeFeet.toLocaleString('en-US')} قدم
                </span>
              </div>
              <span className="text-slate-700" aria-hidden="true">|</span>
              <div>
                <span className="text-slate-400">السرعة: </span>
                <span className="font-mono-tabular font-semibold text-sky-400">
                  {telemetry.speedKmh.toLocaleString('en-US')} كم/س
                </span>
              </div>
              <span className="text-slate-700" aria-hidden="true">|</span>
              <div>
                <span className="text-slate-400">الحرارة الخارجية: </span>
                <span className="font-mono-tabular font-semibold text-slate-100">
                  {telemetry.outsideTempC}°C
                </span>
              </div>
            </div>
            <div className="text-slate-300 font-medium">
              {flightPhase}
            </div>
          </div>
        )}
      </div>

      {/* Real Flight Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-800 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-800 bg-[#0E1628]">
        <div className="px-4 py-3">
          <div className="text-xs text-slate-400 mb-0.5">حالة الرحلة</div>
          <div className="text-sm font-semibold text-slate-100">{flightPhase}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-slate-400 mb-0.5">المسافة المقطوعة</div>
          <div className="text-sm font-semibold font-mono-tabular text-sky-400">
            {coveredKm.toLocaleString('en-US')} / {totalDistanceKm.toLocaleString('en-US')} كم
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-slate-400 mb-0.5">المتبقي للوصول</div>
          <div className="text-sm font-semibold font-mono-tabular text-slate-100">
            {remainingKm.toLocaleString('en-US')} كم
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-slate-400 mb-0.5">نسبة الإنجاز</div>
          <div className="text-sm font-semibold font-mono-tabular text-amber-400">
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};
