/**
 * Create a resource manager for handling singleton resources with cleanup
 */
export const createResourceManager = <T extends () => void>(
  resourceType: string
) => {
  // Internal resources storage
  const resources = new Map<string, T>();

  // Return API object with methods
  return {
    /**
     * Register a resource with cleanup function
     */
    register: (key: string, cleanupFn: T): T => {
      // Return existing instance if already registered
      if (resources.has(key)) {
        console.log(
          `${resourceType} already exists for ${key}, reusing instance`
        );
        return resources.get(key)!;
      }

      console.log(`Creating new ${resourceType} for ${key}`);
      resources.set(key, cleanupFn);
      return cleanupFn;
    },

    /**
     * Check if resource exists
     */
    has: (key: string): boolean => {
      return resources.has(key);
    },

    /**
     * Get existing resource without creating
     */
    get: (key: string): T | undefined => {
      return resources.get(key);
    },

    /**
     * Remove resource and run cleanup
     */
    remove: (key: string): boolean => {
      const resource = resources.get(key);
      if (resource) {
        resource(); // Run cleanup function
        resources.delete(key);
        return true;
      }
      return false;
    },

    /**
     * Clean up all resources
     */
    cleanup: (): void => {
      for (const [key, resource] of resources.entries()) {
        console.log(`Cleaning up ${resourceType} for ${key}`);
        resource();
      }
      resources.clear();
    },

    /**
     * Get count of active resources
     */
    count: (): number => {
      return resources.size;
    },
  };
};

// Create your resource managers
export const presenceManager =
  createResourceManager<() => void>('Presence tracker');
export const statusSubscriptionManager = createResourceManager<() => void>(
  'Status subscription'
);
export const authListenerManager =
  createResourceManager<() => void>('Auth listener');
