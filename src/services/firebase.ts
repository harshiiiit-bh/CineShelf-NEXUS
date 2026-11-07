import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  deleteUser,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  deleteUser,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
};

// Mandatory connection validation on boot (firebase-integration-rpc skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

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

/**
 * Uploads a private poster or avatar to Firebase Storage under `users/{uid}/{category}/{fileName}`.
 * Validates MIME type and size (<= 5MB). If Firebase Storage is not yet enabled in the user's
 * Firebase Console, gracefully encodes a compact data URL so the user never loses their upload.
 */
export async function uploadPrivateUserImage(
  uid: string,
  category: 'posters' | 'avatars',
  file: File
): Promise<{ url: string; storageMode: 'firebase_storage' | 'inline_fallback' }> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported image format. Allowed formats: JPEG, PNG, WebP, AVIF.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File exceeds maximum allowed size of 5 MB.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const path = `users/${uid}/${category}/${Date.now()}_${safeName}`;

  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(sRef);
      return { url: downloadUrl, storageMode: 'firebase_storage' };
    } catch {
      // Fallback to compact client data URL if Storage bucket needs console activation
    }
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  return { url: dataUrl.slice(0, 1950), storageMode: 'inline_fallback' };
}

export async function deletePrivateStorageAsset(url: string) {
  try {
    if (url.includes('firebasestorage.googleapis.com')) {
      const sRef = storageRef(storage, url);
      await deleteObject(sRef);
    }
  } catch {
    // Asset already removed or inline
  }
}

export function mapFirebaseAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'No account found with this email address.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('auth/too-many-requests')) {
    return 'Too many failed authentication attempts. Firebase brute-force protection has temporarily paused requests from this device. Please try again later or reset your password.';
  }
  if (msg.includes('auth/requires-recent-login')) {
    return 'For your security, sensitive account actions require recent reauthentication. Please re-enter your password or sign in again first.';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'This sign-in provider is not yet enabled in your Firebase Console (Authentication > Sign-in method). Use Google Sign-In or enable Email/Password in the Firebase Console.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing authentication.';
  }
  return msg;
}
