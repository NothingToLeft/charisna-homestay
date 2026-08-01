import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type Auth,
  type User
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG_KEY } from '../core/constants';
import type { FirebaseRuntimeConfig } from '../core/types';

interface FirebaseContext {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

let contextPromise: Promise<FirebaseContext | null> | null = null;

export const getSavedFirebaseConfig = (): FirebaseRuntimeConfig | null => {
  const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FirebaseRuntimeConfig;
  } catch {
    return null;
  }
};

export const isFirebaseConfigComplete = (config: Partial<FirebaseRuntimeConfig> | null): config is FirebaseRuntimeConfig =>
  Boolean(config?.apiKey && config.authDomain && config.projectId && config.appId);

export const saveFirebaseConfig = async (config: FirebaseRuntimeConfig): Promise<void> => {
  if (!isFirebaseConfigComplete(config)) throw new Error('Konfigurasi Firebase belum lengkap.');
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  await resetFirebaseContext();
};

export const removeFirebaseConfig = async (): Promise<void> => {
  localStorage.removeItem(FIREBASE_CONFIG_KEY);
  await resetFirebaseContext();
};

const resetFirebaseContext = async (): Promise<void> => {
  contextPromise = null;
  const app = getApps().find((item) => item.name === 'management-runtime');
  if (app) {
    try {
      await deleteApp(app);
    } catch {
      // A reload will clean up any lingering Firebase instance.
    }
  }
};

export const getFirebaseContext = async (): Promise<FirebaseContext | null> => {
  if (contextPromise) return contextPromise;
  contextPromise = (async () => {
    const config = getSavedFirebaseConfig();
    if (!isFirebaseConfigComplete(config)) return null;
    const existing = getApps().find((item) => item.name === 'management-runtime');
    const app = existing ?? initializeApp(config, 'management-runtime');
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    return { app, auth, firestore: getFirestore(app) };
  })();
  return contextPromise;
};

export const subscribeToAuth = (listener: (user: User | null) => void): (() => void) => {
  let unsubscribe = () => undefined;
  void getFirebaseContext().then((context) => {
    if (!context) {
      listener(null);
      return;
    }
    unsubscribe = onAuthStateChanged(context.auth, listener);
  });
  return () => unsubscribe();
};

export const registerWithEmail = async (email: string, password: string): Promise<User> => {
  const context = await getFirebaseContext();
  if (!context) throw new Error('Konfigurasi Firebase belum disimpan.');
  return (await createUserWithEmailAndPassword(context.auth, email.trim(), password)).user;
};

export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  const context = await getFirebaseContext();
  if (!context) throw new Error('Konfigurasi Firebase belum disimpan.');
  return (await signInWithEmailAndPassword(context.auth, email.trim(), password)).user;
};

export const logoutCloud = async (): Promise<void> => {
  const context = await getFirebaseContext();
  if (context) await signOut(context.auth);
};

export const changeCloudPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const context = await getFirebaseContext();
  const user = context?.auth.currentUser;
  if (!context || !user?.email) throw new Error('Silakan masuk ke akun cloud terlebih dahulu.');
  await signInWithEmailAndPassword(context.auth, user.email, currentPassword);
  if (!context.auth.currentUser) throw new Error('Sesi cloud tidak tersedia.');
  await updatePassword(context.auth.currentUser, newPassword);
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  const context = await getFirebaseContext();
  if (!context) throw new Error('Konfigurasi Firebase belum disimpan.');
  await sendPasswordResetEmail(context.auth, email.trim());
};

export const getCurrentCloudUser = async (): Promise<User | null> => {
  const context = await getFirebaseContext();
  return context?.auth.currentUser ?? null;
};
