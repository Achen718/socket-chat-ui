// Add Jest extended matchers
import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('firebase/app', () => {
  return {
    initializeApp: jest.fn(() => ({})),
    getApp: jest.fn(() => ({})),
    getApps: jest.fn(() => []),
  };
});

jest.mock('firebase/auth', () => {
  return {
    getAuth: jest.fn(() => ({
      currentUser: null,
      onAuthStateChanged: jest.fn(),
      signInWithEmailAndPassword: jest.fn(),
      createUserWithEmailAndPassword: jest.fn(),
      signInWithPopup: jest.fn(),
      GoogleAuthProvider: jest.fn(() => ({})),
      signOut: jest.fn(),
      setPersistence: jest.fn().mockResolvedValue(undefined),
      browserLocalPersistence: 'LOCAL',
      browserSessionPersistence: 'SESSION',
      onIdTokenChanged: jest.fn(),
    })),
  };
});

jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(),
    doc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    onSnapshot: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    serverTimestamp: jest.fn(() => new Date()),
    Timestamp: {
      fromDate: jest.fn((date) => ({ toDate: () => date })),
      now: jest.fn(() => ({ toDate: () => new Date() })),
    },
    writeBatch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

// Mock the matchMedia function for tests that might use it
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };
