import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  FieldValue,
} from 'firebase/firestore';
import { auth, db } from './config';
import { User } from '@/types';

// Add a flag to track if persistence has been set
let persistenceSet = false;

// Setup auth persistence to persist between refreshes
export const setupAuthPersistence = async () => {
  if (persistenceSet) return;

  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('Firebase Auth persistence set to LOCAL');
    persistenceSet = true;
  } catch (error) {
    console.error('Error setting auth persistence:', error);
  }
};

// Type extension for Firestore data to handle timestamps
interface UserFirestore extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: FieldValue | Date | string;
  updatedAt: FieldValue | Date | string;
}

// Register a new user with email and password
export const registerWithEmailPassword = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  // Ensure persistence is set
  await setupAuthPersistence();

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update the user profile with display name
    await updateProfile(user, {
      displayName,
    });

    // Create a user document in Firestore
    const userData: UserFirestore = {
      email: user.email as string,
      displayName: displayName,
      photoURL: user.photoURL || '',
      status: 'online',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    return {
      id: user.uid,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw error;
  }
};

// Sign in with email and password
export const loginWithEmailPassword = async (
  email: string,
  password: string
): Promise<User> => {
  // Ensure persistence is set
  await setupAuthPersistence();

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update user status to online
    await setDoc(
      doc(db, 'users', user.uid),
      {
        status: 'online',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data() as UserFirestore;
      return {
        id: user.uid,
        ...userData,
        createdAt: userData.createdAt
          ? userData.createdAt.toString()
          : new Date().toISOString(),
        updatedAt: userData.updatedAt
          ? userData.updatedAt.toString()
          : new Date().toISOString(),
      };
    } else {
      throw new Error('User data not found');
    }
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const loginWithGoogle = async (): Promise<User> => {
  // Ensure persistence is set
  await setupAuthPersistence();

  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      // Create a new user document
      const userData: UserFirestore = {
        email: user.email as string,
        displayName: user.displayName as string,
        photoURL: user.photoURL || '',
        status: 'online',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
    } else {
      // Update user status to online
      await setDoc(
        doc(db, 'users', user.uid),
        {
          status: 'online',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Get updated user data
    const updatedUserDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = updatedUserDoc.data() as UserFirestore;

    return {
      id: user.uid,
      ...userData,
      createdAt: userData.createdAt
        ? userData.createdAt.toString()
        : new Date().toISOString(),
      updatedAt: userData.updatedAt
        ? userData.updatedAt.toString()
        : new Date().toISOString(),
    };
  } catch (error) {
    throw error;
  }
};

// Sign out
export const logoutUser = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;

    if (currentUser) {
      // Update user status to offline
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          status: 'offline',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Convert Firebase user to app User
export const mapFirebaseUser = async (
  firebaseUser: FirebaseUser
): Promise<User> => {
  console.log(`Mapping Firebase user to app user: ${firebaseUser.uid}`);

  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

  if (userDoc.exists()) {
    console.log(`Found existing user document for ${firebaseUser.uid}`);
    const userData = userDoc.data() as UserFirestore;
    return {
      id: firebaseUser.uid,
      ...userData,
      createdAt: userData.createdAt
        ? userData.createdAt.toString()
        : new Date().toISOString(),
      updatedAt: userData.updatedAt
        ? userData.updatedAt.toString()
        : new Date().toISOString(),
    };
  }

  // If user document doesn't exist, create a minimal one
  console.log(`No user document found for ${firebaseUser.uid}, creating one`);
  const userData: UserFirestore = {
    email: firebaseUser.email as string,
    displayName:
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    photoURL: firebaseUser.photoURL || '',
    status: 'online',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    console.log(`Created new user document for ${firebaseUser.uid}`);
  } catch (error) {
    console.error(
      `Error creating user document for ${firebaseUser.uid}:`,
      error
    );
  }

  return {
    id: firebaseUser.uid,
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

let authListenerActive = false;
let authListenerCleanup: (() => void) | null = null;
// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  console.log('Setting up Firebase auth state listener');

  if (authListenerActive && authListenerCleanup) {
    console.log('Auth listener already active, reusing instance');
    return authListenerCleanup;
  }

  authListenerActive = true;

  // Track the last user ID to prevent duplicate updates
  let lastUserId: string | null = null;
  let isFirstUpdate = true;

  // Create a debounced version of the callback to prevent rapid updates
  let debounceTimer: NodeJS.Timeout | null = null;

  const debouncedCallback = (user: User | null) => {
    // Clear any existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // Don't update if user ID hasn't changed (except for the first update)
    const currentUserId = user?.id || null;
    if (!isFirstUpdate && currentUserId === lastUserId) {
      console.log(
        `Auth state unchanged, skipping duplicate callback for user: ${
          lastUserId || 'null'
        }`
      );
      return;
    }

    // Set a slight delay to batch potential rapid updates
    debounceTimer = setTimeout(() => {
      console.log(
        `Calling auth callback with ${user ? `user ${user.id}` : 'null'}`
      );
      lastUserId = currentUserId;
      isFirstUpdate = false;
      callback(user);
    }, 100);
  };

  // Set up auth persistence first
  setupAuthPersistence().catch((error) => {
    console.error('Error setting up auth persistence:', error);
  });

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    console.log(
      `Auth state changed: ${firebaseUser ? 'User logged in' : 'No user'}`
    );

    if (firebaseUser) {
      try {
        console.log(`Mapping Firebase user: ${firebaseUser.uid}`);
        const user = await mapFirebaseUser(firebaseUser);
        console.log(`Successfully mapped user: ${user.id}`);
        debouncedCallback(user);
      } catch (error) {
        console.error('Error mapping Firebase user:', error);
        debouncedCallback(null);
      }
    } else {
      console.log('No user, calling callback with null');
      debouncedCallback(null);
    }
  });

  authListenerCleanup = () => {
    unsubscribe();
    authListenerActive = false;
    authListenerCleanup = null;
  };

  return authListenerCleanup;
};
