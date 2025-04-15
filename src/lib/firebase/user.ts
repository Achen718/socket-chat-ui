import {
  doc,
  getDoc,
  collection,
  where,
  query,
  getDocs,
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
