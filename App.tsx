import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CheckSquare, LogOut, User as UserIcon } from 'lucide-react';
import {
  AIRPORTS,
  type Airport,
  calculateDistanceKm,
  type DestinationType,
  estimateFlightMinutes,
  generateFlightNumber,
  getAirportByCode,
  getDestinationsForDuration,
  isAirportUnlocked,
  type VehicleType,
} from './data/airports';
import {
  auth,
  deleteFocusSessionFromCloud,
  ensureUserProfile,
  type FocusSessionRecord,
  saveFocusSessionToCloud,
  signInWithGoogle,
  signOutUser,
  subscribeToFocusSessions,
  updateHomeAirportInCloud,
} from './firebase';
import { FlightMap } from './components/FlightMap';
import {
  FlightControlPanel,
  type PlanningMode,
} from './components/FlightControlPanel';
import { ArrivalModal } from './components/ArrivalModal';
import { LogbookView } from './components/LogbookView';
import { DestinationWheelModal } from './components/DestinationWheelModal';
import { StudyTaskManager, type StudyTask } from './components/StudyTaskManager';
import { aviationAudio } from './utils/sound';

const GUEST_STORAGE_KEY = 'rf_guest_sessions_v1';
const GUEST_TASKS_KEY = 'rf_guest_tasks_v1';

function loadGuestSessions(): FocusSessionRecord[] {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestSessions(items: FocusSessionRecord[]): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function loadGuestTasks(): StudyTask[] {
  try {
    const raw = localStorage.getItem(GUEST_TASKS_KEY);
    if (!raw) {
      return [
        { id: 't1', title: 'مراجعة فصل الرياضيات الأول', period: 'daily', completed: false, category: 'مذاكرة ودرس', estimatedMinutes: 45, createdAt: new Date().toISOString() },
        { id: 't2', title: 'حل اختبار تجريبي في الفيزياء', period: 'weekly', completed: false, category: 'حل تمارين', estimatedMinutes: 60, createdAt: new Date().toISOString() },
        { id: 't3', title: 'قراءة كتاب الإدارة الذكية للوقت', period: 'monthly', completed: false, category: 'قراءة كتاب', estimatedMinutes: 120, createdAt: new Date().toISOString() },
      ];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestTasks(items: StudyTask[]): void {
  try {
    localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'flight' | 'logbook' | 'tasks'>('flight');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<FocusSessionRecord[]>(() => loadGuestSessions());
  const [tasks, setTasks] = useState<StudyTask[]>(() => loadGuestTasks());
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Flight Planning State
  const [planningMode, setPlanningMode] = useState<PlanningMode>('duration');
  const [originCode, setOriginCode] = useState<string>('ALG');
  const [destinationType, setDestinationType] = useState<DestinationType>('city');
  const [vehicleType, setVehicleType] = useState<VehicleType>('jet');
  const [plannedMinutes, setPlannedMinutes] = useState<number>(60);
  const [destinationCode, setDestinationCode] = useState<string>('IST');
  const [matchCycleIndex, setMatchCycleIndex] = useState<number>(0);
  const [subject, setSubject] = useState<string>('');

  // Active Flight State
  const [isFlying, setIsFlying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60 * 60);
  const [smoothProgress, setSmoothProgress] = useState<number>(0);
  const [ambientSoundOn, setAmbientSoundOn] = useState<boolean>(false);
  const [flightStartedAt, setFlightStartedAt] = useState<string>('');

  // Modals State
  const [wheelOpen, setWheelOpen] = useState(false);
  const [arrivalSummary, setArrivalSummary] = useState<{
    origin: Airport;
    destination: Airport;
    completedMinutes: number;
    distanceKm: number;
    subject: string;
    flightNumber: string;
    previousTotalMinutes: number;
    newTotalMinutes: number;
  } | null>(null);

  const flightEndMsRef = useRef<number>(0);
  const completedLockRef = useRef<boolean>(false);

  const totalCompletedMinutes = useMemo(
    () =>
      sessions
        .filter((s) => s.status === 'completed')
        .reduce((sum, s) => sum + s.completedMinutes, 0),
    [sessions]
  );

  const totalCompletedFlights = useMemo(
    () => sessions.filter((s) => s.status === 'completed').length,
    [sessions]
  );

  const origin = useMemo(() => getAirportByCode(originCode), [originCode]);
  const destination = useMemo(() => getAirportByCode(destinationCode), [destinationCode]);
  const flightNumber = useMemo(
    () => generateFlightNumber(origin.code, destination.code),
    [origin.code, destination.code]
  );

  // Firebase Auth & Cloud Sync Subscription
  useEffect(() => {
    let unsubscribeSessions: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (unsubscribeSessions) {
        unsubscribeSessions();
        unsubscribeSessions = null;
      }

      if (currentUser) {
        setSessionsLoading(true);
        try {
          const profile = await ensureUserProfile(currentUser, originCode);
          if (profile.homeAirportCode) {
            setOriginCode(profile.homeAirportCode);
          }

          // Migrate any guest sessions from localStorage to Firestore
          const guestItems = loadGuestSessions();
          if (guestItems.length > 0) {
            for (const item of guestItems) {
              await saveFocusSessionToCloud(currentUser, item);
            }
            saveGuestSessions([]);
          }

          unsubscribeSessions = subscribeToFocusSessions(
            currentUser.uid,
            (cloudSessions) => {
              setSessions(cloudSessions);
              setSessionsLoading(false);
            },
            () => {
              setSessionsLoading(false);
            }
          );
        } catch {
          setSessionsLoading(false);
        }
      } else {
        setSessions(loadGuestSessions());
        setSessionsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSessions) unsubscribeSessions();
    };
  }, []);

  // Task Handlers
  const handleAddTask = (newTaskData: Omit<StudyTask, 'id' | 'completed' | 'createdAt'>) => {
    const newTask: StudyTask = {
      ...newTaskData,
      id: `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveGuestTasks(updated);
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    saveGuestTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveGuestTasks(updated);
  };

  const handleStartTaskFlight = (taskTitle: string, minutes: number) => {
    setSubject(taskTitle);
    setPlannedMinutes(minutes);
    setActiveTab('flight');
  };

  // Keep matched destination synchronized when changing duration, origin, or destinationType
  const syncMatchedDestination = useCallback(
    (
      nextOriginCode: string,
      nextMinutes: number,
      nextType: DestinationType,
      nextVehicle: VehicleType,
      cycleIdx = 0
    ) => {
      const matches = getDestinationsForDuration(
        nextOriginCode,
        nextMinutes,
        nextType,
        nextVehicle,
        totalCompletedMinutes
      );
      if (matches.length > 0) {
        const picked = matches[cycleIdx % Math.min(matches.length, 4)];
        setDestinationCode(picked.airport.code);
      }
    },
    [totalCompletedMinutes]
  );

  const handleChangeOrigin = (code: string) => {
    setOriginCode(code);
    if (user) {
      void updateHomeAirportInCloud(user.uid, code);
    }
    if (code === destinationCode || planningMode === 'duration') {
      syncMatchedDestination(code, plannedMinutes, destinationType, vehicleType, 0);
      setMatchCycleIndex(0);
    }
  };

  const handleChangeDestinationType = (nextType: DestinationType) => {
    setDestinationType(nextType);
    setMatchCycleIndex(0);
    if (planningMode === 'duration') {
      syncMatchedDestination(originCode, plannedMinutes, nextType, vehicleType, 0);
    } else {
      const firstMatch = AIRPORTS.find(
        (a) =>
          a.code !== originCode &&
          a.type === nextType &&
          isAirportUnlocked(a, totalCompletedMinutes)
      );
      if (firstMatch) {
        setDestinationCode(firstMatch.code);
        const dist = calculateDistanceKm(origin, firstMatch);
        setPlannedMinutes(estimateFlightMinutes(dist, vehicleType));
      }
    }
  };

  const handleChangeVehicleType = (nextVehicle: VehicleType) => {
    setVehicleType(nextVehicle);
    if (planningMode === 'destination') {
      const dist = calculateDistanceKm(origin, destination);
      setPlannedMinutes(estimateFlightMinutes(dist, nextVehicle));
    } else {
      syncMatchedDestination(
        originCode,
        plannedMinutes,
        destinationType,
        nextVehicle,
        matchCycleIndex
      );
    }
  };

  const handleChangePlannedMinutes = (mins: number) => {
    setPlannedMinutes(mins);
    setMatchCycleIndex(0);
    syncMatchedDestination(originCode, mins, destinationType, vehicleType, 0);
  };

  const handleCycleSuggestedDestination = () => {
    const nextIdx = (matchCycleIndex + 1) % 4;
    setMatchCycleIndex(nextIdx);
    syncMatchedDestination(originCode, plannedMinutes, destinationType, vehicleType, nextIdx);
  };

  const handleSelectDestination = (airport: Airport, updateDuration = false) => {
    if (airport.code === originCode) return;
    if (!isAirportUnlocked(airport, totalCompletedMinutes)) return;
    setDestinationCode(airport.code);
    setDestinationType(airport.type);
    if (updateDuration) {
      const dist = calculateDistanceKm(origin, airport);
      setPlannedMinutes(estimateFlightMinutes(dist, vehicleType));
    }
  };

  const handleWheelConfirm = (airport: Airport, estimatedMinutes: number) => {
    setDestinationCode(airport.code);
    setDestinationType(airport.type);
    setPlannedMinutes(estimatedMinutes);
    setPlanningMode('destination');
  };

  const persistSession = useCallback(
    async (record: Omit<FocusSessionRecord, 'userId'>) => {
      if (user) {
        await saveFocusSessionToCloud(user, record);
      } else {
        const fullRecord: FocusSessionRecord = {
          ...record,
          userId: 'guest',
        };
        const updated = [fullRecord, ...loadGuestSessions()];
        saveGuestSessions(updated);
        setSessions(updated);
      }
    },
    [user]
  );

  const completeFlight = useCallback(async () => {
    if (completedLockRef.current) return;
    completedLockRef.current = true;

    aviationAudio.stopCabinAmbient();
    aviationAudio.playArrivalChime();
    setAmbientSoundOn(false);
    setIsFlying(false);
    setIsPaused(false);
    setRemainingSeconds(0);
    setSmoothProgress(1);

    const distKm = calculateDistanceKm(origin, destination);
    const prevTotal = totalCompletedMinutes;
    const newTotal = prevTotal + plannedMinutes;
    const cleanSubject = subject.trim() || 'جلسة دراسة وتركيز عميق';

    const record: Omit<FocusSessionRecord, 'userId'> = {
      id: `flt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      originCode: origin.code,
      originCity: origin.cityAr,
      destinationCode: destination.code,
      destinationCity: destination.cityAr,
      destinationCountry: destination.countryAr,
      destinationType: destination.type,
      vehicleType,
      subject: cleanSubject,
      flightNumber,
      plannedMinutes,
      completedMinutes: plannedMinutes,
      distanceKm: distKm,
      status: 'completed',
      startedAt: flightStartedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
    };

    setArrivalSummary({
      origin,
      destination,
      completedMinutes: plannedMinutes,
      distanceKm: distKm,
      subject: cleanSubject,
      flightNumber,
      previousTotalMinutes: prevTotal,
      newTotalMinutes: newTotal,
    });

    await persistSession(record);
  }, [
    origin,
    destination,
    plannedMinutes,
    subject,
    flightNumber,
    vehicleType,
    flightStartedAt,
    totalCompletedMinutes,
    persistSession,
  ]);

  // Accurate timestamp-based countdown ticker + 60fps smooth map interpolation
  useEffect(() => {
    if (!isFlying || isPaused) {
      document.title = 'رحلة تركيز — مؤقت دراسي عبر خريطة الطيران';
      return;
    }

    const totalMs = Math.max(1, plannedMinutes * 60 * 1000);
    let rafId = 0;

    const frame = () => {
      const diffMs = flightEndMsRef.current - Date.now();
      const nextSec = Math.max(0, Math.ceil(diffMs / 1000));
      const nextProg = Math.max(0, Math.min(1, 1 - diffMs / totalMs));
      setSmoothProgress(nextProg);

      setRemainingSeconds((prev) => {
        if (prev !== nextSec) {
          const mins = Math.floor(nextSec / 60);
          const secs = nextSec % 60;
          document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} · ${destination.cityAr} — رحلة تركيز`;
        }
        return nextSec;
      });

      if (diffMs <= 0) {
        void completeFlight();
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isFlying, isPaused, plannedMinutes, destination.cityAr, completeFlight]);

  const handleStartFlight = () => {
    completedLockRef.current = false;
    const totalSecs = plannedMinutes * 60;
    flightEndMsRef.current = Date.now() + totalSecs * 1000;
    setRemainingSeconds(totalSecs);
    setSmoothProgress(0);
    setFlightStartedAt(new Date().toISOString());
    setIsFlying(true);
    setIsPaused(false);
    setArrivalSummary(null);
    aviationAudio.playBoardingChime();
  };

  const handleTogglePause = () => {
    if (!isFlying) return;
    if (isPaused) {
      const remainingMs = (1 - smoothProgress) * plannedMinutes * 60 * 1000;
      flightEndMsRef.current = Date.now() + Math.max(0, remainingMs);
      setIsPaused(false);
      if (ambientSoundOn) aviationAudio.startCabinAmbient();
    } else {
      const diffMs = flightEndMsRef.current - Date.now();
      const totalMs = Math.max(1, plannedMinutes * 60 * 1000);
      setRemainingSeconds(Math.max(0, Math.ceil(diffMs / 1000)));
      setSmoothProgress(Math.max(0, Math.min(1, 1 - diffMs / totalMs)));
      setIsPaused(true);
      aviationAudio.stopCabinAmbient();
    }
  };

  const handleEndFlightEarly = async () => {
    aviationAudio.stopCabinAmbient();
    setAmbientSoundOn(false);
    setIsFlying(false);
    setIsPaused(false);
    setSmoothProgress(0);

    const totalSecs = plannedMinutes * 60;
    const elapsedMinutes = Math.max(
      0,
      Math.round((totalSecs - remainingSeconds) / 60)
    );
    const distKm = calculateDistanceKm(origin, destination);

    const record: Omit<FocusSessionRecord, 'userId'> = {
      id: `flt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      originCode: origin.code,
      originCity: origin.cityAr,
      destinationCode: destination.code,
      destinationCity: destination.cityAr,
      destinationCountry: destination.countryAr,
      destinationType: destination.type,
      vehicleType,
      subject: subject.trim() || 'جلسة دراسة غير مكتملة',
      flightNumber,
      plannedMinutes,
      completedMinutes: elapsedMinutes,
      distanceKm: Math.round(distKm * ((totalSecs - remainingSeconds) / Math.max(1, totalSecs))),
      status: 'cancelled',
      startedAt: flightStartedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
    };

    setRemainingSeconds(plannedMinutes * 60);
    await persistSession(record);
  };

  const handleToggleAmbientSound = () => {
    if (ambientSoundOn) {
      aviationAudio.stopCabinAmbient();
      setAmbientSoundOn(false);
    } else {
      aviationAudio.startCabinAmbient();
      setAmbientSoundOn(true);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (user) {
      await deleteFocusSessionFromCloud(user.uid, sessionId);
    } else {
      const next = loadGuestSessions().filter((s) => s.id !== sessionId);
      saveGuestSessions(next);
      setSessions(next);
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch {
      setAuthError('تعذّر إتمام تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const flightProgress = isFlying ? smoothProgress : 0;

  return (
    <div className="min-h-screen bg-[#090F1D] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-slate-800/90 bg-[#090F1D]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('flight')}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            رحلة تركيز
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('flight')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'flight'
                  ? 'text-sky-400 border-sky-400'
                  : 'text-slate-400 border-transparent hover:text-slate-100'
              }`}
            >
              مؤقت الرحلة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'text-sky-400 border-sky-400'
                  : 'text-slate-400 border-transparent hover:text-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>مهام المذاكرة</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logbook')}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'logbook'
                  ? 'text-sky-400 border-sky-400'
                  : 'text-slate-400 border-transparent hover:text-slate-100'
              }`}
            >
              سجل التركيز
            </button>
            <button
              type="button"
              disabled={isFlying}
              onClick={() => {
                setActiveTab('flight');
                setWheelOpen(true);
              }}
              className="hidden sm:inline-block py-1 whitespace-nowrap shrink-0 border-b-2 border-transparent text-slate-400 hover:text-amber-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              عجلة البلدان
            </button>
          </nav>

          {/* Zone 3: 1 primary auth action */}
          <div className="flex items-center gap-3 shrink-0">
            {!authReady ? (
              <div className="h-9 w-28 bg-slate-800/60 rounded-lg animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-300 max-w-[160px] truncate">
                  <UserIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{user.displayName || user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/60 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                تسجيل الدخول للمزامنة
              </button>
            )}
          </div>
        </div>
      </header>

      {authError && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="underline cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'flight' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Map Viewport (8 columns on desktop) */}
            <div className="lg:col-span-8 space-y-4">
              <FlightMap
                origin={origin}
                destination={destination}
                destinationType={destinationType}
                vehicleType={vehicleType}
                progress={flightProgress}
                isFlying={isFlying}
                isPaused={isPaused}
                totalCompletedMinutes={totalCompletedMinutes}
                onSelectDestination={(airport) => handleSelectDestination(airport, true)}
                flightNumber={flightNumber}
              />

              {/* Subtle Destination Context Bar */}
              <div className="bg-[#111A2E] border border-slate-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <div>
                  <span className="text-slate-400">الوجهة المحددة: </span>
                  <span className="font-semibold text-white">
                    {destination.cityAr}، {destination.countryAr}
                  </span>
                  <span className="text-slate-500 mx-2" aria-hidden="true">·</span>
                  <span className="text-xs text-slate-400">{destination.landmark}</span>
                </div>
                <div className="text-xs font-mono-tabular text-slate-400 shrink-0">
                  {totalCompletedFlights} رحلة مكتملة · {Math.round(totalCompletedMinutes / 60 * 10) / 10} ساعة تركيز
                </div>
              </div>
            </div>

            {/* Flight Dispatcher & Timer Panel (4 columns on desktop) */}
            <div className="lg:col-span-4">
              <FlightControlPanel
                planningMode={planningMode}
                onChangePlanningMode={setPlanningMode}
                destinationType={destinationType}
                onChangeDestinationType={handleChangeDestinationType}
                vehicleType={vehicleType}
                onChangeVehicleType={handleChangeVehicleType}
                origin={origin}
                onChangeOrigin={handleChangeOrigin}
                destination={destination}
                onSelectDestination={handleSelectDestination}
                plannedMinutes={plannedMinutes}
                onChangePlannedMinutes={handleChangePlannedMinutes}
                subject={subject}
                onChangeSubject={setSubject}
                flightNumber={flightNumber}
                isFlying={isFlying}
                isPaused={isPaused}
                remainingSeconds={remainingSeconds}
                ambientSoundOn={ambientSoundOn}
                totalCompletedMinutes={totalCompletedMinutes}
                onToggleAmbientSound={handleToggleAmbientSound}
                onStartFlight={handleStartFlight}
                onTogglePause={handleTogglePause}
                onEndFlightEarly={handleEndFlightEarly}
                onCycleSuggestedDestination={handleCycleSuggestedDestination}
                onOpenWheel={() => setWheelOpen(true)}
              />
            </div>
          </div>
        ) : activeTab === 'tasks' ? (
          <StudyTaskManager
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onStartTaskFlight={handleStartTaskFlight}
          />
        ) : (
          <LogbookView
            sessions={sessions}
            isLoading={sessionsLoading}
            isSignedIn={Boolean(user)}
            onSignIn={handleSignIn}
            onDeleteSession={handleDeleteSession}
            onStartFirstFlight={() => setActiveTab('flight')}
          />
        )}
      </main>

      {/* Country Wheel Modal */}
      <DestinationWheelModal
        isOpen={wheelOpen}
        origin={origin}
        vehicleType={vehicleType}
        totalCompletedMinutes={totalCompletedMinutes}
        onClose={() => setWheelOpen(false)}
        onConfirmDestination={handleWheelConfirm}
      />

      {/* Arrival Motivation & Rewards Modal */}
      <ArrivalModal
        isOpen={Boolean(arrivalSummary)}
        origin={arrivalSummary?.origin || origin}
        destination={arrivalSummary?.destination || destination}
        completedMinutes={arrivalSummary?.completedMinutes || plannedMinutes}
        distanceKm={arrivalSummary?.distanceKm || 0}
        subject={arrivalSummary?.subject || ''}
        flightNumber={arrivalSummary?.flightNumber || flightNumber}
        totalCompletedFlights={totalCompletedFlights}
        previousTotalMinutes={arrivalSummary?.previousTotalMinutes || 0}
        newTotalMinutes={arrivalSummary?.newTotalMinutes || 0}
        isSignedIn={Boolean(user)}
        onSignIn={handleSignIn}
        onNewFlight={() => {
          setArrivalSummary(null);
          setRemainingSeconds(plannedMinutes * 60);
        }}
        onOpenLogbook={() => {
          setArrivalSummary(null);
          setActiveTab('logbook');
        }}
      />
    </div>
  );
}
