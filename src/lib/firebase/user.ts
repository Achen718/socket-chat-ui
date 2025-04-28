import {
  doc,
  getDoc,
  collection,
  where,
  query,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { User } from '@/types';

// Initialize cache from localStorage if available
const initializeCache = (): Map<
  string,
  {
    user: User;
    timestamp: number;
  }
> => {
  if (typeof window === 'undefined') return new Map(); // Server-side rendering check

  try {
    const storedCache = localStorage.getItem('userCache');
    if (storedCache) {
      const parsed = JSON.parse(storedCache);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error('Error loading user cache from localStorage:', error);
  }

  return new Map();
};

// Cache user data to reduce Firebase reads
const userCache = initializeCache();

// Cache expiration time (1 hour for localStorage persistence)
const CACHE_EXPIRATION = 60 * 60 * 1000;

// Save cache to localStorage (debounced)
let saveCacheTimeout: NodeJS.Timeout | null = null;
const saveCache = () => {
  if (typeof window === 'undefined') return; // Server-side rendering check

  // Clear any existing timeout
  if (saveCacheTimeout) clearTimeout(saveCacheTimeout);

  // Create a new debounced save
  saveCacheTimeout = setTimeout(() => {
    try {
      const cacheObj = Object.fromEntries(userCache);
      localStorage.setItem('userCache', JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Error saving user cache to localStorage:', error);
    }
  }, 1000); // Debounce for 1 second
};

/**
 * Get user details by ID, with caching
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  // Check cache first
  const cachedData = userCache.get(userId);
  console.log(userId, cachedData);
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_EXPIRATION) {
    return cachedData.user;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const user: User = {
      id: userDoc.id,
      email: userData.email || '',
      displayName: userData.displayName || '',
      photoURL: userData.photoURL,
      status: userData.status || 'offline',
      createdAt: userData.createdAt
        ? userData.createdAt.toString()
        : new Date().toISOString(),
      updatedAt: userData.updatedAt
        ? userData.updatedAt.toString()
        : new Date().toISOString(),
    };

    // Cache the result
    userCache.set(userId, {
      user,
      timestamp: now,
    });

    // Save to localStorage
    saveCache();

    return user;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

/**
 * Format user display name, with email fallback
 */
export const formatUserDisplayName = (
  user: User | null | undefined
): string => {
  if (!user) return 'Unknown User';

  if (user.displayName) return user.displayName;

  if (user.email) {
    // Partially mask email
    const [username, domain] = user.email.split('@');
    if (username && domain) {
      // Show first character, then asterisks, then @domain
      const maskedUsername =
        username.substring(0, 1) +
        (username.length > 1 ? '***' : '') +
        (username.length > 3 ? username.substring(username.length - 1) : '');
      return `${maskedUsername}@${domain}`;
    }
    return user.email;
  }

  return 'User';
};

/**
 * Get multiple users by IDs
 */
export const getUsersByIds = async (
  userIds: string[]
): Promise<Map<string, User>> => {
  const result = new Map<string, User>();
  const idsToFetch: string[] = [];

  // Check cache first
  const now = Date.now();
  userIds.forEach((id) => {
    const cachedData = userCache.get(id);
    if (cachedData && now - cachedData.timestamp < CACHE_EXPIRATION) {
      result.set(id, cachedData.user);
    } else {
      idsToFetch.push(id);
    }
  });

  // If all users were in cache, return immediately
  if (idsToFetch.length === 0) {
    return result;
  }

  try {
    // Fetch users in batches of 10 (Firestore limit for "in" queries)
    const batchSize = 10;
    for (let i = 0; i < idsToFetch.length; i += batchSize) {
      const batch = idsToFetch.slice(i, i + batchSize);

      // Skip empty batches
      if (batch.length === 0) continue;

      // If only one user in batch, use direct document get
      if (batch.length === 1) {
        const user = await getUserById(batch[0]);
        if (user) {
          result.set(user.id, user);
        }
        continue;
      }

      // Otherwise use a query
      const usersQuery = query(
        collection(db, 'users'),
        where('__name__', 'in', batch)
      );

      const querySnapshot = await getDocs(usersQuery);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const user: User = {
          id: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          photoURL: data.photoURL,
          status: data.status || 'offline',
          createdAt: data.createdAt
            ? data.createdAt.toString()
            : new Date().toISOString(),
          updatedAt: data.updatedAt
            ? data.updatedAt.toString()
            : new Date().toISOString(),
        };

        // Cache the result
        userCache.set(user.id, {
          user,
          timestamp: now,
        });

        result.set(user.id, user);
      });

      // Save batch of users to localStorage
      saveCache();
    }

    return result;
  } catch (error) {
    console.error('Error fetching users data:', error);
    return result; // Return whatever we have
  }
};

const presenceCleanupFunctions = new Map<string, () => void>();

/**
 * Set up real-time presence and activity tracking
 * Combines heartbeat pattern with user activity detection
 */
export const setupPresence = (userId: string, inactivityTimeout = 10000) => {
  if (typeof window === 'undefined') return () => {};

  // Singleton pattern: prevent multiple presence instances for same user
  if (presenceCleanupFunctions.has(userId)) {
    console.log(`Presence already active for user ${userId}, reusing instance`);
    return presenceCleanupFunctions.get(userId)!;
  }

  console.log(`Setting up presence for user ${userId}`);

  // References
  const userStatusRef = doc(db, 'userStatus', userId);
  const userDocRef = doc(db, 'users', userId);

  // State tracking
  let isActive = true;
  let activityTimeout: NodeJS.Timeout | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  // Update presence in Firestore
  let lastUpdateTime = 0;
  const updatePresence = async (status: 'online' | 'away' | 'offline') => {
    const now = Date.now();

    // Allow immediate updates for offline status or if sufficient time has passed
    if (status === 'offline' || now - lastUpdateTime > 2000) {
      console.log(`Updating presence to ${status} for ${userId}`);
      lastUpdateTime = now;

      try {
        const batch = writeBatch(db);
        const timestamp = new Date();

        // Update in userStatus collection
        batch.set(
          userStatusRef,
          {
            state: status,
            lastSeen: serverTimestamp(),
            lastSeenClient: timestamp.toISOString(),
          },
          { merge: true }
        );

        // Update in users collection
        batch.update(userDocRef, {
          status: status,
          lastSeen: serverTimestamp(),
        });

        await batch.commit();

        // Store last status in localStorage for tab sync
        localStorage.setItem(
          `presence_${userId}`,
          JSON.stringify({
            status,
            timestamp: now,
          })
        );
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    }
  };

  // Handle user activity
  const handleUserActivity = () => {
    if (activityTimeout) clearTimeout(activityTimeout);

    if (!isActive) {
      isActive = true;
      updatePresence('online');
    }

    activityTimeout = setTimeout(() => {
      isActive = false;
      updatePresence('away');
    }, inactivityTimeout);
  };

  // Setup heartbeat to keep status fresh and detect crashes
  const startHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
      // Just update timestamp without changing status
      setDoc(
        userStatusRef,
        {
          lastSeen: serverTimestamp(),
          lastSeenClient: new Date().toISOString(),
        },
        { merge: true }
      );
    }, 30000); // 30 second heartbeat
  };

  // Handle window events
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      isActive = true;
      updatePresence('online');
    } else {
      isActive = false;
      updatePresence('away');
    }
  };

  const handleWindowClose = () => {
    updatePresence('offline');
  };

  const handleOffline = () => {
    updatePresence('offline');
  };

  const handleOnline = () => {
    updatePresence('online');
  };

  // Set initial status
  updatePresence('online');
  handleUserActivity();
  startHeartbeat();

  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleWindowClose);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  // Activity events
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
  ];
  activityEvents.forEach((event) => {
    window.addEventListener(event, handleUserActivity);
  });

  // Create cleanup function that also removes the instance reference
  const cleanup = () => {
    if (activityTimeout) clearTimeout(activityTimeout);
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleWindowClose);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);

    activityEvents.forEach((event) => {
      window.removeEventListener(event, handleUserActivity);
    });

    // Set user as offline on cleanup
    updatePresence('offline');

    // Remove the instance reference
    presenceCleanupFunctions.delete(userId);
  };

  // Return cleanup function
  presenceCleanupFunctions.set(userId, cleanup);

  return cleanup;
};

/**
 * Subscribe to user status changes
 */
export const subscribeToUserStatus = (
  userId: string,
  callback: (status: string) => void
) => {
  if (typeof window === 'undefined') return () => {};

  // Create reference to the user's status document
  const userStatusRef = doc(db, 'userStatus', userId);

  // Set up real-time listener
  const unsubscribe = onSnapshot(userStatusRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const status = data.state || 'offline';

      // Update local cache
      const cachedUser = userCache.get(userId)?.user;
      if (cachedUser) {
        userCache.set(userId, {
          user: { ...cachedUser, status },
          timestamp: Date.now(),
        });
        saveCache();
      }

      // Call the callback with the status
      callback(status);
    } else {
      callback('offline');
    }
  });

  return unsubscribe;
};
