import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { type DestinationType, type VehicleType } from './data/airports';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export interface FocusSessionRecord {
  id: string;
  userId: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  destinationCountry: string;
  destinationType: DestinationType;
  vehicleType: VehicleType;
  subject: string;
  flightNumber: string;
  plannedMinutes: number;
  completedMinutes: number;
  distanceKm: number;
  status: 'completed' | 'cancelled';
  startedAt: string;
  endedAt: string;
}

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  homeAirportCode: string;
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function sanitizeIata(raw: string, fallback = 'ALG'): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return cleaned.length === 3 ? cleaned : fallback;
}

function normalizeDestType(raw: unknown): DestinationType {
  if (raw === 'island' || raw === 'space') return raw;
  return 'city';
}

function normalizeVehicleType(raw: unknown): VehicleType {
  if (raw === 'propeller' || raw === 'balloon' || raw === 'concorde') return raw;
  return 'jet';
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function ensureUserProfile(
  user: User,
  defaultHomeAirportCode = 'ALG'
): Promise<UserProfileData> {
  const safeUid = sanitizeId(user.uid);
  const path = `users/${safeUid}`;
  const ref = doc(db, 'users', safeUid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: safeUid,
        displayName: String(data.displayName || user.displayName || 'مسافر التركيز'),
        email: String(data.email || user.email || ''),
        homeAirportCode: sanitizeIata(String(data.homeAirportCode || defaultHomeAirportCode)),
      };
    }

    const displayName = (user.displayName || user.email?.split('@')[0] || 'مسافر التركيز')
      .trim()
      .slice(0, 120);
    const email = (user.email || 'user@example.com').trim().slice(0, 200);
    const homeAirportCode = sanitizeIata(defaultHomeAirportCode);

    await setDoc(ref, {
      uid: safeUid,
      displayName: displayName || 'مسافر التركيز',
      email,
      homeAirportCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      uid: safeUid,
      displayName,
      email,
      homeAirportCode,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateHomeAirportInCloud(
  uid: string,
  homeAirportCode: string
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeCode = sanitizeIata(homeAirportCode);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      homeAirportCode: safeCode,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveFocusSessionToCloud(
  user: User,
  session: Omit<FocusSessionRecord, 'userId'>
): Promise<void> {
  const safeUid = sanitizeId(user.uid);
  const safeId = sanitizeId(session.id);
  const path = `users/${safeUid}/sessions/${safeId}`;

  await ensureUserProfile(user, session.originCode);

  const payload = {
    id: safeId,
    userId: safeUid,
    originCode: sanitizeIata(session.originCode, 'RUH'),
    originCity: (session.originCity || 'الرياض').trim().slice(0, 80),
    destinationCode: sanitizeIata(session.destinationCode, 'IST'),
    destinationCity: (session.destinationCity || 'إسطنبول').trim().slice(0, 80),
    destinationCountry: (session.destinationCountry || 'تركيا').trim().slice(0, 80),
    destinationType: normalizeDestType(session.destinationType),
    vehicleType: normalizeVehicleType(session.vehicleType),
    subject: (session.subject || 'جلسة تركيز عامة').trim().slice(0, 140),
    flightNumber: (session.flightNumber || 'RF101').trim().slice(0, 16),
    plannedMinutes: Math.max(1, Math.min(720, Math.round(session.plannedMinutes))),
    completedMinutes: Math.max(0, Math.min(720, Math.round(session.completedMinutes))),
    distanceKm: Math.max(0, Math.min(25000, Math.round(session.distanceKm))),
    status: session.status === 'cancelled' ? 'cancelled' : 'completed',
    startedAt: session.startedAt.slice(0, 40),
    endedAt: session.endedAt.slice(0, 40),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', safeUid, 'sessions', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteFocusSessionFromCloud(
  uid: string,
  sessionId: string
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeId = sanitizeId(sessionId);
  const path = `users/${safeUid}/sessions/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', safeUid, 'sessions', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToFocusSessions(
  uid: string,
  onData: (sessions: FocusSessionRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}/sessions`;
  const q = query(
    collection(db, 'users', safeUid, 'sessions'),
    where('userId', '==', safeUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: FocusSessionRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id || docSnap.id),
          userId: String(d.userId || safeUid),
          originCode: String(d.originCode || 'RUH'),
          originCity: String(d.originCity || ''),
          destinationCode: String(d.destinationCode || 'IST'),
          destinationCity: String(d.destinationCity || ''),
          destinationCountry: String(d.destinationCountry || ''),
          destinationType: normalizeDestType(d.destinationType),
          vehicleType: normalizeVehicleType(d.vehicleType),
          subject: String(d.subject || 'جلسة تركيز'),
          flightNumber: String(d.flightNumber || 'RF100'),
          plannedMinutes: Number(d.plannedMinutes || 0),
          completedMinutes: Number(d.completedMinutes || 0),
          distanceKm: Number(d.distanceKm || 0),
          status: d.status === 'cancelled' ? 'cancelled' : 'completed',
          startedAt: String(d.startedAt || ''),
          endedAt: String(d.endedAt || ''),
        };
      });
      items.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
